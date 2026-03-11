import { createSignal, createMemo } from 'solid-js';
import { inventoryStore, type Product } from './inventoryStore';
import {
  type CountSession,
  type CountItem,
  type CountSummary,
  type Zone,
  generateCountSessionId,
  generateCountItemId,
  calculateDiscrepancy,
  determineItemStatus
} from '../types/counting';
import { devLog } from '../../../services/utils';

// Signals for state management
const [activeSession, setActiveSession] = createSignal<CountSession | null>(null);
const [currentItemIndex, setCurrentItemIndex] = createSignal<number>(0);

// Computed signals
const countItems = createMemo(() => activeSession()?.items || []);
const currentItem = createMemo(() => {
  const items = countItems();
  const index = currentItemIndex();
  return items[index] || null;
});

const progress = createMemo(() => {
  const items = countItems();
  if (items.length === 0) return 0;

  const countedItems = items.filter(item => item.status === 'counted' || item.status === 'discrepancy' || item.status === 'recounted');
  return Math.round((countedItems.length / items.length) * 100);
});

const isComplete = createMemo(() => {
  const items = countItems();
  if (items.length === 0) return false;

  return items.every(item => item.countedQuantity !== undefined);
});

export const countingStore = {
  // Getters
  get activeSession() {
    return activeSession();
  },

  get currentItem() {
    return currentItem();
  },

  get currentItemIndex() {
    return currentItemIndex();
  },

  get countItems() {
    return countItems();
  },

  get progress() {
    return progress();
  },

  get isComplete() {
    return isComplete();
  },

  // Start a new counting session
  startSession: (
    type: 'zone' | 'full',
    locationId: string,
    createdBy: string,
    zoneId?: string,
    zoneName?: string
  ): CountSession => {
    // Debug: Log all available data
    devLog('=== Starting Count Session ===');
    devLog('Location ID:', locationId);
    devLog('All stock levels:', inventoryStore.stockLevels);
    devLog('All products count:', inventoryStore.products?.length);

    // Get stock items for the location
    const stockItems = inventoryStore.getStockByLocation(locationId);
    devLog('Stock items for location:', stockItems);
    devLog('Stock items count:', stockItems?.length);

    // If no stock items, try to get all products for this location from movements
    if (!stockItems || stockItems.length === 0) {
      console.warn('No stock items found for location. Checking movements...');
      const movements = inventoryStore.getMovementsByLocation(locationId);
      devLog('Movements for location:', movements?.length);
    }

    // Convert stock items to count items
    const items: CountItem[] = (stockItems || []).map(stock => {
      const product = inventoryStore.getProductById(stock.productId);
      devLog('Processing stock item:', stock.productId, '-> Product:', product?.name);

      return {
        id: generateCountItemId(),
        productId: stock.productId,
        productName: product?.name || 'Unknown Product',
        productSku: product?.sku || '',
        productUpc: product?.UPC,
        productImage: product?.productImageUrl,
        locationId: stock.locationId,
        binCode: stock.locationName || '',
        systemQuantity: stock.quantity,
        status: 'pending'
      } as CountItem;
    });

    devLog('Count items created:', items.length);

    const session: CountSession = {
      id: generateCountSessionId(),
      type,
      zoneId,
      zoneName,
      status: 'in_progress',
      startedAt: Date.now(),
      createdBy,
      items
    };

    setActiveSession(session);
    setCurrentItemIndex(0);

    return session;
  },

  // End the current session
  endSession: (status: 'completed' | 'cancelled'): void => {
    const session = activeSession();
    if (!session) return;

    const updatedSession: CountSession = {
      ...session,
      status,
      completedAt: Date.now(),
      summary: countingStore.calculateSummary()
    };

    setActiveSession(updatedSession);

    // Clear session after a short delay to allow UI to show completion
    setTimeout(() => {
      setActiveSession(null);
      setCurrentItemIndex(0);
    }, 100);
  },

  // Update count for a specific item
  updateItemCount: (itemId: string, countedQuantity: number, notes?: string): void => {
    const session = activeSession();
    if (!session) return;

    const updatedItems = session.items.map(item => {
      if (item.id === itemId) {
        const discrepancy = calculateDiscrepancy(item.systemQuantity, countedQuantity);
        const status = determineItemStatus(item.systemQuantity, countedQuantity);

        return {
          ...item,
          countedQuantity,
          discrepancy,
          status,
          countedAt: Date.now(),
          countedBy: session.createdBy,
          notes
        };
      }
      return item;
    });

    setActiveSession({
      ...session,
      items: updatedItems
    });
  },

  // Navigate to next item
  goToNextItem: (): boolean => {
    const items = countItems();
    const currentIndex = currentItemIndex();

    if (currentIndex < items.length - 1) {
      setCurrentItemIndex(currentIndex + 1);
      return true;
    }

    return false;
  },

  // Navigate to previous item
  goToPreviousItem: (): boolean => {
    const currentIndex = currentItemIndex();

    if (currentIndex > 0) {
      setCurrentItemIndex(currentIndex - 1);
      return true;
    }

    return false;
  },

  // Go to specific item by index
  goToItem: (index: number): boolean => {
    const items = countItems();

    if (index >= 0 && index < items.length) {
      setCurrentItemIndex(index);
      return true;
    }

    return false;
  },

  // Get items with discrepancies
  getDiscrepancyItems: (): CountItem[] => {
    return countItems().filter(item =>
      item.status === 'discrepancy' || item.status === 'recounted'
    );
  },

  // Calculate session summary
  calculateSummary: (): CountSummary => {
    const items = countItems();
    const totalProducts = items.length;
    const countedProducts = items.filter(item => item.countedQuantity !== undefined).length;
    const correctCount = items.filter(item => item.status === 'counted').length;
    const discrepancyCount = items.filter(item =>
      item.status === 'discrepancy' || item.status === 'recounted'
    ).length;

    // Calculate total discrepancy value
    const totalDiscrepancyValue = items.reduce((total, item) => {
      if (item.discrepancy && item.discrepancy !== 0) {
        const product = inventoryStore.getProductById(item.productId);
        const unitCost = product?.unitCost || 0;
        return total + (Math.abs(item.discrepancy) * unitCost);
      }
      return total;
    }, 0);

    return {
      totalProducts,
      countedProducts,
      correctCount,
      discrepancyCount,
      totalDiscrepancyValue,
      adjustmentsApplied: false
    };
  },

  // Apply adjustments to inventory based on count results
  applyAdjustments: async (): Promise<{ success: boolean; errors: string[] }> => {
    const session = activeSession();
    if (!session) {
      return { success: false, errors: ['No active session'] };
    }

    const errors: string[] = [];
    const discrepancyItems = countingStore.getDiscrepancyItems();

    if (discrepancyItems.length === 0) {
      return { success: true, errors: [] };
    }

    try {
      // Create adjustment movements for each discrepancy
      for (const item of discrepancyItems) {
        if (item.countedQuantity === undefined) continue;

        const product = inventoryStore.getProductById(item.productId);
        if (!product) {
          errors.push(`Product not found: ${item.productName}`);
          continue;
        }

        // Create an adjustment movement
        const adjustmentMovement = {
          productId: item.productId,
          productName: item.productName,
          productSku: item.productSku,
          locationId: item.locationId,
          locationName: item.binCode,
          movementType: 'adjustment' as const,
          type: 'adjustment' as const,
          quantity: item.countedQuantity,
          unitCost: product.unitCost || 0,
          totalCost: (product.unitCost || 0) * item.countedQuantity,
          minStock: product.minStockLevel || 0,
          referenceNumber: `COUNT-${session.id}`,
          notes: `Count adjustment: ${item.systemQuantity} → ${item.countedQuantity}${item.notes ? ` | ${item.notes}` : ''}`,
          createdBy: session.createdBy
        };

        inventoryStore.addInventoryMovement(adjustmentMovement);
      }

      // Update session to mark adjustments as applied
      const summary = countingStore.calculateSummary();
      setActiveSession({
        ...session,
        summary: {
          ...summary,
          adjustmentsApplied: true
        }
      });

      return { success: true, errors };
    } catch (error) {
      console.error('Error applying adjustments:', error);
      return {
        success: false,
        errors: [...errors, error instanceof Error ? error.message : 'Unknown error occurred']
      };
    }
  },

  // Mark item for recount
  markForRecount: (itemId: string): void => {
    const session = activeSession();
    if (!session) return;

    const updatedItems = session.items.map(item => {
      if (item.id === itemId && item.status === 'discrepancy') {
        return {
          ...item,
          status: 'recounted' as const
        };
      }
      return item;
    });

    setActiveSession({
      ...session,
      items: updatedItems
    });
  },

  // Reset session (for testing or cancellation)
  resetSession: (): void => {
    setActiveSession(null);
    setCurrentItemIndex(0);
  },

  // Get session statistics
  getSessionStats: () => {
    const session = activeSession();
    if (!session) return null;

    const items = session.items;
    const summary = countingStore.calculateSummary();

    return {
      sessionId: session.id,
      type: session.type,
      zone: session.zoneName,
      status: session.status,
      startedAt: session.startedAt,
      duration: session.completedAt ? session.completedAt - session.startedAt : Date.now() - session.startedAt,
      progress: progress(),
      isComplete: isComplete(),
      ...summary
    };
  }
};
