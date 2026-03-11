// POS Invoice Service
// Handles saving POS sales as invoices for unified reporting and inventory management

import { POSSale } from '../modules/pos/types/posTypes';
import { invoiceStore } from '../modules/invoice/stores/invoiceStore';
import { posToInvoiceConverter, POSInvoiceMetadata } from './posToInvoiceConverter';
import { authStore } from '../stores/authStore';
import { inventoryApi } from './apiAdapter';
import { devLog } from './utils';

export interface POSInvoiceSaveResult {
  success: boolean;
  invoiceId?: string;
  invoiceNumber?: string;
  error?: string;
}

class POSInvoiceService {
  
  // Save POS sale as invoice
  async savePOSSaleAsInvoice(posSale: POSSale): Promise<POSInvoiceSaveResult> {
    try {
      devLog('Converting POS sale to invoice format:', posSale);
      
      // Convert POS sale to invoice format using the exact schema
      const invoiceData = posToInvoiceConverter.convertPOSSaleToInvoice(posSale);
      
      // Override some fields to ensure proper POS identification
      invoiceData.type = 'POS_SALES'; // Distinguish POS sales from regular invoices
      invoiceData.businessId = authStore.getBusinessId() || 'YB100423253156428';
      invoiceData.description = `${invoiceData.description} | Store: ${posSale.storeName || posSale.storeId} | Cashier: ${posSale.cashier.name}`;
      
      devLog('Sending POS invoice data to API:', invoiceData);
      
      // Call the invoice API to create the invoice
      const apiResponse = await inventoryApi.addInvoice(invoiceData);
      
      devLog('API Response:', apiResponse);
      
      // Also save to local store for immediate UI updates
      try {
        await invoiceStore.createInvoice(invoiceData);
        devLog('Invoice also saved to local store');
      } catch (localError) {
        console.warn('Failed to save to local store, but API call succeeded:', localError);
      }
      
      return {
        success: true,
        invoiceId: invoiceData.ssg_inventory_key,
        invoiceNumber: invoiceData.invoice
      };
      
    } catch (error) {
      console.error('Error saving POS sale as invoice via API:', error);
      
      // Fallback: try to save locally if API fails
      try {
        devLog('Attempting local fallback save...');
        const invoiceData = posToInvoiceConverter.convertPOSSaleToInvoice(posSale);
        await invoiceStore.createInvoice(invoiceData);
        
        return {
          success: true,
          invoiceId: invoiceData.ssg_inventory_key,
          invoiceNumber: invoiceData.invoice
        };
      } catch (fallbackError) {
        console.error('Both API and local save failed:', fallbackError);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to save invoice via API and local store'
        };
      }
    }
  }
  
  // Batch save multiple POS sales (for end-of-day processing)
  async batchSavePOSSales(posSales: POSSale[]): Promise<{
    successCount: number;
    failureCount: number;
    results: POSInvoiceSaveResult[];
  }> {
    const results: POSInvoiceSaveResult[] = [];
    let successCount = 0;
    let failureCount = 0;
    
    devLog(`Starting batch save of ${posSales.length} POS sales to invoice API`);
    
    // Process sales in batches to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < posSales.length; i += batchSize) {
      const batch = posSales.slice(i, i + batchSize);
      
      // Process batch concurrently
      const batchPromises = batch.map(sale => this.savePOSSaleAsInvoice(sale));
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
          if (result.value.success) {
            successCount++;
          } else {
            failureCount++;
          }
        } else {
          results.push({
            success: false,
            error: `Failed to process sale: ${result.reason}`
          });
          failureCount++;
        }
      });
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < posSales.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    devLog(`Batch save completed: ${successCount} successful, ${failureCount} failed`);
    
    return {
      successCount,
      failureCount,
      results
    };
  }
  
  // Get POS sales from invoices (for reporting)
  getPOSInvoices(): any[] {
    const allInvoices = invoiceStore.state.invoices;
    
    return allInvoices.filter(invoice => 
      invoice.type === 'POS_SALES' || 
      invoice.invoice?.startsWith('POS-') ||
      invoice.posTransactionData?.isPOSTransaction === true
    );
  }
  
  // Get POS sales summary for a date range
  getPOSSalesSummary(startDate?: Date, endDate?: Date): {
    totalSales: number;
    totalRevenue: number;
    averageTransactionValue: number;
    paymentMethodBreakdown: Record<string, number>;
    storeBreakdown: Record<string, number>;
    cashierBreakdown: Record<string, number>;
  } {
    const posInvoices = this.getPOSInvoices();
    
    // Filter by date range if provided
    const filteredInvoices = posInvoices.filter(invoice => {
      if (!startDate && !endDate) return true;
      
      const invoiceDate = new Date(invoice.createDate);
      
      if (startDate && invoiceDate < startDate) return false;
      if (endDate && invoiceDate > endDate) return false;
      
      return true;
    });
    
    const totalSales = filteredInvoices.length;
    const totalRevenue = filteredInvoices.reduce((sum, invoice) => sum + (invoice.total || 0), 0);
    const averageTransactionValue = totalSales > 0 ? totalRevenue / totalSales : 0;
    
    // Payment method breakdown
    const paymentMethodBreakdown: Record<string, number> = {};
    const storeBreakdown: Record<string, number> = {};
    const cashierBreakdown: Record<string, number> = {};
    
    filteredInvoices.forEach(invoice => {
      const posData = invoice.posTransactionData as POSInvoiceMetadata;
      
      if (posData?.paymentBreakdown) {
        Object.entries(posData.paymentBreakdown).forEach(([method, amount]) => {
          if (amount > 0) {
            paymentMethodBreakdown[method] = (paymentMethodBreakdown[method] || 0) + amount;
          }
        });
      }
      
      // Store breakdown
      const storeName = invoice.storeDisplayName || invoice.store || 'Unknown';
      storeBreakdown[storeName] = (storeBreakdown[storeName] || 0) + (invoice.total || 0);
      
      // Cashier breakdown
      if (posData?.cashierInfo?.name) {
        const cashierName = posData.cashierInfo.name;
        cashierBreakdown[cashierName] = (cashierBreakdown[cashierName] || 0) + (invoice.total || 0);
      }
    });
    
    return {
      totalSales,
      totalRevenue,
      averageTransactionValue,
      paymentMethodBreakdown,
      storeBreakdown,
      cashierBreakdown
    };
  }
  
  // Check if POS transaction already exists as invoice
  isPOSTransactionSaved(posTransactionId: string): boolean {
    const allInvoices = invoiceStore.state.invoices;
    
    return allInvoices.some(invoice => 
      invoice.posTransactionData?.posTransactionId === posTransactionId
    );
  }
  
  // Update POS transaction metadata (e.g., mark receipt as printed)
  async updatePOSTransactionMetadata(posTransactionId: string, updates: Partial<POSInvoiceMetadata>): Promise<boolean> {
    try {
      const allInvoices = invoiceStore.state.invoices;
      const invoiceIndex = allInvoices.findIndex(invoice => 
        invoice.posTransactionData?.posTransactionId === posTransactionId
      );
      
      if (invoiceIndex >= 0) {
        const updatedInvoice = {
          ...allInvoices[invoiceIndex],
          posTransactionData: {
            ...allInvoices[invoiceIndex].posTransactionData,
            ...updates
          }
        };
        
        // Update in the store
        invoiceStore.updateInvoice(updatedInvoice);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error updating POS transaction metadata:', error);
      return false;
    }
  }
}

// Export singleton instance
export const posInvoiceService = new POSInvoiceService();

// Utility functions
export const savePOSSaleAsInvoice = (posSale: POSSale): Promise<POSInvoiceSaveResult> => {
  return posInvoiceService.savePOSSaleAsInvoice(posSale);
};

export const isPOSTransactionSaved = (posTransactionId: string): boolean => {
  return posInvoiceService.isPOSTransactionSaved(posTransactionId);
};

export const getPOSSalesSummary = (startDate?: Date, endDate?: Date) => {
  return posInvoiceService.getPOSSalesSummary(startDate, endDate);
};