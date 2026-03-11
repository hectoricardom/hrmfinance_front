import { Component } from 'solid-js';
import { useTranslation } from '../../../translations';

interface FormSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
  disabled?: boolean;
}

const FormSelect: Component<FormSelectProps> = (props) => {
  const { t } = useTranslation();
  
  const labelStyle = {
    display: 'block',
    'font-weight': '500',
    'margin-bottom': '0.5rem',
    color: 'var(--text-primary)'
  };

  const selectStyle = {
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

  return (
    <div style={containerStyle}>
      <label style={labelStyle}>
        {props.label}
        {props.required && <span style={{ color: 'var(--primary-color)' }}>*</span>}
      </label>
      <select
        value={props.value}
        required={props.required}
        disabled={props.disabled}
        style={selectStyle}
        onChange={(e) => props.onChange(e.target.value)}
        onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
        onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
      >
        <option value="">{t('forms.selectOption')}</option>
        {props.options.map(option => (
          <option value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  );
};

export default FormSelect;