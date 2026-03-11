/**
 * Payroll Strategies Module
 *
 * This module provides a flexible strategy pattern implementation for payroll calculations
 * supporting different jurisdictions and employment types.
 *
 * Available Strategies:
 * - StandardPayrollStrategy: Standard US payroll with overtime after 40 hours/week
 * - CaliforniaPayrollStrategy: California-specific rules with daily and weekly overtime
 *
 * Usage Example:
 * ```typescript
 * import { PayrollStrategyContext, PayrollContext } from './strategies';
 *
 * const context = new PayrollStrategyContext('standard');
 * const result = context.calculate(payrollContext);
 * ```
 */

// Export interfaces and types
export type {
  IPayrollStrategy,
  PayrollContext,
  PayrollResult,
  ValidationResult,
  PayrollStrategyConfig,
} from './IPayrollStrategy';

// Export strategy implementations
export { StandardPayrollStrategy } from './StandardPayrollStrategy';
export { CaliforniaPayrollStrategy } from './CaliforniaPayrollStrategy';

// Export strategy context and helpers
export {
  PayrollStrategyContext,
  createPayrollStrategy,
  calculatePayroll,
} from './StrategyContext';
