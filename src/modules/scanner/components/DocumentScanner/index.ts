/**
 * DocumentScanner Module Exports
 *
 * ML-powered document scanning using Hugging Face Transformers.js for OCR
 * and ZXing for barcode detection.
 */

// Main component
export { default as DocumentScanner } from './DocumentScanner';
export {
  IDScanner,
  PassportScanner,
  InventoryScanner,
} from './DocumentScanner';

// Scanner service
export {
  DocumentScannerService,
  getScannerService,
  createScannerService,
} from './scannerService';

// Parsers
export { parseAAMVA, isAAMVAFormat } from './aamvaParser';
export {
  parseMRZ,
  extractMRZLines,
  isMRZLike,
  cleanOCRText,
  calculateCheckDigit,
  validateCheckDigit,
  parseMRZDate,
} from './mrzParser';

// Image processing utilities
export {
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
} from './imageProcessing';

// Types
export type {
  ScanMode,
  DocumentType,
  BarcodeFormat,
  AAMVAData,
  MRZData,
  BarcodeData,
  ScanResult,
  ModelLoadingState,
  ScannerState,
  DocumentScannerProps,
  ImageProcessingOptions,
  CameraConstraints,
  IScannerService,
} from './types';

// Constants
export { ISO_COUNTRY_CODES, AAMVA_FIELD_CODES } from './types';
