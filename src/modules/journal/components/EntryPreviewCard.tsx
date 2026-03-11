import { Component, createMemo, Show, For } from 'solid-js';

interface EntryPreviewCardProps {
  entry: {
    description?: string;
    reference?: string;
    lines: Array<{
      accountId?: string;
      accountName?: string;
      description?: string;
      debitAmount?: number;
      creditAmount?: number;
      type: 'debit' | 'credit';
    }>;
  } | null;
  isValid?: boolean;
  errors?: string[];
  warnings?: string[];
}

const EntryPreviewCard: Component<EntryPreviewCardProps> = (props) => {
  // Calculate totals using createMemo for reactive calculations
  const totalDebits = createMemo(() => {
    if (!props.entry || !props.entry.lines) return 0;
    return props.entry.lines.reduce((sum, line) => sum + (line.debitAmount || 0), 0);
  });

  const totalCredits = createMemo(() => {
    if (!props.entry || !props.entry.lines) return 0;
    return props.entry.lines.reduce((sum, line) => sum + (line.creditAmount || 0), 0);
  });

  const isBalanced = createMemo(() => {
    const debits = totalDebits();
    const credits = totalCredits();
    // Consider balanced if difference is less than 0.01 (accounting for floating point precision)
    return Math.abs(debits - credits) < 0.01 && debits > 0 && credits > 0;
  });

  const hasContent = createMemo(() => {
    return props.entry && props.entry.lines && props.entry.lines.length > 0;
  });

  // Format currency helper
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Card container style
  const cardStyle = {
    background: 'var(--surface-color)',
    'border-radius': 'var(--border-radius)',
    padding: '1.5rem',
    'box-shadow': 'var(--shadow-sm)',
    border: '1px solid var(--border-color)',
    height: '100%',
    display: 'flex',
    'flex-direction': 'column'
  };

  // Header style
  const headerStyle = {
    'margin-bottom': '1.5rem',
    'padding-bottom': '1rem',
    'border-bottom': '2px solid var(--border-color)'
  };

  const titleStyle = {
    'font-size': '1.25rem',
    'font-weight': '600',
    color: 'var(--text-primary)',
    margin: '0'
  };

  // Info section style
  const infoSectionStyle = {
    'margin-bottom': '1.5rem',
    padding: '1rem',
    background: 'var(--background-color)',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '0.875rem'
  };

  const infoLabelStyle = {
    'font-weight': '600',
    color: 'var(--text-secondary)',
    'margin-bottom': '0.25rem'
  };

  const infoValueStyle = {
    color: 'var(--text-primary)',
    'margin-bottom': '0.75rem'
  };

  // Table styles
  const tableContainerStyle = {
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    overflow: 'hidden',
    'margin-bottom': '1.5rem',
    flex: '1',
    'overflow-y': 'auto',
    'max-height': '400px'
  };

  const tableHeaderStyle = {
    display: 'grid',
    'grid-template-columns': '2fr 2fr 1fr 1fr',
    gap: '1rem',
    padding: '0.75rem 1rem',
    background: 'var(--background-color)',
    'font-weight': '600',
    'font-size': '0.813rem',
    color: 'var(--text-secondary)',
    'border-bottom': '2px solid var(--border-color)',
    position: 'sticky',
    top: '0',
    'z-index': '1'
  };

  const tableRowStyle = (isLast: boolean) => ({
    display: 'grid',
    'grid-template-columns': '2fr 2fr 1fr 1fr',
    gap: '1rem',
    padding: '1rem',
    'border-bottom': isLast ? 'none' : '1px solid var(--border-color)',
    'font-size': '0.875rem'
  });

  const accountCellStyle = {
    display: 'flex',
    'flex-direction': 'column',
    gap: '0.25rem'
  };

  const accountNameStyle = {
    'font-weight': '500',
    color: 'var(--text-primary)'
  };

  const accountIdStyle = {
    'font-size': '0.75rem',
    color: 'var(--text-muted)'
  };

  const debitAmountStyle = (amount: number) => ({
    'font-weight': '600',
    color: amount > 0 ? 'var(--success-color)' : 'var(--text-muted)',
    'text-align': 'right' as const
  });

  const creditAmountStyle = (amount: number) => ({
    'font-weight': '600',
    color: amount > 0 ? 'var(--error-color)' : 'var(--text-muted)',
    'text-align': 'right' as const
  });

  // Footer styles
  const footerStyle = {
    'margin-top': 'auto',
    'padding-top': '1rem',
    'border-top': '2px solid var(--border-color)'
  };

  const totalsGridStyle = {
    display: 'grid',
    'grid-template-columns': '1fr 1fr',
    gap: '1rem',
    'margin-bottom': '1rem'
  };

  const totalBoxStyle = {
    padding: '0.75rem',
    background: 'var(--background-color)',
    'border-radius': 'var(--border-radius-sm)'
  };

  const totalLabelStyle = {
    'font-size': '0.75rem',
    'font-weight': '600',
    color: 'var(--text-secondary)',
    'text-transform': 'uppercase',
    'letter-spacing': '0.05em',
    'margin-bottom': '0.25rem'
  };

  const totalAmountStyle = {
    'font-size': '1.25rem',
    'font-weight': '700',
    color: 'var(--text-primary)'
  };

  const balanceStatusStyle = (balanced: boolean) => ({
    padding: '0.75rem 1rem',
    'border-radius': 'var(--border-radius-sm)',
    'font-weight': '600',
    'text-align': 'center' as const,
    background: balanced ? 'var(--success-background)' : 'var(--error-background)',
    color: balanced ? 'var(--success-color)' : 'var(--error-color)',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    gap: '0.5rem'
  });

  // Alert styles
  const alertStyle = (type: 'error' | 'warning') => ({
    padding: '1rem',
    'border-radius': 'var(--border-radius-sm)',
    'margin-bottom': '1rem',
    background: type === 'error' ? 'var(--error-background)' : 'var(--warning-background)',
    color: type === 'error' ? 'var(--error-color)' : 'var(--warning-color)',
    'font-size': '0.875rem'
  });

  const alertTitleStyle = {
    'font-weight': '600',
    'margin-bottom': '0.5rem'
  };

  const alertListStyle = {
    margin: '0',
    'padding-left': '1.5rem'
  };

  // Placeholder style
  const placeholderStyle = {
    display: 'flex',
    'flex-direction': 'column',
    'align-items': 'center',
    'justify-content': 'center',
    padding: '3rem 1rem',
    color: 'var(--text-muted)',
    'text-align': 'center' as const
  };

  const placeholderIconStyle = {
    'font-size': '3rem',
    'margin-bottom': '1rem',
    opacity: '0.5'
  };

  const placeholderTextStyle = {
    'font-size': '0.875rem'
  };

  return (
    <div style={cardStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h3 style={titleStyle}>Vista Previa</h3>
      </div>

      {/* Show placeholder if no content */}
      <Show when={!hasContent()}>
        <div style={placeholderStyle}>
          <div style={placeholderIconStyle}>📝</div>
          <div style={placeholderTextStyle}>
            Complete el formulario para ver una vista previa del asiento contable
          </div>
        </div>
      </Show>

      {/* Show content if available */}
      <Show when={hasContent()}>
        {/* Errors */}
        <Show when={props.errors && props.errors.length > 0}>
          <div style={alertStyle('error')}>
            <div style={alertTitleStyle}>Errores</div>
            <ul style={alertListStyle}>
              <For each={props.errors}>
                {(error) => <li>{error}</li>}
              </For>
            </ul>
          </div>
        </Show>

        {/* Warnings */}
        <Show when={props.warnings && props.warnings.length > 0}>
          <div style={alertStyle('warning')}>
            <div style={alertTitleStyle}>Advertencias</div>
            <ul style={alertListStyle}>
              <For each={props.warnings}>
                {(warning) => <li>{warning}</li>}
              </For>
            </ul>
          </div>
        </Show>

        {/* Reference and Description */}
        <Show when={props.entry?.reference || props.entry?.description}>
          <div style={infoSectionStyle}>
            <Show when={props.entry?.reference}>
              <div>
                <div style={infoLabelStyle}>Referencia</div>
                <div style={infoValueStyle}>{props.entry?.reference}</div>
              </div>
            </Show>
            <Show when={props.entry?.description}>
              <div>
                <div style={infoLabelStyle}>Descripción</div>
                <div style={{ ...infoValueStyle, 'margin-bottom': '0' }}>
                  {props.entry?.description}
                </div>
              </div>
            </Show>
          </div>
        </Show>

        {/* Lines Table */}
        <div style={tableContainerStyle}>
          {/* Table Header */}
          <div style={tableHeaderStyle}>
            <div>Cuenta</div>
            <div>Descripción</div>
            <div style={{ 'text-align': 'right' }}>Débito</div>
            <div style={{ 'text-align': 'right' }}>Crédito</div>
          </div>

          {/* Table Rows */}
          <For each={props.entry?.lines || []}>
            {(line, index) => (
              <div style={tableRowStyle(index() === (props.entry?.lines.length || 0) - 1)}>
                {/* Account */}
                <div style={accountCellStyle}>
                  <div style={accountNameStyle}>
                    {line.accountName || 'Cuenta no especificada'}
                  </div>
                  <Show when={line.accountId}>
                    <div style={accountIdStyle}>{line.accountId}</div>
                  </Show>
                </div>

                {/* Description */}
                <div style={{ color: 'var(--text-secondary)' }}>
                  {line.description || '-'}
                </div>

                {/* Debit Amount */}
                <div style={debitAmountStyle(line.debitAmount || 0)}>
                  {(line.debitAmount || 0) > 0 ? formatCurrency(line.debitAmount || 0) : '-'}
                </div>

                {/* Credit Amount */}
                <div style={creditAmountStyle(line.creditAmount || 0)}>
                  {(line.creditAmount || 0) > 0 ? formatCurrency(line.creditAmount || 0) : '-'}
                </div>
              </div>
            )}
          </For>
        </div>

        {/* Footer with Totals */}
        <div style={footerStyle}>
          {/* Totals Grid */}
          <div style={totalsGridStyle}>
            {/* Total Debits */}
            <div style={totalBoxStyle}>
              <div style={totalLabelStyle}>Total Débitos</div>
              <div style={{ ...totalAmountStyle, color: 'var(--success-color)' }}>
                {formatCurrency(totalDebits())}
              </div>
            </div>

            {/* Total Credits */}
            <div style={totalBoxStyle}>
              <div style={totalLabelStyle}>Total Créditos</div>
              <div style={{ ...totalAmountStyle, color: 'var(--error-color)' }}>
                {formatCurrency(totalCredits())}
              </div>
            </div>
          </div>

          {/* Balance Status */}
          <div style={balanceStatusStyle(isBalanced())}>
            <span>{isBalanced() ? '✓' : '✗'}</span>
            <span>{isBalanced() ? 'Balanceado' : 'Desbalanceado'}</span>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default EntryPreviewCard;
