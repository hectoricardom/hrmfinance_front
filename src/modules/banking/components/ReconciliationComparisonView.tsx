import { Component, createSignal, createMemo, Show } from 'solid-js';
import { Card, Button } from '../../ui';
import { BankStatement, EntryBookRecord, bankConsolidationStore } from '../stores/bankConsolidationStore';
import { useTranslation } from '../../../translations';
import LazyRenderList from './LazyRenderList';

interface ReconciliationComparisonViewProps {
  bankAccountId: string;
  selectedPeriod: { start: string; end: string };
  bankStatements: BankStatement[];
  entryBookRecords: EntryBookRecord[];
}

const ReconciliationComparisonView: Component<ReconciliationComparisonViewProps> = (props) => {
  const { t } = useTranslation();
  const [selectedBankStatement, setSelectedBankStatement] = createSignal<BankStatement | null>(null);
  const [potentialMatches, setPotentialMatches] = createSignal<EntryBookRecord[]>([]);
  const [filterStatus, setFilterStatus] = createSignal<'all' | 'reconciled' | 'unreconciled'>('unreconciled');

  // Use createMemo for filtered lists - proper SolidJS reactivity
  const filteredBankStatements = createMemo(() => {
    const statements = props.bankStatements;
    switch (filterStatus()) {
      case 'reconciled':
        return statements.filter(s => s.isReconciled);
      case 'unreconciled':
        return statements.filter(s => !s.isReconciled);
      default:
        return statements;
    }
  });

  const filteredEntryBookRecords = createMemo(() => {
    const records = props.entryBookRecords;
    switch (filterStatus()) {
      case 'reconciled':
        return records.filter(r => r.isReconciled);
      case 'unreconciled':
        return records.filter(r => !r.isReconciled);
      default:
        return records;
    }
  });

  // Memoized stats calculation
  const reconciliationStats = createMemo(() => {
    const statements = props.bankStatements;
    const records = props.entryBookRecords;
    const reconciledStatements = statements.filter(s => s.isReconciled).length;
    const reconciledRecords = records.filter(r => r.isReconciled).length;

    return {
      totalStatements: statements.length,
      totalRecords: records.length,
      reconciledStatements,
      reconciledRecords,
      unreconciledStatements: statements.length - reconciledStatements,
      unreconciledRecords: records.length - reconciledRecords
    };
  });

  const handleBankStatementSelect = (statement: BankStatement) => {
    setSelectedBankStatement(statement);
    if (!statement.isReconciled) {
      const matches = bankConsolidationStore.findPotentialMatches(statement.id);
      setPotentialMatches(matches);
    } else {
      setPotentialMatches([]);
    }
  };

  const handleReconcile = (entryBookRecord: EntryBookRecord) => {
    const statement = selectedBankStatement();
    if (statement) {
      bankConsolidationStore.reconcileTransaction(statement.id, entryBookRecord.id);
      setSelectedBankStatement(null);
      setPotentialMatches([]);
    }
  };

  const handleUnreconcile = (statement: BankStatement) => {
    bankConsolidationStore.unreconciledTransaction(statement.id);
  };

  const containerStyle = {
    display: 'grid',
    'grid-template-columns': '1fr 1fr',
    gap: '2rem',
    'margin-top': '2rem'
  };

  const panelStyle = {
    height: '600px',
    'overflow-y': 'auto'
  };

  const headerStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '1rem'
  };

  const filterButtonStyle = (isActive: boolean) => ({
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

  const transactionRowStyle = (isSelected: boolean, isReconciled: boolean) => ({
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '1rem',
    'margin-bottom': '0.5rem',
    background: isSelected ? 'var(--primary-color)' : isReconciled ? '#e8f5e8' : 'var(--surface-color)',
    color: isSelected ? 'white' : 'var(--text-primary)',
    'border-radius': 'var(--border-radius-sm)',
    border: `1px solid ${isSelected ? 'var(--primary-color)' : isReconciled ? '#c3e6cb' : 'var(--border-color)'}`,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  });

  const transactionInfoStyle = {
    flex: '1'
  };

  const transactionNameStyle = {
    'font-weight': '500',
    'margin-bottom': '0.25rem'
  };

  const transactionDetailsStyle = {
    'font-size': '0.875rem',
    opacity: '0.8'
  };

  const transactionAmountStyle = (isDebit: boolean) => ({
    'font-weight': '600',
    color: isDebit ? '#4caf50' : '#f44336'
  });

  const matchIndicatorStyle = {
    padding: '0.25rem 0.5rem',
    'border-radius': '9999px',
    'font-size': '0.75rem',
    'font-weight': '500',
    'margin-left': '0.5rem'
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getMatchIndicator = (record: EntryBookRecord) => {
    if (!selectedBankStatement()) return null;
    
    const statement = selectedBankStatement()!;
    const isExactMatch = (Math.abs(statement.debitAmount - record.debitAmount) < 0.01 ||
                         Math.abs(statement.creditAmount - record.creditAmount) < 0.01) &&
                        statement.date === record.date;
    
    if (isExactMatch) {
      return (
        <span style={{
          ...matchIndicatorStyle,
          background: '#d4edda',
          color: '#155724'
        }}>
{t('banking.exactMatch')}
        </span>
      );
    }

    const isCloseMatch = potentialMatches().includes(record);
    if (isCloseMatch) {
      return (
        <span style={{
          ...matchIndicatorStyle,
          background: '#fff3cd',
          color: '#856404'
        }}>
{t('banking.possibleMatch')}
        </span>
      );
    }

    return null;
  };


  return (
    <div>
      <div style={headerStyle}>
        <h3 style={{ margin: '0', 'font-size': '1.25rem' }}>{t('banking.reconciliationComparison')}</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            style={filterButtonStyle(filterStatus() === 'all')}
            onClick={() => setFilterStatus('all')}
          >
{t('common.all')}
          </button>
          <button
            style={filterButtonStyle(filterStatus() === 'unreconciled')}
            onClick={() => setFilterStatus('unreconciled')}
          >
{t('banking.unreconciled')}
          </button>
          <button
            style={filterButtonStyle(filterStatus() === 'reconciled')}
            onClick={() => setFilterStatus('reconciled')}
          >
{t('banking.reconciled')}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', 'grid-template-columns': 'repeat(4, 1fr)', gap: '1rem', 'margin-bottom': '2rem' }}>
        <Card title={t('banking.bankStatements')} subtitle={t('banking.totalTransactions')}>
          <div style={{ 'font-size': '1.5rem', 'font-weight': '600', color: 'var(--primary-color)' }}>
            {reconciliationStats().totalStatements}
          </div>
          <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
            {reconciliationStats().reconciledStatements} {t('banking.reconciled')}
          </div>
        </Card>
        <Card title={t('banking.entryBookRecords')} subtitle={t('banking.totalEntries')}>
          <div style={{ 'font-size': '1.5rem', 'font-weight': '600', color: 'var(--primary-color)' }}>
            {reconciliationStats().totalRecords}
          </div>
          <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
            {reconciliationStats().reconciledRecords} {t('banking.reconciled')}
          </div>
        </Card>
        <Card title={t('banking.unreconciledBank')} subtitle={t('banking.needAttention')}>
          <div style={{ 'font-size': '1.5rem', 'font-weight': '600', color: '#f44336' }}>
            {reconciliationStats().unreconciledStatements}
          </div>
        </Card>
        <Card title={t('banking.unreconciledBooks')} subtitle={t('banking.needAttention')}>
          <div style={{ 'font-size': '1.5rem', 'font-weight': '600', color: '#f44336' }}>
            {reconciliationStats().unreconciledRecords}
          </div>
        </Card>
      </div>

      <div style={containerStyle}>
        <div>
          <h4 style={{ margin: '0 0 1rem 0' }}>{t('banking.bankStatements')}</h4>
          <div style={panelStyle}>
            <LazyRenderList
              items={filteredBankStatements()}
              batchSize={15}
              initialBatchSize={20}
              emptyMessage={t('banking.noBankStatements', 'No bank statements found')}
              containerStyle={{ height: '100%' }}
              renderItem={(statement) => {
                const matches = () => bankConsolidationStore.findPotentialMatches(statement.id);
                return (
                  <div
                    style={transactionRowStyle(
                      selectedBankStatement()?.id === statement.id,
                      statement.isReconciled
                    )}
                    onClick={() => handleBankStatementSelect(statement)}
                  >
                    <div style={transactionInfoStyle}>
                      <div style={transactionNameStyle}>{statement.description}</div>
                      <div style={transactionDetailsStyle}>
                        {formatDate(statement.date)} • {statement.date} • {statement.reference}
                        <Show when={statement.isReconciled}>
                          <span style={{ color: '#4caf50', 'margin-left': '0.5rem' }}>✓ {t('banking.reconciled')}</span>
                        </Show>
                        <Show when={!statement.isReconciled && matches().length > 0}>
                          <span style={{
                            'background-color': matches().length === 1 ? '#d4edda' : '#fff3cd',
                            color: matches().length === 1 ? '#155724' : '#856404',
                            padding: '0.125rem 0.375rem',
                            'border-radius': '3px',
                            'font-size': '0.75rem',
                            'margin-left': '0.5rem',
                            'font-weight': '500'
                          }}>
                            {matches().length === 1
                              ? t('banking.oneMatch')
                              : t('banking.multipleMatches').replace('{count}', matches().length.toString())}
                          </span>
                        </Show>
                      </div>
                    </div>
                    <div>
                      <div style={transactionAmountStyle(statement.balance > 0)}>
                        {statement.balance}
                      </div>
                      <Show when={statement.isReconciled}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnreconcile(statement);
                          }}
                          style={{ 'margin-top': '0.5rem' }}
                        >
                          {t('banking.unreconcile')}
                        </Button>
                      </Show>
                      <Show when={!statement.isReconciled && matches().length === 1}>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReconcile(matches()[0]);
                            setSelectedBankStatement(statement);
                          }}
                          style={{
                            'margin-top': '0.5rem',
                            'font-size': '0.75rem',
                            padding: '0.25rem 0.5rem'
                          }}
                        >
                          {t('banking.reconcile')}
                        </Button>
                      </Show>
                    </div>
                  </div>
                );
              }}
            />
          </div>
        </div>

        <div>
          <h4 style={{ margin: '0 0 1rem 0' }}>
            {t('banking.entryBookRecords')}
            <Show when={selectedBankStatement() && !selectedBankStatement()!.isReconciled}>
              <span style={{ 'font-weight': '400', color: 'var(--text-muted)', 'margin-left': '0.5rem' }}>
                ({t('banking.clickToReconcile')})
              </span>
            </Show>
          </h4>
          <div style={panelStyle}>
            <Show when={selectedBankStatement() && !selectedBankStatement()!.isReconciled} fallback={
              <LazyRenderList
                items={filteredEntryBookRecords()}
                batchSize={15}
                initialBatchSize={20}
                emptyMessage={t('banking.noEntryBookRecords', 'No entry book records found')}
                containerStyle={{ height: '100%' }}
                renderItem={(record) => (
                  <div style={transactionRowStyle(false, record.isReconciled)}>
                    <div style={transactionInfoStyle}>
                      <div style={transactionNameStyle}>{record.description}</div>
                      <div style={transactionDetailsStyle}>
                        {formatDate(record.date)} • {record.reference}
                        <Show when={record.isReconciled}>
                          <span style={{ color: '#4caf50', 'margin-left': '0.5rem' }}>✓ {t('banking.reconciled')}</span>
                        </Show>
                      </div>
                    </div>
                    <div style={transactionAmountStyle(record.debitAmount > 0)}>
                      {record.debitAmount > 0 ? '+' : '-'}
                      {formatCurrency(record.debitAmount || record.creditAmount)}
                    </div>
                  </div>
                )}
              />
            }>
              <Show when={potentialMatches().length > 0}>
                <div style={{ 'margin-bottom': '1rem', padding: '0.75rem', background: '#fff3cd', 'border-radius': 'var(--border-radius-sm)' }}>
                  <strong>{t('banking.potentialMatchesFound')}:</strong> {t('banking.clickRecordToReconcile')}
                </div>
              </Show>
              <LazyRenderList
                items={filteredEntryBookRecords()}
                batchSize={15}
                initialBatchSize={20}
                emptyMessage={t('banking.noEntryBookRecords', 'No entry book records found')}
                containerStyle={{ height: '100%' }}
                renderItem={(record) => (
                  <div
                    style={{
                      ...transactionRowStyle(false, record.isReconciled),
                      opacity: record.isReconciled ? 0.6 : 1,
                      cursor: record.isReconciled ? 'not-allowed' : 'pointer'
                    }}
                    onClick={() => {
                      if (!record.isReconciled) {
                        handleReconcile(record);
                      }
                    }}
                  >
                    <div style={transactionInfoStyle}>
                      <div style={transactionNameStyle}>
                        {record.description}
                        {getMatchIndicator(record)}
                      </div>
                      <div style={transactionDetailsStyle}>
                        {formatDate(record.date)} • {record.reference}
                        <Show when={record.isReconciled}>
                          <span style={{ color: '#4caf50', 'margin-left': '0.5rem' }}>✓ {t('banking.reconciled')}</span>
                        </Show>
                      </div>
                    </div>
                    <div style={transactionAmountStyle(record.debitAmount > 0)}>
                      {record.debitAmount > 0 ? '+' : '-'}
                      {formatCurrency(record.debitAmount || record.creditAmount)}
                    </div>
                  </div>
                )}
              />
            </Show>
          </div>
        </div>
      </div>

      <Show when={selectedBankStatement() && !selectedBankStatement()!.isReconciled}>
        <div style={{
          position: 'fixed' as const,
          bottom: '2rem',
          right: '2rem',
          background: 'var(--surface-color)',
          padding: '1rem',
          'border-radius': 'var(--border-radius)',
          'box-shadow': 'var(--shadow-lg)',
          border: '1px solid var(--border-color)',
          'max-width': '300px'
        }}>
          <div style={{ 'font-weight': '500', 'margin-bottom': '0.5rem' }}>{t('banking.selected')}:</div>
          <div style={{ 'font-size': '0.875rem', 'margin-bottom': '0.5rem' }}>
            {selectedBankStatement()!.description}
          </div>
          <div style={{ 'font-weight': '600', color: 'var(--primary-color)' }}>
            {formatCurrency(selectedBankStatement()!.debitAmount || selectedBankStatement()!.creditAmount)}
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setSelectedBankStatement(null);
              setPotentialMatches([]);
            }}
            style={{ 'margin-top': '0.5rem' }}
          >
            {t('banking.clearSelection')}
          </Button>
        </div>
      </Show>
    </div>
  );
};

export default ReconciliationComparisonView;