/**
 * Recurring Client Service
 * Detects returning clients, loads previous year data, tracks expected documents,
 * and identifies year-over-year changes for tax preparation optimization.
 */

import { devLog, fetchGraphQLSS } from '../../../services/utils';
import { authStore } from '../../../stores/authStore';
import type {
  TaxPortal,
  DrakeTaxDocument,
  DrakeTaxDocumentType,
  ExtractedTaxAmounts,
  FilingStatus,
} from '../types/drakeTypes';
import { DRAKE_FORM_LABELS } from '../types/drakeTypes';

// ============================================
// Types
// ============================================

/** Summary of a client's previous year tax data */
export interface PreviousYearData {
  taxYear: number;
  clientId: string;
  client: TaxPortal | null;
  documents: DrakeTaxDocument[];
  totalIncome: number;
  totalWithholding: number;
  filingStatus: FilingStatus | undefined;
  dependentCount: number;
  dependentNames: string[];
  employers: string[];
  documentTypes: DrakeTaxDocumentType[];
  federalRefund?: number;
  federalOwe?: number;
}

/** A single change detected between years */
export interface YearOverYearChange {
  category: 'employer' | 'income' | 'dependents' | 'filing_status' | 'documents' | 'address' | 'spouse';
  label: string;
  description: string;
  severity: 'info' | 'warning' | 'positive' | 'negative';
  previousValue?: string;
  currentValue?: string;
}

/** Expected document with tracking status */
export interface ExpectedDocument {
  type: DrakeTaxDocumentType;
  label: string;
  expectedFromLastYear: boolean;
  received: boolean;
  receivedDocumentId?: string;
  payerName?: string;
  previousYearAmount?: number;
  currentYearAmount?: number;
  markedNotExpected?: boolean;
  markedNotExpectedAt?: number;
  markedNotExpectedBy?: string;
}

/** Document completeness result */
export interface DocumentCompleteness {
  expectedCount: number;
  receivedCount: number;
  pendingCount: number;
  unexpectedCount: number;
  completenessPercent: number;
  expectedDocuments: ExpectedDocument[];
  missingRequired: ExpectedDocument[];
}

/** Returning client detection result */
export interface ReturningClientResult {
  isReturning: boolean;
  previousClientId?: string;
  previousTaxYear?: number;
  matchType?: 'ssn' | 'name';
  confidence: number;
}

// ============================================
// Document type classification helpers
// ============================================

/** Document types that represent uploadable tax forms (not verification forms) */
const UPLOADABLE_DOC_TYPES: DrakeTaxDocumentType[] = [
  'w2', '1099_nec', '1099_misc', '1099_int', '1099_div',
  '1099_r', '1099_g', '1099_k', '1098', '1098_t',
  '1095_a', 'schedule_k1',
];

/**
 * Extract the primary income amount from a document's extracted amounts
 */
function getPrimaryAmount(type: DrakeTaxDocumentType, amounts?: ExtractedTaxAmounts): number {
  if (!amounts) return 0;
  switch (type) {
    case 'w2': return amounts.wages || 0;
    case '1099_nec': return amounts.nonEmployeeCompensation || 0;
    case '1099_misc': return (amounts.rents || 0) + (amounts.royalties || 0) + (amounts.otherIncome || 0);
    case '1099_int': return amounts.interestIncome || 0;
    case '1099_div': return amounts.ordinaryDividends || 0;
    case '1099_r': return amounts.totalAmount || 0;
    case '1099_g': return amounts.unemploymentCompensation || 0;
    case '1099_k': return amounts.grossAmount1099K || 0;
    case '1098': return amounts.mortgageInterest || 0;
    case '1098_t': return amounts.paymentsReceived || amounts.amountsBilled || 0;
    case '1095_a': return amounts.annualPremiumAmount || 0;
    case 'schedule_k1': return amounts.ordinaryBusinessIncome || 0;
    default: return amounts.totalAmount || 0;
  }
}

/**
 * Extract the payer/employer name from a document
 */
function getPayerName(doc: DrakeTaxDocument): string {
  return doc.payerInfo?.name || 'Unknown';
}

/**
 * Calculate total income from a set of documents
 */
function calculateTotalIncome(documents: DrakeTaxDocument[]): number {
  let total = 0;
  for (const doc of documents) {
    if (!doc.verified || !doc.extractedAmounts) continue;
    const amounts = doc.extractedAmounts;
    total += amounts.wages || 0;
    total += amounts.nonEmployeeCompensation || 0;
    total += amounts.interestIncome || 0;
    total += amounts.ordinaryDividends || 0;
    total += amounts.rents || 0;
    total += amounts.royalties || 0;
    total += amounts.otherIncome || 0;
    total += amounts.unemploymentCompensation || 0;
    total += amounts.grossAmount1099K || 0;
    total += amounts.ordinaryBusinessIncome || 0;
  }
  return total;
}

/**
 * Calculate total federal withholding from documents
 */
function calculateTotalWithholding(documents: DrakeTaxDocument[]): number {
  let total = 0;
  for (const doc of documents) {
    if (!doc.verified || !doc.extractedAmounts) continue;
    const amounts = doc.extractedAmounts;
    total += amounts.federalTaxWithheld || 0;
    total += amounts.federalTaxWithheld1099 || 0;
    total += amounts.federalTaxWithheld1099G || 0;
    total += amounts.federalTaxWithheld1099K || 0;
  }
  return total;
}

// ============================================
// Core Service Functions
// ============================================

/**
 * Detect if a client is a returning client who filed with us in a previous year.
 * Searches by SSN first (exact match), then falls back to name matching.
 */
export async function detectReturningClient(client: TaxPortal): Promise<ReturningClientResult> {
  try {
    const currentTaxYear = client.taxYear || new Date().getFullYear();
    const previousTaxYear = currentTaxYear - 1;

    devLog('[RecurringClient] Detecting returning client:', client.firstName, client.lastName, 'for year', currentTaxYear);

    // TODO: Implement server-side query to search previous year clients by SSN or name
    const body = {
      query: 'detectReturningClient',
      params: {
        businessId: authStore.getBusinessId(),
        ssn: client.ssn || undefined,
        firstName: client.firstName,
        lastName: client.lastName,
        previousTaxYear,
      },
    };

    const response = await fetchGraphQLSS(body);
    const match = response?.data;

    if (match?.clientId) {
      devLog('[RecurringClient] Returning client detected:', match.clientId, 'match type:', match.matchType);
      return {
        isReturning: true,
        previousClientId: match.clientId,
        previousTaxYear: match.taxYear || previousTaxYear,
        matchType: match.matchType || (client.ssn ? 'ssn' : 'name'),
        confidence: match.matchType === 'ssn' ? 1.0 : 0.85,
      };
    }

    devLog('[RecurringClient] No previous year record found');
    return {
      isReturning: false,
      confidence: 0,
    };
  } catch (error) {
    devLog('[RecurringClient] Error detecting returning client:', error);
    return {
      isReturning: false,
      confidence: 0,
    };
  }
}

/**
 * Load a client's previous year documents and tax data.
 * Returns a summary object with documents, income totals, and filing details.
 */
export async function getPreviousYearData(
  clientId: string,
  taxYear: number
): Promise<PreviousYearData | null> {
  try {
    const previousTaxYear = taxYear - 1;

    devLog('[RecurringClient] Loading previous year data for client:', clientId, 'year:', previousTaxYear);

    // TODO: Implement server-side query to fetch previous year client data and documents
    const body = {
      query: 'getPreviousYearClientData',
      params: {
        businessId: authStore.getBusinessId(),
        clientId,
        taxYear: previousTaxYear,
      },
    };

    const response = await fetchGraphQLSS(body);
    const data = response?.data;

    if (!data) {
      devLog('[RecurringClient] No previous year data found');
      return null;
    }

    const previousClient: TaxPortal | null = data.client || null;
    const previousDocuments: DrakeTaxDocument[] = data.documents || [];

    // Extract employer names from W-2 documents
    const employers = previousDocuments
      .filter((doc) => doc.drakeFormType === 'w2' && doc.payerInfo?.name)
      .map((doc) => doc.payerInfo!.name!);

    // Extract unique document types
    const documentTypes = [
      ...new Set(
        previousDocuments
          .filter((doc) => doc.drakeFormType && UPLOADABLE_DOC_TYPES.includes(doc.drakeFormType))
          .map((doc) => doc.drakeFormType!)
      ),
    ];

    // Extract dependent names
    const dependentNames = (previousClient?.dependents || []).map(
      (dep) => `${dep.firstName} ${dep.lastName}`
    );

    const result: PreviousYearData = {
      taxYear: previousTaxYear,
      clientId,
      client: previousClient,
      documents: previousDocuments,
      totalIncome: calculateTotalIncome(previousDocuments),
      totalWithholding: calculateTotalWithholding(previousDocuments),
      filingStatus: previousClient?.filingStatus,
      dependentCount: previousClient?.dependents?.length || 0,
      dependentNames,
      employers,
      documentTypes,
      federalRefund: previousClient?.federalRefund,
      federalOwe: previousClient?.federalOwe,
    };

    devLog('[RecurringClient] Previous year data loaded:', {
      taxYear: result.taxYear,
      docCount: result.documents.length,
      income: result.totalIncome,
      employers: result.employers,
      documentTypes: result.documentTypes,
    });

    return result;
  } catch (error) {
    devLog('[RecurringClient] Error loading previous year data:', error);
    return null;
  }
}

/**
 * Based on previous year documents, determine what documents to expect this year.
 * If the client had a W-2 from employer X last year, we expect a W-2 from employer X this year.
 */
export async function getExpectedDocuments(clientId: string, taxYear?: number): Promise<ExpectedDocument[]> {
  try {
    const currentTaxYear = taxYear || new Date().getFullYear();

    devLog('[RecurringClient] Getting expected documents for client:', clientId);

    // TODO: Implement server-side query to get expected documents based on prior year
    const body = {
      query: 'getExpectedDocuments',
      params: {
        businessId: authStore.getBusinessId(),
        clientId,
        currentTaxYear,
        previousTaxYear: currentTaxYear - 1,
      },
    };

    const response = await fetchGraphQLSS(body);

    // If server returns pre-computed expected documents, use them
    if (response?.data?.expectedDocuments) {
      return response.data.expectedDocuments;
    }

    // Otherwise, build from previous year data
    const previousData = await getPreviousYearData(clientId, currentTaxYear);
    if (!previousData || previousData.documents.length === 0) {
      devLog('[RecurringClient] No previous year documents to derive expectations');
      return [];
    }

    const expectedDocs: ExpectedDocument[] = [];

    for (const doc of previousData.documents) {
      if (!doc.drakeFormType || !UPLOADABLE_DOC_TYPES.includes(doc.drakeFormType)) {
        continue;
      }

      expectedDocs.push({
        type: doc.drakeFormType,
        label: DRAKE_FORM_LABELS[doc.drakeFormType] || doc.drakeFormType,
        expectedFromLastYear: true,
        received: false,
        payerName: getPayerName(doc),
        previousYearAmount: getPrimaryAmount(doc.drakeFormType, doc.extractedAmounts),
      });
    }

    devLog('[RecurringClient] Expected documents:', expectedDocs.length);
    return expectedDocs;
  } catch (error) {
    devLog('[RecurringClient] Error getting expected documents:', error);
    return [];
  }
}

/**
 * Compare current client data vs last year and return a list of detected changes.
 * Covers employer, income, dependents, filing status, and address changes.
 */
export function getChangesFromLastYear(
  currentClient: TaxPortal,
  previousData: PreviousYearData
): YearOverYearChange[] {
  const changes: YearOverYearChange[] = [];
  const prevClient = previousData.client;

  if (!prevClient) {
    changes.push({
      category: 'documents',
      label: 'Previous Year Data',
      description: 'Previous year client record not available for detailed comparison',
      severity: 'info',
    });
    return changes;
  }

  // --- Filing Status ---
  if (currentClient.filingStatus && prevClient.filingStatus) {
    if (currentClient.filingStatus === prevClient.filingStatus) {
      changes.push({
        category: 'filing_status',
        label: 'Filing Status',
        description: 'Filing status unchanged',
        severity: 'info',
        previousValue: prevClient.filingStatus,
        currentValue: currentClient.filingStatus,
      });
    } else {
      changes.push({
        category: 'filing_status',
        label: 'Filing Status Changed',
        description: `Changed from "${prevClient.filingStatus}" to "${currentClient.filingStatus}"`,
        severity: 'warning',
        previousValue: prevClient.filingStatus,
        currentValue: currentClient.filingStatus,
      });
    }
  }

  // --- Dependents ---
  const prevDepCount = prevClient.dependents?.length || 0;
  const currDepCount = currentClient.dependents?.length || 0;

  if (currDepCount === prevDepCount) {
    changes.push({
      category: 'dependents',
      label: 'Dependents',
      description: prevDepCount === 0
        ? 'No dependents (same as last year)'
        : `Same number of dependents (${prevDepCount})`,
      severity: 'info',
    });
  } else if (currDepCount > prevDepCount) {
    const diff = currDepCount - prevDepCount;
    changes.push({
      category: 'dependents',
      label: 'New Dependent(s)',
      description: `${diff} new dependent(s) added (${prevDepCount} last year, ${currDepCount} this year)`,
      severity: 'warning',
      previousValue: String(prevDepCount),
      currentValue: String(currDepCount),
    });
  } else {
    const diff = prevDepCount - currDepCount;
    changes.push({
      category: 'dependents',
      label: 'Fewer Dependents',
      description: `${diff} fewer dependent(s) this year (${prevDepCount} last year, ${currDepCount} this year)`,
      severity: 'warning',
      previousValue: String(prevDepCount),
      currentValue: String(currDepCount),
    });
  }

  // --- Address ---
  const prevAddress = [prevClient.address, prevClient.city, prevClient.state, prevClient.zipCode]
    .filter(Boolean)
    .join(', ');
  const currAddress = [currentClient.address, currentClient.city, currentClient.state, currentClient.zipCode]
    .filter(Boolean)
    .join(', ');

  if (prevAddress && currAddress) {
    if (prevAddress.toLowerCase() === currAddress.toLowerCase()) {
      changes.push({
        category: 'address',
        label: 'Address',
        description: 'Address unchanged from last year',
        severity: 'info',
      });
    } else {
      changes.push({
        category: 'address',
        label: 'Address Changed',
        description: 'Client address has changed since last year',
        severity: 'warning',
        previousValue: prevAddress,
        currentValue: currAddress,
      });
    }
  }

  // --- Spouse ---
  const hadSpouse = !!prevClient.spouse?.firstName;
  const hasSpouse = !!currentClient.spouse?.firstName;

  if (hadSpouse && !hasSpouse) {
    changes.push({
      category: 'spouse',
      label: 'Spouse Removed',
      description: `Spouse "${prevClient.spouse!.firstName} ${prevClient.spouse!.lastName}" from last year is no longer listed`,
      severity: 'warning',
    });
  } else if (!hadSpouse && hasSpouse) {
    changes.push({
      category: 'spouse',
      label: 'Spouse Added',
      description: `New spouse "${currentClient.spouse!.firstName} ${currentClient.spouse!.lastName}" added this year`,
      severity: 'warning',
    });
  } else if (hadSpouse && hasSpouse) {
    const prevSpouseName = `${prevClient.spouse!.firstName} ${prevClient.spouse!.lastName}`;
    const currSpouseName = `${currentClient.spouse!.firstName} ${currentClient.spouse!.lastName}`;
    if (prevSpouseName.toLowerCase() !== currSpouseName.toLowerCase()) {
      changes.push({
        category: 'spouse',
        label: 'Spouse Changed',
        description: `Spouse changed from "${prevSpouseName}" to "${currSpouseName}"`,
        severity: 'warning',
        previousValue: prevSpouseName,
        currentValue: currSpouseName,
      });
    }
  }

  // --- Employers (from previous year W-2 documents) ---
  if (previousData.employers.length > 0) {
    changes.push({
      category: 'employer',
      label: 'Previous Employers',
      description: `Last year: ${previousData.employers.join(', ')}`,
      severity: 'info',
      previousValue: previousData.employers.join(', '),
    });
  }

  // --- Income comparison (only if both years have data) ---
  if (previousData.totalIncome > 0) {
    changes.push({
      category: 'income',
      label: 'Previous Year Income',
      description: `Total income last year: $${previousData.totalIncome.toLocaleString()}`,
      severity: 'info',
      previousValue: `$${previousData.totalIncome.toLocaleString()}`,
    });
  }

  return changes;
}

/**
 * Calculate what percentage of expected documents have been received.
 * Matches current year documents against the expected set from previous year.
 */
export function calculateDocumentCompleteness(
  expectedDocs: ExpectedDocument[],
  currentDocs: DrakeTaxDocument[]
): DocumentCompleteness {
  if (expectedDocs.length === 0) {
    return {
      expectedCount: 0,
      receivedCount: 0,
      pendingCount: 0,
      unexpectedCount: currentDocs.length,
      completenessPercent: 100,
      expectedDocuments: [],
      missingRequired: [],
    };
  }

  // Clone expected docs and match against current documents
  const tracked: ExpectedDocument[] = expectedDocs.map((ed) => {
    // Find a matching current-year document by type and optionally payer name
    const matchingDoc = currentDocs.find((cd) => {
      if (cd.drakeFormType !== ed.type) return false;
      // If we have payer names, try to match them
      if (ed.payerName && ed.payerName !== 'Unknown' && cd.payerInfo?.name) {
        return cd.payerInfo.name.toLowerCase().includes(ed.payerName.toLowerCase()) ||
          ed.payerName.toLowerCase().includes(cd.payerInfo.name.toLowerCase());
      }
      return true;
    });

    return {
      ...ed,
      received: !!matchingDoc,
      receivedDocumentId: matchingDoc?.id,
      currentYearAmount: matchingDoc?.extractedAmounts
        ? getPrimaryAmount(ed.type, matchingDoc.extractedAmounts)
        : undefined,
    };
  });

  // Find unexpected documents (received but not expected)
  const expectedTypes = new Set(expectedDocs.map((ed) => ed.type));
  const unexpectedDocs = currentDocs.filter(
    (cd) => cd.drakeFormType && UPLOADABLE_DOC_TYPES.includes(cd.drakeFormType) && !expectedTypes.has(cd.drakeFormType)
  );

  const activeExpected = tracked.filter((ed) => !ed.markedNotExpected);
  const receivedCount = activeExpected.filter((ed) => ed.received).length;
  const pendingCount = activeExpected.filter((ed) => !ed.received).length;

  return {
    expectedCount: activeExpected.length,
    receivedCount,
    pendingCount,
    unexpectedCount: unexpectedDocs.length,
    completenessPercent: activeExpected.length > 0
      ? Math.round((receivedCount / activeExpected.length) * 100)
      : 100,
    expectedDocuments: tracked,
    missingRequired: tracked.filter((ed) => !ed.received && !ed.markedNotExpected),
  };
}

/**
 * Mark that the client confirms nothing has changed from last year.
 * Persists the confirmation timestamp to the server.
 */
export async function confirmNoChanges(clientId: string): Promise<boolean> {
  try {
    devLog('[RecurringClient] Client confirms no changes from last year:', clientId);

    // TODO: Implement server-side mutation to record the confirmation
    const body = {
      query: 'confirmNoChangesFromLastYear',
      params: {
        businessId: authStore.getBusinessId(),
        clientId,
      },
      form: {
        noChangesConfirmed: true,
        confirmedAt: Date.now(),
        confirmedBy: authStore.state.profile?.uid,
      },
    };

    const response = await fetchGraphQLSS(body);
    return response?.success || false;
  } catch (error) {
    devLog('[RecurringClient] Error confirming no changes:', error);
    return false;
  }
}

/**
 * Mark an expected document as not expected this year.
 * For example, if a client no longer works at a previous employer.
 */
export async function markDocumentNotExpected(
  clientId: string,
  documentType: DrakeTaxDocumentType,
  payerName?: string,
  reason?: string
): Promise<boolean> {
  try {
    devLog('[RecurringClient] Marking document not expected:', documentType, payerName);

    // TODO: Implement server-side mutation to persist the exclusion
    const body = {
      query: 'markExpectedDocumentNotNeeded',
      params: {
        businessId: authStore.getBusinessId(),
        clientId,
      },
      form: {
        documentType,
        payerName,
        reason,
        markedAt: Date.now(),
        markedBy: authStore.state.profile?.uid,
      },
    };

    const response = await fetchGraphQLSS(body);
    return response?.success || false;
  } catch (error) {
    devLog('[RecurringClient] Error marking document not expected:', error);
    return false;
  }
}

/**
 * Utility: Format a currency amount for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Utility: Calculate the percentage change between two values
 */
export function calculatePercentChange(previous: number, current: number): string {
  if (previous === 0 && current === 0) return '0%';
  if (previous === 0) return '+100%';
  const change = ((current - previous) / previous) * 100;
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
}
