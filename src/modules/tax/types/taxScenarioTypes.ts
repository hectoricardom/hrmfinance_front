// Tax Scenario Comparison Types

import { TaxFormData, TaxCalculationResult, FilingStatus } from './taxTypes';

/**
 * A tax scenario represents a single tax return configuration
 * Used for comparing multiple scenarios to find the optimal tax strategy
 */
export interface TaxScenario {
  id: string;
  name: string;
  description?: string;
  formData: TaxFormData;
  result?: TaxCalculationResult;
  createdAt: string;
  updatedAt: string;
}

/**
 * Comparison between two scenarios
 */
export interface ScenarioComparison {
  scenarioA: TaxScenario;
  scenarioB: TaxScenario;
  differences: ScenarioDifference[];
  recommendation: ComparisonRecommendation;
}

/**
 * A single difference between two scenarios
 */
export interface ScenarioDifference {
  field: string;
  label: string;
  valueA: number | string;
  valueB: number | string;
  difference: number;
  percentChange: number;
  impact: 'positive' | 'negative' | 'neutral';
  category: DifferenceCategory;
}

export type DifferenceCategory =
  | 'income'
  | 'deduction'
  | 'credit'
  | 'tax_liability'
  | 'refund'
  | 'withholding';

/**
 * Recommendation based on scenario comparison
 */
export interface ComparisonRecommendation {
  preferredScenario: string; // ID of recommended scenario
  reason: string;
  taxSavings: number;
  additionalRefund: number;
  keyFactors: string[];
  warnings: string[];
}

/**
 * Input for creating a new tax scenario
 */
export interface CreateScenarioInput {
  name: string;
  description?: string;
  formData: TaxFormData;
}

/**
 * Input for comparing multiple scenarios
 */
export interface CompareScenarioInput {
  scenarioIds: string[];
  baseScenarioId?: string; // Optional base for comparison
}

/**
 * Result of multi-scenario analysis
 */
export interface MultiScenarioAnalysis {
  scenarios: TaxScenario[];
  comparisons: ScenarioComparison[];
  bestScenario: TaxScenario;
  worstScenario: TaxScenario;
  summary: AnalysisSummary;
}

/**
 * Summary of multi-scenario analysis
 */
export interface AnalysisSummary {
  totalScenarios: number;
  lowestTaxLiability: number;
  highestTaxLiability: number;
  lowestRefund: number;
  highestRefund: number;
  taxLiabilityRange: number;
  refundRange: number;
  averageTaxLiability: number;
  averageRefund: number;
  recommendations: string[];
}

/**
 * Optimization suggestion for a scenario
 */
export interface OptimizationSuggestion {
  type: OptimizationType;
  title: string;
  description: string;
  potentialSavings: number;
  confidence: 'high' | 'medium' | 'low';
  action: string;
  requirements?: string[];
}

export type OptimizationType =
  | 'deduction_switch'      // Switch between standard/itemized
  | 'filing_status_change'  // Consider different filing status
  | 'income_timing'         // Defer/accelerate income
  | 'retirement_contribution' // Increase 401k/IRA contributions
  | 'business_expense'      // Track more business expenses
  | 'education_credit'      // Claim education credits
  | 'child_tax_credit'      // Maximize CTC
  | 'earned_income_credit'  // Qualify for EIC
  | 'estimated_tax'         // Adjust estimated payments
  | 'withholding_adjustment'; // Adjust W-4

/**
 * What-if analysis parameters
 */
export interface WhatIfParams {
  baseScenarioId: string;
  modifications: WhatIfModification[];
}

export interface WhatIfModification {
  type: WhatIfModificationType;
  field: string;
  value: number | string;
  description?: string;
}

export type WhatIfModificationType =
  | 'set'       // Set to specific value
  | 'add'       // Add to current value
  | 'subtract'  // Subtract from current value
  | 'multiply'  // Multiply current value
  | 'remove';   // Remove an item (for arrays)

/**
 * What-if analysis result
 */
export interface WhatIfResult {
  originalScenario: TaxScenario;
  modifiedScenario: TaxScenario;
  modifications: WhatIfModification[];
  impact: WhatIfImpact;
}

export interface WhatIfImpact {
  taxLiabilityChange: number;
  refundChange: number;
  effectiveTaxRateChange: number;
  breakdown: {
    field: string;
    originalValue: number;
    newValue: number;
    change: number;
  }[];
}

/**
 * Tax planning goal
 */
export interface TaxPlanningGoal {
  type: GoalType;
  targetAmount?: number;
  priority: 'high' | 'medium' | 'low';
  description: string;
}

export type GoalType =
  | 'minimize_tax'
  | 'maximize_refund'
  | 'reduce_withholding'
  | 'optimize_credits'
  | 'plan_quarterly_payments';

/**
 * Tax planning result
 */
export interface TaxPlanningResult {
  goals: TaxPlanningGoal[];
  currentScenario: TaxScenario;
  optimizedScenario: TaxScenario;
  suggestions: OptimizationSuggestion[];
  projectedSavings: number;
  implementationSteps: ImplementationStep[];
}

export interface ImplementationStep {
  order: number;
  action: string;
  deadline?: string;
  impact: string;
  completed: boolean;
}

/**
 * Quarterly estimated tax calculation
 */
export interface QuarterlyEstimate {
  quarter: 1 | 2 | 3 | 4;
  dueDate: string;
  estimatedPayment: number;
  cumulativeIncome: number;
  cumulativeTax: number;
  status: 'pending' | 'paid' | 'overdue';
}

/**
 * Annual tax projection
 */
export interface AnnualTaxProjection {
  taxYear: number;
  projectedIncome: number;
  projectedTaxLiability: number;
  projectedRefund: number;
  projectedWithholding: number;
  quarterlyEstimates: QuarterlyEstimate[];
  adjustmentNeeded: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  assumptions: string[];
}

/**
 * Historical tax comparison
 */
export interface HistoricalComparison {
  currentYear: TaxScenario;
  previousYear?: TaxScenario;
  yearOverYearChanges: YearOverYearChange[];
  trends: TaxTrend[];
}

export interface YearOverYearChange {
  field: string;
  label: string;
  previousValue: number;
  currentValue: number;
  change: number;
  percentChange: number;
}

export interface TaxTrend {
  metric: string;
  direction: 'increasing' | 'decreasing' | 'stable';
  description: string;
  recommendation?: string;
}

/**
 * Skill configuration options
 */
export interface TaxSkillConfig {
  defaultTaxYear: 2024 | 2025;
  enableAutoSave: boolean;
  maxScenariosPerSession: number;
  enableOptimizationSuggestions: boolean;
  enableQuarterlyEstimates: boolean;
  currencyFormat: 'USD';
  roundingPrecision: number;
}

/**
 * Skill session state
 */
export interface TaxSkillSession {
  id: string;
  scenarios: Map<string, TaxScenario>;
  activeScenarioId?: string;
  analysisHistory: MultiScenarioAnalysis[];
  config: TaxSkillConfig;
  createdAt: string;
  lastActivityAt: string;
}
