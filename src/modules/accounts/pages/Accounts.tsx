import { Component, createSignal, onMount, Show } from 'solid-js';
import { Layout, Button, LazyList, LoadingBar } from '../../ui';
import AccountsOverview from '../components/AccountsOverview';
import AccountCard from '../components/AccountCard';
import AccountHierarchyCard from '../components/AccountHierarchyCard';
import AddAccountModal from '../components/AddAccountModal';
import AddSubAccountModal from '../components/AddSubAccountModal';
import AccountDetailModal from '../components/AccountDetailModal';
import { accountsStore, AccountingAccount } from '../stores/accountsStore';
import { useTranslation } from '../../../translations';
import { accountsApi } from '../../../services/apiAdapter';
import { fetchGraphQLSS } from '../../../services/utils';
import { authStore } from '../../../stores/authStore';

// Layer option types for preloading
interface LayerOption {
  id: string;
  name: string;
  description: string;
  accountType: string;
  defaultSide: 'debit' | 'credit';
  criteriaFields: Array<{
    field: string;
    label: string;
    required: boolean;
    options: Array<{ value: string; label: string }>;
  }>;
}

const Accounts: Component = () => {
  const { t } = useTranslation();
  const [isAddModalOpen, setIsAddModalOpen] = createSignal(false);
  const [isAddSubModalOpen, setIsAddSubModalOpen] = createSignal(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = createSignal(false);
  const [selectedAccount, setSelectedAccount] = createSignal<AccountingAccount | null>(null);
  const [selectedParentAccount, setSelectedParentAccount] = createSignal<AccountingAccount | null>(null);
  const [filterType, setFilterType] = createSignal<AccountingAccount['type'] | 'All'>('All');
  const [viewMode, setViewMode] = createSignal<'flat' | 'hierarchy'>('hierarchy');
  const [searchQuery, setSearchQuery] = createSignal('');
  const [isLoading, setIsLoading] = createSignal(false);

  // Preloaded layer options
  const [layerOptions, setLayerOptions] = createSignal<LayerOption[]>([]);
  const [layerOptionsLoaded, setLayerOptionsLoaded] = createSignal(false);

  // Preload layer options on mount
  const preloadLayerOptions = async () => {
    if (layerOptionsLoaded()) return;
    try {
      const result = await fetchGraphQLSS({
        query: 'getLayerOptions',
        params: { businessId: authStore.getBusinessId() },
        businessId: authStore.getBusinessId()
      });
      const layers = result?.data?.layers || result?.layers || [];
      setLayerOptions(Array.isArray(layers) ? layers : []);
      setLayerOptionsLoaded(true);
    } catch (error) {
      console.error('Error preloading layer options:', error);
    }
  };

  const handleViewAccount = (account: AccountingAccount) => {
    setSelectedAccount(account);
    setIsDetailModalOpen(true);
  };

  const handleAddSubAccount = (parentAccount: AccountingAccount) => {
    setSelectedParentAccount(parentAccount);
    setIsAddSubModalOpen(true);
  };


  

  // Filter function for search
  const matchesSearch = (account: AccountingAccount): boolean => {
    const query = searchQuery()?.toLowerCase()?.trim();
    if (!query) return true;

    
    return (
      account?.name?.toLowerCase()?.includes?.(query) ||
      account?.accountNumber?.includes?.(query) ||
      account?.code?.toLowerCase()?.includes?.(query) ||
      account?.description?.toLowerCase()?.includes?.(query) ||
      account?.category?.toLowerCase()?.includes?.(query)
    );
  };

  const getFilteredAccounts = () => {
    let accounts: any[];
    accounts = viewMode() === 'hierarchy' ? accountsStore.getAccountHierarchy().sort((a:any, b:any)=>a.accountNumber - b.accountNumber) : accountsStore.accounts;


    /** 
    if (filterType() === 'All') {
     
    } else if (viewMode() === 'hierarchy') {
      accounts = accountsStore.getAccountHierarchy()
        .filter(account => account.accountType === filterType());
    } else {
      accounts = accountsStore.getAccountsByType(filterType() as AccountingAccount['type']);
    }

    // Apply search filter
    const query = searchQuery().toLowerCase().trim();
    //if (!query) return accounts;

    if (viewMode() === '7hierarchyh') {
      // For hierarchy view, filter parent accounts and their sub-accounts
      return accounts
        .map(parent => ({
          ...parent,
          subAccounts: parent.subAccounts?.filter((sub: AccountingAccount) => matchesSearch(sub)) || []
        }))
        .filter(parent => matchesSearch(parent) || parent.subAccounts.length > 0);
    }
    */
    return accounts;
  };


  const accountsGridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '1.5rem',
    'margin-bottom': '2rem'
  };

  const filtersStyle = {
    display: 'flex',
    gap: '1rem',
    'margin-bottom': '2rem',
    'align-items': 'center'
  };

  const filterButtonStyle = (isActive: boolean) => ({
    padding: '0.5rem 1rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    background: isActive ? 'var(--primary-color)' : 'var(--surface-color)',
    color: isActive ? 'white' : 'var(--text-primary)',
    cursor: 'pointer',
    'font-weight': '500',
    transition: 'all 0.2s ease'
  });

  const headerStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '2rem'
  };

  const viewModeStyle = {
    display: 'flex',
    gap: '0.5rem',
    'align-items': 'center',
    'margin-left': 'auto',
    'margin-right': '1rem'
  };

  const viewModeButtonStyle = (isActive: boolean) => ({
    padding: '0.5rem 1rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    background: isActive ? 'var(--primary-color)' : 'var(--surface-color)',
    color: isActive ? 'white' : 'var(--text-primary)',
    cursor: 'pointer',
    'font-weight': '500',
    'font-size': '0.875rem',
    transition: 'all 0.2s ease'
  });


   const searchAccount = async() => {
      setIsLoading(true)
      let qry = searchQuery() || authStore.getBusinessId()
      let acns  = await accountsApi.getAlls(qry);
      accountsStore.updAccount(acns);
      //console.log("acns", acns)
      let bln  = await accountsApi.getBalances();


      accountsStore.updAccountBalance(bln)

      
      setIsLoading(false)
   }

  onMount(()=>{
    //console.log("Account")
    // Preload layer options immediately
    preloadLayerOptions();

    setTimeout(() => {
         searchAccount();
    }, 450);
  })

  return (
    <Layout title={t('accounts.title')}>
      <AccountsOverview />
      <div style={headerStyle}>
        <h2 style={{ margin: '0', 'font-size': '1.5rem' }}>{t('accounts.title')}</h2>
        <div style={viewModeStyle}>
          <span style={{ 'font-weight': '500', color: 'var(--text-muted)', 'font-size': '0.875rem' }}>{t('common.view')}:</span>
          <button
            style={viewModeButtonStyle(viewMode() === 'hierarchy')}
            onClick={() => setViewMode('hierarchy')}
          >
            {t('accounts.accountHierarchy')}
          </button>
          <button
            style={viewModeButtonStyle(viewMode() === 'flat')}
            onClick={() => {
              setViewMode('flat');
              //accountsApi.getAlls("iDP");
            }}
          >
            {t('common.all')}
          </button>
        </div>
        <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>
          {t('accounts.addAccount')}
        </Button>
      </div>

      {/* Search and Filters */}
      <div style={{
        display: 'flex',
        'flex-wrap': 'wrap',
        gap: '1rem',
        'margin-bottom': '1.5rem',
        padding: '1rem',
        background: 'var(--surface-color)',
        'border-radius': 'var(--border-radius)',
        border: '1px solid var(--border-color)',
        'align-items': 'center'
      }}>
        {/* Search Input */}
        <div style={{ position: 'relative', 'min-width': '250px', flex: '1' }}>
          <input
            type="text"
            placeholder={t('accounts.searchPlaceholder', 'Buscar por nombre, código, descripción...')}
            value={searchQuery()}
            onInput={(e) => setSearchQuery(e.currentTarget.value)}
            onBlur={searchAccount}
            style={{
              width: '100%',
              padding: '0.6rem 0.75rem 0.6rem 2.5rem',
              border: '1px solid var(--border-color)',
              'border-radius': 'var(--border-radius-sm)',
              'font-size': '0.9rem',
              background: 'white'
            }}
          />
          <span style={{
            position: 'absolute',
            left: '0.75rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
            'pointer-events': 'none'
          }}>
            🔍
          </span>
          {searchQuery() && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '0.5rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: '0.25rem',
                'font-size': '1rem'
              }}
            >
              ✕
            </button>
          )}
        </div>

       

        
          

        {/* Type Filter */}
        <div style={{ display: 'flex', gap: '0.5rem', 'align-items': 'center', 'flex-wrap': 'wrap' }}>
          <span style={{ 'font-weight': '500', color: 'var(--text-muted)', 'font-size': '0.875rem' }}>{t('common.filter')}:</span>
          {[t('common.all'), t('accounts.types.asset'), t('accounts.types.liability'), t('accounts.types.equity'), t('accounts.types.revenue'), t('accounts.types.expense')].map((typeLabel, index) => {
            const typeValues = ['All', 'Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];
            const type = typeValues[index];
            return (
              <button
                style={filterButtonStyle(filterType() === type)}
                onClick={() => setFilterType(type as AccountingAccount['type'] | 'All')}
              >
                {typeLabel}
              </button>
            );
          })}
        </div>
      </div>

      <Show when={!isLoading()} fallback={
          <LoadingBar 
            height="2px" 
          />
        }>
     

      {/* Results count */}
      {(searchQuery() || filterType() !== 'All') && (
        <div style={{
          display: 'flex',
          'justify-content': 'space-between',
          'align-items': 'center',
          'margin-bottom': '1rem',
          padding: '0.5rem 0.75rem',
          background: 'var(--gray-50)',
          'border-radius': 'var(--border-radius-sm)',
          'font-size': '0.875rem',
          color: 'var(--text-muted)'
        }}>
          <span>
            {getFilteredAccounts().length} {t('accounts.accountsFound', 'cuentas encontradas')}
            {searchQuery() && <span> {t('common.for', 'para')} "<strong>{searchQuery()}</strong>"</span>}
          </span>
          {(searchQuery() || filterType() !== 'All') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterType('All');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary-color)',
                cursor: 'pointer',
                'font-size': '0.875rem',
                'text-decoration': 'underline'
              }}
            >
              {t('common.clearFilters', 'Limpiar filtros')}
            </button>
          )}
        </div>
      )}

      {viewMode() === 'hierarchy' ? (
        <div style={{ display: 'flex', 'flex-direction': 'column', gap: '1rem' }}>
          <LazyList
          items={getFilteredAccounts()}
          renderItem={(account) => (
            <AccountHierarchyCard
              account={account}
              onAddSubAccount={handleAddSubAccount}
              onViewDetails={handleViewAccount}
            />
          )}
          batchSize={60}
          gridColumns="repeat(auto-fit, minmax( 1fr))"
          gap="1.5rem"
          itemsLabel={t('accounts.accountsFound', 'cuentas')}
          emptyMessage={t('common.noDataFound')}
        />
          
        {getFilteredAccounts().length === 0 && (
            <div style={{
              'text-align': 'center',
              color: 'var(--text-muted)',
              padding: '3rem',
              'font-size': '1.1rem'
            }}>
              {t('common.noDataFound')}
            </div>
          )}
        </div>
      ) : (
        <LazyList
          items={getFilteredAccounts()}
          renderItem={(account) => (
            <AccountCard
              account={account}
              onViewDetails={handleViewAccount}
            />
          )}
          batchSize={20}
          gridColumns="repeat(auto-fit, minmax(350px, 1fr))"
          gap="1.5rem"
          itemsLabel={t('accounts.accountsFound', 'cuentas')}
          emptyMessage={t('common.noDataFound')}
        />
      )}
      </Show>

      <AddAccountModal
        isOpen={isAddModalOpen()}
        onClose={() => setIsAddModalOpen(false)}
        layerOptions={layerOptions()}
      />

      <AddSubAccountModal
        isOpen={isAddSubModalOpen()}
        onClose={() => setIsAddSubModalOpen(false)}
        parentAccount={selectedParentAccount()}
      />

      <AccountDetailModal
        isOpen={isDetailModalOpen()}
        onClose={() => setIsDetailModalOpen(false)}
        account={selectedAccount()}
        layerOptions={layerOptions()}
      />
    </Layout>
  );
};

export default Accounts;



// chmod 400 "hrm1.pem"
// sudo chmod 644 hrm1.pem
// sudo ssh -i "hrm1.pem" ubuntu@ec2-18-189-8-158.us-east-2.compute.amazonaws.com
// ssh-keygen -f hrm0.pem -y
// chmod 600 hrm0.pem