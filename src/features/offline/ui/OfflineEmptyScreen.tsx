import { useTranslation } from 'react-i18next';

export function OfflineEmptyScreen() {
  const { t } = useTranslation('common');
  return (
    <div className="flex h-screen w-full items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold mb-2">
          {t('offline.accessDisabled.title')}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t('offline.accessDisabled.body')}
        </p>
      </div>
    </div>
  );
}
