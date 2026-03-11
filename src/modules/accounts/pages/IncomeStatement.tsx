import { Component, createSignal, createMemo, onMount, For, Show } from 'solid-js';
import { Layout, Card, Button } from '../../ui';
import { accountsStore, AccountingAccount } from '../stores/accountsStore';
import { entryBookStore } from '../../journal/stores/entryBookStore';
import { useTranslation } from '../../../translations';
import { accountsApi, journalApi } from '../../../services/apiAdapter';
import { authStore } from '../../../stores/authStore';

interface AccountGroup {
  category: string;
  accounts: AccountingAccount[];
  total: number;
}

const IncomeStatement: Component = () => {
  const { t } = useTranslation();
  const [fromDate, setFromDate] = createSignal(
    new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
  );
  const [toDate, setToDate] = createSignal(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = createSignal(false);
  const [showDetails, setShowDetails] = createSignal(true);

  onMount(async () => {
    await loadAccounts();
  });

  const loadAccounts = async () => {
    setLoading(true);
    try {
      // Load accounts

        let bln  = await accountsApi.getBalances();
      accountsStore.updAccountBalance(bln)

      /*
      const accs = await accountsApi.getAlls(authStore.getBusinessId());
      if (accs && Object.keys(accs).length > 0) {
        accountsStore.updAccount(Object.values(accs));
      }

      // Load journal entries for the selected period
      await entryBookStore.refreshData({
        dateFrom: fromDate(),
        dateTo: toDate()
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

  // Group accounts by type and category
  const groupAccountsByCategory = (type: AccountingAccount['accountType']): AccountGroup[] => {
    //const accounts = accountsStore.getAccountsByType(type);
    const categoryMap = new Map<string, AccountingAccount[]>();

    accountsStore?.accountsBalances?.accountMap && Object.values(accountsStore.accountsBalances?.accountMap).forEach((account:any) => {

      let categoryP = account?.accountType;
      
      let transactionCount = accountsStore?.accountsBalances?.accountMapIDs?.[account?.id]?.transactionCount;
      let validYear = account?.year === 2025; 


      let valid = !account.parentAccountId && transactionCount && validYear;
      if(categoryP === type &&  valid){
        const category = categoryP || t('common.uncategorized', 'Sin categorizar');
        if (!categoryMap.has(category)) {
          categoryMap.set(category, []);
        }
        categoryMap.get(category)!.push(account);
      }
    });

    return Array.from(categoryMap.entries()).map(([category, accounts]) => ({
      category,
      accounts: accounts.sort((a:any, b:any)=>(a?.accountNumber || '')?.localeCompare(b?.accountNumber)),
      total: accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0)
    }));
  };

  // Memoized calculations
  const revenueGroups = createMemo(() => groupAccountsByCategory('Revenue'));
  const expenseGroups = createMemo(() => groupAccountsByCategory('Expense'));

  const totalRevenue = createMemo(() =>
    revenueGroups().reduce((sum, group) => sum + group.total, 0)
  );

  const totalExpenses = createMemo(() =>
    expenseGroups().reduce((sum, group) => sum + group.total, 0)
  );

  const netIncome = createMemo(() =>
    totalRevenue() - totalExpenses()
  );

  const profitMargin = createMemo(() => {
    if (totalRevenue() === 0) return 0;
    return (netIncome() / totalRevenue()) * 100;
  });

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

  const AccountGroupSection = (props: { groups: AccountGroup[], title: string, totalLabel: string, total: number, color: string }) => (
    <Card title={props.title} style={sectionStyle}>
      <Show when={props.groups.length === 0}>
        <div style={{ 'text-align': 'center', padding: '1rem', color: 'var(--text-muted)' }}>
          {t('incomeStatement.noAccounts', 'No hay cuentas registradas')}
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
                {(account) => (
                  <div style={accountRowStyle}>
                    <span style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                      <span style={{ color: 'var(--text-muted)', 'font-size': '0.8rem' }}>
                        {account.accountNumber || account.code}
                      </span>
                      {account.name}
                    </span>
                    <span style={{ 'font-weight': '500' }}>
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
    <Layout title={t('incomeStatement.title', 'Estado de Resultados')}>
      <div style={headerStyle}>
        <div>
          <h1 style={{ margin: '0' }}>{t('incomeStatement.title', 'Estado de Resultados')}</h1>
          <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-muted)' }}>
            {t('incomeStatement.period', 'Periodo del')} {new Date(fromDate()).toLocaleDateString('es-ES', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })} {t('incomeStatement.to', 'al')} {new Date(toDate()).toLocaleDateString('es-ES', {
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
            {t('incomeStatement.showDetails', 'Mostrar detalles')}
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', 'align-items': 'center' }}>
            <input
              type="date"
              value={fromDate()}
              onChange={(e) => setFromDate(e.target.value)}
              style={{
                padding: '0.5rem',
                border: '1px solid var(--border-color)',
                'border-radius': 'var(--border-radius-sm)'
              }}
            />
            <span>{t('incomeStatement.to', 'al')}</span>
            <input
              type="date"
              value={toDate()}
              onChange={(e) => setToDate(e.target.value)}
              style={{
                padding: '0.5rem',
                border: '1px solid var(--border-color)',
                'border-radius': 'var(--border-radius-sm)'
              }}
            />
          </div>
          <Button variant="primary" onClick={loadAccounts} disabled={loading()}>
            {loading() ? t('common.loading', 'Cargando...') : t('incomeStatement.generateReport', 'Generar Reporte')}
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
        {/* Revenue Section */}
        <AccountGroupSection
          groups={revenueGroups()}
          title={t('incomeStatement.revenue', 'Ingresos')}
          totalLabel={t('incomeStatement.totalRevenue', 'Total Ingresos')}
          total={totalRevenue()}
          color="#4caf50"
        />

        {/* Expenses Section */}
        <AccountGroupSection
          groups={expenseGroups()}
          title={t('incomeStatement.expenses', 'Gastos')}
          totalLabel={t('incomeStatement.totalExpenses', 'Total Gastos')}
          total={totalExpenses()}
          color="#f44336"
        />

        {/* Net Income Section */}
        <Card title={t('incomeStatement.netIncome', 'Resultado Neto')} style={{ 'margin-top': '2rem' }}>
          <div style={{ display: 'grid', 'grid-template-columns': 'repeat(3, 1fr)', gap: '2rem' }}>
            <div style={{ 'text-align': 'center' }}>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'margin-bottom': '0.5rem' }}>
                {t('incomeStatement.totalRevenue', 'Total Ingresos')}
              </div>
              <div style={{ 'font-size': '1.5rem', 'font-weight': 'bold', color: '#4caf50' }}>
                {formatCurrency(totalRevenue())}
              </div>
              <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                {revenueGroups().reduce((sum, g) => sum + g.accounts.length, 0)} {t('incomeStatement.accounts', 'cuentas')}
              </div>
            </div>

            <div style={{ 'text-align': 'center' }}>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'margin-bottom': '0.5rem' }}>
                {t('incomeStatement.totalExpenses', 'Total Gastos')}
              </div>
              <div style={{ 'font-size': '1.5rem', 'font-weight': 'bold', color: '#f44336' }}>
                {formatCurrency(totalExpenses())}
              </div>
              <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                {expenseGroups().reduce((sum, g) => sum + g.accounts.length, 0)} {t('incomeStatement.accounts', 'cuentas')}
              </div>
            </div>

            <div style={{ 'text-align': 'center' }}>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'margin-bottom': '0.5rem' }}>
                {t('incomeStatement.netIncome', 'Resultado Neto')}
              </div>
              <div style={{ 'font-size': '1.5rem', 'font-weight': 'bold', color: netIncome() >= 0 ? '#4caf50' : '#f44336' }}>
                {formatCurrency(netIncome())}
              </div>
              <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                {t('incomeStatement.profitMargin', 'Margen')}: {profitMargin().toFixed(2)}%
              </div>
            </div>
          </div>

          {/* Income Formula */}
          <div style={{
            'margin-top': '2rem',
            'padding': '1rem',
            'background': netIncome() >= 0 ? '#e8f5e9' : '#ffebee',
            'border-radius': 'var(--border-radius)',
            'text-align': 'center'
          }}>
            <div style={{ 'font-size': '1rem', 'margin-bottom': '0.5rem' }}>
              <strong>{t('incomeStatement.formula', 'Fórmula')}:</strong> {t('incomeStatement.netIncome', 'Resultado Neto')} = {t('incomeStatement.revenue', 'Ingresos')} - {t('incomeStatement.expenses', 'Gastos')}
            </div>
            <div style={{
              'font-size': '1.2rem',
              'font-weight': 'bold',
              color: netIncome() >= 0 ? '#388e3c' : '#d32f2f'
            }}>
              {formatCurrency(netIncome())} = {formatCurrency(totalRevenue())} - {formatCurrency(totalExpenses())}
              <Show when={netIncome() >= 0}>
                <span style={{ 'margin-left': '0.5rem' }}>✓</span>
              </Show>
            </div>
            <div style={{ 'font-size': '0.875rem', color: netIncome() >= 0 ? '#388e3c' : '#d32f2f', 'margin-top': '0.5rem' }}>
              {netIncome() >= 0
                ? t('incomeStatement.profit', 'Utilidad del periodo')
                : t('incomeStatement.loss', 'Pérdida del periodo')}
            </div>
          </div>
        </Card>

        {/* Export Buttons */}
        <div style={{ display: 'flex', gap: '1rem', 'justify-content': 'flex-end', 'margin-top': '1.5rem' }}>
          <Button variant="outline" onClick={() => window.print()}>
            {t('common.print', 'Imprimir')}
          </Button>
          <Button variant="secondary">
            {t('incomeStatement.exportExcel', 'Exportar Excel')}
          </Button>
          <Button variant="secondary">
            {t('incomeStatement.exportPDF', 'Exportar PDF')}
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

export default IncomeStatement;
