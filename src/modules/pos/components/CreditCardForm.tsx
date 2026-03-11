import { Component, createSignal, Show, createEffect } from 'solid-js';
import { Card, Button, FormInput } from '../../ui';
import Icon from '../../../components/Icon';
import { useTranslation } from '../../../translations';
import { creditCardProcessor, CreditCardDetails } from '../../../services/creditCardProcessor';
import { devLog } from '../../../services/utils';

interface CreditCardFormProps {
  amount: number;
  currency?: string;
  onPaymentSuccess?: (result: any) => void;
  onPaymentError?: (error: string) => void;
  onCancel?: () => void;
  disabled?: boolean;
}

interface CardDetails {
  number: string;
  expiry: string;
  cvv: string;
  name: string;
  zipCode: string;
}

const CreditCardForm: Component<CreditCardFormProps> = (props) => {
  const { t } = useTranslation();
  
  // Form state
  const [cardDetails, setCardDetails] = createSignal<CardDetails>({
    number: '',
    expiry: '',
    cvv: '',
    name: '',
    zipCode: ''
  });
  
  const [isProcessing, setIsProcessing] = createSignal(false);
  const [errors, setErrors] = createSignal<Partial<CardDetails>>({});
  const [cardType, setCardType] = createSignal('');

  // Card number formatting and validation
  const formatCardNumber = (value: string): string => {
    // Remove all non-digits
    const digitsOnly = value.replace(/\D/g, '');
    
    // Add spaces every 4 digits
    const formatted = digitsOnly.replace(/(\d{4})(?=\d)/g, '$1 ');
    
    // Limit to 19 characters (16 digits + 3 spaces)
    return formatted.substring(0, 19);
  };

  // Expiry date formatting (MM/YY)
  const formatExpiry = (value: string): string => {
    const digitsOnly = value.replace(/\D/g, '');
    
    if (digitsOnly.length >= 2) {
      return `${digitsOnly.substring(0, 2)}/${digitsOnly.substring(2, 4)}`;
    }
    
    return digitsOnly;
  };

  // CVV formatting
  const formatCVV = (value: string): string => {
    return value.replace(/\D/g, '').substring(0, 4);
  };

  // Detect card type
  const detectCardType = (number: string): string => {
    const digitsOnly = number.replace(/\D/g, '');
    
    if (digitsOnly.startsWith('4')) return 'visa';
    if (digitsOnly.startsWith('5') || digitsOnly.startsWith('2')) return 'mastercard';
    if (digitsOnly.startsWith('3')) return 'amex';
    if (digitsOnly.startsWith('6')) return 'discover';
    
    return '';
  };

  // Validation functions
  const validateCardNumber = (number: string): boolean => {
    const digitsOnly = number.replace(/\D/g, '');
    
    // Basic length check
    if (digitsOnly.length < 13 || digitsOnly.length > 19) {
      return false;
    }
    
    // Luhn algorithm
    let sum = 0;
    let isEven = false;
    
    for (let i = digitsOnly.length - 1; i >= 0; i--) {
      let digit = parseInt(digitsOnly.charAt(i));
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  };

  const validateExpiry = (expiry: string): boolean => {
    const match = expiry.match(/^(\d{2})\/(\d{2})$/);
    if (!match) return false;
    
    const month = parseInt(match[1]);
    const year = parseInt(match[2]) + 2000;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    if (month < 1 || month > 12) return false;
    if (year < currentYear || (year === currentYear && month < currentMonth)) return false;
    
    return true;
  };

  const validateCVV = (cvv: string): boolean => {
    return cvv.length >= 3 && cvv.length <= 4;
  };

  // Handle input changes
  const handleCardNumberChange = (value: string) => {
    const formatted = formatCardNumber(value);
    setCardDetails(prev => ({ ...prev, number: formatted }));
    setCardType(detectCardType(formatted));
    
    // Clear error when user starts typing
    if (errors().number) {
      setErrors(prev => ({ ...prev, number: undefined }));
    }
  };

  const handleExpiryChange = (value: string) => {
    const formatted = formatExpiry(value);
    setCardDetails(prev => ({ ...prev, expiry: formatted }));
    
    if (errors().expiry) {
      setErrors(prev => ({ ...prev, expiry: undefined }));
    }
  };

  const handleCVVChange = (value: string) => {
    const formatted = formatCVV(value);
    setCardDetails(prev => ({ ...prev, cvv: formatted }));
    
    if (errors().cvv) {
      setErrors(prev => ({ ...prev, cvv: undefined }));
    }
  };

  const handleNameChange = (value: string) => {
    setCardDetails(prev => ({ ...prev, name: value }));
    
    if (errors().name) {
      setErrors(prev => ({ ...prev, name: undefined }));
    }
  };

  const handleZipChange = (value: string) => {
    setCardDetails(prev => ({ ...prev, zipCode: value }));
    
    if (errors().zipCode) {
      setErrors(prev => ({ ...prev, zipCode: undefined }));
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Partial<CardDetails> = {};
    const details = cardDetails();
    
    if (!validateCardNumber(details.number)) {
      newErrors.number = 'Invalid card number';
    }
    
    if (!validateExpiry(details.expiry)) {
      newErrors.expiry = 'Invalid expiry date';
    }
    
    if (!validateCVV(details.cvv)) {
      newErrors.cvv = 'Invalid CVV';
    }
    
    if (!details.name.trim()) {
      newErrors.name = 'Cardholder name is required';
    }
    
    if (!details.zipCode.trim()) {
      newErrors.zipCode = 'ZIP code is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Process payment
  const processPayment = async () => {
    if (!validateForm()) {
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const details = cardDetails();
      
      // Process payment using the credit card processor service
      const result = await creditCardProcessor.processPayment({
        cardDetails: details,
        amount: props.amount,
        currency: props.currency || 'USD',
        countryCode: 'US'
      });
      
      if (result.success) {
        props.onPaymentSuccess?.(result);
      } else {
        props.onPaymentError?.(result.error || 'Payment processing failed');
      }
      
    } catch (error) {
      devLog('Credit card payment error:', error);
      props.onPaymentError?.('Payment processing failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Get card icon
  const getCardIcon = () => {
    switch (cardType()) {
      case 'visa': return 'credit-card';
      case 'mastercard': return 'credit-card';
      case 'amex': return 'credit-card';
      case 'discover': return 'credit-card';
      default: return 'credit-card';
    }
  };

  return (
    <Card>
      <div style={{ padding: '1.5rem' }}>
        <div style={{
          display: 'flex',
          'justify-content': 'space-between',
          'align-items': 'center',
          'margin-bottom': '1.5rem'
        }}>
          <h3 style={{ margin: 0, 'font-size': '1.2rem' }}>
            <Icon name="credit-card" size="1.2rem" style={{ 'margin-right': '0.5rem' }} />
            {t('pos.creditCardPayment', 'Pago con Tarjeta de Crédito')}
          </h3>
          
          <div style={{
            'font-size': '1.1rem',
            'font-weight': '600',
            color: 'var(--primary-color)'
          }}>
            ${props.amount.toFixed(2)} {props.currency || 'USD'}
          </div>
        </div>

        {/* Card Number */}
        <div style={{ 'margin-bottom': '1rem' }}>
          <label style={{
            display: 'block',
            'margin-bottom': '0.5rem',
            'font-weight': '600',
            'font-size': '0.875rem'
          }}>
            {t('pos.cardNumber', 'Número de Tarjeta')}
          </label>
          <div style={{ position: 'relative' }}>
            <FormInput
              type="text"
              value={cardDetails().number}
              onChange={handleCardNumberChange}
              placeholder="1234 5678 9012 3456"
              disabled={props.disabled || isProcessing()}
              style={{
                'padding-right': '2.5rem',
                ...(errors().number ? { 'border-color': 'var(--error-color)' } : {})
              }}
            />
            <Show when={cardType()}>
              <Icon 
                name={getCardIcon()} 
                size="1.2rem" 
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)'
                }}
              />
            </Show>
          </div>
          <Show when={errors().number}>
            <div style={{
              'font-size': '0.75rem',
              color: 'var(--error-color)',
              'margin-top': '0.25rem'
            }}>
              {errors().number}
            </div>
          </Show>
        </div>

        {/* Expiry and CVV */}
        <div style={{
          display: 'grid',
          'grid-template-columns': '1fr 1fr',
          gap: '1rem',
          'margin-bottom': '1rem'
        }}>
          <div>
            <label style={{
              display: 'block',
              'margin-bottom': '0.5rem',
              'font-weight': '600',
              'font-size': '0.875rem'
            }}>
              {t('pos.expiryDate', 'Fecha de Vencimiento')}
            </label>
            <FormInput
              type="text"
              value={cardDetails().expiry}
              onChange={handleExpiryChange}
              placeholder="MM/YY"
              disabled={props.disabled || isProcessing()}
              style={errors().expiry ? { 'border-color': 'var(--error-color)' } : {}}
            />
            <Show when={errors().expiry}>
              <div style={{
                'font-size': '0.75rem',
                color: 'var(--error-color)',
                'margin-top': '0.25rem'
              }}>
                {errors().expiry}
              </div>
            </Show>
          </div>

          <div>
            <label style={{
              display: 'block',
              'margin-bottom': '0.5rem',
              'font-weight': '600',
              'font-size': '0.875rem'
            }}>
              {t('pos.cvv', 'CVV')}
            </label>
            <FormInput
              type="text"
              value={cardDetails().cvv}
              onChange={handleCVVChange}
              placeholder="123"
              disabled={props.disabled || isProcessing()}
              style={errors().cvv ? { 'border-color': 'var(--error-color)' } : {}}
            />
            <Show when={errors().cvv}>
              <div style={{
                'font-size': '0.75rem',
                color: 'var(--error-color)',
                'margin-top': '0.25rem'
              }}>
                {errors().cvv}
              </div>
            </Show>
          </div>
        </div>

        {/* Cardholder Name */}
        <div style={{ 'margin-bottom': '1rem' }}>
          <label style={{
            display: 'block',
            'margin-bottom': '0.5rem',
            'font-weight': '600',
            'font-size': '0.875rem'
          }}>
            {t('pos.cardholderName', 'Nombre del Titular')}
          </label>
          <FormInput
            type="text"
            value={cardDetails().name}
            onChange={handleNameChange}
            placeholder="John Doe"
            disabled={props.disabled || isProcessing()}
            style={errors().name ? { 'border-color': 'var(--error-color)' } : {}}
          />
          <Show when={errors().name}>
            <div style={{
              'font-size': '0.75rem',
              color: 'var(--error-color)',
              'margin-top': '0.25rem'
            }}>
              {errors().name}
            </div>
          </Show>
        </div>

        {/* ZIP Code */}
        <div style={{ 'margin-bottom': '1.5rem' }}>
          <label style={{
            display: 'block',
            'margin-bottom': '0.5rem',
            'font-weight': '600',
            'font-size': '0.875rem'
          }}>
            {t('pos.zipCode', 'Código Postal')}
          </label>
          <FormInput
            type="text"
            value={cardDetails().zipCode}
            onChange={handleZipChange}
            placeholder="12345"
            disabled={props.disabled || isProcessing()}
            style={{
              'max-width': '150px',
              ...(errors().zipCode ? { 'border-color': 'var(--error-color)' } : {})
            }}
          />
          <Show when={errors().zipCode}>
            <div style={{
              'font-size': '0.75rem',
              color: 'var(--error-color)',
              'margin-top': '0.25rem'
            }}>
              {errors().zipCode}
            </div>
          </Show>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          'justify-content': 'flex-end'
        }}>
          <Button
            variant="outline"
            onClick={props.onCancel}
            disabled={isProcessing()}
          >
            {t('common.cancel', 'Cancelar')}
          </Button>
          
          <Button
            variant="primary"
            onClick={processPayment}
            disabled={props.disabled || isProcessing()}
            style={{ 'min-width': '150px' }}
          >
            <Show when={isProcessing()} fallback={
              <>
                <Icon name="credit-card" size="1rem" style={{ 'margin-right': '0.5rem' }} />
                {t('pos.processPayment', 'Procesar Pago')}
              </>
            }>
              <Icon name="loading" size="1rem" style={{ 'margin-right': '0.5rem' }} />
              {t('pos.processing', 'Procesando...')}
            </Show>
          </Button>
        </div>

        {/* Security Notice */}
        <div style={{
          'margin-top': '1rem',
          padding: '0.75rem',
          background: 'var(--info-light)',
          color: 'var(--info-dark)',
          'border-radius': 'var(--border-radius-sm)',
          'font-size': '0.75rem',
          'text-align': 'center'
        }}>
          <Icon name="lock" size="0.875rem" style={{ 'margin-right': '0.5rem' }} />
          {t('pos.securePayment', 'Transacción segura y encriptada')}
        </div>
      </div>
    </Card>
  );
};

export default CreditCardForm;