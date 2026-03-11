import { Component, For, Show, createMemo } from 'solid-js';

// Types
interface LedgerEntry {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description?: string;
}

interface EntryTotals {
  totalDebits: number;
  totalCredits: number;
}

interface EntryMetadata {
  date: string;
  reference: string;
  documentNumber: string;
  description?: string;
  createdBy?: string;
  status?: 'draft' | 'pending' | 'posted';
}

interface Stage6EntryBookGenProps {
  entries: LedgerEntry[];
  totals: EntryTotals;
  isBalanced: boolean;
  metadata: EntryMetadata;
}

const Stage6EntryBookGen: Component<Stage6EntryBookGenProps> = (props) => {
  // Styles
  const containerStyle = {
    padding: '1.5rem',
    background: 'var(--surface-color, #ffffff)',
    'border-radius': 'var(--border-radius, 8px)',
    border: '1px solid var(--border-color, #e0e0e0)',
    'box-shadow': 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.1))'
  };

  const headerStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '1rem',
    'margin-bottom': '1.5rem'
  };

  const badgeStyle = {
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    width: '32px',
    height: '32px',
    'border-radius': '50%',
    background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    color: 'white',
    'font-weight': '700',
    'font-size': '1rem'
  };

  const titleStyle = {
    'font-size': '1.25rem',
    'font-weight': '600',
    color: 'var(--text-primary, #1a1a1a)',
    margin: '0'
  };

  const metadataContainerStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '1rem',
    padding: '1rem',
    background: '#f8f9fa',
    'border-radius': '8px',
    'margin-bottom': '1.5rem'
  };

  const metadataItemStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    gap: '0.25rem'
  };

  const metadataLabelStyle = {
    'font-size': '0.75rem',
    'text-transform': 'uppercase' as const,
    color: 'var(--text-muted, #666666)',
    'font-weight': '500'
  };

  const metadataValueStyle = {
    'font-size': '0.875rem',
    'font-weight': '600',
    color: 'var(--text-primary, #1a1a1a)'
  };

  const statusBadgeStyle = (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      draft: { bg: '#e0e0e0', text: '#616161' },
      pending: { bg: '#fff3e0', text: '#ef6c00' },
      posted: { bg: '#e8f5e9', text: '#2e7d32' }
    };
    const { bg, text } = colors[status] || colors.draft;

    return {
      display: 'inline-block',
      padding: '0.25rem 0.75rem',
      'border-radius': '16px',
      background: bg,
      color: text,
      'font-size': '0.75rem',
      'font-weight': '600',
      'text-transform': 'uppercase' as const
    };
  };

  const ledgerTableStyle = {
    width: '100%',
    background: 'white',
    'border-radius': '8px',
    overflow: 'hidden',
    border: '1px solid var(--border-color, #e0e0e0)',
    'border-collapse': 'collapse' as const,
    'margin-bottom': '1rem'
  };

  const tableHeaderRowStyle = {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white'
  };

  const tableHeaderCellStyle = {
    padding: '1rem',
    'text-align': 'left' as const,
    'font-weight': '600',
    'font-size': '0.875rem',
    'border-bottom': '2px solid rgba(255,255,255,0.2)'
  };

  const tableRowStyle = (index: number) => ({
    background: index % 2 === 0 ? 'white' : '#fafafa',
    transition: 'background 0.2s ease'
  });

  const tableCellStyle = {
    padding: '0.875rem 1rem',
    'border-bottom': '1px solid #f0f0f0',
    'vertical-align': 'top' as const
  };

  const accountCodeCellStyle = {
    ...tableCellStyle,
    'font-family': 'monospace',
    'font-weight': '600',
    color: '#1976D2',
    'white-space': 'nowrap' as const
  };

  const amountCellStyle = (hasValue: boolean, isDebit: boolean) => ({
    ...tableCellStyle,
    'text-align': 'right' as const,
    'font-family': 'monospace',
    'font-weight': hasValue ? '600' : '400',
    color: hasValue ? (isDebit ? '#1976D2' : '#C62828') : 'var(--text-muted, #999999)'
  });

  const subtotalRowStyle = {
    background: '#f5f5f5',
    'font-weight': '600'
  };

  const subtotalCellStyle = {
    padding: '0.875rem 1rem',
    'border-top': '2px solid #e0e0e0',
    'font-weight': '600'
  };

  const balanceValidationStyle = (isBalanced: boolean) => ({
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    gap: '0.75rem',
    padding: '1rem 1.5rem',
    background: isBalanced
      ? 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)'
      : 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)',
    'border-radius': '8px',
    'margin-top': '1rem',
    border: `2px solid ${isBalanced ? '#4CAF50' : '#F44336'}`
  });

  const validationIconStyle = (isBalanced: boolean) => ({
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    width: '32px',
    height: '32px',
    'border-radius': '50%',
    background: isBalanced ? '#4CAF50' : '#F44336',
    color: 'white',
    'font-size': '1.25rem',
    'font-weight': '700'
  });

  const validationTextStyle = (isBalanced: boolean) => ({
    display: 'flex',
    'flex-direction': 'column' as const,
    color: isBalanced ? '#2e7d32' : '#c62828'
  });

  const formatCurrency = (amount: number) => {
    if (amount === 0) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Calculate difference for unbalanced entries
  const difference = createMemo(() => {
    return Math.abs(props.totals.totalDebits - props.totals.totalCredits);
  });

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={badgeStyle}>6</div>
        <h3 style={titleStyle}>Ledger Entry Generation</h3>
      </div>

      {/* Entry Metadata */}
      <div style={metadataContainerStyle}>
        <div style={metadataItemStyle}>
          <span style={metadataLabelStyle}>Date</span>
          <span style={metadataValueStyle}>{formatDate(props.metadata.date)}</span>
        </div>
        <div style={metadataItemStyle}>
          <span style={metadataLabelStyle}>Reference</span>
          <span style={metadataValueStyle}>{props.metadata.reference}</span>
        </div>
        <div style={metadataItemStyle}>
          <span style={metadataLabelStyle}>Document No.</span>
          <span style={metadataValueStyle}>{props.metadata.documentNumber}</span>
        </div>
        <Show when={props.metadata.createdBy}>
          <div style={metadataItemStyle}>
            <span style={metadataLabelStyle}>Created By</span>
            <span style={metadataValueStyle}>{props.metadata.createdBy}</span>
          </div>
        </Show>
        <Show when={props.metadata.status}>
          <div style={metadataItemStyle}>
            <span style={metadataLabelStyle}>Status</span>
            <span style={statusBadgeStyle(props.metadata.status!)}>{props.metadata.status}</span>
          </div>
        </Show>
      </div>

      {/* Description */}
      <Show when={props.metadata.description}>
        <div style={{
          padding: '0.75rem 1rem',
          background: '#e3f2fd',
          'border-radius': '6px',
          'margin-bottom': '1.5rem',
          'font-size': '0.875rem',
          color: '#1565C0'
        }}>
          <strong>Description:</strong> {props.metadata.description}
        </div>
      </Show>

      {/* Ledger Preview Table */}
      <table style={ledgerTableStyle}>
        <thead>
          <tr style={tableHeaderRowStyle}>
            <th style={{ ...tableHeaderCellStyle, width: '100px' }}>Account Code</th>
            <th style={tableHeaderCellStyle}>Account Name</th>
            <th style={{ ...tableHeaderCellStyle, width: '140px', 'text-align': 'right' }}>Debit</th>
            <th style={{ ...tableHeaderCellStyle, width: '140px', 'text-align': 'right' }}>Credit</th>
          </tr>
        </thead>
        <tbody>
          <For each={props.entries}>
            {(entry, index) => (
              <tr style={tableRowStyle(index())}>
                <td style={accountCodeCellStyle}>{entry.accountCode}</td>
                <td style={tableCellStyle}>
                  <div>{entry.accountName}</div>
                  <Show when={entry.description}>
                    <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted, #999999)', 'margin-top': '0.25rem' }}>
                      {entry.description}
                    </div>
                  </Show>
                </td>
                <td style={amountCellStyle(entry.debit > 0, true)}>
                  {formatCurrency(entry.debit)}
                </td>
                <td style={amountCellStyle(entry.credit > 0, false)}>
                  {formatCurrency(entry.credit)}
                </td>
              </tr>
            )}
          </For>

          {/* Subtotals Row */}
          <tr style={subtotalRowStyle}>
            <td style={{ ...subtotalCellStyle, 'text-align': 'right' }} colspan="2">
              <strong>TOTALS</strong>
            </td>
            <td style={{ ...subtotalCellStyle, 'text-align': 'right', 'font-family': 'monospace', color: '#1976D2' }}>
              {formatCurrency(props.totals.totalDebits)}
            </td>
            <td style={{ ...subtotalCellStyle, 'text-align': 'right', 'font-family': 'monospace', color: '#C62828' }}>
              {formatCurrency(props.totals.totalCredits)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Balance Validation */}
      <div style={balanceValidationStyle(props.isBalanced)}>
        <div style={validationIconStyle(props.isBalanced)}>
          {props.isBalanced ? '✓' : '!'}
        </div>
        <div style={validationTextStyle(props.isBalanced)}>
          <strong style={{ 'font-size': '1rem' }}>
            {props.isBalanced ? 'Entry Balanced' : 'Entry Unbalanced'}
          </strong>
          <span style={{ 'font-size': '0.875rem' }}>
            {props.isBalanced
              ? `Total Debits (${formatCurrency(props.totals.totalDebits)}) = Total Credits (${formatCurrency(props.totals.totalCredits)})`
              : `Difference: ${formatCurrency(difference())}`
            }
          </span>
        </div>
      </div>

      {/* Balance Equation */}
      <div style={{
        'margin-top': '1rem',
        padding: '0.75rem',
        background: '#f5f5f5',
        'border-radius': '6px',
        'text-align': 'center',
        'font-family': 'monospace',
        'font-size': '0.875rem'
      }}>
        <span style={{ color: '#1976D2', 'font-weight': '600' }}>
          {formatCurrency(props.totals.totalDebits)}
        </span>
        <span style={{ margin: '0 0.5rem', color: props.isBalanced ? '#4CAF50' : '#F44336' }}>
          {props.isBalanced ? '=' : '!='}
        </span>
        <span style={{ color: '#C62828', 'font-weight': '600' }}>
          {formatCurrency(props.totals.totalCredits)}
        </span>
      </div>

      {/* Empty State */}
      <Show when={props.entries.length === 0}>
        <div style={{
          padding: '3rem',
          'text-align': 'center',
          color: 'var(--text-muted, #999999)',
          background: '#f8f9fa',
          'border-radius': '8px'
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style={{ opacity: 0.5, 'margin-bottom': '1rem' }}>
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <line x1="3" y1="9" x2="21" y2="9"/>
            <line x1="9" y1="21" x2="9" y2="9"/>
          </svg>
          <div>No journal entries to display</div>
        </div>
      </Show>
    </div>
  );
};

export default Stage6EntryBookGen;
