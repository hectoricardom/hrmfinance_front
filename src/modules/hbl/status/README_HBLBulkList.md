# HBLBulkList Component

## Overview
The `HBLBulkList` component provides a comprehensive interface for parsing, viewing, and bulk updating HBL (House Bill of Lading) records. It combines text parsing, data fetching, visual list display, and bulk status updates into a single workflow.

## Features

### 📝 Text Parsing
- Parse HBL numbers from text input (format: 230XXXXXX)
- Support for multiple HBL numbers in various text formats
- Guide number filtering for targeted searches

### 📋 Data Display
- **Grid Layout**: Organized table view with key HBL information
- **Columns**: Checkbox, HBL#, Consignee, Address, Weight, Status, Date
- **Interactive Rows**: Click to select/deselect individual HBLs
- **Status Color Coding**: Visual status indicators with different colors
- **Responsive Design**: Scrollable table with fixed headers
- **Air Guide Display**: Shows the air guide number for the loaded HBLs

### ✅ Selection Management
- **Individual Selection**: Click rows or checkboxes to select HBLs
- **Bulk Selection**: "Select All" / "Deselect All" functionality
- **Selection Counter**: Real-time count of selected items
- **Visual Feedback**: Highlighted rows for selected HBLs

### 🖨️ Print & Export Operations
- **Print Selected**: Print only selected HBLs with air guide as title
- **Print All**: Print complete list with air guide information
- **Export Selected**: Export selected HBLs to CSV with air guide filename
- **Export All**: Export complete list to CSV
- **Air Guide Titles**: All documents use air guide number in titles/filenames
- **Smart Filenames**: CSV files include air guide and date in filename

### 🔄 Bulk Operations
- **Status Updates**: Update multiple HBL statuses simultaneously
- **Notes Support**: Add optional notes to status changes
- **Real-time Refresh**: Automatic data refresh after updates
- **Progress Tracking**: Loading states and update results

## Data Structure
The component works with HBL objects containing:
```typescript
{
  hbl: string,              // HBL number
  consigneeName: string,    // Recipient name
  cidentity: string,        // Consignee ID
  address: {                // Address components
    streetName: string,
    streetNo: string,
    city: string,
    estate: string,
    betwen: string
  },
  weight: string,           // Package weight
  idguidestate: string,     // Current status
  datereserve: string,      // Date
  // ... other fields
}
```

## Workflow

### 1. Input & Parse
1. Select guide number filter
2. Enter text containing HBL numbers
3. Click "Parse HBLs" to extract and fetch data

### 2. Review & Select
1. View loaded HBL data in the table
2. Select individual HBLs or use "Select All"
3. Review HBL details (consignee, address, current status)

### 3. Update Status
1. Choose new status from dropdown
2. Add optional notes
3. Click "Update Statuses" for selected HBLs
4. View update results and success/failure counts

## Status Colors
- **PENDIENTE**: Yellow (#ffc107)
- **EN BODEGA**: Green (#28a745)
- **ENVIADA**: Blue (#17a2b8)
- **ENTREGADO**: Dark Blue (#007bff)
- **DEVUELTO**: Red (#dc3545)

## UI Components Used
- **Card**: Container wrapper
- **Button**: Actions and selections
- **Form inputs**: Text areas and selects
- **Grid layout**: Responsive table display
- **Loading states**: Progress indicators

## Integration
The component integrates with:
- `inventoryApi.hblsByMultIds()` - Fetch HBL data by IDs
- `parseAndUpdateHBLs()` - Bulk status update service
- `parseHBLNumbers()` - Text parsing utility
- Translation system for internationalization

## Example Usage in Tab
```typescript
<Show when={activeTab() === 'reports'}>
  <HBLBulkList />
</Show>
```

## Performance Features
- **Selective Updates**: Only update selected HBLs
- **Data Refresh**: Automatic refresh after successful updates
- **Error Handling**: Graceful error states and user feedback
- **Memory Efficient**: Clean state management

This component provides a complete solution for bulk HBL management, from text input to status updates, with a user-friendly interface and robust data handling.