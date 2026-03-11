/**
 * Employee Module Bootstrap
 *
 * Initializes and configures the DI container with all employee module services.
 * Call `bootstrapEmployeeModule()` once during application startup.
 */

import { container, ServiceTokens } from '../../core/di/Container';
import { AdapterFactory } from './adapters/AdapterFactory';
import { PayrollStrategyContext } from './strategies/StrategyContext';
import { importService } from './services/ImportService';

// Import adapters for registration
import { FaceTimeAdapter } from './adapters/FaceTimeAdapter';
import { GenericCSVAdapter } from './adapters/GenericCSVAdapter';

// Import strategies for registration
import { StandardPayrollStrategy } from './strategies/StandardPayrollStrategy';
import { CaliforniaPayrollStrategy } from './strategies/CaliforniaPayrollStrategy';

let isBootstrapped = false;

/**
 * Bootstrap the employee module with all required services
 * This should be called once during application initialization
 */
export function bootstrapEmployeeModule(options?: BootstrapOptions): void {
  if (isBootstrapped) {
    console.warn('Employee module already bootstrapped');
    return;
  }

  // Register Clocking Adapter Factory
  container.register(ServiceTokens.ClockingAdapterFactory, () => {
    // Register default adapters (AdapterFactory auto-initializes with defaults)
    // Register custom adapters if provided
    if (options?.customAdapters) {
      Object.entries(options.customAdapters).forEach(([, factory]) => {
        AdapterFactory.register(factory());
      });
    }

    return AdapterFactory;
  });

  // Register Payroll Strategy Context
  container.register(ServiceTokens.PayrollStrategy, () => {
    const context = new PayrollStrategyContext(options?.defaultPayrollStrategy || 'standard');

    // Default strategies are auto-registered in StrategyContext
    // Register custom strategies if provided
    if (options?.customPayrollStrategies) {
      options.customPayrollStrategies.forEach((strategy) => {
        PayrollStrategyContext.registerStrategy(strategy);
      });
    }

    return context;
  });

  // Register Import Service (use singleton instance)
  container.register(ServiceTokens.ImportService, () => {
    return importService;
  });

  isBootstrapped = true;
}

/**
 * Reset the module bootstrap state (useful for testing)
 */
export function resetEmployeeModule(): void {
  container.unregister(ServiceTokens.ClockingAdapterFactory);
  container.unregister(ServiceTokens.PayrollStrategy);
  container.unregister(ServiceTokens.ImportService);
  isBootstrapped = false;
}

/**
 * Check if the module has been bootstrapped
 */
export function isEmployeeModuleBootstrapped(): boolean {
  return isBootstrapped;
}

/**
 * Get the adapter factory from the container
 */
export function getAdapterFactory(): typeof AdapterFactory {
  return container.resolve(ServiceTokens.ClockingAdapterFactory);
}

/**
 * Get the payroll strategy context from the container
 */
export function getPayrollContext(): PayrollStrategyContext {
  return container.resolve(ServiceTokens.PayrollStrategy);
}

/**
 * Get the import service from the container
 */
export function getImportService(): typeof importService {
  return container.resolve(ServiceTokens.ImportService);
}

// Types
import type { IPayrollStrategy } from './strategies/IPayrollStrategy';
import type { IClockingAdapter } from './adapters/IClockingAdapter';

export interface BootstrapOptions {
  /** Default payroll strategy to use (default: 'standard') */
  defaultPayrollStrategy?: 'standard' | 'california' | string;

  /** Custom clocking adapters to register */
  customAdapters?: Record<string, () => IClockingAdapter>;

  /** Custom payroll strategies to register */
  customPayrollStrategies?: IPayrollStrategy[];
}
