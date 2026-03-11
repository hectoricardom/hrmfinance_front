/**
 * Accounting API Service
 * Handles all accounting-related API calls including accounts, transactions,
 * documents, reports, and tax operations
 */

import { fetchGraphQLSS } from '../../../services/utils';
import { authStore } from '../../../stores/authStore';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface Account {
  id: string;
  accountNumber: string;
  accountName: string;
  accountType: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  parentAccountId?: string;
  balance: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Extended properties for Tax Center
  name?: string; // Alias for accountName for compatibility
  type?: string; // Alias for accountType for compatibility
  currentCategory?: string;
  transactionCount?: number;
}

export interface AccountTreeNode extends Account {
  children?: AccountTreeNode[];
  level: number;
}

export interface AccountBalance {
  accountId: string;
  balance: number;
  debitBalance: number;
  creditBalance: number;
  asOfDate: string;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  description: string;
  reference?: string;
  status: 'draft' | 'posted' | 'void';
  lines: JournalEntryLine[];
  totalDebit: number;
  totalCredit: number;
  createdBy: string;
  createdAt: string;
  postedAt?: string;
  voidedAt?: string;
}

export interface JournalEntryLine {
  id: string;
  accountId: string;
  accountName?: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface SourceDocument {
  id: string;
  documentNumber: string;
  documentType: string;
  date: string;
  vendor?: string;
  amount: number;
  fileUrl?: string;
  fileName?: string;
  status: 'pending' | 'processed' | 'reviewed';
  aiProcessed: boolean;
  extractedData?: any;
  journalEntryId?: string;
  createdAt: string;
}

export interface BalanceSheetReport {
  asOfDate: string;
  assets: AccountBalance[];
  liabilities: AccountBalance[];
  equity: AccountBalance[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
}

export interface IncomeStatementReport {
  startDate: string;
  endDate: string;
  revenue: AccountBalance[];
  expenses: AccountBalance[];
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
}

export interface TrialBalanceReport {
  asOfDate: string;
  accounts: Array<{
    accountId: string;
    accountNumber: string;
    accountName: string;
    debit: number;
    credit: number;
  }>;
  totalDebit: number;
  totalCredit: number;
}

export interface TaxSummary {
  year: number;
  totalRevenue: number;
  totalExpenses: number;
  taxableIncome: number;
  estimatedTax: number;
  quarterlyBreakdown: Array<{
    quarter: number;
    revenue: number;
    expenses: number;
    taxableIncome: number;
  }>;
  // Extended properties for Tax Center
  grossIncome?: number;
  netProfit?: number;
  uncategorizedCount?: number;
  totalDeductions?: number;
  categories?: Array<{
    name: string;
    scheduleLine: string;
    amount: number;
    percentage?: number;
  }>;
  aiAnalysis?: string;
}

export interface DataCompleteness {
  totalTransactions: number;
  categorizedTransactions: number;
  missingCategories: string[];
  warnings: string[];
  ready: boolean;
}

export interface ExportResult {
  downloadUrl: string;
  filename: string;
  format: string;
}

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  accountId?: string;
  status?: 'draft' | 'posted' | 'void';
  searchTerm?: string;
}

// =============================================================================
// ACCOUNTS API
// =============================================================================

/**
 * Get all accounting accounts for the current business
 */
export async function getAccounts(): Promise<Account[]> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getAccountingAccounts',
      params: {
        businessId: authStore.getBusinessId()
      }
    });

    return result?.accounts || [];
  } catch (error) {
    console.error('Error getting accounts:', error);
    return [];
  }
}

/**
 * Update tax category for a single account
 */
export async function updateAccountTaxCategory(accountId: string, taxCategory: string): Promise<boolean> {
  try {
    const result = await fetchGraphQLSS({
      query: 'updateAccountTaxCategory',
      params: {
        businessId: authStore.getBusinessId(),
        accountId: accountId,
        taxCategory: taxCategory
      }
    });

    return result?.success || false;
  } catch (error) {
    console.error('Error updating account tax category:', error);
    return false;
  }
}

/**
 * Bulk update tax categories for multiple accounts
 */
export async function bulkUpdateTaxCategories(
  updates: { accountId: string; taxCategory: string }[]
): Promise<boolean> {
  try {
    const result = await fetchGraphQLSS({
      query: 'bulkUpdateTaxCategories',
      params: {
        businessId: authStore.getBusinessId(),
        updates: updates
      }
    });

    return result?.success || false;
  } catch (error) {
    console.error('Error bulk updating tax categories:', error);
    return false;
  }
}

/**
 * Get account hierarchy as a tree structure
 */
export async function getAccountTree(): Promise<AccountTreeNode[]> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getAccountingAccountTree',
      params: {
        businessId: authStore.getBusinessId()
      }
    });

    return result?.accountTree || [];
  } catch (error) {
    console.error('Error getting account tree:', error);
    return [];
  }
}

/**
 * Get a specific account by ID
 */
export async function getAccountById(id: string): Promise<Account | null> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getAccountingAccountById',
      params: {
        businessId: authStore.getBusinessId(),
        accountId: id
      }
    });

    return result?.account || null;
  } catch (error) {
    console.error('Error getting account by ID:', error);
    return null;
  }
}

/**
 * Get account balance as of a specific date
 */
export async function getAccountBalance(
  id: string,
  asOfDate?: string
): Promise<AccountBalance | null> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getAccountBalance',
      params: {
        businessId: authStore.getBusinessId(),
        accountId: id,
        asOfDate: asOfDate || new Date().toISOString().split('T')[0]
      }
    });

    return result?.balance || null;
  } catch (error) {
    console.error('Error getting account balance:', error);
    return null;
  }
}

/**
 * Create a new account
 */
export async function createAccount(data: {
  accountNumber: string;
  accountName: string;
  accountType: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  parentAccountId?: string;
  description?: string;
}): Promise<Account | null> {
  try {
    const result = await fetchGraphQLSS({
      query: 'createAccountingAccount',
      params: {
        businessId: authStore.getBusinessId(),
        ...data
      }
    });

    return result?.account || null;
  } catch (error) {
    console.error('Error creating account:', error);
    return null;
  }
}

/**
 * Update an existing account
 */
export async function updateAccount(
  id: string,
  data: {
    accountName?: string;
    accountType?: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
    parentAccountId?: string;
    description?: string;
    isActive?: boolean;
  }
): Promise<Account | null> {
  try {
    const result = await fetchGraphQLSS({
      query: 'updateAccountingAccount',
      params: {
        businessId: authStore.getBusinessId(),
        accountId: id,
        ...data
      }
    });

    return result?.account || null;
  } catch (error) {
    console.error('Error updating account:', error);
    return null;
  }
}

/**
 * Delete an account (soft delete if has transactions)
 */
export async function deleteAccount(id: string): Promise<boolean> {
  try {
    const result = await fetchGraphQLSS({
      query: 'deleteAccountingAccount',
      params: {
        businessId: authStore.getBusinessId(),
        accountId: id
      }
    });

    return result?.success || false;
  } catch (error) {
    console.error('Error deleting account:', error);
    return false;
  }
}

// =============================================================================
// TRANSACTIONS API
// =============================================================================

/**
 * Get journal entries with optional filters
 */
export async function getTransactions(
  filters?: TransactionFilters
): Promise<JournalEntry[]> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getJournalEntries',
      params: {
        businessId: authStore.getBusinessId(),
        startDate: filters?.startDate,
        endDate: filters?.endDate,
        accountId: filters?.accountId,
        status: filters?.status,
        searchTerm: filters?.searchTerm
      }
    });

    return result?.journalEntries || [];
  } catch (error) {
    console.error('Error getting transactions:', error);
    return [];
  }
}

/**
 * Get a specific journal entry by ID
 */
export async function getTransactionById(id: string): Promise<JournalEntry | null> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getJournalEntryById',
      params: {
        businessId: authStore.getBusinessId(),
        journalEntryId: id
      }
    });

    return result?.journalEntry || null;
  } catch (error) {
    console.error('Error getting transaction by ID:', error);
    return null;
  }
}

/**
 * Create a new journal entry
 */
export async function createTransaction(data: {
  date: string;
  description: string;
  reference?: string;
  lines: Array<{
    accountId: string;
    debit: number;
    credit: number;
    description?: string;
  }>;
}): Promise<JournalEntry | null> {
  try {
    const result = await fetchGraphQLSS({
      query: 'createJournalEntry',
      params: {
        businessId: authStore.getBusinessId(),
        ...data
      }
    });

    return result?.journalEntry || null;
  } catch (error) {
    console.error('Error creating transaction:', error);
    return null;
  }
}

/**
 * Post a journal entry (change status from draft to posted)
 */
export async function postTransaction(id: string): Promise<boolean> {
  try {
    const result = await fetchGraphQLSS({
      query: 'postJournalEntry',
      params: {
        businessId: authStore.getBusinessId(),
        journalEntryId: id
      }
    });

    return result?.success || false;
  } catch (error) {
    console.error('Error posting transaction:', error);
    return false;
  }
}

/**
 * Void a journal entry
 */
export async function voidTransaction(id: string): Promise<boolean> {
  try {
    const result = await fetchGraphQLSS({
      query: 'voidJournalEntry',
      params: {
        businessId: authStore.getBusinessId(),
        journalEntryId: id
      }
    });

    return result?.success || false;
  } catch (error) {
    console.error('Error voiding transaction:', error);
    return false;
  }
}

// =============================================================================
// DOCUMENTS API
// =============================================================================

/**
 * Get all source documents
 */
export async function getDocuments(): Promise<SourceDocument[]> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getSourceDocuments',
      params: {
        businessId: authStore.getBusinessId()
      }
    });

    return result?.documents || [];
  } catch (error) {
    console.error('Error getting documents:', error);
    return [];
  }
}

/**
 * Get a specific source document by ID
 */
export async function getDocumentById(id: string): Promise<SourceDocument | null> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getSourceDocumentById',
      params: {
        businessId: authStore.getBusinessId(),
        documentId: id
      }
    });

    return result?.document || null;
  } catch (error) {
    console.error('Error getting document by ID:', error);
    return null;
  }
}

/**
 * Upload a source document file
 */
export async function uploadDocument(file: File): Promise<SourceDocument | null> {
  try {
    const result = await fetchGraphQLSS({
      query: 'uploadSourceDocument',
      params: {
        businessId: authStore.getBusinessId(),
        file: file
      }
    });

    return result?.document || null;
  } catch (error) {
    console.error('Error uploading document:', error);
    return null;
  }
}

/**
 * Process a document with AI to extract accounting data
 */
export async function processDocument(id: string): Promise<{
  success: boolean;
  extractedData?: any;
  suggestedJournalEntry?: JournalEntry;
}> {
  try {
    const result = await fetchGraphQLSS({
      query: 'processDocumentWithAI',
      params: {
        businessId: authStore.getBusinessId(),
        documentId: id
      }
    });

    return {
      success: result?.success || false,
      extractedData: result?.extractedData,
      suggestedJournalEntry: result?.suggestedJournalEntry
    };
  } catch (error) {
    console.error('Error processing document:', error);
    return {
      success: false
    };
  }
}

// =============================================================================
// REPORTS API
// =============================================================================

/**
 * Get Balance Sheet report
 */
export async function getBalanceSheet(asOfDate: string): Promise<BalanceSheetReport | null> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getBalanceSheet',
      params: {
        businessId: authStore.getBusinessId(),
        asOfDate: asOfDate
      }
    });

    return result?.balanceSheet || null;
  } catch (error) {
    console.error('Error getting balance sheet:', error);
    return null;
  }
}

/**
 * Get Income Statement report
 */
export async function getIncomeStatement(
  startDate: string,
  endDate: string
): Promise<IncomeStatementReport | null> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getIncomeStatement',
      params: {
        businessId: authStore.getBusinessId(),
        startDate: startDate,
        endDate: endDate
      }
    });

    return result?.incomeStatement || null;
  } catch (error) {
    console.error('Error getting income statement:', error);
    return null;
  }
}

/**
 * Get Trial Balance report
 */
export async function getTrialBalance(asOfDate: string): Promise<TrialBalanceReport | null> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getTrialBalance',
      params: {
        businessId: authStore.getBusinessId(),
        asOfDate: asOfDate
      }
    });

    return result?.trialBalance || null;
  } catch (error) {
    console.error('Error getting trial balance:', error);
    return null;
  }
}

// =============================================================================
// TAX API
// =============================================================================

/**
 * Get tax summary for a specific year
 */
export async function getTaxSummary(year: number): Promise<TaxSummary | null> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getTaxSummary',
      params: {
        businessId: authStore.getBusinessId(),
        year: year
      }
    });

    return result?.taxSummary || null;
  } catch (error) {
    console.error('Error getting tax summary:', error);
    return null;
  }
}

/**
 * Get AI-powered tax analysis
 */
export async function getTaxAnalysis(year: number): Promise<{
  success: boolean;
  analysis?: string;
  recommendations?: string[];
  deductions?: Array<{
    category: string;
    amount: number;
    description: string;
  }>;
}> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getTaxAnalysisAI',
      params: {
        businessId: authStore.getBusinessId(),
        year: year
      }
    });

    return {
      success: result?.success || false,
      analysis: result?.analysis,
      recommendations: result?.recommendations,
      deductions: result?.deductions
    };
  } catch (error) {
    console.error('Error getting tax analysis:', error);
    return {
      success: false
    };
  }
}

/**
 * Download Drake Tax Software export CSV
 */
export async function downloadDrakeExport(year: number): Promise<{
  success: boolean;
  csvUrl?: string;
  fileName?: string;
}> {
  try {
    const result = await fetchGraphQLSS({
      query: 'exportDrakeCSV',
      params: {
        businessId: authStore.getBusinessId(),
        year: year
      }
    });

    return {
      success: result?.success || false,
      csvUrl: result?.csvUrl,
      fileName: result?.fileName
    };
  } catch (error) {
    console.error('Error downloading Drake export:', error);
    return {
      success: false
    };
  }
}

/**
 * Validate tax data completeness
 */
export async function validateTaxData(year: number): Promise<DataCompleteness> {
  try {
    const result = await fetchGraphQLSS({
      query: 'validateTaxData',
      params: {
        businessId: authStore.getBusinessId(),
        year: year
      }
    });

    return result?.validation || {
      totalTransactions: 0,
      categorizedTransactions: 0,
      missingCategories: [],
      warnings: [],
      ready: false
    };
  } catch (error) {
    console.error('Error validating tax data:', error);
    return {
      totalTransactions: 0,
      categorizedTransactions: 0,
      missingCategories: [],
      warnings: ['Failed to validate tax data'],
      ready: false
    };
  }
}

/**
 * Export tax data in specified format
 */
export async function exportTaxData(year: number, format: string): Promise<ExportResult> {
  try {
    const result = await fetchGraphQLSS({
      query: 'exportTaxData',
      params: {
        businessId: authStore.getBusinessId(),
        year: year,
        format: format
      }
    });

    return result?.export || {
      downloadUrl: '',
      filename: '',
      format: format
    };
  } catch (error) {
    console.error('Error exporting tax data:', error);
    throw error;
  }
}

// =============================================================================
// ACCOUNT TEMPLATES API
// =============================================================================

export interface AccountTemplate {
  id: string;
  name: string;
  description: string;
  industry: string;
  accounts: Array<{
    accountNumber: string;
    accountName: string;
    accountType: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
    parentAccountNumber?: string;
    taxCategory?: string;
  }>;
}

export interface AccountTemplatePreview {
  template: AccountTemplate;
  accountsToCreate: number;
  existingConflicts: Array<{
    accountNumber: string;
    existingName: string;
    templateName: string;
  }>;
  estimatedSetupTime: string;
}

/**
 * Get all available account templates
 */
export async function getAccountTemplates(): Promise<AccountTemplate[]> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getAccountTemplates',
      params: {
        businessId: authStore.getBusinessId()
      }
    });

    return result?.templates || [];
  } catch (error) {
    console.error('Error getting account templates:', error);
    return [];
  }
}

/**
 * Preview what would happen if a template is applied
 */
export async function previewAccountTemplate(templateId: string): Promise<AccountTemplatePreview | null> {
  try {
    const result = await fetchGraphQLSS({
      query: 'previewAccountTemplate',
      params: {
        businessId: authStore.getBusinessId(),
        templateId: templateId
      }
    });

    return result?.preview || null;
  } catch (error) {
    console.error('Error previewing account template:', error);
    return null;
  }
}

/**
 * Apply an account template to create accounts
 */
export async function applyAccountTemplate(templateId: string, options?: {
  skipConflicts?: boolean;
  overwriteExisting?: boolean;
}): Promise<{
  success: boolean;
  accountsCreated: number;
  errors?: string[];
}> {
  try {
    const result = await fetchGraphQLSS({
      query: 'applyAccountTemplate',
      params: {
        businessId: authStore.getBusinessId(),
        templateId: templateId,
        skipConflicts: options?.skipConflicts || false,
        overwriteExisting: options?.overwriteExisting || false
      }
    });

    return {
      success: result?.success || false,
      accountsCreated: result?.accountsCreated || 0,
      errors: result?.errors
    };
  } catch (error) {
    console.error('Error applying account template:', error);
    return {
      success: false,
      accountsCreated: 0,
      errors: [(error as Error).message]
    };
  }
}

// =============================================================================
// JOURNAL ENTRY VALIDATION API
// =============================================================================

export interface JournalEntryValidation {
  isValid: boolean;
  isBalanced: boolean;
  totalDebit: number;
  totalCredit: number;
  errors: string[];
  warnings: string[];
  suggestions?: Array<{
    field: string;
    suggestion: string;
  }>;
}

/**
 * Validate a journal entry before saving
 */
export async function validateJournalEntry(entry: {
  date: string;
  description: string;
  lines: Array<{
    accountId: string;
    debit: number;
    credit: number;
    description?: string;
  }>;
}): Promise<JournalEntryValidation> {
  try {
    const result = await fetchGraphQLSS({
      query: 'validateJournalEntry',
      params: {
        businessId: authStore.getBusinessId(),
        ...entry
      }
    });

    return result?.validation || {
      isValid: false,
      isBalanced: false,
      totalDebit: 0,
      totalCredit: 0,
      errors: ['Validation failed'],
      warnings: []
    };
  } catch (error) {
    console.error('Error validating journal entry:', error);
    return {
      isValid: false,
      isBalanced: false,
      totalDebit: 0,
      totalCredit: 0,
      errors: [(error as Error).message],
      warnings: []
    };
  }
}

// =============================================================================
// ACCOUNTING SUMMARY API
// =============================================================================

export interface AccountingSummary {
  totalAccounts: number;
  totalTransactions: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  cashBalance: number;
  recentActivity: Array<{
    id: string;
    date: string;
    description: string;
    amount: number;
    type: 'debit' | 'credit';
  }>;
  pendingTransactions: number;
  unprocessedDocuments: number;
  lastUpdated: string;
}

/**
 * Get comprehensive accounting summary/dashboard data
 */
export async function getAccountingSummary(): Promise<AccountingSummary | null> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getAccountingSummary',
      params: {
        businessId: authStore.getBusinessId()
      }
    });

    return result?.summary || null;
  } catch (error) {
    console.error('Error getting accounting summary:', error);
    return null;
  }
}

// =============================================================================
// ACCOUNTING RULE RECOMMENDATIONS API
// =============================================================================

export interface AccountingRule {
  id: string;
  name: string;
  description: string;
  ruleType: 'auto_categorize' | 'auto_split' | 'auto_reconcile' | 'alert' | 'validation';
  triggerType: 'transaction_created' | 'document_uploaded' | 'invoice_generated' | 'inventory_movement';
  conditions: Array<{
    field: string;
    operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'regex';
    value: string;
  }>;
  actions: Array<{
    actionType: 'set_account' | 'split_amount' | 'add_tag' | 'send_alert' | 'create_entry';
    parameters: Record<string, any>;
  }>;
  priority: number;
  isActive: boolean;
}

export interface RuleRecommendation {
  rule: AccountingRule;
  confidence: number;
  reason: string;
  basedOn: string;
  potentialImpact: {
    transactionsAffected: number;
    timeSaved: string;
  };
}

export interface RuleTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  rule: Omit<AccountingRule, 'id'>;
  requiredConfiguration: string[];
}

export interface BusinessAnalysis {
  industry: string;
  transactionPatterns: Array<{
    pattern: string;
    frequency: number;
    suggestedRule: string;
  }>;
  commonVendors: Array<{
    name: string;
    transactionCount: number;
    suggestedCategory: string;
  }>;
  revenueStreams: Array<{
    description: string;
    percentage: number;
  }>;
  expenseCategories: Array<{
    category: string;
    percentage: number;
    trend: 'increasing' | 'stable' | 'decreasing';
  }>;
}

/**
 * Analyze business data to suggest accounting rules
 */
export async function analyzeBusinessForRules(): Promise<BusinessAnalysis | null> {
  try {
    const result = await fetchGraphQLSS({
      query: 'analyzeBusinessForRules',
      params: {
        businessId: authStore.getBusinessId()
      }
    });

    return result?.analysis || null;
  } catch (error) {
    console.error('Error analyzing business for rules:', error);
    return null;
  }
}

/**
 * Get AI-recommended accounting rules based on business analysis
 */
export async function getRecommendedAccountingRules(): Promise<RuleRecommendation[]> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getRecommendedAccountingRules',
      params: {
        businessId: authStore.getBusinessId()
      }
    });

    return result?.recommendations || [];
  } catch (error) {
    console.error('Error getting recommended accounting rules:', error);
    return [];
  }
}

/**
 * Get rule recommendations with optional filtering
 */
export async function getRuleRecommendations(filters?: {
  ruleType?: AccountingRule['ruleType'];
  minConfidence?: number;
  limit?: number;
}): Promise<RuleRecommendation[]> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getRuleRecommendations',
      params: {
        businessId: authStore.getBusinessId(),
        ruleType: filters?.ruleType,
        minConfidence: filters?.minConfidence,
        limit: filters?.limit
      }
    });

    return result?.recommendations || [];
  } catch (error) {
    console.error('Error getting rule recommendations:', error);
    return [];
  }
}

/**
 * Get rules filtered by type
 */
export async function getRulesForType(ruleType: AccountingRule['ruleType']): Promise<AccountingRule[]> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getRulesForType',
      params: {
        businessId: authStore.getBusinessId(),
        ruleType: ruleType
      }
    });

    return result?.rules || [];
  } catch (error) {
    console.error('Error getting rules for type:', error);
    return [];
  }
}

/**
 * Analyze invoices to suggest account mappings
 */
export async function analyzeInvoicesForAccounts(): Promise<Array<{
  vendorName: string;
  suggestedAccount: Account;
  confidence: number;
  invoiceCount: number;
}>> {
  try {
    const result = await fetchGraphQLSS({
      query: 'analyzeInvoicesForAccounts',
      params: {
        businessId: authStore.getBusinessId()
      }
    });

    return result?.suggestions || [];
  } catch (error) {
    console.error('Error analyzing invoices for accounts:', error);
    return [];
  }
}

/**
 * Analyze inventory movements to suggest COGS accounts
 */
export async function analyzeInventoryForCOGS(): Promise<{
  suggestedCOGSAccount: Account | null;
  inventoryAccount: Account | null;
  recommendations: string[];
  monthlyEstimate: number;
}> {
  try {
    const result = await fetchGraphQLSS({
      query: 'analyzeInventoryForCOGS',
      params: {
        businessId: authStore.getBusinessId()
      }
    });

    return result || {
      suggestedCOGSAccount: null,
      inventoryAccount: null,
      recommendations: [],
      monthlyEstimate: 0
    };
  } catch (error) {
    console.error('Error analyzing inventory for COGS:', error);
    return {
      suggestedCOGSAccount: null,
      inventoryAccount: null,
      recommendations: [],
      monthlyEstimate: 0
    };
  }
}

/**
 * Get available rule templates
 */
export async function getAvailableRuleTemplates(): Promise<RuleTemplate[]> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getAvailableRuleTemplates',
      params: {
        businessId: authStore.getBusinessId()
      }
    });

    return result?.templates || [];
  } catch (error) {
    console.error('Error getting available rule templates:', error);
    return [];
  }
}

/**
 * Get a specific rule template by ID
 */
export async function getRuleTemplate(templateId: string): Promise<RuleTemplate | null> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getRuleTemplate',
      params: {
        businessId: authStore.getBusinessId(),
        templateId: templateId
      }
    });

    return result?.template || null;
  } catch (error) {
    console.error('Error getting rule template:', error);
    return null;
  }
}

/**
 * Create a custom accounting rule
 */
export async function createCustomRule(rule: Omit<AccountingRule, 'id'>): Promise<AccountingRule | null> {
  try {
    const result = await fetchGraphQLSS({
      query: 'createCustomRule',
      params: {
        businessId: authStore.getBusinessId(),
        rule: rule
      }
    });

    return result?.rule || null;
  } catch (error) {
    console.error('Error creating custom rule:', error);
    return null;
  }
}

// =============================================================================
// EXTENDED TAX EXPORT API
// =============================================================================

export interface ScheduleC {
  year: number;
  businessName: string;
  ein?: string;
  grossReceipts: number;
  returnsAndAllowances: number;
  grossProfit: number;
  costOfGoodsSold: number;
  expenses: {
    advertising: number;
    carAndTruck: number;
    commissions: number;
    contractLabor: number;
    depreciation: number;
    insurance: number;
    interest: number;
    legal: number;
    officeExpense: number;
    pensionPlans: number;
    rentBusiness: number;
    rentEquipment: number;
    repairs: number;
    supplies: number;
    taxes: number;
    travel: number;
    meals: number;
    utilities: number;
    wages: number;
    otherExpenses: number;
  };
  totalExpenses: number;
  netProfitOrLoss: number;
  homeOfficeDeduction?: number;
}

export interface Form1120 {
  year: number;
  corporationName: string;
  ein: string;
  grossReceipts: number;
  totalIncome: number;
  totalDeductions: number;
  taxableIncome: number;
  totalTax: number;
  schedules: {
    scheduleA: any; // Cost of Goods Sold
    scheduleC: any; // Dividends and Special Deductions
    scheduleJ: any; // Tax Computation
    scheduleK: any; // Other Information
    scheduleL: any; // Balance Sheets
    scheduleM1: any; // Reconciliation
    scheduleM2: any; // Retained Earnings
  };
}

export interface UncategorizedTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  accountId?: string;
  accountName?: string;
  suggestedCategory?: string;
  confidence?: number;
}

export interface TaxPackage {
  year: number;
  generatedAt: string;
  files: Array<{
    name: string;
    type: string;
    downloadUrl: string;
  }>;
  summary: {
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
    estimatedTax: number;
  };
  formsIncluded: string[];
}

/**
 * Export data to TurboTax format
 */
export async function exportToTurboTax(year: number): Promise<ExportResult> {
  try {
    const result = await fetchGraphQLSS({
      query: 'exportToTurboTax',
      params: {
        businessId: authStore.getBusinessId(),
        year: year
      }
    });

    return result?.export || {
      downloadUrl: '',
      filename: '',
      format: 'turbotax'
    };
  } catch (error) {
    console.error('Error exporting to TurboTax:', error);
    throw error;
  }
}

/**
 * Get uncategorized transactions that need tax categories
 */
export async function getUncategorizedTransactions(year?: number): Promise<UncategorizedTransaction[]> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getUncategorizedTransactions',
      params: {
        businessId: authStore.getBusinessId(),
        year: year || new Date().getFullYear()
      }
    });

    return result?.transactions || [];
  } catch (error) {
    console.error('Error getting uncategorized transactions:', error);
    return [];
  }
}

/**
 * Get AI-powered tax optimization analysis
 */
export async function analyzeTaxOptimization(year: number): Promise<{
  currentTaxLiability: number;
  potentialSavings: number;
  recommendations: Array<{
    category: string;
    description: string;
    potentialSavings: number;
    difficulty: 'easy' | 'medium' | 'hard';
    deadline?: string;
  }>;
  missingDeductions: Array<{
    category: string;
    typicalAmount: number;
    description: string;
  }>;
  riskAreas: Array<{
    area: string;
    risk: 'low' | 'medium' | 'high';
    description: string;
  }>;
}> {
  try {
    const result = await fetchGraphQLSS({
      query: 'analyzeTaxOptimization',
      params: {
        businessId: authStore.getBusinessId(),
        year: year
      }
    });

    return result || {
      currentTaxLiability: 0,
      potentialSavings: 0,
      recommendations: [],
      missingDeductions: [],
      riskAreas: []
    };
  } catch (error) {
    console.error('Error analyzing tax optimization:', error);
    return {
      currentTaxLiability: 0,
      potentialSavings: 0,
      recommendations: [],
      missingDeductions: [],
      riskAreas: []
    };
  }
}

/**
 * Get Schedule C data for self-employment
 */
export async function getScheduleC(year: number): Promise<ScheduleC | null> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getScheduleC',
      params: {
        businessId: authStore.getBusinessId(),
        year: year
      }
    });

    return result?.scheduleC || null;
  } catch (error) {
    console.error('Error getting Schedule C:', error);
    return null;
  }
}

/**
 * Get Form 1120 data for corporations
 */
export async function getForm1120(year: number): Promise<Form1120 | null> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getForm1120',
      params: {
        businessId: authStore.getBusinessId(),
        year: year
      }
    });

    return result?.form1120 || null;
  } catch (error) {
    console.error('Error getting Form 1120:', error);
    return null;
  }
}

/**
 * Export complete tax package with all forms and supporting documents
 */
export async function exportFullTaxPackage(year: number, options?: {
  includeScheduleC?: boolean;
  includeForm1120?: boolean;
  includeSupportingDocs?: boolean;
  format?: 'pdf' | 'csv' | 'xlsx';
}): Promise<TaxPackage | null> {
  try {
    const result = await fetchGraphQLSS({
      query: 'exportFullTaxPackage',
      params: {
        businessId: authStore.getBusinessId(),
        year: year,
        includeScheduleC: options?.includeScheduleC ?? true,
        includeForm1120: options?.includeForm1120 ?? false,
        includeSupportingDocs: options?.includeSupportingDocs ?? true,
        format: options?.format || 'pdf'
      }
    });

    return result?.taxPackage || null;
  } catch (error) {
    console.error('Error exporting full tax package:', error);
    return null;
  }
}

// =============================================================================
// EXTENDED SOURCE DOCUMENTS API
// =============================================================================

export interface DocumentSummary {
  totalDocuments: number;
  pendingProcessing: number;
  processed: number;
  reviewed: number;
  byType: Record<string, number>;
  totalValue: number;
  recentDocuments: SourceDocument[];
}

export interface SuggestedJournalEntry {
  document: SourceDocument;
  suggestedEntry: {
    date: string;
    description: string;
    lines: Array<{
      accountId: string;
      accountName: string;
      debit: number;
      credit: number;
      description?: string;
    }>;
  };
  confidence: number;
  reasoning: string;
  alternativeEntries?: Array<{
    description: string;
    lines: Array<{
      accountId: string;
      accountName: string;
      debit: number;
      credit: number;
    }>;
    confidence: number;
  }>;
}

export interface BatchProcessResult {
  totalProcessed: number;
  successful: number;
  failed: number;
  results: Array<{
    documentId: string;
    success: boolean;
    error?: string;
    extractedData?: any;
  }>;
}

/**
 * Delete a source document
 */
export async function deleteSourceDocument(id: string): Promise<boolean> {
  try {
    const result = await fetchGraphQLSS({
      query: 'deleteSourceDocument',
      params: {
        businessId: authStore.getBusinessId(),
        documentId: id
      }
    });

    return result?.success || false;
  } catch (error) {
    console.error('Error deleting source document:', error);
    return false;
  }
}

/**
 * Get AI-suggested journal entry for a document
 */
export async function suggestJournalEntry(documentId: string): Promise<SuggestedJournalEntry | null> {
  try {
    const result = await fetchGraphQLSS({
      query: 'suggestJournalEntry',
      params: {
        businessId: authStore.getBusinessId(),
        documentId: documentId
      }
    });

    return result?.suggestion || null;
  } catch (error) {
    console.error('Error suggesting journal entry:', error);
    return null;
  }
}

/**
 * Get processing status for a document
 */
export async function getDocumentProcessingStatus(id: string): Promise<{
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  message?: string;
  estimatedCompletion?: string;
}> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getDocumentProcessingStatus',
      params: {
        businessId: authStore.getBusinessId(),
        documentId: id
      }
    });

    return result || {
      status: 'pending'
    };
  } catch (error) {
    console.error('Error getting document processing status:', error);
    return {
      status: 'failed',
      message: (error as Error).message
    };
  }
}

/**
 * Update a source document
 */
export async function updateSourceDocument(id: string, updates: {
  documentType?: string;
  vendor?: string;
  amount?: number;
  date?: string;
  extractedData?: any;
}): Promise<SourceDocument | null> {
  try {
    const result = await fetchGraphQLSS({
      query: 'updateSourceDocument',
      params: {
        businessId: authStore.getBusinessId(),
        documentId: id,
        ...updates
      }
    });

    return result?.document || null;
  } catch (error) {
    console.error('Error updating source document:', error);
    return null;
  }
}

/**
 * Get summary of all source documents
 */
export async function getSourceDocumentsSummary(): Promise<DocumentSummary | null> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getSourceDocumentsSummary',
      params: {
        businessId: authStore.getBusinessId()
      }
    });

    return result?.summary || null;
  } catch (error) {
    console.error('Error getting source documents summary:', error);
    return null;
  }
}

/**
 * Batch process multiple documents with AI
 */
export async function batchProcessDocuments(documentIds: string[]): Promise<BatchProcessResult> {
  try {
    const result = await fetchGraphQLSS({
      query: 'batchProcessDocuments',
      params: {
        businessId: authStore.getBusinessId(),
        documentIds: documentIds
      }
    });

    return result || {
      totalProcessed: 0,
      successful: 0,
      failed: documentIds.length,
      results: []
    };
  } catch (error) {
    console.error('Error batch processing documents:', error);
    return {
      totalProcessed: 0,
      successful: 0,
      failed: documentIds.length,
      results: []
    };
  }
}

/**
 * Download a source document file
 */
export async function downloadSourceDocument(id: string): Promise<{
  downloadUrl: string;
  fileName: string;
  mimeType: string;
} | null> {
  try {
    const result = await fetchGraphQLSS({
      query: 'downloadSourceDocument',
      params: {
        businessId: authStore.getBusinessId(),
        documentId: id
      }
    });

    return result || null;
  } catch (error) {
    console.error('Error downloading source document:', error);
    return null;
  }
}

// =============================================================================
// AI RULE GENERATION
// =============================================================================

export interface GeneratedRule {
  name: string;
  description: string;
  ruleType: string;
  triggerType: string;
  conditions: Array<{
    field: string;
    operator: string;
    value: string;
  }>;
  actions: Array<{
    actionType: string;
    parameters: Record<string, any>;
  }>;
  confidence?: number;
  reasoning?: string;
}

/**
 * Generate an accounting rule using AI based on input data
 * @param inputData - Description or data to generate rule from (e.g., "categorize Amazon purchases as office supplies")
 * @param eventType - The event type that triggers the rule (e.g., "transaction_created", "document_uploaded")
 */
export async function generateRuleFromAI(
  inputData: string,
  eventType: string
): Promise<GeneratedRule | null> {
  try {
    const result = await fetchGraphQLSS({
      query: 'generateRuleFromData',
      params: {
        
      },
      businessId: authStore.getBusinessId(),
        eventType: eventType,
        inputData: inputData
    });

    return result?.data || result || null;
  } catch (error) {
    console.error('Error generating rule from AI:', error);
    throw error;
  }
}

// =============================================================================
// AI LEARNING ENGINE TYPES
// =============================================================================

export interface SuggestedRule {
  id: string;
  name: string;
  description: string;
  businessId: string;
  eventType: string;
  status: 'pending' | 'approved' | 'rejected';
  generatedBy: 'ai';
  generatedAt: string;
  analyzedInvoices: number;
  sourceCollection: string;
  useAI: 'smart' | 'always' | false;
  conditions?: RuleCondition[];
  journalEntryTemplate: JournalEntryTemplate;
  approvedAt?: string;
  activeRuleId?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  editedByUser?: boolean;
  updatedAt?: string;
}

export interface RuleCondition {
  field: string;
  operator: 'equals' | 'greaterThan' | 'lessThan' | 'exists' | 'contains';
  value: any;
}

export interface JournalEntryTemplate {
  description: string;
  reference: string;
  lines: JournalLineTemplate[];
}

export interface JournalLineTemplate {
  accountId: string;
  accountExpression: string;
  descriptionTemplate: string;
  amountExpression: string;
  isDebit: boolean;
  conditions?: RuleCondition[];
}

export interface AutomaticRule extends Omit<SuggestedRule, 'status' | 'generatedBy' | 'analyzedInvoices' | 'sourceCollection'> {
  isActive: boolean;
  executionCount?: number;
  lastExecutedAt?: string;
  successRate?: number;
}

export interface EntryBook {
  id: string;
  document: string;
  description: string;
  businessId: string;
  date: string;
  reference: string;
  totalDebits: string;
  totalCredits: string;
  lines: EntryBookLine[];
  sourceId: string;
  sourceType: 'sale' | 'purchase' | 'payment';
  entrySource: 'learning_engine' | 'automatic_rule' | 'manual';
  automatedRule: boolean;
  sourceRuleId?: string;
  confidence?: number;
}

export interface EntryBookLine {
  accountId: string;
  accountNumber: string;
  description: string;
  amount: string;
  isDebit: boolean;
  debitAmount: number;
  creditAmount: number;
}

export interface LearningStats {
  adapters: {
    count: number;
    avgConfidence: number;
    totalProcessed: number;
  };
  accountMappings: {
    count: number;
    avgSuccessRate: number;
  };
  rules: {
    count: number;
    avgSuccessRate: number;
  };
}

export interface LearnedAdapter {
  id: string;
  name: string;
  sourceType: string;
  confidence: number;
  processedCount: number;
  lastUsed: string;
  fields: string[];
}

export interface LearnedAccountMapping {
  id: string;
  sourceField: string;
  accountId: string;
  accountNumber: string;
  accountName: string;
  successRate: number;
  usageCount: number;
}

// =============================================================================
// AI LEARNING ENGINE FUNCTIONS
// =============================================================================

/**
 * Generate AI-suggested rules from invoice patterns
 */
export async function generateSuggestedRules(
  collection: string = 'Invoices',
  sampleSize: number = 10,
  eventType: string = 'invoice_created'
): Promise<{ suggestedRules: number; savedSuggestions: any[]; message: string } | null> {
  try {
    const result = await fetchGraphQLSS({
      query: 'generateSuggestedRules',
      params: { businessId: authStore.getBusinessId() },
      form: { collection, sampleSize, eventType }
    });
    return result?.data || result || null;
  } catch (error) {
    console.error('Error generating suggested rules:', error);
    throw error;
  }
}

/**
 * Get suggested rules by status
 */
export async function getSuggestedRules(
  status: 'pending' | 'approved' | 'rejected' = 'pending'
): Promise<SuggestedRule[]> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getSuggestedRules',
      params: { businessId: authStore.getBusinessId() },
      form: { status }
    });
    return result?.data || result || [];
  } catch (error) {
    console.error('Error getting suggested rules:', error);
    return [];
  }
}

/**
 * Get a single suggested rule by ID
 */
export async function getSuggestedRuleById(id: string): Promise<SuggestedRule | null> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getSuggestedRule',
      params: { businessId: authStore.getBusinessId(), id }
    });
    return result?.data || result || null;
  } catch (error) {
    console.error('Error getting suggested rule:', error);
    return null;
  }
}

/**
 * Edit a suggested rule
 */
export async function editSuggestedRule(
  id: string,
  updates: Partial<SuggestedRule>
): Promise<{ success: boolean; message: string }> {
  try {
    const result = await fetchGraphQLSS({
      query: 'editSuggestedRule',
      params: { businessId: authStore.getBusinessId(), id },
      form: { updates }
    });
    return result?.data || result || { success: false, message: 'Unknown error' };
  } catch (error) {
    console.error('Error editing suggested rule:', error);
    throw error;
  }
}

/**
 * Approve a suggested rule and activate it
 */
export async function approveSuggestedRule(id: string): Promise<{ success: boolean; activeRuleId?: string; message: string }> {
  try {
    const result = await fetchGraphQLSS({
      query: 'approveSuggestedRule',
      params: { businessId: authStore.getBusinessId(), id }
    });
    return result?.data || result || { success: false, message: 'Unknown error' };
  } catch (error) {
    console.error('Error approving suggested rule:', error);
    throw error;
  }
}

/**
 * Reject a suggested rule
 */
export async function rejectSuggestedRule(id: string, reason: string): Promise<{ success: boolean; message: string }> {
  try {
    const result = await fetchGraphQLSS({
      query: 'rejectSuggestedRule',
      params: { businessId: authStore.getBusinessId(), id },
      form: { reason }
    });
    return result?.data || result || { success: false, message: 'Unknown error' };
  } catch (error) {
    console.error('Error rejecting suggested rule:', error);
    throw error;
  }
}

/**
 * Get all active automatic rules
 */
export async function getAllAutomaticRules(): Promise<AutomaticRule[]> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getAllAutomaticRules',
      params: { businessId: authStore.getBusinessId() }
    });
    return result?.data || result || [];
  } catch (error) {
    console.error('Error getting automatic rules:', error);
    return [];
  }
}

/**
 * Test a rule with sample data (dry run)
 */
export async function testAutomaticRule(
  ruleId: string,
  inputData: any
): Promise<{ success: boolean; result?: EntryBook; error?: string }> {
  try {
    const result = await fetchGraphQLSS({
      query: 'testAutomaticRule',
      params: { businessId: authStore.getBusinessId() },
      ruleId,
      inputData
    });
    return result?.data || result || { success: false, error: 'Unknown error' };
  } catch (error) {
    console.error('Error testing automatic rule:', error);
    throw error;
  }
}

/**
 * Execute automatic rules for an event
 */
export async function executeAutomaticRules(
  eventType: string,
  inputData: any
): Promise<{ success: boolean; entriesCreated: number; errors?: string[] }> {
  try {
    const result = await fetchGraphQLSS({
      query: 'executeAutomaticRules',
      params: { businessId: authStore.getBusinessId(), eventType },
      inputData
    });
    return result?.data || result || { success: false, entriesCreated: 0 };
  } catch (error) {
    console.error('Error executing automatic rules:', error);
    throw error;
  }
}

/**
 * Train the system with invoices
 */
export async function trainWithInvoices(options: {
  collection?: string;
  limit?: number;
  createEntryBooks?: boolean;
  forceLearn?: boolean;
  useAIEnhancement?: boolean;
  sampleSize?: number;
} = {}): Promise<{
  total: number;
  successful: number;
  failed: number;
  adaptersImproved: number;
  accountsLearned: number;
  averageConfidence: number;
} | null> {
  try {
    const result = await fetchGraphQLSS({
      query: 'trainWithInvoices',
      params: { businessId: authStore.getBusinessId() },
      form: {
        collection: options.collection || 'Invoices',
        limit: options.limit || 500,
        createEntryBooks: options.createEntryBooks ?? true,
        forceLearn: options.forceLearn ?? true,
        useAIEnhancement: options.useAIEnhancement ?? true,
        sampleSize: options.sampleSize || 5
      }
    });
    return result?.data || result || null;
  } catch (error) {
    console.error('Error training with invoices:', error);
    throw error;
  }
}

/**
 * Train with all available sources
 */
export async function trainWithAllSources(options: {
  collections?: string[];
  limitPerCollection?: number;
  createEntryBooks?: boolean;
} = {}): Promise<any> {
  try {
    const result = await fetchGraphQLSS({
      query: 'trainWithAllSources',
      params: { businessId: authStore.getBusinessId() },
      form: {
        collections: options.collections || ['Invoices', 'InventoryMovements', 'Payments'],
        limitPerCollection: options.limitPerCollection || 200,
        createEntryBooks: options.createEntryBooks ?? true
      }
    });
    return result?.data || result || null;
  } catch (error) {
    console.error('Error training with all sources:', error);
    throw error;
  }
}

/**
 * Process a single source with learning
 */
export async function processSourceWithLearning(
  source: any,
  options: { autoCreateEntryBooks?: boolean; autoLearn?: boolean } = {}
): Promise<{ success: boolean; entryBook?: EntryBook; error?: string }> {
  try {
    const result = await fetchGraphQLSS({
      query: 'processSourceWithLearning',
      params: { businessId: authStore.getBusinessId() },
      form: {
        source,
        autoCreateEntryBooks: options.autoCreateEntryBooks ?? true,
        autoLearn: options.autoLearn ?? true
      }
    });
    return result?.data || result || { success: false, error: 'Unknown error' };
  } catch (error) {
    console.error('Error processing source with learning:', error);
    throw error;
  }
}

/**
 * Get learning statistics
 */
export async function getLearningStats(): Promise<LearningStats | null> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getLearningStats',
      params: { businessId: authStore.getBusinessId() }
    });
    return result?.data || result || null;
  } catch (error) {
    console.error('Error getting learning stats:', error);
    return null;
  }
}

/**
 * Get learned adapters
 */
export async function getLearnedAdapters(): Promise<LearnedAdapter[]> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getLearnedAdapters',
      params: { businessId: authStore.getBusinessId() }
    });
    return result?.data || result || [];
  } catch (error) {
    console.error('Error getting learned adapters:', error);
    return [];
  }
}

/**
 * Get learned account mappings
 */
export async function getLearnedAccountMappings(): Promise<LearnedAccountMapping[]> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getLearnedAccountMappings',
      params: { businessId: authStore.getBusinessId() }
    });
    return result?.data || result || [];
  } catch (error) {
    console.error('Error getting learned account mappings:', error);
    return [];
  }
}

/**
 * Reset all learnings for the business
 */
export async function resetLearnings(confirm: boolean = false): Promise<{ success: boolean; message: string }> {
  if (!confirm) {
    return { success: false, message: 'Confirmation required' };
  }
  try {
    const result = await fetchGraphQLSS({
      query: 'resetLearnings',
      params: { businessId: authStore.getBusinessId() },
      form: { confirm: true }
    });
    return result?.data || result || { success: false, message: 'Unknown error' };
  } catch (error) {
    console.error('Error resetting learnings:', error);
    throw error;
  }
}

/**
 * Get entry books (ledger entries)
 */
export async function getLedgerEntries(options: {
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  sourceType?: string;
  entrySource?: string;
} = {}): Promise<EntryBook[]> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getLedgerEntries',
      params: { businessId: authStore.getBusinessId() },
      form: options
    });
    return result?.data || result || [];
  } catch (error) {
    console.error('Error getting ledger entries:', error);
    return [];
  }
}

/**
 * Validate entry books
 */
export async function validateEntries(entryIds: string[]): Promise<{
  valid: boolean;
  errors: { entryId: string; error: string }[];
}> {
  try {
    const result = await fetchGraphQLSS({
      query: 'validateEntries',
      params: { businessId: authStore.getBusinessId() },
      form: { entryIds }
    });
    return result?.data || result || { valid: false, errors: [] };
  } catch (error) {
    console.error('Error validating entries:', error);
    throw error;
  }
}

/**
 * Toggle automatic rule active status
 */
export async function toggleAutomaticRule(ruleId: string, isActive: boolean): Promise<{ success: boolean; message: string }> {
  try {
    const result = await fetchGraphQLSS({
      query: 'toggleAutomaticRule',
      params: { businessId: authStore.getBusinessId(), ruleId },
      form: { isActive }
    });
    return result?.data || result || { success: false, message: 'Unknown error' };
  } catch (error) {
    console.error('Error toggling automatic rule:', error);
    throw error;
  }
}

/**
 * Delete an automatic rule
 */
export async function deleteAutomaticRule(ruleId: string): Promise<{ success: boolean; message: string }> {
  try {
    const result = await fetchGraphQLSS({
      query: 'deleteAutomaticRule',
      params: { businessId: authStore.getBusinessId(), ruleId }
    });
    return result?.data || result || { success: false, message: 'Unknown error' };
  } catch (error) {
    console.error('Error deleting automatic rule:', error);
    throw error;
  }
}

// =============================================================================
// NAMESPACE EXPORT - For page components using accountingApi.category.method()
// =============================================================================

export const accountingApi = {
  // Accounts
  accounts: {
    getAll: getAccounts,
    getById: getAccountById,
    getTree: getAccountTree,
    getBalance: getAccountBalance,
    create: createAccount,
    update: updateAccount,
    delete: deleteAccount,
    updateTaxCategory: updateAccountTaxCategory,
    bulkUpdateTaxCategories: bulkUpdateTaxCategories
  },

  // Account Templates
  templates: {
    getAll: getAccountTemplates,
    preview: previewAccountTemplate,
    apply: applyAccountTemplate
  },

  // Transactions / Journal Entries
  transactions: {
    getAll: getTransactions,
    getById: getTransactionById,
    create: createTransaction,
    post: postTransaction,
    void: voidTransaction,
    validate: validateJournalEntry
  },

  // Documents
  documents: {
    getAll: getDocuments,
    getById: getDocumentById,
    upload: uploadDocument,
    process: processDocument,
    delete: deleteSourceDocument,
    update: updateSourceDocument,
    getSummary: getSourceDocumentsSummary,
    getStatus: getDocumentProcessingStatus,
    batchProcess: batchProcessDocuments,
    download: downloadSourceDocument,
    suggestEntry: suggestJournalEntry
  },

  // Reports
  reports: {
    getBalanceSheet: getBalanceSheet,
    getIncomeStatement: getIncomeStatement,
    getTrialBalance: getTrialBalance,
    getSummary: getAccountingSummary
  },

  // Tax
  tax: {
    getSummary: getTaxSummary,
    getAnalysis: getTaxAnalysis,
    getScheduleC: getScheduleC,
    getForm1120: getForm1120,
    getUncategorized: getUncategorizedTransactions,
    analyzeOptimization: analyzeTaxOptimization,
    exportToDrake: downloadDrakeExport,
    exportToTurboTax: exportToTurboTax,
    exportData: exportTaxData,
    exportFullPackage: exportFullTaxPackage,
    validate: validateTaxData,
    // Alias for downloadDrakeExport for backwards compatibility
    downloadDrakeExport: downloadDrakeExport
  },

  // Accounting Rules
  rules: {
    analyzeBusinessForRules: analyzeBusinessForRules,
    getRecommended: getRecommendedAccountingRules,
    getRecommendations: getRuleRecommendations,
    getByType: getRulesForType,
    analyzeInvoices: analyzeInvoicesForAccounts,
    analyzeInventory: analyzeInventoryForCOGS,
    getTemplates: getAvailableRuleTemplates,
    getTemplate: getRuleTemplate,
    createCustom: createCustomRule,
    generateFromAI: generateRuleFromAI
  },

  // AI Learning Engine
  learning: {
    // Suggested Rules
    generateSuggestions: generateSuggestedRules,
    getSuggestions: getSuggestedRules,
    getSuggestionById: getSuggestedRuleById,
    editSuggestion: editSuggestedRule,
    approveSuggestion: approveSuggestedRule,
    rejectSuggestion: rejectSuggestedRule,

    // Active Automatic Rules
    getAutomaticRules: getAllAutomaticRules,
    testRule: testAutomaticRule,
    executeRules: executeAutomaticRules,
    toggleRule: toggleAutomaticRule,
    deleteRule: deleteAutomaticRule,

    // Training
    trainWithInvoices: trainWithInvoices,
    trainWithAllSources: trainWithAllSources,
    processSource: processSourceWithLearning,

    // Stats & Learnings
    getStats: getLearningStats,
    getAdapters: getLearnedAdapters,
    getAccountMappings: getLearnedAccountMappings,
    resetLearnings: resetLearnings
  },

  // Entry Books
  entryBooks: {
    getAll: getLedgerEntries,
    validate: validateEntries
  }
};
