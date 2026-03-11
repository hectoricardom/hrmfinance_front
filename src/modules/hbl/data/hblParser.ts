import { extractHBL } from '../../../services/utils';
import { parseCSV } from '../../../utils/csvUtils';

/**
 * HBL format patterns
 * - Standard: 230XXXXXX (9 digits starting with 230)
 * - Extended: AAA12345678 (3 letters + 8 digits, e.g., TRE20272709)
 */
const HBL_PATTERNS = {
  standard: /230\d{6}/g,
  extended: /[A-Z]{3}\d{8}/g
};

/**
 * Detect the format of an HBL number
 * @param hbl - HBL number to check
 * @returns Format type: 'standard', 'extended', or 'unknown'
 */
const getHBLFormatInternal = (hbl: string): 'standard' | 'extended' | 'unknown' => {
  const standardRegex = /^230\d{6}$/;
  const extendedRegex = /^[A-Z]{3}\d{8}$/;

  if (standardRegex.test(hbl)) return 'standard';
  if (extendedRegex.test(hbl.toUpperCase())) return 'extended';
  return 'unknown';
};

/**
 * Parses text to find all HBL numbers matching known patterns
 * Supports:
 * - Standard format: 230XXXXXX (e.g., 230123456)
 * - Extended format: AAA12345678 (e.g., TRE20272709)
 * @param text - Text to parse
 * @returns Array of HBL numbers
 */
export const parseHBLNumbers = (text: string): string[] => {
  const hbls: Set<string> = new Set();

  // Extract standard format (230XXXXXX) - case sensitive
  const standardMatches = text.match(HBL_PATTERNS.standard) || [];
  standardMatches.forEach(hbl => hbls.add(hbl));

  // Extract extended format (AAA12345678) - case insensitive, stored in uppercase
  // This ensures TRE20272709, tre20272709, Tre20272709 all become TRE20272709
  const upperText = text.toUpperCase();
  const extendedMatches = upperText.match(HBL_PATTERNS.extended) || [];
  extendedMatches.forEach(hbl => hbls.add(hbl.toUpperCase()));

  // Return sorted array of unique HBLs (standard format first, then extended)
  const hblArray = [...hbls];
  return hblArray.sort((a, b) => {
    const formatA = getHBLFormatInternal(a);
    const formatB = getHBLFormatInternal(b);

    // Sort by format first (standard before extended)
    if (formatA !== formatB) {
      return formatA === 'standard' ? -1 : 1;
    }

    // Then sort alphabetically within same format
    return a.localeCompare(b);
  });
};

/**
 * Parse multiple texts and extract HBL numbers
 * @param texts - Array of texts to parse
 * @returns Array of unique HBL numbers
 */
export const parseMultipleHBLs = (texts: string[]): string[] => {
  const allHBLs: string[] = [];
  
  texts.forEach(text => {
    const hbls = parseHBLNumbers(text);
    allHBLs.push(...hbls);
  });
  
  return [...new Set(allHBLs)]; // Remove duplicates across all texts
};

/**
 * Validate if a string is a valid HBL number
 * Supports:
 * - Standard: 230XXXXXX (9 digits starting with 230)
 * - Extended: AAA12345678 (3 letters + 8 digits)
 * @param hbl - String to validate
 * @returns true if valid HBL in any supported format
 */
export const isValidHBL = (hbl: string): boolean => {
  const standardRegex = /^230\d{6}$/;
  const extendedRegex = /^[A-Z]{3}\d{8}$/;

  return standardRegex.test(hbl) || extendedRegex.test(hbl.toUpperCase());
};

/**
 * Detect the format of an HBL number (exported version)
 * @param hbl - HBL number to check
 * @returns Format type: 'standard', 'extended', or 'unknown'
 */
export const getHBLFormat = (hbl: string): 'standard' | 'extended' | 'unknown' => {
  return getHBLFormatInternal(hbl);
};

/**
 * Extract HBL data from various input formats
 * @param input - String, array, or object containing HBLs
 * @returns Array of HBL numbers
 */
export const extractHBLsFromInput = (input: string | string[] | Record<string, any>): string[] => {
  const hbls: string[] = [];
  
  if (typeof input === 'string') {
    hbls.push(...parseHBLNumbers(input));
  } else if (Array.isArray(input)) {
    input.forEach(item => {
      if (typeof item === 'string') {
        hbls.push(...parseHBLNumbers(item));
      } else if (item && typeof item === 'object') {
        const extracted = extractHBLsFromObject(item);
        hbls.push(...extracted);
      }
    });
  } else if (input && typeof input === 'object') {
    const extracted = extractHBLsFromObject(input);
    hbls.push(...extracted);
  }
  
  return [...new Set(hbls)];
};

/**
 * Helper function to extract HBLs from object values
 * @param obj - Object to search
 * @returns Array of HBL numbers
 */
const extractHBLsFromObject = (obj: Record<string, any>): string[] => {
  const hbls: string[] = [];
  
  Object.values(obj).forEach(value => {
    if (typeof value === 'string') {
      hbls.push(...parseHBLNumbers(value));
    } else if (Array.isArray(value)) {
      value.forEach(item => {
        if (typeof item === 'string') {
          hbls.push(...parseHBLNumbers(item));
        }
      });
    }
  });
  
  return hbls;
};

/**
 * Parse CSV or text data with HBLs using improved CSV parser
 * @param csvText - CSV or newline-separated text
 * @returns Array of HBL numbers
 */
export const parseHBLsFromCSV = (csvText: string): string[] => {
  const hbls: string[] = [];
  
  try {
    // Try to parse as proper CSV first
    const { headers, rows } = parseCSV(csvText, true);
    
    // Extract HBLs from headers
    headers.forEach(header => {
      const extracted = parseHBLNumbers(header);
      hbls.push(...extracted);
    });
    
    // Extract HBLs from all data cells
    rows.forEach(row => {
      row.forEach(cell => {
        const extracted = parseHBLNumbers(cell);
        hbls.push(...extracted);
      });
    });
  } catch (error) {
    // Fallback to line-by-line parsing if CSV parsing fails
    const lines = csvText.split(/[\n\r]+/);
    lines.forEach(line => {
      const extracted = parseHBLNumbers(line);
      hbls.push(...extracted);
    });
  }
  
  return [...new Set(hbls)];
};