import { devLog } from '../services/utils';

// Basic PDF generator that should work reliably
export const generateBasicInvoicePDF = async (invoiceData: any, t: any) => {
  try {
    devLog('Starting basic PDF generation...');
    devLog('Invoice data received:', invoiceData);

    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      throw new Error('PDF generation only works in browser environment');
    }

    // Try to load jsPDF
    let jsPDF;
    try {
      const jsPDFModule = await import('jspdf');
      jsPDF = jsPDFModule.default;
      devLog('jsPDF loaded successfully');
    } catch (importError) {
      console.error('Failed to import jsPDF:', importError);
      throw new Error('Failed to load PDF library');
    }

    if (!jsPDF) {
      throw new Error('jsPDF not available');
    }

    // Create PDF instance
    devLog('Creating PDF document...');
    const pdf = new jsPDF();
    
    // Basic document setup
    let yPosition = 20;
    const leftMargin = 20;
    const pageWidth = pdf.internal.pageSize.getWidth();
    
    // Helper function to add text
    const addText = (text: string, x: number, y: number, fontSize = 12) => {
      pdf.setFontSize(fontSize);
      pdf.text(String(text || ''), x, y);
    };

    // Header
    addText('HRM FINANCE', leftMargin, yPosition, 20);
    addText('INVOICE', pageWidth - 50, yPosition, 16);
    
    yPosition += 15;
    
    // Invoice number and date
    addText(`Invoice: ${invoiceData.invoice || 'N/A'}`, pageWidth - 80, yPosition, 12);
    yPosition += 10;
    
    const date = invoiceData.createDate ? new Date(invoiceData.createDate).toLocaleDateString() : 'N/A';
    addText(`Date: ${date}`, pageWidth - 80, yPosition, 10);
    
    yPosition += 15;
    
    // Store info
    addText(`Store: ${invoiceData.storeName || invoiceData.store || 'N/A'}`, leftMargin, yPosition, 10);
    yPosition += 8;
    addText(`Order ID: ${invoiceData.ssg_sorder_key || 'N/A'}`, leftMargin, yPosition, 10);
    
    yPosition += 20;
    
    // Customer info
    addText('CUSTOMER INFORMATION', leftMargin, yPosition, 14);
    yPosition += 10;
    
    const customer = invoiceData.shipper_consignee || {};
    addText(`Name: ${customer.name || 'N/A'}`, leftMargin, yPosition, 10);
    yPosition += 8;
    
    const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ') || 'N/A';
    addText(`Full Name: ${fullName}`, leftMargin, yPosition, 10);
    yPosition += 8;
    
    addText(`Phone: ${customer.phoneNumber || 'N/A'}`, leftMargin, yPosition, 10);
    yPosition += 8;
    
    addText(`ID: ${customer.cid || 'N/A'}`, leftMargin, yPosition, 10);
    yPosition += 15;
    
    // Products section
    if (invoiceData.products && invoiceData.products.length > 0) {
      addText('PRODUCTS', leftMargin, yPosition, 14);
      yPosition += 10;
      
      // Simple table headers
      addText('Code', leftMargin, yPosition, 10);
      addText('Description', leftMargin + 40, yPosition, 10);
      addText('Qty', leftMargin + 120, yPosition, 10);
      addText('Price', leftMargin + 140, yPosition, 10);
      
      yPosition += 8;
      
      // Products
      invoiceData.products.forEach((item: any) => {
        if (yPosition > 250) {
          pdf.addPage();
          yPosition = 20;
        }
        
        addText(item.product?.code || 'N/A', leftMargin, yPosition, 9);
        
        let description = item.product?.label || 'N/A';
        if (description.length > 25) {
          description = description.substring(0, 25) + '...';
        }
        addText(description, leftMargin + 40, yPosition, 9);
        
        addText(String(Math.abs(item.qty || 0)), leftMargin + 120, yPosition, 9);
        addText(`$${parseFloat(item.salePrice || 0).toFixed(2)}`, leftMargin + 140, yPosition, 9);
        
        yPosition += 6;
      });
      
      yPosition += 10;
    }
    
    // Reservations section
    if (invoiceData.reservas && invoiceData.reservas.length > 0) {
      if (yPosition > 200) {
        pdf.addPage();
        yPosition = 20;
      }
      
      addText('RESERVATIONS', leftMargin, yPosition, 14);
      yPosition += 10;
      
      // Simple table headers
      addText('Type', leftMargin, yPosition, 10);
      addText('Qty', leftMargin + 60, yPosition, 10);
      addText('Price', leftMargin + 90, yPosition, 10);
      addText('Arancel', leftMargin + 130, yPosition, 10);
      
      yPosition += 8;
      
      // Reservations
      invoiceData.reservas.forEach((item: any) => {
        if (yPosition > 250) {
          pdf.addPage();
          yPosition = 20;
        }
        
        addText(item.type || 'N/A', leftMargin, yPosition, 9);
        addText(String(item.qty || 0), leftMargin + 60, yPosition, 9);
        addText(`$${parseFloat(item.price || 0).toFixed(2)}`, leftMargin + 90, yPosition, 9);
        addText(item.arancel || '-', leftMargin + 130, yPosition, 9);
        
        yPosition += 6;
      });
      
      yPosition += 10;
    }
    
    // Totals
    if (yPosition > 220) {
      pdf.addPage();
      yPosition = 20;
    }
    
    yPosition += 10;
    addText('TOTALS', leftMargin, yPosition, 14);
    yPosition += 10;
    
    if (invoiceData.productSubtotal) {
      addText(`Products Subtotal: $${invoiceData.productSubtotal.toFixed(2)}`, leftMargin, yPosition, 10);
      yPosition += 8;
    }
    
    if (invoiceData.reservaSubtotal) {
      addText(`Reservations Subtotal: $${invoiceData.reservaSubtotal.toFixed(2)}`, leftMargin, yPosition, 10);
      yPosition += 8;
    }
    
    addText(`TOTAL: $${(invoiceData.total || 0).toFixed(2)}`, leftMargin, yPosition, 12);
    
    // Save the PDF
    devLog('Saving PDF...');
    const filename = `invoice-${invoiceData.invoice || 'unknown'}.pdf`;
    pdf.save(filename);
    
    devLog('PDF saved successfully:', filename);
    return true;
    
  } catch (error) {
    console.error('Error in generateBasicInvoicePDF:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    throw error;
  }
};