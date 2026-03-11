import { Component, createMemo, JSX } from 'solid-js';

interface ConfidenceBarProps {
  confidence: number;
  label?: string;
}

const ConfidenceBar: Component<ConfidenceBarProps> = (props) => {
  const containerStyle: JSX.CSSProperties = {
    display: 'flex',
    'flex-direction': 'column',
    gap: '0.5rem',
  };

  const labelRowStyle: JSX.CSSProperties = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
  };

  const labelStyle: JSX.CSSProperties = {
    'font-size': '0.875rem',
    color: 'var(--text-primary, #fff)',
    'font-weight': '500',
  };

  const getColor = createMemo(() => {
    const value = props.confidence;
    if (value >= 80) return '#10b981'; // Green
    if (value >= 50) return '#f59e0b'; // Yellow/Orange
    return '#ef4444'; // Red
  });

  const getBackgroundColor = createMemo(() => {
    const value = props.confidence;
    if (value >= 80) return 'rgba(16, 185, 129, 0.2)';
    if (value >= 50) return 'rgba(245, 158, 11, 0.2)';
    return 'rgba(239, 68, 68, 0.2)';
  });

  const percentageStyle = createMemo((): JSX.CSSProperties => ({
    'font-size': '0.875rem',
    'font-weight': '700',
    color: getColor(),
  }));

  const barContainerStyle: JSX.CSSProperties = {
    position: 'relative',
    height: '8px',
    'border-radius': '9999px',
    background: 'var(--border-color, #333)',
    overflow: 'hidden',
  };

  const barFillStyle = createMemo((): JSX.CSSProperties => ({
    position: 'absolute',
    top: '0',
    left: '0',
    height: '100%',
    width: `${Math.min(100, Math.max(0, props.confidence))}%`,
    'border-radius': '9999px',
    background: `linear-gradient(90deg, ${getColor()} 0%, ${getColor()} 100%)`,
    transition: 'width 0.5s ease-out, background 0.3s ease',
    'box-shadow': `0 0 8px ${getColor()}40`,
  }));

  const getStatusLabel = createMemo(() => {
    const value = props.confidence;
    if (value >= 80) return 'High';
    if (value >= 50) return 'Medium';
    return 'Low';
  });

  const statusBadgeStyle = createMemo((): JSX.CSSProperties => ({
    display: 'inline-flex',
    'align-items': 'center',
    padding: '0.2rem 0.5rem',
    'border-radius': '4px',
    background: getBackgroundColor(),
    color: getColor(),
    'font-size': '0.7rem',
    'font-weight': '600',
    'text-transform': 'uppercase',
    'letter-spacing': '0.05em',
    'margin-left': '0.5rem',
  }));

  return (
    <div style={containerStyle}>
      <div style={labelRowStyle}>
        <div style={{ display: 'flex', 'align-items': 'center' }}>
          <span style={labelStyle}>{props.label || 'Confidence'}</span>
          <span style={statusBadgeStyle()}>{getStatusLabel()}</span>
        </div>
        <span style={percentageStyle()}>{props.confidence.toFixed(1)}%</span>
      </div>
      <div style={barContainerStyle}>
        <div style={barFillStyle()} />
      </div>
    </div>
  );
};

export default ConfidenceBar;
