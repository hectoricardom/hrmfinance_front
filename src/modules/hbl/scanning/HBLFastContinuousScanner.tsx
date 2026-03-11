import { Component, createSignal, Show, For, createMemo } from 'solid-js';
import FastBarcodeScanner from '../../scanner/components/FastBarcodeScanner';
import { statusAllList, updateHBLStatusBulk } from '../status/hblUpdateService';
import { isValidHBL } from '../data/hblParser';
import { Card } from '../../ui';
import { devLog } from '../../../services/utils';

interface HBLFastContinuousScannerProps {
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

const HBLFastContinuousScanner: Component<HBLFastContinuousScannerProps> = (props) => {
  // Enhanced state management for fast scanning
  const [isScannerOpen, setIsScannerOpen] = createSignal(false);
  const [selectedStatusId, setSelectedStatusId] = createSignal<string>('');
  const [scannedHBLs, setScannedHBLs] = createSignal<ScannedHBL[]>([]);
  const [isUpdating, setIsUpdating] = createSignal(false);
  const [notifications, setNotifications] = createSignal<string[]>([]);
  const [multiScanMode, setMultiScanMode] = createSignal(true);
  const [batchSize, setBatchSize] = createSignal(10); // Process in batches
  
  // Performance metrics
  const [scanStats, setScanStats] = createSignal({
    totalScanned: 0,
    validScanned: 0,
    duplicatesBlocked: 0,
    scanningStartTime: 0
  });

  // Get available locations
  const availableLocations = createMemo(() => {
    return statusAllList.filter(status => status.id !== 'YABA_99');
  });

  // Get selected status details
  const selectedStatus = createMemo(() => {
    return statusAllList.find(status => status.id === selectedStatusId());
  });

  // Get valid HBLs
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
  const addNotification = (message: string, timeout = 4000) => {
    setNotifications(prev => [message, ...prev.slice(0, 4)]);
    setTimeout(() => {
      setNotifications(prev => prev.slice(0, -1));
    }, timeout);
  };

  // Handle fast scan results (can be multiple codes at once)
  const handleFastScanResults = (codes: string[]) => {
    devLog('🚀 Fast scan results:', codes);
    
    const newItems: ScannedHBL[] = [];
    let validCount = 0;
    let duplicateCount = 0;
    
    // Process all scanned codes
    codes.forEach(code => {
      const cleanCode = code.trim();
      if (!cleanCode) return;
      
      // Check for duplicates
      const isDuplicate = scannedHBLs().some(item => item.hbl === cleanCode);
      if (isDuplicate) {
        duplicateCount++;
        return;
      }
      
      const isValid = isValidHBL(cleanCode);
      if (isValid) validCount++;
      
      const scannedItem: ScannedHBL = {
        id: `${Date.now()}-${Math.random()}`,
        hbl: cleanCode,
        timestamp: Date.now(),
        isValid,
        error: !isValid ? 'Formato HBL inválido' : undefined
      };
      
      newItems.push(scannedItem);
    });
    
    // Update state with new items
    if (newItems.length > 0) {
      setScannedHBLs(prev => [...newItems, ...prev]);
      
      // Update performance stats
      setScanStats(prev => ({
        ...prev,
        totalScanned: prev.totalScanned + newItems.length,
        validScanned: prev.validScanned + validCount,
        duplicatesBlocked: prev.duplicatesBlocked + duplicateCount
      }));
    }
    
    // Generate smart notifications
    if (newItems.length > 0) {
      if (multiScanMode()) {
        addNotification(
          `🚀 ${newItems.length} códigos escaneados - ${validCount} válidos${duplicateCount > 0 ? `, ${duplicateCount} duplicados` : ''}`
        );
      } else {
        const item = newItems[0];
        if (item.isValid) {
          addNotification(`✅ ${item.hbl} agregado a la lista`);
        } else {
          addNotification(`❌ ${item.hbl} - formato inválido`);
        }
      }
    } else if (duplicateCount > 0) {
      addNotification(`⚠️ ${duplicateCount} código${duplicateCount > 1 ? 's' : ''} duplicado${duplicateCount > 1 ? 's' : ''} ignorado${duplicateCount > 1 ? 's' : ''}`);
    }
  };

  // Send HBLs to location with batch processing
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
    const batch = batchSize();
    const totalBatches = Math.ceil(hblsToUpdate.length / batch);
    
    addNotification(`🚀 Procesando ${hblsToUpdate.length} HBLs en ${totalBatches} lote${totalBatches > 1 ? 's' : ''}`);

    try {
      let totalSuccess = 0;
      let totalFailed = 0;
      const allResults: any[] = [];

      // Process in batches for better performance
      for (let i = 0; i < totalBatches; i++) {
        const batchStart = i * batch;
        const batchEnd = Math.min(batchStart + batch, hblsToUpdate.length);
        const batchHBLs = hblsToUpdate.slice(batchStart, batchEnd);
        
        addNotification(`⚡ Procesando lote ${i + 1}/${totalBatches} (${batchHBLs.length} HBLs)`, 2000);
        
        const result = await updateHBLStatusBulk({
          hbls: batchHBLs,
          statusId: selectedStatusId(),
          notes: `Actualización masiva via escáner rápido a ${selectedStatus()?.label} - Lote ${i + 1}/${totalBatches} - ${new Date().toLocaleString()}`
        });
        
        totalSuccess += result.totalSuccess;
        totalFailed += result.totalFailed;
        allResults.push(...result.results);
        
        // Small delay between batches to avoid overwhelming the API
        if (i < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Clear the list after successful update
      setScannedHBLs([]);
      
      // Reset stats
      setScanStats({
        totalScanned: 0,
        validScanned: 0,
        duplicatesBlocked: 0,
        scanningStartTime: 0
      });
      
      addNotification(`🎉 Completado: ${totalSuccess} exitosos, ${totalFailed} fallidos`, 6000);
      
      // Call parent callback
      if (props.onHBLListUpdated) {
        props.onHBLListUpdated(hblsToUpdate, selectedStatusId(), selectedStatus()?.label || '', {
          results: allResults,
          totalSuccess,
          totalFailed,
          totalProcessed: hblsToUpdate.length
        });
      }
    } catch (error) {
      devLog('Error sending HBLs to location:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      addNotification(`❌ Error: ${errorMessage}`, 8000);
      
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
    setScanStats({
      totalScanned: 0,
      validScanned: 0,
      duplicatesBlocked: 0,
      scanningStartTime: 0
    });
    addNotification('🧹 Lista limpiada');
  };

  // Handle scanner errors
  const handleScannerError = (error: string) => {
    devLog('Fast scanner error:', error);
    addNotification(`❌ Error del escáner: ${error}`);
    
    if (props.onError) {
      props.onError(error);
    }
  };

  // Start scanning with performance tracking
  const startScanning = () => {
    setScanStats(prev => ({
      ...prev,
      scanningStartTime: Date.now()
    }));
    setIsScannerOpen(true);
  };

  // Format time for display
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  // Calculate scanning speed
  const getScanningSpeed = () => {
    const stats = scanStats();
    if (stats.scanningStartTime === 0 || stats.totalScanned === 0) return 0;
    const timeElapsed = (Date.now() - stats.scanningStartTime) / 1000; // in seconds
    return Math.round(stats.totalScanned / timeElapsed * 60); // scans per minute
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
          ⚡ Escáner HBL Rápido
        </h1>
        <p style={{ 'font-size': '0.9rem', color: '#666', margin: '0', 'line-height': '1.4' }}>
          Escáner optimizado con detección múltiple y procesamiento por lotes
        </p>
      </div>

      {/* Performance Stats */}
      <Show when={scanStats().totalScanned > 0}>
        <Card>
          <div style={{ padding: '1rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', 'font-size': '1rem', color: '#333' }}>
              📊 Rendimiento del Escáner
            </h3>
            <div style={statsStyle}>
              <div style={statItemStyle}>
                <div style={{ 'font-size': '1.25rem', 'font-weight': '600', color: '#007bff' }}>
                  {scanStats().totalScanned}
                </div>
                <div style={{ 'font-size': '0.8rem', color: '#666' }}>Total Escaneados</div>
              </div>
              <div style={statItemStyle}>
                <div style={{ 'font-size': '1.25rem', 'font-weight': '600', color: '#28a745' }}>
                  {scanStats().validScanned}
                </div>
                <div style={{ 'font-size': '0.8rem', color: '#666' }}>Válidos</div>
              </div>
              <div style={statItemStyle}>
                <div style={{ 'font-size': '1.25rem', 'font-weight': '600', color: '#ffc107' }}>
                  {scanStats().duplicatesBlocked}
                </div>
                <div style={{ 'font-size': '0.8rem', color: '#666' }}>Duplicados</div>
              </div>
              <div style={statItemStyle}>
                <div style={{ 'font-size': '1.25rem', 'font-weight': '600', color: '#6f42c1' }}>
                  {getScanningSpeed()}
                </div>
                <div style={{ 'font-size': '0.8rem', color: '#666' }}>Scan/min</div>
              </div>
            </div>
          </div>
        </Card>
      </Show>

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

      {/* Scanner Configuration */}
      <Card>
        <div style={{ padding: '1rem' }}>
          <h2 style={{ margin: '0 0 1rem 0', 'font-size': '1.1rem', color: '#333' }}>
            ⚙️ Configuración del Escáner
          </h2>
          
          <div style={{ display: 'grid', gap: '1rem' }}>

            {/* Multi-scan mode */}
            <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                id="multi-scan-mode"
                checked={multiScanMode()}
                onChange={(e) => setMultiScanMode(e.currentTarget.checked)}
                style={{ transform: 'scale(1.2)' }}
              />
              <label for="multi-scan-mode" style={{ 'font-size': '0.9rem', cursor: 'pointer' }}>
                🚀 Detección múltiple simultánea (recomendado)
              </label>
            </div>

            {/* Batch size */}
            <div>
              <label style={{ 'font-size': '0.9rem', 'font-weight': '500', 'margin-bottom': '0.5rem', display: 'block' }}>
                Tamaño de Lote: {batchSize()} HBLs por lote
              </label>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={batchSize()}
                onChange={(e) => setBatchSize(parseInt(e.currentTarget.value))}
                style={{ width: '100%' }}
              />
            </div>

            {/* Start Scanner */}
            <button
              style={actionButtonStyle(false, 'primary')}
              onClick={startScanning}
            >
              <span style={{ 'font-size': '1.2em' }}>⚡</span>
              Iniciar Escáner Rápido
            </button>
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

            {/* Summary Stats */}
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
              🚀 Enviar a Ubicación (Procesamiento por Lotes)
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
                  Se procesarán {uniqueValidHBLs().length} HBLs únicos en lotes de {batchSize()}
                </span>
              </div>
            </Show>

            <button
              style={actionButtonStyle(!selectedStatusId() || uniqueValidHBLs().length === 0 || isUpdating(), 'primary')}
              onClick={sendHBLsToLocation}
              disabled={!selectedStatusId() || uniqueValidHBLs().length === 0 || isUpdating()}
            >
              <span style={{ 'font-size': '1.2em' }}>🚀</span>
              {isUpdating() 
                ? 'Procesando...' 
                : `Enviar ${uniqueValidHBLs().length} HBLs por Lotes`
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

      {/* Fast Scanner Modal */}
      <FastBarcodeScanner
        isOpen={isScannerOpen()}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleFastScanResults}
        onError={handleScannerError}
        keepOpenAfterScan={true}
        multiScan={multiScanMode()}
      />
    </div>
  );
};

export default HBLFastContinuousScanner;