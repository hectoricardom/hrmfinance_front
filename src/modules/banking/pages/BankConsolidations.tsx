import { Component, createSignal, createEffect, createMemo, onMount, Show, For } from 'solid-js';
import { Layout } from '../../ui';
import { Card } from '../../ui';
import { Button } from '../../ui';
import { FormSelect } from '../../ui';
import CSVUploadModal from '../components/CSVUploadModal';
import ReconciliationComparisonView from '../components/ReconciliationComparisonView';
import ReconciliationQuickMatchView from '../components/ReconciliationQuickMatchView';
import ReconciliationSplitView from '../components/ReconciliationSplitView';
import ReconciliationTableView from '../components/ReconciliationTableView';
import { bankConsolidationStore, BankAccount, BankStatement, EntryBookRecord } from '../stores/bankConsolidationStore';
import { accountsStore } from '../../accounts';
import { useTranslation } from '../../../translations';
import { authStore } from '../../../stores/authStore';
import { accountsApi } from '../../../services/apiAdapter';

type ReconciliationViewType = 'quick' |  'table' ;
//'quick' | 'split' | 'table' | 'classic';

// LocalStorage key for bank consolidation config
const BANK_CONSOLIDATION_CONFIG_KEY = 'hrmfinance-bank-consolidation-config';

// Interface for stored config
interface BankConsolidationConfig {
  selectedAccountId: string | null;
  selectedView: ReconciliationViewType;
  lastUpdated: string;
}

// Helper to load config from localStorage
const loadConfig = (): BankConsolidationConfig | null => {
  try {
    const stored = localStorage.getItem(BANK_CONSOLIDATION_CONFIG_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading bank consolidation config:', error);
  }
  return null;
};

// Helper to save config to localStorage
const saveConfig = (config: Partial<BankConsolidationConfig>) => {
  try {
    const existing = loadConfig() || {
      selectedAccountId: null,
      selectedView: 'quick' as ReconciliationViewType,
      lastUpdated: new Date().toISOString()
    };
    const updated = { ...existing, ...config, lastUpdated: new Date().toISOString() };
    localStorage.setItem(BANK_CONSOLIDATION_CONFIG_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving bank consolidation config:', error);
  }
};

// Generate available years (current year and past 5 years)
const getAvailableYears = (): number[] => {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let i = 0; i <= 5; i++) {
    years.push(currentYear - i);
  }
  return years;
};

const BankConsolidations: Component = () => {
  const { t } = useTranslation();

  // Load saved config
  const savedConfig = loadConfig();

  // Year selector signal - use authStore for persistence
  const [selectedYear, setSelectedYear] = createSignal<number>(authStore.getSelectedYear());

  const [selectedBankAccount, setSelectedBankAccount] = createSignal<BankAccount | null>(null);

  // Period based on selected year
  const [selectedPeriod, setSelectedPeriod] = createSignal({
    start: `${authStore.getSelectedYear()}-01-01`,
    end: `${authStore.getSelectedYear()}-12-31`
  });

  const [isCSVModalOpen, setIsCSVModalOpen] = createSignal(false);
  const [activeTab, setActiveTab] = createSignal<'overview' | 'reconciliation'>('overview');
  const [allBankAccounts, setAllBankAccounts] = createSignal<BankAccount[]>([]);
  const [reconciliationView, setReconciliationView] = createSignal<ReconciliationViewType>(savedConfig?.selectedView || 'quick');
  const [isLoadingData, setIsLoadingData] = createSignal(false);
  const [isLoading,  setIsLoading] = createSignal(false);

  // Track last fetched values to prevent duplicate fetches
  let lastFetchedAccountId: string | null = null;
  let lastFetchedPeriod: { start: string; end: string } | null = null;

  // Save year to authStore when it changes
  createEffect(() => {
    const year = selectedYear();
    authStore.setSelectedYear(year);
    // Update period when year changes
    setSelectedPeriod({
      start: `${year}-12-01`,
      end: `${year}-12-31`
    });
  });

  // Save config when view changes
  createEffect(() => {
    const view = reconciliationView();
    saveConfig({ selectedView: view });
  });

  // Save config when account changes
  createEffect(() => {
    const account = selectedBankAccount();
    if (account) {
      saveConfig({ selectedAccountId: account.id });
    }
  });

  // Sync bank accounts from accountsStore on mount
  onMount(() => {
    syncBankAccounts();
  });

  // Centralized data fetching - runs when account or period changes
  createEffect(() => {
    const account = selectedBankAccount();
    const period = selectedPeriod();

    if (!account) return;

    const accountId = account.accountId;
    const startDate = period.start;
    const endDate = period.end;

    // Prevent duplicate fetches
    if (lastFetchedAccountId === accountId &&
        lastFetchedPeriod?.start === startDate &&
        lastFetchedPeriod?.end === endDate) {
      return;
    }

    lastFetchedAccountId = accountId;
    lastFetchedPeriod = { start: startDate, end: endDate };

    setIsLoadingData(true);

    // Fetch both bank statements and entry book records from API in parallel
    (async () => {
      try {
        await Promise.all([
          bankConsolidationStore.fetchBankStatementsFromAPI(accountId, startDate, endDate),
          bankConsolidationStore.fetchEntryBookRecordsFromAPI(accountId, startDate, endDate)
        ]);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setIsLoadingData(false);
      }
    })();
  });

  const parseDate = (v:any):number => new Date(v).getTime()

  // Memoized bank statements filtered by account and period
  const bankStatements = createMemo(() => {
    const account = selectedBankAccount();
   
    const period = selectedPeriod();
    if (!account) return [];

    //console.log("bankStatements", bankConsolidationStore.bankStatements)
    let start = new Date(period.start).getTime();
    let end = new Date(period.end).getTime();

    return bankConsolidationStore.bankStatements
      .filter(s =>
        s.accountId === account.accountId
        && parseDate(s.date) >= start 
        && parseDate(s.date) <= end
      );
  });


  
  // Memoized entry book records filtered by account and period
  const entryBookRecords = createMemo(() => {
    const account = selectedBankAccount();
    const period = selectedPeriod();
    if (!account) return [];

    let start = new Date(period.start).getTime();
    let end = new Date(period.end).getTime();


    console.log(bankConsolidationStore.entryBookRecords)
    return bankConsolidationStore.entryBookRecords
      .filter(r =>
        r.accountId === account.accountId 
        && parseDate(r.date) >= start 
        && parseDate(r.date) <= end
      );
  });

  // Function to merge bank accounts from both stores
  const syncBankAccounts = async () => {

      setIsLoading(true)
      let qry =  authStore.getBusinessId()
      let acns  = await accountsApi.getAlls(qry);

      //console.log("acns", acns)
      let bln  = await accountsApi.getBalances();


      accountsStore.updAccountBalance(bln)

      accountsStore.updAccount(acns);
      setIsLoading(false)

    const bankAccountsFromAccounts = accountsStore.getBankAccounts();
    const bankAccountsFromConsolidation = bankConsolidationStore.bankAccounts;

    // Convert AccountingAccount (with isBankAccount) to BankAccount format
    const convertedAccounts: BankAccount[] = bankAccountsFromAccounts.map(acc => ({
      id: acc.id,
      accountId: acc.id,
      bankName: acc.bankName || 'Unknown Bank',
      accountNumber: acc.bankAccountNumber || acc.accountNumber,
      accountType: acc.bankAccountType || 'checking',
      currency: acc.currency || 'USD',
      currentBalance: acc.balance || 0,
      isActive: acc.isActive
    }));

    // Merge and deduplicate - prefer bankConsolidationStore accounts if they share the same accountId
    const accountIdMap = new Map<string, BankAccount>();

    // Add bankConsolidationStore accounts first (higher priority)
    bankAccountsFromConsolidation.forEach(acc => {
      accountIdMap.set(acc.accountId, acc);
    });

    // Add converted accounts only if not already present
    convertedAccounts.forEach(acc => {
      if (!accountIdMap.has(acc.accountId)) {
        accountIdMap.set(acc.accountId, acc);
      }
    });

    setAllBankAccounts(Array.from(accountIdMap.values()));
  };

  createEffect(() => {
    // Auto-select bank account: prefer saved config, fallback to first account
    if (!selectedBankAccount() && allBankAccounts().length > 0) {
      const savedConfig = loadConfig();
      if (savedConfig?.selectedAccountId) {
        const savedAccount = allBankAccounts().find(acc => acc.id === savedConfig.selectedAccountId);
        if (savedAccount) {
          setSelectedBankAccount(savedAccount);
          return;
        }
      }
      // Fallback to first account
      setSelectedBankAccount(allBankAccounts()[0]);
    }
  });

  const headerStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '2rem'
  };

  const controlsStyle = {
    display: 'flex',
    gap: '1rem',
    'align-items': 'center',
    'margin-bottom': '2rem',
    padding: '1.5rem',
    background: 'var(--surface-color)',
    'border-radius': 'var(--border-radius)',
    border: '1px solid var(--border-color)'
  };

  const tabsStyle = {
    display: 'flex',
    'border-bottom': '1px solid var(--border-color)',
    'margin-bottom': '2rem'
  };

  const tabStyle = (isActive: boolean) => ({
    padding: '1rem 2rem',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    'font-weight': '500',
    color: isActive ? 'var(--primary-color)' : 'var(--text-muted)',
    'border-bottom': isActive ? '2px solid var(--primary-color)' : '2px solid transparent',
    transition: 'all 0.2s ease'
  });

  const overviewGridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1.5rem',
    'margin-bottom': '2rem'
  };

  const accountCardStyle = {
    padding: '1.5rem',
    background: 'var(--surface-color)',
    'border-radius': 'var(--border-radius)',
    border: '1px solid var(--border-color)',
    transition: 'all 0.2s ease'
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getBankAccountOptions = () => {
    const accounts = allBankAccounts();
    if (accounts.length === 0) {
      return [];
    }
    return accounts.map(account => ({
      value: account.id,
      label: `${account.bankName} - ${account.accountNumber} (${account.accountType})`
    }));
  };

  const getReconciliationStats = () => {
    if (!selectedBankAccount()) return null;

    const bankStatements = bankConsolidationStore.getBankStatementsByAccount(selectedBankAccount()!.accountId)
      .filter(s => s.date >= selectedPeriod().start && s.date <= selectedPeriod().end);
    const entryBookRecords = bankConsolidationStore.getEntryBookRecordsByAccount(selectedBankAccount()!.accountId)
      .filter(r => r.date >= selectedPeriod().start && r.date <= selectedPeriod().end);

    const reconciledStatements = bankStatements.filter(s => s.isReconciled).length;
    const reconciledRecords = entryBookRecords.filter(r => r.isReconciled).length;

    return {
      totalBankTransactions: bankStatements.length,
      totalEntryBookRecords: entryBookRecords.length,
      reconciledTransactions: reconciledStatements,
      unreconciledTransactions: bankStatements.length - reconciledStatements,
      reconciliationRate: bankStatements.length > 0 ? (reconciledStatements / bankStatements.length) * 100 : 0
    };
  };

  const stats = getReconciliationStats();

  return (
    <Layout title={t('banking.title')}>
      <div style={headerStyle}>
        <div>
          <h2 style={{ margin: '0 0 0.5rem 0', 'font-size': '1.5rem' }}>{t('banking.reconciliation')}</h2>
          <p style={{ margin: '0', color: 'var(--text-muted)' }}>{t('banking.compareStatements')}</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Button
            variant="secondary"
            onClick={() => setIsCSVModalOpen(true)}
            disabled={!selectedBankAccount()}
          >
{t('banking.importCSV')}
          </Button>
          <Button variant="primary">
{t('banking.startNewReconciliation')}
          </Button>
        </div>
      </div>

      <div style={controlsStyle}>
        
        <div style={{ flex: '1' }}>
          <label style={{ display: 'block', 'margin-bottom': '0.5rem', 'font-weight': '500' }}>
            {t('banking.bankAccount')}
          </label>
          {allBankAccounts().length === 0 ? (
            <div>
            <Show when={isLoading()}
              fallback={
                <div style={{
                  padding: '0.75rem',
                  background: 'var(--warning-bg, #fff3cd)',
                  border: '1px solid var(--warning-border, #ffc107)',
                  'border-radius': 'var(--border-radius-sm)',
                  color: 'var(--warning-text, #856404)'
                }}>
                  {t('accounts.noBankAccountsFound')}
                </div>
              }
            > 
              <div style={{display: 'flex'}}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '3px solid var(--border-color)',
                  'border-top-color': 'var(--primary-color)',
                  'border-radius': '50%',
                  animation: 'spin 1s linear infinite',
                }} />
                <span style={{
                  
                  color:  '#757575',
                  padding: '0.2rem 0.85rem',
                  'border-radius': '4px',
                  'font-size': '0.75rem',
                  'font-weight': '600'
                }}>
                    { 'Buscando Cuentas...'}
                </span>
              </div>
            </Show>
              
            </div>
          ) : (
            <FormSelect
              label=""
              value={selectedBankAccount()?.id || ''}
              onChange={(value) => {
                const account = allBankAccounts().find(acc => acc.id === value);
                setSelectedBankAccount(account || null);
              }}
              options={getBankAccountOptions()}
            />
          )}
        </div>
        <div>
          <label style={{ display: 'block', 'margin-bottom': '0.5rem', 'font-weight': '500' }}>
{t('entryBooks.startDate')}
          </label>
          <input
            type="date"
            value={selectedPeriod().start}
            onChange={(e) => setSelectedPeriod(prev => ({ ...prev, start: e.target.value }))}
            style={{
              padding: '0.75rem',
              border: '1px solid var(--border-color)',
              'border-radius': 'var(--border-radius-sm)',
              'font-family': 'inherit'
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', 'margin-bottom': '0.5rem', 'font-weight': '500' }}>
{t('entryBooks.endDate')}
          </label>
          <input
            type="date"
            value={selectedPeriod().end}
            onChange={(e) => setSelectedPeriod(prev => ({ ...prev, end: e.target.value }))}
            style={{
              padding: '0.75rem',
              border: '1px solid var(--border-color)',
              'border-radius': 'var(--border-radius-sm)',
              'font-family': 'inherit'
            }}
          />
        </div>
      </div>

      <div style={tabsStyle}>
        <button
          style={tabStyle(activeTab() === 'overview')}
          onClick={() => setActiveTab('overview')}
        >
{t('common.overview')}
        </button>
        <button
          style={tabStyle(activeTab() === 'reconciliation')}
          onClick={() => setActiveTab('reconciliation')}
        >
{t('banking.reconciliation')}
        </button>
      </div>

      {activeTab() === 'overview' && (
        <div>
          {selectedBankAccount() && (
            <div style={overviewGridStyle}>
              <Card title={t('banking.bankAccountInfo')} subtitle={t('banking.currentAccountDetails')}>
                <div style={{ 'margin-bottom': '1rem' }}>
                  <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem' }}>
                    {selectedBankAccount()!.bankName}
                  </div>
                  <div style={{ color: 'var(--text-muted)', 'margin-bottom': '0.5rem' }}>
                    {selectedBankAccount()!.accountNumber} • {selectedBankAccount()!.accountType}
                  </div>
                  <div style={{ 'font-size': '1.25rem', 'font-weight': '600', color: 'var(--primary-color)' }}>
                    {formatCurrency(selectedBankAccount()!.currentBalance)}
                  </div>
                </div>
                {selectedBankAccount()!.lastReconciledDate && (
                  <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                    {t('banking.lastReconciled')}: {formatDate(selectedBankAccount()!.lastReconciledDate)}
                  </div>
                )}
              </Card>

              {stats && (
                <>
                  <Card title={t('banking.bankTransactions')} subtitle={t('banking.selectedPeriod')}>
                    <div style={{ 'font-size': '1.5rem', 'font-weight': '600', color: 'var(--primary-color)', 'margin-bottom': '0.5rem' }}>
                      {stats.totalBankTransactions}
                    </div>
                    <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                      {stats.reconciledTransactions} {t('banking.reconciled')} • {stats.unreconciledTransactions} {t('banking.pending')}
                    </div>
                  </Card>

                  <Card title={t('entryBooks.entryBookRecords')} subtitle={t('banking.selectedPeriod')}>
                    <div style={{ 'font-size': '1.5rem', 'font-weight': '600', color: 'var(--primary-color)', 'margin-bottom': '0.5rem' }}>
                      {stats.totalEntryBookRecords}
                    </div>
                    <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                      {t('banking.bookEntriesForComparison')}
                    </div>
                  </Card>

                  <Card title={t('banking.reconciliationRate')} subtitle={t('banking.completionStatus')}>
                    <div style={{ 'font-size': '1.5rem', 'font-weight': '600', color: stats.reconciliationRate > 80 ? '#4caf50' : stats.reconciliationRate > 50 ? '#ff9800' : '#f44336', 'margin-bottom': '0.5rem' }}>
                      {Math.round(stats.reconciliationRate)}%
                    </div>
                    <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                      {stats.reconciledTransactions} of {stats.totalBankTransactions} transactions
                    </div>
                  </Card>
                </>
              )}
            </div>
          )}

          <Card title={t('banking.recentReconciliationSessions')} subtitle={t('banking.latestActivity')}>
            <div style={{ 'text-align': 'center', color: 'var(--text-muted)', padding: '2rem' }}>
              {t('banking.noRecentSessions')}
              <br />
              <Button 
                variant="primary" 
                style={{ 'margin-top': '1rem' }}
                onClick={() => setActiveTab('reconciliation')}
              >
                {t('banking.startFirstReconciliation')}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {activeTab() === 'reconciliation' && selectedBankAccount() && (
        <div>
          {/* View Selector */}
          <div style={{
            display: 'flex',
            'justify-content': 'center',
            gap: '0.5rem',
            'margin-bottom': '1.5rem',
            padding: '0.75rem',
            background: 'var(--gray-50)',
            'border-radius': '12px'
          }}>
            <button
              onClick={() => setReconciliationView('quick')}
              style={{
                padding: '0.75rem 1.25rem',
                border: 'none',
                'border-radius': '8px',
                cursor: 'pointer',
                background: reconciliationView() === 'quick' ? 'var(--primary-color)' : 'transparent',
                color: reconciliationView() === 'quick' ? 'white' : 'var(--text-color)',
                'font-weight': '500',
                display: 'flex',
                'flex-direction': 'column',
                'align-items': 'center',
                gap: '0.25rem',
                transition: 'all 0.2s'
              }}
            >
              <span style={{ 'font-size': '1.25rem' }}>📱</span>
              <span style={{ 'font-size': '0.8rem' }}>{t('banking.quickView', 'Rápida')}</span>
            </button>
            
            <button
              onClick={() => setReconciliationView('table')}
              style={{
                padding: '0.75rem 1.25rem',
                border: 'none',
                'border-radius': '8px',
                cursor: 'pointer',
                background: reconciliationView() === 'table' ? 'var(--primary-color)' : 'transparent',
                color: reconciliationView() === 'table' ? 'white' : 'var(--text-color)',
                'font-weight': '500',
                display: 'flex',
                'flex-direction': 'column',
                'align-items': 'center',
                gap: '0.25rem',
                transition: 'all 0.2s'
              }}
            >
              <span style={{ 'font-size': '1.25rem' }}>📊</span>
              <span style={{ 'font-size': '0.8rem' }}>{t('banking.tableView', 'Tabla')}</span>
            </button>
          </div>

          {/* View Description */}
          <div style={{
            'text-align': 'center',
            'margin-bottom': '1rem',
            'font-size': '0.85rem',
            color: 'var(--text-muted)'
          }}>
            <Show when={reconciliationView() === 'quick'}>
              💡 {t('banking.quickViewDesc', 'Ideal para móvil. Una transacción a la vez con coincidencias sugeridas.')}
            </Show>
           
            <Show when={reconciliationView() === 'table'}>
              💡 {t('banking.tableViewDesc', 'Para usuarios avanzados. Tabla unificada con filtros y acciones masivas.')}
            </Show>
           
          </div>

          {/* Loading indicator */}
          <Show when={isLoadingData()}>
            <div style={{
              display: 'flex',
              'justify-content': 'center',
              'align-items': 'center',
              padding: '2rem',
              color: 'var(--text-muted)'
            }}>
              <span style={{ 'margin-right': '0.5rem' }}>⏳</span>
              {t('common.loading', 'Cargando datos...')}
            </div>
          </Show>

          {/* Render selected view - pass data from parent */}
          <Show when={!isLoadingData()}>
            <Show when={reconciliationView() === 'quick'}>
              <ReconciliationQuickMatchView
                bankAccountId={selectedBankAccount()!.accountId}
                selectedPeriod={selectedPeriod()}
                bankStatements={bankStatements()}
                entryBookRecords={entryBookRecords()}
              />
            </Show>
            
            <Show when={reconciliationView() === 'table'}>
              <ReconciliationTableView
                bankAccountId={selectedBankAccount()!.accountId}
                selectedPeriod={selectedPeriod()}
                bankStatements={bankStatements()}
                entryBookRecords={entryBookRecords()}
              />
            </Show>
            
          </Show>
        </div>
      )}

      <CSVUploadModal
        isOpen={isCSVModalOpen()}
        onClose={() => setIsCSVModalOpen(false)}
        bankAccount={selectedBankAccount()}
      />
    </Layout>
  );
};

export default BankConsolidations;





/*


queryStore.register('getBankConsolidations', bankConsolidationsConnector.getBankConsolidations)
  queryStore.register('getBankConsolidationById', bankConsolidationsConnector.getBankConsolidationById)
  queryStore.register('getAllBankConsolidations', bankConsolidationsConnector.getAllBankConsolidations)
  queryStore.register('addBankConsolidation', bankConsolidationsConnector.addBankConsolidation)
  queryStore.register('addBankConsolidationVerify', bankConsolidationsConnector.addBankConsolidationVerify)
  queryStore.register('updateBankConsolidation', async (body: any) => bankConsolidationsConnector.updateBankConsolidation(body))
  queryStore.register('deleteBankConsolidation', bankConsolidationsConnector.deleteBankConsolidation)
  queryStore.register('searchBankConsolidations', bankConsolidationsConnector.searchBankConsolidations)
  queryStore.register('getBankConsolidationsByDateRange', bankConsolidationsConnector.getBankConsolidationsByDateRange)
  queryStore.register('getBankConsolidationsByStatus', bankConsolidationsConnector.getBankConsolidationsByStatus)


*/