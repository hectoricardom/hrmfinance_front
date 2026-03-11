/**
 * Shipping Method Service
 * Provides standardized shipping method identification and validation
 * Prevents mismatches by normalizing various naming conventions to numeric IDs
 */

// Standard shipping method IDs
export enum ShippingMethodId {
  AIR = 1,
  MARITIME = 2,
  GROUND = 3,
  EXPRESS = 4,
  UNKNOWN = 0
}

// Standard string representations
export const SHIPPING_METHOD_STANDARD = {
  AIR: 'AEREO',
  MARITIME: 'MARITIMO',
  GROUND: 'TERRESTRE',
  EXPRESS: 'EXPRESS'
} as const;

// Mapping of all possible variations to standard IDs
const SHIPPING_METHOD_VARIATIONS: Record<string, ShippingMethodId> = {
  // Air/Aéreo variations
  'aereo': ShippingMethodId.AIR,
  'aéreo': ShippingMethodId.AIR,
  'air': ShippingMethodId.AIR,
  'aire': ShippingMethodId.AIR,
  'avion': ShippingMethodId.AIR,
  'avión': ShippingMethodId.AIR,
  'airplane': ShippingMethodId.AIR,
  'flight': ShippingMethodId.AIR,
  'vuelo': ShippingMethodId.AIR,
  'aereo_express': ShippingMethodId.AIR,
  'air_express': ShippingMethodId.AIR,

  // Maritime/Sea variations
  'maritimo': ShippingMethodId.MARITIME,
  'marítimo': ShippingMethodId.MARITIME,
  'sea': ShippingMethodId.MARITIME,
  'mar': ShippingMethodId.MARITIME,
  'ocean': ShippingMethodId.MARITIME,
  'oceano': ShippingMethodId.MARITIME,
  'océano': ShippingMethodId.MARITIME,
  'barco': ShippingMethodId.MARITIME,
  'ship': ShippingMethodId.MARITIME,
  'boat': ShippingMethodId.MARITIME,
  'maritime': ShippingMethodId.MARITIME,
  'marino': ShippingMethodId.MARITIME,

  // Ground variations
  'terrestre': ShippingMethodId.GROUND,
  'ground': ShippingMethodId.GROUND,
  'tierra': ShippingMethodId.GROUND,
  'land': ShippingMethodId.GROUND,
  'truck': ShippingMethodId.GROUND,
  'camion': ShippingMethodId.GROUND,
  'camión': ShippingMethodId.GROUND,

  // Express variations
  'express': ShippingMethodId.EXPRESS,
  'expreso': ShippingMethodId.EXPRESS,
  'urgente': ShippingMethodId.EXPRESS,
  'urgent': ShippingMethodId.EXPRESS,
  'rapido': ShippingMethodId.EXPRESS,
  'rápido': ShippingMethodId.EXPRESS,
  'fast': ShippingMethodId.EXPRESS
};

/**
 * Normalize a shipping method string to its standard ID
 * @param method - Any variation of shipping method name
 * @returns Standard shipping method ID
 */
export function normalizeShippingMethod(method: string | number | null | undefined): ShippingMethodId {
  // Handle null/undefined
  if (!method && method !== 0) {
    return ShippingMethodId.UNKNOWN;
  }

  // If already a number, validate it's a valid ID
  if (typeof method === 'number') {
    const validIds = Object.values(ShippingMethodId).filter(v => typeof v === 'number');
    return validIds.includes(method) ? method : ShippingMethodId.UNKNOWN;
  }

  // Normalize string: lowercase, trim, remove special characters
  const normalized = method
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[_\-\s]+/g, '_');

  // Look up in variations map
  const methodId = SHIPPING_METHOD_VARIATIONS[normalized];

  return methodId !== undefined ? methodId : ShippingMethodId.UNKNOWN;
}

/**
 * Get the standard string representation for a shipping method
 * @param methodIdOrString - Shipping method ID or string variation
 * @returns Standard string representation
 */
export function getStandardShippingMethod(methodIdOrString: string | number | null | undefined): string {
  const methodId = normalizeShippingMethod(methodIdOrString);

  switch (methodId) {
    case ShippingMethodId.AIR:
      return SHIPPING_METHOD_STANDARD.AIR;
    case ShippingMethodId.MARITIME:
      return SHIPPING_METHOD_STANDARD.MARITIME;
    case ShippingMethodId.GROUND:
      return SHIPPING_METHOD_STANDARD.GROUND;
    case ShippingMethodId.EXPRESS:
      return SHIPPING_METHOD_STANDARD.EXPRESS;
    default:
      return '';
  }
}

/**
 * Get display name for a shipping method (Spanish)
 * @param methodIdOrString - Shipping method ID or string variation
 * @returns Display name in Spanish
 */
export function getShippingMethodDisplayName(methodIdOrString: string | number | null | undefined): string {
  const methodId = normalizeShippingMethod(methodIdOrString);

  switch (methodId) {
    case ShippingMethodId.AIR:
      return '🛩️ Aéreo';
    case ShippingMethodId.MARITIME:
      return '🚢 Marítimo';
    case ShippingMethodId.GROUND:
      return '🚛 Terrestre';
    case ShippingMethodId.EXPRESS:
      return '⚡ Express';
    default:
      return '❓ Desconocido';
  }
}

/**
 * Get display name for a shipping method (English)
 * @param methodIdOrString - Shipping method ID or string variation
 * @returns Display name in English
 */
export function getShippingMethodDisplayNameEn(methodIdOrString: string | number | null | undefined): string {
  const methodId = normalizeShippingMethod(methodIdOrString);

  switch (methodId) {
    case ShippingMethodId.AIR:
      return '🛩️ Air';
    case ShippingMethodId.MARITIME:
      return '🚢 Maritime';
    case ShippingMethodId.GROUND:
      return '🚛 Ground';
    case ShippingMethodId.EXPRESS:
      return '⚡ Express';
    default:
      return '❓ Unknown';
  }
}

/**
 * Check if two shipping methods match (using normalization)
 * @param method1 - First shipping method (any format)
 * @param method2 - Second shipping method (any format)
 * @returns True if methods match after normalization
 */
export function shippingMethodsMatch(
  method1: string | number | null | undefined,
  method2: string | number | null | undefined
): boolean {
  const id1 = normalizeShippingMethod(method1);
  const id2 = normalizeShippingMethod(method2);

  // Don't consider UNKNOWN as a match
  if (id1 === ShippingMethodId.UNKNOWN || id2 === ShippingMethodId.UNKNOWN) {
    return false;
  }

  return id1 === id2;
}

/**
 * Validate if a shipping method is valid
 * @param method - Shipping method to validate
 * @returns True if valid, false otherwise
 */
export function isValidShippingMethod(method: string | number | null | undefined): boolean {
  const methodId = normalizeShippingMethod(method);
  return methodId !== ShippingMethodId.UNKNOWN;
}

/**
 * Get all valid shipping method options for dropdowns
 * @returns Array of shipping method options
 */
export function getShippingMethodOptions(): Array<{
  id: ShippingMethodId;
  value: string;
  label: string;
  labelEn: string;
}> {
  return [
    {
      id: ShippingMethodId.AIR,
      value: SHIPPING_METHOD_STANDARD.AIR,
      label: getShippingMethodDisplayName(ShippingMethodId.AIR),
      labelEn: getShippingMethodDisplayNameEn(ShippingMethodId.AIR)
    },
    {
      id: ShippingMethodId.MARITIME,
      value: SHIPPING_METHOD_STANDARD.MARITIME,
      label: getShippingMethodDisplayName(ShippingMethodId.MARITIME),
      labelEn: getShippingMethodDisplayNameEn(ShippingMethodId.MARITIME)
    },
    {
      id: ShippingMethodId.GROUND,
      value: SHIPPING_METHOD_STANDARD.GROUND,
      label: getShippingMethodDisplayName(ShippingMethodId.GROUND),
      labelEn: getShippingMethodDisplayNameEn(ShippingMethodId.GROUND)
    },
    {
      id: ShippingMethodId.EXPRESS,
      value: SHIPPING_METHOD_STANDARD.EXPRESS,
      label: getShippingMethodDisplayName(ShippingMethodId.EXPRESS),
      labelEn: getShippingMethodDisplayNameEn(ShippingMethodId.EXPRESS)
    }
  ];
}

/**
 * Convert legacy string formats to new ID format
 * Useful for migration scripts
 * @param method - Legacy string format
 * @returns Numeric ID
 */
export function migrateLegacyShippingMethod(method: string | null | undefined): number {
  return normalizeShippingMethod(method);
}

/**
 * Get icon for shipping method
 * @param methodIdOrString - Shipping method ID or string variation
 * @returns Icon emoji
 */
export function getShippingMethodIcon(methodIdOrString: string | number | null | undefined): string {
  const methodId = normalizeShippingMethod(methodIdOrString);

  switch (methodId) {
    case ShippingMethodId.AIR:
      return '🛩️';
    case ShippingMethodId.MARITIME:
      return '🚢';
    case ShippingMethodId.GROUND:
      return '🚛';
    case ShippingMethodId.EXPRESS:
      return '⚡';
    default:
      return '❓';
  }
}

/**
 * Check if shipping method is air type
 * @param method - Shipping method (any format)
 * @returns True if air shipping
 */
export function isAirShipping(method: string | number | null | undefined): boolean {
  return normalizeShippingMethod(method) === ShippingMethodId.AIR;
}

/**
 * Check if shipping method is maritime/sea type
 * @param method - Shipping method (any format)
 * @returns True if maritime shipping
 */
export function isMaritimeShipping(method: string | number | null | undefined): boolean {
  return normalizeShippingMethod(method) === ShippingMethodId.MARITIME;
}

/**
 * Get suggested variations for a shipping method (for debugging/logging)
 * @param methodId - Shipping method ID
 * @returns Array of recognized variations
 */
export function getShippingMethodVariations(methodId: ShippingMethodId): string[] {
  return Object.entries(SHIPPING_METHOD_VARIATIONS)
    .filter(([_, id]) => id === methodId)
    .map(([variation]) => variation);
}

// Export type for convenience
export type ShippingMethodOption = ReturnType<typeof getShippingMethodOptions>[number];
