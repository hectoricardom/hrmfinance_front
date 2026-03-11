import { Component } from 'solid-js';

export type TimesheetViewMode = 'week' | 'biweek' | 'month';

interface TimesheetViewModeToggleProps {
  mode: TimesheetViewMode;
  onModeChange: (mode: TimesheetViewMode) => void;
}

const TimesheetViewModeToggle: Component<TimesheetViewModeToggleProps> = (props) => {
  const buttonStyle = (isActive: boolean) => ({
    padding: '0.5rem 1rem',
    border: 'none',
    'border-radius': '0.375rem',
    cursor: 'pointer',
    transition: 'all 0.15s',
    'font-size': '0.875rem',
    'font-weight': '500',
    display: 'flex',
    'align-items': 'center',
    gap: '0.375rem',
    background: isActive
      ? 'linear-gradient(135deg, var(--blue-ribbon-500), var(--blue-ribbon-700))'
      : 'var(--surface-color)',
    color: isActive ? 'white' : 'var(--text-secondary)',
    'box-shadow': isActive ? '0 2px 8px rgba(108, 92, 231, 0.3)' : 'none',
  });

  return (
    <div
      style={{
        display: 'flex',
        gap: '0.25rem',
        padding: '0.25rem',
        'background-color': 'var(--blue-ribbon-50)',
        'border-radius': '0.5rem',
        border: '1px solid var(--border-color)',
      }}
    >
      <button
        style={buttonStyle(props.mode === 'week')}
        onClick={() => props.onModeChange('week')}
        title="Week View"
      >
        <span>7</span>
        <span>Week</span>
      </button>
      <button
        style={buttonStyle(props.mode === 'biweek')}
        onClick={() => props.onModeChange('biweek')}
        title="Bi-Weekly View"
      >
        <span>14</span>
        <span>Bi-Week</span>
      </button>
      <button
        style={buttonStyle(props.mode === 'month')}
        onClick={() => props.onModeChange('month')}
        title="Month View"
      >
        <span>30</span>
        <span>Month</span>
      </button>
    </div>
  );
};

export default TimesheetViewModeToggle;
