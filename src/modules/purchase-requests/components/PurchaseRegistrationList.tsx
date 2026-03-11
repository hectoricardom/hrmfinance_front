import { Component, onMount, Show, For, createMemo } from 'solid-js';
import { Card, Button } from '../../ui';
import { useTranslation } from '../../../translations';
import { PurchaseRegistration, PLATFORMS } from '../types/purchaseRequestTypes';
import purchaseRegistrationStore from '../stores/purchaseRegistrationStore';

interface PurchaseRegistrationListProps {
  onEdit?: (registration: PurchaseRegistration) => void;
  onView?: (registration: PurchaseRegistration) => void;
  canDelete?: boolean;
  canEdit?: boolean;
  showAdminActions?: boolean;
}

const PurchaseRegistrationList: Component<PurchaseRegistrationListProps> = (props) => {
  const { t } = useTranslation();

  onMount(() => {
    purchaseRegistrationStore.loadAll();
  });

  const handleDelete = async (registration: PurchaseRegistration) => {
    if (!props.canDelete) return;
    
    const confirmed = window.confirm(
      `¿Estás seguro de que deseas eliminar el registro de compra ${registration.registrationNumber}? Esta acción no se puede deshacer.`
    );
    
    if (confirmed) {
      await purchaseRegistrationStore.deleteRegistration(registration.id);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return `${currency} ${amount.toFixed(2)}`;
  };

 const sortList = createMemo(() => {
    

    const sorted = purchaseRegistrationStore.state.registrations.sort((a, b) => {
      const dateA = new Date(a.purchaseDate).getTime();
      const dateB = new Date(b.purchaseDate).getTime();
      //return dateB - dateA; // Descending order (most recent first)
      return dateA - dateB;
    });

    console.log(JSON.stringify(sorted[0]))
    return sorted
      
  });

 

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getPlatformInfo = (platform: string) => {
    return PLATFORMS.find(p => p.value === platform) || { label: platform, color: '#6c757d' };
  };

  const cardStyle = {
    padding: '1.5rem',
    'margin-bottom': '1rem'
  };

  const headerStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '1.5rem'
  };

  const summaryGridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    'margin-bottom': '2rem'
  };

  const summaryCardStyle = {
    'background-color': 'var(--surface-light)',
    padding: '1rem',
    'border-radius': 'var(--border-radius-md)',
    border: '1px solid var(--border-color)',
    'text-align': 'center' as const
  };

  const tableContainerStyle = {
    'overflow-x': 'auto',
    'margin-bottom': '1rem'
  };

  const tableStyle = {
    width: '100%',
    'border-collapse': 'collapse' as const,
    'background-color': 'var(--surface-color)'
  };

  const thStyle = {
    padding: '1rem',
    'text-align': 'left' as const,
    'border-bottom': '2px solid var(--border-color)',
    'font-weight': '600',
    color: 'var(--text-primary)',
    'background-color': 'var(--surface-light)'
  };

  const tdStyle = {
    padding: '1rem',
    'border-bottom': '1px solid var(--border-color)',
    color: 'var(--text-secondary)'
  };

  const platformTagStyle = (color: string) => ({
    'background-color': color,
    color: 'white',
    padding: '0.25rem 0.5rem',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '0.75rem',
    'font-weight': '500'
  });

  const actionButtonStyle = {
    padding: '0.25rem 0.5rem',
    'font-size': '0.75rem',
    'margin-right': '0.25rem'
  };

  return (
    <div>
      <div style={headerStyle}>
        <h1 style={{ 
          'font-size': '1.875rem', 
          'font-weight': '700',
          color: 'var(--text-primary)' 
        }}>
          Registros de Compras
        </h1>
        
        <Button 
          variant="primary" 
          onClick={() => purchaseRegistrationStore.refresh()}
          disabled={purchaseRegistrationStore.state.loading}
        >
          {purchaseRegistrationStore.state.loading ? 'Cargando...' : 'Actualizar'}
        </Button>
      </div>

      <Show when={purchaseRegistrationStore.state.error}>
        <Card style={{ 
          ...cardStyle, 
          'background-color': 'var(--error-light)',
          border: '1px solid var(--error-color)'
        }}>
          <div style={{ color: 'var(--error-color)' }}>
            {purchaseRegistrationStore.state.error}
          </div>
        </Card>
      </Show>

      {/* Summary Cards */}
      <Show when={purchaseRegistrationStore.state.summary}>
        <div style={summaryGridStyle}>
          <div style={summaryCardStyle}>
            <div style={{ 
              'font-size': '2rem', 
              'font-weight': '700', 
              color: 'var(--primary-color)',
              'margin-bottom': '0.25rem' 
            }}>
              {purchaseRegistrationStore.state.summary?.totalRegistrations || 0}
            </div>
            <div style={{ color: 'var(--text-muted)', 'font-size': '0.875rem' }}>
              Total Registros
            </div>
          </div>

          <div style={summaryCardStyle}>
            <div style={{ 
              'font-size': '2rem', 
              'font-weight': '700', 
              color: 'var(--success-color)',
              'margin-bottom': '0.25rem' 
            }}>
              {purchaseRegistrationStore.state.summary?.totalProducts || 0}
            </div>
            <div style={{ color: 'var(--text-muted)', 'font-size': '0.875rem' }}>
              Total Productos
            </div>
          </div>

          <div style={summaryCardStyle}>
            <div style={{ 
              'font-size': '1.5rem', 
              'font-weight': '700', 
              color: 'var(--info-color)',
              'margin-bottom': '0.25rem' 
            }}>
              USD {purchaseRegistrationStore.state.summary?.totalAmount?.toFixed(2) || '0.00'}
            </div>
            <div style={{ color: 'var(--text-muted)', 'font-size': '0.875rem' }}>
              Monto Total
            </div>
          </div>

          <div style={summaryCardStyle}>
            <div style={{ 
              'font-size': '1.5rem', 
              'font-weight': '700', 
              color: 'var(--primary-color)',
              'margin-bottom': '0.25rem' 
            }}>
              USD {purchaseRegistrationStore.state.summary?.netAmount?.toFixed(2) || '0.00'}
            </div>
            <div style={{ color: 'var(--text-muted)', 'font-size': '0.875rem' }}>
              Monto Neto
            </div>
          </div>
        </div>
      </Show>

      {/* Registrations Table */}
      <Card style={cardStyle}>
        <Show 
          when={!purchaseRegistrationStore.state.loading && purchaseRegistrationStore.state.registrations.length > 0}
          fallback={
            <div style={{ 
              'text-align': 'center', 
              padding: '3rem',
              color: 'var(--text-muted)' 
            }}>
              {purchaseRegistrationStore.state.loading 
                ? 'Cargando registros...' 
                : 'No hay registros de compra disponibles'
              }
            </div>
          }
        >
          <div style={tableContainerStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Número</th>
                  <th style={thStyle}>Tienda</th>
                  <th style={thStyle}>Plataforma</th>
                  <th style={thStyle}>Productos</th>
                  <th style={thStyle}>Total</th>
                  <th style={thStyle}>Bonus</th>
                  <th style={thStyle}>Neto</th>
                  <th style={thStyle}>Fecha</th>
                  <th style={thStyle}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                <For each={sortList()}>
                  {(registration) => {
                    const platformInfo = getPlatformInfo(registration.platform);
                    return (
                      <tr>
                        <td style={{ ...tdStyle, 'font-weight': '500' }}>
                          {registration.registrationNumber}
                        </td>
                        <td style={tdStyle}>
                          {registration.store}
                        </td>
                        <td style={tdStyle}>
                          <span style={platformTagStyle(platformInfo.color)}>
                            {platformInfo.label}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, 'text-align': 'center' }}>
                          {registration.totalProducts}
                        </td>
                        <td style={{ ...tdStyle, 'font-weight': '500' }}>
                          {registration.totalPrice}
                        </td>
                        <td style={{ ...tdStyle, color: 'var(--success-color)' }}>
                          {registration.bonus 
                            ? `-${registration.bonus}`
                            : '-'
                          }
                        </td>
                       
                        <td style={{ ...tdStyle, 'font-weight': '600', color: 'var(--primary-color)' }}>
                          {registration.netTotal}
                        </td>
                        <td style={tdStyle}>
                          {formatDate(registration.purchaseDate)}
                        </td>
                        <td style={tdStyle}>
                          <Show when={props.onView}>
                            <Button
                              variant="outline"
                              onClick={() => props.onView?.(registration)}
                              style={actionButtonStyle}
                            >
                              Ver
                            </Button>
                          </Show>
                          <Show when={props.onEdit && props.canEdit}>
                            <Button
                              variant="secondary"
                              onClick={() => props.onEdit?.(registration)}
                              style={actionButtonStyle}
                            >
                              Editar
                            </Button>
                          </Show>
                          <Show when={props.canDelete}>
                            <Button
                              variant="danger"
                              onClick={() => handleDelete(registration)}
                              style={actionButtonStyle}
                            >
                              Eliminar
                            </Button>
                          </Show>
                        </td>
                      </tr>
                    );
                  }}
                </For>
              </tbody>
            </table>
          </div>
        </Show>
      </Card>
    </div>
  );
};

export default PurchaseRegistrationList;