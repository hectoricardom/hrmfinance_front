import { createSignal, createResource } from 'solid-js';
import { accountsApi } from '../../../services/api/accountsApi';
import type { AccountingAccount, AccountTransaction } from './accountsStore';
import type { 
  CreateAccountInput, 
  UpdateAccountInput, 
  AccountFilter, 
  AccountSort 
} from '../../../services/api/accountsApi';

// Enhanced store with API integration
export class AccountsApiStore {
  // Local signals for caching
  private accountsSignal = createSignal<AccountingAccount[]>([]);
  private accounts = this.accountsSignal[0];
  private setAccounts = this.accountsSignal[1];
  
  private transactionsSignal = createSignal<AccountTransaction[]>([]);
  private transactions = this.transactionsSignal[0];
  private setTransactions = this.transactionsSignal[1];
  
  private loadingSignal = createSignal(false);
  private loading = this.loadingSignal[0];
  private setLoading = this.loadingSignal[1];
  
  private errorSignal = createSignal<string | null>(null);
  private error = this.errorSignal[0];
  private setError = this.errorSignal[1];

  // Resource for reactive data fetching
  private accountsResourceResult = createResource(
    () => null,
    () => this.fetchAccounts()
  );
  private accountsResource = this.accountsResourceResult[0];

  // Public getters
  get accountsList() {
    return this.accounts();
  }

  get transactionsList() {
    return this.transactions();
  }

  get isLoading() {
    return this.loading();
  }

  get errorMessage() {
    return this.error();
  }

  // Clear error state
  clearError() {
    this.setError(null);
  }

  // Fetch all accounts
  async fetchAccounts(filter?: AccountFilter, sort?: AccountSort): Promise<AccountingAccount[]> {
    try {
      this.setLoading(true);
      this.setError(null);
      
      const fetchedAccounts = await accountsApi.getAccounts(filter, sort);
      this.setAccounts(fetchedAccounts);
      
      return fetchedAccounts;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch accounts';
      this.setError(errorMessage);
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  // Get account by ID
  async getAccountById(id: string): Promise<AccountingAccount | null> {
    try {
      this.setError(null);
      
      // Check cache first
      const cachedAccount = this.accounts().find(account => account.id === id);
      if (cachedAccount) {
        return cachedAccount;
      }

      // Fetch from API
      const account = await accountsApi.getAccountById(id);
      
      if (account) {
        // Update cache
        this.setAccounts(prev => {
          const index = prev.findIndex(a => a.id === id);
          if (index >= 0) {
            const updated = [...prev];
            updated[index] = account;
            return updated;
          }
          return [...prev, account];
        });
      }
      
      return account;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch account';
      this.setError(errorMessage);
      throw error;
    }
  }

  // Create new account
  async createAccount(input: CreateAccountInput): Promise<AccountingAccount> {
    try {
      this.setLoading(true);
      this.setError(null);
      
      const newAccount = await accountsApi.createAccount(input);
      
      // Update local cache
      this.setAccounts(prev => [...prev, newAccount]);
      
      return newAccount;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create account';
      this.setError(errorMessage);
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  // Update account
  async updateAccount(id: string, input: UpdateAccountInput): Promise<AccountingAccount> {
    try {
      this.setLoading(true);
      this.setError(null);
      
      const updatedAccount = await accountsApi.updateAccount(id, input);
      
      // Update local cache
      this.setAccounts(prev => 
        prev.map(account => 
          account.id === id ? updatedAccount : account
        )
      );
      
      return updatedAccount;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update account';
      this.setError(errorMessage);
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  // Delete account
  async deleteAccount(id: string): Promise<{ success: boolean; message: string }> {
    try {
      this.setLoading(true);
      this.setError(null);
      
      const result = await accountsApi.deleteAccount(id);
      
      if (result.success) {
        // Remove from local cache
        this.setAccounts(prev => prev.filter(account => account.id !== id));
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete account';
      this.setError(errorMessage);
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  // Get accounts by type
  async getAccountsByType(type: string): Promise<AccountingAccount[]> {
    try {
      const accounts = await accountsApi.getAccountsByType(type);
      return accounts;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch accounts by type';
      this.setError(errorMessage);
      throw error;
    }
  }

  // Get account hierarchy
  async getAccountHierarchy(): Promise<AccountingAccount[]> {
    try {
      const hierarchy = await accountsApi.getAccountHierarchy();
      return hierarchy;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch account hierarchy';
      this.setError(errorMessage);
      throw error;
    }
  }

  // Get account balance
  async getAccountBalance(id: string): Promise<number> {
    try {
      const balance = await accountsApi.getAccountBalance(id);
      return balance;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch account balance';
      this.setError(errorMessage);
      throw error;
    }
  }

  // Search accounts
  async searchAccounts(query: string): Promise<AccountingAccount[]> {
    try {
      const accounts = await accountsApi.searchAccounts(query);
      return accounts;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to search accounts';
      this.setError(errorMessage);
      throw error;
    }
  }

  // Cached/derived data methods
  getAccountsByTypeFromCache(type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense'): AccountingAccount[] {
    return this.accounts().filter(account => account.type === type);
  }

  getTotalByTypeFromCache(type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense'): number {
    return this.getAccountsByTypeFromCache(type)
      .filter(account => account.isActive)
      .reduce((total, account) => total + account.balance, 0);
  }

  getAccountCategoriesFromCache(type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense'): string[] {
    const accountsOfType = this.getAccountsByTypeFromCache(type);
    return [...new Set(accountsOfType.map(account => account.category))];
  }

  // Sub-account management from cache
  getSubAccountsFromCache(parentAccountId: string): AccountingAccount[] {
    return this.accounts().filter(account => account.parentAccountId === parentAccountId);
  }

  getParentAccountsFromCache(): AccountingAccount[] {
    return this.accounts().filter(account => !account.parentAccountId);
  }

  getAccountHierarchyFromCache(): (AccountingAccount & { subAccounts: AccountingAccount[] })[] {
    const parentAccounts = this.getParentAccountsFromCache();
    return parentAccounts.map(parent => ({
      ...parent,
      subAccounts: this.getSubAccountsFromCache(parent.id)
    }));
  }

  getAccountWithSubAccountsFromCache(accountId: string): (AccountingAccount & { 
    subAccounts: AccountingAccount[];
    parentAccount: AccountingAccount | null;
  }) | null {
    const account = this.accounts().find(a => a.id === accountId);
    if (!account) return null;
    
    return {
      ...account,
      subAccounts: this.getSubAccountsFromCache(accountId),
      parentAccount: account.parentAccountId ? 
        this.accounts().find(a => a.id === account.parentAccountId) || null : null
    };
  }

  getAccountPathFromCache(accountId: string): AccountingAccount[] {
    const account = this.accounts().find(a => a.id === accountId);
    if (!account) return [];
    
    const path = [account];
    let currentAccount = account;
    
    while (currentAccount.parentAccountId) {
      const parent = this.accounts().find(a => a.id === currentAccount.parentAccountId);
      if (parent) {
        path.unshift(parent);
        currentAccount = parent;
      } else {
        break;
      }
    }
    
    return path;
  }

  getTotalBalanceWithSubAccountsFromCache(accountId: string): number {
    const account = this.accounts().find(a => a.id === accountId);
    if (!account) return 0;
    
    const subAccounts = this.getSubAccountsFromCache(accountId);
    const subAccountsTotal = subAccounts.reduce((total, subAccount) => {
      return total + this.getTotalBalanceWithSubAccountsFromCache(subAccount.id);
    }, 0);
    
    return account.balance + subAccountsTotal;
  }

  // Validation methods
  canDeleteAccountFromCache(accountId: string): { canDelete: boolean; reason?: string } {
    const subAccounts = this.getSubAccountsFromCache(accountId);
    if (subAccounts.length > 0) {
      return {
        canDelete: false,
        reason: `Account has ${subAccounts.length} sub-account(s). Delete or move sub-accounts first.`
      };
    }
    
    const transactions = this.getAccountTransactionsFromCache(accountId);
    if (transactions.length > 0) {
      return {
        canDelete: false,
        reason: `Account has ${transactions.length} transaction(s). Cannot delete account with transaction history.`
      };
    }
    
    return { canDelete: true };
  }

  // Transaction management (placeholder - would need journal API integration)
  getAccountTransactionsFromCache(accountId: string): AccountTransaction[] {
    return this.transactions().filter(transaction => transaction.accountId === accountId);
  }

  // Refresh data from API
  async refreshAccounts(): Promise<void> {
    await this.fetchAccounts();
  }

  // Initialize store
  async initialize(): Promise<void> {
    await this.fetchAccounts();
  }
}

// Export singleton instance
export const accountsApiStore = new AccountsApiStore();