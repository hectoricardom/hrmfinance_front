/**
 * Route Configuration
 * Defines routes with their permissions and lazy import paths
 * Components are NOT imported here - only the import function is defined
 *
 * Add more routes as needed following this pattern.
 */

export interface RouteConfig {
  path: string;
  /** Dynamic import function - only called after permission check */
  load: () => Promise<{ default: any }>;
  /** Required permission (single) */
  permission?: string;
  /** Required permissions (OR logic) */
  permissions?: string[];
  /** Feature name for unauthorized message */
  featureName: string;
  /** Is this a public route (no auth required)? */
  public?: boolean;
}

// Protected routes - require authentication + specific permissions
export const protectedRoutes: RouteConfig[] = [
  // Dashboard
  {
    path: '/',
    load: () => import('../pages/Dashboard'),
    featureName: 'Dashboard',
  },

  // Accounting Module
  {
    path: '/accounting',
    load: () => import('../modules/accounting/pages/AccountingDashboard'),
    permission: 'AccountAccess',
    featureName: 'Accounting Dashboard',
  },
  {
    path: '/accounting/accounts',
    load: () => import('../modules/accounting/pages/AccountsPage'),
    permission: 'AccountAccess',
    featureName: 'Chart of Accounts',
  },
  {
    path: '/accounting/transactions',
    load: () => import('../modules/accounting/pages/TransactionsPage'),
    permission: 'AccountAccess',
    featureName: 'Transactions',
  },
  {
    path: '/accounting/documents',
    load: () => import('../modules/accounting/pages/DocumentsPage'),
    permission: 'AccountAccess',
    featureName: 'Documents',
  },
  {
    path: '/accounting/reports',
    load: () => import('../modules/accounting/pages/ReportsPage'),
    permission: 'AccountAccess',
    featureName: 'Reports',
  },
  {
    path: '/accounting/tax-center',
    load: () => import('../modules/accounting/pages/TaxCenterPage'),
    permission: 'AccountAccess',
    featureName: 'Tax Center',
  },
  {
    path: '/accounting/learning',
    load: () => import('../modules/accounting/pages/LearningEnginePage'),
    permission: 'AccountAccess',
    featureName: 'Learning Engine',
  },
  {
    path: '/accounting/flow',
    load: () => import('../modules/accounting-flow/pages/AccountingFlowPage'),
    permission: 'AccountAccess',
    featureName: 'Accounting Flow',
  },

  // Tax/Drake Export Module
  {
    path: '/accounting/drake-export',
    load: () => import('../modules/drake-export/pages/DrakeExportPage'),
    permission: 'AccountAccess',
    featureName: 'Drake Export',
  },
  {
    path: '/accounting/tax-portal',
    load: () => import('../modules/drake-export/pages/TaxPortalPage'),
    permission: 'AccountAccess',
    featureName: 'Tax Portal',
  },
  {
    path: '/accounting/tax-clients',
    load: () => import('../modules/drake-export/pages/TaxClientListPage'),
    permission: 'AccountAccess',
    featureName: 'Tax Clients',
  },
  {
    path: '/accounting/tax-client/:id',
    load: () => import('../modules/drake-export/pages/TaxClientWorkspace'),
    permission: 'AccountAccess',
    featureName: 'Tax Client Workspace',
  },
  {
    path: '/tax-calculator',
    load: () => import('../modules/tax/components/TaxReturnCalculator'),
    permission: 'AccountAccess',
    featureName: 'Tax Calculator',
  },

  // HBL Module
  {
    path: '/hbl',
    load: () => import('../modules/hbl/pages/HBLTabbedPage'),
    permission: 'HBLAccess',
    featureName: 'HBL',
  },
  {
    path: '/hbl-scanner',
    load: () => import('../modules/hbl/pages/HBLScannerDemo'),
    permissions: ['HBLAccessManagement', 'HBLScannerAccess'],
    featureName: 'HBL Scanner',
  },
  {
    path: '/hbl-weight-filter',
    load: () => import('../modules/hbl/list/HBLAgencyWeightFilter'),
    permission: 'HBLAccess',
    featureName: 'HBL Weight Filter',
  },
  {
    path: '/delivery-manifest',
    load: () => import('../modules/hbl/pages/DeliveryManifestPage'),
    permission: 'HBLAccess',
    featureName: 'Delivery Manifest',
  },
  {
    path: '/hbl-scan-location',
    load: () => import('../modules/hbl/pages/HBLScanLocationDemo'),
    permission: 'HBLAccess',
    featureName: 'HBL Scan Location',
  },
  {
    path: '/hbl-location-summary',
    load: () => import('../modules/hbl/pages/HBLLocationSummary'),
    permission: 'HBLAccess',
    featureName: 'HBL Location Summary',
  },

  // Passport Module
  {
    path: '/passport',
    load: () => import('../modules/passport/pages/CubanPassportPage'),
    permission: 'PassportAccess',
    featureName: 'Passport',
  },
  {
    path: '/passport-photo-debug',
    load: () => import('../modules/passport/components/PassportPhotoDebug'),
    permission: 'PassportAccess',
    featureName: 'Passport Photo Debug',
  },

  // Remittance Module
  {
    path: '/remittances',
    load: () => import('../modules/remittances'),
    permission: 'RemittanceAccess',
    featureName: 'Remittances',
  },

  // Container Scanner
  {
    path: '/container-scanner',
    load: () => import('../modules/container-scanner/pages/ContainerScannerDemo'),
    permission: 'HBLAccess',
    featureName: 'Container Scanner',
  },

  // Admin Routes
  {
    path: '/admin/users',
    load: () => import('../modules/admin/UserProfileAdmin'),
    permission: 'AdminAccess',
    featureName: 'User Administration',
  },
  {
    path: '/admin/business',
    load: () => import('../modules/admin/BusinessManagement'),
    permission: 'AdminAccess',
    featureName: 'Business Management',
  },
  {
    path: '/admin/stores',
    load: () => import('../components/StoreManager'),
    permission: 'AdminAccess',
    featureName: 'Store Manager',
  },
  {
    path: '/admin/data-migration',
    load: () => import('../components/DataMigration'),
    permission: 'AdminAccess',
    featureName: 'Data Migration',
  },
  {
    path: '/admin/events',
    load: () => import('../modules/events/components/EventAutomationUI'),
    permission: 'AdminAccess',
    featureName: 'Event Automation',
  },

  // Supervision Module
  {
    path: '/supervision',
    load: () => import('../modules/supervision/pages/SupervisionDashboard'),
    permission: 'AdminAccess',
    featureName: 'Supervision Dashboard',
  },
  {
    path: '/supervision/adapters',
    load: () => import('../modules/supervision/pages/AdaptersListPage'),
    permission: 'AdminAccess',
    featureName: 'Adapters',
  },
  {
    path: '/supervision/adapters/:id',
    load: () => import('../modules/supervision/pages/AdapterDetailPage'),
    permission: 'AdminAccess',
    featureName: 'Adapter Detail',
  },
  {
    path: '/supervision/mappings',
    load: () => import('../modules/supervision/pages/AccountMappingsPage'),
    permission: 'AdminAccess',
    featureName: 'Account Mappings',
  },

  // Signature Manager
  {
    path: '/signatures',
    load: () => import('../pages/SignatureManagerPage'),
    featureName: 'Signature Manager',
  },
];

// Public routes - no authentication required
export const publicRoutes: RouteConfig[] = [
  {
    path: '/sign/:id/:token',
    load: () => import('../pages/PublicSignaturePageFirestore'),
    featureName: 'Public Signature',
    public: true,
  },
  {
    path: '/signature/:id/:token',
    load: () => import('../pages/PublicSignaturePageFirestore'),
    featureName: 'Public Signature',
    public: true,
  },
  {
    path: '/tax-upload/:id/:accessToken',
    load: () => import('../modules/drake-export/pages/PublicTaxUploadPage'),
    featureName: 'Tax Document Upload',
    public: true,
  },
  {
    path: '/client-portal/:id/:accessToken',
    load: () => import('../modules/drake-export/pages/PublicClientPortal'),
    featureName: 'Client Portal',
    public: true,
  },
  {
    path: '/tax-pin',
    load: () => import('../modules/drake-export/pages/PinAccessPage'),
    featureName: 'PIN Access',
    public: true,
  },
  {
    path: '/auth/magic-link-verify',
    load: () => import('../pages/MagicLinkVerify'),
    featureName: 'Magic Link Verify',
    public: true,
  },
];

// Get all routes
export const getAllRoutes = (): RouteConfig[] => [...publicRoutes, ...protectedRoutes];

// Find route config by path
export const findRouteConfig = (path: string): RouteConfig | undefined => {
  return getAllRoutes().find(route => route.path === path);
};
