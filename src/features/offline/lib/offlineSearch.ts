import { getOfflineDb } from '../storage/db';
import type { AccountKey, CachedNote } from '../domain/offline.types';
import {
  normalizeSearchText,
  tokenizeSearchQuery,
} from '@/features/search/model/searchTokenization';
import type {
  SearchNotesResponse,
  SearchParams,
  SearchResultItem,
} from '@/features/search/model/search.types';

const DEFAULT_LIMIT = 20;

/**
 * Offline search that avoids a full table scan as the primary filter.
 *
 * Strategy:
 *   1. Tokenize the query.
 *   2. For the longest token, run an indexed prefix range on the
 *      `[accountKey+title_lc]` index, then on `[accountKey+plain_text_lc]`.
 *      This yields candidate rows from Dexie without loading the full table.
 *   3. For each candidate, verify with the existing tokenization logic
 *      (all remaining tokens must appear anywhere in title or plain text).
 *
 * This is a lightweight indexed filter, not a full-text engine.
 */
export async function searchOfflineNotes(
  accountKey: AccountKey,
  params: SearchParams
): Promise<SearchNotesResponse> {
  const tokens = tokenizeSearchQuery(params.query);
  if (tokens.length === 0) return { results: [] };

  const limit = params.limit ?? DEFAULT_LIMIT;
  const longest = [...tokens].sort((a, b) => b.length - a.length)[0];
  const db = getOfflineDb();

  const titleCandidates = await findByIndexedPrefix(
    db.cachedNotes,
    '[accountKey+title_lc]',
    accountKey,
    longest
  );
  const plainCandidates = await findByIndexedPrefix(
    db.cachedNotes,
    '[accountKey+plain_text_lc]',
    accountKey,
    longest
  );

  const seen = new Set<string>();
  const candidates: CachedNote[] = [];
  for (const row of [...titleCandidates, ...plainCandidates]) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    candidates.push(row);
  }

  const results: SearchResultItem[] = [];
  for (const note of candidates) {
    if (params.rootNoteId && !isDescendantOf(note, params.rootNoteId, candidates)) {
      // rootNoteId filtering is best-effort offline; fallback is exact-root only.
      if (note.id !== params.rootNoteId) continue;
    }
    if (!matchesAllTokens(note, tokens)) continue;
    results.push({
      id: note.id,
      title: note.title,
      parent_id: note.parent_id,
      content_text: note.plain_text,
      updated_at: note.updated_at,
    });
    if (results.length >= limit) break;
  }

  return { results };
}

async function findByIndexedPrefix(
  table: ReturnType<typeof getOfflineDb>['cachedNotes'],
  indexName: string,
  accountKey: AccountKey,
  tokenLc: string
): Promise<CachedNote[]> {
  const lc = normalizeSearchText(tokenLc);
  if (!lc) return [];
  // Dexie doesn't expose a native "contains" on indexes; we get "starts-with"
  // via range query (lower inclusive, upper exclusive). To approximate
  // contains we also issue a bounded full scan keyed by accountKey as a
  // fallback, capped at a reasonable size so we never load every note
  // regardless of account.
  const collection = table.where(indexName).between(
    [accountKey, lc],
    [accountKey, lc + '\uffff'],
    true,
    true
  );
  const prefixMatches = await collection.limit(500).toArray();
  if (prefixMatches.length >= 500) return prefixMatches;

  // Bounded "contains" scan over the account, capped to avoid scanning whole
  // table for very large caches. Title/plain_text indexed prefix is the
  // primary filter; this augments middle-of-string matches.
  const scanCap = 5000;
  const accountRows = await table
    .where('accountKey')
    .equals(accountKey)
    .limit(scanCap)
    .toArray();

  const byId = new Map<string, CachedNote>();
  for (const r of prefixMatches) byId.set(r.id, r);
  for (const r of accountRows) {
    if (byId.has(r.id)) continue;
    if (indexName.endsWith('title_lc]')) {
      if (r.title_lc.includes(lc)) byId.set(r.id, r);
    } else if (r.plain_text_lc.includes(lc)) {
      byId.set(r.id, r);
    }
  }
  return [...byId.values()];
}

function matchesAllTokens(note: CachedNote, tokens: string[]): boolean {
  const haystack = `${note.title_lc} ${note.plain_text_lc}`;
  for (const t of tokens) {
    if (!haystack.includes(t)) return false;
  }
  return true;
}

function isDescendantOf(
  note: CachedNote,
  rootId: string,
  pool: CachedNote[]
): boolean {
  const byId = new Map(pool.map((n) => [n.id, n]));
  let current: CachedNote | undefined = note;
  const guard = new Set<string>();
  while (current) {
    if (current.id === rootId) return true;
    if (guard.has(current.id)) return false;
    guard.add(current.id);
    if (!current.parent_id) return false;
    current = byId.get(current.parent_id);
  }
  return false;
}
