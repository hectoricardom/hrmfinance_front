/**
 * Tax Strategy Checklist Types
 * Interfaces for the comprehensive tax strategy checklist (Cuestionario de Captura Fiscal)
 */

// Base checklist item
export interface ChecklistItem {
  id: string;
  checked: boolean;
  amount?: number;
  notes?: string;
}

// --- Deductions (Schedule A) ---

export interface DeductionsChecklist {
  medical: {
    medicalExpenses: ChecklistItem;
    dentalExpenses: ChecklistItem;
    visionExpenses: ChecklistItem;
    healthInsurancePremiums: ChecklistItem;
    prescriptionMedications: ChecklistItem;
    medicalMileage: ChecklistItem;
  };
  taxesPaid: {
    stateIncomeTax: ChecklistItem;
    localIncomeTax: ChecklistItem;
    realEstateTax: ChecklistItem;
    personalPropertyTax: ChecklistItem;
    foreignTaxesPaid: ChecklistItem;
  };
  interest: {
    mortgageInterest: ChecklistItem;
    mortgageInsurancePremiums: ChecklistItem;
    investmentInterest: ChecklistItem;
    studentLoanInterest: ChecklistItem;
  };
  donations: {
    cashDonations: ChecklistItem;
    nonCashDonations: ChecklistItem;
    volunteerMileage: ChecklistItem;
    charitableCarryover: ChecklistItem;
  };
  casualty: {
    federalDisasterLoss: ChecklistItem;
    theftLoss: ChecklistItem;
  };
  other: {
    gamblingLosses: ChecklistItem;
    unreimbursedExpenses: ChecklistItem;
    taxPrepFees: ChecklistItem;
  };
}

// --- Business Vehicle Entry (For Form 4562 / Schedule C) ---

export interface BusinessVehicleEntry {
  id: string;
  // Vehicle Identification
  year: number;
  make: string;
  model: string;
  vin?: string; // Optional VIN for documentation
  licensePlate?: string;

  // Service Information (Required for IRS)
  dateAcquired: string; // When you bought/leased the vehicle
  datePlacedInService: string; // When you started using it for business

  // Ownership Type
  ownershipType: 'owned' | 'leased' | 'financed';
  purchasePrice?: number; // For depreciation calculation
  leasePaymentMonthly?: number;
  loanPaymentMonthly?: number;

  // Mileage Tracking (Critical for IRS)
  totalMilesDriven: number; // Total miles for the year
  businessMilesDriven: number; // Business miles only
  commutingMiles?: number; // Commuting is NOT deductible
  personalMiles?: number;
  businessUsePercentage?: number; // Calculated: businessMiles / totalMiles * 100

  // IRS Questions (Form 4562 Part V)
  availableForPersonalUse: boolean; // Was the vehicle available for personal use during off-duty hours?
  anotherVehicleForPersonal: boolean; // Do you have another vehicle available for personal use?
  hasWrittenEvidence: boolean; // Do you have written evidence to support your deduction?
  isEvidenceWritten: boolean; // Is the evidence written? (vs electronic/app)

  // Deduction Method
  deductionMethod: 'standard_mileage' | 'actual_expenses';
  standardMileageRate?: number; // IRS rate (e.g., 0.67 for 2024)

  // Actual Expenses (if using actual method)
  actualExpenses?: {
    gasAndOil: ChecklistItem;
    repairs: ChecklistItem;
    tires: ChecklistItem;
    insurance: ChecklistItem;
    registration: ChecklistItem;
    leasePayments: ChecklistItem;
    loanInterest: ChecklistItem;
    depreciation: ChecklistItem;
    carWash: ChecklistItem;
    parking: ChecklistItem;
    tolls: ChecklistItem;
  };

  // Notes for preparer
  notes?: string;
}

// --- Business Information (For Schedule C Header) ---

export interface BusinessInfo {
  // Business Identity
  businessName: string;
  businessType: 'sole_proprietor' | 'single_member_llc' | 'partnership' | 'scorp' | 'ccorp' | 'other';
  ein?: string; // Employer Identification Number (if applicable)
  usesSsn: boolean; // Uses SSN instead of EIN

  // Business Activity
  principalBusinessActivity: string; // e.g., "Consulting", "Retail Sales"
  businessCode: string; // 6-digit NAICS code

  // Business Address (if different from home)
  usesHomeAddress: boolean;
  businessAddress?: string;
  businessCity?: string;
  businessState?: string;
  businessZip?: string;

  // Accounting Method
  accountingMethod: 'cash' | 'accrual' | 'other';

  // Business Start Date
  dateBusinessStarted: string;

  // Material Participation (Important for passive loss rules)
  materiallyParticipated: boolean;
  hoursWorkedInBusiness?: number; // Hours spent in the business during the year

  // Inventory (if applicable)
  hasInventory: boolean;
  inventoryMethod?: 'cost' | 'lower_of_cost_or_market' | 'other';
  beginningInventory?: number;
  endingInventory?: number;
  costOfGoodsSold?: number;

  // 1099 Requirements
  made1099Payments: boolean; // Did you make payments requiring 1099s?
  filed1099s: boolean; // Did you file all required 1099s?
}

// --- Home Office Details (Form 8829) ---

export interface HomeOfficeDetails {
  // Method
  calculationMethod: 'simplified' | 'regular';

  // Simplified Method (max 300 sq ft * $5 = $1,500)
  simplifiedSquareFootage?: number; // Max 300

  // Regular Method - Space Measurements
  totalHomeSquareFootage?: number;
  officeSquareFootage?: number;
  businessUsePercentage?: number; // Calculated

  // Regular Method - Exclusive Use
  usedExclusively: boolean; // Used exclusively for business?
  usedRegularly: boolean; // Used on a regular basis?
  principalPlaceOfBusiness: boolean; // Is this your principal place of business?
  meetClientsHere: boolean; // Do you meet clients here?
  separateStructure: boolean; // Is it a separate structure?

  // Home Type
  homeOwnership: 'own' | 'rent';

  // Direct Expenses (100% deductible)
  directExpenses: {
    officePaint: ChecklistItem;
    officeRepairs: ChecklistItem;
    officeFurniture: ChecklistItem;
    officeEquipment: ChecklistItem;
  };

  // Indirect Expenses (proportional based on square footage)
  indirectExpenses: {
    mortgageInterest: ChecklistItem;
    realEstateTaxes: ChecklistItem;
    rentPayment: ChecklistItem;
    utilities: ChecklistItem;
    homeInsurance: ChecklistItem;
    repairs: ChecklistItem;
    securitySystem: ChecklistItem;
    hoa: ChecklistItem;
    depreciation: ChecklistItem;
  };
}

// --- Business Expenses (Schedule C) - EXPANDED ---

export interface BusinessExpensesChecklist {
  // Business Information Header
  businessInfo?: BusinessInfo;

  // Multiple Vehicles Support
  vehicles: BusinessVehicleEntry[];

  // Home Office Details
  homeOffice: HomeOfficeDetails;

  // Operations Expenses
  operations: {
    advertising: ChecklistItem;
    insurance: ChecklistItem;
    legalFees: ChecklistItem;
    accountingFees: ChecklistItem;
    licenses: ChecklistItem;
    bankFees: ChecklistItem;
    contractLabor: ChecklistItem;
    badDebts: ChecklistItem;
    commissions: ChecklistItem;
    employeeBenefits: ChecklistItem;
    pensionPlans: ChecklistItem;
  };

  // Office Expenses
  office: {
    officeSupplies: ChecklistItem;
    postage: ChecklistItem;
    telephone: ChecklistItem;
    cellPhone: ChecklistItem;
    internet: ChecklistItem;
    software: ChecklistItem;
    subscriptions: ChecklistItem;
    cloudServices: ChecklistItem;
    computerEquipment: ChecklistItem;
    printerInk: ChecklistItem;
  };

  // Travel Expenses
  travel: {
    airfare: ChecklistItem;
    lodging: ChecklistItem;
    carRental: ChecklistItem;
    uber: ChecklistItem;
    taxi: ChecklistItem;
    trainBus: ChecklistItem;
    baggage: ChecklistItem;
    travelMeals: ChecklistItem;
    tips: ChecklistItem;
  };

  // Meals & Entertainment
  meals: {
    businessMeals: ChecklistItem; // 50% deductible
    clientMeals: ChecklistItem;
    teamMeals: ChecklistItem;
    conferenceFood: ChecklistItem;
  };

  // Equipment & Assets
  equipment: {
    machinery: ChecklistItem;
    furniture: ChecklistItem;
    tools: ChecklistItem;
    computers: ChecklistItem;
    phones: ChecklistItem;
    cameras: ChecklistItem;
    section179Deduction: ChecklistItem;
    bonusDepreciation: ChecklistItem;
  };

  // Education & Professional Development
  education: {
    coursesAndSeminars: ChecklistItem;
    books: ChecklistItem;
    certifications: ChecklistItem;
    professionalDues: ChecklistItem;
    conferences: ChecklistItem;
    workshops: ChecklistItem;
    onlineCourses: ChecklistItem;
  };

  // Employee/Contractor Expenses
  labor: {
    wages: ChecklistItem;
    salaries: ChecklistItem;
    contractorPayments: ChecklistItem;
    payrollTaxes: ChecklistItem;
    workersComp: ChecklistItem;
    healthInsurance: ChecklistItem;
    retirement401k: ChecklistItem;
  };

  // Rent & Utilities (Business Location)
  facilityExpenses: {
    officeRent: ChecklistItem;
    warehouseRent: ChecklistItem;
    storageUnit: ChecklistItem;
    electricity: ChecklistItem;
    gas: ChecklistItem;
    water: ChecklistItem;
    trash: ChecklistItem;
    janitorial: ChecklistItem;
  };

  // Marketing & Advertising
  marketing: {
    onlineAds: ChecklistItem;
    printAds: ChecklistItem;
    socialMedia: ChecklistItem;
    websiteHosting: ChecklistItem;
    domainNames: ChecklistItem;
    emailMarketing: ChecklistItem;
    seo: ChecklistItem;
    businessCards: ChecklistItem;
    brochures: ChecklistItem;
    tradeshows: ChecklistItem;
  };

  // Insurance
  insurance: {
    generalLiability: ChecklistItem;
    professionalLiability: ChecklistItem;
    propertyInsurance: ChecklistItem;
    cyberInsurance: ChecklistItem;
    businessInterruption: ChecklistItem;
  };

  // Other Business Expenses
  other: {
    uniforms: ChecklistItem;
    laundry: ChecklistItem;
    creditCardFees: ChecklistItem;
    merchantFees: ChecklistItem;
    bankCharges: ChecklistItem;
    interestExpense: ChecklistItem;
    penalties: ChecklistItem; // Note: not all penalties are deductible
    otherExpenses: ChecklistItem;
  };

  // Notes for Tax Preparer
  preparerNotes?: string;
}

// --- Rental Properties (Schedule E) ---

export interface RentalPropertyEntry {
  id: string;
  propertyAddress: string;
  propertyType: 'single_family' | 'multi_family' | 'commercial' | 'vacation' | 'other';
  daysRented: number;
  personalUseDays: number;
  rentalIncome: ChecklistItem;
  expenses: {
    mortgage: ChecklistItem;
    propertyTax: ChecklistItem;
    insurance: ChecklistItem;
    repairs: ChecklistItem;
    maintenance: ChecklistItem;
    utilities: ChecklistItem;
    management: ChecklistItem;
    advertising: ChecklistItem;
    legal: ChecklistItem;
    hoa: ChecklistItem;
    cleaning: ChecklistItem;
    supplies: ChecklistItem;
  };
  capitalImprovements: {
    roofing: ChecklistItem;
    hvac: ChecklistItem;
    plumbing: ChecklistItem;
    electrical: ChecklistItem;
    appliances: ChecklistItem;
    flooring: ChecklistItem;
    otherImprovements: ChecklistItem;
  };
}

export interface RentalPropertiesChecklist {
  properties: RentalPropertyEntry[];
}

// --- Tax Credits ---

export interface TaxCreditsChecklist {
  children: {
    childTaxCredit: ChecklistItem;
    childCareExpenses: ChecklistItem;
    adoptionCredit: ChecklistItem;
    dependentCareCredit: ChecklistItem;
  };
  education: {
    americanOpportunity: ChecklistItem;
    lifetimeLearning: ChecklistItem;
    tuitionAndFees: ChecklistItem;
    studentLoanInterest: ChecklistItem;
    education529Contributions: ChecklistItem;
  };
  energy: {
    residentialCleanEnergy: ChecklistItem;
    energyEfficientHome: ChecklistItem;
    electricVehicle: ChecklistItem;
    solarPanels: ChecklistItem;
  };
  eitc: {
    earnedIncomeCredit: ChecklistItem;
    qualifyingChildren: ChecklistItem;
  };
  housing: {
    mortgageInterestCredit: ChecklistItem; // Form 8396 - Mortgage Credit Certificate (MCC)
    firstTimeHomebuyerCredit: ChecklistItem; // If applicable for certain programs
  };
  other: {
    elderlyDisabledCredit: ChecklistItem;
    foreignTaxCredit: ChecklistItem;
    retirementSaversCredit: ChecklistItem;
    healthCoverageCredit: ChecklistItem;
    excessSocialSecurity: ChecklistItem;
  };
}

// --- Health Insurance Marketplace (1095-A) ---
// User-friendly fields that map to Form 1095-A for automatic Form 8962 calculation

export interface HealthInsuranceMarketplaceData {
  hasMarketplaceCoverage: boolean;
  // Monthly values from 1095-A (index 0 = January, etc.)
  // User only needs to enter values for months they had coverage
  monthlyPremium: number; // Average monthly premium (Column A)
  monthlySlcsp: number; // Average monthly SLCSP/benchmark plan (Column B)
  monthlyAptc: number; // Average monthly advance PTC received (Column C)
  coverageMonths: number; // Number of months with coverage (1-12)
  // Optional: full monthly breakdown for complex cases
  monthlyBreakdown?: {
    jan?: { premium: number; slcsp: number; aptc: number };
    feb?: { premium: number; slcsp: number; aptc: number };
    mar?: { premium: number; slcsp: number; aptc: number };
    apr?: { premium: number; slcsp: number; aptc: number };
    may?: { premium: number; slcsp: number; aptc: number };
    jun?: { premium: number; slcsp: number; aptc: number };
    jul?: { premium: number; slcsp: number; aptc: number };
    aug?: { premium: number; slcsp: number; aptc: number };
    sep?: { premium: number; slcsp: number; aptc: number };
    oct?: { premium: number; slcsp: number; aptc: number };
    nov?: { premium: number; slcsp: number; aptc: number };
    dec?: { premium: number; slcsp: number; aptc: number };
  };
}

// --- Other Income & Adjustments ---

export interface OtherIncomeChecklist {
  additionalIncome: {
    socialSecurity: ChecklistItem;
    pension: ChecklistItem;
    annuity: ChecklistItem;
    ira: ChecklistItem;
    unemployment: ChecklistItem;
    alimony: ChecklistItem;
    gambling: ChecklistItem;
    juryDuty: ChecklistItem;
    prizeAwards: ChecklistItem;
    cryptoIncome: ChecklistItem;
    stockSales: ChecklistItem;
    rentalRoyalties: ChecklistItem;
  };
  adjustments: {
    iraContributions: ChecklistItem;
    hsaContributions: ChecklistItem;
    selfEmploymentTax: ChecklistItem;
    healthInsuranceDeduction: ChecklistItem;
    retirementContributions: ChecklistItem;
    alimonyPaid: ChecklistItem;
    educatorExpenses: ChecklistItem;
    movingExpenses: ChecklistItem;
    studentLoanInterest: ChecklistItem;
    tuitionFees: ChecklistItem;
    qbid: ChecklistItem; // Qualified Business Income Deduction (Form 8995) - Line 13a
    schedule1ADeductions: ChecklistItem; // Additional deductions from Schedule 1-A - Line 13b
  };
  schedule2Taxes: {
    excessPtcRepayment: ChecklistItem; // Excess advance premium tax credit repayment (Form 8962) - Schedule 2, Line 2
    selfEmploymentTax: ChecklistItem; // Self-employment tax (Schedule SE) - Schedule 2, Line 4
    unreportedSocialSecurityTax: ChecklistItem; // Unreported social security/Medicare tax - Schedule 2, Line 5
    additionalTaxOnIra: ChecklistItem; // Additional tax on IRAs/retirement plans - Schedule 2, Line 6
    householdEmploymentTax: ChecklistItem; // Household employment taxes - Schedule 2, Line 7
    netInvestmentIncomeTax: ChecklistItem; // Net Investment Income Tax (3.8%) - Schedule 2, Line 8
  };
  // Health Insurance Marketplace data from 1095-A (for Form 8962 Premium Tax Credit)
  healthInsuranceMarketplace?: HealthInsuranceMarketplaceData;
}

// --- Preparer Note Entry ---

export interface PreparerNote {
  id: string;
  content: string;
  category: 'general' | 'income' | 'deductions' | 'credits' | 'vehicle' | 'rental' | 'question' | 'followup' | 'important';
  createdAt: number;
  updatedAt?: number;
  createdBy?: string;
  priority?: 'low' | 'medium' | 'high';
  resolved?: boolean;
}

// --- Top-level container ---

export type StrategySubSection = 'deductions' | 'business' | 'rental' | 'credits' | 'other' | 'notes' | 'recommendations' | 'multi-year' | 'explain';

export interface TaxStrategyData {
  deductions: DeductionsChecklist;
  businessExpenses: BusinessExpensesChecklist;
  rentalProperties: RentalPropertiesChecklist;
  taxCredits: TaxCreditsChecklist;
  otherIncome: OtherIncomeChecklist;
  preparerNotes?: PreparerNote[];
  lastUpdated?: number;
  completionPercentage?: number;
}

// Helper
export function createDefaultChecklistItem(id: string): ChecklistItem {
  return { id, checked: false, amount: undefined, notes: undefined };
}

export function createDefaultPreparerNote(content: string = '', category: PreparerNote['category'] = 'general'): PreparerNote {
  return {
    id: Math.random().toString(36).substring(2, 12),
    content,
    category,
    createdAt: Date.now(),
    priority: 'medium',
    resolved: false
  };
}
