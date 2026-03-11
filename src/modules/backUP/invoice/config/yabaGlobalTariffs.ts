/**
 * YABA GLOBAL EXPRESS Tariff Configuration
 * Complete pricing structure for shipping to Cuba
 */

// ============================================
// TYPES
// ============================================

export interface TariffItem {
  id: string;
  name: string;
  nameEs: string;
  price: number | null; // null means custom/variable pricing
  note?: string;
}

export interface TariffCategory {
  id: string;
  name: string;
  nameEs: string;
  icon: string;
  items: TariffItem[];
}

export interface AirShippingTier {
  minLbs: number;
  maxLbs: number;
  rangeLabel: string;
  pricePerLb: number;
}

export interface MaritimeShippingRate {
  miscellaneous: number; // miscelania
  durable: number; // duradero
  freePromoLbs?: number; // free lbs after threshold
  promoThreshold?: number; // threshold for free lbs promo
}

export interface ShippingPromotion {
  threshold: number;
  freeLbs: number;
  description: string;
}

export interface YabaLocation {
  address: string;
  city: string;
  zip: string;
  phone: string;
}

export interface YabaGlobalConfig {
  company: string;
  currency: string;
  coverage: string;
  locations: YabaLocation[];
  itemTariffs: TariffCategory[];
  airShipping: {
    tiers: AirShippingTier[];
    promotion: ShippingPromotion;
  };
  maritimeShipping: {
    weekly: MaritimeShippingRate;
    monthly: MaritimeShippingRate;
    unit: string;
  };
}

// ============================================
// TARIFF DATA
// ============================================

export const YABA_ITEM_TARIFFS: TariffCategory[] = [
  {
    id: 'kitchen_appliances',
    name: 'Kitchen Appliances',
    nameEs: 'Electrodomésticos de Cocina',
    icon: '🍳',
    items: [
      { id: 'batidora', name: 'Blender/Mixer', nameEs: 'Batidora', price: 3 },
      { id: 'hornilla', name: 'Hot Plate/Burner', nameEs: 'Hornilla', price: 3 },
      { id: 'ventilador', name: 'Fan', nameEs: 'Ventilador', price: 3 },
      { id: 'olla_arrocera', name: 'Rice Cooker', nameEs: 'Olla Arrocera', price: 4 },
      { id: 'olla_presion', name: 'Pressure Cooker', nameEs: 'Olla de Presión', price: 4 },
      { id: 'freidora', name: 'Air Fryer', nameEs: 'Freidora', price: 4 },
      { id: 'cofitera', name: 'Coffee Maker', nameEs: 'Cafetera', price: 3 },
    ]
  },
  {
    id: 'lighting',
    name: 'Lighting',
    nameEs: 'Iluminación',
    icon: '💡',
    items: [
      { id: 'linterna', name: 'Flashlight (all types)', nameEs: 'Linterna (todo tipo)', price: 2.50 },
    ]
  },
  {
    id: 'home',
    name: 'Home & Furniture',
    nameEs: 'Hogar',
    icon: '🏠',
    items: [
      { id: 'utiles_hogar', name: 'Household Items', nameEs: 'Útiles del Hogar', price: 5 },
      { id: 'colchones', name: 'Mattress', nameEs: 'Colchones', price: 20 },
      { id: 'camas', name: 'Bed Frame', nameEs: 'Camas', price: 20 },
      { id: 'gavetero', name: 'Dresser', nameEs: 'Gavetero', price: 20 },
      { id: 'juego_muebles', name: 'Furniture Set (Living/Dining/Patio)', nameEs: 'Juego de Muebles (Sala/Comedor/Patio)', price: 150 },
      { id: 'sillon_electrico', name: 'Electric Recliner', nameEs: 'Sillón Eléctrico', price: 30 },
      { id: 'sillon_normal', name: 'Regular Armchair', nameEs: 'Sillón Normal', price: 0, note: 'Free' },
      { id: 'silla_enfermo', name: 'Medical Chair', nameEs: 'Silla de Enfermo', price: null, note: 'Contact for quote' },
      { id: 'waterpump', name: 'Water Pump', nameEs: 'Turbina Agua', price: 15 },
      { id: 'microWS', name: 'Microwave Small', nameEs: 'Microwave pequeno', price: 4 },
      { id: 'microWB', name: 'Microwave Big', nameEs: 'Microwave grande', price: 7 },
    
    ]
  },
  {
    id: 'electronics',
    name: 'Electronics',
    nameEs: 'Electrónica',
    icon: '📱',
    items: [
      { id: 'telefono', name: 'Phone', nameEs: 'Teléfono', price: 10 },
      { id: 'laptop', name: 'Laptop', nameEs: 'Laptop', price: 20, note: '+ weight charge' },
      { id: 'computadora', name: 'Desktop Computer', nameEs: 'Computadora', price: 80 },
      { id: 'tv_hasta_55', name: 'TV up to 55"', nameEs: 'Televisor hasta 55"', price: 60 },
      { id: 'tv_mas_55', name: 'TV over 55"', nameEs: 'Televisor más de 55"', price: 80 },
      { id: 'playstation', name: 'PlayStation', nameEs: 'PlayStation', price: 150 },
      { id: 'speaker', name: 'Speaker', nameEs: 'Bocina', price: 20 },
    ]
  },
  {
    id: 'refrigeration',
    name: 'Refrigeration',
    nameEs: 'Refrigeración',
    icon: '❄️',
    items: [
      { id: 'nevera', name: 'Freezer', nameEs: 'Nevera', price: 40 },
      { id: 'refrigerador', name: 'Refrigerator', nameEs: 'Refrigerador', price: 40 },
      { id: 'aire_acondicionado', name: 'Air Conditioner', nameEs: 'Aire Acondicionado', price: 20 },
    ]
  },
  {
    id: 'security',
    name: 'Security',
    nameEs: 'Seguridad',
    icon: '📹',
    items: [
      { id: 'sistema_camaras', name: 'Camera System', nameEs: 'Sistema de Cámaras', price: 150 },
      { id: 'camara_individual', name: 'Individual Camera', nameEs: 'Cámara Individual', price: 20 },
    ]
  },
  {
    id: 'tools',
    name: 'Tools',
    nameEs: 'Herramientas',
    icon: '🔧',
    items: [
      { id: 'herramientas_variadas', name: 'Assorted Tools', nameEs: 'Herramientas Variadas', price: 10 },
      { id: 'herramientas_motor', name: 'Power Tools', nameEs: 'Herramientas con Motor', price: 15 },
    ]
  },
  {
    id: 'transport_recreation',
    name: 'Transport & Recreation',
    nameEs: 'Transporte y Recreación',
    icon: '🚲',
    items: [
      { id: 'scooter', name: 'Scooter (large or small)', nameEs: 'Scooter (grande o chica)', price: 40 },
      { id: 'equipos_gym', name: 'Gym Equipment', nameEs: 'Equipos de Gym', price: 60 },
      { id: 'bicicleta_normal', name: 'Regular Bicycle', nameEs: 'Bicicleta Normal', price: 30 },
      { id: 'bicicleta_electrica', name: 'Electric Bicycle', nameEs: 'Bicicleta Eléctrica', price: 60 },
      { id: 'juguetes_bateria_10kg', name: 'Battery Toys (up to 10kg)', nameEs: 'Juguetes con Batería (hasta 10kg)', price: 15 },
      { id: 'juguetes_bateria_mas_10kg', name: 'Battery Toys (over 10kg)', nameEs: 'Juguetes con Batería (más de 10kg)', price: 20 },
      { id: 'tires', name: 'Tires', nameEs: 'Gomas de Auto', price: 40 },
    ]
  },
  {
    id: 'parts_by_weight',
    name: 'Parts by Weight',
    nameEs: 'Piezas por Peso',
    icon: '⚖️',
    items: [
      { id: 'piezas_hasta_10kg', name: 'Parts up to 10kg (22lbs)', nameEs: 'Piezas hasta 10kg', price: 40 },
      { id: 'piezas_10_20kg', name: 'Parts 10-20kg (22-44lbs)', nameEs: 'Piezas de 10kg a 20kg', price: 60 },
      { id: 'piezas_mas_20kg', name: 'Parts over 20kg (44lbs+)', nameEs: 'Piezas más de 20kg', price: 80 },
    ]
  },
  {
    id: 'essentials',
    name: 'Essentials (Free)',
    nameEs: 'Esenciales (Gratis)',
    icon: '🆓',
    items: [
      { id: 'comida', name: 'Food', nameEs: 'Comida', price: 0, note: 'Gratis' },
      { id: 'medicina', name: 'Medicine', nameEs: 'Medicina', price: 0, note: 'Gratis' },
      { id: 'aseo', name: 'Toiletries/Hygiene', nameEs: 'Aseo', price: 0, note: 'Gratis' },
      { id: 'ropa', name: 'Clothing', nameEs: 'Ropa', price: 0, note: 'Gratis' },
      { id: 'zapatos', name: 'Shoes', nameEs: 'Zapatos', price: 0, note: 'Gratis' },
    ]
  },
  {
    id: 'other',
    name: 'Other',
    nameEs: 'Otros',
    icon: '📦',
    items: [
      { id: 'articulos_medicos', name: 'Medical Equipment', nameEs: 'Artículos de Uso Médico', price: 0, note: 'Gratis' },
      { id: 'sistema_pesca', name: 'Fishing Gear', nameEs: 'Sistema de Pesca', price: 40 },
      { id: 'extraTariff', name: 'Extra Tariff', nameEs: 'Tarifa Extra', price: 3 },
    ]
  },
];

export const YABA_AIR_SHIPPING: YabaGlobalConfig['airShipping'] = {
  tiers: [
    { minLbs: 11, maxLbs: 50.99, rangeLabel: '11-50 lbs', pricePerLb: 3.50 },
    { minLbs: 51, maxLbs: 70.99, rangeLabel: '51-70 lbs', pricePerLb: 2.99 },
    { minLbs: 71, maxLbs: 86.99, rangeLabel: '71-86 lbs', pricePerLb: 2.49 },
    { minLbs: 87, maxLbs: Infinity, rangeLabel: '86+ lbs', pricePerLb: 2.49 }, // Same rate, but with promo
  ],
  promotion: {
    threshold: 86,
    freeLbs: 10,
    description: '+86 lbs gets 10 lbs FREE'
  }
};

export const YABA_MARITIME_SHIPPING: YabaGlobalConfig['maritimeShipping'] = {
  weekly: {
    miscellaneous: 1.70,
    durable: 2.00,
    freePromoLbs: 10,
    promoThreshold: 50,
  },
  monthly: {
    miscellaneous: 1.35,
    durable: 1.70,
  },
  unit: 'USD per lb'
};

export const YABA_LOCATIONS: YabaLocation[] = [
  {
    address: '4105 E 4 Ave',
    city: 'Hialeah',
    zip: '33013',
    phone: '786-587-0068'
  },
  {
    address: '6895 W 4 Ave',
    city: 'Hialeah',
    zip: '33014',
    phone: '786-487-4037'
  }
];

export const YABA_GLOBAL_CONFIG: YabaGlobalConfig = {
  company: 'YABA GLOBAL EXPRESS',
  currency: 'USD',
  coverage: 'Envíos a toda Cuba hasta la puerta de tu casa, incluyendo la Isla de la Juventud',
  locations: YABA_LOCATIONS,
  itemTariffs: YABA_ITEM_TARIFFS,
  airShipping: YABA_AIR_SHIPPING,
  maritimeShipping: YABA_MARITIME_SHIPPING,
};

// ============================================
// PRICING CALCULATION FUNCTIONS
// ============================================

/**
 * Calculate air shipping cost with promotions
 */
export function calculateAirShippingCost(weightLbs: number): {
  subtotal: number;
  freeLbs: number;
  billableWeight: number;
  pricePerLb: number;
  total: number;
  tierUsed: string;
  promotionApplied: boolean;
} {
  // Apply promotion if applicable
  const promo = YABA_AIR_SHIPPING.promotion;
  const promotionApplied = weightLbs > promo.threshold;
  const freeLbs = promotionApplied ? promo.freeLbs : 0;
  const billableWeight = Math.max(0, weightLbs - freeLbs);

  // Find applicable tier based on original weight
  const tier = YABA_AIR_SHIPPING.tiers.find(
    t => weightLbs >= t.minLbs && weightLbs <= t.maxLbs
  ) || YABA_AIR_SHIPPING.tiers[YABA_AIR_SHIPPING.tiers.length - 1];

  const subtotal = weightLbs * tier.pricePerLb;
  const total = billableWeight * tier.pricePerLb;

  return {
    subtotal,
    freeLbs,
    billableWeight,
    pricePerLb: tier.pricePerLb,
    total,
    tierUsed: tier.rangeLabel,
    promotionApplied
  };
}

/**
 * Calculate maritime shipping cost
 */
export function calculateMaritimeShippingCost(
  weightLbs: number,
  itemType: 'miscellaneous' | 'durable',
  departure: 'weekly' | 'monthly'
): {
  subtotal: number;
  freeLbs: number;
  billableWeight: number;
  pricePerLb: number;
  total: number;
  promotionApplied: boolean;
} {
  const rates = departure === 'weekly'
    ? YABA_MARITIME_SHIPPING.weekly
    : YABA_MARITIME_SHIPPING.monthly;

  const pricePerLb = itemType === 'durable' ? rates.durable : rates.miscellaneous;

  // Apply weekly promotion if applicable
  let freeLbs = 0;
  let promotionApplied = false;
  if (departure === 'weekly' && rates.promoThreshold && rates.freePromoLbs) {
    if (weightLbs > rates.promoThreshold) {
      freeLbs = rates.freePromoLbs;
      promotionApplied = true;
    }
  }

  const billableWeight = Math.max(0, weightLbs - freeLbs);
  const subtotal = weightLbs * pricePerLb;
  const total = billableWeight * pricePerLb;

  return {
    subtotal,
    freeLbs,
    billableWeight,
    pricePerLb,
    total,
    promotionApplied
  };
}

/**
 * Get item tariff price by ID
 */
export function getItemTariffPrice(itemId: string): TariffItem | null {
  for (const category of YABA_ITEM_TARIFFS) {
    const item = category.items.find(i => i.id === itemId);
    if (item) return item;
  }
  return null;
}

/**
 * Search items by name (for autocomplete)
 */
export function searchTariffItems(query: string, lang: 'en' | 'es' = 'es'): Array<TariffItem & { categoryId: string; categoryName: string }> {
  const results: Array<TariffItem & { categoryId: string; categoryName: string }> = [];
  const lowerQuery = query.toLowerCase();

  for (const category of YABA_ITEM_TARIFFS) {
    for (const item of category.items) {
      const nameToSearch = lang === 'es' ? item.nameEs : item.name;
      if (nameToSearch.toLowerCase().includes(lowerQuery)) {
        results.push({
          ...item,
          categoryId: category.id,
          categoryName: lang === 'es' ? category.nameEs : category.name
        });
      }
    }
  }

  return results;
}

/**
 * Get all items as flat array
 */
export function getAllTariffItems(): Array<TariffItem & { categoryId: string; categoryIcon: string }> {
  const items: Array<TariffItem & { categoryId: string; categoryIcon: string }> = [];

  for (const category of YABA_ITEM_TARIFFS) {
    for (const item of category.items) {
      items.push({
        ...item,
        categoryId: category.id,
        categoryIcon: category.icon
      });
    }
  }

  return items;
}

/**
 * Format price for display
 */
export function formatTariffPrice(price: number | null, note?: string): string {
  if (price === null) return note || 'Quote required';
  if (price === 0) return note || 'FREE';
  return `$${price.toFixed(2)}${note ? ` (${note})` : ''}`;
}
