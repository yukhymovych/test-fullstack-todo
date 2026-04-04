import { useMemo } from 'react';
import { RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/shared/ui';
import { useTranslation } from 'react-i18next';
import { useTrashPage } from '../../model/useTrashPage';
import { usePageTitle } from '@/shared/lib/usePageTitle';
import { TrashTree } from './TrashTree';
import { TrashNotePreview } from './TrashNotePreview';
import './TrashPage.css';

export function TrashPage() {
  const { t } = useTranslation('notes');
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
      map.set(noteId, note.title || t('untitled'));
    });
    return map;
  }, [byId, t]);

  usePageTitle(
    selectedNote
      ? t('trash.titleWithNote', { title: selectedNote.title || t('untitled') })
      : t('trash.title')
  );

  if (isLoading) {
    return <div className="trash-page trash-page--status">{t('trash.loading')}</div>;
  }

  if (error) {
    return (
      <div className="trash-page trash-page--status">
        {t('errors.withMessage', { ns: 'common', message: error.message })}
      </div>
    );
  }

  return (
    <div className="trash-page">
      <section className="trash-page__sidebar">
        <div className="trash-page__sidebar-header">
          <h1>{t('trash.title')}</h1>
          <p>{t('trash.subtitle')}</p>
        </div>

        {rootIds.length === 0 ? (
          <div className="trash-page__empty">{t('trash.empty')}</div>
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
          <div className="trash-page__placeholder">{t('trash.placeholder')}</div>
        ) : isSelectedNoteLoading || !selectedNote ? (
          <div className="trash-page__placeholder">{t('trash.loadingPreview')}</div>
        ) : (
          <>
            <div className="trash-page__content-header">
              <div>
                <h2>{selectedNote.title || t('untitled')}</h2>
                <p>{t('trash.deleteInDays', { count: selectedNoteDaysRemaining ?? 0 })}</p>
              </div>
              <div className="trash-page__content-actions">
                <Button
                  variant="secondary"
                  size='sm'
                  onClick={() => handleRestore(selectedNote.id)}
                  disabled={isRestoring || isPermanentlyDeleting}
                >
                  <RotateCcw />
                  {t('trash.restore')}
                </Button>
                <Button
                  variant="primary"
                  size='sm'
                  onClick={() => handlePermanentDelete(selectedNote.id)}
                  disabled={isRestoring || isPermanentlyDeleting}
                >
                  <Trash2 />
                  {t('trash.deletePermanently')}
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
