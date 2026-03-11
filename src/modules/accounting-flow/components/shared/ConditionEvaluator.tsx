import { Component, For, Show, JSX } from 'solid-js';

export interface Condition {
  id: string;
  name: string;
  expression: string;
  priority?: number;
}

export interface ConditionResult {
  [conditionId: string]: boolean;
}

interface ConditionEvaluatorProps {
  conditions: Condition[];
  results: ConditionResult;
}

const ConditionEvaluator: Component<ConditionEvaluatorProps> = (props) => {
  const containerStyle: JSX.CSSProperties = {
    background: 'var(--surface-color, #1e1e1e)',
    'border-radius': 'var(--border-radius, 8px)',
    padding: '1rem',
    border: '1px solid var(--border-color, #333)',
  };

  const ruleStyle: JSX.CSSProperties = {
    'margin-bottom': '1rem',
    'padding-bottom': '1rem',
    'border-bottom': '1px solid var(--border-color, #333)',
  };

  const ruleHeaderStyle: JSX.CSSProperties = {
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'space-between',
    'margin-bottom': '0.75rem',
  };

  const ruleNameStyle: JSX.CSSProperties = {
    'font-weight': '600',
    color: 'var(--text-primary, #fff)',
    'font-size': '0.95rem',
  };

  const getPriorityBadgeStyle = (priority: number): JSX.CSSProperties => {
    let bgColor: string;
    let textColor: string;

    if (priority <= 1) {
      bgColor = 'rgba(239, 68, 68, 0.2)';
      textColor = '#ef4444';
    } else if (priority <= 3) {
      bgColor = 'rgba(245, 158, 11, 0.2)';
      textColor = '#f59e0b';
    } else {
      bgColor = 'rgba(59, 130, 246, 0.2)';
      textColor = '#3b82f6';
    }

    return {
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      padding: '0.2rem 0.6rem',
      'border-radius': '9999px',
      background: bgColor,
      color: textColor,
      'font-size': '0.7rem',
      'font-weight': '600',
      'text-transform': 'uppercase',
      'letter-spacing': '0.05em',
    };
  };

  const conditionRowStyle: JSX.CSSProperties = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.75rem',
    padding: '0.5rem 0.75rem',
    'border-radius': '6px',
    'margin-bottom': '0.5rem',
    background: 'rgba(0, 0, 0, 0.2)',
  };

  const getIndicatorStyle = (passed: boolean): JSX.CSSProperties => ({
    display: 'inline-flex',
    'align-items': 'center',
    'justify-content': 'center',
    width: '24px',
    height: '24px',
    'border-radius': '50%',
    background: passed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
    color: passed ? '#10b981' : '#ef4444',
    'font-size': '0.875rem',
    'font-weight': '700',
    'flex-shrink': '0',
  });

  const expressionStyle: JSX.CSSProperties = {
    'font-family': 'monospace',
    'font-size': '0.8rem',
    color: 'var(--text-muted, #888)',
    flex: '1',
    'word-break': 'break-word',
  };

  const getResultTextStyle = (passed: boolean): JSX.CSSProperties => ({
    'font-size': '0.75rem',
    'font-weight': '600',
    color: passed ? '#10b981' : '#ef4444',
    'text-transform': 'uppercase',
  });

  const summaryStyle: JSX.CSSProperties = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'padding-top': '1rem',
    'margin-top': '0.5rem',
    'border-top': '1px solid var(--border-color, #333)',
  };

  const getPassedCount = () => {
    return props.conditions.filter(c => props.results[c.id]).length;
  };

  const getTotalCount = () => {
    return props.conditions.length;
  };

  const allPassed = () => {
    return getPassedCount() === getTotalCount();
  };

  return (
    <div style={containerStyle}>
      <For each={props.conditions}>
        {(condition, index) => {
          const passed = () => props.results[condition.id] ?? false;
          const isLast = () => index() === props.conditions.length - 1;

          return (
            <div style={{ ...ruleStyle, ...(isLast() ? { 'border-bottom': 'none', 'margin-bottom': '0', 'padding-bottom': '0' } : {}) }}>
              <div style={ruleHeaderStyle}>
                <span style={ruleNameStyle}>{condition.name}</span>
                <Show when={condition.priority !== undefined}>
                  <span style={getPriorityBadgeStyle(condition.priority!)}>
                    Priority {condition.priority}
                  </span>
                </Show>
              </div>

              <div style={conditionRowStyle}>
                <span style={getIndicatorStyle(passed())}>
                  {passed() ? '\u2713' : '\u2717'}
                </span>
                <span style={expressionStyle}>{condition.expression}</span>
                <span style={getResultTextStyle(passed())}>
                  {passed() ? 'PASS' : 'FAIL'}
                </span>
              </div>
            </div>
          );
        }}
      </For>

      <div style={summaryStyle}>
        <span style={{ color: 'var(--text-muted, #888)', 'font-size': '0.875rem' }}>
          {getPassedCount()} of {getTotalCount()} conditions passed
        </span>
        <span
          style={{
            display: 'inline-flex',
            'align-items': 'center',
            gap: '0.5rem',
            padding: '0.4rem 0.8rem',
            'border-radius': '6px',
            background: allPassed() ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            color: allPassed() ? '#10b981' : '#ef4444',
            'font-weight': '600',
            'font-size': '0.85rem',
          }}
        >
          <span>{allPassed() ? '\u2713' : '\u2717'}</span>
          {allPassed() ? 'ALL PASSED' : 'SOME FAILED'}
        </span>
      </div>
    </div>
  );
};

export default ConditionEvaluator;
