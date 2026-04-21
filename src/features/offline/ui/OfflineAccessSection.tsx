import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useOfflineAccount } from '../model/useOfflineAccount';
import { useEnableOfflineAccess } from '../model/useEnableOfflineAccess';
import { useClearCurrentAccountCache } from '../model/useClearOfflineCache';
import { formatBytes } from '../lib/formatBytes';
import './OfflineAccessSection.css';

export function OfflineAccessSection() {
  const { t } = useTranslation('settings');
  const { data: account } = useOfflineAccount();
  const enableMutation = useEnableOfflineAccess();
  const clearMutation = useClearCurrentAccountCache();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const enabled = !!account?.offlineEnabled;
  const lastSynced = account?.lastSyncedAt
    ? new Date(account.lastSyncedAt).toLocaleString()
    : null;

  const handleEnable = async () => {
    setErrorMessage(null);
    const result = await enableMutation.mutateAsync();
    if (!result.ok) {
      setErrorMessage(mapErrorMessage(result.error.code, t));
    }
  };

  const handleClear = async () => {
    setErrorMessage(null);
    await clearMutation.mutateAsync();
  };

  return (
    <section className="settings-page__section">
      <div className="settings-page__section-heading">
        <h2 className="settings-page__section-title">
          {t('offline.sectionTitle')}
        </h2>
        <p className="settings-page__section-description">
          {t('offline.description')}
        </p>
      </div>

      <div className="offline-section__status">
        <span
          className={`offline-section__badge ${
            enabled ? 'is-enabled' : 'is-disabled'
          }`}
        >
          {enabled ? t('offline.status.enabled') : t('offline.status.disabled')}
        </span>
        {enabled && (
          <div className="offline-section__stats">
            <span>
              {t('offline.stats.cacheSize', {
                size: formatBytes(account?.cacheBytesEstimate ?? 0),
              })}
            </span>
            {lastSynced && (
              <span>
                {t('offline.stats.lastSynced', { time: lastSynced })}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="offline-section__actions">
        {!enabled && (
          <button
            type="button"
            className="offline-section__btn is-primary"
            onClick={handleEnable}
            disabled={enableMutation.isPending}
          >
            {enableMutation.isPending
              ? t('offline.actions.enabling')
              : t('offline.actions.enable')}
          </button>
        )}
        {enabled && (
          <>
            <button
              type="button"
              className="offline-section__btn"
              onClick={handleEnable}
              disabled={enableMutation.isPending}
            >
              {enableMutation.isPending
                ? t('offline.actions.refreshing')
                : t('offline.actions.refresh')}
            </button>
            <button
              type="button"
              className="offline-section__btn is-danger"
              onClick={handleClear}
              disabled={clearMutation.isPending}
            >
              {clearMutation.isPending
                ? t('offline.actions.clearing')
                : t('offline.actions.clear')}
            </button>
          </>
        )}
      </div>

      {errorMessage && (
        <p className="offline-section__error" role="alert">
          {errorMessage}
        </p>
      )}
    </section>
  );
}

function mapErrorMessage(
  code: string,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  switch (code) {
    case 'network_error':
      return t('offline.errors.network');
    case 'not_authenticated':
      return t('offline.errors.notAuthenticated');
    case 'total_size_exceeded':
      return t('offline.errors.totalSize');
    case 'note_too_large':
      return t('offline.errors.noteTooLarge');
    default:
      return t('offline.errors.unknown');
  }
}
