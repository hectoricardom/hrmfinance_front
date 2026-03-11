import { Employee } from '../stores/employeeStore';

/**
 * Repository interface for Employee data operations
 * Provides abstraction over data access layer
 */
export interface IEmployeeRepository {
  /**
   * Retrieve all employees
   */
  getAll(): Promise<Employee[]>;

  /**
   * Retrieve a single employee by ID
   * @param id - Employee ID
   * @returns Employee or null if not found
   */
  getById(id: string): Promise<Employee | null>;

  /**
   * Create a new employee
   * @param employee - Employee data without ID
   * @returns Created employee with generated ID
   */
  create(employee: Omit<Employee, 'id'>): Promise<Employee>;

  /**
   * Update an existing employee
   * @param id - Employee ID
   * @param updates - Partial employee data to update
   * @returns Updated employee
   */
  update(id: string, updates: Partial<Employee>): Promise<Employee>;

  /**
   * Delete an employee
   * @param id - Employee ID
   */
  delete(id: string): Promise<void>;

  /**
   * Search employees by query string
   * @param query - Search query (name, email, position, etc.)
   * @returns Array of matching employees
   */
  search(query: string): Promise<Employee[]>;

  /**
   * Get employees by department
   * @param department - Department name
   * @returns Array of employees in the department
   */
  getByDepartment(department: string): Promise<Employee[]>;

  /**
   * Get active employees
   * @returns Array of active employees
   */
  getActive(): Promise<Employee[]>;

  /**
   * Get employees by position
   * @param position - Position/role name
   * @returns Array of employees with the specified position
   */
  getByPosition(position: string): Promise<Employee[]>;

  /**
   * Get employee statistics
   * @returns Statistics about employees
   */
  getStats(): Promise<{
    total: number;
    active: number;
    byDepartment: Record<string, number>;
    byPosition: Record<string, number>;
  } | null>;
}
