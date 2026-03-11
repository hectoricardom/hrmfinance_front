import type {
  AvailabilitySettings,
  EventType,
  Appointment,
  ScheduleSlot,
  TimeSlot,
  DayOfWeek
} from '../types';
import { devLog } from '../../../services/utils';

/**
 * Service for handling scheduling logic, time slot generation, and availability checks
 */

const DAY_OF_WEEK_MAP: Record<number, DayOfWeek> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday'
};

export const schedulingService = {
  /**
   * Generate available time slots for a specific date and event type
   */
  generateTimeSlots(
    date: Date,
    eventType: EventType,
    availability: AvailabilitySettings,
    existingAppointments: Appointment[]
  ): ScheduleSlot[] {
    const slots: ScheduleSlot[] = [];
    
    // Check if date is within booking window
    const now = new Date();
    const minDate = new Date(now.getTime() + availability.minimumNotice * 60 * 60 * 1000);
    const maxDate = new Date(now.getTime() + availability.maximumAdvance * 24 * 60 * 60 * 1000);
    
    if (date < minDate) {
      return [{
        datetime: date,
        available: false,
        reason: `Minimum ${availability.minimumNotice} hours notice required`
      }];
    }
    
    if (date > maxDate) {
      return [{
        datetime: date,
        available: false,
        reason: `Cannot book more than ${availability.maximumAdvance} days in advance`
      }];
    }

    // Get day of week
    const dayOfWeek = DAY_OF_WEEK_MAP[date.getDay()];
    
    // Check for date override first
    const dateStr = schedulingService.formatDate(date);
    const override = availability.dateOverrides.find(o => o.date === dateStr);
    
    if (override && !override.isAvailable) {
      return [{
        datetime: date,
        available: false,
        reason: override.reason || 'Unavailable'
      }];
    }

    // Get time slots for this day
    let timeSlots: TimeSlot[] = [];
    
    if (override && override.timeSlots) {
      timeSlots = override.timeSlots;
    } else {
      const weeklyRule = availability.weeklyAvailability.find(r => r.dayOfWeek === dayOfWeek);
      if (!weeklyRule || !weeklyRule.isActive) {
        return [{
          datetime: date,
          available: false,
          reason: 'Not available on this day'
        }];
      }
      timeSlots = weeklyRule.timeSlots;
    }

    // Generate slots based on time ranges and interval
    for (const timeSlot of timeSlots) {
      const slotsInRange = schedulingService.generateSlotsInRange(
        date,
        timeSlot,
        availability.slotInterval,
        eventType.duration
      );
      slots.push(...slotsInRange);
    }

    // Check each slot against existing appointments
 
    const checkedSlots = slots.map(slot => {
      const isAvailable = schedulingService.isSlotAvailable(
        slot.datetime,
        eventType,
        existingAppointments
      );
      
      if (!isAvailable) {
        devLog(`Slot ${slot.datetime.toISOString()} blocked by existing appointment`);
      }
      
      return {
        ...slot,
        available: isAvailable,
        reason: isAvailable ? undefined : 'Already booked'
      };
    });

    return checkedSlots.sort((a, b) => a.datetime.getTime() - b.datetime.getTime());
  },

  /**
   * Generate time slots within a time range
   */
  generateSlotsInRange(
    date: Date,
    timeSlot: TimeSlot,
    interval: number,
    eventDuration: number
  ): ScheduleSlot[] {
    const slots: ScheduleSlot[] = [];
    const startTime = schedulingService.parseTime(timeSlot.start);
    const endTime = schedulingService.parseTime(timeSlot.end);
    
    let currentMinutes = startTime;
    
    // Generate slots up to the point where an event can fit
    while (currentMinutes + eventDuration <= endTime) {
      const slotDate = new Date(date);
      slotDate.setHours(Math.floor(currentMinutes / 60), currentMinutes % 60, 0, 0);
      
      slots.push({
        datetime: slotDate,
        available: true
      });
      
      currentMinutes += interval;
    }
    
    return slots;
  },

  /**
   * Check if a specific slot is available
   */
  isSlotAvailable(
    slotTime: Date,
    eventType: EventType,
    existingAppointments: Appointment[]
  ): boolean {
    const slotStart = slotTime.getTime();
    const slotEnd = slotStart + eventType.duration * 60 * 1000;
    
    // Add buffer times
    const bufferBefore = (eventType.bufferTimeBefore || 0) * 60 * 1000;
    const bufferAfter = (eventType.bufferTimeAfter || 0) * 60 * 1000;
    
    const effectiveStart = slotStart - bufferBefore;
    const effectiveEnd = slotEnd + bufferAfter;

    // Check if slot overlaps with any existing appointment
    for (const appointment of existingAppointments) {
      if (appointment.status === 'cancelled') continue;
      
      const aptStart = appointment.startTime.getTime();
      const aptEnd = appointment.endTime.getTime();
      
      // Check for overlap
      if (effectiveStart < aptEnd && effectiveEnd > aptStart) {
      /*
        console.log(`🚫 Slot ${slotTime.toISOString()} conflicts with appointment:`, {
          slotTime: slotTime.toISOString(),
          appointmentStart: appointment.startTime.toISOString(),
          appointmentEnd: appointment.endTime.toISOString(),
          appointmentId: appointment.id,
          eventTypeName: appointment.eventTypeName
        });
        */
        return false;
      }
    }

    // Check max bookings per day if set
    if (eventType.maxBookingsPerDay) {
      const dayStart = new Date(slotTime);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const bookingsToday = existingAppointments.filter(apt => 
        apt.eventTypeId === eventType.id &&
        apt.status !== 'cancelled' &&
        apt.startTime >= dayStart &&
        apt.startTime < dayEnd
      ).length;

      if (bookingsToday >= eventType.maxBookingsPerDay) {
        return false;
      }
    }

    return true;
  },

  /**
   * Parse time string (HH:mm) to minutes
   */
  parseTime(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  },

  /**
   * Format time from minutes to HH:mm
   */
  formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  },

  /**
   * Format date to YYYY-MM-DD
   */
  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * Parse date string YYYY-MM-DD to Date
   */
  parseDate(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  },

  /**
   * Get available dates within a date range
   */
  getAvailableDates(
    startDate: Date,
    endDate: Date,
    availability: AvailabilitySettings
  ): Date[] {
    const availableDates: Date[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateStr = schedulingService.formatDate(currentDate);
      const dayOfWeek = DAY_OF_WEEK_MAP[currentDate.getDay()];
      
      // Check date override
      const override = availability.dateOverrides.find(o => o.date === dateStr);
      if (override && !override.isAvailable) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }
      
      // Check weekly availability
      if (override && override.isAvailable) {
        availableDates.push(new Date(currentDate));
      } else {
        const weeklyRule = availability.weeklyAvailability.find(r => r.dayOfWeek === dayOfWeek);
        if (weeklyRule && weeklyRule.isActive && weeklyRule.timeSlots.length > 0) {
          availableDates.push(new Date(currentDate));
        }
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return availableDates;
  },

  /**
   * Calculate end time for appointment
   */
  calculateEndTime(startTime: Date, duration: number): Date {
    return new Date(startTime.getTime() + duration * 60 * 1000);
  },

  /**
   * Format datetime for display
   */
  formatDateTime(date: Date, format: 'short' | 'long' = 'short'): string {
    if (format === 'short') {
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } else {
      return date.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
  },

  /**
   * Format duration in minutes to human-readable format
   */
  formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) {
      return `${hours} hr`;
    }
    return `${hours} hr ${mins} min`;
  },

  /**
   * Get timezone offset string
   */
  getTimezoneOffset(timezone: string): string {
    try {
      const date = new Date();
      const options: Intl.DateTimeFormatOptions = {
        timeZone: timezone,
        timeZoneName: 'short'
      };
      const formatter = new Intl.DateTimeFormat('en-US', options);
      const parts = formatter.formatToParts(date);
      const timeZonePart = parts.find(part => part.type === 'timeZoneName');
      return timeZonePart?.value || '';
    } catch (error) {
      return '';
    }
  },

  /**
   * Check if a date is today
   */
  isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  },

  /**
   * Check if a date is tomorrow
   */
  isTomorrow(date: Date): boolean {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return date.getDate() === tomorrow.getDate() &&
           date.getMonth() === tomorrow.getMonth() &&
           date.getFullYear() === tomorrow.getFullYear();
  },

  /**
   * Get calendar weeks for a month
   */
  getCalendarWeeks(year: number, month: number): Date[][] {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const weeks: Date[][] = [];
    
    // Start from the first day of the week containing the first day of the month
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    let currentDate = new Date(startDate);
    
    while (currentDate <= lastDay || currentDate.getMonth() === month) {
      const week: Date[] = [];
      for (let i = 0; i < 7; i++) {
        week.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }
      weeks.push(week);
      
      // Break if we've passed the last day and completed the week
      if (currentDate > lastDay && currentDate.getDay() === 0) {
        break;
      }
    }
    
    return weeks;
  },

  /**
   * Generate a unique booking reference
   */
  generateBookingReference(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let reference = '';
    for (let i = 0; i < 8; i++) {
      reference += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return reference;
  }
};