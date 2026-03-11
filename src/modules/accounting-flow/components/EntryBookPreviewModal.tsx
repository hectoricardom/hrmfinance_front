/**
 * Entry Book Preview Modal
 * Allows viewing, editing, and saving generated accounting entries (asientos contables)
 */

import { Component, Show, For, createSignal, createMemo, createEffect } from 'solid-js';
import { Modal, Button } from '../../ui';
import { useTranslation } from '../../../translations';
import { accountsStore, AccountingAccount } from '../../accounts/stores/accountsStore';
import { entryBookStore, JournalEntry, JournalEntryLine } from '../../journal/stores/entryBookStore';
import { generateRandomId, generateShortCode } from '../../../services/utils';
import { authStore } from '../../../stores/authStore';

export interface EntryBookPreviewEntry {
  id: string;
  accountCode: string;
  accountName: string;
  accountId?: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface EntryBookPreviewData {
  entries: EntryBookPreviewEntry[];
  date: string;
  reference: string;
  description: string;
  sourceType: string;
  sourceId: string;
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
}

interface EntryBookPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  previewData: EntryBookPreviewData | null;
  onSave?: (savedEntry: JournalEntry) => void;
  sourceDocument?: any;
}

const EntryBookPreviewModal: Component<EntryBookPreviewModalProps> = (props) => {
  const { t } = useTranslation();

  // Editable entries state
  const [editableEntries, setEditableEntries] = createSignal<EntryBookPreviewEntry[]>([]);
  const [description, setDescription] = createSignal('');
  const [reference, setReference] = createSignal('');
  const [entryDate, setEntryDate] = createSignal('');
  const [isSaving, setIsSaving] = createSignal(false);
  const [saveResult, setSaveResult] = createSignal<{ success: boolean; message: string } | null>(null);
  const [showAccountSelector, setShowAccountSelector] = createSignal<string | null>(null);
  const [accountSearch, setAccountSearch] = createSignal('');

  // Initialize editable data when preview data changes
  createEffect(() => {
    if (props.previewData) {
      setEditableEntries([...props.previewData.entries]);
      setDescription(props.previewData.description || '');
      setReference(props.previewData.reference || '');
      setEntryDate(props.previewData.date || new Date().toISOString().split('T')[0]);
      setSaveResult(null);
    }
  });

  // Calculate totals
  const totals = createMemo(() => {
    const entries = editableEntries();
    let totalDebit = 0;
    let totalCredit = 0;

    for (const entry of entries) {
      totalDebit += entry.debit || 0;
      totalCredit += entry.credit || 0;
    }

    return { totalDebit, totalCredit };
  });

  const isBalanced = createMemo(() => {
    const { totalDebit, totalCredit } = totals();
    return Math.abs(totalDebit - totalCredit) < 0.01;
  });

  const difference = createMemo(() => {
    const { totalDebit, totalCredit } = totals();
    return Math.abs(totalDebit - totalCredit);
  });

  // Get available accounts
  const availableAccounts = createMemo(() => {
    const accounts = accountsStore.accounts || [];
    const search = accountSearch().toLowerCase();
    if (!search) return accounts.slice(0, 20);
    return accounts.filter(acc =>
      acc.name?.toLowerCase().includes(search) ||
      acc.accountNumber?.toLowerCase().includes(search) ||
      acc.code?.toLowerCase().includes(search)
    ).slice(0, 20);
  });

  // Update entry field
  const updateEntry = (entryId: string, field: keyof EntryBookPreviewEntry, value: any) => {
    setEditableEntries(entries =>
      entries.map(entry =>
        entry.id === entryId ? { ...entry, [field]: value } : entry
      )
    );
  };

  // Select account for entry
  const selectAccount = (entryId: string, account: AccountingAccount) => {
    setEditableEntries(entries =>
      entries.map(entry =>
        entry.id === entryId
          ? {
              ...entry,
              accountId: account.id,
              accountCode: account.accountNumber || account.code || '',
              accountName: account.name
            }
          : entry
      )
    );
    setShowAccountSelector(null);
    setAccountSearch('');
  };

  // Add new entry line
  const addEntryLine = () => {
    const newEntry: EntryBookPreviewEntry = {
      id: generateRandomId(),
      accountCode: '',
      accountName: '',
      debit: 0,
      credit: 0,
      description: ''
    };
    setEditableEntries([...editableEntries(), newEntry]);
  };

  // Remove entry line
  const removeEntryLine = (entryId: string) => {
    if (editableEntries().length <= 2) {
      alert(t('journal.minimumTwoLines', 'Se requieren al menos 2 líneas'));
      return;
    }
    setEditableEntries(entries => entries.filter(e => e.id !== entryId));
  };

  // Save the entry book
  const handleSave = async () => {
    if (!isBalanced()) {
      alert(t('journal.mustBeBalanced', 'El asiento debe estar balanceado (Débitos = Créditos)'));
      return;
    }

    if (editableEntries().some(e => !e.accountCode)) {
      alert(t('journal.allAccountsRequired', 'Todas las líneas deben tener una cuenta asignada'));
      return;
    }

    setIsSaving(true);
    setSaveResult(null);

    try {
      const entryNumber = `JE-${new Date().getFullYear()}-${generateShortCode(6)}`;

      const journalEntry: Omit<JournalEntry, 'id'> = {
        entryNumber,
        date: entryDate(),
        createAt: new Date().toISOString(),
        description: description(),
        reference: reference(),
        status: 'draft',
        createdBy: authStore.currentUser?.displayName || authStore.currentUser?.email || 'Usuario',
        createdAt: new Date().toISOString(),
        totalDebits: totals().totalDebit,
        totalCredits: totals().totalCredit,
        document: props.previewData?.sourceId,
        lines: editableEntries().map(entry => ({
          id: generateRandomId(),
          accountId: entry.accountId || entry.accountCode,
          accountNumber: entry.accountCode,
          accountName: entry.accountName,
          description: entry.description || description(),
          debitAmount: entry.debit || 0,
          creditAmount: entry.credit || 0,
          isDebit: (entry.debit || 0) > 0,
          amount: entry.debit || entry.credit || 0
        }))
      };

      const savedEntry = await entryBookStore.addJournalEntry(journalEntry);

      setSaveResult({
        success: true,
        message: t('journal.entrySaved', 'Asiento guardado exitosamente') + ` (${entryNumber})`
      });

      if (props.onSave) {
        props.onSave(savedEntry);
      }

      // Close after a short delay
      setTimeout(() => {
        props.onClose();
      }, 2000);

    } catch (error) {
      console.error('Error saving entry:', error);
      setSaveResult({
        success: false,
        message: (error as Error).message || t('journal.saveError', 'Error al guardar el asiento')
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Format currency
  const formatCurrency = (value: number): string => {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Styles
  const containerStyle = {
    'max-height': '70vh',
    'overflow-y': 'auto'
  };

  const headerInfoStyle = {
    display: 'grid',
    'grid-template-columns': '1fr 1fr 1fr',
    gap: '1rem',
    'margin-bottom': '1.5rem',
    padding: '1rem',
    background: 'var(--gray-50, #f9fafb)',
    'border-radius': '8px'
  };

  const inputGroupStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    gap: '0.25rem'
  };

  const labelStyle = {
    'font-size': '0.75rem',
    'font-weight': '600',
    color: 'var(--text-muted)',
    'text-transform': 'uppercase' as const
  };

  const inputStyle = {
    padding: '0.5rem',
    border: '1px solid var(--border-color)',
    'border-radius': '4px',
    'font-size': '0.875rem'
  };

  const tableStyle = {
    width: '100%',
    'border-collapse': 'collapse' as const,
    'margin-bottom': '1rem'
  };

  const thStyle = {
    padding: '0.75rem',
    'text-align': 'left' as const,
    'font-weight': '600',
    'font-size': '0.75rem',
    'text-transform': 'uppercase' as const,
    color: 'var(--text-muted)',
    'border-bottom': '2px solid var(--border-color)',
    background: 'var(--gray-50, #f9fafb)'
  };

  const thRightStyle = {
    ...thStyle,
    'text-align': 'right' as const
  };

  const tdStyle = {
    padding: '0.5rem 0.75rem',
    'border-bottom': '1px solid var(--border-color)',
    'vertical-align': 'middle' as const
  };

  const tdRightStyle = {
    ...tdStyle,
    'text-align': 'right' as const
  };

  const amountInputStyle = {
    width: '100px',
    padding: '0.375rem 0.5rem',
    border: '1px solid var(--border-color)',
    'border-radius': '4px',
    'text-align': 'right' as const,
    'font-family': 'monospace'
  };

  const accountSelectorStyle = {
    position: 'relative' as const
  };

  const accountButtonStyle = {
    padding: '0.375rem 0.5rem',
    border: '1px solid var(--border-color)',
    'border-radius': '4px',
    background: 'white',
    cursor: 'pointer',
    'text-align': 'left' as const,
    'min-width': '200px',
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center'
  };

  const dropdownStyle = {
    position: 'absolute' as const,
    top: '100%',
    left: '0',
    right: '0',
    background: 'white',
    border: '1px solid var(--border-color)',
    'border-radius': '4px',
    'box-shadow': '0 4px 12px rgba(0,0,0,0.15)',
    'z-index': '1000',
    'max-height': '200px',
    'overflow-y': 'auto' as const
  };

  const dropdownItemStyle = {
    padding: '0.5rem 0.75rem',
    cursor: 'pointer',
    'border-bottom': '1px solid var(--border-color)',
    'font-size': '0.875rem'
  };

  const totalsRowStyle = {
    'font-weight': '700',
    background: 'var(--gray-100, #f3f4f6)'
  };

  const balanceIndicatorStyle = {
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    gap: '0.5rem',
    padding: '0.75rem',
    'border-radius': '8px',
    'font-weight': '600',
    'margin-bottom': '1rem'
  };

  const footerStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'padding-top': '1rem',
    'border-top': '1px solid var(--border-color)',
    gap: '1rem'
  };

  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      title={t('journal.entryBookPreview', 'Vista Previa del Asiento Contable')}
      size="lg"
      maxWidth="900px"
    >
      <Show when={props.previewData} fallback={
        <div style={{ 'text-align': 'center', padding: '2rem', color: 'var(--text-muted)' }}>
          {t('common.noDataFound', 'No hay datos disponibles')}
        </div>
      }>
        <div style={containerStyle}>
          {/* Header Information */}
          <div style={headerInfoStyle}>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>{t('journal.date', 'Fecha')}</label>
              <input
                type="date"
                style={inputStyle}
                value={entryDate()}
                onInput={(e) => setEntryDate(e.currentTarget.value)}
              />
            </div>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>{t('journal.reference', 'Referencia')}</label>
              <input
                type="text"
                style={inputStyle}
                value={reference()}
                onInput={(e) => setReference(e.currentTarget.value)}
                placeholder={t('journal.referencePlaceholder', 'Ej: FAC-001')}
              />
            </div>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>{t('journal.source', 'Origen')}</label>
              <input
                type="text"
                style={{ ...inputStyle, background: 'var(--gray-100)', cursor: 'not-allowed' }}
                value={props.previewData?.sourceType || ''}
                readonly
              />
            </div>
          </div>

          {/* Description */}
          <div style={{ ...inputGroupStyle, 'margin-bottom': '1rem' }}>
            <label style={labelStyle}>{t('common.description', 'Descripcion')}</label>
            <textarea
              style={{ ...inputStyle, 'min-height': '60px', resize: 'vertical' as const }}
              value={description()}
              onInput={(e) => setDescription(e.currentTarget.value)}
              placeholder={t('journal.descriptionPlaceholder', 'Descripcion del asiento contable...')}
            />
          </div>

          {/* Entry Lines Table */}
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>{t('journal.account', 'Cuenta')}</th>
                <th style={thStyle}>{t('common.description', 'Descripcion')}</th>
                <th style={thRightStyle}>{t('journal.debit', 'Debe')}</th>
                <th style={thRightStyle}>{t('journal.credit', 'Haber')}</th>
                <th style={{ ...thStyle, width: '50px' }}></th>
              </tr>
            </thead>
            <tbody>
              <For each={editableEntries()}>
                {(entry) => (
                  <tr>
                    <td style={tdStyle}>
                      <div style={accountSelectorStyle}>
                        <button
                          style={accountButtonStyle}
                          onClick={() => setShowAccountSelector(
                            showAccountSelector() === entry.id ? null : entry.id
                          )}
                        >
                          <span>
                            {entry.accountCode ? (
                              <span>
                                <strong>{entry.accountCode}</strong> - {entry.accountName}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>
                                {t('journal.selectAccount', 'Seleccionar cuenta...')}
                              </span>
                            )}
                          </span>
                          <span>▼</span>
                        </button>

                        <Show when={showAccountSelector() === entry.id}>
                          <div style={dropdownStyle}>
                            <div style={{ padding: '0.5rem', 'border-bottom': '1px solid var(--border-color)' }}>
                              <input
                                type="text"
                                style={{ ...inputStyle, width: '100%' }}
                                placeholder={t('common.search', 'Buscar...')}
                                value={accountSearch()}
                                onInput={(e) => setAccountSearch(e.currentTarget.value)}
                                autofocus
                              />
                            </div>
                            <For each={availableAccounts()}>
                              {(account) => (
                                <div
                                  style={dropdownItemStyle}
                                  onClick={() => selectAccount(entry.id, account)}
                                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--gray-100)'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                >
                                  <strong>{account.accountNumber || account.code}</strong>
                                  <span style={{ 'margin-left': '0.5rem' }}>{account.name}</span>
                                  <Show when={account.accountType}>
                                    <span style={{
                                      'margin-left': '0.5rem',
                                      'font-size': '0.7rem',
                                      padding: '0.125rem 0.375rem',
                                      'border-radius': '4px',
                                      background: account.accountType === 'Asset' ? '#e3f2fd' :
                                                  account.accountType === 'Liability' ? '#fff3e0' :
                                                  account.accountType === 'Revenue' ? '#e8f5e9' :
                                                  account.accountType === 'Expense' ? '#ffebee' : '#f5f5f5',
                                      color: account.accountType === 'Asset' ? '#1565c0' :
                                             account.accountType === 'Liability' ? '#ef6c00' :
                                             account.accountType === 'Revenue' ? '#2e7d32' :
                                             account.accountType === 'Expense' ? '#c62828' : '#666'
                                    }}>
                                      {account.accountType}
                                    </span>
                                  </Show>
                                </div>
                              )}
                            </For>
                          </div>
                        </Show>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <input
                        type="text"
                        style={{ ...inputStyle, width: '100%' }}
                        value={entry.description || ''}
                        onInput={(e) => updateEntry(entry.id, 'description', e.currentTarget.value)}
                        placeholder={t('journal.lineDescription', 'Descripcion de la linea')}
                      />
                    </td>
                    <td style={tdRightStyle}>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        style={amountInputStyle}
                        value={entry.debit || ''}
                        onInput={(e) => {
                          const value = parseFloat(e.currentTarget.value) || 0;
                          updateEntry(entry.id, 'debit', value);
                          if (value > 0) updateEntry(entry.id, 'credit', 0);
                        }}
                      />
                    </td>
                    <td style={tdRightStyle}>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        style={amountInputStyle}
                        value={entry.credit || ''}
                        onInput={(e) => {
                          const value = parseFloat(e.currentTarget.value) || 0;
                          updateEntry(entry.id, 'credit', value);
                          if (value > 0) updateEntry(entry.id, 'debit', 0);
                        }}
                      />
                    </td>
                    <td style={tdStyle}>
                      <button
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#dc3545',
                          cursor: 'pointer',
                          'font-size': '1.2rem',
                          padding: '0.25rem'
                        }}
                        onClick={() => removeEntryLine(entry.id)}
                        title={t('common.remove', 'Eliminar')}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                )}
              </For>

              {/* Totals Row */}
              <tr style={totalsRowStyle}>
                <td style={tdStyle} colspan="2">
                  <strong>{t('journal.totals', 'TOTALES')}</strong>
                </td>
                <td style={{ ...tdRightStyle, color: '#1976d2' }}>
                  <strong>{formatCurrency(totals().totalDebit)}</strong>
                </td>
                <td style={{ ...tdRightStyle, color: '#2e7d32' }}>
                  <strong>{formatCurrency(totals().totalCredit)}</strong>
                </td>
                <td style={tdStyle}></td>
              </tr>
            </tbody>
          </table>

          {/* Add Line Button */}
          <button
            style={{
              padding: '0.5rem 1rem',
              background: 'var(--gray-100)',
              border: '1px dashed var(--border-color)',
              'border-radius': '4px',
              cursor: 'pointer',
              width: '100%',
              'margin-bottom': '1rem',
              color: 'var(--text-muted)',
              'font-weight': '500'
            }}
            onClick={addEntryLine}
          >
            + {t('journal.addLine', 'Agregar Linea')}
          </button>

          {/* Balance Indicator */}
          <div style={{
            ...balanceIndicatorStyle,
            background: isBalanced() ? '#e8f5e9' : '#ffebee',
            color: isBalanced() ? '#2e7d32' : '#c62828'
          }}>
            <span style={{ 'font-size': '1.5rem' }}>
              {isBalanced() ? '✓' : '⚠'}
            </span>
            <span>
              {isBalanced()
                ? t('journal.balanced', 'BALANCEADO')
                : `${t('journal.unbalanced', 'DESBALANCEADO')} - ${t('journal.difference', 'Diferencia')}: ${formatCurrency(difference())}`
              }
            </span>
          </div>

          {/* Save Result Message */}
          <Show when={saveResult()}>
            <div style={{
              padding: '0.75rem 1rem',
              'border-radius': '8px',
              'margin-bottom': '1rem',
              background: saveResult()?.success ? '#e8f5e9' : '#ffebee',
              color: saveResult()?.success ? '#2e7d32' : '#c62828',
              display: 'flex',
              'align-items': 'center',
              gap: '0.5rem'
            }}>
              <span>{saveResult()?.success ? '✓' : '✗'}</span>
              <span>{saveResult()?.message}</span>
            </div>
          </Show>

          {/* Footer Actions */}
          <div style={footerStyle}>
            <div style={{ 'font-size': '0.85rem', color: 'var(--text-muted)' }}>
              {editableEntries().length} {t('journal.lines', 'lineas')}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Button variant="secondary" onClick={props.onClose}>
                {t('common.cancel', 'Cancelar')}
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={isSaving() || !isBalanced()}
              >
                <Show when={isSaving()} fallback={
                  <>📒 {t('journal.saveEntry', 'Guardar Asiento')}</>
                }>
                  <span style={{
                    display: 'inline-block',
                    width: '14px',
                    height: '14px',
                    border: '2px solid white',
                    'border-top-color': 'transparent',
                    'border-radius': '50%',
                    animation: 'spin 1s linear infinite',
                    'margin-right': '0.5rem'
                  }} />
                  {t('common.saving', 'Guardando...')}
                </Show>
              </Button>
            </div>
          </div>
        </div>

        {/* CSS for animations */}
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </Show>
    </Modal>
  );
};

export default EntryBookPreviewModal;
