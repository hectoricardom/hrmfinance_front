import { Component, createSignal, createMemo, For, Show } from 'solid-js';
import { customAutomationService, QuickTransactionParams, CustomAutomationParams } from '../services/customAutomationService';

const CustomAutomationPanel: Component = () => {
  const [activeTab, setActiveTab] = createSignal<'quick' | 'custom' | 'complex'>('quick');
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [successMessage, setSuccessMessage] = createSignal<string>('');
  const [errorMessage, setErrorMessage] = createSignal<string>('');

  // Quick Transaction Form
  const [quickForm, setQuickForm] = createSignal<QuickTransactionParams>({
    transactionType: 'cash_sale',
    amount: 0,
    description: '',
    reference: '',
    paymentMethod: 'cash',
    postImmediately: false
  });

  // Custom Entry Form
  const [customForm, setCustomForm] = createSignal<CustomAutomationParams>({
    type: 'manual_entry',
    description: '',
    reference: '',
    date: new Date().toISOString().split('T')[0],
    entries: [{
      debitAccountId: '1001',
      creditAccountId: '4001',
      amount: 0,
      description: ''
    }],
    postImmediately: false
  });

  const accounts = createMemo(() => customAutomationService.getAvailableAccounts());
  const templates = createMemo(() => customAutomationService.getTransactionTemplates());

  const clearMessages = () => {
    setSuccessMessage('');
    setErrorMessage('');
  };

  const handleQuickTransaction = async () => {
    setIsSubmitting(true);
    clearMessages();
    
    try {
      const entryId = await customAutomationService.createQuickTransaction(quickForm());
      setSuccessMessage(`Transaction created successfully! Entry ID: ${entryId}`);
      
      // Reset form
      setQuickForm({
        transactionType: 'cash_sale',
        amount: 0,
        description: '',
        reference: '',
        paymentMethod: 'cash',
        postImmediately: false
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCustomEntry = async () => {
    setIsSubmitting(true);
    clearMessages();
    
    try {
      const entryId = await customAutomationService.createCustomEntry(customForm());
      setSuccessMessage(`Custom entry created successfully! Entry ID: ${entryId}`);
      
      // Reset form
      setCustomForm({
        type: 'manual_entry',
        description: '',
        reference: '',
        date: new Date().toISOString().split('T')[0],
        entries: [{
          debitAccountId: '1001',
          creditAccountId: '4001',
          amount: 0,
          description: ''
        }],
        postImmediately: false
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadTemplate = (templateId: string) => {
    const template = templates().find(t => t.id === templateId);
    if (template) {
      setQuickForm(prev => ({
        ...prev,
        transactionType: template.type,
        description: template.description
      }));
    }
  };

  const addCustomEntry = () => {
    setCustomForm(prev => ({
      ...prev,
      entries: [...prev.entries, {
        debitAccountId: '1001',
        creditAccountId: '4001',
        amount: 0,
        description: ''
      }]
    }));
  };

  const removeCustomEntry = (index: number) => {
    setCustomForm(prev => ({
      ...prev,
      entries: prev.entries.filter((_, i) => i !== index)
    }));
  };

  const updateCustomEntry = (index: number, field: string, value: any) => {
    setCustomForm(prev => ({
      ...prev,
      entries: prev.entries.map((entry, i) => 
        i === index ? { ...entry, [field]: value } : entry
      )
    }));
  };

  const tabButtonStyle = (isActive: boolean) => ({
    padding: '0.5rem 1rem',
    border: 'none',
    'background-color': isActive ? '#3b82f6' : '#e5e7eb',
    color: isActive ? 'white' : '#374151',
    'border-radius': '0.375rem',
    cursor: 'pointer',
    'font-weight': isActive ? '600' : '400'
  });

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
    'background-color': '#3b82f6',
    color: 'white',
    border: 'none',
    'border-radius': '0.375rem',
    cursor: 'pointer',
    'font-weight': '500',
    'disabled:opacity': '0.5',
    'disabled:cursor': 'not-allowed'
  };

  return (
    <div style={{ 'max-width': '800px', margin: '0 auto', padding: '1rem' }}>
      <div style={{ 'margin-bottom': '2rem' }}>
        <h2 style={{ 'font-size': '1.5rem', 'font-weight': '700', 'margin-bottom': '1rem' }}>
          Custom Automation Panel
        </h2>
        <p style={{ color: '#6b7280', 'margin-bottom': '1.5rem' }}>
          Create manual journal entries with custom parameters on-demand.
        </p>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '0.5rem', 'margin-bottom': '2rem' }}>
          <button 
            style={tabButtonStyle(activeTab() === 'quick')}
            onClick={() => setActiveTab('quick')}
          >
            Quick Transactions
          </button>
          <button 
            style={tabButtonStyle(activeTab() === 'custom')}
            onClick={() => setActiveTab('custom')}
          >
            Custom Entries
          </button>
        </div>

        {/* Success/Error Messages */}
        {successMessage() && (
          <div style={{ 
            padding: '0.75rem', 
            'background-color': '#d1fae5', 
            color: '#047857', 
            'border-radius': '0.375rem',
            'margin-bottom': '1rem'
          }}>
            {successMessage()}
          </div>
        )}

        {errorMessage() && (
          <div style={{ 
            padding: '0.75rem', 
            'background-color': '#fef2f2', 
            color: '#dc2626', 
            'border-radius': '0.375rem',
            'margin-bottom': '1rem'
          }}>
            {errorMessage()}
          </div>
        )}

        {/* Quick Transactions Tab */}
        <Show when={activeTab() === 'quick'}>
       
          <div>
            <h3 style={{ 'font-size': '1.25rem', 'font-weight': '600', 'margin-bottom': '1rem' }}>
              Quick Transactions
            </h3>
            
            {/* Template Selector */}
            <div style={{ 'margin-bottom': '1.5rem' }}>
              <label style={{ display: 'block', 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
                Use Template:
              </label>
              <select 
                style={selectStyle}
                onChange={(e) => loadTemplate(e.currentTarget.value)}
              >
                <option value="">Select a template...</option>
                <For each={templates()}>
                  {(template) => (
                    <option value={template.id}>{template.name}</option>
                  )}
                </For>
              </select>
            </div>

            <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '1rem', 'margin-bottom': '1rem' }}>
              <div>
                <label style={{ display: 'block', 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
                  Transaction Type:
                </label>
                <select 
                  style={selectStyle}
                  value={quickForm().transactionType}
                  onChange={(e) => setQuickForm(prev => ({ ...prev, transactionType: e.currentTarget.value as any }))}
                >
                  <option value="cash_sale">Cash Sale</option>
                  <option value="credit_sale">Credit Sale</option>
                  <option value="expense_payment">Expense Payment</option>
                  <option value="customer_payment">Customer Payment</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
                  Payment Method:
                </label>
                <select 
                  style={selectStyle}
                  value={quickForm().paymentMethod}
                  onChange={(e) => setQuickForm(prev => ({ ...prev, paymentMethod: e.currentTarget.value as any }))}
                >
                  <option value="cash">Cash</option>
                  <option value="zelle">Zelle</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="check">Check</option>
                </select>
              </div>
            </div>

            <div style={{ 'margin-bottom': '1rem' }}>
              <label style={{ display: 'block', 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
                Amount:
              </label>
              <input 
                type="number" 
                style={inputStyle}
                value={quickForm().amount}
                onInput={(e) => setQuickForm(prev => ({ ...prev, amount: parseFloat(e.currentTarget.value) || 0 }))}
                step="0.01"
              />
            </div>

            <div style={{ 'margin-bottom': '1rem' }}>
              <label style={{ display: 'block', 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
                Description:
              </label>
              <input 
                type="text" 
                style={inputStyle}
                value={quickForm().description}
                onInput={(e) => setQuickForm(prev => ({ ...prev, description: e.currentTarget.value }))}
                placeholder="Enter transaction description"
              />
            </div>

            <div style={{ 'margin-bottom': '1rem' }}>
              <label style={{ display: 'block', 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
                Reference (Optional):
              </label>
              <input 
                type="text" 
                style={inputStyle}
                value={quickForm().reference}
                onInput={(e) => setQuickForm(prev => ({ ...prev, reference: e.currentTarget.value }))}
                placeholder="Invoice number, receipt, etc."
              />
            </div>

            <div style={{ 'margin-bottom': '1.5rem' }}>
              <label style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                <input 
                  type="checkbox"
                  checked={quickForm().postImmediately}
                  onChange={(e) => setQuickForm(prev => ({ ...prev, postImmediately: e.currentTarget.checked }))}
                />
                Post immediately (skip draft status)
              </label>
            </div>

            <button 
              style={buttonStyle}
              onClick={handleQuickTransaction}
              disabled={isSubmitting() || !quickForm().description || quickForm().amount <= 0}
            >
              {isSubmitting() ? 'Creating...' : 'Create Quick Transaction'}
            </button>
          </div>
       </Show>

        {/* Custom Entries Tab */}
        <Show when={activeTab() === 'custom'}>
      
          <div>
            <h3 style={{ 'font-size': '1.25rem', 'font-weight': '600', 'margin-bottom': '1rem' }}>
              Custom Journal Entries
            </h3>

            <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '1rem', 'margin-bottom': '1rem' }}>
              <div>
                <label style={{ display: 'block', 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
                  Entry Type:
                </label>
                <select 
                  style={selectStyle}
                  value={customForm().type}
                  onChange={(e) => setCustomForm(prev => ({ ...prev, type: e.currentTarget.value as any }))}
                >
                  <option value="manual_entry">Manual Entry</option>
                  <option value="transfer">Transfer</option>
                  <option value="adjustment">Adjustment</option>
                  <option value="payment">Payment</option>
                  <option value="receipt">Receipt</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
                  Date:
                </label>
                <input 
                  type="date" 
                  style={inputStyle}
                  value={customForm().date}
                  onInput={(e) => setCustomForm(prev => ({ ...prev, date: e.currentTarget.value }))}
                />
              </div>
            </div>

            <div style={{ 'margin-bottom': '1rem' }}>
              <label style={{ display: 'block', 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
                Description:
              </label>
              <input 
                type="text" 
                style={inputStyle}
                value={customForm().description}
                onInput={(e) => setCustomForm(prev => ({ ...prev, description: e.currentTarget.value }))}
                placeholder="Enter entry description"
              />
            </div>

            <div style={{ 'margin-bottom': '1.5rem' }}>
              <label style={{ display: 'block', 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
                Reference (Optional):
              </label>
              <input 
                type="text" 
                style={inputStyle}
                value={customForm().reference}
                onInput={(e) => setCustomForm(prev => ({ ...prev, reference: e.currentTarget.value }))}
                placeholder="Reference number or code"
              />
            </div>

            {/* Entry Lines */}
            <div style={{ 'margin-bottom': '1.5rem' }}>
              <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '1rem' }}>
                <h4 style={{ 'font-size': '1rem', 'font-weight': '600' }}>Entry Lines:</h4>
                <button 
                  style={{ ...buttonStyle, 'background-color': '#059669' }}
                  onClick={addCustomEntry}
                >
                  Add Line
                </button>
              </div>

              <For each={customForm().entries}>
                {(entry, index) => (
                  <div style={{ 
                    border: '1px solid #d1d5db', 
                    'border-radius': '0.375rem', 
                    padding: '1rem',
                    'margin-bottom': '1rem'
                  }}>
                    <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '1rem', 'margin-bottom': '1rem' }}>
                      <div>
                        <label style={{ display: 'block', 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
                          Debit Account:
                        </label>
                        <select 
                          style={selectStyle}
                          value={entry.debitAccountId}
                          onChange={(e) => updateCustomEntry(index(), 'debitAccountId', e.currentTarget.value)}
                        >
                          <For each={accounts()}>
                            {(account) => (
                              <option value={account.id}>{account.id} - {account.name}</option>
                            )}
                          </For>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
                          Credit Account:
                        </label>
                        <select 
                          style={selectStyle}
                          value={entry.creditAccountId}
                          onChange={(e) => updateCustomEntry(index(), 'creditAccountId', e.currentTarget.value)}
                        >
                          <For each={accounts()}>
                            {(account) => (
                              <option value={account.id}>{account.id} - {account.name}</option>
                            )}
                          </For>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'grid', 'grid-template-columns': '1fr 2fr auto', gap: '1rem', 'align-items': 'end' }}>
                      <div>
                        <label style={{ display: 'block', 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
                          Amount:
                        </label>
                        <input 
                          type="number" 
                          style={inputStyle}
                          value={entry.amount}
                          onInput={(e) => updateCustomEntry(index(), 'amount', parseFloat(e.currentTarget.value) || 0)}
                          step="0.01"
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
                          Line Description (Optional):
                        </label>
                        <input 
                          type="text" 
                          style={inputStyle}
                          value={entry.description || ''}
                          onInput={(e) => updateCustomEntry(index(), 'description', e.currentTarget.value)}
                          placeholder="Specific line description"
                        />
                      </div>

                      <div>
                        {customForm().entries.length > 1 && (
                          <button 
                            style={{ ...buttonStyle, 'background-color': '#dc2626' }}
                            onClick={() => removeCustomEntry(index())}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </For>
            </div>

            <div style={{ 'margin-bottom': '1.5rem' }}>
              <label style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                <input 
                  type="checkbox"
                  checked={customForm().postImmediately}
                  onChange={(e) => setCustomForm(prev => ({ ...prev, postImmediately: e.currentTarget.checked }))}
                />
                Post immediately (skip draft status)
              </label>
            </div>

            <button 
              style={buttonStyle}
              onClick={handleCustomEntry}
              disabled={isSubmitting() || !customForm().description || customForm().entries.some(e => e.amount <= 0)}
            >
              {isSubmitting() ? 'Creating...' : 'Create Custom Entry'}
            </button>
          </div>
       </Show>
      </div>
    </div>
  );
};

export default CustomAutomationPanel;