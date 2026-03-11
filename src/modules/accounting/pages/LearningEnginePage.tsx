/**
 * AI Learning Engine Dashboard
 * Comprehensive dashboard for AI-powered accounting automation
 */

import { Component, createSignal, createResource, Show, For, onMount } from 'solid-js';
import { Card, Button, Modal } from '../../ui';
import { useTranslation } from '../../../translations';
import {
  accountingApi,
  SuggestedRule,
  AutomaticRule,
  LearningStats,
  EntryBook
} from '../services/accountingApi';

const LearningEnginePage: Component = () => {
  const { t } = useTranslation();

  // Tab state
  const [activeTab, setActiveTab] = createSignal<'dashboard' | 'suggestions' | 'active-rules' | 'entry-books'>('dashboard');

  // Dashboard state
  const [stats, setStats] = createSignal<LearningStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = createSignal(false);

  // Suggestions state
  const [suggestions, setSuggestions] = createSignal<SuggestedRule[]>([]);
  const [suggestionsStatus, setSuggestionsStatus] = createSignal<'pending' | 'approved' | 'rejected'>('pending');
  const [isLoadingSuggestions, setIsLoadingSuggestions] = createSignal(false);
  const [isGenerating, setIsGenerating] = createSignal(false);
  const [generateCollection, setGenerateCollection] = createSignal('Invoices');
  const [generateSampleSize, setGenerateSampleSize] = createSignal(10);

  // Active rules state
  const [activeRules, setActiveRules] = createSignal<AutomaticRule[]>([]);
  const [isLoadingRules, setIsLoadingRules] = createSignal(false);

  // Entry books state
  const [entryBooks, setEntryBooks] = createSignal<EntryBook[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = createSignal(false);
  const [expandedEntry, setExpandedEntry] = createSignal<string | null>(null);

  // Modals
  const [selectedRule, setSelectedRule] = createSignal<SuggestedRule | AutomaticRule | null>(null);
  const [showRuleModal, setShowRuleModal] = createSignal(false);
  const [showRejectModal, setShowRejectModal] = createSignal(false);
  const [rejectReason, setRejectReason] = createSignal('');

  // Training state
  const [isTraining, setIsTraining] = createSignal(false);
  const [trainingResult, setTrainingResult] = createSignal<any>(null);

  // Load initial data
  onMount(async () => {
    await loadStats();
    await loadSuggestions();
  });

  const loadStats = async () => {
    setIsLoadingStats(true);
    try {
      const result = await accountingApi.learning.getStats();
      setStats(result);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const loadSuggestions = async () => {
    setIsLoadingSuggestions(true);
    try {
      const result = await accountingApi.learning.getSuggestions(suggestionsStatus());
      setSuggestions(result || []);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const loadActiveRules = async () => {
    setIsLoadingRules(true);
    try {
      const result = await accountingApi.learning.getAutomaticRules();
      setActiveRules(result || []);
    } catch (error) {
      console.error('Error loading active rules:', error);
    } finally {
      setIsLoadingRules(false);
    }
  };

  const loadEntryBooks = async () => {
    setIsLoadingEntries(true);
    try {
      const result = await accountingApi.entryBooks.getAll({ limit: 100 });
      setEntryBooks(result || []);
    } catch (error) {
      console.error('Error loading entry books:', error);
    } finally {
      setIsLoadingEntries(false);
    }
  };

  const handleGenerateSuggestions = async () => {
    setIsGenerating(true);
    try {
      const result = await accountingApi.learning.generateSuggestions(
        generateCollection(),
        generateSampleSize(),
        'invoice_created'
      );
      if (result) {
        alert(`Generated ${result.suggestedRules} rule suggestions!`);
        await loadSuggestions();
      }
    } catch (error) {
      console.error('Error generating suggestions:', error);
      alert('Error generating suggestions');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApproveSuggestion = async (id: string) => {
    try {
      const result = await accountingApi.learning.approveSuggestion(id);
      if (result.success) {
        alert('Rule approved and activated!');
        await loadSuggestions();
        await loadStats();
      }
    } catch (error) {
      console.error('Error approving suggestion:', error);
      alert('Error approving suggestion');
    }
  };

  const handleRejectSuggestion = async () => {
    const rule = selectedRule();
    if (!rule || !rejectReason()) return;

    try {
      const result = await accountingApi.learning.rejectSuggestion(rule.id, rejectReason());
      if (result.success) {
        setShowRejectModal(false);
        setRejectReason('');
        setSelectedRule(null);
        await loadSuggestions();
      }
    } catch (error) {
      console.error('Error rejecting suggestion:', error);
      alert('Error rejecting suggestion');
    }
  };

  const handleToggleRule = async (ruleId: string, isActive: boolean) => {
    try {
      await accountingApi.learning.toggleRule(ruleId, !isActive);
      await loadActiveRules();
    } catch (error) {
      console.error('Error toggling rule:', error);
    }
  };

  const handleTrain = async (type: 'invoices' | 'all') => {
    setIsTraining(true);
    setTrainingResult(null);
    try {
      const result = type === 'invoices'
        ? await accountingApi.learning.trainWithInvoices({ createEntryBooks: true })
        : await accountingApi.learning.trainWithAllSources({ createEntryBooks: true });
      setTrainingResult(result);
      await loadStats();
    } catch (error) {
      console.error('Error training:', error);
      alert('Error during training');
    } finally {
      setIsTraining(false);
    }
  };

  const handleResetLearnings = async () => {
    if (!confirm('Are you sure you want to reset all learnings? This cannot be undone.')) return;
    try {
      await accountingApi.learning.resetLearnings(true);
      await loadStats();
      alert('Learnings reset successfully');
    } catch (error) {
      console.error('Error resetting learnings:', error);
    }
  };

  // Tab change handler
  const handleTabChange = async (tab: typeof activeTab extends () => infer T ? T : never) => {
    setActiveTab(tab);
    if (tab === 'suggestions') await loadSuggestions();
    if (tab === 'active-rules') await loadActiveRules();
    if (tab === 'entry-books') await loadEntryBooks();
    if (tab === 'dashboard') await loadStats();
  };

  // Styles
  const pageStyle = { padding: '2rem', 'max-width': '1400px', margin: '0 auto' };

  const headerStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '2rem'
  };

  const tabsStyle = {
    display: 'flex',
    gap: '0.5rem',
    'margin-bottom': '2rem',
    'border-bottom': '2px solid var(--border-color)',
    'padding-bottom': '0.5rem'
  };

  const tabStyle = (isActive: boolean) => ({
    padding: '0.75rem 1.5rem',
    border: 'none',
    background: isActive ? 'var(--primary-color)' : 'transparent',
    color: isActive ? 'white' : 'var(--text-color)',
    'border-radius': 'var(--border-radius-sm)',
    cursor: 'pointer',
    'font-weight': '500',
    transition: 'all 0.2s ease'
  });

  const statsGridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1.5rem',
    'margin-bottom': '2rem'
  };

  const statCardStyle = {
    padding: '1.5rem',
    background: 'var(--surface-color)',
    'border-radius': 'var(--border-radius)',
    border: '1px solid var(--border-color)',
    'text-align': 'center'
  };

  const statValueStyle = {
    'font-size': '2rem',
    'font-weight': '700',
    color: 'var(--primary-color)',
    'margin-bottom': '0.5rem'
  };

  const statLabelStyle = {
    'font-size': '0.875rem',
    color: 'var(--text-muted)'
  };

  const cardStyle = {
    padding: '1.5rem',
    background: 'var(--surface-color)',
    'border-radius': 'var(--border-radius)',
    border: '1px solid var(--border-color)',
    'margin-bottom': '1rem'
  };

  const ruleCardStyle = {
    ...cardStyle,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  };

  const badgeStyle = (color: string) => ({
    padding: '0.25rem 0.75rem',
    'border-radius': '9999px',
    'font-size': '0.75rem',
    'font-weight': '500',
    background: `${color}20`,
    color: color
  });

  const buttonGroupStyle = {
    display: 'flex',
    gap: '0.5rem',
    'margin-top': '1rem'
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount));
  };

  return (
    <div style={pageStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h1 style={{ margin: 0, 'font-size': '1.75rem' }}>
            {t('learning.title', 'AI Learning Engine')}
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0 0 0' }}>
            {t('learning.subtitle', 'Automatic accounting with AI-powered rules')}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={tabsStyle}>
        <button style={tabStyle(activeTab() === 'dashboard')} onClick={() => handleTabChange('dashboard')}>
          Dashboard
        </button>
        <button style={tabStyle(activeTab() === 'suggestions')} onClick={() => handleTabChange('suggestions')}>
          AI Suggestions
        </button>
        <button style={tabStyle(activeTab() === 'active-rules')} onClick={() => handleTabChange('active-rules')}>
          Active Rules
        </button>
        <button style={tabStyle(activeTab() === 'entry-books')} onClick={() => handleTabChange('entry-books')}>
          Entry Books
        </button>
      </div>

      {/* Dashboard Tab */}
      <Show when={activeTab() === 'dashboard'}>
        {/* Stats Cards */}
        <div style={statsGridStyle}>
          <div style={statCardStyle}>
            <div style={statValueStyle}>{stats()?.adapters?.count || 0}</div>
            <div style={statLabelStyle}>Adapters</div>
            <div style={{ 'font-size': '0.8rem', color: 'var(--text-muted)' }}>
              {((stats()?.adapters?.avgConfidence || 0) * 100).toFixed(0)}% confidence
            </div>
          </div>
          <div style={statCardStyle}>
            <div style={statValueStyle}>{stats()?.accountMappings?.count || 0}</div>
            <div style={statLabelStyle}>Account Mappings</div>
            <div style={{ 'font-size': '0.8rem', color: 'var(--text-muted)' }}>
              {((stats()?.accountMappings?.avgSuccessRate || 0) * 100).toFixed(0)}% success
            </div>
          </div>
          <div style={statCardStyle}>
            <div style={statValueStyle}>{stats()?.rules?.count || 0}</div>
            <div style={statLabelStyle}>Active Rules</div>
            <div style={{ 'font-size': '0.8rem', color: 'var(--text-muted)' }}>
              {((stats()?.rules?.avgSuccessRate || 0) * 100).toFixed(0)}% success
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 1rem 0' }}>Quick Actions</h3>
          <div style={{ display: 'flex', gap: '1rem', 'flex-wrap': 'wrap' }}>
            <Button
              variant="primary"
              onClick={() => handleTabChange('suggestions')}
              style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
            >
              Generate AI Rules
            </Button>
            <Button variant="secondary" onClick={() => handleTrain('invoices')} disabled={isTraining()}>
              {isTraining() ? 'Training...' : 'Train with Invoices'}
            </Button>
            <Button variant="secondary" onClick={() => handleTrain('all')} disabled={isTraining()}>
              {isTraining() ? 'Training...' : 'Train All Sources'}
            </Button>
            <Button variant="outline" onClick={handleResetLearnings} style={{ color: '#ef4444', 'border-color': '#ef4444' }}>
              Reset Learnings
            </Button>
          </div>
        </div>

        {/* Training Result */}
        <Show when={trainingResult()}>
          <div style={{ ...cardStyle, background: '#e8f5e9', 'border-color': '#4caf50' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#2e7d32' }}>Training Complete!</h4>
            <div style={{ display: 'grid', 'grid-template-columns': 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem' }}>
              <div><strong>{trainingResult()?.total}</strong> Total</div>
              <div><strong style={{ color: '#4caf50' }}>{trainingResult()?.successful}</strong> Successful</div>
              <div><strong style={{ color: '#f44336' }}>{trainingResult()?.failed}</strong> Failed</div>
              <div><strong>{trainingResult()?.adaptersImproved}</strong> Adapters Improved</div>
              <div><strong>{trainingResult()?.accountsLearned}</strong> Accounts Learned</div>
              <div><strong>{((trainingResult()?.averageConfidence || 0) * 100).toFixed(0)}%</strong> Confidence</div>
            </div>
          </div>
        </Show>
      </Show>

      {/* Suggestions Tab */}
      <Show when={activeTab() === 'suggestions'}>
        {/* Generate Controls */}
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 1rem 0' }}>Generate AI Rules</h3>
          <div style={{ display: 'flex', gap: '1rem', 'align-items': 'flex-end', 'flex-wrap': 'wrap' }}>
            <div>
              <label style={{ display: 'block', 'font-size': '0.875rem', 'margin-bottom': '0.25rem' }}>Collection</label>
              <select
                value={generateCollection()}
                onChange={(e) => setGenerateCollection(e.target.value)}
                style={{ padding: '0.5rem', 'border-radius': '4px', border: '1px solid var(--border-color)' }}
              >
                <option value="Invoices">Invoices</option>
                <option value="InventoryMovements">Inventory Movements</option>
                <option value="Payments">Payments</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', 'font-size': '0.875rem', 'margin-bottom': '0.25rem' }}>Sample Size</label>
              <input
                type="number"
                value={generateSampleSize()}
                onInput={(e) => setGenerateSampleSize(parseInt(e.target.value) || 10)}
                min="5"
                max="50"
                style={{ padding: '0.5rem', 'border-radius': '4px', border: '1px solid var(--border-color)', width: '80px' }}
              />
            </div>
            <Button
              variant="primary"
              onClick={handleGenerateSuggestions}
              disabled={isGenerating()}
              style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
            >
              {isGenerating() ? 'Generating...' : 'Generate Rules'}
            </Button>
          </div>
        </div>

        {/* Status Filter */}
        <div style={{ display: 'flex', gap: '0.5rem', 'margin-bottom': '1rem' }}>
          <For each={['pending', 'approved', 'rejected'] as const}>
            {(status) => (
              <button
                style={{
                  padding: '0.5rem 1rem',
                  border: suggestionsStatus() === status ? 'none' : '1px solid var(--border-color)',
                  background: suggestionsStatus() === status ? 'var(--primary-color)' : 'white',
                  color: suggestionsStatus() === status ? 'white' : 'var(--text-color)',
                  'border-radius': '4px',
                  cursor: 'pointer'
                }}
                onClick={() => { setSuggestionsStatus(status); loadSuggestions(); }}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            )}
          </For>
        </div>

        {/* Suggestions List */}
        <Show when={isLoadingSuggestions()}>
          <div style={{ 'text-align': 'center', padding: '2rem' }}>Loading suggestions...</div>
        </Show>

        <Show when={!isLoadingSuggestions() && suggestions().length === 0}>
          <div style={{ ...cardStyle, 'text-align': 'center', color: 'var(--text-muted)' }}>
            No {suggestionsStatus()} suggestions found. Generate some using the button above.
          </div>
        </Show>

        <For each={suggestions()}>
          {(suggestion) => (
            <div style={ruleCardStyle}>
              <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'flex-start' }}>
                <div>
                  <h4 style={{ margin: '0 0 0.5rem 0' }}>{suggestion.name}</h4>
                  <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-muted)', 'font-size': '0.875rem' }}>
                    {suggestion.description}
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', 'flex-wrap': 'wrap' }}>
                    <span style={badgeStyle('#3b82f6')}>{suggestion.eventType}</span>
                    <span style={badgeStyle('#10b981')}>{suggestion.journalEntryTemplate?.lines?.length || 0} lines</span>
                    <span style={badgeStyle('#8b5cf6')}>AI Generated</span>
                  </div>
                </div>
                <div style={{ 'text-align': 'right' }}>
                  <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                    {formatDate(suggestion.generatedAt)}
                  </div>
                  <div style={{ 'font-size': '0.8rem' }}>
                    Analyzed: {suggestion.analyzedInvoices} invoices
                  </div>
                </div>
              </div>

              <Show when={suggestionsStatus() === 'pending'}>
                <div style={buttonGroupStyle}>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); handleApproveSuggestion(suggestion.id); }}
                    style={{ background: '#10b981' }}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); setSelectedRule(suggestion); setShowRuleModal(true); }}
                  >
                    Preview
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); setSelectedRule(suggestion); setShowRejectModal(true); }}
                    style={{ color: '#ef4444', 'border-color': '#ef4444' }}
                  >
                    Reject
                  </Button>
                </div>
              </Show>
            </div>
          )}
        </For>
      </Show>

      {/* Active Rules Tab */}
      <Show when={activeTab() === 'active-rules'}>
        <Show when={isLoadingRules()}>
          <div style={{ 'text-align': 'center', padding: '2rem' }}>Loading rules...</div>
        </Show>

        <Show when={!isLoadingRules() && activeRules().length === 0}>
          <div style={{ ...cardStyle, 'text-align': 'center', color: 'var(--text-muted)' }}>
            No active rules found. Approve some suggestions to create rules.
          </div>
        </Show>

        <For each={activeRules()}>
          {(rule) => (
            <div style={ruleCardStyle}>
              <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'flex-start' }}>
                <div>
                  <h4 style={{ margin: '0 0 0.5rem 0' }}>{rule.name}</h4>
                  <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-muted)', 'font-size': '0.875rem' }}>
                    {rule.description}
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <span style={badgeStyle('#3b82f6')}>{rule.eventType}</span>
                    <span style={badgeStyle(rule.isActive ? '#10b981' : '#ef4444')}>
                      {rule.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <Show when={rule.useAI === 'smart'}>
                      <span style={badgeStyle('#f59e0b')}>Smart AI</span>
                    </Show>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleRule(rule.id, rule.isActive)}
                  >
                    {rule.isActive ? 'Disable' : 'Enable'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setSelectedRule(rule); setShowRuleModal(true); }}
                  >
                    View
                  </Button>
                </div>
              </div>
            </div>
          )}
        </For>
      </Show>

      {/* Entry Books Tab */}
      <Show when={activeTab() === 'entry-books'}>
        <Show when={isLoadingEntries()}>
          <div style={{ 'text-align': 'center', padding: '2rem' }}>Loading entry books...</div>
        </Show>

        <Show when={!isLoadingEntries() && entryBooks().length === 0}>
          <div style={{ ...cardStyle, 'text-align': 'center', color: 'var(--text-muted)' }}>
            No entry books found. Train the system to generate entries from invoices.
          </div>
        </Show>

        <div style={{ background: 'var(--surface-color)', 'border-radius': 'var(--border-radius)', border: '1px solid var(--border-color)' }}>
          <table style={{ width: '100%', 'border-collapse': 'collapse' }}>
            <thead>
              <tr style={{ 'border-bottom': '2px solid var(--border-color)' }}>
                <th style={{ padding: '1rem', 'text-align': 'left' }}>Document</th>
                <th style={{ padding: '1rem', 'text-align': 'left' }}>Description</th>
                <th style={{ padding: '1rem', 'text-align': 'right' }}>Debits</th>
                <th style={{ padding: '1rem', 'text-align': 'right' }}>Credits</th>
                <th style={{ padding: '1rem', 'text-align': 'center' }}>Source</th>
                <th style={{ padding: '1rem', 'text-align': 'center' }}>Balanced</th>
              </tr>
            </thead>
            <tbody>
              <For each={entryBooks()}>
                {(entry) => (
                  <>
                    <tr
                      style={{ 'border-bottom': '1px solid var(--border-color)', cursor: 'pointer' }}
                      onClick={() => setExpandedEntry(expandedEntry() === entry.id ? null : entry.id)}
                    >
                      <td style={{ padding: '0.75rem 1rem' }}>{entry.document}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{entry.description}</td>
                      <td style={{ padding: '0.75rem 1rem', 'text-align': 'right' }}>{formatCurrency(entry.totalDebits)}</td>
                      <td style={{ padding: '0.75rem 1rem', 'text-align': 'right' }}>{formatCurrency(entry.totalCredits)}</td>
                      <td style={{ padding: '0.75rem 1rem', 'text-align': 'center' }}>
                        <span style={badgeStyle(entry.entrySource === 'automatic_rule' ? '#10b981' : '#3b82f6')}>
                          {entry.entrySource}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', 'text-align': 'center' }}>
                        {entry.totalDebits === entry.totalCredits ? '✓' : '✗'}
                      </td>
                    </tr>
                    <Show when={expandedEntry() === entry.id}>
                      <tr>
                        <td colspan="6" style={{ padding: '0 1rem 1rem 1rem', background: 'var(--gray-50)' }}>
                          <div style={{ 'padding-top': '0.5rem' }}>
                            <strong>Journal Lines:</strong>
                            <table style={{ width: '100%', 'margin-top': '0.5rem' }}>
                              <For each={entry.lines}>
                                {(line) => (
                                  <tr>
                                    <td style={{ padding: '0.25rem' }}>{line.accountNumber}</td>
                                    <td style={{ padding: '0.25rem' }}>{line.description}</td>
                                    <td style={{ padding: '0.25rem', 'text-align': 'right' }}>
                                      {line.isDebit ? formatCurrency(line.amount) : '-'}
                                    </td>
                                    <td style={{ padding: '0.25rem', 'text-align': 'right' }}>
                                      {!line.isDebit ? formatCurrency(line.amount) : '-'}
                                    </td>
                                  </tr>
                                )}
                              </For>
                            </table>
                          </div>
                        </td>
                      </tr>
                    </Show>
                  </>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </Show>

      {/* Rule Preview Modal */}
      <Modal isOpen={showRuleModal()} onClose={() => setShowRuleModal(false)} title="Rule Details">
        <Show when={selectedRule()}>
          <div>
            <h4>{selectedRule()?.name}</h4>
            <p style={{ color: 'var(--text-muted)' }}>{selectedRule()?.description}</p>

            <div style={{ 'margin-top': '1rem' }}>
              <strong>Event Type:</strong> {selectedRule()?.eventType}
            </div>

            <div style={{ 'margin-top': '1rem' }}>
              <strong>Journal Entry Template:</strong>
              <div style={{ background: 'var(--gray-50)', padding: '1rem', 'border-radius': '4px', 'margin-top': '0.5rem' }}>
                <div><strong>Description:</strong> {selectedRule()?.journalEntryTemplate?.description}</div>
                <div><strong>Reference:</strong> {selectedRule()?.journalEntryTemplate?.reference}</div>

                <div style={{ 'margin-top': '1rem' }}>
                  <strong>Lines:</strong>
                  <For each={selectedRule()?.journalEntryTemplate?.lines || []}>
                    {(line, index) => (
                      <div style={{ padding: '0.5rem', 'border-bottom': '1px solid var(--border-color)' }}>
                        <div>
                          <span style={{ 'font-weight': '600', color: line.isDebit ? '#ef4444' : '#10b981' }}>
                            {line.isDebit ? 'DR' : 'CR'}
                          </span>
                          {' '}{line.accountExpression}
                        </div>
                        <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                          Amount: {line.amountExpression}
                        </div>
                        <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                          {line.descriptionTemplate}
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', 'justify-content': 'flex-end', 'margin-top': '1.5rem' }}>
              <Button variant="secondary" onClick={() => setShowRuleModal(false)}>Close</Button>
            </div>
          </div>
        </Show>
      </Modal>

      {/* Reject Modal */}
      <Modal isOpen={showRejectModal()} onClose={() => setShowRejectModal(false)} title="Reject Rule">
        <div>
          <p>Please provide a reason for rejecting this rule:</p>
          <textarea
            value={rejectReason()}
            onInput={(e) => setRejectReason(e.target.value)}
            placeholder="Enter rejection reason..."
            style={{
              width: '100%',
              'min-height': '100px',
              padding: '0.75rem',
              'border-radius': '4px',
              border: '1px solid var(--border-color)',
              'margin-top': '0.5rem'
            }}
          />
          <div style={{ display: 'flex', gap: '0.5rem', 'justify-content': 'flex-end', 'margin-top': '1rem' }}>
            <Button variant="secondary" onClick={() => setShowRejectModal(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={handleRejectSuggestion}
              disabled={!rejectReason()}
              style={{ background: '#ef4444' }}
            >
              Reject
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default LearningEnginePage;
