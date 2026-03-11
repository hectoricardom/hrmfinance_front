import { Component, Show, createSignal } from 'solid-js';
import { CountSession, CountItem } from '../types/counting';

interface CountingProgressProps {
  session: CountSession;
  currentItem: CountItem | null;
  onUpdateCount: (count: number) => void;
  onNext: () => void;
  onPrevious: () => void;
  onQuickConfirm: () => void;
}

const CountingProgress: Component<CountingProgressProps> = (props) => {
  const [countInput, setCountInput] = createSignal('');

  const handleCountSubmit = () => {
    const count = parseInt(countInput());
    if (!isNaN(count) && count >= 0) {
      props.onUpdateCount(count);
      setCountInput('');
    }
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCountSubmit();
    }
  };

  const getProgress = () => {
    const counted = props.session.items.filter(
      (item) => item.countedQuantity !== undefined
    ).length;
    const total = props.session.items.length;
    const percentage = total > 0 ? (counted / total) * 100 : 0;
    return { counted, total, percentage };
  };

  const progress = getProgress();

  const containerStyle = {
    padding: '2rem',
    'max-width': '900px',
    margin: '0 auto'
  };

  const progressBarContainerStyle = {
    'margin-bottom': '2rem'
  };

  const progressHeaderStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '0.5rem'
  };

  const progressTextStyle = {
    'font-size': '0.875rem',
    color: 'var(--text-secondary)',
    'font-weight': '500'
  };

  const progressBarStyle = {
    width: '100%',
    height: '8px',
    background: '#e5e7eb',
    'border-radius': '4px',
    overflow: 'hidden'
  };

  const progressFillStyle = {
    height: '100%',
    background: 'var(--primary-color)',
    transition: 'width 0.3s',
    width: `${progress.percentage}%`
  };

  const productCardStyle = {
    background: 'white',
    border: '1px solid var(--border-color)',
    'border-radius': '12px',
    padding: '2rem',
    'margin-bottom': '2rem'
  };

  const productImageContainerStyle = {
    display: 'flex',
    'justify-content': 'center',
    'margin-bottom': '1.5rem'
  };

  const productImageStyle = {
    width: '150px',
    height: '150px',
    'object-fit': 'cover' as const,
    'border-radius': '8px',
    border: '1px solid var(--border-color)'
  };

  const noImageStyle = {
    ...productImageStyle,
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    background: '#f3f4f6',
    color: 'var(--text-secondary)',
    'font-size': '0.875rem'
  };

  const productNameStyle = {
    'font-size': '1.5rem',
    'font-weight': '700',
    color: 'var(--text-primary)',
    'text-align': 'center' as const,
    'margin-bottom': '0.5rem'
  };

  const productMetaStyle = {
    display: 'flex',
    'justify-content': 'center',
    gap: '2rem',
    'margin-bottom': '1.5rem',
    'flex-wrap': 'wrap' as const
  };

  const metaItemStyle = {
    'text-align': 'center' as const
  };

  const metaLabelStyle = {
    'font-size': '0.75rem',
    color: 'var(--text-secondary)',
    'text-transform': 'uppercase' as const,
    'margin-bottom': '0.25rem'
  };

  const metaValueStyle = {
    'font-size': '0.875rem',
    'font-weight': '600',
    color: 'var(--text-primary)'
  };

  const systemQuantityStyle = {
    'text-align': 'center' as const,
    padding: '1rem',
    background: '#f0f9ff',
    'border-radius': '8px',
    'margin-bottom': '1.5rem'
  };

  const systemQuantityLabelStyle = {
    'font-size': '0.875rem',
    color: 'var(--text-secondary)',
    'margin-bottom': '0.25rem'
  };

  const systemQuantityValueStyle = {
    'font-size': '2rem',
    'font-weight': '700',
    color: '#0284c7'
  };

  const countInputContainerStyle = {
    'margin-bottom': '1rem'
  };

  const countInputLabelStyle = {
    display: 'block',
    'font-size': '0.875rem',
    'font-weight': '500',
    color: 'var(--text-primary)',
    'margin-bottom': '0.5rem',
    'text-align': 'center' as const
  };

  const countInputStyle = {
    width: '100%',
    padding: '1rem',
    'font-size': '2rem',
    'font-weight': '700',
    'text-align': 'center' as const,
    border: '2px solid var(--border-color)',
    'border-radius': '8px',
    outline: 'none'
  };

  const quickConfirmButtonStyle = {
    width: '100%',
    padding: '1rem',
    background: 'var(--success-color)',
    color: 'white',
    border: 'none',
    'border-radius': '8px',
    'font-weight': '600',
    'font-size': '1rem',
    cursor: 'pointer',
    transition: 'background 0.2s',
    'margin-bottom': '1rem'
  };

  const navigationStyle = {
    display: 'flex',
    gap: '1rem'
  };

  const navButtonStyle = {
    flex: '1',
    padding: '0.75rem',
    background: '#f3f4f6',
    border: 'none',
    'border-radius': '6px',
    'font-weight': '500',
    cursor: 'pointer',
    transition: 'background 0.2s',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    gap: '0.5rem'
  };

  const navButtonDisabledStyle = {
    ...navButtonStyle,
    opacity: '0.5',
    cursor: 'not-allowed'
  };

  return (
    <div style={containerStyle}>
      <div style={progressBarContainerStyle}>
        <div style={progressHeaderStyle}>
          <span style={progressTextStyle}>
            Progreso: {progress.counted} de {progress.total}
          </span>
          <span style={progressTextStyle}>{Math.round(progress.percentage)}%</span>
        </div>
        <div style={progressBarStyle}>
          <div style={progressFillStyle}></div>
        </div>
      </div>

      <Show when={props.currentItem}>
        {(item) => (
          <div style={productCardStyle}>
            <div style={productImageContainerStyle}>
              <Show
                when={item().productImage}
                fallback={<div style={noImageStyle}>Sin imagen</div>}
              >
                <img
                  src={item().productImage}
                  alt={item().productName}
                  style={productImageStyle}
                />
              </Show>
            </div>

            <h2 style={productNameStyle}>{item().productName}</h2>

            <div style={productMetaStyle}>
              <div style={metaItemStyle}>
                <div style={metaLabelStyle}>SKU</div>
                <div style={metaValueStyle}>{item().productSku}</div>
              </div>

              <Show when={item().productUpc}>
                <div style={metaItemStyle}>
                  <div style={metaLabelStyle}>UPC</div>
                  <div style={metaValueStyle}>{item().productUpc}</div>
                </div>
              </Show>

              <div style={metaItemStyle}>
                <div style={metaLabelStyle}>Ubicación</div>
                <div style={metaValueStyle}>{item().binCode || 'N/A'}</div>
              </div>
            </div>

            <div style={systemQuantityStyle}>
              <div style={systemQuantityLabelStyle}>Cantidad en Sistema</div>
              <div style={systemQuantityValueStyle}>{item().systemQuantity}</div>
            </div>

            <div style={countInputContainerStyle}>
              <label style={countInputLabelStyle}>Cantidad Contada</label>
              <input
                type="number"
                min="0"
                value={countInput()}
                onInput={(e) => setCountInput(e.currentTarget.value)}
                onKeyPress={handleKeyPress}
                style={countInputStyle}
                placeholder="0"
                autofocus
              />
            </div>

            <button
              style={quickConfirmButtonStyle}
              onClick={props.onQuickConfirm}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#059669';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--success-color)';
              }}
            >
              ✓ Correcto ({item().systemQuantity})
            </button>

            <div style={navigationStyle}>
              <button
                style={
                  progress.counted === 0 ? navButtonDisabledStyle : navButtonStyle
                }
                onClick={props.onPrevious}
                disabled={progress.counted === 0}
                onMouseEnter={(e) => {
                  if (progress.counted > 0) {
                    e.currentTarget.style.background = '#e5e7eb';
                  }
                }}
                onMouseLeave={(e) => {
                  if (progress.counted > 0) {
                    e.currentTarget.style.background = '#f3f4f6';
                  }
                }}
              >
                ← Anterior
              </button>

              <button
                style={navButtonStyle}
                onClick={handleCountSubmit}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#e5e7eb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f3f4f6';
                }}
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </Show>
    </div>
  );
};

export default CountingProgress;
