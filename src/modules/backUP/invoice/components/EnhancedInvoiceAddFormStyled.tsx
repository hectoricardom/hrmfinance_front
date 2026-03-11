import { createSignal, createEffect, For, Show, onMount } from 'solid-js';
import { inventoryStore } from '../../inventory/stores/inventoryStore';
import { invoiceStore } from '../stores/invoiceStore';
import { enhancedInvoiceFormStore, type EnhancedInvoiceFormData } from '../stores/enhancedInvoiceFormStore';
import {
  getReservaCategoryInfo,
  isExpressEligible,
  suggestExpressService
} from '../utils/reservaTypeValidator';
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
  weight: number; // Weight in pounds
  price: number;
  pricePerPound?: number; // Calculated price per pound
  arancel: number;
  arancelExempt?: boolean; // Flag for arancel exemption
  total: number;
  bagId?: string; // Optional bag assignment
}

interface InvoiceBag {
  id: string;
  name: string;
  reservas: string[]; // Array of reserva IDs
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

// Service pricing configuration
const SERVICE_PRICING = {
  'AEREO': {
    ranges: [
      { min: 0, max: 6.6, pricePerPound: 4.50 },
      { min: 6.6, max: 46, pricePerPound: 3.99 },
      { min: 46, max: Infinity, pricePerPound: 2.99 }
    ]
  },
  'SEA': {
    ranges: [
      { min: 0, max: 22, pricePerPound: 1.50 },
      { min: 22.1, max: 44, pricePerPound: 1.25 },
      { min: 44, max: Infinity, pricePerPound: 0.75 }
    ]
  }
};

// Arancel calculation configuration
const ARANCEL_CONFIG = {
  rates: [
    { min: 0, max: 50, rate: 0.05 }, // 5% for 0-50 lbs
    { min: 50, max: 200, rate: 0.08 }, // 8% for 50-200 lbs
    { min: 200, max: 500, rate: 0.10 }, // 10% for 200-500 lbs
    { min: 500, max: Infinity, rate: 0.12 } // 12% for 500+ lbs
  ],
  exemptTypes: ['DOCUMENTS', 'MEDICINES', 'PERSONAL_EFFECTS', 'BOOKS'] // Exempt reserva types
};

// Styles matching the project's existing style system
const styles = {
  container: {
    padding: '1.5rem',
    background: 'var(--surface-color)',
    'border-radius': 'var(--border-radius)',
  },
  
  header: {
    'font-size': '1.5rem',
    'font-weight': '700',
    color: 'var(--text-primary)',
    'margin-bottom': '1.5rem'
  },

  grid: {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '1.5rem'
  },

  section: {
    background: 'var(--background-color)',
    padding: '1.25rem',
    'border-radius': 'var(--border-radius-sm)',
    border: '1px solid var(--border-color)',
    'margin-bottom': '1rem'
  },

  sectionTitle: {
    'font-size': '1.125rem',
    'font-weight': '600',
    color: 'var(--text-primary)',
    'margin-bottom': '1rem',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'space-between'
  },

  formGroup: {
    'margin-bottom': '1rem'
  },

  label: {
    display: 'block',
    'font-size': '0.875rem',
    'font-weight': '500',
    color: 'var(--text-secondary)',
    'margin-bottom': '0.25rem'
  },

  input: {
    width: '100%',
    padding: '0.625rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '0.875rem',
    background: 'var(--surface-color)',
    transition: 'border-color 0.2s',
    'outline': 'none'
  },

  select: {
    width: '100%',
    padding: '0.625rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '0.875rem',
    background: 'var(--surface-color)',
    transition: 'border-color 0.2s',
    'outline': 'none'
  },

  textarea: {
    width: '100%',
    padding: '0.625rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '0.875rem',
    background: 'var(--surface-color)',
    resize: 'vertical',
    'min-height': '60px'
  },

  button: {
    padding: '0.625rem 1.25rem',
    border: 'none',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '0.875rem',
    'font-weight': '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'inline-flex',
    'align-items': 'center',
    gap: '0.5rem'
  },

  primaryButton: {
    background: 'var(--primary-color)',
    color: 'white'
  },

  secondaryButton: {
    background: 'var(--secondary-color)',
    color: 'white'
  },

  successButton: {
    background: '#4CAF50',
    color: 'white'
  },

  purpleButton: {
    background: '#9c27b0',
    color: 'white'
  },

  alert: {
    padding: '0.75rem 1rem',
    'border-radius': 'var(--border-radius-sm)',
    'margin-bottom': '1rem',
    'font-size': '0.875rem',
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem'
  },

  errorAlert: {
    background: '#ffebee',
    border: '1px solid #ffcdd2',
    color: '#d32f2f'
  },

  successAlert: {
    background: '#e8f5e9',
    border: '1px solid #c8e6c9',
    color: '#2e7d32'
  },

  productItem: {
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    padding: '0.5rem',
    background: 'var(--surface-color)',
    'border-radius': 'var(--border-radius-sm)',
    border: '1px solid var(--border-color)',
    'margin-bottom': '0.5rem'
  },

  reservaItem: {
    padding: '0.75rem',
    background: 'var(--surface-color)',
    'border-radius': 'var(--border-radius-sm)',
    border: '1px solid var(--border-color)',
    'margin-bottom': '0.5rem'
  },

  bagItem: {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '0.5rem',
    background: 'var(--background-color)',
    'border-radius': 'var(--border-radius-sm)',
    'margin-bottom': '0.5rem'
  },

  searchBox: {
    position: 'relative',
    'margin-bottom': '1rem',
    padding: '0.75rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    background: 'var(--surface-color)'
  },

  searchResults: {
    position: 'absolute',
    top: '100%',
    left: '0',
    right: '0',
    'max-height': '200px',
    'overflow-y': 'auto',
    background: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'margin-top': '0.25rem',
    'z-index': '10',
    'box-shadow': 'var(--shadow-md)'
  },

  searchResultItem: {
    padding: '0.75rem',
    cursor: 'pointer',
    'border-bottom': '1px solid var(--border-color)',
    transition: 'background 0.2s'
  },

  smallInput: {
    width: '70px',
    padding: '0.375rem 0.5rem',
    'font-size': '0.8125rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    background: 'var(--surface-color)',
  },

  removeButton: {
    background: 'none',
    border: 'none',
    color: '#f44336',
    cursor: 'pointer',
    'font-size': '1.25rem',
    padding: '0.25rem'
  },

  totalSection: {
    background: '#e3f2fd',
    padding: '1rem',
    'border-radius': 'var(--border-radius-sm)',
    'text-align': 'right'
  },

  pricingGuide: {
    background: '#fff3e0',
    padding: '1rem',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '0.875rem'
  },

  gridTwo: {
    display: 'grid',
    'grid-template-columns': '1fr 1fr',
    gap: '1rem'
  },

  gridThree: {
    display: 'grid',
    'grid-template-columns': 'repeat(3, 1fr)',
    gap: '0.5rem'
  },

  gridSix: {
    display: 'grid',
    'grid-template-columns': 'repeat(6, 1fr)',
    gap: '0.5rem'
  },

  flexBetween: {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center'
  },

  smallText: {
    'font-size': '0.75rem',
    color: 'var(--text-muted)'
  },

  badge: {
    'font-size': '0.75rem',
    padding: '0.25rem 0.5rem',
    'border-radius': 'var(--border-radius-sm)',
    'font-weight': '500'
  },

  exemptBadge: {
    background: '#e8f5e9',
    color: '#2e7d32'
  },

  categoryBadge: {
    'font-size': '0.75rem',
    padding: '0.25rem 0.5rem',
    'border-radius': 'var(--border-radius-sm)',
    'font-weight': '500',
    display: 'inline-flex',
    'align-items': 'center',
    gap: '0.25rem'
  },

  expressWarning: {
    background: '#fff3cd',
    border: '1px solid #ffc107',
    color: '#856404',
    padding: '0.75rem',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '0.875rem',
    'margin-bottom': '1rem'
  },

  expressSuggestion: {
    background: '#e3f2fd',
    border: '1px solid #2196f3',
    color: '#0d47a1',
    padding: '0.75rem',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '0.875rem',
    'margin-bottom': '1rem'
  },

  statusIndicator: {
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    'font-size': '0.875rem',
    padding: '0.5rem',
    background: '#e8f5e9',
    border: '1px solid #c8e6c9',
    'border-radius': 'var(--border-radius-sm)'
  },

  listContainer: {
    'max-height': '300px',
    'overflow-y': 'auto'
  }
};

export const EnhancedInvoiceAddForm = () => {
  // Use persistent form state from store
  const form = enhancedInvoiceFormStore.formData;
  const updateForm = (updates: Partial<EnhancedInvoiceFormData>) => enhancedInvoiceFormStore.updateForm(updates);

  // Search states
  const [productSearch, setProductSearch] = createSignal('');
  const [searchResults, setSearchResults] = createSignal<any[]>([]);
  const [isSearching, setIsSearching] = createSignal(false);
  const [showProductSearch, setShowProductSearch] = createSignal(false);

  // Bag management states
  const [showBagManager, setShowBagManager] = createSignal(false);
  const [newBagName, setNewBagName] = createSignal('');

  // Loading and error states
  const [isSaving, setIsSaving] = createSignal(false);
  const [error, setError] = createSignal('');
  const [success, setSuccess] = createSignal('');
  
  // Force load saved data on mount
  onMount(() => {
    devLog('Enhanced invoice form mounted, loaded data:', form());

    if (enhancedInvoiceFormStore.hasData()) {
      setSuccess('Form data restored from previous session');
      setTimeout(() => setSuccess(''), 3000);
    }
  });

  // Express service validation (only for AEREO_EXPRESS shipping)
  const isExpressShipping = () => form().shippingType === 'AEREO_EXPRESS';

  const getExpressValidation = () => {
    const reservas = form().reservas;
    if (reservas.length === 0 || !isExpressShipping()) {
      return null;
    }

    const reservaTypes = reservas.map(r => r.type).filter(t => t.trim() !== '');
    if (reservaTypes.length === 0) {
      return null;
    }

    const suggestion = suggestExpressService(reservaTypes);
    const nonExpressItems = reservas.filter(r => r.type.trim() && !isExpressEligible(r.type));

    return {
      suggestion,
      nonExpressItems,
      hasNonExpressItems: nonExpressItems.length > 0
    };
  };

  // Product search functionality
  const searchProducts = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await inventoryStore.fecthProduct(query);
      setSearchResults(results || []);
    } catch (err) {
      console.error('Error searching products:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search
  createEffect(() => {
    const query = productSearch();
    if (query.length > 2) {
      const timeoutId = setTimeout(() => searchProducts(query), 300);
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
    }
  });

  // Calculate recommended price per pound based on weight
  const getRecommendedPricePerPound = (weight: number, shippingType: 'SEA' | 'AEREO') => {
    const pricing = SERVICE_PRICING[shippingType];
    const range = pricing.ranges.find(r => weight >= r.min && weight < r.max);
    return range ? range.pricePerPound : pricing.ranges[pricing.ranges.length - 1].pricePerPound;
  };

  // Calculate arancel based on weight
  const calculateArancel = (weight: number, price: number, isExempt: boolean) => {
    if (isExempt) return 0;
    
    const rate = ARANCEL_CONFIG.rates.find(r => weight >= r.min && weight < r.max);
    return rate ? price * rate.rate : price * 0.12; // Default to highest rate
  };

  // Add product to invoice
  const addProduct = (product: any) => {
    const newProduct: InvoiceProduct = {
      id: Date.now().toString(),
      product: {
        id: product.id,
        code: product.code || product.sku || '',
        label: product.label || product.name || '',
        price: product.price || product.sellingPrice || 0
      },
      qty: 1,
      salePrice: product.price || product.sellingPrice || 0,
      total: product.price || product.sellingPrice || 0
    };

    enhancedInvoiceFormStore.addProduct(newProduct);
    setProductSearch('');
    setShowProductSearch(false);
  };

  // Update product quantity or price
  const updateProduct = (id: string, field: 'qty' | 'salePrice', value: number) => {
    const products = form().products;
    const index = products.findIndex(p => p.id === id);
    if (index !== -1) {
      const updated = { ...products[index], [field]: value };
      updated.total = updated.qty * updated.salePrice;
      enhancedInvoiceFormStore.updateProduct(index, updated);
    }
  };

  // Remove product
  const removeProduct = (id: string) => {
    const index = form().products.findIndex(p => p.id === id);
    if (index !== -1) {
      enhancedInvoiceFormStore.removeProduct(index);
    }
  };

  // Add reserva with enhanced features
  const addReserva = () => {
    const newReserva: InvoiceReserva = {
      id: Date.now().toString(),
      type: '',
      qty: 1,
      weight: 0,
      price: 0,
      pricePerPound: 0,
      arancel: 0,
      arancelExempt: false,
      total: 0
    };

    enhancedInvoiceFormStore.addReserva(newReserva);
  };

  // Update reserva with automatic calculations
  const updateReserva = (id: string, field: keyof InvoiceReserva, value: any) => {
    const reservas = form().reservas;
    const index = reservas.findIndex(r => r.id === id);
    if (index !== -1) {
      const updated = { ...reservas[index], [field]: value };
      
      // Check if type is exempt from arancel
      if (field === 'type') {
        updated.arancelExempt = ARANCEL_CONFIG.exemptTypes.includes(value);
      }
      
      // Recalculate when weight or type changes
      if (field === 'weight' || field === 'type' || field === 'qty') {
        const totalWeight = updated.weight * updated.qty;
        const recommendedPrice = getRecommendedPricePerPound(totalWeight, form().shippingType);
        updated.pricePerPound = recommendedPrice;
        updated.price = totalWeight * recommendedPrice;
        updated.arancel = calculateArancel(totalWeight, updated.price, updated.arancelExempt || false);
      }
      
      // Recalculate total
      updated.total = updated.price + updated.arancel;
      
      enhancedInvoiceFormStore.updateReserva(index, updated);
    }
  };

  // Remove reserva
  const removeReserva = (id: string) => {
    const index = form().reservas.findIndex(r => r.id === id);
    if (index !== -1) {
      // Also remove from any bags
      const bags = form().bags;
      bags.forEach((bag, bagIndex) => {
        if (bag.reservas.includes(id)) {
          const updatedBag = {
            ...bag,
            reservas: bag.reservas.filter(rId => rId !== id)
          };
          enhancedInvoiceFormStore.updateBag(bagIndex, updatedBag);
        }
      });
      
      enhancedInvoiceFormStore.removeReserva(index);
    }
  };

  // Add new bag
  const addBag = () => {
    if (!newBagName().trim()) return;
    
    const newBag: InvoiceBag = {
      id: Date.now().toString(),
      name: newBagName(),
      reservas: [],
      transportCost: 5.00, // Default transport cost per bag
      totalWeight: 0
    };
    
    enhancedInvoiceFormStore.addBag(newBag);
    setNewBagName('');
  };

  // Assign reserva to bag
  const assignReservaToBag = (reservaId: string, bagId: string) => {
    const bags = form().bags;
    const reservas = form().reservas;
    
    // Remove from any existing bag
    bags.forEach((bag, index) => {
      if (bag.reservas.includes(reservaId)) {
        const updatedBag = {
          ...bag,
          reservas: bag.reservas.filter(rId => rId !== reservaId)
        };
        enhancedInvoiceFormStore.updateBag(index, updatedBag);
      }
    });
    
    // Add to new bag if specified
    if (bagId) {
      const bagIndex = bags.findIndex(b => b.id === bagId);
      if (bagIndex !== -1) {
        const updatedBag = {
          ...bags[bagIndex],
          reservas: [...bags[bagIndex].reservas, reservaId]
        };
        
        // Update bag weight
        const reserva = reservas.find(r => r.id === reservaId);
        if (reserva) {
          updatedBag.totalWeight = bags[bagIndex].totalWeight + (reserva.weight * reserva.qty);
        }
        
        enhancedInvoiceFormStore.updateBag(bagIndex, updatedBag);
      }
    }
    
    // Update reserva with bag assignment
    const reservaIndex = reservas.findIndex(r => r.id === reservaId);
    if (reservaIndex !== -1) {
      enhancedInvoiceFormStore.updateReserva(reservaIndex, {
        ...reservas[reservaIndex],
        bagId: bagId || undefined
      });
    }
  };

  // Remove bag
  const removeBag = (id: string) => {
    const index = form().bags.findIndex(b => b.id === id);
    if (index !== -1) {
      // Clear bag assignments from reservas
      const bag = form().bags[index];
      form().reservas.forEach((reserva, rIndex) => {
        if (bag.reservas.includes(reserva.id)) {
          enhancedInvoiceFormStore.updateReserva(rIndex, {
            ...reserva,
            bagId: undefined
          });
        }
      });
      
      enhancedInvoiceFormStore.removeBag(index);
    }
  };

  // Calculate totals
  const productSubtotal = () => {
    return form().products.reduce((sum, product) => sum + product.total, 0);
  };

  const reservaSubtotal = () => {
    return form().reservas.reduce((sum, reserva) => sum + reserva.total, 0);
  };

  const bagTransportTotal = () => {
    return form().bags.reduce((sum, bag) => sum + bag.transportCost, 0);
  };

  const grandTotal = () => {
    return productSubtotal() + reservaSubtotal() + bagTransportTotal();
  };

  // State for created invoice
  const [createdInvoice, setCreatedInvoice] = createSignal<string>('');
  const [isGeneratingPDF, setIsGeneratingPDF] = createSignal(false);

  // Save invoice
  const saveInvoice = async () => {
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      // Validate required fields
      if (!form().invoice.trim()) {
        throw new Error('Invoice number is required');
      }
      if (!form().shipper_consignee.name.trim()) {
        throw new Error('Customer name is required');
      }
      if (form().products.length === 0 && form().reservas.length === 0) {
        throw new Error('At least one product or reserva is required');
      }

      // Create invoice data
      const invoiceData = {
        ...form(),
        type: 'SALES',
        ssg_inventory_key: `INV-${Date.now()}`,
        ssg_sorder_key: `SO-${Date.now()}`,
        createDate: Date.now(),
        businessId: 'YB100423253156428',
        userId: 'current-user',
        isCompleted: true,
        productSubtotal: productSubtotal(),
        reservaSubtotal: reservaSubtotal(),
        bagTransportTotal: bagTransportTotal(),
        total: grandTotal()
      };

      // Save to invoice store
      const result = await invoiceStore.createInvoice(invoiceData);
      
      setCreatedInvoice(result.invoice);
      setSuccess('✅ Invoice created successfully! You can now generate a PDF.');
      
      // Mark form as completed (clears storage)
      enhancedInvoiceFormStore.markCompleted();

    } catch (err: any) {
      setError(err.message || 'Error creating invoice');
    } finally {
      setIsSaving(false);
    }
  };

  // Generate PDF
  const generatePDF = async () => {
    if (!createdInvoice()) return;

    setIsGeneratingPDF(true);
    setError('');

    try {
      const filename = await invoiceStore.generateInvoicePDF(createdInvoice(), 'enhanced', 'es');
      setSuccess(`📄 PDF generated successfully: ${filename}`);
      
      // After successful PDF generation, clear the form
      setTimeout(() => {
        resetForm();
      }, 3000);
      
    } catch (err: any) {
      setError(err.message || 'Error generating PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Reset form
  const resetForm = () => {
    enhancedInvoiceFormStore.clearForm();
    setCreatedInvoice('');
    setSuccess('');
    setError('');
  };
  
  // Check if form has unsaved data
  const hasUnsavedData = () => {
    return enhancedInvoiceFormStore.hasData() && enhancedInvoiceFormStore.isDirty;
  };
  
  // Confirm reset if there's unsaved data
  const confirmReset = () => {
    if (hasUnsavedData()) {
      if (confirm('Are you sure you want to clear the form? All unsaved changes will be lost.')) {
        resetForm();
      }
    } else {
      resetForm();
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>📄 Create Enhanced Invoice</h2>
      
      {/* Error/Success Messages */}
      <Show when={error()}>
        <div style={{ ...styles.alert, ...styles.errorAlert }}>
          ⚠️ {error()}
        </div>
      </Show>

      <Show when={success()}>
        <div style={{ ...styles.alert, ...styles.successAlert }}>
          {success()}
        </div>
      </Show>

      <div style={styles.grid}>
        {/* Left Column - Invoice Details */}
        <div>
          {/* Basic Invoice Info */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>📝 Invoice Information</h3>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Invoice Number *
              </label>
              <input
                type="text"
                value={form().invoice}
                onInput={(e) => updateForm({ invoice: e.target.value })}
                style={styles.input}
                placeholder="INV-001"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Store
              </label>
              <input
                type="text"
                value={form().store}
                onInput={(e) => updateForm({ store: e.target.value })}
                style={styles.input}
                placeholder="Store location"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Description
              </label>
              <textarea
                value={form().description}
                onInput={(e) => updateForm({ description: e.target.value })}
                style={styles.textarea}
                rows="2"
                placeholder="Invoice description"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={form().packagesOrder}
                  onChange={(e) => updateForm({ packagesOrder: e.target.checked })}
                />
                <span style={styles.label}>📦 Packages Order</span>
              </label>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Shipping Type
              </label>
              <select
                value={form().shippingType}
                onChange={(e) => updateForm({ shippingType: e.target.value as 'SEA' | 'AEREO' })}
                style={styles.select}
              >
                <option value="AEREO_EXPRESS">✈️ Aereo</option>
                <option value="SEA">🚢 Maritimo</option>
                <option value="AEREO">✈️ Aereo</option>
              </select>
            </div>
          </div>

          {/* Customer Information */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>👤 Customer Information</h3>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Company/Name *
              </label>
              <input
                type="text"
                value={form().shipper_consignee.name}
                onInput={(e) => enhancedInvoiceFormStore.updateShipperConsignee({ name: e.target.value })}
                style={styles.input}
                placeholder="Customer name"
              />
            </div>

            <div style={styles.gridTwo}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  First Name
                </label>
                <input
                  type="text"
                  value={form().shipper_consignee.firstName}
                  onInput={(e) => enhancedInvoiceFormStore.updateShipperConsignee({ firstName: e.target.value })}
                  style={styles.input}
                  placeholder="First"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Last Name
                </label>
                <input
                  type="text"
                  value={form().shipper_consignee.lastName}
                  onInput={(e) => enhancedInvoiceFormStore.updateShipperConsignee({ lastName: e.target.value })}
                  style={styles.input}
                  placeholder="Last"
                />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Phone Number
              </label>
              <input
                type="tel"
                value={form().shipper_consignee.phoneNumber}
                onInput={(e) => enhancedInvoiceFormStore.updateShipperConsignee({ phoneNumber: e.target.value })}
                style={styles.input}
                placeholder="Phone"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                ID Number
              </label>
              <input
                type="text"
                value={form().shipper_consignee.cid}
                onInput={(e) => enhancedInvoiceFormStore.updateShipperConsignee({ cid: e.target.value })}
                style={styles.input}
                placeholder="ID"
              />
            </div>
          </div>
        </div>

        {/* Middle Column - Products and Reservas */}
        <div>
          {/* Products Section */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>
              <span>📦 Products</span>
              <button
                onClick={() => setShowProductSearch(!showProductSearch())}
                style={{ ...styles.button, ...styles.primaryButton }}
              >
                Add Product
              </button>
            </div>

            {/* Product Search */}
            <Show when={showProductSearch()}>
              <div style={styles.searchBox}>
                <input
                  type="text"
                  value={productSearch()}
                  onInput={(e) => setProductSearch(e.target.value)}
                  style={styles.input}
                  placeholder="Search products..."
                />
                
                <Show when={isSearching()}>
                  <div style={styles.smallText}>Searching...</div>
                </Show>

                <Show when={searchResults().length > 0}>
                  <div style={styles.searchResults}>
                    <For each={searchResults()}>
                      {(product) => (
                        <div 
                          style={styles.searchResultItem}
                          onClick={() => addProduct(product)}
                        >
                          <div>
                            <div style={{ fontWeight: '500' }}>{product.label || product.name}</div>
                            <div style={styles.smallText}>{product.code || product.sku}</div>
                          </div>
                          <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                            ${product.price || product.sellingPrice || 0}
                          </div>
                        </div>
                      )}
                    </For>
                  </div>
                </Show>
              </div>
            </Show>

            {/* Products List */}
            <div style={styles.listContainer}>
              <For each={form().products}>
                {(product) => (
                  <div style={styles.productItem}>
                    <div style={{ flex: '1' }}>
                      <div style={{ fontWeight: '500', fontSize: '0.875rem' }}>{product.product.label}</div>
                      <div style={styles.smallText}>{product.product.code}</div>
                    </div>
                    
                    <input
                      type="number"
                      value={product.qty}
                      onInput={(e) => updateProduct(product.id, 'qty', parseInt(e.target.value) || 0)}
                      style={styles.smallInput}
                      min="1"
                      placeholder="Qty"
                    />
                    
                    <input
                      type="number"
                      value={product.salePrice}
                      onInput={(e) => updateProduct(product.id, 'salePrice', parseFloat(e.target.value) || 0)}
                      style={{ ...styles.smallInput, width: '80px' }}
                      step="0.01"
                      placeholder="Price"
                    />
                    
                    <div style={{ width: '80px', fontSize: '0.875rem', fontWeight: '500' }}>
                      ${product.total.toFixed(2)}
                    </div>
                    
                    <button
                      onClick={() => removeProduct(product.id)}
                      style={styles.removeButton}
                    >
                      ×
                    </button>
                  </div>
                )}
              </For>
            </div>

            <Show when={form().products.length > 0}>
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <div style={{ textAlign: 'right', fontWeight: '500', fontSize: '0.875rem' }}>
                  Products Subtotal: ${productSubtotal().toFixed(2)}
                </div>
              </div>
            </Show>
          </div>

          {/* Enhanced Reservas Section */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>
              <span>📋 Reservas</span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setShowBagManager(!showBagManager())}
                  style={{ ...styles.button, ...styles.purpleButton }}
                >
                  Manage Bags
                </button>
                <button
                  onClick={addReserva}
                  style={{ ...styles.button, ...styles.successButton }}
                >
                  Add Reserva
                </button>
              </div>
            </div>

            {/* Express Service Validation Warning */}
            <Show when={isExpressShipping() && getExpressValidation()?.hasNonExpressItems}>
              <div style={styles.expressWarning}>
                ⚠️ <strong>Warning:</strong> AEREO EXPRESS shipping is for Food, Medication, and Cleaning items only.
                The following items do not qualify:
                <ul style={{ margin: '0.5rem 0 0 1.5rem', padding: '0' }}>
                  <For each={getExpressValidation()?.nonExpressItems || []}>
                    {(reserva) => (
                      <li>{reserva.type || 'Unnamed item'}</li>
                    )}
                  </For>
                </ul>
              </div>
            </Show>

            {/* Bag Manager */}
            <Show when={showBagManager()}>
              <div style={{ ...styles.searchBox, marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <input
                    type="text"
                    value={newBagName()}
                    onInput={(e) => setNewBagName(e.target.value)}
                    style={{ ...styles.input, flex: '1' }}
                    placeholder="Bag name"
                  />
                  <button
                    onClick={addBag}
                    style={{ ...styles.button, ...styles.purpleButton }}
                  >
                    Add Bag
                  </button>
                </div>
                
                <For each={form().bags}>
                  {(bag) => (
                    <div style={styles.bagItem}>
                      <div>
                        <div style={{ fontWeight: '500' }}>🎒 {bag.name}</div>
                        <div style={styles.smallText}>
                          {bag.reservas.length} items | {bag.totalWeight.toFixed(1)} lbs | Transport: ${bag.transportCost.toFixed(2)}
                        </div>
                      </div>
                      <button
                        onClick={() => removeBag(bag.id)}
                        style={styles.removeButton}
                      >
                        ×
                      </button>
                    </div>
                  )}
                </For>
              </div>
            </Show>

            <div style={styles.listContainer}>
              <For each={form().reservas}>
                {(reserva) => {
                  const categoryInfo = reserva.type.trim() ? getReservaCategoryInfo(reserva.type) : null;

                  return (
                    <div style={styles.reservaItem}>
                      {/* Category Badge - Only show for AEREO_EXPRESS */}
                      <Show when={isExpressShipping() && categoryInfo}>
                        <div style={{ marginBottom: '0.5rem' }}>
                          <span style={{
                            ...styles.categoryBadge,
                            background: categoryInfo?.isExpress ? '#e8f5e9' : '#ffebee',
                            color: categoryInfo?.isExpress ? '#2e7d32' : '#c62828'
                          }}>
                            {categoryInfo?.label}
                            {categoryInfo?.isExpress ? ' ✓' : ' ✗'}
                          </span>
                        </div>
                      </Show>

                      <div style={{ ...styles.gridSix, marginBottom: '0.75rem' }}>
                        <div style={{ gridColumn: 'span 2' }}>
                          <input
                            type="text"
                            value={reserva.type}
                            onInput={(e) => updateReserva(reserva.id, 'type', e.target.value)}
                            style={styles.input}
                            placeholder={isExpressShipping() ? "e.g., Comida, Medicina, Detergente" : "Reserva type"}
                          />
                        </div>
                      
                      <div>
                        <label style={styles.smallText}>Qty</label>
                        <input
                          type="number"
                          value={reserva.qty}
                          onInput={(e) => updateReserva(reserva.id, 'qty', parseInt(e.target.value) || 0)}
                          style={styles.input}
                          min="1"
                        />
                      </div>
                      
                      <div>
                        <label style={styles.smallText}>Weight (lbs)</label>
                        <input
                          type="number"
                          value={reserva.weight}
                          onInput={(e) => updateReserva(reserva.id, 'weight', parseFloat(e.target.value) || 0)}
                          style={styles.input}
                          step="0.1"
                        />
                      </div>
                      
                      <div>
                        <label style={styles.smallText}>$/lb</label>
                        <div style={{ ...styles.input, backgroundColor: 'var(--background-color)' }}>
                          ${reserva.pricePerPound?.toFixed(2) || '0.00'}
                        </div>
                      </div>
                      
                      <div>
                        <label style={styles.smallText}>Bag</label>
                        <select
                          value={reserva.bagId || ''}
                          onChange={(e) => assignReservaToBag(reserva.id, e.target.value)}
                          style={styles.select}
                        >
                          <option value="">No Bag</option>
                          <For each={form().bags}>
                            {(bag) => (
                              <option value={bag.id}>{bag.name}</option>
                            )}
                          </For>
                        </select>
                      </div>
                    </div>
                    
                    <div style={styles.flexBetween}>
                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem' }}>
                        <span>Price: ${reserva.price.toFixed(2)}</span>
                        <span style={{ color: reserva.arancelExempt ? '#2e7d32' : 'inherit' }}>
                          Arancel: ${reserva.arancel.toFixed(2)} {reserva.arancelExempt ? '(Exempt)' : ''}
                        </span>
                        <span style={{ fontWeight: '500' }}>Total: ${reserva.total.toFixed(2)}</span>
                      </div>
                      <button
                        onClick={() => removeReserva(reserva.id)}
                        style={styles.removeButton}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  );
                }}
              </For>
            </div>

            <Show when={form().reservas.length > 0}>
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <div style={{ textAlign: 'right', fontWeight: '500', fontSize: '0.875rem' }}>
                  Reservas Subtotal: ${reservaSubtotal().toFixed(2)}
                </div>
              </div>
            </Show>
          </div>
        </div>

        {/* Right Column - Totals and Actions */}
        <div>
          {/* Total Section */}
          <div style={styles.totalSection}>
            <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              Products: ${productSubtotal().toFixed(2)}
            </div>
            <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              Reservas: ${reservaSubtotal().toFixed(2)}
            </div>
            <Show when={form().bags.length > 0}>
              <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                Bag Transport: ${bagTransportTotal().toFixed(2)}
              </div>
            </Show>
            <div style={{ paddingTop: '0.5rem', borderTop: '1px solid #bbdefb', marginTop: '0.5rem' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1976d2' }}>
                Total: ${grandTotal().toFixed(2)}
              </div>
            </div>
          </div>

          {/* Pricing Guide */}
          <Show when={form().shippingType}>
            <div style={styles.pricingGuide}>
              <h4 style={{ fontWeight: '600', marginBottom: '0.75rem' }}>💰 Pricing Guide ({form().shippingType})</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.75rem', marginBottom: '1rem' }}>
                <For each={SERVICE_PRICING[form().shippingType].ranges.slice(0, -1)}>
                  {(range) => (
                    <div style={styles.flexBetween}>
                      <span>{range.min}-{range.max} lbs:</span>
                      <span style={{ fontWeight: '500' }}>${range.pricePerPound}/lb</span>
                    </div>
                  )}
                </For>
                <div style={styles.flexBetween}>
                  <span>{SERVICE_PRICING[form().shippingType].ranges.slice(-1)[0].min}+ lbs:</span>
                  <span style={{ fontWeight: '500' }}>${SERVICE_PRICING[form().shippingType].ranges.slice(-1)[0].pricePerPound}/lb</span>
                </div>
              </div>
              
              <h4 style={{ fontWeight: '600', marginBottom: '0.5rem', fontSize: '0.875rem' }}>📊 Arancel Rates</h4>
              <div style={{ fontSize: '0.75rem', lineHeight: '1.4' }}>
                <div>0-50 lbs: 5% | 50-200 lbs: 8%</div>
                <div>200-500 lbs: 10% | 500+ lbs: 12%</div>
                <div style={{ color: '#2e7d32', marginTop: '0.25rem' }}>
                  ✅ Exempt: Documents, Medicines, Personal Effects, Books
                </div>
              </div>
            </div>
          </Show>

          {/* Form Status */}
          <Show when={enhancedInvoiceFormStore.isDirty || enhancedInvoiceFormStore.lastSaved}>
            <div style={styles.statusIndicator}>
              <Show when={enhancedInvoiceFormStore.isDirty}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ ...styles.pulseIndicator, animation: 'pulse 2s infinite' }}></div>
                  Auto-saving changes...
                </span>
              </Show>
              <Show when={!enhancedInvoiceFormStore.isDirty && enhancedInvoiceFormStore.lastSaved}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={styles.pulseIndicator}></div>
                  Last saved: {enhancedInvoiceFormStore.lastSaved?.toLocaleTimeString()}
                </span>
              </Show>
            </div>
          </Show>

          {/* Action Buttons */}
          <div style={{ marginTop: '1rem' }}>
            <Show when={!createdInvoice()}>
              <button
                onClick={saveInvoice}
                disabled={isSaving() || !enhancedInvoiceFormStore.isValid()}
                style={{ 
                  ...styles.button, 
                  ...styles.primaryButton, 
                  width: '100%', 
                  padding: '1rem',
                  opacity: (isSaving() || !enhancedInvoiceFormStore.isValid()) ? 0.6 : 1,
                  cursor: (isSaving() || !enhancedInvoiceFormStore.isValid()) ? 'not-allowed' : 'pointer'
                }}
              >
                {isSaving() ? '💾 Saving...' : '💾 Create Invoice'}
              </button>
            </Show>

            <Show when={createdInvoice()}>
              <button
                onClick={generatePDF}
                disabled={isGeneratingPDF()}
                style={{ 
                  ...styles.button, 
                  ...styles.successButton, 
                  width: '100%', 
                  padding: '1rem',
                  opacity: isGeneratingPDF() ? 0.6 : 1,
                  cursor: isGeneratingPDF() ? 'not-allowed' : 'pointer'
                }}
              >
                {isGeneratingPDF() ? '📄 Generating...' : '📄 Generate PDF'}
              </button>
            </Show>

            <button
              onClick={confirmReset}
              style={{ 
                ...styles.button, 
                background: 'var(--background-color)', 
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
                width: '100%', 
                marginTop: '0.5rem'
              }}
            >
              🗑️ Clear Form
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};