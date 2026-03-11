/**
 * Status Section Component
 * Manage payment status and workflow status for tax clients
 */

import { Component, createSignal, For, Show } from 'solid-js';
import { Button, FormInput } from '../../../ui';
import type { TaxPortal, TaxPaymentStatus, TaxWorkflowStatus, DrakeTaxDocument } from '../../types/drakeTypes';
import type { FeeEstimate, PaymentRecord } from '../../../tax-payments/types/paymentTypes';
import FeeEstimator from '../../../tax-payments/components/FeeEstimator';
import PaymentCollector from '../../../tax-payments/components/PaymentCollector';
import ReceiptGenerator from '../../../tax-payments/components/ReceiptGenerator';
import {
  TAX_PAYMENT_STATUS_LABELS,
  TAX_PAYMENT_STATUS_COLORS,
  TAX_WORKFLOW_STATUS_LABELS,
  TAX_WORKFLOW_STATUS_COLORS
} from '../../types/drakeTypes';
import { createAutoTriggerHelper } from '../../../communications/hooks/useAutoTriggers';
import MessageHistoryPanel from '../../../communications/components/MessageHistoryPanel';

interface StatusSectionProps {
  client: TaxPortal;
  onClientChange: (updates: Partial<TaxPortal>) => void;
  onSave: () => Promise<void>;
  isSaving?: boolean;
  documents?: DrakeTaxDocument[];
  feeEstimate?: FeeEstimate | null;
  isReturningClient?: boolean;
}

// Payment methods for dropdown
const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Credit/Debit Card' },
  { value: 'check', label: 'Check' },
  { value: 'transfer', label: 'Bank Transfer' },
  { value: 'other', label: 'Other' }
];

// Main workflow status order for progression
const WORKFLOW_STATUS_ORDER: TaxWorkflowStatus[] = [
  'intake',
  'collecting_docs',
  'docs_complete',
  'in_review',
  'ready_to_file',
  'filed',
  'accepted',
  'completed'
];

// Special statuses (not part of main workflow)
const SPECIAL_STATUSES: TaxWorkflowStatus[] = [
  'hold',
  'waiting_client',
  'cancelled',
  'test'
];

const StatusSection: Component<StatusSectionProps> = (props) => {
  const [activeTab, setActiveTab] = createSignal<'payment' | 'workflow' | 'messages'>('workflow');
  const [hasChanges, setHasChanges] = createSignal(false);
  const [lastPayment, setLastPayment] = createSignal<PaymentRecord | null>(null);
  const [showReceipt, setShowReceipt] = createSignal(false);

  // Auto-trigger helper
  const triggerHelper = createAutoTriggerHelper();

  // Handle field changes with auto-trigger evaluation
  const handleChange = (updates: Partial<TaxPortal>) => {
    props.onClientChange(updates);
    setHasChanges(true);

    // Evaluate status_change trigger when workflow status changes
    if (updates.workflowStatus && updates.workflowStatus !== props.client.workflowStatus) {
      triggerHelper.evaluateEvent('status_change', { ...props.client, ...updates }, {
        newStatus: updates.workflowStatus,
      });
    }
  };

  // Handle save
  const handleSave = async () => {
    await props.onSave();
    setHasChanges(false);
  };

  // Calculate payment progress
  const paymentProgress = () => {
    const total = props.client.paymentAmount || 0;
    const paid = props.client.paymentPaidAmount || 0;
    if (total === 0) return 0;
    return Math.min(100, Math.round((paid / total) * 100));
  };

  // Get current workflow step index
  const currentWorkflowIndex = () => {
    const status = props.client.workflowStatus || 'intake';
    return WORKFLOW_STATUS_ORDER.indexOf(status);
  };

  // Format date for display
  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleDateString();
  };

  // Format currency
  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  // Styles
  const containerStyle = {
    padding: '1rem'
  };

  const tabsStyle = {
    display: 'flex',
    gap: '0.5rem',
    'margin-bottom': '1.5rem',
    'border-bottom': '2px solid var(--border-color)',
    'padding-bottom': '0.5rem'
  };

  const tabStyle = (isActive: boolean) => ({
    padding: '0.75rem 1.5rem',
    border: 'none',
    background: isActive ? 'var(--primary-color)' : 'transparent',
    color: isActive ? 'white' : 'var(--text-primary)',
    'border-radius': 'var(--border-radius-md)',
    cursor: 'pointer',
    'font-weight': '600',
    'font-size': '0.875rem',
    transition: 'all 0.2s'
  });

  const sectionStyle = {
    background: 'var(--background-color)',
    'border-radius': 'var(--border-radius-md)',
    padding: '1.5rem',
    'margin-bottom': '1rem'
  };

  const sectionTitleStyle = {
    'font-size': '1.125rem',
    'font-weight': '600',
    'margin-bottom': '1rem',
    color: 'var(--text-primary)',
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem'
  };

  const gridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem'
  };

  const statusButtonsStyle = {
    display: 'flex',
    'flex-wrap': 'wrap',
    gap: '0.5rem',
    'margin-top': '0.5rem'
  };

  const statusButtonStyle = (status: TaxPaymentStatus | TaxWorkflowStatus, isActive: boolean, colors: Record<string, string>) => ({
    padding: '0.5rem 1rem',
    border: `2px solid ${colors[status]}`,
    'border-radius': 'var(--border-radius-md)',
    background: isActive ? colors[status] : 'transparent',
    color: isActive ? 'white' : colors[status],
    cursor: 'pointer',
    'font-weight': '500',
    'font-size': '0.875rem',
    transition: 'all 0.2s'
  });

  const progressBarContainerStyle = {
    width: '100%',
    height: '8px',
    background: 'var(--border-color)',
    'border-radius': '4px',
    overflow: 'hidden',
    'margin-top': '0.5rem'
  };

  const progressBarStyle = (progress: number, color: string) => ({
    width: `${progress}%`,
    height: '100%',
    background: color,
    transition: 'width 0.3s ease'
  });

  const workflowTimelineStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    gap: '0.5rem',
    'margin-top': '1rem'
  };

  const workflowStepStyle = (isActive: boolean, isPast: boolean, color: string) => ({
    display: 'flex',
    'align-items': 'center',
    gap: '0.75rem',
    padding: '0.75rem',
    background: isActive ? `${color}15` : 'transparent',
    'border-radius': 'var(--border-radius-md)',
    border: isActive ? `2px solid ${color}` : '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.2s'
  });

  const stepDotStyle = (isActive: boolean, isPast: boolean, color: string) => ({
    width: '24px',
    height: '24px',
    'min-width': '24px',
    'border-radius': '50%',
    background: isPast || isActive ? color : 'var(--border-color)',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    color: 'white',
    'font-size': '0.75rem',
    'font-weight': '600'
  });

  const stepLabelStyle = (isActive: boolean, isPast: boolean) => ({
    'font-weight': isActive ? '600' : '400',
    color: isActive ? 'var(--text-primary)' : isPast ? 'var(--text-secondary)' : 'var(--text-muted)',
    flex: 1
  });

  const actionsStyle = {
    display: 'flex',
    'justify-content': 'flex-end',
    gap: '1rem',
    'margin-top': '1.5rem',
    'padding-top': '1rem',
    'border-top': '1px solid var(--border-color)'
  };

  const infoRowStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '0.5rem 0',
    'border-bottom': '1px solid var(--border-color)'
  };

  const labelStyle = {
    'font-weight': '500',
    color: 'var(--text-secondary)',
    'font-size': '0.875rem'
  };

  const valueStyle = {
    'font-weight': '600',
    color: 'var(--text-primary)'
  };

  return (
    <div style={containerStyle}>
      {/* Auto-Trigger Preview Banner */}
      <Show when={triggerHelper.pendingTrigger()}>
        <div style={{
          display: 'flex',
          'align-items': 'flex-start',
          gap: '0.75rem',
          padding: '0.75rem 1rem',
          background: '#eff6ff',
          border: '1px solid #93c5fd',
          'border-radius': 'var(--border-radius-md)',
          'margin-bottom': '1rem',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style={{ 'flex-shrink': '0', 'margin-top': '2px' }}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <div style={{ flex: '1', 'min-width': '0' }}>
            <div style={{ 'font-weight': '600', 'font-size': '0.8125rem', color: '#1e40af', 'margin-bottom': '0.25rem' }}>
              Auto-Message: {triggerHelper.pendingTrigger()!.templateName}
            </div>
            <div style={{
              'font-size': '0.8125rem',
              color: '#334155',
              'line-height': '1.4',
              'white-space': 'pre-wrap',
              display: '-webkit-box',
              '-webkit-line-clamp': '3',
              '-webkit-box-orient': 'vertical',
              overflow: 'hidden',
            }}>
              {triggerHelper.pendingTrigger()!.previewBody}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', 'flex-shrink': '0' }}>
            <button
              onClick={() => triggerHelper.executePending()}
              disabled={triggerHelper.isSending()}
              style={{
                padding: '0.375rem 0.75rem',
                'border-radius': 'var(--border-radius-md)',
                border: 'none',
                background: '#2563eb',
                color: 'white',
                'font-size': '0.75rem',
                'font-weight': '600',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {triggerHelper.isSending() ? 'Sending...' : 'Send'}
            </button>
            <button
              onClick={() => triggerHelper.dismissPending()}
              style={{
                padding: '0.375rem 0.75rem',
                'border-radius': 'var(--border-radius-md)',
                border: '1px solid #93c5fd',
                background: 'white',
                color: '#2563eb',
                'font-size': '0.75rem',
                'font-weight': '600',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      </Show>

      {/* Tabs */}
      <div style={tabsStyle}>
        <button
          style={tabStyle(activeTab() === 'workflow')}
          onClick={() => setActiveTab('workflow')}
        >
          Workflow Status
        </button>
        <button
          style={tabStyle(activeTab() === 'payment')}
          onClick={() => setActiveTab('payment')}
        >
          Payment Status
        </button>
        <button
          style={tabStyle(activeTab() === 'messages')}
          onClick={() => setActiveTab('messages')}
        >
          Messages
        </button>
      </div>

      {/* Workflow Tab */}
      <Show when={activeTab() === 'workflow'}>
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            Tax Preparation Progress
          </div>

          {/* Current Status Display */}
          <div style={infoRowStyle}>
            <span style={labelStyle}>Current Status</span>
            <span style={{
              ...valueStyle,
              color: TAX_WORKFLOW_STATUS_COLORS[props.client.workflowStatus || 'intake'],
              display: 'flex',
              'align-items': 'center',
              gap: '0.5rem'
            }}>
              <span style={{
                width: '10px',
                height: '10px',
                'border-radius': '50%',
                background: TAX_WORKFLOW_STATUS_COLORS[props.client.workflowStatus || 'intake']
              }} />
              {TAX_WORKFLOW_STATUS_LABELS[props.client.workflowStatus || 'intake']}
            </span>
          </div>

          <Show when={props.client.workflowStatusDate}>
            <div style={infoRowStyle}>
              <span style={labelStyle}>Last Updated</span>
              <span style={valueStyle}>{formatDate(props.client.workflowStatusDate)}</span>
            </div>
          </Show>

          <Show when={props.client.filedDate}>
            <div style={infoRowStyle}>
              <span style={labelStyle}>Filed Date</span>
              <span style={valueStyle}>{formatDate(props.client.filedDate)}</span>
            </div>
          </Show>

          <Show when={props.client.acceptedDate}>
            <div style={infoRowStyle}>
              <span style={labelStyle}>Accepted Date</span>
              <span style={valueStyle}>{formatDate(props.client.acceptedDate)}</span>
            </div>
          </Show>

          <Show when={props.client.rejectedReason}>
            <div style={{ ...infoRowStyle, 'flex-direction': 'column', 'align-items': 'flex-start', gap: '0.5rem' }}>
              <span style={labelStyle}>Rejection Reason</span>
              <span style={{ ...valueStyle, color: '#ef4444' }}>{props.client.rejectedReason}</span>
            </div>
          </Show>

          {/* Timeline */}
          <div style={{ 'margin-top': '1.5rem' }}>
            <label style={{ 'font-weight': '500', 'margin-bottom': '0.5rem', display: 'block' }}>
              Update Status
            </label>
            <div style={workflowTimelineStyle}>
              <For each={WORKFLOW_STATUS_ORDER}>
                {(status, index) => {
                  const isActive = props.client.workflowStatus === status;
                  const isPast = index() < currentWorkflowIndex();
                  const color = TAX_WORKFLOW_STATUS_COLORS[status];

                  return (
                    <div
                      style={workflowStepStyle(isActive, isPast, color)}
                      onClick={() => handleChange({
                        workflowStatus: status,
                        workflowStatusDate: Date.now()
                      })}
                    >
                      <div style={stepDotStyle(isActive, isPast, color)}>
                        {isPast ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          index() + 1
                        )}
                      </div>
                      <span style={stepLabelStyle(isActive, isPast)}>
                        {TAX_WORKFLOW_STATUS_LABELS[status]}
                      </span>
                      <Show when={isActive}>
                        <span style={{
                          background: color,
                          color: 'white',
                          padding: '0.25rem 0.5rem',
                          'border-radius': '9999px',
                          'font-size': '0.75rem',
                          'font-weight': '600'
                        }}>
                          Current
                        </span>
                      </Show>
                    </div>
                  );
                }}
              </For>

              {/* Rejected status (special case) */}
              <div
                style={workflowStepStyle(
                  props.client.workflowStatus === 'rejected',
                  false,
                  TAX_WORKFLOW_STATUS_COLORS.rejected
                )}
                onClick={() => handleChange({
                  workflowStatus: 'rejected',
                  workflowStatusDate: Date.now()
                })}
              >
                <div style={stepDotStyle(
                  props.client.workflowStatus === 'rejected',
                  false,
                  TAX_WORKFLOW_STATUS_COLORS.rejected
                )}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <span style={stepLabelStyle(props.client.workflowStatus === 'rejected', false)}>
                  {TAX_WORKFLOW_STATUS_LABELS.rejected}
                </span>
                <Show when={props.client.workflowStatus === 'rejected'}>
                  <span style={{
                    background: TAX_WORKFLOW_STATUS_COLORS.rejected,
                    color: 'white',
                    padding: '0.25rem 0.5rem',
                    'border-radius': '9999px',
                    'font-size': '0.75rem',
                    'font-weight': '600'
                  }}>
                    Current
                  </span>
                </Show>
              </div>

              {/* Special Statuses Section */}
              <div style={{
                'margin-top': '1rem',
                'padding-top': '1rem',
                'border-top': '1px dashed var(--border-color)'
              }}>
                <label style={{
                  'font-size': '0.75rem',
                  color: 'var(--text-secondary)',
                  'margin-bottom': '0.5rem',
                  display: 'block',
                  'text-transform': 'uppercase',
                  'letter-spacing': '0.05em'
                }}>
                  Special Statuses
                </label>
                <div style={{ display: 'flex', 'flex-wrap': 'wrap', gap: '0.5rem' }}>
                  <For each={SPECIAL_STATUSES}>
                    {(status) => {
                      const isActive = props.client.workflowStatus === status;
                      const color = TAX_WORKFLOW_STATUS_COLORS[status];
                      return (
                        <button
                          style={{
                            padding: '0.5rem 1rem',
                            border: `2px solid ${color}`,
                            'border-radius': 'var(--border-radius-md)',
                            background: isActive ? color : 'transparent',
                            color: isActive ? 'white' : color,
                            cursor: 'pointer',
                            'font-weight': '500',
                            'font-size': '0.875rem',
                            transition: 'all 0.2s',
                            display: 'flex',
                            'align-items': 'center',
                            gap: '0.5rem'
                          }}
                          onClick={() => handleChange({
                            workflowStatus: status,
                            workflowStatusDate: Date.now()
                          })}
                        >
                          {status === 'hold' && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <rect x="6" y="4" width="4" height="16" rx="1" />
                              <rect x="14" y="4" width="4" height="16" rx="1" />
                            </svg>
                          )}
                          {status === 'waiting_client' && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12 6 12 12 16 14" />
                            </svg>
                          )}
                          {status === 'cancelled' && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <circle cx="12" cy="12" r="10" />
                              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                            </svg>
                          )}
                          {status === 'test' && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
                            </svg>
                          )}
                          {TAX_WORKFLOW_STATUS_LABELS[status]}
                        </button>
                      );
                    }}
                  </For>
                </div>
              </div>
            </div>
          </div>

          {/* Rejection reason input */}
          <Show when={props.client.workflowStatus === 'rejected'}>
            <div style={{ 'margin-top': '1rem' }}>
              <FormInput
                label="Rejection Reason"
                value={props.client.rejectedReason || ''}
                onChange={(value) => handleChange({ rejectedReason: value })}
                placeholder="Enter reason for rejection..."
              />
            </div>
          </Show>
        </div>
      </Show>

      {/* Payment Tab */}
      <Show when={activeTab() === 'payment'}>
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
            Payment Information
          </div>

          {/* Fee Estimator - shows when documents are available */}
          <Show when={props.documents && props.documents.length > 0}>
            <div style={{ 'margin-bottom': '1.5rem' }}>
              <FeeEstimator
                client={props.client}
                documents={props.documents!}
                isReturningClient={props.isReturningClient}
                onFeeCalculated={(estimate) => {
                  handleChange({ paymentAmount: estimate.total });
                }}
              />
            </div>
          </Show>

          {/* Payment Status Buttons */}
          <div>
            <label style={{ 'font-weight': '500', 'margin-bottom': '0.5rem', display: 'block' }}>
              Payment Status
            </label>
            <div style={statusButtonsStyle}>
              <For each={Object.keys(TAX_PAYMENT_STATUS_LABELS) as TaxPaymentStatus[]}>
                {(status) => (
                  <button
                    style={statusButtonStyle(
                      status,
                      props.client.paymentStatus === status,
                      TAX_PAYMENT_STATUS_COLORS
                    )}
                    onClick={() => handleChange({ paymentStatus: status })}
                  >
                    {TAX_PAYMENT_STATUS_LABELS[status]}
                  </button>
                )}
              </For>
            </div>
          </div>

          {/* Payment Amount Fields */}
          <div style={{ ...gridStyle, 'margin-top': '1.5rem' }}>
            <FormInput
              label="Total Fee Amount"
              type="number"
              value={props.client.paymentAmount?.toString() || ''}
              onChange={(value) => handleChange({ paymentAmount: value ? parseFloat(value) : undefined })}
              placeholder="0.00"
            />
            <FormInput
              label="Amount Paid"
              type="number"
              value={props.client.paymentPaidAmount?.toString() || ''}
              onChange={(value) => handleChange({ paymentPaidAmount: value ? parseFloat(value) : undefined })}
              placeholder="0.00"
            />
          </div>

          {/* Payment Progress */}
          <Show when={props.client.paymentAmount && props.client.paymentAmount > 0}>
            <div style={{ 'margin-top': '1rem' }}>
              <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.25rem' }}>
                <span style={labelStyle}>Payment Progress</span>
                <span style={valueStyle}>{paymentProgress()}%</span>
              </div>
              <div style={progressBarContainerStyle}>
                <div style={progressBarStyle(
                  paymentProgress(),
                  paymentProgress() >= 100 ? '#22c55e' : '#3b82f6'
                )} />
              </div>
              <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-top': '0.5rem' }}>
                <span style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                  {formatCurrency(props.client.paymentPaidAmount || 0)} paid
                </span>
                <span style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                  {formatCurrency((props.client.paymentAmount || 0) - (props.client.paymentPaidAmount || 0))} remaining
                </span>
              </div>
            </div>
          </Show>

          {/* Payment Method and Date */}
          <div style={{ ...gridStyle, 'margin-top': '1rem' }}>
            <div>
              <label style={{ 'font-weight': '500', 'margin-bottom': '0.5rem', display: 'block' }}>
                Payment Method
              </label>
              <select
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--border-color)',
                  'border-radius': 'var(--border-radius-md)',
                  background: 'var(--surface-color)',
                  color: 'var(--text-primary)',
                  'font-size': '0.875rem'
                }}
                value={props.client.paymentMethod || ''}
                onChange={(e) => handleChange({ paymentMethod: e.target.value as TaxPortal['paymentMethod'] })}
              >
                <option value="">Select method...</option>
                <For each={PAYMENT_METHODS}>
                  {(method) => (
                    <option value={method.value}>{method.label}</option>
                  )}
                </For>
              </select>
            </div>
            <FormInput
              label="Payment Date"
              type="date"
              value={props.client.paymentDate ? new Date(props.client.paymentDate).toISOString().split('T')[0] : ''}
              onChange={(value) => handleChange({ paymentDate: value ? new Date(value).getTime() : undefined })}
            />
          </div>

          {/* Payment Notes */}
          <div style={{ 'margin-top': '1rem' }}>
            <label style={{ 'font-weight': '500', 'margin-bottom': '0.5rem', display: 'block' }}>
              Payment Notes
            </label>
            <textarea
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--border-color)',
                'border-radius': 'var(--border-radius-md)',
                background: 'var(--surface-color)',
                color: 'var(--text-primary)',
                'font-size': '0.875rem',
                'min-height': '80px',
                resize: 'vertical'
              }}
              value={props.client.paymentNotes || ''}
              onInput={(e) => handleChange({ paymentNotes: e.currentTarget.value })}
              placeholder="Add notes about payment..."
            />
          </div>

          {/* Payment Collector */}
          <Show when={props.client.paymentAmount && props.client.paymentAmount > 0}>
            <div style={{ 'margin-top': '1.5rem', 'padding-top': '1rem', 'border-top': '1px solid var(--border-color)' }}>
              <PaymentCollector
                client={props.client}
                amountDue={(props.client.paymentAmount || 0) - (props.client.paymentPaidAmount || 0)}
                totalFee={props.client.paymentAmount || 0}
                previouslyPaid={props.client.paymentPaidAmount || 0}
                onPaymentRecorded={(payment) => {
                  setLastPayment(payment);
                  setShowReceipt(true);
                  const newPaid = (props.client.paymentPaidAmount || 0) + payment.amount;
                  const isPaidInFull = newPaid >= (props.client.paymentAmount || 0);
                  handleChange({
                    paymentPaidAmount: newPaid,
                    paymentStatus: isPaidInFull ? 'paid' : 'partial',
                    paymentDate: payment.timestamp,
                    paymentMethod: payment.method as any,
                  });

                  // Evaluate payment trigger
                  if (isPaidInFull) {
                    triggerHelper.evaluateEvent('status_change', { ...props.client, paymentStatus: 'paid' }, {
                      newStatus: props.client.workflowStatus,
                    });
                  } else {
                    triggerHelper.evaluateEvent('payment_due', { ...props.client, paymentStatus: 'partial' });
                  }
                }}
              />
            </div>
          </Show>

          {/* Receipt Modal */}
          <Show when={showReceipt() && lastPayment()}>
            <ReceiptGenerator
              payment={lastPayment()!}
              client={props.client}
              settings={{ businessName: 'Tax Preparation Services', taxIdNumber: '' }}
              onClose={() => setShowReceipt(false)}
            />
          </Show>
        </div>
      </Show>

      {/* Messages Tab */}
      <Show when={activeTab() === 'messages'}>
        <div style={sectionStyle}>
          <MessageHistoryPanel clientId={props.client.id} />
        </div>
      </Show>

      {/* Save Actions */}
      <Show when={hasChanges()}>
        <div style={actionsStyle}>
          <Button variant="secondary" onClick={() => setHasChanges(false)}>
            Discard Changes
          </Button>
          <Button onClick={handleSave} disabled={props.isSaving}>
            {props.isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </Show>
    </div>
  );
};

export default StatusSection;
