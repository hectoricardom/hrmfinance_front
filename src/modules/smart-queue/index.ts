/**
 * Smart Queue Module
 * Intelligent tax client prioritization and workflow management
 */

// Page Components
export { default as SmartQueuePage } from './components/SmartQueuePage';

// Components
export { default as SeasonMetricsBar } from './components/SeasonMetricsBar';
export { default as QueueSection } from './components/QueueSection';
export { default as QueueClientCard } from './components/QueueClientCard';
export { default as BottlenecksView } from './components/BottlenecksView';
export { default as RevenuePipelineView } from './components/RevenuePipelineView';
export { default as BatchReadyView } from './components/BatchReadyView';
export { default as AgingView } from './components/AgingView';

// Store
export {
  smartQueueStore,
  smartQueueActions,
  smartQueueGetters,
} from './stores/smartQueueStore';

// Services
export {
  smartQueueService,
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
} from './services/smartQueueService';

// Types
export type {
  QueueView,
  QueueSection as QueueSectionType,
  QueueItem,
  PriorityScore,
  PriorityBreakdown,
  SeasonMetrics,
  QueueFilters,
  BatchActionType,
  BatchAction,
  StageBottleneck,
  StageRevenue,
  AgingColor,
  SmartQueueState,
} from './types/smartQueueTypes';

// Constants
export {
  QUEUE_VIEW_LABELS,
  QUEUE_SECTION_LABELS,
  QUEUE_SECTION_COLORS,
  DEFAULT_QUEUE_FILTERS,
  BATCH_ACTIONS,
  AGING_COLOR_HEX,
  getAgingColor,
} from './types/smartQueueTypes';
