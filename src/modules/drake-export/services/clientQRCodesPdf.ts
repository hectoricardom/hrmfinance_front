/**
 * Client QR Codes PDF Generator
 * Generates a printable HTML document with all QR codes for Drake Tax import
 */

import QRCode from 'qrcode';
import type { TaxPortal, DrakeTaxDocument, TaxDependent } from '../types/drakeTypes';
import { formatDateMMDDYYYY, ssnForQR } from '../../../services/utils';

type Language = 'en' | 'es';

interface QRCodeData {
  label: string;
  sublabel?: string;
  dataUrl: string;
  section: 'taxpayer' | 'spouse' | 'dependent' | 'id' | 'bank' | 'document';
  documentGroup?: string; // e.g., "W-2 | ABC Company" to group document QRs together
}

const TRANSLATIONS = {
  en: {
    title: 'QR Codes for Drake Tax Import',
    subtitle: 'Tax Return',
    taxpayerSection: 'Taxpayer Information',
    spouseSection: 'Spouse Information',
    dependentsSection: 'Dependents',
    idSection: 'ID Information',
    bankSection: 'Bank Account',
    documentsSection: 'Tax Documents',
    generatedOn: 'Generated on',
    summary: 'Summary',
    taxpayer: 'taxpayer',
    spouse: 'spouse',
    dependents: 'dependent(s)',
    documents: 'document(s)',
    scanInstructions: 'Scan these QR codes with Drake Tax software to auto-fill client information.',
    noQRCodes: 'No QR codes available',
    taxpayerInit: 'Taxpayer Init',
    taxpayerFullName: 'Full Name',
    taxpayerInfo: 'Taxpayer Info',
    taxpayerAddress: 'Address',
    spouseInfo: 'Spouse Info',
    dependent: 'Dependent',
    idInfo: 'ID Info',
    bankInfo: 'Bank Info',
  },
  es: {
    title: 'Códigos QR para Importación Drake Tax',
    subtitle: 'Declaración de Impuestos',
    taxpayerSection: 'Información del Contribuyente',
    spouseSection: 'Información del Cónyuge',
    dependentsSection: 'Dependientes',
    idSection: 'Información de Identificación',
    bankSection: 'Cuenta Bancaria',
    documentsSection: 'Documentos Fiscales',
    generatedOn: 'Generado el',
    summary: 'Resumen',
    taxpayer: 'contribuyente',
    spouse: 'cónyuge',
    dependents: 'dependiente(s)',
    documents: 'documento(s)',
    scanInstructions: 'Escanee estos códigos QR con el software Drake Tax para completar automáticamente la información del cliente.',
    noQRCodes: 'No hay códigos QR disponibles',
    taxpayerInit: 'Inicio Contribuyente',
    taxpayerFullName: 'Nombre Completo',
    taxpayerInfo: 'Info Contribuyente',
    taxpayerAddress: 'Dirección',
    spouseInfo: 'Info Cónyuge',
    dependent: 'Dependiente',
    idInfo: 'Info ID',
    bankInfo: 'Info Banco',
  }
};

// Convert | to tab character for QR encoding
const convertToTabular = (text: string): string => {
  return text.replace(/\|/g, '\t').toUpperCase();
};

// Generate taxpayer init QR text
const getTaxpayerInitQRText = (client: TaxPortal): string => {
  const text = [
    ssnForQR(client.ssn || ""), '|',
    ssnForQR(client.ssn || ""), '|',
    client.firstName, '|',
    client.lastName,
  ].join('');
  return convertToTabular(text);
};

// Generate full name QR text
const getTaxpayerFullNameQRText = (client: TaxPortal): string => {
  const textA = [
    (client.firstName + (client.middleName ? " " + client?.middleName?.[0] + " " : ' ') + client.lastName) || '',
    '|',
    formatDateMMDDYYYY(new Date().getTime()) || "", '|',  '|', 
  ]

  if(client.filingStatus === 'married_filing_jointly' && client.spouse?.firstName){
    textA.push((client.spouse?.firstName + (client.spouse?.middleName ? " " + client.spouse?.middleName?.[0] + " " : ' ') + client.spouse?.lastName) || '')
    textA.push('|');
    textA.push(formatDateMMDDYYYY(new Date().getTime()) || "");
  }
  const text = textA.join('');
  return convertToTabular(text);
};

// Generate taxpayer info QR text
const getTaxpayerInfoQRText2 = (client: TaxPortal): string => {
  const text = [
    client.firstName, '|',
    client.middleName || "", '|',
    client.lastName, '|', '|',
    ssnForQR(client.ssn || ""), '|',
    '|',
    formatDateMMDDYYYY(client.dateOfBirth) || "", '|',
    client.occupation || "", '|',
    '|',
    client.phone || "", '|', '|', '|',
  ].join('');
  return convertToTabular(text);
};


// Generate taxpayer info QR text
const getTaxpayerInfoQRText = (client: TaxPortal): string => {
  const text = [
    '|',
    formatDateMMDDYYYY(client.dateOfBirth) || "", '|',
    client.occupation || "", '|',
    '|',
    client.phone || "",
  ].join('');
  return convertToTabular(text);
};

// Generate taxpayer address QR text
const getTaxpayerAddressQRText = (client: TaxPortal): string => {
  const text = [
    client.address || "", '|',
    '|',
    '|',
    client.zipCode || "",
  ].join('');
  return convertToTabular(text);
};

// Generate spouse QR text
const getSpouseQRText = (client: TaxPortal): string => {
  const text = [
    client.spouse?.firstName, '|',
    client.spouse?.middleName || "", '|',
    client.spouse?.lastName, '|', '|',
    ssnForQR(client.spouse?.ssn), '|',
    '|',
    formatDateMMDDYYYY(client.spouse?.dateOfBirth) || "", '|',
    client.spouse?.occupation || "", '|',
    '|',
    client.spouse?.phone || "", '|',
  ].join('');
  return convertToTabular(text);
};

// Generate full name QR text
const getSpouseFullNameQRText = (client: TaxPortal): string => {
  const text = [
    (client.spouse?.firstName + (client.spouse?.middleName ? " " + client.spouse?.middleName?.[0] + " " : ' ') + client.spouse?.lastName) || '',
    '|',
  ].join('');
  return convertToTabular(text);
};

// Generate dependent QR text
const getDependentQRText = (dependent: TaxDependent): string => {
  const text = [
    dependent.firstName, '|',
    dependent.middleName || "", '|',
    dependent.lastName, '|',
    '|',
    ssnForQR(dependent.ssn || ""), '|',
    '|',
    '|',
    '|',
    dependent.relationship || "", '|',
    dependent.monthsLivedWithYou?.toString() || "12", '|',
    formatDateMMDDYYYY(dependent.dateOfBirth) || "", '|',
   
  ].filter(Boolean).join('');
  return convertToTabular(text);
};

// Generate ID info QR text
const getIdInfoQRText = (client: TaxPortal): string => {
  const text = [
    client.idInfo?.idNumber || "", '|',
    client.idInfo?.idState || "", '|',
    formatDateMMDDYYYY(client.idInfo?.issueDate) || "", '|', '|',
    formatDateMMDDYYYY(client.idInfo?.expirationDate) || "", '|',
  ].join('');
  return convertToTabular(text);
};

// Generate bank info QR text
const getBankInfoQRText = (client: TaxPortal): string => {
  const text = [
    client.bankInfo?.bankName || "", '|',
    client.bankInfo?.routingNumber || '','|',
    client.bankInfo?.routingNumber || '','|',
    client.bankInfo?.accountNumber || '','|',
    client.bankInfo?.accountNumber || ''

  ].join('');
  return convertToTabular(text);
};

// Generate document QR text based on document type
const getDocumentQRText = (doc: DrakeTaxDocument): string => {
  const payer = doc.payerInfo;
  const amounts = doc.extractedAmounts;

  switch (doc.drakeFormType) {
    case 'w2': {
      const text = [
        payer?.ein?.replace(/\D/g, '') || "", '|',
        payer?.name || "", '|',
        payer?.address || "", '|',
        , '|',
        payer?.zip || "", '|',
        '|', '|', '|', '|',
        amounts?.wages?.toString() || "", '|',
        amounts?.wages?.toString() || "", '|',
        amounts?.federalTaxWithheld?.toString() || "", '|',
        amounts?.federalTaxWithheld?.toString() || "", '|',
      ].join('');
      return convertToTabular(text);



    }

    case '1099_nec': {
      const text = [
        payer?.ein?.replace(/\D/g, '') || "", '|',
        payer?.name || "", '|',
        payer?.address || "", '|',
        (payer?.city || "") + " " + (payer?.state || ""), '|',
        payer?.zip || "", '|',
        '|',
        amounts?.nonEmployeeCompensation?.toString() || "", '|',
        amounts?.nonEmployeeCompensation?.toString() || "", '|',
        amounts?.federalTaxWithheld1099?.toString() || "", '|',
      ].join('');
      return convertToTabular(text);
    }

    case '1099_misc': {
      const text = [
        payer?.ein?.replace(/\D/g, '') || "", '|',
        payer?.name || "", '|',
        payer?.address || "", '|',
        (payer?.city || "") + " " + (payer?.state || ""), '|',
        payer?.zip || "", '|',
        '|',
        amounts?.rents?.toString() || "", '|',
        amounts?.royalties?.toString() || "", '|',
        amounts?.otherIncome?.toString() || "", '|',
        amounts?.federalTaxWithheld1099?.toString() || "", '|',
      ].join('');
      return convertToTabular(text);
    }

    case '1099_int': {
      const text = [
        payer?.ein?.replace(/\D/g, '') || "", '|',
        payer?.name || "", '|',
        payer?.address || "", '|',
        (payer?.city || "") + " " + (payer?.state || ""), '|',
        payer?.zip || "", '|',
        '|',
        amounts?.interestIncome?.toString() || "", '|',
        amounts?.interestIncome?.toString() || "", '|',
      ].join('');
      return convertToTabular(text);
    }

    case '1099_div': {
      const text = [
        payer?.ein?.replace(/\D/g, '') || "", '|',
        payer?.name || "", '|',
        payer?.address || "", '|',
        (payer?.city || "") + " " + (payer?.state || ""), '|',
        payer?.zip || "", '|',
        '|',
        amounts?.ordinaryDividends?.toString() || "", '|',
        amounts?.qualifiedDividends?.toString() || "", '|',
        amounts?.capitalGainDistributions?.toString() || "", '|',
      ].join('');
      return convertToTabular(text);
    }

    case '1098': {
      const text = [
        payer?.ein?.replace(/\D/g, '') || "", '|',
        payer?.name || "", '|',
        payer?.address || "", '|',
        (payer?.city || "") + " " + (payer?.state || ""), '|',
        payer?.zip || "", '|',
        '|',
        amounts?.mortgageInterest?.toString() || "", '|',
        amounts?.outstandingPrincipal?.toString() || "", '|',
        amounts?.pointsPaid?.toString() || "", '|',
      ].join('');
      return convertToTabular(text);
    }

    case '1098_t': {
      const text = [
        payer?.ein?.replace(/\D/g, '') || "", '|',
        payer?.name || "", '|',
        payer?.address || "", '|',
        (payer?.city || "") + " " + (payer?.state || ""), '|',
        payer?.zip || "", '|',
        '|',
        amounts?.paymentsReceived?.toString() || "", '|',
        amounts?.scholarshipsGrants?.toString() || "", '|',
      ].join('');
      return convertToTabular(text);
    }

    case '1099_g': {
      const text = [
        payer?.ein?.replace(/\D/g, '') || "", '|',
        payer?.name || "", '|',
        payer?.address || "", '|',
        (payer?.city || "") + " " + (payer?.state || ""), '|',
        payer?.zip || "", '|',
        '|',
        amounts?.unemploymentCompensation?.toString() || "", '|',
        amounts?.federalIncomeTaxWithheld?.toString() || "", '|',
      ].join('');
      return convertToTabular(text);
    }

    case '1099_k': {
      const text = [
        payer?.ein?.replace(/\D/g, '') || "", '|',
        payer?.name || amounts?.pseName || "", '|',
        payer?.address || "", '|',
        (payer?.city || "") + " " + (payer?.state || ""), '|',
        payer?.zip || "", '|',
        '|',
        amounts?.grossAmount1099K?.toString() || "", '|',
        amounts?.cardNotPresentTransactions?.toString() || "", '|',
        amounts?.numberOfTransactions?.toString() || "", '|',
        amounts?.federalTaxWithheld1099K?.toString() || "", '|',
      ].join('');
      return convertToTabular(text);
    }

    default: {
      const text = [
        payer?.ein?.replace(/\D/g, '') || "", '|',
        payer?.name || "", '|',
        payer?.address || "", '|',
        (payer?.city || "") + " " + (payer?.state || ""), '|',
        payer?.zip || "", '|',
        '|',
        amounts?.totalAmount?.toString() || "", '|',
      ].join('');
      return convertToTabular(text);
    }
  }
};

// Get document label
const getDocumentLabel = (doc: DrakeTaxDocument): string => {
  const typeLabels: Record<string, string> = {
    'w2': 'W-2',
    '1099_nec': '1099-NEC',
    '1099_misc': '1099-MISC',
    '1099_int': '1099-INT',
    '1099_div': '1099-DIV',
    '1099_g': '1099-G',
    '1099_k': '1099-K',
    '1098': '1098',
    '1098_t': '1098-T',
    'schedule_k1': 'Schedule K-1',
    'receipt': 'Receipt',
    'other': 'Document',
  };
  return typeLabels[doc.drakeFormType || 'other'] || 'Document';
};

// Generate QR code as data URL
const generateQRDataUrl = async (text: string): Promise<string> => {
  return QRCode.toDataURL(text, {
    width: 120,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: { dark: '#000000', light: '#ffffff' }
  });
};

// Generate all QR codes
const generateAllQRCodes = async (
  client: TaxPortal,
  documents: DrakeTaxDocument[],
  lang: Language,
  linkedSpouse?: TaxPortal | null,
  spouseDocuments?: DrakeTaxDocument[]
): Promise<QRCodeData[]> => {
  const t = TRANSLATIONS[lang];
  const codes: QRCodeData[] = [];

  // Taxpayer Init
  codes.push({
    label: t.taxpayerInit,
    sublabel: `SSN, ${client.firstName}, ${client.lastName}`,
    dataUrl: await generateQRDataUrl(getTaxpayerInitQRText(client)),
    section: 'taxpayer'
  });

  // Taxpayer Full Name
  codes.push({
    label: t.taxpayerFullName,
    sublabel: `${client.firstName} ${client.middleName || ''} ${client.lastName}`.trim(),
    dataUrl: await generateQRDataUrl(getTaxpayerFullNameQRText(client)),
    section: 'taxpayer'
  });

  // Taxpayer Info
  codes.push({
    label: t.taxpayerInfo,
    sublabel: `DOB, Occupation, Phone`,
    dataUrl: await generateQRDataUrl(getTaxpayerInfoQRText(client)),
    section: 'taxpayer'
  });

  // Taxpayer Address
  codes.push({
    label: t.taxpayerAddress,
    sublabel: `${client.address || ''}, ${client.zipCode || ''}`,
    dataUrl: await generateQRDataUrl(getTaxpayerAddressQRText(client)),
    section: 'taxpayer'
  });

  // Spouse (if married)
  if (client.filingStatus === 'married_filing_jointly' || client.filingStatus === 'married_filing_separately') {
    if (client.spouse?.firstName) {
      codes.push({
        label: t.spouseInfo,
        sublabel: `${client.spouse.firstName} ${client.spouse.lastName || ''}`,
        dataUrl: await generateQRDataUrl(getSpouseQRText(client)),
        section: 'spouse'
      });
      codes.push({
        label: t.taxpayerFullName,
        sublabel: `${client.spouse.firstName} ${client.spouse.lastName || ''}`,
        dataUrl: await generateQRDataUrl(getSpouseFullNameQRText(client)),
        section: 'spouse'
      });
    }
  }

  // Dependents from taxpayer
  for (const dependent of client.dependents || []) {
    codes.push({
      label: t.dependent,
      sublabel: `${dependent.firstName} ${dependent.lastName || ''}`,
      dataUrl: await generateQRDataUrl(getDependentQRText(dependent)),
      section: 'dependent'
    });
  }

  // Dependents from linked spouse (for MFJ)
  if (client.filingStatus === 'married_filing_jointly' && linkedSpouse?.dependents) {
    for (const dependent of linkedSpouse.dependents) {
      // Check if dependent already exists (avoid duplicates by SSN or name)
      const isDuplicate = (client.dependents || []).some(d =>
        (d.ssn && dependent.ssn && d.ssn === dependent.ssn) ||
        (d.firstName?.toLowerCase() === dependent.firstName?.toLowerCase() &&
         d.lastName?.toLowerCase() === dependent.lastName?.toLowerCase())
      );

      if (!isDuplicate) {
        codes.push({
          label: `${t.dependent} (${t.spouse})`,
          sublabel: `${dependent.firstName} ${dependent.lastName || ''}`,
          dataUrl: await generateQRDataUrl(getDependentQRText(dependent)),
          section: 'dependent'
        });
      }
    }
  }

  // ID Information
  if (client.idInfo?.idNumber) {
    codes.push({
      label: t.idInfo,
      sublabel: `${client.idInfo.idState || ''} - ${client.idInfo.idNumber}`,
      dataUrl: await generateQRDataUrl(getIdInfoQRText(client)),
      section: 'id'
    });
  }

  // Bank Information
  if (client.bankInfo?.accountNumber) {
    codes.push({
      label: t.bankInfo,
      sublabel: `${client.bankInfo.bankName || ''} - ****${client.bankInfo.accountNumber.slice(-4)}`,
      dataUrl: await generateQRDataUrl(getBankInfoQRText(client)),
      section: 'bank'
    });
  }

  // Documents - Generate multiple QR codes per document for comprehensive data
  for (const doc of documents) {
    if (doc.verified && doc.drakeFormType) {
      const docQRs = await generateDocumentMultiQRCodes(doc);
      codes.push(...docQRs);
    }
  }

  // Spouse Documents (for MFJ)
  if (client.filingStatus === 'married_filing_jointly' && spouseDocuments?.length) {
    for (const doc of spouseDocuments) {
      if (doc.verified && doc.drakeFormType) {
        const docQRs = await generateDocumentMultiQRCodes(doc, '(Spouse)');
        codes.push(...docQRs);
      }
    }
  }

  return codes;
};

// Generate multiple QR codes for a single document
const generateDocumentMultiQRCodes = async (doc: DrakeTaxDocument, suffix?: string): Promise<QRCodeData[]> => {
  const codes: QRCodeData[] = [];
  const payer = doc.payerInfo || {};
  const amounts = doc.extractedAmounts || {};
  const docLabel = getDocumentLabel(doc);
  const payerName = payer.name || doc.originalFileName || 'Unknown';

  // Document group identifier for grouping QRs together
  const documentGroup = suffix
    ? `${docLabel} | ${payerName} ${suffix}`
    : `${docLabel} | ${payerName}`;

  // Common payer info
  const payerTxt = convertToTabular([
    payer.ein || '', '|',
    payer.name || '', '|',
    payer.address || '', '|',
    '|', 
    payer.zip || '', '|',
  ].join(''));

  switch (doc.drakeFormType) {
    case 'w2': {
      // W-2: Payer, Federal, State/Local
      codes.push({
        label: 'Payer Info',
        sublabel: `EIN: ${payer.ein || 'N/A'}`,
        dataUrl: await generateQRDataUrl(payerTxt),
        section: 'document',
        documentGroup
      });

      const federalTxt = convertToTabular([
        amounts.wages || '', '|',
        amounts.wages || '', '|',
        amounts.federalTaxWithheld || '', '|',
        amounts.federalTaxWithheld || '', '|',
        amounts.socialSecurityWages || '', '|',
        amounts.socialSecurityTax || '', '|',
        amounts.medicareWages || '', '|',
        amounts.medicareTax || '', '|',
      ].join(''));

      codes.push({
        label: 'Federal Amounts',
        sublabel: `Wages: $${(amounts.wages || 0).toLocaleString()}`,
        dataUrl: await generateQRDataUrl(federalTxt),
        section: 'document',
        documentGroup
      });

      if (amounts.stateWages || amounts.stateTaxWithheld) {
        const stateTxt = convertToTabular([
          amounts.employerStateId || '', '|',
          amounts.stateWages || '', '|',
          amounts.stateWages || '', '|',
          amounts.stateTaxWithheld || '', '|',
          amounts.stateTaxWithheld || '', '|',
          amounts.localWages || '', '|',
          amounts.localTaxWithheld || '', '|',
        ].join(''));

        codes.push({
          label: 'State/Local',
          sublabel: `State Tax: $${(amounts.stateTaxWithheld || 0).toLocaleString()}`,
          dataUrl: await generateQRDataUrl(stateTxt),
          section: 'document',
          documentGroup
        });
      }
      break;
    }

    case '1099_nec': {
      const necFullTxt = convertToTabular([
        payer.ein || '', '|', '|',
        payer.name || '', '|', '|',
        payer.address || '', '|',
        (payer.zip || '').split('-')?.[0] || '', '|',
        '|', '|', '|', '|', '|', '|', '|', '|', '|','|','|','|',
        amounts.nonEmployeeCompensation || '', '|',
        '|', '|', '|',
        amounts.federalTaxWithheld1099 || amounts.federalTaxWithheld || '', '|',
      ].join(''));

      codes.push({
        label: 'Full Form',
        sublabel: `NEC: $${(amounts.nonEmployeeCompensation || 0).toLocaleString()}`,
        dataUrl: await generateQRDataUrl(necFullTxt),
        section: 'document',
        documentGroup
      });
      break;
    }

    case '1099_int': {
      codes.push({
        label: 'Payer Info',
        sublabel: `EIN: ${payer.ein || 'N/A'}`,
        dataUrl: await generateQRDataUrl(payerTxt),
        section: 'document',
        documentGroup
      });

      const intTxt = convertToTabular([
        amounts.interestIncome || '', '|',
        amounts.interestIncome || '', '|',
        amounts.earlyWithdrawalPenalty || '', '|',
        amounts.federalTaxWithheld1099 || amounts.federalTaxWithheld || '', '|',
        amounts.taxExemptInterest || '', '|',
      ].join(''));

      codes.push({
        label: 'Interest Amounts',
        sublabel: `Interest: $${(amounts.interestIncome || 0).toLocaleString()}`,
        dataUrl: await generateQRDataUrl(intTxt),
        section: 'document',
        documentGroup
      });
      break;
    }

    case '1099_div': {
      codes.push({
        label: 'Payer Info',
        sublabel: `EIN: ${payer.ein || 'N/A'}`,
        dataUrl: await generateQRDataUrl(payerTxt),
        section: 'document',
        documentGroup
      });

      const divTxt = convertToTabular([
        amounts.ordinaryDividends || '', '|',
        amounts.qualifiedDividends || '', '|',
        amounts.capitalGainDistributions || amounts.capitalGains || '', '|',
        amounts.federalTaxWithheld1099 || amounts.federalTaxWithheld || '', '|',
      ].join(''));

      codes.push({
        label: 'Dividend Amounts',
        sublabel: `Ordinary: $${(amounts.ordinaryDividends || 0).toLocaleString()}`,
        dataUrl: await generateQRDataUrl(divTxt),
        section: 'document',
        documentGroup
      });
      break;
    }

    case '1099_g': {
      codes.push({
        label: 'Payer Info',
        sublabel: `EIN: ${payer.ein || 'N/A'}`,
        dataUrl: await generateQRDataUrl(payerTxt),
        section: 'document',
        documentGroup
      });

      const gTxt = convertToTabular([
        amounts.unemploymentCompensation || '', '|',
        amounts.stateIncomeTaxRefund || '', '|',
        amounts.taxYear || '', '|',
        amounts.federalIncomeTaxWithheld || amounts.federalTaxWithheld || '', '|',
        amounts.stateTaxWithheld || '', '|',
      ].join(''));

      codes.push({
        label: 'Amounts',
        sublabel: `Unemployment: $${(amounts.unemploymentCompensation || 0).toLocaleString()}`,
        dataUrl: await generateQRDataUrl(gTxt),
        section: 'document',
        documentGroup
      });
      break;
    }

    case '1099_misc': {
      codes.push({
        label: 'Payer Info',
        sublabel: `EIN: ${payer.ein || 'N/A'}`,
        dataUrl: await generateQRDataUrl(payerTxt),
        section: 'document',
        documentGroup
      });

      const miscTxt = convertToTabular([
        amounts.rents || '', '|',
        amounts.royalties || '', '|',
        amounts.otherIncome || '', '|',
        amounts.federalTaxWithheld1099 || amounts.federalTaxWithheld || '', '|',
      ].join(''));

      codes.push({
        label: 'Income Amounts',
        sublabel: `Other: $${(amounts.otherIncome || 0).toLocaleString()}`,
        dataUrl: await generateQRDataUrl(miscTxt),
        section: 'document',
        documentGroup
      });
      break;
    }

    case '1098': {
      codes.push({
        label: 'Lender Info',
        sublabel: `EIN: ${payer.ein || 'N/A'}`,
        dataUrl: await generateQRDataUrl(payerTxt),
        section: 'document',
        documentGroup
      });

      const mortTxt = convertToTabular([
        amounts.mortgageInterest || '', '|',
        amounts.outstandingPrincipal || '', '|',
        amounts.pointsPaid || '', '|',
        amounts.mortgageInsurance || '', '|',
        amounts.propertyTaxes || '', '|',
      ].join(''));

      codes.push({
        label: 'Mortgage Amounts',
        sublabel: `Interest: $${(amounts.mortgageInterest || 0).toLocaleString()}`,
        dataUrl: await generateQRDataUrl(mortTxt),
        section: 'document',
        documentGroup
      });
      break;
    }

    case '1098_t': {
      codes.push({
        label: 'School Info',
        sublabel: `EIN: ${payer.ein || 'N/A'}`,
        dataUrl: await generateQRDataUrl(payerTxt),
        section: 'document',
        documentGroup
      });

      const tuitionTxt = convertToTabular([
        amounts.paymentsReceived || amounts.tuitionPaid || '', '|',
        amounts.scholarshipsGrants || '', '|',
        amounts.adjustments || '', '|',
      ].join(''));

      codes.push({
        label: 'Tuition Amounts',
        sublabel: `Paid: $${(amounts.paymentsReceived || amounts.tuitionPaid || 0).toLocaleString()}`,
        dataUrl: await generateQRDataUrl(tuitionTxt),
        section: 'document',
        documentGroup
      });
      break;
    }

    case '1099_k': {
      codes.push({
        label: 'PSE Info',
        sublabel: `EIN: ${payer.ein || 'N/A'}`,
        dataUrl: await generateQRDataUrl(payerTxt),
        section: 'document',
        documentGroup
      });

      const kAmountsTxt = convertToTabular([
        amounts.grossAmount1099K || '', '|',
        amounts.cardNotPresentTransactions || '', '|',
        amounts.numberOfTransactions || '', '|',
        amounts.federalTaxWithheld1099K || '', '|',
      ].join(''));

      codes.push({
        label: 'Payment Amounts',
        sublabel: `Gross: $${(amounts.grossAmount1099K || 0).toLocaleString()}`,
        dataUrl: await generateQRDataUrl(kAmountsTxt),
        section: 'document',
        documentGroup
      });

      // Add monthly amounts if available
      const monthly = amounts.monthlyGrossAmounts;
      if (monthly) {
        const monthlyTxt = convertToTabular([
          monthly.january || '', '|',
          monthly.february || '', '|',
          monthly.march || '', '|',
          monthly.april || '', '|',
          monthly.may || '', '|',
          monthly.june || '', '|',
          monthly.july || '', '|',
          monthly.august || '', '|',
          monthly.september || '', '|',
          monthly.october || '', '|',
          monthly.november || '', '|',
          monthly.december || '', '|',
        ].join(''));

        codes.push({
          label: 'Monthly Amounts',
          sublabel: 'Jan-Dec breakdown',
          dataUrl: await generateQRDataUrl(monthlyTxt),
          section: 'document',
          documentGroup
        });
      }

      // State info if available
      if (amounts.stateAbbreviation1099K || amounts.stateTaxWithheld1099K) {
        const stateTxt = convertToTabular([
          amounts.stateAbbreviation1099K || '', '|',
          amounts.stateIdNumber1099K || '', '|',
          amounts.stateTaxWithheld1099K || '', '|',
        ].join(''));

        codes.push({
          label: 'State Info',
          sublabel: amounts.stateAbbreviation1099K || 'State',
          dataUrl: await generateQRDataUrl(stateTxt),
          section: 'document',
          documentGroup
        });
      }
      break;
    }

    default: {
      // Generic single QR for other document types
      codes.push({
        label: docLabel,
        sublabel: payerName,
        dataUrl: await generateQRDataUrl(getDocumentQRText(doc)),
        section: 'document',
        documentGroup
      });
    }
  }

  return codes;
};

// Generate HTML document with all QR codes
export const generateClientQRCodesHtml = async (
  client: TaxPortal,
  documents: DrakeTaxDocument[],
  lang: Language = 'en',
  linkedSpouse?: TaxPortal | null,
  spouseDocuments?: DrakeTaxDocument[]
): Promise<string> => {
  const t = TRANSLATIONS[lang];
  const fullName = [client.firstName, client.middleName, client.lastName].filter(Boolean).join(' ') || 'Client';
  const currentDate = new Date().toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  // Generate all QR codes (including spouse data for MFJ)
  const qrCodes = await generateAllQRCodes(client, documents, lang, linkedSpouse, spouseDocuments);

  // Group by section
  const taxpayerQRs = qrCodes.filter(q => q.section === 'taxpayer');
  const spouseQRs = qrCodes.filter(q => q.section === 'spouse');
  const dependentQRs = qrCodes.filter(q => q.section === 'dependent');
  const idQRs = qrCodes.filter(q => q.section === 'id');
  const bankQRs = qrCodes.filter(q => q.section === 'bank');
  const documentQRs = qrCodes.filter(q => q.section === 'document');

  // Generate QR grid HTML
  const generateQRGrid = (codes: QRCodeData[]): string => {
    return codes.map(qr => `
      <div class="qr-item">
        <img src="${qr.dataUrl}" alt="${qr.label}" />
        <div class="qr-label">${qr.label}</div>
        ${qr.sublabel ? `<div class="qr-sublabel">${qr.sublabel}</div>` : ''}
      </div>
    `).join('');
  };

  // Generate documents grouped by documentGroup
  const generateDocumentGroupsHtml = (docQRs: QRCodeData[]): string => {
    // Group QR codes by documentGroup
    const groups = new Map<string, QRCodeData[]>();
    for (const qr of docQRs) {
      const groupKey = qr.documentGroup || 'Other Documents';
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(qr);
    }

    // Generate HTML for each group
    return Array.from(groups.entries()).map(([groupName, codes]) => `
      <div class="document-group">
        <div class="document-group-header">${groupName}</div>
        <div class="qr-grid">
          ${generateQRGrid(codes)}
        </div>
      </div>
    `).join('');
  };

  return `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.title} - ${fullName}</title>
  <style>
    @page { margin: 0.5in; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #1a1a1a;
      background: #f0f0eb;
      margin: 0;
      padding: 24px;
    }
    .container { max-width: 900px; margin: 0 auto; }
    .header {
      text-align: center;
      padding: 32px 24px;
      background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
      color: white;
      border-radius: 12px;
      margin-bottom: 20px;
    }
    .header h1 { margin: 0 0 8px 0; font-size: 24px; font-weight: 600; }
    .header p { margin: 0; opacity: 0.9; font-size: 14px; }
    .instructions {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 20px;
      color: #1e40af;
      font-size: 13px;
      text-align: center;
    }
    .section {
      background: #ffffff;
      border: 1px solid #e3e8ee;
      border-radius: 12px;
      margin-bottom: 20px;
      overflow: hidden;
      page-break-inside: avoid;
    }
    .section-header {
      padding: 14px 20px;
      font-weight: 600;
      font-size: 15px;
      color: #1e3a5f;
      background: #f8fafc;
      border-bottom: 1px solid #e3e8ee;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .section-header .count {
      background: #1e3a5f;
      color: white;
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 10px;
    }
    .qr-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 20px;
      padding: 20px;
    }
    .qr-item {
      text-align: center;
      padding: 16px;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      background: #fafbfc;
      transition: all 0.2s;
    }
    .qr-item:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      border-color: #1e3a5f;
    }
    .qr-item img {
      width: 120px;
      height: 120px;
      display: block;
      margin: 0 auto;
    }
    .qr-label {
      margin-top: 12px;
      font-weight: 600;
      font-size: 14px;
      color: #1e3a5f;
    }
    .qr-sublabel {
      font-size: 11px;
      color: #6b7280;
      margin-top: 4px;
      max-width: 180px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin-left: auto;
      margin-right: auto;
    }
    .document-group {
      border-top: 1px solid #e5e7eb;
    }
    .document-group:first-child {
      border-top: none;
    }
    .document-group-header {
      background: #f0f9ff;
      padding: 10px 20px;
      font-weight: 600;
      font-size: 13px;
      color: #0369a1;
      border-bottom: 1px solid #e0f2fe;
    }
    .summary {
      background: #f8fafc;
      border: 1px solid #e3e8ee;
      border-radius: 8px;
      padding: 16px 20px;
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      justify-content: center;
      margin-bottom: 20px;
    }
    .summary-item {
      text-align: center;
    }
    .summary-item .number {
      font-size: 24px;
      font-weight: 700;
      color: #1e3a5f;
    }
    .summary-item .label {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .footer {
      text-align: center;
      margin-top: 24px;
      font-size: 12px;
      color: #999999;
    }
    @media print {
      body { background: white; padding: 0; }
      .header { page-break-after: avoid; }
      .section { page-break-inside: avoid; }
      .qr-item { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>${t.title}</h1>
      <p>${fullName} - ${t.subtitle} ${client.taxYear || new Date().getFullYear()}</p>
    </div>

    <!-- Instructions -->
    <div class="instructions">
      ${t.scanInstructions}
    </div>

    <!-- Summary -->
    <div class="summary">
      <div class="summary-item">
        <div class="number">${taxpayerQRs.length}</div>
        <div class="label">${t.taxpayer}</div>
      </div>
      ${spouseQRs.length > 0 ? `
      <div class="summary-item">
        <div class="number">${spouseQRs.length}</div>
        <div class="label">${t.spouse}</div>
      </div>
      ` : ''}
      ${dependentQRs.length > 0 ? `
      <div class="summary-item">
        <div class="number">${dependentQRs.length}</div>
        <div class="label">${t.dependents}</div>
      </div>
      ` : ''}
      <div class="summary-item">
        <div class="number">${documentQRs.length}</div>
        <div class="label">${t.documents}</div>
      </div>
    </div>

    <!-- Taxpayer Section -->
    ${taxpayerQRs.length > 0 ? `
    <div class="section">
      <div class="section-header">
        ${t.taxpayerSection}
        <span class="count">${taxpayerQRs.length}</span>
      </div>
      <div class="qr-grid">
        ${generateQRGrid(taxpayerQRs)}
      </div>
    </div>
    ` : ''}

    <!-- Spouse Section -->
    ${spouseQRs.length > 0 ? `
    <div class="section">
      <div class="section-header">
        ${t.spouseSection}
        <span class="count">${spouseQRs.length}</span>
      </div>
      <div class="qr-grid">
        ${generateQRGrid(spouseQRs)}
      </div>
    </div>
    ` : ''}

    <!-- Dependents Section -->
    ${dependentQRs.length > 0 ? `
    <div class="section">
      <div class="section-header">
        ${t.dependentsSection}
        <span class="count">${dependentQRs.length}</span>
      </div>
      <div class="qr-grid">
        ${generateQRGrid(dependentQRs)}
      </div>
    </div>
    ` : ''}

    <!-- ID Section -->
    ${idQRs.length > 0 ? `
    <div class="section">
      <div class="section-header">
        ${t.idSection}
        <span class="count">${idQRs.length}</span>
      </div>
      <div class="qr-grid">
        ${generateQRGrid(idQRs)}
      </div>
    </div>
    ` : ''}

    <!-- Bank Section -->
    ${bankQRs.length > 0 ? `
    <div class="section">
      <div class="section-header">
        ${t.bankSection}
        <span class="count">${bankQRs.length}</span>
      </div>
      <div class="qr-grid">
        ${generateQRGrid(bankQRs)}
      </div>
    </div>
    ` : ''}

    <!-- Documents Section -->
    ${documentQRs.length > 0 ? `
    <div class="section">
      <div class="section-header">
        ${t.documentsSection}
        <span class="count">${documentQRs.length}</span>
      </div>
      ${generateDocumentGroupsHtml(documentQRs)}
    </div>
    ` : ''}

    <!-- Footer -->
    <div class="footer">
      ${t.generatedOn}: ${currentDate}
    </div>
  </div>
</body>
</html>
`;
};

// Open QR codes document in new window
export const openClientQRCodesDocument = async (
  client: TaxPortal,
  documents: DrakeTaxDocument[],
  lang: Language = 'en',
  linkedSpouse?: TaxPortal | null,
  spouseDocuments?: DrakeTaxDocument[]
): Promise<void> => {
  const html = await generateClientQRCodesHtml(client, documents, lang, linkedSpouse, spouseDocuments);

  // Create a blob URL and open it
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');

  // Clean up after a delay
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};

// Download QR codes as printable PDF (opens print dialog)
export const downloadClientQRCodesPdf = async (
  client: TaxPortal,
  documents: DrakeTaxDocument[],
  lang: Language = 'en',
  linkedSpouse?: TaxPortal | null,
  spouseDocuments?: DrakeTaxDocument[]
): Promise<void> => {
  const html = await generateClientQRCodesHtml(client, documents, lang, linkedSpouse, spouseDocuments);

  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to download the PDF');
    return;
  }

  printWindow.document.write(html);
  printWindow.document.close();

  // Wait for content to load, then trigger print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };
};




/// 175255545 175255545 ANISMARY  CASTRO VALDES  






/// Louisville, KY 40229