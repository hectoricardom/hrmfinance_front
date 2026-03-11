import { Component, For } from 'solid-js';
import { Card } from '../../ui';

export interface TaxSummary {
  year: number;
  grossIncome: number;
  totalExpenses: number;
  netProfit: number;
  categories: {
    name: string;
    scheduleLine: string;
    amount: number;
    percentage: number;
  }[];
  totalDeductions: number;
  estimatedTax: number;
}

interface TaxSummaryProps {
  summary: TaxSummary;
}

const TaxSummary: Component<TaxSummaryProps> = (props) => {
  const containerStyle = {
    padding: '1rem'
  };

  const statsGridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1.5rem',
    'margin-bottom': '2rem'
  };

  const statCardStyle = (isPrimary?: boolean) => ({
    padding: isPrimary ? '2rem' : '1.5rem',
    background: isPrimary ? 'linear-gradient(135deg, var(--primary-color), var(--primary-dark))' : 'var(--surface-color)',
    'border-radius': 'var(--border-radius)',
    border: isPrimary ? 'none' : '1px solid var(--border-color)',
    'box-shadow': isPrimary ? 'var(--shadow-md)' : 'var(--shadow-sm)',
    'text-align': 'center',
    transition: 'transform 0.2s ease',
    cursor: 'default'
  });

  const statLabelStyle = (isPrimary?: boolean) => ({
    'font-size': '0.875rem',
    color: isPrimary ? 'rgba(255, 255, 255, 0.9)' : 'var(--text-muted)',
    'text-transform': 'uppercase',
    'letter-spacing': '0.5px',
    'font-weight': '500',
    'margin-bottom': '0.75rem'
  });

  const statValueStyle = (isPrimary?: boolean, isNegative?: boolean) => ({
    'font-size': isPrimary ? '3rem' : '2rem',
    'font-weight': '700',
    color: isPrimary
      ? 'white'
      : isNegative
        ? '#dc3545'
        : '#28a745',
    margin: '0',
    'line-height': '1.2'
  });

  const statSubtextStyle = (isPrimary?: boolean) => ({
    'font-size': '0.75rem',
    color: isPrimary ? 'rgba(255, 255, 255, 0.8)' : 'var(--text-muted)',
    'margin-top': '0.5rem'
  });

  const tableContainerStyle = {
    'margin-top': '2rem',
    overflow: 'auto',
    'border-radius': 'var(--border-radius)',
    border: '1px solid var(--border-color)'
  };

  const tableStyle = {
    width: '100%',
    'border-collapse': 'collapse',
    background: 'var(--surface-color)'
  };

  const tableHeaderStyle = {
    background: 'var(--background-color)',
    'text-align': 'left',
    padding: '1rem',
    'font-weight': '600',
    'font-size': '0.875rem',
    color: 'var(--text-primary)',
    'border-bottom': '2px solid var(--border-color)',
    'text-transform': 'uppercase',
    'letter-spacing': '0.5px'
  };

  const tableCellStyle = {
    padding: '1rem',
    'border-bottom': '1px solid var(--border-color)',
    color: 'var(--text-secondary)'
  };

  const formLineStyle = {
    'font-size': '0.75rem',
    color: 'var(--text-muted)',
    'font-family': 'monospace',
    background: 'var(--background-color)',
    padding: '0.25rem 0.5rem',
    'border-radius': '4px',
    'margin-top': '0.25rem'
  };

  const percentageBarStyle = (percentage: number) => ({
    width: '100%',
    height: '6px',
    background: 'var(--background-color)',
    'border-radius': '3px',
    overflow: 'hidden',
    'margin-top': '0.5rem'
  });

  const percentageFillStyle = (percentage: number) => ({
    width: `${percentage}%`,
    height: '100%',
    background: 'linear-gradient(90deg, var(--primary-color), var(--primary-dark))',
    transition: 'width 0.3s ease'
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(1)}%`;
  };

  return (
    <div style={containerStyle}>
      <div style={statsGridStyle}>
        <div style={statCardStyle(true)}>
          <div style={statLabelStyle(true)}>Net Profit</div>
          <div style={statValueStyle(true, props.summary.netProfit < 0)}>
            {formatCurrency(props.summary.netProfit)}
          </div>
          <div style={statSubtextStyle(true)}>
            Tax Year {props.summary.year}
          </div>
        </div>

        <div style={statCardStyle()}>
          <div style={statLabelStyle()}>Gross Income</div>
          <div style={statValueStyle(false, false)}>
            {formatCurrency(props.summary.grossIncome)}
          </div>
        </div>

        <div style={statCardStyle()}>
          <div style={statLabelStyle()}>Total Expenses</div>
          <div style={statValueStyle(false, true)}>
            {formatCurrency(props.summary.totalExpenses)}
          </div>
        </div>

        <div style={statCardStyle()}>
          <div style={statLabelStyle()}>Total Deductions</div>
          <div style={statValueStyle(false, false)}>
            {formatCurrency(props.summary.totalDeductions)}
          </div>
        </div>

        <div style={statCardStyle()}>
          <div style={statLabelStyle()}>Estimated Tax</div>
          <div style={statValueStyle(false, true)}>
            {formatCurrency(props.summary.estimatedTax)}
          </div>
          <div style={statSubtextStyle()}>
            Based on 25% rate
          </div>
        </div>
      </div>

      <Card title="Category Breakdown" subtitle="Detailed breakdown by tax category">
        <div style={tableContainerStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={tableHeaderStyle}>Category</th>
                <th style={tableHeaderStyle}>Form Line</th>
                <th style={{ ...tableHeaderStyle, 'text-align': 'right' }}>Amount</th>
                <th style={{ ...tableHeaderStyle, 'text-align': 'right' }}>% of Total</th>
              </tr>
            </thead>
            <tbody>
              <For each={props.summary.categories}>
                {(category) => (
                  <tr>
                    <td style={tableCellStyle}>
                      <div style={{ 'font-weight': '600', color: 'var(--text-primary)' }}>
                        {category.name}
                      </div>
                      <div style={percentageBarStyle(category.percentage)}>
                        <div style={percentageFillStyle(category.percentage)} />
                      </div>
                    </td>
                    <td style={tableCellStyle}>
                      <div style={formLineStyle}>{category.scheduleLine}</div>
                    </td>
                    <td style={{ ...tableCellStyle, 'text-align': 'right', 'font-weight': '600' }}>
                      {formatCurrency(category.amount)}
                    </td>
                    <td style={{ ...tableCellStyle, 'text-align': 'right' }}>
                      {formatPercentage(category.percentage)}
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default TaxSummary;
