import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NoteBreadcrumbs } from '../NoteBreadcrumbs';
import { NotePageActionsMenu } from '../NotePageActionsMenu';
import { usePageBackupExport } from '@/features/backup/model/usePageBackupExport';
import { useStudyItemStatus } from '@/features/learning/model/useStudyItemStatus';
import { useDescendantsWithLearningCount } from '@/features/learning/model/useDescendantsWithLearningCount';
import { LearningStatsSheet } from '@/features/learning-stats/components/LearningStatsSheet';
import { formatDueDate } from '../../domain/formatDate';
import {
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  Spinner,
  Sheet,
  SheetContent,
} from '@/shared/ui';
import { LineChart, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SaveStatus } from '../../model/useNoteEditor';
import type { NoteEditorToolbarProps } from './NoteEditorToolbar.types';
import './NoteEditorToolbar.css';

const SAVE_STATUS_COLOR: Record<SaveStatus, string> = {
  saving: '#2563eb',
  saved: '#16a34a',
  error: '#dc2626',
  idle: '#6b7280',
};

export function NoteEditorToolbar({
  activeId,
  notes,
  currentTitle,
  hidePageActions = false,
  saveStatus,
  isFavorite,
  onAddToFavorites,
  onRemoveFromFavorites,
  onCreateChild,
  onDelete,
  isDeleting,
  importExport,
}: NoteEditorToolbarProps) {
  const { t, i18n } = useTranslation('notes');
  const { t: tLearn } = useTranslation('learning');
  const [statsOpen, setStatsOpen] = useState(false);
  const { data: studyStatus } = useStudyItemStatus(activeId);
  const saveStatusLabel: Record<SaveStatus, string> = {
    saving: t('editor.saveStatus.saving'),
    saved: t('editor.saveStatus.saved'),
    error: t('editor.saveStatus.error'),
    idle: t('editor.saveStatus.idle'),
  };
  const dueLabel = studyStatus?.dueAt
    ? formatDueDate(studyStatus.dueAt, i18n.resolvedLanguage)
    : null;
  const hasChildren = notes?.some((n) => n.parent_id === activeId) ?? false;
  const { data: descendantsWithLearning } = useDescendantsWithLearningCount(
    hasChildren ? activeId : undefined
  );
  const hasDescendantsInGlobal = (descendantsWithLearning?.count ?? 0) > 0;
  const pageBackup = usePageBackupExport();
  const showDueAt =
    studyStatus?.status === 'active' && studyStatus?.dueAt;

  return (
    <>
    <div className="note-editor-toolbar">
      <div className="note-editor-toolbar__top-row">
        <div className="note-editor-toolbar__left">
          <NoteBreadcrumbs activeId={activeId} notes={notes} currentTitle={currentTitle} />
        </div>
        <div className="note-editor-toolbar__right">
          <span className="note-editor-toolbar__save-status" style={{ color: SAVE_STATUS_COLOR[saveStatus] }}>
            {saveStatus === 'saving' ? (
              <>
                <Spinner announce={false} size="sm" className="text-current" />
                <span className="sr-only">{t('editor.saveStatus.saving')}</span>
              </>
            ) : (
              saveStatusLabel[saveStatus]
            )}
            {importExport.pendingLabel ? (
              <>
                {' '}
                <span className="sr-only">{importExport.pendingLabel}</span>
                <Spinner announce={false} size="sm" className="text-current" />
              </>
            ) : null}
          </span>
          {!hidePageActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  icon
                  className="menu-trigger-btn"
                  title={t('editor.pageOptions')}
                  style={{ opacity: 0.7 }}
                >
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <NotePageActionsMenu
                noteId={activeId}
                noteTitle={currentTitle}
                isFavorite={isFavorite}
                hasChildren={hasChildren}
                hasDescendantsInGlobal={hasDescendantsInGlobal}
                onAddToFavorites={onAddToFavorites}
                onRemoveFromFavorites={onRemoveFromFavorites}
                onCreateChild={onCreateChild}
                onDelete={onDelete}
                isDeleting={isDeleting}
                importExport={importExport}
                pageBackup={pageBackup}
              />
            </DropdownMenu>
          )}
        </div>
      </div>
      {showDueAt && (
        <div className="note-editor-toolbar__due-row">
          <span className="note-editor-toolbar__due">
            {t('editor.nextReview', {
              relative: dueLabel,
              date: new Date(studyStatus.dueAt!).toLocaleDateString(i18n.resolvedLanguage, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              }),
            })}
          </span>
          <Button
            variant="outline"
            type="button"
            size="sm"
            className={cn(
              'shrink-0 border-white/10 bg-transparent text-muted-foreground',
              'hover:bg-white/5 hover:text-foreground'
            )}
            onClick={() => setStatsOpen(true)}
          >
            <LineChart className="size-4" aria-hidden />
            {tLearn('stats.openButton')}
          </Button>
        </div>
      )}
    </div>

    <Sheet open={statsOpen} onOpenChange={setStatsOpen}>
      <SheetContent
        side="right"
        className={cn(
          'flex h-full w-full min-w-0 max-w-[100dvw] flex-col gap-0 overflow-y-auto overflow-x-hidden',
          'border-l border-white/10 bg-zinc-950/95 p-4 text-foreground shadow-none',
          'sm:w-[480px] sm:max-w-[480px] sm:shrink-0 sm:p-6'
        )}
      >
        <LearningStatsSheet
          noteId={activeId}
          studyStatus={studyStatus}
          enabled={statsOpen}
        />
      </SheetContent>
    </Sheet>
    </>
  );
}
