import type { AppMode } from '../domain/offline.types';

/**
 * Non-hook accessor for the current app mode. Populated by AppModeProvider.
 * Exposed so that non-React layers (HTTP client, data-layer facades) can
 * reliably assert read-only state without going through a React hook.
 */
let currentAppMode: AppMode = 'initializing';

export function setCurrentAppMode(mode: AppMode): void {
  currentAppMode = mode;
}

export function getCurrentAppMode(): AppMode {
  return currentAppMode;
}

export function isReadOnlyMode(): boolean {
  return (
    currentAppMode === 'offline_cached_readonly' ||
    currentAppMode === 'offline_no_cache' ||
    currentAppMode === 'offline_enabled_snapshot_missing'
  );
}

export function isOfflineMode(): boolean {
  // Treat the browser's own offline signal as authoritative. This avoids a
  // race where `AppModeProvider` has not yet propagated its resolved mode to
  // this ref when React Query fires the first fetch for a newly mounted
  // component.
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return true;
  }
  return isReadOnlyMode();
}
