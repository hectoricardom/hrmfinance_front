# Bulk PDF Utilities

This document explains how to use the bulk grouping utilities for PDF generation.

## Available Components

### 1. BulkItemGroup.tsx (SolidJS Component)
**Location**: `/src/modules/invoice/components/BulkItemGroup.tsx`

Reusable SolidJS component for displaying bulk information with all items grouped together.

**Props:**
- `bulk`: InvoiceBulk - The bulk to display
- `products`, `reservas`, `services`: Arrays of items
- `showDetails`: boolean - Show bulk type, weight, etc.
- `compact`: boolean - Use compact display mode
- `formatCurrency`, `parseFloat2`, `t`: Utility functions
- `tableStyle`, `tdStyle`, `thStyle`: Styling objects

**Usage:**
```tsx
<BulkItemGroup
  bulk={bulk}
  products={products}
  reservas={reservas}
  services={services}
  showDetails={true}
  compact={false}
  formatCurrency={formatCurrency}
  parseFloat2={parseFloat2}
  t={t}
  tableStyle={tableStyle}
  tdStyle={tdStyle}
  thStyle={thStyle}
/>
```

### 2. BulkSummary.tsx (SolidJS Component)
**Location**: `/src/modules/invoice/components/BulkSummary.tsx`

Summary component showing statistics and compact bulk list.

**Usage:**
```tsx
<BulkSummary
  bulks={bulks}
  products={products}
  reservas={reservas}
  services={services}
/>
```

## PDF Utilities

### 1. bulkPdfUtils.ts
**Location**: `/src/utils/bulkPdfUtils.ts`

Core utilities for bulk PDF generation.

**Functions:**
- `parseFloat2(value)` - Safe number parsing
- `formatCurrency(amount)` - Currency formatting
- `calculateBulkTotals(bulk, products, reservas, services)` - Calculate all totals for a bulk
- `generateBulkHtml(bulk, products, reservas, services, t, compact)` - Generate HTML for a single bulk

### 2. compactBulkPdf.ts
**Location**: `/src/utils/compactBulkPdf.ts`

Additional utilities for compact PDF displays.

**Functions:**
- `generateCompactBulkSummary(bulks, products, reservas, services, t)` - Summary with stats
- `generateBulkOverview(bulks, products, reservas, services, t)` - Table overview only

## Usage in PDF Generation

### Option 1: Detailed Bulk View (Default)
Shows each bulk with all its items in detail.

```typescript
${invoiceData.bulks.map((bulk: any) => 
  generateBulkHtml(
    bulk,
    invoiceData.products || [],
    invoiceData.reservas || [],
    invoiceData.services || [],
    t,
    false // compact = false for detailed view
  )
).join('')}
```

### Option 2: Compact Bulk Summary
Shows statistics and compact bulk list.

```typescript
${generateCompactBulkSummary(
  invoiceData.bulks,
  invoiceData.products || [],
  invoiceData.reservas || [],
  invoiceData.services || [],
  t
)}
```

### Option 3: Table Overview Only
Shows bulks in a simple table format.

```typescript
${generateBulkOverview(
  invoiceData.bulks,
  invoiceData.products || [],
  invoiceData.reservas || [],
  invoiceData.services || [],
  t
)}
```

## Key Features

✅ **Consistent Logic** - Same calculation logic across UI and PDF
✅ **Multiple Display Modes** - Detailed, compact, overview
✅ **Automatic Calculations** - Transport costs, totals, item counts
✅ **Proper Grouping** - Items filtered by bulkId
✅ **Currency Formatting** - Consistent number display
✅ **Responsive Design** - Compact mode for space-limited contexts
✅ **Type Safety** - Full TypeScript support
✅ **Internationalization** - Translation function support

## Data Structure

Each bulk should have the structure:
```typescript
interface InvoiceBulk {
  id: string;
  name: string;
  type: 'PERSONAL' | 'COMMERCIAL' | 'MIXED';
  maxWeight: number;
  currentWeight: number;
  transportCost?: number;
  shippingMethod: 'AEREO' | 'SEA';
  status: 'DRAFT' | 'READY';
  token?: string;
}
```

Items (products, reservas, services) should include:
```typescript
{
  id: string;
  bulkId?: string; // Links item to bulk
  // ... other item-specific properties
}
```

## Examples

### PDF with Detailed Bulk View
Currently implemented in `printToPdf.ts` - shows complete bulk breakdown with all items.

### PDF with Compact Summary  
Useful for reports where space is limited - shows bulk stats and compact item lists.

### PDF with Overview Table
Ideal for executive summaries - shows only bulk-level information in table format.

## Migration Guide

If you have existing bulk display code, you can migrate to these utilities:

1. **Replace inline bulk HTML generation** with `generateBulkHtml()`
2. **Use `calculateBulkTotals()`** instead of manual calculations  
3. **Import utilities** from the appropriate files
4. **Choose display mode** based on context (detailed, compact, overview)

This ensures consistent display and calculations across your entire application.