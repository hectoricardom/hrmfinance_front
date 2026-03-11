/**
 * Communication Types
 * Types for the WhatsApp/Email communications module
 */

import type { TaxWorkflowStatus } from '../../drake-export/types/drakeTypes';

// ============================================
// Message Channel & Status
// ============================================

/** Supported messaging channels */
export type MessageChannel = 'whatsapp' | 'email';

/** Message delivery status */
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

/** Status colors for UI */
export const MESSAGE_STATUS_COLORS: Record<MessageStatus, string> = {
  pending: '#9ca3af',   // gray
  sent: '#f59e0b',      // amber
  delivered: '#22c55e', // green
  read: '#1a73e8',      // primary blue
  failed: '#ef4444',    // red
};

/** Status labels for UI */
export const MESSAGE_STATUS_LABELS: Record<MessageStatus, string> = {
  pending: 'Pending',
  sent: 'Sent',
  delivered: 'Delivered',
  read: 'Read',
  failed: 'Failed',
};

// ============================================
// Message Triggers
// ============================================

/** Automatic message trigger types */
export type MessageTriggerType =
  | 'document_received'
  | 'reminder'
  | 'return_ready'
  | 'payment_due'
  | 'appointment_reminder'
  | 'status_change'
  | 'missing_docs'
  | 'return_accepted'
  | 'return_rejected';

/** Labels for trigger types */
export const TRIGGER_TYPE_LABELS: Record<MessageTriggerType, string> = {
  document_received: 'Document Received',
  reminder: 'General Reminder',
  return_ready: 'Return Ready for Review',
  payment_due: 'Payment Due',
  appointment_reminder: 'Appointment Reminder',
  status_change: 'Status Change',
  missing_docs: 'Missing Documents',
  return_accepted: 'Return Accepted by IRS',
  return_rejected: 'Return Rejected',
};

/** Trigger delay options */
export type TriggerDelay = 'immediately' | '1hr' | '24hr';

/** Labels for trigger delays */
export const TRIGGER_DELAY_LABELS: Record<TriggerDelay, string> = {
  immediately: 'Send Immediately',
  '1hr': 'After 1 Hour',
  '24hr': 'After 24 Hours',
};

// ============================================
// Trigger Configuration
// ============================================

/** Per-trigger settings */
export interface TriggerConfig {
  triggerType: MessageTriggerType;
  enabled: boolean;
  templateId: string;
  delay: TriggerDelay;
  channel: MessageChannel;
  /** Optional conditions to further qualify when trigger fires */
  conditions?: {
    /** Only trigger for specific workflow statuses */
    workflowStatuses?: TaxWorkflowStatus[];
    /** Minimum hours since last message to same client */
    cooldownHours?: number;
  };
}

// ============================================
// Message Templates
// ============================================

/** Supported template placeholder variables */
export type TemplatePlaceholder =
  | '{{clientName}}'
  | '{{firstName}}'
  | '{{lastName}}'
  | '{{taxYear}}'
  | '{{documentType}}'
  | '{{documentList}}'
  | '{{newStatus}}'
  | '{{appointmentDate}}'
  | '{{appointmentTime}}'
  | '{{amountDue}}'
  | '{{businessName}}'
  | '{{businessPhone}}'
  | '{{refundAmount}}'
  | '{{portalLink}}';

/** Message template with placeholders */
export interface MessageTemplate {
  id: string;
  name: string;
  triggerType: MessageTriggerType;
  /** Template body in English with {{placeholder}} variables */
  bodyEn: string;
  /** Template body in Spanish with {{placeholder}} variables */
  bodyEs: string;
  /** Whether this is a system default template */
  isDefault: boolean;
  /** Channel this template is intended for */
  channel: MessageChannel;
  createdAt: number;
  updatedAt: number;
}

// ============================================
// Message Log
// ============================================

/** Sent message record */
export interface MessageLog {
  id: string;
  /** The client this message was sent to */
  clientId: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  /** The channel used to send */
  channel: MessageChannel;
  /** The trigger that caused this message (null for quick messages) */
  triggerType: MessageTriggerType | null;
  /** The template used (null for freeform) */
  templateId: string | null;
  /** The rendered message body that was sent */
  body: string;
  /** Language the message was sent in */
  language: 'en' | 'es';
  /** Delivery status */
  status: MessageStatus;
  /** External message ID from WhatsApp/email provider */
  externalId?: string;
  /** Error message if status is 'failed' */
  errorMessage?: string;
  /** Timestamps */
  sentAt: number;
  deliveredAt?: number;
  readAt?: number;
  /** Who triggered this message (user ID or 'system') */
  sentBy: string;
}

// ============================================
// Quick Message
// ============================================

/** Ad-hoc message to send */
export interface QuickMessage {
  clientId: string;
  clientName: string;
  phone: string;
  email?: string;
  channel: MessageChannel;
  body: string;
  language: 'en' | 'es';
  templateId?: string;
}

// ============================================
// Communication Settings
// ============================================

/** Business hours configuration */
export interface BusinessHours {
  /** Whether to respect business hours for auto messages */
  enabled: boolean;
  /** Start time in 24h format, e.g. "09:00" */
  startTime: string;
  /** End time in 24h format, e.g. "18:00" */
  endTime: string;
  /** Timezone, e.g. "America/New_York" */
  timezone: string;
  /** Days of the week to send (0=Sunday, 6=Saturday) */
  activeDays: number[];
}

/** Master settings for a business */
export interface CommunicationSettings {
  id: string;
  businessId: string;
  /** Master toggle: enable/disable all auto-messaging */
  autoMessagingEnabled: boolean;
  /** Preferred channel (WhatsApp primary, email fallback) */
  primaryChannel: MessageChannel;
  /** Fallback channel if primary fails */
  fallbackChannel: MessageChannel;
  /** Business hours configuration */
  businessHours: BusinessHours;
  /** Per-trigger configuration */
  triggers: TriggerConfig[];
  /** Default language for messages */
  defaultLanguage: 'en' | 'es';
  /** Whether to respect client opt-out */
  respectOptOut: boolean;
  /** Business name to use in templates */
  businessName: string;
  /** Business phone to use in templates */
  businessPhone: string;
  createdAt: number;
  updatedAt: number;
}

// ============================================
// Default Templates
// ============================================

/** Default templates for each trigger type */
export const DEFAULT_TEMPLATES: Omit<MessageTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Document Received',
    triggerType: 'document_received',
    bodyEn: 'Hi {{firstName}}, we received your {{documentType}}. Thank you! We will review it shortly. - {{businessName}}',
    bodyEs: 'Hola {{firstName}}, recibimos su {{documentType}}. Gracias! Lo revisaremos pronto. - {{businessName}}',
    isDefault: true,
    channel: 'whatsapp',
  },
  {
    name: 'Missing Documents',
    triggerType: 'missing_docs',
    bodyEn: 'Hi {{firstName}}, we are still waiting for the following documents: {{documentList}}. Please upload them at your earliest convenience. - {{businessName}}',
    bodyEs: 'Hola {{firstName}}, todavia estamos esperando los siguientes documentos: {{documentList}}. Por favor subalos lo antes posible. - {{businessName}}',
    isDefault: true,
    channel: 'whatsapp',
  },
  {
    name: 'Return Ready for Review',
    triggerType: 'return_ready',
    bodyEn: 'Hi {{firstName}}, your {{taxYear}} tax return is ready for review. Please contact us to go over the details. - {{businessName}}',
    bodyEs: 'Hola {{firstName}}, su declaracion de impuestos del {{taxYear}} esta lista para revision. Por favor contactenos para revisar los detalles. - {{businessName}}',
    isDefault: true,
    channel: 'whatsapp',
  },
  {
    name: 'Return Accepted by IRS',
    triggerType: 'return_accepted',
    bodyEn: 'Great news, {{firstName}}! Your {{taxYear}} tax return has been accepted by the IRS. {{refundAmount}} - {{businessName}}',
    bodyEs: 'Buenas noticias, {{firstName}}! Su declaracion de impuestos del {{taxYear}} fue aceptada por el IRS. {{refundAmount}} - {{businessName}}',
    isDefault: true,
    channel: 'whatsapp',
  },
  {
    name: 'Return Rejected',
    triggerType: 'return_rejected',
    bodyEn: 'Hi {{firstName}}, your {{taxYear}} tax return needs corrections. Please contact us as soon as possible so we can resolve this. - {{businessName}} {{businessPhone}}',
    bodyEs: 'Hola {{firstName}}, su declaracion de impuestos del {{taxYear}} necesita correcciones. Por favor contactenos lo antes posible para resolverlo. - {{businessName}} {{businessPhone}}',
    isDefault: true,
    channel: 'whatsapp',
  },
  {
    name: 'Payment Due',
    triggerType: 'payment_due',
    bodyEn: 'Hi {{firstName}}, this is a friendly reminder that your tax preparation fee of {{amountDue}} is due. Please contact us for payment options. - {{businessName}}',
    bodyEs: 'Hola {{firstName}}, este es un recordatorio de que su tarifa de preparacion de impuestos de {{amountDue}} esta pendiente. Contactenos para opciones de pago. - {{businessName}}',
    isDefault: true,
    channel: 'whatsapp',
  },
  {
    name: 'Status Change',
    triggerType: 'status_change',
    bodyEn: 'Hi {{firstName}}, your tax return status has been updated to: {{newStatus}}. - {{businessName}}',
    bodyEs: 'Hola {{firstName}}, el estado de su declaracion de impuestos ha sido actualizado a: {{newStatus}}. - {{businessName}}',
    isDefault: true,
    channel: 'whatsapp',
  },
  {
    name: 'Appointment Reminder',
    triggerType: 'appointment_reminder',
    bodyEn: 'Hi {{firstName}}, this is a reminder of your appointment on {{appointmentDate}} at {{appointmentTime}}. - {{businessName}}',
    bodyEs: 'Hola {{firstName}}, este es un recordatorio de su cita el {{appointmentDate}} a las {{appointmentTime}}. - {{businessName}}',
    isDefault: true,
    channel: 'whatsapp',
  },
  {
    name: 'General Reminder',
    triggerType: 'reminder',
    bodyEn: 'Hi {{firstName}}, just a friendly reminder from {{businessName}}. Please contact us if you have any questions. {{businessPhone}}',
    bodyEs: 'Hola {{firstName}}, un recordatorio amistoso de {{businessName}}. Contactenos si tiene alguna pregunta. {{businessPhone}}',
    isDefault: true,
    channel: 'whatsapp',
  },
];
