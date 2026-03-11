/**
 * MRZ (Machine Readable Zone) Parser
 *
 * Parses MRZ data from passports and ID cards following ICAO 9303 standard.
 * Supports TD1 (ID cards), TD2 (older passports), and TD3 (modern passports) formats.
 */

export interface MRZData {
  // Document info
  documentType: 'passport' | 'id_card' | 'visa' | 'unknown';
  documentCode: string;
  issuingCountry: string;
  documentNumber: string;

  // Personal info
  lastName: string;
  firstName: string;
  middleName?: string;
  nationality: string;
  dateOfBirth: string; // YYYY-MM-DD
  gender: 'M' | 'F' | 'X' | 'unknown';

  // Validity
  expirationDate: string; // YYYY-MM-DD

  // Optional data
  personalNumber?: string;
  optionalData1?: string;
  optionalData2?: string;

  // Validation
  isValid: boolean;
  validationErrors: string[];

  // Raw data
  rawMRZ: string[];
  format: 'TD1' | 'TD2' | 'TD3' | 'unknown';
}

// Check digit calculation (mod 10 algorithm)
function calculateCheckDigit(input: string): number {
  const weights = [7, 3, 1];
  let sum = 0;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    let value: number;

    if (char === '<') {
      value = 0;
    } else if (char >= '0' && char <= '9') {
      value = parseInt(char, 10);
    } else if (char >= 'A' && char <= 'Z') {
      value = char.charCodeAt(0) - 55; // A=10, B=11, etc.
    } else {
      value = 0;
    }

    sum += value * weights[i % 3];
  }

  return sum % 10;
}

// Validate a field with its check digit
function validateField(field: string, checkDigit: string): boolean {
  const calculated = calculateCheckDigit(field);
  const expected = parseInt(checkDigit, 10);
  return calculated === expected;
}

// Parse date from YYMMDD format to YYYY-MM-DD
function parseMRZDate(dateStr: string): string {
  if (dateStr.length !== 6) return '';

  const yy = parseInt(dateStr.substring(0, 2), 10);
  const mm = dateStr.substring(2, 4);
  const dd = dateStr.substring(4, 6);

  // Assume dates in the past for DOB, future for expiration
  // Use pivot year of 30 (dates 00-29 are 2000s, 30-99 are 1900s for DOB)
  const currentYear = new Date().getFullYear() % 100;
  const century = yy <= currentYear + 10 ? '20' : '19';

  return `${century}${yy.toString().padStart(2, '0')}-${mm}-${dd}`;
}

// Clean filler characters and extract name
function parseName(nameField: string): { lastName: string; firstName: string; middleName?: string } {
  // Names are separated by '<<', first is last name, then first names
  const parts = nameField.split('<<').filter(p => p.length > 0);

  const lastName = (parts[0] || '').replace(/</g, ' ').trim();
  const firstNames = (parts[1] || '').replace(/</g, ' ').trim().split(' ');

  const firstName = firstNames[0] || '';
  const middleName = firstNames.slice(1).join(' ') || undefined;

  return { lastName, firstName, middleName };
}

// Parse gender code
function parseGender(code: string): 'M' | 'F' | 'X' | 'unknown' {
  switch (code.toUpperCase()) {
    case 'M': return 'M';
    case 'F': return 'F';
    case 'X': return 'X';
    case '<': return 'unknown';
    default: return 'unknown';
  }
}

// Determine document type from code
function parseDocumentType(code: string): MRZData['documentType'] {
  const firstChar = code[0]?.toUpperCase();
  switch (firstChar) {
    case 'P': return 'passport';
    case 'I':
    case 'A':
    case 'C': return 'id_card';
    case 'V': return 'visa';
    default: return 'unknown';
  }
}

/**
 * Parse TD3 format (Passport - 2 lines of 44 characters)
 */
function parseTD3(lines: string[]): MRZData {
  const errors: string[] = [];
  const line1 = lines[0].padEnd(44, '<');
  const line2 = lines[1].padEnd(44, '<');

  // Line 1: P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<
  const documentCode = line1.substring(0, 2).replace(/</g, '');
  const issuingCountry = line1.substring(2, 5).replace(/</g, '');
  const nameField = line1.substring(5, 44);
  const { lastName, firstName, middleName } = parseName(nameField);

  // Line 2: L898902C36UTO7408122F1204159ZE184226B<<<<<10
  const documentNumber = line2.substring(0, 9).replace(/</g, '');
  const docNumCheck = line2.substring(9, 10);
  const nationality = line2.substring(10, 13).replace(/</g, '');
  const birthDate = line2.substring(13, 19);
  const birthCheck = line2.substring(19, 20);
  const gender = parseGender(line2.substring(20, 21));
  const expirationDate = line2.substring(21, 27);
  const expCheck = line2.substring(27, 28);
  const personalNumber = line2.substring(28, 42).replace(/</g, '') || undefined;
  const personalCheck = line2.substring(42, 43);
  const compositeCheck = line2.substring(43, 44);

  // Validate check digits
  if (!validateField(documentNumber.padEnd(9, '<'), docNumCheck)) {
    errors.push('Document number check digit invalid');
  }
  if (!validateField(birthDate, birthCheck)) {
    errors.push('Birth date check digit invalid');
  }
  if (!validateField(expirationDate, expCheck)) {
    errors.push('Expiration date check digit invalid');
  }

  return {
    documentType: parseDocumentType(documentCode),
    documentCode,
    issuingCountry,
    documentNumber,
    lastName,
    firstName,
    middleName,
    nationality,
    dateOfBirth: parseMRZDate(birthDate),
    gender,
    expirationDate: parseMRZDate(expirationDate),
    personalNumber,
    isValid: errors.length === 0,
    validationErrors: errors,
    rawMRZ: lines,
    format: 'TD3'
  };
}

/**
 * Parse TD1 format (ID Card - 3 lines of 30 characters)
 */
function parseTD1(lines: string[]): MRZData {
  const errors: string[] = [];
  const line1 = lines[0].padEnd(30, '<');
  const line2 = lines[1].padEnd(30, '<');
  const line3 = lines[2].padEnd(30, '<');

  // Line 1
  const documentCode = line1.substring(0, 2).replace(/</g, '');
  const issuingCountry = line1.substring(2, 5).replace(/</g, '');
  const documentNumber = line1.substring(5, 14).replace(/</g, '');
  const docNumCheck = line1.substring(14, 15);
  const optionalData1 = line1.substring(15, 30).replace(/</g, '') || undefined;

  // Line 2
  const birthDate = line2.substring(0, 6);
  const birthCheck = line2.substring(6, 7);
  const gender = parseGender(line2.substring(7, 8));
  const expirationDate = line2.substring(8, 14);
  const expCheck = line2.substring(14, 15);
  const nationality = line2.substring(15, 18).replace(/</g, '');
  const optionalData2 = line2.substring(18, 29).replace(/</g, '') || undefined;
  const compositeCheck = line2.substring(29, 30);

  // Line 3
  const nameField = line3;
  const { lastName, firstName, middleName } = parseName(nameField);

  // Validate check digits
  if (!validateField(documentNumber.padEnd(9, '<'), docNumCheck)) {
    errors.push('Document number check digit invalid');
  }
  if (!validateField(birthDate, birthCheck)) {
    errors.push('Birth date check digit invalid');
  }
  if (!validateField(expirationDate, expCheck)) {
    errors.push('Expiration date check digit invalid');
  }

  return {
    documentType: parseDocumentType(documentCode),
    documentCode,
    issuingCountry,
    documentNumber,
    lastName,
    firstName,
    middleName,
    nationality,
    dateOfBirth: parseMRZDate(birthDate),
    gender,
    expirationDate: parseMRZDate(expirationDate),
    optionalData1,
    optionalData2,
    isValid: errors.length === 0,
    validationErrors: errors,
    rawMRZ: lines,
    format: 'TD1'
  };
}

/**
 * Parse TD2 format (Older passports/visas - 2 lines of 36 characters)
 */
function parseTD2(lines: string[]): MRZData {
  const errors: string[] = [];
  const line1 = lines[0].padEnd(36, '<');
  const line2 = lines[1].padEnd(36, '<');

  // Line 1
  const documentCode = line1.substring(0, 2).replace(/</g, '');
  const issuingCountry = line1.substring(2, 5).replace(/</g, '');
  const nameField = line1.substring(5, 36);
  const { lastName, firstName, middleName } = parseName(nameField);

  // Line 2
  const documentNumber = line2.substring(0, 9).replace(/</g, '');
  const docNumCheck = line2.substring(9, 10);
  const nationality = line2.substring(10, 13).replace(/</g, '');
  const birthDate = line2.substring(13, 19);
  const birthCheck = line2.substring(19, 20);
  const gender = parseGender(line2.substring(20, 21));
  const expirationDate = line2.substring(21, 27);
  const expCheck = line2.substring(27, 28);
  const optionalData1 = line2.substring(28, 35).replace(/</g, '') || undefined;
  const compositeCheck = line2.substring(35, 36);

  // Validate check digits
  if (!validateField(documentNumber.padEnd(9, '<'), docNumCheck)) {
    errors.push('Document number check digit invalid');
  }
  if (!validateField(birthDate, birthCheck)) {
    errors.push('Birth date check digit invalid');
  }
  if (!validateField(expirationDate, expCheck)) {
    errors.push('Expiration date check digit invalid');
  }

  return {
    documentType: parseDocumentType(documentCode),
    documentCode,
    issuingCountry,
    documentNumber,
    lastName,
    firstName,
    middleName,
    nationality,
    dateOfBirth: parseMRZDate(birthDate),
    gender,
    expirationDate: parseMRZDate(expirationDate),
    optionalData1,
    isValid: errors.length === 0,
    validationErrors: errors,
    rawMRZ: lines,
    format: 'TD2'
  };
}

/**
 * Detect MRZ format based on line count and length
 */
function detectFormat(lines: string[]): 'TD1' | 'TD2' | 'TD3' | 'unknown' {
  if (lines.length === 2) {
    const avgLength = (lines[0].length + lines[1].length) / 2;
    if (avgLength >= 42) return 'TD3';
    if (avgLength >= 34) return 'TD2';
  }
  if (lines.length === 3) {
    return 'TD1';
  }
  return 'unknown';
}

/**
 * Clean and normalize OCR text for MRZ parsing
 * Handles common OCR errors and character substitutions
 */
function cleanOCRText(text: string): string {
  return text
    .toUpperCase()
    // Common OCR misreads for '<' filler character
    .replace(/[«»‹›<>]/g, '<')
    .replace(/[Kk]</g, '<<') // K< often misread
    .replace(/\s*<\s*/g, '<') // Remove spaces around <
    // Common letter/number substitutions
    .replace(/[оО]/g, 'O') // Cyrillic О to Latin O
    .replace(/[іІ]/g, 'I') // Cyrillic І to Latin I
    .replace(/[аА]/g, 'A') // Cyrillic А to Latin A
    .replace(/[еЕ]/g, 'E') // Cyrillic Е to Latin E
    .replace(/[сС]/g, 'C') // Cyrillic С to Latin C
    // Remove any remaining non-MRZ characters but keep spaces/newlines
    .replace(/[^A-Z0-9<\r\n\s]/g, '');
}

/**
 * Clean OCR text to extract MRZ lines
 */
export function extractMRZLines(ocrText: string): string[] {
  console.log('[MRZ Parser] Raw OCR text:', ocrText.substring(0, 200));

  // Clean the OCR text first
  const cleanedText = cleanOCRText(ocrText);
  console.log('[MRZ Parser] Cleaned text:', cleanedText.substring(0, 200));

  // Split into lines and filter
  let lines = cleanedText
    .split(/[\r\n]+/)
    .map(line => line.replace(/\s+/g, '').trim()) // Remove all whitespace within line
    .filter(line => {
      // MRZ lines contain only A-Z, 0-9, and < characters
      // And are at least 28 characters long
      const isValid = line.length >= 28 && /^[A-Z0-9<]+$/.test(line);
      if (line.length >= 20) {
        console.log('[MRZ Parser] Line candidate:', line.length, 'chars, valid:', isValid, line.substring(0, 50));
      }
      return isValid;
    });

  console.log('[MRZ Parser] Found', lines.length, 'potential MRZ lines');

  // If we have more lines than expected, try to find the MRZ section
  // MRZ lines typically start with P, I, A, C, or V for document type
  if (lines.length > 3) {
    const startIdx = lines.findIndex(line => /^[PIACV]/.test(line));
    if (startIdx >= 0) {
      const format = lines[startIdx].length >= 42 ? 'TD3' :
                     lines[startIdx].length >= 34 ? 'TD2' : 'TD1';
      const lineCount = format === 'TD1' ? 3 : 2;
      lines = lines.slice(startIdx, startIdx + lineCount);
      console.log('[MRZ Parser] Extracted', lineCount, 'lines starting at index', startIdx);
    }
  }

  // If still no valid lines, try more aggressive extraction
  if (lines.length < 2) {
    console.log('[MRZ Parser] Trying aggressive extraction...');
    // Look for any sequence that looks like MRZ (lots of < characters)
    const mrzPattern = /[A-Z0-9<]{28,}/g;
    const matches = cleanedText.replace(/[\r\n\s]/g, '').match(mrzPattern);
    if (matches && matches.length >= 2) {
      lines = matches.slice(0, 3);
      console.log('[MRZ Parser] Aggressive extraction found', lines.length, 'segments');
    }
  }

  return lines;
}

/**
 * Main parser function
 */
export function parseMRZ(input: string | string[]): MRZData | null {
  try {
    console.log('[MRZ Parser] === Starting MRZ Parse ===');
    console.log('[MRZ Parser] Input type:', Array.isArray(input) ? 'array' : 'string');

    // Handle string input
    const lines = Array.isArray(input) ? input : extractMRZLines(input);

    console.log('[MRZ Parser] Extracted lines:', lines.length);
    lines.forEach((line, i) => console.log(`[MRZ Parser] Line ${i + 1}:`, line));

    if (lines.length < 2) {
      console.log('[MRZ Parser] Not enough lines for MRZ (need at least 2)');
      return null;
    }

    // Detect format
    const format = detectFormat(lines);
    console.log('[MRZ Parser] Detected format:', format);

    let result: MRZData | null = null;

    switch (format) {
      case 'TD3':
        result = parseTD3(lines);
        break;
      case 'TD2':
        result = parseTD2(lines);
        break;
      case 'TD1':
        result = parseTD1(lines);
        break;
      default:
        console.log('[MRZ Parser] Unknown format, trying TD3 as fallback');
        // Try TD3 as fallback if lines are long enough
        if (lines[0].length >= 40 && lines[1].length >= 40) {
          result = parseTD3(lines);
        }
    }

    if (result) {
      console.log('[MRZ Parser] === Parse Result ===');
      console.log('[MRZ Parser] Name:', result.firstName, result.lastName);
      console.log('[MRZ Parser] DOB:', result.dateOfBirth);
      console.log('[MRZ Parser] Document:', result.documentNumber);
      console.log('[MRZ Parser] Country:', result.issuingCountry);
      console.log('[MRZ Parser] Valid:', result.isValid);
      if (result.validationErrors.length > 0) {
        console.log('[MRZ Parser] Validation errors:', result.validationErrors);
      }
    }

    return result;
  } catch (error) {
    console.error('[MRZ Parser] Parsing error:', error);
    return null;
  }
}

/**
 * Validate if text looks like MRZ
 */
export function isMRZLike(text: string): boolean {
  // Quick check for MRZ-like patterns
  const cleanText = text.toUpperCase().replace(/\s+/g, '');

  // Check for typical MRZ patterns:
  // 1. Multiple '<' characters (filler)
  // 2. Starts with P, I, A, C, or V (document type)
  // 3. Has long sequences of alphanumeric + <

  const hasFillers = (cleanText.match(/</g) || []).length >= 5;
  const hasDocType = /[PIACV][A-Z<]/.test(cleanText);
  const hasLongSequence = /[A-Z0-9<]{30,}/.test(cleanText);

  const result = hasFillers && (hasDocType || hasLongSequence);
  console.log('[MRZ Parser] isMRZLike check:', { hasFillers, hasDocType, hasLongSequence, result });

  return result;
}

export default {
  parseMRZ,
  extractMRZLines,
  isMRZLike
};
