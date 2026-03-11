/**
 * Accounting Module - TypeScript Type Definitions
 * Core interfaces for the accounting system
 */

// ============================================================================
// Account Management
// ============================================================================

/**
 * Represents a Chart of Accounts entry
 */
export interface Account {
  id: string;
  code: string;
  name: string;
  accountType: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  parentId?: string;
  taxCategory?: string;
  description?: string;
  isActive: boolean;
  balance: number;
}

// ============================================================================
// Journal Entries
// ============================================================================

/**
 * Represents a complete journal entry with multiple lines
 */
export interface JournalEntry {
  id: string;
  entryNumber: string;
  entryDate: Date;
  description: string;
  reference?: string;
  status: 'pending' | 'posted' | 'voided';
  sourceType: 'manual' | 'import' | 'ai_processed';
  lines: JournalLine[];
  createdAt: Date;
}

/**
 * Represents a single line item in a journal entry
 */
export interface JournalLine {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  memo?: string;
  taxCategory?: string;
}

// ============================================================================
// Document Processing
// ============================================================================

/**
 * Represents a source document uploaded for processing
 */
export interface SourceDocument {
  id: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  aiExtractedData?: ExtractedDocumentData;
  createdAt: Date;
}

/**
 * Data extracted from documents via AI processing
 */
export interface ExtractedDocumentData {
  documentType: string;
  vendor?: string;
  date?: Date;
  totalAmount?: number;
  lineItems?: Array<{
    description: string;
    amount: number;
    quantity?: number;
  }>;
  taxAmount?: number;
  referenceNumber?: string;
}

// ============================================================================
// AI Classification
// ============================================================================

/**
 * Represents an AI-generated classification suggestion
 */
export interface Classification {
  id: string;
  transactionDescription: string;
  suggestedAccount: string;
  confidence: number;
  isVerified: boolean;
}

// ============================================================================
// Tax Reporting
// ============================================================================

/**
 * Summary data for tax reporting period
 */
export interface TaxSummary {
  taxYear: number;
  grossIncome: number;
  totalExpenses: number;
  netProfit: number;
  expensesByCategory: Record<string, number>;
  formLines: TaxFormLine[];
  uncategorizedTotal: number;
}

/**
 * Represents a single line on a tax form
 */
export interface TaxFormLine {
  form: string;
  line: string;
  lineName: string;
  amount: number;
  taxCategory?: string;
}

// ============================================================================
// Financial Reports
// ============================================================================

/**
 * Balance Sheet report data
 */
export interface BalanceSheet {
  asOfDate: Date;
  assets: BalanceSheetSection;
  liabilities: BalanceSheetSection;
  equity: BalanceSheetSection;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
}

/**
 * Section within a Balance Sheet (Assets, Liabilities, or Equity)
 */
export interface BalanceSheetSection {
  accounts: Array<{
    accountId: string;
    accountCode: string;
    accountName: string;
    balance: number;
  }>;
  subtotal: number;
}

/**
 * Income Statement (Profit & Loss) report data
 */
export interface IncomeStatement {
  startDate: Date;
  endDate: Date;
  revenue: IncomeStatementSection;
  expenses: IncomeStatementSection;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
}

/**
 * Section within an Income Statement (Revenue or Expenses)
 */
export interface IncomeStatementSection {
  accounts: Array<{
    accountId: string;
    accountCode: string;
    accountName: string;
    amount: number;
  }>;
  subtotal: number;
}

/**
 * General Ledger report data
 */
export interface GeneralLedger {
  accountId: string;
  accountCode: string;
  accountName: string;
  startDate: Date;
  endDate: Date;
  openingBalance: number;
  closingBalance: number;
  transactions: GeneralLedgerTransaction[];
}

/**
 * Individual transaction in a General Ledger
 */
export interface GeneralLedgerTransaction {
  date: Date;
  entryNumber: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

/**
 * Trial Balance report data
 */
export interface TrialBalance {
  asOfDate: Date;
  accounts: Array<{
    accountCode: string;
    accountName: string;
    accountType: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
    debit: number;
    credit: number;
  }>;
  totalDebits: number;
  totalCredits: number;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Common response type for API operations
 */
export interface AccountingResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Pagination parameters for list queries
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Filter parameters for journal entries
 */
export interface JournalEntryFilter {
  startDate?: Date;
  endDate?: Date;
  status?: 'pending' | 'posted' | 'voided';
  sourceType?: 'manual' | 'import' | 'ai_processed';
  accountId?: string;
}

/**
 * Filter parameters for accounts
 */
export interface AccountFilter {
  accountType?: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  isActive?: boolean;
  parentId?: string;
  taxCategory?: string;
}
