/**
 * Scan Station Types
 * Type definitions for the document scanning station module
 */

import type { DrakeTaxDocumentType, ExtractedTaxAmounts, PayerInfo, TaxPortal } from '../../drake-export/types/drakeTypes';

// ============================================
// Document Classification
// ============================================

/** AI-detected document type with confidence score */
export interface DocumentClassification {
  /** Detected document type */
  documentType: DrakeTaxDocumentType;
  /** Confidence score from 0 to 1 */
  confidence: number;
  /** Alternative classifications with lower confidence */
  alternatives: Array<{
    documentType: DrakeTaxDocumentType;
    confidence: number;
  }>;
  /** Raw AI response text (for debugging) */
  rawResponse?: string;
}

// ============================================
// Field Extraction
// ============================================

/** Individual extracted field with confidence and position */
export interface FieldExtraction {
  /** Field name/key */
  fieldName: string;
  /** Display label */
  label: string;
  /** Extracted value (string or number) */
  value: string | number;
  /** Confidence score from 0 to 1 */
  confidence: number;
  /** Whether the user has manually verified this field */
  verified: boolean;
  /** Whether the user has manually corrected this field */
  corrected: boolean;
  /** Original AI-extracted value before correction */
  originalValue?: string | number;
}

// ============================================
// Scan Result
// ============================================

/** Result from scanning a single document */
export interface ScanResult {
  /** Unique identifier */
  id: string;
  /** Original file name */
  fileName: string;
  /** File object reference */
  file: File;
  /** Base64 preview data URL */
  previewUrl: string;
  /** MIME type of the file */
  mimeType: string;
  /** File size in bytes */
  fileSize: number;
  /** Timestamp of scan */
  scannedAt: number;
  /** AI classification result */
  classification?: DocumentClassification;
  /** Extracted amounts from the document */
  extractedAmounts?: ExtractedTaxAmounts;
  /** Extracted payer/employer info */
  payerInfo?: PayerInfo;
  /** Individual field extractions with confidence */
  fields?: FieldExtraction[];
  /** Detected tax year */
  detectedTaxYear?: number;
  /** Detected recipient name (from the document) */
  detectedRecipientName?: string;
  /** Detected recipient SSN (from the document) */
  detectedRecipientSSN?: string;
}

// ============================================
// Batch Scan
// ============================================

/** Processing status for a batch item */
export type ScanItemStatus =
  | 'pending'
  | 'uploading'
  | 'classifying'
  | 'extracting'
  | 'checking_duplicates'
  | 'complete'
  | 'error';

/** Item in a batch scan session */
export interface ScanBatchItem {
  /** Unique identifier */
  id: string;
  /** Original file */
  file: File;
  /** Base64 preview data URL */
  previewUrl: string;
  /** Processing status */
  status: ScanItemStatus;
  /** Progress percentage (0-100) */
  progress: number;
  /** Error message if status is 'error' */
  errorMessage?: string;
  /** Scan result after processing */
  result?: ScanResult;
  /** Whether this document was accepted by the user */
  accepted: boolean;
  /** Whether this document was rejected by the user */
  rejected: boolean;
  /** Assigned client ID (if matched) */
  assignedClientId?: string;
  /** Assigned client name (for display) */
  assignedClientName?: string;
  /** Whether a duplicate was detected */
  isDuplicate: boolean;
  /** ID of the existing duplicate document */
  duplicateDocumentId?: string;
  /** User-corrected document type (overrides AI classification) */
  correctedDocumentType?: DrakeTaxDocumentType;
}

// ============================================
// Scan Session
// ============================================

/** Scan mode options */
export type ScanMode = 'single' | 'batch' | 'id';

/** Overall scan session tracking */
export interface ScanSession {
  /** Unique session identifier */
  id: string;
  /** Current scan mode */
  mode: ScanMode;
  /** Selected client (null for unmatched scanning) */
  selectedClient: TaxPortal | null;
  /** Tax year for documents */
  taxYear: number;
  /** All batch items in the session */
  items: ScanBatchItem[];
  /** Session start time */
  startedAt: number;
  /** Session end time */
  endedAt?: number;
  /** Total documents processed */
  totalProcessed: number;
  /** Total documents accepted */
  totalAccepted: number;
  /** Total documents rejected */
  totalRejected: number;
  /** Total errors */
  totalErrors: number;
  /** Whether processing is currently active */
  isProcessing: boolean;
}

// ============================================
// Client Matching
// ============================================

/** Suggestion for matching an unmatched document to a client */
export interface ClientMatchSuggestion {
  /** Tax portal client */
  client: TaxPortal;
  /** Match confidence from 0 to 1 */
  confidence: number;
  /** Reason for the match suggestion */
  matchReason: string;
  /** Fields that matched */
  matchedFields: Array<{
    field: string;
    documentValue: string;
    clientValue: string;
  }>;
}

// ============================================
// ID Scan Result
// ============================================

/** Extracted ID/passport data */
export interface IDScanResult {
  /** Scan type */
  scanType: 'drivers_license' | 'state_id' | 'passport';
  /** Extracted first name */
  firstName?: string;
  /** Extracted middle name */
  middleName?: string;
  /** Extracted last name */
  lastName?: string;
  /** Extracted suffix */
  suffix?: string;
  /** Date of birth (YYYY-MM-DD) */
  dateOfBirth?: string;
  /** Gender */
  gender?: 'M' | 'F' | 'X';
  /** ID/document number */
  documentNumber?: string;
  /** Issuing state (2-letter code) */
  issuingState?: string;
  /** Issue date (YYYY-MM-DD) */
  issueDate?: string;
  /** Expiration date (YYYY-MM-DD) */
  expirationDate?: string;
  /** Address */
  address?: string;
  /** City */
  city?: string;
  /** State (2-letter code) */
  state?: string;
  /** Zip code */
  zipCode?: string;
  /** Country */
  country?: string;
  /** Eye color */
  eyeColor?: string;
  /** Hair color */
  hairColor?: string;
  /** Height */
  height?: string;
  /** Weight */
  weight?: string;
  /** Overall confidence */
  confidence: number;
  /** Whether the ID appears valid */
  isValid: boolean;
  /** Raw scan data */
  rawData?: any;
}

// ============================================
// Duplicate Detection
// ============================================

/** Result of duplicate detection check */
export interface DuplicateCheckResult {
  /** Whether a duplicate was found */
  isDuplicate: boolean;
  /** ID of the existing document that matches */
  existingDocumentId?: string;
  /** Type of the existing document */
  existingDocumentType?: DrakeTaxDocumentType;
  /** How similar the documents are (0-1) */
  similarity: number;
  /** Reason for duplicate detection */
  reason?: string;
}

// ============================================
// Document Type Labels (for UI)
// ============================================

/** Uploadable document types (excludes verification forms) */
export const SCANNABLE_DOCUMENT_TYPES: Array<{
  type: DrakeTaxDocumentType;
  label: string;
}> = [
  { type: 'w2', label: 'W-2 (Wages)' },
  { type: '1099_nec', label: '1099-NEC (Non-Employee Comp)' },
  { type: '1099_misc', label: '1099-MISC (Miscellaneous)' },
  { type: '1099_int', label: '1099-INT (Interest)' },
  { type: '1099_div', label: '1099-DIV (Dividends)' },
  { type: '1099_r', label: '1099-R (Retirement)' },
  { type: '1099_g', label: '1099-G (Government)' },
  { type: '1099_k', label: '1099-K (Payment Card)' },
  { type: '1098', label: '1098 (Mortgage Interest)' },
  { type: '1098_t', label: '1098-T (Tuition)' },
  { type: '1095_a', label: '1095-A (Health Insurance)' },
  { type: 'schedule_k1', label: 'Schedule K-1 (Partnership)' },
  { type: 'receipt', label: 'Receipt / Expense' },
  { type: 'other', label: 'Other Document' },
];
