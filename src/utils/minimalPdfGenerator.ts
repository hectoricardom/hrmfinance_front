import { devLog } from '../services/utils';

// Minimal ink PDF generator - ultra light colors for maximum savings
export const generateMinimalInvoicePDF = async (invoiceData: any, t: any) => {
  try {
    devLog('Starting minimal ink PDF generation...');
    
    // Import jsPDF
    const jsPDFModule = await import('jspdf');
    const jsPDF = jsPDFModule.default;
    
    // Create PDF document
    const doc = new jsPDF();
    
    // Constants
    const pageWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);
    
    // Ultra-light colors for minimal ink usage
    const textColor = { r: 0, g: 0, b: 0 }; // Pure black for text
    const lightBorder = { r: 200, g: 200, b: 200 }; // Very light gray for borders only
    
    let yPos = margin;
    
    // Helper functions
    const setColor = (color: any) => {
      doc.setTextColor(color.r, color.g, color.b);
    };
    
    // NO FILLED BACKGROUNDS - only borders and text
    
    // Header - just text, no background
    setColor(textColor);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('HRM FINANCE', margin, yPos);
    
    // Invoice title on the right
    doc.setFontSize(16);
    const invoiceText = 'INVOICE';
    const invoiceTextWidth = doc.getTextWidth(invoiceText);
    doc.text(invoiceText, pageWidth - margin - invoiceTextWidth, yPos);
    
    yPos += 10;
    
    // Invoice number
    doc.setFontSize(12);
    const invoiceNum = invoiceData.invoice || 'N/A';
    const invoiceNumWidth = doc.getTextWidth(invoiceNum);
    doc.text(invoiceNum, pageWidth - margin - invoiceNumWidth, yPos);
    
    yPos += 8;
    
    // Date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const dateStr = invoiceData.createDate ? new Date(invoiceData.createDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) : 'N/A';
    const dateWidth = doc.getTextWidth(dateStr);
    doc.text(dateStr, pageWidth - margin - dateWidth, yPos);
    
    // Status - just text, no badge
    yPos += 6;
    const statusText = `Status: ${invoiceData.isCompleted ? 'COMPLETED' : 'PENDING'}`;
    const statusWidth = doc.getTextWidth(statusText);
    doc.text(statusText, pageWidth - margin - statusWidth, yPos);
    
    // Store info
    yPos = 40;
    doc.text(`${t(`inventory.${invoiceData?.storeType}Type`)}: ${invoiceData.storeName || invoiceData.store || 'N/A'}`, margin, yPos);
    yPos += 5;
    doc.text(`Order ID: ${invoiceData.ssg_sorder_key || 'N/A'}`, margin, yPos);
    
    // Simple line separator
    yPos += 8;
    doc.setDrawColor(lightBorder.r, lightBorder.g, lightBorder.b);
    doc.setLineWidth(0.1);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    
    yPos += 10;
    
    // Customer Information - no boxes, just organized text
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('CUSTOMER INFORMATION', margin, yPos);
    
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const customer = invoiceData.shipper_consignee || {};
    
    // Left column
    const col1X = margin;
    const col2X = pageWidth / 2;
    
    // Sender info
    doc.setFont('helvetica', 'bold');
    doc.text('Sender:', col1X, yPos);
    doc.setFont('helvetica', 'normal');
    yPos += 5;
    doc.text(customer.name || 'N/A', col1X, yPos);
    
    if (customer.phoneNumberS) {
      yPos += 4;
      doc.text(`Alt Phone: ${customer.phoneNumberS}`, col1X, yPos);
    }
    
    // Recipient info
    let tempY = yPos - 9;
    doc.setFont('helvetica', 'bold');
    doc.text('Recipient:', col2X, tempY);
    doc.setFont('helvetica', 'normal');
    tempY += 5;
    
    const fullName = [
      customer.firstName,
      customer.middleName,
      customer.lastName,
      customer.lastName2
    ].filter(Boolean).join(' ') || 'N/A';
    
    doc.text(fullName, col2X, tempY);
    tempY += 4;
    doc.text(`Phone: ${customer.phoneNumber || 'N/A'}`, col2X, tempY);
    tempY += 4;
    doc.text(`ID: ${customer.cid || 'N/A'}`, col2X, tempY);
    
    // Address
    if (customer.ybstreet) {
      tempY += 4;
      doc.text(`${customer.ybstreet} #${customer.ybstreetNo}`, col2X, tempY);
      tempY += 4;
      doc.text(`${t('invoices.between')} ${customer.ybbetwen1} ${t('invoices.and')} ${customer.ybbetwen2}`, col2X, tempY);
      tempY += 4;
      doc.text(`${customer.ybreparto}, ${customer.ybcity}`, col2X, tempY);
      tempY += 4;
      doc.text(`${customer.ybestate}`, col2X, tempY);
    }
    
    yPos = Math.max(yPos, tempY) + 10;
    
    // Products section - minimal table
    if (invoiceData.products && invoiceData.products.length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('PRODUCTS', margin, yPos);
      
      yPos += 8;
      
      // Simple table with minimal borders
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      
      // Header line only
      doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
      
      // Column headers
      const colX = {
        code: margin,
        description: margin + 30,
        qty: margin + 110,
        price: margin + 130,
        total: margin + 155
      };
      
      doc.setFont('helvetica', 'bold');
      doc.text('Code', colX.code, yPos);
      doc.text('Description', colX.description, yPos);
      doc.text('Qty', colX.qty, yPos);
      doc.text('Price', colX.price, yPos);
      doc.text('Total', colX.total, yPos);
      
      yPos += 2;
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 5;
      
      doc.setFont('helvetica', 'normal');
      
      let productSubtotal = 0;
      
      invoiceData.products.forEach((item: any) => {
        if (yPos > 260) {
          doc.addPage();
          yPos = margin;
        }
        
        doc.text(item.product?.code || 'N/A', colX.code, yPos);
        
        // Truncate description if needed
        let description = item.product?.label || 'N/A';
        if (doc.getTextWidth(description) > 70) {
          description = description.substring(0, 40) + '...';
        }
        doc.text(description, colX.description, yPos);
        
        const qty = Math.abs(item.qty || 0);
        const price = parseFloat(item.salePrice || 0);
        const total = qty * price;
        productSubtotal += total;
        
        doc.text(qty.toString(), colX.qty, yPos);
        doc.text(`$${price.toFixed(2)}`, colX.price, yPos);
        doc.text(`$${total.toFixed(2)}`, colX.total, yPos);
        
        yPos += 5;
      });
      
      // Bottom line only
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;
    }
    
    // Reservations section - minimal table
    if (invoiceData.reservas && invoiceData.reservas.length > 0) {
      if (yPos > 200) {
        doc.addPage();
        yPos = margin;
      }
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('RESERVATIONS', margin, yPos);
      
      yPos += 8;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      
      // Header line only
      doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
      
      // Column headers
      const resColX = {
        type: margin,
        qty: margin + 60,
        price: margin + 90,
        arancel: margin + 120,
        total: margin + 155
      };
      
      doc.setFont('helvetica', 'bold');
      doc.text('Type', resColX.type, yPos);
      doc.text('Qty', resColX.qty, yPos);
      doc.text('Price', resColX.price, yPos);
      doc.text('Arancel', resColX.arancel, yPos);
      doc.text('Total', resColX.total, yPos);
      
      yPos += 2;
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 5;
      
      doc.setFont('helvetica', 'normal');
      
      let reservaSubtotal = 0;
      
      invoiceData.reservas.forEach((item: any) => {
        if (yPos > 260) {
          doc.addPage();
          yPos = margin;
        }
        
        doc.text(item.type || 'N/A', resColX.type, yPos);
        
        const qty = parseInt(item.qty || 0);
        const price = parseFloat(item.price || 0);
        const arancel = parseFloat(item.arancel || 0);
        const total = qty * price + arancel;
        reservaSubtotal += total;
        
        doc.text(qty.toString(), resColX.qty, yPos);
        doc.text(`$${price.toFixed(2)}`, resColX.price, yPos);
        doc.text(item.arancel || '-', resColX.arancel, yPos);
        doc.text(`$${total.toFixed(2)}`, resColX.total, yPos);
        
        yPos += 5;
      });
      
      // Bottom line only
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;
    }
    
    // Totals section - just text, no boxes
    if (yPos > 230) {
      doc.addPage();
      yPos = margin;
    }
    
    const totalsX = pageWidth - 80;
    
    doc.setFontSize(10);
    
    if (invoiceData.productSubtotal !== undefined && invoiceData.productSubtotal > 0) {
      doc.text('Products Subtotal:', totalsX, yPos);
      doc.text(`$${invoiceData.productSubtotal.toFixed(2)}`, totalsX + 50, yPos);
      yPos += 6;
    }
    
    if (invoiceData.reservaSubtotal !== undefined && invoiceData.reservaSubtotal > 0) {
      doc.text('Reservations Subtotal:', totalsX, yPos);
      doc.text(`$${invoiceData.reservaSubtotal.toFixed(2)}`, totalsX + 50, yPos);
      yPos += 6;
    }
    
    // Simple line above total
    yPos += 2;
    doc.line(totalsX, yPos, pageWidth - margin, yPos);
    yPos += 6;
    
    // Grand total
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL:', totalsX, yPos);
    doc.text(`$${(invoiceData.total || 0).toFixed(2)}`, totalsX + 50, yPos);
    
    // Footer - minimal text only
    yPos = pageHeight - 20;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const thankYouText = 'Thank you for your business!';
    const thankYouWidth = doc.getTextWidth(thankYouText);
    doc.text(thankYouText, (pageWidth - thankYouWidth) / 2, yPos);
    
    yPos += 5;
    doc.setFontSize(8);
    const timestamp = `Generated on ${new Date().toLocaleDateString()}`;
    const timestampWidth = doc.getTextWidth(timestamp);
    doc.text(timestamp, (pageWidth - timestampWidth) / 2, yPos);
    
    // Save the PDF
    const filename = `invoice-${invoiceData.invoice || 'unknown'}.pdf`;
    doc.save(filename);
    
    devLog('Minimal ink PDF saved successfully:', filename);
    
  } catch (error) {
    console.error('Error in generateMinimalInvoicePDF:', error);
    throw error;
  }
};