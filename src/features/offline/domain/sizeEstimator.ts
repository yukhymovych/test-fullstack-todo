/**
 * Lightweight byte-size estimator. Avoids `JSON.stringify` in hot paths.
 * Uses character counts of title + content_text as a fair approximation of
 * actual persisted byte cost. UTF-8 is assumed; for CJK content, the estimator
 * may under-report, so limit checks compare against conservative caps.
 */
export function estimateNoteBytes(input: {
  title: string;
  plainText: string;
}): number {
  const titleLen = input.title ? input.title.length : 0;
  const plainLen = input.plainText ? input.plainText.length : 0;
  // Rough factor accounts for rich_content overhead (BlockNote wrapping ~= 4x
  // plain text for typical notes). We don't need precision, only stable order
  // of magnitude for limit enforcement.
  return titleLen * 2 + plainLen * 4;
}

export function sumBytes(values: Iterable<number>): number {
  let total = 0;
  for (const v of values) total += v;
  return total;
}
