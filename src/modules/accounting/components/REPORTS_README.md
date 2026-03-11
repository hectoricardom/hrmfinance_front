# Accounting Reports Components

This directory contains all the report components for the accounting module. These components work together to provide comprehensive financial reporting capabilities.

## Components Overview

### 1. ReportFilters
Date range and filter controls for all reports.

**Location:** `/Users/hectorssg/Documents/claudeAI/hrmfinance/src/modules/accounting/components/ReportFilters.tsx`

**Props:**
- `startDate: string` - The start date in ISO format (YYYY-MM-DD)
- `endDate: string` - The end date in ISO format (YYYY-MM-DD)
- `onDateChange: (startDate: string, endDate: string) => void` - Callback when dates change
- `onExport: () => void` - Callback when export button is clicked

**Features:**
- Date pickers for start and end dates
- Quick select buttons:
  - This Month
  - Last Month
  - This Year
  - Last Year
- Export button to trigger report export

**Usage:**
```tsx
import { ReportFilters } from '../components';

<ReportFilters
  startDate="2025-01-01"
  endDate="2025-01-31"
  onDateChange={(start, end) => {
    setStartDate(start);
    setEndDate(end);
  }}
  onExport={() => setShowExportModal(true)}
/>
```

---

### 2. BalanceSheet
Display balance sheet report with assets, liabilities, and equity.

**Location:** `/Users/hectorssg/Documents/claudeAI/hrmfinance/src/modules/accounting/components/BalanceSheet.tsx`

**Props:**
- `asOfDate: string` - The date for the balance sheet in ISO format

**Features:**
- Fetches data using `getBalanceSheet()` from accountingApi
- Three main sections:
  - Assets
  - Liabilities
  - Equity
- Shows account hierarchies with balances
- Total calculations at section and overall level
- Currency formatting
- Loading and error states
- Responsive layout

**Data Structure:**
```typescript
interface BalanceSheetReport {
  asOfDate: string;
  assets: AccountBalance[];
  liabilities: AccountBalance[];
  equity: AccountBalance[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
}
```

**Usage:**
```tsx
import { BalanceSheet } from '../components';

<BalanceSheet asOfDate="2025-01-31" />
```

---

### 3. IncomeStatement
Display income statement (Profit & Loss) report.

**Location:** `/Users/hectorssg/Documents/claudeAI/hrmfinance/src/modules/accounting/components/IncomeStatement.tsx`

**Props:**
- `startDate: string` - The period start date in ISO format
- `endDate: string` - The period end date in ISO format

**Features:**
- Fetches data using `getIncomeStatement()` from accountingApi
- Revenue section with accounts and amounts
- Expense section with accounts and amounts
- Calculates:
  - Gross profit
  - Net income
- Color coding:
  - Green background for profit
  - Red background for loss
- Uses Card component for sections
- Loading and error states

**Data Structure:**
```typescript
interface IncomeStatementReport {
  startDate: string;
  endDate: string;
  revenue: AccountBalance[];
  expenses: AccountBalance[];
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
}
```

**Usage:**
```tsx
import { IncomeStatement } from '../components';

<IncomeStatement
  startDate="2025-01-01"
  endDate="2025-01-31"
/>
```

---

### 4. TrialBalance
Display trial balance report showing all accounts with debits and credits.

**Location:** `/Users/hectorssg/Documents/claudeAI/hrmfinance/src/modules/accounting/components/TrialBalance.tsx`

**Props:**
- `asOfDate: string` - The date for the trial balance in ISO format

**Features:**
- Fetches data using `getTrialBalance()` from accountingApi
- Table format with columns:
  - Account Code
  - Account Name
  - Debit
  - Credit
- Shows all accounts with non-zero balances
- Total row showing total debits and total credits
- Balance indicator:
  - Green "In Balance" when debits = credits
  - Red "Out of Balance" when they don't match
- Responsive table layout

**Data Structure:**
```typescript
interface TrialBalanceReport {
  asOfDate: string;
  accounts: Array<{
    accountId: string;
    accountNumber: string;
    accountName: string;
    debit: number;
    credit: number;
  }>;
  totalDebit: number;
  totalCredit: number;
}
```

**Usage:**
```tsx
import { TrialBalance } from '../components';

<TrialBalance asOfDate="2025-01-31" />
```

---

### 5. ReportExport
Modal for exporting reports in different formats.

**Location:** `/Users/hectorssg/Documents/claudeAI/hrmfinance/src/modules/accounting/components/ReportExport.tsx`

**Props:**
- `reportType: 'balance-sheet' | 'income-statement' | 'trial-balance'` - Type of report
- `dateRange: { startDate?: string; endDate?: string; asOfDate?: string }` - Date parameters
- `onExport: (format: 'pdf' | 'csv' | 'excel', options: ExportOptions) => void` - Export callback
- `onClose: () => void` - Close modal callback

**Features:**
- Format selection:
  - PDF - Best for printing
  - CSV - Best for spreadsheets
  - Excel - Best for analysis
- Export options (checkboxes):
  - Include detailed account information
  - Include accounts with zero balances
- Download/Cancel buttons
- Visual format descriptions
- Date range display

**Export Options:**
```typescript
interface ExportOptions {
  includeDetails: boolean;
  includeZeroBalances: boolean;
}
```

**Usage:**
```tsx
import { ReportExport } from '../components';

<ReportExport
  reportType="income-statement"
  dateRange={{ startDate: "2025-01-01", endDate: "2025-01-31" }}
  onExport={(format, options) => {
    // Handle export logic
    console.log('Export as', format, 'with options', options);
  }}
  onClose={() => setShowModal(false)}
/>
```

---

## API Service

All components use the accounting API service located at:
`/Users/hectorssg/Documents/claudeAI/hrmfinance/src/modules/accounting/services/accountingApi.ts`

### Available Functions:

```typescript
// Get Balance Sheet
getBalanceSheet(asOfDate: string): Promise<BalanceSheetReport | null>

// Get Income Statement
getIncomeStatement(startDate: string, endDate: string): Promise<IncomeStatementReport | null>

// Get Trial Balance
getTrialBalance(asOfDate: string): Promise<TrialBalanceReport | null>
```

---

## Complete Example

See `/Users/hectorssg/Documents/claudeAI/hrmfinance/src/modules/accounting/pages/ReportsExample.tsx` for a complete working example that demonstrates:

1. Using ReportFilters to control date ranges
2. Switching between different report types using tabs
3. Displaying the appropriate report component
4. Opening the export modal
5. Handling export logic

---

## Styling

All components use inline styles with CSS custom properties:
- `var(--primary-color)` - Primary brand color
- `var(--text-primary)` - Primary text color
- `var(--text-muted)` - Muted/secondary text color
- `var(--surface-color)` - Surface/background color
- `var(--surface-hover)` - Hover state background
- `var(--border-color)` - Border color
- `var(--border-light)` - Light border color
- `var(--success-color)` - Success state color (green)
- `var(--success-light)` - Light success background
- `var(--error-color)` - Error state color (red)
- `var(--error-light)` - Light error background
- `var(--border-radius)` - Standard border radius
- `var(--border-radius-sm)` - Small border radius

---

## Dependencies

### UI Components (from `../../ui`):
- `Card` - Container component with optional title/subtitle
- `Button` - Styled button component with variants
- `Modal` - Modal dialog component

### Solid.js Imports:
- `Component`, `createSignal`, `createEffect`, `For`, `Show`

---

## Best Practices

1. **Date Format:** Always use ISO date format (YYYY-MM-DD) for date props
2. **Error Handling:** All report components handle loading and error states
3. **Currency Formatting:** Use built-in `Intl.NumberFormat` for consistent currency display
4. **Responsive Design:** All components are responsive and work on mobile devices
5. **Loading States:** Show loading indicators while fetching data
6. **Type Safety:** All components are fully typed with TypeScript

---

## Future Enhancements

Potential improvements for these components:

1. **Caching:** Implement report data caching to reduce API calls
2. **Filtering:** Add account-level filtering within reports
3. **Comparison:** Add period-over-period comparison features
4. **Charts:** Add visual charts and graphs
5. **Customization:** Allow users to customize report layouts
6. **Scheduling:** Add ability to schedule automatic report generation
7. **Email:** Add email delivery of reports
8. **Print:** Add print-optimized layouts

---

## Troubleshooting

### Report not loading
- Check network console for API errors
- Verify date format is YYYY-MM-DD
- Ensure user has proper permissions

### Balance sheet out of balance
- Run trial balance to identify issues
- Check for unposted journal entries
- Verify account types are correct

### Export not working
- Check browser console for errors
- Verify export format is supported
- Ensure date range is valid

---

## Support

For issues or questions about these components, please contact the development team or file an issue in the project repository.
