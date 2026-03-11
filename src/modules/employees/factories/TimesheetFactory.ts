import { WeeklyTimesheet, DailyTimeEntry } from '../types/timesheetTypes';

/**
 * Parsed time entry from import file
 */
export interface ParsedTimeEntry {
  employeeName: string;
  date: string; // ISO date string
  startTime?: string;
  endTime?: string;
  hoursWorked: number;
  overtimeHours?: number;
  notes?: string;
}

/**
 * Factory class for creating and manipulating WeeklyTimesheet objects
 */
export class TimesheetFactory {
  /**
   * Create an empty timesheet for a specific employee and week
   * @param options - Employee ID and week start date
   * @returns Empty weekly timesheet
   */
  static createEmpty(options: { employeeId: string; weekStartDate: string }): WeeklyTimesheet {
    const { employeeId, weekStartDate } = options;
    const start = new Date(weekStartDate);

    // Calculate week end date (Sunday)
    const sunday = new Date(start);
    sunday.setDate(start.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    const weekEndDate = sunday.toISOString().split('T')[0];

    // Generate dates for each day of the week
    const dates = this.generateWeekDates(weekStartDate);

    return {
      id: `timesheet-${employeeId}-${weekStartDate}-${weekEndDate}`,
      employeeId,
      weekStartDate,
      weekEndDate,
      dailyEntries: {
        monday: this.createEmptyDailyEntry(dates.monday),
        tuesday: this.createEmptyDailyEntry(dates.tuesday),
        wednesday: this.createEmptyDailyEntry(dates.wednesday),
        thursday: this.createEmptyDailyEntry(dates.thursday),
        friday: this.createEmptyDailyEntry(dates.friday),
        saturday: this.createEmptyDailyEntry(dates.saturday),
        sunday: this.createEmptyDailyEntry(dates.sunday),
      },
      status: 'draft',
      totalHours: 0,
      totalOvertimeHours: 0,
    };
  }

  /**
   * Create a timesheet from imported time entries
   * @param options - Parsed entries, employee info, and week start date
   * @returns Weekly timesheet populated with imported data
   */
  static createFromImport(options: {
    entries: ParsedTimeEntry[];
    employee: { id: string; name: string };
    weekStartDate: string;
  }): WeeklyTimesheet {
    const { entries, employee, weekStartDate } = options;

    // Start with an empty timesheet
    const timesheet = this.createEmpty({
      employeeId: employee.id,
      weekStartDate,
    });

    // Map entries to daily entries
    const dates = this.generateWeekDates(weekStartDate);
    const dayMap: Record<string, keyof WeeklyTimesheet['dailyEntries']> = {
      [dates.monday]: 'monday',
      [dates.tuesday]: 'tuesday',
      [dates.wednesday]: 'wednesday',
      [dates.thursday]: 'thursday',
      [dates.friday]: 'friday',
      [dates.saturday]: 'saturday',
      [dates.sunday]: 'sunday',
    };

    // Populate daily entries from parsed entries
    entries.forEach((entry) => {
      const dayKey = dayMap[entry.date];
      if (dayKey && timesheet.dailyEntries[dayKey]) {
        timesheet.dailyEntries[dayKey] = {
          date: entry.date,
          entryMode: entry.startTime && entry.endTime ? 'clock' : 'hours',
          startTime: entry.startTime || '',
          endTime: entry.endTime || '',
          hoursWorked: entry.hoursWorked,
          overtimeHours: entry.overtimeHours || 0,
          notes: entry.notes || '',
        };
      }
    });

    // Recalculate totals
    this.recalculateTotals(timesheet);

    return timesheet;
  }

  /**
   * Clone a timesheet for a different week
   * @param source - Source timesheet to clone
   * @param newWeekStartDate - New week start date
   * @returns Cloned timesheet with new week dates and empty entries
   */
  static cloneForWeek(source: WeeklyTimesheet, newWeekStartDate: string): WeeklyTimesheet {
    const cloned = this.createEmpty({
      employeeId: source.employeeId,
      weekStartDate: newWeekStartDate,
    });

    // Copy entry modes from source (but not actual times/hours)
    const days: Array<keyof WeeklyTimesheet['dailyEntries']> = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ];

    days.forEach((day) => {
      cloned.dailyEntries[day].entryMode = source.dailyEntries[day].entryMode;
    });

    return cloned;
  }

  /**
   * Merge multiple timesheets into a single timesheet
   * Useful for consolidating partial weeks or overlapping entries
   * @param timesheets - Array of timesheets to merge
   * @returns Merged timesheet (uses first timesheet as base)
   */
  static merge(timesheets: WeeklyTimesheet[]): WeeklyTimesheet {
    if (timesheets.length === 0) {
      throw new Error('Cannot merge empty array of timesheets');
    }

    if (timesheets.length === 1) {
      return timesheets[0];
    }

    // Use first timesheet as base
    const merged = { ...timesheets[0] };

    // Merge entries from other timesheets
    const days: Array<keyof WeeklyTimesheet['dailyEntries']> = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ];

    timesheets.slice(1).forEach((timesheet) => {
      days.forEach((day) => {
        const existingEntry = merged.dailyEntries[day];
        const newEntry = timesheet.dailyEntries[day];

        // Only merge if existing entry is empty and new entry has data
        if (existingEntry.hoursWorked === 0 && newEntry.hoursWorked > 0) {
          merged.dailyEntries[day] = { ...newEntry };
        } else if (existingEntry.hoursWorked > 0 && newEntry.hoursWorked > 0) {
          // If both have data, sum the hours
          merged.dailyEntries[day] = {
            ...existingEntry,
            hoursWorked: existingEntry.hoursWorked + newEntry.hoursWorked,
            overtimeHours: (existingEntry.overtimeHours || 0) + (newEntry.overtimeHours || 0),
            notes: existingEntry.notes
              ? `${existingEntry.notes}; ${newEntry.notes || ''}`
              : newEntry.notes,
          };
        }
      });
    });

    // Recalculate totals
    this.recalculateTotals(merged);

    return merged;
  }

  /**
   * Calculate hours worked from start and end times
   * @param startTime - Start time (HH:MM format)
   * @param endTime - End time (HH:MM format)
   * @returns Hours worked (rounded to 2 decimal places)
   */
  static calculateHoursFromTimes(startTime: string, endTime: string): number {
    if (!startTime || !endTime) return 0;

    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    let diffMinutes = endMinutes - startMinutes;

    // Handle cases where end time is next day (e.g., night shift)
    if (diffMinutes < 0) {
      diffMinutes += 24 * 60;
    }

    return Number((diffMinutes / 60).toFixed(2));
  }

  /**
   * Get the week start date (Monday) for a given date
   * @param date - Any date
   * @returns ISO date string for Monday of that week
   */
  static getWeekStartDate(date: Date | string): string {
    const current = typeof date === 'string' ? new Date(date) : new Date(date);

    const day = current.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Adjust when day is Sunday

    const monday = new Date(current);
    monday.setDate(current.getDate() + diff);
    monday.setHours(0, 0, 0, 0);

    return monday.toISOString().split('T')[0];
  }

  /**
   * Get the week end date (Sunday) for a given date
   * @param date - Any date
   * @returns ISO date string for Sunday of that week
   */
  static getWeekEndDate(date: Date | string): string {
    const weekStart = this.getWeekStartDate(date);
    const monday = new Date(weekStart);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return sunday.toISOString().split('T')[0];
  }

  /**
   * Format a date as ISO string (YYYY-MM-DD)
   * @param date - Date to format
   * @returns ISO date string
   */
  static formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Generate dates for all days of a week
   * @param weekStartDate - Monday of the week
   * @returns Object with dates for each day of the week
   */
  private static generateWeekDates(weekStartDate: string): Record<
    'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday',
    string
  > {
    const start = new Date(weekStartDate);

    return {
      monday: this.formatDate(new Date(start.getTime() + 86400000 * 0)),
      tuesday: this.formatDate(new Date(start.getTime() + 86400000 * 1)),
      wednesday: this.formatDate(new Date(start.getTime() + 86400000 * 2)),
      thursday: this.formatDate(new Date(start.getTime() + 86400000 * 3)),
      friday: this.formatDate(new Date(start.getTime() + 86400000 * 4)),
      saturday: this.formatDate(new Date(start.getTime() + 86400000 * 5)),
      sunday: this.formatDate(new Date(start.getTime() + 86400000 * 6)),
    };
  }

  /**
   * Create an empty daily entry
   * @param date - ISO date string
   * @returns Empty daily time entry
   */
  private static createEmptyDailyEntry(date: string): DailyTimeEntry {
    return {
      date,
      entryMode: 'clock',
      startTime: '',
      endTime: '',
      hoursWorked: 0,
      overtimeHours: 0,
      notes: '',
    };
  }

  /**
   * Recalculate total hours and overtime hours for a timesheet
   * @param timesheet - Timesheet to recalculate
   */
  private static recalculateTotals(timesheet: WeeklyTimesheet): void {
    const entries = Object.values(timesheet.dailyEntries);
    timesheet.totalHours = entries.reduce((sum, entry) => sum + entry.hoursWorked, 0);
    timesheet.totalOvertimeHours = entries.reduce(
      (sum, entry) => sum + (entry.overtimeHours || 0),
      0
    );
  }
}
