import { createSignal } from 'solid-js';
import {
  InternationalShippingForm,
  InternationalShipmentItem,
  InternationalProduct,
  ShipperConsignee,
  ShippingBulk,
  PaymentMethod,
  PricingConfig,
  DEFAULT_PRICING_CONFIG,
  DestinationCountry
} from '../types/internationalShippingTypes';
import { logger } from '../../../utils/logger';

// Default empty form data
const defaultFormData: InternationalShippingForm = {
  invoice: '',
  description: '',
  store: '',
  guide: '',
  destinationCountry: '',
  shipper_consignee: {
    name: '',
    firstName: '',
    middleName: '',
    lastName: '',
    lastName2: '',
    phoneNumber: '',
    cid: '',
    passport: '',
    email: '',
    address: '',
    addressS: '',
    idS: '',
     phoneNumberS: ''
  },
  products: [],
  shipmentItems: [],
  bulks: [],
  paymentMethods: {
    cash: 0,
    zelle: 0,
    creditCard: 0,
    taxPercent: 0,
    taxOnTotal: false,
    exemptTaxOnCash: false,
    discount: 0
  },
  pricingConfig: DEFAULT_PRICING_CONFIG,
  insurancePercent: 5 // Default 5% insurance
};

// Storage key for localStorage
const STORAGE_KEY = 'international_shipping_form_draft';

// Load data from localStorage
const loadFromStorage = (): InternationalShippingForm => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Deep merge to ensure all nested fields exist
      // IMPORTANT: Always use latest DEFAULT_PRICING_CONFIG instead of cached version
      const merged: InternationalShippingForm = {
        ...defaultFormData,
        ...parsed,
        shipper_consignee: {
          ...defaultFormData.shipper_consignee,
          ...(parsed.shipper_consignee || {})
        },
        paymentMethods: {
          ...defaultFormData.paymentMethods,
          ...(parsed.paymentMethods || {})
        },
        pricingConfig: DEFAULT_PRICING_CONFIG, // Always use latest config
        insurancePercent: parsed.insurancePercent ?? 5, // Use saved value or default to 5%
        products: parsed.products || [],
        shipmentItems: parsed.shipmentItems || [],
        bulks: parsed.bulks || []
      };
      return merged;
    }
  } catch (error) {
    console.warn('Failed to load international shipping form from storage:', error);
  }
  return { ...defaultFormData };
};

// Save data to localStorage
const saveToStorage = (data: InternationalShippingForm) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to save international shipping form to storage:', error);
  }
};

// Clear data from localStorage
const clearStorage = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear international shipping form from storage:', error);
  }
};

// Global signals for form state
const [formData, setFormData] = createSignal<InternationalShippingForm>(loadFromStorage());
const [isDirty, setIsDirty] = createSignal(false);
const [lastSaved, setLastSaved] = createSignal<Date | null>(null);
const [isEditMode, setIsEditMode] = createSignal(false);
const [editingShippingId, setEditingShippingId] = createSignal<string | null>(null);

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
    logger.log(
      `International shipping form auto-saved at ${new Date().toLocaleTimeString()}`,
      {
        invoice: current.invoice,
        country: current.destinationCountry,
        items: current.shipmentItems.length
      }
    );
  }, 1000); // Save after 1 second of inactivity
};

// Export the store
export const internationalShippingFormStore = {
  // State getters
  formData,

  get isDirty() {
    return isDirty();
  },

  get lastSaved() {
    return lastSaved();
  },

  get isEditMode() {
    return isEditMode();
  },

  get editingShippingId() {
    return editingShippingId();
  },

  // Update form data
  updateForm: (updates: Partial<InternationalShippingForm>) => {
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

  // Update pricing config
  updatePricingConfig: (updates: Partial<PricingConfig>) => {
    setFormData(prev => {
      const updated = {
        ...prev,
        pricingConfig: { ...prev.pricingConfig, ...updates }
      };
      setIsDirty(true);
      triggerAutoSave();
      return updated;
    });
  },

  // Add product
  addProduct: (product: InternationalProduct) => {
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
  updateProduct: (index: number, updates: Partial<InternationalProduct>) => {
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

  // Add shipment item
  addShipmentItem: (item: InternationalShipmentItem) => {
    setFormData(prev => {
      const updated = {
        ...prev,
        shipmentItems: [...prev.shipmentItems, item]
      };
      setIsDirty(true);
      triggerAutoSave();
      return updated;
    });
  },

  // Update shipment item
  updateShipmentItem: (index: number, updates: Partial<InternationalShipmentItem>) => {
    setFormData(prev => {
      const shipmentItems = [...prev.shipmentItems];
      shipmentItems[index] = { ...shipmentItems[index], ...updates };
      const updated = { ...prev, shipmentItems };
      setIsDirty(true);
      triggerAutoSave();
      return updated;
    });
  },

  // Remove shipment item
  removeShipmentItem: (index: number) => {
    setFormData(prev => {
      const shipmentItems = prev.shipmentItems.filter((_, i) => i !== index);
      const updated = { ...prev, shipmentItems };
      setIsDirty(true);
      triggerAutoSave();
      return updated;
    });
  },

  // Add bulk
  addBulk: (bulk: ShippingBulk) => {
    setFormData(prev => {
      const updated = {
        ...prev,
        bulks: [...prev.bulks, bulk]
      };
      setIsDirty(true);
      triggerAutoSave();
      return updated;
    });
  },

  // Update bulk
  updateBulk: (index: number, updates: Partial<ShippingBulk>) => {
    setFormData(prev => {
      const bulks = [...prev.bulks];
      bulks[index] = { ...bulks[index], ...updates };
      const updated = { ...prev, bulks };
      setIsDirty(true);
      triggerAutoSave();
      return updated;
    });
  },

  // Remove bulk
  removeBulk: (index: number) => {
    setFormData(prev => {
      const bulks = prev.bulks.filter((_, i) => i !== index);
      const updated = { ...prev, bulks };
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
      current.shipmentItems.length > 0 ||
      current.bulks.length > 0
    );
  },

  // Get form validation status
  isValid: () => {
    const current = formData();
    return (
      current.invoice.trim() !== '' &&
      current.destinationCountry !== '' &&
      current.shipper_consignee.name.trim() !== '' &&
      (current.products.length > 0 || current.shipmentItems.length > 0)
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
      if (internationalShippingFormStore.hasData()) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes in your shipping form. Are you sure you want to leave?';
        return e.returnValue;
      }
    }
  });
}
