import jsPDF from 'jspdf';

interface AccountData {
  accountNumber?: string;
  code?: string;
  name: string;
  balance: number;
  level?: number;
  subAccounts?: AccountData[];
}

interface AccountGroup {
  category: string;
  accounts: AccountData[];
  total: number;
}

interface BalanceSheetData {
  companyName?: string;
  reportDate: string;
  assetGroups: AccountGroup[];
  liabilityGroups: AccountGroup[];
  equityGroups: AccountGroup[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  isBalanced: boolean;
}

interface TranslationFunction {
  (key: string, fallback?: string): string;
}

/**
 * Generate a professional Balance Sheet PDF document
 * Fixed page break handling for proper multi-page support
 */
export const generateBalanceSheetPDF = (
  data: BalanceSheetData,
  t: TranslationFunction
): void => {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const bottomMargin = 25; // Space for footer
  const safeZone = pageHeight - bottomMargin;
  const contentWidth = pageWidth - (margin * 2);
  const columnWidth = (contentWidth - 10) / 2; // Two columns with 10mm gap

  // Colors
  const primaryColor = [25, 118, 210] as [number, number, number]; // Blue
  const headerBg = [245, 245, 245] as [number, number, number]; // Light gray
  const assetColor = [25, 118, 210] as [number, number, number]; // Blue
  const liabilityColor = [244, 67, 54] as [number, number, number]; // Red
  const equityColor = [76, 175, 80] as [number, number, number]; // Green
  const textColor = [33, 33, 33] as [number, number, number]; // Dark gray
  const mutedColor = [117, 117, 117] as [number, number, number]; // Medium gray

  // Helper function to format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  // Helper function to add page header on new pages
  const addPageHeader = (currentY: number): number => {
    pdf.setFontSize(8);
    pdf.setTextColor(...mutedColor);
    pdf.text(`${t('balanceSheet.title', 'Balance General')} - ${data.reportDate}`, margin, currentY);
    return currentY + 8;
  };

  // Helper function to check page break - returns new Y position
  // This is the key fix: returns the updated Y position instead of modifying global state
  const checkPageBreak = (currentY: number, requiredSpace: number): number => {
    if (currentY + requiredSpace > safeZone) {
      pdf.addPage();
      return addPageHeader(margin);
    }
    return currentY;
  };

  // ============================================================================
  // HEADER SECTION
  // ============================================================================

  let yPos = margin;

  // Company name / Title
  pdf.setFontSize(20);
  pdf.setTextColor(...primaryColor);
  pdf.setFont('helvetica', 'bold');
  pdf.text(data.companyName || 'BALANCE GENERAL', pageWidth / 2, yPos, { align: 'center' });
  yPos += 8;

  // Report title
  pdf.setFontSize(14);
  pdf.setTextColor(...textColor);
  pdf.text(t('balanceSheet.title', 'Balance General'), pageWidth / 2, yPos, { align: 'center' });
  yPos += 6;

  // Date
  pdf.setFontSize(10);
  pdf.setTextColor(...mutedColor);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`${t('balanceSheet.asOf', 'Al')} ${data.reportDate}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 4;

  // Header line
  pdf.setDrawColor(...primaryColor);
  pdf.setLineWidth(0.5);
  pdf.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  const headerEndY = yPos; // Save header end position for both columns

  // ============================================================================
  // HELPER FUNCTION TO DRAW ACCOUNT SECTION
  // ============================================================================

  const drawAccountSection = (
    groups: AccountGroup[],
    title: string,
    totalLabel: string,
    total: number,
    color: [number, number, number],
    xStart: number,
    colWidth: number,
    startY: number
  ): number => {
    let localY = startY;

    // Section title with background - check for space (header + at least one item)
    localY = checkPageBreak(localY, 30);
    pdf.setFillColor(...color);
    pdf.rect(xStart, localY, colWidth, 8, 'F');
    pdf.setFontSize(11);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, xStart + 3, localY + 5.5);
    localY += 12;

    // Draw each group
    groups.forEach(group => {
      // Check for space: group header + at least first account (25mm)
      localY = checkPageBreak(localY, 25);

      // Category header
      pdf.setFillColor(...headerBg);
      pdf.rect(xStart, localY, colWidth, 6, 'F');
      pdf.setFontSize(9);
      pdf.setTextColor(...textColor);
      pdf.setFont('helvetica', 'bold');
      pdf.text(group.category, xStart + 2, localY + 4);
      pdf.text(formatCurrency(group.total), xStart + colWidth - 2, localY + 4, { align: 'right' });
      localY += 8;

      // Accounts in group (with hierarchy support)
      group.accounts.forEach(account => {
        // Check for space: account row (8mm to be safe)
        localY = checkPageBreak(localY, 8);

        const level = account.level || 0;
        const hasSubAccounts = account.subAccounts && account.subAccounts.length > 0;
        const indent = level * 4; // 4mm indent per level

        // Different styling based on level
        if (level === 0 && hasSubAccounts) {
          // Parent account with children - bold style
          pdf.setFontSize(8.5);
          pdf.setFont('helvetica', 'bold');
        } else if (level > 0) {
          // Child account - smaller, lighter
          pdf.setFontSize(6.5);
          pdf.setFont('helvetica', 'normal');
        } else {
          // Regular account without children
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'normal');
        }

        // Hierarchy indicator for sub-accounts
        if (level > 0) {
          pdf.setTextColor(180, 180, 180);
          pdf.text('•', xStart + 2 + indent - 3.5, localY + 3);
        }

        // Account number
        pdf.setTextColor(...(level > 0 ? [150, 150, 150] as [number, number, number] : mutedColor));
        const accNum = account.accountNumber || account.code || '';
        pdf.text(accNum, xStart + 2 + indent, localY + 3);

        // Account name (truncate if too long)
        pdf.setTextColor(...(level > 0 ? [100, 100, 100] as [number, number, number] : textColor));
        let accName = account.name;
        const maxNameWidth = colWidth - 50 - indent;
        while (pdf.getTextWidth(accName) > maxNameWidth && accName.length > 3) {
          accName = accName.slice(0, -4) + '...';
        }
        pdf.text(accName, xStart + 18 + indent, localY + 3);

        // Balance - different weight based on level
        pdf.setFont('helvetica', level === 0 && hasSubAccounts ? 'bold' : 'normal');
        pdf.setTextColor(...(level > 0 ? [100, 100, 100] as [number, number, number] : textColor));
        pdf.text(formatCurrency(account.balance || 0), xStart + colWidth - 2, localY + 3, { align: 'right' });

        // Light separator line (lighter for sub-accounts)
        pdf.setDrawColor(...(level > 0 ? [240, 240, 240] : [230, 230, 230]) as [number, number, number]);
        pdf.setLineWidth(0.1);
        pdf.line(xStart + indent, localY + 5, xStart + colWidth, localY + 5);

        localY += 6;
      });

      localY += 2;
    });

    // Section total - check for space (15mm)
    localY = checkPageBreak(localY, 15);
    pdf.setDrawColor(...color);
    pdf.setLineWidth(0.5);
    pdf.line(xStart, localY, xStart + colWidth, localY);
    localY += 1;
    pdf.line(xStart, localY, xStart + colWidth, localY);
    localY += 5;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...color);
    pdf.text(totalLabel, xStart + 2, localY);
    pdf.text(formatCurrency(total), xStart + colWidth - 2, localY, { align: 'right' });
    localY += 8;

    return localY;
  };

  // ============================================================================
  // TWO-COLUMN LAYOUT - Draw sections independently
  // ============================================================================

  const leftColumnX = margin;
  const rightColumnX = margin + columnWidth + 10;

  // Left column: Assets - starts from header end
  const assetsEndY = drawAccountSection(
    data.assetGroups,
    t('balanceSheet.assets', 'ACTIVOS'),
    t('balanceSheet.totalAssets', 'Total Activos'),
    data.totalAssets,
    assetColor,
    leftColumnX,
    columnWidth,
    headerEndY
  );

  // Right column: Liabilities - starts from header end (same as assets)
  const liabilitiesEndY = drawAccountSection(
    data.liabilityGroups,
    t('balanceSheet.liabilities', 'PASIVOS'),
    t('balanceSheet.totalLiabilities', 'Total Pasivos'),
    data.totalLiabilities,
    liabilityColor,
    rightColumnX,
    columnWidth,
    headerEndY
  );

  // Equity section starts after liabilities (in right column)
  const equityEndY = drawAccountSection(
    data.equityGroups,
    t('balanceSheet.equity', 'PATRIMONIO'),
    t('balanceSheet.totalEquity', 'Total Patrimonio'),
    data.totalEquity,
    equityColor,
    rightColumnX,
    columnWidth,
    liabilitiesEndY + 5
  );

  // Get the maximum Y position from both columns
  yPos = Math.max(assetsEndY, equityEndY) + 10;

  // ============================================================================
  // SUMMARY SECTION
  // ============================================================================

  // Check for space for summary box (60mm to be safe)
  yPos = checkPageBreak(yPos, 60);

  // Summary box
  pdf.setFillColor(250, 250, 250);
  pdf.setDrawColor(200, 200, 200);
  pdf.roundedRect(margin, yPos, contentWidth, 40, 3, 3, 'FD');

  // Summary title
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...textColor);
  pdf.text(t('balanceSheet.summary', 'RESUMEN'), margin + 5, yPos + 7);

  const summaryY = yPos + 14;
  const col1X = margin + 5;
  const col2X = margin + contentWidth / 4;
  const col3X = margin + contentWidth / 2;
  const col4X = margin + (contentWidth * 3) / 4;

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...mutedColor);

  // Row 1: Labels
  pdf.text(t('balanceSheet.totalAssets', 'Total Activos'), col1X, summaryY);
  pdf.text(t('balanceSheet.totalLiabilities', 'Total Pasivos'), col2X, summaryY);
  pdf.text(t('balanceSheet.totalEquity', 'Total Patrimonio'), col3X, summaryY);
  pdf.text(t('balanceSheet.liabilitiesPlusEquity', 'Pasivo + Patrimonio'), col4X, summaryY);

  // Row 2: Values
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');

  pdf.setTextColor(...assetColor);
  pdf.text(formatCurrency(data.totalAssets), col1X, summaryY + 7);

  pdf.setTextColor(...liabilityColor);
  pdf.text(formatCurrency(data.totalLiabilities), col2X, summaryY + 7);

  pdf.setTextColor(...equityColor);
  pdf.text(formatCurrency(data.totalEquity), col3X, summaryY + 7);

  pdf.setTextColor(...(data.isBalanced ? equityColor : liabilityColor));
  pdf.text(formatCurrency(data.totalLiabilities + data.totalEquity), col4X, summaryY + 7);

  // Balance equation validation
  const equationY = summaryY + 18;
  const isBalanced = data.isBalanced;
  const difference = data.totalAssets - (data.totalLiabilities + data.totalEquity);

  //pdf.setFillColor(...(isBalanced ? [232, 245, 233] : [255, 235, 238]));
  //pdf.roundedRect(margin + 10, equationY - 3, contentWidth - 20, 12, 2, 2, 'F');

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  //pdf.setTextColor(...(isBalanced ? [56, 142, 60] : [211, 47, 47]));

  const equationText = `${t('balanceSheet.assets', 'Activos')} = ${t('balanceSheet.liabilities', 'Pasivos')} + ${t('balanceSheet.equity', 'Patrimonio')}`;
  const equationValues = `${formatCurrency(data.totalAssets)} = ${formatCurrency(data.totalLiabilities + data.totalEquity)}`;
  const statusText = isBalanced ? ' ✓' : ` (${t('balanceSheet.difference', 'Diferencia')}: ${formatCurrency(difference)})`;

  //pdf.text(equationText + '  →  ' + equationValues + statusText, pageWidth / 2, equationY + 4, { align: 'center' });

  // ============================================================================
  // FOOTER - Add to all pages
  // ============================================================================

  const footerY = pageHeight - 15;

  const generatedDate = new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Add footer to all pages
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);

    // Footer line
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.3);
    pdf.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

    // Footer text
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...mutedColor);

    pdf.text(`${t('common.generatedOn', 'Generado el')}: ${generatedDate}`, margin, footerY);
    pdf.text('HRM Finance', pageWidth - margin, footerY, { align: 'right' });
    pdf.text(`${t('common.page', 'Página')} ${i} ${t('common.of', 'de')} ${pageCount}`, pageWidth / 2, footerY, { align: 'center' });
  }

  // Save the PDF
  const fileName = `balance_general_${data.reportDate.replace(/[^0-9-]/g, '')}.pdf`;
  pdf.save(fileName);
};

export default generateBalanceSheetPDF;
