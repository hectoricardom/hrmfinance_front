/**
 * Lightweight Dependency Injection Container
 * Compatible with Solid.js reactive system
 */

export type ServiceIdentifier<T> = symbol | string;

interface ServiceDescriptor<T> {
  identifier: ServiceIdentifier<T>;
  factory: () => T;
  singleton: boolean;
  instance?: T;
}

class DIContainer {
  private services = new Map<ServiceIdentifier<any>, ServiceDescriptor<any>>();

  /**
   * Register a service with the container
   */
  register<T>(
    identifier: ServiceIdentifier<T>,
    factory: () => T,
    options: { singleton?: boolean } = {}
  ): void {
    this.services.set(identifier, {
      identifier,
      factory,
      singleton: options.singleton ?? true,
      instance: undefined,
    });
  }

  /**
   * Resolve a service from the container
   */
  resolve<T>(identifier: ServiceIdentifier<T>): T {
    const descriptor = this.services.get(identifier);
    if (!descriptor) {
      throw new Error(`Service ${String(identifier)} not registered`);
    }

    if (descriptor.singleton) {
      if (!descriptor.instance) {
        descriptor.instance = descriptor.factory();
      }
      return descriptor.instance;
    }

    return descriptor.factory();
  }

  /**
   * Check if a service is registered
   */
  has(identifier: ServiceIdentifier<any>): boolean {
    return this.services.has(identifier);
  }

  /**
   * Unregister a service
   */
  unregister(identifier: ServiceIdentifier<any>): void {
    this.services.delete(identifier);
  }

  /**
   * Reset all singleton instances (useful for testing)
   */
  resetSingletons(): void {
    this.services.forEach((descriptor) => {
      descriptor.instance = undefined;
    });
  }

  /**
   * Clear all registrations
   */
  clear(): void {
    this.services.clear();
  }
}

// Singleton container instance
export const container = new DIContainer();

// Service tokens for type-safe resolution
export const ServiceTokens = {
  // Repositories
  EmployeeRepository: Symbol('EmployeeRepository'),
  TimesheetRepository: Symbol('TimesheetRepository'),

  // Strategies
  PayrollStrategy: Symbol('PayrollStrategy'),

  // Adapters
  ClockingAdapterFactory: Symbol('ClockingAdapterFactory'),

  // Services
  EmployeeService: Symbol('EmployeeService'),
  TimesheetService: Symbol('TimesheetService'),
  PayrollService: Symbol('PayrollService'),
  ImportService: Symbol('ImportService'),
} as const;

export type ServiceTokenType = typeof ServiceTokens;
