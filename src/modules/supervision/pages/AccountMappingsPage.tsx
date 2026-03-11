/**
 * Account Mappings Page
 *
 * Displays all account mappings with filtering, editing capabilities,
 * and comprehensive statistics. Users can view, filter, edit, lock/unlock,
 * and delete account mappings.
 *
 * Based on spec section for Account Mappings management.
 */

import { Component, createSignal, createMemo, For, Show, onMount } from 'solid-js';
import { supervisionStore } from '../stores/supervisionStore';
import {
  LockStatusBadge,
  ConfidenceBadge,
  SourceBadge,
  ActionButton,
  StatsCard,
} from '../components/shared';
import { LockStatus, MappingSource } from '../types/supervisionTypes';
import type { SupervisedAccountMapping } from '../types/supervisionTypes';
import { accountsStore } from '../../accounts';

// Transaction type categories for filtering
const TRANSACTION_TYPE_CATEGORIES = [
  { value: 'all', label: 'All Types' },
  { value: 'payment', label: 'Payment' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'expense', label: 'Expense' },
  { value: 'asset', label: 'Asset' },
  { value: 'liability', label: 'Liability' },
];

// Source filter options
const SOURCE_OPTIONS = [
  { value: 'all', label: 'All Sources' },
  { value: MappingSource.AI_GENERATED, label: 'AI Generated' },
  { value: MappingSource.USER_CREATED, label: 'User Created' },
  { value: MappingSource.USER_MODIFIED, label: 'User Modified' },
  { value: MappingSource.SYSTEM_DEFAULT, label: 'System Default' },
];

// Items per page for pagination
const ITEMS_PER_PAGE = 10;

const AccountMappingsPage: Component = () => {
  // Local filter state
  const [searchTerm, setSearchTerm] = createSignal('');
  const [sourceFilter, setSourceFilter] = createSignal<string>('all');
  const [typeFilter, setTypeFilter] = createSignal<string>('all');
  const [currentPage, setCurrentPage] = createSignal(1);

  // Modal state for editing
  const [selectedMapping, setSelectedMapping] = createSignal<SupervisedAccountMapping | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = createSignal(false);
  const [hoveredRowId, setHoveredRowId] = createSignal<string | null>(null);

  // Load account mappings on mount
  onMount(() => {
    supervisionStore.loadAccountMappings();
  });

  // Computed statistics
  const stats = createMemo(() => {
    const mappings = supervisionStore.accountMappings();
    const total = mappings.length;
    const manualOverrides = mappings.filter(
      (m) => m?.source === MappingSource.USER_CREATED || m?.source === MappingSource.USER_MODIFIED
    ).length;
    const aiSuggested = mappings.filter((m) => m.source === MappingSource.AI_GENERATED)?.length;
    const pendingReview = mappings.filter(
      (m) => m?.lock?.status === LockStatus.PENDING_REVIEW || m?.pendingSuggestions?.length > 0
    ).length;

    return { total, manualOverrides, aiSuggested, pendingReview };
  });

  // Filtered mappings based on search and filters
  const filteredMappings = createMemo(() => {
    let result = supervisionStore.accountMappings();
   
    let kiki: any = {}
    let aa  = accountsStore.accounts;
    //console.log({aa})
    aa.map(aacc=>{
      //console.log({aacc})
        kiki[aacc.id] = aacc;
        kiki[aacc.accountNumber] = aacc;
    })
   
    //console.log({kiki})
    result.map(r=>{
        let drr = kiki[r.debitAccount?.id];
        console.log( r.debitAccount?.id, drr)
    })
    // Search filter (searches in name, account codes, and account names)
    const search = searchTerm()?.toLowerCase().trim();
    if (search) {
      result = result.filter(
        (mapping) =>
          mapping?.name?.toLowerCase()?.includes(search) ||
          mapping?.debitAccount?.code.toLowerCase()?.includes(search) ||
          mapping?.debitAccount?.name.toLowerCase()?.includes(search) ||
          mapping?.creditAccount?.code.toLowerCase()?.includes(search) ||
          mapping?.creditAccount?.name.toLowerCase()?.includes(search)
      );
    }

    // Source filter
    const source = sourceFilter();
    if (source !== 'all') {
      result = result?.filter((mapping) => mapping?.source === source);
    }

    // Type filter (based on transaction type/name pattern)
    const type = typeFilter();
    if (type !== 'all') {
      result = result?.filter((mapping) => mapping?.name?.toLowerCase()?.startsWith(type.toLowerCase()));
    }

    return result;
  });

  // Paginated mappings
  const paginatedMappings = createMemo(() => {
    const filtered = filteredMappings();
    const startIndex = (currentPage() - 1) * ITEMS_PER_PAGE;
    return filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  });

  // Total pages
  const totalPages = createMemo(() => {
    return Math.ceil(filteredMappings().length / ITEMS_PER_PAGE);
  });

  // Reset to first page when filters change
  const handleFilterChange = (setter: (v: string) => void, value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  // Handle row click to edit
  const handleRowClick = (mapping: SupervisedAccountMapping) => {
    setSelectedMapping(mapping);
  };

  // Handle add mapping
  const handleAddMapping = () => {
    setIsAddModalOpen(true);
    setSelectedMapping(null);
  };

  // Handle lock/unlock
  const handleToggleLock = async (e: Event, mapping: SupervisedAccountMapping) => {
    e.stopPropagation();
    // This would trigger lock/unlock API call
    // For now, we'll just log the action
    console.log('Toggle lock for mapping:', mapping.id);
  };

  // Handle delete
  const handleDelete = async (e: Event, mapping: SupervisedAccountMapping) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete the mapping "${mapping.name}"?`)) {
      // This would trigger delete API call
      console.log('Delete mapping:', mapping.id);
    }
  };

  // Handle edit
  const handleEdit = (e: Event, mapping: SupervisedAccountMapping) => {
    e.stopPropagation();
    setSelectedMapping(mapping);
  };

  // Get display icon for source
  const getSourceIcon = (source: MappingSource, lockStatus: LockStatus) => {
    if (lockStatus === LockStatus.USER_LOCKED || lockStatus === LockStatus.AI_LOCKED) {
      return '\uD83D\uDD12';
    }
    if (source === MappingSource.AI_GENERATED) {
      return '\uD83E\uDD16';
    }
    if (source === MappingSource.USER_CREATED || source === MappingSource.USER_MODIFIED) {
      return '\uD83D\uDD12';
    }
    return '\u2699\uFE0F';
  };

  // Get source display text
  const getSourceDisplay = (mapping: SupervisedAccountMapping) => {
    const source = mapping.source;
    const lock = mapping?.lock?.status;
    const confidence = Math.round(mapping?.confidence * 100);

    if (lock === LockStatus.USER_LOCKED || lock === LockStatus.AI_LOCKED) {
      return 'Locked';
    }
    if (source === MappingSource.AI_GENERATED) {
      return `AI (${confidence}%)`;
    }
    if (source === MappingSource.USER_CREATED) {
      return 'Manual';
    }
    if (source === MappingSource.USER_MODIFIED) {
      return 'Edited';
    }
    return 'System';
  };

  // Check if mapping has low confidence (for warning display)
  const hasLowConfidence = (mapping: SupervisedAccountMapping) => {
    return mapping.source === MappingSource.AI_GENERATED && mapping.confidence < 0.7;
  };

  // Styles
  const pageStyle = {
    padding: '1.5rem',
    'min-height': '100vh',
    background: 'var(--bg-primary, #f8fafc)',
  };

  const headerStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '1.5rem',
  };

  const titleStyle = {
    'font-size': '1.75rem',
    'font-weight': '700',
    color: 'var(--text-primary, #1e293b)',
    margin: '0',
    'letter-spacing': '0.025em',
  };

  const primaryButtonStyle = {
    display: 'inline-flex',
    'align-items': 'center',
    gap: '0.5rem',
    padding: '0.625rem 1.25rem',
    background: 'var(--primary-color, #3b82f6)',
    color: 'white',
    border: 'none',
    'border-radius': '0.5rem',
    'font-weight': '500',
    'font-size': '0.875rem',
    cursor: 'pointer',
    transition: 'background 0.2s ease',
  };

  const statsGridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    'margin-bottom': '1.5rem',
  };

  const filterBarStyle = {
    display: 'flex',
    gap: '1rem',
    'margin-bottom': '1.5rem',
    'flex-wrap': 'wrap' as const,
    'align-items': 'center',
    padding: '1rem',
    background: 'white',
    'border-radius': '0.75rem',
    border: '1px solid var(--border-color, #e5e7eb)',
  };

  const selectStyle = {
    padding: '0.625rem 1rem',
    border: '1px solid var(--border-color, #e5e7eb)',
    'border-radius': '0.5rem',
    'font-size': '0.875rem',
    background: 'white',
    'min-width': '150px',
    cursor: 'pointer',
    color: 'var(--text-primary, #374151)',
  };

  const searchInputStyle = {
    flex: '1',
    'min-width': '250px',
    padding: '0.625rem 1rem',
    'padding-left': '2.5rem',
    border: '1px solid var(--border-color, #e5e7eb)',
    'border-radius': '0.5rem',
    'font-size': '0.875rem',
    background: 'white',
    color: 'var(--text-primary, #374151)',
  };

  const searchContainerStyle = {
    position: 'relative' as const,
    flex: '1',
    'min-width': '250px',
  };

  const searchIconStyle = {
    position: 'absolute' as const,
    left: '0.75rem',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--text-muted, #9ca3af)',
    'pointer-events': 'none' as const,
  };

  const tableContainerStyle = {
    background: 'white',
    'border-radius': '0.75rem',
    border: '1px solid var(--border-color, #e5e7eb)',
    overflow: 'hidden',
    'box-shadow': '0 1px 3px rgba(0, 0, 0, 0.05)',
  };

  const tableStyle = {
    width: '100%',
    'border-collapse': 'collapse' as const,
    'font-size': '0.875rem',
  };

  const tableHeaderStyle = {
    background: 'var(--bg-secondary, #f9fafb)',
    'border-bottom': '1px solid var(--border-color, #e5e7eb)',
  };

  const thStyle = {
    padding: '0.875rem 1rem',
    'text-align': 'left' as const,
    'font-weight': '600',
    'font-size': '0.75rem',
    color: 'var(--text-muted, #6b7280)',
    'text-transform': 'uppercase' as const,
    'letter-spacing': '0.05em',
  };

  const tdStyle = {
    padding: '0.875rem 1rem',
    'border-bottom': '1px solid var(--border-color, #e5e7eb)',
    color: 'var(--text-primary, #374151)',
  };

  const rowHoverStyle = {
    background: 'var(--bg-hover, #f3f4f6)',
    cursor: 'pointer',
  };

  const monospaceStyle = {
    'font-family': 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    'font-size': '0.8125rem',
    background: 'var(--bg-code, #f3f4f6)',
    padding: '0.25rem 0.5rem',
    'border-radius': '0.25rem',
    color: 'var(--text-primary, #1e293b)',
  };

  const sourceDisplayStyle = (mapping: SupervisedAccountMapping) => {
    const isLocked =
      mapping?.lock?.status === LockStatus.USER_LOCKED || mapping?.lock?.status === LockStatus.AI_LOCKED;
    const isAI = mapping?.source === MappingSource.AI_GENERATED;
    const lowConf = hasLowConfidence(mapping);

    let color = '#6B7280';
    let bgColor = 'rgba(107, 114, 128, 0.1)';

    if (isLocked) {
      color = '#EF4444';
      bgColor = 'rgba(239, 68, 68, 0.1)';
    } else if (isAI && lowConf) {
      color = '#F59E0B';
      bgColor = 'rgba(245, 158, 11, 0.1)';
    } else if (isAI) {
      color = '#10B981';
      bgColor = 'rgba(16, 185, 129, 0.1)';
    }

    return {
      display: 'inline-flex',
      'align-items': 'center',
      gap: '0.375rem',
      padding: '0.25rem 0.625rem',
      'border-radius': '9999px',
      'font-size': '0.75rem',
      'font-weight': '500',
      color: color,
      background: bgColor,
      border: `1px solid ${color}`,
    };
  };

  const rowActionsStyle = {
    display: 'flex',
    gap: '0.375rem',
    opacity: '0',
    transition: 'opacity 0.2s ease',
  };

  const rowActionsVisibleStyle = {
    ...rowActionsStyle,
    opacity: '1',
  };

  const actionIconButtonStyle = {
    display: 'inline-flex',
    'align-items': 'center',
    'justify-content': 'center',
    width: '1.75rem',
    height: '1.75rem',
    'border-radius': '0.375rem',
    border: '1px solid var(--border-color, #e5e7eb)',
    background: 'white',
    cursor: 'pointer',
    color: 'var(--text-secondary, #6b7280)',
    transition: 'all 0.2s ease',
  };

  const paginationStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '1rem',
    'border-top': '1px solid var(--border-color, #e5e7eb)',
    background: 'var(--bg-secondary, #f9fafb)',
  };

  const paginationInfoStyle = {
    'font-size': '0.875rem',
    color: 'var(--text-muted, #6b7280)',
  };

  const paginationButtonsStyle = {
    display: 'flex',
    gap: '0.5rem',
  };

  const paginationButtonStyle = (disabled: boolean) => ({
    display: 'inline-flex',
    'align-items': 'center',
    gap: '0.375rem',
    padding: '0.5rem 0.875rem',
    'font-size': '0.875rem',
    'font-weight': '500',
    'border-radius': '0.375rem',
    border: '1px solid var(--border-color, #e5e7eb)',
    background: disabled ? 'var(--bg-disabled, #f3f4f6)' : 'white',
    color: disabled ? 'var(--text-disabled, #9ca3af)' : 'var(--text-primary, #374151)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? '0.6' : '1',
    transition: 'all 0.2s ease',
  });

  const emptyStateStyle = {
    'text-align': 'center' as const,
    padding: '4rem 2rem',
    background: 'white',
    'border-radius': '0.75rem',
    border: '1px solid var(--border-color, #e5e7eb)',
  };

  const emptyIconStyle = {
    'font-size': '3rem',
    'margin-bottom': '1rem',
  };

  const emptyTitleStyle = {
    'font-size': '1.25rem',
    'font-weight': '600',
    color: 'var(--text-primary, #1e293b)',
    'margin-bottom': '0.5rem',
  };

  const emptyTextStyle = {
    color: 'var(--text-muted, #6b7280)',
    'margin-bottom': '1.5rem',
  };


  //console.log(paginatedMappings())

  return (
    <div style={pageStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h1 style={titleStyle}>ACCOUNT MAPPINGS</h1>
        <button style={primaryButtonStyle} onClick={handleAddMapping}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Mapping
        </button>
      </div>

      {/* Stats Cards */}
      <div style={statsGridStyle}>
        <StatsCard icon="\uD83D\uDCCA" value={stats().total} label="Total Mappings" color="#3B82F6" />
        <StatsCard
          icon="\u270B"
          value={stats().manualOverrides}
          label="Manual Overrides"
          color="#8B5CF6"
        />
        <StatsCard
          icon="\uD83E\uDD16"
          value={stats().aiSuggested}
          label="AI Suggested"
          color="#10B981"
        />
        <StatsCard
          icon="\u23F3"
          value={stats().pendingReview}
          label="Pending Review"
          color="#F59E0B"
        />
      </div>

      {/* Filter Bar */}
      <div style={filterBarStyle}>
        <span style={{ 'font-weight': '500', color: 'var(--text-secondary, #6b7280)' }}>Filter:</span>
        <select
          style={selectStyle}
          value={sourceFilter()}
          onChange={(e) => handleFilterChange(setSourceFilter, e.currentTarget.value)}
        >
          <For each={SOURCE_OPTIONS}>{(option) => <option value={option.value}>{option.label}</option>}</For>
        </select>
        <select
          style={selectStyle}
          value={typeFilter()}
          onChange={(e) => handleFilterChange(setTypeFilter, e.currentTarget.value)}
        >
          <For each={TRANSACTION_TYPE_CATEGORIES}>
            {(option) => <option value={option.value}>{option.label}</option>}
          </For>
        </select>
        <div style={searchContainerStyle}>
          <span style={searchIconStyle}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search accounts..."
            style={searchInputStyle}
            value={searchTerm()}
            onInput={(e) => {
              setSearchTerm(e.currentTarget.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* Loading State */}
      <Show when={supervisionStore.isLoading()}>
        <div style={{ 'text-align': 'center', padding: '2rem' }}>
          <p>Loading account mappings...</p>
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

      {/* Account Mappings Table */}
      <Show
        when={filteredMappings().length > 0}
        fallback={
          <Show when={!supervisionStore.isLoading()}>
            <div style={emptyStateStyle}>
              <div style={emptyIconStyle}>
                <svg
                  width="64"
                  height="64"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#9ca3af"
                  stroke-width="1.5"
                >
                  <path d="M21 15c0-4.625-3.507-8.441-8-8.941V4a1 1 0 0 0-2 0v2.059c-4.493.5-8 4.316-8 8.941v2a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-2z" />
                  <path d="M12 22a2 2 0 0 0 2-2H10a2 2 0 0 0 2 2z" />
                </svg>
              </div>
              <h3 style={emptyTitleStyle}>No Account Mappings Found</h3>
              <p style={emptyTextStyle}>
                {searchTerm() || sourceFilter() !== 'all' || typeFilter() !== 'all'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Get started by creating your first account mapping.'}
              </p>
              <button style={primaryButtonStyle} onClick={handleAddMapping}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Mapping
              </button>
            </div>
          </Show>
        }
      >
        <div style={tableContainerStyle}>
          <table style={tableStyle}>
            <thead style={tableHeaderStyle}>
              <tr>
                <th style={thStyle}>Transaction Type</th>
                <th style={thStyle}>Account Code</th>
                <th style={thStyle}>Account Name</th>
                <th style={thStyle}>Source</th>
                <th style={{ ...thStyle, 'text-align': 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              <For each={paginatedMappings()}>
                {(mapping) => (
                  <tr
                    style={hoveredRowId() === mapping?.id ? { ...rowHoverStyle } : {}}
                    onClick={() => handleRowClick(mapping)}
                    onMouseEnter={() => setHoveredRowId(mapping?.id)}
                    onMouseLeave={() => setHoveredRowId(null)}
                  >
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                        <span style={{ 'font-weight': '500' }}>{mapping?.name}</span>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span style={monospaceStyle}>{mapping?.debitAccount?.code}</span>
                    </td>
                    <td style={tdStyle}>{mapping?.debitAccount?.name}</td>
                    <td style={tdStyle}>
                      <span style={sourceDisplayStyle(mapping)}>
                        <span>{getSourceIcon(mapping?.source, mapping?.lock?.status)}</span>
                        <span>{getSourceDisplay(mapping)}</span>
                      </span>
                    </td>
                    <td style={{ ...tdStyle, 'text-align': 'right' }}>
                      <div style={hoveredRowId() === mapping?.id ? rowActionsVisibleStyle : rowActionsStyle}>
                        {/* Edit Button */}
                        <button
                          style={actionIconButtonStyle}
                          title="Edit"
                          onClick={(e) => handleEdit(e, mapping)}
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                          >
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        {/* Lock/Unlock Button */}
                        <button
                          style={actionIconButtonStyle}
                          title={
                            mapping?.lock?.status === LockStatus.UNLOCKED ||
                            mapping?.lock?.status === LockStatus.PENDING_REVIEW
                              ? 'Lock'
                              : 'Unlock'
                          }
                          onClick={(e) => handleToggleLock(e, mapping)}
                        >
                          <Show
                            when={
                              mapping?.lock?.status === LockStatus.UNLOCKED ||
                              mapping?.lock?.status === LockStatus.PENDING_REVIEW
                            }
                            fallback={
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                              >
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                              </svg>
                            }
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="2"
                            >
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                          </Show>
                        </button>
                        {/* Delete Button (only for user-created) */}
                        <Show when={mapping?.source === MappingSource.USER_CREATED}>
                          <button
                            style={{
                              ...actionIconButtonStyle,
                              color: '#ef4444',
                              'border-color': 'rgba(239, 68, 68, 0.3)',
                            }}
                            title="Delete"
                            onClick={(e) => handleDelete(e, mapping)}
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="2"
                            >
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </Show>
                      </div>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>

          {/* Pagination */}
          <div style={paginationStyle}>
            <div style={paginationInfoStyle}>
              Showing {(currentPage() - 1) * ITEMS_PER_PAGE + 1} to{' '}
              {Math.min(currentPage() * ITEMS_PER_PAGE, filteredMappings().length)} of{' '}
              {filteredMappings().length} mappings
            </div>
            <div style={paginationButtonsStyle}>
              <button
                style={paginationButtonStyle(currentPage() === 1)}
                disabled={currentPage() === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Previous
              </button>
              <span
                style={{
                  display: 'flex',
                  'align-items': 'center',
                  padding: '0 0.75rem',
                  'font-size': '0.875rem',
                  color: 'var(--text-secondary, #6b7280)',
                }}
              >
                Page {currentPage()} of {totalPages() || 1}
              </span>
              <button
                style={paginationButtonStyle(currentPage() >= totalPages())}
                disabled={currentPage() >= totalPages()}
                onClick={() => setCurrentPage((p) => Math.min(totalPages(), p + 1))}
              >
                Next
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </Show>

      {/* Modal trigger signals - to be consumed by SetManualAccountModal */}
      <Show when={selectedMapping() || isAddModalOpen()}>
        {/*
          The SetManualAccountModal component would be rendered here.
          It would receive:
          - mapping: selectedMapping()
          - isOpen: true
          - onClose: () => { setSelectedMapping(null); setIsAddModalOpen(false); }

          For now, we'll output a placeholder div showing the modal would open.
        */}
        <div
          style={{
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'center',
            'z-index': '1000',
          }}
          onClick={() => {
            setSelectedMapping(null);
            setIsAddModalOpen(false);
          }}
        >
          <div
            style={{
              background: 'white',
              'border-radius': '0.75rem',
              padding: '1.5rem',
              'min-width': '400px',
              'max-width': '600px',
              'box-shadow': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              style={{
                'font-size': '1.25rem',
                'font-weight': '600',
                'margin-bottom': '1rem',
                color: 'var(--text-primary, #1e293b)',
              }}
            >
              {selectedMapping() ? 'Edit Account Mapping' : 'Add Account Mapping'}
            </h2>
            <p style={{ color: 'var(--text-muted, #6b7280)', 'margin-bottom': '1.5rem' }}>
              {selectedMapping()
                ? `Editing mapping: ${selectedMapping()!.name}`
                : 'Create a new account mapping rule.'}
            </p>
            <p style={{ 'font-size': '0.875rem', color: 'var(--text-muted, #9ca3af)' }}>
              SetManualAccountModal component would be rendered here.
            </p>
            <div style={{ display: 'flex', 'justify-content': 'flex-end', gap: '0.75rem', 'margin-top': '1.5rem' }}>
              <button
                style={{
                  padding: '0.5rem 1rem',
                  'border-radius': '0.375rem',
                  border: '1px solid var(--border-color, #e5e7eb)',
                  background: 'white',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  setSelectedMapping(null);
                  setIsAddModalOpen(false);
                }}
              >
                Cancel
              </button>
              <button
                style={{
                  padding: '0.5rem 1rem',
                  'border-radius': '0.375rem',
                  border: 'none',
                  background: 'var(--primary-color, #3b82f6)',
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default AccountMappingsPage;
