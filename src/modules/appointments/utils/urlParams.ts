/**
 * Utility functions for handling URL query parameters in booking flow
 */
import { devLog } from '../../../services/utils';

export interface BookingUrlParams {
  // Service selection
  service?: string;           // Event type name or ID
  eventTypeId?: string;       // Specific event type ID
  
  // Date and time
  date?: string;              // Date in YYYY-MM-DD format
  time?: string;              // Time in HH:mm format
  datetime?: string;          // Combined datetime in ISO format
  
  // Contact information
  name?: string;              // Guest name
  email?: string;             // Guest email
  phone?: string;             // Guest phone
  
  // Additional info
  notes?: string;             // Pre-filled notes
  location?: string;          // Override location
  duration?: string;          // Override duration in minutes
  
  // Flow control
  step?: 'service' | 'datetime' | 'details' | 'confirmation';
  autoAdvance?: 'true' | 'false';  // Auto advance through steps
}

/**
 * Parse URL search parameters into booking parameters
 */
export function parseBookingParams(): BookingUrlParams {
  if (typeof window === 'undefined') return {};
  
  // For hash-based routing, extract query params from the hash
  const hash = window.location.hash;
  const queryStart = hash.indexOf('?');
  const queryString = queryStart >= 0 ? hash.substring(queryStart + 1) : '';
  
  const searchParams = new URLSearchParams(queryString);
  const params: BookingUrlParams = {};
  
  // Service selection
  if (searchParams.has('service')) params.service = searchParams.get('service')!;
  if (searchParams.has('eventTypeId')) params.eventTypeId = searchParams.get('eventTypeId')!;
  
  // Date and time
  if (searchParams.has('date')) params.date = searchParams.get('date')!;
  if (searchParams.has('time')) params.time = searchParams.get('time')!;
  if (searchParams.has('datetime')) params.datetime = searchParams.get('datetime')!;
  
  // Contact information
  if (searchParams.has('name')) params.name = decodeURIComponent(searchParams.get('name')!);
  if (searchParams.has('email')) params.email = searchParams.get('email')!;
  if (searchParams.has('phone')) params.phone = searchParams.get('phone')!;
  
  // Additional info
  if (searchParams.has('notes')) params.notes = decodeURIComponent(searchParams.get('notes')!);
  if (searchParams.has('location')) params.location = decodeURIComponent(searchParams.get('location')!);
  if (searchParams.has('duration')) params.duration = searchParams.get('duration')!;
  
  // Flow control
  if (searchParams.has('step')) params.step = searchParams.get('step') as any;
  if (searchParams.has('autoAdvance')) params.autoAdvance = searchParams.get('autoAdvance') as any;
  
  return params;
}

/**
 * Parse date string in various formats to Date object
 */
export function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  try {
    // Try ISO format first
    if (dateStr.includes('T') || dateStr.includes('Z')) {
      return new Date(dateStr);
    }
    
    // Try YYYY-MM-DD format
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return new Date(dateStr + 'T00:00:00');
    }
    
    // Try MM/DD/YYYY format
    if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
      return new Date(dateStr);
    }
    
    // Try parsing as-is
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
    
    return null;
  } catch (error) {
    devLog('Failed to parse date:', dateStr, error);
    return null;
  }
}

/**
 * Parse time string in various formats
 */
export function parseTime(timeStr: string): { hours: number; minutes: number } | null {
  if (!timeStr) return null;
  
  try {
    // Handle 24-hour format (HH:mm or H:mm)
    const time24Match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (time24Match) {
      const hours = parseInt(time24Match[1], 10);
      const minutes = parseInt(time24Match[2], 10);
      if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
        return { hours, minutes };
      }
    }
    
    // Handle 12-hour format (H:mm AM/PM or HH:mm AM/PM)
    const time12Match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (time12Match) {
      let hours = parseInt(time12Match[1], 10);
      const minutes = parseInt(time12Match[2], 10);
      const period = time12Match[3].toUpperCase();
      
      if (period === 'PM' && hours < 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      
      if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
        return { hours, minutes };
      }
    }
    
    return null;
  } catch (error) {
    devLog('Failed to parse time:', timeStr, error);
    return null;
  }
}

/**
 * Combine date and time into a single Date object
 */
export function combineDateAndTime(date: Date, time: { hours: number; minutes: number }): Date {
  const combined = new Date(date);
  combined.setHours(time.hours, time.minutes, 0, 0);
  return combined;
}

/**
 * Generate a booking URL with parameters
 */
export function generateBookingUrl(baseUrl: string, params: BookingUrlParams): string {
  const url = new URL(baseUrl, window.location.origin);
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  
  return url.toString();
}

/**
 * Create a shareable booking link
 */
export function createShareableLink(
  hostId: string,
  eventTypeId: string,
  options: Partial<BookingUrlParams> = {}
): string {
  const baseUrl = `${window.location.origin}/#/mobile-book/${hostId}`;
  const params: BookingUrlParams = {
    eventTypeId,
    ...options
  };
  
  return generateBookingUrl(baseUrl, params);
}

/**
 * Validate booking parameters
 */
export function validateBookingParams(params: BookingUrlParams): string[] {
  const errors: string[] = [];
  
  // Validate date
  if (params.date && !parseDate(params.date)) {
    errors.push('Invalid date format. Use YYYY-MM-DD or ISO format.');
  }
  
  // Validate time
  if (params.time && !parseTime(params.time)) {
    errors.push('Invalid time format. Use HH:mm or HH:mm AM/PM.');
  }
  
  // Validate email
  if (params.email && !isValidEmail(params.email)) {
    errors.push('Invalid email format.');
  }
  
  // Validate duration
  if (params.duration) {
    const duration = parseInt(params.duration, 10);
    if (isNaN(duration) || duration <= 0 || duration > 480) {
      errors.push('Duration must be between 1 and 480 minutes.');
    }
  }
  
  return errors;
}

/**
 * Simple email validation
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Format date for URL parameter
 */
export function formatDateForUrl(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Format time for URL parameter
 */
export function formatTimeForUrl(date: Date): string {
  return date.toTimeString().slice(0, 5);
}

/**
 * Format datetime for URL parameter
 */
export function formatDateTimeForUrl(date: Date): string {
  return date.toISOString();
}