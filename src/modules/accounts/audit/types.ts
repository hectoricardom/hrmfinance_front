/**
 * Trial Balance Audit Types
 */

// Re-export or reference existing types
import { JournalEntry, JournalEntryLine } from '../../journal/stores/entryBookStore';

export type { JournalEntry, JournalEntryLine };

export interface AuditResult {
  discrepancy: number;
  scoredEntries: ScoredEntry[];
  patterns: ErrorPattern[];
  suggestions: AuditSuggestion[];
  summary: AuditSummary;
}

export interface AuditSummary {
  totalEntries: number;
  highRiskEntries: number;
  mediumRiskEntries: number;
  lowRiskEntries: number;
  patternsDetected: number;
}

export interface ScoredEntry {
  entry: JournalEntry;
  totalScore: number;
  breakdown: ScoreBreakdown;
  flags?: string[];
  suggestions?: string[];
}

export interface ScoreBreakdown {
  amountMatch: number;      // 0-40 pts - Entry amount matches/divisible by discrepancy
  roundingError: number;    // 0-15 pts - Entry has cent-level precision issues
  internalBalance: number;  // 0-15 pts - Entry debits ≠ credits internally
  duplicateRisk?: number;    // 0-10 pts - Similar entry exists (same amount/date)
  missingCounterpart?: number; // 0-10 pts - One-sided entry detected
  statusRisk?: number;       // 0-10 pts - Draft=10, Posted=5, Void=0
}

export interface ErrorPattern {
  type: 'duplicate' | 'rounding' | 'missing_counterpart' | 'transposition' | 'imbalance';
  severity: 'high' | 'medium' | 'low';
  description: string;
  affectedEntries: string[]; // entry IDs
  potentialImpact?: number;
  suggestedFix?: string;
}

export interface AuditSuggestion {
  priority: 'high' | 'medium' | 'low';
  category: string;
  message: string;
  affectedEntries: string[];
  action: string;
}

export interface AuditConfig {
  includeStatuses: ('draft' | 'posted' | 'void')[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  minScore: number;
}
