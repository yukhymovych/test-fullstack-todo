import { useEffect, useRef, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { SearchViewItem } from '../model/useSearchModal';
import { SearchInput } from './SearchInput';
import { SearchResultsList } from './SearchResultsList';
import './SearchModal.css';

interface SearchModalProps {
  isOpen: boolean;
  query: string;
  isFetching: boolean;
  isQueryEligible: boolean;
  results: SearchViewItem[];
  activeIndex: number;
  onQueryChange: (value: string) => void;
  onClose: () => void;
  onInputKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onHoverResult: (index: number) => void;
  onSelectResult: (noteId: string) => void;
}

export function SearchModal({
  isOpen,
  query,
  isFetching,
  isQueryEligible,
  results,
  activeIndex,
  onQueryChange,
  onClose,
  onInputKeyDown,
  onHoverResult,
  onSelectResult,
}: SearchModalProps) {
  const { t } = useTranslation('notes');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    inputRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="search-modal__overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <div className="search-modal" role="dialog" aria-modal="true">
        <SearchInput
          inputRef={inputRef}
          value={query}
          onChange={onQueryChange}
          onKeyDown={onInputKeyDown}
          placeholder={t('search.modalPlaceholder')}
        />
        <SearchResultsList
          query={query}
          isFetching={isFetching}
          isQueryEligible={isQueryEligible}
          results={results}
          activeIndex={activeIndex}
          emptyPrompt={t('search.emptyPrompt')}
          minQueryHint={t('search.minQueryHint')}
          loadingText={t('search.loading')}
          noResultsText={t('search.noResults')}
          onHoverResult={onHoverResult}
          onSelectResult={onSelectResult}
        />
      </div>
    </div>,
    document.body
  );
}
