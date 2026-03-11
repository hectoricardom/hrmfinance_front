/**
 * Tax Portal API Service
 * Manages Tax Portals (clients) and Document Requests
 * Supports public access via magic link, PIN, or QR code
 */

import { devLog, fetchGraphQLSS, fetchPublicSS, generateRandomId } from '../../../services/utils';
import { authStore } from '../../../stores/authStore';
import type {
  TaxPortal,
  TaxDocumentRequest,
  TaxYear,
  RequestedDocumentType,
  DrakeTaxDocumentType
} from '../types/drakeTypes';
import { DEFAULT_REQUESTED_DOCUMENTS } from '../types/drakeTypes';
import { calculateForm8962FromDocuments, type Form8962Result } from './form8962Calculator';

// ============================================
// Tax Portal CRUD Operations
// ============================================

/**
 * Create a new Tax Portal (client)
 */
export const createTaxPortal = async (portal: Omit<TaxPortal, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>): Promise<TaxPortal> => {
  try {
    const currentUser = authStore.state.profile
    if (!currentUser?.uid) {
      //throw new Error('Usuario no autenticado');
    }

    const now = Date.now();
    const newPortal: TaxPortal = {
      ...portal,
      id: generateRandomId(),
      businessId: authStore.getBusinessId(),
      createdAt: now,
      updatedAt: now,
      createdBy: currentUser.uid,
      documentCount: 0,
      verifiedDocumentCount: 0,
    };

    const body = {
      query: "addTaxPortal",
      params: {
        businessId: authStore.getBusinessId()
      },
      form: newPortal
    };

    devLog('Creating tax portal:', body);
    const response = await fetchGraphQLSS(body);

    return response?.taxPortal || newPortal;
  } catch (error) {
    devLog('Error creating tax portal:', error);
    throw new Error('Error al crear el portal de impuestos');
  }
};

/**
 * Get all Tax Portals for the business
 */
export const getTaxPortals = async (searchTerm?: string): Promise<TaxPortal[]> => {
  try {
    const currentUser = authStore.state.user;
    if (!currentUser) {
      throw new Error('Usuario no autenticado');
    }

    let params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
    };

    // Add search terms if provided
    if (searchTerm && searchTerm.trim()) {
      searchTerm.split(" ").forEach((query, index) => {
        if (query) {
          params[`:search${index + 1}`] = query.trim();
        }
      });
    }

    const body = {
      query: "getTaxPortal",
      params,
      queryString: "!* contain :search0 AND !* contain :search1 AND !* contain :search2 AND !* contain :search3 AND !* contain :search4 AND type = :type"
    
    };

    const response = await fetchGraphQLSS(body);
    let rawData: any[] = response?.data || [];

    // Filter to only include actual TaxPortal records (not documents or checklists)
    let portals: TaxPortal[] = rawData.filter(item => {
      // Exclude items with type field (documents, checklists, etc.)
      if (item.type === 'document' || item.type === 'checklist') {
        return false;
      }
      // Must have firstName or lastName to be a valid TaxPortal
      return item.firstName || item.lastName;
    });

    // Filter by store if not admin
    if (!authStore.isAdmin()) {
      const allowedStoreIds = authStore.getAllowedStoreIds();
      portals = portals.filter(portal => {
        if (!portal.storeId) return true;
        return allowedStoreIds.includes(portal.storeId);
      });
    }

    return portals;
  } catch (error) {
    devLog('Error getting tax portals:', error);
    return [];
  }
};

/**
 * Get a single Tax Portal by ID
 */
export const getTaxPortalById = async (id: string): Promise<TaxPortal | null> => {
  try {
    const body = {
      query: "getTaxPortal",
      params: {
        businessId: authStore.getBusinessId(),
        id
      }
    };

    const response = await fetchGraphQLSS(body);
    // Handle nested response: response.data or response.taxPortal
    const arrL = response?.data?.taxPortal || response?.data || response?.taxPortal;
    
    
    const portal = arrL.filter((r)=> r.id === id);
    //devLog('getTaxPortalById response:', response, 'extracted portal:', portal);
    return portal?.[0] || null;
  } catch (error) {
    devLog('Error getting tax portal:', error);
    return null;
  }
};

/**
 * Update a Tax Portal
 */
export const updateTaxPortal = async (id: string, updates: Partial<TaxPortal>): Promise<TaxPortal> => {
  try {
    const body = {
      query: "updateTaxPortal",
      params: {
        businessId: authStore.getBusinessId(),
        id
      },
      form: {
        ...updates,
        updatedAt: Date.now()
      }
    };

    const response = await fetchGraphQLSS(body);
    return response?.taxPortal || { id, ...updates } as TaxPortal;
  } catch (error) {
    devLog('Error updating tax portal:', error);
    throw new Error('Error al actualizar el portal de impuestos');
  }
};

/**
 * Delete a Tax Portal
 */
export const deleteTaxPortal = async (id: string): Promise<void> => {
  try {
    const body = {
      query: "deleteTaxPortal",
      params: {
        businessId: authStore.getBusinessId(),
        id
      }
    };

    await fetchGraphQLSS(body);
  } catch (error) {
    devLog('Error deleting tax portal:', error);
    throw new Error('Error al eliminar el portal de impuestos');
  }
};

// ============================================
// Document Request Operations
// ============================================

/**
 * Generate a unique access token for magic link
 */
const generateAccessToken = (): string => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 12);
  return `TDR-${timestamp}-${randomStr}`.toUpperCase();
};

/**
 * Generate a 6-digit PIN code
 */
const generatePin = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Generate QR code URL for the access link
 */
const generateQrCodeUrl = (id:string, accessToken: string): string => {
  const link = `${window.location.origin}/#/tax-upload/${id}/${accessToken}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}`;
};

/**
 * Create a new Document Request
*/


export const createDocumentRequest = async (
  taxPortal: TaxPortal,
  options: {
    taxYear: TaxYear;
    requestedDocuments?: RequestedDocumentType[];
    instructions?: string;
    expirationDays?: number;
    task?: any
  }
): Promise<TaxDocumentRequest> => {
  try {
    const currentUser = authStore.state.profile;
    if (!currentUser?.uid) {
      // throw new Error('Usuario no autenticado');
    }

    const now = Date.now();
    const expirationDays = options.expirationDays || 30;
    const accessToken = generateAccessToken();
    const _id = generateRandomId()

    const request: TaxDocumentRequest = {
      id: _id,
      title: options?.task?.title || `Document Request - ${taxPortal?.firstName} ${taxPortal?.lastName}`.trim(),
      taxPortalId: taxPortal?.id,
      recipientName: `${taxPortal?.firstName} ${taxPortal?.lastName}`.trim(),
      clientName: `${taxPortal?.firstName} ${taxPortal?.lastName}`.trim(),
      clientEmail: taxPortal?.email,
      recipientEmail: taxPortal?.email,
      clientPhone: taxPortal?.phone,
      accessToken,
      
      accessPin: generatePin(),
      qrCodeUrl: generateQrCodeUrl(_id, accessToken),
      taxYear: options.taxYear,
      requestedDocuments: options.requestedDocuments || [...DEFAULT_REQUESTED_DOCUMENTS],
      instructions: options.instructions,
      status: 'pending',
      uploadedDocuments: [],
      createdAt: now,
      expiresAt: now + expirationDays * 24 * 60 * 60 * 1000,
      requestedBy: currentUser.uid,
      requestedByName: currentUser.displayName || currentUser.email || 'Unknown',
      businessId: authStore.getBusinessId() || '',
      storeId: taxPortal?.storeId,
      storeName: taxPortal?.storeName,
    };

    const body = {
      query: "addTaxDocumentRequest",
      params: {
        businessId: authStore.getBusinessId()
      },
      form: request
    };

    //devLog('Creating document request:', body);
    const response = await fetchGraphQLSS(body);
    //const response = {}

    return response?.documentRequest || request;
  } catch (error) {
    devLog('Error creating document request:', error);
    throw new Error('Error al crear la solicitud de documentos');
  }
};

/**
 * Get Document Request by access token (public - no auth required)
 * getTaxDocumentRequestByToken
 */
export const getDocumentRequestByToken = async (id: string, accessToken: string, vs?:boolean): Promise<TaxDocumentRequest | null> => {
  try {
    const body = {
      query: "getClientPortalByToken",
      params: {
        accessToken,
        id, 
        verifySignature: vs
      }
    };

    const response = await fetchPublicSS(body);
    const request = response?.data;


    if (!request) {
      return null;
    }

    // Check if expired
    if (request.expiresAt < Date.now() && request.status === 'pending') {
      // Don't update in public context, just return expired status
      request.status = 'expired';
    }

    // Update last accessed
    try {
      await updateDocumentRequestAccess(request.id, request.businessId);
    } catch (e) {
      // Ignore access update errors
    }

    return request;
  } catch (error) {
    devLog('Error getting document request by token:', error);
    return null;
  }
};




/**
 * Get Tax Portal (client) data by document request (public - no auth required)
 * Used for client verification page
 */
export const getTaxPortalByRequest = async (requestId: string, accessToken: string): Promise<TaxPortal | null> => {
  try {
    // First get the document request to validate token and get taxPortalId
    const request = await getDocumentRequestByToken(requestId, accessToken);

    if (!request || !request.taxPortalId) {
      return null;
    }

    // Get the tax portal data
    const body = {
      query: "getTaxPortalPublic",
      params: {
        id: request.taxPortalId,
        requestId,
        accessToken
      }
    };

    const response = await fetchPublicSS(body);
    return response?.data?.[0] || response?.data || null;
  } catch (error) {
    devLog('Error getting tax portal by request:', error);
    return null;
  }
};

/**
 * Get Document Request by access token (public - no auth required)
 */
export const getSignatureRequest = async (id: string, accessToken: string, vs?:boolean): Promise<TaxDocumentRequest | null> => {
  try {
    const body = {
      query: "getSignatureValidationByToken",
      params: {
        accessToken,
        id, 
        verifySignature: vs
      }
    };

    const response = await fetchPublicSS(body);
    const request = response?.data;


    if (!request) {
      return null;
    }

    // Check if expired
    if (request.expiresAt < Date.now() && request.status === 'pending') {
      // Don't update in public context, just return expired status
      request.status = 'expired';
    }

    // Update last accessed
    try {
      await updateDocumentRequestAccess(request.id, request.businessId);
    } catch (e) {
      // Ignore access update errors
    }

    return request;
  } catch (error) {
    devLog('Error getting document request by token:', error);
    return null;
  }
};

/**
 * Get Document Request by PIN code (public - no auth required)
 */
export const getDocumentRequestByPin = async (pin: string): Promise<TaxDocumentRequest | null> => {
  try {
    const body = {
      query: "getTaxDocumentRequestByPin",
      params: {
        accessPin: pin
      }
    };

    const response = await fetchGraphQLSS(body);
    const request = response?.documentRequest;

    if (!request) {
      return null;
    }

    // Check if expired
    if (request.expiresAt < Date.now() && request.status === 'pending') {
      request.status = 'expired';
    }

    // Update last accessed
    try {
      await updateDocumentRequestAccess(request.id, request.businessId);
    } catch (e) {
      // Ignore access update errors
    }

    return request;
  } catch (error) {
    devLog('Error getting document request by PIN:', error);
    return null;
  }
};

/**
 * Update last accessed time (internal)
 */
const updateDocumentRequestAccess = async (id: string, businessId: string): Promise<void> => {
  const body = {
    query: "updateTaxDocumentRequestLastAccess",
    params: {
      businessId,
      id
    },
    form: {
      lastAccessedAt: Date.now()
    }
  };

  await fetchPublicSS(body);
};

/**
 * Get all Document Requests for a Tax Portal
 */
export const getDocumentRequestsByPortal = async (taxPortalId: string): Promise<TaxDocumentRequest[]> => {
  try {
    const body = {
      query: "getTaxDocumentRequestsByRecipient",
      params: {
        businessId: authStore.getBusinessId(),
        recipientId: taxPortalId
      }
    };

    const response = await fetchGraphQLSS(body);
    // Handle nested response structure: response.data.data or response.data
    return response?.data?.data || response?.data || [];
  } catch (error) {
    devLog('Error getting document requests:', error);
    return [];
  }
};

/**
 * Get all Document Requests for the business
 */
export const getDocumentRequests = async (
  filters?: {
    status?: TaxDocumentRequest['status'];
    taxYear?: TaxYear;
  }
): Promise<TaxDocumentRequest[]> => {
  try {
    const currentUser = authStore.state.user;
    if (!currentUser) {
      throw new Error('Usuario no autenticado');
    }

    const body = {
      query: "getTaxDocumentRequests",
      params: {
        businessId: authStore.getBusinessId()
      }
    };

    const response = await fetchGraphQLSS(body);
    // Handle nested response structure: response.data.data or response.data
    let requests: TaxDocumentRequest[] = response?.data?.data || response?.data || [];

    // Filter by store if not admin
    if (!authStore.isAdmin()) {
      const allowedStoreIds = authStore.getAllowedStoreIds();
      requests = requests.filter(req => {
        if (!req.storeId) return true;
        return allowedStoreIds.includes(req.storeId);
      });
    }

    // Apply filters
    if (filters?.status) {
      requests = requests.filter(r => r.status === filters.status);
    }
    if (filters?.taxYear) {
      requests = requests.filter(r => r.taxYear === filters.taxYear);
    }

    // Sort by created date descending
    requests.sort((a, b) => b.createdAt - a.createdAt);

    return requests;
  } catch (error) {
    devLog('Error getting document requests:', error);
    return [];
  }
};

/**
 * Mark a document as uploaded in the request (public)
 */
export const markDocumentUploaded = async (
  requestId: string,
  businessId: string,
  documentType: DrakeTaxDocumentType,
  documentId: string
): Promise<void> => {
  try {
    // First get the current request
    const body = {
      query: "getTaxDocumentRequestById",
      params: {
        businessId,
        id: requestId
      }
    };

    const response = await fetchGraphQLSS(body);
    const request = response?.documentRequest;

    if (!request) {
      throw new Error('Request not found');
    }

    // Update the requested documents
    const updatedDocs = request.requestedDocuments.map((doc: RequestedDocumentType) => {
      if (doc.type === documentType) {
        return { ...doc, uploaded: true, documentId };
      }
      return doc;
    });

    // Check if all required docs are uploaded
    const allRequiredUploaded = updatedDocs
      .filter((d: RequestedDocumentType) => d.required)
      .every((d: RequestedDocumentType) => d.uploaded);

    const anyUploaded = updatedDocs.some((d: RequestedDocumentType) => d.uploaded);

    // Update request
    const updateBody = {
      query: "updateTaxDocumentRequest",
      params: {
        businessId,
        id: requestId
      },
      form: {
        requestedDocuments: updatedDocs,
        uploadedDocuments: [...(request.uploadedDocuments || []), documentId],
        status: allRequiredUploaded ? 'complete' : (anyUploaded ? 'partial' : 'pending')
      }
    };

    await fetchGraphQLSS(updateBody);
  } catch (error) {
    devLog('Error marking document uploaded:', error);
    throw error;
  }
};

/**
 * Cancel a Document Request
 */
export const cancelDocumentRequest = async (id: string): Promise<void> => {
  try {
    const body = {
      query: "updateTaxDocumentRequest",
      params: {
        businessId: authStore.getBusinessId(),
        id
      },
      form: {
        status: 'cancelled'
      }
    };

    await fetchGraphQLSS(body);
  } catch (error) {
    devLog('Error cancelling document request:', error);
    throw new Error('Error al cancelar la solicitud');
  }
};

/**
 * Delete a Document Request
 */
export const deleteDocumentRequest = async (id: string): Promise<void> => {
  try {
    const body = {
      query: "deleteTaxDocumentRequest",
      params: {
        businessId: authStore.getBusinessId(),
        id
      }
    };

    await fetchGraphQLSS(body);
  } catch (error) {
    devLog('Error deleting document request:', error);
    throw new Error('Error al eliminar la solicitud');
  }
};

/**
 * Send reminder notification for a Document Request
 */
export const sendDocumentRequestReminder = async (id: string): Promise<void> => {
  try {
    const body = {
      query: "sendTaxDocumentRequestReminder",
      params: {
        businessId: authStore.getBusinessId(),
        id
      }
    };

    const response = await fetchGraphQLSS(body);

    // Update reminder count
    if (response?.success) {
      await fetchGraphQLSS({
        query: "updateTaxDocumentRequest",
        params: {
          businessId: authStore.getBusinessId(),
          id
        },
        form: {
          remindersSent: (response.remindersSent || 0) + 1
        }
      });
    }
  } catch (error) {
    devLog('Error sending reminder:', error);
    throw new Error('Error al enviar el recordatorio');
  }
};

/**
 * Mark a document type as not needed (accountant action)
 */
export const markDocumentNotNeeded = async (
  requestId: string,
  documentType: string,
  notNeeded: boolean,
  reason?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const body = {
      query: "markDocumentNotNeeded",
      params: {
        businessId: authStore.getBusinessId(),
        id: requestId,
        documentType,
        notNeeded,
        reason,
        markedBy: 'accountant',
        markedAt: Date.now()
      }
    };

    const response = await fetchGraphQLSS(body);
    return { success: true };
  } catch (error) {
    devLog('Error marking document as not needed:', error);
    return { success: false, error: 'Error updating document status' };
  }
};

/**
 * Mark a document type as not needed (client/public action)
 */
export const markDocumentNotNeededPublic = async (
  requestId: string,
  accessToken: string,
  documentType: string,
  notNeeded: boolean,
  reason?: string,
  businessId?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const body = {
      query: "markDocumentNotNeededPublic",
      params: {
        id: requestId,
        accessToken,
        documentType,
        notNeeded,
        reason,
        markedBy: 'client',
        markedAt: Date.now(),
        businessId
      }
    };

    const response = await fetchPublicSS(body);
    return { success: true };
  } catch (error) {
    devLog('Error marking document as not needed:', error);
    return { success: false, error: 'Error updating document status' };
  }
};

// ============================================
// Helper Functions
// ============================================

/**
 * Generate the public upload URL
 */
export const getPublicUploadUrl = (accessToken: string): string => {
  return `${window.location.origin}/#/tax-upload/${accessToken}`;
};

/**
 * Generate the PIN access URL
 */
export const getPinAccessUrl = (): string => {
  return `${window.location.origin}/#/tax-upload-pin`;
};

/**
 * Format expiration for display
 */
export const formatExpiration = (expiresAt: number): string => {
  const now = Date.now();
  const diff = expiresAt - now;

  if (diff <= 0) {
    return 'Expirado';
  }

  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

  if (days > 0) {
    return `${days} día${days > 1 ? 's' : ''} restante${days > 1 ? 's' : ''}`;
  }

  return `${hours} hora${hours > 1 ? 's' : ''} restante${hours > 1 ? 's' : ''}`;
};

/**
 * Check if a request is expired
 */
export const isRequestExpired = (request: TaxDocumentRequest): boolean => {
  return request.expiresAt < Date.now();
};

/**
 * Get upload progress percentage
 */
export const getUploadProgress = (request: TaxDocumentRequest): number => {
  const total = request.requestedDocuments.length;
  const uploaded = request.requestedDocuments.filter(d => d.uploaded).length;
  return Math.round((uploaded / total) * 100);
};

/**
 * Get required documents that are still missing
 */
export const getMissingRequiredDocuments = (request: TaxDocumentRequest): RequestedDocumentType[] => {
  return request.requestedDocuments.filter(d => d.required && !d.uploaded);
};

// ============================================
// Public Verification Form Submissions
// ============================================

/**
 * Update document request with client verification data
 * Called from public portal - uses accessToken for auth
 */
export const updateDocumentRequestPublic = async (
  requestId: string,
  accessToken: string,
  updates: {
    clientVerification?: {
      ssn?: string;
      filingStatus?: string;
      phone?: string;
      address?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      submittedAt?: number;
    };
    clientBankInfo?: {
      bankName?: string;
      accountType?: 'checking' | 'savings';
      routingNumber?: string;
      accountNumber?: string;
      accountHolderName?: string;
      submittedAt?: number;
    };
    clientDependents?: {
      firstName: string;
      lastName: string;
      relationship: string;
      ssn?: string;
      dateOfBirth?: string;
    }[];
    clientSignature?: {
      name: string;
      date: string;
      agreedToTerms: boolean;
      signedAt: number;
      signatureImage?: string;
      metadata?: {
        userAgent: string;
        browserName?: string;
        browserVersion?: string;
        platform: string;
        screenWidth: number;
        screenHeight: number;
        devicePixelRatio: number;
        touchEnabled: boolean;
        ipAddress?: string;
        timezone: string;
        language: string;
        sessionId?: string;
        pageUrl: string;
        referrer?: string;
        clientTimestamp: number;
        serverTimestamp?: number;
        timezoneOffset: number;
        canvasWidth?: number;
        canvasHeight?: number;
        strokeCount?: number;
        signatureDuration?: number;
      };
    };
    clientReviewConfirmation?: {
      confirmed: boolean;
      reviewedAt: number;
    };
    clientSigningPin?: {
      pin: string;
      setAt: number;
      signerName: string;
      signatureImage?: string;
      metadata?: {
        userAgent: string;
        browserName?: string;
        browserVersion?: string;
        platform: string;
        screenWidth: number;
        screenHeight: number;
        devicePixelRatio: number;
        touchEnabled: boolean;
        ipAddress?: string;
        timezone: string;
        language: string;
        sessionId?: string;
        pageUrl: string;
        referrer?: string;
        clientTimestamp: number;
        serverTimestamp?: number;
        timezoneOffset: number;
        canvasWidth?: number;
        canvasHeight?: number;
        strokeCount?: number;
        signatureDuration?: number;
      };
    };
    markDocumentUploaded?: string; // document type to mark as uploaded
    status?: string; // Request status (e.g., 'completed' to prevent duplicate submissions)
    portalLocked?: boolean; // Admin locks portal when taxes completed
    portalLockedAt?: number;
    portalLockedBy?: string;
  },
  businessId?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const result = await fetchPublicSS({
      query: 'updateTaxDocumentRequest',
      params: {
        requestId,
        id: requestId,
        accessToken,
        businessId
      },
      form: updates
    });

    return { success: true };
  } catch (error) {
    devLog('Error updating document request:', error);
    return { success: false, error: (error as Error).message };
  }
};



/**
 * Upload a single tax document
 */
export async function uploadTaxDocument(
  file: File,
  clientNotaryId: string,
  taxYear: number,
  options?: {
    businessId?: string;
    documentType?: string;
    notes?: string;
    tags?: string[];
  }
): Promise<any> {
  try {
    // Convert file to ArrayBuffer then to Uint8Array for transmission
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Array.from(new Uint8Array(arrayBuffer));

    // Build the request with file data
    const result = await fetchPublicSS({
      query: 'uploadTaxDocument',
      params: {
        businessId: options?.businessId || authStore.getBusinessId()
      },
      form: {
        // File data
        fileBuffer: fileBuffer,
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        // Tax document metadata
        taxPortalId: clientNotaryId,
        taxYear,
        businessId: options?.businessId || authStore.getBusinessId(),
        documentType: options?.documentType,
        tags: options?.tags,
        notes: options?.notes
      }
    });

    if (result?.success && result?.documentId) {
      return {
        success: true,
        documentId: result.documentId,
        document: result.document
      };
    }

    return {
      success: false,
      error: result?.error || 'Failed to upload document'
    };
  } catch (error) {
    devLog('Error uploading tax document:', error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
}


/**
 * Process a tax document with AI analysis (public - no auth required)
 */
export async function processTaxDocument(
  documentId: string,
  businessId?: string
): Promise<{ success: boolean; document?: any; error?: string }> {
  try {
    const result = await fetchPublicSS({
      query: 'processTaxDocument',
      params: {
        businessId: businessId || authStore.getBusinessId(),
      },
      form: {
        documentId,
        options: {
          forceReprocess: true
        }
      }
    });

    if (result?.success && result?.document) {
      return { success: true, document: result.document };
    }

    return { success: false, error: result?.error || 'Failed to process document' };
  } catch (error) {
    devLog('Error processing tax document (public):', error);
    return { success: false, error: (error as Error).message };
  }
}

// ============================================
// Tax Calculations API
// ============================================

/**
 * Tax calculation result with full 1040 line-by-line breakdown
 */
export interface TaxCalculationResult {
  id: string;
  taxPortalId: string;
  taxYear: number;
  filingStatus: string;
  filingStatusLabel: string;
  calculatedAt: number;
  calculatedBy?: string;

  // Income Section (Lines 1-9)
  line1a_wages: number;
  line1h_otherEarnedIncome: number;
  line1z_totalWages: number;
  line2b_taxableInterest: number;
  line3b_ordinaryDividends: number;
  line8_otherIncome: number;
  line8_breakdown: {
    businessIncome: number;
    rentalIncome: number;
    royalties: number;
    other: number;
  };
  line9_totalIncome: number;

  // Adjustments (Line 10-11)
  line10_adjustments: number;
  line11_agi: number;

  // Deductions (Lines 12-15)
  line12a_standardDeduction: number;
  line12b_itemizedDeductions: number;
  line12b_breakdown: {
    saltDeduction: number;
    mortgageInterest: number;
    charitableContributions: number;
  };
  line12_deductionUsed: 'standard' | 'itemized';
  line12_deductionAmount: number;
  line13a_qbid: number; // Qualified Business Income Deduction (Form 8995)
  line13b_schedule1ADeductions: number; // Additional deductions from Schedule 1-A (SE tax deduction, etc.)
  line14_totalDeductions: number; // Total of lines 12e + 13a + 13b
  line15_taxableIncome: number;

  // Tax Calculation (Lines 16-24)
  line16_tax: number;
  line16_bracketUsed: string;
  line16_marginalRate: number;
  line17_schedule2Tax: number; // Additional taxes from Schedule 2 (SE tax, etc.)
  line18_totalTaxBeforeCredits: number; // Line 16 + Line 17
  line19_childTaxCredit: number;
  line21_totalCredits: number;
  line24_totalTax: number;

  // Payments (Lines 25-33)
  line25a_w2Withholding: number;
  line25b_1099Withholding: number;
  line25d_totalWithholding: number;
  line27_eic: number;
  line28_actc: number;
  line33_totalPayments: number;

  // Refund or Amount Owed (Lines 34-37)
  line34_refund: number;
  line37_amountOwed: number;

  // Form 8962 Premium Tax Credit (if 1095-A present)
  form8962?: Form8962Result;
}

/**
 * Tax constants for a specific year
 */
export interface TaxConstants {
  taxYear: number;
  standardDeductions: {
    single: number;
    married_jointly: number;
    married_separately: number;
    head_of_household: number;
    qualifying_widow: number;
  };
  taxBrackets: {
    single: TaxBracket[];
    married_jointly: TaxBracket[];
    married_separately: TaxBracket[];
    head_of_household: TaxBracket[];
  };
  saltCap: number;
  saltCapMFS: number;
  additionalDeduction65Plus: {
    single: number;
    married: number;
  };
  // EITC brackets by number of qualifying children (0, 1, 2, 3+)
  // IRS uses specific phase-in and phase-out rates:
  // 0 children: phase-in 7.65%, phase-out 7.65%
  // 1 child: phase-in 34%, phase-out 15.98%
  // 2 children: phase-in 40%, phase-out 21.06%
  // 3+ children: phase-in 45%, phase-out 21.06%
  eitcBrackets: {
    [key: number]: {
      maxCredit: number;
      phaseInEnd: number;        // Earned income where phase-in ends (plateau starts)
      phaseOutStartSingle: number; // Income where phase-out starts (single/HOH)
      phaseOutStartMFJ: number;    // Income where phase-out starts (MFJ)
      singleLimit: number;
      mfjLimit: number;
      phaseInRate: number;       // Rate at which credit phases in
      phaseOutRate: number;      // Rate at which credit phases out
    };
  };
  // Child Tax Credit
  childTaxCredit: {
    amountPerChild: number;
    maxRefundablePerChild: number; // ACTC limit
    phaseOutThresholdSingle: number;
    phaseOutThresholdMFJ: number;
  };
}

export interface TaxBracket {
  limit: number;
  rate: number;
  base: number;
  threshold: number;
}

/**
 * Get tax constants (brackets, deductions, rates) for a specific year
 */
export const getTaxConstants = (taxYear: number): TaxConstants => {
  const constants: Record<number, TaxConstants> = {
    2024: {
      taxYear: 2024,
      standardDeductions: {
        single: 14600,
        married_jointly: 29200,
        married_separately: 14600,
        head_of_household: 21900,
        qualifying_widow: 29200
      },
      taxBrackets: {
        single: [
          { limit: 11600, rate: 0.10, base: 0, threshold: 0 },
          { limit: 47150, rate: 0.12, base: 1160, threshold: 11600 },
          { limit: 100525, rate: 0.22, base: 5426, threshold: 47150 },
          { limit: 191950, rate: 0.24, base: 17168.50, threshold: 100525 },
          { limit: 243725, rate: 0.32, base: 39110.50, threshold: 191950 },
          { limit: 609350, rate: 0.35, base: 55678.50, threshold: 243725 },
          { limit: Infinity, rate: 0.37, base: 183647.25, threshold: 609350 }
        ],
        married_jointly: [
          { limit: 23200, rate: 0.10, base: 0, threshold: 0 },
          { limit: 94300, rate: 0.12, base: 2320, threshold: 23200 },
          { limit: 201050, rate: 0.22, base: 10852, threshold: 94300 },
          { limit: 383900, rate: 0.24, base: 34337, threshold: 201050 },
          { limit: 487450, rate: 0.32, base: 78221, threshold: 383900 },
          { limit: 731200, rate: 0.35, base: 111357, threshold: 487450 },
          { limit: Infinity, rate: 0.37, base: 196669.50, threshold: 731200 }
        ],
        married_separately: [
          { limit: 11600, rate: 0.10, base: 0, threshold: 0 },
          { limit: 47150, rate: 0.12, base: 1160, threshold: 11600 },
          { limit: 100525, rate: 0.22, base: 5426, threshold: 47150 },
          { limit: 191950, rate: 0.24, base: 17168.50, threshold: 100525 },
          { limit: 243725, rate: 0.32, base: 39110.50, threshold: 191950 },
          { limit: 365600, rate: 0.35, base: 55678.50, threshold: 243725 },
          { limit: Infinity, rate: 0.37, base: 98334.75, threshold: 365600 }
        ],
        head_of_household: [
          { limit: 16550, rate: 0.10, base: 0, threshold: 0 },
          { limit: 63100, rate: 0.12, base: 1655, threshold: 16550 },
          { limit: 100500, rate: 0.22, base: 7241, threshold: 63100 },
          { limit: 191950, rate: 0.24, base: 15469, threshold: 100500 },
          { limit: 243700, rate: 0.32, base: 37417, threshold: 191950 },
          { limit: 609350, rate: 0.35, base: 53977, threshold: 243700 },
          { limit: Infinity, rate: 0.37, base: 181954.50, threshold: 609350 }
        ]
      },
      saltCap: 10000,
      saltCapMFS: 5000,
      additionalDeduction65Plus: {
        single: 1950,
        married: 1550
      },
      eitcBrackets: {
        0: { maxCredit: 632, phaseInEnd: 7840, phaseOutStartSingle: 9800, phaseOutStartMFJ: 16370, singleLimit: 18591, mfjLimit: 25511, phaseInRate: 0.0765, phaseOutRate: 0.0765 },
        1: { maxCredit: 4213, phaseInEnd: 12390, phaseOutStartSingle: 22720, phaseOutStartMFJ: 29290, singleLimit: 49084, mfjLimit: 56004, phaseInRate: 0.34, phaseOutRate: 0.1598 },
        2: { maxCredit: 6960, phaseInEnd: 17400, phaseOutStartSingle: 22720, phaseOutStartMFJ: 29290, singleLimit: 55768, mfjLimit: 62688, phaseInRate: 0.40, phaseOutRate: 0.2106 },
        3: { maxCredit: 7830, phaseInEnd: 17400, phaseOutStartSingle: 22720, phaseOutStartMFJ: 29290, singleLimit: 59899, mfjLimit: 66819, phaseInRate: 0.45, phaseOutRate: 0.2106 }
      },
      childTaxCredit: {
        amountPerChild: 2000,
        maxRefundablePerChild: 1700,
        phaseOutThresholdSingle: 200000,
        phaseOutThresholdMFJ: 400000
      }
    },
    2025: {
      taxYear: 2025,
      standardDeductions: {
        single: 15750,
        married_jointly: 31500,
        married_separately: 15750,
        head_of_household: 23625,
        qualifying_widow: 31500
      },
      taxBrackets: {
        single: [
          { limit: 11925, rate: 0.10, base: 0, threshold: 0 },
          { limit: 48475, rate: 0.12, base: 1192.50, threshold: 11925 },
          { limit: 103350, rate: 0.22, base: 5578.50, threshold: 48475 },
          { limit: 197300, rate: 0.24, base: 17651, threshold: 103350 },
          { limit: 250525, rate: 0.32, base: 40199, threshold: 197300 },
          { limit: 626350, rate: 0.35, base: 57231, threshold: 250525 },
          { limit: Infinity, rate: 0.37, base: 188769.75, threshold: 626350 }
        ],
        married_jointly: [
          { limit: 23850, rate: 0.10, base: 0, threshold: 0 },
          { limit: 96950, rate: 0.12, base: 2385, threshold: 23850 },
          { limit: 206700, rate: 0.22, base: 11157, threshold: 96950 },
          { limit: 394600, rate: 0.24, base: 35302, threshold: 206700 },
          { limit: 501050, rate: 0.32, base: 80398, threshold: 394600 },
          { limit: 751600, rate: 0.35, base: 114462, threshold: 501050 },
          { limit: Infinity, rate: 0.37, base: 202154.50, threshold: 751600 }
        ],
        married_separately: [
          { limit: 11925, rate: 0.10, base: 0, threshold: 0 },
          { limit: 48475, rate: 0.12, base: 1192.50, threshold: 11925 },
          { limit: 103350, rate: 0.22, base: 5578.50, threshold: 48475 },
          { limit: 197300, rate: 0.24, base: 17651, threshold: 103350 },
          { limit: 250525, rate: 0.32, base: 40199, threshold: 197300 },
          { limit: 375800, rate: 0.35, base: 57231, threshold: 250525 },
          { limit: Infinity, rate: 0.37, base: 101077.25, threshold: 375800 }
        ],
        head_of_household: [
          { limit: 17000, rate: 0.10, base: 0, threshold: 0 },
          { limit: 64850, rate: 0.12, base: 1700, threshold: 17000 },
          { limit: 103350, rate: 0.22, base: 7442, threshold: 64850 },
          { limit: 197300, rate: 0.24, base: 15912, threshold: 103350 },
          { limit: 250500, rate: 0.32, base: 38460, threshold: 197300 },
          { limit: 626350, rate: 0.35, base: 55484, threshold: 250500 },
          { limit: Infinity, rate: 0.37, base: 187032, threshold: 626350 }
        ]
      },
      saltCap: 10000,
      saltCapMFS: 5000,
      additionalDeduction65Plus: {
        single: 2000,
        married: 1600
      },
      eitcBrackets: {
        0: { maxCredit: 649, phaseInEnd: 8490, phaseOutStartSingle: 10620, phaseOutStartMFJ: 17620, singleLimit: 19104, mfjLimit: 26214, phaseInRate: 0.0765, phaseOutRate: 0.0765 },
        1: { maxCredit: 4328, phaseInEnd: 12730, phaseOutStartSingle: 23350, phaseOutStartMFJ: 30350, singleLimit: 50434, mfjLimit: 57554, phaseInRate: 0.34, phaseOutRate: 0.1598 },
        2: { maxCredit: 7152, phaseInEnd: 17880, phaseOutStartSingle: 23350, phaseOutStartMFJ: 30350, singleLimit: 57310, mfjLimit: 64430, phaseInRate: 0.40, phaseOutRate: 0.2106 },
        3: { maxCredit: 8046, phaseInEnd: 17880, phaseOutStartSingle: 23350, phaseOutStartMFJ: 30350, singleLimit: 61555, mfjLimit: 68675, phaseInRate: 0.45, phaseOutRate: 0.2106 }
      },
      childTaxCredit: {
        amountPerChild: 2200,  // 2025: $2,200 per qualifying child (Schedule 8812 Line 5)
        maxRefundablePerChild: 1700,  // 2025: $1,700 max refundable per child (Schedule 8812 Line 16b)
        phaseOutThresholdSingle: 200000,
        phaseOutThresholdMFJ: 400000
      }
    }
  };

  return constants[taxYear] || constants[2025];
};

/**
 * Filing status label mapping
 */
const FILING_STATUS_LABELS: Record<string, string> = {
  'single': 'Single',
  'married_filing_jointly': 'Married Filing Jointly',
  'married_jointly': 'Married Filing Jointly',
  'married_filing_separately': 'Married Filing Separately',
  'married_separate': 'Married Filing Separately',
  'head_of_household': 'Head of Household',
  'head_household': 'Head of Household',
  'qualifying_widow': 'Qualifying Surviving Spouse'
};

/**
 * Normalize filing status to standard format
 */
const normalizeFilingStatus = (status: string): string => {
  const mapping: Record<string, string> = {
    'married_jointly': 'married_jointly',
    'married_filing_jointly': 'married_jointly',
    'married_separate': 'married_separately',
    'married_filing_separately': 'married_separately',
    'head_household': 'head_of_household',
    'head_of_household': 'head_of_household',
    'single': 'single',
    'qualifying_widow': 'qualifying_widow'
  };
  return mapping[status] || 'single';
};

/**
 * Options for tax calculation including manual overrides
 */
export interface TaxCalculationOptions {
  qbid?: number; // Qualified Business Income Deduction (Line 13a)
  schedule1ADeductions?: number; // Additional deductions from Schedule 1-A (Line 13b)
  schedule2Tax?: number; // Additional taxes from Schedule 2 (SE tax, etc.)
}

/**
 * Calculate taxes for a tax portal client
 * Full calculation with line-by-line 1040 breakdown
 */
export const calculateTaxes = async (
  taxPortalId: string,
  taxYear: number,
  documents: any[],
  client: TaxPortal,
  options?: TaxCalculationOptions
): Promise<TaxCalculationResult> => {
  devLog('[TAX CALC] ===== TAX CALCULATION STARTED =====');
  devLog('[TAX CALC] Client:', JSON.stringify({
    id: taxPortalId,
    name: `${client.firstName} ${client.lastName}`,
    filingStatus: client.filingStatus,
    taxYear: taxYear,
    dependentsCount: client.dependents?.length || 0
  }));
  devLog('[TAX CALC] Documents count:', documents.length);

  const constants = getTaxConstants(taxYear);
  const filingStatus = normalizeFilingStatus(client.filingStatus || 'single');
  const isMarriedSeparately = filingStatus === 'married_separately';

  devLog('[TAX CALC] Filing status:', filingStatus);
  devLog('[TAX CALC] Tax year constants:', JSON.stringify({
    standardDeductions: constants.standardDeductions,
    saltCap: constants.saltCap,
    saltCapMFS: constants.saltCapMFS
  }));

  // =======================================================================
  // INCOME EXTRACTION (Form 1040 Lines 1-8)
  // =======================================================================
  let line1a_wages = 0;
  let line1h_otherEarnedIncome = 0;
  let line2b_taxableInterest = 0;
  let line3b_ordinaryDividends = 0;
  let line8_businessIncome = 0;
  let line8_rentalIncome = 0;
  let line8_royalties = 0;
  let line8_other = 0;
  let line25a_w2Withholding = 0;
  let line25b_1099Withholding = 0;

  // Schedule A components
  let saltStateTax = 0;
  let saltLocalTax = 0;
  let saltPropertyTax = 0;
  let mortgageInterest = 0;
  let mortgagePoints = 0;
  let mortgagePMI = 0;

  devLog('[TAX CALC] --- Processing Documents ---');
  documents.forEach((doc, idx) => {
    devLog(`[TAX CALC] Doc ${idx + 1}: type=${doc.drakeFormType || doc.documentType} | verified=${doc.verified} | hasAmounts=${!!doc.extractedAmounts} | file=${doc.originalFileName}`);
    if (doc.verified && doc.extractedAmounts) {
      const amounts = doc.extractedAmounts;
      devLog(`[TAX CALC] Doc ${idx + 1} extractedAmounts:`, JSON.stringify(amounts));

      // Line 1a: Wages (W-2 Box 1)
      if (amounts.wages) line1a_wages += amounts.wages;

      // Line 2b: Taxable Interest (1099-INT Box 1)
      if (amounts.interestIncome) line2b_taxableInterest += amounts.interestIncome;

      // Line 3b: Ordinary Dividends (1099-DIV Box 1a)
      if (amounts.ordinaryDividends) line3b_ordinaryDividends += amounts.ordinaryDividends;

      // Line 8: Other Income (Schedule 1)
      if (amounts.nonEmployeeCompensation) line8_businessIncome += amounts.nonEmployeeCompensation;
      if (amounts.rents) line8_rentalIncome += amounts.rents;
      if (amounts.royalties) line8_royalties += amounts.royalties;
      if (amounts.otherIncome) line8_other += amounts.otherIncome;

      // Line 25a: W-2 Withholding (Box 2)
      if (amounts.federalTaxWithheld) line25a_w2Withholding += amounts.federalTaxWithheld;

      // Line 25b: 1099 Withholding
      if (amounts.federalTaxWithheld1099) line25b_1099Withholding += amounts.federalTaxWithheld1099;

      // Schedule A: SALT
      if (amounts.stateTaxWithheld) saltStateTax += amounts.stateTaxWithheld;
      if (amounts.localTaxWithheld) saltLocalTax += amounts.localTaxWithheld;
      if (amounts.propertyTaxes) saltPropertyTax += amounts.propertyTaxes;

      // Schedule A: Mortgage Interest (1098)
      if (amounts.mortgageInterest) mortgageInterest += amounts.mortgageInterest;
      if (amounts.pointsPaid) mortgagePoints += amounts.pointsPaid;
      if (amounts.mortgageInsurancePremiums) mortgagePMI += amounts.mortgageInsurancePremiums;
    }
  });

  // Calculate income totals
  const line1z_totalWages = line1a_wages + line1h_otherEarnedIncome;
  const line8_otherIncome = line8_businessIncome + line8_rentalIncome + line8_royalties + line8_other;
  const line9_totalIncome = line1z_totalWages + line2b_taxableInterest + line3b_ordinaryDividends + line8_otherIncome;
  const line25d_totalWithholding = line25a_w2Withholding + line25b_1099Withholding;

  // Auto-calculate Self-Employment tax from 1099-NEC/MISC business income
  const netSelfEmploymentIncome = line8_businessIncome; // 1099-NEC + MISC business income
  let autoSelfEmploymentTax = 0;
  let autoSeDeduction = 0;
  if (netSelfEmploymentIncome > 0) {
    const taxableSE = netSelfEmploymentIncome * 0.9235; // 92.35% of net SE income
    autoSelfEmploymentTax = Math.round(taxableSE * 0.153); // 15.3% SE tax rate
    autoSeDeduction = Math.round(autoSelfEmploymentTax * 0.5); // 50% deductible
  }

  devLog('[TAX CALC] --- Income Summary ---');
  devLog('[TAX CALC] Line 1a (Wages):', line1a_wages);
  devLog('[TAX CALC] Line 1h (Other earned):', line1h_otherEarnedIncome);
  devLog('[TAX CALC] Line 1z (Total wages):', line1z_totalWages);
  devLog('[TAX CALC] Line 2b (Taxable interest):', line2b_taxableInterest);
  devLog('[TAX CALC] Line 3b (Ordinary dividends):', line3b_ordinaryDividends);
  devLog('[TAX CALC] Line 8 breakdown:', JSON.stringify({ business: line8_businessIncome, rental: line8_rentalIncome, royalties: line8_royalties, other: line8_other }));
  devLog('[TAX CALC] Line 8 (Other income total):', line8_otherIncome);
  devLog('[TAX CALC] Line 9 (TOTAL INCOME):', line9_totalIncome);
  devLog('[TAX CALC] SE tax (auto-calculated):', autoSelfEmploymentTax, '| SE deduction:', autoSeDeduction);
  devLog('[TAX CALC] Line 25a (W-2 withholding):', line25a_w2Withholding);
  devLog('[TAX CALC] Line 25b (1099 withholding):', line25b_1099Withholding);
  devLog('[TAX CALC] Line 25d (Total withholding):', line25d_totalWithholding);

  // =======================================================================
  // DEDUCTIONS
  // =======================================================================

  // Standard deduction (Line 12a)
  const standardDeduction = constants.standardDeductions[filingStatus as keyof typeof constants.standardDeductions]
    || constants.standardDeductions.single;

  // Itemized deductions (Line 12b)
  const saltCap = isMarriedSeparately ? constants.saltCapMFS : constants.saltCap;
  const saltTotal = saltStateTax + saltLocalTax + saltPropertyTax;
  const saltDeduction = Math.min(saltTotal, saltCap);
  const mortgageInterestDeduction = mortgageInterest + mortgagePoints + mortgagePMI;
  const charitableContributions = 0; // Not currently captured
  const itemizedDeductions = saltDeduction + mortgageInterestDeduction + charitableContributions;

  // Use greater of standard or itemized (Line 12e)
  const useItemized = itemizedDeductions > standardDeduction;
  const line12e_deduction = useItemized ? itemizedDeductions : standardDeduction;

  // Schedule 1-A deductions from options (manual input)
  const line13a_qbid = options?.qbid || 0; // Qualified Business Income Deduction
  const line13b_schedule1ADeductions = options?.schedule1ADeductions || 0; // Additional deductions (SE tax deduction, etc.)

  // Total deductions (Line 14)
  const line14_totalDeductions = line12e_deduction + line13a_qbid + line13b_schedule1ADeductions;

  // AGI and Taxable Income
  // Line 10 adjustments: SE tax deduction (50% of SE tax) — auto-calculated from 1099-NEC/MISC
  const line10_adjustments = autoSeDeduction;
  const line11_agi = line9_totalIncome - line10_adjustments;
  const line15_taxableIncome = Math.max(0, line11_agi - line14_totalDeductions);

  devLog('[TAX CALC] --- Deductions ---');
  devLog('[TAX CALC] SALT breakdown:', JSON.stringify({ state: saltStateTax, local: saltLocalTax, property: saltPropertyTax, total: saltTotal }));
  devLog('[TAX CALC] SALT cap:', saltCap);
  devLog('[TAX CALC] SALT deduction (capped):', saltDeduction);
  devLog('[TAX CALC] Mortgage interest:', mortgageInterestDeduction);
  devLog('[TAX CALC] Itemized total:', itemizedDeductions);
  devLog('[TAX CALC] Standard deduction:', standardDeduction);
  devLog('[TAX CALC] Line 12e (Std/Itemized):', useItemized ? 'ITEMIZED' : 'STANDARD', '=', line12e_deduction);
  devLog('[TAX CALC] Line 13a (QBID):', line13a_qbid);
  devLog('[TAX CALC] Line 13b (Schedule 1-A):', line13b_schedule1ADeductions);
  devLog('[TAX CALC] Line 14 (Total deductions):', line14_totalDeductions);
  devLog('[TAX CALC] Line 10 (Adjustments):', line10_adjustments);
  devLog('[TAX CALC] Line 11 (AGI):', line11_agi);
  devLog('[TAX CALC] Line 15 (TAXABLE INCOME):', line15_taxableIncome);

  // =======================================================================
  // TAX CALCULATION
  // =======================================================================

  // Get brackets for filing status
  let brackets: TaxBracket[];
  if (filingStatus === 'married_jointly' || filingStatus === 'qualifying_widow') {
    brackets = constants.taxBrackets.married_jointly;
  } else if (filingStatus === 'head_of_household') {
    brackets = constants.taxBrackets.head_of_household;
  } else if (filingStatus === 'married_separately') {
    brackets = constants.taxBrackets.married_separately;
  } else {
    brackets = constants.taxBrackets.single;
  }

  // Calculate tax
  let line16_tax = 0;
  let bracketUsed = '';
  let marginalRate = 0;

  for (const bracket of brackets) {
    if (line15_taxableIncome <= bracket.limit) {
      line16_tax = bracket.base + (line15_taxableIncome - bracket.threshold) * bracket.rate;
      marginalRate = bracket.rate;
      bracketUsed = `${(bracket.rate * 100).toFixed(0)}% bracket ($${bracket.threshold.toLocaleString()} - $${bracket.limit === Infinity ? '∞' : bracket.limit.toLocaleString()})`;
      break;
    }
  }

  // =======================================================================
  // FORM 8962 - PREMIUM TAX CREDIT (if 1095-A present)
  // =======================================================================
  // Calculate Form 8962 if there are 1095-A documents OR strategy has marketplace data
  // Family size = taxpayer + spouse (if MFJ) + dependents
  const familySize = 1 +
    (filingStatus === 'married_jointly' ? 1 : 0) +
    (client.dependents?.length || 0);

  // First try to calculate from documents
  let form8962Result = calculateForm8962FromDocuments(
    taxYear,
    line11_agi, // Use AGI as household income
    familySize,
    filingStatus,
    documents
  );

  // If no 1095-A document found, check strategy's healthInsuranceMarketplace data
  if (!form8962Result && client.taxStrategy?.otherIncome?.healthInsuranceMarketplace) {
    const marketplace = client.taxStrategy.otherIncome.healthInsuranceMarketplace;
    if (marketplace.hasMarketplaceCoverage && marketplace.coverageMonths > 0) {
      devLog('[TAX CALC] No 1095-A document found, using Strategy health insurance marketplace data');
      devLog('[TAX CALC] Marketplace data:', JSON.stringify(marketplace));

      // Create a virtual 1095-A document from strategy data
      const virtualDoc = {
        drakeFormType: '1095_a' as const,
        documentType: '1095_a',
        extractedAmounts: {
          annualPremiumAmount: marketplace.monthlyPremium * marketplace.coverageMonths,
          annualSlcspPremium: marketplace.monthlySlcsp * marketplace.coverageMonths,
          annualAdvancePtc: marketplace.monthlyAptc * marketplace.coverageMonths,
          coverageMonths: marketplace.coverageMonths,
        }
      };

      form8962Result = calculateForm8962FromDocuments(
        taxYear,
        line11_agi,
        familySize,
        filingStatus,
        [virtualDoc]
      );
    }
  }

  if (form8962Result) {
    devLog('[TAX CALC] --- Form 8962 Premium Tax Credit ---');
    devLog('[TAX CALC] Family size:', familySize);
    devLog('[TAX CALC] Income as % FPL:', form8962Result.incomeAsFplPercent + '%');
    devLog('[TAX CALC] Applicable %:', form8962Result.applicablePercentage + '%');
    devLog('[TAX CALC] Annual PTC allowed:', form8962Result.annualPtcAllowed);
    devLog('[TAX CALC] Total APTC received:', form8962Result.totalAnnualAptc);
    devLog('[TAX CALC] Excess APTC:', form8962Result.excessAptc);
    devLog('[TAX CALC] Repayment limitation:', form8962Result.repaymentLimitation);
    devLog('[TAX CALC] Line 29 (Excess repayment):', form8962Result.excessAptcRepayment);
    devLog('[TAX CALC] Additional PTC credit:', form8962Result.additionalPtc);
  }

  // Schedule 2 additional taxes (self-employment tax, excess PTC repayment, etc.)
  // Add auto-calculated SE tax + Form 8962 Line 29 (excess APTC repayment) to Schedule 2 taxes
  const manualSchedule2Tax = options?.schedule2Tax || 0;
  const form8962ExcessRepayment = form8962Result?.excessAptcRepayment || 0;
  const line17_schedule2Tax = autoSelfEmploymentTax + manualSchedule2Tax + form8962ExcessRepayment;
  const line18_totalTaxBeforeCredits = line16_tax + line17_schedule2Tax;

  devLog('[TAX CALC] --- Tax Calculation ---');
  devLog('[TAX CALC] Brackets used for:', filingStatus);
  devLog('[TAX CALC] Bracket:', bracketUsed);
  devLog('[TAX CALC] Line 16 (Tax from brackets):', line16_tax);
  devLog('[TAX CALC] Line 17 (Schedule 2 taxes):', line17_schedule2Tax);
  devLog('[TAX CALC] Line 18 (Total tax before credits):', line18_totalTaxBeforeCredits);
  devLog('[TAX CALC] Marginal rate:', (marginalRate * 100).toFixed(0) + '%');

  // =======================================================================
  // TAX CREDITS (Lines 19-21)
  // =======================================================================

  // Child Tax Credit calculation
  const qualifyingRelationships = ['son', 'daughter', 'stepson', 'stepdaughter', 'foster_child', 'grandchild'];
  const endOfTaxYear = new Date(taxYear, 11, 31);

  const qualifyingChildren = (client.dependents || []).filter(dep => {
    if (!qualifyingRelationships.includes(dep.relationship)) return false;
    if (dep.dateOfBirth) {
      const dob = new Date(dep.dateOfBirth);
      const ageAtEndOfYear = endOfTaxYear.getFullYear() - dob.getFullYear() -
        (endOfTaxYear < new Date(endOfTaxYear.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
      return ageAtEndOfYear < 17;
    }
    return true; // If no DOB, assume qualifying
  });

  devLog('[TAX CALC] --- Credits Calculation ---');
  devLog('[TAX CALC] Total dependents:', client.dependents?.length || 0);
  devLog('[TAX CALC] Qualifying children (under 17):', qualifyingChildren.length);
  devLog('[TAX CALC] Dependents detail:', JSON.stringify(client.dependents?.map(d => ({
    name: `${d.firstName} ${d.lastName}`,
    relationship: d.relationship,
    dob: d.dateOfBirth
  }))));

  // Child Tax Credit using year-specific constants
  const ctcConstants = constants.childTaxCredit;
  const ctcPerChild = ctcConstants.amountPerChild;
  const ctcPhaseOutThreshold = (filingStatus === 'married_jointly')
    ? ctcConstants.phaseOutThresholdMFJ
    : ctcConstants.phaseOutThresholdSingle;
  let line19_childTaxCredit = qualifyingChildren.length * ctcPerChild;

  // Phase-out: reduce by $50 for every $1,000 over threshold
  if (line11_agi > ctcPhaseOutThreshold) {
    const excessIncome = line11_agi - ctcPhaseOutThreshold;
    const phaseOutReduction = Math.ceil(excessIncome / 1000) * 50;
    line19_childTaxCredit = Math.max(0, line19_childTaxCredit - phaseOutReduction);
    devLog('[TAX CALC] CTC phase-out: AGI', line11_agi, '> threshold', ctcPhaseOutThreshold, ', reduction:', phaseOutReduction);
  }

  // CTC is non-refundable (limited to tax liability on Line 18), ACTC is refundable portion
  const nonRefundableCTC = Math.min(line19_childTaxCredit, line18_totalTaxBeforeCredits);

  // Schedule 8812 ACTC calculation:
  // Line 16a: Unused CTC = total CTC - non-refundable CTC used
  const unusedCTC = line19_childTaxCredit - nonRefundableCTC;
  // Line 16b: Max refundable per child cap
  const actcPerChildCap = qualifyingChildren.length * ctcConstants.maxRefundablePerChild;
  // Line 17: MIN(Line 16a, Line 16b)
  const actcLine17 = Math.min(unusedCTC, actcPerChildCap);
  // Line 18a: Earned income (W-2 + SE)
  const actcEarnedIncome = line1z_totalWages + netSelfEmploymentIncome;
  // Line 19: Excess earned income over $2,500
  const actcExcessEarned = Math.max(0, actcEarnedIncome - 2500);
  // Line 20: 15% of excess earned income
  const actcLine20 = actcExcessEarned * 0.15;
  // Line 27: ACTC = MIN(Line 17, Line 20)
  const potentialACTC = Math.round(Math.min(actcLine17, actcLine20));

  devLog('[TAX CALC] Child Tax Credit constants:', JSON.stringify(ctcConstants));
  devLog('[TAX CALC] Child Tax Credit (before limit):', line19_childTaxCredit);
  devLog('[TAX CALC] Non-refundable CTC (limited to Line 18 tax):', nonRefundableCTC);
  devLog('[TAX CALC] Schedule 8812: Line 16a (unused CTC):', unusedCTC);
  devLog('[TAX CALC] Schedule 8812: Line 16b (per-child cap):', actcPerChildCap);
  devLog('[TAX CALC] Schedule 8812: Line 17 (MIN 16a,16b):', actcLine17);
  devLog('[TAX CALC] Schedule 8812: Line 20 (15% earned income):', actcLine20);
  devLog('[TAX CALC] Additional Child Tax Credit (refundable):', potentialACTC);

  // EIC Calculation using year-specific brackets with proper IRS phase-in/phase-out
  const earnedIncome = line1z_totalWages + netSelfEmploymentIncome; // W-2 wages + self-employment
  const isMFJ = filingStatus === 'married_jointly';

  const eitcBracketKey = Math.min(qualifyingChildren.length, 3);
  const eitcBracket = constants.eitcBrackets[eitcBracketKey];
  const eitcIncomeLimit = isMFJ ? eitcBracket.mfjLimit : eitcBracket.singleLimit;
  const phaseOutStart = isMFJ ? eitcBracket.phaseOutStartMFJ : eitcBracket.phaseOutStartSingle;

  // IRS uses the GREATER of earned income or AGI for phase-out calculation
  const incomeForPhaseOut = Math.max(earnedIncome, line11_agi);

  let line27_eic = 0;
  let eicPhase = '';

  if (earnedIncome <= 0) {
    // No earned income = no EIC
    line27_eic = 0;
    eicPhase = 'no-income';
  } else if (incomeForPhaseOut > eitcIncomeLimit) {
    // Income exceeds maximum = no EIC
    line27_eic = 0;
    eicPhase = 'over-limit';
  } else {
    // Calculate phase-in credit: credit = earnedIncome × phaseInRate (capped at maxCredit)
    const phaseInCredit = Math.min(earnedIncome * eitcBracket.phaseInRate, eitcBracket.maxCredit);

    // Calculate phase-out reduction: reduction = (income - phaseOutStart) × phaseOutRate
    let phaseOutReduction = 0;
    if (incomeForPhaseOut > phaseOutStart) {
      phaseOutReduction = (incomeForPhaseOut - phaseOutStart) * eitcBracket.phaseOutRate;
    }

    // Final credit = phase-in credit - phase-out reduction (not less than 0)
    line27_eic = Math.max(0, Math.floor(phaseInCredit - phaseOutReduction));

    // Determine phase for logging
    if (earnedIncome <= eitcBracket.phaseInEnd && incomeForPhaseOut <= phaseOutStart) {
      eicPhase = 'phase-in';
    } else if (incomeForPhaseOut <= phaseOutStart) {
      eicPhase = 'plateau';
    } else {
      eicPhase = 'phase-out';
    }

    devLog('[TAX CALC] EIC Phase-in credit:', phaseInCredit.toFixed(2), '| Phase-out reduction:', phaseOutReduction.toFixed(2));
  }

  devLog('[TAX CALC] EITC constants for', taxYear, ':', JSON.stringify(eitcBracket));
  devLog('[TAX CALC] Earned income for EIC:', earnedIncome, '| AGI:', line11_agi, '| Income for phase-out:', incomeForPhaseOut);
  devLog('[TAX CALC] EIC bracket:', eitcBracketKey, 'children | Phase-in end:', eitcBracket.phaseInEnd, '| Phase-out start:', phaseOutStart, '| Max income:', eitcIncomeLimit);
  devLog('[TAX CALC] EIC phase:', eicPhase, '| Final credit:', line27_eic);

  // Total credits that reduce tax (non-refundable portion)
  const line21_totalCredits = nonRefundableCTC; // Add other non-refundable credits here
  // Line 24 = (Line 18 total tax before credits - non-refundable credits), but not less than 0
  // This includes Line 16 (bracket tax) + Line 17 (Schedule 2: SE tax, etc.) minus credits
  const line24_totalTax = Math.max(0, line18_totalTaxBeforeCredits - line21_totalCredits);

  // Refundable credits (added to payments)
  const refundableCredits = potentialACTC + line27_eic;
  const line33_totalPayments = line25d_totalWithholding + refundableCredits;

  // Refund or Amount Owed
  const refundOrOwed = line33_totalPayments - line24_totalTax;

  devLog('[TAX CALC] --- Final Calculation ---');
  devLog('[TAX CALC] Line 16 (Tax before credits):', line16_tax);
  devLog('[TAX CALC] Line 19 (Child Tax Credit):', nonRefundableCTC);
  devLog('[TAX CALC] Line 21 (Total non-refundable credits):', line21_totalCredits);
  devLog('[TAX CALC] Line 24 (Total tax after credits):', line24_totalTax);
  devLog('[TAX CALC] Line 25d (Withholding):', line25d_totalWithholding);
  devLog('[TAX CALC] Line 27 (EIC - refundable):', line27_eic);
  devLog('[TAX CALC] Line 28 (ACTC - refundable):', potentialACTC);
  devLog('[TAX CALC] Line 33 (Total payments + refundable credits):', line33_totalPayments);
  devLog('[TAX CALC] RESULT:', refundOrOwed > 0 ? `REFUND $${refundOrOwed.toFixed(2)}` : `OWED $${Math.abs(refundOrOwed).toFixed(2)}`);

  // Build result
  const result: TaxCalculationResult = {
    id: generateRandomId(),
    taxPortalId,
    taxYear,
    filingStatus,
    filingStatusLabel: FILING_STATUS_LABELS[client.filingStatus || 'single'] || 'Single',
    calculatedAt: Date.now(),

    // Income
    line1a_wages,
    line1h_otherEarnedIncome,
    line1z_totalWages,
    line2b_taxableInterest,
    line3b_ordinaryDividends,
    line8_otherIncome,
    line8_breakdown: {
      businessIncome: line8_businessIncome,
      rentalIncome: line8_rentalIncome,
      royalties: line8_royalties,
      other: line8_other
    },
    line9_totalIncome,

    // Adjustments
    line10_adjustments,
    line11_agi,

    // Deductions
    line12a_standardDeduction: standardDeduction,
    line12b_itemizedDeductions: itemizedDeductions,
    line12b_breakdown: {
      saltDeduction,
      mortgageInterest: mortgageInterestDeduction,
      charitableContributions
    },
    line12_deductionUsed: useItemized ? 'itemized' : 'standard',
    line12_deductionAmount: line12e_deduction,
    line13a_qbid,
    line13b_schedule1ADeductions,
    line14_totalDeductions,
    line15_taxableIncome,

    // Tax
    line16_tax,
    line16_bracketUsed: bracketUsed,
    line16_marginalRate: marginalRate,
    line17_schedule2Tax,
    line18_totalTaxBeforeCredits,
    line19_childTaxCredit: nonRefundableCTC,
    line21_totalCredits,
    line24_totalTax,

    // Payments
    line25a_w2Withholding,
    line25b_1099Withholding,
    line25d_totalWithholding,
    line27_eic,
    line28_actc: potentialACTC,
    line33_totalPayments,

    // Refund or Amount Owed
    line34_refund: refundOrOwed > 0 ? refundOrOwed : 0,
    line37_amountOwed: refundOrOwed < 0 ? Math.abs(refundOrOwed) : 0,

    // Form 8962 (if 1095-A present)
    form8962: form8962Result || undefined
  };

  devLog('[TAX CALC] ===== FULL RESULT =====');
  devLog('[TAX CALC]', JSON.stringify(result, null, 2));
  devLog('[TAX CALC] ===== TAX CALCULATION COMPLETE =====');

  return result;
};

/**
 * Quick tax estimate (simplified calculation)
 */
export const estimateTax = (
  totalIncome: number,
  filingStatus: string,
  taxYear: number
): { estimatedTax: number; effectiveRate: number; marginalRate: number } => {
  const constants = getTaxConstants(taxYear);
  const normalizedStatus = normalizeFilingStatus(filingStatus);

  // Get standard deduction
  const standardDeduction = constants.standardDeductions[normalizedStatus as keyof typeof constants.standardDeductions]
    || constants.standardDeductions.single;

  const taxableIncome = Math.max(0, totalIncome - standardDeduction);

  // Get brackets
  let brackets: TaxBracket[];
  if (normalizedStatus === 'married_jointly') {
    brackets = constants.taxBrackets.married_jointly;
  } else if (normalizedStatus === 'head_of_household') {
    brackets = constants.taxBrackets.head_of_household;
  } else {
    brackets = constants.taxBrackets.single;
  }

  // Calculate tax
  let estimatedTax = 0;
  let marginalRate = 0;

  for (const bracket of brackets) {
    if (taxableIncome <= bracket.limit) {
      estimatedTax = bracket.base + (taxableIncome - bracket.threshold) * bracket.rate;
      marginalRate = bracket.rate;
      break;
    }
  }

  const effectiveRate = totalIncome > 0 ? estimatedTax / totalIncome : 0;

  return {
    estimatedTax,
    effectiveRate,
    marginalRate
  };
};

/**
 * Save tax calculation to database
 */
export const saveTaxCalculation = async (calculation: TaxCalculationResult): Promise<boolean> => {
  try {
    const body = {
      query: "addTaxCalculation",
      params: {
        businessId: authStore.getBusinessId()
      },
      form: calculation
    };

    await fetchGraphQLSS(body);
    return true;
  } catch (error) {
    devLog('Error saving tax calculation:', error);
    return false;
  }
};

/**
 * Get saved tax calculation by ID
 */
export const getTaxCalculationById = async (calculationId: string): Promise<TaxCalculationResult | null> => {
  try {
    const body = {
      query: "getTaxCalculation",
      params: {
        businessId: authStore.getBusinessId(),
        calculationId
      }
    };

    const response = await fetchGraphQLSS(body);
    return response?.calculation || null;
  } catch (error) {
    devLog('Error fetching tax calculation:', error);
    return null;
  }
};

/**
 * Get all tax calculations for a tax portal
 */
export const getTaxCalculationsForPortal = async (taxPortalId: string): Promise<TaxCalculationResult[]> => {
  try {
    const body = {
      query: "getTaxCalculations",
      params: {
        businessId: authStore.getBusinessId(),
        taxPortalId
      }
    };

    const response = await fetchGraphQLSS(body);
    return response?.calculations || [];
  } catch (error) {
    devLog('Error fetching tax calculations:', error);
    return [];
  }
};


// ============================================
// Client Portal API (REST-based endpoints)
// Admin calls use callApi (fetchGraphQLSS) with action field
// Public calls use direct fetch to REST endpoints
// ============================================


/** Step definition for creating a portal */
export interface ClientPortalStep {
  type: 'upload_documents' | 'sign_document' | 'enter_pin' | 'verify_info';
  title: string;
  description?: string;
  required?: boolean;
  // upload_documents
  acceptedFileTypes?: string[];
  maxFiles?: number;
  // sign_document
  documentToSign?: string;
  // enter_pin
  expectedPin?: string;
  maxPinAttempts?: number;
  // verify_info
  fields?: { key: string; label: string; type: string; value?: string; required?: boolean; options?: string[]; placeholder?: string }[];
}

/** Data to create a client portal */
export interface CreateClientPortalData {
  title: string;
  description?: string;
  recipientName: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientId?: string;       // Internal client ID (e.g. taxPortalId)
  expiresAt?: string;
  tags?: string[];
  notes?: string;
  customFields?: Record<string, any>; // Extra data you need to store
  steps: ClientPortalStep[];
}

/** Response from creating a portal */
export interface CreateClientPortalResult {
  id: string;
  accessToken: string;
  portalUrl: string;
}

/** Public portal step as returned by GET */
export interface PublicPortalStep {
  id: string;
  type: string;
  title: string;
  description?: string;
  required: boolean;
  order: number;
  status: 'pending' | 'completed';
  // upload_documents
  acceptedFileTypes?: string[];
  maxFiles?: number;
  uploadedFiles?: { id?: string; fileName: string; filePath?: string; fileSize?: number; mimeType?: string }[];
  // sign_document
  documentToSign?: string;
  signatureData?: string;
  signerName?: string;
  // enter_pin
  pinVerified?: boolean;
  pinAttempts?: number;
  maxPinAttempts?: number;
  // verify_info
  fields?: { key: string; label: string; type: string; value?: string; required?: boolean; options?: string[]; placeholder?: string }[];
}

/** Public portal data returned by GET */
export interface PublicPortalData {
  id: string;
  title: string;
  description?: string;
  recipientName: string;
  recipientEmail?: string;
  status: 'pending' | 'viewed' | 'in_progress' | 'completed' | 'expired' | 'cancelled';
  businessId: string;
  stepsCompleted: number;
  stepsTotal: number;
  expiresAt?: string;
  completedAt?: string;
  customFields?: Record<string, any>;
  steps?: PublicPortalStep[];
  // Special flags
  expired?: boolean;
}

/** Step submit response */
export interface StepSubmitResult {
  success: boolean;
  stepId?: string;
  stepStatus?: 'pending' | 'completed';
  saved?: boolean;
  stepsCompleted?: number;
  stepsTotal?: number;
  portalStatus?: 'in_progress' | 'completed';
  error?: string;
  attemptsRemaining?: number;
  missingFields?: string[];
}

/**
 * Create a client portal request (authenticated)
 * Uses fetchGraphQLSS with action field
 */
export const createClientPortalRequest = async (data: CreateClientPortalData): Promise<CreateClientPortalResult> => {
  const businessId = authStore.getBusinessId();

  devLog('[ClientPortal] Creating portal:', data);
  const result = await fetchGraphQLSS({
    query: 'addClientPortalRequest',
    params: { businessId },
    form: data,
  });

  if (!result?.success) throw new Error(result?.error || 'Failed to create portal');
  return result.data;
};

/**
 * Get client portal requests (authenticated)
 */
export const getClientPortalRequests = async (filters?: {
  status?: string;
  recipientEmail?: string;
  recipientId?: string;
}): Promise<any[]> => {
  const businessId = authStore.getBusinessId();

  const result = await fetchGraphQLSS({
    query: 'getClientPortalRequests',
    params: { businessId, ...filters },
  });

  return result?.data || [];
};

/**
 * Get client portal by ID (authenticated)
 * Returns full portal with private data (expectedPin, accessToken)
 */
export const getClientPortalRequestById = async (id: string): Promise<any | null> => {
  const businessId = authStore.getBusinessId();

  const result = await fetchGraphQLSS({
    query: 'getClientPortalRequestById',
    params: { businessId, id },
  });

  return result?.data || null;
};

/**
 * Update client portal (public)
 */
export const updateClientPortalRequest = async (id: string, accessToken: string, form: Record<string, any>, businessId?: string): Promise<any> => {
  return fetchPublicSS({
    query: 'updateClientPortalRequest',
    params: { id, accessToken, ...(businessId ? { businessId } : {}) },
    form,
  });
};

/**
 * Delete client portal (authenticated)
 */
export const deleteClientPortalRequest = async (id: string): Promise<any> => {
  const businessId = authStore.getBusinessId();

  return fetchGraphQLSS({
    query: 'deleteClientPortalRequest',
    params: { businessId, id },
  });
};

/**
 * Load client portal public data (no auth)
 * query: getClientPortalByToken
 */
export const getClientPortalPublic = async (id: string, token: string): Promise<PublicPortalData | null> => {
  try {
    const response = await fetchPublicSS({
      query: 'getClientPortalByToken',
      params: { id, token },
    });
    if (!response) return null;
    if (response.expired) return { expired: true } as any;
    if (response.success === false) {
      devLog('getClientPortalByToken failed:', response.error);
      return null;
    }
    return response.data || null;
  } catch (error) {
    devLog('Error loading client portal:', error);
    return null;
  }
};

/**
 * Submit/save a step in the client portal (no auth)
 * query: updateClientPortalRequest
 *
 * complete=true (default): validates and marks step as completed
 * complete=false: saves as draft, step stays pending
 * For enter_pin: complete flag is ignored, auto-completes on correct PIN
 */
export const submitPortalStep = async (
  portalId: string,
  token: string,
  stepId: string,
  data: Record<string, any>,
  complete: boolean = true
): Promise<StepSubmitResult> => {
  try {
    const result = await fetchPublicSS({
      query: 'submitClientPortalStepByToken',
      params: { id: portalId, token, stepId },
      form: { complete, ...data },
    });
    if (!result) return { success: false, error: 'No response' };
    return result;
  } catch (error) {
    devLog('Error submitting portal step:', error);
    return { success: false, error: (error as Error).message };
  }
};

/**
 * Submit all portal steps at once (no auth)
 * query: updateClientPortalRequest
 * Always tries to complete all steps (no draft mode)
 */
export const submitAllPortalSteps = async (
  portalId: string,
  token: string,
  steps: Record<string, Record<string, any>>
): Promise<{ success: boolean; stepResults?: Record<string, any>; stepsCompleted?: number; stepsTotal?: number; portalStatus?: string; error?: string }> => {
  try {
    const result = await fetchPublicSS({
      query: 'updateClientPortalRequest',
      params: { id: portalId, accessToken: token },
      form: { steps },
    });
    if (!result) return { success: false, error: 'No response' };
    return result;
  } catch (error) {
    devLog('Error submitting all portal steps:', error);
    return { success: false, error: (error as Error).message };
  }
};