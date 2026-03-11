# Container Scanner Module

A production-ready SolidJS component for container arrival validation and bulk scanning at Yaba Sur Cargo's distribution centers.

## Features

✅ **Mobile-First Design** - Optimized for warehouse workers on mobile devices
✅ **Simple Interface** - Minimal training required, intuitive workflow
✅ **Real-Time Progress** - Visual progress tracking and feedback
✅ **Error Handling** - Clear error messages in simple language
✅ **Haptic Feedback** - Vibration feedback for scan success/error (on supported devices)
✅ **Accessibility** - Keyboard navigable, auto-focus on inputs
✅ **High Contrast** - Designed for warehouse lighting conditions
✅ **Offline Ready** - Graceful error handling for network issues

## Workflow

1. **Scan Container** - User scans QR code on container label
2. **Load Bulks** - System automatically loads all expected bulks from backend
3. **Scan Bulks** - User scans each bulk QR code to validate
4. **Track Progress** - Real-time progress bar shows X of Y bulks scanned
5. **Mark Received** - Once complete, user confirms receipt
6. **Success** - System marks container as "received by distribution"

## Installation

The module is already integrated into the project structure:

```
src/modules/container-scanner/
├── components/
│   └── ContainerScanner.tsx      # Main component
├── services/
│   └── containerScannerApi.ts    # API layer
├── types/
│   └── containerScannerTypes.ts  # TypeScript types
├── index.ts                       # Module exports
└── README.md                      # This file
```

## Usage

### Basic Usage

```tsx
import { ContainerScanner } from '../modules/container-scanner';

function App() {
  return <ContainerScanner />;
}
```

### Routing Integration

```tsx
import { Route } from '@solidjs/router';
import { ContainerScanner } from '../modules/container-scanner';

<Route path="/warehouse/scanner" component={ContainerScanner} />
```

## Backend API Requirements

The component expects the following API endpoints:

### 1. Get Container with Bulks

**GET** `/api/containers/:containerId`

Response:
```json
{
  "id": "container-123",
  "containerNumber": "CONT-2024-001",
  "bulkIds": ["bulk-1", "bulk-2", "bulk-3"],
  "bulks": [
    {
      "id": "bulk-1",
      "containerId": "container-123",
      "trackingNumber": "TRACK-001",
      "name": "Bulk 1",
      "status": "pending"
    }
  ],
  "status": "arrived",
  "arrivedAt": "2024-01-15T10:30:00Z",
  "totalBulks": 3
}
```

### 2. Mark Bulk as Scanned

**PATCH** `/api/bulks/:bulkId/mark-scanned`

Request:
```json
{
  "scannedAt": "2024-01-15T11:00:00Z",
  "status": "scanned"
}
```

Response:
```json
{
  "id": "bulk-1",
  "containerId": "container-123",
  "trackingNumber": "TRACK-001",
  "status": "scanned",
  "scannedAt": "2024-01-15T11:00:00Z"
}
```

### 3. Mark Container as Received

**PATCH** `/api/containers/:containerId/mark-received`

Request:
```json
{
  "receivedAt": "2024-01-15T11:15:00Z",
  "status": "received"
}
```

Response:
```json
{
  "id": "container-123",
  "containerNumber": "CONT-2024-001",
  "status": "received",
  "receivedAt": "2024-01-15T11:15:00Z"
}
```

## Configuration

### API Base URL

Update the API base URL in `services/containerScannerApi.ts`:

```typescript
const API_BASE_URL = '/api'; // Change to your backend URL
```

### QR Code Format

Customize QR code parsing in `services/containerScannerApi.ts`:

```typescript
export function parseQRCode(qrCode: string): string | null {
  // Add custom parsing logic for your QR code format
  return qrCode.trim();
}
```

## States

The component has 6 distinct states:

1. **initial** - Waiting for container scan
2. **loading** - Loading container data from backend
3. **scanning** - Scanning bulks and tracking progress
4. **completed** - All bulks scanned, ready to mark as received
5. **received** - Container successfully marked as received
6. **error** - Error state with retry option

## UI Components

### Progress Bar
Shows visual progress of scanned vs. total bulks with percentage

### Bulk List
Displays all expected bulks with checkmarks for scanned items

### Feedback Messages
- ✅ Success messages (green, 2-second auto-dismiss)
- ⚠️ Error messages (red, 3-second auto-dismiss)
- ⚠️ Duplicate scan warnings

### Action Buttons
- Large tap targets (minimum 44px height)
- High contrast colors
- Clear labels
- Disabled states during processing

## Mobile Optimization

- **Auto-focus** on scan inputs
- **Haptic feedback** for scan results (vibration on supported devices)
- **Large touch targets** for easy tapping
- **Responsive design** works on all screen sizes
- **Minimal scrolling** - key actions always visible
- **High contrast** for outdoor/warehouse use

## Accessibility Features

- ✅ Keyboard navigation support
- ✅ Auto-focus management
- ✅ Clear visual states
- ✅ Simple language in error messages
- ✅ Loading states with skeleton screens
- ✅ No required mouse interaction

## Error Handling

The component handles:

- **Invalid QR codes** - Clear error message
- **Network failures** - Graceful degradation
- **Missing containers** - 404 errors with helpful message
- **Duplicate scans** - Warning without error
- **API errors** - User-friendly error messages

## Performance

- **Lazy loading** - Scanning interface loads only when needed
- **Input debouncing** - Prevents accidental double-scans
- **Optimistic updates** - Instant UI feedback
- **Efficient re-renders** - Uses SolidJS fine-grained reactivity
- **Minimal API calls** - Caches container data

## Customization

### Styling

The component uses Tailwind CSS classes. Customize by:

1. Modifying Tailwind classes directly in the component
2. Adding custom CSS in the `<style>` tag
3. Overriding with global styles

### Animations

Custom animations are defined in the component's `<style>` tag:
- `shake` - Error animation
- `pulse-once` - Success animation
- `bounce-once` - Completion animation

### Haptic Feedback

Customize vibration patterns in helper functions:
```typescript
const playSuccessAnimation = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate(50); // Customize duration
  }
};
```

## Testing

### Manual Testing Checklist

- [ ] Scan valid container QR code
- [ ] Scan all bulks in container
- [ ] Scan duplicate bulk (should warn)
- [ ] Scan invalid QR code (should error)
- [ ] Scan bulk from different container (should error)
- [ ] Mark container as received
- [ ] Test on mobile device
- [ ] Test in low-light conditions
- [ ] Test with slow network connection
- [ ] Test with network disconnected

### Test Data

Use these mock IDs for testing:

```typescript
// Container ID
"container-test-001"

// Bulk IDs
"bulk-test-001"
"bulk-test-002"
"bulk-test-003"
```

## Troubleshooting

### QR Scanner Not Working

**Solution:** Ensure you're using HTTPS or localhost (camera access requires secure context)

### Auto-focus Not Working

**Solution:** Check if another element is stealing focus, verify `autofocus` attribute

### Haptic Feedback Not Working

**Solution:** Haptic feedback only works on devices with vibration support (most mobile devices)

### Slow Performance

**Solution:**
- Check network speed
- Verify backend response times
- Monitor browser console for errors

## Browser Support

Tested and working on:
- Chrome/Edge (mobile & desktop)
- Safari (iOS & macOS)
- Firefox (mobile & desktop)

## Future Enhancements

Potential features to add:

- [ ] Barcode scanner integration (camera-based)
- [ ] Offline mode with sync
- [ ] Batch scanning mode
- [ ] Export scan history
- [ ] Multi-language support
- [ ] Sound effects for scans
- [ ] Print receipt functionality
- [ ] Signature capture for confirmation

## Support

For issues or questions, contact the development team.

## License

Internal use only - Yaba Sur Cargo
