import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as studyQuestionsApi from '../api/studyQuestionsData';
import type {
  CreateStudyQuestionBody,
  UpdateStudyQuestionBody,
  GenerateStudyQuestionsBody,
} from '../domain/studyQuestions.types';
import { STUDY_QUESTIONS_KEYS } from './studyQuestions.queries';

export function useStudyQuestions(pageId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: STUDY_QUESTIONS_KEYS.byPage(pageId ?? ''),
    queryFn: () => studyQuestionsApi.getStudyQuestionsForPage(pageId!),
    enabled: !!pageId && enabled,
  });
}

export function useCreateStudyQuestion(pageId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateStudyQuestionBody) =>
      studyQuestionsApi.createManualStudyQuestion(pageId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: STUDY_QUESTIONS_KEYS.byPage(pageId),
      });
    },
  });
}

export function useUpdateStudyQuestion(pageId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateStudyQuestionBody }) =>
      studyQuestionsApi.updateStudyQuestion(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: STUDY_QUESTIONS_KEYS.byPage(pageId),
      });
    },
  });
}

export function useDeleteStudyQuestion(pageId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => studyQuestionsApi.deleteStudyQuestion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: STUDY_QUESTIONS_KEYS.byPage(pageId),
      });
    },
  });
}

export function useGenerateStudyQuestions(pageId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: STUDY_QUESTIONS_KEYS.generateByPage(pageId),
    mutationFn: (body?: GenerateStudyQuestionsBody) =>
      studyQuestionsApi.generateStudyQuestions(pageId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: STUDY_QUESTIONS_KEYS.byPage(pageId),
      });
    },
  });
}

export function useIsGeneratingStudyQuestions(pageId: string | undefined) {
  return (
    useIsMutating({
      mutationKey: STUDY_QUESTIONS_KEYS.generateByPage(pageId ?? ''),
    }) > 0
  );
}
