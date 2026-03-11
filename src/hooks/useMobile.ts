/**
 * useMobile - SolidJS Hook for Mobile Detection
 *
 * Provides reactive mobile/tablet/desktop detection with responsive
 * breakpoint support for styling purposes.
 */

import { createSignal, onCleanup, onMount } from 'solid-js';

// Default breakpoints (can be customized)
const DEFAULT_BREAKPOINTS = {
  mobile: 768,    // < 768px = mobile
  tablet: 1024,   // 768px - 1024px = tablet
  desktop: 1024   // > 1024px = desktop
};

export interface MobileBreakpoints {
  mobile: number;
  tablet: number;
  desktop: number;
}

export interface MobileState {
  isMobile: () => boolean;
  isTablet: () => boolean;
  isDesktop: () => boolean;
  isTouchDevice: () => boolean;
  screenWidth: () => number;
  screenHeight: () => number;
  orientation: () => 'portrait' | 'landscape';
  breakpoint: () => 'mobile' | 'tablet' | 'desktop';
}

/**
 * Hook to detect if the user is on a mobile device
 * @param customBreakpoints - Optional custom breakpoints
 * @returns Object with mobile detection state
 *
 * @example
 * ```tsx
 * const { isMobile, isTablet, isDesktop, breakpoint } = useMobile();
 *
 * return (
 *   <div style={{ padding: isMobile() ? '10px' : '20px' }}>
 *     {isMobile() ? 'Mobile View' : 'Desktop View'}
 *   </div>
 * );
 * ```
 */
export function useMobile(customBreakpoints?: Partial<MobileBreakpoints>): MobileState {
  const breakpoints = { ...DEFAULT_BREAKPOINTS, ...customBreakpoints };

  const [screenWidth, setScreenWidth] = createSignal(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );
  const [screenHeight, setScreenHeight] = createSignal(
    typeof window !== 'undefined' ? window.innerHeight : 768
  );
  const [isTouchDevice, setIsTouchDevice] = createSignal(false);

  // Derived states
  const isMobile = () => screenWidth() < breakpoints.mobile;
  const isTablet = () => screenWidth() >= breakpoints.mobile && screenWidth() < breakpoints.tablet;
  const isDesktop = () => screenWidth() >= breakpoints.desktop;
  const orientation = () => screenWidth() > screenHeight() ? 'landscape' : 'portrait';
  const breakpoint = (): 'mobile' | 'tablet' | 'desktop' => {
    if (isMobile()) return 'mobile';
    if (isTablet()) return 'tablet';
    return 'desktop';
  };

  onMount(() => {
    // Check for touch device
    const checkTouchDevice = () => {
      setIsTouchDevice(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-ignore - msMaxTouchPoints is IE specific
        navigator.msMaxTouchPoints > 0
      );
    };

    // Handle resize
    const handleResize = () => {
      setScreenWidth(window.innerWidth);
      setScreenHeight(window.innerHeight);
    };

    // Initial check
    checkTouchDevice();
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    onCleanup(() => {
      window.removeEventListener('resize', handleResize);
    });
  });

  return {
    isMobile,
    isTablet,
    isDesktop,
    isTouchDevice,
    screenWidth,
    screenHeight,
    orientation,
    breakpoint
  };
}

/**
 * Simple hook that just returns if device is mobile
 * @param breakpoint - Mobile breakpoint in pixels (default: 768)
 * @returns Getter function for mobile state
 *
 * @example
 * ```tsx
 * const isMobile = useIsMobile();
 *
 * return (
 *   <button style={{
 *     'font-size': isMobile() ? '14px' : '16px',
 *     padding: isMobile() ? '8px 12px' : '12px 24px'
 *   }}>
 *     Click me
 *   </button>
 * );
 * ```
 */
export function useIsMobile(breakpoint: number = 768): () => boolean {
  const [isMobile, setIsMobile] = createSignal(
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  );

  onMount(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    onCleanup(() => {
      window.removeEventListener('resize', handleResize);
    });
  });

  return isMobile;
}

/**
 * Hook with media query support
 * @param query - CSS media query string
 * @returns Getter function for match state
 *
 * @example
 * ```tsx
 * const isSmallScreen = useMediaQuery('(max-width: 600px)');
 * const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
 * const isPortrait = useMediaQuery('(orientation: portrait)');
 *
 * return (
 *   <div class={isSmallScreen() ? 'compact' : 'spacious'}>
 *     Content
 *   </div>
 * );
 * ```
 */
export function useMediaQuery(query: string): () => boolean {
  const [matches, setMatches] = createSignal(false);

  onMount(() => {
    const mediaQuery = window.matchMedia(query);

    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setMatches(e.matches);
    };

    // Initial check
    handleChange(mediaQuery);

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      onCleanup(() => {
        mediaQuery.removeEventListener('change', handleChange);
      });
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
      onCleanup(() => {
        mediaQuery.removeListener(handleChange);
      });
    }
  });

  return matches;
}

/**
 * Get responsive value based on current breakpoint
 * @param values - Object with values for each breakpoint
 * @returns Getter function that returns the appropriate value
 *
 * @example
 * ```tsx
 * const padding = useResponsiveValue({
 *   mobile: '8px',
 *   tablet: '16px',
 *   desktop: '24px'
 * });
 *
 * const columns = useResponsiveValue({
 *   mobile: 1,
 *   tablet: 2,
 *   desktop: 4
 * });
 *
 * return (
 *   <div style={{
 *     padding: padding(),
 *     'grid-template-columns': `repeat(${columns()}, 1fr)`
 *   }}>
 *     Content
 *   </div>
 * );
 * ```
 */
export function useResponsiveValue<T>(values: {
  mobile: T;
  tablet?: T;
  desktop: T;
}): () => T {
  const { breakpoint } = useMobile();

  return () => {
    const bp = breakpoint();
    if (bp === 'mobile') return values.mobile;
    if (bp === 'tablet') return values.tablet ?? values.desktop;
    return values.desktop;
  };
}

// Type exports
export type { MobileBreakpoints, MobileState };
