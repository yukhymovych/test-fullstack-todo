import { useTranslation } from 'react-i18next';
import type { LearningStatsSummary } from '../mappers/learningStats.mapper';
import { cn } from '@/lib/utils';

const cardClass =
  'rounded-xl border border-white/10 bg-white/5 p-4 shadow-none';

export interface StatsSummaryCardsProps {
  summary: LearningStatsSummary;
  className?: string;
}

export function StatsSummaryCards({ summary, className }: StatsSummaryCardsProps) {
  const { t } = useTranslation('learning');

  return (
    <div className={cn('grid min-w-0 grid-cols-2 gap-3 max-[360px]:grid-cols-1', className)}>
      <div className={cardClass}>
        <p className="text-sm text-muted-foreground">{t('stats.totalReviews')}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">
          {summary.totalReviews}
        </p>
        <p className="text-xs text-muted-foreground">{t('stats.totalLabel')}</p>
      </div>
      <div className={cardClass}>
        <p className="text-sm text-muted-foreground">{t('stats.againRate')}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">
          {summary.againRate}%
        </p>
        <p className="text-xs text-muted-foreground">
          {t('stats.againSub', { count: summary.againCount })}
        </p>
      </div>
      <div className={cardClass}>
        <p className="text-sm text-muted-foreground">{t('stats.stability')}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">
          {summary.currentStability != null
            ? `${summary.currentStability.toFixed(1)} ${t('stats.stabilityUnit')}`
            : t('stats.notAvailable')}
        </p>
        <p className="text-xs text-muted-foreground">{t('stats.current')}</p>
      </div>
      <div className={cardClass}>
        <p className="text-sm text-muted-foreground">{t('stats.difficulty')}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">
          {summary.currentDifficulty != null
            ? t('stats.difficultyOutOf', {
                value: summary.currentDifficulty.toFixed(1),
              })
            : t('stats.notAvailable')}
        </p>
        <p className="text-xs text-muted-foreground">{t('stats.current')}</p>
      </div>
    </div>
  );
}
