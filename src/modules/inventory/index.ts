// Inventory Module - Product & Location Management
export { default as Inventory } from './pages/Inventory';
export { default as Products } from './pages/Products';
export { default as OrphanManagement } from './pages/OrphanManagement';
export { default as StockReconciliation } from './pages/StockReconciliation';

export { default as AddInventoryModal } from './components/AddInventoryModal';
export { default as AddProductModal } from './components/AddProductModal';
export { default as AddLocationModal } from './components/AddLocationModal';
export { default as BulkMovementModal } from './components/BulkMovementModal';
export { default as BulkMovementReport } from './components/BulkMovementReport';
export { default as BulkMovementWithReport } from './components/BulkMovementWithReport';
export { default as InventoryDetailModal } from './components/InventoryDetailModal';
export { default as InventoryMovementView } from './components/InventoryMovementView';
export { default as SearchableProductDropdown } from './components/SearchableProductDropdown';
export { default as SearchableProductDropdownWithStock } from './components/SearchableProductDropdownWithStock';
export { default as SearchableLocationDropdown } from './components/SearchableLocationDropdown';
export { default as ReceivingScreen } from './components/ReceivingScreen';
export { default as ProductLookupResult } from './components/ProductLookupResult';
export { default as NewProductForm } from './components/NewProductForm';
export { default as CountingScreen } from './components/CountingScreen';
export { default as ZoneSelector } from './components/ZoneSelector';
export { default as CountingProgress } from './components/CountingProgress';
export { default as CountingSummary } from './components/CountingSummary';
export { default as DiscrepancyAlert } from './components/DiscrepancyAlert';
export { default as BulkProductImporter } from './components/BulkProductImporter';
export { default as ProductImageManager } from './components/ProductImageManager';

export { inventoryStore, getEffectivePrice, getPriceInfo } from './stores/inventoryStore';
export { countingStore } from './stores/countingStore';
export { receivingStore } from './stores/receivingStore';
export type {
  Product,
  Location,
  InventoryMovement,
  BulkMovementRequest,
  BulkMovementItem,
  InventoryStock,
  InventoryItem,
  LocationPrice,
  PricesByLocation
} from './stores/inventoryStore';
export type {
  Zone,
  CountItem,
  CountSession,
  CountSummary
} from './types/counting';
export type {
  UPCLookupResult,
  ReceivingItem,
  ReceivingSession,
  NewProductData,
  ReceivingLookupState
} from './types/receiving';
export type {
  ProductImage,
  AIImageSearchResult,
  ImageSearchResponse
} from './services/productImageService';
export {
  findProductImageWithAI,
  findProductImagesBatch,
  getProductImages,
  addProductImage,
  setProductPrimaryImage,
  deleteProductImage,
  searchProductImagesMultiStrategy
} from './services/productImageService';