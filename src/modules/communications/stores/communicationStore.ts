/**
 * Communication Store
 * SolidJS store for managing communication settings, templates, and message logs.
 * Uses createStore + createRoot singleton pattern.
 */

import { createRoot } from 'solid-js';
import { createStore } from 'solid-js/store';
import { devLog } from '../../../services/utils';
import type {
  CommunicationSettings,
  MessageLog,
  MessageTemplate,
  MessageStatus,
  MessageTriggerType,
  QuickMessage,
  TriggerConfig,
  BusinessHours,
} from '../types/communicationTypes';
import { whatsappService } from '../services/whatsappService';

// ============================================
// Store State Interface
// ============================================

interface CommunicationState {
  settings: CommunicationSettings | null;
  templates: MessageTemplate[];
  messageLogs: MessageLog[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  /** Filters for message log view */
  logFilters: {
    clientId: string | null;
    triggerType: MessageTriggerType | null;
    status: MessageStatus | null;
    channel: string | null;
    startDate: number | null;
    endDate: number | null;
  };
  /** Pagination for message logs */
  logPagination: {
    offset: number;
    limit: number;
    hasMore: boolean;
  };
}

// ============================================
// Default Settings
// ============================================

function getDefaultSettings(businessId: string): CommunicationSettings {
  return {
    id: `comm-settings-${businessId}`,
    businessId,
    autoMessagingEnabled: false,
    primaryChannel: 'whatsapp',
    fallbackChannel: 'email',
    businessHours: {
      enabled: true,
      startTime: '09:00',
      endTime: '18:00',
      timezone: 'America/New_York',
      activeDays: [1, 2, 3, 4, 5], // Monday to Friday
    },
    triggers: [
      { triggerType: 'document_received', enabled: true, templateId: '', delay: 'immediately', channel: 'whatsapp' },
      { triggerType: 'missing_docs', enabled: true, templateId: '', delay: '24hr', channel: 'whatsapp', conditions: { cooldownHours: 48 } },
      { triggerType: 'return_ready', enabled: true, templateId: '', delay: 'immediately', channel: 'whatsapp' },
      { triggerType: 'return_accepted', enabled: true, templateId: '', delay: 'immediately', channel: 'whatsapp' },
      { triggerType: 'return_rejected', enabled: true, templateId: '', delay: 'immediately', channel: 'whatsapp' },
      { triggerType: 'payment_due', enabled: true, templateId: '', delay: '1hr', channel: 'whatsapp', conditions: { cooldownHours: 72 } },
      { triggerType: 'status_change', enabled: false, templateId: '', delay: 'immediately', channel: 'whatsapp' },
      { triggerType: 'appointment_reminder', enabled: true, templateId: '', delay: '1hr', channel: 'whatsapp' },
      { triggerType: 'reminder', enabled: false, templateId: '', delay: '24hr', channel: 'whatsapp' },
    ],
    defaultLanguage: 'en',
    respectOptOut: true,
    businessName: '',
    businessPhone: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// ============================================
// Store Creation
// ============================================

function createCommunicationStore() {
  const [state, setState] = createStore<CommunicationState>({
    settings: null,
    templates: [],
    messageLogs: [],
    isLoading: false,
    isSending: false,
    error: null,
    logFilters: {
      clientId: null,
      triggerType: null,
      status: null,
      channel: null,
      startDate: null,
      endDate: null,
    },
    logPagination: {
      offset: 0,
      limit: 50,
      hasMore: false,
    },
  });

  // ==========================================
  // Settings Actions
  // ==========================================

  const loadSettings = async () => {
    setState('isLoading', true);
    setState('error', null);

    try {
      const settings = await whatsappService.getSettings();
      if (settings) {
        setState('settings', settings);
      } else {
        // Use defaults if no settings exist yet
        devLog('No communication settings found, using defaults');
      }
    } catch (error: any) {
      devLog('Failed to load communication settings:', error);
      setState('error', error?.message || 'Failed to load settings');
    } finally {
      setState('isLoading', false);
    }
  };

  const saveSettings = async (settings: CommunicationSettings) => {
    setState('isLoading', true);
    setState('error', null);

    try {
      const updated = { ...settings, updatedAt: Date.now() };
      await whatsappService.saveSettings(updated);
      setState('settings', updated);
      devLog('Communication settings saved');
    } catch (error: any) {
      devLog('Failed to save communication settings:', error);
      setState('error', error?.message || 'Failed to save settings');
    } finally {
      setState('isLoading', false);
    }
  };

  const initializeSettings = (businessId: string) => {
    if (!state.settings) {
      setState('settings', getDefaultSettings(businessId));
    }
  };

  const updateSettingsField = <K extends keyof CommunicationSettings>(
    field: K,
    value: CommunicationSettings[K]
  ) => {
    if (!state.settings) return;
    setState('settings', field, value as any);
  };

  const updateBusinessHours = (hours: Partial<BusinessHours>) => {
    if (!state.settings) return;
    setState('settings', 'businessHours', { ...state.settings.businessHours, ...hours });
  };

  const updateTriggerConfig = (triggerType: MessageTriggerType, updates: Partial<TriggerConfig>) => {
    if (!state.settings) return;
    setState(
      'settings',
      'triggers',
      (t: TriggerConfig) => t.triggerType === triggerType,
      (existing: TriggerConfig) => ({ ...existing, ...updates })
    );
  };

  // ==========================================
  // Template Actions
  // ==========================================

  const loadTemplates = async () => {
    setState('isLoading', true);

    try {
      const templates = await whatsappService.getTemplates();
      setState('templates', templates);
    } catch (error: any) {
      devLog('Failed to load templates:', error);
      setState('error', error?.message || 'Failed to load templates');
    } finally {
      setState('isLoading', false);
    }
  };

  const saveTemplate = async (template: MessageTemplate) => {
    setState('isLoading', true);

    try {
      const updated = { ...template, updatedAt: Date.now() };
      await whatsappService.saveTemplate(updated);

      // Update local state
      setState('templates', (templates) => {
        const idx = templates.findIndex((t) => t.id === updated.id);
        if (idx >= 0) {
          return [...templates.slice(0, idx), updated, ...templates.slice(idx + 1)];
        }
        return [...templates, updated];
      });
    } catch (error: any) {
      devLog('Failed to save template:', error);
      setState('error', error?.message || 'Failed to save template');
    } finally {
      setState('isLoading', false);
    }
  };

  const deleteTemplate = (templateId: string) => {
    setState('templates', (templates) => templates.filter((t) => t.id !== templateId));
  };

  // ==========================================
  // Message Log Actions
  // ==========================================

  const loadMessageLogs = async (resetPagination = true) => {
    setState('isLoading', true);

    if (resetPagination) {
      setState('logPagination', 'offset', 0);
    }

    try {
      const filters: Record<string, any> = {
        limit: state.logPagination.limit,
        offset: state.logPagination.offset,
      };

      if (state.logFilters.clientId) filters.clientId = state.logFilters.clientId;
      if (state.logFilters.triggerType) filters.triggerType = state.logFilters.triggerType;
      if (state.logFilters.status) filters.status = state.logFilters.status;
      if (state.logFilters.channel) filters.channel = state.logFilters.channel;
      if (state.logFilters.startDate) filters.startDate = state.logFilters.startDate;
      if (state.logFilters.endDate) filters.endDate = state.logFilters.endDate;

      const logs = await whatsappService.getMessageLogs(filters);

      if (resetPagination) {
        setState('messageLogs', logs);
      } else {
        // Append for infinite scroll
        setState('messageLogs', (existing) => [...existing, ...logs]);
      }

      setState('logPagination', 'hasMore', logs.length >= state.logPagination.limit);
    } catch (error: any) {
      devLog('Failed to load message logs:', error);
      setState('error', error?.message || 'Failed to load message logs');
    } finally {
      setState('isLoading', false);
    }
  };

  const loadMoreLogs = async () => {
    setState('logPagination', 'offset', state.logPagination.offset + state.logPagination.limit);
    await loadMessageLogs(false);
  };

  const setLogFilter = <K extends keyof CommunicationState['logFilters']>(
    field: K,
    value: CommunicationState['logFilters'][K]
  ) => {
    setState('logFilters', field, value);
  };

  const clearLogFilters = () => {
    setState('logFilters', {
      clientId: null,
      triggerType: null,
      status: null,
      channel: null,
      startDate: null,
      endDate: null,
    });
  };

  // ==========================================
  // Send Message Actions
  // ==========================================

  const sendQuickMessage = async (message: QuickMessage): Promise<MessageLog | null> => {
    setState('isSending', true);
    setState('error', null);

    try {
      const result = await whatsappService.sendQuickMessage(message);

      if (result) {
        // Add to local message logs
        setState('messageLogs', (logs) => [result, ...logs]);
        devLog('Quick message sent successfully');
      }

      return result;
    } catch (error: any) {
      devLog('Failed to send quick message:', error);
      setState('error', error?.message || 'Failed to send message');
      return null;
    } finally {
      setState('isSending', false);
    }
  };

  const resendMessage = async (messageLog: MessageLog): Promise<MessageLog | null> => {
    setState('isSending', true);
    setState('error', null);

    try {
      const result = await whatsappService.resendMessage(messageLog);

      if (result) {
        setState('messageLogs', (logs) => [result, ...logs]);
        devLog('Message resent successfully');
      }

      return result;
    } catch (error: any) {
      devLog('Failed to resend message:', error);
      setState('error', error?.message || 'Failed to resend message');
      return null;
    } finally {
      setState('isSending', false);
    }
  };

  // ==========================================
  // Utility
  // ==========================================

  const clearError = () => {
    setState('error', null);
  };

  const getTemplateForTrigger = (triggerType: MessageTriggerType): MessageTemplate | undefined => {
    const config = state.settings?.triggers.find((t) => t.triggerType === triggerType);
    if (!config?.templateId) return undefined;
    return state.templates.find((t) => t.id === config.templateId);
  };

  return {
    // State (read-only access)
    state,

    // Settings
    loadSettings,
    saveSettings,
    initializeSettings,
    updateSettingsField,
    updateBusinessHours,
    updateTriggerConfig,

    // Templates
    loadTemplates,
    saveTemplate,
    deleteTemplate,
    getTemplateForTrigger,

    // Message Logs
    loadMessageLogs,
    loadMoreLogs,
    setLogFilter,
    clearLogFilters,

    // Send Messages
    sendQuickMessage,
    resendMessage,

    // Utility
    clearError,
  };
}

// Create singleton store
export const communicationStore = createRoot(createCommunicationStore);
