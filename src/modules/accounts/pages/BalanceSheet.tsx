import { Component, createSignal, createMemo, onMount, For, Show } from 'solid-js';
import { Layout, Card, Button } from '../../ui';
import { accountsStore, AccountingAccount } from '../stores/accountsStore';
import { entryBookStore } from '../../journal/stores/entryBookStore';
import { useTranslation } from '../../../translations';
import { accountsApi, journalApi } from '../../../services/apiAdapter';
import { authStore } from '../../../stores/authStore';
import { escapeCSVField, formatCSVRow } from '../../../utils/csvUtils';
import { generateBalanceSheetPDF } from '../../../utils/balanceSheetPdfGenerator';

interface HierarchicalAccount extends AccountingAccount {
  subAccounts?: HierarchicalAccount[];
  level: number;
}

interface AccountGroup {
  category: string;
  accounts: HierarchicalAccount[];
  total: number;
}

const BalanceSheet: Component = () => {
  const { t } = useTranslation();
  const [asOfDate, setAsOfDate] = createSignal(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = createSignal(false);
  const [showDetails, setShowDetails] = createSignal(true);
  const [isPrintMode, setIsPrintMode] = createSignal(false);

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



  const calculateProfitOrLoss = () => {
    let balanceRevenue = 0;
    let balanceExpenses = 0;
    accountsStore?.accountsBalances?.accountMap && Object.values(accountsStore.accountsBalances?.accountMap).forEach((account:any) => {
        let categoryP = account?.accountType; 
        let valid = !account.parentAccountId;
        if(valid){
          if(categoryP === "Revenue"){
            balanceRevenue += account?.balance || 0;
          }
          else if(categoryP === "Expense"){
            balanceExpenses += account?.balance || 0;
          }
        }
    })
    return  balanceRevenue - balanceExpenses;
  } 

  // Build hierarchical accounts with sub-accounts
  const buildHierarchicalAccounts = (
    parentId: string | null,
    allAccounts: any[],
    level: number = 0
  ): HierarchicalAccount[] => {
    const children = allAccounts.filter(acc => {
      if (parentId === null) {
        return !acc.parentAccountId;
      }
      return acc.parentAccountId === parentId;
    });

    return children.map(account => {
      const subAccounts = buildHierarchicalAccounts(account.id, allAccounts, level + 1);
      return {
        ...account,
        level,
        subAccounts: subAccounts.length > 0 ? subAccounts : undefined
      } as HierarchicalAccount;
    }).sort((a, b) => (a.accountNumber || '').localeCompare(b.accountNumber || ''));
  };

  // Flatten hierarchical accounts for display (parent first, then children indented)
  const flattenHierarchicalAccounts = (accounts: HierarchicalAccount[]): HierarchicalAccount[] => {
    const result: HierarchicalAccount[] = [];

    const addAccountWithChildren = (account: HierarchicalAccount) => {
      result.push(account);
      if (account.subAccounts) {
        account.subAccounts.forEach(sub => addAccountWithChildren(sub));
      }
    };

    accounts.forEach(acc => addAccountWithChildren(acc));
    return result;
  };

  // Group accounts by type and category with hierarchy
  const groupAccountsByCategory = (type: AccountingAccount['accountType']): AccountGroup[] => {
    const categoryMap = new Map<string, HierarchicalAccount[]>();
    const allAccountsOfType: any[] = [];

    // Collect all accounts of this type
    accountsStore?.accountsBalances?.accountMap && Object.values(accountsStore.accountsBalances?.accountMap).forEach((account: any) => {
      const categoryP = account?.accountType;
      const transactionCount = accountsStore?.accountsBalances?.accountMapIDs?.[account?.id]?.transactionCount;
      const validYear = account?.year === 2025;

      if (categoryP === type && transactionCount && validYear) {
        allAccountsOfType.push(account);
      }
    });

    // Build hierarchy starting from root accounts (no parentAccountId)
    const rootAccounts = buildHierarchicalAccounts(null, allAccountsOfType, 0);

    // Group by category (using type as category for now)
    const category = type || t('common.uncategorized', 'Sin categorizar');
    if (!categoryMap.has(category)) {
      categoryMap.set(category, []);
    }

    // Add root accounts with their hierarchies
    rootAccounts.forEach(account => {
      categoryMap.get(category)!.push(account);
    });

    // Add profit/loss for Equity
    if (type === 'Equity') {
      const bal = calculateProfitOrLoss();
      const profitLossAccount: HierarchicalAccount = {
        id: 'profit-loss',
        accountNumber: 'Resultado',
        name: '(ganancia o pérdida)',
        balance: bal,
        level: 0,
        accountType: 'Equity',
        isActive: true
      } as HierarchicalAccount;

      if (categoryMap.get(category)) {
        categoryMap.get(category)!.push(profitLossAccount);
      }
    }

    // Calculate totals (only root level accounts to avoid double counting)
    const result = Array.from(categoryMap.entries()).map(([cat, accounts]) => {
      // Flatten for display but calculate total only from root accounts
      const flatAccounts = flattenHierarchicalAccounts(accounts);
      const total = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);

      return {
        category: cat,
        accounts: flatAccounts,
        total
      };
    });

    return result;
  };

  // Memoized calculations
  const assetGroups = createMemo(() => groupAccountsByCategory('Asset'));
  const liabilityGroups = createMemo(() => groupAccountsByCategory('Liability'));
  const equityGroups = createMemo(() => groupAccountsByCategory('Equity'));

  const totalAssets = createMemo(() =>
    assetGroups().reduce((sum, group) => sum + group.total, 0)
  );

  const totalLiabilities = createMemo(() =>
    liabilityGroups().reduce((sum, group) => sum + group.total, 0)
  );

  const totalEquity = createMemo(() =>
    equityGroups().reduce((sum, group) => sum + group.total, 0)
  );

  const isBalanced = createMemo(() =>
    Math.abs(totalAssets() - (totalLiabilities() + totalEquity())) < 0.01
  );

  // ============================================================================
  // EXPORT FUNCTIONS
  // ============================================================================

  /**
   * Export balance sheet data to CSV by categories
   */
  const exportToCSV = () => {
    const rows: string[] = [];
    const reportDate = new Date(asOfDate()).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Header
    rows.push(formatCSVRow(['BALANCE GENERAL']));
    rows.push(formatCSVRow([`Fecha: ${reportDate}`]));
    rows.push(formatCSVRow([])); // Empty row
    rows.push(formatCSVRow(['Tipo', 'Categoría', 'Nivel', 'Código', 'Cuenta', 'Saldo']));

    // Helper function to add indentation based on level
    const getIndentedName = (name: string, level: number) => {
      if (level === 0) return name;
      return '  '.repeat(level) + '└ ' + name;
    };

    // Assets
    assetGroups().forEach(group => {
      group.accounts.forEach(account => {
        rows.push(formatCSVRow([
          t('balanceSheet.assets'),
          group.category,
          (account.level || 0).toString(),
          account.accountNumber || account.code || '',
          getIndentedName(account.name, account.level || 0),
          (account.balance || 0).toFixed(2)
        ]));
      });
      // Category subtotal
      rows.push(formatCSVRow([
        '',
        `Subtotal ${group.category}`,
        '',
        '',
        '',
        group.total.toFixed(2)
      ]));
    });
    rows.push(formatCSVRow(['', t('balanceSheet.totalAssets'), '', '', '', totalAssets().toFixed(2)]));
    rows.push(formatCSVRow([])); // Empty row

    // Liabilities
    liabilityGroups().forEach(group => {
      group.accounts.forEach(account => {
        rows.push(formatCSVRow([
          t('balanceSheet.liabilities'),
          group.category,
          (account.level || 0).toString(),
          account.accountNumber || account.code || '',
          getIndentedName(account.name, account.level || 0),
          (account.balance || 0).toFixed(2)
        ]));
      });
      rows.push(formatCSVRow([
        '',
        `Subtotal ${group.category}`,
        '',
        '',
        '',
        group.total.toFixed(2)
      ]));
    });
    rows.push(formatCSVRow(['', t('balanceSheet.totalLiabilities'), '', '', '', totalLiabilities().toFixed(2)]));
    rows.push(formatCSVRow([])); // Empty row

    // Equity
    equityGroups().forEach(group => {
      group.accounts.forEach(account => {
        rows.push(formatCSVRow([
          t('balanceSheet.equity'),
          group.category,
          (account.level || 0).toString(),
          account.accountNumber || account.code || '',
          getIndentedName(account.name, account.level || 0),
          (account.balance || 0).toFixed(2)
        ]));
      });
      rows.push(formatCSVRow([
        '',
        `Subtotal ${group.category}`,
        '',
        '',
        '',
        group.total.toFixed(2)
      ]));
    });
    rows.push(formatCSVRow(['', t('balanceSheet.totalEquity'), '', '', '', totalEquity().toFixed(2)]));
    rows.push(formatCSVRow([])); // Empty row

    // Summary
    rows.push(formatCSVRow(['RESUMEN']));
    rows.push(formatCSVRow([t('balanceSheet.totalAssets'), '', '', '', '', totalAssets().toFixed(2)]));
    rows.push(formatCSVRow([t('balanceSheet.totalLiabilities'), '', '', '', '', totalLiabilities().toFixed(2)]));
    rows.push(formatCSVRow([t('balanceSheet.totalEquity'), '', '', '', '', totalEquity().toFixed(2)]));
    rows.push(formatCSVRow([t('balanceSheet.liabilitiesPlusEquity'), '', '', '', '', (totalLiabilities() + totalEquity()).toFixed(2)]));
    rows.push(formatCSVRow(['Diferencia', '', '', '', '', (totalAssets() - (totalLiabilities() + totalEquity())).toFixed(2)]));
    rows.push(formatCSVRow(['Balance Cuadrado', '', '', '', '', isBalanced() ? 'Sí' : 'No']));

    // Create and download file
    const csvContent = rows.join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `balance_general_${asOfDate()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  /**
   * Print professional report
   */
  const handlePrint = () => {
    setIsPrintMode(true);
    setTimeout(() => {
      window.print();
      setIsPrintMode(false);
    }, 100);
  };

  /**
   * Export to professional PDF document
   */
  const exportToPDF = () => {
    const reportDate = new Date(asOfDate()).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    generateBalanceSheetPDF({
      companyName: 'HRM Finance',
      reportDate,
      assetGroups: assetGroups(),
      liabilityGroups: liabilityGroups(),
      equityGroups: equityGroups(),
      totalAssets: totalAssets(),
      totalLiabilities: totalLiabilities(),
      totalEquity: totalEquity(),
      isBalanced: isBalanced()
    }, t);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
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

  const sectionStyle = {
    'margin-bottom': '1.5rem'
  };

  const categoryHeaderStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '0.75rem',
    background: 'var(--gray-100)',
    'border-radius': 'var(--border-radius-sm)',
    'font-weight': '600',
    'margin-bottom': '0.5rem'
  };

  const accountRowStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '0.5rem 0.75rem',
    'border-bottom': '1px solid var(--border-color)',
    'font-size': '0.9rem'
  };

  const totalStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'font-weight': 'bold',
    'font-size': '1.1rem',
    'border-top': '2px solid var(--border-color)',
    'padding-top': '0.75rem',
    'margin-top': '1rem'
  };

  // Get style for account row based on hierarchy level
  const getAccountRowStyle = (level: number, hasSubAccounts: boolean) => ({
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: `0.5rem 0.75rem 0.5rem ${0.75 + level * 1.25}rem`,
    'border-bottom': level === 0 ? '1px solid var(--border-color)' : '1px solid var(--gray-100)',
    'font-size': level === 0 ? '0.9rem' : '0.85rem',
    'background-color': level === 0 && hasSubAccounts ? 'var(--gray-50)' : 'transparent',
    'font-weight': level === 0 && hasSubAccounts ? '600' : '400'
  });

  const AccountGroupSection = (props: { groups: AccountGroup[], title: string, totalLabel: string, total: number, color: string }) => (
    <Card title={props.title} style={sectionStyle}>
      <Show when={props.groups.length === 0}>
        <div style={{ 'text-align': 'center', padding: '1rem', color: 'var(--text-muted)' }}>
          {t('balanceSheet.noAccounts', 'No hay cuentas registradas')}
        </div>
      </Show>

      <For each={props.groups}>
        {(group) => (
          <div style={{ 'margin-bottom': '1rem' }}>
            <div style={categoryHeaderStyle}>
              <span>{group.category}</span>
              <span>{formatCurrency(group.total)}</span>
            </div>

            <Show when={showDetails()}>
              <For each={group.accounts}>
                {(account: HierarchicalAccount) => (
                  <div style={getAccountRowStyle(account.level || 0, !!account.subAccounts)}>
                    <span style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                      {/* Hierarchy indicator */}
                      <Show when={(account.level || 0) > 0}>
                        <span style={{
                          color: 'var(--gray-400)',
                          'font-size': '0.7rem',
                          'margin-right': '0.25rem'
                        }}>
                          └
                        </span>
                      </Show>
                      {/* Account number */}
                      <span style={{
                        color: (account.level || 0) === 0 ? 'var(--text-muted)' : 'var(--gray-400)',
                        'font-size': (account.level || 0) === 0 ? '0.8rem' : '0.75rem',
                        'min-width': '60px'
                      }}>
                        {account.accountNumber || account.code}
                      </span>
                      {/* Account name */}
                      <span style={{
                        color: (account.level || 0) === 0 ? 'inherit' : 'var(--text-muted)'
                      }}>
                        {account.name}
                      </span>
                      {/* Sub-accounts indicator */}
                      <Show when={account.subAccounts && account.subAccounts.length > 0}>
                        <span style={{
                          'font-size': '0.7rem',
                          color: '#fff',
                          background: 'var(--primary-light, #e3f2fd)',
                          padding: '0.1rem 0.4rem',
                          'border-radius': '10px'
                        }}>
                          {account.subAccounts!.length} sub
                        </span>
                      </Show>
                    </span>
                    {/* Balance */}
                    <span style={{
                      'font-weight': (account.level || 0) === 0 ? '600' : '400',
                      color: (account.level || 0) === 0 ? 'inherit' : 'var(--text-muted)',
                      'font-size': (account.level || 0) === 0 ? '0.9rem' : '0.85rem'
                    }}>
                      {formatCurrency(account.balance || 0)}
                    </span>
                  </div>
                )}
              </For>
            </Show>
          </div>
        )}
      </For>

      <div style={{ ...totalStyle, color: props.color }}>
        <span>{props.totalLabel}</span>
        <span>{formatCurrency(props.total)}</span>
      </div>
    </Card>
  );





  return (
    <Layout title={t('balanceSheet.title')}>
      <div style={headerStyle}>
        <div>
          <h1 style={{ margin: '0' }}>{t('balanceSheet.title', 'Balance General')}</h1>
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
              checked={showDetails()}
              onChange={(e) => setShowDetails(e.target.checked)}
            />
            {t('balanceSheet.showDetails', 'Mostrar detalles')}
          </label>
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
        <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '2rem' }}>
          {/* Left Column - Assets */}
          <div>
            <AccountGroupSection
              groups={assetGroups()}
              title={t('balanceSheet.assets', 'Activos')}
              totalLabel={t('balanceSheet.totalAssets', 'Total Activos')}
              total={totalAssets()}
              color="var(--primary-color)"
            />
          </div>

          {/* Right Column - Liabilities & Equity */}
          <div>
            <AccountGroupSection
              groups={liabilityGroups()}
              title={t('balanceSheet.liabilities', 'Pasivos')}
              totalLabel={t('balanceSheet.totalLiabilities', 'Total Pasivos')}
              total={totalLiabilities()}
              color="#f44336"
            />

            <AccountGroupSection
              groups={equityGroups()}
              title={t('balanceSheet.equity', 'Patrimonio')}
              totalLabel={t('balanceSheet.totalEquity', 'Total Patrimonio')}
              total={totalEquity()}
              color="#4caf50"
            />
          </div>
        </div>

        {/* Summary Section */}
        <Card title={t('balanceSheet.summary', 'Resumen')} style={{ 'margin-top': '2rem' }}>
          <div style={{ display: 'grid', 'grid-template-columns': 'repeat(4, 1fr)', gap: '2rem' }}>
            <div style={{ 'text-align': 'center' }}>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'margin-bottom': '0.5rem' }}>
                {t('balanceSheet.totalAssets', 'Total Activos')}
              </div>
              <div style={{ 'font-size': '1.5rem', 'font-weight': 'bold', color: 'var(--primary-color)' }}>
                {formatCurrency(totalAssets())}
              </div>
              <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                {assetGroups().reduce((sum, g) => sum + g.accounts.length, 0)} {t('balanceSheet.accounts', 'cuentas')}
              </div>
            </div>

            <div style={{ 'text-align': 'center' }}>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'margin-bottom': '0.5rem' }}>
                {t('balanceSheet.totalLiabilities', 'Total Pasivos')}
              </div>
              <div style={{ 'font-size': '1.5rem', 'font-weight': 'bold', color: '#f44336' }}>
                {formatCurrency(totalLiabilities())}
              </div>
              <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                {liabilityGroups().reduce((sum, g) => sum + g.accounts.length, 0)} {t('balanceSheet.accounts', 'cuentas')}
              </div>
            </div>

            <div style={{ 'text-align': 'center' }}>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'margin-bottom': '0.5rem' }}>
                {t('balanceSheet.totalEquity', 'Total Patrimonio')}
              </div>
              <div style={{ 'font-size': '1.5rem', 'font-weight': 'bold', color: '#4caf50' }}>
                {formatCurrency(totalEquity())}
              </div>
              <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                {equityGroups().reduce((sum, g) => sum + g.accounts.length, 0)} {t('balanceSheet.accounts', 'cuentas')}
              </div>
            </div>

            <div style={{ 'text-align': 'center' }}>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'margin-bottom': '0.5rem' }}>
                {t('balanceSheet.liabilitiesPlusEquity', 'Pasivos + Patrimonio')}
              </div>
              <div style={{ 'font-size': '1.5rem', 'font-weight': 'bold', color: isBalanced() ? '#4caf50' : '#f44336' }}>
                {formatCurrency(totalLiabilities() + totalEquity())}
              </div>
            </div>
          </div>

          {/* Balance Equation Validation */}
          <div style={{
            'margin-top': '2rem',
            'padding': '1rem',
            'background': isBalanced() ? '#e8f5e9' : '#ffebee',
            'border-radius': 'var(--border-radius)',
            'text-align': 'center'
          }}>
            <div style={{ 'font-size': '1rem', 'margin-bottom': '0.5rem' }}>
              <strong>{t('balanceSheet.equation', 'Ecuación Contable')}:</strong> {t('balanceSheet.assets', 'Activos')} = {t('balanceSheet.liabilities', 'Pasivos')} + {t('balanceSheet.equity', 'Patrimonio')}
            </div>
            <div style={{
              'font-size': '1.2rem',
              'font-weight': 'bold',
              color: isBalanced() ? '#388e3c' : '#d32f2f'
            }}>
              {formatCurrency(totalAssets())} = {formatCurrency(totalLiabilities() + totalEquity())}
              <Show when={isBalanced()}>
                <span style={{ 'margin-left': '0.5rem' }}>✓</span>
              </Show>
            </div>
            <Show when={!isBalanced()}>
              <div style={{ 'font-size': '0.875rem', color: '#d32f2f', 'margin-top': '0.5rem' }}>
                {t('balanceSheet.difference', 'Diferencia')}: {formatCurrency(totalAssets() - (totalLiabilities() + totalEquity()))}
              </div>
            </Show>
          </div>
        </Card>

        {/* Export Buttons */}
        <div class="no-print" style={{ display: 'flex', gap: '1rem', 'justify-content': 'flex-end', 'margin-top': '1.5rem' }}>
          <Button variant="outline" onClick={handlePrint}>
            🖨️ {t('common.print', 'Imprimir')}
          </Button>
          <Button variant="secondary" onClick={exportToCSV}>
            📊 {t('balanceSheet.exportCSV', 'Exportar CSV')}
          </Button>
          <Button variant="primary" onClick={exportToPDF}>
            📄 {t('balanceSheet.exportPDF', 'Exportar PDF')}
          </Button>
        </div>
      </Show>

      {/* Professional Print Header - Only visible when printing */}
      <div class="print-only print-header">
        <div class="company-header">
          <h1 style={{ margin: '0', 'font-size': '1.5rem' }}>BALANCE GENERAL</h1>
          <p style={{ margin: '0.25rem 0 0 0', 'font-size': '0.9rem', color: '#666' }}>
            Al {new Date(asOfDate()).toLocaleDateString('es-ES', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .print-only {
          display: none;
        }

        @media print {
          /* Hide non-print elements */
          .no-print,
          button,
          input[type="date"],
          input[type="checkbox"],
          label:has(input[type="checkbox"]),
          nav,
          aside,
          header,
          [data-layout-sidebar],
          [data-layout-header] {
            display: none !important;
          }

          /* Show print-only elements */
          .print-only {
            display: block !important;
          }

          /* Reset page styling */
          body {
            margin: 0;
            padding: 0;
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /* Main container */
          [data-layout-content],
          main {
            margin: 0 !important;
            padding: 15mm !important;
            width: 100% !important;
            max-width: none !important;
          }

          /* Print header styling */
          .print-header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #333;
          }

          .company-header h1 {
            font-size: 18pt !important;
            font-weight: bold;
            margin: 0;
          }

          /* Cards styling for print */
          [class*="Card"],
          .card {
            border: 1px solid #ccc !important;
            box-shadow: none !important;
            margin-bottom: 15px !important;
            page-break-inside: avoid;
          }

          /* Section headers */
          [style*="categoryHeaderStyle"],
          div[style*="background: var(--gray-100)"] {
            background: #f5f5f5 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /* Totals */
          [style*="totalStyle"],
          div[style*="border-top: 2px"] {
            border-top: 2px solid #333 !important;
          }

          /* Summary section colors */
          [style*="background: #e8f5e9"],
          [style*="background: #ffebee"] {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /* Grid layout adjustments */
          div[style*="grid-template-columns: 1fr 1fr"] {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 15px !important;
          }

          div[style*="grid-template-columns: repeat(4, 1fr)"] {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 10px !important;
          }

          /* Font sizes for print */
          body, p, span, div {
            font-size: 10pt;
          }

          h1 { font-size: 16pt !important; }
          h2, h3 { font-size: 12pt !important; }
          h4 { font-size: 11pt !important; }

          /* Account rows */
          [style*="accountRowStyle"],
          div[style*="border-bottom: 1px solid"] {
            padding: 4px 8px !important;
          }

          /* Page settings */
          @page {
            size: letter portrait;
            margin: 10mm;
          }

          /* Ensure colors print */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Summary values */
          div[style*="font-size: 1.5rem"] {
            font-size: 14pt !important;
          }

          /* Footer on each page */
          .print-footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 8pt;
            color: #666;
            border-top: 1px solid #ccc;
            padding-top: 5px;
          }
        }

        @media print and (color) {
          /* Ensure colored text prints */
          [style*="color: var(--primary-color)"] {
            color: #1976d2 !important;
          }
          [style*="color: #f44336"] {
            color: #f44336 !important;
          }
          [style*="color: #4caf50"] {
            color: #4caf50 !important;
          }
          [style*="color: #388e3c"] {
            color: #388e3c !important;
          }
          [style*="color: #d32f2f"] {
            color: #d32f2f !important;
          }
        }
      `}</style>
    </Layout>
  );
};

export default BalanceSheet;
