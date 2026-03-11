import { Component, For, Show, createMemo } from 'solid-js';
import { JSX } from 'solid-js/jsx-runtime';

export interface StandardTransaction {
  id: string;
  timestamp: string;
  amount: number;
  currency: string;
  description: string;
  reference: string;
  metadata?: Record<string, unknown>;
}

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  accountCode?: string;
}

export interface PaymentAllocation {
  method: string;
  amount: number;
  reference?: string;
}

export interface AccountAssignment {
  accountCode: string;
  accountName: string;
  amount: number;
  type: 'debit' | 'credit';
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate?: string;
  customer?: {
    name: string;
    email?: string;
  };
  lineItems: LineItem[];
  subtotal: number;
  tax?: number;
  total: number;
  payments?: PaymentAllocation[];
  status: 'draft' | 'pending' | 'paid' | 'overdue';
}

export interface Stage3Props {
  standardTransaction: StandardTransaction | null;
  invoice: Invoice | null;
  accountAssignments: AccountAssignment[];
}

const Stage3InvoiceConversion: Component<Stage3Props> = (props) => {
  const containerStyle: JSX.CSSProperties = {
    background: 'var(--surface-color, #ffffff)',
    'border-radius': 'var(--border-radius, 8px)',
    padding: '1.5rem',
    'box-shadow': 'var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05))',
    border: '1px solid var(--border-color, #e5e7eb)',
    margin: '9px',
  };

  const headerStyle: JSX.CSSProperties = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.75rem',
    'margin-bottom': '1.5rem',
  };

  const stageBadgeStyle: JSX.CSSProperties = {
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    width: '32px',
    height: '32px',
    'border-radius': '50%',
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: '#ffffff',
    'font-weight': '700',
    'font-size': '0.875rem',
    'box-shadow': '0 2px 4px rgba(16, 185, 129, 0.3)',
  };

  const titleStyle: JSX.CSSProperties = {
    'font-size': '1.25rem',
    'font-weight': '600',
    color: 'var(--text-primary, #111827)',
    margin: '0',
  };

  const subtitleStyle: JSX.CSSProperties = {
    'font-size': '0.875rem',
    color: 'var(--text-muted, #6b7280)',
    margin: '0.25rem 0 0 0',
  };

  const comparisonContainerStyle: JSX.CSSProperties = {
    display: 'grid',
    'grid-template-columns': '1fr 1fr',
    gap: '1rem',
    'margin-bottom': '1.5rem',
  };

  const panelStyle: JSX.CSSProperties = {
    background: 'var(--code-bg, #1f2937)',
    'border-radius': '8px',
    padding: '1rem',
    'overflow-x': 'auto',
    'max-height': '250px',
    'overflow-y': 'auto',
  };

  const panelHeaderStyle: JSX.CSSProperties = {
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'space-between',
    'margin-bottom': '0.75rem',
    'padding-bottom': '0.5rem',
    'border-bottom': '1px solid rgba(255, 255, 255, 0.1)',
  };

  const panelTitleStyle: JSX.CSSProperties = {
    'font-size': '0.75rem',
    'font-weight': '600',
    color: '#9ca3af',
    'text-transform': 'uppercase',
    'letter-spacing': '0.05em',
  };

  const codeStyle: JSX.CSSProperties = {
    'font-family': 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    'font-size': '0.7rem',
    'line-height': '1.4',
    color: '#e5e7eb',
    margin: '0',
    'white-space': 'pre-wrap',
    'word-break': 'break-word',
  };

  const sectionLabelStyle: JSX.CSSProperties = {
    'font-size': '0.75rem',
    'font-weight': '600',
    'text-transform': 'uppercase',
    'letter-spacing': '0.05em',
    color: 'var(--text-muted, #6b7280)',
    'margin-bottom': '0.75rem',
  };

  const accountBadgesContainerStyle: JSX.CSSProperties = {
    display: 'flex',
    'flex-wrap': 'wrap',
    gap: '0.5rem',
    'margin-bottom': '1.5rem',
  };

  const accountBadgeStyle = (type: 'debit' | 'credit'): JSX.CSSProperties => ({
    display: 'inline-flex',
    'flex-direction': 'column',
    padding: '0.5rem 0.75rem',
    'border-radius': '8px',
    background: type === 'debit'
      ? 'rgba(239, 68, 68, 0.1)'
      : 'rgba(34, 197, 94, 0.1)',
    border: `1px solid ${type === 'debit'
      ? 'rgba(239, 68, 68, 0.3)'
      : 'rgba(34, 197, 94, 0.3)'}`,
  });

  const accountCodeStyle = (type: 'debit' | 'credit'): JSX.CSSProperties => ({
    'font-family': 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    'font-size': '0.75rem',
    'font-weight': '600',
    color: type === 'debit' ? '#dc2626' : '#16a34a',
  });

  const accountNameStyle: JSX.CSSProperties = {
    'font-size': '0.625rem',
    color: 'var(--text-muted, #6b7280)',
    'margin-top': '0.125rem',
  };

  const accountAmountStyle = (type: 'debit' | 'credit'): JSX.CSSProperties => ({
    'font-size': '0.75rem',
    'font-weight': '500',
    color: type === 'debit' ? '#dc2626' : '#16a34a',
    'margin-top': '0.25rem',
  });

  const paymentContainerStyle: JSX.CSSProperties = {
    display: 'flex',
    gap: '0.75rem',
    'margin-bottom': '1.5rem',
    'flex-wrap': 'wrap',
  };

  const paymentCardStyle: JSX.CSSProperties = {
    display: 'flex',
    'flex-direction': 'column',
    padding: '0.75rem 1rem',
    'border-radius': '8px',
    background: 'var(--surface-secondary, #f9fafb)',
    border: '1px solid var(--border-color, #e5e7eb)',
    'min-width': '140px',
  };

  const paymentMethodStyle: JSX.CSSProperties = {
    'font-size': '0.75rem',
    'font-weight': '600',
    color: 'var(--text-primary, #111827)',
    'margin-bottom': '0.25rem',
  };

  const paymentAmountStyle: JSX.CSSProperties = {
    'font-size': '1rem',
    'font-weight': '700',
    color: '#059669',
  };

  const paymentRefStyle: JSX.CSSProperties = {
    'font-size': '0.625rem',
    color: 'var(--text-muted, #6b7280)',
    'margin-top': '0.25rem',
    'font-family': 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  };

  const tableContainerStyle: JSX.CSSProperties = {
    'overflow-x': 'auto',
  };

  const tableStyle: JSX.CSSProperties = {
    width: '100%',
    'border-collapse': 'collapse',
    'font-size': '0.875rem',
  };

  const thStyle: JSX.CSSProperties = {
    padding: '0.75rem',
    'text-align': 'left',
    'font-weight': '600',
    color: 'var(--text-muted, #6b7280)',
    'border-bottom': '2px solid var(--border-color, #e5e7eb)',
    background: 'var(--surface-secondary, #f9fafb)',
    'white-space': 'nowrap',
  };

  const tdStyle: JSX.CSSProperties = {
    padding: '0.75rem',
    'border-bottom': '1px solid var(--border-color, #e5e7eb)',
    'vertical-align': 'middle',
  };

  const lineItemCodeStyle: JSX.CSSProperties = {
    'font-family': 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    'font-size': '0.625rem',
    padding: '0.125rem 0.375rem',
    background: 'rgba(107, 114, 128, 0.1)',
    color: '#6b7280',
    'border-radius': '4px',
  };

  const totalRowStyle: JSX.CSSProperties = {
    ...tdStyle,
    'font-weight': '600',
    background: 'var(--surface-secondary, #f9fafb)',
  };

  const emptyStateStyle: JSX.CSSProperties = {
    display: 'flex',
    'flex-direction': 'column',
    'align-items': 'center',
    'justify-content': 'center',
    padding: '2rem',
    color: 'var(--text-muted, #6b7280)',
    'text-align': 'center',
    'min-height': '100px',
  };

  const statusBadgeStyle = (status: string): JSX.CSSProperties => ({
    display: 'inline-flex',
    'align-items': 'center',
    padding: '0.25rem 0.5rem',
    'border-radius': '9999px',
    'font-size': '0.625rem',
    'font-weight': '600',
    'text-transform': 'uppercase',
    background: status === 'paid'
      ? 'rgba(34, 197, 94, 0.1)'
      : status === 'pending'
        ? 'rgba(234, 179, 8, 0.1)'
        : status === 'overdue'
          ? 'rgba(239, 68, 68, 0.1)'
          : 'rgba(107, 114, 128, 0.1)',
    color: status === 'paid'
      ? '#16a34a'
      : status === 'pending'
        ? '#ca8a04'
        : status === 'overdue'
          ? '#dc2626'
          : '#6b7280',
  });

  const formatCurrency = (amount: number, currency?: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  const formattedTransaction = createMemo(() => {
    if (!props.standardTransaction) return null;
    try {
      return JSON.stringify(props.standardTransaction, null, 2);
    } catch {
      return 'Invalid transaction data';
    }
  });

  const formattedInvoice = createMemo(() => {
    if (!props.invoice) return null;
    try {
      const { lineItems, ...invoiceHeader } = props.invoice;
      return JSON.stringify({
        ...invoiceHeader,
        lineItems: `[${lineItems.length} items]`,
      }, null, 2);
    } catch {
      return 'Invalid invoice data';
    }
  });

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={stageBadgeStyle}>3</div>
        <div>
          <h3 style={titleStyle}>Invoice Conversion</h3>
          <p style={subtitleStyle}>Generate invoice from standardized transaction</p>
        </div>
      </div>

      <div style={sectionLabelStyle}>Side-by-Side Comparison</div>
      <div style={comparisonContainerStyle}>
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <span style={panelTitleStyle}>StandardTransaction</span>
            <Show when={props.standardTransaction}>
              <span style={{ 'font-size': '0.625rem', color: '#6b7280' }}>
                {props.standardTransaction?.id}
              </span>
            </Show>
          </div>
          <Show
            when={props.standardTransaction && formattedTransaction()}
            fallback={
              <div style={emptyStateStyle}>
                No transaction data
              </div>
            }
          >
            <pre style={codeStyle}>
              <code>{formattedTransaction()}</code>
            </pre>
          </Show>
        </div>

        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <span style={panelTitleStyle}>Generated Invoice</span>
            <Show when={props.invoice}>
              <span style={statusBadgeStyle(props.invoice?.status || 'draft')}>
                {props.invoice?.status}
              </span>
            </Show>
          </div>
          <Show
            when={props.invoice && formattedInvoice()}
            fallback={
              <div style={emptyStateStyle}>
                No invoice generated
              </div>
            }
          >
            <pre style={codeStyle}>
              <code>{formattedInvoice()}</code>
            </pre>
          </Show>
        </div>
      </div>

      <div style={sectionLabelStyle}>Account Code Assignments</div>
      <Show
        when={props.accountAssignments.length > 0}
        fallback={
          <div style={{
            ...emptyStateStyle,
            background: 'var(--surface-secondary, #f9fafb)',
            'border-radius': '8px',
            'margin-bottom': '1.5rem',
          }}>
            No account assignments
          </div>
        }
      >
        <div style={accountBadgesContainerStyle}>
          <For each={props.accountAssignments}>
            {(assignment) => (
              <div style={accountBadgeStyle(assignment.type)}>
                <span style={accountCodeStyle(assignment.type)}>
                  {assignment.type === 'debit' ? 'DR' : 'CR'} {assignment.accountCode}
                </span>
                <span style={accountNameStyle}>{assignment.accountName}</span>
                <span style={accountAmountStyle(assignment.type)}>
                  {formatCurrency(assignment.amount, props.standardTransaction?.currency)}
                </span>
              </div>
            )}
          </For>
        </div>
      </Show>

      <Show when={props.invoice?.payments && props.invoice.payments.length > 0}>
        <div style={sectionLabelStyle}>Payment Allocation</div>
        <div style={paymentContainerStyle}>
          <For each={props.invoice?.payments}>
            {(payment) => (
              <div style={paymentCardStyle}>
                <span style={paymentMethodStyle}>{payment.method}</span>
                <span style={paymentAmountStyle}>
                  {formatCurrency(payment.amount, props.standardTransaction?.currency)}
                </span>
                <Show when={payment.reference}>
                  <span style={paymentRefStyle}>Ref: {payment.reference}</span>
                </Show>
              </div>
            )}
          </For>
        </div>
      </Show>

      <div style={sectionLabelStyle}>Line Items</div>
      <Show
        when={props.invoice?.lineItems && props.invoice.lineItems.length > 0}
        fallback={
          <div style={{
            ...emptyStateStyle,
            background: 'var(--surface-secondary, #f9fafb)',
            'border-radius': '8px',
          }}>
            No line items
          </div>
        }
      >
        <div style={tableContainerStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Description</th>
                <th style={{ ...thStyle, 'text-align': 'center' }}>Qty</th>
                <th style={{ ...thStyle, 'text-align': 'right' }}>Unit Price</th>
                <th style={{ ...thStyle, 'text-align': 'right' }}>Total</th>
                <th style={thStyle}>Account</th>
              </tr>
            </thead>
            <tbody>
              <For each={props.invoice?.lineItems}>
                {(item) => (
                  <tr>
                    <td style={tdStyle}>{item.description}</td>
                    <td style={{ ...tdStyle, 'text-align': 'center' }}>{item.quantity}</td>
                    <td style={{ ...tdStyle, 'text-align': 'right' }}>
                      {formatCurrency(item.unitPrice, props.standardTransaction?.currency)}
                    </td>
                    <td style={{ ...tdStyle, 'text-align': 'right' }}>
                      {formatCurrency(item.total, props.standardTransaction?.currency)}
                    </td>
                    <td style={tdStyle}>
                      <Show when={item.accountCode} fallback="-">
                        <code style={lineItemCodeStyle}>{item.accountCode}</code>
                      </Show>
                    </td>
                  </tr>
                )}
              </For>
              <Show when={props.invoice?.tax !== undefined && props.invoice.tax > 0}>
                <tr>
                  <td style={totalRowStyle} colspan={3}>Tax</td>
                  <td style={{ ...totalRowStyle, 'text-align': 'right' }}>
                    {formatCurrency(props.invoice?.tax || 0, props.standardTransaction?.currency)}
                  </td>
                  <td style={totalRowStyle} />
                </tr>
              </Show>
              <tr>
                <td style={{ ...totalRowStyle, 'font-weight': '700' }} colspan={3}>Total</td>
                <td style={{ ...totalRowStyle, 'text-align': 'right', 'font-weight': '700', color: '#059669' }}>
                  {formatCurrency(props.invoice?.total || 0, props.standardTransaction?.currency)}
                </td>
                <td style={totalRowStyle} />
              </tr>
            </tbody>
          </table>
        </div>
      </Show>
    </div>
  );
};

export default Stage3InvoiceConversion;
