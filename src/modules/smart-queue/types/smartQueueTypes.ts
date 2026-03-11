/**
 * Smart Queue Types
 * Types for the intelligent tax client queue management system
 */

import type {
  TaxPortal,
  TaxWorkflowStatus,
  TaxPaymentStatus,
  TaxDocumentRequest,
  RequestedDocumentType,
} from '../../drake-export/types/drakeTypes';

// ============================================
// Queue View Types
// ============================================

/** Available queue view modes */
export type QueueView = 'my_day' | 'bottlenecks' | 'revenue' | 'batch' | 'aging';

/** Queue section categories for the My Day view */
export type QueueSection = 'urgent' | 'ready' | 'almost_ready' | 'in_progress' | 'waiting';

/** Labels for each queue view */
export const QUEUE_VIEW_LABELS: Record<QueueView, string> = {
  my_day: 'My Day',
  bottlenecks: 'Bottlenecks',
  revenue: 'Revenue',
  batch: 'Batch',
  aging: 'Aging',
};

/** Labels for each queue section */
export const QUEUE_SECTION_LABELS: Record<QueueSection, string> = {
  urgent: 'Urgent Attention',
  ready: 'Ready to Process',
  almost_ready: 'Almost Ready',
  in_progress: 'In Progress',
  waiting: 'Waiting',
};

/** Colors for each queue section */
export const QUEUE_SECTION_COLORS: Record<QueueSection, string> = {
  urgent: '#ef4444',     // red
  ready: '#22c55e',      // green
  almost_ready: '#1a73e8', // primary blue
  in_progress: '#8b5cf6', // purple
  waiting: '#f59e0b',    // amber
};

// ============================================
// Priority Score Types
// ============================================

/** Breakdown of how a priority score was calculated */
export interface PriorityBreakdown {
  deadlineProximity: number;     // 0-100, weight: 40%
  timeStuckInStage: number;      // 0-100, weight: 25%
  documentCompleteness: number;  // 0-100, weight: 20%
  revenuePotential: number;      // 0-100, weight: 10%
  returningClientBonus: number;  // 0-100, weight: 5%
}

/** Priority score with composite and breakdown */
export interface PriorityScore {
  composite: number;             // 0-100 weighted composite score
  breakdown: PriorityBreakdown;
  section: QueueSection;         // Assigned section based on score and status
}

// ============================================
// Queue Item Types
// ============================================

/** Extended TaxPortal with computed queue fields */
export interface QueueItem extends TaxPortal {
  // Computed priority fields
  priority: PriorityScore;

  // Document tracking
  totalDocumentsRequired: number;
  totalDocumentsReceived: number;
  documentCompletionPercent: number;

  // Time tracking
  daysInCurrentStage: number;
  lastActivityDate: number | null;

  // Revenue
  estimatedRevenue: number;
  outstandingBalance: number;

  // Flags
  isReturningClient: boolean;
  isFlagged: boolean;
  flagReason?: string;

  // Associated document request (if any)
  documentRequest?: TaxDocumentRequest;
}

// ============================================
// Season Metrics Types
// ============================================

/** Aggregated metrics for the current tax season */
export interface SeasonMetrics {
  totalClients: number;
  completedClients: number;
  inProgressClients: number;
  waitingClients: number;

  // Revenue
  totalRevenueCollected: number;
  totalRevenuePending: number;
  totalPipelineValue: number;

  // Filing
  filedCount: number;
  acceptedCount: number;
  rejectedCount: number;

  // Deadline
  filingDeadlineDate: string;        // ISO date string
  daysUntilDeadline: number;

  // Progress
  completionPercent: number;

  // Stage breakdown
  clientsByStage: Record<TaxWorkflowStatus, number>;
}

// ============================================
// Filter Types
// ============================================

/** Filters for the queue */
export interface QueueFilters {
  search: string;
  workflowStatuses: TaxWorkflowStatus[];
  paymentStatuses: TaxPaymentStatus[];
  section: QueueSection | null;
  minPriority: number;
  maxDaysInStage: number | null;
  flaggedOnly: boolean;
}

/** Default filter values */
export const DEFAULT_QUEUE_FILTERS: QueueFilters = {
  search: '',
  workflowStatuses: [],
  paymentStatuses: [],
  section: null,
  minPriority: 0,
  maxDaysInStage: null,
  flaggedOnly: false,
};

// ============================================
// Batch Action Types
// ============================================

/** Available batch actions */
export type BatchActionType =
  | 'mark_in_review'
  | 'mark_ready_to_file'
  | 'export_to_drake'
  | 'send_message'
  | 'send_reminder'
  | 'mark_filed';

/** Batch action definition */
export interface BatchAction {
  type: BatchActionType;
  label: string;
  icon: string;
  description: string;
  requiredStatuses?: TaxWorkflowStatus[];  // Only available for items in these statuses
  confirmationRequired: boolean;
}

/** Available batch actions configuration */
export const BATCH_ACTIONS: BatchAction[] = [
  {
    type: 'mark_in_review',
    label: 'Mark as In Review',
    icon: 'eye',
    description: 'Move selected clients to In Review status',
    requiredStatuses: ['docs_complete'],
    confirmationRequired: true,
  },
  {
    type: 'mark_ready_to_file',
    label: 'Mark Ready to File',
    icon: 'check',
    description: 'Move selected clients to Ready to File status',
    requiredStatuses: ['in_review'],
    confirmationRequired: true,
  },
  {
    type: 'export_to_drake',
    label: 'Export to Drake',
    icon: 'download',
    description: 'Export selected clients for Drake processing',
    requiredStatuses: ['docs_complete', 'in_review', 'ready_to_file'],
    confirmationRequired: true,
  },
  {
    type: 'send_message',
    label: 'Send Message',
    icon: 'mail',
    description: 'Send a message to selected clients',
    confirmationRequired: false,
  },
  {
    type: 'send_reminder',
    label: 'Send Reminder',
    icon: 'bell',
    description: 'Send document upload reminder to selected clients',
    requiredStatuses: ['collecting_docs', 'waiting_client'],
    confirmationRequired: true,
  },
  {
    type: 'mark_filed',
    label: 'Mark as Filed',
    icon: 'send',
    description: 'Mark selected clients as filed',
    requiredStatuses: ['ready_to_file'],
    confirmationRequired: true,
  },
];

// ============================================
// Bottleneck Analysis Types
// ============================================

/** Bottleneck information for a workflow stage */
export interface StageBottleneck {
  stage: TaxWorkflowStatus;
  label: string;
  color: string;
  clientCount: number;
  stuckCount: number;         // Clients in stage > 3 days
  averageDaysInStage: number;
  maxDaysInStage: number;
  isBottleneck: boolean;      // True if stuckCount > 0
}

// ============================================
// Revenue Pipeline Types
// ============================================

/** Revenue data for a workflow stage */
export interface StageRevenue {
  stage: TaxWorkflowStatus;
  label: string;
  color: string;
  clientCount: number;
  totalRevenue: number;
  collectedRevenue: number;
  pendingRevenue: number;
}

// ============================================
// Aging Entry Types
// ============================================

/** Aging color thresholds */
export type AgingColor = 'green' | 'amber' | 'red';

/** Get aging color based on days stuck */
export const getAgingColor = (days: number): AgingColor => {
  if (days <= 3) return 'green';
  if (days <= 7) return 'amber';
  return 'red';
};

/** Aging color hex values */
export const AGING_COLOR_HEX: Record<AgingColor, string> = {
  green: '#22c55e',
  amber: '#f59e0b',
  red: '#ef4444',
};

// ============================================
// Store State Type
// ============================================

/** Smart Queue store state */
export interface SmartQueueState {
  // Data
  queueItems: QueueItem[];
  seasonMetrics: SeasonMetrics | null;

  // View state
  currentView: QueueView;
  filters: QueueFilters;

  // Batch selection
  selectedItemIds: string[];

  // UI state
  isLoading: boolean;
  error: string | null;
  expandedSections: Record<QueueSection, boolean>;

  // Batch processing
  batchProcessing: boolean;
  batchProgress: number;
  batchTotal: number;
}
