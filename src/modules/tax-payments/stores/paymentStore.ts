/**
 * Payment Store
 * SolidJS store for tax payment state management
 */

import { createSignal, createRoot } from 'solid-js';
import { createStore } from 'solid-js/store';
import type { TaxPortal, DrakeTaxDocument } from '../../drake-export/types/drakeTypes';
import type {
  PaymentRecord,
  FeeEstimate,
  PaymentSettings,
  PaymentSummary,
} from '../types/paymentTypes';
import {
  calculateFee,
  recordPayment as recordPaymentApi,
  getPaymentHistory as getPaymentHistoryApi,
  getBusinessPaymentSettings,
  saveBusinessPaymentSettings,
  getPaymentSummary as getPaymentSummaryApi,
  generateReceipt as generateReceiptApi,
  updatePaymentStatus as updatePaymentStatusApi,
  derivePaymentStatus,
} from '../services/paymentService';

// ============================================
// State Interface
// ============================================

interface PaymentStoreState {
  currentFeeEstimate: FeeEstimate | null;
  currentPayment: Partial<PaymentRecord> | null;
  paymentHistory: PaymentRecord[];
  feeSettings: PaymentSettings | null;
  paymentSummary: PaymentSummary | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  settingsLoaded: boolean;
}

// ============================================
// Store Creation
// ============================================

function createPaymentStore() {
  const [state, setState] = createStore<PaymentStoreState>({
    currentFeeEstimate: null,
    currentPayment: null,
    paymentHistory: [],
    feeSettings: null,
    paymentSummary: null,
    isLoading: false,
    isSaving: false,
    error: null,
    settingsLoaded: false,
  });

  const [selectedClientId, setSelectedClientId] = createSignal<string | null>(null);

  // ============================================
  // Settings Actions
  // ============================================

  /**
   * Load business payment settings
   */
  const loadSettings = async (): Promise<void> => {
    if (state.settingsLoaded && state.feeSettings) return;

    setState('isLoading', true);
    setState('error', null);

    try {
      const settings = await getBusinessPaymentSettings();
      setState('feeSettings', settings);
      setState('settingsLoaded', true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load settings';
      setState('error', message);
    } finally {
      setState('isLoading', false);
    }
  };

  /**
   * Save business payment settings
   */
  const saveSettings = async (settings: PaymentSettings): Promise<void> => {
    setState('isSaving', true);
    setState('error', null);

    try {
      const saved = await saveBusinessPaymentSettings(settings);
      setState('feeSettings', saved);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save settings';
      setState('error', message);
      throw err;
    } finally {
      setState('isSaving', false);
    }
  };

  // ============================================
  // Fee Calculation Actions
  // ============================================

  /**
   * Calculate fee for a client
   */
  const calculateClientFee = (
    client: TaxPortal,
    documents: DrakeTaxDocument[],
    isReturningClient: boolean = false
  ): FeeEstimate | null => {
    if (!state.feeSettings) {
      setState('error', 'Settings not loaded. Please load settings first.');
      return null;
    }

    try {
      const estimate = calculateFee(client, documents, state.feeSettings, isReturningClient);
      setState('currentFeeEstimate', estimate);
      return estimate;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Fee calculation failed';
      setState('error', message);
      return null;
    }
  };

  /**
   * Update fee estimate with manual adjustment
   */
  const applyManualAdjustment = (
    adjustment: number,
    note?: string
  ): void => {
    if (!state.currentFeeEstimate) return;

    const estimate = state.currentFeeEstimate;
    const adjustedTotal = Math.max(
      0,
      estimate.subtotal - estimate.returningClientDiscount + adjustment
    );

    setState('currentFeeEstimate', {
      ...estimate,
      manualAdjustment: adjustment,
      manualAdjustmentNote: note,
      total: adjustedTotal,
      estimatedAt: Date.now(),
    });
  };

  /**
   * Clear current fee estimate
   */
  const clearFeeEstimate = (): void => {
    setState('currentFeeEstimate', null);
  };

  // ============================================
  // Payment Actions
  // ============================================

  /**
   * Record a payment
   */
  const recordPayment = async (
    payment: Omit<PaymentRecord, 'id' | 'createdAt'>
  ): Promise<PaymentRecord | null> => {
    setState('isSaving', true);
    setState('error', null);

    try {
      const recorded = await recordPaymentApi(payment.clientId, payment);

      // Add to history
      setState('paymentHistory', (prev) => [recorded, ...prev]);

      // Update payment status on client
      const newStatus = derivePaymentStatus(
        payment.totalFee,
        payment.previouslyPaid + payment.amount
      );
      await updatePaymentStatusApi(
        payment.clientId,
        newStatus,
        payment.previouslyPaid + payment.amount,
        payment.totalFee
      );

      return recorded;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to record payment';
      setState('error', message);
      return null;
    } finally {
      setState('isSaving', false);
    }
  };

  /**
   * Load payment history for a client
   */
  const loadPaymentHistory = async (clientId: string): Promise<void> => {
    setState('isLoading', true);
    setState('error', null);
    setSelectedClientId(clientId);

    try {
      const history = await getPaymentHistoryApi(clientId);
      setState('paymentHistory', history);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load payment history';
      setState('error', message);
    } finally {
      setState('isLoading', false);
    }
  };

  /**
   * Generate receipt for a payment
   */
  const generateReceipt = (
    payment: PaymentRecord,
    client: TaxPortal
  ) => {
    if (!state.feeSettings) return null;
    return generateReceiptApi(
      payment,
      client,
      state.currentFeeEstimate,
      state.feeSettings
    );
  };

  // ============================================
  // Summary Actions
  // ============================================

  /**
   * Load payment summary for date range
   */
  const loadPaymentSummary = async (
    startDate: number,
    endDate: number
  ): Promise<void> => {
    setState('isLoading', true);
    setState('error', null);

    try {
      const summary = await getPaymentSummaryApi(startDate, endDate);
      setState('paymentSummary', summary);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load summary';
      setState('error', message);
    } finally {
      setState('isLoading', false);
    }
  };

  // ============================================
  // Utility Actions
  // ============================================

  /**
   * Clear error state
   */
  const clearError = (): void => {
    setState('error', null);
  };

  /**
   * Reset store to initial state
   */
  const reset = (): void => {
    setState({
      currentFeeEstimate: null,
      currentPayment: null,
      paymentHistory: [],
      paymentSummary: null,
      isLoading: false,
      isSaving: false,
      error: null,
    });
    setSelectedClientId(null);
  };

  /**
   * Get total paid for a client from payment history
   */
  const getTotalPaid = (): number => {
    return state.paymentHistory.reduce((sum, p) => sum + p.amount, 0);
  };

  /**
   * Get balance due for current client
   */
  const getBalanceDue = (): number => {
    const totalFee = state.currentFeeEstimate?.total || 0;
    const totalPaid = getTotalPaid();
    return Math.max(0, totalFee - totalPaid);
  };

  return {
    // State
    state,
    selectedClientId,

    // Settings
    loadSettings,
    saveSettings,

    // Fee Calculation
    calculateClientFee,
    applyManualAdjustment,
    clearFeeEstimate,

    // Payments
    recordPayment,
    loadPaymentHistory,
    generateReceipt,

    // Summary
    loadPaymentSummary,

    // Utilities
    clearError,
    reset,
    getTotalPaid,
    getBalanceDue,
  };
}

// Create singleton store
export const paymentStore = createRoot(createPaymentStore);
