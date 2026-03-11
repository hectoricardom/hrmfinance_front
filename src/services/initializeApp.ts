import { authStore } from '../stores/authStore';
import { apiAdapter } from './apiAdapter';
import { devLog, getCookie } from './utils';

// Initialize the application with proper API mode
export const initializeApp = async () => {
  // Ensure we start in fake mode for development
  if (import.meta.env.DEV) {
    //apiAdapter.setMode('fake');
    devLog('🛠️ HRM Finance initialized in FAKE API mode for development');
    devLog('📡 API Mode:', apiAdapter.getMode());
    devLog('🔧 Use the DevTools panel (🛠️ button) to switch API modes');
  } else {
    // In production, default to real mode
    //apiAdapter.setMode('real');
    devLog('🚀 HRM Finance initialized in REAL API mode for production');
  }
  apiAdapter.setMode('real');
  // Check for magic link session on app init


  const token = getCookie("ssgl_access_tkn");
  
  if (!(token && token.trim())) {
      await initializeMagicLinkSession();
  }
  
  
};

// Check for existing magic link session and restore it
export const initializeMagicLinkSession = async () => {
  try {
    // Dynamically import to avoid circular dependencies
    const { authStore } = await import('../stores/authStore');
    const { default: MagicLinkService } = await import('./magicLinkService');

    // Only check if no current user is authenticated
    if (!authStore.isAuthenticated) {
      const sessionToken = MagicLinkService.getSessionToken();

      if (sessionToken) {
        devLog('🔑 Found magic link session cookie, validating...');
        const isValid = await authStore.validateMagicLinkSession();

        if (isValid) {
          devLog('✅ Magic link session restored successfully');
        } else {
          devLog('❌ Magic link session invalid or expired');
        }
      }
    }
  } catch (error) {
    console.error('Error initializing magic link session:', error);
  }
};

// Auto-initialize when this module is imported
initializeApp();