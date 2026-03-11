import jsPDF from 'jspdf';
import { devLog } from '../services/utils';

interface InvoiceData {
  invoice: string;
  isCompleted: boolean;
  createDate: number;
  store: string;
  storeName?: string;
  ssg_sorder_key: string;
  shipper_consignee: {
    name: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    lastName2?: string;
    phoneNumber: string;
    phoneNumberS?: string;
    cid: string;
    passport?: string;
    ybstreet: string;
    ybstreetNo: string;
    ybbetwen1: string;
    ybbetwen2: string;
    ybreparto: string;
    ybcity: string;
    ybestate: string;
    nacionality: string;
  };
  products?: Array<{
    product: { code: string; label: string };
    qty: number;
    salePrice: string;
  }>;
  reservas?: Array<{
    type: string;
    qty: string;
    price: string;
    arancel?: string;
  }>;
  productSubtotal?: number;
  reservaSubtotal?: number;
  total?: number;
}

export const generateModernInvoicePDF = (
  invoiceData: InvoiceData,
  t: (key: string) => string
): void => {
  devLog('generateModernInvoicePDF called');
  try {
    // Validate required data
    if (!invoiceData || !invoiceData.invoice) {
      throw new Error('Invalid invoice data');
    }

    devLog('Creating jsPDF instance...');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    devLog('jsPDF instance created');

  // Colors
  const primaryColor = { r: 37, g: 99, b: 235 }; // Blue
  const textDark = { r: 51, g: 51, b: 51 };
  const textMuted = { r: 102, g: 102, b: 102 };
  const bgLight = { r: 248, g: 249, b: 250 };
  const borderColor = { r: 224, g: 224, b: 224 };
  
  let yPosition = 20;
  const leftMargin = 20;
  const rightMargin = 190;
  const contentWidth = rightMargin - leftMargin;

  // Helper functions
  const addText = (text: string, x: number, y: number, options: any = {}) => {
    pdf.setFontSize(options.size || 10);
    pdf.setTextColor(options.color?.r || 0, options.color?.g || 0, options.color?.b || 0);
    if (options.bold) {
      pdf.setFont('helvetica', 'bold');
    } else {
      pdf.setFont('helvetica', 'normal');
    }
    
    // Handle alignment
    const textOptions: any = {};
    if (options.align) {
      textOptions.align = options.align;
    }
    
    pdf.text(String(text || ''), x, y, textOptions);
  };

  const addLine = (x1: number, y1: number, x2: number, y2: number, color?: any) => {
    if (color) {
      pdf.setDrawColor(color.r, color.g, color.b);
    } else {
      pdf.setDrawColor(borderColor.r, borderColor.g, borderColor.b);
    }
    pdf.line(x1, y1, x2, y2);
  };

  const addBox = (x: number, y: number, width: number, height: number, fillColor?: any) => {
    if (fillColor) {
      pdf.setFillColor(fillColor.r, fillColor.g, fillColor.b);
      pdf.rect(x, y, width, height, 'F');
    }
    pdf.setDrawColor(borderColor.r, borderColor.g, borderColor.b);
    pdf.rect(x, y, width, height);
  };

  // Header
  addText('HRM Finance', leftMargin, yPosition, { size: 24, color: primaryColor, bold: true });
  
  // Invoice info
  const statusText = invoiceData.isCompleted ? t('invoices.completed').toUpperCase() : t('invoices.pending').toUpperCase();
  const statusColor = invoiceData.isCompleted ? { r: 21, g: 87, b: 36 } : { r: 133, g: 100, b: 4 };
  const statusBgColor = invoiceData.isCompleted ? { r: 212, g: 237, b: 218 } : { r: 255, g: 243, b: 205 };
  
  // Status badge
  const statusWidth = pdf.getTextWidth(statusText) + 8;
  addBox(rightMargin - statusWidth, yPosition - 8, statusWidth, 6, statusBgColor);
  addText(statusText, rightMargin - statusWidth + 4, yPosition - 3, { size: 8, color: statusColor, bold: true });
  
  yPosition += 5;
  const invoiceText = t('common.invoice').toUpperCase();
  const invoiceTextWidth = pdf.getTextWidth(invoiceText);
  addText(invoiceText, rightMargin - invoiceTextWidth, yPosition, { size: 18, bold: true });
  
  yPosition += 7;
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  const invoiceNumWidth = pdf.getTextWidth(invoiceData.invoice);
  addText(invoiceData.invoice, rightMargin - invoiceNumWidth, yPosition, { size: 14, bold: true });
  
  yPosition += 5;
  const dateStr = new Date(invoiceData.createDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  const dateWidth = pdf.getTextWidth(dateStr);
  addText(dateStr, rightMargin - dateWidth, yPosition, { size: 9, color: textMuted });
  
  // Store info
  yPosition = 30;
  addText(`${t('common.location')}: ${invoiceData.storeName || invoiceData.store}`, leftMargin, yPosition, { size: 10, color: textMuted });
  yPosition += 5;
  addText(`${t('invoices.id')}: ${invoiceData.ssg_sorder_key}`, leftMargin, yPosition, { size: 10, color: textMuted });
  
  yPosition += 15;
  addLine(leftMargin, yPosition, rightMargin, yPosition, borderColor);
  yPosition += 10;

  // Customer Information Section
  addText(t('invoices.senderInformation'), leftMargin, yPosition, { size: 14, bold: true });
  yPosition += 8;
  
  // Sender box
  addBox(leftMargin, yPosition, contentWidth, 15, bgLight);
  yPosition += 5;
  addText(t('invoices.customerName'), leftMargin + 3, yPosition, { size: 9, color: textMuted });
  yPosition += 4;
  addText(invoiceData.shipper_consignee?.name || 'N/A', leftMargin + 3, yPosition, { size: 10, bold: true });
  
  if (invoiceData.shipper_consignee?.phoneNumberS) {
    yPosition += 4;
    addText(`${t('invoices.altPhone')}: ${invoiceData.shipper_consignee.phoneNumberS}`, leftMargin + 3, yPosition, { size: 9 });
  }
  
  yPosition += 15;
  
  // Receipt Information
  addText(t('invoices.receiptInformation'), leftMargin, yPosition, { size: 14, bold: true });
  yPosition += 8;
  
  // Two column layout for receipt info
  const colWidth = (contentWidth - 10) / 2;
  const col2X = leftMargin + colWidth + 10;
  
  // Left column
  addBox(leftMargin, yPosition, colWidth, 40, bgLight);
  let tempY = yPosition + 5;
  
  addText(t('invoices.customerName'), leftMargin + 3, tempY, { size: 9, color: textMuted });
  tempY += 4;
  const fullName = `${invoiceData.shipper_consignee?.firstName || ''} ${invoiceData.shipper_consignee?.middleName || ''} ${invoiceData.shipper_consignee?.lastName || ''} ${invoiceData.shipper_consignee?.lastName2 || ''}`.trim();
  addText(fullName || 'N/A', leftMargin + 3, tempY, { size: 10, bold: true });
  
  tempY += 8;
  addText(t('invoices.id'), leftMargin + 3, tempY, { size: 9, color: textMuted });
  tempY += 4;
  addText(invoiceData.shipper_consignee?.cid || 'N/A', leftMargin + 3, tempY, { size: 10 });
  
  tempY += 8;
  addText(t('invoices.passport'), leftMargin + 3, tempY, { size: 9, color: textMuted });
  tempY += 4;
  addText(invoiceData.shipper_consignee?.passport || 'N/A', leftMargin + 3, tempY, { size: 10 });
  
  // Right column
  addBox(col2X, yPosition, colWidth, 40, bgLight);
  tempY = yPosition + 5;
  
  addText(t('invoices.phoneNumber'), col2X + 3, tempY, { size: 9, color: textMuted });
  tempY += 4;
  addText(invoiceData.shipper_consignee?.phoneNumber || 'N/A', col2X + 3, tempY, { size: 10 });
  
  tempY += 8;
  addText(t('invoices.address'), col2X + 3, tempY, { size: 9, color: textMuted });
  tempY += 4;
  
  // Address lines
  const addressLines = [
    `${invoiceData.shipper_consignee?.ybstreet || ''} #${invoiceData.shipper_consignee?.ybstreetNo || ''}`,
    `${t('invoices.between')} ${invoiceData.shipper_consignee?.ybbetwen1 || ''} ${t('invoices.and')} ${invoiceData.shipper_consignee?.ybbetwen2 || ''}`,
    `${invoiceData.shipper_consignee?.ybreparto || ''}, ${invoiceData.shipper_consignee?.ybcity || ''}`,
    `${invoiceData.shipper_consignee?.ybestate || ''}, ${invoiceData.shipper_consignee?.nacionality || ''}`
  ];
  
  addressLines.forEach(line => {
    addText(line, col2X + 3, tempY, { size: 9 });
    tempY += 3.5;
  });
  
  yPosition += 50;

  // Products Table
  if (invoiceData.products && invoiceData.products.length > 0) {
    addText(t('invoices.products'), leftMargin, yPosition, { size: 14, bold: true });
    yPosition += 8;
    
    // Table header
    const colWidths = [30, 80, 20, 25, 25];
    const headers = [
      t('invoices.code'),
      t('invoices.description'),
      t('invoices.qty'),
      t('invoices.unitPrice'),
      t('invoices.total')
    ];
    
    // Header background
    addBox(leftMargin, yPosition, contentWidth, 8, bgLight);
    
    let xPos = leftMargin;
    headers.forEach((header, index) => {
      addText(header, xPos + 2, yPosition + 5, { size: 9, bold: true, color: textDark });
      xPos += colWidths[index];
    });
    
    yPosition += 8;
    
    // Table rows
    invoiceData.products.forEach(item => {
      if (yPosition > 250) {
        pdf.addPage();
        yPosition = 20;
      }
      
      xPos = leftMargin;
      const qty = Math.abs(item.qty);
      const unitPrice = parseFloat(item.salePrice);
      const total = qty * unitPrice;
      
      addText(item.product.code, xPos + 2, yPosition + 5, { size: 9 });
      xPos += colWidths[0];
      
      // Truncate description if too long
      let description = item.product.label;
      if (pdf.getTextWidth(description) > colWidths[1] - 4) {
        description = description.substring(0, 40) + '...';
      }
      addText(description, xPos + 2, yPosition + 5, { size: 9 });
      xPos += colWidths[1];
      
      // Center align quantity
      const qtyText = qty.toString();
      const qtyWidth = pdf.getTextWidth(qtyText);
      addText(qtyText, xPos + (colWidths[2] - qtyWidth) / 2, yPosition + 5, { size: 9 });
      xPos += colWidths[2];
      
      // Right align price
      const priceText = `$${unitPrice.toFixed(2)}`;
      const priceWidth = pdf.getTextWidth(priceText);
      addText(priceText, xPos + colWidths[3] - priceWidth - 2, yPosition + 5, { size: 9 });
      xPos += colWidths[3];
      
      // Right align total
      const totalText = `$${total.toFixed(2)}`;
      const totalWidth = pdf.getTextWidth(totalText);
      addText(totalText, xPos + colWidths[4] - totalWidth - 2, yPosition + 5, { size: 9 });
      
      yPosition += 6;
      addLine(leftMargin, yPosition, rightMargin, yPosition);
      yPosition += 1;
    });
    
    yPosition += 5;
  }

  // Reservations Table
  if (invoiceData.reservas && invoiceData.reservas.length > 0) {
    if (yPosition > 220) {
      pdf.addPage();
      yPosition = 20;
    }
    
    addText(t('invoices.reservations'), leftMargin, yPosition, { size: 14, bold: true });
    yPosition += 8;
    
    // Table header
    const colWidths = [50, 30, 30, 30, 30];
    const headers = [
      t('invoices.type'),
      t('invoices.qty'),
      t('invoices.unitPrice'),
      t('invoices.arancel'),
      t('invoices.total')
    ];
    
    // Header background
    addBox(leftMargin, yPosition, contentWidth, 8, bgLight);
    
    let xPos = leftMargin;
    headers.forEach((header, index) => {
      addText(header, xPos + 2, yPosition + 5, { size: 9, bold: true, color: textDark });
      xPos += colWidths[index];
    });
    
    yPosition += 8;
    
    // Table rows
    invoiceData.reservas.forEach(item => {
      if (yPosition > 250) {
        pdf.addPage();
        yPosition = 20;
      }
      
      xPos = leftMargin;
      const qty = parseInt(item.qty);
      const price = parseFloat(item.price);
      const arancel = item.arancel ? parseFloat(item.arancel) : 0;
      const total = qty * price + arancel;
      
      addText(item.type, xPos + 2, yPosition + 5, { size: 9 });
      xPos += colWidths[0];
      
      // Center align quantity
      const qtyWidth = pdf.getTextWidth(item.qty);
      addText(item.qty, xPos + (colWidths[1] - qtyWidth) / 2, yPosition + 5, { size: 9 });
      xPos += colWidths[1];
      
      // Right align price
      const priceText = `$${price.toFixed(2)}`;
      const priceTextWidth = pdf.getTextWidth(priceText);
      addText(priceText, xPos + colWidths[2] - priceTextWidth - 2, yPosition + 5, { size: 9 });
      xPos += colWidths[2];
      
      // Right align arancel
      const arancelText = item.arancel || '-';
      const arancelWidth = pdf.getTextWidth(arancelText);
      addText(arancelText, xPos + colWidths[3] - arancelWidth - 2, yPosition + 5, { size: 9 });
      xPos += colWidths[3];
      
      // Right align total
      const totalText = `$${total.toFixed(2)}`;
      const totalTextWidth = pdf.getTextWidth(totalText);
      addText(totalText, xPos + colWidths[4] - totalTextWidth - 2, yPosition + 5, { size: 9 });
      
      yPosition += 6;
      addLine(leftMargin, yPosition, rightMargin, yPosition);
      yPosition += 1;
    });
    
    yPosition += 5;
  }

  // Totals section
  if (yPosition > 230) {
    pdf.addPage();
    yPosition = 20;
  }
  
  const totalsX = rightMargin - 60;
  
  if (invoiceData.productSubtotal) {
    addText(`${t('invoices.productsSubtotal')}:`, totalsX - 30, yPosition, { size: 10 });
    const subtotalText = `$${invoiceData.productSubtotal.toFixed(2)}`;
    const subtotalWidth = pdf.getTextWidth(subtotalText);
    addText(subtotalText, rightMargin - subtotalWidth, yPosition, { size: 10 });
    yPosition += 6;
  }
  
  if (invoiceData.reservaSubtotal) {
    addText(`${t('invoices.reservationsSubtotal')}:`, totalsX - 30, yPosition, { size: 10 });
    const reservaText = `$${invoiceData.reservaSubtotal.toFixed(2)}`;
    const reservaWidth = pdf.getTextWidth(reservaText);
    addText(reservaText, rightMargin - reservaWidth, yPosition, { size: 10 });
    yPosition += 6;
  }
  
  // Grand total
  yPosition += 2;
  addLine(totalsX - 35, yPosition, rightMargin, yPosition, borderColor);
  yPosition += 6;
  
  addText(`${t('invoices.total')}:`, totalsX - 30, yPosition, { size: 14, bold: true });
  const totalText = `$${(invoiceData.total || 0).toFixed(2)}`;
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  const totalWidth = pdf.getTextWidth(totalText);
  addText(totalText, rightMargin - totalWidth, yPosition, { 
    size: 14, 
    bold: true, 
    color: primaryColor
  });

  // Footer
  yPosition = 270;
  addLine(leftMargin, yPosition, rightMargin, yPosition);
  yPosition += 5;
  
  const footerText = 'Thank you for your business!';
  const footerWidth = pdf.getTextWidth(footerText);
  addText(footerText, (210 - footerWidth) / 2, yPosition, { size: 10, color: textMuted });
  
  yPosition += 5;
  const dateText = `Generated on ${new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}`;
  const dateWidth = pdf.getTextWidth(dateText);
  addText(dateText, (210 - dateWidth) / 2, yPosition, { size: 8, color: textMuted });

  // Save the PDF
  pdf.save(`invoice-${invoiceData.invoice}.pdf`);
  } catch (error) {
    console.error('PDF Generation Error:', error);
    throw error;
  }
};