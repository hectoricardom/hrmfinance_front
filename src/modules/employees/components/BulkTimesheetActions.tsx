import { Component, Show, createSignal } from 'solid-js';
import { useTranslation } from '../../../translations';

interface BulkTimesheetActionsProps {
  selectedCount: number;
  onBulkApprove: () => void;
  onBulkReject: () => void;
  onBulkExport: (format: 'csv' | 'pdf') => void;
  onClearSelection: () => void;
}

const BulkTimesheetActions: Component<BulkTimesheetActionsProps> = (props) => {
  const { t } = useTranslation();
  const [showExportDropdown, setShowExportDropdown] = createSignal(false);

  const buttonStyle = {
    padding: '0.5rem 1rem',
    border: 'none',
    'border-radius': '0.375rem',
    cursor: 'pointer',
    'font-size': '0.875rem',
    'font-weight': '500',
    display: 'flex',
    'align-items': 'center',
    gap: '0.375rem',
    transition: 'all 0.15s',
  };

  const approveButtonStyle = {
    ...buttonStyle,
    'background-color': '#dcfce7',
    color: '#166534',
  };

  const rejectButtonStyle = {
    ...buttonStyle,
    'background-color': '#fee2e2',
    color: '#991b1b',
  };

  const exportButtonStyle = {
    ...buttonStyle,
    'background-color': 'var(--blue-ribbon-100)',
    color: 'var(--blue-ribbon-700)',
  };

  return (
    <Show when={props.selectedCount > 0}>
      <div
        style={{
          display: 'flex',
          'align-items': 'center',
          gap: '1rem',
          padding: '0.75rem 1rem',
          'background-color': 'var(--blue-ribbon-50)',
          'border-radius': '0.5rem',
          border: '2px solid var(--blue-ribbon-200)',
          'margin-bottom': '1rem',
        }}
      >
        <div
          style={{
            'font-weight': '600',
            color: 'var(--blue-ribbon-700)',
            display: 'flex',
            'align-items': 'center',
            gap: '0.5rem',
          }}
        >
          <span
            style={{
              'background-color': 'var(--blue-ribbon-600)',
              color: 'white',
              padding: '0.125rem 0.5rem',
              'border-radius': '9999px',
              'font-size': '0.75rem',
            }}
          >
            {props.selectedCount}
          </span>
          <span>{t('timesheets.timesheetsSelected') || 'timesheets selected'}</span>
        </div>

        <div style={{ width: '1px', height: '1.5rem', 'background-color': 'var(--border-color)' }} />

        {/* Approve */}
        <button
          style={approveButtonStyle}
          onClick={props.onBulkApprove}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#bbf7d0';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#dcfce7';
          }}
        >
          <span>✅</span>
          <span>{t('timesheets.approveAll') || 'Approve All'}</span>
        </button>

        {/* Reject */}
        <button
          style={rejectButtonStyle}
          onClick={props.onBulkReject}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#fecaca';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#fee2e2';
          }}
        >
          <span>❌</span>
          <span>{t('timesheets.rejectAll') || 'Reject All'}</span>
        </button>

        {/* Export */}
        <div style={{ position: 'relative' }}>
          <button
            style={exportButtonStyle}
            onClick={() => setShowExportDropdown(!showExportDropdown())}
          >
            <span>📥</span>
            <span>{t('common.export') || 'Export'}</span>
            <span style={{ 'font-size': '0.625rem' }}>▼</span>
          </button>

          <Show when={showExportDropdown()}>
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: '0',
                'margin-top': '0.25rem',
                'background-color': 'white',
                'border-radius': '0.5rem',
                'box-shadow': '0 4px 12px rgba(0,0,0,0.15)',
                border: '1px solid var(--border-color)',
                'min-width': '120px',
                'z-index': '100',
              }}
            >
              <button
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '0.5rem 1rem',
                  border: 'none',
                  background: 'none',
                  'text-align': 'left',
                  cursor: 'pointer',
                  'font-size': '0.875rem',
                }}
                onClick={() => {
                  props.onBulkExport('csv');
                  setShowExportDropdown(false);
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--blue-ribbon-50)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                CSV
              </button>
              <button
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '0.5rem 1rem',
                  border: 'none',
                  background: 'none',
                  'text-align': 'left',
                  cursor: 'pointer',
                  'font-size': '0.875rem',
                }}
                onClick={() => {
                  props.onBulkExport('pdf');
                  setShowExportDropdown(false);
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--blue-ribbon-50)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                PDF
              </button>
            </div>
          </Show>
        </div>

        <div style={{ flex: '1' }} />

        {/* Clear Selection */}
        <button
          style={{
            ...buttonStyle,
            'background-color': 'transparent',
            color: 'var(--text-muted)',
          }}
          onClick={props.onClearSelection}
        >
          <span>✕</span>
          <span>{t('common.clearSelection') || 'Clear selection'}</span>
        </button>
      </div>
    </Show>
  );
};

export default BulkTimesheetActions;
