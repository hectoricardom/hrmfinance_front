import { Component, createSignal, createMemo, For, Show, onMount } from 'solid-js';
import { invoiceStore } from '../stores/invoiceStore';
import { useTranslation } from '../../../translations';
import { inventoryApi } from '../../../services/apiAdapter';
import { devLog } from '../../../services/utils';

interface Customer {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  cid?: string;
  passport?: string;
  email?: string;
  address?: string;
  fullName?: string;
}

interface SearchableCustomerDropdownProps {
  value: Customer | null;
  onChange: (customer: Customer | null) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  style?: Record<string, string | number>;
  label?: string;
  description?: string;
}

const SearchableCustomerDropdown: Component<SearchableCustomerDropdownProps> = (props) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = createSignal(false);
  const [searchTerm, setSearchTerm] = createSignal('');
  const [focusedIndex, setFocusedIndex] = createSignal(-1);
  const [loading, setLoading] = createSignal(false);
  const [customers, setCustomers] = createSignal<Customer[]>([]);
  const [searchTimeout, setSearchTimeout] = createSignal<number | null>(null);
  const [scannerMode, setScannerMode] = createSignal(false);
  const [scannedCode, setScannedCode] = createSignal('');

  // Extract customers from existing invoices
  const extractCustomersFromInvoices = () => {
    const invoices = invoiceStore.state.invoices || [];
    const customerMap = new Map<string, Customer>();

    invoices.forEach(invoice => {
      const consignee = invoice.shipper_consignee;
      if (consignee && consignee.name) {
        const customerId = consignee.ssg_consignee_key || consignee.cid || consignee.name;
        
        if (!customerMap.has(customerId)) {
          customerMap.set(customerId, {
            id: customerId,
            name: consignee.name,
            firstName: consignee.firstName,
            lastName: consignee.lastName,
            phoneNumber: consignee.phoneNumber,
            cid: consignee.cid,
            passport: consignee.passport,
            email: consignee.email,
            address: `${consignee.ybstreet || ''} ${consignee.ybstreetNo || ''} ${consignee.ybcity || ''}`.trim()
          });
        }
      }
    });

    return Array.from(customerMap.values());
  };




  // Search products via API with fallback to local store
  const searchCustomers = async (query: string) => {
    if (!query.trim() || query.trim().length <6) {
      setCustomers([]);
      return;
    }

    try {
      setLoading(true);
      
      // Search via API
     
      const results = await inventoryApi.getConsigee(query);
      // Convert API results to Product format
      devLog(results)
      const products: Customer[] = Object.values(results).map(item => ({
        id: item.consigneeId,
        firstName : item.firstName ,
        middleName : item.middleName ,
        fullName: item.firstName + (item.middleName?" "+item.middleName: "")+ " "+item.lastName + " "+ item.lastName2 ,
        lastName: item.lastName + " "+ item.lastName2,
        cid: item.cid,
        phoneNumber: item.phoneNumber,
        ybbetwen1: item.ybbetwen1,
        ybcity: item.ybcity,
        ybestate: item.ybestate,
        ybreparto: item.ybreparto,
        ybstreet: item.ybstreet,
        ybstreetNo: item.ybstreetNo,
        address: `Calle ${item.ybstreet}${item.ybstreetNo?" # " + item.ybstreetNo: ""}${item.ybbetwen1? " / "+item.ybbetwen1 : ""}${item.ybbetwen2?" y "+item.ybbetwen2: ""}${item.ybreparto?", Rpto "+item.ybreparto: ""}, ${item.ybcity?item.ybcity: ""}, ${item.ybestate?item.ybestate:""}`
      }));
      
      
      setCustomers(products);
    } catch (err) {
      console.warn('API search failed, falling back to local search:', err);
     
    } finally {
      setLoading(false);
    }
  };



  // Search customers with debounce
  const searchCustomers2 = async (query: string) => {
    if (!query.trim()) {
      setCustomers(extractCustomersFromInvoices().slice(0, 10));
      return;
    }

    setLoading(true);
    try {
      // Get customers from existing invoices
      const allCustomers = extractCustomersFromInvoices();
      
      // Filter customers based on search term
      const filtered = allCustomers.filter(customer => 
        customer.name.toLowerCase().includes(query.toLowerCase()) ||
        customer.firstName?.toLowerCase().includes(query.toLowerCase()) ||
        customer.lastName?.toLowerCase().includes(query.toLowerCase()) ||
        customer.phoneNumber?.includes(query) ||
        customer.cid?.toLowerCase().includes(query.toLowerCase()) ||
        customer.passport?.toLowerCase().includes(query.toLowerCase()) ||
        customer.email?.toLowerCase().includes(query.toLowerCase())
      );

      setCustomers(filtered.slice(0, 20));
    } catch (error) {
      console.error('Error searching customers:', error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle barcode scanner input
  const handleScannerInput = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const code = target.value;
    setScannedCode(code);
    
    // Cuban ID format is typically 11 digits for cédula
    // When we have a complete barcode (11+ characters), search automatically
    if (code.length >= 11) {
      // Clear existing timeout
      if (searchTimeout()) {
        clearTimeout(searchTimeout());
      }

      // Set new timeout for debounced search
      const timeoutId = setTimeout(() => {
        searchCustomers(code);
        setIsOpen(true);
        setFocusedIndex(-1);
      }, 300);
      
      setSearchTimeout(timeoutId as any);
    } else if (code.length === 0) {
      // Clear results when input is empty
      setCustomers([]);
      setIsOpen(false);
    }
  };

  // Toggle between scanner and manual mode
  const toggleScannerMode = () => {
    setScannerMode(!scannerMode());
    setScannedCode('');
    setSearchTerm('');
    setIsOpen(false);
    setCustomers([]);
    
    if (searchTimeout()) {
      clearTimeout(searchTimeout());
      setSearchTimeout(null);
    }
  };

  // Clear scanner input
  const clearScannerInput = () => {
    setScannedCode('');
    setIsOpen(false);
    setCustomers([]);
    
    if (searchTimeout()) {
      clearTimeout(searchTimeout());
      setSearchTimeout(null);
    }
  };

  const handleInputClick = () => {
    setIsOpen(true);
    setSearchTerm('');
    setFocusedIndex(-1);
    
    // Load initial customers
    if (!searchTerm()) {
      searchCustomers('');
    }
  };

  const handleInputChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const query = target.value;
    setSearchTerm(query);
    setIsOpen(true);
    setFocusedIndex(-1);

    // Clear existing timeout
    if (searchTimeout()) {
      clearTimeout(searchTimeout());
    }

    // Set new timeout for debounced search
    const timeoutId = setTimeout(() => {
      searchCustomers(query);
    }, 600);
    
    setSearchTimeout(timeoutId as any);
  };

  const handleCustomerSelect = (customer: Customer) => {
    props.onChange(customer);
    setIsOpen(false);
    setSearchTerm('');
    setFocusedIndex(-1);
    
    // Clear timeout
    if (searchTimeout()) {
      clearTimeout(searchTimeout());
      setSearchTimeout(null);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    const customerList = customers();
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => Math.min(prev + 1, customerList.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex() >= 0 && customerList[focusedIndex()]) {
          handleCustomerSelect(customerList[focusedIndex()]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        setFocusedIndex(-1);
        if (searchTimeout()) {
          clearTimeout(searchTimeout());
          setSearchTimeout(null);
        }
        break;
    }
  };

  const handleBlur = (e: FocusEvent) => {
    // Delay closing to allow clicks on dropdown items
    setTimeout(() => {
      setIsOpen(false);
      setSearchTerm('');
      setFocusedIndex(-1);
      if (searchTimeout()) {
        clearTimeout(searchTimeout());
        setSearchTimeout(null);
      }
    }, 150);
  };

  const displayValue = () => {
    if (scannerMode()) {
      return scannedCode() || '';
    }
    if (isOpen() && searchTerm()) {
      return searchTerm() || "";
    }
    if (props.value) {
      return props.value.cid || "";
    }
    return '';
  };

  // Load customers on mount
  onMount(() => {
    searchCustomers('');
    
    return () => {
      if (searchTimeout()) {
        clearTimeout(searchTimeout());
      }
    };
  });

  // Styles
  const containerStyle = {
    position: 'relative' as const,
    width: '100%',
    ...props.style
  };

  const labelStyle = {
    display: 'block',
    'font-size': '0.875rem',
    'font-weight': '500',
    color: 'var(--text-secondary)',
    'margin-bottom': '0.25rem'
  };

  const descriptionStyle = {
    'font-size': '0.75rem',
    color: 'var(--text-muted)',
    'margin-bottom': '0.5rem',
    'font-style': 'italic'
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '1rem',
    background: 'var(--surface-color)',
    cursor: props.disabled ? 'not-allowed' : 'text',
    opacity: props.disabled ? '0.6' : '1'
  };

  const dropdownStyle = {
    position: 'absolute' as const,
    top: '100%',
    left: '0',
    right: '0',
    'z-index': '1000',
    'max-height': '300px',
    'overflow-y': 'auto',
    background: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'box-shadow': '0 4px 12px rgba(0,0,0,0.15)',
    'margin-top': '2px'
  };

  const itemStyle = (isHighlighted: boolean) => ({
    padding: '0.75rem',
    cursor: 'pointer',
    'border-bottom': '1px solid var(--border-color)',
    background: isHighlighted ? 'var(--strip-color)' : 'transparent',
    color: isHighlighted ? 'var(--primary-color)' : 'var(--text-primary)',
    transition: 'all 0.2s ease'
  });

  const customerInfoStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'flex-start'
  };

  const customerDetailsStyle = {
    flex: '1'
  };

  const customerNameStyle = {
    'font-weight': '500',
    'margin-bottom': '0.25rem'
  };

  const customerMetaStyle = {
    'font-size': '0.875rem',
    color: 'var(--text-muted)',
    display: 'flex',
    'flex-direction': 'column',
    gap: '0.125rem'
  };

  const emptyStateStyle = {
    padding: '1rem',
    'text-align': 'center',
    color: 'var(--text-muted)',
    'font-style': 'italic'
  };

  const toggleButtonStyle = {
    position: 'absolute' as const,
    right: '8px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: scannerMode() ? 'var(--primary-color)' : 'var(--border-color)',
    color: scannerMode() ? 'white' : 'var(--text-muted)',
    border: 'none',
    'border-radius': '4px',
    padding: '6px 8px',
    cursor: 'pointer',
    'font-size': '12px',
    'z-index': '10',
    transition: 'all 0.2s ease'
  };

  const inputContainerStyle = {
    position: 'relative' as const,
    width: '100%'
  };

  const loadingStyle = {
    padding: '1rem',
    'text-align': 'center',
    color: 'var(--text-muted)',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    gap: '0.5rem'
  };

  return (
    <div style={containerStyle}>
      <Show when={props.label}>
        <label style={labelStyle}>{props.label}</label>
      </Show>
      
      <Show when={props.description}>
        <div style={descriptionStyle}>{props.description}</div>
      </Show>

      {/* Scanner Mode Indicator */}
      <Show when={scannerMode()}>
        <div style={{
          'margin-bottom': '0.5rem',
          padding: '0.5rem',
          'background-color': 'var(--primary-color)',
          color: 'white',
          'border-radius': '4px',
          'font-size': '0.875rem',
          display: 'flex',
          'align-items': 'center',
          gap: '0.5rem'
        }}>
          <span>📱</span>
          <span>Modo Escáner Activado: Escanee código de barras del ID cubano</span>
          <Show when={scannedCode().length > 0}>
            <button
              type="button"
              onClick={clearScannerInput}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                'border-radius': '2px',
                padding: '2px 6px',
                cursor: 'pointer',
                'font-size': '0.75rem'
              }}
            >
              ✕ Limpiar
            </button>
          </Show>
        </div>
      </Show>

      <div style={inputContainerStyle}>
        <input
          type="text"
          style={{ 
            ...inputStyle, 
            'padding-right': '80px',
            'border-color': scannerMode() ? 'var(--primary-color)' : 'var(--border-color)',
            'box-shadow': scannerMode() ? '0 0 0 3px rgba(108, 92, 231, 0.1)' : 'none'
          }}
          value={displayValue()}
          onInput={scannerMode() ? handleScannerInput : handleInputChange}
          onClick={scannerMode() ? undefined : handleInputClick}
          onKeyDown={scannerMode() ? undefined : handleKeyDown}
          onBlur={scannerMode() ? undefined : handleBlur}
          placeholder={scannerMode() ? 
            'Escanee código de barras del ID o escriba cédula (11 dígitos)...' : 
            props.placeholder || t('customer.searchPlaceholder', 'Buscar clientes por nombre, teléfono, ID...')}
          disabled={props.disabled}
          required={props.required}
          autocomplete="off"
        />
        
        <button
          type="button"
          style={toggleButtonStyle}
          onClick={toggleScannerMode}
          title={scannerMode() ? 'Cambiar a búsqueda manual' : 'Activar modo escáner'}
        >
          {scannerMode() ? '📱 Scanner' : '🔍 Manual'}
        </button>
      </div>
      
      <Show when={isOpen()}>
        <div style={dropdownStyle}>
          <Show when={loading()}>
            <div style={loadingStyle}>
              <span>🔄</span>
              <span>{t('common.searching', 'Buscando clientes...')}</span>
            </div>
          </Show>
          
          <Show 
            when={!loading() && customers().length > 0}
            fallback={
              !loading() && (
                <div style={emptyStateStyle}>
                  {searchTerm() ? 
                    t('customer.noCustomersFound', 'No se encontraron clientes. Puede crear un nuevo cliente llenando el formulario.') :
                    t('customer.noCustomersAvailable', 'No se encontraron clientes previos. Se creará un nuevo cliente.')}
                </div>
              )
            }
          >
            <For each={customers()}>
              {(customer, index) => (
                <div
                  style={itemStyle(index() === focusedIndex())}
                  onClick={() => handleCustomerSelect(customer)}
                  onMouseEnter={() => setFocusedIndex(index())}
                >
                  <div style={customerInfoStyle}>
                    <div style={customerDetailsStyle}>
                      <div style={customerNameStyle}>
                        👤 {customer.fullName}
                      </div>
                      <div style={customerMetaStyle}>
                        <Show when={customer.phoneNumber}>
                          <span>📞 {customer.phoneNumber}</span>
                        </Show>
                        <Show when={customer.cid}>
                          <span>🆔 {customer.cid}</span>
                        </Show>
                        <Show when={customer.email}>
                          <span>📧 {customer.email}</span>
                        </Show>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </For>
          </Show>
        </div>
      </Show>
    </div>
  );
};

export default SearchableCustomerDropdown;