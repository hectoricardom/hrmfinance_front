/**
 * Product Offers Module
 * Compare product offers from different suppliers via PDF/CSV uploads
 */

// Types
export * from './types/productOffer';

// Store
export { offersStore, type OffersStore } from './stores/offersStore';

// Services
export { parseCSVFile, parseCSVString, detectDelimiter, suggestColumnMapping } from './services/csvParser';
export { parsePDFFile, parseTextContent, extractTextFromPDF, parseProductLines, parseNumber, detectPricePattern } from './services/pdfParser';
export { analyzePdfWithAI, analyzeCsvWithAI, fileToBase64, getDefaultB2BPrompt, parseAIResponse, createOfferFromAIProducts } from './services/aiAnalyzer';
export { calculateSimilarity, groupProductsBySimilarity, normalizeUpc, upcMatch, getMatchQualityDisplay, getScoreDisplay } from './services/productMatcher';

// Components
export { default as ProductOffersComparison } from './components/ProductOffersComparison';
