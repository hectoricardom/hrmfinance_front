/**
 * Sync Service for HBL Offline Scanner
 * Manages online/offline detection and syncs pending scans when online
 */

import { createSignal } from 'solid-js';
import {
  openOfflineDb,
  getPendingScans,
  markScanAsSynced,
  updateScanRetry,
  deletePendingScan,
  addSyncLog,
  PendingScan,
  checkStoragePersistence
} from './offlineDb';
import { inventoryApi } from '../../../services/apiAdapter';
import { HBLUpdateResult } from '../status/hblUpdateService';
import { devLog } from '../../../services/utils';

// Online/Offline status signals
const [isOnline, setIsOnline] = createSignal(navigator.onLine);
const [isSyncing, setIsSyncing] = createSignal(false);
const [syncProgress, setSyncProgress] = createSignal({ current: 0, total: 0 });
const [lastSyncTime, setLastSyncTime] = createSignal<Date | null>(null);
const [pendingCount, setPendingCount] = createSignal(0);

// Sync configuration
const MAX_RETRIES = 3;
const SYNC_INTERVAL_MS = 60000; // 60 seconds (increased to prevent too frequent syncs)
const RETRY_DELAY_MS = 2000; // 2 seconds between retries

let syncIntervalId: number | null = null;
let isInitialized = false;
let lastSyncAttempt = 0;
const MIN_SYNC_INTERVAL = 5000; // Minimum 5 seconds between sync attempts

/**
 * Initialize the sync service
 * Sets up online/offline listeners and starts background sync
 */
export const initSyncService = async (): Promise<void> => {
  if (isInitialized) return;

  try {
    devLog('🚀 Initializing sync service...');

    // Check storage persistence first
    const storageInfo = await checkStoragePersistence();
    devLog('📦 Storage info:', storageInfo);

    // Open database
    await openOfflineDb();

    // Set up online/offline listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Update initial online status
    setIsOnline(navigator.onLine);

    // Update pending count
    const count = await updatePendingCount();
    devLog('📊 Initial pending count after init:', count);

    // Start background sync if online
    if (navigator.onLine) {
      startBackgroundSync();
    }

    isInitialized = true;
    devLog('✅ Sync service initialized. Online:', navigator.onLine);
  } catch (error) {
    devLog('❌ Failed to initialize sync service:', error);
  }
};

/**
 * Handle coming online
 */
const handleOnline = async () => {
  devLog('Network: Online');
  setIsOnline(true);
  await addSyncLog('sync_started', 'Device came online');

  // Don't sync immediately - let user trigger manually or wait for interval
  // This prevents losing pending scans before user can review them

  // Start background sync interval
  startBackgroundSync();
};

/**
 * Handle going offline
 */
const handleOffline = () => {
  devLog('Network: Offline');
  setIsOnline(false);
  stopBackgroundSync();
};

/**
 * Start background sync interval
 */
const startBackgroundSync = () => {
  if (syncIntervalId) return;

  syncIntervalId = window.setInterval(async () => {
    if (isOnline() && !isSyncing()) {
      await syncPendingScans();
    }
  }, SYNC_INTERVAL_MS);

  devLog('Background sync started');
};

/**
 * Stop background sync interval
 */
const stopBackgroundSync = () => {
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
    devLog('Background sync stopped');
  }
};

/**
 * Update pending scans count
 */
export const updatePendingCount = async () => {
  try {
    const pending = await getPendingScans();
    setPendingCount(pending.length);
    devLog('📊 Updated pending count:', pending.length);
    return pending.length;
  } catch (error) {
    devLog('Failed to update pending count:', error);
    return 0;
  }
};

/**
 * Sync all pending scans to the server in bulk
 */
export const syncPendingScans = async (): Promise<{
  synced: number;
  failed: number;
  remaining: number;
}> => {
  const now = Date.now();
  devLog('🔄 syncPendingScans called - isSyncing:', isSyncing(), 'isOnline:', isOnline());

  // Debounce: prevent too frequent sync attempts
  if (now - lastSyncAttempt < MIN_SYNC_INTERVAL) {
    devLog('⏭️ Skipping sync - too soon since last attempt');
    return { synced: 0, failed: 0, remaining: pendingCount() };
  }

  if (isSyncing() || !isOnline()) {
    devLog('⏭️ Skipping sync - already syncing or offline');
    return { synced: 0, failed: 0, remaining: pendingCount() };
  }

  lastSyncAttempt = now;
  setIsSyncing(true);

  try {
    const pendingScans = await getPendingScans();
    devLog('📋 Found pending scans to sync:', pendingScans.length);

    if (pendingScans.length === 0) {
      setIsSyncing(false);
      return { synced: 0, failed: 0, remaining: 0 };
    }

    await addSyncLog('sync_started', `Starting bulk sync of ${pendingScans.length} pending scans`, pendingScans.length);

    setSyncProgress({ current: 0, total: pendingScans.length });

    // Format all scans for bulk API call
    const hblList = pendingScans.map(scan => ({
      hbl: scan.hbl,
      status: scan.statusId,
      userId: scan.scannedBy,
      userName: scan.scannedBy,
      timeStamp: scan.scannedAt ? new Date(scan.scannedAt).getTime() : Date.now()
    }));

    devLog('📤 Sending bulk to API:', hblList.length, 'items');

    try {
      const result = await inventoryApi.upsertMultiScannedLocations({ list: hblList });
      devLog('📥 Bulk API response:', result);
      devLog({result})
      // Check if the API call was successful
      if (result && (result.success)) {
        // Mark all scans as synced
        for (const scan of pendingScans) {
          await markScanAsSynced(scan.id, result);
        }

        setSyncProgress({ current: pendingScans.length, total: pendingScans.length });
        setLastSyncTime(new Date());
        await updatePendingCount();

        await addSyncLog(
          'sync_completed',
          `Bulk sync completed: ${pendingScans.length} synced`,
          pendingScans.length
        );

        return { synced: pendingScans.length, failed: 0, remaining: 0 };
      } else {
        // API returned error - mark all as failed
        const errorMsg = result?.error || result?.message || 'Unknown error from server';
        devLog('❌ Bulk sync failed:', errorMsg);

        for (const scan of pendingScans) {
          await handleSyncFailure(scan, errorMsg);
        }

        await addSyncLog('sync_failed', `Bulk sync failed: ${errorMsg}`);
        return { synced: 0, failed: pendingScans.length, remaining: pendingScans.length };
      }
    } catch (error: any) {
      devLog('❌ Bulk sync error:', error);

      // Mark all as failed
      for (const scan of pendingScans) {
        await handleSyncFailure(scan, error.message || 'Network error');
      }

      await addSyncLog('sync_failed', `Bulk sync error: ${error.message || 'Network error'}`);
      return { synced: 0, failed: pendingScans.length, remaining: pendingScans.length };
    }
  } catch (error) {
    devLog('Sync error:', error);
    await addSyncLog('sync_failed', `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { synced: 0, failed: 0, remaining: pendingCount() };
  } finally {
    setIsSyncing(false);
    setSyncProgress({ current: 0, total: 0 });
    await updatePendingCount();
  }
};

/**
 * Sync a single scan to the server
 * Uses inventoryApi.upsertMultiScannedLocations with the correct format:
 * { hbl, status, userId, userName, timeStamp }
 */
const syncSingleScan = async (scan: PendingScan): Promise<HBLUpdateResult> => {
  try {
    // Format data for the API
    const hblList = [{
      hbl: scan.hbl,
      status: scan.statusId,
      userId: scan.scannedBy, // scannedBy contains the user identifier
      userName: scan.scannedBy,
      timeStamp: scan.scannedAt ? new Date(scan.scannedAt).getTime() : Date.now()
    }];

    devLog('📤 Sending to API:', hblList);
    const result = await inventoryApi.upsertMultiScannedLocations({ list: hblList });
    devLog('📥 API response:', result);

    // Check if the API call was successful
    if (result && (result.success || result.data)) {
      return {
        hbl: scan.hbl,
        success: true,
        newStatus: scan.statusId,
        msg: 'Synced successfully'
      };
    }

    return {
      hbl: scan.hbl,
      success: false,
      error: result?.error || result?.message || 'Unknown error from server'
    };
  } catch (error: any) {
    devLog('❌ syncSingleScan error:', error);
    return {
      hbl: scan.hbl,
      success: false,
      error: error.message || 'Network error'
    };
  }
};

/**
 * Handle sync failure for a scan
 */
const handleSyncFailure = async (scan: PendingScan, error: string): Promise<void> => {
  if (scan.retryCount >= MAX_RETRIES) {
    // Max retries reached, keep in pending but log
    devLog(`Max retries reached for scan ${scan.id} (HBL: ${scan.hbl})`);
    await updateScanRetry(scan.id, `Max retries (${MAX_RETRIES}) reached: ${error}`);
  } else {
    await updateScanRetry(scan.id, error);
  }
};

/**
 * Force sync now (manual trigger)
 */
export const forceSyncNow = async (): Promise<{
  synced: number;
  failed: number;
  remaining: number;
}> => {
  if (!isOnline()) {
    return { synced: 0, failed: 0, remaining: pendingCount() };
  }

  return syncPendingScans();
};

/**
 * Retry a specific failed scan
 */
export const retryScan = async (scanId: string): Promise<boolean> => {
  if (!isOnline()) return false;

  try {
    const pendingScans = await getPendingScans();
    const scan = pendingScans.find(s => s.id === scanId);

    if (!scan) return false;

    const result = await syncSingleScan(scan);

    if (result.success) {
      await markScanAsSynced(scan.id, result);
      await updatePendingCount();
      return true;
    } else {
      await updateScanRetry(scan.id, result.error || 'Retry failed');
      return false;
    }
  } catch (error) {
    devLog('Retry error:', error);
    return false;
  }
};

/**
 * Delete a failed scan (give up syncing)
 */
export const removePendingScan = async (scanId: string): Promise<void> => {
  await deletePendingScan(scanId);
  await updatePendingCount();
};

/**
 * Utility: delay promise
 */
const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Clean up service (call on app unmount)
 */
export const cleanupSyncService = () => {
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
  stopBackgroundSync();
  isInitialized = false;
};

// Export reactive signals for UI use
export {
  isOnline,
  isSyncing,
  syncProgress,
  lastSyncTime,
  pendingCount
};

// Export for direct access
export const getSyncStatus = () => ({
  isOnline: isOnline(),
  isSyncing: isSyncing(),
  syncProgress: syncProgress(),
  lastSyncTime: lastSyncTime(),
  pendingCount: pendingCount()
});
