/**
 * Adapters List Page
 *
 * Displays a searchable, filterable list of all adapters with their
 * status, confidence scores, success rates, and action buttons.
 *
 * Based on spec section 3.2
 */

import { Component, createSignal, createMemo, For, Show, onMount } from 'solid-js';
import { A } from '@solidjs/router';
import { supervisionStore } from '../stores/supervisionStore';
import { LockStatusBadge, ConfidenceBadge, SuccessRateBar } from '../components/shared';
import { LockStatus } from '../types/supervisionTypes';
import type { SupervisedAdapter } from '../types/supervisionTypes';

// Source badge component for adapter source systems
const AdapterSourceBadge: Component<{ source: string }> = (props) => {
  const getSourceConfig = () => {
    const source = props?.source?.toLowerCase();
    switch (source) {
      case 'stripe':
        return { label: 'stripe', color: '#635bff', bgColor: 'rgba(99, 91, 255, 0.1)' };
      case 'shopify':
        return { label: 'shopify', color: '#96bf48', bgColor: 'rgba(150, 191, 72, 0.1)' };
      case 'square':
        return { label: 'square', color: '#006aff', bgColor: 'rgba(0, 106, 255, 0.1)' };
      case 'quickbooks':
        return { label: 'quickbooks', color: '#2ca01c', bgColor: 'rgba(44, 160, 28, 0.1)' };
      case 'xero':
        return { label: 'xero', color: '#13B5EA', bgColor: 'rgba(19, 181, 234, 0.1)' };
      case 'csv':
      case 'manual':
        return { label: 'manual', color: '#6B7280', bgColor: 'rgba(107, 114, 128, 0.1)' };
      default:
        return { label: source, color: '#8B5CF6', bgColor: 'rgba(139, 92, 246, 0.1)' };
    }
  };

  const config = () => getSourceConfig();

  return (
    <span
      style={{
        display: 'inline-flex',
        'align-items': 'center',
        padding: '0.25rem 0.625rem',
        'border-radius': '9999px',
        'font-size': '0.75rem',
        'font-weight': '600',
        color: config().color,
        background: config().bgColor,
        border: `1px solid ${config().color}`,
        'text-transform': 'lowercase'
      }}
    >
      {config().label}
    </span>
  );
};

const AdaptersListPage: Component = () => {
  // Local filter state
  const [searchTerm, setSearchTerm] = createSignal('');
  const [sourceFilter, setSourceFilter] = createSignal<string>('all');
  const [statusFilter, setStatusFilter] = createSignal<string>('all');

  // Load adapters on mount
  onMount(() => {
    supervisionStore.loadAdapters();
  });

  // Get unique sources from adapters
  const availableSources = createMemo(() => {
    const sources = new Set<string>();
    supervisionStore.adapters().forEach((adapter) => {
      sources.add(adapter.sourceSystem);
    });
    return Array.from(sources).sort();
  });

  // Filtered adapters based on search and filters
  const filteredAdapters = createMemo(() => {
    let result = supervisionStore.adapters();

    // Search filter
    const search = searchTerm().toLowerCase().trim();
    if (search) {
      result = result.filter(
        (adapter) =>
          adapter.name.toLowerCase().includes(search) ||
          adapter.displayName.toLowerCase().includes(search) ||
          adapter.description.toLowerCase().includes(search)
      );
    }

    // Source filter
    const source = sourceFilter();
    if (source !== 'all') {
      result = result.filter((adapter) => adapter.sourceSystem.toLowerCase() === source.toLowerCase());
    }

    // Status filter
    const status = statusFilter();
    if (status !== 'all') {
      result = result.filter((adapter) => {
        if (status === 'locked') {
          return adapter?.globalLock?.status !== LockStatus.UNLOCKED;
        } else if (status === 'unlocked') {
          return adapter?.globalLock?.status === LockStatus.UNLOCKED;
        } else if (status === 'low_confidence') {
          return adapter.confidence < 0.6;
        }
        return true;
      });
    }

    return result;
  });

  // Format timestamp
  const formatTimestamp = (date: Date | null) => {
    if (!date) return 'Never';
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  // Handle actions
  const handleLockAdapter = async (adapterId: string) => {
    await supervisionStore.lockAdapter(adapterId, 'Locked by user from list view');
  };

  const handleUnlockAdapter = async (adapterId: string) => {
    await supervisionStore.unlockAdapter(adapterId);
  };

  const handleTestAdapter = async (adapterId: string) => {
    try {
      await supervisionStore.testAdapter(adapterId, {});
      alert('Test completed successfully');
    } catch (e) {
      alert('Test failed: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }
  };

  const handleDeleteAdapter = async (adapterId: string) => {
    if (confirm('Are you sure you want to delete this adapter? This action cannot be undone.')) {
      // Note: Delete functionality would be added to the store
      alert('Delete functionality would be implemented here');
    }
  };

  // Styles
  const pageStyle = {
    padding: '1.5rem',
    'min-height': '100vh',
    background: 'var(--bg-primary, #f8fafc)'
  };

  const headerStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '1.5rem'
  };

  const titleStyle = {
    'font-size': '1.75rem',
    'font-weight': '700',
    color: 'var(--text-primary, #1e293b)',
    margin: '0'
  };

  const buttonGroupStyle = {
    display: 'flex',
    gap: '0.75rem'
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
    cursor: 'pointer'
  };

  const secondaryButtonStyle = {
    display: 'inline-flex',
    'align-items': 'center',
    gap: '0.5rem',
    padding: '0.625rem 1.25rem',
    background: 'white',
    color: 'var(--text-primary, #374151)',
    border: '1px solid var(--border-color, #e5e7eb)',
    'border-radius': '0.5rem',
    'font-weight': '500',
    'font-size': '0.875rem',
    cursor: 'pointer'
  };

  const filtersRowStyle = {
    display: 'flex',
    gap: '1rem',
    'margin-bottom': '1.5rem',
    'flex-wrap': 'wrap' as const
  };

  const searchInputStyle = {
    flex: '1',
    'min-width': '250px',
    padding: '0.625rem 1rem',
    border: '1px solid var(--border-color, #e5e7eb)',
    'border-radius': '0.5rem',
    'font-size': '0.875rem',
    background: 'white'
  };

  const selectStyle = {
    padding: '0.625rem 1rem',
    border: '1px solid var(--border-color, #e5e7eb)',
    'border-radius': '0.5rem',
    'font-size': '0.875rem',
    background: 'white',
    'min-width': '150px',
    cursor: 'pointer'
  };

  const cardStyle = {
    background: 'white',
    'border-radius': '0.75rem',
    border: '1px solid var(--border-color, #e5e7eb)',
    padding: '1.25rem',
    'margin-bottom': '1rem',
    'box-shadow': '0 1px 3px rgba(0, 0, 0, 0.05)'
  };

  const cardHeaderStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'flex-start',
    'margin-bottom': '1rem'
  };

  const adapterNameStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    'font-size': '1.125rem',
    'font-weight': '600',
    color: 'var(--text-primary, #1e293b)'
  };

  const statsGridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '1rem',
    'margin-bottom': '1rem'
  };

  const statItemStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    gap: '0.25rem'
  };

  const statLabelStyle = {
    'font-size': '0.75rem',
    color: 'var(--text-muted, #6b7280)',
    'text-transform': 'uppercase' as const,
    'letter-spacing': '0.025em'
  };

  const statValueStyle = {
    'font-size': '1rem',
    'font-weight': '600',
    color: 'var(--text-primary, #1e293b)'
  };

  const actionsRowStyle = {
    display: 'flex',
    gap: '0.5rem',
    'flex-wrap': 'wrap' as const,
    'padding-top': '1rem',
    'border-top': '1px solid var(--border-color, #e5e7eb)'
  };

  const actionButtonStyle = {
    display: 'inline-flex',
    'align-items': 'center',
    gap: '0.25rem',
    padding: '0.375rem 0.75rem',
    'font-size': '0.75rem',
    'font-weight': '500',
    'border-radius': '0.375rem',
    border: '1px solid var(--border-color, #e5e7eb)',
    background: 'white',
    color: 'var(--text-primary, #374151)',
    cursor: 'pointer'
  };

  const viewButtonStyle = {
    ...actionButtonStyle,
    background: 'var(--primary-color, #3b82f6)',
    color: 'white',
    border: 'none'
  };

  const dangerButtonStyle = {
    ...actionButtonStyle,
    color: '#ef4444',
    'border-color': 'rgba(239, 68, 68, 0.3)'
  };

  const emptyStateStyle = {
    'text-align': 'center' as const,
    padding: '4rem 2rem',
    background: 'white',
    'border-radius': '0.75rem',
    border: '1px solid var(--border-color, #e5e7eb)'
  };

  const emptyIconStyle = {
    'font-size': '3rem',
    'margin-bottom': '1rem'
  };

  const emptyTitleStyle = {
    'font-size': '1.25rem',
    'font-weight': '600',
    color: 'var(--text-primary, #1e293b)',
    'margin-bottom': '0.5rem'
  };

  const emptyTextStyle = {
    color: 'var(--text-muted, #6b7280)',
    'margin-bottom': '1.5rem'
  };

  return (
    <div style={pageStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h1 style={titleStyle}>ADAPTERS</h1>
        <div style={buttonGroupStyle}>
          <button style={secondaryButtonStyle}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Import
          </button>
          <button style={primaryButtonStyle}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create Adapter
          </button>
        </div>
      </div>

      {/* Search and Filters Row */}
      <div style={filtersRowStyle}>
        <input
          type="text"
          placeholder="Search adapters by name..."
          style={searchInputStyle}
          value={searchTerm()}
          onInput={(e) => setSearchTerm(e.currentTarget.value)}
        />
        <select
          style={selectStyle}
          value={sourceFilter()}
          onChange={(e) => setSourceFilter(e.currentTarget.value)}
        >
          <option value="all">All Sources</option>
          <For each={availableSources()}>
            {(source) => <option value={source}>{source}</option>}
          </For>
        </select>
        <select
          style={selectStyle}
          value={statusFilter()}
          onChange={(e) => setStatusFilter(e.currentTarget.value)}
        >
          <option value="all">All Status</option>
          <option value="locked">Locked</option>
          <option value="unlocked">Unlocked</option>
          <option value="low_confidence">Low Confidence</option>
        </select>
      </div>

      {/* Loading State */}
      <Show when={supervisionStore.isLoading()}>
        <div style={{ 'text-align': 'center', padding: '2rem' }}>
          <p>Loading adapters...</p>
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
            'margin-bottom': '1rem'
          }}
        >
          {supervisionStore.error()}
        </div>
      </Show>

      {/* Adapters List */}
      <Show
        when={filteredAdapters().length > 0}
        fallback={
          <Show when={!supervisionStore.isLoading()}>
            <div style={emptyStateStyle}>
              <div style={emptyIconStyle}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
              </div>
              <h3 style={emptyTitleStyle}>No Adapters Found</h3>
              <p style={emptyTextStyle}>
                {searchTerm() || sourceFilter() !== 'all' || statusFilter() !== 'all'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Get started by creating your first adapter.'}
              </p>
              <button style={primaryButtonStyle}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Create Adapter
              </button>
            </div>
          </Show>
        }
      >
        <For each={filteredAdapters()}>
          {(adapter: SupervisedAdapter) => (
            <div style={cardStyle}>
              {/* Card Header */}
              <div style={cardHeaderStyle}>
                <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.5rem' }}>
                  <div style={adapterNameStyle}>
                    <LockStatusBadge status={adapter?.globalLock?.status} size="sm" />
                    <span>{adapter.displayName}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', 'align-items': 'center' }}>
                    <AdapterSourceBadge source={adapter?.sourceSystem} />
                    <span style={{ 'font-size': '0.75rem', color: 'var(--text-muted, #6b7280)' }}>
                      v{adapter.version}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.5rem', 'align-items': 'flex-end' }}>
                  <ConfidenceBadge confidence={adapter.confidence * 100} showBar={true} />
                </div>
              </div>

              {/* Stats Grid */}
              <div style={statsGridStyle}>
                <div style={statItemStyle}>
                  <span style={statLabelStyle}>Success Rate</span>
                  <SuccessRateBar rate={adapter.successRate} count={adapter.processedCount} />
                </div>
                <div style={statItemStyle}>
                  <span style={statLabelStyle}>Processed</span>
                  <span style={statValueStyle}>{adapter?.processedCount?.toLocaleString()}</span>
                </div>
                <div style={statItemStyle}>
                  <span style={statLabelStyle}>Success</span>
                  <span style={{ ...statValueStyle, color: '#10b981' }}>{adapter?.successCount?.toLocaleString()}</span>
                </div>
                <div style={statItemStyle}>
                  <span style={statLabelStyle}>Failed</span>
                  <span style={{ ...statValueStyle, color: adapter?.failureCount > 0 ? '#ef4444' : 'inherit' }}>
                    {adapter?.failureCount?.toLocaleString()}
                  </span>
                </div>
                <div style={statItemStyle}>
                  <span style={statLabelStyle}>Field Mappings</span>
                  <span style={statValueStyle}>
                    {adapter?.fieldMappings?.length}
                    <span style={{ 'font-size': '0.75rem', color: 'var(--text-muted, #6b7280)', 'margin-left': '0.25rem' }}>
                      ({adapter?.fieldMappings?.filter((m) => m.lock.status !== LockStatus.UNLOCKED).length} locked)
                    </span>
                  </span>
                </div>
                <div style={statItemStyle}>
                  <span style={statLabelStyle}>Pending Suggestions</span>
                  <span
                    style={{
                      ...statValueStyle,
                      color: adapter?.pendingSuggestions?.length > 0 ? '#f59e0b' : 'inherit'
                    }}
                  >
                    {adapter?.pendingSuggestions?.length}
                  </span>
                </div>
                <div style={statItemStyle}>
                  <span style={statLabelStyle}>Last Used</span>
                  <span style={{ 'font-size': '0.875rem', color: 'var(--text-secondary, #4b5563)' }}>
                    {formatTimestamp(adapter?.timestamps?.lastProcessedAt)}
                  </span>
                </div>
              </div>

              {/* Actions Row */}
              <div style={actionsRowStyle}>
                <A href={`/supervision/adapters/${adapter.id}`} style={{ 'text-decoration': 'none' }}>
                  <button style={viewButtonStyle}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    View
                  </button>
                </A>
                <button style={actionButtonStyle}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Edit
                </button>
                <button style={actionButtonStyle} onClick={() => handleTestAdapter(adapter.id)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  Test
                </button>
                <Show
                  when={adapter?.globalLock?.status === LockStatus.UNLOCKED}
                  fallback={
                    <button style={actionButtonStyle} onClick={() => handleUnlockAdapter(adapter.id)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                      </svg>
                      Unlock
                    </button>
                  }
                >
                  <button style={actionButtonStyle} onClick={() => handleLockAdapter(adapter.id)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    Lock All
                  </button>
                </Show>
                <button style={actionButtonStyle}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  History
                </button>
                <button style={dangerButtonStyle} onClick={() => handleDeleteAdapter(adapter.id)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  Delete
                </button>
              </div>
            </div>
          )}
        </For>
      </Show>
    </div>
  );
};

export default AdaptersListPage;
