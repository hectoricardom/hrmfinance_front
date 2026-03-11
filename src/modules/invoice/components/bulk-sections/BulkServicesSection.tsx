import { Component, For, Show } from 'solid-js';
import { InvoiceService } from '../../types/invoiceTypes';
import { FormInput } from '../../../ui';
import ServiceTypeDropdown from '../ServiceTypeDropdown';

interface BulkServicesSectionProps {
  services: InvoiceService[];
  showPricing: boolean;
  onUpdateService: (index: number, updates: Partial<InvoiceService>) => void;
  onRemoveService: (index: number) => void;
  onBulkChange: () => void; // Trigger bulk update
}

const BulkServicesSection: Component<BulkServicesSectionProps> = (props) => {
  
  const handleUpdateService = (index: number, updates: Partial<InvoiceService>) => {
    // Calculate total when qty, price, or arancel changes
    let finalUpdates = { ...updates };
    
    const service = props.services[index];
    if (service && (updates.qty !== undefined || updates.price !== undefined )) {
      const newQty = updates.qty ?? service.qty;
      const newPrice = updates.price ?? service.price;
      finalUpdates = { ...finalUpdates, total: (newPrice) * newQty };
    }
    
    props.onUpdateService(index, finalUpdates);
    props.onBulkChange(); // Trigger bulk update
  };

  const handleRemoveService = (index: number, service: InvoiceService) => {
    const confirmed = confirm(`¿Eliminar servicio "${service.type || 'sin tipo'}"?\n\nEsta acción no se puede deshacer.`);
    if (confirmed) {
      props.onRemoveService(index);
      props.onBulkChange(); // Trigger bulk update
    }
  };

  const itemStyle = {
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    padding: '1rem',
    'margin-bottom': '0.5rem',
    background: 'white'
  };

  const itemHeaderStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '0.5rem'
  };

  const removeButtonStyle = {
   
    color: 'white',
    border: 'none',
    'border-radius': '50%',
    width: '28px',
    height: '28px',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    cursor: 'pointer',
    'font-size': '0.75rem'
  };

  const inputStyle = {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '0.875rem',
    'margin-bottom': '0.5rem'
  };

  const inputGroupStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '0.5rem'
  };

  // Service type suggestions
  const serviceTypes = [
    '🚛 Transporte',
    '📦 Empaque',
    '🔧 Rapeado',
    '🏷️ Etiquetado',
    '📋 Documentación',
    '🛠️ Instalación',
    '🔍 Inspección',
    '📸 Fotografía',
    '🧹 Limpieza',
    '⚖️ Pesaje',
    '📏 Medición',
    '🎁 Gift Wrap',
    '🔒 Seguro',
    '📞 Notificación',
    '🚚 Entrega a Domicilio'
  ];

  

  return (
    <>
      <Show when={props.services.length > 0}>
        <h4 style={{ 
          'font-size': '1rem', 
          'font-weight': 'bold', 
          color: 'var(--warning-color)',
          'margin': '1.9rem 0 0.75rem 0 ',
          'border-bottom': '1px solid var(--border-color)',
          'padding-bottom': '0.5rem'
        }}>
          🔧 Servicios ({props.services.length})
        </h4>
      </Show>

      <For each={props.services}>
        {(service, serviceIndex) => (
          <div style={itemStyle}>
            <div style={itemHeaderStyle}>
              <span style={{ 'font-weight': 'bold', color: 'var(--warning-color)' }}>
                🔧 Servicio: {service.type || 'Sin tipo'}
              </span>
              <button
                type="button"
                style={removeButtonStyle}
                onClick={() => handleRemoveService(serviceIndex(), service)}
                title="Eliminar servicio"
              >
                🗑️
              </button>
            </div>
            <div style={inputGroupStyle}>
              <div>
                <label style={{ 'font-size': '0.875rem', 'font-weight': '500' }}>
                  Tipo de Servicio
                </label>

                <ServiceTypeDropdown
                  value={service?.type}
                  onChange={(e) => handleUpdateService(serviceIndex(), { type: e })}
                  placeholder="Buscar tipo de servicio, Ej: Empaque, Etiquetado, Transporte..."
                  style={{ 'margin-bottom': '0' }}
                />
               
              </div>
              
              <div>
                <label style={{ 'font-size': '0.875rem', 'font-weight': '500' }}>
                  Cantidad
                </label>
                 <FormInput
                  type="number"
                  style={inputStyle}
                  value={service?.qty?.toString()}
                  min="1"
                  onChange={(e) => handleUpdateService(serviceIndex(), { 
                    qty: Number(e) || 1 
                  })}
                />
              </div>
              
              
                <div>
                  <label style={{ 'font-size': '0.875rem', 'font-weight': '500' }}>
                    Precio ($)
                  </label>
                  <FormInput
                    type="number"
                    style={inputStyle}
                    value={service?.arancel?.toString()}
                    step="0.01"
                    onChange={(e) => handleUpdateService(serviceIndex(), { 
                      arancel: Number(e) || 0 
                    })}
                  />
                </div>
                
              
             
            </div>
          </div>
        )}
      </For>
    </>
  );
};

export default BulkServicesSection;