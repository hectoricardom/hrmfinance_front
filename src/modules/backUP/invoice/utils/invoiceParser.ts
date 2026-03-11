import { devLog } from '../../../services/utils';
import { inventoryStore } from '../../inventory/stores/inventoryStore';


interface RawInvoiceProduct {
  product: {
    id: string;
    label: string;
    code: string;
  };
  qty: number;
  price: number;
  salePrice: number | string;
}

interface RawInvoiceReserva {
  type: string;
  qty: string | number;
  arancel: string | number;
  price: string | number;
  onlyTariff?: boolean;
  key: string;
}

interface RawInvoiceService {
  id: string;
  type: string;
  qty: string | number;
  arancel: string | number;
  price: string | number;
}

interface RawShipperConsignee {
  name: string;
  phoneNumberS: string;
  dob: string;
  shipping?: string;
  firstName: string;
  lastName: string;
  lastName2: string;
  middleName: string;
  email: string;
  phoneNumber: string;
  altPhoneNumber: string;
  cid: string;
  ybstreetNo?: string;
  ybstreet?: string;
  ybbetwen1?: string;
  ybbetwen2?: string;
  ybapt?: string;
  ybreparto?: string;
  consigneeId?: string;
  ssg_consignee_key?: string;
  passport: string;
  nacionality?: string;
  ybcity?: string;
  ybestate?: string;
  comment?: string;
 
  referenceHId?: string;
  citiId?: number;
}

interface RawInvoice {
  type: string;
  invoice: string;
  description: string;
  store: string;
  ssg_inventory_key: string;
  ssg_sorder_key: string;
  createDate: number;
  shipper_consignee: RawShipperConsignee;
  packagesOrder: boolean;
  businessId: string;
  userId?: string;
  referenceHId?: string;
  shippingMethod: string;
  reservas: RawInvoiceReserva[];
  products: RawInvoiceProduct[];
  services?: RawInvoiceService[];
  isCompleted: boolean;
  dayNum?: number;
  storeName?: string;
  storeType?: string;
  productSubtotal?: number;
  reservaSubtotal?: number;
  total?: number;
  paymentMethods: PaymentMethods;
  subtotalBeforeTax?: number;
  taxAmount?: number;
  TaxPercent?:number;
  taxSavings?:number;
  rawInvoice?:number;
  transportTotal?:number;
  bulks: any;
}

interface ParsedInvoiceProduct {
  id: string;
  product: {
    id: string;
    code: string;
    label: string;
    price: number;
  };
  qty: number;
  salePrice: number;
  total: number;
  bulkId: string;
}

interface ParsedInvoiceReserva {
  id: string;
  type: string;
  qty: number;
  price: number;
  arancel: number;
  total: number;
  bulkId: string;
}

interface ParsedInvoiceService {
  id: string;
  type: string;
  qty: number;
  arancel: number;
  total: number;
  bulkId: string;
}

interface ParsedShipperConsignee {
  name: string;
  firstName: string;
  middleName: string;
  lastName: string;
  lastName2: string;
  phoneNumber: string;
  cid: string;
  passport: string;
  address: string;
  phoneNumberS: string;
  dob: string;
}

interface PaymentMethods {
  taxOnTotal: boolean;
  taxPercent: number;
  exemptTaxOnCash: boolean;
  cash: number;
  zelle: number;
  creditCard: number;
}

interface ParsedInvoice {
  invoice: string;
  description: string;
  store: string;
  shipper_consignee: ParsedShipperConsignee;
  products: ParsedInvoiceProduct[];
  reservas: ParsedInvoiceReserva[];
  services?: ParsedInvoiceService[];
  packagesOrder: boolean;
  shippingMethod: string;
  paymentMethods: PaymentMethods;
  type: string;
  ssg_inventory_key: string;
  ssg_sorder_key: string;
  createDate: number;
  businessId: string;
  isCompleted: boolean;
  productSubtotal: number;
  reservaSubtotal: number;
  serviceSubtotal: number;
  subtotalBeforeTax: number;
  taxAmount: number;
  taxSavings: number;
  total: number;
  taxCalculationMethod: string;
  cashPaymentRatio: number;
  transportTotal?:number;
  bulks: any
}

 



const parseFloat2 = (value: any): number => {
  return parseFloat(value?.toString() || '0') || 0;
};

const formatDate = (dateStr: string): string => {
  // Convert MM/DD/YYYY to YYYY-MM-DD
  if (dateStr?.includes('/')) {
    const [month, day, year] = dateStr.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  if (dateStr?.includes('-')) {
    const [month, day, year] = dateStr.split('-');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return dateStr;
};

const formatAddress = (consignee: RawShipperConsignee): string => {
  const parts = [];
  
  if (consignee?.ybstreet) {
    parts.push(consignee?.ybstreet);
    if (consignee?.ybstreetNo) parts.push(`# ${consignee?.ybstreetNo}`);
  }
  
  if (consignee?.ybbetwen1 && consignee?.ybbetwen2) {
    parts.push(`/ ${consignee?.ybbetwen1} y ${consignee.ybbetwen2}`);
  }
  
  if (consignee?.ybreparto) parts.push(`, Rpto ${consignee?.ybreparto}`);
  if (consignee?.ybcity) parts.push(`, ${consignee?.ybcity}`);
  if (consignee?.ybestate) parts.push(`, ${consignee?.ybestate}`);
  
  return parts.join(' ');
};

const calculateReservaTotal = (reserva: RawInvoiceReserva): any => {
  const qty = parseFloat2(reserva.qty);
  const price = parseFloat2(reserva.price);
  const arancel = parseFloat2(reserva.arancel);
  
  if (reserva.onlyTariff) {
   // return arancel;
  }
  

  return  { lbs:  qty * price, arancel, total: qty * price + arancel };
};

const calculateProductTotal = (product: RawInvoiceProduct): number => {
  const qty = Math.abs(product.qty);
  const salePrice = parseFloat2(product.salePrice);
  return qty * salePrice;
};

const extractStoreNameFromInvoice = (invoice: string, store: string): string => {
  // If invoice starts with store code like "YY_8803-20250802-6514"
  const parts = invoice.split('-');
  if (parts.length >= 3) {
    const storeCode = parts[0];
    
    // Try to get store name from inventory store locations
    try {
      
      const locations = inventoryStore.locations || [];
      const location = locations.find((loc: any) => loc.code === storeCode || loc.id === storeCode);
      if (location) {
        return location.name;
      }
    } catch (error) {
      console.warn('Could not load store name from inventoryStore:', error);
    }
    
    // Fallback to hardcoded mapping for backwards compatibility
    const fallbackStoreMap: Record<string, string> = {
      'YY_8803': 'BISSONNET',
      'YY_8802': 'CENTER',
      'YY_8804': 'IRVIN',
      'YY_8805': 'KATTY',
      'YY_8816': 'YABA GLOBAL',
      'YY_8818': 'YABASURAUSTIN',
      'YY_8847': 'YABAOFICINA AZ',
      'YY_3251': 'YABA FASHION',
      'YY_32': 'YABA MESQUITE',
      'YY_76': 'YABA DALLAS',
      'YY_2376': 'YABA SAN ANTONIO',
      'YY_3303': 'YABA MIAMI',
      'YY_3329': 'YABA MIAMI 29',
      'SS_42': 'STEPHANIE SOLUTION'
    };
    return fallbackStoreMap[storeCode] || store;
  }
  return store;
};

const calculatePaymentMethods = (total: number, taxAmount: number): PaymentMethods => {
  // Default payment method configuration
  // This is a simplified version - you may need to adjust based on actual business logic
  const cash = Math.floor(total * 0.93); // 93% cash
  const zelle = total - cash;
  
  return {
    taxOnTotal: false,
    taxPercent: 7,
    exemptTaxOnCash: true,
    cash: cash,
    zelle: zelle,
    creditCard: 0
  };
};

export const parseInvoice = ( rawInvoice: RawInvoice): ParsedInvoice => {
  // Calculate product subtotal

 
  const productSubtotal = rawInvoice?.products?.reduce((sum, product) => {
    return sum + calculateProductTotal(product);
  }, 0);
  
  // Calculate reserva subtotal
  const reservaSubtotal = rawInvoice?.reservas?.reduce((sum, reserva) => {
    return sum + calculateReservaTotal(reserva).total;
  }, 0);
  
  // Calculate services subtotal
  const serviceSubtotal = rawInvoice?.services?.reduce((sum, service) => {
    const qty = parseFloat2(service.qty);
    const arancel = parseFloat2(service.arancel) ;
    return sum + (qty * arancel);
  }, 0) || 0;



   // Calculate reserva subtotal
  const itemsSubtotal = rawInvoice?.shipmentItems?.reduce((sum, item) => {
    //devLog(item)
    return sum + item.total;
  }, 0);
  

  var transportTotal = 0;
  if (rawInvoice.bulks && rawInvoice.bulks.length > 0) {
    rawInvoice.bulks.forEach((bulk: any) => {
      transportTotal +=  (bulk?.transportCost || 20)
    })
  }

const transportTotalFixed = rawInvoice.transportTotal || transportTotal;

const reservaSubtotalFixed = parseFloat( parseFloat2(reservaSubtotal).toFixed(2));
const serviceSubtotalFixed = parseFloat( parseFloat2(serviceSubtotal).toFixed(2));

const itemsSubtotalFixed = parseFloat( parseFloat2(itemsSubtotal).toFixed(2));



  // Calculate totals
  var subtotalBeforeTax = parseFloat2(productSubtotal) +  parseFloat2(reservaSubtotal) + parseFloat2(serviceSubtotal) +  parseFloat2(transportTotalFixed)+  parseFloat2(itemsSubtotalFixed);
  var taxPercent = rawInvoice?.TaxPercent || 0; // 7% tax
 
  // Calculate tax only on non-cash portion

  

  var taxAmount = (subtotalBeforeTax * taxPercent / 100);
  var taxSavings = 0;
  var total = subtotalBeforeTax + taxAmount;

  var cashRatio = 0;

  if(rawInvoice?.paymentMethods && rawInvoice.subtotalBeforeTax){
    taxPercent = rawInvoice?.paymentMethods?.taxPercent || 0;
    //cashRatio = 0.93; // 93% cash payment
  
    taxAmount = rawInvoice.taxAmount || 0;
    total = rawInvoice.total || 0;
    subtotalBeforeTax = rawInvoice.subtotalBeforeTax || 0;
    
    taxSavings = rawInvoice?.taxSavings || 0;

  }
    
  // Parse products with IDs


  devLog(rawInvoice)

  let products = rawInvoice?.products || [];
  const parsedProducts: ParsedInvoiceProduct[] = products?.map((product, index) => ({
    id: Date.now().toString() + index,
    product: {
      id: product.product.id,
      code: product.product.code,
      label: product.product.label,
      price: 0 // Original price is always 0 in the schema
    },
    qty: Math.abs(product.qty),
    salePrice: parseFloat2(product.salePrice),
    total: Math.abs(product.qty) * parseFloat2(product.salePrice),
    bulkId: product.bulkId
  }));
  
  // Parse reservas with IDs
  const parsedReservas: ParsedInvoiceReserva[] = rawInvoice?.reservas?.map((reserva, index) => ({
    id: Date.now().toString() + index + 1000,
    type: reserva.type,
    qty: parseFloat2(reserva.qty),
    price: parseFloat2(reserva.price),
    arancel: parseFloat2(reserva.arancel),
    total: parseFloat2(reserva.qty) * parseFloat2(reserva.price) +  parseFloat2(reserva.arancel),
    bulkId: reserva.bulkId
  }));
  
  // Parse services with IDs
  const parsedServices: ParsedInvoiceService[] = rawInvoice?.services?.map((service, index) => {
    const qty = parseFloat2(service.qty);
    const arancel = parseFloat2(service.arancel);
    return {
      id: Date.now().toString() + index + 2000,
      type: service.type,
      qty: qty,
      arancel: arancel,
      total: qty * arancel,
      bulkId: service.bulkId
    };
  }) || [];


  // Parse reservas with IDs
  const parsedItems: any[] = rawInvoice?.shipmentItems?.map((reserva, index) => ({
    id: Date.now().toString() + index + 1000,
    type: reserva.type,
    qty: parseFloat2(reserva.qty),
    price: parseFloat2(reserva.price),
    arancel: parseFloat2(reserva.arancel),
    total: parseFloat2(reserva.qty) * parseFloat2(reserva.price) +  parseFloat2(reserva.arancel),
    bulkId: reserva.bulkId
  }));
  
  // Parse shipper/consignee
  const parsedShipperConsignee: ParsedShipperConsignee = {
    name: rawInvoice.shipper_consignee?.name,
    firstName: rawInvoice.shipper_consignee?.firstName,
    middleName: rawInvoice.shipper_consignee?.middleName || '',
    lastName: rawInvoice.shipper_consignee?.lastName,
    lastName2: rawInvoice.shipper_consignee?.lastName2 || '',
    phoneNumber: rawInvoice.shipper_consignee?.phoneNumber,
    cid: rawInvoice.shipper_consignee?.cid,
    passport: rawInvoice.shipper_consignee?.passport || '',
    address: formatAddress(rawInvoice.shipper_consignee),
    phoneNumberS: rawInvoice.shipper_consignee?.phoneNumberS,
    dob: formatDate(rawInvoice.shipper_consignee?.dob)
  };
  
  // Determine store name
  const storeName = extractStoreNameFromInvoice(rawInvoice.invoice, rawInvoice.store);
  
  // Determine shipping method
  const shippingMethod = rawInvoice.shippingMethod?.toLowerCase() === 'aereo' ? 'aereo' : 'maritimo';
  

   

  // Calculate payment methods
  //const paymentMethods = calculatePaymentMethods(total, taxAmount);
  
  return {
    invoice: rawInvoice.invoice,
    description: rawInvoice.description || '',
    store: storeName,
    shipper_consignee: parsedShipperConsignee,
    products: parsedProducts,
    reservas: parsedReservas,
    services: parsedServices,
    bulks: rawInvoice?.bulks,
    packagesOrder: rawInvoice.packagesOrder,
    shippingMethod: shippingMethod,
    paymentMethods: rawInvoice?.paymentMethods,
    type: rawInvoice.type,
    ssg_inventory_key: rawInvoice.ssg_inventory_key,
    ssg_sorder_key: rawInvoice.ssg_sorder_key,
    createDate: rawInvoice.createDate,
    businessId: rawInvoice.businessId,
    isCompleted: rawInvoice.isCompleted,
    productSubtotal: productSubtotal,
    reservaSubtotal: reservaSubtotalFixed,
    serviceSubtotal: serviceSubtotalFixed,
    subtotalBeforeTax: subtotalBeforeTax,
    taxAmount: taxAmount,
    taxSavings: taxSavings,
    transportTotal: transportTotalFixed,
    total: total,
    taxCalculationMethod: 'subtotal',
    cashPaymentRatio: cashRatio
  };
};

// Example usage:
/*
const rawInvoice = {
  // ... raw invoice data
};

const parsedInvoice = parseInvoice(rawInvoice);
*/