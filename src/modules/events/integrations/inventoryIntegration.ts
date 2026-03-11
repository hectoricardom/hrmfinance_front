// Integration layer to connect inventory module with event system

import { emitInventoryMovement } from '../services/eventService';
import { InventoryEvent } from '../types/eventTypes';

/**
 * Transform inventory movement data to event format
 */
export const transformInventoryToEvent = (movement: any): InventoryEvent['data'] => {
  return {
    movementId: movement.id || `mov_${Date.now()}`,
    productId: movement.productId || movement.product?.id || 'UNKNOWN',
    productName: movement.productName || movement.product?.name || 'Unknown Product',
    sku: movement.sku || movement.product?.sku || '',
    category: movement.category || movement.product?.category || 'General',
    quantity: Math.abs(parseFloat(movement.quantity) || 0),
    unitCost: parseFloat(movement.unitCost) || parseFloat(movement.cost) || 0,
    totalCost: (Math.abs(parseFloat(movement.quantity) || 0)) * (parseFloat(movement.unitCost) || parseFloat(movement.cost) || 0),
    unitPrice: parseFloat(movement.unitPrice) || parseFloat(movement.price) || 0,
    totalPrice: (Math.abs(parseFloat(movement.quantity) || 0)) * (parseFloat(movement.unitPrice) || parseFloat(movement.price) || 0),
    supplierId: movement.supplierId || movement.supplier?.id,
    supplierName: movement.supplierName || movement.supplier?.name,
    purchaseOrderId: movement.purchaseOrderId || movement.poNumber,
    invoiceId: movement.invoiceId || movement.relatedInvoice,
    warehouseLocation: movement.location || movement.warehouse || 'Main',
    movementType: movement.type || movement.movementType || 'adjustment',
    adjustmentReason: movement.reason || movement.notes,
    batchNumber: movement.batchNumber || movement.batch,
    expirationDate: movement.expirationDate || movement.expiry
  };
};

/**
 * Emit inventory received event
 */
export const emitInventoryReceivedEvent = async (movement: any): Promise<void> => {
  const eventData = transformInventoryToEvent(movement);
  
  const event: InventoryEvent = {
    id: `inventory_received_${movement.id}_${Date.now()}`,
    type: 'inventory_received',
    timestamp: new Date(),
    source: 'inventory_module',
    data: {
      ...eventData,
      movementType: 'purchase'
    }
  };

  await emitInventoryMovement(event);
};

/**
 * Emit inventory sold event
 */
export const emitInventorySoldEvent = async (movement: any): Promise<void> => {
  const eventData = transformInventoryToEvent(movement);
  
  const event: InventoryEvent = {
    id: `inventory_sold_${movement.id}_${Date.now()}`,
    type: 'inventory_sold',
    timestamp: new Date(),
    source: 'inventory_module',
    data: {
      ...eventData,
      movementType: 'sale'
    }
  };

  await emitInventoryMovement(event);
};

/**
 * Emit inventory adjusted event
 */
export const emitInventoryAdjustedEvent = async (movement: any): Promise<void> => {
  const eventData = transformInventoryToEvent(movement);
  
  const event: InventoryEvent = {
    id: `inventory_adjusted_${movement.id}_${Date.now()}`,
    type: 'inventory_adjusted',
    timestamp: new Date(),
    source: 'inventory_module',
    data: {
      ...eventData,
      movementType: 'adjustment'
    }
  };

  await emitInventoryMovement(event);
};

// Integration helpers for inventory store
export const inventoryEventIntegration = {
  /**
   * Call this when inventory is received/purchased
   */
  onInventoryReceived: emitInventoryReceivedEvent,
  
  /**
   * Call this when inventory is sold
   */
  onInventorySold: emitInventorySoldEvent,
  
  /**
   * Call this when inventory is adjusted
   */
  onInventoryAdjusted: emitInventoryAdjustedEvent,

  /**
   * Transform function for testing
   */
  transformInventoryToEvent,

  /**
   * General movement handler - routes to appropriate event based on movement type
   */
  onInventoryMovement: async (movement: any): Promise<void> => {
    const movementType = movement.type || movement.movementType;
    const quantity = parseFloat(movement.quantity) || 0;

    // Determine event type based on movement type and quantity
    if (movementType === 'purchase' || (movementType === 'adjustment' && quantity > 0)) {
      await emitInventoryReceivedEvent(movement);
    } else if (movementType === 'sale' || (movementType === 'adjustment' && quantity < 0)) {
      await emitInventorySoldEvent(movement);
    } else {
      await emitInventoryAdjustedEvent(movement);
    }
  }
};