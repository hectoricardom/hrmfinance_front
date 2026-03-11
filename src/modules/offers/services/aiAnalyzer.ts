/**
 * AI Analyzer Service for Product Offers
 *
 * Calls backend AI queries to analyze PDF/CSV product catalogs
 * Queries: analyzePdfTefi, analyzeCsvTefi
 */

import { fetchGraphQLSS } from '../../../services/utils';
import {
  ProductOffer,
  SupplierOffer,
  generateProductId,
  generateOfferId,
  normalizeProductName,
} from '../types/productOffer';

export interface AIAnalysisResult {
  success: boolean;
  products: ProductOffer[];
  rawResponse?: string;
  error?: string;
}

/**
 * Analyze PDF with AI
 * Calls backend query: analyzePdfTefi
 *
 * @param pdfBase64 - Base64 encoded PDF content
 * @param prompt - Analysis prompt/instructions
 * @param supplierName - Optional supplier name
 */
export async function analyzePdfWithAI(
  pdfBase64: string,
  prompt: string,
  supplierName?: string
): Promise<AIAnalysisResult> {
  try {
    const params = {
      pdfBase64,
      prompt,
      supplierName: supplierName || 'Unknown Supplier',
    };

    const bdyq = {
      query: 'analyzePdfTefi',
      params,
    };

    console.log('📄 Calling analyzePdfTefi...');
    const response = await fetchGraphQLSS(bdyq);
    console.log('📄 AI Response:', response);

    // Parse the response
    return parseAIResponse(response.data || response);
  } catch (error) {
    console.error('❌ analyzePdfTefi error:', error);
    return {
      success: false,
      products: [],
      error: error instanceof Error ? error.message : 'Failed to analyze PDF with AI',
    };
  }
}

/**
 * Analyze CSV with AI
 * Calls backend query: analyzeCsvTefi
 *
 * @param csvContent - CSV text content OR base64 encoded
 * @param prompt - Analysis prompt/instructions
 * @param supplierName - Optional supplier name
 * @param isBase64 - Whether csvContent is base64 encoded
 */
export async function analyzeCsvWithAI(
  csvContent: string,
  prompt: string,
  supplierName?: string,
  isBase64: boolean = false
): Promise<AIAnalysisResult> {
  try {
    const params: Record<string, any> = {
      prompt,
      supplierName: supplierName || 'Unknown Supplier',
    };

    // Support both base64 and plain text
    if (isBase64) {
      params.csvBase64 = csvContent;
    } else {
      params.csvContent = csvContent;
    }

    const bdyq = {
      query: 'analyzeCsvTefi',
      params,
    };

    console.log('📊 Calling analyzeCsvTefi...');
    const response = await fetchGraphQLSS(bdyq);
    console.log('📊 AI Response:', response);

    // Parse the response
    return parseAIResponse(response.data || response);
  } catch (error) {
    console.error('❌ analyzeCsvTefi error:', error);
    return {
      success: false,
      products: [],
      error: error instanceof Error ? error.message : 'Failed to analyze CSV with AI',
    };
  }
}

/**
 * Convert File to Base64
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Generate the default prompt for B2B catalog analysis
 */
export function getDefaultB2BPrompt(): string {
  return `Analyze this B2B product catalog and extract ALL products.

Expected columns:
- UPC (barcode, 10-14 digits)
- IMAGE (skip)
- PRODUCT DESCRIPTION (product name)
- EXPERATION/EXPIRATION (date - optional)
- QTY IN A CASE (quantity per case)
- WHOLESALE PRICE BY CASE
- B2B CASE PRICE (use this as the final price)

Return a JSON array with this structure:
[
  {
    "productCode": "UPC number",
    "productName": "Product Description",
    "quantity": number,
    "unit": "case",
    "unitPrice": B2B_CASE_PRICE,
    "totalPrice": unitPrice * quantity,
    "currency": "USD"
  }
]

Extract ALL products. Return ONLY valid JSON, no explanations.`;
}

/**
 * Parse AI response into ProductOffer array
 */
export function parseAIResponse(aiResponse: any): AIAnalysisResult {
  try {
    let data = aiResponse;

    // If response is a string, try to parse it
    if (typeof aiResponse === 'string') {
      // Clean up the response - remove markdown code blocks if present
      let cleanedResponse = aiResponse.trim();
      cleanedResponse = cleanedResponse.replace(/^```json\s*/i, '');
      cleanedResponse = cleanedResponse.replace(/^```\s*/i, '');
      cleanedResponse = cleanedResponse.replace(/\s*```$/i, '');

      // Find the JSON array in the response
      const jsonMatch = cleanedResponse.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return {
          success: false,
          products: [],
          error: 'No JSON array found in AI response',
          rawResponse: aiResponse,
        };
      }
      data = JSON.parse(jsonMatch[0]);
    }

    // Handle if data is wrapped in a property
    if (data && data.products && Array.isArray(data.products)) {
      data = data.products;
    }

    if (!Array.isArray(data)) {
      return {
        success: false,
        products: [],
        error: 'AI response is not an array',
        rawResponse: JSON.stringify(aiResponse),
      };
    }

    // Convert to ProductOffer objects
    const products: ProductOffer[] = data
      .filter((item: any) => item && (item.productName || item.name || item.description))
      .map((item: any) => ({
        id: generateProductId(),
        productCode: item.productCode || item.upc || item.sku || item.code || undefined,
        productName: String(item.productName || item.name || item.description || '').trim(),
        quantity: parseFloat(item.quantity) || 1,
        unit: item.unit || 'case',
        unitPrice: parseFloat(item.unitPrice) || parseFloat(item.price) || parseFloat(item.b2bPrice) || 0,
        totalPrice:
          parseFloat(item.totalPrice) ||
          (parseFloat(item.unitPrice) || parseFloat(item.price) || 0) * (parseFloat(item.quantity) || 1),
        currency: item.currency || 'USD',
        normalizedName: normalizeProductName(item.productName || item.name || ''),
      }));

    return {
      success: true,
      products,
      rawResponse: JSON.stringify(aiResponse),
    };
  } catch (error) {
    return {
      success: false,
      products: [],
      error: error instanceof Error ? error.message : 'Failed to parse AI response',
      rawResponse: JSON.stringify(aiResponse),
    };
  }
}

/**
 * Create a SupplierOffer from AI-parsed products
 */
export function createOfferFromAIProducts(
  products: ProductOffer[],
  supplierName: string,
  sourceFile: string,
  sourceType: 'pdf' | 'csv'
): SupplierOffer {
  const totalProducts = products.length;
  const totalValue = products.reduce((sum, p) => sum + p.totalPrice, 0);

  return {
    id: generateOfferId(),
    supplierName: supplierName || 'AI Analyzed',
    sourceFile,
    sourceType,
    uploadDate: Date.now(),
    products,
    currency: 'USD',
    totalProducts,
    totalValue,
  };
}
