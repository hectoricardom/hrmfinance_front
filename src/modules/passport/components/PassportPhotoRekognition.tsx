import { Component, createSignal, Show, For } from 'solid-js';
import { Card, Button, Input } from '../../ui';
import { useModal } from '../../../contexts/ModalContext';
import { devLog } from '../../../services/utils';
import { 
  AmazonRekognitionProcessor, 
  base64ToUint8Array,
  type PassportCropCoordinates,
  type RekognitionConfig 
} from '../utils/amazonRekognition';

interface PassportPhotoRekognitionProps {
  clientName?: string;
  onPhotoSaved?: (photoUrl: string, metadata: any) => void;
}

const PassportPhotoRekognition: Component<PassportPhotoRekognitionProps> = (props) => {
  const modal = useModal();
  
  // AWS Configuration
  const [awsConfig, setAwsConfig] = createSignal<RekognitionConfig>({
    accessKeyId: '',
    secretAccessKey: '',
    region: 'us-east-1'
  });
  
  const [selectedFile, setSelectedFile] = createSignal<File | null>(null);
  const [originalPreview, setOriginalPreview] = createSignal<string>('');
  const [processedPhoto, setProcessedPhoto] = createSignal<string>('');
  const [processing, setProcessing] = createSignal(false);
  const [selectedCountry, setSelectedCountry] = createSignal<string>('US');
  const [showDebugInfo, setShowDebugInfo] = createSignal(true);
  
  // Processing results
  const [cropCoordinates, setCropCoordinates] = createSignal<PassportCropCoordinates | null>(null);
  const [validationResults, setValidationResults] = createSignal<any>(null);
  const [faceDetails, setFaceDetails] = createSignal<any>(null);
  
  const countryOptions = [
    { value: 'US', label: '🇺🇸 USA (2x2 inches, 600x600px)' },
    { value: 'EU', label: '🇪🇺 EU (35x45mm, 413x531px)' },
    { value: 'UK', label: '🇬🇧 UK (35x45mm, 413x531px)' },
    { value: 'CA', label: '🇨🇦 Canada (50x70mm, 590x826px)' },
    { value: 'CU', label: '🇨🇺 Cuba (30x30mm, 900x900px)' },
    { value: 'IN', label: '🇮🇳 India (35x35mm, 413x413px)' },
    { value: 'AU', label: '🇦🇺 Australia (35x45mm, 413x531px)' }
  ];
  
  const awsRegions = [
    'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
    'eu-west-1', 'eu-west-2', 'eu-central-1',
    'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1'
  ];
  
  const handleFileSelect = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setOriginalPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      // Reset previous results
      setProcessedPhoto('');
      setCropCoordinates(null);
      setValidationResults(null);
      setFaceDetails(null);
    }
  };
  
  const processWithRekognition = async () => {
    const file = selectedFile();
    if (!file) return;
    
    // Validate AWS config
    if (!awsConfig().accessKeyId || !awsConfig().secretAccessKey) {
      modal.showModal({
        title: 'AWS Configuration Required',
        children: (
          <div style={{ padding: '1.5rem' }}>
            <p>Please configure your AWS credentials to use Amazon Rekognition.</p>
          </div>
        )
      });
      return;
    }
    
    setProcessing(true);
    
    try {
      const processor = new AmazonRekognitionProcessor(awsConfig());
      
      // Process the photo
      const result = await processor.processPassportPhoto(file, selectedCountry());
      
      // Store results
      setCropCoordinates(result.cropCoordinates);
      setValidationResults(result.validation);
      setFaceDetails(result.faceDetails);
      
      // Create cropped image
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          throw new Error('Failed to create canvas context');
        }
        
        // Get country specs for final dimensions
        const countrySpecs = getCountrySpecs(selectedCountry());
        canvas.width = countrySpecs.width;
        canvas.height = countrySpecs.height;
        
        // Fill with white background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw cropped image
        ctx.drawImage(
          img,
          result.cropCoordinates.x,
          result.cropCoordinates.y,
          result.cropCoordinates.width,
          result.cropCoordinates.height,
          0,
          0,
          canvas.width,
          canvas.height
        );
        
        // Apply enhancements
        applyImageEnhancements(ctx, canvas.width, canvas.height);
        
        // Draw debug info if enabled
        if (showDebugInfo()) {
          // Create a copy for debug view
          const debugCanvas = document.createElement('canvas');
          debugCanvas.width = img.width;
          debugCanvas.height = img.height;
          const debugCtx = debugCanvas.getContext('2d');
          
          if (debugCtx) {
            debugCtx.drawImage(img, 0, 0);
            processor.drawDebugInfo(debugCtx, result.faceDetails, result.cropCoordinates);
            setProcessedPhoto(debugCanvas.toDataURL('image/jpeg', 0.95));
          }
        } else {
          setProcessedPhoto(canvas.toDataURL('image/jpeg', 0.95));
        }
        
        // Show results
        showResultsModal(canvas.toDataURL('image/jpeg', 0.95), result);
      };
      
      img.src = originalPreview();
      
    } catch (error) {
      devLog('Rekognition processing error:', error);
      modal.showModal({
        title: 'Processing Error',
        children: (
          <div style={{ padding: '1.5rem' }}>
            <p style={{ 'margin-bottom': '1rem' }}>
              Failed to process image with Amazon Rekognition:
            </p>
            <code style={{
              display: 'block',
              padding: '0.5rem',
              background: 'var(--background-secondary)',
              'border-radius': 'var(--border-radius-sm)',
              'font-size': '0.875rem',
              color: 'var(--error)'
            }}>
              {error.message}
            </code>
            <p style={{ 'margin-top': '1rem', 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
              Please check your AWS credentials and ensure the Rekognition service is enabled in your region.
            </p>
          </div>
        )
      });
    } finally {
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
    return specs[countryCode] || specs.US;
  };
  
  const applyImageEnhancements = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Get image data
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    // Apply brightness and contrast adjustments
    const brightness = 10;
    const contrast = 1.1;
    
    for (let i = 0; i < data.length; i += 4) {
      // Apply brightness
      data[i] = Math.min(255, data[i] + brightness);     // Red
      data[i + 1] = Math.min(255, data[i + 1] + brightness); // Green
      data[i + 2] = Math.min(255, data[i + 2] + brightness); // Blue
      
      // Apply contrast
      data[i] = Math.min(255, ((data[i] - 128) * contrast) + 128);
      data[i + 1] = Math.min(255, ((data[i + 1] - 128) * contrast) + 128);
      data[i + 2] = Math.min(255, ((data[i + 2] - 128) * contrast) + 128);
    }
    
    ctx.putImageData(imageData, 0, 0);
  };
  
  const showResultsModal = (processedImage: string, result: any) => {
    modal.showModal({
      title: 'Passport Photo Processing Results',
      size: 'xl',
      children: (
        <div style={{ padding: '1.5rem' }}>
          <div style={{
            display: 'grid',
            'grid-template-columns': '1fr 1fr',
            gap: '2rem',
            'margin-bottom': '1.5rem'
          }}>
            {/* Original Image */}
            <div>
              <h4 style={{ 'margin-bottom': '0.5rem' }}>Original</h4>
              <img
                src={originalPreview()}
                style={{
                  width: '100%',
                  'max-width': '400px',
                  'border-radius': 'var(--border-radius)',
                  border: '1px solid var(--border-color)'
                }}
                alt="Original"
              />
            </div>
            
            {/* Processed Image */}
            <div>
              <h4 style={{ 'margin-bottom': '0.5rem' }}>
                Processed {showDebugInfo() ? '(with debug info)' : ''}
              </h4>
              <img
                src={processedImage}
                style={{
                  width: '100%',
                  'max-width': '400px',
                  'border-radius': 'var(--border-radius)',
                  border: '1px solid var(--border-color)'
                }}
                alt="Processed"
              />
            </div>
          </div>
          
          {/* Validation Results */}
          <div style={{
            display: 'grid',
            'grid-template-columns': '1fr 1fr',
            gap: '1rem',
            'margin-bottom': '1.5rem'
          }}>
            {/* Errors */}
            <Show when={result.validation.errors.length > 0}>
              <div style={{
                padding: '1rem',
                background: 'var(--error-light)',
                'border-radius': 'var(--border-radius)',
                border: '1px solid var(--error)'
              }}>
                <h5 style={{ 'margin-bottom': '0.5rem', color: 'var(--error)' }}>
                  ❌ Issues Found
                </h5>
                <ul style={{ margin: '0', 'padding-left': '1.5rem' }}>
                  <For each={result.validation.errors}>
                    {(error) => <li>{error}</li>}
                  </For>
                </ul>
              </div>
            </Show>
            
            {/* Warnings */}
            <Show when={result.validation.warnings.length > 0}>
              <div style={{
                padding: '1rem',
                background: 'var(--warning-light)',
                'border-radius': 'var(--border-radius)',
                border: '1px solid var(--warning)'
              }}>
                <h5 style={{ 'margin-bottom': '0.5rem', color: 'var(--warning-dark)' }}>
                  ⚠️ Warnings
                </h5>
                <ul style={{ margin: '0', 'padding-left': '1.5rem' }}>
                  <For each={result.validation.warnings}>
                    {(warning) => <li>{warning}</li>}
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
            <h5 style={{ 'margin-bottom': '0.5rem' }}>📊 Technical Details</h5>
            <div style={{
              display: 'grid',
              'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              'font-size': '0.875rem'
            }}>
              <div>
                <strong>Face Confidence:</strong> {(result.faceDetails.confidence * 100).toFixed(1)}%
              </div>
              <div>
                <strong>Image Dimensions:</strong> {result.imageWidth} × {result.imageHeight}px
              </div>
              <div>
                <strong>Crop Area:</strong> {result.cropCoordinates.width} × {result.cropCoordinates.height}px
              </div>
              <div>
                <strong>Face Position:</strong> ({result.cropCoordinates.faceCenter.x.toFixed(0)}, {result.cropCoordinates.faceCenter.y.toFixed(0)})
              </div>
              <div>
                <strong>Eye Level:</strong> {result.cropCoordinates.eyeLevel.toFixed(0)}px from top
              </div>
              <div>
                <strong>Landmarks Detected:</strong> {result.faceDetails.landmarks.length}
              </div>
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
                link.href = processedImage;
                link.click();
              }}
              variant="secondary"
            >
              📥 Download Photo
            </Button>
            <Button
              onClick={() => {
                props.onPhotoSaved?.(processedImage, {
                  ...result,
                  country: selectedCountry(),
                  processor: 'Amazon Rekognition',
                  timestamp: new Date().toISOString()
                });
                modal.hideModal();
              }}
              variant="primary"
              disabled={!result.validation.isValid}
            >
              ✅ Save & Continue
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
          🎯 Amazon Rekognition Passport Photo Processor
        </h3>
        
        {/* AWS Configuration */}
        <div style={{ 'margin-bottom': '2rem' }}>
          <h4 style={{ 'margin-bottom': '1rem' }}>AWS Configuration</h4>
          <div style={{
            display: 'grid',
            'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1rem',
            padding: '1rem',
            background: 'var(--background-secondary)',
            'border-radius': 'var(--border-radius)'
          }}>
            <div>
              <label style={{ display: 'block', 'margin-bottom': '0.25rem', 'font-size': '0.875rem' }}>
                Access Key ID
              </label>
              <Input
                type="password"
                placeholder="AKIAIOSFODNN7EXAMPLE"
                value={awsConfig().accessKeyId}
                onInput={(e) => setAwsConfig({ ...awsConfig(), accessKeyId: e.currentTarget.value })}
              />
            </div>
            <div>
              <label style={{ display: 'block', 'margin-bottom': '0.25rem', 'font-size': '0.875rem' }}>
                Secret Access Key
              </label>
              <Input
                type="password"
                placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                value={awsConfig().secretAccessKey}
                onInput={(e) => setAwsConfig({ ...awsConfig(), secretAccessKey: e.currentTarget.value })}
              />
            </div>
            <div>
              <label style={{ display: 'block', 'margin-bottom': '0.25rem', 'font-size': '0.875rem' }}>
                AWS Region
              </label>
              <select
                value={awsConfig().region}
                onChange={(e) => setAwsConfig({ ...awsConfig(), region: e.currentTarget.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid var(--border-color)',
                  'border-radius': 'var(--border-radius-sm)',
                  background: 'var(--background)'
                }}
              >
                <For each={awsRegions}>
                  {(region) => <option value={region}>{region}</option>}
                </For>
              </select>
            </div>
          </div>
          
          <div style={{
            'margin-top': '0.5rem',
            padding: '0.75rem',
            background: 'var(--info-light)',
            'border-radius': 'var(--border-radius)',
            'font-size': '0.875rem'
          }}>
            <strong>ℹ️ Note:</strong> Ensure your AWS credentials have permissions for <code>rekognition:DetectFaces</code>
          </div>
        </div>
        
        {/* Processing Options */}
        <div style={{ 'margin-bottom': '2rem' }}>
          <h4 style={{ 'margin-bottom': '1rem' }}>Processing Options</h4>
          <div style={{
            display: 'grid',
            'grid-template-columns': 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1rem'
          }}>
            <div>
              <label style={{ display: 'block', 'margin-bottom': '0.5rem' }}>
                Country Specification
              </label>
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
            
            <div style={{ display: 'flex', 'align-items': 'center' }}>
              <label>
                <input
                  type="checkbox"
                  checked={showDebugInfo()}
                  onChange={(e) => setShowDebugInfo(e.target.checked)}
                  style={{ 'margin-right': '0.5rem' }}
                />
                Show debug information (face landmarks, crop area)
              </label>
            </div>
          </div>
        </div>
        
        {/* File Upload */}
        <div style={{
          'margin-bottom': '2rem',
          padding: '2rem',
          background: 'var(--background-secondary)',
          'border-radius': 'var(--border-radius)',
          border: '2px dashed var(--border-color)',
          'text-align': 'center'
        }}>
          <Show when={!selectedFile()} fallback={
            <div>
              <img
                src={originalPreview()}
                style={{
                  'max-width': '300px',
                  'max-height': '300px',
                  'margin-bottom': '1rem',
                  'border-radius': 'var(--border-radius)'
                }}
                alt="Selected photo"
              />
              <p style={{ 'margin-bottom': '1rem' }}>
                <strong>{selectedFile()?.name}</strong> ({((selectedFile()?.size || 0) / 1024).toFixed(2)} KB)
              </p>
              <Button
                onClick={() => {
                  setSelectedFile(null);
                  setOriginalPreview('');
                  setProcessedPhoto('');
                  setCropCoordinates(null);
                  setValidationResults(null);
                  setFaceDetails(null);
                }}
                variant="secondary"
              >
                Remove File
              </Button>
            </div>
          }>
            <div style={{ 'font-size': '3rem', 'margin-bottom': '1rem' }}>📷</div>
            <p style={{ 'margin-bottom': '1rem' }}>
              Select a photo to process with Amazon Rekognition
            </p>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              id="rekognition-photo-upload"
            />
            <label for="rekognition-photo-upload">
              <Button variant="primary" as="span">
                Select Photo
              </Button>
            </label>
          </Show>
        </div>
        
        {/* Process Button */}
        <div style={{
          display: 'flex',
          'justify-content': 'center',
          'margin-bottom': '2rem'
        }}>
          <Button
            onClick={processWithRekognition}
            variant="primary"
            size="lg"
            disabled={!selectedFile() || processing() || !awsConfig().accessKeyId || !awsConfig().secretAccessKey}
          >
            {processing() ? '⏳ Processing with Rekognition...' : '🚀 Process Photo'}
          </Button>
        </div>
        
        {/* Features */}
        <div style={{
          padding: '1rem',
          background: 'var(--background-secondary)',
          'border-radius': 'var(--border-radius)',
          'font-size': '0.875rem'
        }}>
          <h5 style={{ 'margin-bottom': '0.5rem' }}>✨ Amazon Rekognition Features</h5>
          <ul style={{ margin: '0', 'padding-left': '1.5rem' }}>
            <li>High-precision face detection with 100+ facial landmarks</li>
            <li>Face pose analysis (yaw, pitch, roll) for passport compliance</li>
            <li>Image quality assessment (brightness, sharpness)</li>
            <li>Automatic crop calculation based on ICAO standards</li>
            <li>Country-specific passport photo dimensions</li>
            <li>Validation against passport photo requirements</li>
          </ul>
        </div>
      </div>
    </Card>
  );
};

export default PassportPhotoRekognition;