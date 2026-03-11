import { BaseClockingAdapter } from './BaseClockingAdapter';
import type { ClockingRecord, AdapterConfig } from './IClockingAdapter';

/**
 * Generic CSV adapter with configurable column mapping
 * Supports various CSV formats with flexible configuration
 */
export class GenericCSVAdapter extends BaseClockingAdapter {
  readonly id = 'generic-csv';
  readonly name = 'Generic CSV';
  readonly supportedFormats = ['.csv', '.txt'];
  readonly version = '1.0.0';

  private columnIndices: Map<string, number> = new Map();

  constructor(config?: AdapterConfig) {
    super(config);
  }

  getDefaultConfig(): AdapterConfig {
    return {
      ...super.getDefaultConfig(),
      hasHeader: true,
      delimiter: ',',
      employeeMatchStrategy: 'name',
      columnMapping: {
        employeeId: 'Employee ID',
        employeeName: 'Employee Name',
        date: 'Date',
        time: 'Time',
        datetime: 'DateTime',
        type: 'Type',
        action: 'Action',
      },
    };
  }

  detectFormat(content: string): boolean {
    const lines = content.trim().split('\n');
    if (lines.length === 0) return false;

    const firstLine = lines[0];
    const delimiter = this.detectDelimiter(firstLine);

    if (!delimiter) return false;

    // Must have at least 3 columns
    const columns = firstLine.split(delimiter);
    if (columns.length < 3) return false;

    // If we have headers, check for common clock-related terms
    if (this.config.hasHeader) {
      const normalizedHeaders = columns.map((h) => h.toLowerCase().trim());
      const hasClockingTerms = normalizedHeaders.some((header) =>
        /employee|time|clock|date|name|id|badge/.test(header)
      );
      return hasClockingTerms;
    }

    // If no header, check if second line looks like data
    if (lines.length > 1) {
      const dataLine = lines[1].split(delimiter);
      return dataLine.length === columns.length;
    }

    return true;
  }

  parseContent(content: string): ClockingRecord[] {
    const lines = content.trim().split('\n');
    if (lines.length === 0) return [];

    const delimiter = this.config.delimiter || this.detectDelimiter(lines[0]) || ',';
    let startIndex = 0;

    // Parse headers if present
    if (this.config.hasHeader) {
      const headers = lines[0].split(delimiter).map((h) => h.trim());
      this.mapColumns(headers);
      startIndex = 1;
    } else {
      // Use default column indices from config
      this.mapColumnsFromConfig();
    }

    const records: ClockingRecord[] = [];
    const employeeRecords = new Map<string, ClockingRecord[]>();

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const columns = this.parseCSVLine(line, delimiter);
      const record = this.parseRecord(columns, i);

      if (record) {
        if (!employeeRecords.has(record.employeeIdentifier)) {
          employeeRecords.set(record.employeeIdentifier, []);
        }
        employeeRecords.get(record.employeeIdentifier)!.push(record);
      }
    }

    // Determine clock types based on sequence
    for (const empRecords of employeeRecords.values()) {
      empRecords.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      const dateGroups = new Map<string, ClockingRecord[]>();
      for (const record of empRecords) {
        const dateKey = this.formatDate(record.timestamp);
        if (!dateGroups.has(dateKey)) {
          dateGroups.set(dateKey, []);
        }
        dateGroups.get(dateKey)!.push(record);
      }

      for (const dayRecords of dateGroups.values()) {
        for (let i = 0; i < dayRecords.length; i++) {
          // If type is already set from the data, keep it
          if (dayRecords[i].rawData?.type) {
            continue;
          }
          // Otherwise alternate between clock-in and clock-out
          dayRecords[i].type = i % 2 === 0 ? 'clock-in' : 'clock-out';
        }
        records.push(...dayRecords);
      }
    }

    return records;
  }

  private parseRecord(columns: string[], lineNumber: number): ClockingRecord | null {
    try {
      const employeeId = this.getColumnValue(columns, 'employeeId');
      const employeeName = this.getColumnValue(columns, 'employeeName');
      const employeeIdentifier = employeeId || employeeName;

      if (!employeeIdentifier) {
        console.warn(`Line ${lineNumber}: No employee identifier found`);
        return null;
      }

      // Parse timestamp
      let timestamp: Date;
      const datetime = this.getColumnValue(columns, 'datetime');

      if (datetime) {
        timestamp = new Date(datetime);
      } else {
        const date = this.getColumnValue(columns, 'date');
        const time = this.getColumnValue(columns, 'time');
        if (!date || !time) {
          console.warn(`Line ${lineNumber}: Missing date or time`);
          return null;
        }
        timestamp = this.parseDateTime(date, time);
      }

      if (isNaN(timestamp.getTime())) {
        console.warn(`Line ${lineNumber}: Invalid timestamp`);
        return null;
      }

      // Determine type
      const typeStr = this.getColumnValue(columns, 'type') ||
                     this.getColumnValue(columns, 'action');
      const type = this.parseRecordType(typeStr);

      const record: ClockingRecord = {
        employeeIdentifier,
        timestamp,
        type,
        source: this.id,
        rawData: {
          columns,
          lineNumber,
          type: typeStr,
        },
        metadata: {
          name: employeeName,
          employeeId,
        },
      };

      return record;
    } catch (error) {
      console.error(`Error parsing line ${lineNumber}:`, error);
      return null;
    }
  }

  private parseRecordType(typeStr?: string): ClockingRecord['type'] {
    if (!typeStr) return 'clock-in';

    const normalized = typeStr.toLowerCase().trim();

    if (normalized.includes('in') || normalized === 'i' || normalized === '0') {
      return 'clock-in';
    }
    if (normalized.includes('out') || normalized === 'o' || normalized === '1') {
      return 'clock-out';
    }
    if (normalized.includes('break') && normalized.includes('start')) {
      return 'break-start';
    }
    if (normalized.includes('break') && normalized.includes('end')) {
      return 'break-end';
    }

    return 'clock-in';
  }

  private getColumnValue(columns: string[], key: string): string | undefined {
    const index = this.columnIndices.get(key);
    if (index === undefined || index >= columns.length) {
      return undefined;
    }
    return columns[index]?.trim();
  }

  private mapColumns(headers: string[]): void {
    this.columnIndices.clear();
    const mapping = this.config.columnMapping || {};

    for (const [key, expectedHeader] of Object.entries(mapping)) {
      if (typeof expectedHeader === 'number') {
        this.columnIndices.set(key, expectedHeader);
      } else {
        const index = headers.findIndex(
          (h) => h.toLowerCase() === expectedHeader.toLowerCase()
        );
        if (index !== -1) {
          this.columnIndices.set(key, index);
        }
      }
    }
  }

  private mapColumnsFromConfig(): void {
    this.columnIndices.clear();
    const mapping = this.config.columnMapping || {};

    for (const [key, value] of Object.entries(mapping)) {
      if (typeof value === 'number') {
        this.columnIndices.set(key, value);
      }
    }
  }

  private detectDelimiter(line: string): string | null {
    const delimiters = [',', ';', '\t', '|'];
    let maxCount = 0;
    let detectedDelimiter: string | null = null;

    for (const delimiter of delimiters) {
      const count = line.split(delimiter).length - 1;
      if (count > maxCount) {
        maxCount = count;
        detectedDelimiter = delimiter;
      }
    }

    return maxCount > 0 ? detectedDelimiter : null;
  }

  private parseCSVLine(line: string, delimiter: string): string[] {
    const columns: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        columns.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    columns.push(current.trim());
    return columns;
  }
}
