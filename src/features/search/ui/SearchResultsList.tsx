import { Spinner } from '@/shared/ui';
import { SearchResultItem } from './SearchResultItem';
import type { SearchViewItem } from '../model/useSearchModal';

interface SearchResultsListProps {
  query: string;
  isFetching: boolean;
  isQueryEligible: boolean;
  results: SearchViewItem[];
  activeIndex: number;
  emptyPrompt: string;
  minQueryHint: string;
  loadingAriaLabel: string;
  noResultsText: string;
  onHoverResult: (index: number) => void;
  onSelectResult: (noteId: string) => void;
}

export function SearchResultsList({
  query,
  isFetching,
  isQueryEligible,
  results,
  activeIndex,
  emptyPrompt,
  minQueryHint,
  loadingAriaLabel,
  noResultsText,
  onHoverResult,
  onSelectResult,
}: SearchResultsListProps) {
  return (
    <div className="search-modal__results">
      {query.trim().length === 0 ? (
        <div className="search-modal__status">{emptyPrompt}</div>
      ) : !isQueryEligible ? (
        <div className="search-modal__status">{minQueryHint}</div>
      ) : isFetching ? (
        <div className="search-modal__status search-modal__status--busy">
          <Spinner size="sm" aria-label={loadingAriaLabel} />
        </div>
      ) : results.length === 0 ? (
        <div className="search-modal__status">{noResultsText}</div>
      ) : (
        results.map((result, index) => (
          <SearchResultItem
            key={result.id}
            title={result.title}
            breadcrumb={result.breadcrumb}
            contentPreview={result.contentPreview}
            query={query}
            isActive={index === activeIndex}
            onMouseEnter={() => onHoverResult(index)}
            onClick={() => onSelectResult(result.id)}
          />
        ))
      )}
    </div>
  );
}
