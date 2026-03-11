import { Component, Show, createMemo } from 'solid-js';
import { Customer, ShipperConsignee } from '../types/invoiceTypes';
import SearchableCustomerDropdown from './SearchableCustomerDropdown';
import SearchableShipperDropdown from './SearchableCustomerShipper';
import { FormInput } from '../../ui';
import { invoiceStyledFormStore } from '../stores/invoiceStyledFormStore';
import { devLog } from '../../../services/utils';

interface CustomerInfoProps {
  customer: Customer | null;
  shipperConsignee: ShipperConsignee;

  //onCustomerConsigneeChange: (updates: Partial<Customer>) => void;
  onShipperConsigneeChange: (updates: Partial<ShipperConsignee>) => void;
  // Validation props
  onFieldBlur?: (fieldName: string) => void;
  shouldShowFieldError?: (fieldName: string) => boolean;
}

const CustomerInfo: Component<CustomerInfoProps> = (props) => {

  // Get section validation status reactively
  const sectionValidation = createMemo(() => {
    const validation = invoiceStyledFormStore.getSectionValidation();
    return validation.customerInfo;
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
    gap: '1rem',
    'margin-bottom': '1rem'
  };

  const twoColumnGridStyle = {
    display: 'grid',
    'grid-template-columns': '1fr 1fr',
    gap: '1rem',
    margin: '1rem 0 ',
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

  const requiredMarkerStyle = {
    color: '#dc3545',
    'margin-left': '0.25rem'
  };

  const labelStyle = {
    display: 'block',
    'font-size': '0.875rem',
    'font-weight': '500',
    color: 'var(--text-secondary)',
    'margin-bottom': '0.25rem'
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
    <>
      {/* Customer Selection */}
      <div style={sectionStyle}>
        <h3 style={sectionHeaderStyle}>
          <span>👤</span>
          <span>Información del Cliente</span>
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
           <div style={fullWidthGridStyle}>
          <SearchableShipperDropdown
            value={{
              name: props.shipperConsignee.name,
              phoneNumberS: props.shipperConsignee.phoneNumberS,
              idS: props.shipperConsignee.idS,
              dob: props.shipperConsignee.dob,
              addressS: props.shipperConsignee.addressS,
            }}
            onChange={(shipper) => {
              if (shipper) {
                devLog({shipper})
                props.onShipperConsigneeChange({
                  name: shipper.name|| '',
                  phoneNumberS: shipper.phoneNumberS || '',
                  idS: shipper.idS || '',
                  dob: shipper.dob || '',
                  addressS: shipper.addressS || ''
                });
              }
            }}
            placeholder="Buscar remitente por nombre, cédula, teléfono..."
            label="Remitente/Destinatario"
            description="Busque y seleccione un remitente existente o ingrese los datos manualmente"
          />
        </div>

        {/* Manual customer input when no customer is selected */}
        <div style={gridStyle}>
          <div>
            <label style={labelStyle}>Nombre
               <span style={requiredMarkerStyle}>*</span>
            </label>
            <input
              type="text"
              //style={inputStyle}
              style={getInputStyle('name')}
              value={props.shipperConsignee.name}
              onInput={(e) => props.onShipperConsigneeChange({ 
                name: (e.target as HTMLInputElement).value 
              })}
              onBlur={() => props.onFieldBlur?.('name')}
              placeholder="Nombre completo del cliente"
              required
            />
            {props.shouldShowFieldError?.('name') && (
              <div style={errorMessageStyle}>
                <span>⚠</span> Este campo es requerido
              </div>
            )}
          </div>
          
          <div>
            <label style={labelStyle}>Fecha de Nacimiento</label>
            <input
              type="date"
              style={inputStyle}
              value={props.shipperConsignee.dob}
              onInput={(e) => props.onShipperConsigneeChange({ 
                dob: (e.target as HTMLInputElement).value 
              })}
              //placeholder="Número de teléfono"
            />
          </div>
          <div>
            <label style={labelStyle}>ID</label>
            <input
              type="text"
              style={inputStyle}
              value={props.shipperConsignee.idS}
              onInput={(e) => props.onShipperConsigneeChange({ 
                idS: (e.target as HTMLInputElement).value 
              })}
              placeholder="Número de cédula o ID"
            />
          </div>
         
        </div>
        <div style={{...gridStyle, ...{margin: "1rem 0"}}}>
          <div>
            <label style={labelStyle}>Dirección</label>
            <input
              type="text"
              style={inputStyle}
              value={props.shipperConsignee.addressS}
              onInput={(e) => props.onShipperConsigneeChange({ 
                addressS: (e.target as HTMLInputElement).value 
              })}
              placeholder="Dirección completa"
            />
          </div>
          
        </div>
         <div style={{...gridStyle, ...{margin: "1rem 0"}}}>
          <div>
            <label style={labelStyle}>
              Teléfono (USA)
              <span style={requiredMarkerStyle}>*</span>
            </label>
            <input
              required
              type="text"
              style={getInputStyle('phoneNumberS')}
              value={props.shipperConsignee.phoneNumberS}
              onInput={(e) => props.onShipperConsigneeChange({
                phoneNumberS: (e.target as HTMLInputElement).value
              })}
              onBlur={() => props.onFieldBlur?.('phoneNumberS')}
              placeholder="Número de teléfono"
            />
            {props.shouldShowFieldError?.('phoneNumberS') && (
              <div style={errorMessageStyle}>
                <span>⚠</span> Este campo es requerido
              </div>
            )}
          </div>
        </div>
      </div>









 {/* Shipper/Consignee Information */}
      <div style={sectionStyle}>
        <h3 style={sectionHeaderStyle}>
          <span>🚚</span>
          <span>Información del Remitente/Destinatario</span>
        </h3>
        
       
        <div style={fullWidthGridStyle}>
          <SearchableCustomerDropdown
            value={props.customer}
            onChange={props.onShipperConsigneeChange}
            placeholder="Buscar cliente por nombre, teléfono, ID..."
            label="Cliente"
            description="Busque y seleccione un cliente existente o ingrese los datos manualmente"
          />
        </div>


        {/* Manual shipper input */}
        <div style={gridStyle}>
          
          <div>
            <label style={labelStyle}>
              Primer Nombre
              <span style={requiredMarkerStyle}>*</span>
            </label>
            <input
              type="text"
              style={getInputStyle('firstName')}
              value={props.shipperConsignee?.firstName || ''}
              onInput={(e) => {
                const firstName  = (e.target as HTMLInputElement).value;
                props.onShipperConsigneeChange({firstName});
              }}
              onBlur={() => props.onFieldBlur?.('firstName')}
              placeholder="Primer nombre"
              required
            />
            {props.shouldShowFieldError?.('firstName') && (
              <div style={errorMessageStyle}>
                <span>⚠</span> Este campo es requerido
              </div>
            )}
          </div>
          
          <div>
            <label style={labelStyle}>Segundo Nombre</label>
            <input
              type="text"
              style={inputStyle}
              value={props.shipperConsignee?.middleName || ''}
              onInput={(e) => {
                const middleName  = (e.target as HTMLInputElement).value;
                props.onShipperConsigneeChange({middleName});
              }}
              placeholder="Segundo nombre (opcional)"
            />
          </div>
          
          <div>
            <label style={labelStyle}>
              Apellidos
              <span style={requiredMarkerStyle}>*</span>
            </label>
            <input
              type="text"
              style={getInputStyle('lastName')}
              value={props.shipperConsignee?.lastName || ''}
              onInput={(e) => {
                const lastName  = (e.target as HTMLInputElement).value;
                props.onShipperConsigneeChange({lastName});
              }}
              onBlur={() => props.onFieldBlur?.('lastName')}
              placeholder="Apellidos"
              required
            />
            {props.shouldShowFieldError?.('lastName') && (
              <div style={errorMessageStyle}>
                <span>⚠</span> Este campo es requerido
              </div>
            )}
          </div>
          
         
        </div>

        <div style={twoColumnGridStyle}>
          <div>
            <label style={labelStyle}>
              Cédula/ID
              <span style={requiredMarkerStyle}>*</span>
            </label>
            <input
              type="text"
              style={getInputStyle('cid')}
              value={props.shipperConsignee?.cid || ""}
              onInput={(e) => {
                const cid = (e.target as HTMLInputElement).value;
                props.onShipperConsigneeChange({cid });
              }}
              onBlur={() => props.onFieldBlur?.('cid')}
              placeholder="Número de cédula o ID"
              required
            />
            {props.shouldShowFieldError?.('cid') && (
              <div style={errorMessageStyle}>
                <span>⚠</span> Este campo es requerido
              </div>
            )}
          </div>
          
          <div>
            <label style={labelStyle}>Pasaporte</label>
            <input
              type="text"
              style={inputStyle}
              value={props.shipperConsignee?.passport || ''}
              onInput={(e) => {
                const passport = (e.target as HTMLInputElement).value;
                props.onShipperConsigneeChange({passport });
              }}
              placeholder="Número de pasaporte (opcional)"
            />
          </div>
        </div>

        
          
        <div style={twoColumnGridStyle}>
          <div>
            <label style={labelStyle}>
              Teléfono Principal (CUBA)
              <span style={requiredMarkerStyle}>*</span>
            </label>
            <input
              type="tel"
              style={getInputStyle('phoneNumber')}
              value={props.shipperConsignee?.phoneNumber || ""}
              onInput={(e) => {
                const phoneNumber  = (e.target as HTMLInputElement).value;
                props.onShipperConsigneeChange({  phoneNumber  });
              }}
              onBlur={() => props.onFieldBlur?.('phoneNumber')}
              placeholder="Teléfono principal"
              required
            />
            {props.shouldShowFieldError?.('phoneNumber') && (
              <div style={errorMessageStyle}>
                <span>⚠</span> Este campo es requerido
              </div>
            )}
          </div>
          
          <div>
            <label style={labelStyle}>Teléfono Secundario</label>
            <input
              type="tel"
              style={inputStyle}
              value={props.shipperConsignee?.altPhoneNumber || ''}
              onInput={(e) => {
                const altPhoneNumber  = (e.target as HTMLInputElement).value;
                props.onShipperConsigneeChange({  altPhoneNumber  });
              }}
              placeholder="Teléfono secundario (opcional)"
            />
          </div>
        </div>

        <div style={fullWidthGridStyle}>
          <div>
            <label style={labelStyle}>Dirección</label>
            <input
              type="text"
              style={inputStyle}
              value={props.shipperConsignee?.address || ''}
              onInput={(e) => {
                const address  = (e.target as HTMLInputElement).value;
                props.onShipperConsigneeChange({  address });
              }}
              placeholder="Dirección completa"
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default CustomerInfo;