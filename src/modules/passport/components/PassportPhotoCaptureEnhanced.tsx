import { Component, createSignal, Show, onMount, onCleanup, For } from 'solid-js';
import { Card, Button } from '../../ui';
import { devLog } from '../../../services/utils';
import {
  FaceDetectionResult,
  calculatePassportCrop,
  validatePassportFace,
  applyPassportPhotoCorrections,
  drawFaceGuides,
  PASSPORT_SPECS
} from '../utils/faceDetection';

interface PassportPhotoCaptureEnhancedProps {
  onPhotoCapture: (photoDataUrl: string, metadata: PhotoMetadata) => void;
  onClose?: () => void;
  country?: 'USA' | 'CUBA' | 'EU';
}

interface PhotoMetadata {
  originalDataUrl: string;
  processedDataUrl: string;
  faceDetection: FaceDetectionResult;
  cropArea: { x: number; y: number; size: number };
  timestamp: Date;
  specifications: typeof PASSPORT_SPECS[keyof typeof PASSPORT_SPECS];
}

const PassportPhotoCaptureEnhanced: Component<PassportPhotoCaptureEnhancedProps> = (props) => {
  const [videoRef, setVideoRef] = createSignal<HTMLVideoElement | null>(null);
  const [canvasRef, setCanvasRef] = createSignal<HTMLCanvasElement | null>(null);
  const [previewCanvasRef, setPreviewCanvasRef] = createSignal<HTMLCanvasElement | null>(null);
  const [stream, setStream] = createSignal<MediaStream | null>(null);
  const [capturing, setCapturing] = createSignal(false);
  const [photoTaken, setPhotoTaken] = createSignal(false);
  const [currentFace, setCurrentFace] = createSignal<FaceDetectionResult | null>(null);
  const [faceValid, setFaceValid] = createSignal(false);
  const [validationErrors, setValidationErrors] = createSignal<string[]>([]);
  const [validationWarnings, setValidationWarnings] = createSignal<string[]>([]);
  const [processedPhotoUrl, setProcessedPhotoUrl] = createSignal<string>('');
  const [originalPhotoUrl, setOriginalPhotoUrl] = createSignal<string>('');
  const [photoMetadata, setPhotoMetadata] = createSignal<PhotoMetadata | null>(null);
  const [error, setError] = createSignal<string>('');
  const [loading, setLoading] = createSignal(false);
  const [detectionInterval, setDetectionInterval] = createSignal<number | null>(null);
  const [countdown, setCountdown] = createSignal<number | null>(null);

  // Get specifications for selected country
  const specs = () => PASSPORT_SPECS[props.country || 'CUBA'];

  onMount(async () => {
    await startCamera();
  });

  onCleanup(() => {
    stopCamera();
  });

  const startCamera = async () => {
    try {
      setLoading(true);
      setError('');
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          facingMode: 'user'
        }
      });
      
      setStream(mediaStream);
      
      const video = videoRef();
      if (video) {
        video.srcObject = mediaStream;
        
        video.onloadedmetadata = () => {
          video.play();
          startFaceDetection();
        };
      }
      
      setLoading(false);
    } catch (err) {
      devLog('Error accessing camera:', err);
      setError('No se pudo acceder a la cámara. Por favor, verifique los permisos.');
      setLoading(false);
    }
  };

  const stopCamera = () => {
    const currentStream = stream();
    if (currentStream) {
      currentStream.getTracks().forEach(track => track.stop());
    }
    
    const interval = detectionInterval();
    if (interval) {
      clearInterval(interval);
    }
  };

  const startFaceDetection = () => {
    const interval = setInterval(() => {
      detectFace();
    }, 100); // Fast detection for smooth experience
    
    setDetectionInterval(interval);
  };

  const detectFace = async () => {
    const video = videoRef();
    const canvas = canvasRef();
    if (!video || !canvas || photoTaken()) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Clear previous frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Simulate face detection (replace with actual face-api.js in production)
    const face = await simulateFaceDetection(video);
    
    if (face) {
      setCurrentFace(face);
      
      // Validate face position
      const validation = validatePassportFace(face, canvas.width, canvas.height);
      setFaceValid(validation.isValid);
      setValidationErrors(validation.errors);
      setValidationWarnings(validation.warnings);
      
      // Draw face guides
      drawFaceGuides(ctx, face, validation.isValid);
      
      // Show live preview if face is valid
      if (validation.isValid) {
        updateLivePreview(video, face);
      }
    } else {
      setCurrentFace(null);
      setFaceValid(false);
      setValidationErrors(['No se detecta ningún rostro']);
      setValidationWarnings([]);
    }
  };

  const simulateFaceDetection = async (video: HTMLVideoElement): Promise<FaceDetectionResult | null> => {
    // This is a simulation - replace with actual face-api.js
    const width = video.videoWidth;
    const height = video.videoHeight;
    
    // Simulate detection in center area
    const centerX = width / 2;
    const centerY = height * 0.4;
    const faceSize = Math.min(width, height) * 0.35;
    
    // Random variations to simulate real detection
    const variation = Math.sin(Date.now() / 1000) * 10;
    
    return {
      box: {
        x: centerX - faceSize / 2 + variation,
        y: centerY - faceSize / 2,
        width: faceSize,
        height: faceSize * 1.2
      },
      landmarks: {
        leftEye: { x: centerX - faceSize * 0.15, y: centerY - faceSize * 0.1 },
        rightEye: { x: centerX + faceSize * 0.15, y: centerY - faceSize * 0.1 },
        nose: { x: centerX, y: centerY },
        mouth: { x: centerX, y: centerY + faceSize * 0.2 }
      },
      confidence: 0.85 + Math.random() * 0.1,
      angle: variation / 10
    };
  };

  const updateLivePreview = (video: HTMLVideoElement, face: FaceDetectionResult) => {
    const previewCanvas = previewCanvasRef();
    if (!previewCanvas) return;
    
    const ctx = previewCanvas.getContext('2d');
    if (!ctx) return;
    
    const spec = specs();
    previewCanvas.width = spec.width;
    previewCanvas.height = spec.height;
    
    // Calculate crop area
    const crop = calculatePassportCrop(face.box, video.videoWidth, video.videoHeight, spec.width);
    
    // Fill background
    ctx.fillStyle = spec.background;
    ctx.fillRect(0, 0, spec.width, spec.height);
    
    // Draw cropped video frame
    ctx.drawImage(
      video,
      crop.x, crop.y, crop.size, crop.size,
      0, 0, spec.width, spec.height
    );
    
    // Apply color corrections
    applyPassportPhotoCorrections(ctx, spec.width, spec.height);
  };

  const startCountdownCapture = () => {
    setCountdown(3);
    
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(countdownInterval);
          capturePhoto();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const capturePhoto = async () => {
    const video = videoRef();
    const face = currentFace();
    
    if (!video || !face) {
      setError('No se detectó un rostro válido.');
      return;
    }
    
    setCapturing(true);
    
    try {
      const spec = specs();
      
      // Create full resolution canvas
      const fullCanvas = document.createElement('canvas');
      fullCanvas.width = video.videoWidth;
      fullCanvas.height = video.videoHeight;
      const fullCtx = fullCanvas.getContext('2d');
      
      if (!fullCtx) throw new Error('Could not create canvas context');
      
      // Capture full frame
      fullCtx.drawImage(video, 0, 0);
      setOriginalPhotoUrl(fullCanvas.toDataURL('image/jpeg', 0.95));
      
      // Create processed passport photo
      const processedCanvas = document.createElement('canvas');
      processedCanvas.width = spec.width;
      processedCanvas.height = spec.height;
      const processedCtx = processedCanvas.getContext('2d');
      
      if (!processedCtx) throw new Error('Could not create processed canvas');
      
      // Calculate optimal crop
      const crop = calculatePassportCrop(face.box, video.videoWidth, video.videoHeight, spec.width);
      
      // Fill with specified background
      processedCtx.fillStyle = spec.background;
      processedCtx.fillRect(0, 0, spec.width, spec.height);
      
      // Draw cropped and scaled image
      processedCtx.drawImage(
        fullCanvas,
        crop.x, crop.y, crop.size, crop.size,
        0, 0, spec.width, spec.height
      );
      
      // Apply passport photo corrections
      applyPassportPhotoCorrections(processedCtx, spec.width, spec.height);
      
      const processedUrl = processedCanvas.toDataURL('image/jpeg', 0.95);
      setProcessedPhotoUrl(processedUrl);
      
      // Save metadata
      const metadata: PhotoMetadata = {
        originalDataUrl: fullCanvas.toDataURL('image/jpeg', 0.95),
        processedDataUrl: processedUrl,
        faceDetection: face,
        cropArea: crop,
        timestamp: new Date(),
        specifications: spec
      };
      
      setPhotoMetadata(metadata);
      setPhotoTaken(true);
      
      devLog('Passport photo captured:', {
        country: props.country || 'CUBA',
        specifications: spec,
        facePosition: face.box,
        cropArea: crop,
        confidence: face.confidence
      });
      
    } catch (err) {
      devLog('Error capturing photo:', err);
      setError('Error al capturar la foto. Por favor, intente nuevamente.');
    } finally {
      setCapturing(false);
      setCountdown(null);
    }
  };

  const retakePhoto = () => {
    setPhotoTaken(false);
    setProcessedPhotoUrl('');
    setOriginalPhotoUrl('');
    setPhotoMetadata(null);
    setError('');
    startFaceDetection();
  };

  const confirmPhoto = () => {
    const metadata = photoMetadata();
    if (processedPhotoUrl() && metadata) {
      props.onPhotoCapture(processedPhotoUrl(), metadata);
      stopCamera();
    }
  };

  return (
    <Card>
      <div style={{
        padding: '2rem',
        'max-width': '900px',
        margin: '0 auto'
      }}>
        <h2 style={{
          'font-size': '1.5rem',
          'font-weight': '600',
          'margin-bottom': '1rem',
          color: 'var(--text-primary)'
        }}>
          Captura de Foto de Pasaporte - {props.country || 'Cuba'}
        </h2>
        
        <p style={{
          'margin-bottom': '2rem',
          color: 'var(--text-muted)',
          'line-height': '1.6'
        }}>
          La foto será automáticamente ajustada a {specs().width}x{specs().height}px según los requisitos oficiales.
        </p>

        <Show when={error()}>
          <div style={{
            padding: '1rem',
            'margin-bottom': '1rem',
            background: 'var(--error-light)',
            color: 'var(--error-dark)',
            'border-radius': 'var(--border-radius-sm)',
            border: '1px solid var(--error-color)'
          }}>
            {error()}
          </div>
        </Show>

        <Show when={loading()}>
          <div style={{
            'text-align': 'center',
            padding: '3rem'
          }}>
            <p>Iniciando cámara...</p>
          </div>
        </Show>

        <Show when={!loading() && !photoTaken()}>
          <div style={{
            display: 'grid',
            'grid-template-columns': '2fr 1fr',
            gap: '2rem',
            'margin-bottom': '2rem'
          }}>
            {/* Video feed with face detection */}
            <div>
              <div style={{ position: 'relative' }}>
                <video
                  ref={setVideoRef}
                  style={{
                    width: '100%',
                    height: 'auto',
                    'border-radius': 'var(--border-radius)',
                    transform: 'scaleX(-1)',
                    display: 'block'
                  }}
                  autoplay
                  playsInline
                />
                
                <canvas
                  ref={setCanvasRef}
                  style={{
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    width: '100%',
                    height: '100%',
                    transform: 'scaleX(-1)',
                    'pointer-events': 'none'
                  }}
                />
                
                <Show when={countdown()}>
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    'font-size': '5rem',
                    'font-weight': 'bold',
                    color: 'white',
                    'text-shadow': '0 0 20px rgba(0,0,0,0.8)'
                  }}>
                    {countdown()}
                  </div>
                </Show>
              </div>
              
              {/* Status and validation */}
              <div style={{ 'margin-top': '1rem' }}>
                <Show when={currentFace()} fallback={
                  <div style={{
                    padding: '0.75rem',
                    background: 'var(--warning-light)',
                    color: 'var(--warning-dark)',
                    'border-radius': 'var(--border-radius-sm)',
                    'text-align': 'center'
                  }}>
                    🔍 Buscando rostro... Mire directamente a la cámara
                  </div>
                }>
                  <div style={{
                    padding: '0.75rem',
                    background: faceValid() ? 'var(--success-light)' : 'var(--error-light)',
                    color: faceValid() ? 'var(--success-dark)' : 'var(--error-dark)',
                    'border-radius': 'var(--border-radius-sm)'
                  }}>
                    <Show when={faceValid()} fallback={
                      <div>
                        <p style={{ margin: '0 0 0.5rem 0', 'font-weight': 'bold' }}>
                          ❌ Ajuste su posición:
                        </p>
                        <ul style={{ margin: '0', 'padding-left': '1.5rem' }}>
                          <For each={validationErrors()}>
                            {(error) => <li>{error}</li>}
                          </For>
                        </ul>
                      </div>
                    }>
                      <p style={{ margin: '0', 'font-weight': 'bold' }}>
                        ✅ Posición correcta - Listo para capturar
                      </p>
                      <Show when={validationWarnings().length > 0}>
                        <ul style={{ margin: '0.5rem 0 0 0', 'padding-left': '1.5rem' }}>
                          <For each={validationWarnings()}>
                            {(warning) => <li style={{ color: 'var(--warning-dark)' }}>{warning}</li>}
                          </For>
                        </ul>
                      </Show>
                    </Show>
                  </div>
                </Show>
              </div>
            </div>
            
            {/* Live preview */}
            <div>
              <h4 style={{ 'margin-bottom': '0.5rem' }}>Vista Previa en Vivo</h4>
              <div style={{
                position: 'relative',
                'padding-bottom': '100%',
                background: '#f0f0f0',
                'border-radius': 'var(--border-radius)',
                border: '2px solid var(--border-color)',
                overflow: 'hidden'
              }}>
                <canvas
                  ref={setPreviewCanvasRef}
                  style={{
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    width: '100%',
                    height: '100%',
                    transform: 'scaleX(-1)'
                  }}
                />
                <Show when={!faceValid()}>
                  <div style={{
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    right: '0',
                    bottom: '0',
                    display: 'flex',
                    'align-items': 'center',
                    'justify-content': 'center',
                    background: 'rgba(0,0,0,0.3)',
                    color: 'white',
                    'text-align': 'center',
                    padding: '1rem'
                  }}>
                    <p>Esperando posición correcta...</p>
                  </div>
                </Show>
              </div>
              <p style={{
                'font-size': '0.75rem',
                color: 'var(--text-muted)',
                'margin-top': '0.5rem',
                'text-align': 'center'
              }}>
                {specs().width} × {specs().height}px
              </p>
            </div>
          </div>

          <div style={{
            'text-align': 'center',
            'margin-bottom': '1rem'
          }}>
            <Button
              onClick={startCountdownCapture}
              disabled={!faceValid() || capturing() || countdown() !== null}
              variant="primary"
              size="lg"
            >
              <Show when={capturing()} fallback="📸 Capturar Foto">
                Capturando...
              </Show>
            </Button>
          </div>
        </Show>

        <Show when={photoTaken()}>
          <div style={{ 'margin-bottom': '2rem' }}>
            <h3 style={{
              'margin-bottom': '1rem',
              'text-align': 'center'
            }}>
              Foto Procesada
            </h3>
            
            <div style={{
              display: 'grid',
              'grid-template-columns': '1fr 1fr',
              gap: '2rem',
              'margin-bottom': '2rem'
            }}>
              <div>
                <h4 style={{ 'margin-bottom': '0.5rem' }}>Original</h4>
                <img
                  src={originalPhotoUrl()}
                  style={{
                    width: '100%',
                    'border-radius': 'var(--border-radius)',
                    border: '2px solid var(--border-color)'
                  }}
                  alt="Foto original"
                />
              </div>
              
              <div>
                <h4 style={{ 'margin-bottom': '0.5rem' }}>
                  Procesada ({specs().width}×{specs().height}px)
                </h4>
                <img
                  src={processedPhotoUrl()}
                  style={{
                    width: '100%',
                    'border-radius': 'var(--border-radius)',
                    border: '2px solid var(--success-color)'
                  }}
                  alt="Foto procesada"
                />
              </div>
            </div>
            
            <Show when={photoMetadata()}>
              <div style={{
                padding: '1rem',
                background: 'var(--background-secondary)',
                'border-radius': 'var(--border-radius)',
                'margin-bottom': '1rem',
                'font-size': '0.875rem'
              }}>
                <h5 style={{ 'margin-bottom': '0.5rem' }}>Detalles Técnicos:</h5>
                <ul style={{ margin: '0', 'padding-left': '1.5rem' }}>
                  <li>Confianza de detección: {Math.round(photoMetadata()!.faceDetection.confidence * 100)}%</li>
                  <li>Área de recorte: {Math.round(photoMetadata()!.cropArea.size)}px</li>
                  <li>Especificación: {props.country || 'CUBA'} ({specs().width}×{specs().height}px)</li>
                  <li>Formato: JPEG alta calidad</li>
                </ul>
              </div>
            </Show>
            
            <div style={{
              display: 'flex',
              gap: '1rem',
              'justify-content': 'center'
            }}>
              <Button
                onClick={retakePhoto}
                variant="secondary"
              >
                🔄 Tomar Otra
              </Button>
              <Button
                onClick={confirmPhoto}
                variant="primary"
              >
                ✅ Usar Esta Foto
              </Button>
            </div>
          </div>
        </Show>

        <Show when={props.onClose}>
          <div style={{
            'text-align': 'center',
            'margin-top': '1rem'
          }}>
            <Button
              onClick={() => {
                stopCamera();
                props.onClose?.();
              }}
              variant="outline"
            >
              Cancelar
            </Button>
          </div>
        </Show>

        <div style={{
          'margin-top': '2rem',
          display: 'grid',
          'grid-template-columns': '1fr 1fr',
          gap: '1rem'
        }}>
          <div style={{
            padding: '1rem',
            background: 'var(--info-light)',
            'border-radius': 'var(--border-radius)',
            'font-size': '0.875rem',
            color: 'var(--info-dark)'
          }}>
            <h4 style={{ 'margin-bottom': '0.5rem' }}>📋 Requisitos de Posición:</h4>
            <ul style={{ 'margin': '0', 'padding-left': '1.5rem' }}>
              <li>Mire directamente a la cámara</li>
              <li>Mantenga la cabeza recta</li>
              <li>Expresión neutral</li>
              <li>Rostro completamente visible</li>
              <li>Buena iluminación frontal</li>
            </ul>
          </div>
          
          <div style={{
            padding: '1rem',
            background: 'var(--warning-light)',
            'border-radius': 'var(--border-radius)',
            'font-size': '0.875rem',
            color: 'var(--warning-dark)'
          }}>
            <h4 style={{ 'margin-bottom': '0.5rem' }}>⚠️ Evitar:</h4>
            <ul style={{ 'margin': '0', 'padding-left': '1.5rem' }}>
              <li>Gafas de sol o reflejos</li>
              <li>Sombreros o gorras</li>
              <li>Sonrisas o gestos</li>
              <li>Sombras en el rostro</li>
              <li>Fondos con patrones</li>
            </ul>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default PassportPhotoCaptureEnhanced;