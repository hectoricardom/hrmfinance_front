import { Component, JSX, createSignal } from 'solid-js';

type ActionVariant = 'approve' | 'reject' | 'lock' | 'unlock' | 'edit' | 'test' | 'rollback';

interface ActionButtonProps {
  variant: ActionVariant;
  onClick: () => void;
  disabled?: boolean;
  children: JSX.Element;
}

const ActionButton: Component<ActionButtonProps> = (props) => {
  const [isHovered, setIsHovered] = createSignal(false);

  const getVariantConfig = () => {
    switch (props.variant) {
      case 'approve':
        return {
          color: '#10B981',
          hoverColor: '#059669',
          bgColor: 'rgba(16, 185, 129, 0.1)',
          hoverBgColor: 'rgba(16, 185, 129, 0.2)',
          icon: '\u2713'
        };
      case 'reject':
        return {
          color: '#EF4444',
          hoverColor: '#DC2626',
          bgColor: 'rgba(239, 68, 68, 0.1)',
          hoverBgColor: 'rgba(239, 68, 68, 0.2)',
          icon: '\u2717'
        };
      case 'lock':
        return {
          color: '#F59E0B',
          hoverColor: '#D97706',
          bgColor: 'rgba(245, 158, 11, 0.1)',
          hoverBgColor: 'rgba(245, 158, 11, 0.2)',
          icon: '\uD83D\uDD12'
        };
      case 'unlock':
        return {
          color: '#6B7280',
          hoverColor: '#4B5563',
          bgColor: 'rgba(107, 114, 128, 0.1)',
          hoverBgColor: 'rgba(107, 114, 128, 0.2)',
          icon: '\uD83D\uDD13'
        };
      case 'edit':
        return {
          color: '#3B82F6',
          hoverColor: '#2563EB',
          bgColor: 'rgba(59, 130, 246, 0.1)',
          hoverBgColor: 'rgba(59, 130, 246, 0.2)',
          icon: '\u270E'
        };
      case 'test':
        return {
          color: '#8B5CF6',
          hoverColor: '#7C3AED',
          bgColor: 'rgba(139, 92, 246, 0.1)',
          hoverBgColor: 'rgba(139, 92, 246, 0.2)',
          icon: '\u25B6'
        };
      case 'rollback':
        return {
          color: '#F97316',
          hoverColor: '#EA580C',
          bgColor: 'rgba(249, 115, 22, 0.1)',
          hoverBgColor: 'rgba(249, 115, 22, 0.2)',
          icon: '\u21B6'
        };
      default:
        return {
          color: '#6B7280',
          hoverColor: '#4B5563',
          bgColor: 'rgba(107, 114, 128, 0.1)',
          hoverBgColor: 'rgba(107, 114, 128, 0.2)',
          icon: ''
        };
    }
  };

  const config = () => getVariantConfig();

  const buttonStyle = () => {
    const conf = config();
    const disabled = props.disabled;
    const hovered = isHovered();

    return {
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      gap: '0.375rem',
      padding: '0.5rem 1rem',
      'border-radius': '0.375rem',
      'font-size': '0.875rem',
      'font-weight': '500',
      color: disabled ? '#9CA3AF' : (hovered ? conf.hoverColor : conf.color),
      background: disabled ? 'rgba(156, 163, 175, 0.1)' : (hovered ? conf.hoverBgColor : conf.bgColor),
      border: `1px solid ${disabled ? '#D1D5DB' : (hovered ? conf.hoverColor : conf.color)}`,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? '0.6' : '1',
      transition: 'all 0.2s ease',
      'white-space': 'nowrap'
    };
  };

  const handleClick = () => {
    if (!props.disabled) {
      props.onClick();
    }
  };

  return (
    <button
      style={buttonStyle()}
      onClick={handleClick}
      disabled={props.disabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {props.children}
    </button>
  );
};

export default ActionButton;
