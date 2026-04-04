import { RotateCcw, Trash2 } from 'lucide-react';
import { RiArrowDownSLine } from 'react-icons/ri';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui';
import type { TrashNoteListItem } from '../../model/trash.types';

interface TrashTreeProps {
  nodeId: string;
  depth: number;
  byId: Map<string, TrashNoteListItem>;
  childrenByParent: Map<string | null, string[]>;
  expanded: Set<string>;
  selectedId?: string;
  selectedRootId?: string | null;
  getDaysRemaining: (trashedAtIso: string) => number;
  onToggleExpand: (noteId: string) => void;
  onOpen: (noteId: string) => void;
  onRestore: (noteId: string) => void;
  onPermanentDelete: (noteId: string) => void;
  isActionPending: boolean;
}

export function TrashTree({
  nodeId,
  depth,
  byId,
  childrenByParent,
  expanded,
  selectedId,
  selectedRootId,
  getDaysRemaining,
  onToggleExpand,
  onOpen,
  onRestore,
  onPermanentDelete,
  isActionPending,
}: TrashTreeProps) {
  const { t } = useTranslation('notes');
  const note = byId.get(nodeId);
  if (!note) {
    return null;
  }

  const childIds = childrenByParent.get(nodeId) ?? [];
  const hasChildren = childIds.length > 0;
  const isExpanded = expanded.has(nodeId);
  const isSelected = selectedId === nodeId;
  const isSelectedBranch = selectedRootId === nodeId;
  const daysRemaining = getDaysRemaining(note.trashed_at);

  return (
    <div className="trash-tree__node">
      <div
        className={`trash-tree__row ${isSelected ? 'trash-tree__row--selected' : ''} ${isSelectedBranch ? 'trash-tree__row--selected-branch' : ''}`}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
      >
        <button
          type="button"
          className="trash-tree__expand"
          onClick={() => hasChildren && onToggleExpand(nodeId)}
          aria-label={
            hasChildren
              ? (isExpanded ? t('trash.collapseSubtree') : t('trash.expandSubtree'))
              : t('trash.noChildren')
          }
          disabled={!hasChildren}
        >
          {hasChildren ? (
            <span
              className={`trash-tree__chevron ${!isExpanded ? 'trash-tree__chevron--collapsed' : ''}`}
              aria-hidden
            >
              <RiArrowDownSLine />
            </span>
          ) : null}
        </button>
        <button
          type="button"
          className="trash-tree__title"
          onClick={() => onOpen(nodeId)}
        >
          <span className="trash-tree__title-text">{note.title || t('untitled')}</span>
          <span className="trash-tree__meta">{t('trash.daysLeft', { count: daysRemaining })}</span>
        </button>
        <div className="trash-tree__actions">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('trash.restoreAria')}
            onClick={() => onRestore(nodeId)}
            disabled={isActionPending}
          >
            <RotateCcw />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('trash.deletePermanentlyAria')}
            onClick={() => onPermanentDelete(nodeId)}
            disabled={isActionPending}
          >
            <Trash2 />
          </Button>
        </div>
      </div>
      {hasChildren && isExpanded ? (
        <div className="trash-tree__children">
          {childIds.map((childId) => (
            <TrashTree
              key={childId}
              nodeId={childId}
              depth={depth + 1}
              byId={byId}
              childrenByParent={childrenByParent}
              expanded={expanded}
              selectedId={selectedId}
              selectedRootId={selectedRootId}
              getDaysRemaining={getDaysRemaining}
              onToggleExpand={onToggleExpand}
              onOpen={onOpen}
              onRestore={onRestore}
              onPermanentDelete={onPermanentDelete}
              isActionPending={isActionPending}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
