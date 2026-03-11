// Tax Portal Types

export type FilingStatus = 'single' | 'married_filing_jointly' | 'married_filing_separately' | 'head_of_household' | 'qualifying_widow';

export type IncomeSource =
  | 'w2_employment'
  | 'self_employment'
  | 'rental_income'
  | 'investment_income'
  | 'retirement_income'
  | 'social_security'
  | 'unemployment'
  | 'other_income';

export type DeductionType =
  | 'mortgage_interest'
  | 'property_taxes'
  | 'state_local_taxes'
  | 'charitable_donations'
  | 'medical_expenses'
  | 'student_loan_interest'
  | 'education_expenses'
  | 'childcare_expenses'
  | 'business_expenses'
  | 'home_office';

export type DocumentCategory =
  | 'income'
  | 'deductions'
  | 'credits'
  | 'identity'
  | 'prior_return'
  | 'other';

export interface RequiredDocument {
  id: string;
  name: string;
  description: string;
  category: DocumentCategory;
  formTypes: string[]; // e.g., ['w2', 'form_w2']
  required: boolean;
  multipleAllowed: boolean;
  conditions?: {
    incomeSources?: IncomeSource[];
    deductions?: DeductionType[];
    hasChildren?: boolean;
    isHomeowner?: boolean;
    isStudent?: boolean;
    hasBusiness?: boolean;
  };
}

// Payment status type
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'refunded' | 'waived';

// Payment status labels
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Payment Pending',
  partial: 'Partially Paid',
  paid: 'Paid in Full',
  refunded: 'Refunded',
  waived: 'Fee Waived'
};

// Payment status colors
export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  pending: '#ef4444',
  partial: '#f59e0b',
  paid: '#22c55e',
  refunded: '#6b7280',
  waived: '#8b5cf6'
};

export interface TaxClientProfile {
  id: string;

  // Personal Info
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  ssn?: string;
  dateOfBirth?: string;

  // Address
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;

  // Filing Info
  taxYear: number;
  filingStatus: FilingStatus;

  // Dependents
  hasDependents: boolean;
  dependents?: Dependent[];

  // Income Sources
  incomeSources: IncomeSource[];

  // Deductions & Situations
  deductions: DeductionType[];
  isHomeowner: boolean;
  isStudent: boolean;
  hasBusiness: boolean;
  hasInvestments: boolean;
  hasRentalProperty: boolean;
  receivedHealthInsurance: boolean;

  // Portal Access
  portalAccessToken?: string;
  portalAccessExpiry?: number;
  lastPortalAccess?: number;
  linkedUserId?: string; // Google account userId linked to this client

  // Status
  status: 'intake' | 'collecting_documents' | 'documents_complete' | 'in_review' | 'ready_to_file' | 'filed' | 'completed';
  documentProgress: number; // 0-100

  // Payment Status
  paymentStatus?: PaymentStatus;
  paymentAmount?: number;
  paymentPaidAmount?: number;
  paymentDate?: number;
  paymentMethod?: 'cash' | 'card' | 'check' | 'transfer' | 'other';
  paymentNotes?: string;

  // Metadata
  createdAt: number;
  updatedAt: number;
  assignedPreparerId?: string;
  notes?: string;
}

export interface Dependent {
  id: string;
  firstName: string;
  lastName: string;
  ssn?: string;
  dateOfBirth: string;
  relationship: 'child' | 'parent' | 'relative' | 'other';
  monthsLivedWithYou: number;
  isStudent: boolean;
  isDisabled: boolean;
}

export interface TaxDocument {
  id: string;
  clientId: string;

  // Document Info
  documentType: string;
  category: DocumentCategory;
  originalFileName: string;
  fileUrl: string;
  thumbnailUrl?: string;
  mimeType: string;
  fileSize: number;

  // AI Analysis
  aiAnalyzed: boolean;
  aiAnalyzedAt?: number;
  detectedType?: string;
  confidence?: number;
  extractedData?: Record<string, any>;

  // Review Status
  status: 'pending' | 'analyzed' | 'reviewed' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: number;
  reviewNotes?: string;

  // Metadata
  uploadedAt: number;
  uploadedBy: 'client' | 'preparer';
  taxYear?: number;
}

export interface DocumentChecklist {
  clientId: string;
  taxYear: number;
  items: ChecklistItem[];
  generatedAt: number;
  lastUpdated: number;
}

export interface ChecklistItem {
  id: string;
  documentId: string; // Reference to RequiredDocument
  name: string;
  description: string;
  category: DocumentCategory;
  required: boolean;
  status: 'missing' | 'uploaded' | 'analyzed' | 'approved';
  uploadedDocumentIds: string[];
  notes?: string;
}

export interface MagicLinkToken {
  token: string;
  clientId: string;
  email: string;
  phone?: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
  usedAt?: number;
}

export interface TaxPreparerDashboardStats {
  totalClients: number;
  clientsByStatus: Record<TaxClientProfile['status'], number>;
  documentsToReview: number;
  completedThisWeek: number;
  averageDocumentProgress: number;
}

// Document requirements configuration
export const REQUIRED_DOCUMENTS: RequiredDocument[] = [
  // Identity
  {
    id: 'id_document',
    name: 'Government ID',
    description: 'Valid driver\'s license, state ID, or passport',
    category: 'identity',
    formTypes: ['id', 'passport', 'drivers_license'],
    required: true,
    multipleAllowed: false,
  },
  {
    id: 'ssn_card',
    name: 'Social Security Card',
    description: 'Social Security card for taxpayer (and spouse if filing jointly)',
    category: 'identity',
    formTypes: ['ssn_card', 'social_security'],
    required: true,
    multipleAllowed: true,
  },

  // Income - W2
  {
    id: 'w2_forms',
    name: 'W-2 Forms',
    description: 'Wage and Tax Statement from each employer',
    category: 'income',
    formTypes: ['w2', 'form_w2'],
    required: true,
    multipleAllowed: true,
    conditions: { incomeSources: ['w2_employment'] },
  },

  // Income - 1099s
  {
    id: '1099_nec',
    name: '1099-NEC',
    description: 'Non-employee compensation (freelance/contract work)',
    category: 'income',
    formTypes: ['form_1099_nec', '1099-nec'],
    required: true,
    multipleAllowed: true,
    conditions: { incomeSources: ['self_employment'] },
  },
  {
    id: '1099_misc',
    name: '1099-MISC',
    description: 'Miscellaneous income',
    category: 'income',
    formTypes: ['form_1099_misc', '1099-misc'],
    required: false,
    multipleAllowed: true,
    conditions: { incomeSources: ['other_income'] },
  },
  {
    id: '1099_int',
    name: '1099-INT',
    description: 'Interest income from banks/investments',
    category: 'income',
    formTypes: ['form_1099_int', '1099-int'],
    required: true,
    multipleAllowed: true,
    conditions: { incomeSources: ['investment_income'] },
  },
  {
    id: '1099_div',
    name: '1099-DIV',
    description: 'Dividend income from investments',
    category: 'income',
    formTypes: ['form_1099_div', '1099-div'],
    required: true,
    multipleAllowed: true,
    conditions: { incomeSources: ['investment_income'] },
  },
  {
    id: '1099_b',
    name: '1099-B',
    description: 'Stock/investment sales',
    category: 'income',
    formTypes: ['form_1099_b', '1099-b'],
    required: false,
    multipleAllowed: true,
    conditions: { incomeSources: ['investment_income'] },
  },
  {
    id: '1099_r',
    name: '1099-R',
    description: 'Retirement distributions (pension, IRA, 401k)',
    category: 'income',
    formTypes: ['form_1099_r', '1099-r'],
    required: true,
    multipleAllowed: true,
    conditions: { incomeSources: ['retirement_income'] },
  },
  {
    id: 'ssa_1099',
    name: 'SSA-1099',
    description: 'Social Security benefits statement',
    category: 'income',
    formTypes: ['ssa_1099', 'ssa-1099'],
    required: true,
    multipleAllowed: false,
    conditions: { incomeSources: ['social_security'] },
  },
  {
    id: '1099_g',
    name: '1099-G',
    description: 'Unemployment compensation',
    category: 'income',
    formTypes: ['form_1099_g', '1099-g'],
    required: true,
    multipleAllowed: false,
    conditions: { incomeSources: ['unemployment'] },
  },

  // Deductions - Mortgage
  {
    id: '1098_mortgage',
    name: '1098 - Mortgage Interest',
    description: 'Mortgage interest statement from lender',
    category: 'deductions',
    formTypes: ['form_1098', '1098'],
    required: true,
    multipleAllowed: true,
    conditions: { deductions: ['mortgage_interest'], isHomeowner: true },
  },
  {
    id: 'property_tax',
    name: 'Property Tax Statement',
    description: 'Annual property tax bill or statement',
    category: 'deductions',
    formTypes: ['property_tax', 'property_tax_statement'],
    required: false,
    multipleAllowed: true,
    conditions: { deductions: ['property_taxes'], isHomeowner: true },
  },

  // Deductions - Education
  {
    id: '1098_t',
    name: '1098-T - Tuition Statement',
    description: 'Tuition payments from educational institution',
    category: 'deductions',
    formTypes: ['form_1098_t', '1098-t'],
    required: true,
    multipleAllowed: true,
    conditions: { deductions: ['education_expenses'], isStudent: true },
  },
  {
    id: '1098_e',
    name: '1098-E - Student Loan Interest',
    description: 'Student loan interest paid',
    category: 'deductions',
    formTypes: ['form_1098_e', '1098-e'],
    required: true,
    multipleAllowed: true,
    conditions: { deductions: ['student_loan_interest'] },
  },

  // Credits - Childcare
  {
    id: 'childcare_receipts',
    name: 'Childcare Expenses',
    description: 'Daycare/childcare provider receipts with EIN',
    category: 'credits',
    formTypes: ['childcare', 'daycare_receipt'],
    required: true,
    multipleAllowed: true,
    conditions: { deductions: ['childcare_expenses'], hasChildren: true },
  },

  // Business
  {
    id: 'business_income',
    name: 'Business Income Records',
    description: 'Profit & Loss statement, income records',
    category: 'income',
    formTypes: ['schedule_c', 'profit_loss', 'business_income'],
    required: true,
    multipleAllowed: true,
    conditions: { hasBusiness: true },
  },
  {
    id: 'business_expenses',
    name: 'Business Expense Records',
    description: 'Receipts, invoices, mileage logs',
    category: 'deductions',
    formTypes: ['business_expense', 'receipt'],
    required: true,
    multipleAllowed: true,
    conditions: { hasBusiness: true, deductions: ['business_expenses'] },
  },

  // Health Insurance
  {
    id: '1095_a',
    name: '1095-A - Health Insurance Marketplace',
    description: 'Health Insurance Marketplace Statement',
    category: 'other',
    formTypes: ['form_1095_a', '1095-a'],
    required: false,
    multipleAllowed: false,
  },

  // Prior Return
  {
    id: 'prior_return',
    name: 'Prior Year Tax Return',
    description: 'Last year\'s federal and state tax returns',
    category: 'prior_return',
    formTypes: ['tax_return', 'prior_return', '1040'],
    required: false,
    multipleAllowed: true,
  },

  // Charitable
  {
    id: 'charitable_donations',
    name: 'Charitable Donation Receipts',
    description: 'Receipts for donations over $250',
    category: 'deductions',
    formTypes: ['donation_receipt', 'charitable'],
    required: false,
    multipleAllowed: true,
    conditions: { deductions: ['charitable_donations'] },
  },
];

// Helper function to get required documents for a client
export function getRequiredDocumentsForClient(profile: TaxClientProfile): RequiredDocument[] {
  return REQUIRED_DOCUMENTS.filter(doc => {
    // Always include documents without conditions
    if (!doc.conditions) return true;

    const c = doc.conditions;

    // Check income sources
    if (c?.incomeSources && !c?.incomeSources?.some(src => profile?.incomeSources?.includes?.(src))) {
      return false;
    }

    // Check deductions
    if (c?.deductions && !c?.deductions?.some(ded => profile?.deductions?.includes?.(ded))) {
      return false;
    }

    // Check boolean conditions
    if (c?.hasChildren !== undefined && (profile?.hasDependents !== c?.hasChildren)) {
      return false;
    }
    if (c?.isHomeowner !== undefined && (profile?.isHomeowner !== c?.isHomeowner)) {
      return false;
    }
    if (c?.isStudent !== undefined && (profile?.isStudent !== c?.isStudent)) {
      return false;
    }
    if (c?.hasBusiness !== undefined && (profile?.hasBusiness !== c?.hasBusiness)) {
      return false;
    }

    return true;
  });
}

export const FILING_STATUS_LABELS: Record<FilingStatus, string> = {
  single: 'Single',
  married_filing_jointly: 'Married Filing Jointly',
  married_filing_separately: 'Married Filing Separately',
  head_of_household: 'Head of Household',
  qualifying_widow: 'Qualifying Widow(er)',
};

export const INCOME_SOURCE_LABELS: Record<IncomeSource, string> = {
  w2_employment: 'W-2 Employment',
  self_employment: 'Self-Employment / Freelance',
  rental_income: 'Rental Property Income',
  investment_income: 'Investment Income (Stocks, Interest, Dividends)',
  retirement_income: 'Retirement Distributions (401k, IRA, Pension)',
  social_security: 'Social Security Benefits',
  unemployment: 'Unemployment Benefits',
  other_income: 'Other Income',
};

export const DEDUCTION_TYPE_LABELS: Record<DeductionType, string> = {
  mortgage_interest: 'Mortgage Interest',
  property_taxes: 'Property Taxes',
  state_local_taxes: 'State & Local Taxes (SALT)',
  charitable_donations: 'Charitable Donations',
  medical_expenses: 'Medical Expenses',
  student_loan_interest: 'Student Loan Interest',
  education_expenses: 'Education Expenses',
  childcare_expenses: 'Childcare Expenses',
  business_expenses: 'Business Expenses',
  home_office: 'Home Office Deduction',
};

export const CLIENT_STATUS_LABELS: Record<TaxClientProfile['status'], string> = {
  intake: 'New Client - Intake',
  collecting_documents: 'Collecting Documents',
  documents_complete: 'Documents Complete',
  in_review: 'In Review',
  ready_to_file: 'Ready to File',
  filed: 'Filed - Awaiting Response',
  completed: 'Completed',
};

export const CLIENT_STATUS_COLORS: Record<TaxClientProfile['status'], string> = {
  intake: '#6b7280',
  collecting_documents: '#f59e0b',
  documents_complete: '#3b82f6',
  in_review: '#8b5cf6',
  ready_to_file: '#10b981',
  filed: '#06b6d4',
  completed: '#22c55e',
};


