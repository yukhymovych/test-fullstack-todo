import { Star } from 'lucide-react';
import { RiArrowDownSLine } from 'react-icons/ri';
import { Button } from '@/shared/ui';
import { TreeNode } from '../SidebarNotesTree/TreeNode';
import type { NoteListItem } from '../../model/types';
import './SidebarFavoritesList.css';

export interface SidebarFavoritesListProps {
  favoriteIds: string[];
  byId: Map<string, NoteListItem>;
  childrenByParent: Map<string | null, string[]>;
  expandedSet: Set<string>;
  toggleExpand: (id: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onAddToFavorites: (noteId: string) => void;
  onRemoveFromFavorites: (noteId: string) => void;
  onCreateChild: (parentId: string) => void;
  onDeletePage: (pageId: string) => void;
  isDeleting: boolean;
  navigate: (id: string) => void;
  activeId: string | undefined;
}

export function SidebarFavoritesList({
  favoriteIds,
  byId,
  childrenByParent,
  expandedSet,
  toggleExpand,
  isExpanded,
  onToggleExpand,
  onAddToFavorites,
  onRemoveFromFavorites,
  onCreateChild,
  onDeletePage,
  isDeleting,
  navigate,
  activeId,
}: SidebarFavoritesListProps) {
  if (favoriteIds.length === 0) return null;

  return (
    <div className="sidebar-favorites">
      <Button
        variant="ghost"
        fullWidth
        onClick={onToggleExpand}
        className="sidebar-favorites__header"
      >
        <Star className="sidebar-favorites__star size-4" />
        <span>Favorite</span>
        <span
          className={`sidebar-favorites__chevron ${!isExpanded ? 'sidebar-favorites__chevron--collapsed' : ''}`}
          aria-hidden
        >
          <RiArrowDownSLine />
        </span>
      </Button>
      {isExpanded && (
        <div className="sidebar-favorites__list">
          {favoriteIds.map((noteId) => (
            <TreeNode
              key={noteId}
              nodeId={noteId}
              depth={0}
              byId={byId}
              childrenByParent={childrenByParent}
              expandedSet={expandedSet}
              toggleExpand={toggleExpand}
              onCreateChild={onCreateChild}
              onDeletePage={onDeletePage}
              onAddToFavorites={onAddToFavorites}
              onRemoveFromFavorites={onRemoveFromFavorites}
              isDeleting={isDeleting}
              navigate={navigate}
              activeId={activeId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
