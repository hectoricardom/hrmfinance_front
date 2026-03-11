/**
 * Supervision API Service
 *
 * Comprehensive API service for the Supervision module that manages:
 * - Adapters: Data source connectors with field mappings
 * - Field Mappings: Source-to-target field transformations
 * - Account Mappings: Account assignment rules
 * - AI Suggestions: AI-powered mapping recommendations
 * - Dashboard: Overview and statistics
 * - Audit Logs: Change tracking and history
 *
 * Uses fetchGraphQLSS for authenticated GraphQL requests.
 */

import { fetchGraphQLSS } from '../../../services/utils';
import { authStore } from '../../../stores/authStore';

// =============================================================================
// TYPES
// =============================================================================

export interface SupervisionAdapter {
  id: string;
  name: string;
  sourceType: string;
  description?: string;
  isActive: boolean;
  isLocked: boolean;
  lockedBy?: string;
  lockedAt?: string;
  lockReason?: string;
  version: number;
  confidence: number;
  lastTestedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FieldMapping {
  id: string;
  adapterId: string;
  sourceField: string;
  targetField: string;
  transformationType: 'direct' | 'computed' | 'conditional' | 'lookup';
  transformationRule?: string;
  defaultValue?: any;
  isRequired: boolean;
  isLocked: boolean;
  lockedBy?: string;
  lockedAt?: string;
  lockReason?: string;
  version: number;
  confidence: number;
  testCases?: TestCase[];
  createdAt: string;
  updatedAt: string;
}

export interface TestCase {
  id: string;
  input: Record<string, any>;
  expectedOutput: Record<string, any>;
  lastResult?: 'pass' | 'fail';
  lastRunAt?: string;
}

export interface AccountMapping {
  id: string;
  sourcePattern: string;
  accountCode: string;
  accountName: string;
  debitAccount?: string;
  creditAccount?: string;
  isManual: boolean;
  manuallySetBy?: string;
  manuallySetAt?: string;
  confidence: number;
  createdAt: string;
  updatedAt: string;
}

export interface AISuggestion {
  id: string;
  entityType: 'adapter' | 'fieldMapping' | 'accountMapping';
  entityId: string;
  suggestionType: 'create' | 'update' | 'delete';
  currentValue?: any;
  suggestedValue: any;
  confidence: number;
  reasoning: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  createdAt: string;
}

export interface SupervisionDashboard {
  totalAdapters: number;
  activeAdapters: number;
  lockedAdapters: number;
  totalFieldMappings: number;
  totalAccountMappings: number;
  pendingSuggestions: number;
  averageConfidence: number;
  recentActivity: AuditLogEntry[];
}

export interface AuditLogEntry {
  id: string;
  entityType: 'adapter' | 'fieldMapping' | 'accountMapping' | 'suggestion';
  entityId: string;
  action: 'create' | 'update' | 'delete' | 'lock' | 'unlock' | 'rollback' | 'test' | 'approve' | 'reject';
  userId: string;
  userName?: string;
  previousValue?: any;
  newValue?: any;
  reason?: string;
  timestamp: string;
}

export interface CreateAdapterData {
  name: string;
  sourceType: string;
  description?: string;
  isActive?: boolean;
}

export interface CreateAccountMappingData {
  sourcePattern: string;
  accountCode: string;
  accountName: string;
  debitAccount?: string;
  creditAccount?: string;
}

export interface FieldMappingUpdate {
  sourceField?: string;
  targetField?: string;
  transformationType?: 'direct' | 'computed' | 'conditional' | 'lookup';
  transformationRule?: string;
  defaultValue?: any;
  isRequired?: boolean;
}

// =============================================================================
// ADAPTER MANAGEMENT
// =============================================================================

/**
 * Get all supervision adapters for the current business
 */
export async function getSupervisionAdapters(): Promise<SupervisionAdapter[]> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getSupervisionAdapters',
      params: { businessId: authStore.getBusinessId() },
      businessId: authStore.getBusinessId()
    });
    return result?.data || result || [];
  } catch (error) {
    console.error('Error getting supervision adapters:', error);
    return [];
  }
}

/**
 * Get a specific supervision adapter by ID
 */
export async function getSupervisionAdapterById(adapterId: string): Promise<SupervisionAdapter | null> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getSupervisionAdapterById',
      params: { businessId: authStore.getBusinessId(), adapterId },
      businessId: authStore.getBusinessId()
    });
    return result?.data || result || null;
  } catch (error) {
    console.error('Error getting supervision adapter by ID:', error);
    return null;
  }
}

/**
 * Create a new supervision adapter
 */
export async function createSupervisionAdapter(data: CreateAdapterData): Promise<{
  success: boolean;
  adapter?: SupervisionAdapter;
  error?: string;
}> {
  try {
    const result = await fetchGraphQLSS({
      query: 'createSupervisionAdapter',
      params: { businessId: authStore.getBusinessId() },
      form: { ...data }
    });
    return result?.data || result || { success: false, error: 'Unknown error' };
  } catch (error) {
    console.error('Error creating supervision adapter:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Lock or unlock a supervision adapter
 */
export async function lockSupervisionAdapter(
  adapterId: string,
  lockStatus: boolean,
  userId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await fetchGraphQLSS({
      query: 'lockSupervisionAdapter',
      params: { businessId: authStore.getBusinessId() },
      form: { adapterId, lockStatus, userId, reason }
    });
    return result?.data || result || { success: false, error: 'Unknown error' };
  } catch (error) {
    console.error('Error locking/unlocking supervision adapter:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Test a supervision adapter with a sample payload
 */
export async function testSupervisionAdapter(
  adapterId: string,
  payload: Record<string, unknown>
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
      form: { adapterId, samplePayload: payload }
    });
    return result?.data || result || { success: false, error: 'Unknown error' };
  } catch (error) {
    console.error('Error testing supervision adapter:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Rollback a supervision adapter to a previous version
 */
export async function rollbackSupervisionAdapter(
  adapterId: string,
  targetVersion: number,
  userId: string,
  reason?: string
): Promise<{ success: boolean; adapter?: SupervisionAdapter; error?: string }> {
  try {
    const result = await fetchGraphQLSS({
      query: 'rollbackSupervisionAdapter',
      params: { businessId: authStore.getBusinessId() },
      form: { adapterId, targetVersion, userId, reason }
    });
    return result?.data || result || { success: false, error: 'Unknown error' };
  } catch (error) {
    console.error('Error rolling back supervision adapter:', error);
    return { success: false, error: (error as Error).message };
  }
}

// =============================================================================
// ADAPTER AI FUNCTIONS
// =============================================================================

export interface AISuggestion {
  id: string;
  sourcePath: string;
  targetPath: string;
  suggestedTransform: string;
  confidence: number;
  reason: string;
  sampleValue: any;
  status: 'pending' | 'approved' | 'rejected';
}

export interface SourceDetection {
  sourceSystem: string;
  confidence: number;
  detectionRules: Array<{ field: string; operator: string; value: any }>;
  reason: string;
}

export interface AdapterWithAIResponse {
  adapter: SupervisionAdapter & {
    fieldMappings: FieldMapping[];
    arrayMappings: any[];
    detectionRules: Array<{ field: string; operator: string; value: any }>;
  };
  suggestions: AISuggestion[];
  sourceDetection: SourceDetection;
  appliedCount: number;
  pendingCount: number;
}

/**
 * Create adapter with AI analysis
 * User pastes sample JSON, AI analyzes and suggests field mappings
 */
export async function createAdapterWithAI(
  sampleInput: Record<string, any>,
  options?: {
    name?: string;
    autoSave?: boolean;
  }
): Promise<{
  success: boolean;
  data?: AdapterWithAIResponse;
  message?: string;
  error?: string;
}> {
  try {
    const result = await fetchGraphQLSS({
      query: 'createAdapterWithAI',
      params: { businessId: authStore.getBusinessId() },
      form: {
        sampleInput,
        name: options?.name,
        autoSave: options?.autoSave ?? false
      }
    });
    return result || { success: false, error: 'Unknown error' };
  } catch (error) {
    console.error('Error creating adapter with AI:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Analyze input data without creating adapter (preview)
 */
export async function analyzeInputData(input: Record<string, any>): Promise<{
  success: boolean;
  data?: {
    sourceDetection: SourceDetection;
    suggestedMappings: AISuggestion[];
    suggestedArrayMappings: Array<{
      sourceArrayPath: string;
      targetArrayPath: string;
      itemMappings: Array<{ id: string; sourcePath: string; targetPath: string; confidence: number }>;
    }>;
    highConfidenceCount: number;
    totalSuggestions: number;
  };
  message?: string;
  error?: string;
}> {
  try {
    const result = await fetchGraphQLSS({
      query: 'analyzeInputData',
      form: { input }
    });
    return result || { success: false, error: 'Unknown error' };
  } catch (error) {
    console.error('Error analyzing input data:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Apply approved AI suggestions to adapter
 */
export async function applyAISuggestionsToAdapter(
  adapter: SupervisionAdapter,
  approvedSuggestionIds: string[],
  allSuggestions: AISuggestion[]
): Promise<{
  success: boolean;
  data?: {
    adapter: SupervisionAdapter;
    added: number;
    skipped: number;
  };
  message?: string;
  error?: string;
}> {
  try {
    const result = await fetchGraphQLSS({
      query: 'applyAISuggestionsToAdapter',
      form: { adapter, approvedSuggestionIds, allSuggestions }
    });
    return result || { success: false, error: 'Unknown error' };
  } catch (error) {
    console.error('Error applying AI suggestions:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Test adapter transformation with sample input
 */
export async function testAdapterTransform(
  adapter: SupervisionAdapter,
  sampleInput: Record<string, any>
): Promise<{
  success: boolean;
  data?: Record<string, any>;
  message?: string;
  error?: string;
}> {
  try {
    const result = await fetchGraphQLSS({
      query: 'testAdapterTransform',
      form: { adapter, sampleInput }
    });
    return result || { success: false, error: 'Unknown error' };
  } catch (error) {
    console.error('Error testing adapter transform:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Add field mapping to adapter
 */
export async function addFieldMappingToAdapter(
  adapter: SupervisionAdapter,
  sourcePath: string,
  targetPath: string,
  transform?: string
): Promise<{
  success: boolean;
  data?: { adapter: SupervisionAdapter; mapping: FieldMapping };
  message?: string;
  error?: string;
}> {
  try {
    const result = await fetchGraphQLSS({
      query: 'addFieldMappingToAdapter',
      form: { adapter, sourcePath, targetPath, transform: transform || 'none' }
    });
    return result || { success: false, error: 'Unknown error' };
  } catch (error) {
    console.error('Error adding field mapping:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Update field mapping in adapter
 */
export async function updateFieldMappingInAdapter(
  adapter: SupervisionAdapter,
  mappingId: string,
  updates: { targetPath?: string; transform?: string }
): Promise<{
  success: boolean;
  data?: { adapter: SupervisionAdapter };
  message?: string;
  error?: string;
}> {
  try {
    const result = await fetchGraphQLSS({
      query: 'updateFieldMappingInAdapter',
      form: { adapter, mappingId, updates }
    });
    return result || { success: false, error: 'Unknown error' };
  } catch (error) {
    console.error('Error updating field mapping:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Remove field mapping from adapter
 */
export async function removeFieldMappingFromAdapter(
  adapter: SupervisionAdapter,
  mappingId: string
): Promise<{
  success: boolean;
  data?: { adapter: SupervisionAdapter };
  message?: string;
  error?: string;
}> {
  try {
    const result = await fetchGraphQLSS({
      query: 'removeFieldMappingFromAdapter',
      form: { adapter, mappingId }
    });
    return result || { success: false, error: 'Unknown error' };
  } catch (error) {
    console.error('Error removing field mapping:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Create pre-configured Stripe adapter template
 */
export async function createStripeAdapter(): Promise<{
  success: boolean;
  data?: SupervisionAdapter;
  message?: string;
  error?: string;
}> {
  try {
    const result = await fetchGraphQLSS({
      query: 'createStripeAdapter',
      params: { businessId: authStore.getBusinessId() }
    });
    return result || { success: false, error: 'Unknown error' };
  } catch (error) {
    console.error('Error creating Stripe adapter:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Create pre-configured Square adapter template
 */
export async function createSquareAdapter(): Promise<{
  success: boolean;
  data?: SupervisionAdapter;
  message?: string;
  error?: string;
}> {
  try {
    const result = await fetchGraphQLSS({
      query: 'createSquareAdapter',
      params: { businessId: authStore.getBusinessId() }
    });
    return result || { success: false, error: 'Unknown error' };
  } catch (error) {
    console.error('Error creating Square adapter:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Update/Save adapter
 */
export async function updateAdapter(adapter: SupervisionAdapter): Promise<{
  success: boolean;
  data?: SupervisionAdapter;
  message?: string;
  error?: string;
}> {
  try {
    const result = await fetchGraphQLSS({
      query: 'updateAdapter',
      form: { adapter }
    });
    return result || { success: false, error: 'Unknown error' };
  } catch (error) {
    console.error('Error updating adapter:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Get all adapters for the business
 */
export async function getAdapters(): Promise<{
  success: boolean;
  data?: SupervisionAdapter[];
  message?: string;
  error?: string;
}> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getAdapters',
      params: { businessId: authStore.getBusinessId() }
    });
    return result || { success: false, error: 'Unknown error' };
  } catch (error) {
    console.error('Error getting adapters:', error);
    return { success: false, error: (error as Error).message };
  }
}

// =============================================================================
// FIELD MAPPING MANAGEMENT
// =============================================================================

/**
 * Get all field mappings for an adapter
 */
export async function getSupervisionFieldMappings(adapterId: string): Promise<FieldMapping[]> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getSupervisionFieldMappings',
      params: { businessId: authStore.getBusinessId(), adapterId }
    });
    return result?.data || result || [];
  } catch (error) {
    console.error('Error getting supervision field mappings:', error);
    return [];
  }
}

/**
 * Update a field mapping
 */
export async function updateSupervisionFieldMapping(
  adapterId: string,
  mappingId: string,
  updates: FieldMappingUpdate,
  userId: string,
  reason?: string
): Promise<{ success: boolean; mapping?: FieldMapping; error?: string }> {
  try {
    const result = await fetchGraphQLSS({
      query: 'updateSupervisionFieldMapping',
      params: { businessId: authStore.getBusinessId() },
      form: { adapterId, mappingId, updates, userId, reason }
    });
    return result?.data || result || { success: false, error: 'Unknown error' };
  } catch (error) {
    console.error('Error updating supervision field mapping:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Lock or unlock a field mapping
 */
export async function lockSupervisionFieldMapping(
  adapterId: string,
  mappingId: string,
  lockStatus: boolean,
  userId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await fetchGraphQLSS({
      query: 'lockSupervisionFieldMapping',
      params: { businessId: authStore.getBusinessId() },
      form: { adapterId, mappingId, lockStatus, userId, reason }
    });
    return result?.data || result || { success: false, error: 'Unknown error' };
  } catch (error) {
    console.error('Error locking/unlocking supervision field mapping:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Rollback a field mapping to a previous version
 */
export async function rollbackSupervisionFieldMapping(
  adapterId: string,
  mappingId: string,
  targetVersion: number,
  userId: string,
  reason?: string
): Promise<{ success: boolean; mapping?: FieldMapping; error?: string }> {
  try {
    const result = await fetchGraphQLSS({
      query: 'rollbackSupervisionFieldMapping',
      params: { businessId: authStore.getBusinessId() },
      form: { adapterId, mappingId, targetVersion, userId, reason }
    });
    return result?.data || result || { success: false, error: 'Unknown error' };
  } catch (error) {
    console.error('Error rolling back supervision field mapping:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Add a test case to a field mapping
 */
export async function addSupervisionTestCase(
  adapterId: string,
  mappingId: string,
  input: Record<string, any>,
  expectedOutput: Record<string, any>
): Promise<{ success: boolean; testCase?: TestCase; error?: string }> {
  try {
    const result = await fetchGraphQLSS({
      query: 'addSupervisionTestCase',
      params: { businessId: authStore.getBusinessId() },
      form: { adapterId, mappingId, input, expectedOutput }
    });
    return result?.data || result || { success: false, error: 'Unknown error' };
  } catch (error) {
    console.error('Error adding supervision test case:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Run all test cases for a field mapping
 */
export async function runSupervisionTestCases(
  adapterId: string,
  mappingId: string
): Promise<{
  success: boolean;
  results?: Array<{ testCaseId: string; passed: boolean; actualOutput?: any; error?: string }>;
  error?: string;
}> {
  try {
    const result = await fetchGraphQLSS({
      query: 'runSupervisionTestCases',
      params: { businessId: authStore.getBusinessId() },
      form: { adapterId, mappingId }
    });
    return result?.data || result || { success: false, error: 'Unknown error' };
  } catch (error) {
    console.error('Error running supervision test cases:', error);
    return { success: false, error: (error as Error).message };
  }
}

// =============================================================================
// ACCOUNT MAPPING MANAGEMENT
// =============================================================================

/**
 * Get all account mappings for the current business
 */
export async function getSupervisionAccountMappings(): Promise<AccountMapping[]> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getSupervisionAccountMappings',
      params: { businessId: authStore.getBusinessId() }
    });
    return result?.data || result || [];
  } catch (error) {
    console.error('Error getting supervision account mappings:', error);
    return [];
  }
}

/**
 * Create a new account mapping
 */
export async function createSupervisionAccountMapping(data: CreateAccountMappingData): Promise<{
  success: boolean;
  mapping?: AccountMapping;
  error?: string;
}> {
  try {
    const result = await fetchGraphQLSS({
      query: 'createSupervisionAccountMapping',
      params: { businessId: authStore.getBusinessId() },
      form: { ...data }
    });
    return result?.data || result || { success: false, error: 'Unknown error' };
  } catch (error) {
    console.error('Error creating supervision account mapping:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Manually set an account for a mapping
 */
export async function setSupervisionManualAccount(
  mappingId: string,
  accountField: 'debitAccount' | 'creditAccount' | 'accountCode',
  account: string,
  userId: string
): Promise<{ success: boolean; mapping?: AccountMapping; error?: string }> {
  try {
    const result = await fetchGraphQLSS({
      query: 'setSupervisionManualAccount',
      params: { businessId: authStore.getBusinessId() },
      form: { mappingId, accountField, account, userId }
    });
    return result?.data || result || { success: false, error: 'Unknown error' };
  } catch (error) {
    console.error('Error setting supervision manual account:', error);
    return { success: false, error: (error as Error).message };
  }
}

// =============================================================================
// AI SUGGESTIONS
// =============================================================================

/**
 * Get all pending AI suggestions
 */
export async function getSupervisionPendingSuggestions(): Promise<AISuggestion[]> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getSupervisionPendingSuggestions',
      params: { businessId: authStore.getBusinessId() }
    });
    return result?.data || result || [];
  } catch (error) {
    console.error('Error getting supervision pending suggestions:', error);
    return [];
  }
}

/**
 * Review (approve or reject) an AI suggestion
 */
export async function reviewSupervisionSuggestion(
  suggestionId: string,
  approved: boolean,
  userId: string,
  notes?: string
): Promise<{ success: boolean; suggestion?: AISuggestion; error?: string }> {
  try {
    const result = await fetchGraphQLSS({
      query: 'reviewSupervisionSuggestion',
      params: { businessId: authStore.getBusinessId() },
      form: { suggestionId, approved, userId, notes }
    });
    return result?.data || result || { success: false, error: 'Unknown error' };
  } catch (error) {
    console.error('Error reviewing supervision suggestion:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Bulk review multiple AI suggestions
 */
export async function bulkReviewSupervisionSuggestions(
  suggestionIds: string[],
  approved: boolean,
  userId: string,
  notes?: string
): Promise<{
  success: boolean;
  results?: Array<{ suggestionId: string; success: boolean; error?: string }>;
  error?: string;
}> {
  try {
    const result = await fetchGraphQLSS({
      query: 'bulkReviewSupervisionSuggestions',
      params: { businessId: authStore.getBusinessId() },
      form: { suggestionIds, approved, userId, notes }
    });
    return result?.data || result || { success: false, error: 'Unknown error' };
  } catch (error) {
    console.error('Error bulk reviewing supervision suggestions:', error);
    return { success: false, error: (error as Error).message };
  }
}

// =============================================================================
// DASHBOARD
// =============================================================================

/**
 * Get supervision dashboard with overview statistics
 */
export async function getSupervisionDashboard(): Promise<SupervisionDashboard | null> {
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
 * Get audit log entries for a specific entity
 */
export async function getSupervisionAuditLog(
  entityId: string,
  entityType: 'adapter' | 'fieldMapping' | 'accountMapping' | 'suggestion',
  limit: number = 50
): Promise<AuditLogEntry[]> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getSupervisionAuditLog',
      params: { businessId: authStore.getBusinessId(), entityId, entityType, limit }
    });
    return result?.data || result || [];
  } catch (error) {
    console.error('Error getting supervision audit log:', error);
    return [];
  }
}

// =============================================================================
// BULK OPERATIONS
// =============================================================================

/**
 * Bulk lock or unlock multiple adapters
 */
export async function bulkLockSupervisionAdapters(
  adapterIds: string[],
  lockStatus: boolean,
  userId: string
): Promise<{
  success: boolean;
  results?: Array<{ adapterId: string; success: boolean; error?: string }>;
  error?: string;
}> {
  try {
    const result = await fetchGraphQLSS({
      query: 'bulkLockSupervisionAdapters',
      params: { businessId: authStore.getBusinessId() },
      form: { adapterIds, lockStatus, userId }
    });
    return result?.data || result || { success: false, error: 'Unknown error' };
  } catch (error) {
    console.error('Error bulk locking supervision adapters:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Bulk lock or unlock multiple field mappings within an adapter
 */
export async function bulkLockSupervisionFieldMappings(
  adapterId: string,
  mappingIds: string[],
  lockStatus: boolean,
  userId: string
): Promise<{
  success: boolean;
  results?: Array<{ mappingId: string; success: boolean; error?: string }>;
  error?: string;
}> {
  try {
    const result = await fetchGraphQLSS({
      query: 'bulkLockSupervisionFieldMappings',
      params: { businessId: authStore.getBusinessId() },
      form: { adapterId, mappingIds, lockStatus, userId }
    });
    return result?.data || result || { success: false, error: 'Unknown error' };
  } catch (error) {
    console.error('Error bulk locking supervision field mappings:', error);
    return { success: false, error: (error as Error).message };
  }
}

// =============================================================================
// LEARNED RULES MANAGEMENT
// =============================================================================

export interface LearnedRule {
  id: string;
  name: string;
  description?: string;
  sourceType: string;
  ruleType: string;
  conditions: Record<string, any>;
  actions: Record<string, any>;
  confidence: number;
  successCount: number;
  failureCount: number;
  processedCount: number;
  isLocked: boolean;
  lockedBy?: string;
  lockedAt?: string;
  lockReason?: string;
  version: number;
  previousVersions?: any[];
  createdAt: string;
  updatedAt: string;
  lastAppliedAt?: string;
}

/**
 * Get all learned rules for supervision
 */
export async function getSupervisionLearnedRules(): Promise<LearnedRule[]> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getSupervisionLearnedRules',
      params: { businessId: authStore.getBusinessId() }
    });
    return result?.data || result || [];
  } catch (error) {
    console.error('Error getting supervision learned rules:', error);
    return [];
  }
}

/**
 * Lock or unlock a learned rule
 */
export async function lockSupervisionLearnedRule(
  ruleId: string,
  lockStatus: boolean,
  userId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await fetchGraphQLSS({
      query: 'lockSupervisionLearnedRule',
      params: { businessId: authStore.getBusinessId() },
      form: { ruleId, lockStatus, userId, reason }
    });
    return result?.data || result || { success: false, error: 'Unknown error' };
  } catch (error) {
    console.error('Error locking/unlocking learned rule:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Update a learned rule
 */
export async function updateSupervisionLearnedRule(
  ruleId: string,
  updates: {
    name?: string;
    description?: string;
    conditions?: Record<string, any>;
    actions?: Record<string, any>;
  },
  userId: string
): Promise<{ success: boolean; rule?: LearnedRule; error?: string }> {
  try {
    const result = await fetchGraphQLSS({
      query: 'updateSupervisionLearnedRule',
      params: { businessId: authStore.getBusinessId() },
      form: { ruleId, updates, userId }
    });
    return result?.data || result || { success: false, error: 'Unknown error' };
  } catch (error) {
    console.error('Error updating learned rule:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Test a learned rule with sample data
 */
export async function testSupervisionLearnedRule(
  ruleId: string,
  testData: Record<string, unknown>
): Promise<{
  success: boolean;
  result?: {
    conditionsEvaluated: boolean;
    actionsApplied: any;
  };
  error?: string;
}> {
  try {
    const result = await fetchGraphQLSS({
      query: 'testSupervisionLearnedRule',
      params: { businessId: authStore.getBusinessId() },
      form: { ruleId, testData }
    });
    return result?.data || result || { success: false, error: 'Unknown error' };
  } catch (error) {
    console.error('Error testing learned rule:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Rollback a learned rule to a previous version
 */
export async function rollbackSupervisionLearnedRule(
  ruleId: string,
  targetVersion: number,
  userId: string
): Promise<{ success: boolean; rule?: LearnedRule; error?: string }> {
  try {
    const result = await fetchGraphQLSS({
      query: 'rollbackSupervisionLearnedRule',
      params: { businessId: authStore.getBusinessId() },
      form: { ruleId, targetVersion, userId }
    });
    return result?.data || result || { success: false, error: 'Unknown error' };
  } catch (error) {
    console.error('Error rolling back learned rule:', error);
    return { success: false, error: (error as Error).message };
  }
}

// =============================================================================
// LAYERED RULES SYSTEM (9-Layer Accounting Engine)
// =============================================================================

// The 9 accounting layers
export type RuleLayer = 'revenue' | 'payment' | 'tax' | 'cogs' | 'inventory' | 'discount' | 'fee' | 'receivable' | 'payable';
export type LockStatus = 'unlocked' | 'ai_locked' | 'user_locked' | 'pending_review';
export type RuleSide = 'debit' | 'credit';

export interface LayeredRule {
  id: string;
  layer: RuleLayer;
  priority: number;
  criteria: {
    transactionType?: string;
    itemType?: string;
    itemCategory?: string;
    paymentMethod?: string;
    paymentProcessor?: string;
  };
  account: {
    code: string;
    name: string;
    type?: string; // 'asset' | 'liability' | 'revenue' | 'expense' | 'equity'
  };
  side: RuleSide;
  isLocked: boolean;
  lockStatus: LockStatus;
  canEdit: boolean;
  source?: 'ai_generated' | 'user_created' | 'system';
  confidence?: number;
  stats: {
    usageCount: number;
    successRate: number;
    confidence: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface LayeredRulesDashboard {
  totalRules: number;
  byLayer: {
    revenue: number;
    payment: number;
    tax: number;
    cogs: number;
    inventory: number;
    discount: number;
    fee: number;
    receivable: number;
    payable: number;
  };
  byLockStatus: {
    unlocked: number;
    ai_locked: number;
    user_locked: number;
    pending_review: number;
  };
  lowConfidenceCount: number;
  needsReviewCount: number;
}

export interface LayeredRulesSummary {
  totalRules: number;
  byLayer: { system: number; business: number; user: number };
  byType: { account_mapping: number; field_mapping: number; validation: number; transformation: number };
  lockedRules: number;
  duplicatesFound: number;
  averageConfidence: number;
}

export interface MatchedAccounts {
  revenueAccount?: { code: string; name: string; rule?: { id: string; priority: number; layer: string } };
  cashAccount?: { code: string; name: string; rule?: { id: string; priority: number; layer: string } };
  feeAccount?: { code: string; name: string; rule?: { id: string; priority: number; layer: string } };
  taxAccount?: { code: string; name: string; rule?: { id: string; priority: number; layer: string } } | null;
  cogsAccount?: { code: string; name: string; rule?: { id: string; priority: number; layer: string } } | null;
  inventoryAccount?: { code: string; name: string; rule?: { id: string; priority: number; layer: string } } | null;
  receivableAccount?: { code: string; name: string; rule?: { id: string; priority: number; layer: string } } | null;
  discountAccount?: { code: string; name: string; rule?: { id: string; priority: number; layer: string } } | null;
}

// -----------------------------------------------------------------------------
// Rule Management - Supervision UI
// -----------------------------------------------------------------------------

/**
 * Get all layered rules for supervision UI with filters
 * Response structure: { data: { success, data: { rules: [], pagination, summary } } }
 */
export async function getLayeredRulesForSupervision(options?: {
  layer?: RuleLayer;
  lockStatus?: LockStatus;
  sortBy?: 'priority' | 'usageCount' | 'successRate';
}): Promise<LayeredRule[]> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getLayeredRulesForSupervision',
      params: {
        businessId: authStore.getBusinessId(),
        ...options
      },
      limit: 500,
      businessId: authStore.getBusinessId(),
    });
    // Handle nested response: result.data.data.rules or result.data.rules or result.rules
    const data = result?.data;
    if (data?.data?.rules) return data.data.rules;
    if (data?.rules) return data.rules;
    if (Array.isArray(data)) return data;
    if (Array.isArray(result)) return result;
    return [];
  } catch (error) {
    console.error('Error getting layered rules for supervision:', error);
    return [];
  }
}

/**
 * Get layered rules dashboard summary
 */
export async function getLayeredRulesDashboard(): Promise<LayeredRulesDashboard | null> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getLayeredRulesDashboard',
      params: { businessId: authStore.getBusinessId() }
    });
    return result?.data || result || null;
  } catch (error) {
    console.error('Error getting layered rules dashboard:', error);
    return null;
  }
}

/**
 * Update rule account assignment
 */
export async function updateLayeredRuleAccount(
  ruleId: string,
  account: { code: string; name: string; type?: string },
  userId: string
): Promise<{ success: boolean; data?: LayeredRule; message?: string; error?: string }> {
  try {
    const result = await fetchGraphQLSS({
      query: 'updateLayeredRuleAccount',
      params: { businessId: authStore.getBusinessId() },
      form: { ruleId, account, userId }
    });
    return result || { success: false, error: 'Unknown error' };
  } catch (error) {
    console.error('Error updating rule account:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Update rule criteria
 */
export async function updateLayeredRuleCriteria(
  ruleId: string,
  criteria: LayeredRule['criteria'],
  userId: string
): Promise<{ success: boolean; data?: LayeredRule; message?: string; error?: string }> {
  try {
    const result = await fetchGraphQLSS({
      query: 'updateLayeredRuleCriteria',
      params: { businessId: authStore.getBusinessId() },
      form: { ruleId, criteria, userId }
    });
    return result || { success: false, error: 'Unknown error' };
  } catch (error) {
    console.error('Error updating rule criteria:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Set rule lock status
 */
export async function setLayeredRuleLockStatus(
  ruleId: string,
  lockStatus: LockStatus,
  userId: string,
  reason?: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const result = await fetchGraphQLSS({
      query: 'setLayeredRuleLockStatus',
      params: { businessId: authStore.getBusinessId() },
      form: { ruleId, lockStatus, userId, reason }
    });
    return result || { success: false, error: 'Unknown error' };
  } catch (error) {
    console.error('Error setting rule lock status:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Update a layered rule from the supervision UI
 */
export async function updateLayeredRuleFromSupervision(
  ruleId: string,
  updates: Partial<LayeredRule>,
  userId: string,
  reason?: string
): Promise<{ success: boolean; rule?: LayeredRule; error?: string }> {
  try {
    const result = await fetchGraphQLSS({
      query: 'updateLayeredRuleFromSupervision',
      params: { businessId: authStore.getBusinessId() },
      form: { ruleId, updates, userId, reason }
    });
    return result?.data || result || { success: false, error: 'Unknown error' };
  } catch (error) {
    console.error('Error updating layered rule from supervision:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Bulk update lock status for layered rules
 */
export async function bulkUpdateLayeredRuleLocks(
  ruleIds: string[],
  lockStatus: boolean,
  userId: string,
  reason?: string
): Promise<{
  success: boolean;
  results?: Array<{ ruleId: string; success: boolean; error?: string }>;
  error?: string;
}> {
  try {
    const result = await fetchGraphQLSS({
      query: 'bulkUpdateLayeredRuleLocks',
      params: { businessId: authStore.getBusinessId() },
      form: { ruleIds, lockStatus, userId, reason }
    });
    return result?.data || result || { success: false, error: 'Unknown error' };
  } catch (error) {
    console.error('Error bulk updating layered rule locks:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Delete a layered rule
 */
export async function deleteLayeredRule(ruleId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const result = await fetchGraphQLSS({
      query: 'deleteLayeredRule',
      params: { businessId: authStore.getBusinessId() },
      form: { ruleId }
    });
    return result || { success: false, error: 'Unknown error' };
  } catch (error) {
    console.error('Error deleting layered rule:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Add a new layered rule manually
 */
export async function addLayeredRule(rule: {
  layer: RuleLayer;
  priority: number;
  criteria: LayeredRule['criteria'];
  account: { code: string; name: string; type?: string };
  side: RuleSide;
}): Promise<{ success: boolean; data?: LayeredRule; error?: string }> {
  try {
    const result = await fetchGraphQLSS({
      query: 'addLayeredRule',
      params: { businessId: authStore.getBusinessId() },
      form: { rule }
    });
    return result || { success: false, error: 'Unknown error' };
  } catch (error) {
    console.error('Error adding layered rule:', error);
    return { success: false, error: (error as Error).message };
  }
}

// -----------------------------------------------------------------------------
// AI Rule Generation
// -----------------------------------------------------------------------------

/**
 * Generate rules from chart of accounts using AI
 */
export async function generateRulesFromAccounts(options?: {
  minConfidence?: number;
  dryRun?: boolean;
  replaceExisting?: boolean;
}): Promise<{
  success: boolean;
  data?: {
    accountsAnalyzed: number;
    rulesGenerated: number;
    byLayer: LayeredRulesDashboard['byLayer'];
    suggestions: Array<{
      account: { code: string; name: string; type: string };
      suggestedLayer: RuleLayer;
      confidence: number;
      reason: string;
    }>;
    warnings: string[];
  };
  message?: string;
  error?: string;
}> {
  try {
    const result = await fetchGraphQLSS({
      query: 'generateRulesFromAccounts',
      params: { businessId: authStore.getBusinessId() },
      form: {
        minConfidence: options?.minConfidence ?? 0.5,
        dryRun: options?.dryRun ?? false,
        replaceExisting: options?.replaceExisting ?? false
      }
    });
    return result || { success: false, error: 'Unknown error' };
  } catch (error) {
    console.error('Error generating rules from accounts:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Get pending AI-generated rules awaiting review
 */
export async function getPendingAIRules(): Promise<{
  success: boolean;
  data?: {
    pending: LayeredRule[];
    count: number;
    byLayer: Partial<LayeredRulesDashboard['byLayer']>;
  };
  error?: string;
}> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getPendingAIRules',
      params: { businessId: authStore.getBusinessId() }
    });
    return result || { success: false, error: 'Unknown error' };
  } catch (error) {
    console.error('Error getting pending AI rules:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Review an AI-generated rule (approve, reject, or modify)
 */
export async function reviewAIGeneratedRule(
  ruleId: string,
  action: 'approve' | 'reject' | 'modify',
  userId: string,
  modifications?: {
    account?: { code: string; name: string };
    criteria?: LayeredRule['criteria'];
    priority?: number;
  }
): Promise<{ success: boolean; data?: LayeredRule; message?: string; error?: string }> {
  try {
    const result = await fetchGraphQLSS({
      query: 'reviewAIGeneratedRule',
      params: { businessId: authStore.getBusinessId() },
      form: { ruleId, action, userId, modifications }
    });
    return result || { success: false, error: 'Unknown error' };
  } catch (error) {
    console.error('Error reviewing AI rule:', error);
    return { success: false, error: (error as Error).message };
  }
}

// -----------------------------------------------------------------------------
// Rule Matching
// -----------------------------------------------------------------------------

/**
 * Match accounts for a transaction context
 */
export async function matchAccountsForTransaction(context: {
  transactionType?: string;
  itemType?: string;
  itemCategory?: string;
  paymentMethod?: string;
  paymentProcessor?: string;
}): Promise<{ success: boolean; data?: MatchedAccounts; error?: string }> {
  try {
    const result = await fetchGraphQLSS({
      query: 'matchAccountsForTransaction',
      params: { businessId: authStore.getBusinessId() },
      form: { context }
    });
    return result || { success: false, error: 'Unknown error' };
  } catch (error) {
    console.error('Error matching accounts for transaction:', error);
    return { success: false, error: (error as Error).message };
  }
}

// Legacy functions kept for compatibility
export async function getLayeredRules(): Promise<LayeredRule[]> {
  return getLayeredRulesForSupervision();
}

export async function lockLayeredRule(
  ruleId: string,
  lockStatus: boolean,
  userId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  return setLayeredRuleLockStatus(
    ruleId,
    lockStatus ? 'user_locked' : 'unlocked',
    userId,
    reason
  );
}

export async function testLayeredRules(testData: Record<string, any>): Promise<{
  success: boolean;
  data?: MatchedAccounts;
  error?: string;
}> {
  return matchAccountsForTransaction(testData);
}

/**
 * Get layered rules filtered by layer
 */
export async function getLayeredRulesByLayer(layer: RuleLayer): Promise<LayeredRule[]> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getLayeredRulesByLayer',
      params: {
        businessId: authStore.getBusinessId(),
        layer
      }
    });
    return result?.data || result || [];
  } catch (error) {
    console.error('Error getting layered rules by layer:', error);
    return [];
  }
}

/**
 * Update an existing layered rule
 */
export async function updateLayeredRule(
  ruleId: string,
  updates: Partial<LayeredRule>,
  userId: string
): Promise<{ success: boolean; data?: LayeredRule; error?: string }> {
  try {
    const result = await fetchGraphQLSS({
      query: 'updateLayeredRule',
      params: { businessId: authStore.getBusinessId() },
      form: { ruleId, updates, userId }
    });
    return result?.data || result || { success: false, error: 'Unknown error' };
  } catch (error) {
    console.error('Error updating layered rule:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Match transaction data against layered rules
 */
export async function matchLayeredRules(transactionData: Record<string, any>): Promise<{
  success: boolean;
  data?: {
    matchedRules: LayeredRule[];
    accounts: MatchedAccounts;
    confidence: number;
  };
  error?: string;
}> {
  try {
    const result = await fetchGraphQLSS({
      query: 'matchLayeredRules',
      params: { businessId: authStore.getBusinessId() },
      form: { transactionData }
    });
    return result?.data || result || { success: false, error: 'Unknown error' };
  } catch (error) {
    console.error('Error matching layered rules:', error);
    return { success: false, error: (error as Error).message };
  }
}

// -----------------------------------------------------------------------------
// Deduplication
// -----------------------------------------------------------------------------

/**
 * Find duplicate layered rules
 */
export async function findDuplicateLayeredRules(): Promise<{
  success: boolean;
  duplicates?: Array<{
    ruleIds: string[];
    reason: string;
    suggestedMerge?: LayeredRule;
  }>;
  error?: string;
}> {
  try {
    const result = await fetchGraphQLSS({
      query: 'findDuplicateLayeredRules',
      params: { businessId: authStore.getBusinessId() }
    });
    return result?.data || result || { success: false, error: 'Unknown error' };
  } catch (error) {
    console.error('Error finding duplicate layered rules:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Merge duplicate layered rules
 */
export async function mergeDuplicateLayeredRules(
  ruleIds: string[],
  keepRuleId: string,
  userId: string
): Promise<{ success: boolean; mergedRule?: LayeredRule; error?: string }> {
  try {
    const result = await fetchGraphQLSS({
      query: 'mergeDuplicateLayeredRules',
      params: { businessId: authStore.getBusinessId() },
      form: { ruleIds, keepRuleId, userId }
    });
    return result?.data || result || { success: false, error: 'Unknown error' };
  } catch (error) {
    console.error('Error merging duplicate layered rules:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Automatically deduplicate all layered rules
 */
export async function deduplicateAllLayeredRules(userId: string): Promise<{
  success: boolean;
  mergedCount: number;
  deletedCount: number;
  error?: string;
}> {
  try {
    const result = await fetchGraphQLSS({
      query: 'deduplicateAllLayeredRules',
      params: { businessId: authStore.getBusinessId() },
      form: { userId }
    });
    return result?.data || result || { success: false, mergedCount: 0, deletedCount: 0, error: 'Unknown error' };
  } catch (error) {
    console.error('Error deduplicating layered rules:', error);
    return { success: false, mergedCount: 0, deletedCount: 0, error: (error as Error).message };
  }
}

// -----------------------------------------------------------------------------
// Conversion
// -----------------------------------------------------------------------------

/**
 * Convert existing rules to layered format
 */
export async function convertToLayeredRules(
  sourceType: 'account_mappings' | 'learned_rules' | 'automation_rules',
  userId: string
): Promise<{
  success: boolean;
  convertedCount: number;
  rules?: LayeredRule[];
  error?: string;
}> {
  try {
    const result = await fetchGraphQLSS({
      query: 'convertToLayeredRules',
      params: { businessId: authStore.getBusinessId() },
      form: { sourceType, userId }
    });
    return result?.data || result || { success: false, convertedCount: 0, error: 'Unknown error' };
  } catch (error) {
    console.error('Error converting to layered rules:', error);
    return { success: false, convertedCount: 0, error: (error as Error).message };
  }
}

// -----------------------------------------------------------------------------
// Initialization & Import/Export
// -----------------------------------------------------------------------------

/**
 * Initialize default layered rules for the business
 */
export async function initializeDefaultLayeredRules(): Promise<{
  success: boolean;
  rulesCreated: number;
  error?: string;
}> {
  try {
    const result = await fetchGraphQLSS({
      query: 'initializeDefaultLayeredRules',
      params: { businessId: authStore.getBusinessId() }
    });
    return result?.data || result || { success: false, rulesCreated: 0, error: 'Unknown error' };
  } catch (error) {
    console.error('Error initializing default layered rules:', error);
    return { success: false, rulesCreated: 0, error: (error as Error).message };
  }
}

/**
 * Export all layered rules to JSON
 */
export async function exportLayeredRulesStore(): Promise<{
  success: boolean;
  data?: { rules: LayeredRule[]; exportedAt: string; version: string };
  error?: string;
}> {
  try {
    const result = await fetchGraphQLSS({
      query: 'exportLayeredRulesStore',
      params: { businessId: authStore.getBusinessId() }
    });
    return result?.data || result || { success: false, error: 'Unknown error' };
  } catch (error) {
    console.error('Error exporting layered rules store:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Import layered rules from JSON
 */
export async function importLayeredRulesStore(
  data: { rules: LayeredRule[] },
  mode: 'replace' | 'merge' | 'add_only',
  userId: string
): Promise<{
  success: boolean;
  importedCount: number;
  skippedCount: number;
  error?: string;
}> {
  try {
    const result = await fetchGraphQLSS({
      query: 'importLayeredRulesStore',
      params: { businessId: authStore.getBusinessId() },
      form: { data, mode, userId }
    });
    return result?.data || result || { success: false, importedCount: 0, skippedCount: 0, error: 'Unknown error' };
  } catch (error) {
    console.error('Error importing layered rules store:', error);
    return { success: false, importedCount: 0, skippedCount: 0, error: (error as Error).message };
  }
}

// -----------------------------------------------------------------------------
// Migration
// -----------------------------------------------------------------------------

/**
 * Migrate existing account mappings to layered rules
 */
export async function migrateAccountMappingsToLayered(userId: string): Promise<{
  success: boolean;
  migratedCount: number;
  skippedCount: number;
  error?: string;
}> {
  try {
    const result = await fetchGraphQLSS({
      query: 'migrateAccountMappingsToLayered',
      params: { businessId: authStore.getBusinessId() },
      form: { userId }
    });
    return result?.data || result || { success: false, migratedCount: 0, skippedCount: 0, error: 'Unknown error' };
  } catch (error) {
    console.error('Error migrating account mappings to layered:', error);
    return { success: false, migratedCount: 0, skippedCount: 0, error: (error as Error).message };
  }
}

/**
 * Initialize layered rules from existing accounts
 */
export async function initializeLayeredRulesFromAccounts(): Promise<{
  success: boolean;
  rulesCreated: number;
  error?: string;
}> {
  try {
    const result = await fetchGraphQLSS({
      query: 'initializeLayeredRulesFromAccounts',
      params: { businessId: authStore.getBusinessId() }
    });
    return result?.data || result || { success: false, rulesCreated: 0, error: 'Unknown error' };
  } catch (error) {
    console.error('Error initializing layered rules from accounts:', error);
    return { success: false, rulesCreated: 0, error: (error as Error).message };
  }
}

/**
 * Get available accounts for rule creation
 */
export async function getAvailableAccountsForRules(): Promise<Array<{
  code: string;
  name: string;
  type: string;
  subType?: string;
}>> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getAvailableAccountsForRules',
      params: { businessId: authStore.getBusinessId() }
    });
    return result?.data || result || [];
  } catch (error) {
    console.error('Error getting available accounts for rules:', error);
    return [];
  }
}

/**
 * Get layered rules summary statistics
 */
export async function getLayeredRulesSummary(): Promise<LayeredRulesSummary | null> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getLayeredRulesSummaryConnector',
      params: { businessId: authStore.getBusinessId() }
    });
    return result?.data || result || null;
  } catch (error) {
    console.error('Error getting layered rules summary:', error);
    return null;
  }
}

// =============================================================================
// GROUPED API OBJECT
// =============================================================================

export const supervisionApi = {
  // Adapter Management
  adapters: {
    getAll: getSupervisionAdapters,
    getById: getSupervisionAdapterById,
    create: createSupervisionAdapter,
    lock: lockSupervisionAdapter,
    test: testSupervisionAdapter,
    rollback: rollbackSupervisionAdapter,
    bulkLock: bulkLockSupervisionAdapters,
  },

  // Field Mapping Management
  fieldMappings: {
    getByAdapter: getSupervisionFieldMappings,
    update: updateSupervisionFieldMapping,
    lock: lockSupervisionFieldMapping,
    rollback: rollbackSupervisionFieldMapping,
    addTestCase: addSupervisionTestCase,
    runTestCases: runSupervisionTestCases,
    bulkLock: bulkLockSupervisionFieldMappings,
  },

  // Account Mapping Management
  accountMappings: {
    getAll: getSupervisionAccountMappings,
    create: createSupervisionAccountMapping,
    setManualAccount: setSupervisionManualAccount,
  },

  // AI Suggestions
  suggestions: {
    getPending: getSupervisionPendingSuggestions,
    review: reviewSupervisionSuggestion,
    bulkReview: bulkReviewSupervisionSuggestions,
  },

  // Dashboard & Audit
  dashboard: {
    get: getSupervisionDashboard,
    getAuditLog: getSupervisionAuditLog,
  },

  // Learned Rules (Legacy - use layeredRules instead)
  learnedRules: {
    getAll: getSupervisionLearnedRules,
    lock: lockSupervisionLearnedRule,
    update: updateSupervisionLearnedRule,
    test: testSupervisionLearnedRule,
    rollback: rollbackSupervisionLearnedRule,
  },

  // Layered Rules (New - Hierarchical Rule System)
  layeredRules: {
    // Rule Management
    getAll: getLayeredRules,
    getByLayer: getLayeredRulesByLayer,
    add: addLayeredRule,
    update: updateLayeredRule,
    delete: deleteLayeredRule,
    lock: lockLayeredRule,
    // Rule Matching
    match: matchLayeredRules,
    test: testLayeredRules,
    // Deduplication
    findDuplicates: findDuplicateLayeredRules,
    mergeDuplicates: mergeDuplicateLayeredRules,
    deduplicateAll: deduplicateAllLayeredRules,
    // Conversion
    convertFrom: convertToLayeredRules,
    // Initialization
    initializeDefaults: initializeDefaultLayeredRules,
    export: exportLayeredRulesStore,
    import: importLayeredRulesStore,
    // Supervision Integration
    getForSupervision: getLayeredRulesForSupervision,
    updateFromSupervision: updateLayeredRuleFromSupervision,
    bulkUpdateLocks: bulkUpdateLayeredRuleLocks,
    // Migration
    migrateAccountMappings: migrateAccountMappingsToLayered,
    initializeFromAccounts: initializeLayeredRulesFromAccounts,
    getAvailableAccounts: getAvailableAccountsForRules,
    getSummary: getLayeredRulesSummary,
  },
};

export default supervisionApi;
