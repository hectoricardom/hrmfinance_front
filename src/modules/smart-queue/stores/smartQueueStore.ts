/**
 * Smart Queue Store
 * Reactive state management for the Smart Queue module
 * Follows createStore + createRoot pattern
 */

import { createStore } from 'solid-js/store';
import { createRoot } from 'solid-js';
import type {
  SmartQueueState,
  QueueItem,
  QueueView,
  QueueFilters,
  QueueSection,
  SeasonMetrics,
  BatchActionType,
} from '../types/smartQueueTypes';
import { DEFAULT_QUEUE_FILTERS } from '../types/smartQueueTypes';
import {
  buildQueue,
  buildQueueFromPortals,
  filterQueueItems,
  groupBySection,
  calculateSeasonMetrics,
  analyzeBottlenecks,
  calculateRevenuePipeline,
  executeBatchAction,
  fetchQueueClients,
} from '../services/smartQueueService';
import { devLog } from '../../../services/utils';
import type { TaxPortal } from '../../drake-export/types/drakeTypes';

// ============================================
// Initial State
// ============================================

const initialState: SmartQueueState = {
  queueItems: [],
  seasonMetrics: null,
  currentView: 'my_day',
  filters: { ...DEFAULT_QUEUE_FILTERS },
  selectedItemIds: [],
  isLoading: false,
  error: null,
  expandedSections: {
    urgent: true,
    ready: true,
    almost_ready: true,
    in_progress: false,
    waiting: false,
  },
  batchProcessing: false,
  batchProgress: 0,
  batchTotal: 0,
};

// ============================================
// Store Creation
// ============================================

function createSmartQueueStore() {
  const [state, setState] = createStore<SmartQueueState>({ ...initialState });

  // ==========================================
  // Core Actions
  // ==========================================

  /**
   * Load the full queue from the server
   */
  const loadQueue = async (): Promise<void> => {
    setState('isLoading', true);
    setState('error', null);

    try {
      const items = await buildQueue();
      setState('queueItems', items);

      // Also fetch all clients for metrics (including completed/cancelled)
      const allClients = await fetchQueueClients();
      const metrics = calculateSeasonMetrics(items, allClients as TaxPortal[]);
      setState('seasonMetrics', metrics);

      devLog('Smart Queue: Loaded', items.length, 'queue items');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load queue';
      setState('error', message);
      devLog('Smart Queue: Error loading queue:', error);
    } finally {
      setState('isLoading', false);
    }
  };

  /**
   * Load the queue from pre-loaded portals (avoids duplicate API calls)
   */
  const loadQueueFromPortals = async (portals: TaxPortal[]): Promise<void> => {
    setState('isLoading', true);
    setState('error', null);

    try {
      const items = await buildQueueFromPortals(portals);
      setState('queueItems', items);

      // Use the same portals for metrics (no second fetch)
      const metrics = calculateSeasonMetrics(items, portals);
      setState('seasonMetrics', metrics);

      devLog('Smart Queue: Loaded from portals,', items.length, 'queue items');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load queue';
      setState('error', message);
    } finally {
      setState('isLoading', false);
    }
  };

  /**
   * Set the current view
   */
  const setView = (view: QueueView): void => {
    setState('currentView', view);
  };

  /**
   * Update filters (partial)
   */
  const setFilters = (updates: Partial<QueueFilters>): void => {
    setState('filters', (current) => ({ ...current, ...updates }));
  };

  /**
   * Reset filters to defaults
   */
  const resetFilters = (): void => {
    setState('filters', { ...DEFAULT_QUEUE_FILTERS });
  };

  /**
   * Set search text
   */
  const setSearch = (search: string): void => {
    setState('filters', 'search', search);
  };

  // ==========================================
  // Section Actions
  // ==========================================

  /**
   * Toggle a section's expanded/collapsed state
   */
  const toggleSection = (section: QueueSection): void => {
    setState('expandedSections', section, (current) => !current);
  };

  /**
   * Expand all sections
   */
  const expandAllSections = (): void => {
    setState('expandedSections', {
      urgent: true,
      ready: true,
      almost_ready: true,
      in_progress: true,
      waiting: true,
    });
  };

  /**
   * Collapse all sections
   */
  const collapseAllSections = (): void => {
    setState('expandedSections', {
      urgent: false,
      ready: false,
      almost_ready: false,
      in_progress: false,
      waiting: false,
    });
  };

  // ==========================================
  // Selection Actions (for batch operations)
  // ==========================================

  /**
   * Toggle selection of a single item
   */
  const toggleItemSelection = (itemId: string): void => {
    setState('selectedItemIds', (current) => {
      if (current.includes(itemId)) {
        return current.filter(id => id !== itemId);
      }
      return [...current, itemId];
    });
  };

  /**
   * Select all visible items
   */
  const selectAll = (items?: QueueItem[]): void => {
    const targetItems = items || getFilteredItems();
    setState('selectedItemIds', targetItems.map(i => i.id));
  };

  /**
   * Clear all selections
   */
  const clearSelection = (): void => {
    setState('selectedItemIds', []);
  };

  /**
   * Select items by section
   */
  const selectBySection = (section: QueueSection): void => {
    const sectionItems = state.queueItems.filter(i => i.priority.section === section);
    setState('selectedItemIds', sectionItems.map(i => i.id));
  };

  // ==========================================
  // Batch Actions
  // ==========================================

  /**
   * Execute a batch action on selected items
   */
  const executeBatch = async (
    action: BatchActionType,
    payload?: Record<string, any>
  ): Promise<{ success: boolean; errors: string[] }> => {
    if (state.selectedItemIds.length === 0) {
      return { success: false, errors: ['No items selected'] };
    }

    setState('batchProcessing', true);
    setState('batchProgress', 0);
    setState('batchTotal', state.selectedItemIds.length);

    try {
      const result = await executeBatchAction(action, state.selectedItemIds, payload);

      if (result.success) {
        // Reload the queue to reflect changes
        await loadQueue();
        clearSelection();
      }

      return { success: result.success, errors: result.errors };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Batch action failed';
      return { success: false, errors: [message] };
    } finally {
      setState('batchProcessing', false);
      setState('batchProgress', 0);
      setState('batchTotal', 0);
    }
  };

  // ==========================================
  // Flag Actions
  // ==========================================

  /**
   * Toggle flag on a queue item locally
   */
  const toggleFlag = (itemId: string, reason?: string): void => {
    setState('queueItems', (item) => item.id === itemId, (item) => ({
      ...item,
      isFlagged: !item.isFlagged,
      flagReason: !item.isFlagged ? reason : undefined,
    }));
  };

  // ==========================================
  // Computed Getters
  // ==========================================

  /**
   * Get filtered queue items based on current filters
   */
  const getFilteredItems = (): QueueItem[] => {
    return filterQueueItems(state.queueItems, state.filters);
  };

  /**
   * Get items grouped by section (for My Day view)
   */
  const getGroupedItems = (): Record<QueueSection, QueueItem[]> => {
    const filtered = getFilteredItems();
    return groupBySection(filtered);
  };

  /**
   * Get selected items
   */
  const getSelectedItems = (): QueueItem[] => {
    return state.queueItems.filter(i => state.selectedItemIds.includes(i.id));
  };

  /**
   * Check if an item is selected
   */
  const isItemSelected = (itemId: string): boolean => {
    return state.selectedItemIds.includes(itemId);
  };

  /**
   * Get bottleneck analysis data
   */
  const getBottlenecks = () => {
    return analyzeBottlenecks(state.queueItems);
  };

  /**
   * Get revenue pipeline data
   */
  const getRevenuePipeline = () => {
    return calculateRevenuePipeline(state.queueItems);
  };

  /**
   * Get items sorted by aging (days in stage, descending)
   */
  const getAgingItems = (): QueueItem[] => {
    const filtered = getFilteredItems();
    return [...filtered].sort((a, b) => b.daysInCurrentStage - a.daysInCurrentStage);
  };

  /**
   * Get items ready for batch processing
   */
  const getBatchReadyItems = (): QueueItem[] => {
    return state.queueItems.filter(i =>
      i.workflowStatus === 'docs_complete' || i.workflowStatus === 'ready_to_file'
    );
  };

  /**
   * Reset entire store to initial state
   */
  const reset = (): void => {
    setState({ ...initialState });
  };

  return {
    state,
    // Core actions
    loadQueue,
    loadQueueFromPortals,
    setView,
    setFilters,
    resetFilters,
    setSearch,
    // Section actions
    toggleSection,
    expandAllSections,
    collapseAllSections,
    // Selection actions
    toggleItemSelection,
    selectAll,
    clearSelection,
    selectBySection,
    // Batch actions
    executeBatch,
    // Flag actions
    toggleFlag,
    // Computed getters
    getFilteredItems,
    getGroupedItems,
    getSelectedItems,
    isItemSelected,
    getBottlenecks,
    getRevenuePipeline,
    getAgingItems,
    getBatchReadyItems,
    // Reset
    reset,
  };
}

// ============================================
// Store Instance
// ============================================

const storeInstance = createRoot(createSmartQueueStore);

/** Reactive store state */
export const smartQueueStore = storeInstance.state;

/** Store actions */
export const smartQueueActions = {
  loadQueue: storeInstance.loadQueue,
  loadQueueFromPortals: storeInstance.loadQueueFromPortals,
  setView: storeInstance.setView,
  setFilters: storeInstance.setFilters,
  resetFilters: storeInstance.resetFilters,
  setSearch: storeInstance.setSearch,
  toggleSection: storeInstance.toggleSection,
  expandAllSections: storeInstance.expandAllSections,
  collapseAllSections: storeInstance.collapseAllSections,
  toggleItemSelection: storeInstance.toggleItemSelection,
  selectAll: storeInstance.selectAll,
  clearSelection: storeInstance.clearSelection,
  selectBySection: storeInstance.selectBySection,
  executeBatch: storeInstance.executeBatch,
  toggleFlag: storeInstance.toggleFlag,
  reset: storeInstance.reset,
};

/** Store computed getters */
export const smartQueueGetters = {
  getFilteredItems: storeInstance.getFilteredItems,
  getGroupedItems: storeInstance.getGroupedItems,
  getSelectedItems: storeInstance.getSelectedItems,
  isItemSelected: storeInstance.isItemSelected,
  getBottlenecks: storeInstance.getBottlenecks,
  getRevenuePipeline: storeInstance.getRevenuePipeline,
  getAgingItems: storeInstance.getAgingItems,
  getBatchReadyItems: storeInstance.getBatchReadyItems,
};

export default storeInstance;
