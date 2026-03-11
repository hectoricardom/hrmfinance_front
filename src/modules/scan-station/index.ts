/**
 * Scan Station Module
 * Document scanning, classification, and batch processing for tax documents.
 */

// Types
export type {
  DocumentClassification,
  FieldExtraction,
  ScanResult,
  ScanItemStatus,
  ScanBatchItem,
  ScanMode,
  ScanSession,
  ClientMatchSuggestion,
  IDScanResult,
  DuplicateCheckResult,
} from './types/scanTypes';

export { SCANNABLE_DOCUMENT_TYPES } from './types/scanTypes';

// Services
export {
  scanProcessingService,
  classifyDocument,
  extractDocumentFields,
  checkForDuplicate,
  crossReferencePreviousYear,
  matchDocumentToClients,
  processScannedDocument,
  processBatch,
  fileToDataUrl,
  fileToBuffer,
} from './services/scanProcessingService';

export {
  idScanService,
  extractIDData,
  extractPassportData,
  buildTaxPortalFromIDScan,
  validateIDData,
} from './services/idScanService';

// Components
export { default as ScanStationPage } from './components/ScanStationPage';
export { default as BatchScanCapture } from './components/BatchScanCapture';
export { default as ScanResultsView } from './components/ScanResultsView';
export { default as DocumentMatchSuggestions } from './components/DocumentMatchSuggestions';
