import { createSignal } from 'solid-js';
import { devLog } from '../../../services/utils';

// Enhanced types for the invoice form
interface InvoiceProduct {
  id: string;
  product: {
    id: string;
    code: string;
    label: string;
    price?: number;
  };
  qty: number;
  salePrice: number;
  total: number;
}

interface InvoiceReserva {
  id: string;
  type: string;
  qty: number;
  weight: number;
  price: number;
  pricePerPound?: number;
  arancel: number;
  arancelExempt?: boolean;
  total: number;
  bagId?: string;
}

interface InvoiceBag {
  id: string;
  name: string;
  reservas: string[];
  transportCost: number;
  totalWeight: number;
}

interface ShipperConsignee {
  name: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  lastName2?: string;
  phoneNumber: string;
  cid: string;
  passport?: string;
  address?: string;
}

export interface EnhancedInvoiceFormData {
  invoice: string;
  description: string;
  store: string;
  shipper_consignee: ShipperConsignee;
  products: InvoiceProduct[];
  reservas: InvoiceReserva[];
  bags: InvoiceBag[];
  packagesOrder: boolean;
  shippingType: 'SEA' | 'AEREO';
}

// Default empty form data
const defaultFormData: EnhancedInvoiceFormData = {
  invoice: '',
  description: '',
  store: '',
  shipper_consignee: {
    name: '',
    firstName: '',
    middleName: '',
    lastName: '',
    lastName2: '',
    phoneNumber: '',
    cid: '',
    passport: '',
    address: ''
  },
  products: [],
  reservas: [],
  bags: [],
  packagesOrder: false,
  shippingType: 'SEA'
};

// Storage key for localStorage
const STORAGE_KEY = 'enhanced_invoice_form_draft';

// Load data from localStorage
const loadFromStorage = (): EnhancedInvoiceFormData => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Deep merge to ensure all nested fields exist
      const merged: EnhancedInvoiceFormData = {
        ...defaultFormData,
        ...parsed,
        shipper_consignee: {
          ...defaultFormData.shipper_consignee,
          ...(parsed.shipper_consignee || {})
        },
        products: parsed.products || [],
        reservas: parsed.reservas || [],
        bags: parsed.bags || []
      };
      devLog('Loaded enhanced form data from storage:', merged);
      return merged;
    }
  } catch (error) {
    console.warn('Failed to load enhanced invoice form from storage:', error);
  }
  devLog('No saved data found, using default form data');
  return { ...defaultFormData };
};

// Save data to localStorage
const saveToStorage = (data: EnhancedInvoiceFormData) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to save enhanced invoice form to storage:', error);
  }
};

// Clear data from localStorage
const clearStorage = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear enhanced invoice form from storage:', error);
  }
};

// Global signals for form state
const [formData, setFormData] = createSignal<EnhancedInvoiceFormData>(loadFromStorage());
const [isDirty, setIsDirty] = createSignal(false);
const [lastSaved, setLastSaved] = createSignal<Date | null>(null);

// Auto-save functionality
let autoSaveTimeout: number | null = null;

const triggerAutoSave = () => {
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout);
  }
  
  autoSaveTimeout = setTimeout(() => {
    const current = formData();
    saveToStorage(current);
    setLastSaved(new Date());
    devLog('Enhanced invoice form auto-saved at', new Date().toLocaleTimeString());
  }, 1000); // Save after 1 second of inactivity
};

// Export the store
export const enhancedInvoiceFormStore = {
  // State getters
  formData,
  
  get isDirty() {
    return isDirty();
  },
  
  get lastSaved() {
    return lastSaved();
  },
  
  // Update form data
  updateForm: (updates: Partial<EnhancedInvoiceFormData>) => {
    setFormData(prev => {
      const updated = { ...prev, ...updates };
      setIsDirty(true);
      triggerAutoSave();
      return updated;
    });
  },
  
  // Update nested shipper/consignee data
  updateShipperConsignee: (updates: Partial<ShipperConsignee>) => {
    setFormData(prev => {
      const updated = {
        ...prev,
        shipper_consignee: { ...prev.shipper_consignee, ...updates }
      };
      setIsDirty(true);
      triggerAutoSave();
      return updated;
    });
  },
  
  // Add product
  addProduct: (product: InvoiceProduct) => {
    setFormData(prev => {
      const updated = {
        ...prev,
        products: [...prev.products, product]
      };
      setIsDirty(true);
      triggerAutoSave();
      return updated;
    });
  },
  
  // Update product
  updateProduct: (index: number, updates: Partial<InvoiceProduct>) => {
    setFormData(prev => {
      const products = [...prev.products];
      products[index] = { ...products[index], ...updates };
      const updated = { ...prev, products };
      setIsDirty(true);
      triggerAutoSave();
      return updated;
    });
  },
  
  // Remove product
  removeProduct: (index: number) => {
    setFormData(prev => {
      const products = prev.products.filter((_, i) => i !== index);
      const updated = { ...prev, products };
      setIsDirty(true);
      triggerAutoSave();
      return updated;
    });
  },
  
  // Add reserva
  addReserva: (reserva: InvoiceReserva) => {
    setFormData(prev => {
      const updated = {
        ...prev,
        reservas: [...prev.reservas, reserva]
      };
      setIsDirty(true);
      triggerAutoSave();
      return updated;
    });
  },
  
  // Update reserva
  updateReserva: (index: number, updates: Partial<InvoiceReserva>) => {
    setFormData(prev => {
      const reservas = [...prev.reservas];
      reservas[index] = { ...reservas[index], ...updates };
      const updated = { ...prev, reservas };
      setIsDirty(true);
      triggerAutoSave();
      return updated;
    });
  },
  
  // Remove reserva
  removeReserva: (index: number) => {
    setFormData(prev => {
      const reservas = prev.reservas.filter((_, i) => i !== index);
      const updated = { ...prev, reservas };
      setIsDirty(true);
      triggerAutoSave();
      return updated;
    });
  },
  
  // Add bag
  addBag: (bag: InvoiceBag) => {
    setFormData(prev => {
      const updated = {
        ...prev,
        bags: [...prev.bags, bag]
      };
      setIsDirty(true);
      triggerAutoSave();
      return updated;
    });
  },
  
  // Update bag
  updateBag: (index: number, updates: Partial<InvoiceBag>) => {
    setFormData(prev => {
      const bags = [...prev.bags];
      bags[index] = { ...bags[index], ...updates };
      const updated = { ...prev, bags };
      setIsDirty(true);
      triggerAutoSave();
      return updated;
    });
  },
  
  // Remove bag
  removeBag: (index: number) => {
    setFormData(prev => {
      const bags = prev.bags.filter((_, i) => i !== index);
      const updated = { ...prev, bags };
      setIsDirty(true);
      triggerAutoSave();
      return updated;
    });
  },
  
  // Clear form (user action)
  clearForm: () => {
    setFormData({ ...defaultFormData });
    setIsDirty(false);
    clearStorage();
    setLastSaved(null);
  },
  
  // Mark as completed (clear storage but don't reset form immediately)
  markCompleted: () => {
    clearStorage();
    setIsDirty(false);
    setLastSaved(null);
  },
  
  // Force save to storage
  forceSave: () => {
    saveToStorage(formData());
    setLastSaved(new Date());
    setIsDirty(false);
  },
  
  // Check if form has data
  hasData: () => {
    const current = formData();
    return (
      current.invoice !== '' ||
      current.description !== '' ||
      current.store !== '' ||
      current.shipper_consignee.name !== '' ||
      current.shipper_consignee.firstName !== '' ||
      current.shipper_consignee.cid !== '' ||
      current.products.length > 0 ||
      current.reservas.length > 0 ||
      current.bags.length > 0
    );
  },
  
  // Get form validation status
  isValid: () => {
    const current = formData();
    return (
      current.invoice.trim() !== '' &&
      current.shipper_consignee.name.trim() !== '' &&
      (current.products.length > 0 || current.reservas.length > 0)
    );
  },
  
  // Get current form data (reactive)
  getFormData: () => formData()
};

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', (e) => {
    if (isDirty()) {
      // Force save before leaving
      saveToStorage(formData());
      
      // Show warning if form has data
      if (enhancedInvoiceFormStore.hasData()) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes in your enhanced invoice. Are you sure you want to leave?';
        return e.returnValue;
      }
    }
  });
}