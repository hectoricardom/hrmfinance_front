import { devLog } from "../services/utils";

// PDF generator using CDN version of jsPDF
declare global {
  interface Window {
    jsPDF: any;
  }
}

const loadJsPDFFromCDN = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    // Check if jsPDF is already loaded
    if (window.jsPDF) {
      resolve(window.jsPDF);
      return;
    }

    // Create script element
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = () => {
      if (window.jsPDF) {
        resolve(window.jsPDF);
      } else {
        reject(new Error('jsPDF not found after loading'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load jsPDF from CDN'));
    
    document.head.appendChild(script);
  });
};

export const generatePDFFromCDN = async (invoiceData: any, t: any) => {
  try {
    devLog('Loading jsPDF from CDN...');
    
    const jsPDF = await loadJsPDFFromCDN();
    devLog('jsPDF loaded from CDN successfully');
    
    // Create PDF
    const doc = new jsPDF.jsPDF();
    devLog('PDF document created');
    
    // Simple layout
    let y = 20;
    
    // Header
    doc.setFontSize(20);
    doc.text('HRM FINANCE', 20, y);
    doc.text('INVOICE', 150, y);
    
    y += 15;
    doc.setFontSize(12);
    doc.text(`Invoice: ${invoiceData.invoice || 'N/A'}`, 150, y);
    
    y += 10;
    const date = invoiceData.createDate ? new Date(invoiceData.createDate).toLocaleDateString() : 'N/A';
    doc.text(`Date: ${date}`, 150, y);
    
    y += 20;
    
    // Customer info
    doc.setFontSize(14);
    doc.text('Customer Information', 20, y);
    y += 10;
    
    doc.setFontSize(10);
    const customer = invoiceData.shipper_consignee || {};
    doc.text(`Name: ${customer.name || 'N/A'}`, 20, y);
    y += 8;
    doc.text(`Phone: ${customer.phoneNumber || 'N/A'}`, 20, y);
    y += 8;
    doc.text(`ID: ${customer.cid || 'N/A'}`, 20, y);
    
    y += 20;
    
    // Products
    if (invoiceData.products && invoiceData.products.length > 0) {
      doc.setFontSize(14);
      doc.text('Products', 20, y);
      y += 10;
      
      doc.setFontSize(9);
      invoiceData.products.forEach((item: any) => {
        const code = item.product?.code || 'N/A';
        const description = (item.product?.label || 'N/A').substring(0, 30);
        const qty = Math.abs(item.qty || 0);
        const price = parseFloat(item.salePrice || 0).toFixed(2);
        
        doc.text(`${code} - ${description} - Qty: ${qty} - $${price}`, 20, y);
        y += 6;
      });
    }
    
    y += 15;
    
    // Total
    doc.setFontSize(12);
    doc.text(`TOTAL: $${(invoiceData.total || 0).toFixed(2)}`, 20, y);
    
    // Save
    devLog('Saving PDF...');
    doc.save(`invoice-${invoiceData.invoice || 'unknown'}.pdf`);
    devLog('PDF saved successfully');
    
  } catch (error) {
    console.error('CDN PDF generation error:', error);
    throw error;
  }
};