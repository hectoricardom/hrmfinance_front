/**
 * Receiving Store
 * Manages inventory receiving sessions and UPC scanning
 * Includes localStorage persistence to prevent data loss on page reload
 */

import { createSignal, createEffect } from 'solid-js';
import { inventoryStore, Product } from './inventoryStore';
import {
  ReceivingSession,
  ReceivingItem,
  ReceivingLookupState,
  UPCLookupResult,
  SupplierInfo,
  ReceivingInvoice,
  generateReceivingItemId,
  generateReceivingSessionId,
} from '../types/receiving';
import { lookupUPC } from '../services/upcLookupService';
import { inventoryApi } from '../../../services/apiAdapter';
import { authStore } from '../../../stores/authStore';
import { devLog } from '../../../services/utils';

// Local Storage Keys
const STORAGE_KEY_SESSION = 'hrmfinance-receiving-session';
const STORAGE_KEY_ITEMS = 'hrmfinance-receiving-items';
const STORAGE_KEY_FORM_STATE = 'hrmfinance-receiving-form-state';

/**
 * Load session from localStorage
 */
function loadSessionFromStorage(): ReceivingSession | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_SESSION);
    if (stored) {
      const session = JSON.parse(stored);
      // Check if session is less than 24 hours old
      const sessionAge = Date.now() - session.startedAt;
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      if (sessionAge < maxAge) {
        return session;
      } else {
        // Session expired, clear storage
        clearStoredSession();
      }
    }
  } catch (err) {
    console.warn('Error loading session from storage:', err);
  }
  return null;
}

/**
 * Load items from localStorage
 */
function loadItemsFromStorage(): ReceivingItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_ITEMS);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (err) {
    console.warn('Error loading items from storage:', err);
  }
  return [];
}

/**
 * Load form state from localStorage
 */
function loadFormStateFromStorage(): {
  selectedLocationId?: string;
  selectedSupplier?: SupplierInfo | null;
  invoiceNumber?: string;
  invoiceDate?: string;
  invoiceDueDate?: string;
  invoiceNotes?: string;
} | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_FORM_STATE);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (err) {
    console.warn('Error loading form state from storage:', err);
  }
  return null;
}

/**
 * Save session to localStorage
 */
function saveSessionToStorage(session: ReceivingSession | null): void {
  try {
    if (session) {
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
    } else {
      localStorage.removeItem(STORAGE_KEY_SESSION);
    }
  } catch (err) {
    console.warn('Error saving session to storage:', err);
  }
}

/**
 * Save items to localStorage
 */
function saveItemsToStorage(items: ReceivingItem[]): void {
  try {
    if (items.length > 0) {
      localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items));
    } else {
      localStorage.removeItem(STORAGE_KEY_ITEMS);
    }
  } catch (err) {
    console.warn('Error saving items to storage:', err);
  }
}

/**
 * Save form state to localStorage
 */
function saveFormStateToStorage(): void {
  try {
    const formState = {
      selectedLocationId: selectedLocationId(),
      selectedSupplier: selectedSupplier(),
      invoiceNumber: invoiceNumber(),
      invoiceDate: invoiceDate(),
      invoiceDueDate: invoiceDueDate(),
      invoiceNotes: invoiceNotes(),
    };
    localStorage.setItem(STORAGE_KEY_FORM_STATE, JSON.stringify(formState));
  } catch (err) {
    console.warn('Error saving form state to storage:', err);
  }
}

/**
 * Clear all stored session data
 */
function clearStoredSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_SESSION);
    localStorage.removeItem(STORAGE_KEY_ITEMS);
    localStorage.removeItem(STORAGE_KEY_FORM_STATE);
  } catch (err) {
    console.warn('Error clearing stored session:', err);
  }
}

// Session management - initialize from localStorage if available
const storedSession = loadSessionFromStorage();
const storedItems = loadItemsFromStorage();
const storedFormState = loadFormStateFromStorage();

const [currentSession, setCurrentSession] = createSignal<ReceivingSession | null>(storedSession);
const [sessionItems, setSessionItems] = createSignal<ReceivingItem[]>(storedItems);

// Current lookup state
const [lookupState, setLookupState] = createSignal<ReceivingLookupState>('idle');
const [currentLookupResult, setCurrentLookupResult] = createSignal<UPCLookupResult | null>(null);

// Form state - initialize from stored values if available
const [quantity, setQuantity] = createSignal<number>(1);
const [selectedLocationId, setSelectedLocationId] = createSignal<string>(storedFormState?.selectedLocationId || '');
const [selectedBinCode, setSelectedBinCode] = createSignal<string>('');
const [unitCost, setUnitCost] = createSignal<number>(0);
const [isSubmitting, setIsSubmitting] = createSignal<boolean>(false);
const [error, setError] = createSignal<string | null>(null);

// Supplier and Invoice state - initialize from stored values if available
const [selectedSupplier, setSelectedSupplier] = createSignal<SupplierInfo | null>(storedFormState?.selectedSupplier || null);
const [invoiceNumber, setInvoiceNumber] = createSignal<string>(storedFormState?.invoiceNumber || '');
const [invoiceDate, setInvoiceDate] = createSignal<string>(storedFormState?.invoiceDate || new Date().toISOString().split('T')[0]);
const [invoiceDueDate, setInvoiceDueDate] = createSignal<string>(storedFormState?.invoiceDueDate || '');
const [invoiceNotes, setInvoiceNotes] = createSignal<string>(storedFormState?.invoiceNotes || '');

// Auto-save effects - save to localStorage when state changes
createEffect(() => {
  const session = currentSession();
  saveSessionToStorage(session);
});

createEffect(() => {
  const items = sessionItems();
  saveItemsToStorage(items);
});

createEffect(() => {
  // Only save form state if there's an active session
  if (currentSession()) {
    saveFormStateToStorage();
  }
});

/**
 * Start a new receiving session
 * If there's a restored session from localStorage, it will be returned instead of creating a new one
 */
function startSession(
  locationId?: string,
  locationName?: string,
  supplier?: SupplierInfo,
  invoice?: ReceivingInvoice,
  forceNew: boolean = false
): ReceivingSession {
  // Check if there's already an active session restored from storage
  const existingSession = currentSession();
  const existingItems = sessionItems();

  if (existingSession && existingItems.length > 0 && !forceNew) {
    // Return the restored session - don't create a new one
    devLog('📦 Restored receiving session from storage:', existingSession.id, 'with', existingItems.length, 'items');
    return existingSession;
  }

  // Clear any stale storage if forcing a new session
  if (forceNew) {
    clearStoredSession();
  }

  const session: ReceivingSession = {
    id: generateReceivingSessionId(),
    startedAt: Date.now(),
    items: [],
    totalItems: 0,
    totalQuantity: 0,
    totalValue: 0,
    status: 'active',
    locationId,
    locationName,
    supplier,
    invoice,
  };

  setCurrentSession(session);
  setSessionItems([]);

  // Set default location if provided
  if (locationId) {
    setSelectedLocationId(locationId);
  }

  // Set supplier if provided
  if (supplier) {
    setSelectedSupplier(supplier);
  }

  // Set invoice fields if provided
  if (invoice) {
    setInvoiceNumber(invoice.invoiceNumber);
    setInvoiceDate(invoice.invoiceDate);
    if (invoice.dueDate) setInvoiceDueDate(invoice.dueDate);
    if (invoice.notes) setInvoiceNotes(invoice.notes);
  }

  return session;
}

/**
 * Update session with supplier info
 */
function setSessionSupplier(supplier: SupplierInfo | null): void {
  const session = currentSession();
  if (session) {
    setCurrentSession({ ...session, supplier: supplier || undefined });
  }
  setSelectedSupplier(supplier);
}

/**
 * Update session with invoice info
 */
function setSessionInvoice(invoice: Partial<ReceivingInvoice>): void {
  const session = currentSession();
  if (!session) return;

  const items = sessionItems();
  const subtotal = items.reduce((sum, item) => sum + (item.unitCost || 0) * item.quantity, 0);

  const fullInvoice: ReceivingInvoice = {
    invoiceNumber: invoice.invoiceNumber || invoiceNumber(),
    invoiceDate: invoice.invoiceDate || invoiceDate(),
    dueDate: invoice.dueDate || invoiceDueDate() || undefined,
    subtotal: invoice.subtotal || subtotal,
    taxAmount: invoice.taxAmount || 0,
    totalAmount: invoice.totalAmount || subtotal,
    notes: invoice.notes || invoiceNotes() || undefined,
    attachmentUrl: invoice.attachmentUrl,
  };

  setCurrentSession({ ...session, invoice: fullInvoice });
}

/**
 * End the current receiving session
 */
function endSession(): ReceivingSession | null {
  const session = currentSession();
  if (!session) {
    return null;
  }

  const items = sessionItems();
  const updatedSession: ReceivingSession = {
    ...session,
    endedAt: Date.now(),
    items,
    totalItems: items.length,
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    totalValue: items.reduce((sum, item) => sum + (item.unitCost || 0) * item.quantity, 0),
    status: 'completed',
  };

  // Clear localStorage since session is completed
  clearStoredSession();

  setCurrentSession(null);
  setSessionItems([]);
  resetFormState();

  return updatedSession;
}

/**
 * Generate random ID for inventory key
 */
function generateRandomId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate random number for reference
 */
function generateRandomNUM(): string {
  return Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
}

/**
 * Create Entry InventoryMovements for all session items
 * This consolidates all items into proper inventory entries with supplier/invoice reference
 */
async function createEntryMovements(): Promise<{ success: boolean; message: string; movements: any[] }> {
  const session = currentSession();
  const items = sessionItems();

  if (!session) {
    return { success: false, message: 'No hay sesión activa', movements: [] };
  }

  if (items.length === 0) {
    return { success: false, message: 'No hay items para registrar', movements: [] };
  }

  try {
    setIsSubmitting(true);
    const supplier = selectedSupplier();
    const invNumber = invoiceNumber();
    const invDate = invoiceDate();
    const timestamp = new Date().toISOString();

    // Build reference number with invoice info
    const referenceNumber = invNumber
      ? `INV-${invNumber}`
      : `RECV-${session.id}`;

    // Build notes with supplier info
    const baseNotes = supplier
      ? `Proveedor: ${supplier.name}${supplier.taxId ? ` (${supplier.taxId})` : ''}`
      : '';
    const invoiceNote = invNumber
      ? `Factura: ${invNumber} - Fecha: ${invDate}`
      : '';
    const combinedNotes = [baseNotes, invoiceNote].filter(Boolean).join(' | ');

    // Build products array for bulk request
    const products = items.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      productSku: item.product.sku,
      product: {
        id: item.product.id,
        label: item.product.name,
       code: item.product.sku,
      },
      sku: item.product.sku,
      name: item.product.name,
      quantity: item.quantity,
      qty: item.quantity,
      price: item.unitCost || item.product.unitCost || 0,
      unitCost: item.unitCost || item.product.unitCost || 0,
      totalCost: (item.unitCost || item.product.unitCost || 0) * item.quantity,
      locationId: item.locationId,
      locationName: item.locationName,
      binCode: item.binCode,
      notes: combinedNotes || `Recepción de inventario - ${item.source}`,
    }));

    // Calculate session totals
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalValue = items.reduce((sum, item) => sum + (item.unitCost || 0) * item.quantity, 0);

    // Get the location from first item (or session default)
    const locationId = items[0]?.locationId || session.locationId || '';

    // Build bulk request for API
    const bulkRequest = {
      ssg_inventory_key: generateRandomId(),
      invoiceId: invNumber || `RECV-${generateRandomNUM()}`,
      referenceNumber: referenceNumber,
      movementType: 'ENTRY',
      type: 'ENTRY',
      locationId: locationId,
      items: products,
      products: products,
      businessId: authStore.getBusinessId(),
      generalNotes: combinedNotes || 'Recepción de inventario',
      description: `Recepción de ${items.length} productos`,
      invoice: invNumber || '',
      invoiceDate: invDate,
      dueDate: invoiceDueDate() || undefined,
      store: locationId,
      createdBy: authStore.currentUser?.email || 'system',
      createDate: timestamp,
      // Supplier info
      supplierId: supplier?.id || '',
      supplierName: supplier?.name || '',
      supplierTaxId: supplier?.taxId || '',
      // Totals
      totalQuantity: totalQuantity,
      totalValue: totalValue,
    };

    devLog('Creating entry movements with bulkRequest:', bulkRequest);

    // Call the API to save to server
    const apiResult = await inventoryApi.addInventory(bulkRequest);
    devLog('API result:', apiResult);

    // Also update local store for immediate UI feedback
    for (const item of items) {
      const movement = {
        productId: item.product.id,
        productName: item.product.name,
        productSku: item.product.sku,
        locationId: item.locationId,
        locationName: item.locationName,
        movementType: 'ENTRY' as const,
        type: 'ENTRY' as const,
        quantity: item.quantity,
        unitCost: item.unitCost || item.product.unitCost || 0,
        totalCost: (item.unitCost || item.product.unitCost || 0) * item.quantity,
        minStock: item.product.minStockLevel || 0,
        referenceNumber,
        notes: combinedNotes || `Recepción de inventario - ${item.source}`,
        createdBy: authStore.currentUser?.email || 'system',
      };
      inventoryStore.addInventoryMovement(movement);
    }

    // Update session with invoice info
    if (invNumber) {
      setSessionInvoice({
        invoiceNumber: invNumber,
        invoiceDate: invDate,
        dueDate: invoiceDueDate() || undefined,
        subtotal: totalValue,
        taxAmount: 0,
        totalAmount: totalValue,
        notes: invoiceNotes() || undefined,
      });
    }

    return {
      success: true,
      message: `Se crearon ${items.length} movimientos de entrada. Total: ${totalQuantity} unidades, $${totalValue.toFixed(2)}`,
      movements: products
    };
  } catch (err) {
    console.error('Error creating entry movements:', err);
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Error al crear movimientos',
      movements: []
    };
  } finally {
    setIsSubmitting(false);
  }
}

/**
 * Finalize session: Create entries and end session
 */
async function finalizeSession(): Promise<{ success: boolean; message: string; session: ReceivingSession | null }> {
  const result = await createEntryMovements();

  if (!result.success) {
    return { success: false, message: result.message, session: null };
  }

  const completedSession = endSession();
  resetSessionFormState();

  return {
    success: true,
    message: result.message,
    session: completedSession
  };
}

/**
 * Handle UPC scanned event
 */
async function handleUPCScanned(upc: string): Promise<void> {
  try {
    setLookupState('loading');
    setError(null);



    

    const result = await lookupUPC(upc);
    setCurrentLookupResult(result);

    if (result.found) {
      // Update state based on source
      switch (result.source) {
        case 'local':
          setLookupState('found-local');
          break;
        case 'cache':
          setLookupState('found-cache');
          break;
        case 'api':
          setLookupState('found-api');
          break;
        default:
          setLookupState('not-found');
      }
    } else {
      setLookupState('not-found');
      setError(result.error || 'Product not found');
    }
  } catch (err) {
    console.error('Error scanning UPC:', err);
    setLookupState('error');
    setError(err instanceof Error ? err.message : 'Failed to lookup UPC');
    setCurrentLookupResult(null);
  }
}

/**
 * Confirm receiving of the current item
 */
async function confirmReceiving(
  qty: number,
  locationId: string,
  binCode: string,
  unitCost?: number,
  notes?: string
): Promise<ReceivingItem | null> {
  const result = currentLookupResult();
  const session = currentSession();

  if (!result || !session) {
    setError('No active lookup or session');
    return null;
  }

  if (!locationId) {
    setError('Location is required');
    return null;
  }

  if (qty <= 0) {
    setError('Quantity must be greater than 0');
    return null;
  }

  try {
    setIsSubmitting(true);

    // Get location info
    const location = inventoryStore.getLocationById(locationId);
    if (!location) {
      setError('Invalid location');
      return null;
    }

    // Determine the product to use
    let product: Product;
    let isNewProduct = false;

    if (result.product) {
      // Existing product found
      product = result.product;
    } else if (result.suggestedData) {
      // Need to create a new product from suggested data
      const newProductData: Omit<Product, 'id' | 'createdDate' | 'lastModified'> = {
        name: result.suggestedData.name || 'Unknown Product',
        sku: result.suggestedData.sku || `SKU-${Date.now()}`,
        UPC: result.upc,
        description: result.suggestedData.description || '',
        category: result.suggestedData.category || 'Uncategorized',
        unitOfMeasure: result.suggestedData.unitOfMeasure || 'pcs',
        unitCost: unitCost || result.suggestedData.unitCost || 0,
        sellingPrice: result.suggestedData.sellingPrice || 0,
        minStockLevel: result.suggestedData.minStockLevel || 0,
        maxStockLevel: result.suggestedData.maxStockLevel || 0,
        isActive: true,
        businessId: location.bussinesId || '',
        productImageUrl: result.suggestedData.productImageUrl,
      };

      // Add product to inventory
      await inventoryStore.addProduct(newProductData);

      // Get the newly created product
      const newProduct = inventoryStore.products.find(p => p.UPC === result.upc);
      if (!newProduct) {
        throw new Error('Failed to create new product');
      }

      product = newProduct;
      isNewProduct = true;
    } else {
      setError('No product data available');
      return null;
    }

    // Create receiving item
    const receivingItem: ReceivingItem = {
      id: generateReceivingItemId(),
      product,
      quantity: qty,
      locationId,
      locationName: location.name,
      binCode,
      receivedAt: Date.now(),
      source: result.source,
      isNewProduct,
      unitCost: unitCost || product.unitCost,
      notes,
    };

    // Add to session items
    setSessionItems([...sessionItems(), receivingItem]);

    // Create inventory movement
    const movement = {
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      locationId,
      locationName: location.name,
      movementType: 'in' as const,
      type: 'ENTRY' as const,
      quantity: qty,
      unitCost: receivingItem.unitCost || product.unitCost,
      totalCost: (receivingItem.unitCost || product.unitCost) * qty,
      minStock: product.minStockLevel || 0,
      referenceNumber: `RECV-${session.id}`,
      notes: notes || `Received via barcode scan - ${result.source}`,
      createdBy: 'system', // TODO: Get from auth
    };

    inventoryStore.addInventoryMovement(movement);

    // Reset form state
    clearCurrentLookup();
    resetFormState();

    return receivingItem;
  } catch (err) {
    console.error('Error confirming receiving:', err);
    setError(err instanceof Error ? err.message : 'Failed to confirm receiving');
    return null;
  } finally {
    setIsSubmitting(false);
  }
}

/**
 * Clear current lookup state
 */
function clearCurrentLookup(): void {
  setLookupState('idle');
  setCurrentLookupResult(null);
  setError(null);
}

/**
 * Reset form state
 */
function resetFormState(): void {
  setQuantity(1);
  setSelectedBinCode('');
  setUnitCost(0);
  setError(null);
}

/**
 * Reset session form state (including supplier/invoice)
 */
function resetSessionFormState(): void {
  resetFormState();
  setSelectedSupplier(null);
  setInvoiceNumber('');
  setInvoiceDate(new Date().toISOString().split('T')[0]);
  setInvoiceDueDate('');
  setInvoiceNotes('');
}

/**
 * Get items received today
 */
function getTodayReceivedItems(): ReceivingItem[] {
  const items = sessionItems();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartTime = todayStart.getTime();

  return items.filter(item => item.receivedAt >= todayStartTime);
}

/**
 * Get session summary
 */
function getSessionSummary() {
  const session = currentSession();
  const items = sessionItems();

  if (!session) {
    return null;
  }

  return {
    sessionId: session.id,
    startedAt: session.startedAt,
    itemCount: items.length,
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    totalValue: items.reduce((sum, item) => sum + (item.unitCost || 0) * item.quantity, 0),
    newProductsCount: items.filter(item => item.isNewProduct).length,
  };
}

/**
 * Cancel current session
 */
function cancelSession(): void {
  // Clear localStorage since session is cancelled
  clearStoredSession();

  setCurrentSession(null);
  setSessionItems([]);
  clearCurrentLookup();
  resetFormState();
}

/**
 * Remove item from session
 */
function removeItemFromSession(itemId: string): boolean {
  const items = sessionItems();
  const item = items.find(i => i.id === itemId);

  if (!item) {
    return false;
  }

  // Remove from session items
  setSessionItems(items.filter(i => i.id !== itemId));

  return true;
}

// Export the receiving store
export const receivingStore = {
  // State getters
  get currentSession() {
    return currentSession();
  },
  get sessionItems() {
    return sessionItems();
  },
  get lookupState() {
    return lookupState();
  },
  get currentLookupResult() {
    return currentLookupResult();
  },
  get quantity() {
    return quantity();
  },
  get selectedLocationId() {
    return selectedLocationId();
  },
  get selectedBinCode() {
    return selectedBinCode();
  },
  get unitCost() {
    return unitCost();
  },
  get isSubmitting() {
    return isSubmitting();
  },
  get error() {
    return error();
  },
  // Supplier and Invoice getters
  get selectedSupplier() {
    return selectedSupplier();
  },
  get invoiceNumber() {
    return invoiceNumber();
  },
  get invoiceDate() {
    return invoiceDate();
  },
  get invoiceDueDate() {
    return invoiceDueDate();
  },
  get invoiceNotes() {
    return invoiceNotes();
  },

  // State setters
  setQuantity,
  setSelectedLocationId,
  setSelectedBinCode,
  setUnitCost,
  setError,
  // Supplier and Invoice setters
  setSelectedSupplier,
  setSessionSupplier,
  setSessionInvoice,
  setInvoiceNumber,
  setInvoiceDate,
  setInvoiceDueDate,
  setInvoiceNotes,

  // Methods
  startSession,
  endSession,
  handleUPCScanned,
  confirmReceiving,
  clearCurrentLookup,
  getTodayReceivedItems,
  getSessionSummary,
  cancelSession,
  removeItemFromSession,
  resetFormState,
  resetSessionFormState,
  createEntryMovements,
  finalizeSession,
};
