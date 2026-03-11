import { Component, For, Show, createMemo, JSX } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { Employee, EmployeeSort, employeeStore } from '../stores/employeeStore';
import { useTranslation } from '../../../translations';

interface EmployeeTableProps {
  employees: Employee[];
  onViewDetails: (employee: Employee) => void;
  onEdit?: (employee: Employee) => void;
  onDelete?: (employee: Employee) => void;
}

const EmployeeTable: Component<EmployeeTableProps> = (props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const sortConfig = () => employeeStore.sortConfig;
  const selectedEmployees = () => employeeStore.selectedEmployees;

  const isAllSelected = createMemo(() => {
    const emps = props.employees;
    return emps.length > 0 && emps.every(emp => employeeStore.isSelected(emp.id));
  });

  const handleSelectAll = () => {
    if (isAllSelected()) {
      employeeStore.clearSelection();
    } else {
      employeeStore.selectAll();
    }
  };

  const handleSort = (field: keyof Employee) => {
    employeeStore.toggleSort(field);
  };

  const handleViewTimesheet = (employeeId: string, e: MouseEvent) => {
    e.stopPropagation();
    navigate(`/timesheets?employee=${employeeId}`);
  };

  const formatSalary = (salary: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(salary);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status?: string) => {
    const statusColors: Record<string, { bg: string; text: string }> = {
      active: { bg: '#dcfce7', text: '#166534' },
      inactive: { bg: '#f3f4f6', text: '#6b7280' },
      terminated: { bg: '#fee2e2', text: '#991b1b' },
      on_leave: { bg: '#fef3c7', text: '#92400e' }
    };
    const colors = statusColors[status || 'active'] || statusColors.active;
    return colors;
  };

  const getSortIcon = (field: keyof Employee) => {
    const config = sortConfig();
    if (config.field !== field) return '↕';
    return config.direction === 'asc' ? '↑' : '↓';
  };

  const tableStyles: Record<string, JSX.CSSProperties> = {
    container: {
      width: '100%',
      'overflow-x': 'auto',
      'border-radius': '0.5rem',
      border: '1px solid var(--border-color)',
      'background-color': 'var(--surface-color)'
    },
    table: {
      width: '100%',
      'border-collapse': 'collapse',
      'font-size': '0.875rem'
    },
    th: {
      'text-align': 'left' as const,
      padding: '0.75rem 1rem',
      'font-weight': '600',
      'background-color': 'var(--blue-ribbon-50)',
      'border-bottom': '2px solid var(--border-color)',
      'white-space': 'nowrap' as const,
      cursor: 'pointer',
      'user-select': 'none' as const
    },
    thSortable: {
      display: 'flex',
      'align-items': 'center',
      gap: '0.5rem'
    },
    td: {
      padding: '0.75rem 1rem',
      'border-bottom': '1px solid var(--border-color)',
      'vertical-align': 'middle' as const
    },
    tr: {
      transition: 'background-color 0.15s'
    },
    trHover: {
      'background-color': 'var(--blue-ribbon-50)'
    },
    checkbox: {
      width: '1rem',
      height: '1rem',
      cursor: 'pointer'
    },
    avatar: {
      width: '36px',
      height: '36px',
      'border-radius': '50%',
      background: 'linear-gradient(135deg, var(--blue-ribbon-500), var(--blue-ribbon-800))',
      display: 'flex',
      'align-items': 'center',
      'justify-content': 'center',
      color: 'white',
      'font-weight': '600',
      'font-size': '0.75rem'
    },
    nameCell: {
      display: 'flex',
      'align-items': 'center',
      gap: '0.75rem'
    },
    actionBtn: {
      padding: '0.375rem 0.75rem',
      'font-size': '0.75rem',
      'border-radius': '0.25rem',
      cursor: 'pointer',
      border: 'none',
      transition: 'all 0.15s'
    }
  };

  return (
    <div style={tableStyles.container}>
      <table style={tableStyles.table}>
        <thead>
          <tr>
            <th style={{ ...tableStyles.th, width: '40px' }}>
              <input
                type="checkbox"
                checked={isAllSelected()}
                onChange={handleSelectAll}
                style={tableStyles.checkbox}
              />
            </th>
            <th style={tableStyles.th} onClick={() => handleSort('name')}>
              <div style={tableStyles.thSortable}>
                <span>{t('employees.name') || 'Name'}</span>
                <span style={{ opacity: 0.5 }}>{getSortIcon('name')}</span>
              </div>
            </th>
            <th style={tableStyles.th} onClick={() => handleSort('department')}>
              <div style={tableStyles.thSortable}>
                <span>{t('employees.department') || 'Department'}</span>
                <span style={{ opacity: 0.5 }}>{getSortIcon('department')}</span>
              </div>
            </th>
            <th style={tableStyles.th} onClick={() => handleSort('position')}>
              <div style={tableStyles.thSortable}>
                <span>{t('employees.position') || 'Position'}</span>
                <span style={{ opacity: 0.5 }}>{getSortIcon('position')}</span>
              </div>
            </th>
            <th style={tableStyles.th} onClick={() => handleSort('salary')}>
              <div style={tableStyles.thSortable}>
                <span>{t('employees.salary') || 'Salary'}</span>
                <span style={{ opacity: 0.5 }}>{getSortIcon('salary')}</span>
              </div>
            </th>
            <th style={tableStyles.th} onClick={() => handleSort('startDate')}>
              <div style={tableStyles.thSortable}>
                <span>{t('employees.hireDate') || 'Hire Date'}</span>
                <span style={{ opacity: 0.5 }}>{getSortIcon('startDate')}</span>
              </div>
            </th>
            <th style={tableStyles.th}>
              <span>{t('employees.status') || 'Status'}</span>
            </th>
            <th style={{ ...tableStyles.th, 'text-align': 'right' }}>
              <span>{t('common.actions') || 'Actions'}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <For each={props.employees}>
            {(employee) => {
              const isSelected = () => employeeStore.isSelected(employee.id);
              const statusColors = getStatusBadge(employee.status);
              const initials = employee.name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';

              return (
                <tr
                  style={{
                    ...tableStyles.tr,
                    'background-color': isSelected() ? 'var(--blue-ribbon-50)' : 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected()) {
                      e.currentTarget.style.backgroundColor = 'var(--blue-ribbon-25, #f8f7ff)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected()) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <td style={tableStyles.td}>
                    <input
                      type="checkbox"
                      checked={isSelected()}
                      onChange={() => employeeStore.toggleSelection(employee.id)}
                      style={tableStyles.checkbox}
                    />
                  </td>
                  <td style={tableStyles.td}>
                    <div style={tableStyles.nameCell}>
                      <div style={tableStyles.avatar}>{initials}</div>
                      <div>
                        <div style={{ 'font-weight': '500' }}>{employee.name}</div>
                        <div style={{ color: 'var(--text-muted)', 'font-size': '0.75rem' }}>
                          {employee.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={tableStyles.td}>{employee.department || '-'}</td>
                  <td style={tableStyles.td}>{employee.position || '-'}</td>
                  <td style={tableStyles.td}>
                    <span style={{ 'font-weight': '500', color: 'var(--blue-ribbon-600)' }}>
                      {formatSalary(employee.salary)}
                    </span>
                  </td>
                  <td style={tableStyles.td}>{formatDate(employee.startDate)}</td>
                  <td style={tableStyles.td}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '0.25rem 0.75rem',
                        'border-radius': '9999px',
                        'font-size': '0.75rem',
                        'font-weight': '500',
                        'background-color': statusColors.bg,
                        color: statusColors.text,
                        'text-transform': 'capitalize'
                      }}
                    >
                      {(employee.status || 'active').replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ ...tableStyles.td, 'text-align': 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', 'justify-content': 'flex-end' }}>
                      <button
                        onClick={(e) => handleViewTimesheet(employee.id, e)}
                        style={{
                          ...tableStyles.actionBtn,
                          background: 'linear-gradient(135deg, var(--blue-ribbon-500), var(--blue-ribbon-700))',
                          color: 'white'
                        }}
                        title="View Timesheet"
                      >
                        📅
                      </button>
                      <button
                        onClick={() => props.onViewDetails(employee)}
                        style={{
                          ...tableStyles.actionBtn,
                          'background-color': 'var(--blue-ribbon-100)',
                          color: 'var(--blue-ribbon-700)'
                        }}
                        title="View Details"
                      >
                        👁️
                      </button>
                      <Show when={props.onEdit}>
                        <button
                          onClick={() => props.onEdit?.(employee)}
                          style={{
                            ...tableStyles.actionBtn,
                            'background-color': '#fef3c7',
                            color: '#92400e'
                          }}
                          title="Edit"
                        >
                          ✏️
                        </button>
                      </Show>
                      <Show when={props.onDelete}>
                        <button
                          onClick={() => props.onDelete?.(employee)}
                          style={{
                            ...tableStyles.actionBtn,
                            'background-color': '#fee2e2',
                            color: '#991b1b'
                          }}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </Show>
                    </div>
                  </td>
                </tr>
              );
            }}
          </For>
        </tbody>
      </table>

      <Show when={props.employees.length === 0}>
        <div
          style={{
            padding: '3rem',
            'text-align': 'center',
            color: 'var(--text-muted)'
          }}
        >
          {t('employees.noEmployees') || 'No employees found'}
        </div>
      </Show>
    </div>
  );
};

export default EmployeeTable;
