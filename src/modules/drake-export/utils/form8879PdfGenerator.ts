/**
 * IRS Form 8879 PDF Generator
 * Generates a PDF of the E-File Signature Authorization matching the official IRS form layout
 * Reference: https://www.irs.gov/pub/irs-pdf/f8879.pdf
 */

import jsPDF from 'jspdf';
import type { TaxPortal, TaxDocumentRequest } from '../types/drakeTypes';

interface Form8879Data {
  client: TaxPortal;
  request: TaxDocumentRequest;
  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEFIN?: string; // 6-digit Electronic Filing Identification Number
  logo?: string;
  taxYear?: number;
  baseUrl?: string; // Base URL for validation link
  // Tax return amounts (optional - from Form 1040)
  adjustedGrossIncome?: number;
  totalTax?: number;
  federalWithholding?: number;
  refundAmount?: number;
  amountOwed?: number;
}

/**
 * Generate a PDF of the IRS Form 8879 E-File Signature Authorization
 */
export const generateForm8879PDF = async (data: Form8879Data): Promise<void> => {
  const {
    client,
    request,
    businessName = 'Tax Preparer',
    businessAddress,
    businessPhone,
    businessEFIN = '000000',
    logo,
    taxYear = new Date().getFullYear() - 1,
    baseUrl,
    adjustedGrossIncome,
    totalTax,
    federalWithholding,
    refundAmount,
    amountOwed
  } = data;

  const pinData = request.clientSigningPin;

  if (!pinData || !pinData.pin) {
    throw new Error('No signing PIN found on this document request');
  }

  // Generate validation URL
  const validationBaseUrl = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://app.example.com');
  const validationUrl = `${validationBaseUrl}/#/signature-validation/${request.id}/${request.accessToken}/pin`;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - (2 * margin);
  let y = margin;

  // Helper functions
  const drawLine = (y1: number, x1: number = margin, x2: number = pageWidth - margin, width: number = 0.3) => {
    pdf.setDrawColor(0);
    pdf.setLineWidth(width);
    pdf.line(x1, y1, x2, y1);
  };

  const drawBox = (x: number, y: number, w: number, h: number, fill: boolean = false) => {
    pdf.setDrawColor(0);
    pdf.setLineWidth(0.3);
    if (fill) {
      pdf.setFillColor(255, 255, 255);
      pdf.rect(x, y, w, h, 'FD');
    } else {
      pdf.rect(x, y, w, h);
    }
  };

  const formatCurrency = (amount?: number): string => {
    if (amount === undefined || amount === null) return '';
    return amount.toLocaleString('en-US');
  };

  // ==================== FORM HEADER ====================
  // Form number box (left)
  pdf.setFillColor(0, 0, 0);
  pdf.rect(margin, y, 25, 14, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text('Form', margin + 2, y + 5);
  pdf.setFontSize(18);
  pdf.text('8879', margin + 2, y + 12);

  // Department info (center)
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.text('Department of the Treasury', margin + 28, y + 3);
  pdf.text('Internal Revenue Service', margin + 28, y + 6.5);

  // Form title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text('IRS e-file Signature Authorization', margin + 28, y + 11);

  // OMB info and year (right)
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.text('OMB No. 1545-0074', pageWidth - margin - 25, y + 3);

  pdf.setFillColor(0, 0, 0);
  pdf.rect(pageWidth - margin - 18, y + 5, 18, 9, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text(String(taxYear), pageWidth - margin - 9, y + 12, { align: 'center' });

  y += 16;

  // Subtitle
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  const subtitle = 'For use with Forms 1040, 1040-SR, 1040-NR, 1040-SS, and 1040-X.';
  pdf.text(subtitle, pageWidth / 2, y, { align: 'center' });
  y += 3;
  pdf.setFontSize(7);
  pdf.text('Go to www.irs.gov/Form8879 for the latest information.', pageWidth / 2, y, { align: 'center' });
  y += 4;

  drawLine(y, margin, pageWidth - margin, 0.5);
  y += 1;

  // ==================== TAXPAYER INFO ====================
  // Row 1: Name and SSN
  const infoBoxHeight = 8;

  pdf.setFontSize(6);
  pdf.text("Taxpayer's name", margin + 1, y + 2.5);
  drawBox(margin, y, contentWidth * 0.55, infoBoxHeight);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  const taxpayerName = `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'N/A';
  pdf.text(taxpayerName, margin + 25, y + 5.5);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6);
  pdf.text("Social security number", margin + contentWidth * 0.55 + 2, y + 2.5);
  drawBox(margin + contentWidth * 0.55, y, contentWidth * 0.45, infoBoxHeight);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  // Mask SSN for privacy
  pdf.text('XXX-XX-XXXX', margin + contentWidth * 0.55 + 30, y + 5.5);

  y += infoBoxHeight;

  // Row 2: Spouse name and SSN
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6);
  pdf.text("Spouse's name (if joint return)", margin + 1, y + 2.5);
  drawBox(margin, y, contentWidth * 0.55, infoBoxHeight);

  pdf.setFontSize(6);
  pdf.text("Spouse's social security number", margin + contentWidth * 0.55 + 2, y + 2.5);
  drawBox(margin + contentWidth * 0.55, y, contentWidth * 0.45, infoBoxHeight);

  y += infoBoxHeight + 2;

  // ==================== PART I ====================
  pdf.setFillColor(0, 0, 0);
  pdf.rect(margin, y, contentWidth, 5, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('Part I', margin + 2, y + 3.5);
  pdf.text('Tax Return Information (Whole dollars only. See instructions.)', margin + 18, y + 3.5);
  y += 6;

  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.text('Enter whole dollars only on lines 1 through 5. For Form 1040-SS filers, complete line 4 only and leave lines 1, 2, 3, and 5 blank.', margin, y + 2);
  y += 5;

  // Part I Lines
  const lineHeight = 6;
  const labelWidth = contentWidth * 0.7;
  const amountWidth = contentWidth * 0.25;
  const lineNumWidth = 8;

  const drawPartILine = (lineNum: string, label: string, formRef: string, amount?: number) => {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.text(lineNum, margin + 2, y + 4);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.text(label, margin + lineNumWidth, y + 4);

    pdf.setFontSize(6);
    pdf.setTextColor(100, 100, 100);
    pdf.text(formRef, margin + lineNumWidth, y + 7);
    pdf.setTextColor(0, 0, 0);

    // Amount box
    drawBox(margin + labelWidth, y, amountWidth, lineHeight);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    const amountStr = formatCurrency(amount);
    if (amountStr) {
      pdf.text(amountStr, margin + labelWidth + amountWidth - 3, y + 4.5, { align: 'right' });
    }

    // Line number box
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.text(lineNum, margin + labelWidth + amountWidth + 3, y + 4);

    y += lineHeight + 1;
  };

  drawPartILine('1', 'Adjusted gross income', '(Form 1040, 1040-SR, or 1040-NR, line 11; Form 1040-SS, see instructions)', adjustedGrossIncome);
  drawPartILine('2', 'Total tax', '(Form 1040, 1040-SR, or 1040-NR, line 24; Form 1040-SS, see instructions)', totalTax);
  drawPartILine('3', 'Federal income tax withheld', '(Form 1040, 1040-SR, 1040-NR, or 1040-SS, line 25d)', federalWithholding);
  drawPartILine('4', 'Refund', '(Form 1040, 1040-SR, 1040-NR, or 1040-SS, line 35a)', refundAmount);
  drawPartILine('5', 'Amount you owe', '(Form 1040, 1040-SR, or 1040-NR, line 37; Form 1040-SS, see instructions)', amountOwed);

  y += 2;

  // ==================== PART II ====================
  pdf.setFillColor(0, 0, 0);
  pdf.rect(margin, y, contentWidth, 5, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('Part II', margin + 2, y + 3.5);
  pdf.text('Taxpayer Declaration and Signature Authorization (Be sure you get a copy of your return)', margin + 18, y + 3.5);
  y += 7;

  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);

  // Declaration text
  const declaration1 = "Under penalties of perjury, I declare that the information I provided to my electronic return originator (ERO), and the amounts in Part I above, agree with the amounts on my corresponding lines of my " + taxYear + " federal income tax return. To the best of my knowledge and belief, my return is true, correct, and complete.";
  const lines1 = pdf.splitTextToSize(declaration1, contentWidth);
  pdf.text(lines1, margin, y);
  y += lines1.length * 2.8 + 2;

  // Authorization options
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.text('I authorize the ERO named below to:', margin, y);
  y += 4;

  // Checkbox 1 (selected - ERO enters PIN)
  pdf.setFont('helvetica', 'normal');
  drawBox(margin, y - 1, 3, 3);
  pdf.setFillColor(0, 0, 0);
  pdf.rect(margin + 0.5, y - 0.5, 2, 2, 'F'); // Filled checkbox
  pdf.setFontSize(7);
  const auth1 = "Enter my PIN as my signature on my " + taxYear + " electronically filed income tax return. I authorize the ERO to enter or generate my PIN, and I have entered my PIN below.";
  const auth1Lines = pdf.splitTextToSize(auth1, contentWidth - 6);
  pdf.text(auth1Lines, margin + 5, y + 1);
  y += auth1Lines.length * 2.8 + 3;

  // Checkbox 2
  drawBox(margin, y - 1, 3, 3);
  const auth2 = "Enter my PIN as my signature on my " + taxYear + " electronically filed income tax return. I will enter my own PIN below. I am using the Practitioner PIN method. I authorize the ERO named below to enter my PIN on my return only if I have provided the required Authentication Record information.";
  const auth2Lines = pdf.splitTextToSize(auth2, contentWidth - 6);
  pdf.text(auth2Lines, margin + 5, y + 1);
  y += auth2Lines.length * 2.8 + 5;

  // PIN Entry Section
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text("Taxpayer's PIN: enter five digits, but don't enter all zeros", margin, y);

  // Draw PIN boxes
  const pinBoxSize = 8;
  const pinStartX = margin + 85;
  const pin = pinData.pin || '00000';

  for (let i = 0; i < 5; i++) {
    drawBox(pinStartX + (i * (pinBoxSize + 1)), y - 5, pinBoxSize, pinBoxSize);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text(pin[i] || '', pinStartX + (i * (pinBoxSize + 1)) + 2.5, y + 1);
  }
  y += 8;

  // Spouse PIN (if applicable)
  pdf.setFontSize(9);
  pdf.text("Spouse's PIN: enter five digits, but don't enter all zeros", margin, y);
  for (let i = 0; i < 5; i++) {
    drawBox(pinStartX + (i * (pinBoxSize + 1)), y - 5, pinBoxSize, pinBoxSize);
  }
  y += 10;

  // More declaration text
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  const declaration2 = "I understand that my PIN will be used as my signature for my " + taxYear + " income tax return. I consent to the IRS and the ERO disclosing to each other my taxpayer identity, my return, and any return information in connection with e-filing, including my PIN, adjusted gross income, and any self-selected identity information.";
  const lines2 = pdf.splitTextToSize(declaration2, contentWidth);
  pdf.text(lines2, margin, y);
  y += lines2.length * 2.8 + 5;

  // Signature section
  const sigSectionWidth = contentWidth * 0.6;
  const dateSectionWidth = contentWidth * 0.35;

  // Taxpayer signature
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text("Taxpayer's signature", margin, y);
  pdf.text("Date", margin + sigSectionWidth + 5, y);
  y += 2;

  // Signature box
  drawBox(margin, y, sigSectionWidth, 18);

  // Add signature image if available
  if (pinData.signatureImage) {
    try {
      pdf.addImage(pinData.signatureImage, 'PNG', margin + 2, y + 1, sigSectionWidth - 4, 16);
    } catch (e) {
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text('[Signature on file]', margin + 10, y + 10);
      pdf.setTextColor(0, 0, 0);
    }
  }

  // Date box
  drawBox(margin + sigSectionWidth + 5, y, dateSectionWidth, 8);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  const signDate = pinData.setAt ? new Date(pinData.setAt).toLocaleDateString() : new Date().toLocaleDateString();
  pdf.text(signDate, margin + sigSectionWidth + 8, y + 5.5);

  y += 20;

  // Spouse signature line
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text("Spouse's signature", margin, y);
  pdf.text("Date", margin + sigSectionWidth + 5, y);
  y += 2;
  drawBox(margin, y, sigSectionWidth, 12);
  drawBox(margin + sigSectionWidth + 5, y, dateSectionWidth, 8);
  y += 15;

  // ==================== PART III ====================
  pdf.setFillColor(0, 0, 0);
  pdf.rect(margin, y, contentWidth, 5, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('Part III', margin + 2, y + 3.5);
  pdf.text('Electronic Return Originator (ERO) Declaration', margin + 18, y + 3.5);
  y += 7;

  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);

  const eroDeclaration = "I declare that I have reviewed the above taxpayer's return and that the entries on Form 8879 are complete and correct to the best of my knowledge. If I am only an Intermediate Service Provider, I understand that I am not responsible for reviewing the taxpayer's return. I have obtained the taxpayer's signature on Form 8879 before transmitting the return to the IRS; I have provided the taxpayer with a copy of all forms and information to be filed with the IRS; and I have followed all other requirements in Pub. 1345, Handbook for Authorized IRS e-file Providers of Individual Income Tax Returns, and, if applicable, Pub. 1346, Electronic Return File Specifications and Record Layouts for Individual Income Tax Returns. If I am also the Paid Preparer, under penalties of perjury I declare that I have examined the above taxpayer's return and accompanying schedules and statements, and to the best of my knowledge and belief, they are true, correct, and complete. This declaration is based on all information of which I have any knowledge.";
  const eroLines = pdf.splitTextToSize(eroDeclaration, contentWidth);
  pdf.text(eroLines, margin, y);
  y += eroLines.length * 2.5 + 5;

  // ERO Info boxes
  const eroColWidth = contentWidth / 3;

  // Row 1: ERO's EFIN/PIN, Signature, Date
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6);
  pdf.text("ERO's EFIN/PIN. Enter your six-digit EFIN", margin, y + 2);
  pdf.text("followed by your five-digit self-selected PIN.", margin, y + 4.5);
  drawBox(margin, y + 6, eroColWidth - 5, 8);
  pdf.setFontSize(9);
  pdf.text(businessEFIN + '00000', margin + 3, y + 11);

  pdf.setFontSize(6);
  pdf.text("ERO's signature", margin + eroColWidth, y + 2);
  drawBox(margin + eroColWidth, y + 6, eroColWidth, 8);

  pdf.text("Date", margin + eroColWidth * 2 + 5, y + 2);
  drawBox(margin + eroColWidth * 2 + 5, y + 6, eroColWidth - 10, 8);
  pdf.setFontSize(9);
  pdf.text(new Date().toLocaleDateString(), margin + eroColWidth * 2 + 8, y + 11);

  y += 18;

  // Row 2: ERO firm name
  pdf.setFontSize(6);
  pdf.text("ERO firm name (or yours if self-employed), address, and ZIP code", margin, y + 2);
  drawBox(margin, y + 4, contentWidth, 12);

  // Add logo if provided
  if (logo) {
    try {
      pdf.addImage(logo, 'PNG', margin + 2, y + 5, 10, 10);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.text(businessName, margin + 14, y + 9);
      if (businessAddress) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.text(businessAddress, margin + 14, y + 13);
      }
    } catch (e) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.text(businessName, margin + 3, y + 9);
      if (businessAddress) {
        pdf.setFont('helvetica', 'normal');
        pdf.text(businessAddress, margin + 3, y + 13);
      }
    }
  } else {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.text(businessName, margin + 3, y + 9);
    if (businessAddress) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.text(businessAddress, margin + 3, y + 13);
    }
  }

  // Phone
  if (businessPhone) {
    pdf.setFontSize(8);
    pdf.text('Phone: ' + businessPhone, margin + contentWidth - 45, y + 9);
  }

  y += 18;

  // ==================== SIGNATURE VALIDATION ====================
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(139, 92, 246);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(margin, y, contentWidth, 14, 2, 2, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(139, 92, 246);
  pdf.text('SIGNATURE VERIFICATION', margin + 3, y + 4);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6);
  pdf.setTextColor(100, 100, 100);
  pdf.text('Verify this e-filing authorization online:', margin + 3, y + 8);

  pdf.setTextColor(59, 130, 246);
  pdf.textWithLink(validationUrl, margin + 3, y + 11, { url: validationUrl });

  // ==================== FOOTER ====================
  y = pageHeight - 8;
  pdf.setFontSize(6);
  pdf.setTextColor(100, 100, 100);
  pdf.text('For Paperwork Reduction Act Notice, see your tax return instructions.', margin, y);
  pdf.text('Cat. No. 17571Q', pageWidth / 2, y, { align: 'center' });
  pdf.text('Form 8879 (Rev. 1-2021)', pageWidth - margin, y, { align: 'right' });

  // ==================== DOWNLOAD ====================
  const clientName = `${client.firstName || ''}_${client.lastName || ''}`.trim().replace(/\s+/g, '_') || 'client';
  const filename = `Form_8879_${clientName}_${taxYear}.pdf`;

  pdf.save(filename);
};

export default generateForm8879PDF;
