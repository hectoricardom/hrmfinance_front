/**
 * Payment Service
 * Handles payment recording, receipts, and business settings for tax preparation fees
 */

import { devLog, fetchGraphQLSS } from '../../../services/utils';
import { authStore } from '../../../stores/authStore';
import type { TaxPortal, DrakeTaxDocument, TaxPaymentStatus } from '../../drake-export/types/drakeTypes';
import type {
  PaymentRecord,
  PaymentMethod,
  Receipt,
  FeeEstimate,
  PaymentSettings,
  PaymentSummary,
} from '../types/paymentTypes';
import { DEFAULT_PAYMENT_SETTINGS } from '../types/paymentTypes';
import { calculateFeeEstimate } from './feeCalculationService';
import {
  loadLocalSettings,
  saveLocalSettings,
  saveLocalPayment,
  getLocalPaymentHistory,
  getLocalPaymentSummary,
} from './localPaymentSettingsStore';

// ============================================
// ID Generation
// ============================================

const generateId = (prefix: string): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 12; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}_${id}_${Date.now()}`;
};

// ============================================
// Fee Calculation
// ============================================

/**
 * Calculate fee for a client based on documents and complexity
 */
export const calculateFee = (
  client: TaxPortal,
  documents: DrakeTaxDocument[],
  settings: PaymentSettings,
  isReturningClient: boolean = false
): FeeEstimate => {
  devLog('[PaymentService] calculateFee for client:', client.id);
  return calculateFeeEstimate(
    client,
    documents,
    settings.feeSchedule,
    isReturningClient
  );
};

// ============================================
// Payment Recording
// ============================================

/**
 * Record a payment for a client
 */
export const recordPayment = async (
  clientId: string,
  payment: Omit<PaymentRecord, 'id' | 'createdAt'>
): Promise<PaymentRecord> => {
  devLog('[PaymentService] recordPayment for client:', clientId);

  const newPayment: PaymentRecord = {
    ...payment,
    id: generateId('pmt'),
    createdAt: Date.now(),
  };

  // Persist locally until API is implemented
  saveLocalPayment(newPayment);

  // TODO: Save payment to backend via API
  // const result = await fetchGraphQLSS({
  //   query: 'createTaxPayment',
  //   variables: { clientId, payment: newPayment }
  // });

  devLog('[PaymentService] Payment recorded:', newPayment.id);
  return newPayment;
};

/**
 * Get payment history for a client
 */
export const getPaymentHistory = async (
  clientId: string
): Promise<PaymentRecord[]> => {
  devLog('[PaymentService] getPaymentHistory for client:', clientId);

  // Read from localStorage until API is implemented
  const localHistory = getLocalPaymentHistory(clientId);
  if (localHistory.length > 0) {
    devLog('[PaymentService] Returning', localHistory.length, 'local records');
    return localHistory;
  }

  // TODO: Fetch payment history from backend
  // const result = await fetchGraphQLSS({
  //   query: 'getTaxPayments',
  //   variables: { clientId }
  // });
  // return result?.payments || [];

  return [];
};

/**
 * Update payment status on the TaxPortal client record
 */
export const updatePaymentStatus = async (
  clientId: string,
  status: TaxPaymentStatus,
  paidAmount?: number,
  totalFee?: number
): Promise<void> => {
  devLog('[PaymentService] updatePaymentStatus:', clientId, status);

  // TODO: Update payment status on the client record via API
  // await fetchGraphQLSS({
  //   query: 'updateTaxPortalPaymentStatus',
  //   variables: {
  //     clientId,
  //     paymentStatus: status,
  //     paymentPaidAmount: paidAmount,
  //     paymentAmount: totalFee,
  //     paymentDate: Date.now()
  //   }
  // });
};

/**
 * Determine appropriate payment status based on amounts
 */
export const derivePaymentStatus = (
  totalFee: number,
  totalPaid: number
): TaxPaymentStatus => {
  if (totalFee <= 0) return 'waived';
  if (totalPaid <= 0) return 'pending';
  if (totalPaid >= totalFee) return 'paid';
  return 'partial';
};

// ============================================
// Receipt Generation
// ============================================

/**
 * Generate a receipt for a payment
 */
export const generateReceipt = (
  payment: PaymentRecord,
  client: TaxPortal,
  feeEstimate: FeeEstimate | null,
  settings: PaymentSettings
): Receipt => {
  devLog('[PaymentService] generateReceipt for payment:', payment.id);

  const receiptNumber = `RCP-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

  const receipt: Receipt = {
    id: generateId('rcp'),
    paymentId: payment.id,
    clientId: client.id,

    // Business info
    businessName: settings.businessName,
    businessAddress: formatBusinessAddress(settings),
    businessPhone: settings.businessPhone,
    businessEin: settings.businessEin,

    // Client info
    clientName: `${client.firstName} ${client.lastName}`,
    clientPhone: client.phone,
    clientEmail: client.email,

    // Service info
    serviceDescription: `Tax Return Preparation ${payment.taxYear}`,
    serviceDescriptionEs: `Preparacion de Declaracion de Impuestos ${payment.taxYear}`,
    taxYear: payment.taxYear,

    // Fee breakdown
    feeBreakdown: feeEstimate?.lineItems || [],
    subtotal: feeEstimate?.subtotal || payment.totalFee,
    discount: feeEstimate?.returningClientDiscount || 0,
    totalFee: payment.totalFee,

    // Payment details
    paymentMethod: payment.method,
    paymentAmount: payment.amount,
    paymentDate: payment.date,
    checkNumber: payment.checkNumber,
    cardReference: payment.cardReferenceNumber,

    // Balance
    previousPayments: payment.previouslyPaid,
    balanceRemaining: payment.balanceAfterPayment,

    // Metadata
    receiptNumber,
    generatedAt: Date.now(),
    generatedBy: authStore?.user?.uid || undefined,
  };

  // TODO: Save receipt to backend
  // await fetchGraphQLSS({
  //   query: 'createTaxPaymentReceipt',
  //   variables: { receipt }
  // });

  return receipt;
};

/**
 * Format full business address from settings
 */
const formatBusinessAddress = (settings: PaymentSettings): string => {
  const parts = [
    settings.businessAddress,
    settings.businessCity,
    settings.businessState ? `${settings.businessState} ${settings.businessZip}` : settings.businessZip,
  ].filter(Boolean);
  return parts.join(', ');
};

// ============================================
// Business Settings
// ============================================

/**
 * Get business payment settings
 */
export const getBusinessPaymentSettings = async (): Promise<PaymentSettings> => {
  devLog('[PaymentService] getBusinessPaymentSettings');

  // Read from localStorage until API is implemented
  const businessId = authStore?.user?.uid || '';
  return loadLocalSettings(businessId);

  // TODO: Fetch settings from backend when API is ready
  // const result = await fetchGraphQLSS({
  //   query: 'getBusinessPaymentSettings',
  //   variables: { businessId: authStore?.currentBusiness?.id }
  // });
  // if (result?.settings) return result.settings;
};

/**
 * Save business payment settings
 */
export const saveBusinessPaymentSettings = async (
  settings: PaymentSettings
): Promise<PaymentSettings> => {
  devLog('[PaymentService] saveBusinessPaymentSettings');

  // Persist to localStorage until API is implemented
  const saved = saveLocalSettings(settings);

  // TODO: Save settings to backend when API is ready
  // await fetchGraphQLSS({
  //   query: 'saveBusinessPaymentSettings',
  //   variables: { settings: saved }
  // });

  return saved;
};

// ============================================
// Payment Summary / Revenue Report
// ============================================

/**
 * Get payment summary for a date range
 */
export const getPaymentSummary = async (
  startDate: number,
  endDate: number
): Promise<PaymentSummary> => {
  devLog('[PaymentService] getPaymentSummary', new Date(startDate), new Date(endDate));

  // Compute from localStorage until API is implemented
  return getLocalPaymentSummary(startDate, endDate);

  // TODO: Fetch payment summary from backend when API is ready
  // const result = await fetchGraphQLSS({
  //   query: 'getTaxPaymentSummary',
  //   variables: {
  //     businessId: authStore?.currentBusiness?.id,
  //     startDate,
  //     endDate
  //   }
  // });
  // if (result?.summary) return result.summary;
};

// ============================================
// Formatting Utilities
// ============================================

/**
 * Format currency amount for display
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Format date for display
 */
export const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Format date for receipt (short format)
 */
export const formatReceiptDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};
