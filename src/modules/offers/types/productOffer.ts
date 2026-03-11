/**
 * Product Offers Comparison Types
 * Used to compare prices and offers from different suppliers
 */

export interface ProductOffer {
  id: string;
  productName: string;
  productCode?: string;
  sku?: string;
  barcode?: string;
  description?: string;
  unit: string; // e.g., 'kg', 'lb', 'unit', 'box', 'case'
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  currency: string;
  category?: string;
  brand?: string;
  // Normalized fields for comparison
  normalizedName?: string;
  normalizedPrice?: number; // Price per standard unit for comparison
}

export interface SupplierOffer {
  id: string;
  supplierName: string;
  supplierCode?: string;
  sourceFile: string;
  sourceType: 'pdf' | 'csv' | 'manual';
  uploadDate: number; // timestamp
  validUntil?: number; // timestamp
  products: ProductOffer[];
  notes?: string;
  currency: string;
  // Metadata
  totalProducts: number;
  totalValue: number;
}

export interface ProductSimilarity {
  score: number; // 0-100
  matchType: 'exact' | 'upc_match' | 'high' | 'medium' | 'low' | 'none';
  upcMatch: boolean;
  upcMismatch: boolean; // Both have UPCs but they don't match - score penalized
  nameScore: number;
  details: string;
}

export interface ProductComparison {
  productName: string;
  normalizedName: string;
  productCode?: string;
  category?: string;
  // Similarity matching info
  matchQuality: 'exact' | 'high' | 'medium' | 'low';
  averageSimilarity: number; // 0-100
  offers: {
    supplierId: string;
    supplierName: string;
    productOffer: ProductOffer;
    isBestPrice: boolean;
    priceDifference?: number; // difference from best price
    priceDifferencePercent?: number;
    similarity: ProductSimilarity; // Similarity to reference product
  }[];
  bestOffer?: {
    supplierId: string;
    supplierName: string;
    price: number;
  };
  averagePrice: number;
  priceRange: {
    min: number;
    max: number;
  };
}

export interface OffersComparisonResult {
  id: string;
  name: string;
  createdAt: number;
  supplierOffers: SupplierOffer[];
  comparisons: ProductComparison[];
  summary: {
    totalProducts: number;
    totalSuppliers: number;
    productsWithMultipleOffers: number;
    potentialSavings: number;
  };
}

// Parser configuration
export interface CSVParserConfig {
  delimiter: ',' | ';' | '\t';
  hasHeader: boolean;
  columnMapping: {
    productName: number;
    productCode?: number;
    sku?: number;
    description?: number;
    unit?: number;
    quantity?: number;
    unitPrice: number;
    totalPrice?: number;
    category?: number;
    brand?: number;
  };
  skipRows?: number;
  currencyColumn?: number;
  defaultCurrency?: string;
  defaultUnit?: string;
}

export interface PDFParserConfig {
  parserType: 'table' | 'text' | 'auto';
  // Column positions for table parsing (as percentages of page width)
  columnPositions?: {
    productName: { start: number; end: number };
    productCode?: { start: number; end: number };
    quantity?: { start: number; end: number };
    unitPrice: { start: number; end: number };
    totalPrice?: { start: number; end: number };
  };
  // Text patterns for text parsing
  patterns?: {
    productLine?: RegExp;
    pricePattern?: RegExp;
    quantityPattern?: RegExp;
  };
  skipPages?: number[];
  defaultCurrency?: string;
  defaultUnit?: string;
}

// Normalization helpers
export const normalizeProductName = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .replace(/\b(kg|lb|lbs|oz|g|ml|l|unit|units|box|boxes|case|cases)\b/gi, '')
    .trim();
};

export const normalizeUnit = (unit: string): string => {
  const unitMap: Record<string, string> = {
    'kilogram': 'kg',
    'kilograms': 'kg',
    'kilo': 'kg',
    'kilos': 'kg',
    'pound': 'lb',
    'pounds': 'lb',
    'lbs': 'lb',
    'ounce': 'oz',
    'ounces': 'oz',
    'gram': 'g',
    'grams': 'g',
    'liter': 'l',
    'liters': 'l',
    'litre': 'l',
    'litres': 'l',
    'milliliter': 'ml',
    'milliliters': 'ml',
    'unit': 'ea',
    'units': 'ea',
    'each': 'ea',
    'piece': 'ea',
    'pieces': 'ea',
    'pcs': 'ea',
    'box': 'box',
    'boxes': 'box',
    'case': 'case',
    'cases': 'case',
    'pack': 'pack',
    'packs': 'pack',
    'package': 'pack',
    'packages': 'pack',
  };

  const normalized = unit.toLowerCase().trim();
  return unitMap[normalized] || normalized;
};

export const generateProductId = (): string => {
  return `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const generateOfferId = (): string => {
  return `offer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const generateComparisonId = (): string => {
  return `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Default parser configurations
export const defaultCSVConfig: CSVParserConfig = {
  delimiter: ',',
  hasHeader: true,
  columnMapping: {
    productName: 0,
    productCode: 1,
    quantity: 2,
    unitPrice: 3,
    totalPrice: 4,
  },
  defaultCurrency: 'USD',
  defaultUnit: 'ea',
};

export const defaultPDFConfig: PDFParserConfig = {
  parserType: 'auto',
  defaultCurrency: 'USD',
  defaultUnit: 'ea',
};
