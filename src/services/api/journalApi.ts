import { apiService } from '../api';
import { JournalEntry, JournalEntryLine } from '../../modules/journal/stores/entryBookStore';
import {
  GET_JOURNAL_ENTRIES,
  GET_JOURNAL_ENTRY_BY_ID,
  CREATE_JOURNAL_ENTRY,
  UPDATE_JOURNAL_ENTRY,
  DELETE_JOURNAL_ENTRY,
  POST_JOURNAL_ENTRY
} from '../graphql/queries';
import { fetchGraphQL } from '../utils';
import { apiAdapter, journalApi as fakeJournalApi } from '../apiAdapter';

export interface CreateJournalEntryInput {
  entryNumber: string;
  date: string;
  description: string;
  reference?: string;
  createdBy: string;
  lines: CreateJournalEntryLineInput[];
}

export interface CreateJournalEntryLineInput {
  accountId: string;
  accountName: string;
  description?: string;
  debitAmount: number;
  creditAmount: number;
}

export interface UpdateJournalEntryInput extends Partial<CreateJournalEntryInput> {}

export interface JournalEntryFilter {
  status?: 'draft' | 'posted' | 'void';
  accountId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface JournalEntrySort {
  field: 'date' | 'entryNumber' | 'totalDebit' | 'createdAt';
  direction: 'asc' | 'desc';
}

export class JournalApi {
  // Get all journal entries
  async getJournalEntries(filter?: JournalEntryFilter, sort?: JournalEntrySort): Promise<JournalEntry[]> {
    try {
      // Use fake API if in fake mode
      if (apiAdapter.isFakeMode()) {
        return await fakeJournalApi.getAll(filter);
      }

      // Real API implementation
      const response = await fetchGraphQL({
        query: "getAllAccountingEntries",
      });

      return response.journalEntries || [];
    } catch (error) {
      console.error('Error fetching journal entries:', error);
      // Fallback to fake API in hybrid mode
      if (apiAdapter.isHybridMode()) {
        console.warn('Falling back to fake API for journal entries');
        return await fakeJournalApi.getAll(filter);
      }
      throw error;
    }
  }

  // Get journal entry by ID
  async getJournalEntryById(id: string): Promise<JournalEntry | null> {
    try {
      const response = await apiService.graphql<{ journalEntry: JournalEntry }>({
        query: GET_JOURNAL_ENTRY_BY_ID,
        variables: { id }
      });
      return response.journalEntry;
    } catch (error) {
      console.error('Error fetching journal entry:', error);
      throw error;
    }
  }

  // Create new journal entry
  async createJournalEntry(input: CreateJournalEntryInput): Promise<JournalEntry> {
    try {
      // Validate entry balance
      this.validateJournalEntry(input);

      const response = await apiService.graphql<{ createJournalEntry: JournalEntry }>({
        query: CREATE_JOURNAL_ENTRY,
        variables: { input }
      });
      return response.createJournalEntry;
    } catch (error) {
      console.error('Error creating journal entry:', error);
      throw error;
    }
  }

  // Update journal entry
  async updateJournalEntry(id: string, input: UpdateJournalEntryInput): Promise<JournalEntry> {
    try {
      if (input.lines) {
        this.validateJournalEntry(input as CreateJournalEntryInput);
      }

      const response = await apiService.graphql<{ updateJournalEntry: JournalEntry }>({
        query: UPDATE_JOURNAL_ENTRY,
        variables: { id, input }
      });
      return response.updateJournalEntry;
    } catch (error) {
      console.error('Error updating journal entry:', error);
      throw error;
    }
  }

  // Delete journal entry
  async deleteJournalEntry(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiService.graphql<{ deleteJournalEntry: { success: boolean; message: string } }>({
        query: DELETE_JOURNAL_ENTRY,
        variables: { id }
      });
      return response.deleteJournalEntry;
    } catch (error) {
      console.error('Error deleting journal entry:', error);
      throw error;
    }
  }

  // Post journal entry
  async postJournalEntry(id: string): Promise<JournalEntry> {
    try {
      const response = await apiService.graphql<{ postJournalEntry: JournalEntry }>({
        query: POST_JOURNAL_ENTRY,
        variables: { id }
      });
      return response.postJournalEntry;
    } catch (error) {
      console.error('Error posting journal entry:', error);
      throw error;
    }
  }

  // Void journal entry
  async voidJournalEntry(id: string): Promise<JournalEntry> {
    try {
      const response = await this.updateJournalEntry(id, { status: 'void' });
      return response;
    } catch (error) {
      console.error('Error voiding journal entry:', error);
      throw error;
    }
  }

  // Get journal entries by account
  async getJournalEntriesByAccount(accountId: string): Promise<JournalEntry[]> {
    return this.getJournalEntries({ accountId });
  }

  // Get journal entries by date range
  async getJournalEntriesByDateRange(dateFrom: string, dateTo: string): Promise<JournalEntry[]> {
    return this.getJournalEntries({ dateFrom, dateTo });
  }

  // Get journal entries by status
  async getJournalEntriesByStatus(status: 'draft' | 'posted' | 'void'): Promise<JournalEntry[]> {
    return this.getJournalEntries({ status });
  }

  // Search journal entries
  async searchJournalEntries(query: string): Promise<JournalEntry[]> {
    return this.getJournalEntries({ search: query });
  }

  // Get next entry number
  async getNextEntryNumber(): Promise<string> {
    try {
      const entries = await this.getJournalEntries({}, { field: 'entryNumber', direction: 'desc' });
      
      if (entries.length === 0) {
        return 'JE-001';
      }

      const lastEntry = entries[0];
      const lastNumber = parseInt(lastEntry.entryNumber.split('-')[1] || '0');
      const nextNumber = lastNumber + 1;
      
      return `JE-${nextNumber.toString().padStart(3, '0')}`;
    } catch (error) {
      console.error('Error getting next entry number:', error);
      return `JE-${Date.now().toString().slice(-3)}`;
    }
  }

  // Validate journal entry balance
  private validateJournalEntry(input: CreateJournalEntryInput): void {
    const totalDebit = input.lines.reduce((sum, line) => sum + (line.debitAmount || 0), 0);
    const totalCredit = input.lines.reduce((sum, line) => sum + (line.creditAmount || 0), 0);
    
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(`Journal entry is not balanced. Debit: ${totalDebit}, Credit: ${totalCredit}`);
    }

    if (input.lines.length < 2) {
      throw new Error('Journal entry must have at least 2 lines');
    }

    // Validate each line
    input.lines.forEach((line, index) => {
      if (!line.accountId) {
        throw new Error(`Line ${index + 1}: Account is required`);
      }
      if (line.debitAmount === 0 && line.creditAmount === 0) {
        throw new Error(`Line ${index + 1}: Either debit or credit amount must be provided`);
      }
      if (line.debitAmount > 0 && line.creditAmount > 0) {
        throw new Error(`Line ${index + 1}: Cannot have both debit and credit amounts`);
      }
    });
  }

  // Calculate totals
  calculateTotals(lines: JournalEntryLine[]): { totalDebit: number; totalCredit: number; isBalanced: boolean } {
    const totalDebit = lines.reduce((sum, line) => sum + (line.debitAmount || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + (line.creditAmount || 0), 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

    return { totalDebit, totalCredit, isBalanced };
  }
}

// Export singleton instance
export const journalApi = new JournalApi();