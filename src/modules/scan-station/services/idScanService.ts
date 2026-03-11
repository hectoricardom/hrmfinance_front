/**
 * ID Scan Service
 * Handles ID/passport scanning using existing ML-powered scanner components,
 * extracting client data and auto-populating TaxPortal fields.
 */

import { devLog } from '../../../services/utils';
import type { TaxPortal } from '../../drake-export/types/drakeTypes';
import type { IDScanResult } from '../types/scanTypes';

// ============================================
// ID Data Extraction
// ============================================

/**
 * Extract client data from an ID scan result (AAMVA barcode data from MLIDScanner)
 * The MLIDScanner returns parsed AAMVA data from the PDF417 barcode on the back of a US ID.
 */
export function extractIDData(scanResult: any): IDScanResult {
  try {
    devLog('[IDScan] Extracting ID data from scan result:', scanResult);

    const parsed = scanResult?.parsed || scanResult;
    if (!parsed) {
      return createEmptyIDResult('drivers_license');
    }

    // AAMVA barcode fields (from aamvaParser)
    const result: IDScanResult = {
      scanType: 'drivers_license',
      firstName: parsed.firstName || parsed.DAC || undefined,
      middleName: parsed.middleName || parsed.DAD || undefined,
      lastName: parsed.lastName || parsed.DCS || undefined,
      suffix: parsed.suffix || parsed.DCU || undefined,
      dateOfBirth: formatDate(parsed.dateOfBirth || parsed.DBB),
      gender: normalizeGender(parsed.gender || parsed.DBC),
      documentNumber: parsed.idNumber || parsed.DAQ || undefined,
      issuingState: parsed.state || parsed.DAJ || undefined,
      issueDate: formatDate(parsed.issueDate || parsed.DBD),
      expirationDate: formatDate(parsed.expirationDate || parsed.DBA),
      address: parsed.address || parsed.DAG || undefined,
      city: parsed.city || parsed.DAI || undefined,
      state: parsed.state || parsed.DAJ || undefined,
      zipCode: formatZipCode(parsed.zipCode || parsed.DAK),
      country: parsed.country || 'US',
      eyeColor: parsed.eyeColor || parsed.DAY || undefined,
      hairColor: parsed.hairColor || parsed.DAZ || undefined,
      height: parsed.height || parsed.DAU || undefined,
      weight: parsed.weight || parsed.DAW || undefined,
      confidence: scanResult?.confidence ?? 0.85,
      isValid: parsed.isValid !== false,
      rawData: parsed,
    };

    devLog('[IDScan] Extracted ID data:', {
      name: `${result.firstName} ${result.lastName}`,
      state: result.issuingState,
      dob: result.dateOfBirth,
    });

    return result;
  } catch (error) {
    devLog('[IDScan] Error extracting ID data:', error);
    return createEmptyIDResult('drivers_license');
  }
}

/**
 * Extract client data from a passport scan result (MRZ data from MLPassportScanner)
 * The MLPassportScanner returns parsed MRZ data from passport machine-readable zones.
 */
export function extractPassportData(scanResult: any): IDScanResult {
  try {
    devLog('[IDScan] Extracting passport data from scan result:', scanResult);

    const parsed = scanResult?.parsed || scanResult;
    if (!parsed) {
      return createEmptyIDResult('passport');
    }

    // MRZ fields
    const result: IDScanResult = {
      scanType: 'passport',
      firstName: parsed.firstName || parsed.givenNames || undefined,
      lastName: parsed.lastName || parsed.surname || undefined,
      dateOfBirth: formatDate(parsed.dateOfBirth || parsed.dob),
      gender: normalizeGender(parsed.sex || parsed.gender),
      documentNumber: parsed.passportNumber || parsed.documentNumber || undefined,
      expirationDate: formatDate(parsed.expirationDate || parsed.expiry),
      country: parsed.nationality || parsed.issuingCountry || undefined,
      issuingState: undefined, // Passports don't have issuing state
      confidence: scanResult?.confidence ?? 0.8,
      isValid: parsed.isValid !== false,
      rawData: parsed,
    };

    devLog('[IDScan] Extracted passport data:', {
      name: `${result.firstName} ${result.lastName}`,
      country: result.country,
      dob: result.dateOfBirth,
    });

    return result;
  } catch (error) {
    devLog('[IDScan] Error extracting passport data:', error);
    return createEmptyIDResult('passport');
  }
}

// ============================================
// TaxPortal Auto-Population
// ============================================

/**
 * Generate TaxPortal field updates from an ID scan result.
 * Returns a partial TaxPortal that can be merged into an existing or new client record.
 */
export function buildTaxPortalFromIDScan(idResult: IDScanResult): Partial<TaxPortal> {
  const updates: Partial<TaxPortal> = {};

  // Personal information
  if (idResult.firstName) updates.firstName = idResult.firstName;
  if (idResult.middleName) updates.middleName = idResult.middleName;
  if (idResult.lastName) updates.lastName = idResult.lastName;
  if (idResult.suffix) updates.suffix = idResult.suffix;
  if (idResult.dateOfBirth) updates.dateOfBirth = idResult.dateOfBirth;

  // Address
  if (idResult.address) updates.address = idResult.address;
  if (idResult.city) updates.city = idResult.city;
  if (idResult.state) updates.state = idResult.state;
  if (idResult.zipCode) updates.zipCode = idResult.zipCode;
  if (idResult.country) updates.country = idResult.country;

  // ID Information
  if (idResult.documentNumber || idResult.issuingState) {
    updates.idInfo = {
      idNumber: idResult.documentNumber || '',
      idState: idResult.issuingState || '',
      issueDate: idResult.issueDate,
      expirationDate: idResult.expirationDate,
      idType: idResult.scanType === 'passport' ? 'passport' : 'drivers_license',
      firstName: idResult.firstName,
      middleName: idResult.middleName,
      lastName: idResult.lastName,
      suffix: idResult.suffix,
      dateOfBirth: idResult.dateOfBirth,
      gender: idResult.gender,
      eyeColor: idResult.eyeColor,
      hairColor: idResult.hairColor,
      height: idResult.height,
      weight: idResult.weight,
      address: idResult.address,
      city: idResult.city,
      state: idResult.state,
      zipCode: idResult.zipCode,
      country: idResult.country,
    };
  }

  return updates;
}

/**
 * Validate extracted ID data for completeness and reasonableness
 */
export function validateIDData(idResult: IDScanResult): {
  isValid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Required fields
  if (!idResult.firstName) errors.push('First name not detected');
  if (!idResult.lastName) errors.push('Last name not detected');

  // Important fields that might be missing
  if (!idResult.dateOfBirth) warnings.push('Date of birth not detected');
  if (!idResult.documentNumber) warnings.push('ID number not detected');
  if (!idResult.address) warnings.push('Address not detected');

  // Check for expired ID
  if (idResult.expirationDate) {
    const expDate = new Date(idResult.expirationDate);
    if (expDate < new Date()) {
      warnings.push('ID appears to be expired');
    }
  }

  // Check for unreasonable date of birth
  if (idResult.dateOfBirth) {
    const dob = new Date(idResult.dateOfBirth);
    const age = (Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    if (age < 16 || age > 120) {
      warnings.push(`Date of birth suggests age of ${Math.round(age)}, which may be incorrect`);
    }
  }

  // Low confidence warning
  if (idResult.confidence < 0.5) {
    warnings.push('Low scan confidence - please verify all fields manually');
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors,
  };
}

// ============================================
// Utility Functions
// ============================================

/**
 * Create an empty ID result for error cases
 */
function createEmptyIDResult(scanType: IDScanResult['scanType']): IDScanResult {
  return {
    scanType,
    confidence: 0,
    isValid: false,
  };
}

/**
 * Format a date string to YYYY-MM-DD
 * Handles various input formats: MMDDYYYY, MM/DD/YYYY, YYYYMMDD, etc.
 */
function formatDate(dateStr?: string): string | undefined {
  if (!dateStr) return undefined;

  // Already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // MMDDYYYY (AAMVA format)
  if (/^\d{8}$/.test(dateStr)) {
    const month = dateStr.substring(0, 2);
    const day = dateStr.substring(2, 4);
    const year = dateStr.substring(4, 8);
    return `${year}-${month}-${day}`;
  }

  // MM/DD/YYYY or MM-DD-YYYY
  const slashMatch = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (slashMatch) {
    const month = slashMatch[1].padStart(2, '0');
    const day = slashMatch[2].padStart(2, '0');
    return `${slashMatch[3]}-${month}-${day}`;
  }

  // YYMMDD (MRZ format)
  if (/^\d{6}$/.test(dateStr)) {
    let year = parseInt(dateStr.substring(0, 2), 10);
    const month = dateStr.substring(2, 4);
    const day = dateStr.substring(4, 6);
    // Assume 2000s if year < 50, otherwise 1900s
    year = year < 50 ? 2000 + year : 1900 + year;
    return `${year}-${month}-${day}`;
  }

  // Try native Date parsing as last resort
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch {
    // Ignore
  }

  return undefined;
}

/**
 * Normalize gender values to M/F/X
 */
function normalizeGender(gender?: string): 'M' | 'F' | 'X' | undefined {
  if (!gender) return undefined;
  const upper = gender.toUpperCase().trim();
  if (upper === 'M' || upper === '1' || upper === 'MALE') return 'M';
  if (upper === 'F' || upper === '2' || upper === 'FEMALE') return 'F';
  if (upper === 'X' || upper === '9') return 'X';
  return undefined;
}

/**
 * Format zip code to standard 5-digit or 5+4 format
 */
function formatZipCode(zip?: string): string | undefined {
  if (!zip) return undefined;
  const cleaned = zip.replace(/\s/g, '').trim();
  if (cleaned.length >= 5) {
    return cleaned.substring(0, 5);
  }
  return cleaned || undefined;
}

// Export singleton-style service
export const idScanService = {
  extractIDData,
  extractPassportData,
  buildTaxPortalFromIDScan,
  validateIDData,
};
