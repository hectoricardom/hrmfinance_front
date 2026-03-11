/**
 * IndexedDB Offline Storage Service for HBL Scanner
 * Stores HBL scans locally when offline and syncs when back online
 */

import { devLog } from '../../../services/utils';

const DB_NAME = 'hbl_offline_db';
const DB_VERSION = 1;

/**
 * Check if storage is persistent (not ephemeral)
 * This helps diagnose if IndexedDB will persist across restarts
 */
export const checkStoragePersistence = async (): Promise<{ persistent: boolean; quota?: number; usage?: number }> => {
  try {
    // Check if storage persists (not available in all browsers)
    if (navigator.storage && navigator.storage.persisted) {
      const isPersistent = await navigator.storage.persisted();
      devLog('🔒 Storage persistence check:', isPersistent ? 'PERSISTENT' : 'EPHEMERAL');

      if (navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        devLog('💾 Storage quota:', estimate.quota, 'usage:', estimate.usage);
        return { persistent: isPersistent, quota: estimate.quota, usage: estimate.usage };
      }

      return { persistent: isPersistent };
    }

    devLog('⚠️ Storage persistence API not available');
    return { persistent: true }; // Assume persistent if API not available
  } catch (e) {
    devLog('Error checking storage persistence:', e);
    return { persistent: true };
  }
};

// Store names
export const STORES = {
  PENDING_SCANS: 'pending_scans',
  SYNCED_SCANS: 'synced_scans',
  STATUS_CACHE: 'status_cache',
  HBL_CACHE: 'hbl_cache',
  SYNC_LOG: 'sync_log'
} as const;

// Pending scan interface
export interface PendingScan {
  id: string;
  hbl: string;
  statusId: string;
  statusLabel: string;
  notes?: string;
  scannedBy?: string;
  scannedAt: Date;
  retryCount: number;
  lastError?: string;
  synced: boolean;
}

// Synced scan interface
export interface SyncedScan extends PendingScan {
  syncedAt: Date;
  serverResponse?: any;
}

// Sync log entry
export interface SyncLogEntry {
  id: string;
  timestamp: Date;
  action: 'sync_started' | 'sync_completed' | 'sync_failed' | 'scan_added' | 'scan_synced';
  details: string;
  count?: number;
}

let db: IDBDatabase | null = null;

/**
 * Open or create the IndexedDB database
 */
export const openOfflineDb = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      devLog('🗄️ Using existing database connection');
      resolve(db);
      return;
    }

    devLog('🗄️ Opening IndexedDB:', DB_NAME, 'version:', DB_VERSION);
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      devLog('❌ Failed to open offline database:', request.error);
      reject(request.error);
    };

    request.onsuccess = async () => {
      db = request.result;
      devLog('✅ Offline database opened successfully. Stores:', Array.from(db.objectStoreNames));

      // Check pending scans count immediately after opening
      try {
        const transaction = db.transaction(STORES.PENDING_SCANS, 'readonly');
        const store = transaction.objectStore(STORES.PENDING_SCANS);
        const countRequest = store.count();
        countRequest.onsuccess = () => {
          devLog('🔢 Pending scans count on DB open:', countRequest.result);
        };
      } catch (e) {
        devLog('Could not count pending scans on open:', e);
      }

      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Pending scans store - scans waiting to be synced
      if (!database.objectStoreNames.contains(STORES.PENDING_SCANS)) {
        const pendingStore = database.createObjectStore(STORES.PENDING_SCANS, { keyPath: 'id' });
        pendingStore.createIndex('hbl', 'hbl', { unique: false });
        pendingStore.createIndex('scannedAt', 'scannedAt', { unique: false });
        pendingStore.createIndex('synced', 'synced', { unique: false });
      }

      // Synced scans store - successfully synced scans for history
      if (!database.objectStoreNames.contains(STORES.SYNCED_SCANS)) {
        const syncedStore = database.createObjectStore(STORES.SYNCED_SCANS, { keyPath: 'id' });
        syncedStore.createIndex('hbl', 'hbl', { unique: false });
        syncedStore.createIndex('syncedAt', 'syncedAt', { unique: false });
      }

      // Status cache - cache status list for offline use
      if (!database.objectStoreNames.contains(STORES.STATUS_CACHE)) {
        database.createObjectStore(STORES.STATUS_CACHE, { keyPath: 'id' });
      }

      // HBL cache - cache HBL data for offline lookup
      if (!database.objectStoreNames.contains(STORES.HBL_CACHE)) {
        const hblStore = database.createObjectStore(STORES.HBL_CACHE, { keyPath: 'hbl' });
        hblStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
      }

      // Sync log - track sync operations
      if (!database.objectStoreNames.contains(STORES.SYNC_LOG)) {
        const logStore = database.createObjectStore(STORES.SYNC_LOG, { keyPath: 'id' });
        logStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      devLog('Offline database schema created/upgraded');
    };
  });
};

/**
 * Close the database connection
 */
export const closeOfflineDb = () => {
  if (db) {
    db.close();
    db = null;
  }
};

/**
 * Generate a unique ID for records
 */
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Add a pending scan to the offline database
 */
export const addPendingScan = async (scan: Omit<PendingScan, 'id' | 'retryCount' | 'synced'>): Promise<PendingScan> => {
  devLog('💾 addPendingScan called with:', scan);
  const database = await openOfflineDb();

  const pendingScan: PendingScan = {
    ...scan,
    id: generateId(),
    retryCount: 0,
    synced: false
  };

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.PENDING_SCANS, STORES.SYNC_LOG], 'readwrite');
    const store = transaction.objectStore(STORES.PENDING_SCANS);
    const logStore = transaction.objectStore(STORES.SYNC_LOG);

    const request = store.add(pendingScan);

    request.onsuccess = () => {
      devLog('✅ addPendingScan SUCCESS - ID:', pendingScan.id, 'HBL:', pendingScan.hbl);
      // Add log entry
      logStore.add({
        id: generateId(),
        timestamp: new Date(),
        action: 'scan_added',
        details: `Added scan for HBL ${scan.hbl} with status ${scan.statusId}`
      });
      resolve(pendingScan);
    };

    request.onerror = () => {
      devLog('❌ addPendingScan ERROR:', request.error);
      reject(request.error);
    };

    transaction.oncomplete = () => {
      devLog('✅ addPendingScan TRANSACTION COMPLETE');
    };

    transaction.onerror = () => {
      devLog('❌ addPendingScan TRANSACTION ERROR:', transaction.error);
    };
  });
};

/**
 * Get all pending (unsynced) scans
 * Note: All records in pending_scans store are unsynced by design
 * (synced scans are moved to synced_scans store)
 */
export const getPendingScans = async (): Promise<PendingScan[]> => {
  devLog('📋 getPendingScans called');
  const database = await openOfflineDb();
  devLog('📋 Database connection obtained for getPendingScans');

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.PENDING_SCANS, 'readonly');
    const store = transaction.objectStore(STORES.PENDING_SCANS);
    // Get all records - they are all pending by design
    const request = store.getAll();

    request.onsuccess = () => {
      const allRecords = request.result || [];
      // Filter to ensure we only return unsynced ones (safety check)
      const results = allRecords.filter((scan: PendingScan) => !scan.synced);
      devLog('📋 getPendingScans: total records:', allRecords.length, 'unsynced:', results.length);
      if (allRecords.length > 0) {
        devLog('📋 First record sample:', JSON.stringify(allRecords[0]));
      }
      resolve(results);
    };

    request.onerror = () => {
      devLog('❌ getPendingScans error:', request.error);
      reject(request.error);
    };
  });
};

/**
 * Get pending scans count
 */
export const getPendingScansCount = async (): Promise<number> => {
  const scans = await getPendingScans();
  return scans.length;
};

/**
 * Mark a scan as synced
 */
export const markScanAsSynced = async (scanId: string, serverResponse?: any): Promise<void> => {
  const database = await openOfflineDb();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.PENDING_SCANS, STORES.SYNCED_SCANS, STORES.SYNC_LOG], 'readwrite');
    const pendingStore = transaction.objectStore(STORES.PENDING_SCANS);
    const syncedStore = transaction.objectStore(STORES.SYNCED_SCANS);
    const logStore = transaction.objectStore(STORES.SYNC_LOG);

    const getRequest = pendingStore.get(scanId);

    getRequest.onsuccess = () => {
      const scan = getRequest.result as PendingScan;
      if (!scan) {
        reject(new Error(`Scan ${scanId} not found`));
        return;
      }

      // Create synced scan record
      const syncedScan: SyncedScan = {
        ...scan,
        synced: true,
        syncedAt: new Date(),
        serverResponse
      };

      // Add to synced store
      syncedStore.add(syncedScan);

      // Remove from pending store
      pendingStore.delete(scanId);

      // Add log entry
      logStore.add({
        id: generateId(),
        timestamp: new Date(),
        action: 'scan_synced',
        details: `Synced scan for HBL ${scan.hbl}`
      });

      resolve();
    };

    getRequest.onerror = () => {
      reject(getRequest.error);
    };
  });
};

/**
 * Update scan retry count and error
 */
export const updateScanRetry = async (scanId: string, error: string): Promise<void> => {
  const database = await openOfflineDb();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.PENDING_SCANS, 'readwrite');
    const store = transaction.objectStore(STORES.PENDING_SCANS);

    const getRequest = store.get(scanId);

    getRequest.onsuccess = () => {
      const scan = getRequest.result as PendingScan;
      if (!scan) {
        reject(new Error(`Scan ${scanId} not found`));
        return;
      }

      scan.retryCount += 1;
      scan.lastError = error;

      const updateRequest = store.put(scan);

      updateRequest.onsuccess = () => resolve();
      updateRequest.onerror = () => reject(updateRequest.error);
    };

    getRequest.onerror = () => {
      reject(getRequest.error);
    };
  });
};

/**
 * Delete a pending scan
 */
export const deletePendingScan = async (scanId: string): Promise<void> => {
  const database = await openOfflineDb();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.PENDING_SCANS, 'readwrite');
    const store = transaction.objectStore(STORES.PENDING_SCANS);
    const request = store.delete(scanId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

/**
 * Get synced scans history
 */
export const getSyncedScans = async (limit: number = 100): Promise<SyncedScan[]> => {
  const database = await openOfflineDb();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.SYNCED_SCANS, 'readonly');
    const store = transaction.objectStore(STORES.SYNCED_SCANS);
    const index = store.index('syncedAt');
    const scans: SyncedScan[] = [];

    const request = index.openCursor(null, 'prev');

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor && scans.length < limit) {
        scans.push(cursor.value);
        cursor.continue();
      } else {
        resolve(scans);
      }
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
};

/**
 * Cache HBL data for offline lookup
 */
export const cacheHBL = async (hbl: string, data: any): Promise<void> => {
  const database = await openOfflineDb();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.HBL_CACHE, 'readwrite');
    const store = transaction.objectStore(STORES.HBL_CACHE);
    const request = store.put({
      hbl,
      data,
      lastUpdated: new Date()
    });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

/**
 * Get cached HBL data
 */
export const getCachedHBL = async (hbl: string): Promise<any | null> => {
  const database = await openOfflineDb();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.HBL_CACHE, 'readonly');
    const store = transaction.objectStore(STORES.HBL_CACHE);
    const request = store.get(hbl);

    request.onsuccess = () => {
      resolve(request.result?.data || null);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
};

/**
 * Add sync log entry
 */
export const addSyncLog = async (
  action: SyncLogEntry['action'],
  details: string,
  count?: number
): Promise<void> => {
  const database = await openOfflineDb();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.SYNC_LOG, 'readwrite');
    const store = transaction.objectStore(STORES.SYNC_LOG);
    const request = store.add({
      id: generateId(),
      timestamp: new Date(),
      action,
      details,
      count
    });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

/**
 * Get sync log entries
 */
export const getSyncLog = async (limit: number = 50): Promise<SyncLogEntry[]> => {
  const database = await openOfflineDb();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.SYNC_LOG, 'readonly');
    const store = transaction.objectStore(STORES.SYNC_LOG);
    const index = store.index('timestamp');
    const entries: SyncLogEntry[] = [];

    const request = index.openCursor(null, 'prev');

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor && entries.length < limit) {
        entries.push(cursor.value);
        cursor.continue();
      } else {
        resolve(entries);
      }
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
};

/**
 * Clear old synced scans (keep only last N days)
 */
export const clearOldSyncedScans = async (daysToKeep: number = 30): Promise<number> => {
  const database = await openOfflineDb();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.SYNCED_SCANS, 'readwrite');
    const store = transaction.objectStore(STORES.SYNCED_SCANS);
    const index = store.index('syncedAt');
    let deletedCount = 0;

    const request = index.openCursor(IDBKeyRange.upperBound(cutoffDate));

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        cursor.delete();
        deletedCount++;
        cursor.continue();
      } else {
        resolve(deletedCount);
      }
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
};

/**
 * Get database statistics
 */
export const getDbStats = async (): Promise<{
  pendingCount: number;
  syncedCount: number;
  cachedHBLCount: number;
}> => {
  const database = await openOfflineDb();

  const getCount = (storeName: string): Promise<number> => {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  };

  const [pendingCount, syncedCount, cachedHBLCount] = await Promise.all([
    getCount(STORES.PENDING_SCANS),
    getCount(STORES.SYNCED_SCANS),
    getCount(STORES.HBL_CACHE)
  ]);

  return { pendingCount, syncedCount, cachedHBLCount };
};
