import { createStore } from 'solid-js/store';
import { createRoot } from 'solid-js';
import type {
  DrakeExportState,
  DrakeTaxDocument,
  TaxYear,
  FilingStatus,
  ExportStatus,
  SectionState,
  TaxFormSummary,
  ExportValidation,
  DrakeExportResult,
  TaxPortal,
  TaxDocumentRequest,
} from '../types/drakeTypes';

const initialSectionState: SectionState = {
  clientSelector: true,
  documentUpload: false,
  documentReview: false,
  formSummary: false,
  export: false,
};

const initialState: DrakeExportState = {
  selectedClient: null,
  taxYear: 2024,
  filingStatus: null,
  documents: [],
  uploadQueue: [],
  sectionState: { ...initialSectionState },
  isLoading: false,
  error: null,
  exportStatus: 'not_ready',
  exportResult: null,
  formSummaries: [],
  documentRequests: [],
};

function createDrakeExportStore() {
  const [state, setState] = createStore<DrakeExportState>({ ...initialState });

  // Actions
  const selectClient = (client: TaxPortal | null): void => {
    if (client === null) {
      setState({
        selectedClient: null,
        sectionState: {
          ...state.sectionState,
          clientSelector: true,
          documentUpload: false,
        },
      });
    } else {
      setState({
        selectedClient: client,
        sectionState: {
          ...state.sectionState,
          clientSelector: false,
          documentUpload: true,
        },
      });
    }
  };

  const clearClient = (): void => {
    setState({
      selectedClient: null,
      sectionState: {
        ...state.sectionState,
        clientSelector: true,
        documentUpload: false,
      },
    });
  };

  const setTaxYear = (year: TaxYear): void => {
    setState('taxYear', year);
  };

  const setFilingStatus = (status: FilingStatus): void => {
    setState('filingStatus', status);
  };

  const addDocument = (doc: DrakeTaxDocument): void => {
    setState('documents', (docs) => [...docs, doc]);
  };

  const updateDocument = (id: string, updates: Partial<DrakeTaxDocument>): void => {
    setState('documents', (doc) => doc.id === id, updates);
  };

  const removeDocument = (id: string): void => {
    setState('documents', (docs) => docs.filter((doc) => doc.id !== id));
  };

  const setDocuments = (docs: DrakeTaxDocument[]): void => {
    setState('documents', docs);
  };

  const clearDocuments = (): void => {
    setState('documents', []);
  };

  const verifyDocument = (id: string): void => {
    setState('documents', (doc) => doc.id === id, 'verified', true);
  };

  const verifyAllDocuments = (): void => {
    setState('documents', {}, 'verified', true);
  };

  const toggleSection = (section: keyof SectionState): void => {
    setState('sectionState', section, (current) => !current);
  };

  const setLoading = (loading: boolean): void => {
    setState('isLoading', loading);
  };

  const setError = (error: string | null): void => {
    setState('error', error);
  };

  const validateExportReadiness = (): ExportValidation => {
    const missingRequired: string[] = [];
    const warnings: string[] = [];

    if (!state.selectedClient) {
      missingRequired.push('No client selected');
    }

    if (!state.filingStatus) {
      missingRequired.push('Filing status not selected');
    }

    if (state.documents.length === 0) {
      missingRequired.push('No documents uploaded');
    }

    const verifiedDocs = state.documents.filter((doc) => doc.verified);
    const unverifiedDocs = state.documents.filter((doc) => !doc.verified);
    if (unverifiedDocs.length > 0) {
      warnings.push(`${unverifiedDocs.length} document(s) not verified`);
    }

    const isReady = missingRequired.length === 0;

    // Calculate totals from extracted amounts
    const totalIncome = state.documents.reduce((sum, doc) => {
      const amounts = doc.extractedAmounts;
      if (!amounts) return sum;
      return sum + (amounts.wages || 0) + (amounts.nonEmployeeCompensation || 0) +
        (amounts.interestIncome || 0) + (amounts.ordinaryDividends || 0);
    }, 0);

    const totalWithholding = state.documents.reduce((sum, doc) => {
      const amounts = doc.extractedAmounts;
      if (!amounts) return sum;
      return sum + (amounts.federalTaxWithheld || 0) + (amounts.federalTaxWithheld1099 || 0);
    }, 0);

    return {
      isReady,
      missingRequired,
      warnings,
      documentCount: state.documents.length,
      verifiedCount: verifiedDocs.length,
      unverifiedCount: unverifiedDocs.length,
      totalIncome,
      totalWithholding,
    };
  };

  const setExportStatus = (status: ExportStatus): void => {
    setState('exportStatus', status);
  };

  const setExportResult = (result: DrakeExportResult | null): void => {
    setState('exportResult', result);
  };

  const calculateFormSummaries = (): void => {
    const summaryMap = new Map<string, TaxFormSummary>();

    state.documents.forEach((doc) => {
      const formType = doc.drakeFormType || 'other';
      const existing = summaryMap.get(formType);

      // Calculate document total from extracted amounts
      const amounts = doc.extractedAmounts || {};
      const docTotal = (amounts.wages || 0) + (amounts.nonEmployeeCompensation || 0) +
        (amounts.interestIncome || 0) + (amounts.ordinaryDividends || 0) +
        (amounts.mortgageInterest || 0) + (amounts.totalAmount || 0);

      if (existing) {
        summaryMap.set(formType, {
          ...existing,
          documentCount: existing.documentCount + 1,
          totalAmount: existing.totalAmount + docTotal,
        });
      } else {
        summaryMap.set(formType, {
          formType: formType,
          formLabel: formType,
          documentCount: 1,
          totalAmount: docTotal,
          lines: [],
          isComplete: doc.verified || false,
          warnings: [],
        });
      }
    });

    setState('formSummaries', Array.from(summaryMap.values()));
  };

  const reset = (): void => {
    setState({ ...initialState, sectionState: { ...initialSectionState } });
  };

  // Computed getters
  const getVerifiedDocuments = (): DrakeTaxDocument[] => {
    return state.documents.filter((doc) => doc.verified);
  };

  const getUnverifiedDocuments = (): DrakeTaxDocument[] => {
    return state.documents.filter((doc) => !doc.verified);
  };

  const getTotalIncome = (): number => {
    return state.documents.reduce((total, doc) => {
      const amounts = doc.extractedAmounts;
      if (!amounts) return total;
      return total + (amounts.wages || 0) + (amounts.nonEmployeeCompensation || 0) +
        (amounts.interestIncome || 0) + (amounts.ordinaryDividends || 0) +
        (amounts.rents || 0) + (amounts.royalties || 0) + (amounts.otherIncome || 0);
    }, 0);
  };

  const getTotalWithholding = (): number => {
    return state.documents.reduce((total, doc) => {
      const amounts = doc.extractedAmounts;
      if (!amounts) return total;
      return total + (amounts.federalTaxWithheld || 0) + (amounts.federalTaxWithheld1099 || 0) +
        (amounts.stateTaxWithheld || 0) + (amounts.localTaxWithheld || 0);
    }, 0);
  };

  return {
    state,
    // Actions
    selectClient,
    clearClient,
    setTaxYear,
    setFilingStatus,
    addDocument,
    updateDocument,
    removeDocument,
    setDocuments,
    clearDocuments,
    verifyDocument,
    verifyAllDocuments,
    toggleSection,
    setLoading,
    setError,
    validateExportReadiness,
    setExportStatus,
    setExportResult,
    calculateFormSummaries,
    reset,
    // Computed
    getVerifiedDocuments,
    getUnverifiedDocuments,
    getTotalIncome,
    getTotalWithholding,
  };
}

// Create the store instance
const storeInstance = createRoot(createDrakeExportStore);

// Export store state directly for reactive access
export const drakeExportStore = storeInstance.state;

// Export actions separately for cleaner imports
export const drakeExportActions = {
  selectClient: storeInstance.selectClient,
  clearClient: storeInstance.clearClient,
  setTaxYear: storeInstance.setTaxYear,
  setFilingStatus: storeInstance.setFilingStatus,
  addDocument: storeInstance.addDocument,
  updateDocument: storeInstance.updateDocument,
  updateDocumentStatus: (id: string, status: import('../types/drakeTypes').UploadStatus, progress?: number) => {
    storeInstance.updateDocument(id, { uploadStatus: status, processingProgress: progress });
  },
  removeDocument: storeInstance.removeDocument,
  setDocuments: storeInstance.setDocuments,
  clearDocuments: storeInstance.clearDocuments,
  verifyDocument: storeInstance.verifyDocument,
  verifyAllDocuments: storeInstance.verifyAllDocuments,
  toggleSection: storeInstance.toggleSection,
  setLoading: storeInstance.setLoading,
  setError: storeInstance.setError,
  validateExportReadiness: storeInstance.validateExportReadiness,
  setExportStatus: storeInstance.setExportStatus,
  setExportResult: storeInstance.setExportResult,
  calculateFormSummaries: storeInstance.calculateFormSummaries,
  reset: storeInstance.reset,
};

// Export computed getters
export const drakeExportGetters = {
  getVerifiedDocuments: storeInstance.getVerifiedDocuments,
  getUnverifiedDocuments: storeInstance.getUnverifiedDocuments,
  getTotalIncome: storeInstance.getTotalIncome,
  getTotalWithholding: storeInstance.getTotalWithholding,
};

// Also export the full store for backward compatibility
export default storeInstance;
