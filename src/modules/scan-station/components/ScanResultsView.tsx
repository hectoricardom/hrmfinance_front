/**
 * ScanResultsView Component
 * Displays processing results for scanned documents with correction UI,
 * field-by-field extraction display, and accept/reject actions.
 */

import { Component, createSignal, Show, For } from 'solid-js';
import { Card } from '../../ui';
import type { DrakeTaxDocumentType } from '../../drake-export/types/drakeTypes';
import { DRAKE_FORM_LABELS } from '../../drake-export/types/drakeTypes';
import type { ScanBatchItem, FieldExtraction } from '../types/scanTypes';
import { SCANNABLE_DOCUMENT_TYPES } from '../types/scanTypes';

export interface ScanResultsViewProps {
  /** Items to display results for */
  items: ScanBatchItem[];
  /** Called when an item is accepted */
  onAccept: (itemId: string) => void;
  /** Called when an item is rejected */
  onReject: (itemId: string) => void;
  /** Called when all items are accepted */
  onAcceptAll: () => void;
  /** Called when the document type is corrected */
  onCorrectType: (itemId: string, newType: DrakeTaxDocumentType) => void;
  /** Called when a field value is corrected */
  onCorrectField: (itemId: string, fieldName: string, newValue: string | number) => void;
  /** Whether processing is still in progress */
  isProcessing: boolean;
}

const ScanResultsView: Component<ScanResultsViewProps> = (props) => {
  const [expandedItem, setExpandedItem] = createSignal<string | null>(null);

  // ============================================
  // Confidence Helpers
  // ============================================

  const confidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return '#22c55e';
    if (confidence >= 0.5) return '#f59e0b';
    return '#ef4444';
  };

  const confidenceLabel = (confidence: number): string => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.5) return 'Medium';
    return 'Low';
  };

  const statusIcon = (item: ScanBatchItem): string => {
    if (item.accepted) return 'check-circle';
    if (item.rejected) return 'x-circle';
    if (item.status === 'error') return 'alert-circle';
    if (item.status === 'complete') return 'clock';
    return 'loader';
  };

  const statusColor = (item: ScanBatchItem): string => {
    if (item.accepted) return '#22c55e';
    if (item.rejected) return '#ef4444';
    if (item.status === 'error') return '#ef4444';
    if (item.status === 'complete') return '#1a73e8';
    return '#f59e0b';
  };

  const statusLabel = (item: ScanBatchItem): string => {
    if (item.accepted) return 'Accepted';
    if (item.rejected) return 'Rejected';
    switch (item.status) {
      case 'pending': return 'Pending';
      case 'uploading': return 'Uploading...';
      case 'classifying': return 'Classifying...';
      case 'extracting': return 'Extracting data...';
      case 'checking_duplicates': return 'Checking duplicates...';
      case 'complete': return 'Ready for review';
      case 'error': return 'Error';
      default: return 'Processing...';
    }
  };

  const pendingCount = () => props.items.filter((i) => i.status === 'complete' && !i.accepted && !i.rejected).length;
  const acceptedCount = () => props.items.filter((i) => i.accepted).length;
  const totalComplete = () => props.items.filter((i) => i.status === 'complete').length;

  // Toggle item expansion
  const toggleExpand = (itemId: string) => {
    setExpandedItem((prev) => (prev === itemId ? null : itemId));
  };

  // Get document type label
  const getTypeLabel = (item: ScanBatchItem): string => {
    const type = item.correctedDocumentType || item.result?.classification?.documentType || 'other';
    return DRAKE_FORM_LABELS[type] || type;
  };

  // ============================================
  // Render
  // ============================================

  return (
    <div style={{ width: '100%' }}>
      {/* Summary Bar */}
      <div style={{
        display: 'flex',
        'align-items': 'center',
        'justify-content': 'space-between',
        padding: '12px 16px',
        background: '#f8fafc',
        'border-radius': '8px',
        'margin-bottom': '12px',
        'flex-wrap': 'wrap',
        gap: '8px',
      }}>
        <div style={{ display: 'flex', gap: '16px', 'font-size': '13px', color: '#6b7280' }}>
          <span>Total: <strong style={{ color: '#374151' }}>{props.items.length}</strong></span>
          <span>Processed: <strong style={{ color: '#1a73e8' }}>{totalComplete()}</strong></span>
          <span>Accepted: <strong style={{ color: '#22c55e' }}>{acceptedCount()}</strong></span>
          <span>Pending: <strong style={{ color: '#f59e0b' }}>{pendingCount()}</strong></span>
        </div>

        <Show when={pendingCount() > 0}>
          <button
            onClick={props.onAcceptAll}
            style={{
              padding: '8px 16px',
              'border-radius': '6px',
              border: 'none',
              background: '#22c55e',
              color: 'white',
              'font-size': '13px',
              'font-weight': '600',
              cursor: 'pointer',
            }}
          >
            Accept All ({pendingCount()})
          </button>
        </Show>
      </div>

      {/* Items List */}
      <div style={{ display: 'flex', 'flex-direction': 'column', gap: '8px' }}>
        <For each={props.items}>
          {(item) => (
            <div style={{
              border: `1px solid ${item.isDuplicate ? '#fbbf24' : '#e5e7eb'}`,
              'border-radius': '8px',
              overflow: 'hidden',
              background: item.accepted ? '#f0fdf4' : item.rejected ? '#fef2f2' : 'white',
              opacity: item.rejected ? 0.6 : 1,
            }}>
              {/* Item Header Row */}
              <div
                style={{
                  display: 'flex',
                  'align-items': 'center',
                  padding: '12px 16px',
                  gap: '12px',
                  cursor: 'pointer',
                }}
                onClick={() => toggleExpand(item.id)}
              >
                {/* Thumbnail */}
                <div style={{
                  width: '48px',
                  height: '48px',
                  'border-radius': '6px',
                  overflow: 'hidden',
                  background: '#f3f4f6',
                  'flex-shrink': 0,
                  display: 'flex',
                  'align-items': 'center',
                  'justify-content': 'center',
                }}>
                  <Show when={item.previewUrl} fallback={
                    <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" style={{ width: '24px', height: '24px' }}>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  }>
                    <img
                      src={item.previewUrl}
                      alt={item.file.name}
                      style={{ width: '100%', height: '100%', 'object-fit': 'cover' }}
                    />
                  </Show>
                </div>

                {/* Info */}
                <div style={{ flex: 1, 'min-width': 0 }}>
                  <div style={{
                    'font-size': '14px',
                    'font-weight': '500',
                    color: '#374151',
                    overflow: 'hidden',
                    'text-overflow': 'ellipsis',
                    'white-space': 'nowrap',
                  }}>
                    {getTypeLabel(item)}
                  </div>
                  <div style={{
                    'font-size': '12px',
                    color: '#6b7280',
                    overflow: 'hidden',
                    'text-overflow': 'ellipsis',
                    'white-space': 'nowrap',
                  }}>
                    {item.file.name}
                  </div>
                </div>

                {/* Confidence Badge */}
                <Show when={item.result?.classification}>
                  <div style={{
                    padding: '4px 8px',
                    'border-radius': '12px',
                    'font-size': '11px',
                    'font-weight': '600',
                    background: `${confidenceColor(item.result!.classification!.confidence)}15`,
                    color: confidenceColor(item.result!.classification!.confidence),
                    'white-space': 'nowrap',
                  }}>
                    {Math.round(item.result!.classification!.confidence * 100)}% {confidenceLabel(item.result!.classification!.confidence)}
                  </div>
                </Show>

                {/* Duplicate Warning */}
                <Show when={item.isDuplicate}>
                  <div style={{
                    padding: '4px 8px',
                    'border-radius': '12px',
                    'font-size': '11px',
                    'font-weight': '600',
                    background: '#fef3c7',
                    color: '#d97706',
                    'white-space': 'nowrap',
                  }}>
                    Duplicate
                  </div>
                </Show>

                {/* Status */}
                <div style={{
                  'font-size': '12px',
                  'font-weight': '500',
                  color: statusColor(item),
                  'white-space': 'nowrap',
                }}>
                  {statusLabel(item)}
                </div>

                {/* Progress for in-progress items */}
                <Show when={item.status !== 'complete' && item.status !== 'error' && item.status !== 'pending'}>
                  <div style={{
                    width: '40px',
                    height: '4px',
                    'border-radius': '2px',
                    background: '#e5e7eb',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${item.progress}%`,
                      height: '100%',
                      background: '#1a73e8',
                      transition: 'width 0.3s',
                    }} />
                  </div>
                </Show>

                {/* Expand Arrow */}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#9ca3af"
                  style={{
                    width: '16px',
                    height: '16px',
                    transform: expandedItem() === item.id ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s',
                    'flex-shrink': 0,
                  }}
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {/* Expanded Details */}
              <Show when={expandedItem() === item.id}>
                <div style={{
                  padding: '0 16px 16px',
                  'border-top': '1px solid #f3f4f6',
                }}>
                  {/* Error Message */}
                  <Show when={item.errorMessage}>
                    <div style={{
                      'margin-top': '12px',
                      padding: '8px 12px',
                      'border-radius': '6px',
                      background: '#fef2f2',
                      color: '#ef4444',
                      'font-size': '13px',
                    }}>
                      {item.errorMessage}
                    </div>
                  </Show>

                  {/* Document Type Correction */}
                  <Show when={item.status === 'complete'}>
                    <div style={{
                      'margin-top': '12px',
                      display: 'flex',
                      'align-items': 'center',
                      gap: '8px',
                    }}>
                      <label style={{ 'font-size': '13px', 'font-weight': '500', color: '#374151', 'white-space': 'nowrap' }}>
                        Document Type:
                      </label>
                      <select
                        value={item.correctedDocumentType || item.result?.classification?.documentType || 'other'}
                        onChange={(e) => props.onCorrectType(item.id, e.currentTarget.value as DrakeTaxDocumentType)}
                        style={{
                          flex: 1,
                          padding: '6px 10px',
                          'border-radius': '6px',
                          border: '1px solid #d1d5db',
                          'font-size': '13px',
                          background: 'white',
                          'max-width': '300px',
                        }}
                      >
                        <For each={SCANNABLE_DOCUMENT_TYPES}>
                          {(docType) => (
                            <option value={docType.type}>{docType.label}</option>
                          )}
                        </For>
                      </select>
                    </div>
                  </Show>

                  {/* Extracted Fields */}
                  <Show when={item.result?.fields && item.result.fields.length > 0}>
                    <div style={{ 'margin-top': '12px' }}>
                      <div style={{ 'font-size': '13px', 'font-weight': '600', color: '#374151', 'margin-bottom': '8px' }}>
                        Extracted Fields
                      </div>
                      <div style={{
                        display: 'grid',
                        'grid-template-columns': 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: '6px',
                      }}>
                        <For each={item.result!.fields!}>
                          {(field) => (
                            <FieldRow
                              field={field}
                              onCorrect={(newValue) => props.onCorrectField(item.id, field.fieldName, newValue)}
                            />
                          )}
                        </For>
                      </div>
                    </div>
                  </Show>

                  {/* Payer Info */}
                  <Show when={item.result?.payerInfo && (item.result.payerInfo.name || item.result.payerInfo.ein)}>
                    <div style={{
                      'margin-top': '12px',
                      padding: '8px 12px',
                      'border-radius': '6px',
                      background: '#f8fafc',
                    }}>
                      <div style={{ 'font-size': '12px', 'font-weight': '600', color: '#6b7280', 'margin-bottom': '4px' }}>
                        Payer / Employer
                      </div>
                      <Show when={item.result?.payerInfo?.name}>
                        <div style={{ 'font-size': '13px', color: '#374151' }}>{item.result!.payerInfo!.name}</div>
                      </Show>
                      <Show when={item.result?.payerInfo?.ein}>
                        <div style={{ 'font-size': '12px', color: '#6b7280' }}>EIN: {item.result!.payerInfo!.ein}</div>
                      </Show>
                      <Show when={item.result?.payerInfo?.address}>
                        <div style={{ 'font-size': '12px', color: '#6b7280' }}>
                          {item.result!.payerInfo!.address}
                          {item.result!.payerInfo!.city && `, ${item.result!.payerInfo!.city}`}
                          {item.result!.payerInfo!.state && `, ${item.result!.payerInfo!.state}`}
                          {item.result!.payerInfo!.zip && ` ${item.result!.payerInfo!.zip}`}
                        </div>
                      </Show>
                    </div>
                  </Show>

                  {/* Assigned Client */}
                  <Show when={item.assignedClientName}>
                    <div style={{
                      'margin-top': '8px',
                      'font-size': '12px',
                      color: '#6b7280',
                    }}>
                      Assigned to: <strong style={{ color: '#374151' }}>{item.assignedClientName}</strong>
                    </div>
                  </Show>

                  {/* Action Buttons */}
                  <Show when={item.status === 'complete' && !item.accepted && !item.rejected}>
                    <div style={{
                      display: 'flex',
                      gap: '8px',
                      'margin-top': '12px',
                      'justify-content': 'flex-end',
                    }}>
                      <button
                        onClick={() => props.onReject(item.id)}
                        style={{
                          padding: '8px 16px',
                          'border-radius': '6px',
                          border: '1px solid #fecaca',
                          background: 'white',
                          color: '#ef4444',
                          'font-size': '13px',
                          'font-weight': '500',
                          cursor: 'pointer',
                        }}
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => props.onAccept(item.id)}
                        style={{
                          padding: '8px 16px',
                          'border-radius': '6px',
                          border: 'none',
                          background: '#22c55e',
                          color: 'white',
                          'font-size': '13px',
                          'font-weight': '600',
                          cursor: 'pointer',
                        }}
                      >
                        Accept
                      </button>
                    </div>
                  </Show>
                </div>
              </Show>
            </div>
          )}
        </For>
      </div>

      {/* Empty State */}
      <Show when={props.items.length === 0 && !props.isProcessing}>
        <div style={{
          'text-align': 'center',
          padding: '48px 16px',
          color: '#9ca3af',
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: '48px', height: '48px', margin: '0 auto 12px', opacity: 0.5 }}>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <div style={{ 'font-size': '14px' }}>No documents processed yet</div>
          <div style={{ 'font-size': '13px', 'margin-top': '4px' }}>Scan or upload documents to see results here</div>
        </div>
      </Show>
    </div>
  );
};

// ============================================
// FieldRow Sub-Component
// ============================================

interface FieldRowProps {
  field: FieldExtraction;
  onCorrect: (newValue: string | number) => void;
}

const FieldRow: Component<FieldRowProps> = (props) => {
  const [isEditing, setIsEditing] = createSignal(false);
  const [editValue, setEditValue] = createSignal('');

  const startEdit = () => {
    setEditValue(String(props.field.value));
    setIsEditing(true);
  };

  const saveEdit = () => {
    const newVal = editValue().trim();
    if (newVal !== String(props.field.value)) {
      // Try to parse as number if original was number
      const parsedValue = typeof props.field.value === 'number'
        ? (isNaN(parseFloat(newVal)) ? newVal : parseFloat(newVal))
        : newVal;
      props.onCorrect(parsedValue);
    }
    setIsEditing(false);
  };

  const cancelEdit = () => {
    setIsEditing(false);
  };

  const confidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return '#22c55e';
    if (confidence >= 0.5) return '#f59e0b';
    return '#ef4444';
  };

  const formatValue = (value: string | number): string => {
    if (typeof value === 'number') {
      return value.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
      });
    }
    return String(value);
  };

  return (
    <div style={{
      display: 'flex',
      'align-items': 'center',
      gap: '8px',
      padding: '6px 8px',
      'border-radius': '4px',
      background: props.field.corrected ? '#eff6ff' : 'transparent',
      'border-left': `3px solid ${confidenceColor(props.field.confidence)}`,
    }}>
      <div style={{ flex: 1, 'min-width': 0 }}>
        <div style={{
          'font-size': '11px',
          color: '#6b7280',
          overflow: 'hidden',
          'text-overflow': 'ellipsis',
          'white-space': 'nowrap',
        }}>
          {props.field.label}
        </div>
        <Show when={!isEditing()} fallback={
          <div style={{ display: 'flex', gap: '4px', 'margin-top': '2px' }}>
            <input
              type="text"
              value={editValue()}
              onInput={(e) => setEditValue(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveEdit();
                if (e.key === 'Escape') cancelEdit();
              }}
              autofocus
              style={{
                flex: 1,
                padding: '2px 6px',
                'border-radius': '4px',
                border: '1px solid #1a73e8',
                'font-size': '13px',
                outline: 'none',
              }}
            />
            <button
              onClick={saveEdit}
              style={{
                padding: '2px 6px',
                'border-radius': '4px',
                border: 'none',
                background: '#1a73e8',
                color: 'white',
                'font-size': '11px',
                cursor: 'pointer',
              }}
            >
              Save
            </button>
            <button
              onClick={cancelEdit}
              style={{
                padding: '2px 6px',
                'border-radius': '4px',
                border: '1px solid #d1d5db',
                background: 'white',
                color: '#6b7280',
                'font-size': '11px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        }>
          <div
            style={{
              'font-size': '13px',
              'font-weight': '500',
              color: '#374151',
              cursor: 'pointer',
            }}
            onClick={(e) => {
              e.stopPropagation();
              startEdit();
            }}
            title="Click to edit"
          >
            {formatValue(props.field.value)}
            <Show when={props.field.corrected}>
              <span style={{ 'font-size': '10px', color: '#1a73e8', 'margin-left': '4px' }}>(edited)</span>
            </Show>
          </div>
        </Show>
      </div>

      {/* Edit icon */}
      <Show when={!isEditing()}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            startEdit();
          }}
          style={{
            padding: '2px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: '#9ca3af',
            'flex-shrink': 0,
          }}
          title="Edit value"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: '14px', height: '14px' }}>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      </Show>
    </div>
  );
};

export default ScanResultsView;
