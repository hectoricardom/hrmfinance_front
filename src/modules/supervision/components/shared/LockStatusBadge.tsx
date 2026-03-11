import { Component } from 'solid-js';
import { LockStatus } from '../../types/supervisionTypes';

interface LockStatusBadgeProps {
  status: LockStatus;
  size?: 'sm' | 'md' | 'lg';
}

const LockStatusBadge: Component<LockStatusBadgeProps> = (props) => {
  const size = () => props.size || 'md';

  const getSizeStyles = () => {
    switch (size()) {
      case 'sm':
        return {
          'font-size': '0.75rem',
          padding: '0.125rem 0.5rem',
          gap: '0.25rem'
        };
      case 'lg':
        return {
          'font-size': '1rem',
          padding: '0.375rem 0.875rem',
          gap: '0.5rem'
        };
      case 'md':
      default:
        return {
          'font-size': '0.875rem',
          padding: '0.25rem 0.625rem',
          gap: '0.375rem'
        };
    }
  };

  const getStatusConfig = () => {
    const status = props.status;
    switch (status) {
      case LockStatus.UNLOCKED:
        return {
          icon: '\uD83D\uDD13',
          label: 'Unlocked',
          color: '#6B7280',
          bgColor: 'rgba(107, 114, 128, 0.1)'
        };
      case LockStatus.AI_LOCKED:
        return {
          icon: '\uD83D\uDD12',
          label: 'AI Locked',
          color: '#3B82F6',
          bgColor: 'rgba(59, 130, 246, 0.1)'
        };
      case LockStatus.USER_LOCKED:
        return {
          icon: '\uD83D\uDD12',
          label: 'User Locked',
          color: '#EF4444',
          bgColor: 'rgba(239, 68, 68, 0.1)'
        };
      case LockStatus.PENDING_REVIEW:
        return {
          icon: '\u23F3',
          label: 'Pending Review',
          color: '#F59E0B',
          bgColor: 'rgba(245, 158, 11, 0.1)'
        };
      default:
        return {
          icon: '\uD83D\uDD13',
          label: 'Unknown',
          color: '#6B7280',
          bgColor: 'rgba(107, 114, 128, 0.1)'
        };
    }
  };

  const config = () => getStatusConfig();
  const sizeStyles = () => getSizeStyles();

  const badgeStyle = () => ({
    display: 'inline-flex',
    'align-items': 'center',
    'border-radius': '9999px',
    'font-weight': '500',
    color: config().color,
    background: config().bgColor,
    border: `1px solid ${config().color}`,
    'white-space': 'nowrap',
    ...sizeStyles()
  });

  return (
    <span style={badgeStyle()}>
      <span>{config().icon}</span>
      <span>{config().label}</span>
    </span>
  );
};

export default LockStatusBadge;
