import { apiService } from '../api';
import { BankStatement } from '../../modules/banking/stores/bankingStore';
import {
  GET_BANK_STATEMENTS,
  RECONCILE_TRANSACTION
} from '../graphql/queries';
import { convertToCSV as convertToCSVUtil } from '../../utils/csvUtils';

export interface BankStatementFilter {
  accountId?: string;
  dateFrom?: string;
  dateTo?: string;
  isReconciled?: boolean;
  amountFrom?: number;
  amountTo?: number;
  search?: string;
}

export interface BankStatementSort {
  field: 'date' | 'description' | 'debitAmount' | 'creditAmount' | 'balance';
  direction: 'asc' | 'desc';
}

export interface ReconciliationSummary {
  totalTransactions: number;
  reconciledTransactions: number;
  unreconciledTransactions: number;
  totalDebits: number;
  totalCredits: number;
  reconciledDebits: number;
  reconciledCredits: number;
  unreconciledDebits: number;
  unreconciledCredits: number;
}

export interface BankAccount {
  id: string;
  accountNumber: string;
  accountName: string;
  bankName: string;
  accountType: 'checking' | 'savings' | 'credit' | 'loan';
  balance: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export class BankingApi {
  // Get bank statements
  async getBankStatements(filter?: BankStatementFilter, sort?: BankStatementSort): Promise<BankStatement[]> {
    try {
      const response = await apiService.graphql<{ bankStatements: BankStatement[] }>({
        query: GET_BANK_STATEMENTS,
        variables: { filter, sort }
      });
      return response.bankStatements;
    } catch (error) {
      console.error('Error fetching bank statements:', error);
      throw error;
    }
  }

  // Get bank statements by account
  async getBankStatementsByAccount(accountId: string): Promise<BankStatement[]> {
    return this.getBankStatements({ accountId });
  }

  // Get bank statements by date range
  async getBankStatementsByDateRange(dateFrom: string, dateTo: string): Promise<BankStatement[]> {
    return this.getBankStatements({ dateFrom, dateTo });
  }

  // Get unreconciled transactions
  async getUnreconciledTransactions(accountId?: string): Promise<BankStatement[]> {
    return this.getBankStatements({ accountId, isReconciled: false });
  }

  // Get reconciled transactions
  async getReconciledTransactions(accountId?: string): Promise<BankStatement[]> {
    return this.getBankStatements({ accountId, isReconciled: true });
  }

  // Reconcile transaction
  async reconcileTransaction(bankStatementId: string, journalEntryLineId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiService.graphql<{ reconcileTransaction: { success: boolean; message: string } }>({
        query: RECONCILE_TRANSACTION,
        variables: { bankStatementId, journalEntryLineId }
      });
      return response.reconcileTransaction;
    } catch (error) {
      console.error('Error reconciling transaction:', error);
      throw error;
    }
  }

  // Bulk reconcile transactions
  async bulkReconcileTransactions(reconciliations: Array<{ bankStatementId: string; journalEntryLineId: string }>): Promise<{
    successful: number;
    failed: number;
    errors: string[];
  }> {
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const reconciliation of reconciliations) {
      try {
        await this.reconcileTransaction(reconciliation.bankStatementId, reconciliation.journalEntryLineId);
        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push(error instanceof Error ? error.message : 'Unknown error');
      }
    }

    return results;
  }

  // Unreconcile transaction
  async unreconcileTransaction(bankStatementId: string): Promise<{ success: boolean; message: string }> {
    try {
      // This would typically be a separate mutation
      // For now, we'll simulate it by calling reconcile with null
      const response = await apiService.graphql<{ reconcileTransaction: { success: boolean; message: string } }>({
        query: RECONCILE_TRANSACTION,
        variables: { bankStatementId, journalEntryLineId: null }
      });
      return response.reconcileTransaction;
    } catch (error) {
      console.error('Error unreconciling transaction:', error);
      throw error;
    }
  }

  // Get reconciliation summary
  async getReconciliationSummary(accountId?: string, dateFrom?: string, dateTo?: string): Promise<ReconciliationSummary> {
    try {
      const statements = await this.getBankStatements({
        accountId,
        dateFrom,
        dateTo
      });

      const summary: ReconciliationSummary = {
        totalTransactions: statements.length,
        reconciledTransactions: 0,
        unreconciledTransactions: 0,
        totalDebits: 0,
        totalCredits: 0,
        reconciledDebits: 0,
        reconciledCredits: 0,
        unreconciledDebits: 0,
        unreconciledCredits: 0
      };

      statements.forEach(statement => {
        // Count transactions
        if (statement.isReconciled) {
          summary.reconciledTransactions++;
        } else {
          summary.unreconciledTransactions++;
        }

        // Calculate totals
        if (statement.debitAmount > 0) {
          summary.totalDebits += statement.debitAmount;
          if (statement.isReconciled) {
            summary.reconciledDebits += statement.debitAmount;
          } else {
            summary.unreconciledDebits += statement.debitAmount;
          }
        }

        if (statement.creditAmount > 0) {
          summary.totalCredits += statement.creditAmount;
          if (statement.isReconciled) {
            summary.reconciledCredits += statement.creditAmount;
          } else {
            summary.unreconciledCredits += statement.creditAmount;
          }
        }
      });

      return summary;
    } catch (error) {
      console.error('Error getting reconciliation summary:', error);
      throw error;
    }
  }

  // Search bank statements
  async searchBankStatements(query: string, accountId?: string): Promise<BankStatement[]> {
    return this.getBankStatements({ search: query, accountId });
  }

  // Get bank statements by amount range
  async getBankStatementsByAmountRange(amountFrom: number, amountTo: number, accountId?: string): Promise<BankStatement[]> {
    return this.getBankStatements({ amountFrom, amountTo, accountId });
  }

  // Import bank statements (CSV format)
  async importBankStatements(file: File, accountId: string): Promise<{
    imported: number;
    errors: string[];
    duplicates: number;
  }> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('accountId', accountId);

      // This would typically be a REST endpoint for file upload
      const response = await apiService.post<{
        imported: number;
        errors: string[];
        duplicates: number;
      }>('/import/bank-statements', formData, {
        'Content-Type': 'multipart/form-data'
      });

      return response;
    } catch (error) {
      console.error('Error importing bank statements:', error);
      throw error;
    }
  }

  // Export bank statements
  async exportBankStatements(filter?: BankStatementFilter, format: 'csv' | 'excel' = 'csv'): Promise<Blob> {
    try {
      const statements = await this.getBankStatements(filter);
      
      if (format === 'csv') {
        const csvContent = this.convertToCSV(statements);
        return new Blob([csvContent], { type: 'text/csv' });
      } else {
        // For Excel export, you'd typically use a library like xlsx
        throw new Error('Excel export not implemented');
      }
    } catch (error) {
      console.error('Error exporting bank statements:', error);
      throw error;
    }
  }

  // Auto-match transactions
  async autoMatchTransactions(accountId: string, tolerance: number = 0.01): Promise<{
    matches: Array<{ bankStatementId: string; journalEntryLineId: string; confidence: number }>;
    unmatched: string[];
  }> {
    try {
      const bankStatements = await this.getUnreconciledTransactions(accountId);
      
      // This would typically call a separate API endpoint that uses ML or rule-based matching
      // For now, we'll return a simple structure
      const matches: Array<{ bankStatementId: string; journalEntryLineId: string; confidence: number }> = [];
      const unmatched: string[] = bankStatements.map(stmt => stmt.id);

      return { matches, unmatched };
    } catch (error) {
      console.error('Error auto-matching transactions:', error);
      throw error;
    }
  }

  // Generate reconciliation report
  async generateReconciliationReport(accountId: string, dateFrom: string, dateTo: string): Promise<{
    summary: ReconciliationSummary;
    statements: BankStatement[];
    unreconciledItems: BankStatement[];
    reportDate: string;
  }> {
    try {
      const [summary, statements] = await Promise.all([
        this.getReconciliationSummary(accountId, dateFrom, dateTo),
        this.getBankStatements({ accountId, dateFrom, dateTo })
      ]);

      const unreconciledItems = statements.filter(stmt => !stmt.isReconciled);

      return {
        summary,
        statements,
        unreconciledItems,
        reportDate: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error generating reconciliation report:', error);
      throw error;
    }
  }

  // Convert bank statements to CSV format (using proper escaping for commas in strings)
  private convertToCSV(statements: BankStatement[]): string {
    const headers = ['Date', 'Description', 'Reference', 'Debit', 'Credit', 'Balance', 'Reconciled'];
    const rows = statements.map(stmt => [
      stmt.date,
      stmt.description,
      stmt.reference || '',
      stmt.debitAmount,
      stmt.creditAmount,
      stmt.balance,
      stmt.isReconciled ? 'Yes' : 'No'
    ]);

    // Use the CSV utility that properly handles commas, quotes, and newlines in strings
    return convertToCSVUtil(rows, headers);
  }

  // Validate bank statement data
  private validateBankStatement(statement: Partial<BankStatement>): void {
    if (!statement.date) {
      throw new Error('Date is required');
    }

    if (!statement.description?.trim()) {
      throw new Error('Description is required');
    }

    if (!statement.accountId) {
      throw new Error('Account ID is required');
    }

    if (statement.debitAmount === undefined && statement.creditAmount === undefined) {
      throw new Error('Either debit or credit amount must be provided');
    }

    if ((statement.debitAmount || 0) < 0 || (statement.creditAmount || 0) < 0) {
      throw new Error('Amounts cannot be negative');
    }
  }
}

// Export singleton instance
export const bankingApi = new BankingApi();