import { Component, createSignal, Show } from 'solid-js';
import {
  ReportFilters,
  BalanceSheet,
  IncomeStatement,
  TrialBalance,
  ReportExport
} from '../components';
import { devLog } from '../../../services/utils';

/**
 * Example Reports Page
 * Demonstrates how to use the accounting report components
 */
const ReportsExample: Component = () => {
  const today = new Date().toISOString().split('T')[0];
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split('T')[0];

  const [startDate, setStartDate] = createSignal(firstDayOfMonth);
  const [endDate, setEndDate] = createSignal(today);
  const [asOfDate, setAsOfDate] = createSignal(today);
  const [activeReport, setActiveReport] = createSignal<'balance-sheet' | 'income-statement' | 'trial-balance'>('income-statement');
  const [showExportModal, setShowExportModal] = createSignal(false);

  const handleDateChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    setAsOfDate(end);
  };

  const handleExport = () => {
    setShowExportModal(true);
  };

  const handleExportConfirm = (
    format: 'pdf' | 'csv' | 'excel',
    options: { includeDetails: boolean; includeZeroBalances: boolean }
  ) => {
    devLog('Exporting report:', {
      reportType: activeReport(),
      format,
      options,
      dateRange:
        activeReport() === 'income-statement'
          ? { startDate: startDate(), endDate: endDate() }
          : { asOfDate: asOfDate() }
    });
    // Here you would implement the actual export logic
  };

  const containerStyle = {
    padding: '2rem',
    'max-width': '1400px',
    margin: '0 auto'
  };

  const headerStyle = {
    'margin-bottom': '2rem'
  };

  const titleStyle = {
    'font-size': '2rem',
    'font-weight': '700',
    color: 'var(--text-primary)',
    margin: '0 0 0.5rem 0'
  };

  const subtitleStyle = {
    'font-size': '1rem',
    color: 'var(--text-muted)',
    margin: '0'
  };

  const tabsContainerStyle = {
    display: 'flex',
    gap: '1rem',
    'margin-bottom': '2rem',
    'border-bottom': '2px solid var(--border-color)',
    'padding-bottom': '0'
  };

  const tabStyle = (isActive: boolean) => ({
    padding: '1rem 1.5rem',
    border: 'none',
    background: isActive ? 'var(--primary-color)' : 'transparent',
    color: isActive ? 'white' : 'var(--text-muted)',
    cursor: 'pointer',
    'font-weight': '600',
    'border-radius': 'var(--border-radius-sm) var(--border-radius-sm) 0 0',
    'margin-bottom': '-2px',
    'border-bottom': isActive ? '2px solid var(--primary-color)' : 'none',
    transition: 'all 0.2s ease'
  });

  const contentStyle = {
    'margin-top': '2rem'
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>Financial Reports</h1>
        <p style={subtitleStyle}>View and export accounting reports</p>
      </div>

      {/* Report Filters */}
      <ReportFilters
        startDate={startDate()}
        endDate={endDate()}
        onDateChange={handleDateChange}
        onExport={handleExport}
      />

      {/* Report Type Tabs */}
      <div style={tabsContainerStyle}>
        <button
          style={tabStyle(activeReport() === 'income-statement')}
          onClick={() => setActiveReport('income-statement')}
        >
          Income Statement
        </button>
        <button
          style={tabStyle(activeReport() === 'balance-sheet')}
          onClick={() => setActiveReport('balance-sheet')}
        >
          Balance Sheet
        </button>
        <button
          style={tabStyle(activeReport() === 'trial-balance')}
          onClick={() => setActiveReport('trial-balance')}
        >
          Trial Balance
        </button>
      </div>

      {/* Report Content */}
      <div style={contentStyle}>
        <Show when={activeReport() === 'income-statement'}>
          <IncomeStatement startDate={startDate()} endDate={endDate()} />
        </Show>

        <Show when={activeReport() === 'balance-sheet'}>
          <BalanceSheet asOfDate={asOfDate()} />
        </Show>

        <Show when={activeReport() === 'trial-balance'}>
          <TrialBalance asOfDate={asOfDate()} />
        </Show>
      </div>

      {/* Export Modal */}
      <Show when={showExportModal()}>
        <ReportExport
          reportType={activeReport()}
          dateRange={
            activeReport() === 'income-statement'
              ? { startDate: startDate(), endDate: endDate() }
              : { asOfDate: asOfDate() }
          }
          onExport={handleExportConfirm}
          onClose={() => setShowExportModal(false)}
        />
      </Show>
    </div>
  );
};

export default ReportsExample;
