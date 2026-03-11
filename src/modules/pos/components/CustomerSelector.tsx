import { Component, createSignal, Show, For, onMount } from 'solid-js';
import { Card, Button, FormInput } from '../../ui';
import { POSCustomer } from '../types/posTypes';
import Icon from '../../../components/Icon';
import SearchableShipperDropdown from '../../invoice/components/SearchableCustomerShipper';
import { useTranslation } from '../../../translations';
import { devLog } from '../../../services/utils';

interface Shipper {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phoneNumberS?: string;
  phoneNumber?: string;
  idS?: string;
  passport?: string;
  email?: string;
  dob?: string;
  fullName?: string;
  address?: string;
  addressS?: string;
}

interface CustomerSelectorProps {
  onSelect: (customer: POSCustomer) => void;
  onClose: () => void;
}

const CustomerSelector: Component<CustomerSelectorProps> = (props) => {
  const { t } = useTranslation();
  const [customers, setCustomers] = createSignal<POSCustomer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = createSignal<POSCustomer[]>([]);
  const [searchTerm, setSearchTerm] = createSignal('');
  const [loading, setLoading] = createSignal(false);
  const [showNewCustomerForm, setShowNewCustomerForm] = createSignal(false);
  const [selectedShipper, setSelectedShipper] = createSignal<Shipper | null>(null);
  
  // New customer form
  const [newCustomer, setNewCustomer] = createSignal<Partial<POSCustomer>>({});

  // Load customers from API
  const loadCustomers = async () => {
    setLoading(true);
    try {
      // Mock API call - replace with real API
      const mockCustomers: POSCustomer[] = [
        {
          id: 'cust_1',
          name: 'John Smith',
          firstName: 'John',
          lastName: 'Smith',
          phoneNumber: '+1 (555) 123-4567',
          email: 'john.smith@email.com',
          address: '123 Main St, City, State 12345',
          loyaltyId: 'LOY001',
          discountRate: 5
        },
        {
          id: 'cust_2',
          name: 'Maria Garcia',
          firstName: 'Maria',
          lastName: 'Garcia',
          phoneNumber: '+1 (555) 987-6543',
          email: 'maria.garcia@email.com',
          address: '456 Oak Ave, City, State 12345',
          loyaltyId: 'LOY002',
          discountRate: 0
        },
        {
          id: 'cust_3',
          name: 'David Wilson',
          firstName: 'David',
          lastName: 'Wilson',
          phoneNumber: '+1 (555) 456-7890',
          email: 'david.wilson@email.com',
          discountRate: 10
        }
      ];
      
      await new Promise(resolve => setTimeout(resolve, 300));
      setCustomers(mockCustomers);
      setFilteredCustomers(mockCustomers);
      
    } catch (err) {
      devLog('Error loading customers:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter customers based on search
  const filterCustomers = (search: string) => {
    if (!search.trim()) {
      setFilteredCustomers(customers());
      return;
    }

    const filtered = customers().filter(customer => 
      customer.name.toLowerCase().includes(search.toLowerCase()) ||
      customer.phoneNumber?.includes(search) ||
      customer.email?.toLowerCase().includes(search.toLowerCase()) ||
      customer.cid?.includes(search) ||
      customer.loyaltyId?.toLowerCase().includes(search.toLowerCase())
    );

    setFilteredCustomers(filtered);
  };

  // Handle search input
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    filterCustomers(value);
  };

  // Convert shipper to POS customer
  const convertShipperToPOSCustomer = (shipper: Shipper): POSCustomer => {
    return {
      id: shipper.id,
      name: shipper.name,
      firstName: shipper.firstName,
      lastName: shipper.lastName,
      phoneNumber: shipper.phoneNumberS || shipper.phoneNumber,
      email: shipper.email,
      address: shipper.addressS || shipper.address,
      cid: shipper.idS,
      loyaltyId: '',
      discountRate: 0
    };
  };

  // Handle shipper selection
  const handleShipperSelect = (shipper: Shipper | null) => {
    if (shipper) {
      const posCustomer = convertShipperToPOSCustomer(shipper);
      props.onSelect(posCustomer);
    }
  };

  // Select customer
  const selectCustomer = (customer: POSCustomer) => {
    props.onSelect(customer);
  };

  // Create new customer
  const createNewCustomer = () => {
    const customer = newCustomer();
    
    if (!customer.firstName || !customer.lastName) {
      alert('First name and last name are required');
      return;
    }

    const newCust: POSCustomer = {
      id: `cust_${Date.now()}`,
      name: `${customer.firstName} ${customer.lastName}`.trim(),
      firstName: customer.firstName,
      lastName: customer.lastName,
      phoneNumber: customer.phoneNumber || '',
      email: customer.email || '',
      address: customer.address || '',
      cid: customer.cid || '',
      loyaltyId: customer.loyaltyId || '',
      discountRate: customer.discountRate || 0
    };

    // In real app, save to API first
    props.onSelect(newCust);
  };

  // Continue without customer
  const continueWithoutCustomer = () => {
    props.onClose();
  };

  onMount(() => {
    loadCustomers();
  });

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      'align-items': 'center',
      'justify-content': 'center',
      'z-index': 1000,
      padding: '1rem'
    }}>
      <div style={{
        background: 'white',
        'border-radius': 'var(--border-radius)',
        'box-shadow': '0 4px 20px rgba(0, 0, 0, 0.2)',
        'max-width': '800px',
        width: '100%',
        'max-height': '90vh',
        overflow: 'auto'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          'border-bottom': '1px solid var(--border-color)',
          display: 'flex',
          'justify-content': 'space-between',
          'align-items': 'center'
        }}>
          <h2 style={{ margin: 0, 'font-size': '1.5rem' }}>
            {t('pos.selectCustomer', 'Seleccionar Cliente')}
          </h2>
          <button
            onClick={props.onClose}
            style={{
              background: 'none',
              border: 'none',
              'font-size': '1.5rem',
              cursor: 'pointer',
              color: 'var(--text-muted)'
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem' }}>
          <Show when={!showNewCustomerForm()} fallback={
            // New Customer Form
            <div>
              <div style={{
                display: 'flex',
                'justify-content': 'space-between',
                'align-items': 'center',
                'margin-bottom': '1.5rem'
              }}>
                <h3 style={{ margin: 0 }}>{t('pos.addNewCustomer', 'Agregar Nuevo Cliente')}</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewCustomerForm(false)}
                >
                  <Icon name="arrow-left" size="1rem" style={{ 'margin-right': '0.5rem' }} />
                  {t('pos.backToList', 'Volver a la Lista')}
                </Button>
              </div>

              <div style={{
                display: 'grid',
                'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '1rem',
                'margin-bottom': '1.5rem'
              }}>
                <FormInput
                  label={t('pos.firstName', 'Primer Nombre') + ' *'}
                  value={newCustomer().firstName || ''}
                  onChange={(value) => setNewCustomer(prev => ({ ...prev, firstName: value }))}
                  placeholder="John"
                  required
                />
                
                <FormInput
                  label={t('pos.lastName', 'Apellido') + ' *'}
                  value={newCustomer().lastName || ''}
                  onChange={(value) => setNewCustomer(prev => ({ ...prev, lastName: value }))}
                  placeholder="Smith"
                  required
                />
                
                <FormInput
                  label={t('pos.phoneNumber', 'Número de Teléfono')}
                  value={newCustomer().phoneNumber || ''}
                  onChange={(value) => setNewCustomer(prev => ({ ...prev, phoneNumber: value }))}
                  placeholder="+1 (555) 123-4567"
                />
                
                <FormInput
                  label={t('pos.email', 'Correo Electrónico')}
                  type="email"
                  value={newCustomer().email || ''}
                  onChange={(value) => setNewCustomer(prev => ({ ...prev, email: value }))}
                  placeholder="john@email.com"
                />
                
                <FormInput
                  label={t('pos.idNumber', 'Número de ID')}
                  value={newCustomer().cid || ''}
                  onChange={(value) => setNewCustomer(prev => ({ ...prev, cid: value }))}
                  placeholder="123456789"
                />
                
                <FormInput
                  label={t('pos.loyaltyId', 'ID de Lealtad')}
                  value={newCustomer().loyaltyId || ''}
                  onChange={(value) => setNewCustomer(prev => ({ ...prev, loyaltyId: value }))}
                  placeholder="LOY001"
                />
              </div>

              <FormInput
                label={t('pos.address', 'Dirección')}
                value={newCustomer().address || ''}
                onChange={(value) => setNewCustomer(prev => ({ ...prev, address: value }))}
                placeholder="123 Main St, City, State 12345"
                style={{ 'margin-bottom': '1.5rem' }}
              />

              <div style={{ display: 'flex', gap: '1rem', 'justify-content': 'flex-end' }}>
                <Button
                  variant="outline"
                  onClick={() => setShowNewCustomerForm(false)}
                >
                  {t('pos.cancel', 'Cancelar')}
                </Button>
                <Button
                  variant="primary"
                  onClick={createNewCustomer}
                >
                  {t('pos.createCustomer', 'Crear Cliente')}
                </Button>
              </div>
            </div>
          }>
            {/* Customer Search and List */}
            <div>
              {/* Search Options */}
              <div style={{
                display: 'flex',
                'flex-direction': 'column',
                gap: '1rem',
                'margin-bottom': '1.5rem'
              }}>
                {/* Shipper Search */}
                <div>
                  <label style={{
                    display: 'block',
                    'font-weight': '600',
                    'margin-bottom': '0.5rem',
                    'font-size': '0.875rem'
                  }}>
                    {t('pos.searchExistingCustomers', 'Buscar Clientes/Transportistas Existentes:')}
                  </label>
                  <SearchableShipperDropdown
                    value={selectedShipper()}
                    onChange={handleShipperSelect}
                    placeholder="Search by name, phone, ID, or scan barcode..."
                    label=""
                  />
                </div>

                {/* Manual Search */}
                <div style={{
                  display: 'flex',
                  gap: '1rem',
                  'align-items': 'end'
                }}>
                  <div style={{ 'flex-grow': 1 }}>
                    <label style={{
                      display: 'block',
                      'font-weight': '600',
                      'margin-bottom': '0.5rem',
                      'font-size': '0.875rem'
                    }}>
                      {t('pos.searchLocalCustomers', 'O Buscar Clientes Locales:')}
                    </label>
                    <FormInput
                      placeholder="Search local customers by name, phone, email, ID..."
                      value={searchTerm()}
                      onChange={handleSearch}
                      icon="search"
                    />
                  </div>
                  <Button
                    variant="primary"
                    onClick={() => setShowNewCustomerForm(true)}
                  >
                    <Icon name="plus" size="1rem" style={{ 'margin-right': '0.5rem' }} />
                    {t('pos.newCustomer', 'Nuevo Cliente')}
                  </Button>
                </div>
              </div>

              {/* Customer List */}
              <Show when={!loading()} fallback={
                <div style={{
                  padding: '2rem',
                  'text-align': 'center',
                  color: 'var(--text-muted)'
                }}>
                  <Icon name="loading" size="2rem" style={{ 'margin-bottom': '1rem' }} />
                  <p>{t('pos.loadingCustomers', 'Cargando clientes...')}</p>
                </div>
              }>
                <Show when={filteredCustomers().length > 0} fallback={
                  <div style={{
                    padding: '2rem',
                    'text-align': 'center',
                    color: 'var(--text-muted)'
                  }}>
                    <Icon name="user" size="3rem" style={{ 
                      'margin-bottom': '1rem', 
                      opacity: '0.3' 
                    }} />
                    <h4>{t('pos.noCustomersFound', 'No se encontraron clientes')}</h4>
                    <p>{t('pos.tryAdjustingSearch', 'Intente ajustar su búsqueda o crear un nuevo cliente')}</p>
                  </div>
                }>
                  <div style={{
                    display: 'flex',
                    'flex-direction': 'column',
                    gap: '0.5rem',
                    'max-height': '400px',
                    overflow: 'auto'
                  }}>
                    <For each={filteredCustomers()}>
                      {(customer) => (
                        <Card
                          hoverable
                          onClick={() => selectCustomer(customer)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div style={{ padding: '1rem' }}>
                            <div style={{
                              display: 'flex',
                              'justify-content': 'space-between',
                              'align-items': 'flex-start',
                              'margin-bottom': '0.5rem'
                            }}>
                              <div>
                                <h4 style={{
                                  margin: '0 0 0.25rem 0',
                                  'font-size': '1rem',
                                  'font-weight': '600'
                                }}>
                                  {customer.name}
                                </h4>
                                <Show when={customer.phoneNumber}>
                                  <p style={{
                                    margin: '0 0 0.25rem 0',
                                    'font-size': '0.875rem',
                                    color: 'var(--text-muted)'
                                  }}>
                                    <Icon name="phone" size="0.875rem" style={{ 'margin-right': '0.25rem' }} />{customer.phoneNumber}
                                  </p>
                                </Show>
                                <Show when={customer.email}>
                                  <p style={{
                                    margin: '0',
                                    'font-size': '0.875rem',
                                    color: 'var(--text-muted)'
                                  }}>
                                    <Icon name="email" size="0.875rem" style={{ 'margin-right': '0.25rem' }} />{customer.email}
                                  </p>
                                </Show>
                              </div>
                              
                              <div style={{ 'text-align': 'right' }}>
                                <Show when={customer.loyaltyId}>
                                  <span style={{
                                    'font-size': '0.75rem',
                                    padding: '0.25rem 0.5rem',
                                    background: 'var(--primary-light)',
                                    color: 'var(--primary-dark)',
                                    'border-radius': 'var(--border-radius-sm)',
                                    'font-weight': '500'
                                  }}>
                                    {customer.loyaltyId}
                                  </span>
                                </Show>
                                <Show when={customer.discountRate && customer.discountRate > 0}>
                                  <div style={{
                                    'font-size': '0.75rem',
                                    'margin-top': '0.25rem',
                                    color: 'var(--success-color)',
                                    'font-weight': '600'
                                  }}>
                                    {customer.discountRate}% {t('pos.discount', 'Descuento')}
                                  </div>
                                </Show>
                              </div>
                            </div>
                            
                            <Show when={customer.address}>
                              <p style={{
                                margin: '0',
                                'font-size': '0.8rem',
                                color: 'var(--text-muted)',
                                'line-height': '1.3'
                              }}>
                                <Icon name="location" size="0.875rem" style={{ 'margin-right': '0.25rem' }} />{customer.address}
                              </p>
                            </Show>
                          </div>
                        </Card>
                      )}
                    </For>
                  </div>
                </Show>
              </Show>
            </div>
          </Show>
        </div>

        {/* Footer */}
        <Show when={!showNewCustomerForm()}>
          <div style={{
            padding: '1rem 1.5rem',
            'border-top': '1px solid var(--border-color)',
            display: 'flex',
            'justify-content': 'space-between',
            'align-items': 'center'
          }}>
            <span style={{ 
              'font-size': '0.875rem', 
              color: 'var(--text-muted)' 
            }}>
              {filteredCustomers().length} {t('pos.customersFound', 'clientes encontrados')}
            </span>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Button
                variant="outline"
                onClick={continueWithoutCustomer}
              >
                {t('pos.continueWithoutCustomer', 'Continuar Sin Cliente')}
              </Button>
              <Button
                variant="outline"
                onClick={props.onClose}
              >
                {t('pos.cancel', 'Cancelar')}
              </Button>
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
};

export default CustomerSelector;