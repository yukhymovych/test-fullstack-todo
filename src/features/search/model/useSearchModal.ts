import { useCallback, useEffect, useMemo, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearchNotesQuery } from './search.queries';
import { useNotesQuery } from '@/features/notes/model/useNotes';
import { buildNoteLookupMaps, getAncestorChain } from '@/features/notes/model/noteHierarchy';
import { notesRoutes } from '@/features/notes/lib/routes';
import type { SearchResultItem } from './search.types';
import {
  findBestTokenMatch,
  findPhraseMatch,
  tokenizeSearchQuery,
} from './searchTokenization';

export interface SearchViewItem extends SearchResultItem {
  breadcrumb: string;
  contentPreview: string;
}

interface UseSearchModalOptions {
  onSelect?: () => void;
}

function useDebouncedValue(value: string, delayMs: number): string {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedValue(value), delayMs);
    return () => window.clearTimeout(timeoutId);
  }, [value, delayMs]);

  return debouncedValue;
}

function buildContentPreview(
  contentText: string,
  query: string,
  tokens: string[]
): string {
  const text = contentText.trim();
  if (!text) return '';

  const phraseMatch = findPhraseMatch(text, query);
  const tokenMatch = findBestTokenMatch(text, tokens);
  const anchorIndex = phraseMatch?.index ?? tokenMatch?.index ?? -1;
  const anchorLength =
    phraseMatch?.length ?? (tokenMatch ? tokenMatch.token.length : 0);
  if (anchorIndex < 0 || anchorLength <= 0) return '';

  const start = Math.max(0, anchorIndex - 40);
  const end = Math.min(text.length, anchorIndex + anchorLength + 80);
  const chunk = text.slice(start, end).trim();

  if (!chunk) return '';
  const prefix = start > 0 ? '... ' : '';
  const suffix = end < text.length ? ' ...' : '';
  return `${prefix}${chunk}${suffix}`;
}

export function useSearchModal(options?: UseSearchModalOptions) {
  const navigate = useNavigate();
  const { data: notes } = useNotesQuery();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const trimmedQuery = query.trim();
  const debouncedQuery = useDebouncedValue(trimmedQuery, 250);
  const queryTokens = useMemo(() => tokenizeSearchQuery(debouncedQuery), [debouncedQuery]);

  const { data, isFetching } = useSearchNotesQuery(debouncedQuery);

  const { byId, titleById } = useMemo(
    () => buildNoteLookupMaps(notes ?? []),
    [notes]
  );

  const results = useMemo<SearchViewItem[]>(() => {
    const raw = data?.results ?? [];
    return raw.map((item) => {
      const ancestorIds = getAncestorChain(item.id, byId);
      const breadcrumb = ancestorIds
        .map((ancestorId) => titleById.get(ancestorId))
        .filter((title): title is string => !!title)
        .join(' > ');
      const contentMatched =
        !!findPhraseMatch(item.content_text, debouncedQuery) ||
        !!findBestTokenMatch(item.content_text, queryTokens);

      return {
        ...item,
        breadcrumb,
        contentPreview: contentMatched
          ? buildContentPreview(item.content_text, debouncedQuery, queryTokens)
          : '',
      };
    });
  }, [data?.results, byId, titleById, queryTokens, debouncedQuery]);

  const openModal = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setActiveIndex(0);
  }, []);

  const selectResult = useCallback(
    (noteId: string) => {
      navigate(notesRoutes.editor(noteId));
      options?.onSelect?.();
      closeModal();
    },
    [navigate, options, closeModal]
  );

  const onInputKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeModal();
        return;
      }

      if (results.length === 0) {
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((prev) => (prev + 1) % results.length);
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((prev) => (prev - 1 + results.length) % results.length);
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        const selected = results[activeIndex];
        if (!selected) return;
        selectResult(selected.id);
      }
    },
    [results, activeIndex, closeModal, selectResult]
  );

  useEffect(() => {
    if (!isOpen || results.length === 0) {
      return;
    }
    setActiveIndex(0);
  }, [debouncedQuery, results.length, isOpen]);

  useEffect(() => {
    const onGlobalKeyDown = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsOpen(true);
      }
    };

    window.addEventListener('keydown', onGlobalKeyDown);
    return () => window.removeEventListener('keydown', onGlobalKeyDown);
  }, []);

  return {
    isOpen,
    query,
    setQuery,
    isFetching,
    isQueryEligible: trimmedQuery.length >= 2,
    results,
    activeIndex,
    setActiveIndex,
    openModal,
    closeModal,
    onInputKeyDown,
    selectResult,
  };
}
