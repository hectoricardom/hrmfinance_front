// POS Module Exports

// Components
export { default as POSCheckout } from './components/POSCheckout';
export { default as ProductGrid } from './components/ProductGrid';
export { default as ShoppingCart } from './components/ShoppingCart';
export { default as PaymentProcessor } from './components/PaymentProcessor';
export { default as CustomerSelector } from './components/CustomerSelector';
export { default as ReceiptGenerator } from './components/ReceiptGenerator';

// Pages
export { default as POSPage } from './pages/POSPage';

// Types
export type {
  POSProduct,
  POSService,
  POSCustomer,
  POSPaymentMethod,
  POSTax,
  POSDiscount,
  POSSale,
  POSCart,
  POSSettings,
  POSTransaction,
  POSShiftSummary,
  POSProductQuick,
  POSBarcodeScan,
  POSReceipt
} from './types/posTypes';

// Re-export everything from types for convenience
export * from './types/posTypes';