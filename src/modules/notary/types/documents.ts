/**
 * Document Types for Notary Module
 */

export type DocumentType =
  | 'passport'
  | 'birth_certificate'
  | 'cubanBirthCertificate'
  | 'marriage_certificate'
  | 'divorce_decree'
  | 'driver_license'
  | 'green_card'
  | 'i94'
  | 'visa'
  | 'social_security_card'
  | 'employment_letter'
  | 'bank_statement'
  | 'utility_bill'
  | 'lease_agreement'
  | 'tax_return'
  | 'school_transcript'
  | 'medical_record'
  | 'police_clearance'
  | 'affidavit'
  | 'power_of_attorney'
  // Tax Forms
  | 'form_1040'
  | 'form_w2' 
  | 'w2'
  | 'form_1099_misc'
  | 'form_1099_nec'
  | 'form_1099_int'
  | 'form_1099_div'
  | 'form_1098'
  | 'form_1098_t'
  | 'schedule_c'
  | 'schedule_e'
  | 'other';

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  passport: 'Pasaporte',
  birth_certificate: 'Certificado de Nacimiento',
  cubanBirthCertificate: 'Certificado de Nacimiento',
  marriage_certificate: 'Certificado de Matrimonio',
  divorce_decree: 'Decreto de Divorcio',
  driver_license: 'Licencia de Conducir',
  green_card: 'Tarjeta Verde (Green Card)',
  i94: 'Formulario I-94',
  visa: 'Visa',
  social_security_card: 'Tarjeta de Seguro Social',
  employment_letter: 'Carta de Empleo',
  bank_statement: 'Estado de Cuenta Bancario',
  utility_bill: 'Factura de Servicios',
  lease_agreement: 'Contrato de Arrendamiento',
  tax_return: 'Declaración de Impuestos',
  school_transcript: 'Expediente Académico',
  medical_record: 'Registro Médico',
  police_clearance: 'Certificado de Antecedentes Penales',
  affidavit: 'Declaración Jurada',
  power_of_attorney: 'Poder Notarial',
  // Tax Forms
  form_1040: 'Formulario 1040 (Declaración de Impuestos)',
  form_w2: 'Formulario W-2 (Salarios)',
  w2: 'Formulario W-2 (Salarios)',
  form_1099_misc: 'Formulario 1099-MISC (Ingresos Misceláneos)',
  form_1099_nec: 'Formulario 1099-NEC (Compensación No-Empleado)',
  form_1099_int: 'Formulario 1099-INT (Ingresos por Intereses)',
  form_1099_div: 'Formulario 1099-DIV (Dividendos)',
  form_1098: 'Formulario 1098 (Intereses Hipotecarios)',
  form_1098_t: 'Formulario 1098-T (Matrícula Educativa)',
  schedule_c: 'Schedule C (Negocio Propio)',
  schedule_e: 'Schedule E (Ingresos Suplementarios)',
  other: 'Otro'
};

// Tax Form Types for filtering
export const TAX_FORM_TYPES: DocumentType[] = [
  'form_1040',
  'form_w2',
  'form_1099_misc',
  'form_1099_nec',
  'form_1099_int',
  'form_1099_div',
  'form_1098',
  'form_1098_t',
  'schedule_c',
  'schedule_e',
  'tax_return'
];

/**
 * Document uploaded by user
 */
export interface NotaryDocument {
  id: string;
  clientNotaryId: string;
  documentType: DocumentType;
  originalFileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: number;
  uploadedBy?: string;
  filename?: string;
  // AI Analysis
  aiAnalysis?: AIDocumentAnalysis;
  aiAnalyzedAt?: number;
  aiResult?: AIDocumentAnalysis;
  // Metadata
  description?: string;
  tags?: string[];
  expirationDate?: number;
  issueDate?: number;
  issuingCountry?: string;
  documentNumber?: string;

  // Status
  verified?: boolean;
  verifiedBy?: string;
  verifiedAt?: number;
  notes?: string;
}

/**
 * AI Analysis Result
 */
export interface AIDocumentAnalysis {
  // Document Classification
  detectedType: DocumentType;
  documentType: DocumentType;
  confidence: number; // 0-1
  alternativeTypes?: Array<{ type: DocumentType; confidence: number }>;

  // Extracted Data
  extractedData: ExtractedDocumentData;

  // OCR Text
  fullText?: string;

  // Analysis metadata
  model?: string;
  processingTime?: number;
  error?: string;
}

/**
 * Data extracted from document by AI
 */
export interface ExtractedDocumentData {
  // Personal Information
  firstName?: string;
  middleName?: string;
  lastName?: string;
  dateOfBirth?: string;
  placeOfBirth?: string;
  gender?: string;
  ssn?: string;

  // Document specific
  documentNumber?: string;
  issueDate?: string;
  expirationDate?: string;
  issuingAuthority?: string;
  issuingCountry?: string;

  // Address
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;

  // Tax Form Specific Fields
  taxYear?: number;

  // W-2 Fields
  employerName?: string;
  employerEIN?: string;
  wages?: number;
  federalTaxWithheld?: number;
  socialSecurityWages?: number;
  socialSecurityTaxWithheld?: number;
  medicareWages?: number;
  medicareTaxWithheld?: number;
  stateTaxWithheld?: number;

  // 1099 Fields
  payerName?: string;
  payerTIN?: string;
  form1099Type?: '1099-MISC' | '1099-NEC' | '1099-INT' | '1099-DIV';
  nonEmployeeCompensation?: number;
  interestIncome?: number;
  dividendIncome?: number;
  miscellaneousIncome?: number;

  // 1098 Fields (Mortgage Interest)
  lenderName?: string;
  mortgageInterest?: number;
  outstandingPrincipal?: number;
  mortgageInsurancePremiums?: number;
  pointsPaid?: number;
  propertyTaxes?: number;

  // 1098-T Fields (Education)
  institutionName?: string;
  qualifiedExpenses?: number;
  scholarshipsGrants?: number;
  isAtLeastHalfTime?: boolean;
  isGraduateStudent?: boolean;

  // Additional fields (flexible)
  [key: string]: any;
}

/**
 * Tax Form Extracted Data - Typed version for tax calculator integration
 */
export interface TaxFormExtractedData {
  formType: DocumentType;
  taxYear: number;
  confidence: number;

  // Common fields
  taxpayerName?: string;
  taxpayerSSN?: string;

  // W-2 specific
  w2Data?: {
    employer: string;
    ein: string;
    wages: number;
    federalTaxWithheld: number;
    socialSecurityWages: number;
    socialSecurityTaxWithheld: number;
    medicareWages: number;
    medicareTaxWithheld: number;
    stateTaxWithheld?: number;
  };

  // 1099 specific
  form1099Data?: {
    payer: string;
    payerTIN: string;
    type: '1099-MISC' | '1099-NEC' | '1099-INT' | '1099-DIV';
    amount: number;
    federalTaxWithheld: number;
    description?: string;
  };

  // 1098 specific (Mortgage)
  form1098Data?: {
    lender: string;
    lenderTIN: string;
    mortgageInterest: number;
    outstandingPrincipal: number;
    mortgageInsurancePremiums: number;
    pointsPaid: number;
    propertyTaxes: number;
    propertyAddress?: string;
  };

  // 1098-T specific (Education)
  form1098TData?: {
    institution: string;
    institutionEIN: string;
    studentName: string;
    qualifiedExpenses: number;
    scholarshipsGrants: number;
    isAtLeastHalfTime: boolean;
    isGraduateStudent: boolean;
  };
}

/**
 * Document upload request
 */
export interface DocumentUploadRequest {
  file: File;
  clientNotaryId: string;
  documentType?: DocumentType;
  description?: string;
  analyzeWithAI?: boolean;
}

/**
 * Document analysis request
 */
export interface DocumentAnalysisRequest {
  documentId: string;
  fileUrl: string;
  mimeType: string;
  forceReanalyze?: boolean;
}

/**
 * Document update request (for correcting AI results)
 */
export interface DocumentUpdateRequest {
  documentId: string;
  documentType?: DocumentType;
  extractedData?: Partial<ExtractedDocumentData>;
  description?: string;
  tags?: string[];
  expirationDate?: number;
  issueDate?: number;
  issuingCountry?: string;
  documentNumber?: string;
  notes?: string;
  verified?: boolean;
}
