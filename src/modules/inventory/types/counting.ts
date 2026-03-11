export interface CountSession {
  id: string;
  type: 'zone' | 'full';
  zoneId?: string;
  zoneName?: string;
  status: 'in_progress' | 'completed' | 'cancelled';
  startedAt: number;
  completedAt?: number;
  createdBy: string;
  items: CountItem[];
  summary?: CountSummary;
}

export interface CountItem {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  productUpc?: string;
  productImage?: string;
  locationId: string;
  binCode: string;
  systemQuantity: number;
  countedQuantity?: number;
  status: 'pending' | 'counted' | 'discrepancy' | 'recounted';
  discrepancy?: number;
  countedAt?: number;
  countedBy?: string;
  notes?: string;
}

export interface CountSummary {
  totalProducts: number;
  countedProducts: number;
  correctCount: number;
  discrepancyCount: number;
  totalDiscrepancyValue: number;
  adjustmentsApplied: boolean;
}

export interface Zone {
  id: string;
  name: string;
  code: string;
  productCount: number;
  shelfCount: number;
}

// Helper functions for generating IDs
export const generateCountSessionId = (): string => {
  return `count-session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

export const generateCountItemId = (): string => {
  return `count-item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

export const generateZoneId = (): string => {
  return `zone-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

// Helper function to calculate discrepancy
export const calculateDiscrepancy = (systemQuantity: number, countedQuantity: number): number => {
  return countedQuantity - systemQuantity;
};

// Helper function to determine item status based on count
export const determineItemStatus = (systemQuantity: number, countedQuantity?: number): CountItem['status'] => {
  if (countedQuantity === undefined) {
    return 'pending';
  }

  if (countedQuantity === systemQuantity) {
    return 'counted';
  }

  return 'discrepancy';
};
