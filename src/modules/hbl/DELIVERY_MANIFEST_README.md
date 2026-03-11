# Delivery Manifest Generator

A comprehensive HBL Records Management delivery manifest system that organizes shipments for efficient route planning and delivery tracking.

## Overview

The Delivery Manifest Generator creates organized, printable manifests that group HBL records by:
1. **State** (estate)
2. **City**
3. **Street** (streetName)
4. **Street Number** (streetNo)
5. **Customer ID** (cidentity)
6. **Bag Number** (bagnumber)

This hierarchical grouping allows delivery drivers to efficiently plan routes and collect signatures from consignees at each delivery location.

## Features

### 📦 Hierarchical Organization
- **State Level**: Groups all deliveries by state
- **Address Level**: Groups customers at the same physical address
- **Customer Level**: Shows all bags for each customer (CID)
- **Bag Level**: Lists items within each bag with weights and quantities

### ✍️ Signature Collection
- Each customer entry includes a signature line
- Perfect for delivery confirmation and proof of receipt
- Professional format for consignee sign-off

### 📄 Multiple Export Formats
- **Browser Print**: Print directly from browser with optimized layout
- **Full PDF**: Detailed PDF with all items and information
- **Compact PDF**: Summary view with just addresses and totals
- **JSON Export**: Machine-readable format for integration

### 🎨 Display Options
- **Compact Mode**: Show only bag counts and totals
- **Detail Mode**: Display individual HBL items within each bag
- **Summary Statistics**: View totals for states, addresses, customers, bags, items, and weight

## Usage

### Access the Manifest Generator

Navigate to: `/hbl-manifest` or use the navigation menu under HBL section.

**Required Permission**: `HBLAccessManagement`

### Step-by-Step Guide

#### 1. Search for HBL Records
```
Enter search criteria:
- Guide Number (guia)
- HBL Number
- Customer ID (cidentity)
- Any other searchable field
```

Click **Search** button. The system will fetch and display matching records.

#### 2. Generate Manifest
Once records are found, click **Generate Manifest** button.

The manifest will automatically group records by the hierarchy:
- State → Address → Customer → Bag

#### 3. Review the Manifest
The manifest displays:
- State sections with totals
- Address groupings
- Customer information (CID, Name, Phone)
- Bag details with items and weights
- Signature lines for each customer

#### 4. Export or Print

**Print**: Click **Print** button for browser-based printing
**Full PDF**: Click **Download PDF** for detailed PDF with all information
**Compact PDF**: Click **Compact PDF** for summary-only version
**JSON**: Click **Export JSON** for data integration

### Toggle Options

- **Compact Mode**: Show/hide item details within bags
- **Show Item Details**: Display individual HBL items with descriptions

## Data Structure

### Manifest Hierarchy

```
Delivery Manifest
└── States
    └── Addresses
        └── Customers
            └── Bags
                └── Items (HBL Records)
```

### Example Output

```
📍 Florida - 15 Addresses, 23 Customers

🏠 123 Main Street, Miami, Florida (2 customers, 5 bags)

  CID: 12345678
  Name: Juan Perez
  Phone: 305-555-1234

  📦 Bag #001  -  3 items  |  25.5 lbs
  📦 Bag #002  -  2 items  |  15.0 lbs

  Total: 2 bags | 5 items | 40.5 lbs

  _________________________
  Signature / Firma

  ---

  CID: 87654321
  Name: Maria Garcia
  Phone: 305-555-5678

  📦 Bag #003  -  4 items  |  30.2 lbs

  Total: 1 bag | 4 items | 30.2 lbs

  _________________________
  Signature / Firma
```

## API Integration

### Generate Manifest Programmatically

```typescript
import { generateManifest } from '../services/manifestService';
import { hblStore } from '../data/hblStore';

// Get HBL records
const hbls = hblStore.filteredHBLs();

// Generate manifest
const manifest = generateManifest(hbls, {
  guideNumber: 'GN-12345',
  generatedBy: 'System',
  filters: {
    state: 'Florida',
    city: 'Miami',
    // ... other filters
  }
});

// Access manifest data
console.log(manifest.totalStates);
console.log(manifest.totalCustomers);
console.log(manifest.states);
```

### Export to PDF

```typescript
import { downloadManifestPDF, generateCompactManifestPDF } from '../services/manifestPdfGenerator';

// Full PDF with all details
await downloadManifestPDF(manifest, {
  includeDetails: true,
  includeSignature: true,
  compactMode: false
});

// Compact summary PDF
const doc = await generateCompactManifestPDF(manifest);
doc.save(`Manifest-${manifest.manifestId}-Summary.pdf`);
```

## File Structure

```
src/modules/hbl/
├── types/
│   └── manifestTypes.ts          # Type definitions
├── services/
│   ├── manifestService.ts        # Grouping and generation logic
│   └── manifestPdfGenerator.ts   # PDF generation
├── components/
│   └── DeliveryManifest.tsx      # Main manifest component
└── pages/
    └── DeliveryManifestPage.tsx  # Full page with search integration
```

## Types Reference

### ManifestItem
Individual HBL record within a bag
- `hbl`: HBL tracking number
- `namegood`: Item description
- `quantity`: Quantity string
- `weight`: Weight string
- `idguidestate`: Status

### ManifestBag
Collection of items in a bag
- `bagNumber`: Bag identifier
- `items`: Array of ManifestItem
- `totalWeight`: Sum of item weights
- `totalQuantity`: Sum of quantities
- `itemCount`: Number of items

### ManifestCustomer
Customer at an address with their bags
- `cid`: Customer ID (cidentity)
- `consigneeName`: Customer name
- `ctelephone`: Phone number
- `bags`: Array of ManifestBag
- `totalBags`: Number of bags
- `totalWeight`: Total weight
- `totalItems`: Total item count
- `signature`: Optional signature data
- `deliveredAt`: Optional delivery timestamp

### ManifestAddress
Physical location with customers
- `estate`: State
- `city`: City
- `streetName`: Street name
- `streetNo`: Street number
- `between`: Between streets (betwen)
- `fullAddress`: Formatted complete address
- `customers`: Array of ManifestCustomer
- `totalCustomers`: Number of customers
- `totalBags`: Total bags at address
- `totalItems`: Total items at address

### ManifestState
State-level grouping
- `state`: State name
- `addresses`: Array of ManifestAddress
- `totalAddresses`: Number of addresses
- `totalCustomers`: Total customers in state
- `totalItems`: Total items in state

### DeliveryManifest
Complete manifest structure
- `manifestId`: Unique identifier (MF-YYYYMMDD-XXXXXX)
- `generatedAt`: Generation timestamp
- `generatedBy`: User who generated
- `guideNumber`: Optional guide number
- `states`: Array of ManifestState
- `totalStates`: Number of states
- `totalAddresses`: Total addresses
- `totalCustomers`: Total customers
- `totalBags`: Total bags
- `totalItems`: Total items
- `totalWeight`: Total weight (lbs)
- `status`: 'draft' | 'ready' | 'in-delivery' | 'completed'

## Print Optimization

The manifest includes print-specific CSS:
- Hides toolbar buttons when printing
- Optimizes page breaks at state/customer boundaries
- Adjusts fonts for better readability
- Ensures signature lines are visible

```css
@media print {
  .no-print { display: none !important; }
  .manifest-state { page-break-inside: avoid; }
  .manifest-customer { page-break-inside: avoid; }
  body { font-size: 11pt; }
}
```

## Filtering Options

Apply filters when generating manifest:

```typescript
const manifest = generateManifest(hbls, {
  filters: {
    state: 'Florida',          // Filter by state
    city: 'Miami',             // Filter by city
    guideNumber: 'GN-123',     // Filter by guide
    status: 'PENDIENTE',       // Filter by status
    dateFrom: '2025-01-01',    // Date range start
    dateTo: '2025-12-31',      // Date range end
    minWeight: 10,             // Minimum weight
    maxWeight: 50              // Maximum weight
  }
});
```

## Benefits

### For Delivery Drivers
- ✅ Organized route planning by address
- ✅ Clear customer information at each stop
- ✅ Easy signature collection
- ✅ Bag-level tracking
- ✅ Weight information for capacity planning

### For Dispatchers
- ✅ Quick manifest generation from search results
- ✅ Multiple export formats
- ✅ Summary statistics for planning
- ✅ Professional printed documents

### For Record Keeping
- ✅ Proof of delivery with signatures
- ✅ Complete delivery history
- ✅ Exportable data for archives
- ✅ Unique manifest IDs for tracking

## Troubleshooting

### No records found
- Verify search criteria matches existing HBL records
- Check that you have HBLAccessManagement permission
- Ensure API is responding correctly

### Manifest is empty after generation
- Ensure HBL records have address information (estate, city, street)
- Check that records have valid cidentity values
- Verify bagnumber field is populated

### PDF generation fails
- Check browser console for errors
- Ensure jsPDF library is loaded
- Try compact PDF if full PDF fails

### Grouping issues
- Verify address fields are consistent (same spelling, capitalization)
- Check for missing or null address data
- Ensure cidentity values are unique per customer

## Future Enhancements

Potential improvements:
- QR codes for each customer/bag
- Real-time delivery status updates
- GPS route optimization
- Mobile driver app integration
- Electronic signature capture
- Photo proof of delivery
- SMS notifications to customers
- Multi-language support

## Support

For issues or questions about the Delivery Manifest Generator:
1. Check HBL data quality and completeness
2. Verify user permissions (HBLAccessManagement)
3. Review console logs for errors
4. Test with sample data first

## License

Part of HRM Finance system.
