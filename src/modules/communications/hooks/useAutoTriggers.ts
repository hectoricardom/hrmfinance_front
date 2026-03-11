/**
 * useAutoTriggers Hook
 * Lightweight helper to evaluate auto-triggers, show a preview, and send/dismiss.
 * Uses existing autoTriggerService + communicationStore.
 */

import { createSignal } from 'solid-js';
import { devLog } from '../../../services/utils';
import { autoTriggerService, type TriggerContext } from '../services/autoTriggerService';
import { communicationStore } from '../stores/communicationStore';
import type { MessageTriggerType, MessageTemplate } from '../types/communicationTypes';
import type { TaxPortal } from '../../drake-export/types/drakeTypes';
import type { MessageLog } from '../types/communicationTypes';

export interface PendingTrigger {
  triggerType: MessageTriggerType;
  templateName: string;
  previewBody: string;
  triggerContext: TriggerContext;
  template: MessageTemplate;
}

export function createAutoTriggerHelper() {
  const [pendingTrigger, setPendingTrigger] = createSignal<PendingTrigger | null>(null);
  const [isSending, setIsSending] = createSignal(false);
  const [lastResult, setLastResult] = createSignal<MessageLog | null>(null);

  /**
   * Evaluate whether an event should fire a trigger.
   * If it should, sets pendingTrigger with a preview for the user to confirm.
   */
  const evaluateEvent = (
    triggerType: MessageTriggerType,
    client: TaxPortal,
    extras?: Partial<TriggerContext>
  ) => {
    const settings = communicationStore.state.settings;
    const templates = communicationStore.state.templates;

    if (!settings) {
      devLog('[AutoTrigger] No settings loaded, skipping evaluation');
      return;
    }

    const triggerContext: TriggerContext = {
      client,
      triggerType,
      ...extras,
    };

    const evaluation = autoTriggerService.evaluateTrigger(settings, triggerContext);

    if (!evaluation.shouldFire) {
      devLog('[AutoTrigger] Trigger will not fire:', triggerType, evaluation.reason);
      return;
    }

    // Find the trigger config and template
    const triggerConfig = settings.triggers.find(t => t.triggerType === triggerType);
    if (!triggerConfig) return;

    const template = templates.find(t => t.id === triggerConfig.templateId);
    if (!template) {
      devLog('[AutoTrigger] No template found for trigger:', triggerType);
      return;
    }

    // Generate preview
    const preview = autoTriggerService.previewTriggerMessage(
      template,
      client,
      settings,
      settings.defaultLanguage,
    );

    setPendingTrigger({
      triggerType,
      templateName: template.name,
      previewBody: preview,
      triggerContext,
      template,
    });

    devLog('[AutoTrigger] Pending trigger set:', triggerType, template.name);
  };

  /**
   * Execute the pending trigger (send the message).
   */
  const executePending = async () => {
    const pending = pendingTrigger();
    if (!pending) return;

    const settings = communicationStore.state.settings;
    const templates = communicationStore.state.templates;
    if (!settings) return;

    setIsSending(true);
    try {
      const result = await autoTriggerService.executeTrigger(
        settings,
        pending.triggerContext,
        templates
      );
      setLastResult(result);
      setPendingTrigger(null);
      devLog('[AutoTrigger] Message sent successfully');
    } catch (err) {
      devLog('[AutoTrigger] Error sending message:', err);
    } finally {
      setIsSending(false);
    }
  };

  /**
   * Dismiss the pending trigger without sending.
   */
  const dismissPending = () => {
    setPendingTrigger(null);
  };

  return {
    pendingTrigger,
    isSending,
    lastResult,
    evaluateEvent,
    executePending,
    dismissPending,
  };
}
