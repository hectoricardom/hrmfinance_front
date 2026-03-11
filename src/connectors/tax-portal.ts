/**
 * Tax Portal API Connector
 *
 * Handles all Tax Portal API operations using the fetchGraphQLSS utility.
 * Replaces Firebase implementation for client, document, and magic link operations.
 */

import { devLog, fetchGraphQLSS } from '../services/utils';
import { authStore } from '../stores/authStore';
import {
  TaxClientProfile,
  TaxDocument,
  MagicLinkToken,
  DocumentChecklist,
  ChecklistItem,
  getRequiredDocumentsForClient,
} from '../modules/tax-portal/types';

// Helper to generate IDs
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const generateToken = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

export class TaxPortalConnector {
  // ==================== CLIENT OPERATIONS ====================

  /**
   * Get all tax portal clients
   */
  async getAllClients(): Promise<TaxClientProfile[]> {
    const params = {
      businessId: authStore.getBusinessId(),
      type: 'client',
    };

    const response = await fetchGraphQLSS({
      query: 'getAllTaxPortal',
      params,
      queryString: "!* contain :search0 AND !* contain :search1 AND !* contain :search2 AND !* contain :search3 AND !* contain :search4 AND type = :type"
    });

    devLog('✅ API: Loaded clients');
    // Filter to only return client records (excludes checklists, documents, magicLinks)
    // Also handles backward compatibility for records without type field
    const data = response?.data || [];
    return data.filter((item: any) =>
      item.type === 'client' || (!item.type && item.firstName !== undefined)
    );
  }

  /**
   * Get a single client by ID
   */
  async getClient(clientId: string): Promise<TaxClientProfile | null> {
    const params = {
      businessId: authStore.getBusinessId(),
      id: clientId,
    };

    const response = await fetchGraphQLSS({
      query: 'getTaxPortal',
      params,
      queryString: 'id = id',
    });

    return response?.data || null;
  }

  /**
   * Get client by linked Google userId
   */
  async getClientByUserId(userId: string, token?: string): Promise<TaxClientProfile | null> {
    const params = {
      businessId: authStore.getBusinessId(),
      id: userId,
      token
    };

    const response = await fetchGraphQLSS({
      query: 'getTaxPortal',
      params,
      queryString: 'id = id AND portalAccessToken = token',
    });

   


    const clients = response?.data || [];
    if (clients.length > 0) {
      devLog('✅ API: Found client by userId:', userId);
      return clients[0];
    }
    return null;
  }

  /**
   * Get client by email
   */
  async getClientByEmail(email: string): Promise<TaxClientProfile | null> {
    const params = {
      businessId: authStore.getBusinessId(),
      email: email.toLowerCase(),
    };

    const response = await fetchGraphQLSS({
      query: 'getTaxPortal',
      params,
    });

    const clients = response?.data || [];
    const matchingClient = clients.find((c: TaxClientProfile) =>
      c?.email?.toLowerCase() === email?.toLowerCase()
    );

    devLog({matchingClient})

    if (matchingClient) {
      devLog('✅ API: Found client by email:', email);
      return matchingClient;
    }
    return null;
  }

  /**
   * Create a new tax client
   */
  async createClient(data: Partial<TaxClientProfile>): Promise<TaxClientProfile> {
    const clientId = generateId();
    const now = Date.now();

    const client: TaxClientProfile = {
      id: clientId,
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      email: data.email || '',
      phone: data.phone || '',
      ssn: data.ssn,
      dateOfBirth: data.dateOfBirth,
      address: data.address,
      city: data.city,
      state: data.state,
      zipCode: data.zipCode,
      taxYear: data.taxYear || new Date().getFullYear() - 1,
      filingStatus: data.filingStatus || 'single',
      hasDependents: data.hasDependents || false,
      dependents: data.dependents || [],
      incomeSources: data.incomeSources || [],
      deductions: data.deductions || [],
      isHomeowner: data.isHomeowner || false,
      isStudent: data.isStudent || false,
      hasBusiness: data.hasBusiness || false,
      hasInvestments: data.hasInvestments || false,
      hasRentalProperty: data.hasRentalProperty || false,
      receivedHealthInsurance: data.receivedHealthInsurance || false,
      status: 'intake',
      documentProgress: 0,
      createdAt: now,
      updatedAt: now,
      notes: data.notes,
      businessId: authStore.getBusinessId(),
    };

    const params = {
      businessId: authStore.getBusinessId(),
    };

    const response = await fetchGraphQLSS({
      query: 'addTaxPortal',
      params,
      form: { ...client, type: 'client' },
    });

    devLog('✅ API: Client created:', clientId);
    return response?.data || client;
  }

  /**
   * Update a client
   */
  async updateClient(clientId: string, updates: Partial<TaxClientProfile>): Promise<void> {
    const params = {
      //businessId: authStore.getBusinessId(),
      id: clientId,
    };

    await fetchGraphQLSS({
      query: 'updateTaxPortal',
      params,
      form: {
        ...updates,
        updatedAt: Date.now(),
      },
    });

    devLog('✅ API: Client updated:', clientId);
  }

  /**
   * Link a Google userId to a client
   */
  async linkUserIdToClient(clientId: string, userId: string): Promise<void> {
    await this.updateClient(clientId, { linkedUserId: userId });
    devLog('✅ API: Linked userId', userId, 'to client:', clientId);
  }

  /**
   * Delete a client
   */
  async deleteClient(clientId: string): Promise<void> {
    const params = {
      //businessId: authStore.getBusinessId(),
      id: clientId,
    };

    await fetchGraphQLSS({
      query: 'deleteTaxPortal',
      params,
    });

    devLog('✅ API: Client deleted:', clientId);
  }

  // ==================== DOCUMENT OPERATIONS ====================

  /**
   * Get all documents for a client
   */
  async getClientDocuments(clientId: string): Promise<TaxDocument[]> {
    const params = {
      businessId: authStore.getBusinessId(),
      clientId,
    };

    const response = await fetchGraphQLSS({
      query: 'getTaxPortal',
      params,
      queryString: 'clientId = :clientId AND type = "document"',
    });

    devLog('✅ API: Loaded documents for client:', clientId);
    return response?.data || [];
  }

  /**
   * Upload a document (metadata only - file upload handled separately)
   */
  async createDocument(
    clientId: string,
    documentData: Partial<TaxDocument>
  ): Promise<TaxDocument> {
    const documentId = generateId();
    const now = Date.now();

    const taxDocument: TaxDocument = {
      id: documentId,
      clientId,
      documentType: documentData.documentType || 'pending_analysis',
      category: documentData.category || 'other',
      originalFileName: documentData.originalFileName || '',
      fileUrl: documentData.fileUrl || '',
      thumbnailUrl: documentData.thumbnailUrl,
      mimeType: documentData.mimeType || '',
      fileSize: documentData.fileSize || 0,
      aiAnalyzed: false,
      status: 'pending',
      uploadedAt: now,
      uploadedBy: documentData.uploadedBy || 'preparer',
    };

    const params = {
      businessId: authStore.getBusinessId(),
    };

    const response = await fetchGraphQLSS({
      query: 'addTaxPortal',
      params,
      form: { ...taxDocument, type: 'document' },
    });

    devLog('✅ API: Document created:', documentId);
    return response?.data || taxDocument;
  }

  /**
   * Update a document
   */
  async updateDocument(documentId: string, updates: Partial<TaxDocument>): Promise<void> {
    const params = {
      businessId: authStore.getBusinessId(),
      id: documentId,
    };

    await fetchGraphQLSS({
      query: 'updateTaxPortal',
      params,
      form: updates,
    });

    devLog('✅ API: Document updated:', documentId);
  }

  /**
   * Delete a document
   */
  async deleteDocument(documentId: string): Promise<void> {
    const params = {
      businessId: authStore.getBusinessId(),
      id: documentId,
    };

    await fetchGraphQLSS({
      query: 'deleteTaxPortal',
      params,
    });

    devLog('✅ API: Document deleted:', documentId);
  }

  // ==================== MAGIC LINK OPERATIONS ====================

  /**
   * Create a magic link for a client
   */
  async createMagicLink(clientId: string, email: string, phone?: string): Promise<MagicLinkToken> {
    const token = generateToken();
    const now = Date.now();
    const expiresAt = now + 7 * 24 * 60 * 60 * 1000; // 7 days

    const magicLink: MagicLinkToken = {
      token,
      clientId,
      email,
      phone,
      createdAt: now,
      expiresAt,
      used: false,
    };

    const params = {
      businessId: authStore.getBusinessId(),
    };

    await fetchGraphQLSS({
      query: 'addTaxPortal',
      params,
      form: { ...magicLink, type: 'magicLink', id: token },
    });

    // Update client with portal access token
    await this.updateClient(clientId, {
      portalAccessToken: token,
      portalAccessExpiry: expiresAt,
    });

    devLog('✅ API: Magic link created for client:', clientId);
    return magicLink;
  }

  /**
   * Validate a magic link token and return the client
   */
  async validateMagicLink(token: string): Promise<TaxClientProfile | null> {
    const params = {
      businessId: authStore.getBusinessId(),
      id: token,
    };

    const response = await fetchGraphQLSS({
      query: 'getTaxPortal',
      params,
      queryString: 'id = id',
    });



    const linkData = response?.data;
    if (!linkData || linkData.type !== 'magicLink') {
      devLog('❌ API: Magic link not found:', token);
      return null;
    }

    // Check if expired
    if (linkData.expiresAt < Date.now()) {
      devLog('❌ API: Magic link expired:', token);
      return null;
    }

    // Get client
    const client = await this.getClient(linkData.clientId);
    if (!client) {
      devLog('❌ API: Client not found for magic link');
      return null;
    }

    // Mark as used and update last access
    await fetchGraphQLSS({
      query: 'updateTaxPortal',
      params: { businessId: authStore.getBusinessId(), id: token },
      form: { used: true, usedAt: Date.now() },
    });

    await this.updateClient(client.id, {
      lastPortalAccess: Date.now(),
    });

    devLog('✅ API: Magic link validated for client:', client.firstName, client.lastName);
    return client;
  }

  /**
   * Get portal URL for a client
   */
  getPortalUrl(token: string): string {
    return `${window.location.origin}/#/tax-portal/client/${token}`;
  }

  // ==================== CHECKLIST OPERATIONS ====================

  /**
   * Generate checklist for a client
   */
  async generateChecklist(client: TaxClientProfile): Promise<DocumentChecklist> {
    const requiredDocs = getRequiredDocumentsForClient(client);
    const now = Date.now();

    const items: ChecklistItem[] = requiredDocs.map(reqDoc => ({
      id: reqDoc.id,
      documentId: reqDoc.id,
      name: reqDoc.name,
      description: reqDoc.description,
      category: reqDoc.category,
      required: reqDoc.required,
      status: 'missing',
      uploadedDocumentIds: [],
    }));

    const checklist: DocumentChecklist = {
      clientId: client.id,
      taxYear: client.taxYear,
      items,
      generatedAt: now,
      lastUpdated: now,
    };

    const params = {
      businessId: authStore.getBusinessId(),
    };

    await fetchGraphQLSS({
      query: 'addTaxPortal',
      params,
      form: { ...checklist, type: 'checklist', id: `checklist-${client.id}` },
    });

    devLog('✅ API: Checklist generated for client:', client.id);
    return checklist;
  }

  /**
   * Get checklist for a client
   */
  async getChecklist(clientId: string): Promise<DocumentChecklist | null> {
    const params = {
      businessId: authStore.getBusinessId(),
      id: `checklist-${clientId}`,
    };

    const response = await fetchGraphQLSS({
      query: 'getTaxPortalById',
      params,
    });

    const data = response?.data;
    if (!data || data.type !== 'checklist') {
      return null;
    }

    return data as DocumentChecklist;
  }

  /**
   * Update checklist
   */
  async updateChecklist(clientId: string, updates: Partial<DocumentChecklist>): Promise<void> {
    const params = {
      businessId: authStore.getBusinessId(),
      id: `checklist-${clientId}`,
    };

    await fetchGraphQLSS({
      query: 'updateTaxPortal',
      params,
      form: {
        ...updates,
        lastUpdated: Date.now(),
      },
    });
  }

  // ==================== STATS & QUERIES ====================

  /**
   * Get clients by status
   */
  async getClientsByStatus(status: string): Promise<TaxClientProfile[]> {
    const params = {
      businessId: authStore.getBusinessId(),
      status,
    };

    const response = await fetchGraphQLSS({
      query: 'getTaxPortalByStatus',
      params,
    });

    return response?.data || [];
  }

  /**
   * Get clients by tax year
   */
  async getClientsByTaxYear(taxYear: number): Promise<TaxClientProfile[]> {
    const params = {
      businessId: authStore.getBusinessId(),
      taxYear,
    };

    const response = await fetchGraphQLSS({
      query: 'getTaxPortalByTaxYear',
      params,
    });

    return response?.data || [];
  }

  /**
   * Search clients
   */
  async searchClients(searchTerm: string): Promise<TaxClientProfile[]> {
    const params = {
      businessId: authStore.getBusinessId(),
      searchTerm,
    };

    const response = await fetchGraphQLSS({
      query: 'searchTaxPortal',
      params,
    });

    return response?.data || [];
  }

  /**
   * Get tax portal statistics
   */
  async getStats(): Promise<any> {
    const params = {
      businessId: authStore.getBusinessId(),
    };

    const response = await fetchGraphQLSS({
      query: 'getTaxPortalStats',
      params,
    });

    return response?.data;
  }
}

export const taxPortalConnector = new TaxPortalConnector();
