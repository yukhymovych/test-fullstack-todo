import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { TreeNodeProps } from './TreeNode.types';
import { TreeNodeRow } from './TreeNodeRow';
import { DropZone } from '../DropZone';

export function TreeNode({
  nodeId,
  depth,
  byId,
  childrenByParent,
  expandedSet,
  toggleExpand,
  onCreateChild,
  onDeletePage,
  onMoveNote,
  isDeleting,
  navigate,
  activeId,
}: TreeNodeProps) {
  const node = byId.get(nodeId);
  if (!node) return null;

  const children = childrenByParent.get(nodeId) ?? [];
  const hasChildren = children.length > 0;
  const isExpanded = expandedSet.has(nodeId);
  const isActive = activeId === nodeId;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: nodeId,
    disabled: !onMoveNote,
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  const rowContent = (
    <TreeNodeRow
      node={node}
      nodeId={nodeId}
      depth={depth}
      hasChildren={hasChildren}
      isExpanded={isExpanded}
      isActive={isActive}
      toggleExpand={toggleExpand}
      onCreateChild={onCreateChild}
      onDeletePage={onDeletePage}
      isDeleting={isDeleting}
      navigate={navigate}
      dragHandleProps={onMoveNote ? { ...attributes, ...listeners } : undefined}
      rowRef={onMoveNote ? setNodeRef : undefined}
      rowStyle={style}
    />
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {onMoveNote && (
        <DropZone id={`before-${nodeId}`} variant="between" />
      )}
      {onMoveNote ? (
        <DropZone id={`onto-${nodeId}`}>{rowContent}</DropZone>
      ) : (
        rowContent
      )}
      {hasChildren && isExpanded && (
        <div>
          {children.map((cid) => (
            <TreeNode
              key={cid}
              nodeId={cid}
              depth={depth + 1}
              byId={byId}
              childrenByParent={childrenByParent}
              expandedSet={expandedSet}
              toggleExpand={toggleExpand}
              onCreateChild={onCreateChild}
              onDeletePage={onDeletePage}
              onMoveNote={onMoveNote}
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
