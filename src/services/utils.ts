// =============================================================================
// UTILITY FUNCTIONS FOR HRM FINANCE APPLICATION
// =============================================================================

import { createSignal, onCleanup } from 'solid-js';
import { authStore } from '../stores/authStore';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export type SortDirection = 'asc' | 'desc';

export interface SortConfig<T> {
  key: keyof T;
  direction: SortDirection;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface PaginationConfig {
  page: number;
  pageSize: number;
  total?: number;
}

export interface FilterConfig {
  search?: string;
  dateRange?: DateRange;
  status?: string;
  type?: string;
}

// =============================================================================
// JSON UTILITIES
// =============================================================================



export function devLog(...args: any) {
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev && authStore.isAdmin()) {
    console.log(...args);
  }
}


/**
 * Deep clone an object using JSON serialization
 * @param value - The value to clone
 * @returns Deep cloned value
 */
export const deepClone = <T>(value: T): T => {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  
  if (value instanceof Date) {
    return new Date(value.getTime()) as T;
  }
  
  if (Array.isArray(value)) {
    return value.map(item => deepClone(item)) as T;
  }
  
  return JSON.parse(JSON.stringify(value));
};

/**
 * Check if a string is valid JSON
 * @param str - String to check
 * @returns True if valid JSON, false otherwise
 */
export const isValidJSON = (str: string): boolean => {
  try {
    JSON.parse(str);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Safely parse JSON with fallback
 * @param str - JSON string to parse
 * @param fallback - Fallback value if parsing fails
 * @returns Parsed object or fallback
 */
export const safeJSONParse = <T>(str: string, fallback: T): T => {
  try {
    return JSON.parse(str) as T;
  } catch (error) {
    return fallback;
  }
};

// =============================================================================
// ID GENERATION UTILITIES
// =============================================================================

/**
 * Generate a random alphanumeric ID
 * @param length - Length of the ID (default: 16)
 * @returns Random ID string
 */
export const generateRandomId = (length: number = 16): string => {
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  
  return result;
};

export const generateRandomNUM = (length: number = 16): string => {
  const alphabet = '123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  
  return result;
};

/**
 * Generate a short code ID using limited character set
 * @param length - Length of the code (default: 4)
 * @returns Short code string
 */
export const generateShortCode = (length: number = 4): string => {
  const alphabet = '0123456789BCDFGKSY';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  
  return result;
};

/**
 * Generate a UUID v4
 * @returns UUID string
 */
export const generateUUID = (): string => {
  let d = new Date().getTime();
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
  return uuid;
};

// =============================================================================
// ARRAY AND OBJECT UTILITIES
// =============================================================================

/**
 * Sort an array of objects by a specific key
 * @param array - Array to sort
 * @param key - Key to sort by
 * @param direction - Sort direction (default: 'asc')
 * @returns Sorted array
 */
export const sortByKey = <T>(
  array: T[],
  key: keyof T,
  direction: SortDirection = 'asc'
): T[] => {
  if (!array || array.length === 0) return array;
  
  return [...array].sort((a, b) => {
    const aValue = a[key];
    const bValue = b[key];
    
    if (aValue < bValue) {
      return direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return direction === 'asc' ? 1 : -1;
    }
    return 0;
  });
};

/**
 * Sort an array using a custom function
 * @param array - Array to sort
 * @param sortFn - Function to extract sort value
 * @param direction - Sort direction (default: 'asc')
 * @returns Sorted array
 */
export const sortByFunction = <T, K>(
  array: T[],
  sortFn: (item: T) => K,
  direction: SortDirection = 'asc'
): T[] => {
  if (!array || array.length === 0) return array;
  
  return deepClone(array).sort((a, b) => {
    const aValue = sortFn(a);
    const bValue = sortFn(b);
    
    if (aValue < bValue) {
      return direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return direction === 'asc' ? 1 : -1;
    }
    return 0;
  });
};

/**
 * Group array items by a specific key
 * @param array - Array to group
 * @param key - Key to group by
 * @returns Grouped object
 */
export const groupBy = <T, K extends keyof T>(
  array: T[],
  key: K
): Record<string, T[]> => {
  return array.reduce((groups, item) => {
    const groupKey = String(item[key]);
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(item);
    return groups;
  }, {} as Record<string, T[]>);
};

/**
 * Remove duplicates from array based on a key
 * @param array - Array to deduplicate
 * @param key - Key to check for duplicates
 * @returns Array without duplicates
 */
export const uniqueBy = <T, K extends keyof T>(array: T[], key: K): T[] => {
  const seen = new Set();
  return array.filter(item => {
    const value = item[key];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
};

// =============================================================================
// STRING UTILITIES
// =============================================================================

/**
 * Check if a value exists and return it with a space, or empty string
 * @param value - Value to check
 * @returns Value with space or empty string
 */
export const valueOrEmpty = (value: any): string => {
  return value ? `${value} ` : '';
};

/**
 * Capitalize the first letter of a string
 * @param str - String to capitalize
 * @returns Capitalized string
 */
export const capitalize = (str: string): string => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Convert string to kebab-case
 * @param str - String to convert
 * @returns Kebab-case string
 */
export const kebabCase = (str: string): string => {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .toLowerCase();
};

/**
 * Convert string to camelCase
 * @param str - String to convert
 * @returns CamelCase string
 */
export const camelCase = (str: string): string => {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, '');
};

/**
 * Truncate string to specified length
 * @param str - String to truncate
 * @param length - Maximum length
 * @param suffix - Suffix to add (default: '...')
 * @returns Truncated string
 */
export const truncate = (str: string, length: number, suffix: string = '...'): string => {
  if (str.length <= length) return str;
  return str.substring(0, length - suffix.length) + suffix;
};

/**
 * Extract HBL string using regex pattern
 * @param str - String to search
 * @returns Extracted HBL or original string
 */
export const extractHBL = (str: string): string => {
  const regex = /230(\d{6})/g;
  const match = str.match(regex);
  return match?.[0] || str;
};

// =============================================================================
// DATE UTILITIES
// =============================================================================

/**
 * Format date to YYYY-MM-DD string
 * @param date - Date to format
 * @returns Formatted date string
 */
export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

/**
 * Parse date string to Date object
 * @param dateStr - Date string to parse
 * @returns Date object or null if invalid
 */
export const parseDate = (dateStr: string): Date | null => {
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
};

/**
 * Check if date is within range
 * @param date - Date to check
 * @param start - Start date
 * @param end - End date
 * @returns True if date is within range
 */
export const isDateInRange = (date: Date, start: Date, end: Date): boolean => {
  return date >= start && date <= end;
};

/**
 * Get date range for common periods
 * @param period - Period type
 * @returns Date range object
 */
export const getDateRange = (period: 'today' | 'week' | 'month' | 'year'): DateRange => {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);
  
  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'week':
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    case 'month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(start.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'year':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
      break;
  }
  
  return { start, end };
};

// =============================================================================
// NUMBER UTILITIES
// =============================================================================

/**
 * Format number as currency
 * @param amount - Amount to format
 * @param currency - Currency code (default: 'USD')
 * @param locale - Locale (default: 'en-US')
 * @returns Formatted currency string
 */
export const formatCurrency = (
  amount: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency
  }).format(amount);
};

/**
 * Format number with thousands separators
 * @param num - Number to format
 * @param decimals - Number of decimal places
 * @returns Formatted number string
 */
export const formatNumber = (num: number, decimals: number = 2): string => {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

/**
 * Round number to specified decimal places
 * @param num - Number to round
 * @param decimals - Number of decimal places
 * @returns Rounded number
 */
export const roundTo = (num: number, decimals: number): number => {
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
};

/**
 * Calculate percentage
 * @param part - Part value
 * @param total - Total value
 * @returns Percentage as number
 */
export const calculatePercentage = (part: number, total: number): number => {
  if (total === 0) return 0;
  return (part / total) * 100;
};

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

/**
 * Validate email format
 * @param email - Email to validate
 * @returns True if valid email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number format
 * @param phone - Phone number to validate
 * @returns True if valid phone format
 */
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
};

/**
 * Check if value is not null or undefined
 * @param value - Value to check
 * @returns True if value exists
 */
export const exists = (value: any): boolean => {
  return value !== null && value !== undefined;
};

/**
 * Check if string is not empty
 * @param str - String to check
 * @returns True if string is not empty
 */
export const isNotEmpty = (str: string): boolean => {
  return typeof str === 'string' && str.trim().length > 0;
};

// =============================================================================
// STORAGE UTILITIES
// =============================================================================

/**
 * Simple in-memory store for temporary data
 */
class MemoryStore {
  private store: Record<string, any> = {};

  set(key: string, value: any): void {
    this.store[key] = value;
  }

  get<T>(key: string): T | undefined {
    return this.store[key];
  }

  remove(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }

  getAll(): Record<string, any> {
    return { ...this.store };
  }

  has(key: string): boolean {
    return key in this.store;
  }
}

export const memoryStore = new MemoryStore();

/**
 * Local storage utilities with error handling
 */
export const localStorage = {
  set: (key: string, value: any): boolean => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, JSON.stringify(value));
        return true;
      }
    } catch (error) {
      console.error('Error setting localStorage:', error);
    }
    return false;
  },

  get: <T>(key: string, fallback?: T): T | undefined => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
      }
    } catch (error) {
      console.error('Error getting localStorage:', error);
    }
    return fallback;
  },

  remove: (key: string): boolean => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return true;
      }
    } catch (error) {
      console.error('Error removing localStorage:', error);
    }
    return false;
  },

  clear: (): boolean => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
        return true;
      }
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
    return false;
  }
};

// =============================================================================
// ASYNC UTILITIES
// =============================================================================

/**
 * Process array items sequentially with async function
 * @param array - Array to process
 * @param processor - Async function to process each item
 * @param callback - Optional callback for each processed item
 * @returns Promise that resolves when all items are processed
 */
export const processSequentially = async <T, R>(
  array: T[],
  processor: (item: T, index: number, array: T[]) => Promise<R>,
  callback?: (result: R, item: T, index: number) => void
): Promise<R[]> => {
  const results: R[] = [];
  
  for (let i = 0; i < array.length; i++) {
    const result = await processor(array[i], i, array);
    results.push(result);
    
    if (callback) {
      callback(result, array[i], i);
    }
  }
  
  return results;
};

/**.  
 * Delay execution for specified milliseconds
 * @param ms - Milliseconds to delay
 * @returns Promise that resolves after delay
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Retry function with exponential backoff
 * @param fn - Function to retry
 * @param maxRetries - Maximum number of retries
 * @param initialDelay - Initial delay in milliseconds
 * @returns Promise with the result or throws last error
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (attempt < maxRetries - 1) {
        const delayMs = initialDelay * Math.pow(2, attempt);
        await delay(delayMs);
      }
    }
  }
  
  throw lastError!;
};

// =============================================================================
// API UTILITIES
// =============================================================================

/**
 * Enhanced GraphQL fetch with authentication
 * @param params - GraphQL parameters
 * @returns API response data
 */

export const fetchGraphQL = async (params: {
  query: string;
  params?: Record<string, any>;
  form?: Record<string, any>;
  queryString?: string;
}): Promise<any> => {

 
  const token = "eyJhbGciOiJSUzI1NiIsImtpZCI6IjhlOGZjOGU1NTZmN2E3NmQwOGQzNTgyOWQ2ZjkwYWUyZTEyY2ZkMGQiLCJ0eXAiOiJKV1QifQ";
  const url = "https://qvamarkets.com/gql_api";
  
  //const token = `Bearer ${authStore.state?.user?.accessToken}`
  //const url = "http://localhost/api/query";

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept-Encoding': 'gzip, deflate, br',
      'Authorization': token,
    },
    body: JSON.stringify(params),
  });
  
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (data.errors) {
    throw new Error(data.errors[0]?.message || 'GraphQL error');
  }
  //devLog(JSON.stringify(params))
  
 
  //devLog(data)
 
  return data.data;
};





/**
 * Enhanced GraphQL fetch with authentication
 * @param params - GraphQL parameters
 * @returns API response data
 */



export function getCookie(cName:string) {
  const name = cName + "=";
  const cDecoded = decodeURIComponent(document.cookie);
  const cArr = cDecoded.split('; ');
  let res;
  cArr.forEach(val => {
    if (val.indexOf(name) === 0) 
      res = val.substring(name.length);
  })
  return res;
}

export const fetchGraphQLSS = async (params: {
  query: string;
  params?: Record<string, any>;
  form?: Record<string, any>;
  queryString?: string;
}): Promise<any> => {

 
  const token = getCookie("ssgl_access_tkn") || "";
  
  
  //"eyJhbGciOiJSUzI1NiIsImtpZCI6IjhlOGZjOGU1NTZmN2E3NmQwOGQzNTgyOWQ2ZjkwYWUyZTEyY2ZkMGQiLCJ0eXAiOiJKV1QifQ";



  const url = "https://ssgloghr.com/api/query";
  
  //const token = `Bearer ${authStore.state?.user?.accessToken}`
  //const url = "http://localhost/api/query";

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept-Encoding': 'gzip, deflate, br',
      'Authorization': token,
    },
    body: JSON.stringify(params),
  });
  


  if(response.status === 401){

    devLog(401, "unath")
    //location.reload();
  }
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }


  
  
  const data = await response.json();
  
  if (data.errors) {
    throw new Error(data.errors[0]?.message || 'GraphQL error');
  }
  //devLog(JSON.stringify(params))
  
 
  //devLog(data)
 
  return data.data;
};



export const fetchPublicSS = async (params: {
  query: string;
  params?: Record<string, any>;
  form?: Record<string, any>;
  queryString?: string;
}): Promise<any> => {

 
  const url = "https://ssgloghr.com/api/public";
 
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept-Encoding': 'gzip, deflate, br',
    },
    body: JSON.stringify(params),
  });
  

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (data.errors) {
    throw new Error(data.errors[0]?.message || 'GraphQL error');
  }
 
  return data.data;
};






// =============================================================================
// SOLIDJS UTILITIES
// =============================================================================

/**
 * Custom hook for debouncing a value setter in SolidJS
 * @param signalSetter - The setter function from createSignal
 * @param delay - Debounce delay in milliseconds
 * @returns Debounced setter function
 * 
 * @example
 * const [value, setValue] = createSignal('');
 * const debouncedSetValue = useDebounce(setValue, 300);
 * 
 * // In your component
 * <input onInput={(e) => debouncedSetValue(e.currentTarget.value)} />
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
 * @param delay - Debounce delay in milliseconds
 * @param immediate - Execute immediately on first call
 * @returns Object with debounced function, cancel, and flush methods
 * 
 * @example
 * const { debounced, cancel, flush } = useDebouncedCallback(
 *   (query: string) => searchAPI(query),
 *   500
 * );
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
 * @param delay - Debounce delay in milliseconds
 * @returns Object with search handler and loading state
 * 
 * @example
 * const { search, isSearching } = useDebouncedSearch(
 *   async (query) => await api.search(query),
 *   500
 * );
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
 * @param validator - Validation function
 * @param delay - Debounce delay in milliseconds
 * @returns Object with value, setter, validation state
 * 
 * @example
 * const { value, setValue, isValid, error } = useDebouncedInput(
 *   '',
 *   (val) => val.length >= 3 ? null : 'Minimum 3 characters',
 *   300
 * );
 */
export function useDebouncedInput<T>(
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
  
  return {
    value,
    setValue: enhancedSetValue,
    debouncedValue,
    isValid: () => error() === null,
    error,
    isPending
  };
}



export const getType = (v: string) :  'in' | 'out' | 'transfer' | 'adjustment' =>{
  let movementType : Record<string, any> =  {
    "ENTRY": "in",
    "in": "in",
    "TRANSFER":"transfer",
    "transfer":"transfer",
    "SALES": "out",
    "out": "out",
    "adjustment": "adjustment"

  } 
  return movementType[v];
}



export const getTypeFilter = (v: string) :  'ENTRY' | 'TRANSFER' | 'SALES' | 'adjustment' =>{
  let movementType : Record<string, any> =  {
    "ENTRY": "ENTRY",
    "in": "ENTRY",
    "TRANSFER":"TRANSFER",
    "transfer":"TRANSFER",
    "SALES": "SALES",
    "out": "SALES",
    "adjustment": "adjustment"
  } 
  return movementType[v];
}


export function convertObj2Array(obj: Record<string, any>) {
  var arr: Record<string, any>[] = [];
  obj &&
    Object.keys(obj).map((o: string) => {
      arr.push(obj[o]);
    });
  return arr;
}



export function Base64Decode(str:string): string {
  if (!/^[a-z0-9+/]+={0,2}$/i.test(str) || str.length % 4 != 0)
    throw Error("Not base64 string");

  var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  var o1,
    o2,
    o3,
    h1,
    h2,
    h3,
    h4,
    bits,
    d = [];

  for (var c = 0; c < str.length; c += 4) {
    // unpack four hexets into three octets
    h1 = b64.indexOf(str.charAt(c));
    h2 = b64.indexOf(str.charAt(c + 1));
    h3 = b64.indexOf(str.charAt(c + 2));
    h4 = b64.indexOf(str.charAt(c + 3));

    bits = (h1 << 18) | (h2 << 12) | (h3 << 6) | h4;

    o1 = (bits >>> 16) & 0xff;
    o2 = (bits >>> 8) & 0xff;
    o3 = bits & 0xff;

    d[c / 4] = String.fromCharCode(o1, o2, o3);
    // check for padding
    if (h4 == 0x40) d[c / 4] = String.fromCharCode(o1, o2);
    if (h3 == 0x40) d[c / 4] = String.fromCharCode(o1);
  }
  str = d.join(""); // use Array.join() for better performance than repeated string appends

  return str;
}

export const Base64Encode = (str:string): string => {

  if (/([^\u0000-\u00ff])/.test(str)) throw Error('String must be ASCII');

  var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  var o1, o2, o3, bits, h1, h2, h3, h4, e=[], pad = '', c;

  c = str.length % 3;  // pad string to length of multiple of 3
  if (c > 0) { while (c++ < 3) { pad += '='; str += '\0'; } }
  // note: doing padding here saves us doing special-case packing for trailing 1 or 2 chars

  for (c=0; c<str.length; c+=3) {  // pack three octets into four hexets
      o1 = str.charCodeAt(c);
      o2 = str.charCodeAt(c+1);
      o3 = str.charCodeAt(c+2);

      bits = o1<<16 | o2<<8 | o3;

      h1 = bits>>18 & 0x3f;
      h2 = bits>>12 & 0x3f;
      h3 = bits>>6 & 0x3f;
      h4 = bits & 0x3f;

      // use hextets to index into code string
      e[c/3] = b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4);
  }
  str = e.join('');  // use Array.join() for better performance than repeated string appends

  // replace 'A's from padded nulls with '='s
  str = str.slice(0, str.length-pad.length) + pad;

  return str;
}







export const compareJSON = (arr:any, arg1:any, arg2?: any, ignore?:any) => {

  let r = 0;
  let data2Upd:any = {}
  arr.map((fl: string)=>{
    if(!ignore?.[fl]){
      if(!deepCompareJSON(arg1?.[fl], arg2?.[fl])){
        r = 1;
        data2Upd[fl] = arg1[fl];
      }
    }
  })
  return {hasChange:r,  data: data2Upd}
}



export const deepCompareJSON = (arg1:any, arg2:any):any => {
  if (Object.prototype.toString.call(arg1) === Object.prototype.toString.call(arg2)){
    if (Object.prototype.toString.call(arg1) === '[object Object]' || Object.prototype.toString.call(arg1) === '[object Array]' ){
      if (Object.keys(arg1).length !== Object.keys(arg2).length ){
        return false;
      }
      return (Object.keys(arg1).every(function(key){
        return deepCompareJSON(arg1[key],arg2[key]);
      }));
    }
    return (arg1===arg2);
  }
  return false;
}


// =============================================================================
// DEPRECATED FUNCTIONS (for backward compatibility)
// =============================================================================

/** @deprecated Use deepClone instead */
export const aisleJson = deepClone;

/** @deprecated Use isValidJSON instead */
export const isJson = isValidJSON;

/** @deprecated Use memoryStore.set instead */
export const updStore = (k: string, v: any) => memoryStore.set(k, v);

/** @deprecated Use memoryStore.get instead */
export const getStore = (k?: string) => k ? memoryStore.get(k) : memoryStore.getAll();

/** @deprecated Use memoryStore.remove instead */
export const rmvStore = (k: string) => memoryStore.remove(k);

/** @deprecated Use generateRandomId instead */
export const gen16CodeId = () => generateRandomId(16);

/** @deprecated Use generateShortCode instead */
export const genCodeId = (length: number) => generateShortCode(length);

/** @deprecated Use sortByKey instead */
export const sortObj = <T>(array: T[], key: keyof T, ascending: boolean = true) => 
  sortByKey(array, key, ascending ? 'asc' : 'desc');

/** @deprecated Use sortByFunction instead */
export const sortByFunc = <T, K>(array: T[], fn: (item: T) => K, ascending: boolean = true) => 
  sortByFunction(array, fn, ascending ? 'asc' : 'desc');

/** @deprecated Use valueOrEmpty instead */
export const isval = valueOrEmpty;

/** @deprecated Use extractHBL instead */
export const searchHblStr = extractHBL;

/** @deprecated Use fetchGraphQL instead */
export const fetchEncryptStream = fetchGraphQL;

/** @deprecated Use processSequentially instead */
export const fetchQueue = processSequentially;

/** @deprecated Use memoryStore.get instead */
export const getQueryCode = (key: string) => memoryStore.get(key);

/** @deprecated Use memoryStore instead */
export const qryStore = () => "queries_callback";



export function roundTo2Decimals(num: number, decimal: number): number {
  return parseFloat(num.toFixed(decimal || 2));
}


const LOGS = () => {
  devLog()
}



export const multiUpd = async (arr: any[], length: number, func: Promise<void>) =>{

  if(length>30){


    let factor = 3
    let h32 = Array.from(Array(factor).keys());
    let m3 = Math.ceil(length / factor);


    const prom2 = h32.map(async gg=>{ 
      let init = m3*gg;
      let end = m3 * (gg+1)-1;
      if(end>length){
        end=length
      }
      await processSequentially(arr.slice(init, end), func );
    })

    const contents2 = await Promise.all(prom2);
  }
  else{
    await processSequentially(arr, func );
  }
}





export const sortBy = (arr: any, field: string, desc = false) => 
  [...arr].sort((a, b) => {
    if (a[field] < b[field]) return desc ? 1 : -1;
    if (a[field] > b[field]) return desc ? -1 : 1;
    return 0;
  });



  export const formatFloat = (balance: string | number, decimal?: number ): number => {
    if(!balance){
      return 0
    } 
    return parseFloat(parseFloat(balance.toString()).toFixed(decimal || 2))
  }




  // Multi-column sort function
export function multiSort(array: any[], sortKeys: any[]) {
  /**
   * @param {Array} array - Array of objects to sort
   * @param {Array} sortKeys - Array of sort configurations
   *   Example: [
   *     { key: 'category', order: 'asc' },
   *     { key: 'price', order: 'desc' },
   *     { key: 'name', order: 'asc' }
   *   ]
   */
  return [...array].sort((a, b) => {
    for (const { key, order = 'asc' } of sortKeys) {
      let valA = a[key];
      let valB = b[key];
      
      // Handle null/undefined
      if (valA == null && valB == null) continue;
      if (valA == null) return order === 'asc' ? 1 : -1;
      if (valB == null) return order === 'asc' ? -1 : 1;
      
      // Handle strings (case insensitive)
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      
      // Compare
      if (valA < valB) return order === 'asc' ? -1 : 1;
      if (valA > valB) return order === 'asc' ? 1 : -1;
    }
    return 0;
  });
}


export const formatDateMMDDYYYY = (dateStr: string| number|undefined) => {
  
  if(typeof dateStr === 'string' && dateStr.split('-').length > 1){
    return parseDateMMDDYYYY(dateStr);
  }

  const today = new Date()

  

  const date = new Date(dateStr || today)

  //devLog({date})
  const formatted = `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`
  return formatted;
}


export function parseDateMMDDYYYY(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  return `${month}/${day}/${year}`;
  //return new Date(year, month - 1, day);  // month es 0-indexed
}

/**
 * Timezone-safe date formatting function
 * Handles both string dates (YYYY-MM-DD) and timestamps without timezone shift
 *
 * @param dateInput - Date string (YYYY-MM-DD), timestamp (number), or undefined
 * @param locale - Locale for formatting (default: 'en-US')
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string or fallback value
 */
export function formatDateSafe(
  dateInput: string | number | undefined,
  locale: string = 'en-US',
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
): string {
  if (!dateInput) return '-';

  let date: Date;

  if (typeof dateInput === 'string') {
    // Check if it's a YYYY-MM-DD format string
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      // Parse manually to avoid timezone issues
      const [year, month, day] = dateInput.split('-').map(Number);
      date = new Date(year, month - 1, day); // Create date in local timezone
    } else {
      // For other string formats, append time to force local interpretation
      date = new Date(dateInput + 'T00:00:00');
    }
  } else {
    // It's a timestamp - use as-is
    date = new Date(dateInput);
  }

  if (isNaN(date.getTime())) return '-';

  return date.toLocaleDateString(locale, options);
}

/**
 * Timezone-safe long date formatting (e.g., "January 15, 2024")
 */
export function formatDateLong(
  dateInput: string | number | undefined,
  locale: string = 'en-US'
): string {
  return formatDateSafe(dateInput, locale, { month: 'long', day: 'numeric', year: 'numeric' });
}


// Para QR Drake (3 boxes con auto-tab): sin separador
export function ssnForQR(ssn: string): string {
  const clean = ssn.replace(/\D/g, '');
  return `${clean.slice(0,3)}${clean.slice(3,5)}${clean.slice(5,9)}`;
}


// Para teléfono también
export function phoneForQR(phone: string): string {
  const clean = phone.replace(/\D/g, '');
  return `${clean.slice(0,3)}${clean.slice(3,6)}${clean.slice(6,10)}`;
}



export const logsOnDev = {
  dev: (...args: any) => {
    if (process.env.NODE_ENV === 'development') {
      devLog('[DEV]', ...args);
    }
  },
  warn: (...args: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[DEV]', ...args);
    }
  },
  error: (...args: any) => {
    // Errors usually should show in all environments
    console.error(...args);
  }
};


