import { Component, createSignal, For } from 'solid-js';
import { Button, Modal } from '../../ui';

interface ReportExportProps {
  reportType: 'balance-sheet' | 'income-statement' | 'trial-balance';
  dateRange: {
    startDate?: string;
    endDate?: string;
    asOfDate?: string;
  };
  onExport: (format: 'pdf' | 'csv' | 'excel', options: ExportOptions) => void;
  onClose: () => void;
}

interface ExportOptions {
  includeDetails: boolean;
  includeZeroBalances: boolean;
}

const ReportExport: Component<ReportExportProps> = (props) => {
  const [selectedFormat, setSelectedFormat] = createSignal<'pdf' | 'csv' | 'excel'>('pdf');
  const [includeDetails, setIncludeDetails] = createSignal(true);
  const [includeZeroBalances, setIncludeZeroBalances] = createSignal(false);
  const [exporting, setExporting] = createSignal(false);

  const formatOptions = [
    { value: 'pdf' as const, label: 'PDF', description: 'Portable Document Format - Best for printing' },
    { value: 'csv' as const, label: 'CSV', description: 'Comma-Separated Values - Best for spreadsheets' },
    { value: 'excel' as const, label: 'Excel', description: 'Microsoft Excel Format - Best for analysis' }
  ];

  const handleExport = async () => {
    try {
      setExporting(true);
      await props.onExport(selectedFormat(), {
        includeDetails: includeDetails(),
        includeZeroBalances: includeZeroBalances()
      });
      props.onClose();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  const getReportTitle = () => {
    switch (props.reportType) {
      case 'balance-sheet':
        return 'Balance Sheet';
      case 'income-statement':
        return 'Income Statement';
      case 'trial-balance':
        return 'Trial Balance';
      default:
        return 'Report';
    }
  };

  const containerStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    gap: '1.5rem',
    padding: '1rem'
  };

  const sectionStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    gap: '0.75rem'
  };

  const labelStyle = {
    'font-weight': '600',
    'font-size': '0.875rem',
    color: 'var(--text-primary)',
    'margin-bottom': '0.5rem'
  };

  const formatOptionStyle = (isSelected: boolean) => ({
    padding: '1rem',
    border: `2px solid ${isSelected ? 'var(--primary-color)' : 'var(--border-color)'}`,
    'border-radius': 'var(--border-radius-sm)',
    cursor: 'pointer',
    background: isSelected ? 'var(--primary-light)' : 'var(--surface-color)',
    transition: 'all 0.2s ease'
  });

  const formatTitleStyle = {
    'font-weight': '600',
    'font-size': '1rem',
    color: 'var(--text-primary)',
    margin: '0 0 0.25rem 0'
  };

  const formatDescStyle = {
    'font-size': '0.875rem',
    color: 'var(--text-muted)',
    margin: '0'
  };

  const checkboxContainerStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    padding: '0.75rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    background: 'var(--surface-color)',
    cursor: 'pointer'
  };

  const checkboxStyle = {
    width: '1.25rem',
    height: '1.25rem',
    cursor: 'pointer'
  };

  const checkboxLabelStyle = {
    'font-size': '0.875rem',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    flex: '1'
  };

  const dateRangeStyle = {
    padding: '1rem',
    background: 'var(--surface-hover)',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '0.875rem',
    color: 'var(--text-muted)'
  };

  const actionsStyle = {
    display: 'flex',
    gap: '0.75rem',
    'justify-content': 'flex-end',
    'margin-top': '1rem',
    'padding-top': '1rem',
    'border-top': '1px solid var(--border-color)'
  };

  const formatDateRange = () => {
    if (props.dateRange.asOfDate) {
      return `As of ${new Date(props.dateRange.asOfDate).toLocaleDateString()}`;
    }
    if (props.dateRange.startDate && props.dateRange.endDate) {
      return `${new Date(props.dateRange.startDate).toLocaleDateString()} - ${new Date(props.dateRange.endDate).toLocaleDateString()}`;
    }
    return '';
  };

  return (
    <Modal
      isOpen={true}
      onClose={props.onClose}
      title={`Export ${getReportTitle()}`}
    >
      <div style={containerStyle}>
        {/* Date Range Info */}
        <div style={dateRangeStyle}>
          {formatDateRange()}
        </div>

        {/* Format Selection */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Select Format</label>
          <For each={formatOptions}>
            {(format) => (
              <div
                style={formatOptionStyle(selectedFormat() === format.value)}
                onClick={() => setSelectedFormat(format.value)}
              >
                <h4 style={formatTitleStyle}>{format.label}</h4>
                <p style={formatDescStyle}>{format.description}</p>
              </div>
            )}
          </For>
        </div>

        {/* Export Options */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Export Options</label>

          <div
            style={checkboxContainerStyle}
            onClick={() => setIncludeDetails(!includeDetails())}
          >
            <input
              type="checkbox"
              checked={includeDetails()}
              onChange={(e) => setIncludeDetails((e.target as HTMLInputElement).checked)}
              style={checkboxStyle}
            />
            <label style={checkboxLabelStyle}>
              Include detailed account information
            </label>
          </div>

          <div
            style={checkboxContainerStyle}
            onClick={() => setIncludeZeroBalances(!includeZeroBalances())}
          >
            <input
              type="checkbox"
              checked={includeZeroBalances()}
              onChange={(e) => setIncludeZeroBalances((e.target as HTMLInputElement).checked)}
              style={checkboxStyle}
            />
            <label style={checkboxLabelStyle}>
              Include accounts with zero balances
            </label>
          </div>
        </div>

        {/* Actions */}
        <div style={actionsStyle}>
          <Button
            variant="secondary"
            onClick={props.onClose}
            disabled={exporting()}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleExport}
            disabled={exporting()}
          >
            {exporting() ? 'Exporting...' : 'Download'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ReportExport;
