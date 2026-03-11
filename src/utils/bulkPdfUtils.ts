import { InvoiceBulk, InvoiceProduct, InvoiceReserva, InvoiceService } from '../modules/invoice/types/invoiceTypes';

// Utility functions for bulk PDF generation
export const parseFloat2 = (value: any): number => {
  return parseFloat(value?.toString() || '0') || 0;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

// Calculate bulk totals
export const calculateBulkTotals = (
  bulk: InvoiceBulk,
  products: InvoiceProduct[],
  reservas: InvoiceReserva[],
  services: InvoiceService[]
) => {
  // Filter items for this bulk
  const bulkProducts = products.filter(p => p.bulkId === bulk?.id);
  const bulkReservas = reservas.filter(r => r.bulkId === bulk?.id);
  const bulkServices = services.filter(s => s.bulkId === bulk?.id);
  
  // Calculate totals
  const productsTotal = bulkProducts.reduce((sum, p) => sum + (Math.abs(p.qty) * parseFloat2(p.salePrice)), 0);
  const reservasTotal = bulkReservas.reduce((sum, r) => sum + ((parseFloat2(r.qty) || 0) * (parseFloat2(r.price) || 0) + (r.arancel ? parseFloat2(r.arancel) : 0)), 0);
  const servicesTotal = bulkServices.reduce((sum, s) => sum + ((parseFloat2(s.qty) || 0) * ((s.arancel || s.price) ? parseFloat2(s.arancel || s.price) : 0)), 0);
  const itemsTotal = productsTotal + reservasTotal + servicesTotal;
  const grandTotal = itemsTotal + (bulk?.transportCost || 20);
  
  return {
    bulkProducts,
    bulkReservas,
    bulkServices,
    productsTotal,
    reservasTotal,
    servicesTotal,
    itemsTotal,
    grandTotal
  };
};

// Generate bulk HTML for PDF - Clean design matching the image layout
export const generateBulkHtml = (
  bulk: InvoiceBulk,
  products: InvoiceProduct[],
  reservas: InvoiceReserva[],
  services: InvoiceService[],
  t: (key: string) => string,
  compact = false
) => {
  const totals = calculateBulkTotals(bulk, products, reservas, services);
  const { bulkProducts, bulkReservas, bulkServices } = totals;
  
  // Clean, professional styling matching the image
  const bulkContainerStyle = `
    background: #f5f5f5;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 20px;
  `;

  const bulkHeaderStyle = `
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 20px;
  `;

  const bulkTitleStyle = `
    margin: 0;
    font-size: 18px;
    font-weight: bold;
    color: #333;
  `;

  const bulkInfoStyle = `
    font-size: 14px;
    color: #666;
    margin-top: 4px;
  `;

  const bulkTotalStyle = `
    font-size: 24px;
    font-weight: bold;
    color: #6366f1;
    text-align: right;
  `;

  const bulkSubtotalStyle = `
    font-size: 12px;
    color: #666;
    text-align: right;
    margin-top: 4px;
  `;

  const sectionTitleStyle = `
    font-size: 16px;
    font-weight: 600;
    color: #666;
    margin: 20px 0 10px 0;
  `;

  const tableStyle = `
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 15px;
    background: white;
    border-radius: 6px;
    overflow: hidden;
   
  `;

  const thStyle = `
    background: #f8f9fa;
    padding: 12px;
    text-align: left;
    font-weight: 600;
    font-size: 12px;
    color: #666;
    text-transform: uppercase;
    
  `;

  const tdStyle = `
    padding: 12px;
   
    font-size: 14px;
    color: #333;
  `;
      

  return `
    <div style="${bulkContainerStyle}">
      <!-- Bulk Header - Clean design matching the image -->
      <div style="${bulkHeaderStyle}">
        <div>
          <div style="${bulkTitleStyle}">📦 ${bulk?.name}</div>
          <div style="${bulkInfoStyle}">
            Tipo: <strong>${bulk?.type}</strong> | Envío: ${bulk?.shippingMethod  === 'aereo' ? '🛩️ Aéreo' : bulk?.shippingMethod === 'maritimo' ? '🚢 Marítimo' : bulk?.shippingMethod === 'express' ? '⚡ Aéreo Express' : ""}
          </div>
        </div>
        <div>
          <div style="${bulkTotalStyle}">${formatCurrency(totals.grandTotal)}</div>
          <div style="${bulkSubtotalStyle}">
            Artículos: ${formatCurrency(totals.itemsTotal)} + Transporte: ${formatCurrency(bulk?.transportCost || 20)}
          </div>
        </div>
      </div>
      
      <!-- Products Section -->
      ${bulkProducts.length > 0 ? `
        <div style="${sectionTitleStyle}">Productos (${bulkProducts.length})</div>
        <table style="${tableStyle}">
          <thead>
            <tr>
              <th style="${thStyle}">CÓDIGO</th>
              <th style="${thStyle}">DESCRIPCIÓN</th>
              <th style="${thStyle}; text-align: center;">CANT.</th>
              <th style="${thStyle}; text-align: right;">PRECIO UNITARIO</th>
              <th style="${thStyle}; text-align: right;">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${bulkProducts.map((item: any) => `
              <tr>
                <td style="${tdStyle}">${item.product.code}</td>
                <td style="${tdStyle}">${item.product.label}</td>
                <td style="${tdStyle}; text-align: center;">${Math.abs(item.qty)}</td>
                <td style="${tdStyle}; text-align: right;">${formatCurrency(item.salePrice)}</td>
                <td style="${tdStyle}; text-align: right;">
                  ${formatCurrency(Math.abs(item.qty) * parseFloat2(item.salePrice))}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}
      
      <!-- Reservations Section -->
      ${bulkReservas.length > 0 ? `
        <div style="${sectionTitleStyle}">Reservaciones (${bulkReservas.length})</div>
        <table style="${tableStyle}">
          <thead>
            <tr>
              <th style="${thStyle}">TIPO</th>
              <th style="${thStyle}; text-align: center;">CANT.</th>
              <th style="${thStyle}; text-align: right;">PRECIO UNITARIO</th>
              <th style="${thStyle}; text-align: right;">ARANCEL</th>
              <th style="${thStyle}; text-align: right;">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${bulkReservas.map((item: any) => `
              <tr>
                <td style="${tdStyle}">${item.type}</td>
                <td style="${tdStyle}; text-align: center;">${item.qty}</td>
                <td style="${tdStyle}; text-align: right;">${formatCurrency(item.price)}</td>
                <td style="${tdStyle}; text-align: right;">${item.arancel ? formatCurrency(item.arancel) : '-'}</td>
                <td style="${tdStyle}; text-align: right;">
                  ${formatCurrency((parseFloat2(item.qty) || 0) * (parseFloat2(item.price) || 0) + (item.arancel ? parseFloat2(item.arancel) : 0))}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}
      
      <!-- Services Section -->
      ${bulkServices.length > 0 ? `
        <div style="${sectionTitleStyle}">Servicios (${bulkServices.length})</div>
        <table style="${tableStyle}">
          <thead>
            <tr>
              <th style="${thStyle}">TIPO</th>
              <th style="${thStyle}; text-align: center;">CANT.</th>
              <th style="${thStyle}; text-align: right;">ARANCEL</th>
              <th style="${thStyle}; text-align: right;">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${bulkServices.map((item: any) => `
              <tr>
                <td style="${tdStyle}">${item.type}</td>
                <td style="${tdStyle}; text-align: center;">${parseFloat2(item.qty).toFixed(2)}</td>
                <td style="${tdStyle}; text-align: right;">${(item.arancel || item.price) ? formatCurrency(item.arancel || item.price) : '-'}</td>
                <td style="${tdStyle}; text-align: right;">
                  ${formatCurrency((parseFloat2(item.qty) || 0) * ((item.arancel || item.price) ? parseFloat2(item.arancel || item.price) : 0))}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}
    </div>
  `;
};