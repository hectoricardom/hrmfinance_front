// Compact Modern Professional Movement Invoice PDF generator - Optimized for printing and page size
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

export const generateCompactModernInvoicePDF = async (movementData: any, t: any, language: 'en' | 'es' = 'es') => {
  try {
    console.log('Starting compact modern invoice PDF generation...');
    
    const trans = translations[language];
    const jsPDFModule = await import('jspdf');
    const jsPDF = jsPDFModule.default;
    const doc = new jsPDF();
    
    // Compact layout settings
    let yPos = 15;
    const leftMargin = 12;
    const rightMargin = 12;
    const pageWidth = 210;
    const pageHeight = 297;
    const contentWidth = pageWidth - leftMargin - rightMargin;
    const maxContentY = pageHeight - 25;
    
    // Print-optimized colors
    const colors = {
      primary: [60, 60, 60],
      secondary: [120, 120, 120],
      light: [245, 245, 245],
      border: [200, 200, 200],
      text: [40, 40, 40]
    };
    
    const checkNewPage = (space = 10) => {
      if (yPos + space > maxContentY) {
        doc.addPage();
        yPos = 15;
        return true;
      }
      return false;
    };
    
    const drawRect = (x, y, w, h) => {
      doc.setFillColor(...colors.light);
      doc.rect(x, y, w, h, 'F');
    };
    
    const drawLine = (x1, y1, x2, y2) => {
      doc.setDrawColor(...colors.border);
      doc.setLineWidth(0.3);
      doc.line(x1, y1, x2, y2);
    };
    
    // Compact header
    drawRect(leftMargin, yPos, contentWidth, 16);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.primary);
    doc.text('HRM FINANCE', leftMargin + 3, yPos + 7);
    
    const isTransfer = movementData.movementType === 'transfer';
    const docTitle = isTransfer ? trans.transferReceipt : trans.movementInvoice;
    doc.setFontSize(12);
    doc.setTextColor(...colors.secondary);
    const titleWidth = doc.getTextWidth(docTitle);
    doc.text(docTitle, pageWidth - rightMargin - titleWidth - 3, yPos + 7);
    
    // Movement details
    doc.setFontSize(8);
    doc.setTextColor(...colors.text);
    const movId = `${trans.movementId}: ${movementData.invoiceId || 'N/A'}`;
    const movIdWidth = doc.getTextWidth(movId);
    doc.text(movId, pageWidth - rightMargin - movIdWidth - 3, yPos + 12);
    
    const date = movementData.createDate || movementData.createdDate ? 
      new Date(movementData.createDate || movementData.createdDate).toLocaleDateString() : 'N/A';
    const dateText = `${trans.date}: ${date}`;
    const dateWidth = doc.getTextWidth(dateText);
    doc.text(dateText, pageWidth - rightMargin - dateWidth - 3, yPos + 15);
    
    yPos += 20;
    
    // Movement info section (compact)
    drawLine(leftMargin, yPos, pageWidth - rightMargin, yPos);
    yPos += 4;
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    
    // Two columns for info
    const col1 = leftMargin;
    const col2 = leftMargin + (contentWidth / 2);
    
    doc.text(`${trans.reference}: ${movementData.referenceNumber || 'N/A'}`, col1, yPos);
    doc.text(`${trans.createdBy}: ${movementData.createdBy}`, col2, yPos);
    yPos += 5;
    
    
    if (isTransfer) {
      doc.text(`${trans.fromLocation}: ${movementData.fromLocationName || 'N/A'}`, col1, yPos);
      doc.text(`${trans.toLocation}: ${movementData.toLocationName || 'N/A'}`, col2, yPos);
    } else {
      doc.text(`${trans.location}: ${movementData.locationName || 'N/A'}`, col1, yPos);
    }
    yPos += 8;
    
    // Products table
    const products = movementData.items || movementData.products || [];
    if (products.length > 0) {
      checkNewPage(20);
      
      // Table header
      drawRect(leftMargin, yPos, contentWidth, 6);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.primary);
      
      // Column positions (adjusted for compact layout)
      const cols = {
        sku: leftMargin + 2,
        name: leftMargin + 22,
        qty: leftMargin + 120,
        cost: leftMargin + 135,
        total: leftMargin + 155,
        received: leftMargin + 170
      };
      
      doc.text(trans.sku, cols.sku, yPos + 4);
      doc.text(trans.productName, cols.name, yPos + 4);
      doc.text(trans.qty, cols.qty, yPos + 4);
      
      if (isTransfer) {
        doc.text(trans.total, cols.cost, yPos + 4);
        doc.text(trans.received, cols.received, yPos + 4);
      } else {
        doc.text(trans.unitCost, cols.cost, yPos + 4);
        doc.text(trans.total, cols.total, yPos + 4);
      }
      
      yPos += 8;
      drawLine(leftMargin, yPos, pageWidth - rightMargin, yPos);
      yPos += 3;
      
      // Products data
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...colors.text);
      
      let grandTotal = 0;
      
      products.forEach((item, index) => {
        checkNewPage(5);
        
        if (index % 2 === 0) {
          drawRect(leftMargin, yPos - 1, contentWidth, 4);
        }
        
        const sku = (item.productSku || item.sku || 'N/A').substring(0, 12);
        const name = (item.productName || item.name || 'N/A').substring(0, 30);
        const qty = Math.abs(item.quantity || item.qty || 0);
        const cost = parseFloat(item.unitCost || item.cost || 0);
        const total = qty * cost;
        grandTotal += total;
        
        doc.text(sku, cols.sku, yPos + 2);
        doc.text(name, cols.name, yPos + 2);
        doc.text(qty.toString(), cols.qty, yPos + 2);
        
        if (isTransfer) {
          doc.text(`$${total.toFixed(2)}`, cols.cost, yPos + 2);
          const received = item.receivedQuantity || '____';
          doc.text(received.toString(), cols.received, yPos + 2);
        } else {
          doc.text(`$${cost.toFixed(2)}`, cols.cost, yPos + 2);
          doc.text(`$${total.toFixed(2)}`, cols.total, yPos + 2);
        }
        
        yPos += 4;
      });
      
      // Total
      if (!isTransfer || grandTotal > 0) {
        yPos += 3;
        drawLine(leftMargin, yPos, pageWidth - rightMargin, yPos);
        yPos += 5;
        
        drawRect(cols.cost, yPos - 1, 50, 6);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(`${trans.totalValue}: $${grandTotal.toFixed(2)}`, cols.cost + 2, yPos + 3);
      }
    }
    
    // Transfer receiving section (compact)
    if (isTransfer) {
      checkNewPage(40);
      yPos += 10;
      
      drawRect(leftMargin, yPos, contentWidth, 6);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.primary);
      doc.text(trans.receivingConfirmation, leftMargin + 2, yPos + 4);
      yPos += 10;
      
      // Compact signature fields
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      
      // Name and date fields
      doc.text(`${trans.receiverName}:`, leftMargin, yPos);
      drawLine(leftMargin + 25, yPos + 1, leftMargin + 80, yPos + 1);
      
      doc.text(`${trans.dateReceived}:`, leftMargin + 90, yPos);
      drawLine(leftMargin + 125, yPos + 1, leftMargin + 180, yPos + 1);
      yPos += 8;
      
      // Signature
      doc.text(`${trans.signature}:`, leftMargin, yPos);
      drawLine(leftMargin + 20, yPos + 1, leftMargin + 120, yPos + 1);
      yPos += 8;
      
      // Notes
      doc.text(`${trans.notes}:`, leftMargin, yPos);
      drawLine(leftMargin + 15, yPos + 1, pageWidth - rightMargin, yPos + 1);
      drawLine(leftMargin, yPos + 6, pageWidth - rightMargin, yPos + 6);
    }
    
    // Footer
    const footerY = Math.max(yPos + 15, maxContentY);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(...colors.secondary);
    const footerText = isTransfer ? trans.footerTransfer : trans.footerMovement;
    const footerWidth = doc.getTextWidth(footerText);
    doc.text(footerText, (pageWidth - footerWidth) / 2, footerY);
    
    // Save
    const filename = `compact-modern-${movementData.invoiceId || 'unknown'}.pdf`;
    doc.save(filename);
    
    console.log('PDF saved successfully:', filename);
    return filename;
    
  } catch (error) {
    console.error('Error in generateCompactModernInvoicePDF:', error);
    throw error;
  }
};