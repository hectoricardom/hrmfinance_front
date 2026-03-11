import { WeeklyTimesheet } from '../types/timesheetTypes';

/**
 * Repository interface for Timesheet data operations
 * Provides abstraction over data access layer
 */
export interface ITimesheetRepository {
  /**
   * Retrieve all timesheets
   */
  getAll(): Promise<WeeklyTimesheet[]>;

  /**
   * Retrieve a single timesheet by ID
   * @param id - Timesheet ID
   * @returns Timesheet or null if not found
   */
  getById(id: string): Promise<WeeklyTimesheet | null>;

  /**
   * Create a new timesheet
   * @param timesheet - Timesheet data without ID
   * @returns Created timesheet with generated ID
   */
  create(timesheet: Omit<WeeklyTimesheet, 'id'>): Promise<WeeklyTimesheet>;

  /**
   * Update an existing timesheet
   * @param id - Timesheet ID
   * @param updates - Partial timesheet data to update
   * @returns Updated timesheet
   */
  update(id: string, updates: Partial<WeeklyTimesheet>): Promise<WeeklyTimesheet>;

  /**
   * Delete a timesheet
   * @param id - Timesheet ID
   */
  delete(id: string): Promise<void>;

  /**
   * Search timesheets by query string
   * @param query - Search query
   * @returns Array of matching timesheets
   */
  search(query: string): Promise<WeeklyTimesheet[]>;

  /**
   * Get timesheets by employee ID
   * @param employeeId - Employee ID
   * @returns Array of timesheets for the employee
   */
  getByEmployee(employeeId: string): Promise<WeeklyTimesheet[]>;

  /**
   * Get timesheets by status
   * @param status - Timesheet status
   * @returns Array of timesheets with the specified status
   */
  getByStatus(status: 'draft' | 'submitted' | 'approved' | 'paid'): Promise<WeeklyTimesheet[]>;

  /**
   * Get timesheet for a specific employee and week
   * @param employeeId - Employee ID
   * @param weekStartDate - ISO date string for the week start (Monday)
   * @returns Timesheet or null if not found
   */
  getByEmployeeAndWeek(employeeId: string, weekStartDate: string): Promise<WeeklyTimesheet | null>;

  /**
   * Get pending timesheets (submitted but not approved)
   * @returns Array of pending timesheets
   */
  getPending(): Promise<WeeklyTimesheet[]>;

  /**
   * Get approved timesheets
   * @returns Array of approved timesheets
   */
  getApproved(): Promise<WeeklyTimesheet[]>;

  /**
   * Approve a timesheet
   * @param id - Timesheet ID
   * @param approvedBy - User ID of approver
   * @returns Approved timesheet
   */
  approve(id: string, approvedBy: string): Promise<WeeklyTimesheet>;

  /**
   * Reject a timesheet
   * @param id - Timesheet ID
   * @param rejectedBy - User ID of rejector
   * @param reason - Optional reason for rejection
   * @returns Rejected timesheet
   */
  reject(id: string, rejectedBy: string, reason?: string): Promise<WeeklyTimesheet>;

  /**
   * Get timesheet statistics
   * @returns Statistics about timesheets
   */
  getStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    totalHours: number;
    totalOvertimeHours: number;
  } | null>;

  /**
   * Get employee timesheet summary
   * @param employeeId - Employee ID
   * @param startDate - Optional start date filter
   * @param endDate - Optional end date filter
   * @returns Summary of employee timesheets
   */
  getEmployeeSummary(
    employeeId: string,
    startDate?: string,
    endDate?: string
  ): Promise<{
    totalTimesheets: number;
    totalHours: number;
    totalOvertimeHours: number;
    totalRegularPay: number;
    totalOvertimePay: number;
  } | null>;
}
