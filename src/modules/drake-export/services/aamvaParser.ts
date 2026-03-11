/**
 * AAMVA PDF417 Barcode Parser
 * Parses driver's license PDF417 barcodes following AAMVA standard
 *
 * The AAMVA (American Association of Motor Vehicle Administrators) standard
 * defines the format for PDF417 barcodes on the back of US driver's licenses.
 */

import { devLog } from '../../../services/utils';

export interface AAMVAData {
  // Required fields
  firstName: string;
  lastName: string;
  middleName?: string;
  suffix?: string;

  // Address
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;

  // ID Information
  idNumber: string;
  idState: string;
  issueDate?: string;
  expirationDate?: string;
  dateOfBirth: string;

  // Physical description
  gender?: 'M' | 'F' | 'X';
  eyeColor?: string;
  hairColor?: string;
  height?: string;
  weight?: string;

  // Raw data
  rawData?: string;
  aamvaVersion?: string;
}

// AAMVA field codes (3-character element IDs)
const AAMVA_FIELDS: Record<string, string> = {
  // Names - multiple codes for same field due to version differences
  'DCS': 'familyName',        // Family name (last name)
  'DCT': 'firstName',         // First name (may include middle)
  'DAC': 'firstName',         // First name (older format)
  'DAD': 'middleName',        // Middle name
  'DBN': 'middleName',        // Middle name (alternate)
  'DCU': 'suffix',            // Name suffix
  'DDF': 'familyNameTrunc',   // Family name truncation
  'DDG': 'firstNameTrunc',    // First name truncation
  'DDH': 'middleNameTrunc',   // Middle name truncation

  // Full name (some states use this instead of separate fields)
  'DAA': 'fullName',          // Full name
  'DAB': 'lastName',          // Last name (older format)

  // Address
  'DAG': 'streetAddress',     // Street address line 1
  'DAH': 'streetAddress2',    // Street address line 2
  'DAI': 'city',              // City
  'DAJ': 'jurisdiction',      // State/jurisdiction
  'DAK': 'postalCode',        // ZIP/postal code
  'DCG': 'country',           // Country

  // ID/License Information
  'DAQ': 'licenseNumber',     // Customer ID / License number
  'DCF': 'documentDiscriminator',
  'DCI': 'placeOfBirth',
  'DCJ': 'auditInfo',
  'DCK': 'inventoryControl',
  'DDA': 'complianceType',
  'DDB': 'cardRevisionDate',
  'DDC': 'hazmatEndorsementExpiry',
  'DDD': 'limitedDuration',
  'DAW': 'weightLbs',         // Weight in pounds
  'DAX': 'weightKg',          // Weight in kg
  'DAZ': 'hairColor',
  'DBC': 'sex',               // Sex (1=M, 2=F, 9=Not specified)
  'DBD': 'documentIssueDate', // Issue date
  'DBB': 'dateOfBirth',       // Date of birth
  'DBA': 'expirationDate',    // Expiration date
  'DAU': 'height',            // Height
  'DAY': 'eyeColor',
  'DBE': 'issueTimestamp',
  'DBF': 'numberOfDuplicates',
  'DBG': 'medicalIndicator',
  'DBH': 'nonResident',
  'DBI': 'uniqueCustomerId',
  'DBJ': 'socialSecurityNumber',
  'DBK': 'socialSecurityNumber', // Alternate
  'DBL': 'dateOfBirthNum',
  'DBM': 'socialSecurityNumber', // Another alternate
  'DBN': 'fullName',          // Another full name field
  'DBO': 'lastName',          // Another last name field
  'DBP': 'firstName',         // Another first name field
  'DBQ': 'middleName',        // Another middle name field
  'DBR': 'suffix',            // Another suffix field
  'DBS': 'suffixAlias',
  'DCE': 'weightRange',       // Weight range code
  'DCL': 'race',
  'DCM': 'standardVehicleClass',
  'DCN': 'standardEndorsements',
  'DCO': 'standardRestrictions',
  'DCP': 'vehicleClassDesc',
  'DCQ': 'endorsementDesc',
  'DCR': 'restrictionDesc',

  // Jurisdiction-specific
  'ZVA': 'jurisdictionSpecific',
  'ZVB': 'jurisdictionSpecific',
  'ZVC': 'jurisdictionSpecific',
};

// Eye color codes
const EYE_COLORS: Record<string, string> = {
  'BLK': 'Black',
  'BLU': 'Blue',
  'BRO': 'Brown',
  'GRY': 'Gray',
  'GRN': 'Green',
  'HAZ': 'Hazel',
  'MAR': 'Maroon',
  'PNK': 'Pink',
  'DIC': 'Dichromatic',
  'UNK': 'Unknown',
};

// Hair color codes
const HAIR_COLORS: Record<string, string> = {
  'BAL': 'Bald',
  'BLK': 'Black',
  'BLN': 'Blonde',
  'BRO': 'Brown',
  'GRY': 'Gray',
  'RED': 'Red/Auburn',
  'SDY': 'Sandy',
  'WHI': 'White',
  'UNK': 'Unknown',
};

/**
 * Extract fields from compact AAMVA data where fields run together
 * This handles cases where there are no clear delimiters between fields
 */
function extractFieldsFromCompactData(data: string): string[] {
  const segments: string[] = [];
  const fieldCodes = Object.keys(AAMVA_FIELDS);

  // Find all occurrences of 3-letter field codes that match known codes
  let currentPos = 0;
  const foundPositions: { pos: number; code: string }[] = [];

  // First, find all known field codes and their positions
  for (const code of fieldCodes) {
    let searchPos = 0;
    while (searchPos < data.length) {
      const idx = data.indexOf(code, searchPos);
      if (idx === -1) break;
      foundPositions.push({ pos: idx, code });
      searchPos = idx + 1;
    }
  }

  // Sort by position
  foundPositions.sort((a, b) => a.pos - b.pos);

  // Extract segments between consecutive field codes
  for (let i = 0; i < foundPositions.length; i++) {
    const startPos = foundPositions[i].pos;
    const endPos = i < foundPositions.length - 1 ? foundPositions[i + 1].pos : data.length;
    const segment = data.substring(startPos, endPos);
    if (segment.length > 3) {
      segments.push(segment);
    }
  }

 // devLog('AAMVA Parser: Compact extraction found', segments.length, 'field segments');
  return segments;
}

/**
 * Parse AAMVA PDF417 barcode data
 * @param rawData - Raw string from PDF417 barcode scan
 * @returns Parsed AAMVA data object
 */
export function parseAAMVA(rawData: string): AAMVAData | null {
  if (!rawData || rawData.length < 10) {
    devLog('AAMVA Parser: Invalid or empty barcode data');
    return null;
  }

  devLog('=== AAMVA Parser Start ===');
  devLog('AAMVA Parser: Raw data length:', rawData.length);
  devLog('AAMVA Parser: First 200 chars:', rawData.substring(0, 200));
  devLog('AAMVA Parser: Raw bytes (first 50):', Array.from(rawData.substring(0, 50)).map(c => c.charCodeAt(0)));

  try {
    // Initialize result with empty required fields
    const result: Partial<AAMVAData> & { rawData: string } = {
      rawData,
      firstName: '',
      lastName: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      idNumber: '',
      idState: '',
      dateOfBirth: '',
    };

    // Clean up the raw data - normalize line endings and remove null chars
    let cleanData = rawData
      .replace(/\x00/g, '')           // Remove null characters
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');

    // AAMVA barcodes typically start with "@" compliance indicator, then ANSI header
    // Format: @[CR][LF]ANSI [IIN][AAMVAversion][jurisdictionversion][entries]
    // or: @ANSI [IIN][AAMVAversion]...

    // Find the start of data after compliance indicator
    const complianceIndex = cleanData.indexOf('@');
    if (complianceIndex !== -1) {
      // Skip past the compliance indicator and any whitespace
      cleanData = cleanData.substring(complianceIndex);
      devLog('AAMVA Parser: Found compliance indicator @ at index', complianceIndex);
    }

    // Try to find and extract the AAMVA version
    const ansiMatch = cleanData.match(/ANSI\s*(\d{6})(\d{2})?/);
    if (ansiMatch) {
      result.aamvaVersion = ansiMatch[2] || '01';
      devLog('AAMVA Parser: Version detected:', result.aamvaVersion);
    }

    // AAMVA uses different delimiters:
    // - Record Separator (RS) = 0x1E (ASCII 30)
    // - Line Feed (LF) = 0x0A (ASCII 10)
    // - Carriage Return (CR) = 0x0D (ASCII 13)
    // - Segment terminator often LF

    // Split by various possible delimiters
    const possibleDelimiters = ['\x1e', '\x0a', '\x0d', '\x1f', '\n', '\r'];
    let segments: string[] = [];

    // First try splitting by record separator (most standard)
    if (cleanData.includes('\x1e')) {
      segments = cleanData.split('\x1e').filter(s => s.length > 0);
      devLog('AAMVA Parser: Split by RS (0x1E), found', segments.length, 'segments');
    }

    // If that didn't work well, try newlines
    if (segments.length <= 3) {
      const nlSegments = cleanData.split(/[\n\r]+/).filter(s => s.length > 0);
      if (nlSegments.length > segments.length) {
        segments = nlSegments;
        devLog('AAMVA Parser: Split by newlines, found', segments.length, 'segments');
      }
    }

    // If still not many segments, try unit separator
    if (segments.length <= 3 && cleanData.includes('\x1f')) {
      const usSegments = cleanData.split('\x1f').filter(s => s.length > 0);
      if (usSegments.length > segments.length) {
        segments = usSegments;
        devLog('AAMVA Parser: Split by US (0x1F), found', segments.length, 'segments');
      }
    }

    // If we still have few segments, the data might be in compact format
    // where fields run together without delimiters - try to find field codes directly
    if (segments.length <= 3) {
      devLog('AAMVA Parser: Few segments found, trying compact format parsing');
      segments = extractFieldsFromCompactData(cleanData);
    }

    devLog('AAMVA Parser: Final segment count:', segments.length);
    if (segments.length > 0) {
      devLog('AAMVA Parser: First segment:', segments[0].substring(0, 50));
    }

    // Process each segment
    for (const segment of segments) {
      const trimmed = segment.trim();
      if (trimmed.length < 3) continue;

      // Skip header lines
      if (trimmed.startsWith('@') || trimmed.startsWith('ANSI') || trimmed.match(/^[A-Z]{2}\d{6}/) || trimmed.match(/^DL\d/)) {
        devLog('AAMVA Parser: Skipping header segment:', trimmed.substring(0, 30));
        continue;
      }

      // Extract 3-character field code and value
      // Some formats have the code at the start, others might have spaces
      let fieldCode = '';
      let value = '';

      // Check if it starts with a known field code (case insensitive search)
      const possibleCode = trimmed.substring(0, 3).toUpperCase();
      if (AAMVA_FIELDS[possibleCode]) {
        fieldCode = possibleCode;
        value = trimmed.substring(3).trim();
      } else {
        // Try to find a field code anywhere in the segment (should be within first 5 chars)
        for (const code of Object.keys(AAMVA_FIELDS)) {
          // Check both as-is and uppercase
          let idx = trimmed.toUpperCase().indexOf(code);
          if (idx !== -1 && idx < 5) {
            fieldCode = code;
            value = trimmed.substring(idx + 3).trim();
            break;
          }
        }
      }

      if (!fieldCode) {
        // Last resort: try to identify the field by content patterns
        if (/^\d{8}$/.test(trimmed)) {
          devLog('AAMVA Parser: Found 8-digit date without field code:', trimmed);
        }
        continue;
      }

      if (!value) {
        devLog('AAMVA Parser: Field', fieldCode, 'has no value');
        continue;
      }

      const fieldName = AAMVA_FIELDS[fieldCode];
      devLog('AAMVA Parser: Field', fieldCode, '(' + fieldName + ') =', value.substring(0, 50));

      // Map field to result
      switch (fieldName) {
        case 'familyName':
        case 'lastName':
          result.lastName = cleanName(value);
          break;

        case 'firstName':
          // First name field might contain "FIRST,MIDDLE" or "FIRST MIDDLE"
          const firstParts = value.split(/[,\s]+/);
          result.firstName = cleanName(firstParts[0]);
          if (firstParts.length > 1 && !result.middleName) {
            result.middleName = cleanName(firstParts.slice(1).join(' '));
          }
          break;

        case 'middleName':
          if (!result.middleName || value.length > (result.middleName?.length || 0)) {
            result.middleName = cleanName(value);
          }
          break;

        case 'fullName':
          // Full name might be "LAST,FIRST,MIDDLE" or "LAST,FIRST MIDDLE"
          const nameParts = value.split(',').map(p => p.trim());
          if (nameParts.length >= 1) {
            result.lastName = cleanName(nameParts[0]);
          }
          if (nameParts.length >= 2) {
            const firstMiddle = nameParts[1].split(/\s+/);
            result.firstName = cleanName(firstMiddle[0]);
            if (firstMiddle.length > 1) {
              result.middleName = cleanName(firstMiddle.slice(1).join(' '));
            }
          }
          if (nameParts.length >= 3) {
            result.middleName = cleanName(nameParts[2]);
          }
          break;

        case 'suffix':
          result.suffix = value.toUpperCase();
          break;

        case 'streetAddress':
          result.address = value;
          break;

        case 'city':
          result.city = value;
          break;

        case 'jurisdiction':
          result.state = value.substring(0, 2).toUpperCase();
          result.idState = result.state;
          break;

        case 'postalCode':
          // ZIP might be 5 or 9 digits, possibly with leading zeros
          result.zipCode = value.replace(/[^0-9]/g, '').substring(0, 9);
          // Format as 5 or 5-4
          if (result.zipCode.length > 5) {
            result.zipCode = result.zipCode.substring(0, 5) + '-' + result.zipCode.substring(5);
          }
          break;

        case 'country':
          result.country = value;
          break;

        case 'licenseNumber':
          result.idNumber = value;
          break;

        case 'dateOfBirth':
          result.dateOfBirth = parseAAMVADate(value);
          break;

        case 'expirationDate':
          result.expirationDate = parseAAMVADate(value);
          break;

        case 'documentIssueDate':
          result.issueDate = parseAAMVADate(value);
          break;

        case 'sex':
          result.gender = parseGender(value);
          break;

        case 'height':
          result.height = parseHeight(value);
          break;

        case 'weightLbs':
          result.weight = value.replace(/\D/g, '') + ' lbs';
          break;

        case 'eyeColor':
          result.eyeColor = EYE_COLORS[value.toUpperCase()] || value;
          break;

        case 'hairColor':
          result.hairColor = HAIR_COLORS[value.toUpperCase()] || value;
          break;
      }
    }

    devLog('AAMVA Parser: Segment parsing result:', {
      firstName: result.firstName,
      lastName: result.lastName,
      idNumber: result.idNumber,
      state: result.state,
      dob: result.dateOfBirth,
    });

    // Always try regex extraction to fill in missing fields
    // This is a more aggressive approach that works when segment parsing fails
    const altResult = extractWithRegex(rawData);
    if (altResult) {
      // Fill in only missing fields from regex extraction
      if (!result.firstName && altResult.firstName) result.firstName = altResult.firstName;
      if (!result.lastName && altResult.lastName) result.lastName = altResult.lastName;
      if (!result.middleName && altResult.middleName) result.middleName = altResult.middleName;
      if (!result.idNumber && altResult.idNumber) result.idNumber = altResult.idNumber;
      if (!result.idState && altResult.idState) result.idState = altResult.idState;
      if (!result.state && altResult.state) result.state = altResult.state;
      if (!result.dateOfBirth && altResult.dateOfBirth) result.dateOfBirth = altResult.dateOfBirth;
      if (!result.expirationDate && altResult.expirationDate) result.expirationDate = altResult.expirationDate;
      if (!result.issueDate && altResult.issueDate) result.issueDate = altResult.issueDate;
      if (!result.address && altResult.address) result.address = altResult.address;
      if (!result.city && altResult.city) result.city = altResult.city;
      if (!result.zipCode && altResult.zipCode) result.zipCode = altResult.zipCode;
      if (!result.gender && altResult.gender) result.gender = altResult.gender;
      if (!result.eyeColor && altResult.eyeColor) result.eyeColor = altResult.eyeColor;
      if (!result.hairColor && altResult.hairColor) result.hairColor = altResult.hairColor;
      if (!result.height && altResult.height) result.height = altResult.height;
      if (!result.weight && altResult.weight) result.weight = altResult.weight;
    }

    // Final validation and logging
    devLog('=== AAMVA Parser Final Result ===');
    devLog('First Name:', result.firstName || '(not found)');
    devLog('Last Name:', result.lastName || '(not found)');
    devLog('ID Number:', result.idNumber || '(not found)');
    devLog('ID State:', result.idState || result.state || '(not found)');
    devLog('DOB:', result.dateOfBirth || '(not found)');
    devLog('Address:', result.address || '(not found)');
    devLog('City:', result.city || '(not found)');
    devLog('State:', result.state || '(not found)');
    devLog('ZIP:', result.zipCode || '(not found)');
    devLog('Expiration:', result.expirationDate || '(not found)');
    devLog('Issue Date:', result.issueDate || '(not found)');
    devLog('================================');

    if (!result.lastName && !result.firstName && !result.idNumber) {
      devLog('AAMVA Parser: Could not extract any meaningful data from barcode');
      devLog('AAMVA Parser: Raw data sample:', rawData.substring(0, 300));
      return null;
    }

    return result as AAMVAData;

  } catch (error) {
    devLog('AAMVA Parser: Error parsing barcode data', error);
    devLog('AAMVA Parser: Raw data that caused error:', rawData.substring(0, 200));
    return null;
  }
}

/**
 * Clean up name string
 */
function cleanName(name: string): string {
  if (!name) return '';
  return name
    .replace(/[^a-zA-Z\s'-]/g, '')
    .trim()
    .split(/\s+/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Parse AAMVA date format to YYYY-MM-DD
 * AAMVA dates can be MMDDYYYY or YYYYMMDD
 */
function parseAAMVADate(dateStr: string): string {
  if (!dateStr) return '';

  // Remove any non-numeric characters
  const cleaned = dateStr.replace(/\D/g, '');

  if (cleaned.length === 8) {
    const firstFour = parseInt(cleaned.substring(0, 4), 10);
    const lastFour = parseInt(cleaned.substring(4, 8), 10);

    // If first 4 digits > 1900, assume YYYYMMDD
    if (firstFour > 1900 && firstFour < 2100) {
      return `${cleaned.substring(0, 4)}-${cleaned.substring(4, 6)}-${cleaned.substring(6, 8)}`;
    }

    // Otherwise assume MMDDYYYY
    const month = cleaned.substring(0, 2);
    const day = cleaned.substring(2, 4);
    const year = cleaned.substring(4, 8);
    return `${year}-${month}-${day}`;
  }

  // Try to parse other formats
  if (cleaned.length === 6) {
    // Might be MMDDYY
    const month = cleaned.substring(0, 2);
    const day = cleaned.substring(2, 4);
    const year = cleaned.substring(4, 6);
    const fullYear = parseInt(year, 10) > 50 ? '19' + year : '20' + year;
    return `${fullYear}-${month}-${day}`;
  }

  return dateStr;
}

/**
 * Parse gender code
 */
function parseGender(value: string): 'M' | 'F' | 'X' {
  const code = value.charAt(0).toUpperCase();
  if (code === '1' || code === 'M') return 'M';
  if (code === '2' || code === 'F') return 'F';
  return 'X';
}

/**
 * Parse height (FII format: feet and inches, e.g., 509 = 5'09")
 */
function parseHeight(value: string): string {
  const cleaned = value.replace(/\D/g, '');

  if (cleaned.length === 3) {
    // Format: FII (feet and inches, e.g., 509 = 5'09")
    const feet = parseInt(cleaned.charAt(0), 10);
    const inches = parseInt(cleaned.substring(1), 10);
    return `${feet}'${inches.toString().padStart(2, '0')}"`;
  } else if (cleaned.length === 2) {
    // Just inches total
    const totalInches = parseInt(cleaned, 10);
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;
    return `${feet}'${inches.toString().padStart(2, '0')}"`;
  }

  // If contains 'in' or 'IN', it's in inches
  if (value.toLowerCase().includes('in')) {
    const totalInches = parseInt(cleaned, 10);
    if (totalInches > 0) {
      const feet = Math.floor(totalInches / 12);
      const inches = totalInches % 12;
      return `${feet}'${inches.toString().padStart(2, '0')}"`;
    }
  }

  // If contains 'cm', convert to feet/inches
  if (value.toLowerCase().includes('cm')) {
    const cm = parseInt(cleaned, 10);
    if (cm > 0) {
      const totalInches = Math.round(cm / 2.54);
      const feet = Math.floor(totalInches / 12);
      const inches = totalInches % 12;
      return `${feet}'${inches.toString().padStart(2, '0')}"`;
    }
  }

  return value;
}

/**
 * Try to extract data using regex patterns as fallback
 * This is more aggressive and tries multiple patterns
 */
function extractWithRegex(data: string): Partial<AAMVAData> | null {
  const result: Partial<AAMVAData> = {};

  devLog('AAMVA Parser: Starting regex extraction on data length:', data.length);

  // Normalize the data for regex matching
  const normalizedData = data.toUpperCase();

  // Try to find license number (DAQ field or pattern)
  // DAQ can have letters, numbers, spaces, and special chars
  const licenseMatch = normalizedData.match(/DAQ([A-Z0-9\s\-*]+?)(?=[A-Z]{3}|\x1e|\x0a|\x0d|$)/i) ||
                       normalizedData.match(/DAQ([A-Z0-9]{4,20})/i);
  if (licenseMatch) {
    result.idNumber = licenseMatch[1].trim();
    devLog('AAMVA Parser: Regex found license:', result.idNumber);
  }

  // Try to find last name (DCS field) - can contain hyphens and apostrophes
  const lastNameMatch = normalizedData.match(/DCS([A-Z\s'\-]+?)(?=D[A-Z]{2}|\x1e|\x0a|\x0d|$)/i);
  if (lastNameMatch) {
    result.lastName = cleanName(lastNameMatch[1]);
    devLog('AAMVA Parser: Regex found last name:', result.lastName);
  }

  // Try to find first name (DCT or DAC field)
  const firstNameMatch = normalizedData.match(/(?:DCT|DAC)([A-Z\s,'\-]+?)(?=D[A-Z]{2}|\x1e|\x0a|\x0d|$)/i);
  if (firstNameMatch) {
    const nameParts = firstNameMatch[1].split(/[,\s]+/).filter(p => p.length > 0);
    result.firstName = cleanName(nameParts[0]);
    if (nameParts.length > 1) {
      result.middleName = cleanName(nameParts.slice(1).join(' '));
    }
    devLog('AAMVA Parser: Regex found first name:', result.firstName, 'middle:', result.middleName);
  }

  // Try to find middle name specifically (DAD field)
  if (!result.middleName) {
    const middleMatch = normalizedData.match(/DAD([A-Z\s'\-]+?)(?=D[A-Z]{2}|\x1e|\x0a|\x0d|$)/i);
    if (middleMatch) {
      result.middleName = cleanName(middleMatch[1]);
      devLog('AAMVA Parser: Regex found middle name:', result.middleName);
    }
  }

  // Try to find full name (DAA field) - format is usually LAST,FIRST,MIDDLE or LAST,FIRST MIDDLE
  const fullNameMatch = normalizedData.match(/DAA([A-Z\s,'\-]+?)(?=D[A-Z]{2}|\x1e|\x0a|\x0d|$)/i);
  if (fullNameMatch && (!result.firstName || !result.lastName)) {
    const nameParts = fullNameMatch[1].split(',').map(p => p.trim());
    if (nameParts.length >= 1 && !result.lastName) {
      result.lastName = cleanName(nameParts[0]);
    }
    if (nameParts.length >= 2 && !result.firstName) {
      const firstMiddle = nameParts[1].split(/\s+/);
      result.firstName = cleanName(firstMiddle[0]);
      if (firstMiddle.length > 1 && !result.middleName) {
        result.middleName = cleanName(firstMiddle.slice(1).join(' '));
      }
    }
    if (nameParts.length >= 3 && !result.middleName) {
      result.middleName = cleanName(nameParts[2]);
    }
    devLog('AAMVA Parser: Regex found full name - last:', result.lastName, 'first:', result.firstName);
  }

  // Try to find DOB (DBB field) - 8 digits
  const dobMatch = normalizedData.match(/DBB(\d{8})/);
  if (dobMatch) {
    result.dateOfBirth = parseAAMVADate(dobMatch[1]);
    devLog('AAMVA Parser: Regex found DOB:', result.dateOfBirth);
  }

  // Try to find expiration (DBA field) - 8 digits
  const expMatch = normalizedData.match(/DBA(\d{8})/);
  if (expMatch) {
    result.expirationDate = parseAAMVADate(expMatch[1]);
    devLog('AAMVA Parser: Regex found expiration:', result.expirationDate);
  }

  // Try to find issue date (DBD field) - 8 digits
  const issueMatch = normalizedData.match(/DBD(\d{8})/);
  if (issueMatch) {
    result.issueDate = parseAAMVADate(issueMatch[1]);
    devLog('AAMVA Parser: Regex found issue date:', result.issueDate);
  }

  // Try to find address (DAG field)
  const addressMatch = normalizedData.match(/DAG([A-Z0-9\s\-\.#]+?)(?=D[A-Z]{2}|\x1e|\x0a|\x0d|$)/i);
  if (addressMatch) {
    result.address = addressMatch[1].trim();
    devLog('AAMVA Parser: Regex found address:', result.address);
  }

  // Try to find city (DAI field)
  const cityMatch = normalizedData.match(/DAI([A-Z\s\-\.]+?)(?=D[A-Z]{2}|\x1e|\x0a|\x0d|$)/i);
  if (cityMatch) {
    result.city = cityMatch[1].trim();
    devLog('AAMVA Parser: Regex found city:', result.city);
  }

  // Try to find state (DAJ field) - 2 letter state code
  const stateMatch = normalizedData.match(/DAJ([A-Z]{2})/i);
  if (stateMatch) {
    result.state = stateMatch[1].toUpperCase();
    result.idState = result.state;
    devLog('AAMVA Parser: Regex found state:', result.state);
  }

  // Try to find ZIP (DAK field) - 5 or 9 digits, possibly with spaces/zeros
  const zipMatch = normalizedData.match(/DAK(\d{5,9}|\d{5}\s*\d{4})/);
  if (zipMatch) {
    result.zipCode = zipMatch[1].replace(/\s/g, '').substring(0, 9);
    if (result.zipCode.length > 5) {
      result.zipCode = result.zipCode.substring(0, 5) + '-' + result.zipCode.substring(5);
    }
    devLog('AAMVA Parser: Regex found ZIP:', result.zipCode);
  }

  // Try to find gender (DBC field) - 1=Male, 2=Female, 9=Not specified
  const genderMatch = normalizedData.match(/DBC([12MF9])/i);
  if (genderMatch) {
    result.gender = parseGender(genderMatch[1]);
    devLog('AAMVA Parser: Regex found gender:', result.gender);
  }

  // Try to find eye color (DAY field) - 3 letter code
  const eyeMatch = normalizedData.match(/DAY([A-Z]{3})/i);
  if (eyeMatch) {
    result.eyeColor = EYE_COLORS[eyeMatch[1].toUpperCase()] || eyeMatch[1];
    devLog('AAMVA Parser: Regex found eye color:', result.eyeColor);
  }

  // Try to find hair color (DAZ field) - 3 letter code
  const hairMatch = normalizedData.match(/DAZ([A-Z]{3})/i);
  if (hairMatch) {
    result.hairColor = HAIR_COLORS[hairMatch[1].toUpperCase()] || hairMatch[1];
    devLog('AAMVA Parser: Regex found hair color:', result.hairColor);
  }

  // Try to find height (DAU field) - various formats
  const heightMatch = normalizedData.match(/DAU(\d{3}|\d{1}\s*\d{2})/);
  if (heightMatch) {
    result.height = parseHeight(heightMatch[1].replace(/\s/g, ''));
    devLog('AAMVA Parser: Regex found height:', result.height);
  }

  // Try to find weight (DAW field) - in pounds
  const weightMatch = normalizedData.match(/DAW(\d{2,3})/);
  if (weightMatch) {
    result.weight = weightMatch[1] + ' lbs';
    devLog('AAMVA Parser: Regex found weight:', result.weight);
  }

  devLog('AAMVA Parser: Regex extraction complete, found', Object.keys(result).length, 'fields');

  return Object.keys(result).length > 0 ? result : null;
}

/**
 * Convert parsed AAMVA data to TaxPortal idInfo format
 */
export function aamvaToTaxPortalIdInfo(aamva: AAMVAData): NonNullable<import('../types/drakeTypes').TaxPortal['idInfo']> {
  devLog('AAMVA to TaxPortal:', aamva);
  return {
    idNumber: aamva.idNumber || '',
    idState: aamva.idState || aamva.state || '',
    issueDate: aamva.issueDate,
    expirationDate: aamva.expirationDate,
    idType: 'drivers_license',
    firstName: aamva.firstName,
    middleName: aamva.middleName,
    lastName: aamva.lastName,
    suffix: aamva.suffix,
    dateOfBirth: aamva.dateOfBirth,
    gender: aamva.gender,
    eyeColor: aamva.eyeColor,
    hairColor: aamva.hairColor,
    height: aamva.height,
    weight: aamva.weight,
    address: aamva.address,
    city: aamva.city,
    state: aamva.state,
    zipCode: aamva.zipCode,
    country: aamva.country || 'USA',
  };
}

export default {
  parseAAMVA,
  aamvaToTaxPortalIdInfo,
};
