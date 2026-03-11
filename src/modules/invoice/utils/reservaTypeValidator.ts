/**
 * Reserva Type Validator
 * Validates and categorizes reserva types for Food, Cleaning (Aseo), and Medications
 */

export type ReservaCategory = 'FOOD' | 'CLEANING' | 'MEDICATION' | 'OTHER';

export interface ReservaCategoryInfo {
  category: ReservaCategory;
  isExpress: boolean; // Whether it qualifies for express service
  label: string;
}

// Keywords for food items
const FOOD_KEYWORDS = [
  'food',
  'comida',
  'alimento',
  'bebida',
  'drink',
  'snack',
  'grocery',
  'groceries',
  'vegetable',
  'vegetal',
  'fruit',
  'fruta',
  'meat',
  'carne',
  'fish',
  'pescado',
  'dairy',
  'lacteo',
  'bread',
  'pan',
  'cereal',
  'rice',
  'arroz',
  'pasta',
  'cooking',
  'cocina',
  'spice',
  'especia',
  'condiment',
  'condimento'
];

// Keywords for cleaning/aseo items
const CLEANING_KEYWORDS = [
  'clean',
  'cleaning',
  'limpieza',
  'aseo',
  'detergent',
  'detergente',
  'soap',
  'jabon',
  'jabón',
  'shampoo',
  'champú',
  'bleach',
  'lejia',
  'lejía',
  'disinfect',
  'desinfectante',
  'sanitizer',
  'sanitizante',
  'towel',
  'toalla',
  'tissue',
  'papel',
  'sponge',
  'esponja',
  'mop',
  'fregona',
  'brush',
  'cepillo',
  'broom',
  'escoba',
  'garbage',
  'basura',
  'trash',
  'hygiene',
  'higiene',
  'toilet',
  'baño'
];

// Keywords for medications
const MEDICATION_KEYWORDS = [
  'medicine',
  'medication',
  'medicina',
  'medicamento',
  'drug',
  'droga',
  'pharma',
  'farmacia',
  'pharmacy',
  'pill',
  'pastilla',
  'tablet',
  'tableta',
  'capsule',
  'capsula',
  'cápsula',
  'syrup',
  'jarabe',
  'antibiotic',
  'antibiotico',
  'antibiótico',
  'vitamin',
  'vitamina',
  'supplement',
  'suplemento',
  'prescription',
  'receta',
  'ointment',
  'pomada',
  'cream',
  'crema',
  'medical',
  'medico',
  'médico',
  'health',
  'salud',
  'therapeutic',
  'terapeutico',
  'terapéutico',
  'aspirin',
  'aspirina',
  'painkiller',
  'analgesico',
  'analgésico',
  'insulin',
  'insulina'
];

/**
 * Check if a text contains any of the keywords
 */
function containsKeyword(text: string, keywords: string[]): boolean {
  const normalizedText = text.toLowerCase().trim();
  return keywords.some(keyword => normalizedText.includes(keyword));
}

/**
 * Categorize a reserva type based on its name/description
 * @param type - The reserva type string
 * @returns The category classification
 */
export function categorizeReservaType(type: string): ReservaCategory {
  if (!type || typeof type !== 'string') {
    return 'OTHER';
  }

  // Check for medication first (highest priority for express)
  if (containsKeyword(type, MEDICATION_KEYWORDS)) {
    return 'MEDICATION';
  }

  // Check for food
  if (containsKeyword(type, FOOD_KEYWORDS)) {
    return 'FOOD';
  }

  // Check for cleaning/aseo
  if (containsKeyword(type, CLEANING_KEYWORDS)) {
    return 'CLEANING';
  }

  return 'OTHER';
}

/**
 * Check if a reserva type is food-related
 * @param type - The reserva type string
 * @returns True if it's food-related
 */
export function isFood(type: string): boolean {
  return categorizeReservaType(type) === 'FOOD';
}

/**
 * Check if a reserva type is cleaning-related
 * @param type - The reserva type string
 * @returns True if it's cleaning-related
 */
export function isCleaning(type: string): boolean {
  return categorizeReservaType(type) === 'CLEANING';
}

/**
 * Check if a reserva type is medication-related
 * @param type - The reserva type string
 * @returns True if it's medication-related
 */
export function isMedication(type: string): boolean {
  return categorizeReservaType(type) === 'MEDICATION';
}

/**
 * Check if a reserva type qualifies for express service
 * Express service includes: Food, Cleaning, and Medication
 * @param type - The reserva type string
 * @returns True if it qualifies for express service
 */
export function isExpressEligible(type: string): boolean {
  const category = categorizeReservaType(type);
  return category === 'FOOD' || category === 'CLEANING' || category === 'MEDICATION';
}

/**
 * Get detailed category information for a reserva type
 * @param type - The reserva type string
 * @returns Detailed category information
 */
export function getReservaCategoryInfo(type: string): ReservaCategoryInfo {
  const category = categorizeReservaType(type);
  const isExpress = isExpressEligible(type);

  const labels: Record<ReservaCategory, string> = {
    FOOD: '🍎 Food',
    CLEANING: '🧼 Cleaning',
    MEDICATION: '💊 Medication',
    OTHER: '📦 Other'
  };

  return {
    category,
    isExpress,
    label: labels[category]
  };
}

/**
 * Validate multiple reserva types and return their categories
 * @param types - Array of reserva type strings
 * @returns Array of category info objects
 */
export function validateReservaTypes(types: string[]): ReservaCategoryInfo[] {
  return types.map(type => getReservaCategoryInfo(type));
}

/**
 * Get summary of reserva types by category
 * @param types - Array of reserva type strings
 * @returns Object with counts per category
 */
export function getReservaCategorySummary(types: string[]): Record<ReservaCategory, number> {
  const summary: Record<ReservaCategory, number> = {
    FOOD: 0,
    CLEANING: 0,
    MEDICATION: 0,
    OTHER: 0
  };

  types.forEach(type => {
    const category = categorizeReservaType(type);
    summary[category]++;
  });

  return summary;
}

/**
 * Check if all reservas in a list are express-eligible
 * @param types - Array of reserva type strings
 * @returns True if all are express-eligible
 */
export function areAllExpressEligible(types: string[]): boolean {
  if (types.length === 0) return false;
  return types.every(type => isExpressEligible(type));
}

/**
 * Filter reserva types by category
 * @param types - Array of reserva type strings
 * @param category - Category to filter by
 * @returns Filtered array of types
 */
export function filterByCategory(types: string[], category: ReservaCategory): string[] {
  return types.filter(type => categorizeReservaType(type) === category);
}

/**
 * Suggest express service based on reserva types
 * @param types - Array of reserva type strings
 * @returns Object with suggestion info
 */
export function suggestExpressService(types: string[]): {
  shouldSuggest: boolean;
  expressCount: number;
  totalCount: number;
  percentage: number;
  message: string;
} {
  const totalCount = types.length;
  const expressCount = types.filter(type => isExpressEligible(type)).length;
  const percentage = totalCount > 0 ? (expressCount / totalCount) * 100 : 0;
  const shouldSuggest = percentage >= 50; // Suggest if 50% or more are express-eligible

  let message = '';
  if (shouldSuggest) {
    message = `${expressCount} of ${totalCount} items qualify for Express Service (Food, Medication, Cleaning)`;
  }

  return {
    shouldSuggest,
    expressCount,
    totalCount,
    percentage,
    message
  };
}
