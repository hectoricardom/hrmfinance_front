import { Component, createSignal, createEffect, For } from 'solid-js';
import { useTranslation } from '../../../translations';
import { accountsStore } from '../../accounts/stores/accountsStore';
import type { AccountingAccount } from '../../accounts/stores/accountsStore';

interface AccountSelectProps {
  value: string;
  onChange: (value: string) => void;
  filterType?: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
  label?: string;
  error?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

const AccountSelect: Component<AccountSelectProps> = (props) => {
  const { t } = useTranslation();
  const [accounts, setAccounts] = createSignal<AccountingAccount[]>([]);

  createEffect(() => {
    // Fetch accounts from store
    let allAccounts = accountsStore.accounts;

    // Filter by type if provided
    if (props.filterType) {
      allAccounts = accountsStore.getAccountsByType(props.filterType);
    }

    setAccounts(allAccounts);
  });

  const labelStyle = {
    display: 'block',
    'font-weight': '500',
    'margin-bottom': '0.5rem',
    color: 'var(--text-primary)'
  };

  const selectStyle = {
    width: '100%',
    padding: '0.75rem',
    border: props.error ? '1px solid #dc2626' : '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '1rem',
    'font-family': 'inherit',
    background: 'var(--surface-color)',
    color: 'var(--text-primary)',
    transition: 'border-color 0.2s ease'
  };

  const containerStyle = {
    'margin-bottom': '1rem'
  };

  const errorStyle = {
    color: '#dc2626',
    'font-size': '0.875rem',
    'margin-top': '0.25rem'
  };

  return (
    <div style={containerStyle}>
      {props.label && (
        <label style={labelStyle}>
          {props.label}
          {props.required && <span style={{ color: 'var(--primary-color)' }}>*</span>}
        </label>
      )}
      <select
        value={props.value}
        required={props.required}
        disabled={props.disabled}
        style={selectStyle}
        onChange={(e) => props.onChange(e.target.value)}
        onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
        onBlur={(e) => e.target.style.borderColor = props.error ? '#dc2626' : 'var(--border-color)'}
      >
        <option value="">{props.placeholder || t('forms.selectOption') || 'Select an account...'}</option>
        <For each={accounts()}>
          {(account) => (
            <option value={account.id || account.accountId}>
              {account.code || account.accountNumber} - {account.name}
            </option>
          )}
        </For>
      </select>
      {props.error && (
        <div style={errorStyle}>{props.error}</div>
      )}
    </div>
  );
};

export default AccountSelect;
