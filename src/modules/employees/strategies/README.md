# Payroll Strategies

This module implements a flexible Strategy pattern for payroll calculations, supporting different jurisdictions and employment types with varying overtime rules and tax requirements.

## Overview

The Payroll Strategies system provides:

- **Multiple calculation strategies** for different jurisdictions (Standard US, California)
- **Comprehensive validation** of employee and timesheet data
- **Detailed breakdowns** of pay, overtime, and deductions
- **Extensible architecture** for adding custom strategies
- **Type-safe** TypeScript implementation

## Available Strategies

### 1. Standard US Payroll (`standard`)

Default payroll strategy following standard US labor laws:

- **Overtime:** Hours over 40/week at 1.5x base rate
- **Taxes:**
  - Federal Income Tax: 12% (simplified)
  - State Income Tax: 5% (simplified)
  - Social Security (FICA): 6.2%
  - Medicare (FICA): 1.45%
- **Employee Types:** Both hourly and salary
- **Deductions:** Taxes and insurance

### 2. California Payroll (`california`)

California-specific payroll following CA Labor Code:

- **Daily Overtime:** Hours 8.01-12 in a day at 1.5x
- **Daily Double Time:** Hours 12+ in a day at 2.0x
- **Weekly Overtime:** Hours over 40/week (not already OT) at 1.5x
- **Taxes:**
  - Federal Income Tax: 12% (simplified)
  - CA State Income Tax: 9.3%
  - Social Security (FICA): 6.2%
  - Medicare (FICA): 1.45%
  - CA SDI (State Disability Insurance): 1.1%
- **Employee Types:** Both hourly and salary
- **Deductions:** Taxes and insurance

## Usage

### Basic Usage

```typescript
import { PayrollStrategyContext, PayrollContext } from './strategies';

// Create context with a strategy
const strategy = new PayrollStrategyContext('standard');

// Define payroll context
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
      monday: { hoursWorked: 9, overtimeHours: 1 },
      tuesday: { hoursWorked: 9, overtimeHours: 1 },
      wednesday: { hoursWorked: 9, overtimeHours: 1 },
      thursday: { hoursWorked: 9, overtimeHours: 1 },
      friday: { hoursWorked: 9, overtimeHours: 1 },
      saturday: { hoursWorked: 0 },
      sunday: { hoursWorked: 0 },
    },
  },
  payPeriod: {
    start: '2024-01-01',
    end: '2024-01-07',
    type: 'weekly',
  },
};

// Calculate payroll
const result = strategy.calculate(context);

console.log(`Net Pay: $${result.netPay}`);
```

### Using Helper Functions

```typescript
import { createPayrollStrategy, calculatePayroll } from './strategies';

// Create strategy instance
const strategy = createPayrollStrategy('california');
const result = strategy.calculate(context);

// Or calculate in one line
const result = calculatePayroll(context, 'california');
```

### Switching Strategies

```typescript
const strategy = new PayrollStrategyContext('standard');

// Calculate with standard
const standardResult = strategy.calculate(context);

// Switch to California
strategy.setStrategy('california');
const californiaResult = strategy.calculate(context);
```

### Getting Available Strategies

```typescript
const strategy = new PayrollStrategyContext();
const strategies = strategy.getAvailableStrategies();

strategies.forEach((s) => {
  console.log(`${s.id}: ${s.name}`);
  console.log(`  ${s.description}`);
});
```

### Validation

```typescript
const strategy = new PayrollStrategyContext('standard');
const validation = strategy.validate(context);

if (!validation.isValid) {
  console.error('Validation errors:', validation.errors);
}

if (validation.warnings.length > 0) {
  console.warn('Validation warnings:', validation.warnings);
}
```

## Creating Custom Strategies

You can create custom payroll strategies by implementing the `IPayrollStrategy` interface:

```typescript
import { IPayrollStrategy, PayrollContext, PayrollResult, ValidationResult, PayrollStrategyConfig } from './strategies';

export class CustomPayrollStrategy implements IPayrollStrategy {
  readonly id = 'custom';
  readonly name = 'Custom Payroll';
  readonly description = 'Custom payroll strategy';

  private config: PayrollStrategyConfig = {
    // Your default config
  };

  configure(config: PayrollStrategyConfig): void {
    this.config = { ...this.config, ...config };
  }

  getDefaultConfig(): PayrollStrategyConfig {
    return { ...this.config };
  }

  validate(context: PayrollContext): ValidationResult {
    // Implement validation logic
    return { isValid: true, errors: [], warnings: [] };
  }

  calculate(context: PayrollContext): PayrollResult {
    // Implement calculation logic
    return {
      // ... payroll result
    };
  }
}

// Register the strategy
import { PayrollStrategyContext } from './strategies';
PayrollStrategyContext.registerStrategy(new CustomPayrollStrategy());

// Use it
const strategy = new PayrollStrategyContext('custom');
```

## Data Structures

### PayrollContext

Input data for payroll calculations:

```typescript
interface PayrollContext {
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
```

### PayrollResult

Output from payroll calculations:

```typescript
interface PayrollResult {
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
```

## Edge Cases Handled

The strategies handle various edge cases:

1. **Negative hours:** Validation error
2. **Missing rates:** Validation error for required fields
3. **Zero rates:** Warning issued
4. **Overtime exceeding total:** Validation error
5. **Missing employee data:** Validation error
6. **Salary employees:** Converted to hourly equivalent
7. **Daily vs weekly overtime:** California strategy prioritizes daily overtime
8. **Tax wage base limits:** Social Security capped at annual limit

## Examples

See [example-usage.ts](./example-usage.ts) for comprehensive examples including:

- Standard hourly payroll
- California daily overtime
- California double-time
- Salary employees
- Strategy switching
- Validation examples

## Testing

To test the strategies:

```bash
# Run TypeScript compiler
npx tsc --noEmit

# Test with example usage (if you have ts-node)
npx ts-node src/modules/employees/strategies/example-usage.ts
```

## Architecture

The module uses the **Strategy Pattern**:

- `IPayrollStrategy`: Interface defining the contract
- `StandardPayrollStrategy`: Concrete implementation for standard US
- `CaliforniaPayrollStrategy`: Concrete implementation for California
- `PayrollStrategyContext`: Context class managing strategy selection
- `StrategyRegistry`: Internal registry for available strategies

## Future Enhancements

Potential additions:

- More state-specific strategies (NY, TX, etc.)
- Exempt employee handling
- Commission calculations
- Bonus and incentive pay
- Benefits calculations
- Multi-state employee support
- Historical payroll data
- Garnishments and child support
- 401k and retirement deductions
- Additional FICA thresholds (Additional Medicare Tax)

## License

Part of the HRM Finance application.
