import { Component } from 'solid-js';
import { useTranslation, Language } from '../../../translations';

const LanguageSelector: Component = () => {
  const { t, language, setLanguage } = useTranslation();
  
  const selectorStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    'margin-left': 'auto'
  };
  
  const selectStyle = {
    padding: '0.5rem 1rem',
    'border-radius': 'var(--border-radius-sm)',
    border: '1px solid var(--border-color)',
    background: 'var(--surface-color)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    'font-size': '0.875rem',
    'font-weight': '500',
    transition: 'all 0.2s ease',
    'min-width': '120px'
  };
  
  const flagStyle = {
    width: '20px',
    height: '15px',
    'margin-right': '0.5rem',
    'vertical-align': 'middle'
  };
  
  const labelStyle = {
    'font-weight': '500',
    color: 'var(--text-muted)',
    'font-size': '0.875rem'
  };
  
  const handleLanguageChange = (e: Event) => {
    const target = e.target as HTMLSelectElement;
    setLanguage(target.value as Language);
  };
  
  return (
    <div style={selectorStyle}>
      <span style={labelStyle}>
        {/*  t('common.language') */}
      </span>
      <select
        style={selectStyle}
        value={"es"}
        onChange={handleLanguageChange}
      >
        <option value="en">
          🇺🇸 {t('common.english')}
        </option>
        <option value="es">
          🇪🇸 {t('common.spanish')}
        </option>
      </select>
    </div>
  );
};

export default LanguageSelector;