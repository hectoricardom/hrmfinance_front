/**
 * PDF Parser Service for Product Offers
 *
 * Uses Mozilla's PDF.js (pdfjs-dist) for reliable text extraction.
 */

import * as pdfjsLib from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import {
  ProductOffer,
  SupplierOffer,
  PDFParserConfig,
  defaultPDFConfig,
  normalizeProductName,
  normalizeUnit,
  generateProductId,
  generateOfferId,
} from '../types/productOffer';

// Configure PDF.js worker - use CDN for v3
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

/**
 * Parse a PDF file into a SupplierOffer
 */
export async function parsePDFFile(
  file: File,
  config?: Partial<PDFParserConfig>,
  supplierName?: string
): Promise<SupplierOffer> {
  const fullConfig: PDFParserConfig = {
    ...defaultPDFConfig,
    ...config,
  };

  try {
    const text = await extractTextFromPDF(file);
     console.log(text);

    if (!text || text.trim().length < 10) {
      throw new Error(
        'Could not extract text from PDF.\n\n' +
        'This PDF might be image-based.\n\n' +
        'Solution: Use "Paste Text" option instead:\n' +
        '1. Open the PDF in a viewer\n' +
        '2. Select and copy the product list\n' +
        '3. Paste it in the text input'
      );
    }

    // Parse product lines
    const products = parseProductLines(text, fullConfig);

    // Calculate totals
    const totalProducts = products.length;
    const totalValue = products.reduce((sum, p) => sum + p.totalPrice, 0);


    console.log(products);

    return {
      id: generateOfferId(),
      supplierName: supplierName || 'Unknown Supplier',
      sourceFile: file.name,
      sourceType: 'pdf',
      uploadDate: Date.now(),
      products,
      currency: fullConfig.defaultCurrency || 'USD',
      totalProducts,
      totalValue,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(errorMessage);
  }
}

/**
 * Parse text content directly (user copy-pastes from PDF)
 * 
 *   
 */
export function parseTextContent(
  text: string,
  config?: Partial<PDFParserConfig>,
  supplierName?: string
): SupplierOffer {
  const fullConfig: PDFParserConfig = {
    ...defaultPDFConfig,
    ...config,
  };

  const products = parseProductLines(text, fullConfig);
  const totalProducts = products.length;
  const totalValue = products.reduce((sum, p) => sum + p.totalPrice, 0);

  return {
    id: generateOfferId(),
    supplierName: supplierName || 'Manual Entry',
    sourceFile: 'text-input',
    sourceType: 'pdf',
    uploadDate: Date.now(),
    products,
    currency: fullConfig.defaultCurrency || 'USD',
    totalProducts,
    totalValue,
  };
}

/**
 * Extract text from PDF using PDF.js - ALL PAGES
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const typedArray = new Uint8Array(arrayBuffer);

    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({
      data: typedArray,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    });

    const pdf = await loadingTask.promise;
    const totalPages = pdf.numPages;
    console.log(`📄 PDF loaded: ${totalPages} pages total`);

    // Process pages SEQUENTIALLY to avoid issues
    const allPageTexts: string[] = [];

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      console.log(`📖 Processing page ${pageNum}/${totalPages}...`);

      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();

        console.log(`   Page ${pageNum}: ${textContent.items?.length || 0} text items`);

        if (!textContent.items || textContent.items.length === 0) {
          console.log(`   Page ${pageNum}: No text items found`);
          continue;
        }

        // Sort items by Y position (top to bottom) then X position (left to right)
        const sortedItems = [...textContent.items].sort((a: any, b: any) => {
          const aY = a.transform ? a.transform[5] : 0;
          const bY = b.transform ? b.transform[5] : 0;
          const aX = a.transform ? a.transform[4] : 0;
          const bX = b.transform ? b.transform[4] : 0;

          // Sort by Y descending (PDF coordinates have Y=0 at bottom)
          if (Math.abs(aY - bY) > 3) {
            return bY - aY;
          }
          // Same line, sort by X ascending
          return aX - bX;
        });

        // Group items into lines based on Y position
        const lines: string[][] = [];
        let currentLine: string[] = [];
        let lastY: number | null = null;

        for (const item of sortedItems) {
          const textItem = item as TextItem;
          if (!textItem.str || !textItem.str.trim()) continue;

          const y = textItem.transform ? textItem.transform[5] : 0;

          // New line if Y position changed significantly
          if (lastY !== null && Math.abs(y - lastY) > 3) {
            if (currentLine.length > 0) {
              lines.push(currentLine);
            }
            currentLine = [textItem.str];
          } else {
            currentLine.push(textItem.str);
          }
          lastY = y;
        }

        // Don't forget the last line
        if (currentLine.length > 0) {
          lines.push(currentLine);
        }

        // Join each line's items with spaces, then join lines with newlines
        const pageText = lines.map(line => line.join(' ')).join('\n');

        if (pageText.trim()) {
          allPageTexts.push(pageText);
          console.log(`   Page ${pageNum}: Extracted ${lines.length} lines, ${pageText.length} chars`);
        }
      } catch (pageError) {
        console.error(`   Page ${pageNum}: ERROR -`, pageError);
      }
    }

    // Join all pages
    const allText = allPageTexts.join('\n');
    console.log(`✅ Total extracted: ${allText.length} characters from ${allPageTexts.length} pages`);

    return allText;
  } catch (error) {
    console.error('PDF extraction failed:', error);
    throw new Error('Failed to read PDF file. Please try "Paste Text" option instead.');
  }
}

/**
 * Parse product lines from extracted text
 */
export function parseProductLines(
  text: string,
  config: PDFParserConfig
): ProductOffer[] {
  const products: ProductOffer[] = [];
  const lines = text.split(/[\n\r]+/).map(line => line.trim()).filter(Boolean);

  // Try to detect B2B catalog format first
  const b2bProducts = parseB2BCatalogFormat(text);
  if (b2bProducts.length > 0) {
    return b2bProducts;
  }

  // Common patterns for product lines
  const patterns = [
    // Pattern: UPC DESCRIPTION QTY WHOLESALE B2B_PRICE
    /^(\d{10,14})\s+(.{5,80}?)\s+(\d+)\s+\$?\s*(\d+[.,]\d{2})\s+\$?\s*(\d+[.,]\d{2})\s*$/,
    // Pattern: Product Name    Qty    Unit    UnitPrice    Total
    /^(.{3,50}?)\s+(\d+(?:[.,]\d+)?)\s+([a-zA-Z]{1,10})?\s*\$?\s*(\d+[.,]\d{2})\s+\$?\s*(\d+[.,]\d{2})\s*$/,
    // Pattern: Code Product Name Qty Unit UnitPrice Total
    /^([A-Z0-9]{2,10})\s+(.{3,40}?)\s+(\d+(?:[.,]\d+)?)\s+([a-zA-Z]{1,10})?\s*\$?\s*(\d+[.,]\d{2})\s+\$?\s*(\d+[.,]\d{2})\s*$/,
    // Pattern: Product Name    Qty    Price
    /^(.{3,50}?)\s+(\d+(?:[.,]\d+)?)\s+\$?\s*(\d+[.,]\d{2})\s*$/,
    // Pattern: Product Name    $Price
    /^(.{3,50}?)\s+\$\s*(\d+[.,]\d{2})\s*$/,
    // Pattern: Product Name    Price (no $)
    /^(.{5,50}?)\s+(\d+[.,]\d{2})\s*$/,
  ];

  // Add custom pattern if provided
  if (config.patterns?.productLine) {
    patterns.unshift(config.patterns.productLine);
  }

  for (const line of lines) {
    // Skip headers and empty lines
    if (
      line.length < 5 ||
      /^(product|item|description|qty|quantity|price|total|unit|code|sku|upc|image|expiration|wholesale|b2b|case)s?\s*$/i.test(line) ||
      /^[-=_\s]+$/.test(line)
    ) {
      continue;
    }

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        const product = parseMatchToProduct(match, config);
        if (product) {
          products.push(product);
          break;
        }
      }
    }
  }

  return products;
}

/**
 * Parse B2B catalog format with columns:
 * UPC | IMAGE | PRODUCT DESCRIPTION | EXPERATION | QTY IN A CASE | WHOLESALE PRICE BY CASE | B2B CASE PRICE
 *
 * Also handles table formats where:
 * - UPC is on its own line
 * - Description spans multiple lines
 * - Price line: "1 69.00 64.00 61.00 60.00"
 */
function parseB2BCatalogFormat(text: string): ProductOffer[] {
  const products: ProductOffer[] = [];

  // Check if this looks like a B2B catalog
  const hasB2BHeaders = /UPC|PRODUCT\s*DESCRIPTION|DESCRIPCION|WHOLESALE|B2B.*PRICE|PRECIO|QTY\s*IN|UNIDAD/i.test(text);
  if (!hasB2BHeaders) {
    return [];
  }

  // Split into lines and process
  const lines = text.split(/[\n\r]+/).map(line => line.trim()).filter(Boolean);

  // First, try multi-line table format (UPC on one line, description on next lines, then prices)
  const multiLineProducts = parseMultiLineTableFormat(lines);
  if (multiLineProducts.length > 0) {
    return multiLineProducts;
  }

  // Fallback to single-line format
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip header lines
    if (/^(UPC|IMAGE|IMAGEN|PRODUCT|DESCRIPTION|DESCRIPCION|EXPIRATION|EXPERATION|QTY|WHOLESALE|B2B|CASE|PRICE|PRECIO|UNIDAD|VENTA|MAYORISTA|CLIENTE|NEGOCIO|COMPRA)/i.test(line)) {
      continue;
    }

    // Check if line starts with UPC (10-14 digits) and has content after
    const upcMatch = line.match(/^(\d{10,14})\s+(.*)$/);
    if (!upcMatch) continue;

    const upc = upcMatch[1];
    const rest = upcMatch[2];

    // Strategy: Find prices from the END of the line, then work backwards
    const priceRegex = /(\d+)[.,](\d{2})/g;
    const prices: { value: number; index: number; length: number }[] = [];
    let priceMatch;
    while ((priceMatch = priceRegex.exec(rest)) !== null) {
      prices.push({
        value: parseNumber(priceMatch[0]),
        index: priceMatch.index,
        length: priceMatch[0].length
      });
    }

    if (prices.length === 0) continue;

    const b2bPrice = prices[prices.length - 1].value;
    const wholesalePrice = prices.length >= 2 ? prices[prices.length - 2].value : b2bPrice;
    const firstPriceStart = prices.length >= 2 ? prices[prices.length - 2].index : prices[0].index;

    let textBeforePrices = rest.substring(0, firstPriceStart).trim();

    let qty = 1;
    let expiration: string | undefined;

    const endingQtyMatch = textBeforePrices.match(/\s+(\d{1,3})$/);
    if (endingQtyMatch) {
      qty = parseInt(endingQtyMatch[1]);
      textBeforePrices = textBeforePrices.substring(0, textBeforePrices.length - endingQtyMatch[0].length).trim();
    }

    const expirationMatch = textBeforePrices.match(/\s+([A-Z]{3}\/\d{2}|\d{1,2}\/\d{2,4})$/i);
    if (expirationMatch) {
      expiration = expirationMatch[1];
      textBeforePrices = textBeforePrices.substring(0, textBeforePrices.length - expirationMatch[0].length).trim();
    }

    const description = textBeforePrices.trim();

    if (description.length >= 3 && b2bPrice > 0) {
      const product: ProductOffer = {
        id: generateProductId(),
        productCode: upc,
        productName: description,
        unit: 'unit',
        quantity: qty,
        unitPrice: b2bPrice,
        totalPrice: b2bPrice * qty,
        currency: 'USD',
        normalizedName: normalizeProductName(description),
      };

      if (expiration) {
        product.description = `Exp: ${expiration}`;
      }

      products.push(product);
      console.log(`✅ Parsed: UPC=${upc}, Desc="${description}", Qty=${qty}, Wholesale=${wholesalePrice}, B2B=${b2bPrice}`);
    }
  }

  return products;
}

/**
 * Parse multi-line table format where:
 * - Line with UPC only (or UPC + partial text)
 * - Following lines contain description
 * - Price line: "1 69.00 64.00 61.00 60.00" or similar
 */
function parseMultiLineTableFormat(lines: string[]): ProductOffer[] {
  const products: ProductOffer[] = [];

  console.log('📋 Attempting multi-line table format parsing...');
  console.log(`📋 Total lines to process: ${lines.length}`);

  // Price line pattern: starts with a small number (qty), followed by multiple prices
  // Example: "1 69.00 64.00 61.00 60.00"
  const priceLinePattern = /^(\d{1,2})\s+([\d.,]+)\s+([\d.,]+)(?:\s+([\d.,]+))?(?:\s+([\d.,]+))?$/;

  let currentUpc: string | null = null;
  let currentDescription: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip header lines
    if (/^(UPC|IMAGE|IMAGEN|PRODUCT|DESCRIPTION|DESCRIPCION|EXPIRATION|EXPERATION|QTY|WHOLESALE|B2B|CASE|PRICE|PRECIO|UNIDAD|VENTA|MAYORISTA|CLIENTE|NEGOCIO|COMPRA|UDES)/i.test(line)) {
      continue;
    }

    // Check if this is a UPC line (just a long number, 10-14 digits)
    const upcOnlyMatch = line.match(/^(\d{10,14})$/);
    if (upcOnlyMatch) {
      // Save previous product if exists
      if (currentUpc && currentDescription.length > 0) {
        console.log(`⚠️ Found new UPC without price line for previous: ${currentUpc}`);
      }

      currentUpc = upcOnlyMatch[1];
      currentDescription = [];
      console.log(`📦 Found UPC: ${currentUpc}`);
      continue;
    }

    // Check if this is a price line
    const priceMatch = line.match(priceLinePattern);
    if (priceMatch && currentUpc) {
      const qty = parseInt(priceMatch[1]) || 1;
      const price1 = parseNumber(priceMatch[2]); // Wholesale/retail price
      const price2 = parseNumber(priceMatch[3]); // B2B price (or first tier)

      const b2bPrice = price2;
      const wholesalePrice = price1;

      const description = currentDescription.join(' ').trim();

      if (description.length >= 3 && b2bPrice > 0) {
        products.push({
          id: generateProductId(),
          productCode: currentUpc,
          productName: description,
          unit: 'unit',
          quantity: qty,
          unitPrice: b2bPrice,
          totalPrice: b2bPrice * qty,
          currency: 'USD',
          normalizedName: normalizeProductName(description),
        });

        console.log(`✅ Multi-line parsed: UPC=${currentUpc}, Desc="${description}", Wholesale=${wholesalePrice}, B2B=${b2bPrice}`);
      }

      currentUpc = null;
      currentDescription = [];
      continue;
    }

    // Also check for inline format: UPC + description + prices all on one line
    // Pattern: 69021176125331 TELEFONO ZTE BLADE A35 ... 1 69.00 64.00 61.00 60.00
    // Strategy: Find UPC at start, find prices from the END, everything in between is description
    const upcStartMatch = line.match(/^(\d{10,14})\s+(.+)$/);
    if (upcStartMatch) {
      const upc = upcStartMatch[1];
      const rest = upcStartMatch[2];

      // Find all decimal prices (XX.XX format) from the end
      const allPrices: number[] = [];
      const priceMatches = rest.matchAll(/([\d]+)[.,]([\d]{2})(?=\s|$)/g);
      for (const m of priceMatches) {
        allPrices.push(parseNumber(m[0]));
      }

      // Need at least 2 prices (wholesale and B2B)
      if (allPrices.length >= 2) {
        // Find the position of the first price in the last group of prices
        // Pattern at end: "1 69.00 64.00 61.00 60.00" - qty followed by prices
        const endPattern = /\s+(\d{1,2})\s+([\d.,]+\s+[\d.,]+(?:\s+[\d.,]+)*)\s*$/;
        const endMatch = rest.match(endPattern);

        if (endMatch) {
          const qty = parseInt(endMatch[1]) || 1;
          const pricesStr = endMatch[2];
          const pricesInEnd = pricesStr.match(/[\d.,]+/g) || [];

          // Description is everything before the qty+prices section
          const descriptionEndIndex = rest.lastIndexOf(endMatch[0]);
          const description = rest.substring(0, descriptionEndIndex).trim();

          // Get wholesale (first) and B2B (second) prices
          const wholesalePrice = pricesInEnd.length > 0 ? parseNumber(pricesInEnd[0] || '0') : 0;
          const b2bPrice = pricesInEnd.length > 1 ? parseNumber(pricesInEnd[1] || '0') : wholesalePrice;

          if (description.length >= 3 && b2bPrice > 0) {
            products.push({
              id: generateProductId(),
              productCode: upc,
              productName: description,
              unit: 'unit',
              quantity: qty,
              unitPrice: b2bPrice,
              totalPrice: b2bPrice * qty,
              currency: 'USD',
              normalizedName: normalizeProductName(description),
            });

            console.log(`✅ Inline parsed: UPC=${upc}, Desc="${description}", Qty=${qty}, Wholesale=${wholesalePrice}, B2B=${b2bPrice}`);
            continue;
          }
        }
      }
    }

    // If we have a current UPC and this line is not a price line, it's part of description
    if (currentUpc) {
      // Skip very short lines that are likely image labels
      if (line.length > 3) {
        currentDescription.push(line);
        console.log(`   📝 Adding to description: "${line}"`);
      }
    }
  }

  console.log(`📋 Multi-line format found ${products.length} products`);
  return products;
}

/**
 * Parse regex match to ProductOffer
 */
function parseMatchToProduct(
  match: RegExpMatchArray,
  config: PDFParserConfig
): ProductOffer | null {
  const groups = match.slice(1);

  let productName = '';
  let productCode: string | undefined;
  let quantity = 1;
  let unit = config.defaultUnit || 'ea';
  let unitPrice = 0;
  let totalPrice = 0;

  try {
    if (groups.length === 2) {
      // Name, Price
      productName = groups[0];
      unitPrice = parseNumber(groups[1]);
      totalPrice = unitPrice;
    } else if (groups.length === 3) {
      // Name, Qty, Price
      productName = groups[0];
      quantity = parseNumber(groups[1]) || 1;
      totalPrice = parseNumber(groups[2]);
      unitPrice = totalPrice / quantity;
    } else if (groups.length === 4) {
      // Name, Qty, Unit, Price OR Code, Name, Qty, Price
      if (/^[A-Z0-9]{2,10}$/.test(groups[0])) {
        productCode = groups[0];
        productName = groups[1];
        quantity = parseNumber(groups[2]) || 1;
        totalPrice = parseNumber(groups[3]);
        unitPrice = totalPrice / quantity;
      } else {
        productName = groups[0];
        quantity = parseNumber(groups[1]) || 1;
        if (groups[2] && !/^\d/.test(groups[2])) {
          unit = normalizeUnit(groups[2]);
        }
        totalPrice = parseNumber(groups[3]);
        unitPrice = totalPrice / quantity;
      }
    } else if (groups.length === 5) {
      // Name, Qty, Unit, UnitPrice, Total
      productName = groups[0];
      quantity = parseNumber(groups[1]) || 1;
      if (groups[2]) unit = normalizeUnit(groups[2]);
      unitPrice = parseNumber(groups[3]);
      totalPrice = parseNumber(groups[4]);
    } else if (groups.length === 6) {
      // Code, Name, Qty, Unit, UnitPrice, Total
      productCode = groups[0];
      productName = groups[1];
      quantity = parseNumber(groups[2]) || 1;
      if (groups[3]) unit = normalizeUnit(groups[3]);
      unitPrice = parseNumber(groups[4]);
      totalPrice = parseNumber(groups[5]);
    }

    if (!productName || productName.length < 2 || unitPrice === 0) {
      return null;
    }

    return {
      id: generateProductId(),
      productName: productName.trim(),
      productCode,
      unit,
      quantity,
      unitPrice,
      totalPrice: totalPrice || unitPrice * quantity,
      currency: config.defaultCurrency || 'USD',
      normalizedName: normalizeProductName(productName),
    };
  } catch {
    return null;
  }
}

/**
 * Parse a number from a string
 */
export function parseNumber(value: string): number {
  if (typeof value === 'number') return value;
  if (!value || typeof value !== 'string') return 0;

  // Remove currency symbols and whitespace
  let cleaned = value.replace(/[$€£¥₹₽%\s]/g, '').trim();

  // Detect format
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');

  if (lastComma > lastDot) {
    // EU format: 1.234,56
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    // US format: 1,234.56
    cleaned = cleaned.replace(/,/g, '');
  }

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Detect the most likely price pattern in the text
 */
export function detectPricePattern(text: string): RegExp | null {
  const lines = text.split('\n').filter(l => l.trim());

  const patternTests = [
    { name: 'table', regex: /\d+[.,]\d{2}\s+\d+[.,]\d{2}/, count: 0 },
    { name: 'withQty', regex: /\d+\s+\$?\d+[.,]\d{2}/, count: 0 },
    { name: 'currency', regex: /\$\s?\d+[.,]\d{2}/, count: 0 },
    { name: 'simple', regex: /\d+[.,]\d{2}/, count: 0 },
  ];

  for (const line of lines) {
    for (const test of patternTests) {
      if (test.regex.test(line)) {
        test.count++;
      }
    }
  }

  const best = patternTests.sort((a, b) => b.count - a.count)[0];

  switch (best.name) {
    case 'table':
      return /^(.{3,50}?)\s+(\d+(?:[.,]\d+)?)\s+([a-zA-Z]+)?\s*\$?(\d+[.,]\d{2})\s+\$?(\d+[.,]\d{2})\s*$/;
    case 'withQty':
      return /^(.{3,50}?)\s+(\d+(?:[.,]\d+)?)\s+\$?(\d+[.,]\d{2})\s*$/;
    case 'currency':
      return /^(.{3,50}?)\s+\$\s?(\d+[.,]\d{2})\s*$/;
    default:
      return /^(.{5,50}?)\s+(\d+[.,]\d{2})\s*$/;
  }
}



/**
 * Convert ProductOffer array to BulkProductImporter schema
 * This generates JSON that matches the expected import format
 */
export interface ImportProductSchema {
  upc: string;
  description: string;
  expiration?: string;
  qty_in_case?: number;
  wholesale_case_price: number;
  b2b_case_price: number;
}

export function convertToImportSchema(products: ProductOffer[]): ImportProductSchema[] {
  return products.map(product => {
    // Extract expiration from description field if present (format: "Exp: DIC/28")
    let expiration: string | undefined;
    if (product.description && product.description.startsWith('Exp:')) {
      expiration = product.description.replace('Exp:', '').trim();
    }

    return {
      upc: product.productCode || product.barcode || '',
      description: product.productName,
      expiration,
      qty_in_case: product.quantity || 1,
      wholesale_case_price: product.totalPrice || product.unitPrice,
      b2b_case_price: product.unitPrice,
    };
  });
}

/**
 * Parse PDF and return JSON string ready for BulkProductImporter
 */
export async function parsePDFToImportJson(
  file: File,
  config?: Partial<PDFParserConfig>
): Promise<string> {
  const result = await parsePDFFile(file, config);
  const importProducts = convertToImportSchema(result.products);
  return JSON.stringify(importProducts, null, 2);
}