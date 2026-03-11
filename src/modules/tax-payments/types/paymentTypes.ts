/**
 * Tax Payments Module - Types
 * Type definitions for fee calculation, payment processing, and receipts
 */

import type { TaxPaymentStatus } from '../../drake-export/types/drakeTypes';

// ============================================
// Payment Method
// ============================================

/** Available payment methods for tax preparation fees */
export type PaymentMethod = 'cash' | 'card' | 'check' | 'deduct_from_refund' | 'transfer';

/** Labels for each payment method */
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  card: 'Credit/Debit Card',
  check: 'Check',
  deduct_from_refund: 'Deduct from Refund',
  transfer: 'Bank Transfer',
};

/** Spanish labels for each payment method */
export const PAYMENT_METHOD_LABELS_ES: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta de Credito/Debito',
  check: 'Cheque',
  deduct_from_refund: 'Descontar del Reembolso',
  transfer: 'Transferencia Bancaria',
};

// ============================================
// Fee Schedule
// ============================================

/** Individual fee schedule line item */
export interface FeeScheduleItem {
  id: string;
  formType: string;        // e.g., 'base', 'w2_additional', 'schedule_c', '1099', etc.
  basePrice: number;       // Price in USD
  description: string;     // Human-readable description
  descriptionEs?: string;  // Spanish description
  perUnit?: boolean;       // If true, fee is multiplied by quantity
  category: 'base' | 'form' | 'schedule' | 'credit' | 'state' | 'other';
}

/** Full fee schedule configuration */
export interface FeeSchedule {
  id: string;
  taxYear: number;
  name: string;
  items: FeeScheduleItem[];
  minimumFee: number;                  // Minimum charge regardless of calculation
  returningClientDiscount: number;     // Percentage discount (e.g., 10 = 10%)
  createdAt: number;
  updatedAt: number;
}

/** Default fee schedule items */
export const DEFAULT_FEE_SCHEDULE_ITEMS: FeeScheduleItem[] = [
  { id: 'base', formType: 'base', basePrice: 150, description: 'Base Tax Return Preparation', descriptionEs: 'Preparacion Basica de Declaracion', category: 'base' },
  { id: 'w2_additional', formType: 'w2_additional', basePrice: 25, description: 'Additional W-2', descriptionEs: 'W-2 Adicional', perUnit: true, category: 'form' },
  { id: 'schedule_c', formType: 'schedule_c', basePrice: 100, description: 'Schedule C (Self-Employment)', descriptionEs: 'Anexo C (Trabajo por Cuenta Propia)', category: 'schedule' },
  { id: '1099', formType: '1099', basePrice: 25, description: '1099 Form', descriptionEs: 'Formulario 1099', perUnit: true, category: 'form' },
  { id: 'schedule_e', formType: 'schedule_e', basePrice: 75, description: 'Schedule E (Rental Property)', descriptionEs: 'Anexo E (Propiedad de Alquiler)', perUnit: true, category: 'schedule' },
  { id: 'k1', formType: 'k1', basePrice: 50, description: 'Schedule K-1', descriptionEs: 'Anexo K-1', perUnit: true, category: 'form' },
  { id: 'dependent', formType: 'dependent', basePrice: 25, description: 'Dependent', descriptionEs: 'Dependiente', perUnit: true, category: 'other' },
  { id: 'state_return', formType: 'state_return', basePrice: 50, description: 'State Return', descriptionEs: 'Declaracion Estatal', perUnit: true, category: 'state' },
  { id: 'itemized', formType: 'itemized', basePrice: 50, description: 'Itemized Deductions (Schedule A)', descriptionEs: 'Deducciones Detalladas (Anexo A)', category: 'schedule' },
  { id: 'education_credit', formType: 'education_credit', basePrice: 25, description: 'Education Credits (Form 8863)', descriptionEs: 'Creditos Educativos (Formulario 8863)', category: 'credit' },
  { id: 'eitc', formType: 'eitc', basePrice: 25, description: 'Earned Income Tax Credit', descriptionEs: 'Credito por Ingreso del Trabajo', category: 'credit' },
];

// ============================================
// Complexity Factor
// ============================================

/** Represents additional charges based on return complexity */
export interface ComplexityFactor {
  id: string;
  feeItemId: string;      // References FeeScheduleItem.id
  description: string;
  descriptionEs?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

// ============================================
// Fee Estimate
// ============================================

/** Calculated fee with full breakdown */
export interface FeeEstimate {
  clientId: string;
  clientName: string;
  taxYear: number;
  lineItems: ComplexityFactor[];
  subtotal: number;
  returningClientDiscount: number;     // Dollar amount of discount
  returningClientDiscountPercent: number; // Percentage
  manualAdjustment: number;            // Manual override adjustment (+/-)
  manualAdjustmentNote?: string;
  minimumFeeApplied: boolean;
  total: number;
  estimatedAt: number;
  isReturningClient: boolean;
}

// ============================================
// Payment Record
// ============================================

/** Individual payment transaction */
export interface PaymentRecord {
  id: string;
  clientId: string;
  clientName: string;
  taxYear: number;

  // Payment details
  amount: number;
  method: PaymentMethod;
  date: number;                        // Timestamp of payment

  // Method-specific fields
  checkNumber?: string;                // For check payments
  cardReferenceNumber?: string;        // For card payments
  amountTendered?: number;             // For cash payments
  changeDue?: number;                  // For cash payments

  // Stripe fields
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  stripePaymentStatus?: 'pending' | 'completed' | 'failed' | 'cancelled';

  // Deduct from refund details
  refundAmount?: number;               // Total refund amount
  remainingRefundAfterDeduction?: number;

  // Fee context
  totalFee: number;                    // Total fee for this client
  previouslyPaid: number;             // Amount paid before this payment
  balanceAfterPayment: number;         // Remaining balance after this payment
  isPartialPayment: boolean;

  // Metadata
  notes?: string;
  recordedBy?: string;
  recordedByName?: string;
  createdAt: number;
  updatedAt?: number;

  // Receipt
  receiptGenerated?: boolean;
  receiptSentVia?: 'whatsapp' | 'email' | 'print' | 'none';
}

// ============================================
// Receipt
// ============================================

/** Receipt data for printing/sending */
export interface Receipt {
  id: string;
  paymentId: string;
  clientId: string;

  // Business info
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessEin?: string;

  // Client info
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;

  // Service info
  serviceDescription: string;
  serviceDescriptionEs: string;
  taxYear: number;

  // Fee breakdown
  feeBreakdown: ComplexityFactor[];
  subtotal: number;
  discount: number;
  totalFee: number;

  // Payment details
  paymentMethod: PaymentMethod;
  paymentAmount: number;
  paymentDate: number;
  checkNumber?: string;
  cardReference?: string;

  // Balance
  previousPayments: number;
  balanceRemaining: number;

  // Metadata
  receiptNumber: string;
  generatedAt: number;
  generatedBy?: string;
}

// ============================================
// Payment Settings
// ============================================

/** Business-level fee and payment configuration */
export interface PaymentSettings {
  id: string;
  businessId: string;

  // Fee schedule
  feeSchedule: FeeSchedule;

  // Business info for receipts
  businessName: string;
  businessAddress: string;
  businessCity: string;
  businessState: string;
  businessZip: string;
  businessPhone: string;
  businessEin?: string;
  businessLogo?: string;              // URL to logo image

  // Preferences
  defaultPaymentMethod?: PaymentMethod;
  allowPartialPayments: boolean;
  allowDeductFromRefund: boolean;
  autoCalculateFees: boolean;

  // Receipt customization
  receiptThankYouMessage: string;
  receiptThankYouMessageEs: string;
  receiptFooterNote?: string;
  receiptFooterNoteEs?: string;

  // Metadata
  createdAt: number;
  updatedAt: number;
}

/** Default payment settings */
export const DEFAULT_PAYMENT_SETTINGS: Omit<PaymentSettings, 'id' | 'businessId'> = {
  feeSchedule: {
    id: 'default',
    taxYear: new Date().getFullYear(),
    name: 'Standard Fee Schedule',
    items: DEFAULT_FEE_SCHEDULE_ITEMS,
    minimumFee: 100,
    returningClientDiscount: 10,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  businessName: 'Stephanie Solutions',
  businessAddress: '',
  businessCity: '',
  businessState: '',
  businessZip: '',
  businessPhone: '',
  allowPartialPayments: true,
  allowDeductFromRefund: true,
  autoCalculateFees: true,
  receiptThankYouMessage: 'Thank you for choosing our services!',
  receiptThankYouMessageEs: 'Gracias por elegir nuestros servicios!',
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

// ============================================
// Payment Summary (Revenue Report)
// ============================================

/** Revenue summary for a given date range */
export interface PaymentSummary {
  dateRange: { start: number; end: number };
  totalRevenue: number;
  totalPayments: number;
  totalClients: number;

  // By status
  byStatus: Record<TaxPaymentStatus, { count: number; amount: number }>;

  // By method
  byMethod: Record<PaymentMethod, { count: number; amount: number }>;

  // Outstanding
  totalOutstanding: number;
  clientsWithBalance: number;

  // Averages
  averageFee: number;
  averagePayment: number;
}

// ============================================
// Stripe Checkout Types
// ============================================

/** Request body for creating a Stripe Checkout Session */
export interface CreateCheckoutSessionRequest {
  amountCents: number;
  clientId: string;
  clientName: string;
  taxYear: number;
  successUrl: string;
  cancelUrl: string;
}

/** Response from creating a Stripe Checkout Session */
export interface CreateCheckoutSessionResponse {
  sessionId: string;
  url: string;
}

/** Pending Stripe payment stored in sessionStorage to survive redirect */
export interface PendingStripePayment {
  clientId: string;
  clientName: string;
  taxYear: number;
  amount: number;
  totalFee: number;
  previouslyPaid: number;
  sessionId: string;
  createdAt: number;
}
