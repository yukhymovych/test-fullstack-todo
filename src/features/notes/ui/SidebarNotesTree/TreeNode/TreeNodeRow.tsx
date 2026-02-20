import type { NoteItem } from '../treeUtils';
import { DEFAULT_NOTE_TITLE } from '../../../model/types';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui';
import { cn } from '@/lib/utils';
import { MoreVertical } from 'lucide-react';

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
  const paddingLeft = 12 + depth * 14;

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
          onClick={() => hasChildren && toggleExpand(nodeId)}
          style={{
            cursor: hasChildren ? 'pointer' : 'default',
            flex: 0,
          }}
        >
          {hasChildren ? (isExpanded ? '▼' : '▶') : ' '}
        </Button>
        <Button
          variant="ghost"
          onClick={() => navigate(nodeId)}
          className="justify-start"
          style={{
            flex: 1,
            textAlign: 'left',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: isActive ? '#fff' : '#d1d5db',
            fontSize: '14px',
            marginLeft: '2px',
          }}
        >
          {node.title || DEFAULT_NOTE_TITLE}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              icon
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              title="Page options"
              style={{ opacity: 0.7 }}
            >
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isFavorite ? (
              <DropdownMenuItem
                onClick={() => onRemoveFromFavorites?.(nodeId)}
              >
                Remove from Favorites
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={() => onAddToFavorites?.(nodeId)}
              >
                Add to Favorites
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onCreateChild(nodeId)}>
              Add new page
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDeletePage(nodeId)}
              disabled={isDeleting}
            >
              Delete page
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
