# 📷 Barcode Scanner Module

A comprehensive barcode scanning module with camera functionality for web applications. This module provides components and services for scanning barcodes and updating scanned locations with real-time camera preview.

## 🚀 Features

- **📷 Real-time camera scanning** with live preview
- **🎯 Multiple barcode format support** (QR codes, Code 128, UPC, etc.)
- **📍 Location management** with update capabilities
- **📚 Scan history tracking** with timestamp records
- **🔧 Highly configurable** components for different use cases
- **📱 Mobile responsive** design with touch-friendly interface
- **⚡ Easy integration** with existing modules
- **🛡️ Error handling** and camera permission management

## 📦 Components

### BarcodeScanner
Basic barcode scanner component with camera functionality.

```tsx
import { BarcodeScanner } from '../../scanner';

<BarcodeScanner
  isOpen={true}
  onScan={(barcode) => console.log('Scanned:', barcode)}
  onLocationUpdate={(barcode, location) => console.log('Updated:', barcode, location)}
  onClose={() => setIsOpen(false)}
/>
```

### EnhancedBarcodeScanner
Advanced scanner with location lookup and history features.

```tsx
import { EnhancedBarcodeScanner } from '../../scanner';

<EnhancedBarcodeScanner
  isOpen={true}
  autoLookupLocation={true}
  showHistory={true}
  onScan={handleScan}
  onLocationUpdate={handleLocationUpdate}
  onClose={handleClose}
/>
```

### ScannerIntegration
High-level integration component with pre-configured options.

```tsx
import { ScannerIntegration } from '../../scanner';

<ScannerIntegration
  buttonText="Scan Item"
  buttonIcon="📦"
  autoLookupLocation={true}
  showHistory={true}
  onScanComplete={handleScanComplete}
  onLocationUpdated={handleLocationUpdate}
/>
```

## 🎯 Pre-configured Components

### InventoryScannerIntegration
```tsx
import { InventoryScannerIntegration } from '../../scanner';

<InventoryScannerIntegration
  onScanComplete={(barcode) => handleInventoryScan(barcode)}
  onLocationUpdated={(barcode, location) => updateInventoryLocation(barcode, location)}
/>
```

### LocationScannerIntegration
```tsx
import { LocationScannerIntegration } from '../../scanner';

<LocationScannerIntegration
  onScanComplete={(barcode) => handleLocationScan(barcode)}
/>
```

### AssetScannerIntegration
```tsx
import { AssetScannerIntegration } from '../../scanner';

<AssetScannerIntegration
  onScanComplete={(barcode) => handleAssetScan(barcode)}
  onLocationUpdated={(barcode, location) => updateAssetLocation(barcode, location)}
/>
```

### ShippingScannerIntegration
```tsx
import { ShippingScannerIntegration } from '../../scanner';

<ShippingScannerIntegration
  onScanComplete={(barcode) => handleShippingScan(barcode)}
  onLocationUpdated={(barcode, location) => updatePackageLocation(barcode, location)}
/>
```

## 🔧 Programmatic API

### useBarcodeScanner Hook
```tsx
import { useBarcodeScanner } from '../../scanner';

const MyComponent = () => {
  const {
    isOpen,
    lastResult,
    openScanner,
    closeScanner,
    ScannerComponent
  } = useBarcodeScanner();

  return (
    <div>
      <button onClick={openScanner}>Open Scanner</button>
      <ScannerComponent />
      {lastResult() && <p>Last scan: {lastResult()}</p>}
    </div>
  );
};
```

## 🛠️ Services

### ScannerService
Handles API calls for location management:

```tsx
import { scannerService } from '../../scanner';

// Update location
const result = await scannerService.updateScannedLocation({
  barcode: 'ABC123',
  newLocation: 'Warehouse A - Shelf B2',
  timestamp: Date.now()
});

// Get location history
const history = await scannerService.getLocationHistory('ABC123');

// Get current location
const location = await scannerService.getCurrentLocation('ABC123');
```

## 🎨 Usage Examples

### Basic Integration
```tsx
import { Component, createSignal } from 'solid-js';
import { ScannerIntegration } from '../../scanner';

const MyComponent: Component = () => {
  const [lastScan, setLastScan] = createSignal('');

  return (
    <div>
      <ScannerIntegration
        buttonText="Scan Barcode"
        onScanComplete={(barcode) => setLastScan(barcode)}
        onLocationUpdated={(barcode, location) => {
          console.log(`Updated ${barcode} to ${location}`);
        }}
      />
      
      {lastScan() && (
        <p>Last scanned: {lastScan()}</p>
      )}
    </div>
  );
};
```

### Advanced Integration
```tsx
import { Component, createSignal } from 'solid-js';
import { EnhancedBarcodeScanner } from '../../scanner';

const AdvancedScannerExample: Component = () => {
  const [isOpen, setIsOpen] = createSignal(false);
  const [scanResults, setScanResults] = createSignal([]);

  const handleScan = (barcode: string) => {
    setScanResults(prev => [...prev, {
      barcode,
      timestamp: Date.now()
    }]);
  };

  return (
    <div>
      <button onClick={() => setIsOpen(true)}>
        Open Advanced Scanner
      </button>
      
      <EnhancedBarcodeScanner
        isOpen={isOpen()}
        onClose={() => setIsOpen(false)}
        onScan={handleScan}
        autoLookupLocation={true}
        showHistory={true}
      />
    </div>
  );
};
```

## 🔧 Configuration Options

### Component Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | `boolean` | `false` | Controls scanner visibility |
| `onScan` | `(barcode: string) => void` | - | Callback when barcode is scanned |
| `onLocationUpdate` | `(barcode: string, location: string) => void` | - | Callback when location is updated |
| `onError` | `(error: string) => void` | - | Callback for error handling |
| `autoLookupLocation` | `boolean` | `true` | Auto-lookup current location |
| `showHistory` | `boolean` | `true` | Show scan history |
| `buttonText` | `string` | `"Scan Barcode"` | Button text |
| `buttonIcon` | `string` | `"📷"` | Button icon |

### Scanner Features

- **Multi-format support**: QR codes, Code 128, Code 39, UPC-A, UPC-E, EAN-13, EAN-8
- **Camera selection**: Automatic back camera detection, manual selection
- **Real-time preview**: Live camera feed with scan overlay
- **Error handling**: Permission errors, camera errors, scanning errors
- **Mobile optimization**: Touch-friendly interface, responsive design
- **History tracking**: Location change history with timestamps

## 📱 Mobile Support

The scanner is optimized for mobile devices with:
- Responsive design that works on all screen sizes
- Touch-friendly interface elements
- Automatic back camera selection (when available)
- Mobile-specific camera constraints for better performance

## 🛡️ Error Handling

The scanner handles various error scenarios:
- **Camera permission denied**: Clear user guidance
- **No camera available**: Fallback UI and error messages
- **Scanning failures**: Retry mechanisms and error reporting
- **API errors**: Network error handling and user feedback

## 🔒 Security & Privacy

- **Camera permissions**: Explicit permission requests
- **No data storage**: Camera stream is not stored or transmitted
- **Local processing**: Barcode detection happens on-device
- **API security**: Secure communication with backend services

## 📊 API Integration

The scanner service integrates with your backend API for:
- Location updates (`POST /scanned-locations/update`)
- History retrieval (`GET /scanned-locations/history/{barcode}`)
- Current location lookup (`GET /scanned-locations/current/{barcode}`)
- Bulk operations (`POST /scanned-locations/bulk-update`)

## 🚀 Quick Start

1. **Install dependencies**:
   ```bash
   npm install @zxing/library @zxing/browser
   ```

2. **Import and use**:
   ```tsx
   import { ScannerIntegration } from '../modules/scanner';
   
   <ScannerIntegration
     onScanComplete={(barcode) => console.log('Scanned:', barcode)}
   />
   ```

3. **Test the scanner**:
   Visit the demo page to test all features and configurations.

## 🧪 Demo

A comprehensive demo is available at `/scanner/demo` showing all features and integration examples.

## 📋 Requirements

- Modern web browser with camera support
- HTTPS connection (required for camera access)
- User permission for camera access
- Good lighting conditions for optimal scanning

## 🔮 Future Enhancements

- Batch scanning mode
- Custom scan overlay designs
- Audio feedback for scans
- OCR text recognition
- Export scan data functionality
- Integration with more backend systems