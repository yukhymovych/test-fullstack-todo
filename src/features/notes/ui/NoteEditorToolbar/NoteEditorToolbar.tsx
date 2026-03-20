import { useState } from 'react';
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
import './NoteEditorToolbar.css';

const SAVE_STATUS_COLOR: Record<SaveStatus, string> = {
  saving: '#2563eb',
  saved: '#16a34a',
  error: '#dc2626',
  idle: '#6b7280',
};

const SAVE_STATUS_LABEL: Record<SaveStatus, string> = {
  saving: 'Saving...',
  saved: 'Saved',
  error: 'Error saving',
  idle: '\u00A0',
};

function getDaysAgoLabel(iso: string | null | undefined): string {
  if (!iso) return 'N/A';
  const now = Date.now();
  const reviewedAt = new Date(iso).getTime();
  if (Number.isNaN(reviewedAt)) return 'N/A';
  const diffMs = Math.max(0, now - reviewedAt);
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  return days === 0 ? 'Today' : `${days} day${days === 1 ? '' : 's'} ago`;
}

function getScheduledIntervalLabel(
  lastReviewedAt: string | null | undefined,
  dueAt: string | undefined
): string {
  if (!lastReviewedAt || !dueAt) return 'N/A';
  const fromMs = new Date(lastReviewedAt).getTime();
  const toMs = new Date(dueAt).getTime();
  if (Number.isNaN(fromMs) || Number.isNaN(toMs)) return 'N/A';
  const interval = Math.max(0, (toMs - fromMs) / (24 * 60 * 60 * 1000));
  return `${interval.toFixed(1)} day${interval >= 1.5 ? 's' : ''}`;
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
  const [isWhyTodayTooltipOpen, setIsWhyTodayTooltipOpen] = useState(false);
  const { data: studyStatus } = useStudyItemStatus(activeId);
  const dueLabel = studyStatus?.dueAt ? formatDueDate(studyStatus.dueAt) : null;
  const isDueToday = dueLabel === 'Today';
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
            {SAVE_STATUS_LABEL[saveStatus]}
            {importExport.pendingLabel ? ` ${importExport.pendingLabel}` : null}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                icon
                className="menu-trigger-btn"
                title="Page options"
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
              Next review: {dueLabel} (
              {new Date(studyStatus.dueAt!).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
              )
            </>
          )}
          {isDueToday && (
            <span className="note-editor-toolbar__due-today">
              <span>
                Next review: {dueLabel} (
                {new Date(studyStatus.dueAt!).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
                )
              </span>
              <Tooltip open={isWhyTodayTooltipOpen} onOpenChange={setIsWhyTodayTooltipOpen}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="Why review is due today"
                    className="note-editor-toolbar__why-today"
                    onClick={() => setIsWhyTodayTooltipOpen((prev) => !prev)}
                  >
                    Why today?
                    <CircleAlert className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="start">
                  <div className="note-editor-toolbar__tooltip-grid">
                    <div>Last review: {getDaysAgoLabel(studyStatus.lastReviewedAt)}</div>
                    <div>
                      Stability: {studyStatus.stabilityDays?.toFixed(1) ?? 'N/A'} days
                    </div>
                    <div>
                      Difficulty: {studyStatus.difficulty?.toFixed(1) ?? 'N/A'} / 10
                    </div>
                    <div>
                      Last grade:{' '}
                      {latestReviewLog?.grade
                        ? latestReviewLog.grade[0].toUpperCase() + latestReviewLog.grade.slice(1)
                        : 'N/A'}
                    </div>
                    <div>
                      Scheduled interval:{' '}
                      {getScheduledIntervalLabel(studyStatus.lastReviewedAt, studyStatus.dueAt)}
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
