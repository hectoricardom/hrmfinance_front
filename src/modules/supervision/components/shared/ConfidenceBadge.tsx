import { Component, Show } from 'solid-js';

interface ConfidenceBadgeProps {
  confidence: number;
  showBar?: boolean;
}

const ConfidenceBadge: Component<ConfidenceBadgeProps> = (props) => {
  const showBar = () => props.showBar ?? false;

  const getConfidenceLevel = () => {
    const confidence = props.confidence;
    if (confidence >= 80) {
      return {
        level: 'high',
        color: '#10B981',
        bgColor: 'rgba(16, 185, 129, 0.1)',
        label: 'High'
      };
    } else if (confidence >= 60) {
      return {
        level: 'medium',
        color: '#F59E0B',
        bgColor: 'rgba(245, 158, 11, 0.1)',
        label: 'Medium'
      };
    } else {
      return {
        level: 'low',
        color: '#EF4444',
        bgColor: 'rgba(239, 68, 68, 0.1)',
        label: 'Low'
      };
    }
  };

  const config = () => getConfidenceLevel();
  const percentage = () => Math.round(props.confidence);

  const containerStyle = () => ({
    display: 'inline-flex',
    'flex-direction': showBar() ? 'column' : 'row',
    'align-items': showBar() ? 'stretch' : 'center',
    gap: showBar() ? '0.25rem' : '0'
  });

  const badgeStyle = () => ({
    display: 'inline-flex',
    'align-items': 'center',
    'justify-content': 'center',
    padding: '0.25rem 0.5rem',
    'border-radius': '9999px',
    'font-size': '0.75rem',
    'font-weight': '600',
    color: config().color,
    background: config().bgColor,
    border: `1px solid ${config().color}`,
    'min-width': '3rem'
  });

  const barContainerStyle = {
    width: '100%',
    height: '4px',
    background: 'rgba(0, 0, 0, 0.1)',
    'border-radius': '2px',
    overflow: 'hidden'
  };

  const barFillStyle = () => ({
    width: `${percentage()}%`,
    height: '100%',
    background: config().color,
    'border-radius': '2px',
    transition: 'width 0.3s ease'
  });

  return (
    <div style={containerStyle()}>
      <span style={badgeStyle()}>
        {percentage()}%
      </span>
      <Show when={showBar()}>
        <div style={barContainerStyle}>
          <div style={barFillStyle()} />
        </div>
      </Show>
    </div>
  );
};

export default ConfidenceBadge;
