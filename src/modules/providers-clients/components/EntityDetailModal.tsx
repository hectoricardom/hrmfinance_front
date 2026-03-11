import { Component, createEffect, createSignal, createMemo, For, Show } from 'solid-js';
import { Modal } from '../../ui';
import { useTranslation } from '../../../translations';
import { providersClientsStore } from '../stores/providersClientsStore';
import { ProviderClient, Transaction } from '../types';
import { accountsStore } from '../../accounts';
import { formatFloat } from '../../../services/utils';

interface EntityDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  entity: ProviderClient | null;
  onPayment: () => void;
  onCollection: () => void;
}

const EntityDetailModal: Component<EntityDetailModalProps> = (props) => {
  const { t } = useTranslation();
  const [transactionFilter, setTransactionFilter] = createSignal<'all' | 'pending' | 'completed'>('pending');
  const [expandedDocs, setExpandedDocs] = createSignal<Set<string>>(new Set());

  createEffect(() => {
    if (props.isOpen && props.entity) {
      providersClientsStore.loadTransactions(props.entity.relatedAccountId);
      //setTransactionFilter('all'); // Reset filter when opening
    }
  });

  const entityTransactions = () => {
    if (!props.entity) return [];

    return providersClientsStore.getTransactionsByEntity(props.entity.id);
  };

  // Filtered transactions based on selected tab
  const filteredTransactions = createMemo(() => {
    const txns = entityTransactions();
    const filter = transactionFilter();


    if (filter === 'all') return txns;
    if (filter === 'pending') return txns.filter((txn: any) => txn.balance !== 0);
    if (filter === 'completed') return txns.filter((txn: any) => txn.balance === 0);
    return txns;
  });

  // Count transactions by status
  const transactionCounts = createMemo(() => {
    const txns = entityTransactions();
    return {
      all: txns.length,
      pending: txns.filter((txn: any) => txn.balance !== 0).length,
      completed: txns.filter((txn: any) => txn.balance === 0).length
    };
  });

  const formatCurrency = (amount: number) => {
    amount = Math.abs(amount)

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'provider': return t('providersClients.provider', 'Proveedor');
      case 'customer': return t('providersClients.client', 'Cliente');
      case 'both': return t('providersClients.both', 'Ambos');
      default: return type;
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'payment': return t('providersClients.payment', 'Pago');
      case 'collection': return t('providersClients.collection', 'Cobro');
      case 'invoice': return t('providersClients.invoice', 'Factura');
      case 'credit': return t('providersClients.credit', 'Crédito');
      case 'debit': return t('providersClients.debit', 'Débito');
      default: return type;
    }
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'payment': return { bg: '#e3f2fd', color: '#1976d2' };
      case 'collection': return { bg: '#e8f5e9', color: '#388e3c' };
      case 'invoice': return { bg: '#fff3e0', color: '#f57c00' };
      case 'credit': return { bg: '#e8f5e9', color: '#388e3c' };
      case 'debit': return { bg: '#ffebee', color: '#d32f2f' };
      default: return { bg: '#f5f5f5', color: '#666' };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return { bg: '#e8f5e9', color: '#388e3c' };
      case 'pending': return { bg: '#fff3e0', color: '#f57c00' };
      case 'cancelled': return { bg: '#ffebee', color: '#d32f2f' };
      default: return { bg: '#f5f5f5', color: '#666' };
    }
  };

   const getColorTr = (balance: number) => {
      return balance === 0?  { bg: '#e8f5e9', color: '#388e3c', label: 'completed' } : 
      { bg: '#fff3e0', color: '#f57c00', label: 'pending' };
  };

  const toggleDocExpanded = (docId: string) => {
    const current = expandedDocs();
    const newSet = new Set(current);
    if (newSet.has(docId)) {
      newSet.delete(docId);
    } else {
      newSet.add(docId);
    }
    setExpandedDocs(newSet);
  };

  const isDocExpanded = (docId: string) => expandedDocs().has(docId);

  const getBalanceInfo = (entity: ProviderClient) => {
     //const totalBalance = accountsStore.accountsBalances?.accountMapIDs?.[entity.relatedAccountId]?.balance  || 0;
     const totalBalance = providersClientsStore?.balances?.refMap[entity.id]?.balance;  

    
    if (totalBalance > 0) {
      return {
        label: t('providersClients.weOwe', 'Debemos'),
        color: '#d32f2f',
        amount: totalBalance
      };
    } else if (totalBalance < 0) {
      return {
        label: t('providersClients.theyOwe', 'Nos deben'),
        color: '#388e3c',
        amount: Math.abs(totalBalance)
      };
    }
    return {
      label: t('providersClients.balanced', 'Saldado'),
      color: '#757575',
      amount: 0
    };
  };

  const sectionStyle = {
    'margin-bottom': '1.5rem'
  };

  const sectionTitleStyle = {
    'font-weight': '600',
    'margin-bottom': '0.75rem',
    'padding-bottom': '0.5rem',
    'border-bottom': '2px solid var(--border-color)'
  };

  const detailRowStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    padding: '0.5rem 0',
    'border-bottom': '1px solid var(--border-color)'
  };

  const transactionItemStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '0.75rem',
    background: 'var(--gray-50)',
    'border-radius': 'var(--border-radius-sm)',
    'margin-bottom': '0.5rem'
  };

  const buttonStyle = {
    padding: '0.5rem 1rem',
    'border-radius': 'var(--border-radius-sm)',
    border: 'none',
    cursor: 'pointer',
    'font-weight': '500'
  };

  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      title={props.entity?.name || t('providersClients.entityDetails', 'Detalles de la Entidad')}
      size="lg"
      maxWidth='80vw'
    >
      <Show when={props.entity} fallback={<div>{t('common.loading', 'Cargando...')}</div>}>
        {(entity) => {
        
        return (
            <div>
              {/* Header with Balance */}
              <div style={{
                display: 'flex',
                'justify-content': 'space-between',
                'align-items': 'center',
                padding: '1rem',
                background: 'var(--gray-50)',
                'border-radius': 'var(--border-radius)',
                'margin-bottom': '1.5rem'
              }}>
                <div>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    'border-radius': '9999px',
                    'font-size': '0.85rem',
                    'font-weight': '500',
                    background: entity().type === 'provider' ? '#e3f2fd' : entity().type === 'customer' ? '#e8f5e9' : '#fff3e0',
                    color: entity().type === 'provider' ? '#1976d2' : entity().type === 'customer' ? '#388e3c' : '#f57c00'
                  }}>
                    {getTypeLabel(entity().type)}
                  </span>
                  <Show when={!entity().isActive}>
                    <span style={{
                      'margin-left': '0.5rem',
                      padding: '0.25rem 0.5rem',
                      'border-radius': '9999px',
                      'font-size': '0.75rem',
                      background: '#ffebee',
                      color: '#d32f2f'
                    }}>
                      {t('common.inactive', 'Inactivo')}
                    </span>
                  </Show>
                </div>
                <div style={{ 'text-align': 'right' }}>
                  <div style={{ 'font-size': '0.85rem', color: 'var(--text-muted)' }}>
                    {getBalanceInfo(entity()).label}
                  </div>
                  <div style={{ 'font-size': '1.5rem', 'font-weight': '700', color: getBalanceInfo(entity()).color }}>
                    {formatCurrency(getBalanceInfo(entity()).amount)}
                  </div>
                </div>
              </div>

              {/* Action Buttons 
              <div style={{ display: 'flex', gap: '0.5rem', 'margin-bottom': '1.5rem' }}>
                <Show when={entity().type === 'provider' || entity().type === 'both'}>
                  <button
                    style={{ ...buttonStyle, background: '#1976d2', color: 'white' }}
                    onClick={props.onPayment}
                  >
                    💵 {t('providersClients.makePayment', 'Realizar Pago')}
                  </button>
                </Show>
                <Show when={entity().type === 'customer' || entity().type === 'both'}>
                  <button
                    style={{ ...buttonStyle, background: '#388e3c', color: 'white' }}
                    onClick={props.onCollection}
                  >
                    💰 {t('providersClients.collectPayment', 'Registrar Cobro')}
                  </button>
                </Show>
              </div>
                */}
              {/* Contact Information 
              <div style={sectionStyle}>
                <h4 style={sectionTitleStyle}>{t('providersClients.contactInfo', 'Información de Contacto')}</h4>

                <Show when={entity().contactPerson}>
                  <div style={detailRowStyle}>
                    <span style={{ color: 'var(--text-muted)' }}>{t('providersClients.contactPerson', 'Contacto')}</span>
                    <span style={{ 'font-weight': '500' }}>{entity().contactPerson}</span>
                  </div>
                </Show>

                <Show when={entity().email}>
                  <div style={detailRowStyle}>
                    <span style={{ color: 'var(--text-muted)' }}>{t('common.email', 'Email')}</span>
                    <span style={{ 'font-weight': '500' }}>{entity().email}</span>
                  </div>
                </Show>

                <Show when={entity().phone}>
                  <div style={detailRowStyle}>
                    <span style={{ color: 'var(--text-muted)' }}>{t('common.phone', 'Teléfono')}</span>
                    <span style={{ 'font-weight': '500' }}>{entity().phone}</span>
                  </div>
                </Show>

                <Show when={entity().address}>
                  <div style={detailRowStyle}>
                    <span style={{ color: 'var(--text-muted)' }}>{t('common.address', 'Dirección')}</span>
                    <span style={{ 'font-weight': '500', 'text-align': 'right', 'max-width': '60%' }}>
                      {entity().address}
                    </span>
                  </div>
                </Show>

                <Show when={entity().taxId}>
                  <div style={detailRowStyle}>
                    <span style={{ color: 'var(--text-muted)' }}>{t('providersClients.taxId', 'ID Fiscal')}</span>
                    <span style={{ 'font-weight': '500' }}>{entity().taxId}</span>
                  </div>
                </Show>
              </div>

              */}

              {/* Notes 
              <Show when={entity().notes}>
                <div style={sectionStyle}>
                  <h4 style={sectionTitleStyle}>{t('common.notes', 'Notas')}</h4>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', 'white-space': 'pre-wrap' }}>
                    {entity().notes}
                  </p>
                </div>
              </Show>
              */}

              
              {/* Recent Transactions */}
              <div style={sectionStyle}>
                <h4 style={sectionTitleStyle}>
                  {t('providersClients.recentTransactions', 'Transacciones Recientes')}
                  <span style={{ 'font-weight': 'normal', 'margin-left': '0.5rem', 'font-size': '0.85rem', color: 'var(--text-muted)' }}>
                    ({entityTransactions().length})
                  </span>
                </h4>

                {/* Filter Tabs */}
                <div style={{
                  display: 'flex',
                  gap: '0.5rem',
                  'margin-bottom': '1rem',
                  'border-bottom': '1px solid var(--border-color)',
                  'padding-bottom': '0.75rem'
                }}>
                  <button
                    style={{
                      padding: '0.5rem 1rem',
                      'border-radius': 'var(--border-radius-sm)',
                      border: transactionFilter() === 'all' ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                      background: transactionFilter() === 'all' ? 'var(--primary-color)' : 'white',
                      color: transactionFilter() === 'all' ? 'white' : 'var(--text-primary)',
                      cursor: 'pointer',
                      'font-weight': '500',
                      'font-size': '0.875rem'
                    }}
                    onClick={() => setTransactionFilter('all')}
                  >
                    {t('common.all', 'Todos')} ({transactionCounts().all})
                  </button>
                  <button
                    style={{
                      padding: '0.5rem 1rem',
                      'border-radius': 'var(--border-radius-sm)',
                      border: transactionFilter() === 'pending' ? '2px solid #f57c00' : '1px solid var(--border-color)',
                      background: transactionFilter() === 'pending' ? '#fff3e0' : 'white',
                      color: transactionFilter() === 'pending' ? '#f57c00' : 'var(--text-primary)',
                      cursor: 'pointer',
                      'font-weight': '500',
                      'font-size': '0.875rem'
                    }}
                    onClick={() => setTransactionFilter('pending')}
                  >
                    {t('common.pending', 'Pendientes')} ({transactionCounts().pending})
                  </button>
                  <button
                    style={{
                      padding: '0.5rem 1rem',
                      'border-radius': 'var(--border-radius-sm)',
                      border: transactionFilter() === 'completed' ? '2px solid #388e3c' : '1px solid var(--border-color)',
                      background: transactionFilter() === 'completed' ? '#e8f5e9' : 'white',
                      color: transactionFilter() === 'completed' ? '#388e3c' : 'var(--text-primary)',
                      cursor: 'pointer',
                      'font-weight': '500',
                      'font-size': '0.875rem'
                    }}
                    onClick={() => setTransactionFilter('completed')}
                  >
                    {t('common.completed', 'Completados')} ({transactionCounts().completed})
                  </button>
                </div>

                <Show when={filteredTransactions().length === 0}>
                  <div style={{ 'text-align': 'center', padding: '1rem', color: 'var(--text-muted)' }}>
                    {transactionFilter() === 'all'
                      ? t('providersClients.noTransactions', 'No hay transacciones registradas')
                      : transactionFilter() === 'pending'
                        ? t('providersClients.noPendingTransactions', 'No hay transacciones pendientes')
                        : t('providersClients.noCompletedTransactions', 'No hay transacciones completadas')
                    }
                  </div>
                </Show>
                  {/*******   filter by docs - expandable   *******/}
                <For each={filteredTransactions().sort((a: any, b: any) => (b.balance) - (a.balance))}>
                  {(txn: any) => {
                    const typeColor = getTransactionTypeColor(txn.type);
                    const docId = txn.document || txn.id;
                    const hasTransactions = txn.transactions && txn.transactions.length > 0;

                    return (
                      <div style={{ 'margin-bottom': '0.5rem' }}>
                        {/* Document Header - Clickable */}
                        <div
                          style={{
                            ...transactionItemStyle,
                            cursor: hasTransactions ? 'pointer' : 'default',
                            'margin-bottom': '0',
                            'border-radius': isDocExpanded(docId) ? 'var(--border-radius-sm) var(--border-radius-sm) 0 0' : 'var(--border-radius-sm)',
                            background: isDocExpanded(docId) ? 'var(--gray-100)' : 'var(--gray-50)',
                            transition: 'background 0.2s'
                          }}
                          onClick={() => hasTransactions && toggleDocExpanded(docId)}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', 'margin-bottom': '0.25rem' }}>
                              {/* Expand/Collapse Icon */}
                              <Show when={hasTransactions}>
                                <span style={{
                                  'font-size': '0.8rem',
                                  transition: 'transform 0.2s',
                                  transform: isDocExpanded(docId) ? 'rotate(90deg)' : 'rotate(0deg)',
                                  display: 'inline-block'
                                }}>
                                  ▶
                                </span>
                              </Show>
                              <span style={{
                                padding: '0.15rem 0.5rem',
                                'border-radius': '9999px',
                                'font-size': '0.7rem',
                                'font-weight': '500',
                                background: typeColor.bg,
                                color: typeColor.color
                              }}>
                                Doc: {txn.document}
                              </span>
                              <Show when={hasTransactions}>
                                <span style={{
                                  padding: '0.15rem 0.5rem',
                                  'border-radius': '9999px',
                                  'font-size': '0.65rem',
                                  'font-weight': '500',
                                  background: '#e3f2fd',
                                  color: '#1976d2'
                                }}>
                                  {txn.transactions.length} {t('providersClients.transactions', 'transacciones')}
                                </span>
                              </Show>
                            </div>
                            <div style={{ 'font-weight': '500', 'font-size': '0.9rem' }}>{txn.description}</div>
                            <div style={{ 'font-size': '0.8rem', color: 'var(--text-muted)', 'margin-top': '0.25rem' }}>
                              <span style={{
                                padding: '0.15rem 0.5rem',
                                'border-radius': '9999px',
                                'font-size': '0.7rem',
                                'font-weight': '500',
                                background: getColorTr(txn.balance).bg,
                                color: getColorTr(txn.balance).color
                              }}>
                                {getColorTr(txn.balance).label}
                              </span>
                            </div>
                          </div>
                          <div style={{
                            'font-weight': '600',
                            'font-size': '1.1rem',
                            color: txn.type === 'payment' || txn.type === 'collection' ? '#388e3c' : 'var(--text-primary)'
                          }}>
                            {txn.type === 'payment' || txn.type === 'collection' ? '-' : ''}
                            {formatCurrency(txn.balance/100)}
                          </div>
                        </div>

                        {/* Transactions Inside Document - Expandable */}
                        <Show when={isDocExpanded(docId) && hasTransactions}>
                          <div style={{
                            background: '#fafafa',
                            'border-left': '3px solid var(--primary-color)',
                            'border-radius': '0 0 var(--border-radius-sm) var(--border-radius-sm)',
                            overflow: 'hidden'
                          }}>
                         
                            <For each={txn.transactions}>
                              {(innerTxn: any, index: any) => (
                                <div style={{
                                  display: 'flex',
                                  'justify-content': 'space-between',
                                  'align-items': 'center',
                                  padding: '0.6rem 0.75rem 0.6rem 1.25rem',
                                  'border-bottom': index() < txn.transactions.length - 1 ? '1px solid var(--border-color)' : 'none',
                                  'font-size': '0.85rem'
                                }}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                                      <span style={{
                                        padding: '0.1rem 0.4rem',
                                        'border-radius': '4px',
                                        'font-size': '0.75rem',
                                        'font-weight': '500',
                                        background: getTransactionTypeColor("collection").bg,
                                        color: getTransactionTypeColor("collection").color
                                      }}>
                                        {getTransactionTypeLabel(innerTxn.entryNumber)}
                                      </span>
                                      
                                      <span style={{ color: 'var(--text-muted)', 'font-size': '0.75rem' }}>
                                        {innerTxn.date ? formatDate(innerTxn.date) : ''}
                                      </span>
                                    </div>
                                    <div style={{ 'margin-top': '0.2rem', color: 'var(--text-secondary)', 'font-size': '0.55rem'  }}>
                                      {innerTxn.description || innerTxn.memo || '—'}
                                    </div>
                                  </div>
                                  <div style={{
                                    'font-weight': '600',
                                    width: '115px',
                                    color:  '#388e3c',
                                    "text-align":"right" 
                                  }}>
                                    {innerTxn.debitAmount > 0 ? '+' : ''}{formatCurrency((innerTxn.debitAmount|| 0))}
                                  </div>
                                  <div style={{
                                    'font-weight': '600',
                                    width: '115px',
                                    color: '#d32f2f',
                                    "text-align":"right"
                                  }}>
                                    {innerTxn.creditAmount > 0 ? '-' : ''}{formatCurrency((innerTxn.creditAmount || 0))}
                                  </div>
                                </div>
                              )}
                            </For>
                          </div>
                        </Show>
                      </div>
                    );
                  }}
                </For>
              </div>

              {/* Footer */}
              <div style={{
                display: 'flex',
                'justify-content': 'space-between',
                'padding-top': '1rem',
                'border-top': '1px solid var(--border-color)',
                'font-size': '0.8rem',
                color: 'var(--text-muted)'
              }}>
                <span>{t('common.created', 'Creado')}: {formatDate(entity().createdAt)}</span>
                <span>{t('common.updated', 'Actualizado')}: {formatDate(entity().updatedAt)}</span>
              </div>
            </div>
          );
        }}
      </Show>
    </Modal>
  );
};

export default EntityDetailModal;
