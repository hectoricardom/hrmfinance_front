import { Component, Show } from 'solid-js';
import { CountItem } from '../types/counting';
import { Modal } from '../../ui';

interface DiscrepancyAlertProps {
  item: CountItem | null;
  onConfirm: () => void;
  onRecount: () => void;
  isOpen: boolean;
}

const DiscrepancyAlert: Component<DiscrepancyAlertProps> = (props) => {
  const getDifferenceColor = (difference: number): string => {
    return difference < 0 ? '#ef4444' : '#10b981';
  };

  const getDifferenceText = (difference: number): string => {
    if (difference < 0) {
      return `${Math.abs(difference)} menos`;
    } else {
      return `+${difference} más`;
    }
  };

  const headerStyle = {
    'text-align': 'center' as const,
    'margin-bottom': '2rem'
  };

  const warningIconStyle = {
    'font-size': '3rem',
    color: '#f59e0b',
    'margin-bottom': '1rem'
  };

  const titleStyle = {
    'font-size': '1.5rem',
    'font-weight': '600',
    color: 'var(--text-primary)',
    'margin-bottom': '0.5rem'
  };

  const subtitleStyle = {
    color: 'var(--text-secondary)',
    'font-size': '0.875rem'
  };

  const productInfoStyle = {
    background: '#f9fafb',
    padding: '1.5rem',
    'border-radius': '8px',
    'margin-bottom': '1.5rem'
  };

  const productNameStyle = {
    'font-size': '1.125rem',
    'font-weight': '600',
    color: 'var(--text-primary)',
    'margin-bottom': '0.5rem'
  };

  const productSkuStyle = {
    color: 'var(--text-secondary)',
    'font-size': '0.875rem',
    'margin-bottom': '1rem'
  };

  const quantityComparisonStyle = {
    display: 'grid',
    'grid-template-columns': '1fr auto 1fr',
    gap: '1rem',
    'align-items': 'center',
    'margin-bottom': '1rem'
  };

  const quantityBoxStyle = (isSystem: boolean) => ({
    'text-align': 'center' as const,
    padding: '1rem',
    background: isSystem ? '#f3f4f6' : '#dbeafe',
    'border-radius': '6px'
  });

  const quantityLabelStyle = {
    'font-size': '0.75rem',
    color: 'var(--text-secondary)',
    'text-transform': 'uppercase' as const,
    'margin-bottom': '0.25rem'
  };

  const quantityValueStyle = {
    'font-size': '1.5rem',
    'font-weight': '700',
    color: 'var(--text-primary)'
  };

  const arrowStyle = {
    'font-size': '1.5rem',
    color: 'var(--text-secondary)'
  };

  const differenceBoxStyle = (color: string) => ({
    'text-align': 'center' as const,
    padding: '1rem',
    background: `${color}15`,
    border: `2px solid ${color}`,
    'border-radius': '6px'
  });

  const differenceLabelStyle = {
    'font-size': '0.875rem',
    'font-weight': '500',
    'margin-bottom': '0.25rem'
  };

  const differenceValueStyle = {
    'font-size': '1.25rem',
    'font-weight': '700'
  };

  const buttonContainerStyle = {
    display: 'flex',
    gap: '1rem',
    'margin-top': '2rem'
  };

  const buttonBaseStyle = {
    flex: '1',
    padding: '0.75rem 1.5rem',
    border: 'none',
    'border-radius': '6px',
    'font-weight': '500',
    cursor: 'pointer',
    transition: 'all 0.2s'
  };

  const recountButtonStyle = {
    ...buttonBaseStyle,
    background: '#f3f4f6',
    color: 'var(--text-primary)'
  };

  const confirmButtonStyle = {
    ...buttonBaseStyle,
    background: 'var(--primary-color)',
    color: 'white'
  };

  return (
    <Show when={props.isOpen && props.item}>
      <Modal isOpen={props.isOpen} onClose={() => {}} title="Discrepancia Detectada" maxWidth="500px">
        <div style={headerStyle}>
          <div style={warningIconStyle}>⚠️</div>
          <h2 style={titleStyle}>Discrepancia Detectada</h2>
          <p style={subtitleStyle}>
            La cantidad contada no coincide con la cantidad del sistema
          </p>
        </div>

        <Show when={props.item}>
          {(item) => (
            <>
              <div style={productInfoStyle}>
                <div style={productNameStyle}>{item().productName}</div>
                <div style={productSkuStyle}>SKU: {item().productSku}</div>

                <div style={quantityComparisonStyle}>
                  <div style={quantityBoxStyle(true)}>
                    <div style={quantityLabelStyle}>Sistema</div>
                    <div style={quantityValueStyle}>{item().systemQuantity}</div>
                  </div>

                  <div style={arrowStyle}>→</div>

                  <div style={quantityBoxStyle(false)}>
                    <div style={quantityLabelStyle}>Contado</div>
                    <div style={quantityValueStyle}>{item().countedQuantity}</div>
                  </div>
                </div>

                <div
                  style={differenceBoxStyle(
                    getDifferenceColor(item().discrepancy || 0)
                  )}
                >
                  <div
                    style={{
                      ...differenceLabelStyle,
                      color: getDifferenceColor(item().discrepancy || 0)
                    }}
                  >
                    Diferencia
                  </div>
                  <div
                    style={{
                      ...differenceValueStyle,
                      color: getDifferenceColor(item().discrepancy || 0)
                    }}
                  >
                    {getDifferenceText(item().discrepancy || 0)}
                  </div>
                </div>
              </div>

              <div style={buttonContainerStyle}>
                <button
                  style={recountButtonStyle}
                  onClick={props.onRecount}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#e5e7eb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f3f4f6';
                  }}
                >
                  Volver a Contar
                </button>

                <button
                  style={confirmButtonStyle}
                  onClick={props.onConfirm}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--primary-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--primary-color)';
                  }}
                >
                  Registrar y Continuar
                </button>
              </div>
            </>
          )}
        </Show>
      </Modal>
    </Show>
  );
};

export default DiscrepancyAlert;
