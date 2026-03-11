/**
 * Previous Year Banner Component
 * Displays a summary banner for returning clients showing year-over-year changes,
 * quick actions, and collapsible details from the previous tax year.
 */

import { Component, createSignal, Show, For } from 'solid-js';
import { Card, Button } from '../../../ui';
import type { TaxPortal } from '../../types/drakeTypes';
import type { PreviousYearData, YearOverYearChange } from '../../services/recurringClientService';
import { formatCurrency, calculatePercentChange } from '../../services/recurringClientService';

// ============================================
// Types
// ============================================

interface PreviousYearBannerProps {
  client: TaxPortal;
  previousYearData: PreviousYearData;
  changes: YearOverYearChange[];
  onCopyLastYearInfo?: () => void;
  onViewLastYearReturn?: () => void;
  onConfirmNoChanges?: () => void;
}

// ============================================
// Styles
// ============================================

const bannerContainerStyle = {
  'background': 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
  'border': '1px solid #93c5fd',
  'border-radius': '12px',
  'padding': '0',
  'margin-bottom': '1rem',
  'overflow': 'hidden',
};

const bannerHeaderStyle = {
  'display': 'flex',
  'align-items': 'center',
  'justify-content': 'space-between',
  'padding': '1rem 1.25rem',
  'cursor': 'pointer',
  'user-select': 'none' as const,
};

const headerLeftStyle = {
  'display': 'flex',
  'align-items': 'center',
  'gap': '0.75rem',
};

const iconContainerStyle = {
  'width': '40px',
  'height': '40px',
  'border-radius': '10px',
  'background': '#3b82f6',
  'display': 'flex',
  'align-items': 'center',
  'justify-content': 'center',
  'color': '#fff',
  'font-size': '1.25rem',
  'flex-shrink': '0',
};

const headerTitleStyle = {
  'font-size': '1rem',
  'font-weight': '600',
  'color': '#1e3a5f',
  'margin': '0',
  'line-height': '1.3',
};

const headerSubtitleStyle = {
  'font-size': '0.8rem',
  'color': '#4b7bb5',
  'margin': '0',
  'line-height': '1.3',
};

const chevronStyle = (expanded: boolean) => ({
  'font-size': '1.25rem',
  'color': '#3b82f6',
  'transition': 'transform 0.2s ease',
  'transform': expanded ? 'rotate(180deg)' : 'rotate(0deg)',
});

const changesSummaryStyle = {
  'padding': '0 1.25rem 1rem',
  'display': 'flex',
  'flex-wrap': 'wrap' as const,
  'gap': '0.5rem',
};

const changeBadgeStyle = (severity: string) => {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    info: { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
    warning: { bg: '#fefce8', text: '#854d0e', border: '#fde68a' },
    positive: { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
    negative: { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
  };
  const c = colors[severity] || colors.info;
  return {
    'display': 'inline-flex',
    'align-items': 'center',
    'gap': '0.375rem',
    'padding': '0.25rem 0.625rem',
    'border-radius': '999px',
    'font-size': '0.75rem',
    'font-weight': '500',
    'background': c.bg,
    'color': c.text,
    'border': `1px solid ${c.border}`,
    'white-space': 'nowrap' as const,
  };
};

const severityIcon = (severity: string): string => {
  switch (severity) {
    case 'warning': return '!';
    case 'positive': return '+';
    case 'negative': return '-';
    default: return '=';
  }
};

const actionsRowStyle = {
  'display': 'flex',
  'gap': '0.5rem',
  'padding': '0 1.25rem 1rem',
  'flex-wrap': 'wrap' as const,
};

const actionButtonStyle = (variant: 'primary' | 'secondary' | 'success') => {
  const styles: Record<string, Record<string, string>> = {
    primary: {
      'background': '#3b82f6',
      'color': '#fff',
      'border': 'none',
    },
    secondary: {
      'background': '#fff',
      'color': '#3b82f6',
      'border': '1px solid #93c5fd',
    },
    success: {
      'background': '#22c55e',
      'color': '#fff',
      'border': 'none',
    },
  };
  return {
    ...styles[variant],
    'padding': '0.5rem 1rem',
    'border-radius': '8px',
    'font-size': '0.8rem',
    'font-weight': '500',
    'cursor': 'pointer',
    'transition': 'opacity 0.15s ease',
    'display': 'inline-flex',
    'align-items': 'center',
    'gap': '0.375rem',
  };
};

const detailsSectionStyle = {
  'border-top': '1px solid #bfdbfe',
  'padding': '1rem 1.25rem',
  'background': 'rgba(255,255,255,0.5)',
};

const detailsGridStyle = {
  'display': 'grid',
  'grid-template-columns': 'repeat(auto-fit, minmax(220px, 1fr))',
  'gap': '1rem',
};

const detailCardStyle = {
  'background': '#fff',
  'border': '1px solid #e5e7eb',
  'border-radius': '8px',
  'padding': '0.875rem',
};

const detailLabelStyle = {
  'font-size': '0.7rem',
  'font-weight': '600',
  'color': '#6b7280',
  'text-transform': 'uppercase' as const,
  'letter-spacing': '0.05em',
  'margin-bottom': '0.375rem',
};

const detailValueStyle = {
  'font-size': '0.9rem',
  'font-weight': '500',
  'color': '#111827',
};

const detailSubValueStyle = {
  'font-size': '0.75rem',
  'color': '#6b7280',
  'margin-top': '0.125rem',
};

const changeRowStyle = {
  'display': 'flex',
  'align-items': 'flex-start',
  'gap': '0.625rem',
  'padding': '0.625rem 0',
  'border-bottom': '1px solid #f3f4f6',
};

const changeRowLastStyle = {
  ...changeRowStyle,
  'border-bottom': 'none',
};

const changeDotStyle = (severity: string) => {
  const colors: Record<string, string> = {
    info: '#3b82f6',
    warning: '#f59e0b',
    positive: '#22c55e',
    negative: '#ef4444',
  };
  return {
    'width': '8px',
    'height': '8px',
    'border-radius': '50%',
    'background': colors[severity] || '#6b7280',
    'flex-shrink': '0',
    'margin-top': '0.375rem',
  };
};

const changeTextStyle = {
  'font-size': '0.8rem',
  'color': '#374151',
  'line-height': '1.4',
};

const changeLabelStyle = {
  'font-weight': '600',
  'margin-right': '0.25rem',
};

// ============================================
// Component
// ============================================

const PreviousYearBanner: Component<PreviousYearBannerProps> = (props) => {
  const [expanded, setExpanded] = createSignal(false);
  const [confirmingNoChanges, setConfirmingNoChanges] = createSignal(false);

  const previousYear = () => props.previousYearData.taxYear;
  const currentYear = () => props.client.taxYear || new Date().getFullYear();

  // Count changes by severity for summary
  const warningCount = () => props.changes.filter((c) => c.severity === 'warning').length;
  const infoCount = () => props.changes.filter((c) => c.severity === 'info').length;

  const handleConfirmNoChanges = async () => {
    setConfirmingNoChanges(true);
    try {
      if (props.onConfirmNoChanges) {
        props.onConfirmNoChanges();
      }
    } finally {
      setConfirmingNoChanges(false);
    }
  };

  return (
    <div style={bannerContainerStyle}>
      {/* Header - always visible */}
      <div style={bannerHeaderStyle} onClick={() => setExpanded(!expanded())}>
        <div style={headerLeftStyle}>
          <div style={iconContainerStyle}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <p style={headerTitleStyle}>
              Returning Client — Filed with us in {previousYear()}
            </p>
            <p style={headerSubtitleStyle}>
              {warningCount() > 0
                ? `${warningCount()} change(s) detected from last year`
                : 'No significant changes detected'}
              {' | '}
              {props.previousYearData.documents.length} documents on file
            </p>
          </div>
        </div>
        <span style={chevronStyle(expanded())}>&#9660;</span>
      </div>

      {/* Changes summary badges - always visible */}
      <Show when={props.changes.length > 0}>
        <div style={changesSummaryStyle}>
          <For each={props.changes.slice(0, expanded() ? props.changes.length : 6)}>
            {(change) => (
              <span style={changeBadgeStyle(change.severity)}>
                <span style={{ 'font-weight': '700' }}>{severityIcon(change.severity)}</span>
                {change.label}
              </span>
            )}
          </For>
          <Show when={!expanded() && props.changes.length > 6}>
            <span style={changeBadgeStyle('info')}>
              +{props.changes.length - 6} more
            </span>
          </Show>
        </div>
      </Show>

      {/* Quick actions */}
      <div style={actionsRowStyle}>
        <Show when={props.onCopyLastYearInfo}>
          <button
            style={actionButtonStyle('primary')}
            onClick={(e) => {
              e.stopPropagation();
              props.onCopyLastYearInfo?.();
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            Copy last year's info
          </button>
        </Show>
        <Show when={props.onViewLastYearReturn}>
          <button
            style={actionButtonStyle('secondary')}
            onClick={(e) => {
              e.stopPropagation();
              props.onViewLastYearReturn?.();
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            View last year's return
          </button>
        </Show>
        <Show when={props.onConfirmNoChanges && warningCount() === 0}>
          <button
            style={actionButtonStyle('success')}
            onClick={(e) => {
              e.stopPropagation();
              handleConfirmNoChanges();
            }}
            disabled={confirmingNoChanges()}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {confirmingNoChanges() ? 'Confirming...' : 'Confirm no changes'}
          </button>
        </Show>
      </div>

      {/* Collapsible details section */}
      <Show when={expanded()}>
        <div style={detailsSectionStyle}>
          {/* Summary cards */}
          <div style={detailsGridStyle}>
            {/* Income summary */}
            <div style={detailCardStyle}>
              <div style={detailLabelStyle}>Last Year Income</div>
              <div style={detailValueStyle}>
                {formatCurrency(props.previousYearData.totalIncome)}
              </div>
              <div style={detailSubValueStyle}>
                Tax year {previousYear()}
              </div>
            </div>

            {/* Withholding summary */}
            <div style={detailCardStyle}>
              <div style={detailLabelStyle}>Last Year Withholding</div>
              <div style={detailValueStyle}>
                {formatCurrency(props.previousYearData.totalWithholding)}
              </div>
              <div style={detailSubValueStyle}>
                Federal taxes withheld
              </div>
            </div>

            {/* Refund/Owe */}
            <div style={detailCardStyle}>
              <div style={detailLabelStyle}>
                {props.previousYearData.federalRefund ? 'Last Year Refund' : 'Last Year Owed'}
              </div>
              <div style={{
                ...detailValueStyle,
                'color': props.previousYearData.federalRefund ? '#16a34a' : '#dc2626',
              }}>
                {props.previousYearData.federalRefund
                  ? formatCurrency(props.previousYearData.federalRefund)
                  : props.previousYearData.federalOwe
                    ? formatCurrency(props.previousYearData.federalOwe)
                    : 'N/A'}
              </div>
              <div style={detailSubValueStyle}>
                Federal {props.previousYearData.federalRefund ? 'refund' : 'amount owed'}
              </div>
            </div>

            {/* Filing status */}
            <div style={detailCardStyle}>
              <div style={detailLabelStyle}>Filing Status</div>
              <div style={detailValueStyle}>
                {props.previousYearData.filingStatus
                  ? props.previousYearData.filingStatus.replace(/_/g, ' ')
                  : 'Not recorded'}
              </div>
              <div style={detailSubValueStyle}>
                {props.previousYearData.dependentCount} dependent(s)
              </div>
            </div>

            {/* Employers */}
            <Show when={props.previousYearData.employers.length > 0}>
              <div style={detailCardStyle}>
                <div style={detailLabelStyle}>Employers ({previousYear()})</div>
                <div style={detailValueStyle}>
                  <For each={props.previousYearData.employers}>
                    {(employer, index) => (
                      <div style={{ 'margin-bottom': index() < props.previousYearData.employers.length - 1 ? '0.25rem' : '0' }}>
                        {employer}
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </Show>

            {/* Document types */}
            <div style={detailCardStyle}>
              <div style={detailLabelStyle}>Documents on File</div>
              <div style={detailValueStyle}>
                {props.previousYearData.documents.length} document(s)
              </div>
              <div style={detailSubValueStyle}>
                Types: {props.previousYearData.documentTypes.join(', ') || 'None'}
              </div>
            </div>
          </div>

          {/* Detailed changes list */}
          <Show when={props.changes.length > 0}>
            <div style={{ 'margin-top': '1rem' }}>
              <div style={{
                'font-size': '0.8rem',
                'font-weight': '600',
                'color': '#374151',
                'margin-bottom': '0.5rem',
              }}>
                Detailed Changes
              </div>
              <For each={props.changes}>
                {(change, index) => (
                  <div style={index() === props.changes.length - 1 ? changeRowLastStyle : changeRowStyle}>
                    <div style={changeDotStyle(change.severity)} />
                    <div style={changeTextStyle}>
                      <span style={changeLabelStyle}>{change.label}:</span>
                      {change.description}
                      <Show when={change.previousValue && change.currentValue}>
                        <div style={{ 'font-size': '0.75rem', 'color': '#9ca3af', 'margin-top': '0.125rem' }}>
                          {change.previousValue} &rarr; {change.currentValue}
                        </div>
                      </Show>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>

          {/* Previous year dependents */}
          <Show when={props.previousYearData.dependentNames.length > 0}>
            <div style={{ 'margin-top': '1rem' }}>
              <div style={{
                'font-size': '0.8rem',
                'font-weight': '600',
                'color': '#374151',
                'margin-bottom': '0.5rem',
              }}>
                Dependents ({previousYear()})
              </div>
              <div style={{ 'display': 'flex', 'flex-wrap': 'wrap', 'gap': '0.375rem' }}>
                <For each={props.previousYearData.dependentNames}>
                  {(name) => (
                    <span style={{
                      'background': '#fff',
                      'border': '1px solid #d1d5db',
                      'border-radius': '6px',
                      'padding': '0.25rem 0.625rem',
                      'font-size': '0.75rem',
                      'color': '#374151',
                    }}>
                      {name}
                    </span>
                  )}
                </For>
              </div>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
};

export default PreviousYearBanner;
