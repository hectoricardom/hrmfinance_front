
import { Employee } from '../modules/employees/stores/employeeStore';

import { devLog, fetchGraphQLSS } from '../services/utils';
import { authStore } from '../stores/authStore';



export class EmployeeConnector {
  /**
   * Query employees with filters
   */
  async getEmployees(query?: string, filters?: any): Promise<Employee[]> {
    if (!(query && query?.trim())) {
      return [];
    }

    let params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
    };

    query && query.split(" ").map((qry, inDq) => {
      if (qry) {
        params[":search" + inDq] = qry.trim();
      }
    });

    let bdyq2 = {
      query: "getEmployees",
      queryString: "!* contain :search0 AND !* contain :search1 AND !* contain :search2 AND !* contain :search3 AND !* contain :search4",
      params
    };

    const response = await fetchGraphQLSS(bdyq2);
    devLog(bdyq2)
    devLog(response)
    return response.data || [];
  }

  /**
   * Get specific employee by ID
   */
  async getEmployeeById(employeeId: string): Promise<Employee | null> {
    let params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      employeeId
    };

    let bdyq2 = {
      query: "getEmployeeById",
      params
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || null;
  }

  /**
   * Get all employees
   */
  async getAllEmployees(): Promise<Employee[]> {
    let params: Record<string, any> = {
      businessId: authStore.getBusinessId()
    };

    let bdyq2 = {
      query: "getAllEmployees",
      params
    };

   
    const response = await fetchGraphQLSS(bdyq2);
   
    return response.data || [];
  }

  /**
   * Add new employee
   */
  async addEmployee(employee: Omit<Employee, 'id'>): Promise<Employee> {
    let params: Record<string, any> = {
      businessId: authStore.getBusinessId()
    };

    let bdyq2 = {
      query: "addEmployee",
      params,
      form: employee
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data;
  }

  /**
   * Add employee with duplicate verification
   */
  async addEmployeeVerify(employee: Omit<Employee, 'id'>): Promise<{ success: boolean; employee?: Employee; message?: string }> {
    let params: Record<string, any> = {
      businessId: authStore.getBusinessId()
    };

    let bdyq2 = {
      query: "addEmployeeVerify",
      params,
      form: employee
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data;
  }

  /**
   * Update employee data
   */
  async updateEmployee(employeeId: string, updates: Partial<Employee>): Promise<Employee> {
    let params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      id: employeeId
    };

    let bdyq2 = {
      query: "updateEmployee",
      params,
      form: updates
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data;
  }

  /**
   * Delete employee
   */
  async deleteEmployee(employeeId: string): Promise<{ success: boolean }> {
    let params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      id: employeeId
    };

    let bdyq2 = {
      query: "deleteEmployee",
      params
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data;
  }

  /**
   * Search employees
   */
  async searchEmployees(searchTerm: string): Promise<Employee[]> {
    let params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      searchTerm
    };

    let bdyq2 = {
      query: "searchEmployees",
      params
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || [];
  }

  /**
   * Get employees by status
   */
  async getEmployeesByStatus(status: string): Promise<Employee[]> {
    let params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      status
    };

    let bdyq2 = {
      query: "getEmployeesByStatus",
      params
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || [];
  }

  /**
   * Get employees by department
   */
  async getEmployeesByDepartment(department: string): Promise<Employee[]> {
    let params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      department
    };

    let bdyq2 = {
      query: "getEmployeesByDepartment",
      params
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || [];
  }

  /**
   * Get employees by position
   */
  async getEmployeesByPosition(position: string): Promise<Employee[]> {
    let params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      position
    };

    let bdyq2 = {
      query: "getEmployeesByPosition",
      params
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || [];
  }

  /**
   * Get employees by date range
   */
  async getEmployeesByDateRange(startDate: string, endDate: string): Promise<Employee[]> {
    let params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      startDate,
      endDate
    };

    let bdyq2 = {
      query: "getEmployeesByDateRange",
      params
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || [];
  }

  /**
   * Get active employees
   */
  async getActiveEmployees(): Promise<Employee[]> {
    let params: Record<string, any> = {
      businessId: authStore.getBusinessId()
    };

    let bdyq2 = {
      query: "getActiveEmployees",
      params
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || [];
  }

  /**
   * Get employee statistics
   */
  async getEmployeesStats(): Promise<any> {
    let params: Record<string, any> = {
      businessId: authStore.getBusinessId()
    };

    let bdyq2 = {
      query: "getEmployeesStats",
      params
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data;
  }
}

export const employeeConnector = new EmployeeConnector();
