import { Component, createSignal, createEffect, Show } from 'solid-js';
import { Modal, Button, FormInput, FormSelect } from '../../ui';
import { AccountingAccount, accountsStore } from '../stores/accountsStore';
import { useTranslation } from '../../../translations';

interface MarkBankAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: AccountingAccount | null;
}

const MarkBankAccountModal: Component<MarkBankAccountModalProps> = (props) => {
  const { t } = useTranslation();
  const [formData, setFormData] = createSignal({
    bankName: '',
    bankAccountNumber: '',
    bankAccountType: '' as 'checking' | 'savings' | 'credit' | 'investment' | '',
    currency: 'USD'
  });

  const [validationError, setValidationError] = createSignal<string | null>(null);

  // Initialize form when account changes
  createEffect(() => {
    if (props.account) {
      if (props.account.isBankAccount) {
        // Load existing bank account data
        setFormData({
          bankName: props.account.bankName || '',
          bankAccountNumber: props.account.bankAccountNumber || '',
          bankAccountType: props.account.bankAccountType || '',
          currency: props.account.currency || 'USD'
        });
      } else {
        // Reset form for new bank account marking
        setFormData({
          bankName: '',
          bankAccountNumber: '',
          bankAccountType: '',
          currency: 'USD'
        });
      }
      setValidationError(null);
    }
  });

  const bankAccountTypeOptions = [
    { value: 'checking', label: t('accounts.checking') || 'Checking' },
    { value: 'savings', label: t('accounts.savings') || 'Savings' },
    { value: 'credit', label: t('accounts.credit') || 'Credit' },
    { value: 'investment', label: t('accounts.investment') || 'Investment' }
  ];

  const currencyOptions = [
    { value: 'USD', label: 'USD - US Dollar' },
    { value: 'EUR', label: 'EUR - Euro' },
    { value: 'MXN', label: 'MXN - Mexican Peso' },
    { value: 'GBP', label: 'GBP - British Pound' },
    { value: 'CAD', label: 'CAD - Canadian Dollar' },
    { value: 'JPY', label: 'JPY - Japanese Yen' }
  ];

  const buttonGroupStyle = {
    display: 'flex',
    gap: '1rem',
    'justify-content': 'flex-end',
    'margin-top': '2rem'
  };

  const accountInfoStyle = {
    background: 'var(--background-color)',
    padding: '1rem',
    'border-radius': 'var(--border-radius-sm)',
    'margin-bottom': '1.5rem',
    border: '1px solid var(--border-color)'
  };

  const accountLabelStyle = {
    'font-size': '0.875rem',
    'font-weight': '500',
    color: 'var(--text-muted)',
    'margin-bottom': '0.5rem'
  };

  const accountNameStyle = {
    'font-weight': '600',
    color: 'var(--text-primary)',
    'font-size': '1.125rem'
  };

  const accountDetailsStyle = {
    'font-size': '0.875rem',
    color: 'var(--text-secondary)',
    'margin-top': '0.25rem'
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    setValidationError(null);

    if (!props.account) return;

    const data = formData();

    // Validate required fields
    if (!data.bankName || !data.bankAccountNumber || !data.bankAccountType || !data.currency) {
      setValidationError(t('forms.requiredField') || 'All fields are required');
      return;
    }

    try {
      // Mark account as bank account
      accountsStore.markAsBankAccount(props.account.id, {
        bankName: data.bankName,
        bankAccountNumber: data.bankAccountNumber,
        bankAccountType: data.bankAccountType as 'checking' | 'savings' | 'credit' | 'investment',
        currency: data.currency
      });

      // Persist to API
      if (props.account.accountId) {
        accountsStore.updateAccountServer(props.account.accountId, {
          isBankAccount: true,
          bankName: data.bankName,
          bankAccountNumber: data.bankAccountNumber,
          bankAccountType: data.bankAccountType,
          currency: data.currency
        });
      }

      props.onClose();
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : t('forms.saveError') || 'Error saving bank account');
    }
  };

  const handleRemoveBankAccount = () => {
    if (!props.account) return;

    const confirmMessage = t('accounts.confirmRemoveBankAccount') || 'Are you sure you want to remove bank account marking from this account?';

    if (confirm(confirmMessage)) {
      try {
        accountsStore.unmarkAsBankAccount(props.account.id);

        // Persist to API
        if (props.account.accountId) {
          accountsStore.updateAccountServer(props.account.accountId, {
            isBankAccount: false,
            bankName: undefined,
            bankAccountNumber: undefined,
            bankAccountType: undefined,
            currency: undefined
          });
        }

        props.onClose();
      } catch (error) {
        setValidationError(error instanceof Error ? error.message : t('forms.deleteError') || 'Error removing bank account');
      }
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation error when user starts typing
    if (validationError()) {
      setValidationError(null);
    }
  };

  if (!props.account) return null;

  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      title={props.account.isBankAccount
        ? t('accounts.editBankAccount') || 'Edit Bank Account'
        : t('accounts.markAsBankAccount') || 'Mark as Bank Account'
      }
      maxWidth="600px"
    >
      <div style={accountInfoStyle}>
        <div style={accountLabelStyle}>
          {t('accounts.account') || 'Account'}
        </div>
        <div style={accountNameStyle}>
          {props.account.accountNumber} - {props.account.name}
        </div>
        <div style={accountDetailsStyle}>
          {t(`accounts.types.${props.account?.accountType?.toLowerCase()}`) || props.account.accountType} • {props.account.category}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <FormInput
          label={t('accounts.bankName') || 'Bank Name'}
          value={formData().bankName}
          onChange={(value) => updateFormData('bankName', value)}
          placeholder={t('accounts.bankNamePlaceholder') || 'Enter bank name'}
          required
        />

        <FormInput
          label={t('accounts.bankAccountNumber') || 'Bank Account Number'}
          value={formData().bankAccountNumber}
          onChange={(value) => updateFormData('bankAccountNumber', value)}
          placeholder={t('accounts.bankAccountNumberPlaceholder') || 'Last 4 digits or masked number (e.g., ***1234)'}
          required
        />

        <FormSelect
          label={t('accounts.bankAccountType') || 'Account Type'}
          value={formData().bankAccountType}
          onChange={(value) => updateFormData('bankAccountType', value)}
          options={bankAccountTypeOptions}
          required
        />

        <FormSelect
          label={t('common.currency') || 'Currency'}
          value={formData().currency}
          onChange={(value) => updateFormData('currency', value)}
          options={currencyOptions}
          required
        />

        <Show when={validationError()}>
          <div style={{
            padding: '1rem',
            'border-radius': 'var(--border-radius-sm)',
            'margin-top': '1rem',
            background: '#f8d7da',
            color: '#721c24',
            border: '1px solid #f5c6cb'
          }}>
            {validationError()}
          </div>
        </Show>

        <div style={buttonGroupStyle}>
          <Show when={props.account?.isBankAccount}>
            <Button
              variant="outline"
              type="button"
              onClick={handleRemoveBankAccount}
              style={{
                color: '#dc3545',
                'border-color': '#dc3545',
                'margin-right': 'auto'
              }}
            >
              {t('accounts.removeBankAccount') || 'Remove Bank Account'}
            </Button>
          </Show>
          <Button variant="secondary" type="button" onClick={props.onClose}>
            {t('common.cancel') || 'Cancel'}
          </Button>
          <Button variant="primary" type="submit">
            {t('common.save') || 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default MarkBankAccountModal;
