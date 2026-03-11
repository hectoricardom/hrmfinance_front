import { InvoiceBulk, InvoiceProduct, InvoiceReserva, InvoiceService } from '../modules/invoice/types/invoiceTypes';
import { generateBulkHtml, calculateBulkTotals } from './bulkPdfUtils';

// Generate a compact bulk summary for PDFs where space is limited
export const generateCompactBulkSummary = (
  bulks: InvoiceBulk[],
  products: InvoiceProduct[],
  reservas: InvoiceReserva[],
  services: InvoiceService[],
  t: (key: string) => string
) => {
  if (!bulks || bulks.length === 0) return '';

  // Calculate overall totals
  const totalTransportCost = bulks.reduce((sum, bulk) => sum + (bulk?.transportCost || 20), 0);
  const totalItems = products.length + reservas.length + services.length;
  
  let totalValue = 0;
  bulks.forEach(bulk => {
    const totals = calculateBulkTotals(bulk, products, reservas, services);
    totalValue += totals.grandTotal;
  });

  return `
    <div class="section">
      <div class="section-title">${t('invoices.bulkSummary')}</div>
      
      <!-- Summary Stats -->
      <div style="display: flex; justify-content: space-between; background: #f8f9fa; padding: 10px; border-radius: 5px; margin-bottom: 15px; font-size: 11px;">
        <div style="text-align: center;">
          <div style="font-weight: bold; font-size: 14px; color: #2563eb;">${bulks.length}</div>
          <div>${t('invoices.totalBulks')}</div>
        </div>
        <div style="text-align: center;">
          <div style="font-weight: bold; font-size: 14px; color: #2563eb;">${totalItems}</div>
          <div>${t('invoices.totalItems')}</div>
        </div>
        <div style="text-align: center;">
          <div style="font-weight: bold; font-size: 14px; color: #2563eb;">$${totalTransportCost.toFixed(2)}</div>
          <div>${t('invoices.totalTransport')}</div>
        </div>
        <div style="text-align: center;">
          <div style="font-weight: bold; font-size: 14px; color: #2563eb;">$${totalValue.toFixed(2)}</div>
          <div>${t('invoices.totalValue')}</div>
        </div>
      </div>
      
      <!-- Compact Bulk List -->
      ${bulks.map((bulk: any) => 
        generateBulkHtml(
          bulk,
          products,
          reservas,
          services,
          t,
          true // compact mode = true for space-efficient display
        )
      ).join('')}
    </div>
  `;
};

// Generate bulk-only section (without individual items breakdown)
export const generateBulkOverview = (
  bulks: InvoiceBulk[],
  products: InvoiceProduct[],
  reservas: InvoiceReserva[],
  services: InvoiceService[],
  t: (key: string) => string
) => {
  if (!bulks || bulks.length === 0) return '';

  return `
    <div class="section">
      <div class="section-title">${t('invoices.bulkOverview')}</div>
      <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
        <thead>
          <tr>
            <th style="border: 1px solid #ddd; padding: 6px; background: #f2f2f2; text-align: left;">${t('invoices.bulkName')}</th>
            <th style="border: 1px solid #ddd; padding: 6px; background: #f2f2f2; text-align: center;">${t('invoices.type')}</th>
            <th style="border: 1px solid #ddd; padding: 6px; background: #f2f2f2; text-align: center;">${t('invoices.method')}</th>
            <th style="border: 1px solid #ddd; padding: 6px; background: #f2f2f2; text-align: center;">${t('invoices.items')}</th>
            <th style="border: 1px solid #ddd; padding: 6px; background: #f2f2f2; text-align: right;">${t('invoices.transport')}</th>
            <th style="border: 1px solid #ddd; padding: 6px; background: #f2f2f2; text-align: right;">${t('invoices.total')}</th>
          </tr>
        </thead>
        <tbody>
          ${bulks.map((bulk: any) => {
            const totals = calculateBulkTotals(bulk, products, reservas, services);
            const itemCount = totals.bulkProducts.length + totals.bulkReservas.length + totals.bulkServices.length;
            
            return `
              <tr>
                <td style="border: 1px solid #ddd; padding: 6px;">📦 ${bulk?.name || 'N/A'}</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${bulk?.type || 'N/A'}</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${bulk?.shippingMethod === 'AEREO' ? 'Aéreo' : 'Marítimo'}</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${itemCount}</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">$${(bulk?.transportCost || 20).toFixed(2)}</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: right; font-weight: bold;">$${totals.grandTotal.toFixed(2)}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
};