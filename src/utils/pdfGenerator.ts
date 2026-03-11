import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface PDFGeneratorOptions {
  filename?: string;
  orientation?: 'portrait' | 'landscape';
  format?: 'a4' | 'letter';
  scale?: number;
  imageQuality?: number;
}

export const generatePDFFromElement = async (
  element: HTMLElement,
  options: PDFGeneratorOptions = {}
): Promise<void> => {
  const {
    filename = 'invoice.pdf',
    orientation = 'portrait',
    format = 'letter',
    scale = 2,
    imageQuality = 0.95
  } = options;

  try {
    // Create a canvas from the HTML element
    const canvas = await html2canvas(element, {
      scale,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    // Calculate PDF dimensions
    const imgWidth = orientation === 'portrait' ? 210 : 297; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Create PDF
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format
    });

    // Add image to PDF
    const imgData = canvas.toDataURL('image/png', imageQuality);
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

    // Save the PDF
    pdf.save(filename);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

export const generateInvoicePDF = async (
  invoiceData: any,
  t: (key: string) => string
): Promise<void> => {
  // Create a temporary container for the PDF content
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.width = '210mm'; // A4 width
  container.style.backgroundColor = 'white';
  container.style.padding = '20mm';
  container.style.fontFamily = 'Arial, sans-serif';
  
  // Generate PDF content with modern styling
  container.innerHTML = `
    <style>
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      
      .pdf-invoice {
        width: 100%;
        color: #333;
        line-height: 1.6;
      }
      
      .pdf-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 30px;
        padding-bottom: 20px;
        border-bottom: 2px solid #e0e0e0;
      }
      
      .pdf-logo-section {
        flex: 1;
      }
      
      .pdf-company-name {
        font-size: 24px;
        font-weight: bold;
        color: #2563eb;
        margin-bottom: 5px;
      }
      
      .pdf-invoice-info {
        text-align: right;
        flex: 1;
      }
      
      .pdf-status-badge {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        margin-bottom: 10px;
        background: ${invoiceData.isCompleted ? '#d4edda' : '#fff3cd'};
        color: ${invoiceData.isCompleted ? '#155724' : '#856404'};
      }
      
      .pdf-invoice-number {
        font-size: 20px;
        font-weight: bold;
        color: #333;
        margin: 10px 0;
      }
      
      .pdf-section {
        margin-bottom: 30px;
      }
      
      .pdf-section-title {
        font-size: 16px;
        font-weight: 600;
        color: #333;
        margin-bottom: 15px;
        padding-bottom: 8px;
        border-bottom: 1px solid #e0e0e0;
      }
      
      .pdf-info-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
      }
      
      .pdf-info-box {
        background: #f8f9fa;
        padding: 15px;
        border-radius: 8px;
        border: 1px solid #e9ecef;
      }
      
      .pdf-label {
        font-size: 12px;
        color: #666;
        margin-bottom: 4px;
      }
      
      .pdf-value {
        font-size: 14px;
        color: #333;
        font-weight: 500;
      }
      
      .pdf-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 10px;
      }
      
      .pdf-table th {
        background: #f8f9fa;
        padding: 12px;
        text-align: left;
        font-weight: 600;
        color: #495057;
        font-size: 12px;
        border-bottom: 2px solid #dee2e6;
      }
      
      .pdf-table td {
        padding: 12px;
        border-bottom: 1px solid #dee2e6;
        font-size: 14px;
      }
      
      .pdf-table .text-right {
        text-align: right;
      }
      
      .pdf-table .text-center {
        text-align: center;
      }
      
      .pdf-totals {
        margin-top: 30px;
        display: flex;
        justify-content: flex-end;
      }
      
      .pdf-totals-box {
        width: 300px;
      }
      
      .pdf-total-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
        font-size: 14px;
      }
      
      .pdf-grand-total {
        font-weight: bold;
        font-size: 18px;
        padding-top: 12px;
        border-top: 2px solid #dee2e6;
        color: #2563eb;
      }
      
      .pdf-payment-methods {
        margin-top: 30px;
      }
      
      .pdf-payment-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
        font-size: 14px;
      }
      
      .pdf-tax-savings {
        margin-top: 12px;
        padding: 8px;
        background-color: #e7f5ff;
        border-radius: 4px;
        font-size: 12px;
        font-style: italic;
        color: #0c5460;
      }
      
      .pdf-footer {
        margin-top: 50px;
        text-align: center;
        font-size: 12px;
        color: #666;
        padding-top: 20px;
        border-top: 1px solid #e0e0e0;
      }
      
      @media print {
        .pdf-invoice {
          width: 100%;
        }
      }
    </style>
    
    <div class="pdf-invoice">
      <!-- Header -->
      <div class="pdf-header">
        <div class="pdf-logo-section">
          <div class="pdf-company-name">HRM Finance</div>
          <div style="font-size: 12px; color: #666;">
            ${t('common.location')}: <strong>${invoiceData.store}</strong><br>
            ${t('invoices.id')}: <strong>${invoiceData.ssg_sorder_key}</strong><br>
            ${invoiceData.shippingMethod ? `${t('common.shippingMethod')}: <strong>${invoiceData.shippingMethod === 'aereo' ? '✈️ ' + t('common.air') : '🚢 ' + t('common.sea')}</strong>` : ''}
          </div>
        </div>
        
        <div class="pdf-invoice-info">
          <div class="pdf-status-badge">
            ${invoiceData.isCompleted ? t('invoices.completed').toUpperCase() : t('invoices.pending').toUpperCase()}
          </div>
          <div style="font-size: 24px; font-weight: bold; color: #333;">
            ${t('common.invoice').toUpperCase()}
          </div>
          <div class="pdf-invoice-number">${invoiceData.invoice}</div>
          <div style="font-size: 12px; color: #666;">
            ${new Date(invoiceData.createDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
        </div>
      </div>
      
      <!-- Customer Information -->
      <div class="pdf-section">
        <h3 class="pdf-section-title">${t('invoices.senderInformation')}</h3>
        <div class="pdf-info-box" style="margin-bottom: 20px;">
          <div class="pdf-label">${t('invoices.customerName')}</div>
          <div class="pdf-value">${invoiceData.shipper_consignee.name}</div>
          ${invoiceData.shipper_consignee.phoneNumberS ? `
            <div style="margin-top: 8px;">
              <span class="pdf-label">${t('invoices.altPhone')}:</span>
              <span class="pdf-value">${invoiceData.shipper_consignee.phoneNumberS}</span>
            </div>
          ` : ''}
        </div>
        <h3 class="pdf-section-title">${t('invoices.senderInformation')}</h3>
        <div class="pdf-info-box" style="margin-bottom: 20px;">
          <div class="pdf-label">${t('invoices.customerName')}</div>
          <div class="pdf-value">${invoiceData.shipper_consignee.name}</div>
          ${invoiceData.shipper_consignee.phoneNumberS ? `
            <div style="margin-top: 8px;">
              <span class="pdf-label">${t('invoices.altPhone')}:</span>
              <span class="pdf-value">${invoiceData.shipper_consignee.phoneNumberS}</span>
            </div>
          ` : ''}
        </div>

        <h3 class="pdf-section-title">${t('invoices.receiptInformation')}</h3>
        <div class="pdf-info-grid">
          <div class="pdf-info-box">
            <div>
              <div class="pdf-label">${t('invoices.customerName')}</div>
              <div class="pdf-value">
                ${invoiceData.shipper_consignee.firstName} 
                ${invoiceData.shipper_consignee.middleName || ''} 
                ${invoiceData.shipper_consignee.lastName} 
                ${invoiceData.shipper_consignee.lastName2 || ''}
              </div>
            </div>
            
            <div style="margin-top: 12px;">
              <div class="pdf-label">${t('invoices.id')}</div>
              <div class="pdf-value">${invoiceData.shipper_consignee.cid}</div>
            </div>
            
            <div style="margin-top: 12px;">
              <div class="pdf-label">${t('invoices.passport')}</div>
              <div class="pdf-value">${invoiceData.shipper_consignee.passport || 'N/A'}</div>
            </div>
          </div>
          
          <div class="pdf-info-box">
            <div>
              <div class="pdf-label">${t('invoices.phoneNumber')}</div>
              <div class="pdf-value">${invoiceData.shipper_consignee.phoneNumber}</div>
            </div>
            
            <div style="margin-top: 12px;">
              <div class="pdf-label">${t('invoices.address')}</div>
              <div class="pdf-value">
                ${invoiceData.shipper_consignee.address ? 
                  invoiceData.shipper_consignee.address.split(',').map(line => line.trim()).join('<br>') :
                  `${invoiceData.shipper_consignee.ybstreet || ''} #${invoiceData.shipper_consignee.ybstreetNo || ''}<br>
                  ${t('invoices.between')} ${invoiceData.shipper_consignee.ybbetwen1 || ''} ${t('invoices.and')} ${invoiceData.shipper_consignee.ybbetwen2 || ''}<br>
                  ${invoiceData.shipper_consignee.ybreparto || ''}, ${invoiceData.shipper_consignee.ybcity || ''}<br>
                  ${invoiceData.shipper_consignee.ybestate || ''}, ${invoiceData.shipper_consignee.nacionality || ''}`
                }
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Products Section -->
      ${invoiceData.products && invoiceData.products.length > 0 ? `
        <div class="pdf-section">
          <h3 class="pdf-section-title">${t('invoices.products')}</h3>
          <table class="pdf-table">
            <thead>
              <tr>
                <th>${t('invoices.code')}</th>
                <th>${t('invoices.description')}</th>
                <th class="text-center">${t('invoices.qty')}</th>
                <th class="text-right">${t('invoices.unitPrice')}</th>
                <th class="text-right">${t('invoices.total')}</th>
              </tr>
            </thead>
            <tbody>
              ${invoiceData.products.map((item: any) => `
                <tr>
                  <td>${item.product.code}</td>
                  <td>${item.product.label}</td>
                  <td class="text-center">${Math.abs(item.qty)}</td>
                  <td class="text-right">$${parseFloat(item.salePrice).toFixed(2)}</td>
                  <td class="text-right">$${(item.total || (Math.abs(item.qty) * parseFloat(item.salePrice))).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}
      
      <!-- Reservations Section -->
      ${invoiceData.reservas && invoiceData.reservas.length > 0 ? `
        <div class="pdf-section">
          <h3 class="pdf-section-title">${t('invoices.reservations')}</h3>
          <table class="pdf-table">
            <thead>
              <tr>
                <th>${t('invoices.type')}</th>
                <th class="text-center">${t('invoices.qty')}</th>
                <th class="text-right">${t('invoices.unitPrice')}</th>
                <th class="text-right">${t('invoices.arancel')}</th>
                <th class="text-right">${t('invoices.total')}</th>
              </tr>
            </thead>
            <tbody>
              ${invoiceData.reservas.map((item: any) => `
                <tr>
                  <td>${item.type}</td>
                  <td class="text-center">${parseFloat(item.qty).toFixed(2)}</td>
                  <td class="text-right">$${parseFloat(item.price).toFixed(2)}</td>
                  <td class="text-right">$${parseFloat(item.arancel || 0).toFixed(2)}</td>
                  <td class="text-right">$${(item.total || (parseFloat(item.qty) * parseFloat(item.price) + parseFloat(item.arancel || 0))).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}
      
      <!-- Totals -->
      <div class="pdf-totals">
        <div class="pdf-totals-box">
          ${invoiceData.productSubtotal ? `
            <div class="pdf-total-row">
              <span>${t('invoices.productsSubtotal')}:</span>
              <span>$${invoiceData.productSubtotal.toFixed(2)}</span>
            </div>
          ` : ''}
          
          ${invoiceData.reservaSubtotal ? `
            <div class="pdf-total-row">
              <span>${t('invoices.reservationsSubtotal')}:</span>
              <span>$${invoiceData.reservaSubtotal.toFixed(2)}</span>
            </div>
          ` : ''}
          
          ${invoiceData.taxAmount && invoiceData.taxAmount > 0 ? `
            <div class="pdf-total-row">
              <span>${t('common.subtotal')}:</span>
              <span>$${(invoiceData.subtotalBeforeTax || 0).toFixed(2)}</span>
            </div>
            <div class="pdf-total-row">
              <span>${t('common.tax')} (${invoiceData.paymentMethods?.taxPercent || 7}%):</span>
              <span>$${invoiceData.taxAmount.toFixed(2)}</span>
            </div>
          ` : ''}
          
          <div class="pdf-total-row pdf-grand-total">
            <span>${t('invoices.total')}:</span>
            <span>$${invoiceData.total.toFixed(2)}</span>
          </div>
        </div>
      </div>
      
      <!-- Payment Methods -->
      ${invoiceData.paymentMethods ? `
        <div class="pdf-section" style="margin-top: 30px;">
          <h3 class="pdf-section-title">${t('common.paymentMethods')}</h3>
          <div class="pdf-info-box">
            ${invoiceData.paymentMethods.cash > 0 ? `
              <div style="margin-bottom: 8px;">
                <span style="font-weight: bold;">💵 ${t('common.cash')}:</span>
                <span style="margin-left: 20px;">$${invoiceData.paymentMethods.cash.toFixed(2)}</span>
              </div>
            ` : ''}
            ${invoiceData.paymentMethods.zelle > 0 ? `
              <div style="margin-bottom: 8px;">
                <span style="font-weight: bold;">📱 Zelle:</span>
                <span style="margin-left: 20px;">$${invoiceData.paymentMethods.zelle.toFixed(2)}</span>
              </div>
            ` : ''}
            ${invoiceData.paymentMethods.creditCard > 0 ? `
              <div style="margin-bottom: 8px;">
                <span style="font-weight: bold;">💳 ${t('common.creditCard')}:</span>
                <span style="margin-left: 20px;">$${invoiceData.paymentMethods.creditCard.toFixed(2)}</span>
              </div>
            ` : ''}
            ${invoiceData.paymentMethods.exemptTaxOnCash && invoiceData.paymentMethods.cash > 0 && invoiceData.taxSavings > 0 ? `
              <div style="margin-top: 12px; padding: 8px; background-color: #e7f5ff; border-radius: 4px; font-size: 12px; font-style: italic;">
                * ${t('common.taxExemptNote')} ${t('common.youSaved')} $${invoiceData.taxSavings.toFixed(2)}!
              </div>
            ` : ''}
          </div>
        </div>
      ` : ''}
      
      <!-- Footer -->
      <div class="pdf-footer">
        <p>${t('common.thankYouBusiness')}</p>
        <p style="margin-top: 10px; font-size: 10px;">
          Generated on ${new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </p>
      </div>
    </div>
  `;
  
  // Append to body temporarily
  document.body.appendChild(container);
  
  try {
    // Generate PDF
    await generatePDFFromElement(container, {
      filename: `invoice-${invoiceData.invoice}.pdf`,
      orientation: 'portrait',
      format: 'letter',
      scale: 2,
      imageQuality: 0.95
    });
  } finally {
    // Remove temporary container
    document.body.removeChild(container);
  }
};





 /**

 generateInvoicePDF adapt this function with this scheme   {
        "invoice": "YY_8803-20250802-6514",
        "description": "",
        "store": "BISSONNET",
        "shipper_consignee": {
            "name": "HECTOR FELIX RICARDO MIRANDA",
            "firstName": "ADIS",
            "middleName": "",
            "lastName": "MAILIN LABOUT",
            "lastName2": "",
            "phoneNumber": "55948765",
            "cid": "02012581719",
            "passport": "",
            "address": "Calle 19 # 2 ALTOS / 10 y CAMILO CIENFUEGOS, Rpto RODOLFO RODRIGUEZ, CONTRAMAESTRE, SANTIAGO DE CUBA",
            "phoneNumberS": "5023892075",
            "dob": "2024-09-28"
        },
        "products": [
            {
                "id": "1754176597417",
                "product": {
                    "id": "AjlXorLU63dtPDrm",
                    "code": "K89G06815",
                    "label": "SAZON COMPLETO BADIA 7 OZ",
                    "price": 0
                },
                "qty": 1,
                "salePrice": 8,
                "total": 8
            }
        ],
        "reservas": [
            {
                "id": "1754176571785",
                "type": "Útiles del Hogar",
                "qty": 14,
                "price": 4.5,
                "arancel": 15,
                "total": 78
            }
        ],
        "packagesOrder": false,
        "shippingMethod": "aereo",
        "paymentMethods": {
            "taxOnTotal": false,
            "taxPercent": 7,
            "exemptTaxOnCash": true,
            "cash": 80,
            "zelle": 6,
            "creditCard": 0
        },
        "type": "SALES",
        "ssg_inventory_key": "INVOICE-1754176953734",
        "ssg_sorder_key": "SO-1754176953734",
        "createDate": 1754176953734,
        "businessId": "YB100423253156428",
        "isCompleted": true,
        "productSubtotal": 8,
        "reservaSubtotal": 78,
        "subtotalBeforeTax": 86,
        "taxAmount": 0.4200000000000001,
        "taxSavings": 5.6000000000000005,
        "total": 86.42,
        "taxCalculationMethod": "subtotal",
        "cashPaymentRatio": 0.9302325581395349
    }




    */