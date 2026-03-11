import { Component, createSignal, For, Show } from 'solid-js';
import { Modal, Button, FormInput } from '../../ui';
import { useTranslation } from '../../../translations';
import { 
  PurchaseRequest, 
  PurchaseRequestStatus, 
  StatusHistory,
  PURCHASE_REQUEST_STATUSES 
} from '../types/purchaseRequestTypes';

interface PurchaseRequestStatusProps {
  isOpen: boolean;
  onClose: () => void;
  request: PurchaseRequest | null;
  onStatusUpdate: (requestId: string, newStatus: PurchaseRequestStatus, notes?: string) => Promise<void>;
  onWeightUpdate: (requestId: string, weight: number, deliveryCost: number) => Promise<void>;
  isLoading?: boolean;
}

const PurchaseRequestStatusManager: Component<PurchaseRequestStatusProps> = (props) => {
  const { t } = useTranslation();
  
  const [selectedStatus, setSelectedStatus] = createSignal<PurchaseRequestStatus>('pending');
  const [statusNotes, setStatusNotes] = createSignal('');
  const [weight, setWeight] = createSignal(0);
  const [deliveryCost, setDeliveryCost] = createSignal(0);
  const [showWeightUpdate, setShowWeightUpdate] = createSignal(false);
  
  // Initialize with current status when modal opens
  const initializeStatus = () => {
    if (props.request) {
      setSelectedStatus(props.request.status);
      setWeight(props.request.weight || 0);
      setDeliveryCost(props.request.deliveryCost || 0);
    }
  };
  
  // Auto-calculate delivery cost based on weight
  const calculateDeliveryCost = (weightKg: number) => {
    const baseRate = 5; // $5 per kg
    const minimumCost = 10; // Minimum $10
    return Math.max(weightKg * baseRate, minimumCost);
  };
  
  const handleWeightChange = (newWeight: number) => {
    setWeight(newWeight);
    setDeliveryCost(calculateDeliveryCost(newWeight));
  };
  
  const handleStatusUpdate = async () => {
    if (!props.request) return;
    
    try {
      await props.onStatusUpdate(props.request.id, selectedStatus(), statusNotes());
      setStatusNotes('');
      props.onClose();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };
  
  const handleWeightUpdate = async () => {
    if (!props.request) return;
    
    try {
      await props.onWeightUpdate(props.request.id, weight(), deliveryCost());
      setShowWeightUpdate(false);
      props.onClose();
    } catch (error) {
      console.error('Error updating weight:', error);
    }
  };
  
  const getStatusColor = (status: PurchaseRequestStatus) => {
    const statusConfig = PURCHASE_REQUEST_STATUSES.find(s => s.value === status);
    return statusConfig?.color || '#6c757d';
  };
  
  const getStatusLabel = (status: PurchaseRequestStatus) => {
    const statusConfig = PURCHASE_REQUEST_STATUSES.find(s => s.value === status);
    return statusConfig?.label || status;
  };
  
  const formatDateTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Initialize when modal opens
  if (props.isOpen && props.request) {
    initializeStatus();
  }
  
  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      title={`Gestionar Estado - ${props.request?.requestNumber}`}
      size="large"
    >
      <Show when={props.request}>
        {(request) => (
          <div style={{ 
            display: 'grid',
            'grid-template-columns': '1fr 1fr',
            gap: '2rem',
            'max-height': '70vh',
            overflow: 'auto'
          }}>
            
            {/* Status Update Section */}
            <div>
              <h3 style={{ 'margin-bottom': '1rem', color: 'var(--primary-color)' }}>
                Actualizar Estado
              </h3>
              
              <div style={{ 'margin-bottom': '1rem' }}>
                <div style={{ 
                  display: 'flex',
                  'align-items': 'center',
                  gap: '0.5rem',
                  'margin-bottom': '1rem'
                }}>
                  <span style={{ 'font-weight': '500' }}>Estado Actual:</span>
                  <div style={{
                    display: 'inline-block',
                    padding: '0.25rem 0.75rem',
                    'border-radius': 'var(--border-radius-sm)',
                    'font-size': '0.875rem',
                    'font-weight': '500',
                    color: 'white',
                    'background-color': getStatusColor(request().status)
                  }}>
                    {getStatusLabel(request().status)}
                  </div>
                </div>
              </div>
              
              <div style={{ 'margin-bottom': '1rem' }}>
                <label style={{ 
                  display: 'block', 
                  'margin-bottom': '0.5rem', 
                  'font-weight': '500' 
                }}>
                  Nuevo Estado
                </label>
                <select
                  value={selectedStatus()}
                  onChange={(e) => setSelectedStatus(e.currentTarget.value as PurchaseRequestStatus)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border-color)',
                    'border-radius': 'var(--border-radius)',
                    background: 'var(--surface-color)'
                  }}
                >
                  <For each={PURCHASE_REQUEST_STATUSES}>
                    {(status) => (
                      <option value={status.value}>{status.label}</option>
                    )}
                  </For>
                </select>
              </div>
              
              <div style={{ 'margin-bottom': '1rem' }}>
                <label style={{ 
                  display: 'block', 
                  'margin-bottom': '0.5rem', 
                  'font-weight': '500' 
                }}>
                  Notas del Cambio
                </label>
                <textarea
                  value={statusNotes()}
                  onInput={(e) => setStatusNotes(e.currentTarget.value)}
                  placeholder="Describe el cambio o agrega notas adicionales..."
                  style={{
                    width: '100%',
                    'min-height': '100px',
                    padding: '0.75rem',
                    border: '1px solid var(--border-color)',
                    'border-radius': 'var(--border-radius)',
                    'font-family': 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>
              
              <Button 
                variant="primary" 
                onClick={handleStatusUpdate}
                disabled={props.isLoading || selectedStatus() === request().status}
                style={{ width: '100%', 'margin-bottom': '1rem' }}
              >
                {props.isLoading ? 'Actualizando...' : 'Actualizar Estado'}
              </Button>
              
              <div style={{ 
                'border-top': '1px solid var(--border-color)', 
                'padding-top': '1rem' 
              }}>
                <h4 style={{ 'margin-bottom': '0.5rem' }}>Gestión de Peso y Envío</h4>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowWeightUpdate(!showWeightUpdate())}
                  style={{ width: '100%' }}
                >
                  {showWeightUpdate() ? 'Ocultar' : 'Actualizar'} Peso y Costo de Envío
                </Button>
                
                <Show when={showWeightUpdate()}>
                  <div style={{ 'margin-top': '1rem' }}>
                    <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '1rem', 'margin-bottom': '1rem' }}>
                      <FormInput
                        label="Peso (kg)"
                        type="number"
                        step="0.1"
                        min="0"
                        value={weight().toString()}
                        onChange={(value) => handleWeightChange(parseFloat(value) || 0)}
                      />
                      
                      <FormInput
                        label="Costo de Envío"
                        type="number"
                        step="0.01"
                        min="0"
                        value={deliveryCost().toString()}
                        onChange={(value) => setDeliveryCost(parseFloat(value) || 0)}
                      />
                    </div>
                    
                    <div style={{ 
                      background: 'var(--info-background)', 
                      padding: '0.75rem', 
                      'border-radius': 'var(--border-radius-sm)',
                      'margin-bottom': '1rem'
                    }}>
                      <div style={{ 'font-size': '0.875rem', color: 'var(--info-color)' }}>
                        💡 Cálculo automático: $5 por kg (mínimo $10)
                      </div>
                    </div>
                    
                    <Button 
                      variant="success" 
                      onClick={handleWeightUpdate}
                      disabled={props.isLoading}
                      style={{ width: '100%' }}
                    >
                      {props.isLoading ? 'Guardando...' : 'Guardar Peso y Costo'}
                    </Button>
                  </div>
                </Show>
              </div>
            </div>
            
            {/* Status History Section */}
            <div>
              <h3 style={{ 'margin-bottom': '1rem', color: 'var(--primary-color)' }}>
                Historial de Estados
              </h3>
              
              <div style={{ 'max-height': '500px', overflow: 'auto' }}>
                <For each={request().statusHistory || []} fallback={
                  <div style={{ 
                    'text-align': 'center', 
                    color: 'var(--text-muted)',
                    padding: '2rem'
                  }}>
                    No hay historial de cambios disponible
                  </div>
                }>
                  {(historyItem, index) => (
                    <div style={{
                      display: 'flex',
                      gap: '1rem',
                      'margin-bottom': '1rem',
                      'padding-bottom': '1rem',
                      'border-bottom': index() === request().statusHistory!.length - 1 ? 'none' : '1px solid var(--border-color)'
                    }}>
                      <div style={{
                        display: 'flex',
                        'flex-direction': 'column',
                        'align-items': 'center',
                        'min-width': '20px'
                      }}>
                        <div style={{
                          width: '12px',
                          height: '12px',
                          'border-radius': '50%',
                          'background-color': getStatusColor(historyItem.status)
                        }}></div>
                        <Show when={index() !== request().statusHistory!.length - 1}>
                          <div style={{
                            width: '2px',
                            height: '30px',
                            'background-color': 'var(--border-color)',
                            'margin-top': '0.5rem'
                          }}></div>
                        </Show>
                      </div>
                      
                      <div style={{ flex: '1' }}>
                        <div style={{
                          display: 'inline-block',
                          padding: '0.125rem 0.5rem',
                          'border-radius': 'var(--border-radius-sm)',
                          'font-size': '0.75rem',
                          'font-weight': '500',
                          color: 'white',
                          'background-color': getStatusColor(historyItem.status),
                          'margin-bottom': '0.25rem'
                        }}>
                          {getStatusLabel(historyItem.status)}
                        </div>
                        
                        <div style={{ 
                          'font-size': '0.75rem',
                          color: 'var(--text-muted)',
                          'margin-bottom': '0.25rem'
                        }}>
                          {formatDateTime(historyItem.timestamp)} • {historyItem.updatedBy}
                          <Show when={historyItem.location}>
                            <span> • 📍 {historyItem.location}</span>
                          </Show>
                        </div>
                        
                        <Show when={historyItem.notes}>
                          <div style={{ 
                            'font-size': '0.875rem',
                            'line-height': '1.4'
                          }}>
                            {historyItem.notes}
                          </div>
                        </Show>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </div>
        )}
      </Show>
      
      <div style={{ 
        display: 'flex', 
        'justify-content': 'flex-end', 
        gap: '1rem', 
        'margin-top': '2rem',
        'border-top': '1px solid var(--border-color)',
        'padding-top': '1rem'
      }}>
        <Button variant="outline" onClick={props.onClose}>
          Cerrar
        </Button>
      </div>
    </Modal>
  );
};

export default PurchaseRequestStatusManager;