import { useTranslation } from 'react-i18next';
import type { StudyItemReviewLog } from '@/features/learning/domain/learning.types';
import type { Grade } from '@/features/learning/domain/learning.types';
import { getGradeLabel } from '@/features/learning/lib/gradePresentation';
import { cn } from '@/lib/utils';

const gradeBadgeClass: Record<Grade, string> = {
  easy: 'border border-emerald-500/30 bg-emerald-500/15 text-emerald-400',
  good: 'border border-blue-500/30 bg-blue-500/15 text-blue-400',
  hard: 'border border-amber-500/30 bg-amber-500/15 text-amber-400',
  again: 'border border-red-500/30 bg-red-500/15 text-red-400',
};

function formatPair(
  before: number | null | undefined,
  after: number | null | undefined,
  na: string
): string {
  if (before == null && after == null) return na;
  const b = before != null ? before.toFixed(1) : na;
  const a = after != null ? after.toFixed(1) : na;
  return `${b} → ${a}`;
}

export interface ReviewHistoryTableProps {
  reviews: StudyItemReviewLog[];
  className?: string;
}

export function ReviewHistoryTable({ reviews, className }: ReviewHistoryTableProps) {
  const { t, i18n } = useTranslation('learning');

  return (
    <div
      className={cn(
        'min-w-0 max-w-full overflow-hidden rounded-xl border border-white/10 bg-white/5 p-4 shadow-none',
        className
      )}
    >
      <h3 className="mb-3 text-sm font-semibold">{t('stats.historyTitle')}</h3>
      {reviews.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {t('stats.emptyHistory')}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-muted-foreground">
                <th className="pb-2 pr-3 font-medium">{t('stats.columns.date')}</th>
                <th className="pb-2 pr-3 font-medium">{t('stats.columns.grade')}</th>
                <th className="pb-2 pr-3 font-medium">{t('stats.columns.interval')}</th>
                <th className="pb-2 pr-3 font-medium">{t('stats.columns.stability')}</th>
                <th className="pb-2 font-medium">{t('stats.columns.difficulty')}</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((row) => {
                const when = new Date(row.reviewed_at);
                const dateStr = Number.isNaN(when.getTime())
                  ? row.reviewed_at
                  : when.toLocaleDateString(i18n.resolvedLanguage, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });
                const grade = row.grade;
                const interval =
                  row.elapsed_days != null
                    ? t('stats.intervalDays', { count: row.elapsed_days })
                    : t('stats.notAvailable');

                return (
                  <tr
                    key={row.id}
                    className="border-b border-white/5 last:border-0 hover:bg-white/5"
                  >
                    <td className="py-2 pr-3 align-middle text-muted-foreground">
                      {dateStr}
                    </td>
                    <td className="py-2 pr-3 align-middle">
                      {grade ? (
                        <span
                          className={cn(
                            'inline-flex rounded-md px-2 py-0.5 text-xs font-medium',
                            gradeBadgeClass[grade]
                          )}
                        >
                          {getGradeLabel(t, grade)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          {t('stats.notAvailable')}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3 align-middle tabular-nums">{interval}</td>
                    <td className="py-2 pr-3 align-middle tabular-nums text-muted-foreground">
                      {formatPair(
                        row.stability_before,
                        row.stability_after,
                        t('stats.notAvailable')
                      )}
                    </td>
                    <td className="py-2 align-middle tabular-nums text-muted-foreground">
                      {formatPair(
                        row.difficulty_before,
                        row.difficulty_after,
                        t('stats.notAvailable')
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
