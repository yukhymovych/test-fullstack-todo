import { Fragment, type ReactNode } from 'react';
import {
  findPhraseMatch,
  normalizeSearchText,
  tokenizeSearchQuery,
} from '../model/searchTokenization';

export function highlightMatch(text: string, query: string): ReactNode {
  const tokens = tokenizeSearchQuery(query).sort((a, b) => b.length - a.length);
  if (tokens.length === 0 || !text) {
    return text;
  }

  const normalizedText = normalizeSearchText(text);
  const occupied = new Array<boolean>(text.length).fill(false);
  const ranges: Array<{ start: number; end: number }> = [];

  const phraseMatch = findPhraseMatch(text, query);
  if (phraseMatch) {
    const phraseEnd = phraseMatch.index + phraseMatch.length;
    ranges.push({ start: phraseMatch.index, end: phraseEnd });
    for (let i = phraseMatch.index; i < phraseEnd; i++) {
      occupied[i] = true;
    }
  }

  for (const token of tokens) {
    if (!token) continue;
    let fromIndex = 0;
    while (fromIndex < normalizedText.length) {
      const start = normalizedText.indexOf(token, fromIndex);
      if (start < 0) break;
      const end = start + token.length;
      let overlaps = false;
      for (let i = start; i < end; i++) {
        if (occupied[i]) {
          overlaps = true;
          break;
        }
      }
      if (!overlaps) {
        ranges.push({ start, end });
        for (let i = start; i < end; i++) {
          occupied[i] = true;
        }
      }
      fromIndex = start + Math.max(token.length, 1);
    }
  }

  if (ranges.length === 0) {
    return text;
  }

  ranges.sort((a, b) => a.start - b.start);

  const parts: ReactNode[] = [];
  let cursor = 0;
  ranges.forEach((range, index) => {
    if (range.start > cursor) {
      parts.push(
        <Fragment key={`text-${cursor}-${range.start}`}>
          {text.slice(cursor, range.start)}
        </Fragment>
      );
    }
    parts.push(
      <mark key={`mark-${range.start}-${range.end}-${index}`} className="search-result__highlight">
        {text.slice(range.start, range.end)}
      </mark>
    );
    cursor = range.end;
  });
  if (cursor < text.length) {
    parts.push(<Fragment key={`text-${cursor}-end`}>{text.slice(cursor)}</Fragment>);
  }

  return parts;
}
