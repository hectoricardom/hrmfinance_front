/**
 * Tax Document API Service
 * Integrates with the backend tax document processing functions
 */

import { fetchGraphQLSS, devLog } from '../../../services/utils';
import { authStore } from '../../../stores/authStore';
import { DrakeTaxDocument, DrakeTaxDocumentType, ExtractedTaxAmounts, PayerInfo } from '../types/drakeTypes';

// Response types from the actual backend
interface TaxDocumentResponse {
  id: string;
  taxPortalId?: string;
  clientNotaryId?: string;
  taxYear: number;
  documentType: string;
  documentSubtype?: string;
  originalName?: string;
  fileName?: string;
  filePath?: string;
  fileUrl?: string;
  fileSize?: number;
  mimeType?: string;
  uploadedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  status: 'pending' | 'processing' | 'processed' | 'verified' | 'error' | 'flagged' | 'complete';
  processingStage?: string;
  ocrConfidence?: number;
  classification?: {
    documentType: string;
    documentSubtype?: string;
    taxYear?: number;
    taxRelevance?: string;
    accountingImpact?: any;
    taxImplications?: any;
  };
  extractedData?: {
    taxYear?: number;
    payerTIN?: string;
    payerName?: string;
    payerAddress?: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      fullAddress?: string;
    };
    recipientSSN?: string;
    recipientName?: string;
    recipientAddress?: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      fullAddress?: string;
    };
    documentType?: string;
    rawText?: string;
    // W-2 specific data
    w2Data?: {
      wagesTipsCompensation?: number;
      federalTaxWithheld?: number;
      socialSecurityWages?: number;
      socialSecurityTax?: number;
      medicareWages?: number;
      medicareTax?: number;
      socialSecurityTips?: number;
      allocatedTips?: number;
      dependentCareBenefits?: number;
      nonqualifiedPlans?: number;
      stateWages?: number;
      stateTax?: number;
      localWages?: number;
      localTax?: number;
      stateId?: string;
      localityName?: string;
      employerEIN?: string;
      employeeSSN?: string;
      controlNumber?: string;
      retirementPlan?: boolean;
      statutoryEmployee?: boolean;
      thirdPartySickPay?: boolean;
      box12Codes?: Array<{ code: string; amount: number }>;
    };
    form1099Data: any,
    // 1099-NEC specific data
    form1099necData?: {
      nonEmployeeCompensation?: number;
      federalTaxWithheld?: number;
      stateIncome?: number;
      stateTaxWithheld?: number;
      payerStateNo?: string;
    };
    // 1099-MISC specific data
    form1099miscData?: {
      rents?: number;
      royalties?: number;
      otherIncome?: number;
      fishingBoatProceeds?: number;
      medicalPayments?: number;
      substitutePayments?: number;
      cropInsurance?: number;
      grossProceeds?: number;
      federalTaxWithheld?: number;
      stateTaxWithheld?: number;
    };
    // 1099-INT specific data
    form1099intData?: {
      interestIncome?: number;
      earlyWithdrawalPenalty?: number;
      usSavingsBondInterest?: number;
      federalTaxWithheld?: number;
      investmentExpenses?: number;
      foreignTaxPaid?: number;
      taxExemptInterest?: number;
      privateBondInterest?: number;
      marketDiscount?: number;
      bondPremium?: number;
    };
    // 1099-DIV specific data
    form1099divData?: {
      ordinaryDividends?: number;
      qualifiedDividends?: number;
      capitalGainDistributions?: number;
      unrecaptured1250Gain?: number;
      section1202Gain?: number;
      collectiblesGain?: number;
      nondividendDistributions?: number;
      federalTaxWithheld?: number;
      section199ADividends?: number;
      investmentExpenses?: number;
      foreignTaxPaid?: number;
      exemptInterestDividends?: number;
      specifiedPrivateBondDividends?: number;
    };
    // 1098 Mortgage specific data
    form1098Data?: {
      mortgageInterest?: number;
      outstandingPrincipal?: number;
      mortgageOriginationDate?: string;
      refundOfOverpaidInterest?: number;
      mortgageInsurancePremiums?: number;
      pointsPaid?: number;
      propertyAddress?: string;
      propertyTax?: number;
      acquisitionDate?: string;
    };
    // 1098-T Tuition specific data
    form1098tData?: {
      paymentsReceived?: number;
      amountsBilled?: number;
      adjustmentsPriorYear?: number;
      scholarshipsGrants?: number;
      adjustmentsScholarships?: number;
      includesJanMarch?: boolean;
      halfTimeStudent?: boolean;
      graduateStudent?: boolean;
      insuranceContractReimbursement?: number;
    };
    // Schedule K-1 specific data
    scheduleK1Data?: {
      ordinaryBusinessIncome?: number;
      rentalRealEstateIncome?: number;
      otherRentalIncome?: number;
      guaranteedPayments?: number;
      interestIncome?: number;
      ordinaryDividends?: number;
      qualifiedDividends?: number;
      royalties?: number;
      shortTermCapitalGain?: number;
      longTermCapitalGain?: number;
      unrecaptured1250Gain?: number;
      section1231Gain?: number;
      section179Deduction?: number;
      selfEmploymentEarnings?: number;
      partnershipName?: string;
      partnershipEIN?: string;
      partnerType?: string;
    };


    // 1095-A Health Insurance Marketplace Statement (for Form 8962 PTC calculation)
    form1095aData?: {
      // Annual totals (sum of monthly values)
      annualPremiumAmount?: number;      // Column A - Total annual enrollment premium
      annualSlcspPremium?: number;       // Column B - Total annual SLCSP premium
      annualAdvancePtc?: number;         // Column C - Total annual advance payment of PTC
      // Monthly breakdown (array of 12 values, index 0 = January)
      monthlyPremiums?: number[];        // Column A - Monthly enrollment premiums
      monthlySlcsp?: number[];           // Column B - Monthly SLCSP premiums
      monthlyAptc?: number[];            // Column C - Monthly advance PTC
      // Coverage information
      coverageMonths?: number;           // Number of months with coverage
      coveredMonthFlags?: boolean[];     // 12 booleans, true if covered that month
      // Marketplace information
      marketplaceName?: string;
      marketplaceId?: string;
      policyNumber?: string;
      // Covered individuals
      recipientName?: string;
      recipientSSN?: string;
      spouseName?: string;
      spouseSSN?: string;
    };
     form1095AData?: any;
  };
  validationStatus?: string;
  validationErrors?: Array<{
    field: string;
    message: string;
    severity: string;
  }>;
  verified?: boolean;
  verifiedBy?: string;
  verifiedAt?: number;
  notes?: string;
  errorMessage?: string;
}

interface UploadResult {
  success: boolean;
  documentId?: string;
  document?: TaxDocumentResponse;
  error?: string;
}

interface ProcessResult {
  success: boolean;
  document?: TaxDocumentResponse;
  error?: string;
}

interface BatchResult {
  success: boolean;
  results: Array<{
    documentId: string;
    success: boolean;
    error?: string;
  }>;
  totalProcessed: number;
  totalFailed: number;
}

// Upload & Processing Functions

/**
 * Upload a single tax document
 */
export async function uploadTaxDocument(
  file: File,
  clientNotaryId: string,
  taxYear: number,
  options?: {
    documentType?: string;
    notes?: string;
    tags?: string[];
  }
): Promise<UploadResult> {
  try {
    // Convert file to ArrayBuffer then to Uint8Array for transmission
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Array.from(new Uint8Array(arrayBuffer));

    // Build the request with file data
    const result = await fetchGraphQLSS({
      query: 'uploadTaxDocument',
      params: {
        businessId: authStore.getBusinessId()
      },
      form: {
        // File data
        fileBuffer: fileBuffer,
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        // Tax document metadata
        taxPortalId: clientNotaryId,
        taxYear,
        documentType: options?.documentType,
        tags: options?.tags,
        notes: options?.notes,
        businessId: authStore.getBusinessId()
      }
    });

    if (result?.success && result?.documentId) {
      return {
        success: true,
        documentId: result.documentId,
        document: result.document
      };
    }

    return {
      success: false,
      error: result?.error || 'Failed to upload document'
    };
  } catch (error) {
    devLog('Error uploading tax document:', error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
}




/**
 * Batch upload multiple tax documents
 */
export async function batchUploadTaxDocuments(
  files: File[],
  clientNotaryId: string,
  taxYear: number
): Promise<BatchResult> {
  try {
    const result = await fetchGraphQLSS({
      query: 'batchUploadTaxDocuments',
      params: { businessId: authStore.getBusinessId() },
      form: { files, clientNotaryId, taxYear }
    });

    return {
      success: result?.success || false,
      results: result?.results || [],
      totalProcessed: result?.totalProcessed || 0,
      totalFailed: result?.totalFailed || 0
    };
  } catch (error) {
    devLog('Error batch uploading tax documents:', error);
    return {
      success: false,
      results: [],
      totalProcessed: 0,
      totalFailed: files.length
    };
  }
}

/**
 * Process a tax document with AI analysis
 */
export async function processTaxDocument(documentId: string): Promise<ProcessResult> {
  try {
    const result = await fetchGraphQLSS({
      query: 'processTaxDocument',
      params: {
        businessId: authStore.getBusinessId(),
      
      },
      form:{
        documentId,
        options: {
            forceReprocess: true
        }
      }
      
    });

    if (result?.success && result?.document) {
      return {
        success: true,
        document: result.document
      };
    }

    return {
      success: false,
      error: result?.error || 'Failed to process document'
    };
  } catch (error) {
    devLog('Error processing tax document:', error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
}

/**
 * Batch process multiple tax documents
 */
export async function batchProcessTaxDocuments(documentIds: string[]): Promise<BatchResult> {
  try {
    const result = await fetchGraphQLSS({
      query: 'batchProcessTaxDocuments',
      params: { businessId: authStore.getBusinessId() },
      form: { documentIds }
    });

    return {
      success: result?.success || false,
      results: result?.results || [],
      totalProcessed: result?.totalProcessed || 0,
      totalFailed: result?.totalFailed || 0
    };
  } catch (error) {
    devLog('Error batch processing tax documents:', error);
    return {
      success: false,
      results: [],
      totalProcessed: 0,
      totalFailed: documentIds.length
    };
  }
}

/**
 * Upload and process documents in one call
 */
export async function uploadAndProcessTaxDocuments(
  files: File[],
  clientNotaryId: string,
  taxYear: number
): Promise<BatchResult> {
  try {
    const result = await fetchGraphQLSS({
      query: 'uploadAndProcessTaxDocuments',
      params: { businessId: authStore.getBusinessId() },
      form: { files, clientNotaryId, taxYear }
    });

    return {
      success: result?.success || false,
      results: result?.results || [],
      totalProcessed: result?.totalProcessed || 0,
      totalFailed: result?.totalFailed || 0
    };
  } catch (error) {
    devLog('Error uploading and processing tax documents:', error);
    return {
      success: false,
      results: [],
      totalProcessed: 0,
      totalFailed: files.length
    };
  }
}

// Query & Retrieval Functions

/**
 * Get all tax documents for a client (by taxPortalId)
 */
export async function getTaxDocuments(taxPortalId: string): Promise<TaxDocumentResponse[]> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getTaxDocuments',
      params: {
        businessId: authStore.getBusinessId()
      },
      form: {
        taxPortalId
      }
    });
    return result?.documents || [];
  } catch (error) {
    devLog('Error getting tax documents:', error);
    return [];
  }
}

/**
 * Get a single tax document by ID
 */
export async function getTaxDocumentById(documentId: string): Promise<TaxDocumentResponse | null> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getTaxDocumentById',
      params: {
        businessId: authStore.getBusinessId()
      },
      form: {
        documentId
      }
    });

    return result?.document || null;
  } catch (error) {
    devLog('Error getting tax document:', error);
    return null;
  }
}

/**
 * Get tax documents by tax year and taxPortalId
 */
export async function getTaxDocumentsByTaxYear(
  taxPortalId: string,
  taxYear: number
): Promise<TaxDocumentResponse[]> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getTaxDocumentsByTaxYear',
      params: {
        businessId: authStore.getBusinessId()
      },
      form: {
        taxPortalId,
        taxYear
      }
    });

    return result?.documents || [];
  } catch (error) {
    devLog('Error getting tax documents by year:', error);
    return [];
  }
}

/**
 * Get tax documents for a client by taxPortalId and optionally filter by year
 * This is the main function to load existing documents for the Drake Export
 */
export async function getClientTaxDocuments(
  taxPortalId: string,
  taxYear?: number
): Promise<DrakeTaxDocument[]> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getTaxDocuments',
      params: {
        businessId: authStore.getBusinessId()
      },
      form: {
        taxPortalId,
        taxYear
      }
    });

    // Handle nested response structure: result.data.data or result.data
    const documents = result?.data?.data || result?.data || [];

    // Convert API responses to DrakeTaxDocument format


    devLog(documents)
    return documents.map((doc: TaxDocumentResponse) => apiResponseToDrakeTaxDocument(doc));
  } catch (error) {
    devLog('Error getting client tax documents:', error);
    return [];
  }
}

/**
 * Get tax documents by type
 */
export async function getTaxDocumentsByType(
  clientNotaryId: string,
  documentType: string
): Promise<TaxDocumentResponse[]> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getTaxDocumentsByType',
      params: { businessId: authStore.getBusinessId() },
      form: { clientNotaryId, documentType }
    });

    return result?.documents || [];
  } catch (error) {
    devLog('Error getting tax documents by type:', error);
    return [];
  }
}

/**
 * Get tax documents by tax portal
 */
export async function getTaxDocumentsByTaxPortal(taxPortalId: string): Promise<TaxDocumentResponse[]> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getTaxDocumentsByTaxPortal',
      params: { businessId: authStore.getBusinessId() },
      form: { taxPortalId }
    });

    return result?.documents || [];
  } catch (error) {
    devLog('Error getting tax documents by portal:', error);
    return [];
  }
}

/**
 * Search tax documents
 */
export async function searchTaxDocuments(
  query: string,
  filters?: {
    clientNotaryId?: string;
    taxYear?: number;
    documentType?: string;
    status?: string;
  }
): Promise<TaxDocumentResponse[]> {
  try {
    const result = await fetchGraphQLSS({
      query: 'searchTaxDocuments',
      params: { businessId: authStore.getBusinessId() },
      form: { searchQuery: query, ...filters }
    });

    return result?.documents || [];
  } catch (error) {
    devLog('Error searching tax documents:', error);
    return [];
  }
}

// Update & Delete Functions

/**
 * Update a tax document
 */
export async function updateTaxDocument(
  documentId: string,
  updates: {
    documentType?: string;
    extractedData?: any;
    notes?: string;
    taxYear?: number;
    taxPortalId?: string;  // For reassigning document to another client
  }
): Promise<{ success: boolean; document?: TaxDocumentResponse; error?: string }> {
  try {
    const result = await fetchGraphQLSS({
      query: 'updateTaxDocument',
      params: { businessId: authStore.getBusinessId() },
      form: { documentId, ...updates }
    });

    return {
      success: result?.success || false,
      document: result?.document,
      error: result?.error
    };
  } catch (error) {
    devLog('Error updating tax document:', error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
}

/**
 * Delete a tax document
 */
export async function deleteTaxDocument(documentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await fetchGraphQLSS({
      query: 'deleteTaxDocument',
      params: { businessId: authStore.getBusinessId(), id: documentId },
      form: { documentId, id: documentId }
    });

    return {
      success: result?.success || false,
      error: result?.error
    };
  } catch (error) {
    devLog('Error deleting tax document:', error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
}

// Verification & Correction Functions

/**
 * Verify a tax document
 */
export async function verifyTaxDocument(
  documentId: string,
  verifiedData?: {
    amounts?: Record<string, number>;
    payerInfo?: PayerInfo;
    notes?: string;
  }
): Promise<{ success: boolean; document?: TaxDocumentResponse; error?: string }> {
  try {
    const result = await fetchGraphQLSS({
      query: 'verifyTaxDocument',
      params: { businessId: authStore.getBusinessId() },
      form: { documentId, verifiedData }
    });

    return {
      success: result?.success || false,
      document: result?.document,
      error: result?.error
    };
  } catch (error) {
    devLog('Error verifying tax document:', error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
}

/**
 * Flag a tax document for review
 */
export async function flagTaxDocumentForReview(
  documentId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await fetchGraphQLSS({
      query: 'flagTaxDocumentForReview',
      params: { businessId: authStore.getBusinessId() },
      form: { documentId, reason }
    });

    return {
      success: result?.success || false,
      error: result?.error
    };
  } catch (error) {
    devLog('Error flagging tax document:', error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
}

/**
 * Correct tax document classification
 */
export async function correctTaxDocumentClassification(
  documentId: string,
  correctType: string,
  notes?: string
): Promise<{ success: boolean; document?: TaxDocumentResponse; error?: string }> {
  try {
    const result = await fetchGraphQLSS({
      query: 'correctTaxDocumentClassification',
      params: { businessId: authStore.getBusinessId() },
      form: { documentId, correctType, notes }
    });

    return {
      success: result?.success || false,
      document: result?.document,
      error: result?.error
    };
  } catch (error) {
    devLog('Error correcting tax document classification:', error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
}

// Status & Monitoring Functions

/**
 * Get processing status for a document
 */
export async function getTaxDocumentProcessingStatus(
  documentId: string
): Promise<{ status: string; progress?: number; error?: string }> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getTaxDocumentProcessingStatus',
      params: { businessId: authStore.getBusinessId() },
      form: { documentId }
    });

    return {
      status: result?.status || 'unknown',
      progress: result?.progress,
      error: result?.error
    };
  } catch (error) {
    devLog('Error getting processing status:', error);
    return {
      status: 'error',
      error: (error as Error).message
    };
  }
}

/**
 * Get queue status for pending documents
 */
export async function getTaxDocumentQueueStatus(): Promise<{
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getTaxDocumentQueueStatus',
      params: { businessId: authStore.getBusinessId() }
    });

    return {
      pending: result?.pending || 0,
      processing: result?.processing || 0,
      completed: result?.completed || 0,
      failed: result?.failed || 0
    };
  } catch (error) {
    devLog('Error getting queue status:', error);
    return {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0
    };
  }
}

/**
 * Get summary of tax documents for a client
 */
export async function getTaxDocumentsSummary(
  clientNotaryId: string,
  taxYear?: number
): Promise<{
  totalDocuments: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  totalIncome: number;
  totalWithholding: number;
}> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getTaxDocumentsSummary',
      params: { businessId: authStore.getBusinessId() },
      form: { clientNotaryId, taxYear }
    });

    return {
      totalDocuments: result?.totalDocuments || 0,
      byType: result?.byType || {},
      byStatus: result?.byStatus || {},
      totalIncome: result?.totalIncome || 0,
      totalWithholding: result?.totalWithholding || 0
    };
  } catch (error) {
    devLog('Error getting documents summary:', error);
    return {
      totalDocuments: 0,
      byType: {},
      byStatus: {},
      totalIncome: 0,
      totalWithholding: 0
    };
  }
}

// Integration Functions

/**
 * Link a tax document to a tax portal
 */
export async function linkTaxDocumentToPortal(
  documentId: string,
  taxPortalId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await fetchGraphQLSS({
      query: 'linkTaxDocumentToPortal',
      params: { businessId: authStore.getBusinessId() },
      form: { documentId, taxPortalId }
    });

    return {
      success: result?.success || false,
      error: result?.error
    };
  } catch (error) {
    devLog('Error linking document to portal:', error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
}

/**
 * Suggest journal entry for a tax document
 */
export async function suggestTaxDocumentJournalEntry(
  documentId: string
): Promise<{
  success: boolean;
  journalEntry?: {
    date: string;
    reference: string;
    description: string;
    entries: Array<{
      accountCode: string;
      accountName: string;
      debit: number;
      credit: number;
    }>;
  };
  error?: string;
}> {
  try {
    const result = await fetchGraphQLSS({
      query: 'suggestTaxDocumentJournalEntry',
      params: { businessId: authStore.getBusinessId() },
      form: { documentId }
    });

    return {
      success: result?.success || false,
      journalEntry: result?.journalEntry,
      error: result?.error
    };
  } catch (error) {
    devLog('Error suggesting journal entry:', error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
}

// Helper function to convert API response to DrakeTaxDocument
export function apiResponseToDrakeTaxDocument(response: TaxDocumentResponse): DrakeTaxDocument {
  // Map API status to UploadStatus
  const statusMap: Record<string, DrakeTaxDocument['uploadStatus']> = {
    'pending': 'pending',
    'processing': 'analyzing',
    'processed': 'analyzed',
    'complete': 'analyzed',
    'verified': 'verified',
    'error': 'error',
    'flagged': 'error'
  };

  // Map document type to Drake form type (case-insensitive)
  const typeMap: Record<string, DrakeTaxDocumentType> = {
    'w-2': 'w2',
    'w2': 'w2',
    'form_w2': 'w2',
    '1099-misc': '1099_misc',
    '1099_misc': '1099_misc',
    'form_1099_misc': '1099_misc',
    '1099-nec': '1099_nec',
    '1099_nec': '1099_nec',
    'form_1099_nec': '1099_nec',
    '1099-int': '1099_int',
    '1099_int': '1099_int',
    'form_1099_int': '1099_int',
    '1099-div': '1099_div',
    '1099_div': '1099_div',
    'form_1099_div': '1099_div',
    '1098': '1098',
    'form_1098': '1098',
    '1098-t': '1098_t',
    '1098_t': '1098_t',
    'form_1098_t': '1098_t',
    'schedule_k1': 'schedule_k1',
    'schedule k-1': 'schedule_k1',
    'k-1': 'schedule_k1',
    'k1': 'schedule_k1',
    'receipt': 'receipt',
    '1095-a': '1095_a',
    '1095_a': '1095_a',
    'form_1095_a': '1095_a',
    'form_1095a': '1095_a'
  };

  // Extract amounts based on document type
  const extractedAmounts: ExtractedTaxAmounts = {};
  const extracted = response.extractedData;


  let form1099necData = null;
  let form1099miscData = null;
  let form1099intData = null;

  let form1099divData = null;


 devLog(extracted)
 
  // W-2 data
  if (extracted?.w2Data) {

   
    const w2 = extracted.w2Data;
    extractedAmounts.wages = w2.wagesTipsCompensation;
    extractedAmounts.federalTaxWithheld = w2.federalTaxWithheld;
    extractedAmounts.socialSecurityWages = w2.socialSecurityWages;
    extractedAmounts.socialSecurityTax = w2.socialSecurityTax;
    extractedAmounts.medicareWages = w2.medicareWages;
    extractedAmounts.medicareTax = w2.medicareTax;
    extractedAmounts.socialSecurityTips = w2.socialSecurityTips;
    extractedAmounts.allocatedTips = w2.allocatedTips;
    extractedAmounts.dependentCareBenefits = w2.dependentCareBenefits;
    extractedAmounts.nonqualifiedPlans = w2.nonqualifiedPlans;
    extractedAmounts.stateWages = w2.stateWages;
    extractedAmounts.stateTaxWithheld = w2.stateTax;
    extractedAmounts.localWages = w2.localWages;
    extractedAmounts.localTaxWithheld = w2.localTax;
    extractedAmounts.employerStateId = w2.employerStateId;
    extractedAmounts.box14Items = w2?.box14Items;
    extractedAmounts.box12Codes = w2?.box12Codes;
    
  }



  
  else if( extracted?.form1099Data?.nonemployeeCompensation){
    form1099necData = extracted?.form1099Data;
  }
  else if(response.documentType ===  "1099-MISC"){
    form1099miscData = extracted?.form1099Data;
  }
  else if(response.documentType ===  "1099-INT"){
    form1099intData = extracted?.form1099Data;
  }
  else if(response.documentType ===  "1099-DIV"){
    form1099divData = extracted?.form1099Data;
  }






  // 1099-NEC data
  if (form1099necData ) {
    const nec =form1099necData;
   
    extractedAmounts.nonEmployeeCompensation = nec?.nonEmployeeCompensation || nec?.nonemployeeCompensation;
    extractedAmounts.federalTaxWithheld1099 = nec.federalTaxWithheld;
  }


  // 1099-MISC data
  if (form1099miscData) {
    const misc = form1099miscData;
    extractedAmounts.rents = misc.rents;
    extractedAmounts.royalties = misc.royalties;
    extractedAmounts.otherIncome = misc.otherIncome;
    extractedAmounts.fishingBoatProceeds = misc.fishingBoatProceeds;
    extractedAmounts.medicalPayments = misc.medicalPayments;
    extractedAmounts.cropInsurance = misc.cropInsurance;
    extractedAmounts.grossProceeds = misc.grossProceeds;
    extractedAmounts.federalTaxWithheld1099 = misc.federalTaxWithheld;
  }

  // 1099-INT data
  if (form1099intData) {
    const int = form1099intData;
    extractedAmounts.interestIncome = int.interestIncome;
    extractedAmounts.earlyWithdrawalPenalty = int.earlyWithdrawalPenalty;
    extractedAmounts.usSavingsBondInterest = int.usSavingsBondInterest;
    extractedAmounts.taxExemptInterest = int.taxExemptInterest;
    extractedAmounts.privateBondInterest = int.privateBondInterest;
    extractedAmounts.foreignTaxPaid = int.foreignTaxPaid;
    extractedAmounts.federalTaxWithheld1099 = int.federalTaxWithheld;
  }

  // 1099-DIV data
  if (form1099divData) {
    const div = form1099divData;
    extractedAmounts.ordinaryDividends = div.ordinaryDividends;
    extractedAmounts.qualifiedDividends = div.qualifiedDividends;
    extractedAmounts.capitalGainDistributions = div.capitalGainDistributions;
    extractedAmounts.unrecaptured1250Gain = div.unrecaptured1250Gain;
    extractedAmounts.section1202Gain = div.section1202Gain;
    extractedAmounts.collectiblesGain = div.collectiblesGain;
    extractedAmounts.nondividendDistributions = div.nondividendDistributions;
    extractedAmounts.section199ADividends = div.section199ADividends;
    extractedAmounts.investmentExpenses = div.investmentExpenses;
    extractedAmounts.foreignTaxPaid = div.foreignTaxPaid;
    extractedAmounts.exemptInterestDividends = div.exemptInterestDividends;
    extractedAmounts.federalTaxWithheld1099 = div.federalTaxWithheld;
  }

  // 1098 Mortgage data
  if (extracted?.form1098Data) {
    const f1098 = extracted.form1098Data;
    extractedAmounts.mortgageInterest = f1098.mortgageInterest;
    extractedAmounts.outstandingPrincipal = f1098.outstandingPrincipal;
    extractedAmounts.mortgageOriginationDate = f1098.mortgageOriginationDate;
    extractedAmounts.refundOfOverpaidInterest = f1098.refundOfOverpaidInterest;
    extractedAmounts.mortgageInsurancePremiums = f1098.mortgageInsurancePremiums;
    extractedAmounts.pointsPaid = f1098.pointsPaid;
    extractedAmounts.propertyAddress = f1098.propertyAddress;
    extractedAmounts.propertyTaxes = f1098.propertyTax;
  }

  // 1098-T Tuition data
  if (extracted?.form1098tData) {
    const t = extracted.form1098tData;
    extractedAmounts.paymentsReceived = t.paymentsReceived;
    extractedAmounts.amountsBilled = t.amountsBilled;
    extractedAmounts.adjustmentsPriorYear = t.adjustmentsPriorYear;
    extractedAmounts.scholarshipsGrants = t.scholarshipsGrants;
    extractedAmounts.adjustmentsScholarships = t.adjustmentsScholarships;
    extractedAmounts.includesJanMarch = t.includesJanMarch;
    extractedAmounts.halfTimeStudent = t.halfTimeStudent;
    extractedAmounts.graduateStudent = t.graduateStudent;
  }

  // Schedule K-1 data
  if (extracted?.scheduleK1Data) {
    const k1 = extracted.scheduleK1Data;
    extractedAmounts.ordinaryBusinessIncome = k1.ordinaryBusinessIncome;
    extractedAmounts.rentalRealEstateIncome = k1.rentalRealEstateIncome;
    extractedAmounts.otherRentalIncome = k1.otherRentalIncome;
    extractedAmounts.guaranteedPayments = k1.guaranteedPayments;
    extractedAmounts.interestIncomeK1 = k1.interestIncome;
    extractedAmounts.dividendIncomeK1 = k1.ordinaryDividends;
    extractedAmounts.qualifiedDividendsK1 = k1.qualifiedDividends;
    extractedAmounts.royaltiesK1 = k1.royalties;
    extractedAmounts.shortTermCapitalGain = k1.shortTermCapitalGain;
    extractedAmounts.longTermCapitalGain = k1.longTermCapitalGain;
    extractedAmounts.unrecaptured1250GainK1 = k1.unrecaptured1250Gain;
    extractedAmounts.section1231Gain = k1.section1231Gain;
    extractedAmounts.section179Deduction = k1.section179Deduction;
    extractedAmounts.selfEmploymentEarnings = k1.selfEmploymentEarnings;
  }

  // 1095-A Health Insurance Marketplace Statement (for Form 8962 PTC calculation)
  if (extracted?.form1095AData) {
    devLog('[1095-A] Extracting form1095AData:', extracted.form1095AData);
    const f1095a: any = extracted.form1095AData;

    // Annual totals - check both direct fields and nested annualTotals
    const annualTotals = f1095a.annualTotals || {};
    extractedAmounts.annualPremiumAmount = f1095a.totalEnrollmentPremiums || annualTotals.totalEnrollmentPremiums || 0;
    extractedAmounts.annualSlcspPremium = f1095a.totalSlcsp || annualTotals.totalSlcsp || 0;
    extractedAmounts.annualAdvancePtc = f1095a.totalAdvancePremiumTaxCredit || annualTotals.totalAdvancePremiumTaxCredit || 0;

    devLog('[1095-A] Annual totals extracted:', {
      annualPremiumAmount: extractedAmounts.annualPremiumAmount,
      annualSlcspPremium: extractedAmounts.annualSlcspPremium,
      annualAdvancePtc: extractedAmounts.annualAdvancePtc,
    });



    // Monthly breakdown for more detailed Form 8962 calculation
    // Handle monthlyData array format from backend
    if (f1095a.monthlyData && Array.isArray(f1095a.monthlyData)) {
      extractedAmounts.monthlyPremiums = f1095a.monthlyData.map((m: any) => m.enrollmentPremiums || 0);
      extractedAmounts.monthlySlcsp = f1095a.monthlyData.map((m: any) => m.slcsp || 0);
      extractedAmounts.monthlyAptc = f1095a.monthlyData.map((m: any) => m.advancePremiumTaxCredit || 0);
      // Count months with actual coverage (premium > 0)
      extractedAmounts.coverageMonths = f1095a.monthlyData.filter((m: any) => (m.enrollmentPremiums || 0) > 0).length;
      devLog('[1095-A] Monthly data extracted, coverage months:', extractedAmounts.coverageMonths);
    } else {
      // Fallback to direct monthly arrays if provided
      extractedAmounts.monthlyPremiums = f1095a.monthlyPremiums;
      extractedAmounts.monthlySlcsp = f1095a.monthlySlcsp;
      extractedAmounts.monthlyAptc = f1095a.monthlyAptc;
      extractedAmounts.coverageMonths = f1095a.coverageMonths;
    }

    // Calculate coverage months from flags if not provided directly
    if (!extractedAmounts.coverageMonths && f1095a.coveredMonthFlags) {
      extractedAmounts.coverageMonths = f1095a.coveredMonthFlags.filter(Boolean).length;
    }
    // Calculate annual totals from monthly values if not provided
    if (!extractedAmounts.annualPremiumAmount && f1095a.monthlyPremiums?.length) {
      extractedAmounts.annualPremiumAmount = f1095a.monthlyPremiums.reduce((sum, v) => sum + (v || 0), 0);
    }
    if (!extractedAmounts.annualSlcspPremium && f1095a.monthlySlcsp?.length) {
      extractedAmounts.annualSlcspPremium = f1095a.monthlySlcsp.reduce((sum, v) => sum + (v || 0), 0);
    }
    if (!extractedAmounts.annualAdvancePtc && f1095a.monthlyAptc?.length) {
      extractedAmounts.annualAdvancePtc = f1095a.monthlyAptc.reduce((sum, v) => sum + (v || 0), 0);
    }
  }


  // Extract payer info
  const payerInfo: PayerInfo = {};
  if (extracted?.payerName || extracted?.payerTIN || extracted?.payerAddress) {
    payerInfo.name = extracted.payerName;
    payerInfo.ein = extracted.payerTIN;
    if (extracted.payerAddress) {
      if (typeof extracted.payerAddress === 'string') {
        payerInfo.address = extracted.payerAddress;
      } else if (typeof extracted.payerAddress === 'object') {
        payerInfo.address = extracted.payerAddress.street || extracted.payerAddress.address || '';
        payerInfo.city = extracted.payerAddress.city;
        payerInfo.state = extracted.payerAddress.state;
        payerInfo.zip = extracted.payerAddress.zipCode || extracted.payerAddress.zip;
      }
    }

    payerInfo.marketplace ={}


     const f1095a: any = extracted.form1095AData;

    if(f1095a?.marketplaceIdentifier){
      payerInfo.marketplace.marketplaceIdentifier = f1095a?.marketplaceIdentifier;
      payerInfo.marketplace.marketplaceName = f1095a?.marketplaceName;
      payerInfo.marketplace.policyNumber = f1095a?.policyNumber;
      payerInfo.marketplace.policyStartDate = f1095a?.policyStartDate;
      payerInfo.marketplace.policyEndDate = f1095a?.policyEndDate;
      
    }
   
  }

  // Parse uploadedAt timestamp
  const uploadedAtTimestamp = response.uploadedAt
    ? new Date(response.uploadedAt).getTime()
    : response.createdAt
      ? new Date(response.createdAt).getTime()
      : Date.now();

  // Determine document type from response or classification
  const docType = response.documentType || response.classification?.documentType || 'other';

  // Calculate AI confidence (convert from 0-1 to percentage if needed)
  const aiConfidence = response.ocrConfidence
    ? response.ocrConfidence <= 1
      ? Math.round(response.ocrConfidence * 100)
      : response.ocrConfidence
    : undefined;

  // Build extractedData from the raw server response
  // This preserves personal doc fields (recipientName, recipientSSN, etc.)
  // and any other raw fields the server returns
  const extractedDataOut: Record<string, any> = {};
  if (extracted) {
    // Copy top-level personal/common fields
    if (extracted.recipientName) extractedDataOut.recipientName = extracted.recipientName;
    if (extracted.recipientSSN) extractedDataOut.recipientSSN = extracted.recipientSSN;
    if (extracted.payerName) extractedDataOut.payerName = extracted.payerName;
    if (extracted.payerTIN) extractedDataOut.payerTIN = extracted.payerTIN;
    if (extracted.payerAddress) extractedDataOut.payerAddress = extracted.payerAddress;
    if (extracted.rawText) extractedDataOut.rawText = extracted.rawText;
    if (extracted.documentType) extractedDataOut.documentType = extracted.documentType;

    // Personal document fields — copy recipient address
    const ra = extracted.recipientAddress;
    if (ra) {
      if (typeof ra === 'object') {
        extractedDataOut.address = ra.street || ra.fullAddress || '';
        extractedDataOut.city = ra.city || '';
        extractedDataOut.state = ra.state || '';
        extractedDataOut.zipCode = ra.zipCode || '';
        extractedDataOut.fullAddress = ra.fullAddress || '';
      } else if (typeof ra === 'string') {
        extractedDataOut.address = ra;
      }
    }

    // W-2 employee-level fields
    const w2 = extracted.w2Data;
    if (w2) {
      if (w2.employeeSSN) extractedDataOut.employeeSSN = w2.employeeSSN;
      if (w2.employerEIN) extractedDataOut.employerEIN = w2.employerEIN;
      if (w2.stateId) extractedDataOut.employerStateId = w2.stateId;
      if (w2.localityName) extractedDataOut.localityName = w2.localityName;
    }

    // 1099 form data passthrough
    if (extracted.form1099Data) extractedDataOut.form1099Data = extracted.form1099Data;

    // Pass through any additional fields not explicitly mapped
    // (catches personal doc fields like firstName, lastName, ssn, idNumber, etc.)
    const knownKeys = new Set([
      'taxYear', 'payerTIN', 'payerName', 'payerAddress',
      'recipientSSN', 'recipientName', 'recipientAddress',
      'documentType', 'rawText',
      'w2Data', 'form1099Data', 'form1099necData', 'form1099miscData',
      'form1099intData', 'form1099divData', 'form1098Data', 'form1098tData',
      'scheduleK1Data', 'form1095aData', 'form1095AData',
    ]);
    for (const key of Object.keys(extracted)) {
      if (!knownKeys.has(key) && (extracted as any)[key] !== undefined && (extracted as any)[key] !== null) {
        extractedDataOut[key] = (extracted as any)[key];
      }
    }
  }

  return {
    id: response.id,
    clientNotaryId: response.taxPortalId || response.clientNotaryId || '',
    documentType: docType as any,
    drakeFormType: typeMap[docType.toLowerCase()] || 'other',
    fileUrl: response.fileUrl || response.filePath || '',
    originalFileName: response.originalName || response.fileName || '',
    fileSize: response.fileSize,
    mimeType: response.mimeType,
    uploadedAt: uploadedAtTimestamp,
    uploadStatus: statusMap[response.status] || statusMap[response.processingStage || ''] || 'pending',
    aiConfidence,
    aiAnalyzedAt: response.updatedAt ? new Date(response.updatedAt).getTime() : undefined,
    extractedData: Object.keys(extractedDataOut).length > 0 ? extractedDataOut : undefined,
    extractedAmounts: Object.keys(extractedAmounts).length > 0 ? extractedAmounts : undefined,
    payerInfo: Object.keys(payerInfo).length > 0 ? {
      ...payerInfo,
      address: payerInfo.address && typeof payerInfo.address === 'object'
        ? (payerInfo.address as any).street || (payerInfo.address as any).address || ''
        : payerInfo.address
    } : undefined,
    taxYear: response.taxYear || extracted?.taxYear,
    verified: response.verified || response.validationStatus === 'valid',
    verifiedBy: response.verifiedBy,
    verifiedAt: response.verifiedAt,
    notes: response.notes,
    errorMessage: response.errorMessage ||
      (response.validationErrors?.length
        ? response.validationErrors.map(e => e.message).join('; ')
        : undefined)
  };
}





