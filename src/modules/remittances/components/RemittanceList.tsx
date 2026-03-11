import { Component, createSignal, createResource, For, Show, createMemo, onMount, onCleanup } from 'solid-js';
import { RemittanceData, RemittanceFilter, REMITTANCE_STATUSES, AVAILABLE_CURRENCIES } from '../types/remittanceTypes';
import { remittanceApi, getStatusLabel, getStatusColor } from '../services/remittanceApi';
import { authStore } from '../../../stores/authStore';

interface RemittanceListProps {
  onEdit: (remittance: RemittanceData) => void;
  onView: (remittance: RemittanceData) => void;
  onDelete: (remittance: RemittanceData) => void;
  onCreate: () => void;
}

const RemittanceList: Component<RemittanceListProps> = (props) => {
  const [filter, setFilter] = createSignal<RemittanceFilter>({});
  const [currentPage, setCurrentPage] = createSignal(1);
  const [pageSize] = createSignal(20);
  const [searchTerm, setSearchTerm] = createSignal('');
  const [selectedStatus, setSelectedStatus] = createSignal<string>('');
  const [selectedCurrency, setSelectedCurrency] = createSignal<string>('');
  const [showMyRemittances, setShowMyRemittances] = createSignal(false);
  const [isMobile, setIsMobile] = createSignal(window.innerWidth < 768);
  const [showFilters, setShowFilters] = createSignal(false);

  // Handle window resize for mobile detection
  const handleResize = () => {
    setIsMobile(window.innerWidth < 768);
  };

  onMount(() => {
    window.addEventListener('resize', handleResize);
  });

  onCleanup(() => {
    window.removeEventListener('resize', handleResize);
  });

  // Build filter based on form inputs
  const currentFilter = createMemo(() => {
    const f: RemittanceFilter = {};
    
    if (searchTerm()) f.search = searchTerm();
    if (selectedStatus()) f.status = selectedStatus() as any;
    if (selectedCurrency()) f.currency = selectedCurrency();
    
    return f;
  });

  // Fetch remittances with current filter
  const [remittancesData, { refetch }] = createResource(
    () => ({ filter: currentFilter(), page: currentPage(), pageSize: pageSize() }),
    async ({ filter, page, pageSize }) => {
      let rem =  await remittanceApi.getAll(filter, page, pageSize)
      
      let remm =  rem.remittances.filter(remittance=> authStore.state?.profile?.isAdmin || remittance.status === "pending");
      rem.remittances = remm;
      console.log(rem)
      return rem
    }
  );

  const handleDelete = async (remittance: RemittanceData) => {
    if (confirm(`¿Está seguro que desea eliminar la remesa ${remittance.remittanceNumber}?`)) {
      const result = await remittanceApi.delete(remittance.id!);
      if (result.success) {
        alert('Remesa eliminada exitosamente');
        refetch();
      } else {
        alert(result.message);
      }
    }
  };

  const handleStatusChange = async (remittance: RemittanceData, newStatus: string) => {
    try {
      await remittanceApi.updateStatus(remittance.id!, newStatus);
      alert('Estado actualizado exitosamente');
      refetch();
    } catch (error) {
      alert('Error al actualizar el estado');
    }
  };

  const applyFilters = () => {
    setCurrentPage(1);
    refetch();
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedStatus('');
    setSelectedCurrency('');
    setCurrentPage(1);
    refetch();
  };

  const formatCurrency = (amount: number, currency: string) => {
    const currencyInfo = AVAILABLE_CURRENCIES.find(c => c.code === currency);
    const symbol = currencyInfo?.symbol || currency;
    return `${symbol} ${amount.toFixed(2)}`;
  };

  // Styles
  const containerStyle = {
    padding: '2rem',
    'background-color': 'var(--background-color)'
  };

  const headerStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '2rem'
  };

  const titleStyle = {
    'font-size': '1.5rem',
    'font-weight': '600',
    color: 'var(--text-primary)'
  };

  const createButtonStyle = {
    padding: '0.75rem 1.5rem',
    'background-color': 'var(--primary-color)',
    color: 'white',
    border: 'none',
    'border-radius': '4px',
    cursor: 'pointer',
    'font-weight': '500'
  };

  const filtersStyle = {
    display: 'flex',
    gap: '1rem',
    'margin-bottom': '2rem',
    'flex-wrap': 'wrap',
    'align-items': 'end'
  };

  const filterGroupStyle = {
    display: 'flex',
    'flex-direction': 'column',
    gap: '0.5rem'
  };

  const labelStyle = {
    'font-size': '0.875rem',
    'font-weight': '500',
    color: 'var(--text-secondary)'
  };

  const inputStyle = {
    padding: '0.5rem',
    border: '1px solid var(--border-color)',
    'border-radius': '4px',
    'font-size': '0.875rem'
  };

  const selectStyle = {
    ...inputStyle,
    cursor: 'pointer'
  };

  const buttonStyle = {
    padding: '0.5rem 1rem',
    border: 'none',
    'border-radius': '4px',
    cursor: 'pointer',
    'font-size': '0.875rem',
    'font-weight': '500'
  };

  const primaryButtonStyle = {
    ...buttonStyle,
    'background-color': 'var(--primary-color)',
    color: 'white'
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    'background-color': 'var(--border-color)',
    color: 'var(--text-secondary)'
  };

  const tableStyle = {
    width: '100%',
    'border-collapse': 'collapse' as const,
    'background-color': 'white',
    'border-radius': '8px',
    overflow: 'hidden',
    'box-shadow': '0 1px 3px rgba(0,0,0,0.1)'
  };

  const thStyle = {
    padding: '1rem',
    'text-align': 'left' as const,
    'background-color': 'var(--strip-color)',
    'font-weight': '600',
    'font-size': '0.875rem',
    color: 'var(--text-primary)',
    'border-bottom': '1px solid var(--border-color)'
  };

  const tdStyle = {
    padding: '1rem',
    'border-bottom': '1px solid var(--border-light)',
    'font-size': '0.875rem',
    'vertical-align': 'middle' as const
  };

  const statusBadgeStyle = (status: string) => ({
    display: 'inline-block',
    padding: '0.25rem 0.5rem',
    'border-radius': '12px',
    'font-size': '0.75rem',
    'font-weight': '500',
    'background-color': getStatusColor(status) + '20',
    color: getStatusColor(status)
  });

  const actionButtonStyle = {
    ...buttonStyle,
    padding: '0.25rem 0.5rem',
    'font-size': '0.75rem',
    'margin-right': '0.5rem'
  };

  const editButtonStyle = {
    ...actionButtonStyle,
    'background-color': '#3b82f6',
    color: 'white'
  };

  const viewButtonStyle = {
    ...actionButtonStyle,
    'background-color': '#6b7280',
    color: 'white'
  };

  const deleteButtonStyle = {
    ...actionButtonStyle,
    'background-color': '#ef4444',
    color: 'white'
  };

  const paginationStyle = {
    display: 'flex',
    'justify-content': 'center',
    'align-items': 'center',
    gap: '1rem',
    'margin-top': '2rem'
  };

  const loadingStyle = {
    'text-align': 'center' as const,
    padding: '3rem',
    color: 'var(--text-muted)'
  };

  const emptyStyle = {
    'text-align': 'center' as const,
    padding: '3rem',
    color: 'var(--text-muted)'
  };

  // Mobile-specific styles
  const mobileContainerStyle = {
    padding: '1rem',
    'background-color': 'var(--background-color)'
  };

  const mobileHeaderStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    gap: '1rem',
    'margin-bottom': '1rem'
  };

  const mobileHeaderTopStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center'
  };

  const mobileTitleStyle = {
    'font-size': '1.25rem',
    'font-weight': '600',
    color: 'var(--text-primary)'
  };

  const mobileCreateButtonStyle = {
    padding: '0.5rem 1rem',
    'background-color': 'var(--primary-color)',
    color: 'white',
    border: 'none',
    'border-radius': '4px',
    cursor: 'pointer',
    'font-weight': '500',
    'font-size': '0.875rem'
  };

  const mobileSearchContainerStyle = {
    display: 'flex',
    gap: '0.5rem',
    'align-items': 'center'
  };

  const mobileSearchInputStyle = {
    flex: '1',
    padding: '0.75rem',
    border: '1px solid var(--border-color)',
    'border-radius': '8px',
    'font-size': '1rem'
  };

  const filterToggleButtonStyle = {
    padding: '0.75rem',
    border: '1px solid var(--border-color)',
    'border-radius': '8px',
    background: 'white',
    cursor: 'pointer',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center'
  };

  const mobileFiltersContainerStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    gap: '0.75rem',
    padding: '1rem',
    background: 'white',
    'border-radius': '8px',
    'margin-bottom': '1rem',
    'box-shadow': '0 2px 8px rgba(0,0,0,0.08)'
  };

  const mobileFilterRowStyle = {
    display: 'flex',
    gap: '0.5rem'
  };

  const mobileSelectStyle = {
    flex: '1',
    padding: '0.75rem',
    border: '1px solid var(--border-color)',
    'border-radius': '8px',
    'font-size': '0.875rem',
    background: 'white'
  };

  const mobileFilterButtonsStyle = {
    display: 'flex',
    gap: '0.5rem',
    'margin-top': '0.5rem'
  };

  const mobileFilterButtonStyle = {
    flex: '1',
    padding: '0.75rem',
    'border-radius': '8px',
    border: 'none',
    'font-weight': '500',
    cursor: 'pointer'
  };

  // Card styles for mobile view
  const cardContainerStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    gap: '1rem'
  };

  const cardStyle = {
    background: 'white',
    'border-radius': '12px',
    padding: '1rem',
    'box-shadow': '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid var(--border-light)'
  };

  const cardHeaderStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'flex-start',
    'margin-bottom': '0.75rem'
  };

  const cardNumberStyle = {
    'font-weight': '600',
    'font-size': '1rem',
    color: 'var(--text-primary)'
  };

  const cardRefStyle = {
    'font-size': '0.75rem',
    color: 'var(--text-muted)',
    'margin-top': '0.25rem'
  };

  const cardAmountStyle = {
    'font-size': '1.25rem',
    'font-weight': '700',
    color: 'var(--primary-color)',
    'text-align': 'right' as const
  };

  const cardBodyStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    gap: '0.5rem'
  };

  const cardRowStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'font-size': '0.875rem'
  };

  const cardLabelStyle = {
    color: 'var(--text-muted)',
    'font-size': '0.75rem'
  };

  const cardValueStyle = {
    color: 'var(--text-primary)',
    'font-weight': '500'
  };

  const cardCustomerStyle = {
    'border-top': '1px solid var(--border-light)',
    'padding-top': '0.75rem',
    'margin-top': '0.5rem'
  };

  const cardCustomerNameStyle = {
    'font-weight': '500',
    color: 'var(--text-primary)',
    'margin-bottom': '0.25rem'
  };

  const cardCustomerIdStyle = {
    'font-size': '0.75rem',
    color: 'var(--text-muted)'
  };

  const cardActionsStyle = {
    display: 'flex',
    gap: '0.5rem',
    'margin-top': '1rem',
    'padding-top': '0.75rem',
    'border-top': '1px solid var(--border-light)'
  };

  const cardActionButtonStyle = {
    flex: '1',
    padding: '0.625rem',
    'border-radius': '8px',
    border: 'none',
    'font-weight': '500',
    'font-size': '0.875rem',
    cursor: 'pointer',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    gap: '0.25rem'
  };

  const cardViewButtonStyle = {
    ...cardActionButtonStyle,
    background: '#f3f4f6',
    color: '#374151'
  };

  const cardEditButtonStyle = {
    ...cardActionButtonStyle,
    background: '#dbeafe',
    color: '#1d4ed8'
  };

  const cardDeleteButtonStyle = {
    ...cardActionButtonStyle,
    background: '#fee2e2',
    color: '#dc2626'
  };

  const mobilePaginationStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '1rem',
    background: 'white',
    'border-radius': '8px',
    'margin-top': '1rem'
  };

  const mobilePaginationButtonStyle = {
    padding: '0.625rem 1rem',
    'border-radius': '8px',
    border: '1px solid var(--border-color)',
    background: 'white',
    cursor: 'pointer',
    'font-weight': '500',
    'font-size': '0.875rem'
  };

  const mobilePaginationTextStyle = {
    'font-size': '0.875rem',
    color: 'var(--text-muted)'
  };

  // Mobile Card Component
  const RemittanceCard = (remittance: RemittanceData) => (
    <div style={cardStyle}>
      <div style={cardHeaderStyle}>
        <div>
          <div style={cardNumberStyle}>{remittance.remittanceNumber}</div>
          <Show when={remittance.reference}>
            <div style={cardRefStyle}>Ref: {remittance.reference}</div>
          </Show>
        </div>
      </div>
     
      <div style={cardBodyStyle}>
        <div style={cardRowStyle}>
          <span style={cardLabelStyle}>Estado</span>
          <Show
            when={
              authStore.state?.profile?.isAdmin 
            }
            fallback={
              <span style={statusBadgeStyle(remittance.status)}>
                {getStatusLabel(remittance.status)}
              </span>
            }
          >
            <select
              style={{
                ...mobileSelectStyle,
                flex: 'none',
                width: 'auto',
                padding: '0.25rem 0.5rem',
                ...statusBadgeStyle(remittance.status),
                border: `1px solid ${getStatusColor(remittance.status)}40`
              }}
              value={remittance.status}
              onChange={(e) => handleStatusChange(remittance, e.target.value)}
            >
              <For each={REMITTANCE_STATUSES}>
                {(status) => (
                  <option value={status.value}>{status.label}</option>
                )}
              </For>
            </select>
          </Show>
        </div>

        <Show
            when={
              authStore.state?.profile?.isAdmin || remittance.status === "pending"
            }>

          

        <div style={cardRowStyle}>
          <span style={cardLabelStyle}>Fecha</span>
          <span style={cardValueStyle}>
            {new Date(remittance.date).toLocaleDateString('es-ES')}
          </span>
        </div>

        <div style={cardRowStyle}>
          <span style={cardLabelStyle}>USD</span>
          <div style={cardAmountStyle}>
              {formatCurrency(remittance.amount, remittance.currency)}
          </div>
        </div>
        <Show when={remittance.currency !== 'USD' && remittance.exchangeRate}>
          <div style={cardRowStyle}>
            <span style={cardLabelStyle}>Equivalente CUP</span>
            <div>
            
            <span style={{...cardValueStyle, ...cardAmountStyle}}>
               ${(remittance.amount * (remittance.exchangeRate || 1)).toFixed(2)}
            </span>
            </div>
           
          </div>
        </Show>
      </Show>
      </div>

        <Show when={ authStore.isAdmin() || remittance.status === "pending" }>
             
      <div style={cardCustomerStyle}>
        <div style={cardCustomerNameStyle}>
          {remittance.customer.fullName || remittance.customer.name}
        </div>
        <Show when={remittance.customer.cid}>
          <div style={cardCustomerIdStyle}>
            Cédula: {remittance.customer.cid}
          </div>
        </Show>
      </div>

   
  
      <div style={cardActionsStyle}>
        <button
          style={cardViewButtonStyle}
          onClick={() => props.onView(remittance)}
        >
          👁️ Ver
        </button>
        <Show when={authStore.isAdmin()}>
          <button
            style={cardEditButtonStyle}
            onClick={() => props.onEdit(remittance)}
          >
            ✏️ Editar
          </button>
          <button
            style={cardDeleteButtonStyle}
            onClick={() => handleDelete(remittance)}
          >
            🗑️
          </button>
        </Show>
      </div>
    </Show>
    </div>
  );

  // Mobile View
  const MobileView = () => (
    <div style={mobileContainerStyle}>
      {/* Mobile Header */}
      <div style={mobileHeaderStyle}>
        <div style={mobileHeaderTopStyle}>
          <h1 style={mobileTitleStyle}>Remesas</h1>
          <Show when={authStore.isAdmin()}>
            <button style={mobileCreateButtonStyle} onClick={() => props.onCreate()}>
              + Nueva
            </button>
          </Show>
        </div>

        {/* Mobile Search */}
        <div style={mobileSearchContainerStyle}>
          <input
            type="text"
            style={mobileSearchInputStyle}
            placeholder="Buscar remesa..."
            value={searchTerm()}
            onInput={(e) => setSearchTerm(e.target.value)}
            onKeyUp={(e) => e.key === 'Enter' && applyFilters()}
          />
          <button
            style={{
              ...filterToggleButtonStyle,
              background: showFilters() ? 'var(--primary-color)' : 'white',
              color: showFilters() ? 'white' : 'var(--text-primary)'
            }}
            onClick={() => setShowFilters(!showFilters())}
          >
            🔍
          </button>
        </div>
      </div>

      {/* Mobile Filters (Collapsible) */}
      <Show when={showFilters()}>
        <div style={mobileFiltersContainerStyle}>
          <div style={mobileFilterRowStyle}>
            <select
              style={mobileSelectStyle}
              value={selectedStatus()}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">Todos los estados</option>
              <For each={REMITTANCE_STATUSES}>
                {(status) => (
                  <option value={status.value}>{status.label}</option>
                )}
              </For>
            </select>
            <select
              style={mobileSelectStyle}
              value={selectedCurrency()}
              onChange={(e) => setSelectedCurrency(e.target.value)}
            >
              <option value="">Moneda</option>
              <For each={AVAILABLE_CURRENCIES}>
                {(currency) => (
                  <option value={currency.code}>{currency.code}</option>
                )}
              </For>
            </select>
          </div>
          <div style={mobileFilterButtonsStyle}>
            <button
              style={{
                ...mobileFilterButtonStyle,
                background: 'var(--primary-color)',
                color: 'white'
              }}
              onClick={applyFilters}
            >
              Aplicar
            </button>
            <button
              style={{
                ...mobileFilterButtonStyle,
                background: '#f3f4f6',
                color: 'var(--text-secondary)'
              }}
              onClick={clearFilters}
            >
              Limpiar
            </button>
          </div>
        </div>
      </Show>

      {/* Mobile Card List */}
      <Show
        when={!remittancesData.loading}
        fallback={
          <div style={{ ...emptyStyle, background: 'white', 'border-radius': '12px' }}>
            Cargando remesas...
          </div>
        }
      >
        <Show
          when={remittancesData()?.remittances.length > 0}
          fallback={
            <div style={{ ...emptyStyle, background: 'white', 'border-radius': '12px' }}>
              <p>No se encontraron remesas.</p>
              <button
                style={{ ...mobileCreateButtonStyle, 'margin-top': '1rem' }}
                onClick={() => props.onCreate()}
              >
                Crear primera remesa
              </button>
            </div>
          }
        >
          <div style={cardContainerStyle}>
            <For each={remittancesData()?.remittances || []}>
              {(remittance) => RemittanceCard(remittance)}
            </For>
          </div>

          {/* Mobile Pagination */}
          <Show when={remittancesData()?.total > pageSize()}>
            <div style={mobilePaginationStyle}>
              <button
                style={{
                  ...mobilePaginationButtonStyle,
                  opacity: currentPage() === 1 ? 0.5 : 1
                }}
                disabled={currentPage() === 1}
                onClick={() => setCurrentPage(currentPage() - 1)}
              >
                ← Anterior
              </button>
              <span style={mobilePaginationTextStyle}>
                {currentPage()} / {Math.ceil((remittancesData()?.total || 0) / pageSize())}
              </span>
              <button
                style={{
                  ...mobilePaginationButtonStyle,
                  opacity: currentPage() >= Math.ceil((remittancesData()?.total || 0) / pageSize()) ? 0.5 : 1
                }}
                disabled={currentPage() >= Math.ceil((remittancesData()?.total || 0) / pageSize())}
                onClick={() => setCurrentPage(currentPage() + 1)}
              >
                Siguiente →
              </button>
            </div>
          </Show>
        </Show>
      </Show>
    </div>
  );

  // Render mobile or desktop view based on screen size
  return (
    <Show when={isMobile()} fallback={
      <div style={containerStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <h1 style={titleStyle}>Lista de Remesas</h1>
        <Show when={authStore.isAdmin()}>
          <button style={createButtonStyle} onClick={() => props.onCreate()}>
            + Nueva Remesa
          </button>
        </Show>
      </div>

      {/* Filters */}
      <div style={filtersStyle}>
        <div style={filterGroupStyle}>
          <label style={labelStyle}>Buscar</label>
          <input
            type="text"
            style={inputStyle}
            placeholder="Número, cliente, referencia..."
            value={searchTerm()}
            onInput={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={filterGroupStyle}>
          <label style={labelStyle}>Estado</label>
          <select
            style={selectStyle}
            value={selectedStatus()}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="">Todos los estados</option>
            <For each={REMITTANCE_STATUSES}>
              {(status) => (
                <option value={status.value}>{status.label}</option>
              )}
            </For>
          </select>
        </div>

        <div style={filterGroupStyle}>
          <label style={labelStyle}>Moneda</label>
          <select
            style={selectStyle}
            value={selectedCurrency()}
            onChange={(e) => setSelectedCurrency(e.target.value)}
          >
            <option value="">Todas las monedas</option>
            <For each={AVAILABLE_CURRENCIES}>
              {(currency) => (
                <option value={currency.code}>{currency.code} - {currency.name}</option>
              )}
            </For>
          </select>
        </div>

        <div style={filterGroupStyle}>
          <label style={labelStyle}>&nbsp;</label>
          <div>
            <button style={primaryButtonStyle} onClick={applyFilters}>
              Filtrar
            </button>
            <button style={secondaryButtonStyle} onClick={clearFilters}>
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <Show
        when={!remittancesData.loading}
        fallback={<div style={loadingStyle}>Cargando remesas...</div>}
      >
        <Show
          when={remittancesData()?.remittances.length > 0}
          fallback={
            <div style={emptyStyle}>
              <p>No se encontraron remesas.</p>
              <button style={primaryButtonStyle} onClick={() => props.onCreate()}>
                Crear primera remesa
              </button>
            </div>
          }
        >
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Número</th>
                <th style={thStyle}>Cliente</th>
                <th style={thStyle}>Cantidad</th>
                <th style={thStyle}>Estado</th>
                <th style={thStyle}>Fecha</th>
                <Show when={authStore.state?.profile?.isAdmin }>
                  <th style={thStyle}>Creado por</th>
                </Show>
                <th style={thStyle}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <For each={remittancesData()?.remittances || []}>
                {(remittance) => (
                  <tr>
                    <td style={tdStyle}>
                      <strong>{remittance.remittanceNumber}</strong>
                      <p>{remittance.id}</p>
                      <Show when={remittance.reference}>
                        <br />
                        <small style={{ color: 'var(--text-muted)' }}>
                          Ref: {remittance.reference}
                        </small>
                      </Show>
                    </td>
                    <td style={tdStyle}>
                      <div>{remittance.customer.fullName || remittance.customer.name}</div>
                      <Show when={remittance.customer.cid}>
                        <small style={{ color: 'var(--text-muted)' }}>
                          Cédula: {remittance.customer.cid}
                        </small>
                      </Show>
                    </td>
                    <td style={tdStyle}>
                      <strong>{formatCurrency(remittance.amount, remittance.currency)}</strong>
                      <Show when={remittance.currency !== 'USD' && remittance.exchangeRate}>
                        <br />
                        <small style={{ color: 'var(--text-muted)' }}>
                          {remittance.currency} ${(remittance.amount * (remittance.exchangeRate || 1)).toFixed(2)}
                        </small>
                      </Show>
                    </td>
                    <td style={tdStyle}>
                      <Show
                        when={
                          authStore.state?.profile?.isAdmin || 
                          authStore.state?.profile?.read_write || 
                          remittance.createdBy === authStore.currentUser?.uid
                        }
                        fallback={
                          <span style={statusBadgeStyle(remittance.status)}>
                            {getStatusLabel(remittance.status)}
                          </span>
                        }
                      >
                        <select
                          style={{
                            ...selectStyle,
                            ...statusBadgeStyle(remittance.status),
                            border: 'none',
                            background: 'transparent'
                          }}
                          value={remittance.status}
                          onChange={(e) => handleStatusChange(remittance, e.target.value)}
                        >
                          <For each={REMITTANCE_STATUSES}>
                            {(status) => (
                              <option value={status.value}>{status.label}</option>
                            )}
                          </For>
                        </select>
                      </Show>
                    </td>
                    <td style={tdStyle}>
                      {new Date(remittance.date).toLocaleDateString('es-ES')}
                    </td>
                   
                    <Show when={authStore.isAdmin()}>
                      <td style={tdStyle}>
                        <small style={{ color: 'var(--text-muted)' }}>
                          {remittance.createdBy || 'N/A'}
                        </small>
                      </td>
                    </Show>
                    <td style={tdStyle}>
                      <button
                        style={viewButtonStyle}
                        onClick={() => props.onView(remittance)}
                      >
                        Ver
                      </button>
                      <Show when={
                        authStore.isAdmin()
                        // || remittance.createdBy === authStore.currentUser?.uid
                      }>
                        <button
                          style={editButtonStyle}
                          onClick={() => props.onEdit(remittance)}
                        >
                          Editar
                        </button>
                        <button
                          style={deleteButtonStyle}
                          onClick={() => handleDelete(remittance)}
                        >
                          Eliminar
                        </button>
                      </Show>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>

          {/* Pagination */}
          <Show when={remittancesData()?.total > pageSize()}>
            <div style={paginationStyle}>
              <button
                style={secondaryButtonStyle}
                disabled={currentPage() === 1}
                onClick={() => setCurrentPage(currentPage() - 1)}
              >
                Anterior
              </button>
              <span>
                Página {currentPage()} de {Math.ceil((remittancesData()?.total || 0) / pageSize())}
              </span>
              <button
                style={secondaryButtonStyle}
                disabled={currentPage() >= Math.ceil((remittancesData()?.total || 0) / pageSize())}
                onClick={() => setCurrentPage(currentPage() + 1)}
              >
                Siguiente
              </button>
            </div>
          </Show>
        </Show>
      </Show>
    </div>
    }>
      <MobileView />
    </Show>
  );
};

export default RemittanceList;