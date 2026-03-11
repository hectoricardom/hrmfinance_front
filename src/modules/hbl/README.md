# HBL Module Structure

The HBL (House Bill of Lading) module is organized into the following use cases:

## Use Case Modules

### 1. **List Management** (`/list`)
- View and search HBL records
- Filter by various criteria
- Print and export HBL lists
- Components:
  - `HBLListView.tsx` - Main list display
  - `HBLListFilter.tsx` - Search and filter functionality
  - `printHBLList.ts` - Print and export utilities

### 2. **Scanning Operations** (`/scanning`)
- Barcode scanning for HBL tracking
- Location scanning
- Bulk status updates via scanning
- Components:
  - `HBLQuickScanner.tsx` - Quick single scan
  - `HBLContinuousScanner.tsx` - Continuous scanning mode
  - `HBLFastContinuousScanner.tsx` - High-speed scanning
  - `HBLLocationScanner.tsx` - Location-based scanning
  - `HBLMobileScanner.tsx` - Mobile device scanning
  - `HBLMobileScannerSimple.tsx` - Simplified mobile scanning

### 3. **Status Management** (`/status`)
- Update HBL statuses
- Bulk status operations
- Status tracking
- Components:
  - `HBLBulkStatusUpdate.tsx` - Bulk status changes
  - `HBLBulkStatusUpdateWithScanner.tsx` - Scanner-based bulk updates
  - `hblUpdateService.ts` - Status update service

### 4. **Label Operations** (`/labels`)
- Generate shipping labels
- Print labels in various formats
- Components:
  - `HBLLabel4x6.tsx` - 4x6 inch label format

### 5. **Detail View** (`/details`)
- View detailed HBL information
- Edit HBL records
- Components:
  - `HBLDetailView.tsx` - Detailed HBL view modal

### 6. **Data Management** (`/data`)
- Core data operations
- State management
- API integration
- Files:
  - `hblStore.ts` - State management
  - `hblParser.ts` - Data parsing utilities

## Shared Types and Utilities
- Types are defined in `types/index.ts`
- Common utilities in `utils/`
- Services in `services/`

## Usage
Each use case module exports its components and can be imported individually:

```typescript
import { HBLListView, HBLListFilter } from '@/modules/hbl/list';
import { HBLQuickScanner } from '@/modules/hbl/scanning';
import { HBLBulkStatusUpdate } from '@/modules/hbl/status';
```