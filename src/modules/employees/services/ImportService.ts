import { createSignal } from 'solid-js';
import { TimesheetFactory, ParsedTimeEntry } from '../factories';
import { WeeklyTimesheet } from '../types/timesheetTypes';
import { Employee } from '../stores/employeeStore';

/**
 * Import progress tracking
 */
export interface ImportProgress {
  stage: 'idle' | 'detecting' | 'parsing' | 'matching' | 'importing' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
  details?: string;
}

/**
 * Import result from file parsing
 */
export interface ImportResult {
  success: boolean;
  entries: ParsedTimeEntry[];
  errors: string[];
  warnings: string[];
  metadata?: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    dateRange?: { start: string; end: string };
  };
}

/**
 * Import adapter descriptor
 */
export interface ImportAdapter {
  id: string;
  name: string;
  formats: string[]; // e.g., ['csv', 'xlsx']
  description?: string;
}

/**
 * Entry with employee assignment
 */
interface AssignedEntry extends ParsedTimeEntry {
  employee?: Employee;
  employeeId?: string;
}

/**
 * Import Service
 * Orchestrates the timesheet import process from various file formats
 */
class ImportService {
  private progressSignal = createSignal<ImportProgress>({
    stage: 'idle',
    progress: 0,
    message: 'Ready to import',
  });

  private parsedEntriesSignal = createSignal<AssignedEntry[]>([]);
  private employeeMatchesSignal = createSignal<Map<string, Employee>>(new Map());

  /**
   * Get current import progress
   */
  get importProgress() {
    return this.progressSignal[0];
  }

  /**
   * Get parsed entries
   */
  get entries() {
    return this.parsedEntriesSignal[0];
  }

  /**
   * Get employee matches
   */
  get employeeMatches() {
    return this.employeeMatchesSignal[0];
  }

  /**
   * Update progress
   */
  private setProgress(progress: Partial<ImportProgress>) {
    const [current] = this.progressSignal;
    const [, setProgress] = this.progressSignal;
    setProgress({ ...current(), ...progress });
  }

  /**
   * Parse a file and extract time entries
   * This method auto-detects the file format and uses the appropriate adapter
   * @param file - File to parse
   * @returns Import result
   */
  async parseFile(file: File): Promise<ImportResult> {
    try {
      this.setProgress({
        stage: 'detecting',
        progress: 10,
        message: 'Detecting file format...',
      });

      // Detect file format from extension
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (!extension) {
        throw new Error('Could not determine file format');
      }

      // Find appropriate adapter
      const adapters = this.getAvailableAdapters();
      const adapter = adapters.find((a) => a.formats.includes(extension));

      if (!adapter) {
        throw new Error(`No adapter found for .${extension} files`);
      }

      this.setProgress({
        stage: 'parsing',
        progress: 30,
        message: `Parsing ${adapter.name} file...`,
      });

      // Parse the file using the detected adapter
      return await this.parseWithAdapter(file, adapter.id);
    } catch (error) {
      this.setProgress({
        stage: 'error',
        progress: 0,
        message: 'Import failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        entries: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
      };
    }
  }

  /**
   * Parse a file with a specific adapter
   * @param file - File to parse
   * @param adapterType - Adapter ID to use
   * @param config - Optional adapter configuration
   * @returns Import result
   */
  async parseWithAdapter(
    file: File,
    adapterType: string,
    config?: Record<string, unknown>
  ): Promise<ImportResult> {
    try {
      this.setProgress({
        stage: 'parsing',
        progress: 30,
        message: `Parsing with ${adapterType} adapter...`,
      });

      // For now, we'll implement a basic CSV parser
      // In production, this would use actual adapter implementations
      const result = await this.parseCSV(file, config);

      if (result.success) {
        const [, setEntries] = this.parsedEntriesSignal;
        setEntries(result.entries);

        this.setProgress({
          stage: 'matching',
          progress: 60,
          message: `Parsed ${result.entries.length} entries. Ready for employee matching.`,
        });
      }

      return result;
    } catch (error) {
      this.setProgress({
        stage: 'error',
        progress: 0,
        message: 'Parsing failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        entries: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
      };
    }
  }

  /**
   * Assign an employee to a specific entry
   * @param entryIndex - Index of the entry to assign
   * @param employee - Employee to assign
   */
  assignEmployee(entryIndex: number, employee: Employee): void {
    const [entries] = this.parsedEntriesSignal;
    const [, setEntries] = this.parsedEntriesSignal;
    const [matches] = this.employeeMatchesSignal;
    const [, setMatches] = this.employeeMatchesSignal;

    const currentEntries = entries();
    if (entryIndex >= 0 && entryIndex < currentEntries.length) {
      const updated = [...currentEntries];
      updated[entryIndex] = {
        ...updated[entryIndex],
        employee,
        employeeId: employee.id,
      };
      setEntries(updated);

      // Update matches
      const newMatches = new Map(matches());
      newMatches.set(updated[entryIndex].employeeName, employee);
      setMatches(newMatches);
    }
  }

  /**
   * Assign an employee to all entries matching a name
   * @param name - Employee name to match
   * @param employee - Employee to assign
   */
  assignEmployeeByName(name: string, employee: Employee): void {
    const [entries] = this.parsedEntriesSignal;
    const [, setEntries] = this.parsedEntriesSignal;
    const [matches] = this.employeeMatchesSignal;
    const [, setMatches] = this.employeeMatchesSignal;

    const currentEntries = entries();
    const updated = currentEntries.map((entry) => {
      if (entry.employeeName.toLowerCase() === name.toLowerCase()) {
        return {
          ...entry,
          employee,
          employeeId: employee.id,
        };
      }
      return entry;
    });

    setEntries(updated);

    // Update matches
    const newMatches = new Map(matches());
    newMatches.set(name, employee);
    setMatches(newMatches);
  }

  /**
   * Import parsed entries into timesheets
   * All entries must have assigned employees before importing
   * @returns Import result with created timesheets
   */
  async importToTimesheets(): Promise<{
    success: boolean;
    imported: number;
    timesheets: WeeklyTimesheet[];
    errors: string[];
  }> {
    try {
      const [entries] = this.parsedEntriesSignal;
      const currentEntries = entries();

      // Validate that all entries have assigned employees
      const unassigned = currentEntries.filter((e) => !e.employeeId);
      if (unassigned.length > 0) {
        return {
          success: false,
          imported: 0,
          timesheets: [],
          errors: [
            `${unassigned.length} entries do not have assigned employees. Please assign all employees before importing.`,
          ],
        };
      }

      this.setProgress({
        stage: 'importing',
        progress: 70,
        message: 'Creating timesheets...',
      });

      // Group entries by employee and week
      const groupedEntries = this.groupEntriesByEmployeeAndWeek(
        currentEntries as (ParsedTimeEntry & { employeeId: string; employee: Employee })[]
      );

      const timesheets: WeeklyTimesheet[] = [];
      let imported = 0;

      // Create timesheets for each group
      for (const [key, group] of Object.entries(groupedEntries)) {
        const [employeeId, weekStartDate] = key.split('|');
        const employee = group[0].employee;

        const timesheet = TimesheetFactory.createFromImport({
          entries: group,
          employee: { id: employeeId, name: employee.name },
          weekStartDate,
        });

        timesheets.push(timesheet);
        imported += group.length;
      }

      this.setProgress({
        stage: 'complete',
        progress: 100,
        message: `Successfully imported ${imported} entries into ${timesheets.length} timesheets.`,
      });

      return {
        success: true,
        imported,
        timesheets,
        errors: [],
      };
    } catch (error) {
      this.setProgress({
        stage: 'error',
        progress: 0,
        message: 'Import failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        imported: 0,
        timesheets: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Reset the import service state
   */
  reset(): void {
    const [, setProgress] = this.progressSignal;
    const [, setEntries] = this.parsedEntriesSignal;
    const [, setMatches] = this.employeeMatchesSignal;

    setProgress({
      stage: 'idle',
      progress: 0,
      message: 'Ready to import',
    });
    setEntries([]);
    setMatches(new Map());
  }

  /**
   * Get available import adapters
   * @returns Array of available adapters
   */
  getAvailableAdapters(): ImportAdapter[] {
    return [
      {
        id: 'csv',
        name: 'CSV',
        formats: ['csv'],
        description: 'Comma-separated values file',
      },
      {
        id: 'excel',
        name: 'Excel',
        formats: ['xlsx', 'xls'],
        description: 'Microsoft Excel spreadsheet',
      },
      {
        id: 'json',
        name: 'JSON',
        formats: ['json'],
        description: 'JSON file format',
      },
    ];
  }

  /**
   * Parse CSV file
   * Basic CSV parser - in production, this would be in a separate adapter
   */
  private async parseCSV(
    file: File,
    config?: Record<string, unknown>
  ): Promise<ImportResult> {
    const text = await file.text();
    const lines = text.split('\n').filter((line) => line.trim());

    if (lines.length === 0) {
      return {
        success: false,
        entries: [],
        errors: ['File is empty'],
        warnings: [],
      };
    }

    const entries: ParsedTimeEntry[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    // Parse header
    const header = lines[0].split(',').map((h) => h.trim().toLowerCase());

    // Map column names
    const columnMap = {
      name: header.findIndex((h) => h.includes('name') || h.includes('employee')),
      date: header.findIndex((h) => h.includes('date')),
      startTime: header.findIndex((h) => h.includes('start') || h.includes('in')),
      endTime: header.findIndex((h) => h.includes('end') || h.includes('out')),
      hours: header.findIndex((h) => h.includes('hour')),
      overtime: header.findIndex((h) => h.includes('overtime')),
      notes: header.findIndex((h) => h.includes('note') || h.includes('comment')),
    };

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim());

      try {
        const entry: ParsedTimeEntry = {
          employeeName: values[columnMap.name] || '',
          date: values[columnMap.date] || '',
          startTime: columnMap.startTime >= 0 ? values[columnMap.startTime] : undefined,
          endTime: columnMap.endTime >= 0 ? values[columnMap.endTime] : undefined,
          hoursWorked:
            columnMap.hours >= 0 ? parseFloat(values[columnMap.hours]) || 0 : 0,
          overtimeHours:
            columnMap.overtime >= 0 ? parseFloat(values[columnMap.overtime]) || 0 : undefined,
          notes: columnMap.notes >= 0 ? values[columnMap.notes] : undefined,
        };

        // Calculate hours from times if not provided
        if (entry.hoursWorked === 0 && entry.startTime && entry.endTime) {
          entry.hoursWorked = TimesheetFactory.calculateHoursFromTimes(
            entry.startTime,
            entry.endTime
          );
        }

        // Validate entry
        if (!entry.employeeName) {
          errors.push(`Row ${i + 1}: Missing employee name`);
          continue;
        }

        if (!entry.date) {
          errors.push(`Row ${i + 1}: Missing date`);
          continue;
        }

        entries.push(entry);
      } catch (error) {
        errors.push(
          `Row ${i + 1}: ${error instanceof Error ? error.message : 'Parse error'}`
        );
      }
    }

    return {
      success: errors.length === 0,
      entries,
      errors,
      warnings,
      metadata: {
        totalRows: lines.length - 1,
        validRows: entries.length,
        invalidRows: errors.length,
      },
    };
  }

  /**
   * Group entries by employee and week
   */
  private groupEntriesByEmployeeAndWeek(
    entries: (ParsedTimeEntry & { employeeId: string; employee: Employee })[]
  ): Record<string, (ParsedTimeEntry & { employeeId: string; employee: Employee })[]> {
    const grouped: Record<
      string,
      (ParsedTimeEntry & { employeeId: string; employee: Employee })[]
    > = {};

    entries.forEach((entry) => {
      const weekStartDate = TimesheetFactory.getWeekStartDate(entry.date);
      const key = `${entry.employeeId}|${weekStartDate}`;

      if (!grouped[key]) {
        grouped[key] = [];
      }

      grouped[key].push(entry);
    });

    return grouped;
  }
}

// Export singleton instance
export const importService = new ImportService();
