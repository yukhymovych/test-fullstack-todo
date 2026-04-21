import type { AccountKey } from '../domain/offline.types';

let currentAccountKey: AccountKey | null = null;

export function setCurrentAccountKey(key: AccountKey | null): void {
  currentAccountKey = key;
}

export function getCurrentAccountKey(): AccountKey | null {
  return currentAccountKey;
}
