import { Component, createSignal, createMemo, For, Show } from 'solid-js';
import { inventoryStore, Location } from '../stores/inventoryStore';
import { useTranslation } from '../../../translations';
import { authStore } from '../../../stores/authStore';

interface SearchableLocationDropdownProps {
  isOpen?: (show: boolean) => void; // Callback to open add location modal
  value: string;
  onChange: (locationId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  style?: Record<string, string | number>;
  onAddNew?: () => void; // Callback to open add location modal
  filterType?: 'warehouse' | 'store' | 'supplier' | 'customer'; // Filter by location type
}

const SearchableLocationDropdown: Component<SearchableLocationDropdownProps> = (props) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = createSignal(false);
  const [searchTerm, setSearchTerm] = createSignal('');
  const [focusedIndex, setFocusedIndex] = createSignal(-1);





  const selectedLocation = createMemo(() => {
    if (!props.value) return null;
    return inventoryStore.getLocationById(props.value);
  });

  const filteredLocations = () => {
    let locations = authStore?.stores;
    
    // Filter by type if specified
    if (props.filterType) {
      locations = locations.filter(location => location.type === props.filterType);
    }
    
    const term = searchTerm().toLowerCase();
    if (!term) return locations;


    
    return locations.filter(location => 
      location.name.toLowerCase().includes(term) ||
      location?.code?.toLowerCase().includes(term) ||
      location?.type?.toLowerCase().includes(term) ||
      location?.address?.toLowerCase().includes(term)
    );
  };


  const handleShow = (v:boolean) => {
    setIsOpen(v);
    if(props?.isOpen){
        props?.isOpen(v);
    }
  };

  const handleInputClick = () => {
    handleShow(true);

    setSearchTerm('');
    setFocusedIndex(-1);
  };

  const handleInputChange = (e: Event) => {
    const target = e.target as HTMLInputElement;

  
    setSearchTerm(target.value);
    handleShow(true);
    setFocusedIndex(-1);
  };

  const handleLocationSelect = (location: Location) => {
    props?.onChange(location.id);
    handleShow(false);
    setSearchTerm('');
    setFocusedIndex(-1);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    const locations = filteredLocations();
    
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => Math.min(prev + 1, locations.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex() >= 0 && locations[focusedIndex()]) {
          handleLocationSelect(locations[focusedIndex()]);
        }
        break;
      case 'Escape':
        handleShow(false);
        setSearchTerm('');
        setFocusedIndex(-1);
        break;
    }
  };

  const handleBlur = (e: FocusEvent) => {
    // Delay closing to allow clicks on dropdown items
    setTimeout(() => {
      handleShow(false);
      setSearchTerm('');
      setFocusedIndex(-1);
    }, 150);
  };

  const getLocationTypeIcon = (type: string) => {
    const icons = {
      'warehouse': '🏭',
      'store': '🏪',
      'supplier': '🚚',
      'customer': '👥'
    };
    return icons[type as keyof typeof icons] || '📍';
  };

  const getLocationTypeColor = (type: string) => {
    const colors = {
      'warehouse': '#2196F3',
      'store': '#4CAF50',
      'supplier': '#FF9800',
      'customer': '#9C27B0'
    };
    return colors[type as keyof typeof colors] || '#757575';
  };

  // Styles
  const containerStyle = {
    position: 'relative' as const,
    width: '100%',
    ...props.style
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

  const inputContainerStyle = {
    display: 'flex',
    'align-items': 'stretch',
    width: '100%'
  };

  const addButtonStyle = {
    padding: '0.75rem',
    border: '1px solid var(--border-color)',
    'border-left': 'none',
    'border-radius': '0 var(--border-radius-sm) var(--border-radius-sm) 0',
    background: 'var(--surface-color)',
    cursor: 'pointer',
    color: 'var(--primary-color)',
    'font-weight': '600',
    'font-size': '1rem',
    transition: 'all 0.2s ease',
    'min-width': '40px',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center'
  };

  const inputWithButtonStyle = {
    ...inputStyle,
    'border-radius': props.onAddNew ? 'var(--border-radius-sm) 0 0 var(--border-radius-sm)' : 'var(--border-radius-sm)',
    'border-right': props.onAddNew ? 'none' : '1px solid var(--border-color)'
  };

  const dropdownStyle = {
    position: 'absolute' as const,
    top: '100%',
    left: '0',
    right: '0',
    'z-index': '9000',
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
    color: isHighlighted ? 'var(--primary-dark)' : 'var(--text-primary)',
    transition: 'all 0.2s ease'
  });

  const locationInfoStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center'
  };

  const locationDetailsStyle = {
    flex: '1'
  };

  const locationNameStyle = {
    'font-weight': '500',
    'margin-bottom': '0.25rem'
  };

  const locationMetaStyle = {
    'font-size': '0.875rem',
    color: 'var(--text-muted)',
    display: 'flex',
    gap: '0.5rem',
    'align-items': 'center'
  };

  const typeIndicatorStyle = (type: string) => ({
    padding: '0.2rem 0.5rem',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '0.7rem',
    'font-weight': '500',
    background: getLocationTypeColor(type),
    color: 'white',
    'text-transform': 'uppercase'
  });

  const emptyStateStyle = {
    padding: '1rem',
    'text-align': 'center',
    color: 'var(--text-muted)',
    'font-style': 'italic'
  };

  const displayValue = () => {
    if (isOpen() && searchTerm()) {
      return searchTerm();
    }
    if (selectedLocation()) {
      return `${selectedLocation()!.name} (${selectedLocation()!.code})`;
    }
    return '';
  };

  return (
    <div style={containerStyle}>
      <div style={inputContainerStyle}>
        <input
          type="text"
          style={inputWithButtonStyle}
          value={displayValue()}
          onInput={handleInputChange}
          onClick={handleInputClick}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={props.placeholder || t('inventory.searchLocations', 'Search locations by name, code, or type...')}
          disabled={props.disabled}
          required={props.required}
          autocomplete="off"
        />
        {props.onAddNew && (
          <button
            type="button"
            style={addButtonStyle}
            onClick={props.onAddNew}
            title={t('inventory.addLocation', 'Add new location')}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--primary-color)';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--surface-color)';
              e.currentTarget.style.color = 'var(--primary-color)';
            }}
          >
            +
          </button>
        )}
      </div>
      
      <Show when={isOpen()}>
        <div style={dropdownStyle}>
          <Show 
            when={filteredLocations().length > 0}
            fallback={
              <div style={emptyStateStyle}>
                {searchTerm() ? t('inventory.noLocationsFound', 'No locations found matching your search.') : t('inventory.noLocationsAvailable', 'No locations available.')}
              </div>
            }
          >
            <For each={filteredLocations()}>
              {(location, index) => (
                <div
                  style={itemStyle(index() === focusedIndex())}
                  onClick={() => handleLocationSelect(location)}
                  onMouseEnter={() => setFocusedIndex(index())}
                >
                  <div style={locationInfoStyle}>
                    <div style={locationDetailsStyle}>
                      <div style={locationNameStyle}>
                        {getLocationTypeIcon(location.type)} {location.name}
                      </div>
                      <div style={locationMetaStyle}>
                        <span>{t('inventory.locationCode', 'Code')}: {location.code}</span>
                        <span style={typeIndicatorStyle(location.type)}>
                          {location.type}
                        </span>
                      </div>
                      <div style={{ 
                        'font-size': '0.75rem', 
                        color: 'var(--text-muted)',
                        'margin-top': '0.25rem'
                      }}>
                        {location.address}
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

export default SearchableLocationDropdown;