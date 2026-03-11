// Provider/Client Entity Types
// Database constraint expects: 'customer', 'provider', 'both'

export type EntityType = 'customer' | 'provider' | 'both';

export interface ProviderClient {
  id: string;
  name: string;
  type: EntityType;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  contactPerson?: string;
  notes?: string;
  isActive: boolean;
  balance: number; // Positive = we owe them (provider), Negative = they owe us (client)
  relatedAccountId?: string; // Related accounting account for tracking payments/collections
  advanceAccountId?: string; // Account for advance payments/deposits
  createdAt: string;
  updatedAt: string;
  businessId?: string;
}

// Document with balance info for payment/collection application
export interface PendingDocument {
  document: string;
  debitAmount: number;  // In cents
  creditAmount: number; // In cents
  balance: number;      // In cents (positive = owes us, negative = we owe)
  transactions: any[];
  selected?: boolean;
  applyAmount?: number; // Amount to apply to this document
  advancePay?: number;  // In cents - advance payment available for this document
}

export type TransactionType = 'payment' | 'collection' | 'invoice' | 'credit' | 'debit';

export interface Transaction {
  id: string;
  entityId: string; // Reference to ProviderClient
  entityName: string;
  type: TransactionType;
  amount: number;
  description: string;
  reference?: string; // Invoice number, check number, etc.
  paymentMethod?: 'cash' | 'check' | 'transfer' | 'zelle' | 'credit_card' | 'other';
  date: string;
  dueDate?: string;
  status: 'pending' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  businessId?: string;
}

export interface TransactionSummary {
  entityId: string;
  entityName: string;
  entityType: EntityType;
  totalPayments: number;
  totalCollections: number;
  totalInvoices: number;
  totalCredits: number;
  totalDebits: number;
  balance: number;
  transactionCount: number;
}

export interface PaymentFormData {
  entityId: string;
  amount: number;
  description: string;
  reference?: string;
  paymentMethod: Transaction['paymentMethod'];
  date: string;
  notes?: string;
}

export interface CollectionFormData {
  entityId: string;
  amount: number;
  description: string;
  reference?: string;
  paymentMethod: Transaction['paymentMethod'];
  date: string;
  notes?: string;
}
