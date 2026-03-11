/**
 * Expected Documents Tracker Component
 * Displays a checklist of expected vs received documents based on
 * the previous year's filing, with a progress bar and status indicators.
 */

import { Component, createSignal, createMemo, Show, For } from 'solid-js';
import { Card, Button } from '../../../ui';
import type { TaxPortal, DrakeTaxDocument, DrakeTaxDocumentType } from '../../types/drakeTypes';
import { DRAKE_FORM_LABELS } from '../../types/drakeTypes';
import type { ExpectedDocument, DocumentCompleteness } from '../../services/recurringClientService';
import {
  calculateDocumentCompleteness,
  formatCurrency,
  markDocumentNotExpected,
} from '../../services/recurringClientService';

// ============================================
// Types
// ============================================

interface ExpectedDocumentsTrackerProps {
  client: TaxPortal;
  expectedDocs: ExpectedDocument[];
  currentDocs: DrakeTaxDocument[];
  onRefresh?: () => void;
  onAddDocument?: () => void;
  onMarkNotExpected?: (type: DrakeTaxDocumentType, payerName?: string) => void;
}

// ============================================
// Styles
// ============================================

const containerStyle = {
  'border': '1px solid #e5e7eb',
  'border-radius': '12px',
  'background': '#fff',
  'overflow': 'hidden',
  'margin-bottom': '1rem',
};

const headerStyle = {
  'padding': '1rem 1.25rem',
  'border-bottom': '1px solid #f3f4f6',
};

const headerTitleRowStyle = {
  'display': 'flex',
  'align-items': 'center',
  'justify-content': 'space-between',
  'margin-bottom': '0.75rem',
};

const titleStyle = {
  'font-size': '0.95rem',
  'font-weight': '600',
  'color': '#111827',
  'display': 'flex',
  'align-items': 'center',
  'gap': '0.5rem',
};

const titleIconStyle = {
  'width': '20px',
  'height': '20px',
  'color': '#6b7280',
};

const statsRowStyle = {
  'display': 'flex',
  'gap': '1rem',
  'font-size': '0.75rem',
  'color': '#6b7280',
};

const statBadgeStyle = (color: string) => ({
  'display': 'inline-flex',
  'align-items': 'center',
  'gap': '0.25rem',
  'color': color,
  'font-weight': '500',
});

// Progress bar styles
const progressContainerStyle = {
  'width': '100%',
  'height': '8px',
  'background': '#f3f4f6',
  'border-radius': '4px',
  'overflow': 'hidden',
  'margin-top': '0.5rem',
};

const progressBarStyle = (percent: number) => ({
  'width': `${percent}%`,
  'height': '100%',
  'background': percent === 100
    ? '#22c55e'
    : percent >= 50
      ? '#3b82f6'
      : '#f59e0b',
  'border-radius': '4px',
  'transition': 'width 0.3s ease',
});

const progressLabelStyle = {
  'display': 'flex',
  'justify-content': 'space-between',
  'align-items': 'center',
  'margin-top': '0.375rem',
  'font-size': '0.7rem',
  'color': '#9ca3af',
};

// Document row styles
const docListStyle = {
  'padding': '0',
  'margin': '0',
  'list-style': 'none',
};

const docRowStyle = {
  'display': 'flex',
  'align-items': 'center',
  'padding': '0.75rem 1.25rem',
  'border-bottom': '1px solid #f3f4f6',
  'gap': '0.75rem',
  'transition': 'background 0.1s ease',
};

const docRowHoverStyle = {
  'background': '#fafafa',
};

const statusIconContainerStyle = (status: 'received' | 'pending' | 'not_expected' | 'unexpected') => {
  const colors: Record<string, { bg: string; color: string }> = {
    received: { bg: '#dcfce7', color: '#16a34a' },
    pending: { bg: '#fef9c3', color: '#ca8a04' },
    not_expected: { bg: '#f3f4f6', color: '#9ca3af' },
    unexpected: { bg: '#fef2f2', color: '#dc2626' },
  };
  const c = colors[status] || colors.pending;
  return {
    'width': '28px',
    'height': '28px',
    'border-radius': '6px',
    'background': c.bg,
    'color': c.color,
    'display': 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    'flex-shrink': '0',
    'font-size': '0.85rem',
    'font-weight': '700',
  };
};

const docInfoStyle = {
  'flex': '1',
  'min-width': '0',
};

const docTypeStyle = {
  'font-size': '0.85rem',
  'font-weight': '500',
  'color': '#111827',
  'white-space': 'nowrap' as const,
  'overflow': 'hidden',
  'text-overflow': 'ellipsis',
};

const docPayerStyle = {
  'font-size': '0.7rem',
  'color': '#6b7280',
  'margin-top': '0.125rem',
};

const docAmountsStyle = {
  'text-align': 'right' as const,
  'flex-shrink': '0',
};

const docPrevAmountStyle = {
  'font-size': '0.75rem',
  'color': '#6b7280',
};

const docCurrAmountStyle = {
  'font-size': '0.8rem',
  'font-weight': '500',
  'color': '#111827',
};

const docStatusLabelStyle = (status: 'received' | 'pending' | 'not_expected' | 'unexpected') => {
  const colors: Record<string, string> = {
    received: '#16a34a',
    pending: '#ca8a04',
    not_expected: '#9ca3af',
    unexpected: '#dc2626',
  };
  return {
    'font-size': '0.7rem',
    'font-weight': '500',
    'color': colors[status] || '#6b7280',
    'flex-shrink': '0',
    'min-width': '65px',
    'text-align': 'right' as const,
  };
};

const actionBtnStyle = {
  'background': 'none',
  'border': '1px solid #d1d5db',
  'border-radius': '6px',
  'padding': '0.25rem 0.5rem',
  'font-size': '0.65rem',
  'color': '#6b7280',
  'cursor': 'pointer',
  'white-space': 'nowrap' as const,
  'transition': 'all 0.1s ease',
  'flex-shrink': '0',
};

const footerStyle = {
  'padding': '0.75rem 1.25rem',
  'display': 'flex',
  'justify-content': 'space-between',
  'align-items': 'center',
  'background': '#fafafa',
  'border-top': '1px solid #f3f4f6',
};

const footerBtnStyle = (variant: 'primary' | 'secondary') => ({
  'background': variant === 'primary' ? '#3b82f6' : 'transparent',
  'color': variant === 'primary' ? '#fff' : '#3b82f6',
  'border': variant === 'primary' ? 'none' : '1px solid #93c5fd',
  'border-radius': '8px',
  'padding': '0.5rem 0.875rem',
  'font-size': '0.8rem',
  'font-weight': '500',
  'cursor': 'pointer',
  'display': 'inline-flex',
  'align-items': 'center',
  'gap': '0.375rem',
});

const emptyStateStyle = {
  'padding': '2rem 1.25rem',
  'text-align': 'center' as const,
  'color': '#9ca3af',
};

const emptyIconStyle = {
  'font-size': '2rem',
  'margin-bottom': '0.5rem',
};

const emptyTextStyle = {
  'font-size': '0.85rem',
  'margin-bottom': '0.25rem',
  'color': '#6b7280',
};

const emptySubTextStyle = {
  'font-size': '0.75rem',
  'color': '#9ca3af',
};

const sectionDividerStyle = {
  'padding': '0.5rem 1.25rem',
  'font-size': '0.7rem',
  'font-weight': '600',
  'color': '#9ca3af',
  'text-transform': 'uppercase' as const,
  'letter-spacing': '0.05em',
  'background': '#f9fafb',
  'border-bottom': '1px solid #f3f4f6',
};

// ============================================
// Component
// ============================================

const ExpectedDocumentsTracker: Component<ExpectedDocumentsTrackerProps> = (props) => {
  const [hoveredRow, setHoveredRow] = createSignal<number | null>(null);
  const [markingNotExpected, setMarkingNotExpected] = createSignal<string | null>(null);

  // Calculate completeness
  const completeness = createMemo<DocumentCompleteness>(() => {
    return calculateDocumentCompleteness(props.expectedDocs, props.currentDocs);
  });

  // Split documents into expected vs unexpected
  const expectedDocsList = createMemo(() => completeness().expectedDocuments);

  const unexpectedDocs = createMemo(() => {
    const expectedTypes = new Set(props.expectedDocs.map((ed) => ed.type));
    return props.currentDocs.filter(
      (cd) => cd.drakeFormType && !expectedTypes.has(cd.drakeFormType)
    );
  });

  const getDocStatus = (doc: ExpectedDocument): 'received' | 'pending' | 'not_expected' => {
    if (doc.markedNotExpected) return 'not_expected';
    return doc.received ? 'received' : 'pending';
  };

  const getStatusIcon = (status: 'received' | 'pending' | 'not_expected' | 'unexpected') => {
    switch (status) {
      case 'received': return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );
      case 'pending': return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
      case 'not_expected': return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      );
      case 'unexpected': return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    }
  };

  const getStatusLabel = (status: 'received' | 'pending' | 'not_expected' | 'unexpected') => {
    switch (status) {
      case 'received': return 'Received';
      case 'pending': return 'Pending';
      case 'not_expected': return 'Excluded';
      case 'unexpected': return 'New';
    }
  };

  const handleMarkNotExpected = async (doc: ExpectedDocument) => {
    const key = `${doc.type}-${doc.payerName}`;
    setMarkingNotExpected(key);
    try {
      const success = await markDocumentNotExpected(
        props.client.id,
        doc.type,
        doc.payerName,
        'Not expected this year'
      );
      if (success && props.onMarkNotExpected) {
        props.onMarkNotExpected(doc.type, doc.payerName);
      }
      if (props.onRefresh) {
        props.onRefresh();
      }
    } finally {
      setMarkingNotExpected(null);
    }
  };

  return (
    <div style={containerStyle}>
      {/* Header with progress */}
      <div style={headerStyle}>
        <div style={headerTitleRowStyle}>
          <div style={titleStyle}>
            <svg style={titleIconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            Expected Documents
          </div>
          <div style={statsRowStyle}>
            <span style={statBadgeStyle('#16a34a')}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8" /></svg>
              {completeness().receivedCount} received
            </span>
            <span style={statBadgeStyle('#ca8a04')}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8" /></svg>
              {completeness().pendingCount} pending
            </span>
            <Show when={completeness().unexpectedCount > 0}>
              <span style={statBadgeStyle('#dc2626')}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8" /></svg>
                {completeness().unexpectedCount} new
              </span>
            </Show>
          </div>
        </div>

        {/* Progress bar */}
        <div style={progressContainerStyle}>
          <div style={progressBarStyle(completeness().completenessPercent)} />
        </div>
        <div style={progressLabelStyle}>
          <span>
            {completeness().receivedCount} of {completeness().expectedCount} expected documents received
          </span>
          <span style={{ 'font-weight': '600', 'color': '#374151' }}>
            {completeness().completenessPercent}%
          </span>
        </div>
      </div>

      {/* Document list */}
      <Show
        when={props.expectedDocs.length > 0 || unexpectedDocs().length > 0}
        fallback={
          <div style={emptyStateStyle}>
            <div style={emptyIconStyle}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <div style={emptyTextStyle}>No previous year data available</div>
            <div style={emptySubTextStyle}>
              This appears to be a new client. Document expectations will be set once they file.
            </div>
          </div>
        }
      >
        {/* Expected documents section */}
        <Show when={expectedDocsList().length > 0}>
          <div style={sectionDividerStyle}>
            Expected from last year ({expectedDocsList().length})
          </div>
          <div style={docListStyle}>
            <For each={expectedDocsList()}>
              {(doc, index) => {
                const status = getDocStatus(doc);
                return (
                  <div
                    style={{
                      ...docRowStyle,
                      ...(hoveredRow() === index() ? docRowHoverStyle : {}),
                      ...(doc.markedNotExpected ? { 'opacity': '0.5' } : {}),
                    }}
                    onMouseEnter={() => setHoveredRow(index())}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    {/* Status icon */}
                    <div style={statusIconContainerStyle(status)}>
                      {getStatusIcon(status)}
                    </div>

                    {/* Document info */}
                    <div style={docInfoStyle}>
                      <div style={docTypeStyle}>
                        {doc.label}
                      </div>
                      <Show when={doc.payerName && doc.payerName !== 'Unknown'}>
                        <div style={docPayerStyle}>
                          {doc.payerName}
                        </div>
                      </Show>
                    </div>

                    {/* Amounts comparison */}
                    <Show when={doc.previousYearAmount && doc.previousYearAmount > 0}>
                      <div style={docAmountsStyle}>
                        <div style={docPrevAmountStyle}>
                          Last year: {formatCurrency(doc.previousYearAmount!)}
                        </div>
                        <Show when={doc.currentYearAmount !== undefined}>
                          <div style={docCurrAmountStyle}>
                            This year: {formatCurrency(doc.currentYearAmount!)}
                          </div>
                        </Show>
                      </div>
                    </Show>

                    {/* Status label */}
                    <div style={docStatusLabelStyle(status)}>
                      {getStatusLabel(status)}
                    </div>

                    {/* Action: mark not expected */}
                    <Show when={!doc.received && !doc.markedNotExpected}>
                      <button
                        style={actionBtnStyle}
                        onClick={() => handleMarkNotExpected(doc)}
                        disabled={markingNotExpected() === `${doc.type}-${doc.payerName}`}
                        title="Mark as not expected this year"
                      >
                        {markingNotExpected() === `${doc.type}-${doc.payerName}`
                          ? 'Saving...'
                          : 'Not needed'}
                      </button>
                    </Show>
                  </div>
                );
              }}
            </For>
          </div>
        </Show>

        {/* Unexpected / new documents section */}
        <Show when={unexpectedDocs().length > 0}>
          <div style={sectionDividerStyle}>
            New documents not in last year's filing ({unexpectedDocs().length})
          </div>
          <div style={docListStyle}>
            <For each={unexpectedDocs()}>
              {(doc, index) => (
                <div
                  style={{
                    ...docRowStyle,
                    'background': '#fefce8',
                  }}
                >
                  {/* Status icon */}
                  <div style={statusIconContainerStyle('unexpected')}>
                    {getStatusIcon('unexpected')}
                  </div>

                  {/* Document info */}
                  <div style={docInfoStyle}>
                    <div style={docTypeStyle}>
                      {doc.drakeFormType ? (DRAKE_FORM_LABELS[doc.drakeFormType] || doc.drakeFormType) : doc.originalFileName}
                    </div>
                    <Show when={doc.payerInfo?.name}>
                      <div style={docPayerStyle}>
                        {doc.payerInfo!.name}
                      </div>
                    </Show>
                  </div>

                  {/* Amount */}
                  <Show when={doc.extractedAmounts}>
                    <div style={docAmountsStyle}>
                      <div style={docCurrAmountStyle}>
                        {doc.drakeFormType && doc.extractedAmounts
                          ? (() => {
                              const amt = (() => {
                                const amounts = doc.extractedAmounts!;
                                switch (doc.drakeFormType) {
                                  case 'w2': return amounts.wages;
                                  case '1099_nec': return amounts.nonEmployeeCompensation;
                                  case '1099_int': return amounts.interestIncome;
                                  case '1099_div': return amounts.ordinaryDividends;
                                  case '1098': return amounts.mortgageInterest;
                                  default: return amounts.totalAmount;
                                }
                              })();
                              return amt ? formatCurrency(amt) : '';
                            })()
                          : ''}
                      </div>
                    </div>
                  </Show>

                  {/* Status label */}
                  <div style={docStatusLabelStyle('unexpected')}>
                    New
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>

        {/* Missing required documents highlight */}
        <Show when={completeness().missingRequired.length > 0}>
          <div style={{
            'margin': '0.75rem 1.25rem',
            'padding': '0.75rem',
            'background': '#fef2f2',
            'border': '1px solid #fecaca',
            'border-radius': '8px',
            'display': 'flex',
            'align-items': 'flex-start',
            'gap': '0.5rem',
          }}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#dc2626"
              stroke-width="2"
              style={{ 'flex-shrink': '0', 'margin-top': '0.125rem' }}
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>
              <div style={{ 'font-size': '0.8rem', 'font-weight': '600', 'color': '#991b1b', 'margin-bottom': '0.25rem' }}>
                {completeness().missingRequired.length} expected document(s) still missing
              </div>
              <div style={{ 'font-size': '0.75rem', 'color': '#b91c1c' }}>
                <For each={completeness().missingRequired}>
                  {(doc, i) => (
                    <span>
                      {doc.label}{doc.payerName && doc.payerName !== 'Unknown' ? ` (${doc.payerName})` : ''}
                      {i() < completeness().missingRequired.length - 1 ? ', ' : ''}
                    </span>
                  )}
                </For>
              </div>
            </div>
          </div>
        </Show>
      </Show>

      {/* Footer actions */}
      <div style={footerStyle}>
        <Show
          when={props.onAddDocument}
          fallback={<div />}
        >
          <button
            style={footerBtnStyle('primary')}
            onClick={() => props.onAddDocument?.()}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add document
          </button>
        </Show>
        <Show when={props.onRefresh}>
          <button
            style={footerBtnStyle('secondary')}
            onClick={() => props.onRefresh?.()}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            Refresh
          </button>
        </Show>
      </div>
    </div>
  );
};

export default ExpectedDocumentsTracker;
