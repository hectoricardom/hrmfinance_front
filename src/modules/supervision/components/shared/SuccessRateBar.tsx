import { Component, Show } from 'solid-js';

interface SuccessRateBarProps {
  rate: number;
  count?: number;
}

const SuccessRateBar: Component<SuccessRateBarProps> = (props) => {
  const percentage = () => Math.round(Math.min(100, Math.max(0, props.rate)));

  const getColor = () => {
    const rate = percentage();
    if (rate >= 80) {
      return '#10B981'; // green
    } else if (rate >= 60) {
      return '#F59E0B'; // yellow
    } else {
      return '#EF4444'; // red
    }
  };

  const containerStyle = {
    display: 'flex',
    'flex-direction': 'column',
    gap: '0.375rem',
    width: '100%'
  };

  const headerStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'font-size': '0.75rem'
  };

  const percentageStyle = () => ({
    'font-weight': '600',
    color: getColor()
  });

  const countStyle = {
    color: 'var(--text-muted, #6B7280)',
    'font-weight': '400'
  };

  const barContainerStyle = {
    width: '100%',
    height: '8px',
    background: 'rgba(0, 0, 0, 0.1)',
    'border-radius': '4px',
    overflow: 'hidden'
  };

  const barFillStyle = () => ({
    width: `${percentage()}%`,
    height: '100%',
    background: getColor(),
    'border-radius': '4px',
    transition: 'width 0.3s ease, background-color 0.3s ease'
  });

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <span style={percentageStyle()}>{percentage()}%</span>
        <Show when={props.count !== undefined}>
          <span style={countStyle}>{props.count} processed</span>
        </Show>
      </div>
      <div style={barContainerStyle}>
        <div style={barFillStyle()} />
      </div>
    </div>
  );
};

export default SuccessRateBar;
