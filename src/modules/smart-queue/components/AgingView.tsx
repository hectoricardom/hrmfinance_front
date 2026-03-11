/**
 * AgingView Component
 * Clients sorted by days stuck in current stage (longest first)
 * Color-coded: green (<3 days), amber (3-7 days), red (>7 days)
 */

import { Component, For, Show, createMemo } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import type { QueueItem } from '../types/smartQueueTypes';
import { AGING_COLOR_HEX, getAgingColor } from '../types/smartQueueTypes';
import {
  smartQueueGetters,
  smartQueueActions,
} from '../stores/smartQueueStore';
import {
  TAX_WORKFLOW_STATUS_LABELS,
  TAX_WORKFLOW_STATUS_COLORS,
} from '../../drake-export/types/drakeTypes';

const formatDate = (timestamp: number | null): string => {
  if (!timestamp) return 'No activity';
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const AgingView: Component = () => {
  const navigate = useNavigate();
  const agingItems = createMemo(() => smartQueueGetters.getAgingItems());

  const agingSummary = createMemo(() => {
    const items = agingItems();
    return {
      total: items.length,
      green: items.filter(i => i.daysInCurrentStage < 3).length,
      amber: items.filter(i => i.daysInCurrentStage >= 3 && i.daysInCurrentStage <= 7).length,
      red: items.filter(i => i.daysInCurrentStage > 7).length,
      avgDays: items.length > 0
        ? Math.round(items.reduce((sum, i) => sum + i.daysInCurrentStage, 0) / items.length)
        : 0,
      maxDays: items.length > 0
        ? Math.max(...items.map(i => i.daysInCurrentStage))
        : 0,
    };
  });

  const handleOpenWorkspace = (clientId: string) => {
    navigate(`/tax-client/${clientId}`);
  };

  return (
    <div style={{
      display: 'flex',
      'flex-direction': 'column',
      gap: '20px',
    }}>
      {/* Summary cards */}
      <div style={{
        display: 'grid',
        'grid-template-columns': 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: '12px',
      }}>
        <div style={{
          padding: '16px',
          background: '#ffffff',
          'border-radius': '8px',
          border: '1px solid #e2e8f0',
          'text-align': 'center',
        }}>
          <div style={{ 'font-size': '24px', 'font-weight': '700', color: '#1e293b' }}>
            {agingSummary().avgDays}
          </div>
          <div style={{ 'font-size': '11px', color: '#94a3b8' }}>Avg Days in Stage</div>
        </div>

        <div style={{
          padding: '16px',
          background: '#ffffff',
          'border-radius': '8px',
          border: '1px solid #e2e8f0',
          'text-align': 'center',
        }}>
          <div style={{ 'font-size': '24px', 'font-weight': '700', color: '#ef4444' }}>
            {agingSummary().maxDays}
          </div>
          <div style={{ 'font-size': '11px', color: '#94a3b8' }}>Longest Wait</div>
        </div>

        <div style={{
          padding: '16px',
          background: '#f0fdf4',
          'border-radius': '8px',
          border: '1px solid #dcfce7',
          'text-align': 'center',
        }}>
          <div style={{ 'font-size': '24px', 'font-weight': '700', color: '#22c55e' }}>
            {agingSummary().green}
          </div>
          <div style={{ 'font-size': '11px', color: '#22c55e' }}>Fresh (&lt;3 days)</div>
        </div>

        <div style={{
          padding: '16px',
          background: '#fffbeb',
          'border-radius': '8px',
          border: '1px solid #fef3c7',
          'text-align': 'center',
        }}>
          <div style={{ 'font-size': '24px', 'font-weight': '700', color: '#f59e0b' }}>
            {agingSummary().amber}
          </div>
          <div style={{ 'font-size': '11px', color: '#f59e0b' }}>Aging (3-7 days)</div>
        </div>

        <div style={{
          padding: '16px',
          background: '#fef2f2',
          'border-radius': '8px',
          border: '1px solid #fecaca',
          'text-align': 'center',
        }}>
          <div style={{ 'font-size': '24px', 'font-weight': '700', color: '#ef4444' }}>
            {agingSummary().red}
          </div>
          <div style={{ 'font-size': '11px', color: '#ef4444' }}>Stale (&gt;7 days)</div>
        </div>
      </div>

      {/* Aging table */}
      <div style={{
        background: '#ffffff',
        'border-radius': '10px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
      }}>
        {/* Table header */}
        <div style={{
          display: 'grid',
          'grid-template-columns': '50px 1fr 180px 100px 160px 80px',
          gap: '8px',
          padding: '12px 16px',
          background: '#f8fafc',
          'border-bottom': '1px solid #e2e8f0',
          'font-size': '11px',
          'font-weight': '600',
          color: '#94a3b8',
          'text-transform': 'uppercase',
          'letter-spacing': '0.5px',
        }}>
          <span>Days</span>
          <span>Client</span>
          <span>Current Stage</span>
          <span>Priority</span>
          <span>Last Activity</span>
          <span>Action</span>
        </div>

        {/* Table rows */}
        <Show when={agingItems().length === 0}>
          <div style={{
            padding: '40px 20px',
            'text-align': 'center',
            color: '#94a3b8',
            'font-size': '14px',
          }}>
            No active clients found.
          </div>
        </Show>

        <For each={agingItems()}>
          {(item) => {
            const ageColor = AGING_COLOR_HEX[getAgingColor(item.daysInCurrentStage)];
            const statusColor = item.workflowStatus
              ? TAX_WORKFLOW_STATUS_COLORS[item.workflowStatus]
              : '#6b7280';
            const statusLabel = item.workflowStatus
              ? TAX_WORKFLOW_STATUS_LABELS[item.workflowStatus]
              : 'Unknown';

            return (
              <div
                style={{
                  display: 'grid',
                  'grid-template-columns': '50px 1fr 180px 100px 160px 80px',
                  gap: '8px',
                  padding: '12px 16px',
                  'align-items': 'center',
                  'border-bottom': '1px solid #f1f5f9',
                  cursor: 'pointer',
                  transition: 'background 0.1s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; }}
                onClick={() => handleOpenWorkspace(item.id)}
              >
                {/* Days stuck */}
                <div style={{
                  display: 'flex',
                  'align-items': 'center',
                  gap: '6px',
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    'border-radius': '50%',
                    background: ageColor,
                    'flex-shrink': '0',
                  }} />
                  <span style={{
                    'font-size': '14px',
                    'font-weight': '700',
                    color: ageColor,
                  }}>
                    {item.daysInCurrentStage}
                  </span>
                </div>

                {/* Client name */}
                <div>
                  <div style={{
                    'font-size': '14px',
                    'font-weight': '500',
                    color: '#1e293b',
                  }}>
                    {item.firstName} {item.lastName}
                  </div>
                  <Show when={item.email}>
                    <div style={{
                      'font-size': '11px',
                      color: '#94a3b8',
                    }}>
                      {item.email}
                    </div>
                  </Show>
                </div>

                {/* Current stage */}
                <div style={{
                  display: 'inline-flex',
                  'align-items': 'center',
                  gap: '4px',
                  padding: '3px 10px',
                  'border-radius': '12px',
                  background: `${statusColor}15`,
                  border: `1px solid ${statusColor}30`,
                  'font-size': '11px',
                  'font-weight': '500',
                  color: statusColor,
                  'white-space': 'nowrap',
                  'max-width': 'fit-content',
                }}>
                  <div style={{
                    width: '6px',
                    height: '6px',
                    'border-radius': '50%',
                    background: statusColor,
                  }} />
                  {statusLabel}
                </div>

                {/* Priority score */}
                <div style={{
                  display: 'flex',
                  'align-items': 'center',
                  gap: '6px',
                }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    'border-radius': '50%',
                    background: item.priority.composite >= 75 ? '#ef4444'
                      : item.priority.composite >= 50 ? '#f59e0b'
                      : item.priority.composite >= 25 ? '#1a73e8'
                      : '#22c55e',
                    display: 'flex',
                    'align-items': 'center',
                    'justify-content': 'center',
                    color: '#ffffff',
                    'font-size': '10px',
                    'font-weight': '700',
                  }}>
                    {item.priority.composite}
                  </div>
                </div>

                {/* Last activity */}
                <div style={{
                  'font-size': '12px',
                  color: '#64748b',
                }}>
                  {formatDate(item.lastActivityDate)}
                </div>

                {/* Action */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleOpenWorkspace(item.id); }}
                  style={{
                    padding: '6px 12px',
                    'border-radius': '6px',
                    border: 'none',
                    background: '#1a73e8',
                    color: '#ffffff',
                    'font-size': '12px',
                    'font-weight': '500',
                    cursor: 'pointer',
                    'white-space': 'nowrap',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#1557b0'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#1a73e8'; }}
                >
                  Open
                </button>
              </div>
            );
          }}
        </For>
      </div>
    </div>
  );
};

export default AgingView;
