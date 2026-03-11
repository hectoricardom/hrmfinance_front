import { Component, createSignal, For, Show, JSX } from 'solid-js';

interface JsonViewerProps {
  data: any;
  expandedByDefault?: boolean;
  onFieldHover?: (path: string, value: any) => void;
}

const JsonViewer: Component<JsonViewerProps> = (props) => {
  const containerStyle: JSX.CSSProperties = {
    background: 'var(--surface-color, #1e1e1e)',
    'border-radius': 'var(--border-radius, 8px)',
    padding: '1rem',
    'font-family': 'monospace',
    'font-size': '0.875rem',
    'line-height': '1.5',
    overflow: 'auto',
    border: '1px solid var(--border-color, #333)',
  };

  const getValueColor = (value: any): string => {
    if (value === null) return '#9ca3af'; // gray
    if (typeof value === 'string') return '#10b981'; // green
    if (typeof value === 'number') return '#3b82f6'; // blue
    if (typeof value === 'boolean') return '#a855f7'; // purple
    return 'var(--text-primary, #fff)';
  };

  const JsonNode: Component<{
    keyName: string | null;
    value: any;
    path: string;
    depth: number;
  }> = (nodeProps) => {
    const [expanded, setExpanded] = createSignal(props.expandedByDefault ?? true);
    const [isHovered, setIsHovered] = createSignal(false);

    const isExpandable = () => {
      return nodeProps.value !== null && typeof nodeProps.value === 'object';
    };

    const getPreview = () => {
      if (Array.isArray(nodeProps.value)) {
        return `Array(${nodeProps.value.length})`;
      }
      if (typeof nodeProps.value === 'object' && nodeProps.value !== null) {
        const keys = Object.keys(nodeProps.value);
        return `{${keys.length} keys}`;
      }
      return '';
    };

    const rowStyle = (): JSX.CSSProperties => ({
      'padding-left': `${nodeProps.depth * 16}px`,
      display: 'flex',
      'align-items': 'flex-start',
      'min-height': '24px',
      background: isHovered() ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
      'border-radius': '4px',
      transition: 'background 0.15s ease',
      cursor: isExpandable() ? 'pointer' : 'default',
    });

    const keyStyle: JSX.CSSProperties = {
      color: '#f59e0b',
      'margin-right': '4px',
    };

    const colonStyle: JSX.CSSProperties = {
      color: 'var(--text-muted, #888)',
      'margin-right': '8px',
    };

    const toggleStyle: JSX.CSSProperties = {
      width: '16px',
      height: '16px',
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      'margin-right': '4px',
      color: 'var(--text-muted, #888)',
      'font-size': '10px',
      'user-select': 'none',
    };

    const previewStyle: JSX.CSSProperties = {
      color: 'var(--text-muted, #888)',
      'font-style': 'italic',
      'margin-left': '4px',
    };

    const handleHover = (entering: boolean) => {
      setIsHovered(entering);
      if (entering && props.onFieldHover) {
        props.onFieldHover(nodeProps.path, nodeProps.value);
      }
    };

    const renderValue = () => {
      const val = nodeProps.value;

      if (val === null) {
        return <span style={{ color: getValueColor(val) }}>null</span>;
      }

      if (typeof val === 'string') {
        return <span style={{ color: getValueColor(val) }}>"{val}"</span>;
      }

      if (typeof val === 'number' || typeof val === 'boolean') {
        return <span style={{ color: getValueColor(val) }}>{String(val)}</span>;
      }

      return null;
    };

    return (
      <div>
        <div
          style={rowStyle()}
          onMouseEnter={() => handleHover(true)}
          onMouseLeave={() => handleHover(false)}
          onClick={() => isExpandable() && setExpanded(!expanded())}
        >
          <Show when={isExpandable()}>
            <span style={toggleStyle}>{expanded() ? '▼' : '▶'}</span>
          </Show>
          <Show when={!isExpandable()}>
            <span style={toggleStyle}></span>
          </Show>

          <Show when={nodeProps.keyName !== null}>
            <span style={keyStyle}>"{nodeProps.keyName}"</span>
            <span style={colonStyle}>:</span>
          </Show>

          <Show when={isExpandable()}>
            <span style={{ color: 'var(--text-muted, #888)' }}>
              {Array.isArray(nodeProps.value) ? '[' : '{'}
            </span>
            <Show when={!expanded()}>
              <span style={previewStyle}>{getPreview()}</span>
              <span style={{ color: 'var(--text-muted, #888)', 'margin-left': '4px' }}>
                {Array.isArray(nodeProps.value) ? ']' : '}'}
              </span>
            </Show>
          </Show>

          <Show when={!isExpandable()}>
            {renderValue()}
          </Show>
        </div>

        <Show when={isExpandable() && expanded()}>
          <div>
            <For each={Object.entries(nodeProps.value)}>
              {([key, val]) => (
                <JsonNode
                  keyName={Array.isArray(nodeProps.value) ? null : key}
                  value={val}
                  path={nodeProps.path ? `${nodeProps.path}.${key}` : key}
                  depth={nodeProps.depth + 1}
                />
              )}
            </For>
            <div style={{ 'padding-left': `${nodeProps.depth * 16}px` }}>
              <span style={{ 'margin-left': '20px', color: 'var(--text-muted, #888)' }}>
                {Array.isArray(nodeProps.value) ? ']' : '}'}
              </span>
            </div>
          </div>
        </Show>
      </div>
    );
  };

  return (
    <div style={containerStyle}>
      <JsonNode keyName={null} value={props.data} path="" depth={0} />
    </div>
  );
};

export default JsonViewer;
