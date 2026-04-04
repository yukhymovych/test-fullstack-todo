import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NoteBreadcrumbs } from '../NoteBreadcrumbs';
import { NotePageActionsMenu } from '../NotePageActionsMenu';
import { useStudyItemStatus } from '@/features/learning/model/useStudyItemStatus';
import { useStudyItemReviewLogs } from '@/features/learning/model/useStudyItemReviewLogs';
import { useDescendantsWithLearningCount } from '@/features/learning/model/useDescendantsWithLearningCount';
import { formatDueDate } from '../../domain/formatDate';
import {
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui';
import { CircleAlert, MoreVertical } from 'lucide-react';
import type { SaveStatus } from '../../model/useNoteEditor';
import type { NoteEditorToolbarProps } from './NoteEditorToolbar.types';
import { getGradeLabel } from '@/features/learning/lib/gradePresentation';
import './NoteEditorToolbar.css';

const SAVE_STATUS_COLOR: Record<SaveStatus, string> = {
  saving: '#2563eb',
  saved: '#16a34a',
  error: '#dc2626',
  idle: '#6b7280',
};

function getDaysAgoLabel(
  iso: string | null | undefined,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  if (!iso) return t('editor.notAvailable');
  const now = Date.now();
  const reviewedAt = new Date(iso).getTime();
  if (Number.isNaN(reviewedAt)) return t('editor.notAvailable');
  const diffMs = Math.max(0, now - reviewedAt);
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  return days === 0 ? t('editor.today') : t('editor.daysAgo', { count: days });
}

function getScheduledIntervalLabel(
  lastReviewedAt: string | null | undefined,
  dueAt: string | undefined,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  if (!lastReviewedAt || !dueAt) return t('editor.notAvailable');
  const fromMs = new Date(lastReviewedAt).getTime();
  const toMs = new Date(dueAt).getTime();
  if (Number.isNaN(fromMs) || Number.isNaN(toMs)) return t('editor.notAvailable');
  const interval = Math.max(0, (toMs - fromMs) / (24 * 60 * 60 * 1000));
  return t('editor.intervalDays', { count: Number(interval.toFixed(1)) });
}

function isSameDay(iso: string | undefined): boolean {
  if (!iso) {
    return false;
  }

  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) {
    return false;
  }

  const now = new Date();
  return (
    target.getFullYear() === now.getFullYear()
    && target.getMonth() === now.getMonth()
    && target.getDate() === now.getDate()
  );
}

export function NoteEditorToolbar({
  activeId,
  notes,
  currentTitle,
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
  const [isWhyTodayTooltipOpen, setIsWhyTodayTooltipOpen] = useState(false);
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
  const isDueToday = isSameDay(studyStatus?.dueAt);
  const { data: reviewLogs } = useStudyItemReviewLogs(activeId, isDueToday);
  const latestReviewLog = reviewLogs?.[0];
  const hasChildren = notes?.some((n) => n.parent_id === activeId) ?? false;
  const { data: descendantsWithLearning } = useDescendantsWithLearningCount(
    hasChildren ? activeId : undefined
  );
  const hasDescendantsInGlobal = (descendantsWithLearning?.count ?? 0) > 0;
  const showDueAt =
    studyStatus?.status === 'active' && studyStatus?.dueAt;

  return (
    <div className="note-editor-toolbar">
      <div className="note-editor-toolbar__top-row">
        <div className="note-editor-toolbar__left">
          <NoteBreadcrumbs activeId={activeId} notes={notes} currentTitle={currentTitle} />
        </div>
        <div className="note-editor-toolbar__right">
          <span className="note-editor-toolbar__save-status" style={{ color: SAVE_STATUS_COLOR[saveStatus] }}>
            {saveStatusLabel[saveStatus]}
            {importExport.pendingLabel ? ` ${importExport.pendingLabel}` : null}
          </span>
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
              isFavorite={isFavorite}
              hasChildren={hasChildren}
              hasDescendantsInGlobal={hasDescendantsInGlobal}
              onAddToFavorites={onAddToFavorites}
              onRemoveFromFavorites={onRemoveFromFavorites}
              onCreateChild={onCreateChild}
              onDelete={onDelete}
              isDeleting={isDeleting}
              importExport={importExport}
            />
          </DropdownMenu>
        </div>
      </div>
      {showDueAt && (
        <span className="note-editor-toolbar__due">
          {!isDueToday && (
            <>
              {t('editor.nextReview', {
                relative: dueLabel,
                date: new Date(studyStatus.dueAt!).toLocaleDateString(i18n.resolvedLanguage, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                }),
              })}
            </>
          )}
          {isDueToday && (
            <span className="note-editor-toolbar__due-today">
              <span>
                {t('editor.nextReview', {
                  relative: dueLabel,
                  date: new Date(studyStatus.dueAt!).toLocaleDateString(i18n.resolvedLanguage, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  }),
                })}
              </span>
              <Tooltip open={isWhyTodayTooltipOpen} onOpenChange={setIsWhyTodayTooltipOpen}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={t('editor.whyTodayAria')}
                    className="note-editor-toolbar__why-today"
                    onClick={() => setIsWhyTodayTooltipOpen((prev) => !prev)}
                  >
                    {t('editor.whyToday')}
                    <CircleAlert className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="start">
                  <div className="note-editor-toolbar__tooltip-grid">
                    <div>
                      {t('editor.lastReview', {
                        value: getDaysAgoLabel(studyStatus.lastReviewedAt, t),
                      })}
                    </div>
                    <div>
                      {t('editor.stability', {
                        value: studyStatus.stabilityDays?.toFixed(1) ?? t('editor.notAvailable'),
                      })}
                    </div>
                    <div>
                      {t('editor.difficulty', {
                        value: studyStatus.difficulty?.toFixed(1) ?? t('editor.notAvailable'),
                      })}
                    </div>
                    <div>
                      {t('editor.lastGrade', {
                        value: latestReviewLog?.grade
                          ? getGradeLabel(t, latestReviewLog.grade)
                          : t('editor.notAvailable'),
                      })}
                    </div>
                    <div>
                      {t('editor.scheduledInterval', {
                        value: getScheduledIntervalLabel(studyStatus.lastReviewedAt, studyStatus.dueAt, t),
                      })}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </span>
          )}
        </span>
      )}
    </div>
  );
}
