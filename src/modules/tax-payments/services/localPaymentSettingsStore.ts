/**
 * Local Payment Settings Store
 * localStorage-backed persistence for payment settings, payment records,
 * and payment history until the API endpoints are implemented.
 *
 * Replace calls to this module with real API queries when ready.
 */

import { devLog } from '../../../services/utils';
import type {
  PaymentSettings,
  PaymentRecord,
  PaymentSummary,
  PaymentMethod,
} from '../types/paymentTypes';
import { DEFAULT_PAYMENT_SETTINGS } from '../types/paymentTypes';
import type { TaxPaymentStatus } from '../../drake-export/types/drakeTypes';

// ============================================
// Storage Keys
// ============================================

const STORAGE_KEYS = {
  SETTINGS: 'hrm_payment_settings',
  PAYMENTS: 'hrm_payment_records',
} as const;

// ============================================
// Helpers
// ============================================

const readJSON = <T>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (err) {
    devLog(`[LocalPaymentStore] Failed to read ${key}:`, err);
    return null;
  }
};

const writeJSON = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    devLog(`[LocalPaymentStore] Failed to write ${key}:`, err);
  }
};

// ============================================
// Settings CRUD
// ============================================

/**
 * Load payment settings from localStorage.
 * Returns defaults if nothing is stored yet.
 */
export const loadLocalSettings = (businessId: string): PaymentSettings => {
  const stored = readJSON<PaymentSettings>(STORAGE_KEYS.SETTINGS);
  if (stored && stored.businessId === businessId) {
    devLog('[LocalPaymentStore] Loaded settings from localStorage');
    return stored;
  }

  // First time — seed with defaults
  const defaults: PaymentSettings = {
    ...DEFAULT_PAYMENT_SETTINGS,
    id: `ps_${Date.now()}`,
    businessId,
  } as PaymentSettings;

  writeJSON(STORAGE_KEYS.SETTINGS, defaults);
  devLog('[LocalPaymentStore] Initialized default settings');
  return defaults;
};

/**
 * Persist payment settings to localStorage.
 */
export const saveLocalSettings = (settings: PaymentSettings): PaymentSettings => {
  const updated: PaymentSettings = {
    ...settings,
    updatedAt: Date.now(),
  };
  writeJSON(STORAGE_KEYS.SETTINGS, updated);
  devLog('[LocalPaymentStore] Settings saved');
  return updated;
};

// ============================================
// Payment Records CRUD
// ============================================

/** Read all payment records from localStorage */
const readAllPayments = (): PaymentRecord[] => {
  return readJSON<PaymentRecord[]>(STORAGE_KEYS.PAYMENTS) || [];
};

/** Write all payment records to localStorage */
const writeAllPayments = (records: PaymentRecord[]): void => {
  writeJSON(STORAGE_KEYS.PAYMENTS, records);
};

/**
 * Save a new payment record.
 */
export const saveLocalPayment = (payment: PaymentRecord): PaymentRecord => {
  const all = readAllPayments();
  all.unshift(payment); // newest first
  writeAllPayments(all);
  devLog('[LocalPaymentStore] Payment saved:', payment.id);
  return payment;
};

/**
 * Get payment history for a specific client, newest first.
 */
export const getLocalPaymentHistory = (clientId: string): PaymentRecord[] => {
  const all = readAllPayments();
  return all
    .filter((p) => p.clientId === clientId)
    .sort((a, b) => b.createdAt - a.createdAt);
};

/**
 * Compute a revenue summary from locally-stored payments within a date range.
 */
export const getLocalPaymentSummary = (
  startDate: number,
  endDate: number
): PaymentSummary => {
  const all = readAllPayments();
  const filtered = all.filter((p) => p.date >= startDate && p.date <= endDate);

  const byStatus: Record<TaxPaymentStatus, { count: number; amount: number }> = {
    pending: { count: 0, amount: 0 },
    partial: { count: 0, amount: 0 },
    paid: { count: 0, amount: 0 },
    refunded: { count: 0, amount: 0 },
    waived: { count: 0, amount: 0 },
  };

  const byMethod: Record<PaymentMethod, { count: number; amount: number }> = {
    cash: { count: 0, amount: 0 },
    card: { count: 0, amount: 0 },
    check: { count: 0, amount: 0 },
    deduct_from_refund: { count: 0, amount: 0 },
    transfer: { count: 0, amount: 0 },
  };

  let totalRevenue = 0;
  let totalOutstanding = 0;
  const clientIds = new Set<string>();
  const clientsWithBalanceSet = new Set<string>();

  for (const p of filtered) {
    totalRevenue += p.amount;
    clientIds.add(p.clientId);

    // By method
    if (byMethod[p.method]) {
      byMethod[p.method].count++;
      byMethod[p.method].amount += p.amount;
    }

    // Derive status per payment
    if (p.balanceAfterPayment > 0) {
      byStatus.partial.count++;
      byStatus.partial.amount += p.amount;
      totalOutstanding += p.balanceAfterPayment;
      clientsWithBalanceSet.add(p.clientId);
    } else {
      byStatus.paid.count++;
      byStatus.paid.amount += p.amount;
    }
  }

  const totalPayments = filtered.length;
  const totalClients = clientIds.size;

  return {
    dateRange: { start: startDate, end: endDate },
    totalRevenue,
    totalPayments,
    totalClients,
    byStatus,
    byMethod,
    totalOutstanding,
    clientsWithBalance: clientsWithBalanceSet.size,
    averageFee: totalClients > 0 ? totalRevenue / totalClients : 0,
    averagePayment: totalPayments > 0 ? totalRevenue / totalPayments : 0,
  };
};
