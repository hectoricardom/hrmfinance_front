/**
 * Strategy Auto-Fill Utility
 *
 * Maps extracted data from analyzed tax documents to strategy checklist items,
 * auto-filling amounts and checking items based on document form types.
 */

import { devLog } from '../../../../../services/utils';
import type { DrakeTaxDocument } from '../../../types/drakeTypes';
import type { TaxStrategyData, ChecklistItem } from '../../../types/taxStrategyTypes';

/**
 * Helper to set a checklist item as checked and accumulate the amount.
 * Only updates if the amount is defined and > 0.
 */
function fillItem(item: ChecklistItem, amount: number): ChecklistItem {
  return {
    ...item,
    checked: true,
    amount: (item.amount || 0) + amount, // accumulate from multiple documents
  };
}

/**
 * Auto-fills a TaxStrategyData structure from analyzed/verified documents.
 * Deep-clones the currentStrategy so the original is not mutated.
 */
export function autoFillFromDocuments(
  currentStrategy: TaxStrategyData,
  documents: DrakeTaxDocument[]
): TaxStrategyData {
  // Deep-clone the current strategy to avoid mutation
  const strategy: TaxStrategyData = JSON.parse(JSON.stringify(currentStrategy));

  devLog('[AUTO-FILL] ===== AUTO-FILL FROM DOCUMENTS =====');
  devLog('[AUTO-FILL] Total documents:', documents.length);

  // Log all documents for debugging
  documents.forEach((doc, i) => {

    devLog(doc)
    devLog(`[AUTO-FILL] Doc ${i + 1}:`, {
      drakeFormType: doc.drakeFormType,
      documentType: doc.documentType,
      uploadStatus: doc.uploadStatus,
      hasExtractedAmounts: !!doc.extractedAmounts,
      extractedAmounts: doc.extractedAmounts,
    });
  });

  // Filter to only analyzed/verified documents that have extracted amounts
  const eligibleDocs = documents.filter(
    (doc) =>
      (doc.uploadStatus === 'analyzed' || doc.uploadStatus === 'verified') &&
      doc.extractedAmounts
  );

  devLog('[AUTO-FILL] Eligible documents:', eligibleDocs.length);

  for (const doc of eligibleDocs) {
    const amounts = doc.extractedAmounts!;
    const formType = doc.drakeFormType;
    const docType = doc.documentType;

    devLog(`[AUTO-FILL] Processing: formType=${formType}, docType=${docType}`);

    // --- 1098 (Mortgage) ---
    if (formType === '1098' || docType === 'form_1098') {
      devLog('[AUTO-FILL] >>> 1098 MORTGAGE DOCUMENT DETECTED <<<');

      if (amounts.mortgageInterest && amounts.mortgageInterest > 0) {
        strategy.deductions.interest.mortgageInterest = fillItem(
          strategy.deductions.interest.mortgageInterest,
          amounts.mortgageInterest
        );
      }

      if (amounts.mortgageInsurancePremiums && amounts.mortgageInsurancePremiums > 0) {
        strategy.deductions.interest.mortgageInsurancePremiums = fillItem(
          strategy.deductions.interest.mortgageInsurancePremiums,
          amounts.mortgageInsurancePremiums
        );
      }

      if (amounts.propertyTaxes && amounts.propertyTaxes > 0) {
        strategy.deductions.taxesPaid.realEstateTax = fillItem(
          strategy.deductions.taxesPaid.realEstateTax,
          amounts.propertyTaxes
        );
      }

      // Points paid add to mortgage interest amount
      if (amounts.pointsPaid && amounts.pointsPaid > 0) {
        strategy.deductions.interest.mortgageInterest = fillItem(
          strategy.deductions.interest.mortgageInterest,
          amounts.pointsPaid
        );
      }

      // Initialize housing credits if not exists and add note about MCC
      if (!strategy.taxCredits.housing) {
        strategy.taxCredits.housing = {
          mortgageInterestCredit: { id: 'mortgageInterestCredit', checked: false, amount: undefined, notes: undefined },
          firstTimeHomebuyerCredit: { id: 'firstTimeHomebuyerCredit', checked: false, amount: undefined, notes: undefined },
        };
      }

      // Add note about potential Mortgage Interest Credit (Form 8396)
      // This credit requires a Mortgage Credit Certificate (MCC) from state/local housing agency
      const totalMortgageInterest = (amounts.mortgageInterest || 0) + (amounts.pointsPaid || 0);
      if (totalMortgageInterest > 0) {
        strategy.taxCredits.housing.mortgageInterestCredit = {
          ...strategy.taxCredits.housing.mortgageInterestCredit,
          notes: strategy.taxCredits.housing.mortgageInterestCredit.notes
            ? strategy.taxCredits.housing.mortgageInterestCredit.notes
            : `1098 detected with $${totalMortgageInterest.toFixed(2)} mortgage interest. Check if client has MCC (Mortgage Credit Certificate) for Form 8396 credit.`,
        };
      }
    }

    // --- W-2 ---
    if (formType === 'w2' || docType === 'form_w2' || docType === 'w2') {
      // State tax withheld accumulates across multiple W-2s
      if (amounts.stateTaxWithheld && amounts.stateTaxWithheld > 0) {
        strategy.deductions.taxesPaid.stateIncomeTax = fillItem(
          strategy.deductions.taxesPaid.stateIncomeTax,
          amounts.stateTaxWithheld
        );
      }

      // Local tax withheld accumulates across multiple W-2s
      if (amounts.localTaxWithheld && amounts.localTaxWithheld > 0) {
        strategy.deductions.taxesPaid.localIncomeTax = fillItem(
          strategy.deductions.taxesPaid.localIncomeTax,
          amounts.localTaxWithheld
        );
      }

      // Dependent care benefits indicate dependent care credit eligibility
      if (amounts.dependentCareBenefits && amounts.dependentCareBenefits > 0) {
        strategy.taxCredits.children.dependentCareCredit = fillItem(
          strategy.taxCredits.children.dependentCareCredit,
          amounts.dependentCareBenefits
        );
      }
    }

    // --- 1098-T (Education) ---
    if (formType === '1098_t' || docType === 'form_1098_t') {
      // Calculate qualified education expenses net of scholarships
      const qualifiedExpenses = amounts.paymentsReceived || 0;
      const scholarships = amounts.scholarshipsGrants || 0;
      const netEducationAmount = qualifiedExpenses - scholarships;

      if (netEducationAmount > 0) {
        strategy.taxCredits.education.americanOpportunity = fillItem(
          strategy.taxCredits.education.americanOpportunity,
          netEducationAmount
        );
      }

      // Half-time student also qualifies for lifetime learning credit
      if (amounts.halfTimeStudent) {
        strategy.taxCredits.education.lifetimeLearning = {
          ...strategy.taxCredits.education.lifetimeLearning,
          checked: true,
        };
      }
    }

    // --- 1099-INT ---
    if (formType === '1099_int') {
      // Investment expenses map to investment interest deduction
      if (amounts.investmentExpenses && amounts.investmentExpenses > 0) {
        strategy.deductions.interest.investmentInterest = fillItem(
          strategy.deductions.interest.investmentInterest,
          amounts.investmentExpenses
        );
      }

      // Foreign tax paid
      if (amounts.foreignTaxPaid && amounts.foreignTaxPaid > 0) {
        strategy.deductions.taxesPaid.foreignTaxesPaid = fillItem(
          strategy.deductions.taxesPaid.foreignTaxesPaid,
          amounts.foreignTaxPaid
        );
      }
    }

    // --- 1099-DIV ---
    if (formType === '1099_div') {
      // Foreign tax paid accumulates across multiple 1099-DIV forms
      if (amounts.foreignTaxPaid && amounts.foreignTaxPaid > 0) {
        strategy.deductions.taxesPaid.foreignTaxesPaid = fillItem(
          strategy.deductions.taxesPaid.foreignTaxesPaid,
          amounts.foreignTaxPaid
        );
      }

      // Investment expenses
      if (amounts.investmentExpenses && amounts.investmentExpenses > 0) {
        strategy.deductions.interest.investmentInterest = fillItem(
          strategy.deductions.interest.investmentInterest,
          amounts.investmentExpenses
        );
      }
    }

    // --- 1099-NEC ---
    if (formType === '1099_nec') {
      if (amounts.nonEmployeeCompensation && amounts.nonEmployeeCompensation > 0) {
        // Self-employment income indicates business expense tracking is relevant
        strategy.businessExpenses.operations.contractLabor = {
          ...strategy.businessExpenses.operations.contractLabor,
          checked: true,
          notes: strategy.businessExpenses.operations.contractLabor.notes
            ? strategy.businessExpenses.operations.contractLabor.notes +
              '; 1099-NEC self-employment income detected'
            : '1099-NEC self-employment income detected',
        };

        // Also check self-employment tax adjustment
        strategy.otherIncome.adjustments.selfEmploymentTax = {
          ...strategy.otherIncome.adjustments.selfEmploymentTax,
          checked: true,
        };
      }
    }

    // --- 1099-MISC ---
    if (formType === '1099_misc') {
      // Rents
      if (amounts.rents && amounts.rents > 0) {
        strategy.otherIncome.additionalIncome.rentalRoyalties = fillItem(
          strategy.otherIncome.additionalIncome.rentalRoyalties,
          amounts.rents
        );
      }

      // Royalties accumulate into rentalRoyalties
      if (amounts.royalties && amounts.royalties > 0) {
        strategy.otherIncome.additionalIncome.rentalRoyalties = fillItem(
          strategy.otherIncome.additionalIncome.rentalRoyalties,
          amounts.royalties
        );
      }
    }

    // --- Schedule K-1 ---
    if (formType === 'schedule_k1') {
      // Rental real estate income
      if (amounts.rentalRealEstateIncome && amounts.rentalRealEstateIncome > 0) {
        strategy.otherIncome.additionalIncome.rentalRoyalties = fillItem(
          strategy.otherIncome.additionalIncome.rentalRoyalties,
          amounts.rentalRealEstateIncome
        );
      }

      // Section 179 deduction
      if (amounts.section179Deduction && amounts.section179Deduction > 0) {
        strategy.businessExpenses.equipment.section179Deduction = fillItem(
          strategy.businessExpenses.equipment.section179Deduction,
          amounts.section179Deduction
        );
      }

      // Self-employment earnings
      if (amounts.selfEmploymentEarnings && amounts.selfEmploymentEarnings > 0) {
        strategy.otherIncome.adjustments.selfEmploymentTax = {
          ...strategy.otherIncome.adjustments.selfEmploymentTax,
          checked: true,
        };
      }
    }

    // --- 1095-A (Health Insurance Marketplace Statement) ---
    // This form is used to calculate Form 8962 Premium Tax Credit
    const formTypeLower = (formType || '').toLowerCase();
    const docTypeLower = (docType || '').toLowerCase();

    const is1095A =
        formTypeLower === '1095_a' ||
        formTypeLower === '1095-a' ||
        docTypeLower === '1095_a' ||
        docTypeLower === '1095-a' ||
        docTypeLower === 'form_1095_a' ||
        docTypeLower === 'form_1095-a' ||
        docTypeLower.includes('1095-a') ||
        docTypeLower.includes('1095_a') ||
        formTypeLower.includes('1095') ||
        docTypeLower.includes('1095') ||
        // Also check if extracted amounts have 1095-A specific fields
        !!(amounts.annualPremiumAmount || amounts.annualSlcspPremium || amounts.annualAdvancePtc);

    devLog(`[AUTO-FILL] Checking 1095-A match: formType=${formType}, docType=${docType}, formTypeLower=${formTypeLower}, docTypeLower=${docTypeLower}, is1095A=${is1095A}`);

    if (is1095A) {
      devLog('[AUTO-FILL] >>> 1095-A DOCUMENT DETECTED <<<');
      devLog('[AUTO-FILL] 1095-A amounts:', JSON.stringify(amounts));

      const annualPremium = amounts.annualPremiumAmount || 0;
      const annualSlcsp = amounts.annualSlcspPremium || 0;
      const annualAptc = amounts.annualAdvancePtc || 0;
      const coverageMonths = amounts.coverageMonths || 12;

      devLog('[AUTO-FILL] Parsed values:', { annualPremium, annualSlcsp, annualAptc, coverageMonths });

      // Calculate monthly averages from annual totals
      const monthlyPremium = coverageMonths > 0 ? annualPremium / coverageMonths : 0;
      const monthlySlcsp = coverageMonths > 0 ? annualSlcsp / coverageMonths : 0;
      const monthlyAptc = coverageMonths > 0 ? annualAptc / coverageMonths : 0;

      // Populate healthInsuranceMarketplace for automatic Form 8962 calculation
      devLog('[AUTO-FILL] Checking if should populate marketplace:', { annualPremium, annualAptc, shouldPopulate: annualPremium > 0 || annualAptc > 0 });

      if (annualPremium > 0 || annualAptc > 0) {
        devLog('[AUTO-FILL] >>> POPULATING HEALTH INSURANCE MARKETPLACE <<<');
        // Initialize healthInsuranceMarketplace if it doesn't exist
        if (!strategy.otherIncome.healthInsuranceMarketplace) {
          strategy.otherIncome.healthInsuranceMarketplace = {
            hasMarketplaceCoverage: false,
            monthlyPremium: 0,
            monthlySlcsp: 0,
            monthlyAptc: 0,
            coverageMonths: 0,
          };
        }

        // Fill in the marketplace data from 1095-A
        strategy.otherIncome.healthInsuranceMarketplace = {
          hasMarketplaceCoverage: true,
          monthlyPremium: Math.round(monthlyPremium * 100) / 100,
          monthlySlcsp: Math.round(monthlySlcsp * 100) / 100,
          monthlyAptc: Math.round(monthlyAptc * 100) / 100,
          coverageMonths: coverageMonths,
        };

        // Initialize schedule2Taxes if it doesn't exist
        if (!strategy.otherIncome.schedule2Taxes) {
          strategy.otherIncome.schedule2Taxes = {
            excessPtcRepayment: { id: 'excessPtcRepayment', checked: false, amount: undefined, notes: undefined },
            selfEmploymentTax: { id: 'schedule2SelfEmploymentTax', checked: false, amount: undefined, notes: undefined },
            unreportedSocialSecurityTax: { id: 'unreportedSocialSecurityTax', checked: false, amount: undefined, notes: undefined },
            additionalTaxOnIra: { id: 'additionalTaxOnIra', checked: false, amount: undefined, notes: undefined },
            householdEmploymentTax: { id: 'householdEmploymentTax', checked: false, amount: undefined, notes: undefined },
            netInvestmentIncomeTax: { id: 'netInvestmentIncomeTax', checked: false, amount: undefined, notes: undefined },
          };
        }

        // Mark that we have 1095-A data (actual calculation happens during tax calc)
        strategy.otherIncome.schedule2Taxes.excessPtcRepayment = {
          ...strategy.otherIncome.schedule2Taxes.excessPtcRepayment,
          checked: true,
          notes: `1095-A auto-filled: ${coverageMonths} months, Monthly: Premium $${monthlyPremium.toFixed(2)}, SLCSP $${monthlySlcsp.toFixed(2)}, APTC $${monthlyAptc.toFixed(2)}`,
        };
      }
    }
  }

  // Update the lastUpdated timestamp
  strategy.lastUpdated = Date.now();

  return strategy;
}

/**
 * Returns a summary of how many analyzed documents are available and their form types.
 */
export function getAutoFillSummary(
  documents: DrakeTaxDocument[]
): { documentCount: number; formTypes: string[] } {
  const eligibleDocs = documents.filter(
    (doc) =>
      (doc.uploadStatus === 'analyzed' || doc.uploadStatus === 'verified') &&
      doc.extractedAmounts
  );

  const formTypes = Array.from(
    new Set(
      eligibleDocs
        .map((doc) => doc.drakeFormType || doc.documentType)
        .filter(Boolean) as string[]
    )
  );

  return {
    documentCount: eligibleDocs.length,
    formTypes,
  };
}
