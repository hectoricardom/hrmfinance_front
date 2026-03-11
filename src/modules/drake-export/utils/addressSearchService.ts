/**
 * Address Autocomplete Service
 *
 * Primary: Photon (by Komoot) — free, no signup, built for autocomplete
 *   https://photon.komoot.io — uses OpenStreetMap data with better ranking
 * Fallback: Nominatim/OpenStreetMap (free, no key required)
 *
 * Optional upgrade: Set VITE_GEOAPIFY_KEY for Geoapify (3K free requests/day)
 *   Get a free key at: https://myprojects.geoapify.com/register
 */

export interface AddressResult {
  street: string;
  city: string;
  state: string;
  zip: string;
  display: string;
}

// State abbreviation maps
const STATE_ABBR_MAP: Record<string, string> = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
  'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA',
  'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
  'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS', 'missouri': 'MO',
  'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH',
  'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT',
  'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY',
  'district of columbia': 'DC'
};

const STATE_NAME_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_ABBR_MAP).map(([name, abbr]) => [abbr, name.replace(/\b\w/g, c => c.toUpperCase())])
);

function getStateAbbreviation(stateName: string): string {
  return STATE_ABBR_MAP[stateName.toLowerCase()] || '';
}

function getFullStateName(abbr: string): string {
  return STATE_NAME_MAP[abbr.toUpperCase()] || '';
}

// US state center coordinates for location bias (approximate)
const STATE_COORDS: Record<string, { lat: number; lon: number }> = {
  'AL': { lat: 32.8, lon: -86.8 }, 'AK': { lat: 64.2, lon: -152.5 }, 'AZ': { lat: 34.0, lon: -111.1 },
  'AR': { lat: 35.2, lon: -91.8 }, 'CA': { lat: 36.8, lon: -119.4 }, 'CO': { lat: 39.1, lon: -105.4 },
  'CT': { lat: 41.6, lon: -72.7 }, 'DE': { lat: 39.0, lon: -75.5 }, 'FL': { lat: 27.7, lon: -81.5 },
  'GA': { lat: 32.2, lon: -83.4 }, 'HI': { lat: 19.9, lon: -155.6 }, 'ID': { lat: 44.1, lon: -114.7 },
  'IL': { lat: 40.3, lon: -89.0 }, 'IN': { lat: 40.3, lon: -86.1 }, 'IA': { lat: 42.0, lon: -93.2 },
  'KS': { lat: 38.5, lon: -98.8 }, 'KY': { lat: 37.8, lon: -84.3 }, 'LA': { lat: 30.5, lon: -92.1 },
  'ME': { lat: 45.3, lon: -69.4 }, 'MD': { lat: 39.0, lon: -76.6 }, 'MA': { lat: 42.4, lon: -71.4 },
  'MI': { lat: 44.3, lon: -85.6 }, 'MN': { lat: 46.7, lon: -94.7 }, 'MS': { lat: 32.7, lon: -89.7 },
  'MO': { lat: 38.5, lon: -92.3 }, 'MT': { lat: 46.8, lon: -110.4 }, 'NE': { lat: 41.1, lon: -98.3 },
  'NV': { lat: 38.8, lon: -116.4 }, 'NH': { lat: 43.5, lon: -71.5 }, 'NJ': { lat: 40.1, lon: -74.7 },
  'NM': { lat: 34.8, lon: -106.2 }, 'NY': { lat: 43.0, lon: -75.0 }, 'NC': { lat: 35.6, lon: -79.8 },
  'ND': { lat: 47.5, lon: -100.5 }, 'OH': { lat: 40.4, lon: -82.8 }, 'OK': { lat: 35.0, lon: -97.1 },
  'OR': { lat: 43.8, lon: -120.6 }, 'PA': { lat: 41.2, lon: -77.2 }, 'RI': { lat: 41.7, lon: -71.5 },
  'SC': { lat: 33.8, lon: -81.2 }, 'SD': { lat: 43.9, lon: -99.4 }, 'TN': { lat: 35.5, lon: -86.6 },
  'TX': { lat: 31.1, lon: -97.6 }, 'UT': { lat: 39.3, lon: -111.1 }, 'VT': { lat: 44.6, lon: -72.6 },
  'VA': { lat: 37.8, lon: -78.2 }, 'WA': { lat: 47.4, lon: -120.7 }, 'WV': { lat: 38.5, lon: -80.5 },
  'WI': { lat: 44.3, lon: -89.6 }, 'WY': { lat: 43.1, lon: -107.6 }, 'DC': { lat: 38.9, lon: -77.0 },
};

// Result cache to reduce API calls
const searchCache = new Map<string, { results: AddressResult[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(query: string, city?: string, state?: string, zip?: string): string {
  return `${query}|${city || ''}|${state || ''}|${zip || ''}`.toLowerCase();
}

function getCachedResults(key: string): AddressResult[] | null {
  const cached = searchCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.results;
  }
  if (cached) searchCache.delete(key);
  return null;
}

function setCachedResults(key: string, results: AddressResult[]) {
  if (searchCache.size > 100) {
    const oldestKey = searchCache.keys().next().value;
    if (oldestKey) searchCache.delete(oldestKey);
  }
  searchCache.set(key, { results, timestamp: Date.now() });
}

// ─── Photon (Komoot) — Primary, free, no key needed ────────────────────────

async function searchWithPhoton(
  query: string,
  context?: { city?: string; state?: string; zip?: string }
): Promise<AddressResult[]> {
  const params = new URLSearchParams({
    q: query,
    limit: '8',
    lang: 'en',
    layer: 'house,street',
  });

  // Location bias — dramatically improves results for US addresses
  // Use state center coords if we have a state, otherwise default to US center
  let biasLat = 39.8; // US center
  let biasLon = -98.6;

  if (context?.state) {
    const coords = STATE_COORDS[context.state.toUpperCase()];
    if (coords) {
      biasLat = coords.lat;
      biasLon = coords.lon;
    }
  }

  params.set('lat', biasLat.toString());
  params.set('lon', biasLon.toString());

  // Add country filter via bbox (continental US bounding box)
  params.set('bbox', '-125.0,24.0,-66.0,50.0');

  const response = await fetch(
    `https://photon.komoot.io/api/?${params.toString()}`,
    { headers: { 'Accept': 'application/json' } }
  );

  if (!response.ok) return [];

  const data = await response.json();

  if (!data.features || !Array.isArray(data.features)) return [];

  return data.features
    .filter((f: any) => {
      const p = f.properties;
      if (!p) return false;
      // Must be in US
      if (p.country !== 'United States') return false;
      // Must have a street
      return p.housenumber || p.street;
    })
    .map((f: any) => {
      const p = f.properties;
      const houseNumber = p.housenumber || '';
      const street = p.street || '';
      const city = p.city || p.town || p.village || p.district || '';
      const state = p.state || '';
      const zip = p.postcode || '';

      const stateAbbr = getStateAbbreviation(state) || state.slice(0, 2).toUpperCase();

      return {
        street: `${houseNumber} ${street}`.trim(),
        city,
        state: stateAbbr,
        zip,
        display: [
          `${houseNumber} ${street}`.trim(),
          city,
          stateAbbr,
          zip
        ].filter(Boolean).join(', ')
      };
    })
    .filter((r: AddressResult) => r.street && r.city);
}

// ─── Geoapify — Optional upgrade (3K free/day, needs key) ──────────────────

const GEOAPIFY_KEY = import.meta.env.VITE_GEOAPIFY_KEY || '';

async function searchWithGeoapify(
  query: string,
  context?: { city?: string; state?: string; zip?: string }
): Promise<AddressResult[]> {
  if (!GEOAPIFY_KEY) return [];

  const params = new URLSearchParams({
    text: query,
    apiKey: GEOAPIFY_KEY,
    type: 'street',
    limit: '8',
    filter: 'countrycode:us',
    format: 'json',
  });

  // Bias toward state if available
  if (context?.state) {
    const coords = STATE_COORDS[context.state.toUpperCase()];
    if (coords) {
      params.set('bias', `proximity:${coords.lon},${coords.lat}`);
    }
  }

  const response = await fetch(
    `https://api.geoapify.com/v1/geocode/autocomplete?${params.toString()}`,
    { headers: { 'Accept': 'application/json' } }
  );

  if (!response.ok) return [];

  const data = await response.json();

  if (!data.results || !Array.isArray(data.results)) return [];

  return data.results
    .filter((r: any) => r.street && r.city)
    .map((r: any) => ({
      street: r.housenumber ? `${r.housenumber} ${r.street}` : r.street,
      city: r.city || '',
      state: r.state_code || getStateAbbreviation(r.state || '') || '',
      zip: r.postcode || '',
      display: r.formatted || ''
    }));
}

// ─── Nominatim — Last resort fallback ───────────────────────────────────────

async function searchWithNominatim(
  query: string,
  context?: { city?: string; state?: string; zip?: string }
): Promise<AddressResult[]> {
  const params = new URLSearchParams();

  let searchQuery = query;
  if (context?.city) searchQuery += `, ${context.city}`;
  if (context?.state) {
    const fullName = getFullStateName(context.state);
    searchQuery += `, ${fullName || context.state}`;
  } else if (context?.zip) {
    searchQuery += `, ${context.zip}`;
  }

  params.set('q', searchQuery);
  params.set('countrycodes', 'us');
  params.set('format', 'json');
  params.set('addressdetails', '1');
  params.set('limit', '8');

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?${params.toString()}`,
    {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'HRMFinance/1.0'
      }
    }
  );

  if (!response.ok) return [];

  const data = await response.json();

  return data
    .filter((item: any) => {
      if (!item.address) return false;
      return item.address.house_number || item.address.road;
    })
    .map((item: any) => {
      const addr = item.address;
      const houseNumber = addr.house_number || '';
      const road = addr.road || addr.pedestrian || addr.street || '';
      const city = addr.city || addr.town || addr.village || addr.municipality || '';
      const state = addr.state || '';
      const zip = addr.postcode || '';

      const stateAbbr = getStateAbbreviation(state) || state.slice(0, 2).toUpperCase();

      return {
        street: `${houseNumber} ${road}`.trim(),
        city,
        state: stateAbbr,
        zip,
        display: item.display_name
      };
    })
    .filter((r: AddressResult) => r.street && r.city);
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function searchAddress(
  query: string,
  context?: { city?: string; state?: string; zip?: string }
): Promise<AddressResult[]> {
  if (query.length < 3) return [];

  const cacheKey = getCacheKey(query, context?.city, context?.state, context?.zip);
  const cached = getCachedResults(cacheKey);
  if (cached) return cached;

  let results: AddressResult[] = [];

  // 1. Try Geoapify if key is configured (best quality)
  if (GEOAPIFY_KEY) {
    try {
      results = await searchWithGeoapify(query, context);
    } catch {
      // Failed, try next
    }
  }

  // 2. Try Photon (free, no key, good quality autocomplete)
  if (results.length === 0) {
    try {
      results = await searchWithPhoton(query, context);
    } catch {
      // Failed, try fallback
    }
  }

  // 3. Last resort: Nominatim
  if (results.length === 0) {
    try {
      results = await searchWithNominatim(query, context);
    } catch {
      // All failed
    }
  }

  setCachedResults(cacheKey, results);
  return results;
}

export function getActiveProvider(): string {
  if (GEOAPIFY_KEY) return 'Geoapify';
  return 'Photon/OSM';
}

export { getStateAbbreviation, getFullStateName };
