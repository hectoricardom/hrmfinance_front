import { NotaryCustomer } from '../types';

/**
 * PDF Form Template Definition
 */
export interface PDFFormTemplate {
  id: string;
  name: string;
  description: string;
  templateUrl?: string; // URL to fetch the PDF template
  templateFile?: string; // Local file path
  category: 'immigration' | 'passport' | 'visa' | 'work_permit' | 'general' | 'other';
  fieldMappings: FieldMapping[];
  imageFields?: ImageFieldMapping[];
  checkboxFields?: CheckboxFieldMapping[];
}

/**
 * Field mapping from customer data to PDF field
 */
export interface FieldMapping {
  pdfFieldName: string; // Name of the field in the PDF
  customerDataPath: string; // Path to data in NotaryCustomer object (e.g., "firstName", "placeOfBirth.city")
  transform?: (value: any) => string; // Optional transformation function
  defaultValue?: string; // Default value if customer data is empty
  label?: string; // Human-readable label for the field
}

/**
 * Image field mapping for photos, signatures, etc.
 */
export interface ImageFieldMapping {
  pdfFieldName?: string; // Name of the image field in PDF (if it's a form field)
  customerDataPath: string; // Path to image URL/base64 in customer data
  position?: {
    page: number; // Page number (0-indexed)
    x: number;
    y: number;
    width: number;
    height: number;
  };
  label?: string;
}

/**
 * Checkbox field mapping
 */
export interface CheckboxFieldMapping {
  pdfFieldName: string;
  condition: (customer: NotaryCustomer) => boolean; // Function to determine if checkbox should be checked
  label?: string;
}

/**
 * PDF Fill Request
 */
export interface PDFFillRequest {
  templateId: string;
  customer: NotaryCustomer;
  options?: {
    flatten?: boolean; // Make PDF non-editable after filling
    includeImages?: boolean; // Include photos and signatures
    includeDebugInfo?: boolean; // Add debug information
  };
}

/**
 * PDF Fill Result
 */
export interface PDFFillResult {
  success: boolean;
  pdfBlob?: Blob;
  error?: string;
  filledFields?: string[]; // List of successfully filled fields
  skippedFields?: string[]; // List of fields that couldn't be filled
}
