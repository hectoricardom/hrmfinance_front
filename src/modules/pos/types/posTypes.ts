// Point of Sale types and interfaces

export interface POSProduct {
  id: string;
  product: {
    id: string;
    code: string;
    label: string;
    price: number;
    category?: string;
    image?: string;
    barcode?: string;
    sku?: string;
  };
  qty: number;
  unitPrice: number;
  discount: number; // Discount amount per unit
  discountPercent: number; // Discount percentage
  total: number;
  taxRate?: number; // Tax rate for this product
  notes?: string;
}

export interface POSService {
  id: string;
  type: string;
  name: string;
  qty: number;
  unitPrice: number;
  discount: number;
  total: number;
  taxRate?: number;
  notes?: string;
}

export interface POSCustomer {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  cid?: string;
  loyaltyId?: string;
  discountRate?: number; // Customer-specific discount rate
}

export interface POSPaymentMethod {
  cash: number;
  creditCard: number;
  debitCard: number;
  zelle: number;
  bankTransfer: number;
  check: number;
  giftCard: number;
  googlePay: number;
  other: number;
  cashChange?: number; // Change to give back
}

export interface POSTax {
  name: string;
  rate: number; // Tax rate as percentage (e.g., 8.5 for 8.5%)
  amount: number; // Calculated tax amount
  applyToTotal: boolean; // Apply to subtotal or after discounts
}

export interface POSDiscount {
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'CUSTOMER_DISCOUNT';
  value: number;
  description?: string;
  applyToTotal: boolean; // Apply to entire sale or individual items
}

export interface POSSale {
  id: string;
  saleNumber: string;
  timestamp: string;
  cashier: {
    id: string;
    name: string;
  };
  customer?: POSCustomer;
  products: POSProduct[];
  services: POSService[];
  
  // Pricing breakdown
  subtotal: number;
  discounts: POSDiscount[];
  totalDiscount: number;
  taxes: POSTax[];
  totalTax: number;
  total: number;
  
  // Payment
  paymentMethods: POSPaymentMethod;
  totalPaid: number;
  change: number;
  
  // Status and metadata
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED';
  notes?: string;
  storeId?: string;
  storeName?: string;
  receiptPrinted?: boolean;
  refundReason?: string;
  originalSaleId?: string; // For refunds
}

export interface POSCart {
  products: POSProduct[];
  services: POSService[];
  customer?: POSCustomer;
  discounts: POSDiscount[];
  notes?: string;
}

export interface POSSettings {
  taxRates: POSTax[];
  defaultPaymentMethod: keyof POSPaymentMethod;
  allowNegativeInventory: boolean;
  requireCustomerForSale: boolean;
  autoPrintReceipt: boolean;
  currency: string;
  receiptFooter?: string;
  receiptHeader?: string;
}

export interface POSTransaction {
  id: string;
  type: 'SALE' | 'REFUND' | 'VOID' | 'NO_SALE';
  saleId?: string;
  amount: number;
  timestamp: string;
  cashier: {
    id: string;
    name: string;
  };
  paymentMethod: keyof POSPaymentMethod;
  notes?: string;
}

// For daily/shift reporting
export interface POSShiftSummary {
  shiftId: string;
  cashier: {
    id: string;
    name: string;
  };
  startTime: string;
  endTime?: string;
  openingCash: number;
  closingCash: number;
  totalSales: number;
  totalRefunds: number;
  totalTransactions: number;
  paymentBreakdown: POSPaymentMethod;
  isOpen: boolean;
}

// Product quick access for POS
export interface POSProductQuick {
  id: string;
  name: string;
  price: number;
  category: string;
  image?: string;
  barcode?: string;
  sku?: string;
  inStock: number;
  isActive: boolean;
  isFavorite?: boolean; // For quick access buttons
}

// For barcode scanning
export interface POSBarcodeScan {
  code: string;
  type: 'PRODUCT' | 'CUSTOMER' | 'COUPON';
  timestamp: string;
}

export interface POSReceipt {
  saleId: string;
  headerText?: string;
  footerText?: string;
  items: Array<{
    name: string;
    qty: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: string;
  change?: number;
  timestamp: string;
  cashier: string;
}