import { Component, createSignal, onCleanup, onMount, Show, For } from 'solid-js';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { scannerService, type ScannedLocationUpdate, type ScannedLocationRecord } from '../services/scannerService';

interface EnhancedBarcodeScannerProps {
  onScan?: (result: string) => void;
  onError?: (error: string) => void;
  onLocationUpdate?: (barcode: string, location: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
  autoLookupLocation?: boolean; // Auto-lookup current location when scanning
  showHistory?: boolean; // Show scan history
  keepOpenAfterScan?: boolean; // Keep camera open after successful scan
}

const EnhancedBarcodeScanner: Component<EnhancedBarcodeScannerProps> = (props) => {
  // Signals for component state
  const [isScanning, setIsScanning] = createSignal(false);
  const [hasPermission, setHasPermission] = createSignal<boolean | null>(null);
  const [error, setError] = createSignal<string>('');
  const [scannedCode, setScannedCode] = createSignal<string>('');
  const [newLocation, setNewLocation] = createSignal<string>('');
  const [currentLocation, setCurrentLocation] = createSignal<string>('');
  const [isUpdating, setIsUpdating] = createSignal(false);
  const [isLookingUp, setIsLookingUp] = createSignal(false);
  const [updateSuccess, setUpdateSuccess] = createSignal<string>('');
  const [availableDevices, setAvailableDevices] = createSignal<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = createSignal<string>('');
  const [scanHistory, setScanHistory] = createSignal<ScannedLocationRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = createSignal(false);

  // Refs
  let videoRef: HTMLVideoElement | undefined;
  let codeReader: BrowserMultiFormatReader | undefined;
  let stream: MediaStream | undefined;

  // Initialize barcode reader
  onMount(async () => {
    try {
      codeReader = new BrowserMultiFormatReader();
      await getAvailableDevices();
      await requestCameraPermission();
    } catch (err) {
      console.error('Failed to initialize barcode scanner:', err);
      setError('Failed to initialize scanner');
    }
  });

  // Cleanup on unmount
  onCleanup(() => {
    stopScanning();
  });

  // Get available camera devices
  const getAvailableDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setAvailableDevices(videoDevices);
      
      // Select back camera by default if available
      const backCamera = videoDevices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('rear')
      );
      
      if (backCamera) {
        setSelectedDeviceId(backCamera.deviceId);
      } else if (videoDevices.length > 0) {
        setSelectedDeviceId(videoDevices[0].deviceId);
      }
    } catch (err) {
      console.error('Error getting camera devices:', err);
      setError('Failed to get camera devices');
    }
  };

  // Request camera permission
  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          deviceId: selectedDeviceId() ? { exact: selectedDeviceId() } : undefined,
          facingMode: 'environment' // Prefer back camera
        } 
      });
      setHasPermission(true);
      // Stop the stream immediately as we just needed to check permission
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      console.error('Camera permission denied:', err);
      setHasPermission(false);
      setError('Camera permission is required to scan barcodes');
    }
  };

  // Start scanning
  const startScanning = async () => {
    if (!codeReader || !videoRef) {
      setError('Scanner not initialized');
      return;
    }

    try {
      setIsScanning(true);
      setError('');
      setScannedCode('');
      setCurrentLocation('');

      // Start decoding from video element
      await codeReader.decodeFromVideoDevice(
        selectedDeviceId() || undefined,
        videoRef,
        async (result, err) => {
          if (result) {
            const scannedText = result.getText();
            setScannedCode(scannedText);
            setIsScanning(false);
            
            // Auto-lookup current location if enabled
            if (props.autoLookupLocation) {
              await lookupCurrentLocation(scannedText);
            }

            // Load history if enabled
            if (props.showHistory) {
              await loadScanHistory(scannedText);
            }
            
            // Call onScan callback if provided
            if (props.onScan) {
              props.onScan(scannedText);
            }
            
            // Only stop scanning if keepOpenAfterScan is false (default behavior)
            if (!props.keepOpenAfterScan) {
              stopScanning();
            } else {
              // Reset scanned code for next scan in continuous mode
              setScannedCode('');
              setUpdateSuccess(''); // Clear success message
            }
          }
          
          if (err && !(err instanceof NotFoundException)) {
            console.error('Scanning error:', err);
          }
        }
      );
    } catch (err: any) {
      console.error('Failed to start scanning:', err);
      setError(`Failed to start scanning: ${err.message}`);
      setIsScanning(false);
    }
  };

  // Stop scanning
  const stopScanning = () => {
    if (codeReader) {
      codeReader.reset();
    }
    
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = undefined;
    }
    
    setIsScanning(false);
  };

  // Lookup current location for scanned barcode
  const lookupCurrentLocation = async (barcode: string) => {
    setIsLookingUp(true);
    try {
      const response = await scannerService.getCurrentLocation(barcode);
      if (response.success && response.data) {
        setCurrentLocation(response.data.location || 'Location not found');
      } else {
        setCurrentLocation('No location found');
      }
    } catch (err) {
      console.error('Error looking up current location:', err);
      setCurrentLocation('Error looking up location');
    } finally {
      setIsLookingUp(false);
    }
  };

  // Load scan history for barcode
  const loadScanHistory = async (barcode: string) => {
    setIsLoadingHistory(true);
    try {
      const response = await scannerService.getLocationHistory(barcode);
      if (response.success && response.data) {
        setScanHistory(response.data);
      } else {
        setScanHistory([]);
      }
    } catch (err) {
      console.error('Error loading scan history:', err);
      setScanHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Update scanned location
  const updateScannedLocation = async () => {
    if (!scannedCode() || !newLocation().trim()) {
      setError('Please scan a barcode and enter a location');
      return;
    }

    setIsUpdating(true);
    setError('');
    setUpdateSuccess('');

    try {
      const updateData: ScannedLocationUpdate = {
        barcode: scannedCode(),
        newLocation: newLocation().trim(),
        timestamp: Date.now(),
        notes: `Updated via scanner at ${new Date().toLocaleString()}`
      };

      const response = await scannerService.updateScannedLocation(updateData);
      
      if (response.success) {
        setUpdateSuccess(response.message);
        
        // Call the onLocationUpdate callback if provided
        if (props.onLocationUpdate) {
          props.onLocationUpdate(scannedCode(), newLocation());
        }
        
        // Update current location display
        setCurrentLocation(newLocation());
        
        // Reset form
        setNewLocation('');
        
        // Reload history if showing
        if (props.showHistory) {
          await loadScanHistory(scannedCode());
        }
      } else {
        setError(response.error || 'Failed to update location');
      }
      
    } catch (err: any) {
      console.error('Failed to update location:', err);
      setError(`Failed to update location: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle device change
  const handleDeviceChange = async (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    if (isScanning()) {
      stopScanning();
      setTimeout(() => startScanning(), 500);
    }
  };

  // Format date for display
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  // Styles
  const modalStyle = {
    position: 'fixed' as const,
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    'background-color': 'rgba(0, 0, 0, 0.8)',
    'z-index': '9999',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    padding: '1rem'
  };

  const containerStyle = {
    'background-color': 'white',
    'border-radius': '12px',
    padding: '1.5rem',
    'max-width': '600px',
    width: '100%',
    'max-height': '90vh',
    'overflow-y': 'auto' as const,
    position: 'relative' as const
  };

  const videoContainerStyle = {
    position: 'relative' as const,
    'border-radius': '8px',
    overflow: 'hidden',
    'margin-bottom': '1rem',
    'background-color': '#000'
  };

  const videoStyle = {
    width: '100%',
    height: '300px',
    'object-fit': 'cover' as const
  };

  const overlayStyle = {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '200px',
    height: '100px',
    border: '2px solid #00ff00',
    'border-radius': '8px',
    'pointer-events': 'none',
    'box-shadow': 'inset 0 0 0 1px rgba(0, 255, 0, 0.3)'
  };

  const buttonStyle = {
    padding: '0.75rem 1.5rem',
    'border-radius': '6px',
    border: 'none',
    'font-weight': '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    margin: '0.25rem'
  };

  const primaryButtonStyle = {
    ...buttonStyle,
    'background-color': '#007bff',
    color: 'white'
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    'background-color': '#6c757d',
    color: 'white'
  };

  const successButtonStyle = {
    ...buttonStyle,
    'background-color': '#28a745',
    color: 'white'
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #ddd',
    'border-radius': '6px',
    'font-size': '1rem',
    'margin-bottom': '1rem'
  };

  const errorStyle = {
    'background-color': '#f8d7da',
    color: '#721c24',
    padding: '0.75rem',
    'border-radius': '6px',
    'margin-bottom': '1rem',
    border: '1px solid #f5c6cb'
  };

  const successStyle = {
    'background-color': '#d4edda',
    color: '#155724',
    padding: '0.75rem',
    'border-radius': '6px',
    'margin-bottom': '1rem',
    border: '1px solid #c3e6cb'
  };

  const historyItemStyle = {
    padding: '0.75rem',
    border: '1px solid #ddd',
    'border-radius': '6px',
    'margin-bottom': '0.5rem',
    'background-color': '#f8f9fa'
  };

  //
  return (
    <Show when={props.isOpen}>
      <div style={modalStyle} onClick={(e) => e.target === e.currentTarget && props.onClose?.()}>
        <div style={containerStyle}>
          {/* Header */}
          <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '1rem' }}>
            <h2 style={{ margin: '0', 'font-size': '1.5rem' }}>📷 Enhanced Barcode Scanner</h2>
            <button
              style={{ background: 'none', border: 'none', 'font-size': '1.5rem', cursor: 'pointer' }}
              onClick={() => props.onClose?.()}
            >
              ✕
            </button>
          </div>

          {/* Error Messages */}
          <Show when={error()}>
            <div style={errorStyle}>
              ⚠️ {error()}
            </div>
          </Show>

          {/* Success Messages */}
          <Show when={updateSuccess()}>
            <div style={successStyle}>
              ✅ {updateSuccess()}
            </div>
          </Show>

          {/* Camera Permission Check */}
          <Show when={hasPermission() === false}>
            <div style={errorStyle}>
              Camera permission is required. Please allow camera access and refresh the page.
            </div>
          </Show>

          <Show when={hasPermission() === true}>
            {/* Device Selection */}
            <Show when={availableDevices().length > 1}>
              <div style={{ 'margin-bottom': '1rem' }}>
                <label style={{ display: 'block', 'margin-bottom': '0.5rem', 'font-weight': '500' }}>
                  Select Camera:
                </label>
                <select
                  style={inputStyle}
                  value={selectedDeviceId()}
                  onChange={(e) => handleDeviceChange(e.currentTarget.value)}
                >
                  <For each={availableDevices()}>
                    {(device) => (
                      <option value={device.deviceId}>
                        {device.label || `Camera ${device.deviceId.substring(0, 8)}...`}
                      </option>
                    )}
                  </For>
                </select>
              </div>
            </Show>

            {/* Video Preview */}
            <div style={videoContainerStyle}>
              <video
                ref={videoRef}
                style={videoStyle}
                autoplay
                muted
                playsinline
              />
              <div style={overlayStyle}></div>
              
              {/* Scanning Indicator */}
              <Show when={isScanning()}>
                <div style={{
                  position: 'absolute' as const,
                  top: '10px',
                  left: '10px',
                  'background-color': 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  'border-radius': '20px',
                  'font-size': '0.875rem'
                }}>
                  🔍 Scanning...
                </div>
              </Show>
            </div>

            {/* Scanner Controls */}
            <div style={{ 'text-align': 'center', 'margin-bottom': '1rem' }}>
              <Show when={!isScanning()}>
                <button
                  style={primaryButtonStyle}
                  onClick={startScanning}
                  disabled={!hasPermission()}
                >
                  📷 Start Scanning
                </button>
              </Show>
              
              <Show when={isScanning()}>
                <button
                  style={secondaryButtonStyle}
                  onClick={stopScanning}
                >
                  ⏹️ Stop Scanning
                </button>
              </Show>
            </div>

            {/* Scanned Result */}
            <Show when={scannedCode()}>
              <div style={{ 
                'background-color': '#e8f5e8', 
                padding: '1rem', 
                'border-radius': '6px', 
                'margin-bottom': '1rem',
                border: '1px solid #c3e6cb'
              }}>
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#155724' }}>
                  ✅ Scanned Successfully!
                </h3>
                <p style={{ margin: '0 0 0.5rem 0', 'font-family': 'monospace', 'font-size': '1.1rem' }}>
                  <strong>Code:</strong> {scannedCode()}
                </p>
                
                {/* Current Location Display */}
                <Show when={props.autoLookupLocation}>
                  <Show when={isLookingUp()}>
                    <p style={{ margin: '0', color: '#666' }}>
                      🔍 Looking up current location...
                    </p>
                  </Show>
                  <Show when={!isLookingUp() && currentLocation()}>
                    <p style={{ margin: '0', color: '#155724' }}>
                      <strong>Current Location:</strong> {currentLocation()}
                    </p>
                  </Show>
                </Show>
              </div>
            </Show>

            {/* Location Update Form */}
            <Show when={scannedCode()}>
              <div style={{ 'border-top': '1px solid #ddd', 'padding-top': '1rem' }}>
                <h3 style={{ 'margin-bottom': '1rem' }}>📍 Update Location</h3>
                
                <div style={{ 'margin-bottom': '1rem' }}>
                  <label style={{ display: 'block', 'margin-bottom': '0.5rem', 'font-weight': '500' }}>
                    New Location:
                  </label>
                  <input
                    type="text"
                    style={inputStyle}
                    placeholder="Enter new location (e.g., Warehouse A, Shelf B2, etc.)"
                    value={newLocation()}
                    onInput={(e) => setNewLocation(e.currentTarget.value)}
                    disabled={isUpdating()}
                  />
                </div>

                <div style={{ 'text-align': 'center' }}>
                  <button
                    style={successButtonStyle}
                    onClick={updateScannedLocation}
                    disabled={isUpdating() || !newLocation().trim()}
                  >
                    {isUpdating() ? '🔄 Updating...' : '💾 Update Location'}
                  </button>
                </div>
              </div>
            </Show>

            {/* Scan History */}
            <Show when={props.showHistory && scannedCode()}>
              <div style={{ 'border-top': '1px solid #ddd', 'padding-top': '1rem', 'margin-top': '1rem' }}>
                <h3 style={{ 'margin-bottom': '1rem' }}>📚 Scan History</h3>
                
                <Show when={isLoadingHistory()}>
                  <p style={{ 'text-align': 'center', color: '#666' }}>
                    🔄 Loading history...
                  </p>
                </Show>
                
                <Show when={!isLoadingHistory() && scanHistory().length === 0}>
                  <p style={{ 'text-align': 'center', color: '#666' }}>
                    No scan history found for this barcode.
                  </p>
                </Show>
                
                <Show when={!isLoadingHistory() && scanHistory().length > 0}>
                  <div style={{ 'max-height': '200px', 'overflow-y': 'auto' }}>
                    <For each={scanHistory().slice(0, 5)}>
                      {(record) => (
                        <div style={historyItemStyle}>
                          <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' }}>
                            <div>
                              <strong>📍 {record.location}</strong>
                              <Show when={record.notes}>
                                <div style={{ 'font-size': '0.875rem', color: '#666', 'margin-top': '0.25rem' }}>
                                  {record.notes}
                                </div>
                              </Show>
                            </div>
                            <div style={{ 'font-size': '0.75rem', color: '#666' }}>
                              {formatDate(record.lastUpdated)}
                            </div>
                          </div>
                        </div>
                      )}
                    </For>
                  </div>
                </Show>
              </div>
            </Show>
          </Show>

          {/* Instructions */}
          <div style={{
            'margin-top': '1rem',
            'padding-top': '1rem',
            'border-top': '1px solid #eee',
            'font-size': '0.875rem',
            color: '#666'
          }}>
            <h4 style={{ margin: '0 0 0.5rem 0' }}>📋 Instructions:</h4>
            <ul style={{ margin: '0', 'padding-left': '1rem' }}>
              <li>Position the barcode within the green frame</li>
              <li>Ensure good lighting for optimal scanning</li>
              <li>Hold steady until the code is detected</li>
              <Show when={props.autoLookupLocation}>
                <li>Current location will be automatically displayed</li>
              </Show>
              <li>Enter the new location after scanning</li>
              <Show when={props.showHistory}>
                <li>View scan history to see previous locations</li>
              </Show>
            </ul>
          </div>
        </div>
      </div>
    </Show>
  );
};

export default EnhancedBarcodeScanner;