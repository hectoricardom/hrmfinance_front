/**
 * Product Image Service
 * Handles AI-powered image search and image management for products
 */

import { fetchGraphQLSS } from '../../../services/utils';
import { authStore } from '../../../stores/authStore';

export interface ProductImage {
  id: string;
  productId: string;
  imageUrl: string;
  thumbnailUrl?: string;
  isPrimary: boolean;
  source: 'ai' | 'manual' | 'upload';
  searchQuery?: string;
  createdAt: string;
}

export interface AIImageSearchResult {
  imageUrl: string;
  thumbnailUrl: string;
  title: string;
  source: string;
  relevanceScore: number;
}

export interface ImageSearchResponse {
  success: boolean;
  images: AIImageSearchResult[];
  query: string;
  totalFound: number;
}

/**
 * Find product images using AI based on product specification
 * API accepts: productName, productId, upc, brand
 */
export async function findProductImageWithAI(
  productId: string,
  productName: string,
  upc?: string,
  brand?: string
): Promise<ImageSearchResponse> {
  try {
    const result = await fetchGraphQLSS({
      query: 'findProductImageWithAI',
      params: {
        businessId: authStore.getBusinessId(),
        productId,
        productName,
        upc: upc || '',
        brand: brand || '',
        //validateImages: true
      }
    });

    return {
      success: true,
      images: result?.images || [],
      query: productName,
      totalFound: result?.totalFound || 0
    };
  } catch (error) {
    console.error('Error finding product images with AI:', error);
    return {
      success: false,
      images: [],
      query: '',
      totalFound: 0
    };
  }
}

/**
 * Batch find images for multiple products (for faster processing)
 */
export async function findProductImagesBatch(
  products: Array<{
    productId: string;
    productName: string;
    upc?: string;
    brand?: string;
  }>
): Promise<Map<string, ImageSearchResponse>> {
  const results = new Map<string, ImageSearchResponse>();

  try {
    // Build batch request
    const batchQueries = products.map(p => ({
      productId: p.productId,
      productName: p.productName,
      upc: p.upc || '',
      brand: p.brand || ''
    }));

    const result = await fetchGraphQLSS({
      query: 'findProductImagesBatch',
      params: {
        products: batchQueries
      }
    });

    // Map results back to products
    if (result?.results) {
      for (const r of result.results) {
        results.set(r.productId, {
          success: true,
          images: r.images || [],
          query: r.productName || '',
          totalFound: r.totalFound || 0
        });
      }
    }
  } catch (error) {
    console.error('Error batch finding product images:', error);
  }

  return results;
}

/**
 * Get existing images for a product
 */
export async function getProductImages(productId: string): Promise<ProductImage[]> {
  try {
    const result = await fetchGraphQLSS({
      query: 'getProductImages',
      params: { 
        productId, 
        businessId: authStore.getBusinessId()
      }
    });

    return result?.images || [];
  } catch (error) {
    console.error('Error getting product images:', error);
    return [];
  }
}

/**
 * Add an image to a product (from AI search or manual URL)
 */
export async function addProductImage(
  productId: string,
  imageUrl: string,
  source: 'ai' | 'manual' | 'upload',
  isPrimary: boolean = false,
  searchQuery?: string
): Promise<ProductImage | null> {
  try {
    const result = await fetchGraphQLSS({
      query: 'addProductImageManual',
      params: {
        productId,
        imageUrl,
        source,
        isPrimary,
        searchQuery: searchQuery || ''
      }
    });

    return result?.image || null;
  } catch (error) {
    console.error('Error adding product image:', error);
    return null;
  }
}

/**
 * Set an image as the primary image for a product
 */
export async function setProductPrimaryImage(
  productId: string,
  imageId: string
): Promise<boolean> {
  try {
    const result = await fetchGraphQLSS({
      query: 'setProductPrimaryImage',
      params: {
        productId,
        imageId,
        businessId: authStore.getBusinessId()
      }
    });

    return result?.success || false;
  } catch (error) {
    console.error('Error setting primary image:', error);
    return false;
  }
}

/**
 * Delete a product image
 */
export async function deleteProductImage(
  productId: string,
  imageId: string
): Promise<boolean> {
  try {
    const result = await fetchGraphQLSS({
      query: 'markImageAsInaccessible',
      params: {
        productId,
        imageId,
        businessId: authStore.getBusinessId(),
        reason: "Inaccessible"
      }
    });

    return result?.success || false;
  } catch (error) {
    console.error('Error deleting product image:', error);
    return false;
  }
}

/**
 * Extract brand from product name
 */
function extractBrand(productName: string): string | null {
  // Common brand patterns
  const brands = [
    'SAMSUNG', 'APPLE', 'XIAOMI', 'REDMI', 'ALCATEL', 'ZTE', 'ITEL',
    'SONY', 'LG', 'MOTOROLA', 'NOKIA', 'HUAWEI', 'OPPO', 'VIVO', 'REALME',
    'COLGATE', 'PALMOLIVE', 'GILLETTE', 'IBERIA', 'GOYA', 'NESTLE',
    'COCA-COLA', 'PEPSI', 'NIKE', 'ADIDAS', 'PUMA', 'HP', 'DELL', 'LENOVO',
    'ASUS', 'ACER', 'MSI', 'LOGITECH', 'MICROSOFT', 'GOOGLE', 'AMAZON'
  ];

  const upperName = productName.toUpperCase();

  for (const brand of brands) {
    if (upperName.includes(brand)) {
      return brand;
    }
  }

  return null;
}

/**
 * Search for product images using multiple strategies in parallel
 * This is the multi-agent approach for faster and more accurate results
 */
export async function searchProductImagesMultiStrategy(
  productId: string,
  productName: string,
  productDescription?: string,
  category?: string,
  upc?: string
): Promise<AIImageSearchResult[]> {
  const allImages: AIImageSearchResult[] = [];

  // Extract brand from product name or description
  const brand = extractBrand(productName) || (productDescription ? extractBrand(productDescription) : null);

  // Run multiple search strategies in parallel
  const searchPromises: Promise<ImageSearchResponse>[] = [];

  // Strategy 1: Full product name with UPC and brand
  searchPromises.push(
    findProductImageWithAI(productId, productName, upc, brand || undefined)
  );


  /**
  // Strategy 2: UPC-only search (if available)
  if (upc) {
    searchPromises.push(
      findProductImageWithAI(productId, productName, upc, undefined)
    );
  }


  // Strategy 3: Category-enhanced name search
  if (category && !productName.toLowerCase().includes(category.toLowerCase())) {
    const categoryEnhancedName = `${category} ${productName}`;
    searchPromises.push(
      findProductImageWithAI(productId, categoryEnhancedName, upc, brand || undefined)
    );
  }
   */

  // Wait for all searches to complete
  const results = await Promise.allSettled(searchPromises);

  // Combine and deduplicate results
  const seenUrls = new Set<string>();
  let intr = false
  if(intr){

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.success) {
        for (const image of result.value.images) {
          if (!seenUrls.has(image.imageUrl)) {
            seenUrls.add(image.imageUrl);
            allImages.push(image);
          }
        }
      }
    }
  }
    // Sort by relevance score
  // allImages.sort((a, b) => b.relevanceScore - a.relevanceScore);

  return allImages.slice(0, 20); // Return top 20 results
 
}
