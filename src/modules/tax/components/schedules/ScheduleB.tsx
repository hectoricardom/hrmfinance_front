import { Component, For } from 'solid-js';
import { Form1099 } from '../../types/taxTypes';

interface ScheduleBProps {
  form1099s: Form1099[]; // All 1099 forms
}

/**
 * Schedule B - Interest and Ordinary Dividends
 * Reports interest income (1099-INT) and dividend income (1099-DIV)
 */
const ScheduleB: Component<ScheduleBProps> = (props) => {
  // Filter for interest income (1099-INT)
  const interestIncome = () => props.form1099s.filter(f => f.type === '1099-INT');

  // Filter for dividend income (1099-DIV)
  const dividendIncome = () => props.form1099s.filter(f => f.type === '1099-DIV');

  // Calculate totals
  const totalInterest = () => interestIncome().reduce((sum, f) => sum + f.amount, 0);
  const totalDividends = () => dividendIncome().reduce((sum, f) => sum + f.amount, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const containerStyle = {
    background: 'var(--surface-color)',
    border: '2px solid #10b981',
    'border-radius': '8px',
    padding: '1.5rem',
    'margin-bottom': '2rem',
    'box-shadow': '0 2px 4px rgba(0,0,0,0.1)'
  };

  const headerStyle = {
    'font-size': '1.5rem',
    'font-weight': 'bold',
    color: '#10b981',
    'margin-bottom': '1rem',
    'padding-bottom': '0.5rem',
    'border-bottom': '2px solid #10b981'
  };

  const sectionStyle = {
    'margin-bottom': '1.5rem'
  };

  const sectionTitleStyle = {
    'font-size': '1.1rem',
    'font-weight': '600',
    color: 'var(--text-primary)',
    'margin-bottom': '0.75rem',
    background: '#d1fae5',
    padding: '0.5rem',
    'border-radius': '4px'
  };

  const tableStyle = {
    width: '100%',
    'border-collapse': 'collapse' as const,
    'margin-bottom': '1rem'
  };

  const thStyle = {
    'text-align': 'left' as const,
    padding: '0.75rem',
    background: '#f0fdf4',
    'border-bottom': '2px solid #10b981',
    'font-weight': '600',
    color: 'var(--text-primary)'
  };

  const tdStyle = {
    padding: '0.75rem',
    'border-bottom': '1px solid var(--border-color)',
    color: 'var(--text-primary)'
  };

  const totalRowStyle = {
    ...tdStyle,
    'font-weight': 'bold',
    background: '#f0fdf4',
    'border-bottom': '3px solid #10b981'
  };

  const totalAmountStyle = {
    ...totalRowStyle,
    'text-align': 'right' as const,
    'font-size': '1.1rem',
    color: '#059669'
  };

  const instructionStyle = {
    background: '#fef3c7',
    border: '1px solid #f59e0b',
    'border-radius': '6px',
    padding: '1rem',
    'margin-bottom': '1rem',
    'font-size': '0.9rem',
    color: 'var(--text-primary)'
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        Schedule B - Interest and Ordinary Dividends
      </div>

      <div style={instructionStyle}>
        <strong>📋 Instrucciones:</strong> Este formulario reporta ingresos por intereses y dividendos.
        Estos ingresos NO están sujetos al impuesto de trabajo por cuenta propia (Self-Employment Tax).
      </div>

      {/* Part I - Interest Income */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          Parte I - Ingresos por Intereses (1099-INT)
        </div>

        {interestIncome().length > 0 ? (
          <>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Pagador (Payer)</th>
                  <th style={thStyle}>TIN</th>
                  <th style={{...thStyle, 'text-align': 'right'}}>Cantidad (Amount)</th>
                </tr>
              </thead>
              <tbody>
                <For each={interestIncome()}>
                  {(form) => (
                    <tr>
                      <td style={tdStyle}>{form.payer || 'Sin nombre'}</td>
                      <td style={tdStyle}>{form.payerTIN || 'N/A'}</td>
                      <td style={{...tdStyle, 'text-align': 'right'}}>{formatCurrency(form.amount)}</td>
                    </tr>
                  )}
                </For>
                <tr>
                  <td style={totalRowStyle} colspan="2">
                    <strong>Total de Intereses (Line 2 - Form 1040)</strong>
                  </td>
                  <td style={totalAmountStyle}>
                    {formatCurrency(totalInterest())}
                  </td>
                </tr>
              </tbody>
            </table>
          </>
        ) : (
          <p style={{ color: 'var(--text-secondary)', 'font-style': 'italic', padding: '1rem' }}>
            No hay ingresos por intereses reportados.
          </p>
        )}
      </div>

      {/* Part II - Dividend Income */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          Parte II - Dividendos Ordinarios (1099-DIV)
        </div>

        {dividendIncome().length > 0 ? (
          <>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Pagador (Payer)</th>
                  <th style={thStyle}>TIN</th>
                  <th style={{...thStyle, 'text-align': 'right'}}>Cantidad (Amount)</th>
                </tr>
              </thead>
              <tbody>
                <For each={dividendIncome()}>
                  {(form) => (
                    <tr>
                      <td style={tdStyle}>{form.payer || 'Sin nombre'}</td>
                      <td style={tdStyle}>{form.payerTIN || 'N/A'}</td>
                      <td style={{...tdStyle, 'text-align': 'right'}}>{formatCurrency(form.amount)}</td>
                    </tr>
                  )}
                </For>
                <tr>
                  <td style={totalRowStyle} colspan="2">
                    <strong>Total de Dividendos Ordinarios (Line 3 - Form 1040)</strong>
                  </td>
                  <td style={totalAmountStyle}>
                    {formatCurrency(totalDividends())}
                  </td>
                </tr>
              </tbody>
            </table>
          </>
        ) : (
          <p style={{ color: 'var(--text-secondary)', 'font-style': 'italic', padding: '1rem' }}>
            No hay dividendos reportados.
          </p>
        )}
      </div>

      {/* Summary */}
      <div style={{
        background: '#f0fdf4',
        padding: '1rem',
        'border-radius': '6px',
        'border': '2px solid #10b981'
      }}>
        <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.5rem' }}>
          <strong>Total de Ingresos por Intereses:</strong>
          <span style={{ color: '#059669', 'font-weight': 'bold' }}>{formatCurrency(totalInterest())}</span>
        </div>
        <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
          <strong>Total de Dividendos Ordinarios:</strong>
          <span style={{ color: '#059669', 'font-weight': 'bold' }}>{formatCurrency(totalDividends())}</span>
        </div>
        <div style={{
          'margin-top': '0.75rem',
          'padding-top': '0.75rem',
          'border-top': '2px solid #10b981',
          display: 'flex',
          'justify-content': 'space-between'
        }}>
          <strong>Total de Ingresos de Inversión (Investment Income):</strong>
          <span style={{ color: '#059669', 'font-weight': 'bold', 'font-size': '1.2rem' }}>
            {formatCurrency(totalInterest() + totalDividends())}
          </span>
        </div>
      </div>

      <div style={{
        'margin-top': '1rem',
        padding: '0.75rem',
        background: '#dbeafe',
        'border-left': '4px solid #3b82f6',
        'border-radius': '4px',
        'font-size': '0.85rem',
        color: 'var(--text-primary)'
      }}>
        <strong>ℹ️ Nota Importante:</strong> Los ingresos por intereses y dividendos se reportan en la
        Form 1040 (Líneas 2b y 3b) y se incluyen en su Ingreso Bruto Ajustado (AGI), pero NO están
        sujetos al impuesto de trabajo por cuenta propia del 15.3%.
      </div>
    </div>
  );
};

export default ScheduleB;
