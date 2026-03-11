import { Component, JSX, createSignal, createMemo, Show } from 'solid-js';
import { DrakeTaxDocument, DrakeTaxDocumentType, DRAKE_FORM_LABELS } from '../../types/drakeTypes';

interface TaxDocumentCardProps {
  document: DrakeTaxDocument;
  onEdit?: () => void;
  onDelete?: () => void;
  onVerify?: () => void;
  showActions?: boolean;
}

const TaxDocumentCard: Component<TaxDocumentCardProps> = (props) => {
  const [isHovered, setIsHovered] = createSignal(false);

  const getFormIcon = createMemo(() => {
    const formType = props.document.drakeFormType;
    switch (formType) {
      case 'w2':
        return '\uD83D\uDCBC'; // Briefcase
      case '1099_misc':
      case '1099_nec':
        return '\uD83D\uDCB5'; // Dollar
      case '1099_int':
        return '\uD83C\uDFE6'; // Bank
      case '1099_div':
        return '\uD83D\uDCC8'; // Chart
      case '1098':
        return '\uD83C\uDFE0'; // House
      case '1098_t':
        return '\uD83C\uDF93'; // Graduation cap
      case 'schedule_k1':
        return '\uD83E\uDD1D'; // Handshake
      case 'receipt':
        return '\uD83E\uDDFE'; // Receipt
      default:
        return '\uD83D\uDCC4'; // Document
    }
  });

  const getFormColor = createMemo(() => {
    const formType = props.document.drakeFormType;
    switch (formType) {
      case 'w2':
        return '#3B82F6'; // Blue
      case '1099_misc':
      case '1099_nec':
        return '#10B981'; // Green
      case '1099_int':
        return '#6366F1'; // Indigo
      case '1099_div':
        return '#8B5CF6'; // Purple
      case '1098':
        return '#F59E0B'; // Amber
      case '1098_t':
        return '#EC4899'; // Pink
      case 'schedule_k1':
        return '#14B8A6'; // Teal
      case 'receipt':
        return '#6B7280'; // Gray
      default:
        return '#9CA3AF'; // Light gray
    }
  });

  const getStatusConfig = createMemo(() => {
    switch (props.document.uploadStatus) {
      case 'uploading':
        return {
          color: '#3B82F6',
          bgColor: 'rgba(59, 130, 246, 0.15)',
          label: 'Uploading...'
        };
      case 'analyzing':
        return {
          color: '#F59E0B',
          bgColor: 'rgba(245, 158, 11, 0.15)',
          label: 'Analyzing...'
        };
      case 'analyzed':
        return {
          color: '#6366F1',
          bgColor: 'rgba(99, 102, 241, 0.15)',
          label: 'Analyzed'
        };
      case 'verified':
        return {
          color: '#10B981',
          bgColor: 'rgba(16, 185, 129, 0.15)',
          label: 'Verified'
        };
      case 'error':
        return {
          color: '#EF4444',
          bgColor: 'rgba(239, 68, 68, 0.15)',
          label: 'Error'
        };
      default:
        return {
          color: '#6B7280',
          bgColor: 'rgba(107, 114, 128, 0.15)',
          label: 'Pending'
        };
    }
  });

  const formLabel = createMemo(() => {
    const formType = props.document.drakeFormType;
    if (formType && DRAKE_FORM_LABELS[formType]) {
      return DRAKE_FORM_LABELS[formType];
    }
    return 'Unknown Document';
  });

  const mainAmount = createMemo(() => {
    const amounts = props.document.extractedAmounts;
    if (!amounts) return null;

    // Return the most relevant amount based on form type
    if (amounts.wages) return amounts.wages;
    if (amounts.nonEmployeeCompensation) return amounts.nonEmployeeCompensation;
    if (amounts.interestIncome) return amounts.interestIncome;
    if (amounts.ordinaryDividends) return amounts.ordinaryDividends;
    if (amounts.mortgageInterest) return amounts.mortgageInterest;
    if (amounts.paymentsReceived) return amounts.paymentsReceived;
    if (amounts.ordinaryBusinessIncome) return amounts.ordinaryBusinessIncome;
    if (amounts.totalAmount) return amounts.totalAmount;

    return null;
  });

  const payerName = createMemo(() => {
    return props.document.payerInfo?.name || null;
  });

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const cardStyle = createMemo((): JSX.CSSProperties => ({
    display: 'flex',
    'flex-direction': 'column',
    gap: '0.75rem',
    padding: '1rem',
    background: 'var(--surface-color, #ffffff)',
    'border-radius': 'var(--border-radius, 8px)',
    border: `1px solid ${isHovered() ? getFormColor() : 'var(--border-color, #e5e7eb)'}`,
    'box-shadow': isHovered()
      ? `0 4px 12px ${getFormColor()}20`
      : 'var(--shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.05))',
    transition: 'all 0.2s ease'
  }));

  const headerStyle: JSX.CSSProperties = {
    display: 'flex',
    'align-items': 'flex-start',
    'justify-content': 'space-between',
    gap: '0.75rem'
  };

  const iconContainerStyle = createMemo((): JSX.CSSProperties => ({
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    width: '2.5rem',
    height: '2.5rem',
    'border-radius': '0.5rem',
    background: `${getFormColor()}15`,
    'font-size': '1.25rem',
    'flex-shrink': '0'
  }));

  const infoStyle: JSX.CSSProperties = {
    display: 'flex',
    'flex-direction': 'column',
    gap: '0.25rem',
    flex: '1',
    'min-width': '0'
  };

  const formTypeStyle = createMemo((): JSX.CSSProperties => ({
    'font-size': '0.875rem',
    'font-weight': '600',
    color: getFormColor()
  }));

  const fileNameStyle: JSX.CSSProperties = {
    'font-size': '0.75rem',
    color: 'var(--text-secondary, #6B7280)',
    'white-space': 'nowrap',
    overflow: 'hidden',
    'text-overflow': 'ellipsis'
  };

  const statusBadgeStyle = createMemo((): JSX.CSSProperties => {
    const config = getStatusConfig();
    return {
      display: 'inline-flex',
      'align-items': 'center',
      padding: '0.25rem 0.5rem',
      'border-radius': '9999px',
      background: config.bgColor,
      color: config.color,
      'font-size': '0.625rem',
      'font-weight': '600',
      'text-transform': 'uppercase',
      'letter-spacing': '0.025em',
      'white-space': 'nowrap'
    };
  });

  const detailsStyle: JSX.CSSProperties = {
    display: 'flex',
    'flex-direction': 'column',
    gap: '0.375rem',
    'padding-top': '0.5rem',
    'border-top': '1px solid var(--border-color, #e5e7eb)'
  };

  const detailRowStyle: JSX.CSSProperties = {
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'space-between',
    'font-size': '0.8125rem'
  };

  const detailLabelStyle: JSX.CSSProperties = {
    color: 'var(--text-secondary, #6B7280)'
  };

  const detailValueStyle: JSX.CSSProperties = {
    color: 'var(--text-primary, #1f2937)',
    'font-weight': '600'
  };

  const actionsStyle: JSX.CSSProperties = {
    display: 'flex',
    gap: '0.5rem',
    'margin-top': '0.25rem'
  };

  const actionButtonStyle = (variant: 'edit' | 'delete' | 'verify'): JSX.CSSProperties => {
    const configs = {
      edit: { color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.1)' },
      delete: { color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.1)' },
      verify: { color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.1)' }
    };
    const config = configs[variant];
    return {
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      padding: '0.375rem 0.75rem',
      'border-radius': '0.375rem',
      'font-size': '0.75rem',
      'font-weight': '500',
      color: config.color,
      background: config.bgColor,
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    };
  };

  return (
    <div
      style={cardStyle()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={headerStyle}>
        <div style={iconContainerStyle()}>
          {getFormIcon()}
        </div>
        <div style={infoStyle}>
          <span style={formTypeStyle()}>{formLabel()}</span>
          <span style={fileNameStyle} title={props.document.originalFileName}>
            {props.document.originalFileName}
          </span>
        </div>
        <span style={statusBadgeStyle()}>{getStatusConfig().label}</span>
      </div>

      <Show when={mainAmount() !== null || payerName()}>
        <div style={detailsStyle}>
          <Show when={payerName()}>
            <div style={detailRowStyle}>
              <span style={detailLabelStyle}>Payer</span>
              <span style={detailValueStyle}>{payerName()}</span>
            </div>
          </Show>
          <Show when={mainAmount() !== null}>
            <div style={detailRowStyle}>
              <span style={detailLabelStyle}>Amount</span>
              <span style={detailValueStyle}>{formatCurrency(mainAmount()!)}</span>
            </div>
          </Show>
        </div>
      </Show>

      <Show when={props.showActions}>
        <div style={actionsStyle}>
          <Show when={props.onEdit}>
            <button style={actionButtonStyle('edit')} onClick={props.onEdit}>
              Edit
            </button>
          </Show>
          <Show when={props.onVerify && props.document.uploadStatus !== 'verified'}>
            <button style={actionButtonStyle('verify')} onClick={props.onVerify}>
              Verify
            </button>
          </Show>
          <Show when={props.onDelete}>
            <button style={actionButtonStyle('delete')} onClick={props.onDelete}>
              Delete
            </button>
          </Show>
        </div>
      </Show>
    </div>
  );
};

export default TaxDocumentCard;
