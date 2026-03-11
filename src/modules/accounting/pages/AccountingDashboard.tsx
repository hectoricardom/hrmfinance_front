/**
 * Accounting Dashboard Page
 * Main landing page for the accounting module
 */

import { Component, createSignal, createMemo, onMount, Show, For } from 'solid-js';
import { useTranslation } from '../../../translations';
import { Card, Button } from '../../ui';
import { accountingStore } from '../stores/accountingStore';
import { A } from '@solidjs/router';

const AccountingDashboard: Component = () => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = createSignal(true);

  onMount(async () => {
    try {
      await accountingStore.loadAccounts();
      await accountingStore.loadTransactions();
    } finally {
      setIsLoading(false);
    }
  });

  // Computed summaries
  const summaryStats = createMemo(() => {
    const accounts = accountingStore.accounts;
    const transactions = accountingStore.transactions;

    const totalAssets = accounts
      .filter(a => a.accountType === 'asset')
      .reduce((sum, a) => sum + (a.balance || 0), 0);

    const totalLiabilities = accounts
      .filter(a => a.accountType === 'liability')
      .reduce((sum, a) => sum + (a.balance || 0), 0);

    const totalEquity = accounts
      .filter(a => a.accountType === 'equity')
      .reduce((sum, a) => sum + (a.balance || 0), 0);

    const totalRevenue = accounts
      .filter(a => a.accountType === 'revenue')
      .reduce((sum, a) => sum + (a.balance || 0), 0);

    const totalExpenses = accounts
      .filter(a => a.accountType === 'expense')
      .reduce((sum, a) => sum + (a.balance || 0), 0);

    const pendingTransactions = transactions.filter(t => t.status === 'pending').length;
    const postedTransactions = transactions.filter(t => t.status === 'posted').length;

    return {
      totalAssets,
      totalLiabilities,
      totalEquity,
      totalRevenue,
      totalExpenses,
      netIncome: totalRevenue - totalExpenses,
      pendingTransactions,
      postedTransactions,
      totalAccounts: accounts.length,
      totalTransactions: transactions.length
    };
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const cardStyle = {
    background: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-md)',
    padding: '1.5rem'
  };

  const statCardStyle = (color: string) => ({
    ...cardStyle,
    'border-left': `4px solid ${color}`
  });

  const linkCardStyle = {
    ...cardStyle,
    cursor: 'pointer',
    transition: 'all 0.2s',
    'text-decoration': 'none',
    display: 'block'
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ 'margin-bottom': '2rem' }}>
        <h1 style={{ 'font-size': '1.75rem', 'font-weight': '700', 'margin-bottom': '0.5rem' }}>
          {t('accounting.dashboard', 'Panel de Contabilidad')}
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          {t('accounting.dashboardSubtitle', 'Resumen de tu situación financiera')}
        </p>
      </div>

      <Show when={isLoading()}>
        <div style={{ 'text-align': 'center', padding: '3rem' }}>
          <div style={{ 'font-size': '2rem', 'margin-bottom': '1rem' }}>Loading...</div>
        </div>
      </Show>

      <Show when={!isLoading()}>
        {/* Financial Summary Cards */}
        <div style={{
          display: 'grid',
          'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          'margin-bottom': '2rem'
        }}>
          <div style={statCardStyle('#3b82f6')}>
            <div style={{ color: 'var(--text-muted)', 'font-size': '0.875rem', 'margin-bottom': '0.5rem' }}>
              {t('accounting.totalAssets', 'Activos Totales')}
            </div>
            <div style={{ 'font-size': '1.5rem', 'font-weight': '700', color: '#3b82f6' }}>
              {formatCurrency(summaryStats().totalAssets)}
            </div>
          </div>

          <div style={statCardStyle('#ef4444')}>
            <div style={{ color: 'var(--text-muted)', 'font-size': '0.875rem', 'margin-bottom': '0.5rem' }}>
              {t('accounting.totalLiabilities', 'Pasivos Totales')}
            </div>
            <div style={{ 'font-size': '1.5rem', 'font-weight': '700', color: '#ef4444' }}>
              {formatCurrency(summaryStats().totalLiabilities)}
            </div>
          </div>

          <div style={statCardStyle('#22c55e')}>
            <div style={{ color: 'var(--text-muted)', 'font-size': '0.875rem', 'margin-bottom': '0.5rem' }}>
              {t('accounting.equity', 'Capital')}
            </div>
            <div style={{ 'font-size': '1.5rem', 'font-weight': '700', color: '#22c55e' }}>
              {formatCurrency(summaryStats().totalEquity)}
            </div>
          </div>

          <div style={statCardStyle(summaryStats().netIncome >= 0 ? '#22c55e' : '#ef4444')}>
            <div style={{ color: 'var(--text-muted)', 'font-size': '0.875rem', 'margin-bottom': '0.5rem' }}>
              {t('accounting.netIncome', 'Utilidad Neta')}
            </div>
            <div style={{
              'font-size': '1.5rem',
              'font-weight': '700',
              color: summaryStats().netIncome >= 0 ? '#22c55e' : '#ef4444'
            }}>
              {formatCurrency(summaryStats().netIncome)}
            </div>
          </div>
        </div>

        {/* Quick Stats Row */}
        <div style={{
          display: 'grid',
          'grid-template-columns': 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '1rem',
          'margin-bottom': '2rem'
        }}>
          <div style={cardStyle}>
            <div style={{ 'font-size': '2rem', 'font-weight': '700', color: 'var(--primary-color)' }}>
              {summaryStats().totalAccounts}
            </div>
            <div style={{ color: 'var(--text-muted)', 'font-size': '0.875rem' }}>
              {t('accounting.accounts', 'Cuentas')}
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ 'font-size': '2rem', 'font-weight': '700', color: 'var(--primary-color)' }}>
              {summaryStats().postedTransactions}
            </div>
            <div style={{ color: 'var(--text-muted)', 'font-size': '0.875rem' }}>
              {t('accounting.postedEntries', 'Asientos Publicados')}
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ 'font-size': '2rem', 'font-weight': '700', color: '#f59e0b' }}>
              {summaryStats().pendingTransactions}
            </div>
            <div style={{ color: 'var(--text-muted)', 'font-size': '0.875rem' }}>
              {t('accounting.pendingEntries', 'Asientos Pendientes')}
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ 'font-size': '2rem', 'font-weight': '700', color: '#22c55e' }}>
              {formatCurrency(summaryStats().totalRevenue)}
            </div>
            <div style={{ color: 'var(--text-muted)', 'font-size': '0.875rem' }}>
              {t('accounting.revenue', 'Ingresos')}
            </div>
          </div>
        </div>

        {/* Quick Access Cards */}
        <h2 style={{ 'font-size': '1.25rem', 'font-weight': '600', 'margin-bottom': '1rem' }}>
          {t('accounting.quickAccess', 'Acceso Rápido')}
        </h2>

        <div style={{
          display: 'grid',
          'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1rem'
        }}>
          <A href="/accounting/accounts" style={linkCardStyle}>
            <div style={{ display: 'flex', 'align-items': 'center', gap: '1rem' }}>
              <div style={{ 'font-size': '2rem' }}>📋</div>
              <div>
                <div style={{ 'font-weight': '600', 'margin-bottom': '0.25rem' }}>
                  {t('accounting.chartOfAccounts', 'Plan de Cuentas')}
                </div>
                <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                  {t('accounting.manageAccounts', 'Administrar cuentas contables')}
                </div>
              </div>
            </div>
          </A>

          <A href="/accounting/transactions" style={linkCardStyle}>
            <div style={{ display: 'flex', 'align-items': 'center', gap: '1rem' }}>
              <div style={{ 'font-size': '2rem' }}>💳</div>
              <div>
                <div style={{ 'font-weight': '600', 'margin-bottom': '0.25rem' }}>
                  {t('accounting.journalEntries', 'Asientos Contables')}
                </div>
                <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                  {t('accounting.createViewEntries', 'Crear y ver asientos')}
                </div>
              </div>
            </div>
          </A>

          <A href="/accounting/documents" style={linkCardStyle}>
            <div style={{ display: 'flex', 'align-items': 'center', gap: '1rem' }}>
              <div style={{ 'font-size': '2rem' }}>📄</div>
              <div>
                <div style={{ 'font-weight': '600', 'margin-bottom': '0.25rem' }}>
                  {t('accounting.documents', 'Documentos')}
                </div>
                <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                  {t('accounting.uploadProcess', 'Subir y procesar con AI')}
                </div>
              </div>
            </div>
          </A>

          <A href="/accounting/reports" style={linkCardStyle}>
            <div style={{ display: 'flex', 'align-items': 'center', gap: '1rem' }}>
              <div style={{ 'font-size': '2rem' }}>📈</div>
              <div>
                <div style={{ 'font-weight': '600', 'margin-bottom': '0.25rem' }}>
                  {t('accounting.reports', 'Reportes')}
                </div>
                <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                  {t('accounting.financialReports', 'Estados financieros')}
                </div>
              </div>
            </div>
          </A>

          <A href="/accounting/tax" style={linkCardStyle}>
            <div style={{ display: 'flex', 'align-items': 'center', gap: '1rem' }}>
              <div style={{ 'font-size': '2rem' }}>🧾</div>
              <div>
                <div style={{ 'font-weight': '600', 'margin-bottom': '0.25rem' }}>
                  {t('accounting.taxCenter', 'Centro Fiscal')}
                </div>
                <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                  {t('accounting.taxExport', 'Resumen y exportación fiscal')}
                </div>
              </div>
            </div>
          </A>

          <A href="/accounting/drake-export" style={linkCardStyle}>
            <div style={{ display: 'flex', 'align-items': 'center', gap: '1rem' }}>
              <div style={{ 'font-size': '2rem' }}>📤</div>
              <div>
                <div style={{ 'font-weight': '600', 'margin-bottom': '0.25rem' }}>
                  {t('accounting.drakeExport', 'Drake Export')}
                </div>
                <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                  {t('accounting.drakeExportDesc', 'Exportar documentos a Drake')}
                </div>
              </div>
            </div>
          </A>

          <A href="/accounting/tax-clients" style={linkCardStyle}>
            <div style={{ display: 'flex', 'align-items': 'center', gap: '1rem' }}>
              <div style={{ 'font-size': '2rem' }}>👥</div>
              <div>
                <div style={{ 'font-weight': '600', 'margin-bottom': '0.25rem' }}>
                  {t('accounting.taxClients', 'Tax Clients')}
                </div>
                <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                  {t('accounting.taxClientsDesc', 'Client Workspace - All in one place')}
                </div>
              </div>
            </div>
          </A>
        </div>
      </Show>
    </div>
  );
};

export default AccountingDashboard;
