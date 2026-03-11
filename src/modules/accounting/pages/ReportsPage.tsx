/**
 * Reports Page
 * Financial reports - Balance Sheet, Income Statement, Trial Balance
 */

import { Component, createSignal, createResource, Show, For } from 'solid-js';
import { useTranslation } from '../../../translations';
import { Card, Button } from '../../ui';
import { accountingApi } from '../services/accountingApi';

const ReportsPage: Component = () => {
  const { t } = useTranslation();
  const [activeReport, setActiveReport] = createSignal<'balance' | 'income' | 'trial'>('income');
  const [startDate, setStartDate] = createSignal(
    new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = createSignal(
    new Date().toISOString().split('T')[0]
  );
  const [asOfDate, setAsOfDate] = createSignal(
    new Date().toISOString().split('T')[0]
  );

  // Fetch reports based on active tab
  const [incomeStatement] = createResource(
    () => ({ start: startDate(), end: endDate(), active: activeReport() === 'income' }),
    async (params) => {
      if (!params.active) return null;
      return await accountingApi.reports.getIncomeStatement(params.start, params.end);
    }
  );

  const [balanceSheet] = createResource(
    () => ({ date: asOfDate(), active: activeReport() === 'balance' }),
    async (params) => {
      if (!params.active) return null;
      return await accountingApi.reports.getBalanceSheet(params.date);
    }
  );

  const [trialBalance] = createResource(
    () => ({ date: asOfDate(), active: activeReport() === 'trial' }),
    async (params) => {
      if (!params.active) return null;
      return await accountingApi.reports.getTrialBalance(params.date);
    }
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const setQuickDate = (preset: string) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    switch (preset) {
      case 'thisMonth':
        setStartDate(new Date(year, month, 1).toISOString().split('T')[0]);
        setEndDate(new Date(year, month + 1, 0).toISOString().split('T')[0]);
        break;
      case 'lastMonth':
        setStartDate(new Date(year, month - 1, 1).toISOString().split('T')[0]);
        setEndDate(new Date(year, month, 0).toISOString().split('T')[0]);
        break;
      case 'thisYear':
        setStartDate(new Date(year, 0, 1).toISOString().split('T')[0]);
        setEndDate(new Date(year, 11, 31).toISOString().split('T')[0]);
        break;
      case 'lastYear':
        setStartDate(new Date(year - 1, 0, 1).toISOString().split('T')[0]);
        setEndDate(new Date(year - 1, 11, 31).toISOString().split('T')[0]);
        break;
    }
  };

  const tabStyle = (isActive: boolean) => ({
    padding: '0.75rem 1.5rem',
    border: 'none',
    background: isActive ? 'var(--primary-color)' : 'transparent',
    color: isActive ? 'white' : 'var(--text-muted)',
    'font-weight': isActive ? '600' : '400',
    cursor: 'pointer',
    'border-radius': 'var(--border-radius-sm)',
    transition: 'all 0.2s'
  });

  const sectionStyle = {
    'margin-bottom': '1.5rem'
  };

  const sectionTitleStyle = {
    'font-size': '1.1rem',
    'font-weight': '600',
    'margin-bottom': '1rem',
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem'
  };

  const rowStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    padding: '0.5rem 0',
    'border-bottom': '1px solid var(--border-color)'
  };

  const totalRowStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    padding: '0.75rem 1rem',
    'font-weight': '600',
    'border-radius': 'var(--border-radius-sm)',
    'margin-top': '0.5rem'
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ 'margin-bottom': '1.5rem' }}>
        <h1 style={{ 'font-size': '1.5rem', 'font-weight': '700', 'margin-bottom': '0.25rem' }}>
          {t('accounting.reports', 'Reportes Financieros')}
        </h1>
        <p style={{ color: 'var(--text-muted)', 'font-size': '0.875rem' }}>
          {t('accounting.reportsSubtitle', 'Estados financieros y análisis')}
        </p>
      </div>

      {/* Report Tabs */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        'margin-bottom': '1.5rem',
        background: 'var(--surface-secondary)',
        padding: '0.25rem',
        'border-radius': 'var(--border-radius-sm)',
        width: 'fit-content'
      }}>
        <button
          style={tabStyle(activeReport() === 'income')}
          onClick={() => setActiveReport('income')}
        >
          {t('accounting.incomeStatement', 'Estado de Resultados')}
        </button>
        <button
          style={tabStyle(activeReport() === 'balance')}
          onClick={() => setActiveReport('balance')}
        >
          {t('accounting.balanceSheet', 'Balance General')}
        </button>
        <button
          style={tabStyle(activeReport() === 'trial')}
          onClick={() => setActiveReport('trial')}
        >
          {t('accounting.trialBalance', 'Balance de Comprobación')}
        </button>
      </div>

      {/* Date Filters */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        'margin-bottom': '1.5rem',
        'align-items': 'flex-end',
        'flex-wrap': 'wrap'
      }}>
        <Show when={activeReport() === 'income'}>
          <div>
            <label style={{ display: 'block', 'font-size': '0.75rem', color: 'var(--text-muted)', 'margin-bottom': '0.25rem' }}>
              {t('accounting.startDate', 'Fecha Inicio')}
            </label>
            <input
              type="date"
              value={startDate()}
              onChange={(e) => setStartDate(e.currentTarget.value)}
              style={{
                padding: '0.5rem',
                border: '1px solid var(--border-color)',
                'border-radius': 'var(--border-radius-sm)'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', 'font-size': '0.75rem', color: 'var(--text-muted)', 'margin-bottom': '0.25rem' }}>
              {t('accounting.endDate', 'Fecha Fin')}
            </label>
            <input
              type="date"
              value={endDate()}
              onChange={(e) => setEndDate(e.currentTarget.value)}
              style={{
                padding: '0.5rem',
                border: '1px solid var(--border-color)',
                'border-radius': 'var(--border-radius-sm)'
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <button onClick={() => setQuickDate('thisMonth')} style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--border-color)', 'border-radius': 'var(--border-radius-sm)', background: 'var(--surface-color)', cursor: 'pointer', 'font-size': '0.75rem' }}>
              {t('accounting.thisMonth', 'Este Mes')}
            </button>
            <button onClick={() => setQuickDate('lastMonth')} style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--border-color)', 'border-radius': 'var(--border-radius-sm)', background: 'var(--surface-color)', cursor: 'pointer', 'font-size': '0.75rem' }}>
              {t('accounting.lastMonth', 'Mes Anterior')}
            </button>
            <button onClick={() => setQuickDate('thisYear')} style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--border-color)', 'border-radius': 'var(--border-radius-sm)', background: 'var(--surface-color)', cursor: 'pointer', 'font-size': '0.75rem' }}>
              {t('accounting.thisYear', 'Este Año')}
            </button>
            <button onClick={() => setQuickDate('lastYear')} style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--border-color)', 'border-radius': 'var(--border-radius-sm)', background: 'var(--surface-color)', cursor: 'pointer', 'font-size': '0.75rem' }}>
              {t('accounting.lastYear', 'Año Anterior')}
            </button>
          </div>
        </Show>

        <Show when={activeReport() !== 'income'}>
          <div>
            <label style={{ display: 'block', 'font-size': '0.75rem', color: 'var(--text-muted)', 'margin-bottom': '0.25rem' }}>
              {t('accounting.asOfDate', 'A la Fecha')}
            </label>
            <input
              type="date"
              value={asOfDate()}
              onChange={(e) => setAsOfDate(e.currentTarget.value)}
              style={{
                padding: '0.5rem',
                border: '1px solid var(--border-color)',
                'border-radius': 'var(--border-radius-sm)'
              }}
            />
          </div>
        </Show>

        <Button variant="secondary">
          {t('accounting.exportPDF', 'Exportar PDF')}
        </Button>
      </div>

      {/* Income Statement */}
      <Show when={activeReport() === 'income'}>
        <div style={{
          background: 'var(--surface-color)',
          border: '1px solid var(--border-color)',
          'border-radius': 'var(--border-radius-md)',
          padding: '1.5rem'
        }}>
          <div style={{ 'text-align': 'center', 'margin-bottom': '1.5rem' }}>
            <h2 style={{ 'font-size': '1.25rem', 'font-weight': '700' }}>
              {t('accounting.incomeStatement', 'Estado de Resultados')}
            </h2>
            <p style={{ color: 'var(--text-muted)', 'font-size': '0.875rem' }}>
              {startDate()} al {endDate()}
            </p>
          </div>

          <Show when={incomeStatement.loading}>
            <div style={{ 'text-align': 'center', padding: '2rem' }}>
              {t('common.loading', 'Cargando...')}
            </div>
          </Show>

          <Show when={!incomeStatement.loading && incomeStatement()}>
            <div style={sectionStyle}>
              <div style={{ ...sectionTitleStyle, color: '#059669' }}>
                <span>📈</span>
                {t('accounting.revenue', 'Ingresos')}
              </div>
              <For each={incomeStatement()?.revenue || []}>
                {(account) => (
                  <div style={rowStyle}>
                    <span>{account.name}</span>
                    <span style={{ 'font-weight': '500' }}>{formatCurrency(parseFloat(account.amount))}</span>
                  </div>
                )}
              </For>
              <div style={{ ...totalRowStyle, background: '#d1fae5', color: '#059669' }}>
                <span>{t('accounting.totalRevenue', 'Total Ingresos')}</span>
                <span>{formatCurrency(incomeStatement()?.totalRevenue || 0)}</span>
              </div>
            </div>

            <div style={sectionStyle}>
              <div style={{ ...sectionTitleStyle, color: '#dc2626' }}>
                <span>📉</span>
                {t('accounting.expenses', 'Gastos')}
              </div>
              <For each={incomeStatement()?.expenses || []}>
                {(account) => (
                  <div style={rowStyle}>
                    <span>{account.name}</span>
                    <span style={{ 'font-weight': '500' }}>{formatCurrency(parseFloat(account.amount))}</span>
                  </div>
                )}
              </For>
              <div style={{ ...totalRowStyle, background: '#fee2e2', color: '#dc2626' }}>
                <span>{t('accounting.totalExpenses', 'Total Gastos')}</span>
                <span>{formatCurrency(incomeStatement()?.totalExpenses || 0)}</span>
              </div>
            </div>

            <div style={{
              ...totalRowStyle,
              background: (incomeStatement()?.netIncome || 0) >= 0 ? '#d1fae5' : '#fee2e2',
              color: (incomeStatement()?.netIncome || 0) >= 0 ? '#059669' : '#dc2626',
              'font-size': '1.25rem',
              'margin-top': '1rem'
            }}>
              <span>{t('accounting.netIncome', 'Utilidad Neta')}</span>
              <span>{formatCurrency(incomeStatement()?.netIncome || 0)}</span>
            </div>
          </Show>
        </div>
      </Show>

      {/* Balance Sheet */}
      <Show when={activeReport() === 'balance'}>
        <div style={{
          background: 'var(--surface-color)',
          border: '1px solid var(--border-color)',
          'border-radius': 'var(--border-radius-md)',
          padding: '1.5rem'
        }}>
          <div style={{ 'text-align': 'center', 'margin-bottom': '1.5rem' }}>
            <h2 style={{ 'font-size': '1.25rem', 'font-weight': '700' }}>
              {t('accounting.balanceSheet', 'Balance General')}
            </h2>
            <p style={{ color: 'var(--text-muted)', 'font-size': '0.875rem' }}>
              {t('accounting.asOf', 'Al')} {asOfDate()}
            </p>
          </div>

          <Show when={balanceSheet.loading}>
            <div style={{ 'text-align': 'center', padding: '2rem' }}>
              {t('common.loading', 'Cargando...')}
            </div>
          </Show>

          <Show when={!balanceSheet.loading && balanceSheet()}>
            <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '2rem' }}>
              <div>
                <div style={sectionStyle}>
                  <div style={{ ...sectionTitleStyle, color: '#3b82f6' }}>
                    {t('accounting.assets', 'Activos')}
                  </div>
                  <For each={balanceSheet()?.assets || []}>
                    {(account) => (
                      <div style={rowStyle}>
                        <span>{account.name}</span>
                        <span style={{ 'font-weight': '500' }}>{formatCurrency(account.balance)}</span>
                      </div>
                    )}
                  </For>
                  <div style={{ ...totalRowStyle, background: '#dbeafe', color: '#2563eb' }}>
                    <span>{t('accounting.totalAssets', 'Total Activos')}</span>
                    <span>{formatCurrency(balanceSheet()?.totalAssets || 0)}</span>
                  </div>
                </div>
              </div>

              <div>
                <div style={sectionStyle}>
                  <div style={{ ...sectionTitleStyle, color: '#dc2626' }}>
                    {t('accounting.liabilities', 'Pasivos')}
                  </div>
                  <For each={balanceSheet()?.liabilities || []}>
                    {(account) => (
                      <div style={rowStyle}>
                        <span>{account.name}</span>
                        <span style={{ 'font-weight': '500' }}>{formatCurrency(account.balance)}</span>
                      </div>
                    )}
                  </For>
                  <div style={{ ...totalRowStyle, background: '#fee2e2', color: '#dc2626' }}>
                    <span>{t('accounting.totalLiabilities', 'Total Pasivos')}</span>
                    <span>{formatCurrency(balanceSheet()?.totalLiabilities || 0)}</span>
                  </div>
                </div>

                <div style={sectionStyle}>
                  <div style={{ ...sectionTitleStyle, color: '#059669' }}>
                    {t('accounting.equity', 'Capital')}
                  </div>
                  <For each={balanceSheet()?.equity || []}>
                    {(account) => (
                      <div style={rowStyle}>
                        <span>{account.name}</span>
                        <span style={{ 'font-weight': '500' }}>{formatCurrency(account.balance)}</span>
                      </div>
                    )}
                  </For>
                  <div style={{ ...totalRowStyle, background: '#d1fae5', color: '#059669' }}>
                    <span>{t('accounting.totalEquity', 'Total Capital')}</span>
                    <span>{formatCurrency(balanceSheet()?.totalEquity || 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          </Show>
        </div>
      </Show>

      {/* Trial Balance */}
      <Show when={activeReport() === 'trial'}>
        <div style={{
          background: 'var(--surface-color)',
          border: '1px solid var(--border-color)',
          'border-radius': 'var(--border-radius-md)',
          padding: '1.5rem'
        }}>
          <div style={{ 'text-align': 'center', 'margin-bottom': '1.5rem' }}>
            <h2 style={{ 'font-size': '1.25rem', 'font-weight': '700' }}>
              {t('accounting.trialBalance', 'Balance de Comprobación')}
            </h2>
            <p style={{ color: 'var(--text-muted)', 'font-size': '0.875rem' }}>
              {t('accounting.asOf', 'Al')} {asOfDate()}
            </p>
          </div>

          <Show when={trialBalance.loading}>
            <div style={{ 'text-align': 'center', padding: '2rem' }}>
              {t('common.loading', 'Cargando...')}
            </div>
          </Show>

          <Show when={!trialBalance.loading && trialBalance()}>
            <table style={{ width: '100%', 'border-collapse': 'collapse' }}>
              <thead>
                <tr style={{ 'border-bottom': '2px solid var(--border-color)' }}>
                  <th style={{ padding: '0.75rem', 'text-align': 'left', 'font-weight': '600', color: 'var(--text-muted)' }}>
                    {t('accounting.code', 'Código')}
                  </th>
                  <th style={{ padding: '0.75rem', 'text-align': 'left', 'font-weight': '600', color: 'var(--text-muted)' }}>
                    {t('accounting.account', 'Cuenta')}
                  </th>
                  <th style={{ padding: '0.75rem', 'text-align': 'right', 'font-weight': '600', color: 'var(--text-muted)' }}>
                    {t('accounting.debit', 'Débito')}
                  </th>
                  <th style={{ padding: '0.75rem', 'text-align': 'right', 'font-weight': '600', color: 'var(--text-muted)' }}>
                    {t('accounting.credit', 'Crédito')}
                  </th>
                </tr>
              </thead>
              <tbody>
                <For each={trialBalance()?.accounts || []}>
                  {(account) => (
                    <tr style={{ 'border-bottom': '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.75rem', 'font-family': 'monospace', 'font-size': '0.875rem' }}>
                        {account.code}
                      </td>
                      <td style={{ padding: '0.75rem' }}>{account.name}</td>
                      <td style={{ padding: '0.75rem', 'text-align': 'right', 'font-weight': '500' }}>
                        {account.debit > 0 ? formatCurrency(account.debit) : ''}
                      </td>
                      <td style={{ padding: '0.75rem', 'text-align': 'right', 'font-weight': '500' }}>
                        {account.credit > 0 ? formatCurrency(account.credit) : ''}
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--surface-secondary)', 'font-weight': '600' }}>
                  <td colspan="2" style={{ padding: '0.75rem' }}>
                    {t('accounting.totals', 'Totales')}
                  </td>
                  <td style={{ padding: '0.75rem', 'text-align': 'right' }}>
                    {formatCurrency(trialBalance()?.totalDebits || 0)}
                  </td>
                  <td style={{ padding: '0.75rem', 'text-align': 'right' }}>
                    {formatCurrency(trialBalance()?.totalCredits || 0)}
                  </td>
                </tr>
              </tfoot>
            </table>

            <Show when={Math.abs((trialBalance()?.totalDebits || 0) - (trialBalance()?.totalCredits || 0)) > 0.01}>
              <div style={{
                'margin-top': '1rem',
                padding: '1rem',
                background: '#fee2e2',
                'border-radius': 'var(--border-radius-sm)',
                color: '#dc2626'
              }}>
                ⚠️ {t('accounting.outOfBalance', 'El balance de comprobación está descuadrado')}
              </div>
            </Show>
          </Show>
        </div>
      </Show>
    </div>
  );
};

export default ReportsPage;
