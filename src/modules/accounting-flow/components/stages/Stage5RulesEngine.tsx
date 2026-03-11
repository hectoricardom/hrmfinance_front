import { Component, For, Show } from 'solid-js';

// Types
interface RuleCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in';
  value: string | number | string[];
  result?: boolean;
}

interface Rule {
  id: string;
  name: string;
  priority: number;
  isActive: boolean;
  conditions: RuleCondition[];
  description?: string;
}

interface JournalLine {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description?: string;
}

interface Stage5RulesEngineProps {
  rules: Rule[];
  evaluatedRule: Rule | null;
  conditions: RuleCondition[];
  journalLines: JournalLine[];
}

const Stage5RulesEngine: Component<Stage5RulesEngineProps> = (props) => {
  // Styles
  const containerStyle = {
    padding: '1.5rem',
    background: 'var(--surface-color, #ffffff)',
    'border-radius': 'var(--border-radius, 8px)',
    border: '1px solid var(--border-color, #e0e0e0)',
    'box-shadow': 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.1))'
  };

  const headerStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '1rem',
    'margin-bottom': '1.5rem'
  };

  const badgeStyle = {
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    width: '32px',
    height: '32px',
    'border-radius': '50%',
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    color: 'white',
    'font-weight': '700',
    'font-size': '1rem'
  };

  const titleStyle = {
    'font-size': '1.25rem',
    'font-weight': '600',
    color: 'var(--text-primary, #1a1a1a)',
    margin: '0'
  };

  const sectionTitleStyle = {
    'font-size': '1rem',
    'font-weight': '600',
    color: 'var(--text-primary, #1a1a1a)',
    'margin-bottom': '1rem',
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem'
  };

  const ruleListStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    gap: '0.75rem',
    'margin-bottom': '1.5rem'
  };

  const ruleItemStyle = (isEvaluated: boolean, isActive: boolean) => ({
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'space-between',
    padding: '1rem',
    background: isEvaluated ? '#e3f2fd' : (isActive ? 'white' : '#f5f5f5'),
    'border-radius': '8px',
    border: isEvaluated ? '2px solid #2196F3' : '1px solid var(--border-color, #e0e0e0)',
    transition: 'all 0.2s ease',
    opacity: isActive ? 1 : 0.6
  });

  const priorityBadgeStyle = (priority: number) => {
    let bgColor = '#4CAF50';
    if (priority > 66) bgColor = '#F44336';
    else if (priority > 33) bgColor = '#FF9800';

    return {
      display: 'flex',
      'align-items': 'center',
      'justify-content': 'center',
      'min-width': '40px',
      height: '24px',
      'border-radius': '12px',
      background: bgColor,
      color: 'white',
      'font-size': '0.75rem',
      'font-weight': '700',
      padding: '0 0.5rem'
    };
  };

  const ruleNameStyle = {
    'font-weight': '500',
    color: 'var(--text-primary, #1a1a1a)',
    flex: '1',
    'margin-left': '1rem'
  };

  const toggleStyle = (isActive: boolean) => ({
    width: '40px',
    height: '20px',
    'border-radius': '10px',
    background: isActive ? '#4CAF50' : '#e0e0e0',
    position: 'relative' as const,
    cursor: 'pointer',
    transition: 'background 0.2s ease'
  });

  const toggleKnobStyle = (isActive: boolean) => ({
    position: 'absolute' as const,
    top: '2px',
    left: isActive ? '22px' : '2px',
    width: '16px',
    height: '16px',
    'border-radius': '50%',
    background: 'white',
    'box-shadow': '0 1px 3px rgba(0,0,0,0.3)',
    transition: 'left 0.2s ease'
  });

  const conditionBoxStyle = {
    padding: '1rem',
    background: '#f8f9fa',
    'border-radius': '8px',
    'margin-bottom': '1.5rem'
  };

  const conditionRowStyle = (result?: boolean) => ({
    display: 'flex',
    'align-items': 'center',
    gap: '1rem',
    padding: '0.75rem',
    background: result === undefined ? 'white' : (result ? '#e8f5e9' : '#ffebee'),
    'border-radius': '6px',
    'margin-bottom': '0.5rem',
    border: `1px solid ${result === undefined ? '#e0e0e0' : (result ? '#a5d6a7' : '#ef9a9a')}`
  });

  const conditionFieldStyle = {
    'font-weight': '600',
    color: '#1976D2',
    'min-width': '120px'
  };

  const conditionOperatorStyle = {
    padding: '0.25rem 0.5rem',
    background: '#e3f2fd',
    'border-radius': '4px',
    'font-size': '0.75rem',
    'font-weight': '500',
    color: '#1565C0'
  };

  const conditionValueStyle = {
    'font-family': 'monospace',
    color: '#7B1FA2'
  };

  const matchIndicatorStyle = (matched: boolean) => ({
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.5rem',
    background: matched ? '#e8f5e9' : '#ffebee',
    'border-radius': '8px',
    'font-weight': '600',
    color: matched ? '#2e7d32' : '#c62828',
    'margin-bottom': '1.5rem'
  });

  const journalPreviewStyle = {
    background: 'white',
    'border-radius': '8px',
    overflow: 'hidden',
    border: '1px solid var(--border-color, #e0e0e0)'
  };

  const tableHeaderStyle = {
    display: 'grid',
    'grid-template-columns': '100px 1fr 120px 120px',
    gap: '1rem',
    padding: '0.75rem 1rem',
    background: '#f5f5f5',
    'font-weight': '600',
    'font-size': '0.75rem',
    'text-transform': 'uppercase' as const,
    color: 'var(--text-muted, #666666)'
  };

  const tableRowStyle = {
    display: 'grid',
    'grid-template-columns': '100px 1fr 120px 120px',
    gap: '1rem',
    padding: '0.75rem 1rem',
    'border-bottom': '1px solid #f0f0f0',
    'align-items': 'center'
  };

  const formatCurrency = (amount: number) => {
    if (amount === 0) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatOperator = (operator: string) => {
    const operators: Record<string, string> = {
      equals: '=',
      not_equals: '!=',
      greater_than: '>',
      less_than: '<',
      contains: 'CONTAINS',
      in: 'IN'
    };
    return operators[operator] || operator;
  };

  const isRuleMatched = () => {
    if (!props.evaluatedRule) return false;
    return props.conditions.every(c => c.result === true);
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={badgeStyle}>5</div>
        <h3 style={titleStyle}>Rules Engine</h3>
      </div>

      {/* Rules List */}
      <div style={sectionTitleStyle}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
        Available Rules
      </div>
      <div style={ruleListStyle}>
        <For each={props.rules}>
          {(rule) => (
            <div style={ruleItemStyle(props.evaluatedRule?.id === rule.id, rule.isActive)}>
              <div style={priorityBadgeStyle(rule.priority)}>
                {rule.priority}
              </div>
              <div style={ruleNameStyle}>
                <div>{rule.name}</div>
                <Show when={rule.description}>
                  <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted, #999999)', 'margin-top': '0.25rem' }}>
                    {rule.description}
                  </div>
                </Show>
              </div>
              <div style={toggleStyle(rule.isActive)}>
                <div style={toggleKnobStyle(rule.isActive)}></div>
              </div>
            </div>
          )}
        </For>
      </div>

      {/* Condition Evaluator */}
      <Show when={props.evaluatedRule}>
        <div style={sectionTitleStyle}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          Condition Evaluator: {props.evaluatedRule!.name}
        </div>
        <div style={conditionBoxStyle}>
          <For each={props.conditions}>
            {(condition) => (
              <div style={conditionRowStyle(condition.result)}>
                <span style={conditionFieldStyle}>{condition.field}</span>
                <span style={conditionOperatorStyle}>{formatOperator(condition.operator)}</span>
                <span style={conditionValueStyle}>
                  {Array.isArray(condition.value) ? `[${condition.value.join(', ')}]` : String(condition.value)}
                </span>
                <span style={{ 'margin-left': 'auto', 'font-size': '1.25rem' }}>
                  {condition.result === undefined ? '?' : (condition.result ? '✓' : '✗')}
                </span>
              </div>
            )}
          </For>
        </div>

        {/* Match Indicator */}
        <div style={matchIndicatorStyle(isRuleMatched())}>
          <span style={{ 'font-size': '1.5rem' }}>{isRuleMatched() ? '✓' : '✗'}</span>
          {isRuleMatched() ? 'Rule Matched' : 'No Match'}
        </div>
      </Show>

      {/* Generated Journal Lines Preview */}
      <Show when={props.journalLines.length > 0}>
        <div style={sectionTitleStyle}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <line x1="3" y1="9" x2="21" y2="9"/>
            <line x1="9" y1="21" x2="9" y2="9"/>
          </svg>
          Generated Journal Lines
        </div>
        <div style={journalPreviewStyle}>
          <div style={tableHeaderStyle}>
            <span>Code</span>
            <span>Account Name</span>
            <span style={{ 'text-align': 'right' }}>Debit</span>
            <span style={{ 'text-align': 'right' }}>Credit</span>
          </div>
          <For each={props.journalLines}>
            {(line) => (
              <div style={tableRowStyle}>
                <span style={{ 'font-family': 'monospace', 'font-weight': '600' }}>{line.accountCode}</span>
                <div>
                  <div>{line.accountName}</div>
                  <Show when={line.description}>
                    <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted, #999999)' }}>
                      {line.description}
                    </div>
                  </Show>
                </div>
                <span style={{
                  'text-align': 'right',
                  color: line.debit > 0 ? '#2196F3' : 'var(--text-muted, #999999)'
                }}>
                  {formatCurrency(line.debit)}
                </span>
                <span style={{
                  'text-align': 'right',
                  color: line.credit > 0 ? '#F44336' : 'var(--text-muted, #999999)'
                }}>
                  {formatCurrency(line.credit)}
                </span>
              </div>
            )}
          </For>
        </div>
      </Show>

      {/* Empty state */}
      <Show when={props.rules.length === 0}>
        <div style={{
          padding: '3rem',
          'text-align': 'center',
          color: 'var(--text-muted, #999999)',
          background: '#f8f9fa',
          'border-radius': '8px'
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style={{ opacity: 0.5, 'margin-bottom': '1rem' }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <div>No rules configured</div>
        </div>
      </Show>
    </div>
  );
};

export default Stage5RulesEngine;
