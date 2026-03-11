import { Component, Show, createSignal } from 'solid-js';
import { useTranslation } from '../../../translations';

interface BulkActionsToolbarProps {
  selectedCount: number;
  onBulkDelete: () => void;
  onBulkExport?: (format: 'csv' | 'pdf') => void;
  onBulkAssignDepartment: (department: string) => void;
  onClearSelection: () => void;
  departments: string[];
}

const BulkActionsToolbar: Component<BulkActionsToolbarProps> = (props) => {
  const { t } = useTranslation();
  const [showDeptDropdown, setShowDeptDropdown] = createSignal(false);
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

  const primaryButtonStyle = {
    ...buttonStyle,
    'background-color': 'var(--blue-ribbon-100)',
    color: 'var(--blue-ribbon-700)',
  };

  const dangerButtonStyle = {
    ...buttonStyle,
    'background-color': '#fee2e2',
    color: '#991b1b',
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
          <span>{t('common.selected') || 'selected'}</span>
        </div>

        <div style={{ width: '1px', height: '1.5rem', 'background-color': 'var(--border-color)' }} />

        {/* Assign Department */}
        <div style={{ position: 'relative' }}>
          <button
            style={primaryButtonStyle}
            onClick={() => setShowDeptDropdown(!showDeptDropdown())}
          >
            <span>🏢</span>
            <span>{t('employees.assignDepartment') || 'Assign Department'}</span>
            <span style={{ 'font-size': '0.625rem' }}>▼</span>
          </button>

          <Show when={showDeptDropdown()}>
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
                'min-width': '180px',
                'z-index': '100',
                'max-height': '200px',
                'overflow-y': 'auto',
              }}
            >
              {props.departments.map((dept) => (
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
                    props.onBulkAssignDepartment(dept);
                    setShowDeptDropdown(false);
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--blue-ribbon-50)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {dept}
                </button>
              ))}
            </div>
          </Show>
        </div>

        {/* Export */}
        <Show when={props.onBulkExport}>
          <div style={{ position: 'relative' }}>
            <button
              style={primaryButtonStyle}
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
                    props.onBulkExport?.('csv');
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
                    props.onBulkExport?.('pdf');
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
        </Show>

        {/* Delete */}
        <button style={dangerButtonStyle} onClick={props.onBulkDelete}>
          <span>🗑️</span>
          <span>{t('common.delete') || 'Delete'}</span>
        </button>

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

export default BulkActionsToolbar;
