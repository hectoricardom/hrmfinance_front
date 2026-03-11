/**
 * View 3: Unified Table Power View
 *
 * A spreadsheet-style view combining bank statements and entry book records
 * in a single sortable, filterable table. Features bulk operations,
 * keyboard navigation, and advanced filtering.
 *
 * Best for: Power users, high transaction volumes, complex reconciliations
 */
import { Component, createSignal, createMemo, Show, For } from 'solid-js';
import { Button } from '../../ui';
import { bankConsolidationStore, BankStatement, EntryBookRecord } from '../stores/bankConsolidationStore';
import { useTranslation } from '../../../translations';
import LazyRenderList from './LazyRenderList';

interface ReconciliationTableViewProps {
  bankAccountId: string;
  selectedPeriod: { start: string; end: string };
  bankStatements: BankStatement[];
  entryBookRecords: EntryBookRecord[];
}

type UnifiedRecord = {
  id: string;
  type: 'bank' | 'book';
  date: string;
  description: string;
  reference: string;
  debitAmount: number;
  creditAmount: number;
  isReconciled: boolean;
  reconciledWith?: string;
  matchScore?: number;
  matchCount?: number;
  original: BankStatement | EntryBookRecord;
};

type SortField = 'date' | 'type' | 'description' | 'amount' | 'status';
type SortDirection = 'asc' | 'desc';

const ReconciliationTableView: Component<ReconciliationTableViewProps> = (props) => {
  const { t } = useTranslation();
  const [selectedIds, setSelectedIds] = createSignal<Set<string>>(new Set());
  const [sortField, setSortField] = createSignal<SortField>('date');
  const [sortDirection, setSortDirection] = createSignal<SortDirection>('asc');
  const [filterType, setFilterType] = createSignal<'all' | 'bank' | 'book'>('all');
  const [filterStatus, setFilterStatus] = createSignal<'all' | 'unreconciled' | 'reconciled'>('unreconciled');
  const [searchTerm, setSearchTerm] = createSignal('');
  const [showMatchPanel, setShowMatchPanel] = createSignal(false);
  const [matchingBankId, setMatchingBankId] = createSignal<string | null>(null);
  const [reconcilingBankId, setReconcilingBankId] = createSignal<string | null>(null);

   const [showInit, setShowInit] = createSignal(false);
  // Combine and transform records from props
  const unifiedRecords = createMemo((): UnifiedRecord[] => {
    const records: UnifiedRecord[] = [];

    // Add bank statements from props
    /*
    .filter(s =>
        s.date >= props.selectedPeriod.start &&
        s.date <= props.selectedPeriod.end
      )
    */
    props.bankStatements
      .forEach(s => {
        const matches = bankConsolidationStore.getMatchDetails(s.id);
        records.push({
          id: `bank_${s.id}`,
          type: 'bank',
          date: s.date,
          description: s.description,
          reference: s.reference || '',
          debitAmount: s.debitAmount,
          creditAmount: s.creditAmount,
          isReconciled: s.isReconciled,
          reconciledWith: s.reconciledWith,
          matchScore: matches.length > 0 ? matches[0].score : undefined,
          matchCount: matches.length,
          original: s
        });
      });



    // Add entry book records from props
    props.entryBookRecords
      .filter(r =>
        r.date >= props.selectedPeriod.start &&
        r.date <= props.selectedPeriod.end
      )
      .forEach(r => {
        records.push({
          id: `book_${r.id}`,
          type: 'book',
          date: r.date,
          description: r.description,
          reference: r.reference || '',
          debitAmount: r.debitAmount,
          creditAmount: r.creditAmount,
          isReconciled: r.isReconciled,
          reconciledWith: r.reconciledWith,
          original: r
        });
      });

    return records;
  });

  // Filter and sort records
  const filteredRecords = createMemo(() => {
    
    let records = [...unifiedRecords()];

    // Filter by type
    if (filterType() !== 'all') {
      records = records.filter(r => r.type === filterType());
    }

    // Filter by status
    if (filterStatus() === 'unreconciled') {
      records = records.filter(r => !r.isReconciled);
    } else if (filterStatus() === 'reconciled') {
      records = records.filter(r => r.isReconciled);
    }

    // Search filter
    if (searchTerm()) {
      const term = searchTerm().toLowerCase();
      records = records.filter(r =>
        r.description.toLowerCase().includes(term) ||
        r.reference.toLowerCase().includes(term)
      );
    }

    // Sort
    records.sort((a, b) => {
      let comparison = 0;
      switch (sortField()) {
        case 'date':
          comparison = a.date.localeCompare(b.date);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'description':
          comparison = a.description.localeCompare(b.description);
          break;
        case 'amount':
          const amountA = a.debitAmount || -a.creditAmount;
          const amountB = b.debitAmount || -b.creditAmount;
          comparison = amountA - amountB;
          break;
        case 'status':
          comparison = (a.isReconciled ? 1 : 0) - (b.isReconciled ? 1 : 0);
          break;
      }
      return sortDirection() === 'asc' ? comparison : -comparison;
    });
    setShowInit(true)
    return records;
  });

  // Get potential matches for selected bank statement
  const potentialMatches = createMemo(() => {
    const bankId = matchingBankId();
    if (!bankId) return [];

    const actualId = bankId.replace('bank_', '');
    return bankConsolidationStore.getMatchDetails(actualId);
  });

  // Stats
  const stats = createMemo(() => {
    const all = unifiedRecords();
    return {
      total: all.length,
      bank: all.filter(r => r.type === 'bank').length,
      book: all.filter(r => r.type === 'book').length,
      reconciled: all.filter(r => r.isReconciled).length,
      unreconciled: all.filter(r => !r.isReconciled).length
    };
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-EN', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField() === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    const allIds = filteredRecords()
      .filter(r => !r.isReconciled)
      .map(r => r.id);
    setSelectedIds(new Set(allIds));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const openMatchPanel = (bankId: string) => {
    setMatchingBankId(bankId);
    setShowMatchPanel(true);
  };

  const handleReconcile = (bankId: string, bookId: string) => {
    setReconcilingBankId(bookId);
    setTimeout(() => {
    
      const actualBankId = bankId.replace('bank_', '');
      const actualBookId = bookId.replace('book_', '');
      bankConsolidationStore.reconcileTransaction(actualBankId, actualBookId);
      setShowMatchPanel(false);
      setMatchingBankId(null);
      clearSelection();
      setReconcilingBankId(null);
    }, 250);
  };

  const handleBulkAutoReconcile = () => {
    const selected = Array.from(selectedIds());
    const bankStatementsToReconcile = selected
      .filter(id => id.startsWith('bank_'))
      .map(id => id.replace('bank_', ''));

    bankStatementsToReconcile.forEach(bankId => {
      const matches = bankConsolidationStore.getMatchDetails(bankId);
      if (matches.length === 1 && matches[0].score >= 8) {
        bankConsolidationStore.reconcileTransaction(bankId, matches[0].record.id);
      }
    });

    clearSelection();
  };

  // Styles
  const containerStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    height: '100%',
    'min-height': '600px'
  };

  const toolbarStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '1rem',
    'flex-wrap': 'wrap' as const,
    gap: '0.75rem',
    padding: '0.75rem',
    background: 'var(--surface-color)',
    'border-radius': '8px',
    border: '1px solid var(--border-color)'
  };

  const filterGroupStyle = {
    display: 'flex',
    gap: '0.5rem',
    'align-items': 'center'
  };

  const selectStyle = {
    padding: '0.4rem 0.75rem',
    border: '1px solid var(--border-color)',
    'border-radius': '4px',
    background: 'white',
    'font-size': '0.85rem'
  };

  const tableContainerStyle = {
    flex: 1,
    overflow: 'auto',
    border: '1px solid var(--border-color)',
    'border-radius': '8px'
  };

  const tableStyle = {
    width: '100%',
    'border-collapse': 'collapse' as const,
    'font-size': '0.85rem'
  };

  const thStyle = (field: SortField) => ({
    padding: '0.75rem',
    background: 'var(--gray-100)',
    'text-align': 'left' as const,
    'font-weight': '600',
    'border-bottom': '2px solid var(--border-color)',
    cursor: 'pointer',
    'user-select': 'none' as const,
    'white-space': 'nowrap' as const,
    color: sortField() === field ? 'var(--primary-color)' : 'inherit'
  });

  const tdStyle = {
    padding: '0.6rem 0.75rem',
    'border-bottom': '1px solid var(--border-color)',
    'vertical-align': 'middle' as const
  };

  const rowStyle = (record: UnifiedRecord) => ({
    background: selectedIds().has(record.id)
      ? 'var(--primary-light, #e3f2fd)'
      : record.isReconciled
        ? '#f1f8e9'
        : 'white',
    transition: 'background 0.15s'
  });

  const typeBadgeStyle = (type: 'bank' | 'book') => ({
    display: 'inline-flex',
    'align-items': 'center',
    gap: '0.25rem',
    padding: '0.2rem 0.5rem',
    'border-radius': '4px',
    'font-size': '0.75rem',
    'font-weight': '600',
    background: type === 'bank' ? '#e3f2fd' : '#f3e5f5',
    color: type === 'bank' ? '#1976d2' : '#7b1fa2'
  });

  const matchBadgeStyle = (score: number) => ({
    display: 'inline-flex',
    'align-items': 'center',
    padding: '0.15rem 0.4rem',
    'border-radius': '4px',
    'font-size': '0.7rem',
    'font-weight': '600',
    background: score >= 8 ? '#e8f5e9' : score >= 6 ? '#fff3e0' : '#fafafa',
    color: score >= 8 ? '#2e7d32' : score >= 6 ? '#ef6c00' : '#757575',
    cursor: 'pointer'
  });

  const matchPanelStyle = {
    position: 'fixed' as const,
    top: 0,
    right: 0,
    width: '400px',
    height: '100%',
    background: 'var(--surface-color)',
    'box-shadow': '-4px 0 20px rgba(0,0,0,0.15)',
    'z-index': 1000,
    display: 'flex',
    'flex-direction': 'column' as const
  };

  const overlayStyle = {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.3)',
    'z-index': 999
  };

  return (
    <Show when={showInit()} >
    <div style={containerStyle}>
      {/* Toolbar */}
      <div style={toolbarStyle}>
        <div style={filterGroupStyle}>
          <select
            style={selectStyle}
            value={filterType()}
            onChange={(e) => setFilterType(e.target.value as any)}
          >
            <option value="all">{t('common.all', 'Todos')} ({stats().total})</option>
            <option value="bank">🏦 {t('banking.bankStatements', 'Banco')} ({stats().bank})</option>
            <option value="book">📒 {t('banking.entryBookRecords', 'Libro')} ({stats().book})</option>
          </select>

          <select
            style={selectStyle}
            value={filterStatus()}
            onChange={(e) => setFilterStatus(e.target.value as any)}
          >
            <option value="unreconciled">{t('banking.pending', 'Pendientes')} ({stats().unreconciled})</option>
            <option value="reconciled">{t('banking.reconciled', 'Conciliados')} ({stats().reconciled})</option>
            <option value="all">{t('common.all', 'Todos')}</option>
          </select>

          <input
            type="text"
            placeholder={t('common.search', 'Buscar...')}
            value={searchTerm()}
            onInput={(e) => setSearchTerm(e.target.value)}
            style={{
              ...selectStyle,
              'min-width': '180px'
            }}
          />
        </div>

        <div style={filterGroupStyle}>
          <Show when={selectedIds().size > 0}>
            <span style={{ 'font-size': '0.85rem', color: 'var(--text-muted)' }}>
              {selectedIds().size} {t('common.selected', 'seleccionados')}
            </span>
            <Button variant="outline" onClick={clearSelection}>
              {t('common.clear', 'Limpiar')}
            </Button>
            <Button variant="secondary" onClick={handleBulkAutoReconcile}>
              ⚡ {t('banking.autoReconcileSelected', 'Auto-conciliar')}
            </Button>
          </Show>
          <Show when={selectedIds().size === 0}>
            <Button variant="outline" onClick={selectAll}>
              {t('common.selectAll', 'Seleccionar todo')}
            </Button>
          </Show>
        </div>
      </div>

      {/* Table */}
      <div style={tableContainerStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={{ ...tdStyle, width: '40px', background: 'var(--gray-100)' }}>
                <input
                  type="checkbox"
                  checked={selectedIds().size > 0 && selectedIds().size === filteredRecords().filter(r => !r.isReconciled).length}
                  onChange={(e) => e.target.checked ? selectAll() : clearSelection()}
                />
              </th>
              <th style={thStyle('type')} onClick={() => handleSort('type')}>
                {t('common.type', 'Tipo')}
                {sortField() === 'type' && (sortDirection() === 'asc' ? ' ↑' : ' ↓')}
              </th>
              <th style={thStyle('date')} onClick={() => handleSort('date')}>
                {t('common.date', 'Fecha')}
                {sortField() === 'date' && (sortDirection() === 'asc' ? ' ↑' : ' ↓')}
              </th>
              <th style={thStyle('description')} onClick={() => handleSort('description')}>
                {t('common.description', 'Descripción')}
                {sortField() === 'description' && (sortDirection() === 'asc' ? ' ↑' : ' ↓')}
              </th>
              <th style={{ ...tdStyle, background: 'var(--gray-100)' }}>
                {t('common.reference', 'Ref')}
              </th>
              <th style={thStyle('amount')} onClick={() => handleSort('amount')}>
                {t('common.amount', 'Monto')}
                {sortField() === 'amount' && (sortDirection() === 'asc' ? ' ↑' : ' ↓')}
              </th>
              <th style={thStyle('status')} onClick={() => handleSort('status')}>
                {t('common.status', 'Estado')}
                {sortField() === 'status' && (sortDirection() === 'asc' ? ' ↑' : ' ↓')}
              </th>
              <th style={{ ...tdStyle, background: 'var(--gray-100)', width: '100px' }}>
                {t('common.actions', 'Acciones')}
              </th>
            </tr>
          </thead>
        </table>
        {/* Lazy rendered table body */}
        <LazyRenderList
          items={filteredRecords()}
          batchSize={25}
          initialBatchSize={40}
          emptyMessage={t('common.noData', 'No hay datos')}
          containerStyle={{ 'max-height': '500px' }}
          renderItem={(record) => (
            <table style={{ ...tableStyle, 'table-layout': 'fixed' as const }}>
              <tbody>
                <tr style={rowStyle(record)}>
                  <td style={{ ...tdStyle, width: '40px' }}>
                    <Show when={!record.isReconciled}>
                      <input
                        type="checkbox"
                        checked={selectedIds().has(record.id)}
                        onChange={() => toggleSelection(record.id)}
                      />
                    </Show>
                  </td>
                  <td style={{ ...tdStyle, width: '90px' }}>
                    <span style={typeBadgeStyle(record.type)}>
                      {record.type === 'bank' ? '🏦' : '📒'}
                      {record.type === 'bank' ? 'Banco' : 'Libro'}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, width: '85px' }}>{formatDate(record.date)}</td>
                  <td style={{ ...tdStyle }}>
                    <div style={{
                      'white-space': 'nowrap',
                      overflow: 'hidden',
                      'text-overflow': 'ellipsis'
                    }} title={record.description}>
                      {record.description}
                    </div>
                  </td>
                  <td style={{ ...tdStyle, 'font-size': '0.8rem', color: 'var(--text-muted)', width: '80px' }}>
                    {record.reference || '-'}
                  </td>
                  <td style={{
                    ...tdStyle,
                    'font-weight': '600',
                    color: record.debitAmount > 0 ? '#4caf50' : '#f44336',
                    'text-align': 'right' as const,
                    width: '100px'
                  }}>
                    {record.debitAmount > 0
                      ? formatCurrency(record.debitAmount)
                      : `-${formatCurrency(record.creditAmount)}`
                    }
                  </td>
                  <td style={{ ...tdStyle, width: '120px' }}>
                    <Show when={record.isReconciled} fallback={
                      <Show when={record.type === 'bank' && record.matchCount && record.matchCount > 0}>
                        <span
                          style={matchBadgeStyle(record.matchScore || 0)}
                          onClick={() => openMatchPanel(record.id)}
                        >
                          {record.matchCount} {record.matchCount === 1 ? 'match' : 'matches'}
                        </span>
                      </Show>
                    }>
                      <span style={{
                        color: '#4caf50',
                        'font-size': '0.85rem',
                        display: 'flex',
                        'align-items': 'center',
                        gap: '0.25rem'
                      }}>
                        ✓ {t('banking.reconciled', 'Conciliado')}
                      </span>
                    </Show>
                  </td>
                  <td style={{ ...tdStyle, width: '100px' }}>
                    <Show when={!record.isReconciled && record.type === 'bank'}>
                      <Button
                        variant="outline"
                        onClick={() => openMatchPanel(record.id)}
                        style={{ 'font-size': '0.75rem', padding: '0.15rem 0.15rem' }}
                      >
                        Link
                      </Button>
                    </Show>
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        />
      </div>

      {/* Match Side Panel */}
      <Show when={showMatchPanel()}>
        <div style={overlayStyle} onClick={() => setShowMatchPanel(false)} />
        <div style={matchPanelStyle}>
          <div style={{
            padding: '1rem',
            'border-bottom': '1px solid var(--border-color)',
            display: 'flex',
            'justify-content': 'space-between',
            'align-items': 'center'
          }}>
            <h3 style={{ margin: 0 }}>{t('banking.selectMatch', 'Seleccionar Coincidencia')}</h3>
            <button
              onClick={() => setShowMatchPanel(false)}
              style={{
                background: 'none',
                border: 'none',
                'font-size': '1.5rem',
                cursor: 'pointer',
                color: 'var(--text-muted)'
              }}
            >
              ×
            </button>
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
            <Show when={potentialMatches().length > 0} fallback={
              <div style={{ 'text-align': 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                {t('banking.noMatchesFound', 'No se encontraron coincidencias')}
              </div>
            }>
              <For each={potentialMatches()}>
                {(match) => (
                  
                  <div
                    style={{
                      padding: '1rem',
                      'margin-bottom': '0.75rem',
                      background: 'var(--gray-50)',
                      'border-radius': '8px',
                      'border-left': `4px solid ${match.score >= 8 ? '#4caf50' : match.score >= 6 ? '#ff9800' : '#9e9e9e'}`,
                      cursor: 'pointer'
                    }}
                    onClick={() => handleReconcile(matchingBankId()!, `book_${match.record.id}`)}
                  >
                   
                   
                    <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.5rem' }}>
                      
                      <Show when={reconcilingBankId() === `book_${match.record.id}`} 
                        fallback={
                          <span style={{
                            background: match.score >= 8 ? '#e8f5e9' : match.score >= 6 ? '#fff3e0' : '#fafafa',
                            color: match.score >= 8 ? '#2e7d32' : match.score >= 6 ? '#ef6c00' : '#757575',
                            padding: '0.2rem 0.5rem',
                            'border-radius': '4px',
                            'font-size': '0.75rem',
                            'font-weight': '600'
                          }}>
                            {Math.round(match.score * 10)}% match
                          </span>
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
                            background:  '#fafafa',
                            color:  '#757575',
                            padding: '0.2rem 0.5rem',
                            'border-radius': '4px',
                            'font-size': '0.75rem',
                            'font-weight': '600'
                          }}>
                             { 'Reconciliando...'}
                          </span>
                        </div>
                      </Show>
                      <span style={{
                        'font-weight': '600',
                        color: match.record.debitAmount > 0 ? '#4caf50' : '#f44336'
                      }}>
                        {match.record.debitAmount > 0
                          ? formatCurrency(match.record.debitAmount)
                          : `-${formatCurrency(match.record.creditAmount)}`
                        }
                      </span>
                    </div>
                    <div style={{ 'font-weight': '500', 'margin-bottom': '0.25rem' }}>
                      {match.record.description}
                    </div>
                    <div style={{ 'font-size': '0.8rem', color: 'var(--text-muted)' }}>
                      {formatDate(match.record.date)}
                      {match.record.reference && ` • Ref: ${match.record.reference}`}
                    </div>
                    <div style={{ 'margin-top': '0.5rem' }}>
                      <For each={match.reasons.slice(0, 3)}>
                        {(reason) => (
                          <span style={{
                            display: 'inline-block',
                            background: 'var(--gray-200)',
                            padding: '0.1rem 0.3rem',
                            'border-radius': '4px',
                            'font-size': '0.7rem',
                            'margin-right': '0.25rem'
                          }}>
                            ✓ {reason}
                          </span>
                        )}
                      </For>
                    </div>
                  </div>
                 
                )}
              </For>
            </Show>
          </div>
        </div>
      </Show>

      {/* Keyboard shortcuts hint */}
      <div style={{
        'text-align': 'center',
        padding: '0.5rem',
        'font-size': '0.75rem',
        color: 'var(--text-muted)',
        'margin-top': '0.5rem'
      }}>
        💡 {t('banking.tableViewTip', 'Haz clic en "matches" para ver coincidencias • Selecciona múltiples y usa Auto-conciliar')}
      </div>

    </div>
    </Show>
  );
};

export default ReconciliationTableView;
