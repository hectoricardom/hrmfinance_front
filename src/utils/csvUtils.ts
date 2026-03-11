/**
 * Enhanced CSV utilities with proper comma handling within strings
 * Includes international format support for amounts and dates
 */

// ============================================================================
// INTERNATIONAL AMOUNT PARSING
// ============================================================================

/**
 * Auto-detects and parses international amount formats
 * Handles both US (1,234.56) and EU (1.234,56) formats
 * @param value - The amount string to parse
 * @returns Parsed number or NaN if invalid
 */
export const parseInternationalAmount = (value: string): number => {
  if (!value || typeof value !== 'string') {
    return NaN;
  }

  // Clean the value - remove currency symbols and whitespace
  let cleaned = value.trim().replace(/[$€£¥₹₽₿\s]/g, '');

  // Handle parentheses for negative numbers: (100.00) -> -100.00
  const isNegativeParens = /^\(.*\)$/.test(cleaned);
  if (isNegativeParens) {
    cleaned = cleaned.slice(1, -1);
  }

  // Handle leading minus sign
  const hasLeadingMinus = cleaned.startsWith('-');
  if (hasLeadingMinus) {
    cleaned = cleaned.slice(1);
  }

  // Count dots and commas to detect format
  const dotCount = (cleaned.match(/\./g) || []).length;
  const commaCount = (cleaned.match(/,/g) || []).length;

  let normalizedValue: string;

  if (dotCount === 0 && commaCount === 0) {
    // No separators: plain integer
    normalizedValue = cleaned;
  } else if (dotCount === 1 && commaCount === 0) {
    // Single dot: US format (1234.56) or EU thousand separator (1.234)
    // Check position - if 3 digits after dot and nothing after, it's likely thousands
    const parts = cleaned.split('.');
    if (parts[1].length === 3 && parts[0].length <= 3) {
      // Likely EU thousands separator: 1.234 -> 1234
      normalizedValue = cleaned.replace('.', '');
    } else {
      // US decimal: 1234.56
      normalizedValue = cleaned;
    }
  } else if (dotCount === 0 && commaCount === 1) {
    // Single comma: EU format (1234,56) or US thousand separator (1,234)
    const parts = cleaned.split(',');
    if (parts[1].length === 3 && parts[0].length <= 3) {
      // Likely US thousands separator: 1,234 -> 1234
      normalizedValue = cleaned.replace(',', '');
    } else {
      // EU decimal: 1234,56 -> 1234.56
      normalizedValue = cleaned.replace(',', '.');
    }
  } else if (dotCount > 1 && commaCount === 0) {
    // Multiple dots: EU thousands (1.234.567)
    normalizedValue = cleaned.replace(/\./g, '');
  } else if (dotCount === 0 && commaCount > 1) {
    // Multiple commas: US thousands (1,234,567)
    normalizedValue = cleaned.replace(/,/g, '');
  } else if (dotCount >= 1 && commaCount >= 1) {
    // Mixed: determine which is decimal separator by position
    const lastDot = cleaned.lastIndexOf('.');
    const lastComma = cleaned.lastIndexOf(',');

    if (lastDot > lastComma) {
      // US format: 1,234.56 -> 1234.56
      normalizedValue = cleaned.replace(/,/g, '');
    } else {
      // EU format: 1.234,56 -> 1234.56
      normalizedValue = cleaned.replace(/\./g, '').replace(',', '.');
    }
  } else {
    normalizedValue = cleaned;
  }

  const result = parseFloat(normalizedValue);

  // Apply negative sign
  if ((isNegativeParens || hasLeadingMinus) && !isNaN(result)) {
    return -Math.abs(result);
  }

  return result;
};

// ============================================================================
// INTERNATIONAL DATE PARSING
// ============================================================================

/**
 * Auto-detects and parses international date formats
 * Supports: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, DD-MM-YYYY, DD.MM.YYYY
 * @param dateStr - The date string to parse
 * @returns Date object or null if invalid
 */
export const parseInternationalDate = (dateStr: string): Date | null => {
  if (!dateStr || typeof dateStr !== 'string') {
    return null;
  }

  const cleaned = dateStr.trim();

  // Try ISO format first: YYYY-MM-DD
  const isoMatch = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (isValidDate(date, parseInt(year), parseInt(month), parseInt(day))) {
      return date;
    }
  }

  // Try formats with separators: /, -, .
  const separatorMatch = cleaned.match(/^(\d{1,4})([\/\-\.])(\d{1,2})\2(\d{1,4})$/);
  if (separatorMatch) {
    const [, part1, , part2, part3] = separatorMatch;
    const p1 = parseInt(part1);
    const p2 = parseInt(part2);
    const p3 = parseInt(part3);

    // Determine format based on values
    let year: number, month: number, day: number;

    if (part1.length === 4) {
      // YYYY-MM-DD or YYYY/MM/DD
      year = p1;
      month = p2;
      day = p3;
    } else if (part3.length === 4) {
      // DD/MM/YYYY or MM/DD/YYYY - need to determine which
      year = p3;

      // If first part > 12, it must be day (DD/MM/YYYY)
      if (p1 > 12) {
        day = p1;
        month = p2;
      }
      // If second part > 12, it must be day (MM/DD/YYYY)
      else if (p2 > 12) {
        month = p1;
        day = p2;
      }
      // Both could be day or month - prefer DD/MM/YYYY (more common internationally)
      else {
        day = p1;
        month = p2;
      }
    } else {
      // Two-digit year: DD/MM/YY or MM/DD/YY
      const twoDigitYear = p3;
      year = twoDigitYear > 50 ? 1900 + twoDigitYear : 2000 + twoDigitYear;

      if (p1 > 12) {
        day = p1;
        month = p2;
      } else if (p2 > 12) {
        month = p1;
        day = p2;
      } else {
        day = p1;
        month = p2;
      }
    }

    const date = new Date(year, month - 1, day);
    if (isValidDate(date, year, month, day)) {
      return date;
    }
  }

  // Try parsing as natural language date
  const naturalDate = new Date(cleaned);
  if (!isNaN(naturalDate.getTime())) {
    return naturalDate;
  }

  return null;
};

/**
 * Helper to validate a date matches the expected components
 */
const isValidDate = (date: Date, year: number, month: number, day: number): boolean => {
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    month >= 1 && month <= 12 &&
    day >= 1 && day <= 31
  );
};

/**
 * Formats a date to a standard format
 * @param date - Date to format
 * @param format - Output format: 'iso' | 'us' | 'eu'
 */
export const formatDateString = (date: Date, format: 'iso' | 'us' | 'eu' = 'iso'): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  switch (format) {
    case 'us':
      return `${month}/${day}/${year}`;
    case 'eu':
      return `${day}/${month}/${year}`;
    case 'iso':
    default:
      return `${year}-${month}-${day}`;
  }
};

// ============================================================================
// CSV FIELD HANDLING
// ============================================================================

/**
 * Escapes a value for CSV by wrapping in quotes if it contains special characters
 * @param value - The value to escape
 * @returns Properly escaped CSV field
 */
export const escapeCSVField = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) {
    return '';
  }
  
  const stringValue = String(value);
  
  // If the value contains comma, quote, newline, or starts/ends with whitespace, wrap in quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r') || stringValue.trim() !== stringValue) {
    // Escape any existing quotes by doubling them
    const escapedValue = stringValue.replace(/"/g, '""');
    return `"${escapedValue}"`;
  }
  
  return stringValue;
};

/**
 * Converts an array of values to a properly formatted CSV row
 * @param values - Array of values to convert
 * @returns Formatted CSV row string
 */
export const formatCSVRow = (values: (string | number | null | undefined)[], separator?: string): string => {
  return values.map(escapeCSVField).join(separator || ',');
};

/**
 * Parses a CSV line handling quoted values with embedded commas
 * Properly handles:
 * - Quoted fields with embedded commas: "Hello, World"
 * - Escaped quotes (double quotes): "He said ""Hello"""
 * - Mid-field quotes as literal characters
 * - Preserves whitespace within fields
 *
 * @param line - CSV line to parse
 * @returns Array of field values
 */
export const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let fieldStart = true; // Track if we're at the start of a field

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (fieldStart && !inQuotes) {
        // Opening quote at field start
        inQuotes = true;
        fieldStart = false;
      } else if (inQuotes && nextChar === '"') {
        // Escaped quote (double quote) inside quoted field
        current += '"';
        i++; // Skip the next quote
      } else if (inQuotes && (nextChar === ',' || nextChar === undefined || nextChar === '\r' || nextChar === '\n')) {
        // Closing quote at end of field
        inQuotes = false;
      } else if (inQuotes) {
        // Quote inside quoted field followed by more content - keep as literal
        current += char;
      } else {
        // Quote in unquoted field - treat as literal character
        current += char;
        fieldStart = false;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator (only when not inside quotes)
      result.push(current);
      current = '';
      fieldStart = true;
    } else {
      current += char;
      if (char !== ' ' && char !== '\t') {
        fieldStart = false;
      }
    }
  }

  // Add the last field
  result.push(current);

  return result;
};

/**
 * Parses a CSV line and trims each field (convenience function)
 * Use this when you want fields to be trimmed automatically
 * @param line - CSV line to parse
 * @returns Array of trimmed field values
 */
export const parseCSVLineTrimmed = (line: string): string[] => {
  return parseCSVLine(line).map(field => field.trim());
};

/**
 * Parses a full CSV text into rows and columns
 * Properly handles:
 * - Quoted fields with embedded commas
 * - Quoted fields with embedded newlines (multiline fields)
 * - Escaped quotes (doubled quotes)
 *
 * @param csvText - Complete CSV text content
 * @param hasHeader - Whether the first row is a header (default: true)
 * @param trimFields - Whether to trim whitespace from fields (default: true)
 * @returns Object with headers and data rows
 */
export const parseCSV = (
  csvText: string,
  hasHeader: boolean = true,
  trimFields: boolean = true
): { headers: string[], rows: string[][] } => {
  if (!csvText || !csvText.trim()) {
    return { headers: [], rows: [] };
  }

  // Parse the entire CSV content handling multiline quoted fields
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let fieldStart = true;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (fieldStart && !inQuotes) {
        // Opening quote at field start
        inQuotes = true;
        fieldStart = false;
      } else if (inQuotes && nextChar === '"') {
        // Escaped quote (double quote) inside quoted field
        currentField += '"';
        i++; // Skip the next quote
      } else if (inQuotes && (nextChar === ',' || nextChar === '\r' || nextChar === '\n' || nextChar === undefined)) {
        // Closing quote at end of field
        inQuotes = false;
      } else if (inQuotes) {
        // Quote inside quoted field followed by more content - keep as literal
        currentField += char;
      } else {
        // Quote in unquoted field - treat as literal character
        currentField += char;
        fieldStart = false;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator (only when not inside quotes)
      currentRow.push(trimFields ? currentField.trim() : currentField);
      currentField = '';
      fieldStart = true;
    } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
      // Row separator (only when not inside quotes)
      currentRow.push(trimFields ? currentField.trim() : currentField);

      // Only add non-empty rows
      if (currentRow.some(field => field.length > 0)) {
        rows.push(currentRow);
      }

      currentRow = [];
      currentField = '';
      fieldStart = true;

      // Skip \n if we're on \r\n
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
    } else if (char === '\r' && !inQuotes) {
      // Handle standalone \r as row separator
      currentRow.push(trimFields ? currentField.trim() : currentField);

      if (currentRow.some(field => field.length > 0)) {
        rows.push(currentRow);
      }

      currentRow = [];
      currentField = '';
      fieldStart = true;
    } else {
      // Regular character - add to current field
      currentField += char;
      if (char !== ' ' && char !== '\t') {
        fieldStart = false;
      }
    }
  }

  // Don't forget the last field and row
  currentRow.push(trimFields ? currentField.trim() : currentField);
  if (currentRow.some(field => field.length > 0)) {
    rows.push(currentRow);
  }

  if (rows.length === 0) {
    return { headers: [], rows: [] };
  }

  if (hasHeader) {
    return {
      headers: rows[0] || [],
      rows: rows.slice(1)
    };
  } else {
    return {
      headers: [],
      rows: rows
    };
  }
};

/**
 * Converts data to CSV format with proper escaping
 * @param data - Array of objects or array of arrays
 * @param headers - Optional headers (for object arrays)
 * @returns Formatted CSV string
 */
export const convertToCSV = (
  data: Record<string, any>[] | any[][],
  headers?: string[],
  separator?: string 
): string => {
  if (data.length === 0) {
    return '';
  }
  
  const rows: string[] = [];
  
  // Handle array of objects
  if (typeof data[0] === 'object' && !Array.isArray(data[0])) {
    const objectData = data as Record<string, any>[];
    const csvHeaders = headers || Object.keys(objectData[0]);
    
    // Add headers
    rows.push(formatCSVRow(csvHeaders, separator));
    
    // Add data rows
    objectData.forEach(item => {
      const values = csvHeaders.map(header => item[header]);
      rows.push(formatCSVRow(values, separator));
    });
  } 
  // Handle array of arrays
  else {
    const arrayData = data as any[][];
    
    // Add headers if provided
    if (headers) {
      rows.push(formatCSVRow(headers, separator));
    }
    
    // Add data rows
    arrayData.forEach(row => {
      rows.push(formatCSVRow(row, separator));
    });
  }
  
  return rows.join('\n');
};

/**
 * Downloads CSV content as a file
 * @param csvContent - CSV content string
 * @param filename - Name of the file to download
 */
export const downloadCSV = (csvContent: string, filename: string): void => {
  // Add BOM for proper UTF-8 encoding in Excel
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL
  URL.revokeObjectURL(url);
};

/**
 * Validates CSV format and returns detailed information
 * @param csvText - CSV text to validate
 * @returns Validation result with details
 */
export const validateCSV = (csvText: string): {
  isValid: boolean;
  errors: string[];
  rowCount: number;
  columnCount: number;
  inconsistentRows: number[];
} => {
  const errors: string[] = [];
  const inconsistentRows: number[] = [];
  
  try {
    const { headers, rows } = parseCSV(csvText, true);
    const expectedColumnCount = headers.length;
    
    if (expectedColumnCount === 0) {
      errors.push('No headers found');
    }
    
    rows.forEach((row, index) => {
      if (row.length !== expectedColumnCount) {
        inconsistentRows.push(index + 2); // +2 because we start from row 2 (after header)
      }
    });
    
    if (inconsistentRows.length > 0) {
      errors.push(`Inconsistent column count in rows: ${inconsistentRows.join(', ')}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      rowCount: rows.length,
      columnCount: expectedColumnCount,
      inconsistentRows
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [`Parse error: ${error}`],
      rowCount: 0,
      columnCount: 0,
      inconsistentRows: []
    };
  }
};