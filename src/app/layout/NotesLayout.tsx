import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { SidebarNotesTree } from '../../features/notes/ui/SidebarNotesTree/SidebarNotesTree';
import './NotesLayout.css';

export function NotesLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const closeSidebar = () => setIsSidebarOpen(false);

  useEffect(() => {
    if (!isSidebarOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeSidebar();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSidebarOpen]);

  return (
    <div className="notes-layout">
      <button
        type="button"
        className="notes-layout__menu-button"
        aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        aria-expanded={isSidebarOpen}
        aria-controls="notes-sidebar"
        onClick={toggleSidebar}
      >
        {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      <aside
        id="notes-sidebar"
        className={`notes-layout__sidebar ${isSidebarOpen ? 'notes-layout__sidebar--open' : ''}`}
      >
        <SidebarNotesTree onNavigate={closeSidebar} />
      </aside>

      <button
        type="button"
        className={`notes-layout__backdrop ${isSidebarOpen ? 'notes-layout__backdrop--visible' : ''}`}
        aria-label="Close sidebar overlay"
        onClick={closeSidebar}
      />

      <main className="notes-layout__main">
        <Outlet />
      </main>
    </div>
  );
}
