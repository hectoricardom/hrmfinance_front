import { Component, createSignal, createEffect, onCleanup, Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { Layout } from '../../ui';
import { Card } from '../../ui';
import { Button } from '../../ui';
import { useTranslation } from '../../../translations';
import AddEmployeeModal from '../components/AddEmployeeModal';
import EmployeeDetailModal from '../components/EmployeeDetailModal';
import EmployeeTable from '../components/EmployeeTable';
import EmployeeFilters from '../components/EmployeeFilters';
import BulkActionsToolbar from '../components/BulkActionsToolbar';
import ViewModeToggle from '../components/ViewModeToggle';
import { employeeStore, Employee } from '../stores/employeeStore';

const Employees: Component = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isAddModalOpen, setIsAddModalOpen] = createSignal(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = createSignal(false);
  const [selectedEmployee, setSelectedEmployee] = createSignal<Employee | null>(null);
  const [isSearching, setIsSearching] = createSignal(false);

  // Load all employees on mount
  createEffect(() => {
    employeeStore.loadEmployees();
  });

  // Get departments and positions for filters
  const departments = () => employeeStore.getUniqueDepartments();
  const positions = () => employeeStore.getUniquePositions();

  // Get filtered employees from store
  const displayedEmployees = () => employeeStore.filteredEmployees;

  const handleViewEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsDetailModalOpen(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    // TODO: Open edit modal
  };

  const handleDeleteEmployee = async (employee: Employee) => {
    if (confirm(`Are you sure you want to delete ${employee.name}?`)) {
      await employeeStore.deleteEmployee(employee.id);
    }
  };

  const handleBulkDelete = async () => {
    const count = employeeStore.selectedCount;
    if (confirm(`Are you sure you want to delete ${count} employee(s)?`)) {
      await employeeStore.bulkDeleteEmployees(employeeStore.selectedEmployees);
    }
  };

  const handleBulkAssignDepartment = async (department: string) => {
    await employeeStore.bulkAssignDepartment(employeeStore.selectedEmployees, department);
  };

  const handleBulkExport = (format: 'csv' | 'pdf') => {
    const selected = employeeStore.getSelectedEmployees();
    // TODO: Implement export
    console.log(`Exporting ${selected.length} employees as ${format}`);
  };

  const handleViewTimesheet = (employeeId: string, e: MouseEvent) => {
    e.stopPropagation();
    navigate(`/timesheets?employee=${employeeId}`);
  };

  const employeeGridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1.5rem',
    'margin-bottom': '2rem'
  };

  const employeeCardStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '1rem'
  };

  const avatarStyle = {
    width: '60px',
    height: '60px',
    'border-radius': '50%',
    background: 'linear-gradient(135deg, var(--blue-ribbon-500), var(--blue-ribbon-800))',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    color: 'white',
    'font-weight': '600',
    'font-size': '1.2rem',
    'box-shadow': '0 4px 12px rgba(108, 92, 231, 0.3)'
  };

  const employeeInfoStyle = {
    flex: '1'
  };

  const nameStyle = {
    'font-weight': '600',
    'margin-bottom': '0.25rem'
  };

  const positionStyle = {
    color: 'var(--text-muted)',
    'font-size': '0.875rem',
    'margin-bottom': '0.5rem'
  };

  const salaryStyle = {
    color: 'var(--blue-ribbon-600)',
    'font-weight': '600',
    'font-size': '0.95rem'
  };

  return (
    <Layout title={t('employees.title')}>
      {/* Header with Add Button and View Toggle */}
      <div style={{ 'margin-bottom': '1rem', display: 'flex', gap: '1rem', 'align-items': 'center', 'justify-content': 'space-between' }}>
        <div style={{ display: 'flex', gap: '1rem', 'align-items': 'center' }}>
          <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>{t('employees.addEmployee')}</Button>
          <span style={{ color: 'var(--text-muted)', 'font-size': '0.875rem' }}>
            {displayedEmployees().length} {t('employees.title').toLowerCase()}
          </span>
        </div>
        <ViewModeToggle
          mode={employeeStore.viewMode}
          onModeChange={(mode) => employeeStore.setViewMode(mode)}
        />
      </div>

      {/* Filters */}
      <EmployeeFilters
        filters={employeeStore.filters}
        onFiltersChange={(filters) => employeeStore.setFilters(filters)}
        departments={departments()}
        positions={positions()}
        onClearFilters={() => employeeStore.clearFilters()}
      />

      {/* Bulk Actions Toolbar */}
      <BulkActionsToolbar
        selectedCount={employeeStore.selectedCount}
        onBulkDelete={handleBulkDelete}
        onBulkExport={handleBulkExport}
        onBulkAssignDepartment={handleBulkAssignDepartment}
        onClearSelection={() => employeeStore.clearSelection()}
        departments={departments()}
      />

      {/* Loading State */}
      <Show when={employeeStore.isLoading}>
        <div style={{
          'text-align': 'center',
          padding: '2rem',
          color: 'var(--text-muted)',
          'font-size': '0.875rem'
        }}>
          Loading employees...
        </div>
      </Show>

      {/* Empty State */}
      <Show when={!employeeStore.isLoading && displayedEmployees().length === 0}>
        <div style={{
          'text-align': 'center',
          padding: '3rem',
          color: 'var(--text-muted)'
        }}>
          <div style={{ 'font-size': '3rem', 'margin-bottom': '1rem' }}>👥</div>
          <div style={{ 'font-size': '1.125rem', 'margin-bottom': '0.5rem' }}>
            {t('employees.noEmployees') || 'No employees found'}
          </div>
          <div style={{ 'font-size': '0.875rem' }}>
            {employeeStore.filters.searchTerm || employeeStore.filters.department || employeeStore.filters.status
              ? 'Try adjusting your filters'
              : 'Add your first employee to get started'}
          </div>
        </div>
      </Show>

      {/* Table View */}
      <Show when={!employeeStore.isLoading && employeeStore.viewMode === 'table' && displayedEmployees().length > 0}>
        <EmployeeTable
          employees={displayedEmployees()}
          onViewDetails={handleViewEmployee}
          onEdit={handleEditEmployee}
          onDelete={handleDeleteEmployee}
        />
      </Show>

      {/* Card View */}
      <Show when={!employeeStore.isLoading && employeeStore.viewMode === 'cards' && displayedEmployees().length > 0}>
        <div style={employeeGridStyle}>
          {displayedEmployees().map(employee => {
            const getInitials = (name: string) => {
              return name?.split(' ').map(n => n[0]).join('').toUpperCase();
            };

            const formatSalary = (salary: number) => {
              return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
              }).format(salary);
            };

            const isSelected = () => employeeStore.isSelected(employee.id);

            return (
              <Card>
                <div
                  style={{
                    ...employeeCardStyle,
                    position: 'relative',
                    cursor: 'pointer',
                    'background-color': isSelected() ? 'var(--blue-ribbon-50)' : 'transparent',
                    'border-radius': '0.5rem',
                    padding: '0.5rem',
                    margin: '-0.5rem',
                    'margin-bottom': '0'
                  }}
                  onClick={() => handleViewEmployee(employee)}
                >
                  {/* Selection Checkbox */}
                  <input
                    type="checkbox"
                    checked={isSelected()}
                    onChange={(e) => {
                      e.stopPropagation();
                      employeeStore.toggleSelection(employee.id);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      position: 'absolute',
                      top: '0.5rem',
                      right: '0.5rem',
                      width: '1rem',
                      height: '1rem',
                      cursor: 'pointer'
                    }}
                  />
                  <div style={avatarStyle}>{getInitials(employee.name)}</div>
                  <div style={employeeInfoStyle}>
                    <div style={nameStyle}>{employee.name}</div>
                    <div style={positionStyle}>{employee.position}</div>
                    <div style={salaryStyle}>{formatSalary(employee.salary)}/year</div>
                  </div>
                </div>
                <div style={{ 'margin-top': '1rem', 'padding-top': '1rem', 'border-top': '1px solid var(--border-color)', display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={(e) => handleViewTimesheet(employee.id, e)}
                    style={{
                      flex: '1',
                      padding: '0.5rem 1rem',
                      background: 'linear-gradient(135deg, var(--blue-ribbon-500), var(--blue-ribbon-700))',
                      color: 'white',
                      border: 'none',
                      'border-radius': '0.375rem',
                      'font-weight': '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      'font-size': '0.875rem',
                      'box-shadow': '0 2px 8px rgba(108, 92, 231, 0.2)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(108, 92, 231, 0.35)';
                      e.currentTarget.style.background = 'linear-gradient(135deg, var(--blue-ribbon-600), var(--blue-ribbon-800))';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(108, 92, 231, 0.2)';
                      e.currentTarget.style.background = 'linear-gradient(135deg, var(--blue-ribbon-500), var(--blue-ribbon-700))';
                    }}
                  >
                    📅 {t('timesheets.viewTimesheet')}
                  </button>
                  <button
                    onClick={() => handleViewEmployee(employee)}
                    style={{
                      padding: '0.5rem 1rem',
                      background: 'var(--blue-ribbon-50)',
                      color: 'var(--blue-ribbon-700)',
                      border: '2px solid var(--blue-ribbon-200)',
                      'border-radius': '0.375rem',
                      'font-weight': '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      'font-size': '0.875rem'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--blue-ribbon-100)';
                      e.currentTarget.style.borderColor = 'var(--blue-ribbon-300)';
                      e.currentTarget.style.color = 'var(--blue-ribbon-800)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--blue-ribbon-50)';
                      e.currentTarget.style.borderColor = 'var(--blue-ribbon-200)';
                      e.currentTarget.style.color = 'var(--blue-ribbon-700)';
                    }}
                  >
                    👁️ {t('common.details')}
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      </Show>

      <AddEmployeeModal
        isOpen={isAddModalOpen()}
        onClose={() => setIsAddModalOpen(false)}
      />

      <EmployeeDetailModal
        isOpen={isDetailModalOpen()}
        onClose={() => setIsDetailModalOpen(false)}
        employee={selectedEmployee()}
      />
    </Layout>
  );
};

export default Employees;




