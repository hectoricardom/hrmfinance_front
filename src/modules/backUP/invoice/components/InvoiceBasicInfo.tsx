import { Component, Show, createMemo } from 'solid-js';
import SearchableLocationDropdown from '../../inventory/components/SearchableLocationDropdown';
import RecomendationManager from './RecomendationManager';
import { invoiceStyledFormStore } from '../stores/invoiceStyledFormStore';

interface InvoiceBasicInfoProps {
  invoice: string;
  description: string;
  store: string;
  guide: string;
  packagesOrder: boolean;
  shippingMethod: 'aereo' | 'maritimo' | 'express' | '';
  createDate?: number;
  onInvoiceChange: (invoice: string) => void;
  onDescriptionChange: (description: string) => void;
  onStoreChange: (store: string) => void;
  onGuideChange: (guide: string) => void;
  onPackagesOrderChange: (packagesOrder: boolean) => void;
  onShippingMethodChange: (shippingMethod: 'aereo' | 'maritimo' | 'express' | '') => void;
  onCreateDateChange: (createDate: number) => void;
  // Validation props
  onFieldBlur?: (fieldName: string) => void;
  shouldShowFieldError?: (fieldName: string) => boolean;
}

const InvoiceBasicInfo: Component<InvoiceBasicInfoProps> = (props) => {

  // Get section validation status reactively
  const sectionValidation = createMemo(() => {
    const validation = invoiceStyledFormStore.getSectionValidation();
    return validation.basicInfo;
  });

  // Styles
  const sectionStyle = {
    background: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius)',
    padding: '1.5rem',
    'margin-bottom': '1.5rem'
  };

  const sectionHeaderStyle = {
    'font-size': '1.25rem',
    'font-weight': 'bold',
    color: 'var(--text-primary)',
    'margin-bottom': '1rem',
    'padding-bottom': '0.5rem',
    'border-bottom': '2px solid var(--primary-color)',
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem'
  };

  const gridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem'
  };

  const fullWidthGridStyle = {
    display: 'grid',
    'grid-template-columns': '1fr',
    gap: '1rem'
  };

  const twoColumnGridStyle = {
    display: 'grid',
    'grid-template-columns': '1fr 1fr',
    gap: '1rem'
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '1rem',
    background: 'var(--surface-color)',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
  };

  const inputErrorStyle = {
    ...inputStyle,
    border: '2px solid #dc3545',
    'box-shadow': '0 0 0 3px rgba(220, 53, 69, 0.15)'
  };

  const getInputStyle = (fieldName: string) => {
    return props.shouldShowFieldError?.(fieldName) ? inputErrorStyle : inputStyle;
  };

  const errorMessageStyle = {
    color: '#dc3545',
    'font-size': '0.75rem',
    'margin-top': '0.25rem',
    display: 'flex',
    'align-items': 'center',
    gap: '0.25rem'
  };

  const labelStyle = {
    display: 'block',
    'font-size': '0.875rem',
    'font-weight': '500',
    color: 'var(--text-secondary)',
    'margin-bottom': '0.25rem'
  };

  const checkboxContainerStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    padding: '0.75rem 0'
  };

  const checkboxStyle = {
    width: '1rem',
    height: '1rem'
  };

  const selectStyle = {
    ...inputStyle,
    cursor: 'pointer'
  };

  const requiredMarkerStyle = {
    color: 'var(--error-color)',
    'margin-left': '0.25rem'
  };

  const descriptionStyle = {
    'font-size': '0.75rem',
    color: 'var(--text-muted)',
    'margin-top': '0.25rem',
    'font-style': 'italic'
  };

  const validationBadgeStyle = {
    'margin-left': 'auto',
    padding: '0.25rem 0.75rem',
    'border-radius': '12px',
    'font-size': '0.75rem',
    'font-weight': '600',
    display: 'flex',
    'align-items': 'center',
    gap: '0.25rem'
  };

  const getValidationBadge = () => {
    const validation = sectionValidation();
    if (validation.isValid) {
      return {
        ...validationBadgeStyle,
        background: '#d4edda',
        color: '#155724',
        border: '1px solid #c3e6cb'
      };
    } else {
      return {
        ...validationBadgeStyle,
        background: '#fff3cd',
        color: '#856404',
        border: '1px solid #ffeeba'
      };
    }
  };

  return (
    <div style={sectionStyle}>
      <h3 style={sectionHeaderStyle}>
        <span>📋</span>
        <span>Información Básica de la Factura</span>
        <div style={getValidationBadge()}>
          <Show when={sectionValidation().isValid} fallback={
            <>
              <span>⚠</span>
              <span>{sectionValidation().completedFields}/{sectionValidation().totalFields}</span>
            </>
          }>
            <span>✓</span>
            <span>Completo</span>
          </Show>
        </div>
      </h3>
      
      <div style={gridStyle}>
        <div>
          <label style={labelStyle}>
            Número de Factura
            <span style={requiredMarkerStyle}>*</span>
          </label>
          <input
            type="text"
            style={getInputStyle('invoice')}
            value={props.invoice}
            onInput={(e) => props.onInvoiceChange((e.target as HTMLInputElement).value)}
            onBlur={() => props.onFieldBlur?.('invoice')}
            placeholder="Ej: INV-2024-001"
            required
          />
          {props.shouldShowFieldError?.('invoice') && (
            <div style={errorMessageStyle}>
              <span>⚠</span> Este campo es requerido
            </div>
          )}
          <div style={descriptionStyle}>
            Número único de identificación para esta factura
          </div>
        </div>

        <div>
          <label style={labelStyle}>
            Fecha de Creación
            <span style={requiredMarkerStyle}>*</span>
          </label>
          <input
            type="date"
            style={inputStyle}
            value={props.createDate ? new Date(props.createDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
            onInput={(e) => {
              const dateValue = (e.target as HTMLInputElement).value;
              props.onCreateDateChange(new Date(dateValue).getTime());
            }}
            required
          />
          <div style={descriptionStyle}>
            Fecha de creación de la factura
          </div>
        </div>

        <div>
          <label style={labelStyle}>
            Tienda/Sucursal
            <span style={requiredMarkerStyle}>*</span>
          </label>
          <div style={props.shouldShowFieldError?.('store') ? { border: '2px solid #dc3545', 'border-radius': 'var(--border-radius-sm)', 'box-shadow': '0 0 0 3px rgba(220, 53, 69, 0.15)' } : {}}>
            <SearchableLocationDropdown
              value={props.store}
              onChange={(val) => {
                props.onStoreChange(val);
                props.onFieldBlur?.('store');
              }}
              placeholder="Seleccionar tienda..."
              style={{ width: '100%' }}
            />
          </div>
          {props.shouldShowFieldError?.('store') && (
            <div style={errorMessageStyle}>
              <span>⚠</span> Este campo es requerido
            </div>
          )}
          <div style={descriptionStyle}>
            Ubicación donde se procesa la factura
          </div>
        </div>
        
        <div>
          <label style={labelStyle}>Número de Guía</label>
          <select
            style={selectStyle}
            value={props.guide}
            onChange={(e) => props.onGuideChange(
              (e.target as HTMLSelectElement).value)}
            required
          >
            <option value="">Seleccionar Número de Guía...</option>
            
            <option value="2531">2531</option>
            <option value="2532">2532</option> 
            <option value="2601">2601</option> 
            <option value="2602">2602</option>
            <option value="2603">2603</option>
            <option value="2604">2604</option>
            <option value="2605">2605</option>
          </select>
          <div style={descriptionStyle}>
            Número de seguimiento o guía de envío
          </div>
        </div>
        
        <div>
          <label style={labelStyle}>
            Método de Envío
            <span style={requiredMarkerStyle}>*</span>
          </label>
          <select
            style={props.shouldShowFieldError?.('shippingMethod') ? { ...selectStyle, border: '2px solid #dc3545', 'box-shadow': '0 0 0 3px rgba(220, 53, 69, 0.15)' } : selectStyle}
            value={props.shippingMethod}
            onChange={(e) => props.onShippingMethodChange(
              (e.target as HTMLSelectElement).value as 'aereo' | 'maritimo' | 'express' | ''
            )}
            onBlur={() => props.onFieldBlur?.('shippingMethod')}
            required
          >
            <option value="">Seleccionar método...</option>

            <option value="aereo">🛩️ Aéreo (AEREO)</option>
            <option value="maritimo">🚢 Marítimo (SEA)</option>
            <option value="express">⚡ Aéreo Express (AEREO)</option>
          </select>
          {props.shouldShowFieldError?.('shippingMethod') && (
            <div style={errorMessageStyle}>
              <span>⚠</span> Este campo es requerido
            </div>
          )}
          <div style={descriptionStyle}>
            Método de transporte para el envío
          </div>
        </div>
      </div>


     
      
      {/* Summary info */}
      <div style={{
        'margin-top': '1rem',
        padding: '1rem',
        background: 'var(--strip-color)',
        'border-radius': 'var(--border-radius-sm)',
        border: '1px solid var(--border-color)'
      }}>
        <div style={{
          'font-size': '0.875rem',
          color: 'var(--text-muted)',
          'line-height': '1.4'
        }}>
          <strong>Información importante:</strong><br/>
          • El número de factura debe ser único<br/>
          • El método de envío afecta los precios de transporte<br/>
          • La descripción se incluirá en la factura impresa<br/>
          • Los campos marcados con <span style={{ color: 'var(--error-color)' }}>*</span> son obligatorios
        </div>
      </div>
    </div>
  );
};

export default InvoiceBasicInfo;



/*

<div>
          <label style={labelStyle}>Descripción</label>
          <textarea
            style={{
              ...inputStyle,
              'min-height': '100px',
              resize: 'vertical' as const
            }}
            value={props.description}
            onInput={(e) => props.onDescriptionChange((e.target as HTMLTextAreaElement).value)}
            placeholder="Descripción detallada de la factura, notas especiales, instrucciones de manejo, etc."
          />
          <div style={descriptionStyle}>
            Información adicional sobre la factura o instrucciones especiales
          </div>
        </div>


<div style={twoColumnGridStyle}>
        <div style={checkboxContainerStyle}>
          <input
            type="checkbox"
            style={checkboxStyle}
            checked={props.packagesOrder}
            onChange={(e) => props.onPackagesOrderChange((e.target as HTMLInputElement).checked)}
            id="packages-order-checkbox"
          />
          <label 
            for="packages-order-checkbox"
            style={{
              'font-size': '0.875rem',
              'font-weight': '500',
              color: 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            📦 Orden de Paquetes
          </label>
        </div>
        <div style={{
          ...descriptionStyle,
          'margin-top': '0',
          'padding': '0.75rem 0',
          'align-self': 'center'
        }}>
          Marque si esta factura incluye una orden específica de paquetes
        </div>
      </div>

      */