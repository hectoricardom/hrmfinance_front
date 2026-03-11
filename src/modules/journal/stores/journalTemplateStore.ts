import { createSignal } from 'solid-js';

// Translation map for template field names
const fieldNameTranslations: Record<string, Record<string, string>> = {
  'Sale Amount': { en: 'Sale Amount', es: 'Monto de Venta' },
  'Payment Amount': { en: 'Payment Amount', es: 'Monto del Pago' },
  'Expense Amount': { en: 'Expense Amount', es: 'Monto del Gasto' },
  'Rent Amount': { en: 'Rent Amount', es: 'Monto del Alquiler' },
  'Salary Amount': { en: 'Salary Amount', es: 'Monto del Salario' },
  'Utility Amount': { en: 'Utility Amount', es: 'Monto de Servicios' },
  'Inventory Cost': { en: 'Inventory Cost', es: 'Costo del Inventario' },
  'Investment Amount': { en: 'Investment Amount', es: 'Monto de Inversión' },
  'Depreciation Amount': { en: 'Depreciation Amount', es: 'Monto de Depreciación' },
  'Interest Amount': { en: 'Interest Amount', es: 'Monto de Interés' },
  'Principal Amount': { en: 'Principal Amount', es: 'Monto Principal' },
  'Total Payment': { en: 'Total Payment', es: 'Pago Total' },
  'Amount': { en: 'Amount', es: 'Monto' },
  'Monto': { en: 'Amount', es: 'Monto' }
};

// Translation map for template names
const templateNameTranslations: Record<string, Record<string, string>> = {
  'Cash Sale': { en: 'Cash Sale', es: 'Venta en Efectivo' },
  'Credit Sale': { en: 'Credit Sale', es: 'Venta a Crédito' },
  'Customer Payment Received': { en: 'Customer Payment Received', es: 'Pago Recibido del Cliente' },
  'Office Expenses': { en: 'Office Expenses', es: 'Gastos de Oficina' },
  'Rent Payment': { en: 'Rent Payment', es: 'Pago de Alquiler' },
  'Salary Payment': { en: 'Salary Payment', es: 'Pago de Salario' },
  'Utility Payment': { en: 'Utility Payment', es: 'Pago de Servicios' },
  'Inventory Purchase': { en: 'Inventory Purchase', es: 'Compra de Inventario' },
  'Supplier Payment': { en: 'Supplier Payment', es: 'Pago a Proveedor' },
  'Capital Investment': { en: 'Capital Investment', es: 'Inversión de Capital' },
  'Depreciation Expense': { en: 'Depreciation Expense', es: 'Gasto de Depreciación' },
  'Loan Payment': { en: 'Loan Payment', es: 'Pago de Préstamo' }
};

// Translation map for template descriptions
const templateDescTranslations: Record<string, Record<string, string>> = {
  'Record a cash sale transaction': { en: 'Record a cash sale transaction', es: 'Registrar una transacción de venta en efectivo' },
  'Record a sale on credit (accounts receivable)': { en: 'Record a sale on credit (accounts receivable)', es: 'Registrar una venta a crédito (cuentas por cobrar)' },
  'Record payment received from customer': { en: 'Record payment received from customer', es: 'Registrar pago recibido del cliente' },
  'Record office supplies and expenses': { en: 'Record office supplies and expenses', es: 'Registrar suministros y gastos de oficina' },
  'Record monthly rent payment': { en: 'Record monthly rent payment', es: 'Registrar pago mensual de alquiler' },
  'Record employee salary payment': { en: 'Record employee salary payment', es: 'Registrar pago de salario de empleado' },
  'Record utility bills payment': { en: 'Record utility bills payment', es: 'Registrar pago de servicios públicos' },
  'Record inventory purchase on credit': { en: 'Record inventory purchase on credit', es: 'Registrar compra de inventario a crédito' },
  'Record payment to supplier': { en: 'Record payment to supplier', es: 'Registrar pago a proveedor' },
  'Record owner capital investment': { en: 'Record owner capital investment', es: 'Registrar inversión de capital del propietario' },
  'Record monthly depreciation of assets': { en: 'Record monthly depreciation of assets', es: 'Registrar depreciación mensual de activos' },
  'Record loan principal and interest payment': { en: 'Record loan principal and interest payment', es: 'Registrar pago de capital e intereses del préstamo' }
};

// Translation map for line descriptions
const lineDescTranslations: Record<string, Record<string, string>> = {
  'Cash received from sale': { en: 'Cash received from sale', es: 'Efectivo recibido de venta' },
  'Sales revenue': { en: 'Sales revenue', es: 'Ingresos por ventas' },
  'Credit sale to customer': { en: 'Credit sale to customer', es: 'Venta a crédito al cliente' },
  'Payment received from customer': { en: 'Payment received from customer', es: 'Pago recibido del cliente' },
  'Payment applied to receivable': { en: 'Payment applied to receivable', es: 'Pago aplicado a cuenta por cobrar' },
  'Office supplies and expenses': { en: 'Office supplies and expenses', es: 'Suministros y gastos de oficina' },
  'Payment for office expenses': { en: 'Payment for office expenses', es: 'Pago por gastos de oficina' },
  'Monthly rent payment': { en: 'Monthly rent payment', es: 'Pago mensual de alquiler' },
  'Rent payment': { en: 'Rent payment', es: 'Pago de alquiler' },
  'Employee salary': { en: 'Employee salary', es: 'Salario de empleado' },
  'Salary payment': { en: 'Salary payment', es: 'Pago de salario' },
  'Utility bills payment': { en: 'Utility bills payment', es: 'Pago de servicios públicos' },
  'Utility payment': { en: 'Utility payment', es: 'Pago de servicios' },
  'Inventory purchase': { en: 'Inventory purchase', es: 'Compra de inventario' },
  'Amount owed to supplier': { en: 'Amount owed to supplier', es: 'Monto adeudado al proveedor' },
  'Payment to supplier': { en: 'Payment to supplier', es: 'Pago al proveedor' },
  'Capital investment received': { en: 'Capital investment received', es: 'Inversión de capital recibida' },
  'Capital investment': { en: 'Capital investment', es: 'Inversión de capital' },
  'Monthly depreciation expense': { en: 'Monthly depreciation expense', es: 'Gasto mensual de depreciación' },
  'Accumulated depreciation': { en: 'Accumulated depreciation', es: 'Depreciación acumulada' },
  'Interest expense': { en: 'Interest expense', es: 'Gasto por intereses' },
  'Principal payment': { en: 'Principal payment', es: 'Pago de capital' },
  'Total loan payment': { en: 'Total loan payment', es: 'Pago total del préstamo' }
};

// Helper functions to get translated text
const getTranslatedFieldName = (fieldName: string): string => {
  const lang = "es";
  return fieldNameTranslations[fieldName]?.[lang] || fieldName;
};

const getTranslatedTemplateName = (name: string): string => {
   const lang = "es";
  return templateNameTranslations[name]?.[lang] || name;
};

const getTranslatedTemplateDesc = (desc: string): string => {
   const lang = "es";
  return templateDescTranslations[desc]?.[lang] || desc;
};

const getTranslatedLineDesc = (desc: string): string => {
  const lang = "es";
  return lineDescTranslations[desc]?.[lang] || desc;
};

export interface JournalTemplate {
  id: string;
  name: string;
  description: string;
  category: 'revenue' | 'expenses' | 'assets' | 'liabilities' | 'equity';
  lines: JournalTemplateLine[];
}

export interface JournalTemplateLine {
  id: string;
  accountId: string;
  accountName: string;
  description: string;
  document?: string; 
  type: 'debit' | 'credit';
  isAmountField: boolean; // True if user needs to enter amount
  fixedAmount?: number; // For predefined amounts
  amountFieldName?: string; // Label for the amount input field
}

// Predefined journal templates
const defaultTemplates: JournalTemplate[] = [
  {
    id: 'cash_sale',
    name: 'Cash Sale',
    description: 'Record a cash sale transaction',
    category: 'revenue',
    lines: [
      {
        id: 'cs1',
        accountId: '1001',
        accountName: 'Petty Cash',
        description: 'Cash received from sale',
        type: 'debit',
        isAmountField: true,
        amountFieldName: 'Sale Amount'
      },
      {
        id: 'cs2',
        accountId: '10',
        accountName: 'Sales Revenue',
        description: 'Sales revenue',
        type: 'credit',
        isAmountField: true,
        amountFieldName: 'Sale Amount'
      }
    ]
  },
  {
    id: 'credit_sale',
    name: 'Credit Sale',
    description: 'Record a sale on credit (accounts receivable)',
    category: 'revenue',
    lines: [
      {
        id: 'crs1',
        accountId: '2001',
        accountName: 'Trade Receivables',
        description: 'Credit sale to customer',
        type: 'debit',
        isAmountField: true,
        amountFieldName: 'Sale Amount'
      },
      {
        id: 'crs2',
        accountId: '10',
        accountName: 'Sales Revenue',
        description: 'Sales revenue',
        type: 'credit',
        isAmountField: true,
        amountFieldName: 'Sale Amount'
      }
    ]
  },
  {
    id: 'customer_payment',
    name: 'Customer Payment Received',
    description: 'Record payment received from customer',
    category: 'assets',
    lines: [
      {
        id: 'cp1',
        accountId: '1002',
        accountName: 'Bank - Checking Account',
        description: 'Payment received from customer',
        type: 'debit',
        isAmountField: true,
        amountFieldName: 'Payment Amount'
      },
      {
        id: 'cp2',
        accountId: '2001',
        accountName: 'Trade Receivables',
        description: 'Payment applied to receivable',
        type: 'credit',
        isAmountField: true,
        amountFieldName: 'Payment Amount'
      }
    ]
  },
  {
    id: 'office_expenses',
    name: 'Office Expenses',
    description: 'Record office supplies and expenses',
    category: 'expenses',
    lines: [
      {
        id: 'oe1',
        accountId: '5200',
        accountName: 'Office Expenses',
        description: 'Office supplies and expenses',
        type: 'debit',
        isAmountField: true,
        amountFieldName: 'Expense Amount'
      },
      {
        id: 'oe2',
        accountId: '1002',
        accountName: 'Bank - Checking Account',
        description: 'Payment for office expenses',
        type: 'credit',
        isAmountField: true,
        amountFieldName: 'Expense Amount'
      }
    ]
  },
  {
    id: 'rent_payment',
    name: 'Rent Payment',
    description: 'Record monthly rent payment',
    category: 'expenses',
    lines: [
      {
        id: 'rp1',
        accountId: '5200',
        accountName: 'Rent Expense',
        description: 'Monthly rent payment',
        type: 'debit',
        isAmountField: true,
        amountFieldName: 'Rent Amount'
      },
      {
        id: 'rp2',
        accountId: '1002',
        accountName: 'Bank - Checking Account',
        description: 'Rent payment',
        type: 'credit',
        isAmountField: true,
        amountFieldName: 'Rent Amount'
      }
    ]
  },
  {
    id: 'salary_payment',
    name: 'Salary Payment',
    description: 'Record employee salary payment',
    category: 'expenses',
    lines: [
      {
        id: 'sp1',
        accountId: '13',
        accountName: 'Salaries Expense',
        description: 'Employee salary',
        type: 'debit',
        isAmountField: true,
        amountFieldName: 'Salary Amount'
      },
      {
        id: 'sp2',
        accountId: '1002',
        accountName: 'Bank - Checking Account',
        description: 'Salary payment',
        type: 'credit',
        isAmountField: true,
        amountFieldName: 'Salary Amount'
      }
    ]
  },
  {
    id: 'utility_payment',
    name: 'Utility Payment',
    description: 'Record utility bills payment',
    category: 'expenses',
    lines: [
      {
        id: 'up1',
        accountId: '14',
        accountName: 'Operating Expenses',
        description: 'Utility bills payment',
        type: 'debit',
        isAmountField: true,
        amountFieldName: 'Utility Amount'
      },
      {
        id: 'up2',
        accountId: '1002',
        accountName: 'Bank - Checking Account',
        description: 'Utility payment',
        type: 'credit',
        isAmountField: true,
        amountFieldName: 'Utility Amount'
      }
    ]
  },
  {
    id: 'inventory_purchase',
    name: 'Inventory Purchase',
    description: 'Record inventory purchase on credit',
    category: 'assets',
    lines: [
      {
        id: 'ip1',
        accountId: '3',
        accountName: 'Inventory',
        description: 'Inventory purchase',
        type: 'debit',
        isAmountField: true,
        amountFieldName: 'Inventory Cost'
      },
      {
        id: 'ip2',
        accountId: '5',
        accountName: 'Accounts Payable',
        description: 'Amount owed to supplier',
        type: 'credit',
        isAmountField: true,
        amountFieldName: 'Inventory Cost'
      }
    ]
  },
  {
    id: 'supplier_payment',
    name: 'Supplier Payment',
    description: 'Record payment to supplier',
    category: 'liabilities',
    lines: [
      {
        id: 'spp1',
        accountId: '5',
        accountName: 'Accounts Payable',
        description: 'Payment to supplier',
        type: 'debit',
        isAmountField: true,
        amountFieldName: 'Payment Amount'
      },
      {
        id: 'spp2',
        accountId: '1002',
        accountName: 'Bank - Checking Account',
        description: 'Payment to supplier',
        type: 'credit',
        isAmountField: true,
        amountFieldName: 'Payment Amount'
      }
    ]
  },
  {
    id: 'capital_investment',
    name: 'Capital Investment',
    description: 'Record owner capital investment',
    category: 'equity',
    lines: [
      {
        id: 'ci1',
        accountId: '1002',
        accountName: 'Bank - Checking Account',
        description: 'Capital investment received',
        type: 'debit',
        isAmountField: true,
        amountFieldName: 'Investment Amount'
      },
      {
        id: 'ci2',
        accountId: '8',
        accountName: 'Owner\'s Equity',
        description: 'Capital investment',
        type: 'credit',
        isAmountField: true,
        amountFieldName: 'Investment Amount'
      }
    ]
  },
  {
    id: 'depreciation',
    name: 'Depreciation Expense',
    description: 'Record monthly depreciation of assets',
    category: 'expenses',
    lines: [
      {
        id: 'dep1',
        accountId: '14',
        accountName: 'Operating Expenses',
        description: 'Monthly depreciation expense',
        type: 'debit',
        isAmountField: true,
        amountFieldName: 'Depreciation Amount'
      },
      {
        id: 'dep2',
        accountId: '15', // Assuming this is accumulated depreciation account
        accountName: 'Accumulated Depreciation',
        description: 'Accumulated depreciation',
        type: 'credit',
        isAmountField: true,
        amountFieldName: 'Depreciation Amount'
      }
    ]
  },
  {
    id: 'loan_payment',
    name: 'Loan Payment',
    description: 'Record loan principal and interest payment',
    category: 'liabilities',
    lines: [
      {
        id: 'lp1',
        accountId: '14',
        accountName: 'Operating Expenses',
        description: 'Interest expense',
        type: 'debit',
        isAmountField: true,
        amountFieldName: 'Interest Amount'
      },
      {
        id: 'lp2',
        accountId: '6', // Assuming this is loans payable
        accountName: 'Loans Payable',
        description: 'Principal payment',
        type: 'debit',
        isAmountField: true,
        amountFieldName: 'Principal Amount'
      },
      {
        id: 'lp3',
        accountId: '1002',
        accountName: 'Bank - Checking Account',
        description: 'Total loan payment',
        type: 'credit',
        isAmountField: true,
        amountFieldName: 'Total Payment'
      }
    ]
  }
];

// Storage key for custom templates
const CUSTOM_TEMPLATES_KEY = 'journal_custom_templates';

// Load custom templates from localStorage
const loadCustomTemplates = (): JournalTemplate[] => {
  try {
    const stored = localStorage.getItem(CUSTOM_TEMPLATES_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to load custom templates:', error);
  }
  return [];
};

// Save custom templates to localStorage
const saveCustomTemplates = (customTemplates: JournalTemplate[]) => {
  try {
    localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(customTemplates));
  } catch (error) {
    console.warn('Failed to save custom templates:', error);
  }
};

// Initialize templates with default + custom
const initializeTemplates = (): JournalTemplate[] => {
  const customTemplates = loadCustomTemplates();
  return [...defaultTemplates, ...customTemplates];
};

const [templates, setTemplates] = createSignal<JournalTemplate[]>(initializeTemplates());

export const journalTemplateStore = {
  get templates() {
    return templates();
  },

  getTemplatesByCategory(category: JournalTemplate['category']) {
    return templates().filter(template => template.category === category);
  },

  getTemplateById(id: string) {
    return templates().find(template => template.id === id);
  },

  addTemplate(template: Omit<JournalTemplate, 'id'>) {
    const newTemplate: JournalTemplate = {
      ...template,
      id: `custom_${Date.now()}`
    };
    setTemplates(prev => {
      const updated = [...prev, newTemplate];
      // Save custom templates to localStorage
      const customTemplates = updated.filter(t => t.id.startsWith('custom_'));
      saveCustomTemplates(customTemplates);
      return updated;
    });
    return newTemplate;
  },

  updateTemplate(id: string, updates: Partial<JournalTemplate>) {
    setTemplates(prev => {
      const updated = prev.map(template =>
        template.id === id ? { ...template, ...updates } : template
      );
      // Save custom templates to localStorage
      const customTemplates = updated.filter(t => t.id.startsWith('custom_'));
      saveCustomTemplates(customTemplates);
      return updated;
    });
  },

  deleteTemplate(id: string) {
    // Only allow deletion of custom templates
    if (id.startsWith('custom_')) {
      setTemplates(prev => {
        const updated = prev.filter(template => template.id !== id);
        // Save custom templates to localStorage
        const customTemplates = updated.filter(t => t.id.startsWith('custom_'));
        saveCustomTemplates(customTemplates);
        return updated;
      });
    } else {
      throw new Error('Cannot delete default templates');
    }
  },

  getAllCategories(): JournalTemplate['category'][] {
    return ['revenue', 'expenses', 'assets', 'liabilities', 'equity'];
  },

  getCategoryDisplayName(category: JournalTemplate['category']): string {
    const lang = "es";
    const names = {
      revenue: { en: 'Revenue & Sales', es: 'Ingresos y Ventas' },
      expenses: { en: 'Expenses & Costs', es: 'Gastos y Costos' },
      assets: { en: 'Assets & Receipts', es: 'Activos y Recibos' },
      liabilities: { en: 'Liabilities & Payments', es: 'Pasivos y Pagos' },
      equity: { en: 'Equity & Capital', es: 'Patrimonio y Capital' }
    };
    return names[category][lang] || names[category]['en'];
  },

  getTranslatedFieldName,
  getTranslatedTemplateName,
  getTranslatedTemplateDesc,
  getTranslatedLineDesc
};