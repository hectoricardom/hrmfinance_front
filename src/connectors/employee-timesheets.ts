
import { WeeklyTimesheet } from '../modules/employees/types/timesheetTypes';
import { fetchGraphQLSS } from '../services/utils';
import { authStore } from '../stores/authStore';

export class EmployeeTimesheetsConnector {
  /**
   * Query timesheets with filters
   */

  
  async getEmployeeTimeSheets(query?: string, filters?: any): Promise<WeeklyTimesheet[]> {
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
      query: "getEmployeeTimeSheets",
      queryString: "!* contain :search0 AND !* contain :search1 AND !* contain :search2 AND !* contain :search3 AND !* contain :search4",
      params
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || [];
  }

  /**
   * Get specific timesheet by ID
   */
  async getTimeSheetById(timesheetId: string): Promise<WeeklyTimesheet | null> {
    let params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      timesheetId
    };

    let bdyq2 = {
      query: "getTimeSheetById",
      params
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || null;
  }

  /**
   * Get all timesheets
   */
  async getAllTimeSheets(): Promise<WeeklyTimesheet[]> {
    let params: Record<string, any> = {
      businessId: authStore.getBusinessId()
    };

    let bdyq2 = {
      query: "getAllTimeSheets",
      params
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || [];
  }

  /**
   * Add new timesheet
   */
  async addTimeSheet(timesheet: Omit<WeeklyTimesheet, 'id'>): Promise<WeeklyTimesheet> {
    let params: Record<string, any> = {
      businessId: authStore.getBusinessId()
    };

    let bdyq2 = {
      query: "addTimeSheet",
      params,
      form: timesheet
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response;
  }

  /**
   * Add timesheet with duplicate verification
   */
  async addTimeSheetVerify(timesheet: Omit<WeeklyTimesheet, 'id'>): Promise<{ success: boolean; timesheet?: WeeklyTimesheet; message?: string }> {
    let params: Record<string, any> = {
      businessId: authStore.getBusinessId()
    };

    let bdyq2 = {
      query: "addTimeSheetVerify",
      params,
      form: timesheet
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response;
  }

  /**
   * Update timesheet data
   */
  async updateTimeSheet(timesheetId: string, updates: Partial<WeeklyTimesheet>): Promise<WeeklyTimesheet> {
    let params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      id: timesheetId
    };

    let bdyq2 = {
      query: "updateTimeSheet",
      params,
      form: updates
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data;
  }

  /**
   * Delete timesheet
   */
  async deleteTimeSheet(timesheetId: string): Promise<{ success: boolean }> {
    let params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      id: timesheetId
    };

    let bdyq2 = {
      query: "deleteTimeSheet",
      params
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data;
  }

  /**
   * Search timesheets
   */
  async searchTimeSheets(searchTerm: string): Promise<WeeklyTimesheet[]> {
    let params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      searchTerm
    };

    let bdyq2 = {
      query: "searchTimeSheets",
      params
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || [];
  }

  /**
   * Get timesheets by employee
   */
  async getTimeSheetsByEmployee(employeeId: string): Promise<WeeklyTimesheet[]> {
    let params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      employeeId
    };

    let bdyq2 = {
      query: "getTimeSheetsByEmployee",
      params
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || [];
  }

  /**
   * Get timesheets by date range
   */
  async getTimeSheetsByDateRange(startDate: string, endDate: string): Promise<WeeklyTimesheet[]> {
    let params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      startDate,
      endDate
    };

    let bdyq2 = {
      query: "getTimeSheetsByDateRange",
      params
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || [];
  }

  /**
   * Get timesheets by status
   */
  async getTimeSheetsByStatus(status: 'draft' | 'submitted' | 'approved' | 'paid'): Promise<WeeklyTimesheet[]> {
    let params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      status
    };

    let bdyq2 = {
      query: "getTimeSheetsByStatus",
      params
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || [];
  }

  /**
   * Get pending timesheets
   */
  async getPendingTimeSheets(): Promise<WeeklyTimesheet[]> {
    let params: Record<string, any> = {
      businessId: authStore.getBusinessId()
    };

    let bdyq2 = {
      query: "getPendingTimeSheets",
      params
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || [];
  }

  /**
   * Get approved timesheets
   */
  async getApprovedTimeSheets(): Promise<WeeklyTimesheet[]> {
    let params: Record<string, any> = {
      businessId: authStore.getBusinessId()
    };

    let bdyq2 = {
      query: "getApprovedTimeSheets",
      params
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data || [];
  }

  /**
   * Approve a timesheet
   */
  async approveTimeSheet(timesheetId: string, approvedBy: string): Promise<WeeklyTimesheet> {
    let params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      timesheetId,
      approvedBy
    };

    let bdyq2 = {
      query: "approveTimeSheet",
      params
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data;
  }

  /**
   * Reject a timesheet
   */
  async rejectTimeSheet(timesheetId: string, rejectedBy: string, reason?: string): Promise<WeeklyTimesheet> {
    let params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      timesheetId,
      rejectedBy,
      reason
    };

    let bdyq2 = {
      query: "rejectTimeSheet",
      params
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data;
  }

  /**
   * Get timesheet summary for an employee
   */
  async getEmployeeTimeSheetSummary(employeeId: string, startDate?: string, endDate?: string): Promise<any> {
    let params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      employeeId,
      startDate,
      endDate
    };

    let bdyq2 = {
      query: "getEmployeeTimeSheetSummary",
      params
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data;
  }

  /**
   * Get timesheet statistics
   */
  async getTimeSheetStats(): Promise<any> {
    let params: Record<string, any> = {
      businessId: authStore.getBusinessId()
    };

    let bdyq2 = {
      query: "getTimeSheetStats",
      params
    };

    const response = await fetchGraphQLSS(bdyq2);
    return response.data;
  }
}

export const employeeTimesheetsConnector = new EmployeeTimesheetsConnector();
