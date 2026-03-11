import { Component, createSignal, createMemo, For, Show, onMount } from 'solid-js';
import { invoiceStore } from '../stores/invoiceStore';
import { useTranslation } from '../../../translations';
import { inventoryApi } from '../../../services/apiAdapter';
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

interface SearchableShipperDropdownProps {
  value: Shipper | null;
  onChange: (customer: Shipper | null) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  style?: Record<string, string | number>;
  label?: string;
  description?: string;
  address?: string;
}

const SearchableShipperDropdown: Component<SearchableShipperDropdownProps> = (props) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = createSignal(false);
  const [searchTerm, setSearchTerm] = createSignal('');
  const [focusedIndex, setFocusedIndex] = createSignal(-1);
  const [loading, setLoading] = createSignal(false);
  const [customers, setShippers] = createSignal<Shipper[]>([]);
  const [searchTimeout, setSearchTimeout] = createSignal<number | null>(null);
  const [scannerMode, setScannerMode] = createSignal(false);
  const [scannedCode, setScannedCode] = createSignal('');

  // Extract customers from existing invoices
  const searchDelay =  600;

  const extractShippersFromInvoices = () => {
    const invoices = invoiceStore.state.invoices || [];
    const customerMap = new Map<string, Shipper>();

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
  const searchShippers = async (query: string) => {
    if (!query.trim() || query.trim().length <6) {
      setShippers([]);
      return;
    }

    try {
      setLoading(true);
      
      // Search via API
     
      const results = await inventoryApi.getShipper(query);
      
      // Convert API results to Product format

      const ship: Shipper[] = Object.values(results).map(item => ({
        id: item.shipperId,
        name: item.name ,
        dob: item.dob,
        phoneNumberS: item.phoneNumber,
        idS: item.cid,
        street: item.street
      }));
      
     
      setShippers(ship);
    } catch (err) {
      devLog('API search failed, falling back to local search:', err);
     
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
        searchShippers(code);
        setIsOpen(true);
        setFocusedIndex(-1);
      }, 300);
      
      setSearchTimeout(timeoutId as any);
    } else if (code.length === 0) {
      // Clear results when input is empty
      setShippers([]);
      setIsOpen(false);
    }
  };

  // Toggle between scanner and manual mode
  const toggleScannerMode = () => {
    setScannerMode(!scannerMode());
    setScannedCode('');
    setSearchTerm('');
    setIsOpen(false);
    setShippers([]);
    if (searchTimeout()) {
      clearTimeout(searchTimeout());
      setSearchTimeout(null);
    }
  };

  // Clear scanner input
  const clearScannerInput = () => {
    setScannedCode('');
    setIsOpen(false);
    setShippers([]);
    
    if (searchTimeout()) {
      clearTimeout(searchTimeout());
      setSearchTimeout(null);
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
      searchShippers(query);
    }, searchDelay);
    
    setSearchTimeout(timeoutId as any);
  };


  // Search customers with debounce
  const searchShippers2 = async (query: string) => {
    if (!query.trim()) {
      setShippers(extractShippersFromInvoices().slice(0, 10));
      return;
    }

    setLoading(true);
    try {
      // Get customers from existing invoices
      const allShippers = extractShippersFromInvoices();
      
      // Filter customers based on search term
      const filtered = allShippers.filter(customer => 
        customer.name.toLowerCase().includes(query.toLowerCase()) ||
        customer.firstName?.toLowerCase().includes(query.toLowerCase()) ||
        customer.lastName?.toLowerCase().includes(query.toLowerCase()) ||
        customer.phoneNumber?.includes(query) ||
        customer.idS?.toLowerCase().includes(query.toLowerCase()) ||
        customer.passport?.toLowerCase().includes(query.toLowerCase()) ||
        customer.email?.toLowerCase().includes(query.toLowerCase())
      );

      setShippers(filtered.slice(0, 20));
    } catch (error) {
      devLog('Error searching customers:', error);
      setShippers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputClick = () => {
    setIsOpen(true);
    setSearchTerm('');
    setFocusedIndex(-1);
    
    // Load initial customers
    if (!searchTerm()) {
      searchShippers('');
    }
  };




  const handleShipperSelect = (customer: Shipper) => {
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
    const shipperList = customers();
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => Math.min(prev + 1, shipperList.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex() >= 0 && shipperList[focusedIndex()]) {
          handleShipperSelect(shipperList[focusedIndex()]);
        }
        if( scannerMode()){
          handleScanValue() ;
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
      return searchTerm();
    }
    if (props.value) {
      return props.value.name;
    }
    return '';
  };

  // Load customers on mount
  onMount(() => {
    searchShippers('');
    
    return () => {
      if (searchTimeout()) {
        clearTimeout(searchTimeout());
      }
    };
  });



const handleScanValue = () => {
  let txt = searchTerm() ;
  let gg = parseDriverLicenseWNL(txt)

  if(gg?.firstName){

    let yyyy = gg.dob.slice(4,8);
    let mm = gg.dob.slice(0,2);
    let dd = gg.dob.slice(2,4);
    
    let dob = `${yyyy}-${mm}-${dd}`
    const ship: Shipper ={
      
        id: gg?.dlNumber?.trim(),
        name: `${gg.firstName} ${gg.lastName} `,
        dob,
        phoneNumberS: "",
        idS: gg.dlNumber?.trim(),
        addressS: `${gg.address}, ${gg.city}, ${gg.state} ${gg.zipCode}`
      };

      handleShipperSelect( ship);
  }
  
  
}

   

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

  const loadingStyle = {
    padding: '1rem',
    'text-align': 'center',
    color: 'var(--text-muted)',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    gap: '0.5rem'
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
          <span>Modo Escáner Activado: Escanee código de barras del ID del remitente</span>
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
          onBlur={scannerMode() ? handleLopValue : handleBlur}
          placeholder={scannerMode() ? 
            'Escanee código de barras del ID del remitente o escriba cédula (11 dígitos)...' : 
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
                    t('customer.noShippersFound', 'No se encontraron clientes. Puede crear un nuevo cliente llenando el formulario.') :
                    t('customer.noShippersAvailable', 'No se encontraron clientes previos. Se creará un nuevo cliente.')}
                </div>
              )
            }
          >
            <For each={customers()}>

              {(customer, index) => (
                <div
                  style={itemStyle(index() === focusedIndex())}
                  onClick={() => handleShipperSelect(customer)}
                  onMouseEnter={() => setFocusedIndex(index())}
                >
                  <div style={customerInfoStyle}>
                    <div style={customerDetailsStyle}>
                      <div style={customerNameStyle}>
                        👤 {customer.name}
                      </div>
                      <div style={customerMetaStyle}>
                        <Show when={customer.phoneNumberS}>
                          <span>📞 {customer.phoneNumberS}</span>
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

export default SearchableShipperDropdown;








const DLAbbrDes2Save: any = {
  'DBA': 'expirationDate',
  'DCS': 'lastName',
  'DAC': 'firstName',
  'DAD': 'middleName',
  'DBD': 'issueDate',
  'DBB': 'dob',
  'DBC': 'gender',
  'DAY': 'eyesColor',
  'DAU': 'height',
  'DAG': 'address',
  'DAI': 'city',
  'DAJ': 'state',
  'DAK': 'zipCode',
  'DAQ': 'dlNumber',
  'DCF': 'documentDiscriminator',
  'DCG': 'issueCountry',
  'DAZ': 'hairColor',
  'DCI': 'placeOfBirth',
}


const DLAbbrDesMap:  any = {
  'DDE': "Indicator that the last name is truncated",
  "DDF":"Indicator that the first name is truncated",
  "DCD":"Additional privileges granted to the cardholder (e.g., transportation of hazardous material",
  "DDG":"Indicator that the middle name(s) are truncated",
  'DDA': 'Compliance Type',
  'DDB': 'Card Revision Date',
  'DCA': 'Jurisdiction-specific vehicle class',
  'DBA': 'Expiry Date',
  'DCS': 'lastName',
  'DAC': 'firstName',
  'DBD': 'issueDate',
  'DBB': 'birthDate',
  'DBC': 'gender',
  'DAY': 'eyeColor',
  'DAU': 'height',
  'DAG': 'street',
  'DAI': 'city',
  'DAJ': 'state',
  'DAK': 'zipCode',
  'DAQ': 'licenseNumber',
  'DCF': 'Document Discriminator',
  'DCG': 'issueCountry',
  'DAH': 'Street 2',
  'DAZ': 'hairColor',
  'DCI': 'placeOfBirth',
  'DCJ': 'Audit information',
  'DCK': 'Inventory Control Number',
  'DBN': 'Alias / AKA Family Name',
  'DBG': 'Alias / AKA Given Name',
  'DBS': 'Alias / AKA Suffix Name',
  'DCU': 'Name Suffix',
  'DCE': 'Physical Description Weight Range',
  'DCL': 'Race / Ethnicity',
  'DCM': 'Standard vehicle classification',
  'DCN': 'Standard endorsement code',
  'DCO': 'Standard restriction code',
  'DCP': 'Jurisdiction-specific vehicle classification description',
  'DCQ': 'Jurisdiction-specific endorsement code description',
  'DCR': 'Jurisdiction-specific restriction code description',
  
  'DDC': 'HazMat Endorsement Expiration Date',
  'DDD': 'Limited Duration Document Indicator',
  'DAW': 'Weight(pounds)',
  'DAX': 'Weight(kilograms)',
  'DDH': 'Under 18 Until',
  'DDI': 'Under 19 Until',
  'DDJ': 'Under 21 Until',
  'DDK': 'Organ Donor Indicator',
  'DDL': 'Veteran Indicator',
  'DAD': 'middleName',

  
};

export var parseDriverLicense = (txt: string) => {
  
  let lines = txt.split('\n');
  let abbrs = Object.keys(DLAbbrDesMap);
  let map:any = {};
  
  lines.forEach((line, i) => {
      let abbr;
      let content;
      if(i === 1){
          abbr = 'DAQ';
          content = line.substring(line.indexOf(abbr) + 3);
      }else{
          abbr = line.substring(0, 3);
          content = line.substring(3).trim();
      } 
      if(abbrs.includes(abbr)){
          map[abbr] = {
              description: DLAbbrDesMap[abbr],
              content: content
          };
      }
  });
  return map;
};


export const parseDriverLicenseWNL =( txt: string) => {
  
  let abbrs = Object.keys(DLAbbrDesMap);
  let map: any = {};
  abbrs.forEach((codeId, i) => {
    if(txt.indexOf(codeId)>=0){
     
      let spl = txt.split(codeId);
      if(spl.length===2){
        txt =  spl.join("*!*!*"+codeId);
      }
    }
  })
  let lines = txt.split("*!*!*");
  lines.forEach((line, i) => {
    let abbr;
    let content;
    if(i === 1){
        abbr = 'DAQ';
        content = line.substring(line.indexOf(abbr) + 3);
    }else{
        abbr = line.substring(0, 3);
        content = line.substring(3).trim();
    } 
    if(Object.keys(DLAbbrDes2Save).includes(abbr)){
        map[DLAbbrDes2Save[abbr]] = content
    }
});
return map;
};





`@
ANSI 636046090002DL00410266ZK03070009DLDAQD16841028
DCSDE LA CRUZ LORES
DDEN
DACHAROLD
DDFN
DADNONE
DDGN
DCAD
DCBNONE
DCDNONE
DBD04212025
DBB08041982
DBA09042026
DBC1
DAU070 IN
DAYBRO
DAG212 LINDA DR
DAIFAIRDALE
DAJKY
DAK401180000  
DCF2025042114373635 01111
DCGUSA
DCK0460103107825106
DDAF
DDB08312018
ZKZKADUP`