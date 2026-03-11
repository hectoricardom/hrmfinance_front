import { EventData, EventListener, EventType } from '../types/eventTypes';

class EventService {
  private listeners: Map<EventType, EventListener[]> = new Map();
  private eventHistory: EventData[] = [];
  private maxHistorySize = 1000;

  /**
   * Register an event listener
   */
  on(eventTypes: EventType | EventType[], handler: (event: EventData) => Promise<void>, options: {
    id: string;
    priority?: number;
    isActive?: boolean;
  }): string {
    const listener: EventListener = {
      id: options.id,
      eventTypes: Array.isArray(eventTypes) ? eventTypes : [eventTypes],
      handler,
      priority: options.priority || 100,
      isActive: options.isActive !== false
    };

    // Register listener for each event type
    listener.eventTypes.forEach(eventType => {
      if (!this.listeners.has(eventType)) {
        this.listeners.set(eventType, []);
      }
      
      const existingListeners = this.listeners.get(eventType)!;
      
      // Remove existing listener with same ID if exists
      const filteredListeners = existingListeners.filter(l => l.id !== listener.id);
      
      // Add new listener and sort by priority (highest first)
      filteredListeners.push(listener);
      filteredListeners.sort((a, b) => b.priority - a.priority);
      
      this.listeners.set(eventType, filteredListeners);
    });

    return listener.id;
  }

  /**
   * Remove an event listener
   */
  off(listenerId: string): void {
    this.listeners.forEach((listeners, eventType) => {
      const filtered = listeners.filter(l => l.id !== listenerId);
      this.listeners.set(eventType, filtered);
    });
  }

  /**
   * Emit an event to all registered listeners
   */
  async emit(event: EventData): Promise<void> {
    // Add to history
    this.eventHistory.unshift(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(0, this.maxHistorySize);
    }

    // Get listeners for this event type
    const listeners = this.listeners.get(event.type) || [];
    const activeListeners = listeners.filter(l => l.isActive);

    // Execute listeners in priority order
    for (const listener of activeListeners) {
      try {
        await listener.handler(event);
      } catch (error) {
        console.error(`Event listener ${listener.id} failed for event ${event.type}:`, error);
        // Continue with other listeners even if one fails
      }
    }
  }

  /**
   * Get event history
   */
  getHistory(limit: number = 100): EventData[] {
    return this.eventHistory.slice(0, limit);
  }

  /**
   * Get registered listeners
   */
  getListeners(eventType?: EventType): EventListener[] {
    if (eventType) {
      return this.listeners.get(eventType) || [];
    }
    
    // Return all listeners
    const allListeners: EventListener[] = [];
    this.listeners.forEach(listeners => {
      listeners.forEach(listener => {
        if (!allListeners.find(l => l.id === listener.id)) {
          allListeners.push(listener);
        }
      });
    });
    
    return allListeners;
  }

  /**
   * Enable/disable a listener
   */
  toggleListener(listenerId: string, isActive: boolean): void {
    this.listeners.forEach(listeners => {
      const listener = listeners.find(l => l.id === listenerId);
      if (listener) {
        listener.isActive = isActive;
      }
    });
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Get listener statistics
   */
  getStats(): {
    totalListeners: number;
    listenersByType: Record<EventType, number>;
    totalEvents: number;
    recentEvents: Array<{ type: EventType; count: number }>;
  } {
    const listenersByType: Record<string, number> = {};
    let totalListeners = 0;

    this.listeners.forEach((listeners, eventType) => {
      listenersByType[eventType] = listeners.length;
      totalListeners += listeners.length;
    });

    // Count recent events (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentEvents = this.eventHistory
      .filter(event => event.timestamp > oneDayAgo)
      .reduce((acc, event) => {
        const existing = acc.find(item => item.type === event.type);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ type: event.type, count: 1 });
        }
        return acc;
      }, [] as Array<{ type: EventType; count: number }>);

    return {
      totalListeners,
      listenersByType: listenersByType as Record<EventType, number>,
      totalEvents: this.eventHistory.length,
      recentEvents
    };
  }
}

// Export singleton instance
export const eventService = new EventService();

// Convenience functions for common events
export const emitInvoiceCompleted = (invoiceData: any) => {
  return eventService.emit({
    id: `invoice_completed_${Date.now()}`,
    type: 'invoice_completed',
    timestamp: new Date(),
    source: 'invoice_module',
    data: invoiceData
  } as any);
};

export const emitPaymentReceived = (paymentData: any) => {
  return eventService.emit({
    id: `payment_received_${Date.now()}`,
    type: 'payment_received', 
    timestamp: new Date(),
    source: 'payment_module',
    data: paymentData
  } as any);
};

export const emitInventoryMovement = (inventoryData: any) => {
  return eventService.emit({
    id: `inventory_${inventoryData.movementType}_${Date.now()}`,
    type: `inventory_${inventoryData.movementType}` as EventType,
    timestamp: new Date(),
    source: 'inventory_module',
    data: inventoryData
  } as any);
};

export const emitExpenseCreated = (expenseData: any) => {
  return eventService.emit({
    id: `expense_created_${Date.now()}`,
    type: 'expense_created',
    timestamp: new Date(),
    source: 'expense_module',
    data: expenseData
  } as any);
};

export const emitServiceRendered = (serviceData: any) => {
  return eventService.emit({
    id: `service_rendered_${Date.now()}`,
    type: 'service_rendered',
    timestamp: new Date(),
    source: 'service_module',
    data: serviceData
  } as any);
};