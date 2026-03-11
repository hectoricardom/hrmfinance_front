/**
 * Office Workflow Types
 * Types for client check-in, pre-visit forms, kiosk mode, and office assistant dashboard
 */

// ============================================
// Language & Localization
// ============================================

export type SupportedLanguage = 'en' | 'es';

// ============================================
// Pre-Visit Form Types
// ============================================

export type FilingStatusOption =
  | 'single'
  | 'married_filing_jointly'
  | 'married_filing_separately'
  | 'head_of_household'
  | 'qualifying_widow';

export const FILING_STATUS_LABELS: Record<FilingStatusOption, Record<SupportedLanguage, string>> = {
  single: { en: 'Single', es: 'Soltero/a' },
  married_filing_jointly: { en: 'Married Filing Jointly', es: 'Casado/a Declarando Juntos' },
  married_filing_separately: { en: 'Married Filing Separately', es: 'Casado/a Declarando Separado' },
  head_of_household: { en: 'Head of Household', es: 'Jefe de Familia' },
  qualifying_widow: { en: 'Qualifying Widow(er)', es: 'Viudo/a Calificado/a' },
};

export type DocumentBrought =
  | 'w2'
  | '1099'
  | 'id_photo'
  | 'ssn_card'
  | 'prior_return'
  | '1098'
  | 'bank_statement'
  | 'childcare_receipt'
  | 'other';

export const DOCUMENT_LABELS: Record<DocumentBrought, Record<SupportedLanguage, string>> = {
  w2: { en: 'W-2 (Wage Statement)', es: 'W-2 (Declaracion de Salarios)' },
  '1099': { en: '1099 Forms', es: 'Formularios 1099' },
  id_photo: { en: 'Photo ID', es: 'Identificacion con Foto' },
  ssn_card: { en: 'Social Security Card', es: 'Tarjeta de Seguro Social' },
  prior_return: { en: 'Prior Year Tax Return', es: 'Declaracion del Ano Anterior' },
  '1098': { en: '1098 (Mortgage Interest)', es: '1098 (Intereses Hipotecarios)' },
  bank_statement: { en: 'Bank Statements', es: 'Estados de Cuenta Bancarios' },
  childcare_receipt: { en: 'Childcare Receipts', es: 'Recibos de Cuidado Infantil' },
  other: { en: 'Other Documents', es: 'Otros Documentos' },
};

export interface DependentInfo {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  relationship: string;
  ssn?: string;
}

export interface PreVisitFormData {
  // Personal Info
  firstName: string;
  lastName: string;
  phone: string;
  email: string;

  // Tax Info
  filingStatus: FilingStatusOption | '';
  taxYear: string;

  // SSN (optional)
  ssn?: string;

  // Dependents
  hasDependents: boolean;
  dependents: DependentInfo[];

  // Documents
  documentsBrought: DocumentBrought[];

  // Additional
  notes: string;

  // Language
  language: SupportedLanguage;

  // Portal reference
  portalId?: string;
  token?: string;
}

// ============================================
// Kiosk Configuration
// ============================================

export interface KioskConfig {
  businessName: string;
  welcomeMessage: Record<SupportedLanguage, string>;
  logoUrl?: string;
  primaryColor: string;
  inactivityTimeoutSeconds: number;
  enableAppointmentLookup: boolean;
  enableWalkIn: boolean;
  services: KioskService[];
}

export interface KioskService {
  id: string;
  name: Record<SupportedLanguage, string>;
  description?: Record<SupportedLanguage, string>;
  estimatedDurationMinutes: number;
}

export const DEFAULT_KIOSK_CONFIG: KioskConfig = {
  businessName: 'Stephanie Solutions Tax Prep',
  welcomeMessage: {
    en: 'Welcome to Stephanie Solutions Tax Prep',
    es: 'Bienvenido a Stephanie Solutions Tax Prep',
  },
  primaryColor: '#1a73e8',
  inactivityTimeoutSeconds: 30,
  enableAppointmentLookup: true,
  enableWalkIn: true,
  services: [
    {
      id: 'tax_prep',
      name: { en: 'Tax Preparation', es: 'Preparacion de Impuestos' },
      description: { en: 'Individual or business tax filing', es: 'Declaracion de impuestos individual o de negocios' },
      estimatedDurationMinutes: 45,
    },
    {
      id: 'tax_consultation',
      name: { en: 'Tax Consultation', es: 'Consulta de Impuestos' },
      description: { en: 'General tax questions and advice', es: 'Preguntas generales y asesoramiento fiscal' },
      estimatedDurationMinutes: 30,
    },
    {
      id: 'document_drop',
      name: { en: 'Document Drop-off', es: 'Entrega de Documentos' },
      description: { en: 'Drop off tax documents', es: 'Dejar documentos de impuestos' },
      estimatedDurationMinutes: 10,
    },
    {
      id: 'pickup',
      name: { en: 'Pick Up Return', es: 'Recoger Declaracion' },
      description: { en: 'Pick up completed tax return', es: 'Recoger declaracion de impuestos completada' },
      estimatedDurationMinutes: 10,
    },
  ],
};

// ============================================
// Check-In Queue Types
// ============================================

export type CheckInStatus = 'waiting' | 'in_progress' | 'completed' | 'no_show';

export const CHECK_IN_STATUS_LABELS: Record<CheckInStatus, Record<SupportedLanguage, string>> = {
  waiting: { en: 'Waiting', es: 'Esperando' },
  in_progress: { en: 'In Progress', es: 'En Progreso' },
  completed: { en: 'Completed', es: 'Completado' },
  no_show: { en: 'No Show', es: 'No Se Presento' },
};

export const CHECK_IN_STATUS_COLORS: Record<CheckInStatus, string> = {
  waiting: '#f59e0b',
  in_progress: '#1a73e8',
  completed: '#22c55e',
  no_show: '#ef4444',
};

export interface CheckInEntry {
  id: string;
  queueNumber: number;

  // Client info
  clientId?: string;
  clientName: string;
  phone: string;
  email?: string;

  // Check-in details
  checkInTime: number; // timestamp
  status: CheckInStatus;
  serviceType?: string;
  notes?: string;

  // Assignment
  assignedPreparerId?: string;
  assignedPreparerName?: string;

  // Timing
  estimatedWaitMinutes: number;
  startedAt?: number; // timestamp when moved to in_progress
  completedAt?: number; // timestamp when completed

  // Pre-visit form
  hasPreVisitForm: boolean;
  preVisitData?: PreVisitFormData;

  // Appointment reference
  appointmentId?: string;
  isWalkIn: boolean;
}

// ============================================
// Wait Time Estimation
// ============================================

export interface WaitTimeEstimate {
  estimatedMinutes: number;
  queuePosition: number;
  activePreparers: number;
  averageProcessingMinutes: number;
  confidence: 'high' | 'medium' | 'low';
}

// ============================================
// Assistant Task Types
// ============================================

export type AssistantTaskPriority = 'high' | 'medium' | 'low';
export type AssistantTaskType =
  | 'check_in'
  | 'missing_documents'
  | 'appointment_reminder'
  | 'follow_up'
  | 'client_arrival'
  | 'general';

export interface AssistantTask {
  id: string;
  type: AssistantTaskType;
  title: string;
  description: string;
  priority: AssistantTaskPriority;
  clientName?: string;
  clientId?: string;
  createdAt: number;
  dueAt?: number;
  completedAt?: number;
  isCompleted: boolean;
}

export const ASSISTANT_TASK_COLORS: Record<AssistantTaskPriority, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#22c55e',
};

// ============================================
// Bilingual Text Helpers
// ============================================

export interface BilingualText {
  en: string;
  es: string;
}

/** Common UI labels used across office workflow components */
export const UI_LABELS: Record<string, BilingualText> = {
  // General
  submit: { en: 'Submit', es: 'Enviar' },
  cancel: { en: 'Cancel', es: 'Cancelar' },
  back: { en: 'Back', es: 'Volver' },
  next: { en: 'Next', es: 'Siguiente' },
  yes: { en: 'Yes', es: 'Si' },
  no: { en: 'No', es: 'No' },
  loading: { en: 'Loading...', es: 'Cargando...' },
  error: { en: 'Error', es: 'Error' },
  success: { en: 'Success', es: 'Exito' },
  required: { en: 'Required', es: 'Requerido' },

  // Pre-visit form
  personalInfo: { en: 'Personal Information', es: 'Informacion Personal' },
  taxInfo: { en: 'Tax Information', es: 'Informacion de Impuestos' },
  firstName: { en: 'First Name', es: 'Nombre' },
  lastName: { en: 'Last Name', es: 'Apellido' },
  phone: { en: 'Phone Number', es: 'Numero de Telefono' },
  email: { en: 'Email', es: 'Correo Electronico' },
  filingStatus: { en: 'Filing Status', es: 'Estado de Declaracion' },
  taxYear: { en: 'Tax Year', es: 'Ano Fiscal' },
  ssn: { en: 'Social Security Number', es: 'Numero de Seguro Social' },
  ssnOptional: { en: 'SSN (Optional - can provide in office)', es: 'SSN (Opcional - puede proporcionarlo en la oficina)' },
  ssnPrivacy: { en: 'Your SSN is encrypted and securely transmitted.', es: 'Su SSN esta encriptado y se transmite de forma segura.' },
  dependents: { en: 'Dependents', es: 'Dependientes' },
  hasDependents: { en: 'Do you have dependents?', es: 'Tiene dependientes?' },
  addDependent: { en: 'Add Dependent', es: 'Agregar Dependiente' },
  removeDependent: { en: 'Remove', es: 'Eliminar' },
  dateOfBirth: { en: 'Date of Birth', es: 'Fecha de Nacimiento' },
  relationship: { en: 'Relationship', es: 'Parentesco' },
  documents: { en: 'Documents You Brought', es: 'Documentos que Trajo' },
  additionalNotes: { en: 'Additional Notes', es: 'Notas Adicionales' },
  notesPlaceholder: { en: 'Any additional information...', es: 'Informacion adicional...' },

  // Kiosk
  welcome: { en: 'Welcome', es: 'Bienvenido' },
  iHaveAppointment: { en: 'I have an appointment', es: 'Tengo una cita' },
  walkIn: { en: 'Walk-in', es: 'Sin cita' },
  enterPhone: { en: 'Enter your phone number', es: 'Ingrese su numero de telefono' },
  lookUpAppointment: { en: 'Look Up Appointment', es: 'Buscar Cita' },
  checkIn: { en: 'Check In', es: 'Registrarse' },
  yourName: { en: 'Your Name', es: 'Su Nombre' },
  serviceNeeded: { en: 'Service Needed', es: 'Servicio Necesario' },
  checkedIn: { en: 'You are checked in!', es: 'Esta registrado!' },
  queueNumber: { en: 'Your queue number', es: 'Su numero en la fila' },
  estimatedWait: { en: 'Estimated wait', es: 'Tiempo estimado de espera' },
  minutes: { en: 'minutes', es: 'minutos' },
  thankYou: { en: 'Thank you! Please have a seat.', es: 'Gracias! Por favor tome asiento.' },
  appointmentNotFound: { en: 'Appointment not found. Please check your phone number.', es: 'Cita no encontrada. Verifique su numero de telefono.' },

  // Queue
  waitingList: { en: 'Waiting List', es: 'Lista de Espera' },
  callNext: { en: 'Call Next', es: 'Llamar Siguiente' },
  call: { en: 'Call', es: 'Llamar' },
  complete: { en: 'Complete', es: 'Completar' },
  noShow: { en: 'No Show', es: 'No Se Presento' },
  avgWait: { en: 'Avg. Wait', es: 'Espera Prom.' },
  newCheckIn: { en: 'New check-in!', es: 'Nuevo registro!' },
  noOneWaiting: { en: 'No one is currently waiting.', es: 'Nadie esta esperando actualmente.' },
  preparer: { en: 'Preparer', es: 'Preparador' },

  // Assistant
  dashboard: { en: 'Dashboard', es: 'Panel de Control' },
  quickCheckIn: { en: 'Quick Check-In', es: 'Registro Rapido' },
  todayAppointments: { en: "Today's Appointments", es: 'Citas de Hoy' },
  missingDocs: { en: 'Missing Documents Alerts', es: 'Alertas de Documentos Faltantes' },
  tasks: { en: 'Tasks', es: 'Tareas' },
  noTasks: { en: 'No pending tasks', es: 'Sin tareas pendientes' },
  clientsWaiting: { en: 'clients waiting', es: 'clientes esperando' },
  appointmentsToday: { en: 'appointments today', es: 'citas hoy' },
};
