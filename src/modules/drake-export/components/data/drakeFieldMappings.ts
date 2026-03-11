/**
 * Drake Field Mappings
 * Defines the mapping between extracted tax data and Drake CSV fields
 */

import { DrakeTaxDocumentType, ExtractedTaxAmounts } from '../../types/drakeTypes';

// Box definition for a tax form
export interface TaxFormBoxDefinition {
  boxNumber: string;
  description: string;
  dataField: keyof ExtractedTaxAmounts;
  drakeFieldCode: string;
  required?: boolean;
  scheduleMapping?: {
    schedule: string;
    line: string;
  };
}

// Complete form definition
export interface TaxFormDefinition {
  formCode: string;
  formName: string;
  drakeFormType: DrakeTaxDocumentType;
  description: string;
  boxes: TaxFormBoxDefinition[];
  color: string;
  icon: string;
}

// W-2 Form Definition
export const W2_DEFINITION: TaxFormDefinition = {
  formCode: 'W2',
  formName: 'Form W-2',
  drakeFormType: 'w2',
  description: 'Wage and Tax Statement',
  color: '#3b82f6',
  icon: '📄',
  boxes: [
    { boxNumber: '1', description: 'Wages, tips, other compensation', dataField: 'wages', drakeFieldCode: 'W2_BOX1', required: true, scheduleMapping: { schedule: '1040', line: '1' } },
    { boxNumber: '2', description: 'Federal income tax withheld', dataField: 'federalTaxWithheld', drakeFieldCode: 'W2_BOX2', required: true },
    { boxNumber: '3', description: 'Social security wages', dataField: 'socialSecurityWages', drakeFieldCode: 'W2_BOX3' },
    { boxNumber: '4', description: 'Social security tax withheld', dataField: 'socialSecurityTax', drakeFieldCode: 'W2_BOX4' },
    { boxNumber: '5', description: 'Medicare wages and tips', dataField: 'medicareWages', drakeFieldCode: 'W2_BOX5' },
    { boxNumber: '6', description: 'Medicare tax withheld', dataField: 'medicareTax', drakeFieldCode: 'W2_BOX6' },
    { boxNumber: '7', description: 'Social security tips', dataField: 'socialSecurityTips', drakeFieldCode: 'W2_BOX7' },
    { boxNumber: '8', description: 'Allocated tips', dataField: 'allocatedTips', drakeFieldCode: 'W2_BOX8' },
    { boxNumber: '10', description: 'Dependent care benefits', dataField: 'dependentCareBenefits', drakeFieldCode: 'W2_BOX10' },
    { boxNumber: '11', description: 'Nonqualified plans', dataField: 'nonqualifiedPlans', drakeFieldCode: 'W2_BOX11' },
    { boxNumber: '16', description: 'State wages, tips, etc.', dataField: 'stateWages', drakeFieldCode: 'W2_BOX16' },
    { boxNumber: '17', description: 'State income tax', dataField: 'stateTaxWithheld', drakeFieldCode: 'W2_BOX17' },
    { boxNumber: '18', description: 'Local wages, tips, etc.', dataField: 'localWages', drakeFieldCode: 'W2_BOX18' },
    { boxNumber: '19', description: 'Local income tax', dataField: 'localTaxWithheld', drakeFieldCode: 'W2_BOX19' }
  ]
};

// 1099-NEC Form Definition
export const FORM_1099_NEC_DEFINITION: TaxFormDefinition = {
  formCode: '1099NEC',
  formName: 'Form 1099-NEC',
  drakeFormType: '1099_nec',
  description: 'Nonemployee Compensation',
  color: '#f97316',
  icon: '📋',
  boxes: [
    { boxNumber: '1', description: 'Nonemployee compensation', dataField: 'nonEmployeeCompensation', drakeFieldCode: '1099NEC_BOX1', required: true, scheduleMapping: { schedule: 'C', line: '1' } },
    { boxNumber: '4', description: 'Federal income tax withheld', dataField: 'federalTaxWithheld1099', drakeFieldCode: '1099NEC_BOX4' }
  ]
};

// 1099-MISC Form Definition
export const FORM_1099_MISC_DEFINITION: TaxFormDefinition = {
  formCode: '1099MISC',
  formName: 'Form 1099-MISC',
  drakeFormType: '1099_misc',
  description: 'Miscellaneous Income',
  color: '#f59e0b',
  icon: '📋',
  boxes: [
    { boxNumber: '1', description: 'Rents', dataField: 'rents', drakeFieldCode: '1099MISC_BOX1', scheduleMapping: { schedule: 'E', line: '3' } },
    { boxNumber: '2', description: 'Royalties', dataField: 'royalties', drakeFieldCode: '1099MISC_BOX2', scheduleMapping: { schedule: 'E', line: '4' } },
    { boxNumber: '3', description: 'Other income', dataField: 'otherIncome', drakeFieldCode: '1099MISC_BOX3' },
    { boxNumber: '4', description: 'Federal income tax withheld', dataField: 'federalTaxWithheld1099', drakeFieldCode: '1099MISC_BOX4' },
    { boxNumber: '5', description: 'Fishing boat proceeds', dataField: 'fishingBoatProceeds', drakeFieldCode: '1099MISC_BOX5' },
    { boxNumber: '6', description: 'Medical and health care payments', dataField: 'medicalPayments', drakeFieldCode: '1099MISC_BOX6' },
    { boxNumber: '10', description: 'Crop insurance proceeds', dataField: 'cropInsurance', drakeFieldCode: '1099MISC_BOX10' },
    { boxNumber: '14', description: 'Gross proceeds paid to attorney', dataField: 'grossProceeds', drakeFieldCode: '1099MISC_BOX14' }
  ]
};

// 1099-INT Form Definition
export const FORM_1099_INT_DEFINITION: TaxFormDefinition = {
  formCode: '1099INT',
  formName: 'Form 1099-INT',
  drakeFormType: '1099_int',
  description: 'Interest Income',
  color: '#10b981',
  icon: '💰',
  boxes: [
    { boxNumber: '1', description: 'Interest income', dataField: 'interestIncome', drakeFieldCode: '1099INT_BOX1', required: true, scheduleMapping: { schedule: 'B', line: '1' } },
    { boxNumber: '2', description: 'Early withdrawal penalty', dataField: 'earlyWithdrawalPenalty', drakeFieldCode: '1099INT_BOX2' },
    { boxNumber: '3', description: 'Interest on U.S. Savings Bonds', dataField: 'usSavingsBondInterest', drakeFieldCode: '1099INT_BOX3' },
    { boxNumber: '4', description: 'Federal income tax withheld', dataField: 'federalTaxWithheld1099', drakeFieldCode: '1099INT_BOX4' },
    { boxNumber: '8', description: 'Tax-exempt interest', dataField: 'taxExemptInterest', drakeFieldCode: '1099INT_BOX8' },
    { boxNumber: '9', description: 'Private activity bond interest', dataField: 'privateBondInterest', drakeFieldCode: '1099INT_BOX9' }
  ]
};

// 1099-DIV Form Definition
export const FORM_1099_DIV_DEFINITION: TaxFormDefinition = {
  formCode: '1099DIV',
  formName: 'Form 1099-DIV',
  drakeFormType: '1099_div',
  description: 'Dividends and Distributions',
  color: '#8b5cf6',
  icon: '📊',
  boxes: [
    { boxNumber: '1a', description: 'Total ordinary dividends', dataField: 'ordinaryDividends', drakeFieldCode: '1099DIV_BOX1A', required: true, scheduleMapping: { schedule: 'B', line: '5' } },
    { boxNumber: '1b', description: 'Qualified dividends', dataField: 'qualifiedDividends', drakeFieldCode: '1099DIV_BOX1B' },
    { boxNumber: '2a', description: 'Total capital gain distributions', dataField: 'capitalGainDistributions', drakeFieldCode: '1099DIV_BOX2A' },
    { boxNumber: '2b', description: 'Unrecap. Sec. 1250 gain', dataField: 'unrecaptured1250Gain', drakeFieldCode: '1099DIV_BOX2B' },
    { boxNumber: '2c', description: 'Section 1202 gain', dataField: 'section1202Gain', drakeFieldCode: '1099DIV_BOX2C' },
    { boxNumber: '2d', description: 'Collectibles (28%) gain', dataField: 'collectiblesGain', drakeFieldCode: '1099DIV_BOX2D' },
    { boxNumber: '3', description: 'Nondividend distributions', dataField: 'nondividendDistributions', drakeFieldCode: '1099DIV_BOX3' },
    { boxNumber: '4', description: 'Federal income tax withheld', dataField: 'federalTaxWithheld1099', drakeFieldCode: '1099DIV_BOX4' },
    { boxNumber: '5', description: 'Section 199A dividends', dataField: 'section199ADividends', drakeFieldCode: '1099DIV_BOX5' },
    { boxNumber: '6', description: 'Investment expenses', dataField: 'investmentExpenses', drakeFieldCode: '1099DIV_BOX6' },
    { boxNumber: '7', description: 'Foreign tax paid', dataField: 'foreignTaxPaid', drakeFieldCode: '1099DIV_BOX7' },
    { boxNumber: '12', description: 'Exempt-interest dividends', dataField: 'exemptInterestDividends', drakeFieldCode: '1099DIV_BOX12' }
  ]
};

// 1098 Mortgage Interest Form Definition
export const FORM_1098_DEFINITION: TaxFormDefinition = {
  formCode: '1098',
  formName: 'Form 1098',
  drakeFormType: '1098',
  description: 'Mortgage Interest Statement',
  color: '#ef4444',
  icon: '🏠',
  boxes: [
    { boxNumber: '1', description: 'Mortgage interest received', dataField: 'mortgageInterest', drakeFieldCode: '1098_BOX1', required: true, scheduleMapping: { schedule: 'A', line: '8a' } },
    { boxNumber: '2', description: 'Outstanding mortgage principal', dataField: 'outstandingPrincipal', drakeFieldCode: '1098_BOX2' },
    { boxNumber: '4', description: 'Refund of overpaid interest', dataField: 'refundOfOverpaidInterest', drakeFieldCode: '1098_BOX4' },
    { boxNumber: '5', description: 'Mortgage insurance premiums', dataField: 'mortgageInsurancePremiums', drakeFieldCode: '1098_BOX5', scheduleMapping: { schedule: 'A', line: '8d' } },
    { boxNumber: '6', description: 'Points paid on purchase', dataField: 'pointsPaid', drakeFieldCode: '1098_BOX6' },
    { boxNumber: 'Prop', description: 'Property taxes', dataField: 'propertyTaxes', drakeFieldCode: '1098_PROPTAX', scheduleMapping: { schedule: 'A', line: '5b' } }
  ]
};

// 1098-T Tuition Form Definition
export const FORM_1098_T_DEFINITION: TaxFormDefinition = {
  formCode: '1098T',
  formName: 'Form 1098-T',
  drakeFormType: '1098_t',
  description: 'Tuition Statement',
  color: '#06b6d4',
  icon: '🎓',
  boxes: [
    { boxNumber: '1', description: 'Payments received for qualified tuition', dataField: 'paymentsReceived', drakeFieldCode: '1098T_BOX1', required: true },
    { boxNumber: '4', description: 'Adjustments made for a prior year', dataField: 'adjustmentsPriorYear', drakeFieldCode: '1098T_BOX4' },
    { boxNumber: '5', description: 'Scholarships or grants', dataField: 'scholarshipsGrants', drakeFieldCode: '1098T_BOX5' },
    { boxNumber: '6', description: 'Adjustments to scholarships', dataField: 'adjustmentsScholarships', drakeFieldCode: '1098T_BOX6' }
  ]
};

// Schedule K-1 Form Definition
export const SCHEDULE_K1_DEFINITION: TaxFormDefinition = {
  formCode: 'K1',
  formName: 'Schedule K-1',
  drakeFormType: 'schedule_k1',
  description: 'Partner/Shareholder Income',
  color: '#ec4899',
  icon: '🤝',
  boxes: [
    { boxNumber: '1', description: 'Ordinary business income (loss)', dataField: 'ordinaryBusinessIncome', drakeFieldCode: 'K1_BOX1', scheduleMapping: { schedule: 'E', line: '28' } },
    { boxNumber: '2', description: 'Net rental real estate income (loss)', dataField: 'rentalRealEstateIncome', drakeFieldCode: 'K1_BOX2', scheduleMapping: { schedule: 'E', line: '28' } },
    { boxNumber: '3', description: 'Other net rental income (loss)', dataField: 'otherRentalIncome', drakeFieldCode: 'K1_BOX3' },
    { boxNumber: '4', description: 'Guaranteed payments', dataField: 'guaranteedPayments', drakeFieldCode: 'K1_BOX4', scheduleMapping: { schedule: 'SE', line: '2' } },
    { boxNumber: '5', description: 'Interest income', dataField: 'interestIncomeK1', drakeFieldCode: 'K1_BOX5', scheduleMapping: { schedule: 'B', line: '1' } },
    { boxNumber: '6a', description: 'Ordinary dividends', dataField: 'dividendIncomeK1', drakeFieldCode: 'K1_BOX6A', scheduleMapping: { schedule: 'B', line: '5' } },
    { boxNumber: '6b', description: 'Qualified dividends', dataField: 'qualifiedDividendsK1', drakeFieldCode: 'K1_BOX6B' },
    { boxNumber: '7', description: 'Royalties', dataField: 'royaltiesK1', drakeFieldCode: 'K1_BOX7', scheduleMapping: { schedule: 'E', line: '4' } },
    { boxNumber: '8', description: 'Net short-term capital gain (loss)', dataField: 'shortTermCapitalGain', drakeFieldCode: 'K1_BOX8', scheduleMapping: { schedule: 'D', line: '5' } },
    { boxNumber: '9a', description: 'Net long-term capital gain (loss)', dataField: 'longTermCapitalGain', drakeFieldCode: 'K1_BOX9A', scheduleMapping: { schedule: 'D', line: '12' } },
    { boxNumber: '9b', description: 'Unrecaptured section 1250 gain', dataField: 'unrecaptured1250GainK1', drakeFieldCode: 'K1_BOX9B' },
    { boxNumber: '10', description: 'Net section 1231 gain (loss)', dataField: 'section1231Gain', drakeFieldCode: 'K1_BOX10' },
    { boxNumber: '12', description: 'Section 179 deduction', dataField: 'section179Deduction', drakeFieldCode: 'K1_BOX12' },
    { boxNumber: '14', description: 'Self-employment earnings (loss)', dataField: 'selfEmploymentEarnings', drakeFieldCode: 'K1_BOX14', scheduleMapping: { schedule: 'SE', line: '2' } }
  ]
};

// Receipt/Expense Definition (for deductions)
export const RECEIPT_DEFINITION: TaxFormDefinition = {
  formCode: 'RCPT',
  formName: 'Receipt/Expense',
  drakeFormType: 'receipt',
  description: 'Deductible Expense',
  color: '#64748b',
  icon: '🧾',
  boxes: [
    { boxNumber: 'AMT', description: 'Total amount', dataField: 'totalAmount', drakeFieldCode: 'RCPT_AMT' }
  ]
};

// All form definitions indexed by Drake type (excludes verification form types which have no box definitions)
export const FORM_DEFINITIONS: Partial<Record<DrakeTaxDocumentType, TaxFormDefinition>> = {
  'w2': W2_DEFINITION,
  '1099_nec': FORM_1099_NEC_DEFINITION,
  '1099_misc': FORM_1099_MISC_DEFINITION,
  '1099_int': FORM_1099_INT_DEFINITION,
  '1099_div': FORM_1099_DIV_DEFINITION,
  '1098': FORM_1098_DEFINITION,
  '1098_t': FORM_1098_T_DEFINITION,
  'schedule_k1': SCHEDULE_K1_DEFINITION,
  'receipt': RECEIPT_DEFINITION,
  'other': RECEIPT_DEFINITION
};

// Get form definition by Drake type
export function getFormDefinition(drakeType: DrakeTaxDocumentType): TaxFormDefinition | undefined {
  return FORM_DEFINITIONS[drakeType] || RECEIPT_DEFINITION;
}

// Get all boxes for a form type that have values
export function getPopulatedBoxes(
  drakeType: DrakeTaxDocumentType,
  amounts: ExtractedTaxAmounts
): { box: TaxFormBoxDefinition; value: number }[] {
  const definition = getFormDefinition(drakeType);
  const populated: { box: TaxFormBoxDefinition; value: number }[] = [];

  for (const box of definition.boxes) {
    const value = amounts[box.dataField];
    if (typeof value === 'number' && value !== 0) {
      populated.push({ box, value });
    }
  }

  return populated;
}

// Drake CSV headers
export const DRAKE_CSV_HEADERS = [
  'SSN',
  'FirstName',
  'MiddleInit',
  'LastName',
  'Suffix',
  'TaxYear',
  'FormType',
  'BoxNumber',
  'Amount',
  'Description',
  'PayerName',
  'PayerEIN',
  'PayerAddress',
  'State',
  'StateID'
];

// Format amount for Drake CSV (2 decimal places, no currency symbol)
export function formatDrakeAmount(amount: number): string {
  return amount.toFixed(2);
}

// Format SSN for Drake CSV (with dashes)
export function formatDrakeSSN(ssn: string): string {
  const cleaned = ssn.replace(/\D/g, '');
  if (cleaned.length === 9) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5)}`;
  }
  return ssn;
}

// Format EIN for Drake CSV (with dash)
export function formatDrakeEIN(ein: string): string {
  const cleaned = ein.replace(/\D/g, '');
  if (cleaned.length === 9) {
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2)}`;
  }
  return ein;
}
