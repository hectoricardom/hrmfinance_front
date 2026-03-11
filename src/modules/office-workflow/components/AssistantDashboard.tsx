/**
 * AssistantDashboard Component
 * Simplified view for the office assistant.
 * Shows waiting list, quick check-in, today's appointments,
 * and missing document alerts. No access to financial details.
 */

import { Component, createSignal, onMount, onCleanup, For, Show } from 'solid-js';
import { Card, Button } from '../../ui';
import { useTranslation } from '../../../translations';
import { devLog } from '../../../services/utils';
import { checkinStore } from '../stores/checkinStore';
import { checkinService } from '../services/checkinService';
import type { CheckInEntry, AssistantTask } from '../types/workflowTypes';
import { CHECK_IN_STATUS_COLORS, ASSISTANT_TASK_COLORS } from '../types/workflowTypes';

const AssistantDashboard: Component = () => {
  const { t } = useTranslation();

  // ============================================
  // State
  // ============================================

  const [showQuickCheckIn, setShowQuickCheckIn] = createSignal(false);
  const [quickName, setQuickName] = createSignal('');
  const [quickPhone, setQuickPhone] = createSignal('');
  const [quickService, setQuickService] = createSignal('');
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  const [todayAppointments, setTodayAppointments] = createSignal<Array<{
    id: string;
    clientName: string;
    scheduledTime: string;
    serviceType: string;
    status: string;
    phone: string;
  }>>([]);

  const [missingDocAlerts, setMissingDocAlerts] = createSignal<Array<{
    clientId: string;
    clientName: string;
    missingDocuments: string[];
    daysWaiting: number;
  }>>([]);

  const [tasks, setTasks] = createSignal<AssistantTask[]>([]);

  // ============================================
  // Lifecycle
  // ============================================

  onMount(async () => {
    await checkinStore.loadWaitingList();
    checkinStore.startAutoRefresh();

    // Load today's appointments
    try {
      const appointments = await checkinService.getTodayAppointments();
      setTodayAppointments(appointments);
    } catch (error) {
      devLog('AssistantDashboard: error loading today appointments', error);
    }

    // Load missing document alerts
    try {
      const alerts = await checkinService.getMissingDocumentAlerts();
      setMissingDocAlerts(alerts);
    } catch (error) {
      devLog('AssistantDashboard: error loading missing doc alerts', error);
    }
  });

  onCleanup(() => {
    checkinStore.stopAutoRefresh();
  });

  // ============================================
  // Actions
  // ============================================

  const handleQuickCheckIn = async () => {
    if (!quickName().trim() || !quickPhone().trim()) return;

    setIsSubmitting(true);
    try {
      await checkinStore.checkInWalkIn(
        quickName().trim(),
        quickPhone().trim(),
        quickService() || undefined
      );
      setQuickName('');
      setQuickPhone('');
      setQuickService('');
      setShowQuickCheckIn(false);
    } catch (error) {
      devLog('AssistantDashboard: quick check-in error', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCallClient = async (entry: CheckInEntry) => {
    try {
      await checkinStore.markInProgress(entry.id, 'assistant', 'Office Assistant');
    } catch (error) {
      devLog('AssistantDashboard: call client error', error);
    }
  };

  const handleComplete = async (entryId: string) => {
    try {
      await checkinStore.markCompleted(entryId);
    } catch (error) {
      devLog('AssistantDashboard: complete error', error);
    }
  };

  const handleNoShow = async (entryId: string) => {
    try {
      await checkinStore.markNoShow(entryId);
    } catch (error) {
      devLog('AssistantDashboard: no-show error', error);
    }
  };

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
    if (minutes < 15) return '#22c55e';
    if (minutes < 30) return '#f59e0b';
    return '#ef4444';
  };

  // ============================================
  // Styles
  // ============================================

  const containerStyle = {
    padding: '24px',
    'max-width': '1000px',
    margin: '0 auto',
    'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  };

  const headerStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '24px',
    'flex-wrap': 'wrap' as const,
    gap: '12px',
  };

  const summaryBarStyle = {
    display: 'flex',
    gap: '16px',
    'margin-bottom': '24px',
    'flex-wrap': 'wrap' as const,
  };

  const summaryCardStyle = (color: string) => ({
    background: '#ffffff',
    border: `2px solid ${color}`,
    'border-radius': '12px',
    padding: '20px',
    'text-align': 'center' as const,
    flex: '1',
    'min-width': '140px',
    'box-shadow': '0 1px 3px rgba(0,0,0,0.06)',
  });

  const sectionStyle = {
    background: '#ffffff',
    'border-radius': '12px',
    padding: '20px',
    'margin-bottom': '20px',
    'box-shadow': '0 1px 3px rgba(0,0,0,0.08)',
    border: '1px solid #e5e7eb',
  };

  const sectionTitleStyle = {
    'font-size': '18px',
    'font-weight': '600',
    color: '#111827',
    'margin': '0 0 16px 0',
    display: 'flex',
    'align-items': 'center',
    gap: '8px',
  };

  const quickCheckInBtnStyle = {
    padding: '14px 28px',
    'font-size': '16px',
    'font-weight': '600',
    border: 'none',
    'border-radius': '10px',
    background: '#1a73e8',
    color: '#ffffff',
    cursor: 'pointer',
    'min-height': '48px',
  };

  const inputStyle = {
    width: '100%',
    padding: '12px',
    'font-size': '15px',
    border: '2px solid #d1d5db',
    'border-radius': '8px',
    outline: 'none',
    'margin-bottom': '12px',
    'box-sizing': 'border-box' as const,
    'min-height': '48px',
  };

  const waitingEntryStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '12px 16px',
    'border-radius': '8px',
    'margin-bottom': '8px',
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
  };

  const clientInfoStyle = {
    flex: '1',
  };

  const actionBtnStyle = (color: string) => ({
    padding: '8px 16px',
    'font-size': '14px',
    'font-weight': '500',
    border: 'none',
    'border-radius': '6px',
    background: color,
    color: '#ffffff',
    cursor: 'pointer',
    'margin-left': '8px',
    'min-height': '36px',
  });

  const appointmentItemStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '10px 14px',
    'border-radius': '8px',
    'margin-bottom': '6px',
    background: '#f0f9ff',
    border: '1px solid #bfdbfe',
  };

  const alertItemStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '10px 14px',
    'border-radius': '8px',
    'margin-bottom': '6px',
    background: '#fef3c7',
    border: '1px solid #fcd34d',
  };

  const emptyStyle = {
    'text-align': 'center' as const,
    padding: '24px',
    color: '#9ca3af',
    'font-size': '15px',
  };

  const modalOverlayStyle = {
    position: 'fixed' as const,
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    'z-index': '1000',
  };

  const modalContentStyle = {
    background: '#ffffff',
    'border-radius': '16px',
    padding: '28px',
    'max-width': '440px',
    width: '90%',
  };

  // ============================================
  // Render
  // ============================================

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h1 style={{ 'font-size': '26px', 'font-weight': '700', color: '#111827', margin: '0' }}>
          Office Dashboard
        </h1>
        <button style={quickCheckInBtnStyle} onClick={() => setShowQuickCheckIn(true)}>
          + Quick Check-In
        </button>
      </div>

      {/* Summary Cards */}
      <div style={summaryBarStyle}>
        <div style={summaryCardStyle('#f59e0b')}>
          <div style={{ 'font-size': '36px', 'font-weight': '700', color: '#f59e0b' }}>
            {checkinStore.getWaitingCount()}
          </div>
          <div style={{ 'font-size': '14px', color: '#6b7280', 'margin-top': '4px' }}>
            Clients Waiting
          </div>
        </div>
        <div style={summaryCardStyle('#1a73e8')}>
          <div style={{ 'font-size': '36px', 'font-weight': '700', color: '#1a73e8' }}>
            {checkinStore.getInProgressCount()}
          </div>
          <div style={{ 'font-size': '14px', color: '#6b7280', 'margin-top': '4px' }}>
            In Progress
          </div>
        </div>
        <div style={summaryCardStyle('#22c55e')}>
          <div style={{ 'font-size': '36px', 'font-weight': '700', color: '#22c55e' }}>
            {todayAppointments().length}
          </div>
          <div style={{ 'font-size': '14px', color: '#6b7280', 'margin-top': '4px' }}>
            Appointments Today
          </div>
        </div>
        <div style={summaryCardStyle('#ef4444')}>
          <div style={{ 'font-size': '36px', 'font-weight': '700', color: '#ef4444' }}>
            {missingDocAlerts().length}
          </div>
          <div style={{ 'font-size': '14px', color: '#6b7280', 'margin-top': '4px' }}>
            Missing Docs
          </div>
        </div>
      </div>

      {/* New Check-In Alert */}
      <Show when={checkinStore.newCheckInAlert}>
        <div style={{
          background: '#eff6ff',
          border: '2px solid #1a73e8',
          'border-radius': '10px',
          padding: '12px 20px',
          'margin-bottom': '16px',
          display: 'flex',
          'align-items': 'center',
          gap: '12px',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" stroke-width="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span style={{ 'font-weight': '600', color: '#1a73e8' }}>
            New client checked in!
          </span>
        </div>
      </Show>

      {/* Waiting List Section */}
      <div style={sectionStyle}>
        <h2 style={sectionTitleStyle}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          Waiting List
        </h2>

        <Show when={checkinStore.getWaitingEntries().length > 0} fallback={
          <div style={emptyStyle}>No one is currently waiting.</div>
        }>
          <For each={checkinStore.getWaitingEntries()}>
            {(entry) => {
              const waitMins = getWaitMinutes(entry.checkInTime);
              const waitColor = getWaitColor(waitMins);

              return (
                <div style={waitingEntryStyle}>
                  <div style={clientInfoStyle}>
                    <div style={{ display: 'flex', 'align-items': 'center', gap: '12px' }}>
                      <span style={{
                        'font-size': '20px',
                        'font-weight': '700',
                        color: '#1a73e8',
                        'min-width': '36px',
                      }}>
                        #{entry.queueNumber}
                      </span>
                      <div>
                        <div style={{ 'font-weight': '600', color: '#111827', 'font-size': '15px' }}>
                          {entry.clientName}
                        </div>
                        <div style={{ 'font-size': '13px', color: '#6b7280' }}>
                          {entry.phone} | Checked in: {formatTime(entry.checkInTime)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', 'align-items': 'center', gap: '12px' }}>
                    <span style={{
                      padding: '4px 10px',
                      'font-size': '13px',
                      'font-weight': '600',
                      'border-radius': '20px',
                      background: waitColor + '15',
                      color: waitColor,
                    }}>
                      {waitMins} min
                    </span>

                    <button
                      style={actionBtnStyle('#1a73e8')}
                      onClick={() => handleCallClient(entry)}
                    >
                      Call
                    </button>
                    <button
                      style={actionBtnStyle('#ef4444')}
                      onClick={() => handleNoShow(entry.id)}
                    >
                      No Show
                    </button>
                  </div>
                </div>
              );
            }}
          </For>
        </Show>

        {/* In Progress entries */}
        <Show when={checkinStore.getInProgressEntries().length > 0}>
          <h3 style={{ 'font-size': '15px', color: '#6b7280', 'margin': '20px 0 12px 0', 'font-weight': '500' }}>
            In Progress
          </h3>
          <For each={checkinStore.getInProgressEntries()}>
            {(entry) => (
              <div style={{ ...waitingEntryStyle, background: '#eff6ff', 'border-color': '#bfdbfe' }}>
                <div style={clientInfoStyle}>
                  <div style={{ display: 'flex', 'align-items': 'center', gap: '12px' }}>
                    <span style={{ 'font-size': '20px', 'font-weight': '700', color: '#1a73e8', 'min-width': '36px' }}>
                      #{entry.queueNumber}
                    </span>
                    <div>
                      <div style={{ 'font-weight': '600', color: '#111827', 'font-size': '15px' }}>
                        {entry.clientName}
                      </div>
                      <div style={{ 'font-size': '13px', color: '#6b7280' }}>
                        With: {entry.assignedPreparerName || 'Unassigned'}
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  style={actionBtnStyle('#22c55e')}
                  onClick={() => handleComplete(entry.id)}
                >
                  Complete
                </button>
              </div>
            )}
          </For>
        </Show>
      </div>

      {/* Today's Appointments Section */}
      <div style={sectionStyle}>
        <h2 style={sectionTitleStyle}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          Today's Appointments
        </h2>

        <Show when={todayAppointments().length > 0} fallback={
          <div style={emptyStyle}>No appointments scheduled for today.</div>
        }>
          <For each={todayAppointments()}>
            {(appt) => (
              <div style={appointmentItemStyle}>
                <div>
                  <div style={{ 'font-weight': '600', color: '#111827' }}>{appt.clientName}</div>
                  <div style={{ 'font-size': '13px', color: '#6b7280' }}>
                    {appt.scheduledTime} - {appt.serviceType}
                  </div>
                </div>
                <span style={{
                  padding: '4px 10px',
                  'font-size': '12px',
                  'font-weight': '500',
                  'border-radius': '20px',
                  background: appt.status === 'confirmed' ? '#dcfce7' : '#f3f4f6',
                  color: appt.status === 'confirmed' ? '#166534' : '#6b7280',
                }}>
                  {appt.status}
                </span>
              </div>
            )}
          </For>
        </Show>
      </div>

      {/* Missing Documents Alerts */}
      <div style={sectionStyle}>
        <h2 style={sectionTitleStyle}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          Missing Documents Alerts
        </h2>

        <Show when={missingDocAlerts().length > 0} fallback={
          <div style={emptyStyle}>No missing document alerts.</div>
        }>
          <For each={missingDocAlerts()}>
            {(alert) => (
              <div style={alertItemStyle}>
                <div>
                  <div style={{ 'font-weight': '600', color: '#92400e' }}>
                    {alert.clientName}
                  </div>
                  <div style={{ 'font-size': '13px', color: '#78350f' }}>
                    Missing: {alert.missingDocuments.join(', ')}
                  </div>
                </div>
                <span style={{
                  padding: '4px 10px',
                  'font-size': '12px',
                  'font-weight': '600',
                  'border-radius': '20px',
                  background: alert.daysWaiting > 7 ? '#fecaca' : '#fef3c7',
                  color: alert.daysWaiting > 7 ? '#991b1b' : '#92400e',
                }}>
                  {alert.daysWaiting}d waiting
                </span>
              </div>
            )}
          </For>
        </Show>
      </div>

      {/* Error */}
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

      {/* Quick Check-In Modal */}
      <Show when={showQuickCheckIn()}>
        <div style={modalOverlayStyle} onClick={() => setShowQuickCheckIn(false)}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ 'font-size': '22px', 'font-weight': '600', color: '#111827', 'margin': '0 0 20px 0' }}>
              Quick Check-In
            </h3>

            <label style={{ display: 'block', 'font-size': '14px', 'font-weight': '500', color: '#374151', 'margin-bottom': '6px' }}>
              Name *
            </label>
            <input
              type="text"
              style={inputStyle}
              value={quickName()}
              onInput={(e) => setQuickName(e.currentTarget.value)}
              placeholder="Client name"
            />

            <label style={{ display: 'block', 'font-size': '14px', 'font-weight': '500', color: '#374151', 'margin-bottom': '6px' }}>
              Phone *
            </label>
            <input
              type="tel"
              style={inputStyle}
              value={quickPhone()}
              onInput={(e) => setQuickPhone(e.currentTarget.value)}
              placeholder="(555) 555-5555"
            />

            <label style={{ display: 'block', 'font-size': '14px', 'font-weight': '500', color: '#374151', 'margin-bottom': '6px' }}>
              Service (optional)
            </label>
            <select
              style={inputStyle}
              value={quickService()}
              onChange={(e) => setQuickService(e.currentTarget.value)}
            >
              <option value="">Select service...</option>
              <option value="tax_prep">Tax Preparation</option>
              <option value="tax_consultation">Tax Consultation</option>
              <option value="document_drop">Document Drop-off</option>
              <option value="pickup">Pick Up Return</option>
            </select>

            <div style={{ display: 'flex', gap: '12px', 'justify-content': 'flex-end', 'margin-top': '8px' }}>
              <button
                style={{
                  padding: '12px 24px',
                  'font-size': '15px',
                  border: '1px solid #d1d5db',
                  'border-radius': '8px',
                  background: '#ffffff',
                  color: '#374151',
                  cursor: 'pointer',
                  'min-height': '48px',
                }}
                onClick={() => setShowQuickCheckIn(false)}
              >
                Cancel
              </button>
              <button
                style={{
                  padding: '12px 24px',
                  'font-size': '15px',
                  'font-weight': '600',
                  border: 'none',
                  'border-radius': '8px',
                  background: (quickName().trim() && quickPhone().trim() && !isSubmitting()) ? '#1a73e8' : '#9ca3af',
                  color: '#ffffff',
                  cursor: (quickName().trim() && quickPhone().trim() && !isSubmitting()) ? 'pointer' : 'not-allowed',
                  'min-height': '48px',
                }}
                onClick={handleQuickCheckIn}
                disabled={!quickName().trim() || !quickPhone().trim() || isSubmitting()}
              >
                {isSubmitting() ? 'Adding...' : 'Check In'}
              </button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default AssistantDashboard;
