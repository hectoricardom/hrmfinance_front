/**
 * Check-In Store
 * Reactive store for managing the office check-in queue
 * Uses createStore + createRoot pattern matching the codebase convention
 */

import { createSignal, createRoot, onCleanup } from 'solid-js';
import { createStore } from 'solid-js/store';
import { devLog } from '../../../services/utils';
import { checkinService } from '../services/checkinService';
import type { CheckInEntry, CheckInStatus, WaitTimeEstimate } from '../types/workflowTypes';

// ============================================
// Store State Interface
// ============================================

interface CheckInState {
  waitingList: CheckInEntry[];
  isLoading: boolean;
  error: string | null;
  averageWaitMinutes: number;
  lastRefreshed: number | null;
}

// ============================================
// Store Creation (createRoot pattern)
// ============================================

function createCheckinStore() {
  const [state, setState] = createStore<CheckInState>({
    waitingList: [],
    isLoading: false,
    error: null,
    averageWaitMinutes: 35,
    lastRefreshed: null,
  });

  const [newCheckInAlert, setNewCheckInAlert] = createSignal(false);
  let refreshInterval: ReturnType<typeof setInterval> | null = null;

  // ============================================
  // Auto-refresh (every 30 seconds)
  // ============================================

  const startAutoRefresh = () => {
    stopAutoRefresh();
    refreshInterval = setInterval(() => {
      loadWaitingList();
    }, 30_000);
    devLog('CheckinStore: auto-refresh started (30s interval)');
  };

  const stopAutoRefresh = () => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
      devLog('CheckinStore: auto-refresh stopped');
    }
  };

  // ============================================
  // Actions
  // ============================================

  const loadWaitingList = async (): Promise<void> => {
    try {
      setState('isLoading', true);
      setState('error', null);

      const list = await checkinService.getWaitingList();
      const previousCount = state.waitingList.filter(e => e.status === 'waiting').length;
      const newCount = list.filter(e => e.status === 'waiting').length;

      setState('waitingList', list);
      setState('lastRefreshed', Date.now());

      // Detect new check-ins
      if (newCount > previousCount && previousCount > 0) {
        setNewCheckInAlert(true);
        setTimeout(() => setNewCheckInAlert(false), 5000);
      }

      // Update average wait time
      const avgTime = await checkinService.getAverageProcessingTime();
      setState('averageWaitMinutes', avgTime);
    } catch (error: any) {
      devLog('CheckinStore: error loading waiting list', error);
      setState('error', error.message || 'Failed to load waiting list');
    } finally {
      setState('isLoading', false);
    }
  };

  const addToQueue = async (entry: CheckInEntry): Promise<void> => {
    // Optimistically add to local state
    setState('waitingList', [...state.waitingList, entry]);
    setNewCheckInAlert(true);
    setTimeout(() => setNewCheckInAlert(false), 5000);
  };

  const updateEntry = (entryId: string, updates: Partial<CheckInEntry>): void => {
    setState(
      'waitingList',
      (list) => list.map((entry) =>
        entry.id === entryId ? { ...entry, ...updates } : entry
      )
    );
  };

  const removeEntry = (entryId: string): void => {
    setState(
      'waitingList',
      state.waitingList.filter((entry) => entry.id !== entryId)
    );
  };

  const checkInClient = async (clientId: string, notes?: string): Promise<CheckInEntry> => {
    try {
      setState('isLoading', true);
      const entry = await checkinService.checkInClient(clientId, notes);
      await addToQueue(entry);
      return entry;
    } catch (error: any) {
      devLog('CheckinStore: error checking in client', error);
      setState('error', error.message || 'Failed to check in client');
      throw error;
    } finally {
      setState('isLoading', false);
    }
  };

  const checkInWalkIn = async (name: string, phone: string, serviceType?: string): Promise<CheckInEntry> => {
    try {
      setState('isLoading', true);
      const entry = await checkinService.checkInWalkIn(name, phone, serviceType);
      await addToQueue(entry);
      return entry;
    } catch (error: any) {
      devLog('CheckinStore: error checking in walk-in', error);
      setState('error', error.message || 'Failed to check in walk-in');
      throw error;
    } finally {
      setState('isLoading', false);
    }
  };

  const markInProgress = async (entryId: string, preparerId: string, preparerName?: string): Promise<void> => {
    try {
      const updated = await checkinService.markInProgress(entryId, preparerId, preparerName);
      updateEntry(entryId, {
        status: 'in_progress',
        assignedPreparerId: preparerId,
        assignedPreparerName: preparerName || updated.assignedPreparerName,
        startedAt: Date.now(),
      });
    } catch (error: any) {
      devLog('CheckinStore: error marking in progress', error);
      setState('error', error.message || 'Failed to update entry');
      throw error;
    }
  };

  const markCompleted = async (entryId: string): Promise<void> => {
    try {
      await checkinService.markCompleted(entryId);
      updateEntry(entryId, {
        status: 'completed',
        completedAt: Date.now(),
      });
    } catch (error: any) {
      devLog('CheckinStore: error marking completed', error);
      setState('error', error.message || 'Failed to complete entry');
      throw error;
    }
  };

  const markNoShow = async (entryId: string): Promise<void> => {
    try {
      await checkinService.markNoShow(entryId);
      updateEntry(entryId, {
        status: 'no_show',
        completedAt: Date.now(),
      });
    } catch (error: any) {
      devLog('CheckinStore: error marking no-show', error);
      setState('error', error.message || 'Failed to mark no-show');
      throw error;
    }
  };

  const callNextClient = async (): Promise<CheckInEntry | null> => {
    try {
      const nextEntry = await checkinService.callNextClient();
      if (nextEntry) {
        updateEntry(nextEntry.id, { status: 'in_progress', startedAt: Date.now() });
      }
      return nextEntry;
    } catch (error: any) {
      devLog('CheckinStore: error calling next client', error);
      setState('error', error.message || 'Failed to call next client');
      return null;
    }
  };

  const getEstimatedWait = async (): Promise<WaitTimeEstimate> => {
    return checkinService.estimateWaitTime();
  };

  const clearError = (): void => {
    setState('error', null);
  };

  // ============================================
  // Computed Getters
  // ============================================

  const getWaitingEntries = (): CheckInEntry[] => {
    return state.waitingList
      .filter((e) => e.status === 'waiting')
      .sort((a, b) => a.checkInTime - b.checkInTime);
  };

  const getInProgressEntries = (): CheckInEntry[] => {
    return state.waitingList
      .filter((e) => e.status === 'in_progress')
      .sort((a, b) => (a.startedAt || a.checkInTime) - (b.startedAt || b.checkInTime));
  };

  const getCompletedEntries = (): CheckInEntry[] => {
    return state.waitingList
      .filter((e) => e.status === 'completed')
      .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
  };

  const getWaitingCount = (): number => {
    return state.waitingList.filter((e) => e.status === 'waiting').length;
  };

  const getInProgressCount = (): number => {
    return state.waitingList.filter((e) => e.status === 'in_progress').length;
  };

  const getCompletedTodayCount = (): number => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return state.waitingList.filter(
      (e) => e.status === 'completed' && (e.completedAt || 0) >= todayStart.getTime()
    ).length;
  };

  return {
    get state() {
      return state;
    },

    get newCheckInAlert() {
      return newCheckInAlert();
    },

    // Actions
    loadWaitingList,
    addToQueue,
    updateEntry,
    removeEntry,
    checkInClient,
    checkInWalkIn,
    markInProgress,
    markCompleted,
    markNoShow,
    callNextClient,
    getEstimatedWait,
    clearError,
    startAutoRefresh,
    stopAutoRefresh,

    // Computed
    getWaitingEntries,
    getInProgressEntries,
    getCompletedEntries,
    getWaitingCount,
    getInProgressCount,
    getCompletedTodayCount,
  };
}

// Export as singleton via createRoot
export const checkinStore = createRoot(createCheckinStore);
