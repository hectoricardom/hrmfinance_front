/**
 * Quick Message Modal
 * Modal for sending ad-hoc WhatsApp messages to a specific client.
 * Supports template selection, freeform text, language toggle, and message preview.
 */

import { Component, createSignal, createMemo, createEffect, Show, For } from 'solid-js';
import { useTranslation } from '../../../translations';
import { Modal, Button, FormInput, FormSelect } from '../../ui';
import { communicationStore } from '../stores/communicationStore';
import {
  TRIGGER_TYPE_LABELS,
  MESSAGE_STATUS_COLORS,
  type MessageTemplate,
  type QuickMessage,
  type MessageChannel,
} from '../types/communicationTypes';
import {
  replaceTemplateVariables,
  buildVariablesFromClient,
  formatPhoneForWhatsApp,
  isValidWhatsAppNumber,
  type TemplateVariables,
} from '../services/whatsappService';
import type { TaxPortal } from '../../drake-export/types/drakeTypes';

// ============================================
// Props
// ============================================

interface QuickMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: TaxPortal;
}

// ============================================
// Styles
// ============================================

const styles = {
  clientHeader: {
    display: 'flex',
    'align-items': 'center',
    gap: '12px',
    padding: '16px',
    background: '#f9fafb',
    'border-radius': '8px',
    'margin-bottom': '20px',
  } as Record<string, string>,

  avatar: {
    width: '48px',
    height: '48px',
    'border-radius': '50%',
    background: '#1a73e8',
    color: '#fff',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    'font-size': '18px',
    'font-weight': '600',
    'flex-shrink': '0',
  } as Record<string, string>,

  clientInfo: {
    flex: '1',
  } as Record<string, string>,

  clientName: {
    'font-size': '16px',
    'font-weight': '600',
    color: '#1f2937',
  } as Record<string, string>,

  clientContact: {
    'font-size': '13px',
    color: '#6b7280',
    'margin-top': '2px',
  } as Record<string, string>,

  whatsappBadge: {
    display: 'inline-flex',
    'align-items': 'center',
    gap: '4px',
    padding: '4px 10px',
    'border-radius': '16px',
    background: '#dcfce7',
    color: '#166534',
    'font-size': '12px',
    'font-weight': '500',
  } as Record<string, string>,

  section: {
    'margin-bottom': '16px',
  } as Record<string, string>,

  label: {
    'font-size': '12px',
    'font-weight': '500',
    color: '#6b7280',
    'margin-bottom': '4px',
    display: 'block',
  } as Record<string, string>,

  row: {
    display: 'flex',
    gap: '12px',
    'margin-bottom': '12px',
  } as Record<string, string>,

  flex1: {
    flex: '1',
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

  langToggle: {
    display: 'flex',
    'border-radius': '6px',
    overflow: 'hidden',
    border: '1px solid #d1d5db',
  } as Record<string, string>,

  langButton: (active: boolean) => ({
    padding: '6px 16px',
    border: 'none',
    background: active ? '#1a73e8' : '#fff',
    color: active ? '#fff' : '#374151',
    'font-size': '13px',
    'font-weight': '500',
    cursor: 'pointer',
    transition: 'all 0.15s',
  }) as Record<string, string>,

  footer: {
    display: 'flex',
    'justify-content': 'flex-end',
    gap: '8px',
    'margin-top': '20px',
    'padding-top': '16px',
    'border-top': '1px solid #f3f4f6',
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

  phoneWarning: {
    'font-size': '12px',
    color: '#f59e0b',
    'margin-top': '4px',
  } as Record<string, string>,
};

// ============================================
// Component
// ============================================

const QuickMessageModal: Component<QuickMessageModalProps> = (props) => {
  const { t } = useTranslation();

  const [language, setLanguage] = createSignal<'en' | 'es'>('en');
  const [channel, setChannel] = createSignal<MessageChannel>('whatsapp');
  const [selectedTemplateId, setSelectedTemplateId] = createSignal<string>('');
  const [messageBody, setMessageBody] = createSignal('');
  const [isSending, setIsSending] = createSignal(false);
  const [sendResult, setSendResult] = createSignal<'success' | 'error' | null>(null);
  const [errorMessage, setErrorMessage] = createSignal('');

  // Reset state when modal opens
  createEffect(() => {
    if (props.isOpen) {
      setMessageBody('');
      setSelectedTemplateId('');
      setSendResult(null);
      setErrorMessage('');
      setIsSending(false);

      // Set default language from settings
      const settingsLang = communicationStore.state.settings?.defaultLanguage;
      if (settingsLang) {
        setLanguage(settingsLang);
      }
    }
  });

  const clientInitials = createMemo(() => {
    const first = props.client.firstName?.[0] || '';
    const last = props.client.lastName?.[0] || '';
    return (first + last).toUpperCase();
  });

  const formattedPhone = createMemo(() => {
    return props.client.phone ? formatPhoneForWhatsApp(props.client.phone) : '';
  });

  const isPhoneValid = createMemo(() => {
    return props.client.phone ? isValidWhatsAppNumber(props.client.phone) : false;
  });

  const templates = createMemo(() => {
    return communicationStore.state.templates;
  });

  // Build variables for preview
  const templateVariables = createMemo((): TemplateVariables => {
    const settings = communicationStore.state.settings;
    return buildVariablesFromClient(
      props.client,
      settings?.businessName || '',
      settings?.businessPhone || ''
    );
  });

  // When a template is selected, fill in the message body
  createEffect(() => {
    const templateId = selectedTemplateId();
    if (!templateId) return;

    const template = templates().find((t) => t.id === templateId);
    if (!template) return;

    const body = language() === 'es' ? template.bodyEs : template.bodyEn;
    const rendered = replaceTemplateVariables(body, templateVariables());
    setMessageBody(rendered);
  });

  // When language changes and a template is selected, update the body
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

  const previewMessage = createMemo(() => {
    return messageBody();
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

  const handleClose = () => {
    setSendResult(null);
    props.onClose();
  };

  return (
    <Modal isOpen={props.isOpen} onClose={handleClose}>
      <div style={{ padding: '20px', 'min-width': '480px', 'max-width': '560px' }}>
        <h2 style={{ 'font-size': '18px', 'font-weight': '700', color: '#1f2937', 'margin-bottom': '16px' }}>
          Send Message
        </h2>

        {/* Client Header */}
        <div style={styles.clientHeader}>
          <div style={styles.avatar}>{clientInitials()}</div>
          <div style={styles.clientInfo}>
            <div style={styles.clientName}>
              {props.client.firstName} {props.client.lastName}
            </div>
            <div style={styles.clientContact}>
              {formattedPhone() && <span>{formattedPhone()}</span>}
              {formattedPhone() && props.client.email && <span> | </span>}
              {props.client.email && <span>{props.client.email}</span>}
            </div>
          </div>
          <Show when={channel() === 'whatsapp'}>
            <span style={styles.whatsappBadge}>WhatsApp</span>
          </Show>
        </div>

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
            <Button onClick={handleClose}>Close</Button>
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
              <div style={styles.previewBubble}>{previewMessage()}</div>
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

          {/* Footer */}
          <div style={styles.footer}>
            <Button onClick={handleClose}>Cancel</Button>
            <Button onClick={handleSend} disabled={!canSend() || isSending()}>
              {isSending() ? 'Sending...' : 'Send Message'}
            </Button>
          </div>
        </Show>
      </div>
    </Modal>
  );
};

export default QuickMessageModal;
