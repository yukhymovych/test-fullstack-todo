import { Search } from 'lucide-react';

interface SearchTriggerProps {
  label: string;
  shortcut: string;
  onClick: () => void;
}

export function SearchTrigger({ label, shortcut, onClick }: SearchTriggerProps) {
  return (
    <button
      type="button"
      className="sidebar-search-trigger"
      onClick={onClick}
      aria-label={label}
    >
      <span className="sidebar-search-trigger__left">
        <Search className="sidebar-search-trigger__icon" size={14} />
        <span className="sidebar-search-trigger__label">{label}</span>
      </span>
      <span className="sidebar-search-trigger__shortcut">{shortcut}</span>
    </button>
  );
}
