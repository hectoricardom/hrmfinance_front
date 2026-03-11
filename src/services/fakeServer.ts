import { Product, Location, InventoryMovement, InventoryStock, BulkMovementRequest } from '../modules/inventory/stores/inventoryStore';
import { JournalEntry, JournalEntryLine } from '../modules/journal/stores/entryBookStore';
import { Account } from '../modules/accounts/stores/accountStore';
import { EventAutomationRule, EventData } from '../modules/events/types/eventTypes';

// Simulated network delay
const delay = (ms: number = 300 + Math.random() * 700) => new Promise(resolve => setTimeout(resolve, ms));

// Generate IDs
const generateId = (prefix: string = '') => `${prefix}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Helper function to get nested value from object
const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

// Helper function to process template strings
const processTemplate = (template: string, data: any): string => {
  return template.replace(/\{([^}]+)\}/g, (match, path) => {
    const value = getNestedValue(data, path);
    return String(value || match);
  });
};

// Helper function to evaluate amount expressions
const evaluateExpression = (expression: string, data: any): number => {
  try {
    // Handle direct numeric values
    if (!isNaN(Number(expression))) {
      return Number(expression);
    }
    
    // Handle data field references
    const value = getNestedValue(data, expression);
    return Number(value) || 0;
  } catch {
    return 0;
  }
};

// Simulated database
let fakeDatabase = {
  products: [
    {
      id: 'prod-001',
      name: 'Wireless Headphones',
      sku: 'WH-001',
      productCode: 'WH-001',
      productName: 'Wireless Headphones',
      description: 'High-quality wireless bluetooth headphones',
      category: 'Electronics',
      unitOfMeasure: 'pcs',
      unitCost: 45.00,
      sellingPrice: 89.99,
      minStockLevel: 10,
      maxStockLevel: 100,
      isActive: true,
      createdDate: '2024-01-15T10:00:00Z',
      lastModified: '2024-01-15T10:00:00Z',
      businessId: 'YB100423253156428'
    },
    {
      id: 'prod-002',
      name: 'USB-C Cable',
      sku: 'USB-001',
      description: '3ft USB-C charging cable',
      category: 'Accessories',
      unitOfMeasure: 'pcs',
      unitCost: 8.50,
      sellingPrice: 19.99,
      minStockLevel: 25,
      maxStockLevel: 200,
      isActive: true,
      createdDate: '2024-01-16T10:00:00Z',
      lastModified: '2024-01-16T10:00:00Z',
      businessId: 'YB100423253156428'
    },
    {
      id: 'prod-003',
      name: 'Laptop Stand',
      sku: 'LS-001',
      description: 'Adjustable aluminum laptop stand',
      category: 'Office',
      unitOfMeasure: 'pcs',
      unitCost: 25.00,
      sellingPrice: 49.99,
      minStockLevel: 5,
      maxStockLevel: 50,
      isActive: true,
      createdDate: '2024-01-17T10:00:00Z',
      lastModified: '2024-01-17T10:00:00Z',
      businessId: 'YB100423253156428'
    }
  ] as Product[],

  locations: [
    {
      id: 'loc-001',
      name: 'Main Warehouse',
      code: 'WH-001',
      type: 'warehouse' as const,
      address: '123 Industrial Dr, City, State 12345',
      isActive: true,
      createdDate: '2024-01-01T10:00:00Z'
    },
    {
      id: 'loc-002',
      name: 'Retail Store - Downtown',
      code: 'ST-001',
      type: 'store' as const,
      address: '456 Main St, City, State 12345',
      isActive: true,
      createdDate: '2024-01-01T10:00:00Z'
    },
    {
      id: 'loc-003',
      name: 'Retail Store - Mall',
      code: 'ST-002',
      type: 'store' as const,
      address: '789 Mall Blvd, City, State 12345',
      isActive: true,
      createdDate: '2024-01-01T10:00:00Z'
    }
  ] as Location[],

  movements: [
    {
      id: 'mov-001',
      productId: 'prod-001',
      productName: 'Wireless Headphones',
      productSku: 'WH-001',
      locationId: 'loc-001',
      locationName: 'Main Warehouse',
      movementType: 'in' as const,
      quantity: 50,
      unitCost: 45.00,
      totalCost: 2250.00,
      referenceNumber: 'PO-001',
      notes: 'Initial stock purchase',
      createdBy: 'admin',
      createdDate: '2024-01-15T10:00:00Z',
      invoiceId: 'INV-1000001'
    },
    {
      id: 'mov-002',
      productId: 'prod-002',
      productName: 'USB-C Cable',
      productSku: 'USB-001',
      locationId: 'loc-001',
      locationName: 'Main Warehouse',
      movementType: 'in' as const,
      quantity: 100,
      unitCost: 8.50,
      totalCost: 850.00,
      referenceNumber: 'PO-001',
      notes: 'Bulk purchase',
      createdBy: 'admin',
      createdDate: '2024-01-15T10:05:00Z',
      invoiceId: 'INV-1000001'
    }
  ] as InventoryMovement[],

  accounts: [
    {
      id: 'acc-001',
      accountNumber: '1000',
      accountName: 'Cash',
      accountType: 'asset' as const,
      category: 'currentAssets' as const,
      balance: 50000.00,
      parentAccountId: null,
      description: 'Cash and cash equivalents',
      isActive: true,
      createdDate: '2024-01-01T10:00:00Z',
      lastModified: '2024-01-01T10:00:00Z'
    },
    {
      id: 'acc-002',
      accountNumber: '1100',
      accountName: 'Accounts Receivable',
      accountType: 'asset' as const,
      category: 'currentAssets' as const,
      balance: 25000.00,
      parentAccountId: null,
      description: 'Money owed by customers',
      isActive: true,
      createdDate: '2024-01-01T10:00:00Z',
      lastModified: '2024-01-01T10:00:00Z'
    }
  ] as Account[],

  journalEntries: [
    {
      id: 'je-001',
      entryNumber: 'JE-001',
      date: '2024-01-15',
      description: 'Initial cash deposit',
      reference: 'DEP-001',
      status: 'posted' as const,
      createdBy: 'admin',
      createdAt: '2024-01-15T10:00:00Z',
      postedAt: '2024-01-15T10:05:00Z',
      lines: [
        {
          id: 'jel-001',
          accountId: 'acc-001',
          accountName: 'Cash',
          description: 'Initial deposit',
          debitAmount: 50000.00,
          creditAmount: 0
        },
        {
          id: 'jel-002',
          accountId: 'acc-003',
          accountName: 'Owner Equity',
          description: 'Initial capital',
          debitAmount: 0,
          creditAmount: 50000.00
        }
      ]
    }
  ] as JournalEntry[],

  eventRules: [
    {
      id: 'rule-001',
      name: 'Auto-post completed invoices',
      description: 'Automatically create journal entries for completed invoices',
      eventType: 'invoice_completed',
      conditions: [
        {
          field: 'data.isCompleted',
          operator: 'equals',
          value: true,
          dataType: 'boolean'
        },
        {
          field: 'data.total',
          operator: 'greaterThan',
          value: 0,
          dataType: 'number'
        }
      ],
      journalEntryTemplate: {
        description: 'Invoice {data.invoice} - {data.shipper_consignee.name}',
        reference: '{data.invoice}',
        lines: [
          {
            accountExpression: '1101',
            descriptionTemplate: 'Invoice {data.invoice} - Customer: {data.shipper_consignee.name}',
            amountExpression: 'data.total',
            isDebit: true
          },
          {
            accountExpression: '4001',
            descriptionTemplate: 'Sales revenue for invoice {data.invoice}',
            amountExpression: 'data.productSubtotal',
            isDebit: false
          },
          {
            accountExpression: '4201',
            descriptionTemplate: 'Transport services',
            amountExpression: 'data.serviceSubtotal',
            isDebit: false
          },
          {
            accountExpression: '2301',
            descriptionTemplate: 'Sales tax',
            amountExpression: 'data.taxAmount',
            isDebit: false
          }
        ]
      },
      isActive: true,
      priority: 100,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      businessId: 'YB100423253156428'
    },
    {
      id: 'rule-002',
      name: 'Record cash payments',
      description: 'Create journal entries for cash payments received',
      eventType: 'payment_received',
      conditions: [
        {
          field: 'data.paymentMethod',
          operator: 'equals',
          value: 'cash',
          dataType: 'string'
        }
      ],
      journalEntryTemplate: {
        description: 'Payment received - {data.customerName}',
        reference: '{data.reference}',
        lines: [
          {
            accountExpression: '1001',
            descriptionTemplate: 'Cash payment from {data.customerName}',
            amountExpression: 'data.amount',
            isDebit: true
          },
          {
            accountExpression: '1101',
            descriptionTemplate: 'Payment for invoice {data.invoiceId}',
            amountExpression: 'data.amount',
            isDebit: false
          }
        ]
      },
      isActive: true,
      priority: 90,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      businessId: 'YB100423253156428'
    }
  ] as EventAutomationRule[],

  eventRuleHistory: [] as Array<{
    id: string;
    ruleId: string;
    eventId: string;
    eventType: string;
    executedAt: Date;
    success: boolean;
    journalEntryId?: string;
    error?: string;
    businessId: string;
  }>
};

// Error simulation
const shouldSimulateError = (errorRate: number = 0.05): boolean => {
  return Math.random() < errorRate;
};

const simulateNetworkError = () => {
  const errors = [
    'Network timeout',
    'Connection refused',
    'Server temporarily unavailable',
    'Invalid request'
  ];
  throw new Error(errors[Math.floor(Math.random() * errors.length)]);
};

// Fake Server API
export const fakeServer = {
  // Products API
  products: {
    async getAll(query?: string, filters?: any): Promise<Product[]> {
      await delay();
      
      if (shouldSimulateError()) {
        simulateNetworkError();
      }

      let products = [...fakeDatabase.products];

      // Search functionality
      if (query && query.trim()) {
        const searchTerm = query.toLowerCase();
        products = products.filter(product =>
          product.name.toLowerCase().includes(searchTerm) ||
          product.sku.toLowerCase().includes(searchTerm) ||
          product.category.toLowerCase().includes(searchTerm) ||
          product.description.toLowerCase().includes(searchTerm)
        );
      }

      // Apply filters
      if (filters?.category) {
        products = products.filter(p => p.category === filters.category);
      }
      if (filters?.isActive !== undefined) {
        products = products.filter(p => p.isActive === filters.isActive);
      }

      return products;
    },

    async getById(id: string): Promise<Product | null> {
      await delay();
      
      if (shouldSimulateError()) {
        simulateNetworkError();
      }

      return fakeDatabase.products.find(p => p.id === id) || null;
    },

    async create(product: Omit<Product, 'id' | 'createdDate' | 'lastModified'>): Promise<Product> {
      await delay();
      
      if (shouldSimulateError()) {
        simulateNetworkError();
      }

      // Validate SKU uniqueness
      if (fakeDatabase.products.some(p => p.sku === product.sku)) {
        throw new Error('SKU already exists');
      }

      const newProduct: Product = {
        ...product,
        id: generateId('prod-'),
        createdDate: new Date().toISOString(),
        lastModified: new Date().toISOString()
      };

      fakeDatabase.products.push(newProduct);
      return newProduct;
    },

    async update(id: string, updates: Partial<Product>): Promise<Product> {
      await delay();
      
      if (shouldSimulateError()) {
        simulateNetworkError();
      }

      const index = fakeDatabase.products.findIndex(p => p.id === id);
      if (index === -1) {
        throw new Error('Product not found');
      }

      // Validate SKU uniqueness if updating SKU
      if (updates.sku && fakeDatabase.products.some(p => p.id !== id && p.sku === updates.sku)) {
        throw new Error('SKU already exists');
      }

      const updatedProduct = {
        ...fakeDatabase.products[index],
        ...updates,
        lastModified: new Date().toISOString()
      };

      fakeDatabase.products[index] = updatedProduct;
      return updatedProduct;
    },

    async delete(id: string): Promise<{ success: boolean; message: string }> {
      await delay();
      
      if (shouldSimulateError()) {
        simulateNetworkError();
      }

      const index = fakeDatabase.products.findIndex(p => p.id === id);
      if (index === -1) {
        throw new Error('Product not found');
      }

      // Check if product has movements
      const hasMovements = fakeDatabase.movements.some(m => m.productId === id);
      if (hasMovements) {
        return { success: false, message: 'Cannot delete product with existing movements' };
      }

      fakeDatabase.products.splice(index, 1);
      return { success: true, message: 'Product deleted successfully' };
    }
  },

  // Locations API
  locations: {
    async getAll(filters?: any): Promise<Location[]> {
      await delay();
      
      if (shouldSimulateError()) {
        simulateNetworkError();
      }

      let locations = [...fakeDatabase.locations];

      if (filters?.type) {
        locations = locations.filter(l => l.type === filters.type);
      }
      if (filters?.isActive !== undefined) {
        locations = locations.filter(l => l.isActive === filters.isActive);
      }

      return locations;
    },

    async getById(id: string): Promise<Location | null> {
      await delay();
      return fakeDatabase.locations.find(l => l.id === id) || null;
    },

    async create(location: Omit<Location, 'id' | 'createdDate'>): Promise<Location> {
      await delay();
      
      if (shouldSimulateError()) {
        simulateNetworkError();
      }

      // Validate code uniqueness
      if (fakeDatabase.locations.some(l => l.code === location.code)) {
        throw new Error('Location code already exists');
      }

      const newLocation: Location = {
        ...location,
        id: generateId('loc-'),
        createdDate: new Date().toISOString()
      };

      fakeDatabase.locations.push(newLocation);
      return newLocation;
    },

    async update(id: string, updates: Partial<Location>): Promise<Location> {
      await delay();
      
      if (shouldSimulateError()) {
        simulateNetworkError();
      }

      const index = fakeDatabase.locations.findIndex(l => l.id === id);
      if (index === -1) {
        throw new Error('Location not found');
      }

      // Validate code uniqueness if updating code
      if (updates.code && fakeDatabase.locations.some(l => l.id !== id && l.code === updates.code)) {
        throw new Error('Location code already exists');
      }

      fakeDatabase.locations[index] = { ...fakeDatabase.locations[index], ...updates };
      return fakeDatabase.locations[index];
    }
  },

  // Inventory Movements API
  movements: {
    async getAll(filters?: any): Promise<InventoryMovement[]> {
      await delay();
      
      if (shouldSimulateError()) {
        simulateNetworkError();
      }

      let movements = [...fakeDatabase.movements];

      // Apply filters
      if (filters?.productId) {
        movements = movements.filter(m => m.productId === filters.productId);
      }
      if (filters?.locationId) {
        movements = movements.filter(m => m.locationId === filters.locationId);
      }
      if (filters?.movementType) {
        movements = movements.filter(m => m.movementType === filters.movementType);
      }
      if (filters?.dateFrom) {
        movements = movements.filter(m => m.createdDate >= filters.dateFrom);
      }
      if (filters?.dateTo) {
        movements = movements.filter(m => m.createdDate <= filters.dateTo);
      }
      if (filters?.search) {
        const searchTerm = filters.search.toLowerCase();
        movements = movements.filter(m =>
          m.productName.toLowerCase().includes(searchTerm) ||
          m.productSku.toLowerCase().includes(searchTerm) ||
          m.referenceNumber.toLowerCase().includes(searchTerm) ||
          m.notes.toLowerCase().includes(searchTerm)
        );
      }

      // Sort by date (newest first)
      movements.sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());

      return movements;
    },

    async getById(id: string): Promise<InventoryMovement | null> {
      await delay();
      return fakeDatabase.movements.find(m => m.id === id) || null;
    },

    async create(movement: Omit<InventoryMovement, 'id' | 'createdDate'>): Promise<InventoryMovement> {
      await delay();
      
      if (shouldSimulateError()) {
        simulateNetworkError();
      }

      // Validate product exists
      const product = fakeDatabase.products.find(p => p.id === movement.productId);
      if (!product) {
        throw new Error('Product not found');
      }

      // Validate location exists
      const location = fakeDatabase.locations.find(l => l.id === movement.locationId);
      if (!location) {
        throw new Error('Location not found');
      }

      // For stock out movements, check availability
      if (movement.movementType === 'out') {
        const currentStock = await this.getStockLevel(movement.productId, movement.locationId);
        if (currentStock < movement.quantity) {
          throw new Error(`Insufficient stock. Available: ${currentStock}, Requested: ${movement.quantity}`);
        }
      }

      const newMovement: InventoryMovement = {
        ...movement,
        id: generateId('mov-'),
        createdDate: new Date().toISOString()
      };

      fakeDatabase.movements.push(newMovement);
      return newMovement;
    },

    async update(id: string, updates: Partial<InventoryMovement>): Promise<InventoryMovement> {
      await delay();
      
      if (shouldSimulateError()) {
        simulateNetworkError();
      }

      const index = fakeDatabase.movements.findIndex(m => m.id === id);
      if (index === -1) {
        throw new Error('Movement not found');
      }

      const updatedMovement = {
        ...fakeDatabase.movements[index],
        ...updates,
        lastModified: new Date().toISOString()
      };

      fakeDatabase.movements[index] = updatedMovement;
      return updatedMovement;
    },

    async delete(id: string): Promise<{ success: boolean; message: string }> {
      await delay();
      
      if (shouldSimulateError()) {
        simulateNetworkError();
      }

      const index = fakeDatabase.movements.findIndex(m => m.id === id);
      if (index === -1) {
        throw new Error('Movement not found');
      }

      fakeDatabase.movements.splice(index, 1);
      return { success: true, message: 'Movement deleted successfully' };
    },

    async createBulk(bulkRequest: BulkMovementRequest): Promise<{ success: boolean; movements: InventoryMovement[]; errors: string[] }> {
      await delay();
      
      if (shouldSimulateError()) {
        simulateNetworkError();
      }

      const errors: string[] = [];
      const movements: InventoryMovement[] = [];
      const timestamp = new Date().toISOString();

      // Validate location
      const location = fakeDatabase.locations.find(l => l.id === bulkRequest.locationId);
      if (!location) {
        return { success: false, movements: [], errors: ['Invalid location'] };
      }

      // Process each item
      for (let i = 0; i < bulkRequest.items.length; i++) {
        const item = bulkRequest.items[i];
        const product = fakeDatabase.products.find(p => p.id === item.productId);
        
        if (!product) {
          errors.push(`Item ${i + 1}: Product not found`);
          continue;
        }

        if (item.quantity <= 0) {
          errors.push(`Item ${i + 1}: Quantity must be greater than 0`);
          continue;
        }

        // Check stock for outbound movements
        if (bulkRequest.movementType === 'out') {
          const currentStock = await this.getStockLevel(item.productId, bulkRequest.locationId);
          if (item.quantity > currentStock) {
            errors.push(`Item ${i + 1}: Insufficient stock. Available: ${currentStock}, Requested: ${item.quantity}`);
            continue;
          }
        }

        const unitCost = item.unitCost || product.unitCost;
        const movement: InventoryMovement = {
          id: generateId('mov-'),
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          locationId: bulkRequest.locationId,
          locationName: location.name,
          movementType: bulkRequest.movementType,
          quantity: item.quantity,
          unitCost,
          totalCost: item.quantity * unitCost,
          referenceNumber: bulkRequest.referenceNumber,
          notes: item.notes || bulkRequest.generalNotes || '',
          createdBy: bulkRequest.createdBy,
          createdDate: timestamp,
          invoiceId: bulkRequest.invoiceId,
          fromLocationId: bulkRequest.fromLocationId,
          fromLocationName: bulkRequest.fromLocationId ? 
            fakeDatabase.locations.find(l => l.id === bulkRequest.fromLocationId)?.name : undefined
        };

        movements.push(movement);
      }

      if (errors.length > 0) {
        return { success: false, movements: [], errors };
      }

      // Add all movements to database
      fakeDatabase.movements.push(...movements);
      
      return { success: true, movements, errors: [] };
    },

    async getStockLevel(productId: string, locationId: string): Promise<number> {
      await delay(50); // Shorter delay for internal calls
      
      return fakeDatabase.movements
        .filter(m => m.productId === productId && m.locationId === locationId)
        .reduce((stock, movement) => {
          switch (movement.movementType) {
            case 'in':
            case 'adjustment':
              return stock + movement.quantity;
            case 'out':
              return stock - movement.quantity;
            case 'transfer':
              // For transfers, we need to check if this is the destination location
              if (movement.locationId === locationId) {
                return stock + movement.quantity;
              }
              return stock;
            default:
              return stock;
          }
        }, 0);
    },

    async getStockLevels(): Promise<InventoryStock[]> {
      await delay();
      
      const stockMap = new Map<string, InventoryStock>();

      for (const movement of fakeDatabase.movements) {
        const key = `${movement.productId}-${movement.locationId}`;
        let stock = stockMap.get(key);

        if (!stock) {
          stock = {
            id: key,
            productId: movement.productId,
            locationId: movement.locationId,
            quantity: 0,
            reservedQuantity: 0,
            availableQuantity: 0,
            averageCost: 0,
            lastMovementDate: movement.createdDate,
            lastMovementType: movement.movementType
          };
          stockMap.set(key, stock);
        }

        // Update quantity
        switch (movement.movementType) {
          case 'in':
          case 'adjustment':
            stock.quantity += movement.quantity;
            break;
          case 'out':
            stock.quantity -= movement.quantity;
            break;
          case 'transfer':
            if (movement.locationId === movement.locationId) {
              stock.quantity += movement.quantity;
            }
            break;
        }

        // Update other fields
        if (new Date(movement.createdDate) > new Date(stock.lastMovementDate)) {
          stock.lastMovementDate = movement.createdDate;
          stock.lastMovementType = movement.movementType;
        }

        stock.averageCost = movement.unitCost;
        stock.availableQuantity = stock.quantity - stock.reservedQuantity;
      }

      return Array.from(stockMap.values());
    }
  },

  // Accounts API
  accounts: {
    async getAll(filters?: any): Promise<Account[]> {
      await delay();
      
      if (shouldSimulateError()) {
        simulateNetworkError();
      }

      let accounts = [...fakeDatabase.accounts];

      if (filters?.accountType) {
        accounts = accounts.filter(a => a.accountType === filters.accountType);
      }
      if (filters?.category) {
        accounts = accounts.filter(a => a.category === filters.category);
      }
      if (filters?.isActive !== undefined) {
        accounts = accounts.filter(a => a.isActive === filters.isActive);
      }

      return accounts;
    },

    async getById(id: string): Promise<Account | null> {
      await delay();
      return fakeDatabase.accounts.find(a => a.id === id) || null;
    },

    async create(account: Omit<Account, 'id' | 'createdDate' | 'lastModified'>): Promise<Account> {
      await delay();
      
      if (shouldSimulateError()) {
        simulateNetworkError();
      }

      // Validate account number uniqueness
      if (fakeDatabase.accounts.some(a => a.accountNumber === account.accountNumber)) {
        throw new Error('Account number already exists');
      }

      const newAccount: Account = {
        ...account,
        id: generateId('acc-'),
        createdDate: new Date().toISOString(),
        lastModified: new Date().toISOString()
      };

      fakeDatabase.accounts.push(newAccount);
      return newAccount;
    },

    async update(id: string, updates: Partial<Account>): Promise<Account> {
      await delay();
      
      if (shouldSimulateError()) {
        simulateNetworkError();
      }

      const index = fakeDatabase.accounts.findIndex(a => a.id === id);
      if (index === -1) {
        throw new Error('Account not found');
      }

      // Validate account number uniqueness
      if (updates.accountNumber && fakeDatabase.accounts.some(a => a.id !== id && a.accountNumber === updates.accountNumber)) {
        throw new Error('Account number already exists');
      }

      fakeDatabase.accounts[index] = {
        ...fakeDatabase.accounts[index],
        ...updates,
        lastModified: new Date().toISOString()
      };

      return fakeDatabase.accounts[index];
    }
  },

  // Journal Entries API
  journal: {
    async getAll(filters?: any): Promise<JournalEntry[]> {
      await delay();
      
      if (shouldSimulateError()) {
        simulateNetworkError();
      }

      let entries = [...fakeDatabase.journalEntries];

      if (filters?.status) {
        entries = entries.filter(e => e.status === filters.status);
      }
      if (filters?.accountId) {
        entries = entries.filter(e => e.lines.some(l => l.accountId === filters.accountId));
      }
      if (filters?.dateFrom) {
        entries = entries.filter(e => e.date >= filters.dateFrom);
      }
      if (filters?.dateTo) {
        entries = entries.filter(e => e.date <= filters.dateTo);
      }

      return entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },

    async getById(id: string): Promise<JournalEntry | null> {
      await delay();
      return fakeDatabase.journalEntries.find(e => e.id === id) || null;
    },

    async create(entry: Omit<JournalEntry, 'id' | 'createdAt' | 'entryNumber'>): Promise<JournalEntry> {
      await delay();
      
      if (shouldSimulateError()) {
        simulateNetworkError();
      }

      // Validate entry is balanced
      const totalDebit = entry.lines.reduce((sum, line) => sum + (line.debitAmount || 0), 0);
      const totalCredit = entry.lines.reduce((sum, line) => sum + (line.creditAmount || 0), 0);
      
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new Error(`Entry is not balanced. Debit: ${totalDebit}, Credit: ${totalCredit}`);
      }

      // Generate entry number
      const lastEntry = fakeDatabase.journalEntries
        .sort((a, b) => b.entryNumber.localeCompare(a.entryNumber))[0];
      const lastNumber = lastEntry ? parseInt(lastEntry.entryNumber.split('-')[1]) : 0;
      const entryNumber = `JE-${(lastNumber + 1).toString().padStart(3, '0')}`;

      const newEntry: JournalEntry = {
        ...entry,
        id: generateId('je-'),
        entryNumber,
        createdAt: new Date().toISOString(),
        lines: entry.lines.map(line => ({
          ...line,
          id: generateId('jel-')
        }))
      };

      fakeDatabase.journalEntries.push(newEntry);
      return newEntry;
    },

    async update(id: string, updates: Partial<JournalEntry>): Promise<JournalEntry> {
      await delay();
      
      if (shouldSimulateError()) {
        simulateNetworkError();
      }

      const index = fakeDatabase.journalEntries.findIndex(e => e.id === id);
      if (index === -1) {
        throw new Error('Journal entry not found');
      }

      // Only allow updates to draft entries
      if (fakeDatabase.journalEntries[index].status === 'posted') {
        throw new Error('Cannot modify posted entries');
      }

      fakeDatabase.journalEntries[index] = { 
        ...fakeDatabase.journalEntries[index], 
        ...updates 
      };

      return fakeDatabase.journalEntries[index];
    },

    async post(id: string): Promise<JournalEntry> {
      await delay();
      
      if (shouldSimulateError()) {
        simulateNetworkError();
      }

      const index = fakeDatabase.journalEntries.findIndex(e => e.id === id);
      if (index === -1) {
        throw new Error('Journal entry not found');
      }

      const entry = fakeDatabase.journalEntries[index];
      if (entry.status === 'posted') {
        throw new Error('Entry is already posted');
      }

      // Validate entry is balanced
      const totalDebit = entry.lines.reduce((sum, line) => sum + (line.debitAmount || 0), 0);
      const totalCredit = entry.lines.reduce((sum, line) => sum + (line.creditAmount || 0), 0);
      
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new Error('Entry must be balanced before posting');
      }

      fakeDatabase.journalEntries[index] = {
        ...entry,
        status: 'posted',
        postedAt: new Date().toISOString()
      };

      // Update account balances (simplified)
      entry.lines.forEach(line => {
        const accountIndex = fakeDatabase.accounts.findIndex(a => a.id === line.accountId);
        if (accountIndex !== -1) {
          const account = fakeDatabase.accounts[accountIndex];
          const debitAmount = line.debitAmount || 0;
          const creditAmount = line.creditAmount || 0;
          
          // Simplified balance update (would be more complex in real system)
          if (['asset', 'expense'].includes(account.accountType)) {
            account.balance += debitAmount - creditAmount;
          } else {
            account.balance += creditAmount - debitAmount;
          }
        }
      });

      return fakeDatabase.journalEntries[index];
    }
  },

  // Event Rules API
  eventRules: {
    async getAll(): Promise<EventAutomationRule[]> {
      await delay();
      
      if (shouldSimulateError()) {
        simulateNetworkError();
      }

      return [...fakeDatabase.eventRules];
    },

    async getById(ruleId: string): Promise<EventAutomationRule | null> {
      await delay();
      return fakeDatabase.eventRules.find(r => r.id === ruleId) || null;
    },

    async getByEventType(eventType: string): Promise<EventAutomationRule[]> {
      await delay();
      return fakeDatabase.eventRules.filter(r => 
        r.eventType === eventType && r.isActive
      ).sort((a, b) => b.priority - a.priority);
    },

    async create(rule: Omit<EventAutomationRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<EventAutomationRule> {
      await delay();
      
      if (shouldSimulateError()) {
        simulateNetworkError();
      }

      const newRule: EventAutomationRule = {
        ...rule,
        id: generateId('rule-'),
        createdAt: new Date(),
        updatedAt: new Date(),
        businessId: 'YB100423253156428'
      };

      fakeDatabase.eventRules.push(newRule);
      return newRule;
    },

    async update(ruleId: string, updates: Partial<EventAutomationRule>): Promise<EventAutomationRule> {
      await delay();
      
      if (shouldSimulateError()) {
        simulateNetworkError();
      }

      const index = fakeDatabase.eventRules.findIndex(r => r.id === ruleId);
      if (index === -1) {
        throw new Error('Event rule not found');
      }

      fakeDatabase.eventRules[index] = {
        ...fakeDatabase.eventRules[index],
        ...updates,
        id: ruleId,
        updatedAt: new Date()
      };

      return fakeDatabase.eventRules[index];
    },

    async delete(ruleId: string): Promise<{ success: boolean; message: string }> {
      await delay();
      
      if (shouldSimulateError()) {
        simulateNetworkError();
      }

      const index = fakeDatabase.eventRules.findIndex(r => r.id === ruleId);
      if (index === -1) {
        throw new Error('Event rule not found');
      }

      fakeDatabase.eventRules.splice(index, 1);
      return { success: true, message: 'Event rule deleted successfully' };
    },

    async testRule(rule: EventAutomationRule, sampleData: EventData): Promise<{
      success: boolean;
      result?: any;
      error?: string;
    }> {
      await delay();
      
      try {
        // Simulate rule testing
        const wouldTrigger = rule.conditions.length === 0 || 
          rule.conditions.every(condition => {
            // Simplified condition evaluation for testing
            const value = getNestedValue(sampleData, condition.field);
            
            switch (condition.operator) {
              case 'equals':
                return value === condition.value;
              case 'notEquals':
                return value !== condition.value;
              case 'greaterThan':
                return Number(value) > Number(condition.value);
              case 'lessThan':
                return Number(value) < Number(condition.value);
              case 'contains':
                return String(value).includes(String(condition.value));
              case 'exists':
                return value !== undefined && value !== null;
              case 'notExists':
                return value === undefined || value === null;
              default:
                return false;
            }
          });

        if (wouldTrigger) {
          // Simulate journal entry creation
          const journalEntry = {
            description: processTemplate(rule.journalEntryTemplate.description, sampleData),
            reference: processTemplate(rule.journalEntryTemplate.reference, sampleData),
            lines: rule.journalEntryTemplate.lines.map(line => ({
              accountId: line.accountExpression,
              description: processTemplate(line.descriptionTemplate, sampleData),
              amount: evaluateExpression(line.amountExpression, sampleData),
              isDebit: line.isDebit
            }))
          };

          return {
            success: true,
            result: {
              wouldTrigger: true,
              estimatedJournalEntry: journalEntry
            }
          };
        } else {
          return {
            success: true,
            result: {
              wouldTrigger: false,
              reason: 'Conditions not met'
            }
          };
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    },

    async getExecutionHistory(ruleId?: string, limit: number = 100): Promise<Array<{
      id: string;
      ruleId: string;
      eventId: string;
      eventType: string;
      executedAt: Date;
      success: boolean;
      journalEntryId?: string;
      error?: string;
    }>> {
      await delay();
      
      let history = [...fakeDatabase.eventRuleHistory];
      
      if (ruleId) {
        history = history.filter(h => h.ruleId === ruleId);
      }
      
      return history
        .sort((a, b) => b.executedAt.getTime() - a.executedAt.getTime())
        .slice(0, limit);
    },

    async bulkToggle(ruleIds: string[], isActive: boolean): Promise<{
      success: boolean;
      updated: number;
      failed: string[];
    }> {
      await delay();
      
      const updated: string[] = [];
      const failed: string[] = [];
      
      for (const ruleId of ruleIds) {
        const index = fakeDatabase.eventRules.findIndex(r => r.id === ruleId);
        if (index !== -1) {
          fakeDatabase.eventRules[index].isActive = isActive;
          fakeDatabase.eventRules[index].updatedAt = new Date();
          updated.push(ruleId);
        } else {
          failed.push(ruleId);
        }
      }
      
      return {
        success: failed.length === 0,
        updated: updated.length,
        failed
      };
    },

    async importRules(rules: EventAutomationRule[]): Promise<{
      success: boolean;
      imported: number;
      failed: number;
      errors: string[];
    }> {
      await delay();
      
      const errors: string[] = [];
      let imported = 0;
      
      for (const rule of rules) {
        try {
          const newRule: EventAutomationRule = {
            ...rule,
            id: generateId('rule-'),
            createdAt: new Date(),
            updatedAt: new Date(),
            businessId: 'YB100423253156428'
          };
          
          fakeDatabase.eventRules.push(newRule);
          imported++;
        } catch (error) {
          errors.push(`Failed to import rule ${rule.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      return {
        success: errors.length === 0,
        imported,
        failed: rules.length - imported,
        errors
      };
    }
  },

  // Utility functions
  utils: {
    async getNextEntryNumber(): Promise<string> {
      await delay(100);
      const lastEntry = fakeDatabase.journalEntries
        .sort((a, b) => b.entryNumber.localeCompare(a.entryNumber))[0];
      const lastNumber = lastEntry ? parseInt(lastEntry.entryNumber.split('-')[1]) : 0;
      return `JE-${(lastNumber + 1).toString().padStart(3, '0')}`;
    },

    async getNextProductCode(category: string): Promise<string> {
      await delay(100);
      const categoryPrefix = category.toUpperCase().slice(0, 3);
      const categoryProducts = fakeDatabase.products
        .filter(p => p.productCode?.startsWith(categoryPrefix))
        .sort((a, b) => (b.productCode || '').localeCompare(a.productCode || ''));
      
      if (categoryProducts.length === 0) {
        return `${categoryPrefix}001`;
      }

      const lastNumber = parseInt(categoryProducts[0].productCode?.slice(-3) || '0');
      return `${categoryPrefix}${(lastNumber + 1).toString().padStart(3, '0')}`;
    },

    async healthCheck(): Promise<{ status: string; timestamp: string; version: string }> {
      await delay(50);
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      };
    },

    // Reset database to initial state
    async resetDatabase(): Promise<{ success: boolean; message: string }> {
      await delay(200);
      
      // Reset to initial state
      fakeDatabase = {
        products: [...fakeDatabase.products.slice(0, 3)], // Keep first 3 products
        locations: [...fakeDatabase.locations.slice(0, 3)], // Keep first 3 locations
        movements: [...fakeDatabase.movements.slice(0, 2)], // Keep first 2 movements
        accounts: [...fakeDatabase.accounts.slice(0, 2)], // Keep first 2 accounts
        journalEntries: [...fakeDatabase.journalEntries.slice(0, 1)], // Keep first entry
        eventRules: [...fakeDatabase.eventRules.slice(0, 2)], // Keep first 2 rules
        eventRuleHistory: []
      };

      return { success: true, message: 'Database reset to initial state' };
    },

    // Get database statistics
    async getStats(): Promise<Record<string, number>> {
      await delay(100);
      
      return {
        products: fakeDatabase.products.length,
        locations: fakeDatabase.locations.length,
        movements: fakeDatabase.movements.length,
        accounts: fakeDatabase.accounts.length,
        journalEntries: fakeDatabase.journalEntries.length,
        eventRules: fakeDatabase.eventRules.length,
        eventRuleHistory: fakeDatabase.eventRuleHistory.length,
        totalStockValue: fakeDatabase.movements.reduce((sum, m) => {
          if (m.movementType === 'in') return sum + m.totalCost;
          if (m.movementType === 'out') return sum - m.totalCost;
          return sum;
        }, 0)
      };
    }
  }
};

// Export the fake server instance
export default fakeServer;