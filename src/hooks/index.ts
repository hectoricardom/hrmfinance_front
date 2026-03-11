/**
 * Central export file for all custom hooks
 */

// Debounce hooks
export {
  useDebounce,
  useDebouncedCallback,
  useDebouncedSearch,
  useDebouncedInput,
  createDebouncedSignal,
  useThrottle,
  type DebouncedFunction,
  type DebouncedInput,
  type DebouncedSearch
} from './useDebounce';

// Mobile detection hooks
export {
  useMobile,
  useIsMobile,
  useMediaQuery,
  useResponsiveValue,
  type MobileBreakpoints,
  type MobileState
} from './useMobile';

// Re-export from utils for convenience
export { useDebounce as useDebounceFromUtils } from '../services/utils';