/**
 * useInvoiceFieldExtractor Hook
 * Fetches data based on event type and extracts a comprehensive field schema
 * by comparing all records to find every possible field
 *
 * Supports:
 * - Invoice events: fetches invoice data
 * - Inventory events: fetches inventory movement data
 */

import { createSignal, createResource } from 'solid-js';
import { inventoryApi, movementsApi } from '../../../services/apiAdapter';
import { authStore } from '../../../stores/authStore';

// Event type categorization
const INVENTORY_EVENT_TYPES = ['inventory_received', 'inventory_sold', 'inventory_adjusted'];
const INVOICE_EVENT_TYPES = ['invoice_created', 'invoice_updated', 'invoice_completed', 'invoice_cancelled'];
const EXPENSE_EVENT_TYPES = ['expense_created', 'expense_approved', 'expense_paid'];
const SERVICE_EVENT_TYPES = ['service_rendered', 'freight_processed', 'customs_cleared'];
const PAYMENT_EVENT_TYPES = ['payment_received', 'payment_refunded'];

export interface ExtractedField {
  path: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  description: string;
  example: any;
  occurrences: number;
  totalInvoices: number;
  coverage: number; // percentage of invoices that have this field
  isNested: boolean;
  parentPath?: string;
  children?: ExtractedField[];
}

export interface FieldCategory {
  name: string;
  icon: string;
  fields: ExtractedField[];
}

export interface InvoiceSchema {
  fields: ExtractedField[];
  categories: FieldCategory[];
  totalInvoices: number;
  extractedAt: Date;
  sampleInvoices: any[];
}

// Helper to detect field type
const detectType = (value: any): ExtractedField['type'] => {
  if (value === null || value === undefined) return 'string';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'object';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string') {
    // Check if it's a date string
    if (/^\d{4}-\d{2}-\d{2}/.test(value) || !isNaN(Date.parse(value))) {
      return 'date';
    }
    return 'string';
  }
  return 'string';
};

// Helper to generate description based on field name and data source
const generateDescription = (path: string, type: string, dataSource: 'invoice' | 'inventory' | 'expense' | 'service' | 'payment' = 'invoice'): string => {
  const fieldName = path.split('.').pop() || path;

  // Common descriptions across all data types
  const commonDescriptions: Record<string, string> = {
    id: 'Unique identifier',
    businessId: 'Business identifier',
    userId: 'User identifier',
    createDate: 'Creation timestamp',
    createdDate: 'Creation timestamp',
    updatedDate: 'Last update timestamp',
    description: 'Description',
    notes: 'Additional notes',
    reference: 'Reference number',
    category: 'Category classification',
    total: 'Total amount',
    name: 'Name',
  };

  // Invoice-specific descriptions
  const invoiceDescriptions: Record<string, string> = {
    invoice: 'Invoice number/identifier',
    type: 'Invoice type (SALES, INTERNATIONAL_SHIPPING)',
    store: 'Store identifier',
    isCompleted: 'Whether invoice is completed',
    subtotal: 'Subtotal before tax',
    taxAmount: 'Tax amount',
    taxPercent: 'Tax percentage',
    cash: 'Cash payment amount',
    zelle: 'Zelle payment amount',
    creditCard: 'Credit card payment amount',
    qty: 'Quantity',
    price: 'Unit price',
    salePrice: 'Sale price',
    weight: 'Weight in pounds',
    arancel: 'Tariff/duty amount',
    firstName: 'First name',
    lastName: 'Last name',
    email: 'Email address',
    phoneNumber: 'Phone number',
    address: 'Address',
    shippingMethod: 'Shipping method (aereo/maritimo)',
    packagesOrder: 'Package order flag',
    code: 'Product code',
    label: 'Display label',
  };

  // Inventory movement-specific descriptions
  const inventoryDescriptions: Record<string, string> = {
    // Core movement fields
    referenceNumber: 'Movement reference number',
    document: 'Document/reference number',
    movementType: 'Movement type (in/out/adjustment/transfer)',
    type: 'Movement type filter',

    // Location fields
    locationId: 'Warehouse/location identifier',
    fromLocationId: 'Source location (for transfers)',
    store: 'Store/location identifier',

    // Items and products
    items: 'List of items in movement',
    products: 'List of products in movement',

    // Notes and description
    generalNotes: 'General notes for movement',

    // Reference to invoice
    invoice: 'Related invoice reference',

    // Entity (Provider/Customer) info
    entityId: 'Provider/Customer identifier',
    entityName: 'Provider/Customer name',
    entityType: 'Entity type (provider/customer)',

    // System fields
    createdBy: 'User who created the movement',

    // Item-level fields (inside items array)
    productId: 'Product identifier',
    productName: 'Product name',
    productCode: 'Product code/SKU',
    sku: 'Stock keeping unit',
    quantity: 'Quantity moved',
    qty: 'Quantity',
    unitCost: 'Cost per unit',
    totalCost: 'Total cost of movement',
    unitPrice: 'Price per unit',
    totalPrice: 'Total price',
    price: 'Price',
    cost: 'Cost',

    // Additional tracking
    batchNumber: 'Batch/lot number',
    expirationDate: 'Expiration date',
    serialNumber: 'Serial number',
    reason: 'Movement reason',
    adjustmentReason: 'Reason for adjustment',
  };

  // Select appropriate descriptions based on data source
  const descriptions = dataSource === 'inventory'
    ? { ...commonDescriptions, ...inventoryDescriptions }
    : { ...commonDescriptions, ...invoiceDescriptions };

  return descriptions[fieldName] || `${fieldName} (${type})`;
};

// Recursively extract all fields from an object
// Enhanced to analyze ALL array items and merge their fields for complete schema
const extractFieldsFromObject = (
  obj: any,
  basePath: string = 'data',
  fieldMap: Map<string, { type: string; examples: any[]; count: number }>,
  depth: number = 0,
  processAllArrayItems: boolean = true
): void => {
  if (depth > 10 || !obj || typeof obj !== 'object') return;

  for (const [key, value] of Object.entries(obj)) {
    const fieldPath = `${basePath}.${key}`;
    const type = detectType(value);

    if (!fieldMap.has(fieldPath)) {
      fieldMap.set(fieldPath, { type, examples: [], count: 0 });
    }

    const fieldInfo = fieldMap.get(fieldPath)!;
    fieldInfo.count++;

    // Store example values (max 5 for better variety)
    if (fieldInfo.examples.length < 5 && value !== null && value !== undefined) {
      const exampleValue = type === 'object' || type === 'array'
        ? JSON.stringify(value).slice(0, 100) + (JSON.stringify(value).length > 100 ? '...' : '')
        : value;
      if (!fieldInfo.examples.includes(exampleValue)) {
        fieldInfo.examples.push(exampleValue);
      }
    }

    // Recursively handle nested objects
    if (type === 'object' && value) {
      extractFieldsFromObject(value, fieldPath, fieldMap, depth + 1, processAllArrayItems);
    }

    // Handle arrays - extract fields from ALL items to build complete schema
    if (type === 'array' && Array.isArray(value) && value.length > 0) {
      // Add array access pattern
      if (!fieldMap.has(`${fieldPath}[0]`)) {
        fieldMap.set(`${fieldPath}[0]`, { type: 'object', examples: [], count: 0 });
      }
      fieldMap.get(`${fieldPath}[0]`)!.count++;

      // Process ALL array items to capture every possible field
      // This ensures we get the complete schema even if fields are sparse
      const itemsToProcess = processAllArrayItems ? value : value.slice(0, 5);

      itemsToProcess.forEach((item) => {
        if (item && typeof item === 'object') {
          extractFieldsFromObject(item, `${fieldPath}[0]`, fieldMap, depth + 1, processAllArrayItems);
        }
      });
    }
  }
};

// Merge schemas from multiple records to create the most complete field set
const mergeFieldSchemas = (
  records: any[],
  fieldMap: Map<string, { type: string; examples: any[]; count: number }>
): void => {
  console.log(`[FieldExtractor] Merging schemas from ${records.length} records...`);

  records.forEach((record, index) => {
    extractFieldsFromObject(record, 'data', fieldMap, 0, true);

    // Log progress for large datasets
    if ((index + 1) % 100 === 0) {
      console.log(`[FieldExtractor] Processed ${index + 1}/${records.length} records, found ${fieldMap.size} unique fields`);
    }
  });

  console.log(`[FieldExtractor] Complete! Found ${fieldMap.size} total unique fields`);
};

// Categorize fields for invoices
const categorizeInvoiceFields = (fields: ExtractedField[]): FieldCategory[] => {
  const categories: FieldCategory[] = [
    { name: 'Basic Info', icon: '📋', fields: [] },
    { name: 'Customer', icon: '👤', fields: [] },
    { name: 'Products', icon: '📦', fields: [] },
    { name: 'Reservas', icon: '🏷️', fields: [] },
    { name: 'Services', icon: '🔧', fields: [] },
    { name: 'Payments', icon: '💳', fields: [] },
    { name: 'Shipping', icon: '🚚', fields: [] },
    { name: 'Amounts', icon: '💰', fields: [] },
    { name: 'System', icon: '⚙️', fields: [] },
  ];

  fields.forEach(field => {
    const path = field.path.toLowerCase();

    if (path.includes('shipper_consignee') || path.includes('customer')) {
      categories[1].fields.push(field);
    } else if (path.includes('products')) {
      categories[2].fields.push(field);
    } else if (path.includes('reservas')) {
      categories[3].fields.push(field);
    } else if (path.includes('services')) {
      categories[4].fields.push(field);
    } else if (path.includes('payment') || path.includes('cash') || path.includes('zelle') || path.includes('credit')) {
      categories[5].fields.push(field);
    } else if (path.includes('shipping') || path.includes('bulk') || path.includes('transport')) {
      categories[6].fields.push(field);
    } else if (path.includes('total') || path.includes('subtotal') || path.includes('amount') || path.includes('price') || path.includes('tax')) {
      categories[7].fields.push(field);
    } else if (path.includes('id') || path.includes('key') || path.includes('business') || path.includes('user')) {
      categories[8].fields.push(field);
    } else {
      categories[0].fields.push(field);
    }
  });

  return categories.filter(c => c.fields.length > 0);
};

// Categorize fields for inventory movements
const categorizeInventoryFields = (fields: ExtractedField[]): FieldCategory[] => {
  const categories: FieldCategory[] = [
    { name: 'Movement Info', icon: '📋', fields: [] },
    { name: 'Items/Products', icon: '📦', fields: [] },
    { name: 'Location', icon: '📍', fields: [] },
    { name: 'Entity', icon: '👤', fields: [] },
    { name: 'Amounts', icon: '💰', fields: [] },
    { name: 'Reference', icon: '🔗', fields: [] },
    { name: 'Notes', icon: '📝', fields: [] },
    { name: 'System', icon: '⚙️', fields: [] },
  ];

  fields.forEach(field => {
    const path = field.path.toLowerCase();

    // Items and products (including nested item fields)
    if (path.includes('items') || path.includes('products') || path.includes('product') || path.includes('sku')) {
      categories[1].fields.push(field);
    }
    // Location fields
    else if (path.includes('location') || path.includes('store') || path.includes('warehouse') || path.includes('fromlocation')) {
      categories[2].fields.push(field);
    }
    // Entity (Provider/Customer)
    else if (path.includes('entity') || path.includes('provider') || path.includes('customer') || path.includes('supplier')) {
      categories[3].fields.push(field);
    }
    // Amounts, costs, prices, quantities
    else if (path.includes('cost') || path.includes('price') || path.includes('total') || path.includes('quantity') || path.includes('qty') || path.includes('amount')) {
      categories[4].fields.push(field);
    }
    // Reference fields
    else if (path.includes('reference') || path.includes('document') || path.includes('invoice') || path.includes('batch') || path.includes('serial')) {
      categories[5].fields.push(field);
    }
    // Notes and descriptions
    else if (path.includes('note') || path.includes('description') || path.includes('reason')) {
      categories[6].fields.push(field);
    }
    // System fields
    else if (path.includes('id') || path.includes('business') || path.includes('user') || path.includes('date') || path.includes('created') || path.includes('type')) {
      categories[7].fields.push(field);
    }
    // Default to Movement Info
    else {
      categories[0].fields.push(field);
    }
  });

  return categories.filter(c => c.fields.length > 0);
};

// Main categorization function that selects appropriate categorizer
const categorizeFields = (fields: ExtractedField[], dataSource: 'invoice' | 'inventory' | 'expense' | 'service' | 'payment' = 'invoice'): FieldCategory[] => {
  // Use inventory categories for inventory events, invoice categories for all others
  return dataSource === 'inventory'
    ? categorizeInventoryFields(fields)
    : categorizeInvoiceFields(fields);
};

// Helper to determine data source from event type
const getDataSourceFromEventType = (eventType?: string): 'invoice' | 'inventory' | 'expense' | 'service' | 'payment' => {
  if (!eventType) return 'invoice';
  if (INVENTORY_EVENT_TYPES.includes(eventType)) return 'inventory';
  if (EXPENSE_EVENT_TYPES.includes(eventType)) return 'expense';
  if (SERVICE_EVENT_TYPES.includes(eventType)) return 'service';
  if (PAYMENT_EVENT_TYPES.includes(eventType)) return 'payment';
  return 'invoice';
};

// Main hook
export const useInvoiceFieldExtractor = () => {
  const [isExtracting, setIsExtracting] = createSignal(false);
  const [progress, setProgress] = createSignal(0);
  const [error, setError] = createSignal<string | null>(null);
  const [schema, setSchema] = createSignal<InvoiceSchema | null>(null);
  const [currentEventType, setCurrentEventType] = createSignal<string | undefined>(undefined);

  // extractFields now processes ALL records by default to build complete schema
  // Set limit to a number to process only first N records (for quick testing)
  const extractFields = async (limit?: number, eventType?: string): Promise<InvoiceSchema> => {
    setIsExtracting(true);
    setProgress(0);
    setError(null);
    setCurrentEventType(eventType);

    const dataSource = getDataSourceFromEventType(eventType);

    try {
      setProgress(5);
      const businessId = authStore.getBusinessId();
      let records: any[] = [];

      // Fetch data based on event type
      if (dataSource === 'inventory') {
        // Fetch ALL inventory movements
        console.log('[FieldExtractor] Fetching ALL inventory movements for event type:', eventType);
        const movements = await movementsApi.getAll();
        records = movements || [];
        console.log('[FieldExtractor] Found', records.length, 'inventory movements');
      } else {
        // Fetch ALL invoices
        console.log('[FieldExtractor] Fetching ALL invoices for event type:', eventType);
        const invoices = await inventoryApi.getInvoice(businessId);
        records = invoices || [];
        console.log('[FieldExtractor] Found', records.length, 'invoices');
      }

      if (!records || !Array.isArray(records) || records.length === 0) {
        throw new Error(dataSource === 'inventory' ? 'No inventory movements found' : 'No invoices found');
      }

      // Process ALL records unless limit is specified (for testing)
      // This ensures we capture EVERY possible field from ANY record
      const recordsToProcess = limit ? records.slice(0, limit) : records;
      const totalRecords = recordsToProcess.length;

      console.log(`[FieldExtractor] Processing ${totalRecords} records to build complete schema...`);
      setProgress(10);

      // Extract and merge fields from ALL records
      // This creates the most complete schema by combining fields from every record
      const fieldMap = new Map<string, { type: string; examples: any[]; count: number }>();

      recordsToProcess.forEach((record, index) => {
        // Process each record and ALL its nested array items
        extractFieldsFromObject(record, 'data', fieldMap, 0, true);

        // Update progress
        const progressPercent = 10 + Math.floor((index / totalRecords) * 70);
        if (index % Math.max(1, Math.floor(totalRecords / 20)) === 0) {
          setProgress(progressPercent);
        }
      });

      console.log(`[FieldExtractor] Extracted ${fieldMap.size} unique fields from ${totalRecords} records`);
      setProgress(85);

      // Convert map to ExtractedField array
      const fields: ExtractedField[] = Array.from(fieldMap.entries()).map(([path, info]) => ({
        path,
        type: info.type as ExtractedField['type'],
        description: generateDescription(path, info.type, dataSource),
        example: info.examples[0] || null,
        occurrences: info.count,
        totalInvoices: totalRecords,
        coverage: Math.round((info.count / totalRecords) * 100),
        isNested: path.split('.').length > 2,
        parentPath: path.split('.').slice(0, -1).join('.') || undefined,
      }));

      // Sort by coverage and path
      fields.sort((a, b) => {
        if (b.coverage !== a.coverage) return b.coverage - a.coverage;
        return a.path.localeCompare(b.path);
      });

      setProgress(95);

      // Categorize fields based on data source
      const categories = categorizeFields(fields, dataSource);

      const result: InvoiceSchema = {
        fields,
        categories,
        totalInvoices: totalRecords,
        extractedAt: new Date(),
        sampleInvoices: recordsToProcess.slice(0, 3),
      };

      setSchema(result);
      setProgress(100);

      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to extract fields';
      setError(errorMsg);
      throw err;
    } finally {
      setIsExtracting(false);
    }
  };

  // Get flattened draggable fields
  const getDraggableFields = () => {
    const s = schema();
    if (!s) return [];

    return s.fields.map(field => ({
      ...field,
      draggable: true,
      categoryIcon: s.categories.find(c => c.fields.includes(field))?.icon || '📄',
    }));
  };

  return {
    extractFields,
    isExtracting,
    progress,
    error,
    schema,
    getDraggableFields,
  };
};

export default useInvoiceFieldExtractor;
