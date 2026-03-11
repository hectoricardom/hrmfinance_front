import { Component, JSX } from 'solid-js';

interface BadgeProps {
  children: JSX.Element;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
}

const Badge: Component<BadgeProps> = (props) => {
  const getVariantStyle = () => {
    const variants = {
      primary: {
        background: '#3b82f6',
        color: 'white'
      },
      secondary: {
        background: '#6b7280',
        color: 'white'
      },
      success: {
        background: '#22c55e',
        color: 'white'
      },
      warning: {
        background: '#f59e0b',
        color: 'white'
      },
      danger: {
        background: '#dc2626',
        color: 'white'
      },
      info: {
        background: '#0ea5e9',
        color: 'white'
      }
    };

    return variants[props.variant || 'primary'];
  };

  const getSizeStyle = () => {
    const sizes = {
      sm: {
        padding: '0.125rem 0.5rem',
        'font-size': '0.75rem'
      },
      md: {
        padding: '0.25rem 0.75rem',
        'font-size': '0.875rem'
      },
      lg: {
        padding: '0.375rem 1rem',
        'font-size': '1rem'
      }
    };

    return sizes[props.size || 'md'];
  };

  const badgeStyle = {
    display: 'inline-flex',
    'align-items': 'center',
    'border-radius': '999px',
    'font-weight': '500',
    ...getSizeStyle(),
    ...getVariantStyle()
  };

  return (
    <span style={badgeStyle}>
      {props.children}
    </span>
  );
};

export default Badge;
