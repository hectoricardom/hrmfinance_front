import { Component, For, JSX } from 'solid-js';

export interface FieldMapping {
  source: string;
  transform?: string;
  target: string;
  confidence: number;
}

interface MappingTableProps {
  mappings: FieldMapping[];
}

const MappingTable: Component<MappingTableProps> = (props) => {
  const containerStyle: JSX.CSSProperties = {
    background: 'var(--surface-color, #1e1e1e)',
    'border-radius': 'var(--border-radius, 8px)',
    padding: '1rem',
    border: '1px solid var(--border-color, #333)',
    overflow: 'auto',
  };

  const tableStyle: JSX.CSSProperties = {
    width: '100%',
    'border-collapse': 'collapse',
    'font-size': '0.875rem',
  };

  const headerRowStyle: JSX.CSSProperties = {
    'border-bottom': '2px solid var(--border-color, #333)',
  };

  const thStyle: JSX.CSSProperties = {
    padding: '0.75rem 1rem',
    'text-align': 'left',
    'font-weight': '600',
    color: 'var(--text-muted, #888)',
    'text-transform': 'uppercase',
    'font-size': '0.75rem',
    'letter-spacing': '0.05em',
  };

  const tdStyle: JSX.CSSProperties = {
    padding: '0.75rem 1rem',
    color: 'var(--text-primary, #fff)',
    'border-bottom': '1px solid var(--border-color, #333)',
    'vertical-align': 'middle',
  };

  const arrowCellStyle: JSX.CSSProperties = {
    ...tdStyle,
    'text-align': 'center',
    width: '40px',
    color: 'var(--text-muted, #888)',
  };

  const sourceStyle: JSX.CSSProperties = {
    display: 'inline-block',
    padding: '0.25rem 0.5rem',
    background: 'rgba(59, 130, 246, 0.15)',
    'border-radius': '4px',
    color: '#3b82f6',
    'font-family': 'monospace',
  };

  const transformStyle: JSX.CSSProperties = {
    display: 'inline-block',
    padding: '0.25rem 0.5rem',
    background: 'rgba(168, 85, 247, 0.15)',
    'border-radius': '4px',
    color: '#a855f7',
    'font-family': 'monospace',
    'font-size': '0.8rem',
  };

  const targetStyle: JSX.CSSProperties = {
    display: 'inline-block',
    padding: '0.25rem 0.5rem',
    background: 'rgba(16, 185, 129, 0.15)',
    'border-radius': '4px',
    color: '#10b981',
    'font-family': 'monospace',
  };

  const getConfidenceBadgeStyle = (confidence: number): JSX.CSSProperties => {
    let bgColor: string;
    let textColor: string;

    if (confidence >= 80) {
      bgColor = 'rgba(16, 185, 129, 0.2)';
      textColor = '#10b981';
    } else if (confidence >= 50) {
      bgColor = 'rgba(245, 158, 11, 0.2)';
      textColor = '#f59e0b';
    } else {
      bgColor = 'rgba(239, 68, 68, 0.2)';
      textColor = '#ef4444';
    }

    return {
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      padding: '0.25rem 0.5rem',
      'border-radius': '9999px',
      background: bgColor,
      color: textColor,
      'font-size': '0.75rem',
      'font-weight': '600',
      'min-width': '45px',
    };
  };

  const arrowStyle: JSX.CSSProperties = {
    display: 'inline-block',
    'font-size': '1rem',
    color: 'var(--text-muted, #666)',
  };

  return (
    <div style={containerStyle}>
      <table style={tableStyle}>
        <thead>
          <tr style={headerRowStyle}>
            <th style={thStyle}>Source</th>
            <th style={{ ...thStyle, 'text-align': 'center', width: '40px' }}></th>
            <th style={thStyle}>Transform</th>
            <th style={{ ...thStyle, 'text-align': 'center', width: '40px' }}></th>
            <th style={thStyle}>Target</th>
            <th style={{ ...thStyle, 'text-align': 'center' }}>Confidence</th>
          </tr>
        </thead>
        <tbody>
          <For each={props.mappings}>
            {(mapping) => (
              <tr>
                <td style={tdStyle}>
                  <span style={sourceStyle}>{mapping.source}</span>
                </td>
                <td style={arrowCellStyle}>
                  <span style={arrowStyle}>→</span>
                </td>
                <td style={tdStyle}>
                  <span style={transformStyle}>{mapping.transform || '(direct)'}</span>
                </td>
                <td style={arrowCellStyle}>
                  <span style={arrowStyle}>→</span>
                </td>
                <td style={tdStyle}>
                  <span style={targetStyle}>{mapping.target}</span>
                </td>
                <td style={{ ...tdStyle, 'text-align': 'center' }}>
                  <span style={getConfidenceBadgeStyle(mapping.confidence)}>
                    {mapping.confidence}%
                  </span>
                </td>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  );
};

export default MappingTable;
