/**
 * DocumentScanner Component
 *
 * A comprehensive ML-powered document scanner for:
 * - US Driver's Licenses (PDF417 barcode)
 * - Passports (MRZ via TrOCR)
 * - Inventory barcodes (Code128, EAN, QR, etc.)
 */

import {
  Component,
  createSignal,
  createEffect,
  onMount,
  onCleanup,
  Show,
  For,
  createMemo
} from 'solid-js';
import type {
  DocumentScannerProps,
  ScanResult,
  ScannerState,
  ModelLoadingState,
  CameraConstraints
} from './types';

// Styles
const styles = {
  container: {
    display: 'flex',
    'flex-direction': 'column' as const,
    width: '100%',
    'max-width': '600px',
    margin: '0 auto',
    'font-family': 'system-ui, -apple-system, sans-serif'
  },

  videoContainer: {
    position: 'relative' as const,
    width: '100%',
    'aspect-ratio': '4/3',
    background: '#1a1a2e',
    'border-radius': '12px',
    overflow: 'hidden',
    'box-shadow': '0 4px 20px rgba(0, 0, 0, 0.3)'
  },

  video: {
    width: '100%',
    height: '100%',
    'object-fit': 'cover' as const
  },

  overlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    'pointer-events': 'none' as const
  },

  scanRegion: {
    position: 'absolute' as const,
    border: '2px solid',
    'border-radius': '8px',
    'box-shadow': '0 0 0 9999px rgba(0, 0, 0, 0.5)'
  },

  corners: {
    position: 'absolute' as const,
    width: '20px',
    height: '20px'
  },

  statusBar: {
    position: 'absolute' as const,
    top: '12px',
    left: '12px',
    right: '12px',
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center'
  },

  statusBadge: {
    display: 'flex',
    'align-items': 'center',
    gap: '6px',
    padding: '6px 12px',
    'border-radius': '20px',
    'font-size': '12px',
    'font-weight': '600',
    'backdrop-filter': 'blur(8px)'
  },

  pulse: {
    width: '8px',
    height: '8px',
    'border-radius': '50%',
    animation: 'pulse 1.5s infinite'
  },

  controls: {
    display: 'flex',
    gap: '12px',
    padding: '16px',
    'justify-content': 'center',
    'flex-wrap': 'wrap' as const
  },

  button: {
    padding: '12px 24px',
    'border-radius': '8px',
    border: 'none',
    'font-size': '14px',
    'font-weight': '600',
    cursor: 'pointer',
    display: 'flex',
    'align-items': 'center',
    gap: '8px',
    transition: 'all 0.2s'
  },

  primaryButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white'
  },

  secondaryButton: {
    background: '#f3f4f6',
    color: '#374151'
  },

  dangerButton: {
    background: '#ef4444',
    color: 'white'
  },

  progressContainer: {
    padding: '16px',
    background: '#f8fafc',
    'border-radius': '8px',
    margin: '12px 0'
  },

  progressBar: {
    height: '8px',
    background: '#e2e8f0',
    'border-radius': '4px',
    overflow: 'hidden'
  },

  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
    transition: 'width 0.3s'
  },

  resultCard: {
    padding: '16px',
    background: '#ecfdf5',
    border: '1px solid #a7f3d0',
    'border-radius': '8px',
    margin: '12px 0'
  },

  errorCard: {
    padding: '16px',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    'border-radius': '8px',
    margin: '12px 0',
    color: '#dc2626'
  },

  debugImage: {
    width: '100%',
    'max-height': '200px',
    'object-fit': 'contain' as const,
    'border-radius': '8px',
    margin: '12px 0',
    background: '#f1f5f9'
  },

  externalInput: {
    display: 'flex',
    gap: '8px',
    padding: '12px',
    background: 'linear-gradient(135deg, #fdf4ff 0%, #f5f3ff 100%)',
    'border-radius': '8px',
    margin: '12px 0',
    border: '1px solid #e9d5ff'
  },

  input: {
    flex: 1,
    padding: '10px 14px',
    'border-radius': '6px',
    border: '2px solid #c4b5fd',
    'font-size': '14px',
    outline: 'none'
  },

  modeSelector: {
    display: 'flex',
    gap: '8px',
    padding: '8px',
    background: '#f3f4f6',
    'border-radius': '8px',
    margin: '12px 0'
  },

  modeButton: {
    flex: 1,
    padding: '10px',
    'border-radius': '6px',
    border: 'none',
    'font-size': '13px',
    'font-weight': '500',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },

  cameraSelector: {
    padding: '8px 12px',
    'border-radius': '6px',
    border: '1px solid #d1d5db',
    background: 'white',
    'font-size': '13px',
    cursor: 'pointer'
  }
};

// Default props
const defaultProps: Partial<DocumentScannerProps> = {
  continuous: false,
  showDebug: false,
  showGuides: true,
  autoStart: true,
  preferredCamera: 'back',
  enableSound: false,
  enableVibration: true,
  scanInterval: 500, // Increased to prevent UI freezing
  maxRetries: 3,
  overlayColor: 'rgba(102, 126, 234, 0.8)',
  accentColor: '#667eea'
};

const DocumentScanner: Component<DocumentScannerProps> = (props) => {
  // Merge props with defaults
  const mergedProps = { ...defaultProps, ...props };

  // State
  const [state, setState] = createSignal<ScannerState>({
    isInitialized: false,
    isScanning: false,
    hasCamera: false,
    cameraPermission: 'unknown',
    availableDevices: [],
    modelState: {
      isLoading: false,
      progress: 0,
      status: 'Not loaded'
    }
  });

  const [selectedDevice, setSelectedDevice] = createSignal<string>('');
  const [externalInput, setExternalInput] = createSignal('');
  const [debugImage, setDebugImage] = createSignal<string | null>(null);
  const [currentMode, setCurrentMode] = createSignal(mergedProps.mode);

  // Refs
  let videoRef: HTMLVideoElement | undefined;
  let canvasRef: HTMLCanvasElement | undefined;
  let stream: MediaStream | null = null;
  let scannerService: any = null;
  let scanInterval: number | null = null;

  // Computed
  const isReady = createMemo(() =>
    state().isInitialized && state().hasCamera && state().cameraPermission === 'granted'
  );

  const scanRegionStyle = createMemo(() => {
    const mode = currentMode();
    // Different scan regions for different modes
    if (mode === 'passport') {
      // MRZ is at the bottom of the document
      return {
        ...styles.scanRegion,
        'border-color': mergedProps.overlayColor,
        left: '10%',
        right: '10%',
        bottom: '15%',
        height: '20%'
      };
    } else if (mode === 'id') {
      // PDF417 is usually on the back, full document scan
      return {
        ...styles.scanRegion,
        'border-color': mergedProps.overlayColor,
        left: '10%',
        right: '10%',
        top: '20%',
        bottom: '20%'
      };
    } else {
      // Barcode - center of frame
      return {
        ...styles.scanRegion,
        'border-color': mergedProps.overlayColor,
        left: '15%',
        right: '15%',
        top: '35%',
        bottom: '35%'
      };
    }
  });

  // Initialize scanner service
  const initializeScanner = async () => {
    try {
      setState(s => ({
        ...s,
        modelState: { isLoading: true, progress: 0, status: 'Loading scanner...' }
      }));

      // Dynamically import scanner service to enable lazy loading
      const { DocumentScannerService } = await import('./scannerService');
      scannerService = new DocumentScannerService();

      // Set up progress callback
      scannerService.onProgress = (progress: number, status: string) => {
        setState(s => ({
          ...s,
          modelState: { isLoading: progress < 100, progress, status }
        }));
        mergedProps.onModelLoad?.(progress, status);
      };

      await scannerService.initialize();

      setState(s => ({
        ...s,
        isInitialized: true,
        modelState: { isLoading: false, progress: 100, status: 'Ready' }
      }));
    } catch (error: any) {
      console.error('Scanner initialization error:', error);
      setState(s => ({
        ...s,
        error: error.message,
        modelState: { isLoading: false, progress: 0, status: 'Failed', error: error.message }
      }));
      mergedProps.onError?.(error);
    }
  };

  // Initialize camera
  const initializeCamera = async () => {
    try {
      // Enumerate devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');

      setState(s => ({
        ...s,
        hasCamera: videoDevices.length > 0,
        availableDevices: videoDevices
      }));

      // Select preferred camera
      const preferred = mergedProps.preferredCamera === 'back'
        ? videoDevices.find(d =>
            d.label.toLowerCase().includes('back') ||
            d.label.toLowerCase().includes('rear') ||
            d.label.toLowerCase().includes('environment')
          )
        : videoDevices.find(d =>
            d.label.toLowerCase().includes('front') ||
            d.label.toLowerCase().includes('user')
          );

      if (preferred) {
        setSelectedDevice(preferred.deviceId);
      } else if (videoDevices.length > 0) {
        setSelectedDevice(videoDevices[0].deviceId);
      }

      // Request camera permission
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: mergedProps.preferredCamera === 'back' ? 'environment' : 'user' },
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          deviceId: selectedDevice() ? { ideal: selectedDevice() } : undefined
        }
      };

      stream = await navigator.mediaDevices.getUserMedia(constraints);

      setState(s => ({ ...s, cameraPermission: 'granted' }));

      if (videoRef) {
        videoRef.srcObject = stream;
        await videoRef.play();
      }
    } catch (error: any) {
      console.error('Camera error:', error);
      setState(s => ({
        ...s,
        cameraPermission: error.name === 'NotAllowedError' ? 'denied' : 'unknown',
        error: error.message
      }));
      mergedProps.onError?.(error);
    }
  };

  // Start scanning
  const startScanning = () => {
    if (!isReady() || state().isScanning) return;

    setState(s => ({ ...s, isScanning: true }));

    const performScan = async () => {
      // Check if we should still be scanning
      if (!state().isScanning || !videoRef || !canvasRef || !scannerService) {
        return;
      }

      try {
        // Yield to UI thread first
        await new Promise(resolve => requestAnimationFrame(resolve));

        // Double-check we're still scanning after yield
        if (!state().isScanning) return;

        // Capture frame
        const ctx = canvasRef.getContext('2d', { willReadFrequently: true });
        if (!ctx || videoRef.videoWidth === 0 || videoRef.readyState < 2) {
          scheduleNextScan();
          return;
        }

        // Use smaller canvas for faster processing
        const maxWidth = 800;
        const scale = Math.min(1, maxWidth / videoRef.videoWidth);
        canvasRef.width = videoRef.videoWidth * scale;
        canvasRef.height = videoRef.videoHeight * scale;
        ctx.drawImage(videoRef, 0, 0, canvasRef.width, canvasRef.height);

        // Scan with timeout protection
        const scanPromise = scannerService.scanDocument(canvasRef, currentMode());
        const timeoutPromise = new Promise<null>((resolve) =>
          setTimeout(() => resolve(null), 3000)
        );

        const result = await Promise.race([scanPromise, timeoutPromise]);

        // Check we're still scanning after async operation
        if (!state().isScanning) return;

        if (result && result.parsed) {
          // Success!
          if (mergedProps.enableVibration && navigator.vibrate) {
            navigator.vibrate(100);
          }

          if (mergedProps.showDebug && result.debugImage) {
            setDebugImage(result.debugImage);
          }

          setState(s => ({ ...s, lastResult: result }));
          mergedProps.onScan(result);

          if (!mergedProps.continuous) {
            stopScanning();
            return;
          }
        }
      } catch (error: any) {
        // Ignore scan errors, just retry
        console.debug('Scan attempt failed:', error?.message || 'Unknown error');
      }

      scheduleNextScan();
    };

    const scheduleNextScan = () => {
      if (state().isScanning) {
        scanInterval = window.setTimeout(performScan, mergedProps.scanInterval);
      }
    };

    // Start with a small delay to let the camera warm up
    scanInterval = window.setTimeout(performScan, 500);
  };

  // Stop scanning
  const stopScanning = () => {
    if (scanInterval) {
      clearTimeout(scanInterval);
      scanInterval = null;
    }
    setState(s => ({ ...s, isScanning: false }));
  };

  // Handle external scanner input
  const handleExternalInput = async () => {
    const input = externalInput().trim();
    if (!input) return;

    try {
      if (!scannerService) {
        await initializeScanner();
      }

      // Parse the input based on current mode
      const mode = currentMode();
      let result: any = null;

      if (mode === 'id') {
        // Try to parse as AAMVA barcode
        const { parseAAMVA, isAAMVAFormat } = await import('./aamvaParser');
        if (isAAMVAFormat(input)) {
          const parsed = parseAAMVA(input);
          result = {
            type: 'ID',
            raw: input,
            parsed,
            confidence: parsed.isValid ? 0.95 : 0.7,
            timestamp: Date.now()
          };
        }
      } else if (mode === 'passport') {
        // Try to parse as MRZ
        const { parseMRZ, isMRZLike } = await import('./mrzParser');
        if (isMRZLike(input)) {
          const parsed = parseMRZ(input);
          if (parsed) {
            result = {
              type: 'PASSPORT',
              raw: input,
              parsed,
              confidence: parsed.isValid ? 0.95 : 0.7,
              timestamp: Date.now()
            };
          }
        }
      } else {
        // Barcode mode - just return the raw text
        result = {
          type: 'BARCODE',
          raw: input,
          parsed: { format: 'EXTERNAL', text: input },
          confidence: 1.0,
          timestamp: Date.now()
        };
      }

      if (result && result.parsed) {
        if (mergedProps.enableVibration && navigator.vibrate) {
          navigator.vibrate(100);
        }

        setState(s => ({ ...s, lastResult: result }));
        mergedProps.onScan(result);
        setExternalInput('');
      }
    } catch (error: any) {
      console.error('External input error:', error);
      mergedProps.onError?.(error);
    }
  };

  // Switch camera
  const switchCamera = async (deviceId: string) => {
    setSelectedDevice(deviceId);
    stopScanning();

    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: deviceId },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      if (videoRef) {
        videoRef.srcObject = stream;
        await videoRef.play();
      }

      if (mergedProps.autoStart) {
        startScanning();
      }
    } catch (error: any) {
      console.error('Camera switch error:', error);
      mergedProps.onError?.(error);
    }
  };

  // Lifecycle
  onMount(async () => {
    await initializeScanner();
    await initializeCamera();

    if (mergedProps.autoStart && isReady()) {
      startScanning();
    }
  });

  onCleanup(() => {
    stopScanning();

    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    if (scannerService) {
      scannerService.dispose();
    }
  });

  // Watch for mode changes
  createEffect(() => {
    const mode = currentMode();
    if (state().isScanning) {
      stopScanning();
      startScanning();
    }
  });

  return (
    <div
      style={{
        ...styles.container,
        width: mergedProps.width || '100%',
        height: mergedProps.height || 'auto'
      }}
      class={mergedProps.className}
    >
      {/* Model Loading Progress */}
      <Show when={state().modelState.isLoading}>
        <div style={styles.progressContainer}>
          <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '8px' }}>
            <span style={{ 'font-size': '13px', 'font-weight': '500' }}>
              {state().modelState.status}
            </span>
            <span style={{ 'font-size': '13px', color: '#64748b' }}>
              {Math.round(state().modelState.progress)}%
            </span>
          </div>
          <div style={styles.progressBar}>
            <div
              style={{
                ...styles.progressFill,
                width: `${state().modelState.progress}%`
              }}
            />
          </div>
        </div>
      </Show>

      {/* External Scanner Input */}
      <div style={styles.externalInput}>
        <div style={{ display: 'flex', 'align-items': 'center', gap: '6px' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#9333ea" style={{ width: '16px', height: '16px' }}>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
          <span style={{ 'font-size': '12px', 'font-weight': '600', color: '#7c3aed' }}>
            External Scanner
          </span>
        </div>
        <input
          type="text"
          value={externalInput()}
          onInput={(e) => setExternalInput(e.currentTarget.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleExternalInput()}
          placeholder="Click here and scan with external scanner..."
          style={styles.input}
        />
        <button
          onClick={handleExternalInput}
          style={{ ...styles.button, ...styles.primaryButton, padding: '10px 16px' }}
        >
          Process
        </button>
      </div>

      {/* Mode Selector */}
      <div style={styles.modeSelector}>
        <button
          onClick={() => setCurrentMode('id')}
          style={{
            ...styles.modeButton,
            background: currentMode() === 'id' ? mergedProps.accentColor : 'transparent',
            color: currentMode() === 'id' ? 'white' : '#374151'
          }}
        >
          ID / License
        </button>
        <button
          onClick={() => setCurrentMode('passport')}
          style={{
            ...styles.modeButton,
            background: currentMode() === 'passport' ? mergedProps.accentColor : 'transparent',
            color: currentMode() === 'passport' ? 'white' : '#374151'
          }}
        >
          Passport
        </button>
        <button
          onClick={() => setCurrentMode('barcode')}
          style={{
            ...styles.modeButton,
            background: currentMode() === 'barcode' ? mergedProps.accentColor : 'transparent',
            color: currentMode() === 'barcode' ? 'white' : '#374151'
          }}
        >
          Barcode
        </button>
      </div>

      {/* Video Container */}
      <div style={styles.videoContainer}>
        <video
          ref={videoRef!}
          style={styles.video}
          autoplay
          muted
          playsinline
        />
        <canvas ref={canvasRef!} style={{ display: 'none' }} />

        {/* Overlay */}
        <div style={styles.overlay}>
          {/* Scan Region Guide */}
          <Show when={mergedProps.showGuides}>
            <div style={scanRegionStyle()}>
              {/* Corner indicators */}
              <div style={{
                ...styles.corners,
                top: '-2px',
                left: '-2px',
                'border-top': `3px solid ${mergedProps.accentColor}`,
                'border-left': `3px solid ${mergedProps.accentColor}`,
                'border-radius': '4px 0 0 0'
              }} />
              <div style={{
                ...styles.corners,
                top: '-2px',
                right: '-2px',
                'border-top': `3px solid ${mergedProps.accentColor}`,
                'border-right': `3px solid ${mergedProps.accentColor}`,
                'border-radius': '0 4px 0 0'
              }} />
              <div style={{
                ...styles.corners,
                bottom: '-2px',
                left: '-2px',
                'border-bottom': `3px solid ${mergedProps.accentColor}`,
                'border-left': `3px solid ${mergedProps.accentColor}`,
                'border-radius': '0 0 0 4px'
              }} />
              <div style={{
                ...styles.corners,
                bottom: '-2px',
                right: '-2px',
                'border-bottom': `3px solid ${mergedProps.accentColor}`,
                'border-right': `3px solid ${mergedProps.accentColor}`,
                'border-radius': '0 0 4px 0'
              }} />
            </div>
          </Show>

          {/* Status Bar */}
          <div style={styles.statusBar}>
            <div
              style={{
                ...styles.statusBadge,
                background: state().isScanning
                  ? 'rgba(34, 197, 94, 0.9)'
                  : 'rgba(0, 0, 0, 0.6)',
                color: 'white'
              }}
            >
              <Show when={state().isScanning}>
                <div
                  style={{
                    ...styles.pulse,
                    background: 'white'
                  }}
                />
              </Show>
              {state().isScanning ? 'Scanning...' : 'Ready'}
            </div>

            {/* Camera Selector */}
            <Show when={state().availableDevices.length > 1}>
              <select
                value={selectedDevice()}
                onChange={(e) => switchCamera(e.currentTarget.value)}
                style={styles.cameraSelector}
              >
                <For each={state().availableDevices}>
                  {(device, index) => (
                    <option value={device.deviceId}>
                      {device.label || `Camera ${index() + 1}`}
                    </option>
                  )}
                </For>
              </select>
            </Show>
          </div>

          {/* Mode-specific instructions */}
          <div
            style={{
              position: 'absolute',
              bottom: '12px',
              left: '12px',
              right: '12px',
              'text-align': 'center',
              color: 'white',
              'font-size': '12px',
              'text-shadow': '0 1px 3px rgba(0,0,0,0.5)'
            }}
          >
            <Show when={currentMode() === 'id'}>
              Point camera at the barcode on the back of the ID
            </Show>
            <Show when={currentMode() === 'passport'}>
              Align the MRZ zone (bottom lines) within the frame
            </Show>
            <Show when={currentMode() === 'barcode'}>
              Center the barcode within the frame
            </Show>
          </div>
        </div>

        {/* Permission Denied */}
        <Show when={state().cameraPermission === 'denied'}>
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              'flex-direction': 'column',
              'align-items': 'center',
              'justify-content': 'center',
              background: '#fef2f2',
              color: '#dc2626',
              'text-align': 'center',
              padding: '24px'
            }}
          >
            <div style={{ 'font-size': '48px', 'margin-bottom': '12px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: '48px', height: '48px' }}>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <div style={{ 'font-weight': '600', 'margin-bottom': '8px' }}>Camera Access Denied</div>
            <div style={{ 'font-size': '13px', color: '#991b1b' }}>
              Please allow camera access in your browser settings to use the scanner.
            </div>
          </div>
        </Show>
      </div>

      {/* Controls */}
      <div style={styles.controls}>
        <Show when={!state().isScanning}>
          <button
            onClick={startScanning}
            disabled={!isReady()}
            style={{
              ...styles.button,
              ...styles.primaryButton,
              opacity: isReady() ? 1 : 0.5,
              cursor: isReady() ? 'pointer' : 'not-allowed'
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: '18px', height: '18px' }}>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Start Scanning
          </button>
        </Show>

        <Show when={state().isScanning}>
          <button
            onClick={stopScanning}
            style={{ ...styles.button, ...styles.dangerButton }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: '18px', height: '18px' }}>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
            Stop
          </button>
        </Show>
      </div>

      {/* Last Result */}
      <Show when={state().lastResult}>
        <div style={styles.resultCard}>
          <div style={{ display: 'flex', 'align-items': 'center', gap: '8px', 'margin-bottom': '8px' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#059669" style={{ width: '20px', height: '20px' }}>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span style={{ 'font-weight': '600', color: '#059669' }}>
              {state().lastResult?.type} Scanned Successfully
            </span>
          </div>
          <div style={{ 'font-size': '13px', color: '#047857' }}>
            <Show when={state().lastResult?.type === 'ID' && state().lastResult?.parsed}>
              {(state().lastResult?.parsed as any).firstName} {(state().lastResult?.parsed as any).lastName}
            </Show>
            <Show when={state().lastResult?.type === 'PASSPORT' && state().lastResult?.parsed}>
              {(state().lastResult?.parsed as any).firstName} {(state().lastResult?.parsed as any).lastName}
            </Show>
            <Show when={state().lastResult?.type === 'BARCODE' && state().lastResult?.parsed}>
              {(state().lastResult?.parsed as any).text?.substring(0, 50)}
              {((state().lastResult?.parsed as any).text?.length || 0) > 50 ? '...' : ''}
            </Show>
          </div>
          <Show when={state().lastResult?.confidence}>
            <div style={{ 'font-size': '11px', color: '#6b7280', 'margin-top': '4px' }}>
              Confidence: {Math.round((state().lastResult?.confidence || 0) * 100)}%
            </div>
          </Show>
        </div>
      </Show>

      {/* Debug Image */}
      <Show when={mergedProps.showDebug && debugImage()}>
        <div style={{ 'margin-top': '12px' }}>
          <div style={{ 'font-size': '12px', 'font-weight': '600', 'margin-bottom': '8px', color: '#64748b' }}>
            Processed Image (Debug)
          </div>
          <img src={debugImage()!} style={styles.debugImage} alt="Debug" />
        </div>
      </Show>

      {/* Error Display */}
      <Show when={state().error}>
        <div style={styles.errorCard}>
          <div style={{ 'font-weight': '600', 'margin-bottom': '4px' }}>Error</div>
          <div style={{ 'font-size': '13px' }}>{state().error}</div>
        </div>
      </Show>

      {/* CSS Animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.95); }
        }
      `}</style>
    </div>
  );
};

export default DocumentScanner;

// Pre-configured variants
export const IDScanner: Component<Omit<DocumentScannerProps, 'mode'>> = (props) => (
  <DocumentScanner {...props} mode="id" />
);

export const PassportScanner: Component<Omit<DocumentScannerProps, 'mode'>> = (props) => (
  <DocumentScanner {...props} mode="passport" />
);

export const InventoryScanner: Component<Omit<DocumentScannerProps, 'mode'>> = (props) => (
  <DocumentScanner {...props} mode="barcode" continuous={true} />
);
