import type {
  Grade,
  StudyItemReviewLog,
  StudyItemStatusResponse,
} from '@/features/learning/domain/learning.types';

export const LEARNING_STATS_CHART_RANGE_DAYS = 90;

export function formatChartAxisDate(iso: string, language: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(language, { month: 'short', day: 'numeric' });
}

export type ChartPoint = {
  date: string;
  stability: number;
  difficulty: number;
  grade: Grade;
  /** ISO timestamp for tooltips / sorting */
  reviewedAt: string;
};

export type LearningStatsSummary = {
  totalReviews: number;
  againRate: number;
  currentStability: number | null;
  currentDifficulty: number | null;
  againCount: number;
};

function sortLogsAscending(logs: StudyItemReviewLog[]): StudyItemReviewLog[] {
  return [...logs].sort(
    (a, b) =>
      new Date(a.reviewed_at).getTime() - new Date(b.reviewed_at).getTime()
  );
}

/** Reviews table: newest first */
export function sortLogsDescending(logs: StudyItemReviewLog[]): StudyItemReviewLog[] {
  return [...logs].sort(
    (a, b) =>
      new Date(b.reviewed_at).getTime() - new Date(a.reviewed_at).getTime()
  );
}

export function mapReviewLogsToChartPoints(
  logs: StudyItemReviewLog[] | undefined,
  rangeDays: number,
  formatTickDate: (iso: string) => string
): ChartPoint[] {
  if (!logs?.length) return [];

  const sorted = sortLogsAscending(logs);
  const cutoff = Date.now() - rangeDays * 24 * 60 * 60 * 1000;

  const points: ChartPoint[] = [];
  for (const log of sorted) {
    if (log.stability_after == null) continue;
    if (log.grade == null) continue;

    const t = new Date(log.reviewed_at).getTime();
    if (Number.isNaN(t) || t < cutoff) continue;

    points.push({
      date: formatTickDate(log.reviewed_at),
      reviewedAt: log.reviewed_at,
      stability: log.stability_after,
      difficulty:
        log.difficulty_after ?? log.difficulty_before ?? 0,
      grade: log.grade,
    });
  }

  return points;
}

export function buildLearningStatsSummary(
  logs: StudyItemReviewLog[] | undefined,
  studyStatus: StudyItemStatusResponse | undefined
): LearningStatsSummary {
  const list = logs ?? [];
  const graded = list.filter((l) => l.grade != null);
  const againCount = graded.filter((l) => l.grade === 'again').length;
  const againRate =
    graded.length === 0 ? 0 : Math.round((againCount / graded.length) * 100);

  const lastDesc = sortLogsDescending(list)[0];

  const currentStability =
    studyStatus?.stabilityDays ??
    lastDesc?.stability_after ??
    null;

  const currentDifficulty =
    studyStatus?.difficulty ?? lastDesc?.difficulty_after ?? null;

  return {
    totalReviews: list.length,
    againRate,
    currentStability,
    currentDifficulty,
    againCount,
  };
}
