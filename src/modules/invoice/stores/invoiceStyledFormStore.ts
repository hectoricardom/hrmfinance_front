import { createSignal } from 'solid-js';
import { devLog, generateRandomId } from '../../../services/utils';

// Payment method interface
interface PaymentMethod {
  cash: number;
  zelle: number;
  creditCard: number;
  taxPercent: number;
  taxOnTotal: boolean;
  exemptTaxOnCash?: boolean;
  discount?: number;
}

// Types for the styled invoice form
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
  bulkId?: string;
}

interface InvoiceReserva {
  id: string;
  type: string;
  qty: number;
  weight: number;
  category: string;
  price: number;
  arancel: number;
  total: number;
  bulkId?: string;
  autoCalculate?: boolean; // Individual auto-calculation toggle
}

interface InvoiceService {
  id: string;
  type: string;
  qty: number;
 
  price: number;
 
  total: number;
  bulkId?: string;
  
}


interface InvoiceBulk {
  id: string;
  name: string;
  type: 'PERSONAL' | 'COMMERCIAL' | 'MIXED';
  maxWeight: number;
  currentWeight: number;
  transportCost: number;
  shippingMethod: 'AEREO' | 'SEA';
  status: 'DRAFT' | 'READY';
  token?: string;
}

interface ShipperConsignee {
  name: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  lastName2?: string;
  phoneNumber: string;
  phoneNumberS: string;
  altPhoneNumber?: string;
  cid: string;
  idS: string;
  dob: string;
  passport?: string;
  passportS?: string;
  address?: string;
  addressS?: string;
}

export interface InvoiceStyledFormData {
  invoice: string;
  description: string;
  store: string;
  guide:  string;
  shipper_consignee: ShipperConsignee;
  products: InvoiceProduct[];
  reservas: InvoiceReserva[];
  services: InvoiceService[];
  bulks: InvoiceBulk[];
  packagesOrder: boolean;
  shippingMethod: 'aereo' | 'maritimo' | '';
  createDate?: number;
  paymentMethods: PaymentMethod;
}

// Default empty form data
const defaultFormData: InvoiceStyledFormData = {
  invoice: '',
  description: '',
  store: '',
  guide : '',
  shipper_consignee: {
    firstName: '',
    middleName: '',
    lastName: '',
    lastName2: '',
    phoneNumber: '',
    cid: '',
    dob: '',
    passport: '',
    address: '',
    altPhoneNumber: '',
    passportS: '',
    name: '',
    addressS: '',
    phoneNumberS: '',
    idS: '',
  },
  products: [],
  reservas: [],
  services: [],
  bulks: [],
  packagesOrder: false,
  shippingMethod: '',
  paymentMethods: {
    taxOnTotal: false,
    taxPercent: 0,
    exemptTaxOnCash: false,
    cash: 0,
    zelle: 0,
    creditCard: 0,
    discount: 0
  }
};

// Storage key for localStorage
const STORAGE_KEY = 'invoice_styled_form_draft';

// Load data from localStorage
const loadFromStorage = (): InvoiceStyledFormData => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Deep merge to ensure all nested fields exist
      const merged: InvoiceStyledFormData = {
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
        products: parsed.products || [],
        reservas: parsed.reservas || [],
        services: parsed.services || [],
        bulks: parsed.bulks || []
      };
      //devLog('Loaded styled form data from storage:', merged);
      return merged;
    }
  } catch (error) {
    console.warn('Failed to load styled invoice form from storage:', error);
  }
  devLog('No saved data found, using default form data');
  return { ...defaultFormData };
};

// Save data to localStorage
const saveToStorage = (data: InvoiceStyledFormData) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to save styled invoice form to storage:', error);
  }
};

// Clear data from localStorage
const clearStorage = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear styled invoice form from storage:', error);
  }
};

// Global signals for form state
const [formData, setFormData] = createSignal<InvoiceStyledFormData>(loadFromStorage());
const [isDirty, setIsDirty] = createSignal(false);
const [lastSaved, setLastSaved] = createSignal<Date | null>(null);
const [isEditMode, setIsEditMode] = createSignal(false);
const [editingInvoiceId, setEditingInvoiceId] = createSignal<string | null>(null);
const [currentDraftId, setCurrentDraftId] = createSignal<string | null>(null);
const [editingYabaBulks, setEditingYabaBulks] = createSignal<any[] | null>(null);

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
    //devLog('Styled invoice form auto-saved at', new Date().toLocaleTimeString());
  }, 1000); // Save after 1 second of inactivity
};

// Data conversion function for edit mode
const convertInvoiceToStyledFormData = (invoice: any): InvoiceStyledFormData => {
  //devLog('Converting invoice to styled form data:', JSON.stringify(invoice, null, 2));
  
  // Handle shipper_consignee data with fallbacks for different field name variations
  const shipperConsignee = invoice.shipper_consignee || {};
  const convertedShipperConsignee: ShipperConsignee = {
    name: shipperConsignee.name || '',
    firstName: shipperConsignee.firstName || '',
    middleName: shipperConsignee.middleName || '',
    lastName: shipperConsignee.lastName || '',
    lastName2: shipperConsignee.lastName2 || '',
    // Handle phoneNumber variations
    phoneNumber: shipperConsignee.phoneNumber || shipperConsignee.phone || '',
    phoneNumberS: shipperConsignee.phoneNumberS || shipperConsignee.phoneNumber || shipperConsignee.phone || '',
    altPhoneNumber: shipperConsignee.altPhoneNumber || '',
    cid: shipperConsignee.cid || '',
    idS: shipperConsignee.idS || shipperConsignee.cid || '',
    dob: shipperConsignee.dob || '',
    passport: shipperConsignee.passport || '',
    passportS: shipperConsignee.passportS || shipperConsignee.passport || '',
    address: shipperConsignee.address || '',
    addressS: shipperConsignee.addressS || shipperConsignee.address || ''
  };
  
  // Convert products array
  const convertedProducts: InvoiceProduct[] = (invoice.products || []).map((product: any) => ({
    id: product.id || generateRandomId(),
    product: {
      id: product.product?.id || product.id || '',
      code: product.product?.code || product.code || '',
      label: product.product?.label || product.label || product.name || '',
      price: product.product?.price || product.price || 0
    },
    qty: product.qty || 0,
    salePrice: product.salePrice || product.price || 0,
    total: product.total || (product.qty * product.salePrice) || 0,
    bulkId: product.bulkId || ''
  }));
  
  // Convert reservas array
  const convertedReservas: InvoiceReserva[] = (invoice.reservas || []).map((reserva: any) => ({
    id: reserva.id || generateRandomId(),
    type: reserva.type || '',
    qty: reserva.qty || 0,
    weight: reserva.weight || reserva.qty || 0,
    category: reserva.category || '',
    price: reserva.price || 0,
    arancel: reserva.arancel || 0,
    total: reserva.total || ((reserva.qty * reserva.price) + reserva.arancel) || 0,
    bulkId: reserva.bulkId || '',
    autoCalculate: reserva.autoCalculate !== false
  }));
  
  // Convert services array
  const convertedServices: InvoiceService[] = (invoice.services || []).map((service: any) => ({
    id: service.id || generateRandomId(),
    type: service.type || '',
    qty: service.qty || 0,
    price: service.price || 0,
    total: service.total || (service.qty * service.price) || 0,
    bulkId: service.bulkId || ''
  }));
  
  // Convert bulks array
  const convertedBulks: InvoiceBulk[] = (invoice.bulks || []).map((bulk: any) => ({
    id: bulk.id || generateRandomId(),
    name: bulk.name || '',
    type: bulk.type || 'PERSONAL',
    maxWeight: bulk.maxWeight || 0,
    currentWeight: bulk.currentWeight || 0,
    transportCost: bulk.transportCost || 20,
    shippingMethod: bulk.shippingMethod || 'AEREO',
    status: bulk.status || 'DRAFT',
    token: bulk.token || generateRandomId()
  }));
  
  // Handle payment methods with fallbacks
  const paymentMethods = invoice.paymentMethods || {};
  const convertedPaymentMethods: PaymentMethod = {
    cash: paymentMethods.cash || 0,
    zelle: paymentMethods.zelle || 0,
    creditCard: paymentMethods.creditCard || 0,
    taxPercent: paymentMethods.taxPercent || 0,
    taxOnTotal: paymentMethods.taxOnTotal || false,
    exemptTaxOnCash: paymentMethods.exemptTaxOnCash || false,
    discount: paymentMethods.discount || 0
  };

  const convertedData: InvoiceStyledFormData = {
    invoice: invoice.invoice || '',
    description: invoice.description || '',
    store: invoice.store || '',
    guide: invoice.guide || '',
    shipper_consignee: convertedShipperConsignee,
    products: convertedProducts,
    reservas: convertedReservas,
    services: convertedServices,
    bulks: convertedBulks,
    packagesOrder: invoice.packagesOrder || false,
    shippingMethod: invoice.shippingMethod || '',
    createDate: invoice.createDate || Date.now(),
    paymentMethods: convertedPaymentMethods
  };
  
  //devLog('Converted styled form data:', JSON.stringify(convertedData, null, 2));
  return convertedData;
};

// Export the store
export const invoiceStyledFormStore = {
  // State getters - export signal directly for reactivity
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
  
  get editingInvoiceId() {
    return editingInvoiceId();
  },

  get editingYabaBulks() {
    return editingYabaBulks();
  },

  get currentDraftId() {
    return currentDraftId();
  },

  setCurrentDraftId: (id: string | null) => {
    setCurrentDraftId(id);
  },

  // Update form data
  updateForm: (updates: Partial<InvoiceStyledFormData>) => {
    setFormData(prev => {
      // Deep merge to ensure all nested fields exist with proper defaults
      const updated: InvoiceStyledFormData = {
        ...prev,
        ...updates,
        // Deep merge shipper_consignee to preserve all fields
        shipper_consignee: {
          ...prev.shipper_consignee,
          ...(updates.shipper_consignee || {})
        },
        // Deep merge paymentMethods to preserve all fields
        paymentMethods: {
          ...prev.paymentMethods,
          ...(updates.paymentMethods || {})
        },
        // Ensure arrays are fully replaced, not merged
        products: updates.products !== undefined ? updates.products : prev.products,
        reservas: updates.reservas !== undefined ? updates.reservas : prev.reservas,
        services: updates.services !== undefined ? updates.services : prev.services,
        bulks: updates.bulks !== undefined ? updates.bulks : prev.bulks,
      };
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
  
  // Update payment methods
  updatePaymentMethods: (updates: Partial<PaymentMethod>) => {
    setFormData(prev => {
      const updated = {
        ...prev,
        paymentMethods: { ...prev.paymentMethods, ...updates }
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
    //devLog(index, updates)
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
  
  // Add service
  addService: (service: InvoiceService) => {
    setFormData(prev => {
      const updated = {
        ...prev,
        services: [...prev.services, service]
      };
      setIsDirty(true);
      triggerAutoSave();
      return updated;
    });
  },
  
  // Update service
  updateService: (index: number, updates: Partial<InvoiceService>) => {
    setFormData(prev => {
      const services = [...prev.services];
      services[index] = { ...services[index], ...updates };
      const updated = { ...prev, services };
      setIsDirty(true);
      triggerAutoSave();
      return updated;
    });
  },
  
  // Remove service
  removeService: (index: number) => {
    setFormData(prev => {
      const services = prev.services.filter((_, i) => i !== index);
      const updated = { ...prev, services };
      setIsDirty(true);
      triggerAutoSave();
      return updated;
    });
  },

  // Add bulk
  addBulk: (bulk: InvoiceBulk) => {
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
  updateBulk: (index: number, updates: Partial<InvoiceBulk>) => {

   
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
    setCurrentDraftId(null);
  },
  
  // Mark as completed (clear storage but don't reset form immediately)
  markCompleted: () => {
    clearStorage();
    setIsDirty(false);
    setLastSaved(null);
    setCurrentDraftId(null);
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
      current.services.length > 0 ||
      current.bulks.length > 0 ||
      current.paymentMethods.cash > 0 ||
      current.paymentMethods.zelle > 0 ||
      current.paymentMethods.creditCard > 0
    );
  },




  invoiceTotals: () => {
      const data = formData();

      // Calculate items total
      const productsTotal = data.products.reduce((sum, p) => sum + p.qty*p.salePrice, 0);
      const reservasTotal = data.reservas.reduce((sum, r) => sum + (r.qty*r.price + r.arancel), 0);
      const servicesTotal = data.services.reduce((sum, s) => sum + s.qty*s.arancel, 0);
      const transportTotal = data.bulks.reduce((sum, b) => sum + (b?.transportCost || 20), 0);


      // data.reservas.map(( r) => { devLog("qty:",r.qty,"price:",r.price ,"arancel:",r.arancel, r.qty*r.price + r.arancel)});


      const itemsTotal = Math.round(productsTotal) +  Math.round(reservasTotal) +  Math.round(servicesTotal) +  Math.round(transportTotal);

      // Get discount
      const discount = data.paymentMethods.discount || 0;

      // Apply discount to items total
      const itemsTotalAfterDiscount = Math.max(0, itemsTotal - discount);

      const subtotal =  data.paymentMethods.cash +  data.paymentMethods.zelle +  data.paymentMethods.creditCard;

      let taxableAmount = itemsTotalAfterDiscount;
      if ( data.paymentMethods.exemptTaxOnCash) {
        taxableAmount = ( itemsTotalAfterDiscount -  data.paymentMethods.cash );
      }

      const taxAmount = data.paymentMethods.taxOnTotal ?
        ( itemsTotalAfterDiscount * data.paymentMethods.taxPercent / 100) :
        (taxableAmount * data.paymentMethods.taxPercent / 100);

      const totalWithTax =   itemsTotalAfterDiscount + taxAmount;


      const balance = totalWithTax - subtotal;

      const saveOnExemptTaxOnCash = ( itemsTotalAfterDiscount * data.paymentMethods.taxPercent / 100) - taxAmount;
      // Calculate transport costs from bulks

      // Grand total (after discount, before tax)
      const grandTotal = itemsTotalAfterDiscount;

      return {
        itemsTotal,
        discount,
        itemsTotalAfterDiscount,
        transportTotal,
        grandTotal,
        productsTotal,
        reservasTotal,
        servicesTotal,
        balance,
        totalWithTax,
        taxAmount,
        saveOnExemptTaxOnCash
      };
    },
  
  // Get form validation status
  isValid: () => {
    const current = formData();

    const invoiceTotals= invoiceStyledFormStore.invoiceTotals();

    return (

      invoiceTotals.balance < .6 && invoiceTotals.grandTotal &&
      current.invoice.trim() !== '' &&
      current.store.trim() !== '' &&
      current.shippingMethod.trim() !== '' &&
      current.shipper_consignee.phoneNumber.trim() !== '' &&
      current.shipper_consignee.phoneNumberS.trim() !== '' &&
      current.shipper_consignee.firstName.trim() !== '' &&
      current.shipper_consignee.name.trim() !== '' &&
      current.shipper_consignee.lastName.trim() !== '' &&
      current.shipper_consignee.cid.trim() !== '' &&
      (current.products.length > 0 || current.reservas.length > 0 || current.services.length > 0 || current.bulks.length > 0)
    );
  },

  // Get validation errors for all required fields
  getValidationErrors: () => {
    const current = formData();
    const invoiceTotals = invoiceStyledFormStore.invoiceTotals();
    const errors: { field: string; label: string; section: string }[] = [];

    // Invoice basic info
    if (!current.invoice.trim()) {
      errors.push({ field: 'invoice', label: 'Número de Factura', section: 'Información Básica' });
    }
    if (!current.store.trim()) {
      errors.push({ field: 'store', label: 'Tienda', section: 'Información Básica' });
    }
    if (!current.shippingMethod.trim()) {
      errors.push({ field: 'shippingMethod', label: 'Método de Envío', section: 'Información Básica' });
    }

    // Customer/Shipper info
    if (!current.shipper_consignee.firstName.trim()) {
      errors.push({ field: 'firstName', label: 'Nombre', section: 'Información del Cliente' });
    }
    if (!current.shipper_consignee.lastName.trim()) {
      errors.push({ field: 'lastName', label: 'Apellido', section: 'Información del Cliente' });
    }
    if (!current.shipper_consignee.name.trim()) {
      errors.push({ field: 'name', label: 'Nombre Completo', section: 'Información del Cliente' });
    }
    if (!current.shipper_consignee.phoneNumberS.trim()) {
      errors.push({ field: 'phoneNumberS', label: 'Teléfono (USA)', section: 'Información del Cliente' });
    }
    if (!current.shipper_consignee.phoneNumber.trim()) {
      errors.push({ field: 'phoneNumber', label: 'Teléfono (Cuba)', section: 'Información del Cliente' });
    }
    if (!current.shipper_consignee.cid.trim()) {
      errors.push({ field: 'cid', label: 'Carnet de Identidad', section: 'Información del Cliente' });
    }

    // Items validation
    if (current.products.length === 0 && current.reservas.length === 0 && current.services.length === 0 && current.bulks.length === 0) {
      errors.push({ field: 'items', label: 'Al menos un producto, reserva, servicio o bulto', section: 'Items' });
    }

    // Payment validation
    if (invoiceTotals.balance >= 0.6) {
      errors.push({ field: 'balance', label: `Balance pendiente: $${invoiceTotals.balance.toFixed(2)}`, section: 'Pago' });
    }
    if (!invoiceTotals.grandTotal) {
      errors.push({ field: 'grandTotal', label: 'El total debe ser mayor a 0', section: 'Pago' });
    }

    return errors;
  },

  // Check if a specific field has an error
  hasFieldError: (field: string) => {
    const errors = invoiceStyledFormStore.getValidationErrors();
    return errors.some(e => e.field === field);
  },

  // Get section validation status
  getSectionValidation: () => {
    const current = formData();
    const invoiceTotals = invoiceStyledFormStore.invoiceTotals();

    // Basic Info Section
    const basicInfoValid =
      current.invoice.trim() !== '' &&
      current.store.trim() !== '' &&
      current.shippingMethod.trim() !== '';

    const basicInfoErrors: string[] = [];
    if (!current.invoice.trim()) basicInfoErrors.push('Número de Factura');
    if (!current.store.trim()) basicInfoErrors.push('Tienda');
    if (!current.shippingMethod.trim()) basicInfoErrors.push('Método de Envío');

    // Customer Info Section
    const customerInfoValid =
      current.shipper_consignee.firstName.trim() !== '' &&
      current.shipper_consignee.lastName.trim() !== '' &&
      current.shipper_consignee.name.trim() !== '' &&
      current.shipper_consignee.phoneNumber.trim() !== '' &&
      current.shipper_consignee.phoneNumberS.trim() !== '' &&
      current.shipper_consignee.cid.trim() !== '';

    const customerInfoErrors: string[] = [];
    if (!current.shipper_consignee.firstName.trim()) customerInfoErrors.push('Primer Nombre');
    if (!current.shipper_consignee.lastName.trim()) customerInfoErrors.push('Primer Apellido');
    if (!current.shipper_consignee.name.trim()) customerInfoErrors.push('Nombre Completo');
    if (!current.shipper_consignee.phoneNumberS.trim()) customerInfoErrors.push('Teléfono (USA)');
    if (!current.shipper_consignee.phoneNumber.trim()) customerInfoErrors.push('Teléfono (Cuba)');
    if (!current.shipper_consignee.cid.trim()) customerInfoErrors.push('Cédula/ID');

    // Items Section
    const hasItems = current.products.length > 0 || current.reservas.length > 0 ||
                     current.services.length > 0 || current.bulks.length > 0;
    const itemsErrors: string[] = [];
    if (!hasItems) itemsErrors.push('Al menos un producto, reserva, servicio o bulto');

    // Payment Section
    const paymentValid = invoiceTotals.balance < 0.6 && invoiceTotals.grandTotal > 0;
    const paymentErrors: string[] = [];
    if (invoiceTotals.balance >= 0.6) paymentErrors.push(`Balance pendiente: $${invoiceTotals.balance.toFixed(2)}`);
    if (!invoiceTotals.grandTotal) paymentErrors.push('El total debe ser mayor a 0');

    return {
      basicInfo: {
        isValid: basicInfoValid,
        errors: basicInfoErrors,
        completedFields: 3 - basicInfoErrors.length,
        totalFields: 3
      },
      customerInfo: {
        isValid: customerInfoValid,
        errors: customerInfoErrors,
        completedFields: 6 - customerInfoErrors.length,
        totalFields: 6
      },
      items: {
        isValid: hasItems,
        errors: itemsErrors,
        completedFields: hasItems ? 1 : 0,
        totalFields: 1
      },
      payment: {
        isValid: paymentValid,
        errors: paymentErrors,
        completedFields: paymentValid ? 2 : (invoiceTotals.grandTotal > 0 ? 1 : 0),
        totalFields: 2
      }
    };
  },

  // Check if a specific section is valid
  isSectionValid: (section: 'basicInfo' | 'customerInfo' | 'items' | 'payment') => {
    const sectionValidation = invoiceStyledFormStore.getSectionValidation();
    return sectionValidation[section].isValid;
  },

  // Get errors for a specific section
  getSectionErrors: (section: 'basicInfo' | 'customerInfo' | 'items' | 'payment') => {
    const sectionValidation = invoiceStyledFormStore.getSectionValidation();
    return sectionValidation[section].errors;
  },
  
  // Get current form data (reactive)
  getFormData: () => formData(),
  
  // Edit mode functions
  enterEditMode: (invoice: any) => {
    //devLog('Entering edit mode with invoice:', JSON.stringify(invoice, null, 2));
    try {
      const formattedData = convertInvoiceToStyledFormData(invoice);
      //devLog('Setting form data to:', JSON.stringify(formattedData, null, 2));
      setFormData(formattedData);
      setIsEditMode(true);
      setEditingInvoiceId(invoice.id || invoice.ssg_sorder_key || invoice.invoice);
      // Preserve YABA tariff data for the component to load
      setEditingYabaBulks(invoice.yabaBulks || null);
      //devLog('Edit mode entered successfully. EditingInvoiceId:', editingInvoiceId());
    } catch (error) {
      console.error('Error entering edit mode:', error);
    }
  },
  
  exitEditMode: () => {
    devLog('Exiting edit mode');
    setIsEditMode(false);
    setEditingInvoiceId(null);
    setEditingYabaBulks(null);
    setFormData({ ...defaultFormData });
    clearStorage();
  },
  
  saveEditedInvoice: async (yabaData?: { yabaBulks?: any[]; yabaGrandTotal?: number }) => {
    if (!isEditMode() || !editingInvoiceId()) {
      throw new Error('Not in edit mode or no invoice ID specified');
    }

    const currentData = formData();
    //devLog('Saving edited invoice with data:', JSON.stringify(currentData, null, 2));

    try {
      // Calculate totals for the update
      const totals = invoiceStyledFormStore.invoiceTotals();

      // Prepare update data with calculated totals
      const updateData: any = {
        ...currentData,
        type: 'SALES',
        businessId: 'YB100423253156428',
        isCompleted: true,
        productSubtotal: totals.productsTotal,
        reservaSubtotal: totals.reservasTotal,
        serviceSubtotal: totals.servicesTotal,
        subtotalBeforeTax: totals.itemsTotal,
        transportTotal: totals.transportTotal,
        taxAmount: totals.taxAmount,
        taxSavings: totals.saveOnExemptTaxOnCash,
        total: totals.totalWithTax,
        taxCalculationMethod: currentData.paymentMethods.taxOnTotal ? 'total' : 'subtotal',
        cashPaymentRatio: totals.balance > 0 ? currentData.paymentMethods.cash / totals.balance : 0,
        lastModified: Date.now()
      };

      // Include YABA tariff data if provided
      if (yabaData?.yabaBulks && yabaData.yabaBulks.length > 0) {
        updateData.yabaBulks = yabaData.yabaBulks;
        updateData.yabaGrandTotal = yabaData.yabaGrandTotal;
      } else {
        // Explicitly clear YABA data if no bulks
        updateData.yabaBulks = null;
        updateData.yabaGrandTotal = null;
      }

      //devLog('Updating invoice with ID:', editingInvoiceId(), 'and data:', JSON.stringify(updateData, null, 2));

      // Import inventoryApi here to avoid circular dependency
      const { inventoryApi } = await import('../../../services/apiAdapter');

      // Update the invoice
      const result = await inventoryApi.updateInvoice(editingInvoiceId()!, updateData);
      //devLog('Invoice update result:', result);

      return result;
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
      if (invoiceStyledFormStore.hasData()) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes in your invoice. Are you sure you want to leave?';
        return e.returnValue;
      }
    }
  });
}