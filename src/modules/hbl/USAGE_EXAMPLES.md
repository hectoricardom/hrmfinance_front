# HBL Module Usage Examples

## Import by Use Case

### 1. List Management Use Case
```typescript
import { 
  HBLListView, 
  HBLListFilter, 
  printHBLList, 
  exportHBLListToCSV 
} from '@/modules/hbl/list';

// Use in your component
const MyHBLListPage = () => {
  const [hbls, setHbls] = createSignal<HBL[]>([]);
  
  const handlePrint = () => {
    printHBLList(hbls(), 'My HBL Report');
  };
  
  const handleExport = () => {
    exportHBLListToCSV(hbls(), 'hbl_export.csv');
  };
  
  return (
    <div>
      <HBLListFilter hbls={hbls()} onFilterChange={setFilteredHbls} />
      <button onClick={handlePrint}>Print</button>
      <button onClick={handleExport}>Export CSV</button>
    </div>
  );
};
```

### 2. Scanning Use Case
```typescript
import { 
  HBLQuickScanner,
  HBLContinuousScanner,
  HBLMobileScanner 
} from '@/modules/hbl/scanning';

// Quick single scan
const QuickScan = () => {
  const handleScan = (result: HBLScanResult) => {
    console.log('Scanned:', result.hbl);
  };
  
  return <HBLQuickScanner onScan={handleScan} />;
};

// Continuous scanning for multiple HBLs
const BulkScan = () => {
  return <HBLContinuousScanner onBatchComplete={processBatch} />;
};
```

### 3. Status Management Use Case
```typescript
import { 
  HBLBulkStatusUpdate,
  HBLBulkStatusUpdateWithScanner,
  updateHBLStatus 
} from '@/modules/hbl/status';

// Manual bulk update
const StatusUpdate = () => {
  return <HBLBulkStatusUpdate hbls={selectedHBLs()} />;
};

// Scanner-based status update
const ScanAndUpdate = () => {
  return <HBLBulkStatusUpdateWithScanner defaultStatus="DELIVERED" />;
};

// Programmatic update
const updateStatus = async (hbl: string) => {
  await updateHBLStatus(hbl, 'DELIVERED');
};
```

### 4. Label Printing Use Case
```typescript
import { HBLLabel4x6 } from '@/modules/hbl/labels';

const PrintLabel = ({ hbl }: { hbl: HBL }) => {
  return (
    <HBLLabel4x6 
      hbl={hbl} 
      onPrint={() => console.log('Label printed')} 
    />
  );
};
```

### 5. Detail View Use Case
```typescript
import { HBLDetailView } from '@/modules/hbl/details';

const ViewDetails = () => {
  const [selectedHBL, setSelectedHBL] = createSignal<HBL | null>(null);
  
  return (
    <HBLDetailView
      hbl={selectedHBL()}
      isOpen={selectedHBL() !== null}
      onClose={() => setSelectedHBL(null)}
    />
  );
};
```

### 6. Data Management Use Case
```typescript
import { 
  hblStore,
  parseHBLData,
  validateHBL 
} from '@/modules/hbl/data';

// Access store
const { hbls, addHBL, updateHBL, deleteHBL } = hblStore;

// Parse data
const parsedData = parseHBLData(rawString);

// Validate
if (validateHBL(hblData)) {
  addHBL(hblData);
}
```

## Complete Page Example
```typescript
import { Component, createSignal } from 'solid-js';
import { HBLListFilter, printHBLList } from '@/modules/hbl/list';
import { HBLBulkStatusUpdateWithScanner } from '@/modules/hbl/status';
import { HBLDetailView } from '@/modules/hbl/details';
import { HBL } from '@/modules/hbl/types';

const HBLManagementPage: Component = () => {
  const [hbls, setHbls] = createSignal<HBL[]>([]);
  const [selectedHBL, setSelectedHBL] = createSignal<HBL | null>(null);
  const [filteredHBLs, setFilteredHBLs] = createSignal<HBL[]>([]);
  
  return (
    <div>
      <h1>HBL Management</h1>
      
      {/* List and Filter */}
      <HBLListFilter 
        hbls={hbls()} 
        onFilterChange={setFilteredHBLs}
        onHBLSelect={setSelectedHBL}
      />
      
      {/* Bulk Operations */}
      <HBLBulkStatusUpdateWithScanner />
      
      {/* Print */}
      <button onClick={() => printHBLList(filteredHBLs())}>
        Print List
      </button>
      
      {/* Detail View */}
      <HBLDetailView
        hbl={selectedHBL()}
        isOpen={!!selectedHBL()}
        onClose={() => setSelectedHBL(null)}
      />
    </div>
  );
};

export default HBLManagementPage;
```

## Type Imports
```typescript
// Import specific types
import { HBL, HBLStatus, HBLFilter } from '@/modules/hbl/types';

// Or import all types
import type * as HBLTypes from '@/modules/hbl/types';
```