// International shipping types and interfaces

// Pricing mode determines how to calculate the shipment cost
export type PricingMode = 'CUBIC_FEET' | 'WEIGHT_LBS' | 'FIXED_BOX';

export interface ShippingDimensions {
  height: number; // in inches
  width: number;  // in inches
  depth: number;  // in inches
  cubicFeet: number; // calculated from dimensions
}

// Box size options for fixed box pricing (e.g., Mexico)
export interface BoxPricing {
  [boxSize: string]: {
    price: number;
  };
}

// Standard box sizes available
export const STANDARD_BOX_SIZES = ['18X18X18', '20X20X20', '22X22X22', '24X24X24'] as const;
export type StandardBoxSize = typeof STANDARD_BOX_SIZES[number];

export interface InternationalShipmentItem {
  id: string;
  description: string;
  qty: number;
  dimensions: ShippingDimensions;
  // Pricing mode specific fields
  pricingMode: PricingMode;
  pricePerCubicFoot: number;      // Used for CUBIC_FEET mode
  pricePerLb?: number;            // Used for WEIGHT_LBS mode
  weightLbs?: number;             // Weight in pounds (for WEIGHT_LBS mode)
  totalWeightLbs?: number;        // qty × weightLbs
  selectedBoxSize?: StandardBoxSize; // Selected box size (for FIXED_BOX mode)
  boxPrice?: number;              // Price for selected box (for FIXED_BOX mode)
  // Calculated fields
  totalCubicFeet: number;         // qty × cubicFeet
  subtotal: number;               // Calculated based on pricing mode
  tariff: number;
  total: number;                  // subtotal + tariff
  bulkId?: string;
}

export interface InternationalProduct {
  id: string;
  product: {
    id: string;
    code: string;
    label: string;
    price?: number;
  };
  qty: number;
  salePrice: number;
  total: number;
  bulkId?: string;
}

export interface ShipperConsignee {
  name: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  lastName2?: string;
  phoneNumber?: string;
  altPhoneNumber?: string;
  phoneNumberS?: string;
  dob?: string;
  cid?: string;
  idS?: string;
  passport?: string;
  email?: string;
  address?: string;
  addressS?: string;
}

export interface PaymentMethod {
  cash: number;
  zelle: number;
  creditCard: number;
  taxPercent: number;
  taxOnTotal: boolean;
  exemptTaxOnCash?: boolean;
  discount?: number;
}

export interface ShippingBulk {
  id: string;
  name: string;
  type: 'PERSONAL' | 'COMMERCIAL' | 'MIXED';
  totalCubicFeet: number;
  currentCubicFeet: number;
  transportCost?: number;
  status: 'DRAFT' | 'READY';
  token?: string;
}

export type DestinationCountry = 'HONDURAS' | 'GUATEMALA' | 'EL_SALVADOR' | 'NICARAGUA' | 'VENEZUELA' |'MEXICO';

export interface CountryTariff {
  country: DestinationCountry;
  tariffRate: number; // Fixed tariff amount (e.g., 140 for $140)
  label: string;
  flagEmoji: string;
  // Pricing options (only one should be set per country)
  pricePerCubicFoot?: number; // Price per cubic foot (default mode)
  priceLbs?: number;          // Price per pound (weight-based mode)
  box?: BoxPricing;           // Fixed box prices (box-based mode)
}

export interface PricingConfig {
  defaultPricePerCubicFoot: number;
  countryTariffs: CountryTariff[];
}

export interface InternationalShippingForm {
  invoice: string;
  description: string;
  store: string;
  guide?: string;
  destinationCountry: DestinationCountry | '';
  shipper_consignee: ShipperConsignee;
  products: InternationalProduct[];
  shipmentItems: InternationalShipmentItem[];
  bulks: ShippingBulk[];
  createDate?: number;
  paymentMethods: PaymentMethod;
  pricingConfig: PricingConfig;
  insurancePercent: number; // Insurance percentage (e.g., 5 for 5%)
}

// Default pricing configuration
export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  defaultPricePerCubicFoot: 19.00, // $15 per cubic foot
  countryTariffs: [
    {
      country: 'HONDURAS',
      tariffRate: 0,
      label: 'Honduras',
      flagEmoji: '🇭🇳', 
      pricePerCubicFoot: 19 
    },
    {
      country: 'GUATEMALA',
      tariffRate: 140,
      label: 'Guatemala',
      flagEmoji: '🇬🇹',
      pricePerCubicFoot: 19 
    },
    {
      country: 'EL_SALVADOR',
      tariffRate: 180,
      label: 'El Salvador',
      flagEmoji: '🇸🇻',
      pricePerCubicFoot: 19 
    },
    {
      country: 'NICARAGUA',
      tariffRate: 180,
      label: 'Nicaragua',
      flagEmoji: '🇳🇮',
      pricePerCubicFoot: 19 
    },
    {
      country: 'VENEZUELA',
      tariffRate: 0,
      label: 'Venezuela',
      flagEmoji: '',
      priceLbs: 7,
    },
    {
      country: 'MEXICO',
      tariffRate: 0,
      label: 'Mexico',
      flagEmoji: '',
      box: {
         "18X18X18": {
          price: 190
        },
        "20X20X20": {
          price: 230
        },
        "22X22X22": {
          price: 250
        },
        "24X24X24": {
          price: 270
        },
      }
    },
  ]
};

// Helper function to calculate cubic feet from dimensions
export const calculateCubicFeet = (height: number, width: number, depth: number): number => {
  // Dimensions are in inches, convert to cubic feet
  // 1 cubic foot = 12 × 12 × 12 = 1728 cubic inches
  const cubicInches = height * width * depth;
  return cubicInches / 1728;
};

// Helper function to get tariff rate for a country
export const getTariffRate = (country: DestinationCountry, config: PricingConfig = DEFAULT_PRICING_CONFIG): number => {
  const tariff = config.countryTariffs.find(t => t.country === country);
  return tariff ? tariff.tariffRate : 0;
};

// Helper function to calculate tariff amount
export const calculateTariff = (subtotal: number, country: DestinationCountry, config: PricingConfig = DEFAULT_PRICING_CONFIG): number => {
  const rate = getTariffRate(country, config);
  return  rate;
};

// Helper function to get pricing mode for a country
export const getPricingModeForCountry = (country: DestinationCountry, config: PricingConfig = DEFAULT_PRICING_CONFIG): PricingMode => {
  const tariff = config.countryTariffs.find(t => t.country === country);
  if (!tariff) return 'CUBIC_FEET'; // Default to cubic feet

  if (tariff.box) return 'FIXED_BOX';
  if (tariff.priceLbs !== undefined) return 'WEIGHT_LBS';
  return 'CUBIC_FEET';
};

// Helper function to get country tariff configuration
export const getCountryTariff = (country: DestinationCountry, config: PricingConfig = DEFAULT_PRICING_CONFIG): CountryTariff | null => {
  return config.countryTariffs.find(t => t.country === country) || null;
};

// Helper function to calculate item subtotal based on pricing mode
export const calculateItemSubtotal = (item: InternationalShipmentItem, country: DestinationCountry, config: PricingConfig = DEFAULT_PRICING_CONFIG): number => {
  const pricingMode = getPricingModeForCountry(country, config);

  switch (pricingMode) {
    case 'CUBIC_FEET':
      return item.totalCubicFeet * item.pricePerCubicFoot;

    case 'WEIGHT_LBS':
      return (item.totalWeightLbs || 0) * (item.pricePerLb || 0);

    case 'FIXED_BOX':
      return item.qty * (item.boxPrice || 0);

    default:
      return 0;
  }
};

// Helper function to get box pricing options for a country
export const getBoxPricesForCountry = (country: DestinationCountry, config: PricingConfig = DEFAULT_PRICING_CONFIG): BoxPricing | null => {
  const tariff = getCountryTariff(country, config);
  return tariff?.box || null;
};

// Helper function to get default price for a country based on pricing mode
export const getDefaultPriceForCountry = (country: DestinationCountry, config: PricingConfig = DEFAULT_PRICING_CONFIG): number => {
  const tariff = getCountryTariff(country, config);
  if (!tariff) return config.defaultPricePerCubicFoot;

  if (tariff.pricePerCubicFoot !== undefined) return tariff.pricePerCubicFoot;
  if (tariff.priceLbs !== undefined) return tariff.priceLbs;

  // For box pricing, return the price of the first box size
  if (tariff.box) {
    const firstBoxSize = Object.keys(tariff.box)[0];
    return tariff.box[firstBoxSize]?.price || 0;
  }

  return config.defaultPricePerCubicFoot;
};

// Helper function to create default shipment item with correct pricing mode settings
export const createDefaultShipmentItem = (id: string, country: DestinationCountry, config: PricingConfig = DEFAULT_PRICING_CONFIG): InternationalShipmentItem => {
  const pricingMode = getPricingModeForCountry(country, config);
  const tariff = getCountryTariff(country, config);

  const baseItem: InternationalShipmentItem = {
    id,
    description: '',
    qty: 1,
    dimensions: {
      height: 0,
      width: 0,
      depth: 0,
      cubicFeet: 0
    },
    pricingMode,
    pricePerCubicFoot: tariff?.pricePerCubicFoot || config.defaultPricePerCubicFoot,
    totalCubicFeet: 0,
    subtotal: 0,
    tariff: 0,
    total: 0
  };

  // Add mode-specific fields
  switch (pricingMode) {
    case 'WEIGHT_LBS':
      baseItem.pricePerLb = tariff?.priceLbs || 0;
      baseItem.weightLbs = 0;
      baseItem.totalWeightLbs = 0;
      break;

    case 'FIXED_BOX':
      if (tariff?.box) {
        const firstBoxSize = STANDARD_BOX_SIZES[0];
        baseItem.selectedBoxSize = firstBoxSize;
        baseItem.boxPrice = tariff.box[firstBoxSize]?.price || 0;
      }
      break;

    // CUBIC_FEET mode uses default fields (already set)
  }

  return baseItem;
};
