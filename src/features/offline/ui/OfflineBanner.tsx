import { useTranslation } from 'react-i18next';
import { useAppMode } from '../model/AppModeProvider';

export function OfflineBanner() {
  const { mode, lastSyncedAt, account } = useAppMode();
  const { t } = useTranslation('common');

  if (mode !== 'offline_cached_readonly') return null;

  const timeLabel = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleString()
    : t('offline.banner.unknown');

  const line = t('offline.banner.statusLine', { time: timeLabel });
  const accessOffHint =
    account && !account.offlineEnabled
      ? t('offline.banner.accessOffHint')
      : null;

  const text = accessOffHint ? `${line} · ${accessOffHint}` : line;

  return (
    <div
      className="flex w-full items-start gap-2 border-b border-white/10 bg-background/80 px-4 py-2 backdrop-blur-sm max-md:pl-[var(--notes-layout-mobile-menu-clearance,calc(8px+36px+12px))]"
      role="status"
      aria-live="polite"
    >
      <span
        className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-yellow-500"
        aria-hidden
      />
      <span className="min-w-0 flex-1 break-words text-sm leading-snug text-muted-foreground md:truncate">
        {text}
      </span>
    </div>
  );
}
