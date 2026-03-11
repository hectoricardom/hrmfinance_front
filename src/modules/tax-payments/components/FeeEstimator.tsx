/**
 * Fee Estimator Component
 * Displays automatic fee calculation with breakdown at client intake
 */

import { Component, createSignal, createEffect, createMemo, Show, For, untrack } from 'solid-js';
import { Button } from '../../ui';
import type { TaxPortal, DrakeTaxDocument } from '../../drake-export/types/drakeTypes';
import type { FeeEstimate } from '../types/paymentTypes';
import { paymentStore } from '../stores/paymentStore';
import { formatCurrency } from '../services/paymentService';

interface FeeEstimatorProps {
  client: TaxPortal;
  documents: DrakeTaxDocument[];
  isReturningClient?: boolean;
  onFeeCalculated?: (estimate: FeeEstimate) => void;
  onOverride?: (total: number) => void;
}

const FeeEstimator: Component<FeeEstimatorProps> = (props) => {
  const [isOverriding, setIsOverriding] = createSignal(false);
  const [overrideAmount, setOverrideAmount] = createSignal('');
  const [adjustmentNote, setAdjustmentNote] = createSignal('');

  // Load settings and calculate fee on mount
  createEffect(async () => {
    if (!paymentStore.state.settingsLoaded) {
      await paymentStore.loadSettings();
    }
  });

  // Track last reported fee total to avoid infinite callback loops.
  // The callback updates the parent's client object, which would re-trigger
  // this effect if we didn't guard against it.
  let lastReportedTotal: number | null = null;

  // Recalculate when client or documents change
  createEffect(() => {
    const client = props.client;
    const docs = props.documents;
    if (client && paymentStore.state.feeSettings) {
      const estimate = paymentStore.calculateClientFee(
        client,
        docs,
        props.isReturningClient || false
      );
      if (estimate && props.onFeeCalculated && estimate.total !== lastReportedTotal) {
        lastReportedTotal = estimate.total;
        untrack(() => props.onFeeCalculated!(estimate));
      }
    }
  });

  const estimate = () => paymentStore.state.currentFeeEstimate;

  const handleOverride = () => {
    const amount = parseFloat(overrideAmount());
    if (isNaN(amount)) return;

    const currentSubtotal = estimate()?.subtotal || 0;
    const currentDiscount = estimate()?.returningClientDiscount || 0;
    const adjustment = amount - (currentSubtotal - currentDiscount);

    paymentStore.applyManualAdjustment(adjustment, adjustmentNote() || undefined);
    setIsOverriding(false);

    if (props.onOverride) {
      props.onOverride(amount);
    }
  };

  const handlePrint = () => {
    window.print();
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
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
  };

  const headerTitleStyle = {
    'font-size': '1.125rem',
    'font-weight': '600',
    margin: '0',
  };

  const bodyStyle = {
    padding: '1.5rem',
  };

  const tableStyle = {
    width: '100%',
    'border-collapse': 'collapse' as const,
    'margin-bottom': '1rem',
  };

  const thStyle = {
    'text-align': 'left' as const,
    padding: '0.75rem',
    'border-bottom': '2px solid var(--border-color, #e5e7eb)',
    'font-weight': '600',
    'font-size': '0.875rem',
    color: 'var(--text-secondary, #6b7280)',
  };

  const thRightStyle = {
    ...thStyle,
    'text-align': 'right' as const,
  };

  const tdStyle = {
    padding: '0.75rem',
    'border-bottom': '1px solid var(--border-color, #e5e7eb)',
    'font-size': '0.875rem',
    color: 'var(--text-primary, #1f2937)',
  };

  const tdRightStyle = {
    ...tdStyle,
    'text-align': 'right' as const,
    'font-weight': '500',
  };

  const tdCenterStyle = {
    ...tdStyle,
    'text-align': 'center' as const,
  };

  const summaryRowStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '0.5rem 0.75rem',
    'font-size': '0.875rem',
  };

  const totalRowStyle = {
    ...summaryRowStyle,
    'font-size': '1.25rem',
    'font-weight': '700',
    color: '#1a73e8',
    'border-top': '2px solid var(--border-color, #e5e7eb)',
    'margin-top': '0.5rem',
    'padding-top': '1rem',
  };

  const discountStyle = {
    ...summaryRowStyle,
    color: '#22c55e',
  };

  const disclaimerStyle = {
    'margin-top': '1rem',
    padding: '0.75rem',
    background: '#fef3c7',
    'border-radius': 'var(--border-radius-md, 8px)',
    'font-size': '0.8rem',
    color: '#92400e',
    'font-style': 'italic',
  };

  const actionsStyle = {
    display: 'flex',
    gap: '0.75rem',
    'margin-top': '1rem',
    'flex-wrap': 'wrap' as const,
  };

  const overrideContainerStyle = {
    'margin-top': '1rem',
    padding: '1rem',
    background: 'var(--background-color, #f9fafb)',
    'border-radius': 'var(--border-radius-md, 8px)',
    border: '1px solid var(--border-color, #e5e7eb)',
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid var(--border-color, #e5e7eb)',
    'border-radius': 'var(--border-radius-md, 8px)',
    'font-size': '0.875rem',
    'margin-top': '0.5rem',
    'box-sizing': 'border-box' as const,
    background: 'var(--surface-color, #fff)',
    color: 'var(--text-primary, #1f2937)',
  };

  const labelStyle = {
    'font-weight': '500',
    'font-size': '0.875rem',
    color: 'var(--text-secondary, #6b7280)',
    display: 'block',
  };

  const minimumBadgeStyle = {
    display: 'inline-block',
    padding: '0.25rem 0.5rem',
    background: '#f59e0b',
    color: 'white',
    'border-radius': '9999px',
    'font-size': '0.7rem',
    'font-weight': '600',
    'margin-left': '0.5rem',
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h3 style={headerTitleStyle}>Fee Estimate</h3>
        <Show when={estimate()}>
          <span style={{ 'font-size': '1.5rem', 'font-weight': '700' }}>
            {formatCurrency(estimate()!.total)}
          </span>
        </Show>
      </div>

      {/* Body */}
      <div style={bodyStyle}>
        <Show when={paymentStore.state.isLoading}>
          <div style={{ 'text-align': 'center', padding: '2rem', color: 'var(--text-secondary, #6b7280)' }}>
            Calculating fee...
          </div>
        </Show>

        <Show when={paymentStore.state.error}>
          <div style={{ padding: '1rem', background: '#fef2f2', color: '#ef4444', 'border-radius': 'var(--border-radius-md, 8px)', 'margin-bottom': '1rem' }}>
            {paymentStore.state.error}
          </div>
        </Show>

        <Show when={estimate()}>
          {/* Client Info */}
          <div style={{ 'margin-bottom': '1rem', 'font-size': '0.875rem', color: 'var(--text-secondary, #6b7280)' }}>
            <strong>{estimate()!.clientName}</strong> - Tax Year {estimate()!.taxYear}
            <Show when={estimate()!.isReturningClient}>
              <span style={{
                'margin-left': '0.75rem',
                padding: '0.25rem 0.5rem',
                background: '#dbeafe',
                color: '#1a73e8',
                'border-radius': '9999px',
                'font-size': '0.75rem',
                'font-weight': '600',
              }}>
                Returning Client
              </span>
            </Show>
          </div>

          {/* Breakdown Table */}
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Item</th>
                <th style={{ ...thStyle, 'text-align': 'center' }}>Qty</th>
                <th style={thRightStyle}>Rate</th>
                <th style={thRightStyle}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              <For each={estimate()!.lineItems}>
                {(item) => (
                  <tr>
                    <td style={tdStyle}>{item.description}</td>
                    <td style={tdCenterStyle}>{item.quantity}</td>
                    <td style={tdRightStyle}>{formatCurrency(item.unitPrice)}</td>
                    <td style={tdRightStyle}>{formatCurrency(item.subtotal)}</td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>

          {/* Summary */}
          <div>
            <div style={summaryRowStyle}>
              <span>Subtotal</span>
              <span style={{ 'font-weight': '600' }}>{formatCurrency(estimate()!.subtotal)}</span>
            </div>

            <Show when={estimate()!.returningClientDiscount > 0}>
              <div style={discountStyle}>
                <span>Returning Client Discount ({estimate()!.returningClientDiscountPercent}%)</span>
                <span style={{ 'font-weight': '600' }}>-{formatCurrency(estimate()!.returningClientDiscount)}</span>
              </div>
            </Show>

            <Show when={estimate()!.manualAdjustment !== 0}>
              <div style={{
                ...summaryRowStyle,
                color: estimate()!.manualAdjustment > 0 ? '#ef4444' : '#22c55e',
              }}>
                <span>
                  Manual Adjustment
                  <Show when={estimate()!.manualAdjustmentNote}>
                    <span style={{ 'font-style': 'italic', 'margin-left': '0.5rem', 'font-size': '0.8rem' }}>
                      ({estimate()!.manualAdjustmentNote})
                    </span>
                  </Show>
                </span>
                <span style={{ 'font-weight': '600' }}>
                  {estimate()!.manualAdjustment > 0 ? '+' : ''}{formatCurrency(estimate()!.manualAdjustment)}
                </span>
              </div>
            </Show>

            <div style={totalRowStyle}>
              <span>
                Total
                <Show when={estimate()!.minimumFeeApplied}>
                  <span style={minimumBadgeStyle}>Minimum Fee Applied</span>
                </Show>
              </span>
              <span>{formatCurrency(estimate()!.total)}</span>
            </div>
          </div>

          {/* Disclaimer */}
          <div style={disclaimerStyle}>
            This is an estimate based on the documents provided. The final fee may vary based on additional
            forms or complexity discovered during preparation.
          </div>

          {/* Override Section */}
          <Show when={isOverriding()}>
            <div style={overrideContainerStyle}>
              <label style={labelStyle}>Override Total Fee</label>
              <input
                type="number"
                style={inputStyle}
                placeholder="Enter custom fee amount"
                value={overrideAmount()}
                onInput={(e) => setOverrideAmount(e.currentTarget.value)}
                min="0"
                step="0.01"
              />
              <div style={{ 'margin-top': '0.75rem' }}>
                <label style={labelStyle}>Adjustment Note (optional)</label>
                <input
                  type="text"
                  style={inputStyle}
                  placeholder="Reason for fee adjustment..."
                  value={adjustmentNote()}
                  onInput={(e) => setAdjustmentNote(e.currentTarget.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', 'margin-top': '1rem' }}>
                <Button onClick={handleOverride}>
                  Apply Override
                </Button>
                <Button variant="secondary" onClick={() => setIsOverriding(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </Show>

          {/* Actions */}
          <div style={actionsStyle}>
            <Show when={!isOverriding()}>
              <Button variant="secondary" onClick={() => {
                setOverrideAmount(estimate()!.total.toString());
                setIsOverriding(true);
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style={{ 'margin-right': '0.5rem' }}>
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit Fee
              </Button>
            </Show>
            <Button variant="secondary" onClick={handlePrint}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style={{ 'margin-right': '0.5rem' }}>
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Print Estimate
            </Button>
          </div>
        </Show>
      </div>
    </div>
  );
};

export default FeeEstimator;
