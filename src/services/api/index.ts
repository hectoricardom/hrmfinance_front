// API Service Layer - Export all API handlers
export { apiService, isLoading, apiError } from '../api';
export type { ApiResponse, GraphQLRequest } from '../api';

// Account API
export { accountsApi } from './accountsApi';
export type {
  CreateAccountInput,
  UpdateAccountInput,
  AccountFilter,
  AccountSort
} from './accountsApi';

// Journal API
export { journalApi } from './journalApi';
export type {
  CreateJournalEntryInput,
  CreateJournalEntryLineInput,
  UpdateJournalEntryInput,
  JournalEntryFilter,
  JournalEntrySort
} from './journalApi';

// Employee API
export { employeesApi } from './employeesApi';
export type {
  CreateEmployeeInput,
  UpdateEmployeeInput,
  EmployeeFilter,
  EmployeeSort
} from './employeesApi';

// Inventory API
export { inventoryApi } from './inventoryApi';
export type {
  CreateInventoryItemInput,
  UpdateInventoryItemInput,
  InventoryFilter,
  InventorySort,
  StockMovement
} from './inventoryApi';

// Banking API
export { bankingApi } from './bankingApi';
export type {
  BankStatementFilter,
  BankStatementSort,
  ReconciliationSummary,
  BankAccount
} from './bankingApi';

// Event Rules API
import { eventRulesApi } from './eventRulesApi';
export { eventRulesApi } from './eventRulesApi';

// Convenience object for all APIs
export const api = {
  accounts: accountsApi,
  journal: journalApi,
  employees: employeesApi,
  inventory: inventoryApi,
  banking: bankingApi,
  eventRules: eventRulesApi
};

// Helper functions for common operations
export const apiHelpers = {
  // Clear all API errors
  clearAllErrors: () => {
    apiService.clearError();
  },

  // Get global loading state
  isAnyLoading: () => {
    return apiService.getLoadingState();
  },

  // Get global error state
  getGlobalError: () => {
    return apiService.getErrorState();
  },

  // Batch operations wrapper
  batchOperations: async <T>(operations: Array<() => Promise<T>>): Promise<T[]> => {
    const results: T[] = [];
    const errors: Error[] = [];

    for (const operation of operations) {
      try {
        const result = await operation();
        results.push(result);
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error('Unknown error'));
      }
    }

    if (errors.length > 0) {
      throw new Error(`Batch operation failed: ${errors.map(e => e.message).join(', ')}`);
    }

    return results;
  },

  // Retry wrapper for failed operations
  retry: async <T>(operation: () => Promise<T>, maxRetries: number = 3, delay: number = 1000): Promise<T> => {
    let lastError: Error;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i))); // Exponential backoff
        }
      }
    }

    throw lastError!;
  }
};