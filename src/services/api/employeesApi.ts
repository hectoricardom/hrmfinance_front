import { apiService } from '../api';
import { Employee } from '../../modules/employees/stores/employeesStore';
import {
  GET_EMPLOYEES,
  GET_EMPLOYEE_BY_ID,
  CREATE_EMPLOYEE,
  UPDATE_EMPLOYEE,
  DELETE_EMPLOYEE
} from '../graphql/queries';

export interface CreateEmployeeInput {
  employeeId: string;
  fullName: string;
  position: string;
  department: string;
  email: string;
  phone?: string;
  salary: number;
  hireDate: string;
  isActive?: boolean;
}

export interface UpdateEmployeeInput extends Partial<CreateEmployeeInput> {}

export interface EmployeeFilter {
  department?: string;
  position?: string;
  isActive?: boolean;
  search?: string;
}

export interface EmployeeSort {
  field: 'fullName' | 'position' | 'department' | 'hireDate' | 'salary';
  direction: 'asc' | 'desc';
}

export class EmployeesApi {
  // Get all employees
  async getEmployees(filter?: EmployeeFilter, sort?: EmployeeSort): Promise<Employee[]> {
    try {
      const response = await apiService.graphql<{ employees: Employee[] }>({
        query: GET_EMPLOYEES,
        variables: { filter, sort }
      });
      return response.employees;
    } catch (error) {
      console.error('Error fetching employees:', error);
      throw error;
    }
  }

  // Get employee by ID
  async getEmployeeById(id: string): Promise<Employee | null> {
    try {
      const response = await apiService.graphql<{ employee: Employee }>({
        query: GET_EMPLOYEE_BY_ID,
        variables: { id }
      });
      return response.employee;
    } catch (error) {
      console.error('Error fetching employee:', error);
      throw error;
    }
  }

  // Create new employee
  async createEmployee(input: CreateEmployeeInput): Promise<Employee> {
    try {
      this.validateEmployee(input);

      const response = await apiService.graphql<{ createEmployee: Employee }>({
        query: CREATE_EMPLOYEE,
        variables: { input }
      });
      return response.createEmployee;
    } catch (error) {
      console.error('Error creating employee:', error);
      throw error;
    }
  }

  // Update employee
  async updateEmployee(id: string, input: UpdateEmployeeInput): Promise<Employee> {
    try {
      if (input.email) {
        this.validateEmail(input.email);
      }

      const response = await apiService.graphql<{ updateEmployee: Employee }>({
        query: UPDATE_EMPLOYEE,
        variables: { id, input }
      });
      return response.updateEmployee;
    } catch (error) {
      console.error('Error updating employee:', error);
      throw error;
    }
  }

  // Delete employee
  async deleteEmployee(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiService.graphql<{ deleteEmployee: { success: boolean; message: string } }>({
        query: DELETE_EMPLOYEE,
        variables: { id }
      });
      return response.deleteEmployee;
    } catch (error) {
      console.error('Error deleting employee:', error);
      throw error;
    }
  }

  // Get employees by department
  async getEmployeesByDepartment(department: string): Promise<Employee[]> {
    return this.getEmployees({ department });
  }

  // Get active employees
  async getActiveEmployees(): Promise<Employee[]> {
    return this.getEmployees({ isActive: true });
  }

  // Search employees
  async searchEmployees(query: string): Promise<Employee[]> {
    return this.getEmployees({ search: query });
  }

  // Get employee statistics
  async getEmployeeStats(): Promise<{
    totalEmployees: number;
    activeEmployees: number;
    inactiveEmployees: number;
    departmentCounts: Record<string, number>;
    totalPayroll: number;
  }> {
    try {
      const employees = await this.getEmployees();
      
      const stats = {
        totalEmployees: employees.length,
        activeEmployees: employees.filter(e => e.isActive).length,
        inactiveEmployees: employees.filter(e => !e.isActive).length,
        departmentCounts: {} as Record<string, number>,
        totalPayroll: 0
      };

      // Calculate department counts and payroll
      employees.forEach(employee => {
        // Department counts
        if (!stats.departmentCounts[employee.department]) {
          stats.departmentCounts[employee.department] = 0;
        }
        stats.departmentCounts[employee.department]++;

        // Total payroll (only active employees)
        if (employee.isActive) {
          stats.totalPayroll += employee.salary;
        }
      });

      return stats;
    } catch (error) {
      console.error('Error getting employee stats:', error);
      throw error;
    }
  }

  // Validate employee data
  private validateEmployee(input: CreateEmployeeInput): void {
    if (!input.fullName.trim()) {
      throw new Error('Full name is required');
    }
    
    if (!input.position.trim()) {
      throw new Error('Position is required');
    }
    
    if (!input.department.trim()) {
      throw new Error('Department is required');
    }
    
    if (!input.email.trim()) {
      throw new Error('Email is required');
    }
    
    this.validateEmail(input.email);
    
    if (input.salary <= 0) {
      throw new Error('Salary must be greater than 0');
    }
    
    if (!input.hireDate) {
      throw new Error('Hire date is required');
    }
  }

  // Validate email format
  private validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }
  }

  // Generate next employee ID
  async generateNextEmployeeId(): Promise<string> {
    try {
      const employees = await this.getEmployees({}, { field: 'fullName', direction: 'asc' });
      const currentYear = new Date().getFullYear();
      const yearPrefix = currentYear.toString().slice(-2);
      
      // Find the highest employee number for the current year
      const currentYearEmployees = employees.filter(emp => 
        emp.employeeId.startsWith(`EMP${yearPrefix}`)
      );
      
      if (currentYearEmployees.length === 0) {
        return `EMP${yearPrefix}001`;
      }
      
      const lastEmployee = currentYearEmployees.sort((a, b) => 
        b.employeeId.localeCompare(a.employeeId)
      )[0];
      
      const lastNumber = parseInt(lastEmployee.employeeId.slice(-3));
      const nextNumber = lastNumber + 1;
      
      return `EMP${yearPrefix}${nextNumber.toString().padStart(3, '0')}`;
    } catch (error) {
      console.error('Error generating employee ID:', error);
      const currentYear = new Date().getFullYear();
      const yearPrefix = currentYear.toString().slice(-2);
      return `EMP${yearPrefix}${Date.now().toString().slice(-3)}`;
    }
  }
}

// Export singleton instance
export const employeesApi = new EmployeesApi();