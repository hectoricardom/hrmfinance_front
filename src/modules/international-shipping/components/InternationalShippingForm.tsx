import { createSignal, createEffect, For, Show, onMount } from 'solid-js';
import { internationalShippingFormStore } from '../stores/internationalShippingFormStore';
import {
  InternationalShipmentItem,
  InternationalProduct,
  ShippingBulk,
  DestinationCountry,
  PricingMode,
  StandardBoxSize,
  STANDARD_BOX_SIZES,
  BoxPricing,
  calculateCubicFeet,
  getTariffRate,
  calculateTariff,
  DEFAULT_PRICING_CONFIG
} from '../types/internationalShippingTypes';
import { inventoryStore } from '../../inventory/stores/inventoryStore';
import { downloadInternationalShippingPDF } from '../utils/internationalShippingPdfGenerator';

// Helper function to determine pricing mode based on country
const getPricingModeForCountry = (country: DestinationCountry | ''): PricingMode => {
  if (!country) return 'CUBIC_FEET';

  const tariff = DEFAULT_PRICING_CONFIG.countryTariffs.find(t => t.country === country);
  if (!tariff) return 'CUBIC_FEET';

  if (tariff.box) return 'FIXED_BOX';
  if (tariff.priceLbs) return 'WEIGHT_LBS';
  return 'CUBIC_FEET';
};

// Helper function to get price per pound for a country
const getPricePerLb = (country: DestinationCountry | ''): number => {
  if (!country) return 0;
  const tariff = DEFAULT_PRICING_CONFIG.countryTariffs.find(t => t.country === country);
  return tariff?.priceLbs || 0;
};

// Helper function to get box pricing for a country
const getBoxPricing = (country: DestinationCountry | ''): BoxPricing | null => {
  if (!country) return null;
  const tariff = DEFAULT_PRICING_CONFIG.countryTariffs.find(t => t.country === country);
  return tariff?.box || null;
};

// Helper function to get box price for a specific size
const getBoxPrice = (country: DestinationCountry | '', boxSize: StandardBoxSize): number => {
  const boxPricing = getBoxPricing(country);
  if (!boxPricing || !boxSize) return 0;
  return boxPricing[boxSize]?.price || 0;
};

// Helper function to get pricing mode display labels
const getPricingModeLabels = (mode: PricingMode) => {
  switch (mode) {
    case 'WEIGHT_LBS':
      return {
        title: 'Shipment Items (Weight)',
        dimensionLabel: 'Peso (lbs)',
        calculationLabel: 'Total lbs',
        priceLabel: '$/lb'
      };
    case 'FIXED_BOX':
      return {
        title: 'Shipment Items (Fixed Box)',
        dimensionLabel: 'Tamaño Caja',
        calculationLabel: 'Precio Caja',
        priceLabel: 'Precio'
      };
    case 'CUBIC_FEET':
    default:
      return {
        title: 'Shipment Items (Cubic Feet)',
        dimensionLabel: 'Dimensiones',
        calculationLabel: 'Pies³',
        priceLabel: '$/Pie³'
      };
  }
};

export const InternationalShippingForm = () => {
  // Use persistent form state from store
  const form = internationalShippingFormStore.formData;
  const updateForm = internationalShippingFormStore.updateForm;

  // Search states
  const [productSearch, setProductSearch] = createSignal('');
  const [searchResults, setSearchResults] = createSignal<any[]>([]);
  const [isSearching, setIsSearching] = createSignal(false);
  const [showProductSearch, setShowProductSearch] = createSignal(false);

  // Bulk management states
  const [showBulkManager, setShowBulkManager] = createSignal(false);
  const [newBulkName, setNewBulkName] = createSignal('');

  // Loading and error states
  const [isSaving, setIsSaving] = createSignal(false);
  const [error, setError] = createSignal('');
  const [success, setSuccess] = createSignal('');

  // State for created shipping document
  const [createdShipping, setCreatedShipping] = createSignal<string>('');
  const [isGeneratingPDF, setIsGeneratingPDF] = createSignal(false);

  // Force load saved data on mount
  onMount(() => {
    console.log('International shipping form mounted, loaded data:', form());

    if (internationalShippingFormStore.hasData()) {
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

  // Add product to shipping
  const addProduct = (product: any) => {
    const newProduct: InternationalProduct = {
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

    internationalShippingFormStore.addProduct(newProduct);
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
      internationalShippingFormStore.updateProduct(index, updated);
    }
  };

  // Remove product
  const removeProduct = (id: string) => {
    const index = form().products.findIndex(p => p.id === id);
    if (index !== -1) {
      internationalShippingFormStore.removeProduct(index);
    }
  };

  // Add shipment item
  const addShipmentItem = () => {
    const pricingMode = getPricingModeForCountry(form().destinationCountry);

    const newItem: InternationalShipmentItem = {
      id: Date.now().toString(),
      description: '',
      qty: 1,
      dimensions: {
        height: 0,
        width: 0,
        depth: 0,
        cubicFeet: 0
      },
      pricingMode: pricingMode,
      pricePerCubicFoot: form().pricingConfig.defaultPricePerCubicFoot,
      pricePerLb: pricingMode === 'WEIGHT_LBS' ? getPricePerLb(form().destinationCountry) : undefined,
      weightLbs: pricingMode === 'WEIGHT_LBS' ? 0 : undefined,
      totalWeightLbs: pricingMode === 'WEIGHT_LBS' ? 0 : undefined,
      selectedBoxSize: pricingMode === 'FIXED_BOX' ? STANDARD_BOX_SIZES[0] : undefined,
      boxPrice: pricingMode === 'FIXED_BOX' ? getBoxPrice(form().destinationCountry, STANDARD_BOX_SIZES[0]) : undefined,
      totalCubicFeet: 0,
      subtotal: 0,
      tariff: 0,
      total: 0
    };

    internationalShippingFormStore.addShipmentItem(newItem);
  };

  // Update shipment item with automatic calculations
  const updateShipmentItem = (id: string, field: keyof InternationalShipmentItem, value: any) => {
    const items = form().shipmentItems;
    const index = items.findIndex(i => i.id === id);
    if (index !== -1) {
      const updated = { ...items[index] };

      // Handle dimension updates
      if (field === 'dimensions') {
        updated.dimensions = value;
        // Calculate cubic feet
        const cubicFeet = calculateCubicFeet(
          value.height,
          value.width,
          value.depth
        );
        updated.dimensions.cubicFeet = cubicFeet;
      } else if (field === 'selectedBoxSize') {
        // Handle box size selection
        updated.selectedBoxSize = value as StandardBoxSize;
        updated.boxPrice = getBoxPrice(form().destinationCountry, value as StandardBoxSize);
      } else {
        (updated as any)[field] = value;
      }

      // Recalculate totals based on pricing mode
      const shouldRecalculate =
        field === 'qty' ||
        field === 'dimensions' ||
        field === 'pricePerCubicFoot' ||
        field === 'weightLbs' ||
        field === 'pricePerLb' ||
        field === 'selectedBoxSize';

      if (shouldRecalculate) {
        // Calculate based on pricing mode
        switch (updated.pricingMode) {
          case 'WEIGHT_LBS':
            updated.totalWeightLbs = (updated.weightLbs || 0) * updated.qty;
            updated.subtotal = updated.totalWeightLbs * (updated.pricePerLb || 0);
            break;

          case 'FIXED_BOX':
            updated.subtotal = updated.qty * (updated.boxPrice || 0);
            break;

          case 'CUBIC_FEET':
          default:
            updated.totalCubicFeet = updated.dimensions.cubicFeet * updated.qty;
            updated.subtotal = updated.totalCubicFeet * updated.pricePerCubicFoot;
            break;
        }

        // Calculate tariff if country is selected
        if (form().destinationCountry) {
          updated.tariff = calculateTariff(
            updated.subtotal,
            form().destinationCountry as DestinationCountry,
            form().pricingConfig
          );
        }

        updated.total = updated.subtotal + updated.tariff;
      }

      internationalShippingFormStore.updateShipmentItem(index, updated);
    }
  };

  // Update dimension field
  const updateDimension = (itemId: string, dimensionField: 'height' | 'width' | 'depth', value: number) => {
    const items = form().shipmentItems;
    const index = items.findIndex(i => i.id === itemId);
    if (index !== -1) {
      const item = items[index];
      const newDimensions = {
        ...item.dimensions,
        [dimensionField]: value
      };
      updateShipmentItem(itemId, 'dimensions', newDimensions);
    }
  };

  // Remove shipment item
  const removeShipmentItem = (id: string) => {
    const index = form().shipmentItems.findIndex(i => i.id === id);
    if (index !== -1) {
      internationalShippingFormStore.removeShipmentItem(index);
    }
  };

  // Add new bulk
  const addBulk = () => {
    if (!newBulkName().trim()) return;

    const newBulk: ShippingBulk = {
      id: Date.now().toString(),
      name: newBulkName(),
      type: 'PERSONAL',
      totalCubicFeet: 0,
      currentCubicFeet: 0,
      transportCost: 50.00, // Default transport cost per bulk
      status: 'DRAFT'
    };

    internationalShippingFormStore.addBulk(newBulk);
    setNewBulkName('');
  };

  // Remove bulk
  const removeBulk = (id: string) => {
    const index = form().bulks.findIndex(b => b.id === id);
    if (index !== -1) {
      internationalShippingFormStore.removeBulk(index);
    }
  };

  // Calculate totals
  const productSubtotal = () => {
    return form().products.reduce((sum, product) => sum + product.total, 0);
  };

  const shipmentSubtotal = () => {
    return form().shipmentItems.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const shipmentTariffTotal = () => {
    return form().shipmentItems.reduce((sum, item) => sum + item.tariff, 0);
  };

  const shipmentTotal = () => {
    return form().shipmentItems.reduce((sum, item) => sum + item.total, 0);
  };

  const bulkTransportTotal = () => {
    return form().bulks.reduce((sum, bulk) => sum + (bulk.transportCost || 0), 0);
  };

  const totalCubicFeet = () => {
    return form().shipmentItems.reduce((sum, item) => sum + item.totalCubicFeet, 0);
  };

  const totalWeightLbs = () => {
    return form().shipmentItems.reduce((sum, item) => sum + (item.totalWeightLbs || 0), 0);
  };

  const totalBoxes = () => {
    return form().shipmentItems.reduce((sum, item) => sum + item.qty, 0);
  };

  const grandTotal = () => {
    return productSubtotal() + shipmentTotal() + bulkTransportTotal();
  };

  // Get selected country tariff info
  const selectedCountryTariff = () => {
    if (!form().destinationCountry) return null;
    return form().pricingConfig.countryTariffs.find(
      t => t.country === form().destinationCountry
    );
  };

  // Save shipping document
  const saveShipping = async () => {
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      // Validate required fields
      if (!form().invoice.trim()) {
        throw new Error('Invoice/Document number is required');
      }
      if (!form().destinationCountry) {
        throw new Error('Destination country is required');
      }
      if (!form().shipper_consignee.name.trim()) {
        throw new Error('Customer name is required');
      }
      if (form().products.length === 0 && form().shipmentItems.length === 0) {
        throw new Error('At least one product or shipment item is required');
      }

      const shippingData = {
        ...form(),
        type: 'INTERNATIONAL_SHIPPING',
        ssg_shipping_key: `INTSHIP-${Date.now()}`,
        createDate: Date.now(),
        businessId: 'YB100423253156428',
        userId: 'current-user',
        isCompleted: true,
        productSubtotal: productSubtotal(),
        shipmentSubtotal: shipmentSubtotal(),
        shipmentTariffTotal: shipmentTariffTotal(),
        shipmentTotal: shipmentTotal(),
        bulkTransportTotal: bulkTransportTotal(),
        totalCubicFeet: totalCubicFeet(),
        total: grandTotal()
      };

      // TODO: Save to actual store/API
      console.log('Saving international shipping document:', shippingData);

      setCreatedShipping(form().invoice);
      setSuccess('Shipping document created successfully! You can now generate a PDF.');

      // Mark form as completed (clears storage)
      internationalShippingFormStore.markCompleted();

    } catch (err: any) {
      setError(err.message || 'Error saving shipping document');
    } finally {
      setIsSaving(false);
    }
  };

  // Generate PDF
  const generatePDF = async () => {
    if (!createdShipping()) return;

    setIsGeneratingPDF(true);
    setError('');

    try {
      // Generate and download PDF
      downloadInternationalShippingPDF(
        form(),
        `international-shipping-${createdShipping()}.pdf`,
        'en' // Default to English, can be made configurable
      );

      setSuccess(`PDF generated successfully for: ${createdShipping()}`);

      // Reset form after a short delay
      setTimeout(() => {
        resetForm();
      }, 2000);

    } catch (err: any) {
      setError(err.message || 'Error generating PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Reset form
  const resetForm = () => {
    internationalShippingFormStore.clearForm();
    setCreatedShipping('');
    setSuccess('');
    setError('');
  };

  // Confirm reset if there's unsaved data
  const confirmReset = () => {
    if (internationalShippingFormStore.hasData() && internationalShippingFormStore.isDirty) {
      if (confirm('Are you sure you want to clear the form? All unsaved changes will be lost.')) {
        resetForm();
      }
    } else {
      resetForm();
    }
  };

  // Recalculate all items when country changes
  createEffect(() => {
    const country = form().destinationCountry;
    if (country) {
      const pricingMode = getPricingModeForCountry(country);

      // Recalculate all items with the new pricing mode
      form().shipmentItems.forEach((item, index) => {
        const updated = { ...item };

        // Update pricing mode
        updated.pricingMode = pricingMode;

        // Update mode-specific fields
        if (pricingMode === 'WEIGHT_LBS') {
          updated.pricePerLb = getPricePerLb(country);
          if (!updated.weightLbs) updated.weightLbs = 0;
          updated.totalWeightLbs = (updated.weightLbs || 0) * updated.qty;
          updated.subtotal = updated.totalWeightLbs * (updated.pricePerLb || 0);
        } else if (pricingMode === 'FIXED_BOX') {
          if (!updated.selectedBoxSize) updated.selectedBoxSize = STANDARD_BOX_SIZES[0];
          updated.boxPrice = getBoxPrice(country, updated.selectedBoxSize);
          updated.subtotal = updated.qty * (updated.boxPrice || 0);
        } else {
          // CUBIC_FEET mode
          updated.totalCubicFeet = updated.dimensions.cubicFeet * updated.qty;
          updated.subtotal = updated.totalCubicFeet * updated.pricePerCubicFoot;
        }

        // Recalculate tariff with new subtotal
        updated.tariff = calculateTariff(
          updated.subtotal,
          country as DestinationCountry,
          form().pricingConfig
        );
        updated.total = updated.subtotal + updated.tariff;

        internationalShippingFormStore.updateShipmentItem(index, updated);
      });
    }
  });

  return (
    <div class="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 class="text-2xl font-bold text-gray-800 mb-6">
        International Shipping - Cubic Feet Pricing
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
        {/* Left Column - Document Details */}
        <div class="space-y-4">
          {/* Basic Document Info */}
          <div class="bg-gray-50 p-4 rounded-lg">
            <h3 class="text-lg font-semibold mb-3">Document Information</h3>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Document Number *
                </label>
                <input
                  type="text"
                  value={form().invoice}
                  onInput={(e) => updateForm({ invoice: e.target.value })}
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="SHIP-001"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Store/Office
                </label>
                <input
                  type="text"
                  value={form().store}
                  onInput={(e) => updateForm({ store: e.target.value })}
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Office location"
                />
              </div>
            </div>

            <div class="mt-4">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Destination Country *
              </label>
              <select
                value={form().destinationCountry}
                onChange={(e) => updateForm({ destinationCountry: e.target.value as DestinationCountry })}
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select Destination --</option>
                <For each={form().pricingConfig.countryTariffs}>
                  {(country) => (
                    <option value={country.country}>
                      {country.flagEmoji} {country.label} (Tariff: {(country.tariffRate * 100).toFixed(0)}%)
                    </option>
                  )}
                </For>
              </select>
            </div>

            <div class="mt-4">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Guide/Tracking Number
              </label>
              <input
                type="text"
                value={form().guide || ''}
                onInput={(e) => updateForm({ guide: e.target.value })}
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tracking number"
              />
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
                placeholder="Shipment description"
              />
            </div>

            {/* Pricing Configuration */}
            <div class="mt-4 p-3 bg-blue-50 rounded space-y-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Default Price per Cubic Foot
                </label>
                <div class="flex items-center">
                  <span class="mr-2">$</span>
                  <input
                    type="number"
                    value={form().pricingConfig.defaultPricePerCubicFoot}
                    onInput={(e) => internationalShippingFormStore.updatePricingConfig({
                      defaultPricePerCubicFoot: parseFloat(e.target.value) || 0
                    })}
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    step="0.01"
                    min="0"
                  />
                  <span class="ml-2 text-sm text-gray-600">/ ft³</span>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Insurance Percentage
                </label>
                <div class="flex items-center">
                  <input
                    type="number"
                    value={form().insurancePercent}
                    onInput={(e) => updateForm({ insurancePercent: parseFloat(e.target.value) || 0 })}
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    step="0.1"
                    min="0"
                    max="100"
                  />
                  <span class="ml-2 text-sm text-gray-600">%</span>
                </div>
                <p class="text-xs text-gray-500 mt-1">Applied to subtotal (default: 5%)</p>
              </div>
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
                  onInput={(e) => internationalShippingFormStore.updateShipperConsignee({ name: e.target.value })}
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
                  value={form().shipper_consignee.firstName || ''}
                  onInput={(e) => internationalShippingFormStore.updateShipperConsignee({ firstName: e.target.value })}
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
                  value={form().shipper_consignee.lastName || ''}
                  onInput={(e) => internationalShippingFormStore.updateShipperConsignee({ lastName: e.target.value })}
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
                  value={form().shipper_consignee.phoneNumber || ''}
                  onInput={(e) => internationalShippingFormStore.updateShipperConsignee({ phoneNumber: e.target.value })}
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
                  value={form().shipper_consignee.cid || ''}
                  onInput={(e) => internationalShippingFormStore.updateShipperConsignee({ cid: e.target.value })}
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ID number"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={form().shipper_consignee.email || ''}
                  onInput={(e) => internationalShippingFormStore.updateShipperConsignee({ email: e.target.value })}
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="email@example.com"
                />
              </div>
            </div>

            <div class="mt-4">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <textarea
                value={form().shipper_consignee.address || ''}
                onInput={(e) => internationalShippingFormStore.updateShipperConsignee({ address: e.target.value })}
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="2"
                placeholder="Customer address"
              />
            </div>
          </div>
        </div>

        {/* Right Column - Products and Shipment Items */}
        <div class="space-y-4">
          {/* Products Section (Optional) */}
          <div class="bg-gray-50 p-4 rounded-lg">
            <div class="flex justify-between items-center mb-3">
              <h3 class="text-lg font-semibold">Additional Products (Optional)</h3>
              <button
                onClick={() => setShowProductSearch(!showProductSearch())}
                class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
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
                <div class="text-right font-medium text-sm">
                  Products Subtotal: ${productSubtotal().toFixed(2)}
                </div>
              </div>
            </Show>
          </div>

          {/* Shipment Items Section - Dynamic Pricing */}
          <div class={`p-4 rounded-lg border-2 ${
            getPricingModeForCountry(form().destinationCountry) === 'FIXED_BOX'
              ? 'bg-purple-50 border-purple-200'
              : getPricingModeForCountry(form().destinationCountry) === 'WEIGHT_LBS'
              ? 'bg-orange-50 border-orange-200'
              : 'bg-blue-50 border-blue-200'
          }`}>
            {/* Pricing Mode Indicator */}
            <div class={`mb-3 p-2 rounded-md text-center text-sm font-medium ${
              getPricingModeForCountry(form().destinationCountry) === 'FIXED_BOX'
                ? 'bg-purple-100 text-purple-800'
                : getPricingModeForCountry(form().destinationCountry) === 'WEIGHT_LBS'
                ? 'bg-orange-100 text-orange-800'
                : 'bg-blue-100 text-blue-800'
            }`}>
              {getPricingModeForCountry(form().destinationCountry) === 'FIXED_BOX' && (
                <span>📦 Precio por Caja Fija - {selectedCountryTariff()?.label || 'Seleccione país'}</span>
              )}
              {getPricingModeForCountry(form().destinationCountry) === 'WEIGHT_LBS' && (
                <span>⚖️ Precio por Libra (${getPricePerLb(form().destinationCountry)}/lb) - {selectedCountryTariff()?.label || 'Seleccione país'}</span>
              )}
              {getPricingModeForCountry(form().destinationCountry) === 'CUBIC_FEET' && (
                <span>📐 Precio por Pie Cúbico (${form().pricingConfig.defaultPricePerCubicFoot}/ft³) - {selectedCountryTariff()?.label || 'Seleccione país'}</span>
              )}
            </div>

            <div class="flex justify-between items-center mb-3">
              <h3 class={`text-lg font-semibold ${
                getPricingModeForCountry(form().destinationCountry) === 'FIXED_BOX'
                  ? 'text-purple-900'
                  : getPricingModeForCountry(form().destinationCountry) === 'WEIGHT_LBS'
                  ? 'text-orange-900'
                  : 'text-blue-900'
              }`}>
                {form().shipmentItems.length > 0
                  ? getPricingModeLabels(form().shipmentItems[0].pricingMode).title
                  : 'Artículos de Envío'}
              </h3>
              <button
                onClick={addShipmentItem}
                class="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
              >
                + Agregar Artículo
              </button>
            </div>

            <div class="space-y-3">
              <For each={form().shipmentItems}>
                {(item) => (
                  <div class="p-3 bg-white rounded border-2 border-blue-100">
                    {/* Description */}
                    <div class="mb-2">
                      <input
                        type="text"
                        value={item.description}
                        onInput={(e) => updateShipmentItem(item.id, 'description', e.target.value)}
                        class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        placeholder="Item description"
                      />
                    </div>

                    {/* Conditional Input Fields Based on Pricing Mode */}

                    {/* CUBIC_FEET Mode - Dimensions */}
                    <Show when={item.pricingMode === 'CUBIC_FEET'}>
                      <div class="grid grid-cols-5 gap-2 mb-2">
                        <div>
                          <label class="text-xs text-gray-600">Qty</label>
                          <input
                            type="number"
                            value={item.qty}
                            onInput={(e) => updateShipmentItem(item.id, 'qty', parseInt(e.target.value) || 0)}
                            class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            min="1"
                          />
                        </div>

                        <div>
                          <label class="text-xs text-gray-600">Height (in)</label>
                          <input
                            type="number"
                            value={item.dimensions.height}
                            onInput={(e) => updateDimension(item.id, 'height', parseFloat(e.target.value) || 0)}
                            class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            step="0.1"
                            min="0"
                          />
                        </div>

                        <div>
                          <label class="text-xs text-gray-600">Width (in)</label>
                          <input
                            type="number"
                            value={item.dimensions.width}
                            onInput={(e) => updateDimension(item.id, 'width', parseFloat(e.target.value) || 0)}
                            class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            step="0.1"
                            min="0"
                          />
                        </div>

                        <div>
                          <label class="text-xs text-gray-600">Depth (in)</label>
                          <input
                            type="number"
                            value={item.dimensions.depth}
                            onInput={(e) => updateDimension(item.id, 'depth', parseFloat(e.target.value) || 0)}
                            class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            step="0.1"
                            min="0"
                          />
                        </div>

                        <div>
                          <label class="text-xs text-gray-600">$/ft³</label>
                          <input
                            type="number"
                            value={item.pricePerCubicFoot}
                            onInput={(e) => updateShipmentItem(item.id, 'pricePerCubicFoot', parseFloat(e.target.value) || 0)}
                            class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            step="0.01"
                            min="0"
                          />
                        </div>
                      </div>
                    </Show>

                    {/* WEIGHT_LBS Mode - Weight Input */}
                    <Show when={item.pricingMode === 'WEIGHT_LBS'}>
                      <div class="grid grid-cols-3 gap-2 mb-2">
                        <div>
                          <label class="text-xs text-gray-600">Qty</label>
                          <input
                            type="number"
                            value={item.qty}
                            onInput={(e) => updateShipmentItem(item.id, 'qty', parseInt(e.target.value) || 0)}
                            class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            min="1"
                          />
                        </div>

                        <div>
                          <label class="text-xs text-gray-600">Peso (lbs)</label>
                          <input
                            type="number"
                            value={item.weightLbs || 0}
                            onInput={(e) => updateShipmentItem(item.id, 'weightLbs', parseFloat(e.target.value) || 0)}
                            class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            step="0.1"
                            min="0"
                          />
                        </div>

                        <div>
                          <label class="text-xs text-gray-600">$/lb</label>
                          <input
                            type="number"
                            value={item.pricePerLb || 0}
                            onInput={(e) => updateShipmentItem(item.id, 'pricePerLb', parseFloat(e.target.value) || 0)}
                            class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            step="0.01"
                            min="0"
                          />
                        </div>
                      </div>
                    </Show>

                    {/* FIXED_BOX Mode - Box Size Selector */}
                    <Show when={item.pricingMode === 'FIXED_BOX'}>
                      <div class="grid grid-cols-2 gap-2 mb-2">
                        <div>
                          <label class="text-xs text-gray-600">Qty</label>
                          <input
                            type="number"
                            value={item.qty}
                            onInput={(e) => updateShipmentItem(item.id, 'qty', parseInt(e.target.value) || 0)}
                            class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            min="1"
                          />
                        </div>

                        <div>
                          <label class="text-xs text-gray-600">Tamaño Caja</label>
                          <select
                            value={item.selectedBoxSize || STANDARD_BOX_SIZES[0]}
                            onChange={(e) => updateShipmentItem(item.id, 'selectedBoxSize', e.target.value as StandardBoxSize)}
                            class="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          >
                            <For each={STANDARD_BOX_SIZES}>
                              {(size) => {
                                const price = getBoxPrice(form().destinationCountry, size);
                                return (
                                  <option value={size}>
                                    {size} - ${price}
                                  </option>
                                );
                              }}
                            </For>
                          </select>
                        </div>
                      </div>
                    </Show>

                    {/* Calculations Display - Dynamic based on pricing mode */}
                    <div class="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                      <div class="flex gap-4">
                        {/* CUBIC_FEET Mode Display */}
                        <Show when={item.pricingMode === 'CUBIC_FEET'}>
                          <>
                            <span class="text-blue-600 font-medium">
                              {item.dimensions.cubicFeet.toFixed(3)} ft³ ea
                            </span>
                            <span class="text-blue-600 font-medium">
                              Total: {item.totalCubicFeet.toFixed(3)} ft³
                            </span>
                          </>
                        </Show>

                        {/* WEIGHT_LBS Mode Display */}
                        <Show when={item.pricingMode === 'WEIGHT_LBS'}>
                          <>
                            <span class="text-blue-600 font-medium">
                              {item.weightLbs?.toFixed(2)} lbs ea
                            </span>
                            <span class="text-blue-600 font-medium">
                              Total: {item.totalWeightLbs?.toFixed(2)} lbs
                            </span>
                          </>
                        </Show>

                        {/* FIXED_BOX Mode Display */}
                        <Show when={item.pricingMode === 'FIXED_BOX'}>
                          <>
                            <span class="text-blue-600 font-medium">
                              Box: {item.selectedBoxSize}
                            </span>
                            <span class="text-blue-600 font-medium">
                              Price: ${item.boxPrice?.toFixed(2)}
                            </span>
                          </>
                        </Show>

                        <span>Subtotal: ${item.subtotal.toFixed(2)}</span>
                        <span class="text-orange-600">Tariff: ${item.tariff.toFixed(2)}</span>
                        <span class="font-bold text-green-600">Total: ${item.total.toFixed(2)}</span>
                      </div>
                      <button
                        onClick={() => removeShipmentItem(item.id)}
                        class="text-red-500 hover:text-red-700 font-bold"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </For>
            </div>

            <Show when={form().shipmentItems.length > 0}>
              <div class={`mt-3 pt-3 border-t ${
                getPricingModeForCountry(form().destinationCountry) === 'FIXED_BOX'
                  ? 'border-purple-200'
                  : getPricingModeForCountry(form().destinationCountry) === 'WEIGHT_LBS'
                  ? 'border-orange-200'
                  : 'border-blue-200'
              }`}>
                <div class="text-right space-y-1">
                  {/* Show cubic feet total only for CUBIC_FEET mode */}
                  <Show when={form().shipmentItems[0]?.pricingMode === 'CUBIC_FEET'}>
                    <div class="text-sm">
                      Total Pies Cúbicos: <span class="font-bold text-blue-600">{totalCubicFeet().toFixed(3)} ft³</span>
                    </div>
                  </Show>
                  {/* Show weight total only for WEIGHT_LBS mode */}
                  <Show when={form().shipmentItems[0]?.pricingMode === 'WEIGHT_LBS'}>
                    <div class="text-sm">
                      Total Peso: <span class="font-bold text-orange-600">{totalWeightLbs().toFixed(2)} lbs</span>
                    </div>
                  </Show>
                  {/* Show box count only for FIXED_BOX mode */}
                  <Show when={form().shipmentItems[0]?.pricingMode === 'FIXED_BOX'}>
                    <div class="text-sm">
                      Total Cajas: <span class="font-bold text-purple-600">{totalBoxes()} {totalBoxes() === 1 ? 'caja' : 'cajas'}</span>
                    </div>
                  </Show>
                  <div class="text-sm">Subtotal Envío: ${shipmentSubtotal().toFixed(2)}</div>
                  <div class="text-sm text-orange-600">Total Arancel: ${shipmentTariffTotal().toFixed(2)}</div>
                  <div class="font-medium">Total Envío: ${shipmentTotal().toFixed(2)}</div>
                </div>
              </div>
            </Show>
          </div>

          {/* Total Section */}
          <div class="bg-green-50 p-4 rounded-lg border-2 border-green-200">
            <Show when={selectedCountryTariff()}>
              {(tariff) => (
                <div class="mb-3 text-center">
                  <span class="text-2xl">{tariff().flagEmoji}</span>
                  <span class="ml-2 font-semibold">{tariff().label}</span>
                  <span class="ml-2 text-sm text-gray-600">
                    (Tariff: {(tariff().tariffRate * 100).toFixed(0)}%)
                  </span>
                </div>
              )}
            </Show>

            <div class="text-right">
              <Show when={productSubtotal() > 0}>
                <div class="text-sm text-gray-600">Products: ${productSubtotal().toFixed(2)}</div>
              </Show>
              <Show when={shipmentSubtotal() > 0}>
                <div class="text-sm text-gray-600">Shipment: ${shipmentSubtotal().toFixed(2)}</div>
                <div class="text-sm text-orange-600">Tariffs: ${shipmentTariffTotal().toFixed(2)}</div>
              </Show>
              <Show when={form().bulks.length > 0}>
                <div class="text-sm text-gray-600">Bulk Transport: ${bulkTransportTotal().toFixed(2)}</div>
              </Show>
              <div class="text-xl font-bold text-green-600 mt-2 pt-2 border-t-2 border-green-300">
                Grand Total: ${grandTotal().toFixed(2)}
              </div>
            </div>
          </div>

          {/* Form Status */}
          <Show when={internationalShippingFormStore.isDirty || internationalShippingFormStore.lastSaved}>
            <div class="bg-green-50 border border-green-200 rounded-lg p-3">
              <div class="flex items-center justify-between text-sm">
                <Show when={internationalShippingFormStore.isDirty}>
                  <span class="text-green-600 flex items-center">
                    <span class="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                    Auto-saving changes...
                  </span>
                </Show>
                <Show when={!internationalShippingFormStore.isDirty && internationalShippingFormStore.lastSaved}>
                  <span class="text-green-600 flex items-center">
                    <span class="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    Last saved: {internationalShippingFormStore.lastSaved?.toLocaleTimeString()}
                  </span>
                </Show>
              </div>
            </div>
          </Show>

          {/* Action Buttons */}
          <div class="space-y-3">
            <Show when={!createdShipping()}>
              <div class="grid grid-cols-2 gap-3">
                <button
                  onClick={saveShipping}
                  disabled={isSaving() || !internationalShippingFormStore.isValid()}
                  class="py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium"
                >
                  {isSaving() ? 'Saving...' : 'Create Document'}
                </button>
                <button
                  onClick={confirmReset}
                  class="py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors font-medium"
                >
                  Clear Form
                </button>
              </div>
            </Show>

            <Show when={createdShipping()}>
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
                  New Document
                </button>
              </div>
            </Show>
          </div>
        </div>
      </div>
    </div>
  );
};
