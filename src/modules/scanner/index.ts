// Scanner Module Exports

// Components
export { default as BarcodeScanner } from './components/BarcodeScanner';
export { default as EnhancedBarcodeScanner } from './components/EnhancedBarcodeScanner';
export { default as FastBarcodeScanner } from './components/FastBarcodeScanner';
export {
  default as ScannerIntegration,
  InventoryScannerIntegration,
  LocationScannerIntegration,
  AssetScannerIntegration,
  ShippingScannerIntegration,
  useBarcodeScanner
} from './components/ScannerIntegration';

// Universal Scanner (ZXing + Tesseract MRZ)
export {
  default as UniversalScanner,
  IDScanner,
  InventoryScanner,
  PassportScanner,
  ShippingScanner
} from './components/UniversalScanner';

// Services
export {
  scannerService,
  type ScannedLocationUpdate,
  type ScannedLocationRecord,
  type ScannerAPIResponse
} from './services/scannerService';

// Utilities
export {
  parseMRZ,
  extractMRZLines,
  isMRZLike,
  type MRZData
} from './utils/mrzParser';

// Types
export {
  type UniversalScannerProps,
  type ScanResult,
  type BarcodeScanResult,
  type MRZScanResult,
  type ScanMode,
  type BarcodeFormat,
  type BarcodePreset,
  BARCODE_PRESETS
} from './types/universalScannerTypes';

// ML-Powered DocumentScanner (Transformers.js + ZXing)
export {
  DocumentScanner,
  IDScanner as MLIDScanner,
  PassportScanner as MLPassportScanner,
  InventoryScanner as MLInventoryScanner,
  DocumentScannerService,
  getScannerService,
  createScannerService,
  parseAAMVA,
  isAAMVAFormat,
  parseMRZ as parseMLMRZ,
  extractMRZLines as extractMLMRZLines,
  isMRZLike as isMLMRZLike,
  cleanOCRText,
  calculateCheckDigit,
  validateCheckDigit,
  parseMRZDate,
  convertToGrayscale,
  adjustContrast,
  adjustBrightness,
  applyThreshold,
  sharpenImage,
  denoiseImage,
  preprocessForMRZ,
  preprocessForBarcode,
  canvasToImageData,
  imageDataToCanvas,
  type DocumentType,
  type AAMVAData,
  type ModelLoadingState,
  type ScannerState,
  type DocumentScannerProps,
  type ImageProcessingOptions,
  type CameraConstraints,
  type IScannerService,
  ISO_COUNTRY_CODES,
  AAMVA_FIELD_CODES,
} from './components/DocumentScanner';

// Re-export everything for convenience
export * from './components/BarcodeScanner';
export * from './components/EnhancedBarcodeScanner';
export * from './components/FastBarcodeScanner';
export * from './components/ScannerIntegration';
export * from './services/scannerService';