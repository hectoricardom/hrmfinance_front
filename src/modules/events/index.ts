// Event System Module - Main exports

// Core event system
export { eventService } from './services/eventService';
export { eventAutomationService } from './services/eventAutomationService';

// Types
export type {
  EventType,
  EventData,
  EventListener,
  EventTemplate,
  FieldDefinition,
  EventRuleCondition,
  JournalEntryLine,
  EventAutomationRule,
  InvoiceEvent,
  PaymentEvent,
  InventoryEvent,
  ExpenseEvent,
  ServiceEvent,
  BankTransactionEvent
} from './types/eventTypes';

// Event templates and validation
export {
  eventTemplates,
  getEventTemplate,
  getAvailableFields,
  validateEventData
} from './data/eventTemplates';

// Integration helpers
export { invoiceEventIntegration } from './integrations/invoiceIntegration';
export { inventoryEventIntegration } from './integrations/inventoryIntegration';
export { expenseEventIntegration } from './integrations/expenseIntegration';
export { serviceEventIntegration } from './integrations/serviceIntegration';

// Convenience emission functions
export {
  emitInvoiceCompleted,
  emitPaymentReceived,
  emitInventoryMovement,
  emitExpenseCreated,
  emitServiceRendered
} from './services/eventService';

// UI Components
export { default as EventAutomationUI } from './components/EventAutomationUI';
export { default as EventRuleBuilder } from './components/EventRuleBuilder';

// Stores
export { ruleDraftStore } from './stores/ruleDraftStore';

// Default rule templates for quick setup
export const getDefaultAutomationRules = () => [
  {
    name: 'Cash Sale Automation',
    description: 'Automatically create journal entries for cash sales',
    eventType: 'invoice_completed' as const,
    isActive: true,
    priority: 100,
    conditions: [
      {
        field: 'data.paymentMethods.cash',
        operator: 'greaterThan' as const,
        value: 0,
        dataType: 'number' as const
      }
    ],
    journalEntryTemplate: {
      description: 'Cash Sale - Invoice {data.invoice}',
      reference: 'INV-{data.invoice}',
      lines: [
        {
          accountExpression: '1001', // Cash - Operating Account
          descriptionTemplate: 'Cash payment - {data.customerName}',
          amountExpression: 'data.paymentMethods.cash',
          isDebit: true
        },
        {
          accountExpression: '4001', // Sales Revenue - Products  
          descriptionTemplate: 'Sales revenue - Invoice {data.invoice}',
          amountExpression: 'data.paymentMethods.cash',
          isDebit: false
        }
      ]
    },
    createdBy: 'system'
  },
  {
    name: 'Zelle Payment Automation',
    description: 'Automatically create journal entries for Zelle payments',
    eventType: 'invoice_completed' as const,
    isActive: true,
    priority: 90,
    conditions: [
      {
        field: 'data.paymentMethods.zelle',
        operator: 'greaterThan' as const,
        value: 0,
        dataType: 'number' as const
      }
    ],
    journalEntryTemplate: {
      description: 'Zelle Payment - Invoice {data.invoice}',
      reference: 'INV-{data.invoice}',
      lines: [
        {
          accountExpression: '1002', // Cash - Zelle Account
          descriptionTemplate: 'Zelle payment - {data.customerName}',
          amountExpression: 'data.paymentMethods.zelle',
          isDebit: true
        },
        {
          accountExpression: '4001', // Sales Revenue - Products
          descriptionTemplate: 'Sales revenue - Invoice {data.invoice}',
          amountExpression: 'data.paymentMethods.zelle',
          isDebit: false
        }
      ]
    },
    createdBy: 'system'
  },
  {
    name: 'Service Revenue Automation',
    description: 'Automatically create journal entries for service revenue',
    eventType: 'service_rendered' as const,
    isActive: true,
    priority: 80,
    conditions: [
      {
        field: 'data.amount',
        operator: 'greaterThan' as const,
        value: 0,
        dataType: 'number' as const
      }
    ],
    journalEntryTemplate: {
      description: 'Service Revenue - {data.serviceType}',
      reference: 'SRV-{data.serviceId}',
      lines: [
        {
          accountExpression: '1001', // Cash - Operating Account
          descriptionTemplate: '{data.description} - {data.customerName}',
          amountExpression: 'data.amount',
          isDebit: true
        },
        {
          accountExpression: '4101', // Service Revenue - General
          descriptionTemplate: 'Service revenue - {data.description}',
          amountExpression: 'data.amount',
          isDebit: false
        }
      ]
    },
    createdBy: 'system'
  },
  {
    name: 'Inventory Purchase Automation',
    description: 'Automatically create journal entries for inventory purchases',
    eventType: 'inventory_received' as const,
    isActive: true,
    priority: 70,
    conditions: [
      {
        field: 'data.totalCost',
        operator: 'greaterThan' as const,
        value: 0,
        dataType: 'number' as const
      },
      {
        field: 'data.movementType',
        operator: 'equals' as const,
        value: 'purchase',
        dataType: 'string' as const
      }
    ],
    journalEntryTemplate: {
      description: 'Inventory Purchase - {data.productName}',
      reference: 'PUR-{data.movementId}',
      lines: [
        {
          accountExpression: '1201', // Inventory - Products
          descriptionTemplate: 'Inventory purchase - {data.productName}',
          amountExpression: 'data.totalCost',
          isDebit: true
        },
        {
          accountExpression: '2001', // Accounts Payable
          descriptionTemplate: 'Purchase from {data.supplierName}',
          amountExpression: 'data.totalCost',
          isDebit: false
        }
      ]
    },
    createdBy: 'system'
  },
  {
    name: 'Expense Recording Automation',
    description: 'Automatically create journal entries for approved expenses',
    eventType: 'expense_approved' as const,
    isActive: true,
    priority: 60,
    conditions: [
      {
        field: 'data.amount',
        operator: 'greaterThan' as const,
        value: 0,
        dataType: 'number' as const
      }
    ],
    journalEntryTemplate: {
      description: 'Expense - {data.category}',
      reference: 'EXP-{data.expenseId}',
      lines: [
        {
          accountExpression: '5303', // Office Supplies (default - could be dynamic based on category)
          descriptionTemplate: '{data.description}',
          amountExpression: 'data.amount',
          isDebit: true
        },
        {
          accountExpression: '1001', // Cash - Operating Account
          descriptionTemplate: 'Expense payment - {data.vendorName}',
          amountExpression: 'data.amount',
          isDebit: false
        }
      ]
    },
    createdBy: 'system'
  }
];

// Setup function to initialize the event system with default rules
export const setupEventAutomation = async () => {
  // Add default automation rules
  const defaultRules = getDefaultAutomationRules();
  
  for (const ruleTemplate of defaultRules) {
    try {
      eventAutomationService.addRule(ruleTemplate);
      console.log(`Added automation rule: ${ruleTemplate.name}`);
    } catch (error) {
      console.error(`Failed to add rule ${ruleTemplate.name}:`, error);
    }
  }
  
  console.log('Event automation system initialized with default rules');
  return true;
};