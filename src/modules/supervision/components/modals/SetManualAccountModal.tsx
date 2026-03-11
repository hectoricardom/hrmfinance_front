import { Component, createSignal, createEffect, Show, For } from 'solid-js';
import { SupervisedAccountMapping, MappingSource } from '../../types/supervisionTypes';

interface SetManualAccountModalProps {
  isOpen: boolean;
  transactionType?: string;
  currentMapping?: SupervisedAccountMapping;
  onClose: () => void;
  onSave: (mapping: {
    transactionType: string;
    accountCode: string;
    lock: boolean;
    applyToSimilar: boolean;
  }) => void;
}

interface MockAccount {
  code: string;
  name: string;
  type: string;
}

const mockAccounts: MockAccount[] = [
  { code: '1001', name: 'Cash', type: 'Asset' },
  { code: '1010', name: 'Bank-CC', type: 'Asset' },
  { code: '1020', name: 'Bank-Savings', type: 'Asset' },
  { code: '1100', name: 'Accounts Receivable', type: 'Asset' },
  { code: '2100', name: 'Sales Tax Payable', type: 'Liability' },
  { code: '4000', name: 'Sales Revenue', type: 'Revenue' },
  { code: '4100', name: 'Service Revenue', type: 'Revenue' },
  { code: '6100', name: 'Credit Card Fees', type: 'Expense' },
  { code: '6200', name: 'Bank Fees', type: 'Expense' },
];

const transactionTypeOptions = [
  { value: 'payment.card', label: 'Payment - Card' },
  { value: 'payment.cash', label: 'Payment - Cash' },
  { value: 'payment.transfer', label: 'Payment - Transfer' },
  { value: 'revenue.product', label: 'Revenue - Product' },
  { value: 'revenue.service', label: 'Revenue - Service' },
  { value: 'expense.fee', label: 'Expense - Fee' },
  { value: 'expense.supplies', label: 'Expense - Supplies' },
  { value: 'expense.utilities', label: 'Expense - Utilities' },
  { value: 'expense.rent', label: 'Expense - Rent' },
];

const SetManualAccountModal: Component<SetManualAccountModalProps> = (props) => {
  const [transactionType, setTransactionType] = createSignal<string>('');
  const [searchQuery, setSearchQuery] = createSignal<string>('');
  const [selectedAccount, setSelectedAccount] = createSignal<string | null>(null);
  const [lockMapping, setLockMapping] = createSignal<boolean>(true);
  const [applyToSimilar, setApplyToSimilar] = createSignal<boolean>(false);

  // Initialize/reset state when modal opens or props change
  createEffect(() => {
    if (props.isOpen) {
      setTransactionType(props.transactionType || '');
      setSearchQuery('');
      setSelectedAccount(props.currentMapping?.debitAccount?.code || null);
      setLockMapping(true);
      setApplyToSimilar(false);
    }
  });

  // Get suggested account based on current mapping
  const getSuggestedAccount = () => {
    if (props.currentMapping?.debitAccount) {
      return props.currentMapping.debitAccount.code;
    }
    return '1010'; // Default suggestion
  };

  const getSuggestedConfidence = () => {
    if (props.currentMapping) {
      return Math.round(props.currentMapping.confidence * 100);
    }
    return 85;
  };

  // Filter accounts based on search query
  const filteredAccounts = () => {
    const query = searchQuery().toLowerCase();
    if (!query) return mockAccounts;
    return mockAccounts.filter(
      (acc) =>
        acc.code.toLowerCase().includes(query) ||
        acc.name.toLowerCase().includes(query) ||
        acc.type.toLowerCase().includes(query)
    );
  };

  // Get current mapping display text
  const getCurrentMappingDisplay = () => {
    if (!props.currentMapping) return null;
    const account = props.currentMapping.debitAccount;
    const source =
      props.currentMapping.source === MappingSource.AI_GENERATED
        ? 'AI'
        : props.currentMapping.source === MappingSource.USER_CREATED
          ? 'User'
          : 'System';
    const confidence = Math.round(props.currentMapping.confidence * 100);
    return `${account.code} - ${account.name} (${source}, ${confidence}%)`;
  };

  const handleSave = () => {
    const type = transactionType();
    const account = selectedAccount();

    if (!type || !account) return;

    props.onSave({
      transactionType: type,
      accountCode: account,
      lock: lockMapping(),
      applyToSimilar: applyToSimilar(),
    });
  };

  const handleOverlayClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) {
      props.onClose();
    }
  };

  // Styles
  const overlayStyle = {
    position: 'fixed' as const,
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    'background-color': 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    'z-index': '1000',
    padding: '1rem',
  };

  const modalStyle = {
    background: 'white',
    'border-radius': '8px',
    'box-shadow': '0 10px 30px rgba(0, 0, 0, 0.2)',
    width: '100%',
    'max-width': '560px',
    'max-height': '90vh',
    overflow: 'auto',
  };

  const headerStyle = {
    padding: '1.25rem 1.5rem',
    'border-bottom': '1px solid #e5e7eb',
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
  };

  const titleStyle = {
    'font-size': '1.125rem',
    'font-weight': '600',
    color: '#111827',
    margin: '0',
    'text-transform': 'uppercase' as const,
    'letter-spacing': '0.025em',
  };

  const closeButtonStyle = {
    background: 'none',
    border: 'none',
    'font-size': '1.5rem',
    cursor: 'pointer',
    color: '#6b7280',
    padding: '0.25rem',
    'border-radius': '4px',
    'line-height': '1',
    transition: 'color 0.15s ease',
  };

  const contentStyle = {
    padding: '1.5rem',
  };

  const formGroupStyle = {
    'margin-bottom': '1.25rem',
  };

  const labelStyle = {
    display: 'block',
    'font-size': '0.875rem',
    'font-weight': '500',
    color: '#374151',
    'margin-bottom': '0.5rem',
  };

  const selectStyle = {
    width: '100%',
    padding: '0.625rem 0.75rem',
    'font-size': '0.875rem',
    border: '1px solid #d1d5db',
    'border-radius': '6px',
    background: 'white',
    color: '#111827',
    cursor: 'pointer',
    outline: 'none',
  };

  const currentMappingStyle = {
    background: '#f3f4f6',
    padding: '0.75rem 1rem',
    'border-radius': '6px',
    'font-size': '0.875rem',
    color: '#374151',
  };

  const searchContainerStyle = {
    border: '1px solid #d1d5db',
    'border-radius': '6px',
    overflow: 'hidden',
  };

  const searchInputContainerStyle = {
    display: 'flex',
    'align-items': 'center',
    padding: '0.625rem 0.75rem',
    'border-bottom': '1px solid #e5e7eb',
    background: '#fafafa',
  };

  const searchIconStyle = {
    'margin-right': '0.5rem',
    color: '#9ca3af',
    'font-size': '1rem',
  };

  const searchInputStyle = {
    flex: '1',
    border: 'none',
    outline: 'none',
    'font-size': '0.875rem',
    background: 'transparent',
    color: '#111827',
  };

  const accountListStyle = {
    'max-height': '200px',
    'overflow-y': 'auto' as const,
  };

  const accountItemStyle = (isSelected: boolean, isSuggested: boolean) => ({
    display: 'flex',
    'align-items': 'center',
    padding: '0.75rem 1rem',
    cursor: 'pointer',
    'border-bottom': '1px solid #f3f4f6',
    background: isSelected ? '#eff6ff' : 'white',
    transition: 'background 0.15s ease',
  });

  const accountCodeStyle = {
    'font-weight': '600',
    color: '#111827',
    'min-width': '50px',
    'margin-right': '0.5rem',
  };

  const accountNameStyle = {
    color: '#374151',
    flex: '1',
  };

  const accountTypeStyle = {
    'font-size': '0.75rem',
    color: '#6b7280',
    'margin-left': '0.5rem',
  };

  const suggestedBadgeStyle = {
    'font-size': '0.7rem',
    background: '#fef3c7',
    color: '#92400e',
    padding: '0.125rem 0.5rem',
    'border-radius': '9999px',
    'margin-left': '0.5rem',
    'white-space': 'nowrap' as const,
  };

  const starIconStyle = {
    color: '#f59e0b',
    'margin-right': '0.5rem',
  };

  const checkboxContainerStyle = {
    display: 'flex',
    'align-items': 'center',
    'margin-bottom': '0.75rem',
    cursor: 'pointer',
  };

  const checkboxStyle = {
    width: '18px',
    height: '18px',
    'margin-right': '0.5rem',
    cursor: 'pointer',
    'accent-color': '#2563eb',
  };

  const checkboxLabelStyle = {
    'font-size': '0.875rem',
    color: '#374151',
    cursor: 'pointer',
  };

  const footerStyle = {
    padding: '1rem 1.5rem',
    'border-top': '1px solid #e5e7eb',
    display: 'flex',
    'justify-content': 'flex-end',
    gap: '0.75rem',
    background: '#fafafa',
  };

  const buttonBaseStyle = {
    padding: '0.625rem 1.25rem',
    'font-size': '0.875rem',
    'font-weight': '500',
    'border-radius': '6px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  };

  const cancelButtonStyle = {
    ...buttonBaseStyle,
    background: 'white',
    border: '1px solid #d1d5db',
    color: '#374151',
  };

  const saveButtonStyle = {
    ...buttonBaseStyle,
    background: '#2563eb',
    border: '1px solid #2563eb',
    color: 'white',
  };

  const disabledButtonStyle = {
    ...buttonBaseStyle,
    background: '#e5e7eb',
    border: '1px solid #e5e7eb',
    color: '#9ca3af',
    cursor: 'not-allowed',
  };

  const selectedCheckStyle = {
    color: '#2563eb',
    'margin-left': 'auto',
    'font-weight': 'bold',
  };

  const isFormValid = () => transactionType() && selectedAccount();

  return (
    <Show when={props.isOpen}>
      <div style={overlayStyle} onClick={handleOverlayClick}>
        <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div style={headerStyle}>
            <h2 style={titleStyle}>Set Manual Account Mapping</h2>
            <button
              style={closeButtonStyle}
              onClick={props.onClose}
              type="button"
              onMouseEnter={(e) => (e.currentTarget.style.color = '#111827')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#6b7280')}
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div style={contentStyle}>
            {/* Transaction Type */}
            <div style={formGroupStyle}>
              <label style={labelStyle}>Transaction Type:</label>
              <select
                style={selectStyle}
                value={transactionType()}
                onChange={(e) => setTransactionType(e.currentTarget.value)}
                disabled={!!props.transactionType}
              >
                <option value="">Select transaction type...</option>
                <For each={transactionTypeOptions}>
                  {(option) => <option value={option.value}>{option.label}</option>}
                </For>
              </select>
            </div>

            {/* Current Mapping */}
            <Show when={props.currentMapping}>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Current Mapping:</label>
                <div style={currentMappingStyle}>{getCurrentMappingDisplay()}</div>
              </div>
            </Show>

            {/* New Account Selection */}
            <div style={formGroupStyle}>
              <label style={labelStyle}>New Account:</label>
              <div style={searchContainerStyle}>
                {/* Search Input */}
                <div style={searchInputContainerStyle}>
                  <span style={searchIconStyle}>&#128269;</span>
                  <input
                    type="text"
                    style={searchInputStyle}
                    placeholder="Search accounts..."
                    value={searchQuery()}
                    onInput={(e) => setSearchQuery(e.currentTarget.value)}
                  />
                </div>

                {/* Account List */}
                <div style={accountListStyle}>
                  <For each={filteredAccounts()}>
                    {(account) => {
                      const isSuggested = account.code === getSuggestedAccount();
                      const isSelected = account.code === selectedAccount();

                      return (
                        <div
                          style={accountItemStyle(isSelected, isSuggested)}
                          onClick={() => setSelectedAccount(account.code)}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.background = '#f9fafb';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.background = 'white';
                            }
                          }}
                        >
                          <Show when={isSuggested}>
                            <span style={starIconStyle}>&#9733;</span>
                          </Show>
                          <span style={accountCodeStyle}>{account.code}</span>
                          <span style={accountNameStyle}>{account.name}</span>
                          <Show when={isSuggested}>
                            <span style={suggestedBadgeStyle}>
                              Suggested - {getSuggestedConfidence()}% match
                            </span>
                          </Show>
                          <Show when={!isSuggested}>
                            <span style={accountTypeStyle}>({account.type})</span>
                          </Show>
                          <Show when={isSelected}>
                            <span style={selectedCheckStyle}>&#10003;</span>
                          </Show>
                        </div>
                      );
                    }}
                  </For>
                </div>
              </div>
            </div>

            {/* Options */}
            <div style={{ 'margin-top': '1.5rem' }}>
              <label
                style={checkboxContainerStyle}
                onClick={() => setLockMapping(!lockMapping())}
              >
                <input
                  type="checkbox"
                  style={checkboxStyle}
                  checked={lockMapping()}
                  onChange={(e) => setLockMapping(e.currentTarget.checked)}
                />
                <span style={checkboxLabelStyle}>
                  Lock this mapping (prevent AI changes)
                </span>
              </label>

              <label
                style={checkboxContainerStyle}
                onClick={() => setApplyToSimilar(!applyToSimilar())}
              >
                <input
                  type="checkbox"
                  style={checkboxStyle}
                  checked={applyToSimilar()}
                  onChange={(e) => setApplyToSimilar(e.currentTarget.checked)}
                />
                <span style={checkboxLabelStyle}>Apply to similar transactions</span>
              </label>
            </div>
          </div>

          {/* Footer */}
          <div style={footerStyle}>
            <button
              style={cancelButtonStyle}
              onClick={props.onClose}
              type="button"
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f9fafb')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
            >
              Cancel
            </button>
            <button
              style={isFormValid() ? saveButtonStyle : disabledButtonStyle}
              onClick={handleSave}
              type="button"
              disabled={!isFormValid()}
              onMouseEnter={(e) => {
                if (isFormValid()) {
                  e.currentTarget.style.background = '#1d4ed8';
                }
              }}
              onMouseLeave={(e) => {
                if (isFormValid()) {
                  e.currentTarget.style.background = '#2563eb';
                }
              }}
            >
              Save & Lock
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
};

export default SetManualAccountModal;
