// Tax Return Calculator Types

export type FilingStatus = 'single' | 'married_joint' | 'married_separate' | 'head_of_household';

export interface CustomerTaxInfo {
  firstName: string;
  lastName: string;
  ssn: string;
  filingStatus: FilingStatus;
  dependents: number;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  age?: number; // For Form 8880 eligibility
  isFullTimeStudent?: boolean; // For Form 8880 eligibility
  isClaimedAsDependent?: boolean; // For Form 8880 eligibility
}

export interface W2Form {
  id: string;
  employer: string;
  ein: string; // Employer Identification Number
  wages: number; // Box 1: Wages, tips, other compensation
  federalTaxWithheld: number; // Box 2: Federal income tax withheld
  socialSecurityWages: number; // Box 3: Social security wages
  socialSecurityTaxWithheld: number; // Box 4: Social security tax withheld
  medicareWages: number; // Box 5: Medicare wages and tips
  medicareTaxWithheld: number; // Box 6: Medicare tax withheld
  stateTaxWithheld?: number; // Box 17: State income tax
}

export interface Form1099 {
  id: string;
  payer: string;
  payerTIN: string; // Payer's Tax Identification Number
  type: '1099-MISC' | '1099-NEC' | '1099-INT' | '1099-DIV';
  amount: number;
  federalTaxWithheld: number;
  description: string;
}

export interface TaxDeduction {
  id: string;
  category: string;
  description: string;
  amount: number;
}

export interface BusinessExpense {
  id: string;
  category: 'mileage' | 'insurance' | 'phone' | 'depreciation' | 'supplies' | 'rent' | 'utilities' | 'advertising' | 'professional_services' | 'other';
  description: string;
  amount: number;
  miles?: number; // For mileage category
}

export interface WithholdingRecommendation {
  annual: number;
  monthly: number;
  biweekly: number;
  weekly: number;
  recommendedW4Allowances: number;
}

export interface TaxCalculationResult {
  // Reference Information
  calculationReference: string; // Unique reference number for this calculation
  calculationDate: string; // Date and time of calculation
  customerName: string; // Full name of customer
  taxYear: number; // Tax year (e.g., 2024)

  // Income
  totalW2Income: number;
  total1099Income: number; // Total of all 1099s
  total1099InvestmentIncome: number; // INT + DIV (not subject to SE tax)
  total1099SelfEmploymentIncome: number; // NEC + MISC (subject to SE tax)
  totalBusinessExpenses: number;
  netSelfEmploymentIncome: number;
  totalIncome: number;
  adjustedGrossIncome: number;
  selfEmploymentTax: number;
  selfEmploymentTaxDeduction: number;

  // Deductions
  standardDeduction: number;
  totalItemizedDeductions: number;
  mortgageInterestPaid: number; // From Form 1098
  propertyTaxesPaid: number; // From Form 1098
  deductionUsed: 'standard' | 'itemized';
  deductionAmount: number;
  qbiDeduction: number; // Qualified Business Income Deduction (20% of QBI)

  // Taxable Income
  taxableIncome: number;

  // Tax Calculations
  federalTaxLiability: number;
  totalWithheld: number;

  // Credits
  childTaxCredit: number;
  additionalChildTaxCredit: number; // Refundable portion of CTC
  earnedIncomeCredit: number;
  americanOpportunityCredit: number; // Form 8863 - partially refundable
  americanOpportunityCreditRefundable: number; // Refundable portion (40% of AOC)
  lifetimeLearningCredit: number; // Form 8863 - non-refundable
  otherCredits: number;
  totalCredits: number;

  // Payroll Taxes
  socialSecurityTax: number;
  medicareTax: number;
  additionalMedicareTax: number;
  totalPayrollTax: number;

  // Final Result
  taxDue: number;
  refundAmount: number;
  effectiveTaxRate: number;

  // Withholding Recommendations
  recommendedWithholding: WithholdingRecommendation;
  withholdingStatus: 'adequate' | 'underwithholding' | 'overwithholding';
  withholdingDifference: number;

  // Breakdown by bracket
  taxBracketBreakdown: {
    bracket: string;
    taxableAmount: number;
    taxAmount: number;
    rate: number;
  }[];

  // State Tax
  stateTaxState: string;
  stateTaxableIncome: number;
  stateTaxLiability: number;
  stateTaxWithheld: number;
  stateTaxDue: number;
  stateTaxRefund: number;
  stateTaxRate: number;
}

// Retirement Contributions (Form 8880)
export interface RetirementContribution {
  id: string;
  type: 'traditional_ira' | 'roth_ira' | '401k' | '403b' | 'simple' | 'sep' | '457b' | 'sarsep';
  amount: number;
  description: string;
}

// Rental Property (Schedule E - Part I)
export interface RentalProperty {
  id: string;
  address: string;
  type: 'Single Family' | 'Multi-Family' | 'Vacation/Short-Term' | 'Commercial' | 'Land';
  daysRented: number; // Number of days rented
  daysPersonalUse: number; // Number of days used personally
  fairRentalDays: number; // Number of days available for rent
  rentsReceived: number;
  royaltiesReceived: number;
  // Expenses
  advertising: number;
  auto: number;
  cleaning: number;
  commissions: number;
  insurance: number;
  legal: number;
  management: number;
  mortgageInterest: number;
  otherInterest: number;
  repairs: number;
  supplies: number;
  taxes: number;
  utilities: number;
  depreciation: number;
  otherExpenses: number;
}

// Partnership/S Corp Income (Schedule E - Part II)
export interface PartnershipIncome {
  id: string;
  name: string;
  ein: string;
  isPassive: boolean; // Passive or non-passive activity
  ordinaryIncome: number; // Box 1 from K-1
  description: string;
}

// Estate/Trust Income (Schedule E - Part III)
export interface EstateIncome {
  id: string;
  name: string;
  ein: string;
  isPassive: boolean;
  ordinaryIncome: number;
  description: string;
}

// Form 1098 - Mortgage Interest Statement
export interface Form1098 {
  id: string;
  lender: string; // Name of lender
  lenderTIN: string; // Lender's TIN
  mortgageInterest: number; // Box 1: Mortgage interest received from payer(s)
  outstandingPrincipal: number; // Box 2: Outstanding mortgage principal
  mortgageOriginationDate: string; // Box 3: Mortgage origination date
  refundOfOverpaidInterest: number; // Box 4: Refund of overpaid interest
  mortgageInsurancePremiums: number; // Box 5: Mortgage insurance premiums
  pointsPaid: number; // Box 6: Points paid on purchase of principal residence
  propertyAddress: string; // Address of property
  propertyTaxes: number; // Box 10: Property taxes (if included)
  isMainHome: boolean; // Is this for main home or second home?
  description: string;
}

// Form 1098-T - Tuition Statement
export interface Form1098T {
  id: string;
  institution: string; // Name of educational institution
  institutionEIN: string; // Institution's EIN
  studentSSN: string; // Student's SSN
  studentName: string; // Student's name
  qualifiedExpenses: number; // Box 1: Payments received for qualified tuition
  adjustmentsPriorYear: number; // Box 4: Adjustments made for prior year
  scholarshipsGrants: number; // Box 5: Scholarships or grants
  adjustmentsForPriorYearScholarships: number; // Box 6: Adjustments to scholarships for prior year
  isAtLeastHalfTime: boolean; // Box 7: Check if at least half-time student
  isGraduateStudent: boolean; // Box 8: Check if graduate student
  academicPeriod: string; // Academic period (e.g., "2024 Spring", "2024-2025")
  includesAmountsForNextYear: boolean; // Box 9: Includes amounts for academic period beginning in next year
  description: string;
}

export interface TaxFormData {
  taxYear: 2024 | 2025; // Tax year for calculations
  customerInfo: CustomerTaxInfo;
  w2Forms: W2Form[];
  form1099s: Form1099[];
  deductions: TaxDeduction[];
  businessExpenses: BusinessExpense[];
  retirementContributions?: RetirementContribution[]; // For Form 8880
  rentalProperties?: RentalProperty[]; // For Schedule E Part I
  partnershipIncomes?: PartnershipIncome[]; // For Schedule E Part II
  estateIncomes?: EstateIncome[]; // For Schedule E Part III
  form1098s?: Form1098[]; // For Schedule A (Mortgage Interest)
  form1098Ts?: Form1098T[]; // For Form 8863 (Education Credits)
}
