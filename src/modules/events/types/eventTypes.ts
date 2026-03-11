// Event System Types - Core event handling for automation

export type EventType = 
  | 'invoice_created'
  | 'invoice_updated' 
  | 'invoice_completed'
  | 'invoice_cancelled'
  | 'payment_received'
  | 'payment_refunded'
  | 'inventory_received'
  | 'inventory_sold'
  | 'inventory_adjusted'
  | 'expense_created'
  | 'expense_approved'
  | 'expense_paid'
  | 'service_rendered'
  | 'freight_processed'
  | 'customs_cleared'
  | 'bank_transaction_imported';

// Base event interface
export interface BaseEvent {
  id: string;
  type: EventType;
  timestamp: Date;
  userId?: string;
  source: string; // Which module triggered this
  metadata?: Record<string, any>;
}

// Invoice Events
export interface InvoiceEvent extends BaseEvent {
  type: 'invoice_created' | 'invoice_updated' | 'invoice_completed' | 'invoice_cancelled';
  data: {
    invoice: string; // Invoice number
    customerId: string;
    customerName: string;
    totalAmount: number;
    subtotalAmount: number;
    taxAmount: number;
    discountAmount: number;
    arancelesTotal: number;
    servicesTotal: number;
    reservasTotal: number;
    productSubtotal: number,
    reservaSubtotal: number,
    subtotalBeforeTax: number,
    taxSavings: number,
    total: number,
    paymentMethods: {
      cash: number;
      zelle: number;
      creditCard: number;
      check: number;
      bankTransfer: number;
    };
    currency: string;
    exchangeRate: number;
    items: Array<{
      id: string;
      description: string;
      quantity: number;
      unitPrice: number;
      total: number;
      category: string;
    }>;
    services: Array<{
      id: string;
      type: string;
      description: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }>;
    status: 'draft' | 'pending' | 'completed' | 'cancelled';
    dueDate?: string;
    completedDate?: string;
  };
}

// Payment Events
export interface PaymentEvent extends BaseEvent {
  type: 'payment_received' | 'payment_refunded';
  data: {
    paymentId: string;
    invoiceId?: string;
    customerId: string;
    customerName: string;
    amount: number;
    paymentMethod: 'cash' | 'zelle' | 'creditCard' | 'check' | 'bankTransfer';
    currency: string;
    exchangeRate: number;
    reference: string;
    notes?: string;
    bankAccount?: string;
    depositDate?: string;
  };
}

// Inventory Events
export interface InventoryEvent extends BaseEvent {
  type: 'inventory_received' | 'inventory_sold' | 'inventory_adjusted';
  data: {
    movementId: string;
    productId: string;
    productName: string;
    sku: string;
    category: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    unitPrice?: number;
    totalPrice?: number;
    supplierId?: string;
    supplierName?: string;
    purchaseOrderId?: string;
    invoiceId?: string; // If sold
    warehouseLocation: string;
    movementType: 'purchase' | 'sale' | 'adjustment' | 'transfer';
    adjustmentReason?: string;
    batchNumber?: string;
    expirationDate?: string;
  };
}

// Expense Events
export interface ExpenseEvent extends BaseEvent {
  type: 'expense_created' | 'expense_approved' | 'expense_paid';
  data: {
    expenseId: string;
    category: string;
    subcategory?: string;
    description: string;
    amount: number;
    currency: string;
    exchangeRate: number;
    vendorId?: string;
    vendorName?: string;
    employeeId?: string;
    employeeName?: string;
    departmentId?: string;
    departmentName?: string;
    projectId?: string;
    projectName?: string;
    paymentMethod: 'cash' | 'check' | 'creditCard' | 'bankTransfer';
    bankAccount?: string;
    reference: string;
    receiptAttached: boolean;
    taxAmount?: number;
    taxRate?: number;
    approvedBy?: string;
    approvedDate?: string;
    paidDate?: string;
  };
}

// Service Events (Transport, Processing, etc.)
export interface ServiceEvent extends BaseEvent {
  type: 'service_rendered' | 'freight_processed' | 'customs_cleared';
  data: {
    serviceId: string;
    serviceType: 'transport' | 'packaging' | 'storage' | 'customs' | 'processing' | 'other';
    description: string;
    customerId: string;
    customerName: string;
    amount: number;
    currency: string;
    exchangeRate: number;
    quantity?: number;
    unitPrice?: number;
    invoiceId?: string;
    reference: string;
    serviceDate: string;
    completedDate?: string;
    location?: string;
    weight?: number;
    dimensions?: {
      length: number;
      width: number;
      height: number;
    };
    trackingNumber?: string;
    carrierName?: string;
    originCountry?: string;
    destinationCountry?: string;
  };
}

// Bank Transaction Events
export interface BankTransactionEvent extends BaseEvent {
  type: 'bank_transaction_imported';
  data: {
    transactionId: string;
    bankAccount: string;
    transactionType: 'debit' | 'credit';
    amount: number;
    currency: string;
    exchangeRate: number;
    description: string;
    reference: string;
    transactionDate: string;
    valueDate: string;
    balance: number;
    category?: string;
    counterpartyName?: string;
    counterpartyAccount?: string;
    fees?: number;
    isReconciled: boolean;
    matchedInvoiceId?: string;
    matchedPaymentId?: string;
  };
}

// Union type for all events
export type EventData = 
  | InvoiceEvent
  | PaymentEvent  
  | InventoryEvent
  | ExpenseEvent
  | ServiceEvent
  | BankTransactionEvent;

// Event listener interface
export interface EventListener {
  id: string;
  eventTypes: EventType[];
  handler: (event: EventData) => Promise<void>;
  priority: number;
  isActive: boolean;
}

// Event template for rule configuration
export interface EventTemplate {
  eventType: EventType;
  displayName: string;
  description: string;
  category: 'financial' | 'inventory' | 'operational';
  dataStructure: Record<string, FieldDefinition>;
  examples: Array<{
    name: string;
    description: string;
    sampleData: any;
  }>;
}

// Field definition for dynamic forms
export interface FieldDefinition {
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  description: string;
  required: boolean;
  format?: string; // For dates: 'date', 'datetime'; For numbers: 'currency', 'percentage'
  options?: Array<{ value: string; label: string }>; // For enums
  properties?: Record<string, FieldDefinition>; // For objects
  items?: FieldDefinition; // For arrays
  example?: any;
}

// Rule condition with enhanced field mapping
export interface EventRuleCondition {
  field: string; // Dot notation path like 'data.paymentMethods.cash'
  operator: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'greaterThanOrEqual' | 'lessThanOrEqual' | 'contains' | 'notContains' | 'in' | 'notIn' | 'exists' | 'notExists';
  value: any;
  dataType: 'string' | 'number' | 'boolean' | 'date' | 'array';
}

// Enhanced journal entry line for one-account-per-line
export interface JournalEntryLine {
  id: string;
  accountId: string;
  accountName: string;
  subAccountId?: string; // For sub-account support
  subAccountName?: string;
  description: string;
  debitAmount: number;
  creditAmount: number;
  reference?: string;
  taxCode?: string;
  departmentId?: string;
  projectId?: string;
  customFields?: Record<string, any>;
}

// Custom field definition for reusable expressions
export interface CustomField {
  id: string;
  name: string;
  expression: string;
  description: string;
}

// Enhanced automation rule with event-specific features
export interface EventAutomationRule {
  id: string;
  name: string;
  description: string;
  eventType: EventType;
  isActive: boolean;
  priority: number;
  conditions: EventRuleCondition[];
  customFields?: CustomField[]; // User-defined custom fields for this rule
  journalEntryTemplate: {
    description: string; // Template with variables like 'Invoice {data.invoice} - {data.customerName}'
    reference: string; // Template like 'INV-{data.invoice}'
    lines: Array<{
      accountExpression: string; // Account selection logic
      subAccountExpression?: string;
      descriptionTemplate: string;
      amountExpression: string; // How to calculate amount
      documentExpression?: string; // Document reference template (e.g., invoice number)
      isDebit: boolean;
      conditions?: EventRuleCondition[]; // Line-specific conditions
    }>;
  };
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}