import { Component, Show, createMemo } from 'solid-js';
import { HBLLocationScan } from '../types';

interface HBLScanIndicatorProps {
  scannedLocations?: HBLLocationScan[];
  showCount?: boolean;
  size?: 'small' | 'medium';
}

/**
 * Compact indicator showing scan status for HBL list views
 */
const HBLScanIndicator: Component<HBLScanIndicatorProps> = (props) => {
  const scanCount = createMemo(() => props.scannedLocations?.length || 0);

  const lastScan = createMemo(() => {
    if (!props.scannedLocations || props.scannedLocations.length === 0) {
      return null;
    }
    // Return the most recent scan
    return [...props.scannedLocations].sort((a, b) =>
      new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime()
    )[0];
  });

  const formatDate = (date: Date) => {
    const now = new Date();
    const scanDate = new Date(date);
    const diffMs = now.getTime() - scanDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return scanDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const indicatorSize = props.size || 'small';

  const containerStyle = {
    display: 'inline-flex',
    'align-items': 'center',
    gap: indicatorSize === 'small' ? '0.25rem' : '0.375rem',
    padding: indicatorSize === 'small' ? '0.125rem 0.375rem' : '0.25rem 0.5rem',
    'background-color': scanCount() > 0 ? '#e8f5e9' : '#f5f5f5',
    'border-radius': '12px',
    'font-size': indicatorSize === 'small' ? '0.7rem' : '0.75rem',
    border: `1px solid ${scanCount() > 0 ? '#c8e6c9' : '#e0e0e0'}`,
    color: scanCount() > 0 ? '#2e7d32' : '#757575'
  };

  const iconStyle = {
    'font-size': indicatorSize === 'small' ? '0.8rem' : '0.9rem'
  };

  const badgeStyle = {
    display: 'inline-flex',
    'align-items': 'center',
    'justify-content': 'center',
    'min-width': indicatorSize === 'small' ? '1rem' : '1.25rem',
    height: indicatorSize === 'small' ? '1rem' : '1.25rem',
    'background-color': scanCount() > 0 ? '#4caf50' : '#bdbdbd',
    color: 'white',
    'border-radius': '50%',
    'font-size': indicatorSize === 'small' ? '0.65rem' : '0.7rem',
    'font-weight': '600',
    'line-height': '1'
  };

  const lastScanStyle = {
    'font-size': indicatorSize === 'small' ? '0.65rem' : '0.7rem',
    color: '#616161',
    'margin-left': '0.25rem'
  };

  return (
    <div
      style={containerStyle}
      title={lastScan() ? `Last scanned: ${lastScan()!.locationLabel} at ${new Date(lastScan()!.scannedAt).toLocaleString()}` : 'No scans recorded'}
    >
      <span style={iconStyle}>📍</span>

      <Show when={props.showCount !== false}>
        <span style={badgeStyle}>
          {scanCount()}
        </span>
      </Show>

      <Show when={scanCount() > 0}>
        <span>
          {scanCount()} {scanCount() === 1 ? 'scan' : 'scans'}
        </span>
      </Show>

      <Show when={scanCount() === 0}>
        <span>No scans</span>
      </Show>

      <Show when={lastScan()}>
        <span style={lastScanStyle}>
          • {formatDate(lastScan()!.scannedAt)}
        </span>
      </Show>
    </div>
  );
};

export default HBLScanIndicator;
