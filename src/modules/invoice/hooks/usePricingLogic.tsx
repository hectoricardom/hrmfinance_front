// Pricing logic and configuration for invoice items

import {
  calculatePrice as calculateOfferPrice,
  isOffersLoaded
} from '../../../services/activeOffersService';
import type { ShippingMethod, ItemCategory } from '../../../services/shippingOffersService';
import { devLog } from '../../../services/utils';

// Pricing configuration (simple)
export const BASE_TRANSPORT_COST = 20;

// 🚨 EQUIPOS QUE REQUIEREN BULTO EXCLUSIVO
export const EXCLUSIVE_BULK_ITEMS = [
  // Televisores y pantallas
  '📺 TV', '📺 Television', '📺 Televisor', '📺 Smart TV', 
  '🖥️ Monitor', '🖥️ Pantalla', '📺 Plasma', '📺 LED TV', '📺 OLED TV',
  
  // Computadoras y laptops
  '💻 Computadora', '💻 Laptop', '💻 PC', '💻 Desktop', 
  '💻 Macbook', '💻 Notebook', '🖥️ iMac', '💻 Chromebook',
  
  // Generadores y equipos pesados
  '⚡ Generador', '⚡ Generator', '🔧 Generador Electrico',
  '🔌 Planta Electrica', '⚡ Inversor', '🔌 UPS',
  
  // Baterías de litio y equipos con batería
  '🔋 Bateria', '🔋 Battery', '🔋 Bateria de Litio', '🔋 Lithium Battery',
  '🔋 Power Bank', '🔋 Banco de Energia', '🔋 Bateria Externa',
  '🔋 Cargador Solar', '🔋 Solar Charger', '🚗 Bateria de Carro',
  
  // Equipos electrónicos grandes
  '🎤 Amplificador', '🎵 Bocinas Grandes', '🎵 Sound System',
  '📷 Camara Profesional', '🎥 Video Camera', '📹 Videocamara',
  '🖨️ Impresora Grande', '🖨️ Printer', '📠 Fax Machine',
  
  // Electrodomésticos
  '❄️ Mini Nevera', '🌀 Ventilador de Torre', '☕ Cafetera Electrica',
  '🍞 Tostadora', '🥤 Licuadora', '🍯 Procesador de Alimentos'
];

// 📊 CONFIGURACIÓN DE PRECIOS DINÁMICOS POR CATEGORÍA
export const DYNAMIC_PRICING = {
  // Misceláneas (ropa, zapatos, accesorios, etc.)
  MISCELANEAS: {
    over50items: 2.99, // 50+ items get discount
    under50items: 3.99, // Less than 50 items
    description: 'Ropa, zapatos, accesorios, artículos personales'
  },
  
  // Duraderos (no cuentan para el descuento de misceláneas)
  DURADEROS: {
    price: 4.50,
    description: 'Electrónicos, electrodomésticos, herramientas',
    arancel: {
      ranges: [
        { min: 0, max: 5, cost: 5 },
        { min: 5, max: 20, cost: 10 },
        { min: 20, max: 50, cost: 20 },
        { min: 50, max: 100, cost: 35 },
        { min: 100, max: Infinity, cost: 50 }
      ]
    }
  },
  
  // Baterías de litio (precio especial)
  LITHIUM_BATTERIES: {
    price: 8.99,
    description: 'Baterías de litio, power banks, equipos con batería de litio'
  },
  
  // Equipos exclusivos (requieren bulto propio)
  EXCLUSIVE: {
    price: 6.99,
    description: 'TVs, computadoras, generadores (bulto exclusivo)'
  },
  
  // Documentos
  DOCUMENTS: {
    price: 1.99,
    description: 'Documentos, papeles, certificados'
  }
};

// 🏷️ CATEGORIZACIÓN AUTOMÁTICA DE RESERVAS
export const categorizeReservaType = (type: string): keyof typeof DYNAMIC_PRICING => {
  const upperType = type.toUpperCase();
  
  // Verificar si es batería de litio
  if (upperType.includes('BATERIA') || upperType.includes('BATTERY') || 
      upperType.includes('POWER BANK') || upperType.includes('LITIO') || 
      upperType.includes('LITHIUM')) {
    return 'LITHIUM_BATTERIES';
  }
  
  // Verificar si requiere bulto exclusivo
  if (EXCLUSIVE_BULK_ITEMS.some(item => {
    const itemClean = item.replace(/^[\u{1F000}-\u{1F9FF}\u{2600}-\u{27BF}]\s*/u, '').toUpperCase();
    return upperType.includes(itemClean) || type.toLowerCase().includes(itemClean.toLowerCase());
  })) {
    return 'EXCLUSIVE';
  }
  
  // Verificar si es durable (electrónicos, electrodomésticos)
  if (upperType.includes('TV') || upperType.includes('DURADEROS') || upperType.includes('TELEFONO') || upperType.includes('PHONE') ||
      upperType.includes('ELECTRODOMESTICO') || upperType.includes('ELECTRONIC') ||
      upperType.includes('CAMARA') || upperType.includes('CAMERA') || upperType.includes('AUDIO') ||
      upperType.includes('HERRAMIENTA') || upperType.includes('TOOL') || upperType.includes('EQUIPO')) {
    return 'DURADEROS';
  }
  
  // Verificar si son documentos
  if (upperType.includes('DOCUMENTO') || upperType.includes('DOCUMENT') || 
      upperType.includes('PAPEL') || upperType.includes('CERTIFICADO')) {
    return 'DOCUMENTS';
  }
  
  // Por defecto es miscelánea
  return 'MISCELANEAS';
};

// https://ssgloghr.com/

// 💰 CALCULAR PRECIO DINÁMICO BASADO EN CATEGORÍA Y PESO/CANTIDAD DEL BULTO
export const calculateDynamicPrice = (
  reservaType: string,
  bulkId: string,
  reservas: any[],
  qty?: number,
  weight?: number,
  shippingMethod?: 'MARITIMO' | 'AEREO'
): number => {
  const category = categorizeReservaType(reservaType);

  // 🎯 Try YABA offers first (if loaded and weight available)
  if (isOffersLoaded() && weight && weight > 0 && shippingMethod) {
    const method: ShippingMethod = shippingMethod === 'AEREO' ? 'air' : 'maritime';

    // Map category to ItemCategory
    let itemCategory: ItemCategory = 'miscellaneous';
    if (category === 'DURADEROS' || category === 'LITHIUM_BATTERIES' || category === 'EXCLUSIVE') {
      itemCategory = 'durable';
    }

    const priceCalc = calculateOfferPrice(weight, method, itemCategory);

    if (priceCalc) {
      devLog(`💰 [Hook] Using YABA offer: ${weight}lbs @ ${priceCalc.pricePerLb}/lb = ${priceCalc.price}`);
      return priceCalc.pricePerLb;
    }
  }

  // 📦 Fallback to hardcoded pricing
  if (!bulkId) {
    // Para reservas sin bulto, aplicar precio base según categoría
    switch (category) {
      case 'MISCELANEAS':
        return DYNAMIC_PRICING.MISCELANEAS.under50items;
      case 'DURADEROS':
        return DYNAMIC_PRICING.DURADEROS.price;
      case 'LITHIUM_BATTERIES':
        return DYNAMIC_PRICING.LITHIUM_BATTERIES.price;
      case 'EXCLUSIVE':
        return DYNAMIC_PRICING.EXCLUSIVE.price;
      case 'DOCUMENTS':
        return DYNAMIC_PRICING.DOCUMENTS.price;
      default:
        return DYNAMIC_PRICING.MISCELANEAS.under50items;
    }
  }

  // Calcular peso total de misceláneas en el bulto
  const miscellaneasWeight = reservas
    .filter(r => r.bulkId === bulkId && r.category === 'MISCELANEAS')
    .reduce((sum, r) => sum + (r.qty || 0), 0);

  // Aplicar precios según categoría


  switch (category) {
    case 'MISCELANEAS':
      // Usar peso si está disponible, sino usar cantidad

      //const totalWeight = miscellaneasWeight;
      return miscellaneasWeight >= 46 ? DYNAMIC_PRICING.MISCELANEAS.over50items : DYNAMIC_PRICING.MISCELANEAS.under50items;

    case 'DURADEROS':
      return DYNAMIC_PRICING.DURADEROS.price;
    case 'LITHIUM_BATTERIES':
      return DYNAMIC_PRICING.LITHIUM_BATTERIES.price;
    case 'EXCLUSIVE':
      return DYNAMIC_PRICING.EXCLUSIVE.price;
    case 'DOCUMENTS':
      return DYNAMIC_PRICING.DOCUMENTS.price;
    default:
      return DYNAMIC_PRICING.MISCELANEAS.under50items;
  }
};

// 💰 CALCULAR ARANCEL DINÁMICO BASADO EN CATEGORÍA Y CANTIDAD
export const calculateArancel = (category: string, qty: number): number => {
  //const category = categorizeReservaType(reservaType);
  
  // Solo duraderos tienen arancel dinámico por cantidad
  if (category === 'DURADEROS' && DYNAMIC_PRICING.DURADEROS.arancel) {
    const ranges = DYNAMIC_PRICING.DURADEROS.arancel.ranges;
    for (const range of ranges) {
      if (qty >= range.min && qty < range.max) {
        return range.cost;
      }
    }
  }
  
  // Otras categorías no tienen arancel automático
  return 0;
};

// 🚨 VALIDAR SI UN ITEM REQUIERE BULTO EXCLUSIVO
export const validateExclusiveBulkItem = (category: string, bulkId: string, products: any[], reservas: any[], services: any[]): { isValid: boolean; error?: string } => {
  //const category = categorizeReservaType(reservaType);
  
  if (category !== 'EXCLUSIVE') {
    return { isValid: true };
  }

  // Verificar si el bulto ya tiene otros items
  const itemsInBulk = [
    ...products.filter(p => p.bulkId === bulkId),
    ...reservas.filter(r => r.bulkId === bulkId),
    ...services.filter(s => s.bulkId === bulkId)
  ];

  if (itemsInBulk?.length > 0) {
    return { 
      isValid: false, 
      error: `⚠️ ${category} requiere un bulto exclusivo. Este item debe ir solo en su propio bulto.` 
    };
  }

  return { isValid: true };
};

// 🚨 VALIDAR SI SE PUEDE AGREGAR ITEM A BULTO CON EQUIPOS EXCLUSIVOS
export const validateBulkCompatibility = (bulkId: string, products: any[], reservas: any[], services: any[]): { isValid: boolean; error?: string } => {
  const itemsInBulk = [
    ...products.filter(p => p.bulkId === bulkId),
    ...reservas.filter(r => r.bulkId === bulkId),
    ...services.filter(s => s.bulkId === bulkId)
  ];

  // Verificar si hay items exclusivos en el bulto
  const hasExclusiveItems = itemsInBulk?.some(item => {
    const type = item.type || item.product?.label || '';
    return categorizeReservaType(type) === 'EXCLUSIVE';
  });

  if (hasExclusiveItems) {
    const exclusiveItem = itemsInBulk?.find(item => {
      const type = item.type || item.product?.label || '';
      return categorizeReservaType(type) === 'EXCLUSIVE';
    });
    const itemName = exclusiveItem?.type || exclusiveItem?.product?.label || 'equipo exclusivo';
    
    return { 
      isValid: false, 
      error: `⚠️ Este bulto contiene ${itemName} que requiere ir solo. No se pueden agregar más items.` 
    };
  }

  return { isValid: true };
};