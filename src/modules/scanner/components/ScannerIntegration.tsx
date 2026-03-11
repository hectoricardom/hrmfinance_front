import { Component, createSignal, Show } from 'solid-js';
import EnhancedBarcodeScanner from './EnhancedBarcodeScanner';
import { scannerService } from '../services/scannerService';

interface ScannerIntegrationProps {
  // Display options
  buttonText?: string;
  buttonStyle?: any;
  buttonIcon?: string;
  
  // Scanner configuration
  autoLookupLocation?: boolean;
  showHistory?: boolean;
  
  // Callbacks
  onScanComplete?: (barcode: string, location?: string) => void;
  onLocationUpdated?: (barcode: string, newLocation: string, oldLocation?: string) => void;
  onError?: (error: string) => void;
  
  // Integration options
  integrationMode?: 'standalone' | 'embedded';
  title?: string;
}

const ScannerIntegration: Component<ScannerIntegrationProps> = (props) => {
  const [isScannerOpen, setIsScannerOpen] = createSignal(false);
  const [lastScanResult, setLastScanResult] = createSignal<string>('');
  const [lastLocationUpdate, setLastLocationUpdate] = createSignal<{barcode: string, location: string}>({barcode: '', location: ''});

  // Handle scan completion
  const handleScanComplete = (barcode: string) => {
    console.log('Scan completed:', barcode);
    setLastScanResult(barcode);
    
    // Call parent callback
    if (props.onScanComplete) {
      props.onScanComplete(barcode);
    }
  };

  // Handle location update
  const handleLocationUpdate = (barcode: string, newLocation: string) => {
    console.log('Location updated:', { barcode, newLocation });
    setLastLocationUpdate({ barcode, location: newLocation });
    
    // Call parent callback
    if (props.onLocationUpdated) {
      props.onLocationUpdated(barcode, newLocation);
    }
  };

  // Handle scanner errors
  const handleScannerError = (error: string) => {
    console.error('Scanner error:', error);
    
    // Call parent callback
    if (props.onError) {
      props.onError(error);
    }
  };

  // Default button style
  const defaultButtonStyle = {
    padding: '0.75rem 1.5rem',
    'background-color': '#007bff',
    color: 'white',
    border: 'none',
    'border-radius': '6px',
    cursor: 'pointer',
    'font-weight': '500',
    'font-size': '1rem',
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    transition: 'all 0.2s ease',
    ...props.buttonStyle
  };

  // Stats display component
  const ScannerStats = () => (
    <Show when={lastScanResult() || lastLocationUpdate().barcode}>
      <div style={{
        'margin-top': '1rem',
        padding: '1rem',
        'background-color': '#f8f9fa',
        border: '1px solid #dee2e6',
        'border-radius': '6px',
        'font-size': '0.875rem'
      }}>
        <h4 style={{ margin: '0 0 0.5rem 0', color: '#495057' }}>📊 Recent Activity</h4>
        
        <Show when={lastScanResult()}>
          <div style={{ 'margin-bottom': '0.5rem' }}>
            <strong>Last Scan:</strong> {lastScanResult()}
          </div>
        </Show>
        
        <Show when={lastLocationUpdate().barcode}>
          <div>
            <strong>Last Update:</strong> {lastLocationUpdate().barcode} → {lastLocationUpdate().location}
          </div>
        </Show>
      </div>
    </Show>
  );

  return (
    <>
      {/* Scanner Trigger Button */}
      <button
        style={defaultButtonStyle}
        onClick={() => setIsScannerOpen(true)}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#0056b3';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = props.buttonStyle?.backgroundColor || '#007bff';
        }}
      >
        <span style={{ 'font-size': '1.2em' }}>
          {props.buttonIcon || '📷'}
        </span>
        {props.buttonText || 'Scan Barcode'}
      </button>

      {/* Scanner Stats (for standalone mode) */}
      <Show when={props.integrationMode === 'standalone'}>
        <ScannerStats />
      </Show>

      {/* Enhanced Barcode Scanner Modal */}
      <EnhancedBarcodeScanner
        isOpen={isScannerOpen()}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScanComplete}
        onError={handleScannerError}
        onLocationUpdate={handleLocationUpdate}
        autoLookupLocation={props.autoLookupLocation ?? true}
        showHistory={props.showHistory ?? true}
      />
    </>
  );
};

// Pre-configured scanner components for common use cases

export const InventoryScannerIntegration: Component<Partial<ScannerIntegrationProps>> = (props) => (
  <ScannerIntegration
    buttonText="Scan Inventory Item"
    buttonIcon="📦"
    autoLookupLocation={true}
    showHistory={true}
    integrationMode="embedded"
    {...props}
  />
);

export const LocationScannerIntegration: Component<Partial<ScannerIntegrationProps>> = (props) => (
  <ScannerIntegration
    buttonText="Scan Location"
    buttonIcon="📍"
    autoLookupLocation={false}
    showHistory={false}
    integrationMode="embedded"
    {...props}
  />
);

export const AssetScannerIntegration: Component<Partial<ScannerIntegrationProps>> = (props) => (
  <ScannerIntegration
    buttonText="Scan Asset"
    buttonIcon="🏷️"
    autoLookupLocation={true}
    showHistory={true}
    integrationMode="embedded"
    {...props}
  />
);

export const ShippingScannerIntegration: Component<Partial<ScannerIntegrationProps>> = (props) => (
  <ScannerIntegration
    buttonText="Scan Package"
    buttonIcon="📮"
    autoLookupLocation={true}
    showHistory={true}
    integrationMode="embedded"
    {...props}
  />
);

// Quick scanner hook for programmatic access
export const useBarcodeScanner = () => {
  const [isScannerOpen, setIsScannerOpen] = createSignal(false);
  const [lastResult, setLastResult] = createSignal<string>('');

  const openScanner = () => setIsScannerOpen(true);
  const closeScanner = () => setIsScannerOpen(false);

  const handleScan = (result: string) => {
    setLastResult(result);
    closeScanner();
  };

  const ScannerComponent = () => (
    <EnhancedBarcodeScanner
      isOpen={isScannerOpen()}
      onClose={closeScanner}
      onScan={handleScan}
      autoLookupLocation={true}
      showHistory={true}
    />
  );

  return {
    isOpen: isScannerOpen,
    lastResult,
    openScanner,
    closeScanner,
    ScannerComponent
  };
};

export default ScannerIntegration;