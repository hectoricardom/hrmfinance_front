/**
 * AAMVA Parser
 *
 * Parses PDF417 barcode data from US driver's licenses according to
 * AAMVA (American Association of Motor Vehicle Administrators) standards.
 *
 * Supports AAMVA versions 01-10+
 */

import { AAMVAData, AAMVA_FIELD_CODES } from './types';

// AAMVA format constants
const AAMVA_HEADER_INDICATOR = '@';
const AAMVA_COMPLIANCE_INDICATOR = '\n';
const AAMVA_DATA_ELEMENT_SEPARATOR = '\n';
const AAMVA_RECORD_SEPARATOR = '\x1e'; // ASCII 30
const AAMVA_SEGMENT_TERMINATOR = '\r'; // ASCII 13
const AAMVA_FILE_TYPE = 'ANSI ';

// Subfile type identifiers
const SUBFILE_TYPE_DL = 'DL';
const SUBFILE_TYPE_ID = 'ID';

// Gender code mapping
const GENDER_CODES: Record<string, AAMVAData['gender']> = {
  '1': 'M',
  '2': 'F',
  '9': 'X',
  M: 'M',
  F: 'F',
  X: 'X',
};

// Eye color codes
const EYE_COLOR_CODES: Record<string, string> = {
  BLK: 'Black',
  BLU: 'Blue',
  BRO: 'Brown',
  GRY: 'Gray',
  GRN: 'Green',
  HAZ: 'Hazel',
  MAR: 'Maroon',
  PNK: 'Pink',
  DIC: 'Dichromatic',
  UNK: 'Unknown',
};

// Hair color codes
const HAIR_COLOR_CODES: Record<string, string> = {
  BAL: 'Bald',
  BLK: 'Black',
  BLN: 'Blond',
  BRO: 'Brown',
  GRY: 'Gray',
  RED: 'Red/Auburn',
  SDY: 'Sandy',
  WHI: 'White',
  UNK: 'Unknown',
};

/**
 * Detects if the given data string is in AAMVA format
 */
export function isAAMVAFormat(data: string): boolean {
  if (!data || typeof data !== 'string') {
    return false;
  }

  // Check for AAMVA compliance indicator at the start
  // Format typically starts with @ followed by compliance indicator
  const trimmed = data.trim();

  // Check for common AAMVA header patterns
  if (trimmed.startsWith('@')) {
    return true;
  }

  // Check for ANSI header (some versions)
  if (trimmed.includes(AAMVA_FILE_TYPE)) {
    return true;
  }

  // Check for subfile markers
  if (trimmed.includes('DAQ') || trimmed.includes('DCS') || trimmed.includes('DBB')) {
    // Additional check for DL or ID subfile markers
    if (trimmed.includes(SUBFILE_TYPE_DL) || trimmed.includes(SUBFILE_TYPE_ID)) {
      return true;
    }
  }

  return false;
}

/**
 * Parses a date string from AAMVA format to ISO format (YYYY-MM-DD)
 * AAMVA dates can be in MMDDYYYY or YYYYMMDD format depending on version
 */
function parseAAMVADate(dateStr: string, version: number): string {
  if (!dateStr || dateStr.length < 8) {
    return '';
  }

  // Clean the date string
  const cleaned = dateStr.replace(/[^0-9]/g, '');

  if (cleaned.length < 8) {
    return '';
  }

  // Version 01-03 typically use MMDDYYYY
  // Version 04+ typically use MMDDYYYY but some jurisdictions use YYYYMMDD
  let year: string;
  let month: string;
  let day: string;

  // Try to detect format by checking if first 4 digits look like a year
  const first4 = parseInt(cleaned.substring(0, 4), 10);
  const mid4 = parseInt(cleaned.substring(2, 6), 10);

  if (first4 >= 1900 && first4 <= 2100) {
    // YYYYMMDD format
    year = cleaned.substring(0, 4);
    month = cleaned.substring(4, 6);
    day = cleaned.substring(6, 8);
  } else {
    // MMDDYYYY format (most common)
    month = cleaned.substring(0, 2);
    day = cleaned.substring(2, 4);
    year = cleaned.substring(4, 8);
  }

  // Validate parsed values
  const yearNum = parseInt(year, 10);
  const monthNum = parseInt(month, 10);
  const dayNum = parseInt(day, 10);

  if (yearNum < 1900 || yearNum > 2100) {
    return '';
  }
  if (monthNum < 1 || monthNum > 12) {
    return '';
  }
  if (dayNum < 1 || dayNum > 31) {
    return '';
  }

  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

/**
 * Parses the AAMVA version from the header
 */
function parseAAMVAVersion(data: string): number {
  // Version is typically at a fixed position after the header
  // Format: @\nANSI 636000010102DL...
  // The version is the 2 digits after the IIN (6 digits) and before the jurisdiction version

  const ansiMatch = data.match(/ANSI\s*(\d{6})(\d{2})/);
  if (ansiMatch) {
    return parseInt(ansiMatch[2], 10);
  }

  // Try alternative pattern
  const versionMatch = data.match(/@.*?(\d{2})DL/);
  if (versionMatch) {
    const ver = parseInt(versionMatch[1], 10);
    if (ver >= 1 && ver <= 99) {
      return ver;
    }
  }

  // Default to version 1 if not detected
  return 1;
}

/**
 * Extracts the issuing jurisdiction IIN from the header
 */
function parseIIN(data: string): string {
  const ansiMatch = data.match(/ANSI\s*(\d{6})/);
  if (ansiMatch) {
    return ansiMatch[1];
  }
  return '';
}

/**
 * Cleans a field value by removing control characters and trimming
 */
function cleanFieldValue(value: string): string {
  if (!value) {
    return '';
  }

  return value
    .replace(/[\x00-\x1f\x7f]/g, '') // Remove control characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Parses height from AAMVA format
 * Can be in format: 509 (5'09"), 5-09, 5'09", 69 IN, 175 CM, etc.
 */
function parseHeight(value: string): string {
  if (!value) {
    return '';
  }

  const cleaned = cleanFieldValue(value).toUpperCase();

  // Check for CM format
  const cmMatch = cleaned.match(/(\d+)\s*CM/);
  if (cmMatch) {
    return `${cmMatch[1]} cm`;
  }

  // Check for IN format
  const inMatch = cleaned.match(/(\d+)\s*IN/);
  if (inMatch) {
    const inches = parseInt(inMatch[1], 10);
    const feet = Math.floor(inches / 12);
    const remainingInches = inches % 12;
    return `${feet}'${remainingInches.toString().padStart(2, '0')}"`;
  }

  // Check for FT-IN format (e.g., 5-09, 509)
  const ftInMatch = cleaned.match(/(\d)[-']?(\d{2})/);
  if (ftInMatch) {
    return `${ftInMatch[1]}'${ftInMatch[2]}"`;
  }

  // Return as-is if no pattern matches
  return cleaned;
}

/**
 * Parses weight from AAMVA format
 * Can be in format: 180, 180 LBS, 82 KG, etc.
 */
function parseWeight(value: string): string {
  if (!value) {
    return '';
  }

  const cleaned = cleanFieldValue(value).toUpperCase();

  // Check for KG format
  const kgMatch = cleaned.match(/(\d+)\s*KG/);
  if (kgMatch) {
    return `${kgMatch[1]} kg`;
  }

  // Check for LBS format or plain number (assumed pounds)
  const lbsMatch = cleaned.match(/(\d+)\s*(LBS?|#)?/);
  if (lbsMatch) {
    return `${lbsMatch[1]} lbs`;
  }

  return cleaned;
}

/**
 * Parses the full name field (DAA) into components
 */
function parseFullName(fullName: string): {
  firstName: string;
  middleName: string;
  lastName: string;
} {
  const result = {
    firstName: '',
    middleName: '',
    lastName: '',
  };

  if (!fullName) {
    return result;
  }

  const cleaned = cleanFieldValue(fullName);

  // Full name is typically in format: LAST,FIRST,MIDDLE or LAST,FIRST MIDDLE
  const parts = cleaned.split(',').map((p) => p.trim());

  if (parts.length >= 1) {
    result.lastName = parts[0];
  }

  if (parts.length >= 2) {
    // First name may contain middle name
    const firstMiddle = parts[1].split(/\s+/);
    result.firstName = firstMiddle[0] || '';
    if (firstMiddle.length > 1) {
      result.middleName = firstMiddle.slice(1).join(' ');
    }
  }

  if (parts.length >= 3) {
    result.middleName = parts[2];
  }

  return result;
}

/**
 * Extracts fields from the raw AAMVA data
 */
function extractFields(data: string): Map<string, string> {
  const fields = new Map<string, string>();

  // Find the start of data elements (after header)
  // Data elements are separated by newlines or record separators
  const separators = /[\n\r\x1e\x1d]/;
  const elements = data.split(separators);

  for (const element of elements) {
    const trimmed = element.trim();
    if (trimmed.length < 3) {
      continue;
    }

    // Field code is typically 3 characters starting with D
    if (trimmed.startsWith('D')) {
      const code = trimmed.substring(0, 3);
      const value = trimmed.substring(3);

      // Only store if we recognize the code or it looks like a valid AAMVA code
      if (AAMVA_FIELD_CODES[code] || /^D[A-Z][A-Z]$/.test(code)) {
        fields.set(code, cleanFieldValue(value));
      }
    }

    // Also check for 4-character codes (some jurisdictions use these)
    if (trimmed.length >= 4 && trimmed.startsWith('D')) {
      const code4 = trimmed.substring(0, 4);
      if (/^D[A-Z][A-Z][A-Z]$/.test(code4)) {
        // Store with 3-char prefix if not already stored
        const code3 = code4.substring(0, 3);
        if (!fields.has(code3)) {
          fields.set(code4, cleanFieldValue(trimmed.substring(4)));
        }
      }
    }
  }

  return fields;
}

/**
 * Validates the parsed AAMVA data and returns validation errors
 */
function validateAAMVAData(data: Partial<AAMVAData>): string[] {
  const errors: string[] = [];

  // Required fields validation
  if (!data.lastName) {
    errors.push('Missing required field: lastName');
  }

  if (!data.firstName) {
    errors.push('Missing required field: firstName');
  }

  if (!data.dateOfBirth) {
    errors.push('Missing required field: dateOfBirth');
  } else {
    // Validate date format
    const dobDate = new Date(data.dateOfBirth);
    if (isNaN(dobDate.getTime())) {
      errors.push('Invalid date format: dateOfBirth');
    } else {
      // Check for reasonable date range
      const now = new Date();
      const minDate = new Date('1900-01-01');
      if (dobDate > now) {
        errors.push('Date of birth cannot be in the future');
      }
      if (dobDate < minDate) {
        errors.push('Date of birth is too far in the past');
      }
    }
  }

  if (!data.expirationDate) {
    errors.push('Missing required field: expirationDate');
  } else {
    const expDate = new Date(data.expirationDate);
    if (isNaN(expDate.getTime())) {
      errors.push('Invalid date format: expirationDate');
    }
  }

  if (!data.documentNumber) {
    errors.push('Missing required field: documentNumber');
  }

  if (!data.streetAddress) {
    errors.push('Missing required field: streetAddress');
  }

  if (!data.city) {
    errors.push('Missing required field: city');
  }

  if (!data.state) {
    errors.push('Missing required field: state');
  }

  if (!data.postalCode) {
    errors.push('Missing required field: postalCode');
  }

  return errors;
}

/**
 * Cleans and formats postal code
 */
function cleanPostalCode(value: string): string {
  if (!value) {
    return '';
  }

  // Remove any non-alphanumeric characters except hyphen
  let cleaned = value.replace(/[^a-zA-Z0-9-]/g, '').toUpperCase();

  // US ZIP codes - format as 5 digits or 5+4
  if (/^\d{9}$/.test(cleaned)) {
    return `${cleaned.substring(0, 5)}-${cleaned.substring(5)}`;
  }

  if (/^\d{5}$/.test(cleaned)) {
    return cleaned;
  }

  // Canadian postal codes - format as A1A 1A1
  if (/^[A-Z]\d[A-Z]\d[A-Z]\d$/i.test(cleaned)) {
    return `${cleaned.substring(0, 3)} ${cleaned.substring(3)}`;
  }

  return cleaned;
}

/**
 * Main AAMVA parser function
 * Parses PDF417 barcode data from US driver's licenses
 */
export function parseAAMVA(data: string): AAMVAData {
  // Initialize result with default values
  const result: AAMVAData = {
    firstName: '',
    lastName: '',
    streetAddress: '',
    city: '',
    state: '',
    postalCode: '',
    documentNumber: '',
    dateOfBirth: '',
    expirationDate: '',
    gender: 'unknown',
    isValid: false,
    validationErrors: [],
  };

  // Check if data is valid
  if (!data || typeof data !== 'string') {
    result.validationErrors.push('Invalid input: data is empty or not a string');
    return result;
  }

  // Check if data is in AAMVA format
  if (!isAAMVAFormat(data)) {
    result.validationErrors.push('Data does not appear to be in AAMVA format');
    return result;
  }

  try {
    // Parse version
    const version = parseAAMVAVersion(data);

    // Parse IIN (Issuer Identification Number)
    const iin = parseIIN(data);
    if (iin) {
      result.issuingJurisdiction = iin;
    }

    // Extract all fields
    const fields = extractFields(data);

    // Store jurisdiction-specific fields
    const jurisdictionSpecific: Record<string, string> = {};

    // Process each field
    fields.forEach((value, code) => {
      const fieldName = AAMVA_FIELD_CODES[code];

      switch (code) {
        // Name fields
        case 'DCS':
        case 'DAB':
        case 'DBN':
          result.lastName = value;
          break;

        case 'DCT':
        case 'DAC':
        case 'DBO':
          result.firstName = value;
          break;

        case 'DAD':
          result.middleName = value;
          break;

        case 'DAA': {
          // Full name - parse into components if individual fields are missing
          result.fullName = value;
          const nameParts = parseFullName(value);
          if (!result.lastName && nameParts.lastName) {
            result.lastName = nameParts.lastName;
          }
          if (!result.firstName && nameParts.firstName) {
            result.firstName = nameParts.firstName;
          }
          if (!result.middleName && nameParts.middleName) {
            result.middleName = nameParts.middleName;
          }
          break;
        }

        case 'DAN':
        case 'DAE':
          result.nameSuffix = value;
          break;

        // Address fields
        case 'DAG':
          result.streetAddress = value;
          break;

        case 'DAH':
          result.streetAddress2 = value;
          break;

        case 'DAI':
          result.city = value;
          break;

        case 'DAJ':
          result.state = value;
          break;

        case 'DAK':
          result.postalCode = cleanPostalCode(value);
          break;

        case 'DCG':
          result.country = value;
          break;

        // Document fields
        case 'DAQ':
          result.documentNumber = value;
          break;

        // Date fields
        case 'DBB':
          result.dateOfBirth = parseAAMVADate(value, version);
          break;

        case 'DBA':
          result.expirationDate = parseAAMVADate(value, version);
          break;

        case 'DBD':
          result.issueDate = parseAAMVADate(value, version);
          break;

        // Gender
        case 'DBC':
          result.gender = GENDER_CODES[value] || 'unknown';
          break;

        // Physical description
        case 'DAU':
          result.height = parseHeight(value);
          break;

        case 'DAW':
          result.weight = parseWeight(value);
          break;

        case 'DAY':
          result.eyeColor = EYE_COLOR_CODES[value] || value;
          break;

        case 'DAZ':
          result.hairColor = HAIR_COLOR_CODES[value] || value;
          break;

        // Document class, restrictions, endorsements
        case 'DCM':
          result.documentClass = value;
          break;

        case 'DCO':
          result.documentRestrictions = value;
          break;

        case 'DCN':
          result.documentEndorsements = value;
          break;

        // Store other fields as jurisdiction-specific
        default:
          if (fieldName) {
            jurisdictionSpecific[fieldName] = value;
          } else {
            jurisdictionSpecific[code] = value;
          }
          break;
      }
    });

    // Store jurisdiction-specific fields if any
    if (Object.keys(jurisdictionSpecific).length > 0) {
      result.jurisdictionSpecific = jurisdictionSpecific;
    }

    // Set default country if not specified
    if (!result.country) {
      result.country = 'USA';
    }

    // Validate the parsed data
    result.validationErrors = validateAAMVAData(result);
    result.isValid = result.validationErrors.length === 0;

    return result;
  } catch (error) {
    result.validationErrors.push(
      `Parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return result;
  }
}

export default parseAAMVA;
