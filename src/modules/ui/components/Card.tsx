import { Component, JSX } from 'solid-js';

interface CardProps {
  children: JSX.Element;
  title?: string;
  subtitle?: string;
  className?: string;
  onClick?: () => void;
}

const Card: Component<CardProps> = (props) => {
  const cardStyle = {
    background: 'var(--surface-color)',
    'border-radius': 'var(--border-radius)',
    padding: '1.5rem',
    'box-shadow': 'var(--shadow-sm)',
    border: '1px solid var(--border-color)',
    transition: 'all 0.2s ease',
    cursor: props.onClick ? 'pointer' : 'default',
    margin: "9px"
  };

  const headerStyle = {
    'margin-bottom': '1rem'
  };

  const titleStyle = {
    'font-size': '1.25rem',
    'font-weight': '600',
    color: 'var(--text-primary)',
    margin: '0 0 0.5rem 0'
  };

  const subtitleStyle = {
    'font-size': '0.875rem',
    color: 'var(--text-muted)',
    margin: '0'
  };

  return (
    <div 
      style={cardStyle} 
      class={`card ${props.className || ''}`}
      onClick={props.onClick}
    >
      {(props.title || props.subtitle) && (
        <div style={headerStyle}>
          {props.title && <h3 style={titleStyle}>{props.title}</h3>}
          {props.subtitle && <p style={subtitleStyle}>{props.subtitle}</p>}
        </div>
      )}
      {props.children}
    </div>
  );
};

export default Card;