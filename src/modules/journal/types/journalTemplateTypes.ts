// Tipos para el sistema de plantillas dinámicas de asientos contables

// Specialized field types for document parsing and custom fields
export type SpecializedFieldType =
  | 'document'      // Document number/reference input
  | 'provider'      // Provider/supplier searchable dropdown
  | 'customer'      // Customer searchable dropdown
  | 'amount'        // Currency amount input
  | 'subtotal'      // Subtotal currency input
  | 'taxAmount'     // Tax amount currency input (can auto-calculate)
  | 'paymentMethod' // Payment method select dropdown
  | 'bankAccount'   // Bank account searchable dropdown
  | 'description'   // Description textarea
  | 'notes';        // Notes textarea

// All available field types
export type TemplateFieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'select'
  | 'textarea'
  | 'currency'
  | 'searchable-select'
  | SpecializedFieldType;

export interface TemplateField {
  id: string;
  name: string;
  label: string;
  type: TemplateFieldType;
  required: boolean;
  placeholder?: string;
  defaultValue?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  // Para campos de selección estática
  options?: Array<{
    value: string;
    label: string;
  }>;
  // Para campos de selección dinámica/searchable
  dataSource?: {
    type: 'accounts' | 'products' | 'locations' | 'customers' | 'suppliers' | 'custom';
    // Para listas personalizadas
    customList?: Array<{
      value: string;
      label: string;
      metadata?: Record<string, any>; // Para datos adicionales
    }>;
    // Filtros para la fuente de datos
    filters?: Record<string, any>;
    // Campos a mostrar en el dropdown
    displayFields?: string[]; // Ej: ['name', 'code', 'description']
    // Campo que se usará como valor
    valueField?: string; // Default: 'id'
    // Campo que se usará como etiqueta
    labelField?: string; // Default: 'name'
  };
}

export interface TemplateLineRule {
  id: string;
  accountId: string;
  accountExpression?: string; // Para cuentas dinámicas basadas en campos
  description: string;
  descriptionExpression?: string; // Puede usar variables como {documentNumber}
  document: string;
  documentExpression?: string; // Puede usar variables como {documentNumber}
  // Definir si es débito o crédito
  type: 'debit' | 'credit';
  // Expresión para calcular el monto (puede usar variables de campos)
  amountExpression: string; // Ej: "{amount}", "{amount} * 0.15", "{subtotal} + {tax}"
  // Condiciones para incluir esta línea
  conditions?: Array<{
    field: string;
    operator: '>' | '<' | '=' | '!=' | '>=' | '<=' | 'contains' | 'not_empty';
    value: any;
  }>;
}

export interface JournalTemplate {
  id: string;
  name: string;
  description: string;
  category: string; // Ej: "Gastos", "Ventas", "Compras", etc.
  isActive: boolean;
  
  // Campos dinámicos que se mostrarán en el formulario
  fields: TemplateField[];
  
  // Reglas para generar las líneas del asiento
  lineRules: TemplateLineRule[];
  
  // Configuración adicional
  settings: {
    // Formato del número de referencia (puede usar variables)
    referenceFormat?: string; // Ej: "FAC-{documentNumber}", "PAG-{year}-{month}-{sequence}"
    // Descripción por defecto del asiento
    defaultDescription?: string;
    // Si requiere aprobación antes de contabilizar
    requiresApproval?: boolean;
    // Tags para organizar plantillas
    tags?: string[];
  };
  
  // Metadatos
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastUsed?: string;
  usageCount: number;
}

// Datos capturados del formulario generado dinámicamente
export interface TemplateFormData {
  [fieldName: string]: any;
}

// Resultado de procesar una plantilla con datos
export interface ProcessedTemplate {
  templateId: string;
  formData: TemplateFormData;
  generatedEntry: {
    description: string;
    reference: string;
    document?: string, 
    lines: Array<{
      accountId: string;
      accountName?: string;
      description: string;
      debitAmount: number;
      document?: string; 
      creditAmount: number;
      type: 'debit' | 'credit';
    }>;
  };
  // Validaciones y errores
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
}

// Para almacenar plantillas predefinidas comunes
export interface TemplateCatalog {
  categories: Array<{
    name: string;
    description: string;
    templates: JournalTemplate[];
  }>;
}

// Tipos para el constructor de plantillas
export interface TemplateBuilderState {
  template: Partial<JournalTemplate>;
  currentStep: 'basic' | 'fields' | 'lines' | 'settings' | 'preview';
  validationErrors: Record<string, string[]>;
}

// Para expresiones matemáticas y lógicas
export interface ExpressionContext {
  fields: TemplateFormData;
  functions: {
    sum: (...values: number[]) => number;
    multiply: (a: number, b: number) => number;
    divide: (a: number, b: number) => number;
    subtract: (a: number, b: number) => number;
    percentage: (amount: number, percent: number) => number;
    round: (value: number, decimals?: number) => number;
  };
  constants: {
    PI: number;
    TAX_RATE: number; // Configurable
    [key: string]: number;
  };
}