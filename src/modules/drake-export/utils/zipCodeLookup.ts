/**
 * ZIP Code Lookup Utility
 * Uses free Zippopotam.us API to get city/state from ZIP code
 */

export interface ZipLookupResult {
  city: string;
  state: string;
  stateAbbreviation: string;
  country: string;
}

// Cache to avoid repeated API calls for same ZIP
const zipCache = new Map<string, ZipLookupResult | null>();

/**
 * Look up city and state from a US ZIP code
 * @param zipCode - 5-digit US ZIP code
 * @returns City and state info, or null if not found
 */
export async function lookupZipCode(zipCode: string): Promise<ZipLookupResult | null> {
  // Clean the ZIP code (remove spaces, take first 5 digits)
  const cleanZip = zipCode.replace(/\D/g, '').slice(0, 5);

  // Must be 5 digits
  if (cleanZip.length !== 5) {
    return null;
  }

  // Check cache first
  if (zipCache.has(cleanZip)) {
    return zipCache.get(cleanZip) || null;
  }

  try {
    const response = await fetch(`https://api.zippopotam.us/us/${cleanZip}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      // ZIP not found
      zipCache.set(cleanZip, null);
      return null;
    }

    const data = await response.json();

    if (!data.places || data.places.length === 0) {
      zipCache.set(cleanZip, null);
      return null;
    }

    const place = data.places[0];
    const result: ZipLookupResult = {
      city: place['place name'] || '',
      state: place['state'] || '',
      stateAbbreviation: place['state abbreviation'] || '',
      country: data['country'] || 'United States'
    };

    // Cache the result
    zipCache.set(cleanZip, result);

    return result;
  } catch (error) {
    console.error('ZIP code lookup error:', error);
    // Don't cache errors - allow retry
    return null;
  }
}

/**
 * Debounced ZIP lookup - useful for input fields
 * Only calls API after user stops typing
 */
export function createDebouncedZipLookup(
  onResult: (result: ZipLookupResult | null, zipCode: string) => void,
  delay: number = 500
) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (zipCode: string) => {
    // Clear previous timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    const cleanZip = zipCode.replace(/\D/g, '').slice(0, 5);

    // Only lookup if we have 5 digits
    if (cleanZip.length !== 5) {
      return;
    }

    // Check cache for immediate response
    if (zipCache.has(cleanZip)) {
      onResult(zipCache.get(cleanZip) || null, cleanZip);
      return;
    }

    // Debounce the API call
    timeoutId = setTimeout(async () => {
      const result = await lookupZipCode(cleanZip);
      onResult(result, cleanZip);
    }, delay);
  };
}

/**
 * Clear the ZIP code cache (useful for testing)
 */
export function clearZipCache() {
  zipCache.clear();
}
