/**
 * WhatsApp Service
 * Handles sending WhatsApp messages via the server-side WhatsApp integration.
 * All actual WhatsApp API calls are handled server-side via GraphQL queries.
 */

import { devLog, fetchGraphQLSS } from '../../../services/utils';
import { authStore } from '../../../stores/authStore';
import type {
  CommunicationSettings,
  MessageLog,
  MessageStatus,
  MessageTemplate,
  QuickMessage,
} from '../types/communicationTypes';
import type { TaxPortal } from '../../drake-export/types/drakeTypes';

// ============================================
// Phone Number Formatting
// ============================================

/**
 * Format a phone number for WhatsApp.
 * WhatsApp requires numbers in E.164 format: +[country code][number]
 * Strips non-digits, adds +1 if no country code present (US default).
 */
export function formatPhoneForWhatsApp(phone: string): string {
  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, '');

  // If empty, return empty
  if (!digits) return '';

  // If number starts with 1 and has 11 digits, it already has US country code
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  // If 10 digits, assume US and prepend +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // If already has a plus or is longer (international), just add +
  if (digits.length > 10) {
    return `+${digits}`;
  }

  // Return as-is with + prefix for shorter numbers (may be invalid)
  return `+${digits}`;
}

/**
 * Validate a phone number for WhatsApp messaging.
 * Returns true if the number appears valid (at least 10 digits).
 */
export function isValidWhatsAppNumber(phone: string): boolean {
  const formatted = formatPhoneForWhatsApp(phone);
  // Must have at least +1 and 10 digits
  const digits = formatted.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

// ============================================
// Template Variable Replacement
// ============================================

/** Variables that can be interpolated into message templates */
export interface TemplateVariables {
  clientName?: string;
  firstName?: string;
  lastName?: string;
  taxYear?: string | number;
  documentType?: string;
  documentList?: string;
  newStatus?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  amountDue?: string;
  businessName?: string;
  businessPhone?: string;
  refundAmount?: string;
  portalLink?: string;
}

/**
 * Replace {{placeholder}} variables in a template body with actual values.
 */
export function replaceTemplateVariables(template: string, variables: TemplateVariables): string {
  let result = template;

  const replacements: Record<string, string | undefined> = {
    '{{clientName}}': variables.clientName,
    '{{firstName}}': variables.firstName,
    '{{lastName}}': variables.lastName,
    '{{taxYear}}': variables.taxYear?.toString(),
    '{{documentType}}': variables.documentType,
    '{{documentList}}': variables.documentList,
    '{{newStatus}}': variables.newStatus,
    '{{appointmentDate}}': variables.appointmentDate,
    '{{appointmentTime}}': variables.appointmentTime,
    '{{amountDue}}': variables.amountDue,
    '{{businessName}}': variables.businessName,
    '{{businessPhone}}': variables.businessPhone,
    '{{refundAmount}}': variables.refundAmount,
    '{{portalLink}}': variables.portalLink,
  };

  for (const [placeholder, value] of Object.entries(replacements)) {
    if (value !== undefined) {
      result = result.split(placeholder).join(value);
    }
  }

  return result;
}

/**
 * Build template variables from a TaxPortal client record.
 */
export function buildVariablesFromClient(
  client: TaxPortal,
  businessName: string,
  businessPhone: string,
  extras?: Partial<TemplateVariables>
): TemplateVariables {
  return {
    clientName: `${client.firstName} ${client.lastName}`,
    firstName: client.firstName,
    lastName: client.lastName,
    taxYear: client.taxYear?.toString() || new Date().getFullYear().toString(),
    businessName,
    businessPhone,
    refundAmount: client.totalRefund
      ? `Your expected refund is $${client.totalRefund.toLocaleString()}.`
      : '',
    amountDue: client.paymentAmount
      ? `$${client.paymentAmount.toLocaleString()}`
      : '',
    ...extras,
  };
}

// ============================================
// Generate Message Log ID
// ============================================

function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// WhatsApp Service Class
// ============================================

class WhatsAppService {
  /**
   * Send a WhatsApp message to a phone number.
   * The server handles the actual WhatsApp Business API integration.
   */
  async sendWhatsAppMessage(
    phone: string,
    body: string,
    clientId: string,
    clientName: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const formattedPhone = formatPhoneForWhatsApp(phone);

    if (!isValidWhatsAppNumber(phone)) {
      return { success: false, error: 'Invalid phone number' };
    }

    try {
      // TODO: Create server query "sendWhatsAppMessage"
      const response = await fetchGraphQLSS({
        query: 'sendWhatsAppMessage',
        params: {
          businessId: authStore.getBusinessId(),
          phone: formattedPhone,
          message: body,
          clientId,
          clientName,
        },
      });

      devLog('WhatsApp message sent:', { phone: formattedPhone, clientId });

      return {
        success: true,
        messageId: response?.data?.messageId || generateMessageId(),
      };
    } catch (error: any) {
      devLog('WhatsApp send error:', error);
      return {
        success: false,
        error: error?.message || 'Failed to send WhatsApp message',
      };
    }
  }

  /**
   * Send a template-based WhatsApp message with variable replacement.
   */
  async sendTemplateMessage(
    template: MessageTemplate,
    client: TaxPortal,
    language: 'en' | 'es',
    variables: TemplateVariables
  ): Promise<MessageLog | null> {
    const phone = client.phone;
    if (!phone) {
      devLog('Cannot send template message: client has no phone number', client.id);
      return null;
    }

    const templateBody = language === 'es' ? template.bodyEs : template.bodyEn;
    const renderedBody = replaceTemplateVariables(templateBody, variables);

    const result = await this.sendWhatsAppMessage(
      phone,
      renderedBody,
      client.id,
      `${client.firstName} ${client.lastName}`
    );

    const messageLog: MessageLog = {
      id: generateMessageId(),
      clientId: client.id,
      clientName: `${client.firstName} ${client.lastName}`,
      clientPhone: formatPhoneForWhatsApp(phone),
      clientEmail: client.email,
      channel: 'whatsapp',
      triggerType: template.triggerType,
      templateId: template.id,
      body: renderedBody,
      language,
      status: result.success ? 'sent' : 'failed',
      externalId: result.messageId,
      errorMessage: result.error,
      sentAt: Date.now(),
      sentBy: authStore.state?.user?.uid || 'system',
    };

    // Log the sent message to the server
    await this.logMessage(messageLog);

    return messageLog;
  }

  /**
   * Send a quick/freeform message (not template-based).
   */
  async sendQuickMessage(message: QuickMessage): Promise<MessageLog | null> {
    if (message.channel === 'whatsapp') {
      if (!message.phone) {
        devLog('Cannot send quick message: no phone number');
        return null;
      }

      const result = await this.sendWhatsAppMessage(
        message.phone,
        message.body,
        message.clientId,
        message.clientName
      );

      const messageLog: MessageLog = {
        id: generateMessageId(),
        clientId: message.clientId,
        clientName: message.clientName,
        clientPhone: formatPhoneForWhatsApp(message.phone),
        clientEmail: message.email,
        channel: 'whatsapp',
        triggerType: null,
        templateId: message.templateId || null,
        body: message.body,
        language: message.language,
        status: result.success ? 'sent' : 'failed',
        externalId: result.messageId,
        errorMessage: result.error,
        sentAt: Date.now(),
        sentBy: authStore.state?.user?.uid || 'system',
      };

      await this.logMessage(messageLog);
      return messageLog;
    }

    // Email channel
    return this.sendEmailMessage(message);
  }

  /**
   * Send an email message (fallback channel).
   */
  async sendEmailMessage(message: QuickMessage): Promise<MessageLog | null> {
    if (!message.email) {
      devLog('Cannot send email: no email address');
      return null;
    }

    try {
      // TODO: Create server query "sendEmailMessage"
      const response = await fetchGraphQLSS({
        query: 'sendEmailMessage',
        params: {
          businessId: authStore.getBusinessId(),
          email: message.email,
          subject: `Message from ${message.clientName}`,
          body: message.body,
          clientId: message.clientId,
        },
      });

      const messageLog: MessageLog = {
        id: generateMessageId(),
        clientId: message.clientId,
        clientName: message.clientName,
        clientPhone: message.phone ? formatPhoneForWhatsApp(message.phone) : undefined,
        clientEmail: message.email,
        channel: 'email',
        triggerType: null,
        templateId: message.templateId || null,
        body: message.body,
        language: message.language,
        status: 'sent',
        externalId: response?.data?.messageId,
        sentAt: Date.now(),
        sentBy: authStore.state?.user?.uid || 'system',
      };

      await this.logMessage(messageLog);
      return messageLog;
    } catch (error: any) {
      devLog('Email send error:', error);
      return null;
    }
  }

  /**
   * Get delivery status for a sent message from the server.
   */
  async getMessageStatus(messageId: string): Promise<MessageStatus> {
    try {
      // TODO: Create server query "getWhatsAppMessageStatus"
      const response = await fetchGraphQLSS({
        query: 'getWhatsAppMessageStatus',
        params: {
          businessId: authStore.getBusinessId(),
          messageId,
        },
      });

      return response?.data?.status || 'pending';
    } catch (error) {
      devLog('Get message status error:', error);
      return 'pending';
    }
  }

  /**
   * Log a sent message to the server for history tracking.
   */
  async logMessage(messageLog: MessageLog): Promise<void> {
    try {
      // TODO: Create server query "logCommunicationMessage"
      await fetchGraphQLSS({
        query: 'logCommunicationMessage',
        params: {
          businessId: authStore.getBusinessId(),
          ...messageLog,
        },
      });

      devLog('Message logged:', messageLog.id);
    } catch (error) {
      devLog('Failed to log message:', error);
    }
  }

  /**
   * Get message logs, optionally filtered by client, date range, or trigger type.
   */
  async getMessageLogs(filters?: {
    clientId?: string;
    startDate?: number;
    endDate?: number;
    triggerType?: string;
    status?: MessageStatus;
    channel?: string;
    limit?: number;
    offset?: number;
  }): Promise<MessageLog[]> {
    try {
      // TODO: Create server query "getCommunicationLogs"
      const response = await fetchGraphQLSS({
        query: 'getCommunicationLogs',
        params: {
          businessId: authStore.getBusinessId(),
          ...(filters || {}),
        },
      });

      return response?.data || [];
    } catch (error) {
      devLog('Get message logs error:', error);
      return [];
    }
  }

  /**
   * Resend a previously failed message.
   */
  async resendMessage(messageLog: MessageLog): Promise<MessageLog | null> {
    const quickMessage: QuickMessage = {
      clientId: messageLog.clientId,
      clientName: messageLog.clientName,
      phone: messageLog.clientPhone || '',
      email: messageLog.clientEmail,
      channel: messageLog.channel,
      body: messageLog.body,
      language: messageLog.language,
      templateId: messageLog.templateId || undefined,
    };

    return this.sendQuickMessage(quickMessage);
  }

  /**
   * Load saved message templates from the server.
   */
  async getTemplates(): Promise<MessageTemplate[]> {
    try {
      // TODO: Create server query "getCommunicationTemplates"
      const response = await fetchGraphQLSS({
        query: 'getCommunicationTemplates',
        params: {
          businessId: authStore.getBusinessId(),
        },
      });

      return response?.data || [];
    } catch (error) {
      devLog('Get templates error:', error);
      return [];
    }
  }

  /**
   * Save or update a message template.
   */
  async saveTemplate(template: MessageTemplate): Promise<void> {
    try {
      // TODO: Create server query "saveCommunicationTemplate"
      await fetchGraphQLSS({
        query: 'saveCommunicationTemplate',
        params: {
          businessId: authStore.getBusinessId(),
          ...template,
        },
      });

      devLog('Template saved:', template.id);
    } catch (error) {
      devLog('Save template error:', error);
    }
  }

  /**
   * Load communication settings from the server.
   */
  async getSettings(): Promise<CommunicationSettings | null> {
    try {
      // TODO: Create server query "getCommunicationSettings"
      const response = await fetchGraphQLSS({
        query: 'getCommunicationSettings',
        params: {
          businessId: authStore.getBusinessId(),
        },
      });

      return response?.data || null;
    } catch (error) {
      devLog('Get settings error:', error);
      return null;
    }
  }

  /**
   * Save communication settings to the server.
   */
  async saveSettings(settings: CommunicationSettings): Promise<void> {
    try {
      // TODO: Create server query "saveCommunicationSettings"
      await fetchGraphQLSS({
        query: 'saveCommunicationSettings',
        params: {
          businessId: authStore.getBusinessId(),
          ...settings,
        },
      });

      devLog('Settings saved');
    } catch (error) {
      devLog('Save settings error:', error);
    }
  }
}

/** Singleton instance */
export const whatsappService = new WhatsAppService();
