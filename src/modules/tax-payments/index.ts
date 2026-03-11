/**
 * Tax Payments Module
 * Main entry point for fee calculation, payment processing, and receipt generation
 */

// Types
export type {
  PaymentMethod,
  FeeScheduleItem,
  FeeSchedule,
  ComplexityFactor,
  FeeEstimate,
  PaymentRecord,
  Receipt,
  PaymentSettings,
  PaymentSummary,
  CreateCheckoutSessionRequest,
  CreateCheckoutSessionResponse,
  PendingStripePayment,
} from './types/paymentTypes';

export {
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_LABELS_ES,
  DEFAULT_FEE_SCHEDULE_ITEMS,
  DEFAULT_PAYMENT_SETTINGS,
} from './types/paymentTypes';

// Services - Fee Calculation
export {
  calculateFeeEstimate,
  applyManualAdjustment,
  createDefaultFeeSchedule,
} from './services/feeCalculationService';

// Services - Payment
export {
  calculateFee,
  recordPayment,
  getPaymentHistory,
  updatePaymentStatus,
  derivePaymentStatus,
  generateReceipt,
  getBusinessPaymentSettings,
  saveBusinessPaymentSettings,
  getPaymentSummary,
  formatCurrency,
  formatDate,
  formatReceiptDate,
} from './services/paymentService';

// Services - Stripe
export { stripeService } from './services/stripeService';

// Store
export { paymentStore } from './stores/paymentStore';

// Components
export { default as FeeEstimator } from './components/FeeEstimator';
export { default as PaymentCollector } from './components/PaymentCollector';
export { default as ReceiptGenerator } from './components/ReceiptGenerator';
export { default as PaymentSettingsPage } from './components/PaymentSettingsPage';
export { default as StripeReturnHandler } from './components/StripeReturnHandler';
export { default as StripeCancelHandler } from './components/StripeCancelHandler';
