/**
 * CheckInQueue Component
 * Office-facing waiting list with queue management.
 * Shows current waiting clients, their status, and provides actions
 * for calling, completing, and marking no-shows.
 */

import { Component, createSignal, createEffect, onMount, onCleanup, For, Show } from 'solid-js';
import { Card, Button } from '../../ui';
import { authStore } from '../../../stores/authStore';
import { useTranslation } from '../../../translations';
import { devLog } from '../../../services/utils';
import { checkinStore } from '../stores/checkinStore';
import type { CheckInEntry, CheckInStatus } from '../types/workflowTypes';
import { CHECK_IN_STATUS_COLORS, UI_LABELS } from '../types/workflowTypes';

const CheckInQueue: Component = () => {
  const { t } = useTranslation();
  const [selectedTab, setSelectedTab] = createSignal<'waiting' | 'in_progress' | 'completed'>('waiting');
  const [showAssignModal, setShowAssignModal] = createSignal(false);
  const [assignEntryId, setAssignEntryId] = createSignal('');
  const [assignPreparerId, setAssignPreparerId] = createSignal('');
  const [assignPreparerName, setAssignPreparerName] = createSignal('');
  const [flashAlert, setFlashAlert] = createSignal(false);

  // ============================================
  // Lifecycle
  // ============================================

  onMount(async () => {
    await checkinStore.loadWaitingList();
    checkinStore.startAutoRefresh();
  });

  onCleanup(() => {
    checkinStore.stopAutoRefresh();
  });

  // Flash effect when new check-in detected
  createEffect(() => {
    if (checkinStore.newCheckInAlert) {
      setFlashAlert(true);
      // Play notification sound
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2JkI+Nh4aBe3V1eX+Fh4eFg399eXV1eX+FiYuJh4N/eXV1eYGHi42LiYWBe3V1d32DiYuNi4mFgXt3dXV7gYeLjYuJhYF7d3V1e4GHi42LiYV/e3d1dXuBh4uLiYmFgXt3dXV7gYeLi4mJhYF7d3V1');
        audio.volume = 0.3;
        audio.play().catch(() => {});
      } catch (e) {
        // Audio not available
      }
      setTimeout(() => setFlashAlert(false), 3000);
    }
  });

  // ============================================
  // Helpers
  // ============================================

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getWaitMinutes = (checkInTime: number): number => {
    return Math.floor((Date.now() - checkInTime) / 60000);
  };

  const getWaitColor = (minutes: number): string => {
    if (minutes < 15) return '#22c55e'; // green
    if (minutes < 30) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };

  const getStatusBadge = (status: CheckInStatus): { color: string; label: string } => {
    const colors = CHECK_IN_STATUS_COLORS;
    const labels: Record<CheckInStatus, string> = {
      waiting: 'Waiting',
      in_progress: 'In Progress',
      completed: 'Completed',
      no_show: 'No Show',
    };
    return { color: colors[status], label: labels[status] };
  };

  const getDisplayList = (): CheckInEntry[] => {
    const tab = selectedTab();
    if (tab === 'waiting') return checkinStore.getWaitingEntries();
    if (tab === 'in_progress') return checkinStore.getInProgressEntries();
    return checkinStore.getCompletedEntries();
  };

  // ============================================
  // Actions
  // ============================================

  const handleCall = (entry: CheckInEntry) => {
    setAssignEntryId(entry.id);
    setAssignPreparerName('');
    setAssignPreparerId('');
    setShowAssignModal(true);
  };

  const confirmAssign = async () => {
    if (!assignEntryId() || !assignPreparerName().trim()) return;

    try {
      await checkinStore.markInProgress(
        assignEntryId(),
        assignPreparerId() || 'preparer_' + Date.now(),
        assignPreparerName().trim()
      );
      setShowAssignModal(false);
    } catch (error) {
      devLog('CheckInQueue: error assigning preparer', error);
    }
  };

  const handleComplete = async (entryId: string) => {
    try {
      await checkinStore.markCompleted(entryId);
    } catch (error) {
      devLog('CheckInQueue: error completing entry', error);
    }
  };

  const handleNoShow = async (entryId: string) => {
    try {
      await checkinStore.markNoShow(entryId);
    } catch (error) {
      devLog('CheckInQueue: error marking no-show', error);
    }
  };

  const handleCallNext = async () => {
    try {
      await checkinStore.callNextClient();
    } catch (error) {
      devLog('CheckInQueue: error calling next', error);
    }
  };

  // ============================================
  // Styles
  // ============================================

  const containerStyle = {
    padding: '24px',
    'max-width': '1200px',
    margin: '0 auto',
  };

  const headerStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '24px',
    'flex-wrap': 'wrap' as const,
    gap: '16px',
  };

  const statsRowStyle = {
    display: 'flex',
    gap: '16px',
    'flex-wrap': 'wrap' as const,
    'margin-bottom': '24px',
  };

  const statCardStyle = (color: string) => ({
    background: '#ffffff',
    border: `2px solid ${color}`,
    'border-radius': '10px',
    padding: '16px 24px',
    'text-align': 'center' as const,
    'min-width': '120px',
    flex: '1',
  });

  const tabBarStyle = {
    display: 'flex',
    gap: '4px',
    background: '#f3f4f6',
    'border-radius': '10px',
    padding: '4px',
    'margin-bottom': '20px',
  };

  const tabStyle = (active: boolean) => ({
    flex: '1',
    padding: '10px 16px',
    'font-size': '14px',
    'font-weight': active ? '600' : '400',
    border: 'none',
    'border-radius': '8px',
    background: active ? '#ffffff' : 'transparent',
    color: active ? '#111827' : '#6b7280',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    'box-shadow': active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
  });

  const tableStyle = {
    width: '100%',
    'border-collapse': 'collapse' as const,
    'font-size': '14px',
  };

  const thStyle = {
    'text-align': 'left' as const,
    padding: '10px 12px',
    'font-weight': '600',
    color: '#6b7280',
    'border-bottom': '2px solid #e5e7eb',
    'font-size': '13px',
    'text-transform': 'uppercase' as const,
    'letter-spacing': '0.05em',
  };

  const tdStyle = {
    padding: '12px',
    'border-bottom': '1px solid #f3f4f6',
    'vertical-align': 'middle' as const,
  };

  const badgeStyle = (color: string) => ({
    display: 'inline-block',
    padding: '4px 10px',
    'font-size': '12px',
    'font-weight': '600',
    'border-radius': '20px',
    background: color + '15',
    color: color,
  });

  const waitBadgeStyle = (color: string) => ({
    display: 'inline-flex',
    'align-items': 'center',
    gap: '4px',
    padding: '4px 10px',
    'font-size': '13px',
    'font-weight': '600',
    'border-radius': '20px',
    background: color + '15',
    color: color,
  });

  const actionBtnStyle = (color: string) => ({
    padding: '6px 12px',
    'font-size': '13px',
    'font-weight': '500',
    border: `1px solid ${color}`,
    'border-radius': '6px',
    background: '#ffffff',
    color: color,
    cursor: 'pointer',
    'margin-right': '6px',
    transition: 'background 0.2s ease',
  });

  const callNextBtnStyle = {
    padding: '12px 24px',
    'font-size': '16px',
    'font-weight': '600',
    border: 'none',
    'border-radius': '8px',
    background: '#1a73e8',
    color: '#ffffff',
    cursor: 'pointer',
  };

  const alertBannerStyle = {
    background: '#eff6ff',
    border: '2px solid #1a73e8',
    'border-radius': '10px',
    padding: '12px 20px',
    'margin-bottom': '16px',
    display: 'flex',
    'align-items': 'center',
    gap: '12px',
    animation: 'pulse-border 2s ease-in-out infinite',
  };

  const modalOverlayStyle = {
    position: 'fixed' as const,
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    'z-index': '1000',
  };

  const modalContentStyle = {
    background: '#ffffff',
    'border-radius': '12px',
    padding: '24px',
    'max-width': '400px',
    width: '90%',
  };

  const emptyStateStyle = {
    'text-align': 'center' as const,
    padding: '48px 24px',
    color: '#9ca3af',
    'font-size': '16px',
  };

  // ============================================
  // Render
  // ============================================

  return (
    <div style={containerStyle}>
      {/* Alert animation keyframes */}
      <style>{`
        @keyframes pulse-border {
          0%, 100% { border-color: #1a73e8; }
          50% { border-color: #93c5fd; }
        }
      `}</style>

      {/* New Check-In Alert */}
      <Show when={flashAlert()}>
        <div style={alertBannerStyle}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" stroke-width="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span style={{ 'font-size': '16px', 'font-weight': '600', color: '#1a73e8' }}>
            New check-in!
          </span>
        </div>
      </Show>

      {/* Header */}
      <div style={headerStyle}>
        <h2 style={{ 'font-size': '24px', 'font-weight': '700', color: '#111827', margin: '0' }}>
          Check-In Queue
        </h2>
        <div style={{ display: 'flex', gap: '12px', 'align-items': 'center' }}>
          <div style={{
            padding: '8px 16px',
            background: '#f0f9ff',
            'border-radius': '8px',
            'font-size': '14px',
            color: '#374151',
          }}>
            Avg. Wait: <strong style={{ color: '#1a73e8' }}>{checkinStore.state.averageWaitMinutes} min</strong>
          </div>
          <button style={callNextBtnStyle} onClick={handleCallNext}>
            Call Next
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div style={statsRowStyle}>
        <div style={statCardStyle('#f59e0b')}>
          <div style={{ 'font-size': '28px', 'font-weight': '700', color: '#f59e0b' }}>
            {checkinStore.getWaitingCount()}
          </div>
          <div style={{ 'font-size': '13px', color: '#6b7280' }}>Waiting</div>
        </div>
        <div style={statCardStyle('#1a73e8')}>
          <div style={{ 'font-size': '28px', 'font-weight': '700', color: '#1a73e8' }}>
            {checkinStore.getInProgressCount()}
          </div>
          <div style={{ 'font-size': '13px', color: '#6b7280' }}>In Progress</div>
        </div>
        <div style={statCardStyle('#22c55e')}>
          <div style={{ 'font-size': '28px', 'font-weight': '700', color: '#22c55e' }}>
            {checkinStore.getCompletedTodayCount()}
          </div>
          <div style={{ 'font-size': '13px', color: '#6b7280' }}>Completed Today</div>
        </div>
      </div>

      {/* Tab Bar */}
      <div style={tabBarStyle}>
        <button style={tabStyle(selectedTab() === 'waiting')} onClick={() => setSelectedTab('waiting')}>
          Waiting ({checkinStore.getWaitingCount()})
        </button>
        <button style={tabStyle(selectedTab() === 'in_progress')} onClick={() => setSelectedTab('in_progress')}>
          In Progress ({checkinStore.getInProgressCount()})
        </button>
        <button style={tabStyle(selectedTab() === 'completed')} onClick={() => setSelectedTab('completed')}>
          Completed ({checkinStore.getCompletedTodayCount()})
        </button>
      </div>

      {/* Loading */}
      <Show when={checkinStore.state.isLoading}>
        <div style={{ 'text-align': 'center', padding: '24px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '3px solid #e5e7eb',
            'border-top-color': '#1a73e8',
            'border-radius': '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </Show>

      {/* Queue Table */}
      <Show when={!checkinStore.state.isLoading}>
        <Show when={getDisplayList().length > 0} fallback={
          <div style={emptyStateStyle}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="1.5" style={{ margin: '0 auto 16px' }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <p>
              {selectedTab() === 'waiting'
                ? 'No one is currently waiting.'
                : selectedTab() === 'in_progress'
                ? 'No clients in progress.'
                : 'No completed entries today.'}
            </p>
          </div>
        }>
          <div style={{ 'overflow-x': 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Client</th>
                  <th style={thStyle}>Check-In</th>
                  <th style={thStyle}>Wait</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Preparer</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                <For each={getDisplayList()}>
                  {(entry) => {
                    const waitMins = getWaitMinutes(entry.checkInTime);
                    const waitColor = getWaitColor(waitMins);
                    const badge = getStatusBadge(entry.status);

                    return (
                      <tr style={{ background: entry.status === 'waiting' && waitMins > 30 ? '#fef2f2' : 'transparent' }}>
                        <td style={{ ...tdStyle, 'font-weight': '700', color: '#1a73e8', 'font-size': '16px' }}>
                          {entry.queueNumber}
                        </td>
                        <td style={tdStyle}>
                          <div style={{ 'font-weight': '600', color: '#111827' }}>{entry.clientName}</div>
                          <div style={{ 'font-size': '12px', color: '#6b7280' }}>{entry.phone}</div>
                        </td>
                        <td style={{ ...tdStyle, color: '#374151' }}>
                          {formatTime(entry.checkInTime)}
                        </td>
                        <td style={tdStyle}>
                          <span style={waitBadgeStyle(waitColor)}>
                            {waitMins} min
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <span style={badgeStyle(badge.color)}>
                            {badge.label}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, color: '#374151' }}>
                          {entry.assignedPreparerName || '-'}
                        </td>
                        <td style={tdStyle}>
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            'font-size': '11px',
                            'border-radius': '4px',
                            background: entry.isWalkIn ? '#fef3c7' : '#dbeafe',
                            color: entry.isWalkIn ? '#92400e' : '#1e40af',
                            'font-weight': '500',
                          }}>
                            {entry.isWalkIn ? 'Walk-in' : 'Appt'}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <Show when={entry.status === 'waiting'}>
                            <button
                              style={actionBtnStyle('#1a73e8')}
                              onClick={() => handleCall(entry)}
                            >
                              Call
                            </button>
                            <button
                              style={actionBtnStyle('#ef4444')}
                              onClick={() => handleNoShow(entry.id)}
                            >
                              No Show
                            </button>
                          </Show>
                          <Show when={entry.status === 'in_progress'}>
                            <button
                              style={actionBtnStyle('#22c55e')}
                              onClick={() => handleComplete(entry.id)}
                            >
                              Complete
                            </button>
                            <button
                              style={actionBtnStyle('#ef4444')}
                              onClick={() => handleNoShow(entry.id)}
                            >
                              No Show
                            </button>
                          </Show>
                        </td>
                      </tr>
                    );
                  }}
                </For>
              </tbody>
            </table>
          </div>
        </Show>
      </Show>

      {/* Error Display */}
      <Show when={checkinStore.state.error}>
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          'border-radius': '8px',
          padding: '12px 16px',
          color: '#991b1b',
          'margin-top': '16px',
          'font-size': '14px',
        }}>
          {checkinStore.state.error}
        </div>
      </Show>

      {/* Assign Preparer Modal */}
      <Show when={showAssignModal()}>
        <div style={modalOverlayStyle} onClick={() => setShowAssignModal(false)}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ 'font-size': '20px', 'font-weight': '600', color: '#111827', 'margin': '0 0 20px 0' }}>
              Assign Preparer
            </h3>

            <div style={{ 'margin-bottom': '16px' }}>
              <label style={{ display: 'block', 'font-size': '14px', 'font-weight': '500', color: '#374151', 'margin-bottom': '6px' }}>
                Preparer Name
              </label>
              <input
                type="text"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  'font-size': '15px',
                  border: '2px solid #d1d5db',
                  'border-radius': '8px',
                  outline: 'none',
                  'box-sizing': 'border-box',
                }}
                value={assignPreparerName()}
                onInput={(e) => setAssignPreparerName(e.currentTarget.value)}
                placeholder="Enter preparer name"
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', 'justify-content': 'flex-end' }}>
              <button
                style={{
                  padding: '10px 20px',
                  'font-size': '14px',
                  border: '1px solid #d1d5db',
                  'border-radius': '8px',
                  background: '#ffffff',
                  color: '#374151',
                  cursor: 'pointer',
                }}
                onClick={() => setShowAssignModal(false)}
              >
                Cancel
              </button>
              <button
                style={{
                  padding: '10px 20px',
                  'font-size': '14px',
                  'font-weight': '600',
                  border: 'none',
                  'border-radius': '8px',
                  background: assignPreparerName().trim() ? '#1a73e8' : '#9ca3af',
                  color: '#ffffff',
                  cursor: assignPreparerName().trim() ? 'pointer' : 'not-allowed',
                }}
                onClick={confirmAssign}
                disabled={!assignPreparerName().trim()}
              >
                Assign & Call
              </button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default CheckInQueue;
