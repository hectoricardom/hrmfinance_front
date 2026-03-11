/**
 * RevenuePipelineView Component
 * Revenue summary by workflow stage showing collected vs pending revenue
 */

import { Component, For, createMemo } from 'solid-js';
import type { StageRevenue } from '../types/smartQueueTypes';
import { smartQueueGetters, smartQueueStore } from '../stores/smartQueueStore';

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const RevenuePipelineView: Component = () => {
  const pipeline = createMemo(() => smartQueueGetters.getRevenuePipeline());

  const totalCollected = createMemo(() =>
    pipeline().reduce((sum, s) => sum + s.collectedRevenue, 0)
  );

  const totalPending = createMemo(() =>
    pipeline().reduce((sum, s) => sum + s.pendingRevenue, 0)
  );

  const totalPipeline = createMemo(() => totalCollected() + totalPending());

  const totalClients = createMemo(() =>
    pipeline().reduce((sum, s) => sum + s.clientCount, 0)
  );

  const maxStageRevenue = createMemo(() => {
    const revenues = pipeline().map(s => s.totalRevenue);
    return Math.max(...revenues, 1);
  });

  return (
    <div style={{
      display: 'flex',
      'flex-direction': 'column',
      gap: '20px',
    }}>
      {/* Summary cards */}
      <div style={{
        display: 'grid',
        'grid-template-columns': 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '16px',
      }}>
        <div style={{
          padding: '20px',
          background: '#ffffff',
          'border-radius': '10px',
          border: '1px solid #e2e8f0',
        }}>
          <div style={{
            'font-size': '11px',
            color: '#94a3b8',
            'text-transform': 'uppercase',
            'letter-spacing': '0.5px',
            'margin-bottom': '6px',
          }}>
            Total Pipeline
          </div>
          <div style={{
            'font-size': '28px',
            'font-weight': '700',
            color: '#1e293b',
          }}>
            {formatCurrency(totalPipeline())}
          </div>
          <div style={{
            'font-size': '12px',
            color: '#94a3b8',
            'margin-top': '4px',
          }}>
            {totalClients()} clients
          </div>
        </div>

        <div style={{
          padding: '20px',
          background: '#ffffff',
          'border-radius': '10px',
          border: '1px solid #dcfce7',
        }}>
          <div style={{
            'font-size': '11px',
            color: '#22c55e',
            'text-transform': 'uppercase',
            'letter-spacing': '0.5px',
            'margin-bottom': '6px',
          }}>
            Collected
          </div>
          <div style={{
            'font-size': '28px',
            'font-weight': '700',
            color: '#22c55e',
          }}>
            {formatCurrency(totalCollected())}
          </div>
          <div style={{
            'font-size': '12px',
            color: '#94a3b8',
            'margin-top': '4px',
          }}>
            {totalPipeline() > 0 ? Math.round((totalCollected() / totalPipeline()) * 100) : 0}% of pipeline
          </div>
        </div>

        <div style={{
          padding: '20px',
          background: '#ffffff',
          'border-radius': '10px',
          border: '1px solid #fef3c7',
        }}>
          <div style={{
            'font-size': '11px',
            color: '#f59e0b',
            'text-transform': 'uppercase',
            'letter-spacing': '0.5px',
            'margin-bottom': '6px',
          }}>
            Pending
          </div>
          <div style={{
            'font-size': '28px',
            'font-weight': '700',
            color: '#f59e0b',
          }}>
            {formatCurrency(totalPending())}
          </div>
          <div style={{
            'font-size': '12px',
            color: '#94a3b8',
            'margin-top': '4px',
          }}>
            {totalPipeline() > 0 ? Math.round((totalPending() / totalPipeline()) * 100) : 0}% of pipeline
          </div>
        </div>
      </div>

      {/* Revenue by stage */}
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
          Revenue by Stage
        </h3>

        <div style={{
          display: 'flex',
          'flex-direction': 'column',
          gap: '16px',
        }}>
          <For each={pipeline().filter(s => s.clientCount > 0)}>
            {(stageData) => (
              <RevenueStageRow
                stage={stageData}
                maxRevenue={maxStageRevenue()}
              />
            )}
          </For>
        </div>

        {/* Legend */}
        <div style={{
          display: 'flex',
          'align-items': 'center',
          gap: '20px',
          'margin-top': '20px',
          'padding-top': '16px',
          'border-top': '1px solid #e2e8f0',
        }}>
          <div style={{ display: 'flex', 'align-items': 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', 'border-radius': '3px', background: '#22c55e' }} />
            <span style={{ 'font-size': '12px', color: '#64748b' }}>Collected</span>
          </div>
          <div style={{ display: 'flex', 'align-items': 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', 'border-radius': '3px', background: '#f59e0b' }} />
            <span style={{ 'font-size': '12px', color: '#64748b' }}>Pending</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// RevenueStageRow sub-component
// ============================================

interface RevenueStageRowProps {
  stage: StageRevenue;
  maxRevenue: number;
}

const RevenueStageRow: Component<RevenueStageRowProps> = (props) => {
  const totalWidth = () => {
    if (props.maxRevenue === 0) return 0;
    return Math.max((props.stage.totalRevenue / props.maxRevenue) * 100, 2);
  };

  const collectedPct = () => {
    if (props.stage.totalRevenue === 0) return 0;
    return (props.stage.collectedRevenue / props.stage.totalRevenue) * 100;
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
        'text-align': 'right',
      }}>
        <div style={{
          'font-size': '13px',
          color: '#475569',
          'white-space': 'nowrap',
        }}>
          {props.stage.label}
        </div>
        <div style={{
          'font-size': '11px',
          color: '#94a3b8',
        }}>
          {props.stage.clientCount} client{props.stage.clientCount !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Stacked bar */}
      <div style={{
        flex: '1',
        height: '32px',
        background: '#f1f5f9',
        'border-radius': '6px',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Collected portion */}
        <div style={{
          position: 'absolute',
          top: '0',
          left: '0',
          height: '100%',
          width: `${totalWidth() * (collectedPct() / 100)}%`,
          background: '#22c55e',
          'border-radius': '6px 0 0 6px',
          transition: 'width 0.3s ease',
        }} />

        {/* Pending portion */}
        <div style={{
          position: 'absolute',
          top: '0',
          left: `${totalWidth() * (collectedPct() / 100)}%`,
          height: '100%',
          width: `${totalWidth() * ((100 - collectedPct()) / 100)}%`,
          background: '#f59e0b',
          'border-radius': collectedPct() === 0 ? '6px 0 0 6px' : '0',
          transition: 'width 0.3s ease, left 0.3s ease',
        }} />
      </div>

      {/* Amounts */}
      <div style={{
        'min-width': '120px',
        'text-align': 'right',
      }}>
        <div style={{
          'font-size': '14px',
          'font-weight': '600',
          color: '#1e293b',
        }}>
          {formatCurrency(props.stage.totalRevenue)}
        </div>
        <div style={{
          'font-size': '11px',
          color: '#22c55e',
        }}>
          {formatCurrency(props.stage.collectedRevenue)} collected
        </div>
      </div>
    </div>
  );
};

export default RevenuePipelineView;
