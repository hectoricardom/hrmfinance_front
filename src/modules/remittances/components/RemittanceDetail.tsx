import { Component, createSignal, Show, createResource } from 'solid-js';
import { RemittanceData, AVAILABLE_CURRENCIES, REMITTANCE_STATUSES } from '../types/remittanceTypes';
import { remittanceApi, getStatusLabel, getStatusColor } from '../services/remittanceApi';
import { generateRemittancePDF, previewRemittancePDF } from '../utils/remittancePdfGenerator';
import { authStore } from '../../../stores/authStore';

interface RemittanceDetailProps {
  remittanceId: string;
  remittance: any;
  onEdit: (remittance: RemittanceData) => void;
  onClose: () => void;
}

const RemittanceDetail: Component<RemittanceDetailProps> = (props) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = createSignal(false);


  // Fetch remittance data
  const [remittancew] = createResource(
    () => props.remittanceId,
    async (id) => {
      if (!id) return null;
    //  return await remittanceApi.getById(id);
    }
  );

  const handleGeneratePDF = async () => {
    const remittanceData = props?.remittance;
    if (!remittanceData) return;

    setIsGeneratingPdf(true);
    try {
    //  await generateRemittancePDF(remittanceData);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error al generar el PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePreviewPDF = async () => {
    const remittanceData = props?.remittance;
    if (!remittanceData) return;

    try {
      await previewRemittancePDF(remittanceData);
    } catch (error) {
      console.error('Error previewing PDF:', error);
      alert('Error al mostrar la vista previa');
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    const currencyInfo = AVAILABLE_CURRENCIES.find(c => c.code === currency);
    const symbol = currencyInfo?.symbol || currency;
    return `${symbol} ${amount.toFixed(2)}`;
  };

  // Styles
  const modalOverlayStyle = {
    position: 'fixed' as const,
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    'background-color': 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    'z-index': '1000'
  };

  const modalStyle = {
    'background-color': 'white',
    'border-radius': '8px',
    'max-width': '600px',
    width: '90%',
    'max-height': '90%',
    overflow: 'auto',
    'box-shadow': '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
  };

  const headerStyle = {
    padding: '1.5rem',
    'border-bottom': '1px solid var(--border-color)',
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center'
  };

  const titleStyle = {
    'font-size': '1.25rem',
    'font-weight': '600',
    color: 'var(--text-primary)'
  };

  const closeButtonStyle = {
    background: 'none',
    border: 'none',
    'font-size': '1.5rem',
    cursor: 'pointer',
    color: 'var(--text-muted)'
  };

  const contentStyle = {
    padding: '1.5rem'
  };

  const sectionStyle = {
    'margin-bottom': '2rem'
  };

  const sectionTitleStyle = {
    'font-size': '1rem',
    'font-weight': '600',
    'margin-bottom': '1rem',
    color: 'var(--text-primary)',
    'border-bottom': '1px solid var(--border-light)',
    'padding-bottom': '0.5rem'
  };

  const fieldGroupStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    'margin-bottom': '1rem'
  };

  const fieldStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    gap: '0.25rem'
  };

  const labelStyle = {
    'font-size': '0.875rem',
    'font-weight': '500',
    color: 'var(--text-secondary)'
  };

  const valueStyle = {
    'font-size': '0.875rem',
    color: 'var(--text-primary)'
  };

  const strongValueStyle = {
    ...valueStyle,
    'font-weight': '600',
    'font-size': '1rem'
  };

  const statusBadgeStyle = (status: string) => ({
    display: 'inline-block',
    padding: '0.5rem 1rem',
    'border-radius': '20px',
    'font-size': '0.875rem',
    'font-weight': '500',
    'background-color': getStatusColor(status) + '20',
    color: getStatusColor(status)
  });

  const actionsStyle = {
    padding: '1.5rem',
    'border-top': '1px solid var(--border-color)',
    display: 'flex',
    gap: '1rem',
    'justify-content': 'flex-end'
  };

  const buttonStyle = {
    padding: '0.75rem 1.5rem',
    border: 'none',
    'border-radius': '4px',
    cursor: 'pointer',
    'font-weight': '500',
    'font-size': '0.875rem'
  };

  const primaryButtonStyle = {
    ...buttonStyle,
    'background-color': 'var(--primary-color)',
    color: 'white'
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    'background-color': 'var(--border-color)',
    color: 'var(--text-secondary)'
  };

  const dangerButtonStyle = {
    ...buttonStyle,
    'background-color': '#ef4444',
    color: 'white'
  };

  const loadingStyle = {
    'text-align': 'center' as const,
    padding: '2rem',
    color: 'var(--text-muted)'
  };

  const errorStyle = {
    'text-align': 'center' as const,
    padding: '2rem',
    color: '#ef4444'
  };

  return (
    <div style={modalOverlayStyle} onClick={props.onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <h2 style={titleStyle}>Detalles de Remesa</h2>
          <button style={closeButtonStyle} onClick={props.onClose}>
            ×
          </button>
        </div>

        <Show
          when={true}
          fallback={<div style={loadingStyle}>Cargando detalles...</div>}
        >
          <Show
            when={props?.remittance}
            fallback={<div style={errorStyle}>No se pudo cargar la remesa</div>}
          >
            {(rem) => (
              <>
                <div style={contentStyle}>
                  {/* Basic Information */}
                  <div style={sectionStyle}>
                    <h3 style={sectionTitleStyle}>Información General</h3>
                    <div style={fieldGroupStyle}>
                      <div style={fieldStyle}>
                        <span style={labelStyle}>Número de Remesa</span>
                        <span style={strongValueStyle}>{rem().remittanceNumber}</span>
                      </div>
                      <div style={fieldStyle}>
                        <span style={labelStyle}>Estado</span>
                        <span style={statusBadgeStyle(rem().status)}>
                          {getStatusLabel(rem().status)}
                        </span>
                      </div>
                      <div style={fieldStyle}>
                        <span style={labelStyle}>Fecha</span>
                        <span style={strongValueStyle}>
                          {new Date(rem().date).toLocaleDateString('es-ES')}
                        </span>
                      </div>
                      <div style={fieldStyle}>
                        <span style={labelStyle}>Referencia</span>
                        <span style={strongValueStyle}>{rem().reference || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Customer Information */}
                  <div style={sectionStyle}>
                    <h3 style={sectionTitleStyle}>Información del Cliente</h3>
                    <div style={fieldGroupStyle}>
                      <div style={fieldStyle}>
                        <span style={labelStyle}>Nombre Completo</span>
                        <span style={strongValueStyle}>
                          {rem().customer.fullName || rem().customer.name}
                        </span>
                      </div>
                      <div style={fieldStyle}>
                        <span style={labelStyle}>Cédula</span>
                        <span style={strongValueStyle}>{rem().customer.cid || 'N/A'}</span>
                      </div>
                      <div style={fieldStyle}>
                        <span style={labelStyle}>Teléfono</span>
                        <span style={strongValueStyle}>{rem().customer.phoneNumber || 'N/A'}</span>
                      </div>
                      <div style={fieldStyle}>
                        <span style={labelStyle}>Email</span>
                        <span style={valueStyle}>{rem().customer.email || 'N/A'}</span>
                      </div>
                    </div>
                    <Show when={rem().customer.address}>
                      <div style={fieldStyle}>
                        <span style={labelStyle}>Dirección</span>
                        <span style={strongValueStyle}>{rem().customer.address}</span>
                      </div>
                    </Show>
                  </div>

                  {/* Financial Information */}
                  <div style={sectionStyle}>
                    <h3 style={sectionTitleStyle}>Información Financiera</h3>
                    <div style={fieldGroupStyle}>
                      <div style={fieldStyle}>
                        <span style={labelStyle}>Cantidad</span>
                        <span style={strongValueStyle}>
                          {formatCurrency(rem().amount, "USD")} USD
                        </span>
                      </div>
                      <div style={fieldStyle}>
                        <span style={labelStyle}>Moneda</span>
                        <span style={strongValueStyle}>{rem().currency}</span>
                      </div>
                      <Show when={rem().exchangeRate && rem().currency !== 'USD'}>
                        <div style={fieldStyle}>
                          <span style={labelStyle}>Tasa de Cambio</span>
                          <span style={strongValueStyle}>{rem().exchangeRate?.toFixed(4)}</span>
                        </div>
                        <div style={fieldStyle}>
                          <span style={labelStyle}>Equivalente {rem().currency}</span>
                          <span style={{...strongValueStyle, color: 'var(--primary-color)', "font-size": '1.6rem' }}>
                            ${(rem().amount * (rem().exchangeRate || 1)).toFixed(2)}
                          </span>
                        </div>
                      </Show>
                    </div>
                  </div>

                  {/* Notes */}
                  <Show when={rem().notes}>
                    <div style={sectionStyle}>
                      <h3 style={sectionTitleStyle}>Notas</h3>
                      <div style={valueStyle}>{rem().notes}</div>
                    </div>
                  </Show>

                  {/* Audit Information */}
                  <div style={sectionStyle}>
                    <h3 style={sectionTitleStyle}>Información de Auditoría</h3>
                    <div style={fieldGroupStyle}>
                      <div style={fieldStyle}>
                        <span style={labelStyle}>Creado</span>
                        <span style={valueStyle}>
                          {new Date(rem().createdAt).toLocaleString('es-ES')}
                        </span>
                      </div>
                      <div style={fieldStyle}>
                        <span style={labelStyle}>Última Actualización</span>
                        <span style={valueStyle}>
                          {new Date(rem().updatedAt).toLocaleString('es-ES')}
                        </span>
                      </div>
                      <Show when={authStore.isAdmin()  && rem().createdBy }>
                        <div style={fieldStyle}>
                          <span style={labelStyle}>Creado por</span>
                          <span style={valueStyle}>{rem().createdBy}</span>
                        </div>
                      </Show>
                    </div>
                  </div>
                </div>

                <div style={actionsStyle}>
                  <button
                    style={secondaryButtonStyle}
                    onClick={handlePreviewPDF}
                  >
                    Vista Previa PDF
                  </button>
                  <Show when={authStore.isAdmin()}>
                  <button
                    style={primaryButtonStyle}
                    onClick={() => props.onEdit(rem())}
                  >
                    Editar
                  </button>
                  </Show>
                  <button
                    style={secondaryButtonStyle}
                    onClick={props.onClose}
                  >
                    Cerrar
                  </button>
                </div>
              </>
            )}
          </Show>
        </Show>
      </div>
    </div>
  );
};

export default RemittanceDetail;