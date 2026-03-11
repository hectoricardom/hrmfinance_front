import { Component, createSignal, Show, For } from 'solid-js';
import FieldRecommendations from './FieldRecommendations';
import { FormInput } from '../../ui';
import FormInputSimple from '../../ui/components/FormInputSimple';

interface SmartFieldInputProps {
  label: string;
  value: string;
  placeholder?: string;
  availableFields: Array<{ path: string; definition: any }>;
  onInput: (value: string) => void;
  helpText?: string;
  type?: 'text' | 'expression';
}

const SmartFieldInput: Component<SmartFieldInputProps> = (props) => {
  const [showRecommendations, setShowRecommendations] = createSignal(false);
  const [cursorPosition, setCursorPosition] = createSignal(0);

  const handleFieldSelect = (fieldPath: string) => {
    const currentValue = props.value;
    const beforeCursor = currentValue.substring(0, cursorPosition());
    const afterCursor = currentValue.substring(cursorPosition());
    
    let insertValue = fieldPath;
    
    // For template fields (like descriptions), wrap in curly braces
    if (props.type === 'text' && !fieldPath.startsWith('{')) {
      insertValue = `{${fieldPath}}`;
    }
    
    const newValue = beforeCursor + insertValue + afterCursor;
    props.onInput(newValue);
    setShowRecommendations(false);
  };

  const handleInputClick = (e: MouseEvent) => {
    const input = e.currentTarget as HTMLInputElement;
    setCursorPosition(input.selectionStart || 0);
  };

  const containerStyle = {
    position: 'relative' as const,
    width: '100%'
  };

  const inputContainerStyle = {
    display: 'flex',
    gap: '0.5rem',
    'align-items': 'stretch'
  };

  const inputStyle = {
    'flex-grow': '1',
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    'border-radius': '0.375rem',
    'font-size': '0.875rem'
  };

  const fieldButtonStyle = {
    padding: '0.5rem',
    'background-color': '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    'border-radius': '0.375rem',
    cursor: 'pointer',
    'font-size': '0.75rem',
    'white-space': 'nowrap' as const,
    'font-weight': '500'
  };

  const helpStyle = {
    'font-size': '0.75rem',
    color: '#6b7280',
    'margin-top': '0.25rem'
  };

  return (
    <div style={containerStyle}>
      <label style={{ display: 'block', 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
        {props.label}
      </label>
      
      <div style={inputContainerStyle}>
       
    
       
        <FormInputSimple
          type="text"
          style={inputStyle}
          value={props.value}
          placeholder={props.placeholder}
          onChange={(e) => props.onInput(e)}
          onClick={handleInputClick}
         
        />
        
        <button
          type="button"
          style={fieldButtonStyle}
          onClick={() => setShowRecommendations(!showRecommendations())}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
        >
          📋 Fields
        </button>
      </div>

      <Show when={props.helpText}>
        <p style={helpStyle}>
          {props.helpText}
        </p>
      </Show>

      {/* Field Recommendations Dropdown */}
      <Show when={showRecommendations()}>
        <div style={{
          position: 'absolute',
          top: '100%',
          left: '0',
          right: '0',
          'z-index': '50',
          'margin-top': '0.25rem'
        }}>
          <div style={{
            'background-color': 'white',
            border: '1px solid #d1d5db',
            'border-radius': '0.375rem',
            'box-shadow': '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            'max-height': '300px',
            'overflow-y': 'auto'
          }}>
            <div style={{ padding: '0.75rem', 'border-bottom': '1px solid #e5e7eb', 'background-color': '#f9fafb' }}>
              <p style={{ 'font-size': '0.875rem', 'font-weight': '600', margin: '0 0 0.25rem 0' }}>
                Available Fields
              </p>
              <p style={{ 'font-size': '0.75rem', color: '#6b7280', margin: '0' }}>
                Click a field to insert it at cursor position
              </p>
            </div>
            
            <div>
              <For each={props.availableFields}>
                {(field) => (
                  <div
                    style={{
                      padding: '0.75rem',
                      cursor: 'pointer',
                      'border-bottom': '1px solid #f3f4f6'
                    }}
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
                        'background-color': field.definition.type === 'number' ? '#dbeafe' : '#fef3c7',
                        color: field.definition.type === 'number' ? '#1e40af' : '#92400e',
                        'border-radius': '0.25rem'
                      }}>
                        {field.definition.type}
                      </span>
                    </div>
                    <p style={{ 'font-size': '0.75rem', color: '#6b7280', margin: '0' }}>
                      {field.definition.description}
                    </p>
                  </div>
                )}
              </For>
            </div>
          </div>
        </div>
      </Show>

      {/* Click outside to close */}
      <Show when={showRecommendations()}>
        <div
          style={{
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            'z-index': '40'
          }}
          onClick={() => setShowRecommendations(false)}
        />
      </Show>
    </div>
  );
};

export default SmartFieldInput;