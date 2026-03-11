/**
 * MRZ (Machine Readable Zone) Parser
 *
 * Parses MRZ data from travel documents following ICAO 9303 standard.
 *
 * Supported formats:
 * - TD1 (ID cards): 3 lines x 30 characters
 * - TD2 (travel documents): 2 lines x 36 characters
 * - TD3 (passports): 2 lines x 44 characters
 * - MRVA (Visa Type A): 2 lines x 44 characters
 * - MRVB (Visa Type B): 2 lines x 36 characters
 */

import { MRZData, ISO_COUNTRY_CODES } from './types';

// MRZ character set (A-Z, 0-9, <)
const MRZ_CHARSET = /^[A-Z0-9<]+$/;

// Weights for check digit calculation (7, 3, 1 repeating)
const CHECK_DIGIT_WEIGHTS = [7, 3, 1];

// Character values for check digit calculation
const CHAR_VALUES: Record<string, number> = {
  '<': 0,
  '0': 0,
  '1': 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  A: 10,
  B: 11,
  C: 12,
  D: 13,
  E: 14,
  F: 15,
  G: 16,
  H: 17,
  I: 18,
  J: 19,
  K: 20,
  L: 21,
  M: 22,
  N: 23,
  O: 24,
  P: 25,
  Q: 26,
  R: 27,
  S: 28,
  T: 29,
  U: 30,
  V: 31,
  W: 32,
  X: 33,
  Y: 34,
  Z: 35,
};

// Cyrillic to Latin character mapping (visually similar characters)
const CYRILLIC_TO_LATIN: Record<string, string> = {
  '\u0410': 'A', // А -> A
  '\u0412': 'B', // В -> B
  '\u0421': 'C', // С -> C
  '\u0415': 'E', // Е -> E
  '\u041D': 'H', // Н -> H
  '\u0406': 'I', // І -> I
  '\u0456': 'I', // і -> I
  '\u041A': 'K', // К -> K
  '\u041C': 'M', // М -> M
  '\u041E': 'O', // О -> O
  '\u043E': 'O', // о -> O
  '\u0420': 'P', // Р -> P
  '\u0422': 'T', // Т -> T
  '\u0425': 'X', // Х -> X
  '\u0423': 'Y', // У -> Y
  '\u0430': 'A', // а -> A
  '\u0435': 'E', // е -> E
  '\u043A': 'K', // к -> K
  '\u043C': 'M', // м -> M
  '\u0440': 'P', // р -> P
  '\u0441': 'C', // с -> C
  '\u0443': 'Y', // у -> Y
  '\u0445': 'X', // х -> X
};

// Common OCR misread corrections (context-dependent)
const OCR_CORRECTIONS_ALPHA: Record<string, string> = {
  '0': 'O',
  '1': 'I',
  '8': 'B',
  '5': 'S',
  '6': 'G',
  '2': 'Z',
};

const OCR_CORRECTIONS_NUMERIC: Record<string, string> = {
  O: '0',
  I: '1',
  l: '1',
  B: '8',
  S: '5',
  G: '6',
  Z: '2',
  o: '0',
};

// Filler character variations
const FILLER_VARIATIONS = ['<', '\u2039', '\u203A', '\u00AB', '\u00BB', '_', '-', '.', ' '];

/**
 * Clean OCR text by converting Cyrillic characters, fixing common misreads,
 * and normalizing filler characters.
 */
export function cleanOCRText(text: string): string {
  let cleaned = text;

  // Convert Cyrillic to Latin
  for (const [cyrillic, latin] of Object.entries(CYRILLIC_TO_LATIN)) {
    cleaned = cleaned.replace(new RegExp(cyrillic, 'g'), latin);
  }

  // Normalize filler characters to <
  for (const filler of FILLER_VARIATIONS) {
    if (filler !== '<') {
      cleaned = cleaned.replace(new RegExp(escapeRegExp(filler), 'g'), '<');
    }
  }

  // Convert to uppercase
  cleaned = cleaned.toUpperCase();

  // Remove any characters not in MRZ charset (except newlines for line detection)
  cleaned = cleaned.replace(/[^A-Z0-9<\n\r]/g, '');

  return cleaned;
}

/**
 * Escape special regex characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Apply context-aware OCR corrections based on expected field type
 */
function applyContextCorrections(text: string, expectNumeric: boolean): string {
  let result = '';
  const corrections = expectNumeric ? OCR_CORRECTIONS_NUMERIC : OCR_CORRECTIONS_ALPHA;

  for (const char of text) {
    if (char === '<') {
      result += char;
    } else if (corrections[char]) {
      result += corrections[char];
    } else {
      result += char;
    }
  }

  return result;
}

/**
 * Calculate MOD 10 check digit following ICAO 9303 specification
 *
 * @param input - String containing MRZ characters (A-Z, 0-9, <)
 * @returns Check digit (0-9)
 */
export function calculateCheckDigit(input: string): number {
  let sum = 0;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    const value = CHAR_VALUES[char];

    if (value === undefined) {
      // Invalid character, treat as 0
      continue;
    }

    const weight = CHECK_DIGIT_WEIGHTS[i % 3];
    sum += value * weight;
  }

  return sum % 10;
}

/**
 * Validate a field against its check digit
 *
 * @param field - The field value to validate
 * @param checkDigit - The check digit (single character 0-9 or <)
 * @returns true if valid, false otherwise
 */
export function validateCheckDigit(field: string, checkDigit: string): boolean {
  // < as check digit means the field is empty or check digit is not used
  if (checkDigit === '<') {
    return field.replace(/</g, '') === '';
  }

  const expected = calculateCheckDigit(field);
  const actual = parseInt(checkDigit, 10);

  if (isNaN(actual)) {
    return false;
  }

  return expected === actual;
}

/**
 * Parse MRZ date format (YYMMDD) to ISO format (YYYY-MM-DD)
 *
 * Uses pivot year logic: years 00-30 are 2000s, 31-99 are 1900s
 * This handles both birth dates (likely 1900s) and expiration dates (likely 2000s)
 *
 * @param dateStr - Date in YYMMDD format
 * @returns Date in YYYY-MM-DD format, or empty string if invalid
 */
export function parseMRZDate(dateStr: string): string {
  if (!dateStr || dateStr.length !== 6) {
    return '';
  }

  // Handle filler characters (indicates unknown/not applicable)
  if (dateStr.includes('<')) {
    return '';
  }

  const year = parseInt(dateStr.substring(0, 2), 10);
  const month = parseInt(dateStr.substring(2, 4), 10);
  const day = parseInt(dateStr.substring(4, 6), 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return '';
  }

  // Validate month and day ranges
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return '';
  }

  // Pivot year: 00-30 = 2000s, 31-99 = 1900s
  const fullYear = year <= 30 ? 2000 + year : 1900 + year;

  return `${fullYear}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

/**
 * Parse name field from MRZ (removes fillers and separates components)
 *
 * @param nameField - Name field with << separator between surname and given names
 * @returns Object with lastName, firstName, and optional middleName
 */
function parseName(nameField: string): { lastName: string; firstName: string; middleName?: string } {
  // Split by << (surname separator from given names)
  const parts = nameField.split('<<');

  const lastName = (parts[0] || '').replace(/</g, ' ').trim();

  // Given names are separated by single <
  const givenNames = (parts[1] || '').split('<').filter((n) => n.length > 0);

  const firstName = givenNames[0] || '';
  const middleName = givenNames.slice(1).join(' ') || undefined;

  return { lastName, firstName, middleName };
}

/**
 * Remove filler characters and trim
 */
function cleanField(field: string): string {
  return field.replace(/</g, ' ').trim().replace(/\s+/g, ' ');
}

/**
 * Detect if text contains MRZ-like patterns
 *
 * @param text - Text to analyze
 * @returns true if text appears to contain MRZ data
 */
export function isMRZLike(text: string): boolean {
  const cleaned = cleanOCRText(text);
  const lines = cleaned.split(/[\r\n]+/).filter((line) => line.length > 0);

  // Check for valid MRZ line patterns
  for (const line of lines) {
    // MRZ lines should be 30, 36, or 44 characters
    if (line.length === 30 || line.length === 36 || line.length === 44) {
      // Check if line matches MRZ character set
      if (MRZ_CHARSET.test(line)) {
        // Check for typical MRZ patterns
        // - Starts with document type (P, I, A, C, V)
        // - Contains << separator
        // - Has multiple < fillers
        if (/^[PIACV]/.test(line) || line.includes('<<') || (line.match(/</g) || []).length >= 3) {
          return true;
        }
      }
    }
  }

  // Also check for partial matches (OCR might have some errors)
  const fullText = lines.join('');
  if (fullText.length >= 60) {
    // At least 2 lines of TD1
    const mrzChars = fullText.match(/[A-Z0-9<]/g) || [];
    const ratio = mrzChars.length / fullText.length;
    if (ratio > 0.9) {
      return true;
    }
  }

  return false;
}

/**
 * Extract MRZ lines from OCR text output
 *
 * @param ocrText - Raw OCR output text
 * @returns Array of MRZ lines (cleaned and normalized)
 */
export function extractMRZLines(ocrText: string): string[] {
  const cleaned = cleanOCRText(ocrText);
  const allLines = cleaned.split(/[\r\n]+/).filter((line) => line.length > 0);

  // Find lines that look like MRZ
  const mrzLines: string[] = [];
  const validLengths = [30, 36, 44];

  for (const line of allLines) {
    // Check if line length matches expected MRZ lengths (with some tolerance)
    const trimmed = line.trim();

    for (const targetLength of validLengths) {
      // Allow +/- 2 character tolerance for OCR errors
      if (Math.abs(trimmed.length - targetLength) <= 2) {
        // Pad or trim to exact length
        let normalized = trimmed;
        if (trimmed.length < targetLength) {
          normalized = trimmed.padEnd(targetLength, '<');
        } else if (trimmed.length > targetLength) {
          normalized = trimmed.substring(0, targetLength);
        }

        // Verify it looks like MRZ
        if (MRZ_CHARSET.test(normalized)) {
          mrzLines.push(normalized);
          break;
        }
      }
    }
  }

  // If we found lines, determine the format and validate consistency
  if (mrzLines.length >= 2) {
    // Check if all lines have same length
    const lengths = mrzLines.map((l) => l.length);
    const uniqueLengths = [...new Set(lengths)];

    if (uniqueLengths.length === 1) {
      return mrzLines;
    }

    // Try to find the most common length
    const lengthCounts: Record<number, number> = {};
    for (const len of lengths) {
      lengthCounts[len] = (lengthCounts[len] || 0) + 1;
    }

    let maxCount = 0;
    let dominantLength = 0;
    for (const [len, count] of Object.entries(lengthCounts)) {
      if (count > maxCount) {
        maxCount = count;
        dominantLength = parseInt(len, 10);
      }
    }

    // Filter to only lines matching dominant length
    return mrzLines.filter((l) => l.length === dominantLength);
  }

  return mrzLines;
}

/**
 * Detect MRZ format based on line count and length
 */
function detectMRZFormat(lines: string[]): MRZData['format'] {
  if (lines.length === 3 && lines[0].length === 30) {
    return 'TD1';
  }

  if (lines.length === 2) {
    const lineLength = lines[0].length;

    if (lineLength === 44) {
      // TD3 or MRVA - check document type
      const docType = lines[0][0];
      if (docType === 'V') {
        return 'MRVA';
      }
      return 'TD3';
    }

    if (lineLength === 36) {
      // TD2 or MRVB - check document type
      const docType = lines[0][0];
      if (docType === 'V') {
        return 'MRVB';
      }
      return 'TD2';
    }
  }

  return 'unknown';
}

/**
 * Parse document type from first character
 */
function parseDocumentType(code: string): MRZData['documentType'] {
  switch (code[0]) {
    case 'P':
      return 'P';
    case 'I':
    case 'A':
    case 'C':
      return 'ID';
    case 'V':
      return 'V';
    default:
      return 'unknown';
  }
}

/**
 * Parse gender from MRZ code
 */
function parseGender(code: string): MRZData['gender'] {
  switch (code) {
    case 'M':
      return 'M';
    case 'F':
      return 'F';
    case 'X':
    case '<':
      return 'X';
    default:
      return 'unknown';
  }
}

/**
 * Validate country/nationality code
 */
function isValidCountryCode(code: string): boolean {
  const cleaned = code.replace(/</g, '');
  if (cleaned.length === 0) return false;
  if (cleaned.length > 3) return false;

  // Check if it's a known code or at least looks valid (3 letters)
  if (ISO_COUNTRY_CODES[cleaned]) return true;

  // Accept any 3-letter code as potentially valid
  return /^[A-Z]{1,3}$/.test(cleaned);
}

/**
 * Parse TD1 format (ID cards) - 3 lines x 30 characters
 *
 * Line 1: Document code (2) + Issuing country (3) + Document number (9) + Check digit (1) + Optional data (15)
 * Line 2: Date of birth (6) + Check digit (1) + Sex (1) + Expiration date (6) + Check digit (1) + Nationality (3) + Optional data (11) + Overall check digit (1)
 * Line 3: Name (30)
 */
function parseTD1(lines: string[]): Partial<MRZData> & { validationErrors: string[]; checkDigitsValid: boolean } {
  const errors: string[] = [];
  let checkDigitsValid = true;

  const line1 = lines[0];
  const line2 = lines[1];
  const line3 = lines[2];

  // Line 1 parsing
  const documentCode = line1.substring(0, 2);
  const issuingCountry = line1.substring(2, 5);
  const documentNumber = line1.substring(5, 14);
  const documentNumberCheck = line1[14];
  const optionalData1 = line1.substring(15, 30);

  // Line 2 parsing
  const birthDate = line2.substring(0, 6);
  const birthDateCheck = line2[6];
  const sex = line2[7];
  const expirationDate = line2.substring(8, 14);
  const expirationDateCheck = line2[14];
  const nationality = line2.substring(15, 18);
  const optionalData2 = line2.substring(18, 29);
  const overallCheck = line2[29];

  // Line 3 parsing
  const nameField = line3;
  const { lastName, firstName, middleName } = parseName(nameField);

  // Validate check digits
  if (!validateCheckDigit(documentNumber, documentNumberCheck)) {
    errors.push('Invalid document number check digit');
    checkDigitsValid = false;
  }

  if (!validateCheckDigit(birthDate, birthDateCheck)) {
    errors.push('Invalid birth date check digit');
    checkDigitsValid = false;
  }

  if (!validateCheckDigit(expirationDate, expirationDateCheck)) {
    errors.push('Invalid expiration date check digit');
    checkDigitsValid = false;
  }

  // Overall check digit (composite of: doc number + check + optional1 + birth date + check + expiration + check + optional2)
  const compositeString =
    documentNumber +
    documentNumberCheck +
    optionalData1 +
    birthDate +
    birthDateCheck +
    expirationDate +
    expirationDateCheck +
    optionalData2;

  if (!validateCheckDigit(compositeString, overallCheck)) {
    errors.push('Invalid overall check digit');
    checkDigitsValid = false;
  }

  // Validate country codes
  if (!isValidCountryCode(issuingCountry)) {
    errors.push('Invalid issuing country code');
  }

  if (!isValidCountryCode(nationality)) {
    errors.push('Invalid nationality code');
  }

  return {
    documentType: parseDocumentType(documentCode),
    documentCode: cleanField(documentCode),
    issuingCountry: cleanField(issuingCountry),
    documentNumber: cleanField(documentNumber),
    lastName,
    firstName,
    middleName,
    nationality: cleanField(nationality),
    dateOfBirth: parseMRZDate(applyContextCorrections(birthDate, true)),
    gender: parseGender(sex),
    expirationDate: parseMRZDate(applyContextCorrections(expirationDate, true)),
    optionalData1: cleanField(optionalData1) || undefined,
    optionalData2: cleanField(optionalData2) || undefined,
    validationErrors: errors,
    checkDigitsValid,
  };
}

/**
 * Parse TD2 format (travel documents) - 2 lines x 36 characters
 *
 * Line 1: Document code (2) + Issuing country (3) + Name (31)
 * Line 2: Document number (9) + Check digit (1) + Nationality (3) + Date of birth (6) + Check digit (1) + Sex (1) + Expiration date (6) + Check digit (1) + Optional data (7) + Overall check digit (1)
 */
function parseTD2(lines: string[]): Partial<MRZData> & { validationErrors: string[]; checkDigitsValid: boolean } {
  const errors: string[] = [];
  let checkDigitsValid = true;

  const line1 = lines[0];
  const line2 = lines[1];

  // Line 1 parsing
  const documentCode = line1.substring(0, 2);
  const issuingCountry = line1.substring(2, 5);
  const nameField = line1.substring(5, 36);
  const { lastName, firstName, middleName } = parseName(nameField);

  // Line 2 parsing
  const documentNumber = line2.substring(0, 9);
  const documentNumberCheck = line2[9];
  const nationality = line2.substring(10, 13);
  const birthDate = line2.substring(13, 19);
  const birthDateCheck = line2[19];
  const sex = line2[20];
  const expirationDate = line2.substring(21, 27);
  const expirationDateCheck = line2[27];
  const optionalData = line2.substring(28, 35);
  const overallCheck = line2[35];

  // Validate check digits
  if (!validateCheckDigit(documentNumber, documentNumberCheck)) {
    errors.push('Invalid document number check digit');
    checkDigitsValid = false;
  }

  if (!validateCheckDigit(birthDate, birthDateCheck)) {
    errors.push('Invalid birth date check digit');
    checkDigitsValid = false;
  }

  if (!validateCheckDigit(expirationDate, expirationDateCheck)) {
    errors.push('Invalid expiration date check digit');
    checkDigitsValid = false;
  }

  // Overall check digit
  const compositeString =
    documentNumber +
    documentNumberCheck +
    birthDate +
    birthDateCheck +
    expirationDate +
    expirationDateCheck +
    optionalData;

  if (!validateCheckDigit(compositeString, overallCheck)) {
    errors.push('Invalid overall check digit');
    checkDigitsValid = false;
  }

  // Validate country codes
  if (!isValidCountryCode(issuingCountry)) {
    errors.push('Invalid issuing country code');
  }

  if (!isValidCountryCode(nationality)) {
    errors.push('Invalid nationality code');
  }

  return {
    documentType: parseDocumentType(documentCode),
    documentCode: cleanField(documentCode),
    issuingCountry: cleanField(issuingCountry),
    documentNumber: cleanField(documentNumber),
    lastName,
    firstName,
    middleName,
    nationality: cleanField(nationality),
    dateOfBirth: parseMRZDate(applyContextCorrections(birthDate, true)),
    gender: parseGender(sex),
    expirationDate: parseMRZDate(applyContextCorrections(expirationDate, true)),
    optionalData1: cleanField(optionalData) || undefined,
    validationErrors: errors,
    checkDigitsValid,
  };
}

/**
 * Parse TD3 format (passports) - 2 lines x 44 characters
 *
 * Line 1: Document code (2) + Issuing country (3) + Name (39)
 * Line 2: Document number (9) + Check digit (1) + Nationality (3) + Date of birth (6) + Check digit (1) + Sex (1) + Expiration date (6) + Check digit (1) + Personal number (14) + Check digit (1) + Overall check digit (1)
 */
function parseTD3(lines: string[]): Partial<MRZData> & { validationErrors: string[]; checkDigitsValid: boolean } {
  const errors: string[] = [];
  let checkDigitsValid = true;

  const line1 = lines[0];
  const line2 = lines[1];

  // Line 1 parsing
  const documentCode = line1.substring(0, 2);
  const issuingCountry = line1.substring(2, 5);
  const nameField = line1.substring(5, 44);
  const { lastName, firstName, middleName } = parseName(nameField);

  // Line 2 parsing
  const documentNumber = line2.substring(0, 9);
  const documentNumberCheck = line2[9];
  const nationality = line2.substring(10, 13);
  const birthDate = line2.substring(13, 19);
  const birthDateCheck = line2[19];
  const sex = line2[20];
  const expirationDate = line2.substring(21, 27);
  const expirationDateCheck = line2[27];
  const personalNumber = line2.substring(28, 42);
  const personalNumberCheck = line2[42];
  const overallCheck = line2[43];

  // Validate check digits
  if (!validateCheckDigit(documentNumber, documentNumberCheck)) {
    errors.push('Invalid document number check digit');
    checkDigitsValid = false;
  }

  if (!validateCheckDigit(birthDate, birthDateCheck)) {
    errors.push('Invalid birth date check digit');
    checkDigitsValid = false;
  }

  if (!validateCheckDigit(expirationDate, expirationDateCheck)) {
    errors.push('Invalid expiration date check digit');
    checkDigitsValid = false;
  }

  if (!validateCheckDigit(personalNumber, personalNumberCheck)) {
    errors.push('Invalid personal number check digit');
    checkDigitsValid = false;
  }

  // Overall check digit
  const compositeString =
    documentNumber +
    documentNumberCheck +
    birthDate +
    birthDateCheck +
    expirationDate +
    expirationDateCheck +
    personalNumber +
    personalNumberCheck;

  if (!validateCheckDigit(compositeString, overallCheck)) {
    errors.push('Invalid overall check digit');
    checkDigitsValid = false;
  }

  // Validate country codes
  if (!isValidCountryCode(issuingCountry)) {
    errors.push('Invalid issuing country code');
  }

  if (!isValidCountryCode(nationality)) {
    errors.push('Invalid nationality code');
  }

  return {
    documentType: parseDocumentType(documentCode),
    documentCode: cleanField(documentCode),
    issuingCountry: cleanField(issuingCountry),
    documentNumber: cleanField(documentNumber),
    lastName,
    firstName,
    middleName,
    nationality: cleanField(nationality),
    dateOfBirth: parseMRZDate(applyContextCorrections(birthDate, true)),
    gender: parseGender(sex),
    expirationDate: parseMRZDate(applyContextCorrections(expirationDate, true)),
    personalNumber: cleanField(personalNumber) || undefined,
    validationErrors: errors,
    checkDigitsValid,
  };
}

/**
 * Parse MRVA format (Visa Type A) - 2 lines x 44 characters
 *
 * Line 1: Document code (2) + Issuing country (3) + Name (39)
 * Line 2: Document number (9) + Check digit (1) + Nationality (3) + Date of birth (6) + Check digit (1) + Sex (1) + Expiration date (6) + Check digit (1) + Optional data (16)
 *
 * Note: MRVA has no overall check digit
 */
function parseMRVA(lines: string[]): Partial<MRZData> & { validationErrors: string[]; checkDigitsValid: boolean } {
  const errors: string[] = [];
  let checkDigitsValid = true;

  const line1 = lines[0];
  const line2 = lines[1];

  // Line 1 parsing
  const documentCode = line1.substring(0, 2);
  const issuingCountry = line1.substring(2, 5);
  const nameField = line1.substring(5, 44);
  const { lastName, firstName, middleName } = parseName(nameField);

  // Line 2 parsing
  const documentNumber = line2.substring(0, 9);
  const documentNumberCheck = line2[9];
  const nationality = line2.substring(10, 13);
  const birthDate = line2.substring(13, 19);
  const birthDateCheck = line2[19];
  const sex = line2[20];
  const expirationDate = line2.substring(21, 27);
  const expirationDateCheck = line2[27];
  const optionalData = line2.substring(28, 44);

  // Validate check digits (no overall check digit for MRVA)
  if (!validateCheckDigit(documentNumber, documentNumberCheck)) {
    errors.push('Invalid document number check digit');
    checkDigitsValid = false;
  }

  if (!validateCheckDigit(birthDate, birthDateCheck)) {
    errors.push('Invalid birth date check digit');
    checkDigitsValid = false;
  }

  if (!validateCheckDigit(expirationDate, expirationDateCheck)) {
    errors.push('Invalid expiration date check digit');
    checkDigitsValid = false;
  }

  // Validate country codes
  if (!isValidCountryCode(issuingCountry)) {
    errors.push('Invalid issuing country code');
  }

  if (!isValidCountryCode(nationality)) {
    errors.push('Invalid nationality code');
  }

  return {
    documentType: 'V',
    documentCode: cleanField(documentCode),
    issuingCountry: cleanField(issuingCountry),
    documentNumber: cleanField(documentNumber),
    lastName,
    firstName,
    middleName,
    nationality: cleanField(nationality),
    dateOfBirth: parseMRZDate(applyContextCorrections(birthDate, true)),
    gender: parseGender(sex),
    expirationDate: parseMRZDate(applyContextCorrections(expirationDate, true)),
    optionalData1: cleanField(optionalData) || undefined,
    validationErrors: errors,
    checkDigitsValid,
  };
}

/**
 * Parse MRVB format (Visa Type B) - 2 lines x 36 characters
 *
 * Line 1: Document code (2) + Issuing country (3) + Name (31)
 * Line 2: Document number (9) + Check digit (1) + Nationality (3) + Date of birth (6) + Check digit (1) + Sex (1) + Expiration date (6) + Check digit (1) + Optional data (8)
 *
 * Note: MRVB has no overall check digit
 */
function parseMRVB(lines: string[]): Partial<MRZData> & { validationErrors: string[]; checkDigitsValid: boolean } {
  const errors: string[] = [];
  let checkDigitsValid = true;

  const line1 = lines[0];
  const line2 = lines[1];

  // Line 1 parsing
  const documentCode = line1.substring(0, 2);
  const issuingCountry = line1.substring(2, 5);
  const nameField = line1.substring(5, 36);
  const { lastName, firstName, middleName } = parseName(nameField);

  // Line 2 parsing
  const documentNumber = line2.substring(0, 9);
  const documentNumberCheck = line2[9];
  const nationality = line2.substring(10, 13);
  const birthDate = line2.substring(13, 19);
  const birthDateCheck = line2[19];
  const sex = line2[20];
  const expirationDate = line2.substring(21, 27);
  const expirationDateCheck = line2[27];
  const optionalData = line2.substring(28, 36);

  // Validate check digits (no overall check digit for MRVB)
  if (!validateCheckDigit(documentNumber, documentNumberCheck)) {
    errors.push('Invalid document number check digit');
    checkDigitsValid = false;
  }

  if (!validateCheckDigit(birthDate, birthDateCheck)) {
    errors.push('Invalid birth date check digit');
    checkDigitsValid = false;
  }

  if (!validateCheckDigit(expirationDate, expirationDateCheck)) {
    errors.push('Invalid expiration date check digit');
    checkDigitsValid = false;
  }

  // Validate country codes
  if (!isValidCountryCode(issuingCountry)) {
    errors.push('Invalid issuing country code');
  }

  if (!isValidCountryCode(nationality)) {
    errors.push('Invalid nationality code');
  }

  return {
    documentType: 'V',
    documentCode: cleanField(documentCode),
    issuingCountry: cleanField(issuingCountry),
    documentNumber: cleanField(documentNumber),
    lastName,
    firstName,
    middleName,
    nationality: cleanField(nationality),
    dateOfBirth: parseMRZDate(applyContextCorrections(birthDate, true)),
    gender: parseGender(sex),
    expirationDate: parseMRZDate(applyContextCorrections(expirationDate, true)),
    optionalData1: cleanField(optionalData) || undefined,
    validationErrors: errors,
    checkDigitsValid,
  };
}

/**
 * Main MRZ parser function
 *
 * Accepts either a string (raw OCR text) or an array of MRZ lines.
 * Automatically detects the MRZ format and parses accordingly.
 *
 * @param input - Raw OCR text or array of MRZ lines
 * @returns Parsed MRZ data or null if parsing fails
 */
export function parseMRZ(input: string | string[]): MRZData | null {
  let lines: string[];

  // Handle input
  if (typeof input === 'string') {
    lines = extractMRZLines(input);
  } else {
    // Clean provided lines
    lines = input.map((line) => cleanOCRText(line).replace(/[\r\n]/g, ''));
  }

  // Validate we have enough lines
  if (lines.length < 2) {
    return null;
  }

  // Detect format
  const format = detectMRZFormat(lines);

  if (format === 'unknown') {
    return null;
  }

  // Parse based on format
  let parsed: Partial<MRZData> & { validationErrors: string[]; checkDigitsValid: boolean };

  switch (format) {
    case 'TD1':
      if (lines.length < 3) return null;
      parsed = parseTD1(lines);
      break;
    case 'TD2':
      parsed = parseTD2(lines);
      break;
    case 'TD3':
      parsed = parseTD3(lines);
      break;
    case 'MRVA':
      parsed = parseMRVA(lines);
      break;
    case 'MRVB':
      parsed = parseMRVB(lines);
      break;
    default:
      return null;
  }

  // Build final result
  const result: MRZData = {
    documentType: parsed.documentType || 'unknown',
    documentCode: parsed.documentCode || '',
    issuingCountry: parsed.issuingCountry || '',
    documentNumber: parsed.documentNumber || '',
    lastName: parsed.lastName || '',
    firstName: parsed.firstName || '',
    middleName: parsed.middleName,
    nationality: parsed.nationality || '',
    dateOfBirth: parsed.dateOfBirth || '',
    gender: parsed.gender || 'unknown',
    expirationDate: parsed.expirationDate || '',
    personalNumber: parsed.personalNumber,
    optionalData1: parsed.optionalData1,
    optionalData2: parsed.optionalData2,
    format,
    rawLines: lines,
    isValid: parsed.checkDigitsValid && parsed.validationErrors.length === 0,
    checkDigitsValid: parsed.checkDigitsValid,
    validationErrors: parsed.validationErrors,
  };

  return result;
}

export default parseMRZ;
