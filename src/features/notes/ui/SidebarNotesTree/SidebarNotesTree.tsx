import { useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FileStack, Trash2 } from 'lucide-react';
import { RiArrowDownSLine } from 'react-icons/ri';
import { useTranslation } from 'react-i18next';
import { useNotesTree } from '../../model/useNotesTree';
import { TreeNode } from './TreeNode';
import { DndContextWrapper } from './DndContextWrapper';
import { DropZone } from './DropZone';
import { SidebarRecentsList } from '../SidebarRecentsList/SidebarRecentsList';
import { SidebarFavoritesList } from '../SidebarFavoritesList/SidebarFavoritesList';
import { LearningSidebarCard } from '@/features/learning/ui/LearningSidebarCard';
import { Button } from '@/shared/ui';
import { UserInfo } from '@/app/components/UserInfo';
import { notesRoutes } from '../../lib/routes';
import './SidebarNotesTree.css';

export interface SidebarNotesTreeProps {
  onNavigate?: () => void;
}

export function SidebarNotesTree({ onNavigate }: SidebarNotesTreeProps) {
  const location = useLocation();
  const { t } = useTranslation(['common', 'notes']);
  const {
    isLoading,
    error,
    byId,
    childrenByParent,
    rootIds,
    expanded,
    toggleExpand,
    recentIds,
    recentFormattedTimes,
    recentsExpanded,
    toggleRecentsExpand,
    favoritesTreeExpanded,
    toggleFavoritesTreeExpand,
    favoriteIds,
    favoritesExpanded,
    toggleFavoritesExpand,
    allPagesExpanded,
    toggleAllPagesExpand,
    handleCreateRoot,
    handleCreateChild,
    handleMoveNote,
    handleDeletePage,
    handleNavigate,
    handleAddToFavorites,
    handleRemoveFromFavorites,
    activeId,
    createNote,
    deleteNote,
  } = useNotesTree();

  const handleDragEnd = useCallback(
    (noteId: string, overId: string) => {
      let newParentId: string | null;
      let position: number;

      if (overId === 'root-end') {
        newParentId = null;
        position = rootIds.length;
      } else if (overId.startsWith('before-')) {
        const targetNodeId = overId.slice(7);
        const targetNode = byId.get(targetNodeId);
        if (!targetNode) return;
        newParentId = targetNode.parent_id ?? null;
        const siblings = childrenByParent.get(newParentId) ?? [];
        position = siblings.indexOf(targetNodeId);
        if (position < 0) position = 0;
      } else if (overId.startsWith('onto-')) {
        const targetNodeId = overId.slice(5);
        if (targetNodeId === noteId) return;
        newParentId = targetNodeId;
        const siblings = childrenByParent.get(targetNodeId) ?? [];
        position = siblings.length;
      } else {
        return;
      }

      handleMoveNote(noteId, newParentId, position);
    },
    [byId, childrenByParent, rootIds.length, handleMoveNote]
  );

  const handleNavigateAndClose = useCallback(
    (id: string) => {
      handleNavigate(id);
      onNavigate?.();
    },
    [handleNavigate, onNavigate]
  );

  if (isLoading) {
    return <div className="sidebar-loading">{t('sidebar.loading', { ns: 'notes' })}</div>;
  }

  if (error) {
    return (
      <div className="sidebar-error">
        {t('errors.withMessage', { ns: 'common', message: error.message })}
      </div>
    );
  }

  const isTrashActive = location.pathname.startsWith(notesRoutes.trash());

  return (
    <div className="sidebar-container">
      <div className="sidebar-content">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <Link
              to="/"
              className="sidebar-brand__link"
              aria-label={t('navigation.goToHomePage', { ns: 'common' })}
              onClick={onNavigate}
            >
              <img src="/logo.png" alt="Rememo" className="sidebar-brand__logo" />
            </Link>
          </div>
          <div className="sidebar-user-info">
            <UserInfo />
          </div>
        </div>
        <div className="sidebar-new-page-button">
          <Button
            variant="ghost"
            className="sidebar-new-page-button"
            size='sm'
            fullWidth
            onClick={handleCreateRoot}
            disabled={createNote.isPending}
          >
            {createNote.isPending
              ? t('sidebar.creating', { ns: 'notes' })
              : t('sidebar.newPage', { ns: 'notes' })}
          </Button>
        </div>
        <LearningSidebarCard />
        <SidebarRecentsList
          recentIds={recentIds}
          byId={byId}
          recentFormattedTimes={recentFormattedTimes}
          isExpanded={recentsExpanded}
          onToggleExpand={toggleRecentsExpand}
          navigate={handleNavigateAndClose}
          activeId={activeId}
        />
        <SidebarFavoritesList
          favoriteIds={favoriteIds}
          byId={byId}
          childrenByParent={childrenByParent}
          expandedSet={favoritesTreeExpanded}
          toggleExpand={toggleFavoritesTreeExpand}
          isExpanded={favoritesExpanded}
          onToggleExpand={toggleFavoritesExpand}
          onAddToFavorites={handleAddToFavorites}
          onRemoveFromFavorites={handleRemoveFromFavorites}
          onCreateChild={handleCreateChild}
          onDeletePage={handleDeletePage}
          isDeleting={deleteNote.isPending}
          navigate={handleNavigateAndClose}
          activeId={activeId}
        />
        <div className="sidebar-all-pages">
          <Button
            variant="ghost"
            fullWidth
            onClick={toggleAllPagesExpand}
            className="sidebar-all-pages__header"
          >
            <FileStack className="sidebar-all-pages__icon size-4" />
            <span>{t('sidebar.allPages', { ns: 'notes' })}</span>
            <span
              className={`sidebar-all-pages__chevron ${!allPagesExpanded ? 'sidebar-all-pages__chevron--collapsed' : ''}`}
              aria-hidden
            >
              <RiArrowDownSLine />
            </span>
          </Button>
          {allPagesExpanded && (
            <DndContextWrapper onDragEnd={handleDragEnd}>
              <div className="sidebar-tree">
                {rootIds.map((nodeId) => (
                  <TreeNode
                    key={nodeId}
                    nodeId={nodeId}
                    depth={0}
                    byId={byId}
                    childrenByParent={childrenByParent}
                    expandedSet={expanded}
                    toggleExpand={toggleExpand}
                    onCreateChild={handleCreateChild}
                    onDeletePage={handleDeletePage}
                    onMoveNote={handleMoveNote}
                    onAddToFavorites={handleAddToFavorites}
                    onRemoveFromFavorites={handleRemoveFromFavorites}
                    isDeleting={deleteNote.isPending}
                    navigate={handleNavigateAndClose}
                    activeId={activeId}
                  />
                ))}
                <DropZone id="root-end" variant="between" className="sidebar-root-end" />
              </div>
            </DndContextWrapper>
          )}
        </div>
      </div>
      <div className="sidebar-footer">
        <Button
          variant="ghost"
          fullWidth
          asChild
          className={isTrashActive ? 'sidebar-trash-link sidebar-trash-link--active' : 'sidebar-trash-link'}
        >
          <Link to={notesRoutes.trash()} onClick={onNavigate}>
            <Trash2 className="size-4" />
            <span>{t('navigation.trash', { ns: 'common' })}</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
