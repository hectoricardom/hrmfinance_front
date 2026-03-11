import { devLog } from '../services/utils';

interface InvoiceData {
  invoice: string;
  isCompleted: boolean;
  createDate: number;
  store: string;
  storeName?: string;
  ssg_sorder_key: string;
  shipper_consignee?: {
    name?: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    lastName2?: string;
    phoneNumber?: string;
    phoneNumberS?: string;
    cid?: string;
    passport?: string;
    ybstreet?: string;
    ybstreetNo?: string;
    ybbetwen1?: string;
    ybbetwen2?: string;
    ybreparto?: string;
    ybcity?: string;
    ybestate?: string;
    nacionality?: string;
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

export const generateInvoicePDF = async (
  invoiceData: InvoiceData,
  t: (key: string) => string
): Promise<void> => {
  try {
    devLog('Loading jsPDF...');
    
    // Dynamic import of jsPDF
    const { default: jsPDF } = await import('jspdf');
    
    devLog('jsPDF loaded, creating document...');
    
    // Create new PDF document
    const doc = new jsPDF();
    
    // Page dimensions
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPos = margin;
    
    // Helper function to check if we need a new page
    const checkNewPage = (neededSpace: number) => {
      if (yPos + neededSpace > pageHeight - margin) {
        doc.addPage();
        yPos = margin;
      }
    };
    
    // Colors (using RGB values)
    const primaryColor = [37, 99, 235] as [number, number, number];
    const textDark = [51, 51, 51] as [number, number, number];
    const textMuted = [102, 102, 102] as [number, number, number];
    
    // Header
    doc.setFontSize(24);
    doc.setTextColor(...primaryColor);
    doc.text('HRM Finance', margin, yPos);
    
    // Invoice info on the right
    doc.setFontSize(18);
    doc.setTextColor(...textDark);
    doc.text(t('common.invoice').toUpperCase(), pageWidth - margin, yPos, { align: 'right' });
    
    yPos += 10;
    doc.setFontSize(14);
    doc.text(invoiceData.invoice, pageWidth - margin, yPos, { align: 'right' });
    
    yPos += 6;
    doc.setFontSize(10);
    doc.setTextColor(...textMuted);
    const dateStr = new Date(invoiceData.createDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    doc.text(dateStr, pageWidth - margin, yPos, { align: 'right' });
    
    // Status badge
    const statusText = invoiceData.isCompleted ? t('invoices.completed').toUpperCase() : t('invoices.pending').toUpperCase();
    const statusColor = invoiceData.isCompleted ? [21, 87, 36] : [133, 100, 4];
    doc.setTextColor(...(statusColor as [number, number, number]));
    doc.setFontSize(8);
    doc.text(statusText, pageWidth - margin, yPos + 6, { align: 'right' });
    
    // Store info on the left
    yPos = 35;
    doc.setFontSize(10);
    doc.setTextColor(...textMuted);
    doc.text(`${t('common.location')}: ${invoiceData.storeName || invoiceData.store}`, margin, yPos);
    yPos += 5;
    doc.text(`${t('invoices.id')}: ${invoiceData.ssg_sorder_key}`, margin, yPos);
    
    // Line separator
    yPos += 10;
    doc.setDrawColor(224, 224, 224);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;
    
    // Customer Information
    checkNewPage(40);
    doc.setFontSize(14);
    doc.setTextColor(...textDark);
    doc.text(t('invoices.senderInformation'), margin, yPos);
    yPos += 8;
    
    // Sender info
    doc.setFontSize(10);
    doc.setTextColor(...textMuted);
    doc.text(t('invoices.customerName'), margin, yPos);
    yPos += 5;
    doc.setTextColor(...textDark);
    doc.text(invoiceData.shipper_consignee?.name || 'N/A', margin, yPos);
    
    if (invoiceData.shipper_consignee?.phoneNumberS) {
      yPos += 5;
      doc.setTextColor(...textMuted);
      doc.text(`${t('invoices.altPhone')}: ${invoiceData.shipper_consignee.phoneNumberS}`, margin, yPos);
    }
    
    yPos += 10;
    
    // Receipt Information
    checkNewPage(50);
    doc.setFontSize(14);
    doc.setTextColor(...textDark);
    doc.text(t('invoices.receiptInformation'), margin, yPos);
    yPos += 8;
    
    // Customer details in two columns
    const col1X = margin;
    const col2X = pageWidth / 2 + 10;
    let tempY = yPos;
    
    // Left column
    doc.setFontSize(10);
    doc.setTextColor(...textMuted);
    doc.text(t('invoices.customerName'), col1X, tempY);
    tempY += 5;
    doc.setTextColor(...textDark);
    const fullName = [
      invoiceData.shipper_consignee?.firstName,
      invoiceData.shipper_consignee?.middleName,
      invoiceData.shipper_consignee?.lastName,
      invoiceData.shipper_consignee?.lastName2
    ].filter(Boolean).join(' ') || 'N/A';
    doc.text(fullName, col1X, tempY);
    
    tempY += 8;
    doc.setTextColor(...textMuted);
    doc.text(t('invoices.id'), col1X, tempY);
    tempY += 5;
    doc.setTextColor(...textDark);
    doc.text(invoiceData.shipper_consignee?.cid || 'N/A', col1X, tempY);
    
    tempY += 8;
    doc.setTextColor(...textMuted);
    doc.text(t('invoices.passport'), col1X, tempY);
    tempY += 5;
    doc.setTextColor(...textDark);
    doc.text(invoiceData.shipper_consignee?.passport || 'N/A', col1X, tempY);
    
    // Right column
    tempY = yPos;
    doc.setTextColor(...textMuted);
    doc.text(t('invoices.phoneNumber'), col2X, tempY);
    tempY += 5;
    doc.setTextColor(...textDark);
    doc.text(invoiceData.shipper_consignee?.phoneNumber || 'N/A', col2X, tempY);
    
    tempY += 8;
    doc.setTextColor(...textMuted);
    doc.text(t('invoices.address'), col2X, tempY);
    tempY += 5;
    doc.setTextColor(...textDark);
    doc.setFontSize(9);
    
    const addressLines = [
      `${invoiceData.shipper_consignee?.ybstreet || ''} #${invoiceData.shipper_consignee?.ybstreetNo || ''}`,
      `${t('invoices.between')} ${invoiceData.shipper_consignee?.ybbetwen1 || ''} ${t('invoices.and')} ${invoiceData.shipper_consignee?.ybbetwen2 || ''}`,
      `${invoiceData.shipper_consignee?.ybreparto || ''}, ${invoiceData.shipper_consignee?.ybcity || ''}`,
      `${invoiceData.shipper_consignee?.ybestate || ''}, ${invoiceData.shipper_consignee?.nacionality || ''}`
    ];
    
    addressLines.forEach(line => {
      doc.text(line.trim(), col2X, tempY);
      tempY += 4;
    });
    
    yPos = Math.max(yPos + 40, tempY + 5);
    
    // Products Table
    if (invoiceData.products && invoiceData.products.length > 0) {
      checkNewPage(30);
      doc.setFontSize(14);
      doc.setTextColor(...textDark);
      doc.text(t('invoices.products'), margin, yPos);
      yPos += 8;
      
      // Table header
      doc.setFontSize(9);
      doc.setTextColor(...textDark);
      doc.setFont(undefined, 'bold');
      
      const colWidths = {
        code: 30,
        description: 80,
        qty: 20,
        unitPrice: 30,
        total: 30
      };
      
      let xPos = margin;
      doc.text(t('invoices.code'), xPos, yPos);
      xPos += colWidths.code;
      doc.text(t('invoices.description'), xPos, yPos);
      xPos += colWidths.description;
      doc.text(t('invoices.qty'), xPos, yPos);
      xPos += colWidths.qty;
      doc.text(t('invoices.unitPrice'), xPos, yPos);
      xPos += colWidths.unitPrice;
      doc.text(t('invoices.total'), xPos, yPos);
      
      yPos += 2;
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 5;
      
      // Table rows
      doc.setFont(undefined, 'normal');
      invoiceData.products.forEach(item => {
        checkNewPage(10);
        xPos = margin;
        
        doc.text(item.product.code, xPos, yPos);
        xPos += colWidths.code;
        
        // Truncate description if too long
        let description = item.product.label;
        if (description.length > 40) {
          description = description.substring(0, 40) + '...';
        }
        doc.text(description, xPos, yPos);
        xPos += colWidths.description;
        
        doc.text(Math.abs(item.qty).toString(), xPos, yPos);
        xPos += colWidths.qty;
        
        doc.text(`$${parseFloat(item.salePrice).toFixed(2)}`, xPos, yPos);
        xPos += colWidths.unitPrice;
        
        const total = Math.abs(item.qty) * parseFloat(item.salePrice);
        doc.text(`$${total.toFixed(2)}`, xPos, yPos);
        
        yPos += 6;
      });
      
      yPos += 5;
    }
    
    // Reservations Table
    if (invoiceData.reservas && invoiceData.reservas.length > 0) {
      checkNewPage(30);
      doc.setFontSize(14);
      doc.setTextColor(...textDark);
      doc.text(t('invoices.reservations'), margin, yPos);
      yPos += 8;
      
      // Similar table structure for reservations
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      
      const colWidths = {
        type: 50,
        qty: 30,
        unitPrice: 30,
        arancel: 30,
        total: 30
      };
      
      let xPos = margin;
      doc.text(t('invoices.type'), xPos, yPos);
      xPos += colWidths.type;
      doc.text(t('invoices.qty'), xPos, yPos);
      xPos += colWidths.qty;
      doc.text(t('invoices.unitPrice'), xPos, yPos);
      xPos += colWidths.unitPrice;
      doc.text(t('invoices.arancel'), xPos, yPos);
      xPos += colWidths.arancel;
      doc.text(t('invoices.total'), xPos, yPos);
      
      yPos += 2;
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 5;
      
      doc.setFont(undefined, 'normal');
      invoiceData.reservas.forEach(item => {
        checkNewPage(10);
        xPos = margin;
        
        doc.text(item.type, xPos, yPos);
        xPos += colWidths.type;
        
        doc.text(item.qty, xPos, yPos);
        xPos += colWidths.qty;
        
        doc.text(`$${parseFloat(item.price).toFixed(2)}`, xPos, yPos);
        xPos += colWidths.unitPrice;
        
        doc.text(item.arancel || '-', xPos, yPos);
        xPos += colWidths.arancel;
        
        const qty = parseInt(item.qty);
        const price = parseFloat(item.price);
        const arancel = item.arancel ? parseFloat(item.arancel) : 0;
        const total = qty * price + arancel;
        doc.text(`$${total.toFixed(2)}`, xPos, yPos);
        
        yPos += 6;
      });
      
      yPos += 5;
    }
    
    // Totals
    checkNewPage(30);
    const totalsX = pageWidth - 80;
    
    doc.setFontSize(10);
    if (invoiceData.productSubtotal) {
      doc.text(`${t('invoices.productsSubtotal')}:`, totalsX, yPos);
      doc.text(`$${invoiceData.productSubtotal.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' });
      yPos += 6;
    }
    
    if (invoiceData.reservaSubtotal) {
      doc.text(`${t('invoices.reservationsSubtotal')}:`, totalsX, yPos);
      doc.text(`$${invoiceData.reservaSubtotal.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' });
      yPos += 6;
    }
    
    yPos += 2;
    doc.line(totalsX - 10, yPos, pageWidth - margin, yPos);
    yPos += 6;
    
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(`${t('invoices.total')}:`, totalsX, yPos);
    doc.text(`$${(invoiceData.total || 0).toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' });
    
    // Footer
    yPos = pageHeight - 30;
    doc.setFontSize(10);
    doc.setTextColor(...textMuted);
    doc.setFont(undefined, 'normal');
    doc.text('Thank you for your business!', pageWidth / 2, yPos, { align: 'center' });
    
    yPos += 5;
    doc.setFontSize(8);
    const timestamp = new Date().toLocaleString('en-US');
    doc.text(`Generated on ${timestamp}`, pageWidth / 2, yPos, { align: 'center' });
    
    // Save the PDF
    doc.save(`invoice-${invoiceData.invoice}.pdf`);
    devLog('PDF saved successfully');
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};