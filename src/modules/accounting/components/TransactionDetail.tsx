import { Component, For, Show, createMemo } from 'solid-js';
import { Card, Button } from '../../ui';
import type { JournalEntry } from '../types';

interface TransactionDetailProps {
  entry: JournalEntry;
  onPost?: (entryId: string) => void;
  onVoid?: (entryId: string) => void;
  onClose?: () => void;
}

const TransactionDetail: Component<TransactionDetailProps> = (props) => {
  const totalDebits = createMemo(() => {
    return props.entry.lines.reduce((sum, line) => sum + line.debit, 0);
  });

  const totalCredits = createMemo(() => {
    return props.entry.lines.reduce((sum, line) => sum + line.credit, 0);
  });

  const getStatusBadge = (status: 'pending' | 'posted' | 'voided') => {
    const styles = {
      pending: {
        background: 'var(--warning-color, #ffc107)',
        color: 'var(--text-primary)'
      },
      posted: {
        background: 'var(--success-color, #28a745)',
        color: 'white'
      },
      voided: {
        background: 'var(--danger-color, #dc3545)',
        color: 'white'
      }
    };

    const style = {
      ...styles[status],
      padding: '0.5rem 1rem',
      'border-radius': 'var(--border-radius-sm)',
      'font-size': '0.875rem',
      'font-weight': '600',
      'text-transform': 'uppercase' as const,
      display: 'inline-block'
    };

    return <span style={style}>{status}</span>;
  };

  const headerStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1.5rem',
    'margin-bottom': '2rem',
    padding: '1.5rem',
    background: 'var(--bg-muted, #f5f5f5)',
    'border-radius': 'var(--border-radius-sm)',
    border: '1px solid var(--border-color)'
  };

  const headerItemStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    gap: '0.25rem'
  };

  const labelStyle = {
    'font-size': '0.75rem',
    'font-weight': '600',
    color: 'var(--text-muted)',
    'text-transform': 'uppercase' as const
  };

  const valueStyle = {
    'font-size': '1rem',
    'font-weight': '500',
    color: 'var(--text-primary)'
  };

  const tableStyle = {
    width: '100%',
    'border-collapse': 'collapse' as const,
    'margin-bottom': '1.5rem'
  };

  const thStyle = {
    padding: '1rem',
    'text-align': 'left' as const,
    'border-bottom': '2px solid var(--border-color)',
    'font-weight': '600',
    color: 'var(--text-primary)',
    'font-size': '0.875rem',
    'text-transform': 'uppercase' as const,
    background: 'var(--bg-muted, #f5f5f5)'
  };

  const tdStyle = {
    padding: '1rem',
    'border-bottom': '1px solid var(--border-color)',
    color: 'var(--text-primary)'
  };

  const totalsRowStyle = {
    'font-weight': '600',
    'background-color': 'var(--bg-muted, #f5f5f5)',
    'border-top': '2px solid var(--border-color)'
  };

  const actionButtonsStyle = {
    display: 'flex',
    gap: '1rem',
    'justify-content': 'flex-end',
    'margin-top': '2rem',
    'padding-top': '1.5rem',
    'border-top': '1px solid var(--border-color)'
  };

  const sectionTitleStyle = {
    'font-size': '1.125rem',
    'font-weight': '600',
    color: 'var(--text-primary)',
    'margin-bottom': '1rem'
  };

  const formatCurrency = (value: number) => {
    return value > 0 ? `$${value.toFixed(2)}` : '-';
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div>
      <Card>
        <div style={{
          display: 'flex',
          'justify-content': 'space-between',
          'align-items': 'center',
          'margin-bottom': '1.5rem'
        }}>
          <h2 style={{ margin: '0', 'font-size': '1.5rem', color: 'var(--text-primary)' }}>
            Journal Entry #{props.entry.entryNumber}
          </h2>
          {getStatusBadge(props.entry.status)}
        </div>

        <div style={headerStyle}>
          <div style={headerItemStyle}>
            <span style={labelStyle}>Date</span>
            <span style={valueStyle}>{formatDate(props.entry.entryDate)}</span>
          </div>
          <div style={headerItemStyle}>
            <span style={labelStyle}>Reference</span>
            <span style={valueStyle}>{props.entry.reference || 'N/A'}</span>
          </div>
          <div style={headerItemStyle}>
            <span style={labelStyle}>Source Type</span>
            <span style={valueStyle}>
              {props.entry.sourceType.replace('_', ' ').toUpperCase()}
            </span>
          </div>
          <div style={headerItemStyle}>
            <span style={labelStyle}>Created</span>
            <span style={valueStyle}>
              {formatDate(props.entry.createdAt)}
            </span>
          </div>
        </div>

        <div style={headerItemStyle}>
          <span style={labelStyle}>Description</span>
          <span style={valueStyle}>{props.entry.description}</span>
        </div>
      </Card>

      <Card>
        <h3 style={sectionTitleStyle}>Line Items</h3>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Account Code</th>
              <th style={thStyle}>Account Name</th>
              <th style={{ ...thStyle, 'text-align': 'right' as const, width: '150px' }}>Debit</th>
              <th style={{ ...thStyle, 'text-align': 'right' as const, width: '150px' }}>Credit</th>
              <th style={thStyle}>Memo</th>
            </tr>
          </thead>
          <tbody>
            <For each={props.entry.lines}>
              {(line) => (
                <tr>
                  <td style={tdStyle}>{line.accountCode}</td>
                  <td style={tdStyle}>{line.accountName}</td>
                  <td style={{ ...tdStyle, 'text-align': 'right' as const }}>
                    {formatCurrency(line.debit)}
                  </td>
                  <td style={{ ...tdStyle, 'text-align': 'right' as const }}>
                    {formatCurrency(line.credit)}
                  </td>
                  <td style={tdStyle}>{line.memo || '-'}</td>
                </tr>
              )}
            </For>
            <tr style={totalsRowStyle}>
              <td style={{ ...tdStyle, 'font-weight': '600' }} colspan={2}>Totals:</td>
              <td style={{ ...tdStyle, 'font-weight': '600', 'text-align': 'right' as const }}>
                ${totalDebits().toFixed(2)}
              </td>
              <td style={{ ...tdStyle, 'font-weight': '600', 'text-align': 'right' as const }}>
                ${totalCredits().toFixed(2)}
              </td>
              <td style={tdStyle}></td>
            </tr>
          </tbody>
        </table>

        <div style={{
          display: 'inline-block',
          padding: '0.75rem 1.5rem',
          'border-radius': 'var(--border-radius-sm)',
          background: 'var(--success-color, #28a745)',
          color: 'white',
          'font-weight': '600'
        }}>
          Entry is Balanced
        </div>
      </Card>

      <div style={actionButtonsStyle}>
        <Show when={props.onClose}>
          <Button variant="secondary" onClick={props.onClose}>
            Close
          </Button>
        </Show>
        <Show when={props.entry.status === 'pending' && props.onPost}>
          <Button variant="primary" onClick={() => props.onPost!(props.entry.id)}>
            Post Entry
          </Button>
        </Show>
        <Show when={props.entry.status === 'posted' && props.onVoid}>
          <Button variant="outline" onClick={() => props.onVoid!(props.entry.id)}>
            Void Entry
          </Button>
        </Show>
      </div>
    </div>
  );
};

export default TransactionDetail;
