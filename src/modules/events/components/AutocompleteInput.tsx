/**
 * AutocompleteInput Component
 *
 * Provides inline autocomplete suggestions for field paths, expressions,
 * and operators while typing in journal entry fields.
 *
 * Each instance is fully independent with its own state.
 */

import { Component, createSignal, createEffect, For, Show, onCleanup, createUniqueId } from 'solid-js';
import { EventType, CustomField } from '../types/eventTypes';
import { getAvailableFields } from '../data/eventTemplates';

interface Suggestion {
  value: string;
  label: string;
  description?: string;
  type: 'field' | 'expression' | 'operator' | 'function' | 'template';
  icon?: string;
}

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  eventType: EventType;
  placeholder?: string;
  type?: 'expression' | 'template';
  customFields?: CustomField[];
  style?: any;
  disabled?: boolean;
}

const AutocompleteInput: Component<AutocompleteInputProps> = (props) => {
  // Generate unique ID for this instance
  const instanceId = createUniqueId();

  // Local state for this instance only
  const [localValue, setLocalValue] = createSignal(props.value || '');
  const [showSuggestions, setShowSuggestions] = createSignal(false);
  const [suggestions, setSuggestions] = createSignal<Suggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const [cursorPosition, setCursorPosition] = createSignal(0);
  const [isFocused, setIsFocused] = createSignal(false);
  const [dropdownPosition, setDropdownPosition] = createSignal({ top: 0, left: 0, width: 0 });

  let inputElement: HTMLInputElement | undefined;
  let containerElement: HTMLDivElement | undefined;

  // Update dropdown position when showing suggestions
  const updateDropdownPosition = () => {
    if (inputElement) {
      const rect = inputElement.getBoundingClientRect();
      //console.log(rect)
      setDropdownPosition({
        top: rect.bottom  + 4,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  };

  // Sync local value when props.value changes from outside
  createEffect(() => {
    const propsValue = props.value;
    if (!isFocused()) {
      setLocalValue(propsValue || '');
    }
  });

  // Get available fields based on event type
  const getFields = () => {
    const baseFields = getAvailableFields(props.eventType);
    const customFieldsSuggestions = (props.customFields || []).map(field => ({
      path: `custom.${field.name}`,
      definition: {
        type: 'expression',
        description: field.description || `Custom: ${field.expression}`,
        example: field.expression
      }
    }));
    return [...baseFields, ...customFieldsSuggestions];
  };

  // Common expressions and operators
  const commonExpressions: Suggestion[] = [
    { value: 'data.totalAmount', label: 'data.totalAmount', description: 'Total amount', type: 'field', icon: '💰' },
    { value: 'data.subtotal', label: 'data.subtotal', description: 'Subtotal before tax', type: 'field', icon: '📊' },
    { value: 'data.tax', label: 'data.tax', description: 'Tax amount', type: 'field', icon: '📋' },
    { value: 'data.discount', label: 'data.discount', description: 'Discount amount', type: 'field', icon: '🏷️' },
    { value: 'data.quantity', label: 'data.quantity', description: 'Item quantity', type: 'field', icon: '📦' },
    { value: 'data.unitPrice', label: 'data.unitPrice', description: 'Unit price', type: 'field', icon: '💵' },
  ];

  const operators: Suggestion[] = [
    { value: ' + ', label: '+', description: 'Addition', type: 'operator', icon: '➕' },
    { value: ' - ', label: '-', description: 'Subtraction', type: 'operator', icon: '➖' },
    { value: ' * ', label: '*', description: 'Multiplication', type: 'operator', icon: '✖️' },
    { value: ' / ', label: '/', description: 'Division', type: 'operator', icon: '➗' },
    { value: '()', label: '()', description: 'Parentheses', type: 'operator', icon: '🔢' },
  ];

  const functions: Suggestion[] = [
    { value: 'Math.abs()', label: 'Math.abs()', description: 'Absolute value', type: 'function', icon: '📐' },
    { value: 'Math.round()', label: 'Math.round()', description: 'Round to nearest integer', type: 'function', icon: '🔄' },
    { value: 'Math.floor()', label: 'Math.floor()', description: 'Round down', type: 'function', icon: '⬇️' },
    { value: 'Math.ceil()', label: 'Math.ceil()', description: 'Round up', type: 'function', icon: '⬆️' },
    { value: 'Math.max(a, b)', label: 'Math.max()', description: 'Maximum value', type: 'function', icon: '📈' },
    { value: 'Math.min(a, b)', label: 'Math.min()', description: 'Minimum value', type: 'function', icon: '📉' },
  ];

  const templateSuggestions: Suggestion[] = [
    { value: '{data.customerName}', label: '{data.customerName}', description: 'Customer name', type: 'template', icon: '👤' },
    { value: '{data.invoiceNumber}', label: '{data.invoiceNumber}', description: 'Invoice number', type: 'template', icon: '📄' },
    { value: '{data.date}', label: '{data.date}', description: 'Transaction date', type: 'template', icon: '📅' },
    { value: '{data.totalAmount}', label: '{data.totalAmount}', description: 'Total amount', type: 'template', icon: '💰' },
    { value: '{data.reference}', label: '{data.reference}', description: 'Reference number', type: 'template', icon: '🔗' },
  ];

  // Get the current word being typed at cursor position
  const getCurrentWord = (text: string, position: number): { word: string; start: number; end: number } => {
    let start = position;
    let end = position;

    // Go backwards to find start of word
    while (start > 0 && !/[\s,;+\-*/(){}]/.test(text[start - 1])) {
      start--;
    }

    // Go forwards to find end of word
    while (end < text.length && !/[\s,;+\-*/(){}]/.test(text[end])) {
      end++;
    }

    return {
      word: text.substring(start, position),
      start,
      end
    };
  };

  // Generate suggestions based on current input
  const generateSuggestions = (text: string, position: number): Suggestion[] => {
    const { word } = getCurrentWord(text, position);
    const lowerWord = word.toLowerCase();

    let allSuggestions: Suggestion[] = [];

    // If typing nothing or after an operator, show common fields
    if (!word || word.length === 0) {
      if (props.type === 'template') {
        allSuggestions = [...templateSuggestions];
      } else {
        allSuggestions = [...commonExpressions.slice(0, 5), ...operators];
      }
    }
    // If starting with 'data.' show field suggestions
    else if (lowerWord.startsWith('data.') || lowerWord.startsWith('d')) {
      const fields = getFields();
      allSuggestions = fields
        .filter(f => f.path.toLowerCase().includes(lowerWord))
        .slice(0, 10)
        .map(f => ({
          value: props.type === 'template' ? `{${f.path}}` : f.path,
          label: f.path,
          description: f.definition.description,
          type: 'field' as const,
          icon: f.definition.type === 'number' ? '🔢' : f.definition.type === 'string' ? '📝' : '📋'
        }));
    }
    // If starting with '{' show template fields
    else if (word.startsWith('{') || (props.type === 'template' && lowerWord.length > 0)) {
      const searchTerm = word.replace(/[{}]/g, '').toLowerCase();
      const fields = getFields();
      allSuggestions = fields
        .filter(f => f.path.toLowerCase().includes(searchTerm))
        .slice(0, 10)
        .map(f => ({
          value: `{${f.path}}`,
          label: `{${f.path}}`,
          description: f.definition.description,
          type: 'template' as const,
          icon: '📋'
        }));
    }
    // If starting with 'Math' show functions
    else if (lowerWord.startsWith('math') || lowerWord.startsWith('m')) {
      allSuggestions = functions.filter(f =>
        f.label.toLowerCase().includes(lowerWord)
      );
    }
    // If typing 'custom' show custom fields
    else if (lowerWord.startsWith('custom') || lowerWord.startsWith('c')) {
      const customFieldsSuggestions = (props.customFields || []).map(field => ({
        value: props.type === 'template' ? `{custom.${field.name}}` : `custom.${field.name}`,
        label: `custom.${field.name}`,
        description: field.description || field.expression,
        type: 'field' as const,
        icon: '⚙️'
      }));
      allSuggestions = customFieldsSuggestions;
    }
    // General search across all suggestions
    else {
      const fields = getFields();
      const fieldSuggestions: Suggestion[] = fields
        .filter(f =>
          f.path.toLowerCase().includes(lowerWord) ||
          f.definition.description?.toLowerCase().includes(lowerWord)
        )
        .slice(0, 6)
        .map(f => ({
          value: props.type === 'template' ? `{${f.path}}` : f.path,
          label: props.type === 'template' ? `{${f.path}}` : f.path,
          description: f.definition.description,
          type: 'field' as const,
          icon: f.definition.type === 'number' ? '🔢' : '📝'
        }));

      const funcSuggestions = functions.filter(f =>
        f.label.toLowerCase().includes(lowerWord)
      );

      allSuggestions = [...fieldSuggestions, ...funcSuggestions];
    }

    return allSuggestions.slice(0, 8);
  };

  // Handle input change - update local state and notify parent
  const handleInput = (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const value = input.value;
    const position = input.selectionStart || 0;

    // Update local state
    setLocalValue(value);
    setCursorPosition(position);

    // Notify parent of the change
    //props.onChange(value);

    // Generate suggestions based on current text
    const newSuggestions = generateSuggestions(value, position);
    setSuggestions(newSuggestions);
    setShowSuggestions(newSuggestions.length > 0);
    setSelectedIndex(0);

    // Update dropdown position
    updateDropdownPosition();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!showSuggestions()) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, suggestions().length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
      case 'Tab':
        if (suggestions().length > 0 && selectedIndex() < suggestions().length) {
          e.preventDefault();
          selectSuggestion(suggestions()[selectedIndex()]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowSuggestions(false);
        break;
    }
  };

  // Select a suggestion - use local value for accurate replacement
  const selectSuggestion = (suggestion: Suggestion) => {
    if (!inputElement) return;

    // Use local value which has the latest typed text
    const currentValue = localValue();
    const position = cursorPosition();
    const { start } = getCurrentWord(currentValue, position);

    const insertValue = suggestion.value;
    const newValue = currentValue.substring(0, start) + insertValue + currentValue.substring(position);

    // Update local state
    setLocalValue(newValue);
    setShowSuggestions(false);

    // Notify parent
    props.onChange(newValue);

    // Set cursor position after the inserted value
    requestAnimationFrame(() => {
      if (inputElement) {
        const newPosition = start + insertValue.length;
        inputElement.focus();
        inputElement.setSelectionRange(newPosition, newPosition);
        setCursorPosition(newPosition);
      }
    });
  };

  // Handle focus
  const handleFocus = () => {
    setIsFocused(true);
    const position = inputElement?.selectionStart || 0;
    setCursorPosition(position);
    const newSuggestions = generateSuggestions(localValue(), position);
    setSuggestions(newSuggestions);
    setShowSuggestions(newSuggestions.length > 0);

    // Update dropdown position
    updateDropdownPosition();
  };

  // Handle blur
  const handleBlur = (e: FocusEvent) => {
    // Check if the related target is within our container (clicking a suggestion)
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (containerElement && containerElement.contains(relatedTarget)) {
      return; // Don't close if clicking within container
    }

    // Small delay to allow suggestion click to register
    setTimeout(() => {
      //setIsFocused(false);
      setShowSuggestions(false);
    }, 150);
  };

  // Handle click on input to update cursor position
  const handleClick = () => {
    if (inputElement) {
      const position = inputElement.selectionStart || 0;
      setCursorPosition(position);
    }
  };

  // Styles
  const containerStyle = {
    position: 'relative' as const,
    width: '100%'
  };

  const inputStyle = {
    width: '100%',
    padding: '0.5rem 0.75rem',
    border: '1px solid #d1d5db',
    'border-radius': '0.375rem',
    'font-size': '0.875rem',
    'font-family': 'monospace',
    'background-color': props.disabled ? '#f3f4f6' : 'white',
    ...props.style
  };

  // Dynamic position for fixed dropdown
  const getSuggestionsContainerStyle = () => ({
    position: 'fixed' as const,
    top: `${dropdownPosition().top}px`,
    left: `${dropdownPosition().left}px`,
    width: `${dropdownPosition().width}px`,
    'background-color': 'white',
    border: '1px solid #d1d5db',
    'border-radius': '0.375rem',
    'box-shadow': '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    'max-height': '240px',
    'overflow-y': 'auto',
    'z-index': '9999'
  });

  const suggestionItemStyle = (isSelected: boolean) => ({
    padding: '0.5rem 0.75rem',
    cursor: 'pointer',
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    'background-color': isSelected ? '#eff6ff' : 'transparent',
    'border-left': isSelected ? '3px solid #3b82f6' : '3px solid transparent',
    transition: 'background-color 0.15s'
  });

  const suggestionIconStyle = {
    'font-size': '0.875rem',
    'flex-shrink': '0'
  };

  const suggestionTextStyle = {
    flex: '1',
    'min-width': '0'
  };

  const suggestionLabelStyle = {
    'font-family': 'monospace',
    'font-size': '0.8rem',
    'font-weight': '500',
    color: '#1f2937'
  };

  const suggestionDescStyle = {
    'font-size': '0.7rem',
    color: '#6b7280',
    'white-space': 'nowrap',
    overflow: 'hidden',
    'text-overflow': 'ellipsis'
  };

  const typeBadgeStyle = (type: string) => ({
    'font-size': '0.6rem',
    padding: '0.125rem 0.375rem',
    'border-radius': '0.25rem',
    'font-weight': '500',
    'background-color': type === 'field' ? '#dbeafe' : type === 'function' ? '#fef3c7' : type === 'operator' ? '#dcfce7' : '#f3e8ff',
    color: type === 'field' ? '#1e40af' : type === 'function' ? '#92400e' : type === 'operator' ? '#166534' : '#7c3aed'
  });

  return (
    <div
      ref={el => containerElement = el}
      style={containerStyle}
      data-autocomplete-id={instanceId}
    >
      <input  
        ref={el => inputElement = el}
        type="text"
        value={localValue()}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onClick={handleClick}
        placeholder={props.placeholder}
        disabled={props.disabled}
        style={inputStyle}
        autocomplete="off"
        data-instance={instanceId}
      />

      <Show when={showSuggestions() && suggestions().length > 0}>
        <div style={getSuggestionsContainerStyle()}>
          <For each={suggestions()}>
            {(suggestion, index) => (
              <div
                style={suggestionItemStyle(selectedIndex() === index())}
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent blur
                  selectSuggestion(suggestion);
                }}
                onMouseEnter={() => setSelectedIndex(index())}
              >
                <span style={suggestionIconStyle}>{suggestion.icon || '📋'}</span>
                <div style={suggestionTextStyle}>
                  <div style={suggestionLabelStyle}>{suggestion.label}</div>
                  <Show when={suggestion.description}>
                    <div style={suggestionDescStyle}>{suggestion.description}</div>
                  </Show>
                </div>
                <span style={typeBadgeStyle(suggestion.type)}>{suggestion.type}</span>
              </div>
            )}
          </For>

          {/* Help footer */}
          <div style={{
            padding: '0.375rem 0.75rem',
            'background-color': '#f9fafb',
            'border-top': '1px solid #e5e7eb',
            'font-size': '0.65rem',
            color: '#6b7280',
            display: 'flex',
            gap: '0.75rem'
          }}>
            <span>↑↓ Navegar</span>
            <span>Tab/Enter Seleccionar</span>
            <span>Esc Cerrar</span>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default AutocompleteInput;

// && isFocused()