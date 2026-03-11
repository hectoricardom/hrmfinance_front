# HRM Finance - Modular Architecture

This application has been organized into a clean modular architecture that separates concerns and makes components easy to find and maintain.

## 📁 Module Structure

```
src/modules/
├── ui/                    # 🎨 Reusable UI Components
├── accounts/              # 💰 Chart of Accounts & Balance Sheet
├── inventory/             # 📦 Product & Location Management
├── employees/             # 👥 Human Resources
├── banking/               # 🏦 Bank Reconciliation & Consolidation
└── journal/               # 📋 Entry Books & Journal Entries
```

## 🎨 UI Module (`/modules/ui/`)

**Purpose**: Core reusable UI components used throughout the application

### Components:
- `Button` - Standardized button component with variants
- `Modal` - Base modal component for dialogs
- `Card` - Content container with consistent styling
- `FormInput` - Standardized input field
- `FormSelect` - Standardized select dropdown
- `Layout` - Main application layout with navigation
- `Navigation` - Application navigation component

### Usage:
```typescript
import { Button, Modal, Card } from '../modules/ui';
```

## 💰 Accounts Module (`/modules/accounts/`)

**Purpose**: Chart of accounts, balance sheet, and financial account management

### Pages:
- `Accounts` - Main accounts listing and management
- `AccountDetail` - Individual account details and transactions
- `BalanceSheet` - Financial balance sheet reporting

### Components:
- `AccountCard` - Individual account display
- `AccountDetailModal` - Account details popup
- `AccountHierarchyCard` - Account hierarchy visualization
- `AccountsOverview` - Accounts summary dashboard
- `AccountBreadcrumb` - Navigation breadcrumb
- `AddAccountModal` - New account creation
- `AddSubAccountModal` - Sub-account creation
- `EditAccountModal` - Account editing

### Store:
- `accountsStore` - Account data management

### Usage:
```typescript
import { 
  Accounts, 
  AccountCard, 
  accountsStore 
} from '../modules/accounts';
```

## 📦 Inventory Module (`/modules/inventory/`)

**Purpose**: Product management, location tracking, and inventory movements

### Pages:
- `Inventory` - Main inventory dashboard with multiple views
- `Products` - Product catalog management

### Components:
- `AddInventoryModal` - Single inventory movement creation
- `AddProductModal` - New product creation
- `AddLocationModal` - New location creation
- `BulkMovementModal` - Multi-product inventory movements
- `InventoryDetailModal` - Inventory item details
- `InventoryMovementView` - Movement history tracking
- `SearchableProductDropdown` - Product search and selection
- `SearchableLocationDropdown` - Location search and selection

### Store:
- `inventoryStore` - Inventory data management
- Types: `Product`, `Location`, `InventoryMovement`, `BulkMovementRequest`

### Usage:
```typescript
import { 
  Inventory, 
  AddProductModal, 
  SearchableProductDropdown,
  inventoryStore,
  type Product 
} from '../modules/inventory';
```

## 👥 Employees Module (`/modules/employees/`)

**Purpose**: Human resources and employee management

### Pages:
- `Employees` - Employee listing and management

### Components:
- `AddEmployeeModal` - New employee creation
- `EmployeeDetailModal` - Employee details popup

### Store:
- `employeeStore` - Employee data management

### Usage:
```typescript
import { 
  Employees, 
  AddEmployeeModal, 
  employeeStore 
} from '../modules/employees';
```

## 🏦 Banking Module (`/modules/banking/`)

**Purpose**: Bank reconciliation and financial consolidation

### Pages:
- `BankConsolidations` - Bank account consolidation management

### Components:
- `ReconciliationComparisonView` - Bank statement comparison
- `CSVUploadModal` - Bank statement CSV import

### Store:
- `bankConsolidationStore` - Banking data management

### Usage:
```typescript
import { 
  BankConsolidations, 
  ReconciliationComparisonView, 
  bankConsolidationStore 
} from '../modules/banking';
```

## 📋 Journal Module (`/modules/journal/`)

**Purpose**: Journal entries, entry books, and transaction management

### Pages:
- `EntryBooks` - Journal entry books management
- `Invoices` - Invoice management

### Components:
- `AddJournalEntryModal` - New journal entry creation
- `JournalEntryCard` - Individual journal entry display
- `JournalEntryDetailModal` - Journal entry details popup

### Store:
- `entryBookStore` - Journal entry data management

### Usage:
```typescript
import { 
  EntryBooks, 
  AddJournalEntryModal, 
  entryBookStore 
} from '../modules/journal';
```

## 🔄 Import Patterns

### Within the same module:
```typescript
// From component to another component in same module
import AddProductModal from './AddProductModal';

// From component to store in same module
import { inventoryStore } from '../stores/inventoryStore';
```

### Cross-module imports:
```typescript
// UI components (used everywhere)
import { Button, Modal, Card } from '../../ui';

// Other modules (when needed)
import { accountsStore } from '../../accounts';
```

### From App.tsx:
```typescript
import { Navigation } from './modules/ui';
import { Inventory, Products } from './modules/inventory';
import { Accounts, BalanceSheet } from './modules/accounts';
```

## 📋 Benefits of This Structure

1. **🔍 Easy to Find**: Components are logically grouped by business domain
2. **🔧 Easy to Maintain**: Related code is co-located
3. **🚀 Scalable**: New features can be added to appropriate modules
4. **🔄 Reusable**: UI components are shared across modules
5. **📦 Modular**: Each module can be developed independently
6. **🧪 Testable**: Modules can be tested in isolation
7. **📚 Self-Documenting**: Module structure reflects business logic

## 🛠️ Adding New Features

When adding new features:

1. **Identify the Module**: Determine which business domain the feature belongs to
2. **Follow Patterns**: Use existing patterns for components, stores, and pages
3. **Update Index Files**: Add new exports to module index files
4. **Use UI Components**: Leverage shared UI components from `/modules/ui/`

## 🎯 Module Independence

Each module should:
- ✅ Be self-contained with its own components, pages, and stores
- ✅ Import UI components from `/modules/ui/`
- ✅ Have clear boundaries and responsibilities
- ✅ Export its public API through index.ts files
- ❌ Not directly import from other business modules (except UI)

This architecture ensures the application remains maintainable and scalable as it grows.