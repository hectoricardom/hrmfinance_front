// Stage components for the Accounting Engine Visualization System
export { default as Stage1DataIngestion } from './Stage1DataIngestion';
export { default as Stage2AdapterTransform } from './Stage2AdapterTransform';
export { default as Stage3InvoiceConversion } from './Stage3InvoiceConversion';
export { default as Stage4AccountMapping } from './Stage4AccountMapping';
export { default as Stage5RulesEngine } from './Stage5RulesEngine';
export { default as Stage6EntryBookGen } from './Stage6EntryBookGen';
export { default as Stage7LearningPersist } from './Stage7LearningPersist';

// Type exports from Stage 1
export type {
  DataSource,
  Stage1Props,
} from './Stage1DataIngestion';

// Type exports from Stage 2
export type {
  FieldMapping,
  PatternDetection,
  StandardTransaction as Stage2StandardTransaction,
  Stage2Props,
} from './Stage2AdapterTransform';

// Type exports from Stage 3
export type {
  StandardTransaction,
  LineItem,
  PaymentAllocation,
  AccountAssignment,
  Invoice,
  Stage3Props,
} from './Stage3InvoiceConversion';

// Type exports from Stage 7
export type { Stage7LearningPersistProps, LearningMetrics } from './Stage7LearningPersist';
