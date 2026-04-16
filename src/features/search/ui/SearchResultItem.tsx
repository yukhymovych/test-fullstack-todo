import { highlightMatch } from './highlightMatch';

interface SearchResultItemProps {
  title: string;
  breadcrumb: string;
  contentPreview: string;
  query: string;
  isActive: boolean;
  onMouseEnter: () => void;
  onClick: () => void;
}

export function SearchResultItem({
  title,
  breadcrumb,
  contentPreview,
  query,
  isActive,
  onMouseEnter,
  onClick,
}: SearchResultItemProps) {
  return (
    <button
      type="button"
      className={`search-result ${isActive ? 'search-result--active' : ''}`}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
    >
      <span className="search-result__title">{highlightMatch(title, query)}</span>
      {breadcrumb ? <span className="search-result__breadcrumb">{breadcrumb}</span> : null}
      {contentPreview ? (
        <span className="search-result__content">{highlightMatch(contentPreview, query)}</span>
      ) : null}
    </button>
  );
}
