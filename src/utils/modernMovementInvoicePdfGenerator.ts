// Modern Professional Movement Invoice PDF generator - Optimized for printing

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


interface ProdPos {
  sku: number;
  product: number ;
  qty: number;
  cost?: number | undefined;
  total: number;
  received?: number;
}



export const generateModernMovementInvoicePDF = async (movementData: any, t: any, language: 'en' | 'es' = 'es') => {
  try {
    devLog('Starting modern movement invoice PDF generation...');
    
    // Get translations for selected language
    const trans = translations[language];
    
    // Import jsPDF
    const jsPDFModule = await import('jspdf');
    const jsPDF = jsPDFModule.default;
    
    devLog('jsPDF imported successfully');
    
    // Create PDF document
    const doc = new jsPDF();
    
    devLog('PDF document created');
    
    // Color scheme - Modern gray tones optimized for printing
    const colors = {
      primary: [45, 55, 72],      // Dark gray for headers
      secondary: [113, 128, 150], // Medium gray for subheaders
      light: [237, 242, 247],     // Very light gray for backgrounds
      border: [203, 213, 224],    // Light gray for borders
      text: [26, 32, 44],         // Dark gray for text
      accent: [66, 153, 225]      // Subtle blue accent
    };
    
    // Start building the invoice
    let yPos = 20;
    const leftMargin = 15;
    const rightMargin = 15;
    const pageWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const footerMargin = 20; // Space reserved for footer
    const contentWidth = pageWidth - leftMargin - rightMargin;
    const maxContentY = pageHeight - footerMargin;
    
    // Helper function to check if we need a new page
    const checkNewPage = (requiredSpace: number = 15): boolean => {
      if (yPos + requiredSpace > maxContentY) {
        doc.addPage();
        yPos = 20;
        return true;
      }
      return false;
    };
    
    // Helper function to draw a subtle background rectangle
    const drawBackgroundRect = (x: number, y: number, width: number, height: number) => {
      doc.setFillColor(...colors.light);
      doc.rect(x, y, width, height, 'F');
    };
    
    // Helper function to draw a border line
    const drawBorderLine = (x1: number, y1: number, x2: number, y2: number, width = 0.5) => {
      doc.setDrawColor(...colors.border);
      doc.setLineWidth(width);
      doc.line(x1, y1, x2, y2);
    };
    
    // Header section with modern styling
    drawBackgroundRect(leftMargin, yPos - 5, contentWidth, 25);
    
    // Company name
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.primary);
    doc.text('HRM FINANCE', leftMargin + 5, yPos + 8);
    
    // Document type on the right
    doc.setFontSize(18);
    doc.setFont('helvetica', 'normal');
    const isTransfer = movementData.movementType === 'transfer';
    const invoiceText = isTransfer ? trans.transferReceipt : trans.movementInvoice;
    const invoiceTextWidth = doc.getTextWidth(invoiceText);
    doc.setTextColor(...colors.secondary);
    doc.text(invoiceText, pageWidth - rightMargin - invoiceTextWidth - 5, yPos + 8);
    
    yPos += 30;
    
    // Document details section
    drawBackgroundRect(leftMargin, yPos - 2, contentWidth, 20);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.text);
    
    // Movement ID
    const movementId = `${trans.movementId}: ${movementData.invoiceId || movementData.id || 'N/A'}`;
    const movementIdWidth = doc.getTextWidth(movementId);
    doc.text(movementId, pageWidth - rightMargin - movementIdWidth - 5, yPos + 6);
    
    // Date
    const date = movementData.createDate || movementData.createdDate ? 
      new Date(movementData.createDate || movementData.createdDate).toLocaleDateString() : 'N/A';
    const dateText = `${trans.date}: ${date}`;
    const dateWidth = doc.getTextWidth(dateText);
    doc.text(dateText, pageWidth - rightMargin - dateWidth - 5, yPos + 12);
    
    yPos += 25;
    
    // Movement information section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.primary);
    doc.text('INFORMACIÓN DEL MOVIMIENTO', leftMargin, yPos);
    
    yPos += 8;
    drawBorderLine(leftMargin, yPos, pageWidth - rightMargin, yPos, 1);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.text);
    
    // Two-column layout for movement info
    const col1X = leftMargin;
    const col2X = leftMargin + (contentWidth / 2);
    
    // Column 1
    doc.text(`${trans.reference}:`, col1X, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(movementData.referenceNumber || 'N/A', col1X + 30, yPos);
    
  
    
    // Created by
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.text);
    doc.text(`${trans.createdBy}:`, col2X, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(movementData.createdBy || 'N/A', col2X + 40, yPos);
    
    yPos += 8;
    
    // Location information
    if (isTransfer) {
      doc.setFont('helvetica', 'normal');
      doc.text(`${trans.fromLocation}:`, col1X, yPos);
      doc.setFont('helvetica', 'bold');
      doc.text(movementData.fromLocationName || 'N/A', col1X + 45, yPos);
      
      doc.setFont('helvetica', 'normal');
      doc.text(`${trans.toLocation}:`, col2X, yPos);
      doc.setFont('helvetica', 'bold');
      doc.text(movementData.toLocationName || movementData.locationName || 'N/A', col2X + 40, yPos);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.text(`${trans.location}:`, col1X, yPos);
      doc.setFont('helvetica', 'bold');
      doc.text(movementData.locationName || 'N/A', col1X + 25, yPos);
    }
    
    yPos += 10;
    
    // Notes if available
    if (movementData.notes || movementData.generalNotes) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...colors.text);
      doc.text(`${trans.notes}:`, col1X, yPos);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...colors.secondary);
      const notesText = movementData.notes || movementData.generalNotes;
      const notesLines = doc.splitTextToSize(notesText, contentWidth - 25);
      doc.text(notesLines, col1X + 20, yPos);
      yPos += (notesLines.length * 5);
    }
    
    yPos += 15;
    
    // Products section
    const products = movementData.items || movementData.products || [];
    if (products.length > 0) {
      // Section header
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.primary);
      
      const sectionTitle = isTransfer ? trans.transferItems : trans.movementItems;
      doc.text(sectionTitle, leftMargin, yPos);
      
      yPos += 8;
      drawBorderLine(leftMargin, yPos, pageWidth - rightMargin, yPos, 1);
      yPos += 8;
      
      // Modern table header with background
      const headerHeight = 8;
      drawBackgroundRect(leftMargin, yPos - 2, contentWidth, headerHeight);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.primary);
      
      // Table column positions
      var col:ProdPos = {
        sku: leftMargin + 2,
        product: leftMargin + 25,
        qty: leftMargin + 110,
        cost: leftMargin + 130,
        total: leftMargin + 155,
        received: leftMargin + 175
      };
      

      if (isTransfer) {
        col = {
          sku: leftMargin + 2,
          product: leftMargin + 25,
          qty: leftMargin + 110,
          total: leftMargin + 130,
          received: leftMargin + 155,
        };
      }
      // Headers
      doc.text(trans.sku, col.sku, yPos + 4);
      doc.text(trans.productName, col.product, yPos + 4);
      doc.text(trans.qty, col.qty, yPos + 4);
      
      if (isTransfer) {
        doc.text(trans.total, col?.cost, yPos + 4);
        doc.text(trans.received, col?.received, yPos + 4);
      } else {
        doc.text(trans.unitCost, col.cost, yPos + 4);
        doc.text(trans.total, col.total, yPos + 4);
      }
      
      yPos += headerHeight + 2;
      
      // Table border
      drawBorderLine(leftMargin, yPos, pageWidth - rightMargin, yPos);
      yPos += 4;
      
      // Products data
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...colors.text);
      
      let grandTotal = 0;
      let rowIndex = 0;
      
      products.forEach((item: any) => {
        // Check if we need a new page
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        
        // Alternate row background
        if (rowIndex % 2 === 0) {
          drawBackgroundRect(leftMargin, yPos - 2, contentWidth, 6);
        }
        
        const sku = item.productSku || item.sku || 'N/A';
        const productName = item.productName || item.name || 'N/A';
        const quantity = Math.abs(item.quantity || item.qty || 0);
        const unitCost = parseFloat(item.unitCost || item.cost || 0);
        const totalCost = quantity * unitCost;
        grandTotal += totalCost;
        
        // SKU
        doc.text(sku, col.sku, yPos + 2);
        
        // Product name (truncated if too long)
        const maxNameWidth = 80;
        let truncatedName = productName;
        if (doc.getTextWidth(productName) > maxNameWidth) {
          truncatedName = productName.substring(0, 35) + '...';
        }
        doc.text(truncatedName, col.product, yPos + 2);
        
        // Quantity
        doc.setFont('helvetica', 'bold');
        doc.text(quantity.toString(), col.qty, yPos + 2);
        
        // Cost and total
        doc.setFont('helvetica', 'normal');
        if (isTransfer) {
          doc.text(`$${totalCost.toFixed(2)}`, col.cost, yPos + 2);
          const receivedQty = item.receivedQuantity || '_____';
          doc.text(receivedQty.toString(), col.received, yPos + 2);
        } else {
          doc.text(`$${unitCost.toFixed(2)}`, col.cost, yPos + 2);
          doc.setFont('helvetica', 'bold');
          doc.text(`$${totalCost.toFixed(2)}`, col.total, yPos + 2);
        }
        
        yPos += 6;
        rowIndex++;
      });
      
      // Table bottom border
      yPos += 2;
      drawBorderLine(leftMargin, yPos, pageWidth - rightMargin, yPos);
      
      // Total section
      if (!isTransfer || grandTotal > 0) {
        yPos += 10;
        
        // Total background
        const totalBoxWidth = 70;
        const totalBoxX = pageWidth - rightMargin - totalBoxWidth;
        drawBackgroundRect(totalBoxX, yPos - 2, totalBoxWidth, 12);
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colors.primary);
        doc.text(`${trans.totalValue}:`, totalBoxX + 5, yPos + 4);
        doc.setTextColor(...colors.accent);
        doc.text(`$${grandTotal.toFixed(2)}`, totalBoxX + 35, yPos + 4);
      }
    }
    
    // Transfer-specific receiving section
    if (isTransfer) {
      // Check if we need a new page
      if (yPos > 200) {
        doc.addPage();
        yPos = 25;
      }
      
      yPos += 20;
      
      // Receiving confirmation section
      drawBackgroundRect(leftMargin, yPos - 2, contentWidth, 8);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.primary);
      doc.text(trans.receivingConfirmation, leftMargin + 5, yPos + 4);
      
      yPos += 12;
      drawBorderLine(leftMargin, yPos, pageWidth - rightMargin, yPos);
      yPos += 10;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...colors.text);
      
      // Signature fields in modern boxes
      const fieldHeight = 8;
      const fieldSpacing = 15;
      
      // Receiver name
      drawBorderLine(leftMargin, yPos, leftMargin + 80, yPos);
      drawBorderLine(leftMargin, yPos + fieldHeight, leftMargin + 80, yPos + fieldHeight);
      drawBorderLine(leftMargin, yPos, leftMargin, yPos + fieldHeight);
      drawBorderLine(leftMargin + 80, yPos, leftMargin + 80, yPos + fieldHeight);
      doc.text(`${trans.receiverName}:`, leftMargin + 2, yPos - 2);
      
      // Date received (right side)
      const dateFieldX = leftMargin + 100;
      drawBorderLine(dateFieldX, yPos, dateFieldX + 80, yPos);
      drawBorderLine(dateFieldX, yPos + fieldHeight, dateFieldX + 80, yPos + fieldHeight);
      drawBorderLine(dateFieldX, yPos, dateFieldX, yPos + fieldHeight);
      drawBorderLine(dateFieldX + 80, yPos, dateFieldX + 80, yPos + fieldHeight);
      doc.text(`${trans.dateReceived}:`, dateFieldX + 2, yPos - 2);
      
      yPos += fieldSpacing + fieldHeight;
      
      // Signature
      drawBorderLine(leftMargin, yPos, leftMargin + 80, yPos);
      drawBorderLine(leftMargin, yPos + fieldHeight, leftMargin + 80, yPos + fieldHeight);
      drawBorderLine(leftMargin, yPos, leftMargin, yPos + fieldHeight);
      drawBorderLine(leftMargin + 80, yPos, leftMargin + 80, yPos + fieldHeight);
      doc.text(`${trans.signature}:`, leftMargin + 2, yPos - 2);
      
      yPos += fieldSpacing + fieldHeight;
      
      // Notes field
      const notesFieldHeight = 20;
      drawBorderLine(leftMargin, yPos, pageWidth - rightMargin, yPos);
      drawBorderLine(leftMargin, yPos + notesFieldHeight, pageWidth - rightMargin, yPos + notesFieldHeight);
      drawBorderLine(leftMargin, yPos, leftMargin, yPos + notesFieldHeight);
      drawBorderLine(pageWidth - rightMargin, yPos, pageWidth - rightMargin, yPos + notesFieldHeight);
      doc.text(`${trans.notes}:`, leftMargin + 2, yPos - 2);
    }
    
    // Modern footer
    const footerY = Math.max(yPos + 25, 275);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...colors.secondary);
    const footerText = isTransfer ? trans.footerTransfer : trans.footerMovement;
    const footerWidth = doc.getTextWidth(footerText);
    doc.text(footerText, (pageWidth - footerWidth) / 2, footerY);
    
    devLog('Saving PDF...');
    
    // Save the PDF
    const filename = `modern-movement-${movementData.invoiceId || movementData.id || 'unknown'}.pdf`;
    doc.save(filename);
    
    devLog('PDF saved successfully:', filename);
    
    return filename;
    
  } catch (error) {
    console.error('Error in generateModernMovementInvoicePDF:', error);
    console.error('Error details:', error);
    throw error;
  }
};