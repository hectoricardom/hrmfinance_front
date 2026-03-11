import { Component, createSignal, For, createMemo, Show, onMount } from 'solid-js';
import { A } from '@solidjs/router';
import { TimeEntry, SAMPLE_PROJECTS, SAMPLE_TASKS, generateId, getWeekDates, getWeekRange, formatDate, calculateHours, parseClockMode, CLOCK_MODE_ICONS, CLOCK_MODE_LABELS } from '../types';

/**
 * VERSION 1: Classic Table Layout
 * - Traditional spreadsheet-style table
 * - Start/End time with auto-calculated hours
 * - Import from TXT/CSV with clock mode support
 *
 * Import Format (TXT/CSV):
 * date,project,task,startTime,endTime,clockInMode,clockOutMode,notes
 * 2024-12-16,Website Redesign,Development,09:00,17:00,52,52,Working on homepage
 *
 * Clock Modes: 52=Facial, 42=Fingerprint, 34=PIN, 18=NFC
 */
interface Employee {
  id: string;
  name: string;
}

// Sample employees - in real app, fetch from API/store
const SAMPLE_EMPLOYEES: Employee[] = [
  { id: 'emp1', name: 'John Smith' },
  { id: 'emp2', name: 'Maria Garcia' },
  { id: 'emp3', name: 'Alex Johnson' },
  { id: 'emp4', name: 'Sarah Williams' }
];

// Generate sample timesheet data for an employee
const generateSampleData = (employeeId: string, employeeName: string, weekDates: string[]): TimeEntry[] => {
  const sampleEntries: TimeEntry[] = [];

  // Generate entries for weekdays (Mon-Fri)
  for (let i = 0; i < 5; i++) {
    const date = weekDates[i];
    if (!date) continue;

    // Morning entry
    sampleEntries.push({
      id: generateId(),
      date,
      project: SAMPLE_PROJECTS[i % SAMPLE_PROJECTS.length],
      task: SAMPLE_TASKS[i % SAMPLE_TASKS.length],
      startTime: '09:00',
      endTime: '12:00',
      hours: 3,
      notes: '',
      clockInMode: 'facial',
      clockOutMode: 'facial',
      employeeId,
      employeeName
    });

    // Afternoon entry
    sampleEntries.push({
      id: generateId(),
      date,
      project: SAMPLE_PROJECTS[(i + 1) % SAMPLE_PROJECTS.length],
      task: SAMPLE_TASKS[(i + 2) % SAMPLE_TASKS.length],
      startTime: '13:00',
      endTime: '17:00',
      hours: 4,
      notes: '',
      clockInMode: 'fingerprint',
      clockOutMode: 'fingerprint',
      employeeId,
      employeeName
    });
  }
  return sampleEntries;
};

const TimesheetV1: Component = () => {
  const [weekOffset, setWeekOffset] = createSignal(0);
  const weekDates = (() => getWeekDates(weekOffset()));
  const weekRange = (() => getWeekRange(weekOffset()));

  const [entries, setEntries] = createSignal<TimeEntry[]>([]);
  const [selectedDate, setSelectedDate] = createSignal<string>('');
  const [selectedEmployee, setSelectedEmployee] = createSignal<Employee | null>(null);
  const [importError, setImportError] = createSignal<string | null>(null);
  const [importSuccess, setImportSuccess] = createSignal<number | null>(null);
  let fileInputRef: HTMLInputElement | undefined;

  // Initialize selected date when week changes
  onMount(() => {
    setSelectedDate(weekDates()[0]);
  });

  const loadDataForWeek = (offset: number) => {
    const dates = getWeekDates(offset);
    setSelectedDate(dates[0]);
    const emp = selectedEmployee();
    if (emp) {
      const sampleData = generateSampleData(emp.id, emp.name, dates);
      setEntries(sampleData);
    }
  };

  const goToPreviousWeek = () => {
    const newOffset = weekOffset() - 1;
    setWeekOffset(newOffset);
    loadDataForWeek(newOffset);
  };

  const goToNextWeek = () => {
    const newOffset = weekOffset() + 1;
    setWeekOffset(newOffset);
    loadDataForWeek(newOffset);
  };

  const goToCurrentWeek = () => {
    setWeekOffset(0);
    loadDataForWeek(0);
  };

  const addEntry = () => {
    const emp = selectedEmployee();
    const newEntry: TimeEntry = {
      id: generateId(),
      date: selectedDate() || weekDates()[0],
      project: SAMPLE_PROJECTS[0],
      task: SAMPLE_TASKS[0],
      startTime: '09:00',
      endTime: '17:00',
      hours: 8,
      notes: '',
      employeeId: emp?.id,
      employeeName: emp?.name
    };
    setEntries([...entries(), newEntry]);
  };

  const updateEntry = (id: string, field: keyof TimeEntry, value: string | number) => {
    setEntries(entries().map(e => {
      if (e.id !== id) return e;

      const updated = { ...e, [field]: value };

      // Auto-calculate hours when start/end time changes
      if (field === 'startTime' || field === 'endTime') {
        const start = field === 'startTime' ? value as string : e.startTime;
        const end = field === 'endTime' ? value as string : e.endTime;
        if (start && end) {
          updated.hours = calculateHours(start, end);
        }
      }

      return updated;
    }));
  };

  const deleteEntry = (id: string) => {
    setEntries(entries().filter(e => e.id !== id));
  };

  const parseImportFile = (content: string): TimeEntry[] => {
    const lines = content.trim().split('\n');
    const importedEntries: TimeEntry[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('#')) continue;

      const separator = line.includes('\t') ? '\t' : ',';
      const parts = line.split(separator).map(p => p.trim());

      // Skip header row
      if (parts[0]?.toLowerCase() === 'date' || parts[0]?.toLowerCase() === 'fecha') continue;

      if (parts.length >= 5) {
        // Format: date,project,task,startTime,endTime,clockInMode,clockOutMode,notes
        const [date, project, task, startTime, endTime, clockInModeStr, clockOutModeStr, notes = ''] = parts;
        const hours = calculateHours(startTime, endTime);

        if (date && project && startTime && endTime) {
          importedEntries.push({
            id: generateId(),
            date,
            project,
            task: task || SAMPLE_TASKS[0],
            startTime,
            endTime,
            hours,
            clockInMode: clockInModeStr ? parseClockMode(clockInModeStr) : undefined,
            clockOutMode: clockOutModeStr ? parseClockMode(clockOutModeStr) : undefined,
            notes: notes || ''
          });
        }
      }
    }
    return importedEntries;
  };

  const handleImport = (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportSuccess(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const importedEntries = parseImportFile(content);

        if (importedEntries.length === 0) {
          setImportError('No valid entries found. Format: date,project,task,startTime,endTime,notes');
          return;
        }

        setEntries([...entries(), ...importedEntries]);
        setImportSuccess(importedEntries.length);
        setTimeout(() => setImportSuccess(null), 3000);
      } catch (err) {
        setImportError('Error parsing file');
      }
    };
    reader.onerror = () => setImportError('Error reading file');
    reader.readAsText(file);
    input.value = '';
  };

  const downloadTemplate = () => {
    const template = `date,project,task,startTime,endTime,clockInMode,clockOutMode,notes
${weekDates[0]},Website Redesign,Development,09:00,13:00,52,52,Working on homepage
${weekDates[0]},Mobile App,Code Review,14:00,16:00,42,42,Reviewing PR #123
${weekDates[1]},API Development,Testing,09:00,12:00,34,18,Unit tests
# Clock Modes: 52=Facial Recognition, 42=Fingerprint, 34=PIN Code, 18=NFC Card`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'timesheet_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const entriesForDate = createMemo(() =>
    entries().filter(e => e.date === selectedDate())
  );

  const totalHours = createMemo(() =>
    entriesForDate().reduce((sum, e) => sum + e.hours, 0)
  );

  const weekTotal = createMemo(() =>
    entries().reduce((sum, e) => sum + e.hours, 0)
  );

  const styles = {
    container: {
      'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      'max-width': '1100px',
      margin: '0 auto',
      padding: '20px',
      background: '#fff',
      'border-radius': '8px',
      'box-shadow': '0 2px 10px rgba(0,0,0,0.1)'
    },
    header: {
      display: 'flex',
      'justify-content': 'space-between',
      'align-items': 'center',
      'margin-bottom': '20px',
      'padding-bottom': '15px',
      'border-bottom': '2px solid #e0e0e0',
      'flex-wrap': 'wrap',
      gap: '15px'
    },
    title: {
      margin: '0',
      color: '#333',
      'font-size': '24px'
    },
    headerActions: {
      display: 'flex',
      gap: '10px',
      'align-items': 'center',
      'flex-wrap': 'wrap'
    },
    weekNav: {
      display: 'flex',
      'align-items': 'center',
      gap: '8px',
      background: '#f5f5f5',
      padding: '6px 12px',
      'border-radius': '8px'
    },
    weekNavBtn: {
      background: '#fff',
      border: '1px solid #ddd',
      width: '32px',
      height: '32px',
      'border-radius': '6px',
      cursor: 'pointer',
      display: 'flex',
      'align-items': 'center',
      'justify-content': 'center',
      'font-size': '16px',
      transition: 'all 0.2s'
    },
    weekLabel: {
      'font-size': '14px',
      'font-weight': '500',
      color: '#333',
      'min-width': '140px',
      'text-align': 'center'
    },
    todayBtn: {
      background: '#e3f2fd',
      color: '#1976d2',
      border: 'none',
      padding: '6px 12px',
      'border-radius': '6px',
      cursor: 'pointer',
      'font-size': '12px',
      'font-weight': '500'
    },
    employeeSelector: {
      display: 'flex',
      'align-items': 'center',
      gap: '10px',
      padding: '10px 15px',
      background: '#e8f5e9',
      'border-radius': '8px',
      'margin-bottom': '15px'
    },
    employeeLabel: {
      'font-size': '13px',
      color: '#2e7d32',
      'font-weight': '500'
    },
    employeeSelect: {
      padding: '8px 12px',
      border: '1px solid #a5d6a7',
      'border-radius': '6px',
      'font-size': '14px',
      background: '#fff',
      'min-width': '180px'
    },
    employeeLink: {
      'font-size': '12px',
      color: '#1976d2',
      'text-decoration': 'none'
    },
    badge: {
      background: '#4CAF50',
      color: '#fff',
      padding: '8px 16px',
      'border-radius': '20px',
      'font-weight': '600'
    },
    importBtn: {
      background: '#673AB7',
      color: '#fff',
      border: 'none',
      padding: '8px 16px',
      'border-radius': '6px',
      cursor: 'pointer',
      'font-size': '13px',
      display: 'flex',
      'align-items': 'center',
      gap: '6px'
    },
    templateBtn: {
      background: 'transparent',
      color: '#673AB7',
      border: '1px solid #673AB7',
      padding: '8px 16px',
      'border-radius': '6px',
      cursor: 'pointer',
      'font-size': '13px'
    },
    alert: {
      padding: '10px 15px',
      'border-radius': '6px',
      'margin-bottom': '15px',
      'font-size': '13px'
    },
    alertError: {
      background: '#ffebee',
      color: '#c62828',
      border: '1px solid #ef9a9a'
    },
    alertSuccess: {
      background: '#e8f5e9',
      color: '#2e7d32',
      border: '1px solid #a5d6a7'
    },
    tabs: {
      display: 'flex',
      gap: '4px',
      'margin-bottom': '20px',
      'overflow-x': 'auto',
      'padding-bottom': '5px'
    },
    tab: {
      padding: '10px 16px',
      border: 'none',
      background: '#f5f5f5',
      cursor: 'pointer',
      'border-radius': '6px',
      'font-size': '13px',
      'white-space': 'nowrap',
      transition: 'all 0.2s'
    },
    tabActive: {
      background: '#2196F3',
      color: '#fff'
    },
    table: {
      width: '100%',
      'border-collapse': 'collapse',
      'margin-bottom': '20px'
    },
    th: {
      background: '#f8f9fa',
      padding: '12px',
      'text-align': 'left',
      'font-weight': '600',
      color: '#555',
      'border-bottom': '2px solid #e0e0e0',
      'font-size': '13px'
    },
    td: {
      padding: '8px 12px',
      'border-bottom': '1px solid #eee'
    },
    select: {
      width: '100%',
      padding: '8px',
      border: '1px solid #ddd',
      'border-radius': '4px',
      'font-size': '14px',
      background: '#fff'
    },
    input: {
      width: '100%',
      padding: '8px',
      border: '1px solid #ddd',
      'border-radius': '4px',
      'font-size': '14px',
      'box-sizing': 'border-box'
    },
    timeInput: {
      width: '90px',
      padding: '8px',
      border: '1px solid #ddd',
      'border-radius': '4px',
      'font-size': '14px',
      'text-align': 'center'
    },
    hoursDisplay: {
      'font-weight': '600',
      color: '#2196F3',
      'text-align': 'center',
      'font-size': '14px'
    },
    clockMode: {
      display: 'flex',
      'align-items': 'center',
      'justify-content': 'center',
      gap: '4px',
      'font-size': '16px'
    },
    clockModeIcon: {
      cursor: 'help'
    },
    deleteBtn: {
      background: '#ff5252',
      color: '#fff',
      border: 'none',
      padding: '6px 12px',
      'border-radius': '4px',
      cursor: 'pointer',
      'font-size': '12px'
    },
    addBtn: {
      background: '#2196F3',
      color: '#fff',
      border: 'none',
      padding: '12px 24px',
      'border-radius': '6px',
      cursor: 'pointer',
      'font-size': '14px',
      'font-weight': '500'
    },
    footer: {
      display: 'flex',
      'justify-content': 'space-between',
      'align-items': 'center',
      'margin-top': '20px',
      'padding-top': '15px',
      'border-top': '2px solid #e0e0e0',
      'flex-wrap': 'wrap',
      gap: '15px'
    },
    summary: {
      display: 'flex',
      gap: '30px'
    },
    summaryItem: {
      'text-align': 'center'
    },
    summaryLabel: {
      'font-size': '12px',
      color: '#888',
      'margin-bottom': '4px'
    },
    summaryValue: {
      'font-size': '24px',
      'font-weight': '700',
      color: '#333'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>V1: Classic Table</h2>
        <div style={styles.headerActions}>
          <div style={styles.weekNav}>
            <button style={styles.weekNavBtn} onClick={goToPreviousWeek} title="Previous Week">
              ◀
            </button>
            <span style={styles.weekLabel}>{weekRange().label}</span>
            <button style={styles.weekNavBtn} onClick={goToNextWeek} title="Next Week">
              ▶
            </button>
            <Show when={weekOffset() !== 0}>
              <button style={styles.todayBtn} onClick={goToCurrentWeek}>
                Today
              </button>
            </Show>
          </div>
          <button style={styles.templateBtn} onClick={downloadTemplate}>
            Download Template
          </button>
          <button style={styles.importBtn} onClick={() => fileInputRef?.click()}>
            Import TXT/CSV
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.csv"
            style={{ display: 'none' }}
            onChange={handleImport}
          />
          <span style={styles.badge}>{weekTotal()}h Total</span>
        </div>
      </div>

      <div style={styles.employeeSelector}>
        <span style={styles.employeeLabel}>Employee:</span>
        <select
          style={styles.employeeSelect}
          value={selectedEmployee()?.id || ''}
          onChange={(e) => {
            const emp = SAMPLE_EMPLOYEES.find(emp => emp.id === e.target.value);
            setSelectedEmployee(emp || null);
            // Load sample data for selected employee
            if (emp) {
              const sampleData = generateSampleData(emp.id, emp.name, weekDates());
              setEntries(sampleData);
            } else {
              setEntries([]);
            }
          }}
        >
          <option value="">-- Select Employee --</option>
          <For each={SAMPLE_EMPLOYEES}>
            {(emp) => <option value={emp.id}>{emp.name}</option>}
          </For>
        </select>
        <Show when={selectedEmployee()}>
          <A href={`/employees/${selectedEmployee()?.id}`} style={styles.employeeLink}>
            View Profile →
          </A>
        </Show>
      </div>

      <Show when={importError()}>
        <div style={{ ...styles.alert, ...styles.alertError }}>
          {importError()}
        </div>
      </Show>

      <Show when={importSuccess()}>
        <div style={{ ...styles.alert, ...styles.alertSuccess }}>
          Successfully imported {importSuccess()} entries
        </div>
      </Show>

      <div style={styles.tabs}>
        <For each={weekDates()}>
          {(date) => (
            <button
              style={{
                ...styles.tab,
                ...(selectedDate() === date ? styles.tabActive : {})
              }}
              onClick={() => setSelectedDate(date)}
            >
              {formatDate(date)}
            </button>
          )}
        </For>
      </div>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Project</th>
            <th style={styles.th}>Task</th>
            <th style={{ ...styles.th, width: '100px' }}>Start</th>
            <th style={{ ...styles.th, width: '100px' }}>End</th>
            <th style={{ ...styles.th, width: '70px' }}>Hours</th>
            <th style={{ ...styles.th, width: '80px', 'text-align': 'center' }}>Mode</th>
            <th style={styles.th}>Notes</th>
            <th style={{ ...styles.th, width: '50px' }}></th>
          </tr>
        </thead>
        <tbody>
          <For each={entriesForDate()}>
            {(entry) => (
              <tr>
                <td style={styles.td}>
                  <select
                    style={styles.select}
                    value={entry.project}
                    onChange={(e) => updateEntry(entry.id, 'project', e.target.value)}
                  >
                    <For each={SAMPLE_PROJECTS}>
                      {(project) => <option value={project}>{project}</option>}
                    </For>
                  </select>
                </td>
                <td style={styles.td}>
                  <select
                    style={styles.select}
                    value={entry.task}
                    onChange={(e) => updateEntry(entry.id, 'task', e.target.value)}
                  >
                    <For each={SAMPLE_TASKS}>
                      {(task) => <option value={task}>{task}</option>}
                    </For>
                  </select>
                </td>
                <td style={styles.td}>
                  <input
                    type="time"
                    style={styles.timeInput}
                    value={entry.startTime || ''}
                    onChange={(e) => updateEntry(entry.id, 'startTime', e.target.value)}
                  />
                </td>
                <td style={styles.td}>
                  <input
                    type="time"
                    style={styles.timeInput}
                    value={entry.endTime || ''}
                    onChange={(e) => updateEntry(entry.id, 'endTime', e.target.value)}
                  />
                </td>
                <td style={styles.td}>
                  <div style={styles.hoursDisplay}>{entry.hours}h</div>
                </td>
                <td style={styles.td}>
                  <div style={styles.clockMode}>
                    <Show when={entry.clockInMode}>
                      <span
                        style={styles.clockModeIcon}
                        title={`In: ${CLOCK_MODE_LABELS[entry.clockInMode!]}`}
                      >
                        {CLOCK_MODE_ICONS[entry.clockInMode!]}
                      </span>
                    </Show>
                    <Show when={entry.clockOutMode}>
                      <span
                        style={styles.clockModeIcon}
                        title={`Out: ${CLOCK_MODE_LABELS[entry.clockOutMode!]}`}
                      >
                        {CLOCK_MODE_ICONS[entry.clockOutMode!]}
                      </span>
                    </Show>
                    <Show when={!entry.clockInMode && !entry.clockOutMode}>
                      <span style={{ color: '#ccc' }}>—</span>
                    </Show>
                  </div>
                </td>
                <td style={styles.td}>
                  <input
                    type="text"
                    style={styles.input}
                    value={entry.notes || ''}
                    placeholder="Add notes..."
                    onChange={(e) => updateEntry(entry.id, 'notes', e.target.value)}
                  />
                </td>
                <td style={styles.td}>
                  <button style={styles.deleteBtn} onClick={() => deleteEntry(entry.id)}>
                    ✕
                  </button>
                </td>
              </tr>
            )}
          </For>
        </tbody>
      </table>

      <div style={styles.footer}>
        <button style={styles.addBtn} onClick={addEntry}>
          + Add Time Entry
        </button>
        <div style={styles.summary}>
          <div style={styles.summaryItem}>
            <div style={styles.summaryLabel}>Today</div>
            <div style={styles.summaryValue}>{totalHours()}h</div>
          </div>
          <div style={styles.summaryItem}>
            <div style={styles.summaryLabel}>Week</div>
            <div style={styles.summaryValue}>{weekTotal()}h</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimesheetV1;
