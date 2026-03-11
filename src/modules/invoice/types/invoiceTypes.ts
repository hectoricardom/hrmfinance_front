// Core invoice types and interfaces

export interface InvoiceProduct {
  id: string;
  product: {
    id: string;
    code: string;
    label: string;
    price?: number;
  };
  qty: number;
  salePrice: number;
  total: number;
  bulkId?: string;
}

export interface InvoiceReserva {
  id: string;
  type: string;
  qty: number;
  weight?: number;
  category: string;
  price: number;
  arancel: number;
  total: number;
  bulkId?: string;
  autoCalculate?: boolean; // Individual auto-calculation toggle
}

export interface InvoiceService {
  id: string;
  type: string;
  qty: number;
  price?: number;
  arancel?: number;
  total: number;
  bulkId?: string;
}

export interface Customer {
  id: string;
  name: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  lastName2?: string;
  phoneNumber?: string;
  altPhoneNumber?: string;
  phoneNumberS?: string;
  dob?: string;
  cid?: string;
  idS?: string;
  passport?: string;
  email?: string;
  address?: string;
  addressS?: string;
}

export interface ShipperConsignee {
  name: string;
  addressS?: string;
  phoneNumberS?: string;
  dob?: string;
  idS?: string;
  passportS?: string;
  
  phoneNumber?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  lastName2?: string;
  altPhoneNumber?: string;
  cid?: string;
  passport?: string;
  email?: string;
  address?: string;
  
}

export interface PaymentMethod {
  cash: number;
  zelle: number;
  creditCard: number;
  taxPercent: number;
  taxOnTotal: boolean;
  exemptTaxOnCash?: boolean;
  discount?: number;
}

export interface InvoiceBulk {
  id: string;
  name: string;
  type: 'PERSONAL' | 'COMMERCIAL' | 'MIXED';
  maxWeight: number;
  currentWeight: number;
  transportCost?: number;
  shippingMethod: 'AEREO' | 'SEA';
  status: 'DRAFT' | 'READY';
  token?: string;
  pricingMode?: 'weight' | 'box_flat_rate'; // Pricing mode selection
  boxSize?: string; // Selected box size for box flat rate (e.g., "12x12x12")
}

export interface InvoiceForm {
  invoice: string;
  description: string;
  store: string;
  guide?: string;
  shipper_consignee: ShipperConsignee;
  products: InvoiceProduct[];
  reservas: InvoiceReserva[];
  services: InvoiceService[];
  bulks: InvoiceBulk[];
  packagesOrder: boolean;
  shippingMethod: 'aereo' | 'maritimo' | '';
  createDate?: number;
  paymentMethods: PaymentMethod;
}


