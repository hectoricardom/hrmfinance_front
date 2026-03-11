export interface TimeEntry {
  id: string;
  date: string;
  project: string;
  task: string;
  hours: number;
  startTime?: string;  // HH:MM format
  endTime?: string;    // HH:MM format
  notes?: string;
  clockInMode?: ClockMode;
  clockOutMode?: ClockMode;
  employeeId?: string;
  employeeName?: string;
}

// Clock-in/out authentication modes
export type ClockMode = 'facial' | 'fingerprint' | 'pin' | 'nfc' | 'unknown';

export const CLOCK_MODE_CODES: Record<number, ClockMode> = {
  52: 'facial',      // Facial recognition
  42: 'fingerprint', // Fingerprint
  34: 'pin',         // PIN code
  18: 'nfc'          // NFC card
};

export const CLOCK_MODE_LABELS: Record<ClockMode, string> = {
  facial: 'Facial Recognition',
  fingerprint: 'Fingerprint',
  pin: 'PIN Code',
  nfc: 'NFC Card',
  unknown: 'Unknown'
};

export const CLOCK_MODE_ICONS: Record<ClockMode, string> = {
  facial: '👤',
  fingerprint: '👆',
  pin: '🔢',
  nfc: '💳',
  unknown: '❓'
};

export function parseClockMode(code: number | string): ClockMode {
  const numCode = typeof code === 'string' ? parseInt(code, 10) : code;
  return CLOCK_MODE_CODES[numCode] || 'unknown';
}

export function calculateHours(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0;
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  const diff = endMinutes - startMinutes;
  return diff > 0 ? Math.round(diff / 30) * 0.5 : 0; // Round to nearest 0.5
}

export function formatTimeRange(startTime?: string, endTime?: string): string {
  if (!startTime || !endTime) return '';
  return `${startTime} - ${endTime}`;
}

export interface DayEntry {
  date: string;
  dayName: string;
  entries: TimeEntry[];
  totalHours: number;
}

export interface WeekData {
  weekStart: string;
  weekEnd: string;
  days: DayEntry[];
  totalHours: number;
}

export const SAMPLE_PROJECTS = [
  'Website Redesign',
  'Mobile App',
  'API Development',
  'Client Support',
  'Internal Tools',
  'Documentation'
];

export const SAMPLE_TASKS = [
  'Development',
  'Code Review',
  'Testing',
  'Meetings',
  'Planning',
  'Bug Fixes'
];

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export function getWeekDates(weekOffset: number = 0): string[] {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + (weekOffset * 7));

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
}

export function getCurrentWeekDates(): string[] {
  return getWeekDates(0);
}

export function getWeekRange(weekOffset: number = 0): { start: Date; end: Date; label: string } {
  const dates = getWeekDates(weekOffset);
  const start = new Date(dates[0]);
  const end = new Date(dates[6]);

  const formatOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const startStr = start.toLocaleDateString('en-US', formatOptions);
  const endStr = end.toLocaleDateString('en-US', { ...formatOptions, year: 'numeric' });

  return {
    start,
    end,
    label: `${startStr} - ${endStr}`
  };
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function getDayName(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}
