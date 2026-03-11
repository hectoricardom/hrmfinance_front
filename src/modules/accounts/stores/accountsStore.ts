import { createSignal, createRoot } from 'solid-js';
import { accountsApi } from '../../../services/apiAdapter';
import { devLog, formatFloat, generateRandomId } from '../../../services/utils';
import { authStore } from '../../../stores/authStore';

export interface AccountingAccount {
  id: string;
  accountNumber: string;
  code?: string;
  name: string;
  type?: string;
  accountType?: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
  category: string;
  description: string;
  balance?: number;
  classification?: string;
  isActive: boolean;
  parentAccountId?: string;
  parentAccountNumber?: string;
  createdDate: string;
  lastModified: string;
  accountId?: string;
  // Bank account properties
  isBankAccount?: boolean;
  bankName?: string;
  bankAccountNumber?: string; // Last 4 digits or masked number
  bankAccountType?: 'checking' | 'savings' | 'credit' | 'investment';
  currency?: string;
  // Piggybank - accounts for payments/collections (cash, bank, etc.)
  isPiggybank?: boolean;
  piggybankLabel?: string; // Custom label like "Caja Principal", "Banco Popular", etc.

  // Capacity features
  isDefault?: boolean; // Default account for specific operations
  isShared?: boolean; // Shared across multiple scopes/users
}

export interface AccountTransaction {
  id: string;
  accountId: string;
  date: string;
  description: string;
  debitAmount: number;
  creditAmount: number;
  reference: string;
  type: 'debit' | 'credit';
}

const initialAccounts: AccountingAccount[] = [
  // Assets - Parent Accounts
  {
    id: '1',
    accountNumber: '1000',
    name: 'Cash and Cash Equivalents',
    accountType: 'Asset',
    category: 'Current Assets',
    description: 'Cash on hand and in bank accounts',
    balance: 45230.50,
    isActive: true,
    createdDate: '2024-01-01',
    lastModified: '2024-01-15',

  },
  // Cash Sub-accounts
  {
    id: '1001',
    accountNumber: '1001',
    name: 'Petty Cash',
    accountType: 'Asset',
    category: 'Current Assets',
    description: 'Small amounts of cash for minor expenses',
    balance: 500.00,
    isActive: true,
    parentAccountId: '1',
    createdDate: '2024-01-01',
    lastModified: '2024-01-15'
  },
  {
    id: '1002',
    accountNumber: '1002',
    name: 'Bank - Checking Account',
    accountType: 'Asset',
    category: 'Current Assets',
    description: 'Main operating checking account',
    balance: 32730.50,
    isActive: true,
    parentAccountId: '1',
    createdDate: '2024-01-01',
    lastModified: '2024-01-15'
  },
  {
    id: '1003',
    accountNumber: '1003',
    name: 'Bank - Savings Account',
    accountType: 'Asset',
    category: 'Current Assets',
    description: 'Interest-bearing savings account',
    balance: 12000.00,
    isActive: true,
    parentAccountId: '1',
    createdDate: '2024-01-01',
    lastModified: '2024-01-15'
  },
  {
    id: '2',
    accountNumber: '1100',
    name: 'Accounts Receivable',
    accountType: 'Asset',
    category: 'Current Assets',
    description: 'Money owed by customers',
    balance: 23450.75,
    isActive: true,
    createdDate: '2024-01-01',
    lastModified: '2024-01-14'
  },
  // Accounts Receivable Sub-accounts
  {
    id: '2001',
    accountNumber: '1101',
    name: 'Trade Receivables',
    accountType: 'Asset',
    category: 'Current Assets',
    description: 'Receivables from regular customers',
    balance: 18450.75,
    isActive: true,
    parentAccountId: '2',
    createdDate: '2024-01-01',
    lastModified: '2024-01-14'
  },
  {
    id: '2002',
    accountNumber: '1102',
    name: 'Employee Advances',
    accountType: 'Asset',
    category: 'Current Assets',
    description: 'Money advanced to employees',
    balance: 5000.00,
    isActive: true,
    parentAccountId: '2',
    createdDate: '2024-01-01',
    lastModified: '2024-01-14'
  },
  {
    id: '3',
    accountNumber: '1200',
    name: 'Inventory',
    accountType: 'Asset',
    category: 'Current Assets',
    description: 'Products held for sale',
    balance: 78920.25,
    isActive: true,
    createdDate: '2024-01-01',
    lastModified: '2024-01-13'
  },
  {
    id: '4',
    accountNumber: '1500',
    name: 'Equipment',
    accountType: 'Asset',
    category: 'Fixed Assets',
    description: 'Office equipment and machinery',
    balance: 125000.00,
    isActive: true,
    createdDate: '2024-01-01',
    lastModified: '2024-01-12'
  },

  // Liabilities
  {
    id: '5',
    accountNumber: '2000',
    name: 'Accounts Payable',
    accountType: 'Liability',
    category: 'Current Liabilities',
    description: 'Money owed to suppliers',
    balance: 15670.30,
    isActive: true,
    createdDate: '2024-01-01',
    lastModified: '2024-01-11'
  },
  {
    id: '6',
    accountNumber: '2100',
    name: 'Accrued Expenses',
    accountType: 'Liability',
    category: 'Current Liabilities',
    description: 'Expenses incurred but not yet paid',
    balance: 8945.60,
    isActive: true,
    createdDate: '2024-01-01',
    lastModified: '2024-01-10'
  },
  {
    id: '7',
    accountNumber: '2500',
    name: 'Long-term Debt',
    accountType: 'Liability',
    category: 'Long-term Liabilities',
    description: 'Long-term loans and mortgages',
    balance: 85000.00,
    isActive: true,
    createdDate: '2024-01-01',
    lastModified: '2024-01-09'
  },

  // Equity
  {
    id: '8',
    accountNumber: '3000',
    name: 'Owner\'s Equity',
    accountType: 'Equity',
    category: 'Owner\'s Equity',
    description: 'Owner\'s investment in the business',
    balance: 150000.00,
    isActive: true,
    createdDate: '2024-01-01',
    lastModified: '2024-01-08'
  },
  {
    id: '9',
    accountNumber: '3100',
    name: 'Retained Earnings',
    accountType: 'Equity',
    category: 'Owner\'s Equity',
    description: 'Accumulated profits retained in business',
    balance: 32450.80,
    isActive: true,
    createdDate: '2024-01-01',
    lastModified: '2024-01-07'
  },

  // Revenue
  {
    id: '10',
    accountNumber: '4000',
    name: 'Sales Revenue',
    accountType: 'Revenue',
    category: 'Operating Revenue',
    description: 'Revenue from product sales',
    balance: 245678.90,
    isActive: true,
    createdDate: '2024-01-01',
    lastModified: '2024-01-06'
  },
  {
    id: '11',
    accountNumber: '4100',
    name: 'Service Revenue',
    accountType: 'Revenue',
    category: 'Operating Revenue',
    description: 'Revenue from services provided',
    balance: 89432.15,
    isActive: true,
    createdDate: '2024-01-01',
    lastModified: '2024-01-05'
  },

  // Expenses
  {
    id: '12',
    accountNumber: '5000',
    name: 'Cost of Goods Sold',
    accountType: 'Expense',
    category: 'Operating Expenses',
    description: 'Direct costs of producing goods',
    balance: 125678.45,
    isActive: true,
    createdDate: '2024-01-01',
    lastModified: '2024-01-04'
  },
  {
    id: '13',
    accountNumber: '5100',
    name: 'Salaries Expense',
    accountType: 'Expense',
    category: 'Operating Expenses',
    description: 'Employee salary expenses',
    balance: 98765.32,
    isActive: true,
    createdDate: '2024-01-01',
    lastModified: '2024-01-03'
  },
  {
    id: '14',
    accountNumber: '5200',
    name: 'Rent Expense',
    accountType: 'Expense',
    category: 'Operating Expenses',
    description: 'Office rent expenses',
    balance: 24000.00,
    isActive: true,
    createdDate: '2024-01-01',
    lastModified: '2024-01-02'
  }
];

const initialTransactions: AccountTransaction[] = [
  {
    id: '1',
    accountId: '1',
    date: '2024-01-15',
    description: 'Customer payment received',
    debitAmount: 5000.00,
    creditAmount: 0,
    reference: 'INV-2024-001',
    type: 'debit'
  },
  {
    id: '2',
    accountId: '2',
    date: '2024-01-15',
    description: 'Customer payment received',
    debitAmount: 0,
    creditAmount: 5000.00,
    reference: 'INV-2024-001',
    type: 'credit'
  },
  {
    id: '3',
    accountId: '5',
    date: '2024-01-14',
    description: 'Office supplies purchased',
    debitAmount: 0,
    creditAmount: 1250.00,
    reference: 'PO-2024-001',
    type: 'credit'
  }
];

// Create signals with proper owner context
const { accounts, setAccounts, transactions, setTransactions, setAccountsBalances, accountsBalances } = createRoot(() => {
  const [accounts, setAccounts] = createSignal<AccountingAccount[]>([]);
  const [accountsBalances, setAccountsBalances] = createSignal({});
  const [transactions, setTransactions] = createSignal<AccountTransaction[]>(initialTransactions);
  return { accounts, setAccounts, transactions, setTransactions, setAccountsBalances, accountsBalances };
});

export const accountsStore = {
  get accounts() {
    return accounts();
  },

  get transactions() {
    return transactions();
  },

  get accountsBalances() {
    return accountsBalances()
  },

  parseAccount(account: any): AccountingAccount {

    let pAcc: AccountingAccount = {
      id: account?.accountId || account.id || account?.code,
      accountNumber: account.accountNumber || account?.code,
      code: account?.code,
      name: account.name,
      type: account.type,
      accountType: account.accountType,
      classification: account.classification || account.clasification,
      category: account.category,
      description: account.description,
      isActive: true,
      accountId: account?.accountId,
      parentAccountId: account?.parentAccountId,
      parentAccountNumber: account?.parentAccountNumber

    }

    //devLog(pAcc)
    return pAcc
  },

  updAccount(account: AccountingAccount[]) {

    try {
      setAccounts(account);

    }
    catch (e) {
      devLog(e)
    }

  },

  updAccountBalance(data: any) {
    setAccountsBalances(data)
  },

  fetchAllAccount(account: Omit<AccountingAccount, 'id'>) {
    const newAccount: AccountingAccount = {
      ...account,
      //id: Date.now().toString(),
      createdDate: new Date().toISOString().split('T')[0],
      lastModified: new Date().toISOString().split('T')[0]
    };
    setAccounts([...accounts(), newAccount]);
    return newAccount;
  },
  async addAccount(account: Omit<AccountingAccount, 'id'>) {
    const newAccount: AccountingAccount = {
      ...account,
      accountId: generateRandomId(),
      id: generateRandomId(),
      createdDate: new Date().toISOString().split('T')[0],
      lastModified: new Date().toISOString().split('T')[0]
    };

    let ss = await accountsApi.create(newAccount);
    setAccounts([...accounts(), newAccount]);
    return newAccount;
  },



  // 3059103150

  async updateAccountServer(id: string, updates: Partial<AccountingAccount>) {
    let ss = await accountsApi.update(id, updates);
    accountsStore.updateAccount(id, updates);
  },

  updateAccount(id: string, updates: Partial<AccountingAccount>) {
    setAccounts(accounts().map(account =>
      account.id === id ? {
        ...account,
        ...updates,
        lastModified: new Date().toISOString().split('T')[0]
      } : account
    ));
  },

  async deleteAccount(id: string) {
    let ss = await accountsApi.delete(id);
    setAccounts(accounts().filter(account => account.id !== id));
  },

  getAccountById(id: string) {
    return accounts().find(account => account.id === id);
  },

  getAccountsByType(type: AccountingAccount['accountType']) {
    return accounts().filter(account =>
      account.accountType === type || account.type === type || account.classification === type
    );
  },

  getAccountsByCategory(category: string) {
    return accounts().filter(account => account.category === category);
  },

  // Bank account methods
  getBankAccounts() {
    return accounts().filter(account => account.isBankAccount === true);
  },

  markAsBankAccount(accountId: string, bankInfo: {
    bankName: string;
    bankAccountNumber: string;
    bankAccountType: 'checking' | 'savings' | 'credit' | 'investment';
    currency?: string;
  }) {
    this.updateAccount(accountId, {
      isBankAccount: true,
      bankName: bankInfo.bankName,
      bankAccountNumber: bankInfo.bankAccountNumber,
      bankAccountType: bankInfo.bankAccountType,
      currency: bankInfo.currency || 'USD'
    });
  },

  unmarkAsBankAccount(accountId: string) {
    this.updateAccount(accountId, {
      isBankAccount: false,
      bankName: undefined,
      bankAccountNumber: undefined,
      bankAccountType: undefined,
      currency: undefined
    });
  },

  async reloadAccs() {
    let qry = authStore.getBusinessId()
    let acns = await accountsApi.getAlls(qry);
    accountsStore.updAccount(acns);
    //devLog("acns", acns)
    let bln = await accountsApi.getBalances();

    accountsStore.updAccountBalance(bln)
  },

  // Piggybank account methods (accounts for payments/collections)
  getPiggybankAccounts() {
    // accounts().map(account => { })
    //devLog(accounts().filter(account => account.isPiggybank === true  || account.isBankAccount === true))
    if (!accounts().length) {
      this.reloadAccs();
    }

    return accounts().filter(account => account.isPiggybank === true || account.isBankAccount === true);
  },

  markAsPiggybank(accountId: string, label?: string) {
    this.updateAccount(accountId, {
      isPiggybank: true,
      piggybankLabel: label
    });
  },

  unmarkAsPiggybank(accountId: string) {
    this.updateAccount(accountId, {
      isPiggybank: false,
      piggybankLabel: undefined
    });
  },

  getAccountsByTypeAndCategory(type: AccountingAccount['accountType'], category: string) {
    return accounts().filter(account =>
      (account.accountType === type || account.type === type || account.classification === type) &&
      account.category === category
    );
  },

  getAccountTransactions(accountId: string) {
    return transactions().filter(transaction => transaction.accountId === accountId);
  },

  addTransaction(transaction: Omit<AccountTransaction, 'id'>) {
    const newTransaction: AccountTransaction = {
      ...transaction,
      id: Date.now().toString()
    };
    setTransactions([...transactions(), newTransaction]);

    // Update account balance
    const account = this.getAccountById(transaction.accountId);
    if (account) {
      const balanceChange = transaction.type === 'debit' ? transaction.debitAmount : -transaction.creditAmount;
      this.updateAccount(transaction.accountId, {
        balance: account.balance + balanceChange
      });
    }

    return newTransaction;
  },

  getTotalByType(type: AccountingAccount['type']) {
    return accounts()
      .filter(account => account.type === type && account.isActive)
      .reduce((total, account) => total + account.balance, 0);
  },

  getAccountCategories(type: AccountingAccount['type']) {
    const accountsOfType = this.getAccountsByType(type);
    return [...new Set(accountsOfType.map(account => account.category))];
  },

  // Sub-account management methods
  getSubAccounts(parentAccountId: string) {
    return accounts().filter(account => account.parentAccountId === parentAccountId);
  },

  getParentAccounts() {


    return accounts().filter(account => !account.parentAccountId);
  },

  getAccountHierarchy() {
    const parentAccounts = this.getParentAccounts();


    return parentAccounts.map(parent => ({
      ...parent,
      subAccounts: this.getSubAccounts(parent?.id)
    }));


  },

  getAccountWithSubAccounts(accountId: string) {
    const account = this.getAccountById(accountId);
    if (!account) return null;

    return {
      ...account,
      subAccounts: this.getSubAccounts(accountId),
      parentAccount: account.parentAccountId ? this.getAccountById(account.parentAccountId) : null
    };
  },

  getAccountPath(accountId: string): AccountingAccount[] {
    const account = this.getAccountById(accountId);
    if (!account) return [];

    const path = [account];
    let currentAccount = account;

    while (currentAccount.parentAccountId) {
      const parent = this.getAccountById(currentAccount.parentAccountId);
      if (parent) {
        path.unshift(parent);
        currentAccount = parent;
      } else {
        break;
      }
    }

    return path;
  },

  getTotalBalanceWithSubAccounts(accountId: string): number {
    const account = this.getAccountById(accountId);
    if (!account) return 0;

    const subAccounts = this.getSubAccounts(accountId);
    const subAccountsTotal = subAccounts.reduce((total, subAccount) => {
      return total + this.getTotalBalanceWithSubAccounts(subAccount.id);
    }, 0);

    return account.balance + subAccountsTotal;
  },

  canDeleteAccount(accountId: string): { canDelete: boolean; reason?: string } {
    const subAccounts = this.getSubAccounts(accountId);
    if (subAccounts.length > 0) {
      return {
        canDelete: false,
        reason: `Account has ${subAccounts.length} sub-account(s). Delete or move sub-accounts first.`
      };
    }

    const transactions = this.getAccountTransactions(accountId);
    if (transactions.length > 0) {
      return {
        canDelete: false,
        reason: `Account has ${transactions.length} transaction(s). Cannot delete account with transaction history.`
      };
    }

    return { canDelete: true };
  },

  /**
   * Calculate account balance from journal entry lines
   * For Assets and Expenses: Balance = Debits - Credits (normal debit balance)
   * For Liabilities, Equity, and Revenue: Balance = Credits - Debits (normal credit balance)
   */


  calculateAccountBalance(accountId: string, journalEntries: any[]): number {
    const account = this.getAccountById(accountId);
    if (!account) return 0;

    let totalDebits = 0;
    let totalCredits = 0;


    if (account.parentAccountId) {
      //devLog("subAccount")
      //  devLog(account)
    }
    // Sum all debits and credits from journal entry lines for this account
    journalEntries.forEach(entry => {
      //if (entry.status !== 'posted') return; // Only count posted entries

      entry.lines?.forEach((line: any) => {

        if (line.accountId === accountId || line.accountNumber === account.accountNumber) {
          totalDebits += formatFloat(line.debitAmount) || 0;
          totalCredits += formatFloat(line.creditAmount) || 0;
        }
      });
    });

    const accountType = account.accountType || account.type || account.classification;

    // Calculate balance based on account type (normal balance)
    if (accountType === 'Asset' || accountType === 'Expense') {
      return totalDebits - totalCredits; // Normal debit balance
    } else {
      return totalCredits - totalDebits; // Normal credit balance (Liability, Equity, Revenue)
    }
  },

  /**
   * Calculate all account balances from journal entries
   */
  calculateAllBalances(journalEntries: any[]): Map<string, number> {
    const balances = new Map<string, number>();

    accounts().forEach(account => {
      const balance = this.calculateAccountBalance(account.id, journalEntries);
      balances.set(account.id, balance);
    });

    return balances;
  },

  /**
   * Update account balances from journal entries
   */
  updateBalancesFromJournalEntries(journalEntries: any[]) {
    const updatedAccounts = accounts().filter(r => !r.parentAccountId).map(account => {
      const calculatedBalance = this.calculateAccountBalance(account.id, journalEntries);

      devLog(account.id, calculatedBalance)


      return {
        ...account,
        balance: calculatedBalance
      };
    });
    setAccounts(updatedAccounts);
  }
};


