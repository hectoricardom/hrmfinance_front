import { Component, createSignal, createEffect, createMemo, Show, For } from 'solid-js';
import { internationalShippingFormStore } from '../stores/internationalShippingFormStore';
import { generateRandomId, generateShortCode } from '../../../services/utils';
import { calculateCubicFeet, getTariffRate } from '../types/internationalShippingTypes';
import Icon from '../../../components/Icon';
import { logger } from '../../../utils/logger';

// Import reusable components from invoice module
import CustomerInfo from '../../invoice/components/CustomerInfo';
import PaymentSection from '../../invoice/components/PaymentSection';
import SearchableLocationDropdown from '../../inventory/components/SearchableLocationDropdown';

// Import types
import {
  InternationalShipmentItem,
  InternationalProduct,
  ShippingBulk,
  PaymentMethod,
  DestinationCountry,
  CountryTariff,
  PricingMode,
  StandardBoxSize,
  STANDARD_BOX_SIZES,
  BoxPricing,
  getPricingModeForCountry,
  getCountryTariff,
  getBoxPricesForCountry,
  createDefaultShipmentItem
} from '../types/internationalShippingTypes';
import { invoiceStore } from '../../invoice';
import { inventoryApi } from '../../../services/apiAdapter';

const InternationalShippingFormStyled: Component = () => {
  // Local state
  const [loading, setLoading] = createSignal(false);
  const [submitError, setSubmitError] = createSignal('');
  const [submitSuccess, setSubmitSuccess] = createSignal(false);

  // State for adding new dimensional item
  const [newItemDescription, setNewItemDescription] = createSignal('');
  const [newItemQty, setNewItemQty] = createSignal(1);
  const [newItemHeight, setNewItemHeight] = createSignal(0);
  const [newItemWidth, setNewItemWidth] = createSignal(0);
  const [newItemDepth, setNewItemDepth] = createSignal(0);

  // State for weight-based pricing (Venezuela)
  const [newItemWeight, setNewItemWeight] = createSignal(0);

  // State for box-based pricing (Mexico)
  const [newItemBoxSize, setNewItemBoxSize] = createSignal<StandardBoxSize>('18X18X18');

  // Get reactive form data
  const formData = internationalShippingFormStore.formData;

  // Get current pricing mode based on selected country
  const currentPricingMode = createMemo((): PricingMode => {
    const country = formData().destinationCountry as DestinationCountry;
    if (!country) return 'CUBIC_FEET';
    return getPricingModeForCountry(country, formData().pricingConfig);
  });

  // Get price per pound for weight-based countries
  const pricePerLb = createMemo((): number => {
    const country = formData().destinationCountry as DestinationCountry;
    if (!country) return 0;
    const tariff = getCountryTariff(country, formData().pricingConfig);
    return tariff?.priceLbs || 0;
  });

  // Get box pricing options for box-based countries
  const boxPricing = createMemo((): BoxPricing | null => {
    const country = formData().destinationCountry as DestinationCountry;
    if (!country) return null;
    return getBoxPricesForCountry(country, formData().pricingConfig);
  });

  // Get price for a specific box size
  const getBoxPrice = (boxSize: StandardBoxSize): number => {
    const pricing = boxPricing();
    if (!pricing) return 0;
    return pricing[boxSize]?.price || 0;
  };

  // Auto-generate invoice number on mount
  createEffect(() => {
    if (!formData().invoice) {
      const newInvoiceNumber = `ENV-${generateShortCode(7)}-${generateShortCode(8)}`;
      internationalShippingFormStore.updateForm({ invoice: newInvoiceNumber });
    }
  });

  // Calculate totals for shipment items (supports all three pricing modes)
  const calculateShipmentItemTotals = (item: InternationalShipmentItem) => {
    const country = formData().destinationCountry as DestinationCountry;
    const tariffRate = country ? getTariffRate(country) : 0;
    const pricingMode = item.pricingMode || currentPricingMode();

    let subtotal = 0;
    let cubicFeet = 0;
    let totalCubicFeet = 0;
    let totalWeightLbs = 0;

    switch (pricingMode) {
      case 'WEIGHT_LBS': {
        // Weight-based pricing
        const weight = item.weightLbs || 0;
        totalWeightLbs = weight * item.qty;
        const pricePerLbValue = item.pricePerLb || pricePerLb();
        subtotal = totalWeightLbs * pricePerLbValue;
        break;
      }

      case 'FIXED_BOX': {
        // Box-based pricing
        const boxPriceValue = item.boxPrice || 0;
        subtotal = boxPriceValue * item.qty;
        break;
      }

      case 'CUBIC_FEET':
      default: {
        // Cubic feet pricing
        cubicFeet = calculateCubicFeet(
          item.dimensions.height,
          item.dimensions.width,
          item.dimensions.depth
        );
        totalCubicFeet = cubicFeet * item.qty;
        subtotal = totalCubicFeet * item.pricePerCubicFoot;
        break;
      }
    }

    const total = subtotal + tariffRate;

    return {
      cubicFeet,
      totalCubicFeet,
      totalWeightLbs,
      subtotal,
      tariff: tariffRate,
      total
    };
  };

  // Auto-calculate shipment items totals (supports all pricing modes)
  createEffect(() => {
    const data = formData();

    data.shipmentItems.forEach((item, index) => {
      const calculated = calculateShipmentItemTotals(item);
      const pricingMode = item.pricingMode || currentPricingMode();

      // Check if any values changed based on pricing mode
      let needsUpdate = false;

      if (pricingMode === 'CUBIC_FEET') {
        needsUpdate =
          Math.abs(item.dimensions.cubicFeet - calculated.cubicFeet) > 0.001 ||
          Math.abs(item.totalCubicFeet - calculated.totalCubicFeet) > 0.001;
      } else if (pricingMode === 'WEIGHT_LBS') {
        needsUpdate = Math.abs((item.totalWeightLbs || 0) - calculated.totalWeightLbs) > 0.001;
      }

      // Always check subtotal, tariff, and total
      needsUpdate = needsUpdate ||
        Math.abs(item.subtotal - calculated.subtotal) > 0.01 ||
        Math.abs(item.tariff - calculated.tariff) > 0.01 ||
        Math.abs(item.total - calculated.total) > 0.01;

      if (needsUpdate) {
        const updates: Partial<InternationalShipmentItem> = {
          subtotal: calculated.subtotal,
          tariff: calculated.tariff,
          total: calculated.total
        };

        if (pricingMode === 'CUBIC_FEET') {
          updates.dimensions = { ...item.dimensions, cubicFeet: calculated.cubicFeet };
          updates.totalCubicFeet = calculated.totalCubicFeet;
        } else if (pricingMode === 'WEIGHT_LBS') {
          updates.totalWeightLbs = calculated.totalWeightLbs;
        }

        internationalShippingFormStore.updateShipmentItem(index, updates);
      }
    });
  });

  // Calculate shipping totals (supports all pricing modes)
  const shippingTotals = createMemo(() => {
    const data = formData();

    // Calculate products total (optional products from inventory)
    const productsTotal = data.products.reduce((sum, p) => sum + p.total, 0);

    // Calculate shipment items total
    const shipmentItemsSubtotal = data.shipmentItems.reduce((sum, item) => sum + item.subtotal, 0);
    const shipmentItemsTariffs = data.shipmentItems.reduce((sum, item) => sum + item.tariff, 0);
    const shipmentItemsTotal = data.shipmentItems.reduce((sum, item) => sum + item.total, 0);

    // Calculate mode-specific totals
    const totalCubicFeet = data.shipmentItems
      .filter(item => item.pricingMode === 'CUBIC_FEET')
      .reduce((sum, item) => sum + item.totalCubicFeet, 0);

    const totalWeightLbs = data.shipmentItems
      .filter(item => item.pricingMode === 'WEIGHT_LBS')
      .reduce((sum, item) => sum + (item.totalWeightLbs || 0), 0);

    const totalBoxes = data.shipmentItems
      .filter(item => item.pricingMode === 'FIXED_BOX')
      .reduce((sum, item) => sum + item.qty, 0);

    // Calculate transport costs from bulks
    const transportTotal = data.bulks.reduce((sum, b) => sum + (b?.transportCost || 0), 0);

    // Items total (before discount)
    const itemsTotal = productsTotal + shipmentItemsTotal + transportTotal;

    // Get discount
    const discount = data.paymentMethods.discount || 0;

    // Apply discount
    const itemsTotalAfterDiscount = Math.max(0, itemsTotal - discount);

    // Grand total
    const grandTotal = itemsTotalAfterDiscount;

    return {
      productsTotal,
      shipmentItemsSubtotal,
      shipmentItemsTariffs,
      shipmentItemsTotal,
      totalCubicFeet,
      totalWeightLbs,
      totalBoxes,
      transportTotal,
      itemsTotal,
      discount,
      itemsTotalAfterDiscount,
      grandTotal
    };
  });

  // Get selected country info
  const selectedCountryInfo = createMemo((): CountryTariff | null => {
    const country = formData().destinationCountry as DestinationCountry;
    if (!country) return null;
    return formData().pricingConfig.countryTariffs.find(t => t.country === country) || null;
  });

  // Handle adding a new dimensional item (supports all three pricing modes)
  const handleAddDimensionalItem = () => {
    const description = newItemDescription().trim();
    if (!description) {
      alert('Por favor ingrese una descripción para el item');
      return;
    }

    const qty = newItemQty();
    if (qty <= 0) {
      alert('Por favor ingrese una cantidad válida (mayor a 0)');
      return;
    }

    const country = formData().destinationCountry as DestinationCountry;
    const pricingMode = currentPricingMode();
    const tariffRate = country ? getTariffRate(country) : 0;

    let newItem: InternationalShipmentItem;

    switch (pricingMode) {
      case 'WEIGHT_LBS': {
        // Weight-based pricing (Venezuela)
        const weight = newItemWeight();
        if (weight <= 0) {
          alert('Por favor ingrese un peso válido (mayor a 0)');
          return;
        }
        const totalWeight = weight * qty;
        const pricePerLbValue = pricePerLb();
        const subtotal = totalWeight * pricePerLbValue;
        const total = subtotal + tariffRate;

        newItem = {
          id: generateRandomId(),
          description,
          qty,
          dimensions: { height: 0, width: 0, depth: 0, cubicFeet: 0 },
          pricingMode: 'WEIGHT_LBS',
          pricePerCubicFoot: 0,
          pricePerLb: pricePerLbValue,
          weightLbs: weight,
          totalWeightLbs: totalWeight,
          totalCubicFeet: 0,
          subtotal,
          tariff: tariffRate,
          total
        };
        break;
      }

      case 'FIXED_BOX': {
        // Box-based pricing (Mexico)
        const boxSize = newItemBoxSize();
        const boxPrice = getBoxPrice(boxSize);
        const subtotal = boxPrice * qty;
        const total = subtotal + tariffRate;

        newItem = {
          id: generateRandomId(),
          description,
          qty,
          dimensions: { height: 0, width: 0, depth: 0, cubicFeet: 0 },
          pricingMode: 'FIXED_BOX',
          pricePerCubicFoot: 0,
          selectedBoxSize: boxSize,
          boxPrice,
          totalCubicFeet: 0,
          subtotal,
          tariff: tariffRate,
          total
        };
        break;
      }

      case 'CUBIC_FEET':
      default: {
        // Cubic feet pricing (Honduras, Guatemala, El Salvador, Nicaragua)
        const height = newItemHeight();
        const width = newItemWidth();
        const depth = newItemDepth();

        if (height <= 0 || width <= 0 || depth <= 0) {
          alert('Por favor ingrese dimensiones válidas (mayores a 0)');
          return;
        }

        const cubicFeet = calculateCubicFeet(height, width, depth);
        const totalCubicFeet = cubicFeet * qty;
        const pricePerCubicFoot = formData().pricingConfig.defaultPricePerCubicFoot;
        const subtotal = totalCubicFeet * pricePerCubicFoot;
        const total = subtotal + tariffRate;

        newItem = {
          id: generateRandomId(),
          description,
          qty,
          dimensions: { height, width, depth, cubicFeet },
          pricingMode: 'CUBIC_FEET',
          pricePerCubicFoot,
          totalCubicFeet,
          subtotal,
          tariff: tariffRate,
          total
        };
        break;
      }
    }

    internationalShippingFormStore.addShipmentItem(newItem);

    // Reset form
    setNewItemDescription('');
    setNewItemQty(1);
    setNewItemHeight(0);
    setNewItemWidth(0);
    setNewItemDepth(0);
    setNewItemWeight(0);
    setNewItemBoxSize('18X18X18');
  };

  // Handle removing a dimensional item
  const handleRemoveDimensionalItem = (index: number) => {
    const item = formData().shipmentItems[index];
    if (confirm(`¿Está seguro que desea eliminar "${item.description}"?`)) {
      internationalShippingFormStore.removeShipmentItem(index);
    }
  };

  // Handle updating dimensional item
  const handleUpdateDimensionalItem = (index: number, updates: Partial<InternationalShipmentItem>) => {
    internationalShippingFormStore.updateShipmentItem(index, updates);
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!internationalShippingFormStore.isValid()) {
      setSubmitError('Por favor complete todos los campos requeridos');
      return;
    }

    setLoading(true);
    setSubmitError('');
    setSubmitSuccess(false);

    try {
      const totals = shippingTotals();

      // Validate required fields
      if (!formData().invoice.trim()) {
        throw new Error('Numero de documento es requerido');
      }
      if (!formData().destinationCountry) {
        throw new Error('País de destino es requerido');
      }
      if (!formData().shipper_consignee.name.trim()) {
        throw new Error('Nombre del cliente es requerido');
      }
      if (formData().shipmentItems.length === 0 && formData().products.length === 0) {
        throw new Error('Al menos un item dimensional o producto es requerido');
      }

      // Create shipping document data
      const shippingData = {
        ...formData(),
        type: 'INTERNATIONAL_SHIPPING',
        createDate: formData().createDate || Date.now(),
        businessId: 'YB100423253156428',
        isCompleted: true,
        productsTotal: totals.productsTotal,
        shipmentItemsSubtotal: totals.shipmentItemsSubtotal,
        shipmentItemsTariffs: totals.shipmentItemsTariffs,
        shipmentItemsTotal: totals.shipmentItemsTotal,
        transportTotal: totals.transportTotal,
        subtotal: totals.itemsTotal,
        total: totals.grandTotal,
        country: formData().destinationCountry,
        tariffRate: selectedCountryInfo()?.tariffRate || 0,
      };

       const result2 = await inventoryApi.addInvoice(shippingData);
      //setCreatedInvoice(result.invoice);
      //setSuccess('✅ Invoice created successfully! You can now generate a PDF.');
      

      // logger.group('📦 Creating International Shipping Document');
      // logger.table([
      //   { Field: 'Document #', Value: shippingData.invoice },
      //   { Field: 'Country', Value: shippingData.country },
      //   { Field: 'Items', Value: shippingData.shipmentItems.length },
      //   { Field: 'Total', Value: `$${shippingData.total.toFixed(2)}` }
      // ]);
      logger.log('Creating international shipping document:', shippingData);

      // TODO: Call API to save shipping document
      // const result = await shippingApi.createShipping(shippingData);

      // Clear form and show success
      internationalShippingFormStore.clearForm();
      setSubmitSuccess(true);
      logger.log('Shipping document created successfully!');
      // logger.groupEnd();

      // TODO: Optionally generate PDF
      // await generateShippingPDF(result.id);

    } catch (error) {
      console.error('Error submitting shipping document:', error);
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'Error al guardar el documento de envío. Por favor intente nuevamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle form clearing
  const handleClearForm = () => {
    if (internationalShippingFormStore.hasData()) {
      const confirmed = confirm('¿Está seguro que desea limpiar el formulario? Se perderán todos los datos no guardados.');
      if (confirmed) {
        internationalShippingFormStore.clearForm();
        setSubmitError('');
        setSubmitSuccess(false);
      }
    }
  };

  // Handlers for customer info
  const handleShipperConsigneeChange = (updates: any) => {
    internationalShippingFormStore.updateShipperConsignee(updates);
  };

  // Handlers for payment
  const handlePaymentMethodsChange = (updates: Partial<PaymentMethod>) => {
    internationalShippingFormStore.updateForm({
      paymentMethods: { ...formData().paymentMethods, ...updates }
    });
  };

  // Styles
  const containerStyle = {
    'max-width': '1200px',
    margin: '0 auto',
    padding: '2rem',
    'font-family': 'system-ui, sans-serif'
  };

  const headerStyle = {
    'text-align': 'center' as const,
    'margin-bottom': '2rem',
    padding: '1rem',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    'border-radius': 'var(--border-radius)',
    position: 'relative' as const
  };

  const titleStyle = {
    'font-size': '2rem',
    'font-weight': 'bold',
    'margin-bottom': '0.5rem'
  };

  const subtitleStyle = {
    'font-size': '1rem',
    opacity: '0.9',
    color: 'white',
  };

  const sectionStyle = {
    background: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius)',
    padding: '1.5rem',
    'margin-bottom': '1.5rem'
  };

  const sectionHeaderStyle = {
    'font-size': '1.25rem',
    'font-weight': 'bold',
    color: 'var(--text-primary)',
    'margin-bottom': '1rem',
    'padding-bottom': '0.5rem',
    'border-bottom': '2px solid var(--primary-color)',
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem'
  };

  const gridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem'
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '1rem',
    background: 'var(--surface-color)'
  };

  const labelStyle = {
    display: 'block',
    'font-size': '0.875rem',
    'font-weight': '500',
    color: 'var(--text-secondary)',
    'margin-bottom': '0.25rem'
  };

  const totalsStyle = {
    background: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius)',
    padding: '1.5rem',
    'margin-bottom': '2rem',
    'text-align': 'center' as const
  };

  const totalRowStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '0.5rem',
    'font-size': '1rem'
  };

  const grandTotalStyle = {
    ...totalRowStyle,
    'font-size': '1.25rem',
    'font-weight': 'bold',
    'padding-top': '0.5rem',
    'border-top': '2px solid var(--primary-color)',
    color: 'var(--primary-color)'
  };

  const actionsStyle = {
    display: 'flex',
    gap: '1rem',
    'justify-content': 'center',
    'margin-top': '2rem',
    'flex-wrap': 'wrap' as const
  };

  const buttonStyle = {
    padding: '0.75rem 1.5rem',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '1rem',
    'font-weight': '500',
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.2s ease',
    'min-width': '120px'
  };

  const primaryButtonStyle = {
    ...buttonStyle,
    background: 'var(--primary-color)',
    color: 'white'
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    background: 'var(--border-color)',
    color: 'var(--text-primary)'
  };

  const errorStyle = {
    background: 'var(--error-background)',
    color: 'var(--error-color)',
    padding: '1rem',
    'border-radius': 'var(--border-radius-sm)',
    'margin-bottom': '1rem',
    border: '1px solid var(--error-color)'
  };

  const successStyle = {
    background: 'var(--success-background)',
    color: 'var(--success-color)',
    padding: '1rem',
    'border-radius': 'var(--border-radius-sm)',
    'margin-bottom': '1rem',
    border: '1px solid var(--success-color)',
    'text-align': 'center' as const
  };

  const tableStyle = {
    width: '100%',
    'border-collapse': 'collapse' as const,
    'margin-top': '1rem'
  };

  const thStyle = {
    'text-align': 'left' as const,
    padding: '0.75rem',
    background: 'var(--primary-color)',
    color: 'white',
    'font-weight': '600',
    'font-size': '0.875rem',
    'border-bottom': '2px solid var(--primary-color)'
  };

  const tdStyle = {
    padding: '0.75rem',
    'border-bottom': '1px solid var(--border-color)',
    'font-size': '0.875rem'
  };

  const smallInputStyle = {
    ...inputStyle,
    padding: '0.4rem',
    'font-size': '0.875rem'
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h1 style={titleStyle}>
          <Icon name="shipping" size="1.2em" style={{ "margin-right": "0.5rem" }} />
          Envío Internacional
        </h1>
        <p style={subtitleStyle}>
          Sistema de envíos internacionales con cálculo de pies cúbicos y aranceles
        </p>
      </div>

      {/* Success Message */}
      <Show when={submitSuccess()}>
        <div style={successStyle}>
          <h3 style={{ margin: '0 0 0.5rem 0' }}>
            <Icon name="success" size="1.2em" style={{ "margin-right": "0.5rem" }} />
            Documento de Envío Creado Exitosamente
          </h3>
          <p style={{ margin: '0' }}>
            El documento de envío ha sido guardado correctamente en el sistema.
          </p>
        </div>
      </Show>

      {/* Error Message */}
      <Show when={submitError()}>
        <div style={errorStyle}>
          <strong><Icon name="error" size="1em" style={{ "margin-right": "0.3rem" }} />Error:</strong> {submitError()}
        </div>
      </Show>

      {/* Basic Information Section */}
      <div style={sectionStyle}>
        <h3 style={sectionHeaderStyle}>
          <span>📋</span>
          <span>Información Básica</span>
        </h3>

        

      {/* Country Selection Section */}
      <div style={sectionStyle}>
        <h3 style={sectionHeaderStyle}>
          <span>🌎</span>
          <span>País de Destino</span>
        </h3>

        <div style={{ 'margin-bottom': '1rem' }}>
          <label style={labelStyle}>Seleccione el País de Destino *</label>
          <select
            style={inputStyle}
            value={formData().destinationCountry}
            onChange={(e) => internationalShippingFormStore.updateForm({
              destinationCountry: (e.target as HTMLSelectElement).value as DestinationCountry | ''
            })}
          >
            <option value="">-- Seleccione un país --</option>
            <For each={formData().pricingConfig.countryTariffs}>
              {(country) => (
                <option value={country.country}>
                  {country.flagEmoji} {country.label} (Arancel: ${country.tariffRate.toFixed(2)})
                </option>
              )}
            </For>
          </select>
        </div>

        <Show when={selectedCountryInfo()}>
          <div style={{
            padding: '1rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            'border-radius': 'var(--border-radius-sm)',
            display: 'flex',
            'justify-content': 'space-between',
            'align-items': 'center'
          }}>
            <div>
              <div style={{ 'font-size': '1.5rem', 'margin-bottom': '0.25rem' }}>
                {selectedCountryInfo()!.flagEmoji} {selectedCountryInfo()!.label}
              </div>
              <div style={{ 'font-size': '0.875rem', opacity: '0.9' }}>
                País de destino seleccionado
              </div>
            </div>
            <div style={{ 'text-align': 'right' as const }}>
              <div style={{ 'font-size': '1.5rem', 'font-weight': 'bold' }}>
                ${selectedCountryInfo()!.tariffRate.toFixed(2)}
              </div>
              <div style={{ 'font-size': '0.875rem', opacity: '0.9' }}>
                Arancel por Item
              </div>
            </div>
          </div>
        </Show>
        <div style={{padding: '1rem'}}>
          <div style={gridStyle}>
            <div>
              <label style={labelStyle}>Número de Documento *</label>
              <input
                type="text"
                style={inputStyle}
                value={formData().invoice}
                onInput={(e) => internationalShippingFormStore.updateForm({
                  invoice: (e.target as HTMLInputElement).value
                })}
                placeholder="Ej: ENV-2024-001"
              />
            </div>

            <div>
              <label style={labelStyle}>Tienda/Sucursal</label>
              <SearchableLocationDropdown
                value={formData().store}
                onChange={(store) => internationalShippingFormStore.updateForm({ store })}
                placeholder="Seleccionar tienda..."
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={labelStyle}>Guía de Envío</label>
              <input
                type="text"
                style={inputStyle}
                value={formData().guide || ''}
                onInput={(e) => internationalShippingFormStore.updateForm({
                  guide: (e.target as HTMLInputElement).value
                })}
                placeholder="Número de guía"
              />
            </div>
          </div>
        </div>       
        <div style={{ ...gridStyle, 'margin-top': '1rem' }}>
          <div>
            <label style={labelStyle}>Descripción</label>
            <input
              type="text"
              style={inputStyle}
              value={formData().description}
              onInput={(e) => internationalShippingFormStore.updateForm({
                description: (e.target as HTMLInputElement).value
              })}
              placeholder="Descripción del envío"
            />
          </div>
        </div>
      </div>
      </div>

      {/* Pricing Configuration Section 
      <div style={sectionStyle}>
        <h3 style={sectionHeaderStyle}>
          <span>💰</span>
          <span>Configuración de Precios</span>
        </h3>

        <div style={{ 'max-width': '400px' }}>
          <label style={labelStyle}>Precio por Pie Cúbico (USD)</label>
          <input
            type="number"
            style={inputStyle}
            value={formData().pricingConfig.defaultPricePerCubicFoot}
            min="0"
            step="0.01"
            onInput={(e) => internationalShippingFormStore.updatePricingConfig({
              defaultPricePerCubicFoot: parseFloat((e.target as HTMLInputElement).value) || 0
            })}
          />
          <div style={{
            'font-size': '0.75rem',
            color: 'var(--text-muted)',
            'margin-top': '0.25rem',
            'font-style': 'italic'
          }}>
            Este precio se aplicará a todos los items dimensionales
          </div>
        </div>
      </div>
      */}

      
      {/* Customer Information */}
      <CustomerInfo
        customer={null}
        shipperConsignee={formData().shipper_consignee}
        onShipperConsigneeChange={handleShipperConsigneeChange}
      />

      {/* Dimensional Items Section */}
      <div style={sectionStyle}>
        <h3 style={sectionHeaderStyle}>
          <span>📦</span>
          <span>Items de Envío</span>
        </h3>

        {/* Pricing Mode Indicator */}
        <Show when={formData().destinationCountry}>
          <div style={{
            'margin-bottom': '1rem',
            padding: '0.75rem 1rem',
            'border-radius': 'var(--border-radius-sm)',
            background: currentPricingMode() === 'FIXED_BOX'
              ? 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)'
              : currentPricingMode() === 'WEIGHT_LBS'
              ? 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)'
              : 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
            color: 'white',
            display: 'flex',
            'align-items': 'center',
            gap: '0.75rem',
            'font-size': '0.9rem'
          }}>
            <span style={{ 'font-size': '1.25rem' }}>
              {currentPricingMode() === 'FIXED_BOX' ? '📦' : currentPricingMode() === 'WEIGHT_LBS' ? '⚖️' : '📏'}
            </span>
            <div>
              <strong>Modo de Precio: </strong>
              {currentPricingMode() === 'FIXED_BOX'
                ? 'Precio por Caja Fija'
                : currentPricingMode() === 'WEIGHT_LBS'
                ? `Precio por Libra ($${pricePerLb().toFixed(2)}/lb)`
                : `Precio por Pie Cúbico ($${formData().pricingConfig.defaultPricePerCubicFoot.toFixed(2)}/ft³)`}
            </div>
          </div>
        </Show>

        {/* Add New Item Form - CUBIC FEET mode */}
        <Show when={currentPricingMode() === 'CUBIC_FEET'}>
          <div style={{
            background: 'rgba(37, 99, 235, 0.05)',
            padding: '1rem',
            'border-radius': 'var(--border-radius-sm)',
            border: '2px solid rgba(37, 99, 235, 0.2)',
            'margin-bottom': '1rem'
          }}>
            <h4 style={{
              margin: '0 0 1rem 0',
              'font-size': '1rem',
              color: '#2563eb',
              display: 'flex',
              'align-items': 'center',
              gap: '0.5rem'
            }}>
              <span>📏</span> Agregar Item por Dimensiones (Pies Cúbicos)
            </h4>

            <div style={gridStyle}>
              <div style={{ 'grid-column': '1 / -1' }}>
                <label style={labelStyle}>Descripción *</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={newItemDescription()}
                  onInput={(e) => setNewItemDescription((e.target as HTMLInputElement).value)}
                  placeholder="Descripción del item"
                />
              </div>

              <div>
                <label style={labelStyle}>Cantidad *</label>
                <input
                  type="number"
                  style={inputStyle}
                  value={newItemQty()}
                  min="1"
                  step="1"
                  onInput={(e) => setNewItemQty(parseInt((e.target as HTMLInputElement).value) || 1)}
                />
              </div>

              <div>
                <label style={labelStyle}>Alto (pulgadas) *</label>
                <input
                  type="number"
                  style={inputStyle}
                  value={newItemHeight()}
                  min="0"
                  step="0.01"
                  onInput={(e) => setNewItemHeight(parseFloat((e.target as HTMLInputElement).value) || 0)}
                />
              </div>

              <div>
                <label style={labelStyle}>Ancho (pulgadas) *</label>
                <input
                  type="number"
                  style={inputStyle}
                  value={newItemWidth()}
                  min="0"
                  step="0.01"
                  onInput={(e) => setNewItemWidth(parseFloat((e.target as HTMLInputElement).value) || 0)}
                />
              </div>

              <div>
                <label style={labelStyle}>Profundidad (pulgadas) *</label>
                <input
                  type="number"
                  style={inputStyle}
                  value={newItemDepth()}
                  min="0"
                  step="0.01"
                  onInput={(e) => setNewItemDepth(parseFloat((e.target as HTMLInputElement).value) || 0)}
                />
              </div>
            </div>

            <Show when={newItemHeight() > 0 && newItemWidth() > 0 && newItemDepth() > 0}>
              <div style={{
                'margin-top': '0.75rem',
                padding: '0.75rem',
                background: '#2563eb',
                color: 'white',
                'border-radius': 'var(--border-radius-sm)',
                'font-size': '0.875rem'
              }}>
                <strong>Pies cúbicos por unidad:</strong> {calculateCubicFeet(newItemHeight(), newItemWidth(), newItemDepth()).toFixed(4)} ft³
                <br />
                <strong>Total pies cúbicos:</strong> {(calculateCubicFeet(newItemHeight(), newItemWidth(), newItemDepth()) * newItemQty()).toFixed(4)} ft³
                <br />
                <strong>Subtotal estimado:</strong> ${(calculateCubicFeet(newItemHeight(), newItemWidth(), newItemDepth()) * newItemQty() * formData().pricingConfig.defaultPricePerCubicFoot).toFixed(2)}
              </div>
            </Show>

            <button
              type="button"
              style={{ ...primaryButtonStyle, 'margin-top': '1rem', background: '#2563eb' }}
              onClick={handleAddDimensionalItem}
            >
              <Icon name="add" size="1em" style={{ "margin-right": "0.5rem" }} />
              Agregar Item
            </button>
          </div>
        </Show>

        {/* Add New Item Form - WEIGHT mode */}
        <Show when={currentPricingMode() === 'WEIGHT_LBS'}>
          <div style={{
            background: 'rgba(234, 88, 12, 0.05)',
            padding: '1rem',
            'border-radius': 'var(--border-radius-sm)',
            border: '2px solid rgba(234, 88, 12, 0.2)',
            'margin-bottom': '1rem'
          }}>
            <h4 style={{
              margin: '0 0 1rem 0',
              'font-size': '1rem',
              color: '#ea580c',
              display: 'flex',
              'align-items': 'center',
              gap: '0.5rem'
            }}>
              <span>⚖️</span> Agregar Item por Peso (Libras)
            </h4>

            <div style={gridStyle}>
              <div style={{ 'grid-column': '1 / -1' }}>
                <label style={labelStyle}>Descripción *</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={newItemDescription()}
                  onInput={(e) => setNewItemDescription((e.target as HTMLInputElement).value)}
                  placeholder="Descripción del item"
                />
              </div>

              <div>
                <label style={labelStyle}>Cantidad *</label>
                <input
                  type="number"
                  style={inputStyle}
                  value={newItemQty()}
                  min="1"
                  step="1"
                  onInput={(e) => setNewItemQty(parseInt((e.target as HTMLInputElement).value) || 1)}
                />
              </div>

              <div>
                <label style={labelStyle}>Peso por unidad (lbs) *</label>
                <input
                  type="number"
                  style={inputStyle}
                  value={newItemWeight()}
                  min="0"
                  step="0.1"
                  onInput={(e) => setNewItemWeight(parseFloat((e.target as HTMLInputElement).value) || 0)}
                />
              </div>

              <div>
                <label style={labelStyle}>Precio por libra</label>
                <input
                  type="text"
                  style={{ ...inputStyle, background: 'var(--bg-secondary)' }}
                  value={`$${pricePerLb().toFixed(2)}/lb`}
                  disabled
                />
              </div>
            </div>

            <Show when={newItemWeight() > 0}>
              <div style={{
                'margin-top': '0.75rem',
                padding: '0.75rem',
                background: '#ea580c',
                color: 'white',
                'border-radius': 'var(--border-radius-sm)',
                'font-size': '0.875rem'
              }}>
                <strong>Peso por unidad:</strong> {newItemWeight().toFixed(2)} lbs
                <br />
                <strong>Peso total:</strong> {(newItemWeight() * newItemQty()).toFixed(2)} lbs
                <br />
                <strong>Subtotal estimado:</strong> ${(newItemWeight() * newItemQty() * pricePerLb()).toFixed(2)}
              </div>
            </Show>

            <button
              type="button"
              style={{ ...primaryButtonStyle, 'margin-top': '1rem', background: '#ea580c' }}
              onClick={handleAddDimensionalItem}
            >
              <Icon name="add" size="1em" style={{ "margin-right": "0.5rem" }} />
              Agregar Item
            </button>
          </div>
        </Show>

        {/* Add New Item Form - FIXED BOX mode */}
        <Show when={currentPricingMode() === 'FIXED_BOX'}>
          <div style={{
            background: 'rgba(147, 51, 234, 0.05)',
            padding: '1rem',
            'border-radius': 'var(--border-radius-sm)',
            border: '2px solid rgba(147, 51, 234, 0.2)',
            'margin-bottom': '1rem'
          }}>
            <h4 style={{
              margin: '0 0 1rem 0',
              'font-size': '1rem',
              color: '#9333ea',
              display: 'flex',
              'align-items': 'center',
              gap: '0.5rem'
            }}>
              <span>📦</span> Agregar Item por Caja
            </h4>

            <div style={gridStyle}>
              <div style={{ 'grid-column': '1 / -1' }}>
                <label style={labelStyle}>Descripción *</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={newItemDescription()}
                  onInput={(e) => setNewItemDescription((e.target as HTMLInputElement).value)}
                  placeholder="Descripción del item"
                />
              </div>

              <div>
                <label style={labelStyle}>Cantidad de Cajas *</label>
                <input
                  type="number"
                  style={inputStyle}
                  value={newItemQty()}
                  min="1"
                  step="1"
                  onInput={(e) => setNewItemQty(parseInt((e.target as HTMLInputElement).value) || 1)}
                />
              </div>

              <div>
                <label style={labelStyle}>Tamaño de Caja *</label>
                <select
                  style={inputStyle}
                  value={newItemBoxSize()}
                  onChange={(e) => setNewItemBoxSize((e.target as HTMLSelectElement).value as StandardBoxSize)}
                >
                  <For each={[...STANDARD_BOX_SIZES]}>
                    {(size) => (
                      <option value={size}>
                        {size}" - ${getBoxPrice(size).toFixed(2)}
                      </option>
                    )}
                  </For>
                </select>
              </div>
            </div>

            {/* Box Size Visual Cards */}
            <div style={{
              display: 'grid',
              'grid-template-columns': 'repeat(4, 1fr)',
              gap: '0.5rem',
              'margin-top': '1rem'
            }}>
              <For each={[...STANDARD_BOX_SIZES]}>
                {(size) => (
                  <div
                    style={{
                      padding: '0.75rem',
                      'border-radius': 'var(--border-radius-sm)',
                      border: newItemBoxSize() === size ? '2px solid #9333ea' : '1px solid var(--border-color)',
                      background: newItemBoxSize() === size ? 'rgba(147, 51, 234, 0.1)' : 'var(--surface-color)',
                      cursor: 'pointer',
                      'text-align': 'center' as const,
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => setNewItemBoxSize(size)}
                  >
                    <div style={{ 'font-size': '1.5rem', 'margin-bottom': '0.25rem' }}>📦</div>
                    <div style={{ 'font-weight': '600', 'font-size': '0.875rem' }}>{size}</div>
                    <div style={{ color: '#9333ea', 'font-weight': 'bold' }}>${getBoxPrice(size).toFixed(2)}</div>
                  </div>
                )}
              </For>
            </div>

            <Show when={newItemBoxSize()}>
              <div style={{
                'margin-top': '0.75rem',
                padding: '0.75rem',
                background: '#9333ea',
                color: 'white',
                'border-radius': 'var(--border-radius-sm)',
                'font-size': '0.875rem'
              }}>
                <strong>Caja seleccionada:</strong> {newItemBoxSize()}
                <br />
                <strong>Precio por caja:</strong> ${getBoxPrice(newItemBoxSize()).toFixed(2)}
                <br />
                <strong>Subtotal estimado:</strong> ${(getBoxPrice(newItemBoxSize()) * newItemQty()).toFixed(2)}
              </div>
            </Show>

            <button
              type="button"
              style={{ ...primaryButtonStyle, 'margin-top': '1rem', background: '#9333ea' }}
              onClick={handleAddDimensionalItem}
            >
              <Icon name="add" size="1em" style={{ "margin-right": "0.5rem" }} />
              Agregar Item
            </button>
          </div>
        </Show>

        {/* No country selected message */}
        <Show when={!formData().destinationCountry}>
          <div style={{
            background: 'var(--strip-color)',
            padding: '1.5rem',
            'border-radius': 'var(--border-radius-sm)',
            border: '1px dashed var(--border-color)',
            'margin-bottom': '1rem',
            'text-align': 'center' as const,
            color: 'var(--text-muted)'
          }}>
            <Icon name="info" size="2em" style={{ opacity: '0.5', 'margin-bottom': '0.5rem' }} />
            <div>Seleccione un país de destino para agregar items</div>
            <div style={{ 'font-size': '0.875rem', 'margin-top': '0.25rem' }}>
              El tipo de formulario depende del país seleccionado
            </div>
          </div>
        </Show>

        {/* Items List - CUBIC FEET mode table */}
        <Show when={formData().shipmentItems.length > 0 && currentPricingMode() === 'CUBIC_FEET'}>
          <div style={{ 'overflow-x': 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, background: '#2563eb' }}>Descripción</th>
                  <th style={{ ...thStyle, 'text-align': 'center' as const, background: '#2563eb' }}>Cant.</th>
                  <th style={{ ...thStyle, 'text-align': 'center' as const, background: '#2563eb' }}>Dimensiones (H×W×D)</th>
                  <th style={{ ...thStyle, 'text-align': 'right' as const, background: '#2563eb' }}>ft³/unidad</th>
                  <th style={{ ...thStyle, 'text-align': 'right' as const, background: '#2563eb' }}>ft³ total</th>
                  <th style={{ ...thStyle, 'text-align': 'right' as const, background: '#2563eb' }}>$/ft³</th>
                  <th style={{ ...thStyle, 'text-align': 'right' as const, background: '#2563eb' }}>Subtotal</th>
                  <th style={{ ...thStyle, 'text-align': 'right' as const, background: '#2563eb' }}>Arancel</th>
                  <th style={{ ...thStyle, 'text-align': 'right' as const, background: '#2563eb' }}>Total</th>
                  <th style={{ ...thStyle, 'text-align': 'center' as const, background: '#2563eb' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                <For each={formData().shipmentItems}>
                  {(item, index) => (
                    <tr>
                      <td style={tdStyle}>{item.description}</td>
                      <td style={{ ...tdStyle, 'text-align': 'center' as const }}>{item.qty}</td>
                      <td style={{ ...tdStyle, 'text-align': 'center' as const, 'font-size': '0.75rem' }}>
                        {item.dimensions.height.toFixed(1)}" × {item.dimensions.width.toFixed(1)}" × {item.dimensions.depth.toFixed(1)}"
                      </td>
                      <td style={{ ...tdStyle, 'text-align': 'right' as const }}>
                        {item.dimensions.cubicFeet.toFixed(4)}
                      </td>
                      <td style={{ ...tdStyle, 'text-align': 'right' as const }}>
                        {item.totalCubicFeet.toFixed(4)}
                      </td>
                      <td style={{ ...tdStyle, 'text-align': 'right' as const }}>
                        ${item.pricePerCubicFoot.toFixed(2)}
                      </td>
                      <td style={{ ...tdStyle, 'text-align': 'right' as const }}>
                        ${item.subtotal.toFixed(2)}
                      </td>
                      <td style={{ ...tdStyle, 'text-align': 'right' as const }}>
                        ${item.tariff.toFixed(2)}
                      </td>
                      <td style={{ ...tdStyle, 'text-align': 'right' as const, 'font-weight': '600' }}>
                        ${item.total.toFixed(2)}
                      </td>
                      <td style={{ ...tdStyle, 'text-align': 'center' as const }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveDimensionalItem(index())}
                          style={{
                            background: 'var(--error-color)',
                            color: 'white',
                            border: 'none',
                            padding: '0.25rem 0.5rem',
                            'border-radius': '4px',
                            cursor: 'pointer',
                            'font-size': '0.75rem'
                          }}
                        >
                          <Icon name="delete" size="0.875em" />
                        </button>
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </Show>

        {/* Items List - WEIGHT mode table */}
        <Show when={formData().shipmentItems.length > 0 && currentPricingMode() === 'WEIGHT_LBS'}>
          <div style={{ 'overflow-x': 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, background: '#ea580c' }}>Descripción</th>
                  <th style={{ ...thStyle, 'text-align': 'center' as const, background: '#ea580c' }}>Cant.</th>
                  <th style={{ ...thStyle, 'text-align': 'right' as const, background: '#ea580c' }}>Peso/unidad (lbs)</th>
                  <th style={{ ...thStyle, 'text-align': 'right' as const, background: '#ea580c' }}>Peso Total (lbs)</th>
                  <th style={{ ...thStyle, 'text-align': 'right' as const, background: '#ea580c' }}>$/lb</th>
                  <th style={{ ...thStyle, 'text-align': 'right' as const, background: '#ea580c' }}>Subtotal</th>
                  <th style={{ ...thStyle, 'text-align': 'right' as const, background: '#ea580c' }}>Arancel</th>
                  <th style={{ ...thStyle, 'text-align': 'right' as const, background: '#ea580c' }}>Total</th>
                  <th style={{ ...thStyle, 'text-align': 'center' as const, background: '#ea580c' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                <For each={formData().shipmentItems}>
                  {(item, index) => (
                    <tr>
                      <td style={tdStyle}>{item.description}</td>
                      <td style={{ ...tdStyle, 'text-align': 'center' as const }}>{item.qty}</td>
                      <td style={{ ...tdStyle, 'text-align': 'right' as const }}>
                        {(item.weightLbs || 0).toFixed(2)} lbs
                      </td>
                      <td style={{ ...tdStyle, 'text-align': 'right' as const }}>
                        {(item.totalWeightLbs || 0).toFixed(2)} lbs
                      </td>
                      <td style={{ ...tdStyle, 'text-align': 'right' as const }}>
                        ${(item.pricePerLb || 0).toFixed(2)}
                      </td>
                      <td style={{ ...tdStyle, 'text-align': 'right' as const }}>
                        ${item.subtotal.toFixed(2)}
                      </td>
                      <td style={{ ...tdStyle, 'text-align': 'right' as const }}>
                        ${item.tariff.toFixed(2)}
                      </td>
                      <td style={{ ...tdStyle, 'text-align': 'right' as const, 'font-weight': '600' }}>
                        ${item.total.toFixed(2)}
                      </td>
                      <td style={{ ...tdStyle, 'text-align': 'center' as const }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveDimensionalItem(index())}
                          style={{
                            background: 'var(--error-color)',
                            color: 'white',
                            border: 'none',
                            padding: '0.25rem 0.5rem',
                            'border-radius': '4px',
                            cursor: 'pointer',
                            'font-size': '0.75rem'
                          }}
                        >
                          <Icon name="delete" size="0.875em" />
                        </button>
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </Show>

        {/* Items List - FIXED BOX mode table */}
        <Show when={formData().shipmentItems.length > 0 && currentPricingMode() === 'FIXED_BOX'}>
          <div style={{ 'overflow-x': 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, background: '#9333ea' }}>Descripción</th>
                  <th style={{ ...thStyle, 'text-align': 'center' as const, background: '#9333ea' }}>Cant.</th>
                  <th style={{ ...thStyle, 'text-align': 'center' as const, background: '#9333ea' }}>Tamaño Caja</th>
                  <th style={{ ...thStyle, 'text-align': 'right' as const, background: '#9333ea' }}>Precio/Caja</th>
                  <th style={{ ...thStyle, 'text-align': 'right' as const, background: '#9333ea' }}>Subtotal</th>
                  <th style={{ ...thStyle, 'text-align': 'right' as const, background: '#9333ea' }}>Arancel</th>
                  <th style={{ ...thStyle, 'text-align': 'right' as const, background: '#9333ea' }}>Total</th>
                  <th style={{ ...thStyle, 'text-align': 'center' as const, background: '#9333ea' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                <For each={formData().shipmentItems}>
                  {(item, index) => (
                    <tr>
                      <td style={tdStyle}>{item.description}</td>
                      <td style={{ ...tdStyle, 'text-align': 'center' as const }}>{item.qty}</td>
                      <td style={{ ...tdStyle, 'text-align': 'center' as const }}>
                        <span style={{
                          display: 'inline-flex',
                          'align-items': 'center',
                          gap: '0.25rem',
                          padding: '0.25rem 0.5rem',
                          background: 'rgba(147, 51, 234, 0.1)',
                          'border-radius': '4px',
                          'font-size': '0.875rem'
                        }}>
                          📦 {item.selectedBoxSize || '-'}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, 'text-align': 'right' as const }}>
                        ${(item.boxPrice || 0).toFixed(2)}
                      </td>
                      <td style={{ ...tdStyle, 'text-align': 'right' as const }}>
                        ${item.subtotal.toFixed(2)}
                      </td>
                      <td style={{ ...tdStyle, 'text-align': 'right' as const }}>
                        ${item.tariff.toFixed(2)}
                      </td>
                      <td style={{ ...tdStyle, 'text-align': 'right' as const, 'font-weight': '600' }}>
                        ${item.total.toFixed(2)}
                      </td>
                      <td style={{ ...tdStyle, 'text-align': 'center' as const }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveDimensionalItem(index())}
                          style={{
                            background: 'var(--error-color)',
                            color: 'white',
                            border: 'none',
                            padding: '0.25rem 0.5rem',
                            'border-radius': '4px',
                            cursor: 'pointer',
                            'font-size': '0.75rem'
                          }}
                        >
                          <Icon name="delete" size="0.875em" />
                        </button>
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </Show>

        <Show when={formData().shipmentItems.length === 0}>
          <div style={{
            padding: '2rem',
            'text-align': 'center' as const,
            color: 'var(--text-muted)',
            background: 'var(--strip-color)',
            'border-radius': 'var(--border-radius-sm)',
            border: '1px dashed var(--border-color)'
          }}>
            <Icon name="box" size="2em" style={{ opacity: '0.5', 'margin-bottom': '0.5rem' }} />
            <div>No hay items dimensionales agregados</div>
            <div style={{ 'font-size': '0.875rem', 'margin-top': '0.25rem' }}>
              Use el formulario de arriba para agregar items
            </div>
          </div>
        </Show>
      </div>

      {/* Totals Summary */}
      <div style={totalsStyle}>
        <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)' }}>
          <Icon name="accounts" size="1em" style={{ "margin-right": "0.5rem" }} />
          Resumen del Envío
        </h3>

        <Show when={shippingTotals().productsTotal > 0}>
          <div style={totalRowStyle}>
            <span>📦 Total de Productos:</span>
            <span>${shippingTotals().productsTotal.toFixed(2)}</span>
          </div>
        </Show>

        {/* Mode-specific quantity totals */}
        <Show when={currentPricingMode() === 'CUBIC_FEET' && shippingTotals().totalCubicFeet > 0}>
          <div style={{...totalRowStyle, color: '#2563eb'}}>
            <span>📏 Total Pies Cúbicos:</span>
            <span>{shippingTotals().totalCubicFeet.toFixed(4)} ft³</span>
          </div>
        </Show>

        <Show when={currentPricingMode() === 'WEIGHT_LBS' && shippingTotals().totalWeightLbs > 0}>
          <div style={{...totalRowStyle, color: '#ea580c'}}>
            <span>⚖️ Total Peso:</span>
            <span>{shippingTotals().totalWeightLbs.toFixed(2)} lbs</span>
          </div>
        </Show>

        <Show when={currentPricingMode() === 'FIXED_BOX' && shippingTotals().totalBoxes > 0}>
          <div style={{...totalRowStyle, color: '#9333ea'}}>
            <span>📦 Total Cajas:</span>
            <span>{shippingTotals().totalBoxes} cajas</span>
          </div>
        </Show>

        <div style={totalRowStyle}>
          <span>
            {currentPricingMode() === 'CUBIC_FEET' ? '📏' : currentPricingMode() === 'WEIGHT_LBS' ? '⚖️' : '📦'} Subtotal Items:
          </span>
          <span>${shippingTotals().shipmentItemsSubtotal.toFixed(2)}</span>
        </div>

        <div style={totalRowStyle}>
          <span>🏛️ Total Aranceles:</span>
          <span>${shippingTotals().shipmentItemsTariffs.toFixed(2)}</span>
        </div>

        <Show when={shippingTotals().transportTotal > 0}>
          <div style={totalRowStyle}>
            <span>🚚 Costo de Transporte:</span>
            <span>${shippingTotals().transportTotal.toFixed(2)}</span>
          </div>
        </Show>

        <div style={{...totalRowStyle, 'padding-top': '0.5rem', 'border-top': '1px solid var(--border-color)'}}>
          <span>Subtotal:</span>
          <span>${shippingTotals().itemsTotal.toFixed(2)}</span>
        </div>

        <Show when={shippingTotals().discount > 0}>
          <div style={{...totalRowStyle, color: '#28a745', 'font-weight': '500'}}>
            <span>🏷️ Descuento:</span>
            <span>-${shippingTotals().discount.toFixed(2)}</span>
          </div>
        </Show>

        <div style={grandTotalStyle}>
          <span><Icon name="finance" size="1em" style={{ "margin-right": "0.3rem" }} />Total General:</span>
          <span>${shippingTotals().grandTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Payment Section */}
      <PaymentSection
        paymentMethods={formData().paymentMethods}
        onPaymentMethodsChange={handlePaymentMethodsChange}
        invoiceTotal={shippingTotals().grandTotal}
      />

      {/* Form Actions */}
      <div style={actionsStyle}>
        <button
          type="button"
          style={secondaryButtonStyle}
          onClick={handleClearForm}
          disabled={loading()}
        >
          <Icon name="delete" size="1em" style={{ "margin-right": "0.5rem" }} />
          Limpiar Form
        </button>

        <Show when={internationalShippingFormStore.isValid()}>
          <button
            type="button"
            style={primaryButtonStyle}
            onClick={handleSubmit}
            disabled={loading() || !internationalShippingFormStore.isValid()}
          >
            {loading() ?
              (<><Icon name="loading" size="1em" style={{ "margin-right": "0.5rem" }} />Procesando...</>) :
              (<><Icon name="check" size="1em" style={{ "margin-right": "0.5rem" }} />Crear Documento de Envío</>)
            }
          </button>
        </Show>
      </div>

      {/* Debug Info (Development only) */}
      {import.meta.env.DEV && (
        <details style={{ 'margin-top': '2rem', 'font-size': '0.875rem' }}>
          <summary><Icon name="search" size="0.9em" style={{ "margin-right": "0.3rem" }} />Debug Info (Development Only)</summary>
          <pre style={{
            background: '#f5f5f5',
            padding: '1rem',
            'border-radius': '4px',
            overflow: 'auto',
            'max-height': '300px'
          }}>
            {JSON.stringify({
              formValid: internationalShippingFormStore.isValid(),
              hasData: internationalShippingFormStore.hasData(),
              isDirty: internationalShippingFormStore.isDirty,
              shipmentItemsCount: formData().shipmentItems.length,
              productsCount: formData().products.length,
              destinationCountry: formData().destinationCountry,
              selectedCountryInfo: selectedCountryInfo(),
              totals: shippingTotals()
            }, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
};

export default InternationalShippingFormStyled;
