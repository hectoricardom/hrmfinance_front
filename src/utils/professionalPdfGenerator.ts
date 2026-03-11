import { devLog } from '../services/utils';

// Professional modern invoice PDF generator
export const generateProfessionalInvoicePDF = async (invoiceData: any, t: any) => {
  try {
    devLog('Starting professional PDF generation...');
    
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
    
    // Light professional color scheme for minimal ink usage
    const primaryColor = { r: 180, g: 180, b: 180 }; // Very light gray
    const darkGray = { r: 80, g: 80, b: 80 }; // Medium dark for text
    const mediumGray = { r: 130, g: 130, b: 130 }; // Light gray
    const lightGray = { r: 248, g: 248, b: 248 }; // Ultra light gray
    const veryLightGray = { r: 252, g: 252, b: 252 }; // Almost white
    const successGreen = { r: 120, g: 120, b: 120 }; // Light gray for completed
    const warningYellow = { r: 150, g: 150, b: 150 }; // Light gray for pending
    
    let yPos = margin;
    
    // Helper functions
    const setColor = (color: any) => {
      doc.setTextColor(color.r, color.g, color.b);
    };
    
    const setFillColor = (color: any) => {
      doc.setFillColor(color.r, color.g, color.b);
    };
    
    const drawRoundedRect = (x: number, y: number, width: number, height: number, radius: number, fill: boolean = false) => {
      doc.roundedRect(x, y, width, height, radius, radius, fill ? 'F' : 'S');
    };
    
    // Remove background pattern for better printing
    
    // Modern minimal header with light colors
    setFillColor(veryLightGray);
    doc.rect(0, 0, pageWidth, 50, 'F');
    
    // Subtle border line at bottom of header
    doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.setLineWidth(0.5);
    doc.line(0, 50, pageWidth, 50);
    
    // Company name - modern typography
    setColor(darkGray);
    doc.setFontSize(32);
    doc.setFont('helvetica', 'bold');
    doc.text('HRM', margin, 25);
    
    // Second part of logo in lighter color
    setColor(mediumGray);
    doc.setFontSize(32);
    doc.setFont('helvetica', 'normal');
    const hrmWidth = doc.getTextWidth('HRM ');
    doc.text('FINANCE', margin + hrmWidth, 25);
    
    // Modern tagline
    setColor(mediumGray);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Professional Business Solutions', margin, 35);
    
    // Modern invoice badge - minimal design
    const badgeWidth = 70;
    const badgeX = pageWidth - margin - badgeWidth;
    
    // Light border for invoice section
    doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.setLineWidth(0.5);
    drawRoundedRect(badgeX, 12, badgeWidth, 26, 2, false);
    
    // Invoice label and number
    setColor(darkGray);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    const invoiceLabel = t('common.invoice').toUpperCase();
    const labelWidth = doc.getTextWidth(invoiceLabel);
    doc.text(invoiceLabel, badgeX + (badgeWidth - labelWidth) / 2, 22);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const invoiceNum = invoiceData.invoice || 'N/A';
    const numWidth = doc.getTextWidth(invoiceNum);
    doc.text(invoiceNum, badgeX + (badgeWidth - numWidth) / 2, 32);
    
    yPos = 60;
    
    // Status and date section - very light background
    setFillColor(veryLightGray);
    doc.rect(0, 50, pageWidth, 20, 'F');
    
    // Status badge - minimal design
    const isCompleted = invoiceData.isCompleted;
    const statusText = isCompleted ? t('invoices.completed').toUpperCase() : t('invoices.pending').toUpperCase();
    const statusColor = isCompleted ? darkGray : mediumGray;
    
    // Just text, no background for minimal ink
    setColor(statusColor);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(`STATUS: ${statusText}`, margin, 58);
    
    // Date and order info
    setColor(mediumGray);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const dateStr = invoiceData.createDate ? new Date(invoiceData.createDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) : 'N/A';
    doc.text(dateStr, pageWidth - margin - doc.getTextWidth(dateStr), 58);
    
    // Store and order info
    yPos = 58;
    doc.text(`${t('common.store')}: ${invoiceData.store || 'N/A'}`, margin + 60, yPos);
    yPos += 5;
    doc.text(`${t('common.orderId')}: ${invoiceData.ssg_sorder_key || 'N/A'}`, margin + 60, yPos);
    if (invoiceData.shippingMethod) {
      doc.text(`${t('common.shipping')}: ${invoiceData.shippingMethod === 'aereo' ? t('common.air') : t('common.sea')}`, pageWidth - margin - 50, yPos);
    }
    
    yPos = 80;
    
    // Customer information section
    setColor(darkGray);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(t('invoices.customerInformation'), margin, yPos);
    
    yPos += 10;
    
    // Customer info cards - lighter design
    const cardHeight = 45;
    const cardSpacing = 10;
    const cardWidth = (contentWidth - cardSpacing) / 2;
    
    // Sender card - very light background
    setFillColor(veryLightGray);
    drawRoundedRect(margin, yPos, cardWidth, cardHeight, 3, true);
    
    doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.setLineWidth(0.3);
    drawRoundedRect(margin, yPos, cardWidth, cardHeight, 3);
    
    const customer = invoiceData.shipper_consignee || {};
    let tempY = yPos + 8;
    
    setColor(mediumGray);
    doc.setFontSize(9);
    doc.text(t('invoices.senderInformation'), margin + 5, tempY);
    
    tempY += 7;
    setColor(darkGray);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(customer.name || 'N/A', margin + 5, tempY);
    
    if (customer.phoneNumberS) {
      tempY += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      setColor(mediumGray);
      doc.text(`${t('invoices.altPhone')}: ${customer.phoneNumberS}`, margin + 5, tempY);
    }
    
    // Recipient card - very light background
    setFillColor(veryLightGray);
    drawRoundedRect(margin + cardWidth + cardSpacing, yPos, cardWidth, cardHeight, 3, true);
    
    doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.setLineWidth(0.3);
    drawRoundedRect(margin + cardWidth + cardSpacing, yPos, cardWidth, cardHeight, 3);
    
    tempY = yPos + 8;
    setColor(mediumGray);
    doc.setFontSize(9);
    doc.text(t('invoices.receiptInformation'), margin + cardWidth + cardSpacing + 5, tempY);
    
    tempY += 7;
    const fullName = [
      customer.firstName,
      customer.middleName,
      customer.lastName,
      customer.lastName2
    ].filter(Boolean).join(' ') || 'N/A';
    
    setColor(darkGray);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(fullName, margin + cardWidth + cardSpacing + 5, tempY);
    
    tempY += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    setColor(mediumGray);
    doc.text(`${t('invoices.phoneNumber')}: ${customer.phoneNumber || 'N/A'}`, margin + cardWidth + cardSpacing + 5, tempY);
    
    tempY += 5;
    doc.text(`${t('invoices.id')}: ${customer.cid || 'N/A'}`, margin + cardWidth + cardSpacing + 5, tempY);
    
    
    // Use the new address field if available, otherwise fall back to old format
    if (customer.address) {
      tempY += 5;
      const addressLines = customer.address.split(',').map((line: string) => line.trim());
      addressLines.forEach((line: string, index: number) => {
        if (index < 2 && line) { // Show first 2 lines
          doc.text(line, margin + cardWidth + cardSpacing + 5, tempY);
          tempY += 5;
        }
      });
    } else {
      // Fallback to old format
      let address1 = `${customer.ybstreet || ''} #${customer.ybstreetNo || ''} ${t('invoices.between')} ${customer.ybbetwen1 || ''} ${t('invoices.and')} ${customer.ybbetwen2 || ''}`;
      let address3 = `${customer.ybreparto || ''}, ${customer.ybcity || ''}, ${customer.ybestate || ''}`;
      
      tempY += 5;
      doc.text(address1, margin + cardWidth + cardSpacing + 5, tempY);
      tempY += 5;
      doc.text(address3, margin + cardWidth + cardSpacing + 5, tempY);
    }
  
    yPos += cardHeight + 15;
    
    // Products section
    if (invoiceData?.products && invoiceData?.products?.length > 0) {
      setColor(darkGray);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(t('invoices.products'), margin, yPos);
      
      yPos += 10;
      
      // Table header - very light background
      setFillColor(lightGray);
      doc.rect(margin, yPos - 6, contentWidth, 10, 'F');
      
      doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
      doc.setLineWidth(0.3);
      doc.line(margin, yPos + 4, pageWidth - margin, yPos + 4);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      setColor(darkGray);
      
      const colX = {
        code: margin + 5,
        description: margin + 35,
        qty: margin + 115,
        price: margin + 135,
        total: margin + 160
      };
      
      doc.text(t('invoices.code'), colX.code, yPos);
      doc.text(t('invoices.description'), colX.description, yPos);
      doc.text(t('invoices.qty'), colX.qty, yPos);
      doc.text(t('invoices.unitPrice'), colX.price, yPos);
      doc.text(t('invoices.total'), colX.total, yPos);
      
      yPos += 10;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      
      invoiceData.products.forEach((item: any, index: number) => {
        if (yPos > 250) {
          doc.addPage();
          yPos = margin;
        }
        
        // Alternate row colors with ultra light gray
        if (index % 2 === 0) {
          setFillColor(veryLightGray);
          doc.rect(margin, yPos - 4, contentWidth, 8, 'F');
        }
        
        setColor(darkGray);
        doc.text(item.product?.code || 'N/A', colX.code, yPos);
        
        // Truncate description if needed
        let description = item.product?.label || 'N/A';
        if (doc.getTextWidth(description) > 70) {
          description = description.substring(0, 40) + '...';
        }
        doc.text(description, colX.description, yPos);
        
        const qty = Math.abs(item.qty || 0);
        const price = parseFloat(item.salePrice || 0);
        const total = item.total || (qty * price);
        
        doc.text(qty.toString(), colX.qty, yPos);
        doc.text(`$${price.toFixed(2)}`, colX.price, yPos);
        
        doc.setFont('helvetica', 'bold');
        doc.text(`$${total.toFixed(2)}`, colX.total, yPos);
        doc.setFont('helvetica', 'normal');
        
        yPos += 8;
      });
      
      // Bottom line - lighter
      doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
      doc.setLineWidth(0.3);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      
      yPos += 15;
    }
    
    // Reservations section
    if (invoiceData.reservas && invoiceData.reservas.length > 0) {
      if (yPos > 200) {
        doc.addPage();
        yPos = margin;
      }
      
      setColor(darkGray);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(t('invoices.reservations'), margin, yPos);
      
      yPos += 10;
      
      // Table header - very light background
      setFillColor(lightGray);
      doc.rect(margin, yPos - 6, contentWidth, 10, 'F');
      
      doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
      doc.setLineWidth(0.3);
      doc.line(margin, yPos + 4, pageWidth - margin, yPos + 4);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      setColor(darkGray);
      
      const resColX = {
        type: margin + 5,
        qty: margin + 65,
        price: margin + 95,
        arancel: margin + 125,
        total: margin + 160
      };
      
      doc.text(t('invoices.type'), resColX.type, yPos);
      doc.text(t('invoices.qty'), resColX.qty, yPos);
      doc.text(t('invoices.unitPrice'), resColX.price, yPos);
      doc.text(t('invoices.arancel'), resColX.arancel, yPos);
      doc.text(t('invoices.total'), resColX.total, yPos);
      
      yPos += 10;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      
      invoiceData.reservas.forEach((item: any, index: number) => {
        if (yPos > 250) {
          doc.addPage();
          yPos = margin;
        }
        
        // Alternate row colors with ultra light gray
        if (index % 2 === 0) {
          setFillColor(veryLightGray);
          doc.rect(margin, yPos - 4, contentWidth, 8, 'F');
        }
        
        setColor(darkGray);
        doc.text(item.type || 'N/A', resColX.type, yPos);
        
        const qty = parseFloat(item.qty || 0);
        const price = parseFloat(item.price || 0);
        const arancel = parseFloat(item.arancel || 0);
        const total = item.total || (qty * price + arancel);
        
        doc.text(qty.toString(), resColX.qty, yPos);
        doc.text(`$${price.toFixed(2)}`, resColX.price, yPos);
        doc.text(`$${arancel.toFixed(2)}`, resColX.arancel, yPos);
        
        doc.setFont('helvetica', 'bold');
        doc.text(`$${total.toFixed(2)}`, resColX.total, yPos);
        doc.setFont('helvetica', 'normal');
        
        yPos += 8;
      });
      
      // Bottom line - lighter
      doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
      doc.setLineWidth(0.3);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      
      yPos += 15;
    }
    
    // Totals section
    if (yPos > 210) {
      doc.addPage();
      yPos = margin;
    }
    
    // Totals box - lighter design
    const totalsBoxX = pageWidth - margin - 80;
    const totalsBoxWidth = 80;
    
    // Calculate box height based on content
    let boxHeight = 60;
    if (invoiceData.taxAmount && invoiceData.taxAmount > 0) {
      boxHeight += 16; // Add space for tax info
    }
    
    setFillColor(veryLightGray);
    drawRoundedRect(totalsBoxX - 10, yPos, totalsBoxWidth + 10, boxHeight, 3, true);
    
    doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.setLineWidth(0.3);
    drawRoundedRect(totalsBoxX - 10, yPos, totalsBoxWidth + 10, boxHeight, 3);
    
    let totalY = yPos + 10;
    
    doc.setFontSize(10);
    setColor(mediumGray);
    
    if (invoiceData.productSubtotal !== undefined && invoiceData.productSubtotal > 0) {
      doc.text(t('invoices.productsSubtotal'), totalsBoxX, totalY);
      doc.text(`$${invoiceData.productSubtotal.toFixed(2)}`, totalsBoxX + totalsBoxWidth - 15, totalY, { align: 'right' });
      totalY += 8;
    }
    
    if (invoiceData.reservaSubtotal !== undefined && invoiceData.reservaSubtotal > 0) {
      doc.text(t('invoices.reservationsSubtotal'), totalsBoxX, totalY);
      doc.text(`$${invoiceData.reservaSubtotal.toFixed(2)}`, totalsBoxX + totalsBoxWidth - 15, totalY, { align: 'right' });
      totalY += 8;
    }
    
    // Show subtotal before tax if tax exists
    if (invoiceData.taxAmount && invoiceData.taxAmount > 0) {
      doc.text(t('common.subtotal'), totalsBoxX, totalY);
      doc.text(`$${(invoiceData.subtotalBeforeTax || 0).toFixed(2)}`, totalsBoxX + totalsBoxWidth - 15, totalY, { align: 'right' });
      totalY += 8;
      
      // Show tax
      const taxPercent = invoiceData.paymentMethods?.taxPercent || 7;
      doc.text(`${t('common.tax')} (${taxPercent}%)`, totalsBoxX, totalY);
      doc.text(`$${invoiceData.taxAmount.toFixed(2)}`, totalsBoxX + totalsBoxWidth - 15, totalY, { align: 'right' });
      totalY += 8;
    }
    
    // Divider - lighter
    doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.setLineWidth(0.3);
    doc.line(totalsBoxX, totalY + 2, totalsBoxX + totalsBoxWidth - 10, totalY + 2);
    totalY += 10;
    
    // Grand total
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    setColor(darkGray);
    doc.text(t('invoices.total'), totalsBoxX, totalY);
    doc.text(`$${(invoiceData.total || 0).toFixed(2)}`, totalsBoxX + totalsBoxWidth - 15, totalY, { align: 'right' });
    
    // Payment Methods Section
    if (invoiceData.paymentMethods) {
      yPos += boxHeight + 20;
      
      setColor(darkGray);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(t('common.paymentMethods'), margin, yPos);
      
      yPos += 10;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      setColor(mediumGray);
      
      const pm = invoiceData.paymentMethods;
      let paymentY = yPos;
      
      if (pm.cash && pm.cash > 0) {
        doc.text(`${t('common.cash')}:`, margin + 5, paymentY);
        doc.text(`$${pm.cash.toFixed(2)}`, margin + 50, paymentY);
        paymentY += 6;
      }
      
      if (pm.zelle && pm.zelle > 0) {
        doc.text('Zelle:', margin + 5, paymentY);
        doc.text(`$${pm.zelle.toFixed(2)}`, margin + 50, paymentY);
        paymentY += 6;
      }
      
      if (pm.creditCard && pm.creditCard > 0) {
        doc.text(`${t('common.creditCard')}:`, margin + 5, paymentY);
        doc.text(`$${pm.creditCard.toFixed(2)}`, margin + 50, paymentY);
        paymentY += 6;
      }
      
      // Tax note
      if (pm.exemptTaxOnCash && pm.cash > 0 && invoiceData.taxSavings > 0) {
        paymentY += 4;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.text(`* Tax exempted on cash payment. You saved $${invoiceData.taxSavings.toFixed(2)}!`, margin + 5, paymentY);
      }
      
      yPos = paymentY + 10;
    }
    
    // Footer
    yPos = pageHeight - 30;
    
    // Footer background - very light
    setFillColor(veryLightGray);
    doc.rect(0, yPos - 10, pageWidth, 40, 'F');
    
    // Thank you message
    doc.setFontSize(12);
    doc.setFont('helvetica', 'italic');
    setColor(mediumGray);
    const thankYouText = t('common.thankYouBusiness');
    const thankYouWidth = doc.getTextWidth(thankYouText);
    doc.text(thankYouText, (pageWidth - thankYouWidth) / 2, yPos);
    
    yPos += 8;
    
    // Contact info
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const contactText = 'www.hrmfinance.com | info@hrmfinance.com | +1 (555) 123-4567';
    const contactWidth = doc.getTextWidth(contactText);
    doc.text(contactText, (pageWidth - contactWidth) / 2, yPos);
    
    yPos += 8;
    
    // Generation timestamp
    doc.setFontSize(8);
    const timestamp = `Generated on ${new Date().toLocaleString('en-US')}`;
    const timestampWidth = doc.getTextWidth(timestamp);
    doc.text(timestamp, (pageWidth - timestampWidth) / 2, yPos);
    
    // Save the PDF
    const filename = `invoice-${invoiceData.invoice || 'unknown'}.pdf`;
    doc.save(filename);
    
    devLog('Professional PDF saved successfully:', filename);
    
  } catch (error) {
    console.error('Error in generateProfessionalInvoicePDF:', error);
    throw error;
  }
};