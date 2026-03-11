/**
 * Pending Scans Manager Component
 * Displays and manages pending offline HBL scans
 */

import { Component, Show, For, createSignal, createEffect, onMount } from 'solid-js';
import {
  getPendingScans,
  PendingScan,
  getSyncedScans,
  SyncedScan,
  getSyncLog,
  SyncLogEntry
} from './offlineDb';
import {
  isOnline,
  isSyncing,
  syncProgress,
  lastSyncTime,
  pendingCount,
  forceSyncNow,
  retryScan,
  removePendingScan
} from './syncService';
import { devLog } from '../../../services/utils';

interface PendingScansManagerProps {
  onClose?: () => void;
  compact?: boolean;
}

const PendingScansManager: Component<PendingScansManagerProps> = (props) => {
  const [pendingScans, setPendingScans] = createSignal<PendingScan[]>([]);
  const [syncedScans, setSyncedScans] = createSignal<SyncedScan[]>([]);
  const [syncLog, setSyncLog] = createSignal<SyncLogEntry[]>([]);
  const [activeTab, setActiveTab] = createSignal<'pending' | 'synced' | 'log'>('pending');
  const [loading, setLoading] = createSignal(false);
  const [retryingId, setRetryingId] = createSignal<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pending, synced, log] = await Promise.all([
        getPendingScans(),
        getSyncedScans(50),
        getSyncLog(30)
      ]);
      setPendingScans(pending);
      setSyncedScans(synced);
      setSyncLog(log);
    } catch (error) {
      devLog('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  onMount(() => {
    loadData();
  });

  // Refresh data when syncing completes
  createEffect(() => {
    if (!isSyncing()) {
      loadData();
    }
  });

  const handleSync = async () => {
    await forceSyncNow();
    await loadData();
  };

  const handleRetry = async (scanId: string) => {
    setRetryingId(scanId);
    try {
      await retryScan(scanId);
      await loadData();
    } finally {
      setRetryingId(null);
    }
  };

  const handleRemove = async (scanId: string) => {
    if (confirm('¿Eliminar este escaneo pendiente? No se sincronizará.')) {
      await removePendingScan(scanId);
      await loadData();
    }
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Styles
  const containerStyle = {
    background: 'white',
    'border-radius': '12px',
    'box-shadow': '0 4px 20px rgba(0,0,0,0.15)',
    overflow: 'hidden',
    'max-width': props.compact ? '400px' : '600px',
    width: '100%'
  };

  const headerStyle = {
    background: '#1976d2',
    color: 'white',
    padding: '1rem 1.25rem',
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center'
  };

  const tabsStyle = {
    display: 'flex',
    'border-bottom': '1px solid #e0e0e0',
    background: '#f5f5f5'
  };

  const tabStyle = (isActive: boolean) => ({
    padding: '0.75rem 1.25rem',
    cursor: 'pointer',
    background: isActive ? 'white' : 'transparent',
    border: 'none',
    'border-bottom': isActive ? '3px solid #1976d2' : '3px solid transparent',
    color: isActive ? '#1976d2' : '#666',
    'font-weight': isActive ? '600' : '400',
    'font-size': '0.875rem',
    transition: 'all 0.2s'
  });

  const contentStyle = {
    'max-height': '400px',
    'overflow-y': 'auto',
    padding: '1rem'
  };

  const scanCardStyle = {
    background: '#f9f9f9',
    'border-radius': '8px',
    padding: '0.875rem',
    'margin-bottom': '0.75rem',
    border: '1px solid #e0e0e0'
  };

  const hblStyle = {
    'font-weight': '600',
    'font-size': '1rem',
    color: '#333',
    'margin-bottom': '0.375rem'
  };

  const statusBadgeStyle = (synced: boolean) => ({
    display: 'inline-block',
    padding: '0.125rem 0.5rem',
    'border-radius': '12px',
    'font-size': '0.75rem',
    'font-weight': '500',
    background: synced ? '#e8f5e9' : '#fff3e0',
    color: synced ? '#2e7d32' : '#ef6c00',
    'margin-left': '0.5rem'
  });

  const metaStyle = {
    'font-size': '0.8rem',
    color: '#666',
    'margin-bottom': '0.25rem'
  };

  const errorStyle = {
    'font-size': '0.75rem',
    color: '#d32f2f',
    'background': '#ffebee',
    padding: '0.375rem 0.5rem',
    'border-radius': '4px',
    'margin-top': '0.5rem'
  };

  const buttonGroupStyle = {
    display: 'flex',
    gap: '0.5rem',
    'margin-top': '0.5rem'
  };

  const smallButtonStyle = (variant: 'primary' | 'danger') => ({
    padding: '0.25rem 0.625rem',
    'border-radius': '6px',
    border: 'none',
    cursor: 'pointer',
    'font-size': '0.75rem',
    'font-weight': '500',
    background: variant === 'primary' ? '#1976d2' : '#d32f2f',
    color: 'white'
  });

  const syncButtonStyle = {
    padding: '0.5rem 1rem',
    'border-radius': '8px',
    border: 'none',
    background: '#4caf50',
    color: 'white',
    cursor: 'pointer',
    'font-weight': '500',
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    opacity: isSyncing() || !isOnline() ? 0.6 : 1
  };

  const logEntryStyle = (action: string) => ({
    padding: '0.625rem',
    'border-left': `3px solid ${
      action.includes('completed') ? '#4caf50' :
      action.includes('failed') ? '#f44336' :
      action.includes('started') ? '#2196f3' : '#ff9800'
    }`,
    background: '#f9f9f9',
    'margin-bottom': '0.5rem',
    'font-size': '0.8rem'
  });

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <div style={{ 'font-weight': '600', 'font-size': '1.1rem' }}>
            Escaneos Offline
          </div>
          <div style={{ 'font-size': '0.8rem', opacity: 0.9, 'margin-top': '0.25rem' }}>
            {isOnline() ? 'Conectado' : 'Sin conexión'} • {pendingCount()} pendientes
          </div>
        </div>
        <Show when={props.onClose}>
          <button
            onClick={props.onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              'font-size': '1.5rem',
              cursor: 'pointer',
              padding: '0.25rem'
            }}
          >
            ×
          </button>
        </Show>
      </div>

      {/* Tabs */}
      <div style={tabsStyle}>
        <button
          style={tabStyle(activeTab() === 'pending')}
          onClick={() => setActiveTab('pending')}
        >
          Pendientes ({pendingScans().length})
        </button>
        <button
          style={tabStyle(activeTab() === 'synced')}
          onClick={() => setActiveTab('synced')}
        >
          Sincronizados
        </button>
        <button
          style={tabStyle(activeTab() === 'log')}
          onClick={() => setActiveTab('log')}
        >
          Historial
        </button>
      </div>

      {/* Sync Progress */}
      <Show when={isSyncing()}>
        <div style={{
          background: '#e3f2fd',
          padding: '0.75rem 1rem',
          display: 'flex',
          'align-items': 'center',
          gap: '0.75rem'
        }}>
          <div style={{
            width: '20px',
            height: '20px',
            border: '2px solid #1976d2',
            'border-top-color': 'transparent',
            'border-radius': '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <span style={{ 'font-size': '0.875rem', color: '#1976d2' }}>
            Sincronizando {syncProgress().current} de {syncProgress().total}...
          </span>
        </div>
      </Show>

      {/* Content */}
      <div style={contentStyle}>
        <Show when={loading()}>
          <div style={{ 'text-align': 'center', padding: '2rem', color: '#666' }}>
            Cargando...
          </div>
        </Show>

        <Show when={!loading() && activeTab() === 'pending'}>
          <Show when={pendingScans().length === 0}>
            <div style={{
              'text-align': 'center',
              padding: '2rem',
              color: '#666'
            }}>
              No hay escaneos pendientes
            </div>
          </Show>

          <For each={pendingScans()}>
            {(scan) => (
              <div style={scanCardStyle}>
                <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'flex-start' }}>
                  <div>
                    <div style={hblStyle}>
                      {scan.hbl}
                      <span style={statusBadgeStyle(false)}>Pendiente</span>
                    </div>
                    <div style={metaStyle}>
                      Estado: {scan.statusLabel}
                    </div>
                    <div style={metaStyle}>
                      Escaneado: {formatDate(scan.scannedAt)}
                    </div>
                    <Show when={scan.retryCount > 0}>
                      <div style={metaStyle}>
                        Reintentos: {scan.retryCount}
                      </div>
                    </Show>
                  </div>
                </div>

                <Show when={scan.lastError}>
                  <div style={errorStyle}>
                    Error: {scan.lastError}
                  </div>
                </Show>

                <div style={buttonGroupStyle}>
                  <Show when={isOnline()}>
                    <button
                      style={smallButtonStyle('primary')}
                      onClick={() => handleRetry(scan.id)}
                      disabled={retryingId() === scan.id}
                    >
                      {retryingId() === scan.id ? 'Reintentando...' : 'Reintentar'}
                    </button>
                  </Show>
                  <button
                    style={smallButtonStyle('danger')}
                    onClick={() => handleRemove(scan.id)}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            )}
          </For>

          <Show when={pendingScans().length > 0 && isOnline()}>
            <button
              style={{
                ...syncButtonStyle,
                width: '100%',
                'justify-content': 'center',
                'margin-top': '1rem'
              }}
              onClick={handleSync}
              disabled={isSyncing()}
            >
              {isSyncing() ? (
                <>Sincronizando...</>
              ) : (
                <>⟳ Sincronizar Todo ({pendingScans().length})</>
              )}
            </button>
          </Show>
        </Show>

        <Show when={!loading() && activeTab() === 'synced'}>
          <Show when={syncedScans().length === 0}>
            <div style={{
              'text-align': 'center',
              padding: '2rem',
              color: '#666'
            }}>
              No hay escaneos sincronizados
            </div>
          </Show>

          <For each={syncedScans()}>
            {(scan) => (
              <div style={scanCardStyle}>
                <div style={hblStyle}>
                  {scan.hbl}
                  <span style={statusBadgeStyle(true)}>Sincronizado</span>
                </div>
                <div style={metaStyle}>
                  Estado: {scan.statusLabel}
                </div>
                <div style={metaStyle}>
                  Escaneado: {formatDate(scan.scannedAt)}
                </div>
                <div style={metaStyle}>
                  Sincronizado: {formatDate(scan.syncedAt)}
                </div>
              </div>
            )}
          </For>
        </Show>

        <Show when={!loading() && activeTab() === 'log'}>
          <Show when={syncLog().length === 0}>
            <div style={{
              'text-align': 'center',
              padding: '2rem',
              color: '#666'
            }}>
              No hay registros de sincronización
            </div>
          </Show>

          <For each={syncLog()}>
            {(entry) => (
              <div style={logEntryStyle(entry.action)}>
                <div style={{ 'font-weight': '500', 'margin-bottom': '0.25rem' }}>
                  {entry.action === 'sync_started' && 'Sincronización iniciada'}
                  {entry.action === 'sync_completed' && 'Sincronización completada'}
                  {entry.action === 'sync_failed' && 'Sincronización fallida'}
                  {entry.action === 'scan_added' && 'Escaneo agregado'}
                  {entry.action === 'scan_synced' && 'Escaneo sincronizado'}
                </div>
                <div style={{ color: '#666' }}>{entry.details}</div>
                <div style={{ color: '#999', 'font-size': '0.75rem', 'margin-top': '0.25rem' }}>
                  {formatDate(entry.timestamp)}
                </div>
              </div>
            )}
          </For>
        </Show>
      </div>

      {/* Footer */}
      <Show when={lastSyncTime()}>
        <div style={{
          padding: '0.75rem 1rem',
          'border-top': '1px solid #e0e0e0',
          'font-size': '0.75rem',
          color: '#666',
          background: '#fafafa'
        }}>
          Última sincronización: {formatDate(lastSyncTime()!)}
        </div>
      </Show>

      {/* CSS for animations */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default PendingScansManager;
