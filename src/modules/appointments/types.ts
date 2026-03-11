// Core appointment scheduling types

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface TimeSlot {
  start: string; // HH:mm format (e.g., "09:00")
  end: string;   // HH:mm format (e.g., "10:00")
}

export interface AvailabilityRule {
  id: string;
  dayOfWeek: DayOfWeek;
  timeSlots: TimeSlot[];
  isActive: boolean;
}

export interface DateOverride {
  id: string;
  date: string; // YYYY-MM-DD format
  isAvailable: boolean;
  timeSlots?: TimeSlot[]; // Custom time slots for this date
  reason?: string; // e.g., "Holiday", "Special Event"
}

export interface EventType {
  id: string;
  name: string;
  description: string;
  duration: number; // in minutes
  color: string;
  isActive: boolean;
  bufferTimeBefore?: number; // minutes
  bufferTimeAfter?: number; // minutes
  location?: string;
  locationType: 'in-person' | 'phone' | 'video' | 'custom';
  customLocationDetails?: string;
  maxBookingsPerDay?: number;
  requiresApproval: boolean;
  confirmationMessage?: string;
  reminderEnabled: boolean;
  questions?: CustomQuestion[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomQuestion {
  id: string;
  question: string;
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'phone' | 'email';
  options?: string[]; // For select/multiselect
  required: boolean;
  order: number;
}

export interface Appointment {
  id: string;
  eventTypeId: string;
  eventTypeName: string;
  hostId: string;
  hostName: string;
  hostEmail: string;
  
  // Guest information
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  guestTimezone: string;
  
  // Scheduling details
  startTime: Date;
  endTime: Date;
  duration: number; // in minutes
  timezone: string; // Host's timezone
  
  // Status and metadata
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no-show';
  cancellationReason?: string;
  cancelledBy?: 'host' | 'guest';
  cancelledAt?: Date;
  
  // Communication
  confirmationSentAt?: Date;
  reminderSentAt?: Date;
  notes?: string;
  
  // Custom responses
  customResponses?: Record<string, string>;
  
  // Meeting details
  location: string;
  locationType: 'in-person' | 'phone' | 'video' | 'custom';
  meetingLink?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingFormData {
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  guestTimezone: string;
  notes?: string;
  customResponses?: Record<string, string>;
}

// API Request/Response Types
export interface CreateAppointmentRequest {
  eventTypeId: string;
  eventTypeName: string;
  hostId: string;
  hostName: string;
  hostEmail: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  guestTimezone: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  timezone: string;
  status?: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no-show';
  notes?: string;
  location: string;
  locationType: 'in-person' | 'phone' | 'video' | 'custom';
  meetingLink?: string;
  customResponses?: Record<string, string>;
}

export interface UpdateAppointmentRequest {
  status?: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no-show';
  cancellationReason?: string;
  cancelledBy?: 'host' | 'guest';
  notes?: string;
  meetingLink?: string;
  processingNotes?: string;
}

export interface AvailabilitySettings {
  id: string;
  userId: string;
  timezone: string;
  
  // Weekly availability
  weeklyAvailability: AvailabilityRule[];
  
  // Date overrides (holidays, special days)
  dateOverrides: DateOverride[];
  
  // Booking window
  minimumNotice: number; // in hours
  maximumAdvance: number; // in days
  
  // Slot settings
  slotInterval: number; // in minutes (e.g., 15, 30, 60)
  
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduleSlot {
  datetime: Date;
  available: boolean;
  reason?: string; // Why it's unavailable (if applicable)
}

export interface BookingPageSettings {
  userId: string;
  customUrl: string; // e.g., "john-smith"
  displayName: string;
  welcomeMessage?: string;
  profileImage?: string;
  brandColor?: string;
  showProfileImage: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Statistics and analytics
export interface AppointmentStats {
  totalAppointments: number;
  confirmedAppointments: number;
  cancelledAppointments: number;
  completedAppointments: number;
  pendingAppointments: number;
  noShowAppointments: number;
  upcomingAppointments: number;
  todayAppointments: number;
  thisWeekAppointments: number;
  thisMonthAppointments: number;
}

// Calendar view types
export type CalendarView = 'day' | 'week' | 'month';

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  color: string;
  appointment: Appointment;
}