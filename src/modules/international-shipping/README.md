# International Shipping Module

A comprehensive shipping management system for international deliveries to Central American countries (Honduras, Guatemala, El Salvador, Nicaragua) with **cubic feet-based pricing** instead of weight-based pricing.

## Overview

This module is a clone of the invoice module, adapted specifically for international shipping with the following key differences:

- **Pricing Model**: Cubic feet × price per cubic foot (instead of lbs × price per pound)
- **Dimension Fields**: Height, width, and depth inputs to calculate cubic feet
- **Country-Specific Tariffs**: Different tariff rates for each destination country
- **Configurable Pricing**: Default price per cubic foot can be set and overridden per item

## Key Features

### 1. Cubic Feet Calculation
- Input dimensions in inches (height × width × depth)
- Automatic conversion to cubic feet (cubic inches ÷ 1,728)
- Displays both individual item cubic feet and total cubic feet per item (qty × cubic feet)

### 2. Country-Specific Tariffs

| Country | Tariff Rate | Flag |
|---------|------------|------|
| Honduras | 12% | 🇭🇳 |
| Guatemala | 10% | 🇬🇹 |
| El Salvador | 11% | 🇸🇻 |
| Nicaragua | 13% | 🇳🇮 |

### 3. Automatic Calculations
- Cubic feet from dimensions
- Total cubic feet (qty × cubic feet per item)
- Subtotal (total cubic feet × price per cubic foot)
- Tariff (subtotal × country tariff rate)
- Total (subtotal + tariff)

### 4. Flexible Pricing
- Set a default price per cubic foot globally
- Override price per cubic foot for individual items
- Recalculates automatically when dimensions, quantity, or country changes

## File Structure

```
src/modules/international-shipping/
├── types/
│   └── internationalShippingTypes.ts    # Type definitions and interfaces
├── stores/
│   └── internationalShippingFormStore.ts # State management with auto-save
├── components/
│   └── InternationalShippingForm.tsx    # Main form component
├── pages/
│   └── InternationalShippingPage.tsx    # Page wrapper with instructions
└── README.md                             # This file
```

## Type Definitions

### Main Types

```typescript
// Dimensions with cubic feet calculation
interface ShippingDimensions {
  height: number;  // inches
  width: number;   // inches
  depth: number;   // inches
  cubicFeet: number; // calculated
}

// Shipment item with cubic feet pricing
interface InternationalShipmentItem {
  id: string;
  description: string;
  qty: number;
  dimensions: ShippingDimensions;
  pricePerCubicFoot: number;
  totalCubicFeet: number;  // qty × cubicFeet
  subtotal: number;        // totalCubicFeet × pricePerCubicFoot
  tariff: number;          // subtotal × country tariff rate
  total: number;           // subtotal + tariff
  bulkId?: string;
}

// Country tariff configuration
interface CountryTariff {
  country: DestinationCountry;
  tariffRate: number;  // decimal (e.g., 0.12 for 12%)
  label: string;
  flagEmoji: string;
}
```

## Usage Example

### 1. Import the Page Component

```typescript
import InternationalShippingPage from './modules/international-shipping/pages/InternationalShippingPage';
```

### 2. Add to Router

```typescript
<Route path="/international-shipping" component={InternationalShippingPage} />
```

### 3. Using the Form

1. **Select Destination Country** - This determines the tariff rate
2. **Set Default Price per Cubic Foot** - Can be changed anytime (default: $15/ft³)
3. **Add Shipment Items**:
   - Enter description
   - Enter quantity
   - Input dimensions (height, width, depth in inches)
   - Optionally override price per cubic foot
4. **Review Calculations** - All totals update automatically
5. **Save Document** - Creates shipping document with all calculations

## Calculation Examples

### Example 1: Single Box to Honduras

- Dimensions: 12" × 12" × 12" = 1,728 cubic inches = 1 cubic foot
- Quantity: 5 boxes
- Price per cubic foot: $15.00
- Total cubic feet: 5 ft³
- Subtotal: 5 × $15.00 = $75.00
- Tariff (12%): $75.00 × 0.12 = $9.00
- **Total: $84.00**

### Example 2: Multiple Items to Guatemala

**Item 1:**
- Dimensions: 24" × 18" × 12" = 5,184 cubic inches = 3 cubic feet
- Quantity: 2
- Price: $20/ft³
- Total cubic feet: 6 ft³
- Subtotal: $120.00
- Tariff (10%): $12.00
- Total: $132.00

**Item 2:**
- Dimensions: 10" × 10" × 10" = 1,000 cubic inches = 0.579 cubic feet
- Quantity: 10
- Price: $15/ft³
- Total cubic feet: 5.79 ft³
- Subtotal: $86.85
- Tariff (10%): $8.69
- Total: $95.54

**Grand Total: $227.54**

## Helper Functions

### calculateCubicFeet(height, width, depth)
Converts dimensions in inches to cubic feet:
```typescript
const cubicFeet = (height * width * depth) / 1728;
```

### getTariffRate(country, config)
Returns the tariff rate for a specific country:
```typescript
const rate = getTariffRate('HONDURAS'); // Returns 0.12
```

### calculateTariff(subtotal, country, config)
Calculates the tariff amount based on subtotal and country:
```typescript
const tariff = calculateTariff(100, 'GUATEMALA'); // Returns 10 (10%)
```

## State Management

The form uses `internationalShippingFormStore` with the following features:

- **Auto-save**: Saves to localStorage every 1 second after changes
- **Persistence**: Restores form data on page reload
- **Reactive**: All calculations update automatically
- **Validation**: Checks required fields before allowing save

## Differences from Invoice Module

| Feature | Invoice Module | International Shipping Module |
|---------|---------------|------------------------------|
| Pricing Unit | Pounds (lbs) | Cubic Feet (ft³) |
| Dimensions | Not used | Height × Width × Depth |
| Tariffs | Weight-based ranges | Country-specific percentages |
| Destinations | Cuba | Honduras, Guatemala, El Salvador, Nicaragua |
| Shipping Methods | Aereo/Maritimo | Country-based |
| Main Item Type | Reservas | Shipment Items |

## Future Enhancements

- [ ] PDF generation for shipping documents
- [ ] Integration with shipping APIs
- [ ] Bulk management for grouping items
- [ ] Historical pricing trends
- [ ] Multi-currency support
- [ ] Customs documentation generation
- [ ] Tracking number integration
- [ ] Email notifications

## API Integration (TODO)

The save functionality is currently a placeholder. To integrate with an API:

```typescript
// In InternationalShippingForm.tsx, update saveShipping()
const response = await fetch('/api/international-shipping', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(shippingData)
});
```

## Notes

- All dimensions are in **inches**
- Cubic feet calculation: `(H × W × D) / 1,728`
- Tariff rates can be modified in `DEFAULT_PRICING_CONFIG`
- Default price per cubic foot: **$15.00**
- Form data persists in localStorage until completed or cleared

## License

Part of HRM Finance application.
