/**
 * MessagingSection - Workspace section for client messaging
 * 3 sub-tabs: Quick Send, History, Auto Settings
 * Adapts QuickMessageModal (inline) and MessagingSettingsPage functionality
 */

import { Component, createSignal, createMemo, createEffect, onMount, Show, For } from 'solid-js';
import type { TaxPortal } from '../../types/drakeTypes';
import { Button, FormInput, FormSelect } from '../../../ui';
import { communicationStore } from '../../../communications/stores/communicationStore';
import {
  TRIGGER_TYPE_LABELS,
  TRIGGER_DELAY_LABELS,
  DEFAULT_TEMPLATES,
  type CommunicationSettings,
  type TriggerConfig,
  type MessageTemplate,
  type MessageTriggerType,
  type TriggerDelay,
  type MessageChannel,
  type QuickMessage,
} from '../../../communications/types/communicationTypes';
import {
  replaceTemplateVariables,
  buildVariablesFromClient,
  formatPhoneForWhatsApp,
  isValidWhatsAppNumber,
  type TemplateVariables,
} from '../../../communications/services/whatsappService';
import MessageHistoryPanel from '../../../communications/components/MessageHistoryPanel';
import { authStore } from '../../../../stores/authStore';
import { devLog } from '../../../../services/utils';

// ============================================
// Types
// ============================================

type MessagingSubTab = 'quick-send' | 'history' | 'auto-settings';

interface MessagingSectionProps {
  client: TaxPortal;
  onClientChange: (updates: Partial<TaxPortal>) => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
}

// ============================================
// Constants
// ============================================

const ACCENT = '#0ea5e9';

const PLACEHOLDER_LIST = [
  '{{firstName}}',
  '{{lastName}}',
  '{{clientName}}',
  '{{taxYear}}',
  '{{documentType}}',
  '{{documentList}}',
  '{{newStatus}}',
  '{{amountDue}}',
  '{{refundAmount}}',
  '{{appointmentDate}}',
  '{{appointmentTime}}',
  '{{businessName}}',
  '{{businessPhone}}',
  '{{portalLink}}',
];

const SAMPLE_VARIABLES = {
  firstName: 'John',
  lastName: 'Doe',
  clientName: 'John Doe',
  taxYear: '2024',
  documentType: 'W-2',
  documentList: 'W-2, 1099-NEC',
  newStatus: 'Ready to File',
  amountDue: '$250.00',
  refundAmount: 'Your expected refund is $3,450.',
  appointmentDate: 'March 15, 2025',
  appointmentTime: '10:00 AM',
  businessName: 'ABC Tax Services',
  businessPhone: '(305) 555-1234',
  portalLink: 'https://portal.example.com',
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ============================================
// Styles
// ============================================

const styles = {
  container: {
    display: 'flex',
    'flex-direction': 'column' as const,
    gap: '1rem',
  },
  header: {
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'space-between',
    'margin-bottom': '0.5rem',
  },
  tabsContainer: {
    display: 'flex',
    gap: '0.5rem',
    'flex-wrap': 'wrap' as const,
  },
  getTabStyle: (isActive: boolean) => ({
    padding: '0.625rem 1.25rem',
    border: 'none',
    background: isActive ? ACCENT : 'var(--surface-alt, #f3f4f6)',
    color: isActive ? 'white' : 'var(--text-primary)',
    'border-radius': '9999px',
    cursor: 'pointer',
    'font-weight': '600',
    'font-size': '0.875rem',
    transition: 'all 0.2s',
  }),
  panelContainer: {
    'margin-top': '1rem',
    'max-height': '600px',
    'overflow-y': 'auto' as const,
    padding: '0.5rem',
  },
  // Quick Send styles
  row: {
    display: 'flex',
    gap: '12px',
    'margin-bottom': '12px',
  } as Record<string, string>,
  flex1: {
    flex: '1',
  } as Record<string, string>,
  label: {
    'font-size': '12px',
    'font-weight': '500',
    color: '#6b7280',
    'margin-bottom': '4px',
    display: 'block',
  } as Record<string, string>,
  section: {
    'margin-bottom': '16px',
  } as Record<string, string>,
  textarea: {
    width: '100%',
    'min-height': '100px',
    padding: '10px',
    border: '1px solid #d1d5db',
    'border-radius': '6px',
    'font-size': '13px',
    'font-family': 'inherit',
    resize: 'vertical',
    'line-height': '1.5',
    'box-sizing': 'border-box',
  } as Record<string, string>,
  charCount: {
    'font-size': '11px',
    color: '#9ca3af',
    'text-align': 'right',
    'margin-top': '4px',
  } as Record<string, string>,
  langToggle: {
    display: 'flex',
    'border-radius': '6px',
    overflow: 'hidden',
    border: '1px solid #d1d5db',
  } as Record<string, string>,
  langButton: (active: boolean) => ({
    padding: '6px 16px',
    border: 'none',
    background: active ? ACCENT : '#fff',
    color: active ? '#fff' : '#374151',
    'font-size': '13px',
    'font-weight': '500',
    cursor: 'pointer',
    transition: 'all 0.15s',
  }) as Record<string, string>,
  previewSection: {
    'margin-top': '16px',
    padding: '16px',
    background: '#f9fafb',
    'border-radius': '8px',
  } as Record<string, string>,
  previewLabel: {
    'font-size': '12px',
    'font-weight': '600',
    color: '#6b7280',
    'text-transform': 'uppercase',
    'letter-spacing': '0.05em',
    'margin-bottom': '8px',
  } as Record<string, string>,
  previewBubble: {
    padding: '12px',
    background: '#dcfce7',
    'border-radius': '8px',
    'border-bottom-left-radius': '2px',
    'font-size': '13px',
    color: '#166534',
    'line-height': '1.5',
    'white-space': 'pre-wrap',
  } as Record<string, string>,
  previewMeta: {
    display: 'flex',
    'justify-content': 'flex-end',
    'margin-top': '4px',
    'font-size': '11px',
    color: '#9ca3af',
  } as Record<string, string>,
  phoneWarning: {
    'font-size': '12px',
    color: '#f59e0b',
    'margin-top': '4px',
    'margin-bottom': '12px',
  } as Record<string, string>,
  successBox: {
    padding: '16px',
    background: '#dcfce7',
    'border-radius': '8px',
    'text-align': 'center',
    'margin-top': '16px',
  } as Record<string, string>,
  successTitle: {
    'font-size': '16px',
    'font-weight': '600',
    color: '#166534',
    'margin-bottom': '4px',
  } as Record<string, string>,
  successText: {
    'font-size': '13px',
    color: '#166534',
  } as Record<string, string>,
  errorBox: {
    padding: '12px',
    background: '#fef2f2',
    'border-radius': '8px',
    'font-size': '13px',
    color: '#991b1b',
    'margin-top': '12px',
  } as Record<string, string>,
  footer: {
    display: 'flex',
    'justify-content': 'flex-end',
    gap: '8px',
    'margin-top': '20px',
    'padding-top': '16px',
    'border-top': '1px solid #f3f4f6',
  } as Record<string, string>,
  // Auto Settings styles
  toggle: (active: boolean) => ({
    position: 'relative',
    width: '44px',
    height: '24px',
    'border-radius': '12px',
    background: active ? ACCENT : '#d1d5db',
    cursor: 'pointer',
    transition: 'background 0.2s',
    border: 'none',
    padding: '0',
    'flex-shrink': '0',
  }) as Record<string, string>,
  toggleKnob: (active: boolean) => ({
    position: 'absolute',
    top: '2px',
    left: active ? '22px' : '2px',
    width: '20px',
    height: '20px',
    'border-radius': '50%',
    background: '#fff',
    transition: 'left 0.2s',
    'box-shadow': '0 1px 3px rgba(0,0,0,0.2)',
  }) as Record<string, string>,
  toggleRow: {
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'space-between',
    padding: '12px 0',
    'border-bottom': '1px solid #f3f4f6',
  } as Record<string, string>,
  toggleLabel: {
    'font-size': '14px',
    'font-weight': '500',
    color: '#374151',
  } as Record<string, string>,
  toggleDescription: {
    'font-size': '12px',
    color: '#9ca3af',
    'margin-top': '2px',
  } as Record<string, string>,
  sectionTitle: {
    'font-size': '16px',
    'font-weight': '600',
    color: '#374151',
    'margin-bottom': '12px',
  } as Record<string, string>,
  triggerCard: {
    padding: '16px',
    'margin-bottom': '12px',
    border: '1px solid #e5e7eb',
    'border-radius': '8px',
    background: '#fff',
  } as Record<string, string>,
  triggerHeader: {
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'space-between',
    'margin-bottom': '12px',
  } as Record<string, string>,
  triggerName: {
    'font-size': '14px',
    'font-weight': '600',
    color: '#1f2937',
  } as Record<string, string>,
  triggerBody: {
    'padding-top': '12px',
    'border-top': '1px solid #f3f4f6',
  } as Record<string, string>,
  templateEditor: {
    width: '100%',
    'min-height': '80px',
    padding: '10px',
    border: '1px solid #d1d5db',
    'border-radius': '6px',
    'font-size': '13px',
    'font-family': 'inherit',
    resize: 'vertical',
    'line-height': '1.5',
    'box-sizing': 'border-box',
  } as Record<string, string>,
  placeholderTag: {
    display: 'inline-block',
    padding: '2px 6px',
    'margin-right': '4px',
    'margin-bottom': '4px',
    background: '#e0f2fe',
    color: ACCENT,
    'border-radius': '4px',
    'font-size': '11px',
    cursor: 'pointer',
  } as Record<string, string>,
  previewBox: {
    padding: '12px',
    background: '#dcfce7',
    'border-radius': '8px',
    'border-bottom-left-radius': '2px',
    'font-size': '13px',
    color: '#166534',
    'line-height': '1.5',
    'margin-top': '8px',
    'white-space': 'pre-wrap',
  } as Record<string, string>,
  whatsappPreview: {
    display: 'flex',
    'align-items': 'flex-start',
    gap: '8px',
  } as Record<string, string>,
  whatsappIcon: {
    width: '28px',
    height: '28px',
    'border-radius': '50%',
    background: '#25d366',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    color: '#fff',
    'font-size': '14px',
    'flex-shrink': '0',
  } as Record<string, string>,
  dayButton: (active: boolean) => ({
    width: '36px',
    height: '36px',
    'border-radius': '50%',
    border: `1px solid ${active ? ACCENT : '#d1d5db'}`,
    background: active ? ACCENT : '#fff',
    color: active ? '#fff' : '#374151',
    'font-size': '12px',
    'font-weight': '500',
    cursor: 'pointer',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
  }) as Record<string, string>,
  daysRow: {
    display: 'flex',
    gap: '8px',
    'margin-top': '8px',
  } as Record<string, string>,
  successBanner: {
    padding: '12px 16px',
    background: '#dcfce7',
    color: '#166534',
    'border-radius': '8px',
    'margin-bottom': '16px',
    'font-size': '14px',
  } as Record<string, string>,
  errorBanner: {
    padding: '12px 16px',
    background: '#fef2f2',
    color: '#991b1b',
    'border-radius': '8px',
    'margin-bottom': '16px',
    'font-size': '14px',
  } as Record<string, string>,
};

// ============================================
// Component
// ============================================

const MessagingSection: Component<MessagingSectionProps> = (props) => {
  const [activeSubTab, setActiveSubTab] = createSignal<MessagingSubTab>('quick-send');

  // ---- Quick Send state ----
  const [language, setLanguage] = createSignal<'en' | 'es'>('en');
  const [channel, setChannel] = createSignal<MessageChannel>('whatsapp');
  const [selectedTemplateId, setSelectedTemplateId] = createSignal<string>('');
  const [messageBody, setMessageBody] = createSignal('');
  const [isSending, setIsSending] = createSignal(false);
  const [sendResult, setSendResult] = createSignal<'success' | 'error' | null>(null);
  const [errorMessage, setErrorMessage] = createSignal('');

  // ---- Auto Settings state ----
  const [localSettings, setLocalSettings] = createSignal<CommunicationSettings | null>(null);
  const [templateBodies, setTemplateBodies] = createSignal<
    Record<string, { en: string; es: string }>
  >({});
  const [showPreview, setShowPreview] = createSignal<string | null>(null);
  const [saveStatus, setSaveStatus] = createSignal<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // ---- Init ----
  onMount(async () => {
    const businessId = authStore.getBusinessId();
    communicationStore.initializeSettings(businessId);
    await Promise.all([
      communicationStore.loadSettings(),
      communicationStore.loadTemplates(),
    ]);

    // Set default language from settings
    const settingsLang = communicationStore.state.settings?.defaultLanguage;
    if (settingsLang) {
      setLanguage(settingsLang);
    }
  });

  // Sync local settings from store
  createEffect(() => {
    const storeSettings = communicationStore.state.settings;
    if (storeSettings && !localSettings()) {
      setLocalSettings({ ...storeSettings });
    }
  });

  // Initialize template bodies from loaded templates or defaults
  createEffect(() => {
    const templates = communicationStore.state.templates;
    if (templates.length > 0) {
      const bodies: Record<string, { en: string; es: string }> = {};
      for (const tmpl of templates) {
        bodies[tmpl.triggerType] = { en: tmpl.bodyEn, es: tmpl.bodyEs };
      }
      setTemplateBodies(bodies);
    } else {
      const bodies: Record<string, { en: string; es: string }> = {};
      for (const def of DEFAULT_TEMPLATES) {
        bodies[def.triggerType] = { en: def.bodyEn, es: def.bodyEs };
      }
      setTemplateBodies(bodies);
    }
  });

  // ---- Quick Send helpers ----
  const formattedPhone = createMemo(() => {
    return props.client.phone ? formatPhoneForWhatsApp(props.client.phone) : '';
  });

  const isPhoneValid = createMemo(() => {
    return props.client.phone ? isValidWhatsAppNumber(props.client.phone) : false;
  });

  const templates = createMemo(() => communicationStore.state.templates);

  const templateVariables = createMemo((): TemplateVariables => {
    const settings = communicationStore.state.settings;
    return buildVariablesFromClient(
      props.client,
      settings?.businessName || '',
      settings?.businessPhone || ''
    );
  });

  // When a template is selected, fill the message body
  createEffect(() => {
    const templateId = selectedTemplateId();
    if (!templateId) return;
    const template = templates().find((t) => t.id === templateId);
    if (!template) return;
    const body = language() === 'es' ? template.bodyEs : template.bodyEn;
    const rendered = replaceTemplateVariables(body, templateVariables());
    setMessageBody(rendered);
  });

  // When language changes with template selected, update body
  createEffect(() => {
    const lang = language();
    const templateId = selectedTemplateId();
    if (!templateId) return;
    const template = templates().find((t) => t.id === templateId);
    if (!template) return;
    const body = lang === 'es' ? template.bodyEs : template.bodyEn;
    const rendered = replaceTemplateVariables(body, templateVariables());
    setMessageBody(rendered);
  });

  const canSend = createMemo(() => {
    if (!messageBody().trim()) return false;
    if (channel() === 'whatsapp' && !isPhoneValid()) return false;
    if (channel() === 'email' && !props.client.email) return false;
    return true;
  });

  const handleSend = async () => {
    if (!canSend()) return;
    setIsSending(true);
    setSendResult(null);
    setErrorMessage('');

    try {
      const quickMessage: QuickMessage = {
        clientId: props.client.id,
        clientName: `${props.client.firstName} ${props.client.lastName}`,
        phone: formattedPhone(),
        email: props.client.email,
        channel: channel(),
        body: messageBody(),
        language: language(),
        templateId: selectedTemplateId() || undefined,
      };

      const result = await communicationStore.sendQuickMessage(quickMessage);
      if (result && result.status !== 'failed') {
        setSendResult('success');
      } else {
        setSendResult('error');
        setErrorMessage(result?.errorMessage || 'Failed to send message');
      }
    } catch (error: any) {
      setSendResult('error');
      setErrorMessage(error?.message || 'An unexpected error occurred');
    } finally {
      setIsSending(false);
    }
  };

  // ---- Auto Settings helpers ----
  const settings = () => localSettings() || communicationStore.state.settings;

  const updateSettings = (field: keyof CommunicationSettings, value: any) => {
    const current = localSettings() || communicationStore.state.settings;
    if (!current) return;
    setLocalSettings({ ...current, [field]: value });
  };

  const updateTrigger = (triggerType: MessageTriggerType, updates: Partial<TriggerConfig>) => {
    const current = localSettings() || communicationStore.state.settings;
    if (!current) return;
    const triggers = current.triggers.map((t) =>
      t.triggerType === triggerType ? { ...t, ...updates } : t
    );
    setLocalSettings({ ...current, triggers });
  };

  const updateBusinessHours = (updates: Partial<CommunicationSettings['businessHours']>) => {
    const current = localSettings() || communicationStore.state.settings;
    if (!current) return;
    setLocalSettings({
      ...current,
      businessHours: { ...current.businessHours, ...updates },
    });
  };

  const toggleDay = (day: number) => {
    const current = settings();
    if (!current) return;
    const days = current.businessHours.activeDays.includes(day)
      ? current.businessHours.activeDays.filter((d) => d !== day)
      : [...current.businessHours.activeDays, day].sort();
    updateBusinessHours({ activeDays: days });
  };

  const updateTemplateBody = (triggerType: string, lang: 'en' | 'es', body: string) => {
    setTemplateBodies((prev) => ({
      ...prev,
      [triggerType]: { ...prev[triggerType], [lang]: body },
    }));
  };

  const insertPlaceholder = (triggerType: string, placeholder: string) => {
    const lang = settings()?.defaultLanguage || 'en';
    const current = templateBodies()[triggerType]?.[lang] || '';
    updateTemplateBody(triggerType, lang, current + placeholder);
  };

  const getPreviewText = (triggerType: string): string => {
    const lang = settings()?.defaultLanguage || 'en';
    const body = templateBodies()[triggerType]?.[lang] || '';
    return replaceTemplateVariables(body, SAMPLE_VARIABLES);
  };

  const handleSaveSettings = async () => {
    const current = localSettings();
    if (!current) return;
    setSaveStatus('saving');

    try {
      await communicationStore.saveSettings(current);

      // Save templates
      const bodies = templateBodies();
      for (const [triggerType, body] of Object.entries(bodies)) {
        const existingTemplate = communicationStore.state.templates.find(
          (t) => t.triggerType === triggerType
        );
        const template: MessageTemplate = {
          id: existingTemplate?.id || `tmpl-${triggerType}-${Date.now()}`,
          name: TRIGGER_TYPE_LABELS[triggerType as MessageTriggerType] || triggerType,
          triggerType: triggerType as MessageTriggerType,
          bodyEn: body.en,
          bodyEs: body.es,
          isDefault: !existingTemplate,
          channel: 'whatsapp',
          createdAt: existingTemplate?.createdAt || Date.now(),
          updatedAt: Date.now(),
        };
        await communicationStore.saveTemplate(template);
      }

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  // ---- Sub-tabs config ----
  const subTabs: { id: MessagingSubTab; label: string }[] = [
    { id: 'quick-send', label: 'Quick Send' },
    { id: 'history', label: 'History' },
    { id: 'auto-settings', label: 'Auto Settings' },
  ];

  // ============================================
  // Render
  // ============================================

  return (
    <div style={styles.container}>
      {/* Header with sub-tabs */}
      <div style={styles.header}>
        <div style={styles.tabsContainer}>
          <For each={subTabs}>
            {(tab) => (
              <button
                style={styles.getTabStyle(activeSubTab() === tab.id)}
                onClick={() => setActiveSubTab(tab.id)}
              >
                {tab.label}
              </button>
            )}
          </For>
        </div>
      </div>

      <div style={styles.panelContainer}>
        {/* ==================== TAB 1: Quick Send ==================== */}
        <Show when={activeSubTab() === 'quick-send'}>
          <div>
            {/* Success State */}
            <Show when={sendResult() === 'success'}>
              <div style={styles.successBox}>
                <div style={styles.successTitle}>Message Sent</div>
                <div style={styles.successText}>
                  Your message was sent to {props.client.firstName} via{' '}
                  {channel() === 'whatsapp' ? 'WhatsApp' : 'Email'}.
                </div>
              </div>
              <div style={styles.footer}>
                <Button
                  onClick={() => {
                    setSendResult(null);
                    setMessageBody('');
                    setSelectedTemplateId('');
                  }}
                >
                  Send Another
                </Button>
              </div>
            </Show>

            {/* Message Form */}
            <Show when={sendResult() !== 'success'}>
              {/* Channel & Language */}
              <div style={styles.row}>
                <div style={styles.flex1}>
                  <label style={styles.label}>Channel</label>
                  <FormSelect
                    value={channel()}
                    onInput={(e: any) => setChannel(e.target.value as MessageChannel)}
                    options={[
                      { value: 'whatsapp', label: 'WhatsApp' },
                      { value: 'email', label: 'Email' },
                    ]}
                  />
                </div>
                <div>
                  <label style={styles.label}>Language</label>
                  <div style={styles.langToggle}>
                    <button
                      style={styles.langButton(language() === 'en')}
                      onClick={() => setLanguage('en')}
                    >
                      EN
                    </button>
                    <button
                      style={styles.langButton(language() === 'es')}
                      onClick={() => setLanguage('es')}
                    >
                      ES
                    </button>
                  </div>
                </div>
              </div>

              {/* Phone validation warning */}
              <Show when={channel() === 'whatsapp' && !isPhoneValid()}>
                <div style={styles.phoneWarning}>
                  {props.client.phone
                    ? 'Phone number appears invalid for WhatsApp. Please verify.'
                    : 'No phone number on file for this client.'}
                </div>
              </Show>

              {/* Template Selector */}
              <div style={styles.section}>
                <FormSelect
                  label="Quick Template (optional)"
                  value={selectedTemplateId()}
                  onInput={(e: any) => setSelectedTemplateId(e.target.value)}
                  options={[
                    { value: '', label: '-- Freeform Message --' },
                    ...templates().map((t) => ({
                      value: t.id,
                      label: t.name,
                    })),
                  ]}
                />
              </div>

              {/* Message Body */}
              <div style={styles.section}>
                <label style={styles.label}>Message</label>
                <textarea
                  style={styles.textarea}
                  value={messageBody()}
                  onInput={(e) => setMessageBody(e.currentTarget.value)}
                  placeholder={
                    language() === 'es'
                      ? 'Escriba su mensaje aqui...'
                      : 'Type your message here...'
                  }
                />
                <div style={styles.charCount}>{messageBody().length} characters</div>
              </div>

              {/* Preview */}
              <Show when={messageBody().trim()}>
                <div style={styles.previewSection}>
                  <div style={styles.previewLabel}>Preview</div>
                  <div style={styles.previewBubble}>{messageBody()}</div>
                  <div style={styles.previewMeta}>
                    {channel() === 'whatsapp' ? 'WhatsApp' : 'Email'} |{' '}
                    {language() === 'es' ? 'Spanish' : 'English'}
                  </div>
                </div>
              </Show>

              {/* Error */}
              <Show when={sendResult() === 'error'}>
                <div style={styles.errorBox}>{errorMessage() || 'Failed to send message.'}</div>
              </Show>

              {/* Send Button */}
              <div style={styles.footer}>
                <Button onClick={handleSend} disabled={!canSend() || isSending()}>
                  {isSending() ? 'Sending...' : 'Send Message'}
                </Button>
              </div>
            </Show>
          </div>
        </Show>

        {/* ==================== TAB 2: History ==================== */}
        <Show when={activeSubTab() === 'history'}>
          <MessageHistoryPanel clientId={props.client.id} />
        </Show>

        {/* ==================== TAB 3: Auto Settings ==================== */}
        <Show when={activeSubTab() === 'auto-settings'}>
          <div style={{ display: 'flex', 'flex-direction': 'column', gap: '16px' }}>
            {/* Save Status Banners */}
            <Show when={saveStatus() === 'saved'}>
              <div style={styles.successBanner}>Settings saved successfully.</div>
            </Show>
            <Show when={saveStatus() === 'error'}>
              <div style={styles.errorBanner}>Failed to save settings. Please try again.</div>
            </Show>

            {/* Master Toggle */}
            <div style={styles.toggleRow}>
              <div>
                <div style={styles.toggleLabel}>Enable Auto-Messaging</div>
                <div style={styles.toggleDescription}>
                  When enabled, messages will be sent automatically based on trigger rules below
                </div>
              </div>
              <button
                style={styles.toggle(settings()?.autoMessagingEnabled || false)}
                onClick={() => updateSettings('autoMessagingEnabled', !settings()?.autoMessagingEnabled)}
              >
                <div style={styles.toggleKnob(settings()?.autoMessagingEnabled || false)} />
              </button>
            </div>

            {/* Business Hours */}
            <div style={{ padding: '12px 0' }}>
              <div style={styles.toggleRow}>
                <div>
                  <div style={styles.toggleLabel}>Business Hours</div>
                  <div style={styles.toggleDescription}>
                    Only send auto-messages during business hours
                  </div>
                </div>
                <button
                  style={styles.toggle(settings()?.businessHours?.enabled || false)}
                  onClick={() =>
                    updateBusinessHours({ enabled: !settings()?.businessHours?.enabled })
                  }
                >
                  <div style={styles.toggleKnob(settings()?.businessHours?.enabled || false)} />
                </button>
              </div>

              <Show when={settings()?.businessHours?.enabled}>
                <div style={{ ...styles.row, 'margin-top': '12px' }}>
                  <div style={styles.flex1}>
                    <FormInput
                      label="Start Time"
                      type="time"
                      value={settings()?.businessHours?.startTime || '09:00'}
                      onInput={(e: any) => updateBusinessHours({ startTime: e.target.value })}
                    />
                  </div>
                  <div style={styles.flex1}>
                    <FormInput
                      label="End Time"
                      type="time"
                      value={settings()?.businessHours?.endTime || '18:00'}
                      onInput={(e: any) => updateBusinessHours({ endTime: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label style={styles.label}>Active Days</label>
                  <div style={styles.daysRow}>
                    <For each={DAY_LABELS}>
                      {(day, index) => (
                        <button
                          style={styles.dayButton(
                            settings()?.businessHours?.activeDays?.includes(index()) || false
                          )}
                          onClick={() => toggleDay(index())}
                        >
                          {day}
                        </button>
                      )}
                    </For>
                  </div>
                </div>
              </Show>
            </div>

            {/* Trigger Configuration */}
            <div>
              <h3 style={styles.sectionTitle}>Auto-Message Triggers</h3>
              <p style={{ 'font-size': '13px', color: '#6b7280', 'margin-bottom': '16px' }}>
                Configure when automatic messages are sent to clients.
              </p>

              <For each={settings()?.triggers || []}>
                {(trigger) => (
                  <div style={styles.triggerCard}>
                    <div style={styles.triggerHeader}>
                      <div>
                        <span style={styles.triggerName}>
                          {TRIGGER_TYPE_LABELS[trigger.triggerType]}
                        </span>
                      </div>
                      <button
                        style={styles.toggle(trigger.enabled)}
                        onClick={() => updateTrigger(trigger.triggerType, { enabled: !trigger.enabled })}
                      >
                        <div style={styles.toggleKnob(trigger.enabled)} />
                      </button>
                    </div>

                    <Show when={trigger.enabled}>
                      <div style={styles.triggerBody}>
                        {/* Delay & Channel */}
                        <div style={{ ...styles.row, 'margin-bottom': '12px' }}>
                          <div style={styles.flex1}>
                            <label style={styles.label}>Send Delay</label>
                            <FormSelect
                              value={trigger.delay}
                              onInput={(e: any) =>
                                updateTrigger(trigger.triggerType, { delay: e.target.value as TriggerDelay })
                              }
                              options={Object.entries(TRIGGER_DELAY_LABELS).map(([value, label]) => ({
                                value,
                                label,
                              }))}
                            />
                          </div>
                          <div style={styles.flex1}>
                            <label style={styles.label}>Channel</label>
                            <FormSelect
                              value={trigger.channel}
                              onInput={(e: any) =>
                                updateTrigger(trigger.triggerType, { channel: e.target.value as MessageChannel })
                              }
                              options={[
                                { value: 'whatsapp', label: 'WhatsApp' },
                                { value: 'email', label: 'Email' },
                              ]}
                            />
                          </div>
                        </div>

                        {/* Template Editor */}
                        <div>
                          <label style={styles.label}>
                            Message Template ({settings()?.defaultLanguage === 'es' ? 'Spanish' : 'English'})
                          </label>
                          <textarea
                            style={styles.templateEditor}
                            value={
                              templateBodies()[trigger.triggerType]?.[
                                settings()?.defaultLanguage || 'en'
                              ] || ''
                            }
                            onInput={(e) =>
                              updateTemplateBody(
                                trigger.triggerType,
                                settings()?.defaultLanguage || 'en',
                                e.currentTarget.value
                              )
                            }
                          />
                        </div>

                        {/* Placeholder Tags */}
                        <div style={{ 'margin-top': '6px' }}>
                          <label style={styles.label}>Insert Placeholder:</label>
                          <div style={{ display: 'flex', 'flex-wrap': 'wrap', 'margin-top': '4px' }}>
                            <For each={PLACEHOLDER_LIST}>
                              {(placeholder) => (
                                <span
                                  style={styles.placeholderTag}
                                  onClick={() => insertPlaceholder(trigger.triggerType, placeholder)}
                                >
                                  {placeholder}
                                </span>
                              )}
                            </For>
                          </div>
                        </div>

                        {/* Preview */}
                        <div style={{ 'margin-top': '12px' }}>
                          <Button
                            onClick={() =>
                              setShowPreview(
                                showPreview() === trigger.triggerType ? null : trigger.triggerType
                              )
                            }
                          >
                            {showPreview() === trigger.triggerType ? 'Hide Preview' : 'Preview Message'}
                          </Button>

                          <Show when={showPreview() === trigger.triggerType}>
                            <div style={styles.whatsappPreview}>
                              <div style={styles.whatsappIcon}>W</div>
                              <div style={styles.previewBox}>
                                {getPreviewText(trigger.triggerType)}
                              </div>
                            </div>
                          </Show>
                        </div>
                      </div>
                    </Show>
                  </div>
                )}
              </For>
            </div>

            {/* Save Button */}
            <div style={styles.footer}>
              <Button
                onClick={handleSaveSettings}
                disabled={saveStatus() === 'saving'}
              >
                {saveStatus() === 'saving' ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
};

export default MessagingSection;
