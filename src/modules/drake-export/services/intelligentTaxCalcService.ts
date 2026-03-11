/**
 * Intelligent Tax Calculation Service
 *
 * Auto-calculates a 1040 estimate from verified Drake documents.
 * Aggregates all verified documents' extractedAmounts and produces
 * a TaxCalculationResult with income, deductions, tax, credits,
 * withholding, and refund/owed amounts.
 */

import { devLog } from '../../../services/utils';
import type {
  TaxPortal,
  DrakeTaxDocument,
  FilingStatus,
  ExtractedTaxAmounts,
  TaxDependent,
} from '../types/drakeTypes';
import type { TaxCalculationResult, DetectedCredit } from '../types/taxCalcTypes';

// ---------------------------------------------------------------------------
// 2024 Tax Constants
// ---------------------------------------------------------------------------

const TAX_BRACKETS_2024: Record<string, { min: number; max: number; rate: number }[]> = {
  single: [
    { min: 0, max: 11600, rate: 0.10 },
    { min: 11600, max: 47150, rate: 0.12 },
    { min: 47150, max: 100525, rate: 0.22 },
    { min: 100525, max: 191950, rate: 0.24 },
    { min: 191950, max: 243725, rate: 0.32 },
    { min: 243725, max: 609350, rate: 0.35 },
    { min: 609350, max: Infinity, rate: 0.37 },
  ],
  married_filing_jointly: [
    { min: 0, max: 23200, rate: 0.10 },
    { min: 23200, max: 94300, rate: 0.12 },
    { min: 94300, max: 201050, rate: 0.22 },
    { min: 201050, max: 383900, rate: 0.24 },
    { min: 383900, max: 487450, rate: 0.32 },
    { min: 487450, max: 731200, rate: 0.35 },
    { min: 731200, max: Infinity, rate: 0.37 },
  ],
  married_filing_separately: [
    { min: 0, max: 11600, rate: 0.10 },
    { min: 11600, max: 47150, rate: 0.12 },
    { min: 47150, max: 100525, rate: 0.22 },
    { min: 100525, max: 191950, rate: 0.24 },
    { min: 191950, max: 243725, rate: 0.32 },
    { min: 243725, max: 365600, rate: 0.35 },
    { min: 365600, max: Infinity, rate: 0.37 },
  ],
  head_of_household: [
    { min: 0, max: 16550, rate: 0.10 },
    { min: 16550, max: 63100, rate: 0.12 },
    { min: 63100, max: 100500, rate: 0.22 },
    { min: 100500, max: 191950, rate: 0.24 },
    { min: 191950, max: 243700, rate: 0.32 },
    { min: 243700, max: 609350, rate: 0.35 },
    { min: 609350, max: Infinity, rate: 0.37 },
  ],
  qualifying_widow: [
    { min: 0, max: 23200, rate: 0.10 },
    { min: 23200, max: 94300, rate: 0.12 },
    { min: 94300, max: 201050, rate: 0.22 },
    { min: 201050, max: 383900, rate: 0.24 },
    { min: 383900, max: 487450, rate: 0.32 },
    { min: 487450, max: 731200, rate: 0.35 },
    { min: 731200, max: Infinity, rate: 0.37 },
  ],
};

const STANDARD_DEDUCTIONS_2024: Record<string, number> = {
  single: 14600,
  married_filing_jointly: 29200,
  married_filing_separately: 14600,
  head_of_household: 21900,
  qualifying_widow: 29200,
};

const CTC_AMOUNT = 2000;
const CTC_PHASE_OUT_THRESHOLD: Record<string, number> = {
  single: 200000,
  married_filing_jointly: 400000,
  married_filing_separately: 200000,
  head_of_household: 200000,
  qualifying_widow: 400000,
};

const SALT_CAP = 10000;

const SE_TAX_RATE = 0.153;
const SE_INCOME_MULTIPLIER = 0.9235;
const SE_DEDUCTION_RATE = 0.5;

// EITC 2024 table (single/HoH thresholds -- MFJ uses higher phase-out start)
const EITC_2024: Record<number, {
  maxCredit: number;
  phaseInEnd: number;
  phaseOutStartSingle: number;
  phaseOutStartMFJ: number;
  maxIncomeSingle: number;
  maxIncomeMFJ: number;
  phaseInRate: number;
  phaseOutRate: number;
}> = {
  0: { maxCredit: 632, phaseInEnd: 8260, phaseOutStartSingle: 10330, phaseOutStartMFJ: 17140, maxIncomeSingle: 18591, maxIncomeMFJ: 25511, phaseInRate: 0.0765, phaseOutRate: 0.0765 },
  1: { maxCredit: 4213, phaseInEnd: 12080, phaseOutStartSingle: 23350, phaseOutStartMFJ: 30260, maxIncomeSingle: 49084, maxIncomeMFJ: 56004, phaseInRate: 0.34, phaseOutRate: 0.1598 },
  2: { maxCredit: 6960, phaseInEnd: 13870, phaseOutStartSingle: 26260, phaseOutStartMFJ: 33170, maxIncomeSingle: 55768, maxIncomeMFJ: 62688, phaseInRate: 0.40, phaseOutRate: 0.2106 },
  3: { maxCredit: 7830, phaseInEnd: 13870, phaseOutStartSingle: 26260, phaseOutStartMFJ: 33170, maxIncomeSingle: 59899, maxIncomeMFJ: 66819, phaseInRate: 0.45, phaseOutRate: 0.2106 },
};

// AOC constants
const AOC_MAX_PER_STUDENT = 2500;
const AOC_PHASE_OUT_START: Record<string, number> = { single: 80000, married_filing_jointly: 160000, married_filing_separately: 0, head_of_household: 80000, qualifying_widow: 160000 };
const AOC_PHASE_OUT_END: Record<string, number> = { single: 90000, married_filing_jointly: 180000, married_filing_separately: 0, head_of_household: 90000, qualifying_widow: 180000 };

// Retirement savings credit AGI limits (2024)
const SAVER_CREDIT_LIMITS: Record<string, number[]> = {
  single: [23000, 25000, 38250],
  head_of_household: [34500, 37500, 57375],
  married_filing_jointly: [46000, 50000, 76500],
  married_filing_separately: [23000, 25000, 38250],
  qualifying_widow: [46000, 50000, 76500],
};

// ---------------------------------------------------------------------------
// Helper: get qualifying children under 17 for CTC
// ---------------------------------------------------------------------------

function getQualifyingChildrenForCTC(dependents: TaxDependent[], taxYear: number): TaxDependent[] {
  const endOfYear = new Date(taxYear, 11, 31);
  const qualifyingRelationships = ['son', 'daughter', 'stepson', 'stepdaughter', 'foster_child', 'grandchild'];

  return (dependents || []).filter((dep) => {
    if (dep.excludeFromCalculation) return false;
    if (!qualifyingRelationships.includes(dep.relationship)) return false;
    if (!dep.dateOfBirth) return true; // assume qualifying if no DOB
    const dob = new Date(dep.dateOfBirth);
    const age = endOfYear.getFullYear() - dob.getFullYear() -
      (endOfYear < new Date(endOfYear.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
    return age < 17;
  });
}

// ---------------------------------------------------------------------------
// Helper: bracket-based federal tax
// ---------------------------------------------------------------------------

function calculateFederalTaxFromBrackets(taxableIncome: number, filingStatus: string): number {
  const brackets = TAX_BRACKETS_2024[filingStatus] || TAX_BRACKETS_2024['single'];
  let remaining = taxableIncome;
  let tax = 0;

  for (const bracket of brackets) {
    if (remaining <= 0) break;
    const bracketSize = bracket.max - bracket.min;
    const taxableInBracket = Math.min(remaining, bracketSize);
    tax += taxableInBracket * bracket.rate;
    remaining -= taxableInBracket;
  }

  return Math.round(tax);
}

// ---------------------------------------------------------------------------
// Service Class
// ---------------------------------------------------------------------------

export class IntelligentTaxCalcService {
  /**
   * Calculate a full 1040 estimate from client data and verified documents.
   */
  calculate(client: TaxPortal, documents: DrakeTaxDocument[]): TaxCalculationResult {
    const filingStatus: FilingStatus = client.filingStatus || 'single';
    const taxYear = client.taxYear || 2024;
    const verifiedDocs = documents.filter((d) => d.verified && d.extractedAmounts);
    const allDocs = documents.filter((d) => d.extractedAmounts);

    devLog('[IntelligentTaxCalc] Starting calculation for', client.firstName, client.lastName);
    devLog('[IntelligentTaxCalc] Filing status:', filingStatus, '| Tax year:', taxYear);
    devLog('[IntelligentTaxCalc] Total docs:', documents.length, '| Verified:', verifiedDocs.length);

    // -----------------------------------------------------------------------
    // 1. Aggregate income from verified documents
    // -----------------------------------------------------------------------
    const incomes = this.aggregateIncome(verifiedDocs);

    devLog('[IntelligentTaxCalc] Wages:', incomes.totalWages);
    devLog('[IntelligentTaxCalc] Interest:', incomes.totalInterest);
    devLog('[IntelligentTaxCalc] Dividends:', incomes.totalDividends);
    devLog('[IntelligentTaxCalc] SE Income:', incomes.selfEmploymentIncome);
    devLog('[IntelligentTaxCalc] Other Income:', incomes.otherIncome);

    // -----------------------------------------------------------------------
    // 2. Self-employment tax
    // -----------------------------------------------------------------------
    let selfEmploymentTax = 0;
    let seDeduction = 0;
    if (incomes.selfEmploymentIncome > 0) {
      const taxableSE = incomes.selfEmploymentIncome * SE_INCOME_MULTIPLIER;
      selfEmploymentTax = Math.round(taxableSE * SE_TAX_RATE);
      seDeduction = Math.round(selfEmploymentTax * SE_DEDUCTION_RATE);
    }

    // -----------------------------------------------------------------------
    // 3. Total income and AGI
    // -----------------------------------------------------------------------
    const totalIncome = incomes.totalWages + incomes.totalInterest + incomes.totalDividends
      + incomes.selfEmploymentIncome + incomes.otherIncome;
    const adjustedGrossIncome = totalIncome - seDeduction;

    devLog('[IntelligentTaxCalc] Total income:', totalIncome);
    devLog('[IntelligentTaxCalc] AGI:', adjustedGrossIncome);

    // -----------------------------------------------------------------------
    // 4. Deductions (standard vs itemized)
    // -----------------------------------------------------------------------
    const standardDeduction = STANDARD_DEDUCTIONS_2024[filingStatus] || 14600;
    const itemizedDeductions = this.calculateItemizedDeductions(verifiedDocs, incomes);

    const deductionUsed: 'standard' | 'itemized' = itemizedDeductions > standardDeduction ? 'itemized' : 'standard';
    const deductionAmount = Math.max(standardDeduction, itemizedDeductions);

    // -----------------------------------------------------------------------
    // 5. Taxable income and federal tax
    // -----------------------------------------------------------------------
    const taxableIncome = Math.max(0, adjustedGrossIncome - deductionAmount);
    const federalTax = calculateFederalTaxFromBrackets(taxableIncome, filingStatus);

    devLog('[IntelligentTaxCalc] Taxable income:', taxableIncome);
    devLog('[IntelligentTaxCalc] Federal tax:', federalTax);

    // -----------------------------------------------------------------------
    // 6. Credits detection
    // -----------------------------------------------------------------------
    const credits = this.detectCredits(client, verifiedDocs, adjustedGrossIncome, filingStatus, taxYear, incomes);
    const totalCredits = credits.reduce((sum, c) => sum + c.estimatedAmount, 0);

    // Separate non-refundable and refundable
    const nonRefundableCredits = credits
      .filter((c) => !['ACTC', 'EITC'].includes(c.code) && c.code !== 'AOC_REFUND')
      .reduce((sum, c) => sum + c.estimatedAmount, 0);
    const refundableCredits = credits
      .filter((c) => ['ACTC', 'EITC', 'AOC_REFUND'].includes(c.code))
      .reduce((sum, c) => sum + c.estimatedAmount, 0);

    // Non-refundable credits cannot exceed federal tax
    const appliedNonRefundable = Math.min(nonRefundableCredits, federalTax);
    const taxAfterNonRefundable = Math.max(0, federalTax - appliedNonRefundable);

    // -----------------------------------------------------------------------
    // 7. Total tax (Line 24 equivalent)
    // -----------------------------------------------------------------------
    const totalTax = taxAfterNonRefundable + selfEmploymentTax;

    // -----------------------------------------------------------------------
    // 8. Withholding
    // -----------------------------------------------------------------------
    const withholding = this.aggregateWithholding(verifiedDocs);

    // -----------------------------------------------------------------------
    // 9. Net tax liability, refund or owed
    // -----------------------------------------------------------------------
    const totalPaymentsAndRefundable = withholding.totalFederalWithholding + refundableCredits;
    const netResult = totalPaymentsAndRefundable - totalTax;
    const federalRefund = netResult > 0 ? Math.round(netResult) : 0;
    const federalOwed = netResult < 0 ? Math.round(Math.abs(netResult)) : 0;
    const netTaxLiability = totalTax;

    devLog('[IntelligentTaxCalc] Total tax:', totalTax);
    devLog('[IntelligentTaxCalc] Total withholding:', withholding.totalFederalWithholding);
    devLog('[IntelligentTaxCalc] Refundable credits:', refundableCredits);
    devLog('[IntelligentTaxCalc] Refund:', federalRefund, '| Owed:', federalOwed);

    return {
      taxYear,
      filingStatus,
      // Income
      totalWages: Math.round(incomes.totalWages),
      totalInterest: Math.round(incomes.totalInterest),
      totalDividends: Math.round(incomes.totalDividends),
      selfEmploymentIncome: Math.round(incomes.selfEmploymentIncome),
      otherIncome: Math.round(incomes.otherIncome),
      totalIncome: Math.round(totalIncome),
      adjustedGrossIncome: Math.round(adjustedGrossIncome),
      // Deductions
      standardDeduction,
      itemizedDeductions: Math.round(itemizedDeductions),
      deductionUsed,
      deductionAmount,
      taxableIncome: Math.round(taxableIncome),
      // Tax
      federalTax,
      selfEmploymentTax,
      totalTax,
      // Credits
      credits,
      totalCredits: Math.round(totalCredits),
      // Withholding
      totalFederalWithholding: Math.round(withholding.totalFederalWithholding),
      totalStateWithholding: Math.round(withholding.totalStateWithholding),
      // Result
      netTaxLiability,
      federalRefund,
      federalOwed,
      // Metadata
      calculatedAt: Date.now(),
      documentCount: documents.length,
      verifiedDocumentCount: verifiedDocs.length,
    };
  }

  // -------------------------------------------------------------------------
  // Income Aggregation
  // -------------------------------------------------------------------------

  private aggregateIncome(docs: DrakeTaxDocument[]): {
    totalWages: number;
    totalInterest: number;
    totalDividends: number;
    selfEmploymentIncome: number;
    otherIncome: number;
    mortgageInterest: number;
    propertyTaxes: number;
    tuitionPayments: number;
    scholarships: number;
    has1098T: boolean;
    has1095A: boolean;
    hasRetirementContributions: boolean;
    retirementContributionAmount: number;
    annualPremiumAmount: number;
    annualSlcspPremium: number;
    annualAdvancePtc: number;
  } {
    let totalWages = 0;
    let totalInterest = 0;
    let totalDividends = 0;
    let selfEmploymentIncome = 0;
    let otherIncome = 0;
    let mortgageInterest = 0;
    let propertyTaxes = 0;
    let tuitionPayments = 0;
    let scholarships = 0;
    let has1098T = false;
    let has1095A = false;
    let hasRetirementContributions = false;
    let retirementContributionAmount = 0;
    let annualPremiumAmount = 0;
    let annualSlcspPremium = 0;
    let annualAdvancePtc = 0;

    for (const doc of docs) {
      const amounts = doc.extractedAmounts;
      if (!amounts) continue;

      switch (doc.drakeFormType) {
        case 'w2':
          totalWages += amounts.wages || 0;
          // Check box 12 codes for retirement contributions (D, E, F, G, etc.)
          if (amounts.box12Codes && amounts.box12Codes.length > 0) {
            const retirementCodes = ['D', 'E', 'F', 'G', 'S', 'AA', 'BB', 'EE'];
            for (const entry of amounts.box12Codes) {
              if (retirementCodes.includes(entry.code.toUpperCase())) {
                hasRetirementContributions = true;
                retirementContributionAmount += entry.amount;
              }
            }
          }
          break;

        case '1099_int':
          totalInterest += amounts.interestIncome || 0;
          break;

        case '1099_div':
          totalDividends += amounts.ordinaryDividends || 0;
          break;

        case '1099_nec':
          selfEmploymentIncome += amounts.nonEmployeeCompensation || 0;
          break;

        case '1099_misc':
          selfEmploymentIncome += (amounts.rents || 0) + (amounts.royalties || 0) + (amounts.otherIncome || 0);
          break;

        case '1099_r':
          otherIncome += amounts.totalAmount || 0;
          break;

        case '1099_g':
          otherIncome += (amounts.unemploymentCompensation || 0) + (amounts.stateTaxRefund || 0);
          break;

        case 'schedule_k1':
          otherIncome += (amounts.ordinaryBusinessIncome || 0)
            + (amounts.rentalRealEstateIncome || 0)
            + (amounts.guaranteedPayments || 0)
            + (amounts.interestIncomeK1 || 0)
            + (amounts.dividendIncomeK1 || 0);
          break;

        case '1098':
          mortgageInterest += amounts.mortgageInterest || 0;
          propertyTaxes += amounts.propertyTaxes || 0;
          break;

        case '1098_t':
          has1098T = true;
          tuitionPayments += amounts.paymentsReceived || 0;
          scholarships += amounts.scholarshipsGrants || 0;
          break;

        case '1095_a':
          has1095A = true;
          annualPremiumAmount += amounts.annualPremiumAmount || 0;
          annualSlcspPremium += amounts.annualSlcspPremium || 0;
          annualAdvancePtc += amounts.annualAdvancePtc || 0;
          break;

        default:
          break;
      }
    }

    return {
      totalWages,
      totalInterest,
      totalDividends,
      selfEmploymentIncome,
      otherIncome,
      mortgageInterest,
      propertyTaxes,
      tuitionPayments,
      scholarships,
      has1098T,
      has1095A,
      hasRetirementContributions,
      retirementContributionAmount,
      annualPremiumAmount,
      annualSlcspPremium,
      annualAdvancePtc,
    };
  }

  // -------------------------------------------------------------------------
  // Itemized Deductions
  // -------------------------------------------------------------------------

  private calculateItemizedDeductions(
    docs: DrakeTaxDocument[],
    incomes: ReturnType<IntelligentTaxCalcService['aggregateIncome']>
  ): number {
    // Mortgage interest (no limit applied for simplicity on acquisition debt <= 750k)
    const mortgageInterest = incomes.mortgageInterest;

    // SALT deduction: property taxes + state/local tax withheld, capped at $10,000
    let stateTaxWithheld = 0;
    for (const doc of docs) {
      if (!doc.extractedAmounts) continue;
      stateTaxWithheld += doc.extractedAmounts.stateTaxWithheld || 0;
    }
    const saltDeduction = Math.min(SALT_CAP, incomes.propertyTaxes + stateTaxWithheld);

    const totalItemized = mortgageInterest + saltDeduction;

    devLog('[IntelligentTaxCalc] Itemized: mortgage', mortgageInterest, '| SALT', saltDeduction, '| total', totalItemized);

    return totalItemized;
  }

  // -------------------------------------------------------------------------
  // Withholding Aggregation
  // -------------------------------------------------------------------------

  private aggregateWithholding(docs: DrakeTaxDocument[]): {
    totalFederalWithholding: number;
    totalStateWithholding: number;
  } {
    let totalFederal = 0;
    let totalState = 0;

    for (const doc of docs) {
      const amounts = doc.extractedAmounts;
      if (!amounts) continue;

      switch (doc.drakeFormType) {
        case 'w2':
          totalFederal += amounts.federalTaxWithheld || 0;
          totalState += amounts.stateTaxWithheld || 0;
          break;
        case '1099_int':
        case '1099_div':
          totalFederal += amounts.federalTaxWithheld1099 || 0;
          break;
        case '1099_nec':
        case '1099_misc':
          totalFederal += amounts.federalTaxWithheld1099 || 0;
          break;
        case '1099_r':
          totalFederal += amounts.federalTaxWithheld1099 || 0;
          totalState += amounts.stateTaxWithheld || 0;
          break;
        case '1099_g':
          totalFederal += amounts.federalTaxWithheld1099G || 0;
          totalState += amounts.stateTaxWithheld1099G || 0;
          break;
        case '1099_k':
          totalFederal += amounts.federalTaxWithheld1099K || 0;
          totalState += amounts.stateTaxWithheld1099K || 0;
          break;
        default:
          break;
      }
    }

    return { totalFederalWithholding: totalFederal, totalStateWithholding: totalState };
  }

  // -------------------------------------------------------------------------
  // Credit Detection
  // -------------------------------------------------------------------------

  private detectCredits(
    client: TaxPortal,
    docs: DrakeTaxDocument[],
    agi: number,
    filingStatus: FilingStatus,
    taxYear: number,
    incomes: ReturnType<IntelligentTaxCalcService['aggregateIncome']>
  ): DetectedCredit[] {
    const credits: DetectedCredit[] = [];
    const dependents = client.dependents || [];
    const earnedIncome = incomes.totalWages + incomes.selfEmploymentIncome;

    // ----- Child Tax Credit (CTC) -----
    const qualifyingChildren = getQualifyingChildrenForCTC(dependents, taxYear);
    if (qualifyingChildren.length > 0) {
      const threshold = CTC_PHASE_OUT_THRESHOLD[filingStatus] || 200000;
      let phaseOutReduction = 0;
      if (agi > threshold) {
        phaseOutReduction = Math.floor((agi - threshold) / 1000) * 50;
      }
      const ctcPerChild = Math.max(0, CTC_AMOUNT - phaseOutReduction);
      const totalCTC = qualifyingChildren.length * ctcPerChild;

      if (totalCTC > 0) {
        credits.push({
          name: 'Child Tax Credit',
          code: 'CTC',
          estimatedAmount: totalCTC,
          confidence: 0.95,
          eligibility: 'eligible',
          basis: `${qualifyingChildren.length} qualifying child${qualifyingChildren.length > 1 ? 'ren' : ''} under 17. $${CTC_AMOUNT.toLocaleString()} per child.`,
          requirements: [
            'Child must be under 17 at end of tax year',
            'Child must be a U.S. citizen, national, or resident alien',
            'Child must have a valid SSN',
            'Child must have lived with taxpayer for more than half the year',
          ],
        });
      }

      // ----- Additional Child Tax Credit (ACTC) -----
      // Estimate: if CTC exceeds federal tax, the remainder may be refundable via ACTC
      // ACTC = 15% of (earned income - $2,500), limited to unused CTC
      if (earnedIncome > 2500) {
        const actcBasis = (earnedIncome - 2500) * 0.15;
        // We estimate unused CTC as max potential (will be refined at tax time)
        const estimatedACTC = Math.min(totalCTC, Math.round(actcBasis));
        if (estimatedACTC > 0) {
          credits.push({
            name: 'Additional Child Tax Credit (Refundable)',
            code: 'ACTC',
            estimatedAmount: estimatedACTC,
            confidence: 0.7,
            eligibility: 'likely',
            basis: `Refundable portion of CTC. Based on earned income of $${earnedIncome.toLocaleString()}.`,
            requirements: [
              'Must have earned income above $2,500',
              'Applies when CTC exceeds tax liability',
              'Refundable up to $1,700 per child (2024)',
            ],
          });
        }
      }
    }

    // ----- Earned Income Tax Credit (EITC) -----
    const eitcResult = this.calculateEITC(earnedIncome, agi, qualifyingChildren.length, filingStatus);
    if (eitcResult > 0) {
      const childCount = Math.min(qualifyingChildren.length, 3);
      credits.push({
        name: 'Earned Income Tax Credit',
        code: 'EITC',
        estimatedAmount: eitcResult,
        confidence: earnedIncome > 0 ? 0.85 : 0.3,
        eligibility: earnedIncome > 0 ? 'eligible' : 'possible',
        basis: `Earned income: $${earnedIncome.toLocaleString()}, AGI: $${agi.toLocaleString()}, ${childCount} qualifying child${childCount !== 1 ? 'ren' : ''}.`,
        requirements: [
          'Must have earned income (W-2 or self-employment)',
          'Must meet AGI limits for filing status and number of children',
          'Investment income must be $11,600 or less (2024)',
          'Must be U.S. citizen or resident alien for full year',
        ],
      });
    }

    // ----- Education Credits (AOC from 1098-T) -----
    if (incomes.has1098T && filingStatus !== 'married_filing_separately') {
      const qualifiedExpenses = Math.max(0, incomes.tuitionPayments - incomes.scholarships);
      if (qualifiedExpenses > 0) {
        // AOC: 100% of first $2,000 + 25% of next $2,000 = max $2,500 per student
        const aocCredit = Math.min(
          AOC_MAX_PER_STUDENT,
          qualifiedExpenses <= 2000 ? qualifiedExpenses : 2000 + (qualifiedExpenses - 2000) * 0.25
        );

        // Phase-out
        const phaseOutStart = AOC_PHASE_OUT_START[filingStatus] || 80000;
        const phaseOutEnd = AOC_PHASE_OUT_END[filingStatus] || 90000;
        let adjustedAOC = aocCredit;

        if (agi >= phaseOutEnd) {
          adjustedAOC = 0;
        } else if (agi > phaseOutStart) {
          const ratio = 1 - ((agi - phaseOutStart) / (phaseOutEnd - phaseOutStart));
          adjustedAOC = Math.round(aocCredit * ratio);
        }

        if (adjustedAOC > 0) {
          // Non-refundable portion (60%)
          const nonRefundable = Math.round(adjustedAOC * 0.60);
          credits.push({
            name: 'American Opportunity Credit',
            code: 'AOC',
            estimatedAmount: nonRefundable,
            confidence: 0.8,
            eligibility: 'likely',
            basis: `1098-T detected. Qualified expenses: $${qualifiedExpenses.toLocaleString()}. Must be first 4 years of post-secondary.`,
            requirements: [
              'Student must be pursuing a degree or credential',
              'Must be enrolled at least half-time for one academic period',
              'Must not have completed first 4 years of post-secondary education',
              'Cannot be claimed for more than 4 tax years',
            ],
          });

          // Refundable portion (40%)
          const refundable = Math.round(adjustedAOC * 0.40);
          if (refundable > 0) {
            credits.push({
              name: 'American Opportunity Credit (Refundable)',
              code: 'AOC_REFUND',
              estimatedAmount: refundable,
              confidence: 0.8,
              eligibility: 'likely',
              basis: `40% of the American Opportunity Credit ($${adjustedAOC.toLocaleString()}) is refundable.`,
              requirements: [
                'Same eligibility as the American Opportunity Credit',
                '40% of the total credit amount is refundable',
              ],
            });
          }
        }
      }
    }

    // ----- Retirement Savings Contribution Credit (Saver's Credit) -----
    if (incomes.hasRetirementContributions) {
      const limits = SAVER_CREDIT_LIMITS[filingStatus] || SAVER_CREDIT_LIMITS['single'];
      let creditRate = 0;
      if (agi <= limits[0]) {
        creditRate = 0.50;
      } else if (agi <= limits[1]) {
        creditRate = 0.20;
      } else if (agi <= limits[2]) {
        creditRate = 0.10;
      }

      if (creditRate > 0) {
        const maxContribution = filingStatus === 'married_filing_jointly' ? 4000 : 2000;
        const eligibleContribution = Math.min(incomes.retirementContributionAmount, maxContribution);
        const saverCredit = Math.round(eligibleContribution * creditRate);

        if (saverCredit > 0) {
          credits.push({
            name: 'Retirement Savings Contribution Credit',
            code: 'SAVER',
            estimatedAmount: saverCredit,
            confidence: 0.75,
            eligibility: 'likely',
            basis: `W-2 Box 12 retirement contributions detected ($${incomes.retirementContributionAmount.toLocaleString()}). AGI qualifies for ${(creditRate * 100)}% rate.`,
            requirements: [
              'Must be 18 or older',
              'Cannot be a full-time student',
              'Cannot be claimed as a dependent on another return',
              'AGI must be within limits for filing status',
            ],
          });
        }
      }
    }

    // ----- Premium Tax Credit (from 1095-A) -----
    if (incomes.has1095A) {
      // Detect potential PTC reconciliation
      const aptcReceived = incomes.annualAdvancePtc;
      credits.push({
        name: 'Premium Tax Credit',
        code: 'PTC',
        estimatedAmount: Math.round(aptcReceived), // Placeholder -- actual requires Form 8962
        confidence: 0.6,
        eligibility: 'possible',
        basis: `1095-A detected. Advance PTC received: $${aptcReceived.toLocaleString()}. Requires Form 8962 reconciliation.`,
        requirements: [
          'Must have purchased coverage through Health Insurance Marketplace',
          'Cannot be eligible for other qualifying coverage',
          'Household income must be 100-400% of Federal Poverty Level',
          'Must file joint return if married',
        ],
      });
    }

    return credits;
  }

  // -------------------------------------------------------------------------
  // EITC Calculation
  // -------------------------------------------------------------------------

  private calculateEITC(
    earnedIncome: number,
    agi: number,
    qualifyingChildren: number,
    filingStatus: FilingStatus
  ): number {
    if (earnedIncome <= 0) return 0;

    const bracketKey = Math.min(qualifyingChildren, 3);
    const bracket = EITC_2024[bracketKey];
    if (!bracket) return 0;

    const isMFJ = filingStatus === 'married_filing_jointly';
    const phaseOutStart = isMFJ ? bracket.phaseOutStartMFJ : bracket.phaseOutStartSingle;
    const maxIncome = isMFJ ? bracket.maxIncomeMFJ : bracket.maxIncomeSingle;

    // IRS uses the greater of earned income or AGI for phase-out
    const phaseOutIncome = Math.max(earnedIncome, agi);

    if (phaseOutIncome > maxIncome) return 0;

    // Phase-in credit
    const phaseInCredit = Math.min(earnedIncome * bracket.phaseInRate, bracket.maxCredit);

    // Phase-out reduction
    let phaseOutReduction = 0;
    if (phaseOutIncome > phaseOutStart) {
      phaseOutReduction = (phaseOutIncome - phaseOutStart) * bracket.phaseOutRate;
    }

    return Math.max(0, Math.floor(phaseInCredit - phaseOutReduction));
  }
}

// Export singleton instance
export const intelligentTaxCalcService = new IntelligentTaxCalcService();
export default intelligentTaxCalcService;
