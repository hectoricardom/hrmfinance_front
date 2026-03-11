/**
 * Offline Module Exports
 * Central export point for offline HBL scanning functionality
 */

// Database operations
export {
  openOfflineDb,
  closeOfflineDb,
  addPendingScan,
  getPendingScans,
  getPendingScansCount,
  markScanAsSynced,
  updateScanRetry,
  deletePendingScan,
  getSyncedScans,
  cacheHBL,
  getCachedHBL,
  addSyncLog,
  getSyncLog,
  clearOldSyncedScans,
  getDbStats,
  checkStoragePersistence,
  STORES,
  type PendingScan,
  type SyncedScan,
  type SyncLogEntry
} from './offlineDb';

// Sync service
export {
  initSyncService,
  syncPendingScans,
  forceSyncNow,
  retryScan,
  removePendingScan,
  cleanupSyncService,
  updatePendingCount,
  isOnline,
  isSyncing,
  syncProgress,
  lastSyncTime,
  pendingCount,
  getSyncStatus
} from './syncService';

// Offline-aware HBL service
export {
  initOfflineHblService,
  updateHBLStatusOffline,
  updateHBLStatusBulkOffline,
  getOfflineStatus,
  getPendingScansList,
  syncNow,
  hasPendingScans
} from './offlineHblService';

// UI Components
export { default as OfflineStatusBadge } from './OfflineStatusBadge';
export { default as PendingScansManager } from './PendingScansManager';

// Offline data service
export {
  cacheUserProfile,
  getCachedUserProfile,
  cacheAuthState,
  getCachedAuthState,
  clearCachedAuthState,
  isOnlineNow,
  downloadHBLsForOffline,
  downloadHBLsBySearch,
  getOfflineHBL,
  hasOfflineHBL,
  getCachedHBLCount,
  getAllCachedHBLs,
  clearCachedHBLs,
  cacheStatusList,
  getCachedStatusList,
  downloadProgress,
  isDownloading
} from './offlineDataService';

// Re-export status list for convenience
export { statusAllList, getStatusById, getStatusesByTag } from '../status/hblUpdateService';
