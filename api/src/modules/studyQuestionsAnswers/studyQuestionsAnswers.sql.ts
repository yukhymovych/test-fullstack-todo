import { pool } from '../../db/pool.js';

export type StudyQuestionSource = 'manual' | 'generated';

export interface StudyQuestionAnswer {
  id: string;
  page_id: string;
  question: string;
  answer: string;
  source: StudyQuestionSource;
  question_normalized: string;
  answer_normalized: string;
  created_at: Date;
  updated_at: Date;
}

export interface StudyQuestionInsert {
  question: string;
  answer: string;
  source: StudyQuestionSource;
  questionNormalized: string;
  answerNormalized: string;
}

export async function noteExistsForUser(
  pageId: string,
  userId: string
): Promise<boolean> {
  const result = await pool.query(
    'SELECT 1 FROM notes WHERE id = $1 AND user_id = $2 AND trashed_at IS NULL',
    [pageId, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function listByPage(
  pageId: string,
  userId: string
): Promise<StudyQuestionAnswer[]> {
  const result = await pool.query(
    `SELECT sqa.id, sqa.page_id, sqa.question, sqa.answer, sqa.source,
            sqa.question_normalized, sqa.answer_normalized, sqa.created_at, sqa.updated_at
     FROM study_questions_answers sqa
     JOIN notes n ON n.id = sqa.page_id
     WHERE sqa.page_id = $1 AND n.user_id = $2 AND n.trashed_at IS NULL
     ORDER BY sqa.created_at ASC, sqa.id ASC`,
    [pageId, userId]
  );
  return result.rows;
}

export async function createOne(
  pageId: string,
  userId: string,
  input: StudyQuestionInsert
): Promise<StudyQuestionAnswer | null> {
  const result = await pool.query(
    `INSERT INTO study_questions_answers (
      page_id,
      question,
      answer,
      source,
      question_normalized,
      answer_normalized
     )
     SELECT $1, $2, $3, $4, $5, $6
     FROM notes
     WHERE id = $1 AND user_id = $7 AND trashed_at IS NULL
     ON CONFLICT (page_id, question_normalized, answer_normalized) DO NOTHING
     RETURNING id, page_id, question, answer, source, question_normalized, answer_normalized, created_at, updated_at`,
    [
      pageId,
      input.question,
      input.answer,
      input.source,
      input.questionNormalized,
      input.answerNormalized,
      userId,
    ]
  );
  return result.rows[0] ?? null;
}

export async function getByIdForUser(
  id: string,
  userId: string
): Promise<StudyQuestionAnswer | null> {
  const result = await pool.query(
    `SELECT sqa.id, sqa.page_id, sqa.question, sqa.answer, sqa.source,
            sqa.question_normalized, sqa.answer_normalized, sqa.created_at, sqa.updated_at
     FROM study_questions_answers sqa
     JOIN notes n ON n.id = sqa.page_id
     WHERE sqa.id = $1 AND n.user_id = $2 AND n.trashed_at IS NULL`,
    [id, userId]
  );
  return result.rows[0] ?? null;
}

export async function updateOne(
  id: string,
  userId: string,
  input: {
    question: string;
    answer: string;
    questionNormalized: string;
    answerNormalized: string;
  }
): Promise<StudyQuestionAnswer | null> {
  const result = await pool.query(
    `UPDATE study_questions_answers sqa
     SET question = $1,
         answer = $2,
         question_normalized = $3,
         answer_normalized = $4,
         updated_at = NOW()
     FROM notes n
     WHERE sqa.id = $5
       AND n.id = sqa.page_id
       AND n.user_id = $6
       AND n.trashed_at IS NULL
     RETURNING sqa.id, sqa.page_id, sqa.question, sqa.answer, sqa.source,
               sqa.question_normalized, sqa.answer_normalized, sqa.created_at, sqa.updated_at`,
    [
      input.question,
      input.answer,
      input.questionNormalized,
      input.answerNormalized,
      id,
      userId,
    ]
  );
  return result.rows[0] ?? null;
}

export async function deleteOne(id: string, userId: string): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM study_questions_answers sqa
     USING notes n
     WHERE sqa.id = $1
       AND n.id = sqa.page_id
       AND n.user_id = $2
       AND n.trashed_at IS NULL`,
    [id, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function createGeneratedMany(
  pageId: string,
  userId: string,
  pairs: Array<{ question: string; answer: string; questionNormalized: string; answerNormalized: string }>
): Promise<StudyQuestionAnswer[]> {
  if (pairs.length === 0) return [];

  const created: StudyQuestionAnswer[] = [];
  for (const pair of pairs) {
    const row = await createOne(pageId, userId, {
      question: pair.question,
      answer: pair.answer,
      source: 'generated',
      questionNormalized: pair.questionNormalized,
      answerNormalized: pair.answerNormalized,
    });
    if (row) {
      created.push(row);
    }
  }
  return created;
}
