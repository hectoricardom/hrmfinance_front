import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface ReportData {
  dateRange: {
    from: string;
    to: string;
  };
  store: string;
  shippingType: string;
  totalInvoices: number;
  paymentMethods: {
    cash: number;
    zelle: number;
    other: number;
    total: number;
  };
  productsByType: Map<string, { qty: number; total: number }>;
  reservasByTypeAndPrice: Map<string, { 
    qty: number; 
    price: number; 
    total: number; 
    priceGroups: Map<number, number> 
  }>;
  otherServicesByType: Map<string, { 
    qty: number; 
    price: number; 
    arancel: number; 
    total: number 
  }>;
  transportTotal: number;
  arancelesTotal: number;
  taxTotal: number;
  grandTotal: number;
}

export const generateReportPDF = async (reportData: ReportData, filename: string = 'invoice-resume-report.pdf') => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.width;
  const pageHeight = pdf.internal.pageSize.height;
  const margin = 20;
  let yPos = margin;

  // Helper functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const checkPageBreak = (requiredHeight: number) => {
    if (yPos + requiredHeight > pageHeight - margin) {
      pdf.addPage();
      yPos = margin;
    }
  };

  const addText = (text: string, x: number, y: number, options?: any) => {
    pdf.text(text, x, y, options);
  };

  const addLine = (x1: number, y1: number, x2: number, y2: number) => {
    pdf.line(x1, y1, x2, y2);
  };

  // Header
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  addText('Invoice Resume Report', pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Report info
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  addText(`Date Range: ${reportData.dateRange.from || 'All'} to ${reportData.dateRange.to || 'All'}`, margin, yPos);
  yPos += 7;
  addText(`Store: ${reportData.store === 'all' ? 'All Stores' : reportData.store}`, margin, yPos);
  yPos += 7;
  addText(`Shipping Type: ${reportData.shippingType === 'all' ? 'All Types' : 
           reportData.shippingType === 'SEA' ? 'Maritimo' : 
           reportData.shippingType === 'AEREO' ? 'Aereo' : 'Not Set'}`, margin, yPos);
  yPos += 7;
  addText(`Total Invoices: ${reportData.totalInvoices}`, margin, yPos);
  yPos += 10;

  // Line separator
  addLine(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  // Payment Methods Summary
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  addText('Payment Methods', margin, yPos);
  yPos += 10;

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  addText(`Cash: ${formatCurrency(reportData.paymentMethods.cash)}`, margin, yPos);
  yPos += 6;
  addText(`Zelle: ${formatCurrency(reportData.paymentMethods.zelle)}`, margin, yPos);
  yPos += 6;
  addText(`Other: ${formatCurrency(reportData.paymentMethods.other)}`, margin, yPos);
  yPos += 6;
  
  pdf.setFont('helvetica', 'bold');
  addText(`Total: ${formatCurrency(reportData.paymentMethods.total)}`, margin, yPos);
  yPos += 15;

  // Products Summary
  if (reportData.productsByType.size > 0) {
    checkPageBreak(30);
    
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    addText('Products Summary', margin, yPos);
    yPos += 10;

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    
    Array.from(reportData.productsByType.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .forEach(([product, data]) => {
        checkPageBreak(6);
        addText(`${product}: ${data.qty} units - ${formatCurrency(data.total)}`, margin + 5, yPos);
        yPos += 6;
      });
    
    yPos += 10;
  }

  // Reservas Summary
  if (reportData.reservasByTypeAndPrice.size > 0) {
    checkPageBreak(30);
    
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    addText('Reservas Summary (Grouped by Price)', margin, yPos);
    yPos += 10;

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    
    Array.from(reportData.reservasByTypeAndPrice.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .forEach(([type, data]) => {
        checkPageBreak(15);
        
        pdf.setFont('helvetica', 'bold');
        addText(`${type} (${data.qty} lbs total) - ${formatCurrency(data.total)}`, margin + 5, yPos);
        yPos += 6;
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        addText('Price Groups:', margin + 10, yPos);
        yPos += 5;
        
        Array.from(data.priceGroups.entries())
          .sort((a, b) => a[0] - b[0])
          .forEach(([price, qty]) => {
            checkPageBreak(5);
            addText(`  ${formatCurrency(price)} → ${qty} lbs`, margin + 15, yPos);
            yPos += 5;
          });
        
        pdf.setFontSize(11);
        yPos += 3;
      });
    
    yPos += 10;
  }

  // Other Services
  if (reportData.otherServicesByType.size > 0) {
    checkPageBreak(30);
    
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    addText('Other Services & Charges', margin, yPos);
    yPos += 10;

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    
    Array.from(reportData.otherServicesByType.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .forEach(([type, data]) => {
        checkPageBreak(6);
        const icon = type === 'TRANSPORTACION' ? '[TRANSPORT]' : 
                     type === 'CAJAS' ? '[BOXES]' : 
                     type === 'SERVICIO DE RAPEADO' ? '[REPAIR]' : '[SERVICE]';
        addText(`${icon} ${type}: ${formatCurrency(data.total)}`, margin + 5, yPos);
        if (data.arancel > 0) {
          addText(`  (Aranceles: ${formatCurrency(data.arancel)})`, margin + 10, yPos + 5);
          yPos += 5;
        }
        yPos += 6;
      });
    
    yPos += 10;
  }

  // Grand Total
  checkPageBreak(20);
  addLine(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  addText(`GRAND TOTAL: ${formatCurrency(reportData.grandTotal)}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Additional totals breakdown
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  const productsTotal = Array.from(reportData.productsByType.values()).reduce((sum, p) => sum + p.total, 0);
  const reservasTotal = Array.from(reportData.reservasByTypeAndPrice.values()).reduce((sum, r) => sum + r.total, 0);
  
  addText(`Products Total: ${formatCurrency(productsTotal)}`, margin, yPos);
  yPos += 6;
  addText(`Reservas Total: ${formatCurrency(reservasTotal)}`, margin, yPos);
  yPos += 6;
  addText(`Transport & Services: ${formatCurrency(reportData.transportTotal)}`, margin, yPos);
  yPos += 6;
  addText(`Tax: ${formatCurrency(reportData.taxTotal)}`, margin, yPos);

  // Footer
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  const footerY = pageHeight - 15;
  addText(`Generated on: ${new Date().toLocaleDateString()}`, margin, footerY);
  addText(`Page 1 of ${pdf.getNumberOfPages()}`, pageWidth - margin, footerY, { align: 'right' });

  // Save the PDF
  pdf.save(filename);
  return filename;
};