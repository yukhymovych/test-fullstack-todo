export function normalizeSearchQuery(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenizeSearchQuery(query: string): string[] {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) return [];
  const parts = normalized.split(' ').filter(Boolean);
  return [...new Set(parts)];
}

export function normalizeSearchText(value: string): string {
  return value.toLowerCase().replace(/-/g, ' ');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function findPhraseMatch(
  value: string,
  query: string
): { index: number; length: number } | null {
  const tokens = tokenizeSearchQuery(query);
  if (tokens.length === 0) return null;

  const phrasePattern = tokens.map(escapeRegExp).join('[\\s-]+');
  const regex = new RegExp(phrasePattern, 'i');
  const match = regex.exec(value);
  if (!match || match.index < 0) return null;

  return {
    index: match.index,
    length: match[0].length,
  };
}

export function findBestTokenMatch(
  value: string,
  tokens: string[]
): { index: number; token: string } | null {
  const normalizedValue = normalizeSearchText(value);
  const orderedTokens = [...tokens].sort((a, b) => b.length - a.length);

  let bestIndex = -1;
  let bestToken = '';

  for (const token of orderedTokens) {
    if (!token) continue;
    const idx = normalizedValue.indexOf(token);
    if (idx < 0) continue;
    if (
      bestIndex < 0 ||
      idx < bestIndex ||
      (idx === bestIndex && token.length > bestToken.length)
    ) {
      bestIndex = idx;
      bestToken = token;
    }
  }

  if (bestIndex < 0 || !bestToken) {
    return null;
  }

  return { index: bestIndex, token: bestToken };
}
