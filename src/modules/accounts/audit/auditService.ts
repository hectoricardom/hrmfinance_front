import {
  AuditResult,
  ScoredEntry,
  ScoreBreakdown,
  ErrorPattern,
  AuditSuggestion,
  AuditConfig,
} from './types';
import { JournalEntry } from '../../journal/stores/entryBookStore';
import { formatFloat } from '../../../services/utils';

const DEFAULT_CONFIG: AuditConfig = {
  includeStatuses: ['draft', 'posted'],
  dateRange: undefined,
  minScore: 0,
};

/**
 * Run a comprehensive audit on journal entries to identify potential discrepancy sources
 */
export function runAudit(
  entries: JournalEntry[],
  totalDebits: number,
  totalCredits: number,
  config?: Partial<AuditConfig>
): AuditResult {
  const auditConfig = { ...DEFAULT_CONFIG, ...config };
  const discrepancy = totalDebits - totalCredits;

  // Filter entries by config - handle undefined/null status
  let filteredEntries = entries.filter((entry) => {
    const status = entry.status || 'posted'; // Default to posted if undefined
    return auditConfig.includeStatuses.includes(status as any);
  });

  if (auditConfig.dateRange) {
    const { start, end } = auditConfig.dateRange;
    filteredEntries = filteredEntries.filter((entry) => {
      const entryDate = new Date(entry.date);
      return entryDate >= start && entryDate <= end;
    });
  }

  // Score each entry
  const scoredEntries = filteredEntries
    .map((entry) => scoreEntry(entry, discrepancy, filteredEntries))
    .filter((scored) => scored.totalScore >= auditConfig.minScore)
    .sort((a, b) => b.totalScore - a.totalScore);

  // Detect error patterns
  const patterns: ErrorPattern[] = [
    ...detectDuplicates(filteredEntries),
    ...detectRoundingErrors(filteredEntries),
    ...detectMissingCounterparts(filteredEntries),
    ...detectTranspositions(discrepancy, filteredEntries),
    ...detectInternalImbalances(filteredEntries),
  ];

  // Generate suggestions
  const suggestions = generateSuggestions(scoredEntries, patterns);

  return {
    discrepancy,
    scoredEntries,
    patterns,
    suggestions,
    summary: {
      totalEntries: filteredEntries.length,
      highRiskEntries: scoredEntries.filter((e) => e.totalScore >= 60).length,
      mediumRiskEntries: scoredEntries.filter(
        (e) => e.totalScore >= 30 && e.totalScore < 60
      ).length,
      lowRiskEntries: scoredEntries.filter((e) => e.totalScore < 30).length,
      patternsDetected: patterns.length,
    },
  };
}

/**
 * Score a journal entry based on its likelihood of causing the discrepancy
 */
export function scoreEntry(
  entry: JournalEntry,
  discrepancy: number,
  allEntries: JournalEntry[]
): ScoredEntry {

  const breakdown: ScoreBreakdown = {
    amountMatch: calculateAmountMatchScore(entry, discrepancy),
    roundingError: calculateRoundingErrorScore(entry),
    internalBalance: calculateInternalBalanceScore(entry),
    duplicateRisk: calculateDuplicateRiskScore(entry, allEntries),
    missingCounterpart: calculateMissingCounterpartScore(entry),
    //statusRisk: calculateStatusRiskScore(entry),
  };

  const totalScore =
    breakdown.amountMatch +
    breakdown.roundingError +
    breakdown.internalBalance +
    breakdown.duplicateRisk +
    breakdown.missingCounterpart 

  return {
    entry,
    totalScore,
    breakdown,
  };
}


/**
 * Calculate amount match score (0-40 points)
 */
function calculateAmountMatchScore(
  entry: JournalEntry,
  discrepancy: number
): number {
  const absDiscrepancy = Math.abs(discrepancy);
  if (absDiscrepancy === 0) return 0;
  if (!entry.lines || entry.lines.length === 0) return 0;

  const entryTotal = Math.abs(
    entry.lines.reduce((sum, line) => sum + (line.amount || 0), 0)
  );

  // 40 pts if entry total equals discrepancy
  if (Math.abs(entryTotal - absDiscrepancy) < 0.01) {
    return 40;
  }

  // 30 pts if discrepancy is divisible by entry total
  if (entryTotal > 0 && Math.abs((absDiscrepancy % entryTotal) / entryTotal) < 0.01) {
    return 30;
  }

  // 20 pts if entry total is within 10% of discrepancy
  const percentDiff = Math.abs(entryTotal - absDiscrepancy) / absDiscrepancy;
  if (percentDiff <= 0.1) {
    return 20;
  }

  // 10 pts if any line amount equals discrepancy
  const hasMatchingLine = entry.lines?.some(
    (line) => Math.abs(Math.abs(line.amount || 0) - absDiscrepancy) < 0.01
  );
  if (hasMatchingLine) {
    return 10;
  }

  return 0;
}

/**
 * Calculate rounding error score (0-15 points)
 */
function calculateRoundingErrorScore(entry: JournalEntry): number {
  let score = 0;
  if (!entry.lines || entry.lines.length === 0) return 0;

  for (const line of entry.lines) {
    const amount = Math.abs(line.amount);
    const decimalPart = amount - Math.floor(amount);

    // Check for repeating decimals (.333333, .666666)
    const decimalStr = decimalPart.toFixed(6);
    if (
      decimalStr.includes('333333') ||
      decimalStr.includes('666666') ||
      decimalStr.includes('999999')
    ) {
      score += 10;
      break;
    }

    // Check for cent-level issues (e.g., .005, .015)
    if (Math.abs(decimalPart % 0.01) > 0.001) {
      score += 5;
      break;
    }
  }

  return Math.min(score, 15);
}

/**
 * Calculate internal balance score (0-15 points)
 */
function calculateInternalBalanceScore(entry: JournalEntry): number {
  if (!entry.lines || entry.lines.length === 0) return 0;

  const totalDebits = entry.lines
    .reduce((sum, line) => sum + (line.debitAmount || (line.isDebit ? line.amount : 0) || 0), 0);

  const totalCredits = entry.lines
    .reduce((sum, line) => sum + (line.creditAmount || (!line.isDebit ? line.amount : 0) || 0), 0);

  const imbalance = Math.abs(totalDebits - totalCredits);

  return imbalance > 0.01 ? 15 : 0;
}

/**
 * Calculate duplicate risk score (0-10 points)
 */
function calculateDuplicateRiskScore(
  entry: JournalEntry,
  allEntries: JournalEntry[]
): number {
  if (!entry.lines || entry.lines.length === 0) return 0;
  const entryTotal = entry.lines.reduce((sum, line) => sum + (line.amount || 0), 0);

  const duplicates = allEntries.filter((other) => {
    if (other.id === entry.id) return false;
    if (other.date !== entry.date) return false;

    const otherTotal = other.lines?.reduce((sum, line) => sum + (line.amount || 0), 0) || 0;
    const amountDiff = Math.abs(entryTotal - otherTotal);
    const percentDiff = Math.abs(entryTotal) > 0
      ? amountDiff / Math.abs(entryTotal)
      : 0;

    return percentDiff <= 0.01; // Within 1%
  });

  return duplicates.length > 0 ? 10 : 0;
}

/**
 * Calculate missing counterpart score (0-10 points)
 */
function calculateMissingCounterpartScore(entry: JournalEntry): number {
  if (!entry.lines || entry.lines.length === 0) return 0;

  const debitAccounts = new Set(
    entry.lines.filter((line) => line.isDebit || (line.debitAmount && line.debitAmount > 0)).map((line) => line.accountId)
  );

  const creditAccounts = new Set(
    entry.lines.filter((line) => !line.isDebit || (line.creditAmount && line.creditAmount > 0)).map((line) => line.accountId)
  );

  // Simple check: if only debits or only credits, it's suspicious
  if (debitAccounts.size === 0 || creditAccounts.size === 0) {
    return 10;
  }

  return 0;
}

/**
 * Calculate status risk score (0-10 points)
 */
function calculateStatusRiskScore(entry: JournalEntry): number {
  switch (entry.status) {
    case 'draft':
      return 10;
    case 'posted':
      return 5;
    case 'void':
      return 0;
    default:
      return 5;
  }
}

/**
 * Check if two entries cancel each other out (reversal entries)
 * Returns true if:
 * 1. Entries have matching amount AND (reference OR document)
 * 2. The lines in entry2 are the opposite of entry1 (debits become credits and vice versa)
 */
function entriesCancelOut(entry1: JournalEntry, entry2: JournalEntry): boolean {
  if (!entry1.lines?.length || !entry2.lines?.length) return false;

  // Check if entries have same amount
  const entry1Total = entry1.lines.reduce((sum, line) => sum + (line.amount || 0), 0);
  const entry2Total = entry2.lines.reduce((sum, line) => sum + (line.amount || 0), 0);
  const amountDiff = Math.abs(entry1Total - entry2Total);
  const sameAmount = Math.abs(entry1Total) > 0
    ? (amountDiff / Math.abs(entry1Total)) <= 0.01
    : amountDiff < 0.01;

  if (!sameAmount) return false;

  // Check if entries have same reference OR document
  const entry1Doc = ((entry1 as any).document || '').trim().toLowerCase();
  const entry2Doc = ((entry2 as any).document || '').trim().toLowerCase();
  const entry1Ref = (entry1.reference || '').trim().toLowerCase();
  const entry2Ref = (entry2.reference || '').trim().toLowerCase();

  const sameDocument = entry1Doc && entry2Doc && entry1Doc === entry2Doc;
  const sameReference = entry1Ref && entry2Ref && entry1Ref === entry2Ref;

  if (!sameDocument && !sameReference) return false;

  // Build a map of account -> net amount for entry1 (debit positive, credit negative)
  const entry1Balances: Record<string, number> = {};
  for (const line of entry1.lines) {
    const accountId = line.accountId || 'unknown';
    const debit = line.debitAmount || (line.isDebit ? line.amount : 0) || 0;
    const credit = line.creditAmount || (!line.isDebit ? line.amount : 0) || 0;
    entry1Balances[accountId] = (entry1Balances[accountId] || 0) + debit - credit;
  }

  // Build a map for entry2
  const entry2Balances: Record<string, number> = {};
  for (const line of entry2.lines) {
    const accountId = line.accountId || 'unknown';
    const debit = line.debitAmount || (line.isDebit ? line.amount : 0) || 0;
    const credit = line.creditAmount || (!line.isDebit ? line.amount : 0) || 0;
    entry2Balances[accountId] = (entry2Balances[accountId] || 0) + debit - credit;
  }

  // Check if they have the same accounts
  const accounts1 = Object.keys(entry1Balances);
  const accounts2 = Object.keys(entry2Balances);
  if (accounts1.length !== accounts2.length) return false;

  // Check if each account balance in entry2 is the opposite of entry1
  for (const accountId of accounts1) {
    if (!(accountId in entry2Balances)) return false;
    const balance1 = entry1Balances[accountId];
    const balance2 = entry2Balances[accountId];
    // They cancel if balance1 + balance2 ≈ 0
    if (Math.abs(balance1 + balance2) > 0.01) return false;
  }

  return true;
}

/**
 * Detect duplicate entries
 * Checks for duplicates by: date + amount + (document | reference)
 * Excludes entries that cancel each other out (reversals)
 */
export function detectDuplicates(entries: JournalEntry[]): ErrorPattern[] {
  const patterns: ErrorPattern[] = [];
  const checked = new Set<string>();

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (checked.has(entry.id)) continue;

    const entryTotal = entry.lines?.reduce((sum, line) => sum + (line.amount || 0), 0) || 0;
    const entryDoc = ((entry as any).document || '').trim().toLowerCase();
    const entryRef = (entry.reference || '').trim().toLowerCase();

    const duplicates: string[] = [entry.id];
    const matchReasons: string[] = [];

    for (let j = i + 1; j < entries.length; j++) {
      const other = entries[j];
      if (checked.has(other.id)) continue;

      const otherTotal = other.lines?.reduce((sum, line) => sum + (line.amount || 0), 0) || 0;
      const otherDoc = ((other as any).document || '').trim().toLowerCase();
      const otherRef = (other.reference || '').trim().toLowerCase();

      // Check date match
      const sameDate = other.date === entry.date;

      // Check amount match (within 1%)
      const amountDiff = Math.abs(entryTotal - otherTotal);
      const percentDiff = Math.abs(entryTotal) > 0 ? amountDiff / Math.abs(entryTotal) : 0;
      const sameAmount = percentDiff <= 0.01;

      // Check document match
      const sameDocument = entryDoc && otherDoc && entryDoc === otherDoc;

      // Check reference match
      const sameReference = entryRef && otherRef && entryRef === otherRef;

      // Duplicate if: (date + amount + document) OR (date + amount + reference) OR (document + reference)
      let isDuplicate = false;
      let reason = '';

      if (sameDate && sameAmount && sameDocument) {
        isDuplicate = true;
        reason = 'date + amount + document';
      } else if (sameDate && sameAmount && sameReference) {
        isDuplicate = true;
        reason = 'date + amount + reference';
      } else if (sameDocument && sameReference && sameAmount) {
        isDuplicate = true;
        reason = 'document + reference + amount';
      } else if (sameDate && sameDocument && sameReference) {
        isDuplicate = true;
        reason = 'date + document + reference';
      }

      // Check if entries cancel each other out (reversal) - not a duplicate
      if (isDuplicate && entriesCancelOut(entry, other)) {
        isDuplicate = false;
      }

      if (isDuplicate) {
        duplicates.push(other.id);
        checked.add(other.id);
        if (!matchReasons.includes(reason)) {
          matchReasons.push(reason);
        }
      }
    }

    if (duplicates.length > 1) {
      checked.add(entry.id);

      // Build description with match details
      const details: string[] = [];
      if (entry.date) details.push(`date: ${entry.date}`);
      if (entryTotal) details.push(`amount: $${Math.abs(entryTotal).toFixed(2)}`);
      if (entryDoc) details.push(`doc: "${(entry as any).document}"`);
      if (entryRef) details.push(`ref: "${entry.reference}"`);

      patterns.push({
        type: 'duplicate',
        severity: 'high',
        description: `Found ${duplicates.length} potential duplicate entries (${matchReasons.join(', ')}) - ${details.join(', ')}`,
        affectedEntries: duplicates,
        potentialImpact: Math.abs(entryTotal) * (duplicates.length - 1),
      });
    }
  }

  return patterns;
}

/**
 * Detect rounding errors
 */
export function detectRoundingErrors(entries: JournalEntry[]): ErrorPattern[] {
  const patterns: ErrorPattern[] = [];

  for (const entry of entries) {
    if (!entry.lines || entry.lines.length === 0) continue;

    const problematicLines = entry.lines.filter((line) => {
      const amount = Math.abs(line.amount);
      const decimalPart = amount - Math.floor(amount);
      const decimalStr = decimalPart.toFixed(6);

      return (
        decimalStr.includes('333333') ||
        decimalStr.includes('666666') ||
        decimalStr.includes('999999') ||
        Math.abs(decimalPart % 0.01) > 0.001
      );
    });

    if (problematicLines.length > 0) {
      const impact = problematicLines.reduce(
        (sum, line) => sum + Math.abs(line.amount % 0.01),
        0
      );

      patterns.push({
        type: 'rounding',
        severity: impact > 1 ? 'high' : 'medium',
        description: `Entry has ${problematicLines.length} lines with potential rounding errors`,
        affectedEntries: [entry.id],
        potentialImpact: impact,
      });
    }
  }

  return patterns;
}

/**
 * Detect missing counterparts
 */
export function detectMissingCounterparts(entries: JournalEntry[]): ErrorPattern[] {
  const patterns: ErrorPattern[] = [];

  for (const entry of entries) {
    if (!entry.lines || entry.lines.length === 0) continue;

    const debitAccounts = entry.lines.filter((line) => line.isDebit || (line.debitAmount && line.debitAmount > 0));
    const creditAccounts = entry.lines.filter((line) => !line.isDebit || (line.creditAmount && line.creditAmount > 0));

    if (debitAccounts.length === 0 || creditAccounts.length === 0) {
      const impact = Math.abs(
        entry.lines.reduce((sum, line) => sum + (line.amount || 0), 0)
      );

      patterns.push({
        type: 'missing_counterpart',
        severity: 'high',
        description:
          debitAccounts.length === 0
            ? 'Entry has only credit lines, missing debit counterpart'
            : 'Entry has only debit lines, missing credit counterpart',
        affectedEntries: [entry.id],
        potentialImpact: impact,
      });
    }
  }

  return patterns;
}

/**
 * Detect transposition errors
 */
export function detectTranspositions(
  discrepancy: number,
  entries: JournalEntry[]
): ErrorPattern[] {
  const patterns: ErrorPattern[] = [];

  // Transposition errors are always divisible by 9
  if (Math.abs(discrepancy) < 0.01 || Math.abs(discrepancy % 9) > 0.01) {
    return patterns;
  }

  // Find entries that might have transposed digits
  const absDiscrepancy = Math.abs(discrepancy);

  for (const entry of entries) {
    if (!entry.lines || entry.lines.length === 0) continue;

    for (const line of entry.lines) {
      const amount = Math.abs(line.amount);

      // Check if transposing digits could create the discrepancy
      const amountStr = amount.toFixed(2).replace('.', '');
      const digits = amountStr.split('');

      for (let i = 0; i < digits.length - 1; i++) {
        const transposed = [...digits];
        [transposed[i], transposed[i + 1]] = [transposed[i + 1], transposed[i]];
        const transposedAmount = parseFloat(
          transposed.join('').slice(0, -2) + '.' + transposed.slice(-2).join('')
        );

        const diff = Math.abs(amount - transposedAmount);
        if (Math.abs(diff - absDiscrepancy) < 0.01) {
          patterns.push({
            type: 'transposition',
            severity: 'high',
            description: `Possible digit transposition in amount ${amount} (could be ${transposedAmount})`,
            affectedEntries: [entry.id],
            potentialImpact: absDiscrepancy,
          });
          break;
        }
      }
    }
  }

  return patterns;
}

/**
 * Detect internal imbalances
 */
export function detectInternalImbalances(entries: JournalEntry[]): ErrorPattern[] {
  const patterns: ErrorPattern[] = [];

  for (const entry of entries) {
    if (!entry.lines || entry.lines.length === 0) continue;


    const uu = (num: any) => {
      return  Math.floor(formatFloat(num) * 100);
    }

    const totalDebits = entry.lines
      .reduce((sum, line) => sum + uu(line.debitAmount), 0);

    const totalCredits = entry.lines
      .reduce((sum, line) => sum + uu(line.creditAmount), 0);

    const imbalance = Math.abs(totalDebits  - totalCredits) / 100;


   

    if (imbalance > 0.01) {
      patterns.push({
        type: 'imbalance',
        severity: imbalance > 100 ? 'high' : 'medium',
        description: `Entry debits ($${(formatFloat(totalDebits)/100)?.toFixed(2)}) do not equal credits ($${(formatFloat(totalCredits)/100)?.toFixed(2)})`,
        affectedEntries: [entry.id],
        potentialImpact: imbalance,
      });
    }
  }

  return patterns;
}

/**
 * Generate actionable suggestions based on scores and patterns
 */
export function generateSuggestions(
  scoredEntries: ScoredEntry[],
  patterns: ErrorPattern[]
): AuditSuggestion[] {
  const suggestions: AuditSuggestion[] = [];

  // High-score entries
  const highScoreEntries = scoredEntries.filter((e) => e.totalScore >= 60);
  if (highScoreEntries.length > 0) {
    suggestions.push({
      priority: 'high',
      category: 'entry_review',
      message: `Review ${highScoreEntries.length} high-risk entries that closely match the discrepancy`,
      affectedEntries: highScoreEntries.map((e) => e.entry.id),
      action: 'Review and verify the amounts in these entries for accuracy',
    });
  }

  // Internal imbalances
  const imbalancePatterns = patterns.filter((p) => p.type === 'imbalance');
  if (imbalancePatterns.length > 0) {
    suggestions.push({
      priority: 'high',
      category: 'data_integrity',
      message: `Found ${imbalancePatterns.length} entries with internal imbalances`,
      affectedEntries: imbalancePatterns.flatMap((p) => p.affectedEntries),
      action: 'Correct these entries so debits equal credits',
    });
  }

  // Duplicates
  const duplicatePatterns = patterns.filter((p) => p.type === 'duplicate');
  if (duplicatePatterns.length > 0) {
    suggestions.push({
      priority: 'high',
      category: 'duplicate',
      message: `Found ${duplicatePatterns.length} sets of potential duplicate entries`,
      affectedEntries: duplicatePatterns.flatMap((p) => p.affectedEntries),
      action: 'Review these entries and void or delete duplicates',
    });
  }

  // Transpositions
  const transpositionPatterns = patterns.filter((p) => p.type === 'transposition');
  if (transpositionPatterns.length > 0) {
    suggestions.push({
      priority: 'high',
      category: 'data_entry',
      message: `Detected ${transpositionPatterns.length} possible digit transposition errors`,
      affectedEntries: transpositionPatterns.flatMap((p) => p.affectedEntries),
      action: 'Check if any digits were swapped in these amounts',
    });
  }

  // Rounding errors
  const roundingPatterns = patterns.filter((p) => p.type === 'rounding');
  if (roundingPatterns.length > 0) {
    suggestions.push({
      priority: 'medium',
      category: 'calculation',
      message: `Found ${roundingPatterns.length} entries with potential rounding errors`,
      affectedEntries: roundingPatterns.flatMap((p) => p.affectedEntries),
      action: 'Review calculations and consider adjusting decimal precision',
    });
  }

  // Missing counterparts
  const missingCounterpartPatterns = patterns.filter(
    (p) => p.type === 'missing_counterpart'
  );
  if (missingCounterpartPatterns.length > 0) {
    suggestions.push({
      priority: 'high',
      category: 'data_integrity',
      message: `Found ${missingCounterpartPatterns.length} entries missing debit or credit counterparts`,
      affectedEntries: missingCounterpartPatterns.flatMap((p) => p.affectedEntries),
      action: 'Add missing debit or credit lines to balance these entries',
    });
  }

  // Draft entries
  const draftEntries = scoredEntries.filter((e) => e.entry.status === 'draft');
  if (draftEntries.length > 0) {
    suggestions.push({
      priority: 'medium',
      category: 'workflow',
      message: `${draftEntries.length} draft entries included in trial balance`,
      affectedEntries: draftEntries.map((e) => e.entry.id),
      action: 'Review and post draft entries, or exclude them from the trial balance',
    });
  }

  return suggestions;
}
