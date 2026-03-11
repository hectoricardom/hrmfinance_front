import { Component, createMemo, Show } from 'solid-js';
import { PaymentMethod } from '../types/invoiceTypes';
import { FormInput } from '../../ui';
import Icon from '../../../components/Icon';
import { invoiceStyledFormStore } from '../stores/invoiceStyledFormStore';

interface PaymentSectionProps {
  paymentMethods: PaymentMethod;
  onPaymentMethodsChange: (updates: Partial<PaymentMethod>) => void;
  invoiceTotal: number;
}

const PaymentSection: Component<PaymentSectionProps> = (props) => {

  // Get section validation status reactively
  const sectionValidation = createMemo(() => {
    const validation = invoiceStyledFormStore.getSectionValidation();
    return validation.payment;
  });

  // Calculate totals
  const totals = createMemo(() => {
    // Payment methods subtotal
    const paymentSubtotal = props.paymentMethods?.cash + props.paymentMethods?.zelle + props.paymentMethods?.creditCard;

    // Get discount
    const discount = 0;

    // Invoice total after discount
    const invoiceTotalAfterDiscount = Math.max(0, props.invoiceTotal );

    let taxableAmount = invoiceTotalAfterDiscount;
    let saveOnTaxPayByCash = 0;

    if (props.paymentMethods?.exemptTaxOnCash) {
      taxableAmount = (invoiceTotalAfterDiscount - props.paymentMethods?.cash );
      saveOnTaxPayByCash = props.paymentMethods?.cash * props.paymentMethods?.taxPercent/100;
    }

    let taxAmount = props.paymentMethods.taxOnTotal ?
      (invoiceTotalAfterDiscount * props.paymentMethods?.taxPercent / 100) :
      (taxableAmount * props.paymentMethods?.taxPercent / 100);


    taxAmount =
      (invoiceTotalAfterDiscount * props.paymentMethods?.taxPercent / 100) - saveOnTaxPayByCash;

    const totalWithTax = invoiceTotalAfterDiscount + taxAmount;


    const balance = totalWithTax - paymentSubtotal;





    return {
      paymentSubtotal,
      discount,
      invoiceTotalAfterDiscount,
      taxableAmount,
      taxAmount,
      totalWithTax,
      balance,
      saveOnTaxPayByCash,
      isFullyPaid: Math.round(balance) < 0.01
    };
  });

  // Auto-fill remaining balance
  const autoFillBalance = (method: 'cash' | 'zelle' | 'creditCard') => {
    const currentTotal = props.paymentMethods?.cash + props.paymentMethods?.zelle + props.paymentMethods?.creditCard;
    const remaining = totals().totalWithTax - currentTotal;

    if (remaining > 0) {
      props.onPaymentMethodsChange({
        [method]: props.paymentMethods[method] + remaining
      });
    }
  };

  // Styles
  const sectionStyle = {
    background: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius)',
    padding: '1.5rem',
    'margin-bottom': '1.5rem'
  };

  const sectionHeaderStyle = {
    'font-size': '1.25rem',
    'font-weight': 'bold',
    color: 'var(--text-primary)',
    'margin-bottom': '1rem',
    'padding-bottom': '0.5rem',
    'border-bottom': '2px solid var(--primary-color)',
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem'
  };

  const gridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem'
  };

  const twoColumnGridStyle =   {
    display: 'grid',
    'grid-template-columns': '1fr 1fr',
    gap: '1rem'
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '1rem',
    background: 'var(--surface-color)'
  };

  const labelStyle = {
    display: 'block',
    'font-size': '0.875rem',
    'font-weight': '500',
    color: 'var(--text-secondary)',
    'margin-bottom': '0.25rem'
  };

  const checkboxContainerStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    padding: '0.5rem 0'
  };

  const checkboxStyle = {
    width: '1rem',
    height: '1rem'
  };

  const summaryStyle = (balance: number) => {
    return {
      'margin-top': '1.5rem',
      padding: '1rem',
      background:  balance === 0 ? 'var(--success-background)' :balance < -0.01 ? 'var(--warning-background)' : 'var(--error-background)',
      border: `1px solid ${balance === 0 ? 'var(--success-color)' :  balance < -0.01 ? 'var(--warning-color)' : 'var(--error-color)'}`,
      'border-radius': 'var(--border-radius-sm)'
    }
  };

  const summaryRowStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '0.5rem',
    'font-size': '0.875rem'
  };

  const totalRowStyle = {
    ...summaryRowStyle,
    'font-weight': 'bold',
    'font-size': '1rem',
    'padding-top': '0.5rem',
    'border-top': '1px solid var(--border-color)'
  };

  const paymentItemStyle = {
    position: 'relative' as const
  };

  const autoFillButtonStyle = {
    position: 'absolute' as const,
    right: '8px',
    top: '28px',
    background: 'var(--primary-color)',
    color: 'white',
    border: 'none',
    'border-radius': '4px',
    padding: '4px 8px',
    cursor: 'pointer',
    'font-size': '0.75rem',
    'z-index': '10',
    opacity: '0.8',
    transition: 'opacity 0.2s ease'
  };

  const descriptionStyle = {
    'font-size': '0.75rem',
    color: 'var(--text-muted)',
    'margin-top': '0.25rem',
    'font-style': 'italic'
  };

  const validationBadgeStyle = {
    'margin-left': 'auto',
    padding: '0.25rem 0.75rem',
    'border-radius': '12px',
    'font-size': '0.75rem',
    'font-weight': '600',
    display: 'flex',
    'align-items': 'center',
    gap: '0.25rem'
  };

  const getValidationBadge = () => {
    const validation = sectionValidation();
    if (validation.isValid) {
      return {
        ...validationBadgeStyle,
        background: '#d4edda',
        color: '#155724',
        border: '1px solid #c3e6cb'
      };
    } else {
      return {
        ...validationBadgeStyle,
        background: '#fff3cd',
        color: '#856404',
        border: '1px solid #ffeeba'
      };
    }
  };

  return (
    <div style={sectionStyle}>
      <h3 style={sectionHeaderStyle}>
        <span>💳</span>
        <span>Métodos de Pago</span>
        <div style={getValidationBadge()}>
          <Show when={sectionValidation().isValid} fallback={
            <>
              <span>⚠</span>
              <span>{sectionValidation().completedFields}/{sectionValidation().totalFields}</span>
            </>
          }>
            <span>✓</span>
            <span>Pagado</span>
          </Show>
        </div>
      </h3>
      
      {/* Invoice Total Display */}
      <div style={{
        padding: '1rem',
        background: 'var(--primary-color)',
        color: 'white',
        'border-radius': 'var(--border-radius-sm)',
        'margin-bottom': '1rem',
        'text-align': 'center'
      }}>
        <div style={{ 'font-size': '0.875rem', opacity: '0.9' }}>Total de la Factura</div>
        <div style={{ 'font-size': '1.5rem', 'font-weight': 'bold' }}>
          ${props.invoiceTotal.toFixed(2)}
        </div>
        <Show when={totals().discount > 0}>
          <div style={{ 'font-size': '0.75rem', opacity: '0.9', 'margin-top': '0.25rem' }}>
            (Descuento: -${totals().discount.toFixed(2)})
          </div>
          <div style={{ 'font-size': '1rem', 'font-weight': '600', 'margin-top': '0.25rem' }}>
            Total Neto: ${totals().invoiceTotalAfterDiscount.toFixed(2)}
          </div>
        </Show>
      </div>

      {/* Payment Methods */}
      <div style={gridStyle}>
        <div style={paymentItemStyle}>
          <label style={labelStyle}>💵 Efectivo</label>
          <FormInput
            type="number"
            style={{ ...inputStyle, 'padding-right': '50px' }}
            value={props.paymentMethods.cash.toString()}
            min="0"
            step="0.01"
            
            onChange={(e) => props.onPaymentMethodsChange({
              cash: parseFloat(e) || 0
            })}
            placeholder="0.00"
          />
          <button
            type="button"
            style={autoFillButtonStyle}
            onClick={() => autoFillBalance('cash')}
            title="Auto-completar balance"
          >
            AUTO
          </button>
          <div style={descriptionStyle}>Pago en efectivo</div>
        </div>
        
        <div style={paymentItemStyle}>
          <label style={labelStyle}>📱 Zelle</label>
          <FormInput
            type="number"
            style={{ ...inputStyle, 'padding-right': '50px' }}
            value={props.paymentMethods.zelle.toString()}
            min="0"
            step="0.01"
            onChange={(e) => props.onPaymentMethodsChange({
              zelle: parseFloat(e) || 0
            })}
            placeholder="0.00"
          />
          <button
            type="button"
            style={autoFillButtonStyle}
            onClick={() => autoFillBalance('zelle')}
            title="Auto-completar balance"
          >
            AUTO
          </button>
          <div style={descriptionStyle}>Transferencia Zelle</div>
        </div>
        
        <div style={paymentItemStyle}>
          <label style={labelStyle}>💳 Tarjeta de Crédito</label>
          <FormInput
            type="number"
            style={{ ...inputStyle, 'padding-right': '50px' }}
            value={props.paymentMethods.creditCard.toString()}
            min="0"
            step="0.01"
            onChange={(e) => props.onPaymentMethodsChange({
              creditCard: parseFloat(e) || 0
            })}
            placeholder="0.00"
          />
          <button
            type="button"
            style={autoFillButtonStyle}
            onClick={() => autoFillBalance('creditCard')}
            title="Auto-completar balance"
          >
            AUTO
          </button>
          <div style={descriptionStyle}>Pago con tarjeta</div>
        </div>
        
        <div>
          <label style={labelStyle}>📊 Impuesto (%)</label>
          <FormInput
            type="number"
            style={inputStyle}
            value={props.paymentMethods.taxPercent?.toString()}
            min="0"
            max="100"
            step="0.1"
            onChange={(e) => props.onPaymentMethodsChange({
              taxPercent: Number(e) || 0
            })}
            placeholder="0.0"
          />
          <div style={descriptionStyle}>Porcentaje de impuesto aplicable</div>
        </div>

        <div>
          <label style={labelStyle}>🏷️ Descuento ($)</label>
          <FormInput
            type="number"
            style={inputStyle}
            value={props.paymentMethods.discount?.toString() || '0'}
            min="0"
            step="0.01"
            onChange={(e) => props.onPaymentMethodsChange({
              discount: parseFloat(e) || 0
            })}
            placeholder="0.00"
          />
          <div style={descriptionStyle}>Descuento en dólares aplicado a la factura</div>
        </div>
      </div>

      {/* Tax Options */}
      <div style={twoColumnGridStyle}>
        <div style={checkboxContainerStyle}>
          <input
            type="checkbox"
            style={checkboxStyle}
            checked={props.paymentMethods.taxOnTotal}
            onChange={(e) => props.onPaymentMethodsChange({
              taxOnTotal: (e.target as HTMLInputElement).checked
            })}
            id="tax-on-total-checkbox"
          />
          <label 
            for="tax-on-total-checkbox"
            style={{
              'font-size': '0.875rem',
              'font-weight': '500',
              color: 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            📊 Impuesto sobre el total de la factura
          </label>
        </div>
        
        <div style={checkboxContainerStyle}>
          <input
            type="checkbox"
            style={checkboxStyle}
            checked={props.paymentMethods.exemptTaxOnCash || false}
            onChange={(e) => props.onPaymentMethodsChange({
              exemptTaxOnCash: (e.target as HTMLInputElement).checked
            })}
            id="exempt-cash-tax-checkbox"
          />
          <label 
            for="exempt-cash-tax-checkbox"
            style={{
              'font-size': '0.875rem',
              'font-weight': '500',
              color: 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            💵 Exento de impuesto en efectivo
          </label>
        </div>
      </div>

      {/* Payment Summary */}
      <div style={summaryStyle(Math.round(totals().balance))}>
        <div style={summaryRowStyle}>
          <span>Subtotal de Factura:</span>
          <span>${props.invoiceTotal.toFixed(2)}</span>
        </div>
        

        <div style={summaryRowStyle}>
          <span>Impuesto ({props.paymentMethods.taxPercent}%):</span>
          <span>${totals().taxAmount.toFixed(2)}</span>
        </div>

        <div style={{...summaryRowStyle, 'font-weight': '600', 'padding-top': '0.5rem', 'border-top': '1px solid var(--border-color)'}}>
          <span>Total con Impuesto:</span>
          <span>${totals().totalWithTax.toFixed(2)}</span>
        </div>

        <div style={{...summaryRowStyle, 'margin-top': '0.5rem', 'padding-top': '0.5rem', 'border-top': '1px solid var(--border-color)'}}>
          <span>Subtotal de Pagos:</span>
          <span>${totals().paymentSubtotal.toFixed(2)}</span>
        </div>

        <div style={totalRowStyle}>
          <span>Balance Pendiente:</span>
          <span style={{
            color: Math.round(totals().balance) === 0 ? 'var(--success-color)' :
            Math.round(totals().balance) < 0.01 ?  'var(--warning-color)' : 'var(--error-color)'

          }}>


            <Show when={Math.round(totals().balance) < -0.01}>
              ${totals().balance.toFixed(2)} {' (SOBREPAGO)'}
            </Show>

            <Show when={Math.round(totals().balance) === 0}>
              { ' (PAGADO)'}
            </Show>

            <Show when={Math.round(totals().balance) > 0.01}>
             ${totals().balance.toFixed(2)} {' (PENDIENTE)'}
            </Show>
          </span>
        </div>
      </div>

      {/* Payment breakdown */}
      <div style={{
        'margin-top': '1rem',
        padding: '1rem',
        background: 'var(--strip-color)',
        'border-radius': 'var(--border-radius-sm)',
        border: '1px solid var(--border-color)'
      }}>
        <div style={{
          'font-size': '0.875rem',
          color: 'var(--text-muted)',
          'line-height': '1.4'
        }}>
          <strong>Desglose de Pagos:</strong><br/>
          • Efectivo: ${props.paymentMethods?.cash?.toFixed(2)}<br/>
          • Zelle: ${props.paymentMethods?.zelle?.toFixed(2)}<br/>
          • Tarjeta: ${props.paymentMethods?.creditCard?.toFixed(2)}<br/>
          • Use los botones "AUTO" para completar automáticamente el balance restante
        </div>
      </div>
    </div>
  );
};

export default PaymentSection;




/*



27RTSFDQ

240264474
27RTR0CV





240246008
27RTI15E





	220-962-780
Tracking ID	27RTIBOR



*/