// Types and Interfaces
export type {
  ClockingRecord,
  ParsedTimeEntry,
  ImportResult,
  AdapterConfig,
  IClockingAdapter,
} from './IClockingAdapter';

// Base Classes
export { BaseClockingAdapter } from './BaseClockingAdapter';

// Adapters
export { FaceTimeAdapter } from './FaceTimeAdapter';
export { GenericCSVAdapter } from './GenericCSVAdapter';

// Factory
export { AdapterFactory } from './AdapterFactory';

// Re-export for convenience
export { AdapterFactory as ClockingAdapterFactory } from './AdapterFactory';
