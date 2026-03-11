/**
 * BatchExportView
 * Multi-client Drake export component with validation, progress tracking,
 * and export history. SolidJS + TypeScript with inline styles.
 */

import { Component, createSignal, createMemo, Show, For, JSX, onMount } from 'solid-js';
import type {
  TaxPortal,
  TaxYear,
  TaxWorkflowStatus,
  DrakeTaxDocument,
} from '../types/drakeTypes';
import { TAX_WORKFLOW_STATUS_LABELS, TAX_WORKFLOW_STATUS_COLORS } from '../types/drakeTypes';
import {
  type EnhancedExportFormat,
  type BatchExportConfig,
  type BatchExportProgress,
  type BatchValidationResult,
  type ClientValidationResult,
  type BatchExportClientResult,
  type ExportHistoryEntry,
  validateBatchExport,
  executeBatchExport,
  downloadClientResult,
  downloadBlob,
  downloadTextFile,
  saveExportHistory,
  getExportHistory,
  clearExportHistory,
  createHistoryEntry,
} from '../services/drakeExportEnhanced';

// ============================================
// Props
// ============================================

interface BatchExportViewProps {
  clients: TaxPortal[];
  getDocumentsForClient: (clientId: string) => DrakeTaxDocument[];
  onExportComplete?: (results: BatchExportClientResult[]) => void;
}

// ============================================
// Constants
// ============================================

const TAX_YEARS: TaxYear[] = [2023, 2024, 2025, 2026];

/** Workflow statuses that indicate a client is ready for export */
const EXPORT_READY_STATUSES: TaxWorkflowStatus[] = [
  'docs_complete',
  'ready_to_file',
  'in_review',
  'filed',
  'accepted',
  'completed',
];

// ============================================
// Component
// ============================================

const BatchExportView: Component<BatchExportViewProps> = (props) => {
  // Selection state
  const [selectedIds, setSelectedIds] = createSignal<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = createSignal<TaxWorkflowStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = createSignal('');

  // Config state
  const [exportFormat, setExportFormat] = createSignal<EnhancedExportFormat>('csv');
  const [taxYear, setTaxYear] = createSignal<TaxYear>(2024);
  const [includeUnverified, setIncludeUnverified] = createSignal(false);
  const [includeStateReturns, setIncludeStateReturns] = createSignal(true);

  // Validation state
  const [validationResult, setValidationResult] = createSignal<BatchValidationResult | null>(null);
  const [isValidating, setIsValidating] = createSignal(false);

  // Export state
  const [isExporting, setIsExporting] = createSignal(false);
  const [exportProgress, setExportProgress] = createSignal<BatchExportProgress>({
    current: 0, total: 0, currentClientName: '', status: 'idle', message: '',
  });
  const [exportResults, setExportResults] = createSignal<BatchExportClientResult[]>([]);
  const [exportZipBlob, setExportZipBlob] = createSignal<Blob | null>(null);
  const [exportZipName, setExportZipName] = createSignal<string>('');
  const [exportComplete, setExportComplete] = createSignal(false);

  // History state
  const [exportHistory, setExportHistory] = createSignal<ExportHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = createSignal(false);

  // Load export history on mount
  onMount(() => {
    setExportHistory(getExportHistory());
  });

  // ============================================
  // Computed values
  // ============================================

  /** Clients filtered by workflow status and search term */
  const filteredClients = createMemo(() => {
    let result = props.clients;

    const status = statusFilter();
    if (status !== 'all') {
      result = result.filter(c => c.workflowStatus === status);
    }

    const term = searchTerm().toLowerCase().trim();
    if (term) {
      result = result.filter(c =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(term) ||
        (c.email && c.email.toLowerCase().includes(term)) ||
        c.id.toLowerCase().includes(term)
      );
    }

    return result;
  });

  /** Number of currently selected clients */
  const selectedCount = createMemo(() => selectedIds().size);

  /** Selected clients from the full list */
  const selectedClients = createMemo(() => {
    const ids = selectedIds();
    return props.clients.filter(c => ids.has(c.id));
  });

  /** Whether all visible clients are selected */
  const allVisibleSelected = createMemo(() => {
    const visible = filteredClients();
    if (visible.length === 0) return false;
    const ids = selectedIds();
    return visible.every(c => ids.has(c.id));
  });

  /** Progress percentage */
  const progressPercent = createMemo(() => {
    const p = exportProgress();
    if (p.total === 0) return 0;
    return Math.round((p.current / p.total) * 100);
  });

  // ============================================
  // Handlers
  // ============================================

  const toggleClient = (clientId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return next;
    });
    // Clear validation when selection changes
    setValidationResult(null);
    setExportComplete(false);
  };

  const selectAll = () => {
    const visible = filteredClients();
    setSelectedIds(prev => {
      const next = new Set(prev);
      for (const c of visible) {
        next.add(c.id);
      }
      return next;
    });
    setValidationResult(null);
    setExportComplete(false);
  };

  const deselectAll = () => {
    const visible = filteredClients();
    setSelectedIds(prev => {
      const next = new Set(prev);
      for (const c of visible) {
        next.delete(c.id);
      }
      return next;
    });
    setValidationResult(null);
    setExportComplete(false);
  };

  const handleValidate = () => {
    setIsValidating(true);
    setExportComplete(false);
    try {
      const clients = selectedClients();
      const result = validateBatchExport(clients, props.getDocumentsForClient);
      setValidationResult(result);
    } finally {
      setIsValidating(false);
    }
  };

  const handleExport = async () => {
    const clients = selectedClients();
    if (clients.length === 0) return;

    setIsExporting(true);
    setExportComplete(false);
    setExportResults([]);
    setExportZipBlob(null);
    setExportZipName('');

    const config: BatchExportConfig = {
      clientIds: clients.map(c => c.id),
      taxYear: taxYear(),
      outputFormat: exportFormat(),
      includeHeaders: true,
      includeUnverifiedDocuments: includeUnverified(),
      includeStateReturns: includeStateReturns(),
    };

    try {
      const result = await executeBatchExport(
        clients,
        props.getDocumentsForClient,
        config,
        (progress) => setExportProgress(progress)
      );

      setExportResults(result.clientResults);

      if (result.zipBlob) {
        setExportZipBlob(result.zipBlob);
        setExportZipName(result.zipFileName || 'drake_batch_export.zip');
      }

      // Save history for each successful export
      for (const clientResult of result.clientResults) {
        if (clientResult.success) {
          const entry = createHistoryEntry(clientResult, config, true, clients.length);
          saveExportHistory(entry);
        }
      }
      setExportHistory(getExportHistory());

      setExportComplete(true);

      if (props.onExportComplete) {
        props.onExportComplete(result.clientResults);
      }
    } catch (err) {
      setExportProgress({
        current: 0, total: 0, currentClientName: '',
        status: 'error',
        message: err instanceof Error ? err.message : 'Export failed',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadZip = () => {
    const blob = exportZipBlob();
    const name = exportZipName();
    if (blob && name) {
      downloadBlob(blob, name);
    }
  };

  const handleDownloadIndividual = (result: BatchExportClientResult) => {
    downloadClientResult(result);
  };

  const handleClearHistory = () => {
    clearExportHistory();
    setExportHistory([]);
  };

  // ============================================
  // Format helpers
  // ============================================

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD',
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  };

  const getStatusColor = (status: TaxWorkflowStatus | undefined): string => {
    if (!status) return '#6b7280';
    return TAX_WORKFLOW_STATUS_COLORS[status] || '#6b7280';
  };

  const getStatusLabel = (status: TaxWorkflowStatus | undefined): string => {
    if (!status) return 'Unknown';
    return TAX_WORKFLOW_STATUS_LABELS[status] || status;
  };

  const getValidationStatusIcon = (status: 'pass' | 'warning' | 'error'): string => {
    if (status === 'pass') return '✓';
    if (status === 'warning') return '!';
    return '✗';
  };

  const getValidationStatusColor = (status: 'pass' | 'warning' | 'error'): string => {
    if (status === 'pass') return '#22c55e';
    if (status === 'warning') return '#f59e0b';
    return '#ef4444';
  };

  // ============================================
  // Styles
  // ============================================

  const containerStyle: JSX.CSSProperties = {
    display: 'flex',
    'flex-direction': 'column',
    gap: '1.5rem',
  };

  const sectionCardStyle: JSX.CSSProperties = {
    background: 'var(--surface-color, #ffffff)',
    'border-radius': 'var(--border-radius, 8px)',
    border: '1px solid var(--border-color, #e5e7eb)',
    overflow: 'hidden',
  };

  const sectionHeaderStyle: JSX.CSSProperties = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '1rem 1.5rem',
    background: 'var(--surface-secondary, #f9fafb)',
    'border-bottom': '1px solid var(--border-color, #e5e7eb)',
  };

  const sectionTitleStyle: JSX.CSSProperties = {
    'font-weight': '600',
    'font-size': '1rem',
    color: 'var(--text-primary, #1f2937)',
  };

  const sectionBodyStyle: JSX.CSSProperties = {
    padding: '1.5rem',
  };

  const toolbarStyle: JSX.CSSProperties = {
    display: 'flex',
    'flex-wrap': 'wrap',
    gap: '0.75rem',
    'align-items': 'center',
    'margin-bottom': '1rem',
  };

  const searchInputStyle: JSX.CSSProperties = {
    flex: '1',
    'min-width': '200px',
    padding: '0.625rem 0.875rem',
    border: '2px solid var(--border-color, #e5e7eb)',
    'border-radius': 'var(--border-radius, 8px)',
    'font-size': '0.875rem',
    'font-family': 'inherit',
    outline: 'none',
  };

  const selectStyle: JSX.CSSProperties = {
    padding: '0.625rem 0.875rem',
    border: '2px solid var(--border-color, #e5e7eb)',
    'border-radius': 'var(--border-radius, 8px)',
    'font-size': '0.875rem',
    'font-family': 'inherit',
    background: 'white',
    cursor: 'pointer',
  };

  const smallButtonStyle = (variant: 'primary' | 'secondary' | 'danger' | 'ghost' = 'secondary'): JSX.CSSProperties => {
    const colors = {
      primary: { bg: 'var(--primary-color, #3b82f6)', text: '#ffffff', border: 'transparent' },
      secondary: { bg: 'var(--surface-color, #ffffff)', text: 'var(--text-primary, #374151)', border: 'var(--border-color, #e5e7eb)' },
      danger: { bg: '#ef4444', text: '#ffffff', border: 'transparent' },
      ghost: { bg: 'transparent', text: 'var(--text-secondary, #6b7280)', border: 'transparent' },
    };
    const c = colors[variant];
    return {
      display: 'inline-flex',
      'align-items': 'center',
      gap: '0.375rem',
      padding: '0.5rem 0.875rem',
      'border-radius': 'var(--border-radius, 6px)',
      background: c.bg,
      color: c.text,
      border: `1px solid ${c.border}`,
      'font-size': '0.8125rem',
      'font-weight': '500',
      cursor: 'pointer',
      'white-space': 'nowrap',
      'font-family': 'inherit',
    };
  };

  const bigButtonStyle = (disabled: boolean, variant: 'primary' | 'success' = 'primary'): JSX.CSSProperties => {
    const bgColor = disabled
      ? 'var(--disabled-bg, #e5e7eb)'
      : variant === 'success'
        ? '#22c55e'
        : 'var(--primary-color, #3b82f6)';
    return {
      display: 'inline-flex',
      'align-items': 'center',
      gap: '0.5rem',
      padding: '0.75rem 1.5rem',
      'border-radius': 'var(--border-radius, 8px)',
      background: bgColor,
      color: disabled ? 'var(--disabled-text, #9ca3af)' : '#ffffff',
      border: 'none',
      'font-size': '0.9375rem',
      'font-weight': '600',
      cursor: disabled ? 'not-allowed' : 'pointer',
      'font-family': 'inherit',
    };
  };

  const clientRowStyle = (isSelected: boolean): JSX.CSSProperties => ({
    display: 'flex',
    'align-items': 'center',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    background: isSelected ? 'var(--primary-light, #eff6ff)' : 'transparent',
    'border-bottom': '1px solid var(--border-color, #f3f4f6)',
    cursor: 'pointer',
    transition: 'background 0.15s ease',
  });

  const checkboxStyle: JSX.CSSProperties = {
    width: '1.125rem',
    height: '1.125rem',
    cursor: 'pointer',
    'accent-color': 'var(--primary-color, #3b82f6)',
    'flex-shrink': '0',
  };

  const badgeStyle = (color: string): JSX.CSSProperties => ({
    display: 'inline-flex',
    'align-items': 'center',
    padding: '0.125rem 0.5rem',
    'border-radius': '9999px',
    'font-size': '0.6875rem',
    'font-weight': '500',
    background: `${color}20`,
    color,
    'white-space': 'nowrap',
  });

  const countBadgeStyle: JSX.CSSProperties = {
    display: 'inline-flex',
    'align-items': 'center',
    'justify-content': 'center',
    padding: '0.25rem 0.625rem',
    'border-radius': '9999px',
    'font-size': '0.75rem',
    'font-weight': '600',
    background: 'var(--primary-color, #3b82f6)',
    color: '#ffffff',
    'min-width': '1.5rem',
  };

  const configRowStyle: JSX.CSSProperties = {
    display: 'flex',
    'flex-wrap': 'wrap',
    gap: '1rem',
    'align-items': 'center',
  };

  const toggleContainerStyle: JSX.CSSProperties = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    'font-size': '0.875rem',
    color: 'var(--text-primary, #374151)',
  };

  const progressBarContainerStyle: JSX.CSSProperties = {
    width: '100%',
    height: '0.5rem',
    background: 'var(--border-color, #e5e7eb)',
    'border-radius': '9999px',
    overflow: 'hidden',
    'margin-bottom': '0.5rem',
  };

  const progressBarFillStyle = (percent: number): JSX.CSSProperties => ({
    width: `${percent}%`,
    height: '100%',
    background: 'var(--primary-color, #3b82f6)',
    'border-radius': '9999px',
    transition: 'width 0.3s ease',
  });

  const summaryStatStyle: JSX.CSSProperties = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    padding: '0.75rem 1rem',
    'border-radius': 'var(--border-radius, 8px)',
    background: 'var(--surface-secondary, #f9fafb)',
    'font-size': '0.875rem',
    'font-weight': '500',
  };

  const resultRowStyle = (success: boolean): JSX.CSSProperties => ({
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'space-between',
    padding: '0.625rem 1rem',
    background: success ? 'var(--success-light, #f0fdf4)' : 'var(--danger-light, #fef2f2)',
    'border-radius': 'var(--border-radius, 6px)',
    'margin-bottom': '0.5rem',
    'font-size': '0.875rem',
  });

  const historyRowStyle: JSX.CSSProperties = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '0.625rem 0',
    'border-bottom': '1px solid var(--border-color, #f3f4f6)',
    'font-size': '0.8125rem',
    color: 'var(--text-primary, #374151)',
  };

  const clientListContainerStyle: JSX.CSSProperties = {
    'max-height': '400px',
    'overflow-y': 'auto',
    border: '1px solid var(--border-color, #e5e7eb)',
    'border-radius': 'var(--border-radius, 8px)',
  };

  const emptyStateStyle: JSX.CSSProperties = {
    display: 'flex',
    'flex-direction': 'column',
    'align-items': 'center',
    'justify-content': 'center',
    padding: '3rem 2rem',
    color: 'var(--text-secondary, #6b7280)',
    'text-align': 'center',
    gap: '0.5rem',
  };

  const validationSummaryStyle: JSX.CSSProperties = {
    display: 'flex',
    gap: '1rem',
    'flex-wrap': 'wrap',
    'margin-bottom': '1rem',
  };

  const alertStyle = (variant: 'success' | 'warning' | 'error' | 'info'): JSX.CSSProperties => {
    const colors = {
      success: { bg: '#f0fdf4', border: '#86efac', text: '#166534' },
      warning: { bg: '#fffbeb', border: '#fcd34d', text: '#92400e' },
      error: { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b' },
      info: { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af' },
    };
    const c = colors[variant];
    return {
      display: 'flex',
      'align-items': 'center',
      gap: '0.75rem',
      padding: '0.875rem 1.25rem',
      'border-radius': 'var(--border-radius, 8px)',
      background: c.bg,
      border: `1px solid ${c.border}`,
      color: c.text,
      'font-size': '0.875rem',
    };
  };

  // ============================================
  // Render
  // ============================================

  return (
    <div style={containerStyle}>

      {/* ---- Client Selection ---- */}
      <div style={sectionCardStyle}>
        <div style={sectionHeaderStyle}>
          <div style={{ display: 'flex', 'align-items': 'center', gap: '0.75rem' }}>
            <span style={sectionTitleStyle}>Select Clients for Export</span>
            <Show when={selectedCount() > 0}>
              <span style={countBadgeStyle}>{selectedCount()} selected</span>
            </Show>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button style={smallButtonStyle('secondary')} onClick={selectAll}>Select All</button>
            <button style={smallButtonStyle('ghost')} onClick={deselectAll}>Deselect All</button>
          </div>
        </div>

        <div style={sectionBodyStyle}>
          {/* Toolbar: search + status filter */}
          <div style={toolbarStyle}>
            <input
              type="text"
              placeholder="Search clients by name or email..."
              style={searchInputStyle}
              value={searchTerm()}
              onInput={(e) => setSearchTerm(e.currentTarget.value)}
            />
            <select
              style={selectStyle}
              value={statusFilter()}
              onChange={(e) => setStatusFilter(e.currentTarget.value as TaxWorkflowStatus | 'all')}
            >
              <option value="all">All Statuses</option>
              <option value="docs_complete">Documents Complete</option>
              <option value="ready_to_file">Ready to File</option>
              <option value="in_review">In Review</option>
              <option value="filed">Filed</option>
              <option value="accepted">Accepted</option>
              <option value="completed">Completed</option>
              <option value="collecting_docs">Collecting Docs</option>
              <option value="intake">Intake</option>
            </select>
          </div>

          {/* Client list */}
          <Show
            when={filteredClients().length > 0}
            fallback={
              <div style={emptyStateStyle}>
                <span style={{ 'font-size': '2rem', opacity: '0.4' }}>--</span>
                <span>No clients match the current filters.</span>
              </div>
            }
          >
            <div style={clientListContainerStyle}>
              <For each={filteredClients()}>
                {(client) => {
                  const isSelected = () => selectedIds().has(client.id);
                  return (
                    <div
                      style={clientRowStyle(isSelected())}
                      onClick={() => toggleClient(client.id)}
                    >
                      <input
                        type="checkbox"
                        style={checkboxStyle}
                        checked={isSelected()}
                        onChange={() => toggleClient(client.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div style={{ flex: '1', 'min-width': '0' }}>
                        <div style={{ 'font-weight': '500', 'font-size': '0.9375rem', color: 'var(--text-primary, #1f2937)' }}>
                          {client.firstName} {client.lastName}
                        </div>
                        <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary, #6b7280)', 'margin-top': '0.125rem' }}>
                          {client.email || 'No email'}{' '}
                          <Show when={client.documentCount !== undefined}>
                            &middot; {client.documentCount} doc(s)
                          </Show>
                        </div>
                      </div>
                      <Show when={client.workflowStatus}>
                        <span style={badgeStyle(getStatusColor(client.workflowStatus))}>
                          {getStatusLabel(client.workflowStatus)}
                        </span>
                      </Show>
                    </div>
                  );
                }}
              </For>
            </div>
          </Show>

          <div style={{ 'margin-top': '0.75rem', 'font-size': '0.8125rem', color: 'var(--text-secondary, #6b7280)' }}>
            Showing {filteredClients().length} of {props.clients.length} clients
          </div>
        </div>
      </div>

      {/* ---- Export Configuration ---- */}
      <div style={sectionCardStyle}>
        <div style={sectionHeaderStyle}>
          <span style={sectionTitleStyle}>Export Configuration</span>
        </div>
        <div style={sectionBodyStyle}>
          <div style={configRowStyle}>
            {/* Format selector */}
            <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.375rem' }}>
              <label style={{ 'font-size': '0.8125rem', 'font-weight': '500', color: 'var(--text-secondary, #6b7280)' }}>
                Export Format
              </label>
              <select
                style={selectStyle}
                value={exportFormat()}
                onChange={(e) => setExportFormat(e.currentTarget.value as EnhancedExportFormat)}
              >
                <option value="csv">CSV Only</option>
                <option value="xml">XML Only</option>
                <option value="both">CSV + XML</option>
              </select>
            </div>

            {/* Tax year */}
            <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.375rem' }}>
              <label style={{ 'font-size': '0.8125rem', 'font-weight': '500', color: 'var(--text-secondary, #6b7280)' }}>
                Tax Year
              </label>
              <select
                style={selectStyle}
                value={taxYear()}
                onChange={(e) => setTaxYear(parseInt(e.currentTarget.value) as TaxYear)}
              >
                <For each={TAX_YEARS}>
                  {(year) => <option value={year}>{year}</option>}
                </For>
              </select>
            </div>

            {/* Include unverified toggle */}
            <div style={toggleContainerStyle}>
              <input
                type="checkbox"
                id="batch-include-unverified"
                checked={includeUnverified()}
                onChange={(e) => setIncludeUnverified(e.currentTarget.checked)}
                style={{ ...checkboxStyle, width: '1rem', height: '1rem' }}
              />
              <label for="batch-include-unverified">Include unverified documents</label>
            </div>

            {/* Include state returns toggle */}
            <div style={toggleContainerStyle}>
              <input
                type="checkbox"
                id="batch-include-state"
                checked={includeStateReturns()}
                onChange={(e) => setIncludeStateReturns(e.currentTarget.checked)}
                style={{ ...checkboxStyle, width: '1rem', height: '1rem' }}
              />
              <label for="batch-include-state">Include state returns</label>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Validation Section ---- */}
      <div style={sectionCardStyle}>
        <div style={sectionHeaderStyle}>
          <span style={sectionTitleStyle}>Validation & Export</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              style={bigButtonStyle(selectedCount() === 0 || isValidating(), 'primary')}
              onClick={handleValidate}
              disabled={selectedCount() === 0 || isValidating()}
            >
              <Show when={isValidating()} fallback={<>Run Validation</>}>
                Validating...
              </Show>
            </button>
            <button
              style={bigButtonStyle(selectedCount() === 0 || isExporting(), 'success')}
              onClick={handleExport}
              disabled={selectedCount() === 0 || isExporting()}
            >
              <Show when={isExporting()} fallback={<>Export All ({selectedCount()})</>}>
                Exporting...
              </Show>
            </button>
          </div>
        </div>

        <div style={sectionBodyStyle}>
          {/* No clients selected message */}
          <Show when={selectedCount() === 0}>
            <div style={emptyStateStyle}>
              <span style={{ 'font-size': '1.5rem', opacity: '0.4' }}>--</span>
              <span>Select one or more clients above to validate and export.</span>
            </div>
          </Show>

          {/* Validation results */}
          <Show when={validationResult()}>
            {(vResult) => (
              <div>
                {/* Summary cards */}
                <div style={validationSummaryStyle}>
                  <div style={{ ...summaryStatStyle, color: '#22c55e' }}>
                    <span style={{ 'font-size': '1.25rem', 'font-weight': '700' }}>{vResult().passCount}</span>
                    <span>Passed</span>
                  </div>
                  <div style={{ ...summaryStatStyle, color: '#f59e0b' }}>
                    <span style={{ 'font-size': '1.25rem', 'font-weight': '700' }}>{vResult().warningCount}</span>
                    <span>Warnings</span>
                  </div>
                  <div style={{ ...summaryStatStyle, color: '#ef4444' }}>
                    <span style={{ 'font-size': '1.25rem', 'font-weight': '700' }}>{vResult().errorCount}</span>
                    <span>Errors</span>
                  </div>
                </div>

                {/* Per-client validation details */}
                <div style={{ 'max-height': '300px', 'overflow-y': 'auto' }}>
                  <For each={vResult().clientResults}>
                    {(cr: ClientValidationResult) => (
                      <div style={{
                        display: 'flex',
                        'align-items': 'flex-start',
                        gap: '0.75rem',
                        padding: '0.75rem 0',
                        'border-bottom': '1px solid var(--border-color, #f3f4f6)',
                      }}>
                        <span style={{
                          display: 'flex',
                          'align-items': 'center',
                          'justify-content': 'center',
                          width: '1.5rem',
                          height: '1.5rem',
                          'border-radius': '9999px',
                          background: `${getValidationStatusColor(cr.status)}20`,
                          color: getValidationStatusColor(cr.status),
                          'font-size': '0.75rem',
                          'font-weight': '700',
                          'flex-shrink': '0',
                          'margin-top': '0.125rem',
                        }}>
                          {getValidationStatusIcon(cr.status)}
                        </span>
                        <div style={{ flex: '1', 'min-width': '0' }}>
                          <div style={{ 'font-weight': '500', 'font-size': '0.875rem', color: 'var(--text-primary, #1f2937)' }}>
                            {cr.clientName}
                          </div>
                          <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary, #6b7280)', 'margin-top': '0.125rem' }}>
                            {cr.verifiedCount}/{cr.documentCount} docs verified
                            &middot; Income: {formatCurrency(cr.totalIncome)}
                            &middot; Withholding: {formatCurrency(cr.totalWithholding)}
                          </div>
                          <Show when={cr.errors.length > 0}>
                            <div style={{ 'margin-top': '0.375rem' }}>
                              <For each={cr.errors}>
                                {(err) => (
                                  <div style={{ 'font-size': '0.75rem', color: '#ef4444', 'margin-top': '0.125rem' }}>
                                    Error: {err}
                                  </div>
                                )}
                              </For>
                            </div>
                          </Show>
                          <Show when={cr.warnings.length > 0}>
                            <div style={{ 'margin-top': '0.25rem' }}>
                              <For each={cr.warnings}>
                                {(warn) => (
                                  <div style={{ 'font-size': '0.75rem', color: '#f59e0b', 'margin-top': '0.125rem' }}>
                                    Warning: {warn}
                                  </div>
                                )}
                              </For>
                            </div>
                          </Show>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            )}
          </Show>

          {/* Export progress */}
          <Show when={isExporting()}>
            <div style={{ 'margin-top': '1rem' }}>
              <div style={progressBarContainerStyle}>
                <div style={progressBarFillStyle(progressPercent())} />
              </div>
              <div style={{ display: 'flex', 'justify-content': 'space-between', 'font-size': '0.8125rem', color: 'var(--text-secondary, #6b7280)' }}>
                <span>{exportProgress().message}</span>
                <span>{progressPercent()}%</span>
              </div>
            </div>
          </Show>

          {/* Export results */}
          <Show when={exportComplete()}>
            <div style={{ 'margin-top': '1rem' }}>
              {/* Success summary */}
              {(() => {
                const results = exportResults();
                const successCount = results.filter(r => r.success).length;
                const failCount = results.filter(r => !r.success).length;
                const variant = failCount === 0 ? 'success' : failCount === results.length ? 'error' : 'warning';
                return (
                  <div style={alertStyle(variant)}>
                    <span style={{ 'font-weight': '600' }}>
                      Export Complete: {successCount} succeeded, {failCount} failed
                    </span>
                  </div>
                );
              })()}

              {/* ZIP download */}
              <Show when={exportZipBlob()}>
                <div style={{ 'margin-top': '0.75rem' }}>
                  <button style={bigButtonStyle(false, 'primary')} onClick={handleDownloadZip}>
                    Download ZIP ({exportZipName()})
                  </button>
                </div>
              </Show>

              {/* Individual results */}
              <div style={{ 'margin-top': '1rem' }}>
                <div style={{ 'font-weight': '600', 'font-size': '0.875rem', color: 'var(--text-primary, #1f2937)', 'margin-bottom': '0.5rem' }}>
                  Individual Files
                </div>
                <For each={exportResults()}>
                  {(result) => (
                    <div style={resultRowStyle(result.success)}>
                      <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', flex: '1', 'min-width': '0' }}>
                        <span style={{
                          'font-weight': '600',
                          color: result.success ? '#166534' : '#991b1b',
                        }}>
                          {result.success ? '✓' : '✗'}
                        </span>
                        <span style={{ 'font-weight': '500' }}>{result.clientName}</span>
                        <span style={{ color: 'var(--text-secondary, #6b7280)', 'font-size': '0.75rem' }}>
                          {result.recordCount} records
                        </span>
                      </div>
                      <Show when={result.success}>
                        <button
                          style={smallButtonStyle('secondary')}
                          onClick={() => handleDownloadIndividual(result)}
                        >
                          Download
                        </button>
                      </Show>
                      <Show when={!result.success && result.errors.length > 0}>
                        <span style={{ 'font-size': '0.75rem', color: '#991b1b', 'max-width': '200px', 'text-align': 'right' }}>
                          {result.errors[0]}
                        </span>
                      </Show>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </Show>
        </div>
      </div>

      {/* ---- Export History ---- */}
      <div style={sectionCardStyle}>
        <div
          style={{ ...sectionHeaderStyle, cursor: 'pointer' }}
          onClick={() => setShowHistory(!showHistory())}
        >
          <div style={{ display: 'flex', 'align-items': 'center', gap: '0.75rem' }}>
            <span style={sectionTitleStyle}>Export History</span>
            <Show when={exportHistory().length > 0}>
              <span style={{
                'font-size': '0.75rem',
                color: 'var(--text-secondary, #6b7280)',
                'font-weight': '400',
              }}>
                ({exportHistory().length} entries)
              </span>
            </Show>
          </div>
          <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
            <Show when={exportHistory().length > 0}>
              <button
                style={smallButtonStyle('danger')}
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearHistory();
                }}
              >
                Clear History
              </button>
            </Show>
            <span style={{
              transform: showHistory() ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
              color: 'var(--text-secondary, #6b7280)',
              'font-size': '0.75rem',
            }}>
              &#9660;
            </span>
          </div>
        </div>

        <Show when={showHistory()}>
          <div style={sectionBodyStyle}>
            <Show
              when={exportHistory().length > 0}
              fallback={
                <div style={emptyStateStyle}>
                  <span style={{ 'font-size': '1.5rem', opacity: '0.4' }}>--</span>
                  <span>No export history yet.</span>
                </div>
              }
            >
              <div style={{ 'max-height': '300px', 'overflow-y': 'auto' }}>
                <For each={exportHistory()}>
                  {(entry) => (
                    <div style={historyRowStyle}>
                      <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.125rem' }}>
                        <span style={{ 'font-weight': '500' }}>
                          {entry.clientName}
                          <Show when={entry.isBatch}>
                            <span style={{
                              'margin-left': '0.5rem',
                              'font-size': '0.6875rem',
                              padding: '0.0625rem 0.375rem',
                              'border-radius': '9999px',
                              background: '#eff6ff',
                              color: '#3b82f6',
                            }}>
                              batch ({entry.batchSize})
                            </span>
                          </Show>
                        </span>
                        <span style={{ 'font-size': '0.6875rem', color: 'var(--text-secondary, #9ca3af)' }}>
                          {entry.fileName} &middot; {entry.recordCount} records &middot; {entry.format.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ display: 'flex', 'flex-direction': 'column', 'align-items': 'flex-end', gap: '0.125rem' }}>
                        <span style={{ 'font-size': '0.75rem', color: 'var(--text-secondary, #6b7280)' }}>
                          {formatDate(entry.exportedAt)}
                        </span>
                        <span style={{ 'font-size': '0.6875rem', color: 'var(--text-secondary, #9ca3af)' }}>
                          TY {entry.taxYear}
                        </span>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </div>
        </Show>
      </div>
    </div>
  );
};

export default BatchExportView;
