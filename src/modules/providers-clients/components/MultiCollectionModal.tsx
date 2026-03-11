import { Component, createSignal, createEffect, createMemo, Show, For } from 'solid-js';
import { Modal, Button, FormInput } from '../../ui';
import { useTranslation } from '../../../translations';
import { providersClientsStore } from '../stores/providersClientsStore';
import { ProviderClient } from '../types';
import { accountsStore } from '../../accounts';
import { entryBookStore, JournalEntryLine } from '../../journal/stores/entryBookStore';
import SearchableAccountDropdown from '../../events/components/SearchableAccountDropdown';
import {
  dollarsToCents,
  centsToDollars,
  centsToFormatted
} from '../../../utils/currencyUtils';

interface MultiCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DocumentCollectionItem {
  document: string;
  balance: number;
  amount: number;
  selected: boolean;
}

interface ClientWithDocs {
  entity: ProviderClient;
  documents: DocumentCollectionItem[];
  expanded: boolean;
  loading: boolean;
  loaded: boolean;
  totalBalance: number;
  totalSelected: number;
}

interface ExtraLine {
  id: string;
  accountId?: string;
  account?: any;
  type: 'debit' | 'credit';
  document: string;
  amount: number;
}

const MultiCollectionModal: Component<MultiCollectionModalProps> = (props) => {
  const { t } = useTranslation();

  const [clientGroups, setClientGroups] = createSignal<ClientWithDocs[]>([]);
  const [paymentMethod, setPaymentMethod] = createSignal<'cash' | 'check' | 'transfer' | 'zelle'>('cash');
  const [selectedPiggybankId, setSelectedPiggybankId] = createSignal('');
  const [date, setDate] = createSignal(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = createSignal('');
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [searchQuery, setSearchQuery] = createSignal('');
  const [reference, setReference] = createSignal('');
  const [extraLines, setExtraLines] = createSignal<ExtraLine[]>([]);
  const [showExtraLines, setShowExtraLines] = createSignal(false);

  // Show all clients with relatedAccountId (lazy load will show pending docs)
  const clients = createMemo(() => {
    return providersClientsStore.entities.filter(e =>
      (e.type === 'customer' || e.type === 'both') &&
      e.relatedAccountId
    );
  });

  const piggybankAccounts = () => accountsStore.getPiggybankAccounts();

  createEffect(() => {
    if (props.isOpen) {
      initializeClientList();
      setError(null);
      setSelectedPiggybankId('');
      setDescription('');
      setReference('');
      setExtraLines([]);
      setShowExtraLines(false);
    }
  });

  // Get balance from accounts store for an entity
  const getEntityBalance = (entity: ProviderClient) => {
    //const balance = accountsStore.accountsBalances?.accountMapIDs?.[entity.id!]?.balance || 0;
    const balance = providersClientsStore?.balances?.refMap[entity.id]?.balance;
    return dollarsToCents(balance);
  };

  // Initialize list with clients only (no docs loaded yet)
  // Show entity balance from accounts store (before loading documents)
  const initializeClientList = () => {
    const groups: ClientWithDocs[] = clients()
      .map(entity => ({
        entity,
        documents: [],
        expanded: false,
        loading: false,
        loaded: false,
        totalBalance: Math.abs(getEntityBalance(entity)), // Show absolute balance
        totalSelected: 0
      }))
      .sort((a, b) => b.totalBalance - a.totalBalance); // Sort by balance (highest first)
    setClientGroups(groups);
  };

  // Lazy load documents when clicking on a client
  const loadClientDocuments = async (entityId: string) => {
    const group = clientGroups().find(g => g.entity.id === entityId);
    if (!group || group.loaded || group.loading) return;

    // Set loading state
    setClientGroups(groups => groups.map(g =>
      g.entity.id === entityId ? { ...g, loading: true } : g
    ));

    try {
      //await providersClientsStore.loadTransactions(group.entity.relatedAccountId!);
      const docs = providersClientsStore.getTransactionsByEntity(group.entity.id!);

      // Show all documents with non-zero balance
      const pendingDocs: DocumentCollectionItem[] = docs
        .filter((doc: any) => doc.balance !== 0)
        .map((doc: any) => ({
          document: doc.document || 'SIN DOC',
          balance: Math.abs(doc.balance), // Show absolute value in cents
          amount: 0,
          selected: false
        }));

      const totalBalance = pendingDocs.reduce((sum, d) => sum + d.balance, 0);

      setClientGroups(groups => groups.map(g =>
        g.entity.id === entityId ? {
          ...g,
          documents: pendingDocs,
          loading: false,
          loaded: true,
          expanded: true,
          totalBalance
        } : g
      ));
    } catch (err) {
      setClientGroups(groups => groups.map(g =>
        g.entity.id === entityId ? { ...g, loading: false } : g
      ));
    }
  };

  const filteredGroups = createMemo(() => {
    const query = searchQuery().toLowerCase();
    if (!query) return clientGroups();
    return clientGroups().filter(group =>
      group.entity.name.toLowerCase().includes(query) ||
      group.entity.taxId?.toLowerCase().includes(query)
    );
  });

  const grandTotal = createMemo(() => {
    return clientGroups().reduce((sum, group) => sum + group.totalSelected, 0);
  });

  const totalDocsSelected = createMemo(() => {
    return clientGroups().reduce((sum, group) =>
      sum + group.documents.filter(d => d.selected && d.amount > 0).length, 0);
  });

  const selectedClientNames = createMemo(() => {
    return clientGroups()
      .filter(g => g.totalSelected > 0)
      .map(g => g.entity.name);
  });

  const selectedDocsList = createMemo(() => {
    const docs: string[] = [];
    clientGroups().forEach(g => {
      g.documents.filter(d => d.selected && d.amount > 0).forEach(d => {
        docs.push(d.document);
      });
    });
    return docs;
  });

  // Description building blocks
  const descriptionBlocks = createMemo(() => {
    const ref = reference();
    const blocks: { text: string; label: string; bg: string; color: string }[] = [];

    blocks.push({ text: ' COLLECTED', label: 'COLLECTED', bg: '#e8f5e9', color: '#388e3c' });
    blocks.push({ text: ' COBRO', label: 'COBRO', bg: '#e8f5e9', color: '#388e3c' });

    if (paymentMethod() === 'cash') blocks.push({ text: ' CASH', label: 'CASH', bg: '#e8f5e9', color: '#388e3c' });
    if (paymentMethod() === 'check') blocks.push({ text: ' CHECK', label: 'CHECK', bg: '#fff3e0', color: '#e65100' });
    if (paymentMethod() === 'transfer') blocks.push({ text: ' TRANSFER', label: 'TRANSFER', bg: '#f3e5f5', color: '#7b1fa2' });
    if (paymentMethod() === 'zelle') blocks.push({ text: ' ZELLE', label: 'ZELLE', bg: '#e8f5e9', color: '#388e3c' });

    if (selectedClientNames().length > 0) {
      selectedClientNames().slice(0, 3).forEach(name => {
        blocks.push({ text: ` ${name.toUpperCase()}`, label: name.substring(0, 12), bg: '#fce4ec', color: '#c2185b' });
      });
    }

    if (selectedDocsList().length > 0) {
      blocks.push({ text: ` DOCS: ${selectedDocsList().slice(0, 3).join(', ')}`, label: 'DOCS', bg: '#fff8e1', color: '#f57f17' });
    }

    if (grandTotal() > 0) {
      blocks.push({ text: ` $${centsToDollars(grandTotal()).toFixed(2)}`, label: 'Amount', bg: '#e0f2f1', color: '#00695c' });
    }

      // Reference
    if (ref) {
      blocks.push({ text: ` #${ref}`, label: `#${ref}`, bg: '#e3f2fd',  color: '#1565c0' });
      blocks.push({ text: ` REF.${ref}`, label: `REF.${ref}`, bg: '#e3f2fd',  color: '#1565c0' });
    }


    const selectedAccount = piggybankAccounts().find(a => (a.accountId || a.id) === selectedPiggybankId());
    if (selectedAccount) {
      blocks.push({ text: ` [${selectedAccount.piggybankLabel || selectedAccount.name}]`, label: 'Account', bg: '#ede7f6', color: '#512da8' });
    }

    blocks.push({ text: ' | ', label: '|', bg: '#f5f5f5', color: '#757575' });
    blocks.push({ text: ' - ', label: '-', bg: 'var(--gray-200)', color: 'var(--text-secondary)'});
    blocks.push({ text: ' / ', label: '/', bg: 'var(--gray-200)', color: 'var(--text-secondary)'});
    blocks.push({ text: ' FROM ', label: 'FROM', bg: 'var(--gray-200)', color: 'var(--text-secondary)'});
    blocks.push({ text: ' TO ', label: 'TO', bg: 'var(--gray-200)', color: 'var(--text-secondary)'});
    
    blocks.push({ text: ' CHECK ', label: 'CHECK', bg: 'var(--gray-200)', color: 'var(--text-secondary)'});
    blocks.push({ text: ' DOCS: ', label: 'DOCS', bg: 'var(--gray-200)', color: 'var(--text-secondary)'});
    blocks.push({ text: ' INV: ', label: 'INV', bg: 'var(--gray-200)', color: 'var(--text-secondary)'});
    blocks.push({ text: ' Granite Slab: ', label: 'Granite Slab', bg: 'var(--gray-200)', color: 'var(--text-secondary)'});


    return blocks;
  });

  const appendToDescription = (text: string) => {
    setDescription(prev => prev + text);
  };

  // Extra lines management
  const addExtraLine = () => {
    setExtraLines(lines => [...lines, {
      id: crypto.randomUUID(),
      accountId: '',
      account: null,
      type: 'debit',
      document: '',
      amount: 0
    }]);
    setShowExtraLines(true);
  };

  const removeExtraLine = (id: string) => {
    setExtraLines(lines => lines.filter(l => l.id !== id));
  };

  const updateExtraLine = (id: string, field: keyof ExtraLine, value: any) => {
    setExtraLines(lines => lines.map(l =>
      l.id === id ? { ...l, [field]: value } : l
    ));
  };

  const extraLinesTotal = createMemo(() => {
    return extraLines().reduce((sum, l) => {
      if (l.type === 'debit') return sum + l.amount;
      return sum - l.amount;
    }, 0);
  });

  const toggleExpand = async (entityId: string) => {
    const group = clientGroups().find(g => g.entity.id === entityId);
    if (!group) return;

    // If not loaded yet, load documents
    if (!group.loaded && !group.loading) {
      await loadClientDocuments(entityId);
    } else {
      // Toggle expand/collapse
      setClientGroups(groups => groups.map(g =>
        g.entity.id === entityId ? { ...g, expanded: !g.expanded } : g
      ));
    }
  };

  const toggleDocument = (entityId: string, docName: string) => {
    setClientGroups(groups => groups.map(g => {
      if (g.entity.id === entityId) {
        const updatedDocs = g.documents.map(d => {
          if (d.document === docName) {
            return { ...d, selected: !d.selected, amount: !d.selected ? d.balance : 0 };
          }
          return d;
        });
        const totalSelected = updatedDocs.filter(d => d.selected).reduce((sum, d) => sum + d.amount, 0);
        return { ...g, documents: updatedDocs, totalSelected };
      }
      return g;
    }));
  };

  const updateDocAmount = (entityId: string, docName: string, amount: number) => {
    setClientGroups(groups => groups.map(g => {
      if (g.entity.id === entityId) {
        const updatedDocs = g.documents.map(d =>
          d.document === docName ? { ...d, amount, selected: amount > 0 } : d
        );
        const totalSelected = updatedDocs.filter(d => d.selected).reduce((sum, d) => sum + d.amount, 0);
        return { ...g, documents: updatedDocs, totalSelected };
      }
      return g;
    }));
  };

  const selectAllDocs = (entityId: string) => {
    setClientGroups(groups => groups.map(g => {
      if (g.entity.id === entityId) {
        const updatedDocs = g.documents.map(d => ({ ...d, selected: true, amount: d.balance }));
        return { ...g, documents: updatedDocs, totalSelected: g.totalBalance, expanded: true };
      }
      return g;
    }));
  };

  const clearAllDocs = (entityId: string) => {
    setClientGroups(groups => groups.map(g => {
      if (g.entity.id === entityId) {
        const updatedDocs = g.documents.map(d => ({ ...d, selected: false, amount: 0 }));
        return { ...g, documents: updatedDocs, totalSelected: 0 };
      }
      return g;
    }));
  };

  const selectAllClients = () => {
    setClientGroups(groups => groups.map(g => ({
      ...g,
      documents: g.documents.map(d => ({ ...d, selected: true, amount: d.balance })),
      totalSelected: g.totalBalance
    })));
  };

  const clearAllClients = () => {
    setClientGroups(groups => groups.map(g => ({
      ...g,
      documents: g.documents.map(d => ({ ...d, selected: false, amount: 0 })),
      totalSelected: 0
    })));
  };

  const getRelatedAccount = (keacc:string | null | undefined) => {
    if (!keacc) return null;
    let acc = accountsStore.accounts.find(a => a.id === keacc || a.accountId === keacc);
    if(acc?.parentAccountId){
      return accountsStore.accounts.find(a => a.id === acc?.parentAccountId);
    }
    return acc
  };

  const handleSubmit = async () => {
    const groupsWithSelection = clientGroups().filter(g => g.totalSelected > 0);

    if (groupsWithSelection.length === 0) {
      setError(t('providersClients.noDocumentsSelected', 'Seleccione al menos un documento'));
      return;
    }

    if (!selectedPiggybankId()) {
      setError(t('providersClients.selectCollectionAccount', 'Seleccione una cuenta de cobro'));
      return;
    }

    const piggybankAccount = piggybankAccounts().find(a =>
      a.id === selectedPiggybankId() || a.accountId === selectedPiggybankId()
    );

    if (!piggybankAccount) {
      setError(t('providersClients.invalidCollectionAccount', 'Cuenta de cobro inválida'));
      return;
    }

    setLoading(true);
    setError(null);

    try {

      let totalAmount = 0;
      const entryNumber = entryBookStore.getNextEntryNumber();
      const entryDesc = description();
      const lines: JournalEntryLine[] = [];
      let docsRef = ''
      for (const group of groupsWithSelection) {
      
        
         
        const selectedDocs = group.documents.filter(d => d.selected && d.amount > 0);
        if (selectedDocs.length === 0) continue;

        const clientAccount = getRelatedAccount(group.entity.relatedAccountId);
        
       

        if (!clientAccount) continue;

        totalAmount += selectedDocs.reduce((sum, d) => sum + d.amount, 0);
        docsRef += selectedDocs.map(d => d.document).join(', ');
        
        
       

        // Credit each document (reduce receivable)
        for (const doc of selectedDocs) {
          lines.push({
            accountId: clientAccount.accountId || clientAccount.id,
            accountNumber: clientAccount.accountNumber,
            accountName: clientAccount.name,
            description: entryDesc,
            amount: doc.amount,
            referenceId: group.entity.id,
            document: doc.document,
            debitAmount: 0,
            creditAmount: centsToDollars(doc.amount),
            isDebit: false
          });
        }


      }
    
      // Add extra lines
      let extraDebits = 0;
      let extraCredits = 0;
      for (const extra of extraLines()) {
        if (!extra.accountId || extra.amount <= 0) continue;

        const account = getRelatedAccount(extra.accountId);
        
        if (!account) continue;

        const isDebit = extra.type === 'debit';
        if (isDebit) extraDebits += extra.amount;
        else extraCredits += extra.amount;

        lines.push({
          accountId: account.accountId || account.id,
          accountNumber: account.accountNumber,
          accountName: account.name,
          description: entryDesc,
          amount: extra.amount,
          document: extra.document || reference(),
          debitAmount: isDebit ? centsToDollars(extra.amount) : 0,
          creditAmount: isDebit ? 0 : centsToDollars(extra.amount),
          isDebit
        });
      }


      const finalTotalDebits =  extraDebits;
      const finalTotalCredits = totalAmount + extraCredits;

      let debitBank = finalTotalCredits - finalTotalDebits;



        // Debit piggybank (cash/bank in)
      lines.push({
        accountId: piggybankAccount.accountId || piggybankAccount.id,
        accountNumber: piggybankAccount.accountNumber,
        accountName: piggybankAccount.name,
        description: entryDesc,
        amount: debitBank,
        document: reference(),
        debitAmount: centsToDollars(debitBank),
        creditAmount: 0,
        isDebit: true
      });
 

      // 

      let newEntry = {
        entryNumber,
        date: date(),
        createAt: new Date().toISOString(),
        description: entryDesc,
        reference: docsRef,
        document: docsRef,
        status: 'draft',
        createdBy: 'System',
        createdAt: new Date().toISOString(),
        totalDebits: centsToDollars(finalTotalDebits + debitBank),
        totalCredits: centsToDollars(finalTotalCredits),
        lines
      }

      await entryBookStore.addJournalEntry(newEntry);
      //console.log(newEntry)

    

      props.onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error', 'Error'));
    } finally {
      setLoading(false);
    }
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
      onClose={props.onClose}
      title={t('providersClients.multiCollection', 'Cobro Múltiple de Clientes')}
      maxWidth='86vw'
    >
      <div style={{ 'max-height': '75vh', 'overflow-y': 'auto' }}>
        {/* Header */}
        <div style={{
          background: '#e8f5e9',
          padding: '1rem',
          'border-radius': 'var(--border-radius-sm)',
          'margin-bottom': '1rem',
          display: 'flex',
          'justify-content': 'space-between',
          'align-items': 'center'
        }}>
          <div>
            <div style={{ 'font-weight': '600', color: '#388e3c' }}>
              💰 {t('providersClients.multiCollectionByDocs', 'Cobros por Documentos')}
            </div>
            <div style={{ 'font-size': '0.8rem', color: 'var(--text-muted)' }}>
              {t('providersClients.selectDocsToCollectHint', 'Seleccione documentos a cobrar')}
            </div>
          </div>
          <div style={{ 'text-align': 'right' }}>
            <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
              {totalDocsSelected()} docs
            </div>
            <div style={{ 'font-size': '1.5rem', 'font-weight': '700', color: '#388e3c' }}>
              {centsToFormatted(grandTotal())}
            </div>
          </div>
        </div>

        {/* Settings Row */}
        <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '0.75rem', 'margin-bottom': '1rem' }}>
          <div>
            <label style={{ display: 'block', 'font-weight': '600', 'margin-bottom': '0.25rem', 'font-size': '0.8rem' }}>
              {t('common.date', 'Fecha')}
            </label>
            <FormInput
              type="date"
              value={date()}
              onChange={(e) => setDate(e)}
              style={{ width: '100%', padding: '0.4rem', border: '1px solid var(--border-color)', 'border-radius': 'var(--border-radius-sm)' }}
            />
          </div>
          <div style={rowStyle}>

            <div style={formGroupStyle}>
              <label style={labelStyle}>{t('providersClients.reference', 'Referencia')}</label>
              <FormInput
                type="text"
                style={inputStyle}
                value={reference()}
                onChange={(e) => setReference(e)}
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
        </div>

        {/* Piggybank Selection */}
        <div style={{ 'margin-bottom': '1rem' }}>
          <label style={{ display: 'block', 'font-weight': '600', 'margin-bottom': '0.25rem', 'font-size': '0.8rem' }}>
            {t('providersClients.collectionAccount', 'Cuenta de Cobro')} *
          </label>
          <div style={{ display: 'flex', 'flex-wrap': 'wrap', gap: '0.4rem' }}>
            <For each={piggybankAccounts()}>
              {(account) => (
                <button
                  type="button"
                  onClick={() => setSelectedPiggybankId(account.accountId || account.id)}
                  style={{
                    padding: '0.4rem 0.75rem',
                    border: selectedPiggybankId() === (account.accountId || account.id) ? '2px solid #388e3c' : '1px solid var(--border-color)',
                    'border-radius': 'var(--border-radius-sm)',
                    background: selectedPiggybankId() === (account.accountId || account.id) ? '#e8f5e9' : 'white',
                    cursor: 'pointer',
                    'font-size': '0.8rem'
                  }}
                >
                  {account.piggybankLabel || account.name}
                </button>
              )}
            </For>
          </div>
        </div>

        {/* Description with Suggestions */}
        <div style={{ 'margin-bottom': '1rem' }}>
          <label style={{ display: 'block', 'font-weight': '600', 'margin-bottom': '0.25rem', 'font-size': '0.8rem' }}>
            {t('common.description', 'Descripción')}
          </label>
          <textarea
            value={description()}
            onInput={(e) => setDescription(e.target.value)}
            placeholder="COLLECTED CHECK CLIENT DOCS: INV-001..."
            rows={2}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid var(--border-color)',
              'border-radius': 'var(--border-radius-sm)',
              'font-size': '0.85rem',
              resize: 'vertical'
            }}
          />
          <div style={{ display: 'flex', 'flex-wrap': 'wrap', gap: '0.25rem', 'margin-top': '0.5rem' }}>
            <For each={descriptionBlocks()}>
              {(block) => (
                <button
                  type="button"
                  onClick={() => appendToDescription(block.text)}
                  style={{
                    padding: '0.2rem 0.5rem',
                    background: block.bg,
                    color: block.color,
                    border: 'none',
                    'border-radius': '4px',
                    cursor: 'pointer',
                    'font-size': '0.7rem',
                    'font-weight': '500'
                  }}
                >
                  {block.label}
                </button>
              )}
            </For>
            <button
              type="button"
              onClick={() => setDescription('')}
              style={{
                padding: '0.2rem 0.5rem',
                background: '#ffebee',
                color: '#d32f2f',
                border: 'none',
                'border-radius': '4px',
                cursor: 'pointer',
                'font-size': '0.7rem'
              }}
            >
              Clear
            </button>
          </div>
        </div>

        {/* Extra Lines Section */}
        <div style={{ 'margin-bottom': '1rem' }}>
          <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '0.5rem' }}>
            <button
              type="button"
              onClick={() => setShowExtraLines(!showExtraLines())}
              style={{
                display: 'flex',
                'align-items': 'center',
                gap: '0.5rem',
                padding: '0.4rem 0.75rem',
                background: showExtraLines() ? '#e3f2fd' : 'var(--gray-100)',
                border: '1px solid var(--border-color)',
                'border-radius': 'var(--border-radius-sm)',
                cursor: 'pointer',
                'font-size': '0.8rem',
                'font-weight': '500'
              }}
            >
              <span>{showExtraLines() ? '▼' : '▶'}</span>
              {t('providersClients.extraLines', 'Líneas Adicionales')}
              <Show when={extraLines().length > 0}>
                <span style={{ background: '#1976d2', color: 'white', padding: '0.1rem 0.4rem', 'border-radius': '10px', 'font-size': '0.7rem' }}>
                  {extraLines().length}
                </span>
              </Show>
            </button>
            <button
              type="button"
              onClick={addExtraLine}
              style={{
                padding: '0.3rem 0.6rem',
                background: '#e8f5e9',
                color: '#388e3c',
                border: '1px solid #a5d6a7',
                'border-radius': 'var(--border-radius-sm)',
                cursor: 'pointer',
                'font-size': '0.75rem',
                'font-weight': '500'
              }}
            >
              + {t('providersClients.addLine', 'Agregar Línea')}
            </button>
          </div>

          <Show when={showExtraLines() && extraLines().length > 0}>
            <div style={{ border: '1px solid var(--border-color)', 'border-radius': 'var(--border-radius-sm)', overflow: 'hidden' }}>
              {/* Header */}
              <div style={{
                display: 'grid',
                'grid-template-columns': '2fr 80px 1fr 100px 30px',
                gap: '0.5rem',
                padding: '0.4rem 0.5rem',
                background: 'var(--gray-100)',
                'font-size': '0.7rem',
                'font-weight': '600',
                color: 'var(--text-muted)'
              }}>
                <span>{t('accounts.account', 'Cuenta')}</span>
                <span>{t('common.type', 'Tipo')}</span>
                <span>{t('providersClients.document', 'Documento')}</span>
                <span style={{ 'text-align': 'right' }}>{t('common.amount', 'Monto')}</span>
                <span></span>
              </div>

              {/* Lines */}
              <For each={extraLines()}>
                {(line) => (
                  <div style={{
                    display: 'grid',
                    'grid-template-columns': '2fr 80px 1fr 100px 30px',
                    gap: '0.5rem',
                    padding: '0.4rem 0.5rem',
                    'border-top': '1px solid var(--border-color)',
                    'align-items': 'center'
                  }}>
                    {/* Account Select */}
                    <SearchableAccountDropdown
                      selectedAccountId={line?.accountId}
                      onSelect={(acc) => {
                        updateExtraLine(line.id, 'account', acc?.account);
                        updateExtraLine(line.id, 'accountId', acc?.accountId || acc?.id);
                      }}
                      placeholder={t('common.searchAccount', 'Buscar cuenta...')}
                      style={{
                        padding: '0.3rem',
                        'font-size': '0.75rem'
                      }}
                    />

                    {/* Type */}
                    <select
                      value={line.type}
                      onChange={(e) => updateExtraLine(line.id, 'type', e.target.value)}
                      style={{
                        padding: '0.3rem',
                        border: '1px solid var(--border-color)',
                        'border-radius': '4px',
                        'font-size': '0.75rem',
                        background: line.type === 'debit' ? '#e3f2fd' : '#fce4ec'
                      }}
                    >
                      <option value="debit">Débito</option>
                      <option value="credit">Crédito</option>
                    </select>

                    {/* Document */}
                    <FormInput
                      type="text"
                      value={line.document}
                      onChange={(e) => updateExtraLine(line.id, 'document', e)}
                      placeholder="DOC-001"
                      style={{
                        padding: '0.3rem',
                        border: '1px solid var(--border-color)',
                        'border-radius': '4px',
                        'font-size': '0.75rem'
                      }}
                    />

                    {/* Amount */}
                    <FormInput
                      type="number"
                      value={centsToDollars(line.amount).toFixed(2)}
                      onChange={(e) => updateExtraLine(line.id, 'amount', dollarsToCents(parseFloat(e) || 0))}
                      min="0"
                      step="0.01"
                      style={{
                        padding: '0.3rem',
                        border: '1px solid var(--border-color)',
                        'border-radius': '4px',
                        'font-size': '0.75rem',
                        'text-align': 'right'
                      }}
                    />

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => removeExtraLine(line.id)}
                      style={{
                        padding: '0.2rem 0.4rem',
                        background: '#ffebee',
                        color: '#d32f2f',
                        border: 'none',
                        'border-radius': '4px',
                        cursor: 'pointer',
                        'font-size': '0.7rem'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </For>

              {/* Summary */}
              <Show when={extraLines().length > 0}>
                <div style={{
                  display: 'flex',
                  'justify-content': 'flex-end',
                  gap: '1rem',
                  padding: '0.5rem',
                  background: 'var(--gray-50)',
                  'border-top': '1px solid var(--border-color)',
                  'font-size': '0.75rem',
                   "margin-top": '5rem'
                }}>
                  <span>
                    Débitos Extra: <strong style={{ color: '#1976d2' }}>
                      {centsToFormatted(extraLines().filter(l => l.type === 'debit').reduce((s, l) => s + l.amount, 0))}
                    </strong>
                  </span>
                  <span>
                    Créditos Extra: <strong style={{ color: '#c2185b' }}>
                      {centsToFormatted(extraLines().filter(l => l.type === 'credit').reduce((s, l) => s + l.amount, 0))}
                    </strong>
                  </span>
                </div>
              </Show>
            </div>
          </Show>
        </div>

        {/* Search */}
        <div style={{ display: 'flex', gap: '0.5rem', 'margin-bottom': '0.5rem' }}>
          <input
            type="text"
            value={searchQuery()}
            onInput={(e) => setSearchQuery(e.target.value)}
            placeholder={t('common.search', 'Buscar...')}
            style={{ flex: 1, padding: '0.4rem', border: '1px solid var(--border-color)', 'border-radius': 'var(--border-radius-sm)' }}
          />
          <button type="button" onClick={selectAllClients} style={{ padding: '0.4rem 0.6rem', background: '#388e3c', color: 'white', border: 'none', 'border-radius': 'var(--border-radius-sm)', cursor: 'pointer', 'font-size': '0.75rem' }}>
            Todo
          </button>
          <button type="button" onClick={clearAllClients} style={{ padding: '0.4rem 0.6rem', background: 'white', border: '1px solid var(--border-color)', 'border-radius': 'var(--border-radius-sm)', cursor: 'pointer', 'font-size': '0.75rem' }}>
            Limpiar
          </button>
        </div>

        {/* Clients with Documents */}
        <div style={{ border: '1px solid var(--border-color)', 'border-radius': 'var(--border-radius-sm)', 'max-height': '280px', 'overflow-y': 'auto' }}>
          <For each={filteredGroups()}>
            {(group) => (
              <Show when={group.totalBalance}>
              <div style={{ 'border-bottom': '1px solid var(--border-color)' }}>
                <div
                  onClick={() => toggleExpand(group.entity.id)}
                  style={{
                    display: 'flex',
                    'justify-content': 'space-between',
                    'align-items': 'center',
                    padding: '0.6rem 0.75rem',
                    background: group.totalSelected > 0 ? '#e8f5e9' : 'var(--gray-50)',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                    <span style={{ 'font-size': '0.8rem' }}>
                      {group.loading ? '⏳' : group.expanded ? '▼' : '▶'}
                    </span>
                    <div>
                      <div style={{ 'font-weight': '600', 'font-size': '0.9rem' }}>{group.entity.name}</div>
                      <div style={{ 'font-size': '0.7rem', color: 'var(--text-muted)' }}>
                        {group.loaded ? `${group.documents.length} docs • ` : ''}
                        <span style={{ color: '#388e3c', 'font-weight': '500' }}>{centsToFormatted(group.totalBalance)}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                    <Show when={group.totalSelected > 0}>
                      <span style={{ background: '#388e3c', color: 'white', padding: '0.15rem 0.4rem', 'border-radius': '8px', 'font-size': '0.75rem', 'font-weight': '600' }}>
                        {centsToFormatted(group.totalSelected)}
                      </span>
                    </Show>
                    <Show when={group.loaded && group.documents.length > 0}>
                      <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: '0.2rem' }}>
                        <button type="button" onClick={() => selectAllDocs(group.entity.id)} style={{ padding: '0.15rem 0.3rem', background: '#e8f5e9', color: '#388e3c', border: 'none', 'border-radius': '3px', cursor: 'pointer', 'font-size': '0.65rem' }}>✓</button>
                        <button type="button" onClick={() => clearAllDocs(group.entity.id)} style={{ padding: '0.15rem 0.3rem', background: '#ffebee', color: '#d32f2f', border: 'none', 'border-radius': '3px', cursor: 'pointer', 'font-size': '0.65rem' }}>✗</button>
                      </div>
                    </Show>
                  </div>
                </div>

                {/* Loading state */}
                <Show when={group.loading}>
                  <div style={{ padding: '1rem', 'text-align': 'center', color: 'var(--text-muted)', background: 'white' }}>
                    ⏳ Cargando documentos...
                  </div>
                </Show>

                {/* No docs found after loading */}
                <Show when={group.loaded && group.documents.length === 0 && group.expanded}>
                  <div style={{ padding: '0.75rem 1rem', 'text-align': 'center', color: 'var(--text-muted)', background: '#fff8e1', 'font-size': '0.8rem' }}>
                    Sin documentos pendientes
                  </div>
                </Show>

                <Show when={group.expanded && group.documents.length > 0}>
                  <div style={{ background: 'white' }}>
                    <For each={group.documents}>
                      {(doc) => (
                        <div style={{
                          display: 'flex',
                          'align-items': 'center',
                          padding: '0.4rem 0.6rem 0.4rem 1.8rem',
                          'border-top': '1px solid #eee',
                          background: doc.selected ? '#f1f8e9' : 'white'
                        }}>
                          <input type="checkbox" checked={doc.selected} onChange={() => toggleDocument(group.entity.id, doc.document)} style={{ 'margin-right': '0.4rem' }} />
                          <div style={{ flex: 1, 'font-size': '0.8rem', 'font-weight': '500' }}>{doc.document}</div>
                          <div style={{ 'text-align': 'right', 'margin-right': '0.4rem', 'font-size': '0.75rem', color: '#388e3c' }}>{centsToFormatted(doc.balance)}</div>
                           <FormInput
                            type="number"
                            value={centsToDollars(doc.amount).toFixed(2)}
                            onChange={(e) => updateDocAmount(group.entity.id, doc.document, dollarsToCents(parseFloat(e) || 0))}
                            min="0"
                            max={centsToDollars(doc.balance)}
                            step="0.01"
                            style={{ width: '80px', padding: '0.2rem', border: '1px solid var(--border-color)', 'border-radius': '4px', 'text-align': 'right', 'font-size': '0.8rem' }}
                          />
                        </div>
                      )}
                    </For>
                  </div>
                </Show>
              </div>
              </Show> 
            )}
          </For>

          <Show when={filteredGroups().length === 0}>
            <div style={{ padding: '2rem', 'text-align': 'center', color: 'var(--text-muted)' }}>
              {t('providersClients.noClientsFound', 'No hay clientes con cuenta relacionada')}
            </div>
          </Show>
        </div>

        {/* Error */}
        <Show when={error()}>
          <div style={{ 'margin-top': '0.75rem', padding: '0.5rem', background: '#f8d7da', color: '#721c24', 'border-radius': 'var(--border-radius-sm)', 'font-size': '0.85rem' }}>
            {error()}
          </div>
        </Show>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', 'justify-content': 'flex-end', 'margin-top': '1rem' }}>
          <Button variant="secondary" onClick={props.onClose} disabled={loading()}>
            {t('common.cancel', 'Cancelar')}
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={loading() || totalDocsSelected() === 0 || !selectedPiggybankId()}
            style={{ background: '#388e3c' }}
          >
            {loading() ? 'Procesando...' : `Cobrar (${totalDocsSelected()} docs)`}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default MultiCollectionModal;
