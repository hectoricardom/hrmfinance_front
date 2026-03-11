// POS to Invoice Converter Service
// Converts POS sales to invoice format for unified storage and reporting

import { POSSale, POSProduct } from '../modules/pos/types/posTypes';
import { InvoiceForm, InvoiceProduct, PaymentMethod, ShipperConsignee } from '../modules/invoice/types/invoiceTypes';

export interface POSInvoiceMetadata {
  isPOSTransaction: boolean;
  posTransactionId: string;
  posTimestamp: string;
  cashierInfo: {
    id: string;
    name: string;
  };
  paymentBreakdown: {
    cash: number;
    creditCard: number;
    debitCard: number;
    zelle: number;
    bankTransfer: number;
    check: number;
    giftCard: number;
    googlePay: number;
    other: number;
  };
  changeDue?: number;
  receiptPrinted?: boolean;
}

class POSToInvoiceConverter {
  
  // Convert POS sale to invoice format
  convertPOSSaleToInvoice(posSale: POSSale): any {
    
    // Convert POS products to invoice products format
    const invoiceProducts = posSale.products.map(posProduct => ({
      id: posProduct.id,
      product: {
        id: posProduct.product.id,
        code: posProduct.product.code || posProduct.product.sku || '',
        label: posProduct.product.label,
        price: posProduct.product.price || 0
      },
      qty: posProduct.qty,
      salePrice: posProduct.unitPrice,
      total: posProduct.total
    }));

    // Calculate subtotals
    const productSubtotal = invoiceProducts.reduce((sum, product) => sum + product.total, 0);
    const reservaSubtotal = 0; // POS doesn't have reservas
    const serviceSubtotal = 0; // POS doesn't have services yet
    const transportTotal = 0; // POS is immediate sale
    const subtotalBeforeTax = productSubtotal + reservaSubtotal + serviceSubtotal;

    // Calculate tax amounts
    const taxPercent = this.calculateTaxPercent(posSale.totalTax, posSale.subtotal);
    const taxAmount = posSale.totalTax || 0;
    const cashPaymentRatio = (posSale.paymentMethods.cash || 0) / posSale.total;
    const taxSavings = 0; // No tax exemptions in basic POS

    // Convert payment methods to invoice format
    const paymentMethods = {
      taxOnTotal: true,
      taxPercent: taxPercent,
      exemptTaxOnCash: false,
      cash: posSale.paymentMethods.cash || 0,
      zelle: posSale.paymentMethods.zelle || 0,
      creditCard: (posSale.paymentMethods.creditCard || 0) + 
                  (posSale.paymentMethods.debitCard || 0) + 
                  (posSale.paymentMethods.googlePay || 0)
    };

    // Convert customer to shipper_consignee format
    const shipper_consignee = posSale.customer ? {
      firstName: posSale.customer.firstName || '',
      middleName: '',
      lastName: posSale.customer.lastName || '',
      lastName2: '',
      phoneNumber: posSale.customer.phoneNumber || '',
      cid: posSale.customer.cid || '',
      dob: '',
      passport: '',
      address: posSale.customer.address || '',
      altPhoneNumber: '',
      passportS: '',
      name: posSale.customer.name,
      addressS: posSale.customer.address || '',
      phoneNumberS: posSale.customer.phoneNumber || '',
      idS: posSale.customer.cid || '',
      id: posSale.customer.id || '',
      fullName: `${posSale.customer.firstName || ''} ${posSale.customer.lastName || ''}`.trim() || posSale.customer.name,
      ybbetwen1: '',
      ybcity: '',
      ybestate: '',
      ybreparto: '',
      ybstreet: '',
      ybstreetNo: ''
    } : {
      firstName: '',
      middleName: '',
      lastName: '',
      lastName2: '',
      phoneNumber: '',
      cid: '',
      dob: '',
      passport: '',
      address: '',
      altPhoneNumber: '',
      passportS: '',
      name: 'Walk-in Customer',
      addressS: '',
      phoneNumberS: '',
      idS: '',
      id: '',
      fullName: 'Walk-in Customer',
      ybbetwen1: '',
      ybcity: '',
      ybestate: '',
      ybreparto: '',
      ybstreet: '',
      ybstreetNo: ''
    };

    // Create POS metadata for identification and detailed tracking
    const posMetadata: POSInvoiceMetadata = {
      isPOSTransaction: true,
      posTransactionId: posSale.id,
      posTimestamp: posSale.timestamp,
      cashierInfo: posSale.cashier,
      paymentBreakdown: {
        cash: posSale.paymentMethods.cash || 0,
        creditCard: posSale.paymentMethods.creditCard || 0,
        debitCard: posSale.paymentMethods.debitCard || 0,
        zelle: posSale.paymentMethods.zelle || 0,
        bankTransfer: posSale.paymentMethods.bankTransfer || 0,
        check: posSale.paymentMethods.check || 0,
        giftCard: posSale.paymentMethods.giftCard || 0,
        googlePay: posSale.paymentMethods.googlePay || 0,
        other: posSale.paymentMethods.other || 0
      },
      changeDue: posSale.change,
      receiptPrinted: posSale.receiptPrinted
    };

    // Create the complete invoice matching the exact schema
    const invoice = {
      // Basic invoice info
      invoice: posSale.saleNumber,
      description: `POS Sale - ${posSale.saleNumber}${posSale.notes ? ` - ${posSale.notes}` : ''}`,
      store: posSale.storeId || 'default',
      guide: '', // POS doesn't use guides
      
      // Customer info
      shipper_consignee,
      
      // Products, reservas, services, bulks
      products: invoiceProducts,
      reservas: [], // POS doesn't have reservas
      services: [], // POS doesn't have services yet
      bulks: [], // POS doesn't use bulks
      
      // Shipping and packaging
      packagesOrder: false, // POS is immediate sale
      shippingMethod: '', // POS doesn't ship
      
      // Payment info
      paymentMethods,
      
      // Invoice type and identifiers
      type: 'SALES',
      ssg_inventory_key: `POS-INV-${Date.now()}`,
      ssg_sorder_key: `POS-SO-${Date.now()}`,
      createDate: new Date(posSale.timestamp).getTime(),
      businessId: 'YB100423253156428', // Default business ID
      isCompleted: true,
      
      // Calculated totals
      productSubtotal,
      reservaSubtotal,
      serviceSubtotal,
      subtotalBeforeTax,
      transportTotal,
      taxAmount,
      taxSavings,
      total: posSale.total,
      taxCalculationMethod: 'subtotal',
      cashPaymentRatio,
      
      // Timestamps
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      
      // POS-specific metadata (for internal tracking)
      posMetadata
    };

    return invoice;
  }

  // Calculate tax percentage from totals
  private calculateTaxPercent(totalTax: number, subtotal: number): number {
    if (subtotal <= 0) return 0;
    return Math.round((totalTax / subtotal) * 100 * 100) / 100; // Round to 2 decimal places
  }

  // Generate unique invoice number for POS sales
  generatePOSInvoiceNumber(storeId: string): string {
    const timestamp = Date.now();
    const storeCode = storeId.substring(0, 3).toUpperCase();
    return `POS-${storeCode}-${timestamp}`;
  }

  // Check if an invoice is from POS
  static isPOSInvoice(invoice: any): boolean {
    return invoice.posMetadata?.isPOSTransaction === true ||
           invoice.invoice?.startsWith('POS-') ||
           invoice.description?.includes('POS Sale');
  }

  // Extract POS metadata from invoice
  static getPOSMetadata(invoice: any): POSInvoiceMetadata | null {
    return invoice.posMetadata || null;
  }

  // Convert invoice back to POS sale format (for reports)
  convertInvoiceToPOSSale(invoice: any): POSSale | null {
    if (!POSToInvoiceConverter.isPOSInvoice(invoice)) {
      return null;
    }

    const metadata = invoice.posMetadata;
    if (!metadata) return null;

    // Reconstruct POS sale from invoice and metadata
    return {
      id: metadata.posTransactionId,
      saleNumber: invoice.invoice,
      timestamp: metadata.posTimestamp,
      cashier: metadata.cashierInfo,
      customer: invoice.shipper_consignee.name !== 'Walk-in Customer' ? {
        id: 'invoice-customer',
        name: invoice.shipper_consignee.name,
        firstName: invoice.shipper_consignee.firstName,
        lastName: invoice.shipper_consignee.lastName,
        phoneNumber: invoice.shipper_consignee.phoneNumber,
        email: invoice.shipper_consignee.email,
        address: invoice.shipper_consignee.address,
        cid: invoice.shipper_consignee.cid
      } : undefined,
      products: invoice.products.map(p => ({
        id: p.id,
        product: {
          id: p.product.id,
          code: p.product.code,
          label: p.product.label,
          price: p.product.price || p.salePrice,
          category: '',
          sku: p.product.code
        },
        qty: p.qty,
        unitPrice: p.salePrice,
        discount: 0,
        discountPercent: 0,
        total: p.total,
        taxRate: 0
      })),
      services: [],
      subtotal: invoice.products.reduce((sum, p) => sum + p.total, 0),
      discounts: [],
      totalDiscount: 0,
      taxes: [],
      totalTax: (invoice.products.reduce((sum, p) => sum + p.total, 0) * invoice.paymentMethods.taxPercent / 100),
      total: invoice.products.reduce((sum, p) => sum + p.total, 0) * (1 + invoice.paymentMethods.taxPercent / 100),
      paymentMethods: {
        cash: metadata.paymentBreakdown.cash,
        creditCard: metadata.paymentBreakdown.creditCard,
        debitCard: metadata.paymentBreakdown.debitCard,
        zelle: metadata.paymentBreakdown.zelle,
        bankTransfer: metadata.paymentBreakdown.bankTransfer,
        check: metadata.paymentBreakdown.check,
        giftCard: metadata.paymentBreakdown.giftCard,
        googlePay: metadata.paymentBreakdown.googlePay,
        other: metadata.paymentBreakdown.other
      },
      totalPaid: Object.values(metadata.paymentBreakdown).reduce((sum, amount) => sum + amount, 0),
      change: metadata.changeDue || 0,
      status: 'COMPLETED',
      notes: invoice.description.replace(`POS Sale - ${invoice.invoice}`, '').replace(/^\s*-\s*/, ''),
      storeId: invoice.store,
      storeName: invoice.store,
      receiptPrinted: metadata.receiptPrinted || false
    };
  }
}

// Export singleton instance
export const posToInvoiceConverter = new POSToInvoiceConverter();

// Utility functions
export const createPOSInvoice = (posSale: POSSale): any => {
  return posToInvoiceConverter.convertPOSSaleToInvoice(posSale);
};

export const isPOSInvoice = (invoice: any): boolean => {
  return POSToInvoiceConverter.isPOSInvoice(invoice);
};

export const getPOSMetadata = (invoice: any): POSInvoiceMetadata | null => {
  return POSToInvoiceConverter.getPOSMetadata(invoice);
};