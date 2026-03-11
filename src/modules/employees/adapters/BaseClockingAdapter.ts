import type {
  IClockingAdapter,
  ClockingRecord,
  ParsedTimeEntry,
  AdapterConfig,
} from './IClockingAdapter';

export abstract class BaseClockingAdapter implements IClockingAdapter {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly supportedFormats: string[];
  abstract readonly version: string;

  protected config: AdapterConfig;

  constructor(config?: AdapterConfig) {
    this.config = { ...this.getDefaultConfig(), ...config };
  }

  getDefaultConfig(): AdapterConfig {
    return {
      dateFormat: 'YYYY-MM-DD',
      timeFormat: 'HH:mm:ss',
      timezone: 'local',
      hasHeader: true,
      delimiter: ',',
      employeeMatchStrategy: 'name',
    };
  }

  configure(config: AdapterConfig): void {
    this.config = { ...this.config, ...config };
  }

  async canHandle(file: File): Promise<boolean> {
    try {
      const content = await this.readFileAsText(file);
      return this.detectFormat(content);
    } catch (error) {
      console.error('Error checking if file can be handled:', error);
      return false;
    }
  }

  abstract detectFormat(content: string): boolean;

  async parse(file: File): Promise<ClockingRecord[]> {
    const content = await this.readFileAsText(file);
    return this.parseContent(content);
  }

  abstract parseContent(content: string): ClockingRecord[];

  processRecords(records: ClockingRecord[], employees: any[]): ParsedTimeEntry[] {
    const grouped = this.groupRecordsByEmployeeAndDate(records);
    const entries: ParsedTimeEntry[] = [];

    for (const [key, dayRecords] of grouped.entries()) {
      const [employeeIdentifier, date] = key.split('|');
      const entry = this.processDayRecords(employeeIdentifier, date, dayRecords, employees);
      entries.push(entry);
    }

    return entries;
  }

  protected groupRecordsByEmployeeAndDate(
    records: ClockingRecord[]
  ): Map<string, ClockingRecord[]> {
    const grouped = new Map<string, ClockingRecord[]>();

    for (const record of records) {
      const dateKey = this.formatDate(record.timestamp);
      const key = `${record.employeeIdentifier}|${dateKey}`;

      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(record);
    }

    // Sort records within each group by timestamp
    for (const records of grouped.values()) {
      records.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    }

    return grouped;
  }

  protected processDayRecords(
    employeeIdentifier: string,
    date: string,
    records: ClockingRecord[],
    employees: any[]
  ): ParsedTimeEntry {
    const matchedEmployee = this.matchEmployee(employeeIdentifier, employees);

    // Find clock-in and clock-out times
    const clockInRecord = records.find((r) => r.type === 'clock-in');
    const clockOutRecord = records.find((r) => r.type === 'clock-out');

    // Extract breaks
    const breaks = this.extractBreaks(records);

    let hoursWorked = 0;
    let clockIn = '';
    let clockOut = '';
    let status: 'matched' | 'unmatched' | 'error' = 'error';
    let errorMessage: string | undefined;

    try {
      if (!clockInRecord || !clockOutRecord) {
        throw new Error('Missing clock-in or clock-out record');
      }

      clockIn = this.formatTime(clockInRecord.timestamp);
      clockOut = this.formatTime(clockOutRecord.timestamp);
      hoursWorked = this.calculateHoursWorked(
        clockInRecord.timestamp,
        clockOutRecord.timestamp,
        breaks
      );

      status = matchedEmployee ? 'matched' : 'unmatched';
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      status = 'error';
    }

    return {
      employeeIdentifier,
      employeeName: matchedEmployee?.name || records[0]?.metadata?.name,
      date,
      clockIn,
      clockOut,
      hoursWorked,
      breaks,
      status,
      matchedEmployee,
      errorMessage,
    };
  }

  protected extractBreaks(
    records: ClockingRecord[]
  ): Array<{ start: string; end: string; duration: number }> {
    const breaks: Array<{ start: string; end: string; duration: number }> = [];
    let breakStart: ClockingRecord | null = null;

    for (const record of records) {
      if (record.type === 'break-start') {
        breakStart = record;
      } else if (record.type === 'break-end' && breakStart) {
        const duration = this.calculateMinutesBetween(breakStart.timestamp, record.timestamp);
        breaks.push({
          start: this.formatTime(breakStart.timestamp),
          end: this.formatTime(record.timestamp),
          duration,
        });
        breakStart = null;
      }
    }

    return breaks;
  }

  protected calculateHoursWorked(
    clockIn: Date,
    clockOut: Date,
    breaks?: Array<{ start: string; end: string; duration: number }>
  ): number {
    const totalMinutes = this.calculateMinutesBetween(clockIn, clockOut);
    const breakMinutes = breaks?.reduce((sum, brk) => sum + brk.duration, 0) || 0;
    const workedMinutes = totalMinutes - breakMinutes;
    return Math.round((workedMinutes / 60) * 100) / 100; // Round to 2 decimal places
  }

  protected calculateMinutesBetween(start: Date, end: Date): number {
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
  }

  protected matchEmployee(identifier: string, employees: any[]): any | null {
    if (!employees || employees.length === 0) {
      return null;
    }

    const strategy = this.config.employeeMatchStrategy || 'name';

    switch (strategy) {
      case 'id':
        return employees.find((emp) => emp.id === identifier) || null;
      case 'name':
        return this.matchByName(identifier, employees);
      case 'badge':
        return employees.find((emp) => emp.badgeNumber === identifier) || null;
      case 'email':
        return employees.find((emp) => emp.email === identifier) || null;
      default:
        return this.matchByName(identifier, employees);
    }
  }

  protected matchByName(name: string, employees: any[]): any | null {
    const normalizedName = this.normalizeName(name);

    // Try exact match first
    let match = employees.find(
      (emp) => this.normalizeName(emp.name) === normalizedName
    );

    if (match) return match;

    // Try partial match
    match = employees.find((emp) =>
      this.normalizeName(emp.name).includes(normalizedName)
    );

    if (match) return match;

    // Try reversed name (Last, First -> First Last)
    if (normalizedName.includes(',')) {
      const [last, first] = normalizedName.split(',').map((s) => s.trim());
      const reversedName = `${first} ${last}`;
      match = employees.find(
        (emp) => this.normalizeName(emp.name) === reversedName
      );
    }

    return match || null;
  }

  protected normalizeName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  protected formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  protected formatTime(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  protected async readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  }

  protected parseDateTime(dateStr: string, timeStr?: string): Date {
    if (!timeStr) {
      // Single string contains both date and time
      return new Date(dateStr);
    }
    return new Date(`${dateStr} ${timeStr}`);
  }
}
