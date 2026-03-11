import { Component, createEffect, createSignal, onMount, Show } from 'solid-js';
import { isNotEmpty } from '../../../services/utils';

interface FormInputProps {
  label: string;
  type?: string;
  value: string;
  step?: string;
  min?:string | number;
  max?:string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  onPaste?: (e: ClipboardEvent) => void;
}

const FormInput: Component<FormInputProps> = (props) => {


  const labelStyle = {
    display: 'block',
    'font-weight': '500',
    'margin-bottom': '0.5rem',
    color: 'var(--text-primary)'
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '1rem',
    'font-family': 'inherit',
    background: 'var(--surface-color)',
    color: 'var(--text-primary)',
    transition: 'border-color 0.2s ease'
  };

  const containerStyle = {
    'margin-bottom': '1rem'
  };


 const [val, setVal] = createSignal("");

  // Update local value when props.value changes
  createEffect(() => {
    if (props?.value !== undefined) {
      setVal(props.value.toString());
    }
  });



  

 

  const handleKeyDown = (e: KeyboardEvent) => {
    // Handle Enter, Escape, and Tab for final update
    if (e.key === 'Enter' || e.key === 'Escape' || e.key === 'Tab') {
      if (props?.onChange && isNotEmpty(val())) {
        props?.onChange?.(val());
      }
    }
  };

  const handleBlur = () => {
    // Final update on blur
    if (isNotEmpty(val())) {
      props?.onChange?.(val());
    }
  };


  return (
    <div>
      <Show when={props.label}>
        <label style={labelStyle}>
          {props.label}
          {props.required && <span style={{ color: 'var(--primary-color)' }}>*</span>}
        </label>
      </Show>
      <input
        type={props.type || 'text'}
        value={val()}
        placeholder={props.placeholder}
        required={props.required}
        disabled={props.disabled || props.readOnly}
        readOnly={ props.readOnly}
        step={ props.step}
        min={props?.min}
        max={props?.max}
        style={{...inputStyle, ...props?.style}}
        onInput={(e) => setVal(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={(e) => {
            e.target.style.borderColor = 'var(--primary-color)'
          }
        }
        onPaste={props.onPaste}
        onBlur={(e) => {
          handleBlur();
          e.target.style.borderColor = 'var(--border-color)'}
        }
      />
    </div>
  );
};

export default FormInput;