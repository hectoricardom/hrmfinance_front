/**
 * Stripe Service
 * Client-side service for Stripe Checkout integration.
 * Calls /api/stripe/* endpoints served by the Vite dev server plugin.
 */

import type {
  CreateCheckoutSessionRequest,
  CreateCheckoutSessionResponse,
  PendingStripePayment,
} from '../types/paymentTypes';

const PENDING_PAYMENT_KEY = 'stripe_pending_payment';

class StripeService {
  private publishableKey: string;
  private createUrl: string;
  private verifyUrl: string;

  constructor() {
    this.publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_51T0k6aPgU733DaBTETKzT3q63J7JrdTe3VOwMVjHcNDVFEiOWHfm8caG5yEdSouBlTFHOAfxtGT9XVTkKNYzL3ae000PF2OVpH';
    // Local dev: served by Vite plugin. Production: override via env.
    this.createUrl = import.meta.env.VITE_STRIPE_CREATE_URL || '/api/stripe/create-session';
    this.verifyUrl = import.meta.env.VITE_STRIPE_VERIFY_URL || '/api/stripe/verify-session';
  }

  /**
   * Check if Stripe is configured (publishable key is enough for client)
   */
  isConfigured(): boolean {
    return !!this.publishableKey;
  }

  /**
   * Create a Stripe Checkout Session and redirect to Stripe
   */
  async createCheckoutAndRedirect(
    request: CreateCheckoutSessionRequest,
    pendingData: Omit<PendingStripePayment, 'sessionId' | 'createdAt'>
  ): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Stripe is not configured. Please set VITE_STRIPE_PUBLISHABLE_KEY.');
    }

    const response = await fetch(this.createUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to create checkout session (${response.status})`);
    }

    const data: CreateCheckoutSessionResponse = await response.json();

    // Store pending payment in sessionStorage to survive the redirect
    const pending: PendingStripePayment = {
      ...pendingData,
      sessionId: data.sessionId,
      createdAt: Date.now(),
    };
    sessionStorage.setItem(PENDING_PAYMENT_KEY, JSON.stringify(pending));

    // Redirect to Stripe Checkout
    window.location.href = data.url;
  }

  /**
   * Retrieve and clear pending payment data from sessionStorage
   */
  retrievePendingPayment(): PendingStripePayment | null {
    const raw = sessionStorage.getItem(PENDING_PAYMENT_KEY);
    if (!raw) return null;

    sessionStorage.removeItem(PENDING_PAYMENT_KEY);

    try {
      return JSON.parse(raw) as PendingStripePayment;
    } catch {
      return null;
    }
  }

  /**
   * Verify a Stripe Checkout Session
   */
  async verifySession(sessionId: string): Promise<{
    status: string;
    paymentIntentId: string;
    amountTotal: number;
  }> {
    const response = await fetch(`${this.verifyUrl}?sessionId=${encodeURIComponent(sessionId)}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to verify session (${response.status})`);
    }

    return response.json();
  }
}

export const stripeService = new StripeService();
