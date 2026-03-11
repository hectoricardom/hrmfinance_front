/**
 * Payer API Service
 * Server-side API for searching and managing payer/employer records
 * Used for generating 1099-NEC, W-2, and other tax forms
 */

import { fetchGraphQLSS, devLog } from '../../../services/utils';
import { authStore } from '../../../stores/authStore';
import type { SavedPayer, PayerDocumentType } from '../stores/payerStore';

// API response type for payer
export interface PayerApiResponse {
  id: string;
  name: string;
  dba?: string;
  ein: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  documentTypes?: PayerDocumentType[];
  taxYears?: number[];
  notes?: string;
  createdAt?: string | number;
  updatedAt?: string | number;
}

// Search result with pagination
export interface PayerSearchResult {
  payers: SavedPayer[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Convert API response to SavedPayer
function apiResponseToSavedPayer(response: PayerApiResponse): SavedPayer {
  return {
    id: response.id,
    name: response.name || '',
    dba: response.dba,
    ein: response.ein || '',
    address: response.address || '',
    city: response.city || '',
    state: response.state || '',
    zip: response.zip || '',
    phone: response.phone || '',
    documentTypes: response.documentTypes || [],
    taxYears: response.taxYears || [],
    notes: response.notes,
    createdAt: typeof response.createdAt === 'string'
      ? new Date(response.createdAt).getTime()
      : response.createdAt || Date.now(),
    updatedAt: typeof response.updatedAt === 'string'
      ? new Date(response.updatedAt).getTime()
      : response.updatedAt || Date.now()
  };
}

/**
 * Search payers by name or EIN from server
 * @param query - Search term (matches name, DBA, or EIN)
 * @param options - Optional filters and pagination
 */
export async function searchPayers(
  query: string,
  options?: {
    state?: string;
    documentType?: PayerDocumentType;
    taxYear?: number;
    page?: number;
    pageSize?: number;
  }
): Promise<PayerSearchResult> {
  try {
    const result = await fetchGraphQLSS({
      query: 'searchPayers',
      params: {
        businessId: authStore.getBusinessId(),
        searchQuery: query,
        search: query,
      },
      form: {
        searchQuery: query,
        search: query,
        state: options?.state,
        documentType: options?.documentType,
        taxYear: options?.taxYear,
        page: options?.page || 1,
        pageSize: options?.pageSize || 20
      }
    });

    const payers = (result?.payers || result?.data || []).map(apiResponseToSavedPayer);

    return {
      payers,
      total: result?.total || payers.length,
      page: result?.page || 1,
      pageSize: result?.pageSize || 20,
      hasMore: result?.hasMore || false
    };
  } catch (error) {
    devLog('Error searching payers:', error);
    return {
      payers: [],
      total: 0,
      page: 1,
      pageSize: 20,
      hasMore: false
    };
  }
}

/**
 * Get all payers for the business
 */
export async function getAllPayers(
  options?: {
    page?: number;
    pageSize?: number;
  }
): Promise<PayerSearchResult> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getAllPayers',
      params: {
        businessId: authStore.getBusinessId(),
      },
      form: {
        page: options?.page || 1,
        pageSize: options?.pageSize || 400
      }
    });

    devLog('[getAllPayers] Raw result:', result);
    devLog('[getAllPayers] businessId:', authStore.getBusinessId());

    const payers = (result?.payers || result?.data || []).map(apiResponseToSavedPayer);
    devLog('[getAllPayers] Parsed payers count:', payers.length);
    devLog('[getAllPayers] Payer EINs:', payers.map(p => p.ein));

    return {
      payers,
      total: result?.total || payers.length,
      page: result?.page || 1,
      pageSize: result?.pageSize || 100,
      hasMore: result?.hasMore || false
    };
  } catch (error) {
    devLog('Error getting all payers:', error);
    return {
      payers: [],
      total: 0,
      page: 1,
      pageSize: 100,
      hasMore: false
    };
  }
}

/**
 * Get a payer by ID
 */
export async function getPayerById(payerId: string): Promise<SavedPayer | null> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getPayerById',
      params: {
        businessId: authStore.getBusinessId()
      },
      form: {
        payerId
      }
    });

    if (result?.payer) {
      return apiResponseToSavedPayer(result.payer);
    }

    return null;
  } catch (error) {
    devLog('Error getting payer by ID:', error);
    return null;
  }
}

/**
 * Get a payer by EIN
 */
export async function getPayerByEIN(ein: string): Promise<SavedPayer | null> {
  try {
    // Normalize EIN format (remove dashes)
    const normalizedEin = ein.replace(/\D/g, '');

    const result = await fetchGraphQLSS({
      query: 'getPayerByEIN',
      params: {
        businessId: authStore.getBusinessId(),
        ein: normalizedEin
      },
      form: {
        ein: normalizedEin
      }
    });

    if (result?.payer) {
      return apiResponseToSavedPayer(result.payer);
    }

    return null;
  } catch (error) {
    devLog('Error getting payer by EIN:', error);
    return null;
  }
}

/**
 * Create a new payer
 */
export async function createPayer(
  payerData: Omit<SavedPayer, 'id' | 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; payer?: SavedPayer; error?: string }> {
  try {
    const result = await fetchGraphQLSS({
      query: 'addPayer',
      params: {
        businessId: authStore.getBusinessId()
      },
      form: {
        name: payerData.name,
        dba: payerData.dba,
        ein: payerData.ein.replace(/\D/g, ''), // Normalize EIN
        address: payerData.address,
        city: payerData.city,
        state: payerData.state,
        zip: payerData.zip,
        phone: payerData.phone,
        documentTypes: payerData.documentTypes,
        taxYears: payerData.taxYears,
        notes: payerData.notes
      }
    });

    if (result?.success && result?.payer) {
      return {
        success: true,
        payer: apiResponseToSavedPayer(result.payer)
      };
    }

    return {
      success: false,
      error: result?.error || 'Failed to create payer'
    };
  } catch (error) {
    devLog('Error creating payer:', error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
}

/**
 * Update an existing payer
 */
export async function updatePayer(
  payerId: string,
  updates: Partial<Omit<SavedPayer, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<{ success: boolean; payer?: SavedPayer; error?: string }> {
  try {
    const formData: Record<string, any> = { payerId };

    if (updates.name !== undefined) formData.name = updates.name;
    if (updates.dba !== undefined) formData.dba = updates.dba;
    if (updates.ein !== undefined) formData.ein = updates.ein.replace(/\D/g, '');
    if (updates.address !== undefined) formData.address = updates.address;
    if (updates.city !== undefined) formData.city = updates.city;
    if (updates.state !== undefined) formData.state = updates.state;
    if (updates.zip !== undefined) formData.zip = updates.zip;
    if (updates.phone !== undefined) formData.phone = updates.phone;
    if (updates.documentTypes !== undefined) formData.documentTypes = updates.documentTypes;
    if (updates.taxYears !== undefined) formData.taxYears = updates.taxYears;
    if (updates.notes !== undefined) formData.notes = updates.notes;

    const result = await fetchGraphQLSS({
      query: 'updatePayer',
      params: {
        businessId: authStore.getBusinessId()
      },
      form: formData
    });

    if (result?.success && result?.payer) {
      return {
        success: true,
        payer: apiResponseToSavedPayer(result.payer)
      };
    }

    return {
      success: false,
      error: result?.error || 'Failed to update payer'
    };
  } catch (error) {
    devLog('Error updating payer:', error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
}

/**
 * Delete a payer
 */
export async function deletePayer(
  payerId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await fetchGraphQLSS({
      query: 'deletePayer',
      params: {
        businessId: authStore.getBusinessId()
      },
      form: {
        payerId
      }
    });

    return {
      success: result?.success || false,
      error: result?.error
    };
  } catch (error) {
    devLog('Error deleting payer:', error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
}

/**
 * Upsert a payer (create or update based on EIN match)
 */
export async function upsertPayer(
  payerData: Omit<SavedPayer, 'id' | 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; payer?: SavedPayer; isNew: boolean; error?: string }> {
  try {
    const result = await fetchGraphQLSS({
      query: 'upsertPayer',
      params: {
        businessId: authStore.getBusinessId()
      },
      form: {
        name: payerData.name,
        dba: payerData.dba,
        ein: payerData.ein.replace(/\D/g, ''),
        address: payerData.address,
        city: payerData.city,
        state: payerData.state,
        zip: payerData.zip,
        phone: payerData.phone,
        documentTypes: payerData.documentTypes,
        taxYears: payerData.taxYears,
        notes: payerData.notes
      }
    });

    if (result?.success && result?.payer) {
      return {
        success: true,
        payer: apiResponseToSavedPayer(result.payer),
        isNew: result.isNew || false
      };
    }

    return {
      success: false,
      isNew: false,
      error: result?.error || 'Failed to upsert payer'
    };
  } catch (error) {
    devLog('Error upserting payer:', error);
    return {
      success: false,
      isNew: false,
      error: (error as Error).message
    };
  }
}

/**
 * Get payer statistics
 */
export async function getPayerStats(): Promise<{
  totalPayers: number;
  payersByState: Record<string, number>;
  payersByDocumentType: Record<string, number>;
  recentPayers: SavedPayer[];
}> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getPayerStats',
      params: {
        businessId: authStore.getBusinessId()
      }
    });

    return {
      totalPayers: result?.totalPayers || 0,
      payersByState: result?.payersByState || {},
      payersByDocumentType: result?.payersByDocumentType || {},
      recentPayers: (result?.recentPayers || []).map(apiResponseToSavedPayer)
    };
  } catch (error) {
    devLog('Error getting payer stats:', error);
    return {
      totalPayers: 0,
      payersByState: {},
      payersByDocumentType: {},
      recentPayers: []
    };
  }
}
