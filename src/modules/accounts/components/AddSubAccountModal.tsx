import { Component, createSignal } from 'solid-js';
import { Modal, Button, FormInput, FormSelect } from '../../ui';
import { AccountingAccount, accountsStore } from '../stores/accountsStore';
import { useTranslation } from '../../../translations';
import { generateRandomId } from '../../../services/utils';

interface AddSubAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentAccount: AccountingAccount | null;
}

const AddSubAccountModal: Component<AddSubAccountModalProps> = (props) => {
  const { t } = useTranslation();
  const [formData, setFormData] = createSignal({
    accountNumber: '',
    name: '',
    category: '',
    description: '',
    balance: '0',
    isActive: 'true'
  });


  const accountTypeOptions = [
    { value: 'Asset', label: t('accounts.types.asset'), type: "debit", classification: "real" },
    { value: 'Liability', label: t('accounts.types.liability'), type: "credit", classification: "real"  },
    { value: 'Equity', label: t('accounts.types.equity'), type: "credit" , classification: "real"  },
    { value: 'Revenue', label: t('accounts.types.revenue'), type: "credit", classification: "nominal"  },
    { value: 'Expense', label: t('accounts.types.expense'), type: "debit" , classification: "nominal"  }
  ];

  const getCategoryOptions = () => {
    if (!props.parentAccount) return [];
    
    const categoryMap: Record<AccountingAccount['type'], {value: string, label: string}[]> = {
      'Asset': [
        { value: 'Current Assets', label: t('accounts.categories.currentAssets') },
        { value: 'Fixed Assets', label: t('accounts.categories.fixedAssets') }
      ],
      'Liability': [
        { value: 'Current Liabilities', label: t('accounts.categories.currentLiabilities') },
        { value: 'Long-term Liabilities', label: t('accounts.categories.longTermLiabilities') }
      ],
      'Equity': [
        { value: 'Owner\'s Equity', label: t('accounts.categories.ownersEquity') }
      ],
      'Revenue': [
        { value: 'Operating Revenue', label: t('accounts.categories.operatingRevenue') }
      ],
      'Expense': [
        { value: 'Operating Expenses', label: t('accounts.categories.operatingExpenses') }
      ]
    };
    
    return categoryMap[props.parentAccount.type] || [];
  };

  const activeOptions = [
    { value: 'true', label: t('common.active') },
    { value: 'false', label: t('common.inactive') }
  ];

  const buttonGroupStyle = {
    display: 'flex',
    gap: '1rem',
    'justify-content': 'flex-end',
    'margin-top': '2rem'
  };

  const parentInfoStyle = {
    background: 'var(--background-color)',
    padding: '1rem',
    'border-radius': 'var(--border-radius-sm)',
    'margin-bottom': '1.5rem',
    border: '1px solid var(--border-color)'
  };

  const parentLabelStyle = {
    'font-size': '0.875rem',
    'font-weight': '500',
    color: 'var(--text-muted)',
    'margin-bottom': '0.5rem'
  };

  const parentNameStyle = {
    'font-weight': '600',
    color: 'var(--text-primary)'
  };

  const parentDetailsStyle = {
    'font-size': '0.875rem',
    color: 'var(--text-secondary)'
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    const data = formData();
    

    console.log(data)
   
    if (!data.accountNumber || !data.name || !props.parentAccount) {
      alert(t('forms.requiredField'));
      return;
    }

    // Check if account number already exists
    const existingAccount = accountsStore.accounts.find(
      account => account.accountNumber === data.accountNumber
    );
    
    console.log(existingAccount)

    if (existingAccount) {
      alert(t('forms.duplicateAccountNumber'));
      return;
    }

    

    const newSubAccount: Omit<AccountingAccount, 'id' | 'createdDate' | 'lastModified'> = {
      accountNumber: data.accountNumber,
      code: data.accountNumber,
      name: data.name,
      description: data.description,
      accountType: props.parentAccount.accountType, // Sub-account inherits parent's type
      category: props.parentAccount.category,
      classification: props.parentAccount?.classification,
      type: props.parentAccount?.type ,
      isActive: data.isActive === 'true',
      parentAccountId: props.parentAccount.id,
      parentAccountNumber: props.parentAccount.accountId
    };


    
    accountsStore.addAccount(newSubAccount);
    
    // Reset form
    setFormData({
      accountNumber: '',
      name: '',
      category: '',
      description: '',
      balance: '0',
      isActive: 'true'
    });
    
    props.onClose();
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Generate suggested account number based on parent
  const generateSuggestedAccountNumber = () => {
    if (!props.parentAccount) return '';
    
    const parentNumber = props.parentAccount.accountNumber;
    const subAccounts = accountsStore.getSubAccounts(props.parentAccount.id);
    const nextSubNumber = subAccounts.length + 1;
    
    // If parent is 1000, suggest 1001, 1002, etc.
    const baseNumber = parseInt(parentNumber);
    const suggestedNumber = baseNumber + nextSubNumber;
    
    return suggestedNumber.toString();
  };

  // Auto-populate suggested account number when modal opens
  const getSuggestedNumber = () => {
    if (formData().accountNumber === '' && props.parentAccount) {
      return generateSuggestedAccountNumber();
    }
    return formData().accountNumber;
  };

  return (
    <Modal isOpen={props.isOpen} onClose={props.onClose} title={`${t('common.add')} ${t('accounts.subAccounts')}`}>
      {props.parentAccount && (
        <div style={parentInfoStyle}>
          <div style={parentLabelStyle}>{t('accounts.parentAccount')}</div>
          <div style={parentNameStyle}>
            {props.parentAccount.accountNumber} - {props.parentAccount.name}
          </div>
          <div style={parentDetailsStyle}>
            {t(`accounts.types.${props.parentAccount?.accountType?.toLowerCase()}`)} • {props.parentAccount.category}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <FormInput
          label={t('accounts.accountNumber')}
          value={getSuggestedNumber()}
          onChange={(value) => updateFormData('accountNumber', value)}
          placeholder={`${t('common.suggested')}: ${generateSuggestedAccountNumber()}`}
          required
        />
        
        <FormInput
          label={t('accounts.accountName')}
          value={formData().name}
          onChange={(value) => updateFormData('name', value)}
          placeholder={t('accounts.accountName')}
          required
        />
        
      
        
        <FormInput
          label={t('common.description')}
          value={formData().description}
          onChange={(value) => updateFormData('description', value)}
          placeholder={t('common.description')}
        />
        
        <FormInput
          label={t('accounts.balance')}
          type="number"
          value={formData().balance}
          onChange={(value) => updateFormData('balance', value)}
          placeholder={t('accounts.balance')}
        />
        
        <FormSelect
          label={t('common.status')}
          value={formData().isActive}
          onChange={(value) => updateFormData('isActive', value)}
          options={activeOptions}
          required
        />

        <div style={buttonGroupStyle}>
          <Button variant="secondary" type="button" onClick={props.onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" type="submit">
            {t('common.add')} {t('accounts.subAccounts')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddSubAccountModal;