/**
 * Accounting Flow API Service
 *
 * Connects the Accounting Flow Visualization to the real backend API
 * for processing transactions through the 7-stage accounting pipeline.
 *
 * Uses the Supervision API for testing adapters and field mappings.
 */

import { accountingApi } from '../../accounting/services/accountingApi';
import { fetchGraphQLSS } from '../../../services/utils';
import { authStore } from '../../../stores/authStore';
import type { DataSource, FieldMapping } from '../data/sampleData';

// =============================================================================
// TYPES
// =============================================================================

export interface FlowProcessingResult {
  success: boolean;
  error?: string;
  stages: {
    stage1: Stage1Result;
    stage2: Stage2Result;
    stage3: Stage3Result;
    stage4: Stage4Result;
    stage5: Stage5Result;
    stage6: Stage6Result;
    stage7: Stage7Result;
  };
}

export interface Stage1Result {
  source: DataSource;
  rawData: Record<string, unknown>;
  validationStatus: 'validated' | 'error' | 'pending';
  validationMessage?: string;
}

export interface Stage2Result {
  adapterName: string;
  fieldMappings: FieldMapping[];
  confidence: number;
  patterns: Array<{
    type: string;
    label: string;
    found: boolean;
    count?: number;
  }>;
  standardTransaction: StandardTransaction | null;
}

export interface Stage3Result {
  standardTransaction: any;
  invoice: any;
  accountAssignments: Array<{
    accountCode: string;
    accountName: string;
    amount: number;
    type: 'debit' | 'credit';
  }>;
  paymentAllocations: Array<{
    method: string;
    amount: number;
    reference?: string;
  }>;
}

export interface Stage4Result {
  decisions: any;
  selectedPath: string[];
  accountInfo: {
    code: string;
    name: string;
    type: 'Asset' | 'Liability' | 'Revenue' | 'Expense' | 'Equity';
    description?: string;
    normalBalance: 'debit' | 'credit';
  } | null;
}

export interface Stage5Result {
  rules: Array<{
    id: string;
    name: string;
    priority: number;
    isActive: boolean;
    conditions: Array<{
      field: string;
      operator: string;
      value: any;
      result?: boolean;
    }>;
    description?: string;
  }>;
  evaluatedRule: any;
  journalLines: Array<{
    accountCode: string;
    accountName: string;
    debit: number;
    credit: number;
    description?: string;
  }>;
}

export interface Stage6Result {
  entries: Array<{
    accountCode: string;
    accountName: string;
    debit: number;
    credit: number;
    description?: string;
  }>;
  totals: {
    totalDebits: number;
    totalCredits: number;
  };
  isBalanced: boolean;
  metadata: {
    date: string;
    reference: string;
    documentNumber: string;
    description?: string;
    status?: 'draft' | 'pending' | 'posted';
  };
}

export interface Stage7Result {
  status: 'success' | 'failure';
  previousConfidence: number;
  newConfidence: number;
  metrics: {
    totalProcessed: number;
    successRate: number;
    averageConfidence: number;
  };
  entryBookId?: string;
}

// =============================================================================
// SUPERVISION API FUNCTIONS (New Connector Functions)
// =============================================================================

/**
 * Get all supervision adapters for the business
 */
export async function getSupervisionAdapters(): Promise<any[]> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getSupervisionAdapters',
      params: { businessId: authStore.getBusinessId() }
    });
    return result?.data || result || [];
  } catch (error) {
    console.error('Error getting supervision adapters:', error);
    return [];
  }
}

/**
 * Test a supervision adapter with sample payload
 */
export async function testSupervisionAdapter(
  adapterId: string,
  samplePayload: Record<string, unknown>
): Promise<{
  success: boolean;
  result?: {
    fieldMappings: any[];
    standardTransaction: any;
    accountMappings: any[];
    entryBook: any;
    confidence: number;
  };
  error?: string;
}> {
  try {
    const result = await fetchGraphQLSS({
      query: 'testSupervisionAdapter',
      params: { businessId: authStore.getBusinessId() },
      form: { adapterId, samplePayload }
    });
    return result?.data || result || { success: false, error: 'Unknown error' };
  } catch (error) {
    console.error('Error testing supervision adapter:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Get field mappings for an adapter
 */
export async function getSupervisionFieldMappings(adapterId: string): Promise<any[]> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getSupervisionFieldMappings',
      params: { businessId: authStore.getBusinessId(), adapterId }
    });
    return result?.data || result || [];
  } catch (error) {
    console.error('Error getting field mappings:', error);
    return [];
  }
}

/**
 * Get account mappings
 */
export async function getSupervisionAccountMappings(): Promise<any[]> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getSupervisionAccountMappings',
      params: { businessId: authStore.getBusinessId() }
    });
    return result?.data || result || [];
  } catch (error) {
    console.error('Error getting account mappings:', error);
    return [];
  }
}

/**
 * Get supervision dashboard with stats
 */
export async function getSupervisionDashboard(): Promise<any> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getSupervisionDashboard',
      params: { businessId: authStore.getBusinessId() }
    });
    return result?.data || result || null;
  } catch (error) {
    console.error('Error getting supervision dashboard:', error);
    return null;
  }
}

/**
 * Get pending AI suggestions
 */
export async function getSupervisionPendingSuggestions(): Promise<any[]> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getSupervisionPendingSuggestions',
      params: { businessId: authStore.getBusinessId() }
    });
    return result?.data || result || [];
  } catch (error) {
    console.error('Error getting pending suggestions:', error);
    return [];
  }
}

/**
 * Process any input data through the accounting engine to generate Entry Books
 * This function sends raw data (like inventory movements) to be processed
 * and converted into accounting entries.
 *
 * Response format:
 * {
 *   data: {
 *     success: true,
 *     data: {
 *       entries: [{ accountCode, accountName, accountType, side, amount, ... }],
 *       totalDebits, totalCredits, balanced, reference, date, source, extracted
 *     }
 *   }
 * }
 */
export async function processAnyInput(
  rawData: Record<string, unknown>,
  options?: {
    sourceType?: string;
    autoCreate?: boolean;
  }
): Promise<{
  success: boolean;
  entryBook?: {
    id?: string;
    source: string;
    reference: string;
    date: string;
    entries: Array<{
      accountCode: string;
      accountName: string;
      accountType?: string;
      side: 'debit' | 'credit';
      amount: number;
      debit: number;
      credit: number;
      scenarioId?: string;
      layer?: string;
      description?: string;
    }>;
    totalDebits: number;
    totalCredits: number;
    balanced: boolean;
    extracted?: any;
  };
  error?: string;
}> {
  try {
    const result = await fetchGraphQLSS({
      query: 'processAnyInput',
      businessId: authStore.getBusinessId(),
      data: rawData,
      sourceHint: options?.sourceType,
      forceAI: false
    });

    // Handle nested response structure: result.data.data
    const responseData = result?.data?.data || result?.data || result;

    if (!responseData?.success || !responseData?.entries?.length) {
      return {
        success: false,
        error: result?.error || responseData?.errors?.join(', ') || 'No entries generated'
      };
    }

    // Transform entries to include both side/amount and debit/credit formats
    const transformedEntries = responseData.entries.map((entry: any) => ({
      ...entry,
      debit: entry.side === 'debit' ? entry.amount : 0,
      credit: entry.side === 'credit' ? entry.amount : 0
    }));

    return {
      success: true,
      entryBook: {
        source: responseData.source,
        reference: responseData.reference,
        date: responseData.date,
        entries: transformedEntries,
        totalDebits: responseData.totalDebits,
        totalCredits: responseData.totalCredits,
        balanced: responseData.balanced,
        extracted: responseData.extracted
      }
    };
  } catch (error) {
    console.error('Error processing input for entry book:', error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

/**
 * Process raw input data through the real accounting engine
 */
export async function processTransaction(
  source: DataSource,
  rawData: Record<string, unknown>
): Promise<FlowProcessingResult> {
  try {
    // First, try to use the supervision adapter test
    const adapters = await getSupervisionAdapters();
    const matchingAdapter = adapters.find(a =>
      a.name?.toLowerCase().includes(source) ||
      a.sourceType?.toLowerCase() === source
    );

    if (matchingAdapter) {
      // Use supervision adapter test
      const testResult = await testSupervisionAdapter(matchingAdapter.id, rawData);
      if (testResult.success && testResult.result) {
        return {
          success: true,
          stages: transformSupervisionResultToStages(source, rawData, testResult.result)
        };
      }
    }

    // Fallback to the learning API
    const result = await accountingApi.learning.processSource(rawData, {
      autoCreateEntryBooks: false,
      autoLearn: true
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Processing failed',
        stages: getEmptyStages(source, rawData)
      };
    }

    return {
      success: true,
      stages: transformApiResultToStages(source, rawData, result)
    };
  } catch (error) {
    console.error('Error processing transaction:', error);
    return {
      success: false,
      error: (error as Error).message,
      stages: getEmptyStages(source, rawData)
    };
  }
}

/**
 * Execute the rules and create the actual entry book
 */
export async function executeAndCreateEntryBook(
  eventType: string,
  inputData: Record<string, unknown>
): Promise<{ success: boolean; entryBookId?: string; error?: string }> {
  try {
    const result = await accountingApi.learning.executeRules(eventType, inputData);
    return {
      success: result.success,
      entryBookId: result.entriesCreated > 0 ? 'created' : undefined,
      error: result.errors?.join(', ')
    };
  } catch (error) {
    console.error('Error executing rules:', error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
}

/**
 * Test a specific rule with sample data (dry run)
 */
export async function testRule(
  ruleId: string,
  inputData: Record<string, unknown>
): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    return await accountingApi.learning.testRule(ruleId, inputData);
  } catch (error) {
    console.error('Error testing rule:', error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
}

/**
 * Get all active automatic rules
 */
export async function getActiveRules(): Promise<any[]> {
  try {
    return await accountingApi.learning.getAutomaticRules();
  } catch (error) {
    console.error('Error getting active rules:', error);
    return [];
  }
}

/**
 * Get learning statistics
 */
export async function getLearningStats(): Promise<any> {
  try {
    return await accountingApi.learning.getStats();
  } catch (error) {
    console.error('Error getting learning stats:', error);
    return null;
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getEmptyStages(source: DataSource, rawData: Record<string, unknown>): FlowProcessingResult['stages'] {
  return {
    stage1: {
      source,
      rawData,
      validationStatus: 'pending',
    },
    stage2: {
      adapterName: `${source}Adapter`,
      fieldMappings: [],
      confidence: 0,
      patterns: [],
      standardTransaction: null,
    },
    stage3: {
      standardTransaction: null,
      invoice: null,
      accountAssignments: [],
      paymentAllocations: [],
    },
    stage4: {
      decisions: { id: 'root', label: 'No data', type: 'question' },
      selectedPath: [],
      accountInfo: null,
    },
    stage5: {
      rules: [],
      evaluatedRule: null,
      journalLines: [],
    },
    stage6: {
      entries: [],
      totals: { totalDebits: 0, totalCredits: 0 },
      isBalanced: true,
      metadata: {
        date: new Date().toISOString().split('T')[0],
        reference: '',
        documentNumber: '',
        status: 'draft',
      },
    },
    stage7: {
      status: 'failure',
      previousConfidence: 0,
      newConfidence: 0,
      metrics: {
        totalProcessed: 0,
        successRate: 0,
        averageConfidence: 0,
      },
    },
  };
}

function transformSupervisionResultToStages(
  source: DataSource,
  rawData: Record<string, unknown>,
  supervisionResult: {
    fieldMappings: any[];
    standardTransaction: any;
    accountMappings: any[];
    entryBook: any;
    confidence: number;
  }
): FlowProcessingResult['stages'] {
  const { fieldMappings, standardTransaction, accountMappings, entryBook, confidence } = supervisionResult;

  return {
    stage1: {
      source,
      rawData,
      validationStatus: 'validated',
    },
    stage2: {
      adapterName: `${source}Adapter`,
      fieldMappings: fieldMappings.map(m => ({
        sourceField: m.sourceField || m.source,
        targetField: m.targetField || m.target,
        value: m.value,
        confidence: m.confidence || 0.9,
        transformationType: m.transformationType || 'direct',
      })),
      confidence: Math.round(confidence * 100) || 85,
      patterns: detectPatterns(rawData),
      standardTransaction: standardTransaction,
    },
    stage3: {
      standardTransaction: standardTransaction,
      invoice: buildInvoice(rawData),
      accountAssignments: accountMappings.map(m => ({
        accountCode: m.accountCode || m.code,
        accountName: m.accountName || m.name,
        amount: m.debitAmount || m.creditAmount || m.amount || 0,
        type: (m.debitAmount > 0 ? 'debit' : 'credit') as 'debit' | 'credit',
      })),
      paymentAllocations: [{
        method: standardTransaction?.paymentMethod || rawData.payment_method as string || 'unknown',
        amount: standardTransaction?.amount || rawData.amount as number || 0,
      }],
    },
    stage4: {
      decisions: buildDecisionTree(source),
      selectedPath: ['root', source],
      accountInfo: accountMappings[0] ? {
        code: accountMappings[0].accountCode || accountMappings[0].code || '',
        name: accountMappings[0].accountName || accountMappings[0].name || '',
        type: determineAccountType(accountMappings[0].accountCode || accountMappings[0].code),
        normalBalance: accountMappings[0].debitAmount > 0 ? 'debit' : 'credit',
      } : null,
    },
    stage5: {
      rules: [{
        id: 'supervision-rule',
        name: `${source.charAt(0).toUpperCase() + source.slice(1)} Processing Rule`,
        priority: 1,
        isActive: true,
        conditions: [
          { field: 'source', operator: 'equals', value: source, result: true },
        ],
      }],
      evaluatedRule: {
        id: 'supervision-rule',
        name: `${source.charAt(0).toUpperCase() + source.slice(1)} Processing Rule`,
        priority: 1,
        isActive: true,
        conditions: [
          { field: 'source', operator: 'equals', value: source, result: true },
        ],
      },
      journalLines: entryBook?.lines?.map((line: any) => ({
        accountCode: line.accountCode || line.account?.code || '',
        accountName: line.accountName || line.account?.name || '',
        debit: line.debit || 0,
        credit: line.credit || 0,
        description: line.description || '',
      })) || accountMappings.map(m => ({
        accountCode: m.accountCode || m.code || '',
        accountName: m.accountName || m.name || '',
        debit: m.debitAmount || 0,
        credit: m.creditAmount || 0,
        description: m.description || '',
      })),
    },
    stage6: {
      entries: entryBook?.lines?.map((line: any) => ({
        accountCode: line.accountCode || line.account?.code || '',
        accountName: line.accountName || line.account?.name || '',
        debit: line.debit || 0,
        credit: line.credit || 0,
        description: line.description || '',
      })) || accountMappings.map(m => ({
        accountCode: m.accountCode || m.code || '',
        accountName: m.accountName || m.name || '',
        debit: m.debitAmount || 0,
        credit: m.creditAmount || 0,
        description: m.description || '',
      })),
      totals: {
        totalDebits: entryBook?.totalDebit || accountMappings.reduce((sum, m) => sum + (m.debitAmount || 0), 0),
        totalCredits: entryBook?.totalCredit || accountMappings.reduce((sum, m) => sum + (m.creditAmount || 0), 0),
      },
      isBalanced: entryBook?.isBalanced ?? true,
      metadata: {
        date: entryBook?.date || standardTransaction?.date || new Date().toISOString().split('T')[0],
        reference: entryBook?.reference || standardTransaction?.sourceId || rawData.id as string || '',
        documentNumber: entryBook?.entryNumber || '',
        description: entryBook?.description || standardTransaction?.description || '',
        status: 'posted',
      },
    },
    stage7: {
      status: 'success',
      previousConfidence: 85,
      newConfidence: Math.round(confidence * 100) || 90,
      metrics: {
        totalProcessed: 1,
        successRate: 100,
        averageConfidence: Math.round(confidence * 100) || 90,
      },
      entryBookId: entryBook?.id,
    },
  };
}

function transformApiResultToStages(
  source: DataSource,
  rawData: Record<string, unknown>,
  apiResult: any
): FlowProcessingResult['stages'] {
  const entryBook = apiResult.entryBook;

  // Extract field mappings from the result if available
  const fieldMappings: FieldMapping[] = apiResult.fieldMappings || extractFieldMappings(rawData);

  // Calculate confidence
  const confidence = fieldMappings.length > 0
    ? Math.round(fieldMappings.reduce((sum, m) => sum + (m.confidence || 0.8), 0) / fieldMappings.length * 100)
    : 85;

  // Build stage results
  return {
    stage1: {
      source,
      rawData,
      validationStatus: 'validated',
    },
    stage2: {
      adapterName: `${source}Adapter`,
      fieldMappings,
      confidence,
      patterns: detectPatterns(rawData),
      standardTransaction: apiResult.standardTransaction || buildStandardTransaction(rawData, source),
    },
    stage3: {
      standardTransaction: apiResult.standardTransaction || buildStandardTransaction(rawData, source),
      invoice: apiResult.invoice || buildInvoice(rawData),
      accountAssignments: entryBook?.lines?.map((line: any) => ({
        accountCode: line.accountCode || line.account?.code || '',
        accountName: line.accountName || line.account?.name || '',
        amount: line.debit || line.credit || 0,
        type: line.debit > 0 ? 'debit' : 'credit',
      })) || [],
      paymentAllocations: [{
        method: rawData.payment_method as string || 'unknown',
        amount: rawData.amount as number || 0,
      }],
    },
    stage4: {
      decisions: buildDecisionTree(source),
      selectedPath: ['root', source],
      accountInfo: entryBook?.lines?.[0] ? {
        code: entryBook.lines[0].accountCode || '',
        name: entryBook.lines[0].accountName || '',
        type: determineAccountType(entryBook.lines[0].accountCode),
        normalBalance: entryBook.lines[0].debit > 0 ? 'debit' : 'credit',
      } : null,
    },
    stage5: {
      rules: apiResult.matchedRules || [{
        id: 'auto-rule',
        name: `${source} Auto Processing`,
        priority: 1,
        isActive: true,
        conditions: [
          { field: 'source', operator: 'equals', value: source, result: true },
        ],
      }],
      evaluatedRule: apiResult.matchedRules?.[0] || null,
      journalLines: entryBook?.lines?.map((line: any) => ({
        accountCode: line.accountCode || '',
        accountName: line.accountName || '',
        debit: line.debit || 0,
        credit: line.credit || 0,
        description: line.description || '',
      })) || [],
    },
    stage6: {
      entries: entryBook?.lines?.map((line: any) => ({
        accountCode: line.accountCode || '',
        accountName: line.accountName || '',
        debit: line.debit || 0,
        credit: line.credit || 0,
        description: line.description || '',
      })) || [],
      totals: {
        totalDebits: entryBook?.totalDebit || 0,
        totalCredits: entryBook?.totalCredit || 0,
      },
      isBalanced: Math.abs((entryBook?.totalDebit || 0) - (entryBook?.totalCredit || 0)) < 0.01,
      metadata: {
        date: entryBook?.date || new Date().toISOString().split('T')[0],
        reference: entryBook?.reference || rawData.id as string || '',
        documentNumber: entryBook?.entryNumber || '',
        description: entryBook?.description || '',
        status: 'posted',
      },
    },
    stage7: {
      status: 'success',
      previousConfidence: apiResult.previousConfidence || 85,
      newConfidence: apiResult.newConfidence || confidence,
      metrics: {
        totalProcessed: apiResult.totalProcessed || 1,
        successRate: apiResult.successRate || 100,
        averageConfidence: confidence,
      },
      entryBookId: entryBook?.id,
    },
  };
}

function extractFieldMappings(rawData: Record<string, unknown>): FieldMapping[] {
  const mappings: FieldMapping[] = [];
  const commonMappings: Record<string, string> = {
    id: 'sourceId',
    amount: 'amount',
    total: 'amount',
    total_price: 'amount',
    date: 'date',
    created_at: 'date',
    created: 'date',
    customer_name: 'customer.name',
    customer: 'customer',
    description: 'description',
    currency: 'currency',
    payment_method: 'paymentMethod',
    status: 'status',
  };

  for (const [key, value] of Object.entries(rawData)) {
    const targetField = commonMappings[key];
    if (targetField) {
      mappings.push({
        sourceField: key,
        targetField,
        value: value as string | number | null,
        confidence: 0.9,
        transformationType: 'direct',
      });
    }
  }

  return mappings;
}

function detectPatterns(rawData: Record<string, unknown>): Array<{ type: string; label: string; found: boolean; count?: number }> {
  const json = JSON.stringify(rawData);

  return [
    { type: 'currency', label: 'Currency', found: /usd|eur|currency|amount/i.test(json), count: (json.match(/usd|eur/gi) || []).length },
    { type: 'date', label: 'Date', found: /date|created|timestamp/i.test(json), count: (json.match(/date|created/gi) || []).length },
    { type: 'reference', label: 'Reference', found: /id|reference|number/i.test(json), count: (json.match(/id|reference/gi) || []).length },
    { type: 'email', label: 'Email', found: /@/.test(json) },
  ];
}

function buildStandardTransaction(rawData: Record<string, unknown>, source: DataSource): any {
  return {
    id: `txn_${source}_${rawData.id || Date.now()}`,
    source,
    sourceId: rawData.id as string || '',
    date: rawData.date as string || rawData.created_at as string || new Date().toISOString().split('T')[0],
    description: rawData.description as string || `${source} transaction`,
    customer: {
      name: rawData.customer_name as string || rawData.customer as string || 'Unknown',
    },
    amount: rawData.amount as number || rawData.total as number || 0,
    currency: rawData.currency as string || 'USD',
    paymentMethod: rawData.payment_method as string || 'unknown',
    status: 'completed',
    metadata: rawData,
  };
}

function buildInvoice(rawData: Record<string, unknown>): any {
  return {
    id: `INV-${rawData.id || Date.now()}`,
    invoiceNumber: rawData.id as string || '',
    date: rawData.date as string || new Date().toISOString().split('T')[0],
    customer: {
      name: rawData.customer_name as string || 'Unknown',
    },
    lineItems: rawData.items as any[] || [],
    subtotal: rawData.amount as number || 0,
    total: rawData.amount as number || 0,
    status: 'paid',
  };
}

function buildDecisionTree(source: DataSource): any {
  return {
    id: 'root',
    label: 'Transaction Source?',
    type: 'question',
    children: [
      { id: 'stripe', label: 'Stripe', type: 'account', accountCode: '1003', accountType: 'Asset' },
      { id: 'shopify', label: 'Shopify', type: 'account', accountCode: '1003', accountType: 'Asset' },
      { id: 'yabaexpress', label: 'YabaExpress', type: 'account', accountCode: '1002', accountType: 'Asset' },
      { id: 'manual', label: 'Manual', type: 'account', accountCode: '1001', accountType: 'Asset' },
    ],
  };
}

function determineAccountType(accountCode: string): 'Asset' | 'Liability' | 'Revenue' | 'Expense' | 'Equity' {
  if (!accountCode) return 'Asset';
  const code = parseInt(accountCode);
  if (code >= 1000 && code < 2000) return 'Asset';
  if (code >= 2000 && code < 3000) return 'Liability';
  if (code >= 3000 && code < 4000) return 'Equity';
  if (code >= 4000 && code < 5000) return 'Revenue';
  return 'Expense';
}

// =============================================================================
// EXPORT
// =============================================================================

export const accountingFlowApi = {
  // Main processing
  processTransaction,
  executeAndCreateEntryBook,
  processAnyInput,

  // Legacy learning API
  testRule,
  getActiveRules,
  getLearningStats,

  // Supervision API (new)
  getSupervisionAdapters,
  testSupervisionAdapter,
  getSupervisionFieldMappings,
  getSupervisionAccountMappings,
  getSupervisionDashboard,
  getSupervisionPendingSuggestions,
};

export default accountingFlowApi;
