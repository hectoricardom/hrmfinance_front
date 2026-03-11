import { Component, createSignal, Show, For, onMount } from 'solid-js';
import { Card, Button, FormInput } from '../../ui';
import { devLog } from '../../../services/utils';
import { useModal } from '../../../contexts/ModalContext';
import { 
  FaceDetectionComparison,
  DETECTION_METHODS,
  type ComparisonResults,
  type DetectionResult
} from '../utils/faceDetectionComparison';
import AdjustableCropEditor from './AdjustableCropEditor';

interface FaceDetectionComparisonProps {
  clientName?: string;
  onBestResultSelected?: (photoUrl: string, metadata: any) => void;
}

const FaceDetectionComparisonComponent: Component<FaceDetectionComparisonProps> = (props) => {
  const modal = useModal();
  
  // Core state
  const [comparison] = createSignal(new FaceDetectionComparison());
  const [selectedFile, setSelectedFile] = createSignal<File | null>(null);
  const [originalPreview, setOriginalPreview] = createSignal<string>('');
  const [processing, setProcessing] = createSignal(false);
  const [results, setResults] = createSignal<ComparisonResults | null>(null);
  const [croppedImages, setCroppedImages] = createSignal<string[]>([]);
  const [landmarkComparison, setLandmarkComparison] = createSignal<string>('');
  
  // Method selection  
  const [selectedMethods, setSelectedMethods] = createSignal<string[]>(['blazeface', 'client']);
  const [countryCode, setCountryCode] = createSignal<string>('CU');
  
  // AWS Configuration (optional)
  const [awsConfig, setAwsConfig] = createSignal({
    accessKeyId: '',
    secretAccessKey: '',
    region: 'us-east-1',
    enabled: false
  });
  
  const countryOptions = [
    { value: 'US', label: '🇺🇸 USA' },
    { value: 'EU', label: '🇪🇺 EU' },
    { value: 'UK', label: '🇬🇧 UK' },
    { value: 'CA', label: '🇨🇦 Canada' },
    { value: 'CU', label: '🇨🇺 Cuba' },
    { value: 'IN', label: '🇮🇳 India' },
    { value: 'AU', label: '🇦🇺 Australia' }
  ];
  
  onMount(() => {
    // Initialize with AWS config if available
    if (awsConfig().enabled && awsConfig().accessKeyId) {
      const newComparison = new FaceDetectionComparison({
        accessKeyId: awsConfig().accessKeyId,
        secretAccessKey: awsConfig().secretAccessKey,
        region: awsConfig().region
      });
      setSelectedMethods(['blazeface', 'client', 'aws']);
    }
  });
  
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
      setResults(null);
      setCroppedImages([]);
      setLandmarkComparison('');
    }
  };
  
  const toggleMethod = (methodKey: string) => {
    const current = selectedMethods();
    if (current.includes(methodKey)) {
      setSelectedMethods(current.filter(m => m !== methodKey));
    } else {
      setSelectedMethods([...current, methodKey]);
    }
  };
  
  const runComparison = async () => {
    const file = selectedFile();
    if (!file) return;
    
    setProcessing(true);
    
    try {
      // Update comparison instance with current AWS config
      let comparisonInstance = comparison();
      if (awsConfig().enabled && awsConfig().accessKeyId && selectedMethods().includes('aws')) {
        comparisonInstance = new FaceDetectionComparison({
          accessKeyId: awsConfig().accessKeyId,
          secretAccessKey: awsConfig().secretAccessKey,
          region: awsConfig().region
        });
      }
      
      const comparisonResults = await comparisonInstance.compareAllMethods(
        file,
        selectedMethods(),
        countryCode()
      );
      
      setResults(comparisonResults);
      
      // Generate cropped comparisons and landmark visualization
      const img = new Image();
      img.onload = async () => {
        const cropped = await comparisonInstance.generateCroppedComparison(
          img,
          comparisonResults.results,
          countryCode()
        );
        setCroppedImages(cropped);
        
        // Generate landmark comparison canvas
        const comparisonCanvas = comparisonInstance.createComparisonCanvas(
          img,
          comparisonResults.results
        );
        
        // Store canvas as data URL for display
        const canvasDataUrl = comparisonCanvas.toDataURL('image/png');
        setLandmarkComparison(canvasDataUrl);
      };
      img.src = comparisonResults.originalImage;
      
    } catch (error) {
      devLog('Comparison error:', error);
      modal.showModal({
        title: 'Comparison Error',
        children: (
          <div style={{ padding: '1.5rem' }}>
            <p>Error running face detection comparison:</p>
            <code style={{
              display: 'block',
              'margin-top': '0.5rem',
              padding: '0.5rem',
              background: 'var(--background-secondary)',
              'border-radius': 'var(--border-radius-sm)'
            }}>
              {error.message}
            </code>
          </div>
        )
      });
    } finally {
      setProcessing(false);
    }
  };
  
  const showCropEditor = (result: DetectionResult) => {
    const cropArea = {
      x: result.cropCoordinates.x,
      y: result.cropCoordinates.y,
      width: result.cropCoordinates.width,
      height: result.cropCoordinates.height
    };
    
    modal.showModal({
      title: `✂️ Adjust Crop - ${DETECTION_METHODS[result.method]?.name}`,
      size: 'xl',
      children: (
        <AdjustableCropEditor
          imageUrl={originalPreview()}
          initialCrop={cropArea}
          aspectRatio={1} // Square for most passport photos
          countryCode={countryCode()}
          onCropConfirm={(finalCrop, croppedImageUrl) => {
            // Update the result with new crop
            const updatedResult = {
              ...result,
              cropCoordinates: finalCrop
            };
            
            // Call the parent callback
            props.onBestResultSelected?.(croppedImageUrl, {
              method: result.method,
              adjustedCrop: finalCrop,
              originalCrop: cropArea,
              metadata: result.metadata,
              country: countryCode(),
              timestamp: new Date().toISOString()
            });
            
            modal.hideModal();
          }}
        />
      )
    });
  };

  const showDetailedResults = (result: DetectionResult) => {
    modal.showModal({
      title: `${DETECTION_METHODS[result.method]?.name} - Detailed Results`,
      size: 'lg',
      children: (
        <div style={{ padding: '1.5rem' }}>
          <div style={{
            display: 'grid',
            'grid-template-columns': '1fr 1fr',
            gap: '2rem',
            'margin-bottom': '1.5rem'
          }}>
            <div>
              <h4 style={{ 'margin-bottom': '0.5rem' }}>Detection Overlay</h4>
              <div style={{
                width: '100%',
                height: '300px',
                background: 'var(--background-secondary)',
                'border-radius': 'var(--border-radius)',
                display: 'flex',
                'align-items': 'center',
                'justify-content': 'center'
              }}>
                <span>Debug overlay would be shown here</span>
              </div>
            </div>
            
            <div>
              <h4 style={{ 'margin-bottom': '0.5rem' }}>Cropped Result</h4>
              <Show when={croppedImages()[results()?.results.findIndex(r => r.method === result.method) || 0]}>
                <img
                  src={croppedImages()[results()?.results.findIndex(r => r.method === result.method) || 0]}
                  style={{
                    width: '100%',
                    'max-width': '300px',
                    'border-radius': 'var(--border-radius)',
                    border: '1px solid var(--border-color)'
                  }}
                  alt="Cropped result"
                />
              </Show>
            </div>
          </div>
          
          {/* Detailed Metrics */}
          <div style={{
            padding: '1rem',
            background: 'var(--background-secondary)',
            'border-radius': 'var(--border-radius)',
            'margin-bottom': '1rem'
          }}>
            <h5 style={{ 'margin-bottom': '0.5rem' }}>📊 Detailed Metrics</h5>
            <div style={{
              display: 'grid',
              'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '0.5rem',
              'font-size': '0.875rem'
            }}>
              <div><strong>Confidence:</strong> {(result.confidence * 100).toFixed(2)}%</div>
              <div><strong>Processing Time:</strong> {result.processingTime.toFixed(0)}ms</div>
              <div><strong>Landmarks Found:</strong> {result.landmarks.length}</div>
              <div><strong>Face Width:</strong> {result.boundingBox.width.toFixed(0)}px</div>
              <div><strong>Face Height:</strong> {result.boundingBox.height.toFixed(0)}px</div>
              <div><strong>Crop Size:</strong> {result.cropCoordinates.width}×{result.cropCoordinates.height}px</div>
            </div>
            
            <Show when={result.metadata}>
              <div style={{ 'margin-top': '1rem' }}>
                <strong>Additional Data:</strong>
                <pre style={{
                  'margin-top': '0.5rem',
                  padding: '0.5rem',
                  background: 'var(--background)',
                  'border-radius': 'var(--border-radius-sm)',
                  'font-size': '0.75rem',
                  overflow: 'auto',
                  'max-height': '150px'
                }}>
                  {JSON.stringify(result.metadata, null, 2)}
                </pre>
              </div>
            </Show>
          </div>
          
          {/* Validation Details */}
          <div style={{
            display: 'grid',
            'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1rem'
          }}>
            <Show when={result.validation.issues.length > 0}>
              <div style={{
                padding: '1rem',
                background: 'var(--error-light)',
                'border-radius': 'var(--border-radius)'
              }}>
                <h5 style={{ color: 'var(--error)', 'margin-bottom': '0.5rem' }}>❌ Issues</h5>
                <ul style={{ margin: '0', 'padding-left': '1.5rem', 'font-size': '0.875rem' }}>
                  <For each={result.validation.issues}>
                    {(issue) => <li>{issue}</li>}
                  </For>
                </ul>
              </div>
            </Show>
            
            <Show when={result.validation.warnings.length > 0}>
              <div style={{
                padding: '1rem',
                background: 'var(--warning-light)',
                'border-radius': 'var(--border-radius)'
              }}>
                <h5 style={{ color: 'var(--warning-dark)', 'margin-bottom': '0.5rem' }}>⚠️ Warnings</h5>
                <ul style={{ margin: '0', 'padding-left': '1.5rem', 'font-size': '0.875rem' }}>
                  <For each={result.validation.warnings}>
                    {(warning) => <li>{warning}</li>}
                  </For>
                </ul>
              </div>
            </Show>
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
          🔍 Face Detection Method Comparison
        </h3>
        
        {/* Method Selection */}
        <div style={{ 'margin-bottom': '2rem' }}>
          <h4 style={{ 'margin-bottom': '1rem' }}>Select Detection Methods to Compare</h4>
          
          <div style={{
            display: 'grid',
            'grid-template-columns': 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1rem'
          }}>
            <For each={Object.entries(DETECTION_METHODS)}>
              {([key, method]) => (
                <div style={{
                  padding: '1rem',
                  background: selectedMethods().includes(key) ? 'var(--success-light)' : 'var(--background-secondary)',
                  'border-radius': 'var(--border-radius)',
                  border: `2px solid ${selectedMethods().includes(key) ? 'var(--success)' : 'var(--border-color)'}`,
                  cursor: 'pointer'
                }}
                onClick={() => toggleMethod(key)}
                >
                  <div style={{
                    display: 'flex',
                    'align-items': 'center',
                    'margin-bottom': '0.5rem'
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedMethods().includes(key)}
                      style={{ 'margin-right': '0.5rem' }}
                      readOnly
                    />
                    <strong>{method.name}</strong>
                    <div style={{ 'margin-left': 'auto', display: 'flex', gap: '0.25rem' }}>
                      <span style={{
                        padding: '0.125rem 0.25rem',
                        background: method.privacy === 'high' ? 'var(--success)' : 
                                   method.privacy === 'medium' ? 'var(--warning)' : 'var(--error)',
                        color: 'white',
                        'border-radius': '2px',
                        'font-size': '0.625rem'
                      }}>
                        {method.privacy.toUpperCase()} PRIVACY
                      </span>
                      <span style={{
                        padding: '0.125rem 0.25rem',
                        background: method.cost === 'free' ? 'var(--success)' : 
                                   method.cost === 'freemium' ? 'var(--warning)' : 'var(--error)',
                        color: 'white',
                        'border-radius': '2px',
                        'font-size': '0.625rem'
                      }}>
                        {method.cost.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  
                  <p style={{
                    'font-size': '0.875rem',
                    color: 'var(--text-muted)',
                    margin: '0'
                  }}>
                    {method.description}
                  </p>
                </div>
              )}
            </For>
          </div>
        </div>
        
        {/* AWS Configuration (if AWS method selected) */}
        <Show when={selectedMethods().includes('aws')}>
          <div style={{
            'margin-bottom': '2rem',
            padding: '1rem',
            background: 'var(--warning-light)',
            'border-radius': 'var(--border-radius)',
            border: '1px solid var(--warning)'
          }}>
            <h4 style={{ 'margin-bottom': '1rem' }}>AWS Rekognition Configuration</h4>
            <div style={{
              display: 'grid',
              'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1rem'
            }}>
              <FormInput
                label="AWS Access Key ID"
                type="password"
                placeholder="AKIAIOSFODNN7EXAMPLE"
                value={awsConfig().accessKeyId}
                onChange={(value) => setAwsConfig({ ...awsConfig(), accessKeyId: value })}
              />
              <FormInput
                label="AWS Secret Access Key"
                type="password"
                placeholder="wJalrXUtnFEMI/K7MDENG..."
                value={awsConfig().secretAccessKey}
                onChange={(value) => setAwsConfig({ ...awsConfig(), secretAccessKey: value })}
              />
              <select
                value={awsConfig().region}
                onChange={(e) => setAwsConfig({ ...awsConfig(), region: e.currentTarget.value })}
                style={{
                  padding: '0.5rem',
                  border: '1px solid var(--border-color)',
                  'border-radius': 'var(--border-radius-sm)',
                  background: 'var(--background)'
                }}
              >
                <option value="us-east-1">us-east-1</option>
                <option value="us-west-2">us-west-2</option>
                <option value="eu-west-1">eu-west-1</option>
                <option value="ap-southeast-1">ap-southeast-1</option>
              </select>
            </div>
            <label style={{ 
              display: 'flex', 
              'align-items': 'center', 
              'margin-top': '0.5rem',
              'font-size': '0.875rem'
            }}>
              <input
                type="checkbox"
                checked={awsConfig().enabled}
                onChange={(e) => setAwsConfig({ ...awsConfig(), enabled: e.target.checked })}
                style={{ 'margin-right': '0.5rem' }}
              />
              Enable AWS Rekognition (requires valid credentials)
            </label>
          </div>
        </Show>
        
        {/* Settings */}
        <div style={{
          'margin-bottom': '2rem',
          padding: '1rem',
          background: 'var(--background-secondary)',
          'border-radius': 'var(--border-radius)'
        }}>
          <h4 style={{ 'margin-bottom': '1rem' }}>Processing Settings</h4>
          <div style={{
            display: 'grid',
            'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
            <div>
              <label style={{ display: 'block', 'margin-bottom': '0.5rem' }}>
                Country Specification
              </label>
              <select
                value={countryCode()}
                onChange={(e) => setCountryCode(e.currentTarget.value)}
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
                <strong>{selectedFile()?.name}</strong> 
                ({((selectedFile()?.size || 0) / 1024).toFixed(2)} KB)
              </p>
              <Button
                onClick={() => {
                  setSelectedFile(null);
                  setOriginalPreview('');
                  setResults(null);
                  setCroppedImages([]);
                  setLandmarkComparison('');
                }}
                variant="secondary"
              >
                Remove File
              </Button>
            </div>
          }>
            <div style={{ 'font-size': '3rem', 'margin-bottom': '1rem' }}>📸</div>
            <p style={{ 'margin-bottom': '1rem' }}>
              Select a photo to compare face detection methods
            </p>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{
                  position: 'absolute',
                  opacity: '0',
                  width: '100%',
                  height: '100%',
                  cursor: 'pointer'
                }}
              />
              <Button variant="primary" size="lg" style={{ 'pointer-events': 'none' }}>
                Select Photo
              </Button>
            </div>
          </Show>
        </div>
        
        {/* Run Comparison Button */}
        <div style={{
          'text-align': 'center',
          'margin-bottom': '2rem'
        }}>
          <Button
            onClick={runComparison}
            variant="primary"
            size="lg"
            disabled={!selectedFile() || processing() || selectedMethods().length === 0}
          >
            {processing() ? '⏳ Running Comparison...' : `🔍 Compare ${selectedMethods().length} Methods`}
          </Button>
        </div>
        
        {/* Results */}
        <Show when={results()}>
          <div style={{ 'margin-bottom': '2rem' }}>
            <h4 style={{ 'margin-bottom': '1rem' }}>Comparison Results</h4>
            
            {/* Summary Stats */}
            <div style={{
              padding: '1rem',
              background: 'var(--info-light)',
              'border-radius': 'var(--border-radius)',
              'margin-bottom': '1.5rem'
            }}>
              <div style={{
                display: 'grid',
                'grid-template-columns': 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '1rem',
                'text-align': 'center'
              }}>
                <div>
                  <div style={{ 'font-size': '1.5rem', 'font-weight': '600' }}>
                    {results()!.results.filter(r => r.success).length}/{results()!.results.length}
                  </div>
                  <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                    Methods Succeeded
                  </div>
                </div>
                <div>
                  <div style={{ 'font-size': '1.5rem', 'font-weight': '600' }}>
                    {results()!.processingTime.toFixed(0)}ms
                  </div>
                  <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                    Total Time
                  </div>
                </div>
                <Show when={results()!.bestResult}>
                  <div>
                    <div style={{ 'font-size': '1.5rem', 'font-weight': '600' }}>
                      {results()!.bestResult!.validation.score}/100
                    </div>
                    <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                      Best Score ({DETECTION_METHODS[results()!.bestResult!.method]?.name})
                    </div>
                  </div>
                </Show>
              </div>
            </div>
            
            {/* Results Grid */}
            <div style={{
              display: 'grid',
              'grid-template-columns': 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '1rem',
              'margin-bottom': '1.5rem'
            }}>
              <For each={results()!.results}>
                {(result) => (
                  <div style={{
                    padding: '1rem',
                    background: result.success ? 'var(--background)' : 'var(--error-light)',
                    'border-radius': 'var(--border-radius)',
                    border: `2px solid ${result.success ? 'var(--success)' : 'var(--error)'}`
                  }}>
                    <div style={{
                      display: 'flex',
                      'justify-content': 'space-between',
                      'align-items': 'center',
                      'margin-bottom': '0.5rem'
                    }}>
                      <strong>{DETECTION_METHODS[result.method]?.name}</strong>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        background: result.success ? 'var(--success)' : 'var(--error)',
                        color: 'white',
                        'border-radius': 'var(--border-radius-sm)',
                        'font-size': '0.75rem'
                      }}>
                        {result.success ? 'SUCCESS' : 'FAILED'}
                      </span>
                    </div>
                    
                    <Show when={result.success} fallback={
                      <div style={{ color: 'var(--error)', 'font-size': '0.875rem' }}>
                        Error: {result.error}
                      </div>
                    }>
                      <div style={{
                        display: 'grid',
                        'grid-template-columns': '1fr 1fr',
                        gap: '0.5rem',
                        'font-size': '0.875rem',
                        'margin-bottom': '1rem'
                      }}>
                        <div><strong>Score:</strong> {result.validation.score}/100</div>
                        <div><strong>Confidence:</strong> {(result.confidence * 100).toFixed(1)}%</div>
                        <div><strong>Time:</strong> {result.processingTime.toFixed(0)}ms</div>
                        <div><strong>Landmarks:</strong> {result.landmarks.length}</div>
                      </div>
                      
                      {/* Progress bar for score */}
                      <div style={{
                        width: '100%',
                        height: '8px',
                        background: 'var(--background-secondary)',
                        'border-radius': '4px',
                        overflow: 'hidden',
                        'margin-bottom': '1rem'
                      }}>
                        <div style={{
                          width: `${result.validation.score}%`,
                          height: '100%',
                          background: result.validation.score >= 80 ? 'var(--success)' : 
                                     result.validation.score >= 60 ? 'var(--warning)' : 'var(--error)',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                      
                      <div style={{
                        display: 'flex',
                        gap: '0.5rem',
                        'flex-wrap': 'wrap'
                      }}>
                        <Button
                          onClick={() => showDetailedResults(result)}
                          variant="secondary"
                          size="sm"
                        >
                          📊 Details
                        </Button>
                        
                        <Button
                          onClick={() => showCropEditor(result)}
                          variant="outline"
                          size="sm"
                          title="Adjust crop area to include more hair or refine positioning"
                        >
                          ✂️ Adjust Crop
                        </Button>
                        
                        <Show when={results()!.bestResult?.method === result.method}>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            background: 'var(--success)',
                            color: 'white',
                            'border-radius': 'var(--border-radius-sm)',
                            'font-size': '0.75rem',
                            'align-self': 'center'
                          }}>
                            🏆 BEST
                          </span>
                        </Show>
                      </div>
                    </Show>
                  </div>
                )}
              </For>
            </div>
            
            {/* Landmark Detection Comparison */}
            <Show when={landmarkComparison()}>
              <div style={{ 'margin-bottom': '2rem' }}>
                <h4 style={{ 'margin-bottom': '1rem' }}>🎯 Landmark Detection Comparison</h4>
                <div style={{
                  'text-align': 'center',
                  'margin-bottom': '1rem'
                }}>
                  <img
                    src={landmarkComparison()}
                    style={{
                      'max-width': '100%',
                      'border-radius': 'var(--border-radius)',
                      border: '2px solid var(--border-color)',
                      'box-shadow': '0 4px 8px rgba(0,0,0,0.1)'
                    }}
                    alt="Landmark comparison"
                  />
                </div>
                
                {/* Landmark Legend */}
                <div style={{
                  padding: '1rem',
                  background: 'var(--background-secondary)',
                  'border-radius': 'var(--border-radius)',
                  'margin-bottom': '1rem'
                }}>
                  <h5 style={{ 'margin-bottom': '0.5rem' }}>🗺️ Landmark Legend</h5>
                  <div style={{
                    display: 'grid',
                    'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '0.5rem',
                    'font-size': '0.875rem'
                  }}>
                    <div style={{ display: 'flex', 'align-items': 'center' }}>
                      <div style={{
                        width: '12px',
                        height: '12px',
                        background: '#ff0000',
                        'border-radius': '50%',
                        'margin-right': '0.5rem',
                        border: '1px solid white'
                      }} />
                      <span>Eyes (Critical)</span>
                    </div>
                    <div style={{ display: 'flex', 'align-items': 'center' }}>
                      <div style={{
                        width: '10px',
                        height: '10px',
                        background: '#00ff00',
                        'border-radius': '50%',
                        'margin-right': '0.5rem',
                        border: '1px solid white'
                      }} />
                      <span>Nose (Important)</span>
                    </div>
                    <div style={{ display: 'flex', 'align-items': 'center' }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        background: '#0000ff',
                        'border-radius': '50%',
                        'margin-right': '0.5rem',
                        border: '1px solid white'
                      }} />
                      <span>Mouth (Moderate)</span>
                    </div>
                    <div style={{ display: 'flex', 'align-items': 'center' }}>
                      <div style={{
                        width: '6px',
                        height: '6px',
                        background: '#ff8000',
                        'border-radius': '50%',
                        'margin-right': '0.5rem',
                        border: '1px solid white'
                      }} />
                      <span>Ears/Other</span>
                    </div>
                    <div style={{ display: 'flex', 'align-items': 'center' }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        background: '#ff00ff',
                        'border-radius': '50%',
                        'margin-right': '0.5rem',
                        border: '1px solid white'
                      }} />
                      <span>Face Center</span>
                    </div>
                    <div style={{ display: 'flex', 'align-items': 'center' }}>
                      <div style={{
                        width: '20px',
                        height: '2px',
                        background: '#00ffff',
                        'margin-right': '0.5rem',
                        border: '1px dashed #00ffff'
                      }} />
                      <span>Eye Line</span>
                    </div>
                  </div>
                </div>
              </div>
            </Show>

            {/* Cropped Images Comparison */}
            <Show when={croppedImages().length > 0}>
              <div>
                <h4 style={{ 'margin-bottom': '1rem' }}>✂️ Cropped Results Comparison</h4>
                <div style={{
                  display: 'grid',
                  'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                  'margin-bottom': '1.5rem'
                }}>
                  <For each={croppedImages()}>
                    {(croppedImage, index) => {
                      const result = results()!.results.filter(r => r.success)[index()];
                      return (
                        <div style={{ 'text-align': 'center' }}>
                          <img
                            src={croppedImage}
                            style={{
                              width: '100%',
                              'max-width': '200px',
                              'border-radius': 'var(--border-radius)',
                              border: `3px solid ${result?.method === results()!.bestResult?.method ? 'var(--success)' : 'var(--border-color)'}`
                            }}
                            alt={`Cropped by ${result?.method}`}
                          />
                          <p style={{
                            'margin-top': '0.5rem',
                            'font-size': '0.875rem',
                            'font-weight': result?.method === results()!.bestResult?.method ? '600' : '400'
                          }}>
                            {DETECTION_METHODS[result?.method || '']?.name}
                            <Show when={result?.method === results()!.bestResult?.method}>
                              <span style={{ color: 'var(--success)' }}> 🏆</span>
                            </Show>
                          </p>
                          <p style={{
                            'font-size': '0.75rem',
                            color: 'var(--text-muted)'
                          }}>
                            Score: {result?.validation.score}/100 • {result?.landmarks.length} landmarks
                          </p>
                        </div>
                      );
                    }}
                  </For>
                </div>
              </div>
            </Show>
            
            {/* Best Result Actions */}
            <Show when={results()!.bestResult}>
              <div style={{
                padding: '1.5rem',
                background: 'var(--success-light)',
                'border-radius': 'var(--border-radius)',
                'text-align': 'center'
              }}>
                <h4 style={{ 'margin-bottom': '1rem', color: 'var(--success-dark)' }}>
                  🏆 Best Result: {DETECTION_METHODS[results()!.bestResult!.method]?.name}
                </h4>
                <p style={{ 'margin-bottom': '1.5rem', color: 'var(--success-dark)' }}>
                  Score: {results()!.bestResult!.validation.score}/100 • 
                  Confidence: {(results()!.bestResult!.confidence * 100).toFixed(1)}% • 
                  Time: {results()!.bestResult!.processingTime.toFixed(0)}ms
                </p>
                
                <div style={{
                  display: 'flex',
                  gap: '1rem',
                  'justify-content': 'center',
                  'flex-wrap': 'wrap'
                }}>
                  <Button
                    onClick={() => showCropEditor(results()!.bestResult!)}
                    variant="outline"
                    title="Fine-tune the crop area to include more hair or adjust positioning"
                  >
                    ✂️ Adjust Best Crop
                  </Button>
                  
                  <Button
                    onClick={() => {
                      const bestCroppedIndex = results()!.results
                        .filter(r => r.success)
                        .findIndex(r => r.method === results()!.bestResult!.method);
                      
                      if (bestCroppedIndex >= 0) {
                        const link = document.createElement('a');
                        link.download = `passport-photo-best-${Date.now()}.jpg`;
                        link.href = croppedImages()[bestCroppedIndex];
                        link.click();
                      }
                    }}
                    variant="secondary"
                  >
                    📥 Download Best Result
                  </Button>
                  
                  <Button
                    onClick={() => {
                      const bestCroppedIndex = results()!.results
                        .filter(r => r.success)
                        .findIndex(r => r.method === results()!.bestResult!.method);
                      
                      if (bestCroppedIndex >= 0) {
                        props.onBestResultSelected?.(
                          croppedImages()[bestCroppedIndex],
                          {
                            method: results()!.bestResult!.method,
                            score: results()!.bestResult!.validation.score,
                            metadata: results()!.bestResult!.metadata,
                            country: countryCode(),
                            timestamp: new Date().toISOString()
                          }
                        );
                      }
                    }}
                    variant="primary"
                  >
                    ✅ Use Best Result
                  </Button>
                </div>
              </div>
            </Show>
          </div>
        </Show>
        
        {/* Method Information */}
        <div style={{
          padding: '1rem',
          background: 'var(--background-secondary)',
          'border-radius': 'var(--border-radius)',
          'font-size': '0.875rem'
        }}>
          <h5 style={{ 'margin-bottom': '0.5rem' }}>📋 Method Comparison</h5>
          <div style={{
            display: 'grid',
            'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1rem'
          }}>
            <div>
              <strong>🤖 BlazeFace (Local)</strong>
              <ul style={{ margin: '0.25rem 0 0 1rem', padding: '0' }}>
                <li>✅ Fast & lightweight</li>
                <li>✅ Complete privacy</li>
                <li>⚠️ Basic landmarks (6 points)</li>
              </ul>
            </div>
            <div>
              <strong>🧠 Enhanced Client-Side</strong>
              <ul style={{ margin: '0.25rem 0 0 1rem', padding: '0' }}>
                <li>✅ Advanced analysis</li>
                <li>✅ Pose & quality detection</li>
                <li>✅ Expression analysis</li>
              </ul>
            </div>
            <div>
              <strong>☁️ Amazon Rekognition</strong>
              <ul style={{ margin: '0.25rem 0 0 1rem', padding: '0' }}>
                <li>✅ 100+ landmarks</li>
                <li>✅ Professional accuracy</li>
                <li>⚠️ Requires AWS account</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default FaceDetectionComparisonComponent;