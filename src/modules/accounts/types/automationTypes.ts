// Account automation configuration types

export interface AccountMapping {
  id: string;
  name: string;
  description: string;
  transactionType: TransactionType;
  conditions: MappingCondition[];
  debitAccountId: string;
  creditAccountId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MappingCondition {
  field: string; // e.g., 'paymentMethod', 'storeId', 'productCategory'
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan';
  value: string | number;
}

export type TransactionType = 
  | 'cash_sale'
  | 'credit_sale' 
  | 'inventory_increase'
  | 'inventory_decrease'
  | 'service_sale'
  | 'customs_fee'
  | 'transport_fee'
  | 'tax_collection'
  | 'payment_received'
  | 'refund';

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  triggerEvent: TriggerEvent;
  isActive: boolean;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  priority: number; // Higher number = higher priority
}

export type TriggerEvent = 
  | 'invoice_completed'
  | 'inventory_movement'
  | 'payment_received'
  | 'service_rendered'
  | 'tax_calculated';

export interface AutomationCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'in';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface AutomationAction {
  type: 'create_journal_entry';
  templateId?: string;
  accountMappings: {
    debitAccountId: string;
    creditAccountId: string;
    amountExpression: string; // e.g., 'invoice.total', 'invoice.taxAmount'
    description: string;
  }[];
}

// Pre-defined account mappings for common business transactions
export interface DefaultAccountMappings {
  // Sales Revenue Accounts
  cashSales: {
    debit: string; // Cash account
    credit: string; // Sales Revenue account
  };
  creditSales: {
    debit: string; // Accounts Receivable
    credit: string; // Sales Revenue account
  };
  
  // Inventory Accounts  
  inventoryPurchase: {
    debit: string; // Inventory account
    credit: string; // Cash or Accounts Payable
  };
  costOfGoodsSold: {
    debit: string; // Cost of Goods Sold
    credit: string; // Inventory account
  };
  
  // Service Revenue
  serviceRevenue: {
    debit: string; // Cash or Accounts Receivable
    credit: string; // Service Revenue account
  };
  
  // Taxes
  salesTax: {
    debit: string; // Cash (collected with sale)
    credit: string; // Sales Tax Payable
  };
  
  // Customs and Fees
  customsFees: {
    debit: string; // Customs Fees Expense or pass-through asset
    credit: string; // Cash or Accounts Payable
  };
  
  // Transport
  transportRevenue: {
    debit: string; // Cash or Accounts Receivable  
    credit: string; // Transport Service Revenue
  };
}

export interface AccountAutomationConfig {
  isEnabled: boolean;
  defaultMappings: DefaultAccountMappings;
  customRules: AutomationRule[];
  accountMappings: AccountMapping[];
  auditSettings: {
    logAllTransactions: boolean;
    requireApproval: boolean;
    approvalThreshold: number; // Amount requiring approval
  };
}