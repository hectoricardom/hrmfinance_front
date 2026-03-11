/**
 * Centralized Permissions Configuration
 * Defines all available permissions in the system with categories
 */

export interface PermissionConfig {
  key: string;
  label: string;
  labelEs: string;
  description: string;
  descriptionEs: string;
  category: PermissionCategory;
  icon?: string;
}

export type PermissionCategory =
  | 'core'           // Core system permissions
  | 'finance'        // Finance & Accounting
  | 'inventory'      // Inventory management
  | 'shipping'       // Shipping & HBL
  | 'services'       // Services (passport, notary, remittance)
  | 'tax'            // Tax & Drake workflow
  | 'pos'            // Point of Sale
  | 'admin';         // Administrative

export const PERMISSION_CATEGORIES: Record<PermissionCategory, { label: string; labelEs: string; icon: string; order: number }> = {
  core: { label: 'Core Access', labelEs: 'Acceso Principal', icon: '🔑', order: 1 },
  finance: { label: 'Finance & Accounting', labelEs: 'Finanzas y Contabilidad', icon: '💰', order: 2 },
  inventory: { label: 'Inventory', labelEs: 'Inventario', icon: '📦', order: 3 },
  shipping: { label: 'Shipping & Logistics', labelEs: 'Envíos y Logística', icon: '🚚', order: 4 },
  services: { label: 'Services', labelEs: 'Servicios', icon: '📋', order: 5 },
  tax: { label: 'Tax Services', labelEs: 'Servicios de Impuestos', icon: '📊', order: 6 },
  pos: { label: 'Point of Sale', labelEs: 'Punto de Venta', icon: '🛒', order: 7 },
  admin: { label: 'Administration', labelEs: 'Administración', icon: '⚙️', order: 8 },
};

/**
 * All available permissions in the system
 */
export const PERMISSIONS: PermissionConfig[] = [
  // ============================================
  // CORE ACCESS
  // ============================================
  {
    key: 'onlyRead',
    label: 'Read Only',
    labelEs: 'Solo Lectura',
    description: 'Limited to read-only access across the system',
    descriptionEs: 'Limitado a acceso de solo lectura en todo el sistema',
    category: 'core',
    icon: '👁️'
  },
  {
    key: 'read_write',
    label: 'Read/Write',
    labelEs: 'Lectura/Escritura',
    description: 'Full read and write permissions',
    descriptionEs: 'Permisos completos de lectura y escritura',
    category: 'core',
    icon: '✏️'
  },

  // ============================================
  // FINANCE & ACCOUNTING
  // ============================================
  {
    key: 'AccountAccess',
    label: 'Account Access',
    labelEs: 'Acceso a Cuentas',
    description: 'Access to accounting features and chart of accounts',
    descriptionEs: 'Acceso a funciones contables y plan de cuentas',
    category: 'finance',
    icon: '📒'
  },
  {
    key: 'BankingAccess',
    label: 'Banking Access',
    labelEs: 'Acceso Bancario',
    description: 'Access to banking operations and reconciliation',
    descriptionEs: 'Acceso a operaciones bancarias y conciliación',
    category: 'finance',
    icon: '🏦'
  },
  {
    key: 'JournalAccess',
    label: 'Journal Access',
    labelEs: 'Acceso a Diario',
    description: 'Access to journal entries and ledger',
    descriptionEs: 'Acceso a asientos de diario y libro mayor',
    category: 'finance',
    icon: '📖'
  },
  {
    key: 'invoiceAccess',
    label: 'Invoice Access',
    labelEs: 'Acceso a Facturas',
    description: 'Access to create and manage invoices',
    descriptionEs: 'Acceso para crear y gestionar facturas',
    category: 'finance',
    icon: '🧾'
  },
  {
    key: 'RemittanceAccess',
    label: 'Remittance Access',
    labelEs: 'Acceso a Remesas',
    description: 'Access to remittances management',
    descriptionEs: 'Acceso a gestión de remesas',
    category: 'finance',
    icon: '💸'
  },

  // ============================================
  // INVENTORY
  // ============================================
  {
    key: 'InventoryAccess',
    label: 'Inventory Access',
    labelEs: 'Acceso a Inventario',
    description: 'Access to inventory management',
    descriptionEs: 'Acceso a gestión de inventario',
    category: 'inventory',
    icon: '📦'
  },
  {
    key: 'inventoryDownsection',
    label: 'Inventory Downsection',
    labelEs: 'Baja de Inventario',
    description: 'Access to inventory downsection and adjustments',
    descriptionEs: 'Acceso a baja y ajustes de inventario',
    category: 'inventory',
    icon: '📉'
  },
  {
    key: 'PurchaseRequestAccess',
    label: 'Purchase Request',
    labelEs: 'Solicitud de Compra',
    description: 'Access to purchase requests and orders',
    descriptionEs: 'Acceso a solicitudes de compra y órdenes',
    category: 'inventory',
    icon: '🛍️'
  },

  // ============================================
  // SHIPPING & LOGISTICS
  // ============================================
  {
    key: 'HBLAccess',
    label: 'HBL Access',
    labelEs: 'Acceso HBL',
    description: 'Access to HBL (House Bill of Lading) management',
    descriptionEs: 'Acceso a gestión de HBL (Guía Aérea)',
    category: 'shipping',
    icon: '✈️'
  },
  {
    key: 'HBLAccessManagement',
    label: 'HBL Management',
    labelEs: 'Gestión HBL',
    description: 'Full HBL management access with admin features',
    descriptionEs: 'Acceso completo a gestión HBL con funciones de admin',
    category: 'shipping',
    icon: '📋'
  },
  {
    key: 'HBLScannerAccess',
    label: 'HBL Scanner Only',
    labelEs: 'Solo Escáner HBL',
    description: 'Scanner access without full HBL privileges',
    descriptionEs: 'Acceso al escáner sin privilegios completos de HBL',
    category: 'shipping',
    icon: '📷'
  },
  {
    key: 'offersManagementAccess',
    label: 'YABA Offers Management',
    labelEs: 'Gestión de Ofertas YABA',
    description: 'Access to manage YABA shipping offers and configurations',
    descriptionEs: 'Acceso para gestionar ofertas y configuraciones de envío YABA',
    category: 'shipping',
    icon: '🏷️'
  },
  {
    key: 'internationalShippingAccess',
    label: 'International Shipping',
    labelEs: 'Envíos Internacionales',
    description: 'Access to international shipping module',
    descriptionEs: 'Acceso al módulo de envíos internacionales',
    category: 'shipping',
    icon: '🌎'
  },

  // ============================================
  // SERVICES (Passport, Notary, etc.)
  // ============================================
  {
    key: 'PassportAccess',
    label: 'Passport Access',
    labelEs: 'Acceso a Pasaportes',
    description: 'Access to passport applications',
    descriptionEs: 'Acceso a solicitudes de pasaporte',
    category: 'services',
    icon: '🛂'
  },
  {
    key: 'AdminPassportAccess',
    label: 'Passport Admin',
    labelEs: 'Admin de Pasaportes',
    description: 'Administrative access to passport management',
    descriptionEs: 'Acceso administrativo a gestión de pasaportes',
    category: 'services',
    icon: '🛃'
  },
  {
    key: 'NotaryAccess',
    label: 'Notary Access',
    labelEs: 'Acceso Notarial',
    description: 'Access to notary customer management',
    descriptionEs: 'Acceso a gestión de clientes notariales',
    category: 'services',
    icon: '📜'
  },

  // ============================================
  // TAX SERVICES (Drake, Tax Workflow)
  // ============================================
  {
    key: 'taxWorkflowAccess',
    label: 'Tax Workflow',
    labelEs: 'Flujo de Impuestos',
    description: 'Access to tax preparation workflow',
    descriptionEs: 'Acceso al flujo de preparación de impuestos',
    category: 'tax',
    icon: '📊'
  },
  {
    key: 'taxClientManagement',
    label: 'Tax Client Management',
    labelEs: 'Gestión de Clientes Tax',
    description: 'Manage tax clients and their documents',
    descriptionEs: 'Gestionar clientes de impuestos y sus documentos',
    category: 'tax',
    icon: '👥'
  },
  {
    key: 'taxDocumentUpload',
    label: 'Tax Document Upload',
    labelEs: 'Carga de Documentos Tax',
    description: 'Upload and manage tax documents',
    descriptionEs: 'Cargar y gestionar documentos de impuestos',
    category: 'tax',
    icon: '📤'
  },
  {
    key: 'taxReviewApproval',
    label: 'Tax Review & Approval',
    labelEs: 'Revisión y Aprobación Tax',
    description: 'Review and approve tax returns',
    descriptionEs: 'Revisar y aprobar declaraciones de impuestos',
    category: 'tax',
    icon: '✅'
  },
  {
    key: 'drakeExportAccess',
    label: 'Drake Export',
    labelEs: 'Exportar a Drake',
    description: 'Access to export data to Drake tax software',
    descriptionEs: 'Acceso para exportar datos al software Drake',
    category: 'tax',
    icon: '📤'
  },
  {
    key: 'taxReportsAccess',
    label: 'Tax Reports',
    labelEs: 'Reportes de Impuestos',
    description: 'Access to tax reports and analytics',
    descriptionEs: 'Acceso a reportes y análisis de impuestos',
    category: 'tax',
    icon: '📈'
  },

  // ============================================
  // POINT OF SALE
  // ============================================
  {
    key: 'posAccess',
    label: 'POS Access',
    labelEs: 'Acceso POS',
    description: 'Access to Point of Sale terminal',
    descriptionEs: 'Acceso al terminal de Punto de Venta',
    category: 'pos',
    icon: '🛒'
  },
  {
    key: 'posRefundAccess',
    label: 'POS Refunds',
    labelEs: 'Devoluciones POS',
    description: 'Permission to process refunds at POS',
    descriptionEs: 'Permiso para procesar devoluciones en POS',
    category: 'pos',
    icon: '↩️'
  },
  {
    key: 'posDiscountAccess',
    label: 'POS Discounts',
    labelEs: 'Descuentos POS',
    description: 'Permission to apply discounts at POS',
    descriptionEs: 'Permiso para aplicar descuentos en POS',
    category: 'pos',
    icon: '🏷️'
  },
  {
    key: 'posCashDrawerAccess',
    label: 'Cash Drawer',
    labelEs: 'Caja Registradora',
    description: 'Access to open and manage cash drawer',
    descriptionEs: 'Acceso para abrir y gestionar caja registradora',
    category: 'pos',
    icon: '💵'
  },

  // ============================================
  // ADMINISTRATION
  // ============================================
  {
    key: 'EmployeeAccess',
    label: 'Employee Management',
    labelEs: 'Gestión de Empleados',
    description: 'Access to employee management and timesheets',
    descriptionEs: 'Acceso a gestión de empleados y hojas de tiempo',
    category: 'admin',
    icon: '👔'
  },
  {
    key: 'userManagementAccess',
    label: 'User Management',
    labelEs: 'Gestión de Usuarios',
    description: 'Manage user accounts and permissions',
    descriptionEs: 'Gestionar cuentas de usuario y permisos',
    category: 'admin',
    icon: '👤'
  },
  {
    key: 'storeManagementAccess',
    label: 'Store Management',
    labelEs: 'Gestión de Tiendas',
    description: 'Manage store configurations',
    descriptionEs: 'Gestionar configuraciones de tiendas',
    category: 'admin',
    icon: '🏪'
  },
  {
    key: 'reportsAccess',
    label: 'Reports Access',
    labelEs: 'Acceso a Reportes',
    description: 'Access to system reports and dashboards',
    descriptionEs: 'Acceso a reportes del sistema y dashboards',
    category: 'admin',
    icon: '📊'
  },
  {
    key: 'auditLogAccess',
    label: 'Audit Log',
    labelEs: 'Registro de Auditoría',
    description: 'Access to view audit logs',
    descriptionEs: 'Acceso para ver registros de auditoría',
    category: 'admin',
    icon: '📝'
  },
  {
    key: 'isAdmin',
    label: 'Super Administrator',
    labelEs: 'Super Administrador',
    description: 'Full system administration rights - bypasses all permission checks',
    descriptionEs: 'Derechos completos de administración - omite todas las verificaciones de permisos',
    category: 'admin',
    icon: '👑'
  },
];

/**
 * Get permissions grouped by category
 */
export const getPermissionsByCategory = (): Record<PermissionCategory, PermissionConfig[]> => {
  const grouped: Record<PermissionCategory, PermissionConfig[]> = {
    core: [],
    finance: [],
    inventory: [],
    shipping: [],
    services: [],
    tax: [],
    pos: [],
    admin: [],
  };

  PERMISSIONS.forEach(permission => {
    grouped[permission.category].push(permission);
  });

  return grouped;
};

/**
 * Get sorted categories
 */
export const getSortedCategories = (): PermissionCategory[] => {
  return Object.entries(PERMISSION_CATEGORIES)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([key]) => key as PermissionCategory);
};

/**
 * Get default permissions object with all permissions set to false
 */
export const getDefaultPermissions = (): Record<string, boolean> => {
  const defaults: Record<string, boolean> = {};
  PERMISSIONS.forEach(p => {
    defaults[p.key] = false;
  });
  return defaults;
};

/**
 * Get permission config by key
 */
export const getPermissionByKey = (key: string): PermissionConfig | undefined => {
  return PERMISSIONS.find(p => p.key === key);
};

/**
 * Check if a permission key is valid
 */
export const isValidPermission = (key: string): boolean => {
  return PERMISSIONS.some(p => p.key === key);
};

/**
 * Legacy permission keys for backwards compatibility
 */
export const LEGACY_PERMISSION_KEYS = [
  'AccountAccess',
  'BankingAccess',
  'InventoryAccess',
  'EmployeeAccess',
  'invoiceAccess',
  'JournalAccess',
  'HBLAccess',
  'HBLAccessManagement',
  'HBLScannerAccess',
  'PurchaseRequestAccess',
  'PassportAccess',
  'AdminPassportAccess',
  'RemittanceAccess',
  'NotaryAccess',
  'offersManagementAccess',
  'inventoryDownsection',
  'onlyRead',
  'read_write',
  'isAdmin',
];

/**
 * All permission keys (including new ones)
 */
export const ALL_PERMISSION_KEYS = PERMISSIONS.map(p => p.key);

export default PERMISSIONS;
