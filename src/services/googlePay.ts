// Google Pay Web API integration for POS system
// This provides a basic implementation of Google Pay functionality

export interface GooglePayConfig {
  environment: 'TEST' | 'PRODUCTION';
  merchantId: string;
  merchantName: string;
  allowedCardNetworks: string[];
  allowedCardAuthMethods: string[];
}

export interface GooglePaymentRequest {
  amount: number;
  currency: string;
  countryCode: string;
}

export interface GooglePayResult {
  success: boolean;
  paymentToken?: string;
  error?: string;
}

class GooglePayService {
  private config: GooglePayConfig;
  private paymentsClient: any = null;
  private isGooglePayReady = false;

  constructor(config: GooglePayConfig) {
    this.config = config;
  }

  // Initialize Google Pay API
  async initialize(): Promise<boolean> {
    try {
      // Check if Google Pay API is available
      if (!window.google || !window.google.payments) {
        console.warn('Google Pay API not available');
        return false;
      }

      // Initialize payments client
      this.paymentsClient = new window.google.payments.api.PaymentsClient({
        environment: this.config.environment
      });

      // Check if Google Pay is ready
      const isReadyToPayRequest = this.getIsReadyToPayRequest();
      const response = await this.paymentsClient.isReadyToPay(isReadyToPayRequest);
      
      this.isGooglePayReady = response.result;
      return this.isGooglePayReady;
    } catch (error) {
      console.error('Error initializing Google Pay:', error);
      return false;
    }
  }

  // Check if Google Pay is available and ready
  isReady(): boolean {
    return this.isGooglePayReady;
  }

  // Create payment request
  private getIsReadyToPayRequest() {
    return {
      apiVersion: 2,
      apiVersionMinor: 0,
      allowedPaymentMethods: this.getAllowedPaymentMethods()
    };
  }

  private getAllowedPaymentMethods() {
    return [{
      type: 'CARD',
      parameters: {
        allowedAuthMethods: this.config.allowedCardAuthMethods,
        allowedCardNetworks: this.config.allowedCardNetworks
      },
      tokenizationSpecification: {
        type: 'PAYMENT_GATEWAY',
        parameters: {
          // Replace with your payment processor
          // Examples:
          // - Stripe: gateway: 'stripe', gatewayMerchantId: 'your_stripe_merchant_id'
          // - Square: gateway: 'square', gatewayMerchantId: 'your_square_application_id'
          // - Authorize.Net: gateway: 'authorizenet', gatewayMerchantId: 'your_merchant_id'
          gateway: 'stripe', // Change this to your payment processor
          gatewayMerchantId: this.config.merchantId
        }
      }
    }];
  }

  private getPaymentDataRequest(amount: number, currency: string, countryCode: string) {
    const paymentDataRequest = {
      apiVersion: 2,
      apiVersionMinor: 0,
      allowedPaymentMethods: this.getAllowedPaymentMethods(),
      transactionInfo: {
        totalPriceStatus: 'FINAL',
        totalPrice: amount.toString(),
        currencyCode: currency,
        countryCode: countryCode
      },
      merchantInfo: {
        merchantId: this.config.merchantId,
        merchantName: this.config.merchantName
      }
    };

    return paymentDataRequest;
  }

  // Process payment
  async processPayment(request: GooglePaymentRequest): Promise<GooglePayResult> {
    try {
      if (!this.isGooglePayReady) {
        return {
          success: false,
          error: 'Google Pay is not ready'
        };
      }

      const paymentDataRequest = this.getPaymentDataRequest(
        request.amount,
        request.currency,
        request.countryCode
      );

      const paymentData = await this.paymentsClient.loadPaymentData(paymentDataRequest);

      // Get the payment token from Google Pay
      const paymentToken = paymentData.paymentMethodData.tokenizationData.token;
      
      // Process the payment with your backend payment processor
      const paymentResult = await this.processPaymentWithBackend(paymentToken, request);
      
      if (paymentResult.success) {
        return {
          success: true,
          paymentToken: paymentResult.transactionId
        };
      } else {
        return {
          success: false,
          error: paymentResult.error || 'Payment processing failed'
        };
      }
    } catch (error) {
      console.error('Google Pay payment failed:', error);
      return {
        success: false,
        error: error.message || 'Payment failed'
      };
    }
  }

  // Process payment with backend payment processor
  private async processPaymentWithBackend(paymentToken: string, request: GooglePaymentRequest) {
    try {
      // This is where you integrate with your payment processor
      // Examples: Stripe, Square, PayPal, Authorize.Net, etc.
      
      const response = await fetch('/api/payments/process-google-pay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          paymentToken,
          amount: request.amount,
          currency: request.currency,
          countryCode: request.countryCode,
          merchantId: this.config.merchantId
        })
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        return {
          success: true,
          transactionId: result.transactionId,
          receipt: result.receipt
        };
      } else {
        return {
          success: false,
          error: result.error || 'Payment processing failed'
        };
      }
    } catch (error) {
      console.error('Backend payment processing error:', error);
      return {
        success: false,
        error: 'Network error - payment could not be processed'
      };
    }
  }

  // Get authentication token (implement based on your auth system)
  private getAuthToken(): string {
    // Implement your authentication token retrieval
    // This could be from localStorage, a auth store, etc.
    return localStorage.getItem('authToken') || '';
  }

  // Show Google Pay button
  createPaymentButton(container: HTMLElement, amount: number, currency: string, countryCode: string = 'US') {
    if (!this.isGooglePayReady) {
      console.warn('Google Pay is not ready');
      return null;
    }

    const button = this.paymentsClient.createButton({
      onClick: async () => {
        try {
          const result = await this.processPayment({
            amount,
            currency,
            countryCode
          });
          
          // Dispatch custom event with result
          const event = new CustomEvent('googlepay-payment', {
            detail: result
          });
          window.dispatchEvent(event);
        } catch (error) {
          console.error('Payment error:', error);
        }
      }
    });

    container.appendChild(button);
    return button;
  }
}

// Default configuration for demo/testing
// TO PROCESS REAL PAYMENTS, YOU MUST:
// 1. Set environment to 'PRODUCTION'
// 2. Replace merchantId with your actual merchant ID from your payment processor
// 3. Update the gateway in getAllowedPaymentMethods() to match your processor
// 4. Implement the backend endpoint /api/payments/process-google-pay
export const defaultGooglePayConfig: GooglePayConfig = {
  environment: 'TEST', // Change to 'PRODUCTION' for live payments
  merchantId: 'your_actual_merchant_id_here', // Replace with your real merchant ID
  merchantName: 'HRM Finance POS',
  allowedCardNetworks: ['AMEX', 'DISCOVER', 'JCB', 'MASTERCARD', 'VISA'],
  allowedCardAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS']
};

// Create singleton instance
export const googlePayService = new GooglePayService(defaultGooglePayConfig);

// Utility function to load Google Pay API script
export const loadGooglePayAPI = (): Promise<boolean> => {
  return new Promise((resolve) => {
    // Check if already loaded
    if (window.google && window.google.payments) {
      resolve(true);
      return;
    }

    // Create script element
    const script = document.createElement('script');
    script.src = 'https://pay.google.com/gp/p/js/pay.js';
    script.async = true;
    
    script.onload = () => {
      resolve(true);
    };
    
    script.onerror = () => {
      console.error('Failed to load Google Pay API');
      resolve(false);
    };

    document.head.appendChild(script);
  });
};

// Type declarations for Google Pay API
declare global {
  interface Window {
    google: {
      payments: {
        api: {
          PaymentsClient: any;
        };
      };
    };
  }
}