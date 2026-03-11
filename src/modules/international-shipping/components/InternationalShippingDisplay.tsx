import { Component, Show, For, createMemo } from 'solid-js';
import { useTranslation } from '../../../translations';
import { inventoryStore } from '../../inventory';
import { downloadInternationalShippingPDF } from '../utils/internationalShippingPdfGenerator';
import {
  InternationalShippingForm,
  InternationalShipmentItem,
  InternationalProduct,
  PricingMode,
  StandardBoxSize,
  getPricingModeForCountry,
  DestinationCountry
} from '../types/internationalShippingTypes';
import { generatePrintablePDF } from '../../../utils/printToPdf';

interface InternationalShippingDisplayProps {
  invoice: any; // The invoice data from the database
  onPrint?: () => void;
  onExport?: () => void;
  goBack?: () => void;
  onEdit?: () => void;
}

const InternationalShippingDisplay: Component<InternationalShippingDisplayProps> = (props) => {
  const { t } = useTranslation();

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format currency
  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD'
    }).format(num);
  };

  // Get country information
  const countryInfo = createMemo(() => {
    if (!props.invoice.pricingConfig || !props.invoice.destinationCountry) return null;
    return props.invoice.pricingConfig.countryTariffs.find(
      (c: any) => c.country === props.invoice.destinationCountry
    );
  });

  // Get current pricing mode based on destination country
  const currentPricingMode = createMemo((): PricingMode => {
    if (!props.invoice.destinationCountry || !props.invoice.pricingConfig) return 'CUBIC_FEET';
    return getPricingModeForCountry(
      props.invoice.destinationCountry as DestinationCountry,
      props.invoice.pricingConfig
    );
  });

  // Get pricing mode colors
  const pricingModeColors = createMemo(() => {
    switch (currentPricingMode()) {
      case 'WEIGHT_LBS':
        return { primary: '#ea580c', light: '#fff7ed', border: '#fed7aa' };
      case 'FIXED_BOX':
        return { primary: '#9333ea', light: '#faf5ff', border: '#e9d5ff' };
      case 'CUBIC_FEET':
      default:
        return { primary: '#2563eb', light: '#eff6ff', border: '#bfdbfe' };
    }
  });

  // Calculate totals (supports all pricing modes)
  const totals = createMemo(() => {
    const shipmentItems = props.invoice.shipmentItems || [];
    const products = props.invoice.products || [];
    const bulks = props.invoice.bulks || [];

    // Mode-specific totals
    const totalCubicFeet = shipmentItems
      .filter((item: InternationalShipmentItem) => item.pricingMode === 'CUBIC_FEET' || !item.pricingMode)
      .reduce((sum: number, item: InternationalShipmentItem) => sum + (item.totalCubicFeet || 0), 0);

    const totalWeightLbs = shipmentItems
      .filter((item: InternationalShipmentItem) => item.pricingMode === 'WEIGHT_LBS')
      .reduce((sum: number, item: InternationalShipmentItem) => sum + (item.totalWeightLbs || 0), 0);

    const totalBoxes = shipmentItems
      .filter((item: InternationalShipmentItem) => item.pricingMode === 'FIXED_BOX')
      .reduce((sum: number, item: InternationalShipmentItem) => sum + item.qty, 0);

    // Shipment items financial totals
    const shipmentSubtotal = shipmentItems.reduce((sum: number, item: InternationalShipmentItem) =>
      sum + (item.subtotal || 0), 0
    );
    const tariffTotal = shipmentItems.reduce((sum: number, item: InternationalShipmentItem) =>
      sum + (item.tariff || 0), 0
    );
    const shipmentTotal = shipmentItems.reduce((sum: number, item: InternationalShipmentItem) =>
      sum + (item.total || 0), 0
    );

    // Products totals
    const productSubtotal = products.reduce((sum: number, product: InternationalProduct) =>
      sum + product.total, 0
    );

    // Bulk transport costs
    const transportTotal = bulks.reduce((sum: number, bulk: any) =>
      sum + (bulk.transportCost || 0), 0
    );

    // Payment method totals
    const paymentMethods = props.invoice.paymentMethods || {};
    const cash = paymentMethods.cash || 0;
    const zelle = paymentMethods.zelle || 0;
    const creditCard = paymentMethods.creditCard || 0;
    const discount = paymentMethods.discount || 0;

    // Grand total
    const subtotal = shipmentSubtotal + tariffTotal + productSubtotal + transportTotal;
    const total = subtotal - discount;

    return {
      totalCubicFeet,
      totalWeightLbs,
      totalBoxes,
      shipmentSubtotal,
      tariffTotal,
      shipmentTotal,
      productSubtotal,
      transportTotal,
      subtotal,
      discount,
      total,
      cash,
      zelle,
      creditCard
    };
  });

  // Get store info
  const storeInfo = createMemo(() => {
    return inventoryStore.getLocationById(props.invoice.store);
  });

  // Handle PDF export
  const handleExportPDF = async () => {
    try {
      await downloadInternationalShippingPDF(props.invoice, undefined, 'es');
      console.log('International shipping PDF generated successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generando PDF: ' + (error as Error)?.message);
    }
  };

  // Handle print
  const handlePrint = () => {
      // International shipping PDF generation
      // Pass the raw invoice data directly since it contains shipmentItems
      // which are specific to international shipping
      const invoiceData = {
        ...props.invoice,
        // Calculate totals for display
        productSubtotal: (props.invoice.products || []).reduce((sum: number, p: any) => sum + (p.total || 0), 0),
        reservaSubtotal: 0,
        serviceSubtotal: 0,
        shipmentItemsSubtotal: (props.invoice.shipmentItems || []).reduce((sum: number, item: any) => sum + (item.total || 0), 0),
        subtotalBeforeTax: totals().subtotal,
        taxAmount: 0,
        taxSavings: 0,
        total: totals().total,
        transportTotal: totals().transportTotal,
        bulks: props.invoice.bulks || []
      };

      console.log('Using international shipping PDF generator...');
      try {
        generatePrintablePDF(invoiceData, t);
      } catch(error) {
        console.error('Error generating international shipping PDF:', error);
      }
  };

  // Styles
  const containerStyle = {
    'max-width': '900px',
    margin: '0 auto',
    padding: '2rem',
    background: 'white',
    'box-shadow': '0 0 20px rgba(0,0,0,0.1)',
    'border-radius': 'var(--border-radius)'
  };

  const headerStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'flex-start',
    'margin-bottom': '1.5rem',
    'padding-bottom': '1.5rem',
    'border-bottom': `3px solid ${pricingModeColors().primary}`
  };

  const titleStyle = {
    'font-size': '1.8rem',
    'font-weight': '700',
    color: pricingModeColors().primary,
    margin: '0 0 0.5rem 0'
  };

  const sectionStyle = {
    'margin-bottom': '2rem'
  };

  const sectionTitleStyle = {
    'font-size': '1.2rem',
    'font-weight': '600',
    'margin-bottom': '1rem',
    color: pricingModeColors().primary,
    'border-bottom': '2px solid #e5e7eb',
    'padding-bottom': '0.5rem'
  };

  const infoBoxStyle = {
    background: pricingModeColors().light,
    padding: '1rem',
    'border-radius': '8px',
    border: `1px solid ${pricingModeColors().border}`,
    'margin-bottom': '1rem'
  };

  const labelStyle = {
    'font-size': '0.875rem',
    color: '#6b7280',
    'font-weight': '600',
    'margin-bottom': '0.25rem'
  };

  const valueStyle = {
    'font-size': '1rem',
    color: '#1f2937',
    'font-weight': '500'
  };

  const tableStyle: Record<string, string> = {
    width: '100%',
    'border-collapse': 'collapse',
    'margin-top': '1rem',
    'font-size': '0.9rem'
  };

  const thStyle: Record<string, string> = {
    'text-align': 'left',
    padding: '0.75rem',
    'border-bottom': `2px solid ${pricingModeColors().primary}`,
    'font-weight': '600',
    color: pricingModeColors().primary,
    'font-size': '0.875rem',
    background: pricingModeColors().light
  };

  const tdStyle: Record<string, string> = {
    padding: '0.75rem',
    'border-bottom': '1px solid #e5e7eb',
    color: '#374151'
  };

  const buttonStyle = {
    padding: '0.75rem 1.5rem',
    'border-radius': '8px',
    border: 'none',
    'font-weight': '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'inline-flex',
    'align-items': 'center',
    gap: '0.5rem',
    'font-size': '0.95rem'
  };

  const primaryButtonStyle = {
    ...buttonStyle,
    background: pricingModeColors().primary,
    color: 'white'
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    background: 'white',
    color: pricingModeColors().primary,
    border: `2px solid ${pricingModeColors().primary}`
  };

  return (
    <div style={containerStyle} class="international-shipping-display">
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>🌎 Envío Internacional</h1>
          <div style={{ 'font-size': '0.95rem', color: '#6b7280' }}>
            <strong>Documento:</strong> {props.invoice.invoice}
          </div>
          <Show when={props.invoice.guide}>
            <div style={{ 'font-size': '0.95rem', color: '#6b7280' }}>
              <strong>Guía:</strong> {props.invoice.guide}
            </div>
          </Show>
        </div>
        <div style={{ 'text-align': 'right' }}>
          <Show when={countryInfo()}>
            <div style={{
              'font-size': '1.8rem',
              'margin-bottom': '0.5rem'
            }}>
              {countryInfo()!.flagEmoji}
            </div>
            <div style={{
              'font-size': '1.1rem',
              'font-weight': '600',
              color: pricingModeColors().primary
            }}>
              {countryInfo()!.label}
            </div>
          </Show>
          <div style={{ 'font-size': '0.875rem', color: '#6b7280', 'margin-top': '0.5rem' }}>
            {formatDate(props.invoice.createDate)}
          </div>
        </div>
      </div>

      {/* Pricing Mode Indicator Banner */}
      <div style={{
        'margin-bottom': '1.5rem',
        padding: '1rem 1.5rem',
        'border-radius': '8px',
        background: `linear-gradient(135deg, ${pricingModeColors().primary} 0%, ${pricingModeColors().primary}dd 100%)`,
        color: 'white',
        display: 'flex',
        'justify-content': 'space-between',
        'align-items': 'center',
        'flex-wrap': 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', 'align-items': 'center', gap: '0.75rem' }}>
          <span style={{ 'font-size': '1.5rem' }}>
            {currentPricingMode() === 'FIXED_BOX' ? '📦' : currentPricingMode() === 'WEIGHT_LBS' ? '⚖️' : '📏'}
          </span>
          <div>
            <div style={{ 'font-weight': '600', 'font-size': '1.1rem' }}>
              {currentPricingMode() === 'FIXED_BOX'
                ? 'Precio por Caja Fija'
                : currentPricingMode() === 'WEIGHT_LBS'
                ? 'Precio por Libra'
                : 'Precio por Pie Cúbico'}
            </div>
            <div style={{ 'font-size': '0.875rem', opacity: '0.9' }}>
              {currentPricingMode() === 'FIXED_BOX'
                ? 'Tarifa fija por tamaño de caja'
                : currentPricingMode() === 'WEIGHT_LBS'
                ? `$${countryInfo()?.priceLbs || 0}/lb`
                : `$${countryInfo()?.pricePerCubicFoot || props.invoice.pricingConfig?.defaultPricePerCubicFoot || 0}/ft³`}
            </div>
          </div>
        </div>
        <div style={{ 'text-align': 'right' }}>
          <Show when={currentPricingMode() === 'CUBIC_FEET' && totals().totalCubicFeet > 0}>
            <div style={{ 'font-size': '1.25rem', 'font-weight': '700' }}>
              {totals().totalCubicFeet.toFixed(3)} ft³
            </div>
          </Show>
          <Show when={currentPricingMode() === 'WEIGHT_LBS' && totals().totalWeightLbs > 0}>
            <div style={{ 'font-size': '1.25rem', 'font-weight': '700' }}>
              {totals().totalWeightLbs.toFixed(2)} lbs
            </div>
          </Show>
          <Show when={currentPricingMode() === 'FIXED_BOX' && totals().totalBoxes > 0}>
            <div style={{ 'font-size': '1.25rem', 'font-weight': '700' }}>
              {totals().totalBoxes} {totals().totalBoxes === 1 ? 'caja' : 'cajas'}
            </div>
          </Show>
        </div>
      </div>

      {/* Store Information */}
      <Show when={storeInfo()}>
        <div style={infoBoxStyle}>
          <div style={labelStyle}>Tienda</div>
          <div style={valueStyle}>{storeInfo()!.name}</div>
        </div>
      </Show>

      {/* Customer Information */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Información del Cliente</h3>
        <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '1rem' }}>
          <div style={infoBoxStyle}>
            <div style={labelStyle}>Nombre</div>
            <div style={valueStyle}>{props.invoice.shipper_consignee.name}</div>

            <Show when={props.invoice.shipper_consignee.phoneNumber || props.invoice.shipper_consignee.phoneNumberS}>
              <div style={{ ...labelStyle, 'margin-top': '0.75rem' }}>Teléfono</div>
              <div style={valueStyle}>
                {props.invoice.shipper_consignee.phoneNumber || props.invoice.shipper_consignee.phoneNumberS}
              </div>
            </Show>
          </div>

          <div style={infoBoxStyle}>
            <Show when={props.invoice.shipper_consignee.cid}>
              <div style={labelStyle}>Identificación</div>
              <div style={valueStyle}>{props.invoice.shipper_consignee.cid}</div>
            </Show>

            <Show when={props.invoice.shipper_consignee.email}>
              <div style={{ ...labelStyle, 'margin-top': '0.75rem' }}>Correo</div>
              <div style={valueStyle}>{props.invoice.shipper_consignee.email}</div>
            </Show>
          </div>
        </div>

        <Show when={props.invoice.shipper_consignee.address}>
          <div style={{ ...infoBoxStyle, 'margin-top': '1rem' }}>
            <div style={labelStyle}>Dirección</div>
            <div style={valueStyle}>{props.invoice.shipper_consignee.address}</div>
          </div>
        </Show>
      </div>

      {/* Shipment Items (Dimensional) */}
      <Show when={props.invoice.shipmentItems && props.invoice.shipmentItems.length > 0}>
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>
            📦 Artículos de Envío
          </h3>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Descripción</th>
                <th style={{ ...thStyle, 'text-align': 'center' }}>Cant</th>
                <th style={{ ...thStyle, 'text-align': 'center' }}>Detalles</th>
                <th style={{ ...thStyle, 'text-align': 'right' }}>Medida</th>
                <th style={{ ...thStyle, 'text-align': 'right' }}>Total</th>
                <th style={{ ...thStyle, 'text-align': 'right' }}>Precio</th>
                <th style={{ ...thStyle, 'text-align': 'right' }}>Subtotal</th>
                <th style={{ ...thStyle, 'text-align': 'right' }}>Arancel</th>
                <th style={{ ...thStyle, 'text-align': 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              <For each={props.invoice.shipmentItems}>
                {(item: InternationalShipmentItem) => {
                  // Determine pricing mode (default to CUBIC_FEET for backward compatibility)
                  const pricingMode: PricingMode = item.pricingMode || 'CUBIC_FEET';

                  return (
                    <tr>
                      <td style={tdStyle}>{item.description || 'N/A'}</td>
                      <td style={{ ...tdStyle, 'text-align': 'center' }}>{item.qty}</td>

                      {/* Details column - varies by pricing mode */}
                      <td style={{ ...tdStyle, 'text-align': 'center', 'font-family': 'monospace' }}>
                        <Show when={pricingMode === 'CUBIC_FEET'}>
                          {item.dimensions.height}"×{item.dimensions.width}"×{item.dimensions.depth}"
                        </Show>
                        <Show when={pricingMode === 'WEIGHT_LBS'}>
                          {item.weightLbs || 0} lbs
                        </Show>
                        <Show when={pricingMode === 'FIXED_BOX'}>
                          {item.selectedBoxSize || 'N/A'}
                        </Show>
                      </td>

                      {/* Unit measure column */}
                      <td style={{ ...tdStyle, 'text-align': 'right', 'font-family': 'monospace' }}>
                        <Show when={pricingMode === 'CUBIC_FEET'}>
                          {item.dimensions?.cubicFeet?.toFixed(3) || '0.000'} ft³
                        </Show>
                        <Show when={pricingMode === 'WEIGHT_LBS'}>
                          {item.weightLbs || 0} lbs
                        </Show>
                        <Show when={pricingMode === 'FIXED_BOX'}>
                          {item.selectedBoxSize || 'N/A'}
                        </Show>
                      </td>

                      {/* Total measure column */}
                      <td style={{ ...tdStyle, 'text-align': 'right', 'font-weight': '600' }}>
                        <Show when={pricingMode === 'CUBIC_FEET'}>
                          {item.totalCubicFeet?.toFixed(3) || '0.000'} ft³
                        </Show>
                        <Show when={pricingMode === 'WEIGHT_LBS'}>
                          {item.totalWeightLbs?.toFixed(2) || '0.00'} lbs
                        </Show>
                        <Show when={pricingMode === 'FIXED_BOX'}>
                          {item.qty} {item.qty === 1 ? 'caja' : 'cajas'}
                        </Show>
                      </td>

                      {/* Price column */}
                      <td style={{ ...tdStyle, 'text-align': 'right' }}>
                        <Show when={pricingMode === 'CUBIC_FEET'}>
                          {formatCurrency(item.pricePerCubicFoot || 0)}/ft³
                        </Show>
                        <Show when={pricingMode === 'WEIGHT_LBS'}>
                          {formatCurrency(item.pricePerLb || 0)}/lb
                        </Show>
                        <Show when={pricingMode === 'FIXED_BOX'}>
                          {formatCurrency(item.boxPrice || 0)}/caja
                        </Show>
                      </td>

                      <td style={{ ...tdStyle, 'text-align': 'right' }}>
                        {formatCurrency(item.subtotal || 0)}
                      </td>
                      <td style={{ ...tdStyle, 'text-align': 'right', color: '#dc2626' }}>
                        {formatCurrency(item.tariff || 0)}
                      </td>
                      <td style={{ ...tdStyle, 'text-align': 'right', 'font-weight': '600' }}>
                        {formatCurrency(item.total || 0)}
                      </td>
                    </tr>
                  );
                }}
              </For>
              <tr style={{ background: pricingModeColors().light }}>
                <td colspan="4" style={{ ...tdStyle, 'font-weight': '600', 'text-align': 'right' }}>
                  Totales:
                </td>
                <td style={{ ...tdStyle, 'text-align': 'right', 'font-weight': '700', color: pricingModeColors().primary }}>
                  <Show when={currentPricingMode() === 'CUBIC_FEET' && totals().totalCubicFeet > 0}>
                    {totals().totalCubicFeet.toFixed(3)} ft³
                  </Show>
                  <Show when={currentPricingMode() === 'WEIGHT_LBS' && totals().totalWeightLbs > 0}>
                    {totals().totalWeightLbs.toFixed(2)} lbs
                  </Show>
                  <Show when={currentPricingMode() === 'FIXED_BOX' && totals().totalBoxes > 0}>
                    {totals().totalBoxes} {totals().totalBoxes === 1 ? 'caja' : 'cajas'}
                  </Show>
                </td>
                <td style={tdStyle}></td>
                <td style={{ ...tdStyle, 'text-align': 'right', 'font-weight': '600' }}>
                  {formatCurrency(totals().shipmentSubtotal)}
                </td>
                <td style={{ ...tdStyle, 'text-align': 'right', 'font-weight': '600', color: '#dc2626' }}>
                  {formatCurrency(totals().tariffTotal)}
                </td>
                <td style={{ ...tdStyle, 'text-align': 'right', 'font-weight': '700', color: '#059669' }}>
                  {formatCurrency(totals().shipmentTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Show>

      {/* Additional Products */}
      <Show when={props.invoice.products && props.invoice.products.length > 0}>
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>📋 Productos Adicionales</h3>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Código</th>
                <th style={thStyle}>Descripción</th>
                <th style={{ ...thStyle, 'text-align': 'center' }}>Cantidad</th>
                <th style={{ ...thStyle, 'text-align': 'right' }}>Precio</th>
                <th style={{ ...thStyle, 'text-align': 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              <For each={props.invoice.products}>
                {(product: InternationalProduct) => (
                  <tr>
                    <td style={tdStyle}>{product.product.code}</td>
                    <td style={tdStyle}>{product.product.label}</td>
                    <td style={{ ...tdStyle, 'text-align': 'center' }}>{product.qty}</td>
                    <td style={{ ...tdStyle, 'text-align': 'right' }}>
                      {formatCurrency(product.salePrice)}
                    </td>
                    <td style={{ ...tdStyle, 'text-align': 'right', 'font-weight': '600' }}>
                      {formatCurrency(product.total)}
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </Show>

      {/* Tariff Information */}
      <Show when={countryInfo()}>
        <div style={sectionStyle}>
          <div style={{
            ...infoBoxStyle,
            background: '#fef3c7',
            border: '1px solid #fbbf24'
          }}>
            <div style={{
              display: 'flex',
              'justify-content': 'space-between',
              'align-items': 'center'
            }}>
              <div>
                <div style={labelStyle}>Arancel por Item - {countryInfo()!.label}</div>
                <div style={{ 'font-size': '1.5rem', 'font-weight': '700', color: '#92400e' }}>
                  {formatCurrency(countryInfo()!.tariffRate)}
                </div>
              </div>
              <div style={{ 'font-size': '3rem' }}>
                {countryInfo()!.flagEmoji}
              </div>
            </div>
          </div>
        </div>
      </Show>

      {/* Payment Summary */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>💰 Resumen de Pago</h3>
        <div style={{
          background: '#f9fafb',
          padding: '1.5rem',
          'border-radius': '8px',
          border: `2px solid ${pricingModeColors().border}`
        }}>
          {/* Mode-specific quantity totals */}
          <Show when={currentPricingMode() === 'CUBIC_FEET' && totals().totalCubicFeet > 0}>
            <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.75rem' }}>
              <span style={{ color: pricingModeColors().primary }}>📏 Total Pies Cúbicos:</span>
              <span style={{ 'font-weight': '600', color: pricingModeColors().primary }}>
                {totals().totalCubicFeet.toFixed(3)} ft³
              </span>
            </div>
          </Show>

          <Show when={currentPricingMode() === 'WEIGHT_LBS' && totals().totalWeightLbs > 0}>
            <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.75rem' }}>
              <span style={{ color: pricingModeColors().primary }}>⚖️ Total Peso:</span>
              <span style={{ 'font-weight': '600', color: pricingModeColors().primary }}>
                {totals().totalWeightLbs.toFixed(2)} lbs
              </span>
            </div>
          </Show>

          <Show when={currentPricingMode() === 'FIXED_BOX' && totals().totalBoxes > 0}>
            <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.75rem' }}>
              <span style={{ color: pricingModeColors().primary }}>📦 Total Cajas:</span>
              <span style={{ 'font-weight': '600', color: pricingModeColors().primary }}>
                {totals().totalBoxes} {totals().totalBoxes === 1 ? 'caja' : 'cajas'}
              </span>
            </div>
          </Show>

          <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.75rem' }}>
            <span style={{ color: '#6b7280' }}>Subtotal Envío:</span>
            <span style={{ 'font-weight': '600' }}>{formatCurrency(totals().shipmentSubtotal)}</span>
          </div>

          <Show when={totals().tariffTotal > 0}>
            <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.75rem' }}>
              <span style={{ color: '#6b7280' }}>Total Aranceles:</span>
              <span style={{ 'font-weight': '600', color: '#dc2626' }}>
                {formatCurrency(totals().tariffTotal)}
              </span>
            </div>
          </Show>

          <Show when={totals().productSubtotal > 0}>
            <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.75rem' }}>
              <span style={{ color: '#6b7280' }}>Subtotal Productos:</span>
              <span style={{ 'font-weight': '600' }}>{formatCurrency(totals().productSubtotal)}</span>
            </div>
          </Show>

          <Show when={totals().transportTotal > 0}>
            <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.75rem' }}>
              <span style={{ color: '#6b7280' }}>Costo de Transporte:</span>
              <span style={{ 'font-weight': '600' }}>{formatCurrency(totals().transportTotal)}</span>
            </div>
          </Show>

          <Show when={totals().discount > 0}>
            <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.75rem' }}>
              <span style={{ color: '#059679' }}>Descuento:</span>
              <span style={{ 'font-weight': '600', color: '#059679' }}>
                -{formatCurrency(totals().discount)}
              </span>
            </div>
          </Show>

          <div style={{
            'border-top': `2px solid ${pricingModeColors().primary}`,
            'padding-top': '0.75rem',
            'margin-top': '0.75rem'
          }}>
            <div style={{
              display: 'flex',
              'justify-content': 'space-between',
              'font-size': '1.3rem',
              'font-weight': '700',
              color: pricingModeColors().primary
            }}>
              <span>TOTAL:</span>
              <span>{formatCurrency(totals().total)}</span>
            </div>
          </div>

          {/* Payment Methods */}
          <Show when={totals().cash > 0 || totals().zelle > 0 || totals().creditCard > 0}>
            <div style={{
              'border-top': '1px solid #e5e7eb',
              'padding-top': '1rem',
              'margin-top': '1rem'
            }}>
              <div style={{ ...labelStyle, 'margin-bottom': '0.5rem' }}>Métodos de Pago</div>
              <Show when={totals().cash > 0}>
                <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.5rem' }}>
                  <span style={{ color: '#6b7280', 'font-size': '0.9rem' }}>💵 Efectivo:</span>
                  <span style={{ 'font-weight': '500' }}>{formatCurrency(totals().cash)}</span>
                </div>
              </Show>
              <Show when={totals().zelle > 0}>
                <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.5rem' }}>
                  <span style={{ color: '#6b7280', 'font-size': '0.9rem' }}>💸 Zelle:</span>
                  <span style={{ 'font-weight': '500' }}>{formatCurrency(totals().zelle)}</span>
                </div>
              </Show>
              <Show when={totals().creditCard > 0}>
                <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                  <span style={{ color: '#6b7280', 'font-size': '0.9rem' }}>💳 Tarjeta:</span>
                  <span style={{ 'font-weight': '500' }}>{formatCurrency(totals().creditCard)}</span>
                </div>
              </Show>
            </div>
          </Show>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        'justify-content': 'center',
        'margin-top': '2rem',
        'padding-top': '2rem',
        'border-top': '2px solid #e5e7eb'
      }} class="no-print">
        <button
          style={primaryButtonStyle}
          onClick={handlePrint}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          🖨️ Imprimir
        </button>

        <button
          style={secondaryButtonStyle}
          onClick={handleExportPDF}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#2563eb';
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'white';
            e.currentTarget.style.color = '#2563eb';
          }}
        >
          📄 Generar PDF
        </button>

        <Show when={props.goBack}>
          <button
            style={{ ...secondaryButtonStyle, 'border-color': '#6b7280', color: '#6b7280' }}
            onClick={props.goBack}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#6b7280';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.color = '#6b7280';
            }}
          >
            ← Volver
          </button>
        </Show>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }

          .international-shipping-display {
            box-shadow: none !important;
            max-width: none !important;
          }

          @page {
            margin: 1cm;
          }
        }
      `}</style>
    </div>
  );
};

export default InternationalShippingDisplay;


