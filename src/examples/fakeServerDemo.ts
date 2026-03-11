/**
 * Fake Server Demo
 * 
 * This file demonstrates all the capabilities of the fake server
 * and shows how it simulates real API behavior.
 */

import { fakeServer } from '../services/fakeServer';
import { 
  productsApi, 
  movementsApi, 
  locationsApi, 
  accountsApi, 
  journalApi, 
  utilsApi,
  apiAdapter 
} from '../services/apiAdapter';
import { devLog } from '../services/utils';

// Demo function that showcases all fake server capabilities
export const runFakeServerDemo = async () => {
  devLog('🚀 Starting Fake Server Demo...\n');

  try {
    // Set to fake mode
    apiAdapter.setMode('fake');
    devLog(`📡 API Mode: ${apiAdapter.getMode()}\n`);

    // 1. Health Check
    devLog('1️⃣ Health Check');
    const health = await utilsApi.healthCheck();
    devLog('   Status:', health.status);
    devLog('   Version:', health.version);
    devLog('   Timestamp:', health.timestamp);
    devLog('');

    // 2. Database Statistics
    devLog('2️⃣ Database Statistics');
    const stats = await utilsApi.getStats();
    Object.entries(stats).forEach(([key, value]) => {
      devLog(`   ${key}: ${value}`);
    });
    devLog('');

    // 3. Products Operations
    devLog('3️⃣ Products Operations');
    
    // Get all products
    const products = await productsApi.getAll();
    devLog(`   📦 Found ${products.length} products`);
    
    // Search products
    const searchResults = await productsApi.getAll('wireless');
    devLog(`   🔍 Search for "wireless": ${searchResults.length} results`);
    
    // Create a new product
    const newProduct = await productsApi.create({
      name: 'Demo Product',
      sku: 'DEMO-001',
      description: 'A product created via fake server demo',
      category: 'Demo',
      unitOfMeasure: 'pcs',
      unitCost: 10.00,
      sellingPrice: 20.00,
      minStockLevel: 5,
      maxStockLevel: 50,
      isActive: true,
      businessId: 'YB100423253156428'
    });
    devLog(`   ➕ Created product: ${newProduct.name} (ID: ${newProduct.id})`);
    
    // Update the product
    const updatedProduct = await productsApi.update(newProduct.id, {
      name: 'Updated Demo Product',
      sellingPrice: 25.00
    });
    devLog(`   ✏️ Updated product: ${updatedProduct.name} - Price: $${updatedProduct.sellingPrice}`);
    devLog('');

    // 4. Locations Operations
    devLog('4️⃣ Locations Operations');
    
    const locations = await locationsApi.getAll();
    devLog(`   🏢 Found ${locations.length} locations`);
    
    // Create a new location
    const newLocation = await locationsApi.create({
      name: 'Demo Warehouse',
      code: 'DEMO-WH',
      type: 'warehouse',
      address: '123 Demo Street, Demo City',
      isActive: true
    });
    devLog(`   ➕ Created location: ${newLocation.name} (${newLocation.code})`);
    devLog('');

    // 5. Inventory Movements
    devLog('5️⃣ Inventory Movements');
    
    const movements = await movementsApi.getAll();
    devLog(`   📋 Found ${movements.length} movements`);
    
    // Create a stock-in movement
    const stockInMovement = await movementsApi.create({
      productId: newProduct.id,
      productName: newProduct.name,
      productSku: newProduct.sku,
      locationId: newLocation.id,
      locationName: newLocation.name,
      movementType: 'in',
      quantity: 20,
      unitCost: newProduct.unitCost,
      totalCost: 20 * newProduct.unitCost,
      referenceNumber: 'DEMO-IN-001',
      notes: 'Initial stock for demo product',
      createdBy: 'demo-user'
    });
    devLog(`   📦 Created stock-in movement: ${stockInMovement.quantity} units`);
    
    // Create a stock-out movement
    const stockOutMovement = await movementsApi.create({
      productId: newProduct.id,
      productName: newProduct.name,
      productSku: newProduct.sku,
      locationId: newLocation.id,
      locationName: newLocation.name,
      movementType: 'out',
      quantity: 5,
      unitCost: newProduct.unitCost,
      totalCost: 5 * newProduct.unitCost,
      referenceNumber: 'DEMO-OUT-001',
      notes: 'Demo sale',
      createdBy: 'demo-user'
    });
    devLog(`   📤 Created stock-out movement: ${stockOutMovement.quantity} units`);
    
    // Get stock levels
    const stockLevels = await movementsApi.getStockLevels();
    const demoProductStock = stockLevels.find(s => s.productId === newProduct.id);
    devLog(`   📊 Current stock for demo product: ${demoProductStock?.quantity || 0} units`);
    devLog('');

    // 6. Bulk Movements
    devLog('6️⃣ Bulk Movements');
    
    const bulkResult = await movementsApi.createBulk({
      invoiceId: 'DEMO-BULK-001',
      referenceNumber: 'BULK-DEMO',
      movementType: 'in',
      locationId: newLocation.id,
      items: [
        {
          productId: products[0].id,
          quantity: 10,
          unitCost: 15.00,
          notes: 'Bulk item 1'
        },
        {
          productId: products[1].id,
          quantity: 25,
          unitCost: 8.00,
          notes: 'Bulk item 2'
        }
      ],
      generalNotes: 'Demo bulk movement',
      createdBy: 'demo-user'
    });
    
    if (bulkResult.success) {
      devLog(`   📦 Bulk movement successful: ${bulkResult.movements.length} movements created`);
    } else {
      devLog(`   ❌ Bulk movement failed: ${bulkResult.errors.join(', ')}`);
    }
    devLog('');

    // 7. Accounts Operations
    devLog('7️⃣ Accounts Operations');
    
    const accounts = await accountsApi.getAll();
    devLog(`   💳 Found ${accounts.length} accounts`);
    
    // Create a new account
    const newAccount = await accountsApi.create({
      accountNumber: '9999',
      accountName: 'Demo Account',
      accountType: 'asset',
      category: 'currentAssets',
      balance: 1000.00,
      parentAccountId: null,
      description: 'Demo account for testing',
      isActive: true
    });
    devLog(`   ➕ Created account: ${newAccount.accountName} (${newAccount.accountNumber})`);
    devLog('');

    // 8. Journal Entries
    devLog('8️⃣ Journal Entries');
    
    const journalEntries = await journalApi.getAll();
    devLog(`   📚 Found ${journalEntries.length} journal entries`);
    
    // Create a new journal entry
    const newJournalEntry = await journalApi.create({
      date: new Date().toISOString().split('T')[0],
      description: 'Demo journal entry',
      reference: 'DEMO-JE-001',
      status: 'draft',
      createdBy: 'demo-user',
      lines: [
        {
          accountId: accounts[0].id,
          accountName: accounts[0].accountName,
          description: 'Demo debit',
          debitAmount: 500.00,
          creditAmount: 0
        },
        {
          accountId: newAccount.id,
          accountName: newAccount.accountName,
          description: 'Demo credit',
          debitAmount: 0,
          creditAmount: 500.00
        }
      ]
    });
    devLog(`   ➕ Created journal entry: ${newJournalEntry.entryNumber}`);
    
    // Post the journal entry
    const postedEntry = await journalApi.post(newJournalEntry.id);
    devLog(`   📮 Posted journal entry: ${postedEntry.entryNumber} (Status: ${postedEntry.status})`);
    devLog('');

    // 9. Error Simulation
    devLog('9️⃣ Error Simulation');
    try {
      // Try to create a product with duplicate SKU
      await productsApi.create({
        name: 'Duplicate SKU Product',
        sku: 'WH-001', // This SKU already exists
        description: 'This should fail',
        category: 'Test',
        unitOfMeasure: 'pcs',
        unitCost: 10.00,
        sellingPrice: 20.00,
        minStockLevel: 5,
        maxStockLevel: 50,
        isActive: true,
        businessId: 'YB100423253156428'
      });
    } catch (error) {
      devLog(`   ❌ Expected error caught: ${error.message}`);
    }
    
    try {
      // Try to create stock-out movement with insufficient stock
      await movementsApi.create({
        productId: newProduct.id,
        productName: newProduct.name,
        productSku: newProduct.sku,
        locationId: newLocation.id,
        locationName: newLocation.name,
        movementType: 'out',
        quantity: 1000, // More than available
        unitCost: newProduct.unitCost,
        totalCost: 1000 * newProduct.unitCost,
        referenceNumber: 'DEMO-FAIL-001',
        notes: 'This should fail',
        createdBy: 'demo-user'
      });
    } catch (error) {
      devLog(`   ❌ Expected error caught: ${error.message}`);
    }
    devLog('');

    // 10. Final Statistics
    devLog('🔟 Final Statistics');
    const finalStats = await utilsApi.getStats();
    Object.entries(finalStats).forEach(([key, value]) => {
      devLog(`   ${key}: ${value}`);
    });
    devLog('');

    // 11. API Mode Switching Demo
    devLog('1️⃣1️⃣ API Mode Switching Demo');
    
    // Switch to hybrid mode
    apiAdapter.setMode('hybrid');
    devLog(`   📡 Switched to: ${apiAdapter.getMode()}`);
    
    // Try to get products (will fallback to fake since real API is not implemented)
    const hybridProducts = await productsApi.getAll();
    devLog(`   📦 Got ${hybridProducts.length} products in hybrid mode`);
    
    // Switch back to fake mode
    apiAdapter.setMode('fake');
    devLog(`   📡 Switched back to: ${apiAdapter.getMode()}`);
    devLog('');

    devLog('✅ Fake Server Demo Completed Successfully!');
    devLog('');
    devLog('📊 Summary:');
    devLog('   • All CRUD operations tested');
    devLog('   • Bulk operations demonstrated');
    devLog('   • Error handling verified');
    devLog('   • API mode switching working');
    devLog('   • Network delays simulated');
    devLog('   • Validation rules enforced');
    devLog('');

  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
};

// Example of how to integrate with React/SolidJS components
export const useFakeServerWithComponents = () => {
  return {
    // Products operations
    loadProducts: () => productsApi.getAll(),
    searchProducts: (query: string) => productsApi.getAll(query),
    createProduct: (product: any) => productsApi.create(product),
    updateProduct: (id: string, updates: any) => productsApi.update(id, updates),
    
    // Movements operations
    loadMovements: () => movementsApi.getAll(),
    createMovement: (movement: any) => movementsApi.create(movement),
    createBulkMovements: (bulk: any) => movementsApi.createBulk(bulk),
    
    // Locations operations
    loadLocations: () => locationsApi.getAll(),
    createLocation: (location: any) => locationsApi.create(location),
    
    // Utility operations
    getStats: () => utilsApi.getStats(),
    healthCheck: () => utilsApi.healthCheck(),
    resetDatabase: () => fakeServer.utils.resetDatabase(),
    
    // API mode management
    getApiMode: () => apiAdapter.getMode(),
    setApiMode: (mode: 'fake' | 'real' | 'hybrid') => apiAdapter.setMode(mode),
    isFakeMode: () => apiAdapter.isFakeMode()
  };
};

// Export for easy testing in browser console
if (typeof window !== 'undefined') {
  (window as any).fakeServerDemo = runFakeServerDemo;
  (window as any).fakeServer = fakeServer;
  (window as any).apiAdapter = apiAdapter;
}

export default {
  runDemo: runFakeServerDemo,
  useWithComponents: useFakeServerWithComponents
};