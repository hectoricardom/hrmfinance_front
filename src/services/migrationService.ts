/**
 * Migration Service
 * Migrates data from Firestore to the new custom API
 */

import { db } from './firebase';
import { collection, getDocs, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { businessApi, storesApi } from './apiAdapter';
import { authStore } from '../stores/authStore';

export interface MigrationResult {
  success: boolean;
  migrated: number;
  skipped: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
  details: Array<{ id: string; name: string; status: 'migrated' | 'skipped' | 'failed' }>;
}

export interface MigrationProgress {
  total: number;
  processed: number;
  currentItem: string;
  status: 'idle' | 'running' | 'completed' | 'error';
}

// Migration Service
export const migrationService = {
  /**
   * Migrate all businesses from Firestore to new API
   */
  async migrateBusinesses(
    onProgress?: (progress: MigrationProgress) => void
  ): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      migrated: 0,
      skipped: 0,
      failed: 0,
      errors: [],
      details: []
    };

    try {
      // Fetch all businesses from Firestore
      const businessesCollection = collection(db, 'businesses');
      const q = query(businessesCollection, orderBy('name'));
      const querySnapshot = await getDocs(q);

      const businesses: any[] = [];
      querySnapshot.forEach((doc) => {
        businesses.push({
          id: doc.id,
          ...doc.data()
        });
      });

      const total = businesses.length;
      let processed = 0;

      onProgress?.({
        total,
        processed: 0,
        currentItem: 'Starting migration...',
        status: 'running'
      });

      // Check existing businesses in API to avoid duplicates
      let existingBusinessIds: Set<string> = new Set();
      try {
        const existingBusinesses = await businessApi.getAllBusiness();
        existingBusinessIds = new Set(existingBusinesses.map((b: any) => b.id));
      } catch (err) {
        console.warn('Could not fetch existing businesses from API:', err);
      }

      // Migrate each business
      for (const business of businesses) {
        processed++;
        onProgress?.({
          total,
          processed,
          currentItem: business.name || business.id,
          status: 'running'
        });

        // Skip if already exists in API
        if (existingBusinessIds.has(business.id)) {
          result.skipped++;
          result.details.push({
            id: business.id,
            name: business.name,
            status: 'skipped'
          });
          continue;
        }

        try {
          // Prepare business data for API
          const businessData = {
            id: business.id,
            name: business.name,
            isActive: business.isActive !== false,
            type: business.type || null,
            industry: business.industry || null,
            country: business.country || null,
            address: business.address || null,
            phone: business.phone || null,
            email: business.email || null,
            website: business.website || null,
            taxId: business.taxId || null,
            logo: business.logo || null,
            createdAt: business.createdAt?.toDate?.()?.toISOString() || business.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            migratedFromFirestore: true,
            migratedAt: new Date().toISOString()
          };

          await businessApi.addBusiness(businessData);
          result.migrated++;
          result.details.push({
            id: business.id,
            name: business.name,
            status: 'migrated'
          });
        } catch (error: any) {
          result.failed++;
          result.success = false;
          result.errors.push({
            id: business.id,
            error: error.message || 'Unknown error'
          });
          result.details.push({
            id: business.id,
            name: business.name,
            status: 'failed'
          });
        }
      }

      onProgress?.({
        total,
        processed: total,
        currentItem: 'Migration completed',
        status: 'completed'
      });

    } catch (error: any) {
      result.success = false;
      result.errors.push({
        id: 'global',
        error: error.message || 'Failed to fetch businesses from Firestore'
      });
      onProgress?.({
        total: 0,
        processed: 0,
        currentItem: error.message,
        status: 'error'
      });
    }

    return result;
  },

  /**
   * Migrate all stores from Firestore to new API
   */
  async migrateStores(
    onProgress?: (progress: MigrationProgress) => void
  ): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      migrated: 0,
      skipped: 0,
      failed: 0,
      errors: [],
      details: []
    };

    try {
      // Fetch all stores from Firestore
      const storesCollection = collection(db, 'stores');
      const q = query(storesCollection, orderBy('name'));
      const querySnapshot = await getDocs(q);

      const stores: any[] = [];
      querySnapshot.forEach((doc) => {
        stores.push({
          id: doc.id,
          ...doc.data()
        });
      });

      const total = stores.length;
      let processed = 0;

      onProgress?.({
        total,
        processed: 0,
        currentItem: 'Starting migration...',
        status: 'running'
      });

      // Check existing stores in API to avoid duplicates
      let existingStoreIds: Set<string> = new Set();
      try {
        const existingStores = await storesApi.getAllStores();
        existingStoreIds = new Set(existingStores.map((s: any) => s.id));
      } catch (err) {
        console.warn('Could not fetch existing stores from API:', err);
      }

      // Migrate each store
      for (const store of stores) {
        processed++;
        onProgress?.({
          total,
          processed,
          currentItem: store.name || store.id,
          status: 'running'
        });

        // Skip if already exists in API
        if (existingStoreIds.has(store.id)) {
          result.skipped++;
          result.details.push({
            id: store.id,
            name: store.name,
            status: 'skipped'
          });
          continue;
        }

        try {
          // Prepare store data for API
          const storeData = {
            id: store.id,
            name: store.name,
            code: store.code || null,
            type: store.type || null,
            businessId: store.businessId || authStore.getBusinessId(),
            isActive: store.isActive !== false,
            location: store.location || null,
            address: store.address || null,
            phone: store.phone || null,
            email: store.email || null,
            managerId: store.managerId || null,
            managerName: store.managerName || null,
            createdAt: store.createdAt?.toDate?.()?.toISOString() || store.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            migratedFromFirestore: true,
            migratedAt: new Date().toISOString()
          };

          await storesApi.addStore(storeData);
          result.migrated++;
          result.details.push({
            id: store.id,
            name: store.name,
            status: 'migrated'
          });
        } catch (error: any) {
          result.failed++;
          result.success = false;
          result.errors.push({
            id: store.id,
            error: error.message || 'Unknown error'
          });
          result.details.push({
            id: store.id,
            name: store.name,
            status: 'failed'
          });
        }
      }

      onProgress?.({
        total,
        processed: total,
        currentItem: 'Migration completed',
        status: 'completed'
      });

    } catch (error: any) {
      result.success = false;
      result.errors.push({
        id: 'global',
        error: error.message || 'Failed to fetch stores from Firestore'
      });
      onProgress?.({
        total: 0,
        processed: 0,
        currentItem: error.message,
        status: 'error'
      });
    }

    return result;
  },

  /**
   * Migrate both businesses and stores
   */
  async migrateAll(
    onProgress?: (progress: MigrationProgress & { phase: 'businesses' | 'stores' }) => void
  ): Promise<{ businesses: MigrationResult; stores: MigrationResult }> {
    // Migrate businesses first
    const businessResult = await this.migrateBusinesses((progress) => {
      onProgress?.({ ...progress, phase: 'businesses' });
    });

    // Then migrate stores
    const storeResult = await this.migrateStores((progress) => {
      onProgress?.({ ...progress, phase: 'stores' });
    });

    return {
      businesses: businessResult,
      stores: storeResult
    };
  },

  /**
   * Get migration status - compare Firestore and API data
   */
  async getMigrationStatus(): Promise<{
    businesses: { firestore: number; api: number; needsMigration: number };
    stores: { firestore: number; api: number; needsMigration: number };
  }> {
    let firestoreBusinessCount = 0;
    let apiBusinessCount = 0;
    let firestoreStoreCount = 0;
    let apiStoreCount = 0;

    // Count Firestore businesses
    try {
      const businessesCollection = collection(db, 'businesses');
      const businessSnapshot = await getDocs(businessesCollection);
      firestoreBusinessCount = businessSnapshot.size;
    } catch (err) {
      console.error('Error counting Firestore businesses:', err);
    }

    // Count API businesses
    try {
      const apiBusinesses = await businessApi.getAllBusiness();
      apiBusinessCount = apiBusinesses?.length || 0;
    } catch (err) {
      console.error('Error counting API businesses:', err);
    }

    // Count Firestore stores
    try {
      const storesCollection = collection(db, 'stores');
      const storeSnapshot = await getDocs(storesCollection);
      firestoreStoreCount = storeSnapshot.size;
    } catch (err) {
      console.error('Error counting Firestore stores:', err);
    }

    // Count API stores
    try {
      const apiStores = await storesApi.getAllStores();
      apiStoreCount = apiStores?.length || 0;
    } catch (err) {
      console.error('Error counting API stores:', err);
    }

    return {
      businesses: {
        firestore: firestoreBusinessCount,
        api: apiBusinessCount,
        needsMigration: Math.max(0, firestoreBusinessCount - apiBusinessCount)
      },
      stores: {
        firestore: firestoreStoreCount,
        api: apiStoreCount,
        needsMigration: Math.max(0, firestoreStoreCount - apiStoreCount)
      }
    };
  },

  /**
   * Verify migration - compare data between Firestore and API
   */
  async verifyMigration(): Promise<{
    businesses: { matched: number; mismatched: number; missing: string[] };
    stores: { matched: number; mismatched: number; missing: string[] };
  }> {
    const result = {
      businesses: { matched: 0, mismatched: 0, missing: [] as string[] },
      stores: { matched: 0, mismatched: 0, missing: [] as string[] }
    };

    // Verify businesses
    try {
      const businessesCollection = collection(db, 'businesses');
      const firestoreSnapshot = await getDocs(businessesCollection);
      const apiBusinesses = await businessApi.getAllBusiness();
      const apiBusinessMap = new Map(apiBusinesses.map((b: any) => [b.id, b]));

      firestoreSnapshot.forEach((doc) => {
        const firestoreData = doc.data();
        const apiData = apiBusinessMap.get(doc.id);

        if (!apiData) {
          result.businesses.missing.push(doc.id);
        } else if (firestoreData.name === apiData.name) {
          result.businesses.matched++;
        } else {
          result.businesses.mismatched++;
        }
      });
    } catch (err) {
      console.error('Error verifying business migration:', err);
    }

    // Verify stores
    try {
      const storesCollection = collection(db, 'stores');
      const firestoreSnapshot = await getDocs(storesCollection);
      const apiStores = await storesApi.getAllStores();
      const apiStoreMap = new Map(apiStores.map((s: any) => [s.id, s]));

      firestoreSnapshot.forEach((doc) => {
        const firestoreData = doc.data();
        const apiData = apiStoreMap.get(doc.id);

        if (!apiData) {
          result.stores.missing.push(doc.id);
        } else if (firestoreData.name === apiData.name) {
          result.stores.matched++;
        } else {
          result.stores.mismatched++;
        }
      });
    } catch (err) {
      console.error('Error verifying store migration:', err);
    }

    return result;
  }
};

export default migrationService;
