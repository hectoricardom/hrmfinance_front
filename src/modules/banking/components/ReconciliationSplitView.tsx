/**
 * View 2: Split Panel View with Click-to-Match
 *
 * A side-by-side view with bank statements on the left and entry book records
 * on the right. Click on a bank statement, then click on an entry to match.
 * Features visual highlighting and smart suggestions.
 *
 * Best for: Desktop users, medium transaction volumes, visual learners
 */
import { Component, createSignal, createMemo, Show, For } from 'solid-js';
import { Button } from '../../ui';
import { bankConsolidationStore, BankStatement, EntryBookRecord } from '../stores/bankConsolidationStore';
import { useTranslation } from '../../../translations';

interface ReconciliationSplitViewProps {
  bankAccountId: string;
  selectedPeriod: { start: string; end: string };
  bankStatements: BankStatement[];
  entryBookRecords: EntryBookRecord[];
}

const ReconciliationSplitView: Component<ReconciliationSplitViewProps> = (props) => {
  const { t } = useTranslation();
  const [selectedStatement, setSelectedStatement] = createSignal<BankStatement | null>(null);
  const [selectedRecord, setSelectedRecord] = createSignal<EntryBookRecord | null>(null);
  const [filter, setFilter] = createSignal<'all' | 'unreconciled' | 'reconciled'>('unreconciled');
  const [searchTerm, setSearchTerm] = createSignal('');

  // Get filtered bank statements from props
  const filteredStatements = createMemo(() => {
    let statements = props.bankStatements
    /** 
      .filter(s =>
        s.date >= props.selectedPeriod.start &&
        s.date <= props.selectedPeriod.end
      );
    */
    if (filter() === 'unreconciled') {
      statements = statements.filter(s => !s.isReconciled);
    } else if (filter() === 'reconciled') {
      statements = statements.filter(s => s.isReconciled);
    }

    if (searchTerm()) {
      const term = searchTerm().toLowerCase();
      statements = statements.filter(s =>
        s.description.toLowerCase().includes(term) ||
        s.reference?.toLowerCase().includes(term)
      );
    }

    return statements.sort((a, b) => b.date.localeCompare(a.date));
  });

  // Get filtered entry book records from props
  const filteredRecords = createMemo(() => {
    let records = props.entryBookRecords
    /*  .filter(r =>
        r.date >= props.selectedPeriod.start &&
        r.date <= props.selectedPeriod.end
      );
    */
    if (filter() === 'unreconciled') {
      records = records.filter(r => !r.isReconciled);
    } else if (filter() === 'reconciled') {
      records = records.filter(r => r.isReconciled);
    }

    if (searchTerm()) {
      const term = searchTerm().toLowerCase();
      records = records.filter(r =>
        r.description.toLowerCase().includes(term) ||
        r.reference?.toLowerCase().includes(term)
      );
    }

    return records.sort((b, a) => a.date.toString()?.localeCompare(b.date.toString()));
  });

  // Get potential matches for selected statement
  const potentialMatches = createMemo(() => {
    const stmt = selectedStatement();
    if (!stmt) return new Map<string, number>();

    const matches = bankConsolidationStore.getMatchDetails(stmt.id);
    const matchMap = new Map<string, number>();
    matches.forEach(m => matchMap.set(m.record.id, m.score));
    return matchMap;
  });

  // Stats using props
  const stats = createMemo(() => {
    const totalStatements = filteredStatements().length;
    const totalRecords = filteredRecords().length;
    const reconciledStatements = props.bankStatements
      .filter(s =>
        s.isReconciled
        //&&
        //s.date >= props.selectedPeriod.start &&
        //s.date <= props.selectedPeriod.end
      ).length;

    return { totalStatements, totalRecords, reconciledStatements };
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short'
    });
  };

  const handleStatementClick = (statement: BankStatement) => {
    if (statement.isReconciled) return;
    setSelectedStatement(prev => prev?.id === statement.id ? null : statement);
    setSelectedRecord(null);
  };

  const handleRecordClick = (record: EntryBookRecord) => {
    if (record.isReconciled) return;

    if (selectedStatement()) {
      // If statement selected, reconcile with this record
      setSelectedRecord(record);
    }
  };

  const handleReconcile = () => {
    const stmt = selectedStatement();
    const record = selectedRecord();
    if (stmt && record) {
      bankConsolidationStore.reconcileTransaction(stmt.id, record.id);
      setSelectedStatement(null);
      setSelectedRecord(null);
    }
  };

  const handleAutoReconcile = () => {
    const stmt = selectedStatement();
    if (!stmt) return;

    const matches = bankConsolidationStore.getMatchDetails(stmt.id);
    if (matches.length === 1 && matches[0].score >= 8) {
      bankConsolidationStore.reconcileTransaction(stmt.id, matches[0].record.id);
      setSelectedStatement(null);
    }
  };

  const getMatchIndicator = (recordId: string) => {
    const score = potentialMatches().get(recordId);
    if (!score) return null;

    if (score >= 8) return { color: '#4caf50', label: 'Exacto', icon: '★' };
    if (score >= 6) return { color: '#ff9800', label: 'Posible', icon: '◆' };
    return { color: '#9e9e9e', label: 'Bajo', icon: '○' };
  };

  // Styles
  const containerStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    height: '100%',
    'min-height': '600px'
  };

  const headerStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '1rem',
    'flex-wrap': 'wrap' as const,
    gap: '1rem'
  };

  const filterStyle = {
    display: 'flex',
    gap: '0.5rem'
  };

  const filterBtnStyle = (active: boolean) => ({
    padding: '0.5rem 1rem',
    border: 'none',
    background: active ? 'var(--primary-color)' : 'var(--gray-100)',
    color: active ? 'white' : 'var(--text-color)',
    'border-radius': '20px',
    cursor: 'pointer',
    'font-size': '0.85rem',
    transition: 'all 0.2s'
  });

  const splitContainerStyle = {
    display: 'grid',
    'grid-template-columns': '1fr 1fr',
    gap: '1rem',
    flex: 1,
    'min-height': 0
  };

  const panelStyle = {
    background: 'var(--surface-color)',
    'border-radius': '8px',
    border: '1px solid var(--border-color)',
    display: 'flex',
    'flex-direction': 'column' as const,
    overflow: 'hidden'
  };

  const panelHeaderStyle = (color: string) => ({
    padding: '1rem',
    background: color,
    color: 'white',
    'font-weight': '600',
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center'
  });

  const listStyle = {
    flex: 1,
    'overflow-y': 'auto' as const,
    padding: '0.5rem'
  };

  const itemStyle = (isSelected: boolean, isReconciled: boolean, isHighlighted: boolean) => ({
    padding: '0.75rem',
    'margin-bottom': '0.5rem',
    'border-radius': '6px',
    cursor: isReconciled ? 'default' : 'pointer',
    background: isSelected
      ? 'var(--primary-light, #e3f2fd)'
      : isReconciled
        ? '#f1f8e9'
        : isHighlighted
          ? '#fff3e0'
          : 'var(--gray-50)',
    border: isSelected
      ? '2px solid var(--primary-color)'
      : isHighlighted
        ? '2px solid #ff9800'
        : '2px solid transparent',
    opacity: isReconciled ? 0.7 : 1,
    transition: 'all 0.15s ease'
  });

  const amountStyle = (isDebit: boolean) => ({
    'font-weight': '600',
    color: isDebit ? '#4caf50' : '#f44336',
    'font-size': '0.95rem'
  });

  const matchBadgeStyle = (color: string) => ({
    display: 'inline-flex',
    'align-items': 'center',
    gap: '0.25rem',
    background: color,
    color: 'white',
    'font-size': '0.65rem',
    padding: '0.15rem 0.4rem',
    'border-radius': '4px',
    'font-weight': '600'
  });

  const selectionPanelStyle = {
    background: 'var(--primary-light, #e3f2fd)',
    border: '1px solid var(--primary-color)',
    'border-radius': '8px',
    padding: '1rem',
    'margin-top': '1rem',
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'flex-wrap': 'wrap' as const,
    gap: '1rem'
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={filterStyle}>
          <button
            style={filterBtnStyle(filter() === 'unreconciled')}
            onClick={() => setFilter('unreconciled')}
          >
            {t('banking.pending', 'Pendientes')}
          </button>
          <button
            style={filterBtnStyle(filter() === 'reconciled')}
            onClick={() => setFilter('reconciled')}
          >
            {t('banking.reconciled', 'Conciliados')}
          </button>
          <button
            style={filterBtnStyle(filter() === 'all')}
            onClick={() => setFilter('all')}
          >
            {t('common.all', 'Todos')}
          </button>
        </div>

        <input
          type="text"
          placeholder={t('common.search', 'Buscar...')}
          value={searchTerm()}
          onInput={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid var(--border-color)',
            'border-radius': '20px',
            'min-width': '200px'
          }}
        />

        <div style={{ 'font-size': '0.85rem', color: 'var(--text-muted)' }}>
          {stats().reconciledStatements} {t('banking.reconciled', 'conciliados')}
        </div>
      </div>

      {/* Split Panels */}
      <div style={splitContainerStyle}>
        {/* Left Panel: Bank Statements */}
        <div style={panelStyle}>
          <div style={panelHeaderStyle('#1976d2')}>
            <span>🏦 {t('banking.bankStatements', 'Estados de Cuenta')}</span>
            <span style={{ 'font-size': '0.85rem', 'font-weight': 'normal' }}>
              {filteredStatements().length}
            </span>
          </div>
          <div style={listStyle}>
            <Show when={filteredStatements().length > 0} fallback={
              <div style={{ 'text-align': 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                {t('banking.noStatements', 'No hay movimientos')}
              </div>
            }>
              <For each={filteredStatements()}>
                {(statement) => (
                  <div
                    style={itemStyle(
                      selectedStatement()?.id === statement.id,
                      statement.isReconciled,
                      false
                    )}
                    onClick={() => handleStatementClick(statement)}
                  >
                    <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'flex-start' }}>
                      <div style={{ flex: 1, 'min-width': 0 }}>
                        <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', 'margin-bottom': '0.25rem' }}>
                          <span style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                            {formatDate(statement.date)}
                          </span>
                          <Show when={statement.isReconciled}>
                            <span style={{ color: '#4caf50', 'font-size': '0.75rem' }}>✓</span>
                          </Show>
                        </div>
                        <div style={{
                          'font-weight': '500',
                          'white-space': 'nowrap',
                          overflow: 'hidden',
                          'text-overflow': 'ellipsis',
                          'font-size': '0.9rem'
                        }}>
                          {statement.description}
                        </div>
                        <Show when={statement.reference}>
                          <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                            Ref: {statement.reference}
                          </div>
                        </Show>
                      </div>
                      <div style={amountStyle(statement.debitAmount > 0)}>
                        {statement.debitAmount > 0
                          ? formatCurrency(statement.debitAmount)
                          : `-${formatCurrency(statement.creditAmount)}`
                        }
                      </div>
                    </div>
                  </div>
                )}
              </For>
            </Show>
          </div>
        </div>

        {/* Right Panel: Entry Book Records */}
        <div style={panelStyle}>
          <div style={panelHeaderStyle('#7b1fa2')}>
            <span>📒 {t('banking.entryBookRecords', 'Registros Contables')}</span>
            <span style={{ 'font-size': '0.85rem', 'font-weight': 'normal' }}>
              {filteredRecords().length}
            </span>
          </div>
          <div style={listStyle}>
            <Show when={filteredRecords().length > 0} fallback={
              <div style={{ 'text-align': 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                {t('banking.noRecords', 'No hay registros')}
              </div>
            }>
              <For each={filteredRecords()}>
                {(record) => {
                  const matchInfo = getMatchIndicator(record.id);
                  return (
                    <div
                      style={itemStyle(
                        selectedRecord()?.id === record.id,
                        record.isReconciled,
                        !!matchInfo && !record.isReconciled
                      )}
                      onClick={() => handleRecordClick(record)}
                    >
                      <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'flex-start' }}>
                        <div style={{ flex: 1, 'min-width': 0 }}>
                          <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', 'margin-bottom': '0.25rem' }}>
                            <span style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                              {formatDate(record.date)}
                            </span>
                            <Show when={matchInfo && !record.isReconciled}>
                              <span style={matchBadgeStyle(matchInfo!.color)}>
                                {matchInfo!.icon} {matchInfo!.label}
                              </span>
                            </Show>
                            <Show when={record.isReconciled}>
                              <span style={{ color: '#4caf50', 'font-size': '0.75rem' }}>✓</span>
                            </Show>
                          </div>
                          <div style={{
                            'font-weight': '500',
                            'white-space': 'nowrap',
                            overflow: 'hidden',
                            'text-overflow': 'ellipsis',
                            'font-size': '0.9rem'
                          }}>
                            {record.description}
                          </div>
                          <Show when={record.reference}>
                            <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                              Ref: {record.reference}
                            </div>
                          </Show>
                        </div>
                        <div style={amountStyle(record.debitAmount > 0)}>
                          {record.debitAmount > 0
                            ? formatCurrency(record.debitAmount)
                            : `-${formatCurrency(record.creditAmount)}`
                          }
                        </div>
                      </div>
                    </div>
                  );
                }}
              </For>
            </Show>
          </div>
        </div>
      </div>

      {/* Selection Panel */}
      <Show when={selectedStatement()}>
        <div style={selectionPanelStyle}>
          <div>
            <div style={{ 'font-weight': '600', 'margin-bottom': '0.25rem' }}>
              {t('banking.selectedStatement', 'Movimiento seleccionado')}:
            </div>
            <div style={{ 'font-size': '0.9rem' }}>
              {selectedStatement()!.description} •
              <span style={amountStyle(selectedStatement()!.debitAmount > 0)}>
                {' '}{selectedStatement()!.debitAmount > 0
                  ? formatCurrency(selectedStatement()!.debitAmount)
                  : `-${formatCurrency(selectedStatement()!.creditAmount)}`
                }
              </span>
            </div>
            <Show when={selectedRecord()}>
              <div style={{ 'margin-top': '0.5rem', color: '#7b1fa2' }}>
                → {selectedRecord()!.description}
              </div>
            </Show>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button
              variant="outline"
              onClick={() => { setSelectedStatement(null); setSelectedRecord(null); }}
            >
              {t('common.cancel', 'Cancelar')}
            </Button>
            <Show when={potentialMatches().size === 1}>
              <Button variant="secondary" onClick={handleAutoReconcile}>
                {t('banking.autoMatch', 'Auto-conciliar')}
              </Button>
            </Show>
            <Show when={selectedRecord()}>
              <Button variant="primary" onClick={handleReconcile}>
                ✓ {t('banking.reconcile', 'Conciliar')}
              </Button>
            </Show>
          </div>
        </div>
      </Show>

      {/* Instructions */}
      <Show when={!selectedStatement()}>
        <div style={{
          'text-align': 'center',
          padding: '1rem',
          color: 'var(--text-muted)',
          'font-size': '0.85rem',
          'margin-top': '1rem'
        }}>
          💡 {t('banking.splitViewInstructions', 'Haz clic en un movimiento bancario, luego selecciona el registro contable correspondiente')}
        </div>
      </Show>
    </div>
  );
};

export default ReconciliationSplitView;
