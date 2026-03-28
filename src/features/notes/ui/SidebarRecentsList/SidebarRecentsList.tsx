import { Clock } from 'lucide-react';
import { RiArrowDownSLine } from 'react-icons/ri';
import { Button } from '@/shared/ui';
import type { NoteListItem } from '../../model/types';
import './SidebarRecentsList.css';

export interface SidebarRecentsListProps {
  recentIds: string[];
  byId: Map<string, NoteListItem>;
  recentFormattedTimes: Map<string, string>;
  isExpanded: boolean;
  onToggleExpand: () => void;
  navigate: (id: string) => void;
  activeId: string | undefined;
}

export function SidebarRecentsList({
  recentIds,
  byId,
  recentFormattedTimes,
  isExpanded,
  onToggleExpand,
  navigate,
  activeId,
}: SidebarRecentsListProps) {
  if (recentIds.length === 0) return null;

  return (
    <div className="sidebar-recents">
      <Button
        variant="ghost"
        fullWidth
        onClick={onToggleExpand}
        className="sidebar-recents__header"
      >
        <Clock className="sidebar-recents__clock size-4" />
        <span>Recently visited</span>
        <span
          className={`sidebar-recents__chevron ${!isExpanded ? 'sidebar-recents__chevron--collapsed' : ''}`}
          aria-hidden
        >
          <RiArrowDownSLine />
        </span>
      </Button>
      {isExpanded && (
        <div className="sidebar-recents__list">
          {recentIds.map((noteId) => {
            const note = byId.get(noteId);
            const formattedTime = recentFormattedTimes.get(noteId);
            if (!note) return null;
            return (
              <button
                key={noteId}
                type="button"
                className={`sidebar-recents__item ${
                  activeId === noteId ? 'sidebar-recents__item--active' : ''
                }`}
                onClick={() => navigate(noteId)}
              >
                <span className="sidebar-recents__title">
                  {note.title || 'Untitled'}
                </span>
                {formattedTime && (
                  <span className="sidebar-recents__time">{formattedTime}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
