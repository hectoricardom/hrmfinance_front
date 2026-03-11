/**
 * Communications Module
 * WhatsApp and Email messaging for tax clients.
 */

// Types
export type {
  MessageChannel,
  MessageStatus,
  MessageTriggerType,
  TriggerDelay,
  TriggerConfig,
  MessageTemplate,
  MessageLog,
  QuickMessage,
  BusinessHours,
  CommunicationSettings,
} from './types/communicationTypes';

export {
  MESSAGE_STATUS_COLORS,
  MESSAGE_STATUS_LABELS,
  TRIGGER_TYPE_LABELS,
  TRIGGER_DELAY_LABELS,
  DEFAULT_TEMPLATES,
} from './types/communicationTypes';

// Services
export {
  whatsappService,
  formatPhoneForWhatsApp,
  isValidWhatsAppNumber,
  replaceTemplateVariables,
  buildVariablesFromClient,
} from './services/whatsappService';
export type { TemplateVariables } from './services/whatsappService';

export { autoTriggerService } from './services/autoTriggerService';
export type { TriggerContext, TriggerEvaluation } from './services/autoTriggerService';

// Store
export { communicationStore } from './stores/communicationStore';

// Components
export { default as MessagingSettingsPage } from './components/MessagingSettingsPage';
export { default as MessageLogView } from './components/MessageLogView';
export { default as QuickMessageModal } from './components/QuickMessageModal';
export { default as MessageHistoryPanel } from './components/MessageHistoryPanel';
