import { Component, createSignal, Show, createEffect } from 'solid-js';
import { EventType, CustomField } from '../types/eventTypes';
import EnhancedFieldSelector from './EnhancedFieldSelector';

interface EnhancedSmartInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  eventType: EventType;
  placeholder?: string;
  type?: 'text' | 'expression' | 'template';
  helpText?: string;
  required?: boolean;
  customFields?: CustomField[];
}

const EnhancedSmartInput: Component<EnhancedSmartInputProps> = (props) => {
  const [showSelector, setShowSelector] = createSignal(false);
  const [cursorPosition, setCursorPosition] = createSignal(0);
  const [inputElement, setInputElement] = createSignal<HTMLTextAreaElement | null>(null);
  const [showPreview, setShowPreview] = createSignal(false);

  // Track cursor position when input changes
  createEffect(() => {
    const input = inputElement();
    if (input) {
      const handleSelectionChange = () => {
        setCursorPosition(input.selectionStart || 0);
      };
      
      input.addEventListener('click', handleSelectionChange);
      input.addEventListener('keyup', handleSelectionChange);
      
      return () => {
        input.removeEventListener('click', handleSelectionChange);
        input.removeEventListener('keyup', handleSelectionChange);
      };
    }
  });

  const handleFieldSelect = (fieldPath: string, fieldType: string) => {
    insertAtCursor(fieldPath);
    setShowSelector(false);
  };

  const handleExpressionInsert = (expression: string) => {
    insertAtCursor(expression);
    setShowSelector(false);
  };

  const insertAtCursor = (text: string) => {
    const currentValue = props.value;
    const position = cursorPosition();
    const beforeCursor = currentValue.substring(0, position);
    const afterCursor = currentValue.substring(position);
    
    let insertValue = text;
    
    // For template types, wrap field references in curly braces
    if (props.type === 'template' && text.startsWith('data.') && !text.includes('{')) {
      insertValue = `{${text}}`;
    }
    
    const newValue = beforeCursor + insertValue + afterCursor;
    props.onChange(newValue);
    
    // Update cursor position after insertion
    const newPosition = position + insertValue.length;
    setCursorPosition(newPosition);
    
    // Set focus back to input and set cursor position
    const input = inputElement();
    if (input) {
      input.focus();
      setTimeout(() => {
        input.setSelectionRange(newPosition, newPosition);
      }, 0);
    }
  };

  // Parse and preview template expressions
  const previewValue = () => {
    if (props.type !== 'template') return '';
    
    let preview = props.value;
    
    // Simple preview - replace field references with example values
    const fieldPattern = /\{([^}]+)\}/g;
    preview = preview.replace(fieldPattern, (match, field) => {
      // Simple example values for preview
      if (field.includes('amount') || field.includes('total')) return '$1,234.56';
      if (field.includes('customer')) return 'John Doe';
      if (field.includes('invoice')) return 'INV-2024-001';
      if (field.includes('date')) return '2024-01-15';
      return '<value>';
    });
    
    return preview;
  };

  // Styles
  const containerStyle = {
    width: '100%',
    position: 'relative' as const
  };

  const labelStyle = {
    display: 'block',
    'font-weight': '500',
    'margin-bottom': '0.5rem',
    'font-size': '0.875rem'
  };

  const inputContainerStyle = {
    position: 'relative' as const
  };

  const textareaStyle = {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    'border-radius': '0.375rem',
    'font-size': '0.875rem',
    'font-family': 'inherit',
    resize: 'vertical' as const,
    'min-height': props.type === 'expression' ? '80px' : '60px'
  };

  const toolbarStyle = {
    display: 'flex',
    gap: '0.5rem',
    'margin-top': '0.5rem',
    'flex-wrap': 'wrap' as const
  };

  const toolButtonStyle = {
    padding: '0.375rem 0.75rem',
    'background-color': '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    'border-radius': '0.375rem',
    cursor: 'pointer',
    'font-size': '0.75rem',
    'font-weight': '500',
    display: 'flex',
    'align-items': 'center',
    gap: '0.25rem'
  };

  const previewStyle = {
    'margin-top': '0.5rem',
    padding: '0.75rem',
    'background-color': '#f0fdf4',
    border: '1px solid #bbf7d0',
    'border-radius': '0.375rem'
  };

  const helpTextStyle = {
    'font-size': '0.75rem',
    color: '#6b7280',
    'margin-top': '0.25rem'
  };

  const selectorContainerStyle = {
    position: 'absolute' as const,
    top: '100%',
    left: '0',
    right: '0',
    'margin-top': '0.5rem',
    'z-index': '50'
  };

  return (
    <div style={containerStyle}>
      <label style={labelStyle}>
        {props.label}
        <Show when={props.required}>
          <span style={{ color: '#ef4444', 'margin-left': '0.25rem' }}>*</span>
        </Show>
      </label>

      <div style={inputContainerStyle}>
        <textarea
          ref={setInputElement}
          value={props.value}
          onChange={(e) => props.onChange(e.currentTarget.value)}
          placeholder={props.placeholder}
          style={textareaStyle}
          rows={props.type === 'expression' ? 3 : 2}
        />

        {/* Toolbar */}
        <div style={toolbarStyle}>
          <button
            type="button"
            style={toolButtonStyle}
            onClick={() => setShowSelector(!showSelector())}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
          >
            <span>📋</span>
            <span>Insert Field</span>
          </button>

          <Show when={props.type === 'expression'}>
            <button
              type="button"
              style={toolButtonStyle}
              onClick={() => insertAtCursor(' + ')}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            >
              <span>+</span>
            </button>
            <button
              type="button"
              style={toolButtonStyle}
              onClick={() => insertAtCursor(' - ')}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            >
              <span>−</span>
            </button>
            <button
              type="button"
              style={toolButtonStyle}
              onClick={() => insertAtCursor(' * ')}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            >
              <span>×</span>
            </button>
            <button
              type="button"
              style={toolButtonStyle}
              onClick={() => insertAtCursor(' / ')}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            >
              <span>÷</span>
            </button>
            <button
              type="button"
              style={toolButtonStyle}
              onClick={() => insertAtCursor('()')}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            >
              <span>( )</span>
            </button>
          </Show>

          <Show when={props.type === 'template' && props.value}>
            <button
              type="button"
              style={toolButtonStyle}
              onClick={() => setShowPreview(!showPreview())}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            >
              <span>👁️</span>
              <span>Preview</span>
            </button>
          </Show>
        </div>

        {/* Help text */}
        <Show when={props.helpText}>
          <p style={helpTextStyle}>
            💡 {props.helpText}
          </p>
        </Show>

        {/* Preview for template type */}
        <Show when={showPreview() && props.type === 'template'}>
          <div style={previewStyle}>
            <p style={{ 'font-size': '0.75rem', 'font-weight': '600', 'margin-bottom': '0.25rem' }}>
              Preview:
            </p>
            <p style={{ 'font-size': '0.875rem', color: '#065f46' }}>
              {previewValue() || 'No preview available'}
            </p>
          </div>
        </Show>

        {/* Field selector popup */}
        <Show when={showSelector()}>
          <div style={selectorContainerStyle}>
            <EnhancedFieldSelector
              eventType={props.eventType}
              onFieldSelect={handleFieldSelect}
              onExpressionInsert={handleExpressionInsert}
              currentValue={props.value}
              cursorPosition={cursorPosition()}
              customFields={props.customFields}
            />
          </div>
        </Show>

        {/* Click outside to close */}
        <Show when={showSelector()}>
          <div
            style={{
              position: 'fixed',
              top: '0',
              left: '0',
              right: '0',
              bottom: '0',
              'z-index': '40'
            }}
            onClick={() => setShowSelector(false)}
          />
        </Show>
      </div>
    </div>
  );
};

export default EnhancedSmartInput;