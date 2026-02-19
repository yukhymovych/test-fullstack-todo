import { useCallback } from 'react';
import { useNotesTree } from '../../model/useNotesTree';
import { TreeNode } from './TreeNode';
import { DndContextWrapper } from './DndContextWrapper';
import { DropZone } from './DropZone';
import { Button } from '@/shared/ui';
import { UserInfo } from '@/app/components/UserInfo';
import './SidebarNotesTree.css';

export function SidebarNotesTree() {
  const {
    isLoading,
    error,
    byId,
    childrenByParent,
    rootIds,
    expanded,
    toggleExpand,
    handleCreateRoot,
    handleCreateChild,
    handleMoveNote,
    handleDeletePage,
    handleNavigate,
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

  if (isLoading) {
    return <div className="sidebar-loading">Loading...</div>;
  }

  if (error) {
    return <div className="sidebar-error">Error: {error.message}</div>;
  }

  return (
    <div className="sidebar-container">
      <div className="sidebar-user-info">
        <UserInfo />
      </div>
      <DndContextWrapper onDragEnd={handleDragEnd}>
        <Button
          variant="ghost-muted"
          fullWidth
          onClick={handleCreateRoot}
          disabled={createNote.isPending}
        >
          {createNote.isPending ? 'Creating...' : 'New page'}
        </Button>
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
              isDeleting={deleteNote.isPending}
              navigate={handleNavigate}
              activeId={activeId}
            />
          ))}
          <DropZone id="root-end" variant="between" className="sidebar-root-end" />
        </div>
      </DndContextWrapper>
    </div>
  );
}
