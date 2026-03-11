import { BaseClockingAdapter } from './BaseClockingAdapter';
import type { ClockingRecord, AdapterConfig } from './IClockingAdapter';

/**
 * Adapter for FaceTime clock format
 * Expected format: Tab-delimited with columns:
 * No, Mchn, EnNo, Name, Mode, IOMd, DateTime
 * DateTime format: "YYYY/MM/DD  HH:MM:SS"
 */
export class FaceTimeAdapter extends BaseClockingAdapter {
  readonly id = 'facetime';
  readonly name = 'FaceTime Clock';
  readonly supportedFormats = ['.txt', '.tab', '.tsv'];
  readonly version = '1.0.0';

  private readonly EXPECTED_HEADERS = ['No', 'Mchn', 'EnNo', 'Name', 'Mode', 'IOMd', 'DateTime'];

  constructor(config?: AdapterConfig) {
    super(config);
  }

  detectFormat(content: string): boolean {
    const lines = content.trim().split('\n');
    if (lines.length === 0) return false;

    const firstLine = lines[0];

    // Check if it's tab-delimited
    if (!firstLine.includes('\t')) return false;

    // Check for expected headers - split by one or more tabs and filter empty strings
    const headers = firstLine.split(/\t+/).map((h) => h.trim()).filter(h => h !== '');

    // Match expected headers (case-insensitive, flexible order)
    const hasRequiredHeaders = this.EXPECTED_HEADERS.every((expectedHeader) =>
      headers.some((header) => header.toLowerCase() === expectedHeader.toLowerCase())
    );

    if (!hasRequiredHeaders) return false;

    // Check if there's data and it matches the format
    if (lines.length > 1) {
      const dataLine = lines[1].split(/\t+/).map(col => col.trim()).filter(col => col !== '');
      // Should have 7 columns
      if (dataLine.length !== 7) return false;

      // Check if DateTime column matches expected format (last column)
      const dateTimeCol = dataLine[dataLine.length - 1];
      if (dateTimeCol) {
        // FaceTime format: "YYYY/MM/DD  HH:MM:SS" (note double space)
        const faceTimePattern = /^\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2}$/;
        return faceTimePattern.test(dateTimeCol);
      }
    }

    return true;
  }

  parseContent(content: string): ClockingRecord[] {
    const lines = content.trim().split('\n');
    if (lines.length < 2) return [];

    // Skip header row
    const dataLines = lines.slice(1);
    const records: ClockingRecord[] = [];

    // Group records by employee to determine clock-in/out sequence
    const employeeRecords = new Map<string, ClockingRecord[]>();

    for (const line of dataLines) {
      if (!line.trim()) continue;

      // Split by one or more tabs and filter out empty strings
      const columns = line.split(/\t+/).map((col) => col.trim()).filter(col => col !== '');
      if (columns.length !== 7) continue;

      const [no, mchn, enNo, name, mode, ioMd, dateTime] = columns;

      // Parse datetime: "YYYY/MM/DD  HH:MM:SS"
      const timestamp = this.parseFaceTimeDateTime(dateTime);
      if (!timestamp) {
        console.warn(`Invalid datetime format: ${dateTime}`);
        continue;
      }

      const record: ClockingRecord = {
        employeeIdentifier: enNo || name,
        timestamp,
        type: 'clock-in', // Will be determined later based on sequence
        source: this.id,
        rawData: { no, mchn, enNo, name, mode, ioMd, dateTime },
        metadata: {
          name,
          badgeNumber: enNo,
          machineId: mchn,
          mode,
          ioMode: ioMd,
        },
      };

      if (!employeeRecords.has(record.employeeIdentifier)) {
        employeeRecords.set(record.employeeIdentifier, []);
      }
      employeeRecords.get(record.employeeIdentifier)!.push(record);
    }

    // Determine clock-in/out based on alternating sequence
    for (const [identifier, empRecords] of employeeRecords.entries()) {
      // Sort by timestamp
      empRecords.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      // Group by date
      const dateGroups = new Map<string, ClockingRecord[]>();
      for (const record of empRecords) {
        const dateKey = this.formatDate(record.timestamp);
        if (!dateGroups.has(dateKey)) {
          dateGroups.set(dateKey, []);
        }
        dateGroups.get(dateKey)!.push(record);
      }

      // Process each day
      for (const dayRecords of dateGroups.values()) {
        for (let i = 0; i < dayRecords.length; i++) {
          // Alternate between clock-in and clock-out
          if (i % 2 === 0) {
            dayRecords[i].type = 'clock-in';
          } else {
            dayRecords[i].type = 'clock-out';
          }
          records.push(dayRecords[i]);
        }
      }
    }

    return records;
  }

  private parseFaceTimeDateTime(dateTimeStr: string): Date | null {
    try {
      // Format: "YYYY/MM/DD  HH:MM:SS" (note double space)
      // Replace multiple spaces with single space for easier parsing
      const normalized = dateTimeStr.trim().replace(/\s+/g, ' ');
      const [datePart, timePart] = normalized.split(' ');

      if (!datePart || !timePart) return null;

      // Parse date part: YYYY/MM/DD
      const [year, month, day] = datePart.split('/').map(Number);

      // Parse time part: HH:MM:SS
      const [hours, minutes, seconds] = timePart.split(':').map(Number);

      // Create date object
      const date = new Date(year, month - 1, day, hours, minutes, seconds);

      // Validate
      if (isNaN(date.getTime())) return null;

      return date;
    } catch (error) {
      console.error('Error parsing FaceTime datetime:', error);
      return null;
    }
  }

  getDefaultConfig(): AdapterConfig {
    return {
      ...super.getDefaultConfig(),
      hasHeader: true,
      delimiter: '\t',
      employeeMatchStrategy: 'name',
      dateFormat: 'YYYY/MM/DD',
      timeFormat: 'HH:MM:SS',
    };
  }
}
