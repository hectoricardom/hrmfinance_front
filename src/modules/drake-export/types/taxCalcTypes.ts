/**
 * Tax Calculation Types for Intelligent Tax Calc Service
 * Types used by intelligentTaxCalcService, taxValidationService,
 * and related workspace components.
 */

export interface TaxCalculationResult {
  taxYear: number;
  filingStatus: string;
  // Income
  totalWages: number;
  totalInterest: number;
  totalDividends: number;
  selfEmploymentIncome: number;
  otherIncome: number;
  totalIncome: number;
  adjustedGrossIncome: number;
  // Deductions
  standardDeduction: number;
  itemizedDeductions: number;
  deductionUsed: 'standard' | 'itemized';
  deductionAmount: number;
  taxableIncome: number;
  // Tax
  federalTax: number;
  selfEmploymentTax: number;
  totalTax: number;
  // Credits
  credits: DetectedCredit[];
  totalCredits: number;
  // Withholding
  totalFederalWithholding: number;
  totalStateWithholding: number;
  // Result
  netTaxLiability: number;
  federalRefund: number;
  federalOwed: number;
  // Metadata
  calculatedAt: number;
  documentCount: number;
  verifiedDocumentCount: number;
}

export interface DetectedCredit {
  name: string;
  code: string; // e.g., 'CTC', 'EITC', 'AOC'
  estimatedAmount: number;
  confidence: number; // 0-1
  eligibility: 'eligible' | 'likely' | 'possible' | 'ineligible';
  basis: string; // Explanation
  requirements: string[];
}

export interface ValidationCheckItem {
  id: string;
  category: 'required' | 'recommended' | 'optional';
  label: string;
  description: string;
  status: 'pass' | 'warn' | 'error' | 'pending';
  detail?: string;
  fixAction?: string; // Navigation target or action
}

export interface ValidationResult {
  items: ValidationCheckItem[];
  passCount: number;
  warnCount: number;
  errorCount: number;
  readinessScore: number; // 0-100
  isReady: boolean;
}
