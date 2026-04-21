import type { AccountKey } from '../domain/offline.types';

export function deriveAccountKey(userSub: string | null | undefined): AccountKey | null {
  if (!userSub) return null;
  return userSub;
}
