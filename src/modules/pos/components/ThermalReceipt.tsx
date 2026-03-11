import { Component, Show, For, createSignal, onMount } from 'solid-js';
import { POSSale } from '../types/posTypes';
import { authStore } from '../../../stores/authStore';

interface ThermalReceiptProps {
  sale: POSSale;
  onPrint?: () => void;
  onNewSale?: () => void;
  onClose?: () => void;
  autoPrint?: boolean;
}

const ThermalReceipt: Component<ThermalReceiptProps> = (props) => {
  const [isPrinting, setIsPrinting] = createSignal(false);

  // Get business info
  const businessInfo = () => ({
    name: authStore.state?.business?.name || 'HRM Finance',
    address: authStore.state?.business?.address || '',
    phone: authStore.state?.business?.phone || '',
    email: authStore.state?.business?.email || '',
    taxId: authStore.state?.business?.taxId || ''
  });

  // Format currency
  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Format time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Get payment methods used
  const getPaymentMethods = () => {
    const methods = props.sale.paymentMethods;
    const used: Array<{ method: string; amount: number }> = [];

    const methodNames: Record<string, string> = {
      cash: 'Efectivo',
      creditCard: 'Tarjeta Crédito',
      debitCard: 'Tarjeta Débito',
      zelle: 'Zelle',
      bankTransfer: 'Transferencia',
      check: 'Cheque',
      giftCard: 'Tarjeta Regalo',
      googlePay: 'Google Pay',
      other: 'Otro'
    };

    Object.entries(methods).forEach(([key, value]) => {
      if (typeof value === 'number' && value > 0 && key !== 'cashChange') {
        used.push({ method: methodNames[key] || key, amount: value });
      }
    });

    return used;
  };

  // Generate receipt HTML for printing
  const generatePrintHTML = () => {
    const sale = props.sale;
    const business = businessInfo();
    const payments = getPaymentMethods();

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Recibo - ${sale.saleNumber}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 0;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Courier New', 'Lucida Console', monospace;
      font-size: 12px;
      line-height: 1.3;
      width: 80mm;
      padding: 5mm;
      background: white;
      color: #000;
    }
    .receipt {
      width: 100%;
    }
    .center {
      text-align: center;
    }
    .right {
      text-align: right;
    }
    .bold {
      font-weight: bold;
    }
    .large {
      font-size: 16px;
    }
    .small {
      font-size: 10px;
    }
    .dashed-line {
      border-top: 1px dashed #000;
      margin: 8px 0;
    }
    .double-line {
      border-top: 3px double #000;
      margin: 8px 0;
    }
    .header {
      margin-bottom: 10px;
    }
    .header h1 {
      font-size: 18px;
      margin-bottom: 3px;
    }
    .row {
      display: flex;
      justify-content: space-between;
      margin: 2px 0;
    }
    .item-row {
      margin: 4px 0;
    }
    .item-name {
      font-weight: bold;
    }
    .item-details {
      display: flex;
      justify-content: space-between;
      padding-left: 10px;
      font-size: 11px;
    }
    .total-section .row {
      margin: 4px 0;
    }
    .grand-total {
      font-size: 18px;
      font-weight: bold;
      margin: 8px 0;
      padding: 5px 0;
      border-top: 2px solid #000;
      border-bottom: 2px solid #000;
    }
    .payment-section {
      margin: 10px 0;
    }
    .footer {
      margin-top: 15px;
      text-align: center;
    }
    .barcode {
      margin: 10px auto;
      text-align: center;
      font-family: 'Libre Barcode 39', cursive;
      font-size: 40px;
      letter-spacing: -2px;
    }
    .barcode-text {
      font-size: 10px;
      margin-top: 3px;
    }
    @media print {
      body {
        width: 80mm;
        min-height: auto;
      }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <!-- Header -->
    <div class="header center">
      <h1>${business.name}</h1>
      ${business.address ? `<div class="small">${business.address}</div>` : ''}
      ${business.phone ? `<div class="small">Tel: ${business.phone}</div>` : ''}
      ${business.taxId ? `<div class="small">RIF: ${business.taxId}</div>` : ''}
    </div>

    <div class="dashed-line"></div>

    <!-- Sale Info -->
    <div class="sale-info">
      <div class="row">
        <span>RECIBO #:</span>
        <span class="bold">${sale.saleNumber}</span>
      </div>
      <div class="row">
        <span>Fecha:</span>
        <span>${formatDate(sale.timestamp)}</span>
      </div>
      <div class="row">
        <span>Hora:</span>
        <span>${formatTime(sale.timestamp)}</span>
      </div>
      <div class="row">
        <span>Cajero:</span>
        <span>${sale.cashier.name}</span>
      </div>
      ${sale.storeName ? `
      <div class="row">
        <span>Tienda:</span>
        <span>${sale.storeName}</span>
      </div>
      ` : ''}
      ${sale.customer ? `
      <div class="row">
        <span>Cliente:</span>
        <span>${sale.customer.name}</span>
      </div>
      ` : ''}
    </div>

    <div class="double-line"></div>

    <!-- Items -->
    <div class="items-section">
      ${sale.products.map(product => `
        <div class="item-row">
          <div class="item-name">${product.product.label}</div>
          <div class="item-details">
            <span>${product.qty} x ${formatCurrency(product.unitPrice)}</span>
            <span>${formatCurrency(product.total)}</span>
          </div>
          ${product.discount > 0 ? `
          <div class="item-details small">
            <span>Desc:</span>
            <span>-${formatCurrency(product.discount * product.qty)}</span>
          </div>
          ` : ''}
        </div>
      `).join('')}

      ${sale.services.map(service => `
        <div class="item-row">
          <div class="item-name">${service.name}</div>
          <div class="item-details">
            <span>${service.qty} x ${formatCurrency(service.unitPrice)}</span>
            <span>${formatCurrency(service.total)}</span>
          </div>
        </div>
      `).join('')}
    </div>

    <div class="dashed-line"></div>

    <!-- Totals -->
    <div class="total-section">
      <div class="row">
        <span>Subtotal:</span>
        <span>${formatCurrency(sale.subtotal)}</span>
      </div>
      ${sale.totalDiscount > 0 ? `
      <div class="row">
        <span>Descuento:</span>
        <span>-${formatCurrency(sale.totalDiscount)}</span>
      </div>
      ` : ''}
      <div class="row">
        <span>Impuesto:</span>
        <span>${formatCurrency(sale.totalTax)}</span>
      </div>
    </div>

    <div class="grand-total row">
      <span>TOTAL:</span>
      <span>${formatCurrency(sale.total)}</span>
    </div>

    <!-- Payment -->
    <div class="payment-section">
      <div class="center bold">FORMA DE PAGO</div>
      ${payments.map(p => `
        <div class="row">
          <span>${p.method}:</span>
          <span>${formatCurrency(p.amount)}</span>
        </div>
      `).join('')}
      <div class="row bold">
        <span>Total Pagado:</span>
        <span>${formatCurrency(sale.totalPaid)}</span>
      </div>
      ${sale.change > 0 ? `
      <div class="row bold">
        <span>Cambio:</span>
        <span>${formatCurrency(sale.change)}</span>
      </div>
      ` : ''}
    </div>

    <div class="dashed-line"></div>

    <!-- Items Count -->
    <div class="center small">
      Artículos: ${sale.products.length + sale.services.length} |
      Unidades: ${sale.products.reduce((sum, p) => sum + p.qty, 0) + sale.services.reduce((sum, s) => sum + s.qty, 0)}
    </div>

    <div class="dashed-line"></div>

    <!-- Footer -->
    <div class="footer">
      <div class="bold">¡GRACIAS POR SU COMPRA!</div>
      <div class="small" style="margin-top: 5px;">
        Conserve este recibo para cualquier<br>
        reclamación o devolución
      </div>

      <!-- Barcode representation -->
      <div style="margin-top: 10px;">
        <div style="font-family: monospace; font-size: 10px; letter-spacing: 2px;">
          ||| || ||| | || ||| || |||
        </div>
        <div class="barcode-text">${sale.saleNumber}</div>
      </div>

      <div class="small" style="margin-top: 10px; color: #666;">
        Generado por HRM Finance POS
      </div>
    </div>
  </div>
</body>
</html>
    `;
  };

  // Print receipt
  const printReceipt = () => {
    setIsPrinting(true);

    const printWindow = window.open('', '_blank', 'width=320,height=600');

    if (printWindow) {
      printWindow.document.write(generatePrintHTML());
      printWindow.document.close();

      // Wait for content to load then print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
          setIsPrinting(false);
          props.onPrint?.();
        }, 250);
      };
    } else {
      setIsPrinting(false);
      alert('Por favor permita las ventanas emergentes para imprimir');
    }
  };

  // Auto print on mount if enabled
  onMount(() => {
    if (props.autoPrint) {
      setTimeout(printReceipt, 500);
    }
  });

  const payments = getPaymentMethods();
  const business = businessInfo();

  // Thermal receipt styles
  const receiptStyle = {
    width: '320px',
    margin: '0 auto',
    background: '#fafafa',
    'box-shadow': '0 4px 20px rgba(0,0,0,0.15)',
    'font-family': "'Courier New', 'Lucida Console', monospace",
    'font-size': '12px',
    'line-height': '1.4',
    color: '#000',
    overflow: 'hidden'
  };

  const receiptPaperStyle = {
    background: 'white',
    padding: '20px 15px',
    'border-left': '1px solid #ddd',
    'border-right': '1px solid #ddd',
    position: 'relative' as const
  };

  const perforatedEdgeStyle = {
    height: '15px',
    background: 'repeating-linear-gradient(90deg, transparent, transparent 5px, #ddd 5px, #ddd 6px)',
    'border-bottom': '1px dashed #ccc'
  };

  const dashedLineStyle = {
    'border-top': '1px dashed #333',
    margin: '10px 0'
  };

  const doubleLineStyle = {
    'border-top': '3px double #333',
    margin: '12px 0'
  };

  const rowStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    margin: '3px 0'
  };

  return (
    <div style={{
      display: 'flex',
      'flex-direction': 'column',
      'align-items': 'center',
      gap: '1.5rem',
      padding: '1rem'
    }}>
      {/* Receipt Preview */}
      <div style={receiptStyle}>
        {/* Top perforated edge */}
        <div style={perforatedEdgeStyle} />

        <div style={receiptPaperStyle}>
          {/* Header */}
          <div style={{ 'text-align': 'center', 'margin-bottom': '15px' }}>
            <div style={{ 'font-size': '18px', 'font-weight': 'bold', 'margin-bottom': '5px' }}>
              {business.name}
            </div>
            <Show when={business.address}>
              <div style={{ 'font-size': '10px' }}>{business.address}</div>
            </Show>
            <Show when={business.phone}>
              <div style={{ 'font-size': '10px' }}>Tel: {business.phone}</div>
            </Show>
            <Show when={business.taxId}>
              <div style={{ 'font-size': '10px' }}>RIF: {business.taxId}</div>
            </Show>
          </div>

          <div style={dashedLineStyle} />

          {/* Sale Info */}
          <div style={{ 'margin-bottom': '10px' }}>
            <div style={rowStyle}>
              <span>RECIBO #:</span>
              <span style={{ 'font-weight': 'bold' }}>{props.sale.saleNumber}</span>
            </div>
            <div style={rowStyle}>
              <span>Fecha:</span>
              <span>{formatDate(props.sale.timestamp)}</span>
            </div>
            <div style={rowStyle}>
              <span>Hora:</span>
              <span>{formatTime(props.sale.timestamp)}</span>
            </div>
            <div style={rowStyle}>
              <span>Cajero:</span>
              <span>{props.sale.cashier.name}</span>
            </div>
            <Show when={props.sale.storeName}>
              <div style={rowStyle}>
                <span>Tienda:</span>
                <span>{props.sale.storeName}</span>
              </div>
            </Show>
            <Show when={props.sale.customer}>
              <div style={rowStyle}>
                <span>Cliente:</span>
                <span>{props.sale.customer!.name}</span>
              </div>
            </Show>
          </div>

          <div style={doubleLineStyle} />

          {/* Items */}
          <div style={{ 'margin-bottom': '10px' }}>
            <For each={props.sale.products}>
              {(product) => (
                <div style={{ 'margin-bottom': '8px' }}>
                  <div style={{ 'font-weight': 'bold', 'font-size': '11px' }}>
                    {product.product.label}
                  </div>
                  <div style={{ ...rowStyle, 'padding-left': '10px', 'font-size': '11px' }}>
                    <span>{product.qty} x {formatCurrency(product.unitPrice)}</span>
                    <span>{formatCurrency(product.total)}</span>
                  </div>
                  <Show when={product.discount > 0}>
                    <div style={{ ...rowStyle, 'padding-left': '10px', 'font-size': '10px', color: '#666' }}>
                      <span>Desc:</span>
                      <span>-{formatCurrency(product.discount * product.qty)}</span>
                    </div>
                  </Show>
                </div>
              )}
            </For>

            <For each={props.sale.services}>
              {(service) => (
                <div style={{ 'margin-bottom': '8px' }}>
                  <div style={{ 'font-weight': 'bold', 'font-size': '11px' }}>
                    {service.name}
                  </div>
                  <div style={{ ...rowStyle, 'padding-left': '10px', 'font-size': '11px' }}>
                    <span>{service.qty} x {formatCurrency(service.unitPrice)}</span>
                    <span>{formatCurrency(service.total)}</span>
                  </div>
                </div>
              )}
            </For>
          </div>

          <div style={dashedLineStyle} />

          {/* Totals */}
          <div style={{ 'margin-bottom': '5px' }}>
            <div style={rowStyle}>
              <span>Subtotal:</span>
              <span>{formatCurrency(props.sale.subtotal)}</span>
            </div>
            <Show when={props.sale.totalDiscount > 0}>
              <div style={rowStyle}>
                <span>Descuento:</span>
                <span>-{formatCurrency(props.sale.totalDiscount)}</span>
              </div>
            </Show>
            <div style={rowStyle}>
              <span>Impuesto:</span>
              <span>{formatCurrency(props.sale.totalTax)}</span>
            </div>
          </div>

          {/* Grand Total */}
          <div style={{
            ...rowStyle,
            'font-size': '18px',
            'font-weight': 'bold',
            padding: '8px 0',
            'border-top': '2px solid #000',
            'border-bottom': '2px solid #000',
            margin: '10px 0'
          }}>
            <span>TOTAL:</span>
            <span>{formatCurrency(props.sale.total)}</span>
          </div>

          {/* Payment */}
          <div style={{ 'margin-bottom': '10px' }}>
            <div style={{ 'text-align': 'center', 'font-weight': 'bold', 'margin-bottom': '5px' }}>
              FORMA DE PAGO
            </div>
            <For each={payments}>
              {(payment) => (
                <div style={rowStyle}>
                  <span>{payment.method}:</span>
                  <span>{formatCurrency(payment.amount)}</span>
                </div>
              )}
            </For>
            <div style={{ ...rowStyle, 'font-weight': 'bold' }}>
              <span>Total Pagado:</span>
              <span>{formatCurrency(props.sale.totalPaid)}</span>
            </div>
            <Show when={props.sale.change > 0}>
              <div style={{ ...rowStyle, 'font-weight': 'bold', color: '#2e7d32' }}>
                <span>Cambio:</span>
                <span>{formatCurrency(props.sale.change)}</span>
              </div>
            </Show>
          </div>

          <div style={dashedLineStyle} />

          {/* Items count */}
          <div style={{ 'text-align': 'center', 'font-size': '10px', color: '#666' }}>
            Artículos: {props.sale.products.length + props.sale.services.length} |
            Unidades: {props.sale.products.reduce((sum, p) => sum + p.qty, 0) + props.sale.services.reduce((sum, s) => sum + s.qty, 0)}
          </div>

          <div style={dashedLineStyle} />

          {/* Footer */}
          <div style={{ 'text-align': 'center', 'margin-top': '15px' }}>
            <div style={{ 'font-weight': 'bold', 'font-size': '14px' }}>
              ¡GRACIAS POR SU COMPRA!
            </div>
            <div style={{ 'font-size': '10px', 'margin-top': '5px', color: '#666' }}>
              Conserve este recibo para cualquier<br />
              reclamación o devolución
            </div>

            {/* Barcode representation */}
            <div style={{ 'margin-top': '12px' }}>
              <div style={{
                'font-family': 'monospace',
                'font-size': '10px',
                'letter-spacing': '3px',
                'margin-bottom': '3px'
              }}>
                ||| || ||| | || ||| || |||
              </div>
              <div style={{ 'font-size': '9px' }}>{props.sale.saleNumber}</div>
            </div>

            <div style={{ 'font-size': '9px', 'margin-top': '10px', color: '#999' }}>
              Generado por HRM Finance POS
            </div>
          </div>
        </div>

        {/* Bottom perforated edge */}
        <div style={{ ...perforatedEdgeStyle, 'border-bottom': 'none', 'border-top': '1px dashed #ccc' }} />
      </div>

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        'flex-wrap': 'wrap',
        'justify-content': 'center'
      }}>
        <button
          onClick={printReceipt}
          disabled={isPrinting()}
          style={{
            padding: '12px 24px',
            background: isPrinting() ? '#ccc' : 'var(--primary-color)',
            color: 'white',
            border: 'none',
            'border-radius': '8px',
            cursor: isPrinting() ? 'not-allowed' : 'pointer',
            'font-weight': '600',
            'font-size': '1rem',
            display: 'flex',
            'align-items': 'center',
            gap: '8px',
            'box-shadow': '0 2px 8px rgba(0,0,0,0.15)'
          }}
        >
          {isPrinting() ? '⏳ Imprimiendo...' : '🖨️ Imprimir Recibo'}
        </button>

        <Show when={props.onNewSale}>
          <button
            onClick={props.onNewSale}
            style={{
              padding: '12px 24px',
              background: 'var(--success-color)',
              color: 'white',
              border: 'none',
              'border-radius': '8px',
              cursor: 'pointer',
              'font-weight': '600',
              'font-size': '1rem',
              display: 'flex',
              'align-items': 'center',
              gap: '8px',
              'box-shadow': '0 2px 8px rgba(0,0,0,0.15)'
            }}
          >
            ➕ Nueva Venta
          </button>
        </Show>

        <Show when={props.onClose}>
          <button
            onClick={props.onClose}
            style={{
              padding: '12px 24px',
              background: 'var(--surface-color)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              'border-radius': '8px',
              cursor: 'pointer',
              'font-weight': '500',
              'font-size': '1rem'
            }}
          >
            Cerrar
          </button>
        </Show>
      </div>
    </div>
  );
};

export default ThermalReceipt;
