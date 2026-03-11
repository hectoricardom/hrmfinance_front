# HBL Scan Location Tracking Feature

## Overview
This feature adds comprehensive location scan tracking to the HBL (House Bill of Lading) system, allowing you to track the progress of packages as they move through different locations.

## Features

### 1. **Complete Location History**
- Track every scan location with timestamp
- Store who scanned the HBL at each location
- Add optional notes for each scan
- Automatic chronological ordering

### 2. **Visual Progress Display**
- **HBLScanProgress Component**: Full timeline view showing all scans
- **HBLScanIndicator Component**: Compact badge for list views
- Current location highlighted
- Relative timestamps (e.g., "2h ago", "Yesterday")

### 3. **Seamless Integration**
- Works with existing HBL scanner infrastructure
- Automatic data capture during status updates
- No breaking changes to existing code

## Components

### HBLScanProgress
Full-featured timeline component showing complete scan history.

**Props:**
- `scannedLocations?: HBLLocationScan[]` - Array of scan locations
- `currentStatus?: string` - Current HBL status ID
- `compact?: boolean` - Whether to use compact view (default: false)

**Usage:**
```tsx
import HBLScanProgress from './components/HBLScanProgress';

<HBLScanProgress
  scannedLocations={hbl.scannedLocations}
  currentStatus={hbl.idguidestate}
/>
```

### HBLScanIndicator
Compact indicator for use in list views.

**Props:**
- `scannedLocations?: HBLLocationScan[]` - Array of scan locations
- `showCount?: boolean` - Show scan count badge (default: true)
- `size?: 'small' | 'medium'` - Size variant (default: 'small')

**Usage:**
```tsx
import HBLScanIndicator from './components/HBLScanIndicator';

<HBLScanIndicator
  scannedLocations={hbl.scannedLocations}
  size="small"
/>
```

## Data Structure

### HBLLocationScan Interface
```typescript
export interface HBLLocationScan {
  locationId: string;        // Status ID (e.g., "YABA_13")
  locationLabel: string;     // Human-readable label
  scannedAt: Date;           // Timestamp of scan
  scannedBy?: string;        // User who scanned
  notes?: string;            // Optional notes
}
```

### Updated HBL Interface
```typescript
export interface HBL {
  // ... existing fields
  scannedLocations?: HBLLocationScan[];  // NEW FIELD
}
```

## Integration Points

### 1. HBL Type Definitions
**File:** `src/modules/hbl/types/index.ts`
- Added `HBLLocationScan` interface
- Added `scannedLocations` field to `HBL` interface

### 2. Status Update Service
**File:** `src/modules/hbl/status/hblUpdateService.ts`
- Updated `updateHBLStatus` function to accept `scannedBy` parameter
- Automatically creates location scan record on each status update
- Sends scan data to backend via `inventoryApi.updateHBLStatus`

### 3. HBL Detail View
**File:** `src/modules/hbl/details/HBLDetailView.tsx`
- Added `HBLScanProgress` component to show full scan history
- Displays scan timeline in HBL detail modal

### 4. Components
- `src/modules/hbl/components/HBLScanProgress.tsx` - Timeline view
- `src/modules/hbl/components/HBLScanIndicator.tsx` - Compact indicator

### 5. Demo Page
**File:** `src/modules/hbl/pages/HBLScanLocationDemo.tsx`
- Complete demonstration of all features
- Usage examples and code samples
- Visual showcase of components

## Usage Flow

### Scanning an HBL at a Location

1. **Using HBLLocationScanner:**
   The scanner automatically captures location data when you scan an HBL:
   ```tsx
   import HBLLocationScanner from './scanning/HBLLocationScanner';

   <HBLLocationScanner />
   ```

2. **Manual Status Update:**
   ```typescript
   import { updateHBLStatus } from './status/hblUpdateService';

   await updateHBLStatus(
     '230123456',           // HBL number
     'YABA_13',             // Location/Status ID
     'Package received',    // Optional notes
     'John Doe'             // Optional: who scanned it
   );
   ```

### Displaying Scan Progress

1. **In Detail View:**
   ```tsx
   <HBLScanProgress
     scannedLocations={hbl.scannedLocations}
     currentStatus={hbl.idguidestate}
   />
   ```

2. **In List View:**
   ```tsx
   <HBLScanIndicator
     scannedLocations={hbl.scannedLocations}
     size="small"
   />
   ```

## Backend Integration

The `updateHBLStatus` function sends the following data structure:
```typescript
{
  idguidestate: "YABA_13",
  locationScan: {
    locationId: "YABA_13",
    locationLabel: "YABA ALMACEN",
    scannedAt: "2025-01-13T15:30:00Z",
    scannedBy: "John Doe",
    notes: "Package received"
  },
  notes: "Package received"
}
```

**Backend Requirements:**
- Store `scannedLocations` array in HBL record
- Append new scans to existing array (don't overwrite)
- Return updated HBL with complete scan history

## Available Locations

All location statuses from `statusAllList`:
- YABA_09: "Recogida en Tienda"
- YABA_11: "En transito hacia YABA WH"
- YABA_13: "YABA ALMACEN"
- YABA_14: "En transito hacia FL"
- YABA_22: "Entrega a la aerolinea"
- AERO_28: "LLegando a AeroVaradero"
- AERO_33: "Recogida en AeroVaradero"
- YABA_46: "Transporte HAV"
- YABA_50: "Almacen HAV"
- YABA_70: "Escaneando por Locaciones"
- YABA_78: "En reparto"
- YABA_99: "Entregado"

## Visual Design

### Timeline View (HBLScanProgress)
- Vertical timeline with connecting line
- Dots indicating each scan point
- Green highlight for current location
- Timestamps in relative format
- User attribution when available
- Notes displayed in styled boxes

### Indicator (HBLScanIndicator)
- Compact badge design
- Color-coded: Green (with scans) / Gray (no scans)
- Scan count badge
- Relative timestamp
- Hover tooltip with full details

## Benefits

1. **Full Visibility**: See complete journey of each package
2. **Accountability**: Track who scanned at each location
3. **Context**: Add notes for special handling or issues
4. **Progress Tracking**: Visual timeline makes progress clear
5. **List Integration**: Quick scan status in list views
6. **Historical Record**: Complete audit trail of location changes

## Demo

To see the feature in action:
1. Import the demo page:
   ```typescript
   import HBLScanLocationDemo from './modules/hbl/pages/HBLScanLocationDemo';
   ```
2. Add to your router
3. Navigate to the demo page

The demo shows:
- Full scan progress timeline
- Compact views
- Different indicator sizes
- Usage examples
- Code samples

## Migration Notes

### For Existing HBLs
- Old HBL records without `scannedLocations` will display "No location scans recorded"
- New scans will start building the history
- No data migration required

### Backward Compatibility
- All new fields are optional
- Existing code continues to work
- Components gracefully handle missing scan data

## Future Enhancements

Potential additions:
- Map view showing geographic progress
- Estimated delivery based on scan history
- Automatic notifications on key location scans
- Analytics dashboard for location performance
- Bulk scan import from CSV
- Mobile app integration
- QR code generation for locations
- Photo attachment to scans
- Geolocation validation

## Troubleshooting

### Scans Not Appearing
1. Check that `scannedLocations` is being saved to backend
2. Verify API endpoint returns full scan history
3. Ensure date fields are properly serialized

### Timeline Not Rendering
1. Confirm `scannedLocations` is an array
2. Check date format (should be valid Date objects or ISO strings)
3. Verify imports of components

### Indicator Shows "No Scans"
1. Confirm `scannedLocations` prop is passed
2. Check array is not empty
3. Verify data structure matches `HBLLocationScan` interface

## Support

For issues or questions:
- Check this documentation
- Review demo page code
- Inspect component props and types
- Check browser console for errors
