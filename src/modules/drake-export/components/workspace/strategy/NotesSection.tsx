/**
 * NotesSection
 * SolidJS component for managing multiple preparer notes with add, edit, and delete functionality.
 */

import { Component, createSignal, createMemo, For, Show } from 'solid-js';
import { PreparerNote, createDefaultPreparerNote } from '../../../types/taxStrategyTypes';
import { FormInput } from '../../../../ui';

// Types
type NoteCategory = PreparerNote['category'];
type NotePriority = NonNullable<PreparerNote['priority']>;
type SortOption = 'date' | 'priority';

interface NotesSectionProps {
  notes: PreparerNote[];
  onChange: (notes: PreparerNote[]) => void;
  title?: string;
}

// Category configuration
const CATEGORY_CONFIG: Record<NoteCategory, { label: string; color: string; bg: string }> = {
  general: { label: 'General', color: '#6b7280', bg: 'rgba(107, 114, 128, 0.1)' },
  income: { label: 'Income', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' },
  deductions: { label: 'Deductions', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
  credits: { label: 'Credits', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' },
  vehicle: { label: 'Vehicle', color: '#f97316', bg: 'rgba(249, 115, 22, 0.1)' },
  rental: { label: 'Rental', color: '#14b8a6', bg: 'rgba(20, 184, 166, 0.1)' },
  question: { label: 'Question', color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.15)' },
  followup: { label: 'Follow-up', color: '#eab308', bg: 'rgba(234, 179, 8, 0.1)' },
  important: { label: 'Important', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
};

// Priority configuration
const PRIORITY_CONFIG: Record<NotePriority, { label: string; color: string }> = {
  low: { label: 'Low', color: '#22c55e' },
  medium: { label: 'Medium', color: '#eab308' },
  high: { label: 'High', color: '#ef4444' },
};

const PRIORITY_ORDER: Record<NotePriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const NotesSection: Component<NotesSectionProps> = (props) => {
  // State
  const [filterCategory, setFilterCategory] = createSignal<NoteCategory | 'all'>('all');
  const [sortBy, setSortBy] = createSignal<SortOption>('date');
  const [collapsedNotes, setCollapsedNotes] = createSignal<Set<string>>(new Set());
  const [editingNoteId, setEditingNoteId] = createSignal<string | null>(null);

  // Filtered and sorted notes
  const filteredNotes = createMemo(() => {
    let notes = [...props.notes];

    // Filter by category
    const category = filterCategory();
    if (category !== 'all') {
      notes = notes.filter((note) => note.category === category);
    }

    // Sort
    const sort = sortBy();
    if (sort === 'date') {
      notes.sort((a, b) => b.createdAt - a.createdAt);
    } else if (sort === 'priority') {
      notes.sort((a, b) => {
        const priorityA = PRIORITY_ORDER[a.priority || 'medium'];
        const priorityB = PRIORITY_ORDER[b.priority || 'medium'];
        return priorityA - priorityB;
      });
    }

    return notes;
  });

  // Handlers
  const handleAddNote = () => {
    const newNote = createDefaultPreparerNote();
    props.onChange([...props.notes, newNote]);
    setEditingNoteId(newNote.id);
  };

  const handleUpdateNote = (noteId: string, updates: Partial<PreparerNote>) => {
    const updatedNotes = props.notes.map((note) =>
      note.id === noteId
        ? { ...note, ...updates, updatedAt: Date.now() }
        : note
    );
    props.onChange(updatedNotes);
  };

  const handleDeleteNote = (noteId: string) => {
    const updatedNotes = props.notes.filter((note) => note.id !== noteId);
    props.onChange(updatedNotes);
  };

  const toggleNoteCollapse = (noteId: string) => {
    setCollapsedNotes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(noteId)) {
        newSet.delete(noteId);
      } else {
        newSet.add(noteId);
      }
      return newSet;
    });
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Styles
  const sectionStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    gap: '1rem',
  };

  const headerStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'flex-wrap': 'wrap' as const,
    gap: '1rem',
  };

  const titleStyle = {
    'font-size': '1.125rem',
    'font-weight': '600',
    color: 'var(--text-primary, #1f2937)',
    margin: '0',
  };

  const controlsStyle = {
    display: 'flex',
    gap: '0.75rem',
    'align-items': 'center',
    'flex-wrap': 'wrap' as const,
  };

  const selectStyle = {
    padding: '0.5rem 0.75rem',
    border: '1px solid var(--border-color, #e5e7eb)',
    'border-radius': '6px',
    'font-size': '0.875rem',
    background: 'var(--surface-color, #ffffff)',
    color: 'var(--text-primary, #1f2937)',
    cursor: 'pointer',
    outline: 'none',
  };

  const addButtonStyle = {
    padding: '0.5rem 1rem',
    background: 'var(--primary-color, #3b82f6)',
    color: 'white',
    border: 'none',
    'border-radius': '6px',
    'font-size': '0.875rem',
    'font-weight': '500',
    cursor: 'pointer',
    display: 'flex',
    'align-items': 'center',
    gap: '0.375rem',
    transition: 'all 0.2s ease',
  };

  const noteCardStyle = (category: NoteCategory, isCollapsed: boolean) => ({
    border: '1px solid var(--border-color, #e5e7eb)',
    'border-radius': '8px',
    background: 'var(--surface-color, #ffffff)',
    'border-left': category === 'important'
      ? '4px solid #ef4444'
      : category === 'question'
        ? '4px solid #0ea5e9'
        : '4px solid var(--border-color, #e5e7eb)',
    overflow: 'hidden',
    transition: 'all 0.2s ease',
    'box-shadow': category === 'question'
      ? '0 0 0 1px rgba(14, 165, 233, 0.2)'
      : 'none',
  });

  const noteHeaderStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '0.75rem 1rem',
    background: 'var(--surface-alt, #f9fafb)',
    cursor: 'pointer',
    'user-select': 'none' as const,
  };

  const noteHeaderLeftStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.75rem',
    flex: '1',
    'min-width': '0',
  };

  const noteHeaderRightStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
  };

  const noteBodyStyle = {
    padding: '1rem',
    display: 'flex',
    'flex-direction': 'column' as const,
    gap: '1rem',
  };

  const categoryBadgeStyle = (category: NoteCategory) => {
    const config = CATEGORY_CONFIG[category];
    return {
      display: 'inline-flex',
      'align-items': 'center',
      padding: '0.25rem 0.5rem',
      'border-radius': '4px',
      background: config.bg,
      color: config.color,
      'font-size': '0.6875rem',
      'font-weight': '600',
      'text-transform': 'uppercase' as const,
      'letter-spacing': '0.05em',
    };
  };

  const priorityIndicatorStyle = (priority: NotePriority) => {
    const config = PRIORITY_CONFIG[priority];
    return {
      width: '10px',
      height: '10px',
      'border-radius': '50%',
      background: config.color,
      'flex-shrink': '0',
    };
  };

  const textareaStyle = {
    width: '100%',
    'min-height': '80px',
    padding: '0.75rem',
    border: '1px solid var(--border-color, #e5e7eb)',
    'border-radius': '6px',
    'font-size': '0.875rem',
    'font-family': 'inherit',
    resize: 'vertical' as const,
    outline: 'none',
    'box-sizing': 'border-box' as const,
  };

  const fieldRowStyle = {
    display: 'flex',
    gap: '1rem',
    'align-items': 'center',
    'flex-wrap': 'wrap' as const,
  };

  const fieldGroupStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    gap: '0.25rem',
  };

  const labelStyle = {
    'font-size': '0.75rem',
    'font-weight': '500',
    color: 'var(--text-secondary, #6b7280)',
  };

  const checkboxLabelStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    'font-size': '0.875rem',
    color: 'var(--text-primary, #1f2937)',
    cursor: 'pointer',
  };

  const timestampStyle = {
    'font-size': '0.75rem',
    color: 'var(--text-muted, #9ca3af)',
  };

  const actionButtonStyle = (variant: 'edit' | 'delete') => ({
    padding: '0.375rem 0.625rem',
    background: variant === 'delete' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
    color: variant === 'delete' ? '#ef4444' : '#3b82f6',
    border: 'none',
    'border-radius': '4px',
    'font-size': '0.75rem',
    'font-weight': '500',
    cursor: 'pointer',
    display: 'flex',
    'align-items': 'center',
    gap: '0.25rem',
    transition: 'all 0.2s ease',
  });

  const collapseIconStyle = (isCollapsed: boolean) => ({
    width: '16px',
    height: '16px',
    transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
    transition: 'transform 0.2s ease',
    color: 'var(--text-secondary, #6b7280)',
  });

  const emptyStateStyle = {
    'text-align': 'center' as const,
    padding: '2rem',
    color: 'var(--text-secondary, #6b7280)',
    border: '1px dashed var(--border-color, #e5e7eb)',
    'border-radius': '8px',
  };

  const notePreviewStyle = {
    'font-size': '0.875rem',
    color: 'var(--text-secondary, #6b7280)',
    'white-space': 'nowrap' as const,
    overflow: 'hidden',
    'text-overflow': 'ellipsis',
    'max-width': '300px',
  };

  const resolvedStyle = {
    opacity: '0.6',
    'text-decoration': 'line-through',
  };

  return (
    <div style={sectionStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h3 style={titleStyle}>{props.title || 'Preparer Notes'}</h3>
        <div style={controlsStyle}>
          {/* Filter by Category */}
          <select
            style={selectStyle}
            value={filterCategory()}
            onChange={(e) => setFilterCategory(e.currentTarget.value as NoteCategory | 'all')}
          >
            <option value="all">All Categories</option>
            <For each={Object.entries(CATEGORY_CONFIG)}>
              {([key, config]) => (
                <option value={key}>{config.label}</option>
              )}
            </For>
          </select>

          {/* Sort */}
          <select
            style={selectStyle}
            value={sortBy()}
            onChange={(e) => setSortBy(e.currentTarget.value as SortOption)}
          >
            <option value="date">Sort by Date</option>
            <option value="priority">Sort by Priority</option>
          </select>

          {/* Add Note Button */}
          <button style={addButtonStyle} onClick={handleAddNote}>
            <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '16px', height: '16px' }}>
              <path
                fill-rule="evenodd"
                d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                clip-rule="evenodd"
              />
            </svg>
            Add Note
          </button>
        </div>
      </div>

      {/* Notes List */}
      <Show
        when={filteredNotes().length > 0}
        fallback={
          <div style={emptyStateStyle}>
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              style={{ width: '48px', height: '48px', margin: '0 auto 1rem', opacity: '0.4' }}
            >
              <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
            </svg>
            <p style={{ margin: '0 0 0.5rem', 'font-weight': '500' }}>No notes yet</p>
            <p style={{ margin: '0', 'font-size': '0.875rem' }}>
              Click "Add Note" to create your first preparer note.
            </p>
          </div>
        }
      >
        <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.75rem' }}>
          <For each={filteredNotes()}>
            {(note) => {
              const isCollapsed = collapsedNotes().has(note.id);
              const isEditing = editingNoteId() === note.id;
              const priority = note.priority || 'medium';

              return (
                <div
                  style={{
                    ...noteCardStyle(note.category, isCollapsed),
                    ...(note.resolved ? resolvedStyle : {}),
                  }}
                >
                  {/* Note Header */}
                  <div
                    style={noteHeaderStyle}
                    onClick={() => toggleNoteCollapse(note.id)}
                  >
                    <div style={noteHeaderLeftStyle}>
                      <svg
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        style={collapseIconStyle(isCollapsed)}
                      >
                        <path
                          fill-rule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clip-rule="evenodd"
                        />
                      </svg>
                      <div style={priorityIndicatorStyle(priority)} title={`${PRIORITY_CONFIG[priority].label} Priority`} />
                      <span style={categoryBadgeStyle(note.category)}>
                        {CATEGORY_CONFIG[note.category].label}
                      </span>
                      <Show when={isCollapsed && note.content}>
                        <span style={notePreviewStyle}>{note.content}</span>
                      </Show>
                      <Show when={note.resolved}>
                        <span
                          style={{
                            display: 'inline-flex',
                            'align-items': 'center',
                            padding: '0.125rem 0.375rem',
                            'border-radius': '4px',
                            background: 'rgba(34, 197, 94, 0.1)',
                            color: '#22c55e',
                            'font-size': '0.625rem',
                            'font-weight': '600',
                            'text-transform': 'uppercase',
                          }}
                        >
                          Resolved
                        </span>
                      </Show>
                    </div>
                    <div style={noteHeaderRightStyle} onClick={(e) => e.stopPropagation()}>
                      <button
                        style={actionButtonStyle('edit')}
                        onClick={() => setEditingNoteId(isEditing ? null : note.id)}
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '12px', height: '12px' }}>
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                        {isEditing ? 'Done' : 'Edit'}
                      </button>
                      <button
                        style={actionButtonStyle('delete')}
                        onClick={() => handleDeleteNote(note.id)}
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '12px', height: '12px' }}>
                          <path
                            fill-rule="evenodd"
                            d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                            clip-rule="evenodd"
                          />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Note Body */}
                  <Show when={!isCollapsed}>
                    <div style={noteBodyStyle}>
                      {/* Content */}
                      <div style={fieldGroupStyle}>
                        <label style={labelStyle}>Content</label>
                        <FormInput
                          style={textareaStyle}
                          value={note.content}
                          placeholder="Enter note content..."
                          onChange={(e) =>
                            handleUpdateNote(note.id, { content: e })
                          }
                          readOnly={!isEditing && note.content !== ''}
                        />
                      </div>

                      {/* Controls Row */}
                      <div style={fieldRowStyle}>
                        {/* Category */}
                        <div style={fieldGroupStyle}>
                          <label style={labelStyle}>Category</label>
                          <select
                            style={selectStyle}
                            value={note.category}
                            onChange={(e) =>
                              handleUpdateNote(note.id, {
                                category: e.currentTarget.value as NoteCategory,
                              })
                            }
                          >
                            <For each={Object.entries(CATEGORY_CONFIG)}>
                              {([key, config]) => (
                                <option value={key}>{config.label}</option>
                              )}
                            </For>
                          </select>
                        </div>

                        {/* Priority */}
                        <div style={fieldGroupStyle}>
                          <label style={labelStyle}>Priority</label>
                          <select
                            style={selectStyle}
                            value={priority}
                            onChange={(e) =>
                              handleUpdateNote(note.id, {
                                priority: e.currentTarget.value as NotePriority,
                              })
                            }
                          >
                            <For each={Object.entries(PRIORITY_CONFIG)}>
                              {([key, config]) => (
                                <option value={key}>{config.label}</option>
                              )}
                            </For>
                          </select>
                        </div>

                        {/* Resolved Checkbox */}
                        <div style={{ ...fieldGroupStyle, 'justify-content': 'flex-end' }}>
                          <label style={checkboxLabelStyle}>
                            <input
                              type="checkbox"
                              checked={note.resolved || false}
                              onChange={(e) =>
                                handleUpdateNote(note.id, { resolved: e.currentTarget.checked })
                              }
                              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                            Resolved
                          </label>
                        </div>
                      </div>

                      {/* Timestamps */}
                      <div style={{ display: 'flex', gap: '1.5rem' }}>
                        <span style={timestampStyle}>
                          Created: {formatTimestamp(note.createdAt)}
                        </span>
                        <Show when={note.updatedAt && note.updatedAt !== note.createdAt}>
                          <span style={timestampStyle}>
                            Updated: {formatTimestamp(note.updatedAt!)}
                          </span>
                        </Show>
                      </div>
                    </div>
                  </Show>
                </div>
              );
            }}
          </For>
        </div>
      </Show>
    </div>
  );
};

export default NotesSection;



/// LISBEY ALVAREZGONZALEZ