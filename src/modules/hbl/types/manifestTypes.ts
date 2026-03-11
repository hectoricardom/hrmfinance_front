/**
 * Delivery Manifest Types
 *
 * Organizes HBL records for efficient delivery routing
 * Grouped by: Address → Customer ID → Bag Number
 */

import { HBL } from './index';

/**
 * Single HBL item within a bag
 */
export interface ManifestItem {
  hbl: string;
  namegood: string;
  quantity: string;
  weight: string;
  idguidestate: string;
}

/**
 * HBL group within a bag (multiple items with same HBL)
 */
export interface ManifestHBLGroup {
  hbl: string;
  items: ManifestItem[];
  itemCount: number;
  totalWeight: number;
  totalQuantity: number;
}

/**
 * Bag containing multiple HBLs
 */
export interface ManifestBag {
  bagNumber: string;
  hblGroups: ManifestHBLGroup[];  // Changed from items to hblGroups
  totalHBLs: number;               // Number of unique HBLs
  totalWeight: number;
  totalQuantity: number;
  itemCount: number;               // Total items across all HBLs
}

/**
 * Customer at a specific address with their bags
 */
export interface ManifestCustomer {
  cid: string;
  consigneeName: string;
  ctelephone: string;
  bags: ManifestBag[];
  totalBags: number;
  totalWeight: number;
  totalItems: number;
  signature?: string; // For delivery confirmation
  deliveredAt?: Date;
}

/**
 * Address location with all customers at that address
 */
export interface ManifestAddress {
  estate: string;
  city: string;
  rpto: string;         // Reparto (neighborhood)
  streetName: string;
  streetNo: string;
  between: string;
  fullAddress: string; // Formatted complete address
  customers: ManifestCustomer[];
  totalCustomers: number;
  totalBags: number;
  totalItems: number;
}

/**
 * Rpto-level grouping of addresses
 */
export interface ManifestRpto {
  rpto: string;
  addresses: ManifestAddress[];
  totalAddresses: number;
  totalCustomers: number;
  totalBags: number;
  totalItems: number;
}

/**
 * City-level grouping of rptos
 */
export interface ManifestCity {
  city: string;
  rptos: ManifestRpto[];
  totalRptos: number;
  totalAddresses: number;
  totalCustomers: number;
  totalBags: number;
  totalItems: number;
}

/**
 * State-level grouping of cities
 */
export interface ManifestState {
  state: string;
  cities: ManifestCity[];
  totalCities: number;
  totalRptos: number;
  totalAddresses: number;
  totalCustomers: number;
  totalBags: number;
  totalItems: number;
}

/**
 * Complete delivery manifest
 */
export interface DeliveryManifest {
  manifestId: string;
  generatedAt: Date;
  generatedBy?: string;
  guideNumber?: string;
  states: ManifestState[];
  totalStates: number;
  totalCities: number;
  totalRptos: number;
  totalAddresses: number;
  totalCustomers: number;
  totalBags: number;
  totalItems: number;
  totalWeight: number;
  status: 'draft' | 'ready' | 'in-delivery' | 'completed';
}

/**
 * Manifest print options
 */
export interface ManifestPrintOptions {
  includeDetails?: boolean; // Show individual items or just totals
  includeSignature?: boolean; // Include signature lines
  pageBreakByAddress?: boolean; // New page for each address
  pageBreakByState?: boolean; // New page for each state
  showBarcodes?: boolean; // Show HBL barcodes
  compactMode?: boolean; // Condensed layout
  sortBy?: 'address' | 'customer' | 'weight';
}

/**
 * Manifest filter options
 */
export interface ManifestFilterOptions {
  state?: string;
  city?: string;
  guideNumber?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  minWeight?: number;
  maxWeight?: number;
}
