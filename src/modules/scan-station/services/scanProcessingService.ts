/**
 * Scan Processing Service
 * Handles AI document classification, field extraction, duplicate detection,
 * client matching, and batch processing for scanned tax documents.
 */

import { fetchGraphQLSS, devLog } from '../../../services/utils';
import { authStore } from '../../../stores/authStore';
import { getClientTaxDocuments } from '../../drake-export/services/taxDocumentApi';
import { getTaxPortals } from '../../drake-export/services/taxPortalApi';
import type { DrakeTaxDocumentType, ExtractedTaxAmounts, PayerInfo, TaxPortal, DrakeTaxDocument } from '../../drake-export/types/drakeTypes';
import type {
  DocumentClassification,
  ScanResult,
  FieldExtraction,
  DuplicateCheckResult,
  ClientMatchSuggestion,
  ScanBatchItem,
} from '../types/scanTypes';

// ============================================
// AI Document Classification
// ============================================

/**
 * Classify a scanned document image using server-side AI
 * Determines the document type (W-2, 1099-NEC, etc.) from the image
 */
export async function classifyDocument(
  fileBuffer: number[],
  fileName: string,
  mimeType: string
): Promise<DocumentClassification> {
  try {
    devLog('[ScanProcessing] Classifying document:', fileName);

    // TODO: Create server query "classifyTaxDocument"
    const result = await fetchGraphQLSS({
      query: 'classifyTaxDocument',
      params: {
        businessId: authStore.getBusinessId(),
      },
      form: {
        fileBuffer,
        fileName,
        mimeType,
      },
    });

    if (result?.classification) {
      devLog('[ScanProcessing] Classification result:', result.classification);
      return {
        documentType: normalizeDocumentType(result.classification.documentType),
        confidence: result.classification.confidence ?? 0.5,
        alternatives: (result.classification.alternatives || []).map((alt: any) => ({
          documentType: normalizeDocumentType(alt.documentType),
          confidence: alt.confidence ?? 0,
        })),
        rawResponse: result.classification.rawResponse,
      };
    }

    // Fallback: try to guess from file name
    return classifyFromFileName(fileName);
  } catch (error) {
    devLog('[ScanProcessing] Classification error:', error);
    return classifyFromFileName(fileName);
  }
}

/**
 * Fallback classification based on file name patterns
 */
function classifyFromFileName(fileName: string): DocumentClassification {
  const lower = fileName.toLowerCase();
  const patterns: Array<{ pattern: RegExp; type: DrakeTaxDocumentType }> = [
    { pattern: /w[-_]?2/i, type: 'w2' },
    { pattern: /1099[-_]?nec/i, type: '1099_nec' },
    { pattern: /1099[-_]?misc/i, type: '1099_misc' },
    { pattern: /1099[-_]?int/i, type: '1099_int' },
    { pattern: /1099[-_]?div/i, type: '1099_div' },
    { pattern: /1099[-_]?r/i, type: '1099_r' },
    { pattern: /1099[-_]?g/i, type: '1099_g' },
    { pattern: /1099[-_]?k/i, type: '1099_k' },
    { pattern: /1098[-_]?t/i, type: '1098_t' },
    { pattern: /1098/i, type: '1098' },
    { pattern: /1095[-_]?a/i, type: '1095_a' },
    { pattern: /k[-_]?1|schedule[-_]?k/i, type: 'schedule_k1' },
    { pattern: /receipt|expense/i, type: 'receipt' },
  ];

  for (const { pattern, type } of patterns) {
    if (pattern.test(lower)) {
      return {
        documentType: type,
        confidence: 0.4,
        alternatives: [],
      };
    }
  }

  return {
    documentType: 'other',
    confidence: 0.1,
    alternatives: [],
  };
}

/**
 * Normalize document type strings to DrakeTaxDocumentType
 */
function normalizeDocumentType(type: string): DrakeTaxDocumentType {
  const mapping: Record<string, DrakeTaxDocumentType> = {
    'w-2': 'w2',
    'w2': 'w2',
    'form_w2': 'w2',
    '1099-nec': '1099_nec',
    '1099_nec': '1099_nec',
    '1099-misc': '1099_misc',
    '1099_misc': '1099_misc',
    '1099-int': '1099_int',
    '1099_int': '1099_int',
    '1099-div': '1099_div',
    '1099_div': '1099_div',
    '1099-r': '1099_r',
    '1099_r': '1099_r',
    '1099-g': '1099_g',
    '1099_g': '1099_g',
    '1099-k': '1099_k',
    '1099_k': '1099_k',
    '1098': '1098',
    'form_1098': '1098',
    '1098-t': '1098_t',
    '1098_t': '1098_t',
    '1095-a': '1095_a',
    '1095_a': '1095_a',
    'schedule_k1': 'schedule_k1',
    'k-1': 'schedule_k1',
    'k1': 'schedule_k1',
    'receipt': 'receipt',
  };

  return mapping[type.toLowerCase()] || 'other';
}

// ============================================
// Field Extraction
// ============================================

/**
 * Extract fields and amounts from a scanned document using server-side AI
 */
export async function extractDocumentFields(
  fileBuffer: number[],
  fileName: string,
  mimeType: string,
  documentType: DrakeTaxDocumentType
): Promise<{
  extractedAmounts: ExtractedTaxAmounts;
  payerInfo: PayerInfo;
  fields: FieldExtraction[];
  recipientName?: string;
  recipientSSN?: string;
  taxYear?: number;
}> {
  try {
    devLog('[ScanProcessing] Extracting fields from:', fileName, 'type:', documentType);

    // TODO: Create server query "extractTaxDocumentFields"
    const result = await fetchGraphQLSS({
      query: 'extractTaxDocumentFields',
      params: {
        businessId: authStore.getBusinessId(),
      },
      form: {
        fileBuffer,
        fileName,
        mimeType,
        documentType,
      },
    });

    if (result?.extracted) {
      const extracted = result.extracted;

      // Build field extractions with confidence
      const fields: FieldExtraction[] = buildFieldExtractions(
        extracted.amounts || {},
        extracted.payerInfo || {},
        documentType,
        extracted.fieldConfidences || {}
      );

      return {
        extractedAmounts: extracted.amounts || {},
        payerInfo: extracted.payerInfo || {},
        fields,
        recipientName: extracted.recipientName,
        recipientSSN: extracted.recipientSSN,
        taxYear: extracted.taxYear,
      };
    }

    return {
      extractedAmounts: {},
      payerInfo: {},
      fields: [],
    };
  } catch (error) {
    devLog('[ScanProcessing] Field extraction error:', error);
    return {
      extractedAmounts: {},
      payerInfo: {},
      fields: [],
    };
  }
}

/**
 * Build FieldExtraction objects with labels and confidence values
 */
function buildFieldExtractions(
  amounts: Record<string, any>,
  payerInfo: Record<string, any>,
  documentType: DrakeTaxDocumentType,
  confidences: Record<string, number>
): FieldExtraction[] {
  const fields: FieldExtraction[] = [];

  // Define field labels by document type
  const fieldLabels: Record<string, string> = {
    // W-2
    wages: 'Box 1 - Wages, Tips, Compensation',
    federalTaxWithheld: 'Box 2 - Federal Tax Withheld',
    socialSecurityWages: 'Box 3 - Social Security Wages',
    socialSecurityTax: 'Box 4 - Social Security Tax',
    medicareWages: 'Box 5 - Medicare Wages',
    medicareTax: 'Box 6 - Medicare Tax',
    stateTaxWithheld: 'Box 17 - State Tax Withheld',
    stateWages: 'Box 16 - State Wages',
    localTaxWithheld: 'Box 19 - Local Tax Withheld',
    localWages: 'Box 18 - Local Wages',
    // 1099-NEC
    nonEmployeeCompensation: 'Box 1 - Non-Employee Compensation',
    federalTaxWithheld1099: 'Box 4 - Federal Tax Withheld',
    // 1099-INT
    interestIncome: 'Box 1 - Interest Income',
    earlyWithdrawalPenalty: 'Box 2 - Early Withdrawal Penalty',
    taxExemptInterest: 'Box 8 - Tax-Exempt Interest',
    // 1099-DIV
    ordinaryDividends: 'Box 1a - Ordinary Dividends',
    qualifiedDividends: 'Box 1b - Qualified Dividends',
    capitalGainDistributions: 'Box 2a - Capital Gain Distributions',
    // 1098
    mortgageInterest: 'Box 1 - Mortgage Interest',
    outstandingPrincipal: 'Box 2 - Outstanding Principal',
    propertyTaxes: 'Property Taxes',
    pointsPaid: 'Box 6 - Points Paid',
    // 1098-T
    paymentsReceived: 'Box 1 - Payments Received',
    scholarshipsGrants: 'Box 5 - Scholarships/Grants',
    // 1099-MISC
    rents: 'Box 1 - Rents',
    royalties: 'Box 2 - Royalties',
    otherIncome: 'Box 3 - Other Income',
    // Generic
    totalAmount: 'Total Amount',
    // Payer info
    'payer.name': 'Employer/Payer Name',
    'payer.ein': 'Employer/Payer EIN',
    'payer.address': 'Employer/Payer Address',
  };

  // Add amount fields
  for (const [key, value] of Object.entries(amounts)) {
    if (value !== undefined && value !== null && value !== 0) {
      fields.push({
        fieldName: key,
        label: fieldLabels[key] || key.replace(/([A-Z])/g, ' $1').trim(),
        value: typeof value === 'number' ? value : String(value),
        confidence: confidences[key] ?? 0.8,
        verified: false,
        corrected: false,
      });
    }
  }

  // Add payer info fields
  for (const [key, value] of Object.entries(payerInfo)) {
    if (value && typeof value === 'string') {
      const fieldKey = `payer.${key}`;
      fields.push({
        fieldName: fieldKey,
        label: fieldLabels[fieldKey] || `Payer ${key}`,
        value,
        confidence: confidences[fieldKey] ?? 0.7,
        verified: false,
        corrected: false,
      });
    }
  }

  return fields;
}

// ============================================
// Duplicate Detection
// ============================================

/**
 * Check if a document is a duplicate of an existing client document
 */
export async function checkForDuplicate(
  clientId: string,
  documentType: DrakeTaxDocumentType,
  extractedAmounts: ExtractedTaxAmounts,
  payerInfo: PayerInfo,
  taxYear?: number
): Promise<DuplicateCheckResult> {
  try {
    devLog('[ScanProcessing] Checking for duplicates, client:', clientId, 'type:', documentType);

    // Fetch existing documents for this client
    const existingDocs = await getClientTaxDocuments(clientId, taxYear);

    // Filter to same document type
    const sameTypeDocs = existingDocs.filter(
      (doc) => doc.drakeFormType === documentType
    );

    if (sameTypeDocs.length === 0) {
      return { isDuplicate: false, similarity: 0 };
    }

    // Check for duplicate by comparing key amounts and payer info
    for (const existingDoc of sameTypeDocs) {
      const similarity = calculateDocumentSimilarity(
        extractedAmounts,
        existingDoc.extractedAmounts || {},
        payerInfo,
        existingDoc.payerInfo || {}
      );

      if (similarity > 0.85) {
        devLog('[ScanProcessing] Duplicate detected! Similarity:', similarity);
        return {
          isDuplicate: true,
          existingDocumentId: existingDoc.id,
          existingDocumentType: existingDoc.drakeFormType,
          similarity,
          reason: `This appears to be a duplicate of an existing ${documentType} document from ${payerInfo.name || 'the same payer'}.`,
        };
      }
    }

    return { isDuplicate: false, similarity: 0 };
  } catch (error) {
    devLog('[ScanProcessing] Duplicate check error:', error);
    return { isDuplicate: false, similarity: 0 };
  }
}

/**
 * Calculate similarity between two documents based on amounts and payer info
 */
function calculateDocumentSimilarity(
  amounts1: ExtractedTaxAmounts,
  amounts2: ExtractedTaxAmounts,
  payer1: PayerInfo,
  payer2: PayerInfo
): number {
  let matchCount = 0;
  let totalFields = 0;

  // Compare key numeric amounts
  const amountKeys: Array<keyof ExtractedTaxAmounts> = [
    'wages', 'federalTaxWithheld', 'nonEmployeeCompensation',
    'interestIncome', 'ordinaryDividends', 'mortgageInterest',
    'rents', 'totalAmount',
  ];

  for (const key of amountKeys) {
    const val1 = amounts1[key];
    const val2 = amounts2[key];
    if (val1 !== undefined && val2 !== undefined) {
      totalFields++;
      if (typeof val1 === 'number' && typeof val2 === 'number') {
        // Allow small rounding differences
        if (Math.abs(val1 - val2) < 1) {
          matchCount++;
        }
      } else if (val1 === val2) {
        matchCount++;
      }
    }
  }

  // Compare payer EIN (strong indicator)
  if (payer1.ein && payer2.ein) {
    totalFields += 2; // Weight EIN match higher
    if (payer1.ein.replace(/\D/g, '') === payer2.ein.replace(/\D/g, '')) {
      matchCount += 2;
    }
  }

  // Compare payer name
  if (payer1.name && payer2.name) {
    totalFields++;
    if (payer1.name.toLowerCase().trim() === payer2.name.toLowerCase().trim()) {
      matchCount++;
    }
  }

  if (totalFields === 0) return 0;
  return matchCount / totalFields;
}

// ============================================
// Cross-Reference with Previous Year
// ============================================

/**
 * Cross-reference a scanned document with the client's previous year documents
 * Returns suggestions for expected documents based on prior year
 */
export async function crossReferencePreviousYear(
  clientId: string,
  currentTaxYear: number
): Promise<Array<{
  documentType: DrakeTaxDocumentType;
  payerName: string;
  previousAmount: number;
  found: boolean;
}>> {
  try {
    const previousYear = currentTaxYear - 1;
    const previousDocs = await getClientTaxDocuments(clientId, previousYear);

    const crossRef: Array<{
      documentType: DrakeTaxDocumentType;
      payerName: string;
      previousAmount: number;
      found: boolean;
    }> = [];

    // Get current year documents to check what we already have
    const currentDocs = await getClientTaxDocuments(clientId, currentTaxYear);
    const currentPayerEINs = new Set(
      currentDocs
        .filter((d) => d.payerInfo?.ein)
        .map((d) => d.payerInfo!.ein!.replace(/\D/g, ''))
    );

    for (const doc of previousDocs) {
      if (!doc.drakeFormType || doc.drakeFormType === 'other') continue;

      const payerEIN = doc.payerInfo?.ein?.replace(/\D/g, '') || '';
      const found = payerEIN ? currentPayerEINs.has(payerEIN) : false;

      // Calculate the primary amount for the document
      let amount = 0;
      if (doc.extractedAmounts) {
        amount =
          doc.extractedAmounts.wages ||
          doc.extractedAmounts.nonEmployeeCompensation ||
          doc.extractedAmounts.interestIncome ||
          doc.extractedAmounts.ordinaryDividends ||
          doc.extractedAmounts.mortgageInterest ||
          doc.extractedAmounts.totalAmount ||
          0;
      }

      crossRef.push({
        documentType: doc.drakeFormType,
        payerName: doc.payerInfo?.name || 'Unknown',
        previousAmount: amount,
        found,
      });
    }

    return crossRef;
  } catch (error) {
    devLog('[ScanProcessing] Cross-reference error:', error);
    return [];
  }
}

// ============================================
// Client Matching
// ============================================

/**
 * Match an unmatched document to clients by comparing extracted name/SSN
 */
export async function matchDocumentToClients(
  recipientName?: string,
  recipientSSN?: string
): Promise<ClientMatchSuggestion[]> {
  try {
    if (!recipientName && !recipientSSN) {
      return [];
    }

    devLog('[ScanProcessing] Matching document to clients. Name:', recipientName, 'SSN:', recipientSSN ? '***' : 'N/A');

    // Fetch all tax portal clients
    const clients = await getTaxPortals();

    if (!clients || clients.length === 0) {
      return [];
    }

    const suggestions: ClientMatchSuggestion[] = [];

    for (const client of clients) {
      let confidence = 0;
      const matchedFields: ClientMatchSuggestion['matchedFields'] = [];
      const reasons: string[] = [];

      // Match by SSN (strongest match)
      if (recipientSSN && client.ssn) {
        const cleanExtracted = recipientSSN.replace(/\D/g, '');
        const cleanClient = client.ssn.replace(/\D/g, '');
        if (cleanExtracted.length >= 4 && cleanClient.length >= 4) {
          if (cleanExtracted === cleanClient) {
            confidence += 0.7;
            reasons.push('Full SSN match');
            matchedFields.push({
              field: 'SSN',
              documentValue: `***-**-${cleanExtracted.slice(-4)}`,
              clientValue: `***-**-${cleanClient.slice(-4)}`,
            });
          } else if (cleanExtracted.slice(-4) === cleanClient.slice(-4)) {
            confidence += 0.3;
            reasons.push('Last 4 SSN digits match');
            matchedFields.push({
              field: 'SSN (last 4)',
              documentValue: cleanExtracted.slice(-4),
              clientValue: cleanClient.slice(-4),
            });
          }
        }
      }

      // Match by name
      if (recipientName && client.firstName && client.lastName) {
        const docName = recipientName.toLowerCase().trim();
        const clientFullName = `${client.firstName} ${client.lastName}`.toLowerCase().trim();
        const clientLastFirst = `${client.lastName} ${client.firstName}`.toLowerCase().trim();

        if (docName === clientFullName || docName === clientLastFirst) {
          confidence += 0.5;
          reasons.push('Full name match');
          matchedFields.push({
            field: 'Name',
            documentValue: recipientName,
            clientValue: `${client.firstName} ${client.lastName}`,
          });
        } else if (
          docName.includes(client.lastName.toLowerCase()) &&
          docName.includes(client.firstName.toLowerCase())
        ) {
          confidence += 0.35;
          reasons.push('Name parts match');
          matchedFields.push({
            field: 'Name',
            documentValue: recipientName,
            clientValue: `${client.firstName} ${client.lastName}`,
          });
        } else if (docName.includes(client.lastName.toLowerCase())) {
          confidence += 0.15;
          reasons.push('Last name match');
          matchedFields.push({
            field: 'Last Name',
            documentValue: recipientName,
            clientValue: client.lastName,
          });
        }
      }

      if (confidence > 0.1) {
        suggestions.push({
          client,
          confidence: Math.min(confidence, 1.0),
          matchReason: reasons.join(', '),
          matchedFields,
        });
      }
    }

    // Sort by confidence descending
    suggestions.sort((a, b) => b.confidence - a.confidence);

    devLog('[ScanProcessing] Found', suggestions.length, 'client match suggestions');
    return suggestions.slice(0, 10); // Limit to top 10
  } catch (error) {
    devLog('[ScanProcessing] Client matching error:', error);
    return [];
  }
}

// ============================================
// Batch Processing
// ============================================

/**
 * Process a single scanned document through the full pipeline:
 * classify -> extract -> check duplicates
 */
export async function processScannedDocument(
  file: File,
  clientId?: string,
  taxYear?: number,
  onProgress?: (status: string, progress: number) => void
): Promise<ScanResult> {
  const id = `scan_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const previewUrl = await fileToDataUrl(file);

  // Step 1: Convert file to buffer
  onProgress?.('uploading', 10);
  const arrayBuffer = await file.arrayBuffer();
  const fileBuffer = Array.from(new Uint8Array(arrayBuffer));

  // Step 2: Classify document
  onProgress?.('classifying', 30);
  const classification = await classifyDocument(fileBuffer, file.name, file.type);

  // Step 3: Extract fields
  onProgress?.('extracting', 50);
  const extraction = await extractDocumentFields(
    fileBuffer,
    file.name,
    file.type,
    classification.documentType
  );

  // Step 4: Check for duplicates (if client is selected)
  onProgress?.('checking_duplicates', 80);
  if (clientId && classification.documentType !== 'other') {
    await checkForDuplicate(
      clientId,
      classification.documentType,
      extraction.extractedAmounts,
      extraction.payerInfo,
      taxYear
    );
  }

  onProgress?.('complete', 100);

  return {
    id,
    fileName: file.name,
    file,
    previewUrl,
    mimeType: file.type,
    fileSize: file.size,
    scannedAt: Date.now(),
    classification,
    extractedAmounts: extraction.extractedAmounts,
    payerInfo: extraction.payerInfo,
    fields: extraction.fields,
    detectedTaxYear: extraction.taxYear,
    detectedRecipientName: extraction.recipientName,
    detectedRecipientSSN: extraction.recipientSSN,
  };
}

/**
 * Process a batch of scanned documents
 */
export async function processBatch(
  files: File[],
  clientId?: string,
  taxYear?: number,
  onItemProgress?: (index: number, status: string, progress: number) => void
): Promise<ScanResult[]> {
  devLog('[ScanProcessing] Processing batch of', files.length, 'documents');

  const results: ScanResult[] = [];

  for (let i = 0; i < files.length; i++) {
    try {
      const result = await processScannedDocument(
        files[i],
        clientId,
        taxYear,
        (status, progress) => onItemProgress?.(i, status, progress)
      );
      results.push(result);
    } catch (error) {
      devLog('[ScanProcessing] Error processing file', files[i].name, ':', error);
      // Create an error result so the batch continues
      const previewUrl = await fileToDataUrl(files[i]);
      results.push({
        id: `scan_err_${Date.now()}_${i}`,
        fileName: files[i].name,
        file: files[i],
        previewUrl,
        mimeType: files[i].type,
        fileSize: files[i].size,
        scannedAt: Date.now(),
      });
    }
  }

  return results;
}

// ============================================
// Utility Functions
// ============================================

/**
 * Convert a File to a data URL string for preview
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Convert a File to a Uint8Array buffer
 */
export async function fileToBuffer(file: File): Promise<number[]> {
  const arrayBuffer = await file.arrayBuffer();
  return Array.from(new Uint8Array(arrayBuffer));
}

// Export singleton-style service
export const scanProcessingService = {
  classifyDocument,
  extractDocumentFields,
  checkForDuplicate,
  crossReferencePreviousYear,
  matchDocumentToClients,
  processScannedDocument,
  processBatch,
  fileToDataUrl,
  fileToBuffer,
};
