import { Component, createSignal, For, Show, onCleanup } from 'solid-js';
import { inventoryApi } from '../../../services/apiAdapter';
import { NotaryCustomer } from '../types';
import { devLog } from '../../../services/utils';

interface CustomerSearchDropdownProps {
  value?: string;
  onChange?: (clientId: string, customerName: string) => void;
  onSelect?: (customer: NotaryCustomer) => void;
  placeholder?: string;
  label?: string;
}

const CustomerSearchDropdown: Component<CustomerSearchDropdownProps> = (props) => {
  const [searchQuery, setSearchQuery] = createSignal('');
  const [searchResults, setSearchResults] = createSignal<NotaryCustomer[]>([]);
  const [isSearching, setIsSearching] = createSignal(false);
  const [showDropdown, setShowDropdown] = createSignal(false);
  const [selectedCustomerName, setSelectedCustomerName] = createSignal('');
  let searchTimeout: number | undefined;

  // Debounced search
  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    searchTimeout = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await inventoryApi.searchClientNotary(query);
        setSearchResults(results);
        setShowDropdown(true);
      } catch (error) {
        devLog('Error searching customers:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  const handleSelect = (customer: NotaryCustomer) => {
    const customerName = `${customer.firstName} ${customer.lastName}`;
    setSelectedCustomerName(customerName);
    setSearchQuery(customerName);
    setShowDropdown(false);

    // Call onChange if provided (legacy callback)
    if (props.onChange) {
      props.onChange(customer.clientNotaryId || '', customerName);
    }

    // Call onSelect if provided (full customer object)
    if (props.onSelect) {
      props.onSelect(customer);
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    setSelectedCustomerName('');
    setSearchResults([]);
    setShowDropdown(false);

    if (props.onChange) {
      props.onChange('', '');
    }
  };

  // Close dropdown when clicking outside
  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.customer-search-dropdown')) {
      setShowDropdown(false);
    }
  };

  // Add/remove event listener
  if (typeof window !== 'undefined') {
    window.addEventListener('click', handleClickOutside);
    onCleanup(() => window.removeEventListener('click', handleClickOutside));
  }

  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    'padding-right': '2.5rem',
    border: '2px solid var(--border-color)',
    'border-radius': 'var(--border-radius)',
    'font-size': '1rem',
    'font-family': 'inherit',
    transition: 'border-color 0.2s ease'
  };

  const dropdownStyle = {
    position: 'absolute' as const,
    top: '100%',
    left: '0',
    right: '0',
    'margin-top': '0.25rem',
    background: 'white',
    border: '2px solid var(--border-color)',
    'border-radius': 'var(--border-radius)',
    'max-height': '300px',
    'overflow-y': 'auto',
    'box-shadow': '0 4px 6px rgba(0, 0, 0, 0.1)',
    'z-index': 1000
  };

  const resultItemStyle = (isHovered: boolean) => ({
    padding: '0.75rem 1rem',
    cursor: 'pointer',
    background: isHovered ? 'var(--primary-light)' : 'white',
    'border-bottom': '1px solid var(--border-color)',
    transition: 'background 0.15s ease'
  });

  return (
    <div class="customer-search-dropdown" style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={searchQuery()}
          onInput={(e) => handleSearch(e.currentTarget.value)}
          onFocus={() => {
            if (searchResults().length > 0) {
              setShowDropdown(true);
            }
          }}
          style={inputStyle}
          placeholder={props.placeholder || 'Buscar cliente...'}
        />

        {/* Loading indicator */}
        <Show when={isSearching()}>
          <div style={{
            position: 'absolute',
            right: '3rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)'
          }}>
            🔄
          </div>
        </Show>

        {/* Clear button */}
        <Show when={searchQuery().length > 0}>
          <button
            onClick={handleClear}
            style={{
              position: 'absolute',
              right: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              'font-size': '1.25rem',
              color: 'var(--text-muted)',
              padding: '0.25rem'
            }}
            type="button"
          >
            ✕
          </button>
        </Show>
      </div>

      {/* Dropdown Results */}
      <Show when={showDropdown() && searchResults().length > 0}>
        <div style={dropdownStyle}>
          <For each={searchResults()}>
            {(customer) => (
              <div
                onClick={() => handleSelect(customer)}
                style={resultItemStyle(false)}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--primary-light)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
              >
                <div style={{ 'font-weight': '600', 'margin-bottom': '0.25rem' }}>
                  {customer.firstName} {customer.lastName}
                </div>
                <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                  {customer.email}
                  {customer.phoneNumber && ` • ${customer.phoneNumber}`}
                  {customer.alienNumber && ` • A# ${customer.alienNumber}`}
                </div>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', 'margin-top': '0.25rem' }}>
                  ID: {customer.clientNotaryId}
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>

      {/* No results message */}
      <Show when={showDropdown() && searchResults().length === 0 && searchQuery().length >= 2 && !isSearching()}>
        <div style={dropdownStyle}>
          <div style={{ padding: '1rem', 'text-align': 'center', color: 'var(--text-muted)' }}>
            No se encontraron clientes con "{searchQuery()}"
          </div>
        </div>
      </Show>

      {/* Selected customer ID display */}
      <Show when={selectedCustomerName()}>
        <div style={{
          'margin-top': '0.5rem',
          'font-size': '0.75rem',
          color: 'var(--success-color)',
          display: 'flex',
          'align-items': 'center',
          gap: '0.5rem'
        }}>
          ✓ Seleccionado: <strong>{selectedCustomerName()}</strong>
          <Show when={props.value}>
            {` (ID: ${props.value})`}
          </Show>
        </div>
      </Show>
    </div>
  );
};

export default CustomerSearchDropdown;
