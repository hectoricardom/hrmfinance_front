/**
 * Tax Prep Section Component
 * Tax preparation progress tracker and Drake export functionality
 */

import { Component, createSignal, For, Show, createMemo } from 'solid-js';
import { Card, Button } from '../../../ui';
import type { TaxPortal, DrakeTaxDocument, DrakeTaxDocumentType } from '../../types/drakeTypes';
import { DRAKE_FORM_LABELS } from '../../types/drakeTypes';
import { generateDrakeExport, downloadCSV } from '../../services/drakeExportService';
import { generateAllIrsForms, fillForm1099Nec, fillForm1099Misc, fillForm1099Int, fillForm1099Div, fillFormW9, fillFormFromPayer, downloadPdf } from '../../services/irsPdfFillService';
import type { PayerFormAmounts } from '../../services/irsPdfFillService';
import { getAllPayers, searchPayers } from '../../services/payerApi';
import type { SavedPayer } from '../../stores/payerStore';
import { calculateTaxes, getTaxConstants, type TaxCalculationResult } from '../../services/taxPortalApi';
import ValidationChecklist from './ValidationChecklist';
import CreditDetectionPanel from './CreditDetectionPanel';
import YearOverYearComparison from './YearOverYearComparison';
import type { PreviousYearData } from '../../services/recurringClientService';
import type { TaxCalculationResult as TaxCalcResult } from '../../types/taxCalcTypes';
import { devLog } from '../../../../services/utils';

interface TaxPrepSectionProps {
  client: TaxPortal;
  documents: DrakeTaxDocument[];
  spouseDocuments?: DrakeTaxDocument[];
  linkedSpouse?: TaxPortal | null;
  taxYear: number;
  onClientChange?: (updates: Partial<TaxPortal>) => void;
  previousYearData?: PreviousYearData | null;
}

type TaxPrepStep =
  | 'documents_collected'
  | 'verified'
  | 'calculations'
  | 'review'
  | 'signatures'
  | 'filing';

interface StepConfig {
  id: TaxPrepStep;
  label: string;
  description: string;
}

const PREP_STEPS: StepConfig[] = [
  { id: 'documents_collected', label: 'Documents Collected', description: 'All tax documents uploaded' },
  { id: 'verified', label: 'Verified', description: 'Documents reviewed and verified' },
  { id: 'calculations', label: 'Calculations', description: 'Tax calculations complete' },
  { id: 'review', label: 'Review', description: 'Final review by preparer' },
  { id: 'signatures', label: 'Signatures', description: 'Client signatures obtained' },
  { id: 'filing', label: 'Filing', description: 'Return filed with IRS' }
];

/**
 * =============================================================================
 * IRS FORM 1040 FIELD MAPPING (Tax Year 2024)
 * =============================================================================
 *
 * This map documents how extracted document amounts correspond to IRS Form 1040
 * lines and how the tax calculation is performed.
 *
 * -----------------------------------------------------------------------------
 * INCOME SECTION (Form 1040 Lines 1-9)
 * -----------------------------------------------------------------------------
 *
 * Line 1a - Wages, salaries, tips (W-2 Box 1)
 *   Source: extractedAmounts.wages
 *   Documents: W-2
 *
 * Line 1b - Household employee wages (not reported on W-2)
 *   Source: Not currently captured
 *
 * Line 1c - Tip income (not reported on W-2)
 *   Source: Not currently captured
 *
 * Line 1d - Medicaid waiver payments (excludable)
 *   Source: Not currently captured
 *
 * Line 1e - Taxable dependent care benefits (W-2 Box 10)
 *   Source: Not currently captured
 *
 * Line 1f - Employer-provided adoption benefits (Form 8839)
 *   Source: Not currently captured
 *
 * Line 1g - Wages from Form 8919
 *   Source: Not currently captured
 *
 * Line 1h - Other earned income
 *   Source: extractedAmounts.otherIncome (partial)
 *
 * Line 1i - Nontaxable combat pay election
 *   Source: Not currently captured
 *
 * Line 1z - Total of lines 1a-1i → WAGES TOTAL
 *   Calculation: Sum of above
 *
 * Line 2a - Tax-exempt interest (1099-INT Box 8)
 *   Source: Not currently captured (informational only, not taxed)
 *
 * Line 2b - Taxable interest (1099-INT Box 1)
 *   Source: extractedAmounts.interestIncome
 *   Documents: 1099-INT
 *
 * Line 3a - Qualified dividends (1099-DIV Box 1b)
 *   Source: extractedAmounts.qualifiedDividends (if captured)
 *   Note: Taxed at capital gains rates (0%, 15%, or 20%)
 *
 * Line 3b - Ordinary dividends (1099-DIV Box 1a)
 *   Source: extractedAmounts.ordinaryDividends
 *   Documents: 1099-DIV
 *
 * Line 4a - IRA distributions (1099-R)
 *   Source: Not currently captured
 *
 * Line 4b - Taxable IRA distributions
 *   Source: Not currently captured
 *
 * Line 5a - Pensions and annuities (1099-R)
 *   Source: Not currently captured
 *
 * Line 5b - Taxable pensions and annuities
 *   Source: Not currently captured
 *
 * Line 6a - Social Security benefits (SSA-1099)
 *   Source: Not currently captured
 *
 * Line 6b - Taxable Social Security benefits
 *   Source: Not currently captured (up to 85% may be taxable)
 *
 * Line 7 - Capital gain or loss (Schedule D / Form 8949)
 *   Source: Not currently captured
 *   Documents: 1099-B
 *
 * Line 8 - Other income (Schedule 1, Line 10)
 *   Source: extractedAmounts.otherIncome
 *   Includes: 1099-NEC, 1099-MISC, rental income, etc.
 *
 *   Schedule 1 Income Breakdown:
 *   - Line 1: Taxable refunds of state/local taxes
 *   - Line 2a: Alimony received
 *   - Line 3: Business income (Schedule C)
 *       → extractedAmounts.nonEmployeeCompensation (1099-NEC Box 1)
 *   - Line 4: Other gains/losses (Form 4797)
 *   - Line 5: Rental income (Schedule E)
 *       → extractedAmounts.rents (1099-MISC Box 1)
 *       → extractedAmounts.royalties (1099-MISC Box 2)
 *   - Line 6: Farm income (Schedule F)
 *   - Line 7: Unemployment compensation (1099-G Box 1)
 *   - Line 8a-8z: Other income types
 *
 * Line 9 - TOTAL INCOME (sum of lines 1z, 2b, 3b, 4b, 5b, 6b, 7, 8)
 *   Calculation: totalIncome in our code
 *
 * -----------------------------------------------------------------------------
 * ADJUSTMENTS TO INCOME (Schedule 1, Part II - Lines 11-26)
 * -----------------------------------------------------------------------------
 *
 * Line 10 - Adjustments to income (Schedule 1, Line 26)
 *   Source: Not currently captured
 *   Common adjustments:
 *   - Educator expenses (Line 11)
 *   - HSA deduction (Line 13)
 *   - Self-employment tax deduction (Line 15) - 50% of SE tax
 *   - Self-employed SEP/SIMPLE/qualified plans (Line 16)
 *   - Self-employed health insurance (Line 17)
 *   - Student loan interest (Line 21) - up to $2,500
 *   - IRA deduction (Line 20)
 *
 * Line 11 - ADJUSTED GROSS INCOME (AGI) = Line 9 - Line 10
 *   Note: Our calculation does not currently apply adjustments
 *
 * -----------------------------------------------------------------------------
 * DEDUCTIONS (Lines 12-14)
 * -----------------------------------------------------------------------------
 *
 * Line 12 - Standard deduction OR Itemized deductions (Schedule A)
 *
 *   STANDARD DEDUCTION BY YEAR:
 *   ┌─────────────────────────────┬────────────┬────────────┐
 *   │ Filing Status               │ 2024       │ 2025       │
 *   ├─────────────────────────────┼────────────┼────────────┤
 *   │ Single                      │ $14,600    │ $15,000    │
 *   │ Married Filing Jointly      │ $29,200    │ $30,000    │
 *   │ Married Filing Separately   │ $14,600    │ $15,000    │
 *   │ Head of Household           │ $21,900    │ $22,500    │
 *   │ Qualifying Surviving Spouse │ $29,200    │ $30,000    │
 *   └─────────────────────────────┴────────────┴────────────┘
 *
 *   Additional standard deduction for age 65+ or blind:
 *   ┌─────────────────────────────┬────────────┬────────────┐
 *   │ Filing Status               │ 2024       │ 2025       │
 *   ├─────────────────────────────┼────────────┼────────────┤
 *   │ Single/HOH (each)           │ +$1,950    │ +$2,000    │
 *   │ Married (each)              │ +$1,550    │ +$1,600    │
 *   └─────────────────────────────┴────────────┴────────────┘
 *
 *   ITEMIZED DEDUCTIONS (Schedule A):
 *   - Medical expenses exceeding 7.5% of AGI
 *   - State/local taxes (SALT) - capped at $10,000
 *   - Mortgage interest
 *   - Charitable contributions
 *   - Casualty losses (federally declared disasters)
 *
 * Line 13 - Qualified business income deduction (Form 8995)
 *   Source: Not currently captured
 *   Note: Up to 20% of qualified business income
 *
 * Line 14 - Total deductions (Line 12 + Line 13)
 *
 * Line 15 - TAXABLE INCOME = Line 11 - Line 14
 *   Calculation: taxableIncome = totalIncome - standardDeduction
 *   Note: Our simplified calculation skips AGI adjustments
 *
 * -----------------------------------------------------------------------------
 * TAX CALCULATION (Lines 16-24)
 * -----------------------------------------------------------------------------
 *
 * Line 16 - Tax (from Tax Table, Tax Computation Worksheet, or Schedule D)
 *
 *   ╔═══════════════════════════════════════════════════════════════════════════╗
 *   ║                         2024 TAX BRACKETS                                 ║
 *   ╚═══════════════════════════════════════════════════════════════════════════╝
 *
 *   SINGLE (2024):
 *   ┌─────────────────────────┬──────────┬─────────────────────────────┐
 *   │ Taxable Income          │ Rate     │ Tax Calculation             │
 *   ├─────────────────────────┼──────────┼─────────────────────────────┤
 *   │ $0 - $11,600            │ 10%      │ income × 0.10               │
 *   │ $11,601 - $47,150       │ 12%      │ $1,160 + (income-11600)×12% │
 *   │ $47,151 - $100,525      │ 22%      │ $5,426 + (income-47150)×22% │
 *   │ $100,526 - $191,950     │ 24%      │ $17,168.50 + (inc-100525)×24%│
 *   │ $191,951 - $243,725     │ 32%      │ $39,110.50 + (inc-191950)×32%│
 *   │ $243,726 - $609,350     │ 35%      │ $55,678.50 + (inc-243725)×35%│
 *   │ Over $609,350           │ 37%      │ $183,647.25 + (inc-609350)×37%│
 *   └─────────────────────────┴──────────┴─────────────────────────────┘
 *
 *   MARRIED FILING JOINTLY (2024):
 *   ┌─────────────────────────┬──────────┬─────────────────────────────┐
 *   │ Taxable Income          │ Rate     │ Tax Calculation             │
 *   ├─────────────────────────┼──────────┼─────────────────────────────┤
 *   │ $0 - $23,200            │ 10%      │ income × 0.10               │
 *   │ $23,201 - $94,300       │ 12%      │ $2,320 + (income-23200)×12% │
 *   │ $94,301 - $201,050      │ 22%      │ $10,852 + (income-94300)×22%│
 *   │ $201,051 - $383,900     │ 24%      │ $34,337 + (inc-201050)×24%  │
 *   │ $383,901 - $487,450     │ 32%      │ $78,221 + (inc-383900)×32%  │
 *   │ $487,451 - $731,200     │ 35%      │ $111,357 + (inc-487450)×35% │
 *   │ Over $731,200           │ 37%      │ $196,669.50 + (inc-731200)×37%│
 *   └─────────────────────────┴──────────┴─────────────────────────────┘
 *
 *   HEAD OF HOUSEHOLD (2024):
 *   ┌─────────────────────────┬──────────┬─────────────────────────────┐
 *   │ Taxable Income          │ Rate     │ Tax Calculation             │
 *   ├─────────────────────────┼──────────┼─────────────────────────────┤
 *   │ $0 - $16,550            │ 10%      │ income × 0.10               │
 *   │ $16,551 - $63,100       │ 12%      │ $1,655 + (income-16550)×12% │
 *   │ $63,101 - $100,500      │ 22%      │ $7,241 + (income-63100)×22% │
 *   │ $100,501 - $191,950     │ 24%      │ $15,469 + (inc-100500)×24%  │
 *   │ $191,951 - $243,700     │ 32%      │ $37,417 + (inc-191950)×32%  │
 *   │ $243,701 - $609,350     │ 35%      │ $53,977 + (inc-243700)×35%  │
 *   │ Over $609,350           │ 37%      │ $181,954.50 + (inc-609350)×37%│
 *   └─────────────────────────┴──────────┴─────────────────────────────┘
 *
 *   ╔═══════════════════════════════════════════════════════════════════════════╗
 *   ║                         2025 TAX BRACKETS                                 ║
 *   ╚═══════════════════════════════════════════════════════════════════════════╝
 *
 *   SINGLE (2025):
 *   ┌─────────────────────────┬──────────┬─────────────────────────────┐
 *   │ Taxable Income          │ Rate     │ Tax Calculation             │
 *   ├─────────────────────────┼──────────┼─────────────────────────────┤
 *   │ $0 - $11,925            │ 10%      │ income × 0.10               │
 *   │ $11,926 - $48,475       │ 12%      │ $1,192.50 + (inc-11925)×12% │
 *   │ $48,476 - $103,350      │ 22%      │ $5,578.50 + (inc-48475)×22% │
 *   │ $103,351 - $197,300     │ 24%      │ $17,651 + (inc-103350)×24%  │
 *   │ $197,301 - $250,525     │ 32%      │ $40,199 + (inc-197300)×32%  │
 *   │ $250,526 - $626,350     │ 35%      │ $57,231 + (inc-250525)×35%  │
 *   │ Over $626,350           │ 37%      │ $188,769.75 + (inc-626350)×37%│
 *   └─────────────────────────┴──────────┴─────────────────────────────┘
 *
 *   MARRIED FILING JOINTLY (2025):
 *   ┌─────────────────────────┬──────────┬─────────────────────────────┐
 *   │ Taxable Income          │ Rate     │ Tax Calculation             │
 *   ├─────────────────────────┼──────────┼─────────────────────────────┤
 *   │ $0 - $23,850            │ 10%      │ income × 0.10               │
 *   │ $23,851 - $96,950       │ 12%      │ $2,385 + (income-23850)×12% │
 *   │ $96,951 - $206,700      │ 22%      │ $11,157 + (income-96950)×22%│
 *   │ $206,701 - $394,600     │ 24%      │ $35,302 + (inc-206700)×24%  │
 *   │ $394,601 - $501,050     │ 32%      │ $80,398 + (inc-394600)×32%  │
 *   │ $501,051 - $751,600     │ 35%      │ $114,462 + (inc-501050)×35% │
 *   │ Over $751,600           │ 37%      │ $202,154.50 + (inc-751600)×37%│
 *   └─────────────────────────┴──────────┴─────────────────────────────┘
 *
 *   HEAD OF HOUSEHOLD (2025):
 *   ┌─────────────────────────┬──────────┬─────────────────────────────┐
 *   │ Taxable Income          │ Rate     │ Tax Calculation             │
 *   ├─────────────────────────┼──────────┼─────────────────────────────┤
 *   │ $0 - $17,000            │ 10%      │ income × 0.10               │
 *   │ $17,001 - $64,850       │ 12%      │ $1,700 + (income-17000)×12% │
 *   │ $64,851 - $103,350      │ 22%      │ $7,442 + (income-64850)×22% │
 *   │ $103,351 - $197,300     │ 24%      │ $15,912 + (inc-103350)×24%  │
 *   │ $197,301 - $250,500     │ 32%      │ $38,460 + (inc-197300)×32%  │
 *   │ $250,501 - $626,350     │ 35%      │ $55,484 + (inc-250500)×35%  │
 *   │ Over $626,350           │ 37%      │ $187,032 + (inc-626350)×37% │
 *   └─────────────────────────┴──────────┴─────────────────────────────┘
 *
 *   Note: Married Filing Separately uses same brackets as Single for both years
 *
 * Line 17 - Amount from Schedule 2, Line 3 (additional taxes)
 *   Source: Not currently captured
 *   Includes:
 *   - Alternative Minimum Tax (AMT)
 *   - Excess advance premium tax credit repayment
 *
 * Line 18 - Add Lines 16 and 17 = TOTAL TAX BEFORE CREDITS
 *
 * Line 19 - Child tax credit / credit for other dependents (Schedule 8812)
 *   Source: Not currently captured
 *   - $2,000 per qualifying child under 17
 *   - $500 per other dependent
 *
 * Line 20 - Amount from Schedule 3, Line 8 (nonrefundable credits)
 *   Source: Not currently captured
 *   Includes:
 *   - Foreign tax credit
 *   - Education credits
 *   - Retirement savings credit
 *   - Residential energy credits
 *
 * Line 21 - Add Lines 19 and 20 = TOTAL CREDITS
 *
 * Line 22 - Subtract Line 21 from Line 18 = TAX AFTER CREDITS
 *
 * Line 23 - Other taxes (Schedule 2, Line 21)
 *   Source: Not currently captured
 *   Includes:
 *   - Self-employment tax (Schedule SE)
 *       → 15.3% on net self-employment income up to $168,600 (2024)
 *       → 2.9% Medicare on amounts over $168,600
 *       → 0.9% Additional Medicare on amounts over $200,000 (single)
 *   - Household employment taxes
 *   - Additional tax on IRAs/retirement plans
 *   - Net Investment Income Tax (3.8%)
 *
 * Line 24 - TOTAL TAX = Line 22 + Line 23
 *   Calculation: estimatedTax in our code
 *   Note: Our calculation does not include self-employment tax
 *
 * -----------------------------------------------------------------------------
 * PAYMENTS / WITHHOLDING (Lines 25-33)
 * -----------------------------------------------------------------------------
 *
 * Line 25a - Federal income tax withheld from W-2 (Box 2)
 *   Source: extractedAmounts.federalTaxWithheld
 *   Documents: W-2
 *
 * Line 25b - Federal income tax withheld from 1099s
 *   Source: extractedAmounts.federalTaxWithheld1099
 *   Documents: 1099-INT (Box 4), 1099-DIV (Box 4), 1099-R (Box 4), etc.
 *
 * Line 25c - Other withholding (W-2G, etc.)
 *   Source: Not currently captured
 *
 * Line 25d - Total withholding = 25a + 25b + 25c
 *   Calculation: totalWithholding in our code
 *
 * Line 26 - Estimated tax payments (1040-ES)
 *   Source: Not currently captured
 *
 * Line 27 - Earned Income Credit (EIC)
 *   Source: Not currently captured
 *
 * Line 28 - Additional child tax credit (refundable portion)
 *   Source: Not currently captured
 *
 * Line 29 - American Opportunity Credit (refundable portion)
 *   Source: Not currently captured
 *
 * Line 31 - Amount from Schedule 3, Line 15 (other refundable credits)
 *   Source: Not currently captured
 *
 * Line 32 - Other payments (Form 4136, etc.)
 *   Source: Not currently captured
 *
 * Line 33 - TOTAL PAYMENTS = Sum of Lines 25d through 32
 *   Calculation: totalWithholding (simplified)
 *
 * -----------------------------------------------------------------------------
 * REFUND OR AMOUNT OWED (Lines 34-38)
 * -----------------------------------------------------------------------------
 *
 * Line 34 - If Line 33 > Line 24: REFUND = Line 33 - Line 24
 *   Calculation: estimatedRefund = totalWithholding - estimatedTax (if positive)
 *
 * Line 37 - If Line 24 > Line 33: AMOUNT OWED = Line 24 - Line 33
 *   Calculation: estimatedOwed = estimatedTax - totalWithholding (if positive)
 *
 * -----------------------------------------------------------------------------
 * DOCUMENT TO 1040 LINE MAPPING SUMMARY
 * -----------------------------------------------------------------------------
 *
 * W-2 (Wage and Tax Statement):
 *   Box 1  → Line 1a (Wages)
 *   Box 2  → Line 25a (Federal tax withheld)
 *   Box 3  → Social Security wages (not on 1040 directly)
 *   Box 4  → Social Security tax withheld (not on 1040 directly)
 *   Box 5  → Medicare wages (not on 1040 directly)
 *   Box 6  → Medicare tax withheld (not on 1040 directly)
 *   Box 12 → Various codes (retirement, health insurance, etc.)
 *   Box 17 → State income tax withheld
 *
 * 1099-INT (Interest Income):
 *   Box 1  → Line 2b (Taxable interest)
 *   Box 4  → Line 25b (Federal tax withheld)
 *   Box 8  → Line 2a (Tax-exempt interest)
 *
 * 1099-DIV (Dividends):
 *   Box 1a → Line 3b (Ordinary dividends)
 *   Box 1b → Line 3a (Qualified dividends)
 *   Box 4  → Line 25b (Federal tax withheld)
 *
 * 1099-NEC (Nonemployee Compensation):
 *   Box 1  → Schedule C / Schedule 1 Line 3 (Self-employment income)
 *   Box 4  → Line 25b (Federal tax withheld)
 *   Note: Subject to self-employment tax!
 *
 * 1099-MISC (Miscellaneous Income):
 *   Box 1  → Schedule E (Rents)
 *   Box 2  → Schedule E (Royalties)
 *   Box 3  → Line 8 / Schedule 1 (Other income)
 *   Box 4  → Line 25b (Federal tax withheld)
 *
 * 1099-R (Retirement Distributions):
 *   Box 1  → Line 4a/5a (Total distribution)
 *   Box 2a → Line 4b/5b (Taxable amount)
 *   Box 4  → Line 25b (Federal tax withheld)
 *
 * 1099-G (Government Payments):
 *   Box 1  → Schedule 1 Line 7 (Unemployment)
 *   Box 2  → Schedule 1 Line 1 (State tax refund, if itemized prior year)
 *   Box 4  → Line 25b (Federal tax withheld)
 *
 * SSA-1099 (Social Security Benefits):
 *   Box 5  → Line 6a (Total benefits)
 *   Taxable portion calculated → Line 6b (0%, 50%, or 85% taxable)
 *
 * =============================================================================
 */

// Using TaxCalculationResult from taxPortalApi for the detailed 1040 breakdown

const TaxPrepSection: Component<TaxPrepSectionProps> = (props) => {
  const [isCalculating, setIsCalculating] = createSignal(false);
  const [isExporting, setIsExporting] = createSignal(false);
  const [isGeneratingForms, setIsGeneratingForms] = createSignal(false);
  const [calculationResult, setCalculationResult] = createSignal<TaxCalculationResult | null>(null);

  // For backward compatibility
  const legacyResult = () => {
    const result = calculationResult();
    if (!result) return null;
    return {
      totalIncome: result.line9_totalIncome,
      totalWithholding: result.line25d_totalWithholding,
      estimatedRefund: result.line34_refund,
      estimatedOwed: result.line37_amountOwed
    };
  };
  const [exportMessage, setExportMessage] = createSignal<{ type: 'success' | 'error'; text: string } | null>(null);

  // Step progression state
  const [reviewCompleted, setReviewCompleted] = createSignal(false);
  const [signaturesObtained, setSignaturesObtained] = createSignal(false);
  const [returnFiled, setReturnFiled] = createSignal(false);

  // Calculate current step based on document status and progression
  const currentStep = createMemo((): TaxPrepStep => {
    const docs = props.documents;
    const totalDocs = docs.length;
    const verifiedDocs = docs.filter(d => d.verified).length;

    // Step 6: Filing complete
    if (returnFiled()) return 'filing';

    // Step 5: Signatures obtained
    if (signaturesObtained()) return 'signatures';

    // Step 4: Review completed
    if (reviewCompleted()) return 'review';

    // Step 3: Calculations done
    if (calculationResult()) return 'calculations';

    // Step 2: All documents verified
    if (totalDocs > 0 && verifiedDocs === totalDocs) return 'verified';

    // Step 1: Collecting documents
    return 'documents_collected';
  });

  // Get step index
  const getStepIndex = (step: TaxPrepStep): number => {
    return PREP_STEPS.findIndex(s => s.id === step);
  };

  // Document stats
  const docStats = createMemo(() => {
    const docs = props.documents;
    return {
      total: docs.length,
      verified: docs.filter(d => d.verified).length,
      pending: docs.filter(d => !d.verified && d.uploadStatus !== 'error').length,
      errors: docs.filter(d => d.uploadStatus === 'error').length
    };
  });

  // Combine taxpayer and spouse documents
  const allDocuments = createMemo(() => {
    const taxpayerDocs = props.documents || [];
    const spouseDocs = props.spouseDocuments || [];
    return [...taxpayerDocs, ...spouseDocs];
  });

  // Document exclusion for what-if scenarios (local state, not persisted)
  const [excludedDocIds, setExcludedDocIds] = createSignal<Set<string>>(new Set());

  const toggleDocumentExclusion = (docId: string) => {
    setExcludedDocIds(prev => {
      const next = new Set(prev);
      next.has(docId) ? next.delete(docId) : next.add(docId);
      return next;
    });
    setCalculationResult(null);
  };

  // Active documents (filtered by exclusion set)
  const activeDocuments = createMemo(() => {
    return allDocuments().filter(doc => !excludedDocIds().has(doc.id));
  });

  // Helper to get display info for a document
  const getDocDisplayInfo = (doc: DrakeTaxDocument): { amount: number; label: string; payer: string } => {
    const amounts = doc.extractedAmounts;
    const payer = doc.payerInfo?.name || doc.extractedData?.payerName || doc.originalFileName;

    if (!amounts) return { amount: 0, label: '', payer };

    switch (doc.drakeFormType) {
      case 'w2':
        return { amount: amounts.wages || 0, label: 'Wages', payer };
      case '1099_int':
        return { amount: amounts.interestIncome || 0, label: 'Interest', payer };
      case '1099_div':
        return { amount: amounts.ordinaryDividends || 0, label: 'Dividends', payer };
      case '1099_nec':
        return { amount: amounts.nonEmployeeCompensation || 0, label: 'NEC', payer };
      case '1099_misc':
        return { amount: amounts.otherIncome || amounts.rents || 0, label: amounts.rents ? 'Rents' : 'Other', payer };
      case '1098':
        return { amount: amounts.mortgageInterest || 0, label: 'Mortgage Int.', payer };
      case '1098_t':
        return { amount: amounts.paymentsReceived || 0, label: 'Tuition', payer };
      case 'schedule_k1':
        return { amount: amounts.ordinaryBusinessIncome || 0, label: 'Business Inc.', payer };
      case '1095_a':
        return { amount: amounts.annualPremiumAmount || 0, label: 'Premium', payer };
      case '1099_g':
        return { amount: amounts.unemploymentCompensation || 0, label: 'Unemployment', payer };
      default:
        return { amount: 0, label: '', payer };
    }
  };

  // Short form type label for badge display
  const getFormBadge = (formType?: DrakeTaxDocumentType): string => {
    if (!formType) return 'Other';
    const label = DRAKE_FORM_LABELS[formType] || formType;
    // Extract just the form name part (e.g. "W-2" from "W-2 (Wages)")
    const match = label.match(/^([^(]+)/);
    return match ? match[1].trim() : label;
  };

  // Combine and filter dependents (exclude those marked as excludeFromCalculation)
  const activeDependents = createMemo(() => {
    const taxpayerDeps = props.client.dependents || [];
    const spouseDeps = props.linkedSpouse?.dependents || [];

    // Combine taxpayer and spouse dependents, remove duplicates by SSN
    const combined = [...taxpayerDeps];
    for (const dep of spouseDeps) {
      const exists = combined.some(d => d.ssn && dep.ssn && d.ssn === dep.ssn);
      if (!exists) {
        combined.push(dep);
      }
    }

    // Filter out excluded dependents
    return combined.filter(d => !d.excludeFromCalculation);
  });

  // All dependents (including excluded) for toggle display
  const allDependents = createMemo(() => {
    const taxpayerDeps = props.client.dependents || [];
    const spouseDeps = props.linkedSpouse?.dependents || [];

    const combined = [...taxpayerDeps];
    for (const dep of spouseDeps) {
      const exists = combined.some(d => d.ssn && dep.ssn && d.ssn === dep.ssn);
      if (!exists) {
        combined.push({ ...dep, _isSpouseDependent: true });
      }
    }
    return combined;
  });

  // Toggle dependent inclusion in calculation
  const toggleDependentExclusion = (dependentIndex: number) => {
    if (!props.onClientChange) return;

    const dependents = [...(props.client.dependents || [])];
    if (dependentIndex < dependents.length) {
      dependents[dependentIndex] = {
        ...dependents[dependentIndex],
        excludeFromCalculation: !dependents[dependentIndex].excludeFromCalculation
      };
      props.onClientChange({ dependents });
      setCalculationResult(null);
    }
  };

  // Run tax calculation using the API
  const handleRunCalculation = async () => {
    setIsCalculating(true);
    setExportMessage(null);

    try {
      // Extract strategy adjustments for manual overrides
      const strategyAdjustments = props.client.taxStrategy?.otherIncome?.adjustments;
      const schedule2Taxes = props.client.taxStrategy?.otherIncome?.schedule2Taxes;

      // Sum all Schedule 2 taxes
      const totalSchedule2Tax = (
        (schedule2Taxes?.excessPtcRepayment?.amount || 0) +
        (schedule2Taxes?.selfEmploymentTax?.amount || 0) +
        (schedule2Taxes?.unreportedSocialSecurityTax?.amount || 0) +
        (schedule2Taxes?.additionalTaxOnIra?.amount || 0) +
        (schedule2Taxes?.householdEmploymentTax?.amount || 0) +
        (schedule2Taxes?.netInvestmentIncomeTax?.amount || 0)
      );

      const calculationOptions = {
        qbid: strategyAdjustments?.qbid?.amount || 0,
        schedule1ADeductions: strategyAdjustments?.schedule1ADeductions?.amount || 0,
        schedule2Tax: totalSchedule2Tax,
      };

      // Create client with filtered dependents for calculation
      const clientForCalculation = {
        ...props.client,
        dependents: activeDependents()
      };

      // Combine taxpayer + spouse documents for calculation (filtered by toggle exclusions)
      const combinedDocuments = activeDocuments();

      console.log('[TAX PREP] Running calculation with:');
      console.log('[TAX PREP] - Taxpayer documents:', props.documents.length);
      console.log('[TAX PREP] - Spouse documents:', props.spouseDocuments?.length || 0);
      console.log('[TAX PREP] - Combined documents:', combinedDocuments.length);
      console.log('[TAX PREP] - Active dependents:', activeDependents().length);

      // Use the centralized tax calculation API
      const result = await calculateTaxes(
        props.client.id,
        props.taxYear,
        combinedDocuments,
        clientForCalculation,
        calculationOptions
      );

      console.log('[TAX PREP] Calculation result received, setting state:', result.line9_totalIncome, 'total income');
      setCalculationResult(result);
      console.log('[TAX PREP] calculationResult signal updated, should render 1040 section');
    } catch (error) {
      console.error('[TAX PREP] Calculation error:', error);
      setExportMessage({ type: 'error', text: `Error running tax calculation: ${error instanceof Error ? error.message : String(error)}` });
    } finally {
      setIsCalculating(false);
    }
  };

  // Export to Drake
  const handleExportToDrake = async () => {
    setIsExporting(true);
    setExportMessage(null);

    try {
      // Convert TaxPortal to NotaryCustomer-like object for the export service
      const clientData = {
        id: props.client.id,
        firstName: props.client.firstName,
        middleName: props.client.middleName,
        lastName: props.client.lastName,
        ss: props.client.ssn,
        residences: props.client.address ? {
          current: {
            addressLineOne: props.client.address,
            city: props.client.city,
            state: props.client.state,
            zipcode: props.client.zipCode
          }
        } : undefined
      } as any;

      const result = generateDrakeExport(
        clientData,
        props.documents,
        {
          taxYear: props.taxYear as any,
          clientId: props.client.id,
          outputFormat: 'csv',
          includeHeaders: true
        }
      );

      if (result.success && result.csvData && result.fileName) {
        downloadCSV(result.csvData, result.fileName);
        setExportMessage({
          type: 'success',
          text: `Successfully exported ${result.recordCount} records to ${result.fileName}`
        });
      } else {
        setExportMessage({
          type: 'error',
          text: result.errors?.[0] || 'Export failed'
        });
      }
    } catch (error) {
      setExportMessage({
        type: 'error',
        text: (error as Error).message || 'Error exporting to Drake'
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Generate IRS Forms (filled PDFs)
  const handleGenerateIrsForms = async () => {
    setIsGeneratingForms(true);
    setExportMessage(null);

    try {
      const verifiedDocs = props.documents.filter(d =>
        d.verified && ['1099_nec', '1099_misc', '1099_int', '1099_div'].includes(d.drakeFormType || '')
      );

      if (verifiedDocs.length === 0) {
        setExportMessage({ type: 'error', text: 'No verified 1099 documents found to generate forms' });
        return;
      }

      const result = await generateAllIrsForms(verifiedDocs, props.client, props.taxYear);

      if (result.errors.length > 0 && result.generated.length === 0) {
        setExportMessage({ type: 'error', text: `Form generation failed: ${result.errors.join('; ')}` });
      } else if (result.errors.length > 0) {
        setExportMessage({
          type: 'success',
          text: `Generated ${result.generated.length} form(s): ${result.generated.join(', ')}. Errors: ${result.errors.join('; ')}`
        });
      } else {
        setExportMessage({
          type: 'success',
          text: `Generated ${result.generated.length} IRS form(s): ${result.generated.join(', ')}`
        });
      }
    } catch (error) {
      setExportMessage({
        type: 'error',
        text: (error as Error).message || 'Error generating IRS forms'
      });
    } finally {
      setIsGeneratingForms(false);
    }
  };

  // Generate IRS forms for a single payer/document (1099 + W-9)
  const FILL_BY_TYPE: Record<string, (doc: DrakeTaxDocument, client: TaxPortal, year: number) => Promise<Uint8Array>> = {
    '1099_nec': fillForm1099Nec,
    '1099_misc': fillForm1099Misc,
    '1099_int': fillForm1099Int,
    '1099_div': fillForm1099Div,
  };

  const FORM_LABEL: Record<string, string> = {
    '1099_nec': '1099-NEC',
    '1099_misc': '1099-MISC',
    '1099_int': '1099-INT',
    '1099_div': '1099-DIV',
  };

  const [generatingDocId, setGeneratingDocId] = createSignal<string | null>(null);
  const [showPayerPicker, setShowPayerPicker] = createSignal(false);
  const [showPayerSearch, setShowPayerSearch] = createSignal(false);
  const [payerSearchQuery, setPayerSearchQuery] = createSignal('');
  const [payerSearchResults, setPayerSearchResults] = createSignal<SavedPayer[]>([]);
  const [selectedApiPayer, setSelectedApiPayer] = createSignal<SavedPayer | null>(null);
  const [payerFormType, setPayerFormType] = createSignal<'1099_nec' | '1099_misc' | '1099_int' | '1099_div'>('1099_nec');
  const [payerAmount, setPayerAmount] = createSignal('');
  const [isLoadingPayers, setIsLoadingPayers] = createSignal(false);

  const verified1099Docs = createMemo(() =>
    props.documents.filter(d =>
      d.verified && ['1099_nec', '1099_misc', '1099_int', '1099_div'].includes(d.drakeFormType || '')
    )
  );

  // Load all payers when payer search opens
  const loadPayers = async (query?: string) => {
    setIsLoadingPayers(true);
    try {
      const result = query && query.length > 0
        ? await searchPayers(query)
        : await getAllPayers();
      setPayerSearchResults(result.payers);
    } catch {
      setPayerSearchResults([]);
    } finally {
      setIsLoadingPayers(false);
    }
  };

  // Generate 1099 from selected API payer
  const handleGenerateFromPayer = async () => {
    const payer = selectedApiPayer();
    if (!payer) return;

    const amountNum = parseFloat(payerAmount());
    if (isNaN(amountNum) || amountNum <= 0) {
      setExportMessage({ type: 'error', text: 'Enter a valid amount' });
      return;
    }

    setIsGeneratingForms(true);
    setExportMessage(null);

    const formType = payerFormType();
    const amounts: PayerFormAmounts = {};

    // Map amount to the correct field based on form type
    if (formType === '1099_nec') amounts.nonEmployeeCompensation = amountNum;
    else if (formType === '1099_misc') amounts.rents = amountNum;
    else if (formType === '1099_int') amounts.interestIncome = amountNum;
    else if (formType === '1099_div') amounts.ordinaryDividends = amountNum;

    const clientName = `${props.client.lastName}_${props.client.firstName}`.replace(/\s+/g, '_');
    const payerName = payer.name.replace(/\s+/g, '_').substring(0, 30);

    try {
      // Generate 1099
      const pdfBytes = await fillFormFromPayer(payer, props.client, formType, amounts, props.taxYear);
      downloadPdf(pdfBytes, `${FORM_LABEL[formType]}_${clientName}_${payerName}_${props.taxYear}.pdf`);

      // Also generate W-9
      const w9Bytes = await fillFormW9(props.client);
      downloadPdf(w9Bytes, `W-9_${clientName}_${props.taxYear}.pdf`);

      setExportMessage({ type: 'success', text: `Generated ${FORM_LABEL[formType]} + W-9 for ${payer.name}` });
      setShowPayerSearch(false);
      setShowPayerPicker(false);
      setSelectedApiPayer(null);
      setPayerAmount('');
    } catch (err) {
      setExportMessage({ type: 'error', text: `Failed: ${err instanceof Error ? err.message : 'Unknown error'}` });
    } finally {
      setIsGeneratingForms(false);
    }
  };

  const handleGenerateForPayer = async (doc: DrakeTaxDocument, e: MouseEvent) => {
    e.stopPropagation(); // Don't toggle the document exclusion
    const formType = doc.drakeFormType;
    if (!formType || !FILL_BY_TYPE[formType]) return;

    setGeneratingDocId(doc.id);
    setExportMessage(null);

    const clientName = `${props.client.lastName}_${props.client.firstName}`.replace(/\s+/g, '_');
    const payerName = (doc.payerInfo?.name || 'Unknown').replace(/\s+/g, '_').substring(0, 30);
    const generated: string[] = [];
    const errors: string[] = [];

    try {
      // Generate the 1099 form
      const fillFn = FILL_BY_TYPE[formType];
      const pdfBytes = await fillFn(doc, props.client, props.taxYear);
      const filename = `${FORM_LABEL[formType]}_${clientName}_${payerName}_${props.taxYear}.pdf`;
      downloadPdf(pdfBytes, filename);
      generated.push(FORM_LABEL[formType]);
    } catch (err) {
      errors.push(`${FORM_LABEL[formType]}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }

    try {
      // Generate W-9 for the client
      const w9Bytes = await fillFormW9(props.client);
      const w9Filename = `W-9_${clientName}_${props.taxYear}.pdf`;
      downloadPdf(w9Bytes, w9Filename);
      generated.push('W-9');
    } catch (err) {
      errors.push(`W-9: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }

    if (errors.length > 0 && generated.length === 0) {
      setExportMessage({ type: 'error', text: `Failed: ${errors.join('; ')}` });
    } else if (errors.length > 0) {
      setExportMessage({ type: 'success', text: `Generated ${generated.join(' + ')} for ${doc.payerInfo?.name || 'payer'}. Errors: ${errors.join('; ')}` });
    } else {
      setExportMessage({ type: 'success', text: `Generated ${generated.join(' + ')} for ${doc.payerInfo?.name || 'payer'}` });
    }

    setGeneratingDocId(null);
  };

  // Styles
  const sectionStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    gap: '1.5rem'
  };

  const headerStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'flex-wrap': 'wrap' as const,
    gap: '1rem'
  };

  const titleStyle = {
    'font-size': '1.25rem',
    'font-weight': '600',
    color: 'var(--text-primary, #1f2937)',
    margin: '0'
  };

  const subtitleStyle = {
    'font-size': '0.875rem',
    color: 'var(--text-secondary, #6b7280)',
    'margin-top': '0.25rem'
  };

  // Progress bar styles
  const progressContainerStyle = {
    position: 'relative' as const,
    padding: '2rem 1rem'
  };

  const progressTrackStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    position: 'relative' as const
  };

  const progressLineStyle = {
    position: 'absolute' as const,
    top: '20px',
    left: '50px',
    right: '50px',
    height: '4px',
    background: 'var(--border-color, #e5e7eb)',
    'z-index': '0'
  };

  const progressLineFillStyle = (progress: number) => ({
    position: 'absolute' as const,
    top: '0',
    left: '0',
    height: '100%',
    width: `${progress}%`,
    background: 'linear-gradient(90deg, #22c55e 0%, #3b82f6 100%)',
    'border-radius': '2px',
    transition: 'width 0.5s ease'
  });

  const stepStyle = (isActive: boolean, isComplete: boolean, isCurrent: boolean) => ({
    display: 'flex',
    'flex-direction': 'column' as const,
    'align-items': 'center',
    gap: '0.5rem',
    position: 'relative' as const,
    'z-index': '1',
    flex: '1',
    'max-width': '120px'
  });

  const stepCircleStyle = (isActive: boolean, isComplete: boolean, isCurrent: boolean) => ({
    width: isCurrent ? '44px' : '40px',
    height: isCurrent ? '44px' : '40px',
    'border-radius': '50%',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    background: isComplete ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
              : isCurrent ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
              : 'white',
    border: isComplete || isCurrent ? 'none' : '2px solid var(--border-color, #e5e7eb)',
    color: isComplete || isCurrent ? 'white' : 'var(--text-secondary, #6b7280)',
    'font-weight': '600',
    'font-size': '0.875rem',
    transition: 'all 0.3s ease',
    'box-shadow': isCurrent ? '0 4px 12px rgba(59, 130, 246, 0.4)'
                : isComplete ? '0 4px 12px rgba(34, 197, 94, 0.3)'
                : 'none'
  });

  const stepLabelStyle = (isActive: boolean, isCurrent: boolean) => ({
    'font-size': '0.75rem',
    'font-weight': isCurrent ? '700' : '500',
    color: isCurrent ? 'var(--primary-color, #3b82f6)'
         : isActive ? 'var(--text-primary, #1f2937)'
         : 'var(--text-secondary, #6b7280)',
    'text-align': 'center' as const,
    'max-width': '100px',
    transition: 'all 0.2s ease'
  });

  // Action buttons
  const buttonContainerStyle = {
    display: 'flex',
    gap: '1rem',
    'flex-wrap': 'wrap' as const,
    'justify-content': 'center',
    'margin-top': '1rem'
  };

  const bigButtonStyle = (variant: 'primary' | 'success' | 'secondary', disabled?: boolean) => ({
    padding: '1rem 2rem',
    'font-size': '1rem',
    'font-weight': '600',
    'border-radius': '12px',
    border: variant === 'secondary' ? '2px solid var(--border-color, #e5e7eb)' : 'none',
    background: disabled ? 'var(--surface-alt, #f3f4f6)'
              : variant === 'primary' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
              : variant === 'success' ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
              : 'white',
    color: disabled ? 'var(--text-secondary, #6b7280)'
         : variant === 'secondary' ? 'var(--text-primary, #1f2937)'
         : 'white',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    'align-items': 'center',
    gap: '0.75rem',
    'box-shadow': disabled ? 'none'
                : variant === 'primary' ? '0 4px 12px rgba(59, 130, 246, 0.3)'
                : variant === 'success' ? '0 4px 12px rgba(34, 197, 94, 0.3)'
                : '0 2px 8px rgba(0, 0, 0, 0.08)',
    'min-width': '200px',
    'justify-content': 'center'
  });

  // Stats and results
  const statsGridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    'margin-top': '1rem'
  };

  const statCardStyle = (color: string) => ({
    padding: '1.25rem',
    'border-radius': '12px',
    background: `linear-gradient(135deg, ${color}08 0%, ${color}15 100%)`,
    border: `1px solid ${color}30`,
    'text-align': 'center' as const
  });

  const statValueStyle = (color: string) => ({
    'font-size': '1.75rem',
    'font-weight': '700',
    color,
    'margin-bottom': '0.25rem'
  });

  const statLabelStyle = {
    'font-size': '0.8125rem',
    color: 'var(--text-secondary, #6b7280)',
    'font-weight': '500'
  };

  const messageStyle = (type: 'success' | 'error') => ({
    padding: '1rem 1.25rem',
    'border-radius': '10px',
    'font-size': '0.9375rem',
    background: type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
    color: type === 'success' ? '#22c55e' : '#ef4444',
    border: `1px solid ${type === 'success' ? '#22c55e' : '#ef4444'}`,
    display: 'flex',
    'align-items': 'center',
    gap: '0.75rem',
    'font-weight': '500'
  });

  const nextStepsStyle = {
    'margin-top': '1.5rem',
    padding: '1.25rem',
    'border-radius': '12px',
    background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
    border: '1px solid #bae6fd'
  };

  const nextStepsTitleStyle = {
    'font-size': '0.9375rem',
    'font-weight': '600',
    color: '#0369a1',
    'margin-bottom': '0.75rem',
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem'
  };

  const nextStepsListStyle = {
    'margin': '0',
    'padding-left': '1.5rem',
    'font-size': '0.875rem',
    color: '#0c4a6e',
    'line-height': '1.75'
  };

  const loadingStyle = {
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    gap: '0.5rem',
    padding: '0.5rem'
  };

  const spinnerStyle = {
    width: '20px',
    height: '20px',
    border: '2px solid rgba(255,255,255,0.3)',
    'border-top-color': 'white',
    'border-radius': '50%',
    animation: 'spin 1s linear infinite'
  };

  // Calculate progress percentage
  const progressPercent = createMemo(() => {
    const currentIdx = getStepIndex(currentStep());
    return (currentIdx / (PREP_STEPS.length - 1)) * 100;
  });

  // Check icon
  const CheckIcon = () => (
    <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '20px', height: '20px' }}>
      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
    </svg>
  );

  return (
    <div style={sectionStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h3 style={titleStyle}>Tax Preparation Progress</h3>
          <p style={subtitleStyle}>
            {props.client.firstName} {props.client.lastName} - Tax Year {props.taxYear}
          </p>
        </div>
      </div>

      {/* Progress Tracker */}
      <Card>
        <div style={progressContainerStyle}>
          {/* Progress Line */}
          <div style={progressLineStyle}>
            <div style={progressLineFillStyle(progressPercent())} />
          </div>

          {/* Steps */}
          <div style={progressTrackStyle}>
            <For each={PREP_STEPS}>
              {(step, index) => {
                const currentIdx = getStepIndex(currentStep());
                const isComplete = index() < currentIdx;
                const isCurrent = index() === currentIdx;
                const isActive = index() <= currentIdx;

                return (
                  <div style={stepStyle(isActive, isComplete, isCurrent)}>
                    <div style={stepCircleStyle(isActive, isComplete, isCurrent)}>
                      <Show when={isComplete} fallback={index() + 1}>
                        <CheckIcon />
                      </Show>
                    </div>
                    <span style={stepLabelStyle(isActive, isCurrent)}>
                      {step.label}
                    </span>
                  </div>
                );
              }}
            </For>
          </div>
        </div>

        {/* Document Stats */}
        <div style={statsGridStyle}>
          <div style={statCardStyle('#3b82f6')}>
            <div style={statValueStyle('#3b82f6')}>{docStats().total}</div>
            <div style={statLabelStyle}>Total Documents</div>
          </div>
          <div style={statCardStyle('#22c55e')}>
            <div style={statValueStyle('#22c55e')}>{docStats().verified}</div>
            <div style={statLabelStyle}>Verified</div>
          </div>
          <div style={statCardStyle('#f59e0b')}>
            <div style={statValueStyle('#f59e0b')}>{docStats().pending}</div>
            <div style={statLabelStyle}>Pending Review</div>
          </div>
          <Show when={docStats().errors > 0}>
            <div style={statCardStyle('#ef4444')}>
              <div style={statValueStyle('#ef4444')}>{docStats().errors}</div>
              <div style={statLabelStyle}>Errors</div>
            </div>
          </Show>
        </div>

        {/* Dependents for Calculation */}
        <Show when={allDependents().length > 0}>
          <div style={{
            'margin-top': '1.5rem',
            padding: '1rem',
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
            'border-radius': '12px',
            border: '1px solid #bae6fd'
          }}>
            <div style={{
              display: 'flex',
              'align-items': 'center',
              gap: '0.5rem',
              'margin-bottom': '0.75rem'
            }}>
              <svg viewBox="0 0 20 20" fill="#0284c7" style={{ width: '18px', height: '18px' }}>
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
              <span style={{ 'font-weight': '600', color: '#0369a1', 'font-size': '0.9rem' }}>
                Dependents for Calculation ({activeDependents().length} of {allDependents().length} active)
              </span>
            </div>
            <div style={{ display: 'flex', 'flex-wrap': 'wrap', gap: '0.5rem' }}>
              <For each={allDependents()}>
                {(dep, index) => {
                  const isExcluded = dep.excludeFromCalculation;
                  const isSpouseDependent = (dep as any)._isSpouseDependent;
                  return (
                    <button
                      onClick={() => toggleDependentExclusion(index())}
                      style={{
                        display: 'flex',
                        'align-items': 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 0.75rem',
                        'border-radius': '8px',
                        border: isExcluded ? '2px dashed #d1d5db' : '2px solid #22c55e',
                        background: isExcluded ? '#f9fafb' : '#f0fdf4',
                        color: isExcluded ? '#9ca3af' : '#166534',
                        'font-size': '0.85rem',
                        'font-weight': '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        opacity: isExcluded ? 0.7 : 1,
                        'text-decoration': isExcluded ? 'line-through' : 'none'
                      }}
                      title={isExcluded ? 'Click to include in calculation' : 'Click to exclude from calculation'}
                    >
                      <span style={{
                        width: '18px',
                        height: '18px',
                        'border-radius': '4px',
                        background: isExcluded ? '#e5e7eb' : '#22c55e',
                        display: 'flex',
                        'align-items': 'center',
                        'justify-content': 'center',
                        color: 'white',
                        'font-size': '12px'
                      }}>
                        {isExcluded ? '−' : '✓'}
                      </span>
                      {dep.firstName} {dep.lastName}
                      <Show when={isSpouseDependent}>
                        <span style={{
                          'font-size': '0.7rem',
                          padding: '2px 6px',
                          background: '#fce7f3',
                          color: '#be185d',
                          'border-radius': '4px'
                        }}>Spouse</span>
                      </Show>
                      <span style={{
                        'font-size': '0.75rem',
                        color: isExcluded ? '#9ca3af' : '#16a34a',
                        'text-transform': 'capitalize'
                      }}>({dep.relationship})</span>
                    </button>
                  );
                }}
              </For>
            </div>
            <Show when={props.spouseDocuments && props.spouseDocuments.length > 0}>
              <div style={{
                'margin-top': '0.75rem',
                'padding-top': '0.75rem',
                'border-top': '1px solid #bae6fd',
                'font-size': '0.8rem',
                color: '#0369a1',
                display: 'flex',
                'align-items': 'center',
                gap: '0.5rem'
              }}>
                <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '16px', height: '16px' }}>
                  <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                </svg>
                Including {props.spouseDocuments!.length} spouse document(s) in calculation
              </div>
            </Show>
          </div>
        </Show>

        {/* Document Toggles for What-If Scenarios */}
        <Show when={allDocuments().length > 0}>
          <div style={{
            'margin-top': '1.5rem',
            padding: '1rem',
            background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
            'border-radius': '12px',
            border: '1px solid #e9d5ff'
          }}>
            <div style={{
              display: 'flex',
              'align-items': 'center',
              gap: '0.5rem',
              'margin-bottom': '0.75rem'
            }}>
              <svg viewBox="0 0 20 20" fill="#7c3aed" style={{ width: '18px', height: '18px' }}>
                <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd" />
              </svg>
              <span style={{ 'font-weight': '600', color: '#6b21a8', 'font-size': '0.9rem' }}>
                Documents for Calculation ({activeDocuments().length} of {allDocuments().length} active)
              </span>
            </div>
            <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.375rem' }}>
              <For each={allDocuments()}>
                {(doc) => {
                  const isExcluded = () => excludedDocIds().has(doc.id);
                  const isUnverified = !doc.verified;
                  const isSpouseDoc = (props.spouseDocuments || []).some(sd => sd.id === doc.id);
                  const yearMismatch = doc.taxYear != null && doc.taxYear !== props.taxYear;
                  const info = getDocDisplayInfo(doc);
                  const formatAmt = (n: number) => n > 0 ? `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '';

                  return (
                    <button
                      onClick={() => !isUnverified && toggleDocumentExclusion(doc.id)}
                      disabled={isUnverified}
                      style={{
                        display: 'flex',
                        'align-items': 'center',
                        gap: '0.625rem',
                        padding: '0.5rem 0.75rem',
                        'border-radius': '8px',
                        border: isUnverified
                          ? '1px dashed #d1d5db'
                          : isExcluded()
                            ? '2px dashed #d1d5db'
                            : '2px solid #7c3aed',
                        background: isUnverified
                          ? '#f9fafb'
                          : isExcluded()
                            ? '#fafafa'
                            : '#faf5ff',
                        color: isUnverified || isExcluded() ? '#9ca3af' : '#4c1d95',
                        'font-size': '0.85rem',
                        'font-weight': '500',
                        cursor: isUnverified ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                        opacity: isUnverified ? 0.5 : isExcluded() ? 0.65 : 1,
                        width: '100%',
                        'text-align': 'left' as const
                      }}
                      title={
                        isUnverified
                          ? 'Unverified — not included in calculation'
                          : isExcluded()
                            ? 'Click to include in calculation'
                            : 'Click to exclude from calculation'
                      }
                    >
                      {/* Checkbox icon */}
                      <span style={{
                        width: '18px',
                        height: '18px',
                        'min-width': '18px',
                        'border-radius': '4px',
                        background: isUnverified ? '#d1d5db' : isExcluded() ? '#e5e7eb' : '#7c3aed',
                        display: 'flex',
                        'align-items': 'center',
                        'justify-content': 'center',
                        color: 'white',
                        'font-size': '12px'
                      }}>
                        {isUnverified ? '?' : isExcluded() ? '−' : '✓'}
                      </span>

                      {/* Form type badge */}
                      <span style={{
                        'font-size': '0.7rem',
                        'font-weight': '700',
                        padding: '2px 8px',
                        background: isExcluded() || isUnverified ? '#e5e7eb' : '#ede9fe',
                        color: isExcluded() || isUnverified ? '#6b7280' : '#6b21a8',
                        'border-radius': '4px',
                        'white-space': 'nowrap'
                      }}>
                        {getFormBadge(doc.drakeFormType)}
                      </span>

                      {/* Payer name */}
                      <span style={{
                        flex: '1',
                        overflow: 'hidden',
                        'text-overflow': 'ellipsis',
                        'white-space': 'nowrap',
                        'text-decoration': isExcluded() ? 'line-through' : 'none'
                      }}>
                        {info.payer}
                      </span>

                      {/* Primary amount */}
                      <Show when={info.amount > 0}>
                        <span style={{
                          'font-weight': '600',
                          'white-space': 'nowrap',
                          color: isExcluded() || isUnverified ? '#9ca3af' : '#4c1d95'
                        }}>
                          {formatAmt(info.amount)}
                        </span>
                        <span style={{
                          'font-size': '0.7rem',
                          color: isExcluded() || isUnverified ? '#9ca3af' : '#7c3aed',
                          'white-space': 'nowrap'
                        }}>
                          {info.label}
                        </span>
                      </Show>

                      {/* Spouse badge */}
                      <Show when={isSpouseDoc}>
                        <span style={{
                          'font-size': '0.7rem',
                          padding: '2px 6px',
                          background: '#fce7f3',
                          color: '#be185d',
                          'border-radius': '4px',
                          'white-space': 'nowrap'
                        }}>Spouse</span>
                      </Show>

                      {/* Year mismatch warning */}
                      <Show when={yearMismatch}>
                        <span title={`Document year (${doc.taxYear}) differs from tax year (${props.taxYear})`} style={{
                          'font-size': '0.8rem',
                          color: '#f59e0b'
                        }}>⚠</span>
                      </Show>

                      {/* Unverified indicator */}
                      <Show when={isUnverified}>
                        <span style={{
                          'font-size': '0.65rem',
                          padding: '1px 5px',
                          background: '#fef3c7',
                          color: '#92400e',
                          'border-radius': '3px',
                          'white-space': 'nowrap'
                        }}>Unverified</span>
                      </Show>

                      {/* Generate IRS PDF button — only for verified 1099 docs */}
                      <Show when={!isUnverified && FILL_BY_TYPE[doc.drakeFormType || '']}>
                        <button
                          onClick={(e: MouseEvent) => handleGenerateForPayer(doc, e)}
                          disabled={generatingDocId() === doc.id}
                          title={`Generate ${FORM_LABEL[doc.drakeFormType || ''] || ''} + W-9 for ${info.payer}`}
                          style={{
                            display: 'flex',
                            'align-items': 'center',
                            'justify-content': 'center',
                            width: '26px',
                            height: '26px',
                            'min-width': '26px',
                            padding: '0',
                            border: '1px solid #d8b4fe',
                            'border-radius': '6px',
                            background: generatingDocId() === doc.id ? '#ede9fe' : 'white',
                            color: '#7c3aed',
                            cursor: generatingDocId() === doc.id ? 'wait' : 'pointer',
                          }}
                        >
                          <Show when={generatingDocId() === doc.id} fallback={
                            <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '14px', height: '14px' }}>
                              <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" />
                            </svg>
                          }>
                            <div style={{
                              width: '14px',
                              height: '14px',
                              border: '2px solid #d8b4fe',
                              'border-top-color': '#7c3aed',
                              'border-radius': '50%',
                              animation: 'spin 0.6s linear infinite'
                            }} />
                          </Show>
                        </button>
                      </Show>
                    </button>
                  );
                }}
              </For>
            </div>
          </div>
        </Show>

        {/* Validation Checklist - shown before running calculation */}
        <Show when={!calculationResult()}>
          <div style={{ 'margin-bottom': '1.5rem' }}>
            <ValidationChecklist
              client={props.client}
              documents={props.documents}
              onFixAction={(action) => {
                devLog('[TAX PREP] Fix action requested:', action);
              }}
            />
          </div>
        </Show>

        {/* Action Buttons */}
        <div style={buttonContainerStyle}>
          <button
            style={bigButtonStyle('primary', isCalculating() || docStats().verified === 0)}
            onClick={handleRunCalculation}
            disabled={isCalculating() || docStats().verified === 0}
          >
            <Show when={isCalculating()} fallback={
              <>
                <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '20px', height: '20px' }}>
                  <path d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm1 2a1 1 0 000 2h6a1 1 0 100-2H7zm6 7a1 1 0 011 1v3a1 1 0 11-2 0v-3a1 1 0 011-1zm-3 3a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm-2-2a1 1 0 011 1v2a1 1 0 11-2 0v-2a1 1 0 011-1z" />
                </svg>
                Run Tax Calculation
              </>
            }>
              <div style={loadingStyle}>
                <div style={spinnerStyle} />
                Calculating...
              </div>
            </Show>
          </button>

          <button
            style={bigButtonStyle('success', isExporting() || docStats().verified === 0)}
            onClick={handleExportToDrake}
            disabled={isExporting() || docStats().verified === 0}
          >
            <Show when={isExporting()} fallback={
              <>
                <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '20px', height: '20px' }}>
                  <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
                Export to Drake
              </>
            }>
              <div style={loadingStyle}>
                <div style={spinnerStyle} />
                Exporting...
              </div>
            </Show>
          </button>

          {/* Generate IRS Forms — with payer picker */}
          <div style={{ position: 'relative' }}>
            <button
              style={bigButtonStyle('secondary', isGeneratingForms() )}
              onClick={() => {
                if (!isGeneratingForms()) {
                  setShowPayerPicker(!showPayerPicker());
                }
              }}
              disabled={isGeneratingForms() }
            >
              <Show when={isGeneratingForms()} fallback={
                <>
                  <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '20px', height: '20px' }}>
                    <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" />
                  </svg>
                  Generate IRS Forms
                  <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '16px', height: '16px', transition: 'transform 0.2s', transform: showPayerPicker() ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                  </svg>
                </>
              }>
                <div style={loadingStyle}>
                  <div style={spinnerStyle} />
                  Generating Forms...
                </div>
              </Show>
            </button>

            {/* Payer picker dropdown */}
            <Show when={showPayerPicker()}>
              <div style={{
                position: 'absolute',
                top: '100%',
                left: '0',
                right: '0',
                'min-width': '280px',
                'margin-top': '0.5rem',
                background: 'white',
                border: '1px solid #e5e7eb',
                'border-radius': '12px',
                'box-shadow': '0 10px 25px rgba(0,0,0,0.15)',
                'z-index': '50',
                overflow: 'hidden'
              }}>
                {/* Header */}
                <div style={{
                  padding: '0.75rem 1rem',
                  background: '#faf5ff',
                  'border-bottom': '1px solid #e9d5ff',
                  'font-size': '0.8rem',
                  'font-weight': '600',
                  color: '#6b21a8'
                }}>
                  Select Payer
                </div>

                {/* All Payers option */}
                <button
                  onClick={() => { setShowPayerPicker(false); handleGenerateIrsForms(); }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    'align-items': 'center',
                    gap: '0.5rem',
                    padding: '0.65rem 1rem',
                    border: 'none',
                    'border-bottom': '1px solid #f3f4f6',
                    background: 'white',
                    cursor: 'pointer',
                    'font-size': '0.85rem',
                    color: '#1f2937',
                    'text-align': 'left' as const,
                  }}
                >
                  <svg viewBox="0 0 20 20" fill="#7c3aed" style={{ width: '16px', height: '16px', 'min-width': '16px' }}>
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                    <path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd" />
                  </svg>
                  <span style={{ 'font-weight': '600' }}>All Payers + W-9</span>
                  <span style={{ 'margin-left': 'auto', 'font-size': '0.75rem', color: '#9ca3af' }}>
                    {verified1099Docs().length} form(s)
                  </span>
                </button>

                {/* Individual payer rows */}
                <div style={{ 'max-height': '240px', 'overflow-y': 'auto' }}>
                  <For each={verified1099Docs()}>
                    {(doc) => {
                      const payerName = doc.payerInfo?.name || doc.extractedData?.payerName || doc.originalFileName;
                      const formLabel = FORM_LABEL[doc.drakeFormType || ''] || doc.drakeFormType || '';
                      const amount = doc.extractedAmounts?.nonEmployeeCompensation
                        || doc.extractedAmounts?.interestIncome
                        || doc.extractedAmounts?.ordinaryDividends
                        || doc.extractedAmounts?.rents
                        || doc.extractedAmounts?.otherIncome
                        || 0;

                      return (
                        <button
                          onClick={(e: MouseEvent) => { setShowPayerPicker(false); handleGenerateForPayer(doc, e); }}
                          disabled={generatingDocId() === doc.id}
                          style={{
                            width: '100%',
                            display: 'flex',
                            'align-items': 'center',
                            gap: '0.5rem',
                            padding: '0.65rem 1rem',
                            border: 'none',
                            'border-bottom': '1px solid #f3f4f6',
                            background: generatingDocId() === doc.id ? '#faf5ff' : 'white',
                            cursor: generatingDocId() === doc.id ? 'wait' : 'pointer',
                            'font-size': '0.85rem',
                            color: '#1f2937',
                            'text-align': 'left' as const,
                          }}
                        >
                          <span style={{
                            'font-size': '0.65rem',
                            'font-weight': '700',
                            padding: '2px 6px',
                            background: '#ede9fe',
                            color: '#6b21a8',
                            'border-radius': '4px',
                            'white-space': 'nowrap'
                          }}>{formLabel}</span>
                          <span style={{ flex: '1', overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' }}>
                            {payerName}
                          </span>
                          <Show when={amount > 0}>
                            <span style={{ 'font-weight': '600', color: '#4c1d95', 'font-size': '0.8rem', 'white-space': 'nowrap' }}>
                              ${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                          </Show>
                        </button>
                      );
                    }}
                  </For>
                </div>

                {/* Divider */}
                <div style={{ 'border-top': '1px solid #e5e7eb' }} />

                {/* From Payer Database option */}
                <button
                  onClick={() => {
                    setShowPayerSearch(true);
                    loadPayers();
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    'align-items': 'center',
                    gap: '0.5rem',
                    padding: '0.65rem 1rem',
                    border: 'none',
                    background: showPayerSearch() ? '#ede9fe' : '#faf5ff',
                    cursor: 'pointer',
                    'font-size': '0.85rem',
                    color: '#6b21a8',
                    'text-align': 'left' as const,
                    'font-weight': '600'
                  }}
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '16px', height: '16px', 'min-width': '16px' }}>
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                  <span>From Payer Database</span>
                  <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '14px', height: '14px', 'margin-left': 'auto', transform: showPayerSearch() ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                    <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                  </svg>
                </button>

                {/* Payer search panel */}
                <Show when={showPayerSearch()}>
                  <div style={{ padding: '0.75rem', 'border-top': '1px solid #e9d5ff', background: '#faf5ff' }}>
                    {/* Search input */}
                    <input
                      type="text"
                      placeholder="Search payers by name or EIN..."
                      value={payerSearchQuery()}
                      onInput={(e) => {
                        setPayerSearchQuery(e.currentTarget.value);
                        loadPayers(e.currentTarget.value);
                      }}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        border: '1px solid #d8b4fe',
                        'border-radius': '8px',
                        'font-size': '0.85rem',
                        outline: 'none',
                        'box-sizing': 'border-box',
                        'margin-bottom': '0.5rem'
                      }}
                    />

                    {/* Payer results */}
                    <Show when={!isLoadingPayers()} fallback={
                      <div style={{ padding: '0.5rem', 'text-align': 'center', color: '#9ca3af', 'font-size': '0.8rem' }}>
                        Loading payers...
                      </div>
                    }>
                      <div style={{ 'max-height': '160px', 'overflow-y': 'auto', 'margin-bottom': '0.5rem' }}>
                        <Show when={payerSearchResults().length > 0} fallback={
                          <div style={{ padding: '0.5rem', 'text-align': 'center', color: '#9ca3af', 'font-size': '0.8rem' }}>
                            No payers found
                          </div>
                        }>
                          <For each={payerSearchResults()}>
                            {(payer) => {
                              const isSelected = () => selectedApiPayer()?.id === payer.id;
                              return (
                                <button
                                  onClick={() => setSelectedApiPayer(isSelected() ? null : payer)}
                                  style={{
                                    width: '100%',
                                    display: 'flex',
                                    'align-items': 'center',
                                    gap: '0.5rem',
                                    padding: '0.5rem 0.6rem',
                                    border: isSelected() ? '2px solid #7c3aed' : '1px solid #e5e7eb',
                                    'border-radius': '8px',
                                    background: isSelected() ? '#ede9fe' : 'white',
                                    cursor: 'pointer',
                                    'font-size': '0.8rem',
                                    color: '#1f2937',
                                    'text-align': 'left' as const,
                                    'margin-bottom': '0.35rem'
                                  }}
                                >
                                  <span style={{
                                    width: '18px', height: '18px', 'min-width': '18px',
                                    'border-radius': '50%',
                                    background: isSelected() ? '#7c3aed' : '#e5e7eb',
                                    display: 'flex', 'align-items': 'center', 'justify-content': 'center',
                                    color: 'white', 'font-size': '10px'
                                  }}>
                                    {isSelected() ? '✓' : ''}
                                  </span>
                                  <div style={{ flex: '1', overflow: 'hidden' }}>
                                    <div style={{ 'font-weight': '600', overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' }}>
                                      {payer.name}
                                    </div>
                                    <div style={{ 'font-size': '0.7rem', color: '#6b7280' }}>
                                      EIN: {payer.ein} {payer.city && payer.state ? `| ${payer.city}, ${payer.state}` : ''}
                                    </div>
                                  </div>
                                </button>
                              );
                            }}
                          </For>
                        </Show>
                      </div>
                    </Show>

                    {/* Selected payer → form type + amount */}
                    <Show when={selectedApiPayer()}>
                      <div style={{
                        padding: '0.6rem',
                        background: 'white',
                        'border-radius': '8px',
                        border: '1px solid #d8b4fe',
                        display: 'flex',
                        'flex-direction': 'column',
                        gap: '0.5rem'
                      }}>
                        <div style={{ 'font-size': '0.75rem', 'font-weight': '600', color: '#6b21a8' }}>
                          {selectedApiPayer()!.name}
                        </div>

                        {/* Form type selector */}
                        <div style={{ display: 'flex', gap: '0.35rem', 'flex-wrap': 'wrap' }}>
                          {(['1099_nec', '1099_misc', '1099_int', '1099_div'] as const).map(ft => (
                            <button
                              onClick={() => setPayerFormType(ft)}
                              style={{
                                padding: '3px 8px',
                                'font-size': '0.7rem',
                                'font-weight': '600',
                                border: payerFormType() === ft ? '2px solid #7c3aed' : '1px solid #d1d5db',
                                'border-radius': '6px',
                                background: payerFormType() === ft ? '#ede9fe' : 'white',
                                color: payerFormType() === ft ? '#6b21a8' : '#6b7280',
                                cursor: 'pointer'
                              }}
                            >
                              {FORM_LABEL[ft]}
                            </button>
                          ))}
                        </div>

                        {/* Amount input */}
                        <input
                          type="number"
                          placeholder={`Amount for ${FORM_LABEL[payerFormType()]} Box 1`}
                          value={payerAmount()}
                          onInput={(e) => setPayerAmount(e.currentTarget.value)}
                          style={{
                            width: '100%',
                            padding: '0.45rem 0.6rem',
                            border: '1px solid #d8b4fe',
                            'border-radius': '6px',
                            'font-size': '0.85rem',
                            outline: 'none',
                            'box-sizing': 'border-box'
                          }}
                        />

                        {/* Generate button */}
                        <button
                          onClick={handleGenerateFromPayer}
                          disabled={isGeneratingForms() || !payerAmount()}
                          style={{
                            padding: '0.5rem 1rem',
                            'font-size': '0.85rem',
                            'font-weight': '600',
                            'border-radius': '8px',
                            border: 'none',
                            background: (!payerAmount() || isGeneratingForms()) ? '#e5e7eb' : 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                            color: (!payerAmount() || isGeneratingForms()) ? '#9ca3af' : 'white',
                            cursor: (!payerAmount() || isGeneratingForms()) ? 'not-allowed' : 'pointer',
                            width: '100%'
                          }}
                        >
                          <Show when={isGeneratingForms()} fallback={
                            <>Generate {FORM_LABEL[payerFormType()]} + W-9</>
                          }>
                            Generating...
                          </Show>
                        </button>
                      </div>
                    </Show>
                  </div>
                </Show>

                {/* W-9 Only option */}
                <button
                  onClick={async () => {
                    setShowPayerPicker(false);
                    setIsGeneratingForms(true);
                    setExportMessage(null);
                    try {
                      const clientName = `${props.client.lastName}_${props.client.firstName}`.replace(/\s+/g, '_');
                      const w9Bytes = await fillFormW9(props.client);
                      downloadPdf(w9Bytes, `W-9_${clientName}_${props.taxYear}.pdf`);
                      setExportMessage({ type: 'success', text: 'Generated W-9' });
                    } catch (err) {
                      setExportMessage({ type: 'error', text: `W-9 failed: ${err instanceof Error ? err.message : 'Unknown error'}` });
                    } finally {
                      setIsGeneratingForms(false);
                    }
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    'align-items': 'center',
                    gap: '0.5rem',
                    padding: '0.65rem 1rem',
                    border: 'none',
                    background: '#f9fafb',
                    cursor: 'pointer',
                    'font-size': '0.85rem',
                    color: '#6b7280',
                    'text-align': 'left' as const,
                    'border-top': '1px solid #e5e7eb'
                  }}
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '16px', height: '16px', 'min-width': '16px' }}>
                    <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
                  </svg>
                  <span>W-9 Only</span>
                </button>
              </div>
            </Show>
          </div>
        </div>

        {/* Messages */}
        <Show when={exportMessage()}>
          <div style={{ 'margin-top': '1rem' }}>
            <div style={messageStyle(exportMessage()!.type)}>
              <Show when={exportMessage()!.type === 'success'}>
                <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '20px', height: '20px' }}>
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
              </Show>
              <Show when={exportMessage()!.type === 'error'}>
                <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '20px', height: '20px' }}>
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                </svg>
              </Show>
              {exportMessage()!.text}
            </div>
          </div>
        </Show>
      </Card>

      {/* Detailed 1040 Calculation Results */}
      <Show when={calculationResult()} keyed>
        {(result) => {
          const formatCurrency = (amount: number) => amount < 0
            ? `-$${Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

          const lineStyle = {
            display: 'flex',
            'justify-content': 'space-between',
            'align-items': 'center',
            padding: '0.5rem 0',
            'border-bottom': '1px solid var(--border-color, #e5e7eb)',
            'font-size': '0.875rem'
          };

          const lineNumberStyle = {
            'font-weight': '600',
            color: 'var(--primary-color, #3b82f6)',
            'min-width': '60px'
          };

          const lineLabelStyle = {
            flex: '1',
            color: 'var(--text-secondary, #6b7280)'
          };

          const lineValueStyle = (highlight?: boolean, isNegative?: boolean) => ({
            'font-weight': '600',
            color: highlight
              ? (isNegative ? '#ef4444' : '#22c55e')
              : 'var(--text-primary, #1f2937)',
            'text-align': 'right' as const,
            'min-width': '120px'
          });

          const sectionHeaderStyle = {
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: 'white',
            padding: '0.75rem 1rem',
            'font-weight': '600',
            'font-size': '0.875rem',
            'margin-top': '1rem',
            'border-radius': '8px 8px 0 0'
          };

          const sectionContentStyle = {
            background: 'var(--surface-alt, #f9fafb)',
            padding: '0.75rem 1rem',
            'border-radius': '0 0 8px 8px',
            'border': '1px solid var(--border-color, #e5e7eb)',
            'border-top': 'none'
          };

          const subLineStyle = {
            display: 'flex',
            'justify-content': 'space-between',
            'padding-left': '2rem',
            'font-size': '0.8125rem',
            color: 'var(--text-muted, #9ca3af)',
            padding: '0.25rem 0 0.25rem 2rem'
          };

          const totalLineStyle = {
            ...lineStyle,
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.05))',
            padding: '0.75rem',
            'border-radius': '8px',
            'border': '1px solid rgba(34, 197, 94, 0.3)',
            'margin-top': '0.5rem',
            'font-weight': '700'
          };

          const resultBoxStyle = (isRefund: boolean) => ({
            background: isRefund
              ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.05))'
              : 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05))',
            border: `2px solid ${isRefund ? '#22c55e' : '#ef4444'}`,
            'border-radius': '12px',
            padding: '1.5rem',
            'text-align': 'center' as const,
            'margin-top': '1.5rem'
          });

          return (
            <Card>
              {/* Header */}
              <div style={{
                display: 'flex',
                'justify-content': 'space-between',
                'align-items': 'center',
                'margin-bottom': '1rem',
                'padding-bottom': '1rem',
                'border-bottom': '2px solid var(--border-color, #e5e7eb)'
              }}>
                <div>
                  <h4 style={{ ...titleStyle, margin: 0 }}>
                    <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '24px', height: '24px', 'vertical-align': 'middle', 'margin-right': '0.5rem', color: '#3b82f6' }}>
                      <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd" />
                    </svg>
                    Form 1040 - Tax Calculation Details
                  </h4>
                  <p style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)', 'margin-top': '0.25rem' }}>
                    Tax Year {result.taxYear} | {result.filingStatusLabel}
                  </p>
                </div>
                <div style={{
                  background: 'var(--surface-alt, #f3f4f6)',
                  padding: '0.5rem 1rem',
                  'border-radius': '8px',
                  'font-size': '0.75rem',
                  color: 'var(--text-secondary)'
                }}>
                  Marginal Rate: <strong style={{ color: '#3b82f6' }}>{(result.line16_marginalRate * 100).toFixed(0)}%</strong>
                </div>
              </div>

              {/* INCOME SECTION */}
              <div style={sectionHeaderStyle}>
                INCOME (Lines 1-9)
              </div>
              <div style={sectionContentStyle}>
                <div style={lineStyle}>
                  <span style={lineNumberStyle}>1a</span>
                  <span style={lineLabelStyle}>Wages, salaries, tips (W-2 Box 1)</span>
                  <span style={lineValueStyle()}>{formatCurrency(result.line1a_wages)}</span>
                </div>
                <Show when={result.line1h_otherEarnedIncome > 0}>
                  <div style={lineStyle}>
                    <span style={lineNumberStyle}>1h</span>
                    <span style={lineLabelStyle}>Other earned income</span>
                    <span style={lineValueStyle()}>{formatCurrency(result.line1h_otherEarnedIncome)}</span>
                  </div>
                </Show>
                <div style={lineStyle}>
                  <span style={lineNumberStyle}>1z</span>
                  <span style={lineLabelStyle}>Total wages</span>
                  <span style={lineValueStyle()}>{formatCurrency(result.line1z_totalWages)}</span>
                </div>
                <Show when={result.line2b_taxableInterest > 0}>
                  <div style={lineStyle}>
                    <span style={lineNumberStyle}>2b</span>
                    <span style={lineLabelStyle}>Taxable interest (1099-INT)</span>
                    <span style={lineValueStyle()}>{formatCurrency(result.line2b_taxableInterest)}</span>
                  </div>
                </Show>
                <Show when={result.line3b_ordinaryDividends > 0}>
                  <div style={lineStyle}>
                    <span style={lineNumberStyle}>3b</span>
                    <span style={lineLabelStyle}>Ordinary dividends (1099-DIV)</span>
                    <span style={lineValueStyle()}>{formatCurrency(result.line3b_ordinaryDividends)}</span>
                  </div>
                </Show>
                <Show when={result.line8_otherIncome > 0}>
                  <div style={lineStyle}>
                    <span style={lineNumberStyle}>8</span>
                    <span style={lineLabelStyle}>Other income (Schedule 1)</span>
                    <span style={lineValueStyle()}>{formatCurrency(result.line8_otherIncome)}</span>
                  </div>
                  <Show when={result.line8_breakdown.businessIncome > 0}>
                    <div style={subLineStyle}>
                      <span>Schedule C - Business income (1099-NEC)</span>
                      <span>{formatCurrency(result.line8_breakdown.businessIncome)}</span>
                    </div>
                  </Show>
                  <Show when={result.line8_breakdown.rentalIncome > 0}>
                    <div style={subLineStyle}>
                      <span>Schedule E - Rental income</span>
                      <span>{formatCurrency(result.line8_breakdown.rentalIncome)}</span>
                    </div>
                  </Show>
                  <Show when={result.line8_breakdown.royalties > 0}>
                    <div style={subLineStyle}>
                      <span>Schedule E - Royalties</span>
                      <span>{formatCurrency(result.line8_breakdown.royalties)}</span>
                    </div>
                  </Show>
                  <Show when={result.line8_breakdown.other > 0}>
                    <div style={subLineStyle}>
                      <span>Other income</span>
                      <span>{formatCurrency(result.line8_breakdown.other)}</span>
                    </div>
                  </Show>
                </Show>
                <div style={totalLineStyle}>
                  <span style={lineNumberStyle}>9</span>
                  <span style={lineLabelStyle}>TOTAL INCOME</span>
                  <span style={lineValueStyle(true)}>{formatCurrency(result.line9_totalIncome)}</span>
                </div>
              </div>

              {/* ADJUSTMENTS & AGI */}
              <div style={{ ...sectionHeaderStyle, background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }}>
                ADJUSTED GROSS INCOME (Lines 10-11)
              </div>
              <div style={sectionContentStyle}>
                <div style={lineStyle}>
                  <span style={lineNumberStyle}>10</span>
                  <span style={lineLabelStyle}>Adjustments to income</span>
                  <span style={lineValueStyle()}>{formatCurrency(result.line10_adjustments)}</span>
                </div>
                <div style={totalLineStyle}>
                  <span style={lineNumberStyle}>11</span>
                  <span style={lineLabelStyle}>ADJUSTED GROSS INCOME (AGI)</span>
                  <span style={lineValueStyle(true)}>{formatCurrency(result.line11_agi)}</span>
                </div>
              </div>

              {/* DEDUCTIONS */}
              <div style={{ ...sectionHeaderStyle, background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
                DEDUCTIONS (Lines 12-15)
              </div>
              <div style={sectionContentStyle}>
                <div style={lineStyle}>
                  <span style={lineNumberStyle}>12a</span>
                  <span style={lineLabelStyle}>Standard deduction</span>
                  <span style={lineValueStyle()}>{formatCurrency(result.line12a_standardDeduction)}</span>
                </div>
                <div style={lineStyle}>
                  <span style={lineNumberStyle}>12b</span>
                  <span style={lineLabelStyle}>Itemized deductions (Schedule A)</span>
                  <span style={lineValueStyle()}>{formatCurrency(result.line12b_itemizedDeductions)}</span>
                </div>
                <Show when={result.line12b_itemizedDeductions > 0}>
                  <Show when={result.line12b_breakdown.saltDeduction > 0}>
                    <div style={subLineStyle}>
                      <span>SALT (State/Local taxes) - capped</span>
                      <span>{formatCurrency(result.line12b_breakdown.saltDeduction)}</span>
                    </div>
                  </Show>
                  <Show when={result.line12b_breakdown.mortgageInterest > 0}>
                    <div style={subLineStyle}>
                      <span>Mortgage interest (1098)</span>
                      <span>{formatCurrency(result.line12b_breakdown.mortgageInterest)}</span>
                    </div>
                  </Show>
                </Show>
                <div style={{
                  ...lineStyle,
                  background: result.line12_deductionUsed === 'itemized'
                    ? 'rgba(245, 158, 11, 0.1)'
                    : 'rgba(59, 130, 246, 0.1)',
                  padding: '0.75rem',
                  'border-radius': '6px',
                  'margin-top': '0.5rem'
                }}>
                  <span style={lineNumberStyle}>12</span>
                  <span style={lineLabelStyle}>
                    <strong>Deduction used:</strong> {result.line12_deductionUsed === 'itemized' ? 'Itemized' : 'Standard'}
                  </span>
                  <span style={lineValueStyle(true)}>{formatCurrency(result.line12_deductionAmount)}</span>
                </div>
                <Show when={result.line13a_qbid > 0}>
                  <div style={lineStyle}>
                    <span style={lineNumberStyle}>13a</span>
                    <span style={lineLabelStyle}>Qualified Business Income Deduction (QBID)</span>
                    <span style={lineValueStyle()}>{formatCurrency(result.line13a_qbid)}</span>
                  </div>
                </Show>
                <Show when={result.line13b_schedule1ADeductions > 0}>
                  <div style={lineStyle}>
                    <span style={lineNumberStyle}>13b</span>
                    <span style={lineLabelStyle}>Schedule 1-A Additional Deductions</span>
                    <span style={lineValueStyle()}>{formatCurrency(result.line13b_schedule1ADeductions)}</span>
                  </div>
                </Show>
                <Show when={result.line13a_qbid > 0 || result.line13b_schedule1ADeductions > 0}>
                  <div style={lineStyle}>
                    <span style={lineNumberStyle}>14</span>
                    <span style={lineLabelStyle}>Total Deductions (Lines 12 + 13a + 13b)</span>
                    <span style={lineValueStyle()}>{formatCurrency(result.line14_totalDeductions)}</span>
                  </div>
                </Show>
                <div style={totalLineStyle}>
                  <span style={lineNumberStyle}>15</span>
                  <span style={lineLabelStyle}>TAXABLE INCOME (Line 11 - Line 14)</span>
                  <span style={lineValueStyle(true)}>{formatCurrency(result.line15_taxableIncome)}</span>
                </div>
              </div>

              {/* TAX CALCULATION */}
              <div style={{ ...sectionHeaderStyle, background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}>
                TAX CALCULATION (Lines 16-24)
              </div>
              <div style={sectionContentStyle}>
                <div style={lineStyle}>
                  <span style={lineNumberStyle}>16</span>
                  <span style={lineLabelStyle}>Tax (from tax table)</span>
                  <span style={lineValueStyle()}>{formatCurrency(result.line16_tax)}</span>
                </div>
                <div style={subLineStyle}>
                  <span>Applied: {result.line16_bracketUsed}</span>
                  <span></span>
                </div>
                <Show when={result.line17_schedule2Tax > 0}>
                  <div style={lineStyle}>
                    <span style={lineNumberStyle}>17</span>
                    <span style={lineLabelStyle}>Schedule 2 Taxes (SE tax, etc.)</span>
                    <span style={lineValueStyle()}>{formatCurrency(result.line17_schedule2Tax)}</span>
                  </div>
                  <div style={lineStyle}>
                    <span style={lineNumberStyle}>18</span>
                    <span style={lineLabelStyle}>Total tax before credits (Lines 16 + 17)</span>
                    <span style={lineValueStyle()}>{formatCurrency(result.line18_totalTaxBeforeCredits)}</span>
                  </div>
                </Show>
                <Show when={result.line19_childTaxCredit > 0}>
                  <div style={lineStyle}>
                    <span style={lineNumberStyle}>19</span>
                    <span style={lineLabelStyle}>Child Tax Credit / Credit for Other Dependents</span>
                    <span style={{ ...lineValueStyle(), color: '#22c55e' }}>-{formatCurrency(result.line19_childTaxCredit)}</span>
                  </div>
                </Show>
                <Show when={result.line21_totalCredits > 0}>
                  <div style={lineStyle}>
                    <span style={lineNumberStyle}>21</span>
                    <span style={lineLabelStyle}>Total Credits</span>
                    <span style={{ ...lineValueStyle(), color: '#22c55e' }}>-{formatCurrency(result.line21_totalCredits)}</span>
                  </div>
                </Show>
                <div style={totalLineStyle}>
                  <span style={lineNumberStyle}>24</span>
                  <span style={lineLabelStyle}>TOTAL TAX</span>
                  <span style={{ ...lineValueStyle(true), color: '#ef4444' }}>{formatCurrency(result.line24_totalTax)}</span>
                </div>
              </div>

              {/* PAYMENTS */}
              <div style={{ ...sectionHeaderStyle, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                PAYMENTS (Lines 25-33)
              </div>
              <div style={sectionContentStyle}>
                <Show when={result.line25a_w2Withholding > 0}>
                  <div style={lineStyle}>
                    <span style={lineNumberStyle}>25a</span>
                    <span style={lineLabelStyle}>Federal tax withheld (W-2 Box 2)</span>
                    <span style={lineValueStyle()}>{formatCurrency(result.line25a_w2Withholding)}</span>
                  </div>
                </Show>
                <Show when={result.line25b_1099Withholding > 0}>
                  <div style={lineStyle}>
                    <span style={lineNumberStyle}>25b</span>
                    <span style={lineLabelStyle}>Federal tax withheld (1099s)</span>
                    <span style={lineValueStyle()}>{formatCurrency(result.line25b_1099Withholding)}</span>
                  </div>
                </Show>
                <div style={lineStyle}>
                  <span style={lineNumberStyle}>25d</span>
                  <span style={lineLabelStyle}>Total federal tax withheld</span>
                  <span style={lineValueStyle()}>{formatCurrency(result.line25d_totalWithholding)}</span>
                </div>
                <Show when={result.line27_eic > 0}>
                  <div style={lineStyle}>
                    <span style={lineNumberStyle}>27</span>
                    <span style={lineLabelStyle}>Earned Income Credit (EIC)</span>
                    <span style={{ ...lineValueStyle(), color: '#22c55e' }}>{formatCurrency(result.line27_eic)}</span>
                  </div>
                </Show>
                <Show when={result.line28_actc > 0}>
                  <div style={lineStyle}>
                    <span style={lineNumberStyle}>28</span>
                    <span style={lineLabelStyle}>Additional Child Tax Credit (Refundable)</span>
                    <span style={{ ...lineValueStyle(), color: '#22c55e' }}>{formatCurrency(result.line28_actc)}</span>
                  </div>
                </Show>
                <div style={totalLineStyle}>
                  <span style={lineNumberStyle}>33</span>
                  <span style={lineLabelStyle}>TOTAL PAYMENTS</span>
                  <span style={lineValueStyle(true)}>{formatCurrency(result.line33_totalPayments)}</span>
                </div>
              </div>

              {/* FORM 8962 - PREMIUM TAX CREDIT (if 1095-A present) */}
              <Show when={result.form8962}>
                <div style={{ ...sectionHeaderStyle, background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }}>
                  FORM 8962 - PREMIUM TAX CREDIT (1095-A)
                </div>
                <div style={sectionContentStyle}>
                  <div style={lineStyle}>
                    <span style={lineNumberStyle}>Info</span>
                    <span style={lineLabelStyle}>Family Size / Federal Poverty Level</span>
                    <span style={lineValueStyle()}>{result.form8962!.familySize} persons / {formatCurrency(result.form8962!.federalPovertyLevel)}</span>
                  </div>
                  <div style={lineStyle}>
                    <span style={lineNumberStyle}>%FPL</span>
                    <span style={lineLabelStyle}>Household Income as % of FPL</span>
                    <span style={lineValueStyle()}>{result.form8962!.incomeAsFplPercent.toFixed(1)}%</span>
                  </div>
                  <div style={lineStyle}>
                    <span style={lineNumberStyle}>11</span>
                    <span style={lineLabelStyle}>Applicable % / Annual Contribution</span>
                    <span style={lineValueStyle()}>{result.form8962!.applicablePercentage.toFixed(2)}% = {formatCurrency(result.form8962!.annualContributionAmount)}</span>
                  </div>
                  <div style={subLineStyle}>
                    <span>1095-A ({result.form8962!.coverageMonths} months): Premium: {formatCurrency(result.form8962!.totalAnnualPremium)} | SLCSP: {formatCurrency(result.form8962!.totalAnnualSlcsp)} | APTC: {formatCurrency(result.form8962!.totalAnnualAptc)}</span>
                    <span></span>
                  </div>
                  <div style={lineStyle}>
                    <span style={lineNumberStyle}>24</span>
                    <span style={lineLabelStyle}>Total Premium Tax Credit Allowed</span>
                    <span style={lineValueStyle()}>{formatCurrency(result.form8962!.annualPtcAllowed)}</span>
                  </div>
                  <div style={lineStyle}>
                    <span style={lineNumberStyle}>25</span>
                    <span style={lineLabelStyle}>Advance PTC Received (APTC)</span>
                    <span style={lineValueStyle()}>{formatCurrency(result.form8962!.totalAnnualAptc)}</span>
                  </div>
                  <Show when={result.form8962!.additionalPtc > 0}>
                    <div style={{ ...lineStyle, background: 'rgba(34, 197, 94, 0.1)', padding: '0.75rem', 'border-radius': '6px' }}>
                      <span style={lineNumberStyle}>26</span>
                      <span style={lineLabelStyle}>Net Premium Tax Credit (Additional Refund)</span>
                      <span style={{ ...lineValueStyle(true), color: '#22c55e' }}>{formatCurrency(result.form8962!.additionalPtc)}</span>
                    </div>
                  </Show>
                  <Show when={result.form8962!.excessAptc > 0}>
                    <div style={lineStyle}>
                      <span style={lineNumberStyle}>27</span>
                      <span style={lineLabelStyle}>Excess APTC (Before Limitation)</span>
                      <span style={lineValueStyle()}>{formatCurrency(result.form8962!.excessAptc)}</span>
                    </div>
                    <Show when={result.form8962!.repaymentLimitation !== null}>
                      <div style={lineStyle}>
                        <span style={lineNumberStyle}>28</span>
                        <span style={lineLabelStyle}>Repayment Limitation</span>
                        <span style={lineValueStyle()}>{formatCurrency(result.form8962!.repaymentLimitation!)}</span>
                      </div>
                    </Show>
                    <div style={{ ...lineStyle, background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', 'border-radius': '6px' }}>
                      <span style={lineNumberStyle}>29</span>
                      <span style={lineLabelStyle}>Excess APTC Repayment (to Schedule 2)</span>
                      <span style={{ ...lineValueStyle(true), color: '#ef4444' }}>{formatCurrency(result.form8962!.excessAptcRepayment)}</span>
                    </div>
                  </Show>
                </div>
              </Show>

              {/* REFUND OR AMOUNT OWED */}
              <div style={resultBoxStyle(result.line34_refund > 0)}>
                <Show when={result.line34_refund > 0}>
                  <div style={{ 'font-size': '0.875rem', color: '#166534', 'margin-bottom': '0.5rem' }}>
                    Line 34 - REFUND
                  </div>
                  <div style={{ 'font-size': '2.5rem', 'font-weight': '700', color: '#22c55e' }}>
                    {formatCurrency(result.line34_refund)}
                  </div>
                  <div style={{ 'font-size': '0.75rem', color: '#166534', 'margin-top': '0.5rem' }}>
                    Payments ({formatCurrency(result.line33_totalPayments)}) - Tax ({formatCurrency(result.line24_totalTax)})
                  </div>
                </Show>
                <Show when={result.line37_amountOwed > 0}>
                  <div style={{ 'font-size': '0.875rem', color: '#991b1b', 'margin-bottom': '0.5rem' }}>
                    Line 37 - AMOUNT YOU OWE
                  </div>
                  <div style={{ 'font-size': '2.5rem', 'font-weight': '700', color: '#ef4444' }}>
                    {formatCurrency(result.line37_amountOwed)}
                  </div>
                  <div style={{ 'font-size': '0.75rem', color: '#991b1b', 'margin-top': '0.5rem' }}>
                    Tax ({formatCurrency(result.line24_totalTax)}) - Payments ({formatCurrency(result.line33_totalPayments)})
                  </div>
                </Show>
                <Show when={result.line34_refund === 0 && result.line37_amountOwed === 0}>
                  <div style={{ 'font-size': '1.25rem', 'font-weight': '600', color: 'var(--text-secondary)' }}>
                    No refund or amount owed
                  </div>
                </Show>
              </div>

              <p style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', 'margin-top': '1rem', 'text-align': 'center' as const }}>
                * This is a preliminary estimate. Actual results may vary based on additional deductions, credits, and IRS verification.
              </p>
            </Card>
          );
        }}
      </Show>

      {/* Credit Detection Panel - shown after calculation */}
      <Show when={calculationResult()}>
        <div style={{ 'margin-top': '1.5rem' }}>
          <CreditDetectionPanel
            client={props.client}
            calculationResult={calculationResult()! as any}
          />
        </div>
      </Show>

      {/* Year Over Year Comparison - shown after calculation for returning clients */}
      <Show when={calculationResult() && props.previousYearData}>
        <div style={{ 'margin-top': '1.5rem' }}>
          <YearOverYearComparison
            currentYearData={calculationResult()! as any}
            previousYearData={null}
          />
        </div>
      </Show>

      {/* Step Progression Actions */}
      <Show when={calculationResult() && !returnFiled()}>
        <Card>
          <h4 style={{ ...titleStyle, 'margin-bottom': '1rem' }}>
            <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '20px', height: '20px', 'vertical-align': 'middle', 'margin-right': '0.5rem', color: '#3b82f6' }}>
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clip-rule="evenodd" />
            </svg>
            Advance to Next Step
          </h4>

          <div style={{ display: 'flex', 'flex-direction': 'column', gap: '1rem' }}>
            {/* Mark Review Complete */}
            <Show when={!reviewCompleted()}>
              <div style={{
                display: 'flex',
                'align-items': 'center',
                'justify-content': 'space-between',
                padding: '1rem',
                background: 'var(--surface-alt, #f9fafb)',
                'border-radius': '8px',
                border: '1px solid var(--border-color, #e5e7eb)'
              }}>
                <div>
                  <div style={{ 'font-weight': '600', 'margin-bottom': '0.25rem' }}>Review with Client</div>
                  <div style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)' }}>
                    Review calculation results and prepare return
                  </div>
                </div>
                <button
                  style={bigButtonStyle('primary', false)}
                  onClick={() => setReviewCompleted(true)}
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '18px', height: '18px' }}>
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                  Mark Review Complete
                </button>
              </div>
            </Show>

            {/* Request Signatures */}
            <Show when={reviewCompleted() && !signaturesObtained()}>
              <div style={{
                display: 'flex',
                'align-items': 'center',
                'justify-content': 'space-between',
                padding: '1rem',
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.05), rgba(139, 92, 246, 0.1))',
                'border-radius': '8px',
                border: '1px solid rgba(139, 92, 246, 0.2)'
              }}>
                <div>
                  <div style={{ 'font-weight': '600', 'margin-bottom': '0.25rem' }}>Client Signatures</div>
                  <div style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)' }}>
                    Request client to sign tax return
                  </div>
                </div>
                <button
                  style={bigButtonStyle('primary', false)}
                  onClick={() => setSignaturesObtained(true)}
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '18px', height: '18px' }}>
                    <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                    <path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" />
                  </svg>
                  Mark Signatures Obtained
                </button>
              </div>
            </Show>

            {/* File Return */}
            <Show when={signaturesObtained() && !returnFiled()}>
              <div style={{
                display: 'flex',
                'align-items': 'center',
                'justify-content': 'space-between',
                padding: '1rem',
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.05), rgba(34, 197, 94, 0.1))',
                'border-radius': '8px',
                border: '1px solid rgba(34, 197, 94, 0.2)'
              }}>
                <div>
                  <div style={{ 'font-weight': '600', 'margin-bottom': '0.25rem' }}>File Tax Return</div>
                  <div style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)' }}>
                    Mark return as filed with IRS
                  </div>
                </div>
                <button
                  style={bigButtonStyle('success', false)}
                  onClick={() => setReturnFiled(true)}
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '18px', height: '18px' }}>
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                  Mark as Filed
                </button>
              </div>
            </Show>
          </div>
        </Card>
      </Show>

      {/* Filing Complete */}
      <Show when={returnFiled()}>
        <Card>
          <div style={{
            'text-align': 'center',
            padding: '2rem',
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.05), rgba(34, 197, 94, 0.15))',
            'border-radius': '12px'
          }}>
            <div style={{ 'font-size': '4rem', 'margin-bottom': '1rem' }}>
              <svg viewBox="0 0 20 20" fill="#22c55e" style={{ width: '64px', height: '64px' }}>
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
            </div>
            <h3 style={{ 'font-size': '1.5rem', 'font-weight': '700', color: '#166534', 'margin-bottom': '0.5rem' }}>
              Tax Return Filed!
            </h3>
            <p style={{ color: '#22c55e', 'font-size': '1rem' }}>
              {props.client.firstName}'s {props.taxYear} tax return has been successfully filed.
            </p>
          </div>
        </Card>
      </Show>

      {/* Next Steps */}
      <div style={nextStepsStyle}>
        <div style={nextStepsTitleStyle}>
          <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '18px', height: '18px' }}>
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
          </svg>
          Next Steps
        </div>
        <ul style={nextStepsListStyle}>
          <Show when={docStats().pending > 0}>
            <li>Review and verify {docStats().pending} pending document(s)</li>
          </Show>
          <Show when={docStats().errors > 0}>
            <li>Resolve {docStats().errors} document error(s)</li>
          </Show>
          <Show when={!calculationResult() && docStats().verified > 0}>
            <li>Run tax calculation to see estimated results</li>
          </Show>
          <Show when={calculationResult()}>
            <li>Review calculation results with client</li>
            <li>Export data to Drake Tax Software</li>
            <li>Complete and file return</li>
          </Show>
          <Show when={docStats().total === 0}>
            <li>Upload tax documents to begin</li>
          </Show>
        </ul>
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default TaxPrepSection;
