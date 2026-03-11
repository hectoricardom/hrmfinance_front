import type {
  TaxStrategyData,
  RentalPropertyEntry,
  BusinessVehicleEntry,
  BusinessInfo,
  HomeOfficeDetails,
  BusinessExpensesChecklist,
} from '../../../types/taxStrategyTypes';
import { createDefaultChecklistItem } from '../../../types/taxStrategyTypes';

/**
 * Creates a default BusinessVehicleEntry with a random UUID id
 * and all checklist items initialized to unchecked state.
 */
export function createDefaultBusinessVehicle(): BusinessVehicleEntry {
  return {
    id: crypto.randomUUID(),
    // Vehicle Identification
    year: new Date().getFullYear(),
    make: '',
    model: '',
    vin: undefined,
    licensePlate: undefined,

    // Service Information
    dateAcquired: '',
    datePlacedInService: '',

    // Ownership Type
    ownershipType: 'owned',
    purchasePrice: undefined,
    leasePaymentMonthly: undefined,
    loanPaymentMonthly: undefined,

    // Mileage Tracking
    totalMilesDriven: 0,
    businessMilesDriven: 0,
    commutingMiles: undefined,
    personalMiles: undefined,
    businessUsePercentage: undefined,

    // IRS Questions (Form 4562 Part V)
    availableForPersonalUse: false,
    anotherVehicleForPersonal: false,
    hasWrittenEvidence: false,
    isEvidenceWritten: false,

    // Deduction Method
    deductionMethod: 'standard_mileage',
    standardMileageRate: undefined,

    // Actual Expenses
    actualExpenses: {
      gasAndOil: createDefaultChecklistItem('vehicleGasAndOil'),
      repairs: createDefaultChecklistItem('vehicleRepairs'),
      tires: createDefaultChecklistItem('vehicleTires'),
      insurance: createDefaultChecklistItem('vehicleInsurance'),
      registration: createDefaultChecklistItem('vehicleRegistration'),
      leasePayments: createDefaultChecklistItem('vehicleLeasePayments'),
      loanInterest: createDefaultChecklistItem('vehicleLoanInterest'),
      depreciation: createDefaultChecklistItem('vehicleDepreciation'),
      carWash: createDefaultChecklistItem('vehicleCarWash'),
      parking: createDefaultChecklistItem('vehicleParking'),
      tolls: createDefaultChecklistItem('vehicleTolls'),
    },

    notes: undefined,
  };
}

/**
 * Creates a default BusinessInfo object with empty/default values.
 */
export function createDefaultBusinessInfo(): BusinessInfo {
  return {
    // Business Identity
    businessName: '',
    businessType: 'sole_proprietor',
    ein: undefined,
    usesSsn: true,

    // Business Activity
    principalBusinessActivity: '',
    businessCode: '',

    // Business Address
    usesHomeAddress: true,
    businessAddress: undefined,
    businessCity: undefined,
    businessState: undefined,
    businessZip: undefined,

    // Accounting Method
    accountingMethod: 'cash',

    // Business Start Date
    dateBusinessStarted: '',

    // Material Participation
    materiallyParticipated: true,
    hoursWorkedInBusiness: undefined,

    // Inventory
    hasInventory: false,
    inventoryMethod: undefined,
    beginningInventory: undefined,
    endingInventory: undefined,
    costOfGoodsSold: undefined,

    // 1099 Requirements
    made1099Payments: false,
    filed1099s: false,
  };
}

/**
 * Creates a default HomeOfficeDetails object with all checklist items
 * initialized to unchecked state.
 */
export function createDefaultHomeOfficeDetails(): HomeOfficeDetails {
  return {
    // Method
    calculationMethod: 'simplified',

    // Simplified Method
    simplifiedSquareFootage: undefined,

    // Regular Method - Space Measurements
    totalHomeSquareFootage: undefined,
    officeSquareFootage: undefined,
    businessUsePercentage: undefined,

    // Regular Method - Exclusive Use
    usedExclusively: false,
    usedRegularly: false,
    principalPlaceOfBusiness: false,
    meetClientsHere: false,
    separateStructure: false,

    // Home Type
    homeOwnership: 'own',

    // Direct Expenses
    directExpenses: {
      officePaint: createDefaultChecklistItem('officePaint'),
      officeRepairs: createDefaultChecklistItem('officeRepairs'),
      officeFurniture: createDefaultChecklistItem('officeFurniture'),
      officeEquipment: createDefaultChecklistItem('officeEquipment'),
    },

    // Indirect Expenses
    indirectExpenses: {
      mortgageInterest: createDefaultChecklistItem('homeOfficeMortgageInterest'),
      realEstateTaxes: createDefaultChecklistItem('homeOfficeRealEstateTaxes'),
      rentPayment: createDefaultChecklistItem('homeOfficeRentPayment'),
      utilities: createDefaultChecklistItem('homeOfficeUtilities'),
      homeInsurance: createDefaultChecklistItem('homeOfficeInsurance'),
      repairs: createDefaultChecklistItem('homeOfficeRepairs'),
      securitySystem: createDefaultChecklistItem('homeOfficeSecuritySystem'),
      hoa: createDefaultChecklistItem('homeOfficeHoa'),
      depreciation: createDefaultChecklistItem('homeOfficeDepreciation'),
    },
  };
}

/**
 * Creates a default BusinessExpensesChecklist with all checklist items
 * initialized to unchecked state.
 */
export function createDefaultBusinessExpenses(): BusinessExpensesChecklist {
  return {
    // Business Information Header (optional)
    businessInfo: undefined,

    // Multiple Vehicles Support
    vehicles: [],

    // Home Office Details
    homeOffice: createDefaultHomeOfficeDetails(),

    // Operations Expenses
    operations: {
      advertising: createDefaultChecklistItem('advertising'),
      insurance: createDefaultChecklistItem('insurance'),
      legalFees: createDefaultChecklistItem('legalFees'),
      accountingFees: createDefaultChecklistItem('accountingFees'),
      licenses: createDefaultChecklistItem('licenses'),
      bankFees: createDefaultChecklistItem('bankFees'),
      contractLabor: createDefaultChecklistItem('contractLabor'),
      badDebts: createDefaultChecklistItem('badDebts'),
      commissions: createDefaultChecklistItem('commissions'),
      employeeBenefits: createDefaultChecklistItem('employeeBenefits'),
      pensionPlans: createDefaultChecklistItem('pensionPlans'),
    },

    // Office Expenses
    office: {
      officeSupplies: createDefaultChecklistItem('officeSupplies'),
      postage: createDefaultChecklistItem('postage'),
      telephone: createDefaultChecklistItem('telephone'),
      cellPhone: createDefaultChecklistItem('cellPhone'),
      internet: createDefaultChecklistItem('internet'),
      software: createDefaultChecklistItem('software'),
      subscriptions: createDefaultChecklistItem('subscriptions'),
      cloudServices: createDefaultChecklistItem('cloudServices'),
      computerEquipment: createDefaultChecklistItem('computerEquipment'),
      printerInk: createDefaultChecklistItem('printerInk'),
    },

    // Travel Expenses
    travel: {
      airfare: createDefaultChecklistItem('airfare'),
      lodging: createDefaultChecklistItem('lodging'),
      carRental: createDefaultChecklistItem('carRental'),
      uber: createDefaultChecklistItem('uber'),
      taxi: createDefaultChecklistItem('taxi'),
      trainBus: createDefaultChecklistItem('trainBus'),
      baggage: createDefaultChecklistItem('baggage'),
      travelMeals: createDefaultChecklistItem('travelMeals'),
      tips: createDefaultChecklistItem('tips'),
    },

    // Meals & Entertainment
    meals: {
      businessMeals: createDefaultChecklistItem('businessMeals'),
      clientMeals: createDefaultChecklistItem('clientMeals'),
      teamMeals: createDefaultChecklistItem('teamMeals'),
      conferenceFood: createDefaultChecklistItem('conferenceFood'),
    },

    // Equipment & Assets
    equipment: {
      machinery: createDefaultChecklistItem('machinery'),
      furniture: createDefaultChecklistItem('furniture'),
      tools: createDefaultChecklistItem('tools'),
      computers: createDefaultChecklistItem('computers'),
      phones: createDefaultChecklistItem('phones'),
      cameras: createDefaultChecklistItem('cameras'),
      section179Deduction: createDefaultChecklistItem('section179Deduction'),
      bonusDepreciation: createDefaultChecklistItem('bonusDepreciation'),
    },

    // Education & Professional Development
    education: {
      coursesAndSeminars: createDefaultChecklistItem('coursesAndSeminars'),
      books: createDefaultChecklistItem('books'),
      certifications: createDefaultChecklistItem('certifications'),
      professionalDues: createDefaultChecklistItem('professionalDues'),
      conferences: createDefaultChecklistItem('conferences'),
      workshops: createDefaultChecklistItem('workshops'),
      onlineCourses: createDefaultChecklistItem('onlineCourses'),
    },

    // Employee/Contractor Expenses
    labor: {
      wages: createDefaultChecklistItem('wages'),
      salaries: createDefaultChecklistItem('salaries'),
      contractorPayments: createDefaultChecklistItem('contractorPayments'),
      payrollTaxes: createDefaultChecklistItem('payrollTaxes'),
      workersComp: createDefaultChecklistItem('workersComp'),
      healthInsurance: createDefaultChecklistItem('laborHealthInsurance'),
      retirement401k: createDefaultChecklistItem('retirement401k'),
    },

    // Rent & Utilities (Business Location)
    facilityExpenses: {
      officeRent: createDefaultChecklistItem('officeRent'),
      warehouseRent: createDefaultChecklistItem('warehouseRent'),
      storageUnit: createDefaultChecklistItem('storageUnit'),
      electricity: createDefaultChecklistItem('electricity'),
      gas: createDefaultChecklistItem('gas'),
      water: createDefaultChecklistItem('water'),
      trash: createDefaultChecklistItem('trash'),
      janitorial: createDefaultChecklistItem('janitorial'),
    },

    // Marketing & Advertising
    marketing: {
      onlineAds: createDefaultChecklistItem('onlineAds'),
      printAds: createDefaultChecklistItem('printAds'),
      socialMedia: createDefaultChecklistItem('socialMedia'),
      websiteHosting: createDefaultChecklistItem('websiteHosting'),
      domainNames: createDefaultChecklistItem('domainNames'),
      emailMarketing: createDefaultChecklistItem('emailMarketing'),
      seo: createDefaultChecklistItem('seo'),
      businessCards: createDefaultChecklistItem('businessCards'),
      brochures: createDefaultChecklistItem('brochures'),
      tradeshows: createDefaultChecklistItem('tradeshows'),
    },

    // Insurance
    insurance: {
      generalLiability: createDefaultChecklistItem('generalLiability'),
      professionalLiability: createDefaultChecklistItem('professionalLiability'),
      propertyInsurance: createDefaultChecklistItem('propertyInsurance'),
      cyberInsurance: createDefaultChecklistItem('cyberInsurance'),
      businessInterruption: createDefaultChecklistItem('businessInterruption'),
    },

    // Other Business Expenses
    other: {
      uniforms: createDefaultChecklistItem('uniforms'),
      laundry: createDefaultChecklistItem('laundry'),
      creditCardFees: createDefaultChecklistItem('creditCardFees'),
      merchantFees: createDefaultChecklistItem('merchantFees'),
      bankCharges: createDefaultChecklistItem('bankCharges'),
      interestExpense: createDefaultChecklistItem('interestExpense'),
      penalties: createDefaultChecklistItem('penalties'),
      otherExpenses: createDefaultChecklistItem('otherExpenses'),
    },

    // Notes for Tax Preparer
    preparerNotes: undefined,
  };
}

/**
 * Creates a default TaxStrategyData object with all checklist items
 * initialized to unchecked state with no amounts or notes.
 */
export function createDefaultTaxStrategy(): TaxStrategyData {
  return {
    deductions: {
      medical: {
        medicalExpenses: createDefaultChecklistItem('medicalExpenses'),
        dentalExpenses: createDefaultChecklistItem('dentalExpenses'),
        visionExpenses: createDefaultChecklistItem('visionExpenses'),
        healthInsurancePremiums: createDefaultChecklistItem('healthInsurancePremiums'),
        prescriptionMedications: createDefaultChecklistItem('prescriptionMedications'),
        medicalMileage: createDefaultChecklistItem('medicalMileage'),
      },
      taxesPaid: {
        stateIncomeTax: createDefaultChecklistItem('stateIncomeTax'),
        localIncomeTax: createDefaultChecklistItem('localIncomeTax'),
        realEstateTax: createDefaultChecklistItem('realEstateTax'),
        personalPropertyTax: createDefaultChecklistItem('personalPropertyTax'),
        foreignTaxesPaid: createDefaultChecklistItem('foreignTaxesPaid'),
      },
      interest: {
        mortgageInterest: createDefaultChecklistItem('mortgageInterest'),
        mortgageInsurancePremiums: createDefaultChecklistItem('mortgageInsurancePremiums'),
        investmentInterest: createDefaultChecklistItem('investmentInterest'),
        studentLoanInterest: createDefaultChecklistItem('studentLoanInterest'),
      },
      donations: {
        cashDonations: createDefaultChecklistItem('cashDonations'),
        nonCashDonations: createDefaultChecklistItem('nonCashDonations'),
        volunteerMileage: createDefaultChecklistItem('volunteerMileage'),
        charitableCarryover: createDefaultChecklistItem('charitableCarryover'),
      },
      casualty: {
        federalDisasterLoss: createDefaultChecklistItem('federalDisasterLoss'),
        theftLoss: createDefaultChecklistItem('theftLoss'),
      },
      other: {
        gamblingLosses: createDefaultChecklistItem('gamblingLosses'),
        unreimbursedExpenses: createDefaultChecklistItem('unreimbursedExpenses'),
        taxPrepFees: createDefaultChecklistItem('taxPrepFees'),
      },
    },
    businessExpenses: createDefaultBusinessExpenses(),
    rentalProperties: {
      properties: [],
    },
    taxCredits: {
      children: {
        childTaxCredit: createDefaultChecklistItem('childTaxCredit'),
        childCareExpenses: createDefaultChecklistItem('childCareExpenses'),
        adoptionCredit: createDefaultChecklistItem('adoptionCredit'),
        dependentCareCredit: createDefaultChecklistItem('dependentCareCredit'),
      },
      education: {
        americanOpportunity: createDefaultChecklistItem('americanOpportunity'),
        lifetimeLearning: createDefaultChecklistItem('lifetimeLearning'),
        tuitionAndFees: createDefaultChecklistItem('tuitionAndFees'),
        studentLoanInterest: createDefaultChecklistItem('studentLoanInterest'),
        education529Contributions: createDefaultChecklistItem('education529Contributions'),
      },
      energy: {
        residentialCleanEnergy: createDefaultChecklistItem('residentialCleanEnergy'),
        energyEfficientHome: createDefaultChecklistItem('energyEfficientHome'),
        electricVehicle: createDefaultChecklistItem('electricVehicle'),
        solarPanels: createDefaultChecklistItem('solarPanels'),
      },
      eitc: {
        earnedIncomeCredit: createDefaultChecklistItem('earnedIncomeCredit'),
        qualifyingChildren: createDefaultChecklistItem('qualifyingChildren'),
      },
      housing: {
        mortgageInterestCredit: createDefaultChecklistItem('mortgageInterestCredit'),
        firstTimeHomebuyerCredit: createDefaultChecklistItem('firstTimeHomebuyerCredit'),
      },
      other: {
        elderlyDisabledCredit: createDefaultChecklistItem('elderlyDisabledCredit'),
        foreignTaxCredit: createDefaultChecklistItem('foreignTaxCredit'),
        retirementSaversCredit: createDefaultChecklistItem('retirementSaversCredit'),
        healthCoverageCredit: createDefaultChecklistItem('healthCoverageCredit'),
        excessSocialSecurity: createDefaultChecklistItem('excessSocialSecurity'),
      },
    },
    otherIncome: {
      additionalIncome: {
        socialSecurity: createDefaultChecklistItem('socialSecurity'),
        pension: createDefaultChecklistItem('pension'),
        annuity: createDefaultChecklistItem('annuity'),
        ira: createDefaultChecklistItem('ira'),
        unemployment: createDefaultChecklistItem('unemployment'),
        alimony: createDefaultChecklistItem('alimony'),
        gambling: createDefaultChecklistItem('gambling'),
        juryDuty: createDefaultChecklistItem('juryDuty'),
        prizeAwards: createDefaultChecklistItem('prizeAwards'),
        cryptoIncome: createDefaultChecklistItem('cryptoIncome'),
        stockSales: createDefaultChecklistItem('stockSales'),
        rentalRoyalties: createDefaultChecklistItem('rentalRoyalties'),
      },
      adjustments: {
        iraContributions: createDefaultChecklistItem('iraContributions'),
        hsaContributions: createDefaultChecklistItem('hsaContributions'),
        selfEmploymentTax: createDefaultChecklistItem('selfEmploymentTax'),
        healthInsuranceDeduction: createDefaultChecklistItem('healthInsuranceDeduction'),
        retirementContributions: createDefaultChecklistItem('retirementContributions'),
        alimonyPaid: createDefaultChecklistItem('alimonyPaid'),
        educatorExpenses: createDefaultChecklistItem('educatorExpenses'),
        movingExpenses: createDefaultChecklistItem('movingExpenses'),
        studentLoanInterest: createDefaultChecklistItem('studentLoanInterest'),
        tuitionFees: createDefaultChecklistItem('tuitionFees'),
        qbid: createDefaultChecklistItem('qbid'),
        schedule1ADeductions: createDefaultChecklistItem('schedule1ADeductions'),
      },
      schedule2Taxes: {
        excessPtcRepayment: createDefaultChecklistItem('excessPtcRepayment'),
        selfEmploymentTax: createDefaultChecklistItem('schedule2SelfEmploymentTax'),
        unreportedSocialSecurityTax: createDefaultChecklistItem('unreportedSocialSecurityTax'),
        additionalTaxOnIra: createDefaultChecklistItem('additionalTaxOnIra'),
        householdEmploymentTax: createDefaultChecklistItem('householdEmploymentTax'),
        netInvestmentIncomeTax: createDefaultChecklistItem('netInvestmentIncomeTax'),
      },
      // Health Insurance Marketplace (1095-A) - for Form 8962 Premium Tax Credit
      healthInsuranceMarketplace: {
        hasMarketplaceCoverage: false,
        monthlyPremium: 0,
        monthlySlcsp: 0,
        monthlyAptc: 0,
        coverageMonths: 0,
      },
    },
  };
}

/**
 * Creates a default RentalPropertyEntry with a random UUID id
 * and all checklist items initialized to unchecked state.
 */
export function createDefaultRentalProperty(): RentalPropertyEntry {
  return {
    id: crypto.randomUUID(),
    propertyAddress: '',
    propertyType: 'single_family',
    daysRented: 0,
    personalUseDays: 0,
    rentalIncome: createDefaultChecklistItem('rentalIncome'),
    expenses: {
      mortgage: createDefaultChecklistItem('mortgage'),
      propertyTax: createDefaultChecklistItem('propertyTax'),
      insurance: createDefaultChecklistItem('rentalInsurance'),
      repairs: createDefaultChecklistItem('rentalRepairs'),
      maintenance: createDefaultChecklistItem('maintenance'),
      utilities: createDefaultChecklistItem('rentalUtilities'),
      management: createDefaultChecklistItem('management'),
      advertising: createDefaultChecklistItem('rentalAdvertising'),
      legal: createDefaultChecklistItem('legal'),
      hoa: createDefaultChecklistItem('hoa'),
      cleaning: createDefaultChecklistItem('cleaning'),
      supplies: createDefaultChecklistItem('supplies'),
    },
    capitalImprovements: {
      roofing: createDefaultChecklistItem('roofing'),
      hvac: createDefaultChecklistItem('hvac'),
      plumbing: createDefaultChecklistItem('plumbing'),
      electrical: createDefaultChecklistItem('electrical'),
      appliances: createDefaultChecklistItem('appliances'),
      flooring: createDefaultChecklistItem('flooring'),
      otherImprovements: createDefaultChecklistItem('otherImprovements'),
    },
  };
}
