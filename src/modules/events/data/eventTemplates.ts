import { EventTemplate, FieldDefinition } from '../types/eventTypes';

// Helper function to create field definitions
const createField = (
  type: FieldDefinition['type'],
  description: string,
  required: boolean = false,
  options?: any
): FieldDefinition => ({
  type,
  description,
  required,
  ...options
});



/*

{
    "invoice": "B47G1D-YY_8635-20250810",
    "description": "",
    "store": "YY_8665",
    "guide": "2521",
    "shipper_consignee": {
        "name": "SUCEL NUNEZ JORGE",
        "firstName": "YASEL",
        "middleName": "",
        "lastName": "VASQUES JORGE",
        "lastName2": "",
        "phoneNumber": "531101638",
        "phoneNumberS": "",
        "cid": "82072829422",
        "passport": "",
        "address": "Calle undefined, , "
    },
    "products": [
        {
            "id": "1755310725671",
            "product": {
                "id": "AjlXorLU63dtPDrm",
                "code": "K89G06815",
                "label": "SAZON COMPLETO BADIA 7 OZ",
                "price": 0
            },
            "qty": 4,
            "salePrice": 8,
            "total": 32
        }
    ],
    "reservas": [
        {
            "id": "1755276669614",
            "type": "Ropa",
            "qty": 120,
            "price": 4,
            "arancel": 0,
            "total": 480
        }
    ],
    "services": [
        {
            "id": "1755395460664",
            "type": "🚛 Transportación",
            "qty": 3,
            "price": 0,
            "arancel": 20,
            "total": 60
        }
    ],
    "packagesOrder": false,
    "shippingMethod": "AEREO",
    "paymentMethods": {
        "taxOnTotal": false,
        "taxPercent": 7,
        "exemptTaxOnCash": true,
        "cash": 300,
        "zelle": 292,
        "creditCard": 0
    },
    "createDate": "2025-08-13",
    "type": "SALES",
    "ssg_inventory_key": "INVOICE-1755395719878",
    "ssg_sorder_key": "SO-1755395719878",
    "businessId": "YB100423253156428",
    "isCompleted": true,
    "productSubtotal": 32,
    "reservaSubtotal": 480,
    "serviceSubtotal": 60,
    "subtotalBeforeTax": 572,
    "taxAmount": 19.749459459459462,
    "taxSavings": 20.290540540540544,
    "total": 591.7494594594594,
    "taxCalculationMethod": "subtotal",
    "cashPaymentRatio": 0.5067567567567568,
    "referenceHId": "xxhdlfvvmgvsn87q_1755395721386"
}
*/



// Invoice Event Template
const invoiceEventTemplate: EventTemplate = {
  eventType: 'invoice_completed',
  displayName: 'Invoice Completed',
  description: 'Triggered when an invoice is marked as completed',
  category: 'financial',
  dataStructure: {
    // Basic Invoice Info
    'data.invoice': createField('string', 'Invoice number', true, { example: 'B47G1D-YY_8635-20250810' }),
    'data.description': createField('string', 'Invoice description', false, { example: 'Customer order description' }),
    'data.store': createField('string', 'Store code', true, { example: 'YY_8665' }),
    'data.guide': createField('string', 'Guide number', true, { example: '2521' }),
    'data.createDate': createField('date', 'Invoice creation date', true, { example: '2025-08-13' }),
    'data.type': createField('string', 'Invoice type', true, { example: 'SALES' }),
    'data.isCompleted': createField('boolean', 'Invoice completion status', true, { example: true }),
    
    // Shipper/Consignee Information
    'data.shipper_consignee.name': createField('string', 'Full name', true, { example: 'SUCEL NUNEZ JORGE' }),
    'data.shipper_consignee.firstName': createField('string', 'First name', false, { example: 'YASEL' }),
    'data.shipper_consignee.middleName': createField('string', 'Middle name', false, { example: '' }),
    'data.shipper_consignee.lastName': createField('string', 'Last name', false, { example: 'VASQUES JORGE' }),
    'data.shipper_consignee.lastName2': createField('string', 'Second last name', false, { example: '' }),
    'data.shipper_consignee.phoneNumber': createField('string', 'Primary phone number', false, { example: '531101638' }),
    'data.shipper_consignee.phoneNumberS': createField('string', 'Secondary phone number', false, { example: '' }),
    'data.shipper_consignee.cid': createField('string', 'Customer ID number', false, { example: '82072829422' }),
    'data.shipper_consignee.passport': createField('string', 'Passport number', false, { example: '' }),
    'data.shipper_consignee.address': createField('string', 'Full address', false, { example: 'Calle undefined' }),
    
    // Products Array Fields - Complete structure
    'data.products[0].id': createField('string', 'Product line item ID', false, { example: '1755310725671' }),
    'data.products[0].product.id': createField('string', 'Product ID', false, { example: 'AjlXorLU63dtPDrm' }),
    'data.products[0].product.code': createField('string', 'Product code', false, { example: 'K89G06815' }),
    'data.products[0].product.label': createField('string', 'Product label/name', false, { example: 'SAZON COMPLETO BADIA 7 OZ' }),
    'data.products[0].product.price': createField('number', 'Product base price', false, { format: 'currency', example: 0 }),
    'data.products[0].qty': createField('number', 'Product quantity', false, { example: 4 }),
    'data.products[0].salePrice': createField('number', 'Product sale price', false, { format: 'currency', example: 8 }),
    'data.products[0].total': createField('number', 'Product line total', false, { format: 'currency', example: 32 }),
    
    // Reservas Array Fields - Complete structure  
    'data.reservas[0].id': createField('string', 'Reserva line item ID', false, { example: '1755276669614' }),
    'data.reservas[0].type': createField('string', 'Reserva type', false, { example: 'Ropa' }),
    'data.reservas[0].qty': createField('number', 'Reserva quantity in lbs', false, { example: 120 }),
    'data.reservas[0].price': createField('number', 'Reserva price per lb', false, { format: 'currency', example: 4 }),
    'data.reservas[0].arancel': createField('number', 'Reserva customs fee', false, { format: 'currency', example: 0 }),
    'data.reservas[0].total': createField('number', 'Reserva line total', false, { format: 'currency', example: 480 }),
    
    // Services Array Fields - Complete structure
    'data.services[0].id': createField('string', 'Service line item ID', false, { example: '1755395460664' }),
    'data.services[0].type': createField('string', 'Service type', false, { example: '🚛 Transportación' }),
    'data.services[0].qty': createField('number', 'Service quantity', false, { example: 3 }),
    'data.services[0].price': createField('number', 'Service base price', false, { format: 'currency', example: 0 }),
    'data.services[0].arancel': createField('number', 'Service fee per unit', false, { format: 'currency', example: 20 }),
    'data.services[0].total': createField('number', 'Service line total', false, { format: 'currency', example: 60 }),
    
    // Shipping and Order Info
    'data.packagesOrder': createField('boolean', 'Is packages order', false, { example: false }),
    'data.shippingMethod': createField('string', 'Shipping method', true, { example: 'AEREO', options: [{ value: 'AEREO', label: 'Air' }, { value: 'MARITIMO', label: 'Maritime' }] }),
    
    // Payment Methods - Complete structure
    'data.paymentMethods.taxOnTotal': createField('boolean', 'Tax applied on total', false, { example: false }),
    'data.paymentMethods.taxPercent': createField('number', 'Tax percentage', false, { example: 7 }),
    'data.paymentMethods.exemptTaxOnCash': createField('boolean', 'Cash payment tax exempt', false, { example: true }),
    'data.paymentMethods.cash': createField('number', 'Cash payment amount', false, { format: 'currency', example: 300.00 }),
    'data.paymentMethods.zelle': createField('number', 'Zelle payment amount', false, { format: 'currency', example: 292.00 }),
    'data.paymentMethods.creditCard': createField('number', 'Credit card payment amount', false, { format: 'currency', example: 0.00 }),
    
    // Business and System Keys
    'data.businessId': createField('string', 'Business ID', true, { example: 'YB100423253156428' }),
    'data.ssg_inventory_key': createField('string', 'Inventory system key', false, { example: 'INVOICE-1755395719878' }),
    'data.ssg_sorder_key': createField('string', 'Sales order key', false, { example: 'SO-1755395719878' }),
    'data.referenceHId': createField('string', 'Reference hash ID', false, { example: 'xxhdlfvvmgvsn87q_1755395721386' }),
    
    // Calculated Totals - Complete structure
    'data.productSubtotal': createField('number', 'Products subtotal', true, { format: 'currency', example: 32.00 }),
    'data.reservaSubtotal': createField('number', 'Reservas subtotal', true, { format: 'currency', example: 480.00 }),
    'data.serviceSubtotal': createField('number', 'Services subtotal', true, { format: 'currency', example: 60.00 }),
    'data.transportTotal': createField('number', 'Transporte subtotal', true, { format: 'currency', example: 20.00 }),
    
    'data.subtotalBeforeTax': createField('number', 'Subtotal before tax', true, { format: 'currency', example: 572.00 }),
    'data.taxAmount': createField('number', 'Total tax amount', true, { format: 'currency', example: 19.75 }),
    'data.taxSavings': createField('number', 'Tax savings amount', false, { format: 'currency', example: 20.29 }),
    'data.total': createField('number', 'Final total amount', true, { format: 'currency', example: 591.75 }),
    'data.taxCalculationMethod': createField('string', 'Tax calculation method', false, { example: 'subtotal' }),
    'data.cashPaymentRatio': createField('number', 'Cash payment ratio', false, { example: 0.51 })
  },
  examples: [
    {
      name: 'Cash Sale Invoice',
      description: 'Invoice paid entirely in cash',
      sampleData: {
        invoice: 'INV-2024-001',
        customerId: 'CUST-001',
        customerName: 'ABC Corporation',
        totalAmount: 1500.00,
        subtotalAmount: 1300.00,
        taxAmount: 200.00,
        paymentMethods: { cash: 1500.00, zelle: 0, creditCard: 0, check: 0, bankTransfer: 0 },
        currency: 'USD',
        status: 'completed'
      }
    },
    {
      name: 'Mixed Payment Invoice',
      description: 'Invoice with cash and Zelle payments',
      sampleData: {
        invoice: 'INV-2024-002',
        customerId: 'CUST-002', 
        customerName: 'XYZ Inc',
        totalAmount: 2000.00,
        subtotalAmount: 1800.00,
        taxAmount: 200.00,
        paymentMethods: { cash: 1200.00, zelle: 800.00, creditCard: 0, check: 0, bankTransfer: 0 },
        currency: 'USD',
        status: 'completed'
      }
    }
  ]
};

// Payment Event Template
const paymentEventTemplate: EventTemplate = {
  eventType: 'payment_received',
  displayName: 'Payment Received',
  description: 'Triggered when a payment is received from a customer',
  category: 'financial',
  dataStructure: {
    'data.paymentId': createField('string', 'Payment ID', true, { example: 'PAY-2024-001' }),
    'data.invoiceId': createField('string', 'Related invoice ID', false, { example: 'INV-2024-001' }),
    'data.customerId': createField('string', 'Customer ID', true),
    'data.customerName': createField('string', 'Customer name', true, { example: 'ABC Corporation' }),
    'data.amount': createField('number', 'Payment amount', true, { format: 'currency', example: 1500.00 }),
    'data.paymentMethod': createField('string', 'Payment method', true, {
      options: [
        { value: 'cash', label: 'Cash' },
        { value: 'zelle', label: 'Zelle' },
        { value: 'creditCard', label: 'Credit Card' },
        { value: 'check', label: 'Check' },
        { value: 'bankTransfer', label: 'Bank Transfer' }
      ],
      example: 'cash'
    }),
    'data.currency': createField('string', 'Currency code', true, { example: 'USD' }),
    'data.exchangeRate': createField('number', 'Exchange rate', false, { example: 1.0 }),
    'data.reference': createField('string', 'Payment reference', true, { example: 'REF-001' }),
    'data.bankAccount': createField('string', 'Bank account used', false, { example: 'BOA-Checking-001' }),
    'data.depositDate': createField('date', 'Date payment was deposited', false, { format: 'date', example: '2024-01-15' })
  },
  examples: [
    {
      name: 'Cash Payment',
      description: 'Cash payment for an invoice',
      sampleData: {
        paymentId: 'PAY-2024-001',
        invoiceId: 'INV-2024-001',
        customerId: 'CUST-001',
        customerName: 'ABC Corporation',
        amount: 1500.00,
        paymentMethod: 'cash',
        currency: 'USD',
        reference: 'CASH-001'
      }
    }
  ]
};

// Inventory Event Template
const inventoryEventTemplate: EventTemplate = {
  eventType: 'inventory_received',
  displayName: 'Inventory Received',
  description: 'Triggered when inventory is received from suppliers',
  category: 'inventory',
  dataStructure: {
    'data.movementId': createField('string', 'Movement ID', true, { example: 'MOV-2024-001' }),
    'data.productId': createField('string', 'Product ID', true, { example: 'PROD-001' }),
    'data.productName': createField('string', 'Product name', true, { example: 'Widget A' }),
    'data.sku': createField('string', 'Product SKU', true, { example: 'WID-A-001' }),
    'data.category': createField('string', 'Product category', true, { example: 'Electronics' }),
    'data.quantity': createField('number', 'Quantity received', true, { example: 100 }),
    'data.unitCost': createField('number', 'Cost per unit', true, { format: 'currency', example: 25.00 }),
    'data.totalCost': createField('number', 'Total cost', true, { format: 'currency', example: 2500.00 }),
    'data.supplierId': createField('string', 'Supplier ID', false, { example: 'SUPP-001' }),
    'data.supplierName': createField('string', 'Supplier name', false, { example: 'Acme Supplies' }),
    'data.purchaseOrderId': createField('string', 'Purchase order ID', false, { example: 'PO-2024-001' }),
    'data.warehouseLocation': createField('string', 'Warehouse location', true, { example: 'WH-A-001' }),
    'data.movementType': createField('string', 'Type of movement', true, {
      options: [
        { value: 'purchase', label: 'Purchase' },
        { value: 'sale', label: 'Sale' },
        { value: 'adjustment', label: 'Adjustment' },
        { value: 'transfer', label: 'Transfer' }
      ],
      example: 'purchase'
    })
  },
  examples: [
    {
      name: 'Product Purchase',
      description: 'Products received from supplier',
      sampleData: {
        movementId: 'MOV-2024-001',
        productId: 'PROD-001',
        productName: 'Widget A',
        sku: 'WID-A-001',
        category: 'Electronics',
        quantity: 100,
        unitCost: 25.00,
        totalCost: 2500.00,
        supplierId: 'SUPP-001',
        supplierName: 'Acme Supplies',
        movementType: 'purchase'
      }
    }
  ]
};

// Expense Event Template
const expenseEventTemplate: EventTemplate = {
  eventType: 'expense_created',
  displayName: 'Expense Created',
  description: 'Triggered when a new expense is created',
  category: 'financial',
  dataStructure: {
    'data.expenseId': createField('string', 'Expense ID', true, { example: 'EXP-2024-001' }),
    'data.category': createField('string', 'Expense category', true, {
      options: [
        { value: 'office_supplies', label: 'Office Supplies' },
        { value: 'travel', label: 'Travel' },
        { value: 'utilities', label: 'Utilities' },
        { value: 'rent', label: 'Rent' },
        { value: 'equipment', label: 'Equipment' },
        { value: 'marketing', label: 'Marketing' },
        { value: 'professional_services', label: 'Professional Services' }
      ],
      example: 'office_supplies'
    }),
    'data.subcategory': createField('string', 'Expense subcategory', false, { example: 'Stationery' }),
    'data.description': createField('string', 'Expense description', true, { example: 'Office supplies from Staples' }),
    'data.amount': createField('number', 'Expense amount', true, { format: 'currency', example: 250.00 }),
    'data.currency': createField('string', 'Currency code', true, { example: 'USD' }),
    'data.vendorId': createField('string', 'Vendor ID', false, { example: 'VEND-001' }),
    'data.vendorName': createField('string', 'Vendor name', false, { example: 'Staples Inc' }),
    'data.employeeId': createField('string', 'Employee ID', false, { example: 'EMP-001' }),
    'data.employeeName': createField('string', 'Employee name', false, { example: 'John Doe' }),
    'data.departmentId': createField('string', 'Department ID', false, { example: 'DEPT-001' }),
    'data.departmentName': createField('string', 'Department name', false, { example: 'Administration' }),
    'data.paymentMethod': createField('string', 'Payment method', true, {
      options: [
        { value: 'cash', label: 'Cash' },
        { value: 'check', label: 'Check' },
        { value: 'creditCard', label: 'Credit Card' },
        { value: 'bankTransfer', label: 'Bank Transfer' }
      ],
      example: 'creditCard'
    }),
    'data.reference': createField('string', 'Reference number', true, { example: 'REF-001' }),
    'data.receiptAttached': createField('boolean', 'Receipt attached', false, { example: true })
  },
  examples: [
    {
      name: 'Office Supplies Expense',
      description: 'Office supplies purchased with credit card',
      sampleData: {
        expenseId: 'EXP-2024-001',
        category: 'office_supplies',
        description: 'Office supplies from Staples',
        amount: 250.00,
        currency: 'USD',
        vendorName: 'Staples Inc',
        paymentMethod: 'creditCard',
        reference: 'CC-001',
        receiptAttached: true
      }
    }
  ]
};

// Service Event Template
const serviceEventTemplate: EventTemplate = {
  eventType: 'service_rendered',
  displayName: 'Service Rendered',
  description: 'Triggered when a service is completed for a customer',
  category: 'operational',
  dataStructure: {
    'data.serviceId': createField('string', 'Service ID', true, { example: 'SRV-2024-001' }),
    'data.serviceType': createField('string', 'Type of service', true, {
      options: [
        { value: 'transport', label: 'Transportation' },
        { value: 'packaging', label: 'Packaging' },
        { value: 'storage', label: 'Storage' },
        { value: 'customs', label: 'Customs Clearance' },
        { value: 'processing', label: 'Processing' },
        { value: 'other', label: 'Other' }
      ],
      example: 'transport'
    }),
    'data.description': createField('string', 'Service description', true, { example: 'Transportation from Miami to NYC' }),
    'data.customerId': createField('string', 'Customer ID', true, { example: 'CUST-001' }),
    'data.customerName': createField('string', 'Customer name', true, { example: 'ABC Corporation' }),
    'data.amount': createField('number', 'Service amount', true, { format: 'currency', example: 500.00 }),
    'data.currency': createField('string', 'Currency code', true, { example: 'USD' }),
    'data.quantity': createField('number', 'Service quantity', false, { example: 1 }),
    'data.unitPrice': createField('number', 'Price per unit', false, { format: 'currency', example: 500.00 }),
    'data.invoiceId': createField('string', 'Related invoice ID', false, { example: 'INV-2024-001' }),
    'data.reference': createField('string', 'Service reference', true, { example: 'TRANS-001' }),
    'data.serviceDate': createField('date', 'Date service was performed', true, { format: 'date', example: '2024-01-15' }),
    'data.location': createField('string', 'Service location', false, { example: 'Miami, FL' }),
    'data.weight': createField('number', 'Weight (if applicable)', false, { example: 150.5 }),
    'data.trackingNumber': createField('string', 'Tracking number', false, { example: 'TRK-123456' })
  },
  examples: [
    {
      name: 'Transportation Service',
      description: 'Freight transportation service',
      sampleData: {
        serviceId: 'SRV-2024-001',
        serviceType: 'transport',
        description: 'Transportation from Miami to NYC',
        customerId: 'CUST-001',
        customerName: 'ABC Corporation',
        amount: 500.00,
        currency: 'USD',
        reference: 'TRANS-001',
        serviceDate: '2024-01-15',
        weight: 150.5
      }
    }
  ]
};

// Create invoice_created template based on invoice_completed
const invoiceCreatedTemplate: EventTemplate = {
  ...invoiceEventTemplate,
  eventType: 'invoice_created',
  displayName: 'Invoice Created',
  description: 'Triggered when a new invoice is created'
};

// Export all templates
export const eventTemplates: Record<string, EventTemplate> = {
  invoice_completed: invoiceEventTemplate,
  invoice_created: invoiceCreatedTemplate,
  payment_received: paymentEventTemplate,
  inventory_received: inventoryEventTemplate,
  inventory_sold: inventoryEventTemplate, // Reuse same structure
  expense_created: expenseEventTemplate,
  expense_approved: expenseEventTemplate, // Reuse same structure  
  service_rendered: serviceEventTemplate
};

// Helper function to get template by event type
export const getEventTemplate = (eventType: string): EventTemplate | null => {
  return eventTemplates[eventType] || null;
};

// Helper function to get all available fields for an event type
export const getAvailableFields = (eventType: string): Array<{
  path: string;
  definition: FieldDefinition;
}> => {
  const template = getEventTemplate(eventType);
  if (!template) return [];

  return Object.entries(template.dataStructure).map(([path, definition]) => ({
    path,
    definition
  }));
};

// Helper function to validate event data against template
export const validateEventData = (eventType: string, data: any): {
  isValid: boolean;
  errors: string[];
} => {
  const template = getEventTemplate(eventType);
  if (!template) {
    return { isValid: false, errors: [`Unknown event type: ${eventType}`] };
  }

  const errors: string[] = [];
  
  // Check required fields
  Object.entries(template.dataStructure).forEach(([path, definition]) => {
    if (definition.required) {
      const value = getNestedValue(data, path);
      if (value === undefined || value === null) {
        errors.push(`Required field missing: ${path}`);
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Helper function to get nested value from object
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}