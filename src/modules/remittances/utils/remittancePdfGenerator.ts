import jsPDF from 'jspdf';
import { RemittanceData } from '../types/remittanceTypes';

export const generateRemittancePDF = (data: RemittanceData): void => {
  // Create PDF with 2.3 x 4 inch dimensions (convert to mm for jsPDF)
  const widthInMm = 2.3 * 25.4; // 58.42 mm
  const heightInMm = 4 * 25.4;   // 101.6 mm
  
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [widthInMm, heightInMm]
  });

  // Set margins
  const margin = 5;
  const lineHeight = 5;
  let yPosition = margin;

  // Helper function to add text with word wrapping
  const addWrappedText = (text: string, y: number, fontSize: number = 10): number => {
    pdf.setFontSize(fontSize);
    const lines = pdf.splitTextToSize(text, widthInMm - (2 * margin));
    pdf.text(lines, margin, y);
    return y + (lines.length * lineHeight);
  };

  // Title
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('REMESA', widthInMm / 2, yPosition, { align: 'center' });
  yPosition += 8;

  // Add a line separator
  pdf.setLineWidth(0.5);
  pdf.line(margin, yPosition, widthInMm - margin, yPosition);
  yPosition += 5;

  // Date and Reference Number
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  const currentDate = new Date(data.date);
  pdf.text(`Fecha: ${currentDate.toLocaleDateString('es-ES')}`, margin, yPosition);
  yPosition += 4;
  
  pdf.text(`No.: ${data.remittanceNumber}`, margin, yPosition);
  yPosition += 4;
  
  // Another separator
  pdf.setLineWidth(0.2);
  pdf.line(margin, yPosition, widthInMm - margin, yPosition);
  yPosition += 5;

  // Customer Information
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('DESTINATARIO:', margin, yPosition);
  yPosition += 5;

  // Full Name
  pdf.setFont('helvetica', 'normal');
  const fullName = data.customer.fullName || 
    `${data.customer.firstName || ''} ${data.customer.lastName || ''}`.trim() || 
    data.customer.name;
  yPosition = addWrappedText(fullName, yPosition, 9);
  yPosition += 2;

  // Address
  if (data.customer.address) {
    pdf.setFontSize(8);
    yPosition = addWrappedText(data.customer.address, yPosition, 8);
    yPosition += 2;
  }

  // Phone
  if (data.customer.phoneNumber) {
    pdf.setFontSize(8);
    pdf.text(`Teléfono: ${data.customer.phoneNumber}`, margin, yPosition);
    yPosition += 4;
  }

  // CID
  if (data.customer.cid) {
    pdf.setFontSize(8);
    pdf.text(`Cédula: ${data.customer.cid}`, margin, yPosition);
    yPosition += 4;
  }

  // Separator before amount
  yPosition += 2;
  pdf.setLineWidth(0.2);
  pdf.line(margin, yPosition, widthInMm - margin, yPosition);
  yPosition += 5;

  // Amount Section
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('CANTIDAD:', margin, yPosition);
  yPosition += 5;

  // Currency symbol mapping
  const currencySymbols: Record<string, string> = {
    'USD': '$',
    'EUR': '€',
    'CUP': '₱',
    'CUC': 'CUC$'
  };

  // Display amount with currency
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  const symbol = currencySymbols[data.currency] || data.currency;
  const amountText = `${symbol}${data.amount.toFixed(2)}`;
  pdf.text(amountText, widthInMm / 2, yPosition, { align: 'center' });
  yPosition += 6;

  // Currency code
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text(data.currency, widthInMm / 2, yPosition, { align: 'center' });
  yPosition += 5;

  // Exchange rate if applicable
  if (data.currency !== 'USD' && data.exchangeRate) {
    pdf.setFontSize(8);
    const usdEquivalent = (data.amount * data.exchangeRate).toFixed(2);
    pdf.text(`(USD $${usdEquivalent})`, widthInMm / 2, yPosition, { align: 'center' });
    yPosition += 5;
  }

  // Reference if provided
  if (data.reference) {
    yPosition += 3;
    pdf.setLineWidth(0.2);
    pdf.line(margin, yPosition, widthInMm - margin, yPosition);
    yPosition += 5;
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    yPosition = addWrappedText(`Referencia: ${data.reference}`, yPosition, 8);
  }

  // Footer
  const remainingSpace = heightInMm - yPosition - margin;
  if (remainingSpace > 10) {
    yPosition = heightInMm - 10;
    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'italic');
    pdf.text('Gracias por su confianza', widthInMm / 2, yPosition, { align: 'center' });
  }

  // Generate filename
  const fileName = `remesa_${data.customer.cid || 'cliente'}_${Date.now()}.pdf`;
  
  // Save the PDF
  pdf.save(fileName);
};










// Function to preview PDF in new window instead of downloading
export const previewRemittancePDF = (data: RemittanceData): void => {
  // Create PDF with same logic as above
  const widthInMm = 2.3 * 25.4;
  const heightInMm = 5 * 25.4;
  
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [widthInMm, heightInMm]
  });

  // ... (same PDF generation code as above) ...
  const margin = 5;
  const lineHeight = 5;
  let yPosition = margin;

  const addWrappedText = (text: string, y: number, fontSize: number = 10): number => {
    pdf.setFontSize(fontSize);
    const lines = pdf.splitTextToSize(text, widthInMm - (2 * margin));
    pdf.text(lines, margin, y);
    return y + (lines.length * lineHeight);
  };

  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('REMESA', widthInMm / 2, yPosition, { align: 'center' });
  yPosition += 8;

  pdf.setLineWidth(0.5);
  pdf.line(margin, yPosition, widthInMm - margin, yPosition);
  yPosition += 5;

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  const currentDate = new Date(data.date);
  pdf.text(`Fecha: ${currentDate.toLocaleDateString('es-ES')}`, margin, yPosition);
  yPosition += 4;
  
  pdf.text(`No.: ${data.remittanceNumber}`, margin, yPosition);
  yPosition += 4;
  
  pdf.setLineWidth(0.2);
  pdf.line(margin, yPosition, widthInMm - margin, yPosition);
  yPosition += 5;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('DESTINATARIO:', margin, yPosition);
  yPosition += 5;

  pdf.setFont('helvetica', 'normal');
  const fullName = data.customer.fullName || 
    `${data.customer.firstName || ''} ${data.customer.lastName || ''}`.trim() || 
    data.customer.name;
  yPosition = addWrappedText(fullName, yPosition, 9);
  yPosition += 2;

  if (data.customer.address) {
    pdf.setFontSize(8);
    yPosition = addWrappedText(data.customer.address, yPosition, 8);
    yPosition += 2;
  }

  if (data.customer.phoneNumber) {
    pdf.setFontSize(8);
    pdf.text(`Teléfono: ${data.customer.phoneNumber}`, margin, yPosition);
    yPosition += 4;
  }

  if (data.customer.cid) {
    pdf.setFontSize(8);
    pdf.text(`Cédula: ${data.customer.cid}`, margin, yPosition);
    yPosition += 4;
  }

  yPosition += 2;
  pdf.setLineWidth(0.2);
  pdf.line(margin, yPosition, widthInMm - margin, yPosition);
  yPosition += 5;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('CANTIDAD:', margin, yPosition);
  yPosition += 9;

  const currencySymbols: Record<string, string> = {
    'USD': '$',
    'EUR': '€',
    'CUP': '$',
    'CUC': 'CUC'
  };

  if (data.currency !== 'USD' && data.exchangeRate) {
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    const symbol = currencySymbols[data.currency] || data.currency;
    const usdEquivalent = (data.amount * data.exchangeRate).toFixed(2);
    const amountText = `${data.currency} ${symbol} ${usdEquivalent}`;
    
    pdf.text(amountText, widthInMm / 2, yPosition, { align: 'center' });
    yPosition += 6;

    
    pdf.setFontSize(8);
    pdf.text(`(USD $${data.amount.toFixed(2)})`, widthInMm / 2, yPosition, { align: 'center' });
    yPosition += 5;
  }

  if (data.reference) {
    yPosition += 3;
    pdf.setLineWidth(0.2);
    pdf.line(margin, yPosition, widthInMm - margin, yPosition);
    yPosition += 5;
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    yPosition = addWrappedText(`Referencia: ${data.reference}`, yPosition, 8);
  }

  const remainingSpace = heightInMm - yPosition - margin;
  if (remainingSpace > 10) {
    yPosition = heightInMm - 10;
    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'italic');
    pdf.text('Gracias por su confianza', widthInMm / 2, yPosition, { align: 'center' });
  }

  // Open in new window
  const pdfDataUrl = pdf.output('dataurlstring');
  const newWindow = window.open();
  if (newWindow) {
    newWindow.document.write(`
      <html>
        <head>
          <title>Recibo de Remesa</title>
          <style>
            body { margin: 0; padding: 20px; background: #f0f0f0; display: flex; justify-content: center; }
            iframe { box-shadow: 0 0 20px rgba(0,0,0,0.2); }
          </style>
        </head>
        <body>
          <iframe src="${pdfDataUrl}" width="600" height="800"></iframe>
        </body>
      </html>
    `);
  }
};