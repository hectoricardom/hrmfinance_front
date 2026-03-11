import { Component, createSignal, Show, For, onMount, onCleanup } from 'solid-js';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { updateHBLStatus, statusAllList, getStatusById } from '../status/hblUpdateService';
import { parseHBLNumbers, getHBLFormat } from '../data/hblParser';
import { hblStore } from '../data/hblStore';
import { useTranslation } from '../../../translations';
import { inventoryApi } from '../../../services/apiAdapter';
import { authStore } from '../../../stores/authStore';
import { devLog } from '../../../services/utils';


interface ScanResult {
  hbl: string;
  status: string;
  timestamp: string;
  success: boolean;
  code?:number;
  msg?: string;
  format?: 'standard' | 'extended' | 'unknown';
  currentLocation?: string;
  city?: string;
  state?: string;
  bagNumber?: string;
}

interface HBLMobileScannerSimpleProps {
  defaultStatusId?: string;
  onScanComplete?: (result: ScanResult) => void;
}

const HBLMobileScannerSimple: Component<HBLMobileScannerSimpleProps> = (props) => {
  const { t } = useTranslation();
  
  // Scanner states
  const [selectedStatusId, setSelectedStatusId] = createSignal(props.defaultStatusId || '');
  const [isUpdating, setIsUpdating] = createSignal(false);
  const [scanHistory, setScanHistory] = createSignal<ScanResult[]>([]);
  const [lastScannedHBL, setLastScannedHBL] = createSignal<string>('');
  const [successCount, setSuccessCount] = createSignal(0);
  const [errorCount, setErrorCount] = createSignal(0);
  const [isScanning, setIsScanning] = createSignal(false);
  const [hasPermission, setHasPermission] = createSignal<boolean | null>(null);
  const [error, setError] = createSignal<string>('');

  // Scanner refs
  let videoRef: HTMLVideoElement | undefined;
  let codeReader: BrowserMultiFormatReader | undefined;
  let stream: MediaStream | undefined;

  // Mobile-first styles
  const containerStyle = {
    display: 'flex',
    'flex-direction': 'column',
    height: '100vh',
    background: '#000',
    overflow: 'hidden'
  };

  const headerStyle = {
    background: '#2c3e50',
    color: 'white',
    padding: '1rem',
    'box-shadow': '0 2px 4px rgba(0,0,0,0.1)',
    'z-index': '10',
    position: 'relative' as const
  };

  const scannerAreaStyle = {
    flex: '1',
    position: 'relative' as const,
    background: '#000',
    overflow: 'hidden'
  };

  const videoStyle = {
    width: '100%',
    height: '100%',
    'object-fit': 'cover'
  };

  const overlayStyle = {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '280px',
    height: '180px',
    border: '3px solid #4caf50',
    'border-radius': '12px',
    'box-shadow': '0 0 20px rgba(76, 175, 80, 0.5)',
    'z-index': '5'
  };

  const scanLineStyle = {
    position: 'absolute' as const,
    top: '0',
    left: '0',
    width: '100%',
    height: '3px',
    background: 'linear-gradient(90deg, transparent, #4caf50, transparent)',
    animation: 'scan 2s linear infinite'
  };

  const controlsStyle = {
    position: 'absolute' as const,
    bottom: '0',
    left: '0',
    right: '0',
    background: 'rgba(0, 0, 0, 0.8)',
    color: 'white',
    padding: '1rem',
    'z-index': '10'
  };

  const selectStyle = {
    width: '100%',
    padding: '1rem',
    border: '2px solid #ddd',
    'border-radius': '8px',
    'font-size': '1rem',
    'margin-bottom': '1rem',
    background: '#fff'
  };

  const resultCardStyle = (success: boolean) => ({
    padding: '1rem',
    background: success ? '#d4edda' : '#f8d7da',
    color: success ? '#155724' : '#721c24',
    border: `1px solid ${success ? '#c3e6cb' : '#f5c6cb'}`,
    'border-radius': '8px',
    'margin-bottom': '0.5rem',
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center'
  });

  let lastProcessedCode = '';
  let processingTimeout: any = null;

  // Initialize scanner
  onMount(async () => {
    devLog('HBL Mobile Scanner initializing...');
    
    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes scan {
        0% { top: 0; }
        100% { top: 100%; }
      }
    `;
    document.head.appendChild(style);
    
    try {
      codeReader = new BrowserMultiFormatReader();
      devLog('BarcodeReader initialized');
      await requestCameraPermission();
    } catch (err) {
      devLog('Failed to initialize scanner:', err);
      setError(`Failed to initialize: ${err.message || err}`);
    }
  });

  // Cleanup
  onCleanup(() => {
    stopScanning();
    if (processingTimeout) {
      clearTimeout(processingTimeout);
    }
  });

  // Request camera permission
  const requestCameraPermission = async () => {
    devLog('Requesting camera permission...');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      devLog('Camera permission granted');
      setHasPermission(true);
      mediaStream.getTracks().forEach(track => track.stop());
      
      // Auto-start scanning if status is selected
      if (selectedStatusId()) {
        startScanning();
      }
    } catch (err) {
      devLog('Camera permission error:', err);
      setHasPermission(false);
      setError(`Camera error: ${err.message || 'Permission required'}`);
    }
  };

  // Start scanning
  const startScanning = async () => {
    devLog('Starting scanner...');
    if (!codeReader) {
      setError('Scanner not initialized');
      return;
    }
    
    if (!videoRef) {
      setError('Video element not available');
      return;
    }

    try {
      setIsScanning(true);
      setError('');
      
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };

      await codeReader.decodeFromConstraints(
        constraints,
        videoRef,
        (result, error) => {
          if (result) {
            devLog('Barcode detected:', result.getText());
            handleScanResult(result.getText());
          }
          if (error && !(error instanceof NotFoundException)) {
            devLog('Scanning error:', error);
          }
        }
      );

      if (videoRef.srcObject) {
        stream = videoRef.srcObject as MediaStream;
        devLog('Video stream established');
      }
    } catch (err) {
      devLog('Failed to start scanning:', err);
      setError(`Failed to start camera: ${err.message || err}`);
      setIsScanning(false);
    }
  };

  // Stop scanning
  const stopScanning = () => {
    try {
      codeReader?.reset();
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = undefined;
      }
      if (videoRef) {
        videoRef.srcObject = null;
      }
      setIsScanning(false);
    } catch (err) {
      devLog('Error stopping scanner:', err);
    }
  };

  // Toggle scanning
  const toggleScanning = () => {
    if (isScanning()) {
      stopScanning();
    } else {
      startScanning();
    }
  }; 

  // Handle scan result
  const handleScanResult = async (scannedCode: string) => {
    devLog('HBL scan result:', scannedCode);

    // Prevent processing the same code multiple times
    if (scannedCode === lastProcessedCode || isUpdating()) {
      return;
    }

    lastProcessedCode = scannedCode;

    // Clear the timeout for resetting lastProcessedCode
    if (processingTimeout) {
      clearTimeout(processingTimeout);
    }

    // Reset after 2 seconds to allow scanning the same code again
    processingTimeout = setTimeout(() => {
      lastProcessedCode = '';
    }, 2000);

    // Parse and validate HBL using comprehensive parser (same as bulk update)
    const parsedHBLs = parseHBLNumbers(scannedCode);

    if (parsedHBLs.length === 0) {
      addToHistory({
        hbl: scannedCode,
        status: 'Formato HBL inválido (se esperaba 230XXXXXX o AAA12345678)',
        timestamp: new Date().toLocaleString(),
        success: false,
        format: 'unknown'
      });
      setErrorCount(prev => prev + 1);
      return;
    }

    // Use the first parsed HBL
    const validHBL = parsedHBLs[0];
    const hblFormat = getHBLFormat(validHBL);

    devLog(`Validated HBL: ${validHBL}, Format: ${hblFormat}`);

    if (!selectedStatusId()) {
      addToHistory({
        hbl: validHBL,
        status: 'No status selected',
        timestamp: new Date().toLocaleString(),
        success: false,
        format: hblFormat
      });
      setErrorCount(prev => prev + 1);
      return;
    }

    setIsUpdating(true);
    setLastScannedHBL(validHBL);

    let params = {
      hbl: validHBL,
      status: selectedStatusId(),
      userId: authStore.currentUser?.id,
      userName: authStore.currentUser?.name || authStore.currentUser?.displayName,
      timeStamp: (new Date()).getTime()
    }

    try {
      // Call upsertScannedLocations which returns location data
      const locationResult = await inventoryApi.upsertScannedLocations(params);
      devLog('Location result:', locationResult);

      // Update status
      setTimeout(() => {
        updateHBLStatus(
          validHBL,
          selectedStatusId(),
          `Mobile scan update at ${new Date().toLocaleString()}`
        );
      }, 400);


      // Extract data from locationResult
      let bagNumber = locationResult?.bagNumber || '';
      let statusCode = locationResult?.status || selectedStatusId();
      let city = '';
      let state = '';

      // Parse city and state from street address
      // Format: "CALLE..., (Zona X), CITY, STATE"
      if (locationResult?.street) {
        const parts = locationResult.street.split(',').map((p: string) => p.trim());
        if (parts.length >= 2) {
          state = parts[parts.length - 1]; // Last part is state
          city = parts[parts.length - 2].replace(/\(.*?\)/g, '').trim(); // Second to last is city (remove zone info)
        }
      }

      // Get status name from status code
      const statusInfo = getStatusById(statusCode);
      const statusLabel = statusInfo?.label || statusCode;

      if (locationResult.success) {
        const scanResult: ScanResult = {
          hbl: validHBL,
          //code: result.code,
          //msg: result.msg,
          status: statusCode,
          timestamp: new Date().toLocaleString(),
          success: true,
          format: hblFormat,
          currentLocation: statusLabel, // Use human-readable status label
          city,
          state,
          bagNumber
        };
        addToHistory(scanResult);
        setSuccessCount(prev => prev + 1);

        // Vibrate on success (if supported)
        if ('vibrate' in navigator) {
          navigator.vibrate(200);
        }

        if (props.onScanComplete) {
          props.onScanComplete(scanResult);
        }
      } else {
        addToHistory({
          hbl: validHBL,
          status: `Error: `,
          timestamp: new Date().toLocaleString(),
          success: false,
          format: hblFormat,
          currentLocation: statusLabel, // Use human-readable status label
          city,
          state,
          bagNumber
        });
        setErrorCount(prev => prev + 1);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addToHistory({
        hbl: validHBL,
        status: `Error: ${errorMessage}`,
        timestamp: new Date().toLocaleString(),
        success: false,
        format: hblFormat
      });
      setErrorCount(prev => prev + 1);
    } finally {
      setIsUpdating(false);
    }
  };

  // Add to scan history
  const addToHistory = (result: ScanResult) => {
    setScanHistory(prev => [result, ...prev].slice(0, 50)); // Keep last 50 scans
  };

  // Clear history
  const clearHistory = () => {
    setScanHistory([]);
    setSuccessCount(0);
    setErrorCount(0);
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h2 style={{ margin: '0 0 0.5rem 0', 'font-size': '1.5rem' }}>📱 HBL Scanner</h2>
        <div style={{ display: 'flex', gap: '1rem', 'font-size': '0.875rem' }}>
          <span>✅ {successCount()}</span>
          <span>❌ {errorCount()}</span>
          <span>📦 {scanHistory().length}</span>
        </div>
        <div style={{ 'font-size': '0.75rem', opacity: '0.8', 'margin-top': '0.25rem' }}>
          Status: {selectedStatusId() ? statusAllList.find(s => s.id === selectedStatusId())?.label : 'Not selected'} | 
          Camera: {isScanning() ? 'Active' : 'Inactive'}
        </div>
      </div>

      {/* Scanner Area */}
      <div style={scannerAreaStyle}>
        {/* Permission Request */}
        <Show when={hasPermission() === false}>
          <div style={{ 
            display: 'flex',
            'flex-direction': 'column',
            'justify-content': 'center',
            'align-items': 'center',
            height: '100%',
            color: 'white',
            padding: '2rem',
            'text-align': 'center'
          }}>
            <div style={{ 'font-size': '4rem', 'margin-bottom': '1rem' }}>📷</div>
            <h3>Camera Permission Required</h3>
            <p>Allow camera access to scan HBL barcodes</p>
            <button 
              style={{ 
                padding: '1rem 2rem',
                background: '#4caf50',
                color: 'white',
                border: 'none',
                'border-radius': '8px',
                'font-size': '1rem',
                cursor: 'pointer'
              }}
              onClick={requestCameraPermission}
            >
              Grant Permission
            </button>
          </div>
        </Show>

        {/* Loading State */}
        <Show when={hasPermission() === null}>
          <div style={{ 
            display: 'flex',
            'flex-direction': 'column',
            'justify-content': 'center',
            'align-items': 'center',
            height: '100%',
            color: 'white'
          }}>
            <div style={{ 'font-size': '2rem', 'margin-bottom': '1rem' }}>🔄</div>
            <p>Initializing camera...</p>
          </div>
        </Show>

        {/* Camera View */}
        <Show when={hasPermission()}>
          <video 
            ref={videoRef} 
            style={{
              ...videoStyle,
              display: isScanning() ? 'block' : 'none'
            }} 
            autoplay 
            playsinline 
          />
          <Show when={isScanning()}>
            <div style={overlayStyle}>
              <div style={scanLineStyle} />
            </div>
          </Show>
        </Show>

        {/* Ready to Scan */}
        <Show when={hasPermission() && !isScanning()}>
          <div style={{ 
            display: 'flex',
            'flex-direction': 'column',
            'justify-content': 'center',
            'align-items': 'center',
            height: '100%',
            color: 'white',
            padding: '2rem',
            'text-align': 'center'
          }}>
            <div style={{ 'font-size': '4rem', 'margin-bottom': '1rem' }}>📱</div>
            <h3>Ready to Scan</h3>
            <p>Select status and start scanning HBL codes</p>
          </div>
        </Show>

        {/* Error Display */}
        <Show when={error()}>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: '#f8d7da',
            color: '#721c24',
            padding: '1.5rem',
            'border-radius': '8px',
            'text-align': 'center',
            'max-width': '80%',
            'z-index': '20'
          }}>
            {error()}
          </div>
        </Show>

        {/* Bottom Controls */}
        <div style={controlsStyle}>
          {/* Status Selection */}
          <select
            style={{
              width: '100%',
              padding: '0.75rem',
              border: 'none',
              'border-radius': '6px',
              'font-size': '1rem',
              'margin-bottom': '1rem',
              background: '#fff'
            }}
            value={selectedStatusId()}
            onChange={(e) => {
              setSelectedStatusId(e.currentTarget.value);
              // Auto-start scanning when status is selected
              if (e.currentTarget.value && hasPermission() && !isScanning()) {
                startScanning();
              }
            }}
          >
            <option value="">🎯 Select HBL Status</option>
            <For each={statusAllList}>
              {(status) => (
                <option value={status.id}>
                  {status.label} {status.tag ? `(${status.tag})` : ''}
                </option>
              )}
            </For>
          </select>

          {/* Scan Controls */}
          <div style={{ display: 'flex', gap: '1rem', 'margin-bottom': '1rem' }}>
            <button
              style={{
                flex: '1',
                padding: '1rem',
                background: selectedStatusId() ? (isScanning() ? '#dc3545' : '#4caf50') : '#6c757d',
                color: 'white',
                border: 'none',
                'border-radius': '6px',
                'font-size': '1rem',
                cursor: selectedStatusId() ? 'pointer' : 'not-allowed'
              }}
              onClick={toggleScanning}
              disabled={!selectedStatusId() || hasPermission() === false}
            >
              {isScanning() ? '⏹ Stop Scanning' : '📷 Start Scanning'}
            </button>
          </div>

          {/* Processing indicator */}
          <Show when={isUpdating()}>
            <div style={{
              background: '#fff3cd',
              color: '#856404',
              padding: '0.75rem',
              'border-radius': '6px',
              'text-align': 'center',
              'margin-bottom': '1rem',
              border: '1px solid #ffeaa7'
            }}>
              <div style={{ 'font-weight': '600', 'margin-bottom': '0.25rem' }}>
                🔄 Processing {lastScannedHBL()}...
              </div>
              <div style={{ 'font-size': '0.75rem', opacity: '0.8' }}>
                Fetching location data & updating status
              </div>
            </div>
          </Show>

          {/* Recent Scans - Compact for mobile */}
          <Show when={scanHistory().length > 0}>
            <div style={{ 
              'max-height': '150px', 
              'overflow-y': 'auto',
              background: 'rgba(255, 255, 255, 0.1)',
              'border-radius': '6px',
              padding: '0.5rem'
            }}>
              <div style={{ 
                display: 'flex', 
                'justify-content': 'space-between', 
                'align-items': 'center',
                'margin-bottom': '0.5rem',
                color: 'white'
              }}>
                <small style={{ 'font-weight': '600' }}>Recent Scans</small>
                <button 
                  onClick={clearHistory}
                  style={{
                    padding: '0.25rem 0.5rem',
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    'border-radius': '4px',
                    'font-size': '0.75rem',
                    cursor: 'pointer'
                  }}
                >
                  Clear
                </button>
              </div>
              
              <For each={scanHistory().slice(0, 3)}>
                {(result) => {
                  const formatColor = result.format === 'standard' ? '#3b82f6' :
                                      result.format === 'extended' ? '#8b5cf6' : '#6b7280';
                  const formatLabel = result.format === 'standard' ? '230' :
                                      result.format === 'extended' ? 'EXT' : '?';

                  return (
                    <div style={{
                      display: 'flex',
                      'justify-content': 'space-between',
                      'align-items': 'flex-start',
                      padding: '0.5rem',
                      background: result.hbl ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)',
                      color: 'white',
                      'border-radius': '4px',
                      'margin-bottom': '0.25rem',
                      'font-size': '0.875rem'
                    }}>
                      <div style={{ flex: '1' }}>
                        <div style={{
                          display: 'flex',
                          'align-items': 'center',
                          gap: '0.375rem',
                          'margin-bottom': '0.125rem'
                        }}>
                          <span style={{
                            'font-size': '0.625rem',
                            'font-weight': '700',
                            background: formatColor,
                            color: 'white',
                            padding: '0.125rem 0.25rem',
                            'border-radius': '3px',
                            'text-transform': 'uppercase'
                          }}>
                            {formatLabel}
                          </span>
                          <strong>{result.hbl}</strong>
                        </div>
                       
                        <div style={{ 'font-size': '0.75rem', opacity: '0.8', 'margin-bottom': '0.125rem' }}>
                          {result.code== 200 ? result.status: result.currentLocation}
                        </div>
                        <Show when={result.city || result.state || result.currentLocation}>
                          <div style={{
                            'font-size': '0.65rem',
                            opacity: '0.7',
                            display: 'flex',
                            'flex-wrap': 'wrap',
                            gap: '0.25rem',
                            'margin-top': '0.25rem'
                          }}>
                            <Show when={result.city || result.state}>
                              <span>📍 {[result.city, result.state].filter(Boolean).join(', ')}</span>
                            </Show>
                          
                            <Show when={result.bagNumber}>
                              <span>📦 {result.bagNumber}</span>
                            </Show>
                          </div>
                        </Show>
                      </div>
                      <div style={{ 'font-size': '1rem', 'margin-left': '0.25rem' }}>
                        {result.success ? '✅' : '❌'}
                      </div>
                    </div>
                  );
                }}
              </For>
            </div>
          </Show>
        </div>
      </div>
    </div>
  );
};

export default HBLMobileScannerSimple;