import { Component, createSignal, For } from 'solid-js';
import { AutomationRule } from '../types/automationTypes';
import { accountAutomationStore } from '../stores/accountAutomationStore';

interface RuleEditFormProps {
  rule?: AutomationRule | null;
  onSave: (rule: AutomationRule) => void;
  onCancel: () => void;
}

const RuleEditForm: Component<RuleEditFormProps> = (props) => {
  const isEditing = () => props.rule && props.rule.id;
  
  const [formData, setFormData] = createSignal<Partial<AutomationRule>>({
    id: props.rule?.id || '',
    name: props.rule?.name || '',
    description: props.rule?.description || '',
    triggerEvent: props.rule?.triggerEvent || 'invoice_completed',
    isActive: props.rule?.isActive ?? true,
    priority: props.rule?.priority || 100,
    conditions: props.rule?.conditions || [{
      field: '',
      operator: 'greaterThan',
      value: 0
    }],
    actions: props.rule?.actions || [{
      type: 'create_journal_entry',
      accountMappings: [{
        debitAccountId: '1001',
        creditAccountId: '4001',
        amountExpression: '',
        description: ''
      }]
    }]
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

  const triggerEvents = [
    { value: 'invoice_completed', label: 'Invoice Completed' },
    { value: 'payment_received', label: 'Payment Received' },
    { value: 'service_rendered', label: 'Service Rendered' },
    { value: 'inventory_movement', label: 'Inventory Movement' },
    { value: 'tax_calculated', label: 'Tax Calculated' }
  ];

  const operators = [
    { value: 'equals', label: 'Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'greaterThan', label: 'Greater Than' },
    { value: 'lessThan', label: 'Less Than' },
    { value: 'in', label: 'In Array' }
  ];

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addCondition = () => {
    const data = formData();
    setFormData({
      ...data,
      conditions: [...(data.conditions || []), {
        field: '',
        operator: 'greaterThan',
        value: 0
      }]
    });
  };

  const removeCondition = (index: number) => {
    const data = formData();
    setFormData({
      ...data,
      conditions: data.conditions?.filter((_, i) => i !== index) || []
    });
  };

  const updateCondition = (index: number, field: string, value: any) => {
    const data = formData();
    const conditions = [...(data.conditions || [])];
    conditions[index] = { ...conditions[index], [field]: value };
    setFormData({ ...data, conditions });
  };

  const addAccountMapping = () => {
    const data = formData();
    const actions = [...(data.actions || [])];
    if (actions[0]) {
      actions[0] = {
        ...actions[0],
        accountMappings: [...(actions[0].accountMappings || []), {
          debitAccountId: '1001',
          creditAccountId: '4001',
          amountExpression: '',
          description: ''
        }]
      };
    }
    setFormData({ ...data, actions });
  };

  const removeAccountMapping = (index: number) => {
    const data = formData();
    const actions = [...(data.actions || [])];
    if (actions[0]) {
      actions[0] = {
        ...actions[0],
        accountMappings: actions[0].accountMappings?.filter((_, i) => i !== index) || []
      };
    }
    setFormData({ ...data, actions });
  };

  const updateAccountMapping = (index: number, field: string, value: any) => {
    const data = formData();
    const actions = [...(data.actions || [])];
    if (actions[0]) {
      const mappings = [...(actions[0].accountMappings || [])];
      mappings[index] = { ...mappings[index], [field]: value };
      actions[0] = { ...actions[0], accountMappings: mappings };
    }
    setFormData({ ...data, actions });
  };

  const handleSave = () => {
    const data = formData();
    
    // Validate required fields
    if (!data.name || !data.description || !data.triggerEvent) {
      alert('Please fill in all required fields');
      return;
    }

    const rule: AutomationRule = {
      id: data.id || `rule_${Date.now()}`,
      name: data.name,
      description: data.description,
      triggerEvent: data.triggerEvent,
      isActive: data.isActive ?? true,
      priority: data.priority || 100,
      conditions: data.conditions || [],
      actions: data.actions || []
    };

    props.onSave(rule);
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

  const dangerButtonStyle = {
    ...buttonStyle,
    'background-color': '#ef4444',
    color: 'white',
    border: 'none'
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
        'max-width': '800px',
        'max-height': '90vh',
        'overflow-y': 'auto',
        width: '90%'
      }}>
        <h2 style={{ 'font-size': '1.5rem', 'font-weight': '700', 'margin-bottom': '1.5rem' }}>
          {isEditing() ? 'Edit Automation Rule' : 'Add New Automation Rule'}
        </h2>

        {/* Basic Information */}
        <div style={{ 'margin-bottom': '1.5rem' }}>
          <h3 style={{ 'font-size': '1.125rem', 'font-weight': '600', 'margin-bottom': '1rem' }}>
            Basic Information
          </h3>
          
          <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '1rem', 'margin-bottom': '1rem' }}>
            <div>
              <label style={{ display: 'block', 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
                Rule Name *
              </label>
              <input
                type="text"
                style={inputStyle}
                value={formData().name || ''}
                onInput={(e) => updateFormData('name', e.currentTarget.value)}
                placeholder="Enter rule name"
              />
            </div>
            
            <div>
              <label style={{ display: 'block', 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
                Priority
              </label>
              <input
                type="number"
                style={inputStyle}
                value={formData().priority || 100}
                onInput={(e) => updateFormData('priority', parseInt(e.currentTarget.value) || 100)}
                min="1"
                max="1000"
              />
            </div>
          </div>

          <div style={{ 'margin-bottom': '1rem' }}>
            <label style={{ display: 'block', 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
              Description *
            </label>
            <textarea
              style={{ ...inputStyle, height: '4rem', resize: 'vertical' as const }}
              value={formData().description || ''}
              onInput={(e) => updateFormData('description', e.currentTarget.value)}
              placeholder="Describe what this rule does"
            />
          </div>

          <div style={{ display: 'grid', 'grid-template-columns': '1fr auto', gap: '1rem', 'align-items': 'end' }}>
            <div>
              <label style={{ display: 'block', 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
                Trigger Event *
              </label>
              <select
                style={selectStyle}
                value={formData().triggerEvent || ''}
                onChange={(e) => updateFormData('triggerEvent', e.currentTarget.value)}
              >
                <For each={triggerEvents}>
                  {(event) => <option value={event.value}>{event.label}</option>}
                </For>
              </select>
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
        </div>

        {/* Conditions */}
        <div style={{ 'margin-bottom': '1.5rem' }}>
          <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '1rem' }}>
            <h3 style={{ 'font-size': '1.125rem', 'font-weight': '600' }}>
              Conditions
            </h3>
            <button style={secondaryButtonStyle} onClick={addCondition}>
              Add Condition
            </button>
          </div>

          <For each={formData().conditions || []}>
            {(condition, index) => (
              <div style={{
                border: '1px solid #d1d5db',
                'border-radius': '0.375rem',
                padding: '1rem',
                'margin-bottom': '1rem'
              }}>
                <div style={{ display: 'grid', 'grid-template-columns': '2fr 1fr 1fr auto', gap: '1rem', 'align-items': 'end' }}>
                  <div>
                    <label style={{ display: 'block', 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
                      Field
                    </label>
                    <input
                      type="text"
                      style={inputStyle}
                      value={condition.field}
                      onInput={(e) => updateCondition(index(), 'field', e.currentTarget.value)}
                      placeholder="e.g., invoice.total, paymentMethods.cash"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
                      Operator
                    </label>
                    <select
                      style={selectStyle}
                      value={condition.operator}
                      onChange={(e) => updateCondition(index(), 'operator', e.currentTarget.value)}
                    >
                      <For each={operators}>
                        {(op) => <option value={op.value}>{op.label}</option>}
                      </For>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
                      Value
                    </label>
                    <input
                      type={condition.operator === 'greaterThan' || condition.operator === 'lessThan' ? 'number' : 'text'}
                      style={inputStyle}
                      value={condition.value}
                      onInput={(e) => updateCondition(index(), 'value', 
                        condition.operator === 'greaterThan' || condition.operator === 'lessThan' 
                          ? parseFloat(e.currentTarget.value) || 0 
                          : e.currentTarget.value
                      )}
                    />
                  </div>

                  <div>
                    {(formData().conditions?.length || 0) > 1 && (
                      <button style={dangerButtonStyle} onClick={() => removeCondition(index())}>
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </For>
        </div>

        {/* Account Mappings */}
        <div style={{ 'margin-bottom': '2rem' }}>
          <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '1rem' }}>
            <h3 style={{ 'font-size': '1.125rem', 'font-weight': '600' }}>
              Account Mappings
            </h3>
            <button style={secondaryButtonStyle} onClick={addAccountMapping}>
              Add Mapping
            </button>
          </div>

          <For each={formData().actions?.[0]?.accountMappings || []}>
            {(mapping, index) => (
              <div style={{
                border: '1px solid #d1d5db',
                'border-radius': '0.375rem',
                padding: '1rem',
                'margin-bottom': '1rem'
              }}>
                <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '1rem', 'margin-bottom': '1rem' }}>
                  <div>
                    <label style={{ display: 'block', 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
                      Debit Account
                    </label>
                    <select
                      style={selectStyle}
                      value={mapping.debitAccountId}
                      onChange={(e) => updateAccountMapping(index(), 'debitAccountId', e.currentTarget.value)}
                    >
                      <For each={availableAccounts}>
                        {(account) => <option value={account.id}>{account.id} - {account.name}</option>}
                      </For>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
                      Credit Account
                    </label>
                    <select
                      style={selectStyle}
                      value={mapping.creditAccountId}
                      onChange={(e) => updateAccountMapping(index(), 'creditAccountId', e.currentTarget.value)}
                    >
                      <For each={availableAccounts}>
                        {(account) => <option value={account.id}>{account.id} - {account.name}</option>}
                      </For>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', 'grid-template-columns': '1fr 2fr auto', gap: '1rem', 'align-items': 'end' }}>
                  <div>
                    <label style={{ display: 'block', 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
                      Amount Expression
                    </label>
                    <input
                      type="text"
                      style={inputStyle}
                      value={mapping.amountExpression}
                      onInput={(e) => updateAccountMapping(index(), 'amountExpression', e.currentTarget.value)}
                      placeholder="e.g., invoice.total, paymentMethods.cash"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
                      Description Template
                    </label>
                    <input
                      type="text"
                      style={inputStyle}
                      value={mapping.description}
                      onInput={(e) => updateAccountMapping(index(), 'description', e.currentTarget.value)}
                      placeholder="e.g., Sale - Invoice #{invoice}"
                    />
                  </div>

                  <div>
                    {(formData().actions?.[0]?.accountMappings?.length || 0) > 1 && (
                      <button style={dangerButtonStyle} onClick={() => removeAccountMapping(index())}>
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </For>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', 'justify-content': 'flex-end', gap: '1rem' }}>
          <button style={secondaryButtonStyle} onClick={props.onCancel}>
            Cancel
          </button>
          <button style={primaryButtonStyle} onClick={handleSave}>
            {isEditing() ? 'Update Rule' : 'Create Rule'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RuleEditForm;