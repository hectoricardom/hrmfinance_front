import { Component, createSignal, Show, For, onMount, onCleanup } from 'solid-js';
import { Card, Button } from '../../ui';
import { useModal } from '../../../contexts/ModalContext';
import { devLog } from '../../../services/utils';
import { 
  ClientSideFaceRecognition,
  type FaceRecognitionResult,
  type PassportValidation
} from '../utils/clientSideFaceRecognition';

interface PassportPhotoClientSideProps {
  clientName?: string;
  onPhotoSaved?: (photoUrl: string, metadata: any) => void;
}

const PassportPhotoClientSide: Component<PassportPhotoClientSideProps> = (props) => {
  const modal = useModal();
  
  // Core state
  const [faceRecognition] = createSignal(new ClientSideFaceRecognition());
  const [initialized, setInitialized] = createSignal(false);
  const [initializing, setInitializing] = createSignal(false);
  
  // Camera state
  const [stream, setStream] = createSignal<MediaStream | null>(null);
  const [captureMode, setCaptureMode] = createSignal<'camera' | 'upload'>('camera');
  
  // Photo processing state
  const [selectedFile, setSelectedFile] = createSignal<File | null>(null);
  const [originalPreview, setOriginalPreview] = createSignal<string>('');
  const [processedPhoto, setProcessedPhoto] = createSignal<string>('');
  const [processing, setProcessing] = createSignal(false);
  
  // Recognition results
  const [faceResult, setFaceResult] = createSignal<FaceRecognitionResult | null>(null);
  const [validation, setValidation] = createSignal<PassportValidation | null>(null);
  const [realTimeValidation, setRealTimeValidation] = createSignal<PassportValidation | null>(null);
  
  // Settings
  const [selectedCountry, setSelectedCountry] = createSignal<string>('CU');
  const [showDebugInfo, setShowDebugInfo] = createSignal(true);
  const [autoCapture, setAutoCapture] = createSignal(false);
  const [realTimeAnalysis, setRealTimeAnalysis] = createSignal(false);
  
  let videoRef: HTMLVideoElement | undefined;
  let canvasRef: HTMLCanvasElement | undefined;
  let analysisInterval: number | undefined;
  
  const countryOptions = [
    { value: 'US', label: '🇺🇸 USA (600×600px)' },
    { value: 'EU', label: '🇪🇺 EU (413×531px)' },
    { value: 'UK', label: '🇬🇧 UK (413×531px)' },
    { value: 'CA', label: '🇨🇦 Canada (590×826px)' },
    { value: 'CU', label: '🇨🇺 Cuba (900×900px)' },
    { value: 'IN', label: '🇮🇳 India (413×413px)' },
    { value: 'AU', label: '🇦🇺 Australia (413×531px)' }
  ];
  
  onMount(() => {
    initializeFaceRecognition();
  });
  
  onCleanup(() => {
    stopCamera();
    if (analysisInterval) {
      clearInterval(analysisInterval);
    }
  });
  
  const initializeFaceRecognition = async () => {
    setInitializing(true);
    try {
      await faceRecognition().initialize();
      setInitialized(true);
    } catch (error) {
      devLog('Failed to initialize face recognition:', error);
      modal.showModal({
        title: 'Initialization Error',
        children: (
          <div style={{ padding: '1.5rem' }}>
            <p>Failed to load face recognition models. Please refresh and try again.</p>
          </div>
        )
      });
    } finally {
      setInitializing(false);
    }
  };
  
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      });
      
      setStream(mediaStream);
      
      if (videoRef) {
        videoRef.srcObject = mediaStream;
        videoRef.play();
      }
      
      // Start real-time analysis if enabled
      if (realTimeAnalysis()) {
        startRealTimeAnalysis();
      }
      
    } catch (error) {
      devLog('Camera access error:', error);
      modal.showModal({
        title: 'Camera Access Required',
        children: (
          <div style={{ padding: '1.5rem' }}>
            <p>Please allow camera access to capture passport photos.</p>
          </div>
        )
      });
    }
  };
  
  const stopCamera = () => {
    const currentStream = stream();
    if (currentStream) {
      currentStream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    if (analysisInterval) {
      clearInterval(analysisInterval);
      analysisInterval = undefined;
    }
  };
  
  const startRealTimeAnalysis = () => {
    if (analysisInterval) clearInterval(analysisInterval);
    
    analysisInterval = setInterval(async () => {
      if (!videoRef || !canvasRef || !initialized()) return;
      
      try {
        const result = await faceRecognition().validateLiveFeed(videoRef, canvasRef);
        if (result.faceDetected && result.validation) {
          setRealTimeValidation(result.validation);
          
          // Auto-capture if conditions are perfect
          if (autoCapture() && result.validation.score >= 90) {
            capturePhoto();
          }
        } else {
          setRealTimeValidation(null);
        }
      } catch (error) {
        devLog('Real-time analysis error:', error);
      }
    }, 500); // Analyze every 500ms
  };
  
  const capturePhoto = async () => {
    if (!videoRef || !canvasRef || !initialized()) return;
    
    setProcessing(true);
    
    try {
      // Capture frame from video
      canvasRef.width = videoRef.videoWidth;
      canvasRef.height = videoRef.videoHeight;
      const ctx = canvasRef.getContext('2d');
      
      if (!ctx) throw new Error('Canvas context not available');
      
      ctx.drawImage(videoRef, 0, 0);
      
      // Detect face
      const face = await faceRecognition().detectFace(canvasRef);
      
      if (!face) {
        modal.showModal({
          title: 'No Face Detected',
          children: (
            <div style={{ padding: '1.5rem' }}>
              <p>No face was detected in the captured image. Please try again.</p>
            </div>
          )
        });
        setProcessing(false);
        return;
      }
      
      setFaceResult(face);
      
      // Validate face for passport
      const validationResult = faceRecognition().validateForPassport(face);
      setValidation(validationResult);
      
      // Calculate crop
      const cropInfo = faceRecognition().calculatePassportCrop(
        face,
        canvasRef.width,
        canvasRef.height,
        selectedCountry()
      );
      
      // Create final passport photo
      const finalCanvas = document.createElement('canvas');
      const finalCtx = finalCanvas.getContext('2d');
      
      if (!finalCtx) throw new Error('Final canvas context not available');
      
      const specs = getCountrySpecs(selectedCountry());
      finalCanvas.width = specs.width;
      finalCanvas.height = specs.height;
      
      // Fill background
      finalCtx.fillStyle = '#FFFFFF';
      finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
      
      // Draw cropped image
      finalCtx.drawImage(
        canvasRef,
        cropInfo.x, cropInfo.y, cropInfo.width, cropInfo.height,
        0, 0, finalCanvas.width, finalCanvas.height
      );
      
      // Apply enhancements
      applyImageEnhancements(finalCtx, finalCanvas.width, finalCanvas.height);
      
      const finalPhotoUrl = finalCanvas.toDataURL('image/jpeg', 0.95);
      setProcessedPhoto(finalPhotoUrl);
      
      // Show debug info if enabled
      if (showDebugInfo()) {
        faceRecognition().drawDebugOverlay(ctx, face, cropInfo);
        setOriginalPreview(canvasRef.toDataURL('image/jpeg', 0.95));
      } else {
        setOriginalPreview(canvasRef.toDataURL('image/jpeg', 0.95));
      }
      
      // Show results
      showResultsModal(finalPhotoUrl, { face, validation: validationResult, cropInfo });
      
    } catch (error) {
      devLog('Photo capture error:', error);
    } finally {
      setProcessing(false);
    }
  };
  
  const handleFileUpload = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (!file || !file.type.startsWith('image/')) return;
    
    setSelectedFile(file);
    setProcessing(true);
    
    try {
      // Create image preview
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        setOriginalPreview(dataUrl);
        
        // Create image element for processing
        const img = new Image();
        img.onload = async () => {
          // Detect face
          const face = await faceRecognition().detectFace(img);
          
          if (!face) {
            modal.showModal({
              title: 'No Face Detected',
              children: (
                <div style={{ padding: '1.5rem' }}>
                  <p>No face was detected in the uploaded image. Please try another photo.</p>
                </div>
              )
            });
            setProcessing(false);
            return;
          }
          
          setFaceResult(face);
          
          // Validate face
          const validationResult = faceRecognition().validateForPassport(face);
          setValidation(validationResult);
          
          // Calculate crop
          const cropInfo = faceRecognition().calculatePassportCrop(
            face,
            img.width,
            img.height,
            selectedCountry()
          );
          
          // Create final photo
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) throw new Error('Canvas context not available');
          
          const specs = getCountrySpecs(selectedCountry());
          canvas.width = specs.width;
          canvas.height = specs.height;
          
          // Fill background
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Draw cropped image
          ctx.drawImage(
            img,
            cropInfo.x, cropInfo.y, cropInfo.width, cropInfo.height,
            0, 0, canvas.width, canvas.height
          );
          
          // Apply enhancements
          applyImageEnhancements(ctx, canvas.width, canvas.height);
          
          const finalPhotoUrl = canvas.toDataURL('image/jpeg', 0.95);
          setProcessedPhoto(finalPhotoUrl);
          
          // Show debug info if enabled
          if (showDebugInfo()) {
            const debugCanvas = document.createElement('canvas');
            const debugCtx = debugCanvas.getContext('2d');
            if (debugCtx) {
              debugCanvas.width = img.width;
              debugCanvas.height = img.height;
              debugCtx.drawImage(img, 0, 0);
              faceRecognition().drawDebugOverlay(debugCtx, face, cropInfo);
              setOriginalPreview(debugCanvas.toDataURL('image/jpeg', 0.95));
            }
          }
          
          // Show results
          showResultsModal(finalPhotoUrl, { face, validation: validationResult, cropInfo });
          setProcessing(false);
        };
        
        img.src = dataUrl;
      };
      
      reader.readAsDataURL(file);
      
    } catch (error) {
      devLog('File processing error:', error);
      setProcessing(false);
    }
  };
  
  const getCountrySpecs = (countryCode: string) => {
    const specs: Record<string, { width: number; height: number }> = {
      US: { width: 600, height: 600 },
      EU: { width: 413, height: 531 },
      UK: { width: 413, height: 531 },
      CA: { width: 590, height: 826 },
      CU: { width: 900, height: 900 },
      IN: { width: 413, height: 413 },
      AU: { width: 413, height: 531 }
    };
    return specs[countryCode] || specs.CU;
  };
  
  const applyImageEnhancements = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    // Brightness and contrast adjustments
    const brightness = 15;
    const contrast = 1.15;
    
    for (let i = 0; i < data.length; i += 4) {
      // Apply brightness
      data[i] = Math.min(255, Math.max(0, data[i] + brightness));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + brightness));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + brightness));
      
      // Apply contrast
      data[i] = Math.min(255, Math.max(0, ((data[i] - 128) * contrast) + 128));
      data[i + 1] = Math.min(255, Math.max(0, ((data[i + 1] - 128) * contrast) + 128));
      data[i + 2] = Math.min(255, Math.max(0, ((data[i + 2] - 128) * contrast) + 128));
    }
    
    ctx.putImageData(imageData, 0, 0);
  };
  
  const showResultsModal = (finalPhoto: string, results: any) => {
    modal.showModal({
      title: 'Passport Photo Results',
      size: 'xl',
      children: (
        <div style={{ padding: '1.5rem' }}>
          <div style={{
            display: 'grid',
            'grid-template-columns': '1fr 1fr',
            gap: '2rem',
            'margin-bottom': '1.5rem'
          }}>
            <div>
              <h4 style={{ 'margin-bottom': '0.5rem' }}>
                Original {showDebugInfo() ? '(with debug)' : ''}
              </h4>
              <img
                src={originalPreview()}
                style={{
                  width: '100%',
                  'max-width': '400px',
                  'border-radius': 'var(--border-radius)',
                  border: '1px solid var(--border-color)'
                }}
                alt="Original with detection"
              />
            </div>
            
            <div>
              <h4 style={{ 'margin-bottom': '0.5rem' }}>Passport Photo</h4>
              <img
                src={finalPhoto}
                style={{
                  width: '100%',
                  'max-width': '400px',
                  'border-radius': 'var(--border-radius)',
                  border: '1px solid var(--border-color)'
                }}
                alt="Final passport photo"
              />
              <p style={{
                'font-size': '0.75rem',
                color: 'var(--text-muted)',
                'text-align': 'center',
                'margin-top': '0.5rem'
              }}>
                {getCountrySpecs(selectedCountry()).width}×{getCountrySpecs(selectedCountry()).height}px
              </p>
            </div>
          </div>
          
          {/* Validation Score */}
          <div style={{
            padding: '1rem',
            'margin-bottom': '1rem',
            background: results.validation.score >= 80 
              ? 'var(--success-light)' 
              : results.validation.score >= 60 
                ? 'var(--warning-light)' 
                : 'var(--error-light)',
            'border-radius': 'var(--border-radius)',
            'text-align': 'center'
          }}>
            <h4 style={{ 'margin-bottom': '0.5rem' }}>
              Passport Photo Score: {results.validation.score}/100
            </h4>
            <div style={{
              width: '100%',
              height: '8px',
              background: 'var(--background-secondary)',
              'border-radius': '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${results.validation.score}%`,
                height: '100%',
                background: results.validation.score >= 80 
                  ? 'var(--success)' 
                  : results.validation.score >= 60 
                    ? 'var(--warning)' 
                    : 'var(--error)',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
          
          {/* Issues and Recommendations */}
          <div style={{
            display: 'grid',
            'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1rem',
            'margin-bottom': '1.5rem'
          }}>
            <Show when={results.validation.issues.length > 0}>
              <div style={{
                padding: '1rem',
                background: 'var(--error-light)',
                'border-radius': 'var(--border-radius)'
              }}>
                <h5 style={{ 'margin-bottom': '0.5rem', color: 'var(--error)' }}>❌ Issues</h5>
                <ul style={{ margin: '0', 'padding-left': '1.5rem', 'font-size': '0.875rem' }}>
                  <For each={results.validation.issues}>
                    {(issue) => <li>{issue}</li>}
                  </For>
                </ul>
              </div>
            </Show>
            
            <Show when={results.validation.warnings.length > 0}>
              <div style={{
                padding: '1rem',
                background: 'var(--warning-light)',
                'border-radius': 'var(--border-radius)'
              }}>
                <h5 style={{ 'margin-bottom': '0.5rem', color: 'var(--warning-dark)' }}>⚠️ Warnings</h5>
                <ul style={{ margin: '0', 'padding-left': '1.5rem', 'font-size': '0.875rem' }}>
                  <For each={results.validation.warnings}>
                    {(warning) => <li>{warning}</li>}
                  </For>
                </ul>
              </div>
            </Show>
            
            <Show when={results.validation.recommendations.length > 0}>
              <div style={{
                padding: '1rem',
                background: 'var(--info-light)',
                'border-radius': 'var(--border-radius)'
              }}>
                <h5 style={{ 'margin-bottom': '0.5rem', color: 'var(--info-dark)' }}>💡 Recommendations</h5>
                <ul style={{ margin: '0', 'padding-left': '1.5rem', 'font-size': '0.875rem' }}>
                  <For each={results.validation.recommendations}>
                    {(rec) => <li>{rec}</li>}
                  </For>
                </ul>
              </div>
            </Show>
          </div>
          
          {/* Technical Details */}
          <div style={{
            padding: '1rem',
            background: 'var(--background-secondary)',
            'border-radius': 'var(--border-radius)',
            'margin-bottom': '1.5rem'
          }}>
            <h5 style={{ 'margin-bottom': '0.5rem' }}>📊 Detection Details</h5>
            <div style={{
              display: 'grid',
              'grid-template-columns': 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '0.5rem',
              'font-size': '0.875rem'
            }}>
              <div><strong>Confidence:</strong> {(results.face.confidence * 100).toFixed(1)}%</div>
              <div><strong>Pose Yaw:</strong> {results.face.pose.yaw.toFixed(1)}°</div>
              <div><strong>Pose Pitch:</strong> {results.face.pose.pitch.toFixed(1)}°</div>
              <div><strong>Pose Roll:</strong> {results.face.pose.roll.toFixed(1)}°</div>
              <div><strong>Brightness:</strong> {results.face.quality.brightness}%</div>
              <div><strong>Sharpness:</strong> {results.face.quality.sharpness}%</div>
              <div><strong>Landmarks:</strong> {results.face.landmarks.length}</div>
              <div><strong>Expression:</strong> {results.face.expressions.neutral}% neutral</div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            'justify-content': 'center'
          }}>
            <Button
              onClick={() => {
                const link = document.createElement('a');
                link.download = `passport-photo-${selectedCountry()}-${Date.now()}.jpg`;
                link.href = finalPhoto;
                link.click();
              }}
              variant="secondary"
            >
              📥 Download
            </Button>
            <Button
              onClick={() => {
                props.onPhotoSaved?.(finalPhoto, {
                  ...results,
                  country: selectedCountry(),
                  processor: 'Client-Side Face Recognition',
                  timestamp: new Date().toISOString()
                });
                modal.hideModal();
              }}
              variant="primary"
              disabled={!results.validation.isValid}
            >
              ✅ Save Photo
            </Button>
          </div>
        </div>
      )
    });
  };
  
  return (
    <Card>
      <div style={{ padding: '2rem' }}>
        <h3 style={{
          'font-size': '1.5rem',
          'font-weight': '600',
          'margin-bottom': '1.5rem'
        }}>
          🤖 Client-Side Face Recognition
        </h3>
        
        {/* Initialization Status */}
        <Show when={!initialized()}>
          <div style={{
            padding: '2rem',
            'text-align': 'center',
            background: 'var(--background-secondary)',
            'border-radius': 'var(--border-radius)',
            'margin-bottom': '2rem'
          }}>
            <div style={{ 'font-size': '2rem', 'margin-bottom': '1rem' }}>
              {initializing() ? '⏳' : '🧠'}
            </div>
            <p style={{ 'margin-bottom': '1rem' }}>
              {initializing() ? 'Loading TensorFlow.js models...' : 'Face recognition models not loaded'}
            </p>
            <Show when={!initializing()}>
              <Button onClick={initializeFaceRecognition} variant="primary">
                Initialize Face Recognition
              </Button>
            </Show>
          </div>
        </Show>
        
        <Show when={initialized()}>
          {/* Mode Selection */}
          <div style={{ 'margin-bottom': '2rem' }}>
            <div style={{
              display: 'flex',
              gap: '1rem',
              'margin-bottom': '1rem'
            }}>
              <Button
                onClick={() => setCaptureMode('camera')}
                variant={captureMode() === 'camera' ? 'primary' : 'secondary'}
              >
                📸 Camera
              </Button>
              <Button
                onClick={() => setCaptureMode('upload')}
                variant={captureMode() === 'upload' ? 'primary' : 'secondary'}
              >
                📁 Upload
              </Button>
            </div>
          </div>
          
          {/* Settings */}
          <div style={{
            'margin-bottom': '2rem',
            padding: '1rem',
            background: 'var(--background-secondary)',
            'border-radius': 'var(--border-radius)'
          }}>
            <h4 style={{ 'margin-bottom': '1rem' }}>Settings</h4>
            <div style={{
              display: 'grid',
              'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem'
            }}>
              <div>
                <label style={{ display: 'block', 'margin-bottom': '0.5rem' }}>Country</label>
                <select
                  value={selectedCountry()}
                  onChange={(e) => setSelectedCountry(e.currentTarget.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid var(--border-color)',
                    'border-radius': 'var(--border-radius-sm)',
                    background: 'var(--background)'
                  }}
                >
                  <For each={countryOptions}>
                    {(option) => <option value={option.value}>{option.label}</option>}
                  </For>
                </select>
              </div>
              
              <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.5rem' }}>
                <label>
                  <input
                    type="checkbox"
                    checked={showDebugInfo()}
                    onChange={(e) => setShowDebugInfo(e.target.checked)}
                    style={{ 'margin-right': '0.5rem' }}
                  />
                  Show debug overlay
                </label>
                
                <Show when={captureMode() === 'camera'}>
                  <label>
                    <input
                      type="checkbox"
                      checked={realTimeAnalysis()}
                      onChange={(e) => {
                        setRealTimeAnalysis(e.target.checked);
                        if (e.target.checked && stream()) {
                          startRealTimeAnalysis();
                        } else if (analysisInterval) {
                          clearInterval(analysisInterval);
                        }
                      }}
                      style={{ 'margin-right': '0.5rem' }}
                    />
                    Real-time analysis
                  </label>
                  
                  <label>
                    <input
                      type="checkbox"
                      checked={autoCapture()}
                      onChange={(e) => setAutoCapture(e.target.checked)}
                      style={{ 'margin-right': '0.5rem' }}
                    />
                    Auto-capture (score ≥90)
                  </label>
                </Show>
              </div>
            </div>
          </div>
          
          {/* Camera Mode */}
          <Show when={captureMode() === 'camera'}>
            <div style={{ 'margin-bottom': '2rem' }}>
              <Show when={!stream()} fallback={
                <div style={{ 'text-align': 'center' }}>
                  <div style={{
                    position: 'relative',
                    display: 'inline-block',
                    'margin-bottom': '1rem'
                  }}>
                    <video
                      ref={videoRef}
                      style={{
                        width: '100%',
                        'max-width': '500px',
                        'border-radius': 'var(--border-radius)',
                        border: '2px solid var(--border-color)'
                      }}
                      autoplay
                      muted
                      playsinline
                    />
                    
                    {/* Real-time validation overlay */}
                    <Show when={realTimeValidation()}>
                      <div style={{
                        position: 'absolute',
                        top: '10px',
                        left: '10px',
                        padding: '0.5rem',
                        background: realTimeValidation()!.score >= 80 
                          ? 'var(--success)' 
                          : realTimeValidation()!.score >= 60 
                            ? 'var(--warning)' 
                            : 'var(--error)',
                        color: 'white',
                        'border-radius': 'var(--border-radius-sm)',
                        'font-size': '0.875rem',
                        'font-weight': '600'
                      }}>
                        Score: {realTimeValidation()!.score}/100
                      </div>
                    </Show>
                  </div>
                  
                  <canvas
                    ref={canvasRef}
                    style={{ display: 'none' }}
                  />
                  
                  <div style={{
                    display: 'flex',
                    gap: '1rem',
                    'justify-content': 'center'
                  }}>
                    <Button
                      onClick={capturePhoto}
                      variant="primary"
                      size="lg"
                      disabled={processing()}
                    >
                      {processing() ? '⏳ Processing...' : '📸 Capture Photo'}
                    </Button>
                    <Button
                      onClick={stopCamera}
                      variant="secondary"
                    >
                      Stop Camera
                    </Button>
                  </div>
                </div>
              }>
                <div style={{
                  'text-align': 'center',
                  padding: '3rem',
                  background: 'var(--background-secondary)',
                  'border-radius': 'var(--border-radius)',
                  border: '2px dashed var(--border-color)'
                }}>
                  <div style={{ 'font-size': '3rem', 'margin-bottom': '1rem' }}>📷</div>
                  <p style={{ 'margin-bottom': '1rem' }}>
                    Start camera to capture passport photo with real-time face detection
                  </p>
                  <Button onClick={startCamera} variant="primary" size="lg">
                    Start Camera
                  </Button>
                </div>
              </Show>
            </div>
          </Show>
          
          {/* Upload Mode */}
          <Show when={captureMode() === 'upload'}>
            <div style={{
              'text-align': 'center',
              padding: '2rem',
              background: 'var(--background-secondary)',
              'border-radius': 'var(--border-radius)',
              border: '2px dashed var(--border-color)',
              'margin-bottom': '2rem'
            }}>
              <Show when={!selectedFile()} fallback={
                <div>
                  <img
                    src={originalPreview()}
                    style={{
                      'max-width': '400px',
                      'max-height': '400px',
                      'margin-bottom': '1rem',
                      'border-radius': 'var(--border-radius)'
                    }}
                    alt="Selected photo"
                  />
                  <p style={{ 'margin-bottom': '1rem' }}>
                    <strong>{selectedFile()?.name}</strong>
                  </p>
                  <Button
                    onClick={() => {
                      setSelectedFile(null);
                      setOriginalPreview('');
                      setProcessedPhoto('');
                      setFaceResult(null);
                      setValidation(null);
                    }}
                    variant="secondary"
                  >
                    Remove File
                  </Button>
                </div>
              }>
                <div style={{ 'font-size': '3rem', 'margin-bottom': '1rem' }}>📁</div>
                <p style={{ 'margin-bottom': '1rem' }}>
                  Upload a photo for client-side face recognition processing
                </p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                  id="client-photo-upload"
                  disabled={processing()}
                />
                <label for="client-photo-upload">
                  <Button variant="primary" size="lg" as="span" disabled={processing()}>
                    {processing() ? '⏳ Processing...' : 'Select Photo'}
                  </Button>
                </label>
              </Show>
            </div>
          </Show>
          
          {/* Features Info */}
          <div style={{
            padding: '1rem',
            background: 'var(--background-secondary)',
            'border-radius': 'var(--border-radius)',
            'font-size': '0.875rem'
          }}>
            <h5 style={{ 'margin-bottom': '0.5rem' }}>🌟 Client-Side Features</h5>
            <ul style={{ margin: '0', 'padding-left': '1.5rem' }}>
              <li>✅ Complete privacy - no data sent to servers</li>
              <li>🚀 Real-time processing using TensorFlow.js</li>
              <li>🎯 Precise face landmark detection (6 key points)</li>
              <li>📐 Automatic pose estimation (yaw, pitch, roll)</li>
              <li>🔍 Image quality analysis (brightness, sharpness, blur)</li>
              <li>😐 Expression detection for neutral passport photos</li>
              <li>🌍 Support for 7 country passport specifications</li>
              <li>⚡ No API costs or rate limits</li>
            </ul>
          </div>
        </Show>
      </div>
    </Card>
  );
};

export default PassportPhotoClientSide;