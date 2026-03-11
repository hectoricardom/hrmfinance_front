import { createSignal, createEffect, For, Show, onMount } from 'solid-js';
import { inventoryStore } from '../../inventory/stores/inventoryStore';
import { invoiceStore } from '../stores/invoiceStore';
import { enhancedInvoiceFormStore, type EnhancedInvoiceFormData } from '../stores/enhancedInvoiceFormStore';
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

// Styles based on project's existing style system
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
    border: '1px solid var(--border-color)'
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

  pulseIndicator: {
    width: '8px',
    height: '8px',
    background: '#4CAF50',
    'border-radius': '50%',
    animation: 'pulse 2s infinite'
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
  const [selectedBagForReserva, setSelectedBagForReserva] = createSignal<string>('');

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
      setSuccess('Invoice created successfully! You can now generate a PDF.');
      
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
      setSuccess(`PDF generated successfully: ${filename}`);
      
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
      <h2 style={styles.header}>Create Enhanced Invoice</h2>
      
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
            <h3 style={styles.sectionTitle}>Invoice Information</h3>
            
            <div>
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
                  <span style={styles.label}>Packages Order</span>
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
                  <option value="SEA">🚢 Maritimo</option>
                  <option value="AEREO">✈️ Aereo</option>
                </select>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Customer Information</h3>
            
            <div>
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
        </div>

        {/* Middle Column - Products and Reservas */}
        <div>
          {/* Products Section */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>
              <h3>Products</h3>
              <button
                onClick={() => setShowProductSearch(!showProductSearch())}
                style={{ ...styles.button, ...styles.primaryButton }}
              >
                Add Product
              </button>
            </div>

            {/* Product Search */}
            <Show when={showProductSearch()}>
              <div class="mb-4 p-3 border border-gray-300 rounded-md">
                <input
                  type="text"
                  value={productSearch()}
                  onInput={(e) => setProductSearch(e.target.value)}
                  class="w-full mb-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Search products..."
                />
                
                <Show when={isSearching()}>
                  <div class="text-sm text-gray-500">Searching...</div>
                </Show>

                <div class="max-h-32 overflow-y-auto">
                  <For each={searchResults()}>
                    {(product) => (
                      <div 
                        class="flex justify-between items-center p-2 hover:bg-gray-100 cursor-pointer border-b"
                        onClick={() => addProduct(product)}
                      >
                        <div>
                          <div class="font-medium text-sm">{product.label || product.name}</div>
                          <div class="text-xs text-gray-500">{product.code || product.sku}</div>
                        </div>
                        <div class="text-sm font-medium">${product.price || product.sellingPrice || 0}</div>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </Show>

            {/* Products List */}
            <div class="space-y-2 max-h-48 overflow-y-auto">
              <For each={form().products}>
                {(product) => (
                  <div class="flex items-center gap-2 p-2 bg-white rounded border text-sm">
                    <div class="flex-1">
                      <div class="font-medium">{product.product.label}</div>
                      <div class="text-xs text-gray-500">{product.product.code}</div>
                    </div>
                    
                    <input
                      type="number"
                      value={product.qty}
                      onInput={(e) => updateProduct(product.id, 'qty', parseInt(e.target.value) || 0)}
                      class="w-12 px-1 py-1 text-sm border border-gray-300 rounded"
                      min="1"
                    />
                    
                    <input
                      type="number"
                      value={product.salePrice}
                      onInput={(e) => updateProduct(product.id, 'salePrice', parseFloat(e.target.value) || 0)}
                      class="w-16 px-1 py-1 text-sm border border-gray-300 rounded"
                      step="0.01"
                    />
                    
                    <div class="w-16 text-sm font-medium">${product.total.toFixed(2)}</div>
                    
                    <button
                      onClick={() => removeProduct(product.id)}
                      class="text-red-500 hover:text-red-700"
                    >
                      ×
                    </button>
                  </div>
                )}
              </For>
            </div>

            <Show when={form().products.length > 0}>
              <div class="mt-3 pt-3 border-t">
                <div class="text-right font-medium text-sm">
                  Subtotal: ${productSubtotal().toFixed(2)}
                </div>
              </div>
            </Show>
          </div>

          {/* Enhanced Reservas Section */}
          <div class="bg-gray-50 p-4 rounded-lg">
            <div class="flex justify-between items-center mb-3">
              <h3 class="text-lg font-semibold">Reservas</h3>
              <button
                onClick={addReserva}
                class="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors text-sm"
              >
                Add Reserva
              </button>
            </div>

            <div class="space-y-2 max-h-64 overflow-y-auto">
              <For each={form().reservas}>
                {(reserva) => (
                  <div class="p-3 bg-white rounded border">
                    <div class="grid grid-cols-2 gap-2">
                      <div class="col-span-2">
                        <select
                          value={reserva.type}
                          onChange={(e) => updateReserva(reserva.id, 'type', e.target.value)}
                          class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        >
                          <option value="">Select Type</option>
                          <option value="GENERAL">General</option>
                          <option value="ELECTRONICS">Electronics</option>
                          <option value="CLOTHING">Clothing</option>
                          <option value="DOCUMENTS">Documents (Exempt)</option>
                          <option value="MEDICINES">Medicines (Exempt)</option>
                          <option value="PERSONAL_EFFECTS">Personal Effects (Exempt)</option>
                          <option value="BOOKS">Books (Exempt)</option>
                        </select>
                      </div>
                      
                      <div>
                        <label class="text-xs text-gray-600">Qty</label>
                        <input
                          type="number"
                          value={reserva.qty}
                          onInput={(e) => updateReserva(reserva.id, 'qty', parseInt(e.target.value) || 0)}
                          class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          min="1"
                        />
                      </div>
                      
                      <div>
                        <label class="text-xs text-gray-600">Weight (lbs)</label>
                        <input
                          type="number"
                          value={reserva.weight}
                          onInput={(e) => updateReserva(reserva.id, 'weight', parseFloat(e.target.value) || 0)}
                          class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          step="0.1"
                        />
                      </div>
                      
                      <div>
                        <label class="text-xs text-gray-600">$/lb</label>
                        <div class="px-2 py-1 text-sm bg-gray-100 rounded">
                          ${reserva.pricePerPound?.toFixed(2) || '0.00'}
                        </div>
                      </div>
                      
                      <div>
                        <label class="text-xs text-gray-600">Price</label>
                        <div class="px-2 py-1 text-sm bg-gray-100 rounded">
                          ${reserva.price.toFixed(2)}
                        </div>
                      </div>
                      
                      <div>
                        <label class="text-xs text-gray-600">
                          Arancel {reserva.arancelExempt ? '(Exempt)' : ''}
                        </label>
                        <div class="px-2 py-1 text-sm bg-gray-100 rounded">
                          ${reserva.arancel.toFixed(2)}
                        </div>
                      </div>
                      
                      <div>
                        <label class="text-xs text-gray-600">Bag</label>
                        <select
                          value={reserva.bagId || ''}
                          onChange={(e) => assignReservaToBag(reserva.id, e.target.value)}
                          class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
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
                    
                    <div class="flex justify-between items-center mt-2">
                      <div class="text-sm font-medium">
                        Total: ${reserva.total.toFixed(2)}
                      </div>
                      <button
                        onClick={() => removeReserva(reserva.id)}
                        class="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </For>
            </div>

            <Show when={form().reservas.length > 0}>
              <div class="mt-3 pt-3 border-t">
                <div class="text-right font-medium text-sm">
                  Subtotal: ${reservaSubtotal().toFixed(2)}
                </div>
              </div>
            </Show>
          </div>
        </div>

        {/* Right Column - Bags and Totals */}
        <div class="lg:col-span-1 space-y-4">
          {/* Bag Management */}
          <div class="bg-gray-50 p-4 rounded-lg">
            <div class="flex justify-between items-center mb-3">
              <h3 class="text-lg font-semibold">Bag Management</h3>
              <button
                onClick={() => setShowBagManager(!showBagManager())}
                class="px-3 py-1 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors text-sm"
              >
                Manage Bags
              </button>
            </div>

            <Show when={showBagManager()}>
              <div class="mb-3 flex gap-2">
                <input
                  type="text"
                  value={newBagName()}
                  onInput={(e) => setNewBagName(e.target.value)}
                  class="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                  placeholder="Bag name"
                />
                <button
                  onClick={addBag}
                  class="px-3 py-1 bg-purple-500 text-white rounded text-sm"
                >
                  Add Bag
                </button>
              </div>
            </Show>

            <div class="space-y-2">
              <For each={form().bags}>
                {(bag) => (
                  <div class="p-3 bg-white rounded border">
                    <div class="flex justify-between items-start">
                      <div>
                        <div class="font-medium">{bag.name}</div>
                        <div class="text-sm text-gray-600">
                          {bag.reservas.length} items | {bag.totalWeight.toFixed(1)} lbs
                        </div>
                        <div class="text-sm text-gray-600">
                          Transport: ${bag.transportCost.toFixed(2)}
                        </div>
                      </div>
                      <button
                        onClick={() => removeBag(bag.id)}
                        class="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </For>
            </div>

            <Show when={form().bags.length > 0}>
              <div class="mt-3 pt-3 border-t">
                <div class="text-right font-medium text-sm">
                  Transport Total: ${bagTransportTotal().toFixed(2)}
                </div>
              </div>
            </Show>
          </div>

          {/* Pricing Guide */}
          <div class="bg-blue-50 p-4 rounded-lg">
            <h4 class="font-semibold mb-2 text-sm">Pricing Guide ({form().shippingType})</h4>
            <div class="space-y-1 text-xs">
              <For each={SERVICE_PRICING[form().shippingType].ranges}>
                {(range) => (
                  <div class="flex justify-between">
                    <span>
                      {range.min}-{range.max === Infinity ? '∞' : range.max} lbs:
                    </span>
                    <span class="font-medium">${range.pricePerPound}/lb</span>
                  </div>
                )}
              </For>
            </div>
          </div>

          {/* Total Section */}
          <div class="bg-green-50 p-4 rounded-lg">
            <div class="space-y-2">
              <div class="flex justify-between text-sm">
                <span>Products:</span>
                <span>${productSubtotal().toFixed(2)}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span>Reservas:</span>
                <span>${reservaSubtotal().toFixed(2)}</span>
              </div>
              <Show when={form().bags.length > 0}>
                <div class="flex justify-between text-sm">
                  <span>Bag Transport:</span>
                  <span>${bagTransportTotal().toFixed(2)}</span>
                </div>
              </Show>
              <div class="pt-2 border-t border-green-300">
                <div class="flex justify-between text-lg font-bold text-green-700">
                  <span>Total:</span>
                  <span>${grandTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Form Status */}
          <Show when={enhancedInvoiceFormStore.isDirty || enhancedInvoiceFormStore.lastSaved}>
            <div class="bg-green-50 border border-green-200 rounded-lg p-3">
              <div class="flex items-center justify-between text-sm">
                <Show when={enhancedInvoiceFormStore.isDirty}>
                  <span class="text-green-600 flex items-center">
                    <span class="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                    Auto-saving...
                  </span>
                </Show>
                <Show when={!enhancedInvoiceFormStore.isDirty && enhancedInvoiceFormStore.lastSaved}>
                  <span class="text-green-600 flex items-center">
                    <span class="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    Saved
                  </span>
                </Show>
              </div>
            </div>
          </Show>

          {/* Action Buttons */}
          <div class="space-y-3">
            <Show when={!createdInvoice()}>
              <button
                onClick={saveInvoice}
                disabled={isSaving() || !enhancedInvoiceFormStore.isValid()}
                class="w-full py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium"
              >
                {isSaving() ? 'Saving...' : 'Create Invoice'}
              </button>
            </Show>

            <Show when={createdInvoice()}>
              <button
                onClick={generatePDF}
                disabled={isGeneratingPDF()}
                class="w-full py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 transition-colors font-medium"
              >
                {isGeneratingPDF() ? 'Generating...' : 'Generate PDF'}
              </button>
            </Show>

            <button
              onClick={confirmReset}
              class="w-full py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            >
              Clear Form
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};