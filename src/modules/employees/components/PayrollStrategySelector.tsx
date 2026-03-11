import { Component, createSignal, Show, For } from 'solid-js';
import { PayrollStrategyContext } from '../strategies/StrategyContext';

interface PayrollStrategySelectorProps {
  currentStrategy: string;
  onStrategyChange: (strategyId: string) => void;
}

const PayrollStrategySelector: Component<PayrollStrategySelectorProps> = (props) => {
  const [isOpen, setIsOpen] = createSignal(false);

  // Get available strategies from the context
  const strategies = () => {
    try {
      const context = new PayrollStrategyContext('standard');
      return context.getAvailableStrategies();
    } catch {
      return [
        { id: 'standard', name: 'Standard US', description: 'Standard US payroll with weekly overtime' },
        { id: 'california', name: 'California', description: 'California rules with daily overtime' },
      ];
    }
  };

  const currentStrategyInfo = () => {
    return strategies().find(s => s.id === props.currentStrategy) || strategies()[0];
  };

  const getStrategyIcon = (strategyId: string) => {
    switch (strategyId) {
      case 'california': return '🌴';
      case 'standard': return '🇺🇸';
      default: return '📊';
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <label
        style={{
          display: 'block',
          'font-size': '0.875rem',
          'font-weight': '600',
          color: '#4a5568',
          'margin-bottom': '0.5rem',
          'text-transform': 'uppercase',
          'letter-spacing': '0.05em',
        }}
      >
        📊 Payroll Rules
      </label>

      <button
        style={{
          display: 'flex',
          'align-items': 'center',
          gap: '0.5rem',
          padding: '0.75rem 1rem',
          background: 'white',
          border: '2px solid #e2e8f0',
          'border-radius': '0.5rem',
          cursor: 'pointer',
          'font-size': '0.95rem',
          'font-weight': '500',
          color: '#2d3748',
          'min-width': '180px',
          transition: 'all 0.2s',
        }}
        onClick={() => setIsOpen(!isOpen())}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#667eea';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#e2e8f0';
        }}
      >
        <span>{getStrategyIcon(props.currentStrategy)}</span>
        <span style={{ flex: '1', 'text-align': 'left' }}>{currentStrategyInfo().name}</span>
        <span style={{ 'font-size': '0.625rem', color: '#718096' }}>▼</span>
      </button>

      <Show when={isOpen()}>
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: '0',
            right: '0',
            'margin-top': '0.25rem',
            'background-color': 'white',
            'border-radius': '0.5rem',
            'box-shadow': '0 4px 12px rgba(0,0,0,0.15)',
            border: '1px solid var(--border-color)',
            'z-index': '100',
            overflow: 'hidden',
          }}
        >
          <For each={strategies()}>
            {(strategy) => (
              <button
                style={{
                  display: 'flex',
                  'flex-direction': 'column',
                  'align-items': 'flex-start',
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: 'none',
                  background: props.currentStrategy === strategy.id ? 'var(--blue-ribbon-50)' : 'none',
                  cursor: 'pointer',
                  'text-align': 'left',
                  transition: 'background 0.15s',
                }}
                onClick={() => {
                  props.onStrategyChange(strategy.id);
                  setIsOpen(false);
                }}
                onMouseEnter={(e) => {
                  if (props.currentStrategy !== strategy.id) {
                    e.currentTarget.style.backgroundColor = '#f7fafc';
                  }
                }}
                onMouseLeave={(e) => {
                  if (props.currentStrategy !== strategy.id) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                  <span>{getStrategyIcon(strategy.id)}</span>
                  <span
                    style={{
                      'font-weight': '600',
                      color: '#2d3748',
                      'font-size': '0.95rem',
                    }}
                  >
                    {strategy.name}
                  </span>
                  <Show when={props.currentStrategy === strategy.id}>
                    <span style={{ color: 'var(--blue-ribbon-600)' }}>✓</span>
                  </Show>
                </div>
                <span
                  style={{
                    'font-size': '0.75rem',
                    color: '#718096',
                    'margin-top': '0.25rem',
                    'padding-left': '1.5rem',
                  }}
                >
                  {strategy.description}
                </span>
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
};

export default PayrollStrategySelector;
