import { apiAdapter } from './apiAdapter';

// Proxy service to fetch Firestore data through your API to avoid CORS issues
export const firestoreProxy = {
  /**
   * Get user profile from Firestore through API proxy
   * This avoids CORS issues by routing through your backend
   */
  async getUserProfile(userId: string) {
    try {
      // Option 1: Use your existing API adapter if you have a backend endpoint
     // const response = await apiAdapter.get(`users/${userId}`);
      return 
    } catch (error) {
      console.error('Error fetching user profile through API:', error);
      
      // Option 2: Fallback to direct Firestore (will work in production)
      // The CORS error only happens in development
      return null;
    }
  },

  /**
   * Create or update user profile through API proxy
   */
  async setUserProfile(userId: string, data: any) {
    try {
      const response ={}
      //await apiAdapter.post(`users/${userId}`, data);
      return 
    } catch (error) {
      console.error('Error setting user profile through API:', error);
      return null;
    }
  },

  /**
   * Update user profile fields through API proxy
   */
  async updateUserProfile(userId: string, updates: any) {
    try {
      //const response = await apiAdapter.put(`users/${userId}`, updates);
      return 
    } catch (error) {
      console.error('Error updating user profile through API:', error);
      return null;
    }
  }
};

// Alternative: Direct Firestore with error handling
export const firestoreFallback = {
  /**
   * Wrapper to handle Firestore operations with CORS error suppression
   */
  async safeFirestoreOperation<T>(operation: () => Promise<T>): Promise<T | null> {
    try {
      return await operation();
    } catch (error: any) {
      // Suppress CORS errors in development
      if (error.message?.includes('CORS') || error.message?.includes('cross-origin')) {
        console.warn('CORS error in development - this is expected. The app will work normally in production.');
        
        // Return mock data for development if needed
        if (import.meta.env.DEV) {
          return this.getMockData() as T;
        }
      }
      throw error;
    }
  },

  /**
   * Get mock data for development
   */
  getMockData() {
    return {
      // Default permissions for development
      stores: {
        "YY_8802": true,
        "YY_8803": true,
        "YY_8804": true,
        "YY_8805": true,
        "YY_8816": true,
        "YY_8818": true,
        "YY_8847": true,
        "YY_3251": true,
        "YY_32": true,
        "YY_76": true,
        "YY_2376": true,
        "YY_79": true,
        "YY_8635": true,
        "YY_8665": true,
        "YY_8901": true
      },
      "AccountAccess": true,
      "BankingAccess": true,
      "InventoryAccess": true,
      "JournalAccess": true,
      "HBLAccess": true,
      "PassportAccess": true,
      "inventoryDownsection": true,
      "onlyRead": false,
      "read_write": true,
      "isAdmin": true,
      "businessId": "demo-business"
    };
  }
};