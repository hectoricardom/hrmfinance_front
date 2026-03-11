// Accounting Engine Visualization System Types
// Pipeline flow types for visualizing the 7-stage accounting automation process

// ============================================================================
// PIPELINE STAGE DEFINITIONS
// ============================================================================

/**
 * The 7 stages of the accounting automation pipeline
 */
export type PipelineStage =
  | 'data_ingestion'
  | 'adapter_transformation'
  | 'invoice_conversion'
  | 'account_mapping'
  | 'rules_engine'
  | 'entry_book_generation'
  | 'learning_persistence';

/**
 * Pipeline stage configuration with display information
 */
export interface PipelineStageConfig {
  stage: PipelineStage;
  displayName: string;
  description: string;
  order: number;
  icon: string;
  color: string;
}

/**
 * All pipeline stages in order
 */
export const PIPELINE_STAGES: PipelineStageConfig[] = [
  {
    stage: 'data_ingestion',
    displayName: 'Data Ingestion',
    description: 'Raw JSON data from external sources',
    order: 1,
    icon: 'database',
    color: '#3B82F6', // blue
  },
  {
    stage: 'adapter_transformation',
    displayName: 'Adapter Transformation',
    description: 'Field mapping with confidence scores',
    order: 2,
    icon: 'transform',
    color: '#8B5CF6', // purple
  },
  {
    stage: 'invoice_conversion',
    displayName: 'Invoice Conversion',
    description: 'StandardTransaction to Invoice',
    order: 3,
    icon: 'file-text',
    color: '#EC4899', // pink
  },
  {
    stage: 'account_mapping',
    displayName: 'Account Mapping',
    description: 'Decision tree for GL accounts',
    order: 4,
    icon: 'git-branch',
    color: '#F59E0B', // amber
  },
  {
    stage: 'rules_engine',
    displayName: 'Rules Engine',
    description: 'Rule evaluation with conditions',
    order: 5,
    icon: 'settings',
    color: '#10B981', // emerald
  },
  {
    stage: 'entry_book_generation',
    displayName: 'Entry Book Generation',
    description: 'Debit/Credit ledger entries',
    order: 6,
    icon: 'book-open',
    color: '#06B6D4', // cyan
  },
  {
    stage: 'learning_persistence',
    displayName: 'Learning & Persistence',
    description: 'Feedback metrics and storage',
    order: 7,
    icon: 'brain',
    color: '#EF4444', // red
  },
];

// ============================================================================
// STAGE 1: DATA INGESTION
// ============================================================================

/**
 * Supported data source types
 */
export type DataSourceType = 'stripe' | 'shopify' | 'yabaexpress' | 'manual';

/**
 * Data source configuration
 */
export interface DataSource {
  id: string;
  type: DataSourceType;
  name: string;
  rawData: Record<string, any>;
  timestamp: Date;
  batchId?: string;
  connectionId?: string;
  metadata?: {
    apiVersion?: string;
    environment?: 'production' | 'sandbox' | 'test';
    webhookId?: string;
    requestId?: string;
  };
}

/**
 * Raw ingested data record
 */
export interface IngestedData {
  id: string;
  source: DataSource;
  rawPayload: string; // Original JSON string
  parsedData: Record<string, any>;
  ingestionTimestamp: Date;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  retryCount: number;
  checksum?: string;
}

// ============================================================================
// STAGE 2: ADAPTER TRANSFORMATION
// ============================================================================

/**
 * Field transformation types
 */
export type TransformType =
  | 'direct'           // Direct field mapping
  | 'rename'           // Simple rename
  | 'convert'          // Type conversion
  | 'format'           // Format transformation (e.g., date format)
  | 'calculate'        // Calculated from other fields
  | 'lookup'           // Lookup from reference table
  | 'conditional'      // Conditional mapping
  | 'split'            // Split single field into multiple
  | 'merge'            // Merge multiple fields into one
  | 'extract'          // Extract substring or pattern
  | 'default';         // Use default value if missing

/**
 * Field mapping configuration
 */
export interface FieldMapping {
  id: string;
  sourceField: string;           // Dot notation path in source (e.g., 'data.amount')
  targetField: string;           // Dot notation path in target (e.g., 'amount')
  transform: TransformType;
  transformConfig?: {
    expression?: string;         // For calculate/conditional transforms
    format?: string;             // For format transforms (e.g., 'YYYY-MM-DD')
    lookupTable?: string;        // For lookup transforms
    lookupKey?: string;          // Key field in lookup table
    defaultValue?: any;          // Default if source is missing
    splitDelimiter?: string;     // For split transforms
    mergeDelimiter?: string;     // For merge transforms
    extractPattern?: string;     // Regex pattern for extract
  };
  confidence: number;            // 0-1 confidence score
  pattern?: string;              // Regex pattern that triggered this mapping
  isRequired: boolean;
  validationRules?: FieldValidation[];
  lastUpdated: Date;
  updatedBy?: string;
}

/**
 * Field validation configuration
 */
export interface FieldValidation {
  type: 'required' | 'type' | 'range' | 'pattern' | 'enum' | 'custom';
  config: {
    dataType?: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
    min?: number;
    max?: number;
    pattern?: string;
    allowedValues?: any[];
    customValidator?: string; // Expression for custom validation
  };
  errorMessage: string;
}

/**
 * Adapter configuration for a specific source type
 */
export interface AdapterConfig {
  id: string;
  sourceType: DataSourceType;
  name: string;
  description: string;
  version: string;
  fieldMappings: FieldMapping[];
  defaultConfidence: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Transformation result with confidence metrics
 */
export interface TransformationResult {
  id: string;
  sourceId: string;
  adapterId: string;
  inputData: Record<string, any>;
  outputData: Record<string, any>;
  mappingsApplied: Array<{
    mappingId: string;
    sourceValue: any;
    targetValue: any;
    confidence: number;
    wasSuccessful: boolean;
    errorMessage?: string;
  }>;
  overallConfidence: number;
  unmappedFields: string[];
  validationErrors: Array<{
    field: string;
    rule: string;
    message: string;
  }>;
  transformedAt: Date;
  processingTimeMs: number;
}

// ============================================================================
// STAGE 3: INVOICE CONVERSION
// ============================================================================

/**
 * Standard transaction after adapter transformation
 */
export interface StandardTransaction {
  id: string;
  externalId: string;           // Original ID from source system
  sourceType: DataSourceType;
  transactionType: 'sale' | 'refund' | 'payment' | 'expense' | 'transfer' | 'adjustment';

  // Financial details
  amount: number;
  currency: string;
  exchangeRate: number;
  amountInBaseCurrency: number;

  // Tax information
  taxAmount?: number;
  taxRate?: number;
  taxCode?: string;
  isTaxInclusive: boolean;

  // Dates
  transactionDate: Date;
  createdAt: Date;
  dueDate?: Date;
  paidDate?: Date;

  // Description and references
  description: string;
  reference?: string;
  memo?: string;

  // Party information
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  vendorId?: string;
  vendorName?: string;

  // Line items
  lineItems: StandardLineItem[];

  // Payment information
  paymentMethod?: string;
  paymentStatus: 'pending' | 'partial' | 'paid' | 'refunded' | 'failed';

  // Metadata
  metadata: Record<string, any>;
  tags?: string[];

  // Processing info
  confidenceScore: number;
  sourceTransformId: string;
}

/**
 * Standard line item for transactions
 */
export interface StandardLineItem {
  id: string;
  lineNumber: number;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  discountAmount?: number;
  taxAmount?: number;
  taxRate?: number;
  taxCode?: string;
  productId?: string;
  productName?: string;
  sku?: string;
  category?: string;
  metadata?: Record<string, any>;
}

/**
 * Invoice generated from standard transaction
 */
export interface GeneratedInvoice {
  id: string;
  invoiceNumber: string;
  sourceTransactionId: string;

  // Invoice details
  invoiceDate: Date;
  dueDate: Date;
  status: 'draft' | 'pending' | 'sent' | 'paid' | 'overdue' | 'cancelled';

  // Customer
  customerId: string;
  customerName: string;
  customerAddress?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  customerEmail?: string;
  customerPhone?: string;

  // Financial
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  currency: string;
  exchangeRate: number;
  amountPaid: number;
  amountDue: number;

  // Line items
  lineItems: InvoiceLineItem[];

  // References
  purchaseOrderNumber?: string;
  salesOrderNumber?: string;
  reference?: string;
  notes?: string;
  terms?: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  confidenceScore: number;
}

/**
 * Invoice line item
 */
export interface InvoiceLineItem {
  id: string;
  lineNumber: number;
  accountId?: string;
  accountName?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  discountAmount?: number;
  taxCode?: string;
  taxRate?: number;
  taxAmount: number;
  lineTotal: number;
  productId?: string;
  productName?: string;
  sku?: string;
}

// ============================================================================
// STAGE 4: ACCOUNT MAPPING
// ============================================================================

/**
 * Account types in the chart of accounts
 */
export type AccountType =
  | 'asset'
  | 'liability'
  | 'equity'
  | 'revenue'
  | 'expense'
  | 'contra_asset'
  | 'contra_liability'
  | 'contra_equity'
  | 'contra_revenue'
  | 'contra_expense';

/**
 * Decision tree node types
 */
export type DecisionNodeType = 'condition' | 'account' | 'split';

/**
 * Account mapping decision result
 */
export interface AccountDecision {
  id: string;
  transactionId: string;
  accountType: AccountType;
  accountId: string;
  accountCode: string;
  accountName: string;
  subAccountId?: string;
  subAccountCode?: string;
  subAccountName?: string;

  // Decision tree path
  decisionTreeId: string;
  pathTaken: DecisionPathNode[];

  // Confidence and reasoning
  confidence: number;
  reasoning: string;
  alternativeAccounts?: AlternativeAccount[];

  // Flags
  isManualOverride: boolean;
  requiresReview: boolean;

  // Timestamps
  decidedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
}

/**
 * Node in the decision path
 */
export interface DecisionPathNode {
  nodeId: string;
  nodeType: DecisionNodeType;
  condition?: string;
  conditionResult?: boolean;
  selectedBranch?: string;
  explanation: string;
  order: number;
}

/**
 * Alternative account suggestion
 */
export interface AlternativeAccount {
  accountId: string;
  accountCode: string;
  accountName: string;
  confidence: number;
  reasoning: string;
}

/**
 * Decision tree configuration
 */
export interface DecisionTree {
  id: string;
  name: string;
  description: string;
  rootNodeId: string;
  nodes: DecisionTreeNode[];
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * Decision tree node
 */
export interface DecisionTreeNode {
  id: string;
  type: DecisionNodeType;
  label: string;

  // For condition nodes
  condition?: {
    field: string;
    operator: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan' | 'in' | 'regex';
    value: any;
    expression?: string;
  };
  trueBranchId?: string;
  falseBranchId?: string;

  // For account nodes (leaf)
  accountId?: string;
  accountCode?: string;
  accountName?: string;

  // For split nodes (multiple outputs)
  splits?: Array<{
    percentage: number;
    accountId: string;
    accountCode: string;
    accountName: string;
  }>;

  // Position for visualization
  position: { x: number; y: number };
}

// ============================================================================
// STAGE 5: RULES ENGINE
// ============================================================================

/**
 * Rule condition operators
 */
export type RuleOperator =
  | 'equals'
  | 'notEquals'
  | 'greaterThan'
  | 'lessThan'
  | 'greaterThanOrEqual'
  | 'lessThanOrEqual'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'in'
  | 'notIn'
  | 'between'
  | 'exists'
  | 'notExists'
  | 'regex'
  | 'isNull'
  | 'isNotNull';

/**
 * Rule condition
 */
export interface RuleCondition {
  id: string;
  field: string;
  operator: RuleOperator;
  value: any;
  valueType: 'literal' | 'field' | 'expression';
  logicalOperator?: 'and' | 'or';
  nestedConditions?: RuleCondition[];
}

/**
 * Rule evaluation result
 */
export interface RuleEvaluation {
  id: string;
  ruleId: string;
  ruleName: string;
  ruleDescription?: string;
  transactionId: string;

  // Evaluation details
  conditionsEvaluated: ConditionEvaluationResult[];
  overallResult: 'passed' | 'failed' | 'skipped' | 'error';

  // Generated entries
  journalLinesGenerated: GeneratedJournalLine[];

  // Performance
  evaluatedAt: Date;
  evaluationTimeMs: number;

  // Error handling
  errorMessage?: string;
  warningMessages?: string[];
}

/**
 * Individual condition evaluation result
 */
export interface ConditionEvaluationResult {
  conditionId: string;
  field: string;
  operator: RuleOperator;
  expectedValue: any;
  actualValue: any;
  result: boolean;
  explanation: string;
}

/**
 * Generated journal line from rule
 */
export interface GeneratedJournalLine {
  id: string;
  ruleId: string;
  lineNumber: number;
  accountId: string;
  accountCode: string;
  accountName: string;
  description: string;
  debitAmount: number;
  creditAmount: number;
  documentReference?: string;
  memo?: string;
}

/**
 * Accounting rule configuration
 */
export interface AccountingRule {
  id: string;
  name: string;
  description: string;
  category: string;
  priority: number;

  // Trigger conditions
  triggerEvent?: string;
  transactionTypes: string[];
  sourceTypes?: DataSourceType[];

  // Rule conditions
  conditions: RuleCondition[];
  conditionLogic: 'all' | 'any' | 'custom';
  customConditionExpression?: string;

  // Journal entry template
  journalTemplate: JournalEntryTemplate;

  // Status
  isActive: boolean;
  effectiveFrom: Date;
  effectiveTo?: Date;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  version: number;
}

/**
 * Journal entry template
 */
export interface JournalEntryTemplate {
  descriptionTemplate: string;
  referenceTemplate: string;
  lines: JournalLineTemplate[];
}

/**
 * Journal line template
 */
export interface JournalLineTemplate {
  id: string;
  accountExpression: string;
  descriptionTemplate: string;
  amountExpression: string;
  isDebit: boolean;
  conditions?: RuleCondition[];
  documentTemplate?: string;
}

// ============================================================================
// STAGE 6: ENTRY BOOK GENERATION
// ============================================================================

/**
 * Journal entry status
 */
export type JournalEntryStatus = 'draft' | 'pending' | 'approved' | 'posted' | 'voided';

/**
 * Ledger entry (individual debit or credit)
 */
export interface LedgerEntry {
  id: string;
  journalEntryId: string;
  lineNumber: number;

  // Account information
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  subAccountId?: string;
  subAccountCode?: string;
  subAccountName?: string;

  // Amounts
  debit: number;
  credit: number;
  currency: string;
  exchangeRate: number;
  debitInBaseCurrency: number;
  creditInBaseCurrency: number;

  // References
  reference: string;
  document?: string;
  memo?: string;

  // Tracking
  departmentId?: string;
  departmentName?: string;
  projectId?: string;
  projectName?: string;
  costCenterId?: string;
  costCenterName?: string;

  // Tax
  taxCode?: string;
  taxAmount?: number;

  // Source tracking
  sourceRuleId?: string;
  sourceTransactionId?: string;

  // Timestamps
  createdAt: Date;
}

/**
 * Complete journal entry
 */
export interface JournalEntry {
  id: string;
  entryNumber: string;
  entryDate: Date;

  // Description
  description: string;
  reference?: string;
  memo?: string;

  // Status
  status: JournalEntryStatus;

  // Lines
  lines: LedgerEntry[];

  // Totals
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;

  // Currency
  currency: string;
  baseCurrency: string;

  // Source tracking
  sourceType: 'automatic' | 'manual' | 'imported' | 'adjustment';
  sourceTransactionId?: string;
  sourceInvoiceId?: string;
  sourceRuleId?: string;

  // Approval workflow
  requiresApproval: boolean;
  approvedBy?: string;
  approvedAt?: Date;
  postedBy?: string;
  postedAt?: Date;

  // Audit
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy?: string;
}

/**
 * Entry book (collection of journal entries)
 */
export interface EntryBook {
  id: string;
  name: string;
  description?: string;
  period: {
    startDate: Date;
    endDate: Date;
  };

  // Entries
  entries: JournalEntry[];
  entryCount: number;

  // Totals
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;

  // Status
  status: 'open' | 'closed' | 'locked';
  closedAt?: Date;
  closedBy?: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// STAGE 7: LEARNING & PERSISTENCE
// ============================================================================

/**
 * Learning metrics for confidence tracking
 */
export interface LearningMetrics {
  id: string;
  entityType: 'field_mapping' | 'account_decision' | 'rule_evaluation' | 'adapter';
  entityId: string;

  // Confidence tracking
  previousConfidence: number;
  newConfidence: number;
  delta: number;

  // Success/failure counts
  successCount: number;
  failureCount: number;
  totalEvaluations: number;
  successRate: number;

  // Trend analysis
  confidenceHistory: Array<{
    timestamp: Date;
    confidence: number;
    reason?: string;
  }>;
  trend: 'improving' | 'stable' | 'declining';

  // Feedback
  userCorrections: number;
  lastCorrectionAt?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastEvaluatedAt: Date;
}

/**
 * User feedback record
 */
export interface UserFeedback {
  id: string;
  entityType: 'field_mapping' | 'account_decision' | 'rule_evaluation' | 'journal_entry';
  entityId: string;
  transactionId: string;

  // Feedback details
  feedbackType: 'approve' | 'correct' | 'reject';
  originalValue: any;
  correctedValue?: any;
  reason?: string;

  // User info
  userId: string;
  userName: string;

  // Processing
  isProcessed: boolean;
  processedAt?: Date;
  appliedToLearning: boolean;

  // Timestamp
  createdAt: Date;
}

/**
 * Persistence record for audit trail
 */
export interface PersistenceRecord {
  id: string;
  recordType: 'transaction' | 'invoice' | 'journal_entry' | 'feedback' | 'metrics';
  recordId: string;

  // Storage info
  storageLocation: 'database' | 'cache' | 'archive';
  tableName?: string;

  // Operation
  operation: 'create' | 'update' | 'delete' | 'archive';

  // Data snapshot
  dataBefore?: Record<string, any>;
  dataAfter?: Record<string, any>;
  changes?: Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }>;

  // Status
  status: 'pending' | 'completed' | 'failed' | 'rolled_back';
  errorMessage?: string;
  retryCount: number;

  // Timestamps
  requestedAt: Date;
  completedAt?: Date;

  // User tracking
  requestedBy?: string;
}

// ============================================================================
// FLOW VISUALIZATION STATE
// ============================================================================

/**
 * Playback state for animation
 */
export type PlaybackState = 'stopped' | 'playing' | 'paused' | 'stepping';

/**
 * Stage processing status
 */
export type StageStatus = 'pending' | 'processing' | 'completed' | 'error' | 'skipped';

/**
 * Individual stage data in the visualization
 */
export interface StageData {
  stage: PipelineStage;
  status: StageStatus;
  startTime?: Date;
  endTime?: Date;
  processingTimeMs?: number;

  // Stage-specific data
  inputData?: any;
  outputData?: any;

  // Metrics
  itemsProcessed: number;
  itemsFailed: number;
  averageConfidence?: number;

  // Errors and warnings
  errors: Array<{
    code: string;
    message: string;
    details?: any;
  }>;
  warnings: string[];

  // Visual state
  isExpanded: boolean;
  highlightedItems?: string[];
}

/**
 * Data flow between stages
 */
export interface StageConnection {
  id: string;
  fromStage: PipelineStage;
  toStage: PipelineStage;
  dataTransferred: number;
  isActive: boolean;
  animationProgress: number; // 0-1 for animation
}

/**
 * Complete flow visualization state
 */
export interface FlowVisualizationState {
  id: string;
  sessionId: string;

  // Current position
  currentStage: PipelineStage;
  currentStageIndex: number;

  // All stages data
  stages: Record<PipelineStage, StageData>;
  connections: StageConnection[];

  // Playback control
  playbackState: PlaybackState;
  playbackSpeed: number; // 0.5x, 1x, 2x, etc.
  stepMode: 'stage' | 'item' | 'detail';

  // Timeline
  startTime: Date;
  currentTime: Date;
  estimatedEndTime?: Date;

  // Transaction being processed
  activeTransactionId?: string;
  activeTransaction?: StandardTransaction;

  // Overall metrics
  totalTransactionsProcessed: number;
  totalTransactionsFailed: number;
  overallConfidence: number;

  // UI state
  selectedStage?: PipelineStage;
  selectedItemId?: string;
  zoomLevel: number;
  panOffset: { x: number; y: number };

  // Filters
  filters: {
    sourceTypes?: DataSourceType[];
    dateRange?: { start: Date; end: Date };
    minConfidence?: number;
    showErrors: boolean;
    showWarnings: boolean;
  };

  // History for playback
  history: FlowHistoryEntry[];
  historyIndex: number;
}

/**
 * History entry for step-through playback
 */
export interface FlowHistoryEntry {
  id: string;
  timestamp: Date;
  stage: PipelineStage;
  action: string;
  description: string;
  data?: any;
  stageSnapshot: StageData;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Pipeline execution context
 */
export interface PipelineContext {
  sessionId: string;
  userId?: string;
  startTime: Date;
  configuration: {
    autoApprove: boolean;
    minConfidenceThreshold: number;
    stopOnError: boolean;
    enableLearning: boolean;
    dryRun: boolean;
  };
  metadata: Record<string, any>;
}

/**
 * Pipeline execution result
 */
export interface PipelineResult {
  id: string;
  sessionId: string;

  // Status
  status: 'completed' | 'partial' | 'failed';

  // Stages completed
  stagesCompleted: PipelineStage[];
  lastCompletedStage: PipelineStage;
  failedStage?: PipelineStage;

  // Output
  generatedInvoices: GeneratedInvoice[];
  generatedEntries: JournalEntry[];

  // Metrics
  totalProcessingTimeMs: number;
  averageConfidence: number;
  transactionsProcessed: number;
  transactionsFailed: number;

  // Errors
  errors: Array<{
    stage: PipelineStage;
    code: string;
    message: string;
    transactionId?: string;
  }>;

  // Learning metrics
  learningMetricsUpdated: number;
  feedbackGenerated: number;

  // Timestamps
  startTime: Date;
  endTime: Date;
}

/**
 * Event emitted during pipeline processing
 */
export interface PipelineEvent {
  id: string;
  sessionId: string;
  timestamp: Date;
  stage: PipelineStage;
  eventType: 'stage_start' | 'stage_complete' | 'item_processed' | 'error' | 'warning' | 'metric_update';
  data: any;
}
