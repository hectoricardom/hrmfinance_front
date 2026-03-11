import { Component, createSignal, createMemo, onMount } from 'solid-js';
import { For, Show } from 'solid-js';
import { accountsStore } from '../../accounts';
import { AccountingAccount } from '../../accounts/types';
import { useTranslation } from '../../../translations';

interface SearchableAccountDropdownProps {
  onSelect: (accountId: any) => void;
  selectedAccountId?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  style?: any;
  filterFn?: (account: AccountingAccount) => boolean;
}

const SearchableAccountDropdown: Component<SearchableAccountDropdownProps> = (props) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = createSignal(false);
  const [searchTerm, setSearchTerm] = createSignal('');
  const [inputValue, setInputValue] = createSignal('');
  const [focusedIndex, setFocusedIndex] = createSignal(0);
  let inputRef: HTMLInputElement | undefined;
  let dropdownRef: HTMLDivElement | undefined;
  let blurTimeoutId: number | undefined;

  // Get sorted accounts by name (with optional custom filter)
  const sortedAccounts = createMemo(() => {
    let accounts = [...accountsStore.accounts];

    // Apply custom filter if provided
    if (props.filterFn) {
      accounts = accounts.filter(props.filterFn);
    }

    return accounts.sort((a, b) =>
      a?.name?.localeCompare?.(b?.name, undefined, { numeric: true, sensitivity: 'base' })
    );
  });

  // Filter accounts based on search term
  const filteredAccounts = createMemo(() => {
    const search = inputValue().toLowerCase();
    if (!search) return sortedAccounts();

    return sortedAccounts().filter(account =>
      JSON.stringify(account)?.toLowerCase()?.includes(search)
    );
  });

  // Get selected account
  const selectedAccount = createMemo(() => {
    if (!props.selectedAccountId) return null;
    return accountsStore.accounts.find(acc => acc.id === props.selectedAccountId);
  });

  // Get display text for selected account
  const displayText = createMemo(() => {
    const account = selectedAccount();
    if (!account) return '';
    return `${account.accountNumber} - ${account.name} (${account.type})`;
  });

  // Handle selection
  const selectAccount = (account: AccountingAccount) => {
    props.onSelect(account);
    setInputValue('');
    setSearchTerm('');
    setIsOpen(false);
    setFocusedIndex(0);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isOpen()) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
        setFocusedIndex(0);
      }
      return;
    }

    const accounts = filteredAccounts();
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % accounts.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => (prev - 1 + accounts.length) % accounts.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (accounts[focusedIndex()]) {
          selectAccount(accounts[focusedIndex()]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchTerm('');
        break;
    }
  };

  // Handle blur with timeout
  const handleBlur = () => {
    blurTimeoutId = window.setTimeout(() => {
      setIsOpen(false);
      setInputValue('');
      setSearchTerm('');
    }, 200);
  };

  // Handle focus
  const handleFocus = () => {
    if (blurTimeoutId) {
      clearTimeout(blurTimeoutId);
    }
    setIsOpen(true);
    setInputValue('');
  };

  // Styles
  const inputStyle = {
    width: '100%',
    padding: '0.5rem 0.75rem',
    border: '1px solid #d1d5db',
    'border-radius': '0.375rem',
    'font-size': '0.875rem',
    'line-height': '1.25rem',
    'background-color': props.disabled ? '#f3f4f6' : 'white',
    cursor: props.disabled ? 'not-allowed' : 'pointer',
    ...props.style
  };

  const dropdownStyle = {
    position: 'absolute' as const,
    top: '100%',
    left: '0',
    right: '0',
    'margin-top': '0.25rem',
    'background-color': 'white',
    border: '1px solid #d1d5db',
    'border-radius': '0.375rem',
    'box-shadow': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    'max-height': '300px',
    'overflow-y': 'auto',
    'z-index': '50'
  };

  const optionStyle = (index: number) => ({
    padding: '0.5rem 0.75rem',
    cursor: 'pointer',
    'font-size': '0.875rem',
    'line-height': '1.25rem',
    'background-color': focusedIndex() === index ? '#f3f4f6' : 'white',
    ':hover': {
      'background-color': '#f3f4f6'
    }
  });

  const accountTypeStyle = {
    'font-size': '0.75rem',
    color: '#6b7280',
    'margin-left': '0.5rem'
  };

  return (
    <div style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        type="text"
        value={isOpen() ? inputValue() : displayText()}
        onInput={(e) => {
          setInputValue(e.currentTarget.value);
          if (!isOpen()) {
            setIsOpen(true);
          }
        }}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={props.placeholder || t('common.selectAccount')}
        disabled={props.disabled}
        required={props.required}
        style={inputStyle}
      />
      
      <Show when={isOpen() && !props.disabled}>
        <div ref={dropdownRef} style={dropdownStyle}>
          <Show when={filteredAccounts().length > 0} fallback={
            <div style={{ padding: '1rem', 'text-align': 'center', color: '#6b7280' }}>
              {t('common.noResultsFound')}
            </div>
          }>
            <For each={filteredAccounts()}>
              {(account, index) => (
                <div
                  style={optionStyle(index())}
                  onClick={() => selectAccount(account)}
                  onMouseEnter={() => setFocusedIndex(index())}
                >
                  <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' }}>
                    <span>
                      <strong>{account.accountNumber}</strong> - {account.name}
                    </span>
                    <span style={accountTypeStyle}>
                      {account.type}
                    </span>
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

export default SearchableAccountDropdown;