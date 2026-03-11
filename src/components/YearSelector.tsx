import { Component, createSignal, createMemo, For, Show } from 'solid-js';
import { authStore } from '../stores/authStore';
import Icon from './Icon';
import { devLog } from '../services/utils';

// Generate available years (current year and past 5 years)
const getAvailableYears = (): number[] => {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let i = 0; i <= 5; i++) {
    years.push(currentYear - i);
  }
  return years;
};

const YearSelector: Component = () => {
  const [isOpen, setIsOpen] = createSignal(false);

  // Get current year from authStore (reactive signal)
  const currentYear = () => authStore.selectedYearSignal();

  const handleYearSelect = (year: number) => {
    authStore.setSelectedYear(year);
    setIsOpen(false);
    devLog(`📅 Switched to year: ${year}`);
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen())}
        style={{
          display: 'flex',
          'align-items': 'center',
          gap: '0.5rem',
          padding: '0.4rem 0.75rem',
          border: '1px solid #e8eaed',
          'border-radius': '20px',
          background: '#f8f9fa',
          cursor: 'pointer',
          'font-size': '0.8rem',
          transition: 'all 0.2s',
          color: '#202124',
        }}
      >
        <Icon name="calendar" size="0.9rem" />
        <span style={{ 'font-weight': '500' }}>
          {currentYear()}
        </span>
        <Icon name={isOpen() ? 'chevron-up' : 'chevron-down'} size="0.75rem" />
      </button>

      <Show when={isOpen()}>
        <div style={{
          position: 'absolute',
          top: '100%',
          right: '0',
          'margin-top': '0.5rem',
          background: 'white',
          border: '1px solid #e8eaed',
          'border-radius': '8px',
          'box-shadow': '0 4px 12px rgba(0,0,0,0.15)',
          'min-width': '140px',
          'z-index': 1000
        }}>
          <div style={{ padding: '0.5rem' }}>
            <div style={{
              padding: '0.5rem 0.75rem',
              'font-size': '0.7rem',
              color: '#5f6368',
              'border-bottom': '1px solid #e8eaed',
              'margin-bottom': '0.5rem',
              'text-transform': 'uppercase',
              'letter-spacing': '0.5px'
            }}>
              Año Fiscal
            </div>

            <For each={getAvailableYears()}>
              {(year) => (
                <button
                  onClick={() => handleYearSelect(year)}
                  disabled={year === currentYear()}
                  style={{
                    display: 'flex',
                    'align-items': 'center',
                    'justify-content': 'space-between',
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    border: 'none',
                    background: year === currentYear() ? '#e8f0fe' : 'transparent',
                    'border-radius': '6px',
                    cursor: year === currentYear() ? 'default' : 'pointer',
                    'text-align': 'left',
                    transition: 'background 0.15s',
                    'font-size': '0.85rem',
                    color: year === currentYear() ? '#1a73e8' : '#202124',
                    'font-weight': year === currentYear() ? '500' : '400',
                  }}
                  onMouseEnter={(e) => {
                    if (year !== currentYear()) {
                      e.currentTarget.style.background = '#f1f3f4';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (year !== currentYear()) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <span>{year}</span>
                  <Show when={year === currentYear()}>
                    <Icon name="check" size="0.9rem" style={{ color: '#1a73e8' }} />
                  </Show>
                </button>
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
            'z-index': 999
          }}
          onClick={() => setIsOpen(false)}
        />
      </Show>
    </div>
  );
};

export default YearSelector;
