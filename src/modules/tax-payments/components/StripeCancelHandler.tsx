/**
 * Stripe Cancel Handler
 * Handles the redirect back from Stripe when payment is cancelled
 */

import { Component, onMount, createSignal } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { stripeService } from '../services/stripeService';
import type { PendingStripePayment } from '../types/paymentTypes';

const StripeCancelHandler: Component = () => {
  const navigate = useNavigate();
  const [pendingInfo, setPendingInfo] = createSignal<PendingStripePayment | null>(null);

  onMount(() => {
    // Clear pending payment from sessionStorage
    const pending = stripeService.retrievePendingPayment();
    if (pending) {
      setPendingInfo(pending);
    }
  });

  const containerStyle = {
    'max-width': '500px',
    margin: '2rem auto',
    padding: '2rem',
    background: 'var(--surface-color, #fff)',
    'border-radius': 'var(--border-radius-md, 8px)',
    border: '1px solid var(--border-color, #e5e7eb)',
    'text-align': 'center' as const,
  };

  return (
    <div style={containerStyle}>
      <div style={{ padding: '2rem 0' }}>
        <div style={{
          width: '64px',
          height: '64px',
          'border-radius': '50%',
          background: '#f59e0b',
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
        <h3 style={{ 'font-size': '1.25rem', 'font-weight': '700', color: 'var(--text-primary, #1f2937)', 'margin-bottom': '0.5rem' }}>
          Payment Cancelled
        </h3>
        <p style={{ color: 'var(--text-secondary, #6b7280)', 'margin-bottom': '1.5rem' }}>
          Your card was not charged. You can try again or choose a different payment method.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', 'justify-content': 'center', 'flex-wrap': 'wrap' }}>
          {pendingInfo() ? (
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
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
};

export default StripeCancelHandler;
