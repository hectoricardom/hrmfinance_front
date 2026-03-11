import { Component, createSignal, createMemo, For, Show, onMount, createEffect } from 'solid-js';
import { Card, Button } from '../../ui';
import { useTranslation } from '../../../translations';
import { NotaryCustomer } from '../types';
import { inventoryApi } from '../../../services/apiAdapter';
import I485FormComparison from './I485FormComparison';
import { devLog } from '../../../services/utils';

interface NotaryCustomerViewerProps {
  customerId?: string;
  customer?: NotaryCustomer | null;
  onClose?: () => void;
  onEdit?: (customer: NotaryCustomer) => void;
}

const NotaryCustomerViewer: Component<NotaryCustomerViewerProps> = (props) => {
  const { t } = useTranslation();
  const [customer, setCustomer] = createSignal<NotaryCustomer | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [showI485Comparison, setShowI485Comparison] = createSignal(false);

  // Fetch customer data if needed
  const fetchCustomerData = async () => {
    if (props.customer) {
      setCustomer(props.customer);
      return;
    }
    
    if (!props.customerId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await inventoryApi.getClientNotary(props.customerId);
      if (response) {
        setCustomer(response);
      }
    } catch (err) {
      setError('Error fetching customer data');
      devLog('Error fetching customer:', err);
    } finally {
      setLoading(false);
    }
  };

  // Format date
  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get full name
  const fullName = createMemo(() => {
    const c = customer();
    if (!c) return '';
    return [c.firstName, c.middleName, c.lastName].filter(Boolean).join(' ');
  });

  // Get status badge
  const getStatusBadge = () => {
    const c = customer();
    if (!c) return null;
    
    if (c.hasLPR) return { text: 'LPR', color: '#28a745', bg: '#d4edda' };
    if (c.isInUSA) return { text: 'En USA', color: '#17a2b8', bg: '#d1ecf1' };
    if (c.hasI94) return { text: 'I-94', color: '#ffc107', bg: '#fff3cd' };
    return { text: 'Otro', color: '#6c757d', bg: '#e9ecef' };
  };

  // Initialize data
  onMount(() => {
    fetchCustomerData();
  });

  createEffect(() => {
    if (props.customer) {
      setCustomer(props.customer);
    } else if (props.customerId) {
      fetchCustomerData();
    }
  });

  // Card section style
  const cardSectionStyle = {
    background: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius)',
    padding: '1.5rem',
    'margin-bottom': '1rem',
    'box-shadow': 'var(--shadow-sm)'
  };

  // Info row style
  const infoRowStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '0.75rem 0',
    'border-bottom': '1px solid var(--border-light)',
    'font-size': '0.875rem'
  };

  const labelStyle = {
    'font-weight': '600',
    color: 'var(--text-muted)',
    'min-width': '140px'
  };

  const valueStyle = {
    color: 'var(--text-primary)',
    'font-weight': '500'
  };

  return (
    <div style={{ 'max-width': '1200px', margin: '0 auto' }}>
      {/* Header */}
      <Card>
        <div style={{ padding: '2rem' }}>
          <div style={{
            display: 'flex',
            'justify-content': 'space-between',
            'align-items': 'flex-start',
            'margin-bottom': '2rem'
          }}>
            <div>
              <h1 style={{
                'font-size': '2rem',
                'font-weight': '700',
                color: 'var(--primary-color)',
                'margin-bottom': '0.5rem'
              }}>
                👤 {fullName()}
              </h1>
              <div style={{
                display: 'flex',
                gap: '1rem',
                'align-items': 'center'
              }}>
                <span style={{
                  'font-size': '1rem',
                  color: 'var(--text-muted)'
                }}>
                  ID: {customer()?.clientNotaryId || '-'}
                </span>
                <Show when={getStatusBadge()}>
                  {(badge) => (
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      'border-radius': 'var(--border-radius-sm)',
                      'font-size': '0.75rem',
                      'font-weight': '600',
                      color: badge().color,
                      background: badge().bg
                    }}>
                      {badge().text}
                    </span>
                  )}
                </Show>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Show when={props.onEdit && customer()}>
                <Button
                  variant="primary"
                  onClick={() => props.onEdit!(customer()!)}
                  style={{
                    display: 'flex',
                    'align-items': 'center',
                    gap: '0.5rem'
                  }}
                >
                  ✏️ Editar Cliente
                </Button>
              </Show>
              <Show when={customer() && !showI485Comparison()}>
                <Button
                  variant="primary"
                  onClick={() => setShowI485Comparison(true)}
                  style={{
                    display: 'flex',
                    'align-items': 'center',
                    gap: '0.5rem',
                    background: 'var(--info-color)'
                  }}
                >
                  📋 Comparar I-485
                </Button>
              </Show>
              <Show when={showI485Comparison()}>
                <Button
                  variant="outline"
                  onClick={() => setShowI485Comparison(false)}
                  style={{
                    display: 'flex',
                    'align-items': 'center',
                    gap: '0.5rem'
                  }}
                >
                  ← Volver a Vista
                </Button>
              </Show>
              <Button
                variant="outline"
                onClick={fetchCustomerData}
                disabled={loading()}
              >
                🔄 Actualizar
              </Button>
              <Show when={props.onClose}>
                <Button
                  variant="outline"
                  onClick={props.onClose}
                >
                  ← Volver
                </Button>
              </Show>
            </div>
          </div>

          <Show when={loading()}>
            <div style={{ 
              'text-align': 'center', 
              padding: '3rem',
              color: 'var(--text-muted)'
            }}>
              <div style={{ 'font-size': '2rem', 'margin-bottom': '1rem' }}>⏳</div>
              <div>Cargando información del cliente...</div>
            </div>
          </Show>

          <Show when={error()}>
            <div style={{
              padding: '1rem',
              background: 'var(--danger-light)',
              color: 'var(--danger-color)',
              'border-radius': 'var(--border-radius-sm)',
              'margin-bottom': '1rem'
            }}>
              {error()}
            </div>
          </Show>
        </div>
      </Card>

      {/* I-485 Form Comparison View */}
      <Show when={showI485Comparison() && customer()}>
        <I485FormComparison
          customer={customer()!}
          onClose={() => setShowI485Comparison(false)}
        />
      </Show>

      {/* Regular Customer Details View */}
      <Show when={customer() && !loading() && !showI485Comparison()}>
        {/* Contact Information */}
        <div style={cardSectionStyle}>
          <h3 style={{
            'font-size': '1.25rem',
            'font-weight': '600',
            'margin-bottom': '1rem',
            color: 'var(--primary-color)',
            display: 'flex',
            'align-items': 'center',
            gap: '0.5rem'
          }}>
            📞 Información de Contacto
          </h3>
          
          <div style={infoRowStyle}>
            <span style={labelStyle}>Email:</span>
            <span style={valueStyle}>{customer()?.email || '-'}</span>
          </div>
          
          <div style={infoRowStyle}>
            <span style={labelStyle}>Teléfono:</span>
            <span style={valueStyle}>{customer()?.phoneNumber || '-'}</span>
          </div>
          
          <div style={{ ...infoRowStyle, 'border-bottom': 'none' }}>
            <span style={labelStyle}>Ubicación Actual:</span>
            <span style={valueStyle}>
              {customer()?.currentLocation ? 
                `${customer()?.currentLocation.state || ''}, ${customer()?.currentLocation.country || ''}` 
                : '-'}
            </span>
          </div>
        </div>

        {/* Personal Information */}
        <div style={cardSectionStyle}>
          <h3 style={{
            'font-size': '1.25rem',
            'font-weight': '600',
            'margin-bottom': '1rem',
            color: 'var(--primary-color)',
            display: 'flex',
            'align-items': 'center',
            gap: '0.5rem'
          }}>
            👤 Información Personal
          </h3>
          
          <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '2rem' }}>
            <div>
              <div style={infoRowStyle}>
                <span style={labelStyle}>Género:</span>
                <span style={valueStyle}>{customer()?.genre || '-'}</span>
              </div>
              
              <div style={infoRowStyle}>
                <span style={labelStyle}>Fecha de Nacimiento:</span>
                <span style={valueStyle}>{formatDate(customer()?.dateOfBirth)}</span>
              </div>
              
              <div style={infoRowStyle}>
                <span style={labelStyle}>Lugar de Nacimiento:</span>
                <span style={valueStyle}>
                  {customer()?.placeOfBirth ? 
                    `${customer()?.placeOfBirth.city || ''}, ${customer()?.placeOfBirth.state || ''}, ${customer()?.placeOfBirth.country || ''}` 
                    : '-'}
                </span>
              </div>
              
              <div style={infoRowStyle}>
                <span style={labelStyle}>Estado Civil:</span>
                <span style={valueStyle}>{customer()?.maritalStatus || '-'}</span>
              </div>
              
              <div style={{ ...infoRowStyle, 'border-bottom': 'none' }}>
                <span style={labelStyle}>Raza/Etnia:</span>
                <span style={valueStyle}>
                  {[customer()?.race, customer()?.ethnicity].filter(Boolean).join(', ') || '-'}
                </span>
              </div>
            </div>
            
            <div>
              <div style={infoRowStyle}>
                <span style={labelStyle}>Altura:</span>
                <span style={valueStyle}>{customer()?.height ? `${customer()?.height} cm` : '-'}</span>
              </div>
              
              <div style={infoRowStyle}>
                <span style={labelStyle}>Peso:</span>
                <span style={valueStyle}>{customer()?.weight ? `${customer()?.weight} lbs` : '-'}</span>
              </div>
              
              <div style={infoRowStyle}>
                <span style={labelStyle}>Color de Cabello:</span>
                <span style={valueStyle}>{customer()?.hairColor || '-'}</span>
              </div>
              
              <div style={infoRowStyle}>
                <span style={labelStyle}>Color de Ojos:</span>
                <span style={valueStyle}>{customer()?.eyesColor || '-'}</span>
              </div>
              
              <div style={{ ...infoRowStyle, 'border-bottom': 'none' }}>
                <span style={labelStyle}>SSN:</span>
                <span style={valueStyle}>{customer()?.ss || '-'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Immigration Status */}
        <div style={cardSectionStyle}>
          <h3 style={{
            'font-size': '1.25rem',
            'font-weight': '600',
            'margin-bottom': '1rem',
            color: 'var(--primary-color)',
            display: 'flex',
            'align-items': 'center',
            gap: '0.5rem'
          }}>
            ✈️ Estado Migratorio
          </h3>
          
          <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '2rem' }}>
            <div>
              <div style={infoRowStyle}>
                <span style={labelStyle}>Ciudadanía:</span>
                <span style={valueStyle}>{customer()?.countryOfCitizenship || '-'}</span>
              </div>
              
              <div style={infoRowStyle}>
                <span style={labelStyle}>En Estados Unidos:</span>
                <span style={valueStyle}>
                  <span style={{
                    padding: '0.25rem 0.5rem',
                    'border-radius': 'var(--border-radius-sm)',
                    'font-size': '0.75rem',
                    color: customer()?.isInUSA ? '#28a745' : '#6c757d',
                    background: customer()?.isInUSA ? '#d4edda' : '#e9ecef'
                  }}>
                    {customer()?.isInUSA ? '✅ Sí' : '❌ No'}
                  </span>
                </span>
              </div>
              
              <div style={{ ...infoRowStyle, 'border-bottom': 'none' }}>
                <span style={labelStyle}>Alien Number:</span>
                <span style={valueStyle}>{customer()?.alienNumber || '-'}</span>
              </div>
            </div>
            
            <div>
              <div style={infoRowStyle}>
                <span style={labelStyle}>Tiene I-94:</span>
                <span style={valueStyle}>
                  <span style={{
                    padding: '0.25rem 0.5rem',
                    'border-radius': 'var(--border-radius-sm)',
                    'font-size': '0.75rem',
                    color: customer()?.hasI94 ? '#28a745' : '#6c757d',
                    background: customer()?.hasI94 ? '#d4edda' : '#e9ecef'
                  }}>
                    {customer()?.hasI94 ? '✅ Sí' : '❌ No'}
                  </span>
                </span>
              </div>
              
              <div style={infoRowStyle}>
                <span style={labelStyle}>Tiene LPR:</span>
                <span style={valueStyle}>
                  <span style={{
                    padding: '0.25rem 0.5rem',
                    'border-radius': 'var(--border-radius-sm)',
                    'font-size': '0.75rem',
                    color: customer()?.hasLPR ? '#28a745' : '#6c757d',
                    background: customer()?.hasLPR ? '#d4edda' : '#e9ecef'
                  }}>
                    {customer()?.hasLPR ? '✅ Sí' : '❌ No'}
                  </span>
                </span>
              </div>
              
              <div style={{ ...infoRowStyle, 'border-bottom': 'none' }}>
                <span style={labelStyle}>Fecha I-589:</span>
                <span style={valueStyle}>{formatDate(customer()?.dateOfAppI589)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Documents */}
        <div style={cardSectionStyle}>
          <h3 style={{
            'font-size': '1.25rem',
            'font-weight': '600',
            'margin-bottom': '1rem',
            color: 'var(--primary-color)',
            display: 'flex',
            'align-items': 'center',
            gap: '0.5rem'
          }}>
            📄 Documentos
          </h3>
          
          <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '2rem' }}>
            <div>
              <div style={infoRowStyle}>
                <span style={labelStyle}>Número de Pasaporte:</span>
                <span style={valueStyle}>{customer()?.passportNumber || '-'}</span>
              </div>
              
              <div style={{ ...infoRowStyle, 'border-bottom': 'none' }}>
                <span style={labelStyle}>Vencimiento:</span>
                <span style={valueStyle}>{formatDate(customer()?.passportExpire)}</span>
              </div>
            </div>
            
            <div>
              <div style={{
                display: 'grid',
                'grid-template-columns': 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: '0.5rem'
              }}>
                <Show when={customer()?.passportImage}>
                  <div style={{
                    padding: '0.75rem',
                    background: 'var(--success-light)',
                    'border-radius': 'var(--border-radius-sm)',
                    'text-align': 'center',
                    'font-size': '0.75rem',
                    color: 'var(--success-color)'
                  }}>
                    📄 Pasaporte
                  </div>
                </Show>
                
                <Show when={customer()?.imageUrlBCT}>
                  <div style={{
                    padding: '0.75rem',
                    background: 'var(--info-light)',
                    'border-radius': 'var(--border-radius-sm)',
                    'text-align': 'center',
                    'font-size': '0.75rem',
                    color: 'var(--info-color)'
                  }}>
                    📜 Cert. Nacimiento
                  </div>
                </Show>
                
                <Show when={customer()?.imageUrlMCT}>
                  <div style={{
                    padding: '0.75rem',
                    background: 'var(--warning-light)',
                    'border-radius': 'var(--border-radius-sm)',
                    'text-align': 'center',
                    'font-size': '0.75rem',
                    color: 'var(--warning-color)'
                  }}>
                    💑 Cert. Matrimonio
                  </div>
                </Show>
                
                <Show when={customer()?.greenCardFrontImage}>
                  <div style={{
                    padding: '0.75rem',
                    background: 'var(--primary-light)',
                    'border-radius': 'var(--border-radius-sm)',
                    'text-align': 'center',
                    'font-size': '0.75rem',
                    color: 'var(--primary-color)'
                  }}>
                    🆔 Green Card
                  </div>
                </Show>
              </div>
            </div>
          </div>
        </div>

        {/* Marriage Information */}
        <Show when={customer()?.isMarriage}>
          <div style={cardSectionStyle}>
            <h3 style={{
              'font-size': '1.25rem',
              'font-weight': '600',
              'margin-bottom': '1rem',
              color: 'var(--primary-color)',
              display: 'flex',
              'align-items': 'center',
              gap: '0.5rem'
            }}>
              💑 Información de Matrimonio
            </h3>
            
            <div style={infoRowStyle}>
              <span style={labelStyle}>Fecha de Matrimonio:</span>
              <span style={valueStyle}>{formatDate(customer()?.marriage_date)}</span>
            </div>
            
            <div style={{ ...infoRowStyle, 'border-bottom': 'none' }}>
              <span style={labelStyle}>Lugar de Matrimonio:</span>
              <span style={valueStyle}>
                {customer()?.marriage_city ? 
                  `${customer()?.marriage_city}, ${customer()?.marriage_state || ''}, ${customer()?.marriage_country || ''}` 
                  : '-'}
              </span>
            </div>
          </div>
        </Show>
      </Show>
    </div>
  );
};

export default NotaryCustomerViewer;