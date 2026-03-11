/**
 * UPC Lookup Service
 * Handles barcode/UPC lookups with caching and multiple data sources
 */

import { devLog, fetchGraphQLSS } from '../../../services/utils';
import { authStore } from '../../../stores/authStore';
import { inventoryStore, Product } from '../stores/inventoryStore';
import {
  UPCLookupResult,
  UPCCacheEntry,
  UPCApiResponse,
  LookupSource,
} from '../types/receiving';

// In-memory cache for UPC results
const upcCache = new Map<string, UPCCacheEntry>();

// Cache expiration time (24 hours)
const CACHE_EXPIRATION_MS = 24 * 60 * 60 * 1000;

/**
 * Main UPC lookup function
 * Checks local products first, then cache, then external API
 */
export async function lookupUPC(upc: string): Promise<UPCLookupResult> {
  try {
    // Clean the UPC (remove spaces, etc.)
    const cleanedUPC = upc.trim();

    if (!cleanedUPC) {
      return {
        found: false,
        source: 'local',
        upc: cleanedUPC,
        error: 'UPC cannot be empty',
      };
    }

    // Step 1: Check local products first
    const localProduct = await lookupInLocalProducts(cleanedUPC);

    if (localProduct) {
      return {
        found: true,
        source: 'local',
        product: localProduct,
        upc: cleanedUPC,
      };
    }

    // Step 2: Check cache
    const cachedEntry = lookupInCache(cleanedUPC);
    if (cachedEntry) {
      return {
        found: true,
        source: 'cache',
        upc: cleanedUPC,
        suggestedData: cachedEntry.product,
        needsReview: true,
      };
    }

    // Step 3: Try external API lookup
    const apiResult = await lookupFromAPI(cleanedUPC);
    if (apiResult) {
      // Cache the API result
      cacheUPCResult(cleanedUPC, apiResult, 'api');

      return {
        found: true,
        source: 'api',
        upc: cleanedUPC,
        suggestedData: apiResult,
        needsReview: true,
      };
    }

    // Not found anywhere
    return {
      found: false,
      source: 'api',
      upc: cleanedUPC,
      error: 'UPC not found in any source',
    };
  } catch (error) {
    console.error('Error in UPC lookup:', error);
    return {
      found: false,
      source: 'api',
      upc,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Check for product in local inventory by UPC
 */
export async function lookupInLocalProducts(upc: string): Promise<Partial<Product> | null> {
  const cleanedUPC = upc.trim();
  const products = inventoryStore.products;



  
    let bdyq2 = {
      query: "getProducts",
      queryString: "!* contain :search0 AND !* contain :search1 AND !* contain :search2 AND !* contain :search3 AND !* contain :search4",
      params: {
        businessId: authStore.getBusinessId(),
        ":search0": cleanedUPC
      }
      
    }


    const response = await fetchGraphQLSS(bdyq2)

    devLog(response.data)

    let product =response.data?.[0]
    if (product) {
      return product;
    }

  // Try SKU match as fallback
  const productBySku = products.find(
    (p) => p.sku && p.sku.trim() === cleanedUPC
  );

  if (productBySku) {
    return productBySku;
  }

  return null;
}

/**
 * Check for UPC in cache
 */
export function lookupInCache(upc: string): UPCCacheEntry | null {
  const cleanedUPC = upc.trim();
  const cached = upcCache.get(cleanedUPC);

  if (!cached) {
    return null;
  }

  // Check if cache entry is still valid
  if (Date.now() > cached.expiresAt) {
    upcCache.delete(cleanedUPC);
    return null;
  }

  return cached;
}

/**
 * Cache a UPC lookup result
 */
export function cacheUPCResult(
  upc: string,
  data: Partial<Product>,
  source: 'api' | 'gemini' | 'manual'
): void {
  const cleanedUPC = upc.trim();
  const now = Date.now();

  const cacheEntry: UPCCacheEntry = {
    upc: cleanedUPC,
    product: data,
    fetchedAt: now,
    source,
    expiresAt: now + CACHE_EXPIRATION_MS,
  };

  upcCache.set(cleanedUPC, cacheEntry);
}

/**
 * Clear expired cache entries
 */
export function clearExpiredCache(): number {
  const now = Date.now();
  let clearedCount = 0;

  for (const [upc, entry] of upcCache.entries()) {
    if (now > entry.expiresAt) {
      upcCache.delete(upc);
      clearedCount++;
    }
  }

  return clearedCount;
}

/**
 * Clear all cache entries
 */
export function clearAllCache(): void {
  upcCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  const now = Date.now();
  let validEntries = 0;
  let expiredEntries = 0;

  for (const entry of upcCache.values()) {
    if (now > entry.expiresAt) {
      expiredEntries++;
    } else {
      validEntries++;
    }
  }

  return {
    total: upcCache.size,
    valid: validEntries,
    expired: expiredEntries,
  };
}

/**
 * Lookup UPC from external API
 */
async function lookupFromAPI(upc: string): Promise<Partial<Product> | null> {
  try {
    /*
    const response = await fetch(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(upc)}`
    );

    */

    let bdyq2 = {
      query: "upcLookup",
      form: {
        upc
      }
      
    }
    const response = await fetchGraphQLSS(bdyq2)
   


    if (!response.success) {
     
      throw new Error(`API request failed: ${response.statusText}`);
    }




    // Get the first item from the response
    const item = response.product;

    // Convert API response to Product format
    const productData: Partial<any> = {

      name: item.name || 'Unknown Product',
      UPC: item.upc,
      description: item.description || '',
      category: item.category || 'Uncategorized',
      unitOfMeasure: item.unit,
      productImageUrl: item.images && item.images.length > 0 ? item.images[0] : undefined,
      ...item
    };


// 6001135009474


    // Try to extract price from offers
    if (item.offers && item.offers.length > 0) {
      const firstOffer = item.offers[0];
      if (firstOffer.price) {
        productData.unitCost = firstOffer.price;
        productData.sellingPrice = firstOffer.price * 1.2; // Add 20% markup
      }
    } else if (item.lowest_recorded_price) {
      productData.unitCost = item.lowest_recorded_price;
      productData.sellingPrice = item.lowest_recorded_price * 1.2;
    }

    return productData;
  } catch (error) {
    console.error('Error fetching from UPC API:', error);
    throw error;
  }
}

/**
 * Auto-cleanup: Clear expired cache entries every hour
 */
setInterval(() => {
  const cleared = clearExpiredCache();
  if (cleared > 0) {
    devLog(`Cleared ${cleared} expired UPC cache entries`);
  }
}, 60 * 60 * 1000); // Run every hour
