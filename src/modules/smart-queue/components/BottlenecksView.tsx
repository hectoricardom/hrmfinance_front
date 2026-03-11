/**
 * BottlenecksView Component
 * Pipeline visualization showing client count at each workflow stage
 * Highlights stages with stuck clients (>3 days)
 */

import { Component, For, Show, createMemo } from 'solid-js';
import type { StageBottleneck } from '../types/smartQueueTypes';
import { smartQueueGetters } from '../stores/smartQueueStore';

const BottlenecksView: Component = () => {
  const bottlenecks = createMemo(() => smartQueueGetters.getBottlenecks());

  const maxClientCount = createMemo(() => {
    const counts = bottlenecks().map(b => b.clientCount);
    return Math.max(...counts, 1);
  });

  const totalStuck = createMemo(() =>
    bottlenecks().reduce((sum, b) => sum + b.stuckCount, 0)
  );

  const totalBottleneckStages = createMemo(() =>
    bottlenecks().filter(b => b.isBottleneck).length
  );

  return (
    <div style={{
      display: 'flex',
      'flex-direction': 'column',
      gap: '20px',
    }}>
      {/* Summary cards */}
      <div style={{
        display: 'flex',
        gap: '16px',
        'flex-wrap': 'wrap',
      }}>
        <div style={{
          flex: '1',
          'min-width': '200px',
          padding: '16px 20px',
          background: '#ffffff',
          'border-radius': '8px',
          border: '1px solid #e2e8f0',
        }}>
          <div style={{ 'font-size': '11px', color: '#94a3b8', 'text-transform': 'uppercase', 'letter-spacing': '0.5px', 'margin-bottom': '4px' }}>
            Bottleneck Stages
          </div>
          <div style={{ 'font-size': '28px', 'font-weight': '700', color: totalBottleneckStages() > 0 ? '#ef4444' : '#22c55e' }}>
            {totalBottleneckStages()}
          </div>
        </div>
        <div style={{
          flex: '1',
          'min-width': '200px',
          padding: '16px 20px',
          background: '#ffffff',
          'border-radius': '8px',
          border: '1px solid #e2e8f0',
        }}>
          <div style={{ 'font-size': '11px', color: '#94a3b8', 'text-transform': 'uppercase', 'letter-spacing': '0.5px', 'margin-bottom': '4px' }}>
            Total Stuck Clients
          </div>
          <div style={{ 'font-size': '28px', 'font-weight': '700', color: totalStuck() > 0 ? '#f59e0b' : '#22c55e' }}>
            {totalStuck()}
          </div>
        </div>
      </div>

      {/* Pipeline chart */}
      <div style={{
        background: '#ffffff',
        'border-radius': '10px',
        border: '1px solid #e2e8f0',
        padding: '24px',
      }}>
        <h3 style={{
          'font-size': '16px',
          'font-weight': '600',
          color: '#1e293b',
          margin: '0 0 20px 0',
        }}>
          Workflow Pipeline
        </h3>

        <div style={{
          display: 'flex',
          'flex-direction': 'column',
          gap: '12px',
        }}>
          <For each={bottlenecks()}>
            {(bottleneck) => (
              <BottleneckRow
                bottleneck={bottleneck}
                maxCount={maxClientCount()}
              />
            )}
          </For>
        </div>
      </div>

      {/* Stuck analysis */}
      <div style={{
        background: '#ffffff',
        'border-radius': '10px',
        border: '1px solid #e2e8f0',
        padding: '24px',
      }}>
        <h3 style={{
          'font-size': '16px',
          'font-weight': '600',
          color: '#1e293b',
          margin: '0 0 16px 0',
        }}>
          Stuck Analysis (more than 3 days in stage)
        </h3>

        <Show when={totalStuck() === 0}>
          <div style={{
            padding: '24px',
            'text-align': 'center',
            color: '#22c55e',
            'font-size': '14px',
          }}>
            No clients are currently stuck. All stages are flowing smoothly.
          </div>
        </Show>

        <Show when={totalStuck() > 0}>
          <div style={{
            display: 'grid',
            'grid-template-columns': 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '12px',
          }}>
            <For each={bottlenecks().filter(b => b.isBottleneck)}>
              {(bottleneck) => (
                <div style={{
                  padding: '16px',
                  background: '#fef2f2',
                  'border-radius': '8px',
                  border: '1px solid #fecaca',
                }}>
                  <div style={{
                    display: 'flex',
                    'align-items': 'center',
                    gap: '8px',
                    'margin-bottom': '8px',
                  }}>
                    <div style={{
                      width: '10px',
                      height: '10px',
                      'border-radius': '50%',
                      background: bottleneck.color,
                    }} />
                    <span style={{
                      'font-size': '14px',
                      'font-weight': '600',
                      color: '#1e293b',
                    }}>
                      {bottleneck.label}
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    'justify-content': 'space-between',
                    'font-size': '13px',
                    color: '#64748b',
                  }}>
                    <span>{bottleneck.stuckCount} stuck of {bottleneck.clientCount}</span>
                    <span>Max: {bottleneck.maxDaysInStage} days</span>
                  </div>
                  <div style={{
                    'font-size': '12px',
                    color: '#94a3b8',
                    'margin-top': '4px',
                  }}>
                    Avg: {bottleneck.averageDaysInStage} days in stage
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
    </div>
  );
};

// ============================================
// BottleneckRow sub-component
// ============================================

interface BottleneckRowProps {
  bottleneck: StageBottleneck;
  maxCount: number;
}

const BottleneckRow: Component<BottleneckRowProps> = (props) => {
  const barWidth = () => {
    if (props.maxCount === 0) return 0;
    return Math.max((props.bottleneck.clientCount / props.maxCount) * 100, 2);
  };

  const stuckBarWidth = () => {
    if (props.bottleneck.clientCount === 0) return 0;
    return (props.bottleneck.stuckCount / props.bottleneck.clientCount) * 100;
  };

  return (
    <div style={{
      display: 'flex',
      'align-items': 'center',
      gap: '12px',
    }}>
      {/* Stage label */}
      <div style={{
        'min-width': '160px',
        'font-size': '13px',
        color: '#475569',
        'text-align': 'right',
        'white-space': 'nowrap',
      }}>
        {props.bottleneck.label}
      </div>

      {/* Bar */}
      <div style={{
        flex: '1',
        height: '28px',
        background: '#f1f5f9',
        'border-radius': '6px',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Total bar */}
        <div style={{
          position: 'absolute',
          top: '0',
          left: '0',
          height: '100%',
          width: `${barWidth()}%`,
          background: props.bottleneck.color,
          'border-radius': '6px',
          transition: 'width 0.3s ease',
          opacity: '0.7',
        }} />

        {/* Stuck overlay */}
        <Show when={props.bottleneck.stuckCount > 0}>
          <div style={{
            position: 'absolute',
            top: '0',
            left: '0',
            height: '100%',
            width: `${barWidth() * (stuckBarWidth() / 100)}%`,
            background: '#ef4444',
            'border-radius': '6px 0 0 6px',
            transition: 'width 0.3s ease',
          }} />
        </Show>

        {/* Count label */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '8px',
          transform: 'translateY(-50%)',
          'font-size': '12px',
          'font-weight': '600',
          color: props.bottleneck.clientCount > 0 ? '#ffffff' : '#94a3b8',
          'text-shadow': props.bottleneck.clientCount > 0 ? '0 1px 2px rgba(0,0,0,0.2)' : 'none',
        }}>
          {props.bottleneck.clientCount}
          <Show when={props.bottleneck.stuckCount > 0}>
            <span style={{ 'font-weight': '400', 'font-size': '11px' }}>
              {' '}({props.bottleneck.stuckCount} stuck)
            </span>
          </Show>
        </div>
      </div>

      {/* Avg days */}
      <div style={{
        'min-width': '60px',
        'font-size': '12px',
        color: props.bottleneck.isBottleneck ? '#ef4444' : '#94a3b8',
        'font-weight': props.bottleneck.isBottleneck ? '600' : '400',
        'white-space': 'nowrap',
      }}>
        {props.bottleneck.averageDaysInStage}d avg
      </div>
    </div>
  );
};

export default BottlenecksView;
