import { useTranslation } from 'react-i18next';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Info } from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from '@/shared/ui';
import { getGradeLabel } from '@/features/learning/lib/gradePresentation';
import type { ChartPoint } from '../mappers/learningStats.mapper';
import { cn } from '@/lib/utils';

const chartConfig = {
  stability: {
    label: 'Stability',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

export interface StabilityChartProps {
  data: ChartPoint[];
  language: string;
  className?: string;
}

const chartColor = "hsl(217 91% 60%)";

export function StabilityChart({ data, language, className }: StabilityChartProps) {
  const { t } = useTranslation('learning');

  return (
    <div
      className={cn(
        'min-w-0 max-w-full overflow-hidden rounded-xl border border-white/10 bg-white/5 p-3 shadow-none sm:p-4',
        className
      )}
    >
      <div className="mb-3 flex min-w-0 flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Info className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <h3 className="text-sm font-semibold leading-tight">
            {t('stats.chartTitle')}
          </h3>
        </div>
        <span className="text-sm text-muted-foreground">{t('stats.chartRange')}</span>
      </div>
      {data.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {t('stats.emptyChart')}
        </p>
      ) : (
        <div className="min-w-0 w-full max-w-full">
          <ChartContainer
            config={chartConfig}
            className="h-[200px] w-full min-w-0 max-w-full aspect-auto sm:h-[220px] [&_.recharts-responsive-container]:!max-w-full [&_.recharts-surface]:outline-none"
          >
          <AreaChart
            accessibilityLayer
            data={data}
            margin={{ left: 0, right: 4, top: 8, bottom: 4 }}
          >
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval="preserveStartEnd"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={32}
              tickMargin={4}
              tick={{ fontSize: 11 }}
              domain={[0, 'dataMax + 1']}
            />
            <ChartTooltip
              cursor={{ stroke: 'rgba(255,255,255,0.12)' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0].payload as ChartPoint;
                const when = new Date(row.reviewedAt);
                const dateLabel = Number.isNaN(when.getTime())
                  ? row.reviewedAt
                  : when.toLocaleDateString(language, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });
                return (
                  <div
                    className="grid min-w-[10rem] gap-1 rounded-lg border border-white/10 bg-zinc-950/95 px-3 py-2 text-xs text-zinc-100 shadow-none"
                  >
                    <p className="font-medium text-foreground">{dateLabel}</p>
                    <p>
                      <span className="text-muted-foreground">
                        {t('stats.tooltip.stability')}
                        :{' '}
                      </span>
                      {row.stability.toFixed(1)} {t('stats.stabilityUnit')}
                    </p>
                    <p>
                      <span className="text-muted-foreground">
                        {t('stats.tooltip.difficulty')}
                        :{' '}
                      </span>
                      {t('stats.difficultyOutOf', {
                        value: row.difficulty.toFixed(1),
                      })}
                    </p>
                    <p>
                      <span className="text-muted-foreground">
                        {t('stats.tooltip.grade')}
                        :{' '}
                      </span>
                      <span className="font-medium text-primary">
                        {getGradeLabel(t, row.grade)}
                      </span>
                    </p>
                  </div>
                );
              }}
            />
            <defs>
              <linearGradient id="stabilityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chartColor} stopOpacity={0.35} />
                <stop offset="100%" stopColor={chartColor} stopOpacity={0.04} />
              </linearGradient>
            </defs>

            <Area
              type="monotone"
              dataKey="stability"
              stroke={chartColor}
              fill="url(#stabilityGradient)"
              strokeWidth={2.25}
              dot={{ r: 3, fill: chartColor, strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
              isAnimationActive
            />
          </AreaChart>
        </ChartContainer>
        </div>
      )}
    </div>
  );
}
