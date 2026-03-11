import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { InternationalShippingForm } from '../types/internationalShippingTypes';

interface ExtendedJsPDF extends jsPDF {
  lastAutoTable?: {
    finalY: number;
  };
}

/**
 * Generate a PDF matching the "DOS AMIGOS" invoice format
 * @param shippingData - The shipping form data
 * @param language - Language for the PDF (en or es)
 * @returns Promise<Blob> of the generated PDF
 */
export const generateInternationalShippingPDF = async (
  shippingData: InternationalShippingForm,
  language: 'en' | 'es' = 'es'
): Promise<Blob> => {
  const doc = new jsPDF() as ExtendedJsPDF;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  let currentY = margin;

  // Generate QR code with invoice ID
  let qrCodeDataUrl: string | null = null;
  try {
    qrCodeDataUrl = await QRCode.toDataURL(shippingData.invoice, {
      width: 80,
      margin: 1,
      errorCorrectionLevel: 'M'
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
  }

  // Get country info
  const countryInfo = shippingData.pricingConfig.countryTariffs.find(
    c => c.country === shippingData.destinationCountry
  );

  // Helper function to draw a box/rectangle
  const drawBox = (x: number, y: number, width: number, height: number, fill = false) => {
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    if (fill) {
      doc.setFillColor(240, 240, 240);
      doc.rect(x, y, width, height, 'FD');
    } else {
      doc.rect(x, y, width, height);
    }
  };

  // ============ HEADER SECTION ============
  // Company name and license on left
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('DOS AMIGOS', margin, currentY + 5);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('LIC. FMC 024902N', margin, currentY + 10);

  // QR Code with invoice ID (top right corner)
  const qrSize = 25; // QR code size in mm


  // INVOICE title and number on right (adjusted position for QR code)
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', pageWidth - margin - qrSize - 45, currentY + 5);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`N° ${shippingData.invoice}`, pageWidth - margin - qrSize - 45, currentY + 12);

  currentY += 22;

  // ============ AGENT & DATE INFO BOX ============
  const boxHeight = 12;

  // Agent name box (left side)
  drawBox(margin, currentY, pageWidth * 0.5, boxHeight);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Nombre del Agente', margin + 2, currentY + 4);
  doc.text('Autorizado', margin + 2, currentY + 8);

  // Date box (top right)
  const dateBoxX = margin + pageWidth * 0.5;
  drawBox(dateBoxX, currentY, pageWidth * 0.2, boxHeight / 2);
  doc.setFontSize(9);
  doc.text('FECHA', dateBoxX + 2, currentY + 4);
  const today = new Date();
  doc.setFont('helvetica', 'normal');
  doc.text(
    `${today.getDate()} / ${today.getMonth() + 1} / ${today.getFullYear()}`,
    dateBoxX + 20,
    currentY + 4
  );

  // Country box (bottom right)
  drawBox(dateBoxX, currentY + boxHeight / 2, pageWidth * 0.2, boxHeight / 2);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('PAIS', dateBoxX + 2, currentY + 10);
  doc.setFont('helvetica', 'normal');
  doc.text(countryInfo?.label || '', dateBoxX + 15, currentY + 10);

  if (qrCodeDataUrl) {
    doc.addImage(qrCodeDataUrl, 'PNG', pageWidth - margin - qrSize, currentY , qrSize, qrSize);
  }

  currentY += boxHeight + 2;

  // ============ COMPANY ADDRESS & PHONE ============
  const addressBoxHeight = 8;

  // Direccion box
  drawBox(margin, currentY, pageWidth * 0.12, addressBoxHeight);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('REMITENTE:', margin + 1, currentY + 5);

  drawBox(margin + pageWidth * 0.12, currentY, pageWidth * 0.58, addressBoxHeight);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const storeAddress =  'YABA SUR CARGO';
  doc.text(storeAddress, margin + pageWidth * 0.12 + 2, currentY + 5);

  currentY += addressBoxHeight;

  // Telefono box
  drawBox(margin, currentY, pageWidth * 0.12, addressBoxHeight);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Telefono', margin + 1, currentY + 5);

  drawBox(margin + pageWidth * 0.12, currentY, pageWidth * 0.58, addressBoxHeight);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('(713) 582-2238', margin + pageWidth * 0.12 + 2, currentY + 5);


  currentY += addressBoxHeight + 2;

  // ============ REMITENTE SECTION (VERTICAL) ============
  const fullWidth = pageWidth - margin * 2;
  const labelWidth = 25;
  const rowHeight = 8;



  // ============ DESTINATARIO SECTION (VERTICAL) ============
  // DESTINATARIO Header
  drawBox(margin, currentY, fullWidth, rowHeight, true);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DESTINATARIO', margin + fullWidth / 2, currentY + 5, { align: 'center' });
  currentY += rowHeight;

  // Nombre
  drawBox(margin, currentY, labelWidth, rowHeight);
  doc.setFontSize(9);
  doc.text('Nombre', margin + 2, currentY + 5);
  drawBox(margin + labelWidth, currentY, fullWidth - labelWidth, rowHeight);
  doc.setFont('helvetica', 'normal');
  const destName = shippingData.shipper_consignee.firstName
    ? `${shippingData.shipper_consignee.firstName} ${shippingData.shipper_consignee.lastName || ''}`.trim()
    : shippingData.shipper_consignee.name || '';
  doc.text(destName, margin + labelWidth + 2, currentY + 5);
  currentY += rowHeight;

  // Telefono
  drawBox(margin, currentY, labelWidth, rowHeight);
  doc.setFont('helvetica', 'bold');
  doc.text('Telefono', margin + 2, currentY + 5);
  drawBox(margin + labelWidth, currentY, fullWidth - labelWidth, rowHeight);
  doc.setFont('helvetica', 'normal');
  doc.text(shippingData.shipper_consignee.phoneNumber || '', margin + labelWidth + 2, currentY + 5);
  currentY += rowHeight;

  // Direccion
  drawBox(margin, currentY, labelWidth, rowHeight);
  doc.setFont('helvetica', 'bold');
  doc.text('Direccion', margin + 2, currentY + 5);
  drawBox(margin + labelWidth, currentY, fullWidth - labelWidth, rowHeight);
  doc.setFont('helvetica', 'normal');
  const destAddress = shippingData.shipper_consignee.address || '';
  doc.text(destAddress, margin + labelWidth + 2, currentY + 5);
  currentY += rowHeight;

  // Ciudad
  drawBox(margin, currentY, labelWidth, rowHeight);
  doc.setFont('helvetica', 'bold');
  doc.text('Ciudad', margin + 2, currentY + 5);
  drawBox(margin + labelWidth, currentY, fullWidth - labelWidth, rowHeight);
  currentY += rowHeight + 2;

  // ============ ITEMS TABLE ============
  const tableStartY = currentY;
  const col1Width = 20; // Cantidad
  const col2Width = 35; // Tamaño caja
  const col3Width = pageWidth - margin * 2 - col1Width - col2Width - 30; // Descripcion
  const col4Width = 30; // importe

  // Table headers
  drawBox(margin, currentY, col1Width, rowHeight, true);
  drawBox(margin + col1Width, currentY, col2Width, rowHeight, true);
  drawBox(margin + col1Width + col2Width, currentY, col3Width, rowHeight, true);
  drawBox(margin + col1Width + col2Width + col3Width, currentY, col4Width, rowHeight, true);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Cantidad', margin + col1Width / 2, currentY + 5, { align: 'center' });
  doc.text('Tamaño caja', margin + col1Width + col2Width / 2, currentY + 5, { align: 'center' });
  doc.text('Descripcion', margin + col1Width + col2Width + col3Width / 2, currentY + 5, { align: 'center' });
  doc.text('importe', margin + col1Width + col2Width + col3Width + col4Width / 2, currentY + 5, { align: 'center' });

  currentY += rowHeight;

  // Table rows - shipment items
  const maxRows = 8; // Reserve space for totals and signatures
  let rowCount = 0;

  if (shippingData.shipmentItems && shippingData.shipmentItems.length > 0) {
    shippingData.shipmentItems.forEach((item, index) => {
      if (rowCount >= maxRows) return;

      drawBox(margin, currentY, col1Width, rowHeight);
      drawBox(margin + col1Width, currentY, col2Width, rowHeight);
      drawBox(margin + col1Width + col2Width, currentY, col3Width, rowHeight);
      drawBox(margin + col1Width + col2Width + col3Width, currentY, col4Width, rowHeight);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);

      // Cantidad
      doc.text(item.qty.toString(), margin + col1Width / 2, currentY + 5, { align: 'center' });

      // Tamaño caja (dimensions)
      const boxSize = `${item.dimensions.height}"×${item.dimensions.width}"×${item.dimensions.depth}"`;
      doc.text(boxSize, margin + col1Width + col2Width / 2, currentY + 5, { align: 'center' });

      // Descripcion
      const desc = item.description || 'N/A';
      doc.text(desc, margin + col1Width + col2Width + 2, currentY + 5);

      // Importe (total including tariff)
      doc.text(`$${item.total.toFixed(2)}`, margin + col1Width + col2Width + col3Width + col4Width - 2, currentY + 5, { align: 'right' });

      currentY += rowHeight;
      rowCount++;
    });
  }

  // Fill remaining rows
  while (rowCount < maxRows) {
    drawBox(margin, currentY, col1Width, rowHeight);
    drawBox(margin + col1Width, currentY, col2Width, rowHeight);
    drawBox(margin + col1Width + col2Width, currentY, col3Width, rowHeight);
    drawBox(margin + col1Width + col2Width + col3Width, currentY, col4Width, rowHeight);
    currentY += rowHeight;
    rowCount++;
  }

  // ============ TOTALS SECTION ============
  const totalsBoxWidth = col3Width + col4Width;
  const totalsStartX = margin + col1Width + col2Width;

  // Calculate totals
  const subtotal = shippingData.shipmentItems.reduce((sum, item) => sum + item.subtotal, 0);
  const tariffTotal = shippingData.shipmentItems.reduce((sum, item) => sum + item.tariff, 0);
  const insurancePercent = shippingData.insurancePercent || 5; // Use form insurance or default 5%
  const insurance = subtotal * (insurancePercent / 100);
  const grandTotal = subtotal + tariffTotal + insurance;

  // Seguro label with dynamic percentage
  drawBox(totalsStartX, currentY, totalsBoxWidth - col4Width, rowHeight);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Seguro ${insurancePercent} %`, totalsStartX + (totalsBoxWidth - col4Width) / 2, currentY + 5, { align: 'center' });

  drawBox(totalsStartX + totalsBoxWidth - col4Width, currentY, col4Width, rowHeight);
  doc.setFont('helvetica', 'normal');
  doc.text(`$${insurance.toFixed(2)}`, totalsStartX + totalsBoxWidth - 2, currentY + 5, { align: 'right' });

  currentY += rowHeight;

  // TOTAL
  drawBox(totalsStartX, currentY, totalsBoxWidth - col4Width, rowHeight);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL', totalsStartX + (totalsBoxWidth - col4Width) / 2, currentY + 5, { align: 'center' });

  drawBox(totalsStartX + totalsBoxWidth - col4Width, currentY, col4Width, rowHeight);
  doc.setFontSize(10);
  doc.text(`$${grandTotal.toFixed(2)}`, totalsStartX + totalsBoxWidth - 2, currentY + 5, { align: 'right' });

  currentY += rowHeight + 5;

  // ============ TERMS AND CONDITIONS ============
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  const terms = `La empresa NO acepta envíos que contengan los siguientes artículos: Oro, Plata, Dinero en efectivo, Money Orders, Cheques u otra forma de pagos, Armas de fuego, Pasaportes, Cadáveres, Antigüedades, Licores, Drogas, Municiones, Armas blancas, Explosivos, Pornografía. El cliente acepta que todo lo enviado no contiene nada que ponga en riesgo la seguridad se hace responsable por lo entregado a la empresa. Mi obligación como clientes garantiza que cada artículo enviado está debidamente declarado y es aceptable para ser transportado por nuestra compañía. Nuestra empresa se responsabiliza a pagar $200,00 por envío NO asegurado en caso de pérdida total (Robo, Asalto, hundimiento, etc.) El máximo aceptado de seguro por envío es de $500,00. Se aceptará un seguro distinto en casos especiales (Artículo Especial) costo del seguro 15% del valor declarado. No nos hacemos responsables por daños o retrasos ajenos a nuestra empresa. No se realizarán los envíos que no tenga su pago debidamente cancelado. Las cargas que tengan más de 60 días sin ser abonadas se considerarán en abandono y tendremos la potestad de rematar su contenido. En caso de reclamos presentarlos antes de 24Hs por escrito. No nos hacemos responsables por daños causados por mal empaquetado.`;

  const termsLines = doc.splitTextToSize(terms, pageWidth - margin * 2);
  doc.text(termsLines, margin, currentY);

  currentY += termsLines.length * 2 + 5;

  // ============ SIGNATURE SECTION ============
  const sigBoxWidth = (pageWidth - margin * 2) / 3;
  const sigBoxHeight = 15;

  // FIRMA REMITENTE
  drawBox(margin, currentY, sigBoxWidth - 2, sigBoxHeight);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('FIRMA REMITENTE', margin + sigBoxWidth / 2 - 1, currentY + sigBoxHeight + 4, { align: 'center' });

  // FECHA
  drawBox(margin + sigBoxWidth, currentY, sigBoxWidth - 2, sigBoxHeight);
  doc.text('FECHA', margin + sigBoxWidth + sigBoxWidth / 2 - 1, currentY + sigBoxHeight + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text('____ / ____ / ____', margin + sigBoxWidth + sigBoxWidth / 2 - 1, currentY + sigBoxHeight / 2, { align: 'center' });

  // FIRMA AGENTE
  drawBox(margin + sigBoxWidth * 2, currentY, sigBoxWidth - 2, sigBoxHeight);
  doc.setFont('helvetica', 'bold');
  doc.text('FIRMA AGENTE', margin + sigBoxWidth * 2 + sigBoxWidth / 2 - 1, currentY + sigBoxHeight + 4, { align: 'center' });

  // Return as Blob
  return doc.output('blob');
};

/**
 * Generate and download a PDF for international shipping
 * @param shippingData - The shipping form data
 * @param filename - Optional custom filename
 * @param language - Language for the PDF (en or es)
 */
export const downloadInternationalShippingPDF = async (
  shippingData: InternationalShippingForm,
  filename?: string,
  language: 'en' | 'es' = 'es'
): Promise<void> => {
  const blob = await generateInternationalShippingPDF(shippingData, language);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `invoice-${shippingData.invoice}-${Date.now()}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};





// IOE0931027164