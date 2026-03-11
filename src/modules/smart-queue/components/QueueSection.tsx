/**
 * QueueSection Component
 * Collapsible section with color-coded header containing QueueClientCard items
 */

import { Component, For, Show, createSignal } from 'solid-js';
import type { QueueItem, QueueSection as QueueSectionType } from '../types/smartQueueTypes';
import { QUEUE_SECTION_LABELS, QUEUE_SECTION_COLORS } from '../types/smartQueueTypes';
import QueueClientCard from './QueueClientCard';

interface QueueSectionProps {
  section: QueueSectionType;
  items: QueueItem[];
  expanded: boolean;
  onToggle: () => void;
  showCheckbox?: boolean;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  onFlag?: (id: string) => void;
  onSkip?: (id: string) => void;
}

const QueueSectionComponent: Component<QueueSectionProps> = (props) => {
  const sectionColor = () => QUEUE_SECTION_COLORS[props.section];
  const sectionLabel = () => QUEUE_SECTION_LABELS[props.section];

  return (
    <div style={{
      'margin-bottom': '16px',
      'border-radius': '10px',
      overflow: 'hidden',
      border: '1px solid #e2e8f0',
      background: '#ffffff',
    }}>
      {/* Section header */}
      <button
        onClick={props.onToggle}
        style={{
          display: 'flex',
          'align-items': 'center',
          gap: '12px',
          width: '100%',
          padding: '12px 16px',
          background: `${sectionColor()}08`,
          border: 'none',
          'border-bottom': props.expanded ? '1px solid #e2e8f0' : 'none',
          cursor: 'pointer',
          'text-align': 'left',
          transition: 'background 0.15s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = `${sectionColor()}12`; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = `${sectionColor()}08`; }}
      >
        {/* Color bar */}
        <div style={{
          width: '4px',
          height: '24px',
          'border-radius': '2px',
          background: sectionColor(),
          'flex-shrink': '0',
        }} />

        {/* Section title */}
        <span style={{
          'font-size': '15px',
          'font-weight': '600',
          color: '#1e293b',
        }}>
          {sectionLabel()}
        </span>

        {/* Count badge */}
        <div style={{
          display: 'inline-flex',
          'align-items': 'center',
          'justify-content': 'center',
          'min-width': '24px',
          height: '24px',
          padding: '0 8px',
          'border-radius': '12px',
          background: sectionColor(),
          color: '#ffffff',
          'font-size': '12px',
          'font-weight': '600',
        }}>
          {props.items.length}
        </div>

        {/* Spacer */}
        <div style={{ flex: '1' }} />

        {/* Expand/collapse icon */}
        <span style={{
          'font-size': '18px',
          color: '#94a3b8',
          transition: 'transform 0.2s ease',
          transform: props.expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          'line-height': '1',
        }}>
          &#9660;
        </span>
      </button>

      {/* Section content */}
      <Show when={props.expanded}>
        <div style={{
          padding: '8px',
          display: 'flex',
          'flex-direction': 'column',
          gap: '6px',
        }}>
          <Show when={props.items.length === 0}>
            <div style={{
              padding: '20px',
              'text-align': 'center',
              color: '#94a3b8',
              'font-size': '13px',
            }}>
              No clients in this section
            </div>
          </Show>

          <For each={props.items}>
            {(item) => (
              <QueueClientCard
                item={item}
                selected={props.selectedIds?.includes(item.id) || false}
                showCheckbox={props.showCheckbox}
                onToggleSelect={props.onToggleSelect}
                onFlag={props.onFlag}
                onSkip={props.onSkip}
              />
            )}
          </For>
        </div>
      </Show>
    </div>
  );
};

export default QueueSectionComponent;
