import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenuItem,
  DropdownMenuResponsiveSub,
  DropdownMenuSeparator,
} from '@/shared/ui';
import type { UseNoteImportExportResult } from '../../model/useNoteImportExport';

interface NoteImportExportMenuSectionProps {
  importExport?: UseNoteImportExportResult;
}

export function NoteImportExportMenuSection({
  importExport,
}: NoteImportExportMenuSectionProps) {
  const { t } = useTranslation('notes');

  if (!importExport) {
    return null;
  }

  if (!importExport.canExport && !importExport.canImport) {
    return null;
  }

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const actionDisabled = importExport.isBusy;
  const shouldShowTreeExport = importExport.canExport && importExport.canExportTree;

  const handleOpenFilePicker = () => {
    if (actionDisabled || !importExport.canImport) return;
    fileInputRef.current?.click();
  };

  return (
    <>
      <DropdownMenuSeparator />
      {importExport.canExport ? (
        <DropdownMenuResponsiveSub
          label={t('menu.export')}
          disabled={actionDisabled}
        >
          <DropdownMenuItem
            disabled={actionDisabled}
            onClick={() => void importExport.handleExport('html')}
          >
            {t('menu.exportAsHtml')}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={actionDisabled}
            onClick={() => void importExport.handleExport('txt')}
          >
            {t('menu.exportAsTxt')}
          </DropdownMenuItem>
          {importExport.canExportPdf ? (
            <DropdownMenuItem
              disabled={actionDisabled}
              onClick={() => void importExport.handleExport('pdf')}
            >
              {t('menu.exportAsPdf')}
            </DropdownMenuItem>
          ) : null}
          {shouldShowTreeExport
            ? importExport.treeExportFormats.map((format) => (
                <DropdownMenuItem
                  key={format}
                  disabled={actionDisabled}
                  onClick={() => void importExport.handleExportTree(format)}
                >
                  {t('menu.treeAsFormat', { format: format.toUpperCase() })}
                </DropdownMenuItem>
              ))
            : null}
        </DropdownMenuResponsiveSub>
      ) : null}
      <DropdownMenuItem
        disabled={actionDisabled || !importExport.canImport}
        onSelect={(event) => {
          event.preventDefault();
          handleOpenFilePicker();
        }}
      >
        {t('menu.importHtmlTxtDocx')}
      </DropdownMenuItem>
      <input
        ref={fileInputRef}
        type="file"
        hidden
        accept={importExport.importAccept}
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          void importExport.handleImportFile(file);
          event.target.value = '';
        }}
      />
    </>
  );
}
