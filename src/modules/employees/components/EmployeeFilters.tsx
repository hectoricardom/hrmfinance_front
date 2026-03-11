import { Component, For, Show } from 'solid-js';
import { EmployeeFilter } from '../stores/employeeStore';
import { useTranslation } from '../../../translations';

interface EmployeeFiltersProps {
  filters: EmployeeFilter;
  onFiltersChange: (filters: EmployeeFilter) => void;
  departments: string[];
  positions: string[];
  onClearFilters: () => void;
}

const EmployeeFilters: Component<EmployeeFiltersProps> = (props) => {
  const { t } = useTranslation();

  const hasActiveFilters = () => {
    const f = props.filters;
    return !!(f.department || f.position || f.status || f.searchTerm);
  };

  const selectStyle = {
    padding: '0.5rem 0.75rem',
    'border-radius': '0.375rem',
    border: '1px solid var(--border-color)',
    'font-size': '0.875rem',
    'background-color': 'var(--surface-color)',
    cursor: 'pointer',
    'min-width': '150px',
  };

  const inputStyle = {
    padding: '0.5rem 0.75rem',
    'border-radius': '0.375rem',
    border: '1px solid var(--border-color)',
    'font-size': '0.875rem',
    'background-color': 'var(--surface-color)',
    'min-width': '200px',
  };

  const updateFilter = <K extends keyof EmployeeFilter>(key: K, value: EmployeeFilter[K]) => {
    props.onFiltersChange({ ...props.filters, [key]: value });
  };

  return (
    <div
      style={{
        display: 'flex',
        'flex-wrap': 'wrap',
        gap: '0.75rem',
        'align-items': 'center',
        padding: '0.75rem 1rem',
        'background-color': 'var(--blue-ribbon-25, #fafaff)',
        'border-radius': '0.5rem',
        border: '1px solid var(--border-color)',
        'margin-bottom': '1rem',
      }}
    >
      <span
        style={{
          'font-weight': '500',
          color: 'var(--text-secondary)',
          'font-size': '0.875rem',
        }}
      >
        {t('common.filters') || 'Filters'}:
      </span>

      {/* Search */}
      <input
        type="text"
        placeholder={t('employees.searchPlaceholder') || 'Search by name, email...'}
        value={props.filters.searchTerm || ''}
        onInput={(e) => updateFilter('searchTerm', e.currentTarget.value || undefined)}
        style={inputStyle}
      />

      {/* Department Filter */}
      <select
        value={props.filters.department || ''}
        onChange={(e) => updateFilter('department', e.currentTarget.value || undefined)}
        style={selectStyle}
      >
        <option value="">{t('employees.allDepartments') || 'All Departments'}</option>
        <For each={props.departments}>
          {(dept) => <option value={dept}>{dept}</option>}
        </For>
      </select>

      {/* Position Filter */}
      <select
        value={props.filters.position || ''}
        onChange={(e) => updateFilter('position', e.currentTarget.value || undefined)}
        style={selectStyle}
      >
        <option value="">{t('employees.allPositions') || 'All Positions'}</option>
        <For each={props.positions}>
          {(pos) => <option value={pos}>{pos}</option>}
        </For>
      </select>

      {/* Status Filter */}
      <select
        value={props.filters.status || ''}
        onChange={(e) => updateFilter('status', (e.currentTarget.value || undefined) as EmployeeFilter['status'])}
        style={selectStyle}
      >
        <option value="">{t('employees.allStatuses') || 'All Statuses'}</option>
        <option value="active">{t('employees.status.active') || 'Active'}</option>
        <option value="inactive">{t('employees.status.inactive') || 'Inactive'}</option>
        <option value="on_leave">{t('employees.status.onLeave') || 'On Leave'}</option>
        <option value="terminated">{t('employees.status.terminated') || 'Terminated'}</option>
      </select>

      {/* Clear Filters */}
      <Show when={hasActiveFilters()}>
        <button
          onClick={props.onClearFilters}
          style={{
            padding: '0.5rem 0.75rem',
            'border-radius': '0.375rem',
            border: 'none',
            'font-size': '0.875rem',
            'background-color': '#fee2e2',
            color: '#991b1b',
            cursor: 'pointer',
            display: 'flex',
            'align-items': 'center',
            gap: '0.25rem',
          }}
        >
          <span>✕</span>
          <span>{t('common.clearFilters') || 'Clear'}</span>
        </button>
      </Show>
    </div>
  );
};

export default EmployeeFilters;
