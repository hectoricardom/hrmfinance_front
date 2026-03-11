import { Component, createSignal } from 'solid-js';
import { Layout, Card, Button } from '../../ui';
import { HBLLabel2x4 } from '../labels';
import { printHBLLabels } from '../labels/printHBLLabels';
import { HBL } from '../types';

const HBLLabel2x4Demo: Component = () => {
  const [showLabel, setShowLabel] = createSignal(true);

  // Sample HBL data for testing
  const sampleHBL1: HBL = {
    idreserve: 'RES-001',
    idairnumber: 'AWB-789012345',
    idairguide: 'AWB-789012345',
    datereserve: new Date().toISOString(),
    hbl: 'HBL-2024-001234',
    cidentity: '001-1234567-8',
    street: 'Calle Principal #123, Sector Los Jardines, Apt 4B, Santo Domingo',
    ctelephone: '+1 (809) 555-1234',
    nameshipper: 'Global Shipping Inc.',
    quantity: '3',
    weight: '15.5',
    idguidestate: 'EN BODEGA',
    namegood: 'Electrónicos',
    bagnumber: 'BAG-456',
    agency: 'SDQ-MAIN',
    guia: 'AWB-789012345',
    consigneeName: 'Juan Carlos Rodríguez García',
    phoneshipper: '+1 (305) 123-4567',
    address: {
      estate: 'Santo Domingo',
      city: 'Santo Domingo',
      streetName: 'Calle Principal',
      streetNo: '123',
      betwen: 'Entre Calle A y Calle B'
    },
    referenceHId: 'REF-001'
  };

  const sampleHBL2: HBL = {
    idreserve: 'RES-002',
    idairnumber: 'AWB-135792468',
    idairguide: 'AWB-135792468',
    datereserve: new Date().toISOString(),
    hbl: 'HBL-2024-002468',
    cidentity: '001-9876543-2',
    street: 'Av. Winston Churchill #456, Torre Empresarial, Piso 12, Oficina 1201',
    ctelephone: '+1 (829) 987-6543',
    nameshipper: 'Express Cargo LLC',
    quantity: '1',
    weight: '8.2',
    idguidestate: 'ENVIADO',
    namegood: 'Documentos',
    bagnumber: 'BAG-789',
    agency: 'STI-NORTH',
    guia: 'AWB-135792468',
    consigneeName: 'María Elena Santos Pérez',
    phoneshipper: '+1 (212) 987-6543',
    address: {
      estate: 'Santiago',
      city: 'Santiago',
      streetName: 'Av. Winston Churchill',
      streetNo: '456',
      betwen: 'Frente al parque'
    },
    referenceHId: 'REF-002'
  };

  const sampleHBL3: HBL = {
    idreserve: 'RES-003',
    idairnumber: 'AWB-246813579',
    idairguide: 'AWB-246813579',
    datereserve: new Date().toISOString(),
    hbl: 'HBL-2024-003691',
    cidentity: '001-5555555-9',
    street: 'Calle 27 de Febrero #789, Casa #15, Villa Mella',
    ctelephone: '+1 (849) 123-4567',
    nameshipper: 'Air Freight Services',
    quantity: '5',
    weight: '25.0',
    idguidestate: 'PENDIENTE',
    namegood: 'Ropa y Calzado',
    bagnumber: 'BAG-321',
    agency: 'ROM-MAIN',
    guia: 'AWB-246813579',
    consigneeName: 'Luis Alberto Fernández Martínez',
    phoneshipper: '+1 (310) 456-7890',
    address: {
      estate: 'La Romana',
      city: 'La Romana',
      streetName: 'Calle 27 de Febrero',
      streetNo: '789',
      betwen: 'Al lado del supermercado'
    },
    referenceHId: 'REF-003'
  };

  const [currentSample, setCurrentSample] = createSignal<HBL>(sampleHBL1);
  const allSamples = [sampleHBL1, sampleHBL2, sampleHBL3];

  const headerStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '2rem'
  };

  const controlsStyle = {
    display: 'flex',
    gap: '1rem',
    'flex-wrap': 'wrap',
    'justify-content': 'center',
    'margin-bottom': '2rem'
  };

  return (
    <Layout title="HBL Label 2.3x4 Demo">
      <div style={headerStyle}>
        <div>
          <h2 style={{ margin: '0 0 0.5rem 0' }}>Etiquetas HBL 2.3x4 pulgadas</h2>
          <p style={{ margin: '0', color: 'var(--text-muted)' }}>
            Etiquetas compactas con QR code para impresoras de etiquetas
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowLabel(!showLabel())}
        >
          {showLabel() ? 'Ocultar Etiqueta' : 'Mostrar Etiqueta'}
        </Button>
      </div>

      {/* Sample Data Selection */}
      <Card>
        <div style={{ padding: '1rem' }}>
          <h3 style={{
            margin: '0 0 1rem 0',
            'font-size': '1.1rem'
          }}>
            Datos de Ejemplo
          </h3>

          <div style={controlsStyle}>
            <Button
              variant={currentSample().hbl === sampleHBL1.hbl ? 'primary' : 'outline'}
              onClick={() => setCurrentSample(sampleHBL1)}
            >
              Ejemplo 1: {sampleHBL1.hbl}
            </Button>

            <Button
              variant={currentSample().hbl === sampleHBL2.hbl ? 'primary' : 'outline'}
              onClick={() => setCurrentSample(sampleHBL2)}
            >
              Ejemplo 2: {sampleHBL2.hbl}
            </Button>

            <Button
              variant={currentSample().hbl === sampleHBL3.hbl ? 'primary' : 'outline'}
              onClick={() => setCurrentSample(sampleHBL3)}
            >
              Ejemplo 3: {sampleHBL3.hbl}
            </Button>

            <div style={{
              width: '100%',
              'border-top': '1px solid var(--border-color)',
              'margin-top': '0.5rem',
              'padding-top': '1rem'
            }}>
              <div style={{
                display: 'flex',
                gap: '1rem',
                'justify-content': 'center'
              }}>
                <Button
                  variant="success"
                  onClick={() => printHBLLabels([currentSample()])}
                >
                  🖨️ Imprimir Esta Etiqueta
                </Button>

                <Button
                  variant="success"
                  onClick={() => printHBLLabels(allSamples)}
                >
                  🖨️ Imprimir Todas (3 etiquetas)
                </Button>
              </div>
            </div>
          </div>

          {/* HBL Details */}
          <div style={{
            'margin-top': '1.5rem',
            padding: '1rem',
            background: 'var(--surface-color)',
            'border-radius': 'var(--border-radius)',
            'font-size': '0.875rem'
          }}>
            <h4 style={{ margin: '0 0 0.75rem 0' }}>Detalles del HBL Actual:</h4>
            <div style={{
              display: 'grid',
              'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '0.5rem'
            }}>
              <div><strong>HBL:</strong> {currentSample().hbl}</div>
              <div><strong>Bag:</strong> {currentSample().bagnumber}</div>
              <div><strong>Destinatario:</strong> {currentSample().consigneeName}</div>
              <div><strong>Teléfono:</strong> {currentSample().ctelephone}</div>
              <div><strong>Cédula:</strong> {currentSample().cidentity}</div>
              <div><strong>Guía:</strong> {currentSample().idairguide}</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Label Display */}
      {showLabel() && (
        <Card>
          <div style={{ padding: '2rem' }}>
            <div style={{
              'text-align': 'center',
              'margin-bottom': '2rem'
            }}>
              <h3 style={{ margin: '0 0 0.5rem 0' }}>Vista Previa de la Etiqueta</h3>
              <p style={{
                color: 'var(--text-muted)',
                'font-size': '0.875rem',
                margin: '0'
              }}>
                Tamaño: 2.3 x 4 pulgadas (5.8 x 10.2 cm)
              </p>
            </div>

            <div style={{
              display: 'flex',
              'justify-content': 'center',
              'align-items': 'center',
              padding: '1rem',
              background: '#f5f5f5',
              'border-radius': 'var(--border-radius)'
            }}>
              <HBLLabel2x4 hbl={currentSample()} />
            </div>

            <div style={{
              'margin-top': '2rem',
              padding: '1rem',
              background: '#fff3cd',
              border: '1px solid #ffc107',
              'border-radius': 'var(--border-radius)',
              'font-size': '0.875rem'
            }}>
              <strong>💡 Nota:</strong> Esta etiqueta está optimizada para impresoras de etiquetas térmicas.
              Para mejores resultados, use papel de etiquetas de 2.3x4 pulgadas.
            </div>
          </div>
        </Card>
      )}

      {/* Usage Instructions */}
      <Card>
        <div style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem 0' }}>Cómo Usar</h3>
          <ol style={{
            margin: '0',
            'padding-left': '1.5rem',
            'line-height': '1.8'
          }}>
            <li>Seleccione uno de los ejemplos de datos arriba</li>
            <li>Use "Imprimir Esta Etiqueta" para imprimir solo la etiqueta actual</li>
            <li>Use "Imprimir Todas" para imprimir las 3 etiquetas de ejemplo</li>
            <li>En la vista de lista de HBL, seleccione múltiples HBLs y use el botón "Print Labels"</li>
            <li>O use "Print All Labels" para imprimir todas las etiquetas filtradas</li>
          </ol>

          <div style={{
            'margin-top': '1.5rem',
            padding: '1rem',
            background: 'var(--surface-color)',
            'border-radius': 'var(--border-radius)'
          }}>
            <h4 style={{ margin: '0 0 0.5rem 0' }}>Contenido de la Etiqueta:</h4>
            <ul style={{
              margin: '0',
              'padding-left': '1.5rem',
              'line-height': '1.6'
            }}>
              <li>Código QR con el número HBL</li>
              <li>Número de HBL</li>
              <li>Número de Bolsa (BAG)</li>
              <li>Nombre del Destinatario</li>
              <li>Teléfono del Cliente</li>
              <li>Cédula de Identidad</li>
              <li>Dirección</li>
              <li>Número de Guía Aérea</li>
            </ul>
          </div>
        </div>
      </Card>
    </Layout>
  );
};

export default HBLLabel2x4Demo;
