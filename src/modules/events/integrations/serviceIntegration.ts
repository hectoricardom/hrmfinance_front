// Integration layer to connect service module with event system

import { emitServiceRendered } from '../services/eventService';
import { ServiceEvent } from '../types/eventTypes';

/**
 * Transform service data to event format
 */
export const transformServiceToEvent = (service: any): ServiceEvent['data'] => {
  // Determine service type from description or type field
  const getServiceType = (service: any): ServiceEvent['data']['serviceType'] => {
    const description = (service.description || service.type || '').toLowerCase();
    
    if (description.includes('transport') || description.includes('delivery') || description.includes('shipping')) {
      return 'transport';
    } else if (description.includes('packaging') || description.includes('packing') || description.includes('box')) {
      return 'packaging';
    } else if (description.includes('storage') || description.includes('warehouse') || description.includes('storing')) {
      return 'storage';
    } else if (description.includes('customs') || description.includes('clearance') || description.includes('duty')) {
      return 'customs';
    } else if (description.includes('processing') || description.includes('handling')) {
      return 'processing';
    } else {
      return 'other';
    }
  };

  return {
    serviceId: service.id || `srv_${Date.now()}`,
    serviceType: service.serviceType || getServiceType(service),
    description: service.description || service.type || 'Service Rendered',
    customerId: service.customerId || service.customer?.id || 'UNKNOWN',
    customerName: service.customerName || service.customer?.name || 'Unknown Customer',
    amount: parseFloat(service.amount) || parseFloat(service.total) || (parseFloat(service.qty) * parseFloat(service.arancel)) || 0,
    currency: service.currency || 'USD',
    exchangeRate: parseFloat(service.exchangeRate) || 1.0,
    quantity: parseFloat(service.quantity) || parseFloat(service.qty) || 1,
    unitPrice: parseFloat(service.unitPrice) || parseFloat(service.arancel) || parseFloat(service.price) || 0,
    invoiceId: service.invoiceId || service.relatedInvoice,
    reference: service.reference || service.trackingNumber || `SRV-${Date.now()}`,
    serviceDate: service.serviceDate || service.date || new Date().toISOString().split('T')[0],
    completedDate: service.completedDate || (service.isCompleted ? new Date().toISOString().split('T')[0] : undefined),
    location: service.location || service.origin || service.warehouse,
    weight: parseFloat(service.weight) || undefined,
    dimensions: service.dimensions ? {
      length: parseFloat(service.dimensions.length) || 0,
      width: parseFloat(service.dimensions.width) || 0,
      height: parseFloat(service.dimensions.height) || 0
    } : undefined,
    trackingNumber: service.trackingNumber || service.trackingId,
    carrierName: service.carrierName || service.carrier,
    originCountry: service.originCountry || service.origin,
    destinationCountry: service.destinationCountry || service.destination
  };
};

/**
 * Emit service rendered event
 */
export const emitServiceRenderedEvent = async (service: any): Promise<void> => {
  const eventData = transformServiceToEvent(service);
  
  const event: ServiceEvent = {
    id: `service_rendered_${service.id}_${Date.now()}`,
    type: 'service_rendered',
    timestamp: new Date(),
    source: 'service_module',
    data: eventData
  };

  await emitServiceRendered(event);
};

/**
 * Emit freight processed event
 */
export const emitFreightProcessedEvent = async (freight: any): Promise<void> => {
  const eventData = transformServiceToEvent(freight);
  
  const event: ServiceEvent = {
    id: `freight_processed_${freight.id}_${Date.now()}`,
    type: 'freight_processed',
    timestamp: new Date(),
    source: 'freight_module',
    data: {
      ...eventData,
      serviceType: 'transport'
    }
  };

  await emitServiceRendered(event);
};

/**
 * Emit customs cleared event
 */
export const emitCustomsClearedEvent = async (customs: any): Promise<void> => {
  const eventData = transformServiceToEvent(customs);
  
  const event: ServiceEvent = {
    id: `customs_cleared_${customs.id}_${Date.now()}`,
    type: 'customs_cleared',
    timestamp: new Date(),
    source: 'customs_module',
    data: {
      ...eventData,
      serviceType: 'customs'
    }
  };

  await emitServiceRendered(event);
};

// Integration helpers for service management
export const serviceEventIntegration = {
  /**
   * Call this when a service is completed/rendered
   */
  onServiceRendered: emitServiceRenderedEvent,
  
  /**
   * Call this when freight is processed
   */
  onFreightProcessed: emitFreightProcessedEvent,
  
  /**
   * Call this when customs clearance is completed
   */
  onCustomsCleared: emitCustomsClearedEvent,

  /**
   * Transform function for testing
   */
  transformServiceToEvent,

  /**
   * General service completion handler - routes to appropriate event
   */
  onServiceCompleted: async (service: any): Promise<void> => {
    const serviceType = service.serviceType || 'other';
    
    switch (serviceType) {
      case 'transport':
        await emitFreightProcessedEvent(service);
        break;
      case 'customs':
        await emitCustomsClearedEvent(service);
        break;
      default:
        await emitServiceRenderedEvent(service);
    }
  },

  /**
   * Handle services from invoice completion
   */
  onInvoiceServicesCompleted: async (services: any[], invoiceId: string): Promise<void> => {
    for (const service of services) {
      const serviceWithInvoice = {
        ...service,
        invoiceId,
        isCompleted: true,
        completedDate: new Date().toISOString().split('T')[0]
      };
      
      await emitServiceRenderedEvent(serviceWithInvoice);
    }
  }
};