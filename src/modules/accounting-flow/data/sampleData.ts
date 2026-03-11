/**
 * Sample Data for Accounting Engine Visualization System
 *
 * This file contains comprehensive test payloads for different transaction sources:
 * - Stripe Payment (credit card payments)
 * - Shopify Order (e-commerce orders)
 * - YabaExpress Shipment (freight/customs)
 * - Manual Entry (cash payments)
 *
 * Each sample includes:
 * - Raw input data
 * - Expected field mappings with confidence scores
 * - Expected StandardTransaction output
 * - Expected account mappings
 * - Expected journal entries
 * - Expected Entry Book output with balanced debits/credits
 */

import { devLog } from "../../../services/utils";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type DataSource = 'stripe' | 'shopify' | 'yabaexpress' | 'manual';

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  value: string | number | null;
  confidence: number; // 0-1 score
  transformationType?: 'direct' | 'calculated' | 'lookup' | 'parsed';
}

export interface StandardTransaction {
  id: string;
  source: DataSource;
  sourceId: string;
  date: string;
  description: string;
  customer: {
    name: string;
    email?: string;
    id?: string;
  };
  amount: number;
  currency: string;
  lineItems: LineItem[];
  taxes: TaxItem[];
  fees: FeeItem[];
  shipping?: ShippingItem;
  paymentMethod: string;
  status: 'pending' | 'completed' | 'refunded' | 'cancelled';
  metadata: Record<string, unknown>;
}

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  accountCode?: string;
}

export interface TaxItem {
  name: string;
  rate: number;
  amount: number;
  accountCode?: string;
}

export interface FeeItem {
  name: string;
  amount: number;
  accountCode?: string;
}

export interface ShippingItem {
  method: string;
  carrier?: string;
  trackingNumber?: string;
  amount: number;
  accountCode?: string;
}

export interface AccountMapping {
  accountCode: string;
  accountName: string;
  accountType: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
  debitAmount: number;
  creditAmount: number;
  description: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  description: string;
  reference: string;
  entries: AccountMapping[];
  isBalanced: boolean;
  totalDebits: number;
  totalCredits: number;
}

export interface EntryBookLine {
  accountCode: string;
  accountName: string;
  debit: number | null;
  credit: number | null;
}

export interface EntryBookOutput {
  lines: EntryBookLine[];
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
  formattedOutput: string;
}

export interface SampleData {
  source: DataSource;
  name: string;
  description: string;
  rawInput: Record<string, unknown>;
  fieldMappings: FieldMapping[];
  standardTransaction: StandardTransaction;
  accountMappings: AccountMapping[];
  journalEntry: JournalEntry;
  entryBook: EntryBookOutput;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatEntryBook(lines: EntryBookLine[], totalDebits: number, totalCredits: number): string {
  const header = 'Account              | Debit   | Credit';
  const separator = '-'.repeat(42);

  const formattedLines = lines.map(line => {
    const account = line.accountName.padEnd(20).substring(0, 20);
    const debit = line.debit !== null ? line.debit.toFixed(2).padStart(7) : '   -   ';
    const credit = line.credit !== null ? line.credit.toFixed(2).padStart(7) : '   -   ';
    return `${account} | ${debit} | ${credit}`;
  });

  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;
  const balanceIndicator = isBalanced ? ' BALANCED' : ' UNBALANCED!';
  const totalsLine = `${'TOTALS'.padEnd(20)} | ${totalDebits.toFixed(2).padStart(7)} | ${totalCredits.toFixed(2).padStart(7)}  ${balanceIndicator}`;

  return [header, separator, ...formattedLines, separator, totalsLine].join('\n');
}

// ============================================================================
// STRIPE PAYMENT SAMPLE
// ============================================================================

export function getStripeSample(): SampleData {
  const rawInput = {
    id: 'ch_1234567890',
    amount: 10825, // Amount in cents
    currency: 'usd',
    status: 'succeeded',
    created: 1703980800, // Unix timestamp
    metadata: {
      customer_name: 'John Doe',
      order_id: 'ORD-2024-001',
      invoice_id: 'INV-2024-001'
    },
    payment_method_details: {
      type: 'card',
      card: {
        brand: 'visa',
        last4: '4242',
        exp_month: 12,
        exp_year: 2025
      }
    },
    customer: 'cus_abc123',
    receipt_email: 'john.doe@email.com',
    description: 'Payment for Order ORD-2024-001',
    application_fee_amount: 314 // Platform fee in cents
  };

  const fieldMappings: FieldMapping[] = [
    { sourceField: 'id', targetField: 'sourceId', value: 'ch_1234567890', confidence: 1.0, transformationType: 'direct' },
    { sourceField: 'amount', targetField: 'amount', value: 108.25, confidence: 1.0, transformationType: 'calculated' },
    { sourceField: 'currency', targetField: 'currency', value: 'usd', confidence: 1.0, transformationType: 'direct' },
    { sourceField: 'created', targetField: 'date', value: '2024-12-31', confidence: 1.0, transformationType: 'parsed' },
    { sourceField: 'metadata.customer_name', targetField: 'customer.name', value: 'John Doe', confidence: 0.95, transformationType: 'direct' },
    { sourceField: 'receipt_email', targetField: 'customer.email', value: 'john.doe@email.com', confidence: 0.9, transformationType: 'direct' },
    { sourceField: 'payment_method_details.type', targetField: 'paymentMethod', value: 'card', confidence: 1.0, transformationType: 'direct' },
    { sourceField: 'status', targetField: 'status', value: 'completed', confidence: 1.0, transformationType: 'lookup' },
    { sourceField: 'application_fee_amount', targetField: 'fees.processingFee', value: 3.14, confidence: 1.0, transformationType: 'calculated' },
    { sourceField: 'description', targetField: 'description', value: 'Payment for Order ORD-2024-001', confidence: 0.85, transformationType: 'direct' }
  ];

  const standardTransaction: StandardTransaction = {
    id: 'txn_stripe_ch_1234567890',
    source: 'stripe',
    sourceId: 'ch_1234567890',
    date: '2024-12-31',
    description: 'Payment for Order ORD-2024-001',
    customer: {
      name: 'John Doe',
      email: 'john.doe@email.com',
      id: 'cus_abc123'
    },
    amount: 108.25,
    currency: 'USD',
    lineItems: [
      {
        description: 'Product Sale',
        quantity: 1,
        unitPrice: 100.00,
        totalPrice: 100.00,
        accountCode: '4001'
      }
    ],
    taxes: [
      {
        name: 'Sales Tax',
        rate: 0.0825,
        amount: 8.25,
        accountCode: '2301'
      }
    ],
    fees: [
      {
        name: 'Stripe Processing Fee',
        amount: 3.14,
        accountCode: '5403'
      }
    ],
    paymentMethod: 'card',
    status: 'completed',
    metadata: {
      order_id: 'ORD-2024-001',
      invoice_id: 'INV-2024-001',
      card_brand: 'visa',
      card_last4: '4242'
    }
  };

  const accountMappings: AccountMapping[] = [
    {
      accountCode: '1003',
      accountName: 'Cash - Credit Card',
      accountType: 'Asset',
      debitAmount: 105.11,
      creditAmount: 0,
      description: 'Net payment received (108.25 - 3.14 fee)'
    },
    {
      accountCode: '5403',
      accountName: 'CC Processing Fees',
      accountType: 'Expense',
      debitAmount: 3.14,
      creditAmount: 0,
      description: 'Stripe processing fee'
    },
    {
      accountCode: '4001',
      accountName: 'Sales Revenue',
      accountType: 'Revenue',
      debitAmount: 0,
      creditAmount: 100.00,
      description: 'Product sale revenue'
    },
    {
      accountCode: '2301',
      accountName: 'Sales Tax Payable',
      accountType: 'Liability',
      debitAmount: 0,
      creditAmount: 8.25,
      description: 'Sales tax collected'
    }
  ];

  const journalEntry: JournalEntry = {
    id: 'je_stripe_001',
    date: '2024-12-31',
    description: 'Stripe payment received - Order ORD-2024-001',
    reference: 'ch_1234567890',
    entries: accountMappings,
    isBalanced: true,
    totalDebits: 108.25,
    totalCredits: 108.25
  };

  const entryBookLines: EntryBookLine[] = [
    { accountCode: '1003', accountName: '1003 Cash-CC', debit: 105.11, credit: null },
    { accountCode: '5403', accountName: '5403 CC Fees', debit: 3.14, credit: null },
    { accountCode: '4001', accountName: '4001 Revenue', debit: null, credit: 100.00 },
    { accountCode: '2301', accountName: '2301 Sales Tax', debit: null, credit: 8.25 }
  ];

  const entryBook: EntryBookOutput = {
    lines: entryBookLines,
    totalDebits: 108.25,
    totalCredits: 108.25,
    isBalanced: true,
    formattedOutput: formatEntryBook(entryBookLines, 108.25, 108.25)
  };

  return {
    source: 'stripe',
    name: 'Stripe Credit Card Payment',
    description: 'A typical Stripe credit card charge with processing fees and sales tax',
    rawInput,
    fieldMappings,
    standardTransaction,
    accountMappings,
    journalEntry,
    entryBook
  };
}

// ============================================================================
// SHOPIFY ORDER SAMPLE
// ============================================================================

export function getShopifySample(): SampleData {
  const rawInput = {
    id: 5678901234,
    order_number: 1025,
    name: '#1025',
    email: 'jane.smith@email.com',
    created_at: '2024-12-31T10:30:00-05:00',
    updated_at: '2024-12-31T10:35:00-05:00',
    financial_status: 'paid',
    fulfillment_status: 'fulfilled',
    currency: 'USD',
    total_price: '275.94',
    subtotal_price: '239.97',
    total_tax: '20.22',
    total_discounts: '0.00',
    total_shipping_price_set: {
      shop_money: {
        amount: '15.75',
        currency_code: 'USD'
      }
    },
    customer: {
      id: 789456123,
      email: 'jane.smith@email.com',
      first_name: 'Jane',
      last_name: 'Smith',
      phone: '+1-555-123-4567'
    },
    billing_address: {
      first_name: 'Jane',
      last_name: 'Smith',
      address1: '123 Main Street',
      city: 'Miami',
      province: 'Florida',
      country: 'United States',
      zip: '33101'
    },
    shipping_address: {
      first_name: 'Jane',
      last_name: 'Smith',
      address1: '123 Main Street',
      city: 'Miami',
      province: 'Florida',
      country: 'United States',
      zip: '33101'
    },
    line_items: [
      {
        id: 111222333,
        title: 'Premium Widget',
        variant_title: 'Large / Blue',
        quantity: 2,
        price: '79.99',
        sku: 'WIDGET-LG-BLU',
        product_id: 444555666,
        taxable: true,
        tax_lines: [
          { title: 'FL State Tax', price: '11.20', rate: 0.07 },
          { title: 'Miami-Dade County', price: '1.60', rate: 0.01 }
        ]
      },
      {
        id: 222333444,
        title: 'Basic Gadget',
        variant_title: 'Standard',
        quantity: 1,
        price: '79.99',
        sku: 'GADGET-STD',
        product_id: 555666777,
        taxable: true,
        tax_lines: [
          { title: 'FL State Tax', price: '5.60', rate: 0.07 },
          { title: 'Miami-Dade County', price: '0.80', rate: 0.01 }
        ]
      }
    ],
    shipping_lines: [
      {
        id: 333444555,
        title: 'Standard Shipping',
        price: '15.75',
        code: 'standard',
        carrier_identifier: 'usps',
        tax_lines: [
          { title: 'Shipping Tax', price: '1.02', rate: 0.065 }
        ]
      }
    ],
    tax_lines: [
      { title: 'FL State Tax', price: '16.80', rate: 0.07 },
      { title: 'Miami-Dade County', price: '2.40', rate: 0.01 },
      { title: 'Shipping Tax', price: '1.02', rate: 0.065 }
    ],
    payment_gateway_names: ['shopify_payments'],
    processing_method: 'direct',
    source_name: 'web',
    tags: 'VIP, Repeat Customer',
    note: 'Please gift wrap',
    gateway: 'shopify_payments',
    confirmed: true
  };

  const fieldMappings: FieldMapping[] = [
    { sourceField: 'id', targetField: 'sourceId', value: '5678901234', confidence: 1.0, transformationType: 'direct' },
    { sourceField: 'name', targetField: 'orderNumber', value: '#1025', confidence: 1.0, transformationType: 'direct' },
    { sourceField: 'total_price', targetField: 'amount', value: 275.94, confidence: 1.0, transformationType: 'parsed' },
    { sourceField: 'currency', targetField: 'currency', value: 'USD', confidence: 1.0, transformationType: 'direct' },
    { sourceField: 'created_at', targetField: 'date', value: '2024-12-31', confidence: 1.0, transformationType: 'parsed' },
    { sourceField: 'customer.first_name + customer.last_name', targetField: 'customer.name', value: 'Jane Smith', confidence: 0.98, transformationType: 'calculated' },
    { sourceField: 'customer.email', targetField: 'customer.email', value: 'jane.smith@email.com', confidence: 1.0, transformationType: 'direct' },
    { sourceField: 'subtotal_price', targetField: 'subtotal', value: 239.97, confidence: 1.0, transformationType: 'parsed' },
    { sourceField: 'total_tax', targetField: 'totalTax', value: 20.22, confidence: 1.0, transformationType: 'parsed' },
    { sourceField: 'total_shipping_price_set.shop_money.amount', targetField: 'shipping.amount', value: 15.75, confidence: 0.95, transformationType: 'parsed' },
    { sourceField: 'shipping_lines[0].title', targetField: 'shipping.method', value: 'Standard Shipping', confidence: 0.9, transformationType: 'direct' },
    { sourceField: 'financial_status', targetField: 'status', value: 'completed', confidence: 1.0, transformationType: 'lookup' },
    { sourceField: 'payment_gateway_names[0]', targetField: 'paymentMethod', value: 'shopify_payments', confidence: 0.95, transformationType: 'direct' },
    { sourceField: 'line_items', targetField: 'lineItems', value: 2, confidence: 1.0, transformationType: 'calculated' }
  ];

  const standardTransaction: StandardTransaction = {
    id: 'txn_shopify_5678901234',
    source: 'shopify',
    sourceId: '5678901234',
    date: '2024-12-31',
    description: 'Shopify Order #1025',
    customer: {
      name: 'Jane Smith',
      email: 'jane.smith@email.com',
      id: '789456123'
    },
    amount: 275.94,
    currency: 'USD',
    lineItems: [
      {
        description: 'Premium Widget - Large / Blue',
        quantity: 2,
        unitPrice: 79.99,
        totalPrice: 159.98,
        accountCode: '4001'
      },
      {
        description: 'Basic Gadget - Standard',
        quantity: 1,
        unitPrice: 79.99,
        totalPrice: 79.99,
        accountCode: '4001'
      }
    ],
    taxes: [
      { name: 'FL State Tax', rate: 0.07, amount: 16.80, accountCode: '2301' },
      { name: 'Miami-Dade County', rate: 0.01, amount: 2.40, accountCode: '2301' },
      { name: 'Shipping Tax', rate: 0.065, amount: 1.02, accountCode: '2301' }
    ],
    fees: [
      { name: 'Shopify Processing Fee', amount: 8.01, accountCode: '5403' } // ~2.9% of total
    ],
    shipping: {
      method: 'Standard Shipping',
      carrier: 'USPS',
      amount: 15.75,
      accountCode: '4201'
    },
    paymentMethod: 'shopify_payments',
    status: 'completed',
    metadata: {
      order_number: '#1025',
      fulfillment_status: 'fulfilled',
      tags: ['VIP', 'Repeat Customer'],
      note: 'Please gift wrap'
    }
  };

  const accountMappings: AccountMapping[] = [
    {
      accountCode: '1003',
      accountName: 'Cash - Credit Card',
      accountType: 'Asset',
      debitAmount: 267.93,
      creditAmount: 0,
      description: 'Net payment received (275.94 - 8.01 processing fee)'
    },
    {
      accountCode: '5403',
      accountName: 'CC Processing Fees',
      accountType: 'Expense',
      debitAmount: 8.01,
      creditAmount: 0,
      description: 'Shopify Payments processing fee'
    },
    {
      accountCode: '4001',
      accountName: 'Sales Revenue - Products',
      accountType: 'Revenue',
      debitAmount: 0,
      creditAmount: 239.97,
      description: 'Product sales (Premium Widget x2, Basic Gadget x1)'
    },
    {
      accountCode: '4201',
      accountName: 'Transport Service Revenue',
      accountType: 'Revenue',
      debitAmount: 0,
      creditAmount: 15.75,
      description: 'Standard Shipping charge'
    },
    {
      accountCode: '2301',
      accountName: 'Sales Tax Payable',
      accountType: 'Liability',
      debitAmount: 0,
      creditAmount: 20.22,
      description: 'Sales tax collected (FL State + Miami-Dade + Shipping)'
    }
  ];

  const journalEntry: JournalEntry = {
    id: 'je_shopify_001',
    date: '2024-12-31',
    description: 'Shopify Order #1025 - Jane Smith',
    reference: '5678901234',
    entries: accountMappings,
    isBalanced: true,
    totalDebits: 275.94,
    totalCredits: 275.94
  };

  const entryBookLines: EntryBookLine[] = [
    { accountCode: '1003', accountName: '1003 Cash-CC', debit: 267.93, credit: null },
    { accountCode: '5403', accountName: '5403 CC Fees', debit: 8.01, credit: null },
    { accountCode: '4001', accountName: '4001 Product Rev', debit: null, credit: 239.97 },
    { accountCode: '4201', accountName: '4201 Shipping Rev', debit: null, credit: 15.75 },
    { accountCode: '2301', accountName: '2301 Sales Tax', debit: null, credit: 20.22 }
  ];

  const entryBook: EntryBookOutput = {
    lines: entryBookLines,
    totalDebits: 275.94,
    totalCredits: 275.94,
    isBalanced: true,
    formattedOutput: formatEntryBook(entryBookLines, 275.94, 275.94)
  };

  return {
    source: 'shopify',
    name: 'Shopify E-commerce Order',
    description: 'A typical Shopify order with multiple line items, shipping, and multi-jurisdictional taxes',
    rawInput,
    fieldMappings,
    standardTransaction,
    accountMappings,
    journalEntry,
    entryBook
  };
}

// ============================================================================
// YABAEXPRESS SHIPMENT SAMPLE
// ============================================================================

export function getYabaExpressSample(): SampleData {
  const rawInput = {
    shipment_id: 'YABA-2024-78945',
    tracking_number: 'YX789456123US',
    created_date: '2024-12-31T14:00:00Z',
    status: 'delivered',
    origin: {
      country: 'USA',
      city: 'Miami',
      state: 'FL',
      postal_code: '33166',
      warehouse_id: 'MIA-01'
    },
    destination: {
      country: 'Cuba',
      city: 'Havana',
      province: 'La Habana',
      address: 'Calle 23 #456, Vedado'
    },
    sender: {
      id: 'SND-456789',
      name: 'Carlos Martinez',
      phone: '+1-786-555-0123',
      email: 'carlos.martinez@email.com'
    },
    recipient: {
      name: 'Maria Garcia',
      phone: '+53-5-555-1234',
      ci: '85062512345'
    },
    package: {
      weight_lbs: 45.5,
      dimensions: {
        length_in: 24,
        width_in: 18,
        height_in: 16
      },
      volumetric_weight_lbs: 41.47,
      chargeable_weight_lbs: 45.5,
      package_type: 'box',
      contents: 'Household items, electronics, clothing'
    },
    charges: {
      freight_per_lb: 4.50,
      freight_total: 204.75,
      customs_fee: 35.00,
      handling_fee: 15.00,
      insurance: 25.00,
      fuel_surcharge: 18.50,
      subtotal: 298.25,
      discount: 0,
      tax: 0,
      total: 298.25
    },
    payment: {
      method: 'zelle',
      status: 'paid',
      paid_at: '2024-12-31T14:15:00Z',
      reference: 'ZEL-2024-789456'
    },
    customs: {
      declaration_number: 'CU-DEC-2024-123456',
      declared_value: 850.00,
      currency: 'USD',
      category: 'personal_effects',
      items: [
        { description: 'Laptop Computer', quantity: 1, value: 500.00 },
        { description: 'Clothing', quantity: 10, value: 200.00 },
        { description: 'Kitchen Appliances', quantity: 3, value: 150.00 }
      ]
    },
    timeline: {
      created: '2024-12-31T14:00:00Z',
      paid: '2024-12-31T14:15:00Z',
      received_warehouse: '2024-12-31T16:00:00Z',
      shipped: '2025-01-02T08:00:00Z',
      in_transit: '2025-01-02T10:00:00Z',
      customs_cleared: '2025-01-03T12:00:00Z',
      out_for_delivery: '2025-01-04T08:00:00Z',
      delivered: '2025-01-04T14:30:00Z'
    }
  };

  const fieldMappings: FieldMapping[] = [
    { sourceField: 'shipment_id', targetField: 'sourceId', value: 'YABA-2024-78945', confidence: 1.0, transformationType: 'direct' },
    { sourceField: 'tracking_number', targetField: 'trackingNumber', value: 'YX789456123US', confidence: 1.0, transformationType: 'direct' },
    { sourceField: 'created_date', targetField: 'date', value: '2024-12-31', confidence: 1.0, transformationType: 'parsed' },
    { sourceField: 'sender.name', targetField: 'customer.name', value: 'Carlos Martinez', confidence: 1.0, transformationType: 'direct' },
    { sourceField: 'sender.email', targetField: 'customer.email', value: 'carlos.martinez@email.com', confidence: 0.95, transformationType: 'direct' },
    { sourceField: 'charges.total', targetField: 'amount', value: 298.25, confidence: 1.0, transformationType: 'direct' },
    { sourceField: 'charges.freight_total', targetField: 'lineItems.freight', value: 204.75, confidence: 1.0, transformationType: 'direct' },
    { sourceField: 'charges.customs_fee', targetField: 'fees.customs', value: 35.00, confidence: 1.0, transformationType: 'direct' },
    { sourceField: 'charges.handling_fee', targetField: 'fees.handling', value: 15.00, confidence: 0.95, transformationType: 'direct' },
    { sourceField: 'charges.insurance', targetField: 'fees.insurance', value: 25.00, confidence: 1.0, transformationType: 'direct' },
    { sourceField: 'charges.fuel_surcharge', targetField: 'fees.fuelSurcharge', value: 18.50, confidence: 1.0, transformationType: 'direct' },
    { sourceField: 'payment.method', targetField: 'paymentMethod', value: 'zelle', confidence: 1.0, transformationType: 'direct' },
    { sourceField: 'status', targetField: 'status', value: 'completed', confidence: 1.0, transformationType: 'lookup' },
    { sourceField: 'package.chargeable_weight_lbs', targetField: 'weight', value: 45.5, confidence: 1.0, transformationType: 'direct' },
    { sourceField: 'destination.country', targetField: 'destination', value: 'Cuba', confidence: 0.9, transformationType: 'direct' }
  ];

  const standardTransaction: StandardTransaction = {
    id: 'txn_yaba_78945',
    source: 'yabaexpress',
    sourceId: 'YABA-2024-78945',
    date: '2024-12-31',
    description: 'YabaExpress Shipment to Cuba - 45.5 lbs',
    customer: {
      name: 'Carlos Martinez',
      email: 'carlos.martinez@email.com',
      id: 'SND-456789'
    },
    amount: 298.25,
    currency: 'USD',
    lineItems: [
      {
        description: 'Freight Service (45.5 lbs @ $4.50/lb)',
        quantity: 45.5,
        unitPrice: 4.50,
        totalPrice: 204.75,
        accountCode: '4202'
      },
      {
        description: 'Handling Service',
        quantity: 1,
        unitPrice: 15.00,
        totalPrice: 15.00,
        accountCode: '4301'
      },
      {
        description: 'Fuel Surcharge',
        quantity: 1,
        unitPrice: 18.50,
        totalPrice: 18.50,
        accountCode: '4202'
      }
    ],
    taxes: [],
    fees: [
      { name: 'Customs Fee (Pass-through)', amount: 35.00, accountCode: '1401' },
      { name: 'Transit Insurance', amount: 25.00, accountCode: '1402' }
    ],
    shipping: {
      method: 'Air Freight',
      carrier: 'YabaExpress',
      trackingNumber: 'YX789456123US',
      amount: 204.75,
      accountCode: '4202'
    },
    paymentMethod: 'zelle',
    status: 'completed',
    metadata: {
      tracking_number: 'YX789456123US',
      weight_lbs: 45.5,
      destination: 'Havana, Cuba',
      recipient: 'Maria Garcia',
      declared_value: 850.00,
      customs_declaration: 'CU-DEC-2024-123456'
    }
  };

  const accountMappings: AccountMapping[] = [
    {
      accountCode: '1002',
      accountName: 'Cash - Zelle Account',
      accountType: 'Asset',
      debitAmount: 298.25,
      creditAmount: 0,
      description: 'Zelle payment received for shipment'
    },
    {
      accountCode: '4202',
      accountName: 'Freight Revenue - Air',
      accountType: 'Revenue',
      debitAmount: 0,
      creditAmount: 223.25,
      description: 'Air freight service (204.75 + 18.50 fuel surcharge)'
    },
    {
      accountCode: '4301',
      accountName: 'Processing Revenue - Handling',
      accountType: 'Revenue',
      debitAmount: 0,
      creditAmount: 15.00,
      description: 'Package handling service'
    },
    {
      accountCode: '1401',
      accountName: 'Customs Fees Receivable',
      accountType: 'Asset',
      debitAmount: 35.00,
      creditAmount: 0,
      description: 'Customs fee collected (pass-through to authorities)'
    },
    {
      accountCode: '2302',
      accountName: 'Customs Fees Payable',
      accountType: 'Liability',
      debitAmount: 0,
      creditAmount: 35.00,
      description: 'Customs fee to be remitted to authorities'
    },
    {
      accountCode: '1402',
      accountName: 'Transit Insurance Receivable',
      accountType: 'Asset',
      debitAmount: 25.00,
      creditAmount: 0,
      description: 'Insurance premium collected (pass-through)'
    },
    {
      accountCode: '2303',
      accountName: 'Transit Insurance Payable',
      accountType: 'Liability',
      debitAmount: 0,
      creditAmount: 25.00,
      description: 'Insurance premium to be paid to insurer'
    }
  ];

  const journalEntry: JournalEntry = {
    id: 'je_yaba_001',
    date: '2024-12-31',
    description: 'YabaExpress Shipment YABA-2024-78945 - Carlos Martinez to Cuba',
    reference: 'YABA-2024-78945',
    entries: accountMappings,
    isBalanced: true,
    totalDebits: 358.25,
    totalCredits: 358.25
  };

  const entryBookLines: EntryBookLine[] = [
    { accountCode: '1002', accountName: '1002 Cash-Zelle', debit: 298.25, credit: null },
    { accountCode: '1401', accountName: '1401 Customs Recv', debit: 35.00, credit: null },
    { accountCode: '1402', accountName: '1402 Insurance Recv', debit: 25.00, credit: null },
    { accountCode: '4202', accountName: '4202 Air Freight', debit: null, credit: 223.25 },
    { accountCode: '4301', accountName: '4301 Handling Rev', debit: null, credit: 15.00 },
    { accountCode: '2302', accountName: '2302 Customs Pay', debit: null, credit: 35.00 },
    { accountCode: '2303', accountName: '2303 Insurance Pay', debit: null, credit: 25.00 }
  ];

  const entryBook: EntryBookOutput = {
    lines: entryBookLines,
    totalDebits: 358.25,
    totalCredits: 358.25,
    isBalanced: true,
    formattedOutput: formatEntryBook(entryBookLines, 358.25, 358.25)
  };

  return {
    source: 'yabaexpress',
    name: 'YabaExpress International Shipment',
    description: 'A freight/customs shipment with pass-through fees for customs and insurance',
    rawInput,
    fieldMappings,
    standardTransaction,
    accountMappings,
    journalEntry,
    entryBook
  };
}

// ============================================================================
// MANUAL ENTRY SAMPLE
// ============================================================================

export function getManualSample(): SampleData {
  const rawInput = {
    entry_type: 'cash_sale',
    date: '2024-12-31',
    description: 'Walk-in customer cash payment',
    customer_name: 'Walk-in Customer',
    amount: 150.00,
    payment_method: 'cash',
    category: 'service',
    notes: 'Passport photo service and document processing',
    items: [
      { description: 'Passport Photos (4 pack)', quantity: 2, price: 25.00 },
      { description: 'Document Processing Fee', quantity: 1, price: 50.00 },
      { description: 'Express Service', quantity: 1, price: 50.00 }
    ],
    received_by: 'Employee #123',
    register_id: 'REG-001'
  };

  const fieldMappings: FieldMapping[] = [
    { sourceField: 'entry_type', targetField: 'transactionType', value: 'cash_sale', confidence: 1.0, transformationType: 'direct' },
    { sourceField: 'date', targetField: 'date', value: '2024-12-31', confidence: 1.0, transformationType: 'direct' },
    { sourceField: 'description', targetField: 'description', value: 'Walk-in customer cash payment', confidence: 0.9, transformationType: 'direct' },
    { sourceField: 'customer_name', targetField: 'customer.name', value: 'Walk-in Customer', confidence: 0.8, transformationType: 'direct' },
    { sourceField: 'amount', targetField: 'amount', value: 150.00, confidence: 1.0, transformationType: 'direct' },
    { sourceField: 'payment_method', targetField: 'paymentMethod', value: 'cash', confidence: 1.0, transformationType: 'direct' },
    { sourceField: 'category', targetField: 'category', value: 'service', confidence: 0.85, transformationType: 'direct' },
    { sourceField: 'items', targetField: 'lineItems', value: 3, confidence: 1.0, transformationType: 'calculated' },
    { sourceField: 'notes', targetField: 'metadata.notes', value: 'Passport photo service and document processing', confidence: 0.75, transformationType: 'direct' }
  ];

  const standardTransaction: StandardTransaction = {
    id: 'txn_manual_20241231_001',
    source: 'manual',
    sourceId: 'MANUAL-2024-12-31-001',
    date: '2024-12-31',
    description: 'Walk-in customer cash payment',
    customer: {
      name: 'Walk-in Customer'
    },
    amount: 150.00,
    currency: 'USD',
    lineItems: [
      {
        description: 'Passport Photos (4 pack)',
        quantity: 2,
        unitPrice: 25.00,
        totalPrice: 50.00,
        accountCode: '4101'
      },
      {
        description: 'Document Processing Fee',
        quantity: 1,
        unitPrice: 50.00,
        totalPrice: 50.00,
        accountCode: '4101'
      },
      {
        description: 'Express Service',
        quantity: 1,
        unitPrice: 50.00,
        totalPrice: 50.00,
        accountCode: '4101'
      }
    ],
    taxes: [],
    fees: [],
    paymentMethod: 'cash',
    status: 'completed',
    metadata: {
      notes: 'Passport photo service and document processing',
      received_by: 'Employee #123',
      register_id: 'REG-001',
      category: 'service'
    }
  };

  const accountMappings: AccountMapping[] = [
    {
      accountCode: '1001',
      accountName: 'Cash - Operating Account',
      accountType: 'Asset',
      debitAmount: 150.00,
      creditAmount: 0,
      description: 'Cash received from walk-in customer'
    },
    {
      accountCode: '4101',
      accountName: 'Service Revenue - General',
      accountType: 'Revenue',
      debitAmount: 0,
      creditAmount: 150.00,
      description: 'Passport photo and document processing services'
    }
  ];

  const journalEntry: JournalEntry = {
    id: 'je_manual_001',
    date: '2024-12-31',
    description: 'Cash sale - Passport and document services',
    reference: 'MANUAL-2024-12-31-001',
    entries: accountMappings,
    isBalanced: true,
    totalDebits: 150.00,
    totalCredits: 150.00
  };

  const entryBookLines: EntryBookLine[] = [
    { accountCode: '1001', accountName: '1001 Cash-Operating', debit: 150.00, credit: null },
    { accountCode: '4101', accountName: '4101 Service Rev', debit: null, credit: 150.00 }
  ];

  const entryBook: EntryBookOutput = {
    lines: entryBookLines,
    totalDebits: 150.00,
    totalCredits: 150.00,
    isBalanced: true,
    formattedOutput: formatEntryBook(entryBookLines, 150.00, 150.00)
  };

  return {
    source: 'manual',
    name: 'Manual Cash Entry',
    description: 'A simple walk-in customer cash payment for services',
    rawInput,
    fieldMappings,
    standardTransaction,
    accountMappings,
    journalEntry,
    entryBook
  };
}

// ============================================================================
// GET ALL SAMPLES
// ============================================================================

export function getAllSamples(): SampleData[] {
  return [
    getStripeSample(),
    getShopifySample(),
    getYabaExpressSample(),
    getManualSample()
  ];
}

// ============================================================================
// UTILITY FUNCTIONS FOR VISUALIZATION
// ============================================================================

/**
 * Get a sample by source type
 */
export function getSampleBySource(source: DataSource): SampleData {
  switch (source) {
    case 'stripe':
      return getStripeSample();
    case 'shopify':
      return getShopifySample();
    case 'yabaexpress':
      return getYabaExpressSample();
    case 'manual':
      return getManualSample();
    default:
      throw new Error(`Unknown data source: ${source}`);
  }
}

/**
 * Get formatted entry book output as a string
 */
export function getFormattedEntryBook(source: DataSource): string {
  const sample = getSampleBySource(source);
  return sample.entryBook.formattedOutput;
}

/**
 * Validate that a journal entry is balanced
 */
export function validateJournalBalance(journalEntry: JournalEntry): boolean {
  const totalDebits = journalEntry.entries.reduce((sum, e) => sum + e.debitAmount, 0);
  const totalCredits = journalEntry.entries.reduce((sum, e) => sum + e.creditAmount, 0);
  return Math.abs(totalDebits - totalCredits) < 0.01;
}

/**
 * Get confidence summary for field mappings
 */
export function getConfidenceSummary(fieldMappings: FieldMapping[]): {
  average: number;
  high: number;
  medium: number;
  low: number;
} {
  const high = fieldMappings.filter(m => m.confidence >= 0.9).length;
  const medium = fieldMappings.filter(m => m.confidence >= 0.7 && m.confidence < 0.9).length;
  const low = fieldMappings.filter(m => m.confidence < 0.7).length;
  const average = fieldMappings.reduce((sum, m) => sum + m.confidence, 0) / fieldMappings.length;

  return { average, high, medium, low };
}

/**
 * Print all sample entry books to console (for debugging)
 */
export function printAllEntryBooks(): void {
  const samples = getAllSamples();
  samples.forEach(sample => {
    devLog(`\n${'='.repeat(50)}`);
    devLog(`${sample.name} (${sample.source.toUpperCase()})`);
    devLog(`${'='.repeat(50)}`);
    devLog(sample.entryBook.formattedOutput);
  });
}

// ============================================================================
// SAMPLE FLOW STAGES (for visualization)
// ============================================================================

export interface FlowStage {
  name: string;
  description: string;
  inputType: string;
  outputType: string;
  dataSnapshot: unknown;
}

/**
 * Get the complete flow stages for a sample
 */
export function getFlowStages(source: DataSource): FlowStage[] {
  const sample = getSampleBySource(source);

  return [
    {
      name: 'Raw Input',
      description: `Raw ${source} payload received from external system`,
      inputType: 'External API Response',
      outputType: 'JSON Object',
      dataSnapshot: sample.rawInput
    },
    {
      name: 'Field Mapping',
      description: 'AI-powered field detection and mapping with confidence scores',
      inputType: 'JSON Object',
      outputType: 'FieldMapping[]',
      dataSnapshot: sample.fieldMappings
    },
    {
      name: 'Standard Transaction',
      description: 'Normalized transaction format used internally',
      inputType: 'FieldMapping[]',
      outputType: 'StandardTransaction',
      dataSnapshot: sample.standardTransaction
    },
    {
      name: 'Account Mapping',
      description: 'Chart of accounts assignment based on transaction type',
      inputType: 'StandardTransaction',
      outputType: 'AccountMapping[]',
      dataSnapshot: sample.accountMappings
    },
    {
      name: 'Journal Entry',
      description: 'Double-entry bookkeeping journal entry',
      inputType: 'AccountMapping[]',
      outputType: 'JournalEntry',
      dataSnapshot: sample.journalEntry
    },
    {
      name: 'Entry Book',
      description: 'Final balanced entry book with debits and credits',
      inputType: 'JournalEntry',
      outputType: 'EntryBookOutput',
      dataSnapshot: sample.entryBook
    }
  ];
}
