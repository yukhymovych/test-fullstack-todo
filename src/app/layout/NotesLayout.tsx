import { Outlet } from 'react-router-dom';
import { SidebarNotesTree } from '../../features/notes/ui/SidebarNotesTree/SidebarNotesTree';

export function NotesLayout() {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        overflow: 'hidden',
      }}
    >
      <aside
        style={{
          width: 280,
          minWidth: 280,
          height: '100%',
          overflowY: 'auto',
          backgroundColor: '#111',
          borderRight: '1px solid #222',
          flexShrink: 0,
        }}
      >
        <SidebarNotesTree />
      </aside>
      <main
        style={{
          flex: 1,
          overflow: 'auto',
          backgroundColor: '#1a1a1a',
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}
