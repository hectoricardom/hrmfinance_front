import { Component, createSignal, createEffect, For, Show, onMount, onCleanup, createMemo } from 'solid-js';
import { Card } from '../../ui';
import { useTranslation } from '../../../translations';
import { providersClientsStore } from '../stores/providersClientsStore';
import { ProviderClient, EntityType } from '../types';
import AddEditEntityModal from '../components/AddEditEntityModal';
import EntityDetailModal from '../components/EntityDetailModal';
import PaymentModal from '../components/PaymentModal';
import CollectionModal from '../components/CollectionModal';
import MultiPaymentModal from '../components/MultiPaymentModal';
import MultiCollectionModal from '../components/MultiCollectionModal';
import { accountsApi } from '../../../services/apiAdapter';
import { authStore } from '../../../stores/authStore';
import { accountsStore } from '../../accounts';

const ProvidersClientsPage: Component = () => {
  const { t } = useTranslation();

  const [searchQuery, setSearchQuery] = createSignal('');
  const [typeFilter, setTypeFilter] = createSignal<EntityType | 'all'>('all');
  const [statusFilter, setStatusFilter] = createSignal<'all' | 'active' | 'inactive'>('active');

  // Modal states
  const [showAddModal, setShowAddModal] = createSignal(false);
  const [showDetailModal, setShowDetailModal] = createSignal(false);
  const [showPaymentModal, setShowPaymentModal] = createSignal(false);
  const [showCollectionModal, setShowCollectionModal] = createSignal(false);
  const [showMultiPaymentModal, setShowMultiPaymentModal] = createSignal(false);
  const [showMultiCollectionModal, setShowMultiCollectionModal] = createSignal(false);
  const [editingEntity, setEditingEntity] = createSignal<ProviderClient | null>(null);
  const [selectedEntity, setSelectedEntity] = createSignal<ProviderClient | null>(null);

  // Pagination / Infinite scroll state
  const PAGE_SIZE = 20;
  const [displayCount, setDisplayCount] = createSignal(PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = createSignal(false);
  let tableContainerRef: HTMLDivElement | undefined;


 const loadsAccount = async() => {
    await providersClientsStore.updateBalance();
     let acns  = await accountsApi.getAlls(authStore.getBusinessId());
    accountsStore.updAccount(acns);
    
   // accountsStore.updAccountBalance(bln);

 }

  // Handle scroll for infinite loading
  const handleScroll = () => {
    if (!tableContainerRef || isLoadingMore()) return;

    const { scrollTop, scrollHeight, clientHeight } = tableContainerRef;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

    // Load more when scrolled 80% of the way
    if (scrollPercentage > 0.8) {
      const allFiltered = allFilteredEntities();
      if (displayCount() < allFiltered.length) {
        setIsLoadingMore(true);
        // Simulate loading delay for smooth UX
        setTimeout(() => {
          setDisplayCount(prev => Math.min(prev + PAGE_SIZE, allFiltered.length));
          setIsLoadingMore(false);
        }, 100);
      }
    }
  };

  onMount(() => {
    loadsAccount();
    providersClientsStore.initialize();
  });

  // Reset display count when filters change
  createEffect(() => {
    // Track filter changes
    searchQuery();
    typeFilter();
    statusFilter();
    // Reset pagination
    setDisplayCount(PAGE_SIZE);
  });

  // All filtered entities (without pagination limit)
  const allFilteredEntities = createMemo(() => {
    let result = providersClientsStore.entities;

    // Apply search filter
    if (searchQuery()) {
      const query = searchQuery().toLowerCase();
      result = result.filter(e =>
        e.name?.toLowerCase()?.includes(query) ||
        e.email?.toLowerCase()?.includes(query) ||
        e.phone?.includes(query) ||
        e.taxId?.includes(query)
      );
    }

    // Apply type filter
    if (typeFilter() !== 'all') {
      result = result.filter(e => e.type === typeFilter() || e.type === 'both');
    }

    // Apply status filter
    if (statusFilter() === 'active') {
     // result = result.filter(e => e.isActive);
    } else if (statusFilter() === 'inactive') {
      //  result = result.filter(e => !e.isActive);
    }

    return result;
  });

  // Displayed entities (with pagination limit for infinite scroll)
  const filteredEntities = () => {
    return allFilteredEntities().slice(0, displayCount());
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(Math.abs(amount));
  };

  const getTypeLabel = (type: EntityType) => {
    switch (type) {
      case 'provider': return t('providersClients.provider', 'Proveedor');
      case 'customer': return t('providersClients.client', 'Cliente');
      case 'both': return t('providersClients.both', 'Ambos');
    }
  };

  const getTypeColor = (type: EntityType) => {
    switch (type) {
      case 'provider': return { bg: '#e3f2fd', color: '#1976d2' };
      case 'customer': return { bg: '#e8f5e9', color: '#388e3c' };
      case 'both': return { bg: '#fff3e0', color: '#f57c00' };
    }
  };

  const getBalanceInfo = (entity: ProviderClient) => {

    
    const totalBalance = providersClientsStore?.balances?.refMap[entity.id]?.balance;
    //console.log(entity.id, totalBalance, providersClientsStore?.balances)
    
    let type = entity.type;

    if(type === 'customer'){
        return {
          label: t('providersClients.theyOwe', 'Nos deben'),
          color: '#388e3c',
          amount: Math.abs(totalBalance)
        };
    }
    else if(type === 'provider'){
       return {
          label: t('providersClients.weOwe', 'Debemos'),
          color: '#d32f2f',
          amount: totalBalance
        };
    }
    /**
    else if(type==='both'){
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
    }
    */

    return {
      label: t('providersClients.balanced', 'Saldado'),
      color: '#757575',
      amount: 0
    };

  };



  const handleAddNew = () => {
    setEditingEntity(null);
    setShowAddModal(true);
  };

  const handleEdit = (entity: ProviderClient) => {
    setEditingEntity(entity);
    setShowAddModal(true);
  };

  const handleViewDetail = (entity: ProviderClient) => {
    setSelectedEntity(entity);
    providersClientsStore.selectEntity(entity);
    setShowDetailModal(true);
  };

  const handlePayment = (entity: ProviderClient) => {
    setSelectedEntity(entity);
    setShowPaymentModal(true);
  };

  const handleCollection = (entity: ProviderClient) => {
    setSelectedEntity(entity);
    setShowCollectionModal(true);
  };

  const handleDelete = async (entity: ProviderClient) => {
    if (confirm(t('providersClients.confirmDelete', '¿Está seguro de eliminar esta entidad?'))) {
      await providersClientsStore.deleteEntity(entity.id);
    }
  };

  const totalProviderDebt = () => {

    return providersClientsStore.entities
      .filter(e => e.type === 'provider')
      .reduce((sum, e) => sum + (getBalanceInfo(e).amount > 0 ? getBalanceInfo(e).amount : 0), 0);
  };

  const totalClientReceivables = () => {

   
    return providersClientsStore.entities
      .filter(e => e.type === 'customer')
      .reduce((sum, e) => sum + (getBalanceInfo(e).amount > 0 ?getBalanceInfo(e).amount : 0), 0);
  };

  const headerStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '1.5rem',
    'flex-wrap': 'wrap',
    gap: '1rem'
  };

  const statsContainerStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    'margin-bottom': '1.5rem'
  };

  const statCardStyle = {
    padding: '.1rem',
    'border-radius': 'var(--border-radius)',
    background: 'var(--surface-color)',
    'text-align': 'center'
  };

  const filtersStyle = {
    display: 'flex',
    gap: '1rem',
    'margin-bottom': '1.5rem',
    'flex-wrap': 'wrap',
    'align-items': 'center'
  };

  const inputStyle = {
    padding: '0.5rem 1rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '0.9rem',
    'min-width': '400px'
  };

  const selectStyle = {
    ...inputStyle,
    'min-width': '150px'
  };

  const buttonStyle = {
    padding: '0.5rem 1rem',
    'border-radius': 'var(--border-radius-sm)',
    border: 'none',
    cursor: 'pointer',
    'font-weight': '500',
    transition: 'all 0.2s ease'
  };

  const primaryButtonStyle = {
    ...buttonStyle,
    background: 'var(--primary-color)',
    color: 'white'
  };

  const tableStyle = {
    width: '100%',
    'border-collapse': 'collapse'
  };

  const thStyle = {
    padding: '0.75rem',
    'text-align': 'left',
    'font-weight': '600',
    'border-bottom': '2px solid var(--border-color)',
    background: '#fff',

    position: 'sticky' as const,
    top: 0,
    'z-index': 10,
    'box-shadow': '0 1px 3px rgba(0,0,0,0.1)'
  };

  const tdStyle = {
    padding: '0.75rem',
    'border-bottom': '1px solid var(--border-color)',
    'vertical-align': 'middle'
  };

  const actionButtonStyle = {
    padding: '0.25rem 0.5rem',
    'border-radius': '4px',
    border: 'none',
    cursor: 'pointer',
    'font-size': '0.8rem',
    'margin-right': '0.25rem'
  };

  return (
    <div style={{ padding: '1.5rem 1.5rem 0' }}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h1 style={{ margin: '0 0 0.5rem', 'font-size': '1.75rem' }}>
            {t('providersClients.title', 'Proveedores y Clientes')}
          </h1>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>
            {t('providersClients.subtitle', 'Gestión de proveedores, clientes, pagos y cobros')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', 'flex-wrap': 'wrap' }}>
          <button style={primaryButtonStyle} onClick={handleAddNew}>
            + {t('providersClients.addNew', 'Agregar Nuevo')}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={statsContainerStyle}>
        <Card>
          <div style={statCardStyle}>
            <div style={{ 'font-size': '0.85rem', color: 'var(--text-muted)', 'margin-bottom': '0.5rem' }}>
              {t('providersClients.totalEntities', 'Total Entidades')}
            </div>
            <div style={{ 'font-size': '1.5rem', 'font-weight': '700' }}>
              {filteredEntities().length}
            </div>
          </div>
        </Card>
        <Card>
          <div style={statCardStyle}>
            <div style={{ 'font-size': '0.85rem', color: 'var(--text-muted)', 'margin-bottom': '0.5rem' }}>
              {t('providersClients.accountsPayable', 'Cuentas por Pagar')}
            </div>
            <div style={{ 'font-size': '1.5rem', 'font-weight': '700', color: '#d32f2f' }}>
              {formatCurrency(totalProviderDebt())}
            </div>
            <button
              onClick={() => setShowMultiPaymentModal(true)}
              style={{
              padding: '0.25rem 0.5rem',
              'border-radius': '9999px',
              'font-size': '0.75rem',
              'font-weight': '500',
              background: false  ? '#e8f5e9' : '#ffebee',
              color: false ? '#388e3c' : '#d32f2f'
            }}>
              {'Hacer un Pago'}
            
            </button>
          </div>
        </Card>
        <Card>
          <div style={statCardStyle}>
            <div style={{ 'font-size': '0.85rem', color: 'var(--text-muted)', 'margin-bottom': '0.5rem' }}>
              {t('providersClients.accountsReceivable', 'Cuentas por Cobrar')}
            </div>
            <div style={{ 'font-size': '1.5rem', 'font-weight': '700', color: '#388e3c' }}>
             
              {formatCurrency(totalClientReceivables())}
            </div>
            
             <button
              onClick={() => setShowMultiCollectionModal(true)}
              style={{
              padding: '0.25rem 0.5rem',
              'border-radius': '9999px',
              'font-size': '0.75rem',
              'font-weight': '500',
              background: true  ? '#e8f5e9' : '#ffebee',
              color: true ? '#388e3c' : '#d32f2f'
            }}>
               {'Hacer un Cobro'}
            
            </button>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div style={{ padding: '1rem' }}>
          <div style={filtersStyle}>
            <input
              type="text"
              style={inputStyle}
              placeholder={t('common.search', 'Buscar...')}
              value={searchQuery()}
              onInput={(e) => setSearchQuery(e.target.value)}
            />
            <select
              style={selectStyle}
              value={typeFilter()}
              onChange={(e) => setTypeFilter(e.target.value as EntityType | 'all')}
            >
              <option value="all">{t('providersClients.allTypes', 'Todos los tipos')}</option>
              <option value="provider">{t('providersClients.providers', 'Proveedores')}</option>
              <option value="customer">{t('providersClients.clients', 'Clientes')}</option>
              <option value="both">{t('providersClients.both', 'Ambos')}</option>
            </select>
            <select
              style={selectStyle}
              value={statusFilter()}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            >
              <option value="all">{t('common.all', 'Todos')}</option>
              <option value="active">{t('common.active', 'Activos')}</option>
              <option value="inactive">{t('common.inactive', 'Inactivos')}</option>
            </select>
          </div>

          {/* Table */}
          <Show when={!providersClientsStore.isLoading} fallback={
            <div style={{ 'text-align': 'center', padding: '2rem' }}>
              {t('common.loading', 'Cargando...')}
            </div>
          }>
            <Show when={filteredEntities().length > 0} fallback={
              <div style={{ 'text-align': 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                {t('providersClients.noEntitiesFound', 'No se encontraron entidades')}
              </div>
            }>
              <div
                ref={tableContainerRef}
                onScroll={handleScroll}
                style={{
                  'overflow-x': 'auto',
                  'overflow-y': 'auto',
                  'max-height': 'calc(100vh - 180px)',
                  'min-height': '200px'
                }}
              >
                <table style={tableStyle}>
                  <thead style={{background: '#fff'}}>
                    <tr  style={{background: '#fff'}}>
                      <th style={thStyle}>{t('common.name', 'Nombre')}</th>
                      <th style={thStyle}>{t('common.type', 'Tipo')}</th>
                      <th style={thStyle}>{t('providersClients.balance', 'Balance')}</th>
                      <th style={thStyle}>{t('common.status', 'Estado')}</th>
                      <th style={{ ...thStyle, 'text-align': 'center' }}>{t('common.actions', 'Acciones')}</th>
                    </tr>
                  </thead>
                  <tbody >
                    <For each={filteredEntities()}>
                      {(entity) => {
                        
                        return (
                          <tr style={{ cursor: 'pointer' }} onClick={() => handleViewDetail(entity)}>
                            <td style={tdStyle}>
                              <div style={{ 'font-weight': '600' }}>{entity.name}</div>
                              <Show when={entity.contactPerson}>
                                <div style={{ 'font-size': '0.8rem', color: 'var(--text-muted)' }}>
                                  {entity.contactPerson}
                                </div>
                              </Show>
                            </td>
                            <td style={tdStyle}>
                              <span style={{
                                padding: '0.25rem 0.5rem',
                                'border-radius': '9999px',
                                'font-size': '0.75rem',
                                'font-weight': '500',
                                background: getTypeColor(entity.type).bg,
                                color: getTypeColor(entity.type).color
                              }}>
                                {getTypeLabel(entity.type)}
                              </span>
                            </td>
                          
                            <td style={tdStyle}>
                              <div style={{ 'font-weight': '600', color: getBalanceInfo(entity).color }}>
                                {formatCurrency(getBalanceInfo(entity).amount || 0) }
                              </div>
                              <div style={{ 'font-size': '0.75rem', color: getTypeColor(entity.type).color }}>
                                {getBalanceInfo(entity).label}
                              </div>
                            </td>
                            <td style={tdStyle}>
                              <span style={{
                                padding: '0.25rem 0.5rem',
                                'border-radius': '9999px',
                                'font-size': '0.75rem',
                                'font-weight': '500',
                                background: entity.isActive ? '#e8f5e9' : '#ffebee',
                                color: entity.isActive ? '#388e3c' : '#d32f2f'
                              }}>
                                {entity.isActive ? t('common.active', 'Activo') : t('common.inactive', 'Inactivo')}
                              </span>
                            </td>
                            <td style={{ ...tdStyle, 'text-align': 'center' }} onClick={(e) => e.stopPropagation()}>
                              {/* 
                              <Show when={entity.type === 'provider' || entity.type === 'both'}>
                                <button
                                  style={{ ...actionButtonStyle, background: '#e3f2fd', color: '#1976d2' }}
                                  onClick={() => handlePayment(entity)}
                                  title={t('providersClients.makePayment', 'Realizar Pago')}
                                >
                                  💵 {t('providersClients.pay', 'Pagar')}
                                </button>
                              </Show>
                              <Show when={entity.type === 'customer' || entity.type === 'both'}>
                                <button
                                  style={{ ...actionButtonStyle, background: '#e8f5e9', color: '#388e3c' }}
                                  onClick={() => handleCollection(entity)}
                                  title={t('providersClients.collectPayment', 'Registrar Cobro')}
                                >
                                  💰 {t('providersClients.collect', 'Cobrar')}
                                </button>
                              </Show>
                              */}
                              <button
                                style={{ ...actionButtonStyle, background: '#fff3e0', color: '#f57c00' }}
                                onClick={() => handleEdit(entity)}
                                title={t('common.edit', 'Editar')}
                              >
                                ✏️
                              </button>
                              <button
                                style={{ ...actionButtonStyle, background: '#ffebee', color: '#d32f2f' }}
                                onClick={() => handleDelete(entity)}
                                title={t('common.delete', 'Eliminar')}
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        );
                      }}
                    </For>
                  </tbody>
                </table>

                {/* Loading indicator for infinite scroll */}
                <Show when={isLoadingMore()}>
                  <div style={{
                    'text-align': 'center',
                    padding: '1rem',
                    color: 'var(--text-muted)'
                  }}>
                    Cargando más...
                  </div>
                </Show>
              </div>

              {/* Pagination info */}
              <div style={{
                display: 'flex',
                'justify-content': 'space-between',
                'align-items': 'center',
                padding: '0.75rem 0',
                'font-size': '0.85rem',
                color: 'var(--text-muted)',
                'border-top': '1px solid var(--border-color)',
                'margin-top': '0.015rem'
              }}>
                <span>
                  Mostrando {filteredEntities().length} de {allFilteredEntities().length} entidades
                </span>
                <Show when={displayCount() < allFilteredEntities().length}>
                  <button
                    onClick={() => setDisplayCount(prev => Math.min(prev + PAGE_SIZE, allFilteredEntities().length))}
                    style={{
                      padding: '0.5rem 1rem',
                      'border-radius': 'var(--border-radius-sm)',
                      border: '1px solid var(--border-color)',
                      background: 'white',
                      cursor: 'pointer',
                      'font-size': '0.85rem'
                    }}
                  >
                    Cargar más ({allFilteredEntities().length - displayCount()} restantes)
                  </button>
                </Show>
              </div>
            </Show>
          </Show>
        </div>
      </Card>

      {/* Modals */}
      <AddEditEntityModal
        isOpen={showAddModal()}
        onClose={() => setShowAddModal(false)}
        entity={editingEntity()}
      />

      <EntityDetailModal
        isOpen={showDetailModal()}
        onClose={() => setShowDetailModal(false)}
        entity={selectedEntity()}
        onPayment={() => {
          setShowDetailModal(false);
          setShowPaymentModal(true);
        }}
        onCollection={() => {
          setShowDetailModal(false);
          setShowCollectionModal(true);
        }}
      />

      <PaymentModal
        isOpen={showPaymentModal()}
        onClose={() => setShowPaymentModal(false)}
        entity={selectedEntity()}
      />

      <CollectionModal
        isOpen={showCollectionModal()}
        onClose={() => setShowCollectionModal(false)}
        entity={selectedEntity()}
      />

      <MultiPaymentModal
        isOpen={showMultiPaymentModal()}
        onClose={() => setShowMultiPaymentModal(false)}
      />

      <MultiCollectionModal
        isOpen={showMultiCollectionModal()}
        onClose={() => setShowMultiCollectionModal(false)}
      />
    </div>
  );
};

export default ProvidersClientsPage;
