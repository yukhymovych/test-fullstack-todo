/**
 * Pure helpers used to build per-page backup filenames.
 *
 * Rules:
 *  - Lowercased ASCII slug, only `[a-z0-9-_]` survive.
 *  - Runs of `-` collapsed; leading/trailing `-` trimmed.
 *  - Capped at MAX_TITLE_SLUG_LENGTH characters.
 *  - Falls back to `'untitled'` when the input produces an empty slug.
 *
 * Kept independent from React so it can be unit-tested without a DOM.
 */

const MAX_TITLE_SLUG_LENGTH = 60;
const FILENAME_PREFIX = 'rememo-backup';

export function sanitizeForFilename(rawTitle: string): string {
  const lowered = rawTitle.toLowerCase();
  const replaced = lowered.replace(/[^a-z0-9_-]+/g, '-');
  const collapsed = replaced.replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  const truncated = collapsed.slice(0, MAX_TITLE_SLUG_LENGTH);
  return truncated || 'untitled';
}

export function buildPageBackupFileName(
  scope: 'page' | 'subtree',
  title: string,
  now: Date = new Date()
): string {
  const stamp = now.toISOString().replace(/:/g, '-').slice(0, 19);
  const slug = sanitizeForFilename(title);
  return `${FILENAME_PREFIX}-${scope}-${slug}-${stamp}.json`;
}
