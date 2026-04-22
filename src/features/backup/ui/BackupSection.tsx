import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui';
import { useBackup } from '../model/useBackup';
import './BackupSection.css';

const ACCEPT_TYPES = '.json,application/json';

export interface BackupSectionProps {
  readOnly?: boolean;
}

export function BackupSection({ readOnly = false }: BackupSectionProps) {
  const { t } = useTranslation('settings');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { isExporting, isImporting, exportToFile, importFromFile } = useBackup();
  const [preserveStudyState, setPreserveStudyState] = useState(false);

  const isBusy = isExporting || isImporting;

  const handleExportClick = () => {
    if (isBusy) return;
    void exportToFile();
  };

  const handleImportButtonClick = () => {
    if (isBusy) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    void importFromFile(file, preserveStudyState);
  };

  return (
    <section className="backup-section">
      <div className="backup-section__heading">
        <h2 className="backup-section__title">{t('backup.sectionTitle')}</h2>
        <p className="backup-section__description">{t('backup.description')}</p>
      </div>

      <div className="backup-section__row">
        <Button
          type="button"
          onClick={handleExportClick}
          disabled={isBusy || readOnly}
        >
          {isExporting ? t('backup.exportingButton') : t('backup.exportButton')}
        </Button>
      </div>

      <div className="backup-section__row backup-section__row--separated">
        <Button
          type="button"
          variant="secondary"
          onClick={handleImportButtonClick}
          disabled={isBusy || readOnly}
        >
          {isImporting ? t('backup.importingButton') : t('backup.importButton')}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_TYPES}
          hidden
          onChange={handleFileChange}
        />
      </div>

      <div className="backup-section__row backup-section__row--column">
        <label className="backup-section__checkbox">
          <input
            type="checkbox"
            checked={preserveStudyState}
            disabled={isBusy || readOnly}
            onChange={(event) => setPreserveStudyState(event.target.checked)}
          />
          <span>{t('backup.preserveStudyStateLabel')}</span>
        </label>
        <p className="backup-section__hint">{t('backup.preserveStudyStateHint')}</p>
      </div>

      <p className="backup-section__hint">{t('backup.importHint')}</p>
    </section>
  );
}
