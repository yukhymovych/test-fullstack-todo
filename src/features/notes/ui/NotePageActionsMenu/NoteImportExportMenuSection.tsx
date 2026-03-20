import { useRef } from 'react';
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/shared/ui';
import type { UseNoteImportExportResult } from '../../model/useNoteImportExport';

interface NoteImportExportMenuSectionProps {
  importExport?: UseNoteImportExportResult;
}

export function NoteImportExportMenuSection({
  importExport,
}: NoteImportExportMenuSectionProps) {
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
        <>
          <DropdownMenuItem
            disabled={actionDisabled}
            onClick={() => void importExport.handleExport('html')}
          >
            Export as HTML
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={actionDisabled}
            onClick={() => void importExport.handleExport('txt')}
          >
            Export as TXT
          </DropdownMenuItem>
          {shouldShowTreeExport
            ? importExport.treeExportFormats.map((format) => (
                <DropdownMenuItem
                  key={format}
                  disabled={actionDisabled}
                  onClick={() => void importExport.handleExportTree(format)}
                >
                  {`Export tree as ${format.toUpperCase()}`}
                </DropdownMenuItem>
              ))
            : null}
        </>
      ) : null}
      <DropdownMenuItem
        disabled={actionDisabled || !importExport.canImport}
        onSelect={(event) => {
          event.preventDefault();
          handleOpenFilePicker();
        }}
      >
        Import HTML/TXT/DOCX
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
