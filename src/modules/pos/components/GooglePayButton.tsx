import { Component, createSignal, onMount, onCleanup, Show } from 'solid-js';
import { googlePayService, loadGooglePayAPI, GooglePayResult } from '../../../services/googlePay';
import { Button } from '../../ui';
import Icon from '../../../components/Icon';
import { useTranslation } from '../../../translations';
import { devLog } from '../../../services/utils';

interface GooglePayButtonProps {
  amount: number;
  currency?: string;
  countryCode?: string;
  onPaymentSuccess?: (result: GooglePayResult) => void;
  onPaymentError?: (error: string) => void;
  disabled?: boolean;
}

const GooglePayButton: Component<GooglePayButtonProps> = (props) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = createSignal(false);
  const [isGooglePayReady, setIsGooglePayReady] = createSignal(false);
  const [error, setError] = createSignal('');
  
  let containerRef: HTMLDivElement | undefined;

  // Initialize Google Pay on mount
  onMount(async () => {
    try {
      setIsLoading(true);
      
      // Load Google Pay API
      const apiLoaded = await loadGooglePayAPI();
      if (!apiLoaded) {
        setError('Google Pay API failed to load');
        return;
      }

      // Initialize Google Pay service
      const initialized = await googlePayService.initialize();
      setIsGooglePayReady(initialized);
      
      if (!initialized) {
        setError('Google Pay is not available on this device');
      }
    } catch (err) {
      devLog('Error initializing Google Pay:', err);
      setError('Failed to initialize Google Pay');
    } finally {
      setIsLoading(false);
    }
  });

  // Handle payment
  const handlePayment = async () => {
    try {
      setIsLoading(true);
      setError('');

      const result = await googlePayService.processPayment({
        amount: props.amount,
        currency: props.currency || 'USD',
        countryCode: props.countryCode || 'US'
      });

      if (result.success) {
        props.onPaymentSuccess?.(result);
      } else {
        const errorMsg = result.error || 'Payment failed';
        setError(errorMsg);
        props.onPaymentError?.(errorMsg);
      }
    } catch (err) {
      devLog('Payment error:', err);
      const errorMsg = 'Payment processing failed';
      setError(errorMsg);
      props.onPaymentError?.(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Listen for Google Pay events
  const handleGooglePayEvent = (event: CustomEvent) => {
    const result = event.detail as GooglePayResult;
    if (result.success) {
      props.onPaymentSuccess?.(result);
    } else {
      const errorMsg = result.error || 'Payment failed';
      setError(errorMsg);
      props.onPaymentError?.(errorMsg);
    }
  };

  onMount(() => {
    window.addEventListener('googlepay-payment', handleGooglePayEvent as EventListener);
  });

  onCleanup(() => {
    window.removeEventListener('googlepay-payment', handleGooglePayEvent as EventListener);
  });

  return (
    <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.5rem' }}>
      {/* Custom Google Pay Button */}
      <Show when={isGooglePayReady() && !isLoading()} fallback={
        <Button
          variant="outline"
          disabled={true}
          style={{
            width: '100%',
            background: '#f8f9fa',
            color: '#6c757d',
            border: '1px solid #dee2e6'
          }}
        >
          <Show when={isLoading()} fallback={
            <>
              <Icon name="google-pay" size="1rem" style={{ 'margin-right': '0.5rem' }} />
              {error() || 'Google Pay Unavailable'}
            </>
          }>
            <Icon name="loading" size="1rem" style={{ 'margin-right': '0.5rem' }} />
            {t('pos.processing', 'Procesando...')}
          </Show>
        </Button>
      }>
        <Button
          variant="secondary"
          onClick={handlePayment}
          disabled={props.disabled || isLoading()}
          style={{
            width: '100%',
            background: '#4285f4',
            color: 'white',
            border: 'none',
            'border-radius': '4px',
            padding: '12px 16px',
            'font-weight': '500',
            'box-shadow': '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => {
            if (!props.disabled && !isLoading()) {
              e.currentTarget.style.background = '#3367d6';
              e.currentTarget.style.boxShadow = '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)';
            }
          }}
          onMouseOut={(e) => {
            if (!props.disabled && !isLoading()) {
              e.currentTarget.style.background = '#4285f4';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)';
            }
          }}
        >
          <Show when={isLoading()} fallback={
            <>
              <Icon name="google-pay" size="1rem" style={{ 'margin-right': '0.5rem' }} />
              Pay with Google Pay
            </>
          }>
            <Icon name="loading" size="1rem" style={{ 'margin-right': '0.5rem' }} />
            {t('pos.processing', 'Procesando...')}
          </Show>
        </Button>
      </Show>

      {/* Error display */}
      <Show when={error()}>
        <div style={{
          padding: '0.5rem',
          background: 'var(--error-light)',
          color: 'var(--error-dark)',
          'border-radius': 'var(--border-radius-sm)',
          'font-size': '0.875rem',
          'text-align': 'center'
        }}>
          {error()}
        </div>
      </Show>

      {/* Google Pay container for native button (optional) */}
      <div ref={containerRef} style={{ display: 'none' }} />
    </div>
  );
};

export default GooglePayButton;