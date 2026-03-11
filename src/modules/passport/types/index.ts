export interface PassportRequest {
  id?: string;
  // Personal Information
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string;
  placeOfBirth: string;
  nationality: string;
  gender: 'M' | 'F' | 'X';
  
  // Contact Information
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  phone: string;
  email: string;
  
  // Document Information
  documentType: 'passport' | 'renewal' | 'replacement';
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  
  // Previous Passport (for renewal/replacement)
  previousPassport?: {
    number: string;
    issueDate: string;
    expiryDate: string;
  };
  
  // Signature
  signatureDataUrl?: string;
  signatureExtracted?: boolean;
  
  // Status
  status: 'draft' | 'submitted' | 'processing' | 'completed' | 'rejected';
  submittedAt?: string;
  processedAt?: string;
  
  // Files
  photoUrl?: string;
  supportingDocuments?: string[];
  generatedPdfUrl?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface SignatureExtractionResult {
  success: boolean;
  signatureDataUrl?: string;
  error?: string;
  confidence?: number;
}

export interface PDFGenerationOptions {
  template: 'standard' | 'expedited';
  includeBarcode: boolean;
  includeWatermark: boolean;
}