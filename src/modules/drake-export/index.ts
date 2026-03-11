/**
 * Drake Export Module
 * Main entry point for the Drake Tax Export module
 */

// Page Components
export { default as DrakeExportPage } from './pages/DrakeExportPage';

// Dashboard Component
export { default as DrakeExportDashboard } from './components/DrakeExportDashboard';

// Store
export { drakeExportStore, drakeExportActions, drakeExportGetters } from './stores/drakeExportStore';

// Types
export type {
  TaxPortal,
  TaxDocumentRequest,
  RequestedDocumentType,
  DrakeTaxDocumentType,
  TaxYear,
  UploadStatus,
  ExportStatus,
  FilingStatus,
  ExtractedTaxAmounts,
  PayerInfo,
  DrakeTaxDocument,
  DrakeFormAssociation,
  TaxFormLine,
  TaxFormSummary,
  DrakeExportRecord,
  DrakeExportConfig,
  DrakeExportResult,
  ExportValidation,
  SectionState,
  DrakeExportState,
} from './types/drakeTypes';

// Constants
export {
  DOCUMENT_TO_DRAKE_TYPE,
  DRAKE_FORM_LABELS,
  FILING_STATUS_LABELS,
  DEFAULT_REQUESTED_DOCUMENTS,
} from './types/drakeTypes';

// Services - Tax Document API
export {
  uploadTaxDocument,
  batchUploadTaxDocuments,
  processTaxDocument,
  batchProcessTaxDocuments,
  uploadAndProcessTaxDocuments,
  getTaxDocuments,
  getTaxDocumentById,
  getTaxDocumentsByTaxYear,
  getTaxDocumentsByType,
  getTaxDocumentsByTaxPortal,
  searchTaxDocuments,
  updateTaxDocument,
  deleteTaxDocument,
  verifyTaxDocument,
  flagTaxDocumentForReview,
  correctTaxDocumentClassification,
  getTaxDocumentProcessingStatus,
  getTaxDocumentQueueStatus,
  getTaxDocumentsSummary,
  linkTaxDocumentToPortal,
  suggestTaxDocumentJournalEntry,
  apiResponseToDrakeTaxDocument
} from './services/taxDocumentApi';

// Services - Drake Export
export {
  generateDrakeExport,
  documentToRecords,
  recordsToCSV,
  downloadCSV,
  validateExportData
} from './services/drakeExportService';

// Services - Tax Portal API
export {
  createTaxPortal,
  getTaxPortals,
  getTaxPortalById,
  updateTaxPortal,
  deleteTaxPortal,
  createDocumentRequest,
  getDocumentRequestByToken,
  getDocumentRequestByPin,
  getDocumentRequestsByPortal,
  getDocumentRequests,
  markDocumentUploaded,
  cancelDocumentRequest,
  deleteDocumentRequest,
  sendDocumentRequestReminder,
  getPublicUploadUrl,
  getPinAccessUrl,
  formatExpiration,
  isRequestExpired,
  getUploadProgress,
  getMissingRequiredDocuments
} from './services/taxPortalApi';

// Components
export { default as TaxPortalRequestManager } from './components/TaxPortalRequestManager';

// Pages
export { default as PublicTaxUploadPage } from './pages/PublicTaxUploadPage';
export { default as PinAccessPage } from './pages/PinAccessPage';
