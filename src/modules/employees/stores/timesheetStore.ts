import { createSignal } from 'solid-js';
import { WeeklyTimesheet, DailyTimeEntry, EmployeePayrollSettings, PayrollCalculation } from '../types/timesheetTypes';
import { Employee } from './employeeStore';
import { employeeTimesheetsConnector } from '../../../connectors/employee-timesheets';

// Helper function to get week start (Monday) and end (Sunday) dates
export function getWeekDates(date: Date): { start: string; end: string } {
  const current = new Date(date);

  const day = current.getDay();
  const diff = day === 0 ? -6 : 1 - day; // adjust when day is Sunday


  const monday = new Date(current);
  monday.setDate(current.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

 

  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0]
  };
}

// Helper to calculate hours worked from start and end times
export function calculateHoursFromTimes(startTime?: string, endTime?: string): number {
  if (!startTime || !endTime) return 0;

  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  let diffMinutes = endMinutes - startMinutes;

  // Handle cases where end time is next day (e.g., night shift)
  if (diffMinutes < 0) {
    diffMinutes += 24 * 60;
  }

  return Number((diffMinutes / 60).toFixed(2));
}

// Helper to create empty daily entry
function createEmptyDailyEntry(date: string): DailyTimeEntry {
  return {
    date,
    entryMode: 'clock', // Default to clock in/out mode
    startTime: '',
    endTime: '',
    hoursWorked: 0,
    overtimeHours: 0,
    notes: ''
  };
}

// Helper to create empty weekly timesheet
export function createEmptyTimesheet(employeeId: string, weekStartDate: string): WeeklyTimesheet {
  const start = new Date(weekStartDate);

   const sunday = new Date(start);
  sunday.setDate(start.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  let end = sunday.toISOString().split('T')[0]
  return {
    id: `timesheet-${employeeId}-${weekStartDate}-${end}`,
    employeeId,
    weekStartDate,
    weekEndDate: end ,
    dailyEntries: {
      monday: createEmptyDailyEntry(weekStartDate),
      tuesday: createEmptyDailyEntry(new Date(start.getTime() + 86400000 * 1).toISOString().split('T')[0]),
      wednesday: createEmptyDailyEntry(new Date(start.getTime() + 86400000 * 2).toISOString().split('T')[0]),
      thursday: createEmptyDailyEntry(new Date(start.getTime() + 86400000 * 3).toISOString().split('T')[0]),
      friday: createEmptyDailyEntry(new Date(start.getTime() + 86400000 * 4).toISOString().split('T')[0]),
      saturday: createEmptyDailyEntry(new Date(start.getTime() + 86400000 * 5).toISOString().split('T')[0]),
      sunday: createEmptyDailyEntry(new Date(start.getTime() + 86400000 * 6).toISOString().split('T')[0])
    },
    status: 'draft',
    totalHours: 0,
    totalOvertimeHours: 0
  };
}

// Default payroll settings
const defaultPayrollSettings: Record<string, EmployeePayrollSettings> = {};

const [timesheets, setTimesheets] = createSignal<WeeklyTimesheet[]>([]);
const [payrollSettings, setPayrollSettings] = createSignal<Record<string, EmployeePayrollSettings>>(defaultPayrollSettings);
const [isLoading, setIsLoading] = createSignal(false);

export const timesheetStore = {
  // Get all timesheets
  get timesheets() {
    return timesheets();
  },

  // Get payroll settings
  get payrollSettings() {
    return payrollSettings();
  },

  // Get loading state
  get isLoading() {
    return isLoading();
  },

  /**
   * Load all timesheets from the server
   */
  async loadTimesheets() {
    try {
      setIsLoading(true);
      const data = await employeeTimesheetsConnector.getAllTimeSheets();
      setTimesheets(data);
      return data;
    } catch (error) {
      console.error('Failed to load timesheets:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  },

  /**
   * Search timesheets
   */
  async searchTimesheets(query: string) {
    try {
      setIsLoading(true);
      const data = await employeeTimesheetsConnector.getEmployeeTimeSheets(query);
      setTimesheets(data);
      return data;
    } catch (error) {
      console.error('Failed to search timesheets:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  },

  /**
   * Get timesheets by employee from server
   */
  async loadTimesheetsByEmployee(employeeId: string) {
    try {
      setIsLoading(true);
      const data = await employeeTimesheetsConnector.getTimeSheetsByEmployee(employeeId);
      // Update local timesheets for this employee
      setTimesheets(prev => {
        const filtered = prev.filter(ts => ts?.employeeId !== employeeId);
        return [...filtered, ...data];
      });
      setIsLoading(false);
      return data;
    } catch (error) {
      console.error('Failed to load timesheets by employee:', error);
      return [];
    }
  },

  /**
   * Get timesheets by status
   */
  async getTimesheetsByStatus(status: 'draft' | 'submitted' | 'approved' | 'paid') {
    try {
      const data = await employeeTimesheetsConnector.getTimeSheetsByStatus(status);
      return data;
    } catch (error) {
      console.error('Failed to get timesheets by status:', error);
      return [];
    }
  },

  /**
   * Get pending timesheets
   */
  async getPendingTimesheets() {
    try {
      const data = await employeeTimesheetsConnector.getPendingTimeSheets();
      return data;
    } catch (error) {
      console.error('Failed to get pending timesheets:', error);
      return [];
    }
  },

  /**
   * Get approved timesheets
   */
  async getApprovedTimesheets() {
    try {
      const data = await employeeTimesheetsConnector.getApprovedTimeSheets();
      return data;
    } catch (error) {
      console.error('Failed to get approved timesheets:', error);
      return [];
    }
  },

  /**
   * Get timesheet stats
   */
  async getTimesheetStats() {
    try {
      const data = await employeeTimesheetsConnector.getTimeSheetStats();
      return data;
    } catch (error) {
      console.error('Failed to get timesheet stats:', error);
      return null;
    }
  },

  /**
   * Get employee timesheet summary
   */
  async getEmployeeTimesheetSummary(employeeId: string, startDate?: string, endDate?: string) {
    try {
      const data = await employeeTimesheetsConnector.getEmployeeTimeSheetSummary(employeeId, startDate, endDate);
      return data;
    } catch (error) {
      console.error('Failed to get employee timesheet summary:', error);
      return null;
    }
  },

  // Get timesheet by ID
  getTimesheetById(id: string): WeeklyTimesheet | undefined {
    return timesheets().find(ts => ts?.id === id);
  },

  // Get timesheets for a specific employee
  getTimesheetsByEmployee(employeeId: string): WeeklyTimesheet[] {
    return timesheets().filter(ts => ts?.employeeId === employeeId);
  },

  // Get timesheet for specific employee and week
  getTimesheetByWeek(employeeId: string, weekStartDate: string): WeeklyTimesheet | undefined {
    return timesheets().find(ts =>
      ts?.employeeId === employeeId && ts?.weekStartDate === weekStartDate
    );
  },

  // Create or get existing timesheet
  async getOrCreateTimesheet(employeeId: string, weekStartDate: string): Promise<WeeklyTimesheet> {
    const existing = this.getTimesheetByWeek(employeeId, weekStartDate);
  
    if (existing) return existing;

    const newTimesheet = createEmptyTimesheet(employeeId, weekStartDate);

   
    try {
      setIsLoading(true);
      const created =  await employeeTimesheetsConnector.addTimeSheet(newTimesheet);
     
      //setTimesheets([...timesheets(), newTimesheet]);
      setTimesheets([...timesheets(), created]);
     return created;
    } catch (error) {
      console.error('Failed to create timesheet:', error);
      // Fall back to local creation if API fails
      setTimesheets([...timesheets(), newTimesheet]);
      return newTimesheet;
    } finally {
      setIsLoading(false);
    }
  },

  // Update timesheet
  async updateTimesheet(id: string, updates: Partial<WeeklyTimesheet>) {
    try {
      setIsLoading(true);

      // Find the current timesheet to merge with updates
      const current = timesheets().find(ts => ts.id === id);
      if (!current) {
        throw new Error('Timesheet not found');
      }

      const merged = { ...current, ...updates };

      // Recalculate totals
      const entries = Object.values(merged.dailyEntries);
      merged.totalHours = entries.reduce((sum, entry) => sum + entry.hoursWorked, 0);
      merged.totalOvertimeHours = entries.reduce((sum, entry) => sum + (entry.overtimeHours || 0), 0);

      const updated = await employeeTimesheetsConnector.updateTimeSheet(id, merged);

      setTimesheets(timesheets().map(ts => ts.id === id ? updated : ts));
      return updated;
    } catch (error) {
      console.error('Failed to update timesheet:', error);
      // Fall back to local update if API fails
      setTimesheets(timesheets().map(ts => {
        if (ts.id !== id) return ts;
        const updated = { ...ts, ...updates };
        const entries = Object.values(updated.dailyEntries);
        updated.totalHours = entries.reduce((sum, entry) => sum + entry.hoursWorked, 0);
        updated.totalOvertimeHours = entries.reduce((sum, entry) => sum + (entry.overtimeHours || 0), 0);
        return updated;
      }));
      throw error;
    } finally {
      setIsLoading(false);
    }
  },

  
  // Update a specific day in a timesheet
  updateDailyEntry(timesheetId: string, day: keyof WeeklyTimesheet['dailyEntries'], entry: Partial<DailyTimeEntry>) {
    setTimesheets(timesheets().map(ts => {
      if (ts.id !== timesheetId) return ts;


     
      const currentEntry = ts.dailyEntries[day];
      const updatedEntry = { ...currentEntry, ...entry };

      // Auto-calculate hours if in clock mode and start/end times are provided
      if (updatedEntry.entryMode === 'clock' && updatedEntry.startTime && updatedEntry.endTime) {
        const calculatedHours = calculateHoursFromTimes(updatedEntry.startTime, updatedEntry.endTime);
        updatedEntry.hoursWorked = calculatedHours;
      }

      const updated = {
        ...ts,
        dailyEntries: {
          ...ts.dailyEntries,
          [day]: updatedEntry
        }
      };

       


      // Recalculate totals
      const entries = Object.values(updated.dailyEntries);
      updated.totalHours = entries.reduce((sum, entry) => sum + entry.hoursWorked, 0);
      updated.totalOvertimeHours = entries.reduce((sum, entry) => sum + (entry.overtimeHours || 0), 0);

      
      updated.totalHours = entries.reduce((sum, entry) => sum + entry.hoursWorked, 0);
      updated.totalOvertimeHours
      let  toupdate  = {
          totalHours : updated.totalHours, 
          totalOvertimeHours: updated.totalOvertimeHours,
          dailyEntries : updated.dailyEntries, 
      }

      
      setTimeout(() => {
        employeeTimesheetsConnector.updateTimeSheet(timesheetId, toupdate);
      }, 400);
    
      return updated;
    }));
  },

  // Submit timesheet
  async submitTimesheet(id: string) {
    await this.updateTimesheet(id, {
      status: 'submitted',
      submittedAt: Date.now()
    });
  },

  // Approve timesheet
  async approveTimesheet(id: string, approvedBy: string) {
    try {
      setIsLoading(true);
      const approved = await employeeTimesheetsConnector.approveTimeSheet(id, approvedBy);
      setTimesheets(timesheets().map(ts => ts.id === id ? approved : ts));
      return approved;
    } catch (error) {
      console.error('Failed to approve timesheet:', error);
      // Fall back to local update
      await this.updateTimesheet(id, {
        status: 'approved',
        approvedAt: Date.now(),
        approvedBy
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  },

  // Reject timesheet
  async rejectTimesheet(id: string, rejectedBy: string, reason?: string) {
    try {
      setIsLoading(true);
      const rejected = await employeeTimesheetsConnector.rejectTimeSheet(id, rejectedBy, reason);
      setTimesheets(timesheets().map(ts => ts.id === id ? rejected : ts));
      return rejected;
    } catch (error) {
      console.error('Failed to reject timesheet:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  },

  // Delete timesheet
  async deleteTimesheet(id: string) {
    try {
      setIsLoading(true);
      await employeeTimesheetsConnector.deleteTimeSheet(id);
      setTimesheets(timesheets().filter(ts => ts.id !== id));
    } catch (error) {
      console.error('Failed to delete timesheet:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  },

  // Payroll Settings
  getPayrollSettings(employeeId: string): EmployeePayrollSettings | undefined {
    return payrollSettings()[employeeId];
  },

  setPayrollSettings(employeeId: string, settings: EmployeePayrollSettings) {
    setPayrollSettings({
      ...payrollSettings(),
      [employeeId]: settings
    });
  },

  // Calculate payroll for a timesheet
  calculatePayroll(timesheet: WeeklyTimesheet, employee: Employee): PayrollCalculation {
    //    const settings = this.getPayrollSettings(timesheet.employeeId);

    let employeeName = employee.name


   
    let hourlyRate =  employee.hourlyRate || 0;

    // If salary, convert to hourly rate
    if (employee.payType === 'salary' && employee.annualSalary) {
      hourlyRate = employee.annualSalary / 52 / (employee.standardHoursPerWeek || 0);
    }

    // Calculate regular and overtime hours
    const standardHours = employee.standardHoursPerWeek || 0;
    const totalHours = timesheet.totalHours;

    let regularHours = Math.min(totalHours, standardHours);
    let overtimeHours = Math.max(0, totalHours - standardHours) + timesheet.totalOvertimeHours;

    // Calculate pay
    const regularPay = regularHours * hourlyRate;
    const overtimePay = overtimeHours * hourlyRate * (employee.overtimeRate || 0);
    const totalPay = regularPay + overtimePay;

    // Calculate deductions
    const taxDeduction = employee.taxRate ? (totalPay * employee.taxRate / 100) : 0;
    const insuranceDeduction = employee.insuranceDeduction || 0;
    const totalDeductions = taxDeduction + insuranceDeduction;

    const netPay = totalPay - totalDeductions;



    return {
      employeeId: timesheet.employeeId,
      employeeName,
      weekStartDate: timesheet.weekStartDate,
      weekEndDate: timesheet.weekEndDate,
      regularHours,
      overtimeHours,
      hourlyRate,
      regularPay,
      overtimePay,
      totalPay,
      deductions: {
        taxes: taxDeduction,
        insurance: insuranceDeduction
      },
      netPay
    };
  }
};
