// Language utilities for invoice generation
export type SupportedLanguage = 'en' | 'es';

// Get user's preferred language from various sources
export const getUserLanguage = (): SupportedLanguage => {
  // 1. Check localStorage for saved preference
  const savedLang = localStorage.getItem('userLanguage') as SupportedLanguage;
  if (savedLang && ['en', 'es'].includes(savedLang)) {
    return savedLang;
  }
  
  // 2. Check browser language
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('es')) {
    return 'es';
  }
  
  // 3. Default to Spanish for your customer base
  return 'es';
};

// Set user language preference
export const setUserLanguage = (language: SupportedLanguage): void => {
  localStorage.setItem('userLanguage', language);
};

// Language names for UI display
export const languageNames = {
  en: 'English',
  es: 'Español'
};