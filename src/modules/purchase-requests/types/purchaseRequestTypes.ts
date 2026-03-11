export interface PurchaseRequest {
  id: string;
  requestNumber: string; // PR-001, PR-002, etc.
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerAddress: string;
  
  // Item Details
  itemTitle: string;
  itemDescription?: string;
  itemUrl: string;
  itemPrice: number;
  itemCurrency: string;
  platform: 'temu' | 'shein' | 'amazon' | 'walmart' | 'other';
  quantity: number;
  
  // Status & Tracking
  status: PurchaseRequestStatus;
  statusHistory: StatusHistory[];
  
  // Financial
  totalCost: number; // Item price + taxes + fees
  deliveryCost?: number;
  finalTotal?: number;
  paid: boolean;
  paymentMethod?: string;
  
  // Shipping
  weight?: number; // in kg
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  trackingNumber?: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  
  // Dates
  requestDate: string;
  purchaseDate?: string;
  shipDate?: string;
  deliveryDate?: string;
  
  // Internal
  notes?: string;
  internalNotes?: string;
  assignedTo?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type PurchaseRequestStatus = 
  | 'pending'          // Customer request received
  | 'quote_sent'       // Price quote sent to customer
  | 'approved'         // Customer approved quote
  | 'purchasing'       // Currently purchasing the item
  | 'purchased'        // Item purchased
  | 'processing'       // Item being processed/packaged
  | 'shipped_to_us'    // Item shipped to our warehouse
  | 'received'         // Item received at our warehouse
  | 'ready_to_ship'    // Ready to ship to customer
  | 'shipped_to_customer' // Shipped to customer
  | 'delivered'        // Delivered to customer
  | 'cancelled'        // Request cancelled
  | 'refunded';        // Refunded

export interface StatusHistory {
  status: PurchaseRequestStatus;
  timestamp: string;
  updatedBy: string;
  notes?: string;
  location?: string;
}

export interface PurchaseRequestFilter {
  customerId?: string;
  customerName?: string;
  platform?: string;
  status?: PurchaseRequestStatus;
  dateRange?: {
    start: string;
    end: string;
  };
  paid?: boolean;
  assignedTo?: string;
  search?: string;
}

export interface PurchaseRequestSort {
  field: 'requestNumber' | 'customerName' | 'requestDate' | 'status' | 'totalCost' | 'platform';
  direction: 'asc' | 'desc';
}

export interface DeliveryCostCalculation {
  weight: number;
  baseRate: number; // per kg
  minimumCost: number;
  totalCost: number;
  zone?: string;
}

export const PURCHASE_REQUEST_STATUSES: { value: PurchaseRequestStatus; label: string; color: string }[] = [
  { value: 'pending', label: 'Pendiente', color: '#ffc107' },
  { value: 'quote_sent', label: 'Cotización Enviada', color: '#17a2b8' },
  { value: 'approved', label: 'Aprobado', color: '#28a745' },
  { value: 'purchasing', label: 'Comprando', color: '#fd7e14' },
  { value: 'purchased', label: 'Comprado', color: '#20c997' },
  { value: 'processing', label: 'Procesando', color: '#6f42c1' },
  { value: 'shipped_to_us', label: 'Enviado a Nosotros', color: '#0dcaf0' },
  { value: 'received', label: 'Recibido', color: '#198754' },
  { value: 'ready_to_ship', label: 'Listo para Enviar', color: '#0d6efd' },
  { value: 'shipped_to_customer', label: 'Enviado al Cliente', color: '#6610f2' },
  { value: 'delivered', label: 'Entregado', color: '#198754' },
  { value: 'cancelled', label: 'Cancelado', color: '#6c757d' },
  { value: 'refunded', label: 'Reembolsado', color: '#dc3545' }
];

export const PLATFORMS = [
  { value: 'temu', label: 'Temu', color: '#ff4d00' },
  { value: 'shein', label: 'SHEIN', color: '#000000' },
  { value: 'amazon', label: 'Amazon', color: '#ff9900' },
  { value: 'walmart', label: 'Walmart', color: '#0071ce' },
  { value: 'other', label: 'Otro', color: '#6c757d' }
];

export interface CreatePurchaseRequestInput {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerAddress: string;
  itemTitle: string;
  itemDescription?: string;
  itemUrl: string;
  itemPrice: number;
  itemCurrency: string;
  platform: PurchaseRequest['platform'];
  quantity: number;
  notes?: string;
}

export interface UpdatePurchaseRequestInput {
  status?: PurchaseRequestStatus;
  weight?: number;
  dimensions?: PurchaseRequest['dimensions'];
  trackingNumber?: string;
  deliveryCost?: number;
  totalCost?: number;
  paid?: boolean;
  paymentMethod?: string;
  notes?: string;
  internalNotes?: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
}

// New purchase registration interface
export interface PurchaseRegistration {
  id: string;
  registrationNumber: string; // PC-001, PC-002, etc.
  
  // Store/Platform info
  store: string; // tienda
  platform: PurchaseRequest['platform'];
  
  // Purchase details
  totalProducts: number; // total num de productos
  totalPrice: number; // precio total
  currency: string;
  
  // Financials
  bonus?: number; // bonus
  refund?: number; // devolucion
  netTotal: number; // total - bonus - refund
  
  // Additional details
  purchaseDate: string;
  description?: string;
  notes?: string;
  
  // Related purchase requests (if any)
  relatedRequests?: string[];
  
  // Internal tracking
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePurchaseRegistrationInput {
  store: string;
  platform: PurchaseRequest['platform'];
  totalProducts: number;
  totalPrice: number;
  currency: string;
  bonus?: number;
  refund?: number;
  purchaseDate: string;
  description?: string;
  notes?: string;
  relatedRequests?: string[];
}