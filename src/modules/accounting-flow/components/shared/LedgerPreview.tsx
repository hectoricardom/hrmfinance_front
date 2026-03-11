import { Component, For, createMemo, JSX } from 'solid-js';

export interface LedgerEntry {
  account: string;
  debit?: number;
  credit?: number;
  description?: string;
}

interface LedgerPreviewProps {
  entries: LedgerEntry[];
}

const LedgerPreview: Component<LedgerPreviewProps> = (props) => {
  const containerStyle: JSX.CSSProperties = {
    background: 'var(--surface-color, #1e1e1e)',
    'border-radius': 'var(--border-radius, 8px)',
    padding: '1rem',
    border: '1px solid var(--border-color, #333)',
    overflow: 'auto',
  };

  const tableStyle: JSX.CSSProperties = {
    width: '100%',
    'border-collapse': 'collapse',
    'font-size': '0.875rem',
  };

  const headerRowStyle: JSX.CSSProperties = {
    'border-bottom': '2px solid var(--border-color, #333)',
  };

  const thStyle: JSX.CSSProperties = {
    padding: '0.75rem 1rem',
    'text-align': 'left',
    'font-weight': '600',
    color: 'var(--text-muted, #888)',
    'text-transform': 'uppercase',
    'font-size': '0.75rem',
    'letter-spacing': '0.05em',
  };

  const thRightStyle: JSX.CSSProperties = {
    ...thStyle,
    'text-align': 'right',
  };

  const tdStyle: JSX.CSSProperties = {
    padding: '0.75rem 1rem',
    color: 'var(--text-primary, #fff)',
    'border-bottom': '1px solid var(--border-color, #333)',
    'vertical-align': 'middle',
  };

  const tdRightStyle: JSX.CSSProperties = {
    ...tdStyle,
    'text-align': 'right',
    'font-family': 'monospace',
  };

  const accountStyle: JSX.CSSProperties = {
    display: 'inline-block',
    'font-weight': '500',
  };

  const debitStyle: JSX.CSSProperties = {
    color: '#3b82f6',
  };

  const creditStyle: JSX.CSSProperties = {
    color: '#10b981',
  };

  const totalsRowStyle: JSX.CSSProperties = {
    'border-top': '2px solid var(--border-color, #333)',
    'font-weight': '700',
    background: 'rgba(0, 0, 0, 0.2)',
  };

  const formatCurrency = (value?: number): string => {
    if (value === undefined || value === 0) return '-';
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const totals = createMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;

    for (const entry of props.entries) {
      totalDebit += entry.debit || 0;
      totalCredit += entry.credit || 0;
    }

    return { totalDebit, totalCredit };
  });

  const isBalanced = createMemo(() => {
    const { totalDebit, totalCredit } = totals();
    return Math.abs(totalDebit - totalCredit) < 0.01;
  });

  const difference = createMemo(() => {
    const { totalDebit, totalCredit } = totals();
    return Math.abs(totalDebit - totalCredit);
  });

  const balanceIndicatorStyle = createMemo((): JSX.CSSProperties => ({
    display: 'inline-flex',
    'align-items': 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    'border-radius': '6px',
    background: isBalanced() ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
    color: isBalanced() ? '#10b981' : '#ef4444',
    'font-weight': '700',
    'font-size': '0.875rem',
  }));

  const footerStyle: JSX.CSSProperties = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-top': '1rem',
    'padding-top': '1rem',
    'border-top': '1px solid var(--border-color, #333)',
  };

  return (
    <div style={containerStyle}>
      <table style={tableStyle}>
        <thead>
          <tr style={headerRowStyle}>
            <th style={thStyle}>Account</th>
            <th style={thRightStyle}>Debit</th>
            <th style={thRightStyle}>Credit</th>
          </tr>
        </thead>
        <tbody>
          <For each={props.entries}>
            {(entry) => (
              <tr>
                <td style={tdStyle}>
                  <span style={accountStyle}>{entry.account}</span>
                  {entry.description && (
                    <span
                      style={{
                        display: 'block',
                        'font-size': '0.75rem',
                        color: 'var(--text-muted, #888)',
                        'margin-top': '0.25rem',
                      }}
                    >
                      {entry.description}
                    </span>
                  )}
                </td>
                <td style={tdRightStyle}>
                  <span style={entry.debit ? debitStyle : {}}>
                    {formatCurrency(entry.debit)}
                  </span>
                </td>
                <td style={tdRightStyle}>
                  <span style={entry.credit ? creditStyle : {}}>
                    {formatCurrency(entry.credit)}
                  </span>
                </td>
              </tr>
            )}
          </For>
          <tr style={totalsRowStyle}>
            <td style={{ ...tdStyle, 'font-weight': '700' }}>TOTALS</td>
            <td style={{ ...tdRightStyle, 'font-weight': '700' }}>
              <span style={debitStyle}>{formatCurrency(totals().totalDebit)}</span>
            </td>
            <td style={{ ...tdRightStyle, 'font-weight': '700' }}>
              <span style={creditStyle}>{formatCurrency(totals().totalCredit)}</span>
            </td>
          </tr>
        </tbody>
      </table>

      <div style={footerStyle}>
        <span style={{ color: 'var(--text-muted, #888)', 'font-size': '0.875rem' }}>
          {props.entries.length} entries
        </span>
        <div style={balanceIndicatorStyle()}>
          <span>{isBalanced() ? '\u2713' : '\u2717'}</span>
          <span>{isBalanced() ? 'BALANCED' : 'UNBALANCED'}</span>
          {!isBalanced() && (
            <span style={{ 'font-weight': '400', 'font-size': '0.8rem' }}>
              (diff: {formatCurrency(difference())})
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default LedgerPreview;
