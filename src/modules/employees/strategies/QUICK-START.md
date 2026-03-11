# Payroll Strategies - Quick Start Guide

## Installation

The payroll strategies are already included in the HRM Finance application at:
```
/Users/hectorssg/Documents/claudeAI/hrmfinance/src/modules/employees/strategies/
```

## Quick Examples

### Example 1: Calculate Standard Payroll (Most Common)

```typescript
import { PayrollStrategyContext, PayrollContext } from '@/modules/employees/strategies';

// Setup employee and timesheet data
const payrollData: PayrollContext = {
  employee: {
    id: 'emp-123',
    name: 'John Doe',
    payType: 'hourly',
    hourlyRate: 25.00,
    standardHoursPerWeek: 40,
    taxRate: 0.12,
    insuranceDeduction: 150
  },
  timesheet: {
    weekStartDate: '2024-01-01',
    weekEndDate: '2024-01-07',
    totalHours: 45,
    totalOvertimeHours: 5,
    dailyEntries: {
      monday: { hoursWorked: 9 },
      tuesday: { hoursWorked: 9 },
      wednesday: { hoursWorked: 9 },
      thursday: { hoursWorked: 9 },
      friday: { hoursWorked: 9 },
      saturday: { hoursWorked: 0 },
      sunday: { hoursWorked: 0 }
    }
  },
  payPeriod: {
    start: '2024-01-01',
    end: '2024-01-07',
    type: 'weekly'
  }
};

// Calculate payroll
const strategy = new PayrollStrategyContext('standard');
const result = strategy.calculate(payrollData);

// Display results
console.log('Gross Pay:', result.totalPay);
console.log('Net Pay:', result.netPay);
console.log('Deductions:', result.deductions);
```

### Example 2: One-Line Calculation

```typescript
import { calculatePayroll } from '@/modules/employees/strategies';

const result = calculatePayroll(payrollData, 'standard');
console.log('Net Pay: $' + result.netPay.toFixed(2));
```

### Example 3: California Payroll with Daily Overtime

```typescript
import { PayrollStrategyContext } from '@/modules/employees/strategies';

const strategy = new PayrollStrategyContext('california');
const result = strategy.calculate(payrollData);

// California automatically calculates:
// - Daily OT for hours 8-12 at 1.5x
// - Daily DT for hours 12+ at 2.0x
// - Weekly OT for hours over 40 at 1.5x
// - CA SDI tax at 1.1%
```

### Example 4: Validate Before Calculating

```typescript
const strategy = new PayrollStrategyContext('standard');

// Validate first
const validation = strategy.validate(payrollData);

if (validation.isValid) {
  const result = strategy.calculate(payrollData);
  console.log('Payroll calculated successfully');
} else {
  console.error('Validation failed:', validation.errors);
}

// Check warnings
if (validation.warnings.length > 0) {
  console.warn('Warnings:', validation.warnings);
}
```

### Example 5: Get Detailed Breakdown

```typescript
const result = strategy.calculate(payrollData);

// Access detailed breakdown
console.log('Regular Hours:', result.breakdown.regularPay.hours);
console.log('Regular Rate:', result.breakdown.regularPay.rate);
console.log('Regular Amount:', result.breakdown.regularPay.amount);

console.log('Overtime Hours:', result.breakdown.overtimePay.hours);
console.log('Overtime Multiplier:', result.breakdown.overtimePay.multiplier);
console.log('Overtime Amount:', result.breakdown.overtimePay.amount);

// Deductions breakdown
result.breakdown.deductions.forEach(deduction => {
  console.log(`${deduction.description}: $${deduction.amount}`);
  if (deduction.percentage) {
    console.log(`  (${deduction.percentage}%)`);
  }
});
```

## Common Scenarios

### Scenario 1: Hourly Employee with Overtime

```typescript
const context = {
  employee: {
    id: 'emp-001',
    name: 'Worker One',
    payType: 'hourly' as const,
    hourlyRate: 20.00,
    standardHoursPerWeek: 40
  },
  timesheet: {
    weekStartDate: '2024-01-01',
    weekEndDate: '2024-01-07',
    totalHours: 48,
    totalOvertimeHours: 8,
    dailyEntries: {
      monday: { hoursWorked: 10 },
      tuesday: { hoursWorked: 10 },
      wednesday: { hoursWorked: 10 },
      thursday: { hoursWorked: 10 },
      friday: { hoursWorked: 8 },
      saturday: { hoursWorked: 0 },
      sunday: { hoursWorked: 0 }
    }
  },
  payPeriod: {
    start: '2024-01-01',
    end: '2024-01-07',
    type: 'weekly' as const
  }
};

const result = calculatePayroll(context, 'standard');
// Result: 40 hours @ $20 + 8 hours @ $30 = $800 + $240 = $1,040 gross
```

### Scenario 2: Salaried Employee

```typescript
const context = {
  employee: {
    id: 'emp-002',
    name: 'Manager One',
    payType: 'salary' as const,
    annualSalary: 75000,
    standardHoursPerWeek: 40
  },
  timesheet: {
    weekStartDate: '2024-01-01',
    weekEndDate: '2024-01-07',
    totalHours: 40,
    totalOvertimeHours: 0,
    dailyEntries: {
      monday: { hoursWorked: 8 },
      tuesday: { hoursWorked: 8 },
      wednesday: { hoursWorked: 8 },
      thursday: { hoursWorked: 8 },
      friday: { hoursWorked: 8 },
      saturday: { hoursWorked: 0 },
      sunday: { hoursWorked: 0 }
    }
  },
  payPeriod: {
    start: '2024-01-01',
    end: '2024-01-07',
    type: 'weekly' as const
  }
};

const result = calculatePayroll(context, 'standard');
// Result: $75,000 / 52 weeks = $1,442.31 per week
```

### Scenario 3: California Employee with Long Days

```typescript
const context = {
  employee: {
    id: 'emp-003',
    name: 'CA Worker',
    payType: 'hourly' as const,
    hourlyRate: 30.00,
    standardHoursPerWeek: 40
  },
  timesheet: {
    weekStartDate: '2024-01-01',
    weekEndDate: '2024-01-07',
    totalHours: 50,
    totalOvertimeHours: 10,
    dailyEntries: {
      monday: { hoursWorked: 10 },    // 8 regular + 2 OT
      tuesday: { hoursWorked: 10 },   // 8 regular + 2 OT
      wednesday: { hoursWorked: 10 }, // 8 regular + 2 OT
      thursday: { hoursWorked: 10 },  // 8 regular + 2 OT
      friday: { hoursWorked: 10 },    // 8 regular + 2 OT
      saturday: { hoursWorked: 0 },
      sunday: { hoursWorked: 0 }
    }
  },
  payPeriod: {
    start: '2024-01-01',
    end: '2024-01-07',
    type: 'weekly' as const
  }
};

const result = calculatePayroll(context, 'california');
// Result: 40 hours @ $30 + 10 hours @ $45 = $1,200 + $450 = $1,650 gross
// Plus CA-specific taxes (higher state tax + SDI)
```

## Available Strategies

| Strategy ID | Name | Description |
|------------|------|-------------|
| `standard` | Standard US Payroll | Weekly OT after 40 hours @ 1.5x |
| `california` | California Payroll | Daily OT (8+ hrs @ 1.5x, 12+ hrs @ 2.0x) + weekly OT |

## Key Functions

```typescript
// Create strategy context
new PayrollStrategyContext(strategyType?: string)

// Set strategy
context.setStrategy(strategyType: string)

// Calculate payroll
context.calculate(payrollData: PayrollContext): PayrollResult

// Validate data
context.validate(payrollData: PayrollContext): ValidationResult

// Get available strategies
context.getAvailableStrategies()

// Helper: One-line calculation
calculatePayroll(payrollData: PayrollContext, strategyType: string): PayrollResult
```

## Error Handling

```typescript
try {
  const result = strategy.calculate(payrollData);
  console.log('Success:', result.netPay);
} catch (error) {
  console.error('Payroll calculation failed:', error.message);
  // Handle validation errors
}
```

## Tips

1. **Always validate first** in production to catch errors early
2. **Use the correct strategy** for your jurisdiction (standard vs california)
3. **Include all required fields** in the PayrollContext
4. **Check the breakdown** for detailed information
5. **Handle edge cases** like zero hours, missing rates, etc.

## Need More Help?

- See [README.md](./README.md) for complete documentation
- See [example-usage.ts](./example-usage.ts) for more examples
- Check [IPayrollStrategy.ts](./IPayrollStrategy.ts) for type definitions
