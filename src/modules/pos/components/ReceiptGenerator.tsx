import { Component, Show } from 'solid-js';
import { POSSale, POSReceipt } from '../types/posTypes';

interface ReceiptGeneratorProps {
  sale: POSSale;
  onPrint?: () => void;
  onEmail?: () => void;
  onClose?: () => void;
}

const ReceiptGenerator: Component<ReceiptGeneratorProps> = (props) => {
  // Generate receipt data from sale
  const generateReceipt = (): POSReceipt => {
    const sale = props.sale;
    
    return {
      saleId: sale.id,
      headerText: 'HRM Finance POS System',
      footerText: 'Thank you for your business!',
      items: [
        ...sale.products.map(product => ({
          name: product.product.label,
          qty: product.qty,
          unitPrice: product.unitPrice,
          total: product.total
        })),
        ...sale.services.map(service => ({
          name: service.name,
          qty: service.qty,
          unitPrice: service.unitPrice,
          total: service.total
        }))
      ],
      subtotal: sale.subtotal,
      tax: sale.totalTax,
      discount: sale.totalDiscount,
      total: sale.total,
      paymentMethod: getPaymentMethodSummary(sale.paymentMethods),
      change: sale.change,
      timestamp: sale.timestamp,
      cashier: sale.cashier.name
    };
  };

  // Get payment method summary
  const getPaymentMethodSummary = (paymentMethods: any): string => {
    const methods = Object.entries(paymentMethods)
      .filter(([, amount]) => (amount as number) > 0)
      .map(([method, amount]) => `${formatPaymentMethod(method)}: $${(amount as number).toFixed(2)}`);
    
    return methods.join(', ') || 'No payment recorded';
  };

  const formatPaymentMethod = (method: string): string => {
    const methodNames: Record<string, string> = {
      cash: 'Cash',
      creditCard: 'Credit Card',
      debitCard: 'Debit Card',
      zelle: 'Zelle',
      bankTransfer: 'Bank Transfer',
      check: 'Check',
      giftCard: 'Gift Card',
      other: 'Other'
    };
    
    return methodNames[method] || method;
  };

  // Print receipt
  const printReceipt = () => {
    const receipt = generateReceipt();
    const printWindow = window.open('', '_blank');
    
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Receipt - ${receipt.saleId}</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              line-height: 1.4;
              margin: 0;
              padding: 20px;
              max-width: 300px;
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .line { border-top: 1px dashed #000; margin: 10px 0; }
            .header { font-size: 14px; font-weight: bold; margin-bottom: 10px; }
            .item-row { display: flex; justify-content: space-between; margin: 2px 0; }
            .item-name { flex: 1; }
            .item-qty { width: 30px; text-align: center; }
            .item-price { width: 60px; text-align: right; }
            .total-row { font-weight: bold; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="center header">${receipt.headerText}</div>
          <div class="line"></div>
          
          <div>Sale ID: ${receipt.saleId}</div>
          <div>Date: ${new Date(receipt.timestamp).toLocaleString()}</div>
          <div>Cashier: ${receipt.cashier}</div>
          
          <div class="line"></div>
          
          ${receipt.items.map(item => `
            <div class="item-row">
              <div class="item-name">${item.name}</div>
            </div>
            <div class="item-row">
              <div>${item.qty} x $${item.unitPrice.toFixed(2)}</div>
              <div class="item-price">$${item.total.toFixed(2)}</div>
            </div>
          `).join('')}
          
          <div class="line"></div>
          
          <div class="item-row">
            <div>Subtotal:</div>
            <div class="item-price">$${receipt.subtotal.toFixed(2)}</div>
          </div>
          
          ${receipt.discount > 0 ? `
          <div class="item-row">
            <div>Discount:</div>
            <div class="item-price">-$${receipt.discount.toFixed(2)}</div>
          </div>
          ` : ''}
          
          <div class="item-row">
            <div>Tax:</div>
            <div class="item-price">$${receipt.tax.toFixed(2)}</div>
          </div>
          
          <div class="line"></div>
          
          <div class="item-row total-row">
            <div>TOTAL:</div>
            <div class="item-price">$${receipt.total.toFixed(2)}</div>
          </div>
          
          <div class="line"></div>
          
          <div>Payment: ${receipt.paymentMethod}</div>
          ${receipt.change && receipt.change > 0 ? `<div>Change: $${receipt.change.toFixed(2)}</div>` : ''}
          
          <div class="line"></div>
          <div class="center">${receipt.footerText}</div>
        </body>
        </html>
      `);
      
      printWindow.document.close();
      printWindow.print();
      
      if (props.onPrint) {
        props.onPrint();
      }
    }
  };

  const receipt = generateReceipt();

  return (
    <div style={{
      display: 'flex',
      'flex-direction': 'column',
      gap: '1rem',
      'max-width': '400px',
      margin: '0 auto'
    }}>
      {/* Receipt Preview */}
      <div style={{
        border: '1px solid var(--border-color)',
        'border-radius': 'var(--border-radius)',
        padding: '1.5rem',
        background: 'white',
        'font-family': 'monospace',
        'font-size': '0.875rem',
        'line-height': '1.4'
      }}>
        {/* Header */}
        <div style={{ 
          'text-align': 'center', 
          'font-weight': 'bold', 
          'font-size': '1rem',
          'margin-bottom': '1rem'
        }}>
          {receipt.headerText}
        </div>
        
        <div style={{ 
          'border-top': '1px dashed #ccc', 
          'margin': '1rem 0' 
        }} />

        {/* Sale Info */}
        <div style={{ 'margin-bottom': '1rem' }}>
          <div>Sale ID: {receipt.saleId}</div>
          <div>Date: {new Date(receipt.timestamp).toLocaleString()}</div>
          <div>Cashier: {receipt.cashier}</div>
        </div>

        <div style={{ 
          'border-top': '1px dashed #ccc', 
          'margin': '1rem 0' 
        }} />

        {/* Items */}
        <div style={{ 'margin-bottom': '1rem' }}>
          {receipt.items.map(item => (
            <div>
              <div style={{ 'margin-bottom': '0.25rem' }}>
                {item.name}
              </div>
              <div style={{
                display: 'flex',
                'justify-content': 'space-between',
                'margin-bottom': '0.5rem'
              }}>
                <span>{item.qty} x ${item.unitPrice.toFixed(2)}</span>
                <span>${item.total.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ 
          'border-top': '1px dashed #ccc', 
          'margin': '1rem 0' 
        }} />

        {/* Totals */}
        <div style={{ 'margin-bottom': '1rem' }}>
          <div style={{
            display: 'flex',
            'justify-content': 'space-between'
          }}>
            <span>Subtotal:</span>
            <span>${receipt.subtotal.toFixed(2)}</span>
          </div>
          
          <Show when={receipt.discount > 0}>
            <div style={{
              display: 'flex',
              'justify-content': 'space-between'
            }}>
              <span>Discount:</span>
              <span>-${receipt.discount.toFixed(2)}</span>
            </div>
          </Show>
          
          <div style={{
            display: 'flex',
            'justify-content': 'space-between'
          }}>
            <span>Tax:</span>
            <span>${receipt.tax.toFixed(2)}</span>
          </div>
        </div>

        <div style={{ 
          'border-top': '1px dashed #ccc', 
          'margin': '1rem 0' 
        }} />

        {/* Total */}
        <div style={{
          display: 'flex',
          'justify-content': 'space-between',
          'font-weight': 'bold',
          'font-size': '1.1rem'
        }}>
          <span>TOTAL:</span>
          <span>${receipt.total.toFixed(2)}</span>
        </div>

        <div style={{ 
          'border-top': '1px dashed #ccc', 
          'margin': '1rem 0' 
        }} />

        {/* Payment */}
        <div style={{ 'margin-bottom': '1rem' }}>
          <div>Payment: {receipt.paymentMethod}</div>
          <Show when={receipt.change && receipt.change > 0}>
            <div>Change: ${receipt.change!.toFixed(2)}</div>
          </Show>
        </div>

        <div style={{ 
          'border-top': '1px dashed #ccc', 
          'margin': '1rem 0' 
        }} />

        {/* Footer */}
        <div style={{ 
          'text-align': 'center',
          'font-size': '0.8rem'
        }}>
          {receipt.footerText}
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        'justify-content': 'center'
      }}>
        <button
          onClick={printReceipt}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'var(--primary-color)',
            color: 'white',
            border: 'none',
            'border-radius': 'var(--border-radius-sm)',
            cursor: 'pointer',
            'font-weight': '600'
          }}
        >
          🖨️ Print Receipt
        </button>
        
        <Show when={props.onEmail}>
          <button
            onClick={props.onEmail}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'var(--secondary-color)',
              color: 'white',
              border: 'none',
              'border-radius': 'var(--border-radius-sm)',
              cursor: 'pointer',
              'font-weight': '600'
            }}
          >
            📧 Email Receipt
          </button>
        </Show>
        
        <Show when={props.onClose}>
          <button
            onClick={props.onClose}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'var(--border-color)',
              color: 'var(--text-primary)',
              border: 'none',
              'border-radius': 'var(--border-radius-sm)',
              cursor: 'pointer',
              'font-weight': '600'
            }}
          >
            Close
          </button>
        </Show>
      </div>
    </div>
  );
};

export default ReceiptGenerator;