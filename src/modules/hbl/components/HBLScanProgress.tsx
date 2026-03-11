import { Component, Show, For, createMemo } from 'solid-js';
import { HBLLocationScan } from '../types';
import { statusAllList } from '../status/hblUpdateService';

interface HBLScanProgressProps {
  scannedLocations?: HBLLocationScan[];
  currentStatus?: string;
  compact?: boolean;
}

/**
 * Component to display HBL scan progress and location history
 */
const HBLScanProgress: Component<HBLScanProgressProps> = (props) => {
  // Sort scanned locations by date (oldest first)
  const sortedScans = createMemo(() => {
    if (!props.scannedLocations || props.scannedLocations.length === 0) {
      return [];
    }
    return [...props.scannedLocations].sort((a, b) =>
      new Date(a.scannedAt).getTime() - new Date(b.scannedAt).getTime()
    );
  });

  // Get current location info
  const currentLocation = createMemo(() => {
    return statusAllList.find(status => status.id === props.status);
  });

  const infoLocation = (id:string) => {
    return statusAllList.find(status => status.id === id);
  };

  // Format date
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Styles
  const containerStyle = {
    padding: props.compact ? '0.75rem' : '1rem',
    'background-color': '#f8f9fa',
    'border-radius': '8px',
    border: '1px solid #dee2e6'
  };

  const timelineStyle = {
    position: 'relative' as const,
    'padding-left': '2rem',
    'margin-top': '1rem'
  };

  const timelineLineStyle = {
    position: 'absolute' as const,
    left: '0.5rem',
    top: '0',
    bottom: '0',
    width: '2px',
    'background-color': '#007bff'
  };

  const scanItemStyle = (isLast: boolean) => ({
    position: 'relative' as const,
    'margin-bottom': isLast ? '0' : '1rem',
    'padding-bottom': isLast ? '0' : '1rem'
  });

  const dotStyle = {
    position: 'absolute' as const,
    left: '-1.8rem',
    top: '0.25rem',
    width: '0.75rem',
    height: '0.75rem',
    'border-radius': '50%',
    'background-color': '#007bff',
    border: '2px solid white'
  };

  const currentDotStyle = {
    ...dotStyle,
    'background-color': '#28a745',
    width: '1rem',
    height: '1rem',
    left: '-1.95rem'
  };

  const labelStyle = {
    'font-weight': '600',
    'font-size': props.compact ? '0.85rem' : '0.9rem',
    color: '#212529'
  };

  const dateStyle = {
    'font-size': props.compact ? '0.7rem' : '0.75rem',
    color: '#6c757d',
    'margin-top': '0.25rem'
  };

  const scannedByStyle = {
    'font-size': props.compact ? '0.7rem' : '0.75rem',
    color: '#495057',
    'margin-top': '0.125rem',
    'font-style': 'italic'
  };

  const notesStyle = {
    'font-size': props.compact ? '0.7rem' : '0.75rem',
    color: '#6c757d',
    'margin-top': '0.25rem',
    'padding': '0.25rem 0.5rem',
    'background-color': '#fff',
    'border-radius': '4px',
    'border-left': '3px solid #007bff'
  };

  const currentBadgeStyle = {
    display: 'inline-block',
    padding: '0.25rem 0.5rem',
    'background-color': '#28a745',
    color: 'white',
    'border-radius': '12px',
    'font-size': props.compact ? '0.7rem' : '0.75rem',
    'font-weight': '600',
    'margin-left': '0.5rem'
  };

  const emptyStateStyle = {
    'text-align': 'center' as const,
    padding: '2rem',
    color: '#6c757d',
    'font-size': '0.9rem'
  };

  return (
    <div style={containerStyle}>
      <div style={{
        display: 'flex',
        'align-items': 'center',
        'justify-content': 'space-between',
        'margin-bottom': sortedScans().length > 0 ? '0.5rem' : '0'
      }}>
        <h3 style={{
          margin: '0',
          'font-size': props.compact ? '0.95rem' : '1.1rem',
          color: '#212529'
        }}>
          📍 Location Scan History
        </h3>
        <Show when={currentLocation()}>
          <span style={currentBadgeStyle}>
            {currentLocation()?.label}
          </span>
        </Show>
      </div>

      <Show
        when={sortedScans().length > 0}
        fallback={
          <div style={emptyStateStyle}>
            <div style={{ 'font-size': '2rem', 'margin-bottom': '0.5rem' }}>📦</div>
            <div>No location scans recorded yet</div>
          </div>
        }
      >
        <div style={timelineStyle}>
          <div style={timelineLineStyle}></div>

          <For each={sortedScans()}>
            {(scan, index) => (
              <div style={scanItemStyle(index() === sortedScans().length - 1)}>
                <div style={index() === sortedScans().length - 1 ? currentDotStyle : dotStyle}></div>

                <div>
                  <div style={labelStyle}>
                    
                    {infoLocation(scan.status)?.label}
                    <Show when={index() === sortedScans().length - 1}>
                      <span style={{
                        'margin-left': '0.5rem',
                        'font-size': '0.75rem',
                        color: '#28a745'
                      }}>
                        (Current)
                      </span>
                    </Show>
                  </div>

                  <div style={dateStyle}>
                    {formatDate(scan.scannedAt)}
                  </div>

                  <Show when={scan.userName}>
                    <div style={scannedByStyle}>
                      Scanned by: {scan.userName}
                    </div>
                  </Show>

                  <Show when={scan.notes}>
                    <div style={notesStyle}>
                      {scan.notes}
                    </div>
                  </Show>
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>

      <Show when={sortedScans().length > 0}>
        <div style={{
          'margin-top': '1rem',
          'padding-top': '0.75rem',
          'border-top': '1px solid #dee2e6',
          'font-size': props.compact ? '0.75rem' : '0.85rem',
          color: '#6c757d',
          'text-align': 'center' as const
        }}>
          Total Locations: {sortedScans().length}
        </div>
      </Show>
    </div>
  );
};

export default HBLScanProgress;
