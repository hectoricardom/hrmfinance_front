/**
 * Payment Collector Component
 * Records payments with support for multiple payment methods
 */

import { Component, createSignal, createEffect, Show, For } from 'solid-js';
import { Button, FormInput } from '../../ui';
import type { TaxPortal } from '../../drake-export/types/drakeTypes';
import type { PaymentRecord, PaymentMethod } from '../types/paymentTypes';
import { PAYMENT_METHOD_LABELS } from '../types/paymentTypes';
import { paymentStore } from '../stores/paymentStore';
import { formatCurrency, derivePaymentStatus } from '../services/paymentService';
import { stripeService } from '../services/stripeService';
import { authStore } from '../../../stores/authStore';

interface PaymentCollectorProps {
  client: TaxPortal;
  amountDue: number;
  totalFee: number;
  previouslyPaid?: number;
  refundAmount?: number;
  onPaymentRecorded: (payment: PaymentRecord) => void;
  onCancel?: () => void;
}

const PaymentCollector: Component<PaymentCollectorProps> = (props) => {
  const [selectedMethod, setSelectedMethod] = createSignal<PaymentMethod | null>(null);
  const [paymentAmount, setPaymentAmount] = createSignal(props.amountDue.toFixed(2));
  const [amountTendered, setAmountTendered] = createSignal('');
  const [checkNumber, setCheckNumber] = createSignal('');
  const [cardReference, setCardReference] = createSignal('');
  const [notes, setNotes] = createSignal('');
  const [showReceipt, setShowReceipt] = createSignal(false);
  const [lastPayment, setLastPayment] = createSignal<PaymentRecord | null>(null);
  const [validationError, setValidationError] = createSignal('');
  const [isRedirectingToStripe, setIsRedirectingToStripe] = createSignal(false);
  const [stripeError, setStripeError] = createSignal('');

  // Reset amount when method changes
  createEffect(() => {
    const method = selectedMethod();
    if (method) {
      setPaymentAmount(props.amountDue.toFixed(2));
      setAmountTendered('');
      setCheckNumber('');
      setCardReference('');
      setValidationError('');
    }
  });

  // Computed values
  const parsedAmount = () => parseFloat(paymentAmount()) || 0;
  const parsedTendered = () => parseFloat(amountTendered()) || 0;
  const changeDue = () => Math.max(0, parsedTendered() - parsedAmount());
  const isPartial = () => parsedAmount() < props.amountDue;
  const balanceAfter = () => Math.max(0, props.amountDue - parsedAmount());
  const refundAfterDeduction = () => (props.refundAmount || 0) - parsedAmount();

  const validate = (): boolean => {
    const amount = parsedAmount();
    if (amount <= 0) {
      setValidationError('Payment amount must be greater than $0.00');
      return false;
    }
    if (amount > props.amountDue + 0.01) {
      setValidationError('Payment amount cannot exceed the balance due');
      return false;
    }
    if (selectedMethod() === 'cash' && parsedTendered() > 0 && parsedTendered() < amount) {
      setValidationError('Amount tendered must be at least the payment amount');
      return false;
    }
    if (selectedMethod() === 'check' && !checkNumber().trim()) {
      setValidationError('Please enter the check number');
      return false;
    }
    if (selectedMethod() === 'deduct_from_refund') {
      if (!props.refundAmount || props.refundAmount <= 0) {
        setValidationError('No refund available for deduction');
        return false;
      }
      if (amount > props.refundAmount) {
        setValidationError('Deduction cannot exceed refund amount');
        return false;
      }
    }
    setValidationError('');
    return true;
  };

  const handleSubmitPayment = async () => {
    if (!selectedMethod() || !validate()) return;

    const previouslyPaid = props.previouslyPaid || 0;
    const amount = parsedAmount();

    const payment: Omit<PaymentRecord, 'id' | 'createdAt'> = {
      clientId: props.client.id,
      clientName: `${props.client.firstName} ${props.client.lastName}`,
      taxYear: props.client.taxYear || new Date().getFullYear(),
      amount,
      method: selectedMethod()!,
      date: Date.now(),
      totalFee: props.totalFee,
      previouslyPaid,
      balanceAfterPayment: Math.max(0, props.amountDue - amount),
      isPartialPayment: amount < props.amountDue,
      notes: notes() || undefined,
      recordedBy: authStore?.user?.uid || undefined,
      checkNumber: selectedMethod() === 'check' ? checkNumber() : undefined,
      cardReferenceNumber: selectedMethod() === 'card' ? cardReference() || undefined : undefined,
      amountTendered: selectedMethod() === 'cash' && parsedTendered() > 0 ? parsedTendered() : undefined,
      changeDue: selectedMethod() === 'cash' && changeDue() > 0 ? changeDue() : undefined,
      refundAmount: selectedMethod() === 'deduct_from_refund' ? props.refundAmount : undefined,
      remainingRefundAfterDeduction: selectedMethod() === 'deduct_from_refund' ? refundAfterDeduction() : undefined,
    };

    const recorded = await paymentStore.recordPayment(payment);
    if (recorded) {
      setLastPayment(recorded);
      setShowReceipt(true);
      props.onPaymentRecorded(recorded);
    }
  };

  const handleStripeCheckout = async () => {
    const amount = parsedAmount();
    if (amount <= 0) {
      setStripeError('Payment amount must be greater than $0.00');
      return;
    }
    if (amount > props.amountDue + 0.01) {
      setStripeError('Payment amount cannot exceed the balance due');
      return;
    }

    console.log(stripeService)

    if (!stripeService.isConfigured()) {
      setStripeError('Stripe payments are not configured. Please contact the administrator.');
      return;
    }

    setStripeError('');
    setIsRedirectingToStripe(true);

    try {
      const origin = window.location.origin;
      const pathname = window.location.pathname;

      await stripeService.createCheckoutAndRedirect(
        {
          amountCents: Math.round(amount * 100),
          clientId: props.client.id,
          clientName: `${props.client.firstName} ${props.client.lastName}`,
          taxYear: props.client.taxYear || new Date().getFullYear(),
          successUrl: `${origin}${pathname}#/stripe-success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${origin}${pathname}#/stripe-cancel`,
        },
        {
          clientId: props.client.id,
          clientName: `${props.client.firstName} ${props.client.lastName}`,
          taxYear: props.client.taxYear || new Date().getFullYear(),
          amount,
          totalFee: props.totalFee,
          previouslyPaid: props.previouslyPaid || 0,
        }
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start Stripe checkout';
      setStripeError(message);
      setIsRedirectingToStripe(false);
    }
  };

  // Styles
  const containerStyle = {
    background: 'var(--surface-color, #fff)',
    'border-radius': 'var(--border-radius-md, 8px)',
    border: '1px solid var(--border-color, #e5e7eb)',
    overflow: 'hidden',
  };

  const headerStyle = {
    background: '#1a73e8',
    color: 'white',
    padding: '1rem 1.5rem',
  };

  const bodyStyle = {
    padding: '1.5rem',
  };

  const amountDueStyle = {
    'text-align': 'center' as const,
    'margin-bottom': '1.5rem',
    padding: '1rem',
    background: 'var(--background-color, #f9fafb)',
    'border-radius': 'var(--border-radius-md, 8px)',
  };

  const amountDueLabelStyle = {
    'font-size': '0.875rem',
    color: 'var(--text-secondary, #6b7280)',
    'margin-bottom': '0.25rem',
  };

  const amountDueValueStyle = {
    'font-size': '2rem',
    'font-weight': '700',
    color: props.amountDue > 0 ? '#ef4444' : '#22c55e',
  };

  const methodGridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '0.75rem',
    'margin-bottom': '1.5rem',
  };

  const methodButtonStyle = (method: PaymentMethod, isSelected: boolean) => ({
    padding: '1rem',
    border: `2px solid ${isSelected ? '#1a73e8' : 'var(--border-color, #e5e7eb)'}`,
    'border-radius': 'var(--border-radius-md, 8px)',
    background: isSelected ? '#eff6ff' : 'var(--surface-color, #fff)',
    color: isSelected ? '#1a73e8' : 'var(--text-primary, #1f2937)',
    cursor: 'pointer',
    'text-align': 'center' as const,
    'font-weight': '600',
    'font-size': '0.875rem',
    transition: 'all 0.2s',
    display: 'flex',
    'flex-direction': 'column' as const,
    'align-items': 'center',
    gap: '0.5rem',
  });

  const sectionStyle = {
    'margin-bottom': '1.25rem',
  };

  const sectionTitleStyle = {
    'font-weight': '600',
    'font-size': '0.875rem',
    color: 'var(--text-secondary, #6b7280)',
    'margin-bottom': '0.75rem',
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid var(--border-color, #e5e7eb)',
    'border-radius': 'var(--border-radius-md, 8px)',
    'font-size': '1rem',
    'box-sizing': 'border-box' as const,
    background: 'var(--surface-color, #fff)',
    color: 'var(--text-primary, #1f2937)',
  };

  const cashCalcStyle = {
    padding: '1rem',
    background: '#f0fdf4',
    'border-radius': 'var(--border-radius-md, 8px)',
    border: '1px solid #86efac',
    'margin-top': '0.75rem',
  };

  const cashCalcRowStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '0.25rem 0',
    'font-size': '0.875rem',
  };

  const changeValueStyle = {
    'font-size': '1.25rem',
    'font-weight': '700',
    color: '#22c55e',
  };

  const partialBannerStyle = {
    padding: '0.75rem',
    background: '#fef3c7',
    'border-radius': 'var(--border-radius-md, 8px)',
    'font-size': '0.875rem',
    color: '#92400e',
    'margin-bottom': '1rem',
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
  };

  const errorStyle = {
    padding: '0.75rem',
    background: '#fef2f2',
    color: '#ef4444',
    'border-radius': 'var(--border-radius-md, 8px)',
    'font-size': '0.875rem',
    'margin-bottom': '1rem',
  };

  const refundInfoStyle = {
    padding: '1rem',
    background: '#eff6ff',
    'border-radius': 'var(--border-radius-md, 8px)',
    border: '1px solid #93c5fd',
    'margin-top': '0.75rem',
  };

  const actionsStyle = {
    display: 'flex',
    gap: '0.75rem',
    'margin-top': '1.5rem',
    'padding-top': '1rem',
    'border-top': '1px solid var(--border-color, #e5e7eb)',
  };

  const successStyle = {
    'text-align': 'center' as const,
    padding: '2rem',
  };

  const successIconStyle = {
    width: '64px',
    height: '64px',
    'border-radius': '50%',
    background: '#22c55e',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    margin: '0 auto 1rem',
  };

  // Method icons as inline SVG
  const methodIcons: Record<PaymentMethod, string> = {
    cash: 'M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6',
    card: 'M1 4h22v16H1zM1 10h22',
    check: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
    deduct_from_refund: 'M4 4h16v16H4zM4 9h16M9 4v16',
    transfer: 'M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3',
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h3 style={{ 'font-size': '1.125rem', 'font-weight': '600', margin: '0' }}>
          Record Payment
        </h3>
        <div style={{ 'font-size': '0.875rem', 'margin-top': '0.25rem', opacity: '0.9' }}>
          {props.client.firstName} {props.client.lastName}
        </div>
      </div>

      <div style={bodyStyle}>
        <Show when={!showReceipt()}>
          {/* Amount Due */}
          <div style={amountDueStyle}>
            <div style={amountDueLabelStyle}>Balance Due</div>
            <div style={amountDueValueStyle}>{formatCurrency(props.amountDue)}</div>
            <Show when={(props.previouslyPaid || 0) > 0}>
              <div style={{ 'font-size': '0.8rem', color: 'var(--text-secondary, #6b7280)', 'margin-top': '0.25rem' }}>
                Previously paid: {formatCurrency(props.previouslyPaid || 0)} of {formatCurrency(props.totalFee)}
              </div>
            </Show>
          </div>

          {/* Errors */}
          <Show when={validationError()}>
            <div style={errorStyle}>{validationError()}</div>
          </Show>
          <Show when={paymentStore.state.error}>
            <div style={errorStyle}>{paymentStore.state.error}</div>
          </Show>

          {/* Payment Method Selection */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Payment Method</div>
            <div style={methodGridStyle}>
              <For each={Object.entries(PAYMENT_METHOD_LABELS) as [PaymentMethod, string][]}>
                {([method, label]) => (
                  <button
                    style={methodButtonStyle(method as PaymentMethod, selectedMethod() === method)}
                    onClick={() => setSelectedMethod(method as PaymentMethod)}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                      stroke={selectedMethod() === method ? '#1a73e8' : 'currentColor'}
                      stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d={methodIcons[method as PaymentMethod]} />
                    </svg>
                    {label}
                  </button>
                )}
              </For>
            </div>
          </div>

          {/* Payment Details (shown after method selection) */}
          <Show when={selectedMethod()}>
            {/* Amount Input */}
            <div style={sectionStyle}>
              <label style={sectionTitleStyle}>Payment Amount</label>
              <input
                type="number"
                style={{ ...inputStyle, 'font-size': '1.25rem', 'font-weight': '600' }}
                value={paymentAmount()}
                onInput={(e) => setPaymentAmount(e.currentTarget.value)}
                min="0.01"
                max={props.amountDue}
                step="0.01"
              />
            </div>

            {/* Partial Payment Warning */}
            <Show when={isPartial() && parsedAmount() > 0}>
              <div style={partialBannerStyle}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                Partial payment: {formatCurrency(balanceAfter())} will remain as balance due.
              </div>
            </Show>

            {/* Cash: Change Calculator */}
            <Show when={selectedMethod() === 'cash'}>
              <div style={sectionStyle}>
                <label style={sectionTitleStyle}>Amount Tendered</label>
                <input
                  type="number"
                  style={inputStyle}
                  value={amountTendered()}
                  onInput={(e) => setAmountTendered(e.currentTarget.value)}
                  placeholder="Enter amount given by client..."
                  min="0"
                  step="0.01"
                />
                <Show when={parsedTendered() > 0}>
                  <div style={cashCalcStyle}>
                    <div style={cashCalcRowStyle}>
                      <span>Amount Tendered</span>
                      <span style={{ 'font-weight': '600' }}>{formatCurrency(parsedTendered())}</span>
                    </div>
                    <div style={cashCalcRowStyle}>
                      <span>Payment Amount</span>
                      <span style={{ 'font-weight': '600' }}>-{formatCurrency(parsedAmount())}</span>
                    </div>
                    <div style={{
                      ...cashCalcRowStyle,
                      'border-top': '1px solid #86efac',
                      'padding-top': '0.5rem',
                      'margin-top': '0.25rem',
                    }}>
                      <span style={{ 'font-weight': '600' }}>Change Due</span>
                      <span style={changeValueStyle}>{formatCurrency(changeDue())}</span>
                    </div>
                  </div>
                </Show>
              </div>
            </Show>

            {/* Check: Check Number */}
            <Show when={selectedMethod() === 'check'}>
              <div style={sectionStyle}>
                <label style={sectionTitleStyle}>Check Number</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={checkNumber()}
                  onInput={(e) => setCheckNumber(e.currentTarget.value)}
                  placeholder="Enter check number..."
                />
              </div>
            </Show>

            {/* Card: Stripe Checkout */}
            <Show when={selectedMethod() === 'card'}>
              <div style={sectionStyle}>
                <Show when={stripeError()}>
                  <div style={errorStyle}>{stripeError()}</div>
                </Show>
                <button
                  style={{
                    width: '100%',
                    padding: '1rem 1.5rem',
                    background: '#635bff',
                    color: 'white',
                    border: 'none',
                    'border-radius': 'var(--border-radius-md, 8px)',
                    'font-size': '1.125rem',
                    'font-weight': '700',
                    cursor: isRedirectingToStripe() ? 'not-allowed' : 'pointer',
                    opacity: isRedirectingToStripe() ? '0.7' : '1',
                    display: 'flex',
                    'align-items': 'center',
                    'justify-content': 'center',
                    gap: '0.75rem',
                    transition: 'background 0.2s',
                  }}
                  onClick={handleStripeCheckout}
                  disabled={isRedirectingToStripe()}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                    <line x1="1" y1="10" x2="23" y2="10" />
                  </svg>
                  {isRedirectingToStripe()
                    ? 'Redirecting to Stripe...'
                    : `Pay ${formatCurrency(parsedAmount())} with Card`}
                </button>
                <div style={{ 'text-align': 'center', 'margin-top': '0.5rem', 'font-size': '0.75rem', color: 'var(--text-secondary, #6b7280)' }}>
                  Secure payment powered by Stripe
                </div>
              </div>
            </Show>

            {/* Deduct from Refund */}
            <Show when={selectedMethod() === 'deduct_from_refund'}>
              <div style={refundInfoStyle}>
                <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.5rem' }}>
                  <span style={{ 'font-size': '0.875rem', color: 'var(--text-secondary, #6b7280)' }}>Total Refund</span>
                  <span style={{ 'font-weight': '600', color: '#22c55e' }}>
                    {formatCurrency(props.refundAmount || 0)}
                  </span>
                </div>
                <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.5rem' }}>
                  <span style={{ 'font-size': '0.875rem', color: 'var(--text-secondary, #6b7280)' }}>Fee Deduction</span>
                  <span style={{ 'font-weight': '600', color: '#ef4444' }}>
                    -{formatCurrency(parsedAmount())}
                  </span>
                </div>
                <div style={{
                  display: 'flex',
                  'justify-content': 'space-between',
                  'border-top': '1px solid #93c5fd',
                  'padding-top': '0.5rem',
                }}>
                  <span style={{ 'font-weight': '600', 'font-size': '0.875rem' }}>Refund to Client</span>
                  <span style={{ 'font-weight': '700', 'font-size': '1.125rem', color: '#1a73e8' }}>
                    {formatCurrency(Math.max(0, refundAfterDeduction()))}
                  </span>
                </div>
              </div>
            </Show>

            {/* Notes */}
            <div style={sectionStyle}>
              <label style={sectionTitleStyle}>Notes (optional)</label>
              <textarea
                style={{
                  ...inputStyle,
                  'min-height': '60px',
                  resize: 'vertical' as const,
                }}
                value={notes()}
                onInput={(e) => setNotes(e.currentTarget.value)}
                placeholder="Add any notes about this payment..."
              />
            </div>

            {/* Actions */}
            <div style={actionsStyle}>
              <Show when={selectedMethod() !== 'card'}>
                <Button
                  onClick={handleSubmitPayment}
                  disabled={paymentStore.state.isSaving || !selectedMethod()}
                >
                  {paymentStore.state.isSaving ? 'Processing...' : `Submit Payment - ${formatCurrency(parsedAmount())}`}
                </Button>
              </Show>
              <Show when={props.onCancel}>
                <Button variant="secondary" onClick={props.onCancel}>
                  Cancel
                </Button>
              </Show>
            </div>
          </Show>
        </Show>

        {/* Payment Success */}
        <Show when={showReceipt() && lastPayment()}>
          <div style={successStyle}>
            <div style={successIconStyle}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 style={{ 'font-size': '1.25rem', 'font-weight': '700', 'margin-bottom': '0.5rem', color: 'var(--text-primary, #1f2937)' }}>
              Payment Recorded
            </h3>
            <p style={{ color: 'var(--text-secondary, #6b7280)', 'margin-bottom': '0.25rem' }}>
              {formatCurrency(lastPayment()!.amount)} via {PAYMENT_METHOD_LABELS[lastPayment()!.method]}
            </p>
            <Show when={lastPayment()!.balanceAfterPayment > 0}>
              <p style={{ color: '#f59e0b', 'font-weight': '600' }}>
                Remaining balance: {formatCurrency(lastPayment()!.balanceAfterPayment)}
              </p>
            </Show>
            <Show when={lastPayment()!.balanceAfterPayment <= 0}>
              <p style={{ color: '#22c55e', 'font-weight': '600' }}>
                Paid in Full
              </p>
            </Show>

            <div style={{ display: 'flex', gap: '0.75rem', 'justify-content': 'center', 'margin-top': '1.5rem', 'flex-wrap': 'wrap' }}>
              <Button onClick={() => {
                // Navigate to receipt generation - trigger callback
                const receipt = paymentStore.generateReceipt(lastPayment()!, props.client);
                if (receipt) {
                  // The parent component should handle receipt display
                  props.onPaymentRecorded(lastPayment()!);
                }
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style={{ 'margin-right': '0.5rem' }}>
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                Generate Receipt
              </Button>
              <Show when={lastPayment()!.balanceAfterPayment > 0}>
                <Button variant="secondary" onClick={() => {
                  setShowReceipt(false);
                  setSelectedMethod(null);
                  setPaymentAmount(lastPayment()!.balanceAfterPayment.toFixed(2));
                }}>
                  Record Another Payment
                </Button>
              </Show>
              <Show when={props.onCancel}>
                <Button variant="secondary" onClick={props.onCancel}>
                  Close
                </Button>
              </Show>
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
};

export default PaymentCollector;
