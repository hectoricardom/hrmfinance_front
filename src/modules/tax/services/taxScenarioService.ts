import { TaxFormData, TaxCalculationResult, FilingStatus } from '../types/taxTypes';
import {
  TaxScenario,
  CreateScenarioInput,
  ScenarioComparison,
  ScenarioDifference,
  ComparisonRecommendation,
  MultiScenarioAnalysis,
  AnalysisSummary,
  OptimizationSuggestion,
  OptimizationType,
  WhatIfParams,
  WhatIfResult,
  WhatIfImpact,
  TaxPlanningGoal,
  TaxPlanningResult,
  ImplementationStep,
  QuarterlyEstimate,
  AnnualTaxProjection,
  TaxSkillSession,
  TaxSkillConfig,
  DifferenceCategory
} from '../types/taxScenarioTypes';
import { taxCalculationService } from './taxCalculationService';
import { devLog } from '../../../services/utils';

/**
 * Default configuration for the tax skill
 */
const DEFAULT_CONFIG: TaxSkillConfig = {
  defaultTaxYear: 2024,
  enableAutoSave: true,
  maxScenariosPerSession: 10,
  enableOptimizationSuggestions: true,
  enableQuarterlyEstimates: true,
  currencyFormat: 'USD',
  roundingPrecision: 2
};

/**
 * Tax Scenario Service
 * Handles multi-scenario tax comparison and optimization
 */
export class TaxScenarioService {
  private sessions: Map<string, TaxSkillSession> = new Map();
  private currentSessionId: string | null = null;

  /**
   * Generate a unique ID
   */
  private generateId(prefix: string = 'id'): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Start a new skill session
   */
  startSession(config?: Partial<TaxSkillConfig>): TaxSkillSession {
    const sessionId = this.generateId('session');
    const session: TaxSkillSession = {
      id: sessionId,
      scenarios: new Map(),
      analysisHistory: [],
      config: { ...DEFAULT_CONFIG, ...config },
      createdAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString()
    };

    this.sessions.set(sessionId, session);
    this.currentSessionId = sessionId;

    devLog('📊 Tax Skill Session Started:', sessionId);
    return session;
  }

  /**
   * Get current session or create one
   */
  getOrCreateSession(): TaxSkillSession {
    if (this.currentSessionId && this.sessions.has(this.currentSessionId)) {
      return this.sessions.get(this.currentSessionId)!;
    }
    return this.startSession();
  }

  /**
   * Create a new tax scenario
   */
  createScenario(input: CreateScenarioInput): TaxScenario {
    const session = this.getOrCreateSession();

    if (session.scenarios.size >= session.config.maxScenariosPerSession) {
      throw new Error(`Maximum scenarios (${session.config.maxScenariosPerSession}) reached for this session`);
    }

    const scenario: TaxScenario = {
      id: this.generateId('scenario'),
      name: input.name,
      description: input.description,
      formData: input.formData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Calculate tax result
    scenario.result = taxCalculationService.calculateTaxReturn(input.formData);

    session.scenarios.set(scenario.id, scenario);
    session.activeScenarioId = scenario.id;
    session.lastActivityAt = new Date().toISOString();

    devLog('📊 Tax Scenario Created:', scenario.name, scenario.id);
    return scenario;
  }

  /**
   * Get a scenario by ID
   */
  getScenario(scenarioId: string): TaxScenario | undefined {
    const session = this.getOrCreateSession();
    return session.scenarios.get(scenarioId);
  }

  /**
   * Get all scenarios in current session
   */
  getAllScenarios(): TaxScenario[] {
    const session = this.getOrCreateSession();
    return Array.from(session.scenarios.values());
  }

  /**
   * Update a scenario
   */
  updateScenario(scenarioId: string, updates: Partial<CreateScenarioInput>): TaxScenario {
    const session = this.getOrCreateSession();
    const scenario = session.scenarios.get(scenarioId);

    if (!scenario) {
      throw new Error(`Scenario not found: ${scenarioId}`);
    }

    if (updates.name) scenario.name = updates.name;
    if (updates.description !== undefined) scenario.description = updates.description;
    if (updates.formData) {
      scenario.formData = updates.formData;
      scenario.result = taxCalculationService.calculateTaxReturn(updates.formData);
    }

    scenario.updatedAt = new Date().toISOString();
    session.lastActivityAt = new Date().toISOString();

    devLog('📊 Tax Scenario Updated:', scenario.name);
    return scenario;
  }

  /**
   * Delete a scenario
   */
  deleteScenario(scenarioId: string): boolean {
    const session = this.getOrCreateSession();
    const deleted = session.scenarios.delete(scenarioId);

    if (deleted && session.activeScenarioId === scenarioId) {
      session.activeScenarioId = undefined;
    }

    session.lastActivityAt = new Date().toISOString();
    return deleted;
  }

  /**
   * Compare two scenarios
   */
  compareScenarios(scenarioIdA: string, scenarioIdB: string): ScenarioComparison {
    const session = this.getOrCreateSession();
    const scenarioA = session.scenarios.get(scenarioIdA);
    const scenarioB = session.scenarios.get(scenarioIdB);

    if (!scenarioA || !scenarioB) {
      throw new Error('One or both scenarios not found');
    }

    if (!scenarioA.result || !scenarioB.result) {
      throw new Error('Scenarios must have calculated results');
    }

    const differences = this.calculateDifferences(scenarioA.result, scenarioB.result);
    const recommendation = this.generateRecommendation(scenarioA, scenarioB, differences);

    return {
      scenarioA,
      scenarioB,
      differences,
      recommendation
    };
  }

  /**
   * Calculate differences between two results
   */
  private calculateDifferences(
    resultA: TaxCalculationResult,
    resultB: TaxCalculationResult
  ): ScenarioDifference[] {
    const differences: ScenarioDifference[] = [];

    const compareFields: {
      field: keyof TaxCalculationResult;
      label: string;
      category: DifferenceCategory;
      higherIsBetter?: boolean;
    }[] = [
      // Income fields
      { field: 'totalW2Income', label: 'W-2 Income', category: 'income' },
      { field: 'total1099Income', label: '1099 Income', category: 'income' },
      { field: 'totalIncome', label: 'Total Income', category: 'income' },
      { field: 'adjustedGrossIncome', label: 'AGI', category: 'income' },

      // Deduction fields
      { field: 'deductionAmount', label: 'Deduction Used', category: 'deduction', higherIsBetter: true },
      { field: 'qbiDeduction', label: 'QBI Deduction', category: 'deduction', higherIsBetter: true },
      { field: 'selfEmploymentTaxDeduction', label: 'SE Tax Deduction', category: 'deduction', higherIsBetter: true },

      // Tax liability fields
      { field: 'taxableIncome', label: 'Taxable Income', category: 'tax_liability' },
      { field: 'federalTaxLiability', label: 'Federal Tax', category: 'tax_liability' },
      { field: 'selfEmploymentTax', label: 'Self-Employment Tax', category: 'tax_liability' },

      // Credit fields
      { field: 'childTaxCredit', label: 'Child Tax Credit', category: 'credit', higherIsBetter: true },
      { field: 'additionalChildTaxCredit', label: 'Additional CTC', category: 'credit', higherIsBetter: true },
      { field: 'earnedIncomeCredit', label: 'Earned Income Credit', category: 'credit', higherIsBetter: true },
      { field: 'americanOpportunityCredit', label: 'American Opportunity Credit', category: 'credit', higherIsBetter: true },
      { field: 'lifetimeLearningCredit', label: 'Lifetime Learning Credit', category: 'credit', higherIsBetter: true },
      { field: 'totalCredits', label: 'Total Credits', category: 'credit', higherIsBetter: true },

      // Withholding fields
      { field: 'totalWithheld', label: 'Total Withheld', category: 'withholding' },

      // Final result fields
      { field: 'taxDue', label: 'Tax Due', category: 'tax_liability' },
      { field: 'refundAmount', label: 'Refund Amount', category: 'refund', higherIsBetter: true },
      { field: 'effectiveTaxRate', label: 'Effective Tax Rate', category: 'tax_liability' }
    ];

    for (const { field, label, category, higherIsBetter } of compareFields) {
      const valueA = resultA[field];
      const valueB = resultB[field];

      if (typeof valueA === 'number' && typeof valueB === 'number') {
        const difference = valueB - valueA;
        const percentChange = valueA !== 0 ? (difference / Math.abs(valueA)) * 100 : (valueB !== 0 ? 100 : 0);

        let impact: 'positive' | 'negative' | 'neutral' = 'neutral';
        if (Math.abs(difference) > 0.01) {
          if (higherIsBetter) {
            impact = difference > 0 ? 'positive' : 'negative';
          } else if (category === 'tax_liability') {
            impact = difference < 0 ? 'positive' : 'negative';
          } else if (category === 'refund') {
            impact = difference > 0 ? 'positive' : 'negative';
          }
        }

        differences.push({
          field,
          label,
          valueA,
          valueB,
          difference,
          percentChange,
          impact,
          category
        });
      }
    }

    return differences;
  }

  /**
   * Generate recommendation based on comparison
   */
  private generateRecommendation(
    scenarioA: TaxScenario,
    scenarioB: TaxScenario,
    differences: ScenarioDifference[]
  ): ComparisonRecommendation {
    const resultA = scenarioA.result!;
    const resultB = scenarioB.result!;

    // Calculate net benefit (considering refund and tax due)
    const netA = resultA.refundAmount - resultA.taxDue;
    const netB = resultB.refundAmount - resultB.taxDue;

    const preferredScenario = netB > netA ? scenarioB.id : scenarioA.id;
    const preferredResult = netB > netA ? resultB : resultA;
    const otherResult = netB > netA ? resultA : resultB;

    const taxSavings = Math.max(0, otherResult.federalTaxLiability - preferredResult.federalTaxLiability);
    const additionalRefund = Math.max(0, preferredResult.refundAmount - otherResult.refundAmount);

    const keyFactors: string[] = [];
    const warnings: string[] = [];

    // Analyze key differences
    const significantDifferences = differences.filter(d => Math.abs(d.percentChange) > 5);

    for (const diff of significantDifferences) {
      if (diff.impact === 'positive') {
        keyFactors.push(`${diff.label}: ${diff.percentChange > 0 ? '+' : ''}${diff.percentChange.toFixed(1)}%`);
      } else if (diff.impact === 'negative') {
        warnings.push(`${diff.label}: ${diff.percentChange > 0 ? '+' : ''}${diff.percentChange.toFixed(1)}%`);
      }
    }

    // Generate reason
    let reason = '';
    if (taxSavings > 0 && additionalRefund > 0) {
      reason = `Lower tax liability ($${taxSavings.toFixed(2)} savings) and higher refund ($${additionalRefund.toFixed(2)} more)`;
    } else if (taxSavings > 0) {
      reason = `Lower tax liability with $${taxSavings.toFixed(2)} in savings`;
    } else if (additionalRefund > 0) {
      reason = `Higher refund amount of $${additionalRefund.toFixed(2)}`;
    } else {
      reason = 'Similar outcomes - consider other factors';
    }

    return {
      preferredScenario,
      reason,
      taxSavings,
      additionalRefund,
      keyFactors: keyFactors.slice(0, 5),
      warnings: warnings.slice(0, 3)
    };
  }

  /**
   * Analyze multiple scenarios
   */
  analyzeMultipleScenarios(scenarioIds?: string[]): MultiScenarioAnalysis {
    const session = this.getOrCreateSession();

    let scenarios: TaxScenario[];
    if (scenarioIds && scenarioIds.length > 0) {
      scenarios = scenarioIds
        .map(id => session.scenarios.get(id))
        .filter((s): s is TaxScenario => s !== undefined && s.result !== undefined);
    } else {
      scenarios = Array.from(session.scenarios.values())
        .filter(s => s.result !== undefined);
    }

    if (scenarios.length < 2) {
      throw new Error('Need at least 2 scenarios with results for analysis');
    }

    // Generate pairwise comparisons
    const comparisons: ScenarioComparison[] = [];
    for (let i = 0; i < scenarios.length - 1; i++) {
      for (let j = i + 1; j < scenarios.length; j++) {
        comparisons.push(this.compareScenarios(scenarios[i].id, scenarios[j].id));
      }
    }

    // Find best and worst scenarios
    const sortedByNet = scenarios.sort((a, b) => {
      const netA = a.result!.refundAmount - a.result!.taxDue;
      const netB = b.result!.refundAmount - b.result!.taxDue;
      return netB - netA;
    });

    const bestScenario = sortedByNet[0];
    const worstScenario = sortedByNet[sortedByNet.length - 1];

    // Calculate summary statistics
    const taxLiabilities = scenarios.map(s => s.result!.federalTaxLiability + s.result!.selfEmploymentTax);
    const refunds = scenarios.map(s => s.result!.refundAmount);

    const summary: AnalysisSummary = {
      totalScenarios: scenarios.length,
      lowestTaxLiability: Math.min(...taxLiabilities),
      highestTaxLiability: Math.max(...taxLiabilities),
      lowestRefund: Math.min(...refunds),
      highestRefund: Math.max(...refunds),
      taxLiabilityRange: Math.max(...taxLiabilities) - Math.min(...taxLiabilities),
      refundRange: Math.max(...refunds) - Math.min(...refunds),
      averageTaxLiability: taxLiabilities.reduce((a, b) => a + b, 0) / taxLiabilities.length,
      averageRefund: refunds.reduce((a, b) => a + b, 0) / refunds.length,
      recommendations: this.generateSummaryRecommendations(scenarios, bestScenario, worstScenario)
    };

    const analysis: MultiScenarioAnalysis = {
      scenarios,
      comparisons,
      bestScenario,
      worstScenario,
      summary
    };

    // Store in history
    session.analysisHistory.push(analysis);
    session.lastActivityAt = new Date().toISOString();

    return analysis;
  }

  /**
   * Generate summary recommendations
   */
  private generateSummaryRecommendations(
    scenarios: TaxScenario[],
    bestScenario: TaxScenario,
    worstScenario: TaxScenario
  ): string[] {
    const recommendations: string[] = [];

    // Compare best vs worst
    const bestNet = bestScenario.result!.refundAmount - bestScenario.result!.taxDue;
    const worstNet = worstScenario.result!.refundAmount - worstScenario.result!.taxDue;
    const potentialSavings = bestNet - worstNet;

    if (potentialSavings > 0) {
      recommendations.push(
        `"${bestScenario.name}" offers up to $${potentialSavings.toFixed(2)} better outcome than "${worstScenario.name}"`
      );
    }

    // Check for deduction optimization
    const hasItemized = scenarios.some(s => s.result!.deductionUsed === 'itemized');
    const hasStandard = scenarios.some(s => s.result!.deductionUsed === 'standard');

    if (hasItemized && hasStandard) {
      const itemizedScenario = scenarios.find(s => s.result!.deductionUsed === 'itemized');
      const standardScenario = scenarios.find(s => s.result!.deductionUsed === 'standard');
      if (itemizedScenario && standardScenario) {
        const itemizedDeduction = itemizedScenario.result!.totalItemizedDeductions;
        const standardDeduction = standardScenario.result!.standardDeduction;
        if (itemizedDeduction > standardDeduction) {
          recommendations.push('Itemizing deductions provides better benefit in some scenarios');
        }
      }
    }

    // Check credits utilization
    const maxCredits = Math.max(...scenarios.map(s => s.result!.totalCredits));
    if (maxCredits > 0) {
      const bestCreditScenario = scenarios.find(s => s.result!.totalCredits === maxCredits);
      if (bestCreditScenario) {
        recommendations.push(
          `"${bestCreditScenario.name}" maximizes tax credits at $${maxCredits.toFixed(2)}`
        );
      }
    }

    return recommendations;
  }

  /**
   * Generate optimization suggestions for a scenario
   */
  generateOptimizationSuggestions(scenarioId: string): OptimizationSuggestion[] {
    const scenario = this.getScenario(scenarioId);
    if (!scenario || !scenario.result) {
      throw new Error('Scenario not found or has no results');
    }

    const suggestions: OptimizationSuggestion[] = [];
    const result = scenario.result;
    const formData = scenario.formData;

    // Check deduction optimization
    if (result.deductionUsed === 'standard' && result.totalItemizedDeductions > result.standardDeduction * 0.7) {
      const potentialSavings = (result.totalItemizedDeductions - result.standardDeduction) * 0.22; // Assume 22% bracket
      suggestions.push({
        type: 'deduction_switch',
        title: 'Consider Itemizing Deductions',
        description: `Your itemized deductions ($${result.totalItemizedDeductions.toFixed(2)}) are close to the standard deduction. With additional deductions, itemizing may be beneficial.`,
        potentialSavings: Math.max(0, potentialSavings),
        confidence: 'medium',
        action: 'Track additional deductible expenses like charitable donations, medical expenses, or state taxes',
        requirements: ['Must exceed standard deduction threshold', 'Keep receipts and documentation']
      });
    }

    // Check retirement contribution opportunity
    if (result.total1099SelfEmploymentIncome > 0) {
      const maxSepContribution = Math.min(result.netSelfEmploymentIncome * 0.25, 69000); // 2024 SEP limit
      const potentialSavings = maxSepContribution * 0.22; // Tax savings at 22% bracket
      suggestions.push({
        type: 'retirement_contribution',
        title: 'Maximize SEP-IRA Contribution',
        description: `As a self-employed individual, you can contribute up to $${maxSepContribution.toFixed(2)} to a SEP-IRA.`,
        potentialSavings,
        confidence: 'high',
        action: 'Open a SEP-IRA and contribute before tax deadline',
        requirements: ['Self-employment income', 'No employees (or must cover them too)']
      });
    }

    // Check EIC eligibility
    if (result.earnedIncomeCredit === 0 && result.adjustedGrossIncome < 60000 && formData.customerInfo.dependents > 0) {
      const potentialEIC = formData.customerInfo.dependents >= 3 ? 7830 : (formData.customerInfo.dependents === 2 ? 6960 : 4213);
      suggestions.push({
        type: 'earned_income_credit',
        title: 'Check EIC Eligibility',
        description: `You may qualify for the Earned Income Credit worth up to $${potentialEIC}. Review eligibility requirements.`,
        potentialSavings: potentialEIC,
        confidence: 'medium',
        action: 'Review EIC income limits and qualifying child requirements',
        requirements: ['Must have earned income', 'AGI below threshold', 'Valid SSN for all claimed individuals']
      });
    }

    // Check business expense tracking
    if (result.total1099SelfEmploymentIncome > 0 && result.totalBusinessExpenses < result.total1099SelfEmploymentIncome * 0.2) {
      const additionalExpenseEstimate = result.total1099SelfEmploymentIncome * 0.15;
      const potentialSavings = additionalExpenseEstimate * (SELF_EMPLOYMENT_TAX_RATE + 0.22);
      suggestions.push({
        type: 'business_expense',
        title: 'Track More Business Expenses',
        description: 'Your business expenses are low relative to income. Consider tracking more deductible expenses.',
        potentialSavings,
        confidence: 'medium',
        action: 'Track home office, internet, phone, supplies, mileage, and professional development',
        requirements: ['Expenses must be ordinary and necessary for business', 'Keep detailed records']
      });
    }

    // Check withholding optimization
    if (result.withholdingStatus === 'overwithholding' && result.refundAmount > 1000) {
      suggestions.push({
        type: 'withholding_adjustment',
        title: 'Adjust W-4 Withholding',
        description: `You're overwithholding by $${result.refundAmount.toFixed(2)} annually. Adjust your W-4 to increase take-home pay.`,
        potentialSavings: 0, // Not savings, but cash flow improvement
        confidence: 'high',
        action: `Update W-4 to claim ${result.recommendedWithholding.recommendedW4Allowances} allowances`,
        requirements: ['Update with employer', 'Review quarterly to ensure accuracy']
      });
    }

    // Check education credit opportunity
    if (result.americanOpportunityCredit === 0 && result.lifetimeLearningCredit === 0) {
      const hasEducationPotential = result.adjustedGrossIncome < 180000 &&
        (formData.customerInfo.filingStatus === 'married_joint' || result.adjustedGrossIncome < 90000);

      if (hasEducationPotential) {
        suggestions.push({
          type: 'education_credit',
          title: 'Consider Education Credits',
          description: 'You may be eligible for education tax credits (AOC up to $2,500 or LLC up to $2,000 per return).',
          potentialSavings: 2500,
          confidence: 'low',
          action: 'If pursuing education, keep Form 1098-T and track qualified expenses',
          requirements: ['Enrolled in eligible educational institution', 'Paying qualified education expenses']
        });
      }
    }

    return suggestions.sort((a, b) => b.potentialSavings - a.potentialSavings);
  }

  /**
   * Perform what-if analysis
   */
  performWhatIfAnalysis(params: WhatIfParams): WhatIfResult {
    const originalScenario = this.getScenario(params.baseScenarioId);
    if (!originalScenario || !originalScenario.result) {
      throw new Error('Base scenario not found or has no results');
    }

    // Deep clone the form data
    const modifiedFormData: TaxFormData = JSON.parse(JSON.stringify(originalScenario.formData));

    // Apply modifications
    for (const mod of params.modifications) {
      this.applyModification(modifiedFormData, mod);
    }

    // Create modified scenario (don't save to session)
    const modifiedScenario: TaxScenario = {
      id: this.generateId('whatif'),
      name: `What-If: ${originalScenario.name}`,
      description: `Modified version of "${originalScenario.name}"`,
      formData: modifiedFormData,
      result: taxCalculationService.calculateTaxReturn(modifiedFormData),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Calculate impact
    const impact = this.calculateWhatIfImpact(originalScenario.result!, modifiedScenario.result!);

    return {
      originalScenario,
      modifiedScenario,
      modifications: params.modifications,
      impact
    };
  }

  /**
   * Apply a modification to form data
   */
  private applyModification(formData: TaxFormData, mod: WhatIfModification): void {
    const path = mod.field.split('.');
    let target: any = formData;

    for (let i = 0; i < path.length - 1; i++) {
      if (target[path[i]] === undefined) {
        target[path[i]] = {};
      }
      target = target[path[i]];
    }

    const finalKey = path[path.length - 1];
    const currentValue = target[finalKey];

    switch (mod.type) {
      case 'set':
        target[finalKey] = mod.value;
        break;
      case 'add':
        if (typeof currentValue === 'number' && typeof mod.value === 'number') {
          target[finalKey] = currentValue + mod.value;
        }
        break;
      case 'subtract':
        if (typeof currentValue === 'number' && typeof mod.value === 'number') {
          target[finalKey] = currentValue - mod.value;
        }
        break;
      case 'multiply':
        if (typeof currentValue === 'number' && typeof mod.value === 'number') {
          target[finalKey] = currentValue * mod.value;
        }
        break;
      case 'remove':
        if (Array.isArray(target[finalKey])) {
          const index = parseInt(mod.value as string, 10);
          if (!isNaN(index) && index >= 0 && index < target[finalKey].length) {
            target[finalKey].splice(index, 1);
          }
        }
        break;
    }
  }

  /**
   * Calculate what-if impact
   */
  private calculateWhatIfImpact(
    originalResult: TaxCalculationResult,
    modifiedResult: TaxCalculationResult
  ): WhatIfImpact {
    const taxLiabilityChange =
      (modifiedResult.federalTaxLiability + modifiedResult.selfEmploymentTax) -
      (originalResult.federalTaxLiability + originalResult.selfEmploymentTax);

    const refundChange = modifiedResult.refundAmount - originalResult.refundAmount;
    const effectiveTaxRateChange = modifiedResult.effectiveTaxRate - originalResult.effectiveTaxRate;

    const breakdown: WhatIfImpact['breakdown'] = [
      {
        field: 'totalIncome',
        originalValue: originalResult.totalIncome,
        newValue: modifiedResult.totalIncome,
        change: modifiedResult.totalIncome - originalResult.totalIncome
      },
      {
        field: 'adjustedGrossIncome',
        originalValue: originalResult.adjustedGrossIncome,
        newValue: modifiedResult.adjustedGrossIncome,
        change: modifiedResult.adjustedGrossIncome - originalResult.adjustedGrossIncome
      },
      {
        field: 'taxableIncome',
        originalValue: originalResult.taxableIncome,
        newValue: modifiedResult.taxableIncome,
        change: modifiedResult.taxableIncome - originalResult.taxableIncome
      },
      {
        field: 'federalTaxLiability',
        originalValue: originalResult.federalTaxLiability,
        newValue: modifiedResult.federalTaxLiability,
        change: modifiedResult.federalTaxLiability - originalResult.federalTaxLiability
      },
      {
        field: 'totalCredits',
        originalValue: originalResult.totalCredits,
        newValue: modifiedResult.totalCredits,
        change: modifiedResult.totalCredits - originalResult.totalCredits
      },
      {
        field: 'refundAmount',
        originalValue: originalResult.refundAmount,
        newValue: modifiedResult.refundAmount,
        change: modifiedResult.refundAmount - originalResult.refundAmount
      }
    ];

    return {
      taxLiabilityChange,
      refundChange,
      effectiveTaxRateChange,
      breakdown
    };
  }

  /**
   * Calculate quarterly estimated taxes
   */
  calculateQuarterlyEstimates(scenarioId: string, taxYear: number = 2024): QuarterlyEstimate[] {
    const scenario = this.getScenario(scenarioId);
    if (!scenario || !scenario.result) {
      throw new Error('Scenario not found or has no results');
    }

    const result = scenario.result;
    const annualTax = result.federalTaxLiability + result.selfEmploymentTax;
    const withholding = result.totalWithheld;
    const estimatedTaxNeeded = Math.max(0, annualTax - withholding);

    // Quarterly payment is typically estimated tax / 4
    const quarterlyPayment = estimatedTaxNeeded / 4;

    const quarters: QuarterlyEstimate[] = [
      {
        quarter: 1,
        dueDate: `${taxYear}-04-15`,
        estimatedPayment: quarterlyPayment,
        cumulativeIncome: result.totalIncome * 0.25,
        cumulativeTax: annualTax * 0.25,
        status: 'pending'
      },
      {
        quarter: 2,
        dueDate: `${taxYear}-06-15`,
        estimatedPayment: quarterlyPayment,
        cumulativeIncome: result.totalIncome * 0.5,
        cumulativeTax: annualTax * 0.5,
        status: 'pending'
      },
      {
        quarter: 3,
        dueDate: `${taxYear}-09-15`,
        estimatedPayment: quarterlyPayment,
        cumulativeIncome: result.totalIncome * 0.75,
        cumulativeTax: annualTax * 0.75,
        status: 'pending'
      },
      {
        quarter: 4,
        dueDate: `${taxYear + 1}-01-15`,
        estimatedPayment: quarterlyPayment,
        cumulativeIncome: result.totalIncome,
        cumulativeTax: annualTax,
        status: 'pending'
      }
    ];

    return quarters;
  }

  /**
   * Generate annual tax projection
   */
  generateAnnualProjection(scenarioId: string): AnnualTaxProjection {
    const scenario = this.getScenario(scenarioId);
    if (!scenario || !scenario.result) {
      throw new Error('Scenario not found or has no results');
    }

    const result = scenario.result;
    const quarterlyEstimates = this.calculateQuarterlyEstimates(scenarioId, result.taxYear);

    const annualTax = result.federalTaxLiability + result.selfEmploymentTax;
    const adjustmentNeeded = annualTax - result.totalWithheld;

    return {
      taxYear: result.taxYear,
      projectedIncome: result.totalIncome,
      projectedTaxLiability: annualTax,
      projectedRefund: result.refundAmount,
      projectedWithholding: result.totalWithheld,
      quarterlyEstimates,
      adjustmentNeeded,
      confidenceLevel: 'medium',
      assumptions: [
        'Income remains consistent throughout the year',
        'No significant changes to deductions or credits',
        'Tax laws remain unchanged',
        'Withholding amounts stay constant'
      ]
    };
  }

  /**
   * Format currency for display
   */
  formatCurrency(amount: number): string {
    return taxCalculationService.formatCurrency(amount);
  }

  /**
   * Format percentage for display
   */
  formatPercentage(percentage: number): string {
    return taxCalculationService.formatPercentage(percentage);
  }

  /**
   * Get scenario comparison summary as formatted text
   */
  getComparisonSummary(comparison: ScenarioComparison): string {
    const lines: string[] = [];

    lines.push(`\n=== Tax Scenario Comparison ===`);
    lines.push(`Scenario A: ${comparison.scenarioA.name}`);
    lines.push(`Scenario B: ${comparison.scenarioB.name}`);
    lines.push('');

    lines.push('Key Differences:');
    const significantDiffs = comparison.differences.filter(d => Math.abs(d.percentChange) > 1);
    for (const diff of significantDiffs.slice(0, 10)) {
      const changeSign = diff.difference >= 0 ? '+' : '';
      lines.push(
        `  ${diff.label}: ${this.formatCurrency(diff.valueA as number)} → ${this.formatCurrency(diff.valueB as number)} (${changeSign}${diff.percentChange.toFixed(1)}%)`
      );
    }
    lines.push('');

    lines.push('Recommendation:');
    lines.push(`  Preferred: ${comparison.recommendation.preferredScenario === comparison.scenarioA.id ? comparison.scenarioA.name : comparison.scenarioB.name}`);
    lines.push(`  Reason: ${comparison.recommendation.reason}`);

    if (comparison.recommendation.taxSavings > 0) {
      lines.push(`  Tax Savings: ${this.formatCurrency(comparison.recommendation.taxSavings)}`);
    }
    if (comparison.recommendation.additionalRefund > 0) {
      lines.push(`  Additional Refund: ${this.formatCurrency(comparison.recommendation.additionalRefund)}`);
    }

    if (comparison.recommendation.keyFactors.length > 0) {
      lines.push('  Key Factors:');
      for (const factor of comparison.recommendation.keyFactors) {
        lines.push(`    • ${factor}`);
      }
    }

    if (comparison.recommendation.warnings.length > 0) {
      lines.push('  Warnings:');
      for (const warning of comparison.recommendation.warnings) {
        lines.push(`    ⚠️ ${warning}`);
      }
    }

    return lines.join('\n');
  }
}

// Self-employment tax rate constant (used in optimization suggestions)
const SELF_EMPLOYMENT_TAX_RATE = 0.153;

// Export singleton instance
export const taxScenarioService = new TaxScenarioService();
export default taxScenarioService;
