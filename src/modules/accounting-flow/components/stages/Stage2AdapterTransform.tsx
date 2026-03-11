import { Component, For, Show, createMemo } from 'solid-js';
import { JSX } from 'solid-js/jsx-runtime';

export interface FieldMapping {
  sourceField: string;
  transform: string;
  targetField: string;
  confidence: number;
}

export interface PatternDetection {
  type: 'currency' | 'date' | 'reference' | 'email' | 'phone' | 'address';
  label: string;
  found: boolean;
  count?: number;
}

export interface StandardTransaction {
  id: string;
  timestamp: string;
  amount: number;
  currency: string;
  description: string;
  reference: string;
  metadata?: Record<string, unknown>;
}

export interface Stage2Props {
  sourceType: string;
  mappings: FieldMapping[];
  confidence: number;
  standardTransaction: StandardTransaction | null;
  patterns?: PatternDetection[];
}

const Stage2AdapterTransform: Component<Stage2Props> = (props) => {
  const containerStyle: JSX.CSSProperties = {
    background: 'var(--surface-color, #ffffff)',
    'border-radius': 'var(--border-radius, 8px)',
    padding: '1.5rem',
    'box-shadow': 'var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05))',
    border: '1px solid var(--border-color, #e5e7eb)',
    margin: '9px',
  };

  const headerStyle: JSX.CSSProperties = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.75rem',
    'margin-bottom': '1.5rem',
  };

  const stageBadgeStyle: JSX.CSSProperties = {
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    width: '32px',
    height: '32px',
    'border-radius': '50%',
    background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
    color: '#ffffff',
    'font-weight': '700',
    'font-size': '0.875rem',
    'box-shadow': '0 2px 4px rgba(139, 92, 246, 0.3)',
  };

  const titleStyle: JSX.CSSProperties = {
    'font-size': '1.25rem',
    'font-weight': '600',
    color: 'var(--text-primary, #111827)',
    margin: '0',
  };

  const subtitleStyle: JSX.CSSProperties = {
    'font-size': '0.875rem',
    color: 'var(--text-muted, #6b7280)',
    margin: '0.25rem 0 0 0',
  };

  const adapterHeaderStyle: JSX.CSSProperties = {
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'space-between',
    padding: '0.75rem 1rem',
    background: 'linear-gradient(135deg, #f3e8ff, #ede9fe)',
    'border-radius': '8px',
    'margin-bottom': '1rem',
    border: '1px solid #c4b5fd',
  };

  const adapterNameStyle: JSX.CSSProperties = {
    'font-family': 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    'font-size': '0.875rem',
    'font-weight': '600',
    color: '#6d28d9',
  };

  const patternContainerStyle: JSX.CSSProperties = {
    display: 'flex',
    'flex-wrap': 'wrap',
    gap: '0.5rem',
    'margin-bottom': '1.5rem',
  };

  const patternBadgeStyle = (found: boolean): JSX.CSSProperties => ({
    display: 'inline-flex',
    'align-items': 'center',
    gap: '0.375rem',
    padding: '0.375rem 0.75rem',
    'border-radius': '9999px',
    'font-size': '0.75rem',
    'font-weight': '500',
    background: found ? 'rgba(34, 197, 94, 0.1)' : 'rgba(107, 114, 128, 0.1)',
    color: found ? '#16a34a' : '#6b7280',
    border: `1px solid ${found ? 'rgba(34, 197, 94, 0.3)' : 'rgba(107, 114, 128, 0.3)'}`,
  });

  const sectionLabelStyle: JSX.CSSProperties = {
    'font-size': '0.75rem',
    'font-weight': '600',
    'text-transform': 'uppercase',
    'letter-spacing': '0.05em',
    color: 'var(--text-muted, #6b7280)',
    'margin-bottom': '0.75rem',
  };

  const tableContainerStyle: JSX.CSSProperties = {
    'overflow-x': 'auto',
    'margin-bottom': '1.5rem',
  };

  const tableStyle: JSX.CSSProperties = {
    width: '100%',
    'border-collapse': 'collapse',
    'font-size': '0.875rem',
  };

  const thStyle: JSX.CSSProperties = {
    padding: '0.75rem',
    'text-align': 'left',
    'font-weight': '600',
    color: 'var(--text-muted, #6b7280)',
    'border-bottom': '2px solid var(--border-color, #e5e7eb)',
    background: 'var(--surface-secondary, #f9fafb)',
    'white-space': 'nowrap',
  };

  const tdStyle: JSX.CSSProperties = {
    padding: '0.75rem',
    'border-bottom': '1px solid var(--border-color, #e5e7eb)',
    'vertical-align': 'middle',
  };

  const sourceFieldStyle: JSX.CSSProperties = {
    'font-family': 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    'font-size': '0.75rem',
    padding: '0.25rem 0.5rem',
    background: 'rgba(239, 68, 68, 0.1)',
    color: '#dc2626',
    'border-radius': '4px',
  };

  const transformStyle: JSX.CSSProperties = {
    'font-family': 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    'font-size': '0.75rem',
    padding: '0.25rem 0.5rem',
    background: 'rgba(139, 92, 246, 0.1)',
    color: '#7c3aed',
    'border-radius': '4px',
  };

  const targetFieldStyle: JSX.CSSProperties = {
    'font-family': 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    'font-size': '0.75rem',
    padding: '0.25rem 0.5rem',
    background: 'rgba(34, 197, 94, 0.1)',
    color: '#16a34a',
    'border-radius': '4px',
  };

  const arrowStyle: JSX.CSSProperties = {
    color: 'var(--text-muted, #6b7280)',
    'font-size': '0.75rem',
    margin: '0 0.25rem',
  };

  const confidenceBarContainerStyle: JSX.CSSProperties = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.75rem',
    padding: '1rem',
    background: 'var(--surface-secondary, #f9fafb)',
    'border-radius': '8px',
    'margin-bottom': '1.5rem',
  };

  const confidenceBarWrapperStyle: JSX.CSSProperties = {
    flex: '1',
    height: '8px',
    background: 'var(--border-color, #e5e7eb)',
    'border-radius': '9999px',
    overflow: 'hidden',
  };

  const confidenceBarFillStyle = (confidence: number): JSX.CSSProperties => ({
    height: '100%',
    width: `${confidence}%`,
    'border-radius': '9999px',
    background: confidence >= 80
      ? 'linear-gradient(90deg, #22c55e, #16a34a)'
      : confidence >= 60
        ? 'linear-gradient(90deg, #eab308, #ca8a04)'
        : 'linear-gradient(90deg, #ef4444, #dc2626)',
    transition: 'width 0.5s ease',
  });

  const confidenceLabelStyle: JSX.CSSProperties = {
    'font-size': '0.875rem',
    'font-weight': '600',
    color: 'var(--text-primary, #111827)',
    'min-width': '50px',
    'text-align': 'right',
  };

  const previewPanelStyle: JSX.CSSProperties = {
    background: 'var(--code-bg, #1f2937)',
    'border-radius': '8px',
    padding: '1rem',
    'overflow-x': 'auto',
    'max-height': '200px',
    'overflow-y': 'auto',
  };

  const previewHeaderStyle: JSX.CSSProperties = {
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'space-between',
    'margin-bottom': '0.75rem',
  };

  const previewTitleStyle: JSX.CSSProperties = {
    'font-size': '0.75rem',
    'font-weight': '600',
    color: '#9ca3af',
    'text-transform': 'uppercase',
    'letter-spacing': '0.05em',
  };

  const previewCodeStyle: JSX.CSSProperties = {
    'font-family': 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    'font-size': '0.75rem',
    'line-height': '1.5',
    color: '#e5e7eb',
    margin: '0',
    'white-space': 'pre-wrap',
    'word-break': 'break-word',
  };

  const mappingConfidenceStyle = (confidence: number): JSX.CSSProperties => ({
    'font-size': '0.75rem',
    'font-weight': '500',
    color: confidence >= 80 ? '#16a34a' : confidence >= 60 ? '#ca8a04' : '#dc2626',
  });

  const defaultPatterns: PatternDetection[] = [
    { type: 'currency', label: 'Currency', found: true },
    { type: 'date', label: 'Date', found: true },
    { type: 'reference', label: 'Reference', found: true },
    { type: 'email', label: 'Email', found: false },
  ];

  const patterns = createMemo(() => props.patterns || defaultPatterns);

  const formattedTransaction = createMemo(() => {
    if (!props.standardTransaction) return null;
    try {
      return JSON.stringify(props.standardTransaction, null, 2);
    } catch {
      return 'Invalid transaction data';
    }
  });

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={stageBadgeStyle}>2</div>
        <div>
          <h3 style={titleStyle}>Adapter Transform</h3>
          <p style={subtitleStyle}>Field mapping and normalization</p>
        </div>
      </div>

      <div style={adapterHeaderStyle}>
        <span style={adapterNameStyle}>
          Adapter: {props.sourceType}Adapter
        </span>
        <span style={{ 'font-size': '0.75rem', color: '#6d28d9' }}>
          {props.mappings.length} field mappings
        </span>
      </div>

      <div style={sectionLabelStyle}>Pattern Detection</div>
      <div style={patternContainerStyle}>
        <For each={patterns()}>
          {(pattern) => (
            <span style={patternBadgeStyle(pattern.found)}>
              {pattern.found ? '✓' : '○'} {pattern.label}
              {pattern.found && pattern.count !== undefined && ` (${pattern.count})`}
            </span>
          )}
        </For>
      </div>

      <div style={sectionLabelStyle}>Field Mapping Table</div>
      <div style={tableContainerStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Source</th>
              <th style={{ ...thStyle, 'text-align': 'center' }}>Transform</th>
              <th style={thStyle}>Target</th>
              <th style={{ ...thStyle, 'text-align': 'right' }}>Confidence</th>
            </tr>
          </thead>
          <tbody>
            <For each={props.mappings}>
              {(mapping) => (
                <tr>
                  <td style={tdStyle}>
                    <code style={sourceFieldStyle}>{mapping.sourceField}</code>
                  </td>
                  <td style={{ ...tdStyle, 'text-align': 'center' }}>
                    <span style={arrowStyle}>→</span>
                    <code style={transformStyle}>{mapping.transform}</code>
                    <span style={arrowStyle}>→</span>
                  </td>
                  <td style={tdStyle}>
                    <code style={targetFieldStyle}>{mapping.targetField}</code>
                  </td>
                  <td style={{ ...tdStyle, 'text-align': 'right' }}>
                    <span style={mappingConfidenceStyle(mapping.confidence)}>
                      {mapping.confidence}%
                    </span>
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>

      <div style={sectionLabelStyle}>Overall Mapping Confidence</div>
      <div style={confidenceBarContainerStyle}>
        <span style={{ 'font-size': '0.875rem', color: 'var(--text-muted, #6b7280)' }}>
          Confidence:
        </span>
        <div style={confidenceBarWrapperStyle}>
          <div style={confidenceBarFillStyle(props.confidence)} />
        </div>
        <span style={confidenceLabelStyle}>{props.confidence}%</span>
      </div>

      <div style={sectionLabelStyle}>StandardTransaction Preview</div>
      <Show
        when={props.standardTransaction && formattedTransaction()}
        fallback={
          <div style={{
            ...previewPanelStyle,
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'center',
            color: '#6b7280',
            'min-height': '100px',
          }}>
            No transaction data available
          </div>
        }
      >
        <div style={previewPanelStyle}>
          <div style={previewHeaderStyle}>
            <span style={previewTitleStyle}>StandardTransaction</span>
            <span style={{ 'font-size': '0.625rem', color: '#6b7280' }}>
              ID: {props.standardTransaction?.id}
            </span>
          </div>
          <pre style={previewCodeStyle}>
            <code>{formattedTransaction()}</code>
          </pre>
        </div>
      </Show>
    </div>
  );
};

export default Stage2AdapterTransform;
