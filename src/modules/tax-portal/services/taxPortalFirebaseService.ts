/**
 * Tax Portal Service
 *
 * Handles all Tax Portal operations using the API connector.
 * This file maintains the same interface as before but uses API instead of Firebase.
 */

import { devLog } from '../../../services/utils';
import { taxPortalConnector } from '../../../connectors/tax-portal';
import {
  TaxClientProfile,
  TaxDocument,
  MagicLinkToken,
  DocumentChecklist,
} from '../types';

// ==================== CLIENT OPERATIONS ====================

export const firebaseClientService = {
  /**
   * Create a new tax client
   */
  async createClient(data: Partial<TaxClientProfile>): Promise<TaxClientProfile> {
    const client = await taxPortalConnector.createClient(data);
    // Generate initial checklist
    await taxPortalConnector.generateChecklist(client);
    return client;
  },

  /**
   * Get all tax clients
   */
  async getAllClients(): Promise<TaxClientProfile[]> {
    return taxPortalConnector.getAllClients();
  },

  /**
   * Get a single client by ID
   */
  async getClient(clientId: string): Promise<TaxClientProfile | null> {
    return taxPortalConnector.getClient(clientId);
  },

  /**
   * Get client by linked Google userId
   */
  async getClientByUserId(userId: string, token?:string): Promise<TaxClientProfile | null> {
    return taxPortalConnector.getClientByUserId(userId, token);
  },

  /**
   * Get client by email
   */
  async getClientByEmail(email: string): Promise<TaxClientProfile | null> {
    return taxPortalConnector.getClientByEmail(email);
  },

  /**
   * Link a Google userId to a client
   */
  async linkUserIdToClient(clientId: string, userId: string): Promise<void> {
    return taxPortalConnector.linkUserIdToClient(clientId, userId);
  },

  /**
   * Update a client
   */
  async updateClient(clientId: string, updates: Partial<TaxClientProfile>): Promise<void> {
    return taxPortalConnector.updateClient(clientId, updates);
  },

  /**
   * Delete a client
   */
  async deleteClient(clientId: string): Promise<void> {
    return taxPortalConnector.deleteClient(clientId);
  },

  /**
   * Generate checklist for a client
   */
  async generateChecklist(client: TaxClientProfile): Promise<DocumentChecklist> {
    return taxPortalConnector.generateChecklist(client);
  },

  /**
   * Get checklist for a client
   */
  async getChecklist(clientId: string): Promise<DocumentChecklist | null> {
    return taxPortalConnector.getChecklist(clientId);
  },

  /**
   * Update checklist
   */
  async updateChecklist(clientId: string, updates: Partial<DocumentChecklist>): Promise<void> {
    return taxPortalConnector.updateChecklist(clientId, updates);
  },
};

// ==================== DOCUMENT OPERATIONS ====================

export const firebaseDocumentService = {
  /**
   * Upload a document (create metadata - file upload handled by taxPortalService)
   */
  async uploadDocument(
    clientId: string,
    file: File,
    uploadedBy: 'client' | 'preparer' = 'preparer'
  ): Promise<TaxDocument> {
    // Note: Actual file upload is handled by taxPortalService which uploads to storage
    // This creates the document metadata in the API
    return taxPortalConnector.createDocument(clientId, {
      originalFileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      uploadedBy,
    });
  },

  /**
   * Get all documents for a client
   */
  async getClientDocuments(clientId: string): Promise<TaxDocument[]> {
    return taxPortalConnector.getClientDocuments(clientId);
  },

  /**
   * Update a document
   */
  async updateDocument(documentId: string, updates: Partial<TaxDocument>): Promise<void> {
    return taxPortalConnector.updateDocument(documentId, updates);
  },

  /**
   * Delete a document
   */
  async deleteDocument(document: TaxDocument): Promise<void> {
    return taxPortalConnector.deleteDocument(document.id);
  },

  /**
   * Subscribe to document changes for a client (polling-based since API doesn't support real-time)
   * Returns a cleanup function
   */
  subscribeToClientDocuments(
    clientId: string,
    callback: (documents: TaxDocument[]) => void
  ): () => void {
    let intervalId: number | null = null;
    let isActive = true;

    const pollDocuments = async () => {
      if (!isActive) return;
      try {
        const docs = await taxPortalConnector.getClientDocuments(clientId);
        if (isActive) {
          callback(docs);
        }
      } catch (error) {
        devLog('Error polling documents:', error);
      }
    };

    // Initial fetch
    pollDocuments();

    // Poll every 10 seconds
    intervalId = window.setInterval(pollDocuments, 10000);

    // Return cleanup function
    return () => {
      isActive = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  },
};

// ==================== MAGIC LINK OPERATIONS ====================

export const firebaseMagicLinkService = {
  /**
   * Create a magic link for a client
   */
  async createMagicLink(clientId: string, email: string, phone?: string): Promise<MagicLinkToken> {
    return taxPortalConnector.createMagicLink(clientId, email, phone);
  },

  /**
   * Validate a magic link token and return the client
   */
  async validateMagicLink(token: string): Promise<TaxClientProfile | null> {
    return taxPortalConnector.validateMagicLink(token);
  },

  /**
   * Get portal URL for a client
   */
  getPortalUrl(token: string): string {
    return taxPortalConnector.getPortalUrl(token);
  },
};

// ==================== COMBINED SERVICE ====================

export const taxPortalFirebase = {
  clients: firebaseClientService,
  documents: firebaseDocumentService,
  magicLinks: firebaseMagicLinkService,

  /**
   * Initialize - verify API connection
   */
  async initialize(): Promise<boolean> {
    try {
      // Try to fetch clients to verify connection
      await taxPortalConnector.getAllClients();
      devLog('✅ Tax Portal API: Connection verified');
      return true;
    } catch (error) {
      devLog('⚠️ Tax Portal API: Connection check failed');
      return false;
    }
  },
};
