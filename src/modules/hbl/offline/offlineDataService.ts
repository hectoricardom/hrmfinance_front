/**
 * Offline Data Service
 * Handles downloading and caching HBLs and user data for offline use
 */

import { createSignal } from 'solid-js';
import { openOfflineDb, cacheHBL, getCachedHBL, STORES, generateId } from './offlineDb';
import { inventoryApi } from '../../../services/apiAdapter';
import { authStore } from '../../../stores/authStore';
import { devLog } from '../../../services/utils';

// Download progress signals
const [downloadProgress, setDownloadProgress] = createSignal({ current: 0, total: 0, status: '' });
const [isDownloading, setIsDownloading] = createSignal(false);

// Cached user profile
interface CachedUserProfile {
  id: string;
  email: string;
  name: string;
  displayName: string;
  photoUrl?: string;
  allowedStatusLocations?: string[];
  cachedAt: Date;
}

// Full auth state for offline restoration
interface CachedAuthState {
  user: {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    emailVerified?: boolean;
  };
  profile: any;
  authMethod: 'firebase' | 'google-cloud' | 'magic-link' | null;
  cachedAt: Date;
  expiresAt: Date; // Auth cache expires after 7 days
}

/**
 * Cache current user profile for offline use
 */
export const cacheUserProfile = async (): Promise<void> => {
  const user = authStore.currentUser;
  if (!user) {
    devLog('No user logged in to cache');
    return;
  }

  try {
    const database = await openOfflineDb();

    // Store user profile in a dedicated store (using status_cache for now)
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORES.STATUS_CACHE, 'readwrite');
      const store = transaction.objectStore(STORES.STATUS_CACHE);

      const profile: CachedUserProfile = {
        id: user.id || user.uid || '',
        email: user.email || '',
        name: user.name || '',
        displayName: user.displayName || user.name || '',
        photoUrl: user.photoUrl,
        cachedAt: new Date()
      };

      const request = store.put({
        id: 'user_profile',
        data: profile,
        lastUpdated: new Date()
      });

      request.onsuccess = () => {
        devLog('User profile cached for offline use');
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    devLog('Failed to cache user profile:', error);
  }
};

/**
 * Get cached user profile
 */
export const getCachedUserProfile = async (): Promise<CachedUserProfile | null> => {
  try {
    const database = await openOfflineDb();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORES.STATUS_CACHE, 'readonly');
      const store = transaction.objectStore(STORES.STATUS_CACHE);
      const request = store.get('user_profile');

      request.onsuccess = () => {
        resolve(request.result?.data || null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    devLog('Failed to get cached user profile:', error);
    return null;
  }
};

/**
 * Cache full auth state for offline restoration
 * Called after successful login to save auth state
 */
export const cacheAuthState = async (user: any, profile: any, authMethod: string): Promise<void> => {
  if (!user) {
    devLog('No user to cache for offline auth');
    return;
  }

  try {
    const database = await openOfflineDb();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORES.STATUS_CACHE, 'readwrite');
      const store = transaction.objectStore(STORES.STATUS_CACHE);

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const authCache: CachedAuthState = {
        user: {
          uid: user.uid || user.id || '',
          email: user.email || null,
          displayName: user.displayName || user.name || null,
          photoURL: user.photoURL || user.photoUrl || null,
          emailVerified: user.emailVerified
        },
        profile: profile,
        authMethod: authMethod as any,
        cachedAt: now,
        expiresAt: expiresAt
      };

      const request = store.put({
        id: 'offline_auth_state',
        data: authCache,
        lastUpdated: now
      });

      request.onsuccess = () => {
        devLog('✅ Auth state cached for offline use (expires in 7 days)');
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    devLog('Failed to cache auth state:', error);
  }
};

/**
 * Get cached auth state for offline restoration
 * Returns null if cache doesn't exist or is expired
 */
export const getCachedAuthState = async (): Promise<CachedAuthState | null> => {
  try {
    const database = await openOfflineDb();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORES.STATUS_CACHE, 'readonly');
      const store = transaction.objectStore(STORES.STATUS_CACHE);
      const request = store.get('offline_auth_state');

      request.onsuccess = () => {
        const cached = request.result?.data as CachedAuthState;

        if (!cached) {
          resolve(null);
          return;
        }

        // Check if cache has expired
        const expiresAt = new Date(cached.expiresAt);
        if (expiresAt < new Date()) {
          devLog('⚠️ Offline auth cache expired');
          resolve(null);
          return;
        }

        devLog('✅ Found valid offline auth cache');
        resolve(cached);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    devLog('Failed to get cached auth state:', error);
    return null;
  }
};

/**
 * Clear cached auth state (call on logout)
 */
export const clearCachedAuthState = async (): Promise<void> => {
  try {
    const database = await openOfflineDb();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORES.STATUS_CACHE, 'readwrite');
      const store = transaction.objectStore(STORES.STATUS_CACHE);
      const request = store.delete('offline_auth_state');

      request.onsuccess = () => {
        devLog('🗑️ Offline auth cache cleared');
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    devLog('Failed to clear cached auth state:', error);
  }
};

/**
 * Check if we're currently online
 */
export const isOnlineNow = (): boolean => {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
};

/**
 * Download and cache HBLs for offline use
 * @param hblNumbers - Array of HBL numbers to download
 */
export const downloadHBLsForOffline = async (hblNumbers: string[]): Promise<{
  success: number;
  failed: number;
  errors: string[];
}> => {
  if (hblNumbers.length === 0) {
    return { success: 0, failed: 0, errors: [] };
  }

  setIsDownloading(true);
  setDownloadProgress({ current: 0, total: hblNumbers.length, status: 'Iniciando descarga...' });

  const errors: string[] = [];
  let success = 0;
  let failed = 0;

  try {
    // Process in batches of 10
    const batchSize = 10;
    for (let i = 0; i < hblNumbers.length; i += batchSize) {
      const batch = hblNumbers.slice(i, i + batchSize);
      setDownloadProgress({
        current: i,
        total: hblNumbers.length,
        status: `Descargando ${i + 1}-${Math.min(i + batchSize, hblNumbers.length)} de ${hblNumbers.length}...`
      });

      try {
        // Fetch HBLs from API
        const result = await inventoryApi.hblsByMultIds(batch, {});

        if (result && Array.isArray(result)) {
          // Cache each HBL
          for (const hbl of result) {
            try {
              await cacheHBL(hbl.hbl, hbl);
              success++;
            } catch (err) {
              failed++;
              errors.push(`Error caching ${hbl.hbl}`);
            }
          }
        } else {
          // Try fetching individually
          for (const hblNum of batch) {
            try {
              const hblResult = await inventoryApi.getHBLS(hblNum, {});
              if (hblResult && !hblResult.error) {
                const hblData = Object.values(hblResult)[0];
                if (hblData) {
                  await cacheHBL(hblNum, hblData);
                  success++;
                } else {
                  failed++;
                  errors.push(`HBL ${hblNum} not found`);
                }
              } else {
                failed++;
                errors.push(`Failed to fetch ${hblNum}`);
              }
            } catch (err) {
              failed++;
              errors.push(`Error fetching ${hblNum}`);
            }
          }
        }
      } catch (err) {
        // Batch failed, try individually
        for (const hblNum of batch) {
          failed++;
          errors.push(`Failed batch containing ${hblNum}`);
        }
      }

      // Update progress
      setDownloadProgress({
        current: Math.min(i + batchSize, hblNumbers.length),
        total: hblNumbers.length,
        status: `Procesados ${Math.min(i + batchSize, hblNumbers.length)} de ${hblNumbers.length}`
      });

      // Small delay between batches
      if (i + batchSize < hblNumbers.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    setDownloadProgress({
      current: hblNumbers.length,
      total: hblNumbers.length,
      status: `Completado: ${success} descargados, ${failed} fallidos`
    });

    return { success, failed, errors };
  } catch (error) {
    devLog('Download error:', error);
    return { success, failed, errors: [...errors, 'Download process error'] };
  } finally {
    setIsDownloading(false);
  }
};

/**
 * Download HBLs by search criteria for offline use
 * @param searchTerm - Search term to find HBLs
 * @param filters - Optional filters
 */
export const downloadHBLsBySearch = async (
  searchTerm: string,
  filters?: any
): Promise<{ success: number; failed: number }> => {
  setIsDownloading(true);
  setDownloadProgress({ current: 0, total: 0, status: 'Buscando HBLs...' });

  try {
    const result = await inventoryApi.getHBLS(searchTerm, filters || {});

    if (result?.error || !result) {
      return { success: 0, failed: 0 };
    }

    const hbls = Object.values(result);
    setDownloadProgress({ current: 0, total: hbls.length, status: `Encontrados ${hbls.length} HBLs...` });

    let success = 0;
    let failed = 0;

    for (let i = 0; i < hbls.length; i++) {
      const hbl: any = hbls[i];
      try {
        await cacheHBL(hbl.hbl, hbl);
        success++;
      } catch (err) {
        failed++;
      }

      setDownloadProgress({
        current: i + 1,
        total: hbls.length,
        status: `Guardando ${i + 1} de ${hbls.length}...`
      });
    }

    setDownloadProgress({
      current: hbls.length,
      total: hbls.length,
      status: `Completado: ${success} guardados`
    });

    return { success, failed };
  } catch (error) {
    devLog('Download error:', error);
    return { success: 0, failed: 0 };
  } finally {
    setIsDownloading(false);
  }
};

/**
 * Get cached HBL data for validation
 * @param hbl - HBL number to lookup
 */
export const getOfflineHBL = async (hbl: string): Promise<any | null> => {
  try {
    return await getCachedHBL(hbl);
  } catch (error) {
    devLog('Error getting cached HBL:', error);
    return null;
  }
};

/**
 * Check if HBL exists in offline cache
 * @param hbl - HBL number to check
 */
export const hasOfflineHBL = async (hbl: string): Promise<boolean> => {
  const cached = await getOfflineHBL(hbl);
  return cached !== null;
};

/**
 * Get count of cached HBLs
 */
export const getCachedHBLCount = async (): Promise<number> => {
  try {
    const database = await openOfflineDb();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORES.HBL_CACHE, 'readonly');
      const store = transaction.objectStore(STORES.HBL_CACHE);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    devLog('Error getting cached HBL count:', error);
    return 0;
  }
};

/**
 * Get all cached HBLs
 */
export const getAllCachedHBLs = async (): Promise<any[]> => {
  try {
    const database = await openOfflineDb();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORES.HBL_CACHE, 'readonly');
      const store = transaction.objectStore(STORES.HBL_CACHE);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result.map(item => ({
          hbl: item.hbl,
          data: item.data,
          lastUpdated: item.lastUpdated
        }));
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    devLog('Error getting all cached HBLs:', error);
    return [];
  }
};

/**
 * Clear all cached HBLs
 */
export const clearCachedHBLs = async (): Promise<void> => {
  try {
    const database = await openOfflineDb();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORES.HBL_CACHE, 'readwrite');
      const store = transaction.objectStore(STORES.HBL_CACHE);
      const request = store.clear();

      request.onsuccess = () => {
        devLog('Cleared all cached HBLs');
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    devLog('Error clearing cached HBLs:', error);
  }
};

/**
 * Cache status list for offline use
 */
export const cacheStatusList = async (statusList: any[]): Promise<void> => {
  try {
    const database = await openOfflineDb();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORES.STATUS_CACHE, 'readwrite');
      const store = transaction.objectStore(STORES.STATUS_CACHE);

      const request = store.put({
        id: 'status_list',
        data: statusList,
        lastUpdated: new Date()
      });

      request.onsuccess = () => {
        devLog('Status list cached for offline use');
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    devLog('Failed to cache status list:', error);
  }
};

/**
 * Get cached status list
 */
export const getCachedStatusList = async (): Promise<any[] | null> => {
  try {
    const database = await openOfflineDb();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORES.STATUS_CACHE, 'readonly');
      const store = transaction.objectStore(STORES.STATUS_CACHE);
      const request = store.get('status_list');

      request.onsuccess = () => {
        resolve(request.result?.data || null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    devLog('Failed to get cached status list:', error);
    return null;
  }
};

// Export signals
export {
  downloadProgress,
  isDownloading
};
