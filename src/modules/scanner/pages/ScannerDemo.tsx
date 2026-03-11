import { Component, createSignal, Show, For } from 'solid-js';
import { Layout } from '../../ui';
import ScannerIntegration, { 
  InventoryScannerIntegration,
  LocationScannerIntegration,
  AssetScannerIntegration,
  ShippingScannerIntegration,
  useBarcodeScanner
} from '../components/ScannerIntegration';
import { authStore } from '../../../stores/authStore';

interface ScanResult {
  id: string;
  barcode: string;
  location?: string;
  timestamp: number;
  type: string;
}

const ScannerDemo: Component = () => {
  const [scanResults, setScanResults] = createSignal<ScanResult[]>([]);
  const [notifications, setNotifications] = createSignal<string[]>([]);
  
  // Use the programmatic scanner hook
  const {
    isOpen: isCustomScannerOpen,
    lastResult: customScanResult,
    openScanner: openCustomScanner,
    closeScanner: closeCustomScanner,
    ScannerComponent: CustomScannerComponent
  } = useBarcodeScanner();

  // Handle scan completion
  const handleScanComplete = (barcode: string, scannerType: string) => {
    const newResult: ScanResult = {
      id: Date.now().toString(),
      barcode,
      timestamp: Date.now(),
      type: scannerType
    };

    
    console.log(authStore.profile())
    
    setScanResults(prev => [newResult, ...prev.slice(0, 9)]); // Keep only last 10 results
    addNotification(`✅ ${scannerType} scan completed: ${barcode}`);
  };

  // Handle location updates
  const handleLocationUpdate = (barcode: string, newLocation: string, scannerType: string) => {
    setScanResults(prev => prev.map(result => 
      result.barcode === barcode 
        ? { ...result, location: newLocation }
        : result
    ));
    
    addNotification(`📍 Location updated for ${barcode}: ${newLocation}`);
  };

  // Handle scanner errors
  const handleScannerError = (error: string) => {
    addNotification(`❌ Scanner error: ${error}`);
  };

  // Add notification with auto-remove
  const addNotification = (message: string) => {
    setNotifications(prev => [message, ...prev.slice(0, 4)]);
    setTimeout(() => {
      setNotifications(prev => prev.slice(0, -1));
    }, 5000);
  };

  // Format date for display
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

 
  // Styles
  const containerStyle = {
    padding: '2rem',
    'max-width': '1200px',
    margin: '0 auto'
  };

  const sectionStyle = {
    'margin-bottom': '2rem',
    padding: '1.5rem',
    border: '1px solid #ddd',
    'border-radius': '8px',
    'background-color': '#f8f9fa'
  };

  const gridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem',
    'margin-top': '1rem'
  };

  const cardStyle = {
    padding: '1rem',
    'background-color': 'white',
    border: '1px solid #ddd',
    'border-radius': '6px',
    'text-align': 'center' as const
  };

  const notificationStyle = (index: number) => ({
    padding: '0.75rem',
    'margin-bottom': '0.5rem',
    'background-color': '#d4edda',
    color: '#155724',
    border: '1px solid #c3e6cb',
    'border-radius': '6px',
    opacity: 1 - (index * 0.2),
    transition: 'all 0.3s ease'
  });

  const resultItemStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '0.75rem',
    'margin-bottom': '0.5rem',
    'background-color': 'white',
    border: '1px solid #ddd',
    'border-radius': '6px'
  };

  const codeStyle = {
    'font-family': 'monospace',
    'background-color': '#f8f9fa',
    padding: '0.25rem 0.5rem',
    'border-radius': '4px',
    'font-size': '0.9rem'
  };

  return (
    <Layout title="📷 Barcode Scanner Demo">
      <div style={containerStyle}>
        {/* Page Header */}
        <div style={{ 'text-align': 'center', 'margin-bottom': '2rem' }}>
          <h1 style={{ 'font-size': '2.5rem', margin: '0 0 0.5rem 0' }}>
            📷 Barcode Scanner Demo
          </h1>
          <p style={{ 'font-size': '1.1rem', color: '#666', margin: '0' }}>
            Test the integrated barcode scanner with camera functionality and location updates
          </p>
        </div>

        {/* Notifications */}
        <Show when={notifications().length > 0}>
          <div style={{ 'margin-bottom': '2rem' }}>
            <h3 style={{ 'margin-bottom': '1rem' }}>🔔 Notifications</h3>
            <For each={notifications()}>
              {(notification, index) => (
                <div style={notificationStyle(index())}>
                  {notification}
                </div>
              )}
            </For>
          </div>
        </Show>

        {/* Pre-configured Scanner Integrations */}
        <div style={sectionStyle}>
          <h2 style={{ margin: '0 0 1rem 0' }}>🎯 Pre-configured Scanner Types</h2>
          <p style={{ margin: '0 0 1rem 0', color: '#666' }}>
            These are pre-configured scanner components for common use cases:
          </p>
          
          <div style={gridStyle}>
            <div style={cardStyle}>
              <h4>📦 Inventory Scanner</h4>
              <p style={{ 'font-size': '0.9rem', color: '#666', 'margin-bottom': '1rem' }}>
                For scanning inventory items with location lookup and history
              </p>
              <InventoryScannerIntegration
                onScanComplete={(barcode) => handleScanComplete(barcode, 'Inventory')}
                onLocationUpdated={(barcode, location) => handleLocationUpdate(barcode, location, 'Inventory')}
                onError={handleScannerError}
              />
            </div>

            <div style={cardStyle}>
              <h4>📍 Location Scanner</h4>
              <p style={{ 'font-size': '0.9rem', color: '#666', 'margin-bottom': '1rem' }}>
                Simple location scanning without history
              </p>
              <LocationScannerIntegration
                onScanComplete={(barcode) => handleScanComplete(barcode, 'Location')}
                onLocationUpdated={(barcode, location) => handleLocationUpdate(barcode, location, 'Location')}
                onError={handleScannerError}
              />
            </div>

            <div style={cardStyle}>
              <h4>🏷️ Asset Scanner</h4>
              <p style={{ 'font-size': '0.9rem', color: '#666', 'margin-bottom': '1rem' }}>
                For asset tracking with full location history
              </p>
              <AssetScannerIntegration
                onScanComplete={(barcode) => handleScanComplete(barcode, 'Asset')}
                onLocationUpdated={(barcode, location) => handleLocationUpdate(barcode, location, 'Asset')}
                onError={handleScannerError}
              />
            </div>

            <div style={cardStyle}>
              <h4>📮 Shipping Scanner</h4>
              <p style={{ 'font-size': '0.9rem', color: '#666', 'margin-bottom': '1rem' }}>
                For package tracking and shipping updates
              </p>
              <ShippingScannerIntegration
                onScanComplete={(barcode) => handleScanComplete(barcode, 'Shipping')}
                onLocationUpdated={(barcode, location) => handleLocationUpdate(barcode, location, 'Shipping')}
                onError={handleScannerError}
              />
            </div>
          </div>
        </div>

        {/* Custom Scanner Integration */}
        <div style={sectionStyle}>
          <h2 style={{ margin: '0 0 1rem 0' }}>⚙️ Custom Scanner Configuration</h2>
          <p style={{ margin: '0 0 1rem 0', color: '#666' }}>
            Fully customizable scanner with your own settings:
          </p>
          
          <div style={{ display: 'flex', gap: '1rem', 'flex-wrap': 'wrap' }}>
            <ScannerIntegration
              buttonText="Custom Scanner"
              buttonIcon="🔧"
              autoLookupLocation={true}
              showHistory={true}
              integrationMode="standalone"
              onScanComplete={(barcode) => handleScanComplete(barcode, 'Custom')}
              onLocationUpdated={(barcode, location) => handleLocationUpdate(barcode, location, 'Custom')}
              onError={handleScannerError}
              buttonStyle={{
                'background-color': '#28a745',
                'border-radius': '8px'
              }}
            />

            <button
              style={{
                padding: '0.75rem 1.5rem',
                'background-color': '#6c757d',
                color: 'white',
                border: 'none',
                'border-radius': '6px',
                cursor: 'pointer',
                'font-weight': '500'
              }}
              onClick={openCustomScanner}
            >
              🔬 Programmatic Scanner
            </button>
          </div>

          {/* Show result from programmatic scanner */}
          <Show when={customScanResult()}>
            <div style={{
              'margin-top': '1rem',
              padding: '1rem',
              'background-color': '#e8f5e8',
              border: '1px solid #c3e6cb',
              'border-radius': '6px'
            }}>
              <strong>Programmatic scan result:</strong> <span style={codeStyle}>{customScanResult()}</span>
            </div>
          </Show>
        </div>

        {/* Scan Results */}
        <div style={sectionStyle}>
          <h2 style={{ margin: '0 0 1rem 0' }}>📊 Recent Scan Results</h2>
          
          <Show when={scanResults().length === 0}>
            <p style={{ color: '#666', 'text-align': 'center', 'font-style': 'italic' }}>
              No scans completed yet. Try scanning a barcode with any of the scanners above!
            </p>
          </Show>

          <Show when={scanResults().length > 0}>
            <div>
              <For each={scanResults()}>
                {(result) => (
                  <div style={resultItemStyle}>
                    <div>
                      <div style={{ 'font-weight': '500' }}>
                        {result.type} - <span style={codeStyle}>{result.barcode}</span>
                      </div>
                      <Show when={result.location}>
                        <div style={{ 'font-size': '0.9rem', color: '#666', 'margin-top': '0.25rem' }}>
                          📍 Location: {result.location}
                        </div>
                      </Show>
                    </div>
                    <div style={{ 'font-size': '0.8rem', color: '#666' }}>
                      {formatDate(result.timestamp)}
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>

        {/* Features Overview */}
        <div style={sectionStyle}>
          <h2 style={{ margin: '0 0 1rem 0' }}>✨ Scanner Features</h2>
          <div style={{ display: 'grid', 'grid-template-columns': 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            <div>
              <h4>📷 Camera Integration</h4>
              <ul style={{ 'padding-left': '1.5rem', margin: '0' }}>
                <li>Real-time camera preview</li>
                <li>Multiple camera support</li>
                <li>Auto-focus and lighting optimization</li>
                <li>Mobile-responsive design</li>
              </ul>
            </div>
            
            <div>
              <h4>🔍 Barcode Detection</h4>
              <ul style={{ 'padding-left': '1.5rem', margin: '0' }}>
                <li>Supports multiple barcode formats</li>
                <li>High-accuracy scanning</li>
                <li>Visual scanning guides</li>
                <li>Error handling and retry logic</li>
              </ul>
            </div>
            
            <div>
              <h4>📍 Location Management</h4>
              <ul style={{ 'padding-left': '1.5rem', margin: '0' }}>
                <li>Update scanned item locations</li>
                <li>Auto-lookup current locations</li>
                <li>Scan history tracking</li>
                <li>Bulk location updates</li>
              </ul>
            </div>
            
            <div>
              <h4>🔧 Integration Options</h4>
              <ul style={{ 'padding-left': '1.5rem', margin: '0' }}>
                <li>Pre-configured components</li>
                <li>Programmatic API access</li>
                <li>Customizable UI and callbacks</li>
                <li>Easy module integration</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Usage Instructions */}
        <div style={sectionStyle}>
          <h2 style={{ margin: '0 0 1rem 0' }}>📋 How to Use</h2>
          <ol style={{ 'padding-left': '1.5rem' }}>
            <li><strong>Click any scanner button</strong> to open the camera scanner</li>
            <li><strong>Allow camera permissions</strong> when prompted by your browser</li>
            <li><strong>Position a barcode</strong> within the green frame on the camera preview</li>
            <li><strong>Wait for automatic detection</strong> - the scanner will beep when successful</li>
            <li><strong>Enter a new location</strong> if you want to update the item's location</li>
            <li><strong>View the scan history</strong> to see previous locations (if enabled)</li>
          </ol>
          
          <div style={{ 
            'margin-top': '1rem', 
            padding: '1rem', 
            'background-color': '#fff3cd',
            border: '1px solid #ffeaa7',
            'border-radius': '6px'
          }}>
            <strong>💡 Tip:</strong> For best results, ensure good lighting and hold the device steady while scanning.
            The scanner works with most common barcode formats including QR codes, Code 128, and UPC.
          </div>
        </div>

        {/* Custom Scanner Component (programmatic) */}
        <CustomScannerComponent />
      </div>
    </Layout>
  );
};

export default ScannerDemo;