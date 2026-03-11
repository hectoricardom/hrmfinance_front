/**
 * MessageHistoryPanel Component
 * Compact message log filtered by client ID for use in StatusSection's Messages tab.
 */

import { Component, For, Show, onMount, createSignal } from 'solid-js';
import { communicationStore } from '../stores/communicationStore';
import {
  MESSAGE_STATUS_COLORS,
  MESSAGE_STATUS_LABELS,
  TRIGGER_TYPE_LABELS,
  type MessageLog,
} from '../types/communicationTypes';

interface MessageHistoryPanelProps {
  clientId: string;
}

const formatTimestamp = (ts: number): string => {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const MessageHistoryPanel: Component<MessageHistoryPanelProps> = (props) => {
  const [isLoading, setIsLoading] = createSignal(false);

  // Filter messages for this client
  const clientMessages = () =>
    communicationStore.state.messageLogs
      .filter((m) => m.clientId === props.clientId)
      .sort((a, b) => b.sentAt - a.sentAt);

  onMount(async () => {
    setIsLoading(true);
    try {
      communicationStore.setLogFilter('clientId', props.clientId);
      await communicationStore.loadMessageLogs();
    } finally {
      setIsLoading(false);
    }
  });

  const channelBadge = (channel: string) => ({
    display: 'inline-flex',
    'align-items': 'center',
    padding: '2px 6px',
    'border-radius': '4px',
    'font-size': '0.625rem',
    'font-weight': '600',
    'text-transform': 'uppercase' as const,
    'letter-spacing': '0.5px',
    background: channel === 'whatsapp' ? '#dcfce7' : '#dbeafe',
    color: channel === 'whatsapp' ? '#16a34a' : '#2563eb',
  });

  return (
    <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.5rem' }}>
      <div style={{
        display: 'flex',
        'justify-content': 'space-between',
        'align-items': 'center',
        'margin-bottom': '0.5rem',
      }}>
        <span style={{ 'font-weight': '600', 'font-size': '0.875rem', color: 'var(--text-primary)' }}>
          Message History
        </span>
        <span style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
          {clientMessages().length} message{clientMessages().length !== 1 ? 's' : ''}
        </span>
      </div>

      <Show when={isLoading()}>
        <div style={{
          padding: '2rem',
          'text-align': 'center',
          color: 'var(--text-muted)',
          'font-size': '0.875rem',
        }}>
          Loading messages...
        </div>
      </Show>

      <Show when={!isLoading() && clientMessages().length === 0}>
        <div style={{
          padding: '2rem',
          'text-align': 'center',
          color: 'var(--text-muted)',
          'font-size': '0.875rem',
          background: 'var(--background-color)',
          'border-radius': 'var(--border-radius-md)',
        }}>
          No messages sent to this client yet.
        </div>
      </Show>

      <Show when={!isLoading() && clientMessages().length > 0}>
        <div style={{
          display: 'flex',
          'flex-direction': 'column',
          gap: '0.5rem',
          'max-height': '400px',
          'overflow-y': 'auto',
        }}>
          <For each={clientMessages()}>
            {(msg) => (
              <div style={{
                padding: '0.75rem',
                background: 'var(--background-color)',
                'border-radius': 'var(--border-radius-md)',
                border: '1px solid var(--border-color)',
              }}>
                {/* Top row: timestamp + badges */}
                <div style={{
                  display: 'flex',
                  'align-items': 'center',
                  gap: '0.5rem',
                  'margin-bottom': '0.375rem',
                  'flex-wrap': 'wrap',
                }}>
                  <span style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                    {formatTimestamp(msg.sentAt)}
                  </span>

                  <Show when={msg.triggerType}>
                    <span style={{
                      display: 'inline-flex',
                      padding: '2px 6px',
                      'border-radius': '4px',
                      'font-size': '0.625rem',
                      'font-weight': '600',
                      background: '#f3e8ff',
                      color: '#7c3aed',
                    }}>
                      {TRIGGER_TYPE_LABELS[msg.triggerType!] || msg.triggerType}
                    </span>
                  </Show>

                  <span style={channelBadge(msg.channel)}>
                    {msg.channel}
                  </span>

                  <span style={{
                    display: 'inline-flex',
                    padding: '2px 6px',
                    'border-radius': '4px',
                    'font-size': '0.625rem',
                    'font-weight': '600',
                    background: `${MESSAGE_STATUS_COLORS[msg.status]}15`,
                    color: MESSAGE_STATUS_COLORS[msg.status],
                    'margin-left': 'auto',
                  }}>
                    {MESSAGE_STATUS_LABELS[msg.status]}
                  </span>
                </div>

                {/* Message body preview */}
                <div style={{
                  'font-size': '0.8125rem',
                  color: 'var(--text-primary)',
                  'line-height': '1.4',
                  'white-space': 'pre-wrap',
                  'word-break': 'break-word',
                  display: '-webkit-box',
                  '-webkit-line-clamp': '3',
                  '-webkit-box-orient': 'vertical',
                  overflow: 'hidden',
                }}>
                  {msg.body}
                </div>

                {/* Error message if failed */}
                <Show when={msg.status === 'failed' && msg.errorMessage}>
                  <div style={{
                    'margin-top': '0.375rem',
                    'font-size': '0.75rem',
                    color: '#ef4444',
                  }}>
                    Error: {msg.errorMessage}
                  </div>
                </Show>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
};

export default MessageHistoryPanel;
