/**
 * Smart Queue Service
 * Priority calculation algorithm and queue management logic
 */

import { devLog, fetchGraphQLSS } from '../../../services/utils';
import { authStore } from '../../../stores/authStore';
import type { TaxPortal, TaxWorkflowStatus, TaxDocumentRequest } from '../../drake-export/types/drakeTypes';
import {
  TAX_WORKFLOW_STATUS_LABELS,
  TAX_WORKFLOW_STATUS_COLORS,
} from '../../drake-export/types/drakeTypes';
import type {
  QueueItem,
  PriorityScore,
  PriorityBreakdown,
  QueueSection,
  SeasonMetrics,
  QueueFilters,
  StageBottleneck,
  StageRevenue,
  BatchActionType,
} from '../types/smartQueueTypes';

// ============================================
// Constants
// ============================================

/** Priority weight configuration */
const WEIGHTS = {
  deadlineProximity: 0.40,
  timeStuckInStage: 0.25,
  documentCompleteness: 0.20,
  revenuePotential: 0.10,
  returningClientBonus: 0.05,
} as const;

/** Filing deadline for the current tax season (April 15) */
const FILING_DEADLINE = '2025-04-15';

/** Number of days a client must be in a stage before being considered "stuck" */
const STUCK_THRESHOLD_DAYS = 3;

/** Waiting client days threshold to become urgent */
const WAITING_URGENT_DAYS = 3;

// ============================================
// Priority Calculation
// ============================================

/**
 * Calculate days between two dates
 */
const daysBetween = (dateA: number, dateB: number): number => {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor(Math.abs(dateB - dateA) / msPerDay);
};

/**
 * Calculate deadline proximity score (0-100)
 * Higher score = closer to deadline = more urgent
 */
const calcDeadlineProximityScore = (now: number): number => {
  const deadline = new Date(FILING_DEADLINE).getTime();
  const daysUntil = daysBetween(now, deadline);

  if (daysUntil <= 0) return 100;         // Past deadline
  if (daysUntil <= 7) return 95;          // Within 1 week
  if (daysUntil <= 14) return 85;         // Within 2 weeks
  if (daysUntil <= 30) return 70;         // Within 1 month
  if (daysUntil <= 60) return 50;         // Within 2 months
  if (daysUntil <= 90) return 30;         // Within 3 months
  return 10;                               // More than 3 months
};

/**
 * Calculate time stuck in stage score (0-100)
 * Higher score = more days stuck = more urgent
 */
const calcTimeStuckScore = (daysInStage: number): number => {
  if (daysInStage >= 14) return 100;
  if (daysInStage >= 10) return 85;
  if (daysInStage >= 7) return 70;
  if (daysInStage >= 5) return 55;
  if (daysInStage >= 3) return 40;
  if (daysInStage >= 1) return 20;
  return 5;
};

/**
 * Calculate document completeness score (0-100)
 * Higher score = more documents received = more ready
 */
const calcDocumentCompletenessScore = (received: number, required: number): number => {
  if (required === 0) return 50; // No docs required, neutral score
  const ratio = Math.min(received / required, 1);
  return Math.round(ratio * 100);
};

/**
 * Calculate revenue potential score (0-100)
 * Higher score = more revenue potential
 */
const calcRevenuePotentialScore = (estimatedRevenue: number): number => {
  if (estimatedRevenue >= 1000) return 100;
  if (estimatedRevenue >= 500) return 80;
  if (estimatedRevenue >= 300) return 60;
  if (estimatedRevenue >= 150) return 40;
  if (estimatedRevenue > 0) return 20;
  return 5;
};

/**
 * Calculate returning client bonus (0-100)
 */
const calcReturningClientBonus = (isReturning: boolean): number => {
  return isReturning ? 100 : 0;
};

/**
 * Determine which queue section a client belongs to based on workflow status and data
 */
const determineSection = (
  client: TaxPortal,
  daysInStage: number,
  docCompletionPercent: number
): QueueSection => {
  const status = client.workflowStatus;

  // Urgent: rejected returns or clients waiting too long
  if (status === 'rejected') return 'urgent';
  if (status === 'waiting_client' && daysInStage >= WAITING_URGENT_DAYS) return 'urgent';

  // Ready: documents are complete and ready for processing
  if (status === 'docs_complete') return 'ready';

  // Almost ready: collecting docs with >80% completion
  if (status === 'collecting_docs' && docCompletionPercent >= 80) return 'almost_ready';

  // In progress: actively being worked on
  if (status === 'in_review' || status === 'ready_to_file') return 'in_progress';

  // Waiting: everything else that is active
  return 'waiting';
};

/**
 * Calculate comprehensive priority score for a client
 */
const calculatePriority = (
  client: TaxPortal,
  daysInStage: number,
  docReceived: number,
  docRequired: number,
  estimatedRevenue: number,
  isReturning: boolean
): PriorityScore => {
  const now = Date.now();
  const docCompletionPercent = docRequired > 0 ? Math.round((docReceived / docRequired) * 100) : 50;

  const breakdown: PriorityBreakdown = {
    deadlineProximity: calcDeadlineProximityScore(now),
    timeStuckInStage: calcTimeStuckScore(daysInStage),
    documentCompleteness: calcDocumentCompletenessScore(docReceived, docRequired),
    revenuePotential: calcRevenuePotentialScore(estimatedRevenue),
    returningClientBonus: calcReturningClientBonus(isReturning),
  };

  const composite = Math.round(
    breakdown.deadlineProximity * WEIGHTS.deadlineProximity +
    breakdown.timeStuckInStage * WEIGHTS.timeStuckInStage +
    breakdown.documentCompleteness * WEIGHTS.documentCompleteness +
    breakdown.revenuePotential * WEIGHTS.revenuePotential +
    breakdown.returningClientBonus * WEIGHTS.returningClientBonus
  );

  const section = determineSection(client, daysInStage, docCompletionPercent);

  return { composite, breakdown, section };
};

// ============================================
// Data Transformation
// ============================================

/**
 * Transform a TaxPortal into a QueueItem with computed fields
 */
const transformToQueueItem = (
  client: TaxPortal,
  documentRequest?: TaxDocumentRequest
): QueueItem => {
  const now = Date.now();

  // Calculate days in current stage
  const stageDate = client.workflowStatusDate || client.updatedAt || client.createdAt || now;
  const daysInCurrentStage = daysBetween(stageDate, now);

  // Document tracking from document request
  let totalRequired = 0;
  let totalReceived = 0;
  if (documentRequest && documentRequest.requestedDocuments) {
    totalRequired = documentRequest.requestedDocuments.filter(d => d.required).length;
    totalReceived = documentRequest.requestedDocuments.filter(d => d.uploaded || d.notNeeded).length;
  } else {
    // Fallback to client document counts
    totalRequired = Math.max(client.documentCount || 0, 1);
    totalReceived = client.verifiedDocumentCount || 0;
  }

  const docCompletionPercent = totalRequired > 0
    ? Math.round((totalReceived / totalRequired) * 100)
    : 0;

  // Revenue calculation
  const estimatedRevenue = client.paymentAmount || 0;
  const paidAmount = client.paymentPaidAmount || 0;
  const outstandingBalance = Math.max(estimatedRevenue - paidAmount, 0);

  // Returning client detection (created more than 1 year ago or has previous tax year data)
  const isReturning = client.createdAt
    ? daysBetween(client.createdAt, now) > 365
    : false;

  // Last activity
  const lastActivityDate = client.updatedAt || client.workflowStatusDate || null;

  // Priority calculation
  const priority = calculatePriority(
    client,
    daysInCurrentStage,
    totalReceived,
    totalRequired,
    estimatedRevenue,
    isReturning
  );

  return {
    ...client,
    priority,
    totalDocumentsRequired: totalRequired,
    totalDocumentsReceived: totalReceived,
    documentCompletionPercent: docCompletionPercent,
    daysInCurrentStage,
    lastActivityDate,
    estimatedRevenue,
    outstandingBalance,
    isReturningClient: isReturning,
    isFlagged: false,
    documentRequest,
  };
};

// ============================================
// API Methods
// ============================================

/**
 * Fetch all tax portal clients for the current business
 */
export const fetchQueueClients = async (): Promise<TaxPortal[]> => {
  try {
    const businessId = authStore.getBusinessId();
    if (!businessId) {
      devLog('Smart Queue: No business ID available');
      return [];
    }

    // TODO: Create server query "getSmartQueueClients"
    const result = await fetchGraphQLSS({
      query: 'getSmartQueueClients',
      params: { businessId },
    });

    if (result?.error) {
      devLog('Smart Queue: Error fetching clients:', result.error);
      return [];
    }

    return (result?.taxPortals || result?.clients || []) as TaxPortal[];
  } catch (error) {
    devLog('Smart Queue: Error fetching clients:', error);
    return [];
  }
};

/**
 * Fetch document requests for multiple clients
 */
export const fetchDocumentRequests = async (clientIds: string[]): Promise<Record<string, TaxDocumentRequest>> => {
  try {
    const businessId = authStore.getBusinessId();
    if (!businessId || clientIds.length === 0) return {};

    // TODO: Create server query "getDocumentRequestsByClients"
    const result = await fetchGraphQLSS({
      query: 'getDocumentRequestsByClients',
      params: { businessId, clientIds },
    });

    if (result?.error) {
      devLog('Smart Queue: Error fetching document requests:', result.error);
      return {};
    }

    const requests = (result?.documentRequests || []) as TaxDocumentRequest[];
    const requestMap: Record<string, TaxDocumentRequest> = {};
    for (const req of requests) {
      requestMap[req.taxPortalId] = req;
    }
    return requestMap;
  } catch (error) {
    devLog('Smart Queue: Error fetching document requests:', error);
    return {};
  }
};

/**
 * Build the complete queue with priority scores
 */
export const buildQueue = async (): Promise<QueueItem[]> => {
  const clients = await fetchQueueClients();
  return buildQueueFromPortals(clients);
};

/**
 * Build the complete queue from pre-loaded portals (avoids duplicate API calls)
 * Only fetches document requests (which aren't available from the client list)
 */
export const buildQueueFromPortals = async (portals: TaxPortal[]): Promise<QueueItem[]> => {
  if (portals.length === 0) return [];

  // Fetch associated document requests
  const clientIds = portals.map(c => c.id);
  const docRequests = await fetchDocumentRequests(clientIds);

  // Filter out completed, cancelled, and test clients
  const activeStatuses: TaxWorkflowStatus[] = [
    'intake', 'collecting_docs', 'docs_complete', 'in_review',
    'ready_to_file', 'filed', 'rejected', 'hold', 'waiting_client',
  ];

  const activeClients = portals.filter(c =>
    c.workflowStatus && activeStatuses.includes(c.workflowStatus)
  );

  // Transform to queue items
  const queueItems = activeClients.map(client =>
    transformToQueueItem(client, docRequests[client.id])
  );

  // Sort by composite priority (highest first)
  queueItems.sort((a, b) => b.priority.composite - a.priority.composite);

  return queueItems;
};

// ============================================
// Filtering
// ============================================

/**
 * Filter queue items based on filter configuration
 */
export const filterQueueItems = (items: QueueItem[], filters: QueueFilters): QueueItem[] => {
  return items.filter(item => {
    // Search filter
    if (filters.search) {
      const search = filters.search.toLowerCase();
      const fullName = `${item.firstName} ${item.lastName}`.toLowerCase();
      const email = (item.email || '').toLowerCase();
      const phone = (item.phone || '').toLowerCase();
      if (!fullName.includes(search) && !email.includes(search) && !phone.includes(search)) {
        return false;
      }
    }

    // Workflow status filter
    if (filters.workflowStatuses.length > 0 && item.workflowStatus) {
      if (!filters.workflowStatuses.includes(item.workflowStatus)) {
        return false;
      }
    }

    // Payment status filter
    if (filters.paymentStatuses.length > 0 && item.paymentStatus) {
      if (!filters.paymentStatuses.includes(item.paymentStatus)) {
        return false;
      }
    }

    // Section filter
    if (filters.section && item.priority.section !== filters.section) {
      return false;
    }

    // Minimum priority filter
    if (item.priority.composite < filters.minPriority) {
      return false;
    }

    // Max days in stage filter
    if (filters.maxDaysInStage !== null && item.daysInCurrentStage > filters.maxDaysInStage) {
      return false;
    }

    // Flagged filter
    if (filters.flaggedOnly && !item.isFlagged) {
      return false;
    }

    return true;
  });
};

/**
 * Group queue items by section
 */
export const groupBySection = (items: QueueItem[]): Record<QueueSection, QueueItem[]> => {
  const groups: Record<QueueSection, QueueItem[]> = {
    urgent: [],
    ready: [],
    almost_ready: [],
    in_progress: [],
    waiting: [],
  };

  for (const item of items) {
    groups[item.priority.section].push(item);
  }

  // Sort within each section by composite score (highest first)
  for (const section of Object.keys(groups) as QueueSection[]) {
    groups[section].sort((a, b) => b.priority.composite - a.priority.composite);
  }

  return groups;
};

// ============================================
// Metrics Calculation
// ============================================

/**
 * Calculate season metrics from queue items and all clients
 */
export const calculateSeasonMetrics = (allItems: QueueItem[], allClients: TaxPortal[]): SeasonMetrics => {
  const now = Date.now();
  const deadline = new Date(FILING_DEADLINE);
  const daysUntilDeadline = daysBetween(now, deadline.getTime());

  // Stage counts
  const clientsByStage: Record<TaxWorkflowStatus, number> = {
    intake: 0,
    collecting_docs: 0,
    docs_complete: 0,
    in_review: 0,
    ready_to_file: 0,
    filed: 0,
    accepted: 0,
    rejected: 0,
    completed: 0,
    hold: 0,
    waiting_client: 0,
    cancelled: 0,
    test: 0,
  };

  let totalRevenueCollected = 0;
  let totalRevenuePending = 0;
  let completedCount = 0;
  let filedCount = 0;
  let acceptedCount = 0;
  let rejectedCount = 0;
  let inProgressCount = 0;
  let waitingCount = 0;

  for (const client of allClients) {
    const status = client.workflowStatus || 'intake';
    if (status in clientsByStage) {
      clientsByStage[status]++;
    }

    // Revenue tracking
    const paid = client.paymentPaidAmount || 0;
    const total = client.paymentAmount || 0;
    totalRevenueCollected += paid;
    totalRevenuePending += Math.max(total - paid, 0);

    // Status counts
    if (status === 'completed' || status === 'accepted') completedCount++;
    if (status === 'filed') filedCount++;
    if (status === 'accepted') acceptedCount++;
    if (status === 'rejected') rejectedCount++;
    if (['in_review', 'ready_to_file', 'docs_complete', 'collecting_docs'].includes(status)) inProgressCount++;
    if (['waiting_client', 'hold'].includes(status)) waitingCount++;
  }

  const totalClients = allClients.filter(c =>
    c.workflowStatus !== 'cancelled' && c.workflowStatus !== 'test'
  ).length;

  const completionPercent = totalClients > 0
    ? Math.round((completedCount / totalClients) * 100)
    : 0;

  return {
    totalClients,
    completedClients: completedCount,
    inProgressClients: inProgressCount,
    waitingClients: waitingCount,
    totalRevenueCollected,
    totalRevenuePending,
    totalPipelineValue: totalRevenueCollected + totalRevenuePending,
    filedCount,
    acceptedCount,
    rejectedCount,
    filingDeadlineDate: FILING_DEADLINE,
    daysUntilDeadline: now > deadline.getTime() ? -daysUntilDeadline : daysUntilDeadline,
    completionPercent,
    clientsByStage,
  };
};

// ============================================
// Bottleneck Analysis
// ============================================

/**
 * Analyze bottlenecks in the workflow pipeline
 */
export const analyzeBottlenecks = (items: QueueItem[]): StageBottleneck[] => {
  const activeStages: TaxWorkflowStatus[] = [
    'intake', 'collecting_docs', 'docs_complete', 'in_review',
    'ready_to_file', 'filed', 'rejected', 'waiting_client', 'hold',
  ];

  return activeStages.map(stage => {
    const stageItems = items.filter(i => i.workflowStatus === stage);
    const stuckItems = stageItems.filter(i => i.daysInCurrentStage >= STUCK_THRESHOLD_DAYS);

    const totalDays = stageItems.reduce((sum, i) => sum + i.daysInCurrentStage, 0);
    const averageDays = stageItems.length > 0 ? Math.round(totalDays / stageItems.length) : 0;
    const maxDays = stageItems.length > 0
      ? Math.max(...stageItems.map(i => i.daysInCurrentStage))
      : 0;

    return {
      stage,
      label: TAX_WORKFLOW_STATUS_LABELS[stage],
      color: TAX_WORKFLOW_STATUS_COLORS[stage],
      clientCount: stageItems.length,
      stuckCount: stuckItems.length,
      averageDaysInStage: averageDays,
      maxDaysInStage: maxDays,
      isBottleneck: stuckItems.length > 0,
    };
  });
};

// ============================================
// Revenue Pipeline
// ============================================

/**
 * Calculate revenue by workflow stage
 */
export const calculateRevenuePipeline = (items: QueueItem[]): StageRevenue[] => {
  const stages: TaxWorkflowStatus[] = [
    'intake', 'collecting_docs', 'docs_complete', 'in_review',
    'ready_to_file', 'filed', 'accepted', 'completed',
  ];

  return stages.map(stage => {
    const stageItems = items.filter(i => i.workflowStatus === stage);

    let totalRevenue = 0;
    let collectedRevenue = 0;
    let pendingRevenue = 0;

    for (const item of stageItems) {
      const total = item.paymentAmount || 0;
      const paid = item.paymentPaidAmount || 0;
      totalRevenue += total;
      collectedRevenue += paid;
      pendingRevenue += Math.max(total - paid, 0);
    }

    return {
      stage,
      label: TAX_WORKFLOW_STATUS_LABELS[stage],
      color: TAX_WORKFLOW_STATUS_COLORS[stage],
      clientCount: stageItems.length,
      totalRevenue,
      collectedRevenue,
      pendingRevenue,
    };
  });
};

// ============================================
// Batch Operations
// ============================================

/**
 * Execute a batch action on selected items
 */
export const executeBatchAction = async (
  action: BatchActionType,
  itemIds: string[],
  payload?: Record<string, any>
): Promise<{ success: boolean; processedCount: number; errors: string[] }> => {
  const errors: string[] = [];
  let processedCount = 0;

  try {
    const businessId = authStore.getBusinessId();
    if (!businessId) {
      return { success: false, processedCount: 0, errors: ['No business ID available'] };
    }

    // TODO: Create server query "batchUpdateSmartQueue"
    const result = await fetchGraphQLSS({
      query: 'batchUpdateSmartQueue',
      params: {
        businessId,
        action,
        itemIds,
        payload: payload || {},
      },
    });

    if (result?.error) {
      errors.push(result.error);
    } else {
      processedCount = result?.processedCount || itemIds.length;
    }
  } catch (error) {
    devLog('Smart Queue: Batch action error:', error);
    errors.push('An error occurred during batch processing');
  }

  return {
    success: errors.length === 0,
    processedCount,
    errors,
  };
};

/**
 * Update a single client's workflow status
 */
export const updateClientStatus = async (
  clientId: string,
  newStatus: TaxWorkflowStatus
): Promise<boolean> => {
  try {
    const businessId = authStore.getBusinessId();
    if (!businessId) return false;

    // TODO: Create server query "updateTaxPortalStatus"
    const result = await fetchGraphQLSS({
      query: 'updateTaxPortalStatus',
      params: {
        businessId,
        clientId,
        workflowStatus: newStatus,
        workflowStatusDate: Date.now(),
      },
    });

    return !result?.error;
  } catch (error) {
    devLog('Smart Queue: Error updating client status:', error);
    return false;
  }
};

/**
 * Flag or unflag a client
 */
export const toggleClientFlag = async (
  clientId: string,
  flagged: boolean,
  reason?: string
): Promise<boolean> => {
  try {
    const businessId = authStore.getBusinessId();
    if (!businessId) return false;

    // TODO: Create server query "toggleClientFlag"
    const result = await fetchGraphQLSS({
      query: 'toggleClientFlag',
      params: {
        businessId,
        clientId,
        flagged,
        flagReason: reason || '',
      },
    });

    return !result?.error;
  } catch (error) {
    devLog('Smart Queue: Error toggling client flag:', error);
    return false;
  }
};

// Export service as singleton pattern
export const smartQueueService = {
  fetchQueueClients,
  fetchDocumentRequests,
  buildQueue,
  buildQueueFromPortals,
  filterQueueItems,
  groupBySection,
  calculateSeasonMetrics,
  analyzeBottlenecks,
  calculateRevenuePipeline,
  executeBatchAction,
  updateClientStatus,
  toggleClientFlag,
};
