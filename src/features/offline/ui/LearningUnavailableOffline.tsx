import { useTranslation } from 'react-i18next';

export function LearningUnavailableOffline() {
  const { t } = useTranslation('common');
  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h2 className="text-lg font-semibold mb-2">
          {t('offline.learningUnavailable.title')}
        </h2>
        <p className="text-muted-foreground text-sm">
          {t('offline.learningUnavailable.body')}
        </p>
      </div>
    </div>
  );
}
