import {
  IPayrollStrategy,
  PayrollContext,
  PayrollResult,
} from './IPayrollStrategy';
import { StandardPayrollStrategy } from './StandardPayrollStrategy';
import { CaliforniaPayrollStrategy } from './CaliforniaPayrollStrategy';

/**
 * Registry for storing available payroll strategies
 */
class StrategyRegistry {
  private strategies: Map<string, IPayrollStrategy> = new Map();

  register(strategy: IPayrollStrategy): void {
    this.strategies.set(strategy.id, strategy);
  }

  get(strategyId: string): IPayrollStrategy | undefined {
    return this.strategies.get(strategyId);
  }

  getAll(): IPayrollStrategy[] {
    return Array.from(this.strategies.values());
  }

  has(strategyId: string): boolean {
    return this.strategies.has(strategyId);
  }
}

// Global strategy registry
const registry = new StrategyRegistry();

// Register built-in strategies
registry.register(new StandardPayrollStrategy());
registry.register(new CaliforniaPayrollStrategy());

/**
 * PayrollStrategyContext - Context for managing and executing payroll strategies
 *
 * This class implements the Strategy pattern, allowing different payroll
 * calculation strategies to be selected and executed at runtime.
 *
 * Usage:
 * ```typescript
 * // Create context with default strategy
 * const context = new PayrollStrategyContext();
 *
 * // Or specify a strategy
 * const context = new PayrollStrategyContext('california');
 *
 * // Calculate payroll
 * const result = context.calculate(payrollContext);
 *
 * // Change strategy
 * context.setStrategy('standard');
 *
 * // Get available strategies
 * const strategies = context.getAvailableStrategies();
 * ```
 */
export class PayrollStrategyContext {
  private strategy: IPayrollStrategy;

  /**
   * Create a new PayrollStrategyContext
   * @param strategyType - The strategy type to use (default: 'standard')
   */
  constructor(strategyType: string = 'standard') {
    const strategy = registry.get(strategyType);
    if (!strategy) {
      throw new Error(
        `Strategy '${strategyType}' not found. Available strategies: ${this.getAvailableStrategies()
          .map((s) => s.id)
          .join(', ')}`
      );
    }
    this.strategy = strategy;
  }

  /**
   * Set the payroll strategy by type
   * @param strategyType - The strategy type identifier (e.g., 'standard', 'california')
   * @throws Error if strategy type is not found
   */
  setStrategy(strategyType: string): void {
    const strategy = registry.get(strategyType);
    if (!strategy) {
      throw new Error(
        `Strategy '${strategyType}' not found. Available strategies: ${this.getAvailableStrategies()
          .map((s) => s.id)
          .join(', ')}`
      );
    }
    this.strategy = strategy;
  }

  /**
   * Set a custom payroll strategy instance
   * @param strategy - The strategy instance to use
   */
  setCustomStrategy(strategy: IPayrollStrategy): void {
    this.strategy = strategy;
  }

  /**
   * Get the current strategy
   * @returns The current payroll strategy
   */
  getCurrentStrategy(): IPayrollStrategy {
    return this.strategy;
  }

  /**
   * Calculate payroll using the current strategy
   * @param context - The payroll context containing employee, timesheet, and pay period data
   * @returns PayrollResult with calculated pay, deductions, and breakdown
   * @throws Error if validation fails
   */
  calculate(context: PayrollContext): PayrollResult {
    return this.strategy.calculate(context);
  }

  /**
   * Validate payroll context using the current strategy
   * @param context - The payroll context to validate
   * @returns ValidationResult with any errors or warnings
   */
  validate(context: PayrollContext) {
    return this.strategy.validate(context);
  }

  /**
   * Get list of all available strategies
   * @returns Array of strategy metadata (id, name, description)
   */
  getAvailableStrategies(): Array<{ id: string; name: string; description: string }> {
    return registry.getAll().map((strategy) => ({
      id: strategy.id,
      name: strategy.name,
      description: strategy.description,
    }));
  }

  /**
   * Register a new strategy globally
   * @param strategy - The strategy to register
   */
  static registerStrategy(strategy: IPayrollStrategy): void {
    registry.register(strategy);
  }

  /**
   * Check if a strategy is registered
   * @param strategyId - The strategy ID to check
   * @returns true if strategy is registered
   */
  static hasStrategy(strategyId: string): boolean {
    return registry.has(strategyId);
  }

  /**
   * Get a strategy by ID
   * @param strategyId - The strategy ID
   * @returns The strategy instance or undefined if not found
   */
  static getStrategy(strategyId: string): IPayrollStrategy | undefined {
    return registry.get(strategyId);
  }

  /**
   * Get all registered strategies
   * @returns Array of all registered strategy instances
   */
  static getAllStrategies(): IPayrollStrategy[] {
    return registry.getAll();
  }
}

/**
 * Helper function to create a PayrollStrategyContext with a specific strategy
 * @param strategyType - The strategy type to use
 * @returns A new PayrollStrategyContext instance
 */
export function createPayrollStrategy(strategyType: string = 'standard'): PayrollStrategyContext {
  return new PayrollStrategyContext(strategyType);
}

/**
 * Helper function to calculate payroll with a specific strategy in one call
 * @param context - The payroll context
 * @param strategyType - The strategy type to use (default: 'standard')
 * @returns PayrollResult
 */
export function calculatePayroll(
  context: PayrollContext,
  strategyType: string = 'standard'
): PayrollResult {
  const strategy = new PayrollStrategyContext(strategyType);
  return strategy.calculate(context);
}
