import {
  AIDocumentAnalysis,
  DocumentType,
  ExtractedDocumentData,
  DOCUMENT_TYPE_LABELS
} from '../types/documents';
import { devLog } from '../../../services/utils';

/**
 * Analyze document using AI (Claude API via backend)
 */
export const analyzeDocument = async (
  fileUrl: string,
  mimeType: string
): Promise<AIDocumentAnalysis> => {
  try {
    const startTime = Date.now();

    // For now, we'll use a mock implementation
    // TODO: Replace with actual AI API call to backend
    const analysis = await mockDocumentAnalysis(fileUrl, mimeType);

    const processingTime = Date.now() - startTime;

    return {
      ...analysis,
      processingTime,
      model: 'mock-v1' // TODO: Replace with actual model name
    };
  } catch (error) {
    devLog('Error analyzing document:', error);
    throw new Error('Failed to analyze document: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
};

/**
 * Mock document analysis (replace with actual AI API call)
 */
const mockDocumentAnalysis = async (
  fileUrl: string,
  mimeType: string
): Promise<AIDocumentAnalysis> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Mock analysis based on file type
  const fileName = fileUrl.toLowerCase();

  let detectedType: DocumentType = 'other';
  let confidence = 0.85;
  let extractedData: ExtractedDocumentData = {};

  // Tax Form Detection
  if (fileName.includes('w2') || fileName.includes('w-2')) {
    detectedType = 'form_w2';
    confidence = 0.94;
    extractedData = {
      taxYear: 2024,
      employerName: 'ACME Corporation',
      employerEIN: '12-3456789',
      firstName: 'JOHN',
      lastName: 'DOE',
      ssn: '***-**-1234',
      wages: 75000.00,
      federalTaxWithheld: 12500.00,
      socialSecurityWages: 75000.00,
      socialSecurityTaxWithheld: 4650.00,
      medicareWages: 75000.00,
      medicareTaxWithheld: 1087.50,
      stateTaxWithheld: 3750.00
    };
  } else if (fileName.includes('1099-nec') || fileName.includes('1099nec')) {
    detectedType = 'form_1099_nec';
    confidence = 0.92;
    extractedData = {
      taxYear: 2024,
      payerName: 'Freelance Client Inc',
      payerTIN: '98-7654321',
      firstName: 'JOHN',
      lastName: 'DOE',
      ssn: '***-**-1234',
      nonEmployeeCompensation: 25000.00,
      federalTaxWithheld: 0
    };
  } else if (fileName.includes('1099-misc') || fileName.includes('1099misc')) {
    detectedType = 'form_1099_misc';
    confidence = 0.91;
    extractedData = {
      taxYear: 2024,
      payerName: 'Various Payer LLC',
      payerTIN: '55-1234567',
      firstName: 'JOHN',
      lastName: 'DOE',
      miscellaneousIncome: 5000.00,
      federalTaxWithheld: 0
    };
  } else if (fileName.includes('1099-int') || fileName.includes('1099int')) {
    detectedType = 'form_1099_int';
    confidence = 0.93;
    extractedData = {
      taxYear: 2024,
      payerName: 'First National Bank',
      payerTIN: '11-2233445',
      firstName: 'JOHN',
      lastName: 'DOE',
      interestIncome: 1250.00,
      federalTaxWithheld: 0
    };
  } else if (fileName.includes('1099-div') || fileName.includes('1099div')) {
    detectedType = 'form_1099_div';
    confidence = 0.92;
    extractedData = {
      taxYear: 2024,
      payerName: 'Investment Brokerage Corp',
      payerTIN: '22-3344556',
      firstName: 'JOHN',
      lastName: 'DOE',
      dividendIncome: 3500.00,
      federalTaxWithheld: 350.00
    };
  } else if (fileName.includes('1099')) {
    // Generic 1099 detection
    detectedType = 'form_1099_misc';
    confidence = 0.85;
    extractedData = {
      taxYear: 2024,
      payerName: 'Unknown Payer',
      firstName: 'JOHN',
      lastName: 'DOE',
      miscellaneousIncome: 0,
      federalTaxWithheld: 0
    };
  } else if (fileName.includes('1098-t') || fileName.includes('1098t')) {
    detectedType = 'form_1098_t';
    confidence = 0.91;
    extractedData = {
      taxYear: 2024,
      institutionName: 'State University',
      payerTIN: '33-4455667',
      firstName: 'JANE',
      lastName: 'DOE',
      qualifiedExpenses: 12000.00,
      scholarshipsGrants: 5000.00,
      isAtLeastHalfTime: true,
      isGraduateStudent: false
    };
  } else if (fileName.includes('1098')) {
    detectedType = 'form_1098';
    confidence = 0.90;
    extractedData = {
      taxYear: 2024,
      lenderName: 'Home Mortgage Lender',
      payerTIN: '44-5566778',
      firstName: 'JOHN',
      lastName: 'DOE',
      mortgageInterest: 18500.00,
      outstandingPrincipal: 285000.00,
      mortgageInsurancePremiums: 1200.00,
      pointsPaid: 0,
      propertyTaxes: 4500.00,
      address: '123 Main Street, Anytown, USA 12345'
    };
  } else if (fileName.includes('1040')) {
    detectedType = 'form_1040';
    confidence = 0.89;
    extractedData = {
      taxYear: 2024,
      firstName: 'JOHN',
      lastName: 'DOE',
      ssn: '***-**-1234'
    };
  } else if (fileName.includes('passport') || fileName.includes('pasaporte')) {
    detectedType = 'passport';
    confidence = 0.92;
    extractedData = {
      documentNumber: 'P1234567',
      firstName: 'JOHN',
      lastName: 'DOE',
      dateOfBirth: '1990-01-15',
      gender: 'M',
      issuingCountry: 'USA',
      issueDate: '2020-01-01',
      expirationDate: '2030-01-01'
    };
  } else if (fileName.includes('birth') || fileName.includes('nacimiento')) {
    detectedType = 'birth_certificate';
    confidence = 0.88;
    extractedData = {
      firstName: 'JOHN',
      middleName: 'MICHAEL',
      lastName: 'DOE',
      dateOfBirth: '1990-01-15',
      placeOfBirth: 'New York, NY',
      issuingAuthority: 'Department of Health',
      issuingCountry: 'USA'
    };
  } else if (fileName.includes('marriage') || fileName.includes('matrimonio')) {
    detectedType = 'marriage_certificate';
    confidence = 0.86;
    extractedData = {
      issueDate: '2015-06-20',
      issuingAuthority: 'County Clerk',
      issuingCountry: 'USA',
      documentNumber: 'MC-2015-1234'
    };
  } else if (fileName.includes('license') || fileName.includes('licencia')) {
    detectedType = 'driver_license';
    confidence = 0.90;
    extractedData = {
      documentNumber: 'DL123456789',
      firstName: 'JOHN',
      lastName: 'DOE',
      dateOfBirth: '1990-01-15',
      address: '123 Main St',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      issueDate: '2020-01-01',
      expirationDate: '2025-01-01',
      issuingCountry: 'USA'
    };
  } else if (fileName.includes('green') || fileName.includes('card')) {
    detectedType = 'green_card';
    confidence = 0.89;
    extractedData = {
      documentNumber: 'GC1234567890',
      firstName: 'JOHN',
      lastName: 'DOE',
      dateOfBirth: '1990-01-15',
      issuingCountry: 'USA',
      issueDate: '2018-01-01',
      expirationDate: '2028-01-01'
    };
  }

  return {
    detectedType,
    confidence,
    alternativeTypes: [
      { type: detectedType === 'passport' ? 'visa' : 'other', confidence: confidence * 0.4 },
      { type: 'other', confidence: confidence * 0.2 }
    ],
    extractedData,
    fullText: 'Mock OCR text extraction...' // In real implementation, this would be actual OCR text
  };
};

/**
 * Call actual AI API (Claude) for document analysis
 * This should be called from your backend to keep API keys secure
 */
export const analyzeDocumentWithClaude = async (
  imageBase64: string,
  mimeType: string
): Promise<AIDocumentAnalysis> => {
  // This would call your backend endpoint that communicates with Claude API
  const response = await fetch('/api/analyze-document', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image: imageBase64,
      mimeType
    })
  });

  if (!response.ok) {
    throw new Error('Failed to analyze document with AI');
  }

  const result = await response.json();
  return result;
};

/**
 * Prompt template for Claude API
 * Use this on your backend when calling Claude
 */
export const DOCUMENT_ANALYSIS_PROMPT = `
You are a document analysis expert specializing in tax forms and identity documents. Analyze the provided document image and extract all relevant information.

Please provide a JSON response with the following structure:
{
  "detectedType": "one of: passport, birth_certificate, marriage_certificate, divorce_decree, driver_license, green_card, i94, visa, social_security_card, employment_letter, bank_statement, utility_bill, lease_agreement, tax_return, school_transcript, medical_record, police_clearance, affidavit, power_of_attorney, form_1040, form_w2, form_1099_misc, form_1099_nec, form_1099_int, form_1099_div, form_1098, form_1098_t, schedule_c, schedule_e, other",
  "confidence": 0.95,
  "extractedData": {
    // Personal Information
    "firstName": "extracted first name",
    "middleName": "extracted middle name",
    "lastName": "extracted last name",
    "ssn": "Social Security Number (masked format: ***-**-1234)",
    "dateOfBirth": "YYYY-MM-DD",

    // Document Information
    "documentNumber": "document ID number",
    "taxYear": 2024,

    // W-2 Specific Fields
    "employerName": "employer name from W-2",
    "employerEIN": "employer EIN (XX-XXXXXXX)",
    "wages": 0.00,
    "federalTaxWithheld": 0.00,
    "socialSecurityWages": 0.00,
    "socialSecurityTaxWithheld": 0.00,
    "medicareWages": 0.00,
    "medicareTaxWithheld": 0.00,
    "stateTaxWithheld": 0.00,

    // 1099 Specific Fields
    "payerName": "payer name from 1099",
    "payerTIN": "payer TIN (XX-XXXXXXX)",
    "nonEmployeeCompensation": 0.00,
    "interestIncome": 0.00,
    "dividendIncome": 0.00,
    "miscellaneousIncome": 0.00,

    // 1098 Specific Fields (Mortgage)
    "lenderName": "lender name",
    "mortgageInterest": 0.00,
    "outstandingPrincipal": 0.00,
    "mortgageInsurancePremiums": 0.00,
    "pointsPaid": 0.00,
    "propertyTaxes": 0.00,

    // 1098-T Specific Fields (Education)
    "institutionName": "educational institution name",
    "qualifiedExpenses": 0.00,
    "scholarshipsGrants": 0.00,
    "isAtLeastHalfTime": true/false,
    "isGraduateStudent": true/false,

    // Address fields
    "address": "full address",
    "city": "city",
    "state": "state/province",
    "zipCode": "postal code"
  },
  "fullText": "all text extracted from the document via OCR"
}

Instructions:
1. Identify the document type with high confidence - pay special attention to IRS tax forms
2. For tax forms, look for form numbers like "Form W-2", "Form 1099-NEC", "Form 1098", etc.
3. Extract all visible text and numerical values from boxes
4. Format dates as YYYY-MM-DD
5. Format monetary amounts as decimal numbers (e.g., 75000.00)
6. Include only fields that are clearly visible
7. Use null for fields that cannot be determined
8. Provide confidence score (0-1) for document type detection
9. For W-2 forms, extract Box 1-6 values carefully
10. For 1099 forms, identify the specific type (NEC, MISC, INT, DIV) and extract the income amount
11. For 1098 forms, extract mortgage interest and property tax information
`;

/**
 * Get document type suggestions based on extracted data
 */
export const suggestDocumentType = (extractedData: ExtractedDocumentData): DocumentType[] => {
  const suggestions: DocumentType[] = [];

  if (extractedData.documentNumber?.startsWith('P')) {
    suggestions.push('passport');
  }

  if (extractedData.placeOfBirth) {
    suggestions.push('birth_certificate');
  }

  if (extractedData.documentNumber?.includes('DL') || extractedData.documentNumber?.includes('License')) {
    suggestions.push('driver_license');
  }

  if (extractedData.documentNumber?.includes('GC') || extractedData.documentNumber?.includes('Green')) {
    suggestions.push('green_card');
  }

  return suggestions;
};

/**
 * Validate extracted data quality
 */
export const validateExtractedData = (data: ExtractedDocumentData): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for required fields
  if (!data.firstName && !data.lastName && !data.documentNumber) {
    errors.push('No identifying information extracted');
  }

  // Validate date formats
  const dateFields = ['dateOfBirth', 'issueDate', 'expirationDate'];
  dateFields.forEach(field => {
    const value = data[field];
    if (value && typeof value === 'string') {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(value)) {
        warnings.push(`${field} has invalid format: ${value}`);
      }
    }
  });

  // Check expiration dates
  if (data.expirationDate) {
    const expDate = new Date(data.expirationDate);
    const now = new Date();
    if (expDate < now) {
      warnings.push('Document appears to be expired');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};
