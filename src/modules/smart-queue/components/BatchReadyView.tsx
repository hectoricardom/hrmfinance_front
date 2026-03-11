/**
 * BatchReadyView Component
 * Batch processing interface for clients ready for action
 * Supports checkbox selection with Select All and batch action execution
 */

import { Component, For, Show, createMemo, createSignal } from 'solid-js';
import { Button, Modal } from '../../ui';
import type { QueueItem, BatchActionType } from '../types/smartQueueTypes';
import { BATCH_ACTIONS } from '../types/smartQueueTypes';
import {
  smartQueueStore,
  smartQueueActions,
  smartQueueGetters,
} from '../stores/smartQueueStore';
import {
  TAX_WORKFLOW_STATUS_LABELS,
  TAX_WORKFLOW_STATUS_COLORS,
} from '../../drake-export/types/drakeTypes';
import QueueClientCard from './QueueClientCard';

const BatchReadyView: Component = () => {
  const [confirmAction, setConfirmAction] = createSignal<BatchActionType | null>(null);
  const [actionResult, setActionResult] = createSignal<{ success: boolean; message: string } | null>(null);

  const batchItems = createMemo(() => smartQueueGetters.getBatchReadyItems());
  const selectedCount = createMemo(() => smartQueueStore.selectedItemIds.length);
  const allSelected = createMemo(() =>
    batchItems().length > 0 && selectedCount() === batchItems().length
  );

  const handleSelectAll = () => {
    if (allSelected()) {
      smartQueueActions.clearSelection();
    } else {
      smartQueueActions.selectAll(batchItems());
    }
  };

  const handleBatchAction = async (actionType: BatchActionType) => {
    const action = BATCH_ACTIONS.find(a => a.type === actionType);
    if (!action) return;

    if (action.confirmationRequired) {
      setConfirmAction(actionType);
      return;
    }

    await executeAction(actionType);
  };

  const executeAction = async (actionType: BatchActionType) => {
    setConfirmAction(null);
    const result = await smartQueueActions.executeBatch(actionType);
    if (result.success) {
      setActionResult({ success: true, message: `Successfully processed ${selectedCount()} clients.` });
    } else {
      setActionResult({ success: false, message: result.errors.join(', ') });
    }
    // Auto-clear result after 3 seconds
    setTimeout(() => setActionResult(null), 3000);
  };

  const availableActions = createMemo(() => {
    if (selectedCount() === 0) return [];

    const selectedItems = smartQueueGetters.getSelectedItems();
    const selectedStatuses = new Set(selectedItems.map(i => i.workflowStatus));

    return BATCH_ACTIONS.filter(action => {
      if (!action.requiredStatuses) return true;
      // At least one selected item should match the required status
      return action.requiredStatuses.some(status => selectedStatuses.has(status));
    });
  });

  return (
    <div style={{
      display: 'flex',
      'flex-direction': 'column',
      gap: '16px',
    }}>
      {/* Batch action bar */}
      <div style={{
        display: 'flex',
        'align-items': 'center',
        gap: '12px',
        padding: '16px 20px',
        background: '#ffffff',
        'border-radius': '10px',
        border: '1px solid #e2e8f0',
        'flex-wrap': 'wrap',
      }}>
        {/* Select all checkbox */}
        <label style={{
          display: 'flex',
          'align-items': 'center',
          gap: '8px',
          cursor: 'pointer',
          'user-select': 'none',
        }}>
          <input
            type="checkbox"
            checked={allSelected()}
            onChange={handleSelectAll}
            style={{
              width: '18px',
              height: '18px',
              'accent-color': '#1a73e8',
              cursor: 'pointer',
            }}
          />
          <span style={{
            'font-size': '13px',
            'font-weight': '500',
            color: '#475569',
          }}>
            Select All
          </span>
        </label>

        {/* Selected count */}
        <div style={{
          padding: '4px 12px',
          'border-radius': '16px',
          background: selectedCount() > 0 ? '#eff6ff' : '#f1f5f9',
          'font-size': '13px',
          'font-weight': '500',
          color: selectedCount() > 0 ? '#1a73e8' : '#94a3b8',
        }}>
          {selectedCount()} selected
        </div>

        <div style={{ flex: '1' }} />

        {/* Action buttons */}
        <Show when={selectedCount() > 0}>
          <For each={availableActions()}>
            {(action) => (
              <button
                onClick={() => handleBatchAction(action.type)}
                disabled={smartQueueStore.batchProcessing}
                style={{
                  padding: '8px 16px',
                  'border-radius': '6px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  color: '#475569',
                  'font-size': '13px',
                  'font-weight': '500',
                  cursor: smartQueueStore.batchProcessing ? 'not-allowed' : 'pointer',
                  opacity: smartQueueStore.batchProcessing ? '0.6' : '1',
                  transition: 'all 0.15s ease',
                  'white-space': 'nowrap',
                }}
                onMouseEnter={(e) => {
                  if (!smartQueueStore.batchProcessing) {
                    e.currentTarget.style.borderColor = '#1a73e8';
                    e.currentTarget.style.color = '#1a73e8';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.color = '#475569';
                }}
                title={action.description}
              >
                {action.label}
              </button>
            )}
          </For>
        </Show>
      </div>

      {/* Result message */}
      <Show when={actionResult()}>
        {(result) => (
          <div style={{
            padding: '12px 16px',
            'border-radius': '8px',
            background: result().success ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${result().success ? '#bbf7d0' : '#fecaca'}`,
            color: result().success ? '#15803d' : '#dc2626',
            'font-size': '13px',
          }}>
            {result().message}
          </div>
        )}
      </Show>

      {/* Batch processing progress */}
      <Show when={smartQueueStore.batchProcessing}>
        <div style={{
          padding: '16px',
          background: '#ffffff',
          'border-radius': '8px',
          border: '1px solid #e2e8f0',
        }}>
          <div style={{
            display: 'flex',
            'justify-content': 'space-between',
            'margin-bottom': '8px',
            'font-size': '13px',
            color: '#475569',
          }}>
            <span>Processing batch...</span>
            <span>{smartQueueStore.batchProgress} / {smartQueueStore.batchTotal}</span>
          </div>
          <div style={{
            height: '8px',
            background: '#e2e8f0',
            'border-radius': '4px',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: smartQueueStore.batchTotal > 0
                ? `${(smartQueueStore.batchProgress / smartQueueStore.batchTotal) * 100}%`
                : '0%',
              background: '#1a73e8',
              'border-radius': '4px',
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>
      </Show>

      {/* Client list */}
      <div style={{
        background: '#ffffff',
        'border-radius': '10px',
        border: '1px solid #e2e8f0',
        padding: '12px',
      }}>
        <div style={{
          'font-size': '14px',
          'font-weight': '600',
          color: '#1e293b',
          padding: '8px 8px 16px 8px',
          'border-bottom': '1px solid #f1f5f9',
          'margin-bottom': '8px',
        }}>
          Ready for Batch Processing ({batchItems().length} clients)
        </div>

        <Show when={batchItems().length === 0}>
          <div style={{
            padding: '40px 20px',
            'text-align': 'center',
            color: '#94a3b8',
            'font-size': '14px',
          }}>
            No clients are currently ready for batch processing.
            <br />
            <span style={{ 'font-size': '12px' }}>
              Clients with status "Documents Complete" or "Ready to File" will appear here.
            </span>
          </div>
        </Show>

        <div style={{
          display: 'flex',
          'flex-direction': 'column',
          gap: '6px',
        }}>
          <For each={batchItems()}>
            {(item) => (
              <QueueClientCard
                item={item}
                selected={smartQueueStore.selectedItemIds.includes(item.id)}
                showCheckbox={true}
                onToggleSelect={(id) => smartQueueActions.toggleItemSelection(id)}
                onFlag={(id) => smartQueueActions.toggleFlag(id)}
              />
            )}
          </For>
        </div>
      </div>

      {/* Confirmation modal */}
      <Show when={confirmAction()}>
        {(actionType) => {
          const action = BATCH_ACTIONS.find(a => a.type === actionType());
          return (
            <div
              style={{
                position: 'fixed',
                top: '0',
                left: '0',
                right: '0',
                bottom: '0',
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                'align-items': 'center',
                'justify-content': 'center',
                'z-index': '1000',
              }}
              onClick={() => setConfirmAction(null)}
            >
              <div
                style={{
                  background: '#ffffff',
                  'border-radius': '12px',
                  padding: '24px',
                  'max-width': '420px',
                  width: '90%',
                  'box-shadow': '0 20px 60px rgba(0,0,0,0.15)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 style={{
                  'font-size': '18px',
                  'font-weight': '600',
                  color: '#1e293b',
                  margin: '0 0 8px 0',
                }}>
                  Confirm Batch Action
                </h3>
                <p style={{
                  'font-size': '14px',
                  color: '#64748b',
                  margin: '0 0 20px 0',
                }}>
                  {action?.description} for {selectedCount()} selected client{selectedCount() !== 1 ? 's' : ''}?
                </p>
                <div style={{
                  display: 'flex',
                  'justify-content': 'flex-end',
                  gap: '8px',
                }}>
                  <button
                    onClick={() => setConfirmAction(null)}
                    style={{
                      padding: '8px 20px',
                      'border-radius': '6px',
                      border: '1px solid #e2e8f0',
                      background: '#ffffff',
                      color: '#64748b',
                      'font-size': '14px',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => executeAction(actionType())}
                    style={{
                      padding: '8px 20px',
                      'border-radius': '6px',
                      border: 'none',
                      background: '#1a73e8',
                      color: '#ffffff',
                      'font-size': '14px',
                      'font-weight': '500',
                      cursor: 'pointer',
                    }}
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          );
        }}
      </Show>
    </div>
  );
};

export default BatchReadyView;
