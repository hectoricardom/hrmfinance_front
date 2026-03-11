// Credit Card Processing Service
// This handles manual credit card entry and processing

export interface CreditCardDetails {
  number: string;
  expiry: string;
  cvv: string;
  name: string;
  zipCode: string;
}

export interface CreditCardPaymentRequest {
  cardDetails: CreditCardDetails;
  amount: number;
  currency: string;
  countryCode?: string;
}

export interface CreditCardPaymentResult {
  success: boolean;
  transactionId?: string;
  error?: string;
  cardType?: string;
  last4?: string;
}

class CreditCardProcessor {
  
  // Process manual credit card payment
  async processPayment(request: CreditCardPaymentRequest): Promise<CreditCardPaymentResult> {
    try {
      // In a real implementation, you would:
      // 1. Tokenize the card details using your payment processor's SDK
      // 2. Send the token to your backend for processing
      // 3. NEVER send raw card details to your backend for PCI compliance
      
      // For production, use something like:
      // - Stripe.js to tokenize cards client-side
      // - Square's Web SDK
      // - PayPal's JavaScript SDK
      // - Authorize.Net's Accept.js
      
      // Validate card details
      const validation = this.validateCardDetails(request.cardDetails);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // Detect card type
      const cardType = this.detectCardType(request.cardDetails.number);
      const last4 = request.cardDetails.number.replace(/\D/g, '').slice(-4);

      // Simulate processing with your payment processor
      const processingResult = await this.processWithPaymentProcessor(request);
      
      if (processingResult.success) {
        return {
          success: true,
          transactionId: processingResult.transactionId,
          cardType,
          last4
        };
      } else {
        return {
          success: false,
          error: processingResult.error || 'Payment processing failed'
        };
      }
      
    } catch (error) {
      console.error('Credit card processing error:', error);
      return {
        success: false,
        error: 'Payment processing failed'
      };
    }
  }

  // Process with actual payment processor
  private async processWithPaymentProcessor(request: CreditCardPaymentRequest) {
    try {
      // THIS IS A DEMO IMPLEMENTATION
      // In production, replace this with actual payment processor integration
      
      // Example for Stripe:
      // const stripe = window.Stripe('pk_live_...');
      // const token = await stripe.createToken('card', {
      //   number: request.cardDetails.number,
      //   exp_month: parseInt(request.cardDetails.expiry.split('/')[0]),
      //   exp_year: parseInt('20' + request.cardDetails.expiry.split('/')[1]),
      //   cvc: request.cardDetails.cvv,
      //   name: request.cardDetails.name,
      //   address_zip: request.cardDetails.zipCode
      // });
      
      // Then send token to backend:
      // const response = await fetch('/api/payments/process-card', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     token: token.token.id,
      //     amount: request.amount,
      //     currency: request.currency
      //   })
      // });
      
      // For demo purposes, simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate 95% success rate
      const isSuccess = Math.random() > 0.05;
      
      if (isSuccess) {
        return {
          success: true,
          transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
      } else {
        return {
          success: false,
          error: 'Card declined - insufficient funds'
        };
      }
      
    } catch (error) {
      console.error('Payment processor error:', error);
      return {
        success: false,
        error: 'Network error - payment could not be processed'
      };
    }
  }

  // Validate card details
  private validateCardDetails(details: CreditCardDetails): { valid: boolean; error?: string } {
    // Validate card number using Luhn algorithm
    if (!this.validateCardNumber(details.number)) {
      return { valid: false, error: 'Invalid card number' };
    }

    // Validate expiry date
    if (!this.validateExpiryDate(details.expiry)) {
      return { valid: false, error: 'Invalid or expired card' };
    }

    // Validate CVV
    if (!this.validateCVV(details.cvv)) {
      return { valid: false, error: 'Invalid CVV' };
    }

    // Validate required fields
    if (!details.name.trim()) {
      return { valid: false, error: 'Cardholder name is required' };
    }

    if (!details.zipCode.trim()) {
      return { valid: false, error: 'ZIP code is required' };
    }

    return { valid: true };
  }

  // Luhn algorithm for card number validation
  private validateCardNumber(number: string): boolean {
    const digitsOnly = number.replace(/\D/g, '');
    
    if (digitsOnly.length < 13 || digitsOnly.length > 19) {
      return false;
    }
    
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
  }

  // Validate expiry date
  private validateExpiryDate(expiry: string): boolean {
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
  }

  // Validate CVV
  private validateCVV(cvv: string): boolean {
    return cvv.length >= 3 && cvv.length <= 4 && /^\d+$/.test(cvv);
  }

  // Detect card type
  private detectCardType(number: string): string {
    const digitsOnly = number.replace(/\D/g, '');
    
    if (digitsOnly.startsWith('4')) return 'Visa';
    if (digitsOnly.startsWith('5') || digitsOnly.startsWith('2')) return 'Mastercard';
    if (digitsOnly.startsWith('3')) return 'American Express';
    if (digitsOnly.startsWith('6')) return 'Discover';
    
    return 'Unknown';
  }

  // Get authentication token for API calls
  private getAuthToken(): string {
    return localStorage.getItem('authToken') || '';
  }
}

// Export singleton instance
export const creditCardProcessor = new CreditCardProcessor();

// Utility functions for card formatting (already in CreditCardForm but exported for reuse)
export const formatCardNumber = (value: string): string => {
  const digitsOnly = value.replace(/\D/g, '');
  const formatted = digitsOnly.replace(/(\d{4})(?=\d)/g, '$1 ');
  return formatted.substring(0, 19);
};

export const formatExpiry = (value: string): string => {
  const digitsOnly = value.replace(/\D/g, '');
  
  if (digitsOnly.length >= 2) {
    return `${digitsOnly.substring(0, 2)}/${digitsOnly.substring(2, 4)}`;
  }
  
  return digitsOnly;
};

export const formatCVV = (value: string): string => {
  return value.replace(/\D/g, '').substring(0, 4);
};