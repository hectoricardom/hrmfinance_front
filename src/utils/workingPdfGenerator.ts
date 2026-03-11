import { devLog } from '../services/utils';

// Working PDF generator based on the successful test
export const generateWorkingInvoicePDF = async (invoiceData: any, t: any) => {
  try {
    devLog('Starting working PDF generation...');
    
    // Import jsPDF the same way as the test
    const jsPDFModule = await import('jspdf');
    const jsPDF = jsPDFModule.default;
    
    devLog('jsPDF imported successfully');
    
    // Create PDF document
    const doc = new jsPDF();
    
    devLog('PDF document created');
    
    // Start building the invoice
    let yPos = 20;
    const leftMargin = 20;
    const pageWidth = 210; // A4 width in mm
    
    // Header
    doc.setFontSize(20);
    doc.text('HRM FINANCE', leftMargin, yPos);
    
    // Invoice title on the right
    doc.setFontSize(16);
    const invoiceText = 'INVOICE';
    const invoiceTextWidth = doc.getTextWidth(invoiceText);
    doc.text(invoiceText, pageWidth - leftMargin - invoiceTextWidth, yPos);
    
    yPos += 15;
    
    // Invoice number and date
    doc.setFontSize(12);
    const invoiceNum = `Invoice: ${invoiceData.invoice || 'N/A'}`;
    const invoiceNumWidth = doc.getTextWidth(invoiceNum);
    doc.text(invoiceNum, pageWidth - leftMargin - invoiceNumWidth, yPos);
    
    yPos += 8;
    doc.setFontSize(10);
    const date = invoiceData.createDate ? new Date(invoiceData.createDate).toLocaleDateString() : 'N/A';
    const dateText = `Date: ${date}`;
    const dateWidth = doc.getTextWidth(dateText);
    doc.text(dateText, pageWidth - leftMargin - dateWidth, yPos);
    
    // Store info
    yPos = 40;
    doc.setFontSize(10);
    doc.text(`Store: ${invoiceData.storeName || invoiceData.store || 'N/A'}`, leftMargin, yPos);
    yPos += 6;
    doc.text(`Order ID: ${invoiceData.ssg_sorder_key || 'N/A'}`, leftMargin, yPos);
    
    // Line separator
    yPos += 10;
    doc.setDrawColor(200);
    doc.line(leftMargin, yPos, pageWidth - leftMargin, yPos);
    
    yPos += 15;
    
    // Customer Information
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('CUSTOMER INFORMATION', leftMargin, yPos);
    doc.setFont(undefined, 'normal');
    
    yPos += 10;
    doc.setFontSize(10);
    
    // Safe customer data access
    const customer = invoiceData.shipper_consignee || {};
    doc.text(`Name: ${customer.name || 'N/A'}`, leftMargin, yPos);
    yPos += 6;
    
    const fullName = [
      customer.firstName,
      customer.middleName,
      customer.lastName,
      customer.lastName2
    ].filter(Boolean).join(' ') || 'N/A';
    doc.text(`Full Name: ${fullName}`, leftMargin, yPos);
    yPos += 6;
    
    doc.text(`Phone: ${customer.phoneNumber || 'N/A'}`, leftMargin, yPos);
    yPos += 6;
    
    doc.text(`ID: ${customer.cid || 'N/A'}`, leftMargin, yPos);
    yPos += 6;
    
    if (customer.passport) {
      doc.text(`Passport: ${customer.passport}`, leftMargin, yPos);
      yPos += 6;
    }
    
    yPos += 10;
    
    // Products Section
    if (invoiceData.products && invoiceData.products.length > 0) {
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('PRODUCTS', leftMargin, yPos);
      doc.setFont(undefined, 'normal');
      
      yPos += 10;
      doc.setFontSize(10);
      
      // Simple table headers
      doc.text('Code', leftMargin, yPos);
      doc.text('Description', leftMargin + 30, yPos);
      doc.text('Qty', leftMargin + 100, yPos);
      doc.text('Price', leftMargin + 120, yPos);
      doc.text('Total', leftMargin + 145, yPos);
      
      yPos += 2;
      doc.line(leftMargin, yPos, pageWidth - leftMargin, yPos);
      yPos += 6;
      
      doc.setFontSize(9);
      
      invoiceData.products.forEach((item: any) => {
        // Check if we need a new page
        if (yPos > 260) {
          doc.addPage();
          yPos = 20;
        }
        
        const code = item.product?.code || 'N/A';
        const description = item.product?.label || 'N/A';
        const qty = Math.abs(item.qty || 0);
        const price = parseFloat(item.salePrice || 0);
        const total = qty * price;
        
        doc.text(code, leftMargin, yPos);
        
        // Truncate long descriptions
        const maxDescWidth = 60;
        let truncatedDesc = description;
        if (doc.getTextWidth(description) > maxDescWidth) {
          truncatedDesc = description.substring(0, 25) + '...';
        }
        doc.text(truncatedDesc, leftMargin + 30, yPos);
        
        doc.text(qty.toString(), leftMargin + 100, yPos);
        doc.text(`$${price.toFixed(2)}`, leftMargin + 120, yPos);
        doc.text(`$${total.toFixed(2)}`, leftMargin + 145, yPos);
        
        yPos += 6;
      });
      
      yPos += 10;
    }
    
    // Reservations Section
    if (invoiceData.reservas && invoiceData.reservas.length > 0) {
      // Check if we need a new page
      if (yPos > 200) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('RESERVATIONS', leftMargin, yPos);
      doc.setFont(undefined, 'normal');
      
      yPos += 10;
      doc.setFontSize(10);
      
      // Simple table headers
      doc.text('Type', leftMargin, yPos);
      doc.text('Qty', leftMargin + 50, yPos);
      doc.text('Price', leftMargin + 80, yPos);
      doc.text('Arancel', leftMargin + 110, yPos);
      doc.text('Total', leftMargin + 145, yPos);
      
      yPos += 2;
      doc.line(leftMargin, yPos, pageWidth - leftMargin, yPos);
      yPos += 6;
      
      doc.setFontSize(9);
      
      invoiceData.reservas.forEach((item: any) => {
        // Check if we need a new page
        if (yPos > 260) {
          doc.addPage();
          yPos = 20;
        }
        
        const type = item.type || 'N/A';
        const qty = parseInt(item.qty || 0);
        const price = parseFloat(item.price || 0);
        const arancel = parseFloat(item.arancel || 0);
        const total = qty * price + arancel;
        
        doc.text(type, leftMargin, yPos);
        doc.text(qty.toString(), leftMargin + 50, yPos);
        doc.text(`$${price.toFixed(2)}`, leftMargin + 80, yPos);
        doc.text(item.arancel || '-', leftMargin + 110, yPos);
        doc.text(`$${total.toFixed(2)}`, leftMargin + 145, yPos);
        
        yPos += 6;
      });
      
      yPos += 10;
    }
    
    // Totals Section
    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    }
    
    yPos += 10;
    doc.setFontSize(12);
    
    const totalsX = 120;
    
    if (invoiceData.productSubtotal !== undefined && invoiceData.productSubtotal > 0) {
      doc.text('Products Subtotal:', totalsX, yPos);
      doc.text(`$${invoiceData.productSubtotal.toFixed(2)}`, totalsX + 50, yPos);
      yPos += 8;
    }
    
    if (invoiceData.reservaSubtotal !== undefined && invoiceData.reservaSubtotal > 0) {
      doc.text('Reservations Subtotal:', totalsX, yPos);
      doc.text(`$${invoiceData.reservaSubtotal.toFixed(2)}`, totalsX + 50, yPos);
      yPos += 8;
    }
    
    // Grand total
    yPos += 5;
    doc.setFont(undefined, 'bold');
    doc.setFontSize(14);
    doc.text('TOTAL:', totalsX, yPos);
    doc.text(`$${(invoiceData.total || 0).toFixed(2)}`, totalsX + 50, yPos);
    
    // Footer
    yPos = 270;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100);
    const thankYouText = 'Thank you for your business!';
    const thankYouWidth = doc.getTextWidth(thankYouText);
    doc.text(thankYouText, (pageWidth - thankYouWidth) / 2, yPos);
    
    devLog('Saving PDF...');
    
    // Save the PDF
    const filename = `invoice-${invoiceData.invoice || 'unknown'}.pdf`;
    doc.save(filename);
    
    devLog('PDF saved successfully:', filename);
    
  } catch (error) {
    console.error('Error in generateWorkingInvoicePDF:', error);
    console.error('Error details:', error);
    throw error;
  }
};