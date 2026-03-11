export interface ClockingRecord {
  employeeIdentifier: string;
  timestamp: Date;
  type: 'clock-in' | 'clock-out' | 'break-start' | 'break-end';
  source: string;
  rawData?: any;
  metadata?: Record<string, any>;
}

export interface ParsedTimeEntry {
  employeeIdentifier: string;
  employeeName?: string;
  date: string;
  clockIn: string;
  clockOut: string;
  hoursWorked: number;
  breaks?: Array<{ start: string; end: string; duration: number }>;
  status: 'matched' | 'unmatched' | 'error';
  matchedEmployee?: any;
  errorMessage?: string;
}

export interface ImportResult {
  success: boolean;
  entries: ParsedTimeEntry[];
  summary: {
    totalRecords: number;
    matched: number;
    unmatched: number;
    errors: number;
  };
  warnings?: string[];
  errors?: string[];
}

export interface AdapterConfig {
  dateFormat?: string;
  timeFormat?: string;
  timezone?: string;
  columnMapping?: Record<string, number | string>;
  hasHeader?: boolean;
  delimiter?: string;
  employeeMatchStrategy?: 'id' | 'name' | 'badge' | 'email';
}

export interface IClockingAdapter {
  readonly id: string;
  readonly name: string;
  readonly supportedFormats: string[];
  readonly version: string;

  canHandle(file: File): Promise<boolean>;
  detectFormat(content: string): boolean;
  parse(file: File): Promise<ClockingRecord[]>;
  parseContent(content: string): ClockingRecord[];
  processRecords(records: ClockingRecord[], employees: any[]): ParsedTimeEntry[];
  getDefaultConfig(): AdapterConfig;
  configure(config: AdapterConfig): void;
}
