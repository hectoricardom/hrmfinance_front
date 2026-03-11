/**
 * Drake Tax Export Types
 * TypeScript interfaces for the Drake Tax Export module
 */

import { DocumentType, AIDocumentAnalysis } from '../../notary/types/documents';
import type { TaxStrategyData } from './taxStrategyTypes';

// Payment status for tax services
export type TaxPaymentStatus = 'pending' | 'partial' | 'paid' | 'refunded' | 'waived';

// Workflow/completion status for tax preparation
export type TaxWorkflowStatus =
  | 'intake'           // Initial client intake
  | 'collecting_docs'  // Gathering documents
  | 'docs_complete'    // All documents received
  | 'in_review'        // Tax preparer reviewing
  | 'ready_to_file'    // Ready for e-filing
  | 'filed'            // Tax return filed
  | 'accepted'         // IRS/state accepted
  | 'rejected'         // IRS/state rejected (needs correction)
  | 'completed'        // All done, case closed
  | 'hold'             // On hold - waiting or paused
  | 'waiting_client'   // Waiting on client response
  | 'cancelled'        // Cancelled/withdrawn
  | 'test';            // Test client (not real)

// Payment status labels for UI
export const TAX_PAYMENT_STATUS_LABELS: Record<TaxPaymentStatus, string> = {
  pending: 'Payment Pending',
  partial: 'Partially Paid',
  paid: 'Paid in Full',
  refunded: 'Refunded',
  waived: 'Fee Waived'
};

// Payment status colors for UI
export const TAX_PAYMENT_STATUS_COLORS: Record<TaxPaymentStatus, string> = {
  pending: '#ef4444',    // red
  partial: '#f59e0b',    // amber
  paid: '#22c55e',       // green
  refunded: '#6b7280',   // gray
  waived: '#8b5cf6'      // purple
};

// Workflow status labels for UI
export const TAX_WORKFLOW_STATUS_LABELS: Record<TaxWorkflowStatus, string> = {
  intake: 'New Client - Intake',
  collecting_docs: 'Collecting Documents',
  docs_complete: 'Documents Complete',
  in_review: 'In Review',
  ready_to_file: 'Ready to File',
  filed: 'Filed - Awaiting Response',
  accepted: 'Accepted by IRS',
  rejected: 'Rejected - Needs Correction',
  completed: 'Completed',
  hold: 'On Hold',
  waiting_client: 'Waiting on Client',
  cancelled: 'Cancelled',
  test: 'Test Client'
};

// Workflow status colors for UI
export const TAX_WORKFLOW_STATUS_COLORS: Record<TaxWorkflowStatus, string> = {
  intake: '#6b7280',          // gray
  collecting_docs: '#f59e0b', // amber
  docs_complete: '#3b82f6',   // blue
  in_review: '#8b5cf6',       // purple
  ready_to_file: '#10b981',   // emerald
  filed: '#06b6d4',           // cyan
  accepted: '#22c55e',        // green
  rejected: '#ef4444',        // red
  completed: '#22c55e',       // green
  hold: '#f97316',            // orange
  waiting_client: '#eab308',  // yellow
  cancelled: '#71717a',       // zinc/gray
  test: '#ec4899'             // pink
};

// Tax Portal - represents a tax client for Drake export
export interface TaxPortal {
  id: string;

  // Personal Information
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  ssn?: string;  // Social Security Number (masked in UI)
  dateOfBirth?: string;

  // Contact Information
  email?: string;
  phone?: string;

  // Address
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;

  // Tax Information
  taxYear?: number;
  filingStatus?: FilingStatus;
  occupation?: string;
  isBlind?: boolean;
  canBeClaimed?: boolean;  // Can be claimed as dependent on another return
  hasHealthInsurance?: boolean;

  // Tax Return Results (Refund/Owe)
  federalRefund?: number;      // Federal refund amount (positive value)
  federalOwe?: number;         // Federal amount owed (positive value)
  stateReturns?: StateReturn[]; // Support multiple state returns
  totalRefund?: number;        // Total combined refund (federal + all states)
  totalOwe?: number;           // Total combined owed (federal + all states)

  // Payment & Workflow Status
  paymentStatus?: TaxPaymentStatus;
  paymentAmount?: number;        // Total fee amount
  paymentPaidAmount?: number;    // Amount paid so far
  paymentDate?: number;          // When payment was made
  paymentMethod?: 'cash' | 'card' | 'check' | 'transfer' | 'other';
  paymentNotes?: string;

  workflowStatus?: TaxWorkflowStatus;
  workflowStatusDate?: number;   // When status was last changed
  workflowStatusBy?: string;     // Who changed the status
  filedDate?: number;            // When tax return was filed
  acceptedDate?: number;         // When IRS accepted
  rejectedReason?: string;       // Reason if rejected

  // ID Information (Driver's License / State ID)
  idInfo?: {
    idNumber: string;
    idState: string;  // Issuing state (2-letter code)
    issueDate?: string;  // YYYY-MM-DD
    expirationDate?: string;  // YYYY-MM-DD
    idType?: 'drivers_license' | 'state_id' | 'passport' | 'other';
    // Additional fields from PDF417 scan
    firstName?: string;
    middleName?: string;
    lastName?: string;
    suffix?: string;
    dateOfBirth?: string;
    gender?: 'M' | 'F' | 'X';
    eyeColor?: string;
    hairColor?: string;
    height?: string;
    weight?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };

  // Spouse Information (for married filing jointly/separately)
  spouse?: {
    firstName: string;
    lastName: string;
    middleName?: string;
    suffix?: string;
    ssn?: string;
    dateOfBirth?: string;
    occupation?: string;
    isBlind?: boolean;
    canBeClaimed?: boolean;
    phone?: string;
    email?: string;
  };

  // Linked Spouse Client (for pulling spouse's documents)
  linkedSpouseId?: string;        // ID of spouse's TaxPortal record
  linkedSpouseName?: string;      // Cached name for display

  // Business Association
  businessId?: string;
  storeId?: string;
  storeName?: string;

  // Metadata
  createdAt?: number;
  updatedAt?: number;
  createdBy?: string;
  notes?: string;

  // Document counts
  documentCount?: number;
  verifiedDocumentCount?: number;

  // Bank Information (for refund direct deposit)
  bankInfo?: {
    bankName?: string;
    accountType: 'checking' | 'savings';
    routingNumber: string;
    accountNumber: string;
    accountHolderName?: string;
  };

  // Dependents
  dependents?: TaxDependent[];
  hasNoDependents?: boolean;  // User confirmed they have no dependents (completes task)

  // Tax Strategy Checklist
  taxStrategy?: TaxStrategyData;
}

// State Return - for tracking individual state refund/owe amounts
export interface StateReturn {
  state: string;               // 2-letter state code (e.g., 'TX', 'CA', 'NY')
  refund?: number;             // State refund amount (positive value)
  owe?: number;                // State amount owed (positive value)
}

// Tax Dependent - detailed dependent information for tax preparation
export interface TaxDependent {
  id?: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  suffix?: string;
  relationship: DependentRelationship;
  ssn?: string;
  dateOfBirth?: string;
  monthsLivedWithYou?: number;  // For qualifying child/relative tests
  isStudent?: boolean;         // Full-time student status
  isDisabled?: boolean;        // Permanently and totally disabled
  providedSupport?: boolean;   // Did taxpayer provide more than half support
  hadIncome?: boolean;         // Did dependent have income
  incomeAmount?: number;       // Gross income if applicable
  claimedOnOtherReturn?: boolean;
  excludeFromCalculation?: boolean;  // Exclude this dependent from tax calculations
}

// Dependent relationship types
export type DependentRelationship =
  | 'son'
  | 'daughter'
  | 'stepson'
  | 'stepdaughter'
  | 'foster_child'
  | 'brother'
  | 'sister'
  | 'half_brother'
  | 'half_sister'
  | 'stepbrother'
  | 'stepsister'
  | 'parent'
  | 'grandparent'
  | 'grandchild'
  | 'niece'
  | 'nephew'
  | 'aunt'
  | 'uncle'
  | 'other';

// Tax Document Request - request for client to upload documents (no login required)
export interface TaxDocumentRequest {
  id: string;

  // Client Information
  taxPortalId: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;

  // Access Methods
  accessToken: string;      // Unique token for magic link
  accessPin: string;        // 6-digit PIN code
  qrCodeUrl?: string;       // Generated QR code URL

  // Request Details
  taxYear: TaxYear;
  requestedDocuments: RequestedDocumentType[];
  instructions?: string;

  // Status
  status: 'pending' | 'partial' | 'complete' | 'expired' | 'cancelled';
  portalLocked?: boolean;       // Admin locks portal when taxes are completed
  portalLockedAt?: number;      // Timestamp when portal was locked
  portalLockedBy?: string;      // Admin who locked the portal
  uploadedDocuments: string[];  // Document IDs that have been uploaded

  // Expiration
  createdAt: number;
  expiresAt: number;
  lastAccessedAt?: number;

  // Business Association
  requestedBy: string;
  requestedByName: string;
  businessId: string;
  storeId?: string;
  storeName?: string;

  // Notifications
  emailSent?: boolean;
  smsSent?: boolean;
  remindersSent?: number;

  // Client Submitted Verification Data (for accountant review)
  clientVerification?: {
    ssn?: string;
    filingStatus?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    submittedAt?: number;
  };

  clientBankInfo?: {
    bankName?: string;
    accountType?: 'checking' | 'savings';
    routingNumber?: string;
    accountNumber?: string;
    accountHolderName?: string;
    submittedAt?: number;
  };

  clientDependents?: {
    firstName: string;
    lastName: string;
    relationship: string;
    ssn?: string;
    dateOfBirth?: string;
  }[];

  // Engagement Letter Signature
  clientSignature?: {
    name: string;
    date: string;
    agreedToTerms: boolean;
    signedAt: number;
    signatureImage?: string;  // Base64 encoded signature image from canvas
    metadata?: SignatureMetadata; // Browser/device info for fraud prevention
  };

  // Tax Summary Review Confirmation
  clientReviewConfirmation?: {
    confirmed: boolean;
    reviewedAt: number;
  };

  // Signing PIN - 5-digit PIN for e-filing authorization
  clientSigningPin?: {
    pin: string;              // 5-digit PIN
    setAt: number;            // Timestamp when PIN was set
    confirmedAt?: number;     // Timestamp when PIN was confirmed/verified
    signerName: string;       // Full legal name of signer
    signatureImage?: string;  // Base64 encoded signature for IRS Form 8879
    metadata?: SignatureMetadata; // Browser/device info for fraud prevention
  };
}

// Signature metadata for fraud prevention and audit trail
export interface SignatureMetadata {
  // Browser information
  userAgent: string;
  browserName?: string;
  browserVersion?: string;

  // Device information
  platform: string;
  screenWidth: number;
  screenHeight: number;
  devicePixelRatio: number;
  touchEnabled: boolean;

  // Location/Network (if available)
  ipAddress?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  gpsAccuracy?: number; // meters
  timezone: string;
  language: string;

  // Session information
  sessionId?: string;
  pageUrl: string;
  referrer?: string;

  // Timestamp details
  clientTimestamp: number;
  serverTimestamp?: number;
  timezoneOffset: number;

  // Canvas/Signature specific
  canvasWidth?: number;
  canvasHeight?: number;
  strokeCount?: number;
  signatureDuration?: number; // Time in ms from first stroke to completion
}

// Types of documents that can be requested
export interface RequestedDocumentType {
  type: DrakeTaxDocumentType;
  label: string;
  required: boolean;
  uploaded: boolean;
  documentId?: string;
  notNeeded?: boolean; // Marked as not applicable by accountant or client
  notNeededReason?: string; // Optional reason why document is not needed
  notNeededBy?: 'accountant' | 'client'; // Who marked it as not needed
  notNeededAt?: number; // Timestamp when marked as not needed
}

// Default document request templates
export const DEFAULT_REQUESTED_DOCUMENTS: RequestedDocumentType[] = [
  { type: 'w2', label: 'W-2 (Wages)', required: true, uploaded: false },
  { type: '1099_nec', label: '1099-NEC (Self-Employment)', required: false, uploaded: false },
  { type: '1099_misc', label: '1099-MISC (Other Income)', required: false, uploaded: false },
  { type: '1099_int', label: '1099-INT (Interest)', required: false, uploaded: false },
  { type: '1099_div', label: '1099-DIV (Dividends)', required: false, uploaded: false },
  { type: '1099_r', label: '1099-R (Retirement Distribution)', required: false, uploaded: false },
  { type: '1098', label: '1098 (Mortgage Interest)', required: false, uploaded: false },
  { type: '1098_t', label: '1098-T (Tuition)', required: false, uploaded: false },
  { type: '1095_a', label: '1095-A (Health Insurance Marketplace)', required: false, uploaded: false },
  { type: 'schedule_k1', label: 'Schedule K-1', required: false, uploaded: false },
  { type: 'receipt', label: 'Receipts/Expenses', required: false, uploaded: false },
];

// Verification form templates (show forms instead of upload)
export const VERIFICATION_FORM_REQUESTS: RequestedDocumentType[] = [
  { type: 'verify_ssn', label: 'SSN Verification', required: true, uploaded: false },
  { type: 'sign_letter', label: 'Sign Engagement Letter', required: true, uploaded: false },
  { type: 'verify_info', label: 'Personal Information', required: true, uploaded: false },
  { type: 'provide_dependent_info', label: 'Dependent Information', required: false, uploaded: false },
  { type: 'verify_bank_info', label: 'Bank Account (for refund)', required: false, uploaded: false },
  { type: 'review_summary', label: 'Review Tax Summary', required: false, uploaded: false },

  
];

// All available request types
export const ALL_REQUEST_TYPES: RequestedDocumentType[] = [
  ...VERIFICATION_FORM_REQUESTS,
  ...DEFAULT_REQUESTED_DOCUMENTS,
];

// Tax document types supported for Drake export
export type DrakeTaxDocumentType =
  | 'w2'
  | '1099_misc'
  | '1099_nec'
  | '1099_int'
  | '1099_div'
  | '1099_r'
  | '1099_g'
  | '1099_k'
  | '1098'
  | '1098_t'
  | '1095_a'
  | 'schedule_k1'
  | 'receipt'
  | 'other'
  // Verification form types (no upload - shows form instead)
  | 'sign_letter'
  | 'verify_ssn'
  | 'verify_info'
  | 'provide_dependent_info'
  | 'verify_bank_info'
  | 'review_summary'
  | 'set_signing_pin'

// Document types that are forms (not file uploads)
export const VERIFICATION_FORM_TYPES: DrakeTaxDocumentType[] = [
  'verify_ssn',
  'verify_info',
  'provide_dependent_info',
  'verify_bank_info',
  'sign_letter',
  'review_summary',
  'set_signing_pin'
];

// Tax year options
export type TaxYear = 2023 | 2024 | 2025 | 2026;

// Document upload/processing status
export type UploadStatus =
  | 'pending'
  | 'uploading'
  | 'analyzing'
  | 'analyzed'
  | 'verified'
  | 'error';

// Export process status
export type ExportStatus =
  | 'not_ready'
  | 'ready'
  | 'generating'
  | 'completed'
  | 'error';

// Filing status options
export type FilingStatus =
  | 'single'
  | 'married_filing_jointly'
  | 'married_filing_separately'
  | 'head_of_household'
  | 'qualifying_widow';

// Extracted tax amounts from document analysis
export interface ExtractedTaxAmounts {
  // W-2 Fields (Boxes 1-20)
  wages?: number;                    // Box 1
  federalTaxWithheld?: number;       // Box 2
  socialSecurityWages?: number;      // Box 3
  socialSecurityTax?: number;        // Box 4
  medicareWages?: number;            // Box 5
  medicareTax?: number;              // Box 6
  socialSecurityTips?: number;       // Box 7
  allocatedTips?: number;            // Box 8
  dependentCareBenefits?: number;    // Box 10
  nonqualifiedPlans?: number;        // Box 11
  stateTaxWithheld?: number;         // Box 17
  localTaxWithheld?: number;         // Box 19
  stateWages?: number;               // Box 16
  localWages?: number;               // Box 18
  employerStateId?: string;          // Box 15 - Employer's state ID number
  localityName?: string;             // Box 20 - Locality name

  // W-2 Box 12 Codes (retirement, HSA, etc.)
  box12Codes?: Array<{ code: string; amount: number }>;

  // W-2 Box 14 Other Items
  box14Items?: Array<{ description: string; label?: string; amount: number }>;

  // 1099-MISC Fields
  rents?: number;                    // Box 1
  royalties?: number;                // Box 2
  otherIncome?: number;              // Box 3
  federalTaxWithheld1099?: number;   // Box 4
  fishingBoatProceeds?: number;      // Box 5
  medicalPayments?: number;          // Box 6
  cropInsurance?: number;            // Box 10
  grossProceeds?: number;            // Box 14

  // 1099-NEC Fields
  nonEmployeeCompensation?: number;  // Box 1

  // 1099-INT Fields
  interestIncome?: number;           // Box 1
  earlyWithdrawalPenalty?: number;   // Box 2
  usSavingsBondInterest?: number;    // Box 3
  taxExemptInterest?: number;        // Box 8
  privateBondInterest?: number;      // Box 9

  // 1099-DIV Fields
  ordinaryDividends?: number;        // Box 1a
  qualifiedDividends?: number;       // Box 1b
  capitalGainDistributions?: number; // Box 2a
  capitalGains?: number;             // Box 2a alias (used in UI)
  unrecaptured1250Gain?: number;     // Box 2b
  section1202Gain?: number;          // Box 2c
  collectiblesGain?: number;         // Box 2d
  nondividendDistributions?: number; // Box 3
  section199ADividends?: number;     // Box 5
  investmentExpenses?: number;       // Box 6
  foreignTaxPaid?: number;           // Box 7
  exemptInterestDividends?: number;  // Box 12

  // 1099-R Retirement Distribution Fields
  grossDistribution?: number;              // Box 1
  taxableAmount?: number;                  // Box 2a
  taxableAmountNotDetermined?: boolean;    // Box 2b checkbox
  totalDistribution?: boolean;             // Box 2b total distribution checkbox
  capitalGain?: number;                    // Box 3
  employeeContributions?: number;          // Box 5
  netUnrealizedAppreciation?: number;      // Box 6
  distributionCode?: string;               // Box 7
  otherAmount?: number;                    // Box 8
  percentageTotalDistribution?: number;    // Box 9a
  totalEmployeeContributions?: number;     // Box 9b
  firstYearOfRoth?: string;                // Box 11
  stateDistribution?: number;              // Box 14 - State distribution
  localDistribution?: number;              // Box 15 - Local distribution

  // 1098 Mortgage Interest Fields
  mortgageInterest?: number;         // Box 1
  outstandingPrincipal?: number;     // Box 2
  mortgageOriginationDate?: string;  // Box 3
  refundOfOverpaidInterest?: number; // Box 4
  mortgageInsurancePremiums?: number;// Box 5
  mortgageInsurance?: number;        // Box 5 alias (used in UI)
  pointsPaid?: number;               // Box 6
  propertyAddress?: string;          // Box 8
  propertyTaxes?: number;            // Property taxes (if reported)

  // 1098-T Tuition Fields
  paymentsReceived?: number;         // Box 1
  tuitionPaid?: number;              // Box 1 alias (used in UI)
  amountsBilled?: number;            // Box 2 (prior years)
  scholarshipsGrants?: number;       // Box 5
  adjustmentsPriorYear?: number;     // Box 4
  adjustmentsScholarships?: number;  // Box 6
  includesJanMarch?: boolean;        // Box 7 checkbox
  halfTimeStudent?: boolean;         // Box 8 checkbox
  graduateStudent?: boolean;         // Box 9 checkbox

  // Schedule K-1 Fields
  ordinaryBusinessIncome?: number;   // Box 1
  rentalRealEstateIncome?: number;   // Box 2
  otherRentalIncome?: number;        // Box 3
  guaranteedPayments?: number;       // Box 4
  interestIncomeK1?: number;         // Box 5
  dividendIncomeK1?: number;         // Box 6a
  qualifiedDividendsK1?: number;     // Box 6b
  royaltiesK1?: number;              // Box 7
  shortTermCapitalGain?: number;     // Box 8
  longTermCapitalGain?: number;      // Box 9a
  unrecaptured1250GainK1?: number;   // Box 9b
  section1231Gain?: number;          // Box 10
  section179Deduction?: number;      // Box 12
  selfEmploymentEarnings?: number;   // Box 14

  // 1095-A Health Insurance Marketplace Statement (Form 8962)
  // Annual totals from Part III columns A, B, C (line 33)
  annualPremiumAmount?: number;      // Column A - Annual enrollment premium
  annualSlcspPremium?: number;       // Column B - Annual SLCSP premium
  annualAdvancePtc?: number;         // Column C - Annual advance payment of PTC (APTC)
  // Monthly breakdown (optional, for detailed calculations)
  monthlyPremiums?: number[];        // 12 months of Column A values
  monthlySlcsp?: number[];           // 12 months of Column B values
  monthlyAptc?: number[];            // 12 months of Column C values
  // Coverage months
  coverageMonths?: number;           // Number of months covered
  // Marketplace info
  marketplacePolicyNumber?: string;
  marketplaceAssignedId?: string;    // Marketplace-assigned policy number

  // 1099-G Government Payments Fields
  unemploymentCompensation?: number;   // Box 1 - Unemployment compensation
  stateTaxRefund?: number;             // Box 2 - State or local income tax refunds, credits, or offsets
  refundTaxYear?: number;              // Box 3 - Box 2 amount is for tax year
  federalTaxWithheld1099G?: number;    // Box 4 - Federal income tax withheld
  rtaaPayment?: number;                // Box 5 - RTAA payments
  taxableGrants?: number;              // Box 6 - Taxable grants
  agriculturePayments?: number;        // Box 7 - Agriculture payments
  tradeOrBusinessIncome?: boolean;     // Box 8 - Check if box 2 is trade or business income
  marketGain?: number;                 // Box 9 - Market gain
  stateAbbreviation1099G?: string;     // Box 10a - State
  stateIdNumber1099G?: string;         // Box 10b - State identification no.
  stateTaxWithheld1099G?: number;      // Box 11 - State income tax withheld

  // 1099-K Payment Card and Third Party Network Transactions
  grossAmount1099K?: number;           // Box 1a - Gross amount of payment card/third party network transactions
  cardNotPresentTransactions?: number; // Box 1b - Card not present transactions
  merchantCategoryCode?: string;       // Box 2 - Merchant category code
  numberOfTransactions?: number;       // Box 3 - Number of payment transactions
  federalTaxWithheld1099K?: number;    // Box 4 - Federal income tax withheld
  // Monthly gross amounts (Boxes 5a-5l)
  monthlyGrossAmounts?: {
    january?: number;
    february?: number;
    march?: number;
    april?: number;
    may?: number;
    june?: number;
    july?: number;
    august?: number;
    september?: number;
    october?: number;
    november?: number;
    december?: number;
  };
  // State information for 1099-K
  stateAbbreviation1099K?: string;     // Box 6 - State
  stateIdNumber1099K?: string;         // Box 7 - State identification no.
  stateTaxWithheld1099K?: number;      // Box 8 - State income tax withheld
  // PSE (Payment Settlement Entity) info
  pseName?: string;                    // Filer/PSE name
  psePhone?: string;                   // PSE phone number

  // Recipient/Employee identification (extracted from document)
  recipientName?: string;       // Employee name on W-2, recipient name on 1099s
  recipientSSN?: string;        // Last 4 digits of SSN from document (for matching)

  // Generic/Receipt fields
  totalAmount?: number;
  description?: string;
  category?: string;
  vendor?: string;
  date?: string;
}

// Payer/Employer information extracted from documents
export interface PayerInfo {
  name?: string;
  ein?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  marketplace?: {
    marketplaceIdentifier?: string;
    marketplaceName?: string;
    policyNumber?: string;
    policyStartDate?: string;
    policyEndDate?: string;
  };
}

// Drake tax document with analysis
export interface DrakeTaxDocument {
  id: string;
  clientNotaryId: string;
  documentType: DocumentType;
  drakeFormType?: DrakeTaxDocumentType;
  fileUrl: string;
  originalFileName: string;
  fileSize?: number;
  mimeType?: string;
  uploadedAt: number;

  // Processing status
  uploadStatus: UploadStatus;
  processingProgress?: number;
  errorMessage?: string;

  // AI Analysis
  aiAnalysis?: AIDocumentAnalysis;
  aiConfidence?: number;
  aiAnalyzedAt?: number;

  // Extracted data
  extractedAmounts?: ExtractedTaxAmounts;
  extractedData?: {
    recipientName?: string;
    recipientSSN?: string;
    payerName?: string;
    payerTIN?: string;
    payerAddress?: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      fullAddress?: string;
    };
    form1099Data?: {
      federalIncomeTaxWithheld?: number;
      stateIncomeTaxWithheld?: number;
      rawBoxData?: Record<string, any>;
    };
    [key: string]: any;
  };
  payerInfo?: PayerInfo;
  taxYear?: number;

  // Verification
  verified?: boolean;
  verifiedBy?: string;
  verifiedAt?: number;
  manualOverride?: boolean;
  notes?: string;
}

// Drake form association for mapping
export interface DrakeFormAssociation {
  formCode: string;         // e.g., 'W2', '1099NEC', '1098'
  boxNumber: string;        // e.g., 'Box 1', 'Box 2'
  scheduleLetter?: string;  // e.g., 'A', 'C', 'E'
  scheduleLine?: string;    // e.g., 'Line 7', 'Line 12'
  description: string;
}

// Tax form summary line for aggregation
export interface TaxFormLine {
  formCode: string;
  boxNumber: string;
  description: string;
  amount: number;
  sourceDocuments: string[];  // Document IDs
  scheduleLetter?: string;
  scheduleLine?: string;
}

// Tax form summary by type
export interface TaxFormSummary {
  formType: DrakeTaxDocumentType;
  formLabel: string;
  documentCount: number;
  totalAmount: number;
  lines: TaxFormLine[];
  isComplete: boolean;
  warnings: string[];
}

// Drake CSV export record
export interface DrakeExportRecord {
  SSN: string;
  firstName: string;
  lastName: string;
  middleInitial?: string;
  suffix?: string;
  taxYear: number;
  formType: string;
  boxNumber: string;
  amount: number;
  description?: string;
  payerName?: string;
  payerEIN?: string;
  payerAddress?: string;
  employerName?: string;
  employerEIN?: string;
  employerAddress?: string;
  propertyAddress?: string;
  institutionName?: string;
  institutionEIN?: string;
  state?: string;
  stateId?: string;
}

// Export configuration
export interface DrakeExportConfig {
  taxYear: TaxYear;
  clientId: string;
  includeW2?: boolean;
  include1099?: boolean;
  include1098?: boolean;
  includeK1?: boolean;
  includeReceipts?: boolean;
  outputFormat: 'csv' | 'txt';
  includeHeaders?: boolean;
}

// Export result
export interface DrakeExportResult {
  success: boolean;
  csvData?: string;
  fileName?: string;
  downloadUrl?: string;
  recordCount: number;
  totalIncome: number;
  totalWithholding: number;
  errors?: string[];
  warnings?: string[];
  exportedAt?: number;
}

// Validation result for export readiness
export interface ExportValidation {
  isReady: boolean;
  missingRequired: string[];
  warnings: string[];
  documentCount: number;
  verifiedCount: number;
  unverifiedCount: number;
  totalIncome: number;
  totalWithholding: number;
}

// Section collapse state
export interface SectionState {
  clientSelector: boolean;
  documentUpload: boolean;
  documentReview: boolean;
  formSummary: boolean;
  export: boolean;
}

// Store state
export interface DrakeExportState {
  // Client Selection
  selectedClient: TaxPortal | null;
  taxYear: TaxYear;
  filingStatus: FilingStatus | null;

  // Documents
  documents: DrakeTaxDocument[];
  uploadQueue: File[];

  // UI State
  sectionState: SectionState;
  isLoading: boolean;
  error: string | null;

  // Export
  exportStatus: ExportStatus;
  exportResult: DrakeExportResult | null;

  // Summary (computed)
  formSummaries: TaxFormSummary[];

  // Document Requests
  documentRequests: TaxDocumentRequest[];
}

// Document type to Drake form type mapping
export const DOCUMENT_TO_DRAKE_TYPE: Partial<Record<DocumentType, DrakeTaxDocumentType>> = {
  'form_w2': 'w2',
  'w2': 'w2',
  'form_1099_misc': '1099_misc',
  'form_1099_nec': '1099_nec',
  'form_1099_int': '1099_int',
  'form_1099_div': '1099_div',
  'form_1099_r': '1099_r',
  '1099-R': '1099_r',
  'form_1099_g': '1099_g',
  '1099-G': '1099_g',
  'form_1098': '1098',
  'form_1098_t': '1098_t',
  'schedule_c': 'other',
  'schedule_e': 'other',
  'tax_return': 'other',
  'other': 'other'
};

// Drake form type labels
export const DRAKE_FORM_LABELS: Record<DrakeTaxDocumentType, string> = {
  'w2': 'W-2 (Wages)',
  '1099_misc': '1099-MISC (Miscellaneous)',
  '1099_nec': '1099-NEC (Non-Employee Comp)',
  '1099_int': '1099-INT (Interest)',
  '1099_div': '1099-DIV (Dividends)',
  '1099_r': '1099-R (Retirement)',
  '1099_g': '1099-G (Government Payments)',
  '1099_k': '1099-K (Payment Card/Network)',
  '1098': '1098 (Mortgage Interest)',
  '1098_t': '1098-T (Tuition)',
  '1095_a': '1095-A (Health Insurance Marketplace)',
  'schedule_k1': 'Schedule K-1 (Partnership)',
  'receipt': 'Receipt/Expense',
  'other': 'Other Document',
  // Verification form labels
  'sign_letter': 'Sign Engagement Letter',
  'verify_ssn': 'SSN Verification',
  'verify_info': 'Personal Information',
  'provide_dependent_info': 'Dependent Information',
  'verify_bank_info': 'Bank Account Info',
  'review_summary': 'Review Tax Summary',
  'set_signing_pin': 'E-Filing PIN (IRS Form 8879)'
};

// Document categories for grouping in the Documents tab
export type DocumentCategory = 'tax' | 'personal' | 'bank' | 'other';

// Category labels and colors for UI
export const DOCUMENT_CATEGORY_CONFIG: Record<DocumentCategory, { label: string; labelEs: string; color: string; bg: string; icon: string }> = {
  tax: { label: 'Tax Documents', labelEs: 'Documentos de Impuestos', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.08)', icon: 'tax' },
  personal: { label: 'Personal Documents', labelEs: 'Documentos Personales', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.08)', icon: 'personal' },
  bank: { label: 'Bank Account', labelEs: 'Cuenta Bancaria', color: '#10b981', bg: 'rgba(16, 185, 129, 0.08)', icon: 'bank' },
  other: { label: 'Other Documents', labelEs: 'Otros Documentos', color: '#6b7280', bg: 'rgba(107, 114, 128, 0.08)', icon: 'other' },
};

// Tax form types that belong to the "tax" category
const TAX_DRAKE_TYPES: DrakeTaxDocumentType[] = [
  'w2', '1099_nec', '1099_misc', '1099_int', '1099_div', '1099_r', '1099_g', '1099_k',
  '1098', '1098_t', '1095_a', 'schedule_k1', 'receipt',
];

// Personal document types (from DocumentType)
const PERSONAL_DOC_TYPES: string[] = [
  'passport', 'driver_license', 'state_id', 'social_security_card', 'green_card',
  'birth_certificate', 'cubanBirthCertificate', 'i94', 'visa',
  'identification', 'id_card',
];

// Bank document types (from DocumentType)
const BANK_DOC_TYPES: string[] = [
  'bank_statement',
];

/**
 * Categorize a document into one of the 4 groups based on its form type and document type.
 */
export function categorizeDocument(doc: DrakeTaxDocument): DocumentCategory {
  // Check drake form type first (most reliable for tax docs)
  if (doc.drakeFormType && TAX_DRAKE_TYPES.includes(doc.drakeFormType)) {
    return 'tax';
  }

  // Check documentType for personal/bank docs
  const docType = doc.documentType as string;
  if (PERSONAL_DOC_TYPES.includes(docType)) {
    return 'personal';
  }
  if (BANK_DOC_TYPES.includes(docType)) {
    return 'bank';
  }

  // Check AI analysis detected type as fallback
  const aiType = doc.aiAnalysis?.detectedType as string;
  if (aiType) {
    if (PERSONAL_DOC_TYPES.includes(aiType)) return 'personal';
    if (BANK_DOC_TYPES.includes(aiType)) return 'bank';
  }

  // If drakeFormType is 'other' or undefined but documentType is a tax form, still categorize as tax
  const taxDocTypes = ['form_1040', 'form_w2', 'w2', 'form_1099_misc', 'form_1099_nec',
    'form_1099_int', 'form_1099_div', 'form_1098', 'form_1098_t', 'schedule_c', 'schedule_e', 'tax_return'];
  if (taxDocTypes.includes(docType)) {
    return 'tax';
  }

  return 'other';
}

// Filing status labels
export const FILING_STATUS_LABELS: Record<FilingStatus, string> = {
  'single': 'Single',
  'married_filing_jointly': 'Married Filing Jointly',
  'married_filing_separately': 'Married Filing Separately',
  'head_of_household': 'Head of Household',
  'qualifying_widow': 'Qualifying Widow(er)'
};
