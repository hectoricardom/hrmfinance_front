import { Component, createSignal, createEffect, For, Show } from 'solid-js';
import { Card } from '../../ui';
import { getTrialBalance, TrialBalanceReport } from '../services/accountingApi';

interface TrialBalanceProps {
  asOfDate: string;
}

const TrialBalance: Component<TrialBalanceProps> = (props) => {
  const [data, setData] = createSignal<TrialBalanceReport | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  const loadTrialBalance = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getTrialBalance(props.asOfDate);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trial balance');
      console.error('Error loading trial balance:', err);
    } finally {
      setLoading(false);
    }
  };

  createEffect(() => {
    if (props.asOfDate) {
      loadTrialBalance();
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

  const tableContainerStyle = {
    'overflow-x': 'auto' as const
  };

  const tableStyle = {
    width: '100%',
    'border-collapse': 'collapse' as const,
    'font-size': '0.875rem'
  };

  const theadStyle = {
    background: 'var(--surface-hover)',
    'border-bottom': '2px solid var(--border-color)'
  };

  const thStyle = {
    padding: '0.75rem',
    'text-align': 'left' as const,
    'font-weight': '600',
    color: 'var(--text-primary)'
  };

  const thRightStyle = {
    ...thStyle,
    'text-align': 'right' as const
  };

  const trStyle = {
    'border-bottom': '1px solid var(--border-light)'
  };

  const tdStyle = {
    padding: '0.75rem',
    color: 'var(--text-primary)'
  };

  const tdRightStyle = {
    ...tdStyle,
    'text-align': 'right' as const,
    'font-weight': '500'
  };

  const totalRowStyle = {
    'border-top': '2px solid var(--border-color)',
    background: 'var(--surface-hover)',
    'font-weight': '700'
  };

  const balanceIndicatorStyle = (isBalanced: boolean) => ({
    display: 'inline-block',
    padding: '0.5rem 1rem',
    'border-radius': 'var(--border-radius-sm)',
    background: isBalanced ? 'var(--success-light)' : 'var(--error-light)',
    color: isBalanced ? 'var(--success-color)' : 'var(--error-color)',
    'font-weight': '600',
    'text-align': 'center' as const,
    'margin-top': '1rem'
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

  const statusContainerStyle = {
    'text-align': 'center' as const
  };

  return (
    <Card>
      <Show when={loading()}>
        <div style={loadingStyle}>Loading trial balance...</div>
      </Show>

      <Show when={error()}>
        <div style={errorStyle}>{error()}</div>
      </Show>

      <Show when={!loading() && !error() && data()}>
        <div style={containerStyle}>
          <div style={headerStyle}>
            <h2 style={titleStyle}>Trial Balance</h2>
            <p style={dateStyle}>As of {formatDate(data()!.asOfDate)}</p>
          </div>

          <div style={tableContainerStyle}>
            <table style={tableStyle}>
              <thead style={theadStyle}>
                <tr>
                  <th style={thStyle}>Account Code</th>
                  <th style={thStyle}>Account Name</th>
                  <th style={thRightStyle}>Debit</th>
                  <th style={thRightStyle}>Credit</th>
                </tr>
              </thead>
              <tbody>
                <For each={data()!.accounts}>
                  {(account) => (
                    <tr style={trStyle}>
                      <td style={tdStyle}>{account.accountNumber}</td>
                      <td style={tdStyle}>{account.accountName}</td>
                      <td style={tdRightStyle}>
                        {account.debit > 0 ? formatCurrency(account.debit) : '-'}
                      </td>
                      <td style={tdRightStyle}>
                        {account.credit > 0 ? formatCurrency(account.credit) : '-'}
                      </td>
                    </tr>
                  )}
                </For>
                <tr style={totalRowStyle}>
                  <td style={tdStyle} colspan={2}>Total</td>
                  <td style={tdRightStyle}>{formatCurrency(data()!.totalDebit)}</td>
                  <td style={tdRightStyle}>{formatCurrency(data()!.totalCredit)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={statusContainerStyle}>
            <div style={balanceIndicatorStyle(data()!.isBalanced)}>
              {data()!.isBalanced ? 'In Balance' : 'Out of Balance'}
            </div>
          </div>
        </div>
      </Show>
    </Card>
  );
};

export default TrialBalance;
