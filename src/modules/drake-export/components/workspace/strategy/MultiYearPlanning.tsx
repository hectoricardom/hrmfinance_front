/**
 * MultiYearPlanning - 3-Year Tax Planning View
 *
 * Shows a side-by-side comparison of last year (actual), current year
 * (calculated), and next year (projected) tax figures. Includes trend
 * indicators, a "What If" section for next-year projections, and a
 * div-based bar chart for visual tax liability comparison.
 */

import { Component, createSignal, createMemo, Show, For } from 'solid-js';
import type { TaxPortal } from '../../../types/drakeTypes';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface YearTaxData {
  year: number;
  totalIncome: number;
  agi: number;
  deductions: number;
  taxableIncome: number;
  federalTax: number;
  credits: number;
  effectiveRate: number; // percentage
  refundOrOwed: number;  // positive = refund, negative = owed
}

interface MultiYearPlanningProps {
  client: TaxPortal;
  currentYearCalc: YearTaxData | null;
  previousYearData: YearTaxData | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const INFLATION_RATE = 0.03; // 3% estimated inflation for projections

function projectNextYear(current: YearTaxData): YearTaxData {
  const inflated = (val: number) => Math.round(val * (1 + INFLATION_RATE));
  const nextIncome = inflated(current.totalIncome);
  const nextDeductions = inflated(current.deductions);
  const nextTaxableIncome = Math.max(0, nextIncome - nextDeductions);
  // Rough estimate: apply same effective rate
  const nextTax = Math.round(nextTaxableIncome * (current.effectiveRate / 100));
  const nextCredits = inflated(current.credits);
  const netTax = Math.max(0, nextTax - nextCredits);
  const effectiveRate = nextIncome > 0 ? Math.round((netTax / nextIncome) * 10000) / 100 : 0;
  return {
    year: current.year + 1,
    totalIncome: nextIncome,
    agi: inflated(current.agi),
    deductions: nextDeductions,
    taxableIncome: nextTaxableIncome,
    federalTax: nextTax,
    credits: nextCredits,
    effectiveRate,
    refundOrOwed: current.refundOrOwed > 0
      ? Math.round(current.refundOrOwed * 0.95) // Slight decrease assumption
      : Math.round(current.refundOrOwed * 1.05), // Slightly more owed
  };
}

function formatCurrency(amount: number): string {
  if (amount < 0) return '-$' + Math.abs(amount).toLocaleString();
  return '$' + amount.toLocaleString();
}

function formatRate(rate: number): string {
  return rate.toFixed(1) + '%';
}

type Trend = 'up' | 'down' | 'flat';

function getTrend(prev: number, current: number): Trend {
  const diff = current - prev;
  const threshold = Math.abs(prev) * 0.02; // 2% threshold
  if (diff > threshold) return 'up';
  if (diff < -threshold) return 'down';
  return 'flat';
}

function trendArrow(trend: Trend): string {
  if (trend === 'up') return '\u2191';
  if (trend === 'down') return '\u2193';
  return '\u2192';
}

function trendColor(trend: Trend, inverted: boolean = false): string {
  // For tax/owed: up is bad (red), down is good (green)
  // For refund/credits: up is good (green), down is bad (red)
  if (trend === 'flat') return 'var(--text-secondary, #6b7280)';
  if (inverted) {
    return trend === 'up' ? '#ef4444' : '#22c55e';
  }
  return trend === 'up' ? '#22c55e' : '#ef4444';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const MultiYearPlanning: Component<MultiYearPlanningProps> = (props) => {
  // What-If adjustments for next year projection
  const [incomeChange, setIncomeChange] = createSignal(0); // percentage change (-50 to +50)
  const [whatIfFilingStatus, setWhatIfFilingStatus] = createSignal<string>('same');

  // Current year data (default zeros if not provided)
  const currentYear = createMemo((): YearTaxData => {
    if (props.currentYearCalc) return props.currentYearCalc;
    const taxYear = props.client.taxYear || 2024;
    return {
      year: taxYear,
      totalIncome: 0,
      agi: 0,
      deductions: 0,
      taxableIncome: 0,
      federalTax: 0,
      credits: 0,
      effectiveRate: 0,
      refundOrOwed: 0,
    };
  });

  // Previous year data
  const prevYear = createMemo((): YearTaxData | null => {
    return props.previousYearData || null;
  });

  // Next year projection with What-If adjustments
  const nextYear = createMemo((): YearTaxData => {
    const base = projectNextYear(currentYear());
    const incomeAdj = 1 + incomeChange() / 100;

    const adjustedIncome = Math.round(base.totalIncome * incomeAdj);
    const adjustedAgi = Math.round(base.agi * incomeAdj);

    // Adjust deductions based on filing status change
    let deductions = base.deductions;
    if (whatIfFilingStatus() !== 'same') {
      const nextTaxYear = base.year;
      const stdDedMap: Record<string, number> = {
        single: nextTaxYear >= 2025 ? 15_000 : 14_600,
        married_filing_jointly: nextTaxYear >= 2025 ? 30_000 : 29_200,
        head_of_household: nextTaxYear >= 2025 ? 22_500 : 21_900,
        married_filing_separately: nextTaxYear >= 2025 ? 15_000 : 14_600,
      };
      deductions = stdDedMap[whatIfFilingStatus()] || deductions;
    }

    const taxableIncome = Math.max(0, adjustedIncome - deductions);
    const effectiveRate = base.effectiveRate;
    const federalTax = Math.round(taxableIncome * (effectiveRate / 100));
    const credits = base.credits;
    const netTax = Math.max(0, federalTax - credits);
    const finalRate = adjustedIncome > 0 ? Math.round((netTax / adjustedIncome) * 10000) / 100 : 0;

    return {
      year: base.year,
      totalIncome: adjustedIncome,
      agi: adjustedAgi,
      deductions,
      taxableIncome,
      federalTax,
      credits,
      effectiveRate: finalRate,
      refundOrOwed: base.refundOrOwed,
    };
  });

  // Row definitions
  interface RowDef {
    label: string;
    key: keyof YearTaxData;
    format: 'currency' | 'rate';
    invertTrend?: boolean; // true = lower is better (tax, owed)
  }

  const rows: RowDef[] = [
    { label: 'Total Income', key: 'totalIncome', format: 'currency' },
    { label: 'Adjusted Gross Income', key: 'agi', format: 'currency' },
    { label: 'Deductions', key: 'deductions', format: 'currency' },
    { label: 'Taxable Income', key: 'taxableIncome', format: 'currency', invertTrend: true },
    { label: 'Federal Tax', key: 'federalTax', format: 'currency', invertTrend: true },
    { label: 'Credits', key: 'credits', format: 'currency' },
    { label: 'Effective Rate', key: 'effectiveRate', format: 'rate', invertTrend: true },
    { label: 'Refund / Owed', key: 'refundOrOwed', format: 'currency' },
  ];

  const getValue = (data: YearTaxData, key: keyof YearTaxData): number => {
    return data[key] as number;
  };

  const formatValue = (val: number, format: 'currency' | 'rate'): string => {
    if (format === 'rate') return formatRate(val);
    return formatCurrency(val);
  };

  // Bar chart data
  const chartData = createMemo(() => {
    const years: { label: string; value: number; color: string }[] = [];
    if (prevYear()) {
      years.push({ label: String(prevYear()!.year), value: prevYear()!.federalTax, color: '#94a3b8' });
    }
    years.push({ label: String(currentYear().year), value: currentYear().federalTax, color: '#06b6d4' });
    years.push({ label: String(nextYear().year) + ' (proj)', value: nextYear().federalTax, color: '#8b5cf6' });
    return years;
  });

  const maxChartValue = createMemo(() => {
    return Math.max(1, ...chartData().map((d) => d.value));
  });

  // -----------------------------------------------------------------------
  // Styles
  // -----------------------------------------------------------------------

  const containerStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    gap: '1.5rem',
  };

  const sectionTitleStyle = {
    'font-weight': '700',
    'font-size': '1rem',
    color: 'var(--text-primary)',
    'margin-bottom': '0.75rem',
  };

  const tableWrapperStyle = {
    'overflow-x': 'auto' as const,
  };

  const tableStyle = {
    width: '100%',
    'border-collapse': 'collapse' as const,
    'font-size': '0.8125rem',
  };

  const thStyle = {
    padding: '0.625rem 0.75rem',
    background: 'var(--surface-alt, #f9fafb)',
    'font-weight': '700',
    'text-align': 'center' as const,
    'border-bottom': '2px solid var(--border-color, #e5e7eb)',
    color: 'var(--text-primary)',
    'font-size': '0.875rem',
  };

  const thLabelStyle = {
    ...thStyle,
    'text-align': 'left' as const,
    width: '180px',
    'min-width': '140px',
  };

  const tdStyle = {
    padding: '0.5rem 0.75rem',
    'border-bottom': '1px solid var(--border-color, #e5e7eb)',
    'text-align': 'right' as const,
    'font-variant-numeric': 'tabular-nums' as const,
    color: 'var(--text-primary)',
  };

  const tdLabelStyle = {
    ...tdStyle,
    'text-align': 'left' as const,
    'font-weight': '500',
    color: 'var(--text-secondary)',
  };

  const currentColStyle = {
    ...tdStyle,
    'font-weight': '600',
    background: '#06b6d410',
  };

  const projectedColStyle = {
    ...tdStyle,
    color: '#8b5cf6',
    'font-style': 'italic' as const,
  };

  const trendIndicatorStyle = (trend: Trend, inverted: boolean) => ({
    'font-size': '0.75rem',
    'font-weight': '600',
    color: trendColor(trend, inverted),
    'margin-left': '0.25rem',
  });

  // What-If section
  const whatIfContainerStyle = {
    background: 'var(--surface-alt, #f9fafb)',
    border: '1px solid var(--border-color, #e5e7eb)',
    'border-radius': 'var(--border-radius-lg, 12px)',
    padding: '1.25rem',
  };

  const whatIfRowStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '1rem',
    'flex-wrap': 'wrap' as const,
    'margin-bottom': '0.75rem',
  };

  const whatIfLabelStyle = {
    'font-size': '0.8125rem',
    'font-weight': '600',
    color: 'var(--text-secondary)',
    'min-width': '120px',
  };

  const sliderStyle = {
    width: '200px',
    cursor: 'pointer',
  };

  const selectStyle = {
    padding: '0.375rem 0.75rem',
    border: '1px solid var(--border-color, #e5e7eb)',
    'border-radius': 'var(--border-radius-md, 6px)',
    background: 'var(--surface, white)',
    color: 'var(--text-primary)',
    'font-size': '0.8125rem',
    cursor: 'pointer',
  };

  // Bar chart
  const chartContainerStyle = {
    background: 'var(--surface-alt, #f9fafb)',
    border: '1px solid var(--border-color, #e5e7eb)',
    'border-radius': 'var(--border-radius-lg, 12px)',
    padding: '1.25rem',
  };

  const chartRowStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.75rem',
    'margin-bottom': '0.75rem',
  };

  const chartLabelStyle = {
    'font-size': '0.8125rem',
    'font-weight': '500',
    color: 'var(--text-secondary)',
    'min-width': '90px',
    'text-align': 'right' as const,
  };

  const chartBarOuterStyle = {
    flex: '1',
    height: '28px',
    background: 'var(--surface, white)',
    'border-radius': '6px',
    overflow: 'hidden',
    position: 'relative' as const,
    border: '1px solid var(--border-color, #e5e7eb)',
  };

  const chartBarInnerStyle = (value: number, color: string) => {
    const pct = maxChartValue() > 0 ? (value / maxChartValue()) * 100 : 0;
    return {
      height: '100%',
      width: `${Math.max(pct, 2)}%`,
      background: color,
      'border-radius': '6px',
      transition: 'width 0.4s ease',
      display: 'flex',
      'align-items': 'center',
      'justify-content': 'flex-end',
      'padding-right': '0.5rem',
    };
  };

  const chartValueStyle = {
    'font-size': '0.75rem',
    'font-weight': '700',
    color: 'white',
    'white-space': 'nowrap' as const,
  };

  const chartExternalValueStyle = {
    'font-size': '0.8125rem',
    'font-weight': '600',
    color: 'var(--text-primary)',
    'min-width': '80px',
  };

  const naStyle = {
    ...tdStyle,
    color: 'var(--text-muted, #9ca3af)',
    'font-style': 'italic' as const,
    'text-align': 'center' as const,
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div style={containerStyle}>
      {/* Comparison Table */}
      <div>
        <div style={sectionTitleStyle}>3-Year Tax Comparison</div>
        <div style={tableWrapperStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thLabelStyle}></th>
                <Show when={prevYear()}>
                  <th style={thStyle}>
                    {prevYear()!.year}
                    <div style={{ 'font-size': '0.6875rem', 'font-weight': '400', color: 'var(--text-muted)' }}>Actual</div>
                  </th>
                </Show>
                <th style={{ ...thStyle, background: '#06b6d415' }}>
                  {currentYear().year}
                  <div style={{ 'font-size': '0.6875rem', 'font-weight': '400', color: '#06b6d4' }}>Current</div>
                </th>
                <th style={thStyle}>
                  {nextYear().year}
                  <div style={{ 'font-size': '0.6875rem', 'font-weight': '400', color: '#8b5cf6' }}>Projected</div>
                </th>
              </tr>
            </thead>
            <tbody>
              <For each={rows}>
                {(row) => {
                  const prevVal = prevYear() ? getValue(prevYear()!, row.key) : null;
                  const curVal = getValue(currentYear(), row.key);
                  const nextVal = getValue(nextYear(), row.key);

                  const prevToCurTrend = prevVal !== null ? getTrend(prevVal, curVal) : 'flat';
                  const curToNextTrend = getTrend(curVal, nextVal);

                  const isRefundRow = row.key === 'refundOrOwed';

                  return (
                    <tr>
                      <td style={tdLabelStyle}>{row.label}</td>
                      <Show when={prevYear()}>
                        <td style={prevVal !== null ? tdStyle : naStyle}>
                          {prevVal !== null ? formatValue(prevVal, row.format) : 'N/A'}
                        </td>
                      </Show>
                      <td style={currentColStyle}>
                        <span>{formatValue(curVal, row.format)}</span>
                        <Show when={prevVal !== null && prevToCurTrend !== 'flat'}>
                          <span style={trendIndicatorStyle(prevToCurTrend, !!row.invertTrend)}>
                            {trendArrow(prevToCurTrend)}
                          </span>
                        </Show>
                        <Show when={isRefundRow}>
                          <div style={{
                            'font-size': '0.6875rem',
                            color: curVal >= 0 ? '#22c55e' : '#ef4444',
                            'font-weight': '500',
                          }}>
                            {curVal >= 0 ? 'Refund' : 'Owed'}
                          </div>
                        </Show>
                      </td>
                      <td style={projectedColStyle}>
                        <span>{formatValue(nextVal, row.format)}</span>
                        <Show when={curToNextTrend !== 'flat'}>
                          <span style={trendIndicatorStyle(curToNextTrend, !!row.invertTrend)}>
                            {trendArrow(curToNextTrend)}
                          </span>
                        </Show>
                        <Show when={isRefundRow}>
                          <div style={{
                            'font-size': '0.6875rem',
                            color: nextVal >= 0 ? '#22c55e' : '#ef4444',
                            'font-weight': '500',
                          }}>
                            {nextVal >= 0 ? 'Refund' : 'Owed'}
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
      </div>

      {/* Bar Chart - Federal Tax Liability */}
      <div style={chartContainerStyle}>
        <div style={sectionTitleStyle}>Federal Tax Liability Trend</div>
        <For each={chartData()}>
          {(item) => (
            <div style={chartRowStyle}>
              <div style={chartLabelStyle}>{item.label}</div>
              <div style={chartBarOuterStyle}>
                <div style={chartBarInnerStyle(item.value, item.color)}>
                  <Show when={(item.value / maxChartValue()) > 0.25}>
                    <span style={chartValueStyle}>{formatCurrency(item.value)}</span>
                  </Show>
                </div>
              </div>
              <Show when={(item.value / maxChartValue()) <= 0.25}>
                <span style={chartExternalValueStyle}>{formatCurrency(item.value)}</span>
              </Show>
            </div>
          )}
        </For>
      </div>

      {/* What-If Section */}
      <div style={whatIfContainerStyle}>
        <div style={sectionTitleStyle}>
          What-If: {nextYear().year} Projections
        </div>

        {/* Income change slider */}
        <div style={whatIfRowStyle}>
          <span style={whatIfLabelStyle}>Income Change:</span>
          <input
            type="range"
            min="-50"
            max="50"
            step="5"
            value={incomeChange()}
            onInput={(e) => setIncomeChange(parseInt(e.currentTarget.value))}
            style={sliderStyle}
          />
          <span style={{
            'font-size': '0.875rem',
            'font-weight': '700',
            color: incomeChange() >= 0 ? '#22c55e' : '#ef4444',
            'min-width': '50px',
          }}>
            {incomeChange() >= 0 ? '+' : ''}{incomeChange()}%
          </span>
          <Show when={incomeChange() !== 0}>
            <button
              style={{
                padding: '0.25rem 0.625rem',
                background: 'transparent',
                border: '1px solid var(--border-color, #e5e7eb)',
                'border-radius': '4px',
                cursor: 'pointer',
                'font-size': '0.75rem',
                color: 'var(--text-muted)',
              }}
              onClick={() => setIncomeChange(0)}
            >
              Reset
            </button>
          </Show>
        </div>

        {/* Filing status change */}
        <div style={whatIfRowStyle}>
          <span style={whatIfLabelStyle}>Filing Status:</span>
          <select
            style={selectStyle}
            value={whatIfFilingStatus()}
            onChange={(e) => setWhatIfFilingStatus(e.currentTarget.value)}
          >
            <option value="same">Same as current ({props.client.filingStatus?.replace(/_/g, ' ') || 'single'})</option>
            <option value="single">Single</option>
            <option value="married_filing_jointly">Married Filing Jointly</option>
            <option value="married_filing_separately">Married Filing Separately</option>
            <option value="head_of_household">Head of Household</option>
          </select>
        </div>

        {/* Projected summary */}
        <div style={{
          display: 'flex',
          gap: '1.5rem',
          'margin-top': '1rem',
          'flex-wrap': 'wrap' as const,
        }}>
          <div style={{
            padding: '0.75rem 1rem',
            background: 'var(--surface, white)',
            'border-radius': '8px',
            border: '1px solid var(--border-color, #e5e7eb)',
            flex: '1',
            'min-width': '140px',
          }}>
            <div style={{ 'font-size': '0.6875rem', 'text-transform': 'uppercase', color: 'var(--text-muted)', 'font-weight': '600', 'letter-spacing': '0.05em' }}>
              Projected Income
            </div>
            <div style={{ 'font-size': '1.125rem', 'font-weight': '700', color: 'var(--text-primary)', 'margin-top': '0.25rem' }}>
              {formatCurrency(nextYear().totalIncome)}
            </div>
          </div>
          <div style={{
            padding: '0.75rem 1rem',
            background: 'var(--surface, white)',
            'border-radius': '8px',
            border: '1px solid var(--border-color, #e5e7eb)',
            flex: '1',
            'min-width': '140px',
          }}>
            <div style={{ 'font-size': '0.6875rem', 'text-transform': 'uppercase', color: 'var(--text-muted)', 'font-weight': '600', 'letter-spacing': '0.05em' }}>
              Projected Tax
            </div>
            <div style={{ 'font-size': '1.125rem', 'font-weight': '700', color: '#ef4444', 'margin-top': '0.25rem' }}>
              {formatCurrency(nextYear().federalTax)}
            </div>
          </div>
          <div style={{
            padding: '0.75rem 1rem',
            background: 'var(--surface, white)',
            'border-radius': '8px',
            border: '1px solid var(--border-color, #e5e7eb)',
            flex: '1',
            'min-width': '140px',
          }}>
            <div style={{ 'font-size': '0.6875rem', 'text-transform': 'uppercase', color: 'var(--text-muted)', 'font-weight': '600', 'letter-spacing': '0.05em' }}>
              Effective Rate
            </div>
            <div style={{ 'font-size': '1.125rem', 'font-weight': '700', color: '#8b5cf6', 'margin-top': '0.25rem' }}>
              {formatRate(nextYear().effectiveRate)}
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div style={{
          'margin-top': '1rem',
          'font-size': '0.75rem',
          color: 'var(--text-muted, #9ca3af)',
          'font-style': 'italic',
        }}>
          Projections are estimates based on {INFLATION_RATE * 100}% inflation adjustment and current tax rates.
          Actual results may vary based on legislative changes, life events, and final income figures.
          {/* TODO: Fetch previous year data via fetchGraphQLSS for actual prior year comparison */}
        </div>
      </div>
    </div>
  );
};

export default MultiYearPlanning;
