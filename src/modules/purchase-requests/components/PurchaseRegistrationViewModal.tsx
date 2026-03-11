import { Component, Show } from 'solid-js';
import { Modal, Button, Card } from '../../ui';
import { useTranslation } from '../../../translations';
import { PurchaseRegistration, PLATFORMS } from '../types/purchaseRequestTypes';

interface PurchaseRegistrationViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  registration: PurchaseRegistration | null;
}

const PurchaseRegistrationViewModal: Component<PurchaseRegistrationViewModalProps> = (props) => {
  const { t } = useTranslation();

  const formatCurrency = (amount: number, currency: string) => {
    return `${currency} ${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getPlatformInfo = (platform: string) => {
    return PLATFORMS.find(p => p.value === platform) || { label: platform, color: '#6c757d' };
  };

  const calculateNetTotal = (registration: PurchaseRegistration) => {
    return registration.totalPrice - (registration.bonus || 0) - (registration.refund || 0);
  };

  const headerStyle = {
    'margin-bottom': '1.5rem'
  };

  const titleStyle = {
    'font-size': '1.5rem',
    'font-weight': '600',
    'margin-bottom': '0.5rem',
    color: 'var(--text-primary)'
  };

  const subtitleStyle = {
    color: 'var(--text-muted)',
    'font-size': '1rem'
  };

  const sectionStyle = {
    'margin-bottom': '1.5rem'
  };

  const sectionTitleStyle = {
    'font-size': '1.125rem',
    'font-weight': '500',
    'margin-bottom': '1rem',
    color: 'var(--text-primary)',
    'border-bottom': '1px solid var(--border-color)',
    'padding-bottom': '0.5rem'
  };

  const gridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem',
    'margin-bottom': '1rem'
  };

  const fieldStyle = {
    'margin-bottom': '0.75rem'
  };

  const labelStyle = {
    'font-weight': '500',
    color: 'var(--text-secondary)',
    'font-size': '0.875rem',
    'margin-bottom': '0.25rem',
    display: 'block'
  };

  const valueStyle = {
    color: 'var(--text-primary)',
    'font-size': '1rem'
  };

  const platformTagStyle = (color: string) => ({
    'background-color': color,
    color: 'white',
    padding: '0.25rem 0.75rem',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '0.875rem',
    'font-weight': '500',
    display: 'inline-block'
  });

  const financialSummaryStyle = {
    'background-color': 'var(--surface-light)',
    padding: '1rem',
    'border-radius': 'var(--border-radius-md)',
    border: '1px solid var(--border-color)',
    'margin-bottom': '1rem'
  };

  const netTotalStyle = {
    'font-size': '1.25rem',
    'font-weight': '600',
    color: 'var(--primary-color)',
    'text-align': 'center' as const,
    'margin-top': '0.75rem',
    'padding-top': '0.75rem',
    'border-top': '1px solid var(--border-color)'
  };

  const buttonContainerStyle = {
    display: 'flex',
    'justify-content': 'flex-end',
    gap: '1rem',
    'padding-top': '1rem',
    'border-top': '1px solid var(--border-color)'
  };

  return (
    <Modal isOpen={props.isOpen} onClose={props.onClose} size="large">
      <div style={{ padding: '1.5rem', 'max-height': '80vh', 'overflow-y': 'auto' }}>
        <Show when={props.registration} fallback={
          <div style={{ 'text-align': 'center', padding: '2rem' }}>
            <p style={{ color: 'var(--text-muted)' }}>No se encontró información del registro</p>
          </div>
        }>
          {(registration) => (
            <>
              {/* Header */}
              <div style={headerStyle}>
                <h2 style={titleStyle}>
                  Detalles del Registro de Compra
                </h2>
                <p style={subtitleStyle}>
                  {registration().registrationNumber} • Creado {formatDate(registration().purchaseDate)}
                </p>
              </div>

              {/* Store and Platform Information */}
              <Card style={{ 'margin-bottom': '1.5rem', padding: '1rem' }}>
                <h3 style={sectionTitleStyle}>Información de la Tienda</h3>
                <div style={gridStyle}>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Tienda</label>
                    <div style={valueStyle}>{registration().store}</div>
                  </div>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Plataforma</label>
                    <div>
                      <span style={platformTagStyle(getPlatformInfo(registration().platform).color)}>
                        {getPlatformInfo(registration().platform).label}
                      </span>
                    </div>
                  </div>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Fecha de Compra</label>
                    <div style={valueStyle}>{formatDate(registration().purchaseDate)}</div>
                  </div>
                </div>
              </Card>

              {/* Purchase Details */}
              <Card style={{ 'margin-bottom': '1.5rem', padding: '1rem' }}>
                <h3 style={sectionTitleStyle}>Detalles de la Compra</h3>
                <div style={gridStyle}>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Total de Productos</label>
                    <div style={{ ...valueStyle, 'font-weight': '600' }}>
                      {registration().totalProducts} producto{registration().totalProducts !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Precio Total</label>
                    <div style={{ ...valueStyle, 'font-weight': '600' }}>
                      {formatCurrency(registration().totalPrice, registration().currency)}
                    </div>
                  </div>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Moneda</label>
                    <div style={valueStyle}>{registration().currency}</div>
                  </div>
                </div>

                {/* Financial Summary */}
                <div style={financialSummaryStyle}>
                  <h4 style={{ 
                    'font-size': '1rem', 
                    'font-weight': '500', 
                    'margin-bottom': '0.75rem',
                    color: 'var(--text-primary)'
                  }}>
                    Resumen Financiero
                  </h4>
                  
                  <div style={{ 
                    display: 'grid', 
                    'grid-template-columns': '1fr auto', 
                    gap: '0.5rem',
                    'margin-bottom': '0.5rem'
                  }}>
                    <span>Precio Total:</span>
                    <span style={{ 'font-weight': '500' }}>
                      {formatCurrency(registration().totalPrice, registration().currency)}
                    </span>
                  </div>
                  
                  <Show when={(registration().bonus || 0) > 0}>
                    <div style={{ 
                      display: 'grid', 
                      'grid-template-columns': '1fr auto', 
                      gap: '0.5rem',
                      'margin-bottom': '0.5rem'
                    }}>
                      <span>Menos Bonus:</span>
                      <span style={{ color: 'var(--success-color)' }}>
                        -{formatCurrency(registration().bonus || 0, registration().currency)}
                      </span>
                    </div>
                  </Show>

                  <Show when={(registration().refund || 0) > 0}>
                    <div style={{ 
                      display: 'grid', 
                      'grid-template-columns': '1fr auto', 
                      gap: '0.5rem',
                      'margin-bottom': '0.5rem'
                    }}>
                      <span>Menos Devolución:</span>
                      <span style={{ color: 'var(--warning-color)' }}>
                        -{formatCurrency(registration().refund || 0, registration().currency)}
                      </span>
                    </div>
                  </Show>

                  <div style={netTotalStyle}>
                    Total Neto: {formatCurrency(registration().netTotal, registration().currency)}
                  </div>
                </div>
              </Card>

              {/* Additional Information */}
              <Show when={registration().description || registration().notes}>
                <Card style={{ 'margin-bottom': '1.5rem', padding: '1rem' }}>
                  <h3 style={sectionTitleStyle}>Información Adicional</h3>
                  
                  <Show when={registration().description}>
                    <div style={fieldStyle}>
                      <label style={labelStyle}>Descripción</label>
                      <div style={valueStyle}>{registration().description}</div>
                    </div>
                  </Show>

                  <Show when={registration().notes}>
                    <div style={fieldStyle}>
                      <label style={labelStyle}>Notas</label>
                      <div style={valueStyle}>{registration().notes}</div>
                    </div>
                  </Show>
                </Card>
              </Show>

              {/* Metadata */}
              <Card style={{ 'margin-bottom': '1.5rem', padding: '1rem' }}>
                <h3 style={sectionTitleStyle}>Información del Sistema</h3>
                <div style={gridStyle}>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Número de Registro</label>
                    <div style={{ ...valueStyle, 'font-family': 'monospace' }}>
                      {registration().registrationNumber}
                    </div>
                  </div>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Creado</label>
                    <div style={valueStyle}>
                      {new Date(parseInt(registration().createdAt)).toLocaleString('es-ES')}
                    </div>
                  </div>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Última Actualización</label>
                    <div style={valueStyle}>
                      {new Date(parseInt(registration().updatedAt)).toLocaleString('es-ES')}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Action Buttons */}
              <div style={buttonContainerStyle}>
                <Button
                  variant="outline"
                  onClick={props.onClose}
                >
                  Cerrar
                </Button>
              </div>
            </>
          )}
        </Show>
      </div>
    </Modal>
  );
};

export default PurchaseRegistrationViewModal;