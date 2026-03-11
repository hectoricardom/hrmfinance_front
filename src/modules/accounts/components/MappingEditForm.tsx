import { Component, createSignal, For } from 'solid-js';
import { AccountMapping } from '../types/automationTypes';

interface MappingEditFormProps {
  mapping?: AccountMapping | null;
  onSave: (mapping: AccountMapping) => void;
  onCancel: () => void;
}

const MappingEditForm: Component<MappingEditFormProps> = (props) => {
  const isEditing = () => props.mapping && props.mapping.id;
  
  const [formData, setFormData] = createSignal<Partial<AccountMapping>>({
    id: props.mapping?.id || '',
    name: props.mapping?.name || '',
    description: props.mapping?.description || '',
    transactionType: props.mapping?.transactionType || 'cashSale',
    debitAccountId: props.mapping?.debitAccountId || '1001',
    creditAccountId: props.mapping?.creditAccountId || '4001',
    conditions: props.mapping?.conditions || [],
    isActive: props.mapping?.isActive ?? true
  });

  const availableAccounts = [
    { id: '1001', name: 'Cash - Operating Account' },
    { id: '1002', name: 'Cash - Zelle Account' },
    { id: '1003', name: 'Cash - Credit Card Processing' },
    { id: '1101', name: 'Accounts Receivable - Customers' },
    { id: '1201', name: 'Inventory - Products' },
    { id: '1401', name: 'Customs Fees Receivable' },
    { id: '2001', name: 'Accounts Payable' },
    { id: '2301', name: 'Sales Tax Payable' },
    { id: '2302', name: 'Customs Fees Payable' },
    { id: '3001', name: 'Owner\'s Equity' },
    { id: '4001', name: 'Sales Revenue - Products' },
    { id: '4101', name: 'Service Revenue - General' },
    { id: '4201', name: 'Transport Service Revenue' },
    { id: '5001', name: 'Cost of Goods Sold - Products' },
    { id: '5201', name: 'Salaries and Wages' },
    { id: '5301', name: 'Utilities Expense' }
  ];

  const transactionTypes = [
    { value: 'cashSale', label: 'Cash Sale' },
    { value: 'creditSale', label: 'Credit Sale' },
    { value: 'serviceRevenue', label: 'Service Revenue' },
    { value: 'transportRevenue', label: 'Transport Revenue' },
    { value: 'inventoryPurchase', label: 'Inventory Purchase' },
    { value: 'expense', label: 'General Expense' },
    { value: 'customsFees', label: 'Customs Fees' },
    { value: 'salesTax', label: 'Sales Tax' }
  ];

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    const data = formData();
    
    // Validate required fields
    if (!data.name || !data.transactionType || !data.debitAccountId || !data.creditAccountId) {
      alert('Please fill in all required fields');
      return;
    }

    const mapping: AccountMapping = {
      id: data.id || `mapping_${Date.now()}`,
      name: data.name,
      description: data.description || '',
      transactionType: data.transactionType as any,
      debitAccountId: data.debitAccountId,
      creditAccountId: data.creditAccountId,
      conditions: data.conditions || [],
      isActive: data.isActive ?? true,
      createdAt: props.mapping?.createdAt || new Date(),
      updatedAt: new Date()
    };

    props.onSave(mapping);
  };

  const inputStyle = {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    'border-radius': '0.375rem',
    'font-size': '0.875rem'
  };

  const selectStyle = {
    ...inputStyle,
    'background-color': 'white'
  };

  const buttonStyle = {
    padding: '0.5rem 1rem',
    'border-radius': '0.375rem',
    cursor: 'pointer',
    'font-weight': '500',
    border: '1px solid #d1d5db'
  };

  const primaryButtonStyle = {
    ...buttonStyle,
    'background-color': '#3b82f6',
    color: 'white',
    border: 'none'
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    'background-color': 'white',
    color: '#374151'
  };

  return (
    <div style={{
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      'background-color': 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      'align-items': 'center',
      'justify-content': 'center',
      'z-index': '1000'
    }}>
      <div style={{
        'background-color': 'white',
        'border-radius': '0.5rem',
        padding: '2rem',
        'max-width': '600px',
        'max-height': '90vh',
        'overflow-y': 'auto',
        width: '90%'
      }}>
        <h2 style={{ 'font-size': '1.5rem', 'font-weight': '700', 'margin-bottom': '1.5rem' }}>
          {isEditing() ? 'Edit Account Mapping' : 'Add New Account Mapping'}
        </h2>

        {/* Basic Information */}
        <div style={{ 'margin-bottom': '1.5rem' }}>
          <div style={{ 'margin-bottom': '1rem' }}>
            <label style={{ display: 'block', 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
              Mapping Name *
            </label>
            <input
              type="text"
              style={inputStyle}
              value={formData().name || ''}
              onInput={(e) => updateFormData('name', e.currentTarget.value)}
              placeholder="Enter mapping name"
            />
          </div>

          <div style={{ 'margin-bottom': '1rem' }}>
            <label style={{ display: 'block', 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
              Description
            </label>
            <textarea
              style={{ ...inputStyle, height: '3rem', resize: 'vertical' as const }}
              value={formData().description || ''}
              onInput={(e) => updateFormData('description', e.currentTarget.value)}
              placeholder="Describe when this mapping should be used"
            />
          </div>

          <div style={{ 'margin-bottom': '1rem' }}>
            <label style={{ display: 'block', 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
              Transaction Type *
            </label>
            <select
              style={selectStyle}
              value={formData().transactionType || ''}
              onChange={(e) => updateFormData('transactionType', e.currentTarget.value)}
            >
              <For each={transactionTypes}>
                {(type) => <option value={type.value}>{type.label}</option>}
              </For>
            </select>
          </div>

          <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '1rem', 'margin-bottom': '1rem' }}>
            <div>
              <label style={{ display: 'block', 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
                Debit Account *
              </label>
              <select
                style={selectStyle}
                value={formData().debitAccountId || ''}
                onChange={(e) => updateFormData('debitAccountId', e.currentTarget.value)}
              >
                <For each={availableAccounts}>
                  {(account) => <option value={account.id}>{account.id} - {account.name}</option>}
                </For>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
                Credit Account *
              </label>
              <select
                style={selectStyle}
                value={formData().creditAccountId || ''}
                onChange={(e) => updateFormData('creditAccountId', e.currentTarget.value)}
              >
                <For each={availableAccounts}>
                  {(account) => <option value={account.id}>{account.id} - {account.name}</option>}
                </For>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={formData().isActive ?? true}
                onChange={(e) => updateFormData('isActive', e.currentTarget.checked)}
              />
              Active
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', 'justify-content': 'flex-end', gap: '1rem' }}>
          <button style={secondaryButtonStyle} onClick={props.onCancel}>
            Cancel
          </button>
          <button style={primaryButtonStyle} onClick={handleSave}>
            {isEditing() ? 'Update Mapping' : 'Create Mapping'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MappingEditForm;