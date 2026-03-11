/**
 * Shipping Offers Service
 * Manages shipping rate offers and validates invoice prices
 */

import { getActiveConfig } from './activeOffersService';
import { devLog } from './utils';



// ============================================
// TYPES & INTERFACES
// ============================================

export type ShippingMethod = 'maritime' | 'air';
export type ItemCategory = 'miscellaneous' | 'durable' | 'tv' | 'box_flat_rate';

export interface WeightRange {
  min: number;
  max: number;
  needBePay?:number;
  pricePerLb: number;
  tariffPerLb?: number;
  freeWeight?: number; // Libras gratis
  effectivePricePerLb?: number; // Precio efectivo después de libras gratis
  description?: string;
}

export interface TVPricing {
  size: string; // "32", "40-45", "50-55", etc.
  pricePerLb: number;
  tax: number; // En dólares
  transport: number; // En dólares
  insuranceRate: number; // Porcentaje (ej: 0.30 para 30%)
}

export interface DurableGoodsPricing {
  pricePerLb?: number; // Para precio fijo
  transport?: number; // En dólares
  weightRanges?: WeightRange[]; // Para precios por rango
}

export interface BoxFlatRateOption {
  size: string; // "12x12x12", "14x14x14", "16x16x16"
  price: number; // Precio fijo por caja
  maxWeight: number; // Peso máximo incluido
  description: string;
}

export interface BoxFlatRatePricing {
  boxes: BoxFlatRateOption[];
  overweightChargePerLb?: number; // Cargo por libra de sobrepeso (opcional)
}

export interface ShippingOffer {
  method: ShippingMethod;
  category: ItemCategory;
  miscellaneous?: WeightRange[];
  durable?: DurableGoodsPricing;
  tv?: TVPricing[];
  boxFlatRate?: BoxFlatRatePricing;
  insuranceRate?: number; // Tasa de seguro general (opcional)
}

export interface PriceValidationResult {
  isValid: boolean;
  suggestedPrice: number;
  currentPrice: number;
  difference: number;
  differencePercent: number;
  recommendation: string;
  breakdown?: {
    basePrice?: number;
    tax?: number;
    transport?: number;
    insurance?: number;
    freeWeight?: number;
    effectiveWeight?: number;
  };
  appliedOffer?: {
    method: string;
    category: string;
    range?: string;
    pricePerLb: number;
  };
}

// ============================================
// SHIPPING OFFERS DATA
// ============================================

const MARITIME_OFFERS: ShippingOffer[] = [
  {
    method: 'maritime',
    category: 'miscellaneous',
    miscellaneous: [
      {
        min: 6.6,
        max: 44,
        pricePerLb: 3.99,
        description: '6.6 - 44 libras'
      },
      {
        min: 45,
        max: 60,
        pricePerLb: 3.49,
        freeWeight: 10,
        effectivePricePerLb: 2.9,
        needBePay: 50,
        description: '45 - 60 libras (10 libras gratis, se cobran 50)'
      },
      {
        min: 61,
        max: 70,
        pricePerLb: 2.99,
        freeWeight: 15,
        effectivePricePerLb: 2.3,
        needBePay: 55,
        description: '61 - 70 libras (15 libras gratis, se cobran 55)'
      },
      {
        min: 71,
        max: 80,
        pricePerLb: 2.10,
        freeWeight: 20,
        effectivePricePerLb: 1.57,
        needBePay: 60,
        description: '71 - 80 libras (20 libras gratis, se cobran 60)'
      },
      {
        min: 81,
        max: 120,
        pricePerLb: 1.99,
        freeWeight: 30,
        effectivePricePerLb: 1.49,
        needBePay: 90,
        description: '81 - 120 libras (30 libras gratis, se cobran 90)'
      }
    ]
  },
  {
    method: 'maritime',
    category: 'durable',
    durable: {
      weightRanges: [
        {
          min: 6.6,
          max: 44,
          pricePerLb: 4.50,
          description: '6.6 - 49 libras',
          tariffPerLb: 0
        },
        {
          min: 45,
          max: 60,
          pricePerLb: 3.99,
          description: '45 - 60 libras',
          tariffPerLb: 0
        },
        {
          min: 61,
          max: 70,
          pricePerLb: 3.69,
          description: '61 - 70 libras',
          tariffPerLb: 0
        },
        {
          min: 71,
          max: 80,
          pricePerLb: 3.15,
          description: '71 - 80 libras',
           tariffPerLb: 0
        },
        {
          min: 81,
          max: 120,
          pricePerLb: 3,
          description: '81 - 120 libras',
          tariffPerLb: 0
        }
      ]
    }
  },
  {
    method: 'maritime',
    category: 'tv',
    insuranceRate: 0.30, // 30%
    tv: [
      {
        size: '32"',
        pricePerLb: 5.00,
        tax: 30,
        transport: 20,
        insuranceRate: 0.30
      },
      {
        size: '40-45"',
        pricePerLb: 4.80,
        tax: 40,
        transport: 20,
        insuranceRate: 0.30
      },
      {
        size: '50-55"',
        pricePerLb: 4.50,
        tax: 50,
        transport: 20,
        insuranceRate: 0.30
      },
      {
        size: '60-70"',
        pricePerLb: 4.30,
        tax: 100,
        transport: 20,
        insuranceRate: 0.30
      },
      {
        size: '75-90"',
        pricePerLb: 3.99,
        tax: 130,
        transport: 20,
        insuranceRate: 0.30
      }
    ]
  },
  {
    method: 'maritime',
    category: 'box_flat_rate',
    boxFlatRate: {
      boxes: [
        {
          size: '12x12x12',
          price: 37.99,
          maxWeight: 40,
          description: 'Caja 12x12x12 - $37.99 hasta 40 lbs'
        },
        {
          size: '14x14x14',
          price: 57.99,
          maxWeight: 60,
          description: 'Caja 14x14x14 - $57.99 hasta 60 lbs'
        },
        {
          size: '16x16x16',
          price: 79.99,
          maxWeight: 78,
          description: 'Caja 16x16x16 - $79.99 hasta 78 lbs'
        }
      ]
    }
  }
];

const AIR_OFFERS: ShippingOffer[] = [
  {
    method: 'air',
    category: 'miscellaneous',
    miscellaneous: [
      {
        min: 6.6,
        max: 49,
        pricePerLb: 4.50,
        description: '6.6 - 49 libras'
      },
      {
        min: 50,
        max: 60,
        pricePerLb: 3.99,
        freeWeight: 5,
        effectivePricePerLb: 2.9,
        needBePay: 55,
        description: '50 - 60 libras (5 libras gratis, se cobran 55)'
      },
      {
        min: 61,
        max: 70,
        pricePerLb: 3.79,
        freeWeight: 7,
        effectivePricePerLb: 2.3,
        needBePay: 63,
        description: '61 - 70 libras (7 libras gratis, se cobran 63)'
      },
      {
        min: 71,
        max: 80,
        pricePerLb: 4.50,
        freeWeight: 20,
        effectivePricePerLb: 1.57,
        needBePay: 60,
        description: '71 - 80 libras (20 libras gratis, se cobran 60)'
      },
      {
        min: 81,
        max: 120,
        pricePerLb: 4.29,
        freeWeight: 30,
        effectivePricePerLb: 1.49,
        needBePay: 90,
        description: '81 - 120 libras (30 libras gratis, se cobran 90)'
      }
    ]
  },
  {
    method: 'air',
    category: 'durable',
    insuranceRate: 0.30, // 30%
    durable: {
      weightRanges: [
        {
          min: 6.6,
          max: 49,
          pricePerLb: 4.80,
          description: '6.6 - 49 libras',
          tariffPerLb: 0
        },
        {
          min: 50,
          max: 60,
          pricePerLb: 4.49,
          description: '50 - 60 libras',
          tariffPerLb: 0.39
        },
        {
          min: 61,
          max: 70,
          pricePerLb: 3.99,
          description: '61 - 70 libras',
          tariffPerLb: 0.37
        },
        {
          min: 71,
          max: 80,
          pricePerLb: 3.60,
          description: '71 - 80 libras',
           tariffPerLb: 0.35
        },
        {
          min: 81,
          max: 120,
          pricePerLb: 3.50,
          description: '81 - 120 libras',
          tariffPerLb: 0.125
        }
      ]
    }
  }
];

// ============================================
// SERVICE CLASS
// ============================================

export class ShippingOffersService {
  private maritimeOffers: ShippingOffer[];
  private airOffers: ShippingOffer[];

  constructor() {
    this.maritimeOffers = MARITIME_OFFERS;
    this.airOffers = AIR_OFFERS;
  }

  /**
   * Get all offers for a specific shipping method
   * First tries to load from active YABA offers, falls back to hardcoded
   */
  getOffersByMethod(method: ShippingMethod): ShippingOffer[] {
    const activeConfig = getActiveConfig();

    // If active YABA offers are loaded, convert them to ShippingOffer format
    if (activeConfig?.offers) {
      const yabaOffers = this.convertYabaToShippingOffers(activeConfig.offers, method);
      if (yabaOffers.length > 0) {
        devLog(`🎯 Using YABA offers for ${method}:`, yabaOffers.length, 'categories');
        return yabaOffers;
      }
    }

    // Fallback to hardcoded offers
    devLog(`📦 Using hardcoded offers for ${method} (no active YABA config)`);
    return method === 'maritime' ? this.maritimeOffers : this.airOffers;
  }

  /**
   * Convert YABA offer format to ShippingOffer format
   */
  private convertYabaToShippingOffers(yabaOffers: any[], method: ShippingMethod): ShippingOffer[] {
    const shippingOffers: ShippingOffer[] = [];

    yabaOffers
      .filter((offer: any) => offer.method === method)
      .forEach((offer: any) => {
        const category = offer.category as ItemCategory;

        if (category === 'miscellaneous' && offer.ranges) {
          shippingOffers.push({
            method,
            category: 'miscellaneous',
            miscellaneous: offer.ranges.map((r: any) => ({
              min: r.min,
              max: r.max,
              pricePerLb: r.pricePerLb,
              freeWeight: r.freeWeight,
              needBePay: r.needBePay,
              effectivePricePerLb: r.effectivePricePerLb,
              description: `${r.min} - ${r.max} lbs`
            }))
          });
        }

        if (category === 'durable' && offer.ranges) {
          shippingOffers.push({
            method,
            category: 'durable',
            durable: {
              weightRanges: offer.ranges.map((r: any) => ({
                min: r.min,
                max: r.max,
                pricePerLb: r.pricePerLb,
                tariffPerLb: r.tariffPerLb || 0,
                description: `${r.min} - ${r.max} lbs`
              }))
            }
          });
        }

        if (category === 'box_flat_rate' && offer.boxOptions) {
          shippingOffers.push({
            method,
            category: 'box_flat_rate',
            boxFlatRate: {
              boxes: offer.boxOptions.map((box: any) => ({
                size: box.size,
                price: box.price,
                maxWeight: box.maxWeight,
                description: box.description
              })),
              overweightChargePerLb: offer.overweightChargePerLb
            }
          });
        }
      });

    return shippingOffers;
  }

  /**
   * Get offer for a specific method and category
   */
  getOffer(method: ShippingMethod, category: ItemCategory): ShippingOffer | undefined {
    const offers = this.getOffersByMethod(method);
    return offers.find(offer => offer.category === category);
  }

  /**
   * Find the applicable weight range for a given weight
   */
  private findWeightRange(weight: number, ranges: WeightRange[]): WeightRange | undefined {
    return ranges.find(range => weight >= range.min && weight <= range.max);
  }

  /**
   * Calculate price for miscellaneous items
   */
  private calculateMiscellaneousPrice(
    weight: number,
    ranges: WeightRange[]
  ): { price: number; range: WeightRange; effectiveWeight: number } | null {
    const range = this.findWeightRange(weight, ranges);

    if (!range) return null;

    const effectiveWeight = range.freeWeight
      ? Math.min(weight, range.needBePay || 0)
      : weight;

    const price = effectiveWeight * range.pricePerLb;

    return { price, range, effectiveWeight };
  }

  /**
   * Calculate price for durable goods
   */
  private calculateDurablePrice(
    weight: number,
    durable: DurableGoodsPricing
  ): { price: number; breakdown: any, totalWeight: number } | null {
    // Si tiene precio fijo por libra
    if (durable.pricePerLb && !durable.weightRanges) {
      const basePrice = weight * durable.pricePerLb;
      const transport = durable.transport || 0;
      const total = basePrice + transport;

      return {
        price: total,
        totalWeight: weight,
        breakdown: {
          basePrice,
          transport,
          pricePerLb: durable.pricePerLb
        }
      };
    }

    // Si tiene rangos de peso
    if (durable.weightRanges) {
      const range = this.findWeightRange(weight, durable.weightRanges);
      if (!range) return null;

      const basePrice = weight * range.pricePerLb;
      const transport = durable.transport || 0;
      const total = basePrice + transport;

      return {
        price: total,
        totalWeight: weight,
        breakdown: {
          basePrice,
          transport,
          pricePerLb: range.pricePerLb,
          range: range.description,
          tariffPerLb: range.tariffPerLb 
        }
      };
    }

    return null;
  }

  /**
   * Calculate price for TV
   */
  private calculateTVPrice(
    weight: number,
    tvSize: string,
    tvPricing: TVPricing[],
    insuredValue?: number
  ): { price: number; breakdown: any } | null {
    const pricing = tvPricing.find(p => p.size === tvSize);

    if (!pricing) return null;

    const basePrice = weight * pricing.pricePerLb;
    const tax = pricing.tax;
    const transport = pricing.transport;
    const insurance = insuredValue ? insuredValue * pricing.insuranceRate : 0;
    const total = basePrice + tax + transport + insurance;

    return {
      price: total,
      breakdown: {
        basePrice,
        tax,
        transport,
        insurance,
        pricePerLb: pricing.pricePerLb,
        insuranceRate: pricing.insuranceRate,
        insuredValue
      }
    };
  }

  /**
   * Calculate price for box flat rate
   * Automatically selects the best box based on weight
   */
  private calculateBoxFlatRatePrice(
    weight: number,
    boxPricing: BoxFlatRatePricing,
    boxSize?: string
  ): { price: number; breakdown: any; selectedBox: BoxFlatRateOption } | null {
    let selectedBox: BoxFlatRateOption | undefined;

    // If box size is specified, use that box
    if (boxSize) {
      selectedBox = boxPricing.boxes.find(b => b.size === boxSize);
      if (!selectedBox) return null;
    } else {
      // Auto-select the smallest box that can fit the weight
      selectedBox = boxPricing.boxes
        .filter(b => weight <= b.maxWeight)
        .sort((a, b) => a.price - b.price)[0];

      // If no box fits, use the largest box and add overweight charge
      if (!selectedBox) {
        selectedBox = boxPricing.boxes
          .sort((a, b) => b.maxWeight - a.maxWeight)[0];
      }
    }

    if (!selectedBox) return null;

    let price = selectedBox.price;
    let overweightCharge = 0;

    // Calculate overweight charge if applicable
    if (weight > selectedBox.maxWeight && boxPricing.overweightChargePerLb) {
      const overweight = weight - selectedBox.maxWeight;
      overweightCharge = overweight * boxPricing.overweightChargePerLb;
      price += overweightCharge;
    }

    return {
      price,
      selectedBox,
      breakdown: {
        boxPrice: selectedBox.price,
        boxSize: selectedBox.size,
        maxWeight: selectedBox.maxWeight,
        actualWeight: weight,
        overweight: weight > selectedBox.maxWeight ? weight - selectedBox.maxWeight : 0,
        overweightCharge,
        overweightRate: boxPricing.overweightChargePerLb
      }
    };
  }

  /**
   * Calculate suggested price based on offers
   */
  calculateSuggestedPrice(params: {
    method: ShippingMethod;
    category: ItemCategory;
    weight: number;
    tvSize?: string;
    boxSize?: string;
    insuredValue?: number;
  }): { price: number; breakdown: any; appliedOffer: any, totalWeight: number } | null {
    const { method, category, weight, tvSize, boxSize, insuredValue } = params;
    const offer = this.getOffer(method, category);

    if (!offer) return null;

    // Miscellaneous
    if (category === 'miscellaneous' && offer.miscellaneous) {
      const result = this.calculateMiscellaneousPrice(weight, offer.miscellaneous);
      if (!result) return null;

      return {
        price: result.price,
        totalWeight: weight,
        breakdown: {
          basePrice: result.price,
          pricePerLb: result.range.pricePerLb,
          effectiveWeight: result.effectiveWeight,
          freeWeight: result.range.freeWeight,
          range: result.range.description,
          needBePay: result.range. needBePay
        },
        appliedOffer: {
          method,
          category,
          range: result.range.description,
          pricePerLb: result.range.pricePerLb
        }
      };
    }

    // Durable goods
    if (category === 'durable' && offer.durable) {
      const result = this.calculateDurablePrice(weight, offer.durable);
      if (!result) return null;
      return {
        price: result.price,
        totalWeight: weight,
        breakdown: result.breakdown,
        appliedOffer: {
          method,
          category,
          pricePerLb: result.breakdown.pricePerLb
        }
      };
    }

    // TV
    if (category === 'tv' && offer.tv && tvSize) {
      const result = this.calculateTVPrice(weight, tvSize, offer.tv, insuredValue);
      if (!result) return null;

      return {
        price: result.price,
        totalWeight: weight,
        breakdown: result.breakdown,
        appliedOffer: {
          method,
          category,
          tvSize,
          pricePerLb: result.breakdown.pricePerLb
        }
      };
    }

    // Box flat rate
    if (category === 'box_flat_rate' && offer.boxFlatRate) {
      const result = this.calculateBoxFlatRatePrice(weight, offer.boxFlatRate, boxSize);
      if (!result) return null;

      return {
        price: result.price,
        totalWeight: weight,
        breakdown: result.breakdown,
        appliedOffer: {
          method,
          category,
          boxSize: result.selectedBox.size,
          boxPrice: result.selectedBox.price
        }
      };
    }

    return null;
  }

  /**
   * Validate invoice price against offers
   */
  validatePrice(params: {
    method: ShippingMethod;
    category: ItemCategory;
    weight: number;
    currentPrice: number;
    tvSize?: string;
    insuredValue?: number;
    tolerancePercent?: number; // Porcentaje de tolerancia (default 5%)
  }): PriceValidationResult {
    const {
      method,
      category,
      weight,
      currentPrice,
      tvSize,
      insuredValue,
      tolerancePercent = 5
    } = params;

    const calculation = this.calculateSuggestedPrice({
      method,
      category,
      weight,
      tvSize,
      insuredValue
    });

    if (!calculation) {
      return {
        isValid: false,
        suggestedPrice: 0,
        currentPrice,
        difference: 0,
        differencePercent: 0,
        recommendation: `No se encontró oferta para ${method} - ${category} con ${weight} lbs`
      };
    }

    const suggestedPrice = calculation.price;
    const difference = currentPrice - suggestedPrice;
    const differencePercent = (difference / suggestedPrice) * 100;
    const isWithinTolerance = Math.abs(differencePercent) <= tolerancePercent;

    let recommendation = '';
    if (Math.abs(differencePercent) <= tolerancePercent) {
      recommendation = '✅ Precio correcto - Dentro del rango aceptable';
    } else if (difference > 0) {
      recommendation = `⚠️ Precio ALTO - Estás cobrando $${difference.toFixed(2)} MÁS de lo sugerido (${Math.abs(differencePercent).toFixed(1)}% más)`;
    } else {
      recommendation = `⚠️ Precio BAJO - Estás cobrando $${Math.abs(difference).toFixed(2)} MENOS de lo sugerido (${Math.abs(differencePercent).toFixed(1)}% menos)`;
    }

    return {
      isValid: isWithinTolerance,
      suggestedPrice,
      currentPrice,
      difference,
      differencePercent,
      recommendation,
      breakdown: calculation.breakdown,
      appliedOffer: calculation.appliedOffer
    };
  }

  /**
   * Get all weight ranges for a specific method and category
   */
  getWeightRanges(method: ShippingMethod, category: ItemCategory): WeightRange[] {
    const offer = this.getOffer(method, category);

    if (category === 'miscellaneous' && offer?.miscellaneous) {
      return offer.miscellaneous;
    }

    if (category === 'durable' && offer?.durable?.weightRanges) {
      return offer.durable.weightRanges;
    }

    return [];
  }

  /**
   * Get TV pricing options
   */
  getTVPricing(method: ShippingMethod): TVPricing[] {
    const offer = this.getOffer(method, 'tv');
    return offer?.tv || [];
  }

  /**
   * Get box flat rate options
   */
  getBoxOptions(method: ShippingMethod): BoxFlatRateOption[] {
    const offer = this.getOffer(method, 'box_flat_rate');
    return offer?.boxFlatRate?.boxes || [];
  }

  /**
   * Format offer information for display
   */
  formatOfferInfo(params: {
    method: ShippingMethod;
    category: ItemCategory;
    weight: number;
    tvSize?: string;
    boxSize?: string;
  }): string {
    const { method, category, weight, tvSize, boxSize } = params;
    const methodLabel = method === 'maritime' ? 'Marítimo' : 'Aéreo';
    const categoryLabel = {
      miscellaneous: 'Misceláneas',
      durable: 'Duraderos',
      tv: 'Televisor',
      box_flat_rate: 'Tarifa Plana por Caja'
    }[category];

    const calculation = this.calculateSuggestedPrice({
      method,
      category,
      weight,
      tvSize,
      boxSize
    });

    if (!calculation) {
      return `${methodLabel} - ${categoryLabel}: No disponible para ${weight} lbs`;
    }

    let info = `${methodLabel} - ${categoryLabel}\n`;
    info += `Peso: ${weight} lbs\n`;

    // Box flat rate specific info
    if (category === 'box_flat_rate' && calculation.breakdown.boxSize) {
      info += `\nCaja seleccionada: ${calculation.breakdown.boxSize}\n`;
      info += `Precio de caja: $${calculation.breakdown.boxPrice.toFixed(2)}\n`;
      info += `Capacidad máxima: ${calculation.breakdown.maxWeight} lbs\n`;

      if (calculation.breakdown.overweight > 0) {
        info += `\n⚠️ Sobrepeso: ${calculation.breakdown.overweight.toFixed(2)} lbs\n`;
        if (calculation.breakdown.overweightCharge > 0) {
          info += `Cargo por sobrepeso: $${calculation.breakdown.overweightCharge.toFixed(2)}\n`;
        }
      } else {
        info += `Espacio disponible: ${(calculation.breakdown.maxWeight - weight).toFixed(2)} lbs\n`;
      }
    }

    if (calculation.breakdown.range) {
      info += `Rango: ${calculation.breakdown.range}\n`;
    }

    if (calculation.breakdown.pricePerLb) {
      info += `Precio por libra: $${calculation.breakdown.pricePerLb.toFixed(2)}\n`;
    }

    if (calculation.breakdown.freeWeight) {
      info += `Libras gratis: ${calculation.breakdown.freeWeight}\n`;
      info += `Peso efectivo: ${calculation.breakdown.effectiveWeight} lbs\n`;
    }

    if (calculation.breakdown.tax) {
      info += `Impuesto: $${calculation.breakdown.tax.toFixed(2)}\n`;
    }

    if (calculation.breakdown.transport) {
      info += `Transporte: $${calculation.breakdown.transport.toFixed(2)}\n`;
    }

    info += `\n💰 Total sugerido: $${calculation.price.toFixed(2)}`;

    return info;
  }
}

// Export singleton instance
export const shippingOffersService = new ShippingOffersService();
export default shippingOffersService;
