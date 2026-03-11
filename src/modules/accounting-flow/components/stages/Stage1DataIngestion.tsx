import { Component, For, Show, createMemo, createSignal, createEffect, onMount } from 'solid-js';
import { JSX } from 'solid-js/jsx-runtime';

export type DataSource = 'stripe' | 'shopify' | 'yabaexpress' | 'manual';

export interface Stage1Props {
  selectedSource: DataSource | null;
  rawData: Record<string, unknown> | null;
  onSourceChange: (source: DataSource) => void;
  onManualDataChange?: (data: Record<string, unknown>) => void;
  validationStatus?: 'validated' | 'error' | 'pending';
  validationMessage?: string;
}

interface SourceConfig {
  id: DataSource;
  label: string;
  icon: string;
  color: string;
}

const sources: SourceConfig[] = [
  { id: 'stripe', label: 'Stripe', icon: '💳', color: '#635bff' },
  { id: 'shopify', label: 'Shopify', icon: '🛒', color: '#96bf48' },
  { id: 'yabaexpress', label: 'YabaExpress', icon: '📦', color: '#ff6b35' },
  { id: 'manual', label: 'Manual', icon: '✏️', color: '#6b7280' },
];

const Stage1DataIngestion: Component<Stage1Props> = (props) => {
  // Local state for manual editing
  const [manualJsonText, setManualJsonText] = createSignal('');
  const [jsonError, setJsonError] = createSignal<string | null>(null);
  const [isEditing, setIsEditing] = createSignal(false);

  // Auto-enable editing when manual source is selected
  createEffect(() => {
    if (props.selectedSource === 'manual') {
      if (!isEditing()) {
        setIsEditing(true);
        initializeManualText();
      }
    } else {
      setIsEditing(false);
    }
  });

  // Initialize on mount if manual is already selected
  onMount(() => {
    if (props.selectedSource === 'manual') {
      setIsEditing(true);
      initializeManualText();
    }
  });

  // Initialize manual JSON text when switching to manual mode
  const initializeManualText = () => {
    if (props.rawData) {
      setManualJsonText(JSON.stringify(props.rawData, null, 2));
    } else {
      // Default template for manual entry
      setManualJsonText(JSON.stringify({
        entry_type: 'cash_sale',
        date: new Date().toISOString().split('T')[0],
        description: 'Your transaction description',
        customer_name: 'Customer Name',
        amount: 0,
        payment_method: 'cash',
        items: [
          { description: 'Item 1', quantity: 1, price: 0 }
        ]
      }, null, 2));
    }
    setJsonError(null);
  };

  // Handle JSON text change
  const handleJsonChange = (value: string) => {
    setManualJsonText(value);
    try {
      const parsed = JSON.parse(value);
      setJsonError(null);
      if (props.onManualDataChange) {
        props.onManualDataChange(parsed);
      }
    } catch (e) {
      setJsonError((e as Error).message);
    }
  };

  // Handle source change with manual initialization
  const handleSourceChange = (source: DataSource) => {
    props.onSourceChange(source);
    if (source === 'manual') {
      setIsEditing(true);
      initializeManualText();
    } else {
      setIsEditing(false);
    }
  };

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
    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    color: '#ffffff',
    'font-weight': '700',
    'font-size': '0.875rem',
    'box-shadow': '0 2px 4px rgba(59, 130, 246, 0.3)',
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

  const sourceGridStyle: JSX.CSSProperties = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '0.75rem',
    'margin-bottom': '1.5rem',
  };

  const sourceButtonStyle = (source: SourceConfig, isSelected: boolean): JSX.CSSProperties => ({
    display: 'flex',
    'flex-direction': 'column',
    'align-items': 'center',
    gap: '0.5rem',
    padding: '1rem',
    'border-radius': '8px',
    border: isSelected ? `2px solid ${source.color}` : '2px solid var(--border-color, #e5e7eb)',
    background: isSelected ? `${source.color}15` : 'var(--surface-color, #ffffff)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    'font-family': 'inherit',
    'font-size': '0.875rem',
    'font-weight': '500',
    color: isSelected ? source.color : 'var(--text-primary, #111827)',
  });

  const iconStyle: JSX.CSSProperties = {
    'font-size': '1.5rem',
  };

  const jsonViewerStyle: JSX.CSSProperties = {
    background: 'var(--code-bg, #1f2937)',
    'border-radius': '8px',
    padding: '1rem',
    'overflow-x': 'auto',
    'max-height': '300px',
    'overflow-y': 'auto',
    'font-family': 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    'font-size': '0.75rem',
    'line-height': '1.5',
    color: '#e5e7eb',
  };

  const statusBadgeStyle = (status: string): JSX.CSSProperties => ({
    display: 'inline-flex',
    'align-items': 'center',
    gap: '0.375rem',
    padding: '0.375rem 0.75rem',
    'border-radius': '9999px',
    'font-size': '0.75rem',
    'font-weight': '500',
    background: status === 'validated'
      ? 'rgba(34, 197, 94, 0.1)'
      : status === 'error'
        ? 'rgba(239, 68, 68, 0.1)'
        : 'rgba(107, 114, 128, 0.1)',
    color: status === 'validated'
      ? '#16a34a'
      : status === 'error'
        ? '#dc2626'
        : '#6b7280',
    border: `1px solid ${status === 'validated'
      ? 'rgba(34, 197, 94, 0.3)'
      : status === 'error'
        ? 'rgba(239, 68, 68, 0.3)'
        : 'rgba(107, 114, 128, 0.3)'}`,
  });

  const statusDotStyle = (status: string): JSX.CSSProperties => ({
    width: '6px',
    height: '6px',
    'border-radius': '50%',
    background: status === 'validated'
      ? '#16a34a'
      : status === 'error'
        ? '#dc2626'
        : '#6b7280',
  });

  const emptyStateStyle: JSX.CSSProperties = {
    display: 'flex',
    'flex-direction': 'column',
    'align-items': 'center',
    'justify-content': 'center',
    padding: '2rem',
    color: 'var(--text-muted, #6b7280)',
    'text-align': 'center',
  };

  const sectionLabelStyle: JSX.CSSProperties = {
    'font-size': '0.75rem',
    'font-weight': '600',
    'text-transform': 'uppercase',
    'letter-spacing': '0.05em',
    color: 'var(--text-muted, #6b7280)',
    'margin-bottom': '0.75rem',
  };

  const footerStyle: JSX.CSSProperties = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-top': '1rem',
    'padding-top': '1rem',
    'border-top': '1px solid var(--border-color, #e5e7eb)',
  };

  const textareaStyle: JSX.CSSProperties = {
    width: '100%',
    'min-height': '300px',
    'max-height': '400px',
    padding: '1rem',
    'font-family': 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    'font-size': '0.75rem',
    'line-height': '1.5',
    background: 'var(--code-bg, #1f2937)',
    color: '#e5e7eb',
    border: '2px solid transparent',
    'border-radius': '8px',
    resize: 'vertical',
    outline: 'none',
  };

  const textareaErrorStyle: JSX.CSSProperties = {
    ...textareaStyle,
    'border-color': '#ef4444',
  };

  const errorMessageStyle: JSX.CSSProperties = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    padding: '0.75rem',
    background: 'rgba(239, 68, 68, 0.1)',
    'border-radius': '6px',
    'margin-top': '0.75rem',
    color: '#ef4444',
    'font-size': '0.75rem',
  };

  const editHintStyle: JSX.CSSProperties = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    padding: '0.5rem 0.75rem',
    background: 'rgba(59, 130, 246, 0.1)',
    'border-radius': '6px',
    'margin-bottom': '0.75rem',
    color: '#3b82f6',
    'font-size': '0.75rem',
  };

  const formattedJson = createMemo(() => {
    if (!props.rawData) return null;
    try {
      return JSON.stringify(props.rawData, null, 2);
    } catch {
      return 'Invalid JSON data';
    }
  });

  const getStatusText = () => {
    switch (props.validationStatus) {
      case 'validated':
        return 'Source validated';
      case 'error':
        return props.validationMessage || 'Source error';
      case 'pending':
        return 'Validating...';
      default:
        return 'Awaiting source';
    }
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={stageBadgeStyle}>1</div>
        <div>
          <h3 style={titleStyle}>Data Ingestion</h3>
          <p style={subtitleStyle}>Raw data input from external sources</p>
        </div>
      </div>

      <div style={sectionLabelStyle}>Select Data Source</div>
      <div style={sourceGridStyle}>
        <For each={sources}>
          {(source) => (
            <button
              style={sourceButtonStyle(source, props.selectedSource === source.id)}
              onClick={() => handleSourceChange(source.id)}
              type="button"
            >
              <span style={iconStyle}>{source.icon}</span>
              <span>{source.label}</span>
            </button>
          )}
        </For>
      </div>

      <div style={sectionLabelStyle}>
        {props.selectedSource === 'manual' ? 'Edit JSON Data' : 'Raw JSON Data'}
      </div>

      <Show when={props.selectedSource === 'manual' && isEditing()}>
        <div style={editHintStyle}>
          <span>✏️</span>
          <span>Edit the JSON below to test with custom data. Changes are validated in real-time.</span>
        </div>
        <textarea
          style={jsonError() ? textareaErrorStyle : textareaStyle}
          value={manualJsonText()}
          onInput={(e) => handleJsonChange(e.currentTarget.value)}
          placeholder="Enter your JSON data here..."
          spellcheck={false}
        />
        <Show when={jsonError()}>
          <div style={errorMessageStyle}>
            <span>⚠️</span>
            <span>JSON Error: {jsonError()}</span>
          </div>
        </Show>
      </Show>

      <Show when={props.selectedSource !== 'manual' || !isEditing()}>
        <Show
          when={props.rawData && formattedJson()}
          fallback={
            <div style={{ ...jsonViewerStyle, ...emptyStateStyle }}>
              <span style={{ 'font-size': '2rem', 'margin-bottom': '0.5rem' }}>📄</span>
              <span>Select a source to view raw data</span>
            </div>
          }
        >
          <pre style={jsonViewerStyle}>
            <code>{formattedJson()}</code>
          </pre>
        </Show>
      </Show>

      <div style={footerStyle}>
        <Show when={props.selectedSource}>
          <span style={{ 'font-size': '0.875rem', color: 'var(--text-muted, #6b7280)' }}>
            Source: <strong>{props.selectedSource}</strong>
          </span>
        </Show>
        <div style={statusBadgeStyle(props.validationStatus || 'pending')}>
          <span style={statusDotStyle(props.validationStatus || 'pending')} />
          {getStatusText()}
        </div>
      </div>
    </div>
  );
};

export default Stage1DataIngestion;
