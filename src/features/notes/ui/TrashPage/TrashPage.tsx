import { useMemo } from 'react';
import { RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/shared/ui';
import { useTrashPage } from '../../model/useTrashPage';
import { usePageTitle } from '@/shared/lib/usePageTitle';
import { TrashTree } from './TrashTree';
import { TrashNotePreview } from './TrashNotePreview';
import './TrashPage.css';

export function TrashPage() {
  const {
    byId,
    childrenByParent,
    rootIds,
    expanded,
    toggleExpand,
    selectedId,
    selectedRootId,
    selectedNote,
    selectedNoteDaysRemaining,
    isLoading,
    isSelectedNoteLoading,
    error,
    isRestoring,
    isPermanentlyDeleting,
    getDaysRemaining,
    handleOpen,
    handleRestore,
    handlePermanentDelete,
  } = useTrashPage();

  const noteTitlesMap = useMemo(() => {
    const map = new Map<string, string>();
    byId.forEach((note, noteId) => {
      map.set(noteId, note.title || 'Untitled');
    });
    return map;
  }, [byId]);

  usePageTitle(selectedNote ? `Trash: ${selectedNote.title || 'Untitled'}` : 'Trash');

  if (isLoading) {
    return <div className="trash-page trash-page--status">Loading trash...</div>;
  }

  if (error) {
    return <div className="trash-page trash-page--status">Error: {error.message}</div>;
  }

  return (
    <div className="trash-page">
      <section className="trash-page__sidebar">
        <div className="trash-page__sidebar-header">
          <h1>Trash</h1>
          <p>Pages stay here for 10 days before permanent deletion.</p>
        </div>

        {rootIds.length === 0 ? (
          <div className="trash-page__empty">Trash is empty.</div>
        ) : (
          <div className="trash-page__tree">
            {rootIds.map((rootId) => (
              <TrashTree
                key={rootId}
                nodeId={rootId}
                depth={0}
                byId={byId}
                childrenByParent={childrenByParent}
                expanded={expanded}
                selectedId={selectedId}
                selectedRootId={selectedRootId}
                getDaysRemaining={getDaysRemaining}
                onToggleExpand={toggleExpand}
                onOpen={handleOpen}
                onRestore={handleRestore}
                onPermanentDelete={handlePermanentDelete}
                isActionPending={isRestoring || isPermanentlyDeleting}
              />
            ))}
          </div>
        )}
      </section>

      <section className="trash-page__content">
        {!selectedId ? (
          <div className="trash-page__placeholder">Open a trashed page to preview, restore, or permanently delete it.</div>
        ) : isSelectedNoteLoading || !selectedNote ? (
          <div className="trash-page__placeholder">Loading page preview...</div>
        ) : (
          <>
            <div className="trash-page__content-header">
              <div>
                <h2>{selectedNote.title || 'Untitled'}</h2>
                <p>Will be permanently deleted in {selectedNoteDaysRemaining ?? 0} day(s).</p>
              </div>
              <div className="trash-page__content-actions">
                <Button
                  variant="secondary"
                  size='sm'
                  onClick={() => handleRestore(selectedNote.id)}
                  disabled={isRestoring || isPermanentlyDeleting}
                >
                  <RotateCcw />
                  Restore
                </Button>
                <Button
                  variant="primary"
                  size='sm'
                  onClick={() => handlePermanentDelete(selectedNote.id)}
                  disabled={isRestoring || isPermanentlyDeleting}
                >
                  <Trash2 />
                  Delete permanently
                </Button>
              </div>
            </div>
            <TrashNotePreview note={selectedNote} noteTitlesMap={noteTitlesMap} />
          </>
        )}
      </section>
    </div>
  );
}
