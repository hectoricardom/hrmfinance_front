/**
 * Auto Trigger Service
 * Handles automatic message triggers based on client events.
 * Evaluates conditions, respects business hours and opt-out settings,
 * and dispatches messages via the WhatsApp service.
 */

import { devLog } from '../../../services/utils';
import type {
  CommunicationSettings,
  MessageLog,
  MessageTemplate,
  MessageTriggerType,
  TriggerConfig,
} from '../types/communicationTypes';
import type { TaxPortal, TaxWorkflowStatus } from '../../drake-export/types/drakeTypes';
import { TAX_WORKFLOW_STATUS_LABELS } from '../../drake-export/types/drakeTypes';
import {
  whatsappService,
  buildVariablesFromClient,
  replaceTemplateVariables,
  type TemplateVariables,
} from './whatsappService';

// ============================================
// Trigger Condition Definitions
// ============================================

/** Context data provided when evaluating a trigger */
export interface TriggerContext {
  client: TaxPortal;
  /** The trigger type being evaluated */
  triggerType: MessageTriggerType;
  /** Additional data depending on trigger type */
  documentType?: string;
  documentList?: string[];
  newStatus?: TaxWorkflowStatus;
  appointmentDate?: string;
  appointmentTime?: string;
  /** Recent message logs to check cooldowns */
  recentMessages?: MessageLog[];
}

/** Result of evaluating whether a trigger should fire */
export interface TriggerEvaluation {
  shouldFire: boolean;
  reason?: string;
  delayMs?: number;
}

// ============================================
// Auto Trigger Service Class
// ============================================

class AutoTriggerService {
  /**
   * Evaluate whether a trigger should fire for a given context.
   * Checks: master toggle, trigger enabled, business hours, opt-out, cooldown.
   */
  evaluateTrigger(
    settings: CommunicationSettings,
    triggerContext: TriggerContext
  ): TriggerEvaluation {
    // Check master toggle
    if (!settings.autoMessagingEnabled) {
      return { shouldFire: false, reason: 'Auto-messaging is disabled' };
    }

    // Find trigger config
    const triggerConfig = settings.triggers.find(
      (t) => t.triggerType === triggerContext.triggerType
    );

    if (!triggerConfig) {
      return { shouldFire: false, reason: 'Trigger not configured' };
    }

    if (!triggerConfig.enabled) {
      return { shouldFire: false, reason: 'Trigger is disabled' };
    }

    // Check opt-out
    if (settings.respectOptOut && this.isClientOptedOut(triggerContext.client)) {
      return { shouldFire: false, reason: 'Client has opted out' };
    }

    // Check client has phone number
    if (!triggerContext.client.phone) {
      return { shouldFire: false, reason: 'Client has no phone number' };
    }

    // Check workflow status conditions
    if (triggerConfig.conditions?.workflowStatuses?.length) {
      const clientStatus = triggerContext.client.workflowStatus;
      if (clientStatus && !triggerConfig.conditions.workflowStatuses.includes(clientStatus)) {
        return {
          shouldFire: false,
          reason: `Client workflow status "${clientStatus}" not in allowed statuses`,
        };
      }
    }

    // Check cooldown
    if (triggerConfig.conditions?.cooldownHours && triggerContext.recentMessages?.length) {
      const cooldownMs = triggerConfig.conditions.cooldownHours * 60 * 60 * 1000;
      const lastMessage = triggerContext.recentMessages
        .filter((m) => m.clientId === triggerContext.client.id)
        .sort((a, b) => b.sentAt - a.sentAt)[0];

      if (lastMessage && Date.now() - lastMessage.sentAt < cooldownMs) {
        return {
          shouldFire: false,
          reason: `Cooldown active: last message sent ${Math.round(
            (Date.now() - lastMessage.sentAt) / 3600000
          )}h ago`,
        };
      }
    }

    // Check business hours
    if (!this.isWithinBusinessHours(settings)) {
      // Calculate delay until next business hours window
      const delayMs = this.getDelayUntilBusinessHours(settings);
      return {
        shouldFire: true,
        reason: 'Outside business hours - will be delayed',
        delayMs,
      };
    }

    // Calculate trigger delay
    const delayMs = this.getTriggerDelayMs(triggerConfig);

    return {
      shouldFire: true,
      delayMs: delayMs > 0 ? delayMs : undefined,
    };
  }

  /**
   * Execute a trigger: resolve the template, render variables, send the message.
   */
  async executeTrigger(
    settings: CommunicationSettings,
    triggerContext: TriggerContext,
    templates: MessageTemplate[]
  ): Promise<MessageLog | null> {
    const evaluation = this.evaluateTrigger(settings, triggerContext);

    if (!evaluation.shouldFire) {
      devLog('Trigger not firing:', triggerContext.triggerType, evaluation.reason);
      return null;
    }

    // If there's a delay, schedule it (in production, this would use a job queue)
    if (evaluation.delayMs && evaluation.delayMs > 0) {
      devLog(
        `Trigger "${triggerContext.triggerType}" delayed by ${Math.round(
          evaluation.delayMs / 60000
        )} minutes`
      );
      // In production, this would enqueue for later execution.
      // For now, we still send but log the intended delay.
    }

    // Find the trigger config
    const triggerConfig = settings.triggers.find(
      (t) => t.triggerType === triggerContext.triggerType
    );
    if (!triggerConfig) return null;

    // Find the template
    const template = templates.find((t) => t.id === triggerConfig.templateId);
    if (!template) {
      devLog('Template not found for trigger:', triggerConfig.templateId);
      return null;
    }

    // Build variables
    const variables = this.buildTriggerVariables(triggerContext, settings);

    // Send via whatsapp service
    const messageLog = await whatsappService.sendTemplateMessage(
      template,
      triggerContext.client,
      settings.defaultLanguage,
      variables
    );

    if (messageLog) {
      devLog('Trigger executed:', triggerContext.triggerType, 'for client:', triggerContext.client.id);
    }

    return messageLog;
  }

  /**
   * Build template variables from trigger context.
   */
  buildTriggerVariables(
    context: TriggerContext,
    settings: CommunicationSettings
  ): TemplateVariables {
    const baseVars = buildVariablesFromClient(
      context.client,
      settings.businessName,
      settings.businessPhone
    );

    const extraVars: Partial<TemplateVariables> = {};

    switch (context.triggerType) {
      case 'document_received':
        extraVars.documentType = context.documentType || 'document';
        break;

      case 'missing_docs':
        extraVars.documentList = context.documentList?.join(', ') || 'pending documents';
        break;

      case 'status_change':
        extraVars.newStatus = context.newStatus
          ? TAX_WORKFLOW_STATUS_LABELS[context.newStatus] || context.newStatus
          : 'updated';
        break;

      case 'appointment_reminder':
        extraVars.appointmentDate = context.appointmentDate || '';
        extraVars.appointmentTime = context.appointmentTime || '';
        break;

      case 'return_accepted':
        extraVars.refundAmount = context.client.totalRefund
          ? `Your expected refund is $${context.client.totalRefund.toLocaleString()}.`
          : '';
        break;

      case 'payment_due':
        extraVars.amountDue = context.client.paymentAmount
          ? `$${context.client.paymentAmount.toLocaleString()}`
          : '';
        break;

      default:
        break;
    }

    return { ...baseVars, ...extraVars };
  }

  /**
   * Get all pending triggers for a client based on their current state.
   * Useful for showing what messages would be sent if auto-messaging is on.
   */
  getPendingTriggers(
    client: TaxPortal,
    settings: CommunicationSettings,
    templates: MessageTemplate[]
  ): Array<{
    triggerType: MessageTriggerType;
    templateName: string;
    previewBody: string;
    language: 'en' | 'es';
  }> {
    const pending: Array<{
      triggerType: MessageTriggerType;
      templateName: string;
      previewBody: string;
      language: 'en' | 'es';
    }> = [];

    if (!settings.autoMessagingEnabled) return pending;

    for (const triggerConfig of settings.triggers) {
      if (!triggerConfig.enabled) continue;

      const template = templates.find((t) => t.id === triggerConfig.templateId);
      if (!template) continue;

      // Check if this trigger type is relevant based on client status
      const isRelevant = this.isTriggerRelevantForClient(triggerConfig.triggerType, client);
      if (!isRelevant) continue;

      const variables = buildVariablesFromClient(
        client,
        settings.businessName,
        settings.businessPhone
      );

      const templateBody =
        settings.defaultLanguage === 'es' ? template.bodyEs : template.bodyEn;
      const preview = replaceTemplateVariables(templateBody, variables);

      pending.push({
        triggerType: triggerConfig.triggerType,
        templateName: template.name,
        previewBody: preview,
        language: settings.defaultLanguage,
      });
    }

    return pending;
  }

  /**
   * Check if a trigger type is currently relevant for a client.
   */
  private isTriggerRelevantForClient(
    triggerType: MessageTriggerType,
    client: TaxPortal
  ): boolean {
    switch (triggerType) {
      case 'missing_docs':
        return client.workflowStatus === 'collecting_docs' || client.workflowStatus === 'waiting_client';
      case 'return_ready':
        return client.workflowStatus === 'ready_to_file';
      case 'return_accepted':
        return client.workflowStatus === 'accepted';
      case 'return_rejected':
        return client.workflowStatus === 'rejected';
      case 'payment_due':
        return client.paymentStatus === 'pending' || client.paymentStatus === 'partial';
      case 'status_change':
        return true; // Always relevant when status actually changes
      case 'document_received':
        return true; // Always relevant when a document is received
      case 'appointment_reminder':
        return true; // Relevant if there's an upcoming appointment
      case 'reminder':
        return true;
      default:
        return false;
    }
  }

  /**
   * Check if the client has opted out of messaging.
   */
  private isClientOptedOut(_client: TaxPortal): boolean {
    // In a real implementation, check an opt-out flag on the client record
    // For now, we default to not opted out
    return false;
  }

  /**
   * Check if current time is within configured business hours.
   */
  isWithinBusinessHours(settings: CommunicationSettings): boolean {
    if (!settings.businessHours.enabled) return true;

    const now = new Date();

    // Check day of week
    const dayOfWeek = now.getDay();
    if (!settings.businessHours.activeDays.includes(dayOfWeek)) {
      return false;
    }

    // Parse start and end times
    const [startH, startM] = settings.businessHours.startTime.split(':').map(Number);
    const [endH, endM] = settings.businessHours.endTime.split(':').map(Number);

    // Get current hours/minutes (using local time - in production, convert to configured timezone)
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }

  /**
   * Calculate milliseconds until the next business hours window.
   */
  private getDelayUntilBusinessHours(settings: CommunicationSettings): number {
    if (!settings.businessHours.enabled) return 0;

    const now = new Date();
    const [startH, startM] = settings.businessHours.startTime.split(':').map(Number);

    // Try today first
    const todayStart = new Date(now);
    todayStart.setHours(startH, startM, 0, 0);

    if (todayStart > now && settings.businessHours.activeDays.includes(now.getDay())) {
      return todayStart.getTime() - now.getTime();
    }

    // Find next active day
    for (let i = 1; i <= 7; i++) {
      const nextDay = new Date(now);
      nextDay.setDate(nextDay.getDate() + i);
      nextDay.setHours(startH, startM, 0, 0);

      if (settings.businessHours.activeDays.includes(nextDay.getDay())) {
        return nextDay.getTime() - now.getTime();
      }
    }

    // Fallback: delay 24 hours
    return 24 * 60 * 60 * 1000;
  }

  /**
   * Convert trigger delay setting to milliseconds.
   */
  private getTriggerDelayMs(triggerConfig: TriggerConfig): number {
    switch (triggerConfig.delay) {
      case 'immediately':
        return 0;
      case '1hr':
        return 60 * 60 * 1000;
      case '24hr':
        return 24 * 60 * 60 * 1000;
      default:
        return 0;
    }
  }

  /**
   * Preview a trigger message without sending it.
   */
  previewTriggerMessage(
    template: MessageTemplate,
    client: TaxPortal,
    settings: CommunicationSettings,
    language: 'en' | 'es',
    extras?: Partial<TemplateVariables>
  ): string {
    const variables = buildVariablesFromClient(
      client,
      settings.businessName,
      settings.businessPhone,
      extras
    );

    const templateBody = language === 'es' ? template.bodyEs : template.bodyEn;
    return replaceTemplateVariables(templateBody, variables);
  }
}

/** Singleton instance */
export const autoTriggerService = new AutoTriggerService();
