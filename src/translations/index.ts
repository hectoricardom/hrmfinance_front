import enTranslations from './en';
import esTranslations from './es';
import { translationStore } from '../stores/translationStore';

// Initialize translations
translationStore.setTranslations({
  en: enTranslations,
  es: esTranslations
});

export { translationStore, useTranslation } from '../stores/translationStore';
export type { Language } from '../stores/translationStore';