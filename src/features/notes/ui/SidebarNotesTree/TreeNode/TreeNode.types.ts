import type { NoteItem } from '../treeUtils';

export interface TreeNodeProps {
  nodeId: string;
  depth: number;
  byId: Map<string, NoteItem>;
  childrenByParent: Map<string | null, string[]>;
  expandedSet: Set<string>;
  toggleExpand: (id: string) => void;
  onCreateChild: (parentId: string) => void;
  onDeletePage: (pageId: string) => void;
  onMoveNote?: (noteId: string, newParentId: string | null, position: number) => void;
  isDeleting: boolean;
  navigate: (id: string) => void;
  activeId: string | undefined;
}
