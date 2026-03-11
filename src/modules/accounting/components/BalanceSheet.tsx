import { Component, createSignal, createEffect, For, Show } from 'solid-js';
import { Card } from '../../ui';
import { getBalanceSheet, BalanceSheetReport, AccountBalance } from '../services/accountingApi';

interface BalanceSheetProps {
  asOfDate: string;
}

const BalanceSheet: Component<BalanceSheetProps> = (props) => {
  const [data, setData] = createSignal<BalanceSheetReport | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  const loadBalanceSheet = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getBalanceSheet(props.asOfDate);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load balance sheet');
      console.error('Error loading balance sheet:', err);
    } finally {
      setLoading(false);
    }
  };

  createEffect(() => {
    if (props.asOfDate) {
      loadBalanceSheet();
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

  const dateStyle = {
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

  const grandTotalStyle = {
    ...totalRowStyle,
    background: 'var(--primary-light)',
    padding: '1rem',
    'border-radius': 'var(--border-radius-sm)',
    'margin-top': '1.5rem'
  };

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
        <div style={loadingStyle}>Loading balance sheet...</div>
      </Show>

      <Show when={error()}>
        <div style={errorStyle}>{error()}</div>
      </Show>

      <Show when={!loading() && !error() && data()}>
        <div style={containerStyle}>
          <div style={headerStyle}>
            <h2 style={titleStyle}>Balance Sheet</h2>
            <p style={dateStyle}>As of {formatDate(data()!.asOfDate)}</p>
          </div>

          {/* Assets Section */}
          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>ASSETS</h3>
            {renderAccountSection(data()!.assets.accounts)}
            <div style={totalRowStyle}>
              <span>Total Assets</span>
              <span>{formatCurrency(data()!.totalAssets)}</span>
            </div>
          </div>

          {/* Liabilities Section */}
          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>LIABILITIES</h3>
            {renderAccountSection(data()!.liabilities.accounts)}
            <div style={totalRowStyle}>
              <span>Total Liabilities</span>
              <span>{formatCurrency(data()!.totalLiabilities)}</span>
            </div>
          </div>

          {/* Equity Section */}
          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>EQUITY</h3>
            {renderAccountSection(data()!.equity.accounts)}
            <div style={totalRowStyle}>
              <span>Total Equity</span>
              <span>{formatCurrency(data()!.totalEquity)}</span>
            </div>
          </div>

          {/* Grand Total */}
          <div style={grandTotalStyle}>
            <span>Total Liabilities & Equity</span>
            <span>{formatCurrency(data()!.totalLiabilities + data()!.totalEquity)}</span>
          </div>
        </div>
      </Show>
    </Card>
  );
};

export default BalanceSheet;
