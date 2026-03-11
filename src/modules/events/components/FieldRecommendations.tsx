import { Component, createSignal, For, Show, createMemo } from 'solid-js';
import { FieldDefinition } from '../types/eventTypes';
import { useTranslation } from '../../../translations';
import { FormInput } from '../../ui';

interface FieldRecommendationsProps {
  availableFields: Array<{ path: string; definition: FieldDefinition }>;
  onFieldSelect: (fieldPath: string) => void;
  placeholder?: string;
  label?: string;
}

const FieldRecommendations: Component<FieldRecommendationsProps> = (props) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = createSignal(false);
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
        (category === 'number' && field.definition.type === 'number') ||
        (category === 'string' && field.definition.type === 'string') ||
        (category === 'payment' && field.path.includes('payment')) ||
        (category === 'customer' && field.path.includes('customer'));
      
      return matchesSearch && matchesCategory;
    });
  });

  const handleFieldSelect = (fieldPath: string) => {
    props.onFieldSelect(fieldPath);
    setIsOpen(false);
    setSearchTerm('');
  };

  const getFieldTypeColor = (type: string) => {
    switch (type) {
      case 'number': return '#dbeafe';
      case 'string': return '#fef3c7';
      case 'boolean': return '#dcfce7';
      case 'date': return '#f3e8ff';
      default: return '#f3f4f6';
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

  const categories = [
    { value: 'all', label: 'All Fields', icon: '📋' },
    { value: 'required', label: 'Required', icon: '⭐' },
    { value: 'number', label: 'Numbers', icon: '🔢' },
    { value: 'string', label: 'Text', icon: '📝' },
    { value: 'payment', label: 'Payments', icon: '💰' },
    { value: 'customer', label: 'Customer', icon: '👤' }
  ];

  const containerStyle = {
    position: 'relative' as const,
    width: '100%'
  };

  const buttonStyle = {
    width: '100%',
    padding: '0.75rem',
    'background-color': 'white',
    border: '1px solid #d1d5db',
    'border-radius': '0.375rem',
    'text-align': 'left' as const,
    cursor: 'pointer',
    'font-size': '0.875rem',
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center'
  };

  const dropdownStyle = {
    position: 'absolute' as const,
    top: '100%',
    left: '0',
    right: '0',
    'z-index': '50',
    'background-color': 'white',
    border: '1px solid #d1d5db',
    'border-radius': '0.375rem',
    'box-shadow': '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    'margin-top': '0.25rem',
    'max-height': '400px',
    'overflow-y': 'auto'
  };

  const headerStyle = {
    padding: '1rem',
    'border-bottom': '1px solid #e5e7eb',
    'background-color': '#f9fafb'
  };

  const searchStyle = {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    'border-radius': '0.375rem',
    'font-size': '0.875rem',
    'margin-bottom': '0.75rem'
  };

  const categoryStyle = {
    display: 'flex',
    'flex-wrap': 'wrap' as const,
    gap: '0.5rem'
  };

  const categoryButtonStyle = (isSelected: boolean) => ({
    padding: '0.25rem 0.75rem',
    'border-radius': '0.375rem',
    border: 'none',
    cursor: 'pointer',
    'font-size': '0.75rem',
    'background-color': isSelected ? '#3b82f6' : '#f3f4f6',
    color: isSelected ? 'white' : '#374151'
  });

  const fieldItemStyle = {
    padding: '0.75rem',
    cursor: 'pointer',
    'border-bottom': '1px solid #f3f4f6',
    'hover:background-color': '#f9fafb'
  };

  return (
    <div style={containerStyle}>
      <Show when={props.label}>
        <label style={{ display: 'block', 'font-weight': '500', 'margin-bottom': '0.5rem', 'font-size': '0.875rem' }}>
          {props.label}
        </label>
      </Show>
      
      <button
        type="button"
        style={buttonStyle}
        onClick={() => setIsOpen(!isOpen())}
        onMouseEnter={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
        onMouseLeave={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
      >
        <span style={{ color: '#6b7280' }}>
          {props.placeholder || 'Select a field from data interface...'}
        </span>
        <span style={{ transform: isOpen() ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          ▼
        </span>
      </button>

      <Show when={isOpen()}>
        <div style={dropdownStyle}>
          {/* Header with Search and Categories */}
          <div style={headerStyle}>
            <FormInput
              type="text"
              placeholder="Search fields..."
              value={searchTerm()}
              onChange={(e) => setSearchTerm(e)}
              style={searchStyle}
            />
            <div style={categoryStyle}>
              <For each={categories}>
                {(category) => (
                  <button
                    type="button"
                    style={categoryButtonStyle(selectedCategory() === category.value)}
                    onClick={() => setSelectedCategory(category.value)}
                  >
                    {category.icon} {category.label}
                  </button>
                )}
              </For>
            </div>
          </div>

          {/* Fields List */}
          <div>
            <Show when={filteredFields().length === 0}>
              <div style={{ padding: '2rem', 'text-align': 'center', color: '#6b7280' }}>
                No fields found matching your criteria
              </div>
            </Show>

            <For each={filteredFields()}>
              {(field) => (
                <div
                  style={fieldItemStyle}
                  onClick={() => handleFieldSelect(field.path)}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '0.25rem' }}>
                    <code style={{ 
                      'font-family': 'monospace', 
                      'font-size': '0.875rem', 
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
                  <p style={{ 'font-size': '0.75rem', color: '#6b7280', margin: '0 0 0.25rem 0' }}>
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
      </Show>

      {/* Click outside to close */}
      <Show when={isOpen()}>
        <div
          style={{
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            'z-index': '40'
          }}
          onClick={() => setIsOpen(false)}
        />
      </Show>
    </div>
  );
};

export default FieldRecommendations;