import { Component } from 'solid-js';
import { EmployeeViewMode } from '../stores/employeeStore';

interface ViewModeToggleProps {
  mode: EmployeeViewMode;
  onModeChange: (mode: EmployeeViewMode) => void;
}

const ViewModeToggle: Component<ViewModeToggleProps> = (props) => {
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
        style={buttonStyle(props.mode === 'cards')}
        onClick={() => props.onModeChange('cards')}
        title="Card View"
      >
        <span>▦</span>
        <span>Cards</span>
      </button>
      <button
        style={buttonStyle(props.mode === 'table')}
        onClick={() => props.onModeChange('table')}
        title="Table View"
      >
        <span>☰</span>
        <span>Table</span>
      </button>
    </div>
  );
};

export default ViewModeToggle;
