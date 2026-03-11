/**
 * Supervision Dashboard Page
 *
 * Main dashboard showing all adapters, field mappings, account mappings
 * with view, edit, and link capabilities.
 */

import { Component, createSignal, createMemo, onMount, Show, For, JSX } from 'solid-js';
import { A } from '@solidjs/router';
import { supervisionStore } from '../stores/supervisionStore';
import type { SupervisedAdapter, SupervisedFieldMapping, SupervisedAccountMapping } from '../types/supervisionTypes';
import type { LayeredRule } from '../services/supervisionApi';

type TabType = 'overview' | 'adapters' | 'fieldMappings' | 'layeredRules' | 'accountMappings' | 'learnedRules';

const SupervisionDashboard: Component = () => {
  // State
  const [isLoading, setIsLoading] = createSignal(true);
  const [activeTab, setActiveTab] = createSignal<TabType>('overview');
  const [searchTerm, setSearchTerm] = createSignal('');
  const [selectedAdapterId, setSelectedAdapterId] = createSignal<string | null>(null);

  // Load all data on mount
  const loadAllData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        supervisionStore.loadAdapters(),
        supervisionStore.loadLayeredRules(), // Primary: Layered Rules
        //supervisionStore.loadAccountMappings(), // Legacy
        //supervisionStore.loadLearnedRules(), // Legacy
        supervisionStore.loadPendingSuggestions(),
      ]);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load field mappings when adapter is selected
  const loadAdapterFieldMappings = async (adapterId: string) => {
    setSelectedAdapterId(adapterId);
    await supervisionStore.loadFieldMappings(adapterId);
  };

  onMount(() => {
    loadAllData();
  });

  // Computed stats
  const stats = createMemo(() => {
    const layeredRulesArr = supervisionStore.layeredRules() || [];
    return {
      adapters: (supervisionStore.adapters() || []).length,
      lockedAdapters: supervisionStore.lockedAdaptersCount(),
      fieldMappings: (supervisionStore.fieldMappings() || []).length,
      layeredRules: Array.isArray(layeredRulesArr) ? layeredRulesArr.length : 0,
      lockedLayeredRules: supervisionStore.lockedLayeredRulesCount(),
      layeredByLayer: supervisionStore.layeredRulesByLayer(),
      accountMappings: (supervisionStore.accountMappings() || []).length,
      learnedRules: (supervisionStore.learnedRules() || []).length,
      pendingSuggestions: supervisionStore.pendingSuggestionsCount(),
    };
  });

  // Filtered adapters
  const filteredAdapters = createMemo(() => {
    const term = searchTerm().toLowerCase();
    return supervisionStore.adapters().filter(a =>
      a.name.toLowerCase().includes(term) ||
      a.sourceType?.toLowerCase().includes(term)
    );
  });

  // Filtered account mappings
  const filteredAccountMappings = createMemo(() => {
    const term = searchTerm().toLowerCase();
    return supervisionStore.accountMappings().filter(m =>
      m.transactionType?.toLowerCase().includes(term) ||
      m.accountCode?.toLowerCase().includes(term) ||
      m.accountName?.toLowerCase().includes(term) ||
      m.debitAccount?.code?.toLowerCase().includes(term) ||
      m.creditAccount?.code?.toLowerCase().includes(term) ||
      m.debitAccount?.type?.toLowerCase().includes(term) ||
      m.creditAccount?.type?.toLowerCase().includes(term)
    );
  });

  // Filtered learned rules
  const filteredLearnedRules = createMemo(() => {
    const term = searchTerm().toLowerCase();
    return supervisionStore.learnedRules().filter(r =>
      r.name.toLowerCase().includes(term) ||
      r.ruleType?.toLowerCase().includes(term)
    );
  });

  // Filtered layered rules
  const filteredLayeredRules = createMemo(() => {
    const term = searchTerm().toLowerCase();
    const rules = supervisionStore.layeredRules() || [];
    if (!Array.isArray(rules)) return [];
    return rules.filter(r =>
      r.name?.toLowerCase().includes(term) ||
      r.layer?.toLowerCase().includes(term) ||
      r.ruleType?.toLowerCase().includes(term) ||
      r.criteria?.transactionType?.toLowerCase().includes(term) ||
      r.actions?.debitAccount?.code?.toLowerCase().includes(term) ||
      r.actions?.creditAccount?.code?.toLowerCase().includes(term) ||
      r.account?.code?.toLowerCase().includes(term) ||
      r.account?.name?.toLowerCase().includes(term)
    );
  });

  // Layer badge color - 9-layer accounting system
  const getLayerColor = (layer: string) => {
    switch (layer) {
      case 'revenue': return '#10b981';    // Green
      case 'payment': return '#3b82f6';    // Blue
      case 'tax': return '#f59e0b';        // Amber
      case 'cogs': return '#ef4444';       // Red
      case 'inventory': return '#8b5cf6';  // Purple
      case 'discount': return '#ec4899';   // Pink
      case 'fee': return '#f97316';        // Orange
      case 'receivable': return '#06b6d4'; // Cyan
      case 'payable': return '#6366f1';    // Indigo
      default: return '#64748b';
    }
  };

  // Lock status badge color
  const getLockColor = (isLocked: boolean) => isLocked ? '#22c55e' : '#9ca3af';

  // Confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return '#22c55e';
    if (confidence >= 0.6) return '#f59e0b';
    return '#ef4444';
  };

  // Styles
  const containerStyle: JSX.CSSProperties = {
    'min-height': '100vh',
    'background': '#f8fafc',
    'padding': '24px'
  };

  const headerStyle: JSX.CSSProperties = {
    'display': 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '24px'
  };

  const titleStyle: JSX.CSSProperties = {
    'font-size': '28px',
    'font-weight': '700',
    'color': '#1e293b'
  };

  const tabsStyle: JSX.CSSProperties = {
    'display': 'flex',
    'gap': '4px',
    'background': 'white',
    'padding': '4px',
    'border-radius': '12px',
    'margin-bottom': '24px',
    'box-shadow': '0 1px 3px rgba(0,0,0,0.1)'
  };

  const tabStyle = (isActive: boolean): JSX.CSSProperties => ({
    'padding': '10px 20px',
    'border': 'none',
    'border-radius': '8px',
    'background': isActive ? '#3b82f6' : 'transparent',
    'color': isActive ? 'white' : '#64748b',
    'font-weight': '500',
    'font-size': '14px',
    'cursor': 'pointer',
    'transition': 'all 0.2s'
  });

  const statsGridStyle: JSX.CSSProperties = {
    'display': 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(180px, 1fr))',
    'gap': '16px',
    'margin-bottom': '24px'
  };

  const statCardStyle = (color: string): JSX.CSSProperties => ({
    'background': 'white',
    'border-radius': '12px',
    'padding': '20px',
    'border-left': `4px solid ${color}`,
    'box-shadow': '0 1px 3px rgba(0,0,0,0.1)',
    'cursor': 'pointer',
    'transition': 'transform 0.2s'
  });

  const searchStyle: JSX.CSSProperties = {
    'width': '100%',
    'padding': '12px 16px',
    'border': '1px solid #e2e8f0',
    'border-radius': '8px',
    'font-size': '14px',
    'margin-bottom': '16px'
  };

  const tableStyle: JSX.CSSProperties = {
    'width': '100%',
    'background': 'white',
    'border-radius': '12px',
    'overflow': 'hidden',
    'box-shadow': '0 1px 3px rgba(0,0,0,0.1)'
  };

  const thStyle: JSX.CSSProperties = {
    'padding': '14px 16px',
    'text-align': 'left',
    'font-size': '12px',
    'font-weight': '600',
    'color': '#64748b',
    'text-transform': 'uppercase',
    'background': '#f8fafc',
    'border-bottom': '1px solid #e2e8f0'
  };

  const tdStyle: JSX.CSSProperties = {
    'padding': '14px 16px',
    'border-bottom': '1px solid #f1f5f9',
    'font-size': '14px',
    'color': '#334155'
  };

  const linkStyle: JSX.CSSProperties = {
    'color': '#3b82f6',
    'text-decoration': 'none',
    'font-weight': '500'
  };

  const badgeStyle = (color: string): JSX.CSSProperties => ({
    'display': 'inline-flex',
    'align-items': 'center',
    'padding': '4px 10px',
    'border-radius': '20px',
    'font-size': '12px',
    'font-weight': '500',
    'background': `${color}15`,
    'color': color
  });

  const actionBtnStyle: JSX.CSSProperties = {
    'padding': '6px 12px',
    'border': '1px solid #e2e8f0',
    'border-radius': '6px',
    'background': 'white',
    'color': '#475569',
    'font-size': '12px',
    'cursor': 'pointer',
    'margin-right': '8px'
  };

  const renderOverview = () => (
    <>
      <div style={statsGridStyle}>
        <div style={statCardStyle('#3b82f6')} onClick={() => setActiveTab('adapters')}>
          <div style={{ 'font-size': '12px', 'color': '#64748b', 'margin-bottom': '8px' }}>ADAPTERS</div>
          <div style={{ 'font-size': '32px', 'font-weight': '700', 'color': '#1e293b' }}>{stats().adapters}</div>
          <div style={{ 'font-size': '13px', 'color': '#22c55e' }}>{stats().lockedAdapters} locked</div>
        </div>
        <div style={statCardStyle('#8b5cf6')} onClick={() => setActiveTab('fieldMappings')}>
          <div style={{ 'font-size': '12px', 'color': '#64748b', 'margin-bottom': '8px' }}>FIELD MAPPINGS</div>
          <div style={{ 'font-size': '32px', 'font-weight': '700', 'color': '#1e293b' }}>{stats().fieldMappings}</div>
          <div style={{ 'font-size': '13px', 'color': '#64748b' }}>Select adapter to view</div>
        </div>
        <div style={statCardStyle('#f59e0b')} onClick={() => setActiveTab('accountMappings')}>
          <div style={{ 'font-size': '12px', 'color': '#64748b', 'margin-bottom': '8px' }}>ACCOUNT MAPPINGS</div>
          <div style={{ 'font-size': '32px', 'font-weight': '700', 'color': '#1e293b' }}>{stats().accountMappings}</div>
        </div>
        <div style={statCardStyle('#10b981')} onClick={() => setActiveTab('learnedRules')}>
          <div style={{ 'font-size': '12px', 'color': '#64748b', 'margin-bottom': '8px' }}>LEARNED RULES</div>
          <div style={{ 'font-size': '32px', 'font-weight': '700', 'color': '#1e293b' }}>{stats().learnedRules}</div>
        </div>
        <div style={statCardStyle('#ef4444')}>
          <div style={{ 'font-size': '12px', 'color': '#64748b', 'margin-bottom': '8px' }}>PENDING SUGGESTIONS</div>
          <div style={{ 'font-size': '32px', 'font-weight': '700', 'color': '#1e293b' }}>{stats().pendingSuggestions}</div>
        </div>
      </div>

      {/* Quick Links */}
      <div style={{ 'display': 'grid', 'grid-template-columns': 'repeat(auto-fit, minmax(300px, 1fr))', 'gap': '16px' }}>
        <div style={{ 'background': 'white', 'border-radius': '12px', 'padding': '20px', 'box-shadow': '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ 'margin': '0 0 16px 0', 'font-size': '16px', 'color': '#1e293b' }}>Quick Actions</h3>
          <div style={{ 'display': 'flex', 'flex-direction': 'column', 'gap': '8px' }}>
            <A href="/supervision/adapters" style={{ ...linkStyle, 'padding': '12px', 'background': '#f8fafc', 'border-radius': '8px', 'display': 'block' }}>
              View All Adapters →
            </A>
            <A href="/supervision/account-mappings" style={{ ...linkStyle, 'padding': '12px', 'background': '#f8fafc', 'border-radius': '8px', 'display': 'block' }}>
              Manage Account Mappings →
            </A>
          </div>
        </div>

        <div style={{ 'background': 'white', 'border-radius': '12px', 'padding': '20px', 'box-shadow': '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ 'margin': '0 0 16px 0', 'font-size': '16px', 'color': '#1e293b' }}>Recent Adapters</h3>
          <For each={supervisionStore.adapters().slice(0, 5)}>
            {(adapter) => (
              <div style={{ 'display': 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'padding': '8px 0', 'border-bottom': '1px solid #f1f5f9' }}>
                <A href={`/supervision/adapters/${adapter.id}`} style={linkStyle}>{adapter.name}</A>
                <span style={badgeStyle(getLockColor(adapter.isLocked))}>
                  {adapter.isLocked ? 'Locked' : 'Unlocked'}
                </span>
              </div>
            )}
          </For>
        </div>
      </div>
    </>
  );

  const renderAdaptersTable = () => (
    <>
      <input
        type="text"
        placeholder="Search adapters..."
        style={searchStyle}
        value={searchTerm()}
        onInput={(e) => setSearchTerm(e.currentTarget.value)}
      />
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>Source Type</th>
            <th style={thStyle}>Confidence</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          <For each={filteredAdapters()}>
            {(adapter) => (
              <tr>
                <td style={tdStyle}>
                  <A href={`/supervision/adapters/${adapter.id}`} style={linkStyle}>
                    {adapter.name || adapter.displayName}
                  </A>
                </td>
                <td style={tdStyle}>{adapter.sourceType || '-'}</td>
                <td style={tdStyle}>
                  <span style={{ 'color': getConfidenceColor(adapter.confidence) }}>
                    {Math.round((adapter.confidence || 0) * 100)}%
                  </span>
                </td>
                <td style={tdStyle}>
                  <span style={badgeStyle(getLockColor(adapter.isLocked))}>
                    {adapter.isLocked ? '🔒 Locked' : '🔓 Unlocked'}
                  </span>
                </td>
                <td style={tdStyle}>
                  <A href={`/supervision/adapters/${adapter.id}`} style={actionBtnStyle}>
                    View
                  </A>
                  <button
                    style={actionBtnStyle}
                    onClick={() => loadAdapterFieldMappings(adapter.id)}
                  >
                    Load Mappings
                  </button>
                  <button
                    style={actionBtnStyle}
                    onClick={() => adapter.isLocked
                      ? supervisionStore.unlockAdapter(adapter.id)
                      : supervisionStore.lockAdapter(adapter.id, 'Manual lock')
                    }
                  >
                    {adapter.isLocked ? 'Unlock' : 'Lock'}
                  </button>
                </td>
              </tr>
            )}
          </For>
        </tbody>
      </table>
      <Show when={filteredAdapters().length === 0}>
        <div style={{ 'text-align': 'center', 'padding': '40px', 'color': '#64748b' }}>
          No adapters found
        </div>
      </Show>
    </>
  );

  const renderFieldMappingsTable = () => (
    <>
      <Show when={!selectedAdapterId()}>
        <div style={{ 'text-align': 'center', 'padding': '40px', 'background': 'white', 'border-radius': '12px' }}>
          <p style={{ 'color': '#64748b', 'margin-bottom': '16px' }}>Select an adapter to view its field mappings</p>
          <select
            style={{ 'padding': '10px 16px', 'border': '1px solid #e2e8f0', 'border-radius': '8px', 'font-size': '14px' }}
            onChange={(e) => loadAdapterFieldMappings(e.currentTarget.value)}
          >
            <option value="">Select Adapter...</option>
            <For each={supervisionStore.adapters()}>
              {(adapter) => <option value={adapter.id}>{adapter.name}</option>}
            </For>
          </select>
        </div>
      </Show>
      <Show when={selectedAdapterId()}>
        <div style={{ 'margin-bottom': '16px', 'display': 'flex', 'justify-content': 'space-between', 'align-items': 'center' }}>
          <div>
            <span style={{ 'color': '#64748b' }}>Showing mappings for: </span>
            <strong>{supervisionStore.adapters().find(a => a.id === selectedAdapterId())?.name}</strong>
          </div>
          <button style={actionBtnStyle} onClick={() => setSelectedAdapterId(null)}>
            Change Adapter
          </button>
        </div>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Source Field</th>
              <th style={thStyle}>Target Field</th>
              <th style={thStyle}>Transform</th>
              <th style={thStyle}>Confidence</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            <For each={supervisionStore.fieldMappings()}>
              {(mapping) => (
                <tr>
                  <td style={{ ...tdStyle, 'font-family': 'monospace' }}>{mapping.sourceField}</td>
                  <td style={{ ...tdStyle, 'font-family': 'monospace' }}>{mapping.targetField}</td>
                  <td style={tdStyle}>{mapping.transform?.type || 'direct'}</td>
                  <td style={tdStyle}>
                    <span style={{ 'color': getConfidenceColor(mapping.confidence) }}>
                      {Math.round((mapping.confidence || 0) * 100)}%
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={badgeStyle(getLockColor(mapping.isLocked))}>
                      {mapping.isLocked ? '🔒 Locked' : '🔓 Unlocked'}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <A href={`/supervision/adapters/${selectedAdapterId()}?mapping=${mapping.id}`} style={actionBtnStyle}>
                      Edit
                    </A>
                    <button
                      style={actionBtnStyle}
                      onClick={() => mapping.isLocked
                        ? supervisionStore.unlockFieldMapping(selectedAdapterId()!, mapping.id)
                        : supervisionStore.lockFieldMapping(selectedAdapterId()!, mapping.id, 'Manual lock')
                      }
                    >
                      {mapping.isLocked ? 'Unlock' : 'Lock'}
                    </button>
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
        <Show when={supervisionStore.fieldMappings().length === 0}>
          <div style={{ 'text-align': 'center', 'padding': '40px', 'color': '#64748b' }}>
            No field mappings found for this adapter
          </div>
        </Show>
      </Show>
    </>
  );

  const renderAccountMappingsTable = () => (
    <>
      <input
        type="text"
        placeholder="Search account mappings..."
        style={searchStyle}
        value={searchTerm()}
        onInput={(e) => setSearchTerm(e.currentTarget.value)}
      />
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Transaction Type</th>
            <th style={thStyle}>Debit Account</th>
            <th style={thStyle}>Credit Account</th>
            <th style={thStyle}>Usage</th>
            <th style={thStyle}>Confidence</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          <For each={filteredAccountMappings()}>
            {(mapping) => (
              <tr>
                <td style={tdStyle}>
                  <strong>{mapping.transactionType}</strong>
                  <Show when={mapping.source === 'AI_GENERATED'}>
                    <span style={{ 'margin-left': '8px', 'font-size': '11px', 'color': '#3b82f6' }}>🤖</span>
                  </Show>
                </td>
                <td style={tdStyle}>
                  <div style={{ 'font-family': 'monospace', 'font-weight': '600' }}>
                    {mapping.debitAccount?.code || mapping.accountCode || '-'}
                  </div>
                  <div style={{ 'font-size': '11px', 'color': '#64748b' }}>
                    {mapping.debitAccount?.type || ''}
                  </div>
                </td>
                <td style={tdStyle}>
                  <div style={{ 'font-family': 'monospace', 'font-weight': '600' }}>
                    {mapping.creditAccount?.code || '-'}
                  </div>
                  <div style={{ 'font-size': '11px', 'color': '#64748b' }}>
                    {mapping.creditAccount?.type || ''}
                  </div>
                </td>
                <td style={tdStyle}>
                  <div>{mapping.usageCount || 0} uses</div>
                  <div style={{ 'font-size': '11px', 'color': getConfidenceColor(mapping.successRate || 0) }}>
                    {Math.round((mapping.successRate || 0) * 100)}% success
                  </div>
                </td>
                <td style={tdStyle}>
                  <span style={{ 'color': getConfidenceColor(mapping.confidence || 0) }}>
                    {Math.round((mapping.confidence || 0) * 100)}%
                  </span>
                </td>
                <td style={tdStyle}>
                  <span style={badgeStyle(getLockColor(mapping.isLocked || false))}>
                    {mapping.isLocked ? (mapping.lockInfo?.status === 'AI_LOCKED' ? '🔐 AI Locked' : '🔒 Locked') : '🔓 Unlocked'}
                  </span>
                </td>
                <td style={tdStyle}>
                  <A href={`/supervision/account-mappings?edit=${mapping.id}`} style={actionBtnStyle}>
                    View
                  </A>
                </td>
              </tr>
            )}
          </For>
        </tbody>
      </table>
      <Show when={filteredAccountMappings().length === 0}>
        <div style={{ 'text-align': 'center', 'padding': '40px', 'color': '#64748b' }}>
          No account mappings found
        </div>
      </Show>
    </>
  );

  // Layer color mapping for 9-layer accounting system
  const layerColors: Record<string, string> = {
    revenue: '#10b981',    // Green
    payment: '#3b82f6',    // Blue
    tax: '#f59e0b',        // Amber
    cogs: '#ef4444',       // Red
    inventory: '#8b5cf6',  // Purple
    discount: '#ec4899',   // Pink
    fee: '#f97316',        // Orange
    receivable: '#06b6d4', // Cyan
    payable: '#6366f1',    // Indigo
  };

  const renderLayeredRulesTable = () => (
    <>
      {/* Layer Stats - 9-Layer Accounting System */}
      <div style={{ 'display': 'flex', 'flex-wrap': 'wrap', 'gap': '8px', 'margin-bottom': '16px' }}>
        {Object.entries(layerColors).map(([layer, color]) => (
          <div style={{
            'background': `${color}15`,
            'padding': '8px 14px',
            'border-radius': '6px',
            'border-left': `3px solid ${color}`,
            'min-width': '80px'
          }}>
            <div style={{ 'font-size': '10px', 'color': color, 'font-weight': '600', 'text-transform': 'uppercase' }}>{layer}</div>
            <div style={{ 'font-size': '20px', 'font-weight': '700' }}>{(stats().layeredByLayer as any)[layer] || 0}</div>
          </div>
        ))}
        <div style={{ 'margin-left': 'auto', 'display': 'flex', 'gap': '8px', 'align-items': 'center' }}>
          <button
            style={{ ...actionBtnStyle, 'background': '#f59e0b', 'color': 'white' }}
            onClick={() => supervisionStore.findDuplicates().then(r => console.log('Duplicates:', r))}
          >
            Find Duplicates
          </button>
          <button
            style={{ ...actionBtnStyle, 'background': '#ef4444', 'color': 'white' }}
            onClick={() => supervisionStore.deduplicateRules().then(r => console.log('Deduplicated:', r))}
          >
            Auto-Deduplicate
          </button>
        </div>
      </div>

      <input
        type="text"
        placeholder="Search layered rules by name, layer, type, transaction..."
        style={searchStyle}
        value={searchTerm()}
        onInput={(e) => setSearchTerm(e.currentTarget.value)}
      />
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Rule / Criteria</th>
            <th style={thStyle}>Layer</th>
            <th style={thStyle}>Account</th>
            <th style={thStyle}>Side</th>
            <th style={thStyle}>Usage</th>
            <th style={thStyle}>Confidence</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          <For each={filteredLayeredRules()}>
            {(rule) => {
              const lockStatus = rule.lock?.status || 'unlocked';
              const isLocked = lockStatus !== 'unlocked';
              const confidence = rule.stats?.confidence ?? rule.confidence ?? 0;
              const successRate = rule.stats?.successRate ?? rule.successRate ?? 0;
              const usageCount = rule.stats?.usageCount ?? rule.usageCount ?? 0;
              return (
                <tr>
                  <td style={tdStyle}>
                    <strong>{rule.displayName || rule.name || 'Rule'}</strong>
                    <div style={{ 'font-size': '11px', 'color': '#64748b', 'max-width': '250px' }}>
                      {rule.criteriaDescription || (
                        <>
                          {rule.criteria?.transactionType && `Type: ${rule.criteria.transactionType}`}
                          {rule.criteria?.itemType && ` | Item: ${rule.criteria.itemType}`}
                          {rule.criteria?.paymentMethod && ` | Pay: ${rule.criteria.paymentMethod}`}
                        </>
                      )}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <span style={badgeStyle(getLayerColor(rule.layer))}>
                      {rule.layer?.toUpperCase()}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ 'font-family': 'monospace', 'font-size': '12px' }}>
                      <span style={{ 'color': rule.side === 'debit' ? '#3b82f6' : '#10b981', 'font-weight': '600' }}>
                        {rule.account?.code || '-'}
                      </span>
                    </div>
                    <div style={{ 'font-size': '11px', 'color': '#64748b' }}>
                      {rule.account?.name}
                    </div>
                    <div style={{ 'font-size': '10px', 'color': '#94a3b8' }}>
                      {rule.account?.type}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      'padding': '2px 8px',
                      'border-radius': '4px',
                      'font-size': '11px',
                      'font-weight': '600',
                      'background': rule.side === 'debit' ? '#3b82f615' : '#10b98115',
                      'color': rule.side === 'debit' ? '#3b82f6' : '#10b981'
                    }}>
                      {rule.side?.toUpperCase()}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div>{usageCount} uses</div>
                    <div style={{ 'font-size': '11px', 'color': getConfidenceColor(successRate) }}>
                      {Math.round(successRate * 100)}% success
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ 'color': getConfidenceColor(confidence) }}>
                      {Math.round(confidence * 100)}%
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={badgeStyle(
                      lockStatus === 'pending_review' ? '#f59e0b' :
                      lockStatus === 'ai_locked' ? '#8b5cf6' :
                      lockStatus === 'user_locked' ? '#22c55e' : '#9ca3af'
                    )}>
                      {lockStatus === 'pending_review' ? '⏳ Review' :
                       lockStatus === 'ai_locked' ? '🤖 AI' :
                       lockStatus === 'user_locked' ? '🔒 Locked' : '🔓 Open'}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <button style={actionBtnStyle} onClick={() => console.log('View rule', rule)}>
                      View
                    </button>
                    <button
                      style={actionBtnStyle}
                      onClick={() => isLocked
                        ? supervisionStore.unlockLayeredRule(rule.id)
                        : supervisionStore.lockLayeredRule(rule.id, 'Manual lock')
                      }
                    >
                      {isLocked ? 'Unlock' : 'Lock'}
                    </button>
                  </td>
                </tr>
              );
            }}
          </For>
        </tbody>
      </table>
      <Show when={filteredLayeredRules().length === 0}>
        <div style={{ 'text-align': 'center', 'padding': '40px', 'color': '#64748b' }}>
          No layered rules found.
          <button
            style={{ ...actionBtnStyle, 'margin-left': '12px' }}
            onClick={() => supervisionStore.migrateToLayeredRules().then(r => console.log('Migrated:', r))}
          >
            Migrate from Account Mappings
          </button>
        </div>
      </Show>
    </>
  );

  const renderLearnedRulesTable = () => (
    <>
      <input
        type="text"
        placeholder="Search learned rules..."
        style={searchStyle}
        value={searchTerm()}
        onInput={(e) => setSearchTerm(e.currentTarget.value)}
      />
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Source</th>
            <th style={thStyle}>Confidence</th>
            <th style={thStyle}>Success Rate</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          <For each={filteredLearnedRules()}>
            {(rule) => (
              <tr>
                <td style={tdStyle}>
                  <strong>{rule.name}</strong>
                  <Show when={rule.description}>
                    <div style={{ 'font-size': '12px', 'color': '#64748b' }}>{rule.description}</div>
                  </Show>
                </td>
                <td style={tdStyle}>{rule.ruleType}</td>
                <td style={tdStyle}>{rule.sourceType}</td>
                <td style={tdStyle}>
                  <span style={{ 'color': getConfidenceColor(rule.confidence) }}>
                    {Math.round((rule.confidence || 0) * 100)}%
                  </span>
                </td>
                <td style={tdStyle}>
                  <span style={{ 'color': rule.successCount > rule.failureCount ? '#22c55e' : '#ef4444' }}>
                    {rule.successCount}/{rule.processedCount}
                  </span>
                </td>
                <td style={tdStyle}>
                  <span style={badgeStyle(getLockColor(rule.isLocked))}>
                    {rule.isLocked ? '🔒 Locked' : '🔓 Unlocked'}
                  </span>
                </td>
                <td style={tdStyle}>
                  <button style={actionBtnStyle} onClick={() => console.log('Edit rule', rule.id)}>
                    Edit
                  </button>
                  <button style={actionBtnStyle} onClick={() => console.log('Test rule', rule.id)}>
                    Test
                  </button>
                  <button
                    style={actionBtnStyle}
                    onClick={() => rule.isLocked
                      ? supervisionStore.unlockLearnedRule(rule.id)
                      : supervisionStore.lockLearnedRule(rule.id, 'Manual lock')
                    }
                  >
                    {rule.isLocked ? 'Unlock' : 'Lock'}
                  </button>
                </td>
              </tr>
            )}
          </For>
        </tbody>
      </table>
      <Show when={filteredLearnedRules().length === 0}>
        <div style={{ 'text-align': 'center', 'padding': '40px', 'color': '#64748b' }}>
          No learned rules found
        </div>
      </Show>
    </>
  );

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h1 style={titleStyle}>AI SUPERVISION</h1>
        <button style={{ ...actionBtnStyle, 'background': '#3b82f6', 'color': 'white' }} onClick={loadAllData}>
          ↻ Refresh Data
        </button>
      </div>

      {/* Tabs */}
      <div style={tabsStyle}>
        <button style={tabStyle(activeTab() === 'overview')} onClick={() => setActiveTab('overview')}>
          Overview
        </button>
        <button style={tabStyle(activeTab() === 'adapters')} onClick={() => setActiveTab('adapters')}>
          Adapters ({stats().adapters})
        </button>
       
        <button style={tabStyle(activeTab() === 'layeredRules')} onClick={() => setActiveTab('layeredRules')}>
          ⭐ Layered Rules ({stats().layeredRules})
        </button>
      </div>

      {/* Loading State */}
      <Show when={isLoading()}>
        <div style={{ 'text-align': 'center', 'padding': '60px', 'color': '#64748b' }}>
          Loading supervision data...
        </div>
      </Show>

      {/* Content */}
      <Show when={!isLoading()}>
        <Show when={activeTab() === 'overview'}>{renderOverview()}</Show>
        <Show when={activeTab() === 'adapters'}>{renderAdaptersTable()}</Show>
        <Show when={activeTab() === 'fieldMappings'}>{renderFieldMappingsTable()}</Show>
        <Show when={activeTab() === 'layeredRules'}>{renderLayeredRulesTable()}</Show>
        <Show when={activeTab() === 'accountMappings'}>{renderAccountMappingsTable()}</Show>
        <Show when={activeTab() === 'learnedRules'}>{renderLearnedRulesTable()}</Show>
      </Show>
    </div>
  );
};

export default SupervisionDashboard;
