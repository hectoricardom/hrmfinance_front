import { Component, createSignal, createMemo, onMount, For, Show } from 'solid-js';
import { A } from '@solidjs/router';
import { Layout, Card, Button } from '../../ui';
import { useTranslation } from '../../../translations';
import { runAudit } from './auditService';
import { AuditResult, ScoredEntry, ErrorPattern } from './types';
import { accountsStore } from '../stores/accountsStore';
import { accountsApi } from '../../../services/apiAdapter';
import { entryBookStore } from '../../journal/stores/entryBookStore';
import { devLog } from '../../../services/utils';

const TrialBalanceAudit: Component = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = createSignal(false);
  const [auditResult, setAuditResult] = createSignal<AuditResult | null>(null);
  const [expandedEntries, setExpandedEntries] = createSignal<Set<string>>(new Set());
  const [expandedPatternGroups, setExpandedPatternGroups] = createSignal<Set<string>>(new Set());
  const [totalDebits, setTotalDebits] = createSignal(0);
  const [totalCredits, setTotalCredits] = createSignal(0);

  // Group patterns by type
  const groupedPatterns = createMemo(() => {
    const patterns = auditResult()?.patterns || [];
    const groups: Record<string, ErrorPattern[]> = {};

    patterns.forEach(pattern => {
      if (!groups[pattern.type]) {
        groups[pattern.type] = [];
      }
      groups[pattern.type].push(pattern);
    });

    // Convert to array and sort by count (descending)
    return Object.entries(groups)
      .map(([type, items]) => ({
        type,
        patterns: items,
        count: items.length,
        totalAffected: items.reduce((sum, p) => sum + p.affectedEntries.length, 0),
        highestSeverity: items.some(p => p.severity === 'high') ? 'high'
          : items.some(p => p.severity === 'medium') ? 'medium' : 'low'
      }))
      .sort((a, b) => {
        // Sort by severity first, then by count
        const severityOrder = { high: 0, medium: 1, low: 2 };
        const severityDiff = severityOrder[a.highestSeverity as keyof typeof severityOrder]
          - severityOrder[b.highestSeverity as keyof typeof severityOrder];
        if (severityDiff !== 0) return severityDiff;
        return b.count - a.count;
      });
  });

  const togglePatternGroup = (type: string) => {
    const expanded = new Set(expandedPatternGroups());
    if (expanded.has(type)) {
      expanded.delete(type);
    } else {
      expanded.add(type);
    }
    setExpandedPatternGroups(expanded);
  };

  const isPatternGroupExpanded = (type: string) => expandedPatternGroups().has(type);

  onMount(async () => {
    await runAuditAnalysis();
  });

  const runAuditAnalysis = async () => {
    setLoading(true);
    try {
      // Load account balances
      const balances = await accountsApi.getBalances();
      accountsStore.updAccountBalance(balances);

      // Load journal entries
      await entryBookStore.refreshData({});

      // Calculate totals from account balances
      const accounts: any[] = (balances as any)?.accountMap ? Object.values((balances as any).accountMap) : [];
      let debits = 0;
      let credits = 0;

      accounts.forEach((account: any) => {
        const balance = account.balance || 0;
        const accountType = account.accountType || account.type || account.classification || 'Unknown';
        if (accountType === 'Asset' || accountType === 'Expense') {
          if (balance >= 0) debits += balance;
          else credits += Math.abs(balance);
        } else {
          if (balance >= 0) credits += balance;
          else debits += Math.abs(balance);
        }
      });

      setTotalDebits(debits);
      setTotalCredits(credits);

      // Get journal entries
      const entries = entryBookStore.journalEntries || [];

      devLog('📊 Audit Data:', {
        totalDebits: debits,
        totalCredits: credits,
        discrepancy: debits - credits,
        entriesCount: entries.length,
        entriesStatuses: entries.map(e => e.status),
        firstEntry: entries[0]
      });

      // Run audit - include all statuses to ensure entries aren't filtered out
      const result = runAudit(entries, debits, credits, {
        includeStatuses: ['draft', 'posted', 'void'],
        minScore: 0
      });

      devLog('📋 Audit Result:', {
        scoredEntriesCount: result.scoredEntries.length,
        patternsCount: result.patterns.length,
        summary: result.summary
      });

      setAuditResult(result);
    } catch (error) {
      console.error('Error running audit:', error);
    } finally {
      setLoading(false);
    }
  };

  const isBalanced = () => Math.abs((auditResult()?.discrepancy || 0)) < 0.01;

  const toggleExpanded = (entryId: string) => {
    const expanded = new Set(expandedEntries());
    if (expanded.has(entryId)) {
      expanded.delete(entryId);
    } else {
      expanded.add(entryId);
    }
    setExpandedEntries(expanded);
  };

  const getScoreColor = (score: number) => {
    if (score > 70) return { bg: '#ffebee', color: '#d32f2f', label: 'High' };
    if (score > 40) return { bg: '#fff3e0', color: '#f57c00', label: 'Medium' };
    if (score > 20) return { bg: '#fff9c4', color: '#f9a825', label: 'Low' };
    return { bg: '#f5f5f5', color: '#757575', label: 'Normal' };
  };

  const getSeverityColor = (severity: 'high' | 'medium' | 'low') => {
    switch (severity) {
      case 'high':
        return { bg: '#ffebee', color: '#d32f2f', icon: '⚠️' };
      case 'medium':
        return { bg: '#fff3e0', color: '#f57c00', icon: '⚡' };
      case 'low':
        return { bg: '#fff9c4', color: '#f9a825', icon: 'ℹ️' };
    }
  };

  const getPatternLabel = (type: string) => {
    const labels: Record<string, string> = {
      duplicate: 'Duplicate Entries',
      rounding: 'Rounding Errors',
      missing_counterpart: 'Missing Counterpart',
      transposition: 'Digit Transposition',
      imbalance: 'Internal Imbalance'
    };
    return labels[type] || type;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const headerStyle: any = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '2rem',
    'flex-wrap': 'wrap',
    gap: '1rem'
  };

  const summaryCardsStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    'margin-bottom': '2rem'
  };

  const tableHeaderStyle = {
    display: 'grid',
    'grid-template-columns': '100px 120px 120px 1fr 150px 120px 100px',
    gap: '1rem',
    padding: '1rem',
    background: 'var(--primary-color)',
    color: 'white',
    'font-weight': '600',
    'border-radius': 'var(--border-radius-sm) var(--border-radius-sm) 0 0',
    'font-size': '0.9rem'
  };

  const tableRowStyle = {
    display: 'grid',
    'grid-template-columns': '100px 120px 120px 1fr 150px 120px 100px',
    gap: '1rem',
    padding: '0.75rem 1rem',
    'border-bottom': '1px solid var(--border-color)',
    'font-size': '0.9rem',
    'align-items': 'center',
    cursor: 'pointer',
    transition: 'background 0.2s'
  };

  return (
    <Layout title={t('audit.title', 'Trial Balance Audit')}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <div style={{ display: 'flex', 'align-items': 'center', gap: '1rem', 'margin-bottom': '0.5rem' }}>
            <A href="/trial-balance">
              <Button variant="outline">← Back to Trial Balance</Button>
            </A>
            <h1 style={{ margin: '0' }}>Trial Balance Audit</h1>
          </div>
          <p style={{ margin: '0', color: 'var(--text-muted)' }}>
            Automated analysis to identify potential discrepancy sources
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Button variant="primary" onClick={runAuditAnalysis} disabled={loading()}>
            {loading() ? 'Running Audit...' : 'Re-run Audit'}
          </Button>
          <Button variant="secondary">Export Report</Button>
        </div>
      </div>

      <Show when={loading()}>
        <div style={{ 'text-align': 'center', padding: '3rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid var(--border-color)',
            'border-top-color': 'var(--primary-color)',
            'border-radius': '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }} />
          Analyzing journal entries...
        </div>
      </Show>

      <Show when={!loading() && auditResult()}>
        {/* Summary Card */}
        <Card>
          <div style={{
            padding: '1.5rem',
            background: isBalanced() ? '#e8f5e9' : '#ffebee',
            'border-radius': 'var(--border-radius)',
            'text-align': 'center'
          }}>
            <div style={{
              'font-size': '2rem',
              'font-weight': 'bold',
              color: isBalanced() ? '#388e3c' : '#d32f2f',
              'margin-bottom': '1rem'
            }}>
              {isBalanced() ? '✓ Balanced' : 'Unbalanced'}
            </div>
            <Show when={!isBalanced()}>
              <div style={{
                'font-size': '1.5rem',
                'font-weight': 'bold',
                color: '#d32f2f',
                'margin-bottom': '0.5rem'
              }}>
                Discrepancy: {formatCurrency(auditResult()?.discrepancy || 0)}
              </div>
            </Show>
            <div style={{ 'font-size': '0.95rem', color: 'var(--text-muted)', 'margin-top': '1rem' }}>
              Total Debits: {formatCurrency(totalDebits())} |
              Total Credits: {formatCurrency(totalCredits())}
            </div>
          </div>
        </Card>

        {/* Summary Statistics */}
        <div style={summaryCardsStyle}>
          <Card>
            <div style={{ 'text-align': 'center', padding: '1rem' }}>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'margin-bottom': '0.5rem' }}>
                Entries Analyzed
              </div>
              <div style={{ 'font-size': '2rem', 'font-weight': 'bold' }}>
                {auditResult()?.summary?.totalEntries || 0}
              </div>
            </div>
          </Card>

          <Card>
            <div style={{ 'text-align': 'center', padding: '1rem' }}>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'margin-bottom': '0.5rem' }}>
                Flagged Entries
              </div>
              <div style={{ 'font-size': '2rem', 'font-weight': 'bold', color: '#f57c00' }}>
                {auditResult()?.scoredEntries.filter(e => e.totalScore > 20).length || 0}
              </div>
            </div>
          </Card>

          <Card>
            <div style={{ 'text-align': 'center', padding: '1rem' }}>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'margin-bottom': '0.5rem' }}>
                Error Patterns
              </div>
              <div style={{ 'font-size': '2rem', 'font-weight': 'bold', color: '#d32f2f' }}>
                {auditResult()?.patterns?.length || 0}
              </div>
            </div>
          </Card>

          <Card>
            <div style={{ 'text-align': 'center', padding: '1rem' }}>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'margin-bottom': '0.5rem' }}>
                High Risk Entries
              </div>
              <div style={{ 'font-size': '2rem', 'font-weight': 'bold', color: '#d32f2f' }}>
                {auditResult()?.scoredEntries.filter(e => e.totalScore > 70).length || 0}
              </div>
            </div>
          </Card>
        </div>

        {/* Error Patterns Section - Grouped and Collapsible */}
        <Show when={groupedPatterns().length > 0}>
          <Card>
            <h2 style={{ margin: '0 0 1rem 0', padding: '1rem 1rem 0', 'font-size': '1.25rem' }}>
              Error Patterns Detected ({auditResult()?.patterns?.length || 0} total)
            </h2>
            <div style={{ display: 'grid', gap: '0.5rem', padding: '1rem' }}>
              <For each={groupedPatterns()}>
                {(group) => {
                  const colors = getSeverityColor(group.highestSeverity as 'high' | 'medium' | 'low');

                  return (
                    <div style={{
                      border: `1px solid ${colors.color}`,
                      'border-radius': 'var(--border-radius-sm)',
                      overflow: 'hidden'
                    }}>
                      {/* Group Header - Clickable */}
                      <div
                        style={{
                          padding: '0.75rem 1rem',
                          background: colors.bg,
                          cursor: 'pointer',
                          display: 'flex',
                          'justify-content': 'space-between',
                          'align-items': 'center',
                          'user-select': 'none'
                        }}
                        onClick={() => togglePatternGroup(group.type)}
                      >
                        <div style={{ display: 'flex', 'align-items': 'center', gap: '0.75rem' }}>
                          <span style={{
                            transition: 'transform 0.2s',
                            transform: isPatternGroupExpanded(group.type) ? 'rotate(90deg)' : 'rotate(0deg)',
                            'font-size': '0.875rem'
                          }}>
                            ▶
                          </span>
                          <span style={{ 'font-size': '1.25rem' }}>{colors.icon}</span>
                          <span style={{ 'font-weight': '600', color: colors.color }}>
                            {getPatternLabel(group.type)}
                          </span>
                          <span style={{
                            padding: '0.2rem 0.5rem',
                            background: colors.color,
                            color: 'white',
                            'border-radius': '12px',
                            'font-size': '0.75rem',
                            'font-weight': '600'
                          }}>
                            {group.count}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', 'align-items': 'center' }}>
                          <div style={{ 'text-align': 'right', 'font-size': '0.875rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Entries: </span>
                            <span style={{ 'font-weight': '600', color: colors.color }}>{group.totalAffected}</span>
                          </div>
                          <span style={{
                            padding: '0.2rem 0.5rem',
                            background: 'white',
                            'border-radius': '4px',
                            'font-size': '0.7rem',
                            'font-weight': '500',
                            color: colors.color,
                            'text-transform': 'uppercase'
                          }}>
                            {group.highestSeverity}
                          </span>
                        </div>
                      </div>

                      {/* Collapsible Content */}
                      <Show when={isPatternGroupExpanded(group.type)}>
                        <div style={{
                          'border-top': `1px solid ${colors.color}`,
                          background: 'white'
                        }}>
                          <For each={group.patterns}>
                            {(pattern: ErrorPattern, index) => {
                              const patternColors = getSeverityColor(pattern.severity);
                              return (
                                <div style={{
                                  padding: '0.75rem 1rem',
                                  'border-bottom': index() < group.patterns.length - 1 ? '1px solid var(--border-color)' : 'none',
                                  'border-left': `3px solid ${patternColors.color}`,
                                  'margin-left': '1rem'
                                }}>
                                  <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'flex-start' }}>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ 'margin-bottom': '0.25rem', 'font-size': '0.9rem' }}>
                                        {pattern.description}
                                      </div>
                                      <Show when={pattern.suggestedFix}>
                                        <div style={{ 'font-size': '0.8rem', color: 'var(--text-muted)', 'font-style': 'italic' }}>
                                          Fix: {pattern.suggestedFix}
                                        </div>
                                      </Show>
                                      <Show when={pattern.potentialImpact}>
                                        <div style={{ 'font-size': '0.8rem', color: patternColors.color, 'margin-top': '0.25rem' }}>
                                          Impact: {formatCurrency(pattern.potentialImpact || 0)}
                                        </div>
                                      </Show>
                                      {/* Show affected entry IDs */}
                                      <Show when={pattern.affectedEntries && pattern.affectedEntries.length > 0}>
                                        <div style={{ 'margin-top': '0.5rem', 'font-size': '0.8rem' }}>
                                          <span style={{ color: 'var(--text-muted)' }}>Entries: </span>
                                          <div style={{ display: 'flex', 'flex-wrap': 'wrap', gap: '0.25rem', 'margin-top': '0.25rem' }}>
                                            <For each={pattern.affectedEntries}>
                                              {(entryId) => {
                                                const entry = auditResult()?.scoredEntries.find(s => s.entry.id === entryId)?.entry;
                                                const displayId = (entry as any)?.comprobanteId || entry?.entryNumber || entryId?.slice(0, 12);
                                                return (
                                                  <A
                                                    href={`/entry-books?entry=${entryId}`}
                                                    style={{
                                                      padding: '0.15rem 0.4rem',
                                                      background: patternColors.bg,
                                                      border: `1px solid ${patternColors.color}`,
                                                      'border-radius': '4px',
                                                      'font-family': 'monospace',
                                                      'font-size': '0.75rem',
                                                      color: patternColors.color,
                                                      'text-decoration': 'none',
                                                      cursor: 'pointer'
                                                    }}
                                                    title={`Entry ID: ${entryId}`}
                                                  >
                                                    {displayId}
                                                  </A>
                                                );
                                              }}
                                            </For>
                                          </div>
                                        </div>
                                      </Show>
                                    </div>
                                    <div style={{
                                      padding: '0.25rem 0.5rem',
                                      background: patternColors.bg,
                                      'border-radius': '4px',
                                      'text-align': 'center',
                                      'min-width': '60px'
                                    }}>
                                      <div style={{ 'font-size': '0.65rem', color: 'var(--text-muted)' }}>Affected</div>
                                      <div style={{ 'font-size': '1rem', 'font-weight': 'bold', color: patternColors.color }}>
                                        {pattern.affectedEntries.length}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            }}
                          </For>
                        </div>
                      </Show>
                    </div>
                  );
                }}
              </For>
            </div>
          </Card>
        </Show>

        {/* Scored Entries Table */}
        <Card>
          <h2 style={{ margin: '0 0 1rem 0', padding: '1rem 1rem 0', 'font-size': '1.25rem' }}>
            Scored Entries (sorted by risk) - {auditResult()?.scoredEntries?.length || 0} entries
          </h2>

          <Show when={!auditResult()?.scoredEntries?.length}>
            <div style={{ padding: '2rem', 'text-align': 'center', color: 'var(--text-muted)' }}>
              <p style={{ 'font-size': '1.1rem', 'margin-bottom': '0.5rem' }}>No journal entries found to analyze.</p>
              <p style={{ 'font-size': '0.9rem' }}>
                Make sure you have journal entries in the Entry Books section, then try running the audit again.
              </p>
            </div>
          </Show>

          <Show when={auditResult()?.scoredEntries?.length}>
          <div style={tableHeaderStyle}>
            <div>Score</div>
            <div>Entry #</div>
            <div>Date</div>
            <div>Description</div>
            <div style={{ 'text-align': 'right' }}>Amount</div>
          
            <div>Actions</div>
          </div>

          <For each={auditResult()?.scoredEntries || []}>
            {(scored: ScoredEntry) => {
              const scoreColors = getScoreColor(scored.totalScore);
              const isExpanded = expandedEntries().has(scored.entry.id);
              const totalDebits = scored.entry.lines?.reduce((sum, line) => sum + (line.debitAmount || 0), 0) || 0;

              if(scored.totalScore < 10){
                return null
              }
              return (
                <div>
                  <div
                    style={tableRowStyle}
                    onClick={() => toggleExpanded(scored.entry.id)}
                    onMouseOver={(e) => e.currentTarget.style.background = '#f5f5f5'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        background: scoreColors.bg,
                        color: scoreColors.color,
                        'border-radius': '12px',
                        'font-weight': '600',
                        'font-size': '0.875rem'
                      }}>
                        {scored.totalScore.toFixed(0)}
                      </span>
                    </div>
                    <A
                    style={{
                        padding: '0.15rem 0.4rem',
                        //background: patternColors.bg,
                        //border: `1px solid ${patternColors.color}`,
                        'border-radius': '4px',
                        'font-family': 'monospace',
                        'font-size': '0.75rem',
                        //color: patternColors.color,
                        'text-decoration': 'none',
                        cursor: 'pointer'
                      }}
                        href={`/entry-books?entry=${scored.entry.id}`}>
                      <div style={{ 'font-family': 'monospace' }}>{scored.entry.entryNumber || scored.entry.id?.slice(0, 16)}</div>
                   </A>
                    <div style={{ 'font-size': '0.875rem' }}>{formatDate(scored.entry.date)}</div>
                    <div style={{ 'white-space': 'nowrap', overflow: 'hidden', 'text-overflow': 'ellipsis' }}>
                      {scored.entry.description}
                    </div>
                    <div style={{ 'text-align': 'right', 'font-family': 'monospace', 'font-weight': '500' }}>
                      {formatCurrency(totalDebits)}
                    </div>
                   
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button
                        style={{
                          padding: '0.25rem 0.5rem',
                          background: 'var(--primary-color)',
                          color: 'white',
                          border: 'none',
                          'border-radius': '4px',
                          cursor: 'pointer',
                          'font-size': '0.75rem'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          // Navigate to entry detail
                        }}
                      >
                        View
                      </button>
                    </div>
                  </div>

                  {/* Expanded Detail */}
                  <Show when={isExpanded}>
                    <div style={{
                      padding: '1rem',
                      background: '#f9f9f9',
                      'border-left': `4px solid ${scoreColors.color}`,
                      'border-bottom': '1px solid var(--border-color)'
                    }}>
                      <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '1.5rem' }}>
                        {/* Score Breakdown */}
                        <div>
                          <h4 style={{ margin: '0 0 0.5rem 0', 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                            Score Breakdown
                          </h4>
                          <div style={{ display: 'grid', gap: '0.25rem', 'font-size': '0.875rem' }}>
                            <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                              <span>Amount Match:</span>
                              <span style={{ 'font-weight': '500' }}>{scored.breakdown.amountMatch} pts</span>
                            </div>
                            <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                              <span>Rounding Error:</span>
                              <span style={{ 'font-weight': '500' }}>{scored.breakdown.roundingError} pts</span>
                            </div>
                            <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                              <span>Internal Balance:</span>
                              <span style={{ 'font-weight': '500' }}>{scored.breakdown.internalBalance} pts</span>
                            </div>
                            <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                              <span>Duplicate Risk:</span>
                              <span style={{ 'font-weight': '500' }}>{scored.breakdown.duplicateRisk} pts</span>
                            </div>
                            <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                              <span>Missing Counterpart:</span>
                              <span style={{ 'font-weight': '500' }}>{scored.breakdown.missingCounterpart} pts</span>
                            </div>
                            <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                              <span>Status Risk:</span>
                              <span style={{ 'font-weight': '500' }}>{scored.breakdown.statusRisk} pts</span>
                            </div>
                          </div>
                        </div>

                        {/* Flags and Suggestions */}
                        <div>
                          <h4 style={{ margin: '0 0 0.5rem 0', 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                            Flags & Suggestions
                          </h4>
                          <Show when={scored.flags && scored.flags.length > 0}>
                            <div style={{ 'margin-bottom': '0.75rem' }}>
                              <div style={{ 'font-size': '0.75rem', 'font-weight': '600', 'margin-bottom': '0.25rem' }}>
                                Flags:
                              </div>
                              <For each={scored.flags}>
                                {(flag) => (
                                  <div style={{
                                    padding: '0.25rem 0.5rem',
                                    background: '#fff3e0',
                                    'border-radius': '4px',
                                    'font-size': '0.8rem',
                                    'margin-bottom': '0.25rem'
                                  }}>
                                    • {flag}
                                  </div>
                                )}
                              </For>
                            </div>
                          </Show>
                          <Show when={scored.suggestions && scored.suggestions.length > 0}>
                            <div>
                              <div style={{ 'font-size': '0.75rem', 'font-weight': '600', 'margin-bottom': '0.25rem' }}>
                                Suggestions:
                              </div>
                              <For each={scored.suggestions}>
                                {(suggestion) => (
                                  <div style={{
                                    padding: '0.25rem 0.5rem',
                                    background: '#e3f2fd',
                                    'border-radius': '4px',
                                    'font-size': '0.8rem',
                                    'margin-bottom': '0.25rem'
                                  }}>
                                    • {suggestion}
                                  </div>
                                )}
                              </For>
                            </div>
                          </Show>
                        </div>
                      </div>
                    </div>
                  </Show>
                </div>
              );
            }}
          </For>
          </Show>
        </Card>
      </Show>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Layout>
  );
};

export default TrialBalanceAudit;
