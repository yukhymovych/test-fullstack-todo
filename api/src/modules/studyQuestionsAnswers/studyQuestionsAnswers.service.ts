import * as notesSQL from '../notes/notes.sql.js';
import * as studyQuestionsSQL from './studyQuestionsAnswers.sql.js';
import type {
  CreateStudyQuestionInput,
  UpdateStudyQuestionInput,
} from './studyQuestionsAnswers.schemas.js';

const MAX_GENERATED_PAIRS = 5;
const MIN_TEXT_LENGTH_FOR_GENERATION = 30;

type GeneratedPair = {
  question: string;
  answer: string;
  questionNormalized: string;
  answerNormalized: string;
};

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

async function generatePairsWithOpenAI(
  pageText: string,
  existingPairsContext: string
): Promise<Array<{ question: string; answer: string }>> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw createError('OPENAI_API_KEY is not configured', 500);
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const prompt = [
    'Generate up to 5 question-answer pairs based only on the provided text. First identify the main concepts from the text, then generate questions based on different concepts.',
    '',
    'Rules:',
    '- Each pair must cover a different concept or fact from the text.',
    '- Avoid repeating or paraphrasing the same idea.',
    '- Avoid generating questions that are very similar to each other.',
    '- Only use information present in the text.',
    '- Keep answers concise and factual.',
    '',
    'Return result strictly as JSON:',
    '{',
    '  "pairs": [',
    '    {',
    '      "question": "...",',
    '      "answer": "..."',
    '    }',
    '  ]',
    '}',
    '',
    existingPairsContext,
    '',
    'TEXT:',
    pageText,
  ].join('\n');

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
    return 'There are currently no existing question-answer pairs for this page.';
  }

  const lines = existing.slice(0, 100).map((pair, index) => {
    return `${index + 1}. Q: ${pair.question}\n   A: ${pair.answer}`;
  });
  return [
    'Existing question-answer pairs for this page (do not repeat or paraphrase these):',
    ...lines,
  ].join('\n');
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

export async function generateForPage(pageId: string, userId: string) {
  const note = await notesSQL.getNoteById(pageId, userId);
  if (!note) {
    throw createError('Page not found', 404);
  }

  const plainText = extractContentText(note.rich_content);
  if (!plainText || plainText.length < MIN_TEXT_LENGTH_FOR_GENERATION) {
    return [];
  }

  const existing = await studyQuestionsSQL.listByPage(pageId, userId);
  const existingPairsContext = buildExistingPairsPrompt(existing);
  const generated = await generatePairsWithOpenAI(
    plainText,
    existingPairsContext
  );
  if (generated.length === 0) {
    return [];
  }

  const unique = dedupeGeneratedPairs(generated, existing);
  if (unique.length === 0) {
    return [];
  }

  return studyQuestionsSQL.createGeneratedMany(pageId, userId, unique);
}
