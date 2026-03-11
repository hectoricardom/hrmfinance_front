# 📦 HBL Scanner Implementation

A comprehensive barcode scanning solution for House Bill of Lading (HBL) management with real-time camera functionality and location status updates.

## 🚀 Overview

This implementation enhances the existing HBL system with barcode scanning capabilities, allowing warehouse staff and operations teams to efficiently update HBL statuses by scanning barcodes instead of manual data entry.

## 📋 Components

### 1. HBLLocationScanner
**Purpose**: Single HBL scanning with location selection
**Use Case**: Warehouse operations, item tracking between locations

```tsx
import { HBLLocationScanner } from '../modules/hbl';

<HBLLocationScanner
  onHBLUpdated={(hbl, statusId, statusLabel) => {
    console.log(`Updated ${hbl} to ${statusLabel}`);
  }}
  onError={(error) => console.error(error)}
/>
```

**Features**:
- Visual location/status selection grid
- Real-time barcode scanning with camera
- Automatic HBL validation (230XXXXXX format)
- Instant status updates with API integration
- Scan history and statistics
- Success/error notifications

### 2. HBLBulkStatusUpdateWithScanner
**Purpose**: Bulk HBL updates with multiple input methods
**Use Case**: Processing large batches, flexible data entry

```tsx
import { HBLBulkStatusUpdateWithScanner } from '../modules/hbl';

<HBLBulkStatusUpdateWithScanner
  onSuccess={(response) => {
    console.log(`Updated ${response.totalSuccess} HBLs successfully`);
  }}
/>
```

**Features**:
- Three input modes: Text only, Scanner only, Both
- Parse HBL numbers from pasted text
- Scan multiple barcodes sequentially
- Combine text and scanned HBLs
- Batch processing with detailed results
- Duplicate detection across methods

### 3. HBLQuickScanner
**Purpose**: Lightweight scanning for quick integrations
**Use Case**: Adding scanner to existing components

```tsx
import { HBLQuickScanner } from '../modules/hbl/components';

<HBLQuickScanner
  defaultStatusId="YABA_13"
  onHBLScanned={(hbl, success, statusLabel) => {
    if (success) {
      console.log(`Quick scan: ${hbl} → ${statusLabel}`);
    }
  }}
/>
```

**Features**:
- Compact interface
- Pre-configurable status
- Single-scan operation
- Immediate feedback

## 🔧 Integration Examples

### Adding Scanner to HBLList Page

The HBLList page has been updated to use the scanner-enabled bulk update component:

```tsx
// In HBLList.tsx
import { HBLBulkStatusUpdateWithScanner } from '../';

// Replace the old component
<HBLBulkStatusUpdateWithScanner />
```

### Adding Quick Scanner to Table Rows

```tsx
// Example: Add quick scanner to each HBL row
<HBLQuickScanner
  defaultStatusId="YABA_70" // Scanning by Locations
  buttonStyle={{ padding: '0.25rem 0.5rem', 'font-size': '0.75rem' }}
  onHBLScanned={(hbl, success) => {
    if (success) {
      // Refresh the HBL list or update UI
      refreshHBLData();
    }
  }}
/>
```

### Custom Integration

```tsx
import { EnhancedBarcodeScanner } from '../../scanner';
import { updateHBLStatus, isValidHBL } from '../services/hblUpdateService';

const CustomHBLScanner = () => {
  const [isOpen, setIsOpen] = createSignal(false);

  const handleScan = async (barcode: string) => {
    if (isValidHBL(barcode)) {
      const result = await updateHBLStatus(barcode, 'YABA_13');
      console.log('Update result:', result);
    }
    setIsOpen(false);
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Scan HBL</button>
      <EnhancedBarcodeScanner
        isOpen={isOpen()}
        onClose={() => setIsOpen(false)}
        onScan={handleScan}
        autoLookupLocation={false}
        showHistory={false}
      />
    </>
  );
};
```

## 📊 Status Management

The scanner integrates with the existing HBL status workflow:

### Available Statuses
```typescript
export const statusAllList = [
  { id: "YABA_09", label: "Recogida en Tienda", icon: "market" },
  { id: "YABA_11", label: "En transito hacia YABA WH", icon: "truck-fast-outline" },
  { id: "YABA_13", label: "YABA ALMACEN", icon: "store" },
  { id: "YABA_14", label: "En transito hacia FL", icon: "truck-fast-outline" },
  { id: "YABA_22", label: "Entrega a la aerolinea", icon: "airplane-takeoff" },
  { id: "AERO_28", label: "LLegando a AeroVaradero", icon: "airplane-landing" },
  { id: "AERO_33", label: "Recogida en AeroVaradero", icon: "dolly" },
  { id: "YABA_46", label: "Transporte HAV", icon: "car-hatchback", tag: "HAV" },
  { id: "YABA_40", label: "Transporte CAV", icon: "car-hatchback", tag: "CAV" },
  { id: "YABA_50", label: "Almacen HAV", icon: "store", tag: "HAV" },
  { id: "YABA_52", label: "Almacen CAV", icon: "store", tag: "CAV" },
  { id: "YABA_70", label: "Escaneando por Locaciones", icon: "sort-numeric-ascending" },
  { id: "YABA_78", label: "En reparto", icon: "moped" },
  { id: "YABA_99", label: "Entregado", icon: "success" }
];
```

### Status Update API
```typescript
// Update single HBL status
const result = await updateHBLStatus(
  "230144600", // HBL number
  "YABA_13",   // New status ID
  "Updated via scanner" // Optional notes
);

// Bulk update
const result = await updateHBLStatusBulk({
  hbls: ["230144600", "230144601"],
  statusId: "YABA_13",
  notes: "Bulk scanner update"
});
```

## 🎯 Workflow Examples

### Warehouse Receiving Workflow

1. **Items Arrive at Warehouse**
   ```tsx
   <HBLLocationScanner
     // Pre-select warehouse status
     defaultLocation="YABA_13" // YABA ALMACEN
     onHBLUpdated={(hbl, statusId, statusLabel) => {
       // Update inventory system
       updateInventoryLocation(hbl, statusLabel);
       // Send notification
       notifyReceived(hbl);
     }}
   />
   ```

2. **Batch Processing for Transport**
   ```tsx
   <HBLBulkStatusUpdateWithScanner
     // Scan multiple packages for transport
     onSuccess={(response) => {
       // Generate transport manifest
       generateManifest(response.results);
       // Print labels
       printTransportLabels(response.results);
     }}
   />
   ```

### Distribution Center Workflow

1. **Incoming Packages**
   - Use Location Scanner with "Recogida en AeroVaradero" status
   - Scan packages as they arrive from flights

2. **Sorting by Destination**
   - Use Bulk Scanner to group packages by region
   - Update to appropriate transport status (HAV, CAV, CMG, HLG)

3. **Final Delivery**
   - Use Quick Scanner with "En reparto" status
   - Scan packages as they leave for delivery

## 📱 Mobile Optimization

The scanner components are fully mobile-responsive:

- **Touch-friendly interface** with large buttons
- **Automatic back camera selection** on mobile devices
- **Responsive layout** adapting to screen size
- **Mobile-optimized barcode scanning** with proper camera constraints

### Mobile Usage Tips:
- Hold device steady while scanning
- Ensure adequate lighting
- Position barcode within the green scanning frame
- Use landscape orientation for better camera view

## 🛡️ Error Handling

### HBL Validation
- **Format Check**: Validates 230XXXXXX pattern
- **Duplicate Detection**: Prevents scanning same HBL multiple times
- **Status Validation**: Ensures valid status transitions

### Scanner Errors
- **Camera Permission**: Clear guidance for users
- **No Camera Available**: Fallback UI and instructions
- **Network Errors**: Retry mechanisms and offline queuing
- **API Failures**: Detailed error messages and recovery options

### Example Error Handling:
```tsx
<HBLLocationScanner
  onError={(error) => {
    console.error('HBL Scanner Error:', error);
    
    // Show user-friendly message
    if (error.includes('camera')) {
      showMessage('Camera access required for scanning');
    } else if (error.includes('network')) {
      showMessage('Network error - updates will be retried');
    } else {
      showMessage('Scanning error - please try again');
    }
  }}
/>
```

## 🔄 Data Flow

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Barcode       │    │   Scanner        │    │   HBL Update    │
│   Detection     │───▶│   Validation     │───▶│   API Call      │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Camera        │    │   HBL Format     │    │   Database      │
│   Processing    │    │   Check          │    │   Update        │
│                 │    │   (230XXXXXX)    │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   ZXing         │    │   Duplicate      │    │   UI Update     │
│   Library       │    │   Detection      │    │   & Feedback    │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 📈 Performance Considerations

### Scanner Performance
- **Lazy Loading**: Scanner components load camera libraries on demand
- **Memory Management**: Proper cleanup of camera streams
- **Battery Optimization**: Automatic scanner timeout and sleep modes

### API Optimization
- **Batch Processing**: Bulk updates reduce API calls
- **Request Queuing**: Sequential processing prevents server overload
- **Retry Logic**: Automatic retry with exponential backoff

### UI Performance
- **Virtual Scrolling**: For large HBL lists and scan history
- **Debounced Updates**: Prevents excessive re-renders
- **Progressive Loading**: Load scanner features as needed

## 🧪 Testing

### Demo Pages
- **HBLScannerDemo**: Comprehensive testing interface
- **ScannerDemo**: Generic scanner testing

### Test Scenarios
1. **Single HBL Scanning**: Test individual barcode recognition
2. **Bulk Processing**: Test multiple HBL scanning and text parsing
3. **Error Conditions**: Test invalid barcodes, network failures
4. **Mobile Testing**: Test on various devices and orientations
5. **Permission Testing**: Test camera permission handling

### Test HBL Numbers
Use these test HBL numbers for development:
```
230144600, 230144601, 230144602, 230144603, 230144604
```

## 🚀 Deployment Considerations

### Camera Requirements
- **HTTPS Required**: Camera access only works over HTTPS
- **Browser Compatibility**: Modern browsers with WebRTC support
- **Mobile Safari**: Special handling for iOS camera permissions

### Infrastructure
- **API Endpoints**: Ensure HBL update endpoints are available
- **Rate Limiting**: Configure appropriate limits for bulk operations
- **Logging**: Monitor scanner usage and performance metrics

### Configuration
```typescript
// Environment-specific settings
const SCANNER_CONFIG = {
  MAX_BULK_SIZE: 100,           // Maximum HBLs per bulk operation
  SCAN_TIMEOUT: 30000,          // Scanner auto-timeout (ms)
  RETRY_ATTEMPTS: 3,            // API retry attempts
  VALIDATION_STRICT: true       // Strict HBL format validation
};
```

This HBL scanner implementation provides a complete solution for modernizing warehouse operations with efficient barcode scanning and real-time status updates.