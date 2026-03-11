import { Component, Show } from 'solid-js';

interface StatsCardProps {
  icon: string;
  value: number | string;
  label: string;
  sublabel?: string;
  color?: string;
}

const StatsCard: Component<StatsCardProps> = (props) => {
  const color = () => props.color || 'var(--primary-color, #3B82F6)';

  const cardStyle = () => ({
    display: 'flex',
    'flex-direction': 'column',
    gap: '0.75rem',
    padding: '1.25rem',
    background: 'var(--surface-color, #ffffff)',
    'border-radius': 'var(--border-radius, 8px)',
    border: '1px solid var(--border-color, #e5e7eb)',
    'box-shadow': 'var(--shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.05))',
    transition: 'box-shadow 0.2s ease'
  });

  const headerStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem'
  };

  const iconContainerStyle = () => ({
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    width: '2.5rem',
    height: '2.5rem',
    'border-radius': '0.5rem',
    background: `${color()}15`,
    'font-size': '1.25rem'
  });

  const labelStyle = {
    'font-size': '0.875rem',
    'font-weight': '500',
    color: 'var(--text-secondary, #6B7280)'
  };

  const valueStyle = () => ({
    'font-size': '2rem',
    'font-weight': '700',
    color: color(),
    'line-height': '1.2'
  });

  const sublabelStyle = {
    'font-size': '0.75rem',
    color: 'var(--text-muted, #9CA3AF)',
    'margin-top': '-0.25rem'
  };

  return (
    <div style={cardStyle()}>
      <div style={headerStyle}>
        <div style={iconContainerStyle()}>
          {props.icon}
        </div>
        <span style={labelStyle}>{props.label}</span>
      </div>
      <div>
        <div style={valueStyle()}>{props.value}</div>
        <Show when={props.sublabel}>
          <div style={sublabelStyle}>{props.sublabel}</div>
        </Show>
      </div>
    </div>
  );
};

export default StatsCard;
