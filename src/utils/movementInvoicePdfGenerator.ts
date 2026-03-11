// Movement Invoice PDF generator - handles both regular movements and transfers

import { devLog } from '../services/utils';

// Language translations
const translations = {
  en: {
    transferReceipt: 'TRANSFER RECEIPT',
    movementInvoice: 'MOVEMENT INVOICE',
    movementId: 'Movement ID',
    date: 'Date',
    reference: 'Reference',
    movementType: 'Movement Type',
    createdBy: 'Created By',
    fromLocation: 'From Location',
    toLocation: 'To Location',
    location: 'Location',
    notes: 'Notes',
    transferItems: 'TRANSFER ITEMS',
    movementItems: 'MOVEMENT ITEMS',
    sku: 'SKU',
    productName: 'Product Name',
    qty: 'Qty',
    unitCost: 'Unit Cost',
    total: 'Total',
    received: 'Received',
    totalValue: 'TOTAL VALUE',
    receivingConfirmation: 'RECEIVING CONFIRMATION',
    receiverName: 'Receiver Name',
    dateReceived: 'Date Received',
    signature: 'Signature',
    footerTransfer: 'Please verify all received quantities and sign above.',
    footerMovement: 'Movement processed successfully.',
    movementTypes: {
      in: 'IN',
      out: 'OUT',
      transfer: 'TRANSFER',
      adjustment: 'ADJUSTMENT'
    }
  },
  es: {
    transferReceipt: 'RECIBO DE TRANSFERENCIA',
    movementInvoice: 'FACTURA DE MOVIMIENTO',
    movementId: 'ID de Movimiento',
    date: 'Fecha',
    reference: 'Referencia',
    movementType: 'Tipo de Movimiento',
    createdBy: 'Creado Por',
    fromLocation: 'Ubicación de Origen',
    toLocation: 'Ubicación de Destino',
    location: 'Ubicación',
    notes: 'Notas',
    transferItems: 'ARTÍCULOS DE TRANSFERENCIA',
    movementItems: 'ARTÍCULOS DEL MOVIMIENTO',
    sku: 'SKU',
    productName: 'Nombre del Producto',
    qty: 'Cant.',
    unitCost: 'Costo Unit.',
    total: 'Total',
    received: 'Recibido',
    totalValue: 'VALOR TOTAL',
    receivingConfirmation: 'CONFIRMACIÓN DE RECEPCIÓN',
    receiverName: 'Nombre del Receptor',
    dateReceived: 'Fecha de Recepción',
    signature: 'Firma',
    footerTransfer: 'Por favor verifique todas las cantidades recibidas y firme arriba.',
    footerMovement: 'Movimiento procesado exitosamente.',
    movementTypes: {
      in: 'ENTRADA',
      out: 'SALIDA',
      transfer: 'TRANSFERENCIA',
      adjustment: 'AJUSTE'
    }
  }
};

export const generateMovementInvoicePDF = async (movementData: any, t: any, language: 'en' | 'es' = 'es') => {
  try {
    devLog('Starting movement invoice PDF generation...');
    
    // Get translations for selected language
    const trans = translations[language];
    
    // Import jsPDF
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
    
    // Movement invoice title on the right
    doc.setFontSize(16);
    const isTransfer = movementData.movementType === 'transfer';
    const invoiceText = isTransfer ? trans.transferReceipt : trans.movementInvoice;
    const invoiceTextWidth = doc.getTextWidth(invoiceText);
    doc.text(invoiceText, pageWidth - leftMargin - invoiceTextWidth, yPos);
    
    yPos += 15;
    
    // Movement details
    doc.setFontSize(12);
    const movementId = `${trans.movementId}: ${movementData.invoiceId || movementData.id || 'N/A'}`;
    const movementIdWidth = doc.getTextWidth(movementId);
    doc.text(movementId, pageWidth - leftMargin - movementIdWidth, yPos);
    
    yPos += 8;
    doc.setFontSize(10);
    const date = movementData.createDate || movementData.createdDate ? 
      new Date(movementData.createDate || movementData.createdDate).toLocaleDateString() : 'N/A';
    const dateText = `${trans.date}: ${date}`;
    const dateWidth = doc.getTextWidth(dateText);
    doc.text(dateText, pageWidth - leftMargin - dateWidth, yPos);
    
    // Movement info
    yPos = 40;
    doc.setFontSize(10);
    doc.text(`${trans.reference}: ${movementData.referenceNumber || 'N/A'}`, leftMargin, yPos);
    yPos += 6;
    
    const movementTypeText = trans.movementTypes[movementData.movementType] || movementData.movementType?.toUpperCase() || 'N/A';
    doc.text(`${trans.movementType}: ${movementTypeText}`, leftMargin, yPos);
    yPos += 6;
    doc.text(`${trans.createdBy}: ${movementData.createdBy || 'N/A'}`, leftMargin, yPos);
    
    // Location information
    yPos += 10;
    if (isTransfer) {
      doc.text(`${trans.fromLocation}: ${movementData.fromLocationName || 'N/A'}`, leftMargin, yPos);
      yPos += 6;
      doc.text(`${trans.toLocation}: ${movementData.toLocationName || movementData.locationName || 'N/A'}`, leftMargin, yPos);
    } else {
      doc.text(`${trans.location}: ${movementData.locationName || 'N/A'}`, leftMargin, yPos);
    }
    
    // Notes if available
    if (movementData.notes || movementData.generalNotes) {
      yPos += 10;
      doc.text(`${trans.notes}: ${movementData.notes || movementData.generalNotes}`, leftMargin, yPos);
    }
    
    // Line separator
    yPos += 10;
    doc.setDrawColor(200);
    doc.line(leftMargin, yPos, pageWidth - leftMargin, yPos);
    
    yPos += 15;
    
    // Products Section
    const products = movementData.items || movementData.products || [];
    if (products.length > 0) {
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      
      if (isTransfer) {
        doc.text(trans.transferItems, leftMargin, yPos);
      } else {
        doc.text(trans.movementItems, leftMargin, yPos);
      }
      doc.setFont(undefined, 'normal');
      
      yPos += 10;
      doc.setFontSize(10);
      
      // Table headers
      doc.text(trans.sku, leftMargin, yPos);
      doc.text(trans.productName, leftMargin + 35, yPos);
      doc.text(trans.qty, leftMargin + 100, yPos);
      if (isTransfer) {
        doc.text(trans.total, leftMargin + 120, yPos);
        doc.text(trans.received, leftMargin + 150, yPos);
      }else{
        doc.text(trans.unitCost, leftMargin + 120, yPos);
        doc.text(trans.total, leftMargin + 150, yPos);
      }
      // For transfers, add received column
    
      
      yPos += 2;
      doc.line(leftMargin, yPos, pageWidth - leftMargin, yPos);
      yPos += 6;
      
      doc.setFontSize(9);
      
      let grandTotal = 0;
      
      products.forEach((item: any) => {
        // Check if we need a new page
        if (yPos > 260) {
          doc.addPage();
          yPos = 20;
        }
        
        const sku = item.productSku || item.sku || 'N/A';
        const productName = item.productName || item.name || 'N/A';
        const quantity = Math.abs(item.quantity || item.qty || 0);
        const unitCost = parseFloat(item.unitCost || item.cost || 0);
        const totalCost = quantity * unitCost;
        grandTotal += totalCost;
        
        doc.text(sku, leftMargin, yPos);
        
        // Truncate long product names
        const maxNameWidth = 60;
        let truncatedName = productName;
        if (doc.getTextWidth(productName) > maxNameWidth) {
          truncatedName = productName.substring(0, 25) + '...';
        }
        doc.text(truncatedName, leftMargin + 35, yPos);
        
        doc.text(quantity.toString(), leftMargin + 100, yPos);
        
        
        // For transfers, add received amount field
        if (isTransfer) {
          const receivedQty = item.receivedQuantity || '_________';
          doc.text(receivedQty.toString(), leftMargin + 150, yPos);
          doc.text(`$${totalCost.toFixed(2)}`, leftMargin + 120, yPos);
        }
        else{
         
          doc.text(`$${totalCost.toFixed(2)}`, leftMargin + 150, yPos);
          doc.text(`$${unitCost.toFixed(2)}`, leftMargin + 120, yPos);
        
        }
        
        yPos += 6;
      });
      
      yPos += 10;
      
      // Total section (only for non-transfers or when costs are involved)
      if (!isTransfer || grandTotal > 0) {
        yPos += 5;
        doc.setFont(undefined, 'bold');
        doc.setFontSize(12);
        const totalsX = 120;
        doc.text(`${trans.totalValue}:`, totalsX, yPos);
        doc.text(`$${grandTotal.toFixed(2)}`, totalsX + 50, yPos);
      }
    }
    
    // Transfer-specific section for receiving confirmation
    if (isTransfer) {
      // Check if we need a new page
      if (yPos > 200) {
        doc.addPage();
        yPos = 20;
      }
      
      yPos += 20;
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(trans.receivingConfirmation, leftMargin, yPos);
      doc.setFont(undefined, 'normal');
      
      yPos += 15;
      doc.setFontSize(10);
      doc.text(`${trans.receiverName}: ________________________`, leftMargin, yPos);
      yPos += 15;
      doc.text(`${trans.dateReceived}: ________________________`, leftMargin, yPos);
      yPos += 15;
      doc.text(`${trans.signature}: ____________________________`, leftMargin, yPos);
      yPos += 20;
      doc.text(`${trans.notes}: ________________________________`, leftMargin, yPos);
      yPos += 8;
      doc.text('_______________________________________', leftMargin, yPos);
      yPos += 8;
      doc.text('_______________________________________', leftMargin, yPos);
    }
    
    // Footer
    const footerY = isTransfer ? Math.max(yPos + 20, 270) : 270;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100);
    const footerText = isTransfer ? trans.footerTransfer : trans.footerMovement;
    const footerWidth = doc.getTextWidth(footerText);
    doc.text(footerText, (pageWidth - footerWidth) / 2, footerY);
    
    devLog('Saving PDF...');
    
    // Save the PDF
    const filename = `movement-${movementData.invoiceId || movementData.id || 'unknown'}.pdf`;
    doc.save(filename);
    
    devLog('PDF saved successfully:', filename);
    
    return filename;
    
  } catch (error) {
    console.error('Error in generateMovementInvoicePDF:', error);
    console.error('Error details:', error);
    throw error;
  }
};