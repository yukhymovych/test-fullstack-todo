import type { AccountKey } from '../domain/offline.types';
import { getLastActiveAccount } from '../storage/accountsRepo';

let currentAccountKey: AccountKey | null = null;

export function setCurrentAccountKey(key: AccountKey | null): void {
  currentAccountKey = key;
}

export function getCurrentAccountKey(): AccountKey | null {
  return currentAccountKey;
}

/**
 * Prefer the ref set by AppModeProvider; if unset (same tick as first offline
 * fetches), read last-active account from Dexie so list/detail queries do not
 * race the provider effect.
 */
export async function resolveAccountKey(): Promise<AccountKey | null> {
  const key = getCurrentAccountKey();
  if (key) return key;
  const last = await getLastActiveAccount();
  return last?.accountKey ?? null;
}
