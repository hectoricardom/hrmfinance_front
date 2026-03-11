import { Component, createSignal } from 'solid-js';
import { Button, Card } from '../../ui';

interface ReportFiltersProps {
  startDate: string;
  endDate: string;
  onDateChange: (startDate: string, endDate: string) => void;
  onExport: () => void;
}

const ReportFilters: Component<ReportFiltersProps> = (props) => {
  const [localStartDate, setLocalStartDate] = createSignal(props.startDate);
  const [localEndDate, setLocalEndDate] = createSignal(props.endDate);

  const handleQuickSelect = (period: string) => {
    const today = new Date();
    let start: Date;
    let end: Date;

    switch (period) {
      case 'this-month':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'last-month':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'this-year':
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date(today.getFullYear(), 11, 31);
        break;
      case 'last-year':
        start = new Date(today.getFullYear() - 1, 0, 1);
        end = new Date(today.getFullYear() - 1, 11, 31);
        break;
      default:
        return;
    }

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    setLocalStartDate(startStr);
    setLocalEndDate(endStr);
    props.onDateChange(startStr, endStr);
  };

  const handleStartDateChange = (e: Event) => {
    const value = (e.target as HTMLInputElement).value;
    setLocalStartDate(value);
    props.onDateChange(value, localEndDate());
  };

  const handleEndDateChange = (e: Event) => {
    const value = (e.target as HTMLInputElement).value;
    setLocalEndDate(value);
    props.onDateChange(localStartDate(), value);
  };

  const containerStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    gap: '1rem'
  };

  const rowStyle = {
    display: 'flex',
    'flex-wrap': 'wrap' as const,
    gap: '1rem',
    'align-items': 'center'
  };

  const inputGroupStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    gap: '0.5rem'
  };

  const labelStyle = {
    'font-weight': '500',
    'font-size': '0.875rem',
    color: 'var(--text-primary)'
  };

  const inputStyle = {
    padding: '0.5rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '0.875rem',
    'font-family': 'inherit',
    color: 'var(--text-primary)',
    background: 'var(--surface-color)'
  };

  const quickSelectStyle = {
    display: 'flex',
    gap: '0.5rem',
    'flex-wrap': 'wrap' as const
  };

  const exportSectionStyle = {
    display: 'flex',
    'justify-content': 'flex-end',
    'padding-top': '0.5rem',
    'border-top': '1px solid var(--border-color)'
  };

  return (
    <Card title="Report Filters">
      <div style={containerStyle}>
        {/* Date Range Inputs */}
        <div style={rowStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Start Date</label>
            <input
              type="date"
              value={localStartDate()}
              onInput={handleStartDateChange}
              style={inputStyle}
            />
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>End Date</label>
            <input
              type="date"
              value={localEndDate()}
              onInput={handleEndDateChange}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Quick Select Buttons */}
        <div style={inputGroupStyle}>
          <label style={labelStyle}>Quick Select</label>
          <div style={quickSelectStyle}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickSelect('this-month')}
            >
              This Month
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickSelect('last-month')}
            >
              Last Month
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickSelect('this-year')}
            >
              This Year
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickSelect('last-year')}
            >
              Last Year
            </Button>
          </div>
        </div>

        {/* Export Section */}
        <div style={exportSectionStyle}>
          <Button onClick={props.onExport}>
            Export Report
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ReportFilters;
