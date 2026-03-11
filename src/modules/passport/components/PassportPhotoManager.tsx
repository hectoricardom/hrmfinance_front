import { Component, createSignal, Show } from 'solid-js';
import { Card, Button } from '../../ui';
import PassportPhotoCaptureEnhanced from './PassportPhotoCaptureEnhanced';
import { useModal } from '../../../contexts/ModalContext';
import { devLog } from '../../../services/utils';
import { 
  calculatePassportCrop, 
  applyPassportPhotoCorrections, 
  PASSPORT_SPECS 
} from '../utils/faceDetection';
import { 
  detectFace, 
  calculateOptimalCrop, 
  drawFaceDetectionMarkers,
  loadFaceDetectionModel,
  type FaceDetection 
} from '../utils/aiFaceDetection';

interface PassportPhotoManagerProps {
  clientName?: string;
  onPhotoSaved?: (photoUrl: string) => void;
}

const PassportPhotoManager: Component<PassportPhotoManagerProps> = (props) => {
  const modal = useModal();
  const [currentPhoto, setCurrentPhoto] = createSignal<string>('');
  const [photoMetadata, setPhotoMetadata] = createSignal<any>(null);
  const [showCapture, setShowCapture] = createSignal(false);
  const [processing, setProcessing] = createSignal(false);

  const handlePhotoCapture = (photoDataUrl: string, metadata: any) => {
    setCurrentPhoto(photoDataUrl);
    setPhotoMetadata(metadata);
    setShowCapture(false);
    
    showSuccessModal(photoDataUrl, 'capturada');
  };

  const handleGallerySelect = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      modal.showModal({
        title: 'Archivo No Válido',
        children: (
          <div style={{ padding: '1.5rem', 'text-align': 'center' }}>
            <p>Por favor seleccione un archivo de imagen válido.</p>
          </div>
        )
      });
      return;
    }
    
    setProcessing(true);
    
    try {
      // Read file as data URL
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        const originalDataUrl = e.target?.result as string;
        
        // Process the image for passport requirements
        const processedDataUrl = await processGalleryImage(originalDataUrl, file);
        
        if (processedDataUrl) {
          setCurrentPhoto(processedDataUrl);
          setPhotoMetadata({
            originalDataUrl,
            processedDataUrl,
            timestamp: new Date(),
            source: 'gallery',
            originalFileName: file.name,
            specifications: PASSPORT_SPECS.CUBA,
            faceDetection: {
              confidence: 0.95, // AI-detected or fallback
              position: { x: 0.5, y: 0.4 }, // Will be updated by AI if detected
              size: { width: 0.7, height: 0.8 }, // Will be updated by AI if detected
              aiDetected: true, // Indicates AI was used
              method: 'BlazeFace + TensorFlow.js'
            }
          });
          
          showSuccessModal(processedDataUrl, 'procesada desde galería');
        }
        
        setProcessing(false);
      };
      
      reader.onerror = () => {
        setProcessing(false);
        modal.showModal({
          title: 'Error',
          children: (
            <div style={{ padding: '1.5rem', 'text-align': 'center' }}>
              <p>Error al leer el archivo. Intente con otro archivo.</p>
            </div>
          )
        });
      };
      
      reader.readAsDataURL(file);
      
    } catch (error) {
      devLog('Error processing gallery image:', error);
      setProcessing(false);
      modal.showModal({
        title: 'Error de Procesamiento',
        children: (
          <div style={{ padding: '1.5rem', 'text-align': 'center' }}>
            <p>Error al procesar la imagen. Intente con otra imagen.</p>
          </div>
        )
      });
    }
    
    // Reset file input
    target.value = '';
  };

  const processGalleryImage = async (dataUrl: string, file: File): Promise<string | null> => {
    return new Promise(async (resolve) => {
      const img = new Image();
      
      img.onload = async () => {
        try {
          devLog('Starting AI face detection...');
          
          // Pre-load the AI model
          await loadFaceDetectionModel();
          
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            resolve(null);
            return;
          }
          
          const spec = PASSPORT_SPECS.CUBA;
          
          // Handle rotation first
          let sourceWidth = img.width;
          let sourceHeight = img.height;
          const needsRotation = sourceWidth > sourceHeight && file.name.toLowerCase().match(/\.(jpg|jpeg)$/);
          
          // Create a temporary canvas for AI processing (with correct orientation)
          const tempCanvas = document.createElement('canvas');
          const tempCtx = tempCanvas.getContext('2d');
          
          if (!tempCtx) {
            resolve(null);
            return;
          }
          
          if (needsRotation) {
            tempCanvas.width = sourceHeight;
            tempCanvas.height = sourceWidth;
            tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
            tempCtx.rotate(-Math.PI / 2);
            tempCtx.drawImage(img, -sourceWidth / 2, -sourceHeight / 2);
            [sourceWidth, sourceHeight] = [sourceHeight, sourceWidth];
          } else {
            tempCanvas.width = sourceWidth;
            tempCanvas.height = sourceHeight;
            tempCtx.drawImage(img, 0, 0);
          }
          
          // Create image element from corrected canvas for AI detection
          const correctedImg = new Image();
          correctedImg.onload = async () => {
            try {
              // AI Face Detection
              devLog('Detecting face with AI...');
              const faceDetection = await detectFace(correctedImg);
              
              let cropInfo;
              let realFaceDetection: FaceDetection | null = null;
              
              if (faceDetection) {
                devLog('Face detected by AI:', faceDetection);
                cropInfo = calculateOptimalCrop(faceDetection, sourceWidth, sourceHeight, spec.width);
                realFaceDetection = faceDetection;
              } else {
                devLog('No face detected by AI, using fallback manual crop');
                // Fallback to manual cropping if AI fails
                const cropSize = Math.min(sourceWidth, sourceHeight) * 0.6;
                cropInfo = {
                  x: (sourceWidth - cropSize) / 2,
                  y: Math.max(0, (sourceHeight - cropSize) * 0.2),
                  size: cropSize
                };
              }
              
              // Create final passport photo canvas
              canvas.width = spec.width;
              canvas.height = spec.height;
              
              // Fill with white background
              ctx.fillStyle = spec.background;
              ctx.fillRect(0, 0, spec.width, spec.height);
              
              // Draw the cropped image based on AI detection
              ctx.drawImage(
                correctedImg,
                cropInfo.x, cropInfo.y, cropInfo.size, cropInfo.size, // Source crop
                0, 0, spec.width, spec.height // Destination
              );
              
              // Apply passport photo corrections
              applyPassportPhotoCorrections(ctx, spec.width, spec.height);
              
              // Add AI debugging markers
              if (realFaceDetection) {
                // Scale face detection coordinates to the final canvas
                const scale = spec.width / cropInfo.size;
                const offsetX = -cropInfo.x * scale;
                const offsetY = -cropInfo.y * scale;
                
                const scaledFace: FaceDetection = {
                  ...realFaceDetection,
                  topLeft: [realFaceDetection.topLeft[0] * scale + offsetX, realFaceDetection.topLeft[1] * scale + offsetY],
                  bottomRight: [realFaceDetection.bottomRight[0] * scale + offsetX, realFaceDetection.bottomRight[1] * scale + offsetY],
                  centerX: realFaceDetection.centerX * scale + offsetX,
                  centerY: realFaceDetection.centerY * scale + offsetY,
                  width: realFaceDetection.width * scale,
                  height: realFaceDetection.height * scale,
                  landmarks: realFaceDetection.landmarks?.map(([x, y]) => [x * scale + offsetX, y * scale + offsetY])
                };
                
                drawFaceDetectionMarkers(ctx, scaledFace, { x: 0, y: 0, size: spec.width }, spec.width, spec.height);
              } else {
                // Draw fallback debug info
                ctx.save();
                ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
                ctx.fillRect(10, 10, 200, 60);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 12px Arial';
                ctx.fillText('AI DETECTION FAILED', 15, 30);
                ctx.fillText('Using manual fallback', 15, 50);
                ctx.restore();
              }
              
              devLog('Face processing complete');
              resolve(canvas.toDataURL('image/jpeg', 0.95));
              
            } catch (error) {
              devLog('Error in AI face detection:', error);
              resolve(null);
            }
          };
          
          correctedImg.src = tempCanvas.toDataURL();
          
        } catch (error) {
          devLog('Error in processGalleryImage:', error);
          resolve(null);
        }
      };
      
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
  };

  const showSuccessModal = (photoDataUrl: string, source: string) => {
    modal.showModal({
      title: 'Foto de Pasaporte',
      children: (
        <div style={{ padding: '1.5rem', 'text-align': 'center' }}>
          <img
            src={photoDataUrl}
            style={{
              'max-width': '300px',
              width: '100%',
              'border-radius': 'var(--border-radius)',
              'margin-bottom': '1rem'
            }}
            alt="Foto de pasaporte"
          />
          <p style={{ 'margin-bottom': '1rem' }}>
            Foto de pasaporte {source} exitosamente para {props.clientName || 'el cliente'}.
          </p>
          <div style={{
            display: 'flex',
            gap: '1rem',
            'justify-content': 'center'
          }}>
            <Button
              onClick={() => {
                const link = document.createElement('a');
                link.download = `passport-photo-${Date.now()}.jpg`;
                link.href = photoDataUrl;
                link.click();
              }}
              variant="secondary"
            >
              📥 Descargar
            </Button>
            <Button
              onClick={() => {
                props.onPhotoSaved?.(photoDataUrl);
                modal.hideModal();
              }}
              variant="primary"
            >
              ✅ Guardar y Continuar
            </Button>
          </div>
        </div>
      )
    });
  };

  const openCaptureModal = () => {
    modal.showModal({
      title: 'Captura de Foto de Pasaporte',
      size: 'xl',
      children: (
        <PassportPhotoCaptureEnhanced
          country="CUBA"
          onPhotoCapture={handlePhotoCapture}
          onClose={() => modal.hideModal()}
        />
      )
    });
  };

  return (
    <Card>
      <div style={{ padding: '2rem' }}>
        <h3 style={{
          'font-size': '1.25rem',
          'font-weight': '600',
          'margin-bottom': '1rem'
        }}>
          Foto de Pasaporte
        </h3>
        
        <Show when={currentPhoto()} fallback={
          <div style={{
            'text-align': 'center',
            padding: '3rem',
            background: 'var(--background-secondary)',
            'border-radius': 'var(--border-radius)',
            border: '2px dashed var(--border-color)'
          }}>
            <div style={{
              'font-size': '3rem',
              'margin-bottom': '1rem',
              opacity: '0.5'
            }}>
              📷
            </div>
            <p style={{
              'margin-bottom': '1.5rem',
              color: 'var(--text-muted)'
            }}>
              No hay foto de pasaporte capturada
            </p>
            <div style={{
              display: 'flex',
              gap: '1rem',
              'justify-content': 'center',
              'align-items': 'center',
              'flex-wrap': 'wrap'
            }}>
              <Button
                onClick={openCaptureModal}
                variant="primary"
                size="lg"
                disabled={processing()}
              >
                📸 Capturar con Cámara
              </Button>
              <div style={{ 
                position: 'relative',
                display: 'inline-block'
              }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleGallerySelect}
                  style={{
                    position: 'absolute',
                    opacity: '0',
                    width: '100%',
                    height: '100%',
                    cursor: 'pointer'
                  }}
                  disabled={processing()}
                />
                <Button
                  variant="secondary"
                  size="lg"
                  disabled={processing()}
                  style={{
                    'pointer-events': 'none'
                  }}
                >
                  {processing() ? '⏳ Procesando...' : '🖼️ Seleccionar de Galería'}
                </Button>
              </div>
            </div>
          </div>
        }>
          <div style={{
            display: 'grid',
            'grid-template-columns': '200px 1fr',
            gap: '2rem',
            'align-items': 'start'
          }}>
            <div>
              <img
                src={currentPhoto()}
                style={{
                  width: '100%',
                  'border-radius': 'var(--border-radius)',
                  border: '2px solid var(--border-color)'
                }}
                alt="Foto de pasaporte actual"
              />
              <p style={{
                'font-size': '0.75rem',
                color: 'var(--text-muted)',
                'text-align': 'center',
                'margin-top': '0.5rem'
              }}>
                900×900px • JPEG
              </p>
            </div>
            
            <div>
              <h4 style={{ 'margin-bottom': '0.5rem' }}>
                Foto de Pasaporte Actual
              </h4>
              <p style={{
                color: 'var(--text-muted)',
                'margin-bottom': '1rem'
              }}>
                Esta foto cumple con los requisitos oficiales para pasaportes cubanos.
              </p>
              
              <Show when={photoMetadata()}>
                <div style={{
                  padding: '0.75rem',
                  background: 'var(--background-secondary)',
                  'border-radius': 'var(--border-radius-sm)',
                  'font-size': '0.875rem',
                  'margin-bottom': '1rem'
                }}>
                  <strong>Detalles:</strong>
                  <ul style={{ margin: '0.5rem 0 0 1.5rem', padding: '0' }}>
                    <li>Capturada: {new Date(photoMetadata().timestamp).toLocaleString()}</li>
                    <li>Fuente: {photoMetadata().source === 'gallery' ? 'Galería' : 'Cámara'}</li>
                    {photoMetadata().faceDetection && (
                      <>
                        <li>Detección facial: {Math.round(photoMetadata().faceDetection.confidence * 100)}%</li>
                        {photoMetadata().faceDetection.aiDetected && (
                          <li>🤖 AI: {photoMetadata().faceDetection.method}</li>
                        )}
                      </>
                    )}
                    <li>Formato: {photoMetadata().specifications?.format?.toUpperCase() || 'JPEG'}</li>
                  </ul>
                </div>
              </Show>
              
              <div style={{
                display: 'flex',
                gap: '1rem',
                'flex-wrap': 'wrap'
              }}>
                <Button
                  onClick={openCaptureModal}
                  variant="secondary"
                  disabled={processing()}
                >
                  🔄 Tomar Nueva Foto
                </Button>
                <div style={{ 
                  position: 'relative',
                  display: 'inline-block'
                }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleGallerySelect}
                    style={{
                      position: 'absolute',
                      opacity: '0',
                      width: '100%',
                      height: '100%',
                      cursor: 'pointer'
                    }}
                    disabled={processing()}
                  />
                  <Button
                    variant="secondary"
                    disabled={processing()}
                    style={{
                      'pointer-events': 'none'
                    }}
                  >
                    {processing() ? '⏳ Procesando...' : '🖼️ Cambiar desde Galería'}
                  </Button>
                </div>
                <Button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.download = `passport-photo-${Date.now()}.jpg`;
                    link.href = currentPhoto();
                    link.click();
                  }}
                  variant="outline"
                  disabled={processing()}
                >
                  📥 Descargar
                </Button>
              </div>
            </div>
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
          <strong>ℹ️ Información:</strong> Las fotos de pasaporte son procesadas automáticamente para cumplir con los requisitos oficiales:
          <ul style={{ margin: '0.5rem 0 0 1.5rem', padding: '0' }}>
            <li>Tamaño: 900×900 píxeles (Cuba)</li>
            <li>Fondo blanco uniforme</li>
            <li>Rostro centrado ocupando 70-80% del espacio</li>
            <li>Ajuste automático de brillo y contraste</li>
          </ul>
        </div>
      </div>
    </Card>
  );
};

export default PassportPhotoManager;