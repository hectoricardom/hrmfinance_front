/**
 * IRS Form 1099-NEC PDF Generator (Rev. April 2025)
 * Generates a PDF of the 1099-NEC (Nonemployee Compensation) matching the official IRS form layout
 * Reference: https://www.irs.gov/pub/irs-pdf/f1099nec.pdf
 *
 * This generates Copy B (For Recipient) and Copy 2 (For state filing)
 * Note: Copy A (red, for IRS) must be ordered from IRS or e-filed - printed versions are not scannable
 */

import jsPDF from 'jspdf';
import type { PayerInfo } from '../types/drakeTypes';

/** Safely get payer address as a string (handles object or string) */
function getPayerAddress(addr: any): string {
  if (!addr) return '';
  if (typeof addr === 'string') return addr;
  if (typeof addr === 'object') return addr.street || addr.address || '';
  return String(addr);
}

export interface Form1099NecEntry {
  payerInfo: PayerInfo;
  recipientName: string;
  recipientSSN: string;
  recipientAddress: string;
  recipientCity?: string;
  recipientState?: string;
  recipientZip?: string;
  nonEmployeeCompensation: number;  // Box 1
  directSales5000OrMore?: boolean;  // Box 2 - Payer made direct sales totaling $5,000 or more
  excessGoldenParachute?: number;   // Box 3 - Excess golden parachute payments
  federalTaxWithheld?: number;      // Box 4
  stateTaxWithheld?: number;        // Box 5 (line 1)
  stateTaxWithheld2?: number;       // Box 5 (line 2)
  statePayerNo?: string;            // Box 6 (line 1)
  statePayerNo2?: string;           // Box 6 (line 2)
  stateIncome?: number;             // Box 7 (line 1)
  stateIncome2?: number;            // Box 7 (line 2)
  taxYear: number;
  accountNumber?: string;
  secondTinNotice?: boolean;        // 2nd TIN not. checkbox
  isCorrected?: boolean;            // CORRECTED checkbox
  isVoid?: boolean;                 // VOID checkbox
}

// Copy types for the form
type CopyType = 'B' | '1' | '2';

interface CopyInfo {
  label: string;
  description: string;
  showVoidCheckbox: boolean;
}

const COPY_INFO: Record<CopyType, CopyInfo> = {
  'B': {
    label: 'Copy B',
    description: 'For Recipient',
    showVoidCheckbox: false
  },
  '1': {
    label: 'Copy 1',
    description: 'For State Tax Department',
    showVoidCheckbox: true
  },
  '2': {
    label: 'Copy 2',
    description: 'To be filed with recipient\'s state income tax return, when required.',
    showVoidCheckbox: true
  }
};

/**
 * Generate a PDF of the IRS Form 1099-NEC (Rev. April 2025) for one or more entries
 * Generates Copy B (For Recipient) and Copy 2 (For state filing) for each entry
 */
export const generateForm1099NecPDF = async (
  entries: Form1099NecEntry[],
  copies: CopyType[] = ['B', '2']
): Promise<void> => {
  if (!entries.length) {
    throw new Error('No 1099-NEC entries provided');
  }

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - (2 * margin);

  // Layout dimensions (matching IRS form)
  const leftColWidth = contentWidth * 0.45;  // Payer/recipient info
  const middleColWidth = contentWidth * 0.32; // Boxes 1-7
  const rightColWidth = contentWidth * 0.23;  // Copy designation

  // Helper functions
  const drawLine = (y1: number, x1: number = margin, x2: number = pageWidth - margin, width: number = 0.2) => {
    pdf.setDrawColor(0);
    pdf.setLineWidth(width);
    pdf.line(x1, y1, x2, y1);
  };

  const drawVerticalLine = (x: number, y1: number, y2: number, width: number = 0.2) => {
    pdf.setDrawColor(0);
    pdf.setLineWidth(width);
    pdf.line(x, y1, x, y2);
  };

  const drawBox = (x: number, y: number, w: number, h: number) => {
    pdf.setDrawColor(0);
    pdf.setLineWidth(0.2);
    pdf.rect(x, y, w, h);
  };

  const drawCheckbox = (x: number, y: number, checked: boolean = false, size: number = 3) => {
    pdf.setDrawColor(0);
    pdf.setLineWidth(0.2);
    pdf.rect(x, y, size, size);
    if (checked) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.text('X', x + 0.5, y + 2.5);
    }
  };

  const formatCurrency = (amount?: number): string => {
    if (amount === undefined || amount === null || amount === 0) return '';
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatSSN = (ssn?: string): string => {
    if (!ssn) return '';
    const digits = ssn.replace(/\D/g, '');
    if (digits.length === 9) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
    }
    return ssn;
  };

  const formatEIN = (ein?: string): string => {
    if (!ein) return '';
    const digits = ein.replace(/\D/g, '');
    if (digits.length === 9) {
      return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    }
    return ein;
  };

  // Render a single 1099-NEC form
  const renderForm = (entry: Form1099NecEntry, copyType: CopyType, startY: number = margin) => {
    const copyInfo = COPY_INFO[copyType];
    let y = startY;
    const formTop = y;

    // Column X positions
    const leftColX = margin;
    const middleColX = margin + leftColWidth;
    const rightColX = middleColX + middleColWidth;

    // ==================== TOP ROW: VOID/CORRECTED + HEADER ====================
    const headerHeight = 28;

    // Draw outer border for header row
    drawBox(margin, y, contentWidth, headerHeight);
    drawVerticalLine(middleColX, y, y + headerHeight);
    drawVerticalLine(rightColX, y, y + headerHeight);

    // VOID / CORRECTED checkboxes (only on Copy 1 and Copy 2)
    if (copyInfo.showVoidCheckbox) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(0, 0, 0);

      const checkboxY = y + 3;
      drawCheckbox(leftColX + 2, checkboxY, entry.isVoid);
      pdf.text('VOID', leftColX + 7, checkboxY + 2.5);

      drawCheckbox(leftColX + 22, checkboxY, entry.isCorrected);
      pdf.text('CORRECTED', leftColX + 27, checkboxY + 2.5);
    } else {
      // Copy B only shows CORRECTED (if checked)
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(0, 0, 0);

      const checkboxY = y + 3;
      drawCheckbox(leftColX + 2, checkboxY, entry.isCorrected);
      pdf.text('CORRECTED (if checked)', leftColX + 7, checkboxY + 2.5);
    }

    // Payer name/address label
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(5.5);
    pdf.setTextColor(0, 0, 0);
    pdf.text("PAYER'S name, street address, city or town, state or province, country, ZIP", leftColX + 2, y + 11);
    pdf.text("or foreign postal code, and telephone no.", leftColX + 2, y + 14);

    // Payer info values
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    let payerY = y + 18;
    if (entry.payerInfo.name) {
      pdf.text(entry.payerInfo.name, leftColX + 2, payerY);
      payerY += 3;
    }
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    if (entry.payerInfo.address) {
      pdf.text(getPayerAddress(entry.payerInfo.address), leftColX + 2, payerY);
      payerY += 2.5;
    }
    const cityStateZip = [entry.payerInfo.city, entry.payerInfo.state, entry.payerInfo.zip].filter(Boolean).join(', ');
    if (cityStateZip) {
      pdf.text(cityStateZip, leftColX + 2, payerY);
      payerY += 2.5;
    }
    if (entry.payerInfo.phone) {
      pdf.text(entry.payerInfo.phone, leftColX + 2, payerY);
    }

    // Middle column header: OMB No. and Form info
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6);
    pdf.setTextColor(0, 0, 0);
    pdf.text('OMB No. 1545-0116', middleColX + 2, y + 5);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text('Form 1099-NEC', middleColX + 2, y + 12);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6);
    pdf.text('(Rev. April 2025)', middleColX + 2, y + 16);

    pdf.text('For calendar year', middleColX + 2, y + 21);

    // Tax year in underlined box
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text(String(entry.taxYear), middleColX + 27, y + 21);
    drawLine(y + 22, middleColX + 25, middleColX + 38, 0.3);

    // Right column: Title and Copy designation
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text('Nonemployee', rightColX + 2, y + 8);
    pdf.text('Compensation', rightColX + 2, y + 13);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.text(copyInfo.label, rightColX + 2, y + 20);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6);
    const descLines = pdf.splitTextToSize(copyInfo.description, rightColWidth - 4);
    pdf.text(descLines, rightColX + 2, y + 24);

    y += headerHeight;

    // ==================== TIN ROW ====================
    const tinRowHeight = 9;
    drawBox(margin, y, leftColWidth, tinRowHeight);

    // Split TIN row into two halves
    const tinHalfWidth = leftColWidth / 2;
    drawVerticalLine(leftColX + tinHalfWidth, y, y + tinRowHeight);

    // PAYER'S TIN
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(5.5);
    pdf.text("PAYER'S TIN", leftColX + 2, y + 3);
    pdf.setFontSize(8);
    pdf.text(formatEIN(entry.payerInfo.ein), leftColX + 2, y + 7);

    // RECIPIENT'S TIN
    pdf.setFontSize(5.5);
    pdf.text("RECIPIENT'S TIN", leftColX + tinHalfWidth + 2, y + 3);
    pdf.setFontSize(8);
    pdf.text(formatSSN(entry.recipientSSN), leftColX + tinHalfWidth + 2, y + 7);

    // Box 1: Nonemployee compensation
    drawBox(middleColX, y, middleColWidth + rightColWidth, tinRowHeight);
    pdf.setFontSize(5.5);
    pdf.text('1 Nonemployee compensation', middleColX + 2, y + 3);
    pdf.setFontSize(9);
    const box1Str = formatCurrency(entry.nonEmployeeCompensation);
    if (box1Str) {
      pdf.text('$', middleColX + 2, y + 7);
      pdf.text(box1Str, middleColX + middleColWidth + rightColWidth - 3, y + 7, { align: 'right' });
    } else {
      pdf.text('$', middleColX + 2, y + 7);
    }

    y += tinRowHeight;

    // ==================== RECIPIENT NAME ROW ====================
    const nameRowHeight = 8;
    drawBox(margin, y, leftColWidth, nameRowHeight);

    pdf.setFontSize(5.5);
    pdf.text("RECIPIENT'S name", leftColX + 2, y + 3);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.text(entry.recipientName, leftColX + 2, y + 7);
    pdf.setFont('helvetica', 'normal');

    // Box 2: Payer made direct sales
    const box2Height = nameRowHeight;
    drawBox(middleColX, y, middleColWidth + rightColWidth, box2Height);
    pdf.setFontSize(5.5);
    pdf.text('2 Payer made direct sales totaling $5,000 or more of', middleColX + 2, y + 3);
    pdf.text('consumer products to recipient for resale', middleColX + 4, y + 6);

    // Checkbox for Box 2
    drawCheckbox(middleColX + middleColWidth + rightColWidth - 8, y + 2, entry.directSales5000OrMore);

    y += nameRowHeight;

    // ==================== STREET ADDRESS ROW ====================
    const streetRowHeight = 8;
    drawBox(margin, y, leftColWidth, streetRowHeight);

    pdf.setFontSize(5.5);
    pdf.text("Street address (including apt. no.)", leftColX + 2, y + 3);
    pdf.setFontSize(7);
    // Only first line of address
    const firstAddressLine = entry.recipientAddress.split('\n')[0];
    pdf.text(firstAddressLine || '', leftColX + 2, y + 7);

    // Box 3: Excess golden parachute payments
    drawBox(middleColX, y, middleColWidth + rightColWidth, streetRowHeight);
    pdf.setFontSize(5.5);
    pdf.text('3 Excess golden parachute payments', middleColX + 2, y + 3);
    pdf.setFontSize(9);
    const box3Str = formatCurrency(entry.excessGoldenParachute);
    pdf.text('$', middleColX + 2, y + 7);
    if (box3Str) {
      pdf.text(box3Str, middleColX + middleColWidth + rightColWidth - 3, y + 7, { align: 'right' });
    }

    y += streetRowHeight;

    // ==================== CITY/STATE/ZIP ROW ====================
    const cityRowHeight = 8;
    drawBox(margin, y, leftColWidth, cityRowHeight);

    pdf.setFontSize(5.5);
    pdf.text("City or town, state or province, country, and ZIP or foreign postal code", leftColX + 2, y + 3);
    pdf.setFontSize(7);
    const recipientCityStateZip = [
      entry.recipientCity,
      entry.recipientState,
      entry.recipientZip
    ].filter(Boolean).join(', ');
    pdf.text(recipientCityStateZip || '', leftColX + 2, y + 7);

    // Box 4: Federal income tax withheld
    drawBox(middleColX, y, middleColWidth + rightColWidth, cityRowHeight);
    pdf.setFontSize(5.5);
    pdf.text('4 Federal income tax withheld', middleColX + 2, y + 3);
    pdf.setFontSize(9);
    const box4Str = formatCurrency(entry.federalTaxWithheld);
    pdf.text('$', middleColX + 2, y + 7);
    if (box4Str) {
      pdf.text(box4Str, middleColX + middleColWidth + rightColWidth - 3, y + 7, { align: 'right' });
    }

    y += cityRowHeight;

    // ==================== ACCOUNT NUMBER + STATE SECTION ====================
    const stateRowHeight = 9;

    // Account number box (left side)
    const accountWidth = leftColWidth * 0.7;
    drawBox(margin, y, accountWidth, stateRowHeight);
    pdf.setFontSize(5.5);
    pdf.text("Account number (see instructions)", leftColX + 2, y + 3);
    if (entry.accountNumber) {
      pdf.setFontSize(7);
      pdf.text(entry.accountNumber, leftColX + 2, y + 7);
    }

    // 2nd TIN not. checkbox (right side of account number area)
    const tinNotWidth = leftColWidth * 0.3;
    drawBox(leftColX + accountWidth, y, tinNotWidth, stateRowHeight);
    pdf.setFontSize(5.5);
    pdf.text("2nd TIN not.", leftColX + accountWidth + 2, y + 3);
    drawCheckbox(leftColX + accountWidth + tinNotWidth - 6, y + 3, entry.secondTinNotice);

    // Box 5: State tax withheld (first row)
    const stateBoxWidth = (middleColWidth + rightColWidth) / 3;
    drawBox(middleColX, y, stateBoxWidth, stateRowHeight);
    pdf.setFontSize(5.5);
    pdf.text('5 State tax withheld', middleColX + 2, y + 3);
    pdf.setFontSize(8);
    pdf.text('$', middleColX + 2, y + 7);
    const box5Str = formatCurrency(entry.stateTaxWithheld);
    if (box5Str) {
      pdf.text(box5Str, middleColX + stateBoxWidth - 2, y + 7, { align: 'right' });
    }

    // Box 6: State/Payer's state no. (first row)
    drawBox(middleColX + stateBoxWidth, y, stateBoxWidth, stateRowHeight);
    pdf.setFontSize(5.5);
    pdf.text("6 State/Payer's state no.", middleColX + stateBoxWidth + 2, y + 3);
    pdf.setFontSize(7);
    if (entry.statePayerNo) {
      pdf.text(entry.statePayerNo, middleColX + stateBoxWidth + 2, y + 7);
    }

    // Box 7: State income (first row)
    drawBox(middleColX + stateBoxWidth * 2, y, stateBoxWidth, stateRowHeight);
    pdf.setFontSize(5.5);
    pdf.text('7 State income', middleColX + stateBoxWidth * 2 + 2, y + 3);
    pdf.setFontSize(8);
    pdf.text('$', middleColX + stateBoxWidth * 2 + 2, y + 7);
    const box7Str = formatCurrency(entry.stateIncome);
    if (box7Str) {
      pdf.text(box7Str, middleColX + stateBoxWidth * 3 - 2, y + 7, { align: 'right' });
    }

    y += stateRowHeight;

    // Second state row (for second state)
    const stateRow2Height = 7;

    // Empty box under account number
    drawBox(margin, y, leftColWidth, stateRow2Height);
    drawCheckbox(leftColX + accountWidth + tinNotWidth - 6, y + 2, false); // Second checkbox row

    // Box 5 line 2
    drawBox(middleColX, y, stateBoxWidth, stateRow2Height);
    pdf.setFontSize(8);
    pdf.text('$', middleColX + 2, y + 5);
    const box5Str2 = formatCurrency(entry.stateTaxWithheld2);
    if (box5Str2) {
      pdf.text(box5Str2, middleColX + stateBoxWidth - 2, y + 5, { align: 'right' });
    }

    // Box 6 line 2
    drawBox(middleColX + stateBoxWidth, y, stateBoxWidth, stateRow2Height);
    pdf.setFontSize(7);
    if (entry.statePayerNo2) {
      pdf.text(entry.statePayerNo2, middleColX + stateBoxWidth + 2, y + 5);
    }

    // Box 7 line 2
    drawBox(middleColX + stateBoxWidth * 2, y, stateBoxWidth, stateRow2Height);
    pdf.setFontSize(8);
    pdf.text('$', middleColX + stateBoxWidth * 2 + 2, y + 5);
    const box7Str2 = formatCurrency(entry.stateIncome2);
    if (box7Str2) {
      pdf.text(box7Str2, middleColX + stateBoxWidth * 3 - 2, y + 5, { align: 'right' });
    }

    y += stateRow2Height;

    // ==================== FOOTER ====================
    y += 2;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6);
    pdf.setTextColor(0, 0, 0);

    pdf.text('Form 1099-NEC (Rev. 4-2025)', margin, y);

    if (copyType === 'B') {
      pdf.text('(keep for your records)', margin + 35, y);
    }

    pdf.text('www.irs.gov/Form1099NEC', pageWidth / 2, y, { align: 'center' });
    pdf.text('Department of the Treasury - Internal Revenue Service', pageWidth - margin, y, { align: 'right' });

    return y + 5;
  };

  // Generate pages - each entry gets copies on separate pages
  let isFirstPage = true;

  entries.forEach((entry) => {
    copies.forEach((copyType) => {
      if (!isFirstPage) {
        pdf.addPage();
      }
      isFirstPage = false;

      renderForm(entry, copyType, margin);
    });
  });

  // Save / open the PDF
  const firstEntry = entries[0];
  const recipientName = firstEntry.recipientName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '') || 'recipient';
  const filename = `1099-NEC_${recipientName}_${firstEntry.taxYear}.pdf`;

  pdf.save(filename);
};

/**
 * Generate just Copy B (For Recipient)
 */
export const generateForm1099NecCopyB = async (entries: Form1099NecEntry[]): Promise<void> => {
  return generateForm1099NecPDF(entries, ['B']);
};

/**
 * Generate all recipient copies (Copy B + Copy 2)
 */
export const generateForm1099NecAllCopies = async (entries: Form1099NecEntry[]): Promise<void> => {
  return generateForm1099NecPDF(entries, ['B', '2']);
};

/**
 * Generate Copy 1 for State Tax Department
 */
export const generateForm1099NecStateCopy = async (entries: Form1099NecEntry[]): Promise<void> => {
  return generateForm1099NecPDF(entries, ['1']);
};

/**
 * CSV column headers matching the 1099-NEC Data Import Template 2025
 */
const CSV_HEADERS = [
  'Payer Type',
  'Payer TIN Type',
  'Payer TIN',
  'P Business Name or Last Name',
  'P First Name',
  'P Middle Name',
  'P Suffix',
  'P Disregarded Entity',
  'P Address 1',
  'P Address 2 (Optional)',
  'P City',
  'P State',
  'P ZIP or Foreign Postal Code',
  'P Country',
  'P Phone Number',
  'P Email Address (optional)',
  'P State id (optional)',
  'Recipient Attention To (Optional)',
  'Recipient Type',
  'Recipient TIN Type',
  'Recipient TIN',
  'R Business Name or Last Name',
  'R First Name',
  'R Middle Name',
  'R Suffix',
  'R Address 1',
  'R Address 2 (Optional)',
  'R City',
  'R State',
  'R ZIP or Foreign Postal Code',
  'R Country',
  'R Phone Number (Optional)',
  'R Email Address (optional)',
  'Acct No (optional)',
  'Box 1 Nonemployee Compensation',
  'Box 2 Payer made direct sales totaling $5,000 or more',
  'Box 3 Excess golden parachute payments',
  'Box 4 Fed Income Tax withheld',
  'Box 5a State Tax withheld',
  'Box 5b State Tax Withheld',
  'Box 6a State',
  'Box 6a State No',
  'Box 6b State',
  'Box 6b State No',
  'Box 7a State Income',
  'Box 7b State Income',
  'Client ID',
  'Exclude Direct State Filing',
  'Recipient ClientId',
  'Group ID',
  'Second TIN',
  'Email Receipt Language',
  'Exclude CFSF'
];

/**
 * Escape a value for CSV (handle commas, quotes, newlines)
 */
function escapeCSV(value: string | number | boolean | undefined | null): string {
  if (value === undefined || value === null) return '';
  const str = String(value);
  // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Parse recipient name into parts (assumes "First Last" or "First Middle Last" format)
 * For SSN recipients (individuals), tries to split the name
 * For EIN recipients (businesses), uses full name as business name
 */
function parseRecipientName(name: string, isIndividual: boolean): {
  businessName: string;
  firstName: string;
  middleName: string;
  suffix: string;
} {
  if (!isIndividual) {
    // Business - use full name as business name
    return { businessName: name, firstName: '', middleName: '', suffix: '' };
  }

  // Individual - try to parse name parts
  const parts = name.trim().split(/\s+/);
  const suffixes = ['JR', 'SR', 'II', 'III', 'IV', 'V'];

  let suffix = '';
  // Check if last part is a suffix
  if (parts.length > 1) {
    const lastPart = parts[parts.length - 1].toUpperCase().replace(/[.,]/g, '');
    if (suffixes.includes(lastPart)) {
      suffix = parts.pop() || '';
    }
  }

  if (parts.length === 1) {
    return { businessName: parts[0], firstName: '', middleName: '', suffix };
  } else if (parts.length === 2) {
    return { businessName: parts[1], firstName: parts[0], middleName: '', suffix };
  } else {
    // First, middle(s), last
    const firstName = parts[0];
    const lastName = parts[parts.length - 1];
    const middleName = parts.slice(1, -1).join(' ');
    return { businessName: lastName, firstName, middleName, suffix };
  }
}

/**
 * Determine if TIN is SSN (individual) or EIN (business)
 * SSN format: XXX-XX-XXXX (9 digits, dashes optional)
 * EIN format: XX-XXXXXXX (9 digits, dash after 2nd digit)
 */
function getTINType(tin: string): 'SSN' | 'EIN' {
  const digits = tin.replace(/\D/g, '');
  if (digits.length !== 9) return 'SSN'; // Default to SSN

  // If original has dash after 2nd digit, it's likely EIN
  const einPattern = /^\d{2}-\d{7}$/;
  if (einPattern.test(tin)) return 'EIN';

  // Otherwise assume SSN
  return 'SSN';
}

/**
 * Format TIN for CSV (remove dashes, just digits)
 */
function formatTIN(tin: string): string {
  return tin.replace(/\D/g, '');
}

/**
 * Generate a CSV file matching the 1099-NEC Data Import Template 2025 format
 */
export const generateForm1099NecCSV = (
  entries: Form1099NecEntry[],
  clientId?: string
): void => {
  if (!entries.length) {
    throw new Error('No 1099-NEC entries provided');
  }

  const rows: string[][] = [];

  // Add header row
  rows.push(CSV_HEADERS);

  // Add data rows
  entries.forEach((entry) => {
    const payerTINType = 'EIN'; // Payer is always a business
    const payerTIN = formatTIN(entry.payerInfo.ein || '');

    const recipientTINType = getTINType(entry.recipientSSN);
    const isIndividual = recipientTINType === 'SSN';
    const recipientTIN = formatTIN(entry.recipientSSN);

    const recipientNameParts = parseRecipientName(entry.recipientName, isIndividual);

    // Parse payer address lines
    const payerAddressLines = (getPayerAddress(entry.payerInfo.address)).split('\n');
    const payerAddress1 = payerAddressLines[0] || '';
    const payerAddress2 = payerAddressLines[1] || '';

    // Parse recipient address lines
    const recipientAddressLines = (entry.recipientAddress || '').split('\n');
    const recipientAddress1 = recipientAddressLines[0] || '';
    const recipientAddress2 = recipientAddressLines[1] || '';

    const row: (string | number | boolean)[] = [
      'Business',                                    // Payer Type
      payerTINType,                                  // Payer TIN Type
      payerTIN,                                      // Payer TIN
      entry.payerInfo.name || '',                    // P Business Name or Last Name
      '',                                            // P First Name (business, so empty)
      '',                                            // P Middle Name
      '',                                            // P Suffix
      '',                                            // P Disregarded Entity
      payerAddress1,                                 // P Address 1
      payerAddress2,                                 // P Address 2 (Optional)
      entry.payerInfo.city || '',                    // P City
      entry.payerInfo.state || '',                   // P State
      entry.payerInfo.zip || '',                     // P ZIP or Foreign Postal Code
      'US',                                          // P Country
      entry.payerInfo.phone || '',                   // P Phone Number
      '',                                            // P Email Address (optional)
      entry.statePayerNo || '',                      // P State id (optional)
      '',                                            // Recipient Attention To (Optional)
      isIndividual ? 'Individual' : 'Business',      // Recipient Type
      recipientTINType,                              // Recipient TIN Type
      recipientTIN,                                  // Recipient TIN
      recipientNameParts.businessName,               // R Business Name or Last Name
      recipientNameParts.firstName,                  // R First Name
      recipientNameParts.middleName,                 // R Middle Name
      recipientNameParts.suffix,                     // R Suffix
      recipientAddress1,                             // R Address 1
      recipientAddress2,                             // R Address 2 (Optional)
      entry.recipientCity || '',                     // R City
      entry.recipientState || '',                    // R State
      entry.recipientZip || '',                      // R ZIP or Foreign Postal Code
      'US',                                          // R Country
      '',                                            // R Phone Number (Optional)
      '',                                            // R Email Address (optional)
      entry.accountNumber || '',                     // Acct No (optional)
      entry.nonEmployeeCompensation || 0,            // Box 1 Nonemployee Compensation
      entry.directSales5000OrMore ? 'X' : '',        // Box 2 Payer made direct sales
      entry.excessGoldenParachute || '',             // Box 3 Excess golden parachute
      entry.federalTaxWithheld || '',                // Box 4 Fed Income Tax withheld
      entry.stateTaxWithheld || '',                  // Box 5a State Tax withheld
      entry.stateTaxWithheld2 || '',                 // Box 5b State Tax Withheld
      entry.payerInfo.state || '',                   // Box 6a State
      entry.statePayerNo || '',                      // Box 6a State No
      '',                                            // Box 6b State
      entry.statePayerNo2 || '',                     // Box 6b State No
      entry.stateIncome || '',                       // Box 7a State Income
      entry.stateIncome2 || '',                      // Box 7b State Income
      clientId || '',                                // Client ID
      '',                                            // Exclude Direct State Filing
      '',                                            // Recipient ClientId
      '',                                            // Group ID
      entry.secondTinNotice ? 'X' : '',              // Second TIN
      '',                                            // Email Receipt Language
      ''                                             // Exclude CFSF
    ];

    rows.push(row.map(v => escapeCSV(v)));
  });

  // Convert to CSV string
  const csvContent = rows.map(row => row.join(',')).join('\n');

  // Create and download the file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const firstEntry = entries[0];
  const recipientName = firstEntry.recipientName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '') || 'recipient';
  const filename = `1099-NEC_${recipientName}_${firstEntry.taxYear}.csv`;

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export default generateForm1099NecPDF;
