import { NoteBreadcrumbs } from './NoteBreadcrumbs';
import { Button } from '@/shared/ui';
import type { NoteListItem } from '../model/types';
import type { SaveStatus } from '../model/useNoteEditor';

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

interface NoteEditorToolbarProps {
  activeId: string;
  notes: NoteListItem[] | undefined;
  currentTitle: string;
  saveStatus: SaveStatus;
  onDelete: () => void;
  isDeleting: boolean;
}

export function NoteEditorToolbar({
  activeId,
  notes,
  currentTitle,
  saveStatus,
  onDelete,
  isDeleting,
}: NoteEditorToolbarProps) {
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
      <div style={{ minWidth: 0, flex: 1 }}>
        <NoteBreadcrumbs activeId={activeId} notes={notes} currentTitle={currentTitle} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '13px', color: SAVE_STATUS_COLOR[saveStatus] }}>
          {SAVE_STATUS_LABEL[saveStatus]}
        </span>
        <Button variant="danger" onClick={onDelete} disabled={isDeleting}>
          {isDeleting ? 'Deleting...' : 'Delete'}
        </Button>
      </div>
    </div>
  );
}
