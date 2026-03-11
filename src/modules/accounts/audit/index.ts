/**
 * Trial Balance Audit Module
 * Exports for audit functionality
 */

// Types
export type {
  AuditResult,
  AuditSummary,
  ScoredEntry,
  ScoreBreakdown,
  ErrorPattern,
  AuditSuggestion,
  AuditConfig,
  JournalEntry,
  JournalEntryLine
} from './types';

// Service functions
export {
  runAudit,
  scoreEntry,
  detectDuplicates,
  detectRoundingErrors,
  detectMissingCounterparts,
  detectTranspositions,
  detectInternalImbalances,
  generateSuggestions
} from './auditService';

// UI Component
export { default as TrialBalanceAudit } from './TrialBalanceAudit';
