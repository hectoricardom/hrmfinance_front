import { PassportRequest } from '../types';
import { devLog } from '../../../services/utils';

// Note: This requires jsPDF library to be installed
// npm install jspdf @types/jspdf

declare const jsPDF: any; // Will be loaded dynamically

/**
 * Load jsPDF library dynamically
 */
const loadJsPDF = async () => {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && (window as any).jspdf) {
      resolve((window as any).jspdf.jsPDF);
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = () => {
      resolve((window as any).jspdf.jsPDF);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

/**
 * Generate passport request PDF
 */
export const generatePassportPDF = async (data: PassportRequest): Promise<Blob> => {
  // Load jsPDF
  const jsPDFConstructor = await loadJsPDF();
  const doc = new jsPDFConstructor();
  
  // Page settings
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const lineHeight = 7;
  let yPosition = margin;
  
  // Helper functions
  const addText = (text: string, x: number = margin, y: number = yPosition, options: any = {}) => {
    doc.text(text, x, y, options);
    yPosition = y + lineHeight;
  };
  
  const addSection = (title: string) => {
    yPosition += 5;
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    addText(title);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(11);
    yPosition += 2;
  };
  
  const addField = (label: string, value: string, x: number = margin + 10) => {
    doc.setFont(undefined, 'bold');
    doc.text(`${label}:`, x, yPosition);
    doc.setFont(undefined, 'normal');
    doc.text(value || 'N/A', x + 50, yPosition);
    yPosition += lineHeight;
  };
  
  const checkPageBreak = (requiredSpace: number = 30) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
    }
  };
  
  // Title
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.text('PASSPORT REQUEST FORM', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;
  
  // Document type
  doc.setFontSize(14);
  doc.text(getDocumentTypeLabel(data.documentType), pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;
  
  // Reset font
  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  
  // Personal Information Section
  addSection('PERSONAL INFORMATION');
  addField('First Name', data.firstName);
  addField('Middle Name', data.middleName || 'N/A');
  addField('Last Name', data.lastName);
  addField('Date of Birth', formatDate(data.dateOfBirth));
  addField('Place of Birth', data.placeOfBirth);
  addField('Nationality', data.nationality);
  addField('Gender', getGenderLabel(data.gender));
  
  checkPageBreak();
  
  // Contact Information Section
  addSection('CONTACT INFORMATION');
  addField('Street Address', data.address.street);
  addField('City', data.address.city);
  addField('State/Province', data.address.state);
  addField('ZIP/Postal Code', data.address.zipCode);
  addField('Country', data.address.country);
  addField('Phone Number', data.phone);
  addField('Email Address', data.email);
  
  checkPageBreak();
  
  // Previous Passport (if renewal/replacement)
  if (data.documentType !== 'passport' && data.previousPassport) {
    addSection('PREVIOUS PASSPORT INFORMATION');
    addField('Passport Number', data.previousPassport.number);
    addField('Issue Date', formatDate(data.previousPassport.issueDate));
    addField('Expiry Date', formatDate(data.previousPassport.expiryDate));
  }
  
  checkPageBreak();
  
  // Emergency Contact Section
  addSection('EMERGENCY CONTACT');
  addField('Contact Name', data.emergencyContact.name);
  addField('Relationship', data.emergencyContact.relationship);
  addField('Phone Number', data.emergencyContact.phone);
  
  checkPageBreak(80);
  
  // Signature Section
  addSection('APPLICANT SIGNATURE');
  
  // Add signature image if available
  if (data.signatureDataUrl) {
    try {
      // Draw signature box
      const sigBoxX = margin + 10;
      const sigBoxY = yPosition;
      const sigBoxWidth = 120;
      const sigBoxHeight = 40;
      
      // Draw border
      doc.setDrawColor(0);
      doc.setLineWidth(0.5);
      doc.rect(sigBoxX, sigBoxY, sigBoxWidth, sigBoxHeight);
      
      // Add signature image
      doc.addImage(
        data.signatureDataUrl,
        'PNG',
        sigBoxX + 5,
        sigBoxY + 5,
        sigBoxWidth - 10,
        sigBoxHeight - 10,
        undefined,
        'FAST'
      );
      
      // Add signature line and date
      yPosition = sigBoxY + sigBoxHeight + 10;
      doc.line(sigBoxX, yPosition, sigBoxX + sigBoxWidth, yPosition);
      doc.setFontSize(9);
      doc.text('Applicant Signature', sigBoxX + sigBoxWidth / 2, yPosition + 4, { align: 'center' });
      
      // Add date
      const dateX = sigBoxX + sigBoxWidth + 20;
      doc.line(dateX, yPosition, dateX + 80, yPosition);
      doc.text('Date', dateX + 40, yPosition + 4, { align: 'center' });
      doc.text(formatDate(new Date().toISOString()), dateX + 40, yPosition - 5, { align: 'center' });
      
      yPosition += 20;
    } catch (error) {
      devLog('Error adding signature to PDF:', error);
      addField('Signature', '[Signature on file]');
    }
  }
  
  checkPageBreak();
  
  // Declaration
  yPosition += 10;
  addSection('DECLARATION');
  doc.setFontSize(10);
  const declarationText = 
    'I declare that the information provided in this application is true and correct to the best of my knowledge. ' +
    'I understand that providing false information may result in the rejection of my application and legal consequences.';
  
  const lines = doc.splitTextToSize(declarationText, pageWidth - margin * 2);
  lines.forEach((line: string) => {
    doc.text(line, margin, yPosition);
    yPosition += 6;
  });
  
  // Footer
  yPosition = pageHeight - 20;
  doc.setFontSize(8);
  doc.setTextColor(128);
  doc.text(
    `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
    pageWidth / 2,
    yPosition,
    { align: 'center' }
  );
  
  // Add page numbers
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }
  
  // Return as blob
  return doc.output('blob');
};

/**
 * Generate passport request with template
 */
export const generatePassportPDFFromTemplate = async (
  data: PassportRequest,
  templatePdfUrl: string
): Promise<Blob> => {
  try {
    // Load jsPDF
    const jsPDFConstructor = await loadJsPDF();
    
    // Load existing PDF template
    const response = await fetch(templatePdfUrl);
    const arrayBuffer = await response.arrayBuffer();
    
    // Create new PDF from template
    const doc = new jsPDFConstructor();
    
    // Note: To properly load and modify an existing PDF template,
    // you would need additional libraries like pdf-lib
    // For now, we'll use the basic generation method
    
    return generatePassportPDF(data);
  } catch (error) {
    devLog('Error loading template:', error);
    // Fallback to regular generation
    return generatePassportPDF(data);
  }
};

// Helper functions
const formatDate = (dateString: string): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const getDocumentTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    passport: 'NEW PASSPORT APPLICATION',
    renewal: 'PASSPORT RENEWAL APPLICATION',
    replacement: 'PASSPORT REPLACEMENT APPLICATION'
  };
  return labels[type] || 'PASSPORT APPLICATION';
};

const getGenderLabel = (gender: string): string => {
  const labels: Record<string, string> = {
    M: 'Male',
    F: 'Female',
    X: 'Other/Non-binary'
  };
  return labels[gender] || gender;
};