// Employees Module - Human Resources Management
// ============================================
// This module provides comprehensive employee management functionality including:
// - Employee CRUD operations with card/table views
// - Timesheet management and clocking imports
// - Payroll calculations with pluggable strategies
// - Bulk operations and filtering

// ============================================
// Bootstrap & Configuration
// ============================================
export {
  bootstrapEmployeeModule,
  resetEmployeeModule,
  isEmployeeModuleBootstrapped,
  getAdapterFactory,
  getPayrollContext,
  getImportService,
} from './bootstrap';
export type { BootstrapOptions } from './bootstrap';

// ============================================
// Pages
// ============================================
export { default as Employees } from './pages/Employees';

// ============================================
// Components
// ============================================
export { default as AddEmployeeModal } from './components/AddEmployeeModal';
export { default as EmployeeDetailModal } from './components/EmployeeDetailModal';
export { default as EmployeeTable } from './components/EmployeeTable';
export { default as EmployeeFilters } from './components/EmployeeFilters';
export { default as BulkActionsToolbar } from './components/BulkActionsToolbar';
export { default as ViewModeToggle } from './components/ViewModeToggle';
export { default as TimesheetViewModeToggle } from './components/TimesheetViewModeToggle';
export { default as PayrollStrategySelector } from './components/PayrollStrategySelector';
export { default as BulkTimesheetActions } from './components/BulkTimesheetActions';
export type { TimesheetViewMode } from './components/TimesheetViewModeToggle';

// ============================================
// Stores
// ============================================
export { employeeStore } from './stores/employeeStore';
export type {
  Employee,
  EmployeeViewMode,
  EmployeeFilter,
  EmployeeSort,
  BulkOperationResult,
} from './stores/employeeStore';

// ============================================
// Adapters (Clocking Import)
// ============================================
export {
  BaseClockingAdapter,
  FaceTimeAdapter,
  GenericCSVAdapter,
  AdapterFactory,
  ClockingAdapterFactory,
} from './adapters';
export type {
  IClockingAdapter,
  ClockingRecord,
  ParsedTimeEntry as AdapterParsedTimeEntry,
  ImportResult as AdapterImportResult,
  AdapterConfig,
} from './adapters';

// ============================================
// Strategies (Payroll Calculations)
// ============================================
export {
  StandardPayrollStrategy,
  CaliforniaPayrollStrategy,
  PayrollStrategyContext,
  createPayrollStrategy,
  calculatePayroll,
} from './strategies';
export type {
  IPayrollStrategy,
  PayrollContext,
  PayrollResult,
  ValidationResult,
  PayrollStrategyConfig,
} from './strategies';

// ============================================
// Repositories (Data Access Interfaces)
// ============================================
export type { IEmployeeRepository } from './repositories';
export type { ITimesheetRepository } from './repositories';

// ============================================
// Factories
// ============================================
export { TimesheetFactory } from './factories';
export type { ParsedTimeEntry } from './factories';

// ============================================
// Services
// ============================================
export { importService } from './services';
export type {
  ImportProgress,
  ImportResult,
  ImportAdapter,
} from './services';