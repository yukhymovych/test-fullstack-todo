export const DEFAULT_BLOCKS = [{ type: 'paragraph', content: [] }];

export function ensureBlocksArray(value: unknown): unknown[] {
  let v = value;

  if (typeof v === 'string') {
    try {
      v = JSON.parse(v);
    } catch {
      return DEFAULT_BLOCKS;
    }
  }

  if (Array.isArray(v) && v.length > 0) {
    return v;
  }

  return DEFAULT_BLOCKS;
}
