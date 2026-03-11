import { Component, createSignal, For, createMemo } from 'solid-js';
import { TimeEntry, SAMPLE_PROJECTS, SAMPLE_TASKS, generateId, getCurrentWeekDates, getDayName } from '../types';

/**
 * VERSION 2: Card-Based Modern Layout
 * - Visual cards for each entry
 * - Floating action buttons
 * - Modern gradient and shadows
 * - Best for: Users who prefer visual, modern interfaces
 */
const TimesheetV2: Component = () => {
  const weekDates = getCurrentWeekDates();
  const [entries, setEntries] = createSignal<TimeEntry[]>([]);
  const [editingId, setEditingId] = createSignal<string | null>(null);

  const addEntry = (date: string) => {
    const newEntry: TimeEntry = {
      id: generateId(),
      date,
      project: SAMPLE_PROJECTS[0],
      task: SAMPLE_TASKS[0],
      hours: 1,
      notes: ''
    };
    setEntries([...entries(), newEntry]);
    setEditingId(newEntry.id);
  };

  const updateEntry = (id: string, field: keyof TimeEntry, value: string | number) => {
    setEntries(entries().map(e =>
      e.id === id ? { ...e, [field]: value } : e
    ));
  };

  const deleteEntry = (id: string) => {
    setEntries(entries().filter(e => e.id !== id));
  };

  const getEntriesForDate = (date: string) => entries().filter(e => e.date === date);
  const getDayHours = (date: string) => getEntriesForDate(date).reduce((sum, e) => sum + e.hours, 0);
  const weekTotal = createMemo(() => entries().reduce((sum, e) => sum + e.hours, 0));

  const projectColors: Record<string, string> = {
    'Website Redesign': '#FF6B6B',
    'Mobile App': '#4ECDC4',
    'API Development': '#45B7D1',
    'Client Support': '#96CEB4',
    'Internal Tools': '#FFEAA7',
    'Documentation': '#DDA0DD'
  };

  const styles = {
    container: {
      'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      'max-width': '1200px',
      margin: '0 auto',
      padding: '20px'
    },
    header: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '30px',
      'border-radius': '16px',
      color: '#fff',
      'margin-bottom': '25px',
      display: 'flex',
      'justify-content': 'space-between',
      'align-items': 'center'
    },
    title: {
      margin: '0',
      'font-size': '28px',
      'font-weight': '600'
    },
    weekBadge: {
      background: 'rgba(255,255,255,0.2)',
      padding: '12px 24px',
      'border-radius': '30px',
      'font-size': '20px',
      'font-weight': '700'
    },
    grid: {
      display: 'grid',
      'grid-template-columns': 'repeat(7, 1fr)',
      gap: '15px'
    },
    dayColumn: {
      background: '#f8f9fa',
      'border-radius': '12px',
      padding: '15px',
      'min-height': '300px'
    },
    dayHeader: {
      'text-align': 'center',
      'margin-bottom': '15px',
      'padding-bottom': '10px',
      'border-bottom': '2px solid #e0e0e0'
    },
    dayName: {
      'font-size': '14px',
      color: '#888',
      'margin-bottom': '4px'
    },
    dayDate: {
      'font-size': '24px',
      'font-weight': '700',
      color: '#333'
    },
    dayHours: {
      'font-size': '12px',
      color: '#667eea',
      'font-weight': '600',
      'margin-top': '4px'
    },
    card: {
      background: '#fff',
      'border-radius': '10px',
      padding: '12px',
      'margin-bottom': '10px',
      'box-shadow': '0 2px 8px rgba(0,0,0,0.08)',
      cursor: 'pointer',
      transition: 'transform 0.2s, box-shadow 0.2s',
      position: 'relative',
      overflow: 'hidden'
    },
    cardAccent: {
      position: 'absolute',
      left: '0',
      top: '0',
      bottom: '0',
      width: '4px'
    },
    cardProject: {
      'font-size': '13px',
      'font-weight': '600',
      color: '#333',
      'margin-bottom': '4px',
      'padding-left': '8px'
    },
    cardTask: {
      'font-size': '11px',
      color: '#888',
      'padding-left': '8px'
    },
    cardHours: {
      position: 'absolute',
      top: '10px',
      right: '10px',
      background: '#667eea',
      color: '#fff',
      padding: '4px 10px',
      'border-radius': '12px',
      'font-size': '12px',
      'font-weight': '600'
    },
    cardActions: {
      display: 'flex',
      gap: '5px',
      'margin-top': '10px',
      'padding-left': '8px'
    },
    editForm: {
      background: '#fff',
      'border-radius': '10px',
      padding: '15px',
      'margin-bottom': '10px',
      'box-shadow': '0 4px 15px rgba(0,0,0,0.15)',
      'border': '2px solid #667eea'
    },
    formGroup: {
      'margin-bottom': '10px'
    },
    label: {
      'font-size': '11px',
      color: '#888',
      'margin-bottom': '4px',
      display: 'block'
    },
    select: {
      width: '100%',
      padding: '8px',
      border: '1px solid #e0e0e0',
      'border-radius': '6px',
      'font-size': '13px',
      background: '#fff'
    },
    input: {
      width: '100%',
      padding: '8px',
      border: '1px solid #e0e0e0',
      'border-radius': '6px',
      'font-size': '13px',
      'box-sizing': 'border-box'
    },
    addBtn: {
      width: '100%',
      padding: '10px',
      background: 'transparent',
      border: '2px dashed #ccc',
      'border-radius': '8px',
      cursor: 'pointer',
      color: '#888',
      'font-size': '13px',
      transition: 'all 0.2s'
    },
    smallBtn: {
      padding: '4px 10px',
      border: 'none',
      'border-radius': '4px',
      cursor: 'pointer',
      'font-size': '11px'
    },
    saveBtn: {
      background: '#4CAF50',
      color: '#fff'
    },
    deleteBtn: {
      background: '#ff5252',
      color: '#fff'
    },
    cancelBtn: {
      background: '#e0e0e0',
      color: '#666'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>V2: Card-Based Modern</h2>
        <span style={styles.weekBadge}>{weekTotal()}h</span>
      </div>

      <div style={styles.grid}>
        <For each={weekDates}>
          {(date) => {
            const dayNum = new Date(date).getDate();
            const dayEntries = () => getEntriesForDate(date);
            const hours = () => getDayHours(date);

            return (
              <div style={styles.dayColumn}>
                <div style={styles.dayHeader}>
                  <div style={styles.dayName}>{getDayName(date)}</div>
                  <div style={styles.dayDate}>{dayNum}</div>
                  <div style={styles.dayHours}>{hours()}h logged</div>
                </div>

                <For each={dayEntries()}>
                  {(entry) => (
                    editingId() === entry.id ? (
                      <div style={styles.editForm}>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Project</label>
                          <select
                            style={styles.select}
                            value={entry.project}
                            onChange={(e) => updateEntry(entry.id, 'project', e.target.value)}
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
                            value={entry.task}
                            onChange={(e) => updateEntry(entry.id, 'task', e.target.value)}
                          >
                            <For each={SAMPLE_TASKS}>
                              {(t) => <option value={t}>{t}</option>}
                            </For>
                          </select>
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Hours</label>
                          <input
                            type="number"
                            style={styles.input}
                            value={entry.hours}
                            min="0.5"
                            max="12"
                            step="0.5"
                            onChange={(e) => updateEntry(entry.id, 'hours', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div style={styles.cardActions}>
                          <button
                            style={{ ...styles.smallBtn, ...styles.saveBtn }}
                            onClick={() => setEditingId(null)}
                          >Done</button>
                          <button
                            style={{ ...styles.smallBtn, ...styles.deleteBtn }}
                            onClick={() => deleteEntry(entry.id)}
                          >Delete</button>
                        </div>
                      </div>
                    ) : (
                      <div
                        style={styles.card}
                        onClick={() => setEditingId(entry.id)}
                      >
                        <div style={{ ...styles.cardAccent, background: projectColors[entry.project] || '#667eea' }}></div>
                        <span style={styles.cardHours}>{entry.hours}h</span>
                        <div style={styles.cardProject}>{entry.project}</div>
                        <div style={styles.cardTask}>{entry.task}</div>
                      </div>
                    )
                  )}
                </For>

                <button
                  style={styles.addBtn}
                  onClick={() => addEntry(date)}
                >
                  + Add Entry
                </button>
              </div>
            );
          }}
        </For>
      </div>
    </div>
  );
};

export default TimesheetV2;
