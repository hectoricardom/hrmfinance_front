import { createSignal } from 'solid-js';
import { devLog } from '../../../services/utils';

// Types for the invoice form (matching the existing types)
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

interface InvoiceBag {
  id: string;
  name: string;
  reservas: string[];
  transportCost: number;
  totalWeight: number;
}

export interface InvoiceFormData {
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
const defaultFormData: InvoiceFormData = {
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
const STORAGE_KEY = 'invoice_form_draft';

// Load data from localStorage
const loadFromStorage = (): InvoiceFormData => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Deep merge to ensure all nested fields exist
      const merged: InvoiceFormData = {
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
      //devLog('Loaded form data from storage:', merged);
      return merged;
    }
  } catch (error) {
    console.warn('Failed to load invoice form from storage:', error);
  }
  devLog('No saved data found, using default form data');
  return { ...defaultFormData };
};

// Save data to localStorage
const saveToStorage = (data: InvoiceFormData) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to save invoice form to storage:', error);
  }
};

// Clear data from localStorage
const clearStorage = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear invoice form from storage:', error);
  }
};

// Global signals for form state
const [formData, setFormData] = createSignal<InvoiceFormData>(loadFromStorage());
const [isDirty, setIsDirty] = createSignal(false);
const [lastSaved, setLastSaved] = createSignal<Date | null>(null);
const [isEditMode, setIsEditMode] = createSignal(false);
const [editingInvoiceId, setEditingInvoiceId] = createSignal<string | null>(null);

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
    devLog('Invoice form auto-saved at', new Date().toLocaleTimeString());
  }, 1000); // Save after 1 second of inactivity
};

// Convert existing invoice data to form format
const convertInvoiceToFormData = (invoice: any): InvoiceFormData => {
  devLog('Converting invoice to form data:', invoice);
  
  const converted = {
    invoice: invoice.invoice || '',
    description: invoice.description || '',
    store: invoice.store || '',
    shipper_consignee: {
      name: invoice.shipper_consignee?.name || '',
      firstName: invoice.shipper_consignee?.firstName || '',
      middleName: invoice.shipper_consignee?.middleName || '',
      lastName: invoice.shipper_consignee?.lastName || '',
      lastName2: invoice.shipper_consignee?.lastName2 || '',
      phoneNumber: invoice.shipper_consignee?.phoneNumber || invoice.shipper_consignee?.phoneNumberS || '',
      cid: invoice.shipper_consignee?.cid || '',
      passport: invoice.shipper_consignee?.passport || '',
      address: invoice.shipper_consignee?.address || ''
    },
    products: (invoice.products || []).map((p: any, index: number) => {
      devLog(`Converting product ${index}:`, p);
      return {
        id: p.id || `prod_${index}`,
        product: {
          id: p.product?.id || p.id || `prod_${index}`,
          code: p.product?.code || p.code || '',
          label: p.product?.label || p.label || p.name || '',
          price: parseFloat(p.product?.price || p.price || p.salePrice || 0)
        },
        qty: parseFloat(p.qty || 0),
        salePrice: parseFloat(p.salePrice || p.price || 0),
        total: parseFloat(p.qty || 0) * parseFloat(p.salePrice || p.price || 0)
      };
    }),
    reservas: (invoice.reservas || []).map((r: any, index: number) => {
      devLog(`Converting reserva ${index}:`, r);
      return {
        id: r.id || `reserva_${index}`,
        type: r.type || '',
        qty: parseFloat(r.qty || 0),
        weight: parseFloat(r.weight || r.qty || 0),
        price: parseFloat(r.price || 0),
        pricePerPound: r.pricePerPound ? parseFloat(r.pricePerPound) : undefined,
        arancel: parseFloat(r.arancel || 0),
        arancelExempt: r.arancelExempt || false,
        total: parseFloat(r.qty || 0) * parseFloat(r.price || 0) + parseFloat(r.arancel || 0),
        bagId: r.bagId
      };
    }),
    bags: invoice.bags || invoice.bulks || [],
    packagesOrder: invoice.packagesOrder || false,
    shippingType: invoice.shippingType || invoice.shippingMethod || 'SEA'
  };
  
  //devLog('Converted form data result:', converted);
  return converted;
};

// Export the store
export const invoiceFormStore = {
  // State getters - make formData a function to ensure reactivity
  formData,  // Export the signal directly
  
  get isDirty() {
    return isDirty();
  },
  
  get lastSaved() {
    return lastSaved();
  },
  
  get isEditMode() {
    return isEditMode();
  },
  
  get editingInvoiceId() {
    return editingInvoiceId();
  },
  
  // Update form data
  updateForm: (updates: Partial<InvoiceFormData>) => {
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
  getFormData: () => formData(),
  
  // Enter edit mode with existing invoice data
  enterEditMode: (invoice: any) => {
    devLog('enterEditMode called with:', invoice);
    
    const formattedData = convertInvoiceToFormData(invoice);
    devLog('Converted form data:', formattedData);
    
    setFormData(formattedData);
    setIsEditMode(true);
    setEditingInvoiceId(invoice.id || invoice.ssg_sorder_key || invoice.invoice);
    setIsDirty(false); // Not dirty initially when editing
    clearStorage(); // Clear any saved draft when editing
    
    devLog('Edit mode entered, state:', {
      isEditMode: isEditMode(),
      editingInvoiceId: editingInvoiceId(),
      formData: formData()
    });
  },
  
  // Exit edit mode and return to add mode
  exitEditMode: () => {
    setIsEditMode(false);
    setEditingInvoiceId(null);
    setFormData({ ...defaultFormData });
    setIsDirty(false);
    clearStorage();
  },
  
  // Save edited invoice
  saveEditedInvoice: async () => {
    if (!isEditMode() || !editingInvoiceId()) {
      throw new Error('Not in edit mode');
    }
    
    try {
      const { inventoryApi } = await import('../../../services/apiAdapter');
      const formDataValue = formData();
      
      // Convert form data back to invoice format
      const updateData = {
        invoice: formDataValue.invoice,
        description: formDataValue.description,
        store: formDataValue.store,
        shipper_consignee: formDataValue.shipper_consignee,
        products: formDataValue.products.map(p => ({
          id: p.product.id,
          product: p.product,
          qty: p.qty,
          salePrice: p.salePrice,
          total: p.total
        })),
        reservas: formDataValue.reservas.map(r => ({
          id: r.id,
          type: r.type,
          qty: r.qty,
          weight: r.weight,
          price: r.price,
          arancel: r.arancel,
          total: r.total
        })),
        packagesOrder: formDataValue.packagesOrder,
        shippingType: formDataValue.shippingType
      };
      
      await inventoryApi.updateInvoice(editingInvoiceId()!, updateData);
      
      // Mark as saved
      setIsDirty(false);
      setLastSaved(new Date());
      
      return updateData;
    } catch (error) {
      console.error('Error saving edited invoice:', error);
      throw error;
    }
  }
};

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', (e) => {
    if (isDirty()) {
      // Force save before leaving
      saveToStorage(formData());
      
      // Show warning if form has data
      if (invoiceFormStore.hasData()) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes in your invoice. Are you sure you want to leave?';
        return e.returnValue;
      }
    }
  });
}