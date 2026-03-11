/**
 * Engagement Letter PDF Generator
 * Generates a PDF of the signed engagement letter with signature image
 */

import jsPDF from 'jspdf';
import type { TaxPortal, TaxDocumentRequest } from '../types/drakeTypes';
import { getCheckmarkCirclePng } from '../../../utils/svgToPng';
import { devLog } from '../../../services/utils';

interface EngagementLetterData {
  client: TaxPortal;
  request: TaxDocumentRequest;
  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
  logo?: string; // Base64 encoded logo image (PNG, JPG)
  baseUrl?: string; // Base URL for validation link (defaults to window.location.origin)
}

/**
 * Generate a PDF of the signed engagement letter
 */
export const generateEngagementLetterPDF = async (data: EngagementLetterData): Promise<void> => {
  const { client, request, businessName = 'Stephanie Solution', businessAddress, businessPhone, logo, baseUrl } = data;
  const signature = request.clientSignature;

  // Generate validation URL
  const validationBaseUrl = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://app.example.com');
  const validationUrl = `${validationBaseUrl}/#/signature-validation/${request.id}/${request.accessToken}/engagement`;

  if (!signature || !signature.signedAt) {
    throw new Error('No signature found on this engagement letter');
  }

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter' // 8.5 x 11 inches
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (2 * margin);
  let yPosition = margin;

  // Helper function for wrapped text
  const addWrappedText = (text: string, y: number, fontSize: number = 11, align: 'left' | 'center' | 'right' = 'left'): number => {
    pdf.setFontSize(fontSize);
    const lines = pdf.splitTextToSize(text, contentWidth);

    if (align === 'center') {
      lines.forEach((line: string) => {
        pdf.text(line, pageWidth / 2, y, { align: 'center' });
        y += fontSize * 0.4;
      });
    } else if (align === 'right') {
      lines.forEach((line: string) => {
        pdf.text(line, pageWidth - margin, y, { align: 'right' });
        y += fontSize * 0.4;
      });
    } else {
      pdf.text(lines, margin, y);
      y += lines.length * (fontSize * 0.4);
    }

    return y;
  };

  // Generate checkmark icon PNG (green circle with checkmark)
  const checkmarkPng = await getCheckmarkCirclePng('#22c55e', 48);

  // Helper function to add header with logo
  const addHeader = () => {
    let headerY = yPosition;

    // Add logo if provided
    if (logo) {
      try {
        const logoWidth = 20; // mm
        const logoHeight = 20; // mm
        const logoX = margin;
        pdf.addImage(logo, 'PNG', logoX, headerY - 5, logoWidth, logoHeight);

        // Business name next to logo
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(18);
        pdf.setTextColor(30, 58, 95);
        pdf.text(businessName, logoX + logoWidth + 5, headerY + 5);

        // Business contact info below name
        if (businessAddress || businessPhone) {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(10);
          pdf.setTextColor(100, 100, 100);
          let contactY = headerY + 10;
          if (businessAddress) {
            pdf.text(businessAddress, logoX + logoWidth + 5, contactY);
            contactY += 4;
          }
          if (businessPhone) {
            pdf.text(businessPhone, logoX + logoWidth + 5, contactY);
          }
        }
        headerY += logoHeight + 5;
      } catch (error) {
        devLog('Error adding logo:', error);
        // Fallback to centered text without logo
        addCenteredHeader();
        return;
      }
    } else {
      addCenteredHeader();
      return;
    }

    yPosition = headerY;
  };

  // Fallback centered header without logo
  const addCenteredHeader = () => {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.setTextColor(30, 58, 95);
    pdf.text(businessName, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 8;

    if (businessAddress || businessPhone) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      if (businessAddress) {
        pdf.text(businessAddress, pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 5;
      }
      if (businessPhone) {
        pdf.text(businessPhone, pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 5;
      }
    }
  };

  // Render header
  addHeader();
  yPosition += 5;

  // Line separator
  pdf.setDrawColor(30, 58, 95);
  pdf.setLineWidth(0.5);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // Title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.setTextColor(0, 0, 0);
  pdf.text('TAX PREPARATION ENGAGEMENT LETTER', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  // Tax Year
  pdf.setFontSize(12);
  pdf.text(`Tax Year: ${request.taxYear}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  // Client Information Section
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text('CLIENT INFORMATION', margin, yPosition);
  yPosition += 7;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);

  const clientName = `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'N/A';
  pdf.text(`Name: ${clientName}`, margin, yPosition);
  yPosition += 6;

  if (client.address) {
    pdf.text(`Address: ${client.address}`, margin, yPosition);
    yPosition += 6;
  }

  if (client.city || client.state || client.zipCode) {
    const cityStateZip = `${client.city || ''}, ${client.state || ''} ${client.zipCode || ''}`.trim();
    pdf.text(`         ${cityStateZip}`, margin, yPosition);
    yPosition += 6;
  }

  if (client.email) {
    pdf.text(`Email: ${client.email}`, margin, yPosition);
    yPosition += 6;
  }

  if (client.phone) {
    pdf.text(`Phone: ${client.phone}`, margin, yPosition);
    yPosition += 6;
  }

  yPosition += 10;

  // Agreement Section
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text('AGREEMENT TERMS', margin, yPosition);
  yPosition += 8;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);

  const agreementText = `This letter confirms and specifies the terms of our engagement to prepare your ${request.taxYear} individual income tax returns.

SCOPE OF SERVICES:
We will prepare your federal and applicable state income tax returns for the tax year ${request.taxYear} based on the information you provide to us. We will not audit or otherwise verify the data you submit, although we may ask for clarification of some information.

CLIENT RESPONSIBILITIES:
You are responsible for providing all information required for the preparation of complete and accurate returns. You should retain all documents, canceled checks, and other data that form the basis of income and deductions.

FEES:
Our fee for these services will be based on the complexity of the return and the time required to prepare it. We will discuss our fee structure with you before beginning work.

CONFIDENTIALITY:
We will maintain the confidentiality of your information in accordance with professional standards and applicable law.

By signing below, you acknowledge that you have read, understand, and agree to the terms of this engagement letter.`;

  yPosition = addWrappedText(agreementText, yPosition, 10);
  yPosition += 15;

  // Signature Section
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.3);
  //pdf.rect(margin, yPosition, contentWidth, .21);
  yPosition += 5;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(30, 58, 95);
  pdf.text('CLIENT SIGNATURE', margin + 5, yPosition);
  yPosition += 8;

   pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.18);
  pdf.setTextColor(128, 128, 128);
  pdf.text(`Document generated on ${new Date().toLocaleString()}`, pageWidth / 1.35, pageHeight - 12.5, { align: 'center' });
  pdf.text(`Reference: ${request.id || 'N/A'}`, pageWidth / 1.35,pageHeight - 10, { align: 'center' });

  pdf.setFontSize(9);
  pdf.setTextColor(34, 197, 94); // Green
  const checkXEn = pageWidth / 1.50 - 5;
  const checkYEn = yPosition + 13.5;
  // Add checkmark PNG icon
  pdf.addImage(checkmarkPng, 'PNG', checkXEn, checkYEn, 5, 5);
  pdf.text('Terms and conditions accepted', checkXEn + 6, yPosition + 17);



  // Signature Validation Section
  yPosition += 5;
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(139, 92, 246);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(margin+58, yPosition-1, 41, 12, 2, 2, 'FD');

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(100, 100, 100);
  pdf.text('Verify this signature online:', margin + 60, yPosition-1 + 5);


  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(139, 92, 246);
  pdf.textWithLink('SIGNATURE VERIFICATION', margin + 60, yPosition-1 + 9, { url: validationUrl });

  
  



  // Add signature image if available
  if (signature.signatureImage) {
    try {
      // The signature image is base64 encoded
      const imgData = signature.signatureImage;
      // Add signature image (width: 60mm, height: auto-calculated to maintain aspect ratio)
      pdf.addImage(imgData, 'PNG', margin + 5, yPosition-5, 60, 20);
      yPosition += 20;
    } catch (error) {
      devLog('Error adding signature image:', error);
      // Fallback: draw a line for signature
      pdf.setDrawColor(0, 0, 0);
      pdf.line(margin + 5, yPosition + 15, margin + 70, yPosition + 15);
      yPosition += 20;
    }
  } else {
    // No image, just show the name
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(14);
    pdf.setTextColor(0, 0, 0);
    pdf.text(signature.name, margin + 5, yPosition + 10);
    yPosition += 15;
  }

  // Signature details
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(0, 0, 0);

  
  pdf.text(`Signed by: ${signature.name}`, margin + 3, yPosition);
  yPosition += 5;

  pdf.setTextColor(128, 128, 128);
  pdf.setFontSize(7.5);
  pdf.text(`Date: ${signature.date}`, margin + 5, yPosition);
  yPosition += 5;

  const signedAtDate = new Date(signature.signedAt);
  pdf.text(`Signed at: ${signedAtDate.toLocaleString()}`, margin + 5, yPosition-2);
  yPosition += 5;



  // Footer
  const footerY = pageHeight - 15;
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.3);
  pdf.line(margin, footerY - 5, pageWidth - margin, footerY - 5);












  
  // ============================================
  // PAGE 2 - SPANISH VERSION
  // ============================================
  pdf.addPage();
  yPosition = margin;

  // Render header (same as English page, with logo if provided)
  addHeader();
  yPosition += 5;

  // Line separator
  pdf.setDrawColor(30, 58, 95);
  pdf.setLineWidth(0.5);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // Title (Spanish)
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.setTextColor(0, 0, 0);
  pdf.text('CARTA DE COMPROMISO PARA PREPARACION DE IMPUESTOS', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  // Tax Year (Spanish)
  pdf.setFontSize(12);
  pdf.text(`Ano Fiscal: ${request.taxYear}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  // Client Information Section (Spanish)
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text('INFORMACION DEL CLIENTE', margin, yPosition);
  yPosition += 7;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);

  pdf.text(`Nombre: ${clientName}`, margin, yPosition);
  yPosition += 6;

  if (client.address) {
    pdf.text(`Direccion: ${client.address}`, margin, yPosition);
    yPosition += 6;
  }

  if (client.city || client.state || client.zipCode) {
    const cityStateZip = `${client.city || ''}, ${client.state || ''} ${client.zipCode || ''}`.trim();
    pdf.text(`              ${cityStateZip}`, margin, yPosition);
    yPosition += 6;
  }

  if (client.email) {
    pdf.text(`Correo: ${client.email}`, margin, yPosition);
    yPosition += 6;
  }

  if (client.phone) {
    pdf.text(`Telefono: ${client.phone}`, margin, yPosition);
    yPosition += 6;
  }

  yPosition += 10;

  // Agreement Section (Spanish)
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text('TERMINOS DEL ACUERDO', margin, yPosition);
  yPosition += 8;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);

  const agreementTextSpanish = `Esta carta confirma y especifica los terminos de nuestro compromiso para preparar sus declaraciones de impuestos sobre la renta individual del ano ${request.taxYear}.

ALCANCE DE LOS SERVICIOS:
Prepararemos sus declaraciones de impuestos federales y estatales aplicables para el ano fiscal ${request.taxYear} basandonos en la informacion que usted nos proporcione. No auditaremos ni verificaremos de otra manera los datos que nos envie, aunque podemos solicitar aclaraciones sobre alguna informacion.

RESPONSABILIDADES DEL CLIENTE:
Usted es responsable de proporcionar toda la informacion requerida para la preparacion de declaraciones completas y precisas. Debe conservar todos los documentos, cheques cancelados y otros datos que constituyan la base de los ingresos y deducciones.

HONORARIOS:
Nuestros honorarios por estos servicios se basaran en la complejidad de la declaracion y el tiempo requerido para prepararla. Discutiremos nuestra estructura de honorarios con usted antes de comenzar el trabajo.

CONFIDENCIALIDAD:
Mantendremos la confidencialidad de su informacion de acuerdo con los estandares profesionales y la ley aplicable.

Al firmar a continuacion, usted reconoce que ha leido, entendido y acepta los terminos de esta carta de compromiso.`;

  yPosition = addWrappedText(agreementTextSpanish, yPosition, 10);
  yPosition += 15;

  // Signature Section (Spanish)
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.3);
  //pdf.rect(margin, yPosition, contentWidth, .21);
  yPosition += 5;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(30, 58, 95);
  pdf.text('FIRMA DEL CLIENTE', margin + 5, yPosition);
  yPosition += 8;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.18);
  pdf.setTextColor(128, 128, 128);
  pdf.text(`Documento generado el ${new Date().toLocaleString()}`, pageWidth / 1.35, pageHeight - 12.5, { align: 'center' });
  pdf.text(`Referencia: ${request.id || 'N/A'}`, pageWidth / 1.35, pageHeight - 10, { align: 'center' });

  pdf.setFontSize(9);
  pdf.setTextColor(34, 197, 94); // Green
  const checkXEs = pageWidth / 1.50 - 5;
  const checkYEs = yPosition + 10.5;
  // Add checkmark PNG icon
  pdf.addImage(checkmarkPng, 'PNG', checkXEs, checkYEs, 5, 5);
  pdf.text('Terminos y condiciones aceptados', checkXEs + 6, yPosition + 14);



  // Signature Validation Section
  
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(139, 92, 246);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(margin+58, yPosition-1, 41, 12, 2, 2, 'FD');

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(100, 100, 100);
  pdf.text('Verify this signature online:', margin + 60, yPosition-1 + 5);


  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(139, 92, 246);
  pdf.textWithLink('SIGNATURE VERIFICATION', margin + 60, yPosition-1 + 9, { url: validationUrl });

  
  // Add signature image if available (Spanish page)
  if (signature.signatureImage) {
    try {
      const imgData = signature.signatureImage;
      pdf.addImage(imgData, 'PNG', margin + 5, yPosition - 5, 60, 20);
      yPosition += 20;
    } catch (error) {
      devLog('Error adding signature image:', error);
      pdf.setDrawColor(0, 0, 0);
      pdf.line(margin + 5, yPosition + 15, margin + 70, yPosition + 15);
      yPosition += 20;
    }
  } else {
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(14);
    pdf.setTextColor(0, 0, 0);
    pdf.text(signature.name, margin + 5, yPosition + 10);
    yPosition += 15;
  }

  // Signature details (Spanish)
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(0, 0, 0);

  pdf.text(`Firmado por: ${signature.name}`, margin + 3, yPosition);
  yPosition += 5;

  pdf.setTextColor(128, 128, 128);
  pdf.setFontSize(7.5);
  pdf.text(`Fecha: ${signature.date}`, margin + 5, yPosition);
  yPosition += 5;

  pdf.text(`Firmado el: ${signedAtDate.toLocaleString()}`, margin + 5, yPosition - 2);
  yPosition += 5;

  // Footer (Spanish page)
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.3);
  pdf.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

  // Save the PDF
  const fileName = `Engagement_Letter_${clientName.replace(/\s+/g, '_')}_${request.taxYear}.pdf`;
  pdf.save(fileName);
};

/**
 * Check if engagement letter is signed
 */
export const isEngagementLetterSigned = (request: TaxDocumentRequest | null | undefined): boolean => {
  return !!request?.clientSignature?.signedAt;
};

/**
 * Get signature info for display
 */
export const getSignatureInfo = (request: TaxDocumentRequest | null | undefined) => {
  if (!request?.clientSignature) return null;

  return {
    name: request.clientSignature.name,
    date: request.clientSignature.date,
    signedAt: new Date(request.clientSignature.signedAt).toLocaleString(),
    hasImage: !!request.clientSignature.signatureImage,
  };
};



