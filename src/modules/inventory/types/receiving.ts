/**
 * Receiving Flow Types
 * Types for inventory receiving and UPC lookup
 */

import { Product } from '../stores/inventoryStore';

export type LookupSource = 'local' | 'cache' | 'api' | 'gemini' | 'manual';

// Supplier/Invoice information for receiving
export interface SupplierInfo {
  id: string;
  name: string;
  taxId?: string;
}

export interface ReceivingInvoice {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string;
  attachmentUrl?: string;
}

export interface UPCLookupResult {
  found: boolean;
  source: LookupSource;
  product?: Product;
  upc: string;
  suggestedData?: Partial<Product>;
  needsReview?: boolean;
  error?: string;
}

export interface UPCApiResponse {
  code: string;
  total: number;
  offset: number;
  items: UPCApiItem[];
}

export interface UPCApiItem {
  ean: string;
  title: string;
  description?: string;
  upc: string;
  gtin?: string;
  elid?: string;
  brand?: string;
  model?: string;
  color?: string;
  size?: string;
  dimension?: string;
  weight?: string;
  category?: string;
  currency?: string;
  lowest_recorded_price?: number;
  highest_recorded_price?: number;
  images?: string[];
  offers?: UPCApiOffer[];
}

export interface UPCApiOffer {
  merchant?: string;
  domain?: string;
  title?: string;
  currency?: string;
  list_price?: string;
  price?: number;
  shipping?: string;
  condition?: string;
  availability?: string;
  link?: string;
  updated_t?: number;
}

export interface ReceivingItem {
  id: string;
  product: Product;
  quantity: number;
  locationId: string;
  locationName: string;
  binCode: string;
  receivedAt: number;
  source: LookupSource;
  isNewProduct: boolean;
  unitCost?: number;
  notes?: string;
}

export interface ReceivingSession {
  id: string;
  startedAt: number;
  endedAt?: number;
  items: ReceivingItem[];
  totalItems: number;
  totalQuantity: number;
  totalValue: number;
  locationId?: string;
  locationName?: string;
  status: 'active' | 'completed' | 'cancelled';
  createdBy?: string;
  // Supplier and invoice information
  supplier?: SupplierInfo;
  invoice?: ReceivingInvoice;
}

export interface NewProductData {
  name: string;
  sku?: string;
  UPC?: string;
  description?: string;
  category?: string;
  unitOfMeasure: string;
  unitCost: number;
  sellingPrice?: number;
  minStockLevel?: number;
  maxStockLevel?: number;
  productImageUrl?: string;
}

export interface GeminiProductIdentification {
  success: boolean;
  product?: {
    name: string;
    brand?: string;
    category?: string;
    description?: string;
    estimatedPrice?: number;
  };
  confidence: number;
  error?: string;
}

// UPC Cache entry
export interface UPCCacheEntry {
  upc: string;
  product: Partial<Product>;
  fetchedAt: number;
  source: 'api' | 'gemini' | 'manual';
  expiresAt: number;
}

// Receiving screen state
export type ReceivingLookupState =
  | 'idle'
  | 'scanning'
  | 'loading'
  | 'found-local'
  | 'found-cache'
  | 'found-api'
  | 'not-found'
  | 'error';

export interface ReceivingScreenState {
  lookupState: ReceivingLookupState;
  currentUpc: string;
  lookupResult: UPCLookupResult | null;
  quantity: number;
  selectedLocationId: string;
  selectedBinCode: string;
  isSubmitting: boolean;
  error: string | null;
}

// Generate receiving IDs
export const generateReceivingItemId = (): string => {
  return `recv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const generateReceivingSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};
