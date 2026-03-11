/**
 * CSV Parser Service for Product Offers
 * Handles parsing of CSV files/strings into SupplierOffer objects
 */

import {
  ProductOffer,
  SupplierOffer,
  CSVParserConfig,
  defaultCSVConfig,
  normalizeProductName,
  normalizeUnit,
  generateProductId,
  generateOfferId,
} from '../types/productOffer';

/**
 * Parse a CSV file into a SupplierOffer
 * @param file - The CSV file to parse
 * @param config - Optional parser configuration
 * @param supplierName - Optional supplier name (defaults to filename)
 * @returns Promise resolving to a SupplierOffer
 */
export async function parseCSVFile(
  file: File,
  config?: Partial<CSVParserConfig>,
  supplierName?: string
): Promise<SupplierOffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const offer = parseCSVString(
          content,
          config,
          supplierName || file.name.replace(/\.csv$/i, '')
        );
        resolve(offer);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}

/**
 * Parse a CSV string into a SupplierOffer
 * @param csvContent - The CSV content as a string
 * @param config - Optional parser configuration
 * @param supplierName - Optional supplier name
 * @returns A SupplierOffer with parsed products
 */
export function parseCSVString(
  csvContent: string,
  config?: Partial<CSVParserConfig>,
  supplierName?: string
): SupplierOffer {
  // Merge with default config
  const mergedConfig: CSVParserConfig = {
    ...defaultCSVConfig,
    ...config,
    columnMapping: {
      ...defaultCSVConfig.columnMapping,
      ...config?.columnMapping,
    },
  };

  // Auto-detect delimiter if not explicitly set
  if (!config?.delimiter) {
    mergedConfig.delimiter = detectDelimiter(csvContent);
  }

  // Parse CSV lines
  const lines = parseCSVLines(csvContent, mergedConfig.delimiter);

  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }

  // Handle header and skip rows
  let startRow = 0;
  if (mergedConfig.skipRows) {
    startRow += mergedConfig.skipRows;
  }
  if (mergedConfig.hasHeader) {
    // If we have headers and no column mapping was provided, suggest one
    if (!config?.columnMapping && lines.length > 0) {
      const suggestedMapping = suggestColumnMapping(lines[startRow]);
      mergedConfig.columnMapping = {
        ...mergedConfig.columnMapping,
        ...suggestedMapping,
      };
    }
    startRow += 1; // Skip header row
  }

  // Parse products
  const products: ProductOffer[] = [];
  const currency = mergedConfig.defaultCurrency || 'USD';

  for (let i = startRow; i < lines.length; i++) {
    const row = lines[i];

    // Skip empty rows
    if (row.length === 0 || row.every(cell => !cell.trim())) {
      continue;
    }

    try {
      const product = parseProductFromRow(row, mergedConfig, currency);
      if (product) {
        products.push(product);
      }
    } catch (error) {
      console.warn(`Skipping row ${i + 1}: ${error}`);
    }
  }

  // Calculate total value
  const totalValue = products.reduce((sum, p) => sum + p.totalPrice, 0);

  // Create SupplierOffer
  const offer: SupplierOffer = {
    id: generateOfferId(),
    supplierName: supplierName || 'Unknown Supplier',
    sourceFile: supplierName || 'csv-import',
    sourceType: 'csv',
    uploadDate: Date.now(),
    products,
    currency,
    totalProducts: products.length,
    totalValue,
  };

  return offer;
}

/**
 * Auto-detect the delimiter from CSV content
 * @param content - The CSV content
 * @returns The detected delimiter
 */
export function detectDelimiter(content: string): ',' | ';' | '\t' {
  // Take first few lines for analysis
  const sampleLines = content.split('\n').slice(0, 5);
  const sample = sampleLines.join('\n');

  // Count occurrences of each delimiter
  const commaCount = (sample.match(/,/g) || []).length;
  const semicolonCount = (sample.match(/;/g) || []).length;
  const tabCount = (sample.match(/\t/g) || []).length;

  // Return the most common delimiter
  if (tabCount > commaCount && tabCount > semicolonCount) {
    return '\t';
  } else if (semicolonCount > commaCount) {
    return ';';
  }
  return ',';
}

/**
 * Suggest column mapping based on header names
 * @param headers - Array of header strings
 * @returns Suggested column mapping
 */
export function suggestColumnMapping(
  headers: string[]
): Partial<CSVParserConfig['columnMapping']> {
  const mapping: Partial<CSVParserConfig['columnMapping']> = {};

  headers.forEach((header, index) => {
    const normalized = header.toLowerCase().trim();

    // Product name
    if (
      normalized.includes('product') ||
      normalized.includes('name') ||
      normalized.includes('item') ||
      normalized.includes('description') && !mapping.productName
    ) {
      mapping.productName = index;
    }

    // Product code
    if (
      (normalized.includes('code') ||
       normalized.includes('product code') ||
       normalized.includes('item code')) &&
      !normalized.includes('sku') &&
      !mapping.productCode
    ) {
      mapping.productCode = index;
    }

    // SKU
    if (normalized.includes('sku')) {
      mapping.sku = index;
    }

    // Description (only if not used for product name)
    if (
      (normalized.includes('desc') || normalized === 'description') &&
      mapping.productName !== index
    ) {
      mapping.description = index;
    }

    // Unit
    if (
      normalized.includes('unit') ||
      normalized.includes('uom') ||
      normalized.includes('measure')
    ) {
      mapping.unit = index;
    }

    // Quantity
    if (
      normalized.includes('qty') ||
      normalized.includes('quantity') ||
      normalized.includes('amount') && !normalized.includes('price')
    ) {
      mapping.quantity = index;
    }

    // Unit price
    if (
      (normalized.includes('price') && normalized.includes('unit')) ||
      (normalized.includes('price') && !normalized.includes('total')) ||
      normalized === 'price' ||
      normalized.includes('unit price') ||
      normalized.includes('price/unit')
    ) {
      mapping.unitPrice = index;
    }

    // Total price
    if (
      normalized.includes('total') ||
      normalized.includes('amount') && normalized.includes('total') ||
      normalized.includes('subtotal')
    ) {
      mapping.totalPrice = index;
    }

    // Category
    if (
      normalized.includes('category') ||
      normalized.includes('type') ||
      normalized.includes('group')
    ) {
      mapping.category = index;
    }

    // Brand
    if (
      normalized.includes('brand') ||
      normalized.includes('manufacturer') ||
      normalized.includes('make')
    ) {
      mapping.brand = index;
    }
  });

  return mapping;
}

/**
 * Parse CSV lines respecting quoted fields
 * @param content - CSV content
 * @param delimiter - The delimiter to use
 * @returns Array of rows, each row is an array of cell values
 */
function parseCSVLines(content: string, delimiter: string): string[][] {
  const lines: string[][] = [];
  const rows = content.split(/\r?\n/);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row.trim()) continue;

    const cells: string[] = [];
    let currentCell = '';
    let insideQuotes = false;

    for (let j = 0; j < row.length; j++) {
      const char = row[j];
      const nextChar = row[j + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          // Escaped quote
          currentCell += '"';
          j++; // Skip next quote
        } else {
          // Toggle quote state
          insideQuotes = !insideQuotes;
        }
      } else if (char === delimiter && !insideQuotes) {
        // End of cell
        cells.push(currentCell.trim());
        currentCell = '';
      } else {
        currentCell += char;
      }
    }

    // Add the last cell
    cells.push(currentCell.trim());
    lines.push(cells);
  }

  return lines;
}

/**
 * Parse a single product from a CSV row
 * @param row - Array of cell values
 * @param config - Parser configuration
 * @param currency - Default currency
 * @returns ProductOffer or null if row is invalid
 */
function parseProductFromRow(
  row: string[],
  config: CSVParserConfig,
  currency: string
): ProductOffer | null {
  const mapping = config.columnMapping;

  // Product name is required
  const productName = getColumnValue(row, mapping.productName);
  if (!productName) {
    return null;
  }

  // Unit price is required
  const unitPriceStr = getColumnValue(row, mapping.unitPrice);
  if (!unitPriceStr) {
    return null;
  }

  const unitPrice = parseNumber(unitPriceStr);
  if (isNaN(unitPrice)) {
    throw new Error(`Invalid unit price: ${unitPriceStr}`);
  }

  // Parse optional fields
  const productCode = getColumnValue(row, mapping.productCode);
  const sku = getColumnValue(row, mapping.sku);
  const description = getColumnValue(row, mapping.description);
  const category = getColumnValue(row, mapping.category);
  const brand = getColumnValue(row, mapping.brand);

  // Parse quantity (default to 1 if not provided)
  let quantity = 1;
  const quantityStr = getColumnValue(row, mapping.quantity);
  if (quantityStr) {
    quantity = parseNumber(quantityStr);
    if (isNaN(quantity) || quantity <= 0) {
      quantity = 1;
    }
  }

  // Parse unit (default from config if not provided)
  let unit = config.defaultUnit || 'ea';
  const unitStr = getColumnValue(row, mapping.unit);
  if (unitStr) {
    unit = normalizeUnit(unitStr);
  }

  // Parse or calculate total price
  let totalPrice: number;
  const totalPriceStr = getColumnValue(row, mapping.totalPrice);
  if (totalPriceStr) {
    totalPrice = parseNumber(totalPriceStr);
    if (isNaN(totalPrice)) {
      totalPrice = quantity * unitPrice;
    }
  } else {
    totalPrice = quantity * unitPrice;
  }

  // Create product offer
  const product: ProductOffer = {
    id: generateProductId(),
    productName: productName.trim(),
    normalizedName: normalizeProductName(productName),
    unit,
    quantity,
    unitPrice,
    totalPrice,
    currency,
  };

  // Add optional fields if present
  if (productCode) product.productCode = productCode;
  if (sku) product.sku = sku;
  if (description) product.description = description;
  if (category) product.category = category;
  if (brand) product.brand = brand;

  return product;
}

/**
 * Get a column value from a row, handling undefined indices
 * @param row - The row data
 * @param columnIndex - The column index (may be undefined)
 * @returns The cell value or empty string
 */
function getColumnValue(row: string[], columnIndex?: number): string {
  if (columnIndex === undefined || columnIndex < 0 || columnIndex >= row.length) {
    return '';
  }
  return row[columnIndex]?.trim() || '';
}

/**
 * Parse a number from a string, handling different formats
 * Supports: 1,234.56 (US) and 1.234,56 (EU) formats
 * @param value - The string to parse
 * @returns The parsed number or NaN
 */
function parseNumber(value: string): number {
  if (!value) return NaN;

  // Remove whitespace and currency symbols
  let cleaned = value.trim().replace(/[$€£¥₹]/g, '');

  // Detect format based on last occurrence of comma vs period
  const lastComma = cleaned.lastIndexOf(',');
  const lastPeriod = cleaned.lastIndexOf('.');

  if (lastComma > lastPeriod) {
    // European format: 1.234,56
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    // US format: 1,234.56
    cleaned = cleaned.replace(/,/g, '');
  }

  return parseFloat(cleaned);
}
