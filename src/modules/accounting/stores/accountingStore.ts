import { createSignal, createRoot } from 'solid-js';
import { fetchGraphQLSS, generateShortCode } from '../../../services/utils';
import { authStore } from '../../../stores/authStore';

// Types
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
  isBankAccount?: boolean;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountType?: 'checking' | 'savings' | 'credit' | 'investment';
  currency?: string;
  isPiggybank?: boolean;
  piggybankLabel?: string;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  description: string;
  status: 'draft' | 'posted' | 'void';
  lines: JournalEntryLine[];
  totalDebit: number;
  totalCredit: number;
  createdAt: string;
  createdBy: string;
  postedAt?: string;
  postedBy?: string;
  voidedAt?: string;
  voidedBy?: string;
  businessId?: string;
}

export interface JournalEntryLine {
  lineId?: string;
  accountId: string;
  accountNumber?: string;
  accountName?: string;
  description?: string;
  debitAmount: number;
  creditAmount: number;
  isReconciled?: boolean;
  reconciledWith?: string;
}

export interface SourceDocument {
  id: string;
  documentType: string;
  documentNumber: string;
  documentDate: string;
  description: string;
  fileUrl?: string;
  fileName?: string;
  mimeType?: string;
  uploadedAt: string;
  uploadedBy: string;
  relatedEntryId?: string;
  businessId?: string;
}

// Accounting API service
const accountingApi = {
  async getAccounts(query?: string): Promise<AccountingAccount[]> {
    if (!query?.trim()) {
      query = authStore.getBusinessId();
    }

    const params: Record<string, any> = {
      businessId: authStore.getBusinessId()
    };

    query?.split(' ').forEach((qry, idx) => {
      if (qry) {
        params[`:search${idx}`] = qry.trim();
      }
    });

    const bdyq2 = {
      query: 'getAccounts',
      queryString: '!* contain :search0 AND !* contain :search1 AND !* contain :search2',
      params,
      limit: 2000
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || [];
  },

  async createAccount(account: Partial<AccountingAccount>): Promise<AccountingAccount> {
    const params: Record<string, any> = {
      businessId: authStore.getBusinessId()
    };

    const bdyq2 = {
      query: 'addAccount',
      params,
      form: account
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || response;
  },

  async updateAccount(id: string, updates: Partial<AccountingAccount>): Promise<AccountingAccount> {
    const params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      id
    };

    const bdyq2 = {
      query: 'updateAccount',
      params,
      data2update: updates
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || response;
  },

  async deleteAccount(id: string): Promise<any> {
    const params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      id
    };

    const bdyq2 = {
      query: 'deleteAccount',
      params
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response;
  },

  async getJournalEntries(query?: string): Promise<JournalEntry[]> {
    if (!query?.trim()) {
      query = authStore.getBusinessId();
    }

    const params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      year: authStore.getSelectedYear()
    };

    query?.split(' ').forEach((qry, idx) => {
      if (qry) {
        params[`:search${idx}`] = qry.trim();
      }
    });

    const bdyq2 = {
      query: 'getEntryBooks',
      queryString: '!* contain :search0 AND !* contain :search1 AND !* contain :search2',
      params
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || [];
  },

  async createJournalEntry(entry: Partial<JournalEntry>): Promise<JournalEntry> {
    const params: Record<string, any> = {
      businessId: authStore.getBusinessId()
    };

    const bdyq2 = {
      query: 'addEntryBook',
      params,
      form: entry
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || response;
  },

  async updateJournalEntry(id: string, updates: Partial<JournalEntry>): Promise<JournalEntry> {
    const params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      id
    };

    const bdyq2 = {
      query: 'updateEntryBook',
      params,
      form: updates
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || response;
  },

  async postJournalEntry(id: string): Promise<JournalEntry> {
    const params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      id
    };

    const bdyq2 = {
      query: 'postEntryBook',
      params,
      form: {
        status: 'posted',
        postedAt: new Date().toISOString(),
        postedBy: authStore.state?.user?.uid || 'system'
      }
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || response;
  },

  async voidJournalEntry(id: string): Promise<JournalEntry> {
    const params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      id
    };

    const bdyq2 = {
      query: 'updateEntryBook',
      params,
      form: {
        status: 'void',
        voidedAt: new Date().toISOString(),
        voidedBy: authStore.state?.user?.uid || 'system'
      }
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || response;
  },

  async getDocuments(query?: string): Promise<SourceDocument[]> {
    if (!query?.trim()) {
      query = authStore.getBusinessId();
    }

    const params: Record<string, any> = {
      businessId: authStore.getBusinessId()
    };

    query?.split(' ').forEach((qry, idx) => {
      if (qry) {
        params[`:search${idx}`] = qry.trim();
      }
    });

    const bdyq2 = {
      query: 'getDocuments',
      queryString: '!* contain :search0 AND !* contain :search1 AND !* contain :search2',
      params
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || [];
  },

  async uploadDocument(file: File, metadata: Partial<SourceDocument>): Promise<SourceDocument> {
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Array.from(new Uint8Array(arrayBuffer));

    const params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      userId: authStore.state?.user?.uid,
      timestamp: new Date().getTime()
    };

    const bdyq2 = {
      query: 'uploadDocument',
      params,
      form: {
        fileBuffer,
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        ...metadata,
        uploadedAt: new Date().toISOString(),
        uploadedBy: authStore.state?.user?.uid || 'system'
      }
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || response;
  }
};

// Create signals with proper owner context using createRoot
const {
  accounts,
  setAccounts,
  transactions,
  setTransactions,
  documents,
  setDocuments,
  isLoading,
  setIsLoading
} = createRoot(() => {
  const [accounts, setAccounts] = createSignal<AccountingAccount[]>([]);
  const [transactions, setTransactions] = createSignal<JournalEntry[]>([]);
  const [documents, setDocuments] = createSignal<SourceDocument[]>([]);
  const [isLoading, setIsLoading] = createSignal<boolean>(false);

  return {
    accounts,
    setAccounts,
    transactions,
    setTransactions,
    documents,
    setDocuments,
    isLoading,
    setIsLoading
  };
});

// Store implementation
export const accountingStore = {
  // Getters
  get accounts() {
    return accounts();
  },

  get transactions() {
    return transactions();
  },

  get documents() {
    return documents();
  },

  get isLoading() {
    return isLoading();
  },

  // Account methods
  async loadAccounts(query?: string): Promise<void> {
    setIsLoading(true);
    try {
      const result = await accountingApi.getAccounts(query || authStore.getBusinessId());
      setAccounts(result);
    } catch (error) {
      console.error('Error loading accounts:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  },

  async addAccount(account: Partial<AccountingAccount>): Promise<AccountingAccount> {
    setIsLoading(true);
    try {
      const newAccount: Partial<AccountingAccount> = {
        ...account,
        id: generateShortCode(16),
        accountId: generateShortCode(16),
        createdDate: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        isActive: account.isActive ?? true
      };

      const result = await accountingApi.createAccount(newAccount);
      setAccounts([...accounts(), result]);
      return result;
    } catch (error) {
      console.error('Error adding account:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  },

  async updateAccount(id: string, updates: Partial<AccountingAccount>): Promise<void> {
    setIsLoading(true);
    try {
      const updatedData = {
        ...updates,
        lastModified: new Date().toISOString()
      };

      await accountingApi.updateAccount(id, updatedData);

      setAccounts(
        accounts().map((account) =>
          account.id === id ? { ...account, ...updatedData } : account
        )
      );
    } catch (error) {
      console.error('Error updating account:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  },

  async deleteAccount(id: string): Promise<void> {
    setIsLoading(true);
    try {
      await accountingApi.deleteAccount(id);
      setAccounts(accounts().filter((account) => account.id !== id));
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  },

  getAccountById(id: string): AccountingAccount | undefined {
    return accounts().find((account) => account.id === id);
  },

  getAccountsByType(type: string): AccountingAccount[] {
    return accounts().filter(
      (account) =>
        account.accountType === type ||
        account.type === type ||
        account.classification === type
    );
  },

  getAccountHierarchy(): Array<AccountingAccount & { subAccounts: AccountingAccount[] }> {
    const parentAccounts = accounts().filter((account) => !account.parentAccountId);

    return parentAccounts.map((parent) => ({
      ...parent,
      subAccounts: accounts().filter((account) => account.parentAccountId === parent.id)
    }));
  },

  // Transaction methods
  async loadTransactions(filters?: Record<string, any>): Promise<void> {
    setIsLoading(true);
    try {
      const query = filters?.search || authStore.getBusinessId();
      const result = await accountingApi.getJournalEntries(query);
      setTransactions(result);
    } catch (error) {
      console.error('Error loading transactions:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  },

  async addTransaction(entry: Partial<JournalEntry>): Promise<JournalEntry> {
    setIsLoading(true);
    try {
      const newEntry: Partial<JournalEntry> = {
        ...entry,
        id: generateShortCode(16),
        entryNumber: `JE-${Date.now()}`,
        status: 'draft',
        createdAt: new Date().toISOString(),
        createdBy: authStore.state?.user?.uid || 'system',
        businessId: authStore.getBusinessId()
      };

      const result = await accountingApi.createJournalEntry(newEntry);
      setTransactions([...transactions(), result]);
      return result;
    } catch (error) {
      console.error('Error adding transaction:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  },

  async postTransaction(id: string): Promise<void> {
    setIsLoading(true);
    try {
      const result = await accountingApi.postJournalEntry(id);

      setTransactions(
        transactions().map((transaction) =>
          transaction.id === id ? result : transaction
        )
      );
    } catch (error) {
      console.error('Error posting transaction:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  },

  async voidTransaction(id: string): Promise<void> {
    setIsLoading(true);
    try {
      const result = await accountingApi.voidJournalEntry(id);

      setTransactions(
        transactions().map((transaction) =>
          transaction.id === id ? result : transaction
        )
      );
    } catch (error) {
      console.error('Error voiding transaction:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  },

  getTransactionById(id: string): JournalEntry | undefined {
    return transactions().find((transaction) => transaction.id === id);
  },

  // Document methods
  async loadDocuments(query?: string): Promise<void> {
    setIsLoading(true);
    try {
      const result = await accountingApi.getDocuments(query || authStore.getBusinessId());
      setDocuments(result);
    } catch (error) {
      console.error('Error loading documents:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  },

  async uploadDocument(file: File, metadata?: Partial<SourceDocument>): Promise<SourceDocument> {
    setIsLoading(true);
    try {
      const documentMetadata: Partial<SourceDocument> = {
        ...metadata,
        id: generateShortCode(16),
        businessId: authStore.getBusinessId()
      };

      const result = await accountingApi.uploadDocument(file, documentMetadata);
      setDocuments([...documents(), result]);
      return result;
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  },

  getDocumentById(id: string): SourceDocument | undefined {
    return documents().find((document) => document.id === id);
  },

  // Computed values
  get totalAssets(): number {
    return accounts()
      .filter((account) => account.accountType === 'Asset' || account.classification === 'Asset')
      .reduce((total, account) => total + (account.balance || 0), 0);
  },

  get totalLiabilities(): number {
    return accounts()
      .filter(
        (account) =>
          account.accountType === 'Liability' || account.classification === 'Liability'
      )
      .reduce((total, account) => total + (account.balance || 0), 0);
  },

  get totalEquity(): number {
    return accounts()
      .filter((account) => account.accountType === 'Equity' || account.classification === 'Equity')
      .reduce((total, account) => total + (account.balance || 0), 0);
  },

  get totalRevenue(): number {
    return accounts()
      .filter(
        (account) => account.accountType === 'Revenue' || account.classification === 'Revenue'
      )
      .reduce((total, account) => total + (account.balance || 0), 0);
  },

  get totalExpenses(): number {
    return accounts()
      .filter(
        (account) => account.accountType === 'Expense' || account.classification === 'Expense'
      )
      .reduce((total, account) => total + (account.balance || 0), 0);
  },

  get accountsByType(): Record<string, AccountingAccount[]> {
    const grouped: Record<string, AccountingAccount[]> = {};

    accounts().forEach((account) => {
      const type =
        account.accountType || account.type || account.classification || 'Uncategorized';

      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(account);
    });

    return grouped;
  },

  // Helper method to update accounts from journal entries
  updateBalancesFromJournalEntries(journalEntries: JournalEntry[]): void {
    const updatedAccounts = accounts().map((account) => {
      let totalDebits = 0;
      let totalCredits = 0;

      journalEntries.forEach((entry) => {
        if (entry.status !== 'posted') return;

        entry.lines?.forEach((line) => {
          if (line.accountId === account.id || line.accountNumber === account.accountNumber) {
            totalDebits += line.debitAmount || 0;
            totalCredits += line.creditAmount || 0;
          }
        });
      });

      const accountType =
        account.accountType || account.type || account.classification || 'Asset';

      let calculatedBalance = 0;
      if (accountType === 'Asset' || accountType === 'Expense') {
        calculatedBalance = totalDebits - totalCredits;
      } else {
        calculatedBalance = totalCredits - totalDebits;
      }

      return {
        ...account,
        balance: calculatedBalance
      };
    });

    setAccounts(updatedAccounts);
  }
};
