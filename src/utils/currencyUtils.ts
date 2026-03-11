/**
 * Currency utilities using cents (integers) to avoid floating-point precision issues
 *
 * IMPORTANT: Store all monetary values as cents (integers) in the database
 * Only convert to dollars for display purposes
 *
 * Example: $123.45 → store as 12345 cents
 */

// ============================================================================
// CONVERSION FUNCTIONS
// ============================================================================

/**
 * Converts dollars to cents (integer)
 * @param dollars - Amount in dollars (can be string or number)
 * @returns Amount in cents as integer
 */
export const dollarsToCents = (dollars: number | string): number => {
  if (dollars === null || dollars === undefined || dollars === '') {
    return 0;
  }

  const numValue = typeof dollars === 'string' ? parseFloat(dollars) : dollars;

  if (isNaN(numValue)) {
    return 0;
  }

  // Multiply by 100 and round to avoid floating-point issues
  return Math.round(numValue * 100);
};

/**
 * Converts cents to dollars
 * @param cents - Amount in cents (integer)
 * @returns Amount in dollars
 */
export const centsToDollars = (cents: number): number => {
  if (cents === null || cents === undefined || isNaN(cents)) {
    return 0;
  }

  return cents / 100;
};

/**
 * Converts cents to formatted currency string
 * @param cents - Amount in cents
 * @param currency - Currency code (default: USD)
 * @param locale - Locale for formatting (default: en-US)
 * @returns Formatted currency string
 */
export const centsToFormatted = (
  cents: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string => {
  const dollars = centsToDollars(cents);

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(dollars);
};

/**
 * Converts cents to simple formatted string (without currency symbol)
 * @param cents - Amount in cents
 * @param decimalPlaces - Number of decimal places (default: 2)
 * @returns Formatted number string
 */
export const centsToNumber = (cents: number, decimalPlaces: number = 2): string => {
  const dollars = centsToDollars(cents);
  return dollars.toFixed(decimalPlaces);
};

// ============================================================================
// ARITHMETIC OPERATIONS (all work with cents)
// ============================================================================

/**
 * Adds multiple cent amounts safely
 * @param amounts - Array of cent amounts
 * @returns Sum in cents
 */
export const addCents = (...amounts: number[]): number => {
  return amounts.reduce((sum, amount) => {
    const value = amount || 0;
    return sum + Math.round(value);
  }, 0);
};

/**
 * Subtracts cent amounts (first - rest)
 * @param amounts - Array of cent amounts
 * @returns Difference in cents
 */
export const subtractCents = (...amounts: number[]): number => {
  if (amounts.length === 0) return 0;

  const [first, ...rest] = amounts;
  return rest.reduce((diff, amount) => {
    const value = amount || 0;
    return diff - Math.round(value);
  }, Math.round(first || 0));
};

/**
 * Multiplies cents by a factor (for quantities, tax rates, etc.)
 * @param cents - Amount in cents
 * @param factor - Multiplication factor
 * @returns Result in cents (rounded)
 */
export const multiplyCents = (cents: number, factor: number): number => {
  return Math.round((cents || 0) * (factor || 0));
};

/**
 * Divides cents by a factor
 * @param cents - Amount in cents
 * @param divisor - Division factor
 * @returns Result in cents (rounded)
 */
export const divideCents = (cents: number, divisor: number): number => {
  if (!divisor || divisor === 0) {
    return 0;
  }
  return Math.round((cents || 0) / divisor);
};

/**
 * Calculates percentage of cents
 * @param cents - Base amount in cents
 * @param percentage - Percentage (e.g., 18 for 18%)
 * @returns Percentage amount in cents
 */
export const percentageOfCents = (cents: number, percentage: number): number => {
  return Math.round((cents || 0) * (percentage || 0) / 100);
};

/**
 * Adds percentage to cents (e.g., adding tax)
 * @param cents - Base amount in cents
 * @param percentage - Percentage to add (e.g., 18 for 18%)
 * @returns Total in cents (base + percentage)
 */
export const addPercentageToCents = (cents: number, percentage: number): number => {
  const base = cents || 0;
  const addition = percentageOfCents(base, percentage);
  return base + addition;
};

// ============================================================================
// VALIDATION & COMPARISON
// ============================================================================

/**
 * Checks if two cent amounts are equal
 * @param a - First amount in cents
 * @param b - Second amount in cents
 * @returns True if equal
 */
export const centsEqual = (a: number, b: number): boolean => {
  return Math.round(a || 0) === Math.round(b || 0);
};

/**
 * Checks if amounts balance (debits equal credits)
 * @param debits - Array of debit amounts in cents
 * @param credits - Array of credit amounts in cents
 * @returns True if balanced
 */
export const isBalanced = (debits: number[], credits: number[]): boolean => {
  const totalDebits = addCents(...debits);
  const totalCredits = addCents(...credits);
  return centsEqual(totalDebits, totalCredits);
};

/**
 * Calculates the difference between debits and credits
 * @param debits - Array of debit amounts in cents
 * @param credits - Array of credit amounts in cents
 * @returns Difference in cents (positive = debits exceed, negative = credits exceed)
 */
export const balanceDifference = (debits: number[], credits: number[]): number => {
  const totalDebits = addCents(...debits);
  const totalCredits = addCents(...credits);
  return totalDebits - totalCredits;
};

// ============================================================================
// ROUNDING UTILITIES
// ============================================================================

/**
 * Rounds dollars to cents (for user input)
 * Handles cases like $1.999 → 200 cents
 * @param dollars - Amount in dollars
 * @returns Rounded cents
 */
export const roundDollarsToCents = (dollars: number): number => {
  return Math.round(dollars * 100);
};

/**
 * Rounds cents to nearest dollar (returns cents)
 * @param cents - Amount in cents
 * @returns Rounded to nearest dollar (in cents)
 */
export const roundToNearestDollar = (cents: number): number => {
  return Math.round(cents / 100) * 100;
};

/**
 * Rounds up cents to nearest dollar (returns cents)
 * @param cents - Amount in cents
 * @returns Rounded up to nearest dollar (in cents)
 */
export const roundUpToNearestDollar = (cents: number): number => {
  return Math.ceil(cents / 100) * 100;
};

/**
 * Rounds down cents to nearest dollar (returns cents)
 * @param cents - Amount in cents
 * @returns Rounded down to nearest dollar (in cents)
 */
export const roundDownToNearestDollar = (cents: number): number => {
  return Math.floor(cents / 100) * 100;
};

// ============================================================================
// PARSING UTILITIES
// ============================================================================

/**
 * Parses a currency string to cents
 * Handles various formats: $1,234.56, 1234.56, 1.234,56 (EU), etc.
 * @param value - Currency string to parse
 * @returns Amount in cents
 */
export const parseCurrencyToCents = (value: string): number => {
  if (!value || typeof value !== 'string') {
    return 0;
  }

  // Remove currency symbols and whitespace
  let cleaned = value.trim().replace(/[$€£¥₹₽₿\s]/g, '');

  // Handle negative values in parentheses: (100.00) → -100.00
  const isNegativeParens = /^\(.*\)$/.test(cleaned);
  if (isNegativeParens) {
    cleaned = cleaned.slice(1, -1);
  }

  // Handle leading minus
  const hasLeadingMinus = cleaned.startsWith('-');
  if (hasLeadingMinus) {
    cleaned = cleaned.slice(1);
  }

  // Detect format and normalize
  const dotCount = (cleaned.match(/\./g) || []).length;
  const commaCount = (cleaned.match(/,/g) || []).length;

  let normalizedValue: string;

  if (dotCount === 0 && commaCount === 0) {
    // No separators: plain integer (assume dollars)
    normalizedValue = cleaned;
  } else if (dotCount === 1 && commaCount === 0) {
    // Single dot: US format decimal
    normalizedValue = cleaned;
  } else if (dotCount === 0 && commaCount === 1) {
    // Single comma: could be EU decimal (1234,56) or US thousands (1,234)
    const parts = cleaned.split(',');
    if (parts[1].length === 2) {
      // EU decimal: 1234,56 → 1234.56
      normalizedValue = cleaned.replace(',', '.');
    } else {
      // US thousands: 1,234 → 1234
      normalizedValue = cleaned.replace(',', '');
    }
  } else if (dotCount > 1 && commaCount === 0) {
    // Multiple dots: EU thousands (1.234.567)
    normalizedValue = cleaned.replace(/\./g, '');
  } else if (dotCount === 0 && commaCount > 1) {
    // Multiple commas: US thousands (1,234,567)
    normalizedValue = cleaned.replace(/,/g, '');
  } else {
    // Mixed: determine which is decimal separator
    const lastDot = cleaned.lastIndexOf('.');
    const lastComma = cleaned.lastIndexOf(',');

    if (lastDot > lastComma) {
      // US format: 1,234.56
      normalizedValue = cleaned.replace(/,/g, '');
    } else {
      // EU format: 1.234,56
      normalizedValue = cleaned.replace(/\./g, '').replace(',', '.');
    }
  }

  const dollars = parseFloat(normalizedValue);

  if (isNaN(dollars)) {
    return 0;
  }

  let cents = dollarsToCents(dollars);

  if (isNegativeParens || hasLeadingMinus) {
    cents = -Math.abs(cents);
  }

  return cents;
};

// ============================================================================
// DISPLAY HELPERS
// ============================================================================

/**
 * Formats cents for display in an input field (as dollars)
 * @param cents - Amount in cents
 * @returns String suitable for input value
 */
export const centsToInputValue = (cents: number): string => {
  if (cents === 0 || cents === null || cents === undefined) {
    return '';
  }
  return centsToDollars(cents).toFixed(2);
};

/**
 * Formats cents with sign for accounting display
 * @param cents - Amount in cents
 * @param showPositiveSign - Whether to show + for positive values
 * @returns Formatted string with sign
 */
export const centsWithSign = (
  cents: number,
  showPositiveSign: boolean = false
): string => {
  const formatted = centsToFormatted(Math.abs(cents));

  if (cents < 0) {
    return `-${formatted}`;
  } else if (cents > 0 && showPositiveSign) {
    return `+${formatted}`;
  }

  return formatted;
};

/**
 * Formats cents in accounting style (negative in parentheses)
 * @param cents - Amount in cents
 * @returns Formatted string in accounting style
 */
export const centsAccountingStyle = (cents: number): string => {
  const formatted = centsToFormatted(Math.abs(cents));

  if (cents < 0) {
    return `(${formatted})`;
  }

  return formatted;
};

// ============================================================================
// MIGRATION HELPERS
// ============================================================================

/**
 * Converts an object's dollar fields to cents
 * @param obj - Object with dollar values
 * @param dollarFields - Array of field names that contain dollar values
 * @returns New object with cents values
 */
export const convertObjectToCents = <T extends Record<string, any>>(
  obj: T,
  dollarFields: (keyof T)[]
): T => {
  const result = { ...obj };

  dollarFields.forEach(field => {
    if (field in result && result[field] !== null && result[field] !== undefined) {
      (result as any)[field] = dollarsToCents(result[field]);
    }
  });

  return result;
};

/**
 * Converts an object's cent fields to dollars
 * @param obj - Object with cent values
 * @param centFields - Array of field names that contain cent values
 * @returns New object with dollar values
 */
export const convertObjectToDollars = <T extends Record<string, any>>(
  obj: T,
  centFields: (keyof T)[]
): T => {
  const result = { ...obj };

  centFields.forEach(field => {
    if (field in result && result[field] !== null && result[field] !== undefined) {
      (result as any)[field] = centsToDollars(result[field]);
    }
  });

  return result;
};

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Common tax rates in cents per dollar (for easy calculation)
 */
export const TAX_RATES = {
  ITBIS_18: 18,      // Dominican Republic ITBIS
  ITBIS_16: 16,      // Reduced ITBIS rate
  US_SALES_TAX: 7,   // Approximate US average
  NO_TAX: 0
} as const;

/**
 * Calculate tax amount in cents
 * @param baseCents - Base amount in cents
 * @param taxRate - Tax rate from TAX_RATES or custom percentage
 * @returns Tax amount in cents
 */
export const calculateTax = (baseCents: number, taxRate: number): number => {
  return percentageOfCents(baseCents, taxRate);
};

/**
 * Calculate total with tax in cents
 * @param baseCents - Base amount in cents
 * @param taxRate - Tax rate percentage
 * @returns Total (base + tax) in cents
 */
export const calculateTotalWithTax = (baseCents: number, taxRate: number): number => {
  return addPercentageToCents(baseCents, taxRate);
};
