import { createSignal, createRoot } from 'solid-js';
import { createStore } from 'solid-js/store';
import {
  TaxClientProfile,
  TaxDocument,
  DocumentChecklist,
  ChecklistItem,
  MagicLinkToken,
  TaxPreparerDashboardStats,
  getRequiredDocumentsForClient,
  REQUIRED_DOCUMENTS
} from '../types';

// Store state interface
interface TaxPortalState {
  clients: TaxClientProfile[];
  documents: TaxDocument[];
  checklists: Record<string, DocumentChecklist>;
  magicLinks: MagicLinkToken[];
  isLoading: boolean;
  error: string | null;
}

function createTaxPortalStore() {
  const [state, setState] = createStore<TaxPortalState>({
    clients: [],
    documents: [],
    checklists: {},
    magicLinks: [],
    isLoading: false,
    error: null,
  });

  const [selectedClientId, setSelectedClientId] = createSignal<string | null>(null);

  // Get selected client
  const getSelectedClient = () => {
    const id = selectedClientId();
    return id ? state.clients.find(c => c.id === id) : null;
  };

  // Get documents for a client
  const getClientDocuments = (clientId: string) => {
    return state.documents.filter(d => d.clientId === clientId);
  };

  // Get checklist for a client
  const getClientChecklist = (clientId: string) => {
    return state.checklists[clientId];
  };

  // Calculate dashboard stats
  const getDashboardStats = (): TaxPreparerDashboardStats => {
    const clientsByStatus: Record<TaxClientProfile['status'], number> = {
      intake: 0,
      collecting_documents: 0,
      documents_complete: 0,
      in_review: 0,
      ready_to_file: 0,
      filed: 0,
      completed: 0,
    };

    state.clients.forEach(c => {
      clientsByStatus[c.status]++;
    });

    const documentsToReview = state.documents.filter(
      d => d.status === 'analyzed' || d.status === 'pending'
    ).length;

    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const completedThisWeek = state.clients.filter(
      c => c.status === 'completed' && c.updatedAt > oneWeekAgo
    ).length;

    const avgProgress = state.clients.length > 0
      ? state.clients.reduce((sum, c) => sum + c.documentProgress, 0) / state.clients.length
      : 0;

    return {
      totalClients: state.clients.length,
      clientsByStatus,
      documentsToReview,
      completedThisWeek,
      averageDocumentProgress: Math.round(avgProgress),
    };
  };

  // Actions

  // Add or update a client
  const upsertClient = (client: TaxClientProfile) => {
    setState('clients', (clients) => {
      const existingIndex = clients.findIndex(c => c.id === client.id);
      if (existingIndex >= 0) {
        return [...clients.slice(0, existingIndex), client, ...clients.slice(existingIndex + 1)];
      }
      return [...clients, client];
    });
    // Generate checklist for new client
    generateChecklist(client);
  };

  // Add multiple clients
  const setClients = (clients: TaxClientProfile[]) => {
    setState('clients', clients);
    // Generate checklists for all clients
    clients.forEach(generateChecklist);
  };

  // Update client status
  const updateClientStatus = (clientId: string, status: TaxClientProfile['status']) => {
    setState('clients', (c) => c.id === clientId, 'status', status);
    setState('clients', (c) => c.id === clientId, 'updatedAt', Date.now());
  };

  // Update client document progress
  const updateClientProgress = (clientId: string) => {
    const checklist = state.checklists[clientId];
    if (!checklist) return;

    const requiredItems = checklist.items.filter(i => i.required);
    const completedItems = requiredItems.filter(i => i.status === 'approved' || i.status === 'uploaded' || i.status === 'analyzed');
    const progress = requiredItems.length > 0
      ? Math.round((completedItems.length / requiredItems.length) * 100)
      : 0;

    setState('clients', (c) => c.id === clientId, 'documentProgress', progress);

    // Auto-update status based on progress
    if (progress === 100) {
      updateClientStatus(clientId, 'documents_complete');
    } else if (progress > 0) {
      const client = state.clients.find(c => c.id === clientId);
      if (client?.status === 'intake') {
        updateClientStatus(clientId, 'collecting_documents');
      }
    }
  };

  // Add document
  const addDocument = (document: TaxDocument) => {
    setState('documents', (docs) => [...docs, document]);
    // Update checklist
    updateChecklistForDocument(document);
    // Update client progress
    updateClientProgress(document.clientId);
  };

  // Update document
  const updateDocument = (documentId: string, updates: Partial<TaxDocument>) => {
    setState('documents', (d) => d.id === documentId, updates as any);

    const doc = state.documents.find(d => d.id === documentId);
    if (doc) {
      updateChecklistForDocument({ ...doc, ...updates } as TaxDocument);
      updateClientProgress(doc.clientId);
    }
  };

  // Set all documents
  const setDocuments = (documents: TaxDocument[]) => {
    setState('documents', documents);
  };

  // Generate checklist for a client
  const generateChecklist = (client: TaxClientProfile) => {
    const requiredDocs = getRequiredDocumentsForClient(client);
    const existingChecklist = state.checklists[client.id];
    const clientDocs = state.documents.filter(d => d.clientId === client.id);

    const items: ChecklistItem[] = requiredDocs.map(reqDoc => {
      const existingItem = existingChecklist?.items.find(i => i.documentId === reqDoc.id);
      const matchingDocs = clientDocs.filter(d =>
        reqDoc.formTypes.some(ft =>
          d.documentType?.toLowerCase().includes(ft.toLowerCase()) ||
          d.detectedType?.toLowerCase().includes(ft.toLowerCase())
        )
      );

      let status: ChecklistItem['status'] = 'missing';
      if (matchingDocs.some(d => d.status === 'approved')) {
        status = 'approved';
      } else if (matchingDocs.some(d => d.status === 'analyzed' || d.status === 'reviewed')) {
        status = 'analyzed';
      } else if (matchingDocs.length > 0) {
        status = 'uploaded';
      }

      return {
        id: reqDoc.id,
        documentId: reqDoc.id,
        name: reqDoc.name,
        description: reqDoc.description,
        category: reqDoc.category,
        required: reqDoc.required,
        status: existingItem?.status === 'approved' ? 'approved' : status,
        uploadedDocumentIds: matchingDocs.map(d => d.id),
        notes: existingItem?.notes,
      };
    });

    setState('checklists', client.id, {
      clientId: client.id,
      taxYear: client.taxYear,
      items,
      generatedAt: existingChecklist?.generatedAt || Date.now(),
      lastUpdated: Date.now(),
    });
  };

  // Update checklist when a document is added/updated
  const updateChecklistForDocument = (document: TaxDocument) => {
    const checklist = state.checklists[document.clientId];
    if (!checklist) return;

    const detectedType = document.detectedType || document.documentType;
    if (!detectedType) return;

    // Find matching checklist item
    const matchingReqDoc = REQUIRED_DOCUMENTS.find(rd =>
      rd.formTypes.some(ft =>
        detectedType.toLowerCase().includes(ft.toLowerCase())
      )
    );

    if (matchingReqDoc) {
      setState('checklists', document.clientId, 'items', (i) => i.documentId === matchingReqDoc.id, (item) => {
        const docIds = item.uploadedDocumentIds.includes(document.id)
          ? item.uploadedDocumentIds
          : [...item.uploadedDocumentIds, document.id];

        let status: ChecklistItem['status'] = item.status;
        if (document.status === 'approved') {
          status = 'approved';
        } else if (document.status === 'analyzed' || document.status === 'reviewed') {
          status = 'analyzed';
        } else if (docIds.length > 0 && status === 'missing') {
          status = 'uploaded';
        }

        return { ...item, uploadedDocumentIds: docIds, status };
      });
      setState('checklists', document.clientId, 'lastUpdated', Date.now());
    }
  };

  // Create magic link for client
  const createMagicLink = (clientId: string, email: string, phone?: string): MagicLinkToken => {
    const token = generateToken();
    const magicLink: MagicLinkToken = {
      token,
      clientId,
      email,
      phone,
      createdAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      used: false,
    };

    setState('magicLinks', (links) => [...links, magicLink]);

    // Update client with portal access token
    setState('clients', (c) => c.id === clientId, {
      portalAccessToken: token,
      portalAccessExpiry: magicLink.expiresAt,
    } as any);

    return magicLink;
  };

  // Validate magic link token
  const validateMagicLink = (token: string): TaxClientProfile | null => {
    const link = state.magicLinks.find(l => l.token === token);
    if (!link) return null;
    if (link.expiresAt < Date.now()) return null;

    const client = state.clients.find(c => c.id === link.clientId);
    if (!client) return null;

    // Mark as used
    setState('magicLinks', (l) => l.token === token, 'used', true);
    setState('magicLinks', (l) => l.token === token, 'usedAt', Date.now());

    // Update client last access
    setState('clients', (c) => c.id === link.clientId, 'lastPortalAccess', Date.now());

    return client;
  };

  // Set loading state
  const setLoading = (loading: boolean) => {
    setState('isLoading', loading);
  };

  // Set error
  const setError = (error: string | null) => {
    setState('error', error);
  };

  // Generate random token
  const generateToken = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  };

  return {
    // State
    state,
    selectedClientId,
    setSelectedClientId,

    // Getters
    getSelectedClient,
    getClientDocuments,
    getClientChecklist,
    getDashboardStats,

    // Actions
    upsertClient,
    setClients,
    updateClientStatus,
    updateClientProgress,
    addDocument,
    updateDocument,
    setDocuments,
    generateChecklist,
    createMagicLink,
    validateMagicLink,
    setLoading,
    setError,
  };
}

// Create singleton store
export const taxPortalStore = createRoot(createTaxPortalStore);
