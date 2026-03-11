# HBL Bulk Fetch Component

## Overview
`HBLBulkFetch` is a component for parsing and fetching multiple HBL records from the SeaYabaHbls database table in bulk.

## Location
- **File**: `/src/modules/hbl/status/HBLBulkFetch.tsx`
- **Route**: `/#/hbl-bulk-fetch`
- **Permission Required**: `HBLAccessManagement`

## Features

### 1. **HBL Parsing**
- Supports both standard format (`230XXXXXX`) and extended format (`AAA12345678`)
- Automatically extracts HBL numbers from any text (emails, spreadsheets, etc.)
- Case-insensitive parsing for extended format
- Automatic deduplication
- Visual format badges (blue for standard, purple for extended)

### 2. **Copy to Clipboard**
- One-click copy of all parsed HBL numbers
- Newline-separated format for easy pasting
- Visual feedback with checkmark confirmation
- Auto-reset after 2 seconds

### 3. **Bulk Data Fetching**
- Fetches complete HBL data from SeaYabaHbls table
- Uses `hblStore.fetchHBLsByIds()` for efficient batch retrieval
- Loading states with spinner animation
- Error handling with user-friendly messages

### 4. **Summary Statistics**
- **Total HBLs**: Count of all fetched records
- **Total Bultos**: Sum of all packages across all HBLs
- **Peso Total (lb)**: **Total weight in pounds** of all HBLs combined
- Displayed in prominent summary cards with color coding
- Real-time calculation using reactive memos

### 5. **Results Display**
- Clean table layout with sortable columns
- Displays key HBL information:
  - HBL number (with formatted badge)
  - Guía (Air guide)
  - Status (with colored badge)
  - Shipper name
  - Consignee name
  - Number of packages
  - Weight in pounds
- Alternating row colors for readability
- Scrollable results area (max 400px height)

### 6. **CSV Export**
- Export all fetched data to CSV format
- Handles comma and quote escaping
- Automatic filename with current date
- Includes all data fields from fetched records

## Usage

### Basic Workflow

1. **Paste Text**
   - Copy any text containing HBL numbers
   - Paste into the text area
   - Can be from emails, spreadsheets, reports, etc.

2. **Extract HBLs**
   - Click "Extraer HBLs" button
   - Component automatically identifies and extracts all HBL numbers
   - Shows count and list of found HBLs with format badges

3. **Fetch Data**
   - Click "Buscar Datos de HBLs" button
   - System fetches complete data for all parsed HBLs
   - Shows loading spinner during fetch

4. **View Results**
   - Results displayed in organized table
   - Review all HBL details in one view

5. **Export (Optional)**
   - Click "Exportar CSV" to download data
   - Use for reporting, analysis, or record keeping

### Example Text Input

```
Por favor revisar los siguientes HBLs:
230123456
TRE20272709
230987654
tre20272708

También incluye: 230555555 y AAA11223344
```

## API Integration

### GraphQL Query
Uses `getSeaYabaHblsByMultipleIds` query through `inventoryApi.seahblsByMultIds()`:

```typescript
{
  query: "getSeaYabaHblsByMultipleIds",
  params: {
    ids: ["230123456", "TRE20272709", ...],
    guia: "all" // or specific guide
  }
}
```

### Calculations
The component performs automatic calculations on fetched data:

**Total Weight**:
```typescript
const totalWeight = createMemo(() => {
  return fetchedData().reduce((sum, item) => {
    const weight = parseFloat(item.weightpound || item.weight || '0');
    return sum + (isNaN(weight) ? 0 : weight);
  }, 0);
});
```

**Total Packages**:
```typescript
const totalPackages = createMemo(() => {
  return fetchedData().reduce((sum, item) => {
    const packages = parseInt(item.numberofbultos || item.bagnumber || '0');
    return sum + (isNaN(packages) ? 0 : packages);
  }, 0);
});
```

### Data Structure
Each HBL record includes:
- `hbl`: HBL number
- `guia` / `idairguide`: Air guide number
- `idguidestate` / `status`: Current status
- `nameshipper`: Shipper name
- `consigneeName` / `nameConsignee`: Consignee name
- `numberofbultos` / `bagnumber`: Package count
- `weightpound` / `weight`: Weight in pounds

## Component Props

```typescript
interface HBLBulkFetchProps {
  onClose?: () => void;  // Optional callback when closing
}
```

## Styling
- Uses inline CSS-in-JS following the app's pattern
- CSS variables for theming (`var(--primary-color)`, etc.)
- Responsive design
- Loading animations with keyframes

## Related Components
- `HBLBulkStatusUpdate`: For updating statuses in bulk
- `HBLParser`: Core parsing logic (`parseHBLNumbers`, `getHBLFormat`)
- `hblStore`: Data management and API calls

## Notes
- Requires `HBLAccessManagement` permission
- Works with both HBL formats simultaneously
- Handles errors gracefully with user feedback
- No authentication required for parsing, only for fetching
