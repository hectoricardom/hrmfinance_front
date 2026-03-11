import { devLog } from '../../../services/utils';
import { inventoryApi } from '../../../services/apiAdapter';
import {
  TaxClientProfile,
  TaxDocument,
  MagicLinkToken,
  FilingStatus,
  IncomeSource,
  DeductionType,
} from '../types';
import { taxPortalStore } from '../stores/taxPortalStore';
import {
  DEV_TEST_TOKEN,
  DEV_CLIENTS,
  DEV_DOCUMENTS,
  DEV_MAGIC_LINKS,
  initializeDevData,
} from './devSeedData';
import {
  taxPortalFirebase,
  firebaseClientService,
  firebaseDocumentService,
  firebaseMagicLinkService,
} from './taxPortalFirebaseService';

// Flag to track if dev data has been loaded
let devDataLoaded = false;

// API endpoints
const TAX_PORTAL_API_BASE = 'https://ssgloghr.com/api/query';

// Generate unique ID
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const taxPortalService = {
  // ==================== CLIENT MANAGEMENT ====================

  /**
   * Create a new tax client
   */
  async createClient(data: Partial<TaxClientProfile>): Promise<TaxClientProfile> {
    try {
      const client = await firebaseClientService.createClient(data);
      taxPortalStore.upsertClient(client);
      return client;
    } catch (error) {
      devLog('API createClient failed:', error);
      throw error;
    }
  },

  /**
   * Get all tax clients
   */
  async getClients(): Promise<TaxClientProfile[]> {
    taxPortalStore.setLoading(true);
    try {
      const clients = await firebaseClientService.getAllClients();
      taxPortalStore.setClients(clients);
      taxPortalStore.setLoading(false);
      return clients;
    } catch (error) {
      devLog('API getClients failed:', error);
      taxPortalStore.setLoading(false);
      throw error;
    }
  },

  /**
   * Get a single client by ID
   */
  async getClient(clientId: string): Promise<TaxClientProfile | null> {
    try {
      return await firebaseClientService.getClient(clientId);
    } catch (error) {
      devLog('API getClient failed:', error);
      return null;
    }
  },

  /**
   * Update a client
   */
  async updateClient(clientId: string, updates: Partial<TaxClientProfile>): Promise<TaxClientProfile | null> {
    const existing = taxPortalStore.state.clients.find(c => c.id === clientId);
    if (!existing) return null;

    const updated: TaxClientProfile = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    };

    try {
      await firebaseClientService.updateClient(clientId, updates);
      taxPortalStore.upsertClient(updated);
      return updated;
    } catch (error) {
      devLog('API updateClient failed:', error);
      throw error;
    }
  },

  /**
   * Delete a client
   */
  async deleteClient(clientId: string): Promise<boolean> {
    try {
      await firebaseClientService.deleteClient(clientId);
      const clients = taxPortalStore.state.clients.filter(c => c.id !== clientId);
      taxPortalStore.setClients(clients);
      return true;
    } catch (error) {
      devLog('API deleteClient failed:', error);
      throw error;
    }
  },

  // ==================== DOCUMENT MANAGEMENT ====================

  /**
   * Upload a document for a client
   */
  async uploadDocument(
    clientId: string,
    file: File,
    uploadedBy: 'client' | 'preparer' = 'preparer'
  ): Promise<TaxDocument> {
    try {
      // Upload file to storage via inventory API
      const metadata = {
        documentType: 'tax_document',
        originalFileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        isTaxDocument: true,
        taxPortalClientId: clientId,
      };

      const uploadedDoc = await inventoryApi.uploadDocument(file, clientId, metadata);

      // Create document metadata in API
      const taxDoc = await firebaseDocumentService.uploadDocument(clientId, file, uploadedBy);

      // Update with file URL from storage
      if (uploadedDoc.fileUrl || uploadedDoc.url) {
        await firebaseDocumentService.updateDocument(taxDoc.id, {
          fileUrl: uploadedDoc.fileUrl || uploadedDoc.url,
          thumbnailUrl: uploadedDoc.thumbnailUrl,
        });
        taxDoc.fileUrl = uploadedDoc.fileUrl || uploadedDoc.url;
        taxDoc.thumbnailUrl = uploadedDoc.thumbnailUrl;
      }

      taxPortalStore.addDocument(taxDoc);
      return taxDoc;
    } catch (error) {
      devLog('Error uploading document:', error);
      throw error;
    }
  },

  /**
   * Get documents for a client
   */
  async getClientDocuments(clientId: string): Promise<TaxDocument[]> {
    try {
      const docs = await firebaseDocumentService.getClientDocuments(clientId);
      // Update store
      docs.forEach(doc => {
        const existing = taxPortalStore.state.documents.find(d => d.id === doc.id);
        if (!existing) {
          taxPortalStore.addDocument(doc);
        }
      });
      return docs;
    } catch (error) {
      devLog('API getClientDocuments failed:', error);
      return taxPortalStore.getClientDocuments(clientId);
    }
  },

  /**
   * Analyze document with AI
   */
  async analyzeDocument(document: TaxDocument): Promise<TaxDocument> {
    try {
      const result = await inventoryApi.processDocument(
        document.id,
        document.fileUrl,
        document.mimeType
      );

      const analysis = result.aiAnalysis || result;

      const updates: Partial<TaxDocument> = {
        aiAnalyzed: true,
        aiAnalyzedAt: Date.now(),
        detectedType: analysis.detectedType || analysis.documentType,
        confidence: analysis.confidence,
        extractedData: analysis.extractedData,
        documentType: analysis.detectedType || analysis.documentType || document.documentType,
        category: this.categorizeDocument(analysis.detectedType || analysis.documentType),
        status: 'analyzed',
        taxYear: analysis.extractedData?.taxYear,
      };

      taxPortalStore.updateDocument(document.id, updates);

      // Also update in backend
      await inventoryApi.updateDocument(document.id, {
        aiAnalysis: analysis,
        aiResult: analysis,
        aiAnalyzedAt: updates.aiAnalyzedAt,
        documentType: updates.documentType,
      });

      this.saveToLocalStorage();

      return { ...document, ...updates };
    } catch (error) {
      devLog('Error analyzing document:', error);
      throw error;
    }
  },

  /**
   * Approve a document
   */
  async approveDocument(documentId: string, reviewNotes?: string): Promise<void> {
    taxPortalStore.updateDocument(documentId, {
      status: 'approved',
      reviewedAt: Date.now(),
      reviewNotes,
    });
    this.saveToLocalStorage();
  },

  /**
   * Reject a document
   */
  async rejectDocument(documentId: string, reviewNotes: string): Promise<void> {
    taxPortalStore.updateDocument(documentId, {
      status: 'rejected',
      reviewedAt: Date.now(),
      reviewNotes,
    });
    this.saveToLocalStorage();
  },

  /**
   * Categorize document based on type
   */
  categorizeDocument(documentType: string | undefined): TaxDocument['category'] {
    if (!documentType) return 'other';

    const type = documentType.toLowerCase();

    if (type.includes('w2') || type.includes('1099') || type.includes('ssa') || type.includes('income')) {
      return 'income';
    }
    if (type.includes('1098') || type.includes('deduction') || type.includes('expense') || type.includes('charitable')) {
      return 'deductions';
    }
    if (type.includes('credit') || type.includes('childcare') || type.includes('8812') || type.includes('8863')) {
      return 'credits';
    }
    if (type.includes('id') || type.includes('passport') || type.includes('ssn') || type.includes('license')) {
      return 'identity';
    }
    if (type.includes('1040') || type.includes('prior') || type.includes('return')) {
      return 'prior_return';
    }

    return 'other';
  },

  // ==================== MAGIC LINK ====================

  /**
   * Send magic link to client
   */
  async sendMagicLink(clientId: string, method: 'email' | 'sms' | 'both'): Promise<MagicLinkToken> {
    const client = taxPortalStore.state.clients.find(c => c.id === clientId);
    if (!client) throw new Error('Client not found');

    try {
      const magicLink = await firebaseMagicLinkService.createMagicLink(
        clientId,
        client.email,
        client.phone
      );

      // Update local store
      taxPortalStore.upsertClient({
        ...client,
        portalAccessToken: magicLink.token,
        portalAccessExpiry: magicLink.expiresAt,
      });

      const portalUrl = firebaseMagicLinkService.getPortalUrl(magicLink.token);
      devLog('✅ Magic link created:', portalUrl);

      // Try to send notification via backend (email/SMS)
      try {
        await fetch(`${TAX_PORTAL_API_BASE}/magic-link/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId,
            token: magicLink.token,
            email: method !== 'sms' ? client.email : undefined,
            phone: method !== 'email' ? client.phone : undefined,
            portalUrl,
          }),
          credentials: 'include',
        });
      } catch (error) {
        devLog('Could not send notification via backend');
      }

      return magicLink;
    } catch (error) {
      devLog('API createMagicLink failed:', error);
      throw error;
    }
  },

  /**
   * Validate magic link and get client
   */
  async validateMagicLink(token: string): Promise<TaxClientProfile | null> {
    // Check for dev test tokens first (for development/testing)
    const devLink = DEV_MAGIC_LINKS.find(l => l.token === token);
    if (devLink) {
      // Load dev data if not already loaded
      if (!devDataLoaded) {
        this.loadDevData();
      }

      const client = DEV_CLIENTS.find(c => c.id === devLink.clientId);
      if (client) {
        devLog('🧪 Dev mode: Validating test token for', client.firstName, client.lastName);
        taxPortalStore.upsertClient(client);

        // Load dev documents for this client
        const clientDocs = DEV_DOCUMENTS.filter(d => d.clientId === client.id);
        clientDocs.forEach(doc => {
          if (!taxPortalStore.state.documents.find(d => d.id === doc.id)) {
            taxPortalStore.addDocument(doc);
          }
        });

        return client;
      }
    }

    try {
      const client = await firebaseMagicLinkService.validateMagicLink(token);
      if (client) {
        taxPortalStore.upsertClient(client);

        // Load client's documents from API
        const docs = await firebaseDocumentService.getClientDocuments(client.id);
        docs.forEach(doc => {
          if (!taxPortalStore.state.documents.find(d => d.id === doc.id)) {
            taxPortalStore.addDocument(doc);
          }
        });

        return client;
      }
      return null;
    } catch (error) {
      devLog('API validateMagicLink failed:', error);
      return null;
    }
  },

  /**
   * Get portal URL for a client
   */
  getPortalUrl(clientId: string): string {
    const client = taxPortalStore.state.clients.find(c => c.id === clientId);
    if (client?.portalAccessToken) {
      return `${window.location.origin}/#/tax-portal/client/${client.portalAccessToken}`;
    }
    return '';
  },

  // ==================== BULK OPERATIONS ====================

  /**
   * Bulk analyze all pending documents for a client
   */
  async bulkAnalyzeDocuments(clientId: string): Promise<TaxDocument[]> {
    const documents = taxPortalStore.getClientDocuments(clientId);
    const pendingDocs = documents.filter(d => !d.aiAnalyzed && d.status === 'pending');

    const analyzed: TaxDocument[] = [];

    for (const doc of pendingDocs) {
      try {
        const result = await this.analyzeDocument(doc);
        analyzed.push(result);
      } catch (error) {
        devLog(`Error analyzing document ${doc.id}:`, error);
      }
    }

    return analyzed;
  },

  /**
   * Send reminders to clients missing documents
   */
  async sendDocumentReminders(): Promise<number> {
    const clients = taxPortalStore.state.clients.filter(
      c => c.status === 'collecting_documents' && c.documentProgress < 100
    );

    let sentCount = 0;

    for (const client of clients) {
      try {
        await this.sendMagicLink(client.id, 'email');
        sentCount++;
      } catch (error) {
        devLog(`Error sending reminder to ${client.id}:`, error);
      }
    }

    return sentCount;
  },

  // ==================== LOCAL STORAGE ====================

  saveToLocalStorage(): void {
    try {
      const data = {
        clients: taxPortalStore.state.clients,
        documents: taxPortalStore.state.documents,
        checklists: taxPortalStore.state.checklists,
        magicLinks: taxPortalStore.state.magicLinks,
      };
      localStorage.setItem('taxPortalData', JSON.stringify(data));
    } catch (error) {
      devLog('Error saving to local storage:', error);
    }
  },

  loadFromLocalStorage(): {
    clients: TaxClientProfile[];
    documents: TaxDocument[];
    checklists: Record<string, any>;
    magicLinks: MagicLinkToken[];
  } {
    try {
      const stored = localStorage.getItem('taxPortalData');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      devLog('Error loading from local storage:', error);
    }

    return { clients: [], documents: [], checklists: {}, magicLinks: [] };
  },

  /**
   * Initialize store from local storage
   */
  async initialize(): Promise<void> {
    const stored = this.loadFromLocalStorage();

    if (stored.clients.length > 0) {
      taxPortalStore.setClients(stored.clients);
    }

    if (stored.documents.length > 0) {
      taxPortalStore.setDocuments(stored.documents);
    }

    // Load dev data for testing (always load in development)
    this.loadDevData();

    // Try to sync with backend
    try {
      await this.getClients();
    } catch (error) {
      devLog('Could not sync with backend');
    }
  },

  /**
   * Load development seed data for testing
   * This provides fake clients and a test token for development
   */
  loadDevData(): void {
    if (devDataLoaded) return;

    devLog('🧪 Tax Portal: Loading development seed data...');

    // Add dev clients if they don't exist
    DEV_CLIENTS.forEach(client => {
      if (!taxPortalStore.state.clients.find(c => c.id === client.id)) {
        taxPortalStore.upsertClient(client);
      }
    });

    // Add dev documents if they don't exist
    DEV_DOCUMENTS.forEach(doc => {
      if (!taxPortalStore.state.documents.find(d => d.id === doc.id)) {
        taxPortalStore.addDocument(doc);
      }
    });

    devDataLoaded = true;

    devLog('✅ Tax Portal: Dev data loaded!');
    devLog(`   - ${DEV_CLIENTS.length} test clients`);
    devLog(`   - ${DEV_DOCUMENTS.length} test documents`);
    devLog('');
    devLog('🔗 TEST CLIENT PORTAL URLS:');
    devLog(`   Maria (25% complete): ${window.location.origin}/#/tax-portal/client/${DEV_TEST_TOKEN}`);
    devLog(`   John (100% complete): ${window.location.origin}/#/tax-portal/client/TEST_TOKEN_JOHN_67890`);
    devLog(`   Roberto (85% complete): ${window.location.origin}/#/tax-portal/client/TEST_TOKEN_ROBERTO_11111`);
    devLog('');
    devLog('🔗 PREPARER DASHBOARD: ' + window.location.origin + '/#/tax-portal');
    devLog('');
  },
};
