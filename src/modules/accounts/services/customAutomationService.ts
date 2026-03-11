import { entryBookStore } from '../../journal/stores/entryBookStore';
import { accountAutomationStore } from '../stores/accountAutomationStore';

export interface CustomAutomationParams {
  type: 'manual_entry' | 'transfer' | 'adjustment' | 'payment' | 'receipt';
  description: string;
  reference?: string;
  date?: string;
  entries: {
    debitAccountId: string;
    creditAccountId: string;
    amount: number;
    description?: string;
  }[];
  postImmediately?: boolean;
}

export interface QuickTransactionParams {
  transactionType: 'cash_sale' | 'credit_sale' | 'expense_payment' | 'customer_payment' | 'custom';
  amount: number;
  description: string;
  reference?: string;
  customAccounts?: {
    debitAccountId: string;
    creditAccountId: string;
  };
  paymentMethod?: 'cash' | 'zelle' | 'credit_card' | 'check';
  postImmediately?: boolean;
}

class CustomAutomationService {
  /**
   * Create a manual journal entry with custom parameters
   */
  async createCustomEntry(params: CustomAutomationParams): Promise<string> {
    const { type, description, reference, date, entries, postImmediately = false } = params;

    // Calculate total debits and credits
    const totalDebit = entries.reduce((sum, entry) => sum + entry.amount, 0);
    const totalCredit = entries.reduce((sum, entry) => sum + entry.amount, 0);

    // Create journal entry lines
    const lines = entries.flatMap(entry => [
      {
        id: `line_${Date.now()}_${Math.random()}`,
        accountId: entry.debitAccountId,
        accountName: this.getAccountName(entry.debitAccountId),
        description: entry.description || description,
        debitAmount: entry.amount,
        creditAmount: 0
      },
      {
        id: `line_${Date.now()}_${Math.random()}`,
        accountId: entry.creditAccountId,
        accountName: this.getAccountName(entry.creditAccountId),
        description: entry.description || description,
        debitAmount: 0,
        creditAmount: entry.amount
      }
    ]);

    // Create the journal entry
    const journalEntry = {
      entryNumber: entryBookStore.getNextEntryNumber(),
      date: date || new Date().toISOString().split('T')[0],
      description: `${description} (Manual)`,
      reference: reference || `MANUAL-${Date.now()}`,
      status: 'draft' as const,
      createdBy: 'manual-automation',
      createdAt: new Date().toISOString(),
      totalDebit,
      totalCredit,
      lines
    };

    const entryId = await entryBookStore.addJournalEntry(journalEntry);

    if (postImmediately) {
      entryBookStore.postJournalEntry(entryId);
    }

    return entryId;
  }

  /**
   * Create quick transactions with predefined account mappings
   */
  async createQuickTransaction(params: QuickTransactionParams): Promise<string> {
    const { 
      transactionType, 
      amount, 
      description, 
      reference,
      customAccounts,
      paymentMethod = 'cash',
      postImmediately = false 
    } = params;

    let debitAccountId: string;
    let creditAccountId: string;

    if (transactionType === 'custom' && customAccounts) {
      debitAccountId = customAccounts.debitAccountId;
      creditAccountId = customAccounts.creditAccountId;
    } else {
      const accounts = this.getAccountsForTransaction(transactionType, paymentMethod);
      debitAccountId = accounts.debitAccountId;
      creditAccountId = accounts.creditAccountId;
    }

    return this.createCustomEntry({
      type: 'manual_entry',
      description,
      reference,
      entries: [{
        debitAccountId,
        creditAccountId,
        amount,
        description
      }],
      postImmediately
    });
  }

  /**
   * Create a bank transfer entry
   */
  async createBankTransfer(params: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    description: string;
    reference?: string;
    postImmediately?: boolean;
  }): Promise<string> {
    const { fromAccountId, toAccountId, amount, description, reference, postImmediately = false } = params;

    return this.createCustomEntry({
      type: 'transfer',
      description: `Bank Transfer: ${description}`,
      reference: reference || `XFER-${Date.now()}`,
      entries: [{
        debitAccountId: toAccountId,
        creditAccountId: fromAccountId,
        amount,
        description
      }],
      postImmediately
    });
  }

  /**
   * Create an adjustment entry
   */
  async createAdjustment(params: {
    accountId: string;
    adjustmentAccountId: string;
    amount: number;
    type: 'increase' | 'decrease';
    description: string;
    reference?: string;
    postImmediately?: boolean;
  }): Promise<string> {
    const { accountId, adjustmentAccountId, amount, type, description, reference, postImmediately = false } = params;

    const isDebitIncrease = this.isDebitIncreaseAccount(accountId);
    
    let debitAccountId: string;
    let creditAccountId: string;

    if ((type === 'increase' && isDebitIncrease) || (type === 'decrease' && !isDebitIncrease)) {
      debitAccountId = accountId;
      creditAccountId = adjustmentAccountId;
    } else {
      debitAccountId = adjustmentAccountId;
      creditAccountId = accountId;
    }

    return this.createCustomEntry({
      type: 'adjustment',
      description: `Adjustment: ${description}`,
      reference: reference || `ADJ-${Date.now()}`,
      entries: [{
        debitAccountId,
        creditAccountId,
        amount,
        description
      }],
      postImmediately
    });
  }

  /**
   * Create multiple entries in a single transaction
   */
  async createComplexTransaction(params: {
    description: string;
    reference?: string;
    date?: string;
    entries: Array<{
      accountId: string;
      amount: number;
      type: 'debit' | 'credit';
      description?: string;
    }>;
    postImmediately?: boolean;
  }): Promise<string> {
    const { description, reference, date, entries, postImmediately = false } = params;

    // Group entries by debit/credit and create pairs
    const debits = entries.filter(e => e.type === 'debit');
    const credits = entries.filter(e => e.type === 'credit');

    // Validate that debits equal credits
    const totalDebits = debits.reduce((sum, e) => sum + e.amount, 0);
    const totalCredits = credits.reduce((sum, e) => sum + e.amount, 0);

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      throw new Error(`Transaction not balanced. Debits: ${totalDebits}, Credits: ${totalCredits}`);
    }

    const lines = [
      ...debits.map(entry => ({
        id: `line_${Date.now()}_${Math.random()}`,
        accountId: entry.accountId,
        accountName: this.getAccountName(entry.accountId),
        description: entry.description || description,
        debitAmount: entry.amount,
        creditAmount: 0
      })),
      ...credits.map(entry => ({
        id: `line_${Date.now()}_${Math.random()}`,
        accountId: entry.accountId,
        accountName: this.getAccountName(entry.accountId),
        description: entry.description || description,
        debitAmount: 0,
        creditAmount: entry.amount
      }))
    ];

    const journalEntry = {
      entryNumber: entryBookStore.getNextEntryNumber(),
      date: date || new Date().toISOString().split('T')[0],
      description: `${description} (Complex)`,
      reference: reference || `COMPLEX-${Date.now()}`,
      status: 'draft' as const,
      createdBy: 'manual-automation',
      createdAt: new Date().toISOString(),
      totalDebit: totalDebits,
      totalCredit: totalCredits,
      lines
    };

    const entryId = await entryBookStore.addJournalEntry(journalEntry);

    if (postImmediately) {
      entryBookStore.postJournalEntry(entryId);
    }

    return entryId;
  }

  /**
   * Get predefined account mappings for common transactions
   */
  private getAccountsForTransaction(transactionType: string, paymentMethod: string): {
    debitAccountId: string;
    creditAccountId: string;
  } {
    const mappings: Record<string, Record<string, {debitAccountId: string, creditAccountId: string}>> = {
      'cash_sale': {
        'cash': { debitAccountId: '1001', creditAccountId: '4001' },
        'zelle': { debitAccountId: '1002', creditAccountId: '4001' },
        'credit_card': { debitAccountId: '1003', creditAccountId: '4001' }
      },
      'credit_sale': {
        'default': { debitAccountId: '1101', creditAccountId: '4001' }
      },
      'expense_payment': {
        'cash': { debitAccountId: '5201', creditAccountId: '1001' }, // Default to salary expense
        'check': { debitAccountId: '5201', creditAccountId: '1001' }
      },
      'customer_payment': {
        'cash': { debitAccountId: '1001', creditAccountId: '1101' },
        'zelle': { debitAccountId: '1002', creditAccountId: '1101' },
        'credit_card': { debitAccountId: '1003', creditAccountId: '1101' }
      }
    };

    const transactionMap = mappings[transactionType];
    if (!transactionMap) {
      throw new Error(`Unknown transaction type: ${transactionType}`);
    }

    return transactionMap[paymentMethod] || transactionMap['default'] || transactionMap[Object.keys(transactionMap)[0]];
  }

  /**
   * Determine if an account increases with debits
   */
  private isDebitIncreaseAccount(accountId: string): boolean {
    // Assets and Expenses increase with debits
    // Liabilities, Equity, and Revenue increase with credits
    const firstDigit = accountId.charAt(0);
    return firstDigit === '1' || firstDigit === '5'; // Assets (1xxx) or Expenses (5xxx)
  }

  /**
   * Get account name by ID
   */
  private getAccountName(accountId: string): string {
    const accountNames: { [key: string]: string } = {
      '1001': 'Cash - Operating Account',
      '1002': 'Cash - Zelle Account',
      '1003': 'Cash - Credit Card Processing',
      '1101': 'Accounts Receivable - Customers',
      '1102': 'Accounts Receivable - Freight Charges',
      '1201': 'Inventory - Products',
      '1202': 'Inventory - Packaging Materials',
      '1301': 'Prepaid Expenses',
      '1401': 'Customs Fees Receivable',
      '1402': 'Transit Insurance Receivable',
      '2001': 'Accounts Payable',
      '2002': 'Freight Payable',
      '2101': 'Accrued Salaries',
      '2102': 'Accrued Rent',
      '2301': 'Sales Tax Payable',
      '2302': 'Customs Fees Payable',
      '2303': 'Transit Insurance Payable',
      '3001': 'Owner\'s Equity',
      '3101': 'Retained Earnings',
      '4001': 'Sales Revenue - Products',
      '4101': 'Service Revenue - General',
      '4201': 'Transport Service Revenue',
      '4202': 'Freight Revenue - Air',
      '4203': 'Freight Revenue - Sea',
      '4301': 'Processing Revenue - Packaging',
      '4302': 'Processing Revenue - Storage',
      '5001': 'Cost of Goods Sold - Products',
      '5002': 'Cost of Goods Sold - Packaging',
      '5101': 'Freight Expense - Air',
      '5102': 'Freight Expense - Sea',
      '5103': 'Local Transport Expense',
      '5201': 'Salaries and Wages',
      '5202': 'Rent Expense - Office',
      '5203': 'Rent Expense - Warehouse',
      '5301': 'Utilities Expense',
      '5302': 'Insurance Expense',
      '5303': 'Office Supplies',
      '5401': 'Professional Fees',
      '5402': 'Bank Fees',
      '5403': 'Credit Card Processing Fees',
      '5501': 'Vehicle Expenses',
      '5502': 'Equipment Maintenance',
      '5601': 'Depreciation Expense'
    };
    
    return accountNames[accountId] || `Account ${accountId}`;
  }

  /**
   * Get available account list for dropdowns
   */
  getAvailableAccounts(): Array<{id: string, name: string, type: string}> {
    return [
      // Assets
      {id: '1001', name: 'Cash - Operating Account', type: 'Asset'},
      {id: '1002', name: 'Cash - Zelle Account', type: 'Asset'},
      {id: '1003', name: 'Cash - Credit Card Processing', type: 'Asset'},
      {id: '1101', name: 'Accounts Receivable - Customers', type: 'Asset'},
      {id: '1102', name: 'Accounts Receivable - Freight Charges', type: 'Asset'},
      {id: '1201', name: 'Inventory - Products', type: 'Asset'},
      {id: '1202', name: 'Inventory - Packaging Materials', type: 'Asset'},
      {id: '1301', name: 'Prepaid Expenses', type: 'Asset'},
      {id: '1401', name: 'Customs Fees Receivable', type: 'Asset'},
      {id: '1402', name: 'Transit Insurance Receivable', type: 'Asset'},
      
      // Liabilities
      {id: '2001', name: 'Accounts Payable', type: 'Liability'},
      {id: '2002', name: 'Freight Payable', type: 'Liability'},
      {id: '2101', name: 'Accrued Salaries', type: 'Liability'},
      {id: '2102', name: 'Accrued Rent', type: 'Liability'},
      {id: '2301', name: 'Sales Tax Payable', type: 'Liability'},
      {id: '2302', name: 'Customs Fees Payable', type: 'Liability'},
      {id: '2303', name: 'Transit Insurance Payable', type: 'Liability'},
      
      // Equity
      {id: '3001', name: 'Owner\'s Equity', type: 'Equity'},
      {id: '3101', name: 'Retained Earnings', type: 'Equity'},
      
      // Revenue
      {id: '4001', name: 'Sales Revenue - Products', type: 'Revenue'},
      {id: '4101', name: 'Service Revenue - General', type: 'Revenue'},
      {id: '4201', name: 'Transport Service Revenue', type: 'Revenue'},
      {id: '4202', name: 'Freight Revenue - Air', type: 'Revenue'},
      {id: '4203', name: 'Freight Revenue - Sea', type: 'Revenue'},
      {id: '4301', name: 'Processing Revenue - Packaging', type: 'Revenue'},
      {id: '4302', name: 'Processing Revenue - Storage', type: 'Revenue'},
      
      // Expenses
      {id: '5001', name: 'Cost of Goods Sold - Products', type: 'Expense'},
      {id: '5002', name: 'Cost of Goods Sold - Packaging', type: 'Expense'},
      {id: '5101', name: 'Freight Expense - Air', type: 'Expense'},
      {id: '5102', name: 'Freight Expense - Sea', type: 'Expense'},
      {id: '5103', name: 'Local Transport Expense', type: 'Expense'},
      {id: '5201', name: 'Salaries and Wages', type: 'Expense'},
      {id: '5202', name: 'Rent Expense - Office', type: 'Expense'},
      {id: '5203', name: 'Rent Expense - Warehouse', type: 'Expense'},
      {id: '5301', name: 'Utilities Expense', type: 'Expense'},
      {id: '5302', name: 'Insurance Expense', type: 'Expense'},
      {id: '5303', name: 'Office Supplies', type: 'Expense'},
      {id: '5401', name: 'Professional Fees', type: 'Expense'},
      {id: '5402', name: 'Bank Fees', type: 'Expense'},
      {id: '5403', name: 'Credit Card Processing Fees', type: 'Expense'},
      {id: '5501', name: 'Vehicle Expenses', type: 'Expense'},
      {id: '5502', name: 'Equipment Maintenance', type: 'Expense'},
      {id: '5601', name: 'Depreciation Expense', type: 'Expense'}
    ];
  }

  /**
   * Get common transaction templates
   */
  getTransactionTemplates(): Array<{
    id: string;
    name: string;
    description: string;
    type: QuickTransactionParams['transactionType'];
    defaultAccounts?: {debitAccountId: string, creditAccountId: string};
  }> {
    return [
      {
        id: 'cash_sale',
        name: 'Cash Sale',
        description: 'Record a cash sale transaction',
        type: 'cash_sale'
      },
      {
        id: 'zelle_sale',
        name: 'Zelle Sale',
        description: 'Record a sale paid via Zelle',
        type: 'cash_sale'
      },
      {
        id: 'credit_sale',
        name: 'Credit Sale',
        description: 'Record a sale on credit (accounts receivable)',
        type: 'credit_sale'
      },
      {
        id: 'customer_payment',
        name: 'Customer Payment',
        description: 'Record payment received from customer',
        type: 'customer_payment'
      },
      {
        id: 'freight_expense',
        name: 'Freight Expense',
        description: 'Record freight/shipping costs',
        type: 'custom',
        defaultAccounts: {debitAccountId: '5101', creditAccountId: '1001'}
      },
      {
        id: 'salary_payment',
        name: 'Salary Payment',
        description: 'Record salary/wage payments',
        type: 'expense_payment'
      },
      {
        id: 'rent_payment',
        name: 'Rent Payment',
        description: 'Record monthly rent payment',
        type: 'custom',
        defaultAccounts: {debitAccountId: '5202', creditAccountId: '1001'}
      },
      {
        id: 'bank_transfer',
        name: 'Bank Transfer',
        description: 'Transfer funds between bank accounts',
        type: 'custom'
      }
    ];
  }
}

// Export singleton instance
export const customAutomationService = new CustomAutomationService();