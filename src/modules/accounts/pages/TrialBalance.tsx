import { Component, createSignal, createMemo, onMount, For, Show } from 'solid-js';
import { A } from '@solidjs/router';
import { Layout, Card, Button } from '../../ui';
import LazyList from '../../ui/components/LazyList';
import { accountsStore, AccountingAccount } from '../stores/accountsStore';
import { entryBookStore } from '../../journal/stores/entryBookStore';
import { useTranslation } from '../../../translations';
import { accountsApi, journalApi } from '../../../services/apiAdapter';
import { authStore } from '../../../stores/authStore';
import { devLog } from '../../../services/utils';

interface TrialBalanceAccount {
  accountNumber: string;
  accountName: string;
  accountType: string;
  accountId: string;
  parentAccountId?: string;
  debit: number;
  credit: number;
  transactionCount?: number;
  // Hierarchy fields
  children?: TrialBalanceAccount[];
  level?: number;
  isParent?: boolean;
}

interface AccountTypeGroup {
  type: string;
  accounts: TrialBalanceAccount[];
  totalDebit: number;
  totalCredit: number;
}

interface HierarchicalAccount extends TrialBalanceAccount {
  children: HierarchicalAccount[];
  aggregatedDebit: number;  // Sum of own + children debits
  aggregatedCredit: number; // Sum of own + children credits
}

const TrialBalance: Component = () => {
  const { t } = useTranslation();
  const [asOfDate, setAsOfDate] = createSignal(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = createSignal(false);
  const [showGrouped, setShowGrouped] = createSignal(true);
  const [showHierarchy, setShowHierarchy] = createSignal(true);
  const [expandedParents, setExpandedParents] = createSignal<Set<string>>(new Set());

  onMount(async () => {
    await loadAccounts();
  });

  const loadAccounts = async () => {
    setLoading(true);
    try {
      // Load accounts
      let bln  = await accountsApi.getBalances();
      accountsStore.updAccountBalance(bln)

      /** 
      const accs = await accountsApi.getAlls(authStore.getBusinessId());
      if (accs && Object.keys(accs).length > 0) {
        accountsStore.updAccount(Object.values(accs));
      }

      
      // Load journal entries to calculate balances
      await entryBookStore.refreshData({
        dateTo: asOfDate() // Only entries up to the selected date
      });

      // Update account balances from journal entries
      const journalEntries = entryBookStore.journalEntries;
      if (journalEntries.length > 0) {
        accountsStore.updateBalancesFromJournalEntries(journalEntries);
      }
      */
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Convert accounts to trial balance format with debit/credit split
  const trialBalanceAccounts = createMemo(() => {
    const accounts: any[] = accountsStore?.accountsBalances?.accountMap && Object.values(accountsStore.accountsBalances?.accountMap) || []


     // entryBookStore.journalEntries



    return accounts.map(account => {

      

      const balance = account.balance || 0;
      const accountType = account.accountType || account.type || account.classification || 'Unknown';


      let accountNm = account.accountNumber || account.code || '';
      if(!accountNm){
         // devLog(account.accountId, balance);
      }
      // Determine if balance goes to debit or credit
      // Assets and Expenses have normal debit balances
      // Liabilities, Equity, and Revenue have normal credit balances
      let debit = 0;
      let credit = 0;

      if (accountType === 'Asset' || accountType === 'Expense') {
        debit = balance >= 0 ? balance : 0;
        credit = balance < 0 ? Math.abs(balance) : 0;
      } else {
        // Liability, Equity, Revenue
        credit = balance >= 0 ? balance : 0;
        debit = balance < 0 ? Math.abs(balance) : 0;
      }
      
      let transactionCount = accountsStore?.accountsBalances?.accountMapIDs?.[account?.id]?.transactionCount;

      return {
        transactionCount,
        accountNumber: accountNm,
        accountName: account.name,
        accountType: accountType,
        accountId: account.id,
        parentAccountId: account.parentAccountId || account.parentAccountNumber,
        debit,
        credit
      } as TrialBalanceAccount;

    });
  });

  // Build hierarchical account structure
  const hierarchicalAccounts = createMemo((): HierarchicalAccount[] => {
    const accounts = trialBalanceAccounts().filter(acc => acc.transactionCount);
    const accountMap = new Map<string, HierarchicalAccount>();

    // First pass: create all accounts as hierarchical
    accounts.forEach(acc => {
      accountMap.set(acc.accountId, {
        ...acc,
        children: [],
        aggregatedDebit: acc.debit,
        aggregatedCredit: acc.credit
      });
    });

    // Second pass: build parent-child relationships
    const rootAccounts: HierarchicalAccount[] = [];

    accounts.forEach(acc => {
      const hierarchicalAcc = accountMap.get(acc.accountId)!;

      if (acc.parentAccountId && accountMap.has(acc.parentAccountId)) {
        // Has a parent that exists in our map
        const parent = accountMap.get(acc.parentAccountId)!;
        parent.children.push(hierarchicalAcc);
      } else {
        // No parent or parent doesn't exist - it's a root account
        rootAccounts.push(hierarchicalAcc);
      }
    });

    // Third pass: aggregate totals from children to parents (bottom-up)
    const aggregateTotals = (account: HierarchicalAccount): void => {
      // First aggregate all children
      account.children.forEach(child => aggregateTotals(child));

      // Then sum children's aggregated values into this account
      account.children.forEach(child => {
        account.aggregatedDebit += child.aggregatedDebit;
        account.aggregatedCredit += child.aggregatedCredit;
      });
    };

    rootAccounts.forEach(root => aggregateTotals(root));

    // Sort by account number
    const sortAccounts = (accounts: HierarchicalAccount[]): HierarchicalAccount[] => {
      return accounts.sort((a:any, b:any) => a.accountNumber  - b.accountNumber 
      ).map(acc => ({
        ...acc,
        children: sortAccounts(acc.children)
      }));
    };

    return sortAccounts(rootAccounts);
  });

  // Toggle parent expansion
  const toggleParentExpansion = (accountId: string) => {
    setExpandedParents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(accountId)) {
        newSet.delete(accountId);
      } else {
        newSet.add(accountId);
      }
      return newSet;
    });
  };

  const isParentExpanded = (accountId: string) => expandedParents().has(accountId);

  // Expand all parents
  const expandAll = () => {
    const allParentIds = new Set<string>();
    const collectParentIds = (accounts: HierarchicalAccount[]) => {
      accounts.forEach(acc => {
        if (acc.children.length > 0) {
          allParentIds.add(acc.accountId);
          collectParentIds(acc.children);
        }
      });
    };
    collectParentIds(hierarchicalAccounts());
    setExpandedParents(allParentIds);
  };

  // Collapse all parents
  const collapseAll = () => {
    setExpandedParents(new Set());
  };

  // Calculate totals for hierarchy view (only root-level accounts)
  const hierarchyTotalDebits = createMemo(() =>
    hierarchicalAccounts().reduce((sum, acc) => sum + acc.debit, 0)
  );

  const hierarchyTotalCredits = createMemo(() =>
    hierarchicalAccounts().reduce((sum, acc) => sum + acc.credit, 0)
  );

  // Group accounts by type
  const groupedAccounts = createMemo((): AccountTypeGroup[] => {
    const accounts = trialBalanceAccounts();
    const groupMap = new Map<string, TrialBalanceAccount[]>();

    // Define order for account types
    const typeOrder = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];

     
    // Group accounts by type
    accounts.forEach(account => {
      
      //devLog(account, {transactionCount})
      if(account.transactionCount){
        const type = account.accountType;
        if (!groupMap.has(type)) {
          groupMap.set(type, []);
        }
        groupMap.get(type)!.push(account);
      }
    });

    // Convert to array with totals, maintaining order
    const groups: AccountTypeGroup[] = [];

    typeOrder.forEach(type => {
      if (groupMap.has(type)) {
        const typeAccounts = groupMap.get(type)!;
        groups.push({
          type,
          accounts: typeAccounts.sort((a:any, b:any) =>
            a?.accountNumber - b?.accountNumber
          ),
          totalDebit: typeAccounts.reduce((sum, acc) => sum + acc.debit, 0),
          totalCredit: typeAccounts.reduce((sum, acc) => sum + acc.credit, 0)
        });
      }
    });

    // Add any remaining types not in the predefined order
    Array.from(groupMap.keys()).forEach(type => {
      if (!typeOrder.includes(type)) {
        const typeAccounts = groupMap.get(type)!;
        groups.push({
          type,
          accounts: typeAccounts.sort((a, b) =>
            a?.accountNumber?.localeCompare?.(b?.accountNumber)
          ),
          totalDebit: typeAccounts.reduce((sum, acc) => sum + acc.debit, 0),
          totalCredit: typeAccounts.reduce((sum, acc) => sum + acc.credit, 0)
        });
      }
    });

    return groups;
  });

  // Calculate grand totals
  const totalDebits = createMemo(() => 
    trialBalanceAccounts().reduce((sum, acc) => sum + (!acc.parentAccountId? acc.debit : 0) , 0)

  );

  const totalCredits = createMemo(() =>
    trialBalanceAccounts().reduce((sum, acc) => sum + (!acc.parentAccountId? acc.credit : 0) , 0)
  );

  const isBalanced = createMemo(() =>
    Math.abs(totalDebits() - totalCredits()) < 0.01
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const headerStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '2rem',
    'flex-wrap': 'wrap',
    gap: '1rem'
  };

  const tableHeaderStyle = createMemo(() => ({
    display: 'grid',
    'grid-template-columns': showHierarchy() ? '180px 1fr 150px 150px' : '150px 1fr 150px 150px',
    gap: '1rem',
    padding: '1rem',
    background: 'var(--primary-color)',
    color: 'white',
    'font-weight': '600',
    'border-radius': 'var(--border-radius-sm) var(--border-radius-sm) 0 0',
    'font-size': '0.9rem'
  }));

  const tableRowStyle = {
    display: 'grid',
    'grid-template-columns': '150px 1fr 150px 150px',
    gap: '1rem',
    padding: '0.75rem 1rem',
    'border-bottom': '1px solid var(--border-color)',
    'font-size': '0.9rem',
    'align-items': 'center'
  };

  const groupHeaderStyle = {
    display: 'grid',
    'grid-template-columns': '150px 1fr 150px 150px',
    gap: '1rem',
    padding: '0.75rem 1rem',
    background: 'var(--gray-100)',
    'font-weight': '600',
    'margin-top': '1rem',
    'border-radius': 'var(--border-radius-sm)'
  };

  const totalRowStyle = createMemo(() => ({
    display: 'grid',
    'grid-template-columns': showHierarchy() ? '180px 1fr 150px 150px' : '150px 1fr 150px 150px',
    gap: '1rem',
    padding: '1rem',
    'font-weight': 'bold',
    'font-size': '1.1rem',
    'border-top': '3px double var(--border-color)',
    'margin-top': '1rem',
    background: isBalanced() ? '#e8f5e9' : '#ffebee',
    'border-radius': 'var(--border-radius-sm)'
  }));

  const typeStyle = {
    padding: '0.25rem 0.75rem',
    'border-radius': '9999px',
    'font-size': '0.75rem',
    'font-weight': '500',
    'text-transform': 'uppercase',
    'letter-spacing': '0.5px',
    'margin-left': '.25rem'
  };

  const parentRowStyle = {
    display: 'grid',
    'grid-template-columns': '150px 1fr 150px 150px',
    gap: '1rem',
    padding: '0.75rem 1rem',
    'border-bottom': '1px solid var(--border-color)',
    'font-size': '0.9rem',
    'align-items': 'center',
    background: 'var(--gray-50)',
    'font-weight': '600',
    cursor: 'pointer'
  };

  const subAccountRowStyle = (level: number) => ({
    display: 'grid',
    'grid-template-columns': '150px 1fr 150px 150px',
    gap: '1rem',
    padding: '0.5rem 1rem',
    'padding-left': `${1 + level * 1.5}rem`,
    'border-bottom': '1px solid var(--border-color)',
    'font-size': '0.85rem',
    'align-items': 'center',
    color: 'var(--text-muted)',
    background: level > 1 ? 'var(--gray-25)' : 'transparent'
  });


  const getTypeColor = (type: number) => {

    if(type>0){
      return { bg: '#e3f2fd', color: '#1976d2' }
    }else{
      return { bg: '#ffebee', color: '#d32f2f' }
    }
    /**
    const colors = {
      'Asset': { bg: '#e8f5e8', color: '#2d7d32' },
      'Liability': { bg: '#fff3e0', color: '#f57c00' },
      'Equity': { bg: '#e3f2fd', color: '#1976d2' },
      'Revenue': { bg: '#e8f5e8', color: '#388e3c' },
      'Expense': { bg: '#ffebee', color: '#d32f2f' }
    };
    */
  };

 
  const renderAccount = (account: TrialBalanceAccount) => (
    <div style={tableRowStyle}>
      <div style={{display: 'flex'}}>
        <div style={{ 'font-family': 'monospace', color: 'var(--text-muted)' , display: 'flex', "margin-top": '2px'}}>
          {account.accountNumber || account.accountId}
        </div>
       
        <Show when={!account.transactionCount} >
       <div
          style={{
            ...typeStyle,
            background: getTypeColor(account.transactionCount).bg,
            color: getTypeColor(account.transactionCount).color
          }}
        >
          {account.transactionCount}
        </div>
      </Show>
      </div>
      <div>{account.accountName}</div>
      <div style={{ 'text-align': 'right', 'font-family': 'monospace' }}>
        {account.debit > 0 ? formatCurrency(account.debit) : ''}
      </div>
      <div style={{ 'text-align': 'right', 'font-family': 'monospace' }}>
        {account.credit > 0 ? formatCurrency(account.credit) : ''}
      </div>
    </div>
  );

  // Get style for account row based on hierarchy level (similar to Balance Sheet)
  const getHierarchyRowStyle = (level: number, hasChildren: boolean) => ({
    display: 'grid',
    'grid-template-columns': '180px 1fr 150px 150px',
    gap: '1rem',
    padding: `0.5rem 1rem 0.5rem ${1 + level * 1.25}rem`,
    'border-bottom': level === 0 ? '1px solid var(--border-color)' : '1px solid var(--gray-100)',
    'font-size': level === 0 ? '0.9rem' : '0.85rem',
    'background-color': level === 0 && hasChildren ? 'var(--gray-50)' : 'transparent',
    'font-weight': level === 0 && hasChildren ? '600' : '400',
    cursor: hasChildren ? 'pointer' : 'default',
    'align-items': 'center'
  });

  // Render hierarchical account with children (similar to Balance Sheet style)
  const renderHierarchicalAccount = (account: HierarchicalAccount, level: number = 0) => {
    const hasChildren = account.children.length > 0;
    return (
      <div>
        {/* Account Row */}
      
        <div
          style={getHierarchyRowStyle(level, hasChildren)}
          onClick={() => hasChildren && toggleParentExpansion(account.accountId)}
        >
          {/* Account Number Column */}
          <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
            {/* Expand/Collapse indicator for parents */}
            <Show when={hasChildren}>
              <span style={{
                display: 'inline-block',
                width: '14px',
                'text-align': 'center',
                transition: 'transform 0.2s',
                transform: isParentExpanded(account.accountId) ? 'rotate(90deg)' : 'rotate(0deg)',
                color: 'var(--text-muted)',
                'font-size': '0.7rem'
              }}>
                ▶
              </span>
            </Show>
            {/* Hierarchy indicator for children */}
            <Show when={!hasChildren && level > 0}>
              <span style={{ color: 'var(--gray-400)', 'font-size': '0.7rem', width: '14px' }}>└</span>
            </Show>
            <Show when={!hasChildren && level === 0}>
              <span style={{ width: '14px' }}></span>
            </Show>
            {/* Account number */}
            <span style={{
              'font-family': 'monospace',
              color: level === 0 ? 'var(--text-muted)' : 'var(--gray-400)',
              'font-size': level === 0 ? '0.85rem' : '0.8rem'
            }}>
              {account.accountNumber || account.accountId}
            </span>
          </div>

         

          {/* Account Name Column */}
          <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
            <span style={{ color: level === 0 ? 'inherit' : 'var(--text-muted)' }}>
              {account.accountName}
            </span>
            {/* Sub-accounts badge */}
            <Show when={hasChildren}>
              <span style={{
                'font-size': '0.7rem',
                color: 'var(--primary-color)',
                background: 'var(--primary-light, #e3f2fd)',
                padding: '0.1rem 0.4rem',
                'border-radius': '10px'
              }}>
                {account.children.length} sub
              </span>
            </Show>
          </div>
           
          {/* Debit Column */}
          <div style={{
            'text-align': 'right',
            'font-family': 'monospace',
            'font-weight': level === 0 ? '600' : '400',
            color: level === 0 ? 'inherit' : 'var(--text-muted)'
          }}>
            {/* Show aggregated total for parents, own amount for leaf accounts */}
            {hasChildren
              ? (account.debit > 0 ? formatCurrency(account.debit) : '')
              : (account.debit > 0 ? formatCurrency(account.debit) : '')
            }
          </div>

          {/* Credit Column */}
          <div style={{
            'text-align': 'right',
            'font-family': 'monospace',
            'font-weight': level === 0 ? '600' : '400',
            color: level === 0 ? 'inherit' : 'var(--text-muted)'
          }}>
            {hasChildren
              ? (account.credit > 0 ? formatCurrency(account.credit) : '')
              : (account.credit > 0 ? formatCurrency(account.credit) : '')
            }
          </div>
        </div>

        {/* Children (if expanded) */}
        <Show when={hasChildren && isParentExpanded(account.accountId)}>
          <For each={account.children}>
            {(child) => renderHierarchicalAccount(child, level + 1)}
          </For>
        </Show>
      </div>
    );
  };

  return (
    <Layout title={t('trialBalance.title')}>
      <div style={headerStyle}>
        <div>
          <h1 style={{ margin: '0' }}>{t('trialBalance.title', 'Balance de Comprobación')}</h1>
          <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-muted)' }}>
            {t('balanceSheet.asOf', 'A la fecha del')} {new Date(asOfDate()).toLocaleDateString('es-ES', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', 'align-items': 'center', 'flex-wrap': 'wrap' }}>
          <label style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showHierarchy()}
              onChange={(e) => setShowHierarchy(e.target.checked)}
            />
            {t('trialBalance.showHierarchy', 'Jerarquía')}
          </label>
          <Show when={showHierarchy()}>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button
                onClick={expandAll}
                style={{
                  padding: '0.25rem 0.5rem',
                  border: '1px solid var(--border-color)',
                  'border-radius': 'var(--border-radius-sm)',
                  background: 'white',
                  cursor: 'pointer',
                  'font-size': '0.75rem'
                }}
              >
                {t('common.expandAll', 'Expandir')}
              </button>
              <button
                onClick={collapseAll}
                style={{
                  padding: '0.25rem 0.5rem',
                  border: '1px solid var(--border-color)',
                  'border-radius': 'var(--border-radius-sm)',
                  background: 'white',
                  cursor: 'pointer',
                  'font-size': '0.75rem'
                }}
              >
                {t('common.collapseAll', 'Colapsar')}
              </button>
            </div>
          </Show>
          <Show when={!showHierarchy()}>
            <label style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showGrouped()}
                onChange={(e) => setShowGrouped(e.target.checked)}
              />
              {t('trialBalance.groupByType', 'Agrupar por tipo')}
            </label>
          </Show>
          <input
            type="date"
            value={asOfDate()}
            onChange={(e) => setAsOfDate(e.target.value)}
            style={{
              padding: '0.5rem',
              border: '1px solid var(--border-color)',
              'border-radius': 'var(--border-radius-sm)'
            }}
          />
          <Button variant="primary" onClick={loadAccounts} disabled={loading()}>
            {loading() ? t('common.loading', 'Cargando...') : t('balanceSheet.generateReport', 'Generar Reporte')}
          </Button>
          <Show when={!isBalanced()}>
            <A href="/trial-balance-audit" style={{ 'text-decoration': 'none' }}>
              <Button variant="secondary" style={{ background: '#d32f2f', color: 'white', border: 'none' }}>
                {t('trialBalance.auditDiscrepancy', 'Auditar Diferencia')} ({formatCurrency(Math.abs(totalDebits() - totalCredits()))})
              </Button>
            </A>
          </Show>
        </div>
      </div>

      <Show when={loading()}>
        <div style={{ 'text-align': 'center', padding: '3rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid var(--border-color)',
            'border-top-color': 'var(--primary-color)',
            'border-radius': '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }} />
          {t('common.loading', 'Cargando...')}
        </div>
      </Show>

      <Show when={!loading()}>
        {/* Balance Status Alert */}
        <Card style={{ 'margin-bottom': '2rem' }}>
          <div style={{
            padding: '1rem',
            background: isBalanced() ? '#e8f5e9' : '#ffebee',
            'border-radius': 'var(--border-radius)',
            'text-align': 'center'
          }}>
            <div style={{
              'font-size': '1.2rem',
              'font-weight': 'bold',
              color: isBalanced() ? '#388e3c' : '#d32f2f',
              'margin-bottom': '0.5rem'
            }}>
              {isBalanced()
                ? `${t('trialBalance.balanced', 'Cuadrado')} ✓`
                : t('trialBalance.unbalanced', 'Descuadrado')
              }
            </div>
            <div style={{ 'font-size': '0.9rem', color: 'var(--text-muted)' }}>
              {t('trialBalance.debit', 'Débito')}: {formatCurrency(totalDebits())} |
              {' '}{t('trialBalance.credit', 'Crédito')}: {formatCurrency(totalCredits())}
              <Show when={!isBalanced()}>
                {' '}| Diferencia: {formatCurrency(Math.abs(totalDebits() - totalCredits()))}
              </Show>
            </div>
          </div>
        </Card>

        {/* Trial Balance Table */}
        <Card>
          <div style={tableHeaderStyle()}>
            <div>{t('accounts.accountNumber', 'Código')}</div>
            <div>{t('accounts.accountName', 'Cuenta')}</div>
            <div style={{ 'text-align': 'right' }}>{t('trialBalance.debit', 'Débito')}</div>
            <div style={{ 'text-align': 'right' }}>{t('trialBalance.credit', 'Crédito')}</div>
          </div>

          {/* Hierarchy View */}
          <Show when={showHierarchy()}>
            <For each={hierarchicalAccounts()}>
              {(account) => renderHierarchicalAccount(account, 0)}
            </For>
          </Show>

          {/* Flat/Grouped View */}
          <Show when={!showHierarchy()}>
            <Show when={showGrouped()} fallback={
              <LazyList
                items={trialBalanceAccounts()}
                renderItem={(account) => renderAccount(account)}
                batchSize={50}
                gridColumns="1fr"
                gap="0"
                showStats={false}
                showProgressBar={false}
                itemsLabel={t('accounts.allAccounts', 'cuentas')}
                emptyMessage={t('balanceSheet.noAccounts', 'No hay cuentas registradas')}
              />
            }>
              <For each={groupedAccounts()}>
                {(group) => (
                  <div>
                    {/* Group Header */}
                    <div style={groupHeaderStyle}>
                      <div colspan="2">
                        {t(`accounts.types.${group.type.toLowerCase()}`, group.type)}
                      </div>
                      <div></div>
                      <div style={{ 'text-align': 'right' }}>
                        {group.totalDebit > 0 ? formatCurrency(group.totalDebit) : ''}
                      </div>
                      <div style={{ 'text-align': 'right' }}>
                        {group.totalCredit > 0 ? formatCurrency(group.totalCredit) : ''}
                      </div>
                    </div>

                    {/* Group Accounts */}
                    <For each={group.accounts}>
                      {(account) => renderAccount(account)}
                    </For>
                  </div>
                )}
              </For>
            </Show>
          </Show>

          {/* Grand Total Row */}
          <div style={totalRowStyle()}>
            <div></div>
            <div>{t('trialBalance.totals', 'TOTALES')}</div>
            <div style={{ 'text-align': 'right', 'font-family': 'monospace', color: isBalanced() ? '#388e3c' : '#d32f2f' }}>
              {showHierarchy() ? formatCurrency(hierarchyTotalDebits()) : formatCurrency(totalDebits())}
            </div>
            <div style={{ 'text-align': 'right', 'font-family': 'monospace', color: isBalanced() ? '#388e3c' : '#d32f2f' }}>
              {showHierarchy() ? formatCurrency(hierarchyTotalCredits()) : formatCurrency(totalCredits())}
            </div>
          </div>
        </Card>

        {/* Summary Cards */}
        <div style={{ display: 'grid', 'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', 'margin-top': '2rem' }}>
          <Card>
            <div style={{ 'text-align': 'center', padding: '1rem .1rem' }}>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'margin-bottom': '0.5rem' }}>
                {t('trialBalance.totalAccounts', 'Total Cuentas')}
              </div>
              <div style={{ 'font-size': '1.5rem', 'font-weight': 'bold' }}>
                {trialBalanceAccounts().length}
              </div>
            </div>
          </Card>

          <Card>
            <div style={{ 'text-align': 'center', padding: '1rem .1rem' }}>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'margin-bottom': '0.5rem' }}>
                {t('trialBalance.totalDebits', 'Total Débitos')}
              </div>
              <div style={{ 'font-size': '1.5rem', 'font-weight': 'bold', color: 'var(--primary-color)' }}>
                {formatCurrency(totalDebits())}
              </div>
            </div>
          </Card>

          <Card>
            <div style={{ 'text-align': 'center', padding: '1rem .1rem' }}>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'margin-bottom': '0.5rem' }}>
                {t('trialBalance.totalCredits', 'Total Créditos')}
              </div>
              <div style={{ 'font-size': '1.5rem', 'font-weight': 'bold', color: '#4caf50' }}>
                {formatCurrency(totalCredits())}
              </div>
            </div>
          </Card>

          <Card>
            <div style={{ 'text-align': 'center', padding: '1rem .1rem' }}>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'margin-bottom': '0.5rem' }}>
                {t('common.status', 'Estado')}
              </div>
              <div style={{
                'font-size': '1.25rem',
                'font-weight': 'bold',
                color: isBalanced() ? '#4caf50' : '#f44336'
              }}>
                {isBalanced()
                  ? t('trialBalance.balanced', 'Cuadrado')
                  : t('trialBalance.unbalanced', 'Descuadrado')
                }
              </div>
            </div>
          </Card>
        </div>

        {/* Export Buttons */}
        <div style={{ display: 'flex', gap: '1rem', 'justify-content': 'flex-end', 'margin-top': '1.5rem' }}>
          <Button variant="outline" onClick={() => window.print()}>
            {t('common.print', 'Imprimir')}
          </Button>
          <Button variant="secondary">
            {t('balanceSheet.exportExcel', 'Exportar Excel')}
          </Button>
          <Button variant="secondary">
            {t('balanceSheet.exportPDF', 'Exportar PDF')}
          </Button>
        </div>
      </Show>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media print {
          button { display: none !important; }
        }
      `}</style>
    </Layout>
  );
};

export default TrialBalance;



