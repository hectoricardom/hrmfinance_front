/**
 * Motion to Dismiss Document Generator Service
 * Generates PDF and text documents for Immigration Court motions
 */

import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from 'pdf-lib';
import {
  MotionToDismissData,
  formatANumber
} from '../types/motionToDismiss';
import {
  generateMotionText,
  generateCertificateOfService,
  generateProposedOrder,
  motionCoverPageTemplate
} from '../templates/motionToDismissTemplate';
import { formatDateMMDDYYYY } from '../../../services/utils';

// PDF generation constants
const PAGE_WIDTH = 612; // Letter size: 8.5 inches
const PAGE_HEIGHT = 792; // Letter size: 11 inches
const MARGIN = 72; // 1 inch margins
const LINE_HEIGHT = 14;
const FONT_SIZE = 12;
const HEADER_FONT_SIZE = 14;

/**
 * Helper to format dates for display - timezone safe
 */
const format2Date = (timestamp: number): string => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  // Use local date components to avoid timezone shift
  const year = date.getFullYear();
  const month = date.toLocaleDateString('en-US', { month: 'long' });
  const day = date.getDate();
  return `${month} ${day}, ${year}`;
};

/**
 * Wrap text to fit within a specified width
 */
const wrapText = (text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] => {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);

    if (testWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines;
};

/**
 * Add text to PDF page with word wrapping
 */
const addWrappedText = (
  page: PDFPage,
  text: string,
  x: number,
  startY: number,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
  lineHeight: number
): number => {
  const lines = text.split('\n');
  let currentY = startY;

  for (const line of lines) {
    if (line.trim() === '') {
      currentY -= lineHeight;
      continue;
    }

    const wrappedLines = wrapText(line, font, fontSize, maxWidth);
    for (const wrappedLine of wrappedLines) {
      if (currentY < MARGIN + 50) {
        // Need new page - return negative to indicate this
        return -currentY;
      }
      page.drawText(wrappedLine, {
        x,
        y: currentY,
        size: fontSize,
        font,
        color: rgb(0, 0, 0)
      });
      currentY -= lineHeight;
    }
  }

  return currentY;
};

/**
 * Generate Motion to Dismiss PDF document
 */
export const generateMotionPDF = async (data: MotionToDismissData): Promise<Blob> => {
  const pdfDoc = await PDFDocument.create();
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  const contentWidth = PAGE_WIDTH - (2 * MARGIN);
  let currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let yPosition = PAGE_HEIGHT - MARGIN;

  // Helper to add a new page when needed
  const ensureSpace = (neededSpace: number): void => {
    if (yPosition < MARGIN + neededSpace) {
      currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      yPosition = PAGE_HEIGHT - MARGIN;
    }
  };

  // Helper to draw centered text
  const drawCenteredText = (text: string, y: number, font: PDFFont, size: number): void => {
    const textWidth = font.widthOfTextAtSize(text, size);
    currentPage.drawText(text, {
      x: (PAGE_WIDTH - textWidth) / 2,
      y,
      size,
      font,
      color: rgb(0, 0, 0)
    });
  };

  // === HEADER ===
  drawCenteredText('UNITED STATES DEPARTMENT OF JUSTICE', yPosition, timesRomanBold, HEADER_FONT_SIZE);
  yPosition -= LINE_HEIGHT + 2;
  drawCenteredText('EXECUTIVE OFFICE FOR IMMIGRATION REVIEW', yPosition, timesRomanBold, HEADER_FONT_SIZE);
  yPosition -= LINE_HEIGHT + 2;
  drawCenteredText('IMMIGRATION COURT', yPosition, timesRomanBold, HEADER_FONT_SIZE);
  yPosition -= LINE_HEIGHT + 2;
  drawCenteredText(data.courtLocation.toUpperCase(), yPosition, timesRoman, FONT_SIZE);
  yPosition -= LINE_HEIGHT * 2;

  // === CASE CAPTION ===
  const respondentName = `${data.respondent.firstName}${data.respondent.middleName ? ' ' + data.respondent.middleName : ''} ${data.respondent.lastName}`.toUpperCase();
  const aNumber = formatANumber(data.aNumber);

  // Draw caption box
  const captionLines = [
    'In the Matter of:',
    '',
    respondentName,
    '',
    '     Respondent'
  ];

  const captionRightLines = [
    ')',
    ')',
    ')    A# ' + aNumber,
    ')',
    ')    In Removal Proceedings'
  ];

  const captionStartY = yPosition;
  captionLines.forEach((line, i) => {
    currentPage.drawText(line, {
      x: MARGIN,
      y: yPosition - (i * LINE_HEIGHT),
      size: FONT_SIZE,
      font: line === respondentName ? timesRomanBold : timesRoman,
      color: rgb(0, 0, 0)
    });
  });

  captionRightLines.forEach((line, i) => {
    currentPage.drawText(line, {
      x: MARGIN + 250,
      y: captionStartY - (i * LINE_HEIGHT),
      size: FONT_SIZE,
      font: timesRoman,
      color: rgb(0, 0, 0)
    });
  });

  yPosition -= (captionLines.length + 1) * LINE_HEIGHT;

  // === MOTION TITLE ===
  yPosition -= LINE_HEIGHT;
  const motionTitle = data.motionType === 'dismiss'
    ? 'MOTION TO DISMISS'
    : data.motionType === 'terminate'
      ? 'MOTION TO TERMINATE'
      : 'MOTION FOR ADMINISTRATIVE CLOSURE';

  drawCenteredText(motionTitle, yPosition, timesRomanBold, HEADER_FONT_SIZE);
  yPosition -= LINE_HEIGHT * 2;

  // === INTRODUCTION ===
  ensureSpace(100);
  currentPage.drawText('I. INTRODUCTION', {
    x: MARGIN,
    y: yPosition,
    size: FONT_SIZE,
    font: timesRomanBold,
    color: rgb(0, 0, 0)
  });
  yPosition -= LINE_HEIGHT * 1.5;

  const isProSeIntro = data.isProSe !== false;
  const introText = isProSeIntro
    ? `     I, ${data.respondent.firstName} ${data.respondent.lastName}, appearing Pro Se, respectfully move this Honorable Court to grant the relief requested herein. I am a native and citizen of ${data.respondent.countryOfBirth}. I am currently in removal proceedings before this Court.`
    : `     Respondent, ${data.respondent.firstName} ${data.respondent.lastName}, by and through undersigned counsel, respectfully moves this Honorable Court to grant the relief requested herein. ${data.respondent.firstName} ${data.respondent.lastName} ("Respondent") is a native and citizen of ${data.respondent.countryOfBirth}. Respondent is currently in removal proceedings before this Court.`;

  yPosition = addWrappedText(
    currentPage,
    introText,
    MARGIN,
    yPosition,
    timesRoman,
    FONT_SIZE,
    contentWidth,
    LINE_HEIGHT
  );
  yPosition -= LINE_HEIGHT;

  // === FACTUAL BACKGROUND ===
  ensureSpace(80);
  currentPage.drawText('II. FACTUAL BACKGROUND', {
    x: MARGIN,
    y: yPosition,
    size: FONT_SIZE,
    font: timesRomanBold,
    color: rgb(0, 0, 0)
  });
  yPosition -= LINE_HEIGHT * 1.5;

  if (data.supportingFacts) {
    yPosition = addWrappedText(
      currentPage,
      '     ' + data.supportingFacts,
      MARGIN,
      yPosition,
      timesRoman,
      FONT_SIZE,
      contentWidth,
      LINE_HEIGHT
    );
  }
  yPosition -= LINE_HEIGHT;

  // === LEGAL ARGUMENT ===
  ensureSpace(80);
  currentPage.drawText('III. LEGAL ARGUMENT', {
    x: MARGIN,
    y: yPosition,
    size: FONT_SIZE,
    font: timesRomanBold,
    color: rgb(0, 0, 0)
  });
  yPosition -= LINE_HEIGHT * 1.5;

  // Basis-specific argument
  let basisText = '';
  if (data.basis === 'caa' && data.caaDetails) {
    basisText = `     Respondent is eligible for adjustment of status under the Cuban Adjustment Act (CAA), Public Law 89-732. Respondent filed Form I-485, Application to Register Permanent Residence or Adjust Status, on ${formatDateMMDDYYYY(data.caaDetails.i485FiledDate)}. The USCIS receipt number is ${data.caaDetails.i485ReceiptNumber}.${data.caaDetails.isApproved ? ` The application was approved on ${formatDateMMDDYYYY(data.caaDetails.i485ApprovalDate)}.` : ' The application is currently pending adjudication by USCIS.'}`;
  } else if (data.basis === 'already_lpr' && data.lprDetails) {
    basisText = `     Respondent was granted Lawful Permanent Resident status on ${formatDateMMDDYYYY(data.lprDetails.lprGrantDate)}. Respondent's Permanent Resident Card number is ${data.lprDetails.greenCardNumber}. As a Lawful Permanent Resident, Respondent is not removable under the grounds alleged. These proceedings were initiated in error.`;
  } else if (data.otherBasisDescription) {
    basisText = '     ' + data.otherBasisDescription;
  }

  if (basisText) {
    yPosition = addWrappedText(
      currentPage,
      basisText,
      MARGIN,
      yPosition,
      timesRoman,
      FONT_SIZE,
      contentWidth,
      LINE_HEIGHT
    );
    yPosition -= LINE_HEIGHT;
  }

  if (data.legalArguments) {
    yPosition = addWrappedText(
      currentPage,
      '     ' + data.legalArguments,
      MARGIN,
      yPosition,
      timesRoman,
      FONT_SIZE,
      contentWidth,
      LINE_HEIGHT
    );
    yPosition -= LINE_HEIGHT;
  }

  // === CONCLUSION ===
  ensureSpace(100);
  currentPage.drawText('IV. CONCLUSION', {
    x: MARGIN,
    y: yPosition,
    size: FONT_SIZE,
    font: timesRomanBold,
    color: rgb(0, 0, 0)
  });
  yPosition -= LINE_HEIGHT * 1.5;

  const reliefText = data.reliefRequested
    .map(r => r === 'dismissal' ? 'dismissal of removal proceedings' :
      r === 'termination' ? 'termination of removal proceedings' :
        'administrative closure')
    .join(', ');

  const conclusionText = `     For the foregoing reasons, Respondent respectfully requests that this Honorable Court grant this Motion and order the ${reliefText}.`;

  yPosition = addWrappedText(
    currentPage,
    conclusionText,
    MARGIN,
    yPosition,
    timesRoman,
    FONT_SIZE,
    contentWidth,
    LINE_HEIGHT
  );
  yPosition -= LINE_HEIGHT * 2;

  // === SIGNATURE BLOCK ===
  ensureSpace(120);
  currentPage.drawText('Respectfully submitted,', {
    x: MARGIN,
    y: yPosition,
    size: FONT_SIZE,
    font: timesRoman,
    color: rgb(0, 0, 0)
  });
  yPosition -= LINE_HEIGHT * 3;

  currentPage.drawText('_______________________________', {
    x: MARGIN,
    y: yPosition,
    size: FONT_SIZE,
    font: timesRoman,
    color: rgb(0, 0, 0)
  });
  yPosition -= LINE_HEIGHT;

  const isProSe = data.isProSe !== false;

  if (isProSe) {
    // Pro Se signature block - use respondent info
    currentPage.drawText(`${data.respondent.firstName} ${data.respondent.lastName}`, {
      x: MARGIN,
      y: yPosition,
      size: FONT_SIZE,
      font: timesRomanBold,
      color: rgb(0, 0, 0)
    });
    yPosition -= LINE_HEIGHT;

    currentPage.drawText(data.respondent.address.street, {
      x: MARGIN,
      y: yPosition,
      size: FONT_SIZE,
      font: timesRoman,
      color: rgb(0, 0, 0)
    });
    yPosition -= LINE_HEIGHT;

    if (data.respondent.address.street2) {
      currentPage.drawText(data.respondent.address.street2, {
        x: MARGIN,
        y: yPosition,
        size: FONT_SIZE,
        font: timesRoman,
        color: rgb(0, 0, 0)
      });
      yPosition -= LINE_HEIGHT;
    }

    currentPage.drawText(`${data.respondent.address.city}, ${data.respondent.address.state} ${data.respondent.address.zipCode}`, {
      x: MARGIN,
      y: yPosition,
      size: FONT_SIZE,
      font: timesRoman,
      color: rgb(0, 0, 0)
    });
    yPosition -= LINE_HEIGHT;

    if (data.respondent.phone) {
      currentPage.drawText(`Tel: ${data.respondent.phone}`, {
        x: MARGIN,
        y: yPosition,
        size: FONT_SIZE,
        font: timesRoman,
        color: rgb(0, 0, 0)
      });
      yPosition -= LINE_HEIGHT;
    }

    if (data.respondent.email) {
      currentPage.drawText(`Email: ${data.respondent.email}`, {
        x: MARGIN,
        y: yPosition,
        size: FONT_SIZE,
        font: timesRoman,
        color: rgb(0, 0, 0)
      });
      yPosition -= LINE_HEIGHT;
    }

    currentPage.drawText(`A# ${formatANumber(data.aNumber)}`, {
      x: MARGIN,
      y: yPosition,
      size: FONT_SIZE,
      font: timesRoman,
      color: rgb(0, 0, 0)
    });
    yPosition -= LINE_HEIGHT;

    currentPage.drawText('Pro Se Respondent', {
      x: MARGIN,
      y: yPosition,
      size: FONT_SIZE,
      font: timesRomanBold,
      color: rgb(0, 0, 0)
    });
    yPosition -= LINE_HEIGHT * 2;
  } else if (data.attorney) {
    // Attorney signature block
    currentPage.drawText(data.attorney.name, {
      x: MARGIN,
      y: yPosition,
      size: FONT_SIZE,
      font: timesRomanBold,
      color: rgb(0, 0, 0)
    });
    yPosition -= LINE_HEIGHT;

    if (data.attorney.firmName) {
      currentPage.drawText(data.attorney.firmName, {
        x: MARGIN,
        y: yPosition,
        size: FONT_SIZE,
        font: timesRoman,
        color: rgb(0, 0, 0)
      });
      yPosition -= LINE_HEIGHT;
    }

    currentPage.drawText(data.attorney.address.street, {
      x: MARGIN,
      y: yPosition,
      size: FONT_SIZE,
      font: timesRoman,
      color: rgb(0, 0, 0)
    });
    yPosition -= LINE_HEIGHT;

    currentPage.drawText(`${data.attorney.address.city}, ${data.attorney.address.state} ${data.attorney.address.zipCode}`, {
      x: MARGIN,
      y: yPosition,
      size: FONT_SIZE,
      font: timesRoman,
      color: rgb(0, 0, 0)
    });
    yPosition -= LINE_HEIGHT;

    currentPage.drawText(`Tel: ${data.attorney.phone}${data.attorney.fax ? '  Fax: ' + data.attorney.fax : ''}`, {
      x: MARGIN,
      y: yPosition,
      size: FONT_SIZE,
      font: timesRoman,
      color: rgb(0, 0, 0)
    });
    yPosition -= LINE_HEIGHT;

    currentPage.drawText(`Email: ${data.attorney.email}`, {
      x: MARGIN,
      y: yPosition,
      size: FONT_SIZE,
      font: timesRoman,
      color: rgb(0, 0, 0)
    });
    yPosition -= LINE_HEIGHT;

    currentPage.drawText(`Bar Number: ${data.attorney.barNumber}${data.attorney.eoirId ? '  EOIR ID: ' + data.attorney.eoirId : ''}`, {
      x: MARGIN,
      y: yPosition,
      size: FONT_SIZE,
      font: timesRoman,
      color: rgb(0, 0, 0)
    });
    yPosition -= LINE_HEIGHT;

    currentPage.drawText('Attorney for Respondent', {
      x: MARGIN,
      y: yPosition,
      size: FONT_SIZE,
      font: timesRoman,
      color: rgb(0, 0, 0)
    });
    yPosition -= LINE_HEIGHT * 2;
  }

  currentPage.drawText(`Date: ${formatDateMMDDYYYY(Date.now())}`, {
    x: MARGIN,
    y: yPosition,
    size: FONT_SIZE,
    font: timesRoman,
    color: rgb(0, 0, 0)
  });

  // Generate PDF bytes
  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
};

/**
 * Generate Certificate of Service PDF page
 */
export const generateCertificateOfServicePDF = async (data: MotionToDismissData): Promise<Blob> => {
  const pdfDoc = await PDFDocument.create();
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const contentWidth = PAGE_WIDTH - (2 * MARGIN);
  let yPosition = PAGE_HEIGHT - MARGIN;

  // Title
  const titleWidth = timesRomanBold.widthOfTextAtSize('CERTIFICATE OF SERVICE', HEADER_FONT_SIZE);
  page.drawText('CERTIFICATE OF SERVICE', {
    x: (PAGE_WIDTH - titleWidth) / 2,
    y: yPosition,
    size: HEADER_FONT_SIZE,
    font: timesRomanBold,
    color: rgb(0, 0, 0)
  });
  yPosition -= LINE_HEIGHT * 3;

  // Service statement
  const serviceMethodText = {
    'mail': 'by depositing a true and correct copy in the United States Mail, first-class postage prepaid',
    'hand_delivery': 'by hand delivery',
    'electronic': 'by electronic service through the EOIR Courts & Appeals System (ECAS)'
  };

  const motionTitle = data.motionType === 'dismiss' ? 'MOTION TO DISMISS' :
    data.motionType === 'terminate' ? 'MOTION TO TERMINATE' : 'MOTION FOR ADMINISTRATIVE CLOSURE';

  const certText = `     I hereby certify that on ${formatDateMMDDYYYY(data.certificateOfService.serviceDate)}, I served a true and correct copy of the foregoing ${motionTitle} and all attachments ${serviceMethodText[data.certificateOfService.serviceMethod]}, addressed to:`;

  yPosition = addWrappedText(
    page,
    certText,
    MARGIN,
    yPosition,
    timesRoman,
    FONT_SIZE,
    contentWidth,
    LINE_HEIGHT
  );
  yPosition -= LINE_HEIGHT * 2;

  // Served parties
  for (const party of data.certificateOfService.servedParties) {
    page.drawText(`     ${party}`, {
      x: MARGIN,
      y: yPosition,
      size: FONT_SIZE,
      font: timesRoman,
      color: rgb(0, 0, 0)
    });
    yPosition -= LINE_HEIGHT;
  }

  // DHS Office address
  page.drawText(`     ${data.certificateOfService.dhsOfficeName || 'DHS/ICE Office of Chief Counsel'}`, {
    x: MARGIN,
    y: yPosition,
    size: FONT_SIZE,
    font: timesRoman,
    color: rgb(0, 0, 0)
  });
  yPosition -= LINE_HEIGHT;

  page.drawText(`     ${data.certificateOfService.dhsOfficeAddress.street}`, {
    x: MARGIN,
    y: yPosition,
    size: FONT_SIZE,
    font: timesRoman,
    color: rgb(0, 0, 0)
  });
  yPosition -= LINE_HEIGHT;

  page.drawText(`     ${data.certificateOfService.dhsOfficeAddress.city}, ${data.certificateOfService.dhsOfficeAddress.state} ${data.certificateOfService.dhsOfficeAddress.zipCode}`, {
    x: MARGIN,
    y: yPosition,
    size: FONT_SIZE,
    font: timesRoman,
    color: rgb(0, 0, 0)
  });
  yPosition -= LINE_HEIGHT * 4;

  // Signature
  page.drawText('_______________________________', {
    x: MARGIN,
    y: yPosition,
    size: FONT_SIZE,
    font: timesRoman,
    color: rgb(0, 0, 0)
  });
  yPosition -= LINE_HEIGHT;

  const isProSeCert = data.isProSe !== false;

  if (isProSeCert) {
    page.drawText(`${data.respondent.firstName} ${data.respondent.lastName}`, {
      x: MARGIN,
      y: yPosition,
      size: FONT_SIZE,
      font: timesRomanBold,
      color: rgb(0, 0, 0)
    });
    yPosition -= LINE_HEIGHT;

    page.drawText('Pro Se Respondent', {
      x: MARGIN,
      y: yPosition,
      size: FONT_SIZE,
      font: timesRoman,
      color: rgb(0, 0, 0)
    });
    yPosition -= LINE_HEIGHT * 2;
  } else if (data.attorney) {
    page.drawText(data.attorney.name, {
      x: MARGIN,
      y: yPosition,
      size: FONT_SIZE,
      font: timesRomanBold,
      color: rgb(0, 0, 0)
    });
    yPosition -= LINE_HEIGHT;

    page.drawText('Attorney for Respondent', {
      x: MARGIN,
      y: yPosition,
      size: FONT_SIZE,
      font: timesRoman,
      color: rgb(0, 0, 0)
    });
    yPosition -= LINE_HEIGHT * 2;
  }

  page.drawText(`Date: ${formatDateMMDDYYYY(data.certificateOfService.serviceDate)}`, {
    x: MARGIN,
    y: yPosition,
    size: FONT_SIZE,
    font: timesRoman,
    color: rgb(0, 0, 0)
  });

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
};

/**
 * Generate Proposed Order PDF
 */
export const generateProposedOrderPDF = async (data: MotionToDismissData): Promise<Blob> => {
  const pdfDoc = await PDFDocument.create();
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let yPosition = PAGE_HEIGHT - MARGIN;

  const drawCenteredText = (text: string, y: number, font: PDFFont, size: number): void => {
    const textWidth = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: (PAGE_WIDTH - textWidth) / 2,
      y,
      size,
      font,
      color: rgb(0, 0, 0)
    });
  };

  // Header
  drawCenteredText('UNITED STATES DEPARTMENT OF JUSTICE', yPosition, timesRomanBold, HEADER_FONT_SIZE);
  yPosition -= LINE_HEIGHT + 2;
  drawCenteredText('EXECUTIVE OFFICE FOR IMMIGRATION REVIEW', yPosition, timesRomanBold, HEADER_FONT_SIZE);
  yPosition -= LINE_HEIGHT + 2;
  drawCenteredText('IMMIGRATION COURT', yPosition, timesRomanBold, HEADER_FONT_SIZE);
  yPosition -= LINE_HEIGHT + 2;
  drawCenteredText(data.courtLocation.toUpperCase(), yPosition, timesRoman, FONT_SIZE);
  yPosition -= LINE_HEIGHT * 2;

  // Case caption
  const respondentName = `${data.respondent.firstName}${data.respondent.middleName ? ' ' + data.respondent.middleName : ''} ${data.respondent.lastName}`.toUpperCase();
  const aNumber = formatANumber(data.aNumber);

  const captionLines = [
    ['In the Matter of:', ')'],
    ['', ')'],
    [respondentName, ')    A# ' + aNumber],
    ['', ')'],
    ['     Respondent', ')    In Removal Proceedings']
  ];

  captionLines.forEach(([left, right], i) => {
    page.drawText(left, {
      x: MARGIN,
      y: yPosition - (i * LINE_HEIGHT),
      size: FONT_SIZE,
      font: left === respondentName ? timesRomanBold : timesRoman,
      color: rgb(0, 0, 0)
    });
    page.drawText(right, {
      x: MARGIN + 250,
      y: yPosition - (i * LINE_HEIGHT),
      size: FONT_SIZE,
      font: timesRoman,
      color: rgb(0, 0, 0)
    });
  });

  yPosition -= (captionLines.length + 2) * LINE_HEIGHT;

  // Title
  drawCenteredText('PROPOSED ORDER', yPosition, timesRomanBold, HEADER_FONT_SIZE);
  yPosition -= LINE_HEIGHT * 3;

  // Order text
  const orderActionText = {
    'dismiss': 'DISMISSED',
    'terminate': 'TERMINATED',
    'administrative_closure': 'ADMINISTRATIVELY CLOSED'
  };

  const basisText = {
    'caa': 'Respondent has established eligibility for adjustment of status under the Cuban Adjustment Act',
    'already_lpr': 'Respondent has established that they are a Lawful Permanent Resident',
    'other': data.otherBasisDescription || 'good cause shown'
  };

  const motionTitle = data.motionType === 'dismiss' ? 'Motion to Dismiss' :
    data.motionType === 'terminate' ? 'Motion to Terminate' : 'Motion for Administrative Closure';

  const orderText = `     Upon consideration of Respondent's ${motionTitle}, and the Court finding that ${basisText[data.basis]},`;

  yPosition = addWrappedText(
    page,
    orderText,
    MARGIN,
    yPosition,
    timesRoman,
    FONT_SIZE,
    PAGE_WIDTH - (2 * MARGIN),
    LINE_HEIGHT
  );
  yPosition -= LINE_HEIGHT * 2;

  const orderCommand = `     IT IS HEREBY ORDERED that the removal proceedings in the above-captioned matter are ${orderActionText[data.motionType]}.`;

  yPosition = addWrappedText(
    page,
    orderCommand,
    MARGIN,
    yPosition,
    timesRomanBold,
    FONT_SIZE,
    PAGE_WIDTH - (2 * MARGIN),
    LINE_HEIGHT
  );
  yPosition -= LINE_HEIGHT * 4;

  // Signature lines
  page.drawText('_______________________________          _______________', {
    x: MARGIN,
    y: yPosition,
    size: FONT_SIZE,
    font: timesRoman,
    color: rgb(0, 0, 0)
  });
  yPosition -= LINE_HEIGHT;

  page.drawText('Immigration Judge                        Date', {
    x: MARGIN,
    y: yPosition,
    size: FONT_SIZE,
    font: timesRoman,
    color: rgb(0, 0, 0)
  });
  yPosition -= LINE_HEIGHT;

  if (data.judgeName) {
    page.drawText(data.judgeName, {
      x: MARGIN,
      y: yPosition,
      size: FONT_SIZE,
      font: timesRoman,
      color: rgb(0, 0, 0)
    });
    yPosition -= LINE_HEIGHT;
  }

  page.drawText(data.courtLocation, {
    x: MARGIN,
    y: yPosition,
    size: FONT_SIZE,
    font: timesRoman,
    color: rgb(0, 0, 0)
  });

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
};

/**
 * Generate complete motion package (Motion + Certificate + Proposed Order)
 */
export const generateCompleteMotionPackagePDF = async (data: MotionToDismissData): Promise<Blob> => {
  // Generate individual documents
  const motionBlob = await generateMotionPDF(data);
  const certBlob = await generateCertificateOfServicePDF(data);
  const orderBlob = await generateProposedOrderPDF(data);

  // Merge PDFs
  const mergedPdf = await PDFDocument.create();

  const motionDoc = await PDFDocument.load(await motionBlob.arrayBuffer());
  const certDoc = await PDFDocument.load(await certBlob.arrayBuffer());
  const orderDoc = await PDFDocument.load(await orderBlob.arrayBuffer());

  const motionPages = await mergedPdf.copyPages(motionDoc, motionDoc.getPageIndices());
  const certPages = await mergedPdf.copyPages(certDoc, certDoc.getPageIndices());
  const orderPages = await mergedPdf.copyPages(orderDoc, orderDoc.getPageIndices());

  motionPages.forEach(page => mergedPdf.addPage(page));
  certPages.forEach(page => mergedPdf.addPage(page));
  orderPages.forEach(page => mergedPdf.addPage(page));

  const pdfBytes = await mergedPdf.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
};

/**
 * Generate text version of the motion (for Word-like export)
 */
export const generateMotionTextDocument = (data: MotionToDismissData): string => {
  return `${generateMotionText(data)}

${'─'.repeat(60)}

${generateCertificateOfService(data)}

${'─'.repeat(60)}

${generateProposedOrder(data)}`;
};

/**
 * Download helper
 */
export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Download motion as PDF
 */
export const downloadMotionPDF = async (data: MotionToDismissData): Promise<void> => {
  const blob = await generateCompleteMotionPackagePDF(data);
  const respondentName = `${data.respondent.lastName}_${data.respondent.firstName}`.replace(/\s/g, '_');
  downloadBlob(blob, `Motion_to_Dismiss_${respondentName}_${formatANumber(data.aNumber)}.pdf`);
};

/**
 * Download motion as text (for Word import)
 */
export const downloadMotionText = (data: MotionToDismissData): void => {
  const text = generateMotionTextDocument(data);
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const respondentName = `${data.respondent.lastName}_${data.respondent.firstName}`.replace(/\s/g, '_');
  downloadBlob(blob, `Motion_to_Dismiss_${respondentName}_${formatANumber(data.aNumber)}.txt`);
};
