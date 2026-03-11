import { Component, JSX, createSignal, createMemo, Show } from 'solid-js';

interface TaxFormLineItemProps {
  formCode: string;
  boxNumber: string;
  description: string;
  amount: number;
  sourceDocumentCount?: number;
  onClick?: () => void;
}

const TaxFormLineItem: Component<TaxFormLineItemProps> = (props) => {
  const [isHovered, setIsHovered] = createSignal(false);

  const isClickable = createMemo(() => !!props.onClick);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const rowStyle = createMemo((): JSX.CSSProperties => ({
    display: 'flex',
    'align-items': 'center',
    gap: '1rem',
    padding: '0.75rem 1rem',
    background: isHovered() && isClickable()
      ? 'var(--hover-color, rgba(59, 130, 246, 0.05))'
      : 'transparent',
    'border-radius': 'var(--border-radius, 6px)',
    cursor: isClickable() ? 'pointer' : 'default',
    transition: 'background 0.2s ease',
    'border-bottom': '1px solid var(--border-color, #e5e7eb)'
  }));

  const boxNumberStyle = createMemo((): JSX.CSSProperties => ({
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    'min-width': '4.5rem',
    padding: '0.375rem 0.625rem',
    'border-radius': '0.375rem',
    background: isHovered() && isClickable()
      ? 'var(--primary-color, #3B82F6)'
      : 'var(--surface-secondary, #f3f4f6)',
    color: isHovered() && isClickable()
      ? '#ffffff'
      : 'var(--text-secondary, #6B7280)',
    'font-size': '0.75rem',
    'font-weight': '600',
    'text-align': 'center',
    transition: 'all 0.2s ease',
    'flex-shrink': '0'
  }));

  const descriptionStyle: JSX.CSSProperties = {
    flex: '1',
    'font-size': '0.875rem',
    color: 'var(--text-primary, #1f2937)',
    'min-width': '0',
    'white-space': 'nowrap',
    overflow: 'hidden',
    'text-overflow': 'ellipsis'
  };

  const rightContentStyle: JSX.CSSProperties = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.75rem',
    'flex-shrink': '0'
  };

  const sourceCountStyle: JSX.CSSProperties = {
    display: 'inline-flex',
    'align-items': 'center',
    'justify-content': 'center',
    'min-width': '1.5rem',
    height: '1.5rem',
    padding: '0 0.375rem',
    'border-radius': '9999px',
    background: 'var(--primary-color, #3B82F6)',
    color: '#ffffff',
    'font-size': '0.6875rem',
    'font-weight': '600'
  };

  const amountStyle = createMemo((): JSX.CSSProperties => ({
    'font-size': '0.9375rem',
    'font-weight': '700',
    color: props.amount >= 0
      ? 'var(--text-primary, #1f2937)'
      : '#EF4444',
    'min-width': '6rem',
    'text-align': 'right',
    'font-variant-numeric': 'tabular-nums'
  }));

  const arrowStyle = createMemo((): JSX.CSSProperties => ({
    display: isClickable() ? 'flex' : 'none',
    'align-items': 'center',
    'justify-content': 'center',
    width: '1.25rem',
    height: '1.25rem',
    color: isHovered()
      ? 'var(--primary-color, #3B82F6)'
      : 'var(--text-muted, #9CA3AF)',
    transition: 'color 0.2s ease, transform 0.2s ease',
    transform: isHovered() ? 'translateX(2px)' : 'translateX(0)'
  }));

  const handleClick = () => {
    if (props.onClick) {
      props.onClick();
    }
  };

  return (
    <div
      style={rowStyle()}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={boxNumberStyle()}>
        {props.boxNumber}
      </div>
      <span style={descriptionStyle} title={props.description}>
        {props.description}
      </span>
      <div style={rightContentStyle}>
        <Show when={props.sourceDocumentCount !== undefined && props.sourceDocumentCount > 0}>
          <span style={sourceCountStyle} title={`${props.sourceDocumentCount} source document(s)`}>
            {props.sourceDocumentCount}
          </span>
        </Show>
        <span style={amountStyle()}>
          {formatCurrency(props.amount)}
        </span>
        <span style={arrowStyle()}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M5.25 3.5L8.75 7L5.25 10.5"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
      </div>
    </div>
  );
};

export default TaxFormLineItem;
