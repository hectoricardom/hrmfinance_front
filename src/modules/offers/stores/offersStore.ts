import { createSignal, createMemo } from 'solid-js';
import type {
  SupplierOffer,
  ProductOffer,
  ProductComparison,
  OffersComparisonResult,
  ProductSimilarity,
} from '../types/productOffer';
import {
  normalizeProductName,
  generateOfferId,
  generateComparisonId,
} from '../types/productOffer';
import {
  groupProductsBySimilarity,
  type ProductGroup,
} from '../services/productMatcher';

/**
 * SolidJS Store for managing product offers comparison
 * Singleton pattern for global state management
 */
function createOffersStore() {
  // State: List of supplier offers
  const [offers, setOffers] = createSignal<SupplierOffer[]>([]);

  // Similarity threshold for grouping products (0-100)
  const [similarityThreshold, setSimilarityThreshold] = createSignal<number>(70);

  // Add a new supplier offer
  const addSupplierOffer = (offer: SupplierOffer): void => {
    setOffers((prev) => [...prev, offer]);
  };

  // Remove a supplier offer by ID
  const removeSupplierOffer = (offerId: string): void => {
    setOffers((prev) => prev.filter((offer) => offer.id !== offerId));
  };

  // Update a supplier offer
  const updateSupplierOffer = (offerId: string, updates: Partial<SupplierOffer>): void => {
    setOffers((prev) =>
      prev.map((offer) => {
        if (offer.id === offerId) {
          const updatedOffer = { ...offer, ...updates };
          // Recalculate metadata if products were updated
          if (updates.products) {
            updatedOffer.totalProducts = updatedOffer.products.length;
            updatedOffer.totalValue = updatedOffer.products.reduce(
              (sum, product) => sum + product.totalPrice,
              0
            );
          }
          return updatedOffer;
        }
        return offer;
      })
    );
  };

  // Clear all offers
  const clearAllOffers = (): void => {
    setOffers([]);
  };

  // Get a specific offer by ID
  const getOfferById = (offerId: string): SupplierOffer | undefined => {
    return offers().find((offer) => offer.id === offerId);
  };

  // Computed: Compare all products across suppliers using similarity matching
  const compareProducts = createMemo<ProductComparison[]>(() => {
    const currentOffers = offers();
    if (currentOffers.length === 0) return [];

    // Collect all products from all suppliers
    const allProducts: Array<{
      product: ProductOffer;
      supplierId: string;
      supplierName: string;
    }> = [];

    currentOffers.forEach((supplierOffer) => {
      supplierOffer.products.forEach((product) => {
        allProducts.push({
          product,
          supplierId: supplierOffer.id,
          supplierName: supplierOffer.supplierName,
        });
      });
    });

    // Group products by similarity
    const threshold = similarityThreshold();
    const productGroups = groupProductsBySimilarity(allProducts, threshold);

    // Create comparisons for each product group
    const comparisons: ProductComparison[] = productGroups.map((group) => {
      // Calculate price statistics
      const prices = group.products.map((p) => p.product.unitPrice);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;

      // Find the best offer
      const bestOfferIndex = prices.indexOf(minPrice);
      const bestOffer = group.products[bestOfferIndex];

      // Get representative product info
      const representativeProduct = group.products[0].product;

      // Build comparison object
      const comparison: ProductComparison = {
        productName: group.representativeName,
        normalizedName: normalizeProductName(group.representativeName),
        productCode: group.representativeUpc || representativeProduct.productCode,
        category: representativeProduct.category,
        matchQuality: group.matchQuality,
        averageSimilarity: group.averageSimilarity,
        offers: group.products.map((productMatch) => {
          const isBestPrice = productMatch.product.unitPrice === minPrice;
          const priceDifference = isBestPrice
            ? 0
            : productMatch.product.unitPrice - minPrice;
          const priceDifferencePercent = isBestPrice
            ? 0
            : ((priceDifference / minPrice) * 100);

          return {
            supplierId: productMatch.supplierId,
            supplierName: productMatch.supplierName,
            productOffer: productMatch.product,
            isBestPrice,
            priceDifference: priceDifference > 0 ? priceDifference : undefined,
            priceDifferencePercent: priceDifferencePercent > 0 ? priceDifferencePercent : undefined,
            similarity: productMatch.similarity,
          };
        }),
        bestOffer: {
          supplierId: bestOffer.supplierId,
          supplierName: bestOffer.supplierName,
          price: minPrice,
        },
        averagePrice: avgPrice,
        priceRange: {
          min: minPrice,
          max: maxPrice,
        },
      };

      return comparison;
    });

    // Sort by product name for consistent ordering
    return comparisons.sort((a, b) => a.productName.localeCompare(b.productName));
  });

  // Get comparison result for a specific product by normalized name
  const getBestOffersForProduct = (normalizedName: string): ProductComparison | undefined => {
    return compareProducts().find((comp) => comp.normalizedName === normalizedName);
  };

  // Computed: Generate full comparison result with summary
  const getComparisonResult = createMemo<OffersComparisonResult>(() => {
    const currentOffers = offers();
    const comparisons = compareProducts();

    // Calculate potential savings (sum of price differences for all products)
    const potentialSavings = comparisons.reduce((total, comparison) => {
      // For each product, calculate the maximum potential saving
      // (difference between worst and best price)
      const priceRange = comparison.priceRange.max - comparison.priceRange.min;
      return total + priceRange;
    }, 0);

    // Count unique products across all suppliers
    const uniqueProducts = new Set(
      currentOffers.flatMap((offer) =>
        offer.products.map((product) => normalizeProductName(product.productName))
      )
    );

    // Count products that appear in multiple offers
    const productsWithMultipleOffers = comparisons.filter(
      (comp) => comp.offers.length > 1
    ).length;

    return {
      id: generateComparisonId(),
      name: `Comparison ${new Date().toLocaleDateString()}`,
      createdAt: Date.now(),
      supplierOffers: currentOffers,
      comparisons,
      summary: {
        totalProducts: uniqueProducts.size,
        totalSuppliers: currentOffers.length,
        productsWithMultipleOffers,
        potentialSavings,
      },
    };
  });

  return {
    // State
    offers,
    similarityThreshold,

    // Actions
    addSupplierOffer,
    removeSupplierOffer,
    updateSupplierOffer,
    clearAllOffers,
    getOfferById,
    setSimilarityThreshold,

    // Computed
    compareProducts,
    getBestOffersForProduct,
    getComparisonResult,
  };
}

// Export singleton instance
export const offersStore = createOffersStore();

// Export type for consumers
export type OffersStore = ReturnType<typeof createOffersStore>;
