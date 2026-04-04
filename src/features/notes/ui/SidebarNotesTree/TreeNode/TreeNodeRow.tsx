import type { NoteItem } from '../treeUtils';
import { DEFAULT_NOTE_TITLE } from '../../../model/types';
import { NotePageActionsMenu } from '../../NotePageActionsMenu';
import { useDescendantsWithLearningCount } from '@/features/learning/model/useDescendantsWithLearningCount';
import { useTranslation } from 'react-i18next';
import {
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
} from '@/shared/ui';
import { cn } from '@/lib/utils';
import { MoreVertical } from 'lucide-react';
import { RiArrowDownSLine } from 'react-icons/ri';

export interface TreeNodeRowProps {
  node: NoteItem;
  nodeId: string;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
  isActive: boolean;
  isFavorite: boolean;
  toggleExpand: (id: string) => void;
  onCreateChild: (parentId: string) => void;
  onDeletePage: (pageId: string) => void;
  onAddToFavorites?: (noteId: string) => void;
  onRemoveFromFavorites?: (noteId: string) => void;
  isDeleting: boolean;
  navigate: (id: string) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  rowRef?: (el: HTMLDivElement | null) => void;
  rowStyle?: React.CSSProperties;
}

export function TreeNodeRow({
  node,
  nodeId,
  depth,
  hasChildren,
  isExpanded,
  isActive,
  isFavorite,
  toggleExpand,
  onCreateChild,
  onDeletePage,
  onAddToFavorites,
  onRemoveFromFavorites,
  isDeleting,
  navigate,
  dragHandleProps,
  rowRef,
  rowStyle,
}: TreeNodeRowProps) {
  const { t } = useTranslation('notes');
  const paddingLeft = 12 + depth * 14;
  const { data: descendantsWithLearning } = useDescendantsWithLearningCount(
    hasChildren ? nodeId : undefined
  );
  const hasDescendantsInGlobal = (descendantsWithLearning?.count ?? 0) > 0;

  return (
    <div
      ref={rowRef}
      className={cn(
        'notes-tree-row',
        dragHandleProps && 'active:cursor-grabbing'
      )}
      style={{
        display: 'flex',
        alignItems: 'center',
        paddingLeft,
        backgroundColor: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
        borderRadius: '4px',
        cursor: dragHandleProps ? 'grab' : 'default',
        ...rowStyle,
      }}
      {...(dragHandleProps ?? {})}
    >
      <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
        <Button
          variant="ghost"
          icon
          className="notes-tree-row__expand-btn"
          onClick={() => hasChildren && toggleExpand(nodeId)}
          style={{
            cursor: hasChildren ? 'pointer' : 'default',
            flex: 0,
          }}
        >
          {hasChildren && (
            <span
              className={cn(
                'notes-tree-row__chevron',
                !isExpanded && 'notes-tree-row__chevron--collapsed'
              )}
              aria-hidden
            >
              <RiArrowDownSLine />
            </span>
          )}
        </Button>
        <Button
          variant="ghost"
          onClick={() => navigate(nodeId)}
          className="notes-tree-row__page-btn justify-start"
          style={{
            flex: 1,
            textAlign: 'left',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: isActive ? '#fff' : '#d1d5db',
            fontSize: '14px',
            paddingLeft: '5px',
          }}
        >
          {node.title || DEFAULT_NOTE_TITLE}
        </Button>
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
            noteId={nodeId}
            isFavorite={isFavorite}
            hasChildren={hasChildren}
            hasDescendantsInGlobal={hasDescendantsInGlobal}
            onAddToFavorites={onAddToFavorites}
            onRemoveFromFavorites={onRemoveFromFavorites}
            onCreateChild={onCreateChild}
            onDelete={onDeletePage}
            isDeleting={isDeleting}
          />
        </DropdownMenu>
      </div>
    </div>
  );
}
