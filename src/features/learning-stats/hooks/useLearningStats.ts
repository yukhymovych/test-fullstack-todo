import { useMemo } from 'react';
import { useStudyItemReviewLogs } from '@/features/learning/model/useStudyItemReviewLogs';
import type { StudyItemStatusResponse } from '@/features/learning/domain/learning.types';
import {
  LEARNING_STATS_CHART_RANGE_DAYS,
  buildLearningStatsSummary,
  formatChartAxisDate,
  mapReviewLogsToChartPoints,
  sortLogsDescending,
  type ChartPoint,
  type LearningStatsSummary,
} from '../mappers/learningStats.mapper';

export type UseLearningStatsResult = {
  reviews: ReturnType<typeof sortLogsDescending>;
  summary: LearningStatsSummary;
  chartData: ChartPoint[];
  isLoading: boolean;
  isError: boolean;
};

export function useLearningStats(
  noteId: string | null,
  studyStatus: StudyItemStatusResponse | undefined,
  options: { enabled: boolean; language: string }
): UseLearningStatsResult {
  const { enabled, language } = options;
  const {
    data: reviewLogs,
    isLoading,
    isError,
  } = useStudyItemReviewLogs(noteId, !!noteId && enabled);

  return useMemo(() => {
    const reviews = sortLogsDescending(reviewLogs ?? []);
    const summary = buildLearningStatsSummary(reviewLogs, studyStatus);
    const chartData = mapReviewLogsToChartPoints(
      reviewLogs,
      LEARNING_STATS_CHART_RANGE_DAYS,
      (iso) => formatChartAxisDate(iso, language)
    );

    return {
      reviews,
      summary,
      chartData,
      isLoading,
      isError,
    };
  }, [reviewLogs, studyStatus, isLoading, isError, language]);
}
