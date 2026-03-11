# Point of Sale (POS) Module

A comprehensive Point of Sale system built with SolidJS, designed for retail environments with features like product management, customer tracking, multiple payment methods, and receipt generation.

## Features

### 🛒 Product Management
- **Product Grid**: Visual product selection with search, filtering, and categorization
- **Barcode Scanning**: Integrated barcode scanner for quick product lookup
- **Inventory Tracking**: Real-time stock level monitoring
- **Favorites**: Quick access to frequently sold items
- **Product Search**: Search by name, SKU, or barcode

### 👥 Customer Management
- **Customer Selection**: Search and select existing customers
- **Customer Creation**: Add new customers on-the-fly
- **Loyalty Programs**: Support for loyalty IDs and discount rates
- **Customer History**: Track customer purchase history

### 🛍️ Shopping Cart
- **Real-time Updates**: Live cart calculations and totals
- **Quantity Management**: Easy quantity adjustment with inline editing
- **Product Removal**: Quick item removal from cart
- **Discount Application**: Support for item-level and cart-level discounts
- **Cart Persistence**: Save and restore carts

### 💳 Payment Processing
- **Multiple Payment Methods**: Cash, Credit/Debit Cards, Zelle, Bank Transfer, Check, Gift Cards
- **Split Payments**: Accept multiple payment methods for a single sale
- **Quick Payment**: One-click exact payment buttons
- **Change Calculation**: Automatic change calculation for cash payments
- **Payment Validation**: Real-time payment validation and error handling

### 🧾 Receipt Generation
- **Print Receipts**: Professional receipt printing
- **Email Receipts**: Send receipts via email
- **Custom Headers/Footers**: Configurable business information
- **Detailed Breakdown**: Itemized receipts with taxes and discounts

### ⚙️ Configuration
- **Tax Settings**: Configurable tax rates and application rules
- **Store Settings**: Multi-store support with store-specific configurations
- **User Permissions**: Role-based access control
- **Receipt Customization**: Custom receipt headers and footers

## Architecture

### Component Structure
```
/pos/
├── components/
│   ├── POSCheckout.tsx          # Main POS interface
│   ├── ProductGrid.tsx          # Product selection grid
│   ├── ShoppingCart.tsx         # Shopping cart sidebar
│   ├── PaymentProcessor.tsx     # Payment handling
│   ├── CustomerSelector.tsx     # Customer selection modal
│   └── ReceiptGenerator.tsx     # Receipt generation and printing
├── pages/
│   └── POSPage.tsx             # Main POS page wrapper
├── types/
│   └── posTypes.ts             # TypeScript interfaces
└── index.ts                    # Module exports
```

### Data Flow
1. **Product Selection** → Add to cart
2. **Cart Management** → Quantity adjustments, discounts
3. **Customer Selection** → Optional customer assignment
4. **Payment Processing** → Multi-method payment handling
5. **Sale Completion** → Receipt generation and printing

## Usage

### Basic Implementation
```tsx
import { POSPage } from '../modules/pos';

// Use in your router
<Route path="/pos" component={POSPage} />
```

### Custom POS Configuration
```tsx
import { POSCheckout } from '../modules/pos';

const MyPOSPage = () => {
  const settings = {
    taxRates: [
      { name: 'Sales Tax', rate: 8.5, amount: 0, applyToTotal: true }
    ],
    defaultPaymentMethod: 'cash',
    requireCustomerForSale: false,
    autoPrintReceipt: true,
    currency: 'USD'
  };

  const handleSaleComplete = (sale) => {
    console.log('Sale completed:', sale);
    // Save to database, update inventory, etc.
  };

  return (
    <POSCheckout
      onSaleComplete={handleSaleComplete}
      settings={settings}
    />
  );
};
```

### Individual Components
```tsx
import { 
  ProductGrid, 
  ShoppingCart, 
  PaymentProcessor,
  ReceiptGenerator 
} from '../modules/pos';

// Use components individually for custom layouts
```

## Data Types

### Core Types
- **POSProduct**: Product in cart with quantity and pricing
- **POSCustomer**: Customer information and loyalty data
- **POSSale**: Complete sale transaction record
- **POSPaymentMethod**: Payment method amounts and details
- **POSSettings**: POS system configuration

### Sale Workflow
1. **Draft State**: Building cart, selecting products
2. **Payment State**: Processing payment methods
3. **Completed State**: Sale finalized, receipt generated

## Integration Points

### Inventory Integration
```tsx
// Connect to inventory system for real-time stock levels
const productGrid = (
  <ProductGrid
    onProductSelect={addToCart}
    inventoryCheck={checkInventoryLevel}
    lowStockWarning={true}
  />
);
```

### Accounting Integration
```tsx
// Automatic journal entry creation
const handleSaleComplete = async (sale) => {
  await saveToAccounting(sale);
  await updateInventory(sale.products);
  await generateReceipt(sale);
};
```

### Customer Management Integration
```tsx
// Sync with customer management system
const customerSelector = (
  <CustomerSelector
    onSelect={setCustomer}
    customerAPI={customerService}
    loyaltyProgram={loyaltyService}
  />
);
```

## Keyboard Shortcuts

### Global Shortcuts
- **Ctrl+N**: New sale
- **Ctrl+P**: Proceed to payment
- **Ctrl+C**: Clear cart
- **Ctrl+Enter**: Complete payment
- **Escape**: Cancel/Go back

### Payment Shortcuts
- **Ctrl+1**: Select cash payment
- **Ctrl+2**: Select credit card payment
- **Ctrl+3**: Select debit card payment

## Customization

### Styling
The POS system uses CSS custom properties for theming:
```css
:root {
  --pos-primary-color: #2563eb;
  --pos-success-color: #16a34a;
  --pos-warning-color: #d97706;
  --pos-error-color: #dc2626;
}
```

### Product Display
Customize product grid layout and appearance:
```tsx
const customProductGrid = (
  <ProductGrid
    itemsPerPage={24}
    showImages={true}
    showStock={true}
    favoriteFirst={true}
  />
);
```

### Receipt Layout
Customize receipt appearance:
```tsx
const receiptSettings = {
  headerText: "Your Business Name",
  footerText: "Thank you for your business!",
  showBarcode: true,
  showLogo: true
};
```

## Performance Considerations

- **Virtual Scrolling**: Large product catalogs use virtual scrolling
- **Debounced Search**: Search inputs are debounced to reduce API calls
- **Lazy Loading**: Product images loaded on demand
- **Caching**: Recently accessed products cached for faster access

## Security Features

- **User Authentication**: Required for POS access
- **Role-based Permissions**: Control access to POS features
- **Audit Trail**: All transactions logged with timestamps
- **Secure Payment**: Payment data handled securely

## Browser Compatibility

- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+
- **Mobile Support**: Responsive design for tablet POS systems
- **Barcode Scanner**: Requires camera access for barcode scanning
- **Printing**: Requires browser print capabilities or receipt printer

## Future Enhancements

- **Offline Support**: PWA functionality for offline sales
- **Mobile App**: Native mobile POS application
- **Advanced Reporting**: Sales analytics and reporting dashboard
- **Multi-location**: Enhanced multi-store management
- **API Integration**: Third-party payment processor integration