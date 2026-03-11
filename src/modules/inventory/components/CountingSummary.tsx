import { Component, For, Show } from 'solid-js';
import { CountSummary, CountItem } from '../types/counting';

interface CountingSummaryProps {
  summary: CountSummary;
  discrepancyItems: CountItem[];
  onApplyAdjustments: () => void;
  onClose: () => void;
}

const CountingSummary: Component<CountingSummaryProps> = (props) => {
  const containerStyle = {
    padding: '2rem',
    'max-width': '1000px',
    margin: '0 auto'
  };

  const headerStyle = {
    'text-align': 'center' as const,
    'margin-bottom': '2rem'
  };

  const successIconStyle = {
    'font-size': '3rem',
    'margin-bottom': '1rem'
  };

  const titleStyle = {
    'font-size': '1.75rem',
    'font-weight': '700',
    color: 'var(--text-primary)',
    'margin-bottom': '0.5rem'
  };

  const subtitleStyle = {
    color: 'var(--text-secondary)',
    'font-size': '0.875rem'
  };

  const statsGridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    'margin-bottom': '2rem'
  };

  const statCardStyle = (color: string) => ({
    background: 'white',
    border: `2px solid ${color}`,
    'border-radius': '8px',
    padding: '1.5rem',
    'text-align': 'center' as const
  });

  const statLabelStyle = {
    'font-size': '0.875rem',
    color: 'var(--text-secondary)',
    'margin-bottom': '0.5rem'
  };

  const statValueStyle = (color: string) => ({
    'font-size': '2rem',
    'font-weight': '700',
    color: color
  });

  const discrepancyListContainerStyle = {
    'margin-bottom': '2rem'
  };

  const discrepancyHeaderStyle = {
    'font-size': '1.125rem',
    'font-weight': '600',
    color: 'var(--text-primary)',
    'margin-bottom': '1rem'
  };

  const discrepancyListStyle = {
    background: 'white',
    border: '1px solid var(--border-color)',
    'border-radius': '8px',
    overflow: 'hidden'
  };

  const discrepancyItemStyle = {
    display: 'grid',
    'grid-template-columns': '2fr 1fr 1fr 1fr',
    padding: '1rem',
    'border-bottom': '1px solid var(--border-color)',
    gap: '1rem',
    'align-items': 'center'
  };

  const discrepancyItemHeaderStyle = {
    ...discrepancyItemStyle,
    background: '#f9fafb',
    'font-weight': '600',
    'font-size': '0.875rem',
    color: 'var(--text-secondary)'
  };

  const productInfoStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    gap: '0.25rem'
  };

  const productNameStyle = {
    'font-weight': '500',
    color: 'var(--text-primary)'
  };

  const productSkuStyle = {
    'font-size': '0.875rem',
    color: 'var(--text-secondary)'
  };

  const quantityStyle = {
    'text-align': 'center' as const,
    'font-weight': '500'
  };

  const differenceStyle = (difference: number) => ({
    'text-align': 'center' as const,
    'font-weight': '600',
    color: difference < 0 ? '#ef4444' : '#10b981'
  });

  const buttonContainerStyle = {
    display: 'flex',
    gap: '1rem',
    'justify-content': 'center'
  };

  const buttonBaseStyle = {
    padding: '0.75rem 2rem',
    border: 'none',
    'border-radius': '6px',
    'font-weight': '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
    'font-size': '1rem'
  };

  const closeButtonStyle = {
    ...buttonBaseStyle,
    background: '#f3f4f6',
    color: 'var(--text-primary)'
  };

  const applyButtonStyle = {
    ...buttonBaseStyle,
    background: 'var(--primary-color)',
    color: 'white'
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('es-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const getDifferenceText = (difference: number): string => {
    if (difference < 0) {
      return `${Math.abs(difference)}`;
    } else {
      return `+${difference}`;
    }
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={successIconStyle}>✅</div>
        <h2 style={titleStyle}>Conteo Completado</h2>
        <p style={subtitleStyle}>Resumen del conteo de inventario</p>
      </div>

      <div style={statsGridStyle}>
        <div style={statCardStyle('#10b981')}>
          <div style={statLabelStyle}>Total Contado</div>
          <div style={statValueStyle('#10b981')}>
            {props.summary.countedProducts}
          </div>
        </div>

        <div style={statCardStyle('#3b82f6')}>
          <div style={statLabelStyle}>Correctos</div>
          <div style={statValueStyle('#3b82f6')}>
            {props.summary.correctCount}
          </div>
        </div>

        <div style={statCardStyle('#f59e0b')}>
          <div style={statLabelStyle}>Discrepancias</div>
          <div style={statValueStyle('#f59e0b')}>
            {props.summary.discrepancyCount}
          </div>
        </div>

        <div style={statCardStyle('#ef4444')}>
          <div style={statLabelStyle}>Valor Discrepancia</div>
          <div style={statValueStyle('#ef4444')}>
            {formatCurrency(props.summary.totalDiscrepancyValue)}
          </div>
        </div>
      </div>

      <Show when={props.discrepancyItems.length > 0}>
        <div style={discrepancyListContainerStyle}>
          <h3 style={discrepancyHeaderStyle}>
            Productos con Discrepancias ({props.discrepancyItems.length})
          </h3>

          <div style={discrepancyListStyle}>
            <div style={discrepancyItemHeaderStyle}>
              <div>Producto</div>
              <div style={{ 'text-align': 'center' }}>Sistema</div>
              <div style={{ 'text-align': 'center' }}>Contado</div>
              <div style={{ 'text-align': 'center' }}>Diferencia</div>
            </div>

            <For each={props.discrepancyItems}>
              {(item) => (
                <div style={discrepancyItemStyle}>
                  <div style={productInfoStyle}>
                    <div style={productNameStyle}>{item.productName}</div>
                    <div style={productSkuStyle}>SKU: {item.productSku}</div>
                  </div>

                  <div style={quantityStyle}>{item.systemQuantity}</div>

                  <div style={quantityStyle}>{item.countedQuantity}</div>

                  <div style={differenceStyle(item.discrepancy || 0)}>
                    {getDifferenceText(item.discrepancy || 0)}
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>

      <div style={buttonContainerStyle}>
        <button
          style={closeButtonStyle}
          onClick={props.onClose}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#e5e7eb';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f3f4f6';
          }}
        >
          Cerrar
        </button>

        <Show when={props.discrepancyItems.length > 0 && !props.summary.adjustmentsApplied}>
          <button
            style={applyButtonStyle}
            onClick={props.onApplyAdjustments}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--primary-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--primary-color)';
            }}
          >
            Aplicar Ajustes
          </button>
        </Show>

        <Show when={props.summary.adjustmentsApplied}>
          <div
            style={{
              ...buttonBaseStyle,
              background: '#10b981',
              color: 'white',
              cursor: 'default'
            }}
          >
            ✓ Ajustes Aplicados
          </div>
        </Show>
      </div>
    </div>
  );
};

export default CountingSummary;
