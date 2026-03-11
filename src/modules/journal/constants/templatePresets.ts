import { TemplateField, TemplateLineRule, JournalTemplate } from '../types/journalTemplateTypes';

/**
 * Template Preset Type
 * Represents a ready-to-use accounting template with all necessary configurations
 */
export interface TemplatePreset {
  id: string;
  name: string;
  description: string;
  category: 'general' | 'gastos' | 'ingresos' | 'compras' | 'ventas' | 'nomina' | 'impuestos';
  fields: TemplateField[];
  lineRules: TemplateLineRule[];
  settings: {
    referenceFormat?: string;
    defaultDescription?: string;
    requiresApproval?: boolean;
    tags?: string[];
  };
}

/**
 * Pre-built accounting templates ready for use
 * These templates cover common accounting scenarios in Dominican Republic
 */

export const TEMPLATE_PRESETS: TemplatePreset[] = []

export const TEMPLATE_2PRESETS: TemplatePreset[] = [
  // 1. Pago a Proveedor
  {
    id: 'supplier-payment',
    name: 'Pago a Proveedor',
    description: 'Registro de pago realizado a proveedores con soporte de múltiples métodos de pago',
    category: 'gastos',
    fields: [
      {
        id: 'f1',
        name: 'date',
        label: 'Fecha de Transacción',
        type: 'date',
        required: true,
        defaultValue: new Date().toISOString().split('T')[0]
      },
      {
        id: 'f2',
        name: 'provider',
        label: 'Proveedor',
        type: 'searchable-select',
        required: true,
        placeholder: 'Seleccionar proveedor...',
        dataSource: {
          type: 'suppliers',
          valueField: 'id',
          labelField: 'name',
          displayFields: ['name', 'code']
        }
      },
      {
        id: 'f3',
        name: 'document',
        label: 'Número de Documento',
        type: 'text',
        required: true,
        placeholder: 'Factura, recibo, etc.'
      },
      {
        id: 'f4',
        name: 'amount',
        label: 'Monto del Pago',
        type: 'currency',
        required: true,
        validation: {
          min: 0.01,
          message: 'El monto debe ser mayor a cero'
        }
      },
      {
        id: 'f5',
        name: 'paymentMethod',
        label: 'Método de Pago',
        type: 'select',
        required: true,
        options: [
          { value: 'cash', label: 'Efectivo' },
          { value: 'transfer', label: 'Transferencia Bancaria' },
          { value: 'check', label: 'Cheque' }
        ]
      },
      {
        id: 'f6',
        name: 'bankAccount',
        label: 'Cuenta Bancaria',
        type: 'searchable-select',
        required: false,
        placeholder: 'Seleccionar cuenta bancaria...',
        dataSource: {
          type: 'accounts',
          filters: { type: 'bank' },
          valueField: 'id',
          labelField: 'name'
        }
      },
      {
        id: 'f7',
        name: 'description',
        label: 'Descripción',
        type: 'textarea',
        required: false,
        placeholder: 'Descripción adicional del pago'
      }
    ],
    lineRules: [
      {
        id: 'l1',
        accountId: '2100',
        description: 'Pago a proveedor - {document}',
        type: 'debit',
        amountExpression: '{amount}'
      },
      {
        id: 'l2',
        accountId: '1010',
        accountExpression: '{paymentMethod} === "cash" ? "1010" : {paymentMethod} === "transfer" || {paymentMethod} === "check" ? {bankAccount} : "1010"',
        description: 'Pago por {paymentMethod} - Doc: {document}',
        type: 'credit',
        amountExpression: '{amount}'
      }
    ],
    settings: {
      referenceFormat: 'PAG-{document}',
      defaultDescription: 'Pago a proveedor - {provider} - {document}',
      requiresApproval: false,
      tags: ['pagos', 'proveedores', 'gastos']
    }
  },

  // 2. Factura de Venta
  {
    id: 'sales-invoice',
    name: 'Factura de Venta',
    description: 'Registro de factura de venta con cálculo automático de ITBIS (18%)',
    category: 'ventas',
    fields: [
      {
        id: 'f1',
        name: 'date',
        label: 'Fecha de Factura',
        type: 'date',
        required: true,
        defaultValue: new Date().toISOString().split('T')[0]
      },
      {
        id: 'f2',
        name: 'customer',
        label: 'Cliente',
        type: 'searchable-select',
        required: true,
        placeholder: 'Seleccionar cliente...',
        dataSource: {
          type: 'customers',
          valueField: 'id',
          labelField: 'name',
          displayFields: ['name', 'code']
        }
      },
      {
        id: 'f3',
        name: 'document',
        label: 'Número de Factura',
        type: 'text',
        required: true,
        placeholder: 'Ej: B0100000001'
      },
      {
        id: 'f4',
        name: 'subtotal',
        label: 'Subtotal (sin ITBIS)',
        type: 'currency',
        required: true,
        validation: {
          min: 0,
          message: 'El subtotal no puede ser negativo'
        }
      },
      {
        id: 'f5',
        name: 'taxAmount',
        label: 'ITBIS (18%)',
        type: 'currency',
        required: true,
        defaultValue: 0,
        placeholder: 'Se calculará automáticamente'
      }
    ],
    lineRules: [
      {
        id: 'l1',
        accountId: '1200',
        description: 'Venta a {customer} - Factura {document}',
        type: 'debit',
        amountExpression: '{subtotal} + {taxAmount}'
      },
      {
        id: 'l2',
        accountId: '4100',
        description: 'Ingreso por venta - Factura {document}',
        type: 'credit',
        amountExpression: '{subtotal}'
      },
      {
        id: 'l3',
        accountId: '2300',
        description: 'ITBIS por pagar - Factura {document}',
        type: 'credit',
        amountExpression: '{taxAmount}',
        conditions: [
          {
            field: 'taxAmount',
            operator: '>',
            value: 0
          }
        ]
      }
    ],
    settings: {
      referenceFormat: 'FAC-{document}',
      defaultDescription: 'Venta a {customer} - Factura {document}',
      requiresApproval: false,
      tags: ['ventas', 'facturacion', 'ingresos', 'itbis']
    }
  },

  // 3. Depósito Bancario
  {
    id: 'bank-deposit',
    name: 'Depósito Bancario',
    description: 'Registro de depósito de efectivo a cuenta bancaria',
    category: 'ingresos',
    fields: [
      {
        id: 'f1',
        name: 'date',
        label: 'Fecha de Depósito',
        type: 'date',
        required: true,
        defaultValue: new Date().toISOString().split('T')[0]
      },
      {
        id: 'f2',
        name: 'bankAccount',
        label: 'Cuenta Bancaria',
        type: 'searchable-select',
        required: true,
        placeholder: 'Seleccionar cuenta bancaria...',
        dataSource: {
          type: 'accounts',
          filters: { type: 'bank' },
          valueField: 'id',
          labelField: 'name',
          displayFields: ['code', 'name']
        }
      },
      {
        id: 'f3',
        name: 'amount',
        label: 'Monto del Depósito',
        type: 'currency',
        required: true,
        validation: {
          min: 0.01,
          message: 'El monto debe ser mayor a cero'
        }
      },
      {
        id: 'f4',
        name: 'description',
        label: 'Descripción',
        type: 'textarea',
        required: true,
        placeholder: 'Origen del depósito'
      },
      {
        id: 'f5',
        name: 'document',
        label: 'Número de Comprobante',
        type: 'text',
        required: false,
        placeholder: 'Número de boleta de depósito'
      }
    ],
    lineRules: [
      {
        id: 'l1',
        accountId: '{bankAccount}',
        description: 'Depósito bancario - {description}',
        type: 'debit',
        amountExpression: '{amount}'
      },
      {
        id: 'l2',
        accountId: '1010',
        description: 'Efectivo depositado - {document}',
        type: 'credit',
        amountExpression: '{amount}'
      }
    ],
    settings: {
      referenceFormat: 'DEP-{document}',
      defaultDescription: 'Depósito bancario - {description}',
      requiresApproval: false,
      tags: ['deposito', 'banco', 'efectivo', 'ingresos']
    }
  },

  // 4. Compra con ITBIS
  {
    id: 'purchase-with-tax',
    name: 'Compra con ITBIS',
    description: 'Registro de compra de bienes o servicios con ITBIS incluido',
    category: 'compras',
    fields: [
      {
        id: 'f1',
        name: 'date',
        label: 'Fecha de Compra',
        type: 'date',
        required: true,
        defaultValue: new Date().toISOString().split('T')[0]
      },
      {
        id: 'f2',
        name: 'provider',
        label: 'Proveedor',
        type: 'searchable-select',
        required: true,
        placeholder: 'Seleccionar proveedor...',
        dataSource: {
          type: 'suppliers',
          valueField: 'id',
          labelField: 'name',
          displayFields: ['name', 'code']
        }
      },
      {
        id: 'f3',
        name: 'document',
        label: 'Número de Factura',
        type: 'text',
        required: true,
        placeholder: 'NCF del proveedor'
      },
      {
        id: 'f4',
        name: 'subtotal',
        label: 'Subtotal (sin ITBIS)',
        type: 'currency',
        required: true,
        validation: {
          min: 0,
          message: 'El subtotal no puede ser negativo'
        }
      },
      {
        id: 'f5',
        name: 'taxAmount',
        label: 'ITBIS (18%)',
        type: 'currency',
        required: true,
        defaultValue: 0
      },
      {
        id: 'f6',
        name: 'paymentMethod',
        label: 'Forma de Pago',
        type: 'select',
        required: true,
        options: [
          { value: 'credit', label: 'A Crédito' },
          { value: 'cash', label: 'Efectivo' },
          { value: 'transfer', label: 'Transferencia' },
          { value: 'check', label: 'Cheque' }
        ]
      }
    ],
    lineRules: [
      {
        id: 'l1',
        accountId: '5100',
        description: 'Compra a {provider} - {document}',
        type: 'debit',
        amountExpression: '{subtotal}'
      },
      {
        id: 'l2',
        accountId: '1400',
        description: 'ITBIS Pagado - {document}',
        type: 'debit',
        amountExpression: '{taxAmount}',
        conditions: [
          {
            field: 'taxAmount',
            operator: '>',
            value: 0
          }
        ]
      },
      {
        id: 'l3',
        accountId: '2100',
        accountExpression: '{paymentMethod} === "credit" ? "2100" : {paymentMethod} === "cash" ? "1010" : "1020"',
        description: 'Pago de compra - {paymentMethod}',
        type: 'credit',
        amountExpression: '{subtotal} + {taxAmount}'
      }
    ],
    settings: {
      referenceFormat: 'COMP-{document}',
      defaultDescription: 'Compra a {provider} - {document}',
      requiresApproval: false,
      tags: ['compras', 'gastos', 'itbis', 'proveedores']
    }
  },

  // 5. Nota de Crédito
  {
    id: 'credit-note',
    name: 'Nota de Crédito',
    description: 'Registro de devolución o descuento sobre ventas',
    category: 'ventas',
    fields: [
      {
        id: 'f1',
        name: 'date',
        label: 'Fecha de Nota de Crédito',
        type: 'date',
        required: true,
        defaultValue: new Date().toISOString().split('T')[0]
      },
      {
        id: 'f2',
        name: 'customer',
        label: 'Cliente',
        type: 'searchable-select',
        required: true,
        placeholder: 'Seleccionar cliente...',
        dataSource: {
          type: 'customers',
          valueField: 'id',
          labelField: 'name',
          displayFields: ['name', 'code']
        }
      },
      {
        id: 'f3',
        name: 'document',
        label: 'Número de NC',
        type: 'text',
        required: true,
        placeholder: 'Número de nota de crédito'
      },
      {
        id: 'f4',
        name: 'amount',
        label: 'Monto',
        type: 'currency',
        required: true,
        validation: {
          min: 0.01,
          message: 'El monto debe ser mayor a cero'
        }
      },
      {
        id: 'f5',
        name: 'description',
        label: 'Motivo',
        type: 'textarea',
        required: true,
        placeholder: 'Razón de la nota de crédito'
      }
    ],
    lineRules: [
      {
        id: 'l1',
        accountId: '4100',
        description: 'Devolución/Descuento sobre ventas - {document}',
        type: 'debit',
        amountExpression: '{amount}'
      },
      {
        id: 'l2',
        accountId: '1200',
        description: 'Nota de Crédito a {customer} - {document}',
        type: 'credit',
        amountExpression: '{amount}'
      }
    ],
    settings: {
      referenceFormat: 'NC-{document}',
      defaultDescription: 'Nota de Crédito - {customer} - {document}',
      requiresApproval: true,
      tags: ['ventas', 'devoluciones', 'nota-credito']
    }
  },

  // 6. Pago de Nómina
  {
    id: 'payroll',
    name: 'Pago de Nómina',
    description: 'Registro de pago de salarios y sueldos a empleados',
    category: 'nomina',
    fields: [
      {
        id: 'f1',
        name: 'date',
        label: 'Fecha de Pago',
        type: 'date',
        required: true,
        defaultValue: new Date().toISOString().split('T')[0]
      },
      {
        id: 'f2',
        name: 'description',
        label: 'Descripción',
        type: 'text',
        required: true,
        placeholder: 'Ej: Nómina Quincenal Diciembre 2025',
        defaultValue: 'Pago de nómina'
      },
      {
        id: 'f3',
        name: 'amount',
        label: 'Monto Total',
        type: 'currency',
        required: true,
        validation: {
          min: 0.01,
          message: 'El monto debe ser mayor a cero'
        }
      },
      {
        id: 'f4',
        name: 'bankAccount',
        label: 'Cuenta Bancaria',
        type: 'searchable-select',
        required: true,
        placeholder: 'Seleccionar cuenta de pago...',
        dataSource: {
          type: 'accounts',
          filters: { type: 'bank' },
          valueField: 'id',
          labelField: 'name',
          displayFields: ['code', 'name']
        }
      }
    ],
    lineRules: [
      {
        id: 'l1',
        accountId: '6100',
        description: 'Gastos de nómina - {description}',
        type: 'debit',
        amountExpression: '{amount}'
      },
      {
        id: 'l2',
        accountId: '{bankAccount}',
        description: 'Pago de nómina - {description}',
        type: 'credit',
        amountExpression: '{amount}'
      }
    ],
    settings: {
      referenceFormat: 'NOM-{date}',
      defaultDescription: 'Pago de nómina - {description}',
      requiresApproval: true,
      tags: ['nomina', 'sueldos', 'empleados', 'gastos']
    }
  }
];

/**
 * Get a template preset by its ID
 * @param id - The preset ID to search for
 * @returns The template preset or undefined if not found
 */
export function getPresetById(id: string): TemplatePreset | undefined {
  return TEMPLATE_PRESETS.find(preset => preset.id === id);
}

/**
 * Get all template presets for a specific category
 * @param category - The category to filter by
 * @returns Array of template presets in the specified category
 */
export function getPresetsByCategory(
  category: 'general' | 'gastos' | 'ingresos' | 'compras' | 'ventas' | 'nomina' | 'impuestos'
): TemplatePreset[] {
  return TEMPLATE_PRESETS.filter(preset => preset.category === category);
}

/**
 * Convert a TemplatePreset to a full JournalTemplate
 * @param preset - The preset to convert
 * @param userId - The user creating the template
 * @returns A complete JournalTemplate ready to use
 */
export function presetToTemplate(preset: TemplatePreset, userId: string = 'system'): JournalTemplate {
  const now = new Date().toISOString();

  return {
    id: preset.id,
    name: preset.name,
    description: preset.description,
    category: preset.category,
    isActive: true,
    fields: preset.fields,
    lineRules: preset.lineRules,
    settings: preset.settings,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
    usageCount: 0
  };
}

/**
 * Get all available categories with their preset counts
 * @returns Array of categories with template counts
 */
export function getCategoriesWithCounts() {
  const categories = ['general', 'gastos', 'ingresos', 'compras', 'ventas', 'nomina', 'impuestos'] as const;

  return categories.map(category => ({
    value: category,
    label: getCategoryLabel(category),
    count: TEMPLATE_PRESETS.filter(p => p.category === category).length
  }));
}

/**
 * Get human-readable label for a category
 * @param category - The category code
 * @returns The display label
 */
function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    'general': 'General',
    'gastos': 'Gastos',
    'ingresos': 'Ingresos',
    'compras': 'Compras',
    'ventas': 'Ventas',
    'nomina': 'Nómina',
    'impuestos': 'Impuestos'
  };
  return labels[category] || category;
}
