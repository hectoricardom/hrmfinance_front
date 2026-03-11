import { Component, createSignal, Show, For, createEffect } from 'solid-js';
import { Card, Button, Input } from '../../ui';
import { useModal } from '../../../contexts/ModalContext';
import { devLog } from '../../../services/utils';
import { 
  API_PROVIDERS,
  EnhancedPassportPhotoProcessor,
  validateAPIKeys,
  estimateAPICost,
  type PassportPhotoOptions
} from '../utils/passportPhotoAPIs';

interface PassportPhotoAPIEnhancedProps {
  clientName?: string;
  onPhotoSaved?: (photoUrl: string, metadata: any) => void;
}

interface APIConfig {
  provider: string;
  enabled: boolean;
  keys: Record<string, string>;
}

const PassportPhotoAPIEnhanced: Component<PassportPhotoAPIEnhancedProps> = (props) => {
  const modal = useModal();
  
  // API Configuration state
  const [selectedAPIs, setSelectedAPIs] = createSignal<APIConfig[]>([
    { provider: 'remove.bg', enabled: false, keys: { apiKey: '' } },
    { provider: 'faceplusplus', enabled: false, keys: { apiKey: '', apiSecret: '' } },
    { provider: 'cloudinary', enabled: false, keys: { cloudName: '', apiKey: '', apiSecret: '', uploadPreset: '' } },
    { provider: 'azure-face', enabled: false, keys: { endpoint: '', subscriptionKey: '' } }
  ]);
  
  const [selectedFile, setSelectedFile] = createSignal<File | null>(null);
  const [processing, setProcessing] = createSignal(false);
  const [processedPhoto, setProcessedPhoto] = createSignal<string>('');
  const [processingSteps, setProcessingSteps] = createSignal<string[]>([]);
  const [selectedCountry, setSelectedCountry] = createSignal<PassportPhotoOptions['countryCode']>('CU');
  const [removeBackground, setRemoveBackground] = createSignal(true);
  const [enhanceFace, setEnhanceFace] = createSignal(true);
  
  // Preview states
  const [originalPreview, setOriginalPreview] = createSignal<string>('');
  const [showDebugInfo, setShowDebugInfo] = createSignal(false);
  
  const countryOptions = [
    { value: 'US', label: '🇺🇸 Estados Unidos (2x2 pulgadas)' },
    { value: 'EU', label: '🇪🇺 Unión Europea (35x45 mm)' },
    { value: 'UK', label: '🇬🇧 Reino Unido (35x45 mm)' },
    { value: 'CA', label: '🇨🇦 Canadá (50x70 mm)' },
    { value: 'CU', label: '🇨🇺 Cuba (30x30 mm)' },
    { value: 'IN', label: '🇮🇳 India (35x35 mm)' },
    { value: 'AU', label: '🇦🇺 Australia (35x45 mm)' }
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
    }
  };
  
  const updateAPIConfig = (provider: string, field: string, value: string | boolean) => {
    setSelectedAPIs(apis => 
      apis.map(api => {
        if (api.provider === provider) {
          if (field === 'enabled') {
            return { ...api, enabled: value as boolean };
          } else {
            return { 
              ...api, 
              keys: { ...api.keys, [field]: value as string }
            };
          }
        }
        return api;
      })
    );
  };
  
  const getEnabledAPIs = () => {
    return selectedAPIs().filter(api => 
      api.enabled && validateAPIKeys(api.provider, api.keys)
    );
  };
  
  const processWithAPIs = async () => {
    const file = selectedFile();
    if (!file) return;
    
    setProcessing(true);
    setProcessingSteps([]);
    setProcessedPhoto('');
    
    try {
      const enabledAPIs = getEnabledAPIs();
      
      if (enabledAPIs.length === 0) {
        modal.showModal({
          title: 'No APIs Configured',
          children: (
            <div style={{ padding: '1.5rem' }}>
              <p>Please configure at least one API with valid credentials.</p>
            </div>
          )
        });
        setProcessing(false);
        return;
      }
      
      // Build API configuration object
      const apiConfigs: any = {};
      
      enabledAPIs.forEach(api => {
        switch (api.provider) {
          case 'remove.bg':
            apiConfigs.removeBg = { apiKey: api.keys.apiKey };
            break;
          case 'faceplusplus':
            apiConfigs.facePlusPlus = { 
              apiKey: api.keys.apiKey, 
              apiSecret: api.keys.apiSecret 
            };
            break;
          case 'cloudinary':
            apiConfigs.cloudinary = {
              cloudName: api.keys.cloudName,
              apiKey: api.keys.apiKey,
              apiSecret: api.keys.apiSecret,
              uploadPreset: api.keys.uploadPreset
            };
            break;
          case 'azure-face':
            apiConfigs.azureFace = {
              endpoint: api.keys.endpoint,
              subscriptionKey: api.keys.subscriptionKey
            };
            break;
        }
      });
      
      setProcessingSteps(steps => [...steps, '🚀 Initializing API processor...']);
      
      const processor = new EnhancedPassportPhotoProcessor(apiConfigs);
      
      setProcessingSteps(steps => [...steps, '📸 Processing passport photo...']);
      
      const result = await processor.processPassportPhoto(file, {
        countryCode: selectedCountry(),
        removeBackground: removeBackground(),
        enhanceFace: enhanceFace(),
        backgroundColor: '#FFFFFF'
      });
      
      setProcessedPhoto(result.base64);
      
      // Log processing steps
      if (result.metadata?.processingSteps) {
        result.metadata.processingSteps.forEach((step: string) => {
          setProcessingSteps(steps => [...steps, `✅ ${step}`]);
        });
      }
      
      setProcessingSteps(steps => [...steps, '🎉 Processing complete!']);
      
      // Show success modal
      showSuccessModal(result);
      
    } catch (error) {
      devLog('Error processing photo:', error);
      setProcessingSteps(steps => [...steps, `❌ Error: ${error.message}`]);
      
      modal.showModal({
        title: 'Processing Error',
        children: (
          <div style={{ padding: '1.5rem' }}>
            <p style={{ 'margin-bottom': '1rem' }}>
              An error occurred while processing the photo:
            </p>
            <code style={{
              display: 'block',
              padding: '0.5rem',
              background: 'var(--background-secondary)',
              'border-radius': 'var(--border-radius-sm)',
              'font-size': '0.875rem'
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
  
  const showSuccessModal = (result: any) => {
    modal.showModal({
      title: 'Enhanced Passport Photo',
      size: 'lg',
      children: (
        <div style={{ padding: '1.5rem' }}>
          <div style={{
            display: 'grid',
            'grid-template-columns': '1fr 1fr',
            gap: '1rem',
            'margin-bottom': '1.5rem'
          }}>
            <div>
              <h4 style={{ 'margin-bottom': '0.5rem' }}>Original</h4>
              <img
                src={originalPreview()}
                style={{
                  width: '100%',
                  'max-width': '300px',
                  'border-radius': 'var(--border-radius)',
                  border: '1px solid var(--border-color)'
                }}
                alt="Original"
              />
            </div>
            <div>
              <h4 style={{ 'margin-bottom': '0.5rem' }}>Processed</h4>
              <img
                src={result.base64}
                style={{
                  width: '100%',
                  'max-width': '300px',
                  'border-radius': 'var(--border-radius)',
                  border: '1px solid var(--border-color)'
                }}
                alt="Processed"
              />
            </div>
          </div>
          
          <Show when={result.metadata}>
            <div style={{
              padding: '1rem',
              background: 'var(--background-secondary)',
              'border-radius': 'var(--border-radius)',
              'margin-bottom': '1rem'
            }}>
              <h5 style={{ 'margin-bottom': '0.5rem' }}>Processing Details:</h5>
              <ul style={{ margin: '0', 'padding-left': '1.5rem' }}>
                <For each={result.metadata.processingSteps}>
                  {(step) => <li>{step}</li>}
                </For>
              </ul>
            </div>
          </Show>
          
          <div style={{
            display: 'flex',
            gap: '1rem',
            'justify-content': 'center'
          }}>
            <Button
              onClick={() => {
                const link = document.createElement('a');
                link.download = `passport-photo-enhanced-${Date.now()}.jpg`;
                link.href = result.base64;
                link.click();
              }}
              variant="secondary"
            >
              📥 Download
            </Button>
            <Button
              onClick={() => {
                props.onPhotoSaved?.(result.base64, result.metadata);
                modal.hideModal();
              }}
              variant="primary"
            >
              ✅ Save Photo
            </Button>
          </div>
        </div>
      )
    });
  };
  
  const estimateCost = () => {
    const enabledAPIs = getEnabledAPIs();
    const costs = enabledAPIs.map(api => ({
      provider: API_PROVIDERS[api.provider].name,
      cost: estimateAPICost(api.provider, 1)
    }));
    
    return costs;
  };
  
  return (
    <Card>
      <div style={{ padding: '2rem' }}>
        <h3 style={{
          'font-size': '1.5rem',
          'font-weight': '600',
          'margin-bottom': '1.5rem'
        }}>
          🚀 Enhanced Passport Photo Processor
        </h3>
        
        {/* API Configuration Section */}
        <div style={{ 'margin-bottom': '2rem' }}>
          <h4 style={{ 'margin-bottom': '1rem' }}>API Configuration</h4>
          
          <For each={selectedAPIs()}>
            {(api) => {
              const provider = API_PROVIDERS[api.provider];
              return (
                <div style={{
                  padding: '1rem',
                  'margin-bottom': '1rem',
                  background: api.enabled ? 'var(--success-light)' : 'var(--background-secondary)',
                  'border-radius': 'var(--border-radius)',
                  border: `1px solid ${api.enabled ? 'var(--success)' : 'var(--border-color)'}`
                }}>
                  <div style={{
                    display: 'flex',
                    'align-items': 'center',
                    'margin-bottom': '0.5rem'
                  }}>
                    <input
                      type="checkbox"
                      checked={api.enabled}
                      onChange={(e) => updateAPIConfig(api.provider, 'enabled', e.target.checked)}
                      style={{ 'margin-right': '0.5rem' }}
                    />
                    <strong>{provider.name}</strong>
                  </div>
                  
                  <p style={{
                    'font-size': '0.875rem',
                    color: 'var(--text-muted)',
                    'margin-bottom': '0.5rem'
                  }}>
                    {provider.description} • {provider.pricing}
                  </p>
                  
                  <Show when={api.enabled}>
                    <div style={{
                      'margin-top': '1rem',
                      display: 'grid',
                      'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '0.5rem'
                    }}>
                      {api.provider === 'remove.bg' && (
                        <Input
                          type="password"
                          placeholder="API Key"
                          value={api.keys.apiKey}
                          onInput={(e) => updateAPIConfig(api.provider, 'apiKey', e.currentTarget.value)}
                        />
                      )}
                      
                      {api.provider === 'faceplusplus' && (
                        <>
                          <Input
                            type="password"
                            placeholder="API Key"
                            value={api.keys.apiKey}
                            onInput={(e) => updateAPIConfig(api.provider, 'apiKey', e.currentTarget.value)}
                          />
                          <Input
                            type="password"
                            placeholder="API Secret"
                            value={api.keys.apiSecret}
                            onInput={(e) => updateAPIConfig(api.provider, 'apiSecret', e.currentTarget.value)}
                          />
                        </>
                      )}
                      
                      {api.provider === 'cloudinary' && (
                        <>
                          <Input
                            type="text"
                            placeholder="Cloud Name"
                            value={api.keys.cloudName}
                            onInput={(e) => updateAPIConfig(api.provider, 'cloudName', e.currentTarget.value)}
                          />
                          <Input
                            type="password"
                            placeholder="API Key"
                            value={api.keys.apiKey}
                            onInput={(e) => updateAPIConfig(api.provider, 'apiKey', e.currentTarget.value)}
                          />
                          <Input
                            type="password"
                            placeholder="API Secret"
                            value={api.keys.apiSecret}
                            onInput={(e) => updateAPIConfig(api.provider, 'apiSecret', e.currentTarget.value)}
                          />
                          <Input
                            type="text"
                            placeholder="Upload Preset (optional)"
                            value={api.keys.uploadPreset}
                            onInput={(e) => updateAPIConfig(api.provider, 'uploadPreset', e.currentTarget.value)}
                          />
                        </>
                      )}
                      
                      {api.provider === 'azure-face' && (
                        <>
                          <Input
                            type="text"
                            placeholder="Endpoint URL"
                            value={api.keys.endpoint}
                            onInput={(e) => updateAPIConfig(api.provider, 'endpoint', e.currentTarget.value)}
                          />
                          <Input
                            type="password"
                            placeholder="Subscription Key"
                            value={api.keys.subscriptionKey}
                            onInput={(e) => updateAPIConfig(api.provider, 'subscriptionKey', e.currentTarget.value)}
                          />
                        </>
                      )}
                    </div>
                  </Show>
                </div>
              );
            }}
          </For>
        </div>
        
        {/* Photo Processing Options */}
        <div style={{ 'margin-bottom': '2rem' }}>
          <h4 style={{ 'margin-bottom': '1rem' }}>Processing Options</h4>
          
          <div style={{
            display: 'grid',
            'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1rem'
          }}>
            <div>
              <label style={{ display: 'block', 'margin-bottom': '0.5rem' }}>
                Country Specification
              </label>
              <select
                value={selectedCountry()}
                onChange={(e) => setSelectedCountry(e.currentTarget.value as any)}
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
                  checked={removeBackground()}
                  onChange={(e) => setRemoveBackground(e.target.checked)}
                  style={{ 'margin-right': '0.5rem' }}
                />
                Remove Background
              </label>
              
              <label>
                <input
                  type="checkbox"
                  checked={enhanceFace()}
                  onChange={(e) => setEnhanceFace(e.target.checked)}
                  style={{ 'margin-right': '0.5rem' }}
                />
                Enhance Face Quality
              </label>
              
              <label>
                <input
                  type="checkbox"
                  checked={showDebugInfo()}
                  onChange={(e) => setShowDebugInfo(e.target.checked)}
                  style={{ 'margin-right': '0.5rem' }}
                />
                Show Debug Info
              </label>
            </div>
          </div>
        </div>
        
        {/* File Upload Section */}
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
                <strong>{selectedFile()?.name}</strong> ({(selectedFile()?.size || 0 / 1024).toFixed(2)} KB)
              </p>
              <Button
                onClick={() => {
                  setSelectedFile(null);
                  setOriginalPreview('');
                  setProcessedPhoto('');
                  setProcessingSteps([]);
                }}
                variant="secondary"
              >
                Remove File
              </Button>
            </div>
          }>
            <div style={{ 'font-size': '3rem', 'margin-bottom': '1rem' }}>📷</div>
            <p style={{ 'margin-bottom': '1rem' }}>
              Select a photo to process
            </p>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              id="photo-upload"
            />
            <label for="photo-upload">
              <Button variant="primary" as="span">
                Select Photo
              </Button>
            </label>
          </Show>
        </div>
        
        {/* Cost Estimation */}
        <Show when={getEnabledAPIs().length > 0}>
          <div style={{
            padding: '1rem',
            background: 'var(--info-light)',
            'border-radius': 'var(--border-radius)',
            'margin-bottom': '1rem'
          }}>
            <strong>💰 Estimated Cost:</strong>
            <ul style={{ margin: '0.5rem 0 0 1.5rem', padding: '0' }}>
              <For each={estimateCost()}>
                {(cost) => <li>{cost.provider}: {cost.cost}</li>}
              </For>
            </ul>
          </div>
        </Show>
        
        {/* Processing Status */}
        <Show when={processingSteps().length > 0}>
          <div style={{
            padding: '1rem',
            background: 'var(--background-secondary)',
            'border-radius': 'var(--border-radius)',
            'margin-bottom': '1rem',
            'max-height': '200px',
            'overflow-y': 'auto'
          }}>
            <h5 style={{ 'margin-bottom': '0.5rem' }}>Processing Log:</h5>
            <For each={processingSteps()}>
              {(step) => (
                <div style={{ 'font-size': '0.875rem', 'margin-bottom': '0.25rem' }}>
                  {step}
                </div>
              )}
            </For>
          </div>
        </Show>
        
        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          'justify-content': 'center'
        }}>
          <Button
            onClick={processWithAPIs}
            variant="primary"
            size="lg"
            disabled={!selectedFile() || processing() || getEnabledAPIs().length === 0}
          >
            {processing() ? '⏳ Processing...' : '🚀 Process Photo with APIs'}
          </Button>
        </div>
        
        {/* Features Info */}
        <div style={{
          'margin-top': '2rem',
          padding: '1rem',
          background: 'var(--background-secondary)',
          'border-radius': 'var(--border-radius)',
          'font-size': '0.875rem'
        }}>
          <h5 style={{ 'margin-bottom': '0.5rem' }}>🌟 API Features:</h5>
          <For each={getEnabledAPIs()}>
            {(api) => {
              const provider = API_PROVIDERS[api.provider];
              return (
                <div style={{ 'margin-bottom': '0.5rem' }}>
                  <strong>{provider.name}:</strong>
                  <ul style={{ margin: '0.25rem 0 0 1.5rem', padding: '0' }}>
                    <For each={provider.features.slice(0, 3)}>
                      {(feature) => <li>{feature}</li>}
                    </For>
                  </ul>
                </div>
              );
            }}
          </For>
        </div>
      </div>
    </Card>
  );
};

export default PassportPhotoAPIEnhanced;