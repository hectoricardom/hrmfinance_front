/**
 * Offline-Aware HBL Service
 * Wraps the HBL update service to support offline scanning
 * Stores scans locally when offline and syncs when back online
 */

import { addPendingScan, getPendingScans, PendingScan, getDbStats } from './offlineDb';
import { isOnline, initSyncService, forceSyncNow, pendingCount, updatePendingCount } from './syncService';
import {
  
  getStatusById,
  HBLUpdateResult,
  BulkUpdateRequest,
  BulkUpdateResponse
} from '../status/hblUpdateService';
import { inventoryApi } from '../../../services/apiAdapter';
import { devLog } from '../../../services/utils';

// Track if offline service is initialized
let isServiceInitialized = false;

/**
 * Initialize the offline HBL service
 * Call this when the app starts
 */
export const initOfflineHblService = async (): Promise<void> => {
  if (isServiceInitialized) return;

  try {
    await initSyncService();
    isServiceInitialized = true;
    devLog('Offline HBL service initialized');
  } catch (error) {
    devLog('Failed to initialize offline HBL service:', error);
    // Service can still work in online-only mode
    isServiceInitialized = true;
  }
};



/**
 * 
 * @param hblList 
 *   let hblList = [{
          hbl,
          status: statusId,
          userId: scannedBy?.userId,
          userName: scannedBy?.email,
          timeStamp: (new Date()).getTime()
      }]
 * @returns 
 */

export const onlineUpdateHBLStatus = async (hblList: any) =>{

  
    
    const locationResult = await inventoryApi.upsertMultiScannedLocations({list: hblList});
    return locationResult

}



/**
 * Update HBL status with offline support
 * If online, updates immediately. If offline, stores for later sync.
 */
export const updateHBLStatusOffline = async (
  hbl: string,
  statusId: string,
  notes?: string,
  scannedBy?: any
): Promise<HBLUpdateResult & { offline?: boolean; pendingId?: string }> => {
  const status = getStatusById(statusId);

  // If online, try to update immediately
  if (false && isOnline()) {
    try {


    let hblList = [{
          hbl,
          status: statusId,
          userId: scannedBy?.userId,
          userName: scannedBy?.email,
          timeStamp: (new Date()).getTime()
      }]

      const result = await onlineUpdateHBLStatus(hblList);

      // If successful, return the result
      if (result?.success) {
        return result;
      }

      // If failed due to network, store offline
      if (isNetworkError(result.error)) {
        return await storeOfflineScan(hbl, statusId, status?.label || statusId, notes, scannedBy);
      }

      // Other errors, return as is
      return result;
    } catch (error) {
      // Network error, store offline
      if (isNetworkError(error)) {
        return await storeOfflineScan(hbl, statusId, status?.label || statusId, notes, scannedBy);
      }
      throw error;
    }
  }

  // Offline mode - store locally
  return await storeOfflineScan(hbl, statusId, status?.label || statusId, notes, scannedBy);
};

/**
 * Store a scan for offline sync
 */
const storeOfflineScan = async (
  hbl: string,
  statusId: string,
  statusLabel: string,
  notes?: string,
  scannedBy?: string
): Promise<HBLUpdateResult & { offline: boolean; pendingId: string }> => {
  try {
    devLog('📥 Storing offline scan:', { hbl, statusId, statusLabel });

    const pendingScan = await addPendingScan({
      hbl,
      statusId,
      statusLabel,
      notes,
      scannedBy,
      scannedAt: new Date()
    });

    devLog('✅ Scan stored with ID:', pendingScan.id);

    // Update the pending count signal to refresh UI
    await updatePendingCount();

    return {
      hbl,
      success: true,
      offline: true,
      pendingId: pendingScan.id,
      newStatus: statusId,
      msg: `Guardado offline - se sincronizará cuando haya conexión`
    };
  } catch (error) {
    devLog('❌ Error storing offline scan:', error);
    return {
      hbl,
      success: false,
      offline: true,
      pendingId: '',
      error: `Error guardando offline: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

/**
 * Check if an error is a network error
 */
const isNetworkError = (error: any): boolean => {
  if (!error) return false;

  const errorStr = typeof error === 'string' ? error : error.message || '';
  const networkErrorPatterns = [
    'network',
    'fetch',
    'timeout',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
    'offline',
    'Failed to fetch',
    'NetworkError',
    'ERR_NETWORK',
    'ERR_INTERNET_DISCONNECTED'
  ];

  return networkErrorPatterns.some(pattern =>
    errorStr.toLowerCase().includes(pattern.toLowerCase())
  );
};

/**
 * Bulk update with offline support
 */
export const updateHBLStatusBulkOffline = async (
  request: BulkUpdateRequest
): Promise<BulkUpdateResponse & { offlineCount?: number }> => {
  const status = getStatusById(request.statusId);
  const statusLabel = status?.label || request.statusId;

  // Format scannedBy string
  const scannedByString = request.scannedBy
    ? `${request.scannedBy.name}${request.scannedBy.email ? ` (${request.scannedBy.email})` : ''}`
    : undefined;

  const results: (HBLUpdateResult & { offline?: boolean })[] = [];
  let totalSuccess = 0;
  let totalFailed = 0;
  let offlineCount = 0;

  for (const hbl of request.hbls) {
    const result = await updateHBLStatusOffline(
      hbl,
      request.statusId,
      request.notes,
      request.scannedBy
    );

    results.push(result);

    if (result.success) {
      totalSuccess++;
      if (result.offline) {
        offlineCount++;
      }
    } else {
      totalFailed++;
    }
  }

  return {
    success: totalFailed === 0,
    results,
    totalProcessed: request.hbls.length,
    totalSuccess,
    totalFailed,
    offlineCount
  };
};

/**
 * Get offline status information
 */
export const getOfflineStatus = async () => {
  try {
    const stats = await getDbStats();
    return {
      isOnline: isOnline(),
      pendingScans: stats.pendingCount,
      syncedScans: stats.syncedCount,
      cachedHBLs: stats.cachedHBLCount
    };
  } catch (error) {
    return {
      isOnline: isOnline(),
      pendingScans: 0,
      syncedScans: 0,
      cachedHBLs: 0
    };
  }
};

/**
 * Get list of pending scans
 */
export const getPendingScansList = async (): Promise<PendingScan[]> => {
  return getPendingScans();
};

/**
 * Force sync all pending scans
 */
export const syncNow = async () => {
  return forceSyncNow();
};

/**
 * Check if there are pending scans
 */
export const hasPendingScans = (): boolean => {
  return pendingCount() > 0;
};

/**
 * Re-export useful items from other modules
 */
export { isOnline, pendingCount } from './syncService';
export { statusAllList, getStatusById, getStatusesByTag } from '../status/hblUpdateService';
