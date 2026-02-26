import { NoteBreadcrumbs } from '../NoteBreadcrumbs';
import { NotePageActionsMenu } from '../NotePageActionsMenu';
import { useStudyItemStatus } from '@/features/learning/model/useStudyItemStatus';
import { formatDueDate } from '../../domain/formatDate';
import { Button, DropdownMenu, DropdownMenuTrigger } from '@/shared/ui';
import { MoreVertical } from 'lucide-react';
import type { SaveStatus } from '../../model/useNoteEditor';
import type { NoteEditorToolbarProps } from './NoteEditorToolbar.types';

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
}: NoteEditorToolbarProps) {
  const { data: studyStatus } = useStudyItemStatus(activeId);
  const showDueAt =
    studyStatus?.status === 'active' && studyStatus?.dueAt;

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        gap: '12px',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ minWidth: 0, flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
        <NoteBreadcrumbs activeId={activeId} notes={notes} currentTitle={currentTitle} />
        {showDueAt && (
          <span
            style={{
              fontSize: '12px',
              color: 'var(--muted-foreground, #6b7280)',
              whiteSpace: 'nowrap',
            }}
            title={`Next review: ${new Date(studyStatus.dueAt!).toLocaleString()}`}
          >
            Next review: {formatDueDate(studyStatus.dueAt!)} (
              {new Date(studyStatus.dueAt!).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            )
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '13px', color: SAVE_STATUS_COLOR[saveStatus] }}>
          {SAVE_STATUS_LABEL[saveStatus]}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" icon title="Page options" style={{ opacity: 0.7 }}>
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <NotePageActionsMenu
            noteId={activeId}
            isFavorite={isFavorite}
            hasChildren={notes?.some((n) => n.parent_id === activeId) ?? false}
            onAddToFavorites={onAddToFavorites}
            onRemoveFromFavorites={onRemoveFromFavorites}
            onCreateChild={onCreateChild}
            onDelete={onDelete}
            isDeleting={isDeleting}
          />
        </DropdownMenu>
      </div>
    </div>
  );
}
