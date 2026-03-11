import { Component, Show, createSignal } from 'solid-js';
import { Modal, Button } from '../../ui';
import { HBL } from '../types';
import { HBLLabel4x6 } from '../labels';
import { useTranslation } from '../../../translations';
import HBLScanProgress from '../components/HBLScanProgress';
import { devLog } from '../../../services/utils';


interface HBLDetailViewProps {
  hbl: HBL | null;
  isOpen: boolean;
  onClose: () => void;
}

const HBLDetailView: Component<HBLDetailViewProps> = (props) => {
  const { t } = useTranslation();
  const [showLabel, setShowLabel] = createSignal(false);

  if (!props.hbl) return null;

  const detailStyle = {
    display: 'grid',
    'grid-template-columns': '1fr 1fr',
    gap: '1rem',
    'margin-bottom': '1.5rem'
  };

  const fieldStyle = {
    'margin-bottom': '0.75rem'
  };

  const labelStyle = {
    'font-weight': '600',
    color: 'var(--text-muted)',
    'font-size': '0.875rem',
    'margin-bottom': '0.25rem'
  };

  const valueStyle = {
    color: 'var(--text-primary)',
    'font-size': '1rem'
  };

  const statusStyle = (status: string) => ({
    display: 'inline-block',
    padding: '0.25rem 0.75rem',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '0.875rem',
    'font-weight': '500',
    color: 'white',
    'background-color': status === 'ENTREGADO' ? '#28a745' : 
                      status === 'ENVIADO' ? '#17a2b8' :
                      status === 'EN BODEGA' ? '#007bff' : '#6c757d'
  });

  const sectionStyle = {
    'margin-bottom': '2rem',
    'padding-bottom': '1.5rem',
    'border-bottom': '1px solid var(--border-color)'
  };

  const sectionTitleStyle = {
    'font-size': '1.125rem',
    'font-weight': '600',
    'margin-bottom': '1rem',
    color: 'var(--text-primary)'
  };

  // Prepare customer info for label
  const customerInfo = {
    fullname: props.hbl.consigneeName || '',
    phoneNumber: props.hbl.ctelephone || '',
    cid: props.hbl.cidentity || '',
    address: props.hbl.street || ''
  };

  // Prepare HBL info for label
  const hblInfo = {
    hbl: props.hbl.hbl,
    guideNumber: props.hbl.idairguide || '',
    weight: `${props.hbl.weight} kg`,
    pieces: parseInt(props.hbl.quantity) || 1,
    destination: `${props.hbl.address?.city || ''}, ${props.hbl.address?.estate || ''}`,
    origin: 'Miami, FL', // You might want to add this to your HBL data
    date: new Date(props.hbl.datereserve).toLocaleDateString('es-ES')
  };

  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      title={`HBL: ${props.hbl.hbl}`}
      size="large"
    >
      <div>
        {/* Action Buttons */}
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          'margin-bottom': '2rem',
          'padding-bottom': '1rem',
          'border-bottom': '1px solid var(--border-color)'
        }}>
          <Button
            variant="primary"
            onClick={() => setShowLabel(!showLabel())}
          >
            {showLabel() ? '📋 Ver Detalles' : '🏷️ Generar Etiqueta 4x6'}
          </Button>
          
          <Button
            variant="outline"
            onClick={() => {
              // TODO: Implement edit functionality
              devLog('Edit HBL:', props.hbl.hbl);
            }}
          >
            ✏️ Editar
          </Button>
          
          <Button
            variant="outline"
            onClick={() => {
              // TODO: Implement tracking functionality
              devLog('Track HBL:', props.hbl.hbl);
            }}
          >
            📍 Rastrear
          </Button>
        </div>

        <Show when={!showLabel()}>
          {/* Status and Basic Info */}
          <div style={sectionStyle}>
            <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '1rem' }}>
              <h3 style={sectionTitleStyle}>Información General</h3>
              <span style={statusStyle(props.hbl.idguidestate)}>{props.hbl.idguidestate}</span>
            </div>

            <div style={detailStyle}>
              <div style={fieldStyle}>
                <div style={labelStyle}>Guía Aérea</div>
                <div style={valueStyle}>{props.hbl.idairguide}</div>
              </div>

              <div style={fieldStyle}>
                <div style={labelStyle}>Número Aéreo</div>
                <div style={valueStyle}>{props.hbl.idairnumber}</div>
              </div>

              <div style={fieldStyle}>
                <div style={labelStyle}>Clasificación</div>
                <div style={valueStyle}>{props.hbl.idclasification}</div>
              </div>

              <div style={fieldStyle}>
                <div style={labelStyle}>Fecha de Reserva</div>
                <div style={valueStyle}>{new Date(props.hbl.datereserve).toLocaleDateString('es-ES')}</div>
              </div>

              <div style={fieldStyle}>
                <div style={labelStyle}>Agencia</div>
                <div style={valueStyle}>{props.hbl.agency}</div>
              </div>

              <div style={fieldStyle}>
                <div style={labelStyle}>Guía</div>
                <div style={valueStyle}>{props.hbl.guia}</div>
              </div>
            </div>
          </div>

          {/* Scan Progress & Location History */}
          <div style={sectionStyle}>
            <HBLScanProgress
              scannedLocations={props.hbl.scannedLocations}
              currentStatus={props.hbl.idguidestate}
            />
          </div>

          {/* Shipper Information */}
          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>Información del Remitente</h3>
            <div style={detailStyle}>
              <div style={fieldStyle}>
                <div style={labelStyle}>Nombre</div>
                <div style={valueStyle}>{props.hbl.nameshipper}</div>
              </div>
              
              <div style={fieldStyle}>
                <div style={labelStyle}>Teléfono</div>
                <div style={valueStyle}>{props.hbl.phoneshipper}</div>
              </div>
            </div>
          </div>

          {/* Consignee Information */}
          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>Información del Destinatario</h3>
            <div style={detailStyle}>
              <div style={fieldStyle}>
                <div style={labelStyle}>Nombre</div>
                <div style={valueStyle}>{props.hbl.consigneeName}</div>
              </div>
              
              <div style={fieldStyle}>
                <div style={labelStyle}>Teléfono</div>
                <div style={valueStyle}>{props.hbl.ctelephone}</div>
              </div>
              
              <div style={fieldStyle}>
                <div style={labelStyle}>Cédula</div>
                <div style={valueStyle}>{props.hbl.cidentity}</div>
              </div>
              
              <div style={{ 'grid-column': '1 / -1' }}>
                <div style={labelStyle}>Dirección</div>
                <div style={valueStyle}>{props.hbl.street}</div>
              </div>
              
              <div style={fieldStyle}>
                <div style={labelStyle}>Ciudad</div>
                <div style={valueStyle}>{props.hbl.address?.city}</div>
              </div>
              
              <div style={fieldStyle}>
                <div style={labelStyle}>Provincia</div>
                <div style={valueStyle}>{props.hbl.address?.estate}</div>
              </div>
            </div>
          </div>

          {/* Package Information */}
          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>Información del Paquete</h3>
            <div style={detailStyle}>
              <div style={fieldStyle}>
                <div style={labelStyle}>Mercancía</div>
                <div style={valueStyle}>{props.hbl.namegood}</div>
              </div>
              
              <div style={fieldStyle}>
                <div style={labelStyle}>Peso</div>
                <div style={valueStyle}>{props.hbl.weight} kg</div>
              </div>
              
              <div style={fieldStyle}>
                <div style={labelStyle}>Cantidad</div>
                <div style={valueStyle}>{props.hbl.quantity}</div>
              </div>
              
              <div style={fieldStyle}>
                <div style={labelStyle}>Número de Bolsa</div>
                <div style={valueStyle}>{props.hbl.bagnumber}</div>
              </div>
            </div>
          </div>

          {/* Reference Information */}
          <div>
            <h3 style={sectionTitleStyle}>Referencias</h3>
            <div style={detailStyle}>
              <div style={fieldStyle}>
                <div style={labelStyle}>ID de Reserva</div>
                <div style={valueStyle}>{props.hbl.idreserve}</div>
              </div>
              
              <div style={fieldStyle}>
                <div style={labelStyle}>Referencia HID</div>
                <div style={valueStyle}>{props.hbl.referenceHId}</div>
              </div>
            </div>
          </div>
        </Show>

        {/* Label View */}
        <Show when={showLabel()}>
          <HBLLabel4x6
            customer={customerInfo}
            hblInfo={hblInfo}
            onPrint={() => {
              devLog('Printing label for HBL:', props.hbl.hbl);
            }}
          />
        </Show>
      </div>
    </Modal>
  );
};

export default HBLDetailView;