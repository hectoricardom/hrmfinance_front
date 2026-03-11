/**
 * CreditDetectionPanel Component
 *
 * Displays auto-detected tax credits with confidence scores,
 * eligibility badges, estimated amounts, and expandable detail sections.
 */

import { Component, For, Show, createSignal, JSX } from 'solid-js';
import type { TaxPortal } from '../../types/drakeTypes';
import type { TaxCalculationResult, DetectedCredit } from '../../types/taxCalcTypes';

interface CreditDetectionPanelProps {
  client: TaxPortal;
  calculationResult: TaxCalculationResult;
}

const CreditDetectionPanel: Component<CreditDetectionPanelProps> = (props) => {
  const [expandedCredit, setExpandedCredit] = createSignal<string | null>(null);

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Toggle expanded credit
  const toggleCredit = (code: string) => {
    setExpandedCredit((prev) => (prev === code ? null : code));
  };

  // Eligibility badge config
  const eligibilityConfig = (eligibility: DetectedCredit['eligibility']): { label: string; color: string; bg: string } => {
    switch (eligibility) {
      case 'eligible':
        return { label: 'Eligible', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.12)' };
      case 'likely':
        return { label: 'Likely Eligible', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' };
      case 'possible':
        return { label: 'May Be Eligible', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' };
      case 'ineligible':
      default:
        return { label: 'Not Eligible', color: '#6b7280', bg: 'rgba(107, 114, 128, 0.12)' };
    }
  };

  // Confidence bar color
  const confidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return '#22c55e';
    if (confidence >= 0.6) return '#3b82f6';
    if (confidence >= 0.4) return '#f59e0b';
    return '#ef4444';
  };

  // Credit icon by code
  const creditIcon = (code: string): JSX.Element => {
    switch (code) {
      case 'CTC':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87" />
            <path d="M16 3.13a4 4 0 010 7.75" />
          </svg>
        );
      case 'ACTC':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="23" y1="11" x2="17" y2="11" />
            <line x1="20" y1="8" x2="20" y2="14" />
          </svg>
        );
      case 'EITC':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
          </svg>
        );
      case 'AOC':
      case 'AOC_REFUND':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c3 3 9 3 12 0v-5" />
          </svg>
        );
      case 'SAVER':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
          </svg>
        );
      case 'PTC':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        );
      default:
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
        );
    }
  };

  // Styles
  const containerStyle: JSX.CSSProperties = {
    padding: '1rem',
  };

  const headerStyle: JSX.CSSProperties = {
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'space-between',
    'margin-bottom': '1rem',
  };

  const titleStyle: JSX.CSSProperties = {
    'font-weight': '600',
    'font-size': '1rem',
    color: 'var(--text-primary)',
    display: 'flex',
    'align-items': 'center',
    gap: '0.75rem',
  };

  const totalStyle: JSX.CSSProperties = {
    'font-size': '1.25rem',
    'font-weight': '700',
    color: '#22c55e',
  };

  const creditCardStyle = (isExpanded: boolean): JSX.CSSProperties => ({
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-md)',
    'margin-bottom': '0.75rem',
    overflow: 'hidden',
    background: isExpanded ? 'var(--background-color)' : 'var(--surface-color)',
    transition: 'all 0.2s',
  });

  const creditHeaderStyle: JSX.CSSProperties = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.75rem',
    padding: '1rem',
    cursor: 'pointer',
    'user-select': 'none',
  };

  const creditIconWrapperStyle = (color: string): JSX.CSSProperties => ({
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    width: '40px',
    height: '40px',
    'border-radius': 'var(--border-radius-md)',
    background: `${color}15`,
    color: color,
    'flex-shrink': '0',
  });

  const creditInfoStyle: JSX.CSSProperties = {
    flex: '1',
    'min-width': '0',
  };

  const creditNameStyle: JSX.CSSProperties = {
    'font-weight': '600',
    'font-size': '0.9rem',
    color: 'var(--text-primary)',
    'margin-bottom': '0.25rem',
  };

  const creditBasisStyle: JSX.CSSProperties = {
    'font-size': '0.8rem',
    color: 'var(--text-secondary)',
    'line-height': '1.3',
    overflow: 'hidden',
    'text-overflow': 'ellipsis',
    'white-space': 'nowrap',
  };

  const creditAmountStyle: JSX.CSSProperties = {
    'text-align': 'right',
    'flex-shrink': '0',
  };

  const amountValueStyle: JSX.CSSProperties = {
    'font-weight': '700',
    'font-size': '1rem',
    color: 'var(--text-primary)',
    'margin-bottom': '0.125rem',
  };

  const eligibilityBadgeStyle = (config: ReturnType<typeof eligibilityConfig>): JSX.CSSProperties => ({
    display: 'inline-flex',
    'align-items': 'center',
    padding: '0.125rem 0.5rem',
    'border-radius': '9999px',
    background: config.bg,
    color: config.color,
    'font-size': '0.7rem',
    'font-weight': '600',
    'white-space': 'nowrap',
  });

  const confidenceBarContainerStyle: JSX.CSSProperties = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    'margin-top': '0.5rem',
    'font-size': '0.75rem',
    color: 'var(--text-secondary)',
  };

  const confidenceBarBgStyle: JSX.CSSProperties = {
    flex: '1',
    height: '6px',
    background: 'var(--border-color)',
    'border-radius': '3px',
    overflow: 'hidden',
    'max-width': '80px',
  };

  const confidenceBarFillStyle = (confidence: number): JSX.CSSProperties => ({
    width: `${confidence * 100}%`,
    height: '100%',
    background: confidenceColor(confidence),
    'border-radius': '3px',
    transition: 'width 0.3s',
  });

  const expandedContentStyle: JSX.CSSProperties = {
    padding: '0 1rem 1rem 1rem',
    'border-top': '1px solid var(--border-color)',
  };

  const requirementStyle: JSX.CSSProperties = {
    display: 'flex',
    'align-items': 'flex-start',
    gap: '0.5rem',
    padding: '0.375rem 0',
    'font-size': '0.8rem',
    color: 'var(--text-secondary)',
    'line-height': '1.4',
  };

  const requirementBulletStyle: JSX.CSSProperties = {
    'flex-shrink': '0',
    'margin-top': '0.25rem',
    color: 'var(--text-muted)',
  };

  const emptyStyle: JSX.CSSProperties = {
    'text-align': 'center',
    padding: '3rem 2rem',
    color: 'var(--text-secondary)',
  };

  const arrowStyle = (isExpanded: boolean): JSX.CSSProperties => ({
    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
    transition: 'transform 0.2s',
    color: 'var(--text-muted)',
    'flex-shrink': '0',
  });

  const credits = () => props.calculationResult.credits || [];
  const totalCreditsAmount = () => props.calculationResult.totalCredits || 0;

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={titleStyle}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 12l2 2 4-4" />
            <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Detected Tax Credits
        </div>
        <Show when={totalCreditsAmount() > 0}>
          <div style={totalStyle}>
            {formatCurrency(totalCreditsAmount())}
          </div>
        </Show>
      </div>

      {/* Credits List */}
      <Show
        when={credits().length > 0}
        fallback={
          <div style={emptyStyle}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5" style={{ 'margin-bottom': '1rem' }}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            <div style={{ 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
              No Credits Detected
            </div>
            <div style={{ 'font-size': '0.875rem' }}>
              Credits will be detected automatically once tax documents are verified and a calculation is run.
            </div>
          </div>
        }
      >
        <For each={credits()}>
          {(credit) => {
            const isExpanded = () => expandedCredit() === credit.code;
            const elConfig = eligibilityConfig(credit.eligibility);

            return (
              <div style={creditCardStyle(isExpanded())}>
                {/* Credit Header - Clickable */}
                <div style={creditHeaderStyle} onClick={() => toggleCredit(credit.code)}>
                  <div style={creditIconWrapperStyle(elConfig.color)}>
                    {creditIcon(credit.code)}
                  </div>

                  <div style={creditInfoStyle}>
                    <div style={creditNameStyle}>{credit.name}</div>
                    <div style={creditBasisStyle}>{credit.basis}</div>
                    <div style={confidenceBarContainerStyle}>
                      <span>Confidence:</span>
                      <div style={confidenceBarBgStyle}>
                        <div style={confidenceBarFillStyle(credit.confidence)} />
                      </div>
                      <span style={{ 'font-weight': '600', color: confidenceColor(credit.confidence) }}>
                        {Math.round(credit.confidence * 100)}%
                      </span>
                    </div>
                  </div>

                  <div style={creditAmountStyle}>
                    <div style={amountValueStyle}>{formatCurrency(credit.estimatedAmount)}</div>
                    <span style={eligibilityBadgeStyle(elConfig)}>{elConfig.label}</span>
                  </div>

                  <span style={arrowStyle(isExpanded())}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                  </span>
                </div>

                {/* Expanded Details */}
                <Show when={isExpanded()}>
                  <div style={expandedContentStyle}>
                    <div style={{ 'margin-top': '0.75rem' }}>
                      <div style={{ 'font-weight': '600', 'font-size': '0.8rem', color: 'var(--text-primary)', 'margin-bottom': '0.5rem' }}>
                        Why Detected
                      </div>
                      <div style={{ 'font-size': '0.85rem', color: 'var(--text-secondary)', 'line-height': '1.5', 'margin-bottom': '1rem' }}>
                        {credit.basis}
                      </div>
                    </div>

                    <Show when={credit.requirements.length > 0}>
                      <div>
                        <div style={{ 'font-weight': '600', 'font-size': '0.8rem', color: 'var(--text-primary)', 'margin-bottom': '0.5rem' }}>
                          Requirements
                        </div>
                        <For each={credit.requirements}>
                          {(req) => (
                            <div style={requirementStyle}>
                              <span style={requirementBulletStyle}>
                                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                                  <circle cx="6" cy="6" r="3" fill="currentColor" />
                                </svg>
                              </span>
                              <span>{req}</span>
                            </div>
                          )}
                        </For>
                      </div>
                    </Show>
                  </div>
                </Show>
              </div>
            );
          }}
        </For>
      </Show>

      {/* Disclaimer */}
      <Show when={credits().length > 0}>
        <div style={{
          'margin-top': '1rem',
          padding: '0.75rem 1rem',
          background: 'rgba(59, 130, 246, 0.08)',
          'border-radius': 'var(--border-radius-md)',
          'font-size': '0.8rem',
          color: 'var(--text-secondary)',
          'line-height': '1.4',
          display: 'flex',
          'align-items': 'flex-start',
          gap: '0.5rem',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" style={{ 'flex-shrink': '0', 'margin-top': '2px' }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span>
            Credit amounts are estimates based on available documents. Final amounts may differ
            after complete review. Some credits require additional forms or verification not
            included in the document set.
          </span>
        </div>
      </Show>
    </div>
  );
};

export default CreditDetectionPanel;
