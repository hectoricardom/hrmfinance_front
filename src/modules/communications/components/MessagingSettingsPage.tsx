/**
 * Messaging Settings Page
 * Full settings page for configuring auto-messaging triggers, templates,
 * business hours, and channel preferences.
 */

import { Component, createSignal, createMemo, onMount, Show, For, createEffect } from 'solid-js';
import { useTranslation } from '../../../translations';
import { Card, Button, FormInput, FormSelect } from '../../ui';
import { authStore } from '../../../stores/authStore';
import { communicationStore } from '../stores/communicationStore';
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
} from '../types/communicationTypes';
import { replaceTemplateVariables } from '../services/whatsappService';

// ============================================
// Styles
// ============================================

const styles = {
  page: {
    padding: '24px',
    'max-width': '960px',
    margin: '0 auto',
  } as Record<string, string>,

  header: {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '24px',
  } as Record<string, string>,

  title: {
    'font-size': '24px',
    'font-weight': '700',
    color: '#1f2937',
    margin: '0',
  } as Record<string, string>,

  subtitle: {
    'font-size': '14px',
    color: '#6b7280',
    'margin-top': '4px',
  } as Record<string, string>,

  section: {
    'margin-bottom': '24px',
  } as Record<string, string>,

  sectionTitle: {
    'font-size': '16px',
    'font-weight': '600',
    color: '#374151',
    'margin-bottom': '12px',
  } as Record<string, string>,

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

  toggle: (active: boolean) => ({
    position: 'relative',
    width: '44px',
    height: '24px',
    'border-radius': '12px',
    background: active ? '#1a73e8' : '#d1d5db',
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
  } as Record<string, string>,

  placeholderTag: {
    display: 'inline-block',
    padding: '2px 6px',
    'margin-right': '4px',
    'margin-bottom': '4px',
    background: '#e0ecff',
    color: '#1a73e8',
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

  dayButton: (active: boolean) => ({
    width: '36px',
    height: '36px',
    'border-radius': '50%',
    border: `1px solid ${active ? '#1a73e8' : '#d1d5db'}`,
    background: active ? '#1a73e8' : '#fff',
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

  testSection: {
    padding: '16px',
    background: '#f9fafb',
    'border-radius': '8px',
    'margin-top': '16px',
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

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

const MessagingSettingsPage: Component = () => {
  const { t } = useTranslation();

  const [showPreview, setShowPreview] = createSignal<string | null>(null);
  const [testPhone, setTestPhone] = createSignal('');
  const [testMessage, setTestMessage] = createSignal('');
  const [testSending, setTestSending] = createSignal(false);
  const [saveStatus, setSaveStatus] = createSignal<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [editingTemplate, setEditingTemplate] = createSignal<string | null>(null);

  // Local copy of settings for editing
  const [localSettings, setLocalSettings] = createSignal<CommunicationSettings | null>(null);

  // Local template bodies for editing
  const [templateBodies, setTemplateBodies] = createSignal<
    Record<string, { en: string; es: string }>
  >({});

  onMount(async () => {
    const businessId = authStore.getBusinessId();
    communicationStore.initializeSettings(businessId);
    await Promise.all([
      communicationStore.loadSettings(),
      communicationStore.loadTemplates(),
    ]);
  });

  // Sync local settings when store settings change
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
      // Use defaults
      const bodies: Record<string, { en: string; es: string }> = {};
      for (const def of DEFAULT_TEMPLATES) {
        bodies[def.triggerType] = { en: def.bodyEn, es: def.bodyEs };
      }
      setTemplateBodies(bodies);
    }
  });

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

  const handleSave = async () => {
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

  const handleTestMessage = async () => {
    if (!testPhone() || !testMessage()) return;
    setTestSending(true);

    try {
      await communicationStore.sendQuickMessage({
        clientId: 'test',
        clientName: 'Test User',
        phone: testPhone(),
        channel: 'whatsapp',
        body: testMessage(),
        language: settings()?.defaultLanguage || 'en',
      });
    } finally {
      setTestSending(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Messaging Settings</h1>
          <p style={styles.subtitle}>
            Configure automated WhatsApp messages for your tax clients
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saveStatus() === 'saving'}
        >
          {saveStatus() === 'saving' ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      {/* Save Status Banners */}
      <Show when={saveStatus() === 'saved'}>
        <div style={styles.successBanner}>Settings saved successfully.</div>
      </Show>
      <Show when={saveStatus() === 'error'}>
        <div style={styles.errorBanner}>
          Failed to save settings. Please try again.
        </div>
      </Show>

      {/* Master Toggle */}
      <Card>
        <div style={styles.section}>
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
        </div>
      </Card>

      {/* Channel Preferences */}
      <Card>
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Channel Preferences</h3>
          <div style={styles.row}>
            <div style={styles.flex1}>
              <label style={styles.label}>Primary Channel</label>
              <FormSelect
                value={settings()?.primaryChannel || 'whatsapp'}
                onInput={(e: any) => updateSettings('primaryChannel', e.target.value)}
                options={[
                  { value: 'whatsapp', label: 'WhatsApp' },
                  { value: 'email', label: 'Email' },
                ]}
              />
            </div>
            <div style={styles.flex1}>
              <label style={styles.label}>Fallback Channel</label>
              <FormSelect
                value={settings()?.fallbackChannel || 'email'}
                onInput={(e: any) => updateSettings('fallbackChannel', e.target.value)}
                options={[
                  { value: 'email', label: 'Email' },
                  { value: 'whatsapp', label: 'WhatsApp' },
                ]}
              />
            </div>
            <div style={styles.flex1}>
              <label style={styles.label}>Default Language</label>
              <FormSelect
                value={settings()?.defaultLanguage || 'en'}
                onInput={(e: any) => updateSettings('defaultLanguage', e.target.value)}
                options={[
                  { value: 'en', label: 'English' },
                  { value: 'es', label: 'Spanish' },
                ]}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Business Info */}
      <Card>
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Business Information</h3>
          <div style={styles.row}>
            <div style={styles.flex1}>
              <FormInput
                label="Business Name"
                value={settings()?.businessName || ''}
                onInput={(e: any) => updateSettings('businessName', e.target.value)}
                placeholder="Your Business Name"
              />
            </div>
            <div style={styles.flex1}>
              <FormInput
                label="Business Phone"
                value={settings()?.businessPhone || ''}
                onInput={(e: any) => updateSettings('businessPhone', e.target.value)}
                placeholder="(305) 555-1234"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Business Hours */}
      <Card>
        <div style={styles.section}>
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
      </Card>

      {/* Trigger Configuration */}
      <Card>
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Auto-Message Triggers</h3>
          <p style={{ 'font-size': '13px', color: '#6b7280', 'margin-bottom': '16px' }}>
            Configure when automatic messages are sent to clients. Each trigger can have its own template and delay settings.
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
                    {/* Delay setting */}
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

                    {/* Template editor */}
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

                    {/* Placeholder tags */}
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
      </Card>

      {/* Opt-Out Setting */}
      <Card>
        <div style={styles.section}>
          <div style={styles.toggleRow}>
            <div>
              <div style={styles.toggleLabel}>Respect Client Opt-Out</div>
              <div style={styles.toggleDescription}>
                Do not send messages to clients who have opted out of communications
              </div>
            </div>
            <button
              style={styles.toggle(settings()?.respectOptOut || false)}
              onClick={() => updateSettings('respectOptOut', !settings()?.respectOptOut)}
            >
              <div style={styles.toggleKnob(settings()?.respectOptOut || false)} />
            </button>
          </div>
        </div>
      </Card>

      {/* Test Message */}
      <Card>
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Send Test Message</h3>
          <p style={{ 'font-size': '13px', color: '#6b7280', 'margin-bottom': '12px' }}>
            Send a test WhatsApp message to verify your integration is working.
          </p>
          <div style={styles.testSection}>
            <div style={styles.row}>
              <div style={styles.flex1}>
                <FormInput
                  label="Phone Number"
                  value={testPhone()}
                  onInput={(e: any) => setTestPhone(e.target.value)}
                  placeholder="+1 (305) 555-1234"
                />
              </div>
            </div>
            <div>
              <label style={styles.label}>Message</label>
              <textarea
                style={styles.templateEditor}
                value={testMessage()}
                onInput={(e) => setTestMessage(e.currentTarget.value)}
                placeholder="Type your test message here..."
              />
            </div>
            <div style={{ 'margin-top': '12px' }}>
              <Button
                onClick={handleTestMessage}
                disabled={testSending() || !testPhone() || !testMessage()}
              >
                {testSending() ? 'Sending...' : 'Send Test Message'}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default MessagingSettingsPage;
