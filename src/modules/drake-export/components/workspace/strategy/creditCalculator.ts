import { devLog } from '../../../../../services/utils';
import type { TaxPortal, TaxDependent, DrakeTaxDocument, FilingStatus } from '../../../types/drakeTypes';
import type { TaxCreditsChecklist, TaxStrategyData, ChecklistItem } from '../../../types/taxStrategyTypes';

export interface CreditCalculationResult {
  creditAmount: number;
  qualifyingChildren: number;
  phaseOutReduction: number;
  isPhasedOut: boolean;
  details: string;
  eligibility: {
    hasDependents: boolean;
    hasQualifyingChildren: boolean;
    totalDependents: number;
    nonQualifyingReason?: string;
  };
}

export interface EICCalculationResult {
  creditAmount: number;
  qualifyingChildren: number;
  details: string;
  eligibility: {
    hasEarnedIncome: boolean;
    earnedIncome: number;
    incomeLimit: number;
    isWithinLimit: boolean;
    reason?: string;
  };
}

// --- Strategy data helpers ---

function sumCheckedItems(obj: Record<string, ChecklistItem>): number {
  let total = 0;
  for (const key of Object.keys(obj)) {
    const item = obj[key];
    if (item && item.checked && item.amount) {
      total += item.amount;
    }
  }
  return total;
}

/** Sum checked additional income items from the Other Income checklist */
export function getStrategyOtherIncome(strategyData?: TaxStrategyData): number {
  if (!strategyData?.otherIncome?.additionalIncome) return 0;
  const total = sumCheckedItems(strategyData.otherIncome.additionalIncome as unknown as Record<string, ChecklistItem>);
  devLog('[STRATEGY CALC] Strategy other income total:', total);
  return total;
}

/** Sum checked above-the-line adjustments (reduce AGI) */
export function getStrategyAdjustments(strategyData?: TaxStrategyData): number {
  if (!strategyData?.otherIncome?.adjustments) return 0;
  const total = sumCheckedItems(strategyData.otherIncome.adjustments as unknown as Record<string, ChecklistItem>);
  devLog('[STRATEGY CALC] Strategy adjustments total:', total);
  return total;
}

/** Sum checked business expenses + vehicle mileage + home office */
export function getBusinessExpenseTotal(strategyData?: TaxStrategyData, taxYear: number = 2024): number {
  if (!strategyData?.businessExpenses) return 0;
  const be = strategyData.businessExpenses;
  let total = 0;

  // Sum all expense category groups
  const categories = [be.operations, be.office, be.travel, be.equipment, be.education, be.labor, be.facilityExpenses, be.marketing, be.insurance, be.other] as const;
  for (const cat of categories) {
    if (cat) total += sumCheckedItems(cat as unknown as Record<string, ChecklistItem>);
  }

  // Meals at 50% deductibility
  if (be.meals) {
    const mealItems = be.meals as unknown as Record<string, ChecklistItem>;
    for (const key of Object.keys(mealItems)) {
      const item = mealItems[key];
      if (item && item.checked && item.amount) {
        total += Math.round(item.amount * 0.5);
      }
    }
  }

  // Vehicle mileage deduction
  const mileageRate = taxYear === 2025 ? 0.70 : 0.67;
  for (const v of be.vehicles || []) {
    if (v.deductionMethod === 'standard_mileage') {
      total += Math.round(v.businessMilesDriven * mileageRate);
    } else if (v.deductionMethod === 'actual_expenses' && v.actualExpenses) {
      total += sumCheckedItems(v.actualExpenses as unknown as Record<string, ChecklistItem>);
    }
  }

  // Home office deduction
  if (be.homeOffice) {
    if (be.homeOffice.calculationMethod === 'simplified') {
      const sqft = Math.min(be.homeOffice.simplifiedSquareFootage || 0, 300);
      total += sqft * 5;
    } else {
      // Regular method — direct expenses
      if (be.homeOffice.directExpenses) {
        total += sumCheckedItems(be.homeOffice.directExpenses as unknown as Record<string, ChecklistItem>);
      }
      // Indirect expenses × business use percentage
      if (be.homeOffice.indirectExpenses && be.homeOffice.businessUsePercentage) {
        const indirect = sumCheckedItems(be.homeOffice.indirectExpenses as unknown as Record<string, ChecklistItem>);
        total += Math.round(indirect * (be.homeOffice.businessUsePercentage / 100));
      }
    }
  }

  devLog('[STRATEGY CALC] Business expense total:', total);
  return total;
}

function getAGI(documents: DrakeTaxDocument[], strategyData?: TaxStrategyData): number {
  let agi = 0;
  const breakdown: { type: string; source: string; amount: number }[] = [];

  for (const doc of documents) {
    if (doc.drakeFormType === 'w2') {
      const amt = doc.extractedAmounts?.wages ?? 0;
      agi += amt;
      if (amt > 0) breakdown.push({ type: 'W-2', source: doc.payerInfo?.name || doc.originalFileName || 'unknown', amount: amt });
    } else if (doc.drakeFormType === '1099_nec') {
      const amt = doc.extractedAmounts?.nonEmployeeCompensation ?? 0;
      agi += amt;
      if (amt > 0) breakdown.push({ type: '1099-NEC', source: doc.payerInfo?.name || doc.originalFileName || 'unknown', amount: amt });
    } else if (doc.drakeFormType === '1099_int') {
      const amt = doc.extractedAmounts?.interestIncome ?? 0;
      agi += amt;
      if (amt > 0) breakdown.push({ type: '1099-INT', source: doc.payerInfo?.name || doc.originalFileName || 'unknown', amount: amt });
    } else if (doc.drakeFormType === '1099_div') {
      const amt = doc.extractedAmounts?.ordinaryDividends ?? 0;
      agi += amt;
      if (amt > 0) breakdown.push({ type: '1099-DIV', source: doc.payerInfo?.name || doc.originalFileName || 'unknown', amount: amt });
    } else if (doc.drakeFormType === '1099_misc') {
      const misc = doc.extractedAmounts?.miscellaneousIncome ?? 0;
      const rents = doc.extractedAmounts?.rents ?? 0;
      const royalties = doc.extractedAmounts?.royalties ?? 0;
      agi += misc + rents + royalties;
      if (misc + rents + royalties > 0) breakdown.push({ type: '1099-MISC', source: doc.payerInfo?.name || doc.originalFileName || 'unknown', amount: misc + rents + royalties });
    }
  }

  devLog('[STRATEGY CALC] AGI from documents:', agi);

  // Add strategy checklist data
  if (strategyData) {
    const otherIncome = getStrategyOtherIncome(strategyData);
    const adjustments = getStrategyAdjustments(strategyData);
    const businessExpenses = getBusinessExpenseTotal(strategyData, 2024);
    agi += otherIncome;
    agi -= businessExpenses;
    agi -= adjustments;
    agi = Math.max(0, agi);
    devLog('[STRATEGY CALC] + Other income:', otherIncome, '| - Business expenses:', businessExpenses, '| - Adjustments:', adjustments);
  }

  devLog('[STRATEGY CALC] AGI Breakdown:', JSON.stringify(breakdown, null, 2));
  devLog('[STRATEGY CALC] Final AGI:', agi);
  return agi;
}

function getEarnedIncome(documents: DrakeTaxDocument[]): number {
  let earned = 0;

  for (const doc of documents) {
    if (doc.drakeFormType === 'w2') {
      earned += doc.extractedAmounts?.wages ?? 0;
    } else if (doc.drakeFormType === '1099_nec') {
      earned += doc.extractedAmounts?.nonEmployeeCompensation ?? 0;
    }
  }

  devLog('[STRATEGY CALC] Earned Income (W-2 + 1099-NEC):', earned);
  return earned;
}

function getQualifyingChildren(client: TaxPortal): TaxDependent[] {
  const qualifyingRelationships = [
    'son',
    'daughter',
    'stepson',
    'stepdaughter',
    'foster_child',
    'grandchild',
  ];

  const taxYear = client.taxYear || 2024;
  const endOfTaxYear = new Date(taxYear, 11, 31);

  devLog('[STRATEGY CALC] --- Dependents Analysis ---');
  devLog('[STRATEGY CALC] Tax Year:', taxYear);
  devLog('[STRATEGY CALC] Total dependents on return:', client.dependents?.length || 0);
  devLog('[STRATEGY CALC] All dependents:', JSON.stringify(client.dependents, null, 2));

  if (!client.dependents) {
    devLog('[STRATEGY CALC] No dependents array found on client');
    return [];
  }

  const results = client.dependents.map((dep) => {
    const hasQualifyingRelationship = qualifyingRelationships.includes(dep.relationship);
    let ageAtEndOfYear: number | null = null;
    let isUnder17 = true;

    if (dep.dateOfBirth) {
      const dob = new Date(dep.dateOfBirth);
      ageAtEndOfYear =
        endOfTaxYear.getFullYear() - dob.getFullYear() -
        (endOfTaxYear < new Date(endOfTaxYear.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
      isUnder17 = ageAtEndOfYear < 17;
    }

    const qualifies = hasQualifyingRelationship && isUnder17;

    devLog(`[STRATEGY CALC] Dependent: ${dep.firstName} ${dep.lastName} | relationship: ${dep.relationship} (${hasQualifyingRelationship ? 'VALID' : 'NOT VALID'}) | DOB: ${dep.dateOfBirth || 'N/A'} | Age: ${ageAtEndOfYear !== null ? ageAtEndOfYear : 'unknown'} | Under 17: ${isUnder17} | QUALIFIES: ${qualifies}`);

    return { dep, qualifies };
  });

  const qualifying = results.filter(r => r.qualifies).map(r => r.dep);
  devLog('[STRATEGY CALC] Qualifying children count:', qualifying.length);
  return qualifying;
}

function getPhaseOutThreshold(filingStatus: FilingStatus): number {
  switch (filingStatus) {
    case 'married_filing_jointly':
      return 400_000;
    case 'single':
    case 'head_of_household':
    case 'married_filing_separately':
    case 'qualifying_widow':
    default:
      return 200_000;
  }
}

export function calculateChildTaxCredit(
  client: TaxPortal,
  documents: DrakeTaxDocument[],
  strategyData?: TaxStrategyData
): CreditCalculationResult {
  devLog('[STRATEGY CALC] ===== CHILD TAX CREDIT CALCULATION =====');
  devLog('[STRATEGY CALC] Client:', JSON.stringify({
    name: `${client.firstName} ${client.lastName}`,
    filingStatus: client.filingStatus,
    taxYear: client.taxYear,
    dependentsCount: client.dependents?.length || 0,
  }));
  devLog('[STRATEGY CALC] Documents count:', documents.length);
  devLog('[STRATEGY CALC] Documents with extractedAmounts:', documents.filter(d => d.extractedAmounts).length);
  devLog('[STRATEGY CALC] Document types:', JSON.stringify(documents.map(d => ({ type: d.drakeFormType, name: d.originalFileName, status: d.uploadStatus }))));

  const agi = getAGI(documents, strategyData);
  const totalDependents = client.dependents?.length || 0;
  const hasDependents = totalDependents > 0;
  const qualifyingChildren = getQualifyingChildren(client);
  const qualifyingCount = qualifyingChildren.length;

  // Determine why children don't qualify
  let nonQualifyingReason: string | undefined;
  if (!hasDependents) {
    nonQualifyingReason = 'No dependents on return';
  } else if (qualifyingCount === 0) {
    nonQualifyingReason = `${totalDependents} dependent(s) found, but none qualify (must be under 17 and qualifying relationship)`;
  }

  const baseCredit = qualifyingCount * 2000;
  const filingStatus: FilingStatus = client.filingStatus || 'single';
  const threshold = getPhaseOutThreshold(filingStatus);

  let phaseOutReduction = 0;
  let isPhasedOut = false;

  if (agi > threshold && baseCredit > 0) {
    const excessIncome = agi - threshold;
    const increments = Math.ceil(excessIncome / 1000);
    phaseOutReduction = increments * 50;
    isPhasedOut = phaseOutReduction > 0;
  }

  const creditAmount = Math.max(0, baseCredit - phaseOutReduction);

  const detailLines: string[] = [];
  if (!hasDependents) {
    detailLines.push('No dependents found on return');
  } else {
    detailLines.push(
      `${qualifyingCount} qualifying child${qualifyingCount !== 1 ? 'ren' : ''} of ${totalDependents} dependent(s) × $2,000 = $${baseCredit.toLocaleString()}`
    );
  }

  if (isPhasedOut) {
    const excessIncome = agi - threshold;
    detailLines.push(
      `AGI $${agi.toLocaleString()} exceeds ${filingStatus.replace(/_/g, ' ')} threshold ($${threshold.toLocaleString()}) by $${excessIncome.toLocaleString()}, reduction: -$${phaseOutReduction.toLocaleString()}`
    );
  }

  devLog('[STRATEGY CALC] --- Child Tax Credit Result ---');
  devLog('[STRATEGY CALC] Base credit:', baseCredit, '| Phase-out:', phaseOutReduction, '| Final:', creditAmount);
  devLog('[STRATEGY CALC] Filing status:', filingStatus, '| Threshold:', threshold, '| AGI:', agi);

  return {
    creditAmount,
    qualifyingChildren: qualifyingCount,
    phaseOutReduction,
    isPhasedOut,
    details: detailLines.join('. '),
    eligibility: {
      hasDependents,
      hasQualifyingChildren: qualifyingCount > 0,
      totalDependents,
      nonQualifyingReason,
    },
  };
}

export function calculateEarnedIncomeCredit(
  client: TaxPortal,
  documents: DrakeTaxDocument[],
  strategyData?: TaxStrategyData
): EICCalculationResult {
  devLog('[STRATEGY CALC] ===== EIC CALCULATION =====');
  const earnedIncome = getEarnedIncome(documents);
  const agi = getAGI(documents, strategyData);
  const qualifyingChildren = getQualifyingChildren(client);
  const qualifyingCount = qualifyingChildren.length;

  const filingStatus: FilingStatus = client.filingStatus || 'single';
  const isMFJ = filingStatus === 'married_filing_jointly';
  const taxYear = client.taxYear || 2024;

  // IRS EIC parameters with phase-in and phase-out thresholds
  // Phase-in rates: 0 children: 7.65%, 1 child: 34%, 2 children: 40%, 3+ children: 45%
  // Phase-out rates: 0 children: 7.65%, 1 child: 15.98%, 2 children: 21.06%, 3+ children: 21.06%
  interface EITCBracket {
    maxCredit: number;
    phaseInEnd: number;         // Earned income where phase-in ends (plateau starts)
    phaseOutStartSingle: number; // AGI/earned income where phase-out starts (single/HOH)
    phaseOutStartMFJ: number;    // AGI/earned income where phase-out starts (MFJ)
    maxIncomeSingle: number;     // Maximum income for single/HOH
    maxIncomeMFJ: number;        // Maximum income for MFJ
    phaseInRate: number;         // Rate at which credit phases in
    phaseOutRate: number;        // Rate at which credit phases out
  }

  // 2024 EIC parameters (IRS Rev. Proc. 2023-34)
  const brackets2024: Record<number, EITCBracket> = {
    0: {
      maxCredit: 632,
      phaseInEnd: 7_840,
      phaseOutStartSingle: 9_800,
      phaseOutStartMFJ: 16_370,
      maxIncomeSingle: 18_591,
      maxIncomeMFJ: 25_511,
      phaseInRate: 0.0765,
      phaseOutRate: 0.0765
    },
    1: {
      maxCredit: 4_213,
      phaseInEnd: 12_390,
      phaseOutStartSingle: 22_720,
      phaseOutStartMFJ: 29_290,
      maxIncomeSingle: 49_084,
      maxIncomeMFJ: 56_004,
      phaseInRate: 0.34,
      phaseOutRate: 0.1598
    },
    2: {
      maxCredit: 6_960,
      phaseInEnd: 17_400,
      phaseOutStartSingle: 22_720,
      phaseOutStartMFJ: 29_290,
      maxIncomeSingle: 55_768,
      maxIncomeMFJ: 62_688,
      phaseInRate: 0.40,
      phaseOutRate: 0.2106
    },
    3: {
      maxCredit: 7_830,
      phaseInEnd: 17_400,
      phaseOutStartSingle: 22_720,
      phaseOutStartMFJ: 29_290,
      maxIncomeSingle: 59_899,
      maxIncomeMFJ: 66_819,
      phaseInRate: 0.45,
      phaseOutRate: 0.2106
    },
  };

  // 2025 EIC parameters (IRS Rev. Proc. 2024-40)
  const brackets2025: Record<number, EITCBracket> = {
    0: {
      maxCredit: 649,
      phaseInEnd: 8_490,
      phaseOutStartSingle: 10_620,
      phaseOutStartMFJ: 17_620,
      maxIncomeSingle: 19_104,
      maxIncomeMFJ: 26_214,
      phaseInRate: 0.0765,
      phaseOutRate: 0.0765
    },
    1: {
      maxCredit: 4_328,
      phaseInEnd: 12_730,
      phaseOutStartSingle: 23_350,
      phaseOutStartMFJ: 30_350,
      maxIncomeSingle: 50_434,
      maxIncomeMFJ: 57_554,
      phaseInRate: 0.34,
      phaseOutRate: 0.1598
    },
    2: {
      maxCredit: 7_152,
      phaseInEnd: 17_880,
      phaseOutStartSingle: 23_350,
      phaseOutStartMFJ: 30_350,
      maxIncomeSingle: 57_310,
      maxIncomeMFJ: 64_430,
      phaseInRate: 0.40,
      phaseOutRate: 0.2106
    },
    3: {
      maxCredit: 8_046,
      phaseInEnd: 17_880,
      phaseOutStartSingle: 23_350,
      phaseOutStartMFJ: 30_350,
      maxIncomeSingle: 61_555,
      maxIncomeMFJ: 68_675,
      phaseInRate: 0.45,
      phaseOutRate: 0.2106
    },
  };

  const brackets = taxYear === 2025 ? brackets2025 : brackets2024;
  const bracketKey = Math.min(qualifyingCount, 3);
  const bracket = brackets[bracketKey];

  const phaseOutStart = isMFJ ? bracket.phaseOutStartMFJ : bracket.phaseOutStartSingle;
  const incomeLimit = isMFJ ? bracket.maxIncomeMFJ : bracket.maxIncomeSingle;
  const hasEarnedIncome = earnedIncome > 0;

  // IRS uses the GREATER of earned income or AGI for phase-out calculation
  const phaseOutIncome = Math.max(earnedIncome, agi);
  const isWithinLimit = phaseOutIncome <= incomeLimit;

  devLog('[STRATEGY CALC] Tax Year:', taxYear);
  devLog('[STRATEGY CALC] Earned Income:', earnedIncome);
  devLog('[STRATEGY CALC] AGI:', agi);
  devLog('[STRATEGY CALC] Phase-out Income (max of earned/AGI):', phaseOutIncome);
  devLog('[STRATEGY CALC] Filing Status:', filingStatus, '| Is MFJ:', isMFJ);
  devLog('[STRATEGY CALC] Bracket:', bracketKey, 'children');
  devLog('[STRATEGY CALC] Phase-in End:', bracket.phaseInEnd);
  devLog('[STRATEGY CALC] Phase-out Start:', phaseOutStart);
  devLog('[STRATEGY CALC] Max Income:', incomeLimit);
  devLog('[STRATEGY CALC] Phase-in Rate:', bracket.phaseInRate, '| Phase-out Rate:', bracket.phaseOutRate);

  // Calculate EIC using proper IRS phase-in/phase-out formula
  let creditAmount = 0;
  let phase = '';

  if (!hasEarnedIncome) {
    creditAmount = 0;
    phase = 'no-income';
  } else if (phaseOutIncome > incomeLimit) {
    // Income exceeds maximum - no credit
    creditAmount = 0;
    phase = 'over-limit';
  } else if (earnedIncome <= bracket.phaseInEnd) {
    // Phase-in range: credit = earned income × phase-in rate
    creditAmount = earnedIncome * bracket.phaseInRate;
    phase = 'phase-in';
    devLog(`[STRATEGY CALC] Phase-in: $${earnedIncome} × ${bracket.phaseInRate} = $${creditAmount.toFixed(2)}`);
  } else if (phaseOutIncome <= phaseOutStart) {
    // Plateau range: credit = max credit
    creditAmount = bracket.maxCredit;
    phase = 'plateau';
    devLog(`[STRATEGY CALC] Plateau: Max credit $${creditAmount}`);
  } else {
    // Phase-out range: credit = max credit - ((income - phase-out start) × phase-out rate)
    const reduction = (phaseOutIncome - phaseOutStart) * bracket.phaseOutRate;
    creditAmount = Math.max(0, bracket.maxCredit - reduction);
    phase = 'phase-out';
    devLog(`[STRATEGY CALC] Phase-out: $${bracket.maxCredit} - (($${phaseOutIncome} - $${phaseOutStart}) × ${bracket.phaseOutRate}) = $${bracket.maxCredit} - $${reduction.toFixed(2)} = $${creditAmount.toFixed(2)}`);
  }

  // Round to whole dollars (IRS rounds down)
  creditAmount = Math.floor(creditAmount);

  let reason: string | undefined;
  if (!hasEarnedIncome) {
    reason = 'No earned income found (need W-2 or 1099-NEC)';
  } else if (!isWithinLimit) {
    reason = `Income $${phaseOutIncome.toLocaleString()} exceeds limit $${incomeLimit.toLocaleString()}`;
  } else if (creditAmount === 0 && hasEarnedIncome) {
    reason = 'Income too high for EIC - phased out completely';
  }

  const details = hasEarnedIncome
    ? `Earned income: $${earnedIncome.toLocaleString()}, AGI: $${agi.toLocaleString()}, ${qualifyingCount} qualifying child${qualifyingCount !== 1 ? 'ren' : ''}, phase: ${phase}`
    : 'No earned income detected from documents';

  devLog('[STRATEGY CALC] --- EIC Result ---');
  devLog('[STRATEGY CALC] Phase:', phase, '| Final EIC:', creditAmount);
  if (reason) devLog('[STRATEGY CALC] EIC reason:', reason);

  return {
    creditAmount,
    qualifyingChildren: qualifyingCount,
    details,
    eligibility: {
      hasEarnedIncome,
      earnedIncome,
      incomeLimit,
      isWithinLimit,
      reason,
    },
  };
}

export interface ACTCCalculationResult {
  nonRefundableCTC: number;
  refundableACTC: number;
  earnedIncome: number;
  estimatedTaxLiability: number;
  details: string;
}

/**
 * Calculate ACTC (Schedule 8812) - splits total CTC into non-refundable + refundable
 *
 * Schedule 8812 flow:
 *   Line 14: nonRefundableCTC = MIN(totalCTC, taxLiability)
 *   Line 16a: unusedCTC = totalCTC - nonRefundableCTC
 *   Line 16b: perChildCap = qualifyingChildren × $1,700
 *   Line 17:  MIN(Line 16a, Line 16b)
 *   Line 19:  MAX(0, earnedIncome - $2,500)
 *   Line 20:  Line 19 × 15%
 *   Line 27:  ACTC = MIN(Line 17, Line 20)
 */
export function calculateACTC(
  totalCTC: number,
  qualifyingChildren: number,
  earnedIncome: number,
  taxLiability: number
): ACTCCalculationResult {
  devLog('[STRATEGY CALC] ===== ACTC CALCULATION (Schedule 8812) =====');

  // Line 14: Non-refundable CTC limited to tax liability
  const nonRefundableCTC = Math.min(totalCTC, taxLiability);

  if (qualifyingChildren === 0 || totalCTC === 0) {
    return { nonRefundableCTC: 0, refundableACTC: 0, earnedIncome, estimatedTaxLiability: taxLiability, details: 'No qualifying children' };
  }

  // Line 16a: Unused CTC
  const unusedCTC = totalCTC - nonRefundableCTC;
  if (unusedCTC <= 0) {
    return {
      nonRefundableCTC,
      refundableACTC: 0,
      earnedIncome,
      estimatedTaxLiability: taxLiability,
      details: `Full CTC of $${totalCTC.toLocaleString()} applied as non-refundable credit against $${taxLiability.toLocaleString()} tax liability`
    };
  }

  // Line 16b: $1,700 per qualifying child cap
  const MAX_REFUNDABLE_PER_CHILD = 1700;
  const perChildCap = qualifyingChildren * MAX_REFUNDABLE_PER_CHILD;

  // Line 17: MIN(Line 16a, Line 16b)
  const line17 = Math.min(unusedCTC, perChildCap);

  // Line 19-20: 15% of earned income above $2,500
  const EARNED_INCOME_THRESHOLD = 2500;
  if (earnedIncome <= EARNED_INCOME_THRESHOLD) {
    devLog('[STRATEGY CALC] Earned income below $2,500 threshold — ACTC = $0');
    return {
      nonRefundableCTC,
      refundableACTC: 0,
      earnedIncome,
      estimatedTaxLiability: taxLiability,
      details: `Earned income $${earnedIncome.toLocaleString()} below $2,500 threshold`
    };
  }

  const excessEarned = earnedIncome - EARNED_INCOME_THRESHOLD;
  const line20 = excessEarned * 0.15;

  // Line 27: ACTC = MIN(Line 17, Line 20)
  const actc = Math.round(Math.min(line17, line20));

  devLog(`[STRATEGY CALC] Line 16a (unused CTC): $${unusedCTC}`);
  devLog(`[STRATEGY CALC] Line 16b (per-child cap): $${perChildCap}`);
  devLog(`[STRATEGY CALC] Line 17: $${line17}`);
  devLog(`[STRATEGY CALC] Line 20 (15% × ($${earnedIncome} - $2,500)): $${line20.toFixed(2)}`);
  devLog(`[STRATEGY CALC] Line 27 (ACTC): $${actc}`);

  const detailParts: string[] = [];
  detailParts.push(`Non-refundable CTC: $${nonRefundableCTC.toLocaleString()} (limited to tax liability)`);
  detailParts.push(`ACTC: MIN($${line17.toLocaleString()}, $${Math.round(line20).toLocaleString()}) = $${actc.toLocaleString()}`);

  return {
    nonRefundableCTC,
    refundableACTC: actc,
    earnedIncome,
    estimatedTaxLiability: taxLiability,
    details: detailParts.join('. ')
  };
}

export function applyCalculatedCredits(
  currentCredits: TaxCreditsChecklist,
  client: TaxPortal,
  documents: DrakeTaxDocument[],
  strategyData?: TaxStrategyData
): { updatedCredits: TaxCreditsChecklist; childCredit: CreditCalculationResult; eic: EICCalculationResult; actc: ACTCCalculationResult } {
  const updatedCredits = { ...currentCredits };

  const childCredit = calculateChildTaxCredit(client, documents, strategyData);
  const eic = calculateEarnedIncomeCredit(client, documents, strategyData);

  // Calculate ACTC split - tax liability is $0 when taxable income is $0
  // (standard deduction exceeds income), so we estimate it here
  const earnedIncome = getEarnedIncome(documents);
  const agi = getAGI(documents, strategyData);
  const taxYear = client.taxYear || 2024;
  const filingStatus: FilingStatus = client.filingStatus || 'single';

  // Estimate tax liability for ACTC calculation
  const standardDeductions: Record<string, number> = taxYear === 2025
    ? { single: 15750, married_filing_jointly: 31500, head_of_household: 23625, married_filing_separately: 15750, qualifying_widow: 31500 }
    : { single: 14600, married_filing_jointly: 29200, head_of_household: 21900, married_filing_separately: 14600, qualifying_widow: 29200 };
  const stdDed = standardDeductions[filingStatus] || standardDeductions.single;
  const taxableIncome = Math.max(0, agi - stdDed);

  // Simple tax estimate for ACTC purposes (10% bracket covers most low-income cases)
  const estimatedTax = taxableIncome > 0 ? Math.round(taxableIncome * 0.10) : 0;

  const actc = calculateACTC(
    childCredit.creditAmount,
    childCredit.qualifyingChildren,
    earnedIncome,
    estimatedTax
  );

  // Only check/fill if credit applies
  if (childCredit.creditAmount > 0) {
    updatedCredits.children = {
      ...updatedCredits.children,
      childTaxCredit: {
        ...updatedCredits.children.childTaxCredit,
        checked: true,
        amount: childCredit.creditAmount,
      },
    };
  } else {
    // Uncheck if doesn't apply
    updatedCredits.children = {
      ...updatedCredits.children,
      childTaxCredit: {
        ...updatedCredits.children.childTaxCredit,
        checked: false,
        amount: 0,
      },
    };
  }

  if (eic.creditAmount > 0) {
    updatedCredits.eitc = {
      ...updatedCredits.eitc,
      earnedIncomeCredit: {
        ...updatedCredits.eitc.earnedIncomeCredit,
        checked: true,
        amount: eic.creditAmount,
      },
      qualifyingChildren: {
        ...updatedCredits.eitc.qualifyingChildren,
        checked: true,
        amount: eic.qualifyingChildren,
      },
    };
  } else {
    updatedCredits.eitc = {
      ...updatedCredits.eitc,
      earnedIncomeCredit: {
        ...updatedCredits.eitc.earnedIncomeCredit,
        checked: false,
        amount: 0,
      },
      qualifyingChildren: {
        ...updatedCredits.eitc.qualifyingChildren,
        checked: eic.qualifyingChildren > 0,
        amount: eic.qualifyingChildren,
      },
    };
  }

  return { updatedCredits, childCredit, eic, actc };
}
