/**
 * Strategy Recommendation Service
 *
 * Rule-based recommendation engine that analyzes a client's tax profile,
 * uploaded documents, and strategy checklist to surface actionable
 * opportunities for deductions, credits, and tax optimization.
 */

import { devLog } from '../../../services/utils';
import type { TaxPortal, DrakeTaxDocument, FilingStatus } from '../types/drakeTypes';
import type { TaxStrategyData, ChecklistItem } from '../types/taxStrategyTypes';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RecommendationCategory =
  | 'missed_deductions'
  | 'credit_opportunities'
  | 'filing_status'
  | 'retirement'
  | 'estimated_tax'
  | 'health_insurance'
  | 'business_deductions'
  | 'document_gaps';

export type RecommendationPriority = 'high' | 'medium' | 'low';

export interface Recommendation {
  id: string;
  category: RecommendationCategory;
  title: string;
  description: string;
  estimatedSavings?: number;
  priority: RecommendationPriority;
  actionable: boolean;
  /** Describes what the preparer should do to act on this recommendation */
  action?: string;
}

// Category labels for display
export const RECOMMENDATION_CATEGORY_LABELS: Record<RecommendationCategory, string> = {
  missed_deductions: 'Missed Deductions',
  credit_opportunities: 'Credit Opportunities',
  filing_status: 'Filing Status',
  retirement: 'Retirement',
  estimated_tax: 'Estimated Tax',
  health_insurance: 'Health Insurance',
  business_deductions: 'Business Deductions',
  document_gaps: 'Document Gaps',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uid(): string {
  return Math.random().toString(36).substring(2, 12);
}

function isChecked(item: ChecklistItem | undefined): boolean {
  return !!item?.checked;
}

function hasAmount(item: ChecklistItem | undefined): boolean {
  return !!item?.checked && (item.amount ?? 0) > 0;
}

function getAGI(documents: DrakeTaxDocument[]): number {
  let agi = 0;
  for (const doc of documents) {
    if (doc.drakeFormType === 'w2') agi += doc.extractedAmounts?.wages ?? 0;
    else if (doc.drakeFormType === '1099_nec') agi += doc.extractedAmounts?.nonEmployeeCompensation ?? 0;
    else if (doc.drakeFormType === '1099_int') agi += doc.extractedAmounts?.interestIncome ?? 0;
    else if (doc.drakeFormType === '1099_div') agi += doc.extractedAmounts?.ordinaryDividends ?? 0;
    else if (doc.drakeFormType === '1099_misc') {
      agi += doc.extractedAmounts?.rents ?? 0;
      agi += doc.extractedAmounts?.royalties ?? 0;
      agi += doc.extractedAmounts?.otherIncome ?? 0;
    }
  }
  return agi;
}

function getEarnedIncome(documents: DrakeTaxDocument[]): number {
  let earned = 0;
  for (const doc of documents) {
    if (doc.drakeFormType === 'w2') earned += doc.extractedAmounts?.wages ?? 0;
    else if (doc.drakeFormType === '1099_nec') earned += doc.extractedAmounts?.nonEmployeeCompensation ?? 0;
  }
  return earned;
}

function getSEIncome(documents: DrakeTaxDocument[]): number {
  let se = 0;
  for (const doc of documents) {
    if (doc.drakeFormType === '1099_nec') se += doc.extractedAmounts?.nonEmployeeCompensation ?? 0;
    if (doc.drakeFormType === '1099_misc') se += doc.extractedAmounts?.otherIncome ?? 0;
  }
  return se;
}

function hasDocType(documents: DrakeTaxDocument[], type: string): boolean {
  return documents.some((d) => d.drakeFormType === type);
}

function getQualifyingChildrenCount(client: TaxPortal): number {
  if (!client.dependents) return 0;
  const taxYear = client.taxYear || 2024;
  const endOfTaxYear = new Date(taxYear, 11, 31);
  const qualifyingRelationships = ['son', 'daughter', 'stepson', 'stepdaughter', 'foster_child', 'grandchild'];
  let count = 0;
  for (const dep of client.dependents) {
    const hasRel = qualifyingRelationships.includes(dep.relationship);
    let isUnder17 = true;
    if (dep.dateOfBirth) {
      const dob = new Date(dep.dateOfBirth);
      const age = endOfTaxYear.getFullYear() - dob.getFullYear() -
        (endOfTaxYear < new Date(endOfTaxYear.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
      isUnder17 = age < 17;
    }
    if (hasRel && isUnder17) count++;
  }
  return count;
}

function getStdDeduction(filingStatus: FilingStatus, taxYear: number): number {
  if (taxYear >= 2025) {
    switch (filingStatus) {
      case 'married_filing_jointly':
      case 'qualifying_widow':
        return 30_000;
      case 'head_of_household':
        return 22_500;
      default:
        return 15_000;
    }
  }
  // 2024
  switch (filingStatus) {
    case 'married_filing_jointly':
    case 'qualifying_widow':
      return 29_200;
    case 'head_of_household':
      return 21_900;
    default:
      return 14_600;
  }
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export function generateRecommendations(
  client: TaxPortal,
  documents: DrakeTaxDocument[],
  strategyData: TaxStrategyData
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  const filingStatus: FilingStatus = client.filingStatus || 'single';
  const taxYear = client.taxYear || 2024;
  const agi = getAGI(documents);
  const earnedIncome = getEarnedIncome(documents);
  const seIncome = getSEIncome(documents);
  const qualifyingChildren = getQualifyingChildrenCount(client);
  const dependentCount = client.dependents?.length || 0;
  const hasMortgage = hasDocType(documents, '1098');
  const hasEducation = hasDocType(documents, '1098_t');
  const has1099NEC = hasDocType(documents, '1099_nec');
  const has1095A = hasDocType(documents, '1095_a');
  const hasW2 = hasDocType(documents, 'w2');
  const stdDeduction = getStdDeduction(filingStatus, taxYear);

  devLog('[RECOMMENDATIONS] === Generating recommendations ===');
  devLog('[RECOMMENDATIONS] AGI:', agi, '| SE Income:', seIncome, '| Filing:', filingStatus);

  // -----------------------------------------------------------------------
  // 1. MISSED DEDUCTIONS
  // -----------------------------------------------------------------------

  // Mortgage + no property tax
  if (hasMortgage && !isChecked(strategyData.deductions.taxesPaid.realEstateTax)) {
    recommendations.push({
      id: uid(),
      category: 'missed_deductions',
      title: 'Property Tax Deduction',
      description:
        'A mortgage document (1098) was uploaded but property taxes are not checked. Homeowners almost always pay property taxes, which are deductible under Schedule A.',
      estimatedSavings: undefined,
      priority: 'high',
      actionable: true,
      action: 'Check "Real estate tax" in Deductions > Taxes Paid and enter the amount from the property tax bill or 1098 Box 10.',
    });
  }

  // Mortgage interest present but student loan interest not checked
  if (hasAmount(strategyData.deductions.interest.mortgageInterest) && !isChecked(strategyData.deductions.interest.studentLoanInterest)) {
    // Only suggest if income suggests a younger professional
    if (agi < 90_000) {
      recommendations.push({
        id: uid(),
        category: 'missed_deductions',
        title: 'Student Loan Interest Deduction',
        description:
          'Client may have student loan interest payments (up to $2,500 above-the-line deduction). This does not require itemizing.',
        estimatedSavings: 550,
        priority: 'medium',
        actionable: true,
        action: 'Ask client if they paid student loan interest. If so, request Form 1098-E and enter the amount.',
      });
    }
  }

  // Medical expenses not checked (suggest if moderate income)
  if (!isChecked(strategyData.deductions.medical.medicalExpenses) &&
      !isChecked(strategyData.deductions.medical.healthInsurancePremiums) && agi < 75_000) {
    recommendations.push({
      id: uid(),
      category: 'missed_deductions',
      title: 'Medical & Dental Expenses',
      description:
        'No medical expenses are entered. Medical expenses exceeding 7.5% of AGI are deductible. ' +
        `At AGI of $${agi.toLocaleString()}, the threshold is $${Math.round(agi * 0.075).toLocaleString()}.`,
      priority: 'low',
      actionable: true,
      action: 'Ask client about unreimbursed medical, dental, vision, and prescription costs for the year.',
    });
  }

  // Charitable donations not checked
  if (!isChecked(strategyData.deductions.donations.cashDonations) &&
      !isChecked(strategyData.deductions.donations.nonCashDonations)) {
    recommendations.push({
      id: uid(),
      category: 'missed_deductions',
      title: 'Charitable Contributions',
      description:
        'No charitable donations are recorded. Cash and non-cash donations to qualified organizations are deductible if itemizing.',
      priority: 'low',
      actionable: true,
      action: 'Ask client about cash and non-cash charitable contributions. Include receipts or acknowledgment letters.',
    });
  }

  // Check if itemizing would beat standard deduction
  const totalItemized = sumItemizedDeductions(strategyData);
  if (totalItemized > 0 && totalItemized < stdDeduction) {
    recommendations.push({
      id: uid(),
      category: 'missed_deductions',
      title: 'Standard Deduction May Be Better',
      description:
        `Current itemized deductions total $${totalItemized.toLocaleString()}, which is less than the standard deduction of ` +
        `$${stdDeduction.toLocaleString()} for ${filingStatus.replace(/_/g, ' ')}. Unless more deductions are identified, the standard deduction is more beneficial.`,
      priority: 'medium',
      actionable: false,
    });
  } else if (totalItemized > stdDeduction) {
    recommendations.push({
      id: uid(),
      category: 'missed_deductions',
      title: 'Itemized Deductions Exceed Standard',
      description:
        `Itemized deductions total $${totalItemized.toLocaleString()}, exceeding the standard deduction of ` +
        `$${stdDeduction.toLocaleString()}. Continue collecting receipts for all deductible categories.`,
      estimatedSavings: Math.round((totalItemized - stdDeduction) * 0.22),
      priority: 'high',
      actionable: false,
    });
  }

  // HSA contributions not checked and has W-2 income
  if (hasW2 && !isChecked(strategyData.otherIncome.adjustments.hsaContributions)) {
    recommendations.push({
      id: uid(),
      category: 'missed_deductions',
      title: 'HSA Contributions',
      description:
        'Health Savings Account contributions are an above-the-line deduction. ' +
        `${taxYear === 2024 ? 'For 2024, limits are $4,150 (self) / $8,300 (family)' : 'For 2025, limits are $4,300 (self) / $8,550 (family)'}. ` +
        'Ask if client has an HSA-eligible high-deductible health plan.',
      estimatedSavings: filingStatus === 'married_filing_jointly' ? 1_800 : 900,
      priority: 'medium',
      actionable: true,
      action: 'Ask client about HSA contributions. Check W-2 Box 12 Code W for employer contributions.',
    });
  }

  // Educator expenses for teachers
  if (hasW2 && !isChecked(strategyData.otherIncome.adjustments.educatorExpenses) && agi < 100_000) {
    recommendations.push({
      id: uid(),
      category: 'missed_deductions',
      title: 'Educator Expenses',
      description:
        'Eligible educators (K-12 teachers) can deduct up to $300 ($600 MFJ if both are educators) for classroom supplies as an above-the-line deduction.',
      estimatedSavings: 66,
      priority: 'low',
      actionable: true,
      action: 'Ask client if they are a K-12 educator who purchased classroom supplies out of pocket.',
    });
  }

  // -----------------------------------------------------------------------
  // 2. CREDIT OPPORTUNITIES
  // -----------------------------------------------------------------------

  // Child Tax Credit
  if (qualifyingChildren > 0 && !isChecked(strategyData.taxCredits.children.childTaxCredit)) {
    recommendations.push({
      id: uid(),
      category: 'credit_opportunities',
      title: 'Child Tax Credit',
      description:
        `${qualifyingChildren} qualifying child${qualifyingChildren !== 1 ? 'ren' : ''} detected. ` +
        `Potential credit: $${(qualifyingChildren * 2_000).toLocaleString()}. ` +
        'Use the "Calculate Credits" button on the Credits tab to auto-calculate.',
      estimatedSavings: qualifyingChildren * 2_000,
      priority: 'high',
      actionable: true,
      action: 'Navigate to Credits tab and click "Calculate Credits" to compute CTC and ACTC.',
    });
  }

  // EITC opportunity
  const eicLimits: Record<number, { single: number; mfj: number }> = {
    0: { single: 18_591, mfj: 25_511 },
    1: { single: 49_084, mfj: 56_004 },
    2: { single: 55_768, mfj: 62_688 },
    3: { single: 59_899, mfj: 66_819 },
  };
  const eicKey = Math.min(qualifyingChildren, 3);
  const eicLimit = filingStatus === 'married_filing_jointly' ? eicLimits[eicKey].mfj : eicLimits[eicKey].single;
  if (earnedIncome > 0 && agi <= eicLimit && !isChecked(strategyData.taxCredits.eitc.earnedIncomeCredit)) {
    recommendations.push({
      id: uid(),
      category: 'credit_opportunities',
      title: 'Earned Income Credit (EITC)',
      description:
        `Client's earned income ($${earnedIncome.toLocaleString()}) and AGI ($${agi.toLocaleString()}) are within the EIC limit ` +
        `of $${eicLimit.toLocaleString()} for ${qualifyingChildren} qualifying child${qualifyingChildren !== 1 ? 'ren' : ''}.`,
      priority: 'high',
      actionable: true,
      action: 'Navigate to Credits tab and click "Calculate Credits" to auto-compute EIC.',
    });
  }

  // Education credits
  if (hasEducation && !isChecked(strategyData.taxCredits.education.americanOpportunity) &&
      !isChecked(strategyData.taxCredits.education.lifetimeLearning)) {
    recommendations.push({
      id: uid(),
      category: 'credit_opportunities',
      title: 'Education Credits',
      description:
        'A 1098-T (tuition statement) was uploaded. American Opportunity Credit is worth up to $2,500 per student (first 4 years). ' +
        'Lifetime Learning Credit is up to $2,000 per return.',
      estimatedSavings: 2_500,
      priority: 'high',
      actionable: true,
      action: 'Check "American Opportunity" or "Lifetime Learning" in Credits > Education and enter qualified expenses net of scholarships.',
    });
  }

  // Child care / dependent care credit
  if (dependentCount > 0 && qualifyingChildren > 0 && !isChecked(strategyData.taxCredits.children.childCareExpenses) &&
      !isChecked(strategyData.taxCredits.children.dependentCareCredit)) {
    recommendations.push({
      id: uid(),
      category: 'credit_opportunities',
      title: 'Child & Dependent Care Credit',
      description:
        `Client has ${qualifyingChildren} qualifying child${qualifyingChildren !== 1 ? 'ren' : ''}. ` +
        'If child care expenses were paid to allow the taxpayer (and spouse) to work, the Dependent Care Credit may apply. ' +
        'Up to $3,000 for one child or $6,000 for two or more.',
      priority: 'medium',
      actionable: true,
      action: 'Ask client about daycare, babysitter, or after-school care expenses. Collect provider EIN/SSN.',
    });
  }

  // Retirement saver's credit
  if (earnedIncome > 0 && agi < 38_250 && !isChecked(strategyData.taxCredits.other.retirementSaversCredit)) {
    recommendations.push({
      id: uid(),
      category: 'credit_opportunities',
      title: 'Retirement Saver\'s Credit',
      description:
        `AGI of $${agi.toLocaleString()} may qualify for the Saver's Credit (up to $1,000/$2,000 MFJ) ` +
        'on IRA or 401(k) contributions. Check W-2 Box 12 for 401(k) deferrals.',
      estimatedSavings: filingStatus === 'married_filing_jointly' ? 2_000 : 1_000,
      priority: 'medium',
      actionable: true,
      action: 'Verify retirement plan contributions from W-2 Box 12 or IRA contribution records.',
    });
  }

  // Energy credits
  if (!isChecked(strategyData.taxCredits.energy.electricVehicle) &&
      !isChecked(strategyData.taxCredits.energy.solarPanels) &&
      !isChecked(strategyData.taxCredits.energy.residentialCleanEnergy) &&
      !isChecked(strategyData.taxCredits.energy.energyEfficientHome) && hasMortgage) {
    recommendations.push({
      id: uid(),
      category: 'credit_opportunities',
      title: 'Energy Tax Credits',
      description:
        'Homeowner detected. Ask about energy-efficient improvements: solar panels (30% credit), heat pumps, insulation, windows, or EV purchases (up to $7,500).',
      priority: 'low',
      actionable: true,
      action: 'Ask client about energy-efficient home improvements or electric vehicle purchases during the tax year.',
    });
  }

  // -----------------------------------------------------------------------
  // 3. FILING STATUS OPTIMIZATION
  // -----------------------------------------------------------------------

  if (filingStatus === 'single' && dependentCount > 0 && qualifyingChildren > 0) {
    recommendations.push({
      id: uid(),
      category: 'filing_status',
      title: 'Consider Head of Household',
      description:
        'Client is filing as Single but has qualifying dependents. Filing as Head of Household provides a ' +
        `higher standard deduction ($${getStdDeduction('head_of_household', taxYear).toLocaleString()} vs $${getStdDeduction('single', taxYear).toLocaleString()}) ` +
        'and more favorable tax brackets. Client must have paid more than half the cost of keeping up the home.',
      estimatedSavings: Math.round((getStdDeduction('head_of_household', taxYear) - getStdDeduction('single', taxYear)) * 0.22),
      priority: 'high',
      actionable: true,
      action: 'Change filing status to Head of Household if client qualifies (paid >50% of household costs, qualifying person lived with them >6 months).',
    });
  }

  if (filingStatus === 'married_filing_separately') {
    const mfjStd = getStdDeduction('married_filing_jointly', taxYear);
    const mfsStd = getStdDeduction('married_filing_separately', taxYear);
    recommendations.push({
      id: uid(),
      category: 'filing_status',
      title: 'Compare MFJ vs MFS',
      description:
        `Filing as Married Filing Separately. In most cases, Married Filing Jointly results in lower tax. ` +
        `Standard deduction MFJ: $${mfjStd.toLocaleString()} vs MFS: $${mfsStd.toLocaleString()}. ` +
        'MFS also disqualifies EITC and limits several credits. Run both scenarios to compare.',
      priority: 'high',
      actionable: true,
      action: 'Prepare the return both ways (MFJ and MFS) and compare total tax liability to determine the best option.',
    });
  }

  // -----------------------------------------------------------------------
  // 4. RETIREMENT CONTRIBUTIONS
  // -----------------------------------------------------------------------

  if (!isChecked(strategyData.otherIncome.adjustments.iraContributions) &&
      !isChecked(strategyData.otherIncome.adjustments.retirementContributions) && earnedIncome > 15_000) {
    const iraLimit = taxYear >= 2025 ? 7_000 : 7_000; // IRA limit
    recommendations.push({
      id: uid(),
      category: 'retirement',
      title: 'IRA Contribution Deduction',
      description:
        `Client has earned income of $${earnedIncome.toLocaleString()}. Traditional IRA contributions (up to $${iraLimit.toLocaleString()}, ` +
        `$${iraLimit + 1_000} if 50+) are tax-deductible if not covered by employer plan, or if income is below phase-out thresholds.`,
      estimatedSavings: Math.round(iraLimit * 0.22),
      priority: 'medium',
      actionable: true,
      action: 'Ask if client made IRA contributions. If not yet filed, contributions can be made until April 15 of the following year.',
    });
  }

  // SE retirement plans (SEP-IRA, Solo 401k)
  if (seIncome > 20_000 && !isChecked(strategyData.otherIncome.adjustments.retirementContributions)) {
    const sepLimit = Math.min(Math.round(seIncome * 0.25), 69_000);
    recommendations.push({
      id: uid(),
      category: 'retirement',
      title: 'SEP-IRA for Self-Employed',
      description:
        `Self-employment income of $${seIncome.toLocaleString()} detected. A SEP-IRA allows deductible contributions of up to 25% of net SE income ` +
        `(up to $${sepLimit.toLocaleString()}). This reduces both income tax and can be set up and funded before the filing deadline.`,
      estimatedSavings: Math.round(Math.min(seIncome * 0.25, 69_000) * 0.22),
      priority: 'high',
      actionable: true,
      action: 'Discuss SEP-IRA or Solo 401(k) options. Contribution can be made up to the filing deadline (including extensions).',
    });
  }

  // -----------------------------------------------------------------------
  // 5. ESTIMATED TAX PAYMENTS
  // -----------------------------------------------------------------------

  if (seIncome > 5_000 && !isChecked(strategyData.otherIncome.adjustments.selfEmploymentTax)) {
    const seTax = Math.round(seIncome * 0.9235 * 0.153);
    recommendations.push({
      id: uid(),
      category: 'estimated_tax',
      title: 'Self-Employment Tax Reminder',
      description:
        `Self-employment income of $${seIncome.toLocaleString()} is subject to SE tax (~15.3% on 92.35% of net income). ` +
        `Estimated SE tax: $${seTax.toLocaleString()}. Half is deductible as an adjustment.`,
      estimatedSavings: Math.round(seTax / 2 * 0.22),
      priority: 'high',
      actionable: true,
      action: 'Ensure SE tax is calculated. Check self-employment tax in Other Income > Adjustments. Advise client on quarterly estimated payments for next year.',
    });
  }

  if (seIncome > 10_000 || (agi > 100_000 && !hasW2)) {
    recommendations.push({
      id: uid(),
      category: 'estimated_tax',
      title: 'Quarterly Estimated Tax Payments',
      description:
        'Client may owe underpayment penalties if not making quarterly estimated tax payments. ' +
        'Safe harbor: pay 100% of prior year tax (110% if AGI > $150k) or 90% of current year tax.',
      priority: 'medium',
      actionable: true,
      action: 'Review whether client made estimated payments. If not, calculate Q1-Q4 vouchers for the next tax year (Form 1040-ES).',
    });
  }

  // -----------------------------------------------------------------------
  // 6. HEALTH INSURANCE
  // -----------------------------------------------------------------------

  if (has1095A && !strategyData.otherIncome.healthInsuranceMarketplace?.hasMarketplaceCoverage) {
    recommendations.push({
      id: uid(),
      category: 'health_insurance',
      title: 'Marketplace Coverage (1095-A)',
      description:
        'A 1095-A document was uploaded but marketplace coverage data is not populated. ' +
        'This is required to calculate the Premium Tax Credit (Form 8962) and reconcile advance payments.',
      priority: 'high',
      actionable: true,
      action: 'Run Auto-fill to populate 1095-A data, or manually enter monthly premium, SLCSP, and APTC amounts in Other Income.',
    });
  }

  // SE health insurance deduction
  if (seIncome > 5_000 && !isChecked(strategyData.otherIncome.adjustments.healthInsuranceDeduction)) {
    recommendations.push({
      id: uid(),
      category: 'health_insurance',
      title: 'Self-Employed Health Insurance Deduction',
      description:
        'Self-employed taxpayers can deduct health insurance premiums (medical, dental, vision) for themselves, ' +
        'spouse, and dependents as an above-the-line deduction. This is limited to net SE income.',
      priority: 'medium',
      actionable: true,
      action: 'Ask client about health insurance premiums paid personally (not through an employer). Enter amount in Other Income > Adjustments.',
    });
  }

  // No health insurance mention at all
  if (!has1095A && !isChecked(strategyData.deductions.medical.healthInsurancePremiums) &&
      !isChecked(strategyData.otherIncome.adjustments.healthInsuranceDeduction) && agi < 60_000) {
    const fpl400 = filingStatus === 'married_filing_jointly' ? 80_640 : 60_480;
    if (agi < fpl400) {
      recommendations.push({
        id: uid(),
        category: 'health_insurance',
        title: 'ACA Premium Tax Credit Eligibility',
        description:
          `Client's AGI of $${agi.toLocaleString()} may qualify for the ACA Premium Tax Credit if they purchased marketplace insurance. ` +
          'Ask if client has marketplace coverage and request Form 1095-A.',
        priority: 'medium',
        actionable: true,
        action: 'Ask client if they have health insurance through the ACA Marketplace. If yes, request Form 1095-A.',
      });
    }
  }

  // -----------------------------------------------------------------------
  // 7. BUSINESS DEDUCTIONS
  // -----------------------------------------------------------------------

  if (has1099NEC || seIncome > 0) {
    // Home office
    if (!isChecked(strategyData.businessExpenses.homeOffice.directExpenses.officeEquipment) &&
        strategyData.businessExpenses.homeOffice.calculationMethod === 'simplified' &&
        !strategyData.businessExpenses.homeOffice.simplifiedSquareFootage) {
      recommendations.push({
        id: uid(),
        category: 'business_deductions',
        title: 'Home Office Deduction',
        description:
          'Self-employment income detected but no home office deduction is set up. ' +
          'If client uses part of their home exclusively and regularly for business, they can deduct up to $1,500 (simplified method: $5/sq ft, max 300 sq ft).',
        estimatedSavings: 1_500,
        priority: 'medium',
        actionable: true,
        action: 'Ask client if they have a dedicated home office space. Enter square footage in Business > Home Office.',
      });
    }

    // Vehicle / mileage
    if (strategyData.businessExpenses.vehicles.length === 0) {
      const mileageRate = taxYear >= 2025 ? 0.70 : 0.67;
      recommendations.push({
        id: uid(),
        category: 'business_deductions',
        title: 'Business Mileage Deduction',
        description:
          `Self-employment income detected but no business vehicle is recorded. Standard mileage rate for ${taxYear} is $${mileageRate}/mile. ` +
          'If client drives for business, this can be a significant deduction.',
        priority: 'medium',
        actionable: true,
        action: 'Ask client about business miles driven. Add a vehicle in Business > Vehicles and enter mileage details.',
      });
    }

    // Phone / internet
    if (!isChecked(strategyData.businessExpenses.office.cellPhone) &&
        !isChecked(strategyData.businessExpenses.office.internet)) {
      recommendations.push({
        id: uid(),
        category: 'business_deductions',
        title: 'Phone & Internet Expenses',
        description:
          'Self-employed taxpayers can deduct the business-use percentage of cell phone and internet expenses.',
        priority: 'low',
        actionable: true,
        action: 'Ask client about business use of cell phone and internet. Enter business-use percentage amounts in Business > Office.',
      });
    }

    // Professional development
    if (!isChecked(strategyData.businessExpenses.education.coursesAndSeminars) &&
        !isChecked(strategyData.businessExpenses.education.books) &&
        !isChecked(strategyData.businessExpenses.education.certifications)) {
      recommendations.push({
        id: uid(),
        category: 'business_deductions',
        title: 'Professional Development Expenses',
        description:
          'Business-related education, courses, certifications, books, and conference fees are deductible against self-employment income.',
        priority: 'low',
        actionable: true,
        action: 'Ask client about professional development expenses, certifications, and industry conference costs.',
      });
    }

    // QBI deduction
    if (!isChecked(strategyData.otherIncome.adjustments.qbid) && seIncome > 5_000) {
      const qbiEstimate = Math.round(seIncome * 0.20);
      recommendations.push({
        id: uid(),
        category: 'business_deductions',
        title: 'Qualified Business Income Deduction (QBI)',
        description:
          `Self-employment income may qualify for the 20% QBI deduction (Section 199A). ` +
          `Estimated QBI deduction: $${qbiEstimate.toLocaleString()}. This is an above-the-line deduction and does not require itemizing.`,
        estimatedSavings: Math.round(qbiEstimate * 0.22),
        priority: 'high',
        actionable: true,
        action: 'Check "QBI Deduction" in Other Income > Adjustments. The deduction is automatically calculated based on net business income.',
      });
    }
  }

  // -----------------------------------------------------------------------
  // 8. DOCUMENT GAPS
  // -----------------------------------------------------------------------

  // No income documents at all
  if (documents.length === 0) {
    recommendations.push({
      id: uid(),
      category: 'document_gaps',
      title: 'No Documents Uploaded',
      description:
        'No tax documents have been uploaded for this client. Upload W-2s, 1099s, and other income documents to enable accurate tax preparation.',
      priority: 'high',
      actionable: true,
      action: 'Request all income documents from the client: W-2, 1099-NEC, 1099-INT, 1099-DIV, 1098, etc.',
    });
  }

  // Has SE income but no receipts
  if (seIncome > 10_000 && !hasDocType(documents, 'receipt')) {
    recommendations.push({
      id: uid(),
      category: 'document_gaps',
      title: 'Business Expense Receipts',
      description:
        `Self-employment income of $${seIncome.toLocaleString()} detected but no receipts uploaded. ` +
        'Business expense documentation reduces taxable SE income and SE tax.',
      priority: 'medium',
      actionable: true,
      action: 'Request business expense receipts, bank statements, or accounting records from the client.',
    });
  }

  // Has dependents but no child care records
  if (qualifyingChildren > 0 && !hasDocType(documents, 'receipt') &&
      !isChecked(strategyData.taxCredits.children.childCareExpenses)) {
    recommendations.push({
      id: uid(),
      category: 'document_gaps',
      title: 'Child Care Documentation',
      description:
        'Client has qualifying children but no child care expense documentation. If child care was paid, gather provider statements for the dependent care credit.',
      priority: 'low',
      actionable: true,
      action: 'Ask client for daycare/child care provider statements, including provider name, address, EIN/SSN, and amounts paid.',
    });
  }

  // Has mortgage but no homeowners insurance or property tax docs
  if (hasMortgage && !isChecked(strategyData.deductions.taxesPaid.personalPropertyTax)) {
    recommendations.push({
      id: uid(),
      category: 'document_gaps',
      title: 'Personal Property Tax Records',
      description:
        'Homeowner detected via 1098 but no personal property tax is recorded. Some states charge annual personal property tax on vehicles, boats, etc.',
      priority: 'low',
      actionable: true,
      action: 'Ask client if they paid personal property tax on vehicles or other personal property. This is deductible under SALT (subject to $10,000 cap).',
    });
  }

  // Missing 1099-R if client is retired
  if (!hasDocType(documents, '1099_r') && isChecked(strategyData.otherIncome.additionalIncome.pension)) {
    recommendations.push({
      id: uid(),
      category: 'document_gaps',
      title: 'Missing 1099-R',
      description:
        'Pension income is indicated but no 1099-R document is uploaded. This form is required to report retirement distributions and withholding.',
      priority: 'high',
      actionable: true,
      action: 'Request Form 1099-R from the client\'s retirement plan administrator.',
    });
  }

  // -----------------------------------------------------------------------
  // Sort by priority then estimated savings
  // -----------------------------------------------------------------------

  const priorityOrder: Record<RecommendationPriority, number> = { high: 0, medium: 1, low: 2 };
  recommendations.sort((a, b) => {
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (pDiff !== 0) return pDiff;
    return (b.estimatedSavings ?? 0) - (a.estimatedSavings ?? 0);
  });

  devLog('[RECOMMENDATIONS] Generated', recommendations.length, 'recommendations');
  return recommendations;
}

// ---------------------------------------------------------------------------
// Helper: Sum all itemized deduction amounts
// ---------------------------------------------------------------------------

function sumItemizedDeductions(data: TaxStrategyData): number {
  let total = 0;

  const addSection = (section: Record<string, ChecklistItem>) => {
    for (const key of Object.keys(section)) {
      const item = section[key];
      if (item?.checked && item.amount) {
        total += item.amount;
      }
    }
  };

  addSection(data.deductions.medical as unknown as Record<string, ChecklistItem>);
  addSection(data.deductions.taxesPaid as unknown as Record<string, ChecklistItem>);
  addSection(data.deductions.interest as unknown as Record<string, ChecklistItem>);
  addSection(data.deductions.donations as unknown as Record<string, ChecklistItem>);
  addSection(data.deductions.casualty as unknown as Record<string, ChecklistItem>);
  addSection(data.deductions.other as unknown as Record<string, ChecklistItem>);

  return total;
}
