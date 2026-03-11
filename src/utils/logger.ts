/**
 * Development-only Logger
 *
 * This logger only outputs in development mode and is completely silent in production.
 * No need to manually remove console.log statements before deploying.
 *
 * Usage:
 * ```typescript
 * import { logger } from '@/utils/logger';
 *
 * logger.log('This only shows in development');
 * logger.warn('Warning message');
 * logger.error('Error message');
 * logger.info('Info message');
 * logger.table(data);
 * logger.group('Group label', () => {
 *   logger.log('Grouped message');
 * });
 * ```
 */

const isDev = import.meta.env.DEV;

/**
 * Development-only log function
 */
const log = (...args: any[]): void => {
  if (isDev) {
    console.log(...args);
  }
};

/**
 * Development-only warning function
 */
const warn = (...args: any[]): void => {
  if (isDev) {
    console.warn(...args);
  }
};

/**
 * Development-only error function
 */
const error = (...args: any[]): void => {
  if (isDev) {
    console.error(...args);
  }
};

/**
 * Development-only info function
 */
const info = (...args: any[]): void => {
  if (isDev) {
    console.info(...args);
  }
};

/**
 * Development-only debug function
 */
const debug = (...args: any[]): void => {
  if (isDev) {
    console.debug(...args);
  }
};

/**
 * Development-only table function
 */
const table = (data: any, columns?: string[]): void => {
  if (isDev) {
    console.table(data, columns);
  }
};

/**
 * Development-only trace function
 */
const trace = (...args: any[]): void => {
  if (isDev) {
    console.trace(...args);
  }
};

/**
 * Development-only dir function (for object inspection)
 */
const dir = (obj: any, options?: any): void => {
  if (isDev) {
    console.dir(obj, options);
  }
};

/**
 * Development-only group function
 */
const group = (label: string, callback?: () => void): void => {
  if (isDev) {
    console.group(label);
    if (callback) {
      callback();
      console.groupEnd();
    }
  }
};

/**
 * Development-only groupCollapsed function
 */
const groupCollapsed = (label: string, callback?: () => void): void => {
  if (isDev) {
    console.groupCollapsed(label);
    if (callback) {
      callback();
      console.groupEnd();
    }
  }
};

/**
 * Manually end a group
 */
const groupEnd = (): void => {
  if (isDev) {
    console.groupEnd();
  }
};

/**
 * Development-only time function (for performance measurement)
 */
const time = (label: string): void => {
  if (isDev) {
    console.time(label);
  }
};

/**
 * Development-only timeEnd function
 */
const timeEnd = (label: string): void => {
  if (isDev) {
    console.timeEnd(label);
  }
};

/**
 * Development-only clear function
 */
const clear = (): void => {
  if (isDev) {
    console.clear();
  }
};

/**
 * Development-only assert function
 */
const assert = (condition: boolean, ...args: any[]): void => {
  if (isDev) {
    console.assert(condition, ...args);
  }
};

/**
 * Development-only count function
 */
const count = (label?: string): void => {
  if (isDev) {
    console.count(label);
  }
};

/**
 * Development-only countReset function
 */
const countReset = (label?: string): void => {
  if (isDev) {
    console.countReset(label);
  }
};

/**
 * Styled log with custom colors (development only)
 *
 * @example
 * logger.styled('Success!', 'color: green; font-weight: bold');
 */
const styled = (message: string, styles: string): void => {
  if (isDev) {
    console.log(`%c${message}`, styles);
  }
};

/**
 * Common styled log presets
 */
const success = (message: string, ...args: any[]): void => {
  if (isDev) {
    console.log(`%c✅ ${message}`, 'color: #28a745; font-weight: bold', ...args);
  }
};

const fail = (message: string, ...args: any[]): void => {
  if (isDev) {
    console.log(`%c❌ ${message}`, 'color: #dc3545; font-weight: bold', ...args);
  }
};

const loading = (message: string, ...args: any[]): void => {
  if (isDev) {
    console.log(`%c⏳ ${message}`, 'color: #ffc107; font-weight: bold', ...args);
  }
};

const api = (message: string, ...args: any[]): void => {
  if (isDev) {
    console.log(`%c🌐 API: ${message}`, 'color: #007bff; font-weight: bold', ...args);
  }
};

const store = (message: string, ...args: any[]): void => {
  if (isDev) {
    console.log(`%c📦 Store: ${message}`, 'color: #6f42c1; font-weight: bold', ...args);
  }
};

const route = (message: string, ...args: any[]): void => {
  if (isDev) {
    console.log(`%c🧭 Route: ${message}`, 'color: #20c997; font-weight: bold', ...args);
  }
};

/**
 * Log only if a condition is true
 */
const logIf = (condition: boolean, ...args: any[]): void => {
  if (isDev && condition) {
    console.log(...args);
  }
};

/**
 * Export the logger object with all methods
 */
export const logger = {
  // Basic logging
  log,
  warn,
  error,
  info,
  debug,

  // Advanced logging
  table,
  trace,
  dir,

  // Grouping
  group,
  groupCollapsed,
  groupEnd,

  // Performance
  time,
  timeEnd,

  // Utilities
  clear,
  assert,
  count,
  countReset,

  // Styled logs
  styled,
  success,
  fail,
  loading,
  api,
  store,
  route,

  // Conditional
  logIf,

  // Environment info
  isDev,
};

/**
 * Default export
 */
export default logger;
