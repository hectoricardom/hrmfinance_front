/**
 * Adapter Detail Page
 *
 * Displays a single adapter with its field mappings editor.
 * Allows users to view, edit, lock/unlock, and test field mappings.
 *
 * Based on spec section 3.3
 */

import { Component, createSignal, createMemo, For, Show, onMount } from 'solid-js';
import { A, useParams } from '@solidjs/router';
import { supervisionStore } from '../stores/supervisionStore';
import { LockStatusBadge, ConfidenceBadge, SourceBadge, ActionButton } from '../components/shared';
import { LockStatus, MappingSource } from '../types/supervisionTypes';
import type { SupervisedAdapter, SupervisedFieldMapping, FieldTransform } from '../types/supervisionTypes';

// Transform options for the dropdown
const TRANSFORM_OPTIONS: { value: FieldTransform; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'uppercase', label: 'UPPERCASE' },
  { value: 'lowercase', label: 'lowercase' },
  { value: 'trim', label: 'Trim whitespace' },
  { value: 'toNumber', label: 'To Number' },
  { value: 'toString', label: 'To String' },
  { value: 'toDate', label: 'To Date' },
  { value: 'toBoolean', label: 'To Boolean' },
  { value: 'parseJSON', label: 'Parse JSON' },
  { value: 'stringifyJSON', label: 'Stringify JSON' },
  { value: 'split', label: 'Split' },
  { value: 'join', label: 'Join' },
  { value: 'replace', label: 'Replace' },
  { value: 'extract', label: 'Extract' },
  { value: 'custom', label: 'Custom' },
];

// Helper to get transform display label
const getTransformLabel = (transform: FieldTransform): string => {
  const option = TRANSFORM_OPTIONS.find((opt) => opt.value === transform);
  return option ? option.label : transform;
};

// Lock status colors as specified
const LOCK_STATUS_COLORS = {
  LOCKED: '#22c55e',
  AI_LOCKED: '#3b82f6',
  PENDING: '#f59e0b',
  UNLOCKED: '#9ca3af',
};

const AdapterDetailPage: Component = () => {
  const params = useParams<{ id: string }>();

  // Local state
  const [editingMapping, setEditingMapping] = createSignal<SupervisedFieldMapping | null>(null);
  const [editForm, setEditForm] = createSignal({
    sourcePath: '',
    transform: 'none' as FieldTransform,
    targetPath: '',
    confidence: 0,
  });
  const [testResults, setTestResults] = createSignal<{ input: unknown; output: unknown; success: boolean }[]>([]);
  const [showHistory, setShowHistory] = createSignal<string | null>(null);

  // Load adapter details on mount
  onMount(() => {
    if (params.id) {
      supervisionStore.loadAdapterById(params.id);
      supervisionStore.loadFieldMappings(params.id);
    }
  });

  // Get the current adapter
  const adapter = createMemo(() => supervisionStore.selectedAdapter());
  const fieldMappings = createMemo(() => supervisionStore.fieldMappings());

  // Format timestamp
  const formatDate = (date: Date | null): string => {
    if (!date) return 'Never';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  // Calculate success rate string
  const getSuccessRateString = (a: SupervisedAdapter | null): string => {
    if (!a) return '0/0 (0%)';
    const rate = a.successRate.toFixed(1);
    return `${a.successCount.toLocaleString()}/${a.processedCount.toLocaleString()} (${rate}%)`;
  };

  // Check if mapping has low confidence
  const isLowConfidence = (mapping: SupervisedFieldMapping): boolean => {
    return mapping.confidence < 0.6;
  };

  // Get status icon for mapping
  const getMappingStatusIcon = (mapping: SupervisedFieldMapping): string => {
    if (mapping?.lock?.status === LockStatus.USER_LOCKED || mapping?.lock?.status === LockStatus.AI_LOCKED) {
      return 'LOCKED';
    }
    if (mapping.source === MappingSource.AI_GENERATED) {
      return 'AI';
    }
    if (isLowConfidence(mapping)) {
      return 'LOW_CONF';
    }
    return '';
  };

  // Handle edit mapping
  const handleEditMapping = (mapping: SupervisedFieldMapping) => {
    setEditingMapping(mapping);
    setEditForm({
      sourcePath: mapping.sourcePath,
      transform: mapping.transform,
      targetPath: mapping.targetPath,
      confidence: mapping.confidence * 100,
    });
    // Populate test cases from mapping
    const results = mapping.testCases.map((tc) => ({
      input: tc.input,
      output: tc.expectedOutput,
      success: tc.isPassing,
    }));
    setTestResults(results.length > 0 ? results : [
      { input: 1000, output: 10.00, success: true },
      { input: 2550, output: 25.50, success: true },
    ]);
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingMapping(null);
    setEditForm({
      sourcePath: '',
      transform: 'none',
      targetPath: '',
      confidence: 0,
    });
    setTestResults([]);
  };

  // Handle save mapping
  const handleSaveMapping = async () => {
    const mapping = editingMapping();
    if (!mapping || !params.id) return;

    try {
      await supervisionStore.updateFieldMapping(params.id, mapping.id, {
        sourcePath: editForm().sourcePath,
        transform: editForm().transform,
        targetPath: editForm().targetPath,
      });
      handleCancelEdit();
    } catch (e) {
      alert('Failed to save mapping: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }
  };

  // Handle lock mapping
  const handleLockMapping = async (mappingId: string) => {
    if (!params.id) return;
    try {
      await supervisionStore.lockFieldMapping(params.id, mappingId, 'Locked by user');
    } catch (e) {
      alert('Failed to lock mapping: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }
  };

  // Handle unlock mapping
  const handleUnlockMapping = async (mappingId: string) => {
    if (!params.id) return;
    try {
      await supervisionStore.unlockFieldMapping(params.id, mappingId);
    } catch (e) {
      alert('Failed to unlock mapping: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }
  };

  // Handle lock all adapter
  const handleLockAdapter = async () => {
    if (!params.id) return;
    try {
      await supervisionStore.lockAdapter(params.id, 'Locked all by user');
    } catch (e) {
      alert('Failed to lock adapter: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }
  };

  // Handle test adapter
  const handleTestAdapter = async () => {
    if (!params.id) return;
    try {
      await supervisionStore.testAdapter(params.id, {});
      alert('Test completed successfully');
    } catch (e) {
      alert('Test failed: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }
  };

  // Handle show history
  const handleShowHistory = (mappingId: string) => {
    setShowHistory(showHistory() === mappingId ? null : mappingId);
  };

  // Styles
  const pageStyle = {
    padding: '1.5rem',
    'min-height': '100vh',
    background: 'var(--bg-primary, #f8fafc)',
  };

  const backLinkStyle = {
    display: 'inline-flex',
    'align-items': 'center',
    gap: '0.5rem',
    color: 'var(--text-muted, #6b7280)',
    'text-decoration': 'none',
    'font-size': '0.875rem',
    'margin-bottom': '1rem',
    cursor: 'pointer',
  };

  const cardStyle = {
    background: 'white',
    'border-radius': '0.75rem',
    border: '1px solid var(--border-color, #e5e7eb)',
    'margin-bottom': '1.5rem',
    overflow: 'hidden',
  };

  const cardHeaderStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '1.25rem 1.5rem',
    'border-bottom': '1px solid var(--border-color, #e5e7eb)',
  };

  const adapterTitleStyle = {
    'font-size': '1.5rem',
    'font-weight': '700',
    color: 'var(--text-primary, #1e293b)',
    margin: '0',
  };

  const headerButtonsStyle = {
    display: 'flex',
    gap: '0.75rem',
  };

  const primaryButtonStyle = {
    display: 'inline-flex',
    'align-items': 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    background: 'var(--primary-color, #3b82f6)',
    color: 'white',
    border: 'none',
    'border-radius': '0.5rem',
    'font-weight': '500',
    'font-size': '0.875rem',
    cursor: 'pointer',
  };

  const secondaryButtonStyle = {
    display: 'inline-flex',
    'align-items': 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    background: 'white',
    color: 'var(--text-primary, #374151)',
    border: '1px solid var(--border-color, #e5e7eb)',
    'border-radius': '0.5rem',
    'font-weight': '500',
    'font-size': '0.875rem',
    cursor: 'pointer',
  };

  const lockButtonStyle = {
    ...secondaryButtonStyle,
    color: LOCK_STATUS_COLORS.LOCKED,
    'border-color': LOCK_STATUS_COLORS.LOCKED,
  };

  const statsRowStyle = {
    display: 'flex',
    gap: '1.5rem',
    padding: '1rem 1.5rem',
    'font-size': '0.875rem',
    color: 'var(--text-muted, #6b7280)',
    'background': 'var(--bg-secondary, #f9fafb)',
  };

  const sectionTitleStyle = {
    'font-size': '0.875rem',
    'font-weight': '600',
    color: 'var(--text-primary, #1e293b)',
    'text-transform': 'uppercase' as const,
    'letter-spacing': '0.05em',
    padding: '1rem 1.5rem',
    'border-bottom': '1px solid var(--border-color, #e5e7eb)',
    margin: '0',
  };

  const tableStyle = {
    width: '100%',
    'border-collapse': 'collapse' as const,
  };

  const tableHeaderStyle = {
    background: 'var(--bg-secondary, #f9fafb)',
    'font-size': '0.75rem',
    'font-weight': '600',
    color: 'var(--text-muted, #6b7280)',
    'text-transform': 'uppercase' as const,
    'letter-spacing': '0.05em',
  };

  const tableHeaderCellStyle = {
    padding: '0.75rem 1rem',
    'text-align': 'left' as const,
    'border-bottom': '1px solid var(--border-color, #e5e7eb)',
  };

  const tableRowStyle = (index: number) => ({
    background: index % 2 === 0 ? 'white' : 'var(--bg-secondary, #f9fafb)',
  });

  const tableCellStyle = {
    padding: '1rem',
    'border-bottom': '1px solid var(--border-color, #e5e7eb)',
    'vertical-align': 'top' as const,
  };

  const statusCellStyle = {
    ...tableCellStyle,
    width: '140px',
  };

  const actionsCellStyle = {
    ...tableCellStyle,
    'white-space': 'nowrap' as const,
  };

  const fieldPathStyle = {
    'font-family': 'monospace',
    'font-size': '0.875rem',
    color: 'var(--text-primary, #1e293b)',
  };

  const transformStyle = {
    display: 'inline-flex',
    'align-items': 'center',
    gap: '0.25rem',
    padding: '0.25rem 0.5rem',
    background: 'rgba(139, 92, 246, 0.1)',
    color: '#8b5cf6',
    'border-radius': '0.25rem',
    'font-size': '0.75rem',
    'font-weight': '500',
  };

  const lowConfidenceStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    gap: '0.25rem',
    'font-size': '0.75rem',
    color: '#f59e0b',
    'margin-top': '0.5rem',
  };

  const rowActionsStyle = {
    display: 'flex',
    gap: '0.5rem',
    'margin-top': '0.5rem',
  };

  const smallButtonStyle = {
    padding: '0.25rem 0.5rem',
    'font-size': '0.75rem',
    'font-weight': '500',
    'border-radius': '0.25rem',
    border: '1px solid var(--border-color, #e5e7eb)',
    background: 'white',
    color: 'var(--text-primary, #374151)',
    cursor: 'pointer',
  };

  const editPanelStyle = {
    background: 'var(--bg-secondary, #f9fafb)',
    border: '1px solid var(--border-color, #e5e7eb)',
    'border-radius': '0.5rem',
    margin: '1.5rem',
    padding: '1.5rem',
  };

  const editPanelTitleStyle = {
    'font-size': '1rem',
    'font-weight': '600',
    color: 'var(--text-primary, #1e293b)',
    'margin-bottom': '1.25rem',
  };

  const formGroupStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    gap: '0.5rem',
    'margin-bottom': '1rem',
  };

  const labelStyle = {
    'font-size': '0.875rem',
    'font-weight': '500',
    color: 'var(--text-primary, #374151)',
  };

  const inputStyle = {
    padding: '0.625rem 0.875rem',
    border: '1px solid var(--border-color, #e5e7eb)',
    'border-radius': '0.375rem',
    'font-size': '0.875rem',
    background: 'white',
    width: '100%',
    'box-sizing': 'border-box' as const,
  };

  const selectStyle = {
    ...inputStyle,
    cursor: 'pointer',
  };

  const confidenceBarContainerStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '1rem',
    'margin-bottom': '1.5rem',
  };

  const confidenceBarStyle = {
    flex: '1',
    height: '12px',
    background: 'rgba(0, 0, 0, 0.1)',
    'border-radius': '6px',
    overflow: 'hidden',
  };

  const confidenceBarFillStyle = (confidence: number) => ({
    width: `${confidence}%`,
    height: '100%',
    background: confidence >= 80 ? '#10b981' : confidence >= 60 ? '#f59e0b' : '#ef4444',
    'border-radius': '6px',
    transition: 'width 0.3s ease',
  });

  const testCasesSectionStyle = {
    'margin-top': '1.5rem',
    'padding-top': '1.5rem',
    'border-top': '1px solid var(--border-color, #e5e7eb)',
  };

  const testCasesTitleStyle = {
    'font-size': '0.875rem',
    'font-weight': '600',
    color: 'var(--text-primary, #1e293b)',
    'margin-bottom': '0.75rem',
  };

  const testCaseRowStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '1rem',
    padding: '0.5rem 0',
    'font-size': '0.875rem',
    'font-family': 'monospace',
  };

  const testCaseSuccessStyle = {
    color: '#10b981',
    'font-weight': '600',
  };

  const editPanelActionsStyle = {
    display: 'flex',
    'justify-content': 'flex-end',
    gap: '0.75rem',
    'margin-top': '1.5rem',
    'padding-top': '1.5rem',
    'border-top': '1px solid var(--border-color, #e5e7eb)',
  };

  const historyPanelStyle = {
    background: 'rgba(139, 92, 246, 0.05)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    'border-radius': '0.375rem',
    padding: '0.75rem',
    'margin-top': '0.5rem',
    'font-size': '0.75rem',
  };

  const historyItemStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    padding: '0.375rem 0',
    'border-bottom': '1px solid rgba(139, 92, 246, 0.1)',
  };

  return (
    <div style={pageStyle}>
      {/* Back Link */}
      <A href="/supervision/adapters" style={backLinkStyle}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Back to Adapters
      </A>

      {/* Loading State */}
      <Show when={supervisionStore.isLoading()}>
        <div style={{ 'text-align': 'center', padding: '4rem' }}>
          <p>Loading adapter details...</p>
        </div>
      </Show>

      {/* Error State */}
      <Show when={supervisionStore.error()}>
        <div
          style={{
            padding: '1rem',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid #ef4444',
            'border-radius': '0.5rem',
            color: '#ef4444',
            'margin-bottom': '1rem',
          }}
        >
          {supervisionStore.error()}
        </div>
      </Show>

      {/* Adapter Details */}
      <Show when={adapter()}>
        {(currentAdapter) => (
          <>
            {/* Adapter Header Card */}
            <div style={cardStyle}>
              <div style={cardHeaderStyle}>
                <h1 style={adapterTitleStyle}>{currentAdapter().displayName}</h1>
                <div style={headerButtonsStyle}>
                  <button style={primaryButtonStyle} onClick={handleTestAdapter}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    Test
                  </button>
                  <button style={lockButtonStyle} onClick={handleLockAdapter}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    Lock
                  </button>
                </div>
              </div>
              <div style={statsRowStyle}>
                <span>Last used: {formatDate(currentAdapter()?.timestamps?.lastProcessedAt)}</span>
                <span>|</span>
                <span>Success: {getSuccessRateString(currentAdapter())}</span>
              </div>
            </div>

            {/* Field Mappings Table */}
            <div style={cardStyle}>
              <h2 style={sectionTitleStyle}>FIELD MAPPINGS</h2>
              <table style={tableStyle}>
                <thead style={tableHeaderStyle}>
                  <tr>
                    <th style={tableHeaderCellStyle}>Source Field</th>
                    <th style={tableHeaderCellStyle}>Transform</th>
                    <th style={tableHeaderCellStyle}>Target Field</th>
                    <th style={{ ...tableHeaderCellStyle, width: '140px' }}>Status</th>
                    <th style={{ ...tableHeaderCellStyle, width: '200px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={fieldMappings()}>
                    {(mapping, index) => (
                      <>
                        <tr style={tableRowStyle(index())}>
                          <td style={tableCellStyle}>
                            <span style={fieldPathStyle}>{mapping?.sourcePath}</span>
                          </td>
                          <td style={tableCellStyle}>
                            <Show when={mapping.transform !== 'none'} fallback={<span style={{ color: '#9ca3af' }}>-</span>}>
                              <span style={transformStyle}>
                                {getTransformLabel(mapping?.transform)}
                              </span>
                            </Show>
                          </td>
                          <td style={tableCellStyle}>
                            <span style={fieldPathStyle}>{mapping?.targetPath}</span>
                          </td>
                          <td style={statusCellStyle}>
                            <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.5rem' }}>
                              <Show when={mapping?.lock?.status !== LockStatus.UNLOCKED}>
                                <LockStatusBadge status={mapping?.lock?.status} size="sm" />
                              </Show>
                              <Show when={mapping?.source === MappingSource.AI_GENERATED}>
                                <SourceBadge source={mapping?.source} />
                              </Show>
                              <Show when={isLowConfidence(mapping)}>
                                <div style={lowConfidenceStyle}>
                                  <span>Confidence: {Math.round(mapping?.confidence * 100)}%</span>
                                  <span style={{ 'font-style': 'italic' }}>(needs review)</span>
                                </div>
                              </Show>
                            </div>
                          </td>
                          <td style={actionsCellStyle}>
                            <div style={rowActionsStyle}>
                              <button
                                style={smallButtonStyle}
                                onClick={() => handleEditMapping(mapping)}
                              >
                                Edit
                              </button>
                              <Show
                                when={mapping?.lock?.status === LockStatus.UNLOCKED}
                                fallback={
                                  <button
                                    style={smallButtonStyle}
                                    onClick={() => handleUnlockMapping(mapping.id)}
                                  >
                                    Unlock
                                  </button>
                                }
                              >
                                <button
                                  style={smallButtonStyle}
                                  onClick={() => handleLockMapping(mapping.id)}
                                >
                                  Lock
                                </button>
                              </Show>
                              <button
                                style={smallButtonStyle}
                                onClick={() => handleShowHistory(mapping.id)}
                              >
                                History
                              </button>
                            </div>
                            {/* History Panel */}
                            <Show when={showHistory() === mapping.id}>
                              <div style={historyPanelStyle}>
                                <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem' }}>
                                  Version History
                                </div>
                                <Show
                                  when={mapping.previousVersions.length > 0}
                                  fallback={<div style={{ color: '#6b7280' }}>No previous versions</div>}
                                >
                                  <For each={mapping.previousVersions.slice(0, 5)}>
                                    {(version) => (
                                      <div style={historyItemStyle}>
                                        <span>v{version.version}</span>
                                        <span>{version.changeDescription}</span>
                                        <span>{new Date(version.timestamp).toLocaleDateString()}</span>
                                      </div>
                                    )}
                                  </For>
                                </Show>
                              </div>
                            </Show>
                          </td>
                        </tr>
                      </>
                    )}
                  </For>
                </tbody>
              </table>

              {/* Empty State */}
              <Show when={fieldMappings().length === 0 && !supervisionStore.isLoading()}>
                <div style={{ 'text-align': 'center', padding: '3rem', color: '#6b7280' }}>
                  <p>No field mappings configured for this adapter.</p>
                </div>
              </Show>

              {/* Edit Mapping Panel */}
              <Show when={editingMapping()}>
                {(mapping) => (
                  <div style={editPanelStyle}>
                    <div style={editPanelTitleStyle}>
                      EDIT MAPPING: {mapping().sourcePath} {'->'} {mapping().targetPath}
                    </div>

                    <div style={{ display: 'grid', 'grid-template-columns': 'repeat(3, 1fr)', gap: '1rem' }}>
                      <div style={formGroupStyle}>
                        <label style={labelStyle}>Source Path:</label>
                        <input
                          type="text"
                          style={inputStyle}
                          value={editForm().sourcePath}
                          onInput={(e) => setEditForm({ ...editForm(), sourcePath: e.currentTarget.value })}
                        />
                      </div>
                      <div style={formGroupStyle}>
                        <label style={labelStyle}>Transform:</label>
                        <select
                          style={selectStyle}
                          value={editForm().transform}
                          onChange={(e) => setEditForm({ ...editForm(), transform: e.currentTarget.value as FieldTransform })}
                        >
                          <For each={TRANSFORM_OPTIONS}>
                            {(option) => (
                              <option value={option.value}>{option.label}</option>
                            )}
                          </For>
                        </select>
                      </div>
                      <div style={formGroupStyle}>
                        <label style={labelStyle}>Target Field:</label>
                        <input
                          type="text"
                          style={inputStyle}
                          value={editForm().targetPath}
                          onInput={(e) => setEditForm({ ...editForm(), targetPath: e.currentTarget.value })}
                        />
                      </div>
                    </div>

                    <div style={formGroupStyle}>
                      <label style={labelStyle}>Confidence:</label>
                      <div style={confidenceBarContainerStyle}>
                        <div style={confidenceBarStyle}>
                          <div style={confidenceBarFillStyle(editForm().confidence)} />
                        </div>
                        <span style={{ 'font-weight': '600', 'min-width': '50px' }}>
                          {Math.round(editForm().confidence)}%
                        </span>
                      </div>
                    </div>

                    {/* Test Cases Section */}
                    <div style={testCasesSectionStyle}>
                      <div style={testCasesTitleStyle}>Test Cases:</div>
                      <For each={testResults()}>
                        {(testCase) => (
                          <div style={testCaseRowStyle}>
                            <span>Input: {JSON.stringify(testCase.input)}</span>
                            <span>-{'>'}</span>
                            <span>Output: {JSON.stringify(testCase.output)}</span>
                            <span style={testCaseSuccessStyle}>
                              {testCase.success ? '(passed)' : '(failed)'}
                            </span>
                          </div>
                        )}
                      </For>
                    </div>

                    {/* Action Buttons */}
                    <div style={editPanelActionsStyle}>
                      <button style={secondaryButtonStyle} onClick={handleCancelEdit}>
                        Cancel
                      </button>
                      <button style={primaryButtonStyle} onClick={handleSaveMapping}>
                        Save Mapping
                      </button>
                    </div>
                  </div>
                )}
              </Show>
            </div>
          </>
        )}
      </Show>
    </div>
  );
};

export default AdapterDetailPage;
