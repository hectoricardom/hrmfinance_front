import { Component, createSignal, createMemo, For, Show } from 'solid-js';
import { employeeStore, Employee } from '../stores/employeeStore';
import { timesheetStore, getWeekDates, createEmptyTimesheet } from '../stores/timesheetStore';
import { WeeklyTimesheet, DailyTimeEntry } from '../types/timesheetTypes';
import { useTranslation } from '../../../translations';
import { AdapterFactory } from '../adapters/AdapterFactory';

interface TimesheetImportProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
}

interface ParsedTimeEntry {
  employeeNumber: string;
  employeeName: string;
  employeeId?: string;
  date: string;
  clockIn: string;
  clockOut: string;
  hoursWorked: number;
  matchedEmployee?: Employee;
  status: 'matched' | 'unmatched' | 'error';
  errorMessage?: string;
}

interface RawClockEntry {
  employeeNumber: string;
  employeeName: string;
  dateTime: Date;
  dateStr: string;
  timeStr: string;
}

interface ImportSummary {
  totalRows: number;
  matched: number;
  unmatched: number;
  errors: number;
}

const TimesheetImport: Component<TimesheetImportProps> = (props) => {
  const { t } = useTranslation();
  const [csvFile, setCsvFile] = createSignal<File | null>(null);
  const [parsedEntries, setParsedEntries] = createSignal<ParsedTimeEntry[]>([]);
  const [isProcessing, setIsProcessing] = createSignal(false);
  const [isParsed, setIsParsed] = createSignal(false);
  const [importError, setImportError] = createSignal<string | null>(null);
  const [importSuccess, setImportSuccess] = createSignal(false);
  const [fileFormat, setFileFormat] = createSignal<'csv' | 'facetime'>('facetime');
  const [columnMapping, setColumnMapping] = createSignal({
    employeeName: 0,
    date: 1,
    clockIn: 2,
    clockOut: 3
  });
  const [hasHeader, setHasHeader] = createSignal(true);
  const [csvPreview, setCsvPreview] = createSignal<string[][]>([]);
  const [detectedAdapter, setDetectedAdapter] = createSignal<string | null>(null);

  // Get available adapters from the factory
  const availableAdapters = () => AdapterFactory.getAvailableAdapters();

  // Summary of parsed data
  const importSummary = createMemo<ImportSummary>(() => {
    const entries = parsedEntries();
    return {
      totalRows: entries.length,
      matched: entries.filter(e => e.status === 'matched').length,
      unmatched: entries.filter(e => e.status === 'unmatched').length,
      errors: entries.filter(e => e.status === 'error').length
    };
  });

  // Parse tab-delimited text (face time clock format)
  // Handles files with variable tabs between columns by splitting on one or more tabs
  const parseTabDelimited = (text: string): string[][] => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    return lines.map(line => line.split(/\t+/).map(cell => cell.trim()).filter(cell => cell !== ''));
  };

  // Parse CSV file
  const parseCSV = (text: string): string[][] => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    return lines.map(line => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    });
  };

  // Calculate hours from clock in/out times
  const calculateHours = (clockIn: string, clockOut: string): number => {
    try {
      const parseTime = (timeStr: string): number => {
        timeStr = timeStr.trim();
        const isPM = timeStr.toLowerCase().includes('pm');
        const isAM = timeStr.toLowerCase().includes('am');
        timeStr = timeStr.replace(/[ap]m/gi, '').trim();

        const parts = timeStr.split(':');
        let hours = parseInt(parts[0], 10);
        const minutes = parts[1] ? parseInt(parts[1], 10) : 0;

        if (isPM && hours !== 12) hours += 12;
        if (isAM && hours === 12) hours = 0;

        return hours * 60 + minutes;
      };

      const inMinutes = parseTime(clockIn);
      const outMinutes = parseTime(clockOut);

      let diff = outMinutes - inMinutes;
      if (diff < 0) diff += 24 * 60;

      return Math.round(diff / 60 * 100) / 100;
    } catch {
      return 0;
    }
  };

  // Match employee by name or employee number
  const findEmployee = (name: string, employeeNumber?: string): Employee | undefined => {
    // First try to match by ID if the employee has an ID that matches the number
    if (employeeNumber) {
      const byNumber = employeeStore.employees.find(emp => {
        // Check if employee ID ends with the number (removing leading zeros)
        const normalizedNumber = employeeNumber.replace(/^0+/, '');
        return emp.id.endsWith(normalizedNumber) || emp.id === employeeNumber;
      });
      if (byNumber) return byNumber;
    }

    // Then try name matching
    const normalizedName = name.toLowerCase().trim();
    return employeeStore.employees.find(emp => {
      const empName = emp.name.toLowerCase().trim();
      const empFirstName = empName.split(' ')[0];
      return empName === normalizedName ||
             empName.includes(normalizedName) ||
             normalizedName.includes(empName) ||
             empFirstName === normalizedName;
    });
  };

  // Handle file selection
  const handleFileSelect = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    setCsvFile(file);
    setImportError(null);
    setImportSuccess(false);
    setIsParsed(false);
    setParsedEntries([]);
    setDetectedAdapter(null);

    // Try auto-detection with AdapterFactory
    try {
      const adapter = await AdapterFactory.detectAdapter(file);
      if (adapter) {
        setDetectedAdapter(adapter.name);
        console.log(`Auto-detected adapter: ${adapter.name}`);
      }
    } catch (error) {
      console.warn('Adapter auto-detection failed, using fallback:', error);
    }

    // Detect file format from extension (fallback)
    const isTxt = file.name.toLowerCase().endsWith('.txt');
    setFileFormat(isTxt ? 'facetime' : 'csv');

    try {
      const text = await file.text();
      const rows = isTxt ? parseTabDelimited(text) : parseCSV(text);
      setCsvPreview(rows.slice(0, 10));

      // Auto-detect face time clock format
      if (rows.length > 0 && rows[0].some(cell => cell.includes('EnNo') || cell.includes('DateTime'))) {
        setFileFormat('facetime');
      }
    } catch (error) {
      setImportError('Failed to read file');
    }
  };

  // Parse face time clock format
  const parseFaceTimeClockFormat = (rows: string[][]): ParsedTimeEntry[] => {
    // Skip header row
    const dataRows = rows.slice(1);

    // Group entries by employee and date
    const clockEntries: RawClockEntry[] = [];

    dataRows.forEach(row => {
      if (row.length < 7) return;

      // Columns: No, Mchn, EnNo, Name, Mode, IOMd, DateTime
      const employeeNumber = row[2]?.trim() || '';
      const employeeName = row[3]?.trim() || '';
      const dateTimeStr = row[6]?.trim() || '';

      if (!dateTimeStr) return;

      // Parse DateTime: "2025/12/01  08:00:00"
      const dateTimeParts = dateTimeStr.split(/\s+/);
      const dateStr = dateTimeParts[0]?.replace(/\//g, '-') || '';
      const timeStr = dateTimeParts[1] || '';

      if (!dateStr || !timeStr) return;

      clockEntries.push({
        employeeNumber,
        employeeName,
        dateTime: new Date(`${dateStr}T${timeStr}`),
        dateStr,
        timeStr
      });
    });

    // Sort by employee and datetime
    clockEntries.sort((a, b) => {
      if (a.employeeNumber !== b.employeeNumber) {
        return a.employeeNumber.localeCompare(b.employeeNumber);
      }
      return a.dateTime.getTime() - b.dateTime.getTime();
    });

    // Group entries by employee and date, pairing clock-in/clock-out
    const entryMap = new Map<string, RawClockEntry[]>();

    clockEntries.forEach(entry => {
      const key = `${entry.employeeNumber}-${entry.dateStr}`;
      if (!entryMap.has(key)) {
        entryMap.set(key, []);
      }
      entryMap.get(key)!.push(entry);
    });

    // Create parsed entries from pairs
    const parsedEntries: ParsedTimeEntry[] = [];

    entryMap.forEach((entries, key) => {
      if (entries.length < 2) {
        // Single entry - incomplete
        parsedEntries.push({
          employeeNumber: entries[0].employeeNumber,
          employeeName: entries[0].employeeName,
          date: entries[0].dateStr,
          clockIn: entries[0].timeStr,
          clockOut: '',
          hoursWorked: 0,
          status: 'error',
          errorMessage: 'Missing clock out'
        });
        return;
      }

      // Take first as clock-in, second as clock-out
      const clockIn = entries[0];
      const clockOut = entries[1];

      const matchedEmployee = findEmployee(clockIn.employeeName, clockIn.employeeNumber);
      const hoursWorked = calculateHours(clockIn.timeStr, clockOut.timeStr);

      parsedEntries.push({
        employeeNumber: clockIn.employeeNumber,
        employeeName: clockIn.employeeName,
        employeeId: matchedEmployee?.id,
        date: clockIn.dateStr,
        clockIn: clockIn.timeStr,
        clockOut: clockOut.timeStr,
        hoursWorked,
        matchedEmployee,
        status: matchedEmployee ? 'matched' : 'unmatched'
      });

      // If more than 2 entries (e.g., break), pair the rest
      for (let i = 2; i < entries.length - 1; i += 2) {
        const breakClockIn = entries[i];
        const breakClockOut = entries[i + 1];

        if (!breakClockOut) break;

        const breakHours = calculateHours(breakClockIn.timeStr, breakClockOut.timeStr);

        parsedEntries.push({
          employeeNumber: breakClockIn.employeeNumber,
          employeeName: breakClockIn.employeeName,
          employeeId: matchedEmployee?.id,
          date: breakClockIn.dateStr,
          clockIn: breakClockIn.timeStr,
          clockOut: breakClockOut.timeStr,
          hoursWorked: breakHours,
          matchedEmployee,
          status: matchedEmployee ? 'matched' : 'unmatched'
        });
      }
    });

    // Sort by date and name for display
    parsedEntries.sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return a.employeeName.localeCompare(b.employeeName);
    });

    return parsedEntries;
  };

  // Parse standard CSV format
  const parseCSVFormat = (rows: string[][]): ParsedTimeEntry[] => {
    const mapping = columnMapping();
    const dataRows = hasHeader() ? rows.slice(1) : rows;

    return dataRows.map(row => {
      try {
        const employeeName = row[mapping.employeeName] || '';
        const date = row[mapping.date] || '';
        const clockIn = row[mapping.clockIn] || '';
        const clockOut = row[mapping.clockOut] || '';

        if (!employeeName || !date) {
          return {
            employeeNumber: '',
            employeeName,
            date,
            clockIn,
            clockOut,
            hoursWorked: 0,
            status: 'error' as const,
            errorMessage: 'Missing employee name or date'
          };
        }

        const hoursWorked = calculateHours(clockIn, clockOut);
        const matchedEmployee = findEmployee(employeeName);

        return {
          employeeNumber: '',
          employeeName,
          date,
          clockIn,
          clockOut,
          hoursWorked,
          matchedEmployee,
          employeeId: matchedEmployee?.id,
          status: matchedEmployee ? 'matched' as const : 'unmatched' as const
        };
      } catch (error) {
        return {
          employeeNumber: '',
          employeeName: row[mapping.employeeName] || '',
          date: row[mapping.date] || '',
          clockIn: row[mapping.clockIn] || '',
          clockOut: row[mapping.clockOut] || '',
          hoursWorked: 0,
          status: 'error' as const,
          errorMessage: 'Failed to parse row'
        };
      }
    }).filter(entry => entry.employeeName || entry.date);
  };

  // Parse and validate entries
  const handleParse = async () => {
    const file = csvFile();
    if (!file) return;

    setIsProcessing(true);
    setImportError(null);

    try {
      const text = await file.text();
      const rows = fileFormat() === 'facetime' ? parseTabDelimited(text) : parseCSV(text);

      const entries = fileFormat() === 'facetime'
        ? parseFaceTimeClockFormat(rows)
        : parseCSVFormat(rows);

      setParsedEntries(entries);
      setIsParsed(true);
    } catch (error) {
      setImportError('Failed to parse file');
    } finally {
      setIsProcessing(false);
    }
  };

  // Convert date string to day of week key
  const getDayKey = (dateStr: string): keyof WeeklyTimesheet['dailyEntries'] | null => {
    try {
      const date = new Date(dateStr);
      const days: (keyof WeeklyTimesheet['dailyEntries'])[] = [
        'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
      ];
      return days[date.getDay()];
    } catch {
      return null;
    }
  };

  // Import matched entries to timesheets
  const handleImport = async () => {
    const entries = parsedEntries().filter(e => e.status === 'matched' && e.employeeId);

    if (entries.length === 0) {
      setImportError('No matched entries to import');
      return;
    }

    setIsProcessing(true);
    setImportError(null);

    try {
      // Group entries by employee and week
      const groupedEntries = new Map<string, ParsedTimeEntry[]>();

      entries.forEach(entry => {
        const weekDates = getWeekDates(new Date(entry.date));
        const key = `${entry.employeeId}-${weekDates.start}`;

        if (!groupedEntries.has(key)) {
          groupedEntries.set(key, []);
        }
        groupedEntries.get(key)!.push(entry);
      });

      // Process each group
      for (const [key, groupEntries] of groupedEntries) {
        const employeeId = key.split('-')[0];
        const weekStartDate = key.substring(employeeId.length + 1);

        // Get or create timesheet
        const timesheet = await timesheetStore.getOrCreateTimesheet(employeeId, weekStartDate);

        // Aggregate hours by day
        const dayHours = new Map<string, {
          clockIn: string;
          clockOut: string;
          totalHours: number;
          date: string;
        }>();

        groupEntries.forEach(entry => {
          const dayKey = getDayKey(entry.date);
          if (!dayKey) return;

          const existing = dayHours.get(dayKey);
          if (existing) {
            // Add hours and update clock out to the latest
            existing.totalHours += entry.hoursWorked;
            if (entry.clockOut > existing.clockOut) {
              existing.clockOut = entry.clockOut;
            }
            if (entry.clockIn < existing.clockIn) {
              existing.clockIn = entry.clockIn;
            }
          } else {
            dayHours.set(dayKey, {
              clockIn: entry.clockIn,
              clockOut: entry.clockOut,
              totalHours: entry.hoursWorked,
              date: entry.date
            });
          }
        });

        // Update daily entries
        for (const [dayKey, data] of dayHours) {
          const dailyEntry: Partial<DailyTimeEntry> = {
            date: data.date,
            entryMode: 'clock',
            startTime: data.clockIn,
            endTime: data.clockOut,
            hoursWorked: data.totalHours
          };

          timesheetStore.updateDailyEntry(
            timesheet.id,
            dayKey as keyof WeeklyTimesheet['dailyEntries'],
            dailyEntry
          );
        }
      }

      setImportSuccess(true);
      props.onImportComplete?.();
    } catch (error) {
      console.error('Import failed:', error);
      setImportError('Failed to import timesheets');
    } finally {
      setIsProcessing(false);
    }
  };

  // Manual employee assignment
  const assignEmployee = (index: number, employeeId: string) => {
    const employee = employeeStore.employees.find(e => e.id === employeeId);
    setParsedEntries(prev => prev.map((entry, i) => {
      if (i !== index) return entry;
      return {
        ...entry,
        matchedEmployee: employee,
        employeeId: employee?.id,
        status: employee ? 'matched' : 'unmatched'
      };
    }));
  };

  // Assign all unmatched with same name
  const assignAllByName = (name: string, employeeId: string) => {
    const employee = employeeStore.employees.find(e => e.id === employeeId);
    setParsedEntries(prev => prev.map(entry => {
      if (entry.employeeName.toLowerCase().trim() !== name.toLowerCase().trim()) return entry;
      return {
        ...entry,
        matchedEmployee: employee,
        employeeId: employee?.id,
        status: employee ? 'matched' : 'unmatched'
      };
    }));
  };

  // Reset state
  const handleReset = () => {
    setCsvFile(null);
    setParsedEntries([]);
    setIsParsed(false);
    setImportError(null);
    setImportSuccess(false);
    setCsvPreview([]);
  };

  if (!props.isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      'align-items': 'center',
      'justify-content': 'center',
      'z-index': 1000,
      padding: '1rem'
    }}>
      <div style={{
        background: 'white',
        'border-radius': '1rem',
        'max-width': '1200px',
        width: '100%',
        'max-height': '90vh',
        overflow: 'hidden',
        display: 'flex',
        'flex-direction': 'column',
        'box-shadow': '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.5rem 2rem',
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          color: 'white',
          display: 'flex',
          'justify-content': 'space-between',
          'align-items': 'center'
        }}>
          <h2 style={{ margin: 0, 'font-size': '1.5rem', 'font-weight': '700' }}>
            Import Timesheet from Face Time Clock
          </h2>
          <button
            onClick={props.onClose}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              width: '40px',
              height: '40px',
              'border-radius': '50%',
              cursor: 'pointer',
              'font-size': '1.25rem',
              display: 'flex',
              'align-items': 'center',
              'justify-content': 'center'
            }}
          >
            X
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '2rem', overflow: 'auto', flex: 1 }}>
          {/* Success Message */}
          <Show when={importSuccess()}>
            <div style={{
              background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
              border: '2px solid #10b981',
              'border-radius': '0.75rem',
              padding: '1.5rem',
              'margin-bottom': '1.5rem',
              display: 'flex',
              'align-items': 'center',
              gap: '1rem'
            }}>
              <span style={{ 'font-size': '2rem' }}>Imported!</span>
              <div>
                <h3 style={{ margin: 0, color: '#065f46', 'font-weight': '700' }}>Import Complete!</h3>
                <p style={{ margin: '0.5rem 0 0', color: '#047857' }}>
                  {importSummary().matched} timesheet entries have been imported successfully.
                </p>
              </div>
              <button
                onClick={() => {
                  handleReset();
                  props.onClose();
                }}
                style={{
                  'margin-left': 'auto',
                  padding: '0.75rem 1.5rem',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  'border-radius': '0.5rem',
                  'font-weight': '600',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </Show>

          {/* Error Message */}
          <Show when={importError()}>
            <div style={{
              background: '#fef2f2',
              border: '2px solid #ef4444',
              'border-radius': '0.75rem',
              padding: '1rem',
              'margin-bottom': '1.5rem',
              color: '#dc2626'
            }}>
              {importError()}
            </div>
          </Show>

          <Show when={!importSuccess()}>
            {/* Step 1: File Upload */}
            <div style={{
              background: '#f7fafc',
              'border-radius': '0.75rem',
              padding: '1.5rem',
              'margin-bottom': '1.5rem',
              border: '2px dashed #cbd5e0'
            }}>
              <h3 style={{ margin: '0 0 1rem', color: '#2d3748', 'font-weight': '600' }}>
                Step 1: Upload Face Time Clock File (.txt or .csv)
              </h3>

              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileSelect}
                style={{
                  width: '100%',
                  padding: '1rem',
                  border: '2px solid #e2e8f0',
                  'border-radius': '0.5rem',
                  background: 'white',
                  cursor: 'pointer'
                }}
              />

              <Show when={csvFile()}>
                <div style={{ 'margin-top': '1rem', display: 'flex', 'align-items': 'center', gap: '1rem' }}>
                  <p style={{ margin: 0, color: '#4a5568' }}>
                    Selected: <strong>{csvFile()?.name}</strong> ({Math.round((csvFile()?.size || 0) / 1024)} KB)
                  </p>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    background: fileFormat() === 'facetime' ? '#f59e0b' : '#667eea',
                    color: 'white',
                    'border-radius': '9999px',
                    'font-size': '0.75rem',
                    'font-weight': '600'
                  }}>
                    {fileFormat() === 'facetime' ? 'Face Time Clock Format' : 'CSV Format'}
                  </span>
                </div>
              </Show>
            </div>

            {/* File Preview */}
            <Show when={csvPreview().length > 0 && fileFormat() === 'facetime'}>
              <div style={{
                background: '#f7fafc',
                'border-radius': '0.75rem',
                padding: '1.5rem',
                'margin-bottom': '1.5rem',
                border: '2px solid #e2e8f0'
              }}>
                <h3 style={{ margin: '0 0 1rem', color: '#2d3748', 'font-weight': '600' }}>
                  Step 2: Preview Data
                </h3>

                <p style={{ color: '#718096', 'margin-bottom': '1rem', 'font-size': '0.875rem' }}>
                  Detected Face Time Clock format with columns: No, Mchn, EnNo (Employee #), Name, Mode, IOMd, DateTime
                </p>

                {/* Preview Table */}
                <div style={{ overflow: 'auto', 'max-height': '200px', 'margin-bottom': '1rem' }}>
                  <table style={{ width: '100%', 'border-collapse': 'collapse', 'font-size': '0.875rem' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '0.5rem', background: '#e2e8f0', border: '1px solid #cbd5e0', 'text-align': 'left' }}>No</th>
                        <th style={{ padding: '0.5rem', background: '#e2e8f0', border: '1px solid #cbd5e0', 'text-align': 'left' }}>EnNo</th>
                        <th style={{ padding: '0.5rem', background: '#e2e8f0', border: '1px solid #cbd5e0', 'text-align': 'left' }}>Name</th>
                        <th style={{ padding: '0.5rem', background: '#e2e8f0', border: '1px solid #cbd5e0', 'text-align': 'left' }}>DateTime</th>
                      </tr>
                    </thead>
                    <tbody>
                      <For each={csvPreview().slice(1, 8)}>
                        {(row) => (
                          <tr>
                            <td style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>{row[0]}</td>
                            <td style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>{row[2]}</td>
                            <td style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>{row[3]}</td>
                            <td style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>{row[6]}</td>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>
                </div>

                <button
                  onClick={handleParse}
                  disabled={isProcessing()}
                  style={{
                    padding: '0.875rem 2rem',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: 'white',
                    border: 'none',
                    'border-radius': '0.5rem',
                    'font-weight': '600',
                    cursor: isProcessing() ? 'not-allowed' : 'pointer',
                    opacity: isProcessing() ? 0.5 : 1
                  }}
                >
                  {isProcessing() ? 'Processing...' : 'Parse & Match Employees'}
                </button>
              </div>
            </Show>

            {/* CSV Column Mapping (for non-face time format) */}
            <Show when={csvPreview().length > 0 && fileFormat() === 'csv'}>
              <div style={{
                background: '#f7fafc',
                'border-radius': '0.75rem',
                padding: '1.5rem',
                'margin-bottom': '1.5rem',
                border: '2px solid #e2e8f0'
              }}>
                <h3 style={{ margin: '0 0 1rem', color: '#2d3748', 'font-weight': '600' }}>
                  Step 2: Configure Column Mapping
                </h3>

                <div style={{ 'margin-bottom': '1rem' }}>
                  <label style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                    <input
                      type="checkbox"
                      checked={hasHeader()}
                      onChange={(e) => setHasHeader(e.target.checked)}
                    />
                    <span>First row is header</span>
                  </label>
                </div>

                <div style={{
                  display: 'grid',
                  'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                  'margin-bottom': '1.5rem'
                }}>
                  <For each={['employeeName', 'date', 'clockIn', 'clockOut'] as const}>
                    {(field) => (
                      <div>
                        <label style={{ display: 'block', 'font-weight': '600', 'margin-bottom': '0.5rem', color: '#4a5568' }}>
                          {field === 'employeeName' ? 'Employee Name' :
                           field === 'date' ? 'Date' :
                           field === 'clockIn' ? 'Clock In' : 'Clock Out'} Column
                        </label>
                        <select
                          value={columnMapping()[field]}
                          onChange={(e) => setColumnMapping(prev => ({ ...prev, [field]: parseInt(e.target.value) }))}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '2px solid #e2e8f0',
                            'border-radius': '0.5rem'
                          }}
                        >
                          <For each={csvPreview()[0]}>
                            {(col, index) => (
                              <option value={index()}>{hasHeader() ? col : `Column ${index() + 1}`}</option>
                            )}
                          </For>
                        </select>
                      </div>
                    )}
                  </For>
                </div>

                <button
                  onClick={handleParse}
                  disabled={isProcessing()}
                  style={{
                    padding: '0.875rem 2rem',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    'border-radius': '0.5rem',
                    'font-weight': '600',
                    cursor: isProcessing() ? 'not-allowed' : 'pointer',
                    opacity: isProcessing() ? 0.5 : 1
                  }}
                >
                  {isProcessing() ? 'Processing...' : 'Parse & Match Employees'}
                </button>
              </div>
            </Show>

            {/* Step 3: Review & Import */}
            <Show when={isParsed() && parsedEntries().length > 0}>
              <div style={{
                background: '#f7fafc',
                'border-radius': '0.75rem',
                padding: '1.5rem',
                border: '2px solid #e2e8f0'
              }}>
                <h3 style={{ margin: '0 0 1rem', color: '#2d3748', 'font-weight': '600' }}>
                  Step 3: Review & Import
                </h3>

                {/* Summary */}
                <div style={{
                  display: 'grid',
                  'grid-template-columns': 'repeat(4, 1fr)',
                  gap: '1rem',
                  'margin-bottom': '1.5rem'
                }}>
                  <div style={{
                    background: '#e2e8f0',
                    padding: '1rem',
                    'border-radius': '0.5rem',
                    'text-align': 'center'
                  }}>
                    <div style={{ 'font-size': '2rem', 'font-weight': '700', color: '#2d3748' }}>
                      {importSummary().totalRows}
                    </div>
                    <div style={{ color: '#718096', 'font-size': '0.875rem' }}>Total Entries</div>
                  </div>
                  <div style={{
                    background: '#d1fae5',
                    padding: '1rem',
                    'border-radius': '0.5rem',
                    'text-align': 'center'
                  }}>
                    <div style={{ 'font-size': '2rem', 'font-weight': '700', color: '#065f46' }}>
                      {importSummary().matched}
                    </div>
                    <div style={{ color: '#047857', 'font-size': '0.875rem' }}>Matched</div>
                  </div>
                  <div style={{
                    background: '#fef3c7',
                    padding: '1rem',
                    'border-radius': '0.5rem',
                    'text-align': 'center'
                  }}>
                    <div style={{ 'font-size': '2rem', 'font-weight': '700', color: '#92400e' }}>
                      {importSummary().unmatched}
                    </div>
                    <div style={{ color: '#b45309', 'font-size': '0.875rem' }}>Unmatched</div>
                  </div>
                  <div style={{
                    background: '#fee2e2',
                    padding: '1rem',
                    'border-radius': '0.5rem',
                    'text-align': 'center'
                  }}>
                    <div style={{ 'font-size': '2rem', 'font-weight': '700', color: '#991b1b' }}>
                      {importSummary().errors}
                    </div>
                    <div style={{ color: '#dc2626', 'font-size': '0.875rem' }}>Errors</div>
                  </div>
                </div>

                {/* Entries Table */}
                <div style={{ overflow: 'auto', 'max-height': '400px' }}>
                  <table style={{ width: '100%', 'border-collapse': 'collapse' }}>
                    <thead style={{ position: 'sticky', top: 0, background: '#e2e8f0' }}>
                      <tr>
                        <th style={{ padding: '0.75rem', 'text-align': 'left', border: '1px solid #cbd5e0' }}>Status</th>
                        <th style={{ padding: '0.75rem', 'text-align': 'left', border: '1px solid #cbd5e0' }}>En#</th>
                        <th style={{ padding: '0.75rem', 'text-align': 'left', border: '1px solid #cbd5e0' }}>Name</th>
                        <th style={{ padding: '0.75rem', 'text-align': 'left', border: '1px solid #cbd5e0' }}>Match Employee</th>
                        <th style={{ padding: '0.75rem', 'text-align': 'left', border: '1px solid #cbd5e0' }}>Date</th>
                        <th style={{ padding: '0.75rem', 'text-align': 'left', border: '1px solid #cbd5e0' }}>In</th>
                        <th style={{ padding: '0.75rem', 'text-align': 'left', border: '1px solid #cbd5e0' }}>Out</th>
                        <th style={{ padding: '0.75rem', 'text-align': 'left', border: '1px solid #cbd5e0' }}>Hours</th>
                      </tr>
                    </thead>
                    <tbody>
                      <For each={parsedEntries()}>
                        {(entry, index) => (
                          <tr style={{
                            background: entry.status === 'matched' ? '#f0fdf4' :
                                        entry.status === 'error' ? '#fef2f2' : '#fffbeb'
                          }}>
                            <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0' }}>
                              <span style={{
                                padding: '0.25rem 0.5rem',
                                'border-radius': '9999px',
                                'font-size': '0.75rem',
                                'font-weight': '600',
                                background: entry.status === 'matched' ? '#10b981' :
                                           entry.status === 'error' ? '#ef4444' : '#f59e0b',
                                color: 'white'
                              }}>
                                {entry.status}
                              </span>
                            </td>
                            <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0', 'font-family': 'monospace' }}>
                              {entry.employeeNumber}
                            </td>
                            <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0' }}>
                              {entry.employeeName}
                            </td>
                            <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0' }}>
                              <Show when={entry.status !== 'error'}>
                                <select
                                  value={entry.employeeId || ''}
                                  onChange={(e) => {
                                    assignEmployee(index(), e.target.value);
                                    // Also assign all others with same name
                                    assignAllByName(entry.employeeName, e.target.value);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    border: '1px solid #e2e8f0',
                                    'border-radius': '0.25rem',
                                    'font-size': '0.875rem'
                                  }}
                                >
                                  <option value="">-- Select --</option>
                                  <For each={employeeStore.employees}>
                                    {(emp) => (
                                      <option value={emp.id}>{emp.name}</option>
                                    )}
                                  </For>
                                </select>
                              </Show>
                              <Show when={entry.status === 'error'}>
                                <span style={{ color: '#dc2626', 'font-size': '0.875rem' }}>
                                  {entry.errorMessage}
                                </span>
                              </Show>
                            </td>
                            <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0' }}>
                              {entry.date}
                            </td>
                            <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0' }}>
                              {entry.clockIn}
                            </td>
                            <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0' }}>
                              {entry.clockOut}
                            </td>
                            <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0', 'font-weight': '600' }}>
                              {entry.hoursWorked.toFixed(2)}
                            </td>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>
                </div>

                {/* Import Button */}
                <div style={{ 'margin-top': '1.5rem', display: 'flex', gap: '1rem' }}>
                  <button
                    onClick={handleImport}
                    disabled={isProcessing() || importSummary().matched === 0}
                    style={{
                      padding: '0.875rem 2rem',
                      background: importSummary().matched > 0 ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#cbd5e0',
                      color: 'white',
                      border: 'none',
                      'border-radius': '0.5rem',
                      'font-weight': '600',
                      cursor: isProcessing() || importSummary().matched === 0 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {isProcessing() ? 'Importing...' : `Import ${importSummary().matched} Matched Entries`}
                  </button>
                  <button
                    onClick={handleReset}
                    style={{
                      padding: '0.875rem 2rem',
                      background: '#f7fafc',
                      color: '#4a5568',
                      border: '2px solid #e2e8f0',
                      'border-radius': '0.5rem',
                      'font-weight': '600',
                      cursor: 'pointer'
                    }}
                  >
                    Reset
                  </button>
                </div>
              </div>
            </Show>
          </Show>
        </div>
      </div>
    </div>
  );
};

export default TimesheetImport;
