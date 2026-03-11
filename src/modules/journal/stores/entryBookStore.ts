import { createSignal } from 'solid-js';
import { bankConsolidationStore, EntryBookRecord } from './bankConsolidationStore';

import {  journalApi } from '../../../services/apiAdapter';
import { devLog, generateRandomId, generateShortCode } from '../../../services/utils';
import { authStore } from '../../../stores/authStore';

export interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  createAt: string;
  description: string;
  reference: string;
  status: 'draft' | 'posted' | 'void';
  createdBy: string;
  createdAt: string;
  postedAt?: string;
  document?: string;
  totalDebits: number;
  totalCredits: number;
  createdTimeStamp?: number;
  lines: JournalEntryLine[];
}

export interface JournalEntryLine {
  id?: string;
  accountId?: string;
  accountNumber?: string;
  isDebit?: boolean;
  accountName?: string;
  description: string;
  debitAmount?: number;
  creditAmount?: number;
  referenceId?: string;
  document?: string;
  amount: number;
  reconciled?: boolean;
  reconciledWith?: string;
}

// Example journal entries that correspond to bank transactions

/**
const initialJournalEntries: JournalEntry[] = [
  {
    id: 'je1',
    entryNumber: 'JE-2024-001',
    date: '2024-01-15',
    description: 'Customer Payment Received - ABC Corp',
    reference: 'INV-2024-001',
    status: 'posted',
    createdBy: 'John Doe',
    createdAt: '2024-01-15T09:00:00Z',
    postedAt: '2024-01-15T09:05:00Z',
    totalDebit: 5000.00,
    totalCredit: 5000.00,
    lines: [
      {
        id: 'jel1',
        accountId: '1002', // Bank - Checking Account
        accountName: 'Bank - Checking Account',
        description: 'Payment from ABC Corp',
        debitAmount: 5000.00,
        creditAmount: 0,
        reconciled: true,
        reconciledWith: 'eb1'
      },
      {
        id: 'jel2',
        accountId: '2001', // Trade Receivables
        accountName: 'Trade Receivables',
        description: 'Payment received for INV-2024-001',
        debitAmount: 0,
        creditAmount: 5000.00
      }
    ]
  },
  {
    id: 'je2',
    entryNumber: 'JE-2024-002',
    date: '2024-01-14',
    description: 'Office Supplies Purchase',
    reference: 'PO-2024-001',
    status: 'posted',
    createdBy: 'Jane Smith',
    createdAt: '2024-01-14T10:00:00Z',
    postedAt: '2024-01-14T10:15:00Z',
    totalDebit: 250.00,
    totalCredit: 250.00,
    lines: [
      {
        id: 'jel3',
        accountId: '5200', // Office Expenses
        accountName: 'Office Expenses',
        description: 'Office supplies from Staples',
        debitAmount: 250.00,
        creditAmount: 0
      },
      {
        id: 'jel4',
        accountId: '1002', // Bank - Checking Account
        accountName: 'Bank - Checking Account',
        description: 'Payment to Staples',
        debitAmount: 0,
        creditAmount: 250.00,
        reconciled: true,
        reconciledWith: 'eb2'
      }
    ]
  },
  {
    id: 'je3',
    entryNumber: 'JE-2024-003',
    date: '2024-01-13',
    description: 'Monthly Rent Payment',
    reference: 'RENT-2024-01',
    status: 'posted',
    createdBy: 'John Doe',
    createdAt: '2024-01-13T08:00:00Z',
    postedAt: '2024-01-13T08:30:00Z',
    totalDebit: 2000.00,
    totalCredit: 2000.00,
    lines: [
      {
        id: 'jel5',
        accountId: '5200', // Rent Expense
        accountName: 'Rent Expense',
        description: 'January office rent',
        debitAmount: 2000.00,
        creditAmount: 0
      },
      {
        id: 'jel6',
        accountId: '1002', // Bank - Checking Account
        accountName: 'Bank - Checking Account',
        description: 'Rent payment',
        debitAmount: 0,
        creditAmount: 2000.00,
        reconciled: false
      }
    ]
  },
  {
    id: 'je4',
    entryNumber: 'JE-2024-004',
    date: '2024-01-12',
    description: 'Wire Transfer - Capital Investment',
    reference: 'WIRE-001',
    status: 'posted',
    createdBy: 'Admin',
    createdAt: '2024-01-12T14:00:00Z',
    postedAt: '2024-01-12T14:30:00Z',
    totalDebit: 10000.00,
    totalCredit: 10000.00,
    lines: [
      {
        id: 'jel7',
        accountId: '1002', // Bank - Checking Account
        accountName: 'Bank - Checking Account',
        description: 'Wire transfer received',
        debitAmount: 10000.00,
        creditAmount: 0,
        reconciled: false
      },
      {
        id: 'jel8',
        accountId: '8', // Owner's Equity
        accountName: 'Owner\'s Equity',
        description: 'Capital investment',
        debitAmount: 0,
        creditAmount: 10000.00
      }
    ]
  },
  {
    id: 'je5',
    entryNumber: 'JE-2024-005',
    date: '2024-01-11',
    description: 'Salary Payment - John Doe',
    reference: 'PAY-2024-001',
    status: 'posted',
    createdBy: 'HR Manager',
    createdAt: '2024-01-11T16:00:00Z',
    postedAt: '2024-01-11T16:30:00Z',
    totalDebit: 3500.00,
    totalCredit: 3500.00,
    lines: [
      {
        id: 'jel9',
        accountId: '13', // Salaries Expense
        accountName: 'Salaries Expense',
        description: 'Monthly salary - John Doe',
        debitAmount: 3500.00,
        creditAmount: 0
      },
      {
        id: 'jel10',
        accountId: '1002', // Bank - Checking Account
        accountName: 'Bank - Checking Account',
        description: 'Salary payment',
        debitAmount: 0,
        creditAmount: 3500.00,
        reconciled: false
      }
    ]
  },
  {
    id: 'je6',
    entryNumber: 'JE-2024-006',
    date: '2024-01-10',
    description: 'Product Sales - Multiple Customers',
    reference: 'SALES-2024-010',
    status: 'posted',
    createdBy: 'Sales Manager',
    createdAt: '2024-01-10T11:00:00Z',
    postedAt: '2024-01-10T11:30:00Z',
    totalDebit: 8500.00,
    totalCredit: 8500.00,
    lines: [
      {
        id: 'jel11',
        accountId: '1001', // Petty Cash
        accountName: 'Petty Cash',
        description: 'Cash sales',
        debitAmount: 1500.00,
        creditAmount: 0
      },
      {
        id: 'jel12',
        accountId: '2001', // Trade Receivables
        accountName: 'Trade Receivables',
        description: 'Credit sales',
        debitAmount: 7000.00,
        creditAmount: 0
      },
      {
        id: 'jel13',
        accountId: '10', // Sales Revenue
        accountName: 'Sales Revenue',
        description: 'Product sales revenue',
        debitAmount: 0,
        creditAmount: 8500.00
      }
    ]
  },
  {
    id: 'je7',
    entryNumber: 'JE-2024-007',
    date: '2024-01-09',
    description: 'Inventory Purchase',
    reference: 'PO-2024-002',
    status: 'draft',
    createdBy: 'Warehouse Manager',
    createdAt: '2024-01-09T15:00:00Z',
    totalDebit: 15000.00,
    totalCredit: 15000.00,
    lines: [
      {
        id: 'jel14',
        accountId: '3', // Inventory
        accountName: 'Inventory',
        description: 'Product inventory purchase',
        debitAmount: 15000.00,
        creditAmount: 0
      },
      {
        id: 'jel15',
        accountId: '5', // Accounts Payable
        accountName: 'Accounts Payable',
        description: 'Amount owed to supplier',
        debitAmount: 0,
        creditAmount: 15000.00
      }
    ]
  },
  {
    id: 'je8',
    entryNumber: 'JE-2024-008',
    date: '2024-01-08',
    description: 'Utility Bills Payment',
    reference: 'UTIL-2024-01',
    status: 'posted',
    createdBy: 'Admin',
    createdAt: '2024-01-08T09:00:00Z',
    postedAt: '2024-01-08T09:30:00Z',
    totalDebit: 450.00,
    totalCredit: 450.00,
    lines: [
      {
        id: 'jel16',
        accountId: '14', // Operating Expenses
        accountName: 'Operating Expenses',
        description: 'Electricity and water bills',
        debitAmount: 450.00,
        creditAmount: 0
      },
      {
        id: 'jel17',
        accountId: '1003', // Bank - Savings Account
        accountName: 'Bank - Savings Account',
        description: 'Utility payment',
        debitAmount: 0,
        creditAmount: 450.00
      }
    ]
  }
];

 */

const [journalEntries, setJournalEntries] = createSignal<JournalEntry[]>([]);

// Sync entry book records with bank consolidation store
const syncEntryBookRecords = () => {

 
    /**
    //.filter(je => je.status === 'posted')
    .flatMap(je => je.lines.filter(line => 
      // Filter for bank account lines (checking, savings, petty cash)
      ['1001', '1002', '1003'].includes(line.accountId)
    ))
     */
    const bankRelatedLines = journalEntries()?.map(line => {
      
      const journalEntry = journalEntries().find(je => 
        je.lines.some(l => l.id === line.id)
      ); 


      //devLog(journalEntries())
     // let journalEntry = line;
      if (!journalEntry) return null;
      return {
        id: `eb_${line.id}`,
        accountId: line.accountId,
        date: journalEntry.createdAt,
        description: journalEntry.description,
        reference: journalEntry.reference,
        debitAmount: line.isDebit && line.amount,
        creditAmount: !line.isDebit && line.amount,
        category: line.accountName,
        isReconciled: line.reconciled || false,
        reconciledWith: line.reconciledWith,
        createdAt: journalEntry.createdAt
      } as EntryBookRecord;
    })
    .filter(record => record !== null) as EntryBookRecord[];
  // Update bank consolidation store with entry book records
  // This would normally be done through API calls, but for demo purposes we'll update directly
  return bankRelatedLines;
};

export const entryBookStore = {
  get journalEntries() {
    return journalEntries();
  },


 
  async addJournalEntry(entry: Omit<JournalEntry, 'id'>) {
    const newEntry: JournalEntry = {
      ...entry,
      createdTimeStamp: new Date(entry.createdAt).getTime(),
      id: generateRandomId(),
    };

    let dd = await journalApi.create(newEntry);
    setJournalEntries([...journalEntries(), newEntry]);
    return newEntry;
  },



  async updateJournalEntry(id: string, updates: Partial<JournalEntry>) {

    await journalApi.update(id, updates);
    //devLog(id, {updates}, dd)
    setJournalEntries(journalEntries().map(entry => 
      entry.id === id ? { ...entry, ...updates } : entry
    ));
  },


  async deleteJournalEntry(id: string) {

    await journalApi.delete(id);
    const entry = journalEntries().find(e => e.id === id);
    if (entry && entry.status === 'posted') {
      throw new Error('Cannot delete posted journal entries. Void them instead.');
    }
    setJournalEntries(journalEntries().filter(entry => entry.id !== id));
  },

  voidJournalEntry(id: string) {
    this.updateJournalEntry(id, { status: 'void' });
  },

  postJournalEntry(id: string) {
    const entry = journalEntries().find(e => e.id === id);
    if (!entry) throw new Error('Journal entry not found');
    
    // Validate entry
    if (Math.abs(entry.totalDebit - entry.totalCredit) > 0.01) {
      throw new Error('Journal entry is not balanced. Debits must equal credits.');
    }
    
    this.updateJournalEntry(id, { 
      status: 'posted',
      postedAt: new Date().toISOString()
    });

    // Sync with bank consolidation store
    syncEntryBookRecords();
  },

  getJournalEntryById(id: string) {
    return journalEntries().find(entry => entry.id === id);
  },

  getJournalEntriesByStatus(status: JournalEntry['status']) {
    return journalEntries().filter(entry => entry.status === status);
  },

  getJournalEntriesByDateRange(startDate: string, endDate: string) {
    return journalEntries().filter(entry => 
      entry.date >= startDate && entry.date <= endDate
    );
  },

  getJournalEntriesByAccount(accountId: string) {
    return journalEntries().filter(entry =>
      entry.lines.some(line => line.accountId === accountId)
    );
  },

  getNextEntryNumber(): string {
    const year = new Date().getFullYear();
    let st = 'ABCDEFGHIJKLMN';
    const month = new Date().getMonth();
    return `${year}${month}-${st[month]}${generateShortCode(5)}`;
  },

  validateJournalEntry(entry: Partial<JournalEntry>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!entry.date) errors.push('Date is required');
    if (!entry.description) errors.push('Description is required');
    if (!entry.lines || entry.lines.length === 0) errors.push('At least one line item is required');
    
    if (entry.lines) {
      const totalDebit = entry.lines.reduce((sum, line) => sum + (line.debitAmount || 0), 0);
      const totalCredit = entry.lines.reduce((sum, line) => sum + (line.creditAmount || 0), 0);
      
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        errors.push(`Entry is not balanced. Debit: ${totalDebit}, Credit: ${totalCredit}`);
      }
      
      entry.lines.forEach((line, index) => {
        if (!line.accountId) errors.push(`Line ${index + 1}: Account is required`);
        if (line.debitAmount === 0 && line.creditAmount === 0) {
          errors.push(`Line ${index + 1}: Either debit or credit amount must be provided`);
        }
        if (line.debitAmount > 0 && line.creditAmount > 0) {
          errors.push(`Line ${index + 1}: Cannot have both debit and credit amounts`);
        }
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

    // Refresh data
  async refreshData(filters?: {
    store?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    status?: 'draft' | 'posted' | 'void' | 'all';
  }) {
    //devLog(" fetchInvoices {queryString}")
    return this.fetchJournalEntries(filters);
  },


  // Get all journal entries
  async fetchJournalEntries(filters?: {
    store?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    status?: 'draft' | 'posted' | 'void' | 'all';
  }) {
    try {

      //setLoadingStates(prev => ({ ...prev, fetchAll: true }));
      //setInvoiceState('loading', true);
      //setInvoiceState('error', null);
     
      // Build a proper query string for the API
      const queryParts = [];
      
      if (filters?.search) {
        queryParts.push(filters.search);
      }
      
      if (filters?.status && filters.status !== 'all') {
        queryParts.push(filters.status);
      }
      
      // Create the query string - the API expects space-separated terms
      const apiQuery = queryParts.join(' ').trim() || authStore.getBusinessId(); // Default query if empty
      
      const apiResults : any = await journalApi.getAll(apiQuery, filters);

      
      setJournalEntries(apiResults.data);
      setTimeout(() => {
         syncEntryBookRecords();
      }, 450);
     
      
      return []
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch invoices';
      //setInvoiceState('error', errorMessage);
      console.error('Error fetching invoices:', error);
      throw error;
    } finally {
     // setInvoiceState('loading', false);
     // setLoadingStates(prev => ({ ...prev, fetchAll: false }));
    }
  },

  getBankRelatedEntries() {
    return syncEntryBookRecords();
  }
};