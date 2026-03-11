import { Component, createSignal, onCleanup, onMount, Show, createEffect } from 'solid-js';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useModal } from '../../../contexts/ModalContext';

interface FastBarcodeScannerProps {
  onScan?: (results: string[]) => void; // Changed to array for multi-scan support
  onError?: (error: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
  keepOpenAfterScan?: boolean;
  multiScan?: boolean; // Enable multi-barcode detection
}

const FastBarcodeScanner: Component<FastBarcodeScannerProps> = (props) => {
  // Modal context
  const { showModal, hideModal } = useModal();
  
  // State management
  const [isScanning, setIsScanning] = createSignal(false);
  const [error, setError] = createSignal<string>('');
  const [scannedCodes, setScannedCodes] = createSignal<Set<string>>(new Set());
  const [scanResults, setScanResults] = createSignal<string[]>([]);
  const [scannerReady, setScannerReady] = createSignal(false);

  // Refs
  let scannerContainerRef: HTMLDivElement | undefined;
  let html5Scanner: Html5QrcodeScanner | undefined;

  // HTML5-QRCode configuration with all supported formats
  const html5Config = {
    fps: 10,
    qrbox: { width: 300, height: 200 },
    aspectRatio: 1.7777,
    disableFlip: false,
    videoConstraints: {
      facingMode: "environment"
    },
    formatsToSupport: [
      Html5QrcodeSupportedFormats.QR_CODE,
      Html5QrcodeSupportedFormats.AZTEC,
      Html5QrcodeSupportedFormats.CODABAR,
      Html5QrcodeSupportedFormats.CODE_39,
      Html5QrcodeSupportedFormats.CODE_93,
      Html5QrcodeSupportedFormats.CODE_128,
      Html5QrcodeSupportedFormats.DATA_MATRIX,
      Html5QrcodeSupportedFormats.MAXICODE,
      Html5QrcodeSupportedFormats.ITF,
      Html5QrcodeSupportedFormats.EAN_13,
      Html5QrcodeSupportedFormats.EAN_8,
      Html5QrcodeSupportedFormats.PDF_417,
      Html5QrcodeSupportedFormats.RSS_14,
      Html5QrcodeSupportedFormats.RSS_EXPANDED,
      Html5QrcodeSupportedFormats.UPC_A,
      Html5QrcodeSupportedFormats.UPC_E,
      Html5QrcodeSupportedFormats.UPC_EAN_EXTENSION
    ],
    verbose: true // Enable verbose logging
  };

  // Initialize scanner
  onMount(() => {
    console.log('📱 Fast HTML5-QRCode Scanner initialized');
    setScannerReady(true);
  });


  // Start scanner
  const startScanner = async () => {
    if (!scannerContainerRef) {
      setError('Scanner container not ready');
      return;
    }

    try {
      setIsScanning(true);
      setError('');

      // Ensure the container has an ID
      if (!scannerContainerRef.id) {
        scannerContainerRef.id = 'fast-scanner-container';
      }

      html5Scanner = new Html5QrcodeScanner(
        scannerContainerRef.id,
        html5Config,
        false // verbose
      );

      html5Scanner.render(
        (decodedText) => {
          handleScanResult(decodedText);
        },
        (error) => {
          // Ignore frequent scan errors, only log actual issues
          if (!error.includes('No QR code found') && !error.includes('QR code not found')) {
            console.warn('HTML5-QRCode scan error:', error);
          }
        }
      );

      console.log('📱 Fast HTML5-QRCode scanner started successfully');
      
    } catch (err: any) {
      console.error('Failed to start HTML5-QRCode scanner:', err);
      setError('Failed to start HTML5-QRCode scanner: ' + err.message);
      setIsScanning(false);
    }
  };

  // Handle scan result with multi-scan support
  const handleScanResult = (code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode) return;

    if (props.multiScan) {
      // Multi-scan mode: collect unique codes
      const currentCodes = scannedCodes();
      if (!currentCodes.has(cleanCode)) {
        const newCodes = new Set(currentCodes);
        newCodes.add(cleanCode);
        setScannedCodes(newCodes);
        
        const resultsArray = Array.from(newCodes);
        setScanResults(resultsArray);
        
        // Call onScan with array of all scanned codes
        if (props.onScan) {
          props.onScan(resultsArray);
        }
        
        console.log(`📊 Multi-scan: ${cleanCode} added. Total: ${resultsArray.length}`);
      }
    } else {
      // Single scan mode: return immediately
      if (props.onScan) {
        props.onScan([cleanCode]);
      }
      
      console.log(`🎯 Single scan: ${cleanCode}`);
      
      // Close scanner if not keeping open
      if (!props.keepOpenAfterScan) {
        stopScanning();
      }
    }
  };

  // Start scanning
  const startScanning = async () => {
    await startScanner();
  };

  // Stop scanning
  const stopScanning = () => {
    setIsScanning(false);
    
    try {
      if (html5Scanner) {
        html5Scanner.clear();
        html5Scanner = undefined;
      }
    } catch (err) {
      console.warn('Error stopping scanner:', err);
    }
  };

  // Clear multi-scan results
  const clearResults = () => {
    setScannedCodes(new Set());
    setScanResults([]);
  };


  // Cleanup on unmount
  onCleanup(() => {
    stopScanning();
  });

  // Handle modal show/hide based on isOpen prop
  createEffect(() => {
    if (props.isOpen) {
      showModal({
        title: `⚡ Fast Scanner`,
        children: <ScannerModalContent />,
        onClose: () => {
          stopScanning();
          props.onClose?.();
        }
      });
    } else {
      hideModal();
    }
  });

  // Create scanner modal content component
  const ScannerModalContent = () => (
    <div style={{ 
      display: 'flex', 
      'flex-direction': 'column',
      height: '70vh',
      'min-height': '500px'
    }}>
      {/* Scanner Area */}
      <div style={{
        flex: '1',
        position: 'relative',
        overflow: 'hidden',
        'background-color': '#000',
        'border-radius': '8px',
        'margin-bottom': '1rem'
      }}>
        <div 
          ref={scannerContainerRef}
          id="fast-scanner-container"
          style={{ width: '100%', height: '100%', position: 'relative' }}
        />
        
        <Show when={error()}>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            'background-color': 'rgba(255, 255, 255, 0.9)',
            padding: '1rem',
            'border-radius': '6px',
            color: '#dc3545',
            'text-align': 'center'
          }}>
            ❌ {error()}
          </div>
        </Show>
      </div>

      {/* Scanner Info */}
      <Show when={props.multiScan}> 
        <div style={{ 
          'margin-bottom': '1rem',
          'text-align': 'center',
          'font-size': '0.9rem',
          color: '#666'
        }}>
          Multi-scan mode: {scanResults().length} codes detected
        </div>
      </Show>

      {/* Controls */}
      <div style={{
        padding: '1rem',
        'background-color': '#f8f9fa',
        'border-radius': '8px'
      }}>
        <div style={{ display: 'flex', 'flex-wrap': 'wrap', gap: '0.5rem', 'align-items': 'center' }}>
          {/* Start/Stop Scanner */}
          <Show when={!isScanning()}>
            <button
              style={buttonStyle('primary')}
              onClick={startScanning}
            >
              📷 Start
            </button>
          </Show>
          
          <Show when={isScanning()}>
            <button
              style={buttonStyle('secondary')}
              onClick={stopScanning}
            >
              ⏹️ Stop
            </button>
          </Show>


          {/* Multi-scan controls */}
          <Show when={props.multiScan && scanResults().length > 0}>
            <button
              style={buttonStyle('secondary')}
              onClick={clearResults}
            >
              🗑️ Clear ({scanResults().length})
            </button>
          </Show>
        </div>

        {/* Scanner Info */}
        <div style={{ 
          'margin-top': '0.5rem', 
          'font-size': '0.8rem', 
          color: '#666',
          'text-align': 'center'
        }}>
          📱 HTML5-QRCode Scanner • Supports All Barcode Types<br/>
          <span style={{ 'font-size': '0.7rem', color: '#888' }}>
            Optimized for mobile and desktop. Supports QR, CODE128, EAN, CODE39, UPC and more.
          </span>
        </div>
        
        {/* Debug Info */}
        <Show when={import.meta.env.DEV}>
          <div style={{ 
            'margin-top': '0.5rem', 
            'font-size': '0.7rem', 
            color: '#888',
            'text-align': 'center',
            'border-top': '1px solid #eee',
            'padding-top': '0.5rem'
          }}>
            🔧 Debug: Check console for detection logs
          </div>
        </Show>
      </div>
    </div>
  );

  const buttonStyle = (variant: 'primary' | 'secondary' | 'danger' = 'primary') => {
    const colors = {
      primary: { bg: '#28a745', hover: '#218838' },
      secondary: { bg: '#6c757d', hover: '#5a6268' },
      danger: { bg: '#dc3545', hover: '#c82333' }
    };

    return {
      padding: '0.75rem 1rem',
      'background-color': colors[variant].bg,
      color: 'white',
      border: 'none',
      'border-radius': '6px',
      cursor: 'pointer',
      'font-size': '0.9rem',
      'font-weight': '500',
      margin: '0 0.25rem',
      'min-height': '44px',
      'min-width': '80px'
    };
  };

  // Return null since modal is handled by context
  return null;
};

export default FastBarcodeScanner;