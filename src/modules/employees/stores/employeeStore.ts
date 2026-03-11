import { createSignal, createMemo } from 'solid-js';
import { employeeConnector } from '../../../connectors/employee';

export interface Employee {
  id: string;
  name: string;
  position: string;
  salary: number;
  email: string;
  phone: string;
  department: string;
  startDate: string;
  avatar?: string;
  status?: 'active' | 'inactive' | 'terminated' | 'on_leave';
  employeeNumber?: string;
  // Payroll settings
  payType?: 'hourly' | 'salary';
  hourlyRate?: number;
  annualSalary?: number;
  overtimeRate?: number; // multiplier (e.g., 1.5 for time-and-a-half)
  standardHoursPerWeek?: number; // e.g., 40 hours
  taxRate?: number; // percentage
  insuranceDeduction?: number;
}

export type EmployeeViewMode = 'cards' | 'table';

export interface EmployeeFilter {
  department?: string;
  status?: Employee['status'];
  position?: string;
  searchTerm?: string;
}

export interface EmployeeSort {
  field: keyof Employee;
  direction: 'asc' | 'desc';
}

export interface BulkOperationResult {
  success: number;
  failed: number;
  errors: Array<{ employeeId: string; message: string }>;
}

const [employees, setEmployees] = createSignal<Employee[]>([]);
const [isLoading, setIsLoading] = createSignal(false);
const [selectedEmployees, setSelectedEmployees] = createSignal<string[]>([]);
const [viewMode, setViewMode] = createSignal<EmployeeViewMode>('cards');
const [filters, setFilters] = createSignal<EmployeeFilter>({});
const [sortConfig, setSortConfig] = createSignal<EmployeeSort>({ field: 'name', direction: 'asc' });

// Computed filtered and sorted employees
const getFilteredEmployees = (): Employee[] => {
  let result = [...employees()];
  const currentFilters = filters();
  const currentSort = sortConfig();

  // Apply filters
  if (currentFilters.department) {
    result = result.filter(emp => emp.department === currentFilters.department);
  }
  if (currentFilters.status) {
    result = result.filter(emp => emp.status === currentFilters.status);
  }
  if (currentFilters.position) {
    result = result.filter(emp => emp.position === currentFilters.position);
  }
  if (currentFilters.searchTerm) {
    const term = currentFilters.searchTerm.toLowerCase();
    result = result.filter(emp =>
      emp.name.toLowerCase().includes(term) ||
      emp.email?.toLowerCase().includes(term) ||
      emp.position?.toLowerCase().includes(term) ||
      emp.department?.toLowerCase().includes(term)
    );
  }

  // Apply sorting
  result.sort((a, b) => {
    const aVal = a[currentSort.field];
    const bVal = b[currentSort.field];

    if (aVal === undefined || aVal === null) return 1;
    if (bVal === undefined || bVal === null) return -1;

    let comparison = 0;
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      comparison = aVal.localeCompare(bVal);
    } else if (typeof aVal === 'number' && typeof bVal === 'number') {
      comparison = aVal - bVal;
    }

    return currentSort.direction === 'asc' ? comparison : -comparison;
  });

  return result;
};

export const employeeStore = {
  get employees() {
    return employees();
  },

  get isLoading() {
    return isLoading();
  },

  // Selection getters
  get selectedEmployees() {
    return selectedEmployees();
  },

  get selectedCount() {
    return selectedEmployees().length;
  },

  // View mode
  get viewMode() {
    return viewMode();
  },

  setViewMode(mode: EmployeeViewMode) {
    setViewMode(mode);
  },

  // Filters
  get filters() {
    return filters();
  },

  setFilters(newFilters: EmployeeFilter) {
    setFilters(newFilters);
  },

  updateFilter<K extends keyof EmployeeFilter>(key: K, value: EmployeeFilter[K]) {
    setFilters(prev => ({ ...prev, [key]: value }));
  },

  clearFilters() {
    setFilters({});
  },

  // Sorting
  get sortConfig() {
    return sortConfig();
  },

  setSortConfig(config: EmployeeSort) {
    setSortConfig(config);
  },

  toggleSort(field: keyof Employee) {
    const current = sortConfig();
    if (current.field === field) {
      setSortConfig({ field, direction: current.direction === 'asc' ? 'desc' : 'asc' });
    } else {
      setSortConfig({ field, direction: 'asc' });
    }
  },

  // Filtered results
  get filteredEmployees() {
    return getFilteredEmployees();
  },

  // Selection methods
  selectEmployee(id: string) {
    if (!selectedEmployees().includes(id)) {
      setSelectedEmployees([...selectedEmployees(), id]);
    }
  },

  deselectEmployee(id: string) {
    setSelectedEmployees(selectedEmployees().filter(eid => eid !== id));
  },

  toggleSelection(id: string) {
    if (selectedEmployees().includes(id)) {
      this.deselectEmployee(id);
    } else {
      this.selectEmployee(id);
    }
  },

  selectAll() {
    const allIds = getFilteredEmployees().map(emp => emp.id);
    setSelectedEmployees(allIds);
  },

  clearSelection() {
    setSelectedEmployees([]);
  },

  isSelected(id: string): boolean {
    return selectedEmployees().includes(id);
  },

  getSelectedEmployees(): Employee[] {
    const selectedIds = selectedEmployees();
    return employees().filter(emp => selectedIds.includes(emp.id));
  },

  // Bulk operations
  async bulkUpdateEmployees(ids: string[], updates: Partial<Employee>): Promise<BulkOperationResult> {
    const result: BulkOperationResult = { success: 0, failed: 0, errors: [] };

    for (const id of ids) {
      try {
        await employeeConnector.updateEmployee(id, updates);
        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push({ employeeId: id, message: error.message || 'Update failed' });
      }
    }

    // Refresh employees after bulk update
    if (result.success > 0) {
      await this.loadEmployees();
    }

    return result;
  },

  async bulkDeleteEmployees(ids: string[]): Promise<BulkOperationResult> {
    const result: BulkOperationResult = { success: 0, failed: 0, errors: [] };

    for (const id of ids) {
      try {
        await employeeConnector.deleteEmployee(id);
        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push({ employeeId: id, message: error.message || 'Delete failed' });
      }
    }

    // Update local state
    if (result.success > 0) {
      setEmployees(employees().filter(emp => !ids.includes(emp.id)));
      setSelectedEmployees(selectedEmployees().filter(id => !ids.includes(id)));
    }

    return result;
  },

  async bulkAssignDepartment(ids: string[], department: string): Promise<BulkOperationResult> {
    return this.bulkUpdateEmployees(ids, { department });
  },

  // Get unique values for filter dropdowns
  getUniqueDepartments(): string[] {
    const departments = new Set(employees().map(emp => emp.department).filter(Boolean));
    return Array.from(departments).sort();
  },

  getUniquePositions(): string[] {
    const positions = new Set(employees().map(emp => emp.position).filter(Boolean));
    return Array.from(positions).sort();
  },

  /**
   * Load all employees from the server
   */
  async loadEmployees() {
    try {
      setIsLoading(true);
      const data = await employeeConnector.getAllEmployees();
     
      setEmployees(data);
      return data;
    } catch (error) {
      console.error('Failed to load employees:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  },

  /**
   * Search employees
   */
  async searchEmployees(query: string) {
    try {
      setIsLoading(true);
      const data = await employeeConnector.getEmployees(query);
      setEmployees(data);
      return data;
    } catch (error) {
      console.error('Failed to search employees:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  },

  /**
   * Get employees by department
   */
  async getEmployeesByDepartment(department: string) {
    try {
      const data = await employeeConnector.getEmployeesByDepartment(department);
      return data;
    } catch (error) {
      console.error('Failed to get employees by department:', error);
      return [];
    }
  },

  /**
   * Get employees by position
   */
  async getEmployeesByPosition(position: string) {
    try {
      const data = await employeeConnector.getEmployeesByPosition(position);
      return data;
    } catch (error) {
      console.error('Failed to get employees by position:', error);
      return [];
    }
  },

  /**
   * Get active employees
   */
  async getActiveEmployees() {
    try {
      const data = await employeeConnector.getActiveEmployees();
      return data;
    } catch (error) {
      console.error('Failed to get active employees:', error);
      return [];
    }
  },

  /**
   * Get employee statistics
   */
  async getEmployeesStats() {
    try {
      const data = await employeeConnector.getEmployeesStats();
      return data;
    } catch (error) {
      console.error('Failed to get employee stats:', error);
      return null;
    }
  },

  /**
   * Add a new employee
   */
  async addEmployee(employee: Omit<Employee, 'id'>) {
    try {
      setIsLoading(true);
      const newEmployee = await employeeConnector.addEmployee(employee);
      setEmployees([...employees(), newEmployee]);
      return newEmployee;
    } catch (error) {
      console.error('Failed to add employee:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  },

  /**
   * Add employee with verification
   */
  async addEmployeeVerify(employee: Omit<Employee, 'id'>) {
    try {
      setIsLoading(true);
      const result = await employeeConnector.addEmployeeVerify(employee);
      if (result.success && result.employee) {
        setEmployees([...employees(), result.employee]);
      }
      return result;
    } catch (error) {
      console.error('Failed to add employee with verification:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  },

  /**
   * Update an employee
   */
  async updateEmployee(id: string, updates: Partial<Employee>) {
    try {
      setIsLoading(true);
      const updatedEmployee = await employeeConnector.updateEmployee(id, updates);
      setEmployees(employees().map(emp =>
        emp.id === id ? updatedEmployee : emp
      ));
      return updatedEmployee;
    } catch (error) {
      console.error('Failed to update employee:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  },

  /**
   * Delete an employee
   */
  async deleteEmployee(id: string) {
    try {
      setIsLoading(true);
      await employeeConnector.deleteEmployee(id);
      setEmployees(employees().filter(emp => emp.id !== id));
    } catch (error) {
      console.error('Failed to delete employee:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  },

  /**
   * Get employee by ID (from local state)
   */
  getEmployeeById(id: string) {
    return employees().find(emp => emp.id === id);
  },

  /**
   * Get employee by ID from server
   */
  async fetchEmployeeById(id: string) {
    try {
      const employee = await employeeConnector.getEmployeeById(id);
      if (employee) {
        // Update local state with fetched employee
        const existing = employees().find(emp => emp.id === id);
        if (existing) {
          setEmployees(employees().map(emp => emp.id === id ? employee : emp));
        } else {
          setEmployees([...employees(), employee]);
        }
      }
      return employee;
    } catch (error) {
      console.error('Failed to fetch employee:', error);
      return null;
    }
  }
};