import { Component, For, createSignal, Show } from 'solid-js';
import { Card, Button, Modal, FormInput, FormSelect } from '../../ui';
import JournalEntryForm, { JournalEntryFormData } from './JournalEntryForm';
import type { JournalEntry, Account } from '../types';

interface TransactionListProps {
  entries: JournalEntry[];
  accounts: Account[];
  onView: (entry: JournalEntry) => void;
  onPost: (entryId: string) => void;
  onVoid: (entryId: string) => void;
  onCreate: (data: JournalEntryFormData) => void;
}

const TransactionList: Component<TransactionListProps> = (props) => {
  const [showNewEntryModal, setShowNewEntryModal] = createSignal(false);
  const [startDate, setStartDate] = createSignal('');
  const [endDate, setEndDate] = createSignal('');
  const [statusFilter, setStatusFilter] = createSignal('');

  const filteredEntries = () => {
    return props.entries.filter(entry => {
      const matchesStartDate = !startDate() || new Date(entry.entryDate) >= new Date(startDate());
      const matchesEndDate = !endDate() || new Date(entry.entryDate) <= new Date(endDate());
      const matchesStatus = !statusFilter() || entry.status === statusFilter();

      return matchesStartDate && matchesEndDate && matchesStatus;
    });
  };

  const getStatusBadge = (status: 'pending' | 'posted' | 'voided') => {
    const styles = {
      pending: {
        background: 'var(--warning-color, #ffc107)',
        color: 'var(--text-primary)'
      },
      posted: {
        background: 'var(--success-color, #28a745)',
        color: 'white'
      },
      voided: {
        background: 'var(--danger-color, #dc3545)',
        color: 'white'
      }
    };

    const style = {
      ...styles[status],
      padding: '0.25rem 0.75rem',
      'border-radius': 'var(--border-radius-sm)',
      'font-size': '0.75rem',
      'font-weight': '600',
      'text-transform': 'uppercase' as const,
      display: 'inline-block'
    };

    return <span style={style}>{status}</span>;
  };

  const handleNewEntry = (data: JournalEntryFormData) => {
    props.onCreate(data);
    setShowNewEntryModal(false);
  };

  const tableStyle = {
    width: '100%',
    'border-collapse': 'collapse' as const
  };

  const thStyle = {
    padding: '1rem',
    'text-align': 'left' as const,
    'border-bottom': '2px solid var(--border-color)',
    'font-weight': '600',
    color: 'var(--text-primary)',
    'font-size': '0.875rem',
    'text-transform': 'uppercase' as const,
    background: 'var(--bg-muted, #f5f5f5)'
  };

  const tdStyle = {
    padding: '1rem',
    'border-bottom': '1px solid var(--border-color)',
    color: 'var(--text-primary)'
  };

  const headerStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '1.5rem'
  };

  const filtersStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    'margin-bottom': '1.5rem'
  };

  const actionButtonsStyle = {
    display: 'flex',
    gap: '0.5rem'
  };

  const emptyStateStyle = {
    'text-align': 'center' as const,
    padding: '3rem',
    color: 'var(--text-muted)'
  };

  return (
    <>
      <Card>
        <div style={headerStyle}>
          <h2 style={{ margin: '0', 'font-size': '1.5rem', color: 'var(--text-primary)' }}>
            Journal Entries
          </h2>
          <Button variant="primary" onClick={() => setShowNewEntryModal(true)}>
            + New Entry
          </Button>
        </div>

        <div style={filtersStyle}>
          <FormInput
            label="Start Date"
            type="date"
            value={startDate()}
            onChange={setStartDate}
          />
          <FormInput
            label="End Date"
            type="date"
            value={endDate()}
            onChange={setEndDate}
          />
          <FormSelect
            label="Status"
            value={statusFilter()}
            onChange={setStatusFilter}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'pending', label: 'Pending' },
              { value: 'posted', label: 'Posted' },
              { value: 'voided', label: 'Voided' }
            ]}
          />
        </div>

        <Show
          when={filteredEntries().length > 0}
          fallback={
            <div style={emptyStateStyle}>
              <p style={{ 'font-size': '1.125rem', 'margin-bottom': '0.5rem' }}>
                No journal entries found
              </p>
              <p style={{ 'font-size': '0.875rem' }}>
                Create your first entry to get started
              </p>
            </div>
          }
        >
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: '80px' }}>#</th>
                <th style={{ ...thStyle, width: '120px' }}>Date</th>
                <th style={thStyle}>Description</th>
                <th style={{ ...thStyle, width: '120px' }}>Reference</th>
                <th style={{ ...thStyle, width: '100px' }}>Status</th>
                <th style={{ ...thStyle, width: '200px', 'text-align': 'right' as const }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              <For each={filteredEntries()}>
                {(entry) => (
                  <tr>
                    <td style={tdStyle}>{entry.entryNumber}</td>
                    <td style={tdStyle}>
                      {new Date(entry.entryDate).toLocaleDateString()}
                    </td>
                    <td style={tdStyle}>{entry.description}</td>
                    <td style={tdStyle}>{entry.reference || '-'}</td>
                    <td style={tdStyle}>{getStatusBadge(entry.status)}</td>
                    <td style={{ ...tdStyle, 'text-align': 'right' as const }}>
                      <div style={actionButtonsStyle}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => props.onView(entry)}
                        >
                          View
                        </Button>
                        <Show when={entry.status === 'pending'}>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => props.onPost(entry.id)}
                          >
                            Post
                          </Button>
                        </Show>
                        <Show when={entry.status === 'posted'}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => props.onVoid(entry.id)}
                          >
                            Void
                          </Button>
                        </Show>
                      </div>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </Show>
      </Card>

      <Modal
        isOpen={showNewEntryModal()}
        onClose={() => setShowNewEntryModal(false)}
        title="New Journal Entry"
        maxWidth="1200px"
      >
        <JournalEntryForm
          accounts={props.accounts}
          onSubmit={handleNewEntry}
          onCancel={() => setShowNewEntryModal(false)}
        />
      </Modal>
    </>
  );
};

export default TransactionList;
