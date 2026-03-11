import { Component, createSignal, onMount, createEffect, Show, For, createMemo } from 'solid-js';
import { useSearchParams } from '@solidjs/router';
import { Layout } from '../../ui';
import { Card } from '../../ui';
import { Button } from '../../ui';
import { FormSelect } from '../../ui';
import LazyEntryList from '../components/LazyEntryList';
import AddJournalEntryModal from '../components/AddJournalEntryModal';
//import QuickJournalEntryModal from '../components/QuickJournalEntryModal';
//import ManageTemplatesModal from '../components/ManageTemplatesModal';
import JournalEntryDetailModal from '../components/JournalEntryDetailModal';
import TemplateManager from '../components/TemplateManager';
import TemplateLauncher from '../components/TemplateLauncher';
import { entryBookStore, JournalEntry } from '../stores/entryBookStore';
import { accountsStore } from '../../accounts/stores/accountsStore';
import { useTranslation } from '../../../translations';
import { accountsApi } from '../../../services/apiAdapter';
import { authStore } from '../../../stores/authStore';
import { devLog } from '../../../services/utils';

type ViewMode = 'cards' | 'list';

const EntryBooks: Component = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [isAddModalOpen, setIsAddModalOpen] = createSignal(false);
  //const [isQuickEntryModalOpen, setIsQuickEntryModalOpen] = createSignal(false);
  //const [isManageTemplatesModalOpen, setIsManageTemplatesModalOpen] = createSignal(false);
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = createSignal(false);
  const [isTemplateLauncherOpen, setIsTemplateLauncherOpen] = createSignal(false);
  const [editingEntry, setEditingEntry] = createSignal<JournalEntry | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = createSignal(false);
  const [selectedEntryId, setSelectedEntryId] = createSignal<string | null>(null);
  const [selectedStatus, setSelectedStatus] = createSignal<'all' | 'draft' | 'posted' | 'void'>('all');
  const [selectedAccount, setSelectedAccount] = createSignal<string>('all');
  const [dateFrom, setDateFrom] = createSignal('');
  const [dateTo, setDateTo] = createSignal('');
  const [sortBy, setSortBy] = createSignal<'date' | 'entryNumber' | 'amount'>('date');
  const [sortOrder, setSortOrder] = createSignal<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = createSignal('');
  const [loadingData, setLoadingData] = createSignal(false);

  // View mode toggle
  const [viewMode, setViewMode] = createSignal<ViewMode>('list');

  // Pagination for list view
  const PAGE_SIZE = 30;
  const [displayCount, setDisplayCount] = createSignal(PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = createSignal(false);
  let tableContainerRef: HTMLDivElement | undefined;

  const headerStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '2rem'
  };

  const filtersStyle = {
    display: 'flex',
    gap: '1rem',
    'align-items': 'center',
    'margin-bottom': '2rem',
    padding: '1.5rem',
    background: 'var(--surface-color)',
    'border-radius': 'var(--border-radius)',
    border: '1px solid var(--border-color)',
    'flex-wrap': 'wrap'
  };

  const statsGridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    'margin-bottom': '2rem'
  };

  // View toggle styles
  const viewToggleContainerStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    background: 'var(--surface-color)',
    padding: '0.25rem',
    'border-radius': '8px',
    border: '1px solid var(--border-color)'
  };

  const viewToggleButtonStyle = (isActive: boolean) => ({
    padding: '0.5rem 1rem',
    border: 'none',
    'border-radius': '6px',
    cursor: 'pointer',
    'font-size': '0.875rem',
    'font-weight': '500',
    background: isActive ? 'var(--primary-color)' : 'transparent',
    color: isActive ? 'white' : 'var(--text-muted)',
    transition: 'all 0.2s ease',
    display: 'flex',
    'align-items': 'center',
    gap: '0.375rem'
  });

  // List view table styles
  const tableStyle = {
    width: '100%',
    'border-collapse': 'collapse' as const
  };

  const thStyle = {
    padding: '0.75rem 1rem',
    'text-align': 'left' as const,
    'font-weight': '600',
    'font-size': '0.875rem',
    'border-bottom': '2px solid var(--border-color)',
    background: '#fff',
    position: 'sticky' as const,
    top: 0,
    'z-index': 10,
    'box-shadow': '0 1px 3px rgba(0,0,0,0.1)'
  };

  const tdStyle = {
    padding: '0.75rem 1rem',
    'border-bottom': '1px solid var(--border-color)',
    'vertical-align': 'middle' as const,
    'font-size': '0.875rem'
  };

  const getStatusBadgeStyle = (status: string) => {
    const colors: Record<string, { bg: string; color: string }> = {
      draft: { bg: '#fff3e0', color: '#f57c00' },
      posted: { bg: '#e8f5e9', color: '#388e3c' },
      void: { bg: '#ffebee', color: '#d32f2f' }
    };
    const { bg, color } = colors[status] || { bg: '#f5f5f5', color: '#757575' };
    return {
      padding: '0.25rem 0.625rem',
      'border-radius': '12px',
      'font-size': '0.75rem',
      'font-weight': '500',
      background: bg,
      color: color
    };
  };


  const getStatusOptions = () => [
    { value: 'all', label: t('journal.allEntries', 'All Entries') },
    { value: 'draft', label: t('journal.draft') },
    { value: 'posted', label: t('journal.posted') },
    { value: 'void', label: t('entryBooks.void', 'Void') }
  ];

  const getAccountOptions = () => [
    { value: 'all', label: t('accounts.allAccounts', 'All Accounts') },
    ...accountsStore.accounts.map(account => ({
      value: account.id,
      label: `${account.accountNumber} - ${account.name}`
    }))
  ];

  const getSortOptions = () => [
    { value: 'date', label: t('common.date') },
    { value: 'entryNumber', label: t('journal.entryNumber') },
    { value: 'amount', label: t('common.amount') }
  ];

  // Handle scroll for infinite loading in list view
  const handleListScroll = () => {
    if (!tableContainerRef || isLoadingMore()) return;

    const { scrollTop, scrollHeight, clientHeight } = tableContainerRef;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

    if (scrollPercentage > 0.8) {
      const allEntries = allFilteredEntries();
      if (displayCount() < allEntries.length) {
        setIsLoadingMore(true);
        setTimeout(() => {
          setDisplayCount(prev => Math.min(prev + PAGE_SIZE, allEntries.length));
          setIsLoadingMore(false);
        }, 100);
      }
    }
  };

  // Reset pagination when filters change
  createEffect(() => {
    searchQuery();
    selectedStatus();
    selectedAccount();
    dateFrom();
    dateTo();
    setDisplayCount(PAGE_SIZE);
  });

  // All filtered entries (for counting and cards view)
  const allFilteredEntries = createMemo(() => {
    let entries = entryBookStore.journalEntries;

    // Filter by status
    if (selectedStatus() !== 'all') {
      entries = entries.filter(entry => entry.status === selectedStatus());
    }

    // Filter by account
    if (selectedAccount() !== 'all') {
      entries = entries.filter(entry =>
        entry.lines.some(line => line.accountId === selectedAccount())
      );
    }

    // Filter by date range
    if (dateFrom()) {
      //entries = entries.filter(entry => entry.date >= dateFrom());
    }
    if (dateTo()) {
      //entries = entries.filter(entry => entry.date <= dateTo());
    }

    // Sort entries
    entries = [...entries].sort((a, b) => {
      let comparison = 0;

      switch (sortBy()) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'entryNumber':
          comparison = a.entryNumber.localeCompare(b.entryNumber);
          break;
        case 'amount':
          comparison = a.totalDebit - b.totalDebit;
          break;
      }

      return sortOrder() === 'asc' ? comparison : -comparison;
    });

    return entries;
  });

  // Displayed entries for list view (with pagination)
  const displayedEntries = () => {
    return allFilteredEntries().slice(0, displayCount());
  };

  const getFilteredAndSortedEntries = () => {
    return allFilteredEntries();
  };

  const getStats = () => {
    const entries = entryBookStore.journalEntries;
  
    const draftEntries = entries.filter(e => e.status === 'draft');
    const postedEntries = entries.filter(e => e.status === 'posted');
    const voidEntries = entries.filter(e => e.status === 'void');
    
    const totalDebit = postedEntries.reduce((sum, entry) => sum + entry.totalDebit, 0);
    const totalCredit = postedEntries.reduce((sum, entry) => sum + entry.totalCredit, 0);
    
    const unreconciledEntries = entries.filter(entry => 
      entry.lines.some(line => ['1001', '1002', '1003'].includes(line.accountId) && !line.reconciled)
    ).length;

    return {
      totalEntries: entries.length,
      draftEntries: draftEntries.length,
      postedEntries: postedEntries.length,
      voidEntries: voidEntries.length,
      totalDebit,
      totalCredit,
      unreconciledEntries
    };
  };

  const handleEntryClick = (entry: JournalEntry) => {
    setSelectedEntryId(entry.id);
    setIsDetailModalOpen(true);
  };

  const handleAddEntry = () => {
    setEditingEntry(null);
    setIsAddModalOpen(true);
  };



  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setEditingEntry(null);
  };



  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const stats = getStats();
  const filteredwEntries = getFilteredAndSortedEntries();



 const loadsAccount = async() => {
    let acns  = await accountsApi.getAlls(authStore.getBusinessId());
    accountsStore.updAccount(acns);
 }
  // Load initial data
  onMount(() => {
    loadsAccount();
    setTimeout(() => {

      //searchAccount();
      loadsAccount();
      entryBookStore.refreshData({});
    }, 450);

  });

  // Watch for ?entry= query parameter to open entry detail
  createEffect(() => {
    const entryParamRaw = searchParams.entry;
    const entryParam = Array.isArray(entryParamRaw) ? entryParamRaw[0] : entryParamRaw;

    if (entryParam && entryBookStore.journalEntries.length > 0) {
      // Try to find entry by id, entryNumber, or comprobanteId
      const foundEntry = entryBookStore.journalEntries.find(entry =>
        entry.id === entryParam ||
        entry.entryNumber === entryParam ||
        (entry as any).comprobanteId === entryParam ||
        entry.id?.includes(entryParam) ||
        entry.entryNumber?.includes(entryParam)
      );

      if (foundEntry) {
        devLog('📖 Opening entry from URL:', entryParam, foundEntry);
        setSelectedEntryId(foundEntry.id);
        setIsDetailModalOpen(true);
        // Clear the query param after opening
        setSearchParams({ entry: undefined });
      } else {
        console.warn('⚠️ Entry not found:', entryParam);
        // Try searching with the param
        setSearchQuery(entryParam);
      }
    }
  });

  // Create effect to reload data when search query changes
  createEffect(() => {
    const search = searchQuery();
    const status = selectedStatus();
    const dateFromValue = dateFrom();
    const dateToValue = dateTo();
    
    // Debounce search to avoid too many API calls
    const timeoutId = setTimeout(() => {
      entryBookStore.refreshData({
        search: search || undefined,
        status: status === 'all' ? undefined : status as any,
        dateFrom: dateFromValue || undefined,
        dateTo: dateToValue || undefined
      });
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  });

  return (
    <Layout title={t('entryBooks.title')}>
      <div style={headerStyle}>
        <div>
          <h2 style={{ margin: '0 0 0.5rem 0', 'font-size': '1.5rem' }}>{t('journal.title')}</h2>
          <p style={{ margin: '0', color: 'var(--text-muted)' }}>
            {t('entryBooks.subtitle', 'Manage accounting entries and general ledger records')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', 'align-items': 'center' }}>
          {/* View Toggle */}
          <div style={viewToggleContainerStyle}>
            <button
              style={viewToggleButtonStyle(viewMode() === 'cards')}
              onClick={() => setViewMode('cards')}
              title="Vista de tarjetas"
            >
              <span>🗂️</span> Tarjetas
            </button>
            <button
              style={viewToggleButtonStyle(viewMode() === 'list')}
              onClick={() => setViewMode('list')}
              title="Vista de lista"
            >
              <span>📋</span> Lista
            </button>
          </div>

          <Button
            variant="outline"
            onClick={() => {
              loadsAccount();
              setIsTemplateManagerOpen(true)
            }}
            style={{
              background: '#9c27b0',
              color: 'white',
              'border-color': '#9c27b0'
            }}
            title="Administrar Plantillas Dinámicas"
          >
            Administrar Plantillas
          </Button>

          <Button variant="primary" onClick={handleAddEntry}>
            {t('journal.addEntry', 'Add Journal Entry')}
          </Button>
        </div>
      </div>

      <div style={statsGridStyle}>
        <Card title={t('entryBooks.totalEntries', 'Total Entries')} subtitle={t('entryBooks.allJournalEntries', 'All journal entries')}>
          <div style={{ 'font-size': '1.5rem', 'font-weight': '600', color: 'var(--primary-color)', 'margin-bottom': '0.5rem' }}>
            {stats.totalEntries}
          </div>
          <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
            {stats.postedEntries} {t('journal.posted').toLowerCase()} • {stats.draftEntries} {t('journal.draft').toLowerCase()}
            {stats.voidEntries > 0 && ` • ${stats.voidEntries} ${t('entryBooks.void', 'void').toLowerCase()}`}
          </div>
        </Card>

        <Card title={t('journal.totalDebits')} subtitle={t('entryBooks.postedEntriesOnly', 'Posted entries only')}>
          <div style={{ 'font-size': '1.5rem', 'font-weight': '600', color: '#4caf50', 'margin-bottom': '0.5rem' }}>
            {formatCurrency(stats.totalDebit)}
          </div>
          <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
            {t('entryBooks.fromPostedEntries', 'From {count} posted entries').replace('{count}', stats.postedEntries.toString())}
          </div>
        </Card>

        <Card title={t('journal.totalCredits')} subtitle={t('entryBooks.postedEntriesOnly', 'Posted entries only')}>
          <div style={{ 'font-size': '1.5rem', 'font-weight': '600', color: '#f44336', 'margin-bottom': '0.5rem' }}>
            {formatCurrency(stats.totalCredit)}
          </div>
          <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
            {t('entryBooks.fromPostedEntries', 'From {count} posted entries').replace('{count}', stats.postedEntries.toString())}
          </div>
        </Card>

        <Card title={t('banking.unreconciled', 'Unreconciled')} subtitle={t('banking.title')}>
          <div style={{ 'font-size': '1.5rem', 'font-weight': '600', color: stats.unreconciledEntries > 0 ? '#ff9800' : '#4caf50', 'margin-bottom': '0.5rem' }}>
            {stats.unreconciledEntries}
          </div>
          <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
            {stats.unreconciledEntries > 0 ? t('entryBooks.needBankReconciliation', 'Need bank reconciliation') : t('entryBooks.allReconciled', 'All reconciled')}
          </div>
        </Card>
      </div>

      <div style={filtersStyle}>
        <div style={{ 'min-width': '90%' }}>
          <label style={{ display: 'block', 'margin-bottom': '0.5rem', 'font-weight': '500', 'font-size': '0.875rem' }}>
            {t('common.search', 'Search')}
          </label>
          <input
            type="text"
            value={searchQuery()}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('entryBooks.searchPlaceholder', 'Search by description, reference...')}
            style={{
              padding: '0.75rem',
              border: '1px solid var(--border-color)',
              'border-radius': 'var(--border-radius-sm)',
              'font-family': 'inherit',
              width: '100%'
            }}
          />
        </div>
        <div style={{ 'min-width': '150px' }}>
          <label style={{ display: 'block', 'margin-bottom': '0.5rem', 'font-weight': '500', 'font-size': '0.875rem' }}>
            {t('common.status')}
          </label>
          <FormSelect
            label=""
            value={selectedStatus()}
            onChange={setSelectedStatus}
            options={getStatusOptions()}
          />
        </div>

        <div style={{ 'max-width': '300px' }}>
          <label style={{ display: 'block', 'margin-bottom': '0.5rem', 'font-weight': '500', 'font-size': '0.875rem' }}>
            {t('journal.account')}
          </label>
          <FormSelect
            label=""
            value={selectedAccount()}
            onChange={setSelectedAccount}
            options={getAccountOptions()}
          />
        </div>

        

        <div style={{ 'min-width': '130px' }}>
          <label style={{ display: 'block', 'margin-bottom': '0.5rem', 'font-weight': '500', 'font-size': '0.875rem' }}>
            {t('entryBooks.fromDate', 'From Date')}
          </label>
          <input
            type="date"
            value={dateFrom()}
            onChange={(e) => setDateFrom(e.target.value)}
            style={{
              padding: '0.75rem',
              border: '1px solid var(--border-color)',
              'border-radius': 'var(--border-radius-sm)',
              'font-family': 'inherit',
              width: '100%'
            }}
          />
        </div>

        <div style={{ 'min-width': '130px' }}>
          <label style={{ display: 'block', 'margin-bottom': '0.5rem', 'font-weight': '500', 'font-size': '0.875rem' }}>
            {t('entryBooks.toDate', 'To Date')}
          </label>
          <input
            type="date"
            value={dateTo()}
            onChange={(e) => setDateTo(e.target.value)}
            style={{
              padding: '0.75rem',
              border: '1px solid var(--border-color)',
              'border-radius': 'var(--border-radius-sm)',
              'font-family': 'inherit',
              width: '100%'
            }}
          />
        </div>

        <div style={{ 'min-width': '120px' }}>
          <label style={{ display: 'block', 'margin-bottom': '0.5rem', 'font-weight': '500', 'font-size': '0.875rem' }}>
            {t('entryBooks.sortBy', 'Sort By')}
          </label>
          <FormSelect
            label=""
            value={sortBy()}
            onChange={setSortBy}
            options={getSortOptions()}
          />
        </div>

        <div style={{ 'min-width': '100px' }}>
          <label style={{ display: 'block', 'margin-bottom': '0.5rem', 'font-weight': '500', 'font-size': '0.875rem' }}>
            {t('entryBooks.order', 'Order')}
          </label>
          <FormSelect
            label=""
            value={sortOrder()}
            onChange={setSortOrder}
            options={[
              { value: 'desc', label: t('entryBooks.newest', 'Newest') },
              { value: 'asc', label: t('entryBooks.oldest', 'Oldest') }
            ]}
          />
        </div>

        <div style={{ display: 'flex', 'align-items': 'end', gap: '0.5rem' }}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedStatus('all');
              setSelectedAccount('all');
              setDateFrom('');
              setDateTo('');
              setSearchQuery('');
              setSortBy('date');
              setSortOrder('desc');
            }}
          >
            {t('entryBooks.resetFilters', 'Reset Filters')}
          </Button>
        </div>
      </div>

      

      {/* Active Filters Display */}
      {(selectedStatus() !== 'all' || selectedAccount() !== 'all' || dateFrom() || dateTo()) && (
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          'align-items': 'center',
          'margin-bottom': '1rem',
          padding: '0.75rem',
          background: 'var(--surface-color)',
          'border-radius': 'var(--border-radius-sm)',
          border: '1px solid var(--border-color)'
        }}>
          <span style={{ 'font-size': '0.875rem', 'font-weight': '500' }}>{t('entryBooks.activeFilters', 'Active filters')}:</span>
          {selectedStatus() !== 'all' && (
            <span style={{
              padding: '0.25rem 0.5rem',
              background: 'var(--primary-color)',
              color: 'white',
              'border-radius': '12px',
              'font-size': '0.75rem'
            }}>
              {t('common.status')}: {selectedStatus()}
            </span>
          )}
          {selectedAccount() !== 'all' && (
            <span style={{
              padding: '0.25rem 0.5rem',
              background: 'var(--primary-color)',
              color: 'white',
              'border-radius': '12px',
              'font-size': '0.75rem'
            }}>
              {t('journal.account')}: {accountsStore.getAccountById(selectedAccount())?.name || t('common.unknown', 'Unknown')}
            </span>
          )}
          {dateFrom() && (
            <span style={{
              padding: '0.25rem 0.5rem',
              background: 'var(--primary-color)',
              color: 'white',
              'border-radius': '12px',
              'font-size': '0.75rem'
            }}>
              {t('entryBooks.from', 'From')}: {dateFrom()}
            </span>
          )}
          {dateTo() && (
            <span style={{
              padding: '0.25rem 0.5rem',
              background: 'var(--primary-color)',
              color: 'white',
              'border-radius': '12px',
              'font-size': '0.75rem'
            }}>
              {t('entryBooks.to', 'To')}: {dateTo()}
            </span>
          )}
          <span style={{ 'margin-left': 'auto', 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
            {entryBookStore.journalEntries.length} {t('entryBooks.entriesFound', '{count} entries found').replace('{count}', entryBookStore.journalEntries.length.toString())}
          </span>
        </div>
      )}

      {entryBookStore.journalEntries.length === 0 ? (
        <Card title={t('entryBooks.noJournalEntries', 'No Journal Entries')} subtitle={t('entryBooks.startByCreating', 'Start by creating your first entry')}>
          <div style={{ 'text-align': 'center', color: 'var(--text-muted)', padding: '2rem' }}>
            {t('entryBooks.noEntriesMatch', 'No journal entries match your current filters.')}
            <br />
            <Button
              variant="primary"
              style={{ 'margin-top': '1rem' }}
              onClick={handleAddEntry}
            >
              {t('entryBooks.createFirstEntry', 'Create First Entry')}
            </Button>
          </div>
        </Card>
      ) : (
        <Show when={viewMode() === 'cards'} fallback={
          /* List View */
          <Card>
            <div style={{ padding: '0' }}>
              <div
                ref={tableContainerRef}
                onScroll={handleListScroll}
                style={{
                  'overflow-x': 'auto',
                  'overflow-y': 'auto',
                  'max-height': 'calc(100vh - 200px)',
                  'min-height': '300px'
                }}
              >
                <table style={tableStyle}>
                  <thead style={{ background: '#fff' }}>
                    <tr style={{ background: '#fff' }}>
                      <th style={thStyle}>{t('journal.entryNumber', 'Número')}</th>
                      <th style={thStyle}>{t('common.date', 'Fecha')}</th>
                      <th style={thStyle}>{t('journal.description', 'Descripción')}</th>
                      <th style={thStyle}>{t('journal.reference', 'Referencia')}</th>
                      <th style={{ ...thStyle, 'text-align': 'right' }}>{t('journal.debit', 'Débito')}</th>
                      <th style={{ ...thStyle, 'text-align': 'right' }}>{t('journal.credit', 'Crédito')}</th>
                     
                    </tr>
                  </thead>
                  <tbody>
                    <For each={displayedEntries()}>
                      {(entry) => (
                        <tr
                          style={{ cursor: 'pointer', transition: 'background 0.2s' }}
                          onClick={() => handleEntryClick(entry)}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover, #f5f5f5)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <td style={tdStyle}>
                            <div style={{ 'font-weight': '600', color: 'var(--primary-color)' }}>
                              {entry.entryNumber || entry.comprobanteId || entry.id}
                            </div>
                          </td>
                          <td style={tdStyle}>
                            {new Date(entry.date).toLocaleDateString('es-ES')}
                          </td>
                          <td style={tdStyle}>
                            <div style={{ 'max-width': '300px', overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' }}>
                              {entry.description}
                            </div>
                            <Show when={entry.lines.length > 0}>
                              <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', 'margin-top': '0.25rem' }}>
                                {entry.lines.length} {entry.lines.length === 1 ? 'línea' : 'líneas'}
                              </div>
                            </Show>
                          </td>
                          <td style={tdStyle}>
                            <Show when={entry.reference || entry.document} fallback={<span style={{ color: 'var(--text-muted)' }}>-</span>}>
                              <span style={{ 'font-family': 'monospace', 'font-size': '0.85rem' }}>{entry.reference || entry.document}</span>
                            </Show>
                          </td>
                          <td style={{ ...tdStyle, 'text-align': 'right', 'font-weight': '500', color: '#388e3c' }}>
                            {formatCurrency(entry.totalDebits)}
                          </td>
                          <td style={{ ...tdStyle, 'text-align': 'right', 'font-weight': '500', color: '#d32f2f' }}>
                            {formatCurrency(entry.totalCredits)}
                          </td>
                          
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>

                {/* Loading indicator for infinite scroll */}
                <Show when={isLoadingMore()}>
                  <div style={{ 'text-align': 'center', padding: '1rem', color: 'var(--text-muted)' }}>
                    Cargando más...
                  </div>
                </Show>
              </div>

              {/* Pagination info */}
              <div style={{
                display: 'flex',
                'justify-content': 'space-between',
                'align-items': 'center',
                padding: '0.75rem 1rem',
                'font-size': '0.85rem',
                color: 'var(--text-muted)',
                'border-top': '1px solid var(--border-color)'
              }}>
                <span>
                  Mostrando {displayedEntries().length} de {allFilteredEntries().length} asientos
                </span>
                <Show when={displayCount() < allFilteredEntries().length}>
                  <button
                    onClick={() => setDisplayCount(prev => Math.min(prev + PAGE_SIZE, allFilteredEntries().length))}
                    style={{
                      padding: '0.5rem 1rem',
                      'border-radius': 'var(--border-radius-sm)',
                      border: '1px solid var(--border-color)',
                      background: 'white',
                      cursor: 'pointer',
                      'font-size': '0.85rem'
                    }}
                  >
                    Cargar más ({allFilteredEntries().length - displayCount()} restantes)
                  </button>
                </Show>
              </div>
            </div>
          </Card>
        }>
          {/* Cards View */}
          <LazyEntryList
            entries={entryBookStore.journalEntries}
            onViewDetails={handleEntryClick}
            batchSize={60}
          />
        </Show>
      )}

      <AddJournalEntryModal
        isOpen={isAddModalOpen()}
        onClose={handleCloseModal}
        editEntry={editingEntry()}
      />

     

      <JournalEntryDetailModal
        isOpen={isDetailModalOpen()}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedEntryId(null);
        }}
        entryId={selectedEntryId()}
        
      />

      <TemplateManager
        isOpen={isTemplateManagerOpen()}
        onClose={() => setIsTemplateManagerOpen(false)}
      />

      {/* Template Launcher Modal */}
      <Show when={isTemplateLauncherOpen()}>
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          'z-index': 1000
        }}>
          <div style={{
            background: 'var(--background-color)',
            'border-radius': 'var(--border-radius)',
            width: '96vw',
            'max-width': '1400px',
            height: '98vh',
            'max-height': '900px',
            overflow: 'hidden',
            'box-shadow': '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <TemplateLauncher
              onClose={() => setIsTemplateLauncherOpen(false)}
              onEntryCreated={(entry) => {
                // Refresh entries after creation
                entryBookStore.refreshData({});
                setIsTemplateLauncherOpen(false);
              }}
            />
          </div>
        </div>
      </Show>
    </Layout>
  );
};

export default EntryBooks;



/*
 <Button
            variant="outline"
            onClick={() => setIsTemplateLauncherOpen(true)}
            style={{
              background: '#2196f3',
              color: 'white',
              'border-color': '#2196f3'
            }}
            title="Crear asiento con plantilla"
          >
            Usar Plantilla
          </Button>

*/