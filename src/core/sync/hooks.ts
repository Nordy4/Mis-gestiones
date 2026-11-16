import { useSyncExternalStore } from 'react';
import { getSyncStatus, subscribeSyncStatus, type SyncStatus } from './engine';

/** Estado de la sincronización (sesión, última sincronización, errores). */
export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(subscribeSyncStatus, getSyncStatus);
}
