import { Component, createSignal, createEffect } from 'solid-js';

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
}

const CurrencyInput: Component<CurrencyInputProps> = (props) => {
  const [displayValue, setDisplayValue] = createSignal('');
  const [isFocused, setIsFocused] = createSignal(false);

  // Update display value when props.value changes
  createEffect(() => {
    if (!isFocused()) {
      setDisplayValue(props.value ? props.value.toFixed(2) : '');
    }
  });

  const handleInput = (e: InputEvent) => {
    const target = e.target as HTMLInputElement;
    const value = target.value;

    // Only allow numbers and decimal point
    const sanitized = value.replace(/[^\d.]/g, '');

    // Prevent multiple decimal points
    const parts = sanitized.split('.');
    const formatted = parts.length > 2
      ? parts[0] + '.' + parts.slice(1).join('')
      : sanitized;

    setDisplayValue(formatted);

    // Update parent with numeric value
    const numericValue = parseFloat(formatted) || 0;
    props.onChange(numericValue);
  };

  const handleFocus = (e: FocusEvent) => {
    const target = e.target as HTMLInputElement;
    setIsFocused(true);
    target.style.borderColor = 'var(--primary-color)';
  };

  const handleBlur = (e: FocusEvent) => {
    const target = e.target as HTMLInputElement;
    setIsFocused(false);
    target.style.borderColor = props.error ? 'var(--danger-color, #dc3545)' : 'var(--border-color)';

    // Format to 2 decimal places
    const numericValue = parseFloat(displayValue()) || 0;
    setDisplayValue(numericValue.toFixed(2));
    props.onChange(numericValue);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    // Allow: backspace, delete, tab, escape, enter
    if ([8, 9, 27, 13, 46].includes(e.keyCode) ||
      // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
      (e.keyCode === 65 && e.ctrlKey === true) ||
      (e.keyCode === 67 && e.ctrlKey === true) ||
      (e.keyCode === 86 && e.ctrlKey === true) ||
      (e.keyCode === 88 && e.ctrlKey === true) ||
      // Allow: home, end, left, right
      (e.keyCode >= 35 && e.keyCode <= 39)) {
      return;
    }

    // Ensure that it is a number or decimal point
    if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) &&
        (e.keyCode < 96 || e.keyCode > 105) &&
        e.keyCode !== 190 && e.keyCode !== 110) {
      e.preventDefault();
    }
  };

  const labelStyle = {
    display: 'block',
    'font-weight': '500',
    'margin-bottom': '0.5rem',
    color: 'var(--text-primary)'
  };

  const containerStyle = {
    'margin-bottom': '1rem'
  };

  const inputWrapperStyle = {
    position: 'relative' as const,
    display: 'flex',
    'align-items': 'center'
  };

  const prefixStyle = {
    position: 'absolute' as const,
    left: '0.75rem',
    color: 'var(--text-muted)',
    'font-size': '1rem',
    'pointer-events': 'none' as const
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem 0.75rem 0.75rem 2rem',
    border: `1px solid ${props.error ? 'var(--danger-color, #dc3545)' : 'var(--border-color)'}`,
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '1rem',
    'font-family': 'inherit',
    background: props.disabled ? 'var(--bg-muted, #f5f5f5)' : 'var(--surface-color)',
    color: 'var(--text-primary)',
    transition: 'border-color 0.2s ease'
  };

  const errorStyle = {
    color: 'var(--danger-color, #dc3545)',
    'font-size': '0.875rem',
    'margin-top': '0.25rem'
  };

  return (
    <div style={containerStyle}>
      {props.label && (
        <label style={labelStyle}>
          {props.label}
        </label>
      )}
      <div style={inputWrapperStyle}>
        <span style={prefixStyle}>$</span>
        <input
          type="text"
          value={displayValue()}
          placeholder={props.placeholder || '0.00'}
          disabled={props.disabled}
          style={inputStyle}
          onInput={handleInput}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
      </div>
      {props.error && (
        <div style={errorStyle}>{props.error}</div>
      )}
    </div>
  );
};

export default CurrencyInput;
