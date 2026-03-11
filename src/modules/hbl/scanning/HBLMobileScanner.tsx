import { Component, createSignal, onCleanup, onMount, Show, For, createMemo } from 'solid-js';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { updateHBLStatus, statusAllList } from '../status/hblUpdateService';
import { isValidHBL } from '../data/hblParser';
import { useTranslation } from '../../../translations';
import { authStore } from '../../../stores/authStore';
import { devLog } from '../../../services/utils';

interface ScanResult {
  hbl: string;
  status: string;
  timestamp: string;
  success: boolean;
}

interface HBLMobileScannerProps {
  defaultStatusId?: string;
  onScanComplete?: (result: ScanResult) => void;
}

const HBLMobileScanner: Component<HBLMobileScannerProps> = (props) => {
  const { t } = useTranslation();

  // Filter status locations based on user's access permissions
  const filteredStatusList = () => {
    return authStore.filterAllowedStatusLocations(statusAllList);
  };

  // Scanner states
  const [isScanning, setIsScanning] = createSignal(false);
  const [hasPermission, setHasPermission] = createSignal<boolean | null>(null);
  const [error, setError] = createSignal<string>('');
  const [selectedStatusId, setSelectedStatusId] = createSignal(props.defaultStatusId || '');
  const [isUpdating, setIsUpdating] = createSignal(false);
  const [scanHistory, setScanHistory] = createSignal<ScanResult[]>([]);
  const [lastScannedHBL, setLastScannedHBL] = createSignal<string>('');
  const [successCount, setSuccessCount] = createSignal(0);
  const [errorCount, setErrorCount] = createSignal(0);

  // Refs
  let videoRef: HTMLVideoElement | undefined;
  let codeReader: BrowserMultiFormatReader | undefined;
  let stream: MediaStream | undefined;
  let lastProcessedCode = '';
  let processingTimeout: any = null;

  // Mobile-first styles
  const containerStyle = {
    display: 'flex',
    'flex-direction': 'column',
    height: '100vh',
    background: '#f5f5f5',
    overflow: 'hidden'
  };

  const headerStyle = {
    background: '#2c3e50',
    color: 'white',
    padding: '1rem',
    'box-shadow': '0 2px 4px rgba(0,0,0,0.1)'
  };

  const scannerContainerStyle = {
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
    'box-shadow': '0 0 20px rgba(76, 175, 80, 0.5)'
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

  const statusBarStyle = {
    background: '#fff',
    padding: '1rem',
    'border-top': '1px solid #ddd'
  };

  const selectStyle = {
    width: '100%',
    padding: '0.75rem',
    border: '2px solid #ddd',
    'border-radius': '8px',
    'font-size': '1rem',
    'margin-bottom': '1rem',
    background: '#fff'
  };

  const buttonStyle = {
    width: '100%',
    padding: '1rem',
    background: selectedStatusId() ? '#4caf50' : '#9e9e9e',
    color: 'white',
    border: 'none',
    'border-radius': '8px',
    'font-size': '1.1rem',
    'font-weight': '600',
    cursor: selectedStatusId() ? 'pointer' : 'not-allowed',
    transition: 'all 0.2s ease',
    display: 'flex',
    'justify-content': 'center',
    'align-items': 'center',
    gap: '0.5rem'
  };

  const resultCardStyle = (success: boolean) => ({
    padding: '0.75rem',
    background: success ? '#d4edda' : '#f8d7da',
    color: success ? '#155724' : '#721c24',
    border: `1px solid ${success ? '#c3e6cb' : '#f5c6cb'}`,
    'border-radius': '6px',
    'margin-bottom': '0.5rem',
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'font-size': '0.875rem'
  });

  // Initialize scanner
  onMount(async () => {
    devLog('HBL Mobile Scanner mounting...');
    
    // Check if ZXing library is available
    if (typeof BrowserMultiFormatReader === 'undefined') {
      devLog('BrowserMultiFormatReader is not available');
      setError('Scanner library not loaded');
      return;
    }
    
    try {
      codeReader = new BrowserMultiFormatReader();
      devLog('BarcodeReader initialized successfully');
      await requestCameraPermission();
      devLog('Camera permission requested');
    } catch (err) {
      devLog('Failed to initialize scanner:', err);
      setError(`Failed to initialize scanner: ${err.message || err}`);
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
      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: { ideal: 'environment' }, // Back camera for mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      devLog('Camera permission granted');
      setHasPermission(true);
      mediaStream.getTracks().forEach(track => track.stop());
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
      setError('Video element not ready');
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

      devLog('Starting decode with constraints:', constraints);

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

      // Store the stream for later cleanup
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

  // Handle scan result
  const handleScanResult = async (scannedCode: string) => {
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

    // Validate HBL format
    if (!isValidHBL(scannedCode)) {
      addToHistory({
        hbl: scannedCode,
        status: 'Invalid HBL format',
        timestamp: new Date().toLocaleString(),
        success: false
      });
      setErrorCount(prev => prev + 1);
      return;
    }

    if (!selectedStatusId()) {
      addToHistory({
        hbl: scannedCode,
        status: 'No status selected',
        timestamp: new Date().toLocaleString(),
        success: false
      });
      setErrorCount(prev => prev + 1);
      return;
    }

    setIsUpdating(true);
    setLastScannedHBL(scannedCode);

    try {
      const result = await updateHBLStatus(
        scannedCode,
        selectedStatusId(),
        `Mobile scan update at ${new Date().toLocaleString()}`
      );

      const statusLabel = statusAllList.find(s => s.id === selectedStatusId())?.label || 'Unknown';

      if (result.success) {
        const scanResult: ScanResult = {
          hbl: scannedCode,
          status: statusLabel,
          timestamp: new Date().toLocaleString(),
          success: true
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
          hbl: scannedCode,
          status: `Error: ${result.error}`,
          timestamp: new Date().toLocaleString(),
          success: false
        });
        setErrorCount(prev => prev + 1);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addToHistory({
        hbl: scannedCode,
        status: `Error: ${errorMessage}`,
        timestamp: new Date().toLocaleString(),
        success: false
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

  // Toggle scanning
  const toggleScanning = () => {
    if (isScanning()) {
      stopScanning();
    } else {
      startScanning();
    }
  };

  // Add CSS animation
  onMount(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes scan {
        0% { top: 0; }
        100% { top: 100%; }
      }
    `;
    document.head.appendChild(style);
  });

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h2 style={{ margin: '0 0 0.5rem 0', 'font-size': '1.5rem' }}>HBL Scanner</h2>
        <div style={{ display: 'flex', gap: '1rem', 'font-size': '0.875rem' }}>
          <span>✅ {successCount()}</span>
          <span>❌ {errorCount()}</span>
          <span>📦 Total: {scanHistory().length}</span>
        </div>
        {/* Debug info */}
        <div style={{ 'font-size': '0.75rem', opacity: '0.7', 'margin-top': '0.25rem' }}>
          Permission: {hasPermission() === null ? 'checking...' : hasPermission() ? 'granted' : 'denied'} | 
          Scanner: {isScanning() ? 'active' : 'inactive'} | 
          Reader: {typeof codeReader !== 'undefined' ? 'ready' : 'not ready'}
        </div>
      </div>

      {/* Scanner Area */}
      <div style={scannerContainerStyle}>
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
            <div style={{ 'font-size': '3rem', 'margin-bottom': '1rem' }}>📷</div>
            <h3>Camera Permission Required</h3>
            <p>Please allow camera access to scan HBL codes</p>
            <button 
              style={{ ...buttonStyle, 'margin-top': '1rem', width: 'auto', padding: '0.75rem 2rem' }}
              onClick={requestCameraPermission}
            >
              Grant Permission
            </button>
          </div>
        </Show>

        <Show when={hasPermission() && !isScanning()}>
          <div style={{ 
            display: 'flex',
            'flex-direction': 'column',
            'justify-content': 'center',
            'align-items': 'center',
            height: '100%',
            color: 'white',
            padding: '2rem'
          }}>
            <div style={{ 'font-size': '4rem', 'margin-bottom': '1rem' }}>📱</div>
            <h3>Ready to Scan</h3>
            <p>Select a status and start scanning</p>
          </div>
        </Show>

        <Show when={isScanning()}>
          <video ref={videoRef} style={videoStyle} autoplay playsinline />
          <div style={overlayStyle}>
            <div style={scanLineStyle} />
          </div>
          
          {/* Scanning indicator */}
          <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '0.75rem 1.5rem',
            'border-radius': '24px',
            display: 'flex',
            'align-items': 'center',
            gap: '0.5rem'
          }}>
            <Show when={!isUpdating()} fallback={<span>Processing {lastScannedHBL()}...</span>}>
              <span>🎯 Scanning for HBL codes...</span>
            </Show>
          </div>
        </Show>

        {/* Error display */}
        <Show when={error()}>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: '#f8d7da',
            color: '#721c24',
            padding: '1rem',
            'border-radius': '8px',
            'text-align': 'center',
            'max-width': '80%'
          }}>
            {error()}
          </div>
        </Show>
      </div>

      {/* Status Bar and Controls */}
      <div style={statusBarStyle}>
        <select
          style={selectStyle}
          value={selectedStatusId()}
          onChange={(e) => setSelectedStatusId(e.currentTarget.value)}
          disabled={isScanning()}
        >
          <option value="">-- Select Status --</option>
          <For each={filteredStatusList()}>
            {(status) => (
              <option value={status.id}>
                {status.label} {status.tag ? `(${status.tag})` : ''}
              </option>
            )}
          </For>
        </select>

        <button
          style={buttonStyle}
          onClick={toggleScanning}
          disabled={!selectedStatusId() || hasPermission() === false}
        >
          <Show when={!isScanning()} fallback={
            <>
              <span>⏹</span>
              <span>Stop Scanning</span>
            </>
          }>
            <span>📷</span>
            <span>Start Scanning</span>
          </Show>
        </button>

        {/* Recent Scans */}
        <Show when={scanHistory().length > 0}>
          <div style={{ 'margin-top': '1rem' }}>
            <div style={{ 
              display: 'flex', 
              'justify-content': 'space-between', 
              'align-items': 'center',
              'margin-bottom': '0.5rem'
            }}>
              <h4 style={{ margin: '0' }}>Recent Scans</h4>
              <button 
                onClick={clearHistory}
                style={{
                  padding: '0.25rem 0.75rem',
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
            
            <div style={{ 
              'max-height': '150px', 
              'overflow-y': 'auto',
              'border-radius': '8px',
              border: '1px solid #ddd'
            }}>
              <For each={scanHistory().slice(0, 5)}>
                {(result) => (
                  <div style={resultCardStyle(result.success)}>
                    <div>
                      <strong>{result.hbl}</strong>
                      <div style={{ 'font-size': '0.75rem', opacity: '0.8' }}>
                        {result.status}
                      </div>
                    </div>
                    <div style={{ 'font-size': '0.75rem', opacity: '0.8' }}>
                      {result.timestamp.split(',')[1]?.trim() || result.timestamp}
                    </div>
                  </div>
                )}
              </For>
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
};

export default HBLMobileScanner;