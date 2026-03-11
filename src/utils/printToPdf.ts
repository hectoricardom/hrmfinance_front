import { inventoryStore } from "../modules/inventory/stores/inventoryStore";
import { generateBulkHtml } from "./bulkPdfUtils";
import { getShippingMethodDisplayName } from "../services/shippingMethodService";
import { devLog } from "../services/utils";
//import { generateCompactBulkSummary, generateBulkOverview } from "./compactBulkPdf";

// Fallback: Use browser print to generate PDF
export const generatePrintablePDF = (invoiceData: any, t: any) => {
  try {
    devLog('Generating printable PDF...');

    
    //devLog(invoiceData)
    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    if (!printWindow) {
      alert('Please allow popups to generate PDF');
      return;
    }
    
    const customer = invoiceData.shipper_consignee || {};


    let stor = inventoryStore.getLocationById(invoiceData?.store);
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${invoiceData.invoice || 'N/A'}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            line-height: 1.6;
          }
          .header {
            display: flex;
            justify-content: space-between;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          .company {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
          }
          .invoice-info {
            text-align: right;
          }
          .section {
            margin: 20px 0;
          }
          .section-title {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 10px;
            color: #333;
          }
          .customer-info {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin: 10px 0;
             font-size: 13px;
          }
          .flex{
            display: flex;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f2f2f2;
            font-weight: bold;
            font-size: 13px;
          }
          td{
           font-size: 12px;
          }
          .total-row {
            font-weight: bold;
            font-size: 16px;
            background-color: #e8f4fd;
          }
          .discount-row {
            background-color: #e7f5ff;
            border-left: 4px solid #28a745;
          }
          .discount-badge {
            display: inline-block;
            padding: 2px 8px;
            background-color: #28a745;
            color: white;
            border-radius: 12px;
            font-size: 10px;
            font-weight: bold;
            margin-left: 8px;
          }
          .subtotal-separator {
            border-top: 2px solid #ddd;
            padding-top: 8px;
          }
          .certification-section {
            page-break-inside: avoid;
            break-inside: avoid;
            orphans: 3;
            widows: 3;
          }
          .page-break-before {
            page-break-before: always;
            break-before: page;
          }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
            .certification-section {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              orphans: 3;
              widows: 3;
            }
            .page-break-before {
              page-break-before: always !important;
              break-before: page !important;
            }
            /* Force page break if certification section would be split */
            @page {
              margin: 0.5in;
              orphans: 3;
              widows: 3;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="company">HRM FINANCE</div>
            <div>${t('common.store')}: ${stor?.name || invoiceData?.store || 'N/A'}</div>
            <div>${t('common.orderId')}: ${invoiceData.ssg_sorder_key || 'N/A'}</div>
             ${customer.cid? `
            ${invoiceData.shippingMethod ? `<div>${t('common.shipping')}: ${getShippingMethodDisplayName(invoiceData.shippingMethod)}</div>` : ''}
            `:``}
            </div>
          <div class="invoice-info">
            <div style="font-size: 18px; font-weight: bold;">${t('common.invoice').toUpperCase()}</div>
            <div style="font-size: 16px; margin: 5px 0;">${invoiceData.invoice || 'N/A'}</div>
            <div>${invoiceData.createDate ? new Date(invoiceData.createDate).toLocaleDateString() : 'N/A'}</div>
            <div style="margin-top: 10px;">
              <span style="padding: 4px 8px; background: ${invoiceData.isCompleted ? '#d4edda' : '#fff3cd'}; border-radius: 10px; font-size: 12px;">
                ${invoiceData.isCompleted ? t('invoices.completed').toUpperCase() : t('invoices.pending').toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="customer-info">
            <div><strong>${t('invoices.senderInformation')}:</strong> ${customer.name || 'N/A'}</div>
            ${customer.phoneNumberS ? `<div><strong>${t('invoices.phoneNumber')}:</strong> ${customer.phoneNumberS}</div>` : ''}
          
          </div>
          ${customer.cid? `
          <div class="customer-info">
            <div><strong>${t('invoices.receiptInformation')}:</strong> ${[customer.firstName, customer.middleName, customer.lastName, customer.lastName2].filter(Boolean).join(' ') || 'N/A'}</div>
            <div><strong>${t('invoices.phoneNumber')}:</strong> ${customer.phoneNumber || 'N/A'}</div>
            <div><strong>${t('invoices.id')}:</strong> ${customer.cid || 'N/A'}</div>
            ${customer.address ? `<div><strong>${t('invoices.address')}:</strong> ${customer.address}</div>` : ''}
          </div>
        </div>`
        : ``}

        ${invoiceData.bulks && invoiceData.bulks.length > 0 ? `
        <div class="section">
          <div class="section-title">Información de Bultos</div>
          ${invoiceData.bulks.map((bulk: any) =>  
            generateBulkHtml(
              bulk,
              invoiceData.products || [],
              invoiceData.reservas || [],
              invoiceData.services || [],
              t,
              false // Detailed view matching InvoiceDisplay exactly
            )
          ).join('')}
        </div>
        ` : ''}

         ${!invoiceData.bulks.length? ` ${renderListServ(invoiceData, t)}` : ''}

        <div class="section flex">
          ${invoiceData?.paymentMethods ? `
        <div class="section" style="margin-right: auto; width: 48%">
          <div class="section-title">${t('common.paymentMethods')}</div>
          <div class="customer-info">
            ${invoiceData.paymentMethods.cash > 0 ? `<div><strong>💵 ${t('common.cash')}:</strong> $${invoiceData.paymentMethods?.cash?.toFixed(2)}</div>` : ''}
            ${invoiceData.paymentMethods.zelle > 0 ? `<div><strong>📱 Zelle:</strong> $${invoiceData.paymentMethods?.zelle?.toFixed(2)}</div>` : ''}
            ${invoiceData.paymentMethods.creditCard > 0 ? `<div><strong>💳 ${t('common.creditCard')}:</strong> $${invoiceData.paymentMethods?.creditCard?.toFixed(2)}</div>` : ''}
            ${invoiceData.paymentMethods?.exemptTaxOnCash && invoiceData?.paymentMethods.cash > 0 && invoiceData?.taxSavings > 0 ? `
              <div style="margin-top: 10px; padding: 8px; background-color: #e7f5ff; border-radius: 4px; font-size: 12px; font-style: italic;">
                * ${t('common.taxExemptNote')} ${t('common.youSaved')} $${invoiceData?.taxSavings.toFixed(2)}!
              </div>
            ` : ''}
          </div>
        </div>
        ` : ''}
        <div class="section ">
          <div class="section-title">${t('common.totals') || 'Totales'}</div>
          <table style="margin-left: auto; width: width: 48%">
            <!-- Detailed Breakdown -->
            ${invoiceData.productSubtotal && invoiceData.productSubtotal > 0 ? `
            <tr>
              <td style="padding-left: 15px;">📦 ${t('invoices.productsSubtotal')}:</td>
              <td style="text-align: right;">$${invoiceData.productSubtotal.toFixed(2)}</td>
            </tr>
            ` : ''}
            ${invoiceData.reservaSubtotal && invoiceData.reservaSubtotal > 0 ? `
            <tr>
              <td style="padding-left: 15px;">📋 ${t('invoices.reservationsSubtotal')}:</td>
              <td style="text-align: right;">$${invoiceData.reservaSubtotal.toFixed(2)}</td>
            </tr>
            ` : ''}
            ${invoiceData.serviceSubtotal && invoiceData.serviceSubtotal > 0 ? `
            <tr>
              <td style="padding-left: 15px;">🔧 ${t('invoices.servicesSubtotal')}:</td>
              <td style="text-align: right;">$${invoiceData.serviceSubtotal.toFixed(2)}</td>
            </tr>
            ` : ''}
            ${invoiceData.transportTotal && invoiceData.transportTotal > 0 ? `
            <tr>
              <td style="padding-left: 15px;">🚚 ${t('invoices.transportTotal')}:</td>
              <td style="text-align: right;">$${invoiceData.transportTotal.toFixed(2)}</td>
            </tr>
            ` : ''}

            <!-- Subtotal Before Discount -->
            <tr class="subtotal-separator">
              <td><strong>${t('common.subtotal')}:</strong></td>
              <td style="text-align: right;"><strong>$${(invoiceData.subtotalBeforeTax || 0).toFixed(2)}</strong></td>
            </tr>

            <!-- Discount (if applicable) -->
            ${invoiceData.paymentMethods?.discount && invoiceData.paymentMethods.discount > 0 ? `
            <tr class="discount-row">
              <td style="color: #28a745; padding-left: 15px;">
                <strong>🏷️ ${t('pos.discount') || 'Descuento'}</strong>
                <span class="discount-badge">AHORRO</span>
                <div style="font-size: 11px; font-style: italic; color: #666; margin-top: 2px;">
                  Descuento aplicado a su compra
                </div>
              </td>
              <td style="text-align: right; color: #28a745; font-size: 15px;"><strong>-$${invoiceData.paymentMethods.discount.toFixed(2)}</strong></td>
            </tr>
            ` : ''}

            <!-- Subtotal After Discount (if discount exists) -->
            ${invoiceData.paymentMethods?.discount && invoiceData.paymentMethods.discount > 0 ? `
            <tr>
              <td><strong>${t('common.subtotal')} después de descuento:</strong></td>
              <td style="text-align: right;"><strong>$${((invoiceData.subtotalBeforeTax || 0) - (invoiceData.paymentMethods?.discount || 0)).toFixed(2)}</strong></td>
            </tr>
            ` : ''}

            <!-- Tax (if applicable) -->
            ${invoiceData.taxAmount && invoiceData.taxAmount > 0 ? `
            <tr>
              <td style="padding-left: 15px;">
                📊 ${t('common.tax')} (${invoiceData.paymentMethods?.taxPercent || 7}%)
              </td>
              <td style="text-align: right;">$${invoiceData.taxAmount.toFixed(2)}</td>
            </tr>
            ` : ''}

            <!-- Tax Savings (if applicable) -->
            ${invoiceData.taxSavings && invoiceData.taxSavings > 0 ? `
            <tr style="background-color: #fff3cd;">
              <td style="font-size: 11px; padding-left: 15px; color: #856404;">
                💰 Ahorro por pago en efectivo
              </td>
              <td style="text-align: right; font-size: 11px; color: #856404;">-$${invoiceData.taxSavings.toFixed(2)}</td>
            </tr>
            ` : ''}

            <!-- Grand Total -->
            <tr class="total-row" style="border-top: 3px double #333;">
              <td><strong>${t('invoices.total').toUpperCase()}:</strong></td>
              <td style="text-align: right;"><strong>$${(invoiceData.total || 0).toFixed(2)}</strong></td>
            </tr>
          </table>

          <!-- Calculation Explanation (if discount exists) 
          ${invoiceData.paymentMethods?.discount && invoiceData.paymentMethods.discount > 0 ? `
          <div style="margin-top: 15px; padding: 12px; background-color: #f0f9ff; border-left: 4px solid #28a745; border-radius: 4px; font-size: 12px;">
            <div style="font-weight: bold; margin-bottom: 5px; color: #333;">
              💡 Explicación del Total:
            </div>
            <div style="color: #555; line-height: 1.6;">
              1. Subtotal de artículos: <strong>$${(invoiceData.subtotalBeforeTax || 0).toFixed(2)}</strong><br/>
              2. Se aplicó un descuento de: <strong style="color: #28a745;">-$${invoiceData.paymentMethods.discount.toFixed(2)}</strong><br/>
              3. Nuevo subtotal: <strong>$${((invoiceData.subtotalBeforeTax || 0) - invoiceData.paymentMethods.discount).toFixed(2)}</strong><br/>
              ${invoiceData.taxAmount > 0 ? `4. Impuesto (${invoiceData.paymentMethods?.taxPercent || 7}%): <strong>$${invoiceData.taxAmount.toFixed(2)}</strong><br/>` : ''}
              ${invoiceData.taxSavings > 0 ? `5. Ahorro por pago en efectivo: <strong style="color: #856404;">-$${invoiceData.taxSavings.toFixed(2)}</strong><br/>` : ''}
              <div style="margin-top: 5px; padding-top: 5px; border-top: 1px solid #ddd;">
                <strong>Total a pagar: $${(invoiceData.total || 0).toFixed(2)}</strong>
              </div>
            </div>
          </div>
          ` : ''}
          -->
        </div>
        </div>



        <!-- Certification Section -->
        <div class="certification-section" style="margin-top: 40px; padding: 20px; border: 2px solid #333; background: #f9f9f9;">
          <div style="text-align: center; font-weight: bold; font-size: 14px; margin-bottom: 15px; text-transform: uppercase;">
            CERTIFICACIÓN DEL EMBARCADOR
          </div>
          <div style="font-size: 11px; line-height: 1.4; text-align: justify; margin-bottom: 20px;">
            <p><strong>Certifico que no envío sustancias ni productos prohibidos por las leyes y las aduanas de USA y Cuba, como por ejemplo:</strong> drogas, armas, explosivos, cigarrillos electrónicos, drones profesionales, joyas, prendas, dinero en efectivo, semillas, narcóticos, fármacos controlados, productos agrícolas de tipo herbicidas o antifúngicidas, ningún tipo de producto perecedero que necesite refrigeración.</p>
            
            <p><strong>Entiendo que al llenar este formulario, al enviar alguna de las sustancias o productos antes descritos mi carga puede ser decamisada completa o parcialmente por las aduanas de Cuba o USA sin derecho a reclamo ni compensación,</strong> de parte mía como embarcador, ni de la persona a quien envío (consignatario).</p>
            
           </div>
          
          <!-- Signature Section -->
          <div style="display: flex; justify-content: space-between; margin-top: 30px;">
            <div style="width: 45%; text-align: center;">
              <div style="border-bottom: 2px solid #333; margin-bottom: 10px; height: 40px;"></div>
              <div style="font-size: 10px; font-weight: bold;">FIRMA DEL EMBARCADOR / SHIPPER SIGNATURE</div>
              <div style="font-size: 10px; margin-top: 5px;">${customer.name || 'N/A'}</div>
            </div>
            <div style="width: 45%; text-align: center;">
              <div style="border-bottom: 2px solid #333; margin-bottom: 10px; height: 40px;"></div>
              <div style="font-size: 10px; font-weight: bold;">FECHA / DATE</div>
              <div style="font-size: 10px; margin-top: 5px;">${new Date().toLocaleDateString()}</div>
            </div>
          </div>
        </div>

        <div style="margin-top: 40px; text-align: center; color: #666; font-size: 12px;">
          <p>${t('common.thankForChoosingUs')}</p>
          <p>${t('common.generatedOn')} ${new Date().toLocaleDateString()}</p>
        </div>

        <script>
          // Check if certification section needs page break
          function checkCertificationPageBreak() {
            const certSection = document.querySelector('.certification-section');
            if (!certSection) return;
            
            // Reset any previous page break class to get accurate measurements
            certSection.classList.remove('page-break-before');
            
            // Force a layout recalculation
            certSection.offsetHeight;
            
            const rect = certSection.getBoundingClientRect();
            const certHeight = rect.height;
            const certTop = rect.top;
            
            // Estimate print page height (assuming standard letter size at 96 DPI)
            // Standard letter: 11 inches - 1 inch margins = 10 inches usable
            // At 96 DPI: 10 * 96 = 960px usable height per page
            const printPageHeight = 960;
            const pageMargin = 48; // 0.5 inch margins
            
            // Calculate current position on the page
            const currentPagePosition = certTop % printPageHeight;
            const remainingPageSpace = printPageHeight - currentPagePosition - pageMargin;
            
            // Add some buffer space (50px) to ensure comfortable fit
            const requiredSpace = certHeight + 50;
            
            false && devLog('Certification section analysis:', {
              certHeight,
              certTop,
              currentPagePosition,
              remainingPageSpace,
              requiredSpace,
              needsPageBreak: requiredSpace > remainingPageSpace
            });
            
            // Only add page break if certification truly won't fit
            if (requiredSpace > remainingPageSpace && remainingPageSpace < printPageHeight * 0.4) {
              // devLog('Adding page break for certification section');
              certSection.classList.add('page-break-before');
            }
          }
          
          // Run check when page loads and before printing
          document.addEventListener('DOMContentLoaded', function() {
            // Delay to ensure all content is rendered
            setTimeout(checkCertificationPageBreak, 100);
          });
          window.addEventListener('beforeprint', checkCertificationPageBreak);
        </script>

        <div class="no-print" style="margin-top: 30px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
            ${t('common.printSavePDF')}
          </button>
          <button onclick="window.close()" style="padding: 10px 20px; font-size: 16px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">
            ${t('common.close')}
          </button>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Auto-focus the print window
    printWindow.focus();
    
    devLog('Printable PDF window opened');
    
  } catch (error) {
    console.error('Error generating printable PDF:', error);
    alert('Error generating printable PDF: ' + error.message);
  }
};





/*
 / SHIPPER CERTIFICATION
   <p><strong>I certify that I am not shipping substances or products prohibited by US and Cuban laws and customs, such as:</strong> drugs, weapons, explosives, electronic cigarettes, professional drones, jewelry, clothing, cash, seeds, narcotics, controlled pharmaceuticals, agricultural products such as herbicides or antifungicides, any type of perishable product that needs refrigeration.</p>
            
            <p><strong>I understand that by filling out this form, by sending any of the substances or products described above, my cargo may be seized completely or partially by Cuban or US customs without the right to claim or compensation,</strong> on my part as a shipper, nor from the person to whom I send (consignee).</p>
        

*/






const renderInternationalShipmentItems = (invoiceData: any, t: any) => {
  if (!invoiceData.shipmentItems || invoiceData.shipmentItems.length === 0) {
    return '';
  }

  return `
    <div class="section">
      <div class="section-title">📦 ${t('internationalShipping.shipmentItems') || 'Artículos de Envío (Pies Cúbicos)'}</div>
      <table>
        <thead>
          <tr>
            <th>${t('invoices.description') || 'Descripción'}</th>
            <th style="text-align: center;">${t('invoices.qty') || 'Cant'}</th>
            <th style="text-align: center;">${t('internationalShipping.dimensions') || 'Dimensiones'}</th>
            <th style="text-align: right;">ft³</th>
            <th style="text-align: right;">${t('internationalShipping.totalCubicFeet') || 'Total ft³'}</th>
            <th style="text-align: right;">$/ft³</th>
            <th style="text-align: right;">${t('common.subtotal') || 'Subtotal'}</th>
            <th style="text-align: right;">${t('invoices.arancel') || 'Arancel'}</th>
            <th style="text-align: right;">${t('invoices.total') || 'Total'}</th>
          </tr>
        </thead>
        <tbody>
          ${invoiceData.shipmentItems.map((item: any) => `
            <tr>
              <td>${item.description || 'N/A'}</td>
              <td style="text-align: center;">${item.qty || 1}</td>
              <td style="text-align: center; font-family: monospace; font-size: 11px;">
                ${item.dimensions?.height || 0}"×${item.dimensions?.width || 0}"×${item.dimensions?.depth || 0}"
              </td>
              <td style="text-align: right; font-family: monospace;">
                ${(item.dimensions?.cubicFeet || 0).toFixed(3)}
              </td>
              <td style="text-align: right; font-weight: 600;">
                ${(item.totalCubicFeet || 0).toFixed(3)}
              </td>
              <td style="text-align: right;">
                $${(item.pricePerCubicFoot || 0).toFixed(2)}
              </td>
              <td style="text-align: right;">
                $${(item.subtotal || 0).toFixed(2)}
              </td>
              <td style="text-align: right; color: #dc2626;">
                $${(item.tariff || 0).toFixed(2)}
              </td>
              <td style="text-align: right; font-weight: 600;">
                $${(item.total || 0).toFixed(2)}
              </td>
            </tr>
          `).join('')}
          <tr style="background: #f9fafb; font-weight: 600;">
            <td colspan="4" style="text-align: right;">Totales:</td>
            <td style="text-align: right; color: #1e40af;">
              ${invoiceData.shipmentItems.reduce((sum: number, item: any) => sum + (item.totalCubicFeet || 0), 0).toFixed(3)} ft³
            </td>
            <td></td>
            <td style="text-align: right;">
              $${invoiceData.shipmentItems.reduce((sum: number, item: any) => sum + (item.subtotal || 0), 0).toFixed(2)}
            </td>
            <td style="text-align: right; color: #dc2626;">
              $${invoiceData.shipmentItems.reduce((sum: number, item: any) => sum + (item.tariff || 0), 0).toFixed(2)}
            </td>
            <td style="text-align: right; color: #059669;">
              $${invoiceData.shipmentItems.reduce((sum: number, item: any) => sum + (item.total || 0), 0).toFixed(2)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
};

const renderListServ = (invoiceData: any, t: any) =>{

  return `
  ${renderInternationalShipmentItems(invoiceData, t)}
  ${invoiceData.products && invoiceData.products.length > 0 ? `
        <div class="section">
          <div class="section-title">${t('invoices.products')}</div>
          <table>
            <thead>
              <tr>
                <th>${t('invoices.code')}</th>
                <th>${t('invoices.description')}</th>
                <th>${t('invoices.qty')}</th>
                <th>${t('invoices.unitPrice')}</th>
                <th>${t('invoices.total')}</th>
              </tr>
            </thead>
            <tbody>
              ${invoiceData.products.map((item: any) => `
                <tr>
                  <td>${item.product?.code || 'N/A'}</td>
                  <td>${item.product?.label || 'N/A'}</td>
                  <td>${Math.abs(item.qty || 0).toFixed(2)}</td>
                  <td>$${parseFloat(item.salePrice || 0).toFixed(2)}</td>
                  <td>$${(item.total || (Math.abs(item.qty || 0) * parseFloat(item.salePrice || 0))).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}
       

        ${invoiceData.reservas && invoiceData.reservas.length > 0 ? `
        <div class="section">
          <div class="section-title">${t('invoices.reservations')}</div>
          <table>
            <thead>
              <tr>
                <th>${t('invoices.type')}</th>
                <th>${t('invoices.qty')}</th>
                <th>${t('invoices.unitPrice')}</th>
                <th>${t('invoices.arancel')}</th>
                <th>${t('invoices.total')}</th>
              </tr>
            </thead>
            <tbody>
              ${invoiceData.reservas.map((item: any) => {
                const qty = parseFloat(item.qty || 0);
                const price = parseFloat(item.price || 0);
                const arancel = parseFloat(item.arancel || 0);
                const total = item.total || (qty * price + arancel);
                return `
                  <tr>
                    <td>${item.type || 'N/A'}</td>
                    <td>${qty.toFixed(2)}</td>
                    <td>$${price.toFixed(2)}</td>
                    <td>${arancel > 0 ? '$' + arancel.toFixed(2) : '-'}</td>
                    <td>$${total.toFixed(2)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${invoiceData.services && invoiceData.services.length > 0 ? `
        <div class="section">
          <div class="section-title">${t('invoices.services')}</div>
          <table>
            <thead>
              <tr>
                <th>${t('invoices.type')}</th>
                <th>${t('invoices.qty')}</th>
                <th>${t('invoices.arancel')}</th>
                <th>${t('invoices.total')}</th>
              </tr>
            </thead>
            <tbody>
              ${invoiceData.services.map((item: any) => {
                const qty = parseFloat(item.qty || 0);
                //const price = parseFloat(item.price || 0);
                const arancel = parseFloat(item.arancel || item.price || 0);
                const total = item.total || (qty *  arancel);

               
                return `
                  <tr>
                    <td>${item.type || 'N/A'}</td>
                    <td>${qty.toFixed(2)}</td>
                    <td>${arancel > 0 ? '$' + arancel.toFixed(2) : '-'}</td>
                    <td>$${total.toFixed(2)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}
  `
}