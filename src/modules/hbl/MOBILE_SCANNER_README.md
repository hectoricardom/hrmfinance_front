# HBL Mobile Scanner

## Overview
The HBL Mobile Scanner is a mobile-first component designed to scan HBL (House Bill of Lading) barcodes directly in the main view without requiring a modal. It provides a full-screen scanning experience optimized for mobile devices.

## Features

### 📱 Mobile-First Design
- Full viewport height scanner view
- Large touch-friendly controls
- Responsive layout that works on all mobile devices
- No modal - loads directly in the main view

### 🎯 Core Functionality
- Real-time HBL barcode scanning
- Automatic HBL format validation
- Instant status updates upon successful scan
- Continuous scanning mode (no need to restart after each scan)
- Prevents duplicate processing of the same code

### 📊 User Interface
- **Header**: Shows scan statistics (success/error counts)
- **Scanner View**: Full-screen camera preview with overlay guide
- **Status Selection**: Dropdown to select HBL status before scanning
- **Recent Scans**: Shows last 5 scanned items with results
- **Visual Feedback**: Color-coded results (green for success, red for errors)

### ⚡ Performance Features
- Optimized for back camera on mobile devices
- 2-second cooldown to prevent duplicate scans
- Vibration feedback on successful scan (if supported)
- Smooth scanning animation

## Usage

### Basic Implementation
```tsx
import HBLMobileScanner from './components/HBLMobileScanner';

// In your component
<HBLMobileScanner 
  defaultStatusId="status-123"
  onScanComplete={(result) => {
    console.log('Scanned:', result);
  }}
/>
```

### Standalone Page
```tsx
// Access via route: /hbl-mobile-scanner
import HBLMobileScannerPage from './pages/HBLMobileScannerPage';
```

### Props
- `defaultStatusId` (optional): Pre-select a status
- `onScanComplete` (optional): Callback when scan completes

## Technical Details

### Camera Configuration
```javascript
video: { 
  facingMode: { ideal: 'environment' }, // Back camera
  width: { ideal: 1920 },
  height: { ideal: 1080 }
}
```

### Scan Result Structure
```typescript
interface ScanResult {
  hbl: string;          // Scanned HBL code
  status: string;       // Applied status label
  timestamp: string;    // When scanned
  success: boolean;     // Success/failure indicator
}
```

### Mobile Optimizations
1. **Touch-friendly controls**: Large buttons and dropdowns
2. **Viewport management**: Full screen without scrolling
3. **Performance**: Prevents multiple simultaneous scans
4. **Feedback**: Visual and haptic feedback

## Styling

The component uses inline styles optimized for mobile:
- Full viewport height layout
- Dark theme for scanner area
- High contrast overlays
- Smooth animations

## Security & Permissions

The scanner requires camera permissions. The component:
1. Checks for camera permission on mount
2. Shows permission request UI if denied
3. Handles permission errors gracefully

## Error Handling

The scanner handles various error scenarios:
- Invalid HBL format
- No status selected
- Camera permission denied
- API update failures
- Scanner initialization errors

## Browser Support

Requires browsers with:
- WebRTC support
- MediaDevices API
- Modern JavaScript (ES6+)

Tested on:
- iOS Safari 14+
- Chrome for Android 88+
- Samsung Internet 13+

## Performance Tips

1. **Lighting**: Ensure good lighting for better scanning
2. **Distance**: Hold device 6-12 inches from barcode
3. **Stability**: Keep device steady during scanning
4. **Focus**: Allow camera to auto-focus on barcode

## Troubleshooting

### Camera won't start
- Check browser camera permissions
- Ensure no other app is using camera
- Try refreshing the page

### Poor scan performance
- Improve lighting conditions
- Clean camera lens
- Ensure barcode is flat and undamaged

### Duplicate scans
- Built-in 2-second cooldown prevents this
- Wait for vibration/visual feedback before next scan