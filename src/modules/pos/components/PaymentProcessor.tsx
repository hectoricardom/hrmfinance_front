import { Component, createSignal, Show, For, createEffect } from 'solid-js';
import { Card, Button, FormInput } from '../../ui';
import { POSCart, POSCustomer, POSSettings, POSPaymentMethod } from '../types/posTypes';
import Icon from '../../../components/Icon';
import { useTranslation } from '../../../translations';
import GooglePayButton from './GooglePayButton';
import CreditCardForm from './CreditCardForm';
import { GooglePayResult } from '../../../services/googlePay';
import { devLog } from '../../../services/utils';

interface PaymentProcessorProps {
  cart: POSCart;
  totals: {
    subtotal: number;
    totalDiscount: number;
    totalTax: number;
    total: number;
  };
  customer?: POSCustomer | null;
  settings: POSSettings;
  onComplete: (paymentData: any) => void;
  onCancel: () => void;
  loading: boolean;
}

const PaymentProcessor: Component<PaymentProcessorProps> = (props) => {
  const { t } = useTranslation();
  // Payment method amounts
  const [paymentMethods, setPaymentMethods] = createSignal<POSPaymentMethod>({
    cash: 0,
    creditCard: 0,
    debitCard: 0,
    zelle: 0,
    bankTransfer: 0,
    check: 0,
    giftCard: 0,
    googlePay: 0,
    other: 0
  });

  const [selectedPaymentMethod, setSelectedPaymentMethod] = createSignal<keyof POSPaymentMethod>('cash');
  const [paymentNote, setPaymentNote] = createSignal('');
  const [error, setError] = createSignal('');
  const [calculating, setCalculating] = createSignal(false);
  const [showCreditCardForm, setShowCreditCardForm] = createSignal(false);

  // Payment shortcuts for quick amounts
  const quickAmounts = () => {
    const total = props.totals.total;
    return [
      { label: t('pos.exact', 'Exacto'), amount: total },
      { label: '$20', amount: 20 },
      { label: '$50', amount: 50 },
      { label: '$100', amount: 100 },
      { label: '$200', amount: 200 }
    ].filter(item => item.amount >= total || item.label === 'Exact');
  };

  // Calculate totals
  const paymentTotals = () => {
    const methods = paymentMethods();
    const totalPaid = Object.values(methods).reduce((sum, amount) => sum + amount, 0);
    const change = Math.max(0, totalPaid - props.totals.total);
    const remaining = Math.max(0, props.totals.total - totalPaid);
    
    return {
      totalPaid,
      change,
      remaining,
      isExact: totalPaid === props.totals.total,
      isOverpaid: totalPaid > props.totals.total,
      isUnderpaid: totalPaid < props.totals.total
    };
  };

  // Update payment method amount
  const updatePaymentAmount = (method: keyof POSPaymentMethod, amount: number) => {
    setPaymentMethods(prev => ({
      ...prev,
      [method]: Math.max(0, amount)
    }));
    setError('');
  };

  // Quick payment - pay exact amount with selected method
  const quickPayExact = () => {
    const method = selectedPaymentMethod();
    setPaymentMethods({
      cash: 0,
      creditCard: 0,
      debitCard: 0,
      zelle: 0,
      bankTransfer: 0,
      check: 0,
      giftCard: 0,
      googlePay: 0,
      other: 0,
      [method]: props.totals.total
    });
  };

  // Quick cash payment with change
  const quickCashPayment = (amount: number) => {
    setSelectedPaymentMethod('cash');
    setPaymentMethods({
      cash: amount,
      creditCard: 0,
      debitCard: 0,
      zelle: 0,
      bankTransfer: 0,
      check: 0,
      giftCard: 0,
      googlePay: 0,
      other: 0
    });
  };

  // Clear all payments
  const clearPayments = () => {
    setPaymentMethods({
      cash: 0,
      creditCard: 0,
      debitCard: 0,
      zelle: 0,
      bankTransfer: 0,
      check: 0,
      giftCard: 0,
      googlePay: 0,
      other: 0
    });
    setError('');
  };

  // Process payment
  const processPayment = async () => {
    const totals = paymentTotals();
    
    if (totals.isUnderpaid) {
      setError(`Payment incomplete. $${totals.remaining.toFixed(2)} remaining.`);
      return;
    }

    setCalculating(true);
    try {
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      const paymentData = {
        paymentMethods: paymentMethods(),
        totalPaid: totals.totalPaid,
        change: totals.change,
        notes: paymentNote()
      };

      props.onComplete(paymentData);
    } catch (err) {
      devLog('Payment processing error:', err);
      setError('Payment processing failed. Please try again.');
    } finally {
      setCalculating(false);
    }
  };

  // Keyboard shortcuts
  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case '1': // Cash
          e.preventDefault();
          setSelectedPaymentMethod('cash');
          break;
        case '2': // Credit Card
          e.preventDefault();
          setSelectedPaymentMethod('creditCard');
          break;
        case '3': // Debit Card
          e.preventDefault();
          setSelectedPaymentMethod('debitCard');
          break;
        case 'Enter': // Process payment
          e.preventDefault();
          if (!paymentTotals().isUnderpaid) {
            processPayment();
          }
          break;
      }
    }
  };

  // Handle Google Pay payment success
  const handleGooglePaySuccess = (result: GooglePayResult) => {
    devLog('Google Pay payment successful:', result);
    
    // Set Google Pay as the payment method with the total amount
    setPaymentMethods(prev => ({
      ...prev,
      googlePay: 10
    }));
    
    // Show success message
    setError('');
    
    // Automatically process the payment since Google Pay was successful
    setTimeout(() => {
      processPayment();
    }, 100);
  };

  // Handle Google Pay payment error
  const handleGooglePayError = (error: string) => {
    setError(`Google Pay Error: ${error}`);
    setTimeout(() => setError(''), 5000);
  };

  // Handle credit card payment success
  const handleCreditCardSuccess = (result: any) => {
    devLog('Credit card payment successful:', result);
    
    // Set credit card as the payment method with the total amount
    setPaymentMethods(prev => ({
      ...prev,
      creditCard: props.totals.total
    }));
    
    // Hide the form
    setShowCreditCardForm(false);
    
    // Show success message
    setError('');
    
    // Automatically process the payment since credit card was successful
    setTimeout(() => {
      processPayment();
    }, 100);
  };

  // Handle credit card payment error
  const handleCreditCardError = (error: string) => {
    setError(`Credit Card Error: ${error}`);
    setTimeout(() => setError(''), 5000);
  };

  // Open credit card form
  const openCreditCardForm = () => {
    setShowCreditCardForm(true);
    setSelectedPaymentMethod('creditCard');
  };

  // Close credit card form
  const closeCreditCardForm = () => {
    setShowCreditCardForm(false);
  };

  // Set up keyboard listeners
  createEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  });

  return (
    <div style={{
      display: 'grid',
      'grid-template-columns': '1fr 400px',
      gap: '1.5rem'
    }}>
      {/* Payment Methods */}
      <div style={{ display: 'flex', 'flex-direction': 'column', gap: '1rem' }}>
        {/* Header */}
        <Card>
          <div style={{ padding: '1.5rem' }}>
            <div style={{
              display: 'flex',
              'justify-content': 'space-between',
              'align-items': 'center',
              'margin-bottom': '1rem'
            }}>
              <h2 style={{ margin: 0, 'font-size': '1.5rem' }}>
                {t('pos.paymentProcessing', 'Procesando Pago')}
              </h2>
              <Button
                variant="outline"
                onClick={props.onCancel}
                disabled={props.loading}
              >
                <Icon name="arrow-left" size="1rem" style={{ 'margin-right': '0.5rem' }} />
                {t('pos.backToCart', 'Volver al Carrito')}
              </Button>
            </div>
            
            <Show when={props.customer}>
              <div style={{
                padding: '0.75rem',
                background: 'var(--info-light)',
                color: 'var(--info-dark)',
                'border-radius': 'var(--border-radius-sm)',
                'font-size': '0.875rem'
              }}>
                {t('pos.customerInformation', 'Cliente')}: {props.customer!.name}
                <Show when={props.customer!.phoneNumber}>
                  <span style={{ 'margin-left': '1rem' }}>
                    <Icon name="phone" size="0.875rem" style={{ 'margin-right': '0.25rem' }} />{props.customer!.phoneNumber}
                  </span>
                </Show>
              </div>
            </Show>
          </div>
        </Card>

        {/* Quick Payment Buttons */}
        <Card>
          <div style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', 'font-size': '1.1rem' }}>
              {t('pos.quickPayment', 'Pago Rápido')}
            </h3>
            
            <div style={{
              display: 'grid',
              'grid-template-columns': 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '0.75rem',
              'margin-bottom': '1rem'
            }}>
              <For each={quickAmounts()}>
                {(item) => (
                  <Button
                    variant={item.label === t('pos.exact', 'Exacto') ? 'primary' : 'outline'}
                    onClick={() => quickCashPayment(item.amount)}
                    disabled={props.loading}
                  >
                    {item.label}
                    <Show when={item.label !== t('pos.exact', 'Exacto')}>
                      <br />
                      <span style={{ 'font-size': '0.75rem', opacity: '0.8' }}>
                        (Change: ${(item.amount - props.totals.total).toFixed(2)})
                      </span>
                    </Show>
                  </Button>
                )}
              </For>
            </div>

            <Button
              variant="secondary"
              onClick={quickPayExact}
              style={{ width: '100%', 'margin-bottom': '1rem' }}
              disabled={props.loading}
            >
              Pay Exact with {selectedPaymentMethod().replace(/([A-Z])/g, ' $1').toLowerCase()}
            </Button>

            {/* Google Pay Button */}
            <GooglePayButton
              amount={10}
              currency="USD"
              onPaymentSuccess={handleGooglePaySuccess}
              onPaymentError={handleGooglePayError}
              disabled={props.loading || calculating()}
            />

            {/* Manual Credit Card Entry Button */}
            <Button
              variant="outline"
              onClick={openCreditCardForm}
              style={{ 
                width: '100%', 
                'margin-top': '0.5rem',
                color: 'var(--primary-color)',
                'border-color': 'var(--primary-color)'
              }}
              disabled={props.loading || calculating()}
            >
              <Icon name="credit-card" size="1rem" style={{ 'margin-right': '0.5rem' }} />
              {t('pos.enterCardManually', 'Ingresar Tarjeta Manualmente')}
            </Button>
          </div>
        </Card>

        {/* Payment Method Selection */}
        <Card>
          <div style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', 'font-size': '1.1rem' }}>
              {t('pos.paymentMethods', 'Métodos de Pago')}
            </h3>
            
            <div style={{
              display: 'grid',
              'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem'
            }}>
              <div>
                <label style={{
                  display: 'block',
                  'margin-bottom': '0.5rem',
                  'font-weight': '600',
                  'font-size': '0.875rem'
                }}>
                  <Icon name="cash" size="1rem" style={{ 'margin-right': '0.5rem' }} />{t('pos.cash', 'Efectivo')}
                </label>
                <FormInput
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentMethods().cash || ''}
                  onChange={(value) => updatePaymentAmount('cash', parseFloat(value) || 0)}
                  placeholder="0.00"
                  onFocus={() => setSelectedPaymentMethod('cash')}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  'margin-bottom': '0.5rem',
                  'font-weight': '600',
                  'font-size': '0.875rem'
                }}>
                  <Icon name="credit-card" size="1rem" style={{ 'margin-right': '0.5rem' }} />{t('pos.creditCard', 'Tarjeta de Crédito')}
                </label>
                <FormInput
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentMethods().creditCard || ''}
                  onChange={(value) => updatePaymentAmount('creditCard', parseFloat(value) || 0)}
                  placeholder="0.00"
                  onFocus={() => setSelectedPaymentMethod('creditCard')}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  'margin-bottom': '0.5rem',
                  'font-weight': '600',
                  'font-size': '0.875rem'
                }}>
                  <Icon name="credit-card" size="1rem" style={{ 'margin-right': '0.5rem' }} />{t('pos.debitCard', 'Tarjeta de Débito')}
                </label>
                <FormInput
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentMethods().debitCard || ''}
                  onChange={(value) => updatePaymentAmount('debitCard', parseFloat(value) || 0)}
                  placeholder="0.00"
                  onFocus={() => setSelectedPaymentMethod('debitCard')}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  'margin-bottom': '0.5rem',
                  'font-weight': '600',
                  'font-size': '0.875rem'
                }}>
                  <Icon name="mobile" size="1rem" style={{ 'margin-right': '0.5rem' }} />{t('pos.zelle', 'Zelle')}
                </label>
                <FormInput
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentMethods().zelle || ''}
                  onChange={(value) => updatePaymentAmount('zelle', parseFloat(value) || 0)}
                  placeholder="0.00"
                  onFocus={() => setSelectedPaymentMethod('zelle')}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  'margin-bottom': '0.5rem',
                  'font-weight': '600',
                  'font-size': '0.875rem'
                }}>
                  <Icon name="bank" size="1rem" style={{ 'margin-right': '0.5rem' }} />{t('pos.bankTransfer', 'Transferencia Bancaria')}
                </label>
                <FormInput
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentMethods().bankTransfer || ''}
                  onChange={(value) => updatePaymentAmount('bankTransfer', parseFloat(value) || 0)}
                  placeholder="0.00"
                  onFocus={() => setSelectedPaymentMethod('bankTransfer')}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  'margin-bottom': '0.5rem',
                  'font-weight': '600',
                  'font-size': '0.875rem'
                }}>
                  <Icon name="check" size="1rem" style={{ 'margin-right': '0.5rem' }} />{t('pos.check', 'Cheque')}
                </label>
                <FormInput
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentMethods().check || ''}
                  onChange={(value) => updatePaymentAmount('check', parseFloat(value) || 0)}
                  placeholder="0.00"
                  onFocus={() => setSelectedPaymentMethod('check')}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  'margin-bottom': '0.5rem',
                  'font-weight': '600',
                  'font-size': '0.875rem'
                }}>
                  <Icon name="gift" size="1rem" style={{ 'margin-right': '0.5rem' }} />{t('pos.giftCard', 'Tarjeta de Regalo')}
                </label>
                <FormInput
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentMethods().giftCard || ''}
                  onChange={(value) => updatePaymentAmount('giftCard', parseFloat(value) || 0)}
                  placeholder="0.00"
                  onFocus={() => setSelectedPaymentMethod('giftCard')}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  'margin-bottom': '0.5rem',
                  'font-weight': '600',
                  'font-size': '0.875rem'
                }}>
                  <Icon name="google-pay" size="1rem" style={{ 'margin-right': '0.5rem' }} />{t('pos.googlePay', 'Google Pay')}
                </label>
                <FormInput
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentMethods().googlePay || ''}
                  onChange={(value) => updatePaymentAmount('googlePay', parseFloat(value) || 0)}
                  placeholder="0.00"
                  onFocus={() => setSelectedPaymentMethod('googlePay')}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  'margin-bottom': '0.5rem',
                  'font-weight': '600',
                  'font-size': '0.875rem'
                }}>
                  <Icon name="other" size="1rem" style={{ 'margin-right': '0.5rem' }} />{t('pos.other', 'Otro')}
                </label>
                <FormInput
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentMethods().other || ''}
                  onChange={(value) => updatePaymentAmount('other', parseFloat(value) || 0)}
                  placeholder="0.00"
                  onFocus={() => setSelectedPaymentMethod('other')}
                />
              </div>
            </div>

            {/* Payment Note */}
            <div style={{ 'margin-top': '1rem' }}>
              <label style={{
                display: 'block',
                'margin-bottom': '0.5rem',
                'font-weight': '600',
                'font-size': '0.875rem'
              }}>
                {t('pos.paymentNotes', 'Notas de Pago (Opcional)')}
              </label>
              <textarea
                value={paymentNote()}
                onInput={(e) => setPaymentNote(e.target.value)}
                placeholder="Add payment notes..."
                rows="2"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--border-color)',
                  'border-radius': 'var(--border-radius-sm)',
                  'font-family': 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Clear Payments Button */}
            <Button
              variant="outline"
              onClick={clearPayments}
              style={{ 'margin-top': '1rem' }}
              disabled={props.loading}
            >
              <Icon name="refresh" size="1rem" style={{ 'margin-right': '0.5rem' }} />
              {t('pos.clearAllPayments', 'Limpiar Todos los Pagos')}
            </Button>
          </div>
        </Card>
      </div>

      {/* Payment Summary & Actions */}
      <div style={{ display: 'flex', 'flex-direction': 'column', gap: '1rem' }}>
        {/* Order Summary */}
        <Card>
          <div style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', 'font-size': '1.1rem' }}>
              {t('pos.orderSummary', 'Resumen de Orden')}
            </h3>
            
            <div style={{
              display: 'flex',
              'flex-direction': 'column',
              gap: '0.5rem',
              'margin-bottom': '1rem'
            }}>
              <div style={{
                display: 'flex',
                'justify-content': 'space-between',
                'font-size': '0.875rem'
              }}>
                <span>{t('common.subtotal', 'Subtotal')}:</span>
                <span>${props.totals.subtotal.toFixed(2)}</span>
              </div>
              
              <Show when={props.totals.totalDiscount > 0}>
                <div style={{
                  display: 'flex',
                  'justify-content': 'space-between',
                  'font-size': '0.875rem',
                  color: 'var(--success-color)'
                }}>
                  <span>{t('pos.discount', 'Descuento')}:</span>
                  <span>-${props.totals.totalDiscount.toFixed(2)}</span>
                </div>
              </Show>
              
              <div style={{
                display: 'flex',
                'justify-content': 'space-between',
                'font-size': '0.875rem'
              }}>
                <span>{t('common.tax', 'Impuesto')}:</span>
                <span>${props.totals.totalTax.toFixed(2)}</span>
              </div>
              
              <hr style={{ 
                margin: '0.5rem 0', 
                border: 'none', 
                'border-top': '2px solid var(--border-color)' 
              }} />
              
              <div style={{
                display: 'flex',
                'justify-content': 'space-between',
                'font-size': '1.25rem',
                'font-weight': '700',
                color: 'var(--primary-color)'
              }}>
                <span>{t('common.total', 'Total')}:</span>
                <span>${props.totals.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Payment Status */}
        <Card>
          <div style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', 'font-size': '1.1rem' }}>
              {t('pos.paymentStatus', 'Estado del Pago')}
            </h3>
            
            <div style={{
              display: 'flex',
              'flex-direction': 'column',
              gap: '0.5rem'
            }}>
              <div style={{
                display: 'flex',
                'justify-content': 'space-between',
                'font-size': '0.875rem'
              }}>
                <span>{t('pos.totalPaid', 'Total Pagado')}:</span>
                <span style={{ 'font-weight': '600' }}>
                  ${paymentTotals().totalPaid.toFixed(2)}
                </span>
              </div>
              
              <Show when={paymentTotals().remaining > 0}>
                <div style={{
                  display: 'flex',
                  'justify-content': 'space-between',
                  'font-size': '0.875rem',
                  color: 'var(--error-color)'
                }}>
                  <span>{t('pos.remaining', 'Restante')}:</span>
                  <span style={{ 'font-weight': '600' }}>
                    ${paymentTotals().remaining.toFixed(2)}
                  </span>
                </div>
              </Show>
              
              <Show when={paymentTotals().change > 0}>
                <div style={{
                  display: 'flex',
                  'justify-content': 'space-between',
                  'font-size': '1rem',
                  'font-weight': '700',
                  color: 'var(--warning-color)',
                  padding: '0.5rem',
                  background: 'var(--warning-light)',
                  'border-radius': 'var(--border-radius-sm)'
                }}>
                  <span>{t('pos.changeDue', 'Cambio a Dar')}:</span>
                  <span>${paymentTotals().change.toFixed(2)}</span>
                </div>
              </Show>
              
              <Show when={paymentTotals().isExact}>
                <div style={{
                  padding: '0.75rem',
                  background: 'var(--success-light)',
                  color: 'var(--success-dark)',
                  'border-radius': 'var(--border-radius-sm)',
                  'text-align': 'center',
                  'font-weight': '600'
                }}>
                  <Icon name="check" size="1rem" style={{ 'margin-right': '0.5rem' }} />{t('pos.exactPayment', 'Pago Exacto')}
                </div>
              </Show>
            </div>
          </div>
        </Card>

        {/* Error Messages */}
        <Show when={error()}>
          <div style={{
            padding: '1rem',
            background: 'var(--error-light)',
            color: 'var(--error-dark)',
            'border-radius': 'var(--border-radius)',
            border: '1px solid var(--error-color)'
          }}>
            <Icon name="warning" size="1rem" style={{ 'margin-right': '0.5rem' }} />
            {error()}
          </div>
        </Show>

        {/* Action Buttons */}
        <Card>
          <div style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.75rem' }}>
              <Button
                variant="primary"
                size="lg"
                onClick={processPayment}
                disabled={paymentTotals().isUnderpaid || props.loading || calculating()}
                style={{ width: '100%' }}
              >
                <Show when={calculating() || props.loading} fallback={
                  <>
                    <Icon name="check" size="1rem" style={{ 'margin-right': '0.5rem' }} />
                    {t('pos.completeSale', 'Completar Venta')}
                  </>
                }>
                  <Icon name="loading" size="1rem" style={{ 'margin-right': '0.5rem' }} />
                  {t('pos.processing', 'Procesando...')}
                </Show>
              </Button>
              
              <Button
                variant="outline"
                onClick={props.onCancel}
                disabled={props.loading || calculating()}
                style={{ width: '100%' }}
              >
                {t('pos.cancelPayment', 'Cancelar Pago')}
              </Button>
            </div>
            
            {/* Keyboard Shortcuts */}
            <div style={{
              'margin-top': '1rem',
              'font-size': '0.7rem',
              color: 'var(--text-muted)',
              'text-align': 'center'
            }}>
              {t('pos.keyboardShortcuts', 'Atajos de Teclado')}: Ctrl+1 ({t('pos.cash', 'Efectivo')}) • Ctrl+2 ({t('pos.creditCard', 'Crédito')}) • {t('pos.ctrlEnter', 'Ctrl+Enter (Completar)')}
            </div>
          </div>
        </Card>
      </div>

      {/* Credit Card Form Modal */}
      <Show when={showCreditCardForm()}>
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          'z-index': 1000,
          padding: '1rem'
        }}>
          <div style={{
            'max-width': '500px',
            width: '100%',
            'max-height': '90vh',
            overflow: 'auto'
          }}>
            <CreditCardForm
              amount={props.totals.total}
              currency="USD"
              onPaymentSuccess={handleCreditCardSuccess}
              onPaymentError={handleCreditCardError}
              onCancel={closeCreditCardForm}
              disabled={props.loading || calculating()}
            />
          </div>
        </div>
      </Show>
    </div>
  );
};

export default PaymentProcessor;