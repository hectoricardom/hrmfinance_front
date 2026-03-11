/**
 * Accounting Flow Module
 *
 * Interactive 7-stage visualization system documenting how the accounting
 * engine processes transactions from raw data ingestion through Entry Book
 * generation with learning feedback.
 *
 * Stages:
 * 1. Data Ingestion - Raw JSON from external sources
 * 2. Adapter Transform - Field mapping and pattern detection
 * 3. Invoice Conversion - StandardTransaction to Invoice
 * 4. Account Mapping - Decision tree for GL accounts
 * 5. Rules Engine - Rule evaluation and conditions
 * 6. Entry Book Generation - Debit/Credit ledger entries
 * 7. Learning & Persistence - Feedback metrics and learning
 */

// Types
export type {
  PipelineStage,
  DataSourceType,
  PlaybackSpeed,
  FlowState,
  DataSource,
  FieldMapping,
  MappingPattern,
  StandardTransaction,
  TransactionItem,
  AccountDecision,
  DecisionNode,
  RuleEvaluation,
  ConditionResult,
  LedgerEntry,
  EntryBookResult,
  LearningMetrics
} from './types/flowTypes';

// Store
export {
  flowVisualizationStore,
  STAGE_NAMES,
  STAGE_DESCRIPTIONS
} from './stores/flowVisualizationStore';

// Sample Data
export {
  getStripeSample,
  getShopifySample,
  getYabaExpressSample,
  getManualSample,
  getAllSamples
} from './data/sampleData';

// Shared Components
export { default as JsonViewer } from './components/shared/JsonViewer';
export { default as MappingTable } from './components/shared/MappingTable';
export { default as DecisionTree } from './components/shared/DecisionTree';
export { default as ConditionEvaluator } from './components/shared/ConditionEvaluator';
export { default as LedgerPreview } from './components/shared/LedgerPreview';
export { default as ConfidenceBar } from './components/shared/ConfidenceBar';

// Stage Components
export { default as Stage1DataIngestion } from './components/stages/Stage1DataIngestion';
export { default as Stage2AdapterTransform } from './components/stages/Stage2AdapterTransform';
export { default as Stage3InvoiceConversion } from './components/stages/Stage3InvoiceConversion';
export { default as Stage4AccountMapping } from './components/stages/Stage4AccountMapping';
export { default as Stage5RulesEngine } from './components/stages/Stage5RulesEngine';
export { default as Stage6EntryBookGen } from './components/stages/Stage6EntryBookGen';
export { default as Stage7LearningPersist } from './components/stages/Stage7LearningPersist';

// Navigation
export { default as StageNavigator } from './components/StageNavigator';

// Main Container
export { default as AccountingFlowVisualization } from './components/AccountingFlowVisualization';

// Page
export { default as AccountingFlowPage } from './pages/AccountingFlowPage';
