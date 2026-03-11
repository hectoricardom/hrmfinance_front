// Default chart of accounts for HRM Finance system
// These accounts are optimized for freight forwarding and remittance business

export interface DefaultAccount {
  accountNumber: string;
  name: string;
  accountType: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
  category: string;
  balance: number;
  isActive: boolean;
  parentAccountId?: string;
  description: string;
}

export const defaultAccounts: DefaultAccount[] = [
  // ASSETS (1000-1999)
  {
    accountNumber: '1000',
    name: 'Assets',
    accountType: 'Asset',
    category: 'currentAssets',
    balance: 0,
    isActive: true,
    description: 'Parent account for all assets'
  },
  
  // Current Assets (1000-1299)
  {
    accountNumber: '1001',
    name: 'Cash - Operating Account',
    accountType: 'Asset',
    category: 'currentAssets',
    balance: 0,
    isActive: true,
    parentAccountId: '1000',
    description: 'Main operating cash account for daily operations'
  },
  {
    accountNumber: '1002',
    name: 'Cash - Zelle Account',
    accountType: 'Asset',
    category: 'currentAssets',
    balance: 0,
    isActive: true,
    parentAccountId: '1000',
    description: 'Cash received through Zelle transfers'
  },
  {
    accountNumber: '1003',
    name: 'Cash - Credit Card Processing',
    accountType: 'Asset',
    category: 'currentAssets',
    balance: 0,
    isActive: true,
    parentAccountId: '1000',
    description: 'Cash from credit card payments'
  },

  // Accounts Receivable (1100-1199)
  {
    accountNumber: '1101',
    name: 'Accounts Receivable - Customers',
    accountType: 'Asset',
    category: 'currentAssets',
    balance: 0,
    isActive: true,
    parentAccountId: '1000',
    description: 'Money owed by customers for services rendered'
  },
  {
    accountNumber: '1102',
    name: 'Accounts Receivable - Freight Charges',
    accountType: 'Asset',
    category: 'currentAssets',
    balance: 0,
    isActive: true,
    parentAccountId: '1000',
    description: 'Outstanding freight and shipping charges'
  },

  // Inventory (1200-1299)
  {
    accountNumber: '1201',
    name: 'Inventory - Products',
    accountType: 'Asset',
    category: 'currentAssets',
    balance: 0,
    isActive: true,
    parentAccountId: '1000',
    description: 'Value of products held for resale'
  },
  {
    accountNumber: '1202',
    name: 'Inventory - Packaging Materials',
    accountType: 'Asset',
    category: 'currentAssets',
    balance: 0,
    isActive: true,
    parentAccountId: '1000',
    description: 'Boxes, packing materials, and supplies'
  },

  // Other Current Assets (1300-1399)
  {
    accountNumber: '1301',
    name: 'Prepaid Expenses',
    accountType: 'Asset',
    category: 'currentAssets',
    balance: 0,
    isActive: true,
    parentAccountId: '1000',
    description: 'Expenses paid in advance (rent, insurance, etc.)'
  },

  // Pass-Through Assets (1400-1499) - Money collected on behalf of others
  {
    accountNumber: '1401',
    name: 'Customs Fees Receivable',
    accountType: 'Asset',
    category: 'currentAssets',
    balance: 0,
    isActive: true,
    parentAccountId: '1000',
    description: 'Customs fees collected from customers to pay authorities'
  },
  {
    accountNumber: '1402',
    name: 'Transit Insurance Receivable',
    accountType: 'Asset',
    category: 'currentAssets',
    balance: 0,
    isActive: true,
    parentAccountId: '1000',
    description: 'Insurance fees collected to pay insurance companies'
  },

  // Fixed Assets (1500-1999)
  {
    accountNumber: '1501',
    name: 'Equipment - Office',
    accountType: 'Asset',
    category: 'fixedAssets',
    balance: 0,
    isActive: true,
    parentAccountId: '1000',
    description: 'Office equipment, computers, furniture'
  },
  {
    accountNumber: '1502',
    name: 'Equipment - Warehouse',
    accountType: 'Asset',
    category: 'fixedAssets',
    balance: 0,
    isActive: true,
    parentAccountId: '1000',
    description: 'Warehouse equipment, forklifts, scales'
  },
  {
    accountNumber: '1503',
    name: 'Vehicles',
    accountType: 'Asset',
    category: 'fixedAssets',
    balance: 0,
    isActive: true,
    parentAccountId: '1000',
    description: 'Delivery trucks and company vehicles'
  },
  {
    accountNumber: '1591',
    name: 'Accumulated Depreciation - Equipment',
    accountType: 'Asset',
    category: 'fixedAssets',
    balance: 0,
    isActive: true,
    parentAccountId: '1000',
    description: 'Accumulated depreciation on equipment'
  },

  // LIABILITIES (2000-2999)
  {
    accountNumber: '2000',
    name: 'Liabilities',
    accountType: 'Liability',
    category: 'currentLiabilities',
    balance: 0,
    isActive: true,
    description: 'Parent account for all liabilities'
  },

  // Current Liabilities (2000-2299)
  {
    accountNumber: '2001',
    name: 'Accounts Payable',
    accountType: 'Liability',
    category: 'currentLiabilities',
    balance: 0,
    isActive: true,
    parentAccountId: '2000',
    description: 'Money owed to suppliers and vendors'
  },
  {
    accountNumber: '2002',
    name: 'Freight Payable',
    accountType: 'Liability',
    category: 'currentLiabilities',
    balance: 0,
    isActive: true,
    parentAccountId: '2000',
    description: 'Money owed for freight and shipping services'
  },

  // Accrued Liabilities (2100-2199)
  {
    accountNumber: '2101',
    name: 'Accrued Salaries',
    accountType: 'Liability',
    category: 'currentLiabilities',
    balance: 0,
    isActive: true,
    parentAccountId: '2000',
    description: 'Unpaid employee wages and salaries'
  },
  {
    accountNumber: '2102',
    name: 'Accrued Rent',
    accountType: 'Liability',
    category: 'currentLiabilities',
    balance: 0,
    isActive: true,
    parentAccountId: '2000',
    description: 'Unpaid rent for office and warehouse space'
  },

  // Pass-Through Liabilities (2300-2399)
  {
    accountNumber: '2301',
    name: 'Sales Tax Payable',
    accountType: 'Liability',
    category: 'currentLiabilities',
    balance: 0,
    isActive: true,
    parentAccountId: '2000',
    description: 'Sales tax collected from customers, to be paid to authorities'
  },
  {
    accountNumber: '2302',
    name: 'Customs Fees Payable',
    accountType: 'Liability',
    category: 'currentLiabilities',
    balance: 0,
    isActive: true,
    parentAccountId: '2000',
    description: 'Customs fees to be paid to customs authorities'
  },
  {
    accountNumber: '2303',
    name: 'Transit Insurance Payable',
    accountType: 'Liability',
    category: 'currentLiabilities',
    balance: 0,
    isActive: true,
    parentAccountId: '2000',
    description: 'Insurance premiums to be paid to insurance companies'
  },

  // Long-term Liabilities (2500-2999)
  {
    accountNumber: '2501',
    name: 'Equipment Loan',
    accountType: 'Liability',
    category: 'longTermLiabilities',
    balance: 0,
    isActive: true,
    parentAccountId: '2000',
    description: 'Long-term loans for equipment purchases'
  },

  // EQUITY (3000-3999)
  {
    accountNumber: '3000',
    name: 'Equity',
    accountType: 'Equity',
    category: 'ownersEquity',
    balance: 0,
    isActive: true,
    description: 'Parent account for owner\'s equity'
  },
  {
    accountNumber: '3001',
    name: 'Owner\'s Equity',
    accountType: 'Equity',
    category: 'ownersEquity',
    balance: 0,
    isActive: true,
    parentAccountId: '3000',
    description: 'Owner\'s investment in the business'
  },
  {
    accountNumber: '3101',
    name: 'Retained Earnings',
    accountType: 'Equity',
    category: 'ownersEquity',
    balance: 0,
    isActive: true,
    parentAccountId: '3000',
    description: 'Accumulated profits retained in the business'
  },

  // REVENUE (4000-4999)
  {
    accountNumber: '4000',
    name: 'Revenue',
    accountType: 'Revenue',
    category: 'operatingRevenue',
    balance: 0,
    isActive: true,
    description: 'Parent account for all revenue'
  },
  
  // Product Sales Revenue (4000-4099)
  {
    accountNumber: '4001',
    name: 'Sales Revenue - Products',
    accountType: 'Revenue',
    category: 'operatingRevenue',
    balance: 0,
    isActive: true,
    parentAccountId: '4000',
    description: 'Revenue from selling physical products'
  },
  
  // Service Revenue (4100-4199)
  {
    accountNumber: '4101',
    name: 'Service Revenue - General',
    accountType: 'Revenue',
    category: 'operatingRevenue',
    balance: 0,
    isActive: true,
    parentAccountId: '4000',
    description: 'Revenue from general services provided'
  },
  
  // Transport Revenue (4200-4299)
  {
    accountNumber: '4201',
    name: 'Transport Service Revenue',
    accountType: 'Revenue',
    category: 'operatingRevenue',
    balance: 0,
    isActive: true,
    parentAccountId: '4000',
    description: 'Revenue from transportation and delivery services'
  },
  {
    accountNumber: '4202',
    name: 'Freight Revenue - Air',
    accountType: 'Revenue',
    category: 'operatingRevenue',
    balance: 0,
    isActive: true,
    parentAccountId: '4000',
    description: 'Revenue from air freight services'
  },
  {
    accountNumber: '4203',
    name: 'Freight Revenue - Sea',
    accountType: 'Revenue',
    category: 'operatingRevenue',
    balance: 0,
    isActive: true,
    parentAccountId: '4000',
    description: 'Revenue from sea freight services'
  },
  
  // Processing Revenue (4300-4399)
  {
    accountNumber: '4301',
    name: 'Processing Revenue - Packaging',
    accountType: 'Revenue',
    category: 'operatingRevenue',
    balance: 0,
    isActive: true,
    parentAccountId: '4000',
    description: 'Revenue from packaging and wrapping services'
  },
  {
    accountNumber: '4302',
    name: 'Processing Revenue - Storage',
    accountType: 'Revenue',
    category: 'operatingRevenue',
    balance: 0,
    isActive: true,
    parentAccountId: '4000',
    description: 'Revenue from storage and warehousing services'
  },

  // EXPENSES (5000-5999)
  {
    accountNumber: '5000',
    name: 'Expenses',
    accountType: 'Expense',
    category: 'operatingExpenses',
    balance: 0,
    isActive: true,
    description: 'Parent account for all expenses'
  },
  
  // Cost of Goods Sold (5000-5099)
  {
    accountNumber: '5001',
    name: 'Cost of Goods Sold - Products',
    accountType: 'Expense',
    category: 'operatingExpenses',
    balance: 0,
    isActive: true,
    parentAccountId: '5000',
    description: 'Direct cost of products sold'
  },
  {
    accountNumber: '5002',
    name: 'Cost of Goods Sold - Packaging',
    accountType: 'Expense',
    category: 'operatingExpenses',
    balance: 0,
    isActive: true,
    parentAccountId: '5000',
    description: 'Cost of packaging materials used'
  },
  
  // Freight and Transport Expenses (5100-5199)
  {
    accountNumber: '5101',
    name: 'Freight Expense - Air',
    accountType: 'Expense',
    category: 'operatingExpenses',
    balance: 0,
    isActive: true,
    parentAccountId: '5000',
    description: 'Cost of air freight services purchased'
  },
  {
    accountNumber: '5102',
    name: 'Freight Expense - Sea',
    accountType: 'Expense',
    category: 'operatingExpenses',
    balance: 0,
    isActive: true,
    parentAccountId: '5000',
    description: 'Cost of sea freight services purchased'
  },
  {
    accountNumber: '5103',
    name: 'Local Transport Expense',
    accountType: 'Expense',
    category: 'operatingExpenses',
    balance: 0,
    isActive: true,
    parentAccountId: '5000',
    description: 'Local delivery and transport costs'
  },
  
  // Operating Expenses (5200-5999)
  {
    accountNumber: '5201',
    name: 'Salaries and Wages',
    accountType: 'Expense',
    category: 'operatingExpenses',
    balance: 0,
    isActive: true,
    parentAccountId: '5000',
    description: 'Employee salaries and wages'
  },
  {
    accountNumber: '5202',
    name: 'Rent Expense - Office',
    accountType: 'Expense',
    category: 'operatingExpenses',
    balance: 0,
    isActive: true,
    parentAccountId: '5000',
    description: 'Monthly rent for office space'
  },
  {
    accountNumber: '5203',
    name: 'Rent Expense - Warehouse',
    accountType: 'Expense',
    category: 'operatingExpenses',
    balance: 0,
    isActive: true,
    parentAccountId: '5000',
    description: 'Monthly rent for warehouse space'
  },
  {
    accountNumber: '5301',
    name: 'Utilities Expense',
    accountType: 'Expense',
    category: 'operatingExpenses',
    balance: 0,
    isActive: true,
    parentAccountId: '5000',
    description: 'Electricity, water, gas, internet, and phone'
  },
  {
    accountNumber: '5302',
    name: 'Insurance Expense',
    accountType: 'Expense',
    category: 'operatingExpenses',
    balance: 0,
    isActive: true,
    parentAccountId: '5000',
    description: 'Business insurance premiums'
  },
  {
    accountNumber: '5303',
    name: 'Office Supplies',
    accountType: 'Expense',
    category: 'operatingExpenses',
    balance: 0,
    isActive: true,
    parentAccountId: '5000',
    description: 'Office supplies and materials'
  },
  {
    accountNumber: '5401',
    name: 'Professional Fees',
    accountType: 'Expense',
    category: 'operatingExpenses',
    balance: 0,
    isActive: true,
    parentAccountId: '5000',
    description: 'Accounting, legal, and consulting fees'
  },
  {
    accountNumber: '5402',
    name: 'Bank Fees',
    accountType: 'Expense',
    category: 'operatingExpenses',
    balance: 0,
    isActive: true,
    parentAccountId: '5000',
    description: 'Bank charges and transaction fees'
  },
  {
    accountNumber: '5403',
    name: 'Credit Card Processing Fees',
    accountType: 'Expense',
    category: 'operatingExpenses',
    balance: 0,
    isActive: true,
    parentAccountId: '5000',
    description: 'Fees for processing credit card payments'
  },
  {
    accountNumber: '5501',
    name: 'Vehicle Expenses',
    accountType: 'Expense',
    category: 'operatingExpenses',
    balance: 0,
    isActive: true,
    parentAccountId: '5000',
    description: 'Gas, maintenance, and repairs for company vehicles'
  },
  {
    accountNumber: '5502',
    name: 'Equipment Maintenance',
    accountType: 'Expense',
    category: 'operatingExpenses',
    balance: 0,
    isActive: true,
    parentAccountId: '5000',
    description: 'Maintenance and repairs for office and warehouse equipment'
  },
  {
    accountNumber: '5601',
    name: 'Depreciation Expense',
    accountType: 'Expense',
    category: 'operatingExpenses',
    balance: 0,
    isActive: true,
    parentAccountId: '5000',
    description: 'Depreciation of fixed assets'
  }
];

// Helper function to generate account mapping suggestions
export const getDefaultAccountForTransaction = (transactionType: string): {debit: string, credit: string} | null => {
  const mappings: Record<string, {debit: string, credit: string}> = {
    'cash_sale': { debit: '1001', credit: '4001' }, // Cash -> Sales Revenue
    'credit_sale': { debit: '1101', credit: '4001' }, // A/R -> Sales Revenue
    'zelle_sale': { debit: '1002', credit: '4001' }, // Zelle Cash -> Sales Revenue
    'transport_service': { debit: '1001', credit: '4201' }, // Cash -> Transport Revenue
    'processing_service': { debit: '1001', credit: '4301' }, // Cash -> Processing Revenue
    'customs_fee_collection': { debit: '1001', credit: '1401' }, // Cash -> Customs Receivable
    'customs_fee_payment': { debit: '2302', credit: '1001' }, // Customs Payable -> Cash
    'sales_tax_collection': { debit: '1001', credit: '2301' }, // Cash -> Sales Tax Payable
    'freight_expense_air': { debit: '5101', credit: '1001' }, // Air Freight Expense -> Cash
    'freight_expense_sea': { debit: '5102', credit: '1001' }, // Sea Freight Expense -> Cash
    'inventory_purchase': { debit: '1201', credit: '1001' }, // Inventory -> Cash
    'cost_of_goods_sold': { debit: '5001', credit: '1201' }, // COGS -> Inventory
    'salary_payment': { debit: '5201', credit: '1001' }, // Salaries -> Cash
    'rent_payment': { debit: '5202', credit: '1001' }, // Rent -> Cash
    'utilities_payment': { debit: '5301', credit: '1001' }, // Utilities -> Cash
  };

  return mappings[transactionType] || null;
};