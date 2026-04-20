import { useTranslation } from 'react-i18next';
import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/shared/ui';
import type { UsePageBackupExportResult } from '@/features/backup/model/usePageBackupExport';

export interface NoteBackupMenuSectionProps {
  noteId: string;
  noteTitle: string;
  hasChildren: boolean;
  pageBackup?: UsePageBackupExportResult;
  /** Whether something else in the menu is currently busy (export/import). */
  isMenuBusy?: boolean;
}

export function NoteBackupMenuSection({
  noteId,
  noteTitle,
  hasChildren,
  pageBackup,
  isMenuBusy = false,
}: NoteBackupMenuSectionProps) {
  const { t } = useTranslation('notes');

  if (!pageBackup) {
    return null;
  }

  const disabled = pageBackup.isExporting || isMenuBusy;

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger disabled={disabled}>
        {t('menu.backup')}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuItem
          disabled={disabled}
          onClick={() => void pageBackup.exportPage(noteId, noteTitle)}
        >
          {t('menu.backupPage')}
        </DropdownMenuItem>
        {hasChildren ? (
          <DropdownMenuItem
            disabled={disabled}
            onClick={() => void pageBackup.exportSubtree(noteId, noteTitle)}
          >
            {t('menu.backupPageWithChildren')}
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
