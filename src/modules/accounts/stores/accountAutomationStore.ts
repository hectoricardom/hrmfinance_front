import { createSignal, createMemo } from 'solid-js';
import { 
  AccountAutomationConfig, 
  AutomationRule, 
  AccountMapping, 
  TransactionType,
  DefaultAccountMappings 
} from '../types/automationTypes';

// Default account mappings - these would be configured during setup
const defaultAccountMappings: DefaultAccountMappings = {
  cashSales: {
    debit: '1001', // Cash - Operating Account
    credit: '4001' // Sales Revenue - Products
  },
  creditSales: {
    debit: '1101', // Accounts Receivable
    credit: '4001' // Sales Revenue - Products
  },
  inventoryPurchase: {
    debit: '1201', // Inventory - Products
    credit: '1001' // Cash or '2001' for Accounts Payable
  },
  costOfGoodsSold: {
    debit: '5001', // Cost of Goods Sold
    credit: '1201' // Inventory - Products
  },
  serviceRevenue: {
    debit: '1001', // Cash (or 1101 for AR)
    credit: '4101' // Service Revenue
  },
  salesTax: {
    debit: '1001', // Cash (collected with payment)
    credit: '2301' // Sales Tax Payable
  },
  customsFees: {
    debit: '1401', // Customs Fees Receivable (pass-through)
    credit: '1001' // Cash
  },
  transportRevenue: {
    debit: '1001', // Cash
    credit: '4201' // Transport Service Revenue
  }
};

// Pre-configured automation rules for common transactions
const defaultAutomationRules: AutomationRule[] = [
  {
    id: 'cash-sale-completed',
    name: 'Cash Sale Completed',
    description: 'Creates journal entry when cash sale invoice is completed',
    triggerEvent: 'invoice_completed',
    isActive: true,
    priority: 100,
    conditions: [
      {
        field: 'paymentMethods.cash',
        operator: 'greaterThan',
        value: 0
      }
    ],
    actions: [
      {
        type: 'create_journal_entry',
        accountMappings: [
          {
            debitAccountId: '1001', // Cash
            creditAccountId: '4001', // Sales Revenue
            amountExpression: 'paymentMethods.cash',
            description: 'Cash sale - Invoice #{invoice}'
          }
        ]
      }
    ]
  },
  {
    id: 'credit-sale-completed', 
    name: 'Credit Sale Completed',
    description: 'Creates journal entry when credit sale invoice is completed',
    triggerEvent: 'invoice_completed',
    isActive: true,
    priority: 90,
    conditions: [
      {
        field: 'paymentMethods.zelle',
        operator: 'greaterThan',
        value: 0
      }
    ],
    actions: [
      {
        type: 'create_journal_entry',
        accountMappings: [
          {
            debitAccountId: '1101', // Accounts Receivable
            creditAccountId: '4001', // Sales Revenue  
            amountExpression: 'paymentMethods.zelle',
            description: 'Credit sale (Zelle) - Invoice #{invoice}'
          }
        ]
      }
    ]
  },
  {
    id: 'service-revenue-transport',
    name: 'Transport Service Revenue',
    description: 'Records transport service revenue when services are billed',
    triggerEvent: 'service_rendered',
    isActive: true,
    priority: 80,
    conditions: [
      {
        field: 'services.type',
        operator: 'contains',
        value: 'Transportación'
      }
    ],
    actions: [
      {
        type: 'create_journal_entry',
        accountMappings: [
          {
            debitAccountId: '1001', // Cash
            creditAccountId: '4201', // Transport Revenue
            amountExpression: 'services.total',
            description: 'Transport service - Invoice #{invoice}'
          }
        ]
      }
    ]
  },
  {
    id: 'customs-fees',
    name: 'Customs Fees Collection', 
    description: 'Records customs fees collected from customers',
    triggerEvent: 'invoice_completed',
    isActive: true,
    priority: 70,
    conditions: [
      {
        field: 'arancelesTotal',
        operator: 'greaterThan', 
        value: 0
      }
    ],
    actions: [
      {
        type: 'create_journal_entry',
        accountMappings: [
          {
            debitAccountId: '1001', // Cash
            creditAccountId: '1401', // Customs Fees Receivable (pass-through)
            amountExpression: 'arancelesTotal',
            description: 'Customs fees collection - Invoice #{invoice}'
          }
        ]
      }
    ]
  },
  {
    id: 'sales-tax-collection',
    name: 'Sales Tax Collection',
    description: 'Records sales tax collected on taxable transactions', 
    triggerEvent: 'tax_calculated',
    isActive: true,
    priority: 60,
    conditions: [
      {
        field: 'taxAmount',
        operator: 'greaterThan',
        value: 0
      }
    ],
    actions: [
      {
        type: 'create_journal_entry',
        accountMappings: [
          {
            debitAccountId: '1001', // Cash (part of payment)
            creditAccountId: '2301', // Sales Tax Payable
            amountExpression: 'taxAmount',
            description: 'Sales tax collected - Invoice #{invoice}'
          }
        ]
      }
    ]
  }
];

class AccountAutomationStore {
  private config: any;
  private setConfig: any;
  
  constructor() {
    const [config, setConfig] = createSignal<AccountAutomationConfig>({
      isEnabled: true,
      defaultMappings: defaultAccountMappings,
      customRules: defaultAutomationRules,
      accountMappings: [],
      auditSettings: {
        logAllTransactions: true,
        requireApproval: false,
        approvalThreshold: 1000
      }
    });
    
    this.config = config;
    this.setConfig = setConfig;
  }

  // Computed getters
  get isEnabled() {
    return this.config().isEnabled;
  }

  get defaultMappings() {
    return this.config().defaultMappings;
  }

  get automationRules() {
    return this.config().customRules.filter(rule => rule.isActive);
  }

  get accountMappings() {
    return this.config().accountMappings.filter(mapping => mapping.isActive);
  }

  // Configuration management
  updateConfig(updates: Partial<AccountAutomationConfig>) {
    this.setConfig(prev => ({ ...prev, ...updates }));
  }

  toggleAutomation(enabled: boolean) {
    this.updateConfig({ isEnabled: enabled });
  }

  // Account mapping management  
  addAccountMapping(mapping: Omit<AccountMapping, 'id' | 'createdAt' | 'updatedAt'>) {
    const newMapping: AccountMapping = {
      ...mapping,
      id: `mapping_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.setConfig(prev => ({
      ...prev,
      accountMappings: [...prev.accountMappings, newMapping]
    }));

    return newMapping.id;
  }

  updateAccountMapping(id: string, updates: Partial<AccountMapping>) {
    this.setConfig(prev => ({
      ...prev,
      accountMappings: prev.accountMappings.map(mapping =>
        mapping.id === id 
          ? { ...mapping, ...updates, updatedAt: new Date() }
          : mapping
      )
    }));
  }

  removeAccountMapping(id: string) {
    this.setConfig(prev => ({
      ...prev,
      accountMappings: prev.accountMappings.filter(mapping => mapping.id !== id)
    }));
  }

  // Automation rule management
  addAutomationRule(rule: Omit<AutomationRule, 'id'>) {
    const newRule: AutomationRule = {
      ...rule,
      id: `rule_${Date.now()}`
    };

    this.setConfig(prev => ({
      ...prev,
      customRules: [...prev.customRules, newRule]
    }));

    return newRule.id;
  }

  updateAutomationRule(id: string, updates: Partial<AutomationRule>) {
    this.setConfig(prev => ({
      ...prev,
      customRules: prev.customRules.map(rule =>
        rule.id === id ? { ...rule, ...updates } : rule
      )
    }));
  }

  toggleAutomationRule(id: string, isActive: boolean) {
    this.updateAutomationRule(id, { isActive });
  }

  removeAutomationRule(id: string) {
    this.setConfig(prev => ({
      ...prev,
      customRules: prev.customRules.filter(rule => rule.id !== id)
    }));
  }

  // Account lookup helpers
  getAccountMapping(transactionType: TransactionType): AccountMapping | null {
    return this.accountMappings.find(mapping => 
      mapping.transactionType === transactionType
    ) || null;
  }

  getApplicableRules(triggerEvent: string, context: any): AutomationRule[] {
    return this.automationRules
      .filter(rule => rule.triggerEvent === triggerEvent)
      .filter(rule => this.evaluateConditions(rule.conditions, context))
      .sort((a, b) => b.priority - a.priority);
  }

  private evaluateConditions(conditions: any[], context: any): boolean {
    if (conditions.length === 0) return true;

    return conditions.every(condition => {
      const fieldValue = this.getNestedValue(context, condition.field);
      
      switch (condition.operator) {
        case 'equals':
          return fieldValue === condition.value;
        case 'contains':
          return String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase());
        case 'greaterThan':
          return Number(fieldValue) > Number(condition.value);
        case 'lessThan':
          return Number(fieldValue) < Number(condition.value);
        case 'in':
          return Array.isArray(condition.value) ? condition.value.includes(fieldValue) : false;
        default:
          return false;
      }
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  // Reset to defaults
  resetToDefaults() {
    this.setConfig({
      isEnabled: true,
      defaultMappings: defaultAccountMappings,
      customRules: defaultAutomationRules,
      accountMappings: [],
      auditSettings: {
        logAllTransactions: true,
        requireApproval: false,
        approvalThreshold: 1000
      }
    });
  }

  // Export/Import configuration
  exportConfiguration(): AccountAutomationConfig {
    return this.config();
  }

  importConfiguration(config: AccountAutomationConfig) {
    this.setConfig(config);
  }
}

// Create and export singleton instance
export const accountAutomationStore = new AccountAutomationStore();