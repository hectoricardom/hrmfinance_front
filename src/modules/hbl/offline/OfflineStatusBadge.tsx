/**
 * Offline Status Badge Component
 * Shows current online/offline status and pending sync count
 */

import { Component, Show, createEffect, onMount, onCleanup } from 'solid-js';
import {
  isOnline,
  isSyncing,
  pendingCount,
  initSyncService,
  forceSyncNow,
  cleanupSyncService
} from './syncService';

interface OfflineStatusBadgeProps {
  showSyncButton?: boolean;
  compact?: boolean;
  onSyncComplete?: (result: { synced: number; failed: number }) => void;
}

const OfflineStatusBadge: Component<OfflineStatusBadgeProps> = (props) => {
  onMount(() => {
    initSyncService();
  });

  onCleanup(() => {
    // Don't cleanup on unmount - other components might use it
    // cleanupSyncService();
  });

  const handleSync = async () => {
    const result = await forceSyncNow();
    props.onSyncComplete?.(result);
  };

  // Styles
  const containerStyle = () => ({
    display: 'flex',
    'align-items': 'center',
    gap: props.compact ? '0.5rem' : '0.75rem',
    padding: props.compact ? '0.375rem 0.625rem' : '0.5rem 1rem',
    'border-radius': '20px',
    'font-size': props.compact ? '0.75rem' : '0.875rem',
    'font-weight': '500',
    background: isOnline() ? '#e8f5e9' : '#fff3e0',
    color: isOnline() ? '#2e7d32' : '#ef6c00',
    border: `1px solid ${isOnline() ? '#a5d6a7' : '#ffcc80'}`,
    transition: 'all 0.3s ease'
  });

  const dotStyle = () => ({
    width: props.compact ? '8px' : '10px',
    height: props.compact ? '8px' : '10px',
    'border-radius': '50%',
    background: isOnline() ? '#4caf50' : '#ff9800',
    animation: isSyncing() ? 'pulse 1s infinite' : 'none'
  });

  const pendingBadgeStyle = {
    background: '#f44336',
    color: 'white',
    padding: '0.125rem 0.5rem',
    'border-radius': '10px',
    'font-size': '0.7rem',
    'font-weight': '600',
    'margin-left': '0.25rem'
  };

  const syncButtonStyle = {
    padding: '0.25rem 0.5rem',
    'border-radius': '12px',
    border: 'none',
    background: '#1976d2',
    color: 'white',
    cursor: 'pointer',
    'font-size': '0.75rem',
    'font-weight': '500',
    display: 'flex',
    'align-items': 'center',
    gap: '0.25rem',
    opacity: isSyncing() ? 0.7 : 1
  };

  return (
    <div style={containerStyle()}>
      {/* Status dot */}
      <div style={dotStyle()} />

      {/* Status text */}
      <span>
        {isOnline() ? 'Online' : 'Offline'}
      </span>

      {/* Pending count badge */}
      <Show when={pendingCount() > 0}>
        <span style={pendingBadgeStyle}>
          {pendingCount()} pendiente{pendingCount() > 1 ? 's' : ''}
        </span>
      </Show>

      {/* Sync button */}
      <Show when={props.showSyncButton && isOnline() && pendingCount() > 0}>
        <button
          style={syncButtonStyle}
          onClick={handleSync}
          disabled={isSyncing()}
        >
          {isSyncing() ? (
            <>
              <span style={{ animation: 'spin 1s linear infinite' }}>⟳</span>
              Sincronizando...
            </>
          ) : (
            <>
              ⟳ Sincronizar
            </>
          )}
        </button>
      </Show>

      {/* Syncing indicator */}
      <Show when={isSyncing()}>
        <span style={{ 'font-size': '0.75rem', color: '#1976d2' }}>
          Sincronizando...
        </span>
      </Show>

      {/* CSS animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default OfflineStatusBadge;
