import type { NoteItem } from './treeUtils';
import { Button } from '@/shared/ui';

interface TreeNodeProps {
  nodeId: string;
  depth: number;
  byId: Map<string, NoteItem>;
  childrenByParent: Map<string | null, string[]>;
  expandedSet: Set<string>;
  toggleExpand: (id: string) => void;
  onCreateChild: (parentId: string) => void;
  navigate: (id: string) => void;
  activeId: string | undefined;
}

export function TreeNode({
  nodeId,
  depth,
  byId,
  childrenByParent,
  expandedSet,
  toggleExpand,
  onCreateChild,
  navigate,
  activeId,
}: TreeNodeProps) {
  const node = byId.get(nodeId);
  if (!node) return null;

  const children = childrenByParent.get(nodeId) ?? [];
  const hasChildren = children.length > 0;
  const isExpanded = expandedSet.has(nodeId);
  const isActive = activeId === nodeId;

  const paddingLeft = 12 + depth * 14;

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div
        className="notes-tree-row"
        style={{
          display: 'flex',
          alignItems: 'center',
          paddingLeft,
          paddingRight: '8px',
          paddingTop: '4px',
          paddingBottom: '4px',
          minHeight: '28px',
          backgroundColor: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
          borderRadius: '4px',
          cursor: 'default',
        }}
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
            {node.title || 'Untitled'}
          </Button>
          <Button
            variant="ghost"
            icon
            onClick={() => onCreateChild(nodeId)}
            title="Add child page"
            style={{ opacity: 0.7 }}
          >
            +
          </Button>
        </div>
      </div>
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
              navigate={navigate}
              activeId={activeId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
