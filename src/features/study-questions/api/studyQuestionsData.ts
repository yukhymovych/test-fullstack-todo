import * as studyQuestionsApi from './studyQuestionsApi';
import type {
  StudyQuestionAnswer,
  CreateStudyQuestionBody,
  UpdateStudyQuestionBody,
  GenerateStudyQuestionsBody,
} from '../domain/studyQuestions.types';
import { isOfflineMode } from '@/features/offline/sync/appModeRef';
import { resolveAccountKey } from '@/features/offline/sync/currentAccount';
import { getQaByPage } from '@/features/offline/storage/qaRepo';
import { assertWritable } from '@/features/offline/domain/readOnlyGuard';

export async function getStudyQuestionsForPage(
  pageId: string
): Promise<StudyQuestionAnswer[]> {
  if (isOfflineMode()) {
    const accountKey = await resolveAccountKey();
    if (!accountKey) return [];
    const rows = await getQaByPage(accountKey, pageId);
    return rows.map((r) => ({
      id: r.id,
      page_id: r.page_id,
      question: r.question,
      answer: r.answer,
      source: r.source,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  }
  return studyQuestionsApi.getStudyQuestionsForPage(pageId);
}

export async function createManualStudyQuestion(
  pageId: string,
  body: CreateStudyQuestionBody
): Promise<StudyQuestionAnswer> {
  assertWritable(isOfflineMode());
  return studyQuestionsApi.createManualStudyQuestion(pageId, body);
}

export async function updateStudyQuestion(
  id: string,
  body: UpdateStudyQuestionBody
): Promise<StudyQuestionAnswer> {
  assertWritable(isOfflineMode());
  return studyQuestionsApi.updateStudyQuestion(id, body);
}

export async function deleteStudyQuestion(id: string): Promise<void> {
  assertWritable(isOfflineMode());
  return studyQuestionsApi.deleteStudyQuestion(id);
}

export async function generateStudyQuestions(
  pageId: string,
  body?: GenerateStudyQuestionsBody
): Promise<StudyQuestionAnswer[]> {
  assertWritable(isOfflineMode());
  return studyQuestionsApi.generateStudyQuestions(pageId, body);
}
