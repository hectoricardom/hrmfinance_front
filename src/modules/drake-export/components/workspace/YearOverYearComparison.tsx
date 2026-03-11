/**
 * YearOverYearComparison Component
 *
 * Side-by-side comparison table showing last year vs this year tax data.
 * Highlights significant changes with color coding:
 *   - >10% change: amber
 *   - >25% change: red
 */

import { Component, For, Show, createMemo, JSX } from 'solid-js';
import type { TaxCalculationResult } from '../../types/taxCalcTypes';

interface YearOverYearComparisonProps {
  currentYearData: TaxCalculationResult;
  previousYearData: TaxCalculationResult | null;
}

interface ComparisonRow {
  label: string;
  currentValue: number;
  previousValue: number | null;
  isCurrency: boolean;
  isSubItem?: boolean;
  isHighlight?: boolean;
}

const YearOverYearComparison: Component<YearOverYearComparisonProps> = (props) => {
  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format percentage
  const formatPercent = (value: number): string => {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  // Calculate percentage change
  const percentChange = (current: number, previous: number): number | null => {
    if (previous === 0 && current === 0) return 0;
    if (previous === 0) return null; // Cannot compute % change from zero
    return ((current - previous) / Math.abs(previous)) * 100;
  };

  // Get change color
  const changeColor = (pctChange: number | null): string => {
    if (pctChange === null) return 'var(--text-secondary)';
    const abs = Math.abs(pctChange);
    if (abs > 25) return '#ef4444';
    if (abs > 10) return '#f59e0b';
    return 'var(--text-secondary)';
  };

  // Build comparison rows
  const rows = createMemo((): ComparisonRow[] => {
    const current = props.currentYearData;
    const prev = props.previousYearData;

    return [
      { label: 'Total Income', currentValue: current.totalIncome, previousValue: prev?.totalIncome ?? null, isCurrency: true, isHighlight: true },
      { label: 'Wages (W-2)', currentValue: current.totalWages, previousValue: prev?.totalWages ?? null, isCurrency: true, isSubItem: true },
      { label: 'Self-Employment', currentValue: current.selfEmploymentIncome, previousValue: prev?.selfEmploymentIncome ?? null, isCurrency: true, isSubItem: true },
      { label: 'Interest Income', currentValue: current.totalInterest, previousValue: prev?.totalInterest ?? null, isCurrency: true, isSubItem: true },
      { label: 'Dividends', currentValue: current.totalDividends, previousValue: prev?.totalDividends ?? null, isCurrency: true, isSubItem: true },
      { label: 'Other Income', currentValue: current.otherIncome, previousValue: prev?.otherIncome ?? null, isCurrency: true, isSubItem: true },
      { label: 'Adjusted Gross Income', currentValue: current.adjustedGrossIncome, previousValue: prev?.adjustedGrossIncome ?? null, isCurrency: true, isHighlight: true },
      { label: 'Deductions', currentValue: current.deductionAmount, previousValue: prev?.deductionAmount ?? null, isCurrency: true },
      { label: 'Taxable Income', currentValue: current.taxableIncome, previousValue: prev?.taxableIncome ?? null, isCurrency: true, isHighlight: true },
      { label: 'Federal Tax', currentValue: current.federalTax, previousValue: prev?.federalTax ?? null, isCurrency: true },
      { label: 'SE Tax', currentValue: current.selfEmploymentTax, previousValue: prev?.selfEmploymentTax ?? null, isCurrency: true },
      { label: 'Total Tax', currentValue: current.totalTax, previousValue: prev?.totalTax ?? null, isCurrency: true, isHighlight: true },
      { label: 'Total Credits', currentValue: current.totalCredits, previousValue: prev?.totalCredits ?? null, isCurrency: true },
      { label: 'Federal Withholding', currentValue: current.totalFederalWithholding, previousValue: prev?.totalFederalWithholding ?? null, isCurrency: true },
      { label: 'Refund', currentValue: current.federalRefund, previousValue: prev?.federalRefund ?? null, isCurrency: true, isHighlight: true },
      { label: 'Amount Owed', currentValue: current.federalOwed, previousValue: prev?.federalOwed ?? null, isCurrency: true, isHighlight: true },
    ];
  });

  // Styles
  const containerStyle: JSX.CSSProperties = {
    padding: '1rem',
  };

  const tableStyle: JSX.CSSProperties = {
    width: '100%',
    'border-collapse': 'collapse',
    'font-size': '0.875rem',
  };

  const thStyle: JSX.CSSProperties = {
    padding: '0.75rem 1rem',
    'text-align': 'left',
    'font-weight': '600',
    color: 'var(--text-secondary)',
    'border-bottom': '2px solid var(--border-color)',
    'font-size': '0.8rem',
    'text-transform': 'uppercase',
    'letter-spacing': '0.05em',
  };

  const thRightStyle: JSX.CSSProperties = {
    ...thStyle,
    'text-align': 'right',
  };

  const tdStyle = (isSubItem?: boolean, isHighlight?: boolean): JSX.CSSProperties => ({
    padding: isSubItem ? '0.5rem 1rem 0.5rem 2rem' : '0.75rem 1rem',
    'border-bottom': '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    'font-weight': isHighlight ? '600' : '400',
    background: isHighlight ? 'var(--background-color)' : 'transparent',
  });

  const tdRightStyle = (isSubItem?: boolean, isHighlight?: boolean): JSX.CSSProperties => ({
    ...tdStyle(isSubItem, isHighlight),
    'text-align': 'right',
    'font-variant-numeric': 'tabular-nums',
  });

  const changeStyle = (pctChange: number | null): JSX.CSSProperties => ({
    'font-size': '0.75rem',
    'font-weight': '600',
    color: changeColor(pctChange),
    'white-space': 'nowrap',
  });

  const noDataStyle: JSX.CSSProperties = {
    'text-align': 'center',
    padding: '3rem 2rem',
    color: 'var(--text-secondary)',
  };

  const noDataIconStyle: JSX.CSSProperties = {
    'margin-bottom': '1rem',
  };

  const yearBadgeStyle = (color: string): JSX.CSSProperties => ({
    display: 'inline-flex',
    'align-items': 'center',
    gap: '0.25rem',
    padding: '0.25rem 0.5rem',
    'border-radius': '9999px',
    background: `${color}15`,
    color: color,
    'font-size': '0.75rem',
    'font-weight': '600',
  });

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={{
        display: 'flex',
        'align-items': 'center',
        'justify-content': 'space-between',
        'margin-bottom': '1rem',
      }}>
        <div style={{
          'font-weight': '600',
          'font-size': '1rem',
          color: 'var(--text-primary)',
          display: 'flex',
          'align-items': 'center',
          gap: '0.75rem',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          Year-Over-Year Comparison
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Show when={props.previousYearData}>
            <span style={yearBadgeStyle('#6b7280')}>
              {props.previousYearData!.taxYear}
            </span>
          </Show>
          <span style={yearBadgeStyle('#3b82f6')}>
            {props.currentYearData.taxYear}
          </span>
        </div>
      </div>

      {/* Comparison Table or No Data */}
      <Show
        when={props.previousYearData}
        fallback={
          <div style={noDataStyle}>
            <div style={noDataIconStyle}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
            </div>
            <div style={{ 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
              No Prior Year Data Available
            </div>
            <div style={{ 'font-size': '0.875rem' }}>
              Year-over-year comparison will be available once prior year data is loaded.
            </div>
          </div>
        }
      >
        <div style={{ overflow: 'auto', 'border': '1px solid var(--border-color)', 'border-radius': 'var(--border-radius-md)' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Category</th>
                <th style={thRightStyle}>{props.previousYearData!.taxYear}</th>
                <th style={thRightStyle}>{props.currentYearData.taxYear}</th>
                <th style={thRightStyle}>Change</th>
              </tr>
            </thead>
            <tbody>
              <For each={rows()}>
                {(row) => {
                  const pct = row.previousValue !== null
                    ? percentChange(row.currentValue, row.previousValue)
                    : null;

                  return (
                    <tr>
                      <td style={tdStyle(row.isSubItem, row.isHighlight)}>
                        {row.label}
                      </td>
                      <td style={tdRightStyle(row.isSubItem, row.isHighlight)}>
                        {row.previousValue !== null
                          ? formatCurrency(row.previousValue)
                          : '-'}
                      </td>
                      <td style={tdRightStyle(row.isSubItem, row.isHighlight)}>
                        {formatCurrency(row.currentValue)}
                      </td>
                      <td style={tdRightStyle(row.isSubItem, row.isHighlight)}>
                        <Show
                          when={pct !== null}
                          fallback={<span style={{ color: 'var(--text-muted)', 'font-size': '0.75rem' }}>--</span>}
                        >
                          <div style={{ display: 'flex', 'flex-direction': 'column', 'align-items': 'flex-end' }}>
                            <span style={changeStyle(pct)}>
                              {formatPercent(pct!)}
                            </span>
                            <span style={{ 'font-size': '0.7rem', color: 'var(--text-muted)' }}>
                              {row.previousValue !== null
                                ? formatCurrency(row.currentValue - row.previousValue)
                                : ''}
                            </span>
                          </div>
                        </Show>
                      </td>
                    </tr>
                  );
                }}
              </For>
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div style={{
          display: 'flex',
          gap: '1.5rem',
          'margin-top': '0.75rem',
          'font-size': '0.75rem',
          color: 'var(--text-secondary)',
        }}>
          <span style={{ display: 'flex', 'align-items': 'center', gap: '0.25rem' }}>
            <span style={{ width: '12px', height: '12px', 'border-radius': '2px', background: '#f59e0b' }} />
            {'> 10% change'}
          </span>
          <span style={{ display: 'flex', 'align-items': 'center', gap: '0.25rem' }}>
            <span style={{ width: '12px', height: '12px', 'border-radius': '2px', background: '#ef4444' }} />
            {'> 25% change'}
          </span>
        </div>
      </Show>
    </div>
  );
};

export default YearOverYearComparison;
