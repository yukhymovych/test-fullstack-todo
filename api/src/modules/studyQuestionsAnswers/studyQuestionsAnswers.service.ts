import * as notesSQL from '../notes/notes.sql.js';
import * as studyQuestionsSQL from './studyQuestionsAnswers.sql.js';
import type {
  CreateStudyQuestionInput,
  UpdateStudyQuestionInput,
  GenerateStudyQuestionsInput,
} from './studyQuestionsAnswers.schemas.js';

const MAX_GENERATED_PAIRS = 5;
const MIN_TEXT_LENGTH_FOR_GENERATION = 30;
const GENERATED_PAIR_LIMIT_BY_MODE = {
  one: 1,
  up_to_five: MAX_GENERATED_PAIRS,
} as const;

type GeneratedPair = {
  question: string;
  answer: string;
  questionNormalized: string;
  answerNormalized: string;
};

type PromptMode = 'general' | 'technical';

interface ErrorWithStatusCode extends Error {
  statusCode?: number;
}

interface PgErrorLike {
  code?: string;
}

interface OpenAIErrorResponse {
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
}

function createError(message: string, statusCode: number): ErrorWithStatusCode {
  const error = new Error(message) as ErrorWithStatusCode;
  error.statusCode = statusCode;
  return error;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    !!error &&
    typeof error === 'object' &&
    (error as PgErrorLike).code === '23505'
  );
}

export function normalizeStudyText(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractContentText(richContent: unknown): string {
  if (!Array.isArray(richContent)) return '';
  const texts: string[] = [];

  function walk(obj: unknown): void {
    if (obj === null || obj === undefined) return;
    if (typeof obj === 'string') {
      texts.push(obj);
      return;
    }
    if (Array.isArray(obj)) {
      obj.forEach(walk);
      return;
    }
    if (typeof obj === 'object') {
      const record = obj as Record<string, unknown>;
      if (typeof record.text === 'string') {
        texts.push(record.text);
      }
      if ('content' in record) walk(record.content);
      if ('children' in record) walk(record.children);
    }
  }

  walk(richContent);
  return texts.join(' ').replace(/\s+/g, ' ').trim();
}

function parseGeneratedPairs(content: string): Array<{ question: string; answer: string }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw createError('AI returned invalid JSON response', 502);
  }

  if (!parsed || typeof parsed !== 'object') {
    throw createError('AI response format is invalid', 502);
  }

  const pairs = (parsed as { pairs?: unknown }).pairs;
  if (!Array.isArray(pairs)) {
    throw createError('AI response does not include pairs array', 502);
  }

  const result: Array<{ question: string; answer: string }> = [];
  for (const pair of pairs.slice(0, MAX_GENERATED_PAIRS)) {
    if (!pair || typeof pair !== 'object') continue;
    const question = String((pair as { question?: unknown }).question ?? '').trim();
    const answer = String((pair as { answer?: unknown }).answer ?? '').trim();
    if (!question || !answer) continue;
    result.push({ question, answer });
  }

  return result;
}

function countMatches(text: string, pattern: RegExp): number {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  const regex = new RegExp(pattern.source, flags);
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

function detectPromptMode(text: string): PromptMode {
  const technicalKeywordPattern =
    /\b(api|apis|json|sql|react|typescript|javascript|node|http|https|endpoint|schema|query|mutation|database|function|functions|class|classes|interface|interfaces|boolean|string|number|null|undefined|async|await|promise|component|components|hook|hooks|state|props|effect|request|response|payload|parameter|parameters|argument|arguments|config|configuration|enum|type|types|generic|migration|table|column|index|backend|frontend)\b/gi;

  const camelOrSnakePattern =
    /\b(?:[a-z]+[A-Z][A-Za-z0-9]*|[a-z]+_[a-z0-9_]+)\b/g;

  const codeLikeSyntaxPattern =
    /=>|===|!==|`[^`]+`/g;

  const codeFragmentPattern =
    /\b(?:const|let|var|return|import|export|select|insert|update|delete|from|where)\b|<\/?[A-Za-z][^>]{0,100}>/gi;

  const technicalKeywordMatches = countMatches(text, technicalKeywordPattern);
  const camelOrSnakeMatches = countMatches(text, camelOrSnakePattern);
  const codeLikeSyntaxMatches = countMatches(text, codeLikeSyntaxPattern);
  const codeFragmentMatches = countMatches(text, codeFragmentPattern);

  let score = 0;

  if (technicalKeywordMatches >= 3) score += 2;
  if (camelOrSnakeMatches >= 2) score += 1;
  if (codeLikeSyntaxMatches >= 1) score += 1;
  if (codeFragmentMatches >= 1) score += 2;

  return score >= 3 ? 'technical' : 'general';
}

function buildGeneralPrompt(pageText: string, existingPairsContext: string): string {
  return [
    'You generate high-quality study question-answer pairs from the provided text.',
    '',
    'Internal process:',
    '- Identify the most important atomic facts, concepts, distinctions, details, and takeaways in the text.',
    '- Exclude information already covered by the existing Q/A pairs.',
    '- Generate new Q/A pairs only for uncovered or weakly covered information.',
    '',
    'Rules:',
    '- Use only information explicitly present in the provided text.',
    '- Each Q/A pair must test exactly one distinct idea.',
    '- Prefer active recall questions over recognition questions.',
    '- Prefer specific and testable questions over broad summary questions.',
    '- Prefer coverage across different parts of the text.',
    '- Avoid trivial, vague, generic, repetitive, or guessable questions.',
    '- Avoid repeating the question wording in the answer.',
    '- Avoid wording that reveals the answer too easily.',
    '- Avoid simply restating the source text as a question.',
    '- Answers must be concise, factual, and based only on the text.',
    '- Write questions and answers in the same primary language as the provided text.',
    '- If the text contains technical terms or domain-specific terminology from another language, keep those terms unchanged when appropriate.',
    '- Do not translate established technical terms if translation would make them less accurate or less natural.',
    '- Determine the output language from the source text itself, not from the language of existing pairs.',
    '- If the text contains only a few meaningful ideas, return fewer pairs instead of weak ones.',
    '- Return a maximum of 5 pairs.',
    '',
    'Return strictly valid JSON only in this format:',
    '{',
    '  "pairs": [',
    '    {',
    '      "question": "...",',
    '      "answer": "..."',
    '    }',
    '  ]',
    '}',
    '',
    'EXISTING Q/APAIRS JSON:',
    existingPairsContext,
    '',
    'TEXT TO GENERATE QUESTIONS FROM:',
    pageText,
  ].join('\n');
}

function buildTechnicalPrompt(pageText: string, existingPairsContext: string): string {
  return [
    'You generate high-quality technical study question-answer pairs from the provided text.',
    '',
    'Internal process:',
    '- Identify atomic technical knowledge in the text: definitions, rules, constraints, behaviors, parameters, edge cases, limitations, consequences, and important details.',
    '- Exclude information already covered by the existing Q/A pairs.',
    '- Generate new Q/A pairs only for uncovered or weakly covered technical knowledge.',
    '',
    'Rules:',
    '- Use only information explicitly present in the provided text.',
    '- Preserve technical terminology when it improves precision.',
    '- Each Q/A pair must test exactly one technical fact or concept.',
    '- Prefer questions about understanding, purpose, behavior, limitation, consequence, usage, or comparison.',
    '- Prefer coverage across different parts of the text.',
    '- Avoid trivial, generic, repetitive, or obvious-answer questions.',
    '- Avoid broad summary questions.',
    '- Avoid copying source phrasing when it makes the answer too easy to guess.',
    '- Avoid repeating the question wording in the answer.',
    '- Write questions and answers in the same primary language as the provided text.',
    '- If the text contains technical terms or domain-specific terminology from another language, keep those terms unchanged when appropriate.',
    '- Do not translate established technical terms if translation would make them less accurate or less natural.',
    '- Determine the output language from the source text itself, not from the language of existing pairs.',
    '- Answers must be concise, precise, and technically accurate.',
    '- If the text is dense, prioritize the most important uncovered and testable knowledge.',
    '- Return a maximum of 5 pairs.',
    '',
    'Return strictly valid JSON only in this format:',
    '{',
    '  "pairs": [',
    '    {',
    '      "question": "...",',
    '      "answer": "..."',
    '    }',
    '  ]',
    '}',
    '',
    'EXISTING Q/A PAIRS JSON:',
    existingPairsContext,
    '',
    'TEXT TO GENERATE QUESTIONS FROM:',
    pageText,
  ].join('\n');
}

function buildPrompt(pageText: string, existingPairsContext: string, mode: PromptMode): string {
  if (mode === 'technical') {
    return buildTechnicalPrompt(pageText, existingPairsContext);
  }
  return buildGeneralPrompt(pageText, existingPairsContext);
}

async function generatePairsWithOpenAI(
  pageText: string,
  existingPairsContext: string,
  mode: PromptMode
): Promise<Array<{ question: string; answer: string }>> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw createError('OPENAI_API_KEY is not configured', 500);
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const prompt = buildPrompt(pageText, existingPairsContext, mode);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You generate factual study question-answer pairs from provided text.',
        },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const bodyText = await response.text();
    let parsed: OpenAIErrorResponse | null = null;
    try {
      parsed = JSON.parse(bodyText) as OpenAIErrorResponse;
    } catch {
      parsed = null;
    }

    const providerCode = parsed?.error?.code ?? '';
    const providerType = parsed?.error?.type ?? '';
    const providerMessage = parsed?.error?.message ?? response.statusText;

    if (
      response.status === 429 ||
      providerCode === 'insufficient_quota' ||
      providerType === 'insufficient_quota' ||
      providerCode === 'rate_limit_exceeded'
    ) {
      throw createError(
        'OpenAI quota/rate limit reached. Please check billing/limits and try again later.',
        429
      );
    }

    if (
      response.status === 404 ||
      providerCode === 'model_not_found' ||
      providerMessage.toLowerCase().includes('model') &&
      providerMessage.toLowerCase().includes('not')
    ) {
      throw createError(
        `OpenAI model "${model}" is not available for this API project/account. Verify model access or use a supported model.`,
        400
      );
    }

    if (response.status === 403) {
      throw createError(
        `OpenAI denied access for model "${model}". Check project permissions, region availability, and model access settings.`,
        403
      );
    }

    if (response.status === 401) {
      throw createError(
        'OpenAI API authentication failed. Please verify OPENAI_API_KEY and project/org linkage.',
        502
      );
    }

    throw createError(`OpenAI request failed: ${providerMessage}`, 502);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content ?? '';
  if (!content) {
    return [];
  }

  return parseGeneratedPairs(content);
}

function buildExistingPairsPrompt(
  existing: studyQuestionsSQL.StudyQuestionAnswer[]
): string {
  if (existing.length === 0) {
    return '[]';
  }

  const existingPairs = existing.slice(0, 100).map((pair) => ({
    question: pair.question,
    answer: pair.answer,
  }));
  return JSON.stringify(existingPairs, null, 2);
}

function dedupeGeneratedPairs(
  pairs: Array<{ question: string; answer: string }>,
  existing: studyQuestionsSQL.StudyQuestionAnswer[]
): GeneratedPair[] {
  const seenPairKeys = new Set<string>();
  const seenQuestions = new Set<string>();
  for (const row of existing) {
    seenPairKeys.add(`${row.question_normalized}::${row.answer_normalized}`);
    seenQuestions.add(row.question_normalized);
  }

  const unique: GeneratedPair[] = [];
  for (const pair of pairs) {
    const questionNormalized = normalizeStudyText(pair.question);
    const answerNormalized = normalizeStudyText(pair.answer);
    if (!questionNormalized || !answerNormalized) continue;
    const pairKey = `${questionNormalized}::${answerNormalized}`;
    if (seenPairKeys.has(pairKey)) continue;
    if (seenQuestions.has(questionNormalized)) continue;
    seenPairKeys.add(pairKey);
    seenQuestions.add(questionNormalized);
    unique.push({
      question: pair.question.trim(),
      answer: pair.answer.trim(),
      questionNormalized,
      answerNormalized,
    });
  }
  return unique.slice(0, MAX_GENERATED_PAIRS);
}

export async function getByPage(pageId: string, userId: string) {
  const exists = await studyQuestionsSQL.noteExistsForUser(pageId, userId);
  if (!exists) {
    throw createError('Page not found', 404);
  }
  return studyQuestionsSQL.listByPage(pageId, userId);
}

export async function createManual(
  pageId: string,
  userId: string,
  input: CreateStudyQuestionInput
) {
  const question = input.question.trim();
  const answer = input.answer.trim();
  const questionNormalized = normalizeStudyText(question);
  const answerNormalized = normalizeStudyText(answer);

  const created = await studyQuestionsSQL.createOne(pageId, userId, {
    question,
    answer,
    source: 'manual',
    questionNormalized,
    answerNormalized,
  });

  if (created) return created;

  const exists = await studyQuestionsSQL.noteExistsForUser(pageId, userId);
  if (!exists) {
    throw createError('Page not found', 404);
  }
  throw createError('Question-answer pair already exists for this page', 409);
}

export async function updateById(
  id: string,
  userId: string,
  input: UpdateStudyQuestionInput
) {
  const current = await studyQuestionsSQL.getByIdForUser(id, userId);
  if (!current) {
    throw createError('Study question not found', 404);
  }

  const question = input.question?.trim() ?? current.question;
  const answer = input.answer?.trim() ?? current.answer;
  const questionNormalized = normalizeStudyText(question);
  const answerNormalized = normalizeStudyText(answer);

  let updated: studyQuestionsSQL.StudyQuestionAnswer | null;
  try {
    updated = await studyQuestionsSQL.updateOne(id, userId, {
      question,
      answer,
      questionNormalized,
      answerNormalized,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw createError('Question-answer pair already exists for this page', 409);
    }
    throw error;
  }

  if (updated) return updated;
  throw createError('Question-answer pair already exists for this page', 409);
}

export async function deleteById(id: string, userId: string) {
  const deleted = await studyQuestionsSQL.deleteOne(id, userId);
  if (!deleted) {
    throw createError('Study question not found', 404);
  }
}

export async function generateForPage(
  pageId: string,
  userId: string,
  input?: GenerateStudyQuestionsInput
) {
  const note = await notesSQL.getNoteById(pageId, userId);
  if (!note) {
    throw createError('Page not found', 404);
  }

  const selectedText = input?.text?.trim();
  const plainText = selectedText?.length ? selectedText : extractContentText(note.rich_content);
  if (!plainText || plainText.length < MIN_TEXT_LENGTH_FOR_GENERATION) {
    return [];
  }

  const promptMode = detectPromptMode(plainText);
  const existing = await studyQuestionsSQL.listByPage(pageId, userId);
  const existingPairsContext = buildExistingPairsPrompt(existing);
  const generated = await generatePairsWithOpenAI(
    plainText,
    existingPairsContext,
    promptMode
  );
  if (generated.length === 0) {
    return [];
  }

  const unique = dedupeGeneratedPairs(generated, existing);
  const mode = input?.mode ?? 'up_to_five';
  const limitedUnique = unique.slice(0, GENERATED_PAIR_LIMIT_BY_MODE[mode]);
  if (limitedUnique.length === 0) {
    return [];
  }

  return studyQuestionsSQL.createGeneratedMany(pageId, userId, limitedUnique);
}
