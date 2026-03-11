import { Component, createSignal, Show, onMount, onCleanup } from 'solid-js';
import { Card, Button } from '../../ui';
import { devLog } from '../../../services/utils';

interface FaceDetectionResult {
  detected: boolean;
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  landmarks?: {
    leftEye: { x: number; y: number };
    rightEye: { x: number; y: number };
    nose: { x: number; y: number };
    mouth: { x: number; y: number };
  };
  confidence?: number;
}

interface PassportPhotoCaptureProps {
  onPhotoCapture: (photoDataUrl: string, originalDataUrl: string) => void;
  onClose?: () => void;
}

const PassportPhotoCapture: Component<PassportPhotoCaptureProps> = (props) => {
  const [videoRef, setVideoRef] = createSignal<HTMLVideoElement | null>(null);
  const [canvasRef, setCanvasRef] = createSignal<HTMLCanvasElement | null>(null);
  const [stream, setStream] = createSignal<MediaStream | null>(null);
  const [capturing, setCapturing] = createSignal(false);
  const [photoTaken, setPhotoTaken] = createSignal(false);
  const [faceDetected, setFaceDetected] = createSignal(false);
  const [facePosition, setFacePosition] = createSignal<FaceDetectionResult['position'] | null>(null);
  const [processedPhotoUrl, setProcessedPhotoUrl] = createSignal<string>('');
  const [originalPhotoUrl, setOriginalPhotoUrl] = createSignal<string>('');
  const [error, setError] = createSignal<string>('');
  const [loading, setLoading] = createSignal(false);
  const [detectionInterval, setDetectionInterval] = createSignal<number | null>(null);

  // Passport photo requirements
  const PASSPORT_PHOTO_SIZE = 900; // 900x900 pixels
  const FACE_PERCENTAGE = 0.7; // Face should be 70-80% of frame height
  const MARGIN_TOP_PERCENTAGE = 0.1; // 10% margin from top

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
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: 'user'
        }
      });
      
      setStream(mediaStream);
      
      const video = videoRef();
      if (video) {
        video.srcObject = mediaStream;
        
        // Start face detection once video is playing
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
    // Simple face detection using basic image analysis
    // In production, you'd use a proper face detection library like face-api.js
    const interval = setInterval(() => {
      detectFace();
    }, 500);
    
    setDetectionInterval(interval);
  };

  const detectFace = () => {
    const video = videoRef();
    const canvas = canvasRef();
    if (!video || !canvas || photoTaken()) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw current frame
    ctx.drawImage(video, 0, 0);
    
    // Simple face detection simulation
    // In real implementation, use face-api.js or similar
    simulateFaceDetection(canvas, ctx);
  };

  const simulateFaceDetection = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    // This is a simplified simulation
    // Real implementation would use ML models for accurate face detection
    
    const width = canvas.width;
    const height = canvas.height;
    
    // Simulate face detection in center of frame
    const faceWidth = width * 0.3;
    const faceHeight = height * 0.4;
    const faceX = (width - faceWidth) / 2;
    const faceY = height * 0.2;
    
    // Check if we have reasonable image data in expected face area
    const imageData = ctx.getImageData(faceX, faceY, faceWidth, faceHeight);
    const hasContent = checkForContent(imageData);
    
    if (hasContent) {
      setFaceDetected(true);
      setFacePosition({
        x: faceX,
        y: faceY,
        width: faceWidth,
        height: faceHeight
      });
      
      // Draw face detection overlay
      drawFaceOverlay(ctx, faceX, faceY, faceWidth, faceHeight);
    } else {
      setFaceDetected(false);
      setFacePosition(null);
    }
  };

  const checkForContent = (imageData: ImageData): boolean => {
    // Simple check for non-uniform pixels (indicates face presence)
    const data = imageData.data;
    let variance = 0;
    let avgBrightness = 0;
    
    for (let i = 0; i < data.length; i += 4) {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      avgBrightness += brightness;
    }
    
    avgBrightness /= (data.length / 4);
    
    for (let i = 0; i < data.length; i += 4) {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      variance += Math.pow(brightness - avgBrightness, 2);
    }
    
    variance /= (data.length / 4);
    
    // If variance is high enough, we likely have a face
    return variance > 500;
  };

  const drawFaceOverlay = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) => {
    ctx.strokeStyle = faceDetected() ? '#4CAF50' : '#FFA500';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, width, height);
    
    // Draw guide for optimal positioning
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    
    ctx.beginPath();
    ctx.moveTo(centerX - 20, centerY);
    ctx.lineTo(centerX + 20, centerY);
    ctx.moveTo(centerX, centerY - 20);
    ctx.lineTo(centerX, centerY + 20);
    ctx.stroke();
  };

  const capturePhoto = async () => {
    const video = videoRef();
    const canvas = canvasRef();
    const position = facePosition();
    
    if (!video || !canvas || !position) {
      setError('No se detectó un rostro. Por favor, asegúrese de estar bien posicionado.');
      return;
    }
    
    setCapturing(true);
    
    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');
      
      // Capture full frame first
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      
      // Save original photo
      setOriginalPhotoUrl(canvas.toDataURL('image/jpeg', 0.95));
      
      // Process for passport requirements
      const processedCanvas = document.createElement('canvas');
      processedCanvas.width = PASSPORT_PHOTO_SIZE;
      processedCanvas.height = PASSPORT_PHOTO_SIZE;
      const processedCtx = processedCanvas.getContext('2d');
      
      if (!processedCtx) throw new Error('Could not create processed canvas');
      
      // Calculate crop area to center face with proper proportions
      const faceCenterX = position.x + position.width / 2;
      const faceCenterY = position.y + position.height / 2;
      
      // Calculate crop size based on face size
      const cropSize = Math.max(position.width, position.height) / FACE_PERCENTAGE;
      
      // Calculate crop position
      let cropX = faceCenterX - cropSize / 2;
      let cropY = faceCenterY - cropSize / 2 - (cropSize * MARGIN_TOP_PERCENTAGE);
      
      // Ensure crop stays within video bounds
      cropX = Math.max(0, Math.min(cropX, video.videoWidth - cropSize));
      cropY = Math.max(0, Math.min(cropY, video.videoHeight - cropSize));
      
      // Fill with white background
      processedCtx.fillStyle = '#FFFFFF';
      processedCtx.fillRect(0, 0, PASSPORT_PHOTO_SIZE, PASSPORT_PHOTO_SIZE);
      
      // Draw cropped and scaled image
      processedCtx.drawImage(
        canvas,
        cropX, cropY, cropSize, cropSize,
        0, 0, PASSPORT_PHOTO_SIZE, PASSPORT_PHOTO_SIZE
      );
      
      // Apply slight brightness/contrast adjustment for passport photos
      applyPassportPhotoAdjustments(processedCtx);
      
      const processedUrl = processedCanvas.toDataURL('image/jpeg', 0.95);
      setProcessedPhotoUrl(processedUrl);
      setPhotoTaken(true);
      
      devLog('Passport photo captured:', {
        originalSize: `${video.videoWidth}x${video.videoHeight}`,
        facePosition: position,
        cropArea: { x: cropX, y: cropY, size: cropSize },
        outputSize: `${PASSPORT_PHOTO_SIZE}x${PASSPORT_PHOTO_SIZE}`
      });
      
    } catch (err) {
      devLog('Error capturing photo:', err);
      setError('Error al capturar la foto. Por favor, intente nuevamente.');
    } finally {
      setCapturing(false);
    }
  };

  const applyPassportPhotoAdjustments = (ctx: CanvasRenderingContext2D) => {
    const imageData = ctx.getImageData(0, 0, PASSPORT_PHOTO_SIZE, PASSPORT_PHOTO_SIZE);
    const data = imageData.data;
    
    // Slight brightness and contrast adjustment
    const brightness = 10;
    const contrast = 1.1;
    
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, (data[i] - 128) * contrast + 128 + brightness);     // Red
      data[i + 1] = Math.min(255, (data[i + 1] - 128) * contrast + 128 + brightness); // Green
      data[i + 2] = Math.min(255, (data[i + 2] - 128) * contrast + 128 + brightness); // Blue
    }
    
    ctx.putImageData(imageData, 0, 0);
  };

  const retakePhoto = () => {
    setPhotoTaken(false);
    setProcessedPhotoUrl('');
    setOriginalPhotoUrl('');
    setError('');
    startFaceDetection();
  };

  const confirmPhoto = () => {
    if (processedPhotoUrl() && originalPhotoUrl()) {
      props.onPhotoCapture(processedPhotoUrl(), originalPhotoUrl());
      stopCamera();
    }
  };

  return (
    <Card>
      <div style={{
        padding: '2rem',
        'max-width': '800px',
        margin: '0 auto'
      }}>
        <h2 style={{
          'font-size': '1.5rem',
          'font-weight': '600',
          'margin-bottom': '1rem',
          color: 'var(--text-primary)'
        }}>
          Captura de Foto de Pasaporte
        </h2>
        
        <p style={{
          'margin-bottom': '2rem',
          color: 'var(--text-muted)',
          'line-height': '1.6'
        }}>
          Posicione su rostro en el centro del marco. La foto será automáticamente ajustada a los requisitos de pasaporte (900x900px).
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
            position: 'relative',
            'margin-bottom': '2rem'
          }}>
            <video
              ref={setVideoRef}
              style={{
                width: '100%',
                'max-width': '600px',
                height: 'auto',
                'border-radius': 'var(--border-radius)',
                transform: 'scaleX(-1)', // Mirror for selfie mode
                display: 'block',
                margin: '0 auto'
              }}
              autoplay
              playsInline
            />
            
            <canvas
              ref={setCanvasRef}
              style={{
                position: 'absolute',
                top: '0',
                left: '50%',
                transform: 'translateX(-50%) scaleX(-1)',
                'max-width': '600px',
                width: '100%',
                height: 'auto',
                'pointer-events': 'none'
              }}
            />
            
            <div style={{
              'margin-top': '1rem',
              'text-align': 'center'
            }}>
              <Show when={faceDetected()} fallback={
                <p style={{ color: 'var(--warning-color)' }}>
                  🔍 Buscando rostro... Asegúrese de estar bien iluminado
                </p>
              }>
                <p style={{ color: 'var(--success-color)' }}>
                  ✅ Rostro detectado - Listo para capturar
                </p>
              </Show>
            </div>
          </div>

          <div style={{
            'text-align': 'center',
            'margin-bottom': '1rem'
          }}>
            <Button
              onClick={capturePhoto}
              disabled={!faceDetected() || capturing()}
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
          <div style={{
            'margin-bottom': '2rem'
          }}>
            <h3 style={{
              'margin-bottom': '1rem',
              'text-align': 'center'
            }}>
              Foto Procesada para Pasaporte
            </h3>
            
            <div style={{
              display: 'grid',
              'grid-template-columns': '1fr 1fr',
              gap: '1rem',
              'margin-bottom': '1rem'
            }}>
              <div>
                <h4 style={{ 'margin-bottom': '0.5rem', 'font-size': '0.875rem' }}>
                  Original
                </h4>
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
                <h4 style={{ 'margin-bottom': '0.5rem', 'font-size': '0.875rem' }}>
                  Procesada (900x900px)
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
          padding: '1rem',
          background: 'var(--info-light)',
          'border-radius': 'var(--border-radius)',
          'font-size': '0.875rem',
          color: 'var(--info-dark)'
        }}>
          <h4 style={{ 'margin-bottom': '0.5rem' }}>📋 Requisitos de Foto de Pasaporte:</h4>
          <ul style={{ 'margin': '0', 'padding-left': '1.5rem' }}>
            <li>Fondo blanco o claro</li>
            <li>Rostro centrado y visible</li>
            <li>Expresión neutral, boca cerrada</li>
            <li>Sin gafas de sol o sombreros</li>
            <li>Buena iluminación, sin sombras</li>
            <li>Foto reciente (últimos 6 meses)</li>
          </ul>
        </div>
      </div>
    </Card>
  );
};

export default PassportPhotoCapture;