import { Component, createMemo, Show } from 'solid-js';
import { ChecklistItem } from '../../../types/taxStrategyTypes';

interface ChecklistItemRowProps {
  label: string;
  item: ChecklistItem;
  onChange: (updated: ChecklistItem) => void;
  showAmount?: boolean;
}

const ChecklistItemRow: Component<ChecklistItemRowProps> = (props) => {
  const showAmount = createMemo(() => props.showAmount !== false);

  // Safeguard for undefined items (e.g., new fields not in saved data)
  const item = createMemo(() => props.item || { id: '', checked: false, amount: undefined, notes: undefined });

  const containerStyle = createMemo((): Record<string, string> => ({
    display: 'flex',
    'align-items': 'center',
    padding: '0.5rem 0.75rem',
    'border-radius': 'var(--border-radius-md)',
    transition: 'background 0.2s',
    'border-bottom': '1px solid var(--border-color)',
    background: item().checked ? 'rgba(34, 197, 94, 0.08)' : 'transparent',
  }));

  const checkboxStyle: Record<string, string> = {
    width: '18px',
    height: '18px',
    'accent-color': '#22c55e',
    cursor: 'pointer',
  };

  const labelStyle: Record<string, string> = {
    flex: '1',
    'font-size': '0.875rem',
    color: 'var(--text-primary)',
    'margin-left': '0.75rem',
  };

  const amountInputStyle: Record<string, string> = {
    width: '120px',
    'text-align': 'right',
    padding: '0.375rem 0.5rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-md)',
    'font-size': '0.875rem',
    background: 'var(--surface-color)',
    color: 'var(--text-primary)',
  };

  const handleCheckboxChange = () => {
    props.onChange({
      ...item(),
      checked: !item().checked,
    });
  };

  const handleAmountBlur = (e: FocusEvent) => {
    const target = e.target as HTMLInputElement;
    const value = target.value.trim();
    const numValue = value === '' ? undefined : parseFloat(value);
    props.onChange({
      ...item(),
      amount: isNaN(numValue as number) ? undefined : numValue,
    });
  };

  const handleAmountKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      const target = e.target as HTMLInputElement;
      target.blur();
    }
  };

  return (
    <div style={containerStyle()}>
      <input
        type="checkbox"
        checked={item().checked}
        onChange={handleCheckboxChange}
        style={checkboxStyle}
      />
      <span style={labelStyle}>{props.label}</span>
      <Show when={showAmount()}>
        <input
          type="number"
          value={item().amount !== undefined ? item().amount : ''}
          onBlur={handleAmountBlur}
          onKeyDown={handleAmountKeyDown}
          onFocus={(e) => {
            (e.target as HTMLInputElement).style.setProperty('border-color', 'var(--primary-color)');
          }}
          onFocusOut={(e) => {
            (e.target as HTMLInputElement).style.setProperty('border-color', 'var(--border-color)');
          }}
          style={amountInputStyle}
          step="0.01"
          min="0"
          placeholder="0.00"
        />
      </Show>
    </div>
  );
};

export default ChecklistItemRow;
