import { Component, createSignal, onMount } from 'solid-js';
import { Layout, Card, Button, FormInput } from '../../ui';
import { HBLLabel4x6 } from '../labels';
import { devLog } from '../../../services/utils';

const HBLLabelDemo: Component = () => {
  const [customerInfo, setCustomerInfo] = createSignal({
    fullname: 'Juan Carlos Rodríguez García',
    phoneNumber: '+1 (809) 555-1234',
    cid: '001-1234567-8',
    address: 'Calle Principal #123, Sector Los Jardines, Apartamento 4B, Santo Domingo, República Dominicana'
  });

  const [hblInfo, setHblInfo] = createSignal({
    hbl: 'HBL-2024-001234',
    guideNumber: 'AWB-789012345',
    weight: '15.5 KG',
    pieces: 3,
    destination: 'Santo Domingo, DO',
    origin: 'Miami, FL',
    date: new Date().toLocaleDateString('es-ES')
  });

  // Check for URL parameters on mount
  onMount(() => {
    devLog('HBLLabelDemo mounted, checking for URL params...');
    devLog('Full URL:', window.location.href);
    devLog('Hash:', window.location.hash);
    
    // For HashRouter, parameters come after the hash
    const hash = window.location.hash;
    const queryStart = hash.indexOf('?');
    
    if (queryStart !== -1) {
      const queryString = hash.substring(queryStart + 1);
      devLog('Query string:', queryString);
      
      const urlParams = new URLSearchParams(queryString);
      const hblData = urlParams.get('hbl');
      devLog('HBL data from URL:', hblData);
      
      if (hblData) {
        try {
          const data = JSON.parse(decodeURIComponent(hblData));
          devLog('Parsed HBL data:', data);
          
          if (data.customer) {
            setCustomerInfo(data.customer);
            devLog('Customer info set:', data.customer);
          }
          if (data.hblInfo) {
            setHblInfo(data.hblInfo);
            devLog('HBL info set:', data.hblInfo);
          }
          // Auto-show label if coming from URL
          setShowLabel(true);
          devLog('Label auto-shown');
        } catch (error) {
          devLog('Error parsing HBL data from URL:', error);
        }
      }
    } else {
      devLog('No query parameters found in hash');
    }
  });

  const [showLabel, setShowLabel] = createSignal(false);

  const updateCustomer = (field: string, value: string) => {
    setCustomerInfo(prev => ({ ...prev, [field]: value }));
  };

  const updateHBL = (field: string, value: string | number) => {
    setHblInfo(prev => ({ ...prev, [field]: value }));
  };

  const headerStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '2rem'
  };

  const formStyle = {
    display: 'grid',
    'grid-template-columns': '1fr 1fr',
    gap: '2rem',
    'margin-bottom': '2rem'
  };

  const sectionStyle = {
    'margin-bottom': '1.5rem'
  };

  return (
    <Layout title="HBL Label Generator">
      <div style={headerStyle}>
        <div>
          <h2 style={{ margin: '0 0 0.5rem 0' }}>Generador de Etiquetas HBL 4x6</h2>
          <p style={{ margin: '0', color: 'var(--text-muted)' }}>
            Genera etiquetas de envío con información del cliente y HBL
          </p>
        </div>
        <Button 
          variant="primary"
          onClick={() => setShowLabel(!showLabel())}
        >
          {showLabel() ? 'Ocultar Etiqueta' : 'Mostrar Etiqueta'}
        </Button>
      </div>

      <div style={formStyle}>
        {/* Customer Information Form */}
        <Card title="Información del Cliente">
          <div style={sectionStyle}>
            <FormInput
              label="Nombre Completo"
              value={customerInfo().fullname}
              onChange={(value) => updateCustomer('fullname', value)}
              placeholder="Nombre completo del destinatario"
            />
          </div>

          <div style={sectionStyle}>
            <FormInput
              label="Número de Teléfono"
              value={customerInfo().phoneNumber}
              onChange={(value) => updateCustomer('phoneNumber', value)}
              placeholder="+1 (809) 555-1234"
            />
          </div>

          <div style={sectionStyle}>
            <FormInput
              label="Cédula de Identidad"
              value={customerInfo().cid}
              onChange={(value) => updateCustomer('cid', value)}
              placeholder="001-1234567-8"
            />
          </div>

          <div style={sectionStyle}>
            <label style={{ 
              display: 'block', 
              'margin-bottom': '0.5rem', 
              'font-weight': '500' 
            }}>
              Dirección Completa
            </label>
            <textarea
              value={customerInfo().address}
              onInput={(e) => updateCustomer('address', e.currentTarget.value)}
              placeholder="Dirección completa del destinatario"
              style={{
                width: '100%',
                'min-height': '80px',
                padding: '0.75rem',
                border: '1px solid var(--border-color)',
                'border-radius': 'var(--border-radius)',
                'font-family': 'inherit',
                resize: 'vertical'
              }}
            />
          </div>
        </Card>

        {/* HBL Information Form */}
        <Card title="Información del HBL">
          <div style={sectionStyle}>
            <FormInput
              label="Número HBL"
              value={hblInfo().hbl}
              onChange={(value) => updateHBL('hbl', value)}
              placeholder="HBL-2024-001234"
            />
          </div>

          <div style={sectionStyle}>
            <FormInput
              label="Número de Guía"
              value={hblInfo().guideNumber}
              onChange={(value) => updateHBL('guideNumber', value)}
              placeholder="AWB-789012345"
            />
          </div>

          <div style={sectionStyle}>
            <FormInput
              label="Peso"
              value={hblInfo().weight}
              onChange={(value) => updateHBL('weight', value)}
              placeholder="15.5 KG"
            />
          </div>

          <div style={sectionStyle}>
            <FormInput
              label="Número de Piezas"
              type="number"
              value={hblInfo().pieces.toString()}
              onChange={(value) => updateHBL('pieces', parseInt(value) || 0)}
              placeholder="3"
            />
          </div>

          <div style={sectionStyle}>
            <FormInput
              label="Origen"
              value={hblInfo().origin}
              onChange={(value) => updateHBL('origin', value)}
              placeholder="Miami, FL"
            />
          </div>

          <div style={sectionStyle}>
            <FormInput
              label="Destino"
              value={hblInfo().destination}
              onChange={(value) => updateHBL('destination', value)}
              placeholder="Santo Domingo, DO"
            />
          </div>

          <div style={sectionStyle}>
            <FormInput
              label="Fecha"
              type="date"
              value={hblInfo().date}
              onChange={(value) => updateHBL('date', value)}
            />
          </div>
        </Card>
      </div>

      {/* Sample Data Buttons */}
      <div style={{ 
        'margin-bottom': '2rem', 
        'text-align': 'center',
        display: 'flex',
        gap: '1rem',
        'justify-content': 'center'
      }}>
        <Button
          variant="outline"
          onClick={() => {
            setCustomerInfo({
              fullname: 'María Elena Santos Pérez',
              phoneNumber: '+1 (829) 987-6543',
              cid: '001-9876543-2',
              address: 'Av. Winston Churchill #456, Torre Empresarial, Piso 12, Oficina 1201, Piantini, Santo Domingo'
            });
            setHblInfo({
              hbl: 'HBL-2024-002468',
              guideNumber: 'AWB-135792468',
              weight: '8.2 KG',
              pieces: 1,
              destination: 'Santiago, DO',
              origin: 'New York, NY',
              date: new Date().toLocaleDateString('es-ES')
            });
          }}
        >
          📦 Datos de Ejemplo 1
        </Button>
        
        <Button
          variant="outline"
          onClick={() => {
            setCustomerInfo({
              fullname: 'Luis Alberto Fernández Martínez',
              phoneNumber: '+1 (849) 123-4567',
              cid: '001-5555555-9',
              address: 'Calle 27 de Febrero #789, Casa #15, Villa Mella, Santo Domingo Norte'
            });
            setHblInfo({
              hbl: 'HBL-2024-003691',
              guideNumber: 'AWB-246813579',
              weight: '25.0 KG',
              pieces: 5,
              destination: 'La Romana, DO',
              origin: 'Los Angeles, CA',
              date: new Date().toLocaleDateString('es-ES')
            });
          }}
        >
          📦 Datos de Ejemplo 2
        </Button>
      </div>

      {/* Label Display */}
      {showLabel() && (
        <Card title="Etiqueta HBL 4x6">
          <div style={{ 
            'text-align': 'center',
            'margin-bottom': '1rem'
          }}>
            <p style={{ 
              color: 'var(--text-muted)',
              'font-size': '0.875rem'
            }}>
              La etiqueta está optimizada para impresión en papel 4x6 pulgadas (10.16 x 15.24 cm)
            </p>
          </div>
          
          <HBLLabel4x6
            customer={customerInfo()}
            hblInfo={hblInfo()}
            onPrint={() => {
              devLog('Printing label for HBL:', hblInfo().hbl);
            }}
          />
        </Card>
      )}
    </Layout>
  );
};

export default HBLLabelDemo;