// Common field definitions for the dynamic template system
import { TemplateField } from '../types/journalTemplateTypes';

// Type definitions for common fields
export type CommonFieldId =
  | 'document'
  | 'date'
  | 'provider'
  | 'customer'
  | 'amount'
  | 'subtotal'
  | 'taxAmount'
  | 'paymentMethod'
  | 'bankAccount'
  | 'description'
  | 'notes';

export type FieldCategoryType =
  | 'document'
  | 'date'
  | 'entity'
  | 'amount'
  | 'payment'
  | 'info';

export interface CommonField extends TemplateField {
  id: CommonFieldId;
  category: FieldCategoryType;
}

export interface FieldCategory {
  id: FieldCategoryType;
  label: string;
  description: string;
  fields: CommonFieldId[];
}

// Pre-built accounting fields
export const COMMON_FIELDS: Record<CommonFieldId, CommonField> = {
  document: {
    id: 'document',
    name: 'document',
    label: 'Número de Documento',
    type: 'text',
    required: true,
    placeholder: 'Ej: FAC-001',
    category: 'document',
  },

  date: {
    id: 'date',
    name: 'date',
    label: 'Fecha de Transacción',
    type: 'date',
    required: true,
    defaultValue: new Date().toISOString().split('T')[0],
    category: 'date',
  },

  provider: {
    id: 'provider',
    name: 'provider',
    label: 'Proveedor',
    type: 'searchable-select',
    required: false,
    placeholder: 'Seleccione un proveedor',
    dataSource: {
      type: 'suppliers',
      valueField: 'id',
      labelField: 'name',
      displayFields: ['name', 'code', 'taxId'],
    },
    category: 'entity',
  },

  customer: {
    id: 'customer',
    name: 'customer',
    label: 'Cliente',
    type: 'searchable-select',
    required: false,
    placeholder: 'Seleccione un cliente',
    dataSource: {
      type: 'customers',
      valueField: 'id',
      labelField: 'name',
      displayFields: ['name', 'code', 'taxId'],
    },
    category: 'entity',
  },

  amount: {
    id: 'amount',
    name: 'amount',
    label: 'Monto',
    type: 'currency',
    required: true,
    placeholder: '0.00',
    validation: {
      min: 0.01,
      message: 'El monto debe ser mayor a 0',
    },
    category: 'amount',
  },

  subtotal: {
    id: 'subtotal',
    name: 'subtotal',
    label: 'Subtotal',
    type: 'currency',
    required: true,
    placeholder: '0.00',
    validation: {
      min: 0,
      message: 'El subtotal no puede ser negativo',
    },
    category: 'amount',
  },

  taxAmount: {
    id: 'taxAmount',
    name: 'taxAmount',
    label: 'Impuesto (IVA)',
    type: 'currency',
    required: false,
    placeholder: '0.00',
    defaultValue: '{subtotal} * 0.18',
    validation: {
      min: 0,
      message: 'El impuesto no puede ser negativo',
    },
    category: 'amount',
  },

  paymentMethod: {
    id: 'paymentMethod',
    name: 'paymentMethod',
    label: 'Método de Pago',
    type: 'select',
    required: false,
    placeholder: 'Seleccione método de pago',
    options: [
      { value: 'cash', label: 'Efectivo' },
      { value: 'transfer', label: 'Transferencia' },
      { value: 'check', label: 'Cheque' },
      { value: 'card', label: 'Tarjeta' },
    ],
    category: 'payment',
  },

  bankAccount: {
    id: 'bankAccount',
    name: 'bankAccount',
    label: 'Cuenta Bancaria',
    type: 'searchable-select',
    required: false,
    placeholder: 'Seleccione cuenta bancaria',
    dataSource: {
      type: 'accounts',
      filters: {
        accountType: 'bank',
        isActive: true,
      },
      valueField: 'id',
      labelField: 'name',
      displayFields: ['code', 'name', 'bankName'],
    },
    category: 'payment',
  },

  description: {
    id: 'description',
    name: 'description',
    label: 'Descripción',
    type: 'textarea',
    required: false,
    placeholder: 'Descripción de la transacción',
    category: 'info',
  },

  notes: {
    id: 'notes',
    name: 'notes',
    label: 'Notas',
    type: 'textarea',
    required: false,
    placeholder: 'Notas adicionales (opcional)',
    category: 'info',
  },
};

// Category-to-fields mapping for suggestions
export const CATEGORY_FIELD_SUGGESTIONS: Record<string, CommonFieldId[]> = {
  gastos: [
    'date',
    'provider',
    'document',
    'amount',
    'paymentMethod',
  ],
  ingresos: [
    'date',
    'customer',
    'document',
    'amount',
    'paymentMethod',
  ],
  compras: [
    'date',
    'provider',
    'document',
    'subtotal',
    'taxAmount',
    'paymentMethod',
  ],
  ventas: [
    'date',
    'customer',
    'document',
    'subtotal',
    'taxAmount',
  ],
  nomina: [
    'date',
    'description',
    'amount',
  ],
  impuestos: [
    'date',
    'document',
    'amount',
    'description',
  ],
  general: [
    'date',
    'document',
    'amount',
    'description',
  ],
};

// Field categories for UI grouping
export const FIELD_CATEGORIES: FieldCategory[] = [
  {
    id: 'document',
    label: 'Documento',
    description: 'Información de documentación',
    fields: ['document'],
  },
  {
    id: 'date',
    label: 'Fecha',
    description: 'Información temporal',
    fields: ['date'],
  },
  {
    id: 'entity',
    label: 'Entidades',
    description: 'Clientes, proveedores y otras entidades',
    fields: ['provider', 'customer'],
  },
  {
    id: 'amount',
    label: 'Montos',
    description: 'Cantidades monetarias',
    fields: ['amount', 'subtotal', 'taxAmount'],
  },
  {
    id: 'payment',
    label: 'Pago',
    description: 'Información de medios de pago',
    fields: ['paymentMethod', 'bankAccount'],
  },
  {
    id: 'info',
    label: 'Información Adicional',
    description: 'Descripciones y notas',
    fields: ['description', 'notes'],
  },
];

// Helper function to get fields by category
export function getFieldsByCategory(category: string): CommonField[] {
  const fieldIds = CATEGORY_FIELD_SUGGESTIONS[category.toLowerCase()];

  if (!fieldIds) {
    // Return default fields if category not found
    return CATEGORY_FIELD_SUGGESTIONS.general.map(id => COMMON_FIELDS[id]);
  }

  return fieldIds.map(id => COMMON_FIELDS[id]);
}

// Helper function to get all common fields as an array
export function getAllCommonFields(): CommonField[] {
  return Object.values(COMMON_FIELDS);
}

// Helper function to get fields by field category type (for UI grouping)
export function getFieldsByCategoryType(categoryType: FieldCategoryType): CommonField[] {
  return getAllCommonFields().filter(field => field.category === categoryType);
}

// Helper function to get field by id
export function getCommonField(fieldId: CommonFieldId): CommonField | undefined {
  return COMMON_FIELDS[fieldId];
}

// Helper function to create a custom field based on a common field
export function createCustomField(
  baseFieldId: CommonFieldId,
  overrides: Partial<TemplateField>
): TemplateField {
  const baseField = COMMON_FIELDS[baseFieldId];

  if (!baseField) {
    throw new Error(`Common field with id '${baseFieldId}' not found`);
  }

  // Remove the category property when creating custom field
  const { category, ...fieldWithoutCategory } = baseField;

  return {
    ...fieldWithoutCategory,
    ...overrides,
    // Use override id if provided, otherwise use name or base field id
    id: overrides.id || overrides.name || baseField.id,
  };
}

// Helper function to create a completely custom field from scratch
export function createBlankCustomField(overrides: Partial<TemplateField> = {}): TemplateField {
  return {
    id: overrides.id || `custom_${Date.now()}`,
    name: overrides.name || 'customField',
    label: overrides.label || 'Campo Personalizado',
    type: overrides.type || 'text',
    required: overrides.required || false,
    placeholder: overrides.placeholder || '',
    defaultValue: overrides.defaultValue,
    options: overrides.options,
    dataSource: overrides.dataSource,
    validation: overrides.validation,
    ...overrides,
  };
}

// Type guard to check if a string is a valid CommonFieldId
export function isCommonFieldId(id: string): id is CommonFieldId {
  return id in COMMON_FIELDS;
}

// Type guard to check if a string is a valid FieldCategoryType
export function isFieldCategoryType(type: string): type is FieldCategoryType {
  return FIELD_CATEGORIES.some(cat => cat.id === type);
}
