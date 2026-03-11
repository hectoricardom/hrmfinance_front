// Integration layer to connect invoice module with event system

import { emitInvoiceCompleted } from '../services/eventService';
import { InvoiceEvent } from '../types/eventTypes';

/**
 * Transform invoice data to event format
 */
export const transformInvoiceToEvent = (invoice: any): InvoiceEvent['data'] => {
  return {
    invoice: invoice.invoice || invoice.id,
    customerId: invoice.shipper_consignee?.id || 'UNKNOWN',
    customerName: invoice.shipper_consignee?.name || 'Unknown Customer',
    totalAmount: invoice.totalAmount || 0,
    subtotalAmount: invoice.subtotalAmount || 0,
    taxAmount: invoice.taxAmount || 0,
    discountAmount: invoice.discountAmount || 0,
    arancelesTotal: invoice.arancelesTotal || 0,
    servicesTotal: invoice.servicesTotal || 0,
    reservasTotal: invoice.reservasTotal || 0,
    paymentMethods: {
      cash: invoice.paymentMethods?.cash || 0,
      zelle: invoice.paymentMethods?.zelle || 0,
      creditCard: invoice.paymentMethods?.creditCard || 0,
      check: invoice.paymentMethods?.check || 0,
      bankTransfer: invoice.paymentMethods?.bankTransfer || 0
    },
    currency: invoice.currency || 'USD',
    exchangeRate: invoice.exchangeRate || 1.0,
    items: (invoice.reservas || []).map((item: any) => ({
      id: item.id || `item_${Date.now()}`,
      description: item.description || item.product || '',
      quantity: parseFloat(item.qty) || 0,
      unitPrice: parseFloat(item.price) || 0,
      total: (parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0),
      category: item.category || 'General'
    })),
    services: (invoice.services || []).map((service: any) => ({
      id: service.id || `service_${Date.now()}`,
      type: service.type || 'General',
      description: service.description || '',
      quantity: parseFloat(service.qty) || 0,
      unitPrice: parseFloat(service.arancel) || 0,
      total: (parseFloat(service.qty) || 0) * (parseFloat(service.arancel) || 0)
    })),
    status: invoice.isCompleted ? 'completed' : (invoice.status || 'draft'),
    dueDate: invoice.dueDate,
    completedDate: invoice.isCompleted ? new Date().toISOString().split('T')[0] : undefined
  };
};

/**
 * Emit invoice completed event
 */
export const emitInvoiceCompletedEvent = async (invoice: any): Promise<void> => {
  const eventData = transformInvoiceToEvent(invoice);
  
  const event: InvoiceEvent = {
    id: `invoice_completed_${invoice.id || invoice.invoice}_${Date.now()}`,
    type: 'invoice_completed',
    timestamp: new Date(),
    source: 'invoice_module',
    data: eventData
  };

  await emitInvoiceCompleted(event);
};

/**
 * Emit invoice created event
 */
export const emitInvoiceCreatedEvent = async (invoice: any): Promise<void> => {
  const eventData = transformInvoiceToEvent(invoice);
  
  const event: InvoiceEvent = {
    id: `invoice_created_${invoice.id || invoice.invoice}_${Date.now()}`,
    type: 'invoice_created',
    timestamp: new Date(),
    source: 'invoice_module',
    data: eventData
  };

  await emitInvoiceCompleted(event); // Reuse the same emission function
};

/**
 * Emit invoice updated event
 */
export const emitInvoiceUpdatedEvent = async (invoice: any): Promise<void> => {
  const eventData = transformInvoiceToEvent(invoice);
  
  const event: InvoiceEvent = {
    id: `invoice_updated_${invoice.id || invoice.invoice}_${Date.now()}`,
    type: 'invoice_updated',
    timestamp: new Date(),
    source: 'invoice_module',
    data: eventData
  };

  await emitInvoiceCompleted(event);
};

// Integration helpers for invoice store
export const invoiceEventIntegration = {
  /**
   * Call this when an invoice is completed
   */
  onInvoiceCompleted: emitInvoiceCompletedEvent,
  
  /**
   * Call this when an invoice is created
   */
  onInvoiceCreated: emitInvoiceCreatedEvent,
  
  /**
   * Call this when an invoice is updated
   */
  onInvoiceUpdated: emitInvoiceUpdatedEvent,

  /**
   * Transform function for testing
   */
  transformInvoiceToEvent
};