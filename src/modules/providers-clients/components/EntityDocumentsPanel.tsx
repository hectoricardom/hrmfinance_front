import { Component, createSignal, createMemo, For, Show } from 'solid-js';
import { useTranslation } from '../../../translations';
import { PendingDocument, ProviderClient } from '../types';
import {
  centsToDollars,
  dollarsToCents,
  centsToFormatted,
  addCents
} from '../../../utils/currencyUtils';
import { Modal, Button, FormInput } from '../../ui';
import { entryBookStore, JournalEntry, JournalEntryLine } from '../../journal/stores/entryBookStore';
import { accountsStore } from '../../accounts/stores/accountsStore';

interface EntityDocumentsPanelProps {
  entity: ProviderClient;
  documents: PendingDocument[];
  totalBalance: number; // In cents
  advanceBalance: number; // In cents - advance payments available
  onSelectionChange: (selectedDocs: PendingDocument[], totalToApply: number) => void;
  mode: 'payment' | 'collection';
}

const EntityDocumentsPanel: Component<EntityDocumentsPanelProps> = (props) => {
  const { t } = useTranslation();

  const [selectedDocs, setSelectedDocs] = createSignal<Map<string, number>>(new Map());
  const [showAllDocuments, setShowAllDocuments] = createSignal(false);
  const [showZeroBalance, setShowZeroBalance] = createSignal(false);
  const [expandedGroups, setExpandedGroups] = createSignal<Set<string>>(new Set(['invoices', 'advances']));

  // Cancel Advance Dialog state
  const [showCancelAdvanceDialog, setShowCancelAdvanceDialog] = createSignal(false);
  const [selectedDocForCancel, setSelectedDocForCancel] = createSignal<PendingDocument | null>(null);
  const [cancelAdvanceAmount, setCancelAdvanceAmount] = createSignal(0);
  const [isCreatingEntry, setIsCreatingEntry] = createSignal(false);
  const [cancelAdvanceError, setCancelAdvanceError] = createSignal<string | null>(null);

  // Debug log
 // console.log('[EntityDocumentsPanel] Received documents:', props.documents);



  // Separate documents into invoices/regular docs and advances
  const groupedDocuments = createMemo(() => {
    const docs = showZeroBalance()
      ? props.documents
      : props.documents.filter(doc => doc.balance !== 0);

    // Identify advances (documents starting with ADV, ANT, ADVANCE, or similar patterns)
    const advancePatterns = /^(ADV|ANT|ADVANCE|ANTICIPO|PREPAY|DEPOSIT)/i;

    const advances: PendingDocument[] = [];
    const invoices: PendingDocument[] = [];






    docs.forEach(doc => {
      const docName = doc.document || '';
      if (advancePatterns.test(docName) || doc.balance < 0) {
        // Negative balance usually indicates an advance/credit
        advances.push(doc);
      } else {
        invoices.push(doc);
      }
    });

    // Sort each group by absolute balance (highest first)
    advances.sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));


    invoices.sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));

    return { advances, invoices };
  });

  // Filter documents with pending balance (show all with non-zero balance)
  const pendingDocuments = createMemo(() => {
    const { advances, invoices } = groupedDocuments();
    return [...invoices, ...advances];
  });

  const toggleGroup = (group: string) => {
    const current = new Set(expandedGroups());
    if (current.has(group)) {
      current.delete(group);
    } else {
      current.add(group);
    }
    setExpandedGroups(current);
  };

  // Calculate totals
  const totalSelected = createMemo(() => {
    let total = 0;
    selectedDocs().forEach((amount) => {
      total += amount;
    });
    return total;
  });

  const totalPending = createMemo(() => {
    return pendingDocuments().reduce((sum, doc) => sum + Math.abs(doc.balance), 0);
  });

  const handleToggleDocument = (doc: PendingDocument, checked: boolean) => {
    const newSelected = new Map(selectedDocs());

    if (checked) {
      newSelected.set(doc.document, Math.abs(doc.balance));
    } else {
      newSelected.delete(doc.document);
    }

    setSelectedDocs(newSelected);
    updateParent(newSelected);
  };

  const handleAmountChange = (doc: PendingDocument, amount: number) => {
    const newSelected = new Map(selectedDocs());
    const maxAmount = Math.abs(doc.balance);
    const validAmount = Math.min(Math.max(0, amount), maxAmount);

    if (validAmount > 0) {
      newSelected.set(doc.document, validAmount);
    } else {
      newSelected.delete(doc.document);
    }

    setSelectedDocs(newSelected);
    updateParent(newSelected);
  };

  const handleSelectAll = () => {
    const newSelected = new Map<string, number>();
    pendingDocuments().forEach(doc => {
      newSelected.set(doc.document, Math.abs(doc.balance));
    });
    setSelectedDocs(newSelected);
    updateParent(newSelected);
  };

  const handleClearAll = () => {
    setSelectedDocs(new Map());
    updateParent(new Map());
  };

  const updateParent = (selected: Map<string, number>) => {
    const selectedDocsList = pendingDocuments()
      .filter(doc => selected.has(doc.document))
      .map(doc => ({
        ...doc,
        selected: true,
        applyAmount: selected.get(doc.document) || 0
      }));

    let total = 0;
    selected.forEach((amount) => {
      total += amount;
    });

    props.onSelectionChange(selectedDocsList, total);
  };

  const isDocumentSelected = (docId: string) => selectedDocs().has(docId);
  const getDocumentAmount = (docId: string) => selectedDocs().get(docId) || 0;

  const displayedDocuments = createMemo(() => {
    const docs = pendingDocuments();
    return showAllDocuments() ? docs : docs.slice(0, 5);
  });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  };

  // Cancel Advance Dialog handlers
  const openCancelAdvanceDialog = (doc: PendingDocument) => {
    setSelectedDocForCancel(doc);
    setCancelAdvanceAmount(doc.advancePay || 0);
    setCancelAdvanceError(null);
    setShowCancelAdvanceDialog(true);
  };

  const closeCancelAdvanceDialog = () => {
    setShowCancelAdvanceDialog(false);
    setSelectedDocForCancel(null);
    setCancelAdvanceAmount(0);
    setCancelAdvanceError(null);
  };

  // Get account info for the entry preview
  const getRelatedAccount = () => {
    let keacc = props.entity.relatedAccountId;
    if (!keacc) return null;
    let acc = accountsStore.accounts.find(a => a.id === keacc || a.accountId === keacc);
    if(acc?.parentAccountId){
      return accountsStore.accounts.find(a => a.id === acc?.parentAccountId);
    }
    return acc
  };

  const getAdvanceAccount = () => {
    let keacc = props.entity.advanceAccountId;
    if (!keacc) return null;
    let acc = accountsStore.accounts.find(a => a.id === keacc || a.accountId === keacc);
    if(acc?.parentAccountId){
      return accountsStore.accounts.find(a => a.id === acc?.parentAccountId);
    }
    return acc
  };

  // Create the journal entry for canceling the advance
  const handleCancelAdvance = async () => {
    const doc = selectedDocForCancel();
    if (!doc) return;

    const amount = cancelAdvanceAmount();
    if (amount <= 0) {
      setCancelAdvanceError(t('providersClients.invalidAmount', 'Monto inválido'));
      return;
    }

    const relatedAccount = getRelatedAccount();
    const advanceAccount = getAdvanceAccount();

    if (!relatedAccount || !advanceAccount) {
      setCancelAdvanceError(t('providersClients.missingAccounts', 'Falta configurar las cuentas del cliente/proveedor'));
      return;
    }

    setIsCreatingEntry(true);
    setCancelAdvanceError(null);

    try {
      const today = new Date().toISOString().split('T')[0];
      const entryNumber = entryBookStore.getNextEntryNumber();

      // For collection mode (client): Debit receivable, Credit advance
      // For payment mode (provider): Debit advance, Credit payable
      const isCollection = props.mode === 'collection';



      const lines: JournalEntryLine[] = [
        {
          accountId: advanceAccount.accountId || advanceAccount.id,
          accountNumber: advanceAccount.accountNumber,
          accountName: advanceAccount.name,
          description: `${t('providersClients.advanceAppliedTo', 'Cancelar anticipo para')} ${doc.document}`,
          amount: amount,
          document: doc.document,
          referenceId: props.entity.id,
          debitAmount: isCollection ? amount : 0,
          creditAmount: isCollection ? 0 : amount, 
          isDebit: !isCollection
        },
        {
          accountId: relatedAccount.accountId || relatedAccount.id,
          accountNumber: relatedAccount.accountNumber,
          accountName: relatedAccount.name,
          description: `${t('providersClients.cancelAdvanceFor', 'Anticipo aplicado a')} ${doc.document}`,
          amount: amount,
          referenceId: props.entity.id,
          document: doc.document,
          debitAmount: isCollection ? 0 : amount,
          creditAmount: isCollection ? amount : 0,
          isDebit: isCollection
        }
      ];

      const entry: Omit<JournalEntry, 'id'> = {
        entryNumber,
        date: today,
        createAt: new Date().toISOString(),
        description: `${t('providersClients.cancelAdvancePayment', 'APLICAR ANTICIPO')} - ${props.entity.name} - DOC: ${doc.document}`,
        reference: doc.document,
        document: doc.document,
        status: 'draft',
        createdBy: 'System',
        createdAt: new Date().toISOString(),
        totalDebits: amount,
        totalCredits: amount,
        lines
      };

      await entryBookStore.addJournalEntry(entry);
      closeCancelAdvanceDialog();
    } catch (error) {
      setCancelAdvanceError(error instanceof Error ? error.message : t('common.error', 'Error'));
    } finally {
      setIsCreatingEntry(false);
    }
  };

  return (
    <div style={{
      border: '1px solid var(--border-color)',
      'border-radius': 'var(--border-radius-md)',
      'margin-bottom': '1rem',
      overflow: 'hidden'
    }}>
      {/* Header with summary */}
      <div style={{
        background: props.mode === 'collection' ? '#e8f5e9' : '#e3f2fd',
        padding: '0.75rem 1rem',
        'border-bottom': '1px solid var(--border-color)'
      }}>
        <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' }}>
          <div>
            <div style={{ 'font-weight': '600', 'font-size': '0.875rem' }}>
              {props.mode === 'collection'
                ? t('providersClients.pendingToCollect', 'Pendiente por Cobrar')
                : t('providersClients.pendingToPay', 'Pendiente por Pagar')
              }
            </div>
            <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
              {pendingDocuments().length} {t('providersClients.documents', 'documentos')}
            </div>
          </div>
          <div style={{ 'text-align': 'right' }}>
            <div style={{
              'font-size': '1.25rem',
              'font-weight': '700',
              color: props.mode === 'collection' ? '#388e3c' : '#1976d2'
            }}>
              {centsToFormatted(totalPending())}
            </div>
          </div>
        </div>

        {/* Advance balance info */}
        <Show when={props.advanceBalance !== 0}>
          <div style={{
            'margin-top': '0.5rem',
            padding: '0.5rem',
            background: props.advanceBalance > 0 ? '#fff3e0' : '#fce4ec',
            'border-radius': 'var(--border-radius-sm)',
            'font-size': '0.8rem'
          }}>
            <Show when={props.advanceBalance > 0}>
              <span style={{ color: '#e65100' }}>
                {t('providersClients.advanceAvailable', 'Anticipo disponible')}: {centsToFormatted(props.advanceBalance)}
              </span>
            </Show>
            <Show when={props.advanceBalance < 0}>
              <span style={{ color: '#c2185b' }}>
                {t('providersClients.advancePending', 'Anticipo pendiente')}: {centsToFormatted(Math.abs(props.advanceBalance))}
              </span>
            </Show>
          </div>
        </Show>
      </div>

      {/* Selection controls */}
      <Show when={pendingDocuments().length > 0}>
        <div style={{
          padding: '0.5rem 1rem',
          background: 'var(--gray-50)',
          'border-bottom': '1px solid var(--border-color)',
          display: 'flex',
          'justify-content': 'space-between',
          'align-items': 'center',
          'font-size': '0.8rem'
        }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={handleSelectAll}
              style={{
                padding: '0.25rem 0.5rem',
                background: 'var(--primary-color)',
                color: 'white',
                border: 'none',
                'border-radius': 'var(--border-radius-sm)',
                cursor: 'pointer',
                'font-size': '0.75rem'
              }}
            >
              {t('common.selectAll', 'Seleccionar todo')}
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              style={{
                padding: '0.25rem 0.5rem',
                background: 'white',
                border: '1px solid var(--border-color)',
                'border-radius': 'var(--border-radius-sm)',
                cursor: 'pointer',
                'font-size': '0.75rem'
              }}
            >
              {t('common.clearAll', 'Limpiar')}
            </button>
          </div>
          <Show when={selectedDocs().size > 0}>
            <div style={{ 'font-weight': '600', color: 'var(--primary-color)' }}>
              {t('providersClients.selectedToApply', 'A aplicar')}: {centsToFormatted(totalSelected())}
            </div>
          </Show>
        </div>
      </Show>

      {/* Documents list - Grouped by type */}
      <div style={{ 'max-height': '350px', 'overflow-y': 'auto' }}>
        <Show
          when={pendingDocuments().length > 0}
          fallback={
            <div style={{
              padding: '2rem',
              'text-align': 'center',
              color: 'var(--text-muted)',
              'font-size': '0.875rem'
            }}>
              <div style={{ 'margin-bottom': '0.5rem' }}>
                {props.mode === 'collection'
                  ? t('providersClients.noDocumentsToCobrar', 'No hay documentos pendientes por cobrar')
                  : t('providersClients.noDocumentsToPagar', 'No hay documentos pendientes por pagar')
                }
              </div>
              <div style={{ 'font-size': '0.75rem', color: '#999' }}>
                {t('providersClients.documentsHint', 'Los documentos aparecen cuando hay asientos contables con esta cuenta y numero de documento.')}
                <br />
                {t('providersClients.totalDocsReceived', 'Documentos recibidos')}: {props.documents.length}
              </div>
              <Show when={props.documents.length > 0}>
                <button
                  type="button"
                  onClick={() => setShowZeroBalance(!showZeroBalance())}
                  style={{
                    'margin-top': '0.5rem',
                    padding: '0.25rem 0.5rem',
                    background: 'var(--gray-100)',
                    border: '1px solid var(--border-color)',
                    'border-radius': 'var(--border-radius-sm)',
                    cursor: 'pointer',
                    'font-size': '0.7rem'
                  }}
                >
                  {showZeroBalance()
                    ? t('providersClients.hidePaidDocs', 'Ocultar pagados')
                    : t('providersClients.showAllDocs', 'Mostrar todos (incluyendo pagados)')
                  }
                </button>
              </Show>
            </div>
          }
        >
          {/* Invoices/Regular Documents Group */}
          <Show when={groupedDocuments().invoices.length > 0}>
            <div style={{ 'margin-bottom': '0.5rem' }}>
              {/* Group Header */}
              <div
                onClick={() => toggleGroup('invoices')}
                style={{
                  display: 'flex',
                  'justify-content': 'space-between',
                  'align-items': 'center',
                  padding: '0.5rem 1rem',
                  background: props.mode === 'collection' ? '#e8f5e9' : '#e3f2fd',
                  cursor: 'pointer',
                  'user-select': 'none',
                  'border-bottom': '1px solid var(--border-color)'
                }}
              >
                <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                  <span style={{ 'font-size': '1rem' }}>{expandedGroups().has('invoices') ? '▼' : '▶'}</span>
                  <span style={{ 'font-weight': '600', 'font-size': '0.85rem' }}>
                    📄 {t('providersClients.invoicesAndDocs', 'Facturas y Documentos')}
                  </span>
                  <span style={{
                    background: props.mode === 'collection' ? '#388e3c' : '#1976d2',
                    color: 'white',
                    padding: '0.1rem 0.4rem',
                    'border-radius': '10px',
                    'font-size': '0.7rem'
                  }}>
                    {groupedDocuments().invoices.length}
                  </span>
                </div>
                <div style={{ 'font-weight': '600', 'font-size': '0.85rem', color: props.mode === 'collection' ? '#388e3c' : '#1976d2' }}>
                  {centsToFormatted(groupedDocuments().invoices.reduce((sum, d) => sum + Math.abs(d.balance), 0))}
                </div>
              </div>

              {/* Invoices Table */}
              <Show when={expandedGroups().has('invoices')}>
                <table style={{ width: '100%', 'border-collapse': 'collapse', 'font-size': '0.8rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--gray-50)', 'font-weight': '600' }}>
                      <th style={{ padding: '0.4rem', 'text-align': 'left', width: '30px' }}></th>
                      <th style={{ padding: '0.4rem', 'text-align': 'left' }}>
                        {t('providersClients.document', 'Documento')}
                      </th>
                      <th style={{ padding: '0.4rem', 'text-align': 'right' }}>
                        {t('providersClients.advancePay', 'Anticipo')}
                      </th>
                      <th style={{ padding: '0.4rem', 'text-align': 'right' }}>
                        {t('providersClients.pendingBalance', 'Saldo')}
                      </th>
                      <th style={{ padding: '0.4rem', 'text-align': 'right', width: '100px' }}>
                        {t('providersClients.applyAmount', 'Aplicar')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={showAllDocuments() ? groupedDocuments().invoices : groupedDocuments().invoices.slice(0, 5)}>
                      {(doc) => (
                        <tr style={{
                          'border-bottom': '1px solid var(--border-color)',
                          background: isDocumentSelected(doc.document) ? '#e8f4fd' : 'white'
                        }}>
                          <td style={{ padding: '0.4rem', 'text-align': 'center' }}>
                            <input
                              type="checkbox"
                              checked={isDocumentSelected(doc.document)}
                              onChange={(e) => handleToggleDocument(doc, e.target.checked)}
                            />
                          </td>
                          <td style={{ padding: '0.4rem' }}>
                            <div style={{ 'font-weight': '500' }}>{doc.document || 'Sin documento'}</div>
                            <div style={{ 'font-size': '0.65rem', color: 'var(--text-muted)' }}>
                              {doc.transactions?.length || 0} {t('providersClients.movements', 'mov.')}
                            </div>
                          </td>
                          <Show when={doc.advancePay} 
                            fallback={
                              <td/>
                            }
                          >
                          <td style={{
                            padding: '0 0.4rem',
                            'text-align': 'right',
                            'font-weight': '600',
                            color: '#e65100',
                            
                          }}>
                             <button
                               type="button"
                               onClick={(e) => {
                                 e.stopPropagation();
                                 openCancelAdvanceDialog(doc);
                               }}
                               style={{
                                 'font-size': '0.65rem',
                                 color: '#e65100',
                                 background: '#fff3e0',
                                 border: '1px solid #ffcc80',
                                 'border-radius': 'var(--border-radius-sm)',
                                 padding: '.2rem .5rem',
                                 "margin-right": '.4rem',
                                 cursor: 'pointer'
                               }}
                             >
                              {t('providersClients.applyAdvance', 'Aplicar Anticipo')}
                             </button>
                            {centsToFormatted(Math.abs(doc.advancePay))}
                          </td>
                          </Show>
                          <td style={{
                            padding: '0.4rem',
                            'text-align': 'right',
                            'font-weight': '600',
                            color: '#388e3c'
                          }}>
                            {centsToFormatted(Math.abs(doc.balance))}
                          </td>
                          <td style={{ padding: '0.4rem', 'text-align': 'right' }}>
                            <Show
                              when={isDocumentSelected(doc.document)}
                              fallback={<span style={{ color: 'var(--text-muted)', 'font-size': '0.7rem' }}>-</span>}
                            >
                              <FormInput
                                type="number"
                                value={centsToDollars(getDocumentAmount(doc.document)).toFixed(2)}
                                onChange={(e) => handleAmountChange(doc, dollarsToCents(parseFloat(e) || 0))}
                                min="0"
                                max={centsToDollars(Math.abs(doc.balance))}
                                
                                style={{
                                  width: '85px',
                                  padding: '0.2rem',
                                  border: '1px solid var(--border-color)',
                                  'border-radius': 'var(--border-radius-sm)',
                                  'text-align': 'right',
                                  'font-size': '0.75rem'
                                }}
                              />
                            </Show>
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
                <Show when={groupedDocuments().invoices.length > 5}>
                  <div style={{ padding: '0.25rem', 'text-align': 'center', background: 'var(--gray-50)' }}>
                    <button
                      type="button"
                      onClick={() => setShowAllDocuments(!showAllDocuments())}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary-color)',
                        cursor: 'pointer',
                        'font-size': '0.7rem',
                        'text-decoration': 'underline'
                      }}
                    >
                      {showAllDocuments() ? t('common.showLess', 'Ver menos') : `${t('common.showAll', 'Ver todos')} (${groupedDocuments().invoices.length})`}
                    </button>
                  </div>
                </Show>
              </Show>
            </div>
          </Show>

          {/* Advances Group */}
          <Show when={groupedDocuments().advances.length > 0}>
            <div>
              {/* Group Header */}
              <div
                onClick={() => toggleGroup('advances')}
                style={{
                  display: 'flex',
                  'justify-content': 'space-between',
                  'align-items': 'center',
                  padding: '0.5rem 1rem',
                  background: '#fff3e0',
                  cursor: 'pointer',
                  'user-select': 'none',
                  'border-bottom': '1px solid var(--border-color)'
                }}
              >
                <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                  <span style={{ 'font-size': '1rem' }}>{expandedGroups().has('advances') ? '▼' : '▶'}</span>
                  <span style={{ 'font-weight': '600', 'font-size': '0.85rem' }}>
                    💰 {t('providersClients.advancesAndCredits', 'Anticipos y Créditos')}
                  </span>
                  <span style={{
                    background: '#e65100',
                    color: 'white',
                    padding: '0.1rem 0.4rem',
                    'border-radius': '10px',
                    'font-size': '0.7rem'
                  }}>
                    {groupedDocuments().advances.length}
                  </span>
                </div>
                <div style={{ 'font-weight': '600', 'font-size': '0.85rem', color: '#e65100' }}>
                  {centsToFormatted(groupedDocuments().advances.reduce((sum, d) => sum + Math.abs(d.balance), 0))}
                </div>
              </div>

              {/* Advances Table */}
              <Show when={expandedGroups().has('advances')}>
                <table style={{ width: '100%', 'border-collapse': 'collapse', 'font-size': '0.8rem' }}>
                  <thead>
                    <tr style={{ background: '#fff8e1', 'font-weight': '600' }}>
                      <th style={{ padding: '0.4rem', 'text-align': 'left', width: '30px' }}></th>
                      <th style={{ padding: '0.4rem', 'text-align': 'left' }}>
                        {t('providersClients.advanceDocument', 'Documento Anticipo')}
                      </th>
                      <th style={{ padding: '0.4rem', 'text-align': 'right' }}>
                        {t('providersClients.availableBalance', 'Disponible')}
                      </th>
                      <th style={{ padding: '0.4rem', 'text-align': 'right', width: '100px' }}>
                        {t('providersClients.useAmount', 'Usar')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={groupedDocuments().advances}>
                      {(doc) => (
                        <tr style={{
                          'border-bottom': '1px solid #ffe0b2',
                          background: isDocumentSelected(doc.document) ? '#fff3e0' : 'white'
                        }}>
                          <td style={{ padding: '0.4rem', 'text-align': 'center' }}>
                            <input
                              type="checkbox"
                              checked={isDocumentSelected(doc.document)}
                              onChange={(e) => handleToggleDocument(doc, e.target.checked)}
                            />
                          </td>
                          <td style={{ padding: '0.4rem' }}>
                            <div style={{ 'font-weight': '500', color: '#e65100' }}>
                              {doc.document || t('providersClients.unnamedAdvance', 'Anticipo sin nombre')}
                            </div>
                            <div style={{ 'font-size': '0.65rem', color: 'var(--text-muted)' }}>
                              {doc.transactions?.length || 0} {t('providersClients.movements', 'mov.')}
                              {doc.balance < 0 && <span style={{ 'margin-left': '0.25rem', color: '#e65100' }}>• {t('providersClients.credit', 'Crédito')}</span>}
                            </div>
                          </td>
                          <td style={{
                            padding: '0.4rem',
                            'text-align': 'right',
                            'font-weight': '600',
                            color: '#e65100'
                          }}>
                            {centsToFormatted(Math.abs(doc.balance))}
                          </td>
                          <td style={{ padding: '0.4rem', 'text-align': 'right' }}>
                            <Show
                              when={isDocumentSelected(doc.document)}
                              fallback={<span style={{ color: 'var(--text-muted)', 'font-size': '0.7rem' }}>-</span>}
                            >
                              <input
                                type="number"
                                value={centsToDollars(getDocumentAmount(doc.document)).toFixed(2)}
                                onInput={(e) => handleAmountChange(doc, dollarsToCents(parseFloat(e.target.value) || 0))}
                                min="0"
                                max={centsToDollars(Math.abs(doc.balance))}
                                step="0.01"
                                style={{
                                  width: '85px',
                                  padding: '0.2rem',
                                  border: '1px solid #ffcc80',
                                  'border-radius': 'var(--border-radius-sm)',
                                  'text-align': 'right',
                                  'font-size': '0.75rem',
                                  background: '#fffde7'
                                }}
                              />
                            </Show>
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </Show>
            </div>
          </Show>

          {/* Show when no groups have items */}
          <Show when={groupedDocuments().invoices.length === 0 && groupedDocuments().advances.length === 0}>
            <div style={{
              padding: '2rem',
              'text-align': 'center',
              color: 'var(--text-muted)',
              'font-size': '0.875rem'
            }}>
              {t('providersClients.noDocumentsAvailable', 'No hay documentos disponibles')}
            </div>
          </Show>
        </Show>
      </div>


      {/* Summary when documents selected */}
      <Show when={selectedDocs().size > 0}>
        <div style={{
          padding: '0.75rem 1rem',
          background: props.mode === 'collection' ? '#c8e6c9' : '#bbdefb',
          'border-top': '1px solid var(--border-color)',
          display: 'flex',
          'justify-content': 'space-between',
          'align-items': 'center'
        }}>
          <div style={{ 'font-size': '0.875rem' }}>
            <strong>{selectedDocs().size}</strong> {t('providersClients.documentsSelected', 'documentos seleccionados')}
          </div>
          <div style={{
            'font-size': '1rem',
            'font-weight': '700',
            color: props.mode === 'collection' ? '#2e7d32' : '#1565c0'
          }}>
            {t('providersClients.totalToApply', 'Total a aplicar')}: {centsToFormatted(totalSelected())}
          </div>
        </div>
      </Show>











      {/* Cancel Advance Dialog */}
      <Modal
        isOpen={showCancelAdvanceDialog()}
        onClose={closeCancelAdvanceDialog}
        title={t('providersClients.cancelAdvanceTitle', 'Cancelar Anticipo')}
      >
        <Show when={selectedDocForCancel()}>
          {(doc) => {
            const relatedAccount = getRelatedAccount();
            const advanceAccount = getAdvanceAccount();
            const isCollection = props.mode === 'collection';

            return (
              <div>
                {/* Header Info */}
                <div style={{
                  background: '#fff3e0',
                  padding: '1rem',
                  'border-radius': 'var(--border-radius-sm)',
                  'margin-bottom': '1rem'
                }}>
                  <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem' }}>
                    {props.entity.name}
                  </div>
                  <div style={{ 'font-size': '0.9rem', color: 'var(--text-muted)' }}>
                    {t('providersClients.document', 'Documento')}: <strong>{doc().document}</strong>
                  </div>
                  <div style={{ 'font-size': '0.9rem', color: '#e65100', 'margin-top': '0.25rem' }}>
                    {t('providersClients.advanceAvailable', 'Anticipo disponible')}: <strong>{centsToFormatted(doc().advancePay || 0)}</strong>
                  </div>
                </div>

                {/* Amount to cancel */}
                <div style={{ 'margin-bottom': '1rem' }}>
                  <label style={{ display: 'block', 'font-weight': '600', 'margin-bottom': '0.5rem' }}>
                    {t('providersClients.amountToCancel', 'Monto a cancelar')}
                  </label>
                  <input
                    type="number"
                    value={centsToDollars(cancelAdvanceAmount()).toFixed(2)}
                    onInput={(e) => setCancelAdvanceAmount(dollarsToCents(parseFloat(e.target.value) || 0))}
                    max={centsToDollars(doc().advancePay || 0)}
                    min="0"
                    step="0.01"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '2px solid #e65100',
                      'border-radius': 'var(--border-radius-sm)',
                      'font-size': '1.25rem',
                      'font-weight': '700',
                      'text-align': 'right'
                    }}
                  />
                </div>

                {/* Entry Preview */}
                <div style={{
                  border: '1px solid var(--border-color)',
                  'border-radius': 'var(--border-radius-sm)',
                  overflow: 'hidden',
                  'margin-bottom': '1rem'
                }}>
                  <div style={{
                    background: 'var(--gray-100)',
                    padding: '0.75rem 1rem',
                    'font-weight': '600',
                    'border-bottom': '1px solid var(--border-color)'
                  }}>
                    {t('providersClients.entryPreview', 'Vista Previa del Asiento')}
                  </div>

                  {/* Description */}
                  <div style={{
                    padding: '0.75rem 1rem',
                    background: '#f5f5f5',
                    'border-bottom': '1px solid var(--border-color)',
                    'font-size': '0.85rem'
                  }}>
                    <div style={{ color: 'var(--text-muted)', 'margin-bottom': '0.25rem' }}>
                      {t('common.description', 'Descripción')}:
                    </div>
                    <div style={{ 'font-weight': '500' }}>
                      {t('providersClients.cancelAdvancePayment', 'CANCELAR ANTICIPO')} - {props.entity.name} - DOC: {doc().document}
                    </div>
                  </div>

                  {/* Entry Lines */}
                  <table style={{ width: '100%', 'border-collapse': 'collapse', 'font-size': '0.85rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--gray-50)' }}>
                        <th style={{ padding: '0.5rem', 'text-align': 'left', 'border-bottom': '1px solid var(--border-color)' }}>
                          {t('journal.account', 'Cuenta')}
                        </th>
                        <th style={{ padding: '0.5rem', 'text-align': 'right', width: '100px', 'border-bottom': '1px solid var(--border-color)' }}>
                          {t('journal.debit', 'Débito')}
                        </th>
                        <th style={{ padding: '0.5rem', 'text-align': 'right', width: '100px', 'border-bottom': '1px solid var(--border-color)' }}>
                          {t('journal.credit', 'Crédito')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Related Account (Receivable/Payable) */}
                      <tr>
                        <td style={{ padding: '0.5rem', 'border-bottom': '1px solid var(--border-color)' }}>
                          <Show when={relatedAccount} fallback={
                            <span style={{ color: '#dc3545' }}>{t('providersClients.noRelatedAccount', 'Sin cuenta configurada')}</span>
                          }>
                            <div style={{ 'font-weight': '500' }}>{relatedAccount?.accountNumber} - {relatedAccount?.name}</div>
                            <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                              {t('providersClients.cancelAdvanceFor', 'Cancelar anticipo para')} {doc().document}
                            </div>
                          </Show>
                        </td>
                        <td style={{
                          padding: '0.5rem',
                          'text-align': 'right',
                          'font-weight': '600',
                          color: isCollection ? '#2e7d32' : 'var(--text-muted)',
                          'border-bottom': '1px solid var(--border-color)'
                        }}>
                          {isCollection ? centsToFormatted(cancelAdvanceAmount()) : '-'}
                        </td>
                        <td style={{
                          padding: '0.5rem',
                          'text-align': 'right',
                          'font-weight': '600',
                          color: !isCollection ? '#1976d2' : 'var(--text-muted)',
                          'border-bottom': '1px solid var(--border-color)'
                        }}>
                          {!isCollection ? centsToFormatted(cancelAdvanceAmount()) : '-'}
                        </td>
                      </tr>

                      {/* Advance Account */}
                      <tr>
                        <td style={{ padding: '0.5rem', 'border-bottom': '1px solid var(--border-color)' }}>
                          <Show when={advanceAccount} fallback={
                            <span style={{ color: '#dc3545' }}>{t('providersClients.noAdvanceAccount', 'Sin cuenta de anticipo')}</span>
                          }>
                            <div style={{ 'font-weight': '500' }}>{advanceAccount?.accountNumber} - {advanceAccount?.name}</div>
                            <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                              {t('providersClients.advanceAppliedTo', 'Anticipo aplicado a')} {doc().document}
                            </div>
                          </Show>
                        </td>
                        <td style={{
                          padding: '0.5rem',
                          'text-align': 'right',
                          'font-weight': '600',
                          color: !isCollection ? '#2e7d32' : 'var(--text-muted)',
                          'border-bottom': '1px solid var(--border-color)'
                        }}>
                          {!isCollection ? centsToFormatted(cancelAdvanceAmount()) : '-'}
                        </td>
                        <td style={{
                          padding: '0.5rem',
                          'text-align': 'right',
                          'font-weight': '600',
                          color: isCollection ? '#1976d2' : 'var(--text-muted)',
                          'border-bottom': '1px solid var(--border-color)'
                        }}>
                          {isCollection ? centsToFormatted(cancelAdvanceAmount()) : '-'}
                        </td>
                      </tr>

                      {/* Totals */}
                      <tr style={{ background: 'var(--gray-50)', 'font-weight': '700' }}>
                        <td style={{ padding: '0.5rem' }}>
                          {t('journal.totals', 'Totales')}
                        </td>
                        <td style={{ padding: '0.5rem', 'text-align': 'right', color: '#2e7d32' }}>
                          {centsToFormatted(cancelAdvanceAmount())}
                        </td>
                        <td style={{ padding: '0.5rem', 'text-align': 'right', color: '#1976d2' }}>
                          {centsToFormatted(cancelAdvanceAmount())}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Error display */}
                <Show when={cancelAdvanceError()}>
                  <div style={{
                    padding: '0.75rem',
                    background: '#f8d7da',
                    color: '#721c24',
                    'border-radius': 'var(--border-radius-sm)',
                    'margin-bottom': '1rem',
                    'font-size': '0.85rem'
                  }}>
                    {cancelAdvanceError()}
                  </div>
                </Show>

                {/* Missing accounts warning */}
                <Show when={!relatedAccount || !advanceAccount}>
                  <div style={{
                    padding: '0.75rem',
                    background: '#fff3cd',
                    color: '#856404',
                    'border-radius': 'var(--border-radius-sm)',
                    'margin-bottom': '1rem',
                    'font-size': '0.85rem'
                  }}>
                    {t('providersClients.configureAccountsWarning', 'Debe configurar las cuentas del cliente/proveedor para crear asientos contables.')}
                  </div>
                </Show>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '1rem', 'justify-content': 'flex-end' }}>
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={closeCancelAdvanceDialog}
                    disabled={isCreatingEntry()}
                  >
                    {t('common.cancel', 'Cancelar')}
                  </Button>
                  <Button
                    variant="primary"
                    type="button"
                    onClick={handleCancelAdvance}
                    disabled={isCreatingEntry() || !relatedAccount || !advanceAccount || cancelAdvanceAmount() <= 0}
                    style={{
                      background: '#e65100',
                      'border-color': '#e65100'
                    }}
                  >
                    {isCreatingEntry()
                      ? t('common.creating', 'Creando...')
                      : t('providersClients.createEntry', 'Crear Asiento')
                    }
                  </Button>
                </div>
              </div>
            );
          }}
        </Show>
      </Modal>
    </div>
  );
};

export default EntityDocumentsPanel;
