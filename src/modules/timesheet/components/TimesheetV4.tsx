import { Component, createSignal, For, createMemo, Show, onMount } from 'solid-js';
import { A } from '@solidjs/router';
import { TimeEntry, SAMPLE_PROJECTS, SAMPLE_TASKS, generateId, getWeekDates, getWeekRange, getDayName, calculateHours, parseClockMode, CLOCK_MODE_ICONS, CLOCK_MODE_LABELS } from '../types';

/**
 * VERSION 4: Visual Timeline
 * - Horizontal timeline visualization
 * - Start/End time with visual blocks
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

const SAMPLE_EMPLOYEES: Employee[] = [
  { id: 'emp1', name: 'John Smith' },
  { id: 'emp2', name: 'Maria Garcia' },
  { id: 'emp3', name: 'Alex Johnson' },
  { id: 'emp4', name: 'Sarah Williams' }
];

// Generate sample timesheet data for an employee
const generateSampleData = (employeeId: string, employeeName: string, weekDates: string[]): TimeEntry[] => {
  const sampleEntries: TimeEntry[] = [];

  for (let i = 0; i < 5; i++) {
    const date = weekDates[i];
    if (!date) continue;

    sampleEntries.push({
      id: generateId(),
      date,
      project: SAMPLE_PROJECTS[i % SAMPLE_PROJECTS.length],
      task: SAMPLE_TASKS[i % SAMPLE_TASKS.length],
      startTime: '09:00',
      endTime: '12:00',
      hours: 3,
      clockInMode: 'facial',
      clockOutMode: 'facial',
      employeeId,
      employeeName
    });

    sampleEntries.push({
      id: generateId(),
      date,
      project: SAMPLE_PROJECTS[(i + 1) % SAMPLE_PROJECTS.length],
      task: SAMPLE_TASKS[(i + 2) % SAMPLE_TASKS.length],
      startTime: '13:00',
      endTime: '17:00',
      hours: 4,
      clockInMode: 'fingerprint',
      clockOutMode: 'fingerprint',
      employeeId,
      employeeName
    });
  }

  return sampleEntries;
};

const TimesheetV4: Component = () => {
  const [weekOffset, setWeekOffset] = createSignal(0);
  const weekDates = (() => getWeekDates(weekOffset()));
  const weekRange = (() => getWeekRange(weekOffset()));

  const [entries, setEntries] = createSignal<TimeEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = createSignal<string | null>(null);
  const [showAddModal, setShowAddModal] = createSignal<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = createSignal<Employee | null>(null);
  const [importError, setImportError] = createSignal<string | null>(null);
  const [importSuccess, setImportSuccess] = createSignal<number | null>(null);
  let fileInputRef: HTMLInputElement | undefined;

  const loadDataForWeek = (offset: number) => {
    const dates = getWeekDates(offset);
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

  const addEntry = (date: string, hours: number = 1) => {
    const startHour = 9;
    const endHour = startHour + hours;
    const emp = selectedEmployee();
    const newEntry: TimeEntry = {
      id: generateId(),
      date,
      project: SAMPLE_PROJECTS[0],
      task: SAMPLE_TASKS[0],
      startTime: `${startHour.toString().padStart(2, '0')}:00`,
      endTime: `${endHour.toString().padStart(2, '0')}:00`,
      hours,
      notes: '',
      employeeId: emp?.id,
      employeeName: emp?.name
    };
    setEntries([...entries(), newEntry]);
    setShowAddModal(null);
    setSelectedEntry(newEntry.id);
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
    setSelectedEntry(null);
  };

  const parseImportFile = (content: string): TimeEntry[] => {
    const lines = content.trim().split('\n');
    const importedEntries: TimeEntry[] = [];

    let gg:any = {}

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('#')) continue;

      const separator = line.includes('\t') ? '\t' : ',';
      const parts = line.split(separator).map(p => p.trim());



     
      let endd = {
        "employeeLink": parts[2],
        "mode": parts[4],
        "dateTime": parts[6],
        "date": parts[6].split('  ')?.[0],
        "time": parts[6].split('  ')?.[1],
      }
   
      if(!gg[endd.employeeLink]){
          gg[endd.employeeLink] = {}
      }
      if(!gg[endd.employeeLink][endd.date]){
          gg[endd.employeeLink][endd.date] = {}
      }
      gg[endd.employeeLink][endd.date][endd.time] = endd
    }

   

    Object.keys(gg).map(emplId=>{
      if(isNaN(parseInt(emplId))){ 
         //console.log(gg)
      }
      else{
        Object.keys(gg?.[emplId]).map(date=>{
          let hours = Object.keys(gg?.[emplId]?.[date]).sort((a: any, b: any) => (b) - (a));
          let start = gg?.[emplId]?.[date][hours?.[0]]
          let end = gg?.[emplId]?.[date][hours?.[1]]

          const hoursT = calculateHours(hours?.[0], hours?.[1]);
          
          let yr = {
              id: generateId(),
              employeeRef: emplId,
              date,
              project : "",
              task: SAMPLE_TASKS[0],
              startTime: hours?.[0],
              endTime: hours?.[1],
              hours: hoursT,
              clockInMode: start.mode ? parseClockMode(start.mode) : undefined,
              clockOutMode: end.mode ? parseClockMode(end.mode) : undefined,
              notes: notes || ''
          }
          // console.log(yr);
          importedEntries.push(yr)
        })
      }
    })


    


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

        console.log([...entries(), ...importedEntries])

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

  const getEntriesForDate = (date: string) => entries().filter(e => e.date === date);
  const getDayHours = (date: string) => getEntriesForDate(date).reduce((sum, e) => sum + e.hours, 0);
  const weekTotal = createMemo(() => entries().reduce((sum, e) => sum + e.hours, 0));
  const selectedEntryData = createMemo(() => entries().find(e => e.id === selectedEntry()));

  const projectColors: Record<string, string> = {
    'Website Redesign': '#FF6B6B',
    'Mobile App': '#4ECDC4',
    'API Development': '#45B7D1',
    'Client Support': '#96CEB4',
    'Internal Tools': '#FFD93D',
    'Documentation': '#C9B1FF'
  };

  const styles = {
    container: {
      'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      'max-width': '1100px',
      margin: '0 auto',
      padding: '20px'
    },
    header: {
      display: 'flex',
      'justify-content': 'space-between',
      'align-items': 'flex-start',
      'margin-bottom': '20px',
      'flex-wrap': 'wrap',
      gap: '15px'
    },
    titleSection: {},
    title: {
      margin: '0 0 8px 0',
      'font-size': '24px',
      'font-weight': '600',
      color: '#1a1a2e'
    },
    subtitle: {
      'font-size': '14px',
      color: '#888'
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
      padding: '8px 14px',
      'border-radius': '10px'
    },
    weekNavBtn: {
      background: '#fff',
      border: '1px solid #ddd',
      width: '34px',
      height: '34px',
      'border-radius': '8px',
      cursor: 'pointer',
      display: 'flex',
      'align-items': 'center',
      'justify-content': 'center',
      'font-size': '14px',
      transition: 'all 0.2s'
    },
    weekLabel: {
      'font-size': '14px',
      'font-weight': '600',
      color: '#1a1a2e',
      'min-width': '150px',
      'text-align': 'center'
    },
    todayBtn: {
      background: '#667eea',
      color: '#fff',
      border: 'none',
      padding: '6px 14px',
      'border-radius': '6px',
      cursor: 'pointer',
      'font-size': '12px',
      'font-weight': '500'
    },
    employeeBar: {
      display: 'flex',
      'align-items': 'center',
      gap: '12px',
      padding: '12px 16px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'border-radius': '12px',
      'margin-bottom': '20px'
    },
    employeeLabel: {
      'font-size': '13px',
      color: 'rgba(255,255,255,0.9)',
      'font-weight': '500'
    },
    employeeSelect: {
      padding: '8px 14px',
      border: 'none',
      'border-radius': '8px',
      'font-size': '14px',
      background: 'rgba(255,255,255,0.95)',
      'min-width': '180px',
      cursor: 'pointer'
    },
    employeeLink: {
      'font-size': '12px',
      color: '#fff',
      'text-decoration': 'none',
      'margin-left': 'auto',
      padding: '6px 12px',
      background: 'rgba(255,255,255,0.2)',
      'border-radius': '6px'
    },
    importBtn: {
      background: '#673AB7',
      color: '#fff',
      border: 'none',
      padding: '10px 18px',
      'border-radius': '8px',
      cursor: 'pointer',
      'font-size': '13px',
      'font-weight': '500'
    },
    templateBtn: {
      background: 'transparent',
      color: '#673AB7',
      border: '1px solid #673AB7',
      padding: '10px 18px',
      'border-radius': '8px',
      cursor: 'pointer',
      'font-size': '13px'
    },
    stats: {
      display: 'flex',
      gap: '15px'
    },
    stat: {
      'text-align': 'center',
      padding: '12px 20px',
      background: '#f8f9fa',
      'border-radius': '12px'
    },
    statValue: {
      'font-size': '24px',
      'font-weight': '700',
      color: '#1a1a2e'
    },
    statLabel: {
      'font-size': '11px',
      color: '#888',
      'text-transform': 'uppercase',
      'letter-spacing': '0.5px'
    },
    alert: {
      padding: '10px 15px',
      'border-radius': '8px',
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
    timeline: {
      background: '#fff',
      'border-radius': '16px',
      'box-shadow': '0 4px 20px rgba(0,0,0,0.08)',
      overflow: 'hidden'
    },
    dayRow: {
      display: 'grid',
      'grid-template-columns': '100px 1fr',
      'border-bottom': '1px solid #f0f0f0',
      'min-height': '70px'
    },
    dayLabel: {
      display: 'flex',
      'flex-direction': 'column',
      'justify-content': 'center',
      'align-items': 'center',
      padding: '15px',
      background: '#fafafa',
      'border-right': '1px solid #eee'
    },
    dayName: {
      'font-size': '12px',
      color: '#888'
    },
    dayNum: {
      'font-size': '20px',
      'font-weight': '600',
      color: '#333'
    },
    dayHours: {
      'font-size': '11px',
      color: '#4CAF50',
      'margin-top': '4px'
    },
    timelineTrack: {
      display: 'flex',
      'align-items': 'center',
      padding: '10px',
      gap: '8px',
      position: 'relative',
      'flex-wrap': 'wrap'
    },
    block: {
      height: '45px',
      'border-radius': '8px',
      display: 'flex',
      'flex-direction': 'column',
      'justify-content': 'center',
      padding: '0 12px',
      cursor: 'pointer',
      transition: 'transform 0.2s, box-shadow 0.2s',
      color: '#fff',
      'font-size': '11px',
      'font-weight': '500',
      'white-space': 'nowrap',
      overflow: 'hidden'
    },
    blockSelected: {
      transform: 'scale(1.05)',
      'box-shadow': '0 4px 15px rgba(0,0,0,0.2)'
    },
    blockTime: {
      'font-size': '10px',
      opacity: '0.85',
      'margin-top': '2px'
    },
    addBlock: {
      height: '45px',
      'min-width': '45px',
      'border-radius': '8px',
      border: '2px dashed #ddd',
      background: 'transparent',
      display: 'flex',
      'align-items': 'center',
      'justify-content': 'center',
      cursor: 'pointer',
      color: '#bbb',
      'font-size': '20px',
      transition: 'all 0.2s'
    },
    panel: {
      position: 'fixed',
      right: '20px',
      top: '50%',
      transform: 'translateY(-50%)',
      width: '300px',
      background: '#fff',
      'border-radius': '16px',
      'box-shadow': '0 10px 40px rgba(0,0,0,0.15)',
      padding: '20px',
      'z-index': '100'
    },
    panelTitle: {
      'font-size': '16px',
      'font-weight': '600',
      'margin-bottom': '15px',
      color: '#333'
    },
    formGroup: {
      'margin-bottom': '15px'
    },
    label: {
      'font-size': '11px',
      color: '#888',
      'margin-bottom': '6px',
      display: 'block',
      'text-transform': 'uppercase',
      'letter-spacing': '0.5px'
    },
    select: {
      width: '100%',
      padding: '10px 12px',
      border: '1px solid #e0e0e0',
      'border-radius': '8px',
      'font-size': '14px',
      background: '#fff'
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      border: '1px solid #e0e0e0',
      'border-radius': '8px',
      'font-size': '14px',
      'box-sizing': 'border-box'
    },
    timeRow: {
      display: 'grid',
      'grid-template-columns': '1fr 1fr',
      gap: '10px'
    },
    hoursDisplay: {
      'text-align': 'center',
      'font-size': '28px',
      'font-weight': '700',
      color: '#667eea',
      padding: '10px 0'
    },
    clockModeRow: {
      display: 'flex',
      'justify-content': 'space-around',
      padding: '10px 0',
      background: '#f8f9fa',
      'border-radius': '8px',
      'margin-top': '10px'
    },
    clockModeItem: {
      'text-align': 'center'
    },
    clockModeLabel: {
      'font-size': '10px',
      color: '#888',
      'text-transform': 'uppercase'
    },
    clockModeValue: {
      'font-size': '20px',
      'margin-top': '4px'
    },
    panelActions: {
      display: 'flex',
      gap: '10px',
      'margin-top': '20px'
    },
    closeBtn: {
      flex: '1',
      padding: '10px',
      background: '#f5f5f5',
      border: 'none',
      'border-radius': '8px',
      cursor: 'pointer',
      'font-size': '13px'
    },
    deleteBtn: {
      flex: '1',
      padding: '10px',
      background: '#ff5252',
      color: '#fff',
      border: 'none',
      'border-radius': '8px',
      cursor: 'pointer',
      'font-size': '13px'
    },
    addModal: {
      position: 'absolute',
      background: '#fff',
      padding: '15px',
      'border-radius': '12px',
      'box-shadow': '0 8px 30px rgba(0,0,0,0.15)',
      'z-index': '50',
      display: 'flex',
      gap: '8px'
    },
    quickHourBtn: {
      padding: '10px 16px',
      background: '#f0f0f0',
      border: 'none',
      'border-radius': '8px',
      cursor: 'pointer',
      'font-size': '13px',
      'font-weight': '500',
      transition: 'background 0.2s'
    }
  };

  const getBlockWidth = (hours: number) => Math.max(80, hours * 50);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.titleSection}>
          <h2 style={styles.title}>V4: Visual Timeline</h2>
          <p style={styles.subtitle}>Click blocks to edit, click + to add</p>
        </div>
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
            Template
          </button>
          <button style={styles.importBtn} onClick={() => fileInputRef?.click()}>
            Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.csv"
            style={{ display: 'none' }}
            onChange={handleImport}
          />
        </div>
        <div style={styles.stats}>
          <div style={styles.stat}>
            <div style={styles.statValue}>{weekTotal()}</div>
            <div style={styles.statLabel}>Hours</div>
          </div>
          <div style={styles.stat}>
            <div style={styles.statValue}>{entries().length}</div>
            <div style={styles.statLabel}>Entries</div>
          </div>
        </div>
      </div>

      <div style={styles.employeeBar}>
        <span style={styles.employeeLabel}>Employee:</span>
        <select
          style={styles.employeeSelect}
          value={selectedEmployee()?.id || ''}
          onChange={(e) => {
            const emp = SAMPLE_EMPLOYEES.find(emp => emp.id === e.target.value);
            setSelectedEmployee(emp || null);
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

      <div style={styles.timeline}>
       
        <For each={weekDates()}>
          {(date) => {
            const dayEntries = () => getEntriesForDate(date);
            const hours = () => getDayHours(date);
            const dateObj = new Date(date);
            const isToday = new Date().toDateString() === dateObj.toDateString();

            return (
              <div style={{ ...styles.dayRow, background: isToday ? '#fffef0' : 'transparent' }}>
                <div style={styles.dayLabel}>
                  <span style={styles.dayName}>{getDayName(date)}</span>
                  <span style={styles.dayNum}>{dateObj.getDate()}</span>
                  <span style={styles.dayHours}>{hours()}h</span>
                </div>
                <div style={styles.timelineTrack}>
                  <For each={dayEntries()}>
                    {(entry) => (
                      <div
                        style={{
                          ...styles.block,
                          width: `${getBlockWidth(entry.hours)}px`,
                          background: projectColors[entry.project] || '#667eea',
                          ...(selectedEntry() === entry.id ? styles.blockSelected : {})
                        }}
                        onClick={() => setSelectedEntry(entry.id)}
                      >
                        <span>{entry.hours}h • {entry.project.split(' ')[0]}</span>
                        <span style={styles.blockTime}>{entry.startTime} - {entry.endTime}</span>
                      </div>
                    )}
                  </For>
                  <div style={{ position: 'relative' }}>
                    <button
                      style={styles.addBlock}
                      onClick={() => setShowAddModal(showAddModal() === date ? null : date)}
                    >
                      +
                    </button>
                    <Show when={showAddModal() === date}>
                      <div style={{ ...styles.addModal, top: '50px', left: '0' }}>
                        <button style={styles.quickHourBtn} onClick={() => addEntry(date, 1)}>1h</button>
                        <button style={styles.quickHourBtn} onClick={() => addEntry(date, 2)}>2h</button>
                        <button style={styles.quickHourBtn} onClick={() => addEntry(date, 4)}>4h</button>
                        <button style={styles.quickHourBtn} onClick={() => addEntry(date, 8)}>8h</button>
                      </div>
                    </Show>
                  </div>
                </div>
              </div>
            );
          }}
        </For>
      </div>



      <Show when={selectedEntryData()}>
        {(entry) => (
          <div style={styles.panel}>
            <div style={styles.panelTitle}>Edit Entry</div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Project</label>
              <select
                style={styles.select}
                value={entry().project}
                onChange={(e) => updateEntry(entry().id, 'project', e.target.value)}
              >
                <For each={SAMPLE_PROJECTS}>
                  {(p) => <option value={p}>{p}</option>}
                </For>
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Task</label>
              <select
                style={styles.select}
                value={entry().task}
                onChange={(e) => updateEntry(entry().id, 'task', e.target.value)}
              >
                <For each={SAMPLE_TASKS}>
                  {(t) => <option value={t}>{t}</option>}
                </For>
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Time</label>
              <div style={styles.timeRow}>
                <input
                  type="time"
                  style={styles.input}
                  value={entry().startTime || ''}
                  onChange={(e) => updateEntry(entry().id, 'startTime', e.target.value)}
                />
                <input
                  type="time"
                  style={styles.input}
                  value={entry().endTime || ''}
                  onChange={(e) => updateEntry(entry().id, 'endTime', e.target.value)}
                />
              </div>
              <div style={styles.hoursDisplay}>{entry().hours}h</div>
            </div>
            <Show when={entry().clockInMode || entry().clockOutMode}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Clock Mode</label>
                <div style={styles.clockModeRow}>
                  <div style={styles.clockModeItem}>
                    <div style={styles.clockModeLabel}>In</div>
                    <div style={styles.clockModeValue} title={entry().clockInMode ? CLOCK_MODE_LABELS[entry().clockInMode!] : ''}>
                      {entry().clockInMode ? CLOCK_MODE_ICONS[entry().clockInMode!] : '—'}
                    </div>
                  </div>
                  <div style={styles.clockModeItem}>
                    <div style={styles.clockModeLabel}>Out</div>
                    <div style={styles.clockModeValue} title={entry().clockOutMode ? CLOCK_MODE_LABELS[entry().clockOutMode!] : ''}>
                      {entry().clockOutMode ? CLOCK_MODE_ICONS[entry().clockOutMode!] : '—'}
                    </div>
                  </div>
                </div>
              </div>
            </Show>
            <div style={styles.formGroup}>
              <label style={styles.label}>Notes</label>
              <input
                type="text"
                style={styles.input}
                value={entry().notes || ''}
                placeholder="Add notes..."
                onChange={(e) => updateEntry(entry().id, 'notes', e.target.value)}
              />
            </div>
            <div style={styles.panelActions}>
              <button style={styles.closeBtn} onClick={() => setSelectedEntry(null)}>Close</button>
              <button style={styles.deleteBtn} onClick={() => deleteEntry(entry().id)}>Delete</button>
            </div>
          </div>
        )}
      </Show>
    </div>
  );
};

export default TimesheetV4;
