import type { NoteItem } from './treeUtils';

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
          <button
            type="button"
            onClick={() => hasChildren && toggleExpand(nodeId)}
            style={{
              width: '20px',
              height: '20px',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'none',
              border: 'none',
              cursor: hasChildren ? 'pointer' : 'default',
              color: '#9ca3af',
              fontSize: '12px',
            }}
          >
            {hasChildren ? (isExpanded ? '▼' : '▶') : ' '}
          </button>
          <button
            type="button"
            onClick={() => navigate(nodeId)}
            style={{
              flex: 1,
              textAlign: 'left',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: isActive ? '#fff' : '#d1d5db',
              fontSize: '14px',
              padding: '2px 4px',
              marginLeft: '2px',
            }}
          >
            {node.title || 'Untitled'}
          </button>
          <button
            type="button"
            onClick={() => onCreateChild(nodeId)}
            title="Add child page"
            style={{
              width: '20px',
              height: '20px',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#9ca3af',
              fontSize: '14px',
              opacity: 0.7,
            }}
          >
            +
          </button>
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
