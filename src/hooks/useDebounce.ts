/**
 * useDebounce - SolidJS Debouncing Hooks
 * 
 * This module provides various debouncing utilities for SolidJS applications,
 * including simple debouncing, callback debouncing, search debouncing, and
 * input validation with debouncing.
 */

import { createSignal, onCleanup } from 'solid-js';

/**
 * Custom hook for debouncing a value setter in SolidJS
 * @param signalSetter - The setter function from createSignal
 * @param delay - Debounce delay in milliseconds (default: 300ms)
 * @returns Debounced setter function
 * 
 * @example
 * ```tsx
 * const [value, setValue] = createSignal('');
 * const debouncedSetValue = useDebounce(setValue, 300);
 * 
 * // In your component
 * <input onInput={(e) => debouncedSetValue(e.currentTarget.value)} />
 * ```
 */
export function useDebounce<T>(
  signalSetter: (value: T) => void,
  delay: number = 300
): (value: T) => void {
  let timerHandle: number | undefined;
  
  const debouncedSignalSetter = (value: T): void => {
    if (timerHandle !== undefined) {
      clearTimeout(timerHandle);
    }
    
    timerHandle = window.setTimeout(() => {
      signalSetter(value);
      timerHandle = undefined;
    }, delay);
  };
  
  // Clean up on component unmount
  onCleanup(() => {
    if (timerHandle !== undefined) {
      clearTimeout(timerHandle);
    }
  });
  
  return debouncedSignalSetter;
}

/**
 * Advanced debounce hook with immediate execution option
 * @param callback - Function to debounce
 * @param delay - Debounce delay in milliseconds (default: 300ms)
 * @param immediate - Execute immediately on first call (default: false)
 * @returns Object with debounced function, cancel, and flush methods
 * 
 * @example
 * ```tsx
 * const { debounced, cancel, flush } = useDebouncedCallback(
 *   (query: string) => searchAPI(query),
 *   500
 * );
 * 
 * // Use in component
 * <input onInput={(e) => debounced(e.currentTarget.value)} />
 * <button onClick={cancel}>Cancel</button>
 * <button onClick={flush}>Search Now</button>
 * ```
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300,
  immediate: boolean = false
): {
  debounced: T;
  cancel: () => void;
  flush: () => void;
} {
  let timerHandle: number | undefined;
  let lastArgs: Parameters<T> | undefined;
  
  const cancel = (): void => {
    if (timerHandle !== undefined) {
      clearTimeout(timerHandle);
      timerHandle = undefined;
    }
    lastArgs = undefined;
  };
  
  const flush = (): void => {
    if (timerHandle !== undefined && lastArgs !== undefined) {
      clearTimeout(timerHandle);
      timerHandle = undefined;
      callback(...lastArgs);
      lastArgs = undefined;
    }
  };
  
  const debounced = ((...args: Parameters<T>): void => {
    lastArgs = args;
    
    if (timerHandle !== undefined) {
      clearTimeout(timerHandle);
    }
    
    if (immediate && timerHandle === undefined) {
      callback(...args);
    }
    
    timerHandle = window.setTimeout(() => {
      if (!immediate) {
        callback(...args);
      }
      timerHandle = undefined;
      lastArgs = undefined;
    }, delay);
  }) as T;
  
  // Clean up on component unmount
  onCleanup(() => {
    cancel();
  });
  
  return { debounced, cancel, flush };
}

/**
 * Hook for debouncing a search query with loading state
 * @param searchFn - Async search function
 * @param delay - Debounce delay in milliseconds (default: 300ms)
 * @returns Object with search handler and loading state
 * 
 * @example
 * ```tsx
 * const { search, isSearching, cancel } = useDebouncedSearch(
 *   async (query) => {
 *     const results = await api.search(query);
 *     setSearchResults(results);
 *   },
 *   500
 * );
 * 
 * <input 
 *   onInput={(e) => search(e.currentTarget.value)}
 *   disabled={isSearching()}
 * />
 * ```
 */
export function useDebouncedSearch<T>(
  searchFn: (query: string) => Promise<T>,
  delay: number = 300
): {
  search: (query: string) => void;
  isSearching: () => boolean;
  cancel: () => void;
} {
  const [isSearching, setIsSearching] = createSignal(false);
  let abortController: AbortController | undefined;
  
  const performSearch = async (query: string): Promise<void> => {
    // Cancel previous search if any
    if (abortController) {
      abortController.abort();
    }
    
    if (!query.trim()) {
      setIsSearching(false);
      return;
    }
    
    abortController = new AbortController();
    setIsSearching(true);
    
    try {
      await searchFn(query);
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Search error:', error);
      }
    } finally {
      if (!abortController.signal.aborted) {
        setIsSearching(false);
      }
    }
  };
  
  const { debounced: search, cancel } = useDebouncedCallback(
    performSearch,
    delay,
    false
  );
  
  const enhancedCancel = (): void => {
    cancel();
    if (abortController) {
      abortController.abort();
    }
    setIsSearching(false);
  };
  
  onCleanup(() => {
    enhancedCancel();
  });
  
  return {
    search,
    isSearching,
    cancel: enhancedCancel
  };
}

/**
 * Hook for debouncing input changes with validation
 * @param initialValue - Initial value
 * @param validator - Validation function (returns error message or null)
 * @param delay - Debounce delay in milliseconds (default: 300ms)
 * @returns Object with value, setter, validation state
 * 
 * @example
 * ```tsx
 * const email = useDebouncedInput(
 *   '',
 *   (val) => {
 *     if (!val) return 'Email is required';
 *     if (!val.includes('@')) return 'Invalid email format';
 *     return null;
 *   },
 *   500
 * );
 * 
 * <div>
 *   <input
 *     value={email.value()}
 *     onInput={(e) => email.setValue(e.currentTarget.value)}
 *     class={email.isValid() ? '' : 'error'}
 *   />
 *   {email.error() && <span class="error">{email.error()}</span>}
 *   {email.isPending() && <span>Validating...</span>}
 * </div>
 * ```
 */
export function useDebouncedInput<T = string>(
  initialValue: T,
  validator?: (value: T) => string | null,
  delay: number = 300
): {
  value: () => T;
  setValue: (value: T) => void;
  debouncedValue: () => T;
  isValid: () => boolean;
  error: () => string | null;
  isPending: () => boolean;
  reset: () => void;
} {
  const [value, setValue] = createSignal<T>(initialValue);
  const [debouncedValue, setDebouncedValue] = createSignal<T>(initialValue);
  const [error, setError] = createSignal<string | null>(null);
  const [isPending, setIsPending] = createSignal(false);
  
  const debouncedSetter = useDebounce((newValue: T) => {
    setDebouncedValue(newValue);
    
    if (validator) {
      const validationError = validator(newValue);
      setError(validationError);
    }
    
    setIsPending(false);
  }, delay);
  
  const enhancedSetValue = (newValue: T): void => {
    setValue(newValue);
    setIsPending(true);
    debouncedSetter(newValue);
  };
  
  const reset = (): void => {
    setValue(initialValue);
    setDebouncedValue(initialValue);
    setError(null);
    setIsPending(false);
  };
  
  return {
    value,
    setValue: enhancedSetValue,
    debouncedValue,
    isValid: () => error() === null,
    error,
    isPending,
    reset
  };
}

/**
 * Hook for creating a debounced signal
 * @param initialValue - Initial value
 * @param delay - Debounce delay in milliseconds (default: 300ms)
 * @returns Tuple of [getter, setter, debouncedGetter]
 * 
 * @example
 * ```tsx
 * const [search, setSearch, debouncedSearch] = createDebouncedSignal('', 500);
 * 
 * createEffect(() => {
 *   // This will only run after user stops typing for 500ms
 * });
 * ```
 */
export function createDebouncedSignal<T>(
  initialValue: T,
  delay: number = 300
): [
  value: () => T,
  setValue: (value: T) => void,
  debouncedValue: () => T
] {
  const [value, setValue] = createSignal<T>(initialValue);
  const [debouncedValue, setDebouncedValue] = createSignal<T>(initialValue);
  
  const debouncedSetter = useDebounce(setDebouncedValue, delay);
  
  const enhancedSetValue = (newValue: T): void => {
    setValue(newValue);
    debouncedSetter(newValue);
  };
  
  return [value, enhancedSetValue, debouncedValue];
}

/**
 * Hook for throttling a function (limits execution frequency)
 * @param callback - Function to throttle
 * @param delay - Minimum time between executions in milliseconds
 * @returns Throttled function
 * 
 * @example
 * ```tsx
 * const handleScroll = useThrottle(() => {
 * }, 100);
 * 
 * <div onScroll={handleScroll}>Scrollable content</div>
 * ```
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 100
): T {
  let lastCall = 0;
  let timerHandle: number | undefined;
  
  const throttled = ((...args: Parameters<T>): void => {
    const now = Date.now();
    
    if (now - lastCall >= delay) {
      lastCall = now;
      callback(...args);
    } else {
      if (timerHandle !== undefined) {
        clearTimeout(timerHandle);
      }
      
      timerHandle = window.setTimeout(() => {
        lastCall = Date.now();
        callback(...args);
        timerHandle = undefined;
      }, delay - (now - lastCall));
    }
  }) as T;
  
  onCleanup(() => {
    if (timerHandle !== undefined) {
      clearTimeout(timerHandle);
    }
  });
  
  return throttled;
}

// Type exports for better IDE support
export type DebouncedFunction<T extends (...args: any[]) => any> = T & {
  cancel: () => void;
  flush: () => void;
};

export type DebouncedInput<T> = {
  value: () => T;
  setValue: (value: T) => void;
  debouncedValue: () => T;
  isValid: () => boolean;
  error: () => string | null;
  isPending: () => boolean;
  reset: () => void;
};

export type DebouncedSearch = {
  search: (query: string) => void;
  isSearching: () => boolean;
  cancel: () => void;
};