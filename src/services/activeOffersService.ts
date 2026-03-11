/**
 * Active Offers Service
 * Manages the currently active YABA offers configuration for invoice calculations
 */

import { createSignal } from 'solid-js';
import { yabaOffersApi } from './apiAdapter';
import type { ShippingMethod, ItemCategory, WeightRange } from './shippingOffersService';
import { devLog } from './utils';

export interface ActiveOfferConfig {
  id: string;
  name: string;
  code: string;
  isActive?: boolean;
  isVisible?: boolean;
  offers: any[];
  loadedAt: Date;
}

// Global state for active offers
const [activeConfig, setActiveConfig] = createSignal<ActiveOfferConfig | null>(null);
const [isLoading, setIsLoading] = createSignal(false);
const [lastError, setLastError] = createSignal<string | null>(null);
const [availableOffers, setAvailableOffers] = createSignal<any[]>([]);






export function getAvailableOffers(): ActiveOfferConfig[] {
  return availableOffers();
}



/**
 * Get the saved active offer ID from localStorage
 */
function getSavedActiveOfferId(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('yaba-active-offer-id');
  }
  return null;
}

/**
 * Save the active offer ID to localStorage
 */
function saveActiveOfferId(offerId: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('yaba-active-offer-id', offerId);
    devLog('💾 Active offer ID saved:', offerId);
  }
}

/**
 * Load the active offers configuration from API
 */




const parseOffer =(targetOffer:any): ActiveOfferConfig =>{
  const offerData = JSON.parse(targetOffer.data);
    const offersArray = JSON.parse(offerData.offers);

    const config: ActiveOfferConfig = {
      id: targetOffer.id,
      name: offerData.offerName || 'Default',
      code: offerData.offerCode,
      isActive: offerData.isActive ?? true,
      isVisible: offerData.isVisible ?? true,
      offers: offersArray,
      loadedAt: new Date()
    };

    return config
}



export async function loadActiveOffers(forceOfferId?: string): Promise<ActiveOfferConfig | null> {
  try {
    setIsLoading(true);
    setLastError(null);

    const offersD = await yabaOffersApi.getAll();

    if (offersD.length === 0) {
      console.warn('⚠️ No YABA offers found, using hardcoded defaults');
      return null;
    }


    const offers = offersD.filter(e=>parseOffer(e)?.isActive)
    setAvailableOffers(offers);
  
    // Determine which offer to load
    let targetOffer = null;

    if (forceOfferId) {
      // Use forced ID if provided
      targetOffer = offers.find((o: any) => o.id === forceOfferId);
    } else {
      // Try to load saved preference
      const savedId = getSavedActiveOfferId();
      if (savedId) {
        targetOffer = offers.find((o: any) => o.id === savedId);
      }
    }


    // Fallback to first offer
    if (!targetOffer) {
      targetOffer = offers[0];
      devLog('📌 Using first available offer as default');
    }


    setAvailableOffers(offers.filter(e=>parseOffer(e)?.isActive));

    const config: ActiveOfferConfig = parseOffer(targetOffer)



    setActiveConfig(config);
    saveActiveOfferId(config.id);
    devLog('✅ Active offers loaded:', config.name, `(ID: ${config.id})`);

    return config;
  } catch (error) {
    console.error('❌ Error loading active offers:', error);
    setLastError(error?.message || 'Error loading offers');
    return null;
  } finally {
    setIsLoading(false);
  }
}

/**
 * Switch to a different offer configuration
 */
export async function switchActiveOffer(offerId: string): Promise<ActiveOfferConfig | null> {
  devLog('🔄 Switching to offer:', offerId);
  return await loadActiveOffers(offerId);
}

/**
 * Get the currently active configuration
 */
export function getActiveConfig(): ActiveOfferConfig | null {
  return activeConfig();
}

/**
 * Get weight ranges for a specific method and category
 */
export function getWeightRanges(method: ShippingMethod, category: ItemCategory): WeightRange[] {
  const config = activeConfig();
  if (!config) return [];

  const offer = config.offers.find(
    (o: any) => o.method === method && o.category === category
  );

  return offer?.ranges || [];
}

/**
 * Calculate price based on weight, method, and category
 */
export function calculatePrice(
  weight: number,
  method: ShippingMethod,
  category: ItemCategory
): { price: number; pricePerLb: number; range?: WeightRange; freeWeight?: number } | null {
  const ranges = getWeightRanges(method, category);

  if (ranges.length === 0) {
    return null;
  }

  // Find applicable range
  const range = ranges.find((r: WeightRange) => weight >= r.min && weight <= r.max);

  if (!range) {
    console.warn(`⚠️ No range found for ${weight}lbs in ${method} ${category}`);
    return null;
  }

  // Calculate effective weight (accounting for free weight promotion)
  const effectiveWeight = range.freeWeight
    ? Math.min(weight, range.needBePay || weight)
    : weight;

  const price = effectiveWeight * range.pricePerLb;

  return {
    price,
    pricePerLb: range.pricePerLb,
    range,
    freeWeight: range.freeWeight
  };
}

/**
 * Get box options for flat rate pricing
 */
export function getBoxOptions(method: ShippingMethod = 'maritime') {
  const config = activeConfig();
  if (!config) return [];

  const offer = config.offers.find(
    (o: any) => o.method === method && o.category === 'box_flat_rate'
  );

  return offer?.boxOptions || [];
}

/**
 * Check if offers are loaded
 */
export function isOffersLoaded(): boolean {
  return activeConfig() !== null;
}

/**
 * Check if currently loading
 */
export function isOffersLoading(): boolean {
  return isLoading();
}

/**
 * Get last error
 */
export function getLastError(): string | null {
  return lastError();
}

/**
 * Reload offers from API
 */
export async function reloadOffers(): Promise<void> {
  await loadActiveOffers();
}

// Export signals for reactive access
export { activeConfig, isLoading, lastError };
