/**
 * Rule Draft Store
 *
 * Persists rule builder state to localStorage to prevent data loss
 * if something fails (browser crash, accidental navigation, etc.)
 */

import { createSignal, createEffect } from 'solid-js';
import { EventAutomationRule, CustomField } from '../types/eventTypes';

const STORAGE_KEY = 'hrm_rule_draft';
const STORAGE_VERSION = 1;

interface RuleDraft {
  version: number;
  timestamp: number;
  ruleId?: string; // If editing existing rule
  formData: Partial<EventAutomationRule>;
  customFields: CustomField[];
  activeLineIndex: number | null;
  showFieldAssistant: boolean;
  showCustomFields: boolean;
}

interface RuleDraftStore {
  // State
  hasDraft: () => boolean;
  draft: () => RuleDraft | null;
  lastSaved: () => Date | null;

  // Actions
  saveDraft: (data: Omit<RuleDraft, 'version' | 'timestamp'>) => void;
  loadDraft: () => RuleDraft | null;
  clearDraft: () => void;
  getDraftAge: () => string | null;
}

// Create signals for reactive state
const [draft, setDraft] = createSignal<RuleDraft | null>(null);
const [lastSaved, setLastSaved] = createSignal<Date | null>(null);

// Initialize from localStorage on load
const initializeFromStorage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as RuleDraft;
      // Check version compatibility
      if (parsed.version === STORAGE_VERSION) {
        setDraft(parsed);
        setLastSaved(new Date(parsed.timestamp));
        return parsed;
      } else {
        // Clear incompatible draft
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  } catch (error) {
    console.error('Error loading rule draft from localStorage:', error);
    localStorage.removeItem(STORAGE_KEY);
  }
  return null;
};

// Initialize on module load
initializeFromStorage();

// Save draft to localStorage
const saveDraft = (data: Omit<RuleDraft, 'version' | 'timestamp'>) => {
  try {
    const draftData: RuleDraft = {
      ...data,
      version: STORAGE_VERSION,
      timestamp: Date.now()
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(draftData));
    setDraft(draftData);
    setLastSaved(new Date());

    console.log('[RuleDraft] Draft saved at', new Date().toLocaleTimeString(), {
      name: data.formData.name,
      lines: data.formData.journalEntryTemplate?.lines?.length || 0,
      conditions: data.formData.conditions?.length || 0,
      customFields: data.customFields?.length || 0
    });
  } catch (error) {
    console.error('Error saving rule draft to localStorage:', error);
  }
};

// Load draft from localStorage
const loadDraft = (): RuleDraft | null => {
  return initializeFromStorage();
};

// Clear draft from localStorage
const clearDraft = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    setDraft(null);
    setLastSaved(null);
    console.log('[RuleDraft] Draft cleared');
  } catch (error) {
    console.error('Error clearing rule draft from localStorage:', error);
  }
};

// Get human-readable draft age
const getDraftAge = (): string | null => {
  const currentDraft = draft();
  if (!currentDraft) return null;

  const now = Date.now();
  const diff = now - currentDraft.timestamp;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (days > 0) return `${days} día${days > 1 ? 's' : ''}`;
  if (hours > 0) return `${hours} hora${hours > 1 ? 's' : ''}`;
  if (minutes > 0) return `${minutes} minuto${minutes > 1 ? 's' : ''}`;
  return 'hace un momento';
};

// Check if there's a valid draft
const hasDraft = (): boolean => {
  const currentDraft = draft();
  if (!currentDraft) return false;

  // Consider draft valid if it has meaningful data
  const hasName = !!currentDraft.formData.name;
  const hasConditions = (currentDraft.formData.conditions?.length || 0) > 0;
  const hasLines = (currentDraft.formData.journalEntryTemplate?.lines?.length || 0) > 0;
  const hasCustomFields = (currentDraft.customFields?.length || 0) > 0;

  return hasName || hasConditions || hasLines || hasCustomFields;
};

// Export store
export const ruleDraftStore: RuleDraftStore = {
  hasDraft,
  draft,
  lastSaved,
  saveDraft,
  loadDraft,
  clearDraft,
  getDraftAge
};

// Helper hook for auto-saving
export const createAutoSave = (
  getFormData: () => Partial<EventAutomationRule>,
  getCustomFields: () => CustomField[],
  getActiveLineIndex: () => number | null,
  getShowFieldAssistant: () => boolean,
  getShowCustomFields: () => boolean,
  ruleId?: string
) => {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const autoSave = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      ruleDraftStore.saveDraft({
        ruleId,
        formData: getFormData(),
        customFields: getCustomFields(),
        activeLineIndex: getActiveLineIndex(),
        showFieldAssistant: getShowFieldAssistant(),
        showCustomFields: getShowCustomFields()
      });
    }, 1000); // Debounce 1 second
  };

  return autoSave;
};

export default ruleDraftStore;
