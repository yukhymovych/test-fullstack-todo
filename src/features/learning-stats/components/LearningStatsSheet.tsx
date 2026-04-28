import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';
import type { StudyItemStatusResponse } from '@/features/learning/domain/learning.types';
import { SheetHeader, SheetTitle, Spinner } from '@/shared/ui';
import { useLearningStats } from '../hooks/useLearningStats';
import { StatsSummaryCards } from './StatsSummaryCards';
import { StabilityChart } from './StabilityChart';
import { ReviewHistoryTable } from './ReviewHistoryTable';

export interface LearningStatsSheetProps {
  noteId: string;
  studyStatus: StudyItemStatusResponse | undefined;
  enabled: boolean;
}

export function LearningStatsSheet({
  noteId,
  studyStatus,
  enabled,
}: LearningStatsSheetProps) {
  const { i18n, t } = useTranslation('learning');
  const { reviews, summary, chartData, isLoading, isError } = useLearningStats(
    noteId,
    studyStatus,
    { enabled, language: i18n.resolvedLanguage ?? 'en' }
  );

  return (
    <>
      <SheetHeader className="min-w-0 space-y-1 border-b border-white/10 p-0 pb-4 pr-10 text-left">
        <SheetTitle className="text-lg font-semibold">{t('stats.title')}</SheetTitle>
      </SheetHeader>

      <div className="min-w-0 w-full space-y-6 pt-2">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner size="md" />
            <span className="sr-only">{t('stats.loading')}</span>
          </div>
        ) : isError ? (
          <p className="py-8 text-center text-sm text-destructive">{t('stats.error')}</p>
        ) : (
          <>
            <StatsSummaryCards summary={summary} />
            <StabilityChart
              data={chartData}
              language={i18n.resolvedLanguage ?? 'en'}
            />
            <ReviewHistoryTable reviews={reviews} />
            <div className="flex gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              <p>{t('stats.footer')}</p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
