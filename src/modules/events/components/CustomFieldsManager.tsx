import { Component, createSignal, For, Show } from 'solid-js';
import { useTranslation } from '../../../translations';
import EnhancedSmartInput from './EnhancedSmartInput';
import { EventType, CustomField } from '../types/eventTypes';

interface CustomFieldsManagerProps {
  customFields: CustomField[];
  availableFields: Array<{ path: string; definition: any }>;
  eventType: EventType;
  onAdd: (field: Omit<CustomField, 'id'>) => void;
  onUpdate: (id: string, field: Partial<CustomField>) => void;
  onRemove: (id: string) => void;
}

const CustomFieldsManager: Component<CustomFieldsManagerProps> = (props) => {
  const { t } = useTranslation();
  const [showAddForm, setShowAddForm] = createSignal(false);
  const [editingField, setEditingField] = createSignal<string | null>(null);
  const [editingData, setEditingData] = createSignal<CustomField | null>(null);
  const [newField, setNewField] = createSignal<Omit<CustomField, 'id'>>({
    name: '',
    expression: '',
    description: ''
  });

  const handleAdd = () => {
    const field = newField();
    if (field.name.trim() && field.expression.trim()) {
      props.onAdd(field);
      setNewField({ name: '', expression: '', description: '' });
      setShowAddForm(false);
    }
  };

  const handleExpressionChange = (value: string) => {
    setNewField(prev => ({ ...prev, expression: value }));
  };

  const handleNameChange = (value: string) => {
    setNewField(prev => ({ ...prev, name: value }));
  };

  const handleDescriptionChange = (value: string) => {
    setNewField(prev => ({ ...prev, description: value }));
  };

  const startEdit = (field: CustomField) => {
    setEditingField(field.id);
    setEditingData({ ...field });
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditingData(null);
  };

  const saveEdit = () => {
    const data = editingData();
    const fieldId = editingField();
    if (data && fieldId) {
      props.onUpdate(fieldId, {
        name: data.name,
        expression: data.expression,
        description: data.description
      });
      setEditingField(null);
      setEditingData(null);
    }
  };

  const updateEditingField = (field: keyof CustomField, value: string) => {
    setEditingData(prev => prev ? { ...prev, [field]: value } : null);
  };

  const insertCommonExpression = (expression: string) => {
    setNewField(prev => ({ ...prev, expression: expression }));
  };

  const commonExpressions = [
    {
      label: 'Total with Tax',
      expression: 'data.subtotalAmount + data.taxAmount',
      description: 'Subtotal plus tax amount'
    },
    {
      label: 'Total Payments',
      expression: 'data.paymentMethods.cash + data.paymentMethods.zelle + data.paymentMethods.creditCard',
      description: 'Sum of all payment methods'
    },
    {
      label: 'Customer Info',
      expression: 'data.customerName + " (" + data.customerId + ")"',
      description: 'Customer name with ID'
    },
    {
      label: 'Invoice Reference',
      expression: '"Invoice " + data.invoice + " - " + data.customerName',
      description: 'Complete invoice reference'
    }
  ];

  const containerStyle = {
    border: '1px solid #d1d5db',
    'border-radius': '0.5rem',
    'background-color': '#f9fafb',
    padding: '1.5rem'
  };

  const headerStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '1.5rem'
  };

  const buttonStyle = {
    padding: '0.5rem 1rem',
    'background-color': '#3b82f6',
    color: 'white',
    border: 'none',
    'border-radius': '0.375rem',
    cursor: 'pointer',
    'font-weight': '500',
    'font-size': '0.875rem'
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    'background-color': '#6b7280'
  };

  const dangerButtonStyle = {
    ...buttonStyle,
    'background-color': '#ef4444'
  };

  const inputStyle = {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    'border-radius': '0.375rem',
    'font-size': '0.875rem'
  };

  const fieldCardStyle = {
    'background-color': 'white',
    border: '1px solid #e5e7eb',
    'border-radius': '0.375rem',
    padding: '1rem',
    'margin-bottom': '1rem'
  };

  const addFormStyle = {
    'background-color': 'white',
    border: '1px solid #d1d5db',
    'border-radius': '0.375rem',
    padding: '1.5rem',
    'margin-bottom': '1.5rem'
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div>
          <h3 style={{ 'font-size': '1.125rem', 'font-weight': '600', margin: '0 0 0.25rem 0' }}>
            🛠️ Custom Fields
          </h3>
          <p style={{ 'font-size': '0.875rem', color: '#6b7280', margin: '0' }}>
            Create custom expressions by combining interface fields
          </p>
        </div>
        <button
          style={buttonStyle}
          onClick={() => setShowAddForm(!showAddForm())}
        >
          + Add Custom Field
        </button>
      </div>
      
      {/* Save reminder */}
      <Show when={props.customFields.length > 0}>
        <div style={{
          'background-color': '#fef3c7',
          border: '1px solid #f59e0b',
          'border-radius': '0.375rem',
          padding: '0.75rem',
          'margin-bottom': '1rem',
          display: 'flex',
          'align-items': 'center',
          gap: '0.5rem'
        }}>
          <span style={{ 'font-size': '1.25rem' }}>💡</span>
          <p style={{ 'font-size': '0.875rem', color: '#92400e', margin: '0' }}>
            <strong>Note:</strong> Remember to click the "Save" or "Update" button at the bottom of the form to persist all custom field changes.
          </p>
        </div>
      </Show>

      {/* Add Custom Field Form */}
      <Show when={showAddForm()}>
        <div style={addFormStyle}>
          <h4 style={{ 'font-size': '1rem', 'font-weight': '600', 'margin-bottom': '1rem' }}>
            Create New Custom Field
          </h4>
          
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <Show when={props.eventType}>
                <EnhancedSmartInput
                  label="Field Name *"
                  value={newField().name}
                  onChange={handleNameChange}
                  eventType={props.eventType}
                  placeholder="e.g., totalWithTax, customerInfo"
                  type="text"
                  helpText="Name for your custom field (camelCase recommended)"
                  required={true}
                  customFields={props.customFields}
                />
              </Show>
            </div>
            
            <div>
              <Show when={props.eventType}>
                <EnhancedSmartInput
                  label="Expression *"
                  value={newField().expression}
                  onChange={handleExpressionChange}
                  eventType={props.eventType}
                  placeholder="e.g., data.subtotal + data.tax"
                  type="expression"
                  helpText="JavaScript expression using event data fields and functions"
                  required={true}
                  customFields={props.customFields}
                />
              </Show>
              
              {/* Common Expressions */}
              <div style={{ 'margin-top': '0.75rem' }}>
                <p style={{ 'font-size': '0.75rem', color: '#6b7280', 'margin-bottom': '0.5rem' }}>
                  💡 Quick templates:
                </p>
                <div style={{ display: 'flex', 'flex-wrap': 'wrap', gap: '0.5rem' }}>
                  <For each={commonExpressions}>
                    {(expr) => (
                      <button
                        type="button"
                        style={{
                          padding: '0.25rem 0.5rem',
                          'background-color': '#f3f4f6',
                          color: '#374151',
                          border: '1px solid #d1d5db',
                          'border-radius': '0.25rem',
                          cursor: 'pointer',
                          'font-size': '0.75rem'
                        }}
                        onClick={() => insertCommonExpression(expr.expression)}
                        title={expr.description}
                      >
                        {expr.label}
                      </button>
                    )}
                  </For>
                </div>
              </div>
            </div>
            
            <div>
              <Show when={props.eventType}>
                <EnhancedSmartInput
                  label="Description"
                  value={newField().description}
                  onChange={handleDescriptionChange}
                  eventType={props.eventType}
                  placeholder="Describe what this field represents"
                  type="text"
                  helpText="Brief description of what this custom field calculates"
                  customFields={props.customFields}
                />
              </Show>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem', 'justify-content': 'flex-end' }}>
              <button
                style={secondaryButtonStyle}
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </button>
              <button
                style={buttonStyle}
                onClick={handleAdd}
              >
                Create Field
              </button>
            </div>
          </div>
        </div>
      </Show>

      {/* Custom Fields List */}
      <div>
        <Show when={props.customFields.length === 0}>
          <div style={{
            padding: '3rem',
            'text-align': 'center',
            color: '#6b7280',
            'background-color': 'white',
            'border-radius': '0.375rem',
            border: '1px solid #e5e7eb'
          }}>
            <p style={{ 'font-size': '1rem', 'margin-bottom': '0.5rem' }}>No custom fields created yet</p>
            <p style={{ 'font-size': '0.875rem' }}>
              Create custom fields to combine multiple interface fields into reusable expressions
            </p>
          </div>
        </Show>

        <For each={props.customFields}>
          {(field) => (
            <div style={fieldCardStyle}>
              <Show when={editingField() === field.id} fallback={
                // Display mode
                <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'start' }}>
                  <div style={{ 'flex-grow': '1' }}>
                    <div style={{ display: 'flex', 'align-items': 'center', gap: '0.75rem', 'margin-bottom': '0.5rem' }}>
                      <h4 style={{ 
                        'font-size': '1rem', 
                        'font-weight': '600', 
                        margin: '0',
                        color: '#1f2937'
                      }}>
                        {field.name}
                      </h4>
                      <span style={{
                        'font-size': '0.7rem',
                        padding: '0.125rem 0.5rem',
                        'background-color': '#dbeafe',
                        color: '#1e40af',
                        'border-radius': '0.25rem',
                        'font-weight': '500'
                      }}>
                        custom field
                      </span>
                    </div>
                    
                    <div style={{ 'margin-bottom': '0.5rem' }}>
                      <code style={{ 
                        'font-size': '0.875rem', 
                        color: '#4b5563',
                        'font-family': 'monospace',
                        'background-color': '#f3f4f6',
                        padding: '0.5rem',
                        'border-radius': '0.25rem',
                        display: 'block'
                      }}>
                        {field.expression}
                      </code>
                    </div>
                    
                    <Show when={field.description}>
                      <p style={{ 'font-size': '0.875rem', color: '#6b7280', margin: '0' }}>
                        {field.description}
                      </p>
                    </Show>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      style={{
                        ...secondaryButtonStyle,
                        padding: '0.5rem',
                        'font-size': '0.75rem'
                      }}
                      onClick={() => startEdit(field)}
                    >
                      Edit
                    </button>
                    <button
                      style={{
                        ...dangerButtonStyle,
                        padding: '0.5rem',
                        'font-size': '0.75rem'
                      }}
                      onClick={() => props.onRemove(field.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              }>
                {/* Edit mode */}
                <div>
                  <h4 style={{ 'font-size': '1rem', 'font-weight': '600', 'margin-bottom': '1rem' }}>
                    Edit Custom Field
                  </h4>
                  
                  <div style={{ display: 'grid', gap: '1rem', 'margin-bottom': '1rem' }}>
                    <div>
                      <Show when={props.eventType}>
                        <EnhancedSmartInput
                          label="Field Name *"
                          value={editingData()?.name || ''}
                          onChange={(value) => updateEditingField('name', value)}
                          eventType={props.eventType}
                          placeholder="e.g., totalWithTax, customerInfo"
                          type="text"
                          helpText="Name for your custom field (camelCase recommended)"
                          required={true}
                          customFields={props.customFields}
                        />
                      </Show>
                    </div>
                    
                    <div>
                      <Show when={props.eventType}>
                        <EnhancedSmartInput
                          label="Expression *"
                          value={editingData()?.expression || ''}
                          onChange={(value) => updateEditingField('expression', value)}
                          eventType={props.eventType}
                          placeholder="e.g., data.subtotal + data.tax"
                          type="expression"
                          helpText="JavaScript expression using event data fields and functions"
                          required={true}
                          customFields={props.customFields}
                        />
                      </Show>
                    </div>
                    
                    <div>
                      <Show when={props.eventType}>
                        <EnhancedSmartInput
                          label="Description"
                          value={editingData()?.description || ''}
                          onChange={(value) => updateEditingField('description', value)}
                          eventType={props.eventType}
                          placeholder="Describe what this field represents"
                          type="text"
                          helpText="Brief description of what this custom field calculates"
                          customFields={props.customFields}
                        />
                      </Show>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.5rem', 'justify-content': 'flex-end' }}>
                    <button
                      style={secondaryButtonStyle}
                      onClick={cancelEdit}
                    >
                      Cancel
                    </button>
                    <button
                      style={buttonStyle}
                      onClick={saveEdit}
                    >
                      Update Field
                    </button>
                  </div>
                </div>
              </Show>
            </div>
          )}
        </For>
      </div>
    </div>
  );
};

export default CustomFieldsManager;