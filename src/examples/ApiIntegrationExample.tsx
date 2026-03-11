import { Component, createSignal, createEffect, For, Show } from 'solid-js';
import { accountsApiStore } from '../modules/accounts/stores/accountsApiStore';
import { journalApi } from '../services/api/journalApi';
import { employeesApi } from '../services/api/employeesApi';
import { inventoryApi } from '../services/api/inventoryApi';
import { bankingApi } from '../services/api/bankingApi';
import { apiService, isLoading, apiError } from '../services/api';
import { useTranslation } from '../i18n';

interface ApiExampleProps {}

export const ApiIntegrationExample: Component<ApiExampleProps> = () => {
  const { t } = useTranslation();
  
  // Local component state
  const [selectedModule, setSelectedModule] = createSignal<string>('accounts');
  const [operationResult, setOperationResult] = createSignal<any>(null);
  const [operationError, setOperationError] = createSignal<string | null>(null);

  // Initialize accounts store on component mount
  createEffect(() => {
    accountsApiStore.initialize();
  });

  // Example: Create a new account
  const createAccountExample = async () => {
    try {
      setOperationError(null);
      
      const newAccount = await accountsApiStore.createAccount({
        accountNumber: '1999',
        name: 'Test Account',
        type: 'Asset',
        category: 'Current Assets',
        description: 'Test account created via API',
        balance: 1000.00,
        isActive: true
      });
      
      setOperationResult(newAccount);
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'Failed to create account');
    }
  };

  // Example: Create a journal entry
  const createJournalEntryExample = async () => {
    try {
      setOperationError(null);
      
      const entryNumber = await journalApi.getNextEntryNumber();
      
      const newEntry = await journalApi.createJournalEntry({
        entryNumber,
        date: new Date().toISOString().split('T')[0],
        description: 'Test journal entry via API',
        reference: 'TEST-001',
        createdBy: 'System',
        lines: [
          {
            accountId: '1',
            accountName: 'Cash',
            description: 'Cash debit',
            debitAmount: 500.00,
            creditAmount: 0
          },
          {
            accountId: '10',
            accountName: 'Sales Revenue',
            description: 'Revenue credit',
            debitAmount: 0,
            creditAmount: 500.00
          }
        ]
      });
      
      setOperationResult(newEntry);
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'Failed to create journal entry');
    }
  };

  // Example: Create an employee
  const createEmployeeExample = async () => {
    try {
      setOperationError(null);
      
      const employeeId = await employeesApi.generateNextEmployeeId();
      
      const newEmployee = await employeesApi.createEmployee({
        employeeId,
        fullName: 'John Doe',
        position: 'Developer',
        department: 'IT',
        email: 'john.doe@company.com',
        phone: '+1234567890',
        salary: 75000,
        hireDate: new Date().toISOString().split('T')[0],
        isActive: true
      });
      
      setOperationResult(newEmployee);
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'Failed to create employee');
    }
  };

  // Example: Create an inventory item
  const createInventoryItemExample = async () => {
    try {
      setOperationError(null);
      
      const productCode = await inventoryApi.generateNextProductCode('Electronics');
      
      const newItem = await inventoryApi.createInventoryItem({
        productCode,
        productName: 'Test Product',
        sku: 'TEST-001',
        description: 'Test product created via API',
        category: 'Electronics',
        unitOfMeasure: 'pcs',
        unitCost: 25.00,
        quantity: 100,
        minStockLevel: 10,
        maxStockLevel: 500,
        locationId: 'LOC001',
        locationName: 'Main Warehouse',
        isActive: true
      });
      
      setOperationResult(newItem);
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'Failed to create inventory item');
    }
  };

  // Example: Get reconciliation summary
  const getReconciliationSummaryExample = async () => {
    try {
      setOperationError(null);
      
      const summary = await bankingApi.getReconciliationSummary();
      
      setOperationResult(summary);
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'Failed to get reconciliation summary');
    }
  };

  // Example: Search operations
  const searchExample = async () => {
    try {
      setOperationError(null);
      
      const results = await Promise.allSettled([
        accountsApiStore.searchAccounts('cash'),
        employeesApi.searchEmployees('john'),
        inventoryApi.searchInventory('electronics')
      ]);
      
      const searchResults = {
        accounts: results[0].status === 'fulfilled' ? results[0].value : [],
        employees: results[1].status === 'fulfilled' ? results[1].value : [],
        inventory: results[2].status === 'fulfilled' ? results[2].value : []
      };
      
      setOperationResult(searchResults);
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'Search failed');
    }
  };

  // Example: Batch operations
  const batchOperationsExample = async () => {
    try {
      setOperationError(null);
      
      // Get multiple data types in parallel
      const [accounts, employees, inventory] = await Promise.all([
        accountsApiStore.fetchAccounts({ isActive: true }),
        employeesApi.getActiveEmployees(),
        inventoryApi.getLowStockItems()
      ]);
      
      const batchResult = {
        activeAccounts: accounts.length,
        activeEmployees: employees.length,
        lowStockItems: inventory.length,
        totalActiveBalance: accounts.reduce((sum, acc) => sum + acc.balance, 0)
      };
      
      setOperationResult(batchResult);
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'Batch operations failed');
    }
  };

  // Example: Generate reports
  const generateReportsExample = async () => {
    try {
      setOperationError(null);
      
      const [employeeStats, inventoryReport] = await Promise.all([
        employeesApi.getEmployeeStats(),
        inventoryApi.generateInventoryReport()
      ]);
      
      const reportData = {
        employeeStats,
        inventoryReport,
        accountSummary: {
          totalAssets: accountsApiStore.getTotalByTypeFromCache('Asset'),
          totalLiabilities: accountsApiStore.getTotalByTypeFromCache('Liability'),
          totalEquity: accountsApiStore.getTotalByTypeFromCache('Equity'),
          totalRevenue: accountsApiStore.getTotalByTypeFromCache('Revenue'),
          totalExpenses: accountsApiStore.getTotalByTypeFromCache('Expense')
        }
      };
      
      setOperationResult(reportData);
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'Report generation failed');
    }
  };

  const containerStyle = {
    padding: '20px',
    'max-width': '1200px',
    margin: '0 auto'
  };

  const sectionStyle = {
    'margin-bottom': '30px',
    padding: '20px',
    border: '1px solid #ddd',
    'border-radius': '8px',
    'background-color': '#f9f9f9'
  };

  const buttonStyle = {
    padding: '10px 20px',
    margin: '5px',
    'background-color': '#007bff',
    color: 'white',
    border: 'none',
    'border-radius': '4px',
    cursor: 'pointer'
  };

  const errorStyle = {
    color: 'red',
    'background-color': '#ffebee',
    padding: '10px',
    'border-radius': '4px',
    'margin-top': '10px'
  };

  const successStyle = {
    color: 'green',
    'background-color': '#e8f5e8',
    padding: '10px',
    'border-radius': '4px',
    'margin-top': '10px'
  };

  const loadingStyle = {
    color: '#666',
    'font-style': 'italic'
  };

  return (
    <div style={containerStyle}>
      <h1>{t('api.integration.title', 'API Integration Examples')}</h1>
      
      {/* Global Loading and Error States */}
      <div style={sectionStyle}>
        <h2>{t('api.global.status', 'Global API Status')}</h2>
        <Show when={isLoading()}>
          <div style={loadingStyle}>
            {t('api.loading', 'Loading...')}
          </div>
        </Show>
        <Show when={apiError()}>
          <div style={errorStyle}>
            {t('api.error', 'API Error')}: {apiError()}
          </div>
        </Show>
      </div>

      {/* Account Operations */}
      <div style={sectionStyle}>
        <h2>{t('api.accounts.title', 'Account Operations')}</h2>
        <button style={buttonStyle} onClick={createAccountExample}>
          {t('api.accounts.create', 'Create Test Account')}
        </button>
        <button style={buttonStyle} onClick={() => accountsApiStore.refreshAccounts()}>
          {t('api.accounts.refresh', 'Refresh Accounts')}
        </button>
        
        <Show when={accountsApiStore.isLoading}>
          <div style={loadingStyle}>
            {t('api.accounts.loading', 'Loading accounts...')}
          </div>
        </Show>
        
        <Show when={accountsApiStore.errorMessage}>
          <div style={errorStyle}>
            {accountsApiStore.errorMessage}
          </div>
        </Show>
        
        <div>
          <h3>{t('api.accounts.cached', 'Cached Accounts')}: {accountsApiStore.accountsList.length}</h3>
          <For each={accountsApiStore.accountsList.slice(0, 5)}>
            {(account) => (
              <div style={{ padding: '5px', 'border-bottom': '1px solid #eee' }}>
                {account.accountNumber} - {account.name} ({account.type})
              </div>
            )}
          </For>
        </div>
      </div>

      {/* Journal Operations */}
      <div style={sectionStyle}>
        <h2>{t('api.journal.title', 'Journal Operations')}</h2>
        <button style={buttonStyle} onClick={createJournalEntryExample}>
          {t('api.journal.create', 'Create Test Journal Entry')}
        </button>
      </div>

      {/* Employee Operations */}
      <div style={sectionStyle}>
        <h2>{t('api.employees.title', 'Employee Operations')}</h2>
        <button style={buttonStyle} onClick={createEmployeeExample}>
          {t('api.employees.create', 'Create Test Employee')}
        </button>
      </div>

      {/* Inventory Operations */}
      <div style={sectionStyle}>
        <h2>{t('api.inventory.title', 'Inventory Operations')}</h2>
        <button style={buttonStyle} onClick={createInventoryItemExample}>
          {t('api.inventory.create', 'Create Test Inventory Item')}
        </button>
      </div>

      {/* Banking Operations */}
      <div style={sectionStyle}>
        <h2>{t('api.banking.title', 'Banking Operations')}</h2>
        <button style={buttonStyle} onClick={getReconciliationSummaryExample}>
          {t('api.banking.reconciliation', 'Get Reconciliation Summary')}
        </button>
      </div>

      {/* Advanced Operations */}
      <div style={sectionStyle}>
        <h2>{t('api.advanced.title', 'Advanced Operations')}</h2>
        <button style={buttonStyle} onClick={searchExample}>
          {t('api.advanced.search', 'Multi-Module Search')}
        </button>
        <button style={buttonStyle} onClick={batchOperationsExample}>
          {t('api.advanced.batch', 'Batch Operations')}
        </button>
        <button style={buttonStyle} onClick={generateReportsExample}>
          {t('api.advanced.reports', 'Generate Reports')}
        </button>
      </div>

      {/* Operation Results */}
      <div style={sectionStyle}>
        <h2>{t('api.results.title', 'Operation Results')}</h2>
        
        <Show when={operationError()}>
          <div style={errorStyle}>
            {t('api.results.error', 'Operation Error')}: {operationError()}
          </div>
        </Show>
        
        <Show when={operationResult()}>
          <div style={successStyle}>
            <h3>{t('api.results.success', 'Operation Successful')}</h3>
            <pre style={{ 'white-space': 'pre-wrap', 'word-wrap': 'break-word' }}>
              {JSON.stringify(operationResult(), null, 2)}
            </pre>
          </div>
        </Show>
      </div>

      {/* Clear Results */}
      <div style={sectionStyle}>
        <button 
          style={buttonStyle} 
          onClick={() => {
            setOperationResult(null);
            setOperationError(null);
            apiService.clearError();
          }}
        >
          {t('api.clear', 'Clear Results')}
        </button>
      </div>
    </div>
  );
};

export default ApiIntegrationExample;