/**
 * Stripe Return Handler
 * Handles the redirect back from Stripe Checkout after a successful payment
 */

import { Component, createSignal, onMount, Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { stripeService } from '../services/stripeService';
import { paymentStore } from '../stores/paymentStore';
import { formatCurrency } from '../services/paymentService';
import type { PaymentRecord } from '../types/paymentTypes';
import type { PendingStripePayment } from '../types/paymentTypes';

type HandlerState = 'loading' | 'success' | 'error';

const StripeReturnHandler: Component = () => {
  const navigate = useNavigate();
  const [state, setState] = createSignal<HandlerState>('loading');
  const [errorMessage, setErrorMessage] = createSignal('');
  const [recordedPayment, setRecordedPayment] = createSignal<PaymentRecord | null>(null);
  const [pendingInfo, setPendingInfo] = createSignal<PendingStripePayment | null>(null);

  onMount(async () => {
    try {
      // Read session_id from URL query params
      // HashRouter: the query string is after the hash, e.g. /#/stripe-success?session_id=cs_xxx
      const hashParts = window.location.hash.split('?');
      const queryString = hashParts.length > 1 ? hashParts[1] : '';
      const params = new URLSearchParams(queryString);
      const sessionId = params.get('session_id');

      if (!sessionId) {
        setState('error');
        setErrorMessage('No session ID found. This page should only be accessed after a Stripe payment.');
        return;
      }

      // Retrieve pending payment from sessionStorage
      const pending = stripeService.retrievePendingPayment();
      if (!pending) {
        setState('error');
        setErrorMessage('Payment session data not found. The payment may have already been recorded, or your browser session expired.');
        return;
      }
      setPendingInfo(pending);

      // Verify session with Cloud Function
      const verification = await stripeService.verifySession(sessionId);

      if (verification.status !== 'complete') {
        setState('error');
        setErrorMessage(`Payment was not completed. Status: ${verification.status}. Your card was not charged.`);
        return;
      }

      // Build and record the payment
      const balanceAfter = Math.max(0, (pending.totalFee - pending.previouslyPaid) - pending.amount);

      const paymentData: Omit<PaymentRecord, 'id' | 'createdAt'> = {
        clientId: pending.clientId,
        clientName: pending.clientName,
        taxYear: pending.taxYear,
        amount: pending.amount,
        method: 'card',
        date: Date.now(),
        totalFee: pending.totalFee,
        previouslyPaid: pending.previouslyPaid,
        balanceAfterPayment: balanceAfter,
        isPartialPayment: balanceAfter > 0,
        stripeSessionId: sessionId,
        stripePaymentIntentId: verification.paymentIntentId,
        stripePaymentStatus: 'completed',
      };

      const recorded = await paymentStore.recordPayment(paymentData);
      if (recorded) {
        setRecordedPayment(recorded);
        setState('success');
      } else {
        setState('error');
        setErrorMessage('Payment was processed by Stripe but failed to record locally. Please contact support with your session ID.');
      }

      // Clean URL to prevent double-recording on refresh
      history.replaceState(null, '', window.location.pathname + '#/stripe-success');
    } catch (err) {
      setState('error');
      setErrorMessage(err instanceof Error ? err.message : 'An unexpected error occurred while processing your payment.');
    }
  });

  const containerStyle = {
    'max-width': '600px',
    margin: '2rem auto',
    padding: '2rem',
    background: 'var(--surface-color, #fff)',
    'border-radius': 'var(--border-radius-md, 8px)',
    border: '1px solid var(--border-color, #e5e7eb)',
    'text-align': 'center' as const,
  };

  return (
    <div style={containerStyle}>
      {/* Loading */}
      <Show when={state() === 'loading'}>
        <div style={{ padding: '3rem 0' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #e5e7eb',
            'border-top-color': '#635bff',
            'border-radius': '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 1.5rem',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <h3 style={{ 'font-size': '1.125rem', 'font-weight': '600', color: 'var(--text-primary, #1f2937)' }}>
            Verifying your payment...
          </h3>
          <p style={{ color: 'var(--text-secondary, #6b7280)', 'font-size': '0.875rem' }}>
            Please wait while we confirm your payment with Stripe.
          </p>
        </div>
      </Show>

      {/* Success */}
      <Show when={state() === 'success' && recordedPayment()}>
        <div style={{ padding: '2rem 0' }}>
          <div style={{
            width: '64px',
            height: '64px',
            'border-radius': '50%',
            background: '#22c55e',
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'center',
            margin: '0 auto 1.5rem',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
              <path d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 style={{ 'font-size': '1.5rem', 'font-weight': '700', color: 'var(--text-primary, #1f2937)', 'margin-bottom': '0.5rem' }}>
            Payment Successful!
          </h3>
          <p style={{ color: 'var(--text-secondary, #6b7280)', 'font-size': '1rem', 'margin-bottom': '0.5rem' }}>
            {formatCurrency(recordedPayment()!.amount)} paid via Credit/Debit Card
          </p>
          <Show when={recordedPayment()!.balanceAfterPayment > 0}>
            <p style={{ color: '#f59e0b', 'font-weight': '600' }}>
              Remaining balance: {formatCurrency(recordedPayment()!.balanceAfterPayment)}
            </p>
          </Show>
          <Show when={recordedPayment()!.balanceAfterPayment <= 0}>
            <p style={{ color: '#22c55e', 'font-weight': '600' }}>
              Paid in Full
            </p>
          </Show>

          <div style={{ display: 'flex', gap: '0.75rem', 'justify-content': 'center', 'margin-top': '2rem', 'flex-wrap': 'wrap' }}>
            <Show when={pendingInfo()}>
              <button
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#1a73e8',
                  color: 'white',
                  border: 'none',
                  'border-radius': 'var(--border-radius-md, 8px)',
                  'font-weight': '600',
                  cursor: 'pointer',
                }}
                onClick={() => navigate(`/tax-client/${pendingInfo()!.clientId}`)}
              >
                Return to Client
              </button>
            </Show>
            <button
              style={{
                padding: '0.75rem 1.5rem',
                background: 'var(--surface-color, #fff)',
                color: 'var(--text-primary, #1f2937)',
                border: '1px solid var(--border-color, #e5e7eb)',
                'border-radius': 'var(--border-radius-md, 8px)',
                'font-weight': '600',
                cursor: 'pointer',
              }}
              onClick={() => navigate('/tax-clients')}
            >
              Back to Client List
            </button>
          </div>
        </div>
      </Show>

      {/* Error */}
      <Show when={state() === 'error'}>
        <div style={{ padding: '2rem 0' }}>
          <div style={{
            width: '64px',
            height: '64px',
            'border-radius': '50%',
            background: '#ef4444',
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'center',
            margin: '0 auto 1.5rem',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>
          <h3 style={{ 'font-size': '1.25rem', 'font-weight': '700', color: '#ef4444', 'margin-bottom': '0.75rem' }}>
            Payment Error
          </h3>
          <p style={{ color: 'var(--text-secondary, #6b7280)', 'margin-bottom': '1.5rem', 'font-size': '0.875rem' }}>
            {errorMessage()}
          </p>
          <button
            style={{
              padding: '0.75rem 1.5rem',
              background: '#1a73e8',
              color: 'white',
              border: 'none',
              'border-radius': 'var(--border-radius-md, 8px)',
              'font-weight': '600',
              cursor: 'pointer',
            }}
            onClick={() => navigate('/tax-clients')}
          >
            Return to Client List
          </button>
        </div>
      </Show>
    </div>
  );
};

export default StripeReturnHandler;
