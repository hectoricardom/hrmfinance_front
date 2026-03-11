/**
 * Container Scanner Configuration
 */

export const scannerConfig = {
  // API Configuration
  apiBaseUrl: '/api',

  // Use mock API for development/testing
  useMockApi: false, // Set to false in production

  // Debounce delay for QR input (milliseconds)
  scanDebounceDelay: 300,

  // Success message display duration (milliseconds)
  successMessageDuration: 2000,

  // Error message display duration (milliseconds)
  errorMessageDuration: 3000,

  // Haptic feedback (vibration) settings
  hapticFeedback: {
    enabled: true,
    success: 50,              // Duration in ms
    error: [100, 50, 100],    // Pattern: vibrate-pause-vibrate
    duplicate: [50, 50, 50]   // Pattern: short pulses
  },

  // Animation settings
  animations: {
    enabled: true,
    loadingDelay: 500  // Minimum loading time to prevent flashing
  },

  // QR Code parsing
  qrCodeFormat: {
    // Customize based on your QR code format
    prefix: '',           // e.g., 'YSC-' if QR codes are formatted as 'YSC-12345'
    extractPattern: null  // Regex pattern to extract ID from QR code
  }
};

/**
 * Get effective configuration with environment overrides
 */
export function getConfig() {
  return {
    ...scannerConfig,
    // Override useMockApi based on environment
    useMockApi: import.meta.env.DEV ? scannerConfig.useMockApi : false
  };
}
