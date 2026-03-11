import { Component, createSignal, createMemo, onMount, Show, For } from 'solid-js';
import { Card, Button, FormInput, FormSelect } from '../../ui';
import { devLog } from '../../../services/utils';
import { 
  SavedPassportApplication
} from '../services/cubanPassportApiService';
import cubanPassportApiService from '../services/cubanPassportApiService';
import { useTranslation } from '../../../translations';
import { authStore } from '../../../stores/authStore';
import CubanPassportView from './CubanPassportView';
import { useModal } from '../../../contexts/ModalContext';
import Icon from '../../../components/Icon';
import { useNavigate } from '@solidjs/router';

interface PassportApplicationsListProps {
  onSelectApplication?: (application: SavedPassportApplication) => void;
  onEditApplication?: (application: SavedPassportApplication) => void;
  showActions?: boolean;
}

const PassportApplicationsList: Component<PassportApplicationsListProps> = (props) => {
  const { t } = useTranslation();
  const { showModal, hideModal } = useModal();
  const navigate = useNavigate();
  const [applications, setApplications] = createSignal<SavedPassportApplication[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [stats, setStats] = createSignal({
    draft: 0,
    submitted: 0,
    processing: 0,
    completed: 0,
    rejected: 0,
    total: 0
  });
  
  // Filters
  const [statusFilter, setStatusFilter] = createSignal<'all' | 'draft' | 'submitted' | 'processing' | 'completed' | 'rejected'>('all');
  const [searchTerm, setSearchTerm] = createSignal('');
  const [dateFrom, setDateFrom] = createSignal('');
  const [dateTo, setDateTo] = createSignal('');
  const [storeFilter, setStoreFilter] = createSignal('all');
  
  // Pagination
  const [hasMore, setHasMore] = createSignal(false);
  const [lastDoc, setLastDoc] = createSignal<any>(null);
  
  // Load data on mount
  onMount(() => {
    loadApplications();
    loadStats();
  });
  
  // Load applications with filters
  const loadApplications = async (reset = true) => {
    try {
      setLoading(true);
      setError(null);
      devLog(storeFilter())

      if(storeFilter() !== "all"){
        const result = await cubanPassportApiService.getPassportApplications(
          storeFilter() + " "+ (searchTerm().trim() || "")
        );
         setApplications(result);
      }
      else{
         setApplications([])
      }
     
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load applications';
      setError(errorMessage);
      devLog('Error loading applications:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Load statistics
  const loadStats = async () => {
    try {
      const applicationStats = await cubanPassportApiService.getApplicationStats();
      setStats(applicationStats);
    } catch (err) {
      devLog('Error loading stats:', err);
    }
  };
  
  // Sort applications by creation date (newest first)
  const sortedApplications = createMemo(() => {
    return applications().sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });
  });

  // Handle filter changes
  const handleFiltersChange = () => {
    loadApplications(true);
  };
  
  // Handle viewing application details
  const handleViewApplication = (application: SavedPassportApplication) => {
    
    showModal({
      title: 'Detalles de Solicitud de Pasaporte',
      size: 'xl',
      children: (
        <CubanPassportView
          data={application.applicationData}
          application={application}
          onEdit={() => {
            hideModal();
            props.onEditApplication?.(application);
          }}
          navigateTo={navigate}
          onClose={hideModal}
        />
      )
    });
  };
  
  // Handle application deletion
  const handleDelete = async (applicationId: string) => {
    if (!confirm('¿Está seguro que desea eliminar esta solicitud? Esta acción no se puede deshacer.')) {
      return;
    }
    
    try {
      await cubanPassportApiService.deletePassportApplication(applicationId);
      setApplications(prev => prev.filter(app => app.id !== applicationId));
      await loadStats(); // Refresh stats
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete application';
      alert(`Error: ${errorMessage}`);
    }
  };
  
  // Format date
  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    
    try {
      const dateObj = date.toDate ? date.toDate() : new Date(date);
      return dateObj.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };
  
  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'var(--text-muted)';
      case 'submitted': return 'var(--warning-color)';
      case 'processing': return 'var(--primary-color)';
      case 'completed': return 'var(--success-color)';
      case 'rejected': return 'var(--error-color)';
      default: return 'var(--text-muted)';
    }
  };
  
  // Get status label
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Borrador';
      case 'submitted': return 'Enviado';
      case 'processing': return 'En Proceso';
      case 'completed': return 'Completado';
      case 'rejected': return 'Rechazado';
      default: return status;
    }
  };
  
  // Styles
  const statsGridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '1rem',
    'margin-bottom': '2rem'
  };
  
  const statCardStyle = {
    padding: '1rem',
    background: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius)',
    'text-align': 'center' as const
  };
  
  const filtersGridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    'margin-bottom': '1.5rem'
  };
  
  const applicationCardStyle = {
    padding: '1.5rem',
    background: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius)',
    'margin-bottom': '1rem',
    cursor: props.onSelectApplication ? 'pointer' : 'default',
    transition: 'all 0.2s'
  };
  
  return (
    <div>
      <h2 style={{
        'font-size': '1.5rem',
        'font-weight': '700',
        'margin-bottom': '1.5rem',
        color: 'var(--text-primary)'
      }}>
        Solicitudes de Pasaporte Guardadas
      </h2>
      
      {/* Statistics */}
      <div style={statsGridStyle}>
        <div style={statCardStyle}>
          <div style={{ 'font-size': '2rem', 'font-weight': '700', color: 'var(--primary-color)' }}>
            {stats().total}
          </div>
          <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
            Total
          </div>
        </div>
        <div style={statCardStyle}>
          <div style={{ 'font-size': '2rem', 'font-weight': '700', color: getStatusColor('draft') }}>
            {stats().draft}
          </div>
          <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
            Borradores
          </div>
        </div>
        <div style={statCardStyle}>
          <div style={{ 'font-size': '2rem', 'font-weight': '700', color: getStatusColor('submitted') }}>
            {stats().submitted}
          </div>
          <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
            Enviados
          </div>
        </div>
        <div style={statCardStyle}>
          <div style={{ 'font-size': '2rem', 'font-weight': '700', color: getStatusColor('processing') }}>
            {stats().processing}
          </div>
          <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
            En Proceso
          </div>
        </div>
        <div style={statCardStyle}>
          <div style={{ 'font-size': '2rem', 'font-weight': '700', color: getStatusColor('completed') }}>
            {stats().completed}
          </div>
          <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
            Completados
          </div>
        </div>
      </div>
      
      {/* Filters */}
      <Card title="Filtros de Búsqueda">
        <div style={filtersGridStyle}>
          <FormSelect
            label="Estado"
            value={statusFilter()}
            onChange={(value) => {
              setStatusFilter(value as any);
              handleFiltersChange();
            }}
            options={[
              { value: 'all', label: 'Todos los Estados' },
              { value: 'draft', label: 'Borradores' },
              { value: 'submitted', label: 'Enviados' },
              { value: 'processing', label: 'En Proceso' },
              { value: 'completed', label: 'Completados' },
              { value: 'rejected', label: 'Rechazados' }
            ]}
          />
          
          <FormSelect
            label="Tienda"
            value={storeFilter()}
            onChange={(value) => {
              setStoreFilter(value);
              handleFiltersChange();
            }}
            options={[
              { value: 'all', label: 'Todas las Tiendas' },
              ...authStore.allowedStores.map(store => ({
                value: store.id,
                label: store.name
              }))
            ]}
          />
          
          <FormInput
            label="Buscar"
            value={searchTerm()}
            onChange={(value) => {
              setSearchTerm(value);
              // Debounce search
              setTimeout(() => handleFiltersChange(), 500);
            }}
            placeholder="Nombre, apellido, email..."
          />
          
          <FormInput
            label="Desde"
            type="date"
            value={dateFrom()}
            onChange={(value) => {
              setDateFrom(value);
              handleFiltersChange();
            }}
          />
          
          <FormInput
            label="Hasta" 
            type="date"
            value={dateTo()}
            onChange={(value) => {
              setDateTo(value);
              handleFiltersChange();
            }}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', 'justify-content': 'flex-end' }}>
          <Button
            onClick={() => {
              setStatusFilter('all');
              setSearchTerm('');
              setDateFrom('');
              setDateTo('');
              setStoreFilter('all');
              handleFiltersChange();
            }}
            variant="secondary"
            size="sm"
          >
            Limpiar Filtros
          </Button>
          
          <Button
            onClick={() => handleFiltersChange()}
            variant="primary"
            size="sm"
          >
            Actualizar
          </Button>
        </div>
      </Card>
      
      {/* Error Display */}
      <Show when={error()}>
        <div style={{
          padding: '1rem',
          background: 'var(--error-light)',
          color: 'var(--error-dark)',
          border: '1px solid var(--error-color)',
          'border-radius': 'var(--border-radius)',
          'margin-bottom': '1rem'
        }}>
          <strong>Error:</strong> {error()}
        </div>
      </Show>
      
      {/* Loading State */}
      <Show when={loading() && applications()?.length === 0}>
        <div style={{
          'text-align': 'center',
          padding: '3rem',
          color: 'var(--text-muted)'
        }}>
          <div style={{
            display: 'inline-block',
            width: '32px',
            height: '32px',
            border: '3px solid var(--primary-color)',
            'border-top-color': 'transparent',
            'border-radius': '50%',
            animation: 'spin 0.8s linear infinite',
            'margin-bottom': '1rem'
          }} />
          <p>Cargando solicitudes...</p>
        </div>
      </Show>
      
      {/* Applications List */}
      <Show when={!loading() || applications()?.length > 0}>
        <Show 
          when={applications()?.length > 0}
          fallback={
            <div style={{
              'text-align': 'center',
              padding: '3rem',
              color: 'var(--text-muted)'
            }}>
              <p style={{ 'font-size': '1.125rem', 'margin-bottom': '1rem' }}>
                📋 No hay solicitudes guardadas
              </p>
              <p>
                Las solicitudes que guarde aparecerán aquí para poder verlas y editarlas más tarde.
              </p>
            </div>
          }
        >
          <For each={sortedApplications()}>
            {(application) => (
              <div
                style={{
                  ...applicationCardStyle,
                  ':hover': props.onSelectApplication ? {
                    'border-color': 'var(--primary-color)',
                    'box-shadow': '0 2px 8px rgba(0,0,0,0.1)'
                  } : {}
                }}
                onClick={() =>  handleViewApplication(application)}
              >
                <div style={{
                  display: 'grid',
                  'grid-template-columns': '1fr auto',
                  'align-items': 'start',
                  gap: '1rem'
                }}>
                  <div>
                    <h3 style={{
                      'font-size': '1.125rem',
                      'font-weight': '600',
                      'margin-bottom': '0.5rem',
                      color: 'var(--text-primary)'
                    }}>
                      {application.applicationData.primerNombre} {application.applicationData.primerApellido} {application.applicationData.segundoApellido}
                    </h3>
                    
                    <div style={{
                      display: 'grid',
                      'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '0.5rem',
                      'font-size': '0.875rem',
                      color: 'var(--text-muted)'
                    }}>
                      <div><strong>Pasaporte:</strong> {application.applicationData?.pasaporteAnterior?.numero}</div>
                      <div><strong>Teléfono:</strong> {application.applicationData.telefono}</div>
                      <div><strong>Creado:</strong> {formatDate(application.createdAt)}</div>
                      <div><strong>Actualizado:</strong> {formatDate(application.updatedAt)}</div>
                      <Show when={application.applicationNumber}>
                        <div><strong>Número:</strong> {application.applicationNumber}</div>
                      </Show>
                      <Show when={application.storeName || application.storeId}>
                        <div><strong>Tienda:</strong> {application.storeName || authStore.allowedStores.find(s => s.id === application.storeId)?.name || application.storeId}</div>
                      </Show>
                    </div>
                    
                    <Show when={application.processingNotes}>
                      <div style={{
                        'margin-top': '0.75rem',
                        padding: '0.75rem',
                        background: 'var(--gray-50)',
                        'border-radius': 'var(--border-radius-sm)',
                        'font-size': '0.875rem'
                      }}>
                        <strong>Notas:</strong> {application.processingNotes}
                      </div>
                    </Show>
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    'flex-direction': 'column',
                    'align-items': 'flex-end',
                    gap: '0.75rem'
                  }}>
                    <div style={{
                      padding: '0.5rem 1rem',
                      background: getStatusColor(application.status),
                      color: 'white',
                      'border-radius': 'var(--border-radius-sm)',
                      'font-size': '0.875rem',
                      'font-weight': '500'
                    }}>
                      {getStatusLabel(application.status)}
                    </div>
                    
                    <Show when={props.showActions !== false}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        
                        
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewApplication(application);
                          }}
                          variant="primary"
                          size="sm"
                        >
                          <Icon name="eye" size="0.875rem" style={{ 'margin-right': '0.25rem' }} />
                          Ver
                        </Button>
                         <Show when={authStore.isOwner(application?.createdBy) || authStore.isAdmin()}>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(application.id);
                              }}
                              variant="danger"
                              size="sm"
                            >
                              Eliminar
                            </Button>
                        </Show>
                      </div>
                    </Show>
                  </div>
                </div>
              </div>
            )}
          </For>
          
          {/* Load More Button */}
          <Show when={hasMore()}>
            <div style={{ 'text-align': 'center', 'margin-top': '2rem' }}>
              <Button
                onClick={() => loadApplications(false)}
                variant="secondary"
                disabled={loading()}
              >
                <Show when={loading()} fallback="Cargar Más">
                  Cargando...
                </Show>
              </Button>
            </div>
          </Show>
        </Show>
      </Show>
      
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default PassportApplicationsList;