export interface Customer {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  cid?: string;
  passport?: string;
  email?: string;
  address?: string;
  fullName?: string;
}

export interface RemittanceData {
  id?: string;
  customer: Customer;
  amount: number;
  currency: string;
  exchangeRate?: number;
  reference?: string;
  notes?: string;
  date: Date;
  remittanceNumber: string;
  status: RemittanceStatus;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  businessId?: string;
}

export type RemittanceStatus = 'pending' | 'completed' | 'cancelled' | 'processing';

export interface CreateRemittanceRequest {
  customer: Customer;
  amount: number;
  currency: string;
  exchangeRate?: number;
  reference?: string;
  notes?: string;
  businessId?: string;
}

export interface UpdateRemittanceRequest {
  id: string;
  customer?: Customer;
  amount?: number;
  currency?: string;
  exchangeRate?: number;
  reference?: string;
  notes?: string;
  status?: RemittanceStatus;
  businessId?: string;
}

export interface RemittanceFilter {
  search?: string;
  status?: RemittanceStatus;
  currency?: string;
  dateFrom?: Date;
  dateTo?: Date;
  customerId?: string;
}

export interface RemittanceListResponse {
  remittances: RemittanceData[];
  total: number;
  page: number;
  pageSize: number;
}

// Available currencies with their display information
export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
}

export const AVAILABLE_CURRENCIES: CurrencyInfo[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'CUP', name: 'Peso Cubano', symbol: '$' },
  { code: 'CUC', name: 'Peso Convertible Cubano', symbol: 'CUC' }
];

export const REMITTANCE_STATUSES = [
  { value: 'pending', label: 'Pendiente', color: '#f59e0b' },
  { value: 'processing', label: 'Procesando', color: '#3b82f6' },
  { value: 'completed', label: 'Completada', color: '#10b981' },
  { value: 'cancelled', label: 'Cancelada', color: '#ef4444' }
] as const;