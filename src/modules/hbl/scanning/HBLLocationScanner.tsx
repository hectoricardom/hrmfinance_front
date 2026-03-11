import { Component, createSignal, Show, For, createMemo, onMount } from 'solid-js';
import { EnhancedBarcodeScanner } from '../../scanner';
import { statusAllList, updateHBLStatus, type HBLUpdateResult } from '../status/hblUpdateService';
import { parseHBLNumbers, isValidHBL } from '../data/hblParser';
import { Card } from '../../ui';
import { devLog } from '../../../services/utils';

interface HBLLocationScannerProps {
  onHBLUpdated?: (hbl: string, statusId: string, statusLabel: string) => void;
  onError?: (error: string) => void;
}

interface ScanResult {
  id: string;
  hbl: string;
  statusId: string;
  statusLabel: string;
  timestamp: number;
  success: boolean;
  error?: string;
}

const HBLLocationScanner: Component<HBLLocationScannerProps> = (props) => {
  // State signals
  const [isScannerOpen, setIsScannerOpen] = createSignal(false);
  const [selectedStatusId, setSelectedStatusId] = createSignal<string>('');
  const [scanResults, setScanResults] = createSignal<ScanResult[]>([]);
  const [isUpdating, setIsUpdating] = createSignal(false);
  const [notifications, setNotifications] = createSignal<string[]>([]);
  const [selectedHBL, setSelectedHBL] = createSignal<string>('');

  // Get available locations (status list)
  const availableLocations = createMemo(() => {
    // Filter out the final "Entregado" status as it's not a physical location
    return statusAllList.filter(status => status.id !== 'YABA_99');
  });

  // Get selected status details
  const selectedStatus = createMemo(() => {
    return statusAllList.find(status => status.id === selectedStatusId());
  });

  // Add notification with auto-remove
  const addNotification = (message: string) => {
    setNotifications(prev => [message, ...prev.slice(0, 4)]);
    setTimeout(() => {
      setNotifications(prev => prev.slice(0, -1));
    }, 5000);
  };

  // Handle scan completion
  const handleScanComplete = async (scannedCode: string) => {
    devLog('HBL scan completed:', scannedCode);
    
    if (!selectedStatusId()) {
      addNotification('❌ Por favor selecciona una ubicación primero');
      return;
    }

    if (!isValidHBL(scannedCode)) {
      addNotification(`❌ Formato HBL inválido: ${scannedCode}`);
      return;
    }

    setSelectedHBL(scannedCode);
    await updateHBLLocation(scannedCode);
  };

  // Update HBL location
  const updateHBLLocation = async (hbl: string) => {
    if (!selectedStatusId()) {
      addNotification('❌ Ninguna ubicación seleccionada');
      return;
    }

    setIsUpdating(true);
    
    try {
      const result: HBLUpdateResult = await updateHBLStatus(
        hbl,
        selectedStatusId(),
        `Updated via scanner to ${selectedStatus()?.label} at ${new Date().toLocaleString()}`
      );

      const scanResult: ScanResult = {
        id: Date.now().toString(),
        hbl: hbl,
        statusId: selectedStatusId(),
        statusLabel: selectedStatus()?.label || 'Unknown',
        timestamp: Date.now(),
        success: result.success,
        error: result.error
      };

      setScanResults(prev => [scanResult, ...prev.slice(0, 19)]); // Keep only last 20

      if (result.success) {
        addNotification(`✅ ${hbl} actualizado a ${selectedStatus()?.label}`);
        
        // Call parent callback
        if (props.onHBLUpdated) {
          props.onHBLUpdated(hbl, selectedStatusId(), selectedStatus()?.label || '');
        }
      } else {
        addNotification(`❌ Error al actualizar ${hbl}: ${result.error}`);
        
        // Call parent error callback
        if (props.onError) {
          props.onError(`Error al actualizar ${hbl}: ${result.error}`);
        }
      }
    } catch (error) {
      devLog('Error updating HBL location:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addNotification(`❌ Error al actualizar ${hbl}: ${errorMessage}`);
      
      if (props.onError) {
        props.onError(errorMessage);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle scanner errors
  const handleScannerError = (error: string) => {
    devLog('Scanner error:', error);
    addNotification(`❌ Scanner error: ${error}`);
    
    if (props.onError) {
      props.onError(error);
    }
  };

  // Format date for display
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  // Styles
  const containerStyle = {
    padding: '1.5rem',
    'max-width': '800px',
    margin: '0 auto'
  };

  const sectionStyle = {
    'margin-bottom': '2rem',
    padding: '1.5rem',
    border: '1px solid #ddd',
    'border-radius': '8px',
    'background-color': '#f8f9fa'
  };

  const locationGridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '0.5rem',
    'margin-top': '1rem'
  };

  const locationButtonStyle = (isSelected: boolean) => ({
    padding: '0.75rem',
    border: '1px solid #ddd',
    'border-radius': '6px',
    cursor: 'pointer',
    'background-color': isSelected ? '#007bff' : 'white',
    color: isSelected ? 'white' : '#333',
    'text-align': 'left' as const,
    transition: 'all 0.2s ease',
    'font-size': '0.9rem'
  });

  const scanButtonStyle = {
    padding: '1rem 2rem',
    'background-color': selectedStatusId() ? '#28a745' : '#6c757d',
    color: 'white',
    border: 'none',
    'border-radius': '8px',
    cursor: selectedStatusId() ? 'pointer' : 'not-allowed',
    'font-size': '1.1rem',
    'font-weight': '500',
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    margin: '0 auto'
  };

  const notificationStyle = (index: number) => ({
    padding: '0.75rem',
    'margin-bottom': '0.5rem',
    'background-color': '#d4edda',
    color: '#155724',
    border: '1px solid #c3e6cb',
    'border-radius': '6px',
    opacity: 1 - (index * 0.15),
    transition: 'all 0.3s ease'
  });

  const resultItemStyle = (success: boolean) => ({
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '0.75rem',
    'margin-bottom': '0.5rem',
    'background-color': success ? '#d4edda' : '#f8d7da',
    border: `1px solid ${success ? '#c3e6cb' : '#f5c6cb'}`,
    'border-radius': '6px'
  });

  const statusBadgeStyle = {
    padding: '0.25rem 0.5rem',
    'background-color': '#007bff',
    color: 'white',
    'border-radius': '12px',
    'font-size': '0.8rem'
  };

  return (
    <div style={containerStyle}>
      {/* Page Header */}
      <div style={{ 'text-align': 'center', 'margin-bottom': '2rem' }}>
        <h1 style={{ 'font-size': '2rem', margin: '0 0 0.5rem 0' }}>
          📦 Escáner de Ubicación HBL
        </h1>
        <p style={{ 'font-size': '1.1rem', color: '#666', margin: '0' }}>
          Selecciona una ubicación y escanea códigos de barras HBL para actualizar su estado
        </p>
      </div>

      {/* Notifications */}
      <Show when={notifications().length > 0}>
        <div style={{ 'margin-bottom': '2rem' }}>
          <For each={notifications()}>
            {(notification, index) => (
              <div style={notificationStyle(index())}>
                {notification}
              </div>
            )}
          </For>
        </div>
      </Show>

      {/* Location Selection */}
      <Card>
        <div style={sectionStyle}>
          <h2 style={{ margin: '0 0 1rem 0', color: '#333' }}>
            📍 Paso 1: Seleccionar Ubicación
          </h2>
          <p style={{ margin: '0 0 1rem 0', color: '#666' }}>
            Elige la ubicación donde se actualizarán los HBL escaneados:
          </p>
          
          <div style={locationGridStyle}>
            <For each={availableLocations()}>
              {(location) => (
                <button
                  style={locationButtonStyle(selectedStatusId() === location.id)}
                  onClick={() => setSelectedStatusId(location.id)}
                >
                  <div style={{ 'font-weight': '500' }}>
                    {location.label}
                  </div>
                  <div style={{ 'font-size': '0.8rem', opacity: '0.8', 'margin-top': '0.25rem' }}>
                    ID: {location.id}
                  </div>
                </button>
              )}
            </For>
          </div>

          <Show when={selectedStatusId()}>
            <div style={{
              'margin-top': '1rem',
              padding: '1rem',
              'background-color': '#e8f5e8',
              border: '1px solid #c3e6cb',
              'border-radius': '6px'
            }}>
              <strong>Ubicación Seleccionada:</strong> {selectedStatus()?.label}
              <div style={{ 'margin-top': '0.5rem', 'font-size': '0.9rem', color: '#666' }}>
                ID de Estado: {selectedStatusId()}
              </div>
            </div>
          </Show>
        </div>
      </Card>

      {/* Scanner Section */}
      <Card>
        <div style={sectionStyle}>
          <h2 style={{ margin: '0 0 1rem 0', color: '#333' }}>
            📷 Paso 2: Escanear Códigos de Barras HBL
          </h2>
          <p style={{ margin: '0 0 1rem 0', color: '#666' }}>
            Después de seleccionar una ubicación, escanea códigos de barras HBL para actualizar su ubicación:
          </p>

          <div style={{ 'text-align': 'center' }}>
            <button
              style={scanButtonStyle}
              onClick={() => setIsScannerOpen(true)}
              disabled={!selectedStatusId() || isUpdating()}
            >
              <span style={{ 'font-size': '1.5em' }}>📷</span>
              {isUpdating() ? 'Actualizando...' : 'Iniciar Escáner HBL'}
            </button>
          </div>

          <Show when={!selectedStatusId()}>
            <div style={{
              'text-align': 'center',
              'margin-top': '1rem',
              color: '#666',
              'font-style': 'italic'
            }}>
              Por favor selecciona una ubicación primero para habilitar el escáner
            </div>
          </Show>
        </div>
      </Card>

      {/* Scan Results */}
      <Show when={scanResults().length > 0}>
        <Card>
          <div style={sectionStyle}>
            <h2 style={{ margin: '0 0 1rem 0', color: '#333' }}>
              📊 Actualizaciones Recientes ({scanResults().length})
            </h2>
            
            <div style={{ 'max-height': '400px', 'overflow-y': 'auto' }}>
              <For each={scanResults()}>
                {(result) => (
                  <div style={resultItemStyle(result.success)}>
                    <div>
                      <div style={{ 'font-weight': '500', 'font-family': 'monospace' }}>
                        HBL: {result.hbl}
                      </div>
                      <div style={{ 'font-size': '0.9rem', 'margin-top': '0.25rem' }}>
                        <span style={statusBadgeStyle}>
                          {result.statusLabel}
                        </span>
                        {result.error && (
                          <div style={{ color: '#721c24', 'margin-top': '0.25rem' }}>
                            Error: {result.error}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ 'font-size': '0.8rem', color: '#666', 'text-align': 'right' }}>
                      {formatDate(result.timestamp)}
                      <div style={{ 'margin-top': '0.25rem' }}>
                        {result.success ? '✅ Exitoso' : '❌ Fallido'}
                      </div>
                    </div>
                  </div>
                )}
              </For>
            </div>

            {/* Summary Stats */}
            <div style={{
              'margin-top': '1rem',
              'padding-top': '1rem',
              'border-top': '1px solid #ddd',
              display: 'grid',
              'grid-template-columns': 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '1rem',
              'text-align': 'center'
            }}>
              <div>
                <div style={{ 'font-size': '1.5rem', 'font-weight': '600', color: '#007bff' }}>
                  {scanResults().length}
                </div>
                <div style={{ 'font-size': '0.9rem', color: '#666' }}>Total Escaneados</div>
              </div>
              <div>
                <div style={{ 'font-size': '1.5rem', 'font-weight': '600', color: '#28a745' }}>
                  {scanResults().filter(r => r.success).length}
                </div>
                <div style={{ 'font-size': '0.9rem', color: '#666' }}>Exitosos</div>
              </div>
              <div>
                <div style={{ 'font-size': '1.5rem', 'font-weight': '600', color: '#dc3545' }}>
                  {scanResults().filter(r => !r.success).length}
                </div>
                <div style={{ 'font-size': '0.9rem', color: '#666' }}>Fallidos</div>
              </div>
            </div>
          </div>
        </Card>
      </Show>

      {/* Instructions */}
      <Card>
        <div style={{
          padding: '1.5rem',
          'background-color': '#fff3cd',
          border: '1px solid #ffeaa7',
          'border-radius': '8px'
        }}>
          <h3 style={{ margin: '0 0 1rem 0' }}>📋 Cómo Usar</h3>
          <ol style={{ 'margin': '0', 'padding-left': '1.5rem' }}>
            <li style={{ 'margin-bottom': '0.5rem' }}>
              <strong>Seleccionar Ubicación:</strong> Elige la ubicación de destino donde se actualizarán los HBL
            </li>
            <li style={{ 'margin-bottom': '0.5rem' }}>
              <strong>Iniciar Escáner:</strong> Haz clic en "Iniciar Escáner HBL" para abrir la cámara
            </li>
            <li style={{ 'margin-bottom': '0.5rem' }}>
              <strong>Escanear HBL:</strong> Posiciona los códigos de barras HBL dentro del marco verde para escanear
            </li>
            <li style={{ 'margin-bottom': '0.5rem' }}>
              <strong>Actualización Automática:</strong> Cada HBL escaneado se actualizará automáticamente a la ubicación seleccionada
            </li>
            <li>
              <strong>Monitorear Resultados:</strong> Ve las actualizaciones exitosas y cualquier error en la sección de resultados
            </li>
          </ol>
          
          <div style={{ 
            'margin-top': '1rem', 
            'padding-top': '1rem', 
            'border-top': '1px solid #ffd32a'
          }}>
            <strong>💡 Consejos:</strong>
            <ul style={{ 'margin': '0.5rem 0 0 0', 'padding-left': '1.25rem' }}>
              <li>Los números HBL deben estar en formato: 230XXXXXX</li>
              <li>Asegura buena iluminación para el escaneo óptimo de códigos de barras</li>
              <li>El escáner se cerrará automáticamente después de cada escaneo exitoso</li>
              <li>Puedes escanear múltiples HBL sin cambiar la ubicación</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Enhanced Barcode Scanner Modal */}
      <EnhancedBarcodeScanner
        isOpen={isScannerOpen()}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScanComplete}
        onError={handleScannerError}
        autoLookupLocation={false}
        showHistory={false}
      />
    </div>
  );
};

export default HBLLocationScanner;