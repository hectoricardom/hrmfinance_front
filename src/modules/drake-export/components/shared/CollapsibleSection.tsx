import { Component, JSX, createSignal, createMemo } from 'solid-js';
import { Show } from 'solid-js';

type SectionStatus = 'pending' | 'in_progress' | 'completed' | 'error';

interface CollapsibleSectionProps {
  title: string;
  icon: string;
  isOpen: boolean;
  onToggle: () => void;
  status?: SectionStatus;
  badge?: string | number;
  children: JSX.Element;
}

const CollapsibleSection: Component<CollapsibleSectionProps> = (props) => {
  const [isHovered, setIsHovered] = createSignal(false);

  const getStatusConfig = createMemo(() => {
    switch (props.status) {
      case 'pending':
        return {
          color: '#6B7280',
          bgColor: 'rgba(107, 114, 128, 0.15)',
          label: 'Pending'
        };
      case 'in_progress':
        return {
          color: '#3B82F6',
          bgColor: 'rgba(59, 130, 246, 0.15)',
          label: 'In Progress'
        };
      case 'completed':
        return {
          color: '#10B981',
          bgColor: 'rgba(16, 185, 129, 0.15)',
          label: 'Completed'
        };
      case 'error':
        return {
          color: '#EF4444',
          bgColor: 'rgba(239, 68, 68, 0.15)',
          label: 'Error'
        };
      default:
        return null;
    }
  });

  const containerStyle = createMemo((): JSX.CSSProperties => ({
    display: 'flex',
    'flex-direction': 'column',
    background: 'var(--surface-color, #ffffff)',
    'border-radius': 'var(--border-radius, 8px)',
    border: '1px solid var(--border-color, #e5e7eb)',
    'box-shadow': 'var(--shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.05))',
    overflow: 'hidden',
    transition: 'box-shadow 0.2s ease'
  }));

  const headerStyle = createMemo((): JSX.CSSProperties => ({
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'space-between',
    padding: '1rem 1.25rem',
    cursor: 'pointer',
    'user-select': 'none',
    background: isHovered() ? 'var(--hover-color, rgba(0, 0, 0, 0.02))' : 'transparent',
    transition: 'background 0.2s ease'
  }));

  const leftContentStyle: JSX.CSSProperties = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.75rem'
  };

  const iconStyle: JSX.CSSProperties = {
    'font-size': '1.25rem',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    width: '2rem',
    height: '2rem'
  };

  const titleStyle: JSX.CSSProperties = {
    'font-size': '1rem',
    'font-weight': '600',
    color: 'var(--text-primary, #1f2937)'
  };

  const rightContentStyle: JSX.CSSProperties = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.75rem'
  };

  const statusBadgeStyle = createMemo((): JSX.CSSProperties | null => {
    const config = getStatusConfig();
    if (!config) return null;
    return {
      display: 'inline-flex',
      'align-items': 'center',
      padding: '0.25rem 0.625rem',
      'border-radius': '9999px',
      background: config.bgColor,
      color: config.color,
      'font-size': '0.75rem',
      'font-weight': '600',
      'text-transform': 'uppercase',
      'letter-spacing': '0.025em'
    };
  });

  const countBadgeStyle: JSX.CSSProperties = {
    display: 'inline-flex',
    'align-items': 'center',
    'justify-content': 'center',
    'min-width': '1.5rem',
    height: '1.5rem',
    padding: '0 0.5rem',
    'border-radius': '9999px',
    background: 'var(--primary-color, #3B82F6)',
    color: '#ffffff',
    'font-size': '0.75rem',
    'font-weight': '600'
  };

  const arrowStyle = createMemo((): JSX.CSSProperties => ({
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    width: '1.5rem',
    height: '1.5rem',
    'font-size': '0.75rem',
    color: 'var(--text-secondary, #6B7280)',
    transform: props.isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
    transition: 'transform 0.3s ease'
  }));

  const contentWrapperStyle = createMemo((): JSX.CSSProperties => ({
    overflow: 'hidden',
    'max-height': props.isOpen ? '2000px' : '0',
    opacity: props.isOpen ? '1' : '0',
    transition: 'max-height 0.4s ease-in-out, opacity 0.3s ease-in-out'
  }));

  const contentInnerStyle: JSX.CSSProperties = {
    padding: '0 1.25rem 1.25rem 1.25rem',
    'border-top': '1px solid var(--border-color, #e5e7eb)'
  };

  return (
    <div style={containerStyle()}>
      <div
        style={headerStyle()}
        onClick={props.onToggle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div style={leftContentStyle}>
          <span style={iconStyle}>{props.icon}</span>
          <span style={titleStyle}>{props.title}</span>
        </div>
        <div style={rightContentStyle}>
          <Show when={props.status && getStatusConfig()}>
            <span style={statusBadgeStyle()!}>{getStatusConfig()!.label}</span>
          </Show>
          <Show when={props.badge !== undefined}>
            <span style={countBadgeStyle}>{props.badge}</span>
          </Show>
          <span style={arrowStyle()}>
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M2.5 4.5L6 8L9.5 4.5"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
        </div>
      </div>
      <div style={contentWrapperStyle()}>
        <div style={contentInnerStyle}>
          {props.children}
        </div>
      </div>
    </div>
  );
};

export default CollapsibleSection;
