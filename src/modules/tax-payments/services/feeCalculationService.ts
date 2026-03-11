/**
 * Fee Calculation Service
 * Auto-calculates tax preparation fees based on return complexity
 */

import { devLog } from '../../../services/utils';
import type { TaxPortal, DrakeTaxDocument, DrakeTaxDocumentType } from '../../drake-export/types/drakeTypes';
import type {
  FeeSchedule,
  FeeScheduleItem,
  FeeEstimate,
  ComplexityFactor,
} from '../types/paymentTypes';
import { DEFAULT_FEE_SCHEDULE_ITEMS } from '../types/paymentTypes';

// ============================================
// Document Analysis Helpers
// ============================================

/**
 * Count documents by Drake form type
 */
const countDocumentsByType = (
  documents: DrakeTaxDocument[],
  type: DrakeTaxDocumentType
): number => {
  return documents.filter(
    (doc) => doc.drakeFormType === type && doc.uploadStatus !== 'error'
  ).length;
};

/**
 * Count all 1099 forms (NEC, MISC, INT, DIV, R, G, K)
 */
const count1099Forms = (documents: DrakeTaxDocument[]): number => {
  const types: DrakeTaxDocumentType[] = [
    '1099_nec',
    '1099_misc',
    '1099_int',
    '1099_div',
    '1099_r',
    '1099_g',
    '1099_k',
  ];
  return documents.filter(
    (doc) => doc.drakeFormType && types.includes(doc.drakeFormType) && doc.uploadStatus !== 'error'
  ).length;
};

/**
 * Check if client has self-employment income (Schedule C needed)
 */
const hasSelfEmployment = (documents: DrakeTaxDocument[]): boolean => {
  return documents.some(
    (doc) =>
      (doc.drakeFormType === '1099_nec' || doc.drakeFormType === '1099_misc') &&
      doc.uploadStatus !== 'error'
  );
};

/**
 * Check if client has itemized deductions (1098 mortgage, etc.)
 */
const hasItemizedDeductions = (documents: DrakeTaxDocument[]): boolean => {
  return documents.some(
    (doc) => doc.drakeFormType === '1098' && doc.uploadStatus !== 'error'
  );
};

/**
 * Check if client has education credits (1098-T)
 */
const hasEducationCredits = (documents: DrakeTaxDocument[]): boolean => {
  return documents.some(
    (doc) => doc.drakeFormType === '1098_t' && doc.uploadStatus !== 'error'
  );
};

/**
 * Check if client likely qualifies for EITC based on filing status and dependents
 */
const likelyHasEITC = (client: TaxPortal): boolean => {
  const dependentCount = client.dependents?.length || 0;
  return dependentCount > 0 || client.filingStatus === 'head_of_household';
};

/**
 * Count rental properties (Schedule E)
 */
const countRentalProperties = (documents: DrakeTaxDocument[]): number => {
  // Schedule E documents or documents with rental-related extracted amounts
  return documents.filter(
    (doc) =>
      doc.uploadStatus !== 'error' &&
      doc.extractedAmounts?.rentalRealEstateIncome !== undefined
  ).length;
};

/**
 * Count K-1 forms
 */
const countK1Forms = (documents: DrakeTaxDocument[]): number => {
  return countDocumentsByType(documents, 'schedule_k1');
};

/**
 * Count state returns needed based on client data
 */
const countStateReturns = (client: TaxPortal): number => {
  return client.stateReturns?.length || (client.state ? 1 : 0);
};

// ============================================
// Fee Calculation
// ============================================

/**
 * Find a fee schedule item by form type
 */
const findFeeItem = (
  feeSchedule: FeeSchedule,
  formType: string
): FeeScheduleItem | undefined => {
  return feeSchedule.items.find((i) => i.formType === formType);
};

/**
 * Calculate fee estimate for a client based on documents and complexity
 */
export const calculateFeeEstimate = (
  client: TaxPortal,
  documents: DrakeTaxDocument[],
  feeSchedule: FeeSchedule,
  isReturningClient: boolean = false
): FeeEstimate => {
  devLog('[FeeCalculation] Calculating fee for client:', client.firstName, client.lastName);

  const lineItems: ComplexityFactor[] = [];
  let idCounter = 0;
  const nextId = () => `fee_${++idCounter}`;

  // --- Base Fee ---
  const baseItem = findFeeItem(feeSchedule, 'base');
  if (baseItem) {
    lineItems.push({
      id: nextId(),
      feeItemId: baseItem.id,
      description: baseItem.description,
      descriptionEs: baseItem.descriptionEs,
      quantity: 1,
      unitPrice: baseItem.basePrice,
      subtotal: baseItem.basePrice,
    });
  }

  // --- Additional W-2s (first one is included in base) ---
  const w2Count = countDocumentsByType(documents, 'w2');
  if (w2Count > 1) {
    const w2Item = findFeeItem(feeSchedule, 'w2_additional');
    const additionalW2s = w2Count - 1;
    if (w2Item) {
      lineItems.push({
        id: nextId(),
        feeItemId: w2Item.id,
        description: w2Item.description,
        descriptionEs: w2Item.descriptionEs,
        quantity: additionalW2s,
        unitPrice: w2Item.basePrice,
        subtotal: w2Item.basePrice * additionalW2s,
      });
    }
  }

  // --- Schedule C (Self-Employment) ---
  if (hasSelfEmployment(documents)) {
    const scItem = findFeeItem(feeSchedule, 'schedule_c');
    if (scItem) {
      lineItems.push({
        id: nextId(),
        feeItemId: scItem.id,
        description: scItem.description,
        descriptionEs: scItem.descriptionEs,
        quantity: 1,
        unitPrice: scItem.basePrice,
        subtotal: scItem.basePrice,
      });
    }
  }

  // --- 1099 Forms ---
  const form1099Count = count1099Forms(documents);
  if (form1099Count > 0) {
    const f1099Item = findFeeItem(feeSchedule, '1099');
    if (f1099Item) {
      lineItems.push({
        id: nextId(),
        feeItemId: f1099Item.id,
        description: f1099Item.description,
        descriptionEs: f1099Item.descriptionEs,
        quantity: form1099Count,
        unitPrice: f1099Item.basePrice,
        subtotal: f1099Item.basePrice * form1099Count,
      });
    }
  }

  // --- Schedule E (Rental Properties) ---
  const rentalCount = countRentalProperties(documents);
  if (rentalCount > 0) {
    const seItem = findFeeItem(feeSchedule, 'schedule_e');
    if (seItem) {
      lineItems.push({
        id: nextId(),
        feeItemId: seItem.id,
        description: seItem.description,
        descriptionEs: seItem.descriptionEs,
        quantity: rentalCount,
        unitPrice: seItem.basePrice,
        subtotal: seItem.basePrice * rentalCount,
      });
    }
  }

  // --- K-1 Forms ---
  const k1Count = countK1Forms(documents);
  if (k1Count > 0) {
    const k1Item = findFeeItem(feeSchedule, 'k1');
    if (k1Item) {
      lineItems.push({
        id: nextId(),
        feeItemId: k1Item.id,
        description: k1Item.description,
        descriptionEs: k1Item.descriptionEs,
        quantity: k1Count,
        unitPrice: k1Item.basePrice,
        subtotal: k1Item.basePrice * k1Count,
      });
    }
  }

  // --- Dependents ---
  const dependentCount = client.dependents?.filter(d => !d.excludeFromCalculation)?.length || 0;
  if (dependentCount > 0) {
    const depItem = findFeeItem(feeSchedule, 'dependent');
    if (depItem) {
      lineItems.push({
        id: nextId(),
        feeItemId: depItem.id,
        description: depItem.description,
        descriptionEs: depItem.descriptionEs,
        quantity: dependentCount,
        unitPrice: depItem.basePrice,
        subtotal: depItem.basePrice * dependentCount,
      });
    }
  }

  // --- State Returns ---
  const stateCount = countStateReturns(client);
  if (stateCount > 0) {
    const stateItem = findFeeItem(feeSchedule, 'state_return');
    if (stateItem) {
      lineItems.push({
        id: nextId(),
        feeItemId: stateItem.id,
        description: stateItem.description,
        descriptionEs: stateItem.descriptionEs,
        quantity: stateCount,
        unitPrice: stateItem.basePrice,
        subtotal: stateItem.basePrice * stateCount,
      });
    }
  }

  // --- Itemized Deductions ---
  if (hasItemizedDeductions(documents)) {
    const itemItem = findFeeItem(feeSchedule, 'itemized');
    if (itemItem) {
      lineItems.push({
        id: nextId(),
        feeItemId: itemItem.id,
        description: itemItem.description,
        descriptionEs: itemItem.descriptionEs,
        quantity: 1,
        unitPrice: itemItem.basePrice,
        subtotal: itemItem.basePrice,
      });
    }
  }

  // --- Education Credits ---
  if (hasEducationCredits(documents)) {
    const eduItem = findFeeItem(feeSchedule, 'education_credit');
    if (eduItem) {
      lineItems.push({
        id: nextId(),
        feeItemId: eduItem.id,
        description: eduItem.description,
        descriptionEs: eduItem.descriptionEs,
        quantity: 1,
        unitPrice: eduItem.basePrice,
        subtotal: eduItem.basePrice,
      });
    }
  }

  // --- EITC ---
  if (likelyHasEITC(client)) {
    const eitcItem = findFeeItem(feeSchedule, 'eitc');
    if (eitcItem) {
      lineItems.push({
        id: nextId(),
        feeItemId: eitcItem.id,
        description: eitcItem.description,
        descriptionEs: eitcItem.descriptionEs,
        quantity: 1,
        unitPrice: eitcItem.basePrice,
        subtotal: eitcItem.basePrice,
      });
    }
  }

  // --- Calculate totals ---
  const subtotal = lineItems.reduce((sum, item) => sum + item.subtotal, 0);

  // Returning client discount
  const discountPercent = isReturningClient ? feeSchedule.returningClientDiscount : 0;
  const discountAmount = Math.round(subtotal * (discountPercent / 100));

  // Apply minimum fee
  let total = subtotal - discountAmount;
  const minimumFeeApplied = total < feeSchedule.minimumFee;
  if (minimumFeeApplied) {
    total = feeSchedule.minimumFee;
  }

  const estimate: FeeEstimate = {
    clientId: client.id,
    clientName: `${client.firstName} ${client.lastName}`,
    taxYear: client.taxYear || new Date().getFullYear(),
    lineItems,
    subtotal,
    returningClientDiscount: discountAmount,
    returningClientDiscountPercent: discountPercent,
    manualAdjustment: 0,
    minimumFeeApplied,
    total,
    estimatedAt: Date.now(),
    isReturningClient,
  };

  devLog('[FeeCalculation] Fee estimate:', estimate.total);
  return estimate;
};

/**
 * Apply a manual adjustment to an existing fee estimate
 */
export const applyManualAdjustment = (
  estimate: FeeEstimate,
  adjustment: number,
  note?: string
): FeeEstimate => {
  const adjustedTotal = Math.max(0, estimate.subtotal - estimate.returningClientDiscount + adjustment);

  return {
    ...estimate,
    manualAdjustment: adjustment,
    manualAdjustmentNote: note,
    total: adjustedTotal,
    estimatedAt: Date.now(),
  };
};

/**
 * Create a default fee schedule
 */
export const createDefaultFeeSchedule = (taxYear?: number): FeeSchedule => {
  return {
    id: `schedule_${taxYear || new Date().getFullYear()}`,
    taxYear: taxYear || new Date().getFullYear(),
    name: 'Standard Fee Schedule',
    items: [...DEFAULT_FEE_SCHEDULE_ITEMS],
    minimumFee: 100,
    returningClientDiscount: 10,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
};
