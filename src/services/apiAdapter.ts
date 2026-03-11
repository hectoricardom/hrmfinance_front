import { fakeServer } from './fakeServer';
import { convertObj2Array, devLog, fetchGraphQL, fetchGraphQLSS, generateShortCode } from './utils';
import { Product, Location, InventoryMovement, BulkMovementRequest } from '../modules/inventory/stores/inventoryStore';
import { JournalEntry } from '../modules/journal/stores/entryBookStore';
import { Account } from '../modules/accounts/stores/accountStore';
import { JournalTemplate } from '../modules/journal/types/journalTemplateTypes';
import { authStore } from '../stores/authStore';
import { bankConsolidationStore } from '../modules';

// Configuration for API mode
export type ApiMode = 'real' | 'fake' | 'hybrid';


const kid = async (): Promise<any> => {
  return {}
}

// Get API mode from environment or localStorage
const getApiMode = (): ApiMode => {
  // Always start with fake mode for development
  if (import.meta.env?.DEV) {
    return 'real';
  }

  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('hrmfinance-api-mode') as ApiMode;
    if (saved && ['real', 'fake', 'hybrid'].includes(saved)) {
      // return saved;
    }
  }
  return 'real'; // Default to fake server for development
};

let currentApiMode: ApiMode = getApiMode();

// API Mode Management
export const apiAdapter = {
  // Get current API mode
  getMode(): ApiMode {
    return currentApiMode;
  },

  // Set API mode
  setMode(mode: ApiMode): void {
    currentApiMode = mode;
    if (typeof window !== 'undefined') {
      localStorage.setItem('hrmfinance-api-mode', mode);
    }
  },

  // Check if using fake server
  isFakeMode(): boolean {
    return currentApiMode === 'fake';
  },

  // Check if using real server
  isRealMode(): boolean {
    return currentApiMode === 'real';
  },

  // Check if using hybrid mode (fallback to fake on real API failure)
  isHybridMode(): boolean {
    return currentApiMode === 'hybrid';
  }
};

// Hybrid API wrapper that can fallback to fake server
export const hybridCall = async <T>(
  realApiCall: () => Promise<T>,
  fakeApiCall: () => Promise<T>,
  fallbackOnError: boolean = true
): Promise<T> => {
  if (currentApiMode === 'fake') {
    return fakeApiCall();
  }

  if (currentApiMode === 'real') {
    return realApiCall();
  }

  // Hybrid mode - try real first, fallback to fake
  try {
    return await realApiCall();
  } catch (error) {
    console.warn('Real API failed, falling back to fake server:', error);
    if (fallbackOnError) {
      return fakeApiCall();
    }
    throw error;
  }
};

// Products API Adapter
export const productsApi = {
  async getAll(query?: string, filters?: any): Promise<Product[]> {


    // Real API call using existing GraphQL
    const response = await fetchGraphQLSS({
      query: "getProducts",
      queryString: "!* contain :search0 AND !* contain :search1 AND !* contain :search2 AND !* contain :search3 AND !* contain :search4",
      params: {
        businessId: authStore.getBusinessId(),
        ":search0": authStore.getBusinessId()
      }
    });



    // Transform response to Product format
    // let vbr = convertObj2Array(response) as Product[]

    return response.data

  },

  async getById(id: string): Promise<Product | null> {
    return hybridCall(
      async () => {
        // Real API call
        const products = await this.getAll();
        return products.find(p => p.id === id) || null;
      },
      () => fakeServer.products.getById(id)
    );
  },

  async create(product: Omit<Product, 'id' | 'createdDate' | 'lastModified'>): Promise<Product> {
    return hybridCall(
      async () => {
        // Real API call - would integrate with your real backend
        devLog('Creating product via real API:', product);
        // For now, simulate real API response
        throw new Error('Real API not implemented yet');
      },
      () => fakeServer.products.create(product)
    );
  },

  async update(id: string, updates: Partial<Product>): Promise<Product> {
    return hybridCall(
      async () => {
        // Real API call
        devLog('Updating product via real API:', id, updates);
        throw new Error('Real API not implemented yet');
      },
      () => fakeServer.products.update(id, updates)
    );
  },

  async delete(id: string): Promise<{ success: boolean; message: string }> {
    return hybridCall(
      async () => {
        // Real API call
        devLog('Deleting product via real API:', id);
        throw new Error('Real API not implemented yet');
      },
      () => fakeServer.products.delete(id)
    );
  }
};

// Inventory API Adapter
export const inventoryApi = {
  async getInventory(query?: string, filters?: any): Promise<any[]> {


    // Real API call using existing GraphQL


    if (!(query && query?.trim())) {
      return []
    }


    let params: Record<string, any> = {
      // businessId: authStore.getBusinessId(),
    }
    query && query.split(" ").map((qry, inDq) => {
      if (qry) {
        params[":search" + inDq] = qry.trim();
      }
    })

    let bdyq2 = {
      query: "getInventoryMovements",
      queryString: "!* contain :search0 AND !* contain :search1 AND !* contain :search2 AND !* contain :search3 AND !* contain :search4",
      params,
      projection: {
        "id": 1,
        "description": 1,
        "store": 1,
        "type": 1,
        "invoice": 1,
        "products": 1,
        "createdDate": 1,
        "createdAt": 1,
        "productSubtotal": 1,
        "userId": 1
      }
    }
    const response = await fetchGraphQLSS(bdyq2)
    //  devLog(response.data)
    return response.data;

  },

  async getProducts(query?: string): Promise<any[]> {

    if (!(query && query?.trim())) {
      return []
    }
    let params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
    }
    query && query.split(" ").map((qry, inDq) => {
      if (qry) {
        params[":search" + inDq] = qry.trim();
      }
    })

    let bdyq2 = {
      query: "getProducts",
      queryString: "!* contain :search0 AND !* contain :search1 AND !* contain :search2 AND !* contain :search3 AND !* contain :search4",
      params
    }

    const response = await fetchGraphQLSS(bdyq2);
    // devLog(bdyq2)
    //devLog(response.data)
    return response.data;
  },


  async getConsigee(query?: string): Promise<any[]> {

    if (!(query && query?.trim())) {
      return []
    }
    let params: Record<string, any> = {
      businessId: "all",
    }

    query && query.split(" ").map((qry, inDq) => {
      if (qry) {
        params[":search" + inDq] = qry.trim();
      }
    })

    let bdyq2 = {
      query: "getConsigneeYabaExpress",
      queryString: "!* contain :search0 AND !* contain :search1 AND !* contain :search2 AND !* contain :search3 AND !* contain :search4",
      params
    }

    // devLog(bdyq2);

    const response = await fetchGraphQLSS(bdyq2)

    // devLog({response})

    return response.data;
  },
  // 02030568890
  async getShipper(query?: string): Promise<any[]> {

    if (!(query && query?.trim())) {
      return []
    }
    let params: Record<string, any> = {
      businessId: "all",
    }
    query && query.split(" ").map((qry, inDq) => {
      if (qry) {
        params[":search" + inDq] = qry.trim();
      }
    })

    let bdyq2 = {
      query: "getShipperYabaExpress",
      queryString: "!* contain :search0 AND !* contain :search1 AND !* contain :search2 AND !* contain :search3 AND !* contain :search4",
      params
    }
    //devLog(bdyq2)
    const response = await fetchGraphQLSS(bdyq2)

    return response.data;
  },



  async getInvoice(query?: string, filters?: any): Promise<any[]> {


    // Real API call using existing GraphQL

    if (!(query && query?.trim())) {
      return []
    }


    let params: Record<string, any> = {
      businessId: authStore?.isAdmin() ? null : authStore.getBusinessId(),
    }
    query && query.split(" ").map((qry, inDq) => {
      if (qry) {
        params[":search" + inDq] = qry.trim();
      }
    })



    params[":search5"] = authStore.getBusinessId().trim();

    let bdyq2 = {
      query: "getInvoices",
      queryString: "!* contain :search0 AND !* contain :search1 AND !* contain :search2 AND !* contain :search3 AND !* contain :search4 AND !* contain :search5",
      params
    }
    const response = await fetchGraphQLSS(bdyq2)
    return response.data;

  },

  async addInventory(form?: any): Promise<any[]> {


    let params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
    }


    let bdyq2 = {
      query: "addInventoryMovement",
      //queryString: "!* contain :search0 AND !* contain :search1 AND !* contain :search2 AND !* contain :search3 AND !* contain :search4",
      params,
      form
    }


    const response = await fetchGraphQLSS(bdyq2)
    return response.data;
  },

  async addInventorySafe(form?: any): Promise<any[]> {


    let params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
    }


    let bdyq2 = {
      query: "addInventoryMovementSafe",
      //queryString: "!* contain :search0 AND !* contain :search1 AND !* contain :search2 AND !* contain :search3 AND !* contain :search4",
      params,
      form
    }


    const response = await fetchGraphQLSS(bdyq2)
    return response.data;
  },

  async updInventory(form?: any): Promise<any> {
    let params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      id: form?.id
    }

    let bdyq2 = {
      query: "updateInventoryMovement",
      params,
      form
    }

    const response = await fetchGraphQLSS(bdyq2)
    return response?.data || response;
  },





  async addProduct(form?: any): Promise<Product> {


    let params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
    }


    let bdyq2 = {
      query: "addProduct",
      //queryString: "!* contain :search0 AND !* contain :search1 AND !* contain :search2 AND !* contain :search3 AND !* contain :search4",
      params,
      form
    }


    const response = await fetchGraphQLSS(bdyq2)
    return response.data;
  },

  async updProduct(id: string, form?: any): Promise<any[]> {
    let params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      id
    }

    let bdyq2 = {
      query: "updateProduct",
      params,
      form
    }

    const response = await fetchGraphQLSS(bdyq2)
    return response;
  },

  // ============================================
  // NEW OPTIMIZED STOCK LEVEL ENDPOINTS
  // ============================================

  /**
   * Get stock level for a specific product/store (O(1) lookup)
   */
  async getStockLevel(productId?: string, storeId?: string): Promise<any> {
    const params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
    };
    if (productId) params.productId = productId;
    if (storeId) params.storeId = storeId;

    const response = await fetchGraphQLSS({
      query: 'getStockLevel',
      params,
    });

    return response?.data || [];
  },

  /**
   * Get items with low stock (below threshold)
   */
  async getLowStockItems(threshold: number = 10, limit: number = 100): Promise<any> {
    const params = {
      businessId: authStore.getBusinessId(),
      threshold,
      limit,
    };

    const response = await fetchGraphQLSS({
      query: 'getStockLowItems',
      params,
    });
    return response?.data || { items: [], count: 0 };
  },

  /**
   * Get items that are out of stock (qty <= 0)
   */
  async getOutOfStockItems(limit: number = 100): Promise<any> {
    const params = {
      businessId: authStore.getBusinessId(),
      limit,
    };

    const response = await fetchGraphQLSS({
      query: 'getOutOfStockItems',
      params,
    });
    return response?.data || { items: [], count: 0 };
  },

  /**
   * Get stock statistics for dashboard (fast query)
   */
  async getStockStats(): Promise<any> {
    const params = {
      businessId: authStore.getBusinessId(),
    };

    const response = await fetchGraphQLSS({
      query: 'getStockStats',
      params,
    });
    return response?.data || { summary: {}, byStore: [] };
  },

  /**
   * Get all stock for a specific store
   */
  async getStockByStore(storeId: string): Promise<any[]> {
    const params = {
      businessId: authStore.getBusinessId(),
      storeId,
    };

    const response = await fetchGraphQLSS({
      query: 'getStockByStore',
      params,
    });
    return response?.data || [];
  },

  /**
   * Check stock availability for multiple items (use before creating orders)
   */
  async checkStockAvailability(items: Array<{ productId: string; quantity: number }>, storeId?: string): Promise<any> {
    const params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      items,
    };
    if (storeId) params.storeId = storeId;

    const response = await fetchGraphQLSS({
      query: 'checkStockAvailability',
      params,
    });
    return response?.data || { available: false, items: [], unavailableItems: [] };
  },

  /**
   * Create inventory movement with invoice validation (prevents orphans)
   */
  async addInventoryMovementSafe(form: any): Promise<any> {
    const params = {
      businessId: authStore.getBusinessId(),
    };

    const response = await fetchGraphQLSS({
      query: 'addInventoryMovementSafe',
      params,
      form,
    });

    if (response?.error) {
      throw new Error(response.error.message || 'Failed to create movement');
    }
    return response?.data || response;
  },

  /**
   * Get list of orphaned movements
   */
  async getOrphanedMovements(limit: number = 100): Promise<any> {
    const params = {
      businessId: authStore.getBusinessId(),
      limit,
    };

    const response = await fetchGraphQLSS({
      query: 'getOrphanedMovements',
      params,
    });
    return response?.data || { orphans: [], count: 0 };
  },

  /**
   * Detect orphaned movements (scan for movements with missing invoices)
   */
  async detectOrphanedMovements(): Promise<any> {
    const params = {
      businessId: authStore.getBusinessId(),
    };

    const response = await fetchGraphQLSS({
      query: 'detectOrphanedMovements',
      params,
    });
    return response?.data || { orphans: [], count: 0 };
  },

  /**
   * Mark detected orphaned movements
   */
  async markOrphanedMovements(): Promise<any> {
    const params = {
      businessId: authStore.getBusinessId(),
    };

    const response = await fetchGraphQLSS({
      query: 'markOrphanedMovements',
      params,
    });
    return response?.data || { markedCount: 0 };
  },

  /**
   * Reconcile stock levels (compare calculated vs stored)
   */
  async reconcileStock(productId?: string, autoFix: boolean = false): Promise<any> {
    const params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      autoFix,
    };
    if (productId) params.productId = productId;

    const response = await fetchGraphQLSS({
      query: 'reconcileStock',
      params,
    });
    return response?.data || { discrepancies: [], count: 0 };
  },

  /**
   * Get movement history for a specific product
   */
  async getProductMovementHistory(productId: string, storeId?: string, limit: number = 50): Promise<any[]> {
    const params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      productId,
      limit,
    };
    if (storeId) params.storeId = storeId;

    const response = await fetchGraphQLSS({
      query: 'getProductMovementHistory',
      params,
    });
    return response?.data || [];
  },


  async addInvoice(form?: any): Promise<any[]> {


    let params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
    }


    let bdyq2 = {
      query: "addInvoice",
      params,
      form
    }

    //devLog(bdyq2)
    const response = await fetchGraphQLSS(bdyq2);
    //devLog(response)
    return response;
  },

  async updateInvoice(id: string, form?: any): Promise<any[]> {


    let params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      id
    }


    let bdyq2 = {
      query: "updateInvoice",
      params,
      form
    }

    //devLog(bdyq2)
    const response = await fetchGraphQLSS(bdyq2);
    //devLog(response)
    return response;
  },


  async getScannedLocations(query?: string, filters?: any): Promise<any[]> {


    // Real API call using existing GraphQL

    if (!(query && query?.trim())) {
      return []
    }

    let params: Record<string, any> = {
      //businessId: authStore.getBusinessId(),
    }

    if (filters?.search) {
      //query += " "+filters.search;
    }


    if (filters?.guia && filters.guia !== 'all') {
      params.guia = filters.guia;
    }

    // Add state filter
    if (filters?.state && filters.state.trim()) {
      params.estate = filters.state.trim();
    }

    // Add city filter
    if (filters?.city && filters.city.trim()) {
      params.city = filters.city.trim();
    }


    query && query.split(" ").map((qry, inDq) => {
      if (qry) {
        params[":search" + inDq] = qry.trim();
      }
    })




    let bdyq2 = {
      query: "getScannedLocations",
      queryString: "!* contain :search0 AND !* contain :search1 AND !* contain :search2 AND !* contain :search3 AND !* contain :search4 AND guia = guia",
      params,
      toon: false
    }
    const response = await fetchGraphQLSS(bdyq2)
    //devLog(bdyq2)
    //devLog(response)
    return response.data;

  },



  async upsertMultiScannedLocations(list: any): Promise<any[]> {


    // Real API call using existing GraphQL



    let bdyq2 = {
      query: "updateMultipleHblsLocations",
      ...list
    }
    const response = await fetchGraphQLSS(bdyq2)
    //devLog(bdyq2)
    //devLog(response)
    return response;

  },

  async upsertScannedLocations(params: Record<string, any>): Promise<any[]> {


    // Real API call using existing GraphQL



    let bdyq2 = {
      query: "updateHblsLocations",
      params,
    }
    const response = await fetchGraphQLSS(bdyq2)
    //devLog(bdyq2)
    //devLog(response)
    return response.data;

  },



  async updateHbls(params: Record<string, any>): Promise<any[]> {


    // Real API call using existing GraphQL



    let bdyq2 = {
      query: "updateYabaHbls",
      params,
    }
    const response = await fetchGraphQLSS(bdyq2)
    //devLog(bdyq2)
    //devLog(response)
    return response.data;

  },

  async getHBLS(query?: string, filters?: any): Promise<any[]> {


    // Real API call using existing GraphQL

    if (!(query && query?.trim())) {
      return []
    }

    let params: Record<string, any> = {
      //businessId: authStore.getBusinessId(),
    }

    if (filters?.search) {
      //query += " "+filters.search;
    }


    if (filters?.guia && filters.guia !== 'all') {
      params.guia = filters.guia;
    }

    // Add state filter
    if (filters?.state && filters.state.trim()) {
      params.estate = filters.state.trim();
    }

    // Add city filter
    if (filters?.city && filters.city.trim()) {
      params.city = filters.city.trim();
    }


    query && query.split(" ").map((qry, inDq) => {
      if (qry) {
        params[":search" + inDq] = qry.trim();
      }
    })




    let bdyq2 = {
      query: "getScanYabaHbls",
      queryString: "!* contain :search0 AND !* contain :search1 AND !* contain :search2 AND !* contain :search3 AND !* contain :search4 AND guia = guia",
      params,
      toon: false
    }
    const response = await fetchGraphQLSS(bdyq2)
    //devLog(bdyq2)
    //devLog(response)
    return response.data;

  },

  async sugestHBLS(query?: string, filters?: any): Promise<any[]> {


    // Real API call using existing GraphQL

    if (!(query && query?.trim())) {
      return []
    }

    let params: Record<string, any> = {
      //businessId: authStore.getBusinessId(),
    }

    if (filters?.search) {
      //query += " "+filters.search;
    }


    if (filters?.guia && filters.guia !== 'all') {
      params.guia = filters.guia;
    }


    if (filters?.guia && filters.guia !== 'all') {
      //params.store = 42;
    }

    query && query.split(" ").map((qry, inDq) => {
      if (qry) {
        params[":search" + inDq] = qry.trim();
      }
    })



    let bdyq2 = {
      query: "getScanYabaHbls",
      queryString: "!* contain :search0 AND !* contain :search1 AND !* contain :search2 AND !* contain :search3 AND !* contain :search4 AND guia = guia",
      params
    }
    const response = await fetchGraphQLSS(bdyq2)
    //devLog(bdyq2)
    //devLog(response)
    return response.data;

  },

  async hblsByMultIds(ids?: string[], filters?: any): Promise<any[]> {


    // Real API call using existing GraphQL

    if (!(ids?.length)) {
      return []
    }

    let params: Record<string, any> = {
      //businessId: authStore.getBusinessId(),
      ids
    }

    params.guia = 'all';
    // && filters.guia !== 'all'
    if (filters?.guia) {
      params.guia = filters.guia;
    }






    let bdyq2 = {
      query: "getYabaHblsByMultipleIds",
      queryString: "!* contain :search0 AND !* contain :search1 AND !* contain :search2 AND !* contain :search3 AND !* contain :search4 AND guia = guia",
      params
    }
    const response = await fetchGraphQLSS(bdyq2)


    return response.data;

  },

  async seahblsByMultIds(ids?: string[], filters?: any): Promise<any[]> {


    // Real API call using existing GraphQL

    if (!(ids?.length)) {
      return []
    }

    let params: Record<string, any> = {
      //businessId: authStore.getBusinessId(),
      ids
    }

    params.guia = 'all';
    // && filters.guia !== 'all'
    if (filters?.guia) {
      params.guia = filters.guia;
    }






    let bdyq2 = {
      query: "getYabaHblsByMultipleIds",
      queryString: "!* contain :search0 AND !* contain :search1 AND !* contain :search2 AND !* contain :search3 AND !* contain :search4 AND guia = guia",
      params
    }
    const response = await fetchGraphQLSS(bdyq2)


    return response.data;

  },

  async updateHBLStatus(hbl: string, statusData: any): Promise<any> {
    let params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      ":search0": hbl
    };

    let newStatus = {
      timeStamp: (new Date()).getTime(),
      //latitude: globalScaningLocation?.latitude, 
      //longitude: globalScaningLocation?.longitude,
      statusId: statusData?.idguidestate,
      userId: !authStore.isAdmin() ? "107024974104054421738" : authStore.state?.user?.uid,
      userName: !authStore.isAdmin() ? "Rrynier Moplesi" : authStore.state?.user?.displayName,
    }


    let bdyq2 = {
      query: "updateScanLocationBagsLocation",
      params,
      form: newStatus
    };

    const response = await fetchGraphQL(bdyq2);
    //devLog(response);
    return response;
    //return {};
  },

  async deleteHBL(hbl: string, guia: string): Promise<{ success: boolean; message: string }> {
    try {
      devLog('Deleting HBL via API:', hbl);

      let params: Record<string, any> = {
        guia,
        id: hbl
      };

      let bdyq2 = {
        query: "deleteYabaHbls",
        params
      };

      devLog('Delete HBL request:', bdyq2);
      const response = await fetchGraphQLSS(bdyq2);
      devLog('Delete HBL response:', response);

      return {
        success: true,
        message: 'HBL eliminado exitosamente'
      };
    } catch (error) {
      console.error('Error deleting HBL:', error);
      return {
        success: false,
        message: error?.message || 'Error al eliminar HBL'
      };
    }
  },
  async updateHBL(hbl: string, form: any): Promise<{ success: boolean; message: string }> {
    try {


      let params: Record<string, any> = {
        id: hbl
      };

      let bdyq2 = {
        query: "updateYabaHbls",
        params,
        form
      };

      const response = await fetchGraphQLSS(bdyq2);
      devLog('HBL response:', response);

      return {
        success: true,
        message: 'HBL actualizado exitosamente'
      };
    } catch (error) {
      console.error('Error update HBL:', error);
      return {
        success: false,
        message: error?.message || 'Error update HBL'
      };
    }
  },

  // ClientNotary methods
  async getClientNotary(clientId: string): Promise<any> {
    try {
      let params: Record<string, any> = {
        businessId: "all",
        ":search0": clientId
      };

      // || authStore.getBusinessId(),

      let bdyq2 = {
        query: "getClientNotary",
        queryString: "!* contain :search0",
        params
      };

      const response = await fetchGraphQLSS(bdyq2);
      return response.data?.[0] || null;
    } catch (error) {
      console.error('Error fetching ClientNotary:', error);
      throw error;
    }
  },

  async getAllClientNotary(filters?: any): Promise<any[]> {
    try {
      let params: Record<string, any> = {
        businessId: authStore.getBusinessId()
      };

      let bdyq2 = {
        query: "getAllClientNotary",
        limit: 5000,
        params
      };

      const response = await fetchGraphQLSS(bdyq2);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching ClientNotary list:', error);
      return [];
    }
  },

  async searchClientNotary(query: string): Promise<any[]> {
    devLog(query)
    if (!query?.trim()) {
      return [];
    }

    try {
      let params: Record<string, any> = {
        businessId: "all"
      };

      query.split(" ").forEach((qry, inDq) => {
        if (qry) {
          params[`:search${inDq}`] = qry.trim();
        }
      });

      let bdyq2 = {
        query: "getClientNotary",
        queryString: "!* contain :search0 AND !* contain :search1 AND !* contain :search2",
        params
      };
      devLog(bdyq2)
      const response = await fetchGraphQLSS(bdyq2);

      devLog(response)
      return response.data || [];
    } catch (error) {
      console.error('Error searching ClientNotary:', error);
      return [];
    }
  },

  async createClientNotary(customerData: any): Promise<any> {
    try {
      let params: Record<string, any> = {
        businessId: authStore.getBusinessId(),
        userId: authStore.state?.user?.uid,
        timestamp: new Date().getTime()
      };
      let genId = generateShortCode(16)
      let bdyq2 = {
        query: "addClientNotary",
        params,
        form: {
          ...customerData,
          id: genId,
          clientNotaryId: genId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      };

      const response = await fetchGraphQLSS(bdyq2);
      return response.data || response;
    } catch (error) {
      console.error('Error creating ClientNotary:', error);
      throw error;
    }
  },

  async updateClientNotary(clientId: string, updates: any): Promise<any> {
    try {
      let params: Record<string, any> = {
        //businessId: authStore.getBusinessId(),
        id: clientId,
        userId: authStore.state?.user?.uid,
        timestamp: new Date().getTime()
      };

      let bdyq2 = {
        query: "updateClientNotary",
        params,
        form: {
          ...updates,
          updatedAt: new Date().toISOString()
        }
      };

      const response = await fetchGraphQLSS(bdyq2);
      return response.data || response;
    } catch (error) {
      console.error('Error updating ClientNotary:', error);
      throw error;
    }
  },

  async deleteClientNotary(clientId: string): Promise<{ success: boolean; message: string }> {
    try {
      let params: Record<string, any> = {
        businessId: authStore.getBusinessId(),
        clientId: clientId,
        userId: authStore.state?.user?.uid
      };

      let bdyq2 = {
        query: "deleteClientNotary",
        params
      };

      const response = await fetchGraphQLSS(bdyq2);

      return {
        success: true,
        message: 'Cliente eliminado exitosamente'
      };
    } catch (error) {
      console.error('Error deleting ClientNotary:', error);
      return {
        success: false,
        message: error?.message || 'Error al eliminar cliente'
      };
    }
  },

  async getClientNotaryById(clientNotaryId: string): Promise<any> {
    try {
      let params: Record<string, any> = {
        businessId: "all",
        id: clientNotaryId
      };

      let bdyq2 = {
        query: "getClientNotaryById",
        params
      };

      const response = await fetchGraphQLSS(bdyq2);
      devLog('GetClientNotaryById response:', response);
      return response.data || response;
    } catch (error) {
      console.error('Error fetching ClientNotary by ID:', error);
      throw error;
    }
  },

  // Document Management Methods
  async uploadDocument(fileData: File, clientNotaryId: string, metadata: any): Promise<any> {
    try {
      // Read file as ArrayBuffer
      const arrayBuffer = await fileData.arrayBuffer();
      const fileBuffer = Array.from(new Uint8Array(arrayBuffer));

      let params: Record<string, any> = {
        businessId: authStore.getBusinessId(),
        id: clientNotaryId,
        userId: authStore.state?.user?.uid,
        timestamp: new Date().getTime()
      };

      let bdyq2 = {
        query: "uploadDocument",
        params,
        form: {
          fileBuffer: fileBuffer,
          fileName: fileData.name,
          mimeType: fileData.type,
          documentType: metadata.documentType || 'other',
          clientId: clientNotaryId,
          extractData: metadata.extractedData || {},
          // Additional metadata
          fileSize: fileData.size,
          description: metadata.description,
          documentNumber: metadata.documentNumber,
          issueDate: metadata.issueDate,
          expirationDate: metadata.expirationDate,
          issuingCountry: metadata.issuingCountry,
          notes: metadata.notes,
          uploadedAt: new Date().getTime()
        }
      };

      devLog('Uploading document with structure:', {
        query: bdyq2.query,
        params: bdyq2.params,
        formKeys: Object.keys(bdyq2.form),
        bufferSize: fileBuffer.length
      });

      const response = await fetchGraphQLSS(bdyq2);
      return response.data || response;
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  },

  async processDocument(documentId: string, fileUrl: string, mimeType: string): Promise<any> {
    try {
      let params: Record<string, any> = {
        businessId: authStore.getBusinessId(),

        userId: authStore.state?.user?.uid
      };

      let bdyq2 = {
        query: "processDocument",
        params,
        form: {
          documentId,
          fileUrl,
          mimeType,
          processedAt: new Date().getTime()
        }
      };

      const response = await fetchGraphQLSS(bdyq2);
      return response.data || response;
    } catch (error) {
      console.error('Error processing document:', error);
      throw error;
    }
  },

  async downloadDocument(documentId: string): Promise<Blob> {
    try {
      let params: Record<string, any> = {
        businessId: authStore.getBusinessId(),
        documentId
      };

      let bdyq2 = {
        query: "downloadDocument",
        params
      };

      const response = await fetchGraphQLSS(bdyq2);

      // If response contains a URL, fetch the actual file
      if (response.fileUrl) {
        const fileResponse = await fetch(response.fileUrl);
        return await fileResponse.blob();
      }

      throw new Error('No file URL in response');
    } catch (error) {
      console.error('Error downloading document:', error);
      throw error;
    }
  },

  async updateDocument(documentId: string, updates: any): Promise<any> {
    try {
      let params: Record<string, any> = {
        businessId: authStore.getBusinessId(),
        id: documentId,
        userId: authStore.state?.user?.uid,
        timestamp: new Date().getTime()
      };

      let bdyq2 = {
        query: "updateDocument",
        params,
        form: {
          ...updates,
          updatedAt: new Date().getTime()
        }
      };

      const response = await fetchGraphQLSS(bdyq2);
      return response.data || response;
    } catch (error) {
      console.error('Error updating document:', error);
      throw error;
    }
  },

  async deleteDocument(documentId: string): Promise<{ success: boolean; message: string }> {
    try {
      let params: Record<string, any> = {
        businessId: authStore.getBusinessId(),
        id: documentId,
        userId: authStore.state?.user?.uid
      };

      let bdyq2 = {
        query: "deleteDocument",
        params
      };

      const response = await fetchGraphQLSS(bdyq2);

      return {
        success: true,
        message: 'Documento eliminado exitosamente'
      };
    } catch (error) {
      console.error('Error deleting document:', error);
      return {
        success: false,
        message: error?.message || 'Error al eliminar documento'
      };
    }
  },

  async getDocuments(clientNotaryId: string, filters?: any): Promise<any[]> {
    try {
      let params: Record<string, any> = {
        //businessId: authStore.getBusinessId(),
        ":search0": clientNotaryId,
        //":search1": authStore.getBusinessId()
      };

      if (filters?.documentType) {
        params.documentType = filters.documentType;
      }

      if (filters?.verified !== undefined) {
        params.verified = filters.verified;
      }

      let bdyq2 = {
        query: "getDocuments",
        queryString: "!* contain :search0 AND !* contain :search1 AND !* contain :search2 ",
        params
      };

      const response = await fetchGraphQLSS(bdyq2);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching documents:', error);
      return [];
    }
  },

  async getDocumentById(documentId: string): Promise<any> {
    try {
      let params: Record<string, any> = {
        businessId: authStore.getBusinessId(),
        documentId
      };

      let bdyq2 = {
        query: "getDocumentById",
        params
      };

      const response = await fetchGraphQLSS(bdyq2);
      return response.data || response;
    } catch (error) {
      console.error('Error fetching document by ID:', error);
      throw error;
    }
  }

};




// Movements API Adapter
export const movementsApi = {

  async getAll(filters?: any): Promise<InventoryMovement[]> {
    return inventoryApi.getInventory("ref");
  },

  async getById(id: string): Promise<InventoryMovement | null> {
    return hybridCall(
      async () => {
        devLog('Getting movement by ID via real API:', id);
        throw new Error('Real API not implemented yet');
      },
      () => fakeServer.movements.getById(id)
    );
  },

  async create(movement: Omit<InventoryMovement, 'id' | 'createdDate'>): Promise<InventoryMovement> {
    return hybridCall(
      async () => {
        devLog('Creating movement via real API:', movement);
        throw new Error('Real API not implemented yet');
      },
      () => fakeServer.movements.create(movement)
    );
  },

  async update(id: string, updates: Partial<InventoryMovement>): Promise<InventoryMovement> {
    return hybridCall(
      async () => {
        devLog('Updating movement via real API:', id, updates);
        throw new Error('Real API not implemented yet');
      },
      () => fakeServer.movements.update(id, updates)
    );
  },

  async createBulk(bulkRequest: BulkMovementRequest): Promise<{ success: boolean; movements: InventoryMovement[]; errors: string[] }> {
    return hybridCall(
      async () => {
        devLog('Creating bulk movements via real API:', bulkRequest);
        throw new Error('Real API not implemented yet');
      },
      () => fakeServer.movements.createBulk(bulkRequest)
    );
  },

  async getStockLevels(params: any): Promise<any[]> {
    const response = await fetchGraphQLSS({
      // query: "getScanYabaInventoryStocks",
      query: "calculateInventoryStock",

      queryString: "!* contain :search0 AND !* contain :search1 AND !* contain :search2 AND !* contain :search3 AND !* contain :search4",
      params
    });
    return response;
  },

  async calcStockLevels(): Promise<any[]> {
    return [];
    /** 
    const response = await fetchGraphQL({
      query: "calculateInventoryStock"
    });
    return response
    */
  }
};

// Locations API Adapter
export const locationsApi = {
  async getAll(filters?: any): Promise<Location[]> {
    return hybridCall(
      async () => {
        devLog('Getting locations via real API:', filters);
        throw new Error('Real API not implemented yet');
      },
      () => fakeServer.locations.getAll(filters)
    );
  },

  async getById(id: string): Promise<Location | null> {
    return hybridCall(
      async () => {
        devLog('Getting location by ID via real API:', id);
        throw new Error('Real API not implemented yet');
      },
      () => fakeServer.locations.getById(id)
    );
  },

  async create(location: Omit<Location, 'id' | 'createdDate'>): Promise<Location> {
    return hybridCall(
      async () => {
        devLog('Creating location via real API:', location);
        throw new Error('Real API not implemented yet');
      },
      () => fakeServer.locations.create(location)
    );
  },

  async update(id: string, updates: Partial<Location>): Promise<Location> {
    return hybridCall(
      async () => {
        devLog('Updating location via real API:', id, updates);
        throw new Error('Real API not implemented yet');
      },
      () => fakeServer.locations.update(id, updates)
    );
  }
};

// Accounts API Adapter
export const accountsApi = {



  async getAlls(query?: string, filters?: any): Promise<any[]> {
    //devLog("getAlls",query)

    // Real API call using existing GraphQL

    if (!(query && query?.trim())) {
      return []
    }

    let params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      //authStore.getBusinessId()
    }

    if (filters?.search) {
      //query += " "+filters.search;
    }





    query && query.split(" ").map((qry, inDq) => {
      if (qry) {
        params[":search" + inDq] = qry.trim();
      }
    })



    let bdyq2 = {
      //query: "getScanAccounts",

      query: "getAccounts",
      queryString: "!* contain :search0 AND !* contain :search1 AND !* contain :search2 AND !* contain :search3 AND !* contain :search4 AND guia = guia",
      params,
      limit: 2000
    }

    const response = await fetchGraphQLSS(bdyq2)
    //devLog(response)
    return response.data;

  },

  async getBalances(filters?: any): Promise<any[]> {
    //devLog("getAlls",query)

    // Real API call using existing GraphQL



    let params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      year: authStore.getSelectedYear()
     
      //authStore.getBusinessId()
    }

    if (filters?.search) {
      //query += " "+filters.search;
    }







    let bdyq2 = {
      //query: "getScanAccounts",

      query: "getBalancesByAccounts",
      params,
      limit: 2000
    }

    const response = await fetchGraphQLSS(bdyq2)
    //devLog(response)
    return response.data;

  },



  async getBalancesByProviders(filters?: any): Promise<any[]> {
    //devLog("getAlls",query)

    // Real API call using existing GraphQL



    let params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      year: authStore.getSelectedYear()
      //authStore.getBusinessId()
    }

    if (filters?.search) {
      //query += " "+filters.search;
    }







    let bdyq2 = {
      //query: "getScanAccounts",

      query: "getBalancesByProviders",
      params,
      limit: 2000
    }

    const response = await fetchGraphQLSS(bdyq2)
    
    return response;

  },


  async getLedger(accountId: string): Promise<any[]> {
    //devLog("getAlls",query)

    // Real API call using existing GraphQL



    let params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      accountId,
      year: authStore.getSelectedYear()
    }


    let bdyq2 = {
      query: "getSubmayor",
      params,
      limit: 2000
    }

    const response = await fetchGraphQLSS(bdyq2)
    //devLog(response)
    return response.data;

  },

  async getAll(filters?: any): Promise<Account[]> {
    return hybridCall(
      async () => {
        devLog('Getting accounts via real API:', filters);
        throw new Error('Real API not implemented yet');
      },
      () => fakeServer.accounts.getAll(filters)
    );
  },

  async getById(id: string): Promise<Account | null> {
    return hybridCall(
      async () => {
        devLog('Getting account by ID via real API:', id);
        throw new Error('Real API not implemented yet');
      },
      () => fakeServer.accounts.getById(id)
    );
  },

  async create(account: Omit<Account, 'id' | 'createdDate' | 'lastModified'>): Promise<Account> {
    let params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
    }

    let bdyq2 = {
      query: "addAccount",
      params,
      form: account
    }

    //devLog(bdyq2)
    const response = await fetchGraphQLSS(bdyq2)
    //devLog(response)
    return response;
  },

  async update(id: string, updates: Partial<Account>): Promise<Account> {

    let params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      id
    }

    let bdyq2 = {
      query: "updateAccount",
      params,
      data2update: updates
    }

    //devLog(bdyq2)
    const response = await fetchGraphQLSS(bdyq2)
    //devLog(response)
    return response;
  },

  async delete(id: string): Promise<string> {
    // "hcPiDPfZFS8ymqoh",
    let params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      id
    }

    let bdyq2 = {
      query: "deleteAccount",
      params
    }

    //devLog(bdyq2)
    const response = await fetchGraphQLSS(bdyq2)
    //devLog(response)
    return response;
  },

  async getCalculatedBalances(businessId: string, asOfDate?: string): Promise<any> {
    let params: Record<string, any> = {
      businessId: businessId || authStore.getBusinessId()
    }

    if (asOfDate) {
      params.asOfDate = asOfDate;
    }

    let bdyq2 = {
      query: "getCalculatedBalances",
      params
    }

    //devLog(bdyq2)
    const response = await fetchGraphQLSS(bdyq2)
    //devLog(response)
    return response.data || response;
  }


};



// Journal API Adapter
export const journalApi = {

  async getAll(query?: string, filters?: any): Promise<JournalEntry[]> {
    // devLog("getAlls",query)

    // Real API call using existing GraphQL

    if (!(query && query?.trim())) {
      return []
    }

    let params: Record<string, any> = {
      businessId: authStore.getBusinessId(), 
      year: authStore.getSelectedYear()
    }

    if (filters?.search) {
      //query += " "+filters.search;
    }



    query && query.split(" ").map((qry, inDq) => {
      if (qry) {
        params[":search" + inDq] = qry.trim();
      }
    })



    let bdyq2 = {
      query: "getEntryBooks",
      queryString: "!* contain :search0 AND !* contain :search1 AND !* contain :search2 AND !* contain :search3 AND !* contain :search4 AND createdTimeStamp > :date1 AND createdTimeStamp < :date2 AND account contain :account AND subAccount contain :subAccount AND status = :status",
      params
    }

    //devLog(bdyq2)

    const response = await fetchGraphQLSS(bdyq2)
    // devLog(response)
    return response;

  },

  async getById(id: string): Promise<JournalEntry | null> {
    return hybridCall(
      async () => {
        devLog('Getting journal entry by ID via real API:', id);
        throw new Error('Real API not implemented yet');
      },
      () => fakeServer.journal.getById(id)
    );
  },

  async create(entry: Omit<JournalEntry, 'id' | 'createdAt' | 'entryNumber'>): Promise<JournalEntry> {
    let params: Record<string, any> = {
      businessId: authStore.getBusinessId()
    }

    let bdyq2 = {
      query: "addEntryBook",
      params,
      form: entry
    }


    const response = await fetchGraphQLSS(bdyq2)
    //devLog(response)
    return response;
  },

  async update(id: string, updates: Partial<JournalEntry>): Promise<JournalEntry> {
    let params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      id
    }

    let bdyq2 = {
      query: "updateEntryBook",
      params,
      form: updates
    }


    const response = await fetchGraphQLSS(bdyq2)
    //devLog(bdyq2)
    //devLog(response)
    return response;
  },

  async delete(id: string): Promise<JournalEntry> {
    let params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      id
    }

    let bdyq2 = {
      query: "deleteEntryBook",
      params,

    }


    const response = await fetchGraphQLSS(bdyq2)
    //devLog(bdyq2)
    //devLog(response)
    return response;
  },

  async post(id: string): Promise<JournalEntry> {
    return hybridCall(
      async () => {
        devLog('Posting journal entry via real API:', id);
        throw new Error('Real API not implemented yet');
      },
      () => fakeServer.journal.post(id)
    );
  }
};


// Templates API Adapter
export const templatesApi = {

  async getAll(query?: string, filters?: any): Promise<JournalTemplate[]> {

    // Real API call using existing GraphQL pattern
    if (!(query && query?.trim())) {
      // Return empty array if no search query
      query = "t"; // Default search to find templates
    }



    let params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      ":search5": authStore.getBusinessId()
    }

    if (filters?.category && filters.category !== 'all') {
      params.category = filters.category;
    }

    if (filters?.isActive !== undefined) {
      params.isActive = filters.isActive;
    }

    query && query.split(" ").map((qry, inDx) => {
      if (qry) {
        params[":search" + inDx] = qry.trim();
      }
    })

    let bdyq2 = {
      query: "getDynamicTemplates",
      queryString: "!* contain :search0 AND !* contain :search1 AND !* contain :search2 AND category = category AND isActive = isActive",
      params
    }



    const response = await fetchGraphQLSS(bdyq2);
    //devLog('Getting templates:', bdyq2);
    //devLog('Templates response:', response);
    return response.data;
  },

  async getById(id: string): Promise<JournalTemplate | null> {
    let params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      templateId: id
    }

    let bdyq2 = {
      query: "getJournalTemplateById",
      params
    }

    const response = await fetchGraphQLSS(bdyq2);
    return response[0] || null;
  },

  async create(template: Omit<JournalTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>): Promise<JournalTemplate> {
    let params: Record<string, any> = {
      businessId: authStore.getBusinessId()
    }

    let bdyq2 = {
      query: "addDynamicTemplate",
      params,
      form: {
        ...template,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        usageCount: 0,
        businessId: authStore.getBusinessId(),
        createdBy: authStore.state.user?.uid || 'user'
      }
    }

    //devLog('Creating template:', bdyq2);

    const response = await fetchGraphQLSS(bdyq2);
    //devLog('Template creation response:', response);
    return response;
  },

  async update(id: string, updates: Partial<JournalTemplate>): Promise<JournalTemplate> {
    let params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      id: id
    }

    let bdyq2 = {
      query: "updateDynamicTemplate",
      params,
      form: {
        ...updates,
        updatedAt: new Date().toISOString(),
        businessId: authStore.getBusinessId()
      }
    }



    const response = await fetchGraphQLSS(bdyq2);
    //devLog('Updating template:', bdyq2);
    //devLog('Template update response:', response);
    return response;
  },

  async delete(id: string): Promise<{ success: boolean; message: string }> {
    let params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      id
    }

    let bdyq2 = {
      query: "deleteDynamicTemplate",
      params
    }

    devLog('Deleting template:', bdyq2);

    const response = await fetchGraphQLSS(bdyq2);
    devLog('Template deletion response:', response);
    return { success: true, message: 'Template deleted successfully' };
  },

  async incrementUsage(id: string): Promise<void> {
    let params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      templateId: id
    }

    let bdyq2 = {
      query: "incrementDynamicTemplateUsage",
      params,
      form: {
        lastUsed: new Date().toISOString()
      }
    }

    devLog('Incrementing template usage:', bdyq2);

    await fetchGraphQLSS(bdyq2);
  },

  async getStats(): Promise<{ totalTemplates: number; activeTemplates: number; categories: number; mostUsed: JournalTemplate[] }> {
    let params: Record<string, any> = {
      businessId: authStore.getBusinessId()
    }

    let bdyq2 = {
      query: "getJournalTemplateStats",
      params
    }

    const response = await fetchGraphQLSS(bdyq2);
    return response || {
      totalTemplates: 0,
      activeTemplates: 0,
      categories: 0,
      mostUsed: []
    };
  }
};

// Utility functions
export const utilsApi = {
  async getNextEntryNumber(): Promise<string> {
    return hybridCall(
      async () => {
        devLog('Getting next entry number via real API');
        throw new Error('Real API not implemented yet');
      },
      () => fakeServer.utils.getNextEntryNumber()
    );
  },

  async getNextProductCode(category: string): Promise<string> {
    return hybridCall(
      async () => {
        devLog('Getting next product code via real API:', category);
        throw new Error('Real API not implemented yet');
      },
      () => fakeServer.utils.getNextProductCode(category)
    );
  },

  async healthCheck(): Promise<{ status: string; timestamp: string; version: string }> {
    return hybridCall(
      async () => {
        // Real API health check
        const response = await fetch('/api/health');
        if (!response.ok) throw new Error('Health check failed');
        return response.json();
      },
      () => fakeServer.utils.healthCheck()
    );
  },

  async getStats(): Promise<Record<string, number>> {
    return hybridCall(
      async () => {
        devLog('Getting stats via real API');
        throw new Error('Real API not implemented yet');
      },
      () => fakeServer.utils.getStats()
    );
  }
};

// YABA Offers API Adapter
export const yabaOffersApi = {
  /**
   * Get all YABA shipping offers
   */
  async getAll(filters?: any): Promise<any[]> {
    try {
      let params: Record<string, any> = {
        businessId: authStore.getBusinessId()
      };

      if (filters?.method) {
        params.method = filters.method;
      }

      if (filters?.category) {
        params.category = filters.category;
      }

      let bdyq2 = {
        query: "listYabaOffers",
        params
      };

      const response = await fetchGraphQLSS(bdyq2);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching YABA offers:', error);
      return [];
    }
  },

  /**
   * Create a new YABA offer
   */
  async create(
    offerData: any,
    metadata?: {
      name?: string;
      code?: string;
      isActive?: boolean;
      isVisible?: boolean;
      businessId?: string;
    }
  ): Promise<any> {
    try {
      // Use businessId from metadata if provided (for admins), otherwise use current user's businessId
      const targetBusinessId = metadata?.businessId || authStore.getBusinessId();

      let params: Record<string, any> = {
        businessId: targetBusinessId,
        userId: authStore.state?.user?.uid,
        timestamp: new Date().getTime()
      };

      let name = metadata?.name || ``;
      let code = metadata?.code || `${generateShortCode(6)}_${generateShortCode(6)}`;
      let bdyq2 = {
        query: "createYabaOffer",
        params,
        form: {
          id: generateShortCode(16),
          offerCode: code,
          offerName: name,
          isActive: metadata?.isActive ?? true,
          isVisible: metadata?.isVisible ?? true,
          businessId: targetBusinessId,
          offerType: "all",
          offers: JSON.stringify(offerData),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      };

      const response = await fetchGraphQLSS(bdyq2);
      return response.data || response;
    } catch (error) {
      console.error('Error creating YABA offer:', error);
      throw error;
    }
  },

  /**
   * Update an existing YABA offer
   */
  async update(
    offerId: string,
    offerData: any,
    metadata?: {
      name?: string;
      code?: string;
      isActive?: boolean;
      isVisible?: boolean;
      businessId?: string;
      originalBusinessId?: string;
    }
  ): Promise<any> {
    try {
      // Use originalBusinessId to FIND the record (if changing businessId)
      // Otherwise use the current businessId
      const queryBusinessId = metadata?.originalBusinessId || metadata?.businessId || authStore.getBusinessId();

      let params: Record<string, any> = {
        businessId: queryBusinessId,  // Use original businessId to find the record
        id: offerId,
        userId: authStore.state?.user?.uid,
        timestamp: new Date().getTime()
      };

      let form: any = {
        offers: JSON.stringify(offerData),
        updatedAt: new Date().toISOString()
      };

      // Add metadata fields if provided
      if (metadata?.name) {
        form.offerName = metadata.name;
      }
      if (metadata?.code) {
        form.offerCode = metadata.code;
      }
      if (metadata?.isActive !== undefined) {
        form.isActive = metadata.isActive;
      }
      if (metadata?.isVisible !== undefined) {
        form.isVisible = metadata.isVisible;
      }
      // Update to new businessId in form data (this changes the value)
      if (metadata?.businessId) {
        form.businessId = metadata.businessId;
      }

      let bdyq2 = {
        query: "updateYabaOffer",
        params,
        form
      };

      devLog('🔄 Updating offer:', {
        offerId,
        queryBusinessId,
        newBusinessId: metadata?.businessId,
        hasBusinessIdChange: metadata?.businessId !== metadata?.originalBusinessId
      });

      const response = await fetchGraphQLSS(bdyq2);
      return response.data || response;
    } catch (error) {
      console.error('Error updating YABA offer:', error);
      throw error;
    }
  },

  /**
   * Delete a YABA offer
   */
  async delete(offerId: string): Promise<{ success: boolean; message: string }> {
    try {
      let params: Record<string, any> = {
        businessId: authStore.getBusinessId(),
        id: offerId,
        userId: authStore.state?.user?.uid
      };

      let bdyq2 = {
        query: "deleteYabaOffer",
        params
      };

      const response = await fetchGraphQLSS(bdyq2);

      return {
        success: true,
        message: 'Oferta eliminada exitosamente'
      };
    } catch (error) {
      console.error('Error deleting YABA offer:', error);
      return {
        success: false,
        message: error?.message || 'Error al eliminar oferta'
      };
    }
  }
};

// Users API Adapter
export const usersApi = {
  /**
   * Get all users from the system
   */
  async getAll(filters?: any): Promise<any[]> {
    try {
      let params: Record<string, any> = {
        businessId: "all", // Get users from all businesses for admin
        userId: authStore.state?.user?.uid,
        timestamp: new Date().getTime()
      };

      // Add filter parameters if provided
      if (filters?.businessId && filters.businessId !== 'all') {
        params.businessId = filters.businessId;
      }

      let bdyq2 = {
        query: "getAllUsers",
        params
      };

      devLog('🔍 Fetching all users:', bdyq2);

      const response = await fetchGraphQLSS(bdyq2);
      devLog('✅ Users fetched:', response.data?.length || 0, 'users');

      return response.data || [];
    } catch (error) {
      console.error('❌ Error fetching users:', error);
      return [];
    }
  },

  /**
   * Get a single user by ID
   */
  async getById(userId: string): Promise<any | null> {
    try {
      let params: Record<string, any> = {
        businessId: "all",
        id: userId,
        userId: authStore.state?.user?.uid
      };

      let bdyq2 = {
        query: "getUserById",
        params
      };

      const response = await fetchGraphQLSS(bdyq2);
      return response.data?.[0] || null;
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      return null;
    }
  },

  /**
   * Update user permissions and profile
   * Backend query: updateUserPermissions
   * Required: userId
   * Optional: permissions (object), role (string), stores (object)
   */
  async updatePermissions(
    userId: string,
    data: {
      permissions?: {
        AccountAccess?: boolean;
        BankingAccess?: boolean;
        InventoryAccess?: boolean;
        EmployeeAccess?: boolean;
        invoiceAccess?: boolean;
        JournalAccess?: boolean;
        HBLAccess?: boolean;
        HBLAccessManagement?: boolean;
        PassportAccess?: boolean;
        AdminPassportAccess?: boolean;
        PurchaseRequestAccess?: boolean;
        RemittanceAccess?: boolean;
        NotaryAccess?: boolean;
        offersManagementAccess?: boolean;
        AppointmentAccess?: boolean;
        inventoryDownsection?: boolean;
        onlyRead?: boolean;
        read_write?: boolean;
        isAdmin?: boolean;
      };
      statusLocationPermissions: Record<string, boolean>;
      role?: string;
      stores?: Record<string, boolean>;
      businessId?: string;
      businessIds?: string[];
    }
  ): Promise<any> {
    try {
      let params: Record<string, any> = {
        businessId: "all",
        userId: userId, // Required parameter
        timestamp: new Date().getTime(),
        adminUserId: authStore.state?.user?.uid // User making the change
      };

      let form: any = {
        updatedAt: new Date().toISOString()
      };

      // Add optional parameters if provided
      if (data.permissions) {
        form.permissions = data.permissions;
      }

      if (data.role) {
        form.role = data.role;
      }

      if (data.stores) {
        form.stores = data.stores;
      }

      if (data.businessId) {
        form.businessId = data.businessId;
      }

      if (data.businessIds) {
        form.businessIds = data.businessIds;
      }

      if (data.statusLocationPermissions) {
        form.statusLocationPermissions = data.statusLocationPermissions;
      }


      let bdyq2 = {
        query: "updateUserPermissions",
        params,
        form
      };

      devLog('🔄 Updating user permissions:', {
        userId,
        hasPermissions: !!data.permissions,
        hasRole: !!data.role,
        hasStores: !!data.stores,
        hasPerm: data.permissions ? Object.keys(data.permissions).length : 0
      });

      const response = await fetchGraphQLSS(bdyq2);
      devLog('✅ User permissions updated successfully');

      return response.data || response;
    } catch (error) {
      console.error('❌ Error updating user permissions:', error);
      throw error;
    }
  },

};

// Bank Consolidation API Adapter
export const bankConsolidationApi = {
  // Get all bank consolidations for an account
  async getBankConsolidations(accountId: string): Promise<any[]> {
    const params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      accountId
    };

    const bdyq2 = {
      query: "getBankConsolidations",
      queryString: "accountId = :accountId",
      params
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || [];
  },

  // Get bank consolidation by ID
  async getBankConsolidationById(id: string): Promise<any | null> {
    const params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      id
    };

    const bdyq2 = {
      query: "getBankConsolidationById",
      params
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || null;
  },

  // Get all bank consolidations for the business
  async getAllBankConsolidations(): Promise<any[]> {
    const params: Record<string, any> = {
      businessId: authStore.getBusinessId()
    };

    const bdyq2 = {
      query: "getAllBankConsolidations",
      params
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || [];
  },

  // Add a new bank consolidation (single statement)
  async addBankConsolidation(statement: any): Promise<any> {
    const params: Record<string, any> = {
      businessId: authStore.getBusinessId()
    };

    const bdyq2 = {
      query: "addBankConsolidation",
      params,
      form: {
        ...statement,
        businessId: authStore.getBusinessId()
      }
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || response;
  },

  // Add bank consolidation with duplicate verification
  async addBankConsolidationVerify(statements: any[]): Promise<{ added: any[], duplicates: any[] }> {
    const params: Record<string, any> = {
      businessId: authStore.getBusinessId()
    };

    const bdyq2 = {
      query: "addBankConsolidation",
      params,
      forms: statements.map(s => ({
        ...s,
        businessId: authStore.getBusinessId()
      }))
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || { added: [], duplicates: [] };
  },

  // Update an existing bank consolidation
  async updateBankConsolidation(id: string, updates: any): Promise<any> {
    const params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      id
    };

    const bdyq2 = {
      query: "updateBankConsolidation",
      params,
      form: updates
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || response;
  },

  // Delete a bank consolidation
  async deleteBankConsolidation(id: string): Promise<boolean> {
    const params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      id
    };

    const bdyq2 = {
      query: "deleteBankConsolidation",
      params
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.success || false;
  },

  // Search bank consolidations
  async searchBankConsolidations(searchTerm: string, accountId?: string): Promise<any[]> {
    const params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      searchTerm
    };

    if (accountId) {
      params.accountId = accountId;
    }

    const bdyq2 = {
      query: "searchBankConsolidations",
      queryString: accountId
        ? "accountId = :accountId AND (description contain :searchTerm OR reference contain :searchTerm)"
        : "description contain :searchTerm OR reference contain :searchTerm",
      params
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || [];
  },

  // Get bank consolidations by date range
  async getBankConsolidationsByDateRange(accountId: string, startDate: string, endDate: string): Promise<any[]> {

    // parseDateMMDDYYYY

    const formatDate = (dateStr: string) => {
      return new Date(dateStr).toLocaleDateString('es-ES', {

        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      });
    };


    const params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      accountId,
      startDate: formatDate(startDate),
      endDate: formatDate(endDate)
    };

    const bdyq2 = {
      query: "getBankConsolidations",
      queryString: "accountId = :accountId AND date >= :startDate AND date <= :endDate",
      params
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || [];
  },

  // Get bank consolidations by reconciliation status
  async getBankConsolidationsByStatus(accountId: string, isReconciled: boolean): Promise<any[]> {
    const params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      accountId,
      isReconciled
    };

    const bdyq2 = {
      query: "getBankConsolidationsByStatus",
      queryString: "accountId = :accountId AND isReconciled = :isReconciled",
      params
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || [];
  },

  // Bulk add bank consolidations from CSV
  async bulkAddBankConsolidations(statements: any[]): Promise<{ success: number; failed: number; results: any[] }> {
    const params: Record<string, any> = {
      businessId: authStore.getBusinessId()
    };

    const bdyq2 = {
      query: "addBankConsolidation",
      params,
      forms: statements.map(s => ({
        ...s,
        businessId: authStore.getBusinessId()
      }))
    };

    try {
      const response = await fetchGraphQLSS(bdyq2);
      const results = response.data || [];
      return {
        success: results.filter((r: any) => r.success).length,
        failed: results.filter((r: any) => !r.success).length,
        results
      };
    } catch (error) {
      console.error('Error bulk adding bank consolidations:', error);
      throw error;
    }
  },

  // Update reconciliation status
  async updateReconciliationStatus(id: string, isReconciled: boolean, reconciledWith?: string): Promise<any> {
    const params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      id
    };

    const bdyq2 = {
      query: "updateBankConsolidation",
      params,
      form: {
        isReconciled,
        reconciledWith: reconciledWith || null
      }
    };

    const response = await fetchGraphQLSS(bdyq2);


    const bdyqEnt = {
      query: "getEntryBookById",
      params: {
        businessId: authStore.getBusinessId(),
        id: reconciledWith?.split("_")[0]
      }
    };

    let bookEntry = await fetchGraphQLSS(bdyqEnt);

    if (bookEntry?.id) {
      const paramsQ: Record<string, any> = {
        businessId: authStore.getBusinessId(),
        id: bookEntry.id
      };

      let lines = bookEntry.lines;

      let hh = bankConsolidationStore.entryBookRecords.filter(r => r.id === reconciledWith)?.[0];


      const fillField = (r: any) => {
        let amm = r.creditAmount || r.debitAmount;
        let amh = hh.creditAmount || hh.debitAmount;
        if (!r.lineId) {
          r.lineId = generateShortCode(10);
        }
        if (r.lineId === hh.id) {
          r.isReconciled = true;
          r.reconciledWith = id || null;
        }
        else if (amm === amh && hh.accountId === r.accountId) {
          r.isReconciled = true;
          r.reconciledWith = id || null;
        }
        return r;
      }

      lines = lines.map(fillField)

      const bdyq = {
        query: "updateEntryBook",
        params: paramsQ,
        form: {
          lines
        }
      };

      const response2 = await fetchGraphQLSS(bdyq);


    }
    return response.data || response;
  }
};

// Business API Adapter
export const businessApi = {
  // Get business by current context
  async getBusiness(): Promise<any | null> {
    const params: Record<string, any> = {
      businessId: authStore.getBusinessId()
    };

    const bdyq2 = {
      query: "getBusiness",
      params
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || null;
  },

  // Get business by ID
  async getBusinessById(id: string): Promise<any | null> {
    const params: Record<string, any> = {
      id
    };

    const bdyq2 = {
      query: "getBusinessById",
      params
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || null;
  },

  // Get all businesses
  async getAllBusiness(): Promise<any[]> {
    const bdyq2 = {
      query: "getAllBusiness",
      params: {}
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || [];
  },

  // Add a new business
  async addBusiness(business: any): Promise<any> {
    const bdyq2 = {
      query: "addBusiness",
      params: {},
      form: business
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || response;
  },

  // Add business with verification (check for duplicates)
  async addBusinessVerify(business: any): Promise<{ added: any | null, duplicate: boolean }> {
    const bdyq2 = {
      query: "addBusinessVerify",
      params: {},
      form: business
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || { added: null, duplicate: false };
  },

  // Update an existing business
  async updateBusiness(id: string, updates: any): Promise<any> {
    const params: Record<string, any> = {
      id
    };

    const bdyq2 = {
      query: "updateBusiness",
      params,
      form: updates
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || response;
  },

  // Delete a business
  async deleteBusiness(id: string): Promise<boolean> {
    const params: Record<string, any> = {
      id
    };

    const bdyq2 = {
      query: "deleteBusiness",
      params
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.success || false;
  },

  // Search businesses
  async searchBusiness(searchTerm: string): Promise<any[]> {
    const params: Record<string, any> = {
      searchTerm
    };

    const bdyq2 = {
      query: "searchBusiness",
      queryString: "name contain :searchTerm OR id contain :searchTerm",
      params
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || [];
  },

  // Get businesses by status (active/inactive)
  async getBusinessByStatus(isActive: boolean): Promise<any[]> {
    const params: Record<string, any> = {
      isActive
    };

    const bdyq2 = {
      query: "getBusinessByStatus",
      queryString: "isActive = :isActive",
      params
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || [];
  },

  // Get businesses by type
  async getBusinessByType(type: string): Promise<any[]> {
    const params: Record<string, any> = {
      type
    };

    const bdyq2 = {
      query: "getBusinessByType",
      queryString: "type = :type",
      params
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || [];
  },

  // Get businesses by industry
  async getBusinessByIndustry(industry: string): Promise<any[]> {
    const params: Record<string, any> = {
      industry
    };

    const bdyq2 = {
      query: "getBusinessByIndustry",
      queryString: "industry = :industry",
      params
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || [];
  },

  // Get businesses by country
  async getBusinessByCountry(country: string): Promise<any[]> {
    const params: Record<string, any> = {
      country
    };

    const bdyq2 = {
      query: "getBusinessByCountry",
      queryString: "country = :country",
      params
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || [];
  },

  // Get businesses by date range
  async getBusinessByDateRange(startDate: string, endDate: string): Promise<any[]> {
    const params: Record<string, any> = {
      startDate,
      endDate
    };

    const bdyq2 = {
      query: "getBusinessByDateRange",
      queryString: "createdAt >= :startDate AND createdAt <= :endDate",
      params
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || [];
  },

  // Get business statistics
  async getBusinessStats(): Promise<any> {
    const bdyq2 = {
      query: "getBusinessStats",
      params: {}
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || {};
  }
};

// Stores API Adapter
export const storesApi = {
  // Get stores for current business
  async getStores(): Promise<any[]> {
    const params: Record<string, any> = {
      businessId: authStore.getBusinessId()
    };

    const bdyq2 = {
      query: "getStores",
      queryString: "businessId = :businessId",
      params
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || [];
  },

  // Get store by ID
  async getStoreById(id: string): Promise<any | null> {
    const params: Record<string, any> = {
      id
    };

    const bdyq2 = {
      query: "getStoreById",
      params
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || null;
  },

  // Get all stores (across all businesses - admin only)
  async getAllStores(): Promise<any[]> {
    const bdyq2 = {
      query: "getAllStores",
      params: {}
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || [];
  },

  // Add a new store
  async addStore(store: any): Promise<any> {
    const params: Record<string, any> = {
      businessId: authStore.getBusinessId()
    };

    const bdyq2 = {
      query: "addStore",
      params,
      form: {
        ...store,
        businessId: authStore.getBusinessId()
      }
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || response;
  },

  // Add store with verification (check for duplicates)
  async addStoreVerify(store: any): Promise<{ added: any | null, duplicate: boolean }> {
    const params: Record<string, any> = {
      businessId: authStore.getBusinessId()
    };

    const bdyq2 = {
      query: "addStoreVerify",
      params,
      form: {
        ...store,
        businessId: authStore.getBusinessId()
      }
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || { added: null, duplicate: false };
  },

  // Update an existing store
  async updateStore(id: string, updates: any): Promise<any> {
    const params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      id
    };

    const bdyq2 = {
      query: "updateStore",
      params,
      form: updates
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || response;
  },

  // Delete a store
  async deleteStore(id: string): Promise<boolean> {
    const params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      id
    };

    const bdyq2 = {
      query: "deleteStore",
      params
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.success || false;
  },

  // Search stores
  async searchStores(searchTerm: string): Promise<any[]> {
    const params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      searchTerm
    };

    const bdyq2 = {
      query: "searchStores",
      queryString: "businessId = :businessId AND (name contain :searchTerm OR code contain :searchTerm)",
      params
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || [];
  },

  // Get stores by status (active/inactive)
  async getStoresByStatus(isActive: boolean): Promise<any[]> {
    const params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      isActive
    };

    const bdyq2 = {
      query: "getStoresByStatus",
      queryString: "businessId = :businessId AND isActive = :isActive",
      params
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || [];
  },

  // Get stores by type
  async getStoresByType(type: string): Promise<any[]> {
    const params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      type
    };

    const bdyq2 = {
      query: "getStoresByType",
      queryString: "businessId = :businessId AND type = :type",
      params
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || [];
  },

  // Get stores by business ID
  async getStoresByBusiness(businessId: string): Promise<any[]> {
    const params: Record<string, any> = {
      businessId
    };

    const bdyq2 = {
      query: "getStoresByBusiness",
      queryString: "businessId = :businessId",
      params
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || [];
  },

  // Get stores by location
  async getStoresByLocation(location: string): Promise<any[]> {
    const params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      location
    };

    const bdyq2 = {
      query: "getStoresByLocation",
      queryString: "businessId = :businessId AND location contain :location",
      params
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || [];
  },

  // Get active stores for current business
  async getActiveStores(): Promise<any[]> {
    const params: Record<string, any> = {
      businessId: authStore.getBusinessId()
    };

    const bdyq2 = {
      query: "getActiveStores",
      queryString: "businessId = :businessId AND isActive = true",
      params
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || [];
  },

  // Get stores statistics
  async getStoresStats(): Promise<any> {
    const params: Record<string, any> = {
      businessId: authStore.getBusinessId()
    };

    const bdyq2 = {
      query: "getStoresStats",
      params
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || {};
  },

  // Get stores by manager
  async getStoresByManager(managerId: string): Promise<any[]> {
    const params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      managerId
    };

    const bdyq2 = {
      query: "getStoresByManager",
      queryString: "businessId = :businessId AND managerId = :managerId",
      params
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || [];
  }
};

// All adapters are exported individually above



export const automationApi = {
  async generateRuleFromData(inputData: any, businessId: string, eventType: string): Promise<any> {
    
    const response = await fetchGraphQLSS({
      query: 'generateRuleFromData',
      businessId,
      eventType,
      inputData
    });

    return response?.data || null;
  }
};