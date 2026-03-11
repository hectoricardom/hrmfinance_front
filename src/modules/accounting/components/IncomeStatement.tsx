import { Component, createSignal, createEffect, For, Show } from 'solid-js';
import { Card } from '../../ui';
import { getIncomeStatement, IncomeStatementReport, AccountBalance } from '../services/accountingApi';

interface IncomeStatementProps {
  startDate: string;
  endDate: string;
}

const IncomeStatement: Component<IncomeStatementProps> = (props) => {
  const [data, setData] = createSignal<IncomeStatementReport | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  const loadIncomeStatement = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getIncomeStatement(props.startDate, props.endDate);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load income statement');
      console.error('Error loading income statement:', err);
    } finally {
      setLoading(false);
    }
  };

  createEffect(() => {
    if (props.startDate && props.endDate) {
      loadIncomeStatement();
    }
  });

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const containerStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    gap: '1.5rem'
  };

  const headerStyle = {
    'text-align': 'center' as const,
    'margin-bottom': '1rem',
    'padding-bottom': '1rem',
    'border-bottom': '2px solid var(--border-color)'
  };

  const titleStyle = {
    'font-size': '1.5rem',
    'font-weight': '700',
    color: 'var(--text-primary)',
    margin: '0 0 0.5rem 0'
  };

  const dateRangeStyle = {
    'font-size': '0.875rem',
    color: 'var(--text-muted)',
    margin: '0'
  };

  const sectionStyle = {
    'margin-bottom': '1.5rem'
  };

  const sectionTitleStyle = {
    'font-size': '1.125rem',
    'font-weight': '600',
    color: 'var(--text-primary)',
    margin: '0 0 1rem 0',
    'padding-bottom': '0.5rem',
    'border-bottom': '1px solid var(--border-color)'
  };

  const accountRowStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    padding: '0.5rem 0',
    'border-bottom': '1px solid var(--border-light)'
  };

  const subAccountRowStyle = {
    ...accountRowStyle,
    'padding-left': '2rem',
    'font-size': '0.875rem',
    color: 'var(--text-muted)'
  };

  const accountNameStyle = {
    flex: '1',
    color: 'var(--text-primary)'
  };

  const accountBalanceStyle = {
    'font-weight': '500',
    'text-align': 'right' as const,
    'min-width': '120px'
  };

  const totalRowStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    padding: '1rem 0',
    'margin-top': '0.5rem',
    'border-top': '2px solid var(--border-color)',
    'font-weight': '700',
    'font-size': '1.125rem'
  };

  const profitRowStyle = (isProfit: boolean) => ({
    ...totalRowStyle,
    background: isProfit ? 'var(--success-light)' : 'var(--error-light)',
    color: isProfit ? 'var(--success-color)' : 'var(--error-color)',
    padding: '1rem',
    'border-radius': 'var(--border-radius-sm)',
    'margin-top': '1rem'
  });

  const netIncomeStyle = (netIncome: number) => ({
    ...totalRowStyle,
    background: netIncome >= 0 ? 'var(--success-color)' : 'var(--error-color)',
    color: 'white',
    padding: '1rem',
    'border-radius': 'var(--border-radius-sm)',
    'margin-top': '1.5rem',
    'font-size': '1.25rem'
  });

  const loadingStyle = {
    'text-align': 'center' as const,
    padding: '2rem',
    color: 'var(--text-muted)'
  };

  const errorStyle = {
    'text-align': 'center' as const,
    padding: '2rem',
    color: 'var(--error-color)',
    background: 'var(--error-light)',
    'border-radius': 'var(--border-radius-sm)'
  };

  const renderAccountSection = (accounts: AccountBalance[]) => (
    <For each={accounts}>
      {(account) => (
        <div style={accountRowStyle}>
          <span style={accountNameStyle}>
            {account.accountId}
          </span>
          <span style={accountBalanceStyle}>
            {formatCurrency(account.balance)}
          </span>
        </div>
      )}
    </For>
  );

  return (
    <Card>
      <Show when={loading()}>
        <div style={loadingStyle}>Loading income statement...</div>
      </Show>

      <Show when={error()}>
        <div style={errorStyle}>{error()}</div>
      </Show>

      <Show when={!loading() && !error() && data()}>
        <div style={containerStyle}>
          <div style={headerStyle}>
            <h2 style={titleStyle}>Income Statement</h2>
            <p style={dateRangeStyle}>
              {formatDate(data()!.startDate)} - {formatDate(data()!.endDate)}
            </p>
          </div>

          {/* Revenue Section */}
          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>REVENUE</h3>
            {renderAccountSection(data()!.revenue.accounts)}
            <div style={totalRowStyle}>
              <span>Total Revenue</span>
              <span>{formatCurrency(data()!.totalRevenue)}</span>
            </div>
          </div>

          {/* Expenses Section */}
          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>EXPENSES</h3>
            {renderAccountSection(data()!.expenses.accounts)}
            <div style={totalRowStyle}>
              <span>Total Expenses</span>
              <span>{formatCurrency(data()!.totalExpenses)}</span>
            </div>
          </div>

          {/* Gross Profit */}
          <div style={profitRowStyle(data()!.grossProfit >= 0)}>
            <span>Gross Profit</span>
            <span>{formatCurrency(data()!.grossProfit)}</span>
          </div>

          {/* Net Income */}
          <div style={netIncomeStyle(data()!.netIncome)}>
            <span>Net Income</span>
            <span>{formatCurrency(data()!.netIncome)}</span>
          </div>
        </div>
      </Show>
    </Card>
  );
};

export default IncomeStatement;
