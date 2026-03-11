/**
 * Supervision Store
 *
 * Manages state for the AI supervision module including adapters,
 * field mappings, account mappings, suggestions, and audit logs.
 */

import { createSignal, createMemo } from 'solid-js';
import type {
  SupervisedAdapter,
  SupervisedFieldMapping,
  SupervisedAccountMapping,
  AISuggestion,
  SupervisionDashboardData,
  AuditLogEntry,
} from '../types/supervisionTypes';
import {
  getSupervisionAdapters,
  getSupervisionAdapterById,
  getSupervisionFieldMappings,
  getSupervisionAccountMappings,
  getSupervisionPendingSuggestions,
  getSupervisionDashboard,
  lockSupervisionAdapter,
  lockSupervisionFieldMapping,
  updateSupervisionFieldMapping,
  reviewSupervisionSuggestion,
  setSupervisionManualAccount,
  testSupervisionAdapter,
  rollbackSupervisionAdapter,
  rollbackSupervisionFieldMapping,
  getSupervisionLearnedRules,
  lockSupervisionLearnedRule,
  updateSupervisionLearnedRule,
  testSupervisionLearnedRule,
  rollbackSupervisionLearnedRule,
  type LearnedRule,
  // Layered Rules
  getLayeredRulesForSupervision,
  getLayeredRulesSummary,
  lockLayeredRule,
  updateLayeredRuleFromSupervision,
  testLayeredRules,
  bulkUpdateLayeredRuleLocks,
  findDuplicateLayeredRules,
  deduplicateAllLayeredRules,
  migrateAccountMappingsToLayered,
  type LayeredRule,
  type LayeredRulesSummary,
} from '../services/supervisionApi';
import { authStore } from '../../../stores/authStore';

// ============================================================================
// STATE SIGNALS
// ============================================================================

const [adapters, setAdapters] = createSignal<SupervisedAdapter[]>([]);
const [selectedAdapter, setSelectedAdapter] = createSignal<SupervisedAdapter | null>(null);
const [fieldMappings, setFieldMappings] = createSignal<SupervisedFieldMapping[]>([]);
const [selectedFieldMapping, setSelectedFieldMapping] = createSignal<SupervisedFieldMapping | null>(null);
const [accountMappings, setAccountMappings] = createSignal<SupervisedAccountMapping[]>([]);
const [learnedRules, setLearnedRules] = createSignal<LearnedRule[]>([]);
const [selectedLearnedRule, setSelectedLearnedRule] = createSignal<LearnedRule | null>(null);
const [layeredRules, setLayeredRules] = createSignal<LayeredRule[]>([]);
const [selectedLayeredRule, setSelectedLayeredRule] = createSignal<LayeredRule | null>(null);
const [layeredRulesSummary, setLayeredRulesSummary] = createSignal<LayeredRulesSummary | null>(null);
const [pendingSuggestions, setPendingSuggestions] = createSignal<AISuggestion[]>([]);
const [dashboardData, setDashboardData] = createSignal<SupervisionDashboardData | null>(null);
const [auditLog, setAuditLog] = createSignal<AuditLogEntry[]>([]);
const [isLoading, setIsLoading] = createSignal<boolean>(false);
const [error, setError] = createSignal<string | null>(null);

// ============================================================================
// COMPUTED VALUES (MEMOS)
// ============================================================================

/**
 * Count of adapters that are currently locked
 */
const lockedAdaptersCount = createMemo(() =>
  adapters().filter((adapter) => adapter.isLocked).length
);

/**
 * Count of adapters that are currently unlocked
 */
const unlockedAdaptersCount = createMemo(() =>
  adapters().filter((adapter) => !adapter.isLocked).length
);

/**
 * Field mappings with confidence score below 70%
 */
const lowConfidenceMappings = createMemo(() =>
  fieldMappings().filter((mapping) => mapping.confidence < 0.7)
);

/**
 * Field mappings with confidence score at or above 80%
 */
const highConfidenceMappings = createMemo(() =>
  fieldMappings().filter((mapping) => mapping.confidence >= 0.8)
);

/**
 * Count of pending AI suggestions awaiting review
 */
const pendingSuggestionsCount = createMemo(() => pendingSuggestions().length);

/**
 * Count of learned rules that are currently locked
 */
const lockedLearnedRulesCount = createMemo(() =>
  learnedRules().filter((rule) => rule.isLocked).length
);

/**
 * Learned rules with low confidence (below 70%)
 */
const lowConfidenceLearnedRules = createMemo(() =>
  learnedRules().filter((rule) => rule.confidence < 0.7)
);

/**
 * Count of layered rules by layer (9-layer accounting system)
 */
const layeredRulesByLayer = createMemo(() => {
  const rules = layeredRules() || [];
  if (!Array.isArray(rules)) return {
    revenue: 0, payment: 0, tax: 0, cogs: 0, inventory: 0,
    discount: 0, fee: 0, receivable: 0, payable: 0
  };
  return {
    revenue: rules.filter((r) => r.layer === 'revenue').length,
    payment: rules.filter((r) => r.layer === 'payment').length,
    tax: rules.filter((r) => r.layer === 'tax').length,
    cogs: rules.filter((r) => r.layer === 'cogs').length,
    inventory: rules.filter((r) => r.layer === 'inventory').length,
    discount: rules.filter((r) => r.layer === 'discount').length,
    fee: rules.filter((r) => r.layer === 'fee').length,
    receivable: rules.filter((r) => r.layer === 'receivable').length,
    payable: rules.filter((r) => r.layer === 'payable').length,
  };
});

/**
 * Count of locked layered rules
 */
const lockedLayeredRulesCount = createMemo(() => {
  const rules = layeredRules() || [];
  if (!Array.isArray(rules)) return 0;
  return rules.filter((rule) => rule.isLocked || rule.lockStatus !== 'unlocked').length;
});

/**
 * Layered rules with low confidence (below 70%)
 */
const lowConfidenceLayeredRules = createMemo(() => {
  const rules = layeredRules() || [];
  if (!Array.isArray(rules)) return [];
  return rules.filter((rule) => (rule.stats?.confidence ?? rule.confidence ?? 1) < 0.7);
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Map field mapping from API response to store type
 * API uses: sourcePath, targetPath, lock.status
 * Store uses: sourceField, targetField, isLocked
 */
function mapFieldMappingFromApi(m: any, adapterId: string): SupervisedFieldMapping {
  const lock = m.lock || {};
  const isLocked = lock.status === 'locked' || lock.status === 'user_locked';

  return {
    id: m.id,
    adapterId: adapterId,
    sourceField: m.sourcePath || m.sourceField,
    targetField: m.targetPath || m.targetField,
    transform: {
      type: m.transform || 'none',
      params: m.transformParams || {}
    },
    isLocked,
    lockInfo: isLocked ? {
      status: 'USER_LOCKED',
      lockedBy: lock.lockedBy,
      lockedAt: lock.lockedAt,
      reason: lock.reason
    } : { status: 'UNLOCKED' },
    source: m.source === 'ai_generated' ? 'AI_GENERATED' :
            m.source === 'user_modified' ? 'USER_MODIFIED' :
            m.source === 'user_created' ? 'USER_CREATED' : 'AI_GENERATED',
    confidence: m.confidence || 0,
    successCount: m.successCount || 0,
    failureCount: m.failureCount || 0,
    testCases: m.testCases || [],
    version: m.version || 1,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt
  };
}

/**
 * Map account mapping from API response to store type
 * API structure:
 * - criteria: { transactionType, itemCategory?, priority }
 * - accounts: { debitAccount, creditAccount, cogsDebitAccount?, cogsCreditAccount? }
 * - lock: { status, lockedBy, lockedAt, reason?, unlockRequiresApproval }
 */
function mapAccountMappingFromApi(m: any): SupervisedAccountMapping {
  const lock = m.lock || {};
  const isLocked = lock.status === 'locked' || lock.status === 'user_locked' || lock.status === 'ai_locked';
  const criteria = m.criteria || {};
  const accounts = m.accounts || {};
  const debitAccount = accounts.debitAccount || {};
  const creditAccount = accounts.creditAccount || {};

  // Build transaction type description from criteria
  const transactionType = criteria.itemCategory
    ? `${criteria.transactionType} (${criteria.itemCategory})`
    : criteria.transactionType || 'Unknown';

  return {
    id: m.id,
    businessId: m.businessId,
    name: `${transactionType} → ${creditAccount.name || 'N/A'}`,
    transactionType,
    // Show both debit and credit account codes
    accountCode: debitAccount.code || '',
    accountName: debitAccount.name || '',
    // Store the full account references for detail views
    debitAccount: {
      id: debitAccount.code,
      code: debitAccount.code,
      name: debitAccount.name,
      type: debitAccount.type,
      parentId: null
    },
    creditAccount: {
      id: creditAccount.code,
      code: creditAccount.code,
      name: creditAccount.name,
      type: creditAccount.type,
      parentId: null
    },
    criteria: [criteria],
    isLocked,
    lock,
    lockInfo: {
      status: isLocked ? (lock.status === 'ai_locked' ? 'AI_LOCKED' : 'USER_LOCKED') : 'UNLOCKED',
      lockedBy: lock.lockedBy,
      lockedAt: lock.lockedAt,
      reason: lock.reason
    },
    source: m.source === 'ai_generated' ? 'AI_GENERATED' :
            m.source === 'user_created' ? 'USER_CREATED' : 'AI_GENERATED',
    createdBy: m.createdBy,
    confidence: m.confidence || 0,
    priority: criteria.priority,
    usageCount: m.usageCount || 0,
    successCount: m.successCount || 0,
    failureCount: m.failureCount || 0,
    successRate: m.successRate || 0,
    version: m.version || 1,
    pendingSuggestions: m.pendingSuggestions || [],
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
    lastUsedAt: m.lastUsedAt
  };
}

// ============================================================================
// ACTIONS
// ============================================================================

/**
 * Load all supervised adapters
 */
const loadAdapters = async (): Promise<void> => {
  setIsLoading(true);
  setError(null);
  try {
    const data = await getSupervisionAdapters();
    // Ensure data is an array
    const dataArray = Array.isArray(data) ? data : (data?.data || data?.items || []);
    if (!Array.isArray(dataArray)) {
      setAdapters([]);
      return;
    }
    // Map API response to store type - matching actual server response structure
    setAdapters(dataArray.map((a: any) => {
      const globalLock = a.globalLock || {};
      const isLocked = globalLock.status === 'locked' || globalLock.status === 'user_locked';
      return {
        id: a.id,
        name: a.name,
        displayName: a.displayName || a.name,
        description: a.description,
        sourceType: a.sourceSystem || a.sourceType,
        isLocked,
        lockInfo: {
          status: isLocked ? 'USER_LOCKED' : 'UNLOCKED',
          lockedBy: globalLock.lockedBy,
          lockedAt: globalLock.lockedAt,
          reason: globalLock.reason
        },
        confidence: a.confidence || a.detectionConfidence || 0,
        successCount: a.successCount || 0,
        failureCount: a.failureCount || 0,
        processedCount: a.processedCount || 0,
        successRate: a.successRate || 0,
        lastProcessedAt: a.lastUsedAt || a.updatedAt,
        version: a.version || 1,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
        // Store nested data for later use
        fieldMappings: a.fieldMappings || [],
        detectionRules: a.detectionRules || [],
        arrayMappings: a.arrayMappings || [],
        defaultValues: a.defaultValues || [],
        pendingSuggestions: a.pendingSuggestions || []
      };
    }));
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to load adapters');
    throw err;
  } finally {
    setIsLoading(false);
  }
};

/**
 * Load a specific adapter by ID and set it as selected
 */
const loadAdapterById = async (id: string): Promise<void> => {
  setIsLoading(true);
  setError(null);
  try {
    const a = await getSupervisionAdapterById(id);
    if (a) {
      const globalLock = a.globalLock || {};
      const isLocked = globalLock.status === 'locked' || globalLock.status === 'user_locked';
      setSelectedAdapter({
        id: a.id,
        name: a.name,
        displayName: a.displayName || a.name,
        description: a.description,
        sourceType: a.sourceSystem || a.sourceType,
        isLocked,
        lockInfo: {
          status: isLocked ? 'USER_LOCKED' : 'UNLOCKED',
          lockedBy: globalLock.lockedBy,
          lockedAt: globalLock.lockedAt,
          reason: globalLock.reason
        },
        confidence: a.confidence || a.detectionConfidence || 0,
        successCount: a.successCount || 0,
        failureCount: a.failureCount || 0,
        processedCount: a.processedCount || 0,
        successRate: a.successRate || 0,
        lastProcessedAt: a.lastUsedAt || a.updatedAt,
        version: a.version || 1,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
        fieldMappings: a.fieldMappings || [],
        detectionRules: a.detectionRules || [],
        arrayMappings: a.arrayMappings || [],
        defaultValues: a.defaultValues || [],
        pendingSuggestions: a.pendingSuggestions || []
      });

      // Also load field mappings from the adapter response
      if (a.fieldMappings && a.fieldMappings.length > 0) {
        setFieldMappings(a.fieldMappings.map((m: any) => mapFieldMappingFromApi(m, id)));
      }
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to load adapter');
    throw err;
  } finally {
    setIsLoading(false);
  }
};

/**
 * Load field mappings for a specific adapter
 * Note: Field mappings come nested in the adapter response, so this
 * function should be called after loadAdapterById which populates them.
 * This is a fallback that calls the separate API if needed.
 */
const loadFieldMappings = async (adapterId: string): Promise<void> => {
  setIsLoading(true);
  setError(null);
  try {
    const data = await getSupervisionFieldMappings(adapterId);
    // Ensure data is an array and use helper function to map API response to store type
    const dataArray = Array.isArray(data) ? data : (data?.data || data?.items || []);
    setFieldMappings(Array.isArray(dataArray) ? dataArray.map((m: any) => mapFieldMappingFromApi(m, adapterId)) : []);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to load field mappings');
    throw err;
  } finally {
    setIsLoading(false);
  }
};

/**
 * Load all account mappings
 */
const loadAccountMappings = async (): Promise<void> => {
  setIsLoading(true);
  setError(null);
  try {
    const data = await getSupervisionAccountMappings();
    // Ensure data is an array and use helper function to map API response to store type
    const dataArray = Array.isArray(data) ? data : (data?.data || data?.items || []);
    setAccountMappings(Array.isArray(dataArray) ? dataArray.map((m: any) => mapAccountMappingFromApi(m)) : []);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to load account mappings');
    throw err;
  } finally {
    setIsLoading(false);
  }
};

/**
 * Load pending AI suggestions
 */
const loadPendingSuggestions = async (): Promise<void> => {
  setIsLoading(true);
  setError(null);
  try {
    const data = await getSupervisionPendingSuggestions();
    // Ensure data is an array
    const dataArray = Array.isArray(data) ? data : (data?.data || data?.items || []);
    setPendingSuggestions(Array.isArray(dataArray) ? dataArray : []);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to load suggestions');
    throw err;
  } finally {
    setIsLoading(false);
  }
};

/**
 * Load dashboard summary data
 */
const loadDashboard = async (): Promise<void> => {
  setIsLoading(true);
  setError(null);
  try {
    const data = await getSupervisionDashboard();
    setDashboardData(data as any);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    throw err;
  } finally {
    setIsLoading(false);
  }
};

/**
 * Lock an adapter to prevent AI modifications
 */
const lockAdapter = async (adapterId: string, reason: string): Promise<void> => {
  setIsLoading(true);
  setError(null);
  try {
    const userId = authStore.currentUser?.uid || 'system';
    await lockSupervisionAdapter(adapterId, true, userId, reason);
    // Update adapter in list
    setAdapters((prev) =>
      prev.map((adapter) =>
        adapter.id === adapterId
          ? { ...adapter, isLocked: true, lockInfo: { status: 'USER_LOCKED', reason } }
          : adapter
      )
    );
    // Update selected adapter if it's the one being locked
    const current = selectedAdapter();
    if (current?.id === adapterId) {
      setSelectedAdapter({ ...current, isLocked: true, lockInfo: { status: 'USER_LOCKED', reason } });
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to lock adapter');
    throw err;
  } finally {
    setIsLoading(false);
  }
};

/**
 * Unlock an adapter to allow AI modifications
 */
const unlockAdapter = async (adapterId: string): Promise<void> => {
  setIsLoading(true);
  setError(null);
  try {
    const userId = authStore.currentUser?.uid || 'system';
    await lockSupervisionAdapter(adapterId, false, userId);
    // Update adapter in list
    setAdapters((prev) =>
      prev.map((adapter) =>
        adapter.id === adapterId
          ? { ...adapter, isLocked: false, lockInfo: { status: 'UNLOCKED' } }
          : adapter
      )
    );
    // Update selected adapter if it's the one being unlocked
    const current = selectedAdapter();
    if (current?.id === adapterId) {
      setSelectedAdapter({ ...current, isLocked: false, lockInfo: { status: 'UNLOCKED' } });
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to unlock adapter');
    throw err;
  } finally {
    setIsLoading(false);
  }
};

/**
 * Lock a specific field mapping within an adapter
 */
const lockFieldMapping = async (
  adapterId: string,
  mappingId: string,
  reason: string
): Promise<void> => {
  setIsLoading(true);
  setError(null);
  try {
    const userId = authStore.currentUser?.uid || 'system';
    await lockSupervisionFieldMapping(adapterId, mappingId, true, userId, reason);
    // Update field mappings list
    setFieldMappings((prev) =>
      prev.map((mapping) =>
        mapping.id === mappingId
          ? { ...mapping, isLocked: true, lockInfo: { status: 'USER_LOCKED', reason } }
          : mapping
      )
    );
    // Update selected field mapping if it's the one being locked
    const current = selectedFieldMapping();
    if (current?.id === mappingId) {
      setSelectedFieldMapping({ ...current, isLocked: true, lockInfo: { status: 'USER_LOCKED', reason } });
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to lock field mapping');
    throw err;
  } finally {
    setIsLoading(false);
  }
};

/**
 * Unlock a specific field mapping within an adapter
 */
const unlockFieldMapping = async (adapterId: string, mappingId: string): Promise<void> => {
  setIsLoading(true);
  setError(null);
  try {
    const userId = authStore.currentUser?.uid || 'system';
    await lockSupervisionFieldMapping(adapterId, mappingId, false, userId);
    // Update field mappings list
    setFieldMappings((prev) =>
      prev.map((mapping) =>
        mapping.id === mappingId
          ? { ...mapping, isLocked: false, lockInfo: { status: 'UNLOCKED' } }
          : mapping
      )
    );
    // Update selected field mapping if it's the one being unlocked
    const current = selectedFieldMapping();
    if (current?.id === mappingId) {
      setSelectedFieldMapping({ ...current, isLocked: false, lockInfo: { status: 'UNLOCKED' } });
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to unlock field mapping');
    throw err;
  } finally {
    setIsLoading(false);
  }
};

/**
 * Update a field mapping with new values
 */
const updateFieldMapping = async (
  adapterId: string,
  mappingId: string,
  updates: Partial<SupervisedFieldMapping>
): Promise<void> => {
  setIsLoading(true);
  setError(null);
  try {
    const userId = authStore.currentUser?.uid || 'system';
    const apiUpdates = {
      sourceField: updates.sourceField,
      targetField: updates.targetField,
      transformationType: updates.transform?.type,
      transformationRule: updates.transform?.params?.rule
    };
    await updateSupervisionFieldMapping(adapterId, mappingId, apiUpdates, userId);
    // Update field mappings list
    setFieldMappings((prev) =>
      prev.map((mapping) =>
        mapping.id === mappingId
          ? { ...mapping, ...updates }
          : mapping
      )
    );
    // Update selected field mapping if it's the one being updated
    const current = selectedFieldMapping();
    if (current?.id === mappingId) {
      setSelectedFieldMapping({ ...current, ...updates });
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to update field mapping');
    throw err;
  } finally {
    setIsLoading(false);
  }
};

/**
 * Approve an AI suggestion
 */
const approveSuggestion = async (suggestionId: string, notes?: string): Promise<void> => {
  setIsLoading(true);
  setError(null);
  try {
    const userId = authStore.currentUser?.uid || 'system';
    await reviewSupervisionSuggestion(suggestionId, true, userId, notes);
    // Remove the approved suggestion from pending list
    setPendingSuggestions((prev) =>
      prev.filter((suggestion) => suggestion.id !== suggestionId)
    );
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to approve suggestion');
    throw err;
  } finally {
    setIsLoading(false);
  }
};

/**
 * Reject an AI suggestion
 */
const rejectSuggestion = async (suggestionId: string, notes?: string): Promise<void> => {
  setIsLoading(true);
  setError(null);
  try {
    const userId = authStore.currentUser?.uid || 'system';
    await reviewSupervisionSuggestion(suggestionId, false, userId, notes);
    // Remove the rejected suggestion from pending list
    setPendingSuggestions((prev) =>
      prev.filter((suggestion) => suggestion.id !== suggestionId)
    );
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to reject suggestion');
    throw err;
  } finally {
    setIsLoading(false);
  }
};

/**
 * Manually set an account for a mapping
 */
const setManualAccount = async (
  mappingId: string,
  accountField: string,
  account: string
): Promise<void> => {
  setIsLoading(true);
  setError(null);
  try {
    const userId = authStore.currentUser?.uid || 'system';
    await setSupervisionManualAccount(mappingId, accountField as any, account, userId);
    // Update account mappings list
    setAccountMappings((prev) =>
      prev.map((mapping) =>
        mapping.id === mappingId
          ? { ...mapping, accountCode: account, isLocked: true, source: 'USER_CREATED' as const }
          : mapping
      )
    );
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to set manual account');
    throw err;
  } finally {
    setIsLoading(false);
  }
};

/**
 * Test an adapter with a sample payload
 */
const testAdapter = async (adapterId: string, payload: Record<string, unknown>): Promise<unknown> => {
  setIsLoading(true);
  setError(null);
  try {
    const result = await testSupervisionAdapter(adapterId, payload);
    return result;
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to test adapter');
    throw err;
  } finally {
    setIsLoading(false);
  }
};

/**
 * Rollback an adapter to a previous version
 */
const rollbackAdapter = async (adapterId: string, version: number): Promise<void> => {
  setIsLoading(true);
  setError(null);
  try {
    const userId = authStore.currentUser?.uid || 'system';
    await rollbackSupervisionAdapter(adapterId, version, userId);
    // Reload adapter to get updated data
    await loadAdapterById(adapterId);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to rollback adapter');
    throw err;
  } finally {
    setIsLoading(false);
  }
};

/**
 * Rollback a field mapping to a previous version
 */
const rollbackFieldMapping = async (
  adapterId: string,
  mappingId: string,
  version: number
): Promise<void> => {
  setIsLoading(true);
  setError(null);
  try {
    const userId = authStore.currentUser?.uid || 'system';
    await rollbackSupervisionFieldMapping(adapterId, mappingId, version, userId);
    // Reload field mappings to get updated data
    await loadFieldMappings(adapterId);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to rollback field mapping');
    throw err;
  } finally {
    setIsLoading(false);
  }
};

/**
 * Clear the current error state
 */
const clearError = (): void => {
  setError(null);
};

// ============================================================================
// LEARNED RULES ACTIONS
// ============================================================================

/**
 * Load all learned rules
 */
const loadLearnedRules = async (): Promise<void> => {
  setIsLoading(true);
  setError(null);
  try {
    const data = await getSupervisionLearnedRules();
    // Ensure data is an array
    const dataArray = Array.isArray(data) ? data : (data?.data || data?.items || []);
    setLearnedRules(Array.isArray(dataArray) ? dataArray : []);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to load learned rules');
    throw err;
  } finally {
    setIsLoading(false);
  }
};

/**
 * Lock a learned rule to prevent AI modifications
 */
const lockLearnedRule = async (ruleId: string, reason: string): Promise<void> => {
  setIsLoading(true);
  setError(null);
  try {
    const userId = authStore.currentUser?.uid || 'system';
    await lockSupervisionLearnedRule(ruleId, true, userId, reason);
    // Update rule in list
    setLearnedRules((prev) =>
      prev.map((rule) =>
        rule.id === ruleId
          ? { ...rule, isLocked: true, lockedBy: userId, lockReason: reason }
          : rule
      )
    );
    // Update selected rule if it's the one being locked
    const current = selectedLearnedRule();
    if (current?.id === ruleId) {
      setSelectedLearnedRule({ ...current, isLocked: true, lockedBy: userId, lockReason: reason });
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to lock learned rule');
    throw err;
  } finally {
    setIsLoading(false);
  }
};

/**
 * Unlock a learned rule to allow AI modifications
 */
const unlockLearnedRule = async (ruleId: string): Promise<void> => {
  setIsLoading(true);
  setError(null);
  try {
    const userId = authStore.currentUser?.uid || 'system';
    await lockSupervisionLearnedRule(ruleId, false, userId);
    // Update rule in list
    setLearnedRules((prev) =>
      prev.map((rule) =>
        rule.id === ruleId
          ? { ...rule, isLocked: false, lockedBy: undefined, lockReason: undefined }
          : rule
      )
    );
    // Update selected rule if it's the one being unlocked
    const current = selectedLearnedRule();
    if (current?.id === ruleId) {
      setSelectedLearnedRule({ ...current, isLocked: false, lockedBy: undefined, lockReason: undefined });
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to unlock learned rule');
    throw err;
  } finally {
    setIsLoading(false);
  }
};

/**
 * Update a learned rule
 */
const updateLearnedRule = async (
  ruleId: string,
  updates: {
    name?: string;
    description?: string;
    conditions?: Record<string, any>;
    actions?: Record<string, any>;
  }
): Promise<void> => {
  setIsLoading(true);
  setError(null);
  try {
    const userId = authStore.currentUser?.uid || 'system';
    await updateSupervisionLearnedRule(ruleId, updates, userId);
    // Update rule in list
    setLearnedRules((prev) =>
      prev.map((rule) =>
        rule.id === ruleId
          ? { ...rule, ...updates }
          : rule
      )
    );
    // Update selected rule if it's the one being updated
    const current = selectedLearnedRule();
    if (current?.id === ruleId) {
      setSelectedLearnedRule({ ...current, ...updates });
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to update learned rule');
    throw err;
  } finally {
    setIsLoading(false);
  }
};

/**
 * Test a learned rule with sample data
 */
const testLearnedRule = async (ruleId: string, testData: Record<string, unknown>): Promise<unknown> => {
  setIsLoading(true);
  setError(null);
  try {
    const result = await testSupervisionLearnedRule(ruleId, testData);
    return result;
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to test learned rule');
    throw err;
  } finally {
    setIsLoading(false);
  }
};

/**
 * Rollback a learned rule to a previous version
 */
const rollbackLearnedRule = async (ruleId: string, version: number): Promise<void> => {
  setIsLoading(true);
  setError(null);
  try {
    const userId = authStore.currentUser?.uid || 'system';
    await rollbackSupervisionLearnedRule(ruleId, version, userId);
    // Reload rules to get updated data
    await loadLearnedRules();
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to rollback learned rule');
    throw err;
  } finally {
    setIsLoading(false);
  }
};

// ============================================================================
// LAYERED RULES ACTIONS (Hierarchical Rule System - Replaces Account Mappings)
// ============================================================================

/**
 * Load all layered rules for supervision
 */
const loadLayeredRules = async (): Promise<void> => {
  setIsLoading(true);
  setError(null);
  try {
    const data = await getLayeredRulesForSupervision();
    // Ensure data is an array
    const dataArray = Array.isArray(data) ? data : (data?.data || data?.items || []);
    setLayeredRules(Array.isArray(dataArray) ? dataArray : []);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to load layered rules');
    throw err;
  } finally {
    setIsLoading(false);
  }
};

/**
 * Load layered rules summary statistics
 */
const loadLayeredRulesSummary = async (): Promise<void> => {
  setIsLoading(true);
  setError(null);
  try {
    const data = await getLayeredRulesSummary();
    setLayeredRulesSummary(data);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to load layered rules summary');
    throw err;
  } finally {
    setIsLoading(false);
  }
};

/**
 * Lock a layered rule
 */
const lockLayeredRuleAction = async (ruleId: string, reason: string): Promise<void> => {
  setIsLoading(true);
  setError(null);
  try {
    const userId = authStore.currentUser?.uid || 'system';
    await lockLayeredRule(ruleId, true, userId, reason);
    // Update rule in list
    setLayeredRules((prev) =>
      prev.map((rule) =>
        rule.id === ruleId
          ? { ...rule, lock: { ...rule.lock, status: 'user_locked', lockedBy: userId, reason } }
          : rule
      )
    );
    // Update selected rule if it's the one being locked
    const current = selectedLayeredRule();
    if (current?.id === ruleId) {
      setSelectedLayeredRule({ ...current, lock: { ...current.lock, status: 'user_locked', lockedBy: userId, reason } });
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to lock layered rule');
    throw err;
  } finally {
    setIsLoading(false);
  }
};

/**
 * Unlock a layered rule
 */
const unlockLayeredRuleAction = async (ruleId: string): Promise<void> => {
  setIsLoading(true);
  setError(null);
  try {
    const userId = authStore.currentUser?.uid || 'system';
    await lockLayeredRule(ruleId, false, userId);
    // Update rule in list
    setLayeredRules((prev) =>
      prev.map((rule) =>
        rule.id === ruleId
          ? { ...rule, lock: { ...rule.lock, status: 'unlocked' } }
          : rule
      )
    );
    // Update selected rule if it's the one being unlocked
    const current = selectedLayeredRule();
    if (current?.id === ruleId) {
      setSelectedLayeredRule({ ...current, lock: { ...current.lock, status: 'unlocked' } });
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to unlock layered rule');
    throw err;
  } finally {
    setIsLoading(false);
  }
};

/**
 * Update a layered rule from supervision UI
 */
const updateLayeredRule = async (
  ruleId: string,
  updates: Partial<LayeredRule>,
  reason?: string
): Promise<void> => {
  setIsLoading(true);
  setError(null);
  try {
    const userId = authStore.currentUser?.uid || 'system';
    await updateLayeredRuleFromSupervision(ruleId, updates, userId, reason);
    // Update rule in list
    setLayeredRules((prev) =>
      prev.map((rule) =>
        rule.id === ruleId
          ? { ...rule, ...updates }
          : rule
      )
    );
    // Update selected rule if it's the one being updated
    const current = selectedLayeredRule();
    if (current?.id === ruleId) {
      setSelectedLayeredRule({ ...current, ...updates });
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to update layered rule');
    throw err;
  } finally {
    setIsLoading(false);
  }
};

/**
 * Test layered rules with sample data
 */
const testLayeredRulesAction = async (testData: Record<string, unknown>): Promise<unknown> => {
  setIsLoading(true);
  setError(null);
  try {
    const result = await testLayeredRules(testData);
    return result;
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to test layered rules');
    throw err;
  } finally {
    setIsLoading(false);
  }
};

/**
 * Bulk lock/unlock multiple layered rules
 */
const bulkLockLayeredRules = async (ruleIds: string[], lockStatus: boolean, reason?: string): Promise<void> => {
  setIsLoading(true);
  setError(null);
  try {
    const userId = authStore.currentUser?.uid || 'system';
    await bulkUpdateLayeredRuleLocks(ruleIds, lockStatus, userId, reason);
    // Update rules in list
    const newLockStatus = lockStatus ? 'user_locked' : 'unlocked';
    setLayeredRules((prev) =>
      prev.map((rule) =>
        ruleIds.includes(rule.id)
          ? { ...rule, lock: { ...rule.lock, status: newLockStatus as any, lockedBy: lockStatus ? userId : undefined, reason } }
          : rule
      )
    );
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to bulk lock/unlock layered rules');
    throw err;
  } finally {
    setIsLoading(false);
  }
};

/**
 * Find duplicate layered rules
 */
const findDuplicates = async (): Promise<unknown> => {
  setIsLoading(true);
  setError(null);
  try {
    const result = await findDuplicateLayeredRules();
    return result;
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to find duplicate rules');
    throw err;
  } finally {
    setIsLoading(false);
  }
};

/**
 * Deduplicate all layered rules
 */
const deduplicateRules = async (): Promise<unknown> => {
  setIsLoading(true);
  setError(null);
  try {
    const userId = authStore.currentUser?.uid || 'system';
    const result = await deduplicateAllLayeredRules(userId);
    // Reload rules after deduplication
    await loadLayeredRules();
    return result;
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to deduplicate rules');
    throw err;
  } finally {
    setIsLoading(false);
  }
};

/**
 * Migrate account mappings to layered rules
 */
const migrateToLayeredRules = async (): Promise<unknown> => {
  setIsLoading(true);
  setError(null);
  try {
    const userId = authStore.currentUser?.uid || 'system';
    const result = await migrateAccountMappingsToLayered(userId);
    // Reload layered rules after migration
    await loadLayeredRules();
    return result;
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to migrate to layered rules');
    throw err;
  } finally {
    setIsLoading(false);
  }
};

// ============================================================================
// STORE EXPORT
// ============================================================================

export const supervisionStore = {
  // State signals (getters)
  adapters,
  selectedAdapter,
  fieldMappings,
  selectedFieldMapping,
  accountMappings,
  learnedRules,
  selectedLearnedRule,
  layeredRules,
  selectedLayeredRule,
  layeredRulesSummary,
  pendingSuggestions,
  dashboardData,
  auditLog,
  isLoading,
  error,

  // State setters (for direct manipulation if needed)
  setAdapters,
  setSelectedAdapter,
  setFieldMappings,
  setSelectedFieldMapping,
  setAccountMappings,
  setLearnedRules,
  setSelectedLearnedRule,
  setLayeredRules,
  setSelectedLayeredRule,
  setLayeredRulesSummary,
  setPendingSuggestions,
  setDashboardData,
  setAuditLog,

  // Computed values
  lockedAdaptersCount,
  unlockedAdaptersCount,
  lowConfidenceMappings,
  highConfidenceMappings,
  pendingSuggestionsCount,
  lockedLearnedRulesCount,
  lowConfidenceLearnedRules,
  // Layered Rules computed
  layeredRulesByLayer,
  lockedLayeredRulesCount,
  lowConfidenceLayeredRules,

  // Actions
  loadAdapters,
  loadAdapterById,
  loadFieldMappings,
  loadAccountMappings,
  loadLearnedRules,
  loadPendingSuggestions,
  loadDashboard,
  lockAdapter,
  unlockAdapter,
  lockFieldMapping,
  unlockFieldMapping,
  updateFieldMapping,
  lockLearnedRule,
  unlockLearnedRule,
  updateLearnedRule,
  testLearnedRule,
  rollbackLearnedRule,
  approveSuggestion,
  rejectSuggestion,
  setManualAccount,
  testAdapter,
  rollbackAdapter,
  rollbackFieldMapping,
  clearError,
  // Layered Rules actions
  loadLayeredRules,
  loadLayeredRulesSummary,
  lockLayeredRule: lockLayeredRuleAction,
  unlockLayeredRule: unlockLayeredRuleAction,
  updateLayeredRule,
  testLayeredRules: testLayeredRulesAction,
  bulkLockLayeredRules,
  findDuplicates,
  deduplicateRules,
  migrateToLayeredRules,
};

export default supervisionStore;
