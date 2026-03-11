import { Component } from 'solid-js';
import { MappingSource } from '../../types/supervisionTypes';

interface SourceBadgeProps {
  source: MappingSource;
}

const SourceBadge: Component<SourceBadgeProps> = (props) => {
  const getSourceConfig = () => {
    const source = props.source;
    switch (source) {
      case MappingSource.AI_GENERATED:
        return {
          label: 'AI',
          color: '#8B5CF6',
          bgColor: 'rgba(139, 92, 246, 0.1)'
        };
      case MappingSource.USER_CREATED:
        return {
          label: 'User',
          color: '#3B82F6',
          bgColor: 'rgba(59, 130, 246, 0.1)'
        };
      case MappingSource.USER_MODIFIED:
        return {
          label: 'Edited',
          color: '#F59E0B',
          bgColor: 'rgba(245, 158, 11, 0.1)'
        };
      case MappingSource.SYSTEM_DEFAULT:
        return {
          label: 'System',
          color: '#6B7280',
          bgColor: 'rgba(107, 114, 128, 0.1)'
        };
      default:
        return {
          label: 'Unknown',
          color: '#6B7280',
          bgColor: 'rgba(107, 114, 128, 0.1)'
        };
    }
  };

  const config = () => getSourceConfig();

  const badgeStyle = () => ({
    display: 'inline-flex',
    'align-items': 'center',
    'justify-content': 'center',
    padding: '0.25rem 0.625rem',
    'border-radius': '9999px',
    'font-size': '0.75rem',
    'font-weight': '600',
    color: config().color,
    background: config().bgColor,
    border: `1px solid ${config().color}`,
    'letter-spacing': '0.025em'
  });

  return (
    <span style={badgeStyle()}>
      {config().label}
    </span>
  );
};

export default SourceBadge;
