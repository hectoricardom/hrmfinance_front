/**
 * Message Log View
 * Displays message history with filtering, status badges, and resend capability.
 */

import { Component, createSignal, createMemo, onMount, Show, For } from 'solid-js';
import { useTranslation } from '../../../translations';
import { Card, Button, FormInput, FormSelect } from '../../ui';
import { communicationStore } from '../stores/communicationStore';
import {
  MESSAGE_STATUS_COLORS,
  MESSAGE_STATUS_LABELS,
  TRIGGER_TYPE_LABELS,
  type MessageLog,
  type MessageStatus,
  type MessageTriggerType,
} from '../types/communicationTypes';

// ============================================
// Styles
// ============================================

const styles = {
  container: {
    padding: '24px',
    'max-width': '1100px',
    margin: '0 auto',
  } as Record<string, string>,

  header: {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '20px',
  } as Record<string, string>,

  title: {
    'font-size': '24px',
    'font-weight': '700',
    color: '#1f2937',
    margin: '0',
  } as Record<string, string>,

  subtitle: {
    'font-size': '14px',
    color: '#6b7280',
    'margin-top': '4px',
  } as Record<string, string>,

  filtersRow: {
    display: 'flex',
    gap: '12px',
    'margin-bottom': '16px',
    'flex-wrap': 'wrap',
    'align-items': 'flex-end',
  } as Record<string, string>,

  filterItem: {
    'min-width': '160px',
  } as Record<string, string>,

  table: {
    width: '100%',
    'border-collapse': 'collapse',
  } as Record<string, string>,

  th: {
    'text-align': 'left',
    padding: '10px 12px',
    'font-size': '12px',
    'font-weight': '600',
    color: '#6b7280',
    'text-transform': 'uppercase',
    'letter-spacing': '0.05em',
    'border-bottom': '2px solid #e5e7eb',
    'white-space': 'nowrap',
  } as Record<string, string>,

  td: {
    padding: '12px',
    'font-size': '13px',
    color: '#374151',
    'border-bottom': '1px solid #f3f4f6',
    'vertical-align': 'top',
  } as Record<string, string>,

  row: (isExpanded: boolean) => ({
    background: isExpanded ? '#f9fafb' : '#fff',
    cursor: 'pointer',
    transition: 'background 0.15s',
  }) as Record<string, string>,

  clientName: {
    'font-weight': '500',
    color: '#1f2937',
  } as Record<string, string>,

  clientPhone: {
    'font-size': '12px',
    color: '#9ca3af',
  } as Record<string, string>,

  channelBadge: (channel: string) => ({
    display: 'inline-flex',
    'align-items': 'center',
    gap: '4px',
    padding: '2px 8px',
    'border-radius': '12px',
    'font-size': '11px',
    'font-weight': '500',
    background: channel === 'whatsapp' ? '#dcfce7' : '#e0ecff',
    color: channel === 'whatsapp' ? '#166534' : '#1a73e8',
  }) as Record<string, string>,

  statusBadge: (status: MessageStatus) => ({
    display: 'inline-block',
    padding: '2px 8px',
    'border-radius': '12px',
    'font-size': '11px',
    'font-weight': '500',
    background: `${MESSAGE_STATUS_COLORS[status]}20`,
    color: MESSAGE_STATUS_COLORS[status],
  }) as Record<string, string>,

  messagePreview: {
    'max-width': '280px',
    overflow: 'hidden',
    'text-overflow': 'ellipsis',
    'white-space': 'nowrap',
    'font-size': '13px',
    color: '#6b7280',
  } as Record<string, string>,

  expandedRow: {
    background: '#f9fafb',
    'border-bottom': '1px solid #e5e7eb',
  } as Record<string, string>,

  expandedContent: {
    padding: '16px 12px',
  } as Record<string, string>,

  expandedLabel: {
    'font-size': '11px',
    'font-weight': '600',
    color: '#9ca3af',
    'text-transform': 'uppercase',
    'letter-spacing': '0.05em',
    'margin-bottom': '4px',
  } as Record<string, string>,

  expandedBody: {
    padding: '12px',
    background: '#fff',
    'border-radius': '8px',
    border: '1px solid #e5e7eb',
    'font-size': '13px',
    'line-height': '1.6',
    color: '#374151',
    'white-space': 'pre-wrap',
    'margin-top': '4px',
    'margin-bottom': '12px',
  } as Record<string, string>,

  expandedMeta: {
    display: 'flex',
    gap: '24px',
    'flex-wrap': 'wrap',
    'margin-bottom': '12px',
  } as Record<string, string>,

  metaItem: {
    'font-size': '12px',
    color: '#6b7280',
  } as Record<string, string>,

  metaValue: {
    'font-weight': '500',
    color: '#374151',
  } as Record<string, string>,

  errorText: {
    'font-size': '12px',
    color: '#ef4444',
    'margin-top': '4px',
  } as Record<string, string>,

  emptyState: {
    padding: '48px 24px',
    'text-align': 'center',
    color: '#9ca3af',
  } as Record<string, string>,

  emptyIcon: {
    'font-size': '40px',
    'margin-bottom': '12px',
  } as Record<string, string>,

  loadMore: {
    padding: '16px',
    'text-align': 'center',
  } as Record<string, string>,

  triggerBadge: {
    display: 'inline-block',
    padding: '2px 6px',
    'border-radius': '4px',
    'font-size': '11px',
    background: '#f3f4f6',
    color: '#6b7280',
  } as Record<string, string>,

  timestamp: {
    'font-size': '12px',
    color: '#9ca3af',
    'white-space': 'nowrap',
  } as Record<string, string>,
};

// ============================================
// Helpers
// ============================================

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatFullTimestamp(ts: number): string {
  return new Date(ts).toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}

// ============================================
// Component
// ============================================

const MessageLogView: Component = () => {
  const { t } = useTranslation();

  const [expandedId, setExpandedId] = createSignal<string | null>(null);
  const [clientFilter, setClientFilter] = createSignal('');
  const [resending, setResending] = createSignal<string | null>(null);

  onMount(async () => {
    await communicationStore.loadMessageLogs();
  });

  // Filtered logs (client name search is done client-side for quick filtering)
  const filteredLogs = createMemo(() => {
    let logs = communicationStore.state.messageLogs;

    const query = clientFilter().toLowerCase().trim();
    if (query) {
      logs = logs.filter(
        (log) =>
          log.clientName.toLowerCase().includes(query) ||
          log.clientPhone?.includes(query) ||
          log.body.toLowerCase().includes(query)
      );
    }

    return logs;
  });

  const handleStatusFilter = (status: string) => {
    communicationStore.setLogFilter('status', status === 'all' ? null : (status as MessageStatus));
    communicationStore.loadMessageLogs();
  };

  const handleTriggerFilter = (triggerType: string) => {
    communicationStore.setLogFilter(
      'triggerType',
      triggerType === 'all' ? null : (triggerType as MessageTriggerType)
    );
    communicationStore.loadMessageLogs();
  };

  const handleChannelFilter = (channel: string) => {
    communicationStore.setLogFilter('channel', channel === 'all' ? null : channel);
    communicationStore.loadMessageLogs();
  };

  const handleDateFilter = (type: 'start' | 'end', value: string) => {
    if (!value) {
      communicationStore.setLogFilter(type === 'start' ? 'startDate' : 'endDate', null);
    } else {
      const ts = new Date(value).getTime();
      communicationStore.setLogFilter(type === 'start' ? 'startDate' : 'endDate', ts);
    }
    communicationStore.loadMessageLogs();
  };

  const handleResend = async (log: MessageLog) => {
    setResending(log.id);
    try {
      await communicationStore.resendMessage(log);
    } finally {
      setResending(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId() === id ? null : id);
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Message History</h1>
          <p style={styles.subtitle}>
            View and manage all sent WhatsApp and email communications
          </p>
        </div>
        <Button onClick={() => communicationStore.loadMessageLogs()}>
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div style={styles.filtersRow}>
          <div style={styles.filterItem}>
            <FormInput
              label="Search Client"
              value={clientFilter()}
              onInput={(e: any) => setClientFilter(e.target.value)}
              placeholder="Name or phone..."
            />
          </div>
          <div style={styles.filterItem}>
            <FormSelect
              label="Status"
              value={communicationStore.state.logFilters.status || 'all'}
              onInput={(e: any) => handleStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'pending', label: 'Pending' },
                { value: 'sent', label: 'Sent' },
                { value: 'delivered', label: 'Delivered' },
                { value: 'read', label: 'Read' },
                { value: 'failed', label: 'Failed' },
              ]}
            />
          </div>
          <div style={styles.filterItem}>
            <FormSelect
              label="Trigger"
              value={communicationStore.state.logFilters.triggerType || 'all'}
              onInput={(e: any) => handleTriggerFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Triggers' },
                ...Object.entries(TRIGGER_TYPE_LABELS).map(([value, label]) => ({
                  value,
                  label,
                })),
                { value: 'quick', label: 'Quick Message' },
              ]}
            />
          </div>
          <div style={styles.filterItem}>
            <FormSelect
              label="Channel"
              value={communicationStore.state.logFilters.channel || 'all'}
              onInput={(e: any) => handleChannelFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Channels' },
                { value: 'whatsapp', label: 'WhatsApp' },
                { value: 'email', label: 'Email' },
              ]}
            />
          </div>
          <div style={styles.filterItem}>
            <FormInput
              label="From Date"
              type="date"
              value=""
              onInput={(e: any) => handleDateFilter('start', e.target.value)}
            />
          </div>
          <div style={styles.filterItem}>
            <FormInput
              label="To Date"
              type="date"
              value=""
              onInput={(e: any) => handleDateFilter('end', e.target.value)}
            />
          </div>
          <div>
            <Button
              onClick={() => {
                setClientFilter('');
                communicationStore.clearLogFilters();
                communicationStore.loadMessageLogs();
              }}
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Message Table */}
      <Card>
        <Show
          when={filteredLogs().length > 0}
          fallback={
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>--</div>
              <p>No messages found</p>
              <p style={{ 'font-size': '13px' }}>
                Messages will appear here once they are sent via WhatsApp or email.
              </p>
            </div>
          }
        >
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Time</th>
                <th style={styles.th}>Client</th>
                <th style={styles.th}>Channel</th>
                <th style={styles.th}>Trigger</th>
                <th style={styles.th}>Message</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              <For each={filteredLogs()}>
                {(log) => (
                  <>
                    <tr
                      style={styles.row(expandedId() === log.id)}
                      onClick={() => toggleExpand(log.id)}
                    >
                      <td style={styles.td}>
                        <span style={styles.timestamp}>{formatTimestamp(log.sentAt)}</span>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.clientName}>{log.clientName}</div>
                        <div style={styles.clientPhone}>{log.clientPhone || log.clientEmail}</div>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.channelBadge(log.channel)}>
                          {log.channel === 'whatsapp' ? 'WA' : '@'}{' '}
                          {log.channel === 'whatsapp' ? 'WhatsApp' : 'Email'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.triggerBadge}>
                          {log.triggerType
                            ? TRIGGER_TYPE_LABELS[log.triggerType] || log.triggerType
                            : 'Quick Message'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.messagePreview}>{log.body}</div>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.statusBadge(log.status)}>
                          {MESSAGE_STATUS_LABELS[log.status]}
                        </span>
                      </td>
                    </tr>

                    {/* Expanded row */}
                    <Show when={expandedId() === log.id}>
                      <tr style={styles.expandedRow}>
                        <td colspan="6" style={{ padding: '0' }}>
                          <div style={styles.expandedContent}>
                            <div style={styles.expandedMeta}>
                              <div style={styles.metaItem}>
                                Sent: <span style={styles.metaValue}>{formatFullTimestamp(log.sentAt)}</span>
                              </div>
                              <Show when={log.deliveredAt}>
                                <div style={styles.metaItem}>
                                  Delivered: <span style={styles.metaValue}>{formatFullTimestamp(log.deliveredAt!)}</span>
                                </div>
                              </Show>
                              <Show when={log.readAt}>
                                <div style={styles.metaItem}>
                                  Read: <span style={styles.metaValue}>{formatFullTimestamp(log.readAt!)}</span>
                                </div>
                              </Show>
                              <div style={styles.metaItem}>
                                Language: <span style={styles.metaValue}>{log.language === 'es' ? 'Spanish' : 'English'}</span>
                              </div>
                              <Show when={log.externalId}>
                                <div style={styles.metaItem}>
                                  ID: <span style={styles.metaValue}>{log.externalId}</span>
                                </div>
                              </Show>
                            </div>

                            <div style={styles.expandedLabel}>Full Message</div>
                            <div style={styles.expandedBody}>{log.body}</div>

                            <Show when={log.errorMessage}>
                              <div style={styles.errorText}>
                                Error: {log.errorMessage}
                              </div>
                            </Show>

                            <Show when={log.status === 'failed'}>
                              <Button
                                onClick={(e: MouseEvent) => {
                                  e.stopPropagation();
                                  handleResend(log);
                                }}
                                disabled={resending() === log.id}
                              >
                                {resending() === log.id ? 'Resending...' : 'Resend Message'}
                              </Button>
                            </Show>
                          </div>
                        </td>
                      </tr>
                    </Show>
                  </>
                )}
              </For>
            </tbody>
          </table>
        </Show>

        {/* Load More */}
        <Show when={communicationStore.state.logPagination.hasMore}>
          <div style={styles.loadMore}>
            <Button
              onClick={() => communicationStore.loadMoreLogs()}
              disabled={communicationStore.state.isLoading}
            >
              {communicationStore.state.isLoading ? 'Loading...' : 'Load More Messages'}
            </Button>
          </div>
        </Show>

        {/* Loading indicator */}
        <Show when={communicationStore.state.isLoading && filteredLogs().length === 0}>
          <div style={styles.emptyState}>
            <p>Loading messages...</p>
          </div>
        </Show>
      </Card>
    </div>
  );
};

export default MessageLogView;
