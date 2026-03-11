import { devLog } from '../../../services/utils';
import {
  FilingStatus,
  TaxFormData,
  TaxCalculationResult,
  W2Form,
  Form1099,
  WithholdingRecommendation,
  BusinessExpense,
  Form1098T,
  Form1098
} from '../types/taxTypes';

// Tax Year Type
type TaxYear = 2024 | 2025;

// 2024 Federal Tax Brackets
const TAX_BRACKETS_2024 = {
  single: [
    { min: 0, max: 11600, rate: 0.10 },
    { min: 11600, max: 47150, rate: 0.12 },
    { min: 47150, max: 100525, rate: 0.22 },
    { min: 100525, max: 191950, rate: 0.24 },
    { min: 191950, max: 243725, rate: 0.32 },
    { min: 243725, max: 609350, rate: 0.35 },
    { min: 609350, max: Infinity, rate: 0.37 }
  ],
  married_joint: [
    { min: 0, max: 23200, rate: 0.10 },
    { min: 23200, max: 94300, rate: 0.12 },
    { min: 94300, max: 201050, rate: 0.22 },
    { min: 201050, max: 383900, rate: 0.24 },
    { min: 383900, max: 487450, rate: 0.32 },
    { min: 487450, max: 731200, rate: 0.35 },
    { min: 731200, max: Infinity, rate: 0.37 }
  ],
  married_separate: [
    { min: 0, max: 11600, rate: 0.10 },
    { min: 11600, max: 47150, rate: 0.12 },
    { min: 47150, max: 100525, rate: 0.22 },
    { min: 100525, max: 191950, rate: 0.24 },
    { min: 191950, max: 243725, rate: 0.32 },
    { min: 243725, max: 365600, rate: 0.35 },
    { min: 365600, max: Infinity, rate: 0.37 }
  ],
  head_of_household: [
    { min: 0, max: 16550, rate: 0.10 },
    { min: 16550, max: 63100, rate: 0.12 },
    { min: 63100, max: 100500, rate: 0.22 },
    { min: 100500, max: 191950, rate: 0.24 },
    { min: 191950, max: 243700, rate: 0.32 },
    { min: 243700, max: 609350, rate: 0.35 },
    { min: 609350, max: Infinity, rate: 0.37 }
  ]
};

// 2025 Federal Tax Brackets (IRS Rev. Proc. 2024-40)
const TAX_BRACKETS_2025 = {
  single: [
    { min: 0, max: 11925, rate: 0.10 },
    { min: 11925, max: 48475, rate: 0.12 },
    { min: 48475, max: 103350, rate: 0.22 },
    { min: 103350, max: 197300, rate: 0.24 },
    { min: 197300, max: 250525, rate: 0.32 },
    { min: 250525, max: 626350, rate: 0.35 },
    { min: 626350, max: Infinity, rate: 0.37 }
  ],
  married_joint: [
    { min: 0, max: 23850, rate: 0.10 },
    { min: 23850, max: 96950, rate: 0.12 },
    { min: 96950, max: 206700, rate: 0.22 },
    { min: 206700, max: 394600, rate: 0.24 },
    { min: 394600, max: 501050, rate: 0.32 },
    { min: 501050, max: 751600, rate: 0.35 },
    { min: 751600, max: Infinity, rate: 0.37 }
  ],
  married_separate: [
    { min: 0, max: 11925, rate: 0.10 },
    { min: 11925, max: 48475, rate: 0.12 },
    { min: 48475, max: 103350, rate: 0.22 },
    { min: 103350, max: 197300, rate: 0.24 },
    { min: 197300, max: 250525, rate: 0.32 },
    { min: 250525, max: 375800, rate: 0.35 },
    { min: 375800, max: Infinity, rate: 0.37 }
  ],
  head_of_household: [
    { min: 0, max: 17000, rate: 0.10 },
    { min: 17000, max: 64850, rate: 0.12 },
    { min: 64850, max: 103350, rate: 0.22 },
    { min: 103350, max: 197300, rate: 0.24 },
    { min: 197300, max: 250500, rate: 0.32 },
    { min: 250500, max: 626350, rate: 0.35 },
    { min: 626350, max: Infinity, rate: 0.37 }
  ]
};

// Tax brackets by year
const TAX_BRACKETS = {
  2024: TAX_BRACKETS_2024,
  2025: TAX_BRACKETS_2025
};

// 2024 Standard Deductions
const STANDARD_DEDUCTIONS_2024 = {
  single: 14600,
  married_joint: 29200,
  married_separate: 14600,
  head_of_household: 21900
};

// 2025 Standard Deductions (IRS Rev. Proc. 2024-40)
const STANDARD_DEDUCTIONS_2025 = {
  single: 15000,
  married_joint: 30000,
  married_separate: 15000,
  head_of_household: 22500
};

// Standard deductions by year
const STANDARD_DEDUCTIONS = {
  2024: STANDARD_DEDUCTIONS_2024,
  2025: STANDARD_DEDUCTIONS_2025
};

// Kentucky State Tax Constants
const KY_STATE_TAX = {
  2024: { rate: 0.04, standardDeduction: 3160 },
  2025: { rate: 0.04, standardDeduction: 3230 },
};

// Child Tax Credit (same for 2024 and 2025)
const CHILD_TAX_CREDIT = {
  2024: 2000,
  2025: 2000  // CTC remains at $2,000 for 2025
};
const CHILD_TAX_CREDIT_INCOME_LIMIT = {
  single: 200000,
  married_joint: 400000,
  married_separate: 200000,
  head_of_household: 200000
};

// Social Security and Medicare Tax Rates (same for 2024 and 2025)
const SOCIAL_SECURITY_RATE = 0.062; // 6.2%
const MEDICARE_RATE = 0.0145; // 1.45%
const ADDITIONAL_MEDICARE_RATE = 0.009; // 0.9% additional on high earners
const ADDITIONAL_MEDICARE_THRESHOLD = {
  single: 200000,
  married_joint: 250000,
  married_separate: 125000,
  head_of_household: 200000
};

// Social Security Wage Base by year
const SOCIAL_SECURITY_WAGE_BASE = {
  2024: 168600, // Maximum taxable wages for 2024
  2025: 176100  // Maximum taxable wages for 2025
};

// Self-Employment Tax (same for 2024 and 2025)
const SELF_EMPLOYMENT_TAX_RATE = 0.153; // 15.3% (Social Security 12.4% + Medicare 2.9%)
const SELF_EMPLOYMENT_DEDUCTION_RATE = 0.5; // Can deduct 50% of self-employment tax
const SELF_EMPLOYMENT_INCOME_MULTIPLIER = 0.9235; // 92.35% of net earnings subject to SE tax

// Standard Mileage Rates by year
const STANDARD_MILEAGE_RATE = {
  2024: 0.67, // $0.67 per mile for business use
  2025: 0.70  // $0.70 per mile for business use (IRS Notice 2024-08)
};

// 2024 Earned Income Credit (EIC) with phase-in and phase-out ranges
// IRS phase-in and phase-out rates by number of children:
// 0 children: phase-in 7.65%, phase-out 7.65%
// 1 child: phase-in 34%, phase-out 15.98%
// 2 children: phase-in 40%, phase-out 21.06%
// 3+ children: phase-in 45%, phase-out 21.06%
const EIC_2024 = {
  single: [
    { children: 0, maxIncome: 18591, maxCredit: 632, phaseInEnd: 8260, phaseOutStart: 10330, phaseInRate: 0.0765, phaseOutRate: 0.0765 },
    { children: 1, maxIncome: 49084, maxCredit: 4213, phaseInEnd: 12080, phaseOutStart: 23350, phaseInRate: 0.34, phaseOutRate: 0.1598 },
    { children: 2, maxIncome: 55768, maxCredit: 6960, phaseInEnd: 13870, phaseOutStart: 26260, phaseInRate: 0.40, phaseOutRate: 0.2106 },
    { children: 3, maxIncome: 59899, maxCredit: 7830, phaseInEnd: 13870, phaseOutStart: 26260, phaseInRate: 0.45, phaseOutRate: 0.2106 }
  ],
  married_joint: [
    { children: 0, maxIncome: 25511, maxCredit: 632, phaseInEnd: 8260, phaseOutStart: 17140, phaseInRate: 0.0765, phaseOutRate: 0.0765 },
    { children: 1, maxIncome: 56004, maxCredit: 4213, phaseInEnd: 12080, phaseOutStart: 30260, phaseInRate: 0.34, phaseOutRate: 0.1598 },
    { children: 2, maxIncome: 62688, maxCredit: 6960, phaseInEnd: 13870, phaseOutStart: 33170, phaseInRate: 0.40, phaseOutRate: 0.2106 },
    { children: 3, maxIncome: 66819, maxCredit: 7830, phaseInEnd: 13870, phaseOutStart: 33170, phaseInRate: 0.45, phaseOutRate: 0.2106 }
  ],
  married_separate: [
    { children: 0, maxIncome: 18591, maxCredit: 632, phaseInEnd: 8260, phaseOutStart: 10330, phaseInRate: 0.0765, phaseOutRate: 0.0765 },
    { children: 1, maxIncome: 49084, maxCredit: 4213, phaseInEnd: 12080, phaseOutStart: 23350, phaseInRate: 0.34, phaseOutRate: 0.1598 },
    { children: 2, maxIncome: 55768, maxCredit: 6960, phaseInEnd: 13870, phaseOutStart: 26260, phaseInRate: 0.40, phaseOutRate: 0.2106 },
    { children: 3, maxIncome: 59899, maxCredit: 7830, phaseInEnd: 13870, phaseOutStart: 26260, phaseInRate: 0.45, phaseOutRate: 0.2106 }
  ],
  head_of_household: [
    { children: 0, maxIncome: 25511, maxCredit: 632, phaseInEnd: 8260, phaseOutStart: 17140, phaseInRate: 0.0765, phaseOutRate: 0.0765 },
    { children: 1, maxIncome: 56004, maxCredit: 4213, phaseInEnd: 12080, phaseOutStart: 30260, phaseInRate: 0.34, phaseOutRate: 0.1598 },
    { children: 2, maxIncome: 62688, maxCredit: 6960, phaseInEnd: 13870, phaseOutStart: 33170, phaseInRate: 0.40, phaseOutRate: 0.2106 },
    { children: 3, maxIncome: 66819, maxCredit: 7830, phaseInEnd: 13870, phaseOutStart: 33170, phaseInRate: 0.45, phaseOutRate: 0.2106 }
  ]
};

// 2025 Earned Income Credit (EIC) with phase-in and phase-out ranges (IRS Rev. Proc. 2024-40)
// IRS phase-in and phase-out rates by number of children:
// 0 children: phase-in 7.65%, phase-out 7.65%
// 1 child: phase-in 34%, phase-out 15.98%
// 2 children: phase-in 40%, phase-out 21.06%
// 3+ children: phase-in 45%, phase-out 21.06%
const EIC_2025 = {
  single: [
    { children: 0, maxIncome: 19104, maxCredit: 649, phaseInEnd: 8490, phaseOutStart: 10620, phaseInRate: 0.0765, phaseOutRate: 0.0765 },
    { children: 1, maxIncome: 50434, maxCredit: 4328, phaseInEnd: 12410, phaseOutStart: 23990, phaseInRate: 0.34, phaseOutRate: 0.1598 },
    { children: 2, maxIncome: 57310, maxCredit: 7152, phaseInEnd: 14260, phaseOutStart: 26990, phaseInRate: 0.40, phaseOutRate: 0.2106 },
    { children: 3, maxIncome: 61555, maxCredit: 8046, phaseInEnd: 14260, phaseOutStart: 26990, phaseInRate: 0.45, phaseOutRate: 0.2106 }
  ],
  married_joint: [
    { children: 0, maxIncome: 26214, maxCredit: 649, phaseInEnd: 8490, phaseOutStart: 17620, phaseInRate: 0.0765, phaseOutRate: 0.0765 },
    { children: 1, maxIncome: 57554, maxCredit: 4328, phaseInEnd: 12410, phaseOutStart: 31100, phaseInRate: 0.34, phaseOutRate: 0.1598 },
    { children: 2, maxIncome: 64430, maxCredit: 7152, phaseInEnd: 14260, phaseOutStart: 34100, phaseInRate: 0.40, phaseOutRate: 0.2106 },
    { children: 3, maxIncome: 68675, maxCredit: 8046, phaseInEnd: 14260, phaseOutStart: 34100, phaseInRate: 0.45, phaseOutRate: 0.2106 }
  ],
  married_separate: [
    { children: 0, maxIncome: 19104, maxCredit: 649, phaseInEnd: 8490, phaseOutStart: 10620, phaseInRate: 0.0765, phaseOutRate: 0.0765 },
    { children: 1, maxIncome: 50434, maxCredit: 4328, phaseInEnd: 12410, phaseOutStart: 23990, phaseInRate: 0.34, phaseOutRate: 0.1598 },
    { children: 2, maxIncome: 57310, maxCredit: 7152, phaseInEnd: 14260, phaseOutStart: 26990, phaseInRate: 0.40, phaseOutRate: 0.2106 },
    { children: 3, maxIncome: 61555, maxCredit: 8046, phaseInEnd: 14260, phaseOutStart: 26990, phaseInRate: 0.45, phaseOutRate: 0.2106 }
  ],
  head_of_household: [
    { children: 0, maxIncome: 26214, maxCredit: 649, phaseInEnd: 8490, phaseOutStart: 17620, phaseInRate: 0.0765, phaseOutRate: 0.0765 },
    { children: 1, maxIncome: 57554, maxCredit: 4328, phaseInEnd: 12410, phaseOutStart: 31100, phaseInRate: 0.34, phaseOutRate: 0.1598 },
    { children: 2, maxIncome: 64430, maxCredit: 7152, phaseInEnd: 14260, phaseOutStart: 34100, phaseInRate: 0.40, phaseOutRate: 0.2106 },
    { children: 3, maxIncome: 68675, maxCredit: 8046, phaseInEnd: 14260, phaseOutStart: 34100, phaseInRate: 0.45, phaseOutRate: 0.2106 }
  ]
};

// EIC by year
const EIC = {
  2024: EIC_2024,
  2025: EIC_2025
};

// 2024 Education Credits (Form 8863)
const AMERICAN_OPPORTUNITY_CREDIT = {
  maxCreditPerStudent: 2500,
  maxExpensesConsidered: 4000, // 100% of first $2k, 25% of next $2k
  phaseOutStart: {
    single: 80000,
    married_joint: 160000,
    married_separate: 0, // Not eligible if MFS
    head_of_household: 80000
  },
  phaseOutEnd: {
    single: 90000,
    married_joint: 180000,
    married_separate: 0,
    head_of_household: 90000
  },
  refundablePercentage: 0.40 // 40% of credit is refundable
};

const LIFETIME_LEARNING_CREDIT = {
  maxCreditPerReturn: 2000,
  creditRate: 0.20, // 20% of qualified expenses
  maxExpensesConsidered: 10000,
  phaseOutStart: {
    single: 80000,
    married_joint: 160000,
    married_separate: 0, // Not eligible if MFS
    head_of_household: 80000
  },
  phaseOutEnd: {
    single: 90000,
    married_joint: 180000,
    married_separate: 0,
    head_of_household: 90000
  }
};

export class TaxCalculationService {
  /**
   * Generate a unique calculation reference number
   */
  private generateCalculationReference(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');

    return `TAX-${year}${month}${day}-${hours}${minutes}${seconds}-${random}`;
  }

  /**
   * Calculate federal tax return based on provided tax forms
   */
  calculateTaxReturn(formData: TaxFormData): TaxCalculationResult {
    devLog('📊 Tax Calculation Service - Starting calculation');
    devLog('Form Data:', formData);

    // Generate calculation reference
    const calculationReference = this.generateCalculationReference();
    const calculationDate = new Date().toISOString();
    const customerName = `${formData.customerInfo.firstName} ${formData.customerInfo.lastName}`.trim();
    const taxYear = formData.taxYear || 2024; // Default to 2024 if not specified

    devLog('Calculation Reference:', calculationReference);
    devLog('Calculation Date:', calculationDate);
    devLog('Customer:', customerName);
    devLog('Tax Year:', taxYear);

    // Calculate total income from W-2 forms
    const totalW2Income = this.calculateTotalW2Income(formData.w2Forms);
    devLog('Total W2 Income:', totalW2Income);

    // Calculate total income from 1099 forms (all types)
    const total1099Income = this.calculateTotal1099Income(formData.form1099s);
    devLog('Total 1099 Income (all types):', total1099Income);

    // Separate 1099 income by type
    const total1099InvestmentIncome = this.calculate1099InvestmentIncome(formData.form1099s);
    devLog('  - 1099 Investment Income (INT + DIV):', total1099InvestmentIncome);

    const total1099SelfEmploymentIncome = this.calculate1099SelfEmploymentIncome(formData.form1099s);
    devLog('  - 1099 Self-Employment Income (NEC + MISC):', total1099SelfEmploymentIncome);

    // Calculate business expenses
    const totalBusinessExpenses = this.calculateBusinessExpenses(formData.businessExpenses, taxYear);
    devLog('Total Business Expenses:', totalBusinessExpenses);

    // Calculate net self-employment income (ONLY NEC/MISC income - business expenses)
    // Investment income (INT/DIV) is NOT subject to business expenses or SE tax
    const netSelfEmploymentIncome = total1099SelfEmploymentIncome - totalBusinessExpenses;
    devLog('Net Self-Employment Income:', netSelfEmploymentIncome);

    // Calculate self-employment tax (ONLY on net SE income from NEC/MISC)
    const { selfEmploymentTax, selfEmploymentTaxDeduction } = this.calculateSelfEmploymentTax(netSelfEmploymentIncome);
    devLog('Self-Employment Tax:', selfEmploymentTax);
    devLog('Self-Employment Tax Deduction:', selfEmploymentTaxDeduction);

    // Calculate total income (W2 + net self-employment income + investment income)
    // Investment income is added to total income but was NOT subject to SE tax
    const totalIncome = totalW2Income + netSelfEmploymentIncome + total1099InvestmentIncome;
    devLog('Total Income:', totalIncome);

    // Calculate AGI (total income - self-employment tax deduction)
    const adjustedGrossIncome = totalIncome - selfEmploymentTaxDeduction;
    devLog('Adjusted Gross Income (AGI):', adjustedGrossIncome);

    // Calculate standard deduction
    const standardDeduction = this.getStandardDeduction(formData.customerInfo.filingStatus, taxYear);

    // Calculate itemized deductions (including mortgage interest and property taxes from Form 1098s)
    const itemizedDeductionsResult = this.calculateItemizedDeductions(
      formData.deductions,
      formData.form1098s || []
    );
    const totalItemizedDeductions = itemizedDeductionsResult.total;
    const mortgageInterestPaid = itemizedDeductionsResult.mortgageInterest;
    const propertyTaxesPaid = itemizedDeductionsResult.propertyTaxes;

    // Use the greater of standard or itemized deductions
    const deductionUsed = totalItemizedDeductions > standardDeduction ? 'itemized' : 'standard';
    const deductionAmount = Math.max(standardDeduction, totalItemizedDeductions);

    // Calculate QBI (Qualified Business Income) Deduction - Form 8995
    const qbiDeduction = this.calculateQBIDeduction(
      netSelfEmploymentIncome,
      adjustedGrossIncome,
      deductionAmount,
      formData.customerInfo.filingStatus
    );
    devLog('QBI Deduction:', qbiDeduction);

    // Calculate taxable income (AGI - Standard/Itemized Deduction - QBI Deduction)
    const taxableIncome = Math.max(0, adjustedGrossIncome - deductionAmount - qbiDeduction);

    // Calculate federal tax liability
    const { totalTax, breakdown } = this.calculateFederalTax(
      taxableIncome,
      formData.customerInfo.filingStatus,
      taxYear
    );
    devLog('Total Tax:', totalTax)

    // Calculate total tax withheld
    const totalWithheld = this.calculateTotalWithheld(formData.w2Forms, formData.form1099s);

    // Calculate total potential child tax credit (before limiting to tax liability)
    const totalPotentialCTC = this.calculateTotalPotentialCTC(
      formData.customerInfo.dependents,
      adjustedGrossIncome,
      formData.customerInfo.filingStatus,
      taxYear
    );
    devLog('Total Potential CTC:', totalPotentialCTC);

    // Calculate non-refundable child tax credit (limited to tax liability)
    const childTaxCredit = Math.min(totalPotentialCTC, totalTax);
    devLog('Child Tax Credit (non-refundable, limited to tax):', childTaxCredit);

    // Calculate earned income for Additional CTC
    const totalEarnedIncome = totalW2Income + netSelfEmploymentIncome;

    // Calculate Additional Child Tax Credit (refundable portion) - Schedule 8812
    const additionalChildTaxCredit = this.calculateAdditionalChildTaxCredit(
      totalPotentialCTC,
      childTaxCredit,
      totalEarnedIncome,
      formData.customerInfo.dependents
    );
    devLog('Additional Child Tax Credit (refundable):', additionalChildTaxCredit);

    // Calculate Earned Income Credit (EIC)
    const earnedIncomeCredit = this.calculateEarnedIncomeCredit(
      totalEarnedIncome,
      adjustedGrossIncome,
      formData.customerInfo.dependents,
      formData.customerInfo.filingStatus,
      taxYear
    );
    devLog('Earned Income Credit:', earnedIncomeCredit);

    // Calculate payroll taxes (Social Security and Medicare)
    const payrollTaxes = this.calculatePayrollTaxes(
      totalW2Income,
      formData.customerInfo.filingStatus,
      taxYear
    );
    devLog('Payroll Taxes:', payrollTaxes);

    // Calculate Education Credits (Form 8863)
    // Note: Cannot claim both AOC and LLC for the same student - use AOC if eligible
    const form1098Ts = formData.form1098Ts || [];
    const aocResult = this.calculateAmericanOpportunityCredit(
      form1098Ts,
      adjustedGrossIncome,
      formData.customerInfo.filingStatus
    );
    const americanOpportunityCredit = aocResult.totalCredit;
    const americanOpportunityCreditRefundable = aocResult.refundablePortion;
    devLog('American Opportunity Credit:', americanOpportunityCredit);
    devLog('AOC Refundable Portion:', americanOpportunityCreditRefundable);

    // Calculate Lifetime Learning Credit for students not eligible for AOC
    // For simplicity, we use LLC for all students if no AOC is claimed
    const lifetimeLearningCredit = americanOpportunityCredit === 0
      ? this.calculateLifetimeLearningCredit(
          form1098Ts,
          adjustedGrossIncome,
          formData.customerInfo.filingStatus
        )
      : 0;
    devLog('Lifetime Learning Credit:', lifetimeLearningCredit);

    // Other credits (placeholder for now)
    const otherCredits = 0;

    // Total credits includes non-refundable CTC + education credits + refundable credits (ACTC + EIC + AOC refundable)
    const totalCredits = childTaxCredit + additionalChildTaxCredit + earnedIncomeCredit + americanOpportunityCredit + lifetimeLearningCredit + otherCredits;
    devLog('Total Credits:', totalCredits);

    // ========== FORM 1040 LINE-BY-LINE CALCULATION ==========

    // Line 16: Federal Tax (from tax tables)
    devLog('Line 16 - Federal Tax:', totalTax);

    // Line 24: Total Tax = Line 16 + SE Tax (before credits)
    const line24TotalTax = totalTax + selfEmploymentTax;
    devLog('Line 24 - Total Tax (before credits):', line24TotalTax);

    // Line 19 (via Schedule 3): Non-refundable credits (CTC + education credits, limited to Line 16)
    // AOC non-refundable portion is 60% of total AOC (40% is refundable)
    const aocNonRefundable = americanOpportunityCredit - americanOpportunityCreditRefundable;
    // LLC is fully non-refundable
    const educationCreditsNonRefundable = aocNonRefundable + lifetimeLearningCredit;
    const nonRefundableCredits = Math.min(childTaxCredit + educationCreditsNonRefundable, totalTax);
    devLog('Non-Refundable Credits (CTC + Education):', nonRefundableCredits);

    // Subtract non-refundable credits from Line 16
    const line16AfterCredits = Math.max(0, totalTax - nonRefundableCredits);
    devLog('Line 16 After Non-Refundable Credits:', line16AfterCredits);

    // Line 24 adjusted: Tax after non-refundable credits + SE tax
    const line24AfterNonRefundableCredits = line16AfterCredits + selfEmploymentTax;
    devLog('Line 24 After Non-Refundable Credits:', line24AfterNonRefundableCredits);

    // Line 32: Total Payments and Refundable Credits
    // Line 25: Withholding
    // Line 27: EIC (refundable)
    // Line 28: ACTC (refundable)
    // Line 29: AOC refundable portion (40% of AOC)
    const line32TotalPaymentsAndCredits = totalWithheld + earnedIncomeCredit + additionalChildTaxCredit + americanOpportunityCreditRefundable;
    devLog('Line 32 - Total Payments and Refundable Credits:', line32TotalPaymentsAndCredits);

    // Line 33: Overpayment = Line 32 - Line 24 (if positive)
    const line33Overpayment = line32TotalPaymentsAndCredits - line24AfterNonRefundableCredits;
    devLog('Line 33 - Overpayment:', line33Overpayment);

    // Line 35a / Line 37: Refund or Amount Owed
    const refundAmount = line33Overpayment > 0 ? line33Overpayment : 0;
    const taxDue = line33Overpayment < 0 ? Math.abs(line33Overpayment) : 0;
    devLog('Refund Amount (Line 35a):', refundAmount);
    devLog('Tax Due (Line 37):', taxDue);

    // Final tax liability for other calculations (withholding recommendations, etc.)
    const finalTaxLiability = line24AfterNonRefundableCredits;

    // Calculate effective tax rate
    const effectiveTaxRate = totalIncome > 0 ? (finalTaxLiability / totalIncome) * 100 : 0;
    devLog('Effective Tax Rate:', effectiveTaxRate);

    // Calculate recommended withholding
    const recommendedWithholding = this.calculateRecommendedWithholding(
      finalTaxLiability,
      totalIncome,
      formData.customerInfo.filingStatus,
      payrollTaxes.totalPayrollTax,
      taxYear
    );
    devLog('Recommended Withholding:', recommendedWithholding);

    // Determine withholding status
    const { status: withholdingStatus, difference: withholdingDifference } =
      this.determineWithholdingStatus(totalWithheld, finalTaxLiability);
    devLog('Withholding Status:', withholdingStatus, 'Difference:', withholdingDifference);

    // Calculate state tax
    const stateTaxResult = this.calculateStateTax(
      adjustedGrossIncome,
      taxYear,
      formData.customerInfo.state,
      formData.w2Forms
    );

    const result = {
      // Reference Information
      calculationReference,
      calculationDate,
      customerName,
      taxYear,
      // Income
      totalW2Income,
      total1099Income, // Total of all 1099s
      total1099InvestmentIncome, // INT + DIV (not subject to SE tax)
      total1099SelfEmploymentIncome, // NEC + MISC (subject to SE tax)
      totalBusinessExpenses,
      netSelfEmploymentIncome,
      totalIncome,
      adjustedGrossIncome,
      selfEmploymentTax,
      selfEmploymentTaxDeduction,
      // Deductions
      standardDeduction,
      totalItemizedDeductions,
      mortgageInterestPaid,
      propertyTaxesPaid,
      deductionUsed: deductionUsed as 'standard' | 'itemized',
      deductionAmount,
      qbiDeduction,
      // Taxable Income
      taxableIncome,
      // Tax Calculations
      federalTaxLiability: totalTax,
      totalWithheld,
      // Credits
      childTaxCredit,
      additionalChildTaxCredit,
      earnedIncomeCredit,
      americanOpportunityCredit,
      americanOpportunityCreditRefundable,
      lifetimeLearningCredit,
      otherCredits,
      totalCredits,
      // Payroll Taxes
      socialSecurityTax: payrollTaxes.socialSecurityTax,
      medicareTax: payrollTaxes.medicareTax,
      additionalMedicareTax: payrollTaxes.additionalMedicareTax,
      totalPayrollTax: payrollTaxes.totalPayrollTax,
      // Final Result
      taxDue,
      refundAmount,
      effectiveTaxRate,
      // Withholding Recommendations
      recommendedWithholding,
      withholdingStatus,
      withholdingDifference,
      taxBracketBreakdown: breakdown,
      // State Tax
      ...stateTaxResult,
    };

    devLog('✅ Tax calculation complete:', result);
    return result;
  }

  /**
   * Calculate total W-2 income
   */
  private calculateTotalW2Income(w2Forms: W2Form[]): number {
    return w2Forms.reduce((total, w2) => total + w2.wages, 0);
  }

  /**
   * Calculate total 1099 income (all types combined)
   */
  private calculateTotal1099Income(form1099s: Form1099[]): number {
    return form1099s.reduce((total, form) => total + form.amount, 0);
  }

  /**
   * Calculate 1099 investment income (INT and DIV - not subject to SE tax)
   * These go on Schedule B and are added to AGI but NOT subject to self-employment tax
   */
  private calculate1099InvestmentIncome(form1099s: Form1099[]): number {
    return form1099s
      .filter(form => form.type === '1099-INT' || form.type === '1099-DIV')
      .reduce((total, form) => total + form.amount, 0);
  }

  /**
   * Calculate 1099 self-employment income (NEC and MISC - subject to SE tax)
   * These go on Schedule C and are subject to self-employment tax
   */
  private calculate1099SelfEmploymentIncome(form1099s: Form1099[]): number {
    return form1099s
      .filter(form => form.type === '1099-NEC' || form.type === '1099-MISC')
      .reduce((total, form) => total + form.amount, 0);
  }

  /**
   * Calculate total business expenses including mileage
   */
  private calculateBusinessExpenses(expenses: BusinessExpense[], taxYear: TaxYear): number {
    const mileageRate = STANDARD_MILEAGE_RATE[taxYear];
    return expenses.reduce((total, expense) => {
      if (expense.category === 'mileage' && expense.miles) {
        // Calculate mileage deduction using standard mileage rate for the year
        return total + (expense.miles * mileageRate);
      }
      return total + expense.amount;
    }, 0);
  }

  /**
   * Calculate mortgage interest deduction from Form 1098s
   * Note: There's a $750,000 limit on acquisition debt (mortgages taken after 12/15/2017)
   * For simplicity, we sum all mortgage interest for now
   */
  private calculateMortgageInterestDeduction(form1098s: Form1098[]): number {
    return form1098s.reduce((total, form) => total + form.mortgageInterest, 0);
  }

  /**
   * Calculate property tax deduction from Form 1098s
   * Note: SALT (State and Local Tax) deduction is capped at $10,000 total
   * For now, we just sum all property taxes (cap will be applied in itemized deductions)
   */
  private calculatePropertyTaxDeduction(form1098s: Form1098[]): number {
    return form1098s.reduce((total, form) => total + form.propertyTaxes, 0);
  }

  /**
   * Calculate self-employment tax (for 1099 contractors)
   */
  private calculateSelfEmploymentTax(netSelfEmploymentIncome: number): {
    selfEmploymentTax: number;
    selfEmploymentTaxDeduction: number;
  } {
    if (netSelfEmploymentIncome <= 0) {
      return { selfEmploymentTax: 0, selfEmploymentTaxDeduction: 0 };
    }

    // Self-employment tax is calculated on 92.35% of net earnings
    const taxableSeIncome = netSelfEmploymentIncome * SELF_EMPLOYMENT_INCOME_MULTIPLIER;

    // Calculate SE tax (15.3%)
    // Note: Social Security portion is capped at wage base, but we'll simplify here
    const selfEmploymentTax = taxableSeIncome * SELF_EMPLOYMENT_TAX_RATE;

    // Can deduct 50% of SE tax from gross income
    const selfEmploymentTaxDeduction = selfEmploymentTax * SELF_EMPLOYMENT_DEDUCTION_RATE;

    return {
      selfEmploymentTax,
      selfEmploymentTaxDeduction
    };
  }

  /**
   * Get standard deduction based on filing status and tax year
   */
  private getStandardDeduction(filingStatus: FilingStatus, taxYear: TaxYear): number {
    return STANDARD_DEDUCTIONS[taxYear][filingStatus];
  }

  /**
   * Calculate total itemized deductions
   */
  private calculateItemizedDeductions(
    deductions: any[],
    form1098s: Form1098[] = []
  ): { total: number; mortgageInterest: number; propertyTaxes: number } {
    // Calculate base itemized deductions
    const baseDeductions = deductions.reduce((total, deduction) => total + deduction.amount, 0);

    // Calculate mortgage interest from Form 1098s
    const mortgageInterest = this.calculateMortgageInterestDeduction(form1098s);

    // Calculate property taxes from Form 1098s
    const propertyTaxes = this.calculatePropertyTaxDeduction(form1098s);

    // Sum all itemized deductions
    const total = baseDeductions + mortgageInterest + propertyTaxes;

    return { total, mortgageInterest, propertyTaxes };
  }

  /**
   * Calculate federal tax based on tax brackets
   */
  private calculateFederalTax(taxableIncome: number, filingStatus: FilingStatus, taxYear: TaxYear): {
    totalTax: number;
    breakdown: {
      bracket: string;
      taxableAmount: number;
      taxAmount: number;
      rate: number;
    }[];
  } {
    const brackets = TAX_BRACKETS[taxYear][filingStatus];
    let remainingIncome = taxableIncome;
    let totalTax = 0;
    const breakdown: {
      bracket: string;
      taxableAmount: number;
      taxAmount: number;
      rate: number;
    }[] = [];

    for (const bracket of brackets) {
      if (remainingIncome <= 0) break;

      const bracketSize = bracket.max - bracket.min;
      const taxableInBracket = Math.min(remainingIncome, bracketSize);
      const taxForBracket = taxableInBracket * bracket.rate;

      totalTax += taxForBracket;
      remainingIncome -= taxableInBracket;

      if (taxableInBracket > 0) {
        breakdown.push({
          bracket: `${bracket.rate * 100}%`,
          taxableAmount: taxableInBracket,
          taxAmount: taxForBracket,
          rate: bracket.rate
        });
      }
    }

    return { totalTax, breakdown };
  }

  /**
   * Calculate total tax withheld from all forms
   */
  private calculateTotalWithheld(w2Forms: W2Form[], form1099s: Form1099[]): number {
    const w2Withheld = w2Forms.reduce((total, w2) => total + w2.federalTaxWithheld, 0);
    const form1099Withheld = form1099s.reduce((total, form) => total + form.federalTaxWithheld, 0);
    return w2Withheld + form1099Withheld;
  }

  /**
   * Calculate total potential child tax credit (before limiting to tax liability)
   */
  private calculateTotalPotentialCTC(
    dependents: number,
    adjustedGrossIncome: number,
    filingStatus: FilingStatus,
    taxYear: TaxYear
  ): number {
    if (dependents === 0) return 0;

    const incomeLimit = CHILD_TAX_CREDIT_INCOME_LIMIT[filingStatus];
    const childTaxCreditAmount = CHILD_TAX_CREDIT[taxYear];

    // Full credit if under income limit
    if (adjustedGrossIncome <= incomeLimit) {
      return dependents * childTaxCreditAmount;
    }

    // Phase out $50 for every $1,000 over limit
    const excessIncome = adjustedGrossIncome - incomeLimit;
    const phaseOutAmount = Math.floor(excessIncome / 1000) * 50;
    const creditPerChild = Math.max(0, childTaxCreditAmount - phaseOutAmount);

    return dependents * creditPerChild;
  }

  /**
   * Calculate Additional Child Tax Credit (refundable portion) - Schedule 8812
   * This is the refundable portion of the CTC when tax liability is less than full credit
   *
   * Schedule 8812 flow:
   *   Line 16a: unusedCTC = totalPotentialCTC - nonRefundableCTC
   *   Line 16b: perChildCap = dependents × $1,700
   *   Line 17:  MIN(Line 16a, Line 16b)
   *   Line 19:  MAX(0, earnedIncome - $2,500)
   *   Line 20:  Line 19 × 15%
   *   Line 27:  ACTC = MIN(Line 17, Line 20)
   */
  private calculateAdditionalChildTaxCredit(
    totalPotentialCTC: number,
    nonRefundableCTC: number,
    earnedIncome: number,
    dependents: number
  ): number {
    if (dependents === 0 || totalPotentialCTC === 0) return 0;

    // Line 16a: Amount of CTC not used as non-refundable credit
    const unusedCTC = totalPotentialCTC - nonRefundableCTC;
    if (unusedCTC <= 0) return 0;

    devLog(`📊 Additional CTC Calculation (Schedule 8812):`);
    devLog(`  - Total Potential CTC: $${totalPotentialCTC.toFixed(2)}`);
    devLog(`  - Non-Refundable CTC Used: $${nonRefundableCTC.toFixed(2)}`);
    devLog(`  - Line 16a (Unused CTC): $${unusedCTC.toFixed(2)}`);
    devLog(`  - Earned Income: $${earnedIncome.toFixed(2)}`);

    // Line 16b: Max refundable per child ($1,700 for 2024/2025)
    const MAX_REFUNDABLE_PER_CHILD = 1700;
    const perChildCap = dependents * MAX_REFUNDABLE_PER_CHILD;

    // Line 17: MIN(Line 16a, Line 16b)
    const line17 = Math.min(unusedCTC, perChildCap);
    devLog(`  - Line 16b (per-child cap): $${perChildCap.toFixed(2)}`);
    devLog(`  - Line 17 (MIN 16a,16b): $${line17.toFixed(2)}`);

    // Line 19-20: 15% of earned income above $2,500
    const EARNED_INCOME_THRESHOLD = 2500;

    if (earnedIncome <= EARNED_INCOME_THRESHOLD) {
      devLog(`  - Earned income below threshold ($${EARNED_INCOME_THRESHOLD})`);
      return 0;
    }

    const excessEarnedIncome = earnedIncome - EARNED_INCOME_THRESHOLD;
    const line20 = excessEarnedIncome * 0.15;

    devLog(`  - Line 19 (Excess Earned Income): $${excessEarnedIncome.toFixed(2)}`);
    devLog(`  - Line 20 (15% of Line 19): $${line20.toFixed(2)}`);

    // Line 27: ACTC = MIN(Line 17, Line 20)
    const additionalCTC = Math.min(line17, line20);
    devLog(`  - Line 27 (ACTC): $${additionalCTC.toFixed(2)}`);

    return Math.round(additionalCTC);
  }

  /**
   * Calculate Earned Income Credit (EIC)
   * Uses IRS phase-in and phase-out rates for the specified tax year
   *
   * IRS EIC Rules:
   * - Phase-in: credit = earnedIncome × phaseInRate (capped at maxCredit)
   * - Plateau: credit = maxCredit
   * - Phase-out: credit = maxCredit - ((income - phaseOutStart) × phaseOutRate)
   * - For phase-out, use the GREATER of earned income or AGI
   *
   * Phase-in rates: 0 children: 7.65%, 1 child: 34%, 2 children: 40%, 3+ children: 45%
   * Phase-out rates: 0 children: 7.65%, 1 child: 15.98%, 2 children: 21.06%, 3+ children: 21.06%
   */
  private calculateEarnedIncomeCredit(
    earnedIncome: number,
    adjustedGrossIncome: number,
    dependents: number,
    filingStatus: FilingStatus,
    taxYear: TaxYear
  ): number {
    const eicTable = EIC[taxYear][filingStatus];

    // Determine number of qualifying children (max 3 for EIC purposes)
    const qualifyingChildren = Math.min(dependents, 3);

    // Get the appropriate EIC bracket
    const eicBracket = eicTable[qualifyingChildren];

    if (!eicBracket) return 0;

    // For phase-out, IRS uses the GREATER of earned income or AGI
    const incomeForPhaseOut = Math.max(earnedIncome, adjustedGrossIncome);

    // Check if income exceeds maximum for eligibility
    if (incomeForPhaseOut > eicBracket.maxIncome || earnedIncome <= 0) {
      return 0;
    }

    devLog(`📊 EIC Calculation for ${qualifyingChildren} children:`);
    devLog(`  - Earned Income: $${earnedIncome.toFixed(2)}`);
    devLog(`  - AGI: $${adjustedGrossIncome.toFixed(2)}`);
    devLog(`  - Income for Phase-Out (greater of EI or AGI): $${incomeForPhaseOut.toFixed(2)}`);
    devLog(`  - Phase-In End: $${eicBracket.phaseInEnd}`);
    devLog(`  - Phase-Out Start: $${eicBracket.phaseOutStart}`);
    devLog(`  - Max Income: $${eicBracket.maxIncome}`);
    devLog(`  - Max Credit: $${eicBracket.maxCredit}`);
    devLog(`  - Phase-In Rate: ${(eicBracket.phaseInRate * 100).toFixed(2)}%`);
    devLog(`  - Phase-Out Rate: ${(eicBracket.phaseOutRate * 100).toFixed(2)}%`);

    // Calculate phase-in credit based on earned income
    // Phase-in formula: credit = earnedIncome × phaseInRate (capped at maxCredit)
    const phaseInCredit = Math.min(earnedIncome * eicBracket.phaseInRate, eicBracket.maxCredit);

    // Calculate phase-out reduction based on income for phase-out (greater of EI or AGI)
    // Phase-out formula: reduction = (income - phaseOutStart) × phaseOutRate
    let phaseOutReduction = 0;
    if (incomeForPhaseOut > eicBracket.phaseOutStart) {
      phaseOutReduction = (incomeForPhaseOut - eicBracket.phaseOutStart) * eicBracket.phaseOutRate;
    }

    // Final credit = phase-in credit - phase-out reduction, but not less than 0
    const credit = Math.max(0, phaseInCredit - phaseOutReduction);

    // Determine which phase we're in for logging
    if (earnedIncome <= eicBracket.phaseInEnd && incomeForPhaseOut <= eicBracket.phaseOutStart) {
      devLog(`  - Phase: Phase-In | Phase-In Credit: $${phaseInCredit.toFixed(2)} | Final Credit: $${credit.toFixed(2)}`);
    } else if (incomeForPhaseOut <= eicBracket.phaseOutStart) {
      devLog(`  - Phase: Plateau | Credit: $${credit.toFixed(2)}`);
    } else {
      devLog(`  - Phase: Phase-Out | Phase-In Credit: $${phaseInCredit.toFixed(2)} | Phase-Out Reduction: $${phaseOutReduction.toFixed(2)} | Final Credit: $${credit.toFixed(2)}`);
    }

    return Math.round(credit);
  }

  /**
   * Calculate Social Security and Medicare taxes
   */
  private calculatePayrollTaxes(
    totalW2Income: number,
    filingStatus: FilingStatus,
    taxYear: TaxYear
  ): {
    socialSecurityTax: number;
    medicareTax: number;
    additionalMedicareTax: number;
    totalPayrollTax: number;
  } {
    // Social Security Tax (capped at wage base for the year)
    const ssWageBase = SOCIAL_SECURITY_WAGE_BASE[taxYear];
    const socialSecurityWages = Math.min(totalW2Income, ssWageBase);
    const socialSecurityTax = socialSecurityWages * SOCIAL_SECURITY_RATE;

    // Regular Medicare Tax (no cap)
    const medicareTax = totalW2Income * MEDICARE_RATE;

    // Additional Medicare Tax (on high earners)
    const additionalMedicareThreshold = ADDITIONAL_MEDICARE_THRESHOLD[filingStatus];
    const additionalMedicareTax = totalW2Income > additionalMedicareThreshold
      ? (totalW2Income - additionalMedicareThreshold) * ADDITIONAL_MEDICARE_RATE
      : 0;

    const totalPayrollTax = socialSecurityTax + medicareTax + additionalMedicareTax;

    return {
      socialSecurityTax,
      medicareTax,
      additionalMedicareTax,
      totalPayrollTax
    };
  }

  /**
   * Calculate QBI (Qualified Business Income) Deduction - Form 8995
   * 20% deduction for qualified business income, limited by taxable income
   */
  private calculateQBIDeduction(
    netSelfEmploymentIncome: number,
    adjustedGrossIncome: number,
    deductionAmount: number,
    filingStatus: FilingStatus
  ): number {
    if (netSelfEmploymentIncome <= 0) {
      return 0;
    }

    // Form 8995 Line 1: Qualified business income
    // QBI = Net SE income - (SE tax deduction / 2)
    // We need to recalculate SE tax components for accuracy
    const { selfEmploymentTax, selfEmploymentTaxDeduction } = this.calculateSelfEmploymentTax(netSelfEmploymentIncome);

    // Qualified business income is the net SE income adjusted for SE tax deduction
    const qualifiedBusinessIncome = netSelfEmploymentIncome - selfEmploymentTaxDeduction;

    devLog(`📊 QBI Calculation (Form 8995):`);
    devLog(`  - Net SE Income: $${netSelfEmploymentIncome.toFixed(2)}`);
    devLog(`  - SE Tax Deduction: $${selfEmploymentTaxDeduction.toFixed(2)}`);
    devLog(`  - Qualified Business Income: $${qualifiedBusinessIncome.toFixed(2)}`);

    // Form 8995 Line 5: QBI component (20% of QBI)
    const qbiComponent = qualifiedBusinessIncome * 0.20;
    devLog(`  - QBI Component (20%): $${qbiComponent.toFixed(2)}`);

    // Form 8995 Line 11: Taxable income before QBI deduction
    const taxableIncomeBeforeQBI = Math.max(0, adjustedGrossIncome - deductionAmount);
    devLog(`  - Taxable Income Before QBI: $${taxableIncomeBeforeQBI.toFixed(2)}`);

    // Form 8995 Line 14: Income limitation (20% of taxable income before QBI)
    const incomeLimitation = taxableIncomeBeforeQBI * 0.20;
    devLog(`  - Income Limitation (20%): $${incomeLimitation.toFixed(2)}`);

    // Form 8995 Line 15: QBI deduction (lesser of QBI component or income limitation)
    const qbiDeduction = Math.min(qbiComponent, incomeLimitation);
    devLog(`  - QBI Deduction (lesser): $${qbiDeduction.toFixed(2)}`);

    return Math.round(qbiDeduction);
  }

  /**
   * Calculate recommended withholding based on total tax liability
   */
  private calculateRecommendedWithholding(
    finalTaxLiability: number,
    totalIncome: number,
    filingStatus: FilingStatus,
    totalPayrollTax: number,
    taxYear: TaxYear
  ): WithholdingRecommendation {
    // Annual withholding should equal the final tax liability PLUS payroll taxes
    // Payroll taxes are separate and must be withheld in addition to income tax
    const annual = finalTaxLiability + totalPayrollTax;

    // Calculate for different pay periods
    const monthly = annual / 12;
    const biweekly = annual / 26; // 26 pay periods per year
    const weekly = annual / 52;

    // Estimate recommended W-4 allowances (simplified calculation)
    // Each allowance reduces withholding by approximately $4,300 / number of pay periods
    const standardDeduction = STANDARD_DEDUCTIONS[taxYear][filingStatus];
    const allowanceValue = 4300; // Approximate value per allowance for 2024

    // Calculate how many allowances would result in appropriate withholding
    // This is a simplified calculation - actual W-4 is more complex
    let recommendedW4Allowances = 0;
    if (totalIncome > standardDeduction) {
      const withholdingRate = finalTaxLiability / totalIncome;
      // Estimate allowances based on withholding rate
      if (withholdingRate < 0.05) {
        recommendedW4Allowances = 3;
      } else if (withholdingRate < 0.10) {
        recommendedW4Allowances = 2;
      } else if (withholdingRate < 0.15) {
        recommendedW4Allowances = 1;
      } else {
        recommendedW4Allowances = 0;
      }
    }

    return {
      annual,
      monthly,
      biweekly,
      weekly,
      recommendedW4Allowances
    };
  }

  /**
   * Determine withholding status
   */
  private determineWithholdingStatus(
    totalWithheld: number,
    finalTaxLiability: number
  ): { status: 'adequate' | 'underwithholding' | 'overwithholding'; difference: number } {
    const difference = totalWithheld - finalTaxLiability;
    const percentDifference = finalTaxLiability > 0 ? Math.abs(difference) / finalTaxLiability : 0;

    // Within 10% is considered adequate
    if (percentDifference <= 0.10) {
      return { status: 'adequate', difference };
    } else if (difference < 0) {
      return { status: 'underwithholding', difference };
    } else {
      return { status: 'overwithholding', difference };
    }
  }

  /**
   * Calculate American Opportunity Credit (Form 8863)
   * Up to $2,500 per eligible student (first 4 years of post-secondary education)
   * 40% of credit is refundable
   */
  private calculateAmericanOpportunityCredit(
    form1098Ts: Form1098T[],
    adjustedGrossIncome: number,
    filingStatus: FilingStatus
  ): { totalCredit: number; refundablePortion: number } {
    // Filter for eligible students (first 4 years, at least half-time)
    const eligibleForms = form1098Ts.filter(f => !f.isGraduateStudent && f.isAtLeastHalfTime);

    if (eligibleForms.length === 0) return { totalCredit: 0, refundablePortion: 0 };

    // Check if MFS (not eligible)
    if (filingStatus === 'married_separate') return { totalCredit: 0, refundablePortion: 0 };

    // Calculate total credit before phase-out
    let totalCredit = 0;
    for (const form of eligibleForms) {
      const qualifiedExpenses = Math.max(0, form.qualifiedExpenses - form.scholarshipsGrants);
      const credit = Math.min(
        AMERICAN_OPPORTUNITY_CREDIT.maxCreditPerStudent,
        qualifiedExpenses <= 2000 ? qualifiedExpenses : 2000 + (qualifiedExpenses - 2000) * 0.25
      );
      totalCredit += credit;
    }

    // Apply phase-out
    const phaseOutStart = AMERICAN_OPPORTUNITY_CREDIT.phaseOutStart[filingStatus];
    const phaseOutEnd = AMERICAN_OPPORTUNITY_CREDIT.phaseOutEnd[filingStatus];

    if (adjustedGrossIncome >= phaseOutEnd) return { totalCredit: 0, refundablePortion: 0 };

    if (adjustedGrossIncome > phaseOutStart) {
      const phaseOutRange = phaseOutEnd - phaseOutStart;
      const excessIncome = adjustedGrossIncome - phaseOutStart;
      const phaseOutRatio = 1 - (excessIncome / phaseOutRange);
      totalCredit = totalCredit * phaseOutRatio;
    }

    const refundablePortion = totalCredit * AMERICAN_OPPORTUNITY_CREDIT.refundablePercentage;

    return { totalCredit: Math.round(totalCredit), refundablePortion: Math.round(refundablePortion) };
  }

  /**
   * Calculate Lifetime Learning Credit (Form 8863)
   * Up to $2,000 per return (20% of qualified expenses up to $10,000)
   * Non-refundable credit
   */
  private calculateLifetimeLearningCredit(
    form1098Ts: Form1098T[],
    adjustedGrossIncome: number,
    filingStatus: FilingStatus
  ): number {
    if (form1098Ts.length === 0) return 0;

    // Check if MFS (not eligible)
    if (filingStatus === 'married_separate') return 0;

    // Calculate total qualified expenses across all students
    let totalQualifiedExpenses = 0;
    for (const form of form1098Ts) {
      const qualifiedExpenses = Math.max(0, form.qualifiedExpenses - form.scholarshipsGrants);
      totalQualifiedExpenses += qualifiedExpenses;
    }

    // Credit is 20% of expenses, max $2,000
    let credit = Math.min(
      LIFETIME_LEARNING_CREDIT.maxCreditPerReturn,
      totalQualifiedExpenses * LIFETIME_LEARNING_CREDIT.creditRate
    );

    // Apply phase-out
    const phaseOutStart = LIFETIME_LEARNING_CREDIT.phaseOutStart[filingStatus];
    const phaseOutEnd = LIFETIME_LEARNING_CREDIT.phaseOutEnd[filingStatus];

    if (adjustedGrossIncome >= phaseOutEnd) return 0;

    if (adjustedGrossIncome > phaseOutStart) {
      const phaseOutRange = phaseOutEnd - phaseOutStart;
      const excessIncome = adjustedGrossIncome - phaseOutStart;
      const phaseOutRatio = 1 - (excessIncome / phaseOutRange);
      credit = credit * phaseOutRatio;
    }

    return Math.round(credit);
  }

  /**
   * Calculate state tax based on customer's state
   */
  private calculateStateTax(
    adjustedGrossIncome: number,
    taxYear: TaxYear,
    state: string,
    w2Forms: W2Form[]
  ): {
    stateTaxState: string;
    stateTaxableIncome: number;
    stateTaxLiability: number;
    stateTaxWithheld: number;
    stateTaxDue: number;
    stateTaxRefund: number;
    stateTaxRate: number;
  } {
    const stateUpper = state.toUpperCase().trim();
    const stateTaxWithheld = w2Forms.reduce((total, w2) => total + (w2.stateTaxWithheld || 0), 0);

    if (stateUpper === 'KY') {
      const kyTax = KY_STATE_TAX[taxYear];
      const stateTaxableIncome = Math.max(0, adjustedGrossIncome - kyTax.standardDeduction);
      const stateTaxLiability = Math.round(stateTaxableIncome * kyTax.rate);
      const stateTaxDue = Math.max(0, stateTaxLiability - stateTaxWithheld);
      const stateTaxRefund = Math.max(0, stateTaxWithheld - stateTaxLiability);

      devLog('📊 KY State Tax Calculation:');
      devLog(`  - AGI: $${adjustedGrossIncome.toFixed(2)}`);
      devLog(`  - KY Standard Deduction: $${kyTax.standardDeduction}`);
      devLog(`  - State Taxable Income: $${stateTaxableIncome.toFixed(2)}`);
      devLog(`  - State Tax Rate: ${(kyTax.rate * 100).toFixed(0)}%`);
      devLog(`  - State Tax Liability: $${stateTaxLiability.toFixed(2)}`);
      devLog(`  - State Tax Withheld: $${stateTaxWithheld.toFixed(2)}`);
      devLog(`  - State Tax Due: $${stateTaxDue.toFixed(2)}`);
      devLog(`  - State Tax Refund: $${stateTaxRefund.toFixed(2)}`);

      return {
        stateTaxState: 'KY',
        stateTaxableIncome,
        stateTaxLiability,
        stateTaxWithheld,
        stateTaxDue,
        stateTaxRefund,
        stateTaxRate: kyTax.rate,
      };
    }

    // Non-supported states: return zeroes
    return {
      stateTaxState: stateUpper,
      stateTaxableIncome: 0,
      stateTaxLiability: 0,
      stateTaxWithheld,
      stateTaxDue: 0,
      stateTaxRefund: 0,
      stateTaxRate: 0,
    };
  }

  /**
   * Format currency
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  }

  /**
   * Format percentage
   */
  formatPercentage(percentage: number): string {
    return `${percentage.toFixed(2)}%`;
  }
}

// Export singleton instance
export const taxCalculationService = new TaxCalculationService();
export default taxCalculationService;
