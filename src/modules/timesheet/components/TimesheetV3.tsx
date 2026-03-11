import { Component, createSignal, For, createMemo } from 'solid-js';
import { TimeEntry, SAMPLE_PROJECTS, SAMPLE_TASKS, generateId, getCurrentWeekDates, getDayName } from '../types';

/**
 * VERSION 3: Minimal Inline Edit
 * - Super clean, minimal UI
 * - Direct inline editing (no modals/popups)
 * - Spreadsheet-like efficiency
 * - Best for: Power users who want speed over visuals
 */
const TimesheetV3: Component = () => {
  const weekDates = getCurrentWeekDates();
  const [entries, setEntries] = createSignal<TimeEntry[]>([]);

  const addEntry = (date: string) => {
    setEntries([...entries(), {
      id: generateId(),
      date,
      project: SAMPLE_PROJECTS[0],
      task: SAMPLE_TASKS[0],
      hours: 1,
      notes: ''
    }]);
  };

  const updateEntry = (id: string, field: keyof TimeEntry, value: string | number) => {
    setEntries(entries().map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const deleteEntry = (id: string) => {
    setEntries(entries().filter(e => e.id !== id));
  };

  const getEntriesForDate = (date: string) => entries().filter(e => e.date === date);
  const getDayHours = (date: string) => getEntriesForDate(date).reduce((sum, e) => sum + e.hours, 0);
  const weekTotal = createMemo(() => entries().reduce((sum, e) => sum + e.hours, 0));

  const styles = {
    container: {
      'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      'max-width': '900px',
      margin: '0 auto',
      padding: '20px'
    },
    header: {
      display: 'flex',
      'justify-content': 'space-between',
      'align-items': 'center',
      'margin-bottom': '30px'
    },
    title: {
      margin: '0',
      'font-size': '20px',
      'font-weight': '500',
      color: '#333'
    },
    total: {
      'font-size': '32px',
      'font-weight': '300',
      color: '#333'
    },
    totalLabel: {
      'font-size': '12px',
      color: '#999'
    },
    daySection: {
      'margin-bottom': '20px'
    },
    dayHeader: {
      display: 'flex',
      'justify-content': 'space-between',
      'align-items': 'center',
      padding: '12px 0',
      'border-bottom': '1px solid #eee'
    },
    dayTitle: {
      'font-size': '14px',
      color: '#333',
      'font-weight': '500'
    },
    dayHours: {
      'font-size': '14px',
      color: '#999'
    },
    entryRow: {
      display: 'grid',
      'grid-template-columns': '2fr 1.5fr 60px 1fr 30px',
      gap: '8px',
      'align-items': 'center',
      padding: '8px 0',
      'border-bottom': '1px solid #f5f5f5'
    },
    select: {
      padding: '6px 8px',
      border: '1px solid transparent',
      'border-radius': '4px',
      'font-size': '13px',
      background: 'transparent',
      cursor: 'pointer',
      transition: 'border-color 0.2s'
    },
    input: {
      padding: '6px 8px',
      border: '1px solid transparent',
      'border-radius': '4px',
      'font-size': '13px',
      background: 'transparent',
      'box-sizing': 'border-box',
      transition: 'border-color 0.2s'
    },
    hoursInput: {
      padding: '6px 8px',
      border: '1px solid transparent',
      'border-radius': '4px',
      'font-size': '13px',
      background: 'transparent',
      width: '50px',
      'text-align': 'center'
    },
    deleteBtn: {
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      color: '#ccc',
      'font-size': '16px',
      padding: '4px',
      opacity: '0.5',
      transition: 'opacity 0.2s, color 0.2s'
    },
    addRow: {
      padding: '10px 0',
      display: 'flex',
      gap: '10px'
    },
    addBtn: {
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      color: '#2196F3',
      'font-size': '13px',
      padding: '0',
      display: 'flex',
      'align-items': 'center',
      gap: '4px'
    },
    quickAdd: {
      display: 'flex',
      gap: '8px',
      'margin-left': 'auto'
    },
    quickBtn: {
      background: '#f5f5f5',
      border: 'none',
      padding: '4px 10px',
      'border-radius': '12px',
      'font-size': '11px',
      cursor: 'pointer',
      color: '#666'
    }
  };

  const quickAdd = (date: string, hours: number) => {
    setEntries([...entries(), {
      id: generateId(),
      date,
      project: SAMPLE_PROJECTS[0],
      task: SAMPLE_TASKS[0],
      hours,
      notes: ''
    }]);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>V3: Minimal Inline</h2>
        <div style={{ 'text-align': 'right' }}>
          <div style={styles.total}>{weekTotal()}h</div>
          <div style={styles.totalLabel}>this week</div>
        </div>
      </div>

      <For each={weekDates}>
        {(date) => {
          const dayEntries = () => getEntriesForDate(date);
          const hours = () => getDayHours(date);
          const dateObj = new Date(date);

          return (
            <div style={styles.daySection}>
              <div style={styles.dayHeader}>
                <span style={styles.dayTitle}>
                  {getDayName(date)} {dateObj.getDate()}
                </span>
                <span style={styles.dayHours}>
                  {hours() > 0 ? `${hours()}h` : '—'}
                </span>
              </div>

              <For each={dayEntries()}>
                {(entry) => (
                  <div style={styles.entryRow}>
                    <select
                      style={styles.select}
                      value={entry.project}
                      onChange={(e) => updateEntry(entry.id, 'project', e.target.value)}
                    >
                      <For each={SAMPLE_PROJECTS}>
                        {(p) => <option value={p}>{p}</option>}
                      </For>
                    </select>
                    <select
                      style={styles.select}
                      value={entry.task}
                      onChange={(e) => updateEntry(entry.id, 'task', e.target.value)}
                    >
                      <For each={SAMPLE_TASKS}>
                        {(t) => <option value={t}>{t}</option>}
                      </For>
                    </select>
                    <input
                      type="number"
                      style={styles.hoursInput}
                      value={entry.hours}
                      min="0.5"
                      max="12"
                      step="0.5"
                      onChange={(e) => updateEntry(entry.id, 'hours', parseFloat(e.target.value) || 0)}
                    />
                    <input
                      type="text"
                      style={styles.input}
                      value={entry.notes || ''}
                      placeholder="notes"
                      onChange={(e) => updateEntry(entry.id, 'notes', e.target.value)}
                    />
                    <button
                      style={styles.deleteBtn}
                      onClick={() => deleteEntry(entry.id)}
                    >×</button>
                  </div>
                )}
              </For>

              <div style={styles.addRow}>
                <button style={styles.addBtn} onClick={() => addEntry(date)}>
                  + add entry
                </button>
                <div style={styles.quickAdd}>
                  <button style={styles.quickBtn} onClick={() => quickAdd(date, 1)}>+1h</button>
                  <button style={styles.quickBtn} onClick={() => quickAdd(date, 2)}>+2h</button>
                  <button style={styles.quickBtn} onClick={() => quickAdd(date, 4)}>+4h</button>
                  <button style={styles.quickBtn} onClick={() => quickAdd(date, 8)}>+8h</button>
                </div>
              </div>
            </div>
          );
        }}
      </For>
    </div>
  );
};

export default TimesheetV3;
