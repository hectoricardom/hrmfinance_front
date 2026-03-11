/**
 * QueueClientCard Component
 * Compact horizontal client card with priority, status, document progress, and action buttons
 */

import { Component, Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { Button } from '../../ui';
import type { QueueItem } from '../types/smartQueueTypes';
import { AGING_COLOR_HEX, getAgingColor } from '../types/smartQueueTypes';
import {
  TAX_WORKFLOW_STATUS_LABELS,
  TAX_WORKFLOW_STATUS_COLORS,
  TAX_PAYMENT_STATUS_LABELS,
  TAX_PAYMENT_STATUS_COLORS,
} from '../../drake-export/types/drakeTypes';

interface QueueClientCardProps {
  item: QueueItem;
  selected?: boolean;
  showCheckbox?: boolean;
  onToggleSelect?: (id: string) => void;
  onFlag?: (id: string) => void;
  onSkip?: (id: string) => void;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDaysAgo = (days: number): string => {
  if (days === 0) return 'Today';
  if (days === 1) return '1 day';
  return `${days} days`;
};

const QueueClientCard: Component<QueueClientCardProps> = (props) => {
  const navigate = useNavigate();

  const workflowLabel = () =>
    props.item.workflowStatus
      ? TAX_WORKFLOW_STATUS_LABELS[props.item.workflowStatus]
      : 'Unknown';

  const workflowColor = () =>
    props.item.workflowStatus
      ? TAX_WORKFLOW_STATUS_COLORS[props.item.workflowStatus]
      : '#6b7280';

  const paymentLabel = () =>
    props.item.paymentStatus
      ? TAX_PAYMENT_STATUS_LABELS[props.item.paymentStatus]
      : '';

  const paymentColor = () =>
    props.item.paymentStatus
      ? TAX_PAYMENT_STATUS_COLORS[props.item.paymentStatus]
      : '#6b7280';

  const agingColor = () => AGING_COLOR_HEX[getAgingColor(props.item.daysInCurrentStage)];

  const priorityColor = () => {
    const score = props.item.priority.composite;
    if (score >= 75) return '#ef4444';
    if (score >= 50) return '#f59e0b';
    if (score >= 25) return '#1a73e8';
    return '#22c55e';
  };

  // Compute the best section to open based on client state
  const getBestSection = (): string => {
    const ws = props.item.workflowStatus;
    const ps = props.item.paymentStatus;
    if (ps === 'pending' || ps === 'partial') return '?section=status';
    if (ws === 'intake' || ws === 'collecting_docs') return '?section=docs';
    if (ws === 'docs_complete' || ws === 'in_review') return '?section=tax';
    return '';
  };

  const handleProcess = () => {
    navigate(`/tax-client/${props.item.id}${getBestSection()}`);
  };

  const handleCall = () => {
    if (props.item.phone) {
      window.open(`tel:${props.item.phone}`, '_self');
    }
  };

  const handleMessage = () => {
    if (props.item.phone) {
      window.open(`sms:${props.item.phone}`, '_self');
    }
  };

  return (
    <div style={{
      display: 'flex',
      'align-items': 'center',
      gap: '12px',
      padding: '12px 16px',
      background: props.selected ? '#eff6ff' : '#ffffff',
      border: `1px solid ${props.selected ? '#1a73e8' : '#e2e8f0'}`,
      'border-radius': '8px',
      transition: 'all 0.15s ease',
      cursor: 'pointer',
    }}
    onMouseEnter={(e) => {
      if (!props.selected) {
        e.currentTarget.style.borderColor = '#cbd5e1';
        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
      }
    }}
    onMouseLeave={(e) => {
      if (!props.selected) {
        e.currentTarget.style.borderColor = '#e2e8f0';
        e.currentTarget.style.boxShadow = 'none';
      }
    }}
    >
      {/* Checkbox for batch selection */}
      <Show when={props.showCheckbox}>
        <input
          type="checkbox"
          checked={props.selected || false}
          onChange={() => props.onToggleSelect?.(props.item.id)}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '18px',
            height: '18px',
            cursor: 'pointer',
            'accent-color': '#1a73e8',
            'flex-shrink': '0',
          }}
        />
      </Show>

      {/* Priority indicator */}
      <div style={{
        display: 'flex',
        'flex-direction': 'column',
        'align-items': 'center',
        'min-width': '36px',
        'flex-shrink': '0',
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          'border-radius': '50%',
          background: priorityColor(),
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          color: '#ffffff',
          'font-size': '12px',
          'font-weight': '700',
        }}>
          {props.item.priority.composite}
        </div>
      </div>

      {/* Client name and filing status */}
      <div style={{
        'min-width': '140px',
        'max-width': '180px',
        'flex-shrink': '0',
      }}>
        <div style={{
          'font-size': '14px',
          'font-weight': '600',
          color: '#1e293b',
          'white-space': 'nowrap',
          overflow: 'hidden',
          'text-overflow': 'ellipsis',
        }}>
          {props.item.firstName} {props.item.lastName}
        </div>
        <Show when={props.item.filingStatus}>
          <div style={{
            'font-size': '11px',
            color: '#94a3b8',
            'white-space': 'nowrap',
          }}>
            {props.item.filingStatus?.replace(/_/g, ' ')}
          </div>
        </Show>
      </div>

      {/* Workflow status badge */}
      <div style={{
        display: 'inline-flex',
        'align-items': 'center',
        gap: '4px',
        padding: '3px 10px',
        'border-radius': '12px',
        background: `${workflowColor()}15`,
        border: `1px solid ${workflowColor()}30`,
        'font-size': '11px',
        'font-weight': '500',
        color: workflowColor(),
        'white-space': 'nowrap',
        'flex-shrink': '0',
      }}>
        <div style={{
          width: '6px',
          height: '6px',
          'border-radius': '50%',
          background: workflowColor(),
        }} />
        {workflowLabel()}
      </div>

      {/* Document completeness bar */}
      <div style={{
        display: 'flex',
        'flex-direction': 'column',
        gap: '2px',
        'min-width': '100px',
        flex: '1',
        'max-width': '150px',
      }}>
        <div style={{
          display: 'flex',
          'justify-content': 'space-between',
          'font-size': '11px',
          color: '#64748b',
        }}>
          <span>Docs</span>
          <span>{props.item.totalDocumentsReceived}/{props.item.totalDocumentsRequired}</span>
        </div>
        <div style={{
          height: '6px',
          background: '#e2e8f0',
          'border-radius': '3px',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${props.item.documentCompletionPercent}%`,
            background: props.item.documentCompletionPercent === 100 ? '#22c55e'
              : props.item.documentCompletionPercent >= 80 ? '#1a73e8'
              : props.item.documentCompletionPercent >= 50 ? '#f59e0b'
              : '#ef4444',
            'border-radius': '3px',
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>

      {/* Time in stage */}
      <div style={{
        display: 'flex',
        'align-items': 'center',
        gap: '4px',
        'min-width': '70px',
        'flex-shrink': '0',
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          'border-radius': '50%',
          background: agingColor(),
          'flex-shrink': '0',
        }} />
        <span style={{
          'font-size': '12px',
          color: agingColor(),
          'font-weight': '500',
          'white-space': 'nowrap',
        }}>
          {formatDaysAgo(props.item.daysInCurrentStage)}
        </span>
      </div>

      {/* Payment status */}
      <Show when={props.item.paymentStatus}>
        <div style={{
          display: 'inline-flex',
          'align-items': 'center',
          padding: '2px 8px',
          'border-radius': '10px',
          background: `${paymentColor()}15`,
          'font-size': '10px',
          'font-weight': '500',
          color: paymentColor(),
          'white-space': 'nowrap',
          'flex-shrink': '0',
        }}>
          {paymentLabel()}
        </div>
      </Show>

      {/* Revenue */}
      <Show when={props.item.estimatedRevenue > 0}>
        <div style={{
          'font-size': '13px',
          'font-weight': '600',
          color: props.item.outstandingBalance > 0 ? '#f59e0b' : '#22c55e',
          'white-space': 'nowrap',
          'min-width': '60px',
          'text-align': 'right',
          'flex-shrink': '0',
        }}>
          {formatCurrency(props.item.estimatedRevenue)}
        </div>
      </Show>

      {/* Action buttons */}
      <div style={{
        display: 'flex',
        'align-items': 'center',
        gap: '4px',
        'margin-left': 'auto',
        'flex-shrink': '0',
      }}>
        {/* Quick-action: Pay */}
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/tax-client/${props.item.id}?section=status`); }}
          title="Payment"
          style={{
            padding: '6px 8px',
            'border-radius': '6px',
            border: '1px solid #e2e8f0',
            background: '#ffffff',
            color: '#475569',
            'font-size': '14px',
            cursor: 'pointer',
            'line-height': '1',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#22c55e'; e.currentTarget.style.color = '#22c55e'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569'; }}
        >
          &#36;
        </button>

        {/* Quick-action: Scan */}
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/tax-client/${props.item.id}?section=docs&scan=true`); }}
          title="Scan documents"
          style={{
            padding: '6px 8px',
            'border-radius': '6px',
            border: '1px solid #e2e8f0',
            background: '#ffffff',
            color: '#475569',
            'font-size': '14px',
            cursor: 'pointer',
            'line-height': '1',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.color = '#3b82f6'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569'; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </button>

        {/* Quick-action: Message */}
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/tax-client/${props.item.id}?action=message`); }}
          title="Send auto-message"
          style={{
            padding: '6px 8px',
            'border-radius': '6px',
            border: '1px solid #e2e8f0',
            background: '#ffffff',
            color: '#475569',
            'font-size': '14px',
            cursor: 'pointer',
            'line-height': '1',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#0ea5e9'; e.currentTarget.style.color = '#0ea5e9'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569'; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); handleProcess(); }}
          title="Process"
          style={{
            padding: '6px 12px',
            'border-radius': '6px',
            border: 'none',
            background: '#1a73e8',
            color: '#ffffff',
            'font-size': '12px',
            'font-weight': '500',
            cursor: 'pointer',
            'white-space': 'nowrap',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#1557b0'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#1a73e8'; }}
        >
          Process
        </button>

        <Show when={props.item.phone}>
          <button
            onClick={(e) => { e.stopPropagation(); handleCall(); }}
            title="Call client"
            style={{
              padding: '6px 8px',
              'border-radius': '6px',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              color: '#475569',
              'font-size': '14px',
              cursor: 'pointer',
              'line-height': '1',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#1a73e8'; e.currentTarget.style.color = '#1a73e8'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569'; }}
          >
            &#9742;
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); handleMessage(); }}
            title="Send SMS"
            style={{
              padding: '6px 8px',
              'border-radius': '6px',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              color: '#475569',
              'font-size': '14px',
              cursor: 'pointer',
              'line-height': '1',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#22c55e'; e.currentTarget.style.color = '#22c55e'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569'; }}
          >
            &#9993;
          </button>
        </Show>

        <Show when={props.onSkip}>
          <button
            onClick={(e) => { e.stopPropagation(); props.onSkip?.(props.item.id); }}
            title="Skip for now"
            style={{
              padding: '6px 8px',
              'border-radius': '6px',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              color: '#94a3b8',
              'font-size': '12px',
              cursor: 'pointer',
              'line-height': '1',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#f59e0b'; e.currentTarget.style.color = '#f59e0b'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#94a3b8'; }}
          >
            Skip
          </button>
        </Show>

        <button
          onClick={(e) => { e.stopPropagation(); props.onFlag?.(props.item.id); }}
          title={props.item.isFlagged ? 'Remove flag' : 'Flag for attention'}
          style={{
            padding: '6px 8px',
            'border-radius': '6px',
            border: `1px solid ${props.item.isFlagged ? '#ef4444' : '#e2e8f0'}`,
            background: props.item.isFlagged ? '#fef2f2' : '#ffffff',
            color: props.item.isFlagged ? '#ef4444' : '#94a3b8',
            'font-size': '14px',
            cursor: 'pointer',
            'line-height': '1',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444'; }}
          onMouseLeave={(e) => {
            if (!props.item.isFlagged) {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.color = '#94a3b8';
            }
          }}
        >
          &#9873;
        </button>
      </div>
    </div>
  );
};

export default QueueClientCard;
