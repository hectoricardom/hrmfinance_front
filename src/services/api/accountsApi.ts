import { apiService } from '../api';
import { AccountingAccount } from '../../modules/accounts/stores/accountsStore';
import {
  GET_ACCOUNTS,
  GET_ACCOUNT_BY_ID,
  CREATE_ACCOUNT,
  UPDATE_ACCOUNT,
  DELETE_ACCOUNT
} from '../graphql/queries';
import {  fetchGraphQL } from '../utils';
import { apiAdapter, accountsApi as fakeAccountsApi } from '../apiAdapter';

export interface CreateAccountInput {
  accountNumber: string;
  name: string;
  type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
  category: string;
  description?: string;
  balance?: number;
  isActive?: boolean;
  parentAccountId?: string;
}

export interface UpdateAccountInput extends Partial<CreateAccountInput> {}

export interface AccountFilter {
  type?: string;
  category?: string;
  isActive?: boolean;
  search?: string;
}

export interface AccountSort {
  field: 'accountNumber' | 'name' | 'type' | 'balance' | 'createdDate';
  direction: 'asc' | 'desc';
}

export class AccountsApi {
  // Get all accounts
  async getAccounts(filter?: AccountFilter, sort?: AccountSort): Promise<AccountingAccount[]> {
    try {
     

      // Real API implementation
      const response = {}

      console.log('Real API accounts response:', response);
      return response?.accounts || [];
    } catch (error) {
      console.error('Error fetching accounts:', error);
      // Fallback to fake API in hybrid mode
      if (apiAdapter.isHybridMode()) {
        console.warn('Falling back to fake API for accounts');
        return await fakeAccountsApi.getAll(filter);
      }
      throw error;
    }
  }

  async getAccountBalances(filter?: AccountFilter, sort?: AccountSort): Promise<AccountingAccount[]> {
    try {
     

      // Real API implementation
      const response = {}

      console.log('Real API accounts response:', response);
      return response?.accounts || [];
    } catch (error) {
      console.error('Error fetching accounts:', error);
      // Fallback to fake API in hybrid mode
      if (apiAdapter.isHybridMode()) {
        console.warn('Falling back to fake API for accounts');
        return await fakeAccountsApi.getAll(filter);
      }
      throw error;
    }
  }
  // Get account by ID
  async getAccountById(id: string): Promise<AccountingAccount | null> {
    try {
      const response = await apiService.graphql<{ account: AccountingAccount }>({
        query: GET_ACCOUNT_BY_ID,
        variables: { id }
      });
      return response.account;
    } catch (error) {
      console.error('Error fetching account:', error);
      throw error;
    }
  }

  // Create new account
  async createAccount(input: CreateAccountInput): Promise<AccountingAccount> {
    try {
      const response = await apiService.graphql<{ createAccount: AccountingAccount }>({
        query: CREATE_ACCOUNT,
        variables: { input }
      });
      return response.createAccount;
    } catch (error) {
      console.error('Error creating account:', error);
      throw error;
    }
  }

  // Update account
  async updateAccount(id: string, input: UpdateAccountInput): Promise<AccountingAccount> {
    try {
      const response = await apiService.graphql<{ updateAccount: AccountingAccount }>({
        query: UPDATE_ACCOUNT,
        variables: { id, input }
      });
      return response.updateAccount;
    } catch (error) {
      console.error('Error updating account:', error);
      throw error;
    }
  }

  // Delete account
  async deleteAccount(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiService.graphql<{ deleteAccount: { success: boolean; message: string } }>({
        query: DELETE_ACCOUNT,
        variables: { id }
      });
      return response.deleteAccount;
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  }

  // Get accounts by type
  async getAccountsByType(type: string): Promise<AccountingAccount[]> {
    return this.getAccounts({ type });
  }

  // Get account hierarchy
  async getAccountHierarchy(): Promise<AccountingAccount[]> {
    const accounts = await this.getAccounts();
    return this.buildHierarchy(accounts);
  }

  // Build account hierarchy
  private buildHierarchy(accounts: AccountingAccount[]): AccountingAccount[] {
    const accountMap = new Map<string, AccountingAccount>();
    const rootAccounts: AccountingAccount[] = [];

    // Create account map
    accounts.forEach(account => {
      accountMap.set(account.id, { ...account, subAccounts: [] });
    });

    // Build hierarchy
    accounts.forEach(account => {
      const mappedAccount = accountMap.get(account.id)!;
      
      if (account.parentAccountId) {
        const parent = accountMap.get(account.parentAccountId);
        if (parent) {
          parent.subAccounts = parent.subAccounts || [];
          parent.subAccounts.push(mappedAccount);
        }
      } else {
        rootAccounts.push(mappedAccount);
      }
    });

    return rootAccounts;
  }

  // Get account balance
  async getAccountBalance(id: string): Promise<number> {
    const account = await this.getAccountById(id);
    return account ? account.balance : 0;
  }

  // Search accounts
  async searchAccounts(query: string): Promise<AccountingAccount[]> {
    return this.getAccounts({ search: query });
  }
}

// Export singleton instance
export const accountsApi = new AccountsApi();