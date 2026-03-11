import { Component, createSignal, For, Show, createMemo } from 'solid-js';
import { parseAndUpdateHBLs, statusAllList, BulkUpdateResponse, updateHBLStatus, type HBLUpdateResult } from './hblUpdateService';
import { parseHBLNumbers, isValidHBL } from '../data/hblParser';
import { Card, Button } from '../../ui';
import { EnhancedBarcodeScanner } from '../../scanner';
import { useTranslation } from '../../../translations';
import { authStore } from '../../../stores/authStore';
import { devLog } from '../../../services/utils';

interface HBLBulkStatusUpdateWithScannerProps {
  onClose?: () => void;
  onSuccess?: (response: BulkUpdateResponse) => void;
}

interface ScannedHBL {
  hbl: string;
  timestamp: number;
  scannedOrder: number;
}

const HBLBulkStatusUpdateWithScanner: Component<HBLBulkStatusUpdateWithScannerProps> = (props) => {
  const { t } = useTranslation();
  
  // Form state
  const [inputText, setInputText] = createSignal('');
  const [selectedStatus, setSelectedStatus] = createSignal('');
  const [notes, setNotes] = createSignal('');
  const [parsedHBLs, setParsedHBLs] = createSignal<string[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [response, setResponse] = createSignal<BulkUpdateResponse | null>(null);
  
  // Scanner state
  const [isScannerOpen, setIsScannerOpen] = createSignal(false);
  const [scannedHBLs, setScannedHBLs] = createSignal<ScannedHBL[]>([]);
  const [scanMode, setScanMode] = createSignal<'text' | 'scanner' | 'both'>('text');
  const [isScanning, setIsScanning] = createSignal(false);
  const [scanCounter, setScanCounter] = createSignal(0);
  const [notifications, setNotifications] = createSignal<string[]>([]);

  // Combined HBLs from text input and scanner
  const allHBLs = createMemo(() => {
    const textHBLs = parsedHBLs();
    const scannerHBLs = scannedHBLs().map(item => item.hbl);

    // Remove duplicates while preserving order
    const combined = [...textHBLs, ...scannerHBLs];
    return Array.from(new Set(combined));
  });

  // Filter status locations based on user permissions
  const allowedStatusLocations = createMemo(() => {
    return authStore.filterAllowedStatusLocations(statusAllList);
  });

  // Add notification with auto-remove
  const addNotification = (message: string) => {
    setNotifications(prev => [message, ...prev.slice(0, 4)]);
    setTimeout(() => {
      setNotifications(prev => prev.slice(0, -1));
    }, 4000);
  };

  // Handle text parsing
  const handleParseText = () => {
    const hbls = parseHBLNumbers(inputText());
    setParsedHBLs(hbls);
    if (hbls.length > 0) {
      addNotification(`📝 ${hbls.length} HBL(s) extraído(s) del texto`);
    }
  };

  // Handle barcode scan
  const handleScanComplete = (scannedCode: string) => {
    devLog('HBL scan completed:', scannedCode);
    
    if (!isValidHBL(scannedCode)) {
      addNotification(`❌ Formato HBL inválido: ${scannedCode}`);
      return;
    }

    // Check for duplicates
    const alreadyExists = scannedHBLs().some(item => item.hbl === scannedCode) || 
                         parsedHBLs().includes(scannedCode);
    
    if (alreadyExists) {
      addNotification(`⚠️ HBL ${scannedCode} ya agregado`);
      return;
    }

    // Add to scanned HBLs list
    const newScanned: ScannedHBL = {
      hbl: scannedCode,
      timestamp: Date.now(),
      scannedOrder: scanCounter() + 1
    };

    setScannedHBLs(prev => [...prev, newScanned]);
    setScanCounter(prev => prev + 1);
    addNotification(`✅ HBL Escaneado: ${scannedCode}`);

    // Auto-close scanner after scan (optional - can be disabled)
    // setIsScannerOpen(false);
  };

  // Handle scanner errors
  const handleScannerError = (error: string) => {
    devLog('Scanner error:', error);
    addNotification(`❌ Scanner error: ${error}`);
  };

  // Remove scanned HBL
  const removeScannedHBL = (hbl: string) => {
    setScannedHBLs(prev => prev.filter(item => item.hbl !== hbl));
    addNotification(`🗑️ ${hbl} removido`);
  };

  // Clear all scanned HBLs
  const clearScannedHBLs = () => {
    setScannedHBLs([]);
    setScanCounter(0);
    addNotification('🗑️ Todos los HBL escaneados eliminados');
  };

  // Update HBL statuses
  const handleUpdateStatuses = async () => {
    const hblsToUpdate = allHBLs();
    
    if (!selectedStatus() || hblsToUpdate.length === 0) {
      addNotification('❌ Por favor selecciona un estado y agrega HBL primero');
      return;
    }

    setLoading(true);
    setResponse(null);

    try {
      // Create text with all HBLs for the bulk update function
      const combinedText = hblsToUpdate.join(', ');
      
      const result = await parseAndUpdateHBLs(
        combinedText,
        selectedStatus(),
        notes() || `Bulk update - ${scannedHBLs().length} scanned, ${parsedHBLs().length} from text`
      );
      
      setResponse(result);
      
      if (result.totalSuccess > 0) {
        addNotification(`✅ ${result.totalSuccess} HBL(s) actualizados exitosamente`);
        
        if (props.onSuccess) {
          props.onSuccess(result);
        }
      }
      
      if (result.totalFailed > 0) {
        addNotification(`❌ Error al actualizar ${result.totalFailed} HBL(s)`);
      }
      
    } catch (error) {
      devLog('Error updating HBL statuses:', error);
      addNotification('❌ Error al actualizar estados HBL. Por favor inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setInputText('');
    setSelectedStatus('');
    setNotes('');
    setParsedHBLs([]);
    setScannedHBLs([]);
    setScanCounter(0);
    setResponse(null);
    setScanMode('text');
    addNotification('🔄 Formulario reiniciado');
  };

  // Format date for display
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  // Styles
  const textareaStyle = {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '1rem',
    'font-family': 'inherit',
    background: 'var(--surface-color)',
    color: 'var(--text-primary)',
    transition: 'border-color 0.2s ease',
    resize: 'vertical' as const,
    'min-height': '120px'
  };

  const selectStyle = {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '1rem',
    'font-family': 'inherit',
    background: 'var(--surface-color)',
    color: 'var(--text-primary)',
    transition: 'border-color 0.2s ease'
  };

  const labelStyle = {
    display: 'block',
    'font-weight': '500',
    'margin-bottom': '0.5rem',
    color: 'var(--text-primary)'
  };

  const containerStyle = {
    'margin-bottom': '1rem'
  };

  const modeTabStyle = (isActive: boolean) => ({
    padding: '0.5rem 1rem',
    border: 'none',
    'background-color': isActive ? 'var(--primary-color)' : 'var(--gray-200)',
    color: isActive ? 'white' : 'var(--text-primary)',
    'border-radius': '0',
    cursor: 'pointer',
    'font-size': '0.875rem',
    transition: 'all 0.2s ease'
  });

  const scanButtonStyle = {
    padding: '0.75rem 1.5rem',
    'background-color': 'var(--success-color)',
    color: 'white',
    border: 'none',
    'border-radius': 'var(--border-radius)',
    cursor: 'pointer',
    'font-weight': '500',
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem'
  };

  const hblChipStyle = (isScanned: boolean) => ({
    padding: '0.25rem 0.75rem',
    background: isScanned ? 'var(--success-light)' : 'var(--primary-light)',
   
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '0.875rem',
    'font-weight': '500',
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem'
  });

  const notificationStyle = (index: number) => ({
    padding: '0.5rem 1rem',
    'margin-bottom': '0.5rem',
    'background-color': '#d4edda',
    color: '#155724',
    border: '1px solid #c3e6cb',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '0.875rem',
    opacity: 1 - (index * 0.15),
    transition: 'all 0.3s ease'
  });

  return (
    <Card>
      <div style={{ padding: '1.5rem' }}>
        <h2 style={{ 
          'font-size': '1.5rem', 
          'font-weight': '600', 
          'margin-bottom': '0.5rem',
          color: 'var(--text-primary)'
        }}>
          📦 Bulk HBL Status Update with Scanner
        </h2>
        <p style={{ 
          'margin-bottom': '1.5rem',
          color: 'var(--text-muted)',
          'font-size': '0.9rem'
        }}>
          Actualiza múltiples HBL escribiendo/pegando texto o escaneando códigos de barras con tu cámara
        </p>

        {/* Notifications */}
        <Show when={notifications().length > 0}>
          <div style={{ 'margin-bottom': '1rem' }}>
            <For each={notifications()}>
              {(notification, index) => (
                <div style={notificationStyle(index())}>
                  {notification}
                </div>
              )}
            </For>
          </div>
        </Show>

        <div>
          {/* Input Mode Selection */}
          <div style={containerStyle}>
            <label style={labelStyle}>Input Method</label>
            <div style={{ display: 'flex', 'border-radius': 'var(--border-radius-sm)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
              <button
                style={{ ...modeTabStyle(scanMode() === 'text'), 'border-top-left-radius': 'var(--border-radius-sm)', 'border-bottom-left-radius': 'var(--border-radius-sm)' }}
                onClick={() => setScanMode('text')}
              >
                📝 Text Only
              </button>
              <button
                style={modeTabStyle(scanMode() === 'scanner')}
                onClick={() => setScanMode('scanner')}
              >
                📷 Scanner Only
              </button>
              <button
                style={{ ...modeTabStyle(scanMode() === 'both'), 'border-top-right-radius': 'var(--border-radius-sm)', 'border-bottom-right-radius': 'var(--border-radius-sm)' }}
                onClick={() => setScanMode('both')}
              >
                📝📷 Both
              </button>
            </div>
          </div>

          {/* Text Input Area */}
          <Show when={scanMode() === 'text' || scanMode() === 'both'}>
            <div style={containerStyle}>
              <label style={labelStyle}>
                Enter text containing HBL numbers (format: 230XXXXXX)
              </label>
              <textarea
                style={textareaStyle}
                value={inputText()}
                onInput={(e) => setInputText(e.currentTarget.value)}
                placeholder="Paste text here. HBL numbers matching 230XXXXXX will be extracted automatically."
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--primary-color)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
              />
              <div style={{ 'margin-top': '0.75rem' }}>
                <Button onClick={handleParseText} variant="secondary" size="sm">
                  📝 Parse HBLs from Text
                </Button>
              </div>
            </div>
          </Show>

          {/* Scanner Section */}
          <Show when={scanMode() === 'scanner' || scanMode() === 'both'}>
            <div style={containerStyle}>
              <label style={labelStyle}>
                Scan HBL Barcodes ({scannedHBLs().length} scanned)
              </label>
              <div style={{ display: 'flex', gap: '0.75rem', 'flex-wrap': 'wrap', 'align-items': 'center' }}>
                <button
                  style={scanButtonStyle}
                  onClick={() => setIsScannerOpen(true)}
                >
                  <span style={{ 'font-size': '1.2em' }}>📷</span>
                  {isScannerOpen() ? 'Scanner Open' : 'Start Barcode Scanner'}
                </button>
                
                <Show when={scannedHBLs().length > 0}>
                  <Button onClick={clearScannedHBLs} variant="outline" size="sm">
                    🗑️ Clear Scanned
                  </Button>
                </Show>
              </div>

              {/* Scanned HBLs Display */}
              <Show when={scannedHBLs().length > 0}>
                <div style={{
                  'margin-top': '1rem',
                  padding: '0.75rem',
                  background: 'var(--gray-50)',
                  'border-radius': 'var(--border-radius-sm)',
                  'max-height': '150px',
                  'overflow-y': 'auto'
                }}>
                  <div style={{ 'margin-bottom': '0.5rem', 'font-size': '0.875rem', 'font-weight': '500' }}>
                    📷 Scanned HBLs ({scannedHBLs().length}):
                  </div>
                  <div style={{ display: 'flex', 'flex-wrap': 'wrap', gap: '0.5rem' }}>
                    <For each={scannedHBLs()}>
                      {(item) => (
                        <div style={hblChipStyle(true)}>
                          #{item.scannedOrder} {item.hbl}
                          <button
                            style={{
                              background: 'rgba(255,255,255,0.3)',
                              border: 'none',
                              'border-radius': '50%',
                              width: '18px',
                              height: '18px',
                              cursor: 'pointer',
                              display: 'flex',
                              color: "#000000",
                              'align-items': 'center',
                              'justify-content': 'center',
                              'font-size': '12px'
                            }}
                            onClick={() => removeScannedHBL(item.hbl)}
                            title={`Remove ${item.hbl} (scanned at ${formatTime(item.timestamp)})`}
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </For>
                  </div>
                </div>
              </Show>
            </div>
          </Show>

          {/* Combined HBLs Display */}
          <Show when={allHBLs().length > 0}>
            <div style={containerStyle}>
              <h3 style={{
                'font-size': '1.125rem',
                'font-weight': '500',
                'margin-bottom': '0.75rem',
                color: 'var(--text-primary)'
              }}>
                📋 All HBLs to Update ({allHBLs().length} total):
              </h3>
              <div style={{
                background: 'var(--gray-50)',
                padding: '0.75rem',
                'border-radius': 'var(--border-radius-sm)',
                'max-height': '8rem',
                'overflow-y': 'auto'
              }}>
                <div style={{
                  display: 'flex',
                  'flex-wrap': 'wrap',
                  gap: '0.5rem',
                  color: "#000000",
                }}>
                  <For each={allHBLs()}>
                    {(hbl) => {
                      const isFromScanner = scannedHBLs().some(item => item.hbl === hbl);
                      return (
                        <span style={hblChipStyle(isFromScanner)}>
                          {isFromScanner && '📷'} {hbl}
                        </span>
                      );
                    }}
                  </For>
                </div>
              </div>
            </div>
          </Show>

          {/* Status Selection */}
          <div style={containerStyle}>
            <label style={labelStyle}>
              Select New Status
            </label>
            <select
              style={selectStyle}
              value={selectedStatus()}
              onChange={(e) => setSelectedStatus(e.currentTarget.value)}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--primary-color)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
            >
              <option value="">-- Select Status --</option>
              <For each={allowedStatusLocations()}>
                {(status) => (
                  <option value={status.id}>
                    {status.label} {status.tag ? `(${status.tag})` : ''}
                  </option>
                )}
              </For>
            </select>
          </div>

          {/* Notes Input */}
          <div style={containerStyle}>
            <label style={labelStyle}>
              Notes (Optional)
            </label>
            <textarea
              style={{ ...textareaStyle, 'min-height': '80px' }}
              value={notes()}
              onInput={(e) => setNotes(e.currentTarget.value)}
              placeholder="Add any notes about this status update..."
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--primary-color)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
            />
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            'justify-content': 'space-between',
            'align-items': 'center',
            'margin-top': '1.5rem'
          }}>
            <Button
              onClick={handleUpdateStatuses}
              disabled={loading() || allHBLs().length === 0 || !selectedStatus()}
              variant="primary"
              size="lg"
            >
              <Show when={loading()} fallback={`🚀 Actualizar ${allHBLs().length} HBL${allHBLs().length !== 1 ? 's' : ''}`}>
                <span style={{ display: 'flex', 'align-items': 'center' }}>
                  <span style={{
                    display: 'inline-block',
                    width: '16px',
                    height: '16px',
                    border: '2px solid #fff',
                    'border-top-color': 'transparent',
                    'border-radius': '50%',
                    animation: 'spin 0.8s linear infinite',
                    'margin-right': '0.5rem'
                  }} />
                  Actualizando {allHBLs().length} HBL{allHBLs().length !== 1 ? 's' : ''}...
                </span>
              </Show>
            </Button>
            
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Button onClick={resetForm} variant="secondary" size="sm">
                🔄 Reset All
              </Button>
              <Show when={props.onClose}>
                <Button onClick={props.onClose} variant="outline" size="sm">
                  ✕ Close
                </Button>
              </Show>
            </div>
          </div>

          {/* Results Display */}
          <Show when={response()}>
            {(resp) => (
              <div style={{
                'margin-top': '1.5rem',
                padding: '1rem',
                background: 'var(--gray-50)',
                'border-radius': 'var(--border-radius)'
              }}>
                <h3 style={{
                  'font-size': '1.125rem',
                  'font-weight': '500',
                  'margin-bottom': '1rem',
                  color: 'var(--text-primary)'
                }}>
                  📊 Update Results
                </h3>
                
                <div style={{
                  display: 'grid',
                  'grid-template-columns': 'repeat(3, 1fr)',
                  gap: '1rem',
                  'margin-bottom': '1rem'
                }}>
                  <div style={{ 'text-align': 'center' }}>
                    <div style={{
                      'font-size': '1.875rem',
                      'font-weight': '700',
                      color: 'var(--primary-color)'
                    }}>
                      {resp().totalProcessed}
                    </div>
                    <div style={{
                      'font-size': '0.875rem',
                      color: 'var(--text-muted)'
                    }}>
                      Total Processed
                    </div>
                  </div>
                  <div style={{ 'text-align': 'center' }}>
                    <div style={{
                      'font-size': '1.875rem',
                      'font-weight': '700',
                      color: 'var(--success-color)'
                    }}>
                      {resp().totalSuccess}
                    </div>
                    <div style={{
                      'font-size': '0.875rem',
                      color: 'var(--text-muted)'
                    }}>
                      Successful
                    </div>
                  </div>
                  <div style={{ 'text-align': 'center' }}>
                    <div style={{
                      'font-size': '1.875rem',
                      'font-weight': '700',
                      color: 'var(--danger-color)'
                    }}>
                      {resp().totalFailed}
                    </div>
                    <div style={{
                      'font-size': '0.875rem',
                      color: 'var(--text-muted)'
                    }}>
                      Failed
                    </div>
                  </div>
                </div>

                <Show when={resp().totalFailed > 0}>
                  <div style={{
                    'margin-top': '1rem',
                    padding: '0.75rem',
                    background: 'var(--danger-light)',
                    'border-radius': 'var(--border-radius-sm)'
                  }}>
                    <h4 style={{
                      'font-weight': '500',
                      'margin-bottom': '0.5rem',
                      color: 'var(--danger-dark)'
                    }}>
                      Failed Updates:
                    </h4>
                    <div style={{
                      'max-height': '8rem',
                      'overflow-y': 'auto'
                    }}>
                      <For each={resp().results.filter(r => !r.success)}>
                        {(result) => (
                          <div style={{
                            'font-size': '0.875rem',
                            color: 'var(--danger-color)',
                            'margin-bottom': '0.25rem',
                            'font-family': 'monospace'
                          }}>
                            {result.hbl}: {result.error}
                          </div>
                        )}
                      </For>
                    </div>
                  </div>
                </Show>
              </div>
            )}
          </Show>
        </div>
      </div>

      {/* Enhanced Barcode Scanner Modal */}
      <EnhancedBarcodeScanner
        isOpen={isScannerOpen()}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScanComplete}
        onError={handleScannerError}
        autoLookupLocation={false}
        showHistory={false}
        keepOpenAfterScan={true}
      />
      
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Card>
  );
};

export default HBLBulkStatusUpdateWithScanner;