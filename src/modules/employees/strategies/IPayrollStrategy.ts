export interface PayrollContext {
  employee: {
    id: string;
    name: string;
    payType?: 'hourly' | 'salary';
    hourlyRate?: number;
    annualSalary?: number;
    overtimeRate?: number;
    standardHoursPerWeek?: number;
    taxRate?: number;
    insuranceDeduction?: number;
  };
  timesheet: {
    weekStartDate: string;
    weekEndDate: string;
    totalHours: number;
    totalOvertimeHours: number;
    dailyEntries: Record<string, { hoursWorked: number; overtimeHours?: number }>;
  };
  payPeriod: {
    start: string;
    end: string;
    type: 'weekly' | 'biweekly' | 'monthly';
  };
}

export interface PayrollResult {
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
  deductions: {
    taxes: number;
    insurance: number;
    other?: number;
  };
  netPay: number;
  breakdown: {
    regularPay: { hours: number; rate: number; amount: number };
    overtimePay: { hours: number; rate: number; multiplier: number; amount: number };
    deductions: Array<{ type: string; description: string; amount: number; percentage?: number }>;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface PayrollStrategyConfig {
  standardHoursPerWeek?: number;
  overtimeThreshold?: number;
  overtimeMultiplier?: number;
  doubleTimeThreshold?: number;
  doubleTimeMultiplier?: number;
  taxRates?: Record<string, number>;
}

export interface IPayrollStrategy {
  readonly id: string;
  readonly name: string;
  readonly description: string;

  calculate(context: PayrollContext): PayrollResult;
  validate(context: PayrollContext): ValidationResult;
  getDefaultConfig(): PayrollStrategyConfig;
  configure(config: PayrollStrategyConfig): void;
}
