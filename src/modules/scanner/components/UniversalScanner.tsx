/**
 * Universal Scanner Component
 *
 * A reusable scanner component that supports:
 * - Barcode scanning via ZXing (PDF417, QR, etc.)
 * - MRZ scanning via Tesseract.js OCR
 * - External scanner input (USB/Bluetooth scanners)
 *
 * Can be used across multiple modules: tax-clients, inventory, shipping, etc.
 */

import { Component, createSignal, createEffect, onMount, onCleanup, Show, For } from 'solid-js';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { DecodeHintType, BarcodeFormat as ZXingBarcodeFormat } from '@zxing/library';
import { createWorker, Worker as TesseractWorker } from 'tesseract.js';
import { parseMRZ, extractMRZLines, isMRZLike, type MRZData } from '../utils/mrzParser';
import type {
  UniversalScannerProps,
  ScanResult,
  BarcodeScanResult,
  MRZScanResult,
  BarcodeFormat,
  ScanMode
} from '../types/universalScannerTypes';
import { BARCODE_PRESETS } from '../types/universalScannerTypes';

// Map our format names to ZXing format enum
const formatMap: Record<BarcodeFormat, ZXingBarcodeFormat> = {
  'QR_CODE': ZXingBarcodeFormat.QR_CODE,
  'PDF_417': ZXingBarcodeFormat.PDF_417,
  'AZTEC': ZXingBarcodeFormat.AZTEC,
  'CODABAR': ZXingBarcodeFormat.CODABAR,
  'CODE_39': ZXingBarcodeFormat.CODE_39,
  'CODE_93': ZXingBarcodeFormat.CODE_93,
  'CODE_128': ZXingBarcodeFormat.CODE_128,
  'DATA_MATRIX': ZXingBarcodeFormat.DATA_MATRIX,
  'EAN_8': ZXingBarcodeFormat.EAN_8,
  'EAN_13': ZXingBarcodeFormat.EAN_13,
  'ITF': ZXingBarcodeFormat.ITF,
  'MAXICODE': ZXingBarcodeFormat.MAXICODE,
  'RSS_14': ZXingBarcodeFormat.RSS_14,
  'RSS_EXPANDED': ZXingBarcodeFormat.RSS_EXPANDED,
  'UPC_A': ZXingBarcodeFormat.UPC_A,
  'UPC_E': ZXingBarcodeFormat.UPC_E,
  'UPC_EAN_EXTENSION': ZXingBarcodeFormat.UPC_EAN_EXTENSION
};

const UniversalScanner: Component<UniversalScannerProps> = (props) => {
  // State
  const [isScanning, setIsScanning] = createSignal(false);
  const [hasPermission, setHasPermission] = createSignal<boolean | null>(null);
  const [error, setError] = createSignal('');
  const [lastResult, setLastResult] = createSignal<ScanResult | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = createSignal('');
  const [availableDevices, setAvailableDevices] = createSignal<MediaDeviceInfo[]>([]);

  // MRZ/OCR state
  const [ocrProgress, setOcrProgress] = createSignal(0);
  const [ocrStatus, setOcrStatus] = createSignal('');
  const [isMRZMode, setIsMRZMode] = createSignal(false);

  // External input
  const [externalInput, setExternalInput] = createSignal('');

  // Refs
  let videoRef: HTMLVideoElement | undefined;
  let canvasRef: HTMLCanvasElement | undefined;
  let codeReader: BrowserMultiFormatReader | null = null;
  let tesseractWorker: TesseractWorker | null = null;
  let animationFrameId: number | null = null;
  let stream: MediaStream | null = null;
  let nativeBarcodeDetector: any = null; // Native BarcodeDetector API fallback

  // Get scan mode
  const scanMode = (): ScanMode => props.mode || 'barcode';

  // Get barcode formats to use
  const getFormats = (): ZXingBarcodeFormat[] => {
    const formats = props.barcodeFormats || BARCODE_PRESETS.all;
    return formats.map(f => formatMap[f]).filter(Boolean);
  };

  // Initialize scanner
  onMount(async () => {
    console.log('🔍 UniversalScanner mounted');

    // Initialize ZXing reader with optimized hints for PDF417
    const hints = new Map();
    const formats = getFormats();
    console.log('🔍 Configured barcode formats:', formats.map(f => ZXingBarcodeFormat[f]));

    hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
    hints.set(DecodeHintType.TRY_HARDER, true);
    // Character set for PDF417 on driver's licenses
    hints.set(DecodeHintType.CHARACTER_SET, 'UTF-8');
    // Allow partial detection
    hints.set(DecodeHintType.PURE_BARCODE, false);

    codeReader = new BrowserMultiFormatReader(hints);
    console.log('🔍 ZXing reader initialized');

    // Try to initialize native BarcodeDetector as fallback (Chrome/Edge/Safari)
    if ('BarcodeDetector' in window) {
      try {
        const supportedFormats = await (window as any).BarcodeDetector.getSupportedFormats();
        console.log('🔍 Native BarcodeDetector supported formats:', supportedFormats);
        if (supportedFormats.includes('pdf417')) {
          nativeBarcodeDetector = new (window as any).BarcodeDetector({
            formats: ['pdf417', 'qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e']
          });
          console.log('🔍 Native BarcodeDetector initialized with PDF417 support');
        }
      } catch (err) {
        console.log('🔍 Native BarcodeDetector not available:', err);
      }
    }

    // Enumerate devices
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      setAvailableDevices(videoDevices);

      // Prefer back camera
      const backCamera = videoDevices.find(d =>
        d.label.toLowerCase().includes('back') ||
        d.label.toLowerCase().includes('rear') ||
        d.label.toLowerCase().includes('environment')
      );
      if (backCamera) {
        setSelectedDeviceId(backCamera.deviceId);
      } else if (videoDevices.length > 0) {
        setSelectedDeviceId(videoDevices[0].deviceId);
      }
    } catch (err) {
      console.error('Error enumerating devices:', err);
    }
  });

  // Cleanup
  onCleanup(async () => {
    stopScanning();
    if (codeReader) {
      codeReader.reset();
      codeReader = null;
    }
    if (tesseractWorker) {
      await tesseractWorker.terminate();
      tesseractWorker = null;
    }
  });

  // Watch isOpen prop
  createEffect(() => {
    if (props.isOpen) {
      startScanning();
    } else {
      stopScanning();
    }
  });

  // Initialize Tesseract worker for MRZ
  const initTesseract = async () => {
    if (tesseractWorker) return tesseractWorker;

    setOcrStatus('Initializing OCR...');
    setOcrProgress(10);

    tesseractWorker = await createWorker(props.mrzLanguages?.[0] || 'eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          setOcrProgress(10 + Math.round(m.progress * 80));
        }
      }
    });

    setOcrProgress(100);
    setOcrStatus('OCR ready');
    return tesseractWorker;
  };

  // Start scanning
  const startScanning = async () => {
    if (isScanning()) return;

    setError('');
    setIsScanning(true);

    try {
      // Request camera permission with mobile-friendly constraints
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
          deviceId: selectedDeviceId() ? { ideal: selectedDeviceId() } : undefined
        }
      };

      console.log('📷 Requesting camera with constraints:', constraints);

      stream = await navigator.mediaDevices.getUserMedia(constraints);
      setHasPermission(true);

      if (videoRef) {
        videoRef.srcObject = stream;
        await videoRef.play();

        // Log actual video dimensions
        const track = stream.getVideoTracks()[0];
        const settings = track.getSettings();
        console.log('📷 Camera started:', settings.width, 'x', settings.height);

        // Start appropriate scanning mode
        if (scanMode() === 'mrz') {
          await startMRZScanning();
        } else if (scanMode() === 'both') {
          startCombinedScanning();
        } else {
          startBarcodeScanning();
        }
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      setHasPermission(false);
      setError(err.message || 'Failed to access camera');
      setIsScanning(false);
    }
  };

  // Stop scanning
  const stopScanning = () => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
    }

    if (videoRef) {
      videoRef.srcObject = null;
    }

    setIsScanning(false);
    setIsMRZMode(false);
  };

  // Barcode scanning with ZXing using canvas capture + native fallback
  const startBarcodeScanning = () => {
    if (!videoRef || !canvasRef) {
      console.log('⚠️ Missing refs for barcode scanning');
      return;
    }

    const hasNative = !!nativeBarcodeDetector;
    const hasZxing = !!codeReader;
    console.log(`🔍 Starting barcode scanning... ZXing: ${hasZxing}, Native: ${hasNative}`);

    let scanCount = 0;
    let lastScanTime = Date.now();
    let useNativeFirst = hasNative; // Try native first if available

    const scan = async () => {
      if (!isScanning() || !videoRef || !canvasRef) return;

      // Throttle to ~8 scans per second for better performance
      const now = Date.now();
      if (now - lastScanTime < 125) {
        animationFrameId = requestAnimationFrame(scan);
        return;
      }
      lastScanTime = now;
      scanCount++;

      try {
        // Wait for video to have actual dimensions
        if (videoRef.videoWidth === 0 || videoRef.videoHeight === 0) {
          animationFrameId = requestAnimationFrame(scan);
          return;
        }

        // Capture video frame to canvas at full resolution
        const ctx = canvasRef.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          animationFrameId = requestAnimationFrame(scan);
          return;
        }

        // Use full video resolution for better barcode detection
        canvasRef.width = videoRef.videoWidth;
        canvasRef.height = videoRef.videoHeight;
        ctx.drawImage(videoRef, 0, 0);

        // Log periodically
        if (scanCount % 40 === 0) {
          console.log(`🔍 Scan #${scanCount}, resolution: ${canvasRef.width}x${canvasRef.height}`);
        }

        // Try native BarcodeDetector first (better PDF417 support on iOS/Chrome)
        if (nativeBarcodeDetector && useNativeFirst) {
          try {
            const barcodes = await nativeBarcodeDetector.detect(canvasRef);
            if (barcodes && barcodes.length > 0) {
              const barcode = barcodes[0];
              console.log('✅ Native barcode found!', barcode.format, barcode.rawValue.substring(0, 80) + '...');
              handleBarcodeResult(barcode.rawValue, barcode.format.toUpperCase());
              return;
            }
          } catch (nativeErr) {
            // Native failed, try ZXing
            if (scanCount % 100 === 0) {
              console.log('🔍 Native detection failed, using ZXing fallback');
            }
          }
        }

        // Try ZXing
        if (codeReader) {
          // Convert canvas to image for decoding
          const dataUrl = canvasRef.toDataURL('image/jpeg', 0.9);
          const img = new Image();
          img.src = dataUrl;

          await new Promise<void>((resolve) => {
            img.onload = () => resolve();
            // Timeout if image doesn't load
            setTimeout(resolve, 100);
          });

          if (img.complete && img.naturalWidth > 0) {
            const result = await codeReader.decodeFromImageElement(img);
            if (result) {
              const formatName = ZXingBarcodeFormat[result.getBarcodeFormat()] || result.getBarcodeFormat().toString();
              console.log('✅ ZXing barcode found!', formatName, result.getText().substring(0, 80) + '...');
              handleBarcodeResult(result.getText(), formatName);
              return;
            }
          }
        }
      } catch (err: any) {
        // Ignore "not found" errors - these are expected when no barcode is visible
        const msg = err.message || err.toString() || '';
        if (!msg.includes('No MultiFormat') &&
            !msg.includes('NotFoundException') &&
            !msg.includes('not found')) {
          // Only log unexpected errors occasionally
          if (scanCount % 80 === 0) {
            console.log('🔍 Scanning... (no barcode found)');
          }
        }
      }

      // Continue scanning
      animationFrameId = requestAnimationFrame(scan);
    };

    scan();
  };

  // MRZ scanning with Tesseract OCR
  const startMRZScanning = async () => {
    setIsMRZMode(true);
    const worker = await initTesseract();

    const scanFrame = async () => {
      if (!isScanning() || !videoRef || !canvasRef) return;

      const ctx = canvasRef.getContext('2d');
      if (!ctx) return;

      // Capture frame from video
      canvasRef.width = videoRef.videoWidth;
      canvasRef.height = videoRef.videoHeight;
      ctx.drawImage(videoRef, 0, 0);

      // Get image data for OCR
      const imageData = canvasRef.toDataURL('image/png');

      try {
        setOcrStatus('Scanning for MRZ...');
        const { data } = await worker.recognize(imageData);

        if (data.text && isMRZLike(data.text)) {
          const mrzData = parseMRZ(data.text);
          if (mrzData) {
            handleMRZResult(mrzData, data.text, data.confidence);
            return;
          }
        }
      } catch (err) {
        console.error('OCR error:', err);
      }

      // Continue scanning every 500ms (OCR is expensive)
      setTimeout(() => {
        if (isScanning()) {
          scanFrame();
        }
      }, 500);
    };

    scanFrame();
  };

  // Combined scanning (barcode + MRZ)
  const startCombinedScanning = async () => {
    console.log('🔍 Starting combined scanning (barcode + MRZ)...');

    // Start barcode scanning
    startBarcodeScanning();

    // Also try MRZ periodically (less frequently since it's CPU intensive)
    const worker = await initTesseract();

    const checkMRZ = async () => {
      if (!isScanning() || !videoRef || !canvasRef) return;

      // Use a separate canvas for MRZ to avoid conflicts
      const mrzCanvas = document.createElement('canvas');
      const ctx = mrzCanvas.getContext('2d');
      if (!ctx || videoRef.videoWidth === 0) {
        setTimeout(checkMRZ, 1500);
        return;
      }

      mrzCanvas.width = videoRef.videoWidth;
      mrzCanvas.height = videoRef.videoHeight;
      ctx.drawImage(videoRef, 0, 0);

      try {
        const { data } = await worker.recognize(mrzCanvas.toDataURL('image/png'));
        if (data.text && isMRZLike(data.text)) {
          console.log('🔍 Potential MRZ detected, parsing...');
          const mrzData = parseMRZ(data.text);
          if (mrzData) {
            handleMRZResult(mrzData, data.text, data.confidence);
            return;
          }
        }
      } catch (err) {
        // Ignore OCR errors in combined mode
      }

      // Check again in 1.5 seconds (OCR is expensive)
      setTimeout(checkMRZ, 1500);
    };

    // Start MRZ checking after a short delay
    setTimeout(checkMRZ, 500);
  };

  // Handle barcode result
  const handleBarcodeResult = (text: string, format: string) => {
    console.log('📊 Barcode scanned:', format, text.substring(0, 50));

    const result: BarcodeScanResult = {
      type: 'barcode',
      format,
      text,
      timestamp: Date.now()
    };

    setLastResult(result);

    // Callbacks
    props.onScan?.(result);
    props.onBarcodeScan?.(text, format);

    // Close if not multi-scan
    if (!props.keepOpenAfterScan) {
      props.onClose?.();
    }
  };

  // Handle MRZ result
  const handleMRZResult = (data: MRZData, rawText: string, confidence: number) => {
    console.log('📄 MRZ scanned:', data.lastName, data.firstName);

    const result: MRZScanResult = {
      type: 'mrz',
      data,
      rawText,
      confidence,
      timestamp: Date.now()
    };

    setLastResult(result);

    // Callbacks
    props.onScan?.(result);
    props.onMRZScan?.(data);

    // Close if not multi-scan
    if (!props.keepOpenAfterScan) {
      props.onClose?.();
    }
  };

  // Handle external scanner input
  const handleExternalSubmit = () => {
    const input = externalInput().trim();
    if (!input) {
      setError('Please scan or paste data first');
      return;
    }

    // Try to detect what was scanned
    if (isMRZLike(input)) {
      const mrzData = parseMRZ(input);
      if (mrzData) {
        handleMRZResult(mrzData, input, 100);
        setExternalInput('');
        return;
      }
    }

    // Treat as barcode
    handleBarcodeResult(input, 'EXTERNAL');
    setExternalInput('');
  };

  // Handle external input keydown
  const handleExternalKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleExternalSubmit();
    }
  };

  // Switch camera
  const switchCamera = async (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    if (isScanning()) {
      stopScanning();
      await startScanning();
    }
  };

  // Toggle scan mode
  const toggleMode = () => {
    setIsMRZMode(!isMRZMode());
    if (isScanning()) {
      stopScanning();
      startScanning();
    }
  };

  // Styles
  const modalStyle = {
    position: 'fixed' as const,
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    'background-color': 'rgba(0, 0, 0, 0.9)',
    'z-index': '9999',
    display: 'flex',
    'flex-direction': 'column' as const,
    'align-items': 'center',
    'justify-content': 'center',
    padding: '1rem'
  };

  const containerStyle = {
    'background-color': 'white',
    'border-radius': '12px',
    'max-width': '600px',
    width: '100%',
    'max-height': '90vh',
    'overflow-y': 'auto' as const
  };

  const headerStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '1rem',
    'border-bottom': '1px solid #e5e7eb'
  };

  const videoContainerStyle = {
    position: 'relative' as const,
    width: '100%',
    'aspect-ratio': '4/3',
    background: '#000',
    'overflow': 'hidden'
  };

  const videoStyle = {
    width: '100%',
    height: '100%',
    'object-fit': 'cover' as const
  };

  const overlayStyle = {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '80%',
    height: '60%',
    border: '2px solid #22c55e',
    'border-radius': '8px',
    'box-shadow': '0 0 0 9999px rgba(0, 0, 0, 0.5)'
  };

  const controlsStyle = {
    padding: '1rem',
    display: 'flex',
    'flex-direction': 'column' as const,
    gap: '0.75rem'
  };

  const buttonStyle = (primary: boolean = false) => ({
    padding: '0.75rem 1.5rem',
    'border-radius': '8px',
    border: primary ? 'none' : '1px solid #d1d5db',
    background: primary ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' : 'white',
    color: primary ? 'white' : '#374151',
    'font-weight': '600',
    cursor: 'pointer',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    gap: '0.5rem'
  });

  return (
    <Show when={props.isOpen}>
      <div style={modalStyle} onClick={(e) => e.target === e.currentTarget && props.onClose?.()}>
        <div style={containerStyle}>
          {/* Header */}
          <div style={headerStyle}>
            <h3 style={{ margin: 0, 'font-size': '1.125rem', 'font-weight': '600' }}>
              {props.title || (scanMode() === 'mrz' ? 'Scan MRZ / Passport' : 'Scan Barcode')}
            </h3>
            <button
              onClick={() => props.onClose?.()}
              style={{
                background: 'none',
                border: 'none',
                'font-size': '1.5rem',
                cursor: 'pointer',
                color: '#6b7280',
                padding: '0.25rem'
              }}
            >
              ×
            </button>
          </div>

          {/* Error display */}
          <Show when={error()}>
            <div style={{
              padding: '0.75rem 1rem',
              margin: '0.5rem 1rem',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              'border-radius': '8px',
              color: '#dc2626',
              'font-size': '0.875rem'
            }}>
              {error()}
            </div>
          </Show>

          {/* External Scanner Input */}
          <Show when={props.showExternalInput !== false}>
            <div style={{
              padding: '1rem',
              background: 'linear-gradient(135deg, #fdf4ff 0%, #f5f3ff 100%)',
              margin: '0.5rem 1rem',
              'border-radius': '8px',
              border: '1px solid #e9d5ff'
            }}>
              <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', 'margin-bottom': '0.5rem' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#9333ea" style={{ width: '18px', height: '18px' }}>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                <span style={{ 'font-weight': '600', color: '#7c3aed', 'font-size': '0.875rem' }}>
                  External Scanner
                </span>
                <span style={{
                  'font-size': '0.625rem',
                  color: '#9333ea',
                  background: '#f3e8ff',
                  padding: '0.125rem 0.375rem',
                  'border-radius': '9999px'
                }}>
                  Recommended
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={externalInput()}
                  onInput={(e) => setExternalInput(e.currentTarget.value)}
                  onKeyDown={handleExternalKeyDown}
                  placeholder={props.externalInputPlaceholder || 'Click here and scan with external scanner...'}
                  style={{
                    flex: 1,
                    padding: '0.625rem 0.75rem',
                    'font-size': '0.875rem',
                    border: '2px solid #c4b5fd',
                    'border-radius': '6px',
                    background: 'white',
                    outline: 'none'
                  }}
                />
                <button onClick={handleExternalSubmit} style={buttonStyle(true)}>
                  Process
                </button>
              </div>
            </div>
          </Show>

          {/* Camera preview */}
          <div style={videoContainerStyle}>
            <video
              ref={videoRef!}
              style={videoStyle}
              autoplay
              muted
              playsinline
            />
            <canvas ref={canvasRef!} style={{ display: 'none' }} />

            {/* Scanning overlay */}
            <Show when={isScanning()}>
              <div style={overlayStyle} />

              {/* Scanning indicator */}
              <div style={{
                position: 'absolute',
                top: '0.5rem',
                left: '0.5rem',
                background: 'rgba(34, 197, 94, 0.9)',
                color: 'white',
                padding: '0.25rem 0.75rem',
                'border-radius': '9999px',
                'font-size': '0.75rem',
                'font-weight': '500',
                display: 'flex',
                'align-items': 'center',
                gap: '0.375rem'
              }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  background: 'white',
                  'border-radius': '50%',
                  animation: 'pulse 1s infinite'
                }} />
                {isMRZMode() ? 'Scanning MRZ...' : 'Scanning...'}
              </div>

              {/* OCR Progress */}
              <Show when={isMRZMode() && ocrProgress() > 0 && ocrProgress() < 100}>
                <div style={{
                  position: 'absolute',
                  bottom: '0.5rem',
                  left: '0.5rem',
                  right: '0.5rem',
                  background: 'rgba(0, 0, 0, 0.7)',
                  padding: '0.5rem',
                  'border-radius': '6px'
                }}>
                  <div style={{ 'font-size': '0.75rem', color: 'white', 'margin-bottom': '0.25rem' }}>
                    {ocrStatus()}
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.2)', 'border-radius': '4px', height: '4px' }}>
                    <div style={{
                      width: `${ocrProgress()}%`,
                      height: '100%',
                      background: '#22c55e',
                      'border-radius': '4px',
                      transition: 'width 0.3s'
                    }} />
                  </div>
                </div>
              </Show>
            </Show>

            {/* Instructions overlay */}
            <Show when={!isScanning() && hasPermission() === null}>
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                'align-items': 'center',
                'justify-content': 'center',
                background: 'rgba(0,0,0,0.7)',
                color: 'white',
                'text-align': 'center',
                padding: '2rem'
              }}>
                <div>
                  <div style={{ 'font-size': '2rem', 'margin-bottom': '0.5rem' }}>📷</div>
                  <div style={{ 'font-size': '0.875rem' }}>
                    {props.scanInstructions || 'Camera will start when ready'}
                  </div>
                </div>
              </div>
            </Show>

            {/* Permission denied */}
            <Show when={hasPermission() === false}>
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                'align-items': 'center',
                'justify-content': 'center',
                background: '#fef2f2',
                color: '#dc2626',
                'text-align': 'center',
                padding: '2rem'
              }}>
                <div>
                  <div style={{ 'font-size': '2rem', 'margin-bottom': '0.5rem' }}>🚫</div>
                  <div style={{ 'font-weight': '600', 'margin-bottom': '0.25rem' }}>Camera Access Denied</div>
                  <div style={{ 'font-size': '0.875rem' }}>
                    Please allow camera access to scan
                  </div>
                </div>
              </div>
            </Show>
          </div>

          {/* Controls */}
          <div style={controlsStyle}>
            {/* Camera selector */}
            <Show when={availableDevices().length > 1}>
              <select
                value={selectedDeviceId()}
                onChange={(e) => switchCamera(e.currentTarget.value)}
                style={{
                  padding: '0.5rem',
                  'border-radius': '6px',
                  border: '1px solid #d1d5db',
                  'font-size': '0.875rem'
                }}
              >
                <For each={availableDevices()}>
                  {(device) => (
                    <option value={device.deviceId}>
                      {device.label || `Camera ${availableDevices().indexOf(device) + 1}`}
                    </option>
                  )}
                </For>
              </select>
            </Show>

            {/* Mode toggle for 'both' mode */}
            <Show when={props.mode === 'both'}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setIsMRZMode(false)}
                  style={{
                    ...buttonStyle(!isMRZMode()),
                    flex: 1
                  }}
                >
                  Barcode
                </button>
                <button
                  onClick={() => setIsMRZMode(true)}
                  style={{
                    ...buttonStyle(isMRZMode()),
                    flex: 1
                  }}
                >
                  MRZ/Passport
                </button>
              </div>
            </Show>

            {/* Last result */}
            <Show when={lastResult()}>
              <div style={{
                padding: '0.75rem',
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                'border-radius': '8px',
                'font-size': '0.875rem'
              }}>
                <div style={{ 'font-weight': '600', color: '#059669', 'margin-bottom': '0.25rem' }}>
                  ✓ {lastResult()?.type === 'mrz' ? 'MRZ Scanned' : 'Barcode Scanned'}
                </div>
                <div style={{ color: '#047857', 'word-break': 'break-all' }}>
                  {lastResult()?.type === 'mrz'
                    ? `${(lastResult() as MRZScanResult).data.firstName} ${(lastResult() as MRZScanResult).data.lastName}`
                    : (lastResult() as BarcodeScanResult).text.substring(0, 100)
                  }
                  {lastResult()?.type === 'barcode' && (lastResult() as BarcodeScanResult).text.length > 100 && '...'}
                </div>
              </div>
            </Show>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => props.onClose?.()}
                style={{ ...buttonStyle(false), flex: 1 }}
              >
                Close
              </button>
              <Show when={!isScanning()}>
                <button
                  onClick={startScanning}
                  style={{ ...buttonStyle(true), flex: 1 }}
                >
                  Start Scanning
                </button>
              </Show>
              <Show when={isScanning()}>
                <button
                  onClick={stopScanning}
                  style={{ ...buttonStyle(false), flex: 1, background: '#ef4444', color: 'white', border: 'none' }}
                >
                  Stop
                </button>
              </Show>
            </div>
          </div>
        </div>
      </div>

      {/* CSS for pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </Show>
  );
};

export default UniversalScanner;

// Pre-configured scanner variants for common use cases
export const IDScanner: Component<Omit<UniversalScannerProps, 'mode' | 'barcodeFormats'>> = (props) => (
  <UniversalScanner
    {...props}
    mode="both"
    barcodeFormats={BARCODE_PRESETS.id}
    title="Scan ID Document"
    scanInstructions="Point camera at the barcode (PDF417) or MRZ zone"
  />
);

export const InventoryScanner: Component<Omit<UniversalScannerProps, 'mode' | 'barcodeFormats'>> = (props) => (
  <UniversalScanner
    {...props}
    mode="barcode"
    barcodeFormats={BARCODE_PRESETS.inventory}
    title="Scan Inventory Barcode"
    multiScan={true}
    keepOpenAfterScan={true}
  />
);

export const PassportScanner: Component<Omit<UniversalScannerProps, 'mode'>> = (props) => (
  <UniversalScanner
    {...props}
    mode="mrz"
    title="Scan Passport MRZ"
    scanInstructions="Point camera at the MRZ zone (bottom of passport data page)"
  />
);

export const ShippingScanner: Component<Omit<UniversalScannerProps, 'mode' | 'barcodeFormats'>> = (props) => (
  <UniversalScanner
    {...props}
    mode="barcode"
    barcodeFormats={BARCODE_PRESETS.shipping}
    title="Scan Shipping Label"
  />
);
