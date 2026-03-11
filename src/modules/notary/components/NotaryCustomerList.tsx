import { Component, createSignal, createMemo, For, Show, onMount } from 'solid-js';
import { Card, Button, FormInput } from '../../ui';
import { useTranslation } from '../../../translations';
import { NotaryCustomer } from '../types';
import { inventoryApi } from '../../../services/apiAdapter';
import NotaryCustomerDetail from './NotaryCustomerDetail';
import { devLog } from '../../../services/utils';

const NotaryCustomerList: Component = () => {
  const { t } = useTranslation();
  const [customers, setCustomers] = createSignal<NotaryCustomer[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [searchTerm, setSearchTerm] = createSignal('');
  const [selectedCustomer, setSelectedCustomer] = createSignal<string | null>(null);
  const [showDetail, setShowDetail] = createSignal(false);
  
  // Fetch all customers
  const fetchCustomers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      /**
      // This would need to be implemented in the API adapter
      const response = await inventoryApi.getAllClientNotary();
      if (response && Array.isArray(response)) {
        setCustomers(response);
      }
       */
    } catch (err) {
      setError(t('notary.error.fetchCustomers', 'Error fetching customers'));
      devLog('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter customers based on search term
  const filteredCustomers = createMemo(() => {
    const term = searchTerm().toLowerCase();
    if (!term) return customers();
    
    return customers().filter(customer => {
      const fullName = [customer.firstName, customer.middleName, customer.lastName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      
      return (
        fullName.includes(term) ||
        customer.clientNotaryId?.toLowerCase().includes(term) ||
        customer.ss?.includes(term) ||
        customer.phoneNumber?.includes(term) ||
        customer.email?.toLowerCase().includes(term) ||
        customer.alienNumber?.includes(term) ||
        customer.passportNumber?.toLowerCase().includes(term)
      );
    });
  });

  // Format date
  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleDateString('es-ES');
  };

  // Get customer status
  const getCustomerStatus = (customer: NotaryCustomer) => {
    if (customer.hasLPR) return { text: 'LPR', color: '#28a745' };
    if (customer.isInUSA) return { text: 'En USA', color: '#17a2b8' };
    if (customer.hasI94) return { text: 'I-94', color: '#ffc107' };
    return { text: 'Otro', color: '#6c757d' };
  };

  // Handle customer selection
  const handleCustomerSelect = (customerId: string) => {
    setSelectedCustomer(customerId);
    setShowDetail(true);
  };

  onMount(() => {
    fetchCustomers();
  });

  return (
    <>
      <Show when={!showDetail()}>
        <Card>
          <div style={{ padding: '1.5rem' }}>
            <div style={{
              display: 'flex',
              'justify-content': 'space-between',
              'align-items': 'center',
              'margin-bottom': '1.5rem'
            }}>
              <h2 style={{
                'font-size': '1.5rem',
                'font-weight': '600',
                color: 'var(--text-primary)'
              }}>
                {t('notary.customerList', 'Lista de Clientes Notariales')}
              </h2>
              
              <Button 
                variant="primary" 
                size="sm"
                onClick={fetchCustomers}
              >
                🔄 {t('common.refresh', 'Actualizar')}
              </Button>
            </div>

            {/* Search Bar */}
            <div style={{ 
              display: 'grid', 
              'grid-template-columns': '1fr auto', 
              gap: '1rem',
              'margin-bottom': '1.5rem'
            }}>
              <FormInput
                type="text"
                placeholder={t('notary.searchPlaceholder', 'Buscar por nombre, ID, SSN, teléfono, email...')}
                value={searchTerm()}
                onInput={(e) => setSearchTerm(e.currentTarget.value)}
              />
              
              <div style={{ 
                'font-size': '0.875rem',
                color: 'var(--text-muted)',
                display: 'flex',
                'align-items': 'center'
              }}>
                {t('common.showing', 'Mostrando')} {filteredCustomers().length} de {customers().length}
              </div>
            </div>

            <Show when={loading()}>
              <div style={{ 
                'text-align': 'center', 
                padding: '3rem',
                color: 'var(--text-muted)'
              }}>
                <div style={{ 'font-size': '2rem', 'margin-bottom': '1rem' }}>⏳</div>
                <div>{t('common.loading', 'Cargando...')}</div>
              </div>
            </Show>

            <Show when={error()}>
              <div style={{
                padding: '1rem',
                background: 'var(--danger-light)',
                color: 'var(--danger-color)',
                'border-radius': 'var(--border-radius-sm)',
                'margin-bottom': '1rem'
              }}>
                {error()}
              </div>
            </Show>

            <Show when={!loading() && filteredCustomers().length === 0}>
              <div style={{ 
                'text-align': 'center', 
                padding: '3rem',
                color: 'var(--text-muted)'
              }}>
                <div style={{ 'font-size': '3rem', 'margin-bottom': '1rem' }}>👤</div>
                <div style={{ 'font-size': '1.125rem', 'font-weight': '500' }}>
                  {t('notary.noCustomers', 'No se encontraron clientes')}
                </div>
              </div>
            </Show>

            {/* Customer List */}
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <For each={filteredCustomers()}>
                {(customer) => {
                  const fullName = [customer.firstName, customer.middleName, customer.lastName]
                    .filter(Boolean)
                    .join(' ');
                  const status = getCustomerStatus(customer);
                  
                  return (
                    <div 
                      style={{
                        padding: '1rem',
                        background: 'var(--surface-color)',
                        border: '1px solid var(--border-color)',
                        'border-radius': 'var(--border-radius-sm)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onClick={() => handleCustomerSelect(customer.clientNotaryId!)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--gray-50)';
                        e.currentTarget.style.transform = 'translateX(5px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--surface-color)';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }}
                    >
                      <div style={{
                        display: 'grid',
                        'grid-template-columns': '1fr auto',
                        gap: '1rem',
                        'align-items': 'center'
                      }}>
                        <div>
                          <div style={{ 
                            display: 'flex',
                            'align-items': 'center',
                            gap: '1rem',
                            'margin-bottom': '0.5rem'
                          }}>
                            <span style={{ 
                              'font-size': '1.25rem',
                              'font-weight': '600',
                              color: 'var(--text-primary)'
                            }}>
                              {fullName || t('notary.unnamed', 'Sin nombre')}
                            </span>
                            <span style={{
                              display: 'inline-block',
                              padding: '0.25rem 0.75rem',
                              'border-radius': 'var(--border-radius-sm)',
                              'font-size': '0.75rem',
                              'font-weight': '500',
                              color: 'white',
                              'background-color': status.color
                            }}>
                              {status.text}
                            </span>
                          </div>
                          
                          <div style={{ 
                            display: 'grid',
                            'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '1rem',
                            'font-size': '0.875rem'
                          }}>
                            <div>
                              <span style={{ color: 'var(--text-muted)' }}>ID Cliente:</span>{' '}
                              <span style={{ 'font-weight': '500' }}>{customer.clientNotaryId || '-'}</span>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-muted)' }}>SSN:</span>{' '}
                              <span style={{ 'font-weight': '500' }}>{customer.ss || '-'}</span>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-muted)' }}>Alien #:</span>{' '}
                              <span style={{ 'font-weight': '500' }}>{customer.alienNumber || '-'}</span>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-muted)' }}>Teléfono:</span>{' '}
                              <span style={{ 'font-weight': '500' }}>{customer.phoneNumber || '-'}</span>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-muted)' }}>Email:</span>{' '}
                              <span style={{ 'font-weight': '500' }}>{customer.email || '-'}</span>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-muted)' }}>Pasaporte:</span>{' '}
                              <span style={{ 'font-weight': '500' }}>{customer.passportNumber || '-'}</span>
                            </div>
                          </div>
                          
                          <div style={{ 
                            'margin-top': '0.5rem',
                            'font-size': '0.75rem',
                            color: 'var(--text-muted)'
                          }}>
                            <span>{t('notary.field.citizenship', 'Ciudadanía')}: {customer.countryOfCitizenship || '-'}</span>
                            {' • '}
                            <span>{t('notary.field.dob', 'Nacimiento')}: {formatDate(customer.dateOfBirth)}</span>
                            {customer.currentLocation && (
                              <>
                                {' • '}
                                <span>
                                  {t('notary.field.location', 'Ubicación')}: {customer.currentLocation.state}, {customer.currentLocation.country}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        
                        <div style={{ 'text-align': 'right' }}>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCustomerSelect(customer.clientNotaryId!);
                            }}
                          >
                            {t('common.viewDetails', 'Ver Detalles')} →
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                }}
              </For>
            </div>
          </div>
        </Card>
      </Show>

      {/* Customer Detail View */}
      <Show when={showDetail()}>
        <NotaryCustomerDetail 
          customerId={selectedCustomer()!}
          onClose={() => {
            setShowDetail(false);
            setSelectedCustomer(null);
          }}
        />
      </Show>
    </>
  );
};

export default NotaryCustomerList;