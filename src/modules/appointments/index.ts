// Appointments Module - Entry point for all appointments features

// Types
export type {
  Appointment,
  EventType,
  AvailabilitySettings,
  BookingFormData,
  ScheduleSlot,
  AppointmentStats,
  BookingPageSettings,
  AvailabilityRule,
  DateOverride,
  TimeSlot,
  DayOfWeek,
  CustomQuestion,
  CalendarView,
  CalendarEvent
} from './types';

// Store
export { appointmentStore } from './stores/appointmentStore';

// Services
export { schedulingService } from './services/schedulingService';

// Components
export { default as EventTypeManager } from './components/EventTypeManager';
export { default as BookingPage } from './components/BookingPage';
export { default as AppointmentDashboard } from './components/AppointmentDashboard';
export { default as AvailabilitySettingsPage } from './components/AvailabilitySettings';