import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { inventoryStore } from '../modules';

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
  reservasByShippingAndType: Map<string, Map<string, {
    qty: number;
    price: number;
    total: number;
    priceGroups: Map<number, { qty: number; invoices: string[] }>
  }>>;
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

declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: {
      finalY: number;
    };
  }
}

interface TranslationFunction {
  (key: string): string;
}

export const generateInvoiceResumePDF = async (
  reportData: ReportData,
  t: TranslationFunction,
  filename: string = 'invoice-resume-report.pdf'
) => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.width;
  const pageHeight = pdf.internal.pageSize.height;
  const margin = 15;
  let yPos = margin;

  // Helper function to check if a type should be classified as miscellaneous
  const isMiscellaneous = (type: string): boolean => {
    // Empty or whitespace-only types are considered miscellaneous
    if (!type || type.trim() === '') {
      return true;
    }

    const miscKeywords = [
      // Food & Consumables
      'comida', 'alimento', 'food',
      // Clothing & Footwear
      'sapatos', 'zapato', 'ropa', 'clothes', 'shoe',
      // Hygiene & Personal Care
      'aseo', 'higiene', 'hygiene',
      // Medicine & Health
      'medicina', 'medicamento', 'medicamentos', 'medicine', 'medication',
      // General Miscellaneous
      'miscelanea', 'misceláneo', 'miscellaneous', 'varios', 'other'
    ];
    const typeLower = type.toLowerCase();
    return miscKeywords.some(keyword => typeLower.includes(keyword));
  };

  // Colors
  const primaryColor = '#2c3e50';
  const secondaryColor = '#3498db';
  const accentColor = '#e74c3c';
  const lightGray = '#ecf0f1';
  const darkGray = '#7f8c8d';

  // Helper functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (date: string) => {
    if (!date) return t('invoiceReport.pdf.all');
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const addHeader = () => {
    // Company header background
    pdf.setFillColor(44, 62, 80); // primaryColor
    pdf.rect(0, 0, pageWidth, 40, 'F');

    // Company name and title
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text(t('invoiceReport.pdf.title'), pageWidth / 2, 20, { align: 'center' });
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(t('invoiceReport.pdf.subtitle'), pageWidth / 2, 30, { align: 'center' });

    // Report info box
    yPos = 50;
    pdf.setFillColor(236, 240, 241); // lightGray
    pdf.rect(margin, yPos - 5, pageWidth - 2 * margin, 30, 'F');
    
    pdf.setTextColor(44, 62, 80);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    
    // Left column
    pdf.text(`${t('invoiceReport.pdf.reportDate')} ${new Date().toLocaleDateString()}`, margin + 5, yPos + 5);
    pdf.text(`${t('invoiceReport.pdf.dateRange')} ${formatDate(reportData.dateRange.from)} - ${formatDate(reportData.dateRange.to)}`, margin + 5, yPos + 12);
    pdf.text(`${t('invoiceReport.pdf.totalInvoices')} ${reportData.totalInvoices}`, margin + 5, yPos + 19);
    
    let locatStr = inventoryStore.getLocationById(reportData.store);
    // Right column
    const rightX = pageWidth / 2 + 10;
    pdf.text(`${t('invoiceReport.store')}: ${reportData.store === 'all' ? t('invoiceReport.allStores') : locatStr?.name}`, rightX, yPos + 5);
    const shippingTypeText = reportData.shippingType === 'all' ? t('invoiceReport.pdf.allTypes') : 
                            reportData.shippingType === 'SEA' ? t('invoiceReport.maritime') : 
                            reportData.shippingType === 'AEREO' ? t('invoiceReport.air') : t('invoiceReport.notSet');
    pdf.text(`${t('invoiceReport.shippingTypeLabel')}: ${shippingTypeText}`, rightX, yPos + 12);
    
    yPos += 35;
  };

  const addSectionTitle = (title: string) => {
    pdf.setFillColor(52, 152, 219); // secondaryColor
    pdf.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, margin + 3, yPos + 5.5);
    
    yPos += 12;
  };

  const checkPageBreak = (requiredHeight: number) => {
    if (yPos + requiredHeight > pageHeight - margin) {
      pdf.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };

  // Start generating PDF
  addHeader();

  // Add info note about miscellaneous grouping (only if there's Misceláneo data)
  let hasMiscelaneo = false;
  if (reportData.reservasByShippingAndType.size > 0) {
    Array.from(reportData.reservasByShippingAndType.values()).forEach(reservasByType => {
      if (reservasByType.has('Misceláneo')) {
        hasMiscelaneo = true;
      }
    });
  }

  if (hasMiscelaneo) {
    checkPageBreak(20);
    pdf.setFillColor(255, 248, 220); // Light yellow
    pdf.rect(margin, yPos, pageWidth - 2 * margin, 15, 'F');

    pdf.setTextColor(120, 80, 0); // Dark yellow/brown
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text(' Nota:', margin + 3, yPos + 5);

    pdf.setFont('helvetica', 'normal');
    pdf.text('Los items de comida, sapatos, aseo, medicina, medicamentos y similares', margin + 3, yPos + 10);
    pdf.text('son agrupados automaticamente como "Miscelaneo" para mejor organizacion.', margin + 3, yPos + 14);

    yPos += 20;
  }

  // Payment Methods Summary
  addSectionTitle(t('invoiceReport.pdf.paymentMethodsSummary'));
  
  const paymentData = [
    [t('invoiceReport.cash'), formatCurrency(reportData.paymentMethods.cash)],
    [t('invoiceReport.zelle'), formatCurrency(reportData.paymentMethods.zelle)],
    [t('invoiceReport.other'), formatCurrency(reportData.paymentMethods.other)],
    [t('invoiceReport.pdf.total').toUpperCase(), formatCurrency(reportData.paymentMethods.total)]
  ];

  autoTable(pdf, {
    startY: yPos,
    head: [[t('invoiceReport.pdf.paymentMethod'), t('invoiceReport.pdf.amount')]],
    body: paymentData,
    theme: 'grid',
    headStyles: {
      fillColor: [44, 62, 80],
      fontSize: 10,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 10
    },
    footStyles: {
      fillColor: [236, 240, 241],
      textColor: [44, 62, 80],
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { halign: 'right' }
    },
    didParseCell: function(data) {
      if (data.row.index === paymentData.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [236, 240, 241];
      }
    }
  });

  yPos = pdf.lastAutoTable.finalY + 10;

  // Products Summary
  if (reportData.productsByType.size > 0) {
    checkPageBreak(50);
    addSectionTitle(t('invoiceReport.pdf.productsSummary'));
    
    const productData = Array.from(reportData.productsByType.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .map(([product, data]) => [
        product,
        data.qty.toString(),
        formatCurrency(data.total)
      ]);

    const productsTotal = Array.from(reportData.productsByType.values())
      .reduce((sum, p) => sum + p.total, 0);

    autoTable(pdf, {
      startY: yPos,
      head: [[t('invoiceReport.pdf.product'), t('invoiceReport.pdf.quantity'), t('invoiceReport.pdf.total')]],
      body: productData,
      foot: [[t('invoiceReport.pdf.total').toUpperCase(), '', formatCurrency(productsTotal)]],
      theme: 'striped',
      headStyles: {
        fillColor: [44, 62, 80],
        fontSize: 10
      },
      bodyStyles: {
        fontSize: 9
      },
      footStyles: {
        fillColor: [236, 240, 241],
        textColor: [44, 62, 80],
        fontStyle: 'bold',
        fontSize: 10
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { halign: 'center', cellWidth: 30 },
        2: { halign: 'right', cellWidth: 40 }
      }
    });

    yPos = pdf.lastAutoTable.finalY + 10;
  }

  // Reservas Summary - Split by Shipping Method
  // Data is already processed in the component:
  // - Grouped by shipping method (SEA/AEREO)
  // - Items with keywords (comida, sapatos, aseo, medicina, etc.) are grouped as "Misceláneo"
  // - Empty/blank types are also classified as "Misceláneo"
  if (reportData.reservasByShippingAndType.size > 0) {
    // Sort shipping methods: SEA first, then AEREO
    const sortedShippingMethods = Array.from(reportData.reservasByShippingAndType.entries()).sort((a, b) => {
      if (a[0] === 'SEA') return -1;
      if (b[0] === 'SEA') return 1;
      return 0;
    });

    sortedShippingMethods.forEach(([shippingMethod, reservasByType]) => {
      checkPageBreak(50);

      const shippingIcon = shippingMethod === 'AEREO' ? '✈' : '⛴';
      const shippingLabel = shippingMethod === 'AEREO' ? 'Aereo' : 'Maritimo';

      addSectionTitle(` ${t('invoiceReport.pdf.reservasSummary')} - ${shippingLabel}`);

      const reservasData: any[] = [];

      Array.from(reservasByType.entries())
        .sort((a, b) => b[1].total - a[1].total)
        .forEach(([type, data]) => {
          // Check if this is the Misceláneo category
          const isMisc = type === 'Misceláneo' || type === 'Miscelaneo';
          const displayType =  type;

          // Subtle yellow background for Misceláneo items
          const miscBgColor = [255, 248, 220]; // Light yellow
          const normalBgColor = [255, 255, 255]; // White

          // Main row for the type
          reservasData.push([
            { content: displayType, styles: { fontStyle: 'bold', fillColor: isMisc ? miscBgColor : normalBgColor } },
            { content: `${data.qty.toFixed(2)} ${t('invoiceReport.pdf.lbs')}`, styles: { halign: 'center', fontStyle: 'bold', fillColor: isMisc ? miscBgColor : normalBgColor } },
            { content: '', styles: { fillColor: [236, 240, 241] } },
            { content: formatCurrency(data.total), styles: { halign: 'right', fontStyle: 'bold', fillColor: isMisc ? miscBgColor : normalBgColor } }
          ]);

          // Price breakdown rows
          Array.from(data.priceGroups.entries())
            .sort((a, b) => a[0] - b[0])
            .forEach(([price, priceData]) => {
              reservasData.push([
                { content: '', styles: { fillColor: [255, 255, 255] } },
                { content: '', styles: { fillColor: [255, 255, 255] } },
                { content: `${formatCurrency(price)} X ${priceData.qty.toFixed(2)} ${t('invoiceReport.pdf.lbs')}`, styles: { fontSize: 8, textColor: [127, 140, 141] } },
                { content: '', styles: { fillColor: [255, 255, 255] } }
              ]);
            });
        });

      // Calculate subtotal for this shipping method
      const shippingSubtotal = Array.from(reservasByType.values())
        .reduce((sum, r) => sum + r.total, 0);

      const shippingTotalQty = Array.from(reservasByType.values())
        .reduce((sum, r) => sum + r.qty, 0);

      autoTable(pdf, {
        startY: yPos,
        head: [[t('invoiceReport.pdf.type'), t('invoiceReport.pdf.totalQty'), t('invoiceReport.pdf.priceGroups'), t('invoiceReport.pdf.total')]],
        body: reservasData,
        foot: [[
          { content: ` ${t('invoiceReport.pdf.total')} ${shippingLabel}`.toUpperCase(), styles: { fontStyle: 'bold' } },
          { content: `${shippingTotalQty.toFixed(2)} ${t('invoiceReport.pdf.lbs')}`, styles: { halign: 'center', fontStyle: 'bold' } },
          '',
          formatCurrency(shippingSubtotal)
        ]],
        theme: 'grid',
        headStyles: {
          fillColor: [44, 62, 80],
          fontSize: 10
        },
        bodyStyles: {
          fontSize: 9
        },
        footStyles: {
          fillColor: shippingMethod === 'AEREO' ? [108, 92, 231] : [52, 152, 219],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 10
        },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { halign: 'center', cellWidth: 30 },
          2: { cellWidth: 'auto' },
          3: { halign: 'right', cellWidth: 40 }
        }
      });

      yPos = pdf.lastAutoTable.finalY + 10;
    });
  }

  // Other Services & Charges
  if (reportData.otherServicesByType.size > 0) {
    checkPageBreak(50);
    addSectionTitle(t('invoiceReport.pdf.otherServicesTitle'));
    
    const servicesData = Array.from(reportData.otherServicesByType.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .map(([type, data]) => {
        
        return [
          `${type}`,
          formatCurrency(data.total)
        ];
      });

    autoTable(pdf, {
      startY: yPos,
      head: [[t('invoiceReport.pdf.serviceType'), t('invoiceReport.pdf.total')]],
      body: servicesData,
      foot: [[t('invoiceReport.totalOtherServices').toUpperCase(), formatCurrency(reportData.transportTotal)]],
      theme: 'striped',
      headStyles: {
        fillColor: [44, 62, 80],
        fontSize: 10
      },
      bodyStyles: {
        fontSize: 10
      },
      footStyles: {
        fillColor: [236, 240, 241],
        textColor: [44, 62, 80],
        fontStyle: 'bold',
        fontSize: 10
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { halign: 'right', cellWidth: 50 }
      }
    });

    yPos = pdf.lastAutoTable.finalY + 10;
  }

  // Grand Total Summary
  checkPageBreak(60);
  addSectionTitle(t('invoiceReport.pdf.totalSummary'));

  const productsTotal = Array.from(reportData.productsByType.values())
    .reduce((sum, p) => sum + p.total, 0);
  const reservasTotal = Array.from(reportData.reservasByShippingAndType.values())
    .reduce((sum, reservasByType) => {
      return sum + Array.from(reservasByType.values()).reduce((innerSum, r) => innerSum + r.total, 0);
    }, 0);

  const summaryData = [
    [t('invoiceReport.pdf.productsTotal'), formatCurrency(productsTotal)],
    [t('invoiceReport.pdf.reservasTotal'), formatCurrency(reservasTotal)],
    [t('invoiceReport.pdf.transportServices'), formatCurrency(reportData.transportTotal)],
    [t('invoiceReport.aranceles'), formatCurrency(reportData.arancelesTotal)],
    [t('invoiceReport.tax'), formatCurrency(reportData.taxTotal)],
    [t('invoiceReport.pdf.grandTotal'), formatCurrency(reportData.paymentMethods.total)]
  ];

  autoTable(pdf, {
    startY: yPos,
    body: summaryData,
    theme: 'plain',
    bodyStyles: {
      fontSize: 11
    },
    columnStyles: {
      0: { cellWidth: 120, fontStyle: 'normal' },
      1: { halign: 'right', cellWidth: 60, fontStyle: 'normal' }
    },
    didParseCell: function(data) {
      if (data.row.index === summaryData.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fontSize = 14;
        data.cell.styles.fillColor = [231, 76, 60]; // accentColor
        data.cell.styles.textColor = [255, 255, 255];
      }
    }
  });

  // Footer
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    
    // Footer line
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    
    // Footer text
    pdf.setFontSize(8);
    pdf.setTextColor(127, 140, 141);
    pdf.setFont('helvetica', 'normal');
    
    pdf.text(`${t('invoiceReport.pdf.generatedOn')} ${new Date().toLocaleString()}`, margin, pageHeight - 10);
    pdf.text(`${t('invoiceReport.pdf.page')} ${i} ${t('invoiceReport.pdf.of')} ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
    
    /*/ Add watermark
    pdf.setTextColor(200, 200, 200);
    pdf.setFontSize(60);
    pdf.setFont('helvetica', 'bold');
    
    pdf.text('CONFIDENTIAL', pageWidth / 2, pageHeight / 2, {
      align: 'center',
      angle: -45
    });
    */
  }

  // Save the PDF
  pdf.save(filename);
  return filename;
};