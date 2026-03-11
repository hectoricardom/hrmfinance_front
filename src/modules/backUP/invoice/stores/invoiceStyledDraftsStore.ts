import { createSignal } from 'solid-js';
import type { InvoiceStyledFormData } from './invoiceStyledFormStore';
import { devLog } from '../../../services/utils';

// Draft invoice with metadata
export interface InvoiceStyledDraft {
  id: string;
  data: InvoiceStyledFormData;
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    customerName: string;
    invoiceNumber: string;
    description: string;
    totalAmount?: number;
  };
}

// Storage key for localStorage
const DRAFTS_STORAGE_KEY = 'invoice_styled_drafts';

// Generate unique ID for drafts
const generateDraftId = (): string => {
  return `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Calculate total amount for a draft
const calculateDraftTotal = (data: InvoiceStyledFormData): number => {
  const productsTotal = data.products.reduce((sum, p) => sum + p.total, 0);
  const reservasTotal = data.reservas.reduce((sum, r) => sum + r.total, 0);
  const servicesTotal = data.services.reduce((sum, s) => sum + s.total, 0);
  return productsTotal + reservasTotal + servicesTotal;
};

// Load drafts from localStorage
const loadDraftsFromStorage = (): InvoiceStyledDraft[] => {
  try {
    const stored = localStorage.getItem(DRAFTS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Convert date strings back to Date objects
      return parsed.map((draft: any) => ({
        ...draft,
        metadata: {
          ...draft.metadata,
          createdAt: new Date(draft.metadata.createdAt),
          updatedAt: new Date(draft.metadata.updatedAt)
        }
      }));
    }
  } catch (error) {
    devLog('Failed to load invoice drafts from storage:', error);
  }
  return [];
};

// Save drafts to localStorage
const saveDraftsToStorage = (drafts: InvoiceStyledDraft[]) => {
  try {
    localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
  } catch (error) {
    devLog('Failed to save invoice drafts to storage:', error);
  }
};

// Global signal for drafts
const [drafts, setDrafts] = createSignal<InvoiceStyledDraft[]>(loadDraftsFromStorage());

// Export the drafts store
export const invoiceStyledDraftsStore = {
  // Get all drafts
  getDrafts: () => drafts(),

  // Get draft count
  getCount: () => drafts().length,

  // Save current form data as a new draft
  saveDraft: (formData: InvoiceStyledFormData): InvoiceStyledDraft => {
    const newDraft: InvoiceStyledDraft = {
      id: generateDraftId(),
      data: formData,
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        customerName: formData.shipper_consignee?.name ||
                     `${formData.shipper_consignee?.firstName || ''} ${formData.shipper_consignee?.lastName || ''}`.trim() ||
                     'Unnamed Customer',
        invoiceNumber: formData.invoice || 'No Invoice #',
        description: formData.description || '',
        totalAmount: calculateDraftTotal(formData)
      }
    };

    setDrafts(prev => {
      const updated = [...prev, newDraft];
      saveDraftsToStorage(updated);
      return updated;
    });

    return newDraft;
  },

  // Update an existing draft
  updateDraft: (draftId: string, formData: InvoiceStyledFormData): void => {
    setDrafts(prev => {
      const updated = prev.map(draft => {
        if (draft.id === draftId) {
          return {
            ...draft,
            data: formData,
            metadata: {
              ...draft.metadata,
              updatedAt: new Date(),
              customerName: formData.shipper_consignee?.name ||
                           `${formData.shipper_consignee?.firstName || ''} ${formData.shipper_consignee?.lastName || ''}`.trim() ||
                           'Unnamed Customer',
              invoiceNumber: formData.invoice || 'No Invoice #',
              description: formData.description || '',
              totalAmount: calculateDraftTotal(formData)
            }
          };
        }
        return draft;
      });
      saveDraftsToStorage(updated);
      return updated;
    });
  },

  // Delete a draft
  deleteDraft: (draftId: string): void => {
    setDrafts(prev => {
      const updated = prev.filter(draft => draft.id !== draftId);
      saveDraftsToStorage(updated);
      return updated;
    });
  },

  // Get a specific draft by ID
  getDraft: (draftId: string): InvoiceStyledDraft | undefined => {
    return drafts().find(draft => draft.id === draftId);
  },

  // Clear all drafts
  clearAllDrafts: (): void => {
    setDrafts([]);
    localStorage.removeItem(DRAFTS_STORAGE_KEY);
  },

  // Delete drafts for a successfully submitted invoice
  deleteDraftByInvoiceNumber: (invoiceNumber: string): void => {
    setDrafts(prev => {
      const updated = prev.filter(
        draft => draft.metadata.invoiceNumber !== invoiceNumber
      );
      saveDraftsToStorage(updated);
      return updated;
    });
  },

  // Get drafts sorted by most recent
  getDraftsSorted: (): InvoiceStyledDraft[] => {
    return [...drafts()].sort((a, b) =>
      b.metadata.updatedAt.getTime() - a.metadata.updatedAt.getTime()
    );
  },

  // Search drafts by customer name, invoice number, or description
  searchDrafts: (query: string): InvoiceStyledDraft[] => {
    const lowerQuery = query.toLowerCase();
    return drafts().filter(draft =>
      draft.metadata.customerName.toLowerCase().includes(lowerQuery) ||
      draft.metadata.invoiceNumber.toLowerCase().includes(lowerQuery) ||
      draft.metadata.description.toLowerCase().includes(lowerQuery)
    );
  }
};
