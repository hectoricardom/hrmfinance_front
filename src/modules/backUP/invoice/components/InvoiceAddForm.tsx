import { createSignal, createEffect, For, Show, onMount } from 'solid-js';
import { inventoryStore } from '../../inventory/stores/inventoryStore';
import { invoiceStore } from '../stores/invoiceStore';
import { invoiceFormStore, type InvoiceFormData } from '../stores/invoiceFormStore';
import { inventoryApi } from '../../../services/apiAdapter';
import { devLog } from '../../../services/utils';

// Types for the invoice form
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
  reservas: string[]; // Array of reserva IDs
  transportCost: number;
  totalWeight: number;
}

interface InvoiceForm {
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

// Service pricing configuration
const SERVICE_PRICING = {
  'AEREO': {
    ranges: [
      { min: 0, max: 10, pricePerPound: 3.50 },
      { min: 10, max: 50, pricePerPound: 3.00 },
      { min: 50, max: 100, pricePerPound: 2.50 },
      { min: 100, max: Infinity, pricePerPound: 2.00 }
    ]
  },
  'SEA': {
    ranges: [
      { min: 0, max: 50, pricePerPound: 1.50 },
      { min: 50, max: 200, pricePerPound: 1.25 },
      { min: 200, max: 500, pricePerPound: 1.00 },
      { min: 500, max: Infinity, pricePerPound: 0.75 }
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

export const InvoiceAddForm = () => {
  // Use persistent form state from store - directly use the signal
  const form = invoiceFormStore.formData;  // This is now the signal itself
  const updateForm = (updates: Partial<InvoiceFormData>) => invoiceFormStore.updateForm(updates);
  
  // Debug effect to watch form changes
  createEffect(() => {
    devLog('InvoiceAddForm: Form data changed:', {
      isEditMode: invoiceFormStore.isEditMode,
      editingInvoiceId: invoiceFormStore.editingInvoiceId,
      formData: form(),
      invoice: form().invoice,
      store: form().store,
      products: form().products?.length,
      reservas: form().reservas?.length
    });
  });

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
  const [stockErrors, setStockErrors] = createSignal<any[]>([]);
  
  // Force load saved data on mount
  onMount(() => {
    // Force a re-render to ensure form fields are populated
    devLog('Invoice form mounted, loaded data:', form());
    
    // If there's saved data, show a message
    if (invoiceFormStore.hasData()) {
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

    invoiceFormStore.addProduct(newProduct);
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
      invoiceFormStore.updateProduct(index, updated);
    }
  };

  // Remove product
  const removeProduct = (id: string) => {
    const index = form().products.findIndex(p => p.id === id);
    if (index !== -1) {
      invoiceFormStore.removeProduct(index);
    }
  };

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

  // Add reserva
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

    invoiceFormStore.addReserva(newReserva);
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
      
      invoiceFormStore.updateReserva(index, updated);
    }
  };

  // Remove reserva
  const removeReserva = (id: string) => {
    const index = form().reservas.findIndex(r => r.id === id);
    if (index !== -1) {
      // Also remove from any bags
      const bags = form().bags || [];
      bags.forEach((bag, bagIndex) => {
        if (bag.reservas.includes(id)) {
          const updatedBag = {
            ...bag,
            reservas: bag.reservas.filter(rId => rId !== id)
          };
          invoiceFormStore.updateBag(bagIndex, updatedBag);
        }
      });
      
      invoiceFormStore.removeReserva(index);
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
    
    invoiceFormStore.addBag(newBag);
    setNewBagName('');
  };

  // Assign reserva to bag
  const assignReservaToBag = (reservaId: string, bagId: string) => {
    const bags = form().bags || [];
    const reservas = form().reservas;
    
    // Remove from any existing bag
    bags.forEach((bag, index) => {
      if (bag.reservas.includes(reservaId)) {
        const updatedBag = {
          ...bag,
          reservas: bag.reservas.filter(rId => rId !== reservaId)
        };
        invoiceFormStore.updateBag(index, updatedBag);
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
        
        invoiceFormStore.updateBag(bagIndex, updatedBag);
      }
    }
    
    // Update reserva with bag assignment
    const reservaIndex = reservas.findIndex(r => r.id === reservaId);
    if (reservaIndex !== -1) {
      invoiceFormStore.updateReserva(reservaIndex, {
        ...reservas[reservaIndex],
        bagId: bagId || undefined
      });
    }
  };

  // Remove bag
  const removeBag = (id: string) => {
    const bags = form().bags || [];
    const index = bags.findIndex(b => b.id === id);
    if (index !== -1) {
      // Clear bag assignments from reservas
      const bag = bags[index];
      form().reservas.forEach((reserva, rIndex) => {
        if (bag.reservas.includes(reserva.id)) {
          invoiceFormStore.updateReserva(rIndex, {
            ...reserva,
            bagId: undefined
          });
        }
      });
      
      invoiceFormStore.removeBag(index);
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
    const bags = form().bags || [];
    return bags.reduce((sum, bag) => sum + bag.transportCost, 0);
  };

  const grandTotal = () => {
    return productSubtotal() + reservaSubtotal() + bagTransportTotal();
  };

  // State for created invoice
  const [createdInvoice, setCreatedInvoice] = createSignal<string>('');
  const [isGeneratingPDF, setIsGeneratingPDF] = createSignal(false);

  // Validate stock availability
  const validateStockAvailability = async (products: any[], storeId?: string) => {
    if (!products || products.length === 0) return { valid: true, errors: [] };

    try {
      const items = products.map(p => ({
        productId: p.product?.id || p.productId || p.id,
        quantity: parseFloat(p.qty || p.quantity || '0')
      })).filter(item => item.productId && item.quantity > 0);

      if (items.length === 0) return { valid: true, errors: [] };

      const result = await inventoryApi.checkStockAvailability(items, storeId);

      if (!result.available) {
        return {
          valid: false,
          errors: result.unavailableItems || []
        };
      }
      return { valid: true, errors: [] };
    } catch (err) {
      console.warn('Stock check failed, proceeding anyway:', err);
      return { valid: true, errors: [] };
    }
  };

  // Save invoice (handles both add and edit modes)
  const saveInvoice = async () => {
    setIsSaving(true);
    setError('');
    setSuccess('');
    setStockErrors([]);

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

      // Check stock availability first
      const stockCheck = await validateStockAvailability(form().products, form().store);
      if (!stockCheck.valid) {
        setStockErrors(stockCheck.errors);
        // Show error message but don't block - just warn
        setError('Warning: Some items have insufficient stock. Please review before proceeding.');
      }

      if (invoiceFormStore.isEditMode) {
        // Edit mode: update existing invoice
        const result = await invoiceFormStore.saveEditedInvoice();
        setSuccess('Invoice updated successfully!');
        
        // Navigate back or refresh the view after a short delay
        setTimeout(() => {
          invoiceFormStore.exitEditMode();
          window.history.back(); // Go back to invoice display
        }, 1500);
      } else {
        // Add mode: create new invoice
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
        invoiceFormStore.markCompleted();
      }

    } catch (err: any) {
      setError(err.message || 'Error saving invoice');
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
      const filename = await invoiceStore.generateInvoicePDF(createdInvoice(), 'compact', 'es');
      setSuccess(`PDF generated successfully: ${filename}`);
      
      // After successful PDF generation, clear the form
      setTimeout(() => {
        resetForm();
      }, 3000); // Clear after 3 seconds to allow user to see success message
      
    } catch (err: any) {
      setError(err.message || 'Error generating PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Reset form (user action)
  const resetForm = () => {
    invoiceFormStore.clearForm();
    setCreatedInvoice('');
    setSuccess('');
    setError('');
  };
  
  // Check if form has unsaved data
  const hasUnsavedData = () => {
    return invoiceFormStore.hasData() && invoiceFormStore.isDirty;
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
    <div class="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 class="text-2xl font-bold text-gray-800 mb-6">
        {invoiceFormStore.isEditMode ? 'Edit Invoice' : 'Create New Invoice'}
        {invoiceFormStore.isEditMode && (
          <span class="text-sm font-normal text-gray-600 ml-2">
            (ID: {invoiceFormStore.editingInvoiceId})
          </span>
        )}
      </h2>
      
      {/* Error/Success Messages */}
      <Show when={error()}>
        <div class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error()}
        </div>
      </Show>

      <Show when={success()}>
        <div class="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          {success()}
        </div>
      </Show>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Invoice Details */}
        <div class="space-y-4">
          {/* Basic Invoice Info */}
          <div class="bg-gray-50 p-4 rounded-lg">
            <h3 class="text-lg font-semibold mb-3">Invoice Information</h3>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Invoice Number *
                </label>
                <input
                  type="text"
                  value={form().invoice}
                  onInput={(e) => updateForm({ invoice: e.target.value })}
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="INV-001"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Store
                </label>
                <input
                  type="text"
                  value={form().store}
                  onInput={(e) => updateForm({ store: e.target.value })}
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Store location"
                />
              </div>
            </div>

            <div class="mt-4">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={form().description}
                onInput={(e) => updateForm({ description: e.target.value })}
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="2"
                placeholder="Invoice description"
              />
            </div>

            <div class="mt-4">
              <label class="flex items-center">
                <input
                  type="checkbox"
                  checked={form().packagesOrder}
                  onChange={(e) => updateForm({ packagesOrder: e.target.checked })}
                  class="mr-2"
                />
                <span class="text-sm text-gray-700">Packages Order</span>
              </label>
            </div>

            <div class="mt-4">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Shipping Type
              </label>
              <select
                value={form().shippingType}
                onChange={(e) => updateForm({ shippingType: e.target.value as 'SEA' | 'AEREO' })}
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="SEA">🚢 Maritimo</option>
                <option value="AEREO">✈️ Aereo</option>
              </select>
            </div>
          </div>

          {/* Customer Information */}
          <div class="bg-gray-50 p-4 rounded-lg">
            <h3 class="text-lg font-semibold mb-3">Customer Information</h3>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Company/Name *
                </label>
                <input
                  type="text"
                  value={form().shipper_consignee.name}
                  onInput={(e) => invoiceFormStore.updateShipperConsignee({ name: e.target.value })}
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Customer name"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={form().shipper_consignee.firstName}
                  onInput={(e) => invoiceFormStore.updateShipperConsignee({ firstName: e.target.value })}
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="First name"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={form().shipper_consignee.lastName}
                  onInput={(e) => invoiceFormStore.updateShipperConsignee({ lastName: e.target.value })}
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Last name"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={form().shipper_consignee.phoneNumber}
                  onInput={(e) => invoiceFormStore.updateShipperConsignee({ phoneNumber: e.target.value })}
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Phone number"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  ID Number
                </label>
                <input
                  type="text"
                  value={form().shipper_consignee.cid}
                  onInput={(e) => invoiceFormStore.updateShipperConsignee({ cid: e.target.value })}
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ID number"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Passport (Optional)
                </label>
                <input
                  type="text"
                  value={form().shipper_consignee.passport || ''}
                  onInput={(e) => invoiceFormStore.updateShipperConsignee({ passport: e.target.value })}
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Passport number"
                />
              </div>
            </div>

            <div class="mt-4">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <textarea
                value={form().shipper_consignee.address || ''}
                onInput={(e) => invoiceFormStore.updateShipperConsignee({ address: e.target.value })}
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="2"
                placeholder="Customer address"
              />
            </div>
          </div>
        </div>

        {/* Right Column - Products and Reservas */}
        <div class="space-y-4">
          {/* Products Section */}
          <div class="bg-gray-50 p-4 rounded-lg">
            <div class="flex justify-between items-center mb-3">
              <h3 class="text-lg font-semibold">Products</h3>
              <button
                onClick={() => setShowProductSearch(!showProductSearch())}
                class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
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
                          <div class="font-medium">{product.label || product.name}</div>
                          <div class="text-sm text-gray-500">{product.code || product.sku}</div>
                        </div>
                        <div class="text-sm font-medium">${product.price || product.sellingPrice || 0}</div>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </Show>

            {/* Stock Warnings */}
            <Show when={stockErrors().length > 0}>
              <div class="mb-4 p-4 bg-yellow-50 border border-yellow-400 rounded-lg">
                <div class="font-semibold text-yellow-800 mb-2">
                  ⚠️ Low Stock Warning
                </div>
                <ul class="list-disc pl-5 text-sm text-yellow-800">
                  <For each={stockErrors()}>
                    {(item) => (
                      <li>
                        {item.productName}: Need {item.requestedQuantity}, only {item.availableQuantity} available
                      </li>
                    )}
                  </For>
                </ul>
              </div>
            </Show>

            {/* Products List */}
            <div class="space-y-2">
              <For each={form().products}>
                {(product) => (
                  <div class="flex items-center gap-2 p-2 bg-white rounded border">
                    <div class="flex-1">
                      <div class="font-medium text-sm">{product.product.label}</div>
                      <div class="text-xs text-gray-500">{product.product.code}</div>
                    </div>
                    
                    <div class="flex items-center gap-2">
                      <input
                        type="number"
                        value={product.qty}
                        onInput={(e) => updateProduct(product.id, 'qty', parseInt(e.target.value) || 0)}
                        class="w-16 px-2 py-1 text-sm border border-gray-300 rounded"
                        placeholder="Qty"
                        min="1"
                      />
                      
                      <input
                        type="number"
                        value={product.salePrice}
                        onInput={(e) => updateProduct(product.id, 'salePrice', parseFloat(e.target.value) || 0)}
                        class="w-20 px-2 py-1 text-sm border border-gray-300 rounded"
                        placeholder="Price"
                        step="0.01"
                      />
                      
                      <div class="w-20 text-sm font-medium">${product.total.toFixed(2)}</div>
                      
                      <button
                        onClick={() => removeProduct(product.id)}
                        class="text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}
              </For>
            </div>

            <Show when={form().products.length > 0}>
              <div class="mt-3 pt-3 border-t">
                <div class="text-right font-medium">
                  Products Subtotal: ${productSubtotal().toFixed(2)}
                </div>
              </div>
            </Show>
          </div>

          {/* Enhanced Reservas Section */}
          <div class="bg-gray-50 p-4 rounded-lg">
            <div class="flex justify-between items-center mb-3">
              <h3 class="text-lg font-semibold">Reservas</h3>
              <div class="flex gap-2">
                <button
                  onClick={() => setShowBagManager(!showBagManager())}
                  class="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors"
                >
                  Manage Bags
                </button>
                <button
                  onClick={addReserva}
                  class="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                >
                  Add Reserva
                </button>
              </div>
            </div>

            {/* Bag Manager */}
            <Show when={showBagManager()}>
              <div class="mb-4 p-3 border border-gray-300 rounded-md bg-white">
                <div class="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newBagName()}
                    onInput={(e) => setNewBagName(e.target.value)}
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Bag name"
                  />
                  <button
                    onClick={addBag}
                    class="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600"
                  >
                    Add Bag
                  </button>
                </div>
                
                <div class="space-y-2">
                  <For each={form().bags || []}>
                    {(bag) => (
                      <div class="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <div>
                          <span class="font-medium">{bag.name}</span>
                          <span class="text-sm text-gray-600 ml-2">
                            ({bag.reservas.length} items, {bag.totalWeight.toFixed(1)} lbs)
                          </span>
                        </div>
                        <div class="flex items-center gap-2">
                          <span class="text-sm">Transport: ${bag.transportCost.toFixed(2)}</span>
                          <button
                            onClick={() => removeBag(bag.id)}
                            class="text-red-500 hover:text-red-700"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </Show>

            <div class="space-y-2">
              <For each={form().reservas}>
                {(reserva) => (
                  <div class="p-3 bg-white rounded border">
                    <div class="grid grid-cols-6 gap-2 mb-2">
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
                        <label class="text-xs text-gray-600">Bag</label>
                        <select
                          value={reserva.bagId || ''}
                          onChange={(e) => assignReservaToBag(reserva.id, e.target.value)}
                          class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        >
                          <option value="">No Bag</option>
                          <For each={form().bags || []}>
                            {(bag) => (
                              <option value={bag.id}>{bag.name}</option>
                            )}
                          </For>
                        </select>
                      </div>
                    </div>
                    
                    <div class="flex justify-between items-center">
                      <div class="flex gap-4 text-sm">
                        <span>Price: ${reserva.price.toFixed(2)}</span>
                        <span class={reserva.arancelExempt ? 'text-green-600' : ''}>
                          Arancel: ${reserva.arancel.toFixed(2)} {reserva.arancelExempt ? '(Exempt)' : ''}
                        </span>
                        <span class="font-medium">Total: ${reserva.total.toFixed(2)}</span>
                      </div>
                      <button
                        onClick={() => removeReserva(reserva.id)}
                        class="text-red-500 hover:text-red-700"
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
                <div class="text-right font-medium">
                  Reservas Subtotal: ${reservaSubtotal().toFixed(2)}
                </div>
              </div>
            </Show>
          </div>

          {/* Total Section */}
          <div class="bg-blue-50 p-4 rounded-lg">
            <div class="text-right">
              <div class="text-sm text-gray-600">Products: ${productSubtotal().toFixed(2)}</div>
              <div class="text-sm text-gray-600">Reservas: ${reservaSubtotal().toFixed(2)}</div>
              <Show when={(form().bags || []).length > 0}>
                <div class="text-sm text-gray-600">Bag Transport: ${bagTransportTotal().toFixed(2)}</div>
              </Show>
              <div class="text-xl font-bold text-blue-600 mt-2">
                Total: ${grandTotal().toFixed(2)}
              </div>
            </div>
          </div>
          
          {/* Pricing Guide */}
          <Show when={form().shippingType}>
            <div class="bg-yellow-50 p-4 rounded-lg">
              <h4 class="text-sm font-semibold mb-2">Pricing Guide ({form().shippingType})</h4>
              <div class="grid grid-cols-2 gap-2 text-xs">
                <For each={SERVICE_PRICING[form().shippingType].ranges.slice(0, -1)}>
                  {(range) => (
                    <div class="flex justify-between">
                      <span>{range.min}-{range.max} lbs:</span>
                      <span class="font-medium">${range.pricePerPound}/lb</span>
                    </div>
                  )}
                </For>
                <div class="flex justify-between">
                  <span>{SERVICE_PRICING[form().shippingType].ranges.slice(-1)[0].min}+ lbs:</span>
                  <span class="font-medium">${SERVICE_PRICING[form().shippingType].ranges.slice(-1)[0].pricePerPound}/lb</span>
                </div>
              </div>
              
              <h4 class="text-sm font-semibold mt-3 mb-1">Arancel Rates</h4>
              <div class="text-xs space-y-1">
                <div>0-50 lbs: 5% | 50-200 lbs: 8%</div>
                <div>200-500 lbs: 10% | 500+ lbs: 12%</div>
                <div class="text-green-600">Exempt: Documents, Medicines, Personal Effects, Books</div>
              </div>
            </div>
          </Show>

          {/* Form Status */}
          <Show when={invoiceFormStore.isDirty || invoiceFormStore.lastSaved}>
            <div class="bg-green-50 border border-green-200 rounded-lg p-3">
              <div class="flex items-center justify-between text-sm">
                <Show when={invoiceFormStore.isDirty}>
                  <span class="text-green-600 flex items-center">
                    <span class="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                    Auto-saving changes...
                  </span>
                </Show>
                <Show when={!invoiceFormStore.isDirty && invoiceFormStore.lastSaved}>
                  <span class="text-green-600 flex items-center">
                    <span class="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    Last saved: {invoiceFormStore.lastSaved?.toLocaleTimeString()}
                  </span>
                </Show>
                <Show when={hasUnsavedData()}>
                  <button
                    onClick={confirmReset}
                    class="text-red-600 hover:text-red-800 text-xs underline"
                  >
                    Clear Form
                  </button>
                </Show>
              </div>
            </div>
          </Show>

          {/* Action Buttons */}
          <div class="space-y-3">
            <Show when={!createdInvoice()}>
              <Show when={invoiceFormStore.isEditMode}>
                {/* Edit Mode Buttons */}
                <div class="grid grid-cols-2 gap-3">
                  <button
                    onClick={saveInvoice}
                    disabled={isSaving() || !invoiceFormStore.isValid()}
                    class="py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 transition-colors font-medium"
                  >
                    {isSaving() ? 'Updating...' : 'Update Invoice'}
                  </button>
                  <button
                    onClick={() => {
                      invoiceFormStore.exitEditMode();
                      window.history.back();
                    }}
                    class="py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </Show>
              <Show when={!invoiceFormStore.isEditMode}>
                {/* Add Mode Buttons */}
                <div class="grid grid-cols-2 gap-3">
                  <button
                    onClick={saveInvoice}
                    disabled={isSaving() || !invoiceFormStore.isValid()}
                    class="py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium"
                  >
                    {isSaving() ? 'Saving...' : 'Create Invoice'}
                  </button>
                  <button
                    onClick={confirmReset}
                    class="py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors font-medium"
                  >
                    Clear Form
                  </button>
                </div>
              </Show>
            </Show>

            <Show when={createdInvoice()}>
              <div class="grid grid-cols-2 gap-3">
                <button
                  onClick={generatePDF}
                  disabled={isGeneratingPDF()}
                  class="py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 transition-colors font-medium"
                >
                  {isGeneratingPDF() ? 'Generating...' : 'Generate PDF'}
                </button>
                
                <button
                  onClick={resetForm}
                  class="py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors font-medium"
                >
                  New Invoice
                </button>
              </div>
            </Show>
          </div>
        </div>
      </div>
    </div>
  );
};