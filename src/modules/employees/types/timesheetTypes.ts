// Timesheet and Payroll Types

export type TimeEntryMode = 'clock' | 'hours';

export interface DailyTimeEntry {
  date: string; // ISO date string (YYYY-MM-DD)
  entryMode?: TimeEntryMode; // 'clock' for start/end time, 'hours' for direct hours entry
  startTime?: string; // Time string (HH:MM)
  endTime?: string; // Time string (HH:MM)
  hoursWorked: number;
  overtimeHours?: number;
  notes?: string;
}

export interface WeeklyTimesheet {
  id: string;
  employeeId: string;
  weekStartDate: string; // ISO date string for Monday of the week
  weekEndDate: string; // ISO date string for Sunday of the week
  dailyEntries: {
    monday: DailyTimeEntry;
    tuesday: DailyTimeEntry;
    wednesday: DailyTimeEntry;
    thursday: DailyTimeEntry;
    friday: DailyTimeEntry;
    saturday: DailyTimeEntry;
    sunday: DailyTimeEntry;
  };
  status: 'draft' | 'submitted' | 'approved' | 'paid';
  totalHours: number;
  totalOvertimeHours: number;
  submittedAt?: number;
  approvedAt?: number;
  approvedBy?: string;
}

export interface PayrollCalculation {
  employeeId: string;
  employeeName: string;
  weekStartDate: string;
  weekEndDate: string;
  regularHours: number;
  overtimeHours: number;
  hourlyRate: number;
  regularPay: number;
  overtimePay: number;
  totalPay: number;
  deductions?: {
    taxes?: number;
    insurance?: number;
    other?: number;
  };
  netPay: number;
}

export interface EmployeePayrollSettings {
  employeeId: string;
  payType: 'hourly' | 'salary';
  hourlyRate?: number;
  annualSalary?: number;
  overtimeRate: number; // multiplier (e.g., 1.5 for time-and-a-half)
  standardHoursPerWeek: number; // e.g., 40 hours
  taxRate?: number; // percentage
  insuranceDeduction?: number;
}
