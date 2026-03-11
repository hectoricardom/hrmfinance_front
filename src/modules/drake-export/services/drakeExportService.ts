/**
 * Drake Export Service
 * Service for generating Drake-compatible CSV exports
 */

import {
  DrakeTaxDocument,
  DrakeExportRecord,
  DrakeExportConfig,
  DrakeExportResult,
  ExtractedTaxAmounts
} from '../types/drakeTypes';

import {
  FORM_DEFINITIONS,
  DRAKE_CSV_HEADERS,
  formatDrakeAmount,
  formatDrakeSSN,
  formatDrakeEIN,
  getPopulatedBoxes
} from '../components/data/drakeFieldMappings';

import { NotaryCustomer } from '../../notary/types';

/** Safely get payer address as a string (handles object or string) */
function getPayerAddress(addr: any): string {
  if (!addr) return '';
  if (typeof addr === 'string') return addr;
  if (typeof addr === 'object') return addr.street || addr.address || '';
  return String(addr);
}

/**
 * Escape a value for CSV format
 * Handles commas, quotes, and newlines
 */
export function escapeCSV(value: string | number | undefined): string {
  if (value === undefined || value === null) {
    return '';
  }

  const stringValue = String(value);

  // If the value contains commas, quotes, or newlines, wrap in quotes and escape existing quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Extract SSN from client data
 * Returns null if not found or invalid
 */
export function getClientSSN(client: NotaryCustomer): string | null {
  if (!client.ss) {
    return null;
  }

  const cleaned = client.ss.replace(/\D/g, '');
  if (cleaned.length !== 9) {
    return null;
  }

  return cleaned;
}

/**
 * Format client address from residences
 * Returns the most recent residence address or empty string
 */
export function getClientAddress(client: NotaryCustomer): string {
  if (!client.residences) {
    return '';
  }

  // Get all residences and find the most recent one (or first available)
  const residenceKeys = Object.keys(client.residences);
  if (residenceKeys.length === 0) {
    return '';
  }

  // Try to find the most recent residence based on toDate or just use the first one
  let mostRecentResidence = client.residences[residenceKeys[0]];

  for (const key of residenceKeys) {
    const residence = client.residences[key];
    // If toDate is empty/undefined, it's likely the current residence
    if (!residence.toDate?.year) {
      mostRecentResidence = residence;
      break;
    }
  }

  // Format the address
  const parts: string[] = [];

  if (mostRecentResidence.addressLineOne) {
    parts.push(mostRecentResidence.addressLineOne);
  }
  if (mostRecentResidence.addressLineTwo) {
    parts.push(mostRecentResidence.addressLineTwo);
  }
  if (mostRecentResidence.city || mostRecentResidence.state || mostRecentResidence.zipcode) {
    const cityStateZip: string[] = [];
    if (mostRecentResidence.city) {
      cityStateZip.push(mostRecentResidence.city);
    }
    if (mostRecentResidence.state) {
      cityStateZip.push(mostRecentResidence.state);
    }
    if (mostRecentResidence.zipcode) {
      cityStateZip.push(mostRecentResidence.zipcode);
    }
    parts.push(cityStateZip.join(', '));
  }

  return parts.join(', ');
}

/**
 * Validate export data before generating CSV
 * Returns validation result with errors and warnings
 */
export function validateExportData(
  client: NotaryCustomer,
  documents: DrakeTaxDocument[]
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate client has SSN
  const ssn = getClientSSN(client);
  if (!ssn) {
    errors.push('Client SSN is missing or invalid');
  }

  // Validate client has name
  if (!client.firstName || !client.lastName) {
    errors.push('Client first name and last name are required');
  }

  // Validate at least one document exists
  if (!documents || documents.length === 0) {
    errors.push('At least one tax document is required');
  } else {
    // Check for verified documents
    const verifiedDocuments = documents.filter(doc => doc.verified);
    if (verifiedDocuments.length === 0) {
      errors.push('At least one verified document is required for export');
    }

    // Check for documents with missing amounts
    for (const doc of documents) {
      if (doc.verified && (!doc.extractedAmounts || Object.keys(doc.extractedAmounts).length === 0)) {
        warnings.push(`Document "${doc.originalFileName}" is verified but has no extracted amounts`);
      }

      if (doc.uploadStatus === 'error') {
        warnings.push(`Document "${doc.originalFileName}" has an error status`);
      }

      if (doc.uploadStatus === 'analyzing' || doc.uploadStatus === 'uploading') {
        warnings.push(`Document "${doc.originalFileName}" is still being processed`);
      }
    }

    // Check for unverified documents
    const unverifiedCount = documents.filter(doc => !doc.verified && doc.uploadStatus === 'analyzed').length;
    if (unverifiedCount > 0) {
      warnings.push(`${unverifiedCount} document(s) are analyzed but not verified`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Convert a single document to Drake CSV records
 * One record per non-zero box value
 */
export function documentToRecords(
  doc: DrakeTaxDocument,
  client: NotaryCustomer,
  taxYear: number
): DrakeExportRecord[] {
  const records: DrakeExportRecord[] = [];

  // Skip if no extracted amounts or not a Drake form type
  if (!doc.extractedAmounts || !doc.drakeFormType) {
    return records;
  }

  // Get the form definition for this document type
  const formDefinition = FORM_DEFINITIONS[doc.drakeFormType];
  if (!formDefinition) {
    return records;
  }

  // Get populated boxes (non-zero values)
  const populatedBoxes = getPopulatedBoxes(doc.drakeFormType, doc.extractedAmounts);

  // Get client SSN (formatted)
  const ssn = getClientSSN(client);
  const formattedSSN = ssn ? formatDrakeSSN(ssn) : '';

  // Parse client name
  const firstName = client.firstName || '';
  const lastName = client.lastName || '';
  const middleInitial = client.middleName ? client.middleName.charAt(0).toUpperCase() : undefined;

  // Get payer/employer info from document
  const payerInfo = doc.payerInfo;

  // Create a record for each populated box
  for (const { box, value } of populatedBoxes) {
    const record: DrakeExportRecord = {
      SSN: formattedSSN,
      firstName,
      lastName,
      middleInitial,
      taxYear,
      formType: formDefinition.formCode,
      boxNumber: box.boxNumber,
      amount: value,
      description: box.description,
      payerName: payerInfo?.name,
      payerEIN: payerInfo?.ein ? formatDrakeEIN(payerInfo.ein) : undefined,
      payerAddress: payerInfo
        ? [getPayerAddress(payerInfo.address), payerInfo.city, payerInfo.state, payerInfo.zip]
            .filter(Boolean)
            .join(', ')
        : undefined,
      state: payerInfo?.state,
      stateId: undefined
    };

    // For W-2, use employer fields
    if (doc.drakeFormType === 'w2' && payerInfo) {
      record.employerName = payerInfo.name;
      record.employerEIN = payerInfo.ein ? formatDrakeEIN(payerInfo.ein) : undefined;
      record.employerAddress = record.payerAddress;
    }

    // For 1098, include property address
    if (doc.drakeFormType === '1098' && doc.extractedAmounts.propertyAddress) {
      record.propertyAddress = doc.extractedAmounts.propertyAddress;
    }

    // For 1098-T and 1099-INT/DIV, include institution info
    if (['1098_t', '1099_int', '1099_div'].includes(doc.drakeFormType) && payerInfo) {
      record.institutionName = payerInfo.name;
      record.institutionEIN = payerInfo.ein ? formatDrakeEIN(payerInfo.ein) : undefined;
    }

    records.push(record);
  }

  return records;
}

/**
 * Convert records array to CSV string
 */
export function recordsToCSV(records: DrakeExportRecord[], includeHeaders: boolean): string {
  const lines: string[] = [];

  // Add headers if requested
  if (includeHeaders) {
    lines.push(DRAKE_CSV_HEADERS.join(','));
  }

  // Convert each record to a CSV line
  for (const record of records) {
    const values = [
      escapeCSV(record.SSN),
      escapeCSV(record.firstName),
      escapeCSV(record.middleInitial),
      escapeCSV(record.lastName),
      escapeCSV(record.suffix),
      escapeCSV(record.taxYear),
      escapeCSV(record.formType),
      escapeCSV(record.boxNumber),
      escapeCSV(formatDrakeAmount(record.amount)),
      escapeCSV(record.description),
      escapeCSV(record.payerName),
      escapeCSV(record.payerEIN),
      escapeCSV(record.payerAddress),
      escapeCSV(record.state),
      escapeCSV(record.stateId)
    ];

    lines.push(values.join(','));
  }

  return lines.join('\n');
}

/**
 * Create blob and trigger browser download
 */
export function downloadCSV(csvData: string, fileName: string): void {
  // Create blob with CSV data
  const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });

  // Create download URL
  const url = URL.createObjectURL(blob);

  // Create temporary link element
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;

  // Append to body, click, and remove
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up the URL object
  URL.revokeObjectURL(url);
}

/**
 * Main export function
 * Generates Drake-compatible CSV export
 */
export function generateDrakeExport(
  client: NotaryCustomer,
  documents: DrakeTaxDocument[],
  config: DrakeExportConfig
): DrakeExportResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate client has SSN
  const ssn = getClientSSN(client);
  if (!ssn) {
    return {
      success: false,
      recordCount: 0,
      totalIncome: 0,
      totalWithholding: 0,
      errors: ['Client SSN is missing or invalid. Cannot generate export.']
    };
  }

  // Validate client has name
  if (!client.firstName || !client.lastName) {
    return {
      success: false,
      recordCount: 0,
      totalIncome: 0,
      totalWithholding: 0,
      errors: ['Client first name and last name are required.']
    };
  }

  // Filter documents based on config
  const filteredDocuments = documents.filter(doc => {
    // Only include verified documents
    if (!doc.verified) {
      return false;
    }

    // Filter by document type based on config
    if (doc.drakeFormType === 'w2' && config.includeW2 === false) {
      return false;
    }
    if (['1099_misc', '1099_nec', '1099_int', '1099_div'].includes(doc.drakeFormType || '') && config.include1099 === false) {
      return false;
    }
    if (['1098', '1098_t'].includes(doc.drakeFormType || '') && config.include1098 === false) {
      return false;
    }
    if (doc.drakeFormType === 'schedule_k1' && config.includeK1 === false) {
      return false;
    }
    if (doc.drakeFormType === 'receipt' && config.includeReceipts === false) {
      return false;
    }

    return true;
  });

  if (filteredDocuments.length === 0) {
    return {
      success: false,
      recordCount: 0,
      totalIncome: 0,
      totalWithholding: 0,
      errors: ['No verified documents available for export with the current filter settings.']
    };
  }

  // Convert each document to records
  const allRecords: DrakeExportRecord[] = [];
  let totalIncome = 0;
  let totalWithholding = 0;

  for (const doc of filteredDocuments) {
    try {
      const records = documentToRecords(doc, client, config.taxYear);
      allRecords.push(...records);

      // Calculate totals
      for (const record of records) {
        // Income fields (Box 1 for most forms, specific boxes for others)
        if (
          (record.formType === 'W2' && record.boxNumber === '1') ||
          (record.formType === '1099NEC' && record.boxNumber === '1') ||
          (record.formType === '1099MISC' && ['1', '2', '3'].includes(record.boxNumber)) ||
          (record.formType === '1099INT' && record.boxNumber === '1') ||
          (record.formType === '1099DIV' && record.boxNumber === '1a') ||
          (record.formType === 'K1' && ['1', '4', '5', '6a'].includes(record.boxNumber))
        ) {
          totalIncome += record.amount;
        }

        // Withholding fields (Box 2 for W-2, Box 4 for 1099s)
        if (
          (record.formType === 'W2' && record.boxNumber === '2') ||
          (record.formType === '1099NEC' && record.boxNumber === '4') ||
          (record.formType === '1099MISC' && record.boxNumber === '4') ||
          (record.formType === '1099INT' && record.boxNumber === '4') ||
          (record.formType === '1099DIV' && record.boxNumber === '4')
        ) {
          totalWithholding += record.amount;
        }
      }
    } catch (error) {
      warnings.push(`Error processing document "${doc.originalFileName}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  if (allRecords.length === 0) {
    return {
      success: false,
      recordCount: 0,
      totalIncome: 0,
      totalWithholding: 0,
      errors: ['No records were generated from the documents. Please verify that documents have extracted amounts.']
    };
  }

  // Generate CSV string
  const includeHeaders = config.includeHeaders !== false; // Default to true
  const csvData = recordsToCSV(allRecords, includeHeaders);

  // Generate filename
  const clientName = `${client.lastName}_${client.firstName}`.replace(/\s+/g, '_');
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const extension = config.outputFormat === 'txt' ? 'txt' : 'csv';
  const fileName = `Drake_${clientName}_${config.taxYear}_${timestamp}.${extension}`;

  return {
    success: true,
    csvData,
    fileName,
    recordCount: allRecords.length,
    totalIncome,
    totalWithholding,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
    exportedAt: Date.now()
  };
}
