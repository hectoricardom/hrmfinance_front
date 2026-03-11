/**
 * Transactions Page
 * Journal entries management
 */

import { Component, createSignal, createMemo, onMount, Show, For } from 'solid-js';
import { useTranslation } from '../../../translations';
import { Card, Button, Modal, FormInput, FormSelect } from '../../ui';
import { accountingStore } from '../stores/accountingStore';
import type { JournalEntry, JournalLine, AccountingAccount } from '../types';

const TransactionsPage: Component = () => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = createSignal(true);
  const [showAddModal, setShowAddModal] = createSignal(false);
  const [selectedEntry, setSelectedEntry] = createSignal<JournalEntry | null>(null);
  const [filterStatus, setFilterStatus] = createSignal<string>('all');
  const [searchQuery, setSearchQuery] = createSignal('');

  // Form state
  const [entryDate, setEntryDate] = createSignal(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = createSignal('');
  const [reference, setReference] = createSignal('');
  const [lines, setLines] = createSignal<Array<{
    id: string;
    accountId: string;
    debit: number;
    credit: number;
    memo: string;
  }>>([
    { id: '1', accountId: '', debit: 0, credit: 0, memo: '' },
    { id: '2', accountId: '', debit: 0, credit: 0, memo: '' }
  ]);
  const [formError, setFormError] = createSignal('');
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  onMount(async () => {
    try {
      await Promise.all([
        accountingStore.loadTransactions(),
        accountingStore.loadAccounts()
      ]);
    } finally {
      setIsLoading(false);
    }
  });

  const filteredTransactions = createMemo(() => {
    let transactions = accountingStore.transactions;

    if (filterStatus() !== 'all') {
      transactions = transactions.filter(t => t.status === filterStatus());
    }

    const query = searchQuery().toLowerCase().trim();
    if (query) {
      transactions = transactions.filter(t =>
        t.description.toLowerCase().includes(query) ||
        (t.reference?.toLowerCase().includes(query)) ||
        t.entryNumber.toString().includes(query)
      );
    }

    return transactions.sort((a, b) =>
      new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime()
    );
  });

  const totals = createMemo(() => {
    const debits = lines().reduce((sum, l) => sum + (l.debit || 0), 0);
    const credits = lines().reduce((sum, l) => sum + (l.credit || 0), 0);
    const difference = Math.abs(debits - credits);
    return {
      debits,
      credits,
      difference,
      isBalanced: difference < 0.01
    };
  });

  const statusLabels: Record<string, string> = {
    pending: t('accounting.pending', 'Pendiente'),
    posted: t('accounting.posted', 'Publicado'),
    voided: t('accounting.voided', 'Anulado')
  };

  const statusColors: Record<string, { bg: string; color: string }> = {
    pending: { bg: '#fef3c7', color: '#d97706' },
    posted: { bg: '#d1fae5', color: '#059669' },
    voided: { bg: '#fee2e2', color: '#dc2626' }
  };

  const resetForm = () => {
    setEntryDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setReference('');
    setLines([
      { id: '1', accountId: '', debit: 0, credit: 0, memo: '' },
      { id: '2', accountId: '', debit: 0, credit: 0, memo: '' }
    ]);
    setFormError('');
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const addLine = () => {
    setLines([...lines(), {
      id: Date.now().toString(),
      accountId: '',
      debit: 0,
      credit: 0,
      memo: ''
    }]);
  };

  const removeLine = (id: string) => {
    if (lines().length > 2) {
      setLines(lines().filter(l => l.id !== id));
    }
  };

  const updateLine = (id: string, field: string, value: any) => {
    setLines(lines().map(l => {
      if (l.id !== id) return l;

      // If entering debit, clear credit and vice versa
      if (field === 'debit' && value > 0) {
        return { ...l, debit: value, credit: 0 };
      }
      if (field === 'credit' && value > 0) {
        return { ...l, credit: value, debit: 0 };
      }

      return { ...l, [field]: value };
    }));
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setFormError('');

    if (!description().trim()) {
      setFormError(t('accounting.descriptionRequired', 'La descripción es requerida'));
      return;
    }

    if (!totals().isBalanced) {
      setFormError(t('accounting.notBalanced', 'El asiento no está balanceado'));
      return;
    }

    const validLines = lines().filter(l => l.accountId && (l.debit > 0 || l.credit > 0));
    if (validLines.length < 2) {
      setFormError(t('accounting.minTwoLines', 'Se requieren al menos 2 líneas válidas'));
      return;
    }

    setIsSubmitting(true);
    try {
      await accountingStore.addTransaction({
        entryDate: entryDate(),
        description: description(),
        reference: reference() || undefined,
        lines: validLines.map(l => ({
          accountId: l.accountId,
          debit: l.debit || 0,
          credit: l.credit || 0,
          memo: l.memo || undefined
        }))
      });
      setShowAddModal(false);
      resetForm();
    } catch (err: any) {
      setFormError(err.message || t('accounting.saveError', 'Error al guardar'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePost = async (id: string) => {
    try {
      await accountingStore.postTransaction(id);
    } catch (err: any) {
      alert(err.message || t('accounting.postError', 'Error al publicar'));
    }
  };

  const handleVoid = async (id: string) => {
    if (!confirm(t('accounting.confirmVoid', '¿Está seguro de anular este asiento?'))) {
      return;
    }
    try {
      await accountingStore.voidTransaction(id);
    } catch (err: any) {
      alert(err.message || t('accounting.voidError', 'Error al anular'));
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getAccountName = (accountId: string) => {
    const account = accountingStore.getAccountById(accountId);
    return account ? `${account.code} - ${account.name}` : accountId;
  };

  const tableStyle = {
    width: '100%',
    'border-collapse': 'collapse'
  };

  const thStyle = {
    'text-align': 'left' as const,
    padding: '0.75rem',
    'border-bottom': '2px solid var(--border-color)',
    'font-weight': '600',
    color: 'var(--text-muted)',
    'font-size': '0.875rem'
  };

  const tdStyle = {
    padding: '0.75rem',
    'border-bottom': '1px solid var(--border-color)'
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        'justify-content': 'space-between',
        'align-items': 'center',
        'margin-bottom': '1.5rem'
      }}>
        <div>
          <h1 style={{ 'font-size': '1.5rem', 'font-weight': '700', 'margin-bottom': '0.25rem' }}>
            {t('accounting.journalEntries', 'Asientos Contables')}
          </h1>
          <p style={{ color: 'var(--text-muted)', 'font-size': '0.875rem' }}>
            {filteredTransactions().length} {t('accounting.entries', 'asientos')}
          </p>
        </div>
        <Button variant="primary" onClick={openAddModal}>
          + {t('accounting.newEntry', 'Nuevo Asiento')}
        </Button>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        'margin-bottom': '1.5rem',
        'flex-wrap': 'wrap'
      }}>
        <input
          type="text"
          placeholder={t('accounting.searchEntries', 'Buscar asientos...')}
          value={searchQuery()}
          onInput={(e) => setSearchQuery(e.currentTarget.value)}
          style={{
            flex: '1',
            'min-width': '200px',
            padding: '0.5rem 1rem',
            border: '1px solid var(--border-color)',
            'border-radius': 'var(--border-radius-sm)',
            'font-size': '0.875rem'
          }}
        />
        <select
          value={filterStatus()}
          onChange={(e) => setFilterStatus(e.currentTarget.value)}
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid var(--border-color)',
            'border-radius': 'var(--border-radius-sm)',
            'font-size': '0.875rem',
            background: 'var(--surface-color)'
          }}
        >
          <option value="all">{t('accounting.allStatuses', 'Todos los estados')}</option>
          <option value="pending">{t('accounting.pending', 'Pendiente')}</option>
          <option value="posted">{t('accounting.posted', 'Publicado')}</option>
          <option value="voided">{t('accounting.voided', 'Anulado')}</option>
        </select>
      </div>

      {/* Loading */}
      <Show when={isLoading()}>
        <div style={{ 'text-align': 'center', padding: '3rem' }}>
          <div>{t('common.loading', 'Cargando...')}</div>
        </div>
      </Show>

      {/* Transactions List */}
      <Show when={!isLoading()}>
        <div style={{
          background: 'var(--surface-color)',
          border: '1px solid var(--border-color)',
          'border-radius': 'var(--border-radius-md)',
          overflow: 'hidden'
        }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>#</th>
                <th style={thStyle}>{t('accounting.date', 'Fecha')}</th>
                <th style={thStyle}>{t('accounting.description', 'Descripción')}</th>
                <th style={thStyle}>{t('accounting.reference', 'Referencia')}</th>
                <th style={thStyle}>{t('accounting.status', 'Estado')}</th>
                <th style={{ ...thStyle, width: '150px' }}></th>
              </tr>
            </thead>
            <tbody>
              <For each={filteredTransactions()} fallback={
                <tr>
                  <td colspan="6" style={{ ...tdStyle, 'text-align': 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    {t('accounting.noEntries', 'No hay asientos contables')}
                  </td>
                </tr>
              }>
                {(entry) => (
                  <tr>
                    <td style={{ ...tdStyle, 'font-family': 'monospace', 'font-size': '0.875rem' }}>
                      {entry.entryNumber}
                    </td>
                    <td style={tdStyle}>{formatDate(entry?.entryDate)}</td>
                    <td style={tdStyle}>{entry?.description}</td>
                    <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>
                      {entry?.reference || '-'}
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        'border-radius': '9999px',
                        'font-size': '0.75rem',
                        'font-weight': '500',
                        background: statusColors?.[entry.status]?.bg,
                        color: statusColors?.[entry.status]?.color
                      }}>
                        {statusLabels[entry.status]}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => setSelectedEntry(entry)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--primary-color)',
                            cursor: 'pointer',
                            'font-size': '0.875rem'
                          }}
                        >
                          {t('common.view', 'Ver')}
                        </button>
                        <Show when={entry.status === 'pending'}>
                          <button
                            onClick={() => handlePost(entry.id)}
                            style={{
                              padding: '0.25rem 0.5rem',
                              border: 'none',
                              background: 'transparent',
                              color: '#059669',
                              cursor: 'pointer',
                              'font-size': '0.875rem'
                            }}
                          >
                            {t('accounting.post', 'Publicar')}
                          </button>
                        </Show>
                        <Show when={entry.status === 'posted'}>
                          <button
                            onClick={() => handleVoid(entry.id)}
                            style={{
                              padding: '0.25rem 0.5rem',
                              border: 'none',
                              background: 'transparent',
                              color: '#dc2626',
                              cursor: 'pointer',
                              'font-size': '0.875rem'
                            }}
                          >
                            {t('accounting.void', 'Anular')}
                          </button>
                        </Show>
                      </div>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </Show>

      {/* Add Entry Modal */}
      <Modal
        isOpen={showAddModal()}
        onClose={() => setShowAddModal(false)}
        title={t('accounting.newJournalEntry', 'Nuevo Asiento Contable')}
        size="large"
      >
        <form onSubmit={handleSubmit}>
          {/* Header Fields */}
          <div style={{
            display: 'grid',
            'grid-template-columns': 'repeat(3, 1fr)',
            gap: '1rem',
            'margin-bottom': '1.5rem'
          }}>
            <FormInput
              type="date"
              label={t('accounting.date', 'Fecha')}
              value={entryDate()}
              onChange={setEntryDate}
            />
            <FormInput
              label={t('accounting.reference', 'Referencia')}
              value={reference()}
              onChange={setReference}
              placeholder={t('accounting.invoiceCheck', 'Factura #, Cheque #')}
            />
            <div></div>
          </div>

          <div style={{ 'margin-bottom': '1.5rem' }}>
            <FormInput
              label={t('accounting.description', 'Descripción')}
              value={description()}
              onChange={setDescription}
              placeholder={t('accounting.entryDescription', 'Descripción del asiento')}
            />
          </div>

          {/* Lines */}
          <div style={{
            background: 'var(--surface-secondary)',
            'border-radius': 'var(--border-radius-sm)',
            padding: '1rem',
            'margin-bottom': '1rem'
          }}>
            <h4 style={{ 'margin-bottom': '1rem', 'font-weight': '600' }}>
              {t('accounting.entryLines', 'Líneas del Asiento')}
            </h4>

            <div style={{
              display: 'grid',
              'grid-template-columns': '3fr 1fr 1fr 2fr auto',
              gap: '0.5rem',
              'margin-bottom': '0.5rem',
              'font-size': '0.75rem',
              'font-weight': '600',
              color: 'var(--text-muted)'
            }}>
              <div>{t('accounting.account', 'Cuenta')}</div>
              <div style={{ 'text-align': 'right' }}>{t('accounting.debit', 'Débito')}</div>
              <div style={{ 'text-align': 'right' }}>{t('accounting.credit', 'Crédito')}</div>
              <div>{t('accounting.memo', 'Memo')}</div>
              <div></div>
            </div>

            <For each={lines()}>
              {(line) => (
                <div style={{
                  display: 'grid',
                  'grid-template-columns': '3fr 1fr 1fr 2fr auto',
                  gap: '0.5rem',
                  'margin-bottom': '0.5rem'
                }}>
                  <select
                    value={line.accountId}
                    onChange={(e) => updateLine(line.id, 'accountId', e.currentTarget.value)}
                    style={{
                      padding: '0.5rem',
                      border: '1px solid var(--border-color)',
                      'border-radius': 'var(--border-radius-sm)',
                      'font-size': '0.875rem'
                    }}
                  >
                    <option value="">{t('accounting.selectAccount', 'Seleccionar...')}</option>
                    <For each={accountingStore.accounts}>
                      {(account) => (
                        <option value={account.id}>{account.code} - {account.name}</option>
                      )}
                    </For>
                  </select>

                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={line.debit || ''}
                    onInput={(e) => updateLine(line.id, 'debit', parseFloat(e.currentTarget.value) || 0)}
                    placeholder="0.00"
                    disabled={line.credit > 0}
                    style={{
                      padding: '0.5rem',
                      border: '1px solid var(--border-color)',
                      'border-radius': 'var(--border-radius-sm)',
                      'font-size': '0.875rem',
                      'text-align': 'right'
                    }}
                  />

                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={line.credit || ''}
                    onInput={(e) => updateLine(line.id, 'credit', parseFloat(e.currentTarget.value) || 0)}
                    placeholder="0.00"
                    disabled={line.debit > 0}
                    style={{
                      padding: '0.5rem',
                      border: '1px solid var(--border-color)',
                      'border-radius': 'var(--border-radius-sm)',
                      'font-size': '0.875rem',
                      'text-align': 'right'
                    }}
                  />

                  <input
                    type="text"
                    value={line.memo}
                    onInput={(e) => updateLine(line.id, 'memo', e.currentTarget.value)}
                    placeholder={t('accounting.memo', 'Memo')}
                    style={{
                      padding: '0.5rem',
                      border: '1px solid var(--border-color)',
                      'border-radius': 'var(--border-radius-sm)',
                      'font-size': '0.875rem'
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => removeLine(line.id)}
                    disabled={lines().length <= 2}
                    style={{
                      padding: '0.5rem',
                      border: 'none',
                      background: 'transparent',
                      color: lines().length <= 2 ? 'var(--text-muted)' : '#dc2626',
                      cursor: lines().length <= 2 ? 'not-allowed' : 'pointer',
                      'font-size': '1rem'
                    }}
                  >
                    ×
                  </button>
                </div>
              )}
            </For>

            <button
              type="button"
              onClick={addLine}
              style={{
                padding: '0.5rem 1rem',
                border: '1px dashed var(--border-color)',
                background: 'transparent',
                'border-radius': 'var(--border-radius-sm)',
                color: 'var(--primary-color)',
                cursor: 'pointer',
                'font-size': '0.875rem',
                'margin-top': '0.5rem'
              }}
            >
              + {t('accounting.addLine', 'Agregar línea')}
            </button>

            {/* Totals */}
            <div style={{
              display: 'flex',
              'justify-content': 'flex-end',
              gap: '2rem',
              'margin-top': '1rem',
              'padding-top': '1rem',
              'border-top': '1px solid var(--border-color)',
              'font-size': '0.875rem'
            }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>{t('accounting.totalDebits', 'Total Débitos')}:</span>
                <span style={{ 'margin-left': '0.5rem', 'font-weight': '600' }}>
                  {formatCurrency(totals().debits)}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>{t('accounting.totalCredits', 'Total Créditos')}:</span>
                <span style={{ 'margin-left': '0.5rem', 'font-weight': '600' }}>
                  {formatCurrency(totals().credits)}
                </span>
              </div>
              <div style={{ color: totals().isBalanced ? '#059669' : '#dc2626', 'font-weight': '600' }}>
                {totals().isBalanced
                  ? `✓ ${t('accounting.balanced', 'Balanceado')}`
                  : `✗ ${t('accounting.difference', 'Diferencia')}: ${formatCurrency(totals().difference)}`
                }
              </div>
            </div>
          </div>

          <Show when={formError()}>
            <div style={{
              padding: '0.75rem',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              'border-radius': 'var(--border-radius-sm)',
              color: '#dc2626',
              'margin-bottom': '1rem',
              'font-size': '0.875rem'
            }}>
              {formError()}
            </div>
          </Show>

          <div style={{ display: 'flex', 'justify-content': 'flex-end', gap: '0.75rem' }}>
            <Button variant="secondary" type="button" onClick={() => setShowAddModal(false)}>
              {t('common.cancel', 'Cancelar')}
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmitting() || !totals().isBalanced}>
              {isSubmitting() ? t('common.saving', 'Guardando...') : t('accounting.saveEntry', 'Guardar Asiento')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Entry Modal */}
      <Modal
        isOpen={!!selectedEntry()}
        onClose={() => setSelectedEntry(null)}
        title={`${t('accounting.entry', 'Asiento')} #${selectedEntry()?.entryNumber}`}
      >
        <Show when={selectedEntry()}>
          {(entry) => (
            <div>
              <div style={{ 'margin-bottom': '1rem' }}>
                <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr 1fr', gap: '1rem' }}>
                  <div>
                    <div style={{ color: 'var(--text-muted)', 'font-size': '0.75rem', 'margin-bottom': '0.25rem' }}>
                      {t('accounting.date', 'Fecha')}
                    </div>
                    <div style={{ 'font-weight': '500' }}>{formatDate(entry().entryDate)}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)', 'font-size': '0.75rem', 'margin-bottom': '0.25rem' }}>
                      {t('accounting.reference', 'Referencia')}
                    </div>
                    <div style={{ 'font-weight': '500' }}>{entry().reference || '-'}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)', 'font-size': '0.75rem', 'margin-bottom': '0.25rem' }}>
                      {t('accounting.status', 'Estado')}
                    </div>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      'border-radius': '9999px',
                      'font-size': '0.75rem',
                      'font-weight': '500',
                      background: statusColors[entry()?.status]?.bg,
                      color: statusColors[entry()?.status]?.color
                    }}>
                      {statusLabels[entry().status]}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ 'margin-bottom': '1rem' }}>
                <div style={{ color: 'var(--text-muted)', 'font-size': '0.75rem', 'margin-bottom': '0.25rem' }}>
                  {t('accounting.description', 'Descripción')}
                </div>
                <div>{entry().description}</div>
              </div>

              <table style={{ ...tableStyle, 'margin-bottom': '1rem' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>{t('accounting.account', 'Cuenta')}</th>
                    <th style={{ ...thStyle, 'text-align': 'right' }}>{t('accounting.debit', 'Débito')}</th>
                    <th style={{ ...thStyle, 'text-align': 'right' }}>{t('accounting.credit', 'Crédito')}</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={entry().lines}>
                    {(line) => (
                      <tr>
                        <td style={tdStyle}>{getAccountName(line.accountId)}</td>
                        <td style={{ ...tdStyle, 'text-align': 'right' }}>
                          {line.debit > 0 ? formatCurrency(line.debit) : ''}
                        </td>
                        <td style={{ ...tdStyle, 'text-align': 'right' }}>
                          {line.credit > 0 ? formatCurrency(line.credit) : ''}
                        </td>
                      </tr>
                    )}
                  </For>
                  <tr style={{ 'font-weight': '600', background: 'var(--surface-secondary)' }}>
                    <td style={tdStyle}>{t('accounting.totals', 'Totales')}</td>
                    <td style={{ ...tdStyle, 'text-align': 'right' }}>
                      {formatCurrency(entry().lines.reduce((sum, l) => sum + l.debit, 0))}
                    </td>
                    <td style={{ ...tdStyle, 'text-align': 'right' }}>
                      {formatCurrency(entry().lines.reduce((sum, l) => sum + l.credit, 0))}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div style={{ display: 'flex', 'justify-content': 'flex-end', gap: '0.75rem' }}>
                <Button variant="secondary" onClick={() => setSelectedEntry(null)}>
                  {t('common.close', 'Cerrar')}
                </Button>
                <Show when={entry().status === 'pending'}>
                  <Button variant="primary" onClick={() => { handlePost(entry().id); setSelectedEntry(null); }}>
                    {t('accounting.post', 'Publicar')}
                  </Button>
                </Show>
              </div>
            </div>
          )}
        </Show>
      </Modal>
    </div>
  );
};

export default TransactionsPage;
