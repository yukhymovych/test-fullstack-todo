import { useTranslation } from 'react-i18next';
import { useAppMode } from '../model/AppModeProvider';
import './OfflineBanner.css';

export function OfflineBanner() {
  const { mode, lastSyncedAt, account } = useAppMode();
  const { t } = useTranslation('common');

  if (mode !== 'offline_cached_readonly') return null;

  const synced = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleString()
    : t('offline.banner.unknown');

  const accessOffHint =
    account && !account.offlineEnabled
      ? t('offline.banner.accessOffHint')
      : null;

  return (
    <div className="offline-banner" role="status" aria-live="polite">
      <span className="offline-banner__dot" aria-hidden />
      <span className="offline-banner__text">
        {t('offline.banner.title')}
        <span className="offline-banner__meta">
          {t('offline.banner.lastSynced', { time: synced })}
        </span>
        {accessOffHint && (
          <span className="offline-banner__hint">{accessOffHint}</span>
        )}
      </span>
    </div>
  );
}
