import { Component, createSignal, createEffect, createMemo, Show, For } from 'solid-js';
import { Modal } from '../../ui';
import { useTranslation } from '../../../translations';
import { providersClientsStore } from '../stores/providersClientsStore';
import { ProviderClient, CollectionFormData, PendingDocument } from '../types';
import { accountsStore } from '../../accounts';
import EntityDocumentsPanel from './EntityDocumentsPanel';
import {
  dollarsToCents,
  centsToDollars,
  centsToFormatted,
  addCents
} from '../../../utils/currencyUtils';
import { fetchGraphQLSS, formatFloat } from '../../../services/utils';
import { authStore } from '../../../stores/authStore';
import { entryBookStore } from '../../journal';
import { JournalEntryLine } from '../../events';

interface CollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  entity: ProviderClient | null; // Can be null to allow entity selection
}

const CollectionModal: Component<CollectionModalProps> = (props) => {
  const { t } = useTranslation();

  // Entity selection
  const [selectedEntityId, setSelectedEntityId] = createSignal<string>('');
  const [entitySearch, setEntitySearch] = createSignal('');

  // Form fields
  const [amount, setAmount] = createSignal('');
  const [description, setDescription] = createSignal('');
  const [reference, setReference] = createSignal('');
  const [paymentMethod, setPaymentMethod] = createSignal<CollectionFormData['paymentMethod']>('cash');
  const [date, setDate] = createSignal(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = createSignal('');
  const [isAdvancePayment, setIsAdvancePayment] = createSignal(false);
  const [selectedPiggybankId, setSelectedPiggybankId] = createSignal('');
  const [advancePaymentsByDocs, setAdvancePaymentsByDocs] = createSignal({});

  const [error, setError] = createSignal<string | null>(null);

  // Document selection
  const [selectedDocs, setSelectedDocs] = createSignal<PendingDocument[]>([]);
  const [totalToApply, setTotalToApply] = createSignal(0);

  const [loading, setLoading] = createSignal(false);
  const [errors, setErrors] = createSignal<Record<string, string>>({});

  // Get the active entity (from props or selected)
  const activeEntity = createMemo(() => {
    if (props.entity) return props.entity;
    if (selectedEntityId()) {
      return providersClientsStore.getEntityById(selectedEntityId()) || null;
    }
    return null;
  });

  // Get clients list for dropdown
  const clientsList = createMemo(() => {
    const clients = providersClientsStore.getClients();
    const search = entitySearch().toLowerCase();
    if (!search) return clients;
    return clients.filter(c =>
      c.name.toLowerCase().includes(search) ||
      c.taxId?.toLowerCase().includes(search)
    );
  });

  // Get piggybank accounts for collection destination
  const piggybankAccounts = (() => {
    return accountsStore.getPiggybankAccounts();
  });



const fetchAdvancesAccounts = (async () => {
  /*  
  let bdyq2 = {
        query: "getEntryBooks",
        queryString: "!* contain :search0 AND !* contain :search1 AND !* contain :search2 AND !* contain :search3 AND !* contain :search4 AND createdTimeStamp > :date1 AND createdTimeStamp < :date2 AND account contain :account AND subAccount contain :subAccount AND status = :status",
        params: {
            ":search0": props.entity?.id,
           ":search1": authStore.getBusinessId()
        }
      }
  
       
      const response = await fetchGraphQLSS(bdyq2)
      let docs:any = {}
      response.data.map(entry=>{
        entry.lines.map(li=>{
          if(li.referenceId === props.entity?.id){
              if(!docs[li.document]){
                docs[li.document] = {debitAmount: 0, creditAmount: 0, document: li.document, balance: 0, transactions: [], accountId: li.accountId}
              }
              let creditAmount = formatFloat(li.creditAmount)*100 + parseInt(docs[li.document].creditAmount);
              let debitAmount = formatFloat(li.debitAmount)*100 + parseInt(docs[li.document].debitAmount);
            
              docs[li.document].creditAmount = creditAmount;
              docs[li.document].debitAmount = debitAmount;
              docs[li.document].balance = debitAmount - creditAmount;
              docs[li.document].transactions.push(li);   
          }
        })
      })
      // console.log("fetchAdvancesAccounts: ",docs)
      */
      let docs:any =  providersClientsStore.getTransactionsByEntity(props?.entity?.id)
      setAdvancePaymentsByDocs(docs)
  });

      

  // Get pending documents for the active entity
  const pendingDocuments = createMemo(() => {
    const entity = activeEntity();
    if (!entity?.relatedAccountId) return [];

    
    const docs = providersClientsStore.getTransactionsByEntity(entity.id);
    return docs.map((doc: any) => ({
      document: doc.document,
      debitAmount: doc.debitAmount,
      creditAmount: doc.creditAmount,
      balance: doc.balance,
      accountId: doc.accountId,
      transactions: doc.transactions,
      advancePay : advancePaymentsByDocs()?.[doc?.document]?.balance || 0
    })) as PendingDocument[];
  });

  // Calculate balances
  const accountBalance = createMemo(() => {
    const entity = activeEntity();
    if (!entity?.relatedAccountId) return 0;
    const balance = accountsStore.accountsBalances?.accountMapIDs?.[entity.relatedAccountId]?.balance || 0;
    return dollarsToCents(balance);
  });

  const advanceBalance = createMemo(() => {
    const entity = activeEntity();
    if (!entity?.advanceAccountId) return 0;
    const balance = accountsStore.accountsBalances?.accountMapIDs?.[entity.advanceAccountId]?.balance || 0;
    return dollarsToCents(balance);
  });

  createEffect(() => {
    if (props.isOpen) {
      if (props.entity) {
        setSelectedEntityId(props.entity.id);
        // Load transactions for the entity
        if (props.entity.relatedAccountId) {
          providersClientsStore.loadTransactions(props.entity.relatedAccountId);
          fetchAdvancesAccounts();
        }
      }
      resetForm();
    }
  });

  // Load transactions when entity changes
  createEffect(() => {
    const entity = activeEntity();
    if (entity?.relatedAccountId && props.isOpen) {
     
      providersClientsStore.loadTransactions(entity.relatedAccountId);
    }
  });

  // Debug: Log pending documents
  createEffect(() => {
    const docs = pendingDocuments();
    const entity = activeEntity();
    /**
    console.log('[CollectionModal] Debug:', {
      entityName: entity?.name,
      relatedAccountId: entity?.relatedAccountId,
      documentsCount: docs.length,
      documents: docs
    });
     */
  });

  const resetForm = () => {
    if (!props.entity) {
      setSelectedEntityId('');
    }
    setAmount('');
    setDescription('');
    setReference('');
    setPaymentMethod('cash');
    setDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setIsAdvancePayment(false);
    setSelectedDocs([]);
    setTotalToApply(0);
    setErrors({});
    setEntitySearch('');
    setSelectedPiggybankId('');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!activeEntity()) {
      newErrors.entity = t('forms.selectEntity', 'Seleccione un cliente');
    }

    if (!amount() || parseFloat(amount()) <= 0) {
      newErrors.amount = t('forms.invalidAmount', 'Monto inválido');
    }

    if (!description().trim()) {
      newErrors.description = t('forms.requiredField', 'Campo requerido');
    }

    if (!date()) {
      newErrors.date = t('forms.requiredField', 'Campo requerido');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getBalance = () => {
    const entity = activeEntity();
    if (!entity?.relatedAccountId) return 0;
    return accountsStore.accountsBalances?.accountMapIDs?.[entity.relatedAccountId]?.balance || 0;
  };

  const handleDocumentSelection = (docs: PendingDocument[], total: number) => {
  
    setSelectedDocs(docs);
    setTotalToApply(total);

    // Auto-set amount if documents are selected
    if (total > 0) {
      setAmount(centsToDollars(total).toFixed(2));
    }
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();

      if (!validateForm() || !activeEntity()) return;
   
       if (!selectedPiggybankId()) {
         setError(t('providersClients.selectPaymentAccount', 'Seleccione una cuenta de pago'));
         return;
       }
   
       const piggybankAccount = piggybankAccounts().find(a =>
         a.id === selectedPiggybankId() || a.accountId === selectedPiggybankId()
       );
   
       if (!piggybankAccount) {
         setError(t('providersClients.invalidPaymentAccount', 'Cuenta de pago inválida'));
         return;
       }
   
      const providerAccount = accountsStore.accounts.find(a =>
        a.id === props.entity?.relatedAccountId || a.accountId === props.entity.relatedAccountId
      );

      if (!providerAccount) return;
  
      setLoading(true);
      setError(null);
  
  
   
       try {
   
   
       
         const entryNumber = entryBookStore.getNextEntryNumber();
         const entryDesc = description();
         const lines: JournalEntryLine[] = [];
         let docsRef = ''
   
       
   
        const totalAmount = selectedDocs().reduce((sum, d) => sum + d.debitAmount, 0);
        docsRef += selectedDocs().map(d => d.document).join(', ');
        
        for (const doc of selectedDocs()) {
          console.log(doc)
            lines.push({
              accountId: providerAccount?.accountId,
              accountNumber: providerAccount.accountNumber,
              accountName: providerAccount.name,
              description: entryDesc,
              amount: centsToDollars(doc.debitAmount),
              centsAmount: doc.debitAmount,
              document: doc.document,
              debitAmount: 0,
              creditAmount: centsToDollars(doc.debitAmount),
              isDebit: false
            });
        }
  
        lines.push({
          accountId: piggybankAccount.accountId || piggybankAccount.id,
          accountNumber: piggybankAccount.accountNumber,
          accountName: piggybankAccount.name,
          description: entryDesc,
          amount:centsToDollars(totalAmount),
          centsAmount: totalAmount,
          document: reference(),
          debitAmount: centsToDollars(totalAmount),
          creditAmount: 0,
          isDebit: true
        });
  
        const newEntry = {
          entryNumber,
          date: date(),
          createAt: new Date().toISOString(),
          description: entryDesc,
          reference: docsRef,
          document: docsRef,
          status: 'draft',
          createdBy: 'System',
          createdAt: new Date().toISOString(),
          totalDebits: centsToDollars(totalAmount),
          totalCredits: centsToDollars(totalAmount),
          lines,
          notes: notes().trim() || undefined,
        };
   
      await entryBookStore.addJournalEntry(newEntry);

      props.onClose();
      //resetForm();
    } catch (error) {
      console.error('Error creating collection:', error);
      setErrors({ submit: t('forms.saveError', 'Error al guardar') });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    props.onClose();
  };

  const inputStyle = {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '1rem'
  };

  const labelStyle = {
    display: 'block',
    'margin-bottom': '0.25rem',
    'font-weight': '500',
    'font-size': '0.875rem'
  };

  const errorStyle = {
    color: '#d32f2f',
    'font-size': '0.75rem',
    'margin-top': '0.25rem'
  };

  const formGroupStyle = {
    'margin-bottom': '1rem'
  };

  const rowStyle = {
    display: 'grid',
    'grid-template-columns': '1fr 1fr',
    gap: '1rem'
  };

  return (
    <Modal
      isOpen={props.isOpen}
      onClose={handleClose}
      title={t('providersClients.recordCollection', 'Registrar Cobro')}
      size="lg"
      maxWidth='86vw'
    >
      <form onSubmit={handleSubmit}>
        {/* Entity Selector (only show if no entity is passed) */}
        <Show when={!props.entity}>
          <div style={formGroupStyle}>
            <label style={labelStyle}>{t('providersClients.selectClient', 'Seleccionar Cliente')} *</label>
            <input
              type="text"
              style={{
                ...inputStyle,
                'margin-bottom': '0.5rem',
                'border-color': errors().entity ? '#d32f2f' : 'var(--border-color)'
              }}
              value={entitySearch()}
              onInput={(e) => setEntitySearch(e.target.value)}
              placeholder={t('providersClients.searchClient', 'Buscar cliente por nombre o RNC...')}
              disabled={loading()}
            />
            <Show when={errors().entity}>
              <div style={errorStyle}>{errors().entity}</div>
            </Show>

            <Show when={clientsList().length > 0 && !selectedEntityId()}>
              <div style={{
                border: '1px solid var(--border-color)',
                'border-radius': 'var(--border-radius-sm)',
                'max-height': '200px',
                'overflow-y': 'auto'
              }}>
                <For each={clientsList().slice(0, 10)}>
                  {(client) => (
                    <div
                      style={{
                        padding: '0.5rem 0.75rem',
                        cursor: 'pointer',
                        'border-bottom': '1px solid var(--border-color)',
                        background: selectedEntityId() === client.id ? '#e8f5e9' : 'white'
                      }}
                      onClick={() => {
                        setSelectedEntityId(client.id);
                        setEntitySearch(client.name);
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = selectedEntityId() === client.id ? '#e8f5e9' : 'white')}
                    >
                      <div style={{ 'font-weight': '500' }}>{client.name}</div>
                      <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                        {client.taxId && `RNC: ${client.taxId}`}
                        {client.balance !== 0 && (
                          <span style={{
                            'margin-left': '0.5rem',
                            color: client.balance < 0 ? '#388e3c' : '#d32f2f'
                          }}>
                            Balance: {formatCurrency(Math.abs(client.balance))}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </div>
        </Show>

        {/* Entity Info Header */}
        <Show when={activeEntity()}>
          {(entity) => (
            <>
              <div style={{
                padding: '1rem',
                background: '#e8f5e9',
                'border-radius': 'var(--border-radius-sm)',
                'margin-bottom': '1rem'
              }}>
                <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'flex-start' }}>
                  <div>
                    <div style={{ 'font-weight': '600', 'margin-bottom': '0.25rem' }}>
                      {t('providersClients.collectingFrom', 'Cobrando a')}: {entity().name}
                    </div>
                    <Show when={entity().taxId}>
                      <div style={{ 'font-size': '0.8rem', color: 'var(--text-muted)' }}>
                        RNC: {entity().taxId}
                      </div>
                    </Show>
                  </div>
                  <div style={{ 'text-align': 'right' }}>
                    <div style={{ 'font-size': '0.8rem', color: 'var(--text-muted)' }}>
                      {t('providersClients.currentBalance', 'Balance actual')}
                    </div>
                    <div style={{
                      'font-weight': '700',
                      'font-size': '1.25rem',
                      color: getBalance() < 0 ? '#388e3c' : '#d32f2f'
                    }}>
                      {formatCurrency(Math.abs(getBalance()))}
                    </div>
                    <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                      {getBalance() < 0 ? t('providersClients.theyOwe', 'Nos deben') : t('providersClients.weOwe', 'Debemos')}
                    </div>
                  </div>
                </div>

                {/* Advance balance */}
                <Show when={advanceBalance() !== 0}>
                  <div style={{
                    'margin-top': '0.75rem',
                    'padding-top': '0.75rem',
                    'border-top': '1px solid rgba(0,0,0,0.1)',
                    display: 'flex',
                    'justify-content': 'space-between',
                    'font-size': '0.875rem'
                  }}>
                    <span>{t('providersClients.advancePayments', 'Anticipos')}:</span>
                    <span style={{
                      'font-weight': '600',
                      color: advanceBalance() < 0 ? '#e65100' : '#7b1fa2'
                    }}>
                      {centsToFormatted(Math.abs(advanceBalance()))}
                      {advanceBalance() < 0 ? ' (disponible)' : ' (pendiente)'}
                    </span>
                  </div>
                </Show>
              </div>

              {/* Pending Documents Panel */}
              <Show when={entity().relatedAccountId}>
                <EntityDocumentsPanel
                  entity={entity()}
                  documents={pendingDocuments()}
                  totalBalance={accountBalance()}
                  advanceBalance={advanceBalance()}
                  onSelectionChange={handleDocumentSelection}
                  mode="collection"
                />
              </Show>

              {/* Debug info - remove after testing */}
              <Show when={!entity().relatedAccountId}>
                <div style={{
                  padding: '0.75rem',
                  background: '#fff3e0',
                  'border-radius': 'var(--border-radius-sm)',
                  'margin-bottom': '1rem',
                  'font-size': '0.8rem',
                  color: '#e65100'
                }}>
                  {t('providersClients.noRelatedAccount', 'Este cliente no tiene una cuenta contable asignada. Asigne una cuenta en la configuracion del cliente para ver documentos pendientes.')}
                </div>
              </Show>
            </>
          )}
        </Show>

        {/* Advance Payment Toggle */}
        <Show when={activeEntity()}>
          <div style={{
            ...formGroupStyle,
            display: 'flex',
            'align-items': 'center',
            gap: '0.5rem',
            padding: '0.5rem',
            background: isAdvancePayment() ? '#fff3e0' : 'transparent',
            'border-radius': 'var(--border-radius-sm)'
          }}>
            <input
              type="checkbox"
              id="isAdvancePayment"
              checked={isAdvancePayment()}
              onChange={(e) => setIsAdvancePayment(e.target.checked)}
              disabled={loading()}
            />
            <label for="isAdvancePayment" style={{ 'font-size': '0.875rem', cursor: 'pointer' }}>
              {t('providersClients.isAdvancePayment', 'Es un anticipo / pago adelantado')}
            </label>
          </div>
        </Show>

        {/* Amount & Date */}
        <div style={rowStyle}>
          
          <div style={formGroupStyle}>
            <label style={labelStyle}>{t('common.date', 'Fecha')} *</label>
            <input
              type="date"
              style={{
                ...inputStyle,
                'border-color': errors().date ? '#d32f2f' : 'var(--border-color)'
              }}
              value={date()}
              onInput={(e) => setDate(e.target.value)}
              disabled={loading()}
            />
            <Show when={errors().date}>
              <div style={errorStyle}>{errors().date}</div>
            </Show>
          </div>
        </div>

        {/* Payment Method & Destination Account - Integrated Section */}
        <div style={{
          padding: '1rem',
          background: '#f5f5f5',
          'border-radius': 'var(--border-radius-md)',
          'margin-bottom': '1rem',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{
            'font-weight': '600',
            'margin-bottom': '0.75rem',
            'font-size': '0.9rem',
            color: 'var(--text-primary)'
          }}>
            {t('providersClients.paymentMethodAndAccount', 'Método de Pago y Cuenta Destino')}
          </div>

          <div style={rowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>{t('providersClients.reference', 'Referencia')}</label>
              <input
                type="text"
                style={inputStyle}
                value={reference()}
                onInput={(e) => setReference(e.target.value)}
                placeholder={paymentMethod() === 'check'
                  ? t('providersClients.checkNumberPlaceholder', 'No. de cheque')
                  : paymentMethod() === 'transfer' || paymentMethod() === 'zelle'
                  ? t('providersClients.confirmationPlaceholder', 'No. confirmación')
                  : t('providersClients.referencePlaceholder', 'Referencia (opcional)')
                }
                disabled={loading()}
              />
            </div>
          </div>

          {/* Piggybank Account Selection */}
          <div style={{ ...formGroupStyle, 'margin-bottom': 0 }}>
            <label style={labelStyle}>
              {paymentMethod() === 'cash'
                ? t('providersClients.cashRegister', 'Caja / Cuenta Efectivo')
                : paymentMethod() === 'check'
                ? t('providersClients.bankForCheck', 'Banco para Depósito')
                : paymentMethod() === 'transfer' || paymentMethod() === 'zelle'
                ? t('providersClients.bankAccount', 'Cuenta Bancaria')
                : t('providersClients.destinationAccount', 'Cuenta Destino')
              } *
            </label>
            <Show
              when={piggybankAccounts().length > 0}
              fallback={
                <div style={{
                  padding: '0.75rem',
                  background: '#fff3e0',
                  'border-radius': 'var(--border-radius-sm)',
                  'font-size': '0.8rem',
                  color: '#e65100'
                }}>
                  {t('providersClients.noPiggybankAccounts', 'No hay cuentas de caja/banco configuradas. Configure cuentas como "Piggybank" en el módulo de cuentas.')}
                </div>
              }
            >
              <div style={{ display: 'flex', 'flex-wrap': 'wrap', gap: '0.5rem' }}>
                <For each={piggybankAccounts()}>
                  {(account) => (
                    <button
                      type="button"
                      onClick={() => setSelectedPiggybankId(account.id)}
                      disabled={loading()}
                      style={{
                        padding: '0.5rem 1rem',
                        border: selectedPiggybankId() === account.id
                          ? '2px solid #388e3c'
                          : '1px solid var(--border-color)',
                        'border-radius': 'var(--border-radius-sm)',
                        background: selectedPiggybankId() === account.id ? '#e8f5e9' : 'white',
                        cursor: 'pointer',
                        'font-size': '0.875rem',
                        'font-weight': selectedPiggybankId() === account.id ? '600' : '400',
                        color: selectedPiggybankId() === account.id ? '#2e7d32' : 'var(--text-primary)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ 'font-weight': '500' }}>
                        {account.piggybankLabel || account.name}
                      </div>
                      <div style={{ 'font-size': '0.7rem', color: 'var(--text-muted)' }}>
                        {account.accountNumber}
                      </div>
                    </button>
                  )}
                </For>
              </div>
              <Show when={!selectedPiggybankId()}>
                <div style={{ 'font-size': '0.75rem', color: '#ff9800', 'margin-top': '0.5rem' }}>
                  {t('providersClients.selectAccountRequired', 'Seleccione la cuenta donde se registrará el ingreso')}
                </div>
              </Show>
            </Show>
          </div>
        </div>

        {/* Description with Suggestions */}
        <div style={formGroupStyle}>
          <label style={labelStyle}>{t('common.description', 'Descripción')} *</label>
          <input
            type="text"
            style={{
              ...inputStyle,
              'border-color': errors().description ? '#d32f2f' : 'var(--border-color)'
            }}
            value={description()}
            onInput={(e) => setDescription(e.target.value)}
            placeholder={t('providersClients.collectionDescriptionPlaceholder', 'Ej: Pago de factura INV-001')}
            disabled={loading()}
          />
          <Show when={errors().description}>
            <div style={errorStyle}>{errors().description}</div>
          </Show>

          {/* Description Suggestions - Modular Building Blocks */}
          <Show when={activeEntity()}>
            {(() => {
              const entity = activeEntity()!;
              const entityName = entity.name;
              const entityTaxId = entity.taxId;
              const ref = reference();
              const amt = amount();
              const formattedAmount = amt ? formatCurrency(parseFloat(amt)) : '';
              const selectedAccount = piggybankAccounts().find((a: any) => a.id === selectedPiggybankId());
              const accountLabel = selectedAccount?.piggybankLabel || selectedAccount?.name || '';
              const docs = selectedDocs();
              const docNumbers = docs.map(d => d.document).join(', ');
              const payMethod = paymentMethod();
              const currentDate = date();
              const formattedDate = currentDate ? new Date(currentDate).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '';

              const methodLabels: Record<string, string> = {
                cash: 'EFECTIVO', check: 'CHEQUE', transfer: 'TRANSFERENCIA',
                zelle: 'ZELLE', credit_card: 'TARJETA', other: ''
              };
              const methodLabel = methodLabels[payMethod] || '';

              // Building blocks - individual pieces that can be added
              const blocks: Array<{text: string; label: string; bg: string; border: string; color: string; category: string}> = [];

              // Action words
              blocks.push({ text: ' COBRO', label: 'COBRO', bg: '#e8f5e9', border: '#a5d6a7', color: '#2e7d32', category: 'action' });
              blocks.push({ text: ' REC.', label: 'REC.', bg: '#e8f5e9', border: '#a5d6a7', color: '#2e7d32', category: 'action' });
              blocks.push({ text: ' INGRESO', label: 'INGRESO', bg: '#e0f2f1', border: '#80cbc4', color: '#00695c', category: 'action' });
              if (isAdvancePayment()) {
                blocks.push({ text: ' ANTICIPO', label: 'ANTICIPO', bg: '#fff3e0', border: '#ffcc80', color: '#e65100', category: 'action' });
              }
              blocks.push({ text: ' ABONO', label: 'ABONO', bg: '#e3f2fd', border: '#90caf9', color: '#1565c0', category: 'action' });


              // Payment method
              if (methodLabel) {
                blocks.push({ text: ` ${methodLabel}`, label: methodLabel, bg: '#f3e5f5', border: '#ce93d8', color: '#7b1fa2', category: 'method' });
              }

              // Reference
              if (ref) {
                blocks.push({ text: ` #${ref}`, label: `#${ref}`, bg: '#e3f2fd', border: '#90caf9', color: '#1565c0', category: 'ref' });
                blocks.push({ text: ` REF.${ref}`, label: `REF.${ref}`, bg: '#e3f2fd', border: '#90caf9', color: '#1565c0', category: 'ref' });
              }

            

              // Amount
              if (formattedAmount) {
                blocks.push({ text: ` ${formattedAmount}` , label: formattedAmount, bg: '#e8f5e9', border: '#a5d6a7', color: '#2e7d32', category: 'amount' });
              }

              // Documents
              if (docs.length > 0) {
                blocks.push({ text: ` ${docNumbers}`, label: docs.length > 2 ? `${docs.slice(0,2).map(d=>d.document).join(', ')}...` : docNumbers, bg: '#fff8e1', border: '#ffcc80', color: '#f57c00', category: 'docs' });
              }

              // Account
              if (accountLabel) {
                blocks.push({ text: ` ${accountLabel.toUpperCase()}`, label: accountLabel, bg: '#fce4ec', border: '#f48fb1', color: '#c2185b', category: 'account' });
              }

              // Entity info
              blocks.push({ text: ` ${entityName.toUpperCase()}`, label: entityName.length > 15 ? entityName.substring(0,15) + '...' : entityName, bg: '#e1f5fe', border: '#4fc3f7', color: '#0277bd', category: 'entity' });
              if (entityTaxId) {
                blocks.push({ text: ` RNC:${entityTaxId}`, label: `RNC:${entityTaxId}`, bg: '#e1f5fe', border: '#4fc3f7', color: '#0277bd', category: 'entity' });
              }

              // Date
              if (formattedDate) {
                blocks.push({ text: ` ${formattedDate}` , label: formattedDate, bg: 'var(--gray-100)', border: 'var(--border-color)', color: 'var(--text-secondary)', category: 'date' });
              }

              // Separators
              blocks.push({ text: ' - ', label: '-', bg: 'var(--gray-200)', border: 'var(--border-color)', color: 'var(--text-secondary)', category: 'sep' });
              blocks.push({ text: ' / ', label: '/', bg: 'var(--gray-200)', border: 'var(--border-color)', color: 'var(--text-secondary)', category: 'sep' });
              blocks.push({ text: ' FROM ', label: 'FROM', bg: 'var(--gray-200)', border: 'var(--border-color)', color: 'var(--text-secondary)', category: 'sep' });
              blocks.push({ text: ' TO ', label: 'TO', bg: 'var(--gray-200)', border: 'var(--border-color)', color: 'var(--text-secondary)', category: 'sep' });
             
              blocks.push({ text: ' CHECK ', label: 'CHECK', bg: 'var(--gray-200)', border: 'var(--border-color)', color: 'var(--text-secondary)', category: 'sep' });
              blocks.push({ text: ' DOCS: ', label: 'DOCS', bg: 'var(--gray-200)', border: 'var(--border-color)', color: 'var(--text-secondary)', category: 'sep' });
              blocks.push({ text: ' INV: ', label: 'INV', bg: 'var(--gray-200)', border: 'var(--border-color)', color: 'var(--text-secondary)', category: 'sep' });
              blocks.push({ text: ' Granite Slab: ', label: 'Granite Slab', bg: 'var(--gray-200)', border: 'var(--border-color)', color: 'var(--text-secondary)', category: 'sep' });



              const appendToDescription = (text: string) => {
                const current = description();
                setDescription(current ? `${current}${text}` : text);
              };

              return (
                <div style={{ 'margin-top': '0.5rem' }}>
                  <div style={{ 'font-size': '0.7rem', color: 'var(--text-muted)', 'margin-bottom': '0.25rem', display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' }}>
                    <span>{t('providersClients.buildDescription', 'Construir descripción (click para agregar):')} </span>
                    <Show when={description()}>
                      <button
                        type="button"
                        onClick={() => setDescription('')}
                        style={{
                          padding: '0.1rem 0.3rem',
                          background: '#ffebee',
                          border: '1px solid #ef9a9a',
                          'border-radius': '4px',
                          cursor: 'pointer',
                          'font-size': '0.65rem',
                          color: '#c62828'
                        }}
                      >
                        {t('common.clear', 'Limpiar')}
                      </button>
                    </Show>
                  </div>
                  <div style={{ display: 'flex', 'flex-wrap': 'wrap', gap: '0.25rem' }}>
                    <For each={blocks}>
                      {(block) => (
                        <button
                          type="button"
                          onClick={() => appendToDescription(block.text)}
                          style={{
                            padding: '0.2rem 0.4rem',
                            background: block.bg,
                            border: `1px solid ${block.border}`,
                            'border-radius': '10px',
                            cursor: 'pointer',
                            'font-size': '0.65rem',
                            color: block.color,
                            'font-weight': '500'
                          }}
                        >
                          {block.label}
                        </button>
                      )}
                    </For>
                  </div>
                  {/* Quick templates */}
                  <div style={{ 'margin-top': '0.5rem', 'padding-top': '0.5rem', 'border-top': '1px dashed var(--border-color)' }}>
                    <div style={{ 'font-size': '0.65rem', color: 'var(--text-muted)', 'margin-bottom': '0.25rem' }}>
                      {t('providersClients.quickTemplates', 'Plantillas rápidas:')}
                    </div>
                    <div style={{ display: 'flex', 'flex-wrap': 'wrap', gap: '0.25rem' }}>
                      <button
                        type="button"
                        onClick={() => setDescription(`COLLECTED ${methodLabel}${ref ? ' #' + ref : ''}${formattedAmount ? ' ' + formattedAmount : ''} - ${entityName.toUpperCase()}`)}
                        style={{ padding: '0.2rem 0.5rem', background: '#e8f5e9', border: '1px solid #a5d6a7', 'border-radius': '10px', cursor: 'pointer', 'font-size': '0.65rem', color: '#2e7d32' }}
                      >
                        Cobro completo
                      </button>
                      <Show when={docs.length > 0}>
                        <button
                          type="button"
                          onClick={() => setDescription(`DOCUMENTS COLLECTED ${docNumbers} - ${entityName.toUpperCase()}`)}
                          style={{ padding: '0.2rem 0.5rem', background: '#fff8e1', border: '1px solid #ffcc80', 'border-radius': '10px', cursor: 'pointer', 'font-size': '0.65rem', color: '#f57c00' }}
                        >
                          Cobro + Docs
                        </button>
                      </Show>
                      <Show when={accountLabel}>
                        <button
                          type="button"
                          onClick={() => setDescription(`DEPOSIT ${accountLabel.toUpperCase()}${formattedAmount ? ' ' + formattedAmount : ''} - ${entityName.toUpperCase()}`)}
                          style={{ padding: '0.2rem 0.5rem', background: '#e0f2f1', border: '1px solid #80cbc4', 'border-radius': '10px', cursor: 'pointer', 'font-size': '0.65rem', color: '#00695c' }}
                        >
                          Ingreso + Cuenta
                        </button>
                      </Show>
                      <button
                        type="button"
                        onClick={() => setDescription(`PAYMENT ON ACCOUNT - ${entityName.toUpperCase()}${entityTaxId ? ' RNC:' + entityTaxId : ''}`)}
                        style={{ padding: '0.2rem 0.5rem', background: 'var(--gray-100)', border: '1px solid var(--border-color)', 'border-radius': '10px', cursor: 'pointer', 'font-size': '0.65rem', color: 'var(--text-secondary)' }}
                      >
                        Abono a cuenta
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </Show>
        </div>

        {/* Notes */}
        <div style={formGroupStyle}>
          <label style={labelStyle}>{t('common.notes', 'Notas')}</label>
          <textarea
            style={{
              ...inputStyle,
              resize: 'vertical',
              'min-height': '60px'
            }}
            value={notes()}
            onInput={(e) => setNotes(e.target.value)}
            placeholder={t('common.optionalNotes', 'Notas adicionales (opcional)')}
            disabled={loading()}
          />
        </div>

        {/* Preview */}
        <Show when={amount() && parseFloat(amount()) > 0 && activeEntity()}>
          <div style={{
            padding: '1rem',
            background: 'var(--gray-50)',
            'border-radius': 'var(--border-radius-sm)',
            'margin-bottom': '1rem',
            border: '2px solid #388e3c'
          }}>
            <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem', 'font-size': '0.875rem' }}>
              {t('providersClients.collectionSummary', 'Resumen del Cobro')}
            </div>
            <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.5rem' }}>
              <span>{t('providersClients.collectionAmount', 'Monto del cobro')}:</span>
              <span style={{ 'font-weight': '700', color: '#388e3c', 'font-size': '1.25rem' }}>
                {formatCurrency(parseFloat(amount()))}
              </span>
            </div>

            <Show when={selectedDocs().length > 0}>
              <div style={{
                'padding-top': '0.5rem',
                'margin-top': '0.5rem',
                'border-top': '1px solid var(--border-color)',
                'font-size': '0.8rem'
              }}>
                <div style={{ 'margin-bottom': '0.25rem', color: 'var(--text-muted)' }}>
                  {t('providersClients.appliedTo', 'Aplicado a')}:
                </div>
                <For each={selectedDocs()}>
                  {(doc) => (
                    <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                      <span>{doc.document}</span>
                      <span>{centsToFormatted(doc.applyAmount || 0)}</span>
                    </div>
                  )}
                </For>
              </div>
            </Show>

            <div style={{
              display: 'flex',
              'justify-content': 'space-between',
              'font-size': '0.9rem',
              color: 'var(--text-muted)',
              'margin-top': '0.5rem',
              'padding-top': '0.5rem',
              'border-top': '1px solid var(--border-color)'
            }}>
              <span>{t('providersClients.newBalance', 'Nuevo balance estimado')}:</span>
              <span style={{ 'font-weight': '600' }}>
                {formatCurrency(Math.abs(Math.min(0, getBalance() + parseFloat(amount()))))}
              </span>
            </div>
          </div>
        </Show>

        {/* Error message */}
        <Show when={errors().submit}>
          <div style={{ ...errorStyle, 'margin-bottom': '1rem' }}>{errors().submit}</div>
        </Show>

        {/* Form Actions */}
        <div style={{ display: 'flex', gap: '1rem', 'justify-content': 'flex-end', 'margin-top': '1.5rem' }}>
          <button
            type="button"
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid var(--border-color)',
              'border-radius': 'var(--border-radius-sm)',
              background: 'white',
              cursor: 'pointer'
            }}
            onClick={handleClose}
            disabled={loading()}
          >
            {t('common.cancel', 'Cancelar')}
          </button>
          <button
            type="submit"
            style={{
              padding: '0.5rem 1.5rem',
              border: 'none',
              'border-radius': 'var(--border-radius-sm)',
              background: '#388e3c',
              color: 'white',
              cursor: 'pointer',
              'font-weight': '500'
            }}
            
            disabled={loading() || !activeEntity()}
          >
            {loading()
              ? t('common.processing', 'Procesando...')
              : t('providersClients.confirmCollection', 'Confirmar Cobro')
            }
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CollectionModal;
