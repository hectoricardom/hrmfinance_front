import { Component, createSignal, Show, For, createMemo } from 'solid-js';
import { EnhancedBarcodeScanner } from '../../scanner';
import { statusAllList, updateHBLStatus, type HBLUpdateResult, updateHBLStatusBulk } from '../status/hblUpdateService';
import { isValidHBL } from '../data/hblParser';
import { Card } from '../../ui';
import { devLog } from '../../../services/utils';

// Simple debug logging for development
const debugLog = (message: string, data?: any) => {
  if (import.meta.env.DEV) {
    devLog(`🔧 [HBL Debug] ${message}`, data);
  }
};

interface HBLContinuousScannerProps {
  onHBLListUpdated?: (hbls: string[], statusId: string, statusLabel: string, results: any) => void;
  onError?: (error: string) => void;
}

interface ScannedHBL {
  id: string;
  hbl: string;
  timestamp: number;
  isValid: boolean;
  error?: string;
}

const HBLContinuousScanner: Component<HBLContinuousScannerProps> = (props) => {

  // Mobile-first state management with DevTools tracking
  const [isScannerOpen, setIsScannerOpen] = createSignal(false);
  const [selectedStatusId, setSelectedStatusId] = createSignal<string>('');
  const [scannedHBLs, setScannedHBLs] = createSignal<ScannedHBL[]>([]);
  const [isUpdating, setIsUpdating] = createSignal(false);
  const [notifications, setNotifications] = createSignal<string[]>([]);
  const [continuousMode, setContinuousMode] = createSignal(true);

  // Get available locations (status list)
  const availableLocations = createMemo(() => {
    return statusAllList.filter(status => status.id !== 'YABA_99');
  });

  // Get selected status details
  const selectedStatus = createMemo(() => {
    return statusAllList.find(status => status.id === selectedStatusId());
  });

  // Get valid HBLs for processing
  const validHBLs = createMemo(() => {
    return scannedHBLs().filter(item => item.isValid);
  });

  // Get unique valid HBL numbers
  const uniqueValidHBLs = createMemo(() => {
    const valid = validHBLs();
    const uniqueNumbers = [...new Set(valid.map(item => item.hbl))];
    return uniqueNumbers;
  });

  // Add notification with auto-remove
  const addNotification = (message: string) => {
    setNotifications(prev => [message, ...prev.slice(0, 4)]);
    setTimeout(() => {
      setNotifications(prev => prev.slice(0, -1));
    }, 4000);
  };

  // Handle scan completion - continuous mode
  const handleScanComplete = async (scannedCode: string) => {
    devLog('HBL continuous scan:', scannedCode);
    
    // DevTools logging
    debugLog('Scanned HBL', { hbl: scannedCode, isValid: isValidHBL(scannedCode) });
    
    const isValid = isValidHBL(scannedCode);
    const scannedItem: ScannedHBL = {
      id: Date.now().toString(),
      hbl: scannedCode,
      timestamp: Date.now(),
      isValid,
      error: !isValid ? 'Formato HBL inválido' : undefined
    };

    // Check for duplicates
    const isDuplicate = scannedHBLs().some(item => item.hbl === scannedCode);
    if (isDuplicate) {
      addNotification(`⚠️ ${scannedCode} ya está en la lista`);
      return;
    }

    setScannedHBLs(prev => {
      const newList = [scannedItem, ...prev];
      // Debug state tracking
      debugLog('Scanner state updated', {
        totalScanned: newList.length,
        validCount: newList.filter(item => item.isValid).length,
        lastScanned: scannedCode,
        isValid
      });
      return newList;
    });

    if (isValid) {
      addNotification(`✅ ${scannedCode} agregado a la lista`);
    } else {
      addNotification(`❌ ${scannedCode} - formato inválido`);
    }

    // Note: Scanner open/close behavior is now handled by the EnhancedBarcodeScanner
    // via the keepOpenAfterScan prop that respects continuousMode()
  };

  // Send all HBLs to selected location
  const sendHBLsToLocation = async () => {
    if (!selectedStatusId()) {
      addNotification('❌ Selecciona una ubicación primero');
      return;
    }

    const hblsToUpdate = uniqueValidHBLs();
    if (hblsToUpdate.length === 0) {
      addNotification('❌ No hay HBLs válidos para enviar');
      return;
    }

    setIsUpdating(true);
    addNotification(`🔄 Enviando ${hblsToUpdate.length} HBLs a ${selectedStatus()?.label}...`);

    try {
      const result = await updateHBLStatusBulk({
        hbls: hblsToUpdate,
        statusId: selectedStatusId(),
        notes: `Actualización masiva via escáner continuo a ${selectedStatus()?.label} en ${new Date().toLocaleString()}`
      });
      
      // Debug logging
      debugLog('HBL Bulk Update', { hbls: hblsToUpdate, statusId: selectedStatusId(), result });

      // Clear the list after successful update
      setScannedHBLs([]);
      
      addNotification(`✅ Completado: ${result.totalSuccess} exitosos, ${result.totalFailed} fallidos`);
      
      // Call parent callback
      if (props.onHBLListUpdated) {
        props.onHBLListUpdated(hblsToUpdate, selectedStatusId(), selectedStatus()?.label || '', result);
      }
    } catch (error) {
      devLog('Error sending HBLs to location:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      addNotification(`❌ Error: ${errorMessage}`);
      
      if (props.onError) {
        props.onError(errorMessage);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  // Remove HBL from list
  const removeHBL = (id: string) => {
    setScannedHBLs(prev => prev.filter(item => item.id !== id));
    addNotification('🗑️ HBL removido de la lista');
  };

  // Clear all HBLs
  const clearAllHBLs = () => {
    setScannedHBLs([]);
    addNotification('🧹 Lista limpiada');
  };

  // Handle scanner errors
  const handleScannerError = (error: string) => {
    devLog('Scanner error:', error);
    addNotification(`❌ Error del escáner: ${error}`);
    
    if (props.onError) {
      props.onError(error);
    }
  };

  // Format date for display
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  // Mobile-first responsive styles
  const containerStyle = {
    padding: '1rem',
    'max-width': '100%',
    margin: '0 auto'
  };

  const headerStyle = {
    'text-align': 'center' as const,
    'margin-bottom': '1.5rem'
  };

  const locationGridStyle = {
    display: 'grid',
    'grid-template-columns': '1fr',
    gap: '0.75rem',
    'margin-top': '1rem'
  };

  const locationButtonStyle = (isSelected: boolean) => ({
    padding: '1rem',
    border: '2px solid #ddd',
    'border-radius': '8px',
    cursor: 'pointer',
    'background-color': isSelected ? '#007bff' : 'white',
    color: isSelected ? 'white' : '#333',
    'text-align': 'left' as const,
    transition: 'all 0.2s ease',
    'font-size': '1rem',
    'min-height': '48px',
    display: 'flex',
    'flex-direction': 'column' as const,
    'justify-content': 'center'
  });

  const actionButtonStyle = (disabled: boolean = false, variant: 'primary' | 'secondary' | 'danger' = 'primary') => {
    const colors = {
      primary: { bg: '#28a745', hover: '#218838' },
      secondary: { bg: '#6c757d', hover: '#545b62' },
      danger: { bg: '#dc3545', hover: '#c82333' }
    };
    
    return {
      padding: '1rem',
      'background-color': disabled ? '#6c757d' : colors[variant].bg,
      color: 'white',
      border: 'none',
      'border-radius': '8px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      'font-size': '1rem',
      'font-weight': '500',
      'min-height': '48px',
      display: 'flex',
      'align-items': 'center',
      'justify-content': 'center',
      gap: '0.5rem',
      transition: 'all 0.2s ease',
      width: '100%'
    };
  };

  const hblListStyle = {
    'max-height': '300px',
    'overflow-y': 'auto' as const,
    border: '1px solid #ddd',
    'border-radius': '8px',
    'background-color': '#f8f9fa'
  };

  const hblItemStyle = (isValid: boolean) => ({
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '0.75rem',
    'border-bottom': '1px solid #eee',
    'background-color': isValid ? 'white' : '#fff3cd',
    'font-family': 'monospace',
    'font-size': '0.9rem'
  });

  const removeButtonStyle = {
    padding: '0.25rem 0.5rem',
    'background-color': '#dc3545',
    color: 'white',
    border: 'none',
    'border-radius': '4px',
    cursor: 'pointer',
    'font-size': '0.8rem',
    'min-height': '32px',
    'min-width': '32px'
  };

  const statsStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(2, 1fr)',
    gap: '0.75rem',
    'margin-top': '1rem',
    'text-align': 'center' as const
  };

  const statItemStyle = {
    padding: '0.75rem',
    'background-color': '#f8f9fa',
    'border-radius': '8px',
    border: '1px solid #e9ecef'
  };

  const notificationStyle = (index: number) => ({
    padding: '0.75rem',
    'margin-bottom': '0.5rem',
    'background-color': '#d4edda',
    color: '#155724',
    border: '1px solid #c3e6cb',
    'border-radius': '6px',
    opacity: 1 - (index * 0.1),
    transition: 'all 0.3s ease',
    'font-size': '0.9rem'
  });

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h1 style={{ 'font-size': '1.5rem', margin: '0 0 0.5rem 0', 'line-height': '1.2' }}>
          🔄 Escáner Continuo HBL
        </h1>
        <p style={{ 'font-size': '0.9rem', color: '#666', margin: '0', 'line-height': '1.4' }}>
          Escanea múltiples HBLs y envíalos a una ubicación
        </p>
      </div>

      {/* Notifications */}
      <Show when={notifications().length > 0}>
        <div style={{ 'margin-bottom': '1.5rem' }}>
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
        <div style={{ padding: '1rem' }}>
          <h2 style={{ margin: '0 0 1rem 0', 'font-size': '1.1rem', color: '#333' }}>
            📍 Seleccionar Ubicación de Destino
          </h2>
          
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
        </div>
      </Card>

      {/* Scanner Controls */}
      <Card>
        <div style={{ padding: '1rem' }}>
          <h2 style={{ margin: '0 0 1rem 0', 'font-size': '1.1rem', color: '#333' }}>
            📷 Controles del Escáner
          </h2>
          
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <button
              style={actionButtonStyle(false, 'primary')}
              onClick={() => setIsScannerOpen(true)}
            >
              <span style={{ 'font-size': '1.2em' }}>📷</span>
              {isScannerOpen() ? 'Escáner Activo' : 'Iniciar Escáner'}
            </button>
            
            <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', 'justify-content': 'center' }}>
              <input
                type="checkbox"
                id="continuous-mode"
                checked={continuousMode()}
                onChange={(e) => setContinuousMode(e.currentTarget.checked)}
                style={{ transform: 'scale(1.2)' }}
              />
              <label for="continuous-mode" style={{ 'font-size': '0.9rem', cursor: 'pointer' }}>
                Modo continuo (mantener escáner abierto)
              </label>
            </div>
          </div>
        </div>
      </Card>

      {/* HBL List */}
      <Show when={scannedHBLs().length > 0}>
        <Card>
          <div style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '1rem' }}>
              <h2 style={{ margin: '0', 'font-size': '1.1rem', color: '#333' }}>
                📦 HBLs Escaneados ({scannedHBLs().length})
              </h2>
              <button
                style={{ ...actionButtonStyle(false, 'danger'), width: 'auto', padding: '0.5rem 1rem' }}
                onClick={clearAllHBLs}
              >
                🗑️ Limpiar
              </button>
            </div>

            <div style={hblListStyle}>
              <For each={scannedHBLs()}>
                {(item) => (
                  <div style={hblItemStyle(item.isValid)}>
                    <div>
                      <div style={{ 'font-weight': '500' }}>
                        {item.isValid ? '✅' : '❌'} {item.hbl}
                      </div>
                      <div style={{ 'font-size': '0.8rem', color: '#666' }}>
                        {formatTime(item.timestamp)}
                        {item.error && (
                          <span style={{ color: '#dc3545', 'margin-left': '0.5rem' }}>
                            • {item.error}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      style={removeButtonStyle}
                      onClick={() => removeHBL(item.id)}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </For>
            </div>

            {/* Stats */}
            <div style={statsStyle}>
              <div style={statItemStyle}>
                <div style={{ 'font-size': '1.25rem', 'font-weight': '600', color: '#28a745' }}>
                  {validHBLs().length}
                </div>
                <div style={{ 'font-size': '0.8rem', color: '#666' }}>HBLs Válidos</div>
              </div>
              <div style={statItemStyle}>
                <div style={{ 'font-size': '1.25rem', 'font-weight': '600', color: '#007bff' }}>
                  {uniqueValidHBLs().length}
                </div>
                <div style={{ 'font-size': '0.8rem', color: '#666' }}>Únicos</div>
              </div>
            </div>
          </div>
        </Card>
      </Show>

      {/* Send to Location */}
      <Show when={uniqueValidHBLs().length > 0}>
        <Card>
          <div style={{ padding: '1rem' }}>
            <h2 style={{ margin: '0 0 1rem 0', 'font-size': '1.1rem', color: '#333' }}>
              📤 Enviar a Ubicación
            </h2>
            
            <Show when={selectedStatusId()}>
              <div style={{
                'margin-bottom': '1rem',
                padding: '0.75rem',
                'background-color': '#e8f5e8',
                border: '1px solid #c3e6cb',
                'border-radius': '6px'
              }}>
                <strong>Destino:</strong> {selectedStatus()?.label}
                <br />
                <span style={{ 'font-size': '0.9rem', color: '#666' }}>
                  Se enviarán {uniqueValidHBLs().length} HBLs únicos
                </span>
              </div>
            </Show>

            <button
              style={actionButtonStyle(!selectedStatusId() || uniqueValidHBLs().length === 0 || isUpdating(), 'primary')}
              onClick={sendHBLsToLocation}
              disabled={!selectedStatusId() || uniqueValidHBLs().length === 0 || isUpdating()}
            >
              <span style={{ 'font-size': '1.2em' }}>📤</span>
              {isUpdating() 
                ? 'Enviando...' 
                : `Enviar ${uniqueValidHBLs().length} HBLs a ${selectedStatus()?.label || 'Ubicación'}`
              }
            </button>

            <Show when={!selectedStatusId()}>
              <div style={{
                'text-align': 'center',
                'margin-top': '0.75rem',
                color: '#666',
                'font-size': '0.9rem',
                'font-style': 'italic'
              }}>
                Selecciona una ubicación para habilitar el envío
              </div>
            </Show>
          </div>
        </Card>
      </Show>

      {/* Instructions */}
      <Card>
        <div style={{
          padding: '1rem',
          'background-color': '#fff3cd',
          border: '1px solid #ffeaa7',
          'border-radius': '8px'
        }}>
          <h3 style={{ margin: '0 0 1rem 0', 'font-size': '1rem' }}>📋 Cómo Usar</h3>
          <ol style={{ margin: '0', 'padding-left': '1.25rem', 'font-size': '0.9rem', 'line-height': '1.5' }}>
            <li>Selecciona la ubicación de destino</li>
            <li>Inicia el escáner y escanea múltiples códigos HBL</li>
            <li>Revisa la lista de HBLs escaneados</li>
            <li>Envía todos los HBLs válidos a la ubicación seleccionada</li>
          </ol>
          
          <div style={{ 
            'margin-top': '0.75rem', 
            'padding-top': '0.75rem', 
            'border-top': '1px solid #ffd32a',
            'font-size': '0.85rem'
          }}>
            <strong>💡 Consejos:</strong> El modo continuo mantiene el escáner abierto para escaneos rápidos. 
            Los duplicados se detectan automáticamente.
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
        keepOpenAfterScan={continuousMode()}
      />
    </div>
  );
};

export default HBLContinuousScanner;