import { Component, createSignal, createMemo, For, Show, onMount } from 'solid-js';
import { Card, Button, FormInput } from '../../ui';
import { useTranslation } from '../../../translations';
import { 
  PurchaseRequest, 
  PurchaseRequestFilter, 
  PurchaseRequestStatus,
  PURCHASE_REQUEST_STATUSES,
  PLATFORMS 
} from '../types/purchaseRequestTypes';

interface PurchaseRequestListProps {
  requests: PurchaseRequest[];
  onFilterChange?: (filteredRequests: PurchaseRequest[]) => void;
  onRequestSelect?: (request: PurchaseRequest) => void;
  onRequestUpdate?: (id: string, updates: any) => void;
}

const PurchaseRequestList: Component<PurchaseRequestListProps> = (props) => {
  const { t } = useTranslation();
  
  const [searchTerm, setSearchTerm] = createSignal('');
  const [statusFilter, setStatusFilter] = createSignal<string>('all');
  const [platformFilter, setPlatformFilter] = createSignal<string>('all');
  const [paidFilter, setPaidFilter] = createSignal<string>('all');
  const [dateRange, setDateRange] = createSignal({ start: '', end: '' });
  const [showAdvancedFilters, setShowAdvancedFilters] = createSignal(false);
  
  const filteredRequests = createMemo(() => {
    let filtered = props.requests;
    
    // Search filter
    if (searchTerm()) {
      const term = searchTerm().toLowerCase();
      filtered = filtered.filter(request => 
        request.requestNumber.toLowerCase().includes(term) ||
        request.customerName.toLowerCase().includes(term) ||
        request.customerPhone.toLowerCase().includes(term) ||
        request.itemTitle.toLowerCase().includes(term) ||
        request.itemUrl.toLowerCase().includes(term)
      );
    }
    
    // Status filter
    if (statusFilter() !== 'all') {
      filtered = filtered.filter(request => request.status === statusFilter());
    }
    
    // Platform filter
    if (platformFilter() !== 'all') {
      filtered = filtered.filter(request => request.platform === platformFilter());
    }
    
    // Paid filter
    if (paidFilter() !== 'all') {
      filtered = filtered.filter(request => 
        paidFilter() === 'paid' ? request.paid : !request.paid
      );
    }
    
    // Date range filter
    if (dateRange().start || dateRange().end) {
      filtered = filtered.filter(request => {
        const requestDate = new Date(request.requestDate);
        const startDate = dateRange().start ? new Date(dateRange().start) : new Date('1900-01-01');
        const endDate = dateRange().end ? new Date(dateRange().end) : new Date('2100-12-31');
        return requestDate >= startDate && requestDate <= endDate;
      });
    }
    
    // Sort by date (newest first)
    filtered = filtered.sort((a, b) => 
      new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime()
    );
    
    // Notify parent component
    props.onFilterChange?.(filtered);
    
    return filtered;
  });
  
  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPlatformFilter('all');
    setPaidFilter('all');
    setDateRange({ start: '', end: '' });
  };
  
  const getStatusColor = (status: PurchaseRequestStatus) => {
    const statusConfig = PURCHASE_REQUEST_STATUSES.find(s => s.value === status);
    return statusConfig?.color || '#6c757d';
  };
  
  const getPlatformColor = (platform: string) => {
    const platformConfig = PLATFORMS.find(p => p.value === platform);
    return platformConfig?.color || '#6c757d';
  };
  
  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div>
      <Card>
        <div style={{ padding: '1rem' }}>
          {/* Search and main filters */}
          <div style={{ 
            display: 'grid', 
            'grid-template-columns': '1fr auto', 
            gap: '1rem',
            'margin-bottom': '1rem'
          }}>
            <FormInput
              type="text"
              placeholder="Buscar por número, cliente, teléfono, artículo..."
              value={searchTerm()}
              onInput={(e) => setSearchTerm(e.currentTarget.value)}
            />
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters())}
              >
                {showAdvancedFilters() ? 'Ocultar Filtros' : 'Mostrar Filtros'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
              >
                Limpiar Filtros
              </Button>
            </div>
          </div>
          
          {/* Advanced filters */}
          <Show when={showAdvancedFilters()}>
            <div style={{
              display: 'grid',
              'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              'margin-bottom': '1rem',
              padding: '1rem',
              background: 'var(--background-color)',
              'border-radius': 'var(--border-radius-sm)'
            }}>
              {/* Status Filter */}
              <div>
                <label style={{ 
                  display: 'block', 
                  'margin-bottom': '0.25rem',
                  'font-size': '0.875rem',
                  color: 'var(--text-muted)'
                }}>
                  Estado
                </label>
                <select
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid var(--border-color)',
                    'border-radius': 'var(--border-radius-sm)',
                    background: 'var(--surface-color)'
                  }}
                  value={statusFilter()}
                  onChange={(e) => setStatusFilter(e.currentTarget.value)}
                >
                  <option value="all">Todos</option>
                  <For each={PURCHASE_REQUEST_STATUSES}>
                    {(status) => <option value={status.value}>{status.label}</option>}
                  </For>
                </select>
              </div>
              
              {/* Platform Filter */}
              <div>
                <label style={{ 
                  display: 'block', 
                  'margin-bottom': '0.25rem',
                  'font-size': '0.875rem',
                  color: 'var(--text-muted)'
                }}>
                  Plataforma
                </label>
                <select
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid var(--border-color)',
                    'border-radius': 'var(--border-radius-sm)',
                    background: 'var(--surface-color)'
                  }}
                  value={platformFilter()}
                  onChange={(e) => setPlatformFilter(e.currentTarget.value)}
                >
                  <option value="all">Todas</option>
                  <For each={PLATFORMS}>
                    {(platform) => <option value={platform.value}>{platform.label}</option>}
                  </For>
                </select>
              </div>
              
              {/* Paid Filter */}
              <div>
                <label style={{ 
                  display: 'block', 
                  'margin-bottom': '0.25rem',
                  'font-size': '0.875rem',
                  color: 'var(--text-muted)'
                }}>
                  Pago
                </label>
                <select
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid var(--border-color)',
                    'border-radius': 'var(--border-radius-sm)',
                    background: 'var(--surface-color)'
                  }}
                  value={paidFilter()}
                  onChange={(e) => setPaidFilter(e.currentTarget.value)}
                >
                  <option value="all">Todos</option>
                  <option value="paid">Pagados</option>
                  <option value="unpaid">Sin Pagar</option>
                </select>
              </div>
              
              {/* Date From */}
              <div>
                <label style={{ 
                  display: 'block', 
                  'margin-bottom': '0.25rem',
                  'font-size': '0.875rem',
                  color: 'var(--text-muted)'
                }}>
                  Fecha Desde
                </label>
                <FormInput
                  type="date"
                  value={dateRange().start}
                  onInput={(e) => setDateRange({ ...dateRange(), start: e.currentTarget.value })}
                />
              </div>
              
              {/* Date To */}
              <div>
                <label style={{ 
                  display: 'block', 
                  'margin-bottom': '0.25rem',
                  'font-size': '0.875rem',
                  color: 'var(--text-muted)'
                }}>
                  Fecha Hasta
                </label>
                <FormInput
                  type="date"
                  value={dateRange().end}
                  onInput={(e) => setDateRange({ ...dateRange(), end: e.currentTarget.value })}
                />
              </div>
            </div>
          </Show>
          
          {/* Results count */}
          <div style={{ 
            display: 'flex', 
            'justify-content': 'space-between',
            'align-items': 'center',
            'margin-bottom': '1rem'
          }}>
            <div style={{ 
              'font-size': '0.875rem',
              color: 'var(--text-muted)'
            }}>
              Mostrando {filteredRequests().length} de {props.requests.length} solicitudes
            </div>
          </div>
        </div>
      </Card>
      
      {/* Request List */}
      <div style={{ 'margin-top': '1rem' }}>
        <For each={filteredRequests()}>
          {(request) => (
            <Card style={{ 'margin-bottom': '0.5rem' }}>
              <div 
                style={{ 
                  padding: '1rem',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onClick={() => props.onRequestSelect?.(request)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--strip-color)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div style={{ 
                  display: 'grid',
                  'grid-template-columns': '150px 1fr auto',
                  gap: '1rem',
                  'align-items': 'center'
                }}>
                  {/* Request Info */}
                  <div>
                    <div style={{ 
                      'font-weight': '600',
                      color: 'var(--primary-color)'
                    }}>
                      {request.requestNumber}
                    </div>
                    <div style={{ 
                      'font-size': '0.75rem',
                      color: 'var(--text-muted)'
                    }}>
                      {formatDate(request.requestDate)}
                    </div>
                  </div>
                  
                  {/* Customer & Item Info */}
                  <div style={{ 
                    display: 'grid',
                    'grid-template-columns': '1fr 1fr',
                    gap: '1rem'
                  }}>
                    <div>
                      <div style={{ 
                        'font-size': '0.75rem',
                        color: 'var(--text-muted)'
                      }}>
                        Cliente
                      </div>
                      <div style={{ 'font-weight': '500' }}>{request.customerName}</div>
                      <div style={{ 
                        'font-size': '0.75rem',
                        color: 'var(--text-muted)'
                      }}>
                        {request.customerPhone}
                      </div>
                    </div>
                    <div>
                      <div style={{ 
                        'font-size': '0.75rem',
                        color: 'var(--text-muted)'
                      }}>
                        Artículo
                      </div>
                      <div style={{ 
                        'font-weight': '500',
                        'max-width': '300px',
                        overflow: 'hidden',
                        'text-overflow': 'ellipsis',
                        'white-space': 'nowrap'
                      }}>
                        {request.itemTitle}
                      </div>
                      <div style={{ 
                        'font-size': '0.75rem',
                        color: 'var(--text-muted)'
                      }}>
                        {formatCurrency(request.itemPrice, request.itemCurrency)} × {request.quantity}
                      </div>
                    </div>
                  </div>
                  
                  {/* Status & Actions */}
                  <div style={{ 'text-align': 'right' }}>
                    <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.5rem', 'align-items': 'flex-end' }}>
                      {/* Platform Badge */}
                      <div style={{
                        display: 'inline-block',
                        padding: '0.125rem 0.5rem',
                        'border-radius': 'var(--border-radius-sm)',
                        'font-size': '0.625rem',
                        'font-weight': '500',
                        color: 'white',
                        'background-color': getPlatformColor(request.platform),
                        'text-transform': 'uppercase'
                      }}>
                        {PLATFORMS.find(p => p.value === request.platform)?.label || request.platform}
                      </div>
                      
                      {/* Status Badge */}
                      <div style={{
                        display: 'inline-block',
                        padding: '0.25rem 0.75rem',
                        'border-radius': 'var(--border-radius-sm)',
                        'font-size': '0.75rem',
                        'font-weight': '500',
                        color: 'white',
                        'background-color': getStatusColor(request.status)
                      }}>
                        {PURCHASE_REQUEST_STATUSES.find(s => s.value === request.status)?.label || request.status}
                      </div>
                      
                      {/* Payment Status */}
                      <div style={{
                        display: 'inline-block',
                        padding: '0.125rem 0.5rem',
                        'border-radius': 'var(--border-radius-sm)',
                        'font-size': '0.625rem',
                        'font-weight': '500',
                        color: request.paid ? '#198754' : '#dc3545',
                        background: request.paid ? '#d1e7dd' : '#f8d7da',
                        border: `1px solid ${request.paid ? '#badbcc' : '#f5c2c7'}`
                      }}>
                        {request.paid ? '✓ PAGADO' : '✗ PENDIENTE'}
                      </div>
                    </div>
                    
                    {/* Total Cost */}
                    <div style={{ 
                      'font-size': '0.875rem',
                      'font-weight': '600',
                      'margin-top': '0.5rem'
                    }}>
                      <Show when={request.finalTotal} fallback={formatCurrency(request.totalCost, request.itemCurrency)}>
                        {formatCurrency(request.finalTotal!, request.itemCurrency)}
                      </Show>
                    </div>
                    
                    {/* Weight if available */}
                    <Show when={request.weight}>
                      <div style={{ 
                        'font-size': '0.75rem',
                        color: 'var(--text-muted)',
                        'margin-top': '0.25rem'
                      }}>
                        ⚖️ {request.weight} kg
                      </div>
                    </Show>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </For>
      </div>
    </div>
  );
};

export default PurchaseRequestList;