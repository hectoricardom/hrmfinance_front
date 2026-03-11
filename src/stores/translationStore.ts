import { createSignal } from 'solid-js';

export type Language = 'es' | 'en';

export interface TranslationData {
  [key: string]: string | TranslationData;
}

// Safe localStorage access
const getInitialLanguage = (): Language => {
  if (typeof window !== 'undefined') {
    const savedLanguage = localStorage.getItem('hrmfinance-language') as Language;
    if (savedLanguage && ['es', 'en'].includes(savedLanguage)) {
      return savedLanguage;
    }
  }
  return 'es';
};

const [currentLanguage, setCurrentLanguage] = createSignal<Language>(getInitialLanguage());
const [translations, setTranslations] = createSignal<Record<Language, TranslationData>>({
  en: {},
  es: {}
});

export const translationStore = {
  get language() {
    return currentLanguage();
  },
  
  get translations() {
    return translations();
  },
  
  setLanguage(language: Language) {
    setCurrentLanguage(language);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hrmfinance-language', language);
    }
  },
  
  setTranslations(newTranslations: Record<Language, TranslationData>) {
    setTranslations(newTranslations);
  },
  
  translate(key: string, fallback?: string): string {
    const lang = currentLanguage();
    const langTranslations = translations()[lang];
    
    if (!langTranslations) {
      return fallback || key;
    }
    
    const keys = key.split('.');
    let current: any = langTranslations;
    
    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        return fallback || key;
      }
    }
    
    return typeof current === 'string' ? current : fallback || key;
  },
  
  t(key: string, fallback?: string): string {
    return this.translate(key, fallback);
  }
};

// Hook for components
export const useTranslation = () => {
  return {
    t: translationStore.translate.bind(translationStore),
    language: translationStore.language,
    setLanguage: translationStore.setLanguage
  };
};