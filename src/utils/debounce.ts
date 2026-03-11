/**
 * Creates a debounced function that delays invoking func until after wait milliseconds
 * have elapsed since the last time the debounced function was invoked.
 *
 * @param func - The function to debounce
 * @param wait - The number of milliseconds to delay (default: 300ms)
 * @returns A debounced version of the function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number = 300
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return function debounced(...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, wait);
  };
}

/**
 * For use in SolidJS createEffect with onCleanup.
 * Returns a cleanup function that clears the timeout.
 *
 * @param callback - The function to call after the delay
 * @param delay - The delay in milliseconds (default: 500ms)
 * @returns A cleanup function to clear the timeout
 */
export function createDebouncedEffect(
  callback: () => void | Promise<void>,
  delay: number = 500
): () => void {
  const timeoutId = setTimeout(callback, delay);

  return () => {
    clearTimeout(timeoutId);
  };
}
