/**
 * SmartQueuePage Component
 * Main page for the Smart Queue module with metrics, view tabs, and queue sections
 */

import { Component, Show, For, Switch, Match, onMount, createMemo, createSignal } from 'solid-js';
import { Card } from '../../ui';
import { useTranslation } from '../../../translations';
import { authStore } from '../../../stores/authStore';
import type { TaxPortal } from '../../drake-export/types/drakeTypes';
import type { QueueView, QueueSection } from '../types/smartQueueTypes';
import { QUEUE_VIEW_LABELS } from '../types/smartQueueTypes';
import {
  smartQueueStore,
  smartQueueActions,
  smartQueueGetters,
} from '../stores/smartQueueStore';
import SeasonMetricsBar from './SeasonMetricsBar';
import QueueSectionComponent from './QueueSection';
import BottlenecksView from './BottlenecksView';
import RevenuePipelineView from './RevenuePipelineView';
import BatchReadyView from './BatchReadyView';
import AgingView from './AgingView';

const viewTabs: { key: QueueView; label: string; description: string }[] = [
  { key: 'my_day', label: 'My Day', description: 'Prioritized client queue' },
  { key: 'bottlenecks', label: 'Bottlenecks', description: 'Pipeline analysis' },
  { key: 'revenue', label: 'Revenue', description: 'Revenue pipeline' },
  { key: 'batch', label: 'Batch', description: 'Batch processing' },
  { key: 'aging', label: 'Aging', description: 'Client aging report' },
];

interface SmartQueuePageProps {
  portals?: TaxPortal[];
}

const SmartQueuePage: Component<SmartQueuePageProps> = (props) => {
  const { t } = useTranslation();
  const [searchValue, setSearchValue] = createSignal('');

  onMount(() => {
    if (authStore.hasPermission('taxWorkflowAccess')) {
      if (props.portals && props.portals.length > 0) {
        smartQueueActions.loadQueueFromPortals(props.portals);
      } else {
        smartQueueActions.loadQueue();
      }
    }
  });

  const groupedItems = createMemo(() => smartQueueGetters.getGroupedItems());

  const sectionOrder: QueueSection[] = ['urgent', 'ready', 'almost_ready', 'in_progress', 'waiting'];

  const handleSearchInput = (value: string) => {
    setSearchValue(value);
    smartQueueActions.setSearch(value);
  };

  const handleRefresh = () => {
    smartQueueActions.loadQueue();
  };

  const totalFiltered = createMemo(() => {
    const groups = groupedItems();
    return Object.values(groups).reduce((sum, items) => sum + items.length, 0);
  });

  return (
    <div style={{
      'max-width': '1400px',
      margin: '0 auto',
      padding: '20px',
    }}>
      {/* Page header */}
      <div style={{
        display: 'flex',
        'align-items': 'center',
        'justify-content': 'space-between',
        'margin-bottom': '20px',
        'flex-wrap': 'wrap',
        gap: '12px',
      }}>
        <div>
          <h1 style={{
            'font-size': '24px',
            'font-weight': '700',
            color: '#1e293b',
            margin: '0 0 4px 0',
          }}>
            Smart Queue
          </h1>
          <p style={{
            'font-size': '14px',
            color: '#94a3b8',
            margin: '0',
          }}>
            Intelligent tax client prioritization and workflow management
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={smartQueueStore.isLoading}
          style={{
            padding: '8px 20px',
            'border-radius': '6px',
            border: '1px solid #e2e8f0',
            background: '#ffffff',
            color: '#475569',
            'font-size': '13px',
            'font-weight': '500',
            cursor: smartQueueStore.isLoading ? 'not-allowed' : 'pointer',
            opacity: smartQueueStore.isLoading ? '0.6' : '1',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (!smartQueueStore.isLoading) {
              e.currentTarget.style.borderColor = '#1a73e8';
              e.currentTarget.style.color = '#1a73e8';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#e2e8f0';
            e.currentTarget.style.color = '#475569';
          }}
        >
          {smartQueueStore.isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Season Metrics Bar */}
      <div style={{ 'margin-bottom': '20px' }}>
        <SeasonMetricsBar metrics={smartQueueStore.seasonMetrics} />
      </div>

      {/* View tabs + Search */}
      <div style={{
        display: 'flex',
        'align-items': 'center',
        gap: '8px',
        'margin-bottom': '20px',
        'flex-wrap': 'wrap',
      }}>
        {/* Tabs */}
        <div style={{
          display: 'flex',
          'align-items': 'center',
          gap: '2px',
          background: '#f1f5f9',
          'border-radius': '8px',
          padding: '3px',
        }}>
          <For each={viewTabs}>
            {(tab) => (
              <button
                onClick={() => smartQueueActions.setView(tab.key)}
                title={tab.description}
                style={{
                  padding: '8px 16px',
                  'border-radius': '6px',
                  border: 'none',
                  background: smartQueueStore.currentView === tab.key ? '#ffffff' : 'transparent',
                  color: smartQueueStore.currentView === tab.key ? '#1a73e8' : '#64748b',
                  'font-size': '13px',
                  'font-weight': smartQueueStore.currentView === tab.key ? '600' : '400',
                  cursor: 'pointer',
                  'box-shadow': smartQueueStore.currentView === tab.key
                    ? '0 1px 3px rgba(0,0,0,0.08)'
                    : 'none',
                  transition: 'all 0.15s ease',
                  'white-space': 'nowrap',
                }}
              >
                {tab.label}
              </button>
            )}
          </For>
        </div>

        <div style={{ flex: '1' }} />

        {/* Search bar */}
        <div style={{
          position: 'relative',
          'min-width': '240px',
        }}>
          <input
            type="text"
            placeholder="Search clients..."
            value={searchValue()}
            onInput={(e) => handleSearchInput(e.currentTarget.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              'border-radius': '8px',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              'font-size': '13px',
              color: '#1e293b',
              outline: 'none',
              transition: 'border-color 0.15s ease',
              'box-sizing': 'border-box',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#1a73e8'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; }}
          />
          <span style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#94a3b8',
            'font-size': '16px',
            'pointer-events': 'none',
          }}>
            &#x1F50D;
          </span>
        </div>

        {/* Client count */}
        <Show when={smartQueueStore.currentView === 'my_day'}>
          <div style={{
            padding: '6px 12px',
            'border-radius': '16px',
            background: '#f1f5f9',
            'font-size': '12px',
            color: '#64748b',
            'white-space': 'nowrap',
          }}>
            {totalFiltered()} clients
          </div>
        </Show>
      </div>

      {/* Error state */}
      <Show when={smartQueueStore.error}>
        <div style={{
          padding: '16px 20px',
          'border-radius': '8px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#dc2626',
          'font-size': '14px',
          'margin-bottom': '20px',
        }}>
          {smartQueueStore.error}
        </div>
      </Show>

      {/* Loading state */}
      <Show when={smartQueueStore.isLoading && smartQueueStore.queueItems.length === 0}>
        <div style={{
          padding: '60px 20px',
          'text-align': 'center',
          color: '#94a3b8',
          'font-size': '14px',
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #e2e8f0',
            'border-top-color': '#1a73e8',
            'border-radius': '50%',
            margin: '0 auto 16px auto',
            animation: 'spin 0.8s linear infinite',
          }} />
          Loading Smart Queue...
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </Show>

      {/* Main content - view switching */}
      <Show when={!smartQueueStore.isLoading || smartQueueStore.queueItems.length > 0}>
        <Switch>
          {/* My Day view - default */}
          <Match when={smartQueueStore.currentView === 'my_day'}>
            <div style={{
              display: 'flex',
              'flex-direction': 'column',
              gap: '0',
            }}>
              <For each={sectionOrder}>
                {(section) => {
                  const items = () => groupedItems()[section] || [];
                  return (
                    <Show when={items().length > 0 || section === 'urgent' || section === 'ready'}>
                      <QueueSectionComponent
                        section={section}
                        items={items()}
                        expanded={smartQueueStore.expandedSections[section]}
                        onToggle={() => smartQueueActions.toggleSection(section)}
                        onFlag={(id) => smartQueueActions.toggleFlag(id)}
                      />
                    </Show>
                  );
                }}
              </For>

              {/* Empty state */}
              <Show when={totalFiltered() === 0 && !smartQueueStore.isLoading}>
                <div style={{
                  padding: '60px 20px',
                  'text-align': 'center',
                  background: '#ffffff',
                  'border-radius': '10px',
                  border: '1px solid #e2e8f0',
                }}>
                  <div style={{
                    'font-size': '18px',
                    'font-weight': '600',
                    color: '#1e293b',
                    'margin-bottom': '8px',
                  }}>
                    Queue is empty
                  </div>
                  <div style={{
                    'font-size': '14px',
                    color: '#94a3b8',
                  }}>
                    {searchValue()
                      ? 'No clients match your search criteria. Try a different search.'
                      : 'No active clients to display. All caught up!'}
                  </div>
                </div>
              </Show>
            </div>
          </Match>

          {/* Bottlenecks view */}
          <Match when={smartQueueStore.currentView === 'bottlenecks'}>
            <BottlenecksView />
          </Match>

          {/* Revenue view */}
          <Match when={smartQueueStore.currentView === 'revenue'}>
            <RevenuePipelineView />
          </Match>

          {/* Batch view */}
          <Match when={smartQueueStore.currentView === 'batch'}>
            <BatchReadyView />
          </Match>

          {/* Aging view */}
          <Match when={smartQueueStore.currentView === 'aging'}>
            <AgingView />
          </Match>
        </Switch>
      </Show>
    </div>
  );
};

export default SmartQueuePage;
