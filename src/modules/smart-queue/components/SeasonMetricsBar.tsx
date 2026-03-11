/**
 * SeasonMetricsBar Component
 * Compact horizontal bar showing season-wide metrics at the top of the Smart Queue
 */

import { Component, Show } from 'solid-js';
import type { SeasonMetrics } from '../types/smartQueueTypes';

interface SeasonMetricsBarProps {
  metrics: SeasonMetrics | null;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const SeasonMetricsBar: Component<SeasonMetricsBarProps> = (props) => {
  const deadlineText = () => {
    if (!props.metrics) return '';
    const days = props.metrics.daysUntilDeadline;
    if (days < 0) return `${Math.abs(days)} days past deadline`;
    if (days === 0) return 'Deadline is today!';
    return `${days} days until deadline`;
  };

  const deadlineColor = () => {
    if (!props.metrics) return '#6b7280';
    const days = props.metrics.daysUntilDeadline;
    if (days <= 0) return '#ef4444';
    if (days <= 7) return '#ef4444';
    if (days <= 14) return '#f59e0b';
    if (days <= 30) return '#f59e0b';
    return '#22c55e';
  };

  return (
    <Show when={props.metrics} fallback={
      <div style={{
        padding: '12px 20px',
        background: '#f8fafc',
        'border-radius': '8px',
        border: '1px solid #e2e8f0',
        'text-align': 'center',
        color: '#94a3b8',
        'font-size': '14px',
      }}>
        Loading season metrics...
      </div>
    }>
      {(metrics) => (
        <div style={{
          display: 'flex',
          'align-items': 'center',
          gap: '16px',
          padding: '12px 20px',
          background: '#ffffff',
          'border-radius': '8px',
          border: '1px solid #e2e8f0',
          'flex-wrap': 'wrap',
          'box-shadow': '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          {/* Deadline countdown */}
          <div style={{
            display: 'flex',
            'align-items': 'center',
            gap: '8px',
            'padding-right': '16px',
            'border-right': '1px solid #e2e8f0',
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              'border-radius': '50%',
              background: deadlineColor(),
              'flex-shrink': '0',
            }} />
            <span style={{
              'font-size': '13px',
              'font-weight': '600',
              color: deadlineColor(),
              'white-space': 'nowrap',
            }}>
              {deadlineText()}
            </span>
          </div>

          {/* Total clients */}
          <div style={{
            display: 'flex',
            'flex-direction': 'column',
            'align-items': 'center',
            'min-width': '60px',
          }}>
            <span style={{ 'font-size': '18px', 'font-weight': '700', color: '#1e293b' }}>
              {metrics().totalClients}
            </span>
            <span style={{ 'font-size': '11px', color: '#94a3b8', 'white-space': 'nowrap' }}>
              Total
            </span>
          </div>

          {/* Completed */}
          <div style={{
            display: 'flex',
            'flex-direction': 'column',
            'align-items': 'center',
            'min-width': '60px',
          }}>
            <span style={{ 'font-size': '18px', 'font-weight': '700', color: '#22c55e' }}>
              {metrics().completedClients}
            </span>
            <span style={{ 'font-size': '11px', color: '#94a3b8', 'white-space': 'nowrap' }}>
              Completed
            </span>
          </div>

          {/* In Progress */}
          <div style={{
            display: 'flex',
            'flex-direction': 'column',
            'align-items': 'center',
            'min-width': '60px',
          }}>
            <span style={{ 'font-size': '18px', 'font-weight': '700', color: '#1a73e8' }}>
              {metrics().inProgressClients}
            </span>
            <span style={{ 'font-size': '11px', color: '#94a3b8', 'white-space': 'nowrap' }}>
              In Progress
            </span>
          </div>

          {/* Revenue collected */}
          <div style={{
            display: 'flex',
            'flex-direction': 'column',
            'align-items': 'center',
            'min-width': '80px',
            'margin-left': 'auto',
          }}>
            <span style={{ 'font-size': '18px', 'font-weight': '700', color: '#22c55e' }}>
              {formatCurrency(metrics().totalRevenueCollected)}
            </span>
            <span style={{ 'font-size': '11px', color: '#94a3b8', 'white-space': 'nowrap' }}>
              Collected
            </span>
          </div>

          {/* Revenue pending */}
          <div style={{
            display: 'flex',
            'flex-direction': 'column',
            'align-items': 'center',
            'min-width': '80px',
          }}>
            <span style={{ 'font-size': '18px', 'font-weight': '700', color: '#f59e0b' }}>
              {formatCurrency(metrics().totalRevenuePending)}
            </span>
            <span style={{ 'font-size': '11px', color: '#94a3b8', 'white-space': 'nowrap' }}>
              Pending
            </span>
          </div>

          {/* Progress bar */}
          <div style={{
            display: 'flex',
            'align-items': 'center',
            gap: '8px',
            'padding-left': '16px',
            'border-left': '1px solid #e2e8f0',
            'min-width': '120px',
          }}>
            <div style={{
              flex: '1',
              height: '8px',
              background: '#e2e8f0',
              'border-radius': '4px',
              overflow: 'hidden',
              'min-width': '80px',
            }}>
              <div style={{
                height: '100%',
                width: `${metrics().completionPercent}%`,
                background: metrics().completionPercent >= 75 ? '#22c55e' : metrics().completionPercent >= 50 ? '#1a73e8' : '#f59e0b',
                'border-radius': '4px',
                transition: 'width 0.3s ease',
              }} />
            </div>
            <span style={{
              'font-size': '13px',
              'font-weight': '600',
              color: '#475569',
              'white-space': 'nowrap',
            }}>
              {metrics().completionPercent}%
            </span>
          </div>
        </div>
      )}
    </Show>
  );
};

export default SeasonMetricsBar;
