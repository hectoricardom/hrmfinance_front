import { Component, createSignal, For, Show, createMemo } from 'solid-js';
import { FieldDefinition } from '../types/eventTypes';
import { useTranslation } from '../../../translations';

interface CustomField {
  id: string;
  name: string;
  expression: string;
  description: string;
}

interface FieldMapperProps {
  availableFields: Array<{ path: string; definition: FieldDefinition }>;
  onFieldSelect: (fieldPath: string) => void;
  customFields: CustomField[];
  onCustomFieldAdd: (field: Omit<CustomField, 'id'>) => void;
  onCustomFieldUpdate: (id: string, field: Partial<CustomField>) => void;
  onCustomFieldRemove: (id: string) => void;
}

const FieldMapper: Component<FieldMapperProps> = (props) => {
  const { t } = useTranslation();
  const [draggedField, setDraggedField] = createSignal<string | null>(null);
  const [showAddCustomField, setShowAddCustomField] = createSignal(false);
  const [newCustomField, setNewCustomField] = createSignal<Omit<CustomField, 'id'>>({
    name: '',
    expression: '',
    description: ''
  });
  const [searchTerm, setSearchTerm] = createSignal('');
  const [selectedCategory, setSelectedCategory] = createSignal<string>('all');

  // Filter fields based on search and category
  const filteredFields = createMemo(() => {
    const search = searchTerm().toLowerCase();
    const category = selectedCategory();
    
    return props.availableFields.filter(field => {
      const matchesSearch = !search || 
        field.path.toLowerCase().includes(search) ||
        field.definition.description.toLowerCase().includes(search);
      
      const matchesCategory = category === 'all' || 
        (category === 'required' && field.definition.required) ||
        (category === 'optional' && !field.definition.required) ||
        (category === 'number' && field.definition.type === 'number') ||
        (category === 'string' && field.definition.type === 'string') ||
        (category === 'date' && field.definition.type === 'date') ||
        (category === 'boolean' && field.definition.type === 'boolean');
      
      return matchesSearch && matchesCategory;
    });
  });

  const handleDragStart = (fieldPath: string, e: DragEvent) => {
    setDraggedField(fieldPath);
    e.dataTransfer!.effectAllowed = 'copy';
    e.dataTransfer!.setData('text/plain', fieldPath);
    
    // Add visual feedback
    (e.target as HTMLElement).style.opacity = '0.5';
  };

  const handleDragEnd = (e: DragEvent) => {
    setDraggedField(null);
    (e.target as HTMLElement).style.opacity = '1';
  };

  const handleCustomFieldAdd = () => {
    const field = newCustomField();
    if (field.name.trim() && field.expression.trim()) {
      props.onCustomFieldAdd(field);
      setNewCustomField({ name: '', expression: '', description: '' });
      setShowAddCustomField(false);
    }
  };

  const getFieldTypeColor = (type: string) => {
    switch (type) {
      case 'number': return '#dbeafe'; // blue
      case 'string': return '#fef3c7'; // yellow
      case 'boolean': return '#dcfce7'; // green
      case 'date': return '#f3e8ff'; // purple
      default: return '#f3f4f6'; // gray
    }
  };

  const getFieldTypeTextColor = (type: string) => {
    switch (type) {
      case 'number': return '#1e40af';
      case 'string': return '#92400e';
      case 'boolean': return '#166534';
      case 'date': return '#7c3aed';
      default: return '#374151';
    }
  };

  const fieldCategories = [
    { value: 'all', label: 'All Fields' },
    { value: 'required', label: 'Required' },
    { value: 'optional', label: 'Optional' },
    { value: 'number', label: 'Numbers' },
    { value: 'string', label: 'Text' },
    { value: 'date', label: 'Dates' },
    { value: 'boolean', label: 'Boolean' }
  ];

  const containerStyle = {
    display: 'grid',
    'grid-template-columns': '1fr 1fr',
    gap: '2rem',
    'max-height': '600px'
  };

  const sectionStyle = {
    border: '1px solid #d1d5db',
    'border-radius': '0.5rem',
    'background-color': '#f9fafb',
    padding: '1rem',
    height: '100%',
    display: 'flex',
    'flex-direction': 'column' as const
  };

  const fieldItemStyle = {
    padding: '0.75rem',
    margin: '0.25rem 0',
    'background-color': 'white',
    border: '1px solid #e5e7eb',
    'border-radius': '0.375rem',
    cursor: 'grab',
    'user-select': 'none' as const,
    transition: 'all 0.2s ease',
    display: 'flex',
    'flex-direction': 'column' as const,
    gap: '0.5rem'
  };

  const customFieldStyle = {
    ...fieldItemStyle,
    'border-left': '4px solid #3b82f6',
    'background-color': '#eff6ff'
  };

  const inputStyle = {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    'border-radius': '0.375rem',
    'font-size': '0.875rem'
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

  return (
    <div style={containerStyle}>
      {/* Available Fields Section */}
      <div style={sectionStyle}>
        <div style={{ 'margin-bottom': '1rem' }}>
          <h4 style={{ 'font-size': '1rem', 'font-weight': '600', 'margin-bottom': '0.75rem' }}>
            🗂️ Available Fields
          </h4>
          
          {/* Search and Filter */}
          <div style={{ display: 'grid', 'grid-template-columns': '1fr auto', gap: '0.5rem', 'margin-bottom': '0.75rem' }}>
            <input
              type="text"
              placeholder="Search fields..."
              value={searchTerm()}
              onInput={(e) => setSearchTerm(e.currentTarget.value)}
              style={inputStyle}
            />
            <select
              value={selectedCategory()}
              onChange={(e) => setSelectedCategory(e.currentTarget.value)}
              style={inputStyle}
            >
              <For each={fieldCategories}>
                {(category) => <option value={category.value}>{category.label}</option>}
              </For>
            </select>
          </div>
          
          <p style={{ 'font-size': '0.75rem', color: '#6b7280', 'margin-bottom': '0.75rem' }}>
            💡 Drag fields to use them in expressions or click to insert
          </p>
        </div>

        {/* Fields List */}
        <div style={{ 'flex-grow': '1', 'overflow-y': 'auto' }}>
          <For each={filteredFields()}>
            {(field) => (
              <div
                draggable
                onDragStart={(e) => handleDragStart(field.path, e)}
                onDragEnd={handleDragEnd}
                onClick={() => props.onFieldSelect(field.path)}
                style={{
                  ...fieldItemStyle,
                  'border-left': `4px solid ${getFieldTypeColor(field.definition.type)}`
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' }}>
                  <code style={{ 
                    'font-family': 'monospace', 
                    'font-size': '0.8rem', 
                    color: '#059669',
                    'font-weight': '600'
                  }}>
                    {field.path}
                  </code>
                  <span style={{
                    'font-size': '0.7rem',
                    padding: '0.125rem 0.375rem',
                    'background-color': getFieldTypeColor(field.definition.type),
                    color: getFieldTypeTextColor(field.definition.type),
                    'border-radius': '0.25rem',
                    'font-weight': '500'
                  }}>
                    {field.definition.type}
                    {field.definition.required && ' *'}
                  </span>
                </div>
                <p style={{ 'font-size': '0.75rem', color: '#6b7280', margin: '0' }}>
                  {field.definition.description}
                </p>
                <Show when={field.definition.example}>
                  <p style={{ 'font-size': '0.7rem', color: '#374151', margin: '0', 'font-style': 'italic' }}>
                    Example: <code style={{ 'background-color': '#f3f4f6', padding: '0.125rem 0.25rem', 'border-radius': '0.125rem' }}>
                      {typeof field.definition.example === 'object' 
                        ? JSON.stringify(field.definition.example) 
                        : field.definition.example}
                    </code>
                  </p>
                </Show>
              </div>
            )}
          </For>
        </div>
      </div>

      {/* Custom Fields Section */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '1rem' }}>
          <h4 style={{ 'font-size': '1rem', 'font-weight': '600' }}>
            🛠️ Custom Fields
          </h4>
          <button
            style={buttonStyle}
            onClick={() => setShowAddCustomField(!showAddCustomField())}
          >
            + Add Custom
          </button>
        </div>

        {/* Add Custom Field Form */}
        <Show when={showAddCustomField()}>
          <div style={{
            border: '1px solid #d1d5db',
            'border-radius': '0.375rem',
            padding: '1rem',
            'margin-bottom': '1rem',
            'background-color': 'white'
          }}>
            <h5 style={{ 'font-size': '0.875rem', 'font-weight': '600', 'margin-bottom': '0.75rem' }}>
              Create Custom Field
            </h5>
            
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', 'font-weight': '500', 'margin-bottom': '0.25rem', 'font-size': '0.75rem' }}>
                  Field Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g., totalWithTax"
                  value={newCustomField().name}
                  onInput={(e) => setNewCustomField(prev => ({ ...prev, name: e.currentTarget.value }))}
                  style={inputStyle}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', 'font-weight': '500', 'margin-bottom': '0.25rem', 'font-size': '0.75rem' }}>
                  Expression *
                </label>
                <input
                  type="text"
                  placeholder="e.g., data.subtotal + data.tax"
                  value={newCustomField().expression}
                  onInput={(e) => setNewCustomField(prev => ({ ...prev, expression: e.currentTarget.value }))}
                  style={inputStyle}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', 'font-weight': '500', 'margin-bottom': '0.25rem', 'font-size': '0.75rem' }}>
                  Description
                </label>
                <input
                  type="text"
                  placeholder="e.g., Total amount including tax"
                  value={newCustomField().description}
                  onInput={(e) => setNewCustomField(prev => ({ ...prev, description: e.currentTarget.value }))}
                  style={inputStyle}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem', 'justify-content': 'flex-end' }}>
                <button
                  style={secondaryButtonStyle}
                  onClick={() => setShowAddCustomField(false)}
                >
                  Cancel
                </button>
                <button
                  style={buttonStyle}
                  onClick={handleCustomFieldAdd}
                >
                  Add Field
                </button>
              </div>
            </div>
          </div>
        </Show>

        {/* Custom Fields List */}
        <div style={{ 'flex-grow': '1', 'overflow-y': 'auto' }}>
          <For each={props.customFields}>
            {(field) => (
              <div style={customFieldStyle}>
                <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'start' }}>
                  <div style={{ 'flex-grow': '1' }}>
                    <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', 'margin-bottom': '0.25rem' }}>
                      <code style={{ 
                        'font-family': 'monospace', 
                        'font-size': '0.8rem', 
                        color: '#1e40af',
                        'font-weight': '600'
                      }}>
                        {field.name}
                      </code>
                      <span style={{
                        'font-size': '0.7rem',
                        padding: '0.125rem 0.375rem',
                        'background-color': '#dbeafe',
                        color: '#1e40af',
                        'border-radius': '0.25rem',
                        'font-weight': '500'
                      }}>
                        custom
                      </span>
                    </div>
                    <code style={{ 
                      'font-size': '0.75rem', 
                      color: '#4b5563',
                      'font-family': 'monospace',
                      display: 'block',
                      'margin-bottom': '0.25rem'
                    }}>
                      = {field.expression}
                    </code>
                    <Show when={field.description}>
                      <p style={{ 'font-size': '0.75rem', color: '#6b7280', margin: '0' }}>
                        {field.description}
                      </p>
                    </Show>
                  </div>
                  <button
                    style={{
                      ...dangerButtonStyle,
                      padding: '0.25rem 0.5rem',
                      'font-size': '0.7rem'
                    }}
                    onClick={() => props.onCustomFieldRemove(field.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
          </For>
          
          <Show when={props.customFields.length === 0}>
            <div style={{
              padding: '2rem',
              'text-align': 'center',
              color: '#6b7280',
              'font-style': 'italic',
              'font-size': '0.875rem'
            }}>
              No custom fields yet. Create one to combine or transform interface fields.
            </div>
          </Show>
        </div>
      </div>
    </div>
  );
};

export default FieldMapper;


/** 
<FormInput
          label=""
       
          type="text"
          style={inputStyle}
          value={props.value}
          placeholder={props.placeholder}
          onChange={(e) => props.onInput(e)}
          onClick={handleInputClick}
          onKeyUp={handleInputClick}
        />



        */