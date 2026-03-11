/**
 * Product Matcher Service
 * Compares products by name and UPC to find similar or equal products
 */

import { ProductOffer, normalizeProductName } from '../types/productOffer';

export interface SimilarityScore {
  score: number; // 0-100
  matchType: 'exact' | 'upc_match' | 'high' | 'medium' | 'low' | 'none';
  upcMatch: boolean;
  upcMismatch: boolean; // Both have UPCs but they don't match
  nameScore: number;
  details: string;
}

export interface ProductMatch {
  product: ProductOffer;
  supplierId: string;
  supplierName: string;
  similarity: SimilarityScore;
}

export interface ProductGroup {
  id: string;
  representativeName: string;
  representativeUpc?: string;
  products: ProductMatch[];
  matchQuality: 'exact' | 'high' | 'medium' | 'low';
  averageSimilarity: number;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;

  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[m][n];
}

/**
 * Calculate similarity between two strings (0-100)
 */
function stringSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 100;

  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 100;

  const distance = levenshteinDistance(str1, str2);
  return Math.round(((maxLen - distance) / maxLen) * 100);
}

/**
 * Calculate word-based similarity (Jaccard index)
 */
function wordSimilarity(str1: string, str2: string): number {
  const words1 = new Set(str1.toLowerCase().split(/\s+/).filter(w => w.length > 1));
  const words2 = new Set(str2.toLowerCase().split(/\s+/).filter(w => w.length > 1));

  if (words1.size === 0 && words2.size === 0) return 100;
  if (words1.size === 0 || words2.size === 0) return 0;

  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  return Math.round((intersection.size / union.size) * 100);
}

/**
 * Normalize UPC/barcode for comparison
 */
export function normalizeUpc(upc: string | undefined): string {
  if (!upc) return '';
  // Remove all non-digit characters
  const digits = upc.replace(/\D/g, '');
  // Pad to standard lengths or return as-is
  if (digits.length === 0) return '';
  return digits;
}

/**
 * Check if two UPCs match (handling different formats)
 */
export function upcMatch(upc1: string | undefined, upc2: string | undefined): boolean {
  const norm1 = normalizeUpc(upc1);
  const norm2 = normalizeUpc(upc2);

  if (!norm1 || !norm2) return false;
  if (norm1 === norm2) return true;

  // Handle leading zero variations (UPC-A vs UPC-E, EAN-13 vs UPC-A)
  // UPC-A is 12 digits, EAN-13 is 13 digits (with leading 0 for US products)
  if (norm1.length === 12 && norm2.length === 13) {
    return '0' + norm1 === norm2;
  }
  if (norm1.length === 13 && norm2.length === 12) {
    return norm1 === '0' + norm2;
  }

  // Check if one contains the other (for partial matches)
  if (norm1.length > 6 && norm2.length > 6) {
    if (norm1.includes(norm2) || norm2.includes(norm1)) {
      return true;
    }
  }

  return false;
}

/**
 * Extract potential product identifiers from name
 */
function extractIdentifiers(name: string): string[] {
  const identifiers: string[] = [];

  // Look for patterns like SKU, UPC, codes in the name
  const patterns = [
    /\b(\d{10,14})\b/g,           // UPC/EAN codes
    /\b([A-Z]{2,}\d{3,})\b/gi,     // SKU patterns like AB123
    /\b(\d{3,}-\d{3,})\b/g,        // Dash-separated codes
    /#(\w+)\b/g,                   // Hash codes
  ];

  patterns.forEach(pattern => {
    const matches = name.match(pattern);
    if (matches) {
      identifiers.push(...matches);
    }
  });

  return identifiers;
}

/**
 * Calculate comprehensive similarity score between two products
 */
export function calculateSimilarity(
  product1: ProductOffer,
  product2: ProductOffer
): SimilarityScore {
  // Check UPC/barcode match first (highest priority)
  const upc1 = normalizeUpc(product1.productCode || product1.barcode);
  const upc2 = normalizeUpc(product2.productCode || product2.barcode);
  const hasUpcMatch = upcMatch(upc1, upc2);

  // If both have UPCs and they match - perfect match
  if (hasUpcMatch) {
    return {
      score: 100,
      matchType: 'upc_match',
      upcMatch: true,
      upcMismatch: false,
      nameScore: 100,
      details: 'UPC/Barcode match',
    };
  }

  // Check if both products have UPCs but they DON'T match
  // This is a strong indicator they are DIFFERENT products
  const bothHaveUpc = upc1.length >= 6 && upc2.length >= 6;
  const upcMismatch = bothHaveUpc && !hasUpcMatch;

  // Normalize names for comparison
  const norm1 = normalizeProductName(product1.productName);
  const norm2 = normalizeProductName(product2.productName);

  // Exact normalized name match
  if (norm1 === norm2 && !upcMismatch) {
    return {
      score: 100,
      matchType: 'exact',
      upcMatch: false,
      upcMismatch: false,
      nameScore: 100,
      details: 'Exact name match',
    };
  }

  // Calculate various similarity metrics
  const levenshteinScore = stringSimilarity(norm1, norm2);
  const wordScore = wordSimilarity(norm1, norm2);

  // Check for identifier matches in names
  const ids1 = extractIdentifiers(product1.productName);
  const ids2 = extractIdentifiers(product2.productName);
  const hasIdMatch = ids1.some(id1 => ids2.some(id2 => id1 === id2));

  // Weighted combination
  let nameScore: number;
  if (hasIdMatch) {
    nameScore = Math.max(levenshteinScore, wordScore, 85);
  } else {
    // Weight word similarity higher for product names
    nameScore = Math.round(levenshteinScore * 0.4 + wordScore * 0.6);
  }

  // Boost score if both have same brand/category
  if (product1.brand && product2.brand &&
      product1.brand.toLowerCase() === product2.brand.toLowerCase()) {
    nameScore = Math.min(100, nameScore + 10);
  }

  // PENALTY: If both have UPCs but they don't match, significantly reduce score
  // Different UPCs = different products, even if names are similar
  let finalScore = nameScore;
  let details = `Name similarity: ${nameScore}%`;

  if (upcMismatch) {
    // Reduce score by 50% - different UPCs are a strong signal of different products
    finalScore = Math.round(nameScore * 0.5);
    details += ` (UPC mismatch: ${upc1} vs ${upc2} - score reduced)`;
  }

  if (hasIdMatch && !upcMismatch) {
    details += ' (ID match found)';
  }

  // Determine match type based on final score
  let matchType: SimilarityScore['matchType'];
  if (finalScore >= 90) {
    matchType = 'high';
  } else if (finalScore >= 70) {
    matchType = 'medium';
  } else if (finalScore >= 50) {
    matchType = 'low';
  } else {
    matchType = 'none';
  }

  return {
    score: finalScore,
    matchType,
    upcMatch: false,
    upcMismatch,
    nameScore,
    details,
  };
}

/**
 * Group products by similarity across DIFFERENT suppliers only
 * Products from the same supplier are never grouped together
 */
export function groupProductsBySimilarity(
  products: Array<{
    product: ProductOffer;
    supplierId: string;
    supplierName: string;
  }>,
  threshold: number = 70
): ProductGroup[] {
  const groups: ProductGroup[] = [];
  const assigned = new Set<string>();

  // Sort products to ensure consistent grouping
  const sortedProducts = [...products].sort((a, b) =>
    a.product.productName.localeCompare(b.product.productName)
  );

  for (const item of sortedProducts) {
    if (assigned.has(item.product.id)) continue;

    // Start a new group with this product
    const group: ProductGroup = {
      id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      representativeName: item.product.productName,
      representativeUpc: item.product.productCode || item.product.barcode,
      products: [{
        ...item,
        similarity: {
          score: 100,
          matchType: 'exact',
          upcMatch: false,
          upcMismatch: false,
          nameScore: 100,
          details: 'Reference product',
        },
      }],
      matchQuality: 'exact',
      averageSimilarity: 100,
    };
    assigned.add(item.product.id);

    // Find similar products from DIFFERENT suppliers only
    for (const candidate of sortedProducts) {
      if (assigned.has(candidate.product.id)) continue;

      // Skip products from the same supplier - only compare across different suppliers
      if (candidate.supplierId === item.supplierId) continue;

      const similarity = calculateSimilarity(item.product, candidate.product);

      if (similarity.score >= threshold) {
        group.products.push({
          ...candidate,
          similarity,
        });
        assigned.add(candidate.product.id);

        // Update representative if we found a UPC match
        if (similarity.upcMatch && !group.representativeUpc) {
          group.representativeUpc = candidate.product.productCode || candidate.product.barcode;
        }
      }
    }

    // Calculate average similarity and match quality
    if (group.products.length > 1) {
      const totalScore = group.products.reduce((sum, p) => sum + p.similarity.score, 0);
      group.averageSimilarity = Math.round(totalScore / group.products.length);

      if (group.averageSimilarity >= 95) {
        group.matchQuality = 'exact';
      } else if (group.averageSimilarity >= 85) {
        group.matchQuality = 'high';
      } else if (group.averageSimilarity >= 70) {
        group.matchQuality = 'medium';
      } else {
        group.matchQuality = 'low';
      }
    }

    groups.push(group);
  }

  return groups;
}

/**
 * Find best match for a product in a list of products
 */
export function findBestMatch(
  product: ProductOffer,
  candidates: ProductOffer[]
): { product: ProductOffer; similarity: SimilarityScore } | null {
  let bestMatch: ProductOffer | null = null;
  let bestScore: SimilarityScore | null = null;

  for (const candidate of candidates) {
    if (candidate.id === product.id) continue;

    const similarity = calculateSimilarity(product, candidate);

    if (!bestScore || similarity.score > bestScore.score) {
      bestMatch = candidate;
      bestScore = similarity;
    }
  }

  if (bestMatch && bestScore && bestScore.score >= 50) {
    return { product: bestMatch, similarity: bestScore };
  }

  return null;
}

/**
 * Get match quality label and color
 */
export function getMatchQualityDisplay(quality: ProductGroup['matchQuality']): {
  label: string;
  color: string;
  bgColor: string;
} {
  switch (quality) {
    case 'exact':
      return { label: 'Exact Match', color: 'var(--success-color)', bgColor: 'var(--success-light)' };
    case 'high':
      return { label: 'High Match', color: 'var(--info-color)', bgColor: 'var(--info-light)' };
    case 'medium':
      return { label: 'Similar', color: 'var(--warning-color)', bgColor: 'var(--warning-light)' };
    case 'low':
      return { label: 'Possible Match', color: 'var(--text-muted)', bgColor: 'var(--gray-100)' };
    default:
      return { label: 'Unknown', color: 'var(--text-muted)', bgColor: 'var(--gray-50)' };
  }
}

/**
 * Get score badge display
 */
export function getScoreDisplay(score: number): {
  label: string;
  color: string;
  bgColor: string;
} {
  if (score >= 95) {
    return { label: `${score}%`, color: 'var(--success-color)', bgColor: 'var(--success-light)' };
  } else if (score >= 85) {
    return { label: `${score}%`, color: 'var(--info-color)', bgColor: 'var(--info-light)' };
  } else if (score >= 70) {
    return { label: `${score}%`, color: 'var(--warning-color)', bgColor: 'var(--warning-light)' };
  } else {
    return { label: `${score}%`, color: 'var(--danger-color)', bgColor: 'var(--danger-light)' };
  }
}
