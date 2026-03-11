import { createSignal } from 'solid-js';
import { JournalTemplate, TemplateCatalog } from '../types/journalTemplateTypes';
import { devLog, generateRandomId } from '../../../services/utils';
import { templatesApi } from '../../../services/apiAdapter';
import { authStore } from '../../../stores/authStore';
import { TEMPLATE_PRESETS, presetToTemplate } from '../constants/templatePresets';

// Plantillas predefinidas comunes

const predefinedTemplates: JournalTemplate[] = []

const predefined2Templates: JournalTemplate[] = [
  {
    id: 'template-payment-supplier',
    name: 'Pago a Proveedor',
    description: 'Registro de pago a proveedores con documento de respaldo',
    category: 'gastos',
    isActive: true,
    fields: [
      {
        id: 'f1',
        name: 'supplierName',
        label: 'Nombre del Proveedor',
        type: 'text',
        required: true,
        placeholder: 'Ingrese el nombre del proveedor'
      },
      {
        id: 'f2',
        name: 'documentNumber',
        label: 'Número de Documento',
        type: 'text',
        required: true,
        placeholder: 'Factura, recibo, etc.'
      },
      {
        id: 'f3',
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
        id: 'f4',
        name: 'paymentMethod',
        label: 'Método de Pago',
        type: 'select',
        required: true,
        options: [
          { value: 'cash', label: 'Efectivo' },
          { value: 'check', label: 'Cheque' },
          { value: 'transfer', label: 'Transferencia' },
          { value: 'card', label: 'Tarjeta' }
        ]
      },
      {
        id: 'f5',
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
        accountId: '5100', // Gastos Operativos (ajustar según plan de cuentas)
        description: 'Gasto por pago a {supplierName}',
        type: 'debit',
        amountExpression: '{amount}'
      },
      {
        id: 'l2',
        accountId: '1010', // Caja (ajustar según método de pago)
        accountExpression: '{paymentMethod}' === 'cash' ? '1010' : '1020', // Ejemplo de cuenta dinámica
        description: 'Pago por {paymentMethod} - {documentNumber}',
        type: 'credit',
        amountExpression: '{amount}'
      }
    ],
    settings: {
      referenceFormat: 'PAG-{documentNumber}',
      defaultDescription: 'Pago a {supplierName} - {documentNumber}',
      requiresApproval: false,
      tags: ['pagos', 'proveedores']
    },
    createdBy: 'system',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    usageCount: 0
  },
  {
    id: 'template-sales-invoice',
    name: 'Factura de Venta',
    description: 'Registro de venta con facturación a cliente',
    category: 'ventas',
    isActive: true,
    fields: [
      {
        id: 'f1',
        name: 'customerName',
        label: 'Nombre del Cliente',
        type: 'text',
        required: true
      },
      {
        id: 'f2',
        name: 'invoiceNumber',
        label: 'Número de Factura',
        type: 'text',
        required: true
      },
      {
        id: 'f3',
        name: 'subtotal',
        label: 'Subtotal (sin impuestos)',
        type: 'currency',
        required: true,
        validation: { min: 0 }
      },
      {
        id: 'f4',
        name: 'taxRate',
        label: 'Tasa de Impuesto (%)',
        type: 'number',
        required: true,
        defaultValue: 18,
        validation: { min: 0, max: 100 }
      }
    ],
    lineRules: [
      {
        id: 'l1',
        accountId: '1200', // Cuentas por Cobrar
        description: 'Venta a {customerName} - Factura {invoiceNumber}',
        type: 'debit',
        amountExpression: '{subtotal} + ({subtotal} * {taxRate} / 100)'
      },
      {
        id: 'l2',
        accountId: '4100', // Ingresos por Ventas
        description: 'Venta de productos/servicios',
        type: 'credit',
        amountExpression: '{subtotal}'
      },
      {
        id: 'l3',
        accountId: '2300', // Impuestos por Pagar
        description: 'IVA por cobrar - Factura {invoiceNumber}',
        type: 'credit',
        amountExpression: '{subtotal} * {taxRate} / 100',
        conditions: [
          {
            field: 'taxRate',
            operator: '>',
            value: 0
          }
        ]
      }
    ],
    settings: {
      referenceFormat: 'FAC-{invoiceNumber}',
      defaultDescription: 'Venta a {customerName} - Factura {invoiceNumber}',
      requiresApproval: false,
      tags: ['ventas', 'facturacion']
    },
    createdBy: 'system',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    usageCount: 0
  },
  {
    id: 'template-expense-reimbursement',
    name: 'Reembolso de Gastos',
    description: 'Registro de reembolso de gastos a empleados',
    category: 'gastos',
    isActive: true,
    fields: [
      {
        id: 'f1',
        name: 'employeeName',
        label: 'Nombre del Empleado',
        type: 'text',
        required: true
      },
      {
        id: 'f2',
        name: 'expenseType',
        label: 'Tipo de Gasto',
        type: 'select',
        required: true,
        options: [
          { value: 'travel', label: 'Viáticos' },
          { value: 'materials', label: 'Materiales' },
          { value: 'fuel', label: 'Combustible' },
          { value: 'other', label: 'Otros' }
        ]
      },
      {
        id: 'f3',
        name: 'amount',
        label: 'Monto a Reembolsar',
        type: 'currency',
        required: true,
        validation: { min: 0.01 }
      },
      {
        id: 'f4',
        name: 'receiptNumbers',
        label: 'Números de Comprobantes',
        type: 'text',
        required: true,
        placeholder: 'Ej: REC-001, REC-002'
      }
    ],
    lineRules: [
      {
        id: 'l1',
        accountId: '5200', // Gastos Administrativos
        description: 'Reembolso de {expenseType} - {employeeName}',
        type: 'debit',
        amountExpression: '{amount}'
      },
      {
        id: 'l2',
        accountId: '2100', // Cuentas por Pagar
        description: 'Reembolso pendiente a {employeeName}',
        type: 'credit',
        amountExpression: '{amount}'
      }
    ],
    settings: {
      referenceFormat: 'REMB-{employeeName}-{today}',
      defaultDescription: 'Reembolso de gastos a {employeeName}',
      requiresApproval: true,
      tags: ['reembolsos', 'gastos', 'empleados']
    },
    createdBy: 'system',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    usageCount: 0
  },
  {
    id: 'template-test-searchable',
    name: 'Prueba - Campo Searchable',
    description: 'Plantilla de prueba con campo searchable-select',
    category: 'general',
    isActive: true,
    fields: [
      {
        id: 'f1',
        name: 'testAccount',
        label: 'Cuenta Contable',
        type: 'searchable-select',
        required: true,
        dataSource: {
          type: 'accounts',
          valueField: 'id',
          labelField: 'name'
        },
        placeholder: 'Seleccionar cuenta...'
      },
      {
        id: 'f2',
        name: 'amount',
        label: 'Monto',
        type: 'currency',
        required: true
      }
    ],
    lineRules: [
      {
        id: 'l1',
        accountId: '{testAccount}',
        description: 'Asiento de prueba',
        type: 'debit',
        amountExpression: '{amount}'
      },
      {
        id: 'l2',
        accountId: '1010',
        description: 'Contrapartida',
        type: 'credit', 
        amountExpression: '{amount}'
      }
    ],
    settings: {
      referenceFormat: 'TEST-{today}',
      defaultDescription: 'Asiento de prueba',
      requiresApproval: false,
      tags: ['test']
    },
    createdBy: 'system',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    usageCount: 0
  }
];






export  const categoryOptions = [
    { value: 'general', label: 'General' },
    { value: 'gastos', label: 'Gastos' },
    { value: 'ingresos', label: 'Ingresos' },
    { value: 'compras', label: 'Compras' },
    { value: 'ventas', label: 'Ventas' },
    { value: 'nomina', label: 'Nómina' },
    { value: 'impuestos', label: 'Impuestos' }
  ];

const [templates, setTemplates] = createSignal<JournalTemplate[]>([]);
const [isLoading, setIsLoading] = createSignal(false);
const [error, setError] = createSignal<string | null>(null);
const [favorites, setFavorites] = createSignal<string[]>([]);
const [recentTemplates, setRecentTemplates] = createSignal<string[]>([]);
const [recentFieldValues, setRecentFieldValues] = createSignal<Record<string, any[]>>({});

// Store para el manejo de plantillas
export const templateStore = {
  // Obtener todas las plantillas
  get templates() {
    return templates();
  },

  // Estados de carga
  get isLoading() {
    return isLoading();
  },

  get error() {
    return error();
  },

  // Obtener plantillas activas
  getActiveTemplates() {
    const allTemplates = templates();
    const active = allTemplates.filter(t => t.isActive);
    devLog('[templateStore] getActiveTemplates called:', { total: allTemplates.length, active: active.length });
    return active;
  },

  // Obtener plantillas por categoría
  getTemplatesByCategory(category: string) {
    return templates().filter(t => t.category === category && t.isActive);
  },

  // Buscar plantillas
  searchTemplates(query: string) {
    const searchTerm = query.toLowerCase();
    return templates().filter(t => 
      t.isActive && (
        t.name.toLowerCase().includes(searchTerm) ||
        t.description.toLowerCase().includes(searchTerm) ||
        t.settings.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
      )
    );
  },

  // Obtener plantilla por ID
  getTemplateById(id: string) {
    return templates().find(t => t.id === id);
  },

  // Agregar nueva plantilla
  async addTemplate(template: JournalTemplate) {
    try {
      setIsLoading(true);
      setError(null);

      const newTemplate = await templatesApi.create({
        ...template,
        id: template.id || generateRandomId()
      });

      setTemplates(prev => [...prev, newTemplate]);
      this.saveToStorage();
      return newTemplate;
    } catch (error) {
      console.error('Error adding template:', error);
      setError('Error al agregar plantilla');
      
      // Fallback to local storage
      const newTemplate = {
        ...template,
        id: template.id || generateRandomId(),
        createdAt: template.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        usageCount: 0
      };

      setTemplates(prev => [...prev, newTemplate]);
      //this.saveToStorage();
      return newTemplate;
    } finally {
      setIsLoading(false);
    }
  },

  // Actualizar plantilla existente
  async updateTemplate(id: string, updates: Partial<JournalTemplate>) {
    try {
      setIsLoading(true);
      setError(null);

      const updatedTemplate = await templatesApi.update(id, updates);
      
      setTemplates(prev => 
        prev.map(t => 
          t.id === id 
            ? { ...t, ...updates, updatedAt: new Date().toISOString() }
            : t
        )
      );
      //this.saveToStorage();
      return updatedTemplate;
    } catch (error) {
      console.error('Error updating template:', error);
      setError('Error al actualizar plantilla');
      
      // Fallback to local update
      setTemplates(prev => 
        prev.map(t => 
          t.id === id 
            ? { ...t, ...updates, updatedAt: new Date().toISOString() }
            : t
        )
      );
      this.saveToStorage();
    } finally {
      setIsLoading(false);
    }
  },

  // Eliminar plantilla
  async deleteTemplate(id: string) {
    try {
      setIsLoading(true);
      setError(null);

      await templatesApi.delete(id);
      
      setTemplates(prev => prev.filter(t => t.id !== id));
      this.saveToStorage();
      return { success: true };
    } catch (error) {
      console.error('Error deleting template:', error);
      setError('Error al eliminar plantilla');
      
      // Fallback to local deletion
      setTemplates(prev => prev.filter(t => t.id !== id));
      this.saveToStorage();
      return { success: false, error: error };
    } finally {
      setIsLoading(false);
    }
  },

  // Incrementar contador de uso
  async incrementUsageCount(id: string) {
    try {
      await templatesApi.incrementUsage(id);

      // Update local state
      setTemplates(prev =>
        prev.map(t =>
          t.id === id
            ? {
                ...t,
                usageCount: (t.usageCount || 0) + 1,
                lastUsed: new Date().toISOString()
              }
            : t
        )
      );

      // Add to recent templates
      this.addToRecent(id);
    } catch (error) {
      console.error('Error incrementing template usage:', error);

      // Fallback to local update
      setTemplates(prev =>
        prev.map(t =>
          t.id === id
            ? {
                ...t,
                usageCount: (t.usageCount || 0) + 1,
                lastUsed: new Date().toISOString()
              }
            : t
        )
      );

      // Add to recent templates
      this.addToRecent(id);
    }
  },

  // Obtener estadísticas
  getStats() {
    const allTemplates = templates();
    return {
      totalTemplates: allTemplates.length,
      activeTemplates: allTemplates.filter(t => t.isActive).length,
      categories: [...new Set(allTemplates.map(t => t.category))].length,
      mostUsed: allTemplates
        .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
        .slice(0, 5)
    };
  },

  // Obtener catálogo organizado por categorías
  getCatalog(): TemplateCatalog {
    const categories = [...new Set(templates().map(t => t.category))];
    
    return {
      categories: categories.map(category => ({
        name: category,
        description: this.getCategoryDescription(category),
        templates: this.getTemplatesByCategory(category)
      }))
    };
  },

  // Descripciones de categorías
  getCategoryDescription(category: string): string {
    const descriptions: Record<string, string> = {
      'general': 'Plantillas de uso general para diversos tipos de asientos',
      'gastos': 'Plantillas para registro de gastos y pagos',
      'ingresos': 'Plantillas para registro de ingresos y cobros',
      'ventas': 'Plantillas para operaciones de venta y facturación',
      'compras': 'Plantillas para operaciones de compra',
      'nomina': 'Plantillas para registro de nómina y pagos a empleados',
      'impuestos': 'Plantillas para manejo de impuestos y obligaciones tributarias'
    };
    return descriptions[category] || 'Plantillas de esta categoría';
  },

  // Duplicar plantilla
  duplicateTemplate(id: string, newName?: string) {
    const original = this.getTemplateById(id);
    if (!original) return null;

    const duplicate: JournalTemplate = {
      ...original,
      id: generateRandomId(),
      name: newName || `${original.name} (Copia)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0,
      lastUsed: undefined
    };

    return this.addTemplate(duplicate);
  },

  // Importar/Exportar plantillas
  exportTemplates(): string {
    return JSON.stringify(templates(), null, 2);
  },

  importTemplates(jsonData: string): { success: boolean; imported: number; errors: string[] } {
    try {
      const imported: JournalTemplate[] = JSON.parse(jsonData);
      const errors: string[] = [];
      let importedCount = 0;

      for (const template of imported) {
        try {
          // Validar estructura básica
          if (!template.name || !template.fields || !template.lineRules) {
            errors.push(`Plantilla inválida: ${template.name || 'Sin nombre'}`);
            continue;
          }

          // Generar nuevo ID para evitar conflictos
          template.id = generateRandomId();
          this.addTemplate(template);
          importedCount++;
        } catch (error) {
          errors.push(`Error importando plantilla ${template.name}: ${error}`);
        }
      }

      return {
        success: errors.length === 0,
        imported: importedCount,
        errors
      };
    } catch (error) {
      return {
        success: false,
        imported: 0,
        errors: [`Error parsing JSON: ${error}`]
      };
    }
  },

  // Favorites management
  addFavorite(templateId: string): void {
    setFavorites(prev => {
      if (prev.includes(templateId)) return prev;
      const updated = [...prev, templateId];
      this.saveFavoritesToStorage(updated);
      return updated;
    });
  },

  removeFavorite(templateId: string): void {
    setFavorites(prev => {
      const updated = prev.filter(id => id !== templateId);
      this.saveFavoritesToStorage(updated);
      return updated;
    });
  },

  toggleFavorite(templateId: string): void {
    if (this.isFavorite(templateId)) {
      this.removeFavorite(templateId);
    } else {
      this.addFavorite(templateId);
    }
  },

  isFavorite(templateId: string): boolean {
    return favorites().includes(templateId);
  },

  getFavorites(): JournalTemplate[] {
    const favoriteIds = favorites();
    return templates().filter(t => favoriteIds.includes(t.id));
  },

  // Recent templates management
  addToRecent(templateId: string): void {
    setRecentTemplates(prev => {
      // Remove if already exists
      const filtered = prev.filter(id => id !== templateId);
      // Add to front
      const updated = [templateId, ...filtered];
      // Keep only last 10
      const limited = updated.slice(0, 10);
      this.saveRecentToStorage(limited);
      return limited;
    });
  },

  getRecentTemplates(limit: number = 10): JournalTemplate[] {
    const recentIds = recentTemplates().slice(0, limit);
    return recentIds
      .map(id => templates().find(t => t.id === id))
      .filter(t => t !== undefined) as JournalTemplate[];
  },

  clearRecentTemplates(): void {
    setRecentTemplates([]);
    this.saveRecentToStorage([]);
  },

  // Recent field values management
  saveRecentFieldValue(fieldName: string, value: any): void {
    setRecentFieldValues(prev => {
      const fieldValues = prev[fieldName] || [];
      // Remove if already exists
      const filtered = fieldValues.filter(v => JSON.stringify(v) !== JSON.stringify(value));
      // Add to front
      const updated = [value, ...filtered];
      // Keep only last 10
      const limited = updated.slice(0, 10);

      const newState = {
        ...prev,
        [fieldName]: limited
      };

      this.saveFieldValuesToStorage(newState);
      return newState;
    });
  },

  getRecentFieldValues(fieldName: string, limit: number = 10): any[] {
    const fieldValues = recentFieldValues()[fieldName] || [];
    return fieldValues.slice(0, limit);
  },

  // Guardar en localStorage
  saveToStorage() {
    try {
      const customTemplates = templates().filter(t => t.createdBy !== 'system');
      localStorage.setItem('journal-templates', JSON.stringify(customTemplates));
    } catch (error) {
      console.error('Error saving templates to storage:', error);
    }
  },

  // Save favorites to localStorage
  saveFavoritesToStorage(favoritesList: string[]) {
    try {
      localStorage.setItem('templateStore_favorites', JSON.stringify(favoritesList));
    } catch (error) {
      console.error('Error saving favorites to storage:', error);
    }
  },

  // Save recent templates to localStorage
  saveRecentToStorage(recentList: string[]) {
    try {
      localStorage.setItem('templateStore_recent', JSON.stringify(recentList));
    } catch (error) {
      console.error('Error saving recent templates to storage:', error);
    }
  },

  // Save recent field values to localStorage
  saveFieldValuesToStorage(fieldValuesMap: Record<string, any[]>) {
    try {
      localStorage.setItem('templateStore_fieldValues', JSON.stringify(fieldValuesMap));
    } catch (error) {
      console.error('Error saving field values to storage:', error);
    }
  },

  // Cargar desde localStorage
  loadFromStorage() {
    try {
      // Load custom templates from localStorage
      const stored = localStorage.getItem('journal-templates');
      if (stored) {
        const customTemplates: JournalTemplate[] = JSON.parse(stored);
        // Merge with existing templates (predefined ones loaded from presets)
        const currentTemplates = templates();
        const customIds = new Set(customTemplates.map(t => t.id));
        const mergedTemplates = [
          ...currentTemplates.filter(t => !customIds.has(t.id)),
          ...customTemplates
        ];
        setTemplates(mergedTemplates);
      }

      // Load favorites
      const storedFavorites = localStorage.getItem('templateStore_favorites');
      if (storedFavorites) {
        const favoritesList: string[] = JSON.parse(storedFavorites);
        setFavorites(favoritesList);
      }

      // Load recent templates
      const storedRecent = localStorage.getItem('templateStore_recent');
      if (storedRecent) {
        const recentList: string[] = JSON.parse(storedRecent);
        setRecentTemplates(recentList);
      }

      // Load recent field values
      const storedFieldValues = localStorage.getItem('templateStore_fieldValues');
      if (storedFieldValues) {
        const fieldValuesMap: Record<string, any[]> = JSON.parse(storedFieldValues);
        setRecentFieldValues(fieldValuesMap);
      }
    } catch (error) {
      console.error('Error loading templates from storage:', error);
    }
  },

  // Cargar plantillas desde la API
  async loadFromAPI(query?: string, filters?: any) {
    try {
      setIsLoading(true);
      setError(null);

      // Get API templates
      let apiTemplates: JournalTemplate[] = [];
      try {
        apiTemplates = await templatesApi.getAll(query, filters);
      } catch (apiError) {
        console.warn('API templates not available, using local templates only');
      }

      // Convert presets to templates
      const presetTemplates = TEMPLATE_PRESETS.map(preset => presetToTemplate(preset, 'system'));

      // Combine: predefined + presets + API templates (API overrides duplicates)
      const apiIds = new Set(apiTemplates.map(t => t.id));
      const presetIds = new Set(presetTemplates.map(t => t.id));

      const allTemplates = [
        ...predefinedTemplates.filter(t => !apiIds.has(t.id) && !presetIds.has(t.id)),
        ...presetTemplates.filter(t => !apiIds.has(t.id)),
        ...apiTemplates
      ];

      setTemplates(allTemplates);

      return allTemplates;
    } catch (error) {
      console.error('Error loading templates from API:', error);
      setError('Error al cargar plantillas desde el servidor');

      // Fallback to predefined + presets
      const presetTemplates = TEMPLATE_PRESETS.map(preset => presetToTemplate(preset, 'system'));
      setTemplates([...predefinedTemplates, ...presetTemplates]);
      return [...predefinedTemplates, ...presetTemplates];
    } finally {
      setIsLoading(false);
    }
  },

  // Refrescar datos (intentar API primero, luego localStorage)
  async refreshData(query?: string, filters?: any) {
    const apiTemplates = await this.loadFromAPI(query, filters);
    
    if (apiTemplates.length === 0) {
      // If API fails, still load from localStorage
      //this.loadFromStorage();
    }
    
    return templates();
  },

  // Inicializar store
  async initialize() {
    devLog('[templateStore] Initializing...');
    // Initialize with predefined templates + presets immediately
    const presetTemplates = TEMPLATE_PRESETS.map(preset => presetToTemplate(preset, 'system'));
    const allTemplates = [...predefinedTemplates, ...presetTemplates];
    devLog('[templateStore] Setting initial templates:', allTemplates.length, allTemplates.map(t => ({ name: t.name, isActive: t.isActive })));
    setTemplates(allTemplates);

    // Load favorites, recent templates, and field values from localStorage
    this.loadFromStorage();

    // Try to load from API only on authenticated pages (skip on public routes)
    setTimeout(async () => {
      const path = window.location.hash || window.location.pathname;
      const isPublicRoute = /\/(client-portal|tax-upload|tax-verify|signature-validation|remote-sign|booking|pin-access)/.test(path);
      if (isPublicRoute) {
        devLog('[templateStore] Skipping API call - public route');
        return;
      }
      devLog('[templateStore] Calling refreshData after timeout');
      await this.refreshData("");
    }, 450);
  }
};

// Inicializar al cargar
templateStore.initialize();






 
