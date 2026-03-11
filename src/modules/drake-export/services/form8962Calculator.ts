/**
 * Form 8962 - Premium Tax Credit Calculator
 *
 * Calculates the Premium Tax Credit (PTC) and determines if there's
 * excess advance payment that must be repaid or additional credit due.
 */

import { devLog } from "../../../services/utils";

// Federal Poverty Level (FPL) amounts by year and family size
// Source: HHS Poverty Guidelines (48 contiguous states)
// IMPORTANT: For Premium Tax Credit, use PRIOR year's FPL for the tax year
// e.g., for tax year 2025, use 2024 FPL values
const FPL_BY_YEAR: Record<number, Record<number, number>> = {
  2023: {
    1: 14580,
    2: 19720,
    3: 24860,
    4: 30000,
    5: 35140,
    6: 40280,
    7: 45420,
    8: 50560,
  },
  2024: {
    1: 15060,
    2: 20440,
    3: 25820,
    4: 31200,
    5: 36580,
    6: 41960,
    7: 47340,
    8: 52720,
  },
  2025: {
    1: 15650,
    2: 21150,
    3: 26650,
    4: 32150,
    5: 37650,
    6: 43150,
    7: 48650,
    8: 54150,
  },
  2026: {
    1: 16000, // Estimated
    2: 21600,
    3: 27200,
    4: 32800,
    5: 38400,
    6: 44000,
    7: 49600,
    8: 55200,
  },
};

// Additional amount per person beyond 8 family members
const FPL_ADDITIONAL_PERSON: Record<number, number> = {
  2023: 5140,
  2024: 5380,
  2025: 5500,
  2026: 5600, // Estimated
};

/**
 * Get Federal Poverty Level for a given tax year and family size
 * IMPORTANT: For PTC, use PRIOR year's FPL (e.g., 2024 FPL for 2025 tax year)
 */
export function getFederalPovertyLevel(taxYear: number, familySize: number): number {
  // Use prior year's FPL for Premium Tax Credit calculation
  const fplYear = taxYear - 1;
  const yearData = FPL_BY_YEAR[fplYear] || FPL_BY_YEAR[2024];
  const additionalPerPerson = FPL_ADDITIONAL_PERSON[fplYear] || FPL_ADDITIONAL_PERSON[2024];

  if (familySize <= 8) {
    return yearData[familySize] || yearData[1];
  }

  // For family sizes > 8, add additional amount per person
  return yearData[8] + (familySize - 8) * additionalPerPerson;
}

/**
 * Applicable percentage table for Premium Tax Credit
 * Based on household income as percentage of FPL
 *
 * For 2024-2025 (extended ARP rules):
 * - Below 150% FPL: 0%
 * - 150% to 200% FPL: 0% to 2%
 * - 200% to 250% FPL: 2% to 4%
 * - 250% to 300% FPL: 4% to 6%
 * - 300% to 400% FPL: 6% to 8.5%
 * - Above 400% FPL: 8.5% (still eligible under ARP extension)
 */
export function getApplicablePercentage(incomeAsFplPercent: number): number {
  // Under ARP extension (2021-2025), everyone is eligible regardless of income
  // The applicable percentage is capped at 8.5%
  //
  // IMPORTANT: IRS rounds FPL percentage to whole number before lookup
  // This matches Drake and IRS Form 8962 worksheet calculations
  const roundedFplPercent = Math.round(incomeAsFplPercent);

  devLog(`[FORM 8962] Applicable % lookup: raw FPL%=${incomeAsFplPercent.toFixed(2)}, rounded=${roundedFplPercent}`);

  if (roundedFplPercent < 100) {
    // Below 100% FPL - may not be eligible (Medicaid eligible)
    // But if they have marketplace coverage, use 0%
    return 0;
  } else if (roundedFplPercent < 150) {
    return 0;
  } else if (roundedFplPercent < 200) {
    // Linear interpolation from 0% to 2%
    return ((roundedFplPercent - 150) / 50) * 0.02;
  } else if (roundedFplPercent < 250) {
    // Linear interpolation from 2% to 4%
    return 0.02 + ((roundedFplPercent - 200) / 50) * 0.02;
  } else if (roundedFplPercent < 300) {
    // Linear interpolation from 4% to 6%
    return 0.04 + ((roundedFplPercent - 250) / 50) * 0.02;
  } else if (roundedFplPercent < 400) {
    // Linear interpolation from 6% to 8.5%
    return 0.06 + ((roundedFplPercent - 300) / 100) * 0.025;
  } else {
    // Above 400% FPL - capped at 8.5%
    return 0.085;
  }
}

/**
 * Repayment limitation table for excess APTC
 * Based on household income as percentage of FPL
 *
 * For tax year 2024:
 * - Below 200% FPL: Single $375, Other $750
 * - 200% to below 300% FPL: Single $950, Other $1,900
 * - 300% to below 400% FPL: Single $1,575, Other $3,150
 * - 400% FPL and above: No limit (full repayment required)
 */
interface RepaymentLimits {
  single: number;
  other: number;
}

const REPAYMENT_LIMITS_2024: { maxFplPercent: number; limits: RepaymentLimits }[] = [
  { maxFplPercent: 200, limits: { single: 375, other: 750 } },
  { maxFplPercent: 300, limits: { single: 950, other: 1900 } },
  { maxFplPercent: 400, limits: { single: 1575, other: 3150 } },
];

const REPAYMENT_LIMITS_2025: { maxFplPercent: number; limits: RepaymentLimits }[] = [
  { maxFplPercent: 200, limits: { single: 400, other: 800 } },
  { maxFplPercent: 300, limits: { single: 1000, other: 2000 } },
  { maxFplPercent: 400, limits: { single: 1650, other: 3300 } },
];

const REPAYMENT_LIMITS_2026: { maxFplPercent: number; limits: RepaymentLimits }[] = [
  { maxFplPercent: 200, limits: { single: 425, other: 850 } },
  { maxFplPercent: 300, limits: { single: 1050, other: 2100 } },
  { maxFplPercent: 400, limits: { single: 1725, other: 3450 } },
];

function getRepaymentLimitsTable(year: number) {
  if (year === 2024) return REPAYMENT_LIMITS_2024;
  if (year === 2025) return REPAYMENT_LIMITS_2025;
  return REPAYMENT_LIMITS_2026;
}

/**
 * Get the repayment limitation amount
 */
export function getRepaymentLimitation(
  year: number,
  incomeAsFplPercent: number,
  filingStatus: string
): number | null {
  // No limit if above 400% FPL
  if (incomeAsFplPercent >= 400) {
    return null; // Full repayment required
  }

  const table = getRepaymentLimitsTable(year);
  const isSingle = filingStatus === 'single' || filingStatus === 'married_filing_separately';

  for (const bracket of table) {
    if (incomeAsFplPercent < bracket.maxFplPercent) {
      return isSingle ? bracket.limits.single : bracket.limits.other;
    }
  }

  return null; // Above 400%, no limit
}

/**
 * Form 8962 Input Data
 */
export interface Form8962Input {
  // Household information
  taxYear: number;
  householdIncome: number; // Modified AGI (Line 3)
  familySize: number; // Number of people in tax household
  filingStatus: string;

  // 1095-A data (can have multiple 1095-As)
  form1095AData: {
    // Annual totals (or sum of monthly values)
    annualPremium: number; // Column A total
    annualSlcsp: number; // Column B total (benchmark plan)
    annualAptc: number; // Column C total (advance payments received)
    // Optional: monthly breakdown for more accurate calculation
    monthlyPremiums?: number[]; // 12 values
    monthlySlcsp?: number[]; // 12 values
    monthlyAptc?: number[]; // 12 values
    coverageMonths?: number; // Number of months with coverage
  }[];
}

/**
 * Form 8962 Calculation Result
 */
export interface Form8962Result {
  // Input summary
  householdIncome: number;
  familySize: number;
  federalPovertyLevel: number;
  incomeAsFplPercent: number;

  // Applicable percentage
  applicablePercentage: number;
  annualContributionAmount: number; // Income × Applicable %
  monthlyContribution: number;

  // From 1095-A
  totalAnnualPremium: number;
  totalAnnualSlcsp: number;
  totalAnnualAptc: number;
  coverageMonths: number;

  // Premium Tax Credit calculation
  annualPtcAllowed: number; // Max PTC based on SLCSP and contribution

  // Final result
  netPtc: number; // Positive = credit due, Negative = repayment
  excessAptc: number; // Amount of excess APTC (before limitation)
  repaymentLimitation: number | null; // Repayment cap (null = no limit)
  excessAptcRepayment: number; // Actual repayment (after limitation) - goes to Schedule 2
  additionalPtc: number; // Additional credit due (goes to refundable credits)

  // Form 8962 line references
  line11_annualContribution: number;
  line24_totalPtcAllowed: number;
  line25_totalAptc: number;
  line26_netPtc: number; // If positive
  line27_excessAptc: number; // If line 25 > line 24
  line28_repaymentLimitation: number | null;
  line29_excessAptcRepayment: number; // Goes to Schedule 2, Line 2
}

/**
 * Calculate Form 8962 Premium Tax Credit
 */
export function calculateForm8962(input: Form8962Input): Form8962Result {
  const { taxYear, householdIncome, familySize, filingStatus, form1095AData } = input;

  // Step 1: Calculate Federal Poverty Level and income percentage
  const fpl = getFederalPovertyLevel(taxYear, familySize);
  const incomeAsFplPercent = (householdIncome / fpl) * 100;

  // Step 2: Get applicable percentage
  const applicablePercentage = getApplicablePercentage(incomeAsFplPercent);

  // Step 3: Calculate annual contribution amount
  const annualContributionAmount = householdIncome * applicablePercentage;
  const monthlyContribution = annualContributionAmount / 12;

  // Step 4: Sum 1095-A data
  let totalAnnualPremium = 0;
  let totalAnnualSlcsp = 0;
  let totalAnnualAptc = 0;
  let totalMonths = 0;

  for (const form of form1095AData) {
    totalAnnualPremium += form.annualPremium;
    totalAnnualSlcsp += form.annualSlcsp;
    totalAnnualAptc += form.annualAptc;
    totalMonths = Math.max(totalMonths, form.coverageMonths || 12);
  }

  // Step 5: Calculate annual PTC allowed
  // Per IRS Form 8962 instructions:
  // Column (d) = Monthly premium assistance = SLCSP - Monthly contribution (if negative, use 0)
  // Column (e) = Monthly PTC allowed = min(Monthly premium, Monthly premium assistance)
  let annualPtcAllowed = 0;

  // Monthly contribution is ALWAYS annual/12, regardless of coverage months
  const roundedMonthlyContribution = Math.round(monthlyContribution);

  if (form1095AData.length > 0 && form1095AData[0].monthlyPremiums?.length === 12) {
    // Monthly calculation with actual monthly data
    for (let month = 0; month < 12; month++) {
      let monthPremium = 0;
      let monthSlcsp = 0;

      for (const form of form1095AData) {
        monthPremium += form.monthlyPremiums?.[month] || 0;
        monthSlcsp += form.monthlySlcsp?.[month] || 0;
      }

      // Only calculate PTC for months with coverage (premium > 0)
      if (monthPremium > 0 && monthSlcsp > 0) {
        // Column (d): Premium assistance = SLCSP - contribution (min 0)
        const premiumAssistance = Math.max(0, monthSlcsp - roundedMonthlyContribution);
        // Column (e): PTC allowed = min(premium, premium assistance)
        const monthlyPtc = Math.min(monthPremium, premiumAssistance);
        annualPtcAllowed += monthlyPtc;
      }
    }
  } else {
    // Simplified calculation using annual totals
    // Derive average monthly values from coverage months
    const coverageMonths = totalMonths || 12;
    const avgMonthlyPremium = totalAnnualPremium / coverageMonths;
    const avgMonthlySlcsp = totalAnnualSlcsp / coverageMonths;

    // Calculate for each month of coverage
    for (let month = 0; month < coverageMonths; month++) {
      // Column (d): Premium assistance = SLCSP - contribution (min 0)
      const premiumAssistance = Math.max(0, avgMonthlySlcsp - roundedMonthlyContribution);
      // Column (e): PTC allowed = min(premium, premium assistance)
      const monthlyPtc = Math.min(avgMonthlyPremium, premiumAssistance);
      annualPtcAllowed += monthlyPtc;
    }
  }

  // Round to nearest dollar
  annualPtcAllowed = Math.round(annualPtcAllowed);

  // Step 6: Compare PTC allowed with APTC received
  const netPtc = annualPtcAllowed - totalAnnualAptc;

  let excessAptc = 0;
  let additionalPtc = 0;
  let excessAptcRepayment = 0;
  let repaymentLimitation: number | null = null;

  if (netPtc >= 0) {
    // Additional credit due (refund)
    additionalPtc = netPtc;
  } else {
    // Excess APTC - must repay
    excessAptc = Math.abs(netPtc);

    // Check repayment limitation
    repaymentLimitation = getRepaymentLimitation(taxYear, incomeAsFplPercent, filingStatus);

    if (repaymentLimitation !== null) {
      excessAptcRepayment = Math.min(excessAptc, repaymentLimitation);
    } else {
      // No limitation - full repayment
      excessAptcRepayment = excessAptc;
    }
  }

  return {
    // Input summary
    householdIncome,
    familySize,
    federalPovertyLevel: fpl,
    incomeAsFplPercent: Math.round(incomeAsFplPercent * 10) / 10,

    // Applicable percentage
    applicablePercentage: Math.round(applicablePercentage * 10000) / 100, // As percentage
    annualContributionAmount: Math.round(annualContributionAmount),
    monthlyContribution: Math.round(monthlyContribution * 100) / 100,

    // From 1095-A
    totalAnnualPremium,
    totalAnnualSlcsp,
    totalAnnualAptc,
    coverageMonths: totalMonths || 12,

    // PTC calculation
    annualPtcAllowed,

    // Final result
    netPtc,
    excessAptc,
    repaymentLimitation,
    excessAptcRepayment,
    additionalPtc,

    // Form 8962 lines
    line11_annualContribution: Math.round(annualContributionAmount),
    line24_totalPtcAllowed: annualPtcAllowed,
    line25_totalAptc: totalAnnualAptc,
    line26_netPtc: additionalPtc, // Only if positive
    line27_excessAptc: excessAptc, // Only if APTC > PTC allowed
    line28_repaymentLimitation: repaymentLimitation,
    line29_excessAptcRepayment: excessAptcRepayment, // Goes to Schedule 2
  };
}

/**
 * Check if a document is a 1095-A based on type fields or extracted data
 */
function is1095ADocument(doc: {
  drakeFormType?: string;
  documentType?: string;
  extractedAmounts?: {
    annualPremiumAmount?: number;
    annualSlcspPremium?: number;
    annualAdvancePtc?: number;
  };
}): boolean {
  // Check by form type (case-insensitive)
  const formType = (doc.drakeFormType || '').toLowerCase();
  const docType = (doc.documentType || '').toLowerCase();

  // Match various formats: 1095_a, 1095-a, 1095-A, form_1095_a, etc.
  if (formType === '1095_a' || formType === '1095-a' || formType === 'form_1095_a' || formType === 'form_1095-a') {
    return true;
  }

  if (docType === '1095_a' || docType === '1095-a' || docType === 'form_1095_a' || docType === 'form_1095-a' ||
      docType === '1095a' || docType.includes('1095-a') || docType.includes('1095_a') || docType.includes('1095')) {
    return true;
  }

  // Check by extracted data - if it has 1095-A specific fields, it's likely a 1095-A
  const amounts = doc.extractedAmounts;
  if (amounts && (amounts.annualPremiumAmount || amounts.annualSlcspPremium || amounts.annualAdvancePtc)) {
    return true;
  }

  return false;
}

/**
 * Calculate Form 8962 from document data and tax calculation result
 * This is a convenience function that extracts 1095-A data from documents
 */
export function calculateForm8962FromDocuments(
  taxYear: number,
  householdIncome: number, // Use AGI from tax calculation
  familySize: number,
  filingStatus: string,
  documents: { extractedAmounts?: {
    annualPremiumAmount?: number;
    annualSlcspPremium?: number;
    annualAdvancePtc?: number;
    monthlyPremiums?: number[];
    monthlySlcsp?: number[];
    monthlyAptc?: number[];
    coverageMonths?: number;
  }; drakeFormType?: string; documentType?: string }[]
): Form8962Result | null {
  // Filter to 1095-A documents using robust detection
  const form1095ADocs = documents.filter(doc => is1095ADocument(doc) && doc.extractedAmounts);

  devLog('[FORM 8962] Checking documents for 1095-A...');
  devLog('[FORM 8962] Total documents:', documents.length);
  devLog('[FORM 8962] Found 1095-A documents:', form1095ADocs.length);

  if (form1095ADocs.length > 0) {
    form1095ADocs.forEach((doc, i) => {
      devLog(`[FORM 8962] 1095-A #${i + 1}:`, {
        drakeFormType: (doc as any).drakeFormType,
        documentType: (doc as any).documentType,
        extractedAmounts: doc.extractedAmounts
      });
    });
  }

  if (form1095ADocs.length === 0) {
    devLog('[FORM 8962] No 1095-A documents found with extracted amounts');
    return null;
  }

  // Extract 1095-A data
  const form1095AData = form1095ADocs.map(doc => ({
    annualPremium: doc.extractedAmounts?.annualPremiumAmount || 0,
    annualSlcsp: doc.extractedAmounts?.annualSlcspPremium || 0,
    annualAptc: doc.extractedAmounts?.annualAdvancePtc || 0,
    monthlyPremiums: doc.extractedAmounts?.monthlyPremiums,
    monthlySlcsp: doc.extractedAmounts?.monthlySlcsp,
    monthlyAptc: doc.extractedAmounts?.monthlyAptc,
    coverageMonths: doc.extractedAmounts?.coverageMonths,
  }));

  devLog('[FORM 8962] Extracted 1095-A data:', form1095AData);

  return calculateForm8962({
    taxYear,
    householdIncome,
    familySize,
    filingStatus,
    form1095AData,
  });
}
