import { Component, createSignal, Show } from 'solid-js';
import FormInput from '../../ui/components/FormInput';
import FormSelect from '../../ui/components/FormSelect';
import Button from '../../ui/components/Button';
import { useTranslation } from '../../../translations';
import type { Account } from '../types';

interface AccountFormProps {
  account?: Account;
  onSuccess: (account: Partial<Account>) => void;
  onCancel: () => void;
}

const AccountForm: Component<AccountFormProps> = (props) => {
  const { t } = useTranslation();

  const [code, setCode] = createSignal(props.account?.code || '');
  const [name, setName] = createSignal(props.account?.name || '');
  const [accountType, setAccountType] = createSignal(props.account?.accountType || '');
  const [taxCategory, setTaxCategory] = createSignal(props.account?.taxCategory || '');
  const [description, setDescription] = createSignal(props.account?.description || '');
  const [isLoading, setIsLoading] = createSignal(false);
  const [errors, setErrors] = createSignal<Record<string, string>>({});

  const accountTypeOptions = [
    { value: 'asset', label: 'Asset' },
    { value: 'liability', label: 'Liability' },
    { value: 'equity', label: 'Equity' },
    { value: 'revenue', label: 'Revenue' },
    { value: 'expense', label: 'Expense' }
  ];

  const taxCategoryOptions = [
    { value: '', label: 'None' },
    { value: 'taxable', label: 'Taxable' },
    { value: 'exempt', label: 'Tax Exempt' },
    { value: 'vat', label: 'VAT' },
    { value: 'sales_tax', label: 'Sales Tax' }
  ];

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!code().trim()) {
      newErrors.code = 'Account code is required';
    }

    if (!name().trim()) {
      newErrors.name = 'Account name is required';
    }

    if (!accountType()) {
      newErrors.accountType = 'Account type is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsLoading(true);

    try {
      const accountData: Partial<Account> = {
        code: code(),
        name: name(),
        accountType: accountType() as Account['accountType'],
        taxCategory: taxCategory() || undefined,
        description: description() || undefined,
        isActive: true,
        balance: props.account?.balance || 0
      };

      if (props.account) {
        accountData.id = props.account.id;
      }

      props.onSuccess(accountData);
    } catch (error) {
      console.error('Error saving account:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formStyle = {
    display: 'flex',
    'flex-direction': 'column',
    gap: '1rem'
  };

  const errorStyle = {
    color: '#dc2626',
    'font-size': '0.875rem',
    'margin-top': '0.25rem'
  };

  const buttonGroupStyle = {
    display: 'flex',
    gap: '1rem',
    'justify-content': 'flex-end',
    'margin-top': '1.5rem'
  };

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      <div>
        <FormInput
          label="Account Code"
          value={code()}
          onChange={setCode}
          placeholder="e.g., 1000, 2000, 4000"
          required
        />
        <Show when={errors().code}>
          <div style={errorStyle}>{errors().code}</div>
        </Show>
      </div>

      <div>
        <FormInput
          label="Account Name"
          value={name()}
          onChange={setName}
          placeholder="e.g., Cash, Accounts Payable"
          required
        />
        <Show when={errors().name}>
          <div style={errorStyle}>{errors().name}</div>
        </Show>
      </div>

      <div>
        <FormSelect
          label="Account Type"
          value={accountType()}
          onChange={setAccountType}
          options={accountTypeOptions}
          required
        />
        <Show when={errors().accountType}>
          <div style={errorStyle}>{errors().accountType}</div>
        </Show>
      </div>

      <div>
        <FormSelect
          label="Tax Category"
          value={taxCategory()}
          onChange={setTaxCategory}
          options={taxCategoryOptions}
        />
      </div>

      <div>
        <FormInput
          label="Description"
          value={description()}
          onChange={setDescription}
          placeholder="Optional description"
        />
      </div>

      <div style={buttonGroupStyle}>
        <Button
          variant="secondary"
          onClick={props.onCancel}
          type="button"
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          type="submit"
          disabled={isLoading()}
        >
          {isLoading() ? 'Saving...' : props.account ? 'Update Account' : 'Create Account'}
        </Button>
      </div>
    </form>
  );
};

export default AccountForm;
