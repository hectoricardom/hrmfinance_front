/**
 * Example Usage of Payroll Strategies
 *
 * This file demonstrates how to use the payroll strategies system
 * with various scenarios and edge cases.
 */

import {
  PayrollStrategyContext,
  createPayrollStrategy,
  calculatePayroll,
  PayrollContext,
} from './index';

// Example 1: Standard payroll calculation for hourly employee
export function exampleStandardHourly() {
  const context: PayrollContext = {
    employee: {
      id: 'emp-001',
      name: 'John Doe',
      payType: 'hourly',
      hourlyRate: 25.0,
      standardHoursPerWeek: 40,
      taxRate: 0.12,
      insuranceDeduction: 150,
    },
    timesheet: {
      weekStartDate: '2024-01-01',
      weekEndDate: '2024-01-07',
      totalHours: 45,
      totalOvertimeHours: 5,
      dailyEntries: {
        monday: { hoursWorked: 8, overtimeHours: 0 },
        tuesday: { hoursWorked: 9, overtimeHours: 1 },
        wednesday: { hoursWorked: 8, overtimeHours: 0 },
        thursday: { hoursWorked: 10, overtimeHours: 2 },
        friday: { hoursWorked: 10, overtimeHours: 2 },
        saturday: { hoursWorked: 0, overtimeHours: 0 },
        sunday: { hoursWorked: 0, overtimeHours: 0 },
      },
    },
    payPeriod: {
      start: '2024-01-01',
      end: '2024-01-07',
      type: 'weekly',
    },
  };

  const strategy = new PayrollStrategyContext('standard');
  const result = strategy.calculate(context);

  console.log('Standard Payroll (Hourly):', result);
  console.log('Regular Pay:', result.regularPay);
  console.log('Overtime Pay:', result.overtimePay);
  console.log('Total Pay:', result.totalPay);
  console.log('Net Pay:', result.netPay);

  return result;
}

// Example 2: California payroll with daily overtime
export function exampleCaliforniaDailyOvertime() {
  const context: PayrollContext = {
    employee: {
      id: 'emp-002',
      name: 'Jane Smith',
      payType: 'hourly',
      hourlyRate: 30.0,
      standardHoursPerWeek: 40,
      taxRate: 0.12,
      insuranceDeduction: 175,
    },
    timesheet: {
      weekStartDate: '2024-01-01',
      weekEndDate: '2024-01-07',
      totalHours: 50,
      totalOvertimeHours: 10,
      dailyEntries: {
        monday: { hoursWorked: 10, overtimeHours: 2 }, // 8 regular + 2 OT
        tuesday: { hoursWorked: 10, overtimeHours: 2 }, // 8 regular + 2 OT
        wednesday: { hoursWorked: 10, overtimeHours: 2 }, // 8 regular + 2 OT
        thursday: { hoursWorked: 10, overtimeHours: 2 }, // 8 regular + 2 OT
        friday: { hoursWorked: 10, overtimeHours: 2 }, // 8 regular + 2 OT
        saturday: { hoursWorked: 0, overtimeHours: 0 },
        sunday: { hoursWorked: 0, overtimeHours: 0 },
      },
    },
    payPeriod: {
      start: '2024-01-01',
      end: '2024-01-07',
      type: 'weekly',
    },
  };

  const strategy = new PayrollStrategyContext('california');
  const result = strategy.calculate(context);

  console.log('California Payroll (Daily OT):', result);
  console.log('Regular Hours:', result.regularHours);
  console.log('Overtime Hours:', result.overtimeHours);
  console.log('Total Pay:', result.totalPay);
  console.log('Deductions:', result.deductions);

  return result;
}

// Example 3: California payroll with double-time
export function exampleCaliforniaDoubleTime() {
  const context: PayrollContext = {
    employee: {
      id: 'emp-003',
      name: 'Bob Johnson',
      payType: 'hourly',
      hourlyRate: 35.0,
      standardHoursPerWeek: 40,
      taxRate: 0.15,
      insuranceDeduction: 200,
    },
    timesheet: {
      weekStartDate: '2024-01-01',
      weekEndDate: '2024-01-07',
      totalHours: 60,
      totalOvertimeHours: 20,
      dailyEntries: {
        monday: { hoursWorked: 14, overtimeHours: 6 }, // 8 regular + 4 OT + 2 DT
        tuesday: { hoursWorked: 14, overtimeHours: 6 }, // 8 regular + 4 OT + 2 DT
        wednesday: { hoursWorked: 12, overtimeHours: 4 }, // 8 regular + 4 OT
        thursday: { hoursWorked: 10, overtimeHours: 2 }, // 8 regular + 2 OT
        friday: { hoursWorked: 10, overtimeHours: 2 }, // 8 regular + 2 OT
        saturday: { hoursWorked: 0, overtimeHours: 0 },
        sunday: { hoursWorked: 0, overtimeHours: 0 },
      },
    },
    payPeriod: {
      start: '2024-01-01',
      end: '2024-01-07',
      type: 'weekly',
    },
  };

  const strategy = new PayrollStrategyContext('california');
  const result = strategy.calculate(context);

  console.log('California Payroll (Double Time):', result);
  console.log('Breakdown:', result.breakdown);

  return result;
}

// Example 4: Salary employee
export function exampleSalaryEmployee() {
  const context: PayrollContext = {
    employee: {
      id: 'emp-004',
      name: 'Alice Williams',
      payType: 'salary',
      annualSalary: 75000,
      standardHoursPerWeek: 40,
      taxRate: 0.15,
      insuranceDeduction: 250,
    },
    timesheet: {
      weekStartDate: '2024-01-01',
      weekEndDate: '2024-01-07',
      totalHours: 40,
      totalOvertimeHours: 0,
      dailyEntries: {
        monday: { hoursWorked: 8, overtimeHours: 0 },
        tuesday: { hoursWorked: 8, overtimeHours: 0 },
        wednesday: { hoursWorked: 8, overtimeHours: 0 },
        thursday: { hoursWorked: 8, overtimeHours: 0 },
        friday: { hoursWorked: 8, overtimeHours: 0 },
        saturday: { hoursWorked: 0, overtimeHours: 0 },
        sunday: { hoursWorked: 0, overtimeHours: 0 },
      },
    },
    payPeriod: {
      start: '2024-01-01',
      end: '2024-01-07',
      type: 'weekly',
    },
  };

  const strategy = new PayrollStrategyContext('standard');
  const result = strategy.calculate(context);

  console.log('Salary Employee:', result);
  console.log('Hourly Equivalent:', result.hourlyRate);

  return result;
}

// Example 5: Using helper functions
export function exampleHelperFunctions() {
  const context: PayrollContext = {
    employee: {
      id: 'emp-005',
      name: 'Charlie Brown',
      payType: 'hourly',
      hourlyRate: 20.0,
      standardHoursPerWeek: 40,
    },
    timesheet: {
      weekStartDate: '2024-01-01',
      weekEndDate: '2024-01-07',
      totalHours: 40,
      totalOvertimeHours: 0,
      dailyEntries: {
        monday: { hoursWorked: 8, overtimeHours: 0 },
        tuesday: { hoursWorked: 8, overtimeHours: 0 },
        wednesday: { hoursWorked: 8, overtimeHours: 0 },
        thursday: { hoursWorked: 8, overtimeHours: 0 },
        friday: { hoursWorked: 8, overtimeHours: 0 },
        saturday: { hoursWorked: 0, overtimeHours: 0 },
        sunday: { hoursWorked: 0, overtimeHours: 0 },
      },
    },
    payPeriod: {
      start: '2024-01-01',
      end: '2024-01-07',
      type: 'weekly',
    },
  };

  // Using createPayrollStrategy helper
  const strategy = createPayrollStrategy('standard');
  const result1 = strategy.calculate(context);

  // Using calculatePayroll one-liner
  const result2 = calculatePayroll(context, 'standard');

  console.log('Results match:', JSON.stringify(result1) === JSON.stringify(result2));

  return result1;
}

// Example 6: Switching strategies
export function exampleSwitchingStrategies() {
  const context: PayrollContext = {
    employee: {
      id: 'emp-006',
      name: 'David Martinez',
      payType: 'hourly',
      hourlyRate: 28.0,
      standardHoursPerWeek: 40,
    },
    timesheet: {
      weekStartDate: '2024-01-01',
      weekEndDate: '2024-01-07',
      totalHours: 45,
      totalOvertimeHours: 5,
      dailyEntries: {
        monday: { hoursWorked: 9, overtimeHours: 1 },
        tuesday: { hoursWorked: 9, overtimeHours: 1 },
        wednesday: { hoursWorked: 9, overtimeHours: 1 },
        thursday: { hoursWorked: 9, overtimeHours: 1 },
        friday: { hoursWorked: 9, overtimeHours: 1 },
        saturday: { hoursWorked: 0, overtimeHours: 0 },
        sunday: { hoursWorked: 0, overtimeHours: 0 },
      },
    },
    payPeriod: {
      start: '2024-01-01',
      end: '2024-01-07',
      type: 'weekly',
    },
  };

  const strategy = new PayrollStrategyContext('standard');

  // Calculate with standard strategy
  const standardResult = strategy.calculate(context);
  console.log('Standard Result:', standardResult.netPay);

  // Switch to California strategy
  strategy.setStrategy('california');
  const californiaResult = strategy.calculate(context);
  console.log('California Result:', californiaResult.netPay);

  console.log(
    'Difference:',
    californiaResult.netPay - standardResult.netPay
  );

  return { standardResult, californiaResult };
}

// Example 7: Getting available strategies
export function exampleGetAvailableStrategies() {
  const strategy = new PayrollStrategyContext();
  const strategies = strategy.getAvailableStrategies();

  console.log('Available Strategies:');
  strategies.forEach((s) => {
    console.log(`- ${s.id}: ${s.name}`);
    console.log(`  ${s.description}`);
  });

  return strategies;
}

// Example 8: Validation example
export function exampleValidation() {
  const invalidContext: PayrollContext = {
    employee: {
      id: '',
      name: '',
      payType: 'hourly',
      hourlyRate: -10, // Invalid: negative rate
    },
    timesheet: {
      weekStartDate: '2024-01-01',
      weekEndDate: '2024-01-07',
      totalHours: -5, // Invalid: negative hours
      totalOvertimeHours: 10, // Invalid: more OT than total
      dailyEntries: {},
    },
    payPeriod: {
      start: '',
      end: '',
      type: 'weekly',
    },
  };

  const strategy = new PayrollStrategyContext('standard');
  const validation = strategy.validate(invalidContext);

  console.log('Validation Result:');
  console.log('Is Valid:', validation.isValid);
  console.log('Errors:', validation.errors);
  console.log('Warnings:', validation.warnings);

  return validation;
}

// Run all examples
export function runAllExamples() {
  console.log('\n=== Example 1: Standard Hourly ===');
  exampleStandardHourly();

  console.log('\n=== Example 2: California Daily Overtime ===');
  exampleCaliforniaDailyOvertime();

  console.log('\n=== Example 3: California Double Time ===');
  exampleCaliforniaDoubleTime();

  console.log('\n=== Example 4: Salary Employee ===');
  exampleSalaryEmployee();

  console.log('\n=== Example 5: Helper Functions ===');
  exampleHelperFunctions();

  console.log('\n=== Example 6: Switching Strategies ===');
  exampleSwitchingStrategies();

  console.log('\n=== Example 7: Available Strategies ===');
  exampleGetAvailableStrategies();

  console.log('\n=== Example 8: Validation ===');
  exampleValidation();
}
