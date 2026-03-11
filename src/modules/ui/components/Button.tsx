import { Component, JSX } from 'solid-js';

interface ButtonProps {
  children: JSX.Element;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  style?: JSX.CSSProperties;
}

const Button: Component<ButtonProps> = (props) => {
  const getButtonStyle = () => {
    const baseStyle = {
      'font-family': 'inherit',
      cursor: props.disabled ? 'not-allowed' : 'pointer',
      border: 'none',
      'border-radius': 'var(--border-radius-sm)',
      'font-weight': '500',
      transition: 'all 0.2s ease',
      'text-decoration': 'none',
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      gap: '0.5rem',
      opacity: props.disabled ? '0.6' : '1'
    };

    const sizeStyles = {
      sm: { padding: '0.5rem 1rem', 'font-size': '0.875rem' },
      md: { padding: '0.75rem 1.5rem', 'font-size': '1rem' },
      lg: { padding: '1rem 2rem', 'font-size': '1.125rem' }
    };

    const variantStyles = {
      primary: {
        background: 'linear-gradient(135deg, var(--primary-color), var(--primary-dark))',
        color: 'white',
        'box-shadow': 'var(--shadow-sm)'
      },
      secondary: {
        background: 'var(--surface-color)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border-color)'
      },
      outline: {
        background: 'transparent',
        color: 'var(--primary-color)',
        border: '1px solid var(--primary-color)'
      },
      danger: {
        background: 'transparent',
        color: '#dc3545',
        border: '1px solid #dc3545'
      }
    };

    return {
      ...baseStyle,
      ...sizeStyles[props.size || 'md'],
      ...variantStyles[props.variant || 'primary'],
      ...(props.style as any || {})
    };
  };

  return (
    <button
      style={getButtonStyle()}
      onClick={props.onClick}
      disabled={props.disabled}
      type={props.type || 'button'}
      class={`btn btn-${props.variant || 'primary'} ${props.className || ''}`}
    >
      {props.children}
    </button>
  );
};

export default Button;