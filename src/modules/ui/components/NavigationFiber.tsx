import { Component, Show, createSignal, For, onMount, onCleanup } from 'solid-js';
import { A } from '@solidjs/router';
import { useTranslation } from '../../../translations';
import { authStore } from '../../../stores/authStore';
import LanguageSelector from './LanguageSelector';
import Icon from '../../../components/Icon';
import StoreSelector from '../../../components/StoreSelector';
import BusinessSwitcher from '../../../components/BusinessSwitcher';
import YearSelector from '../../../components/YearSelector';
import { OfflineStatusBadge } from '../../hbl/offline';

const NavigationFiber: Component = () => {
  const { t } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = createSignal(false);
  const [expandedGroup, setExpandedGroup] = createSignal<string | null>(null);
  const [menuTimeout, setMenuTimeout] = createSignal<number | null>(null);

  // Google Fiber style colors
  const colors = {
    primary: '#1a73e8',
    primaryDark: '#1557b0',
    text: '#202124',
    textSecondary: '#5f6368',
    background: '#fff',
    border: '#e8eaed',
    shadow: '0 2px 4px rgba(0,0,0,0.1)',
    shadowLg: '0 2px 10px rgba(0,0,0,0.2)'
  };

  const handleSignOut = () => {
    authStore.signOut();
  };

  const hasPermission = (permission: string) => {
    const profile = authStore.state?.profile?.permissions;
    if (!profile) return false;
    return profile[permission] === true || profile.isAdmin === true;
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen());
    if (!isMobileMenuOpen()) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroup(expandedGroup() === groupName ? null : groupName);
  };

  const handleMouseEnter = (groupName: string) => {
    const timeout = menuTimeout();
    if (timeout) {
      clearTimeout(timeout);
      setMenuTimeout(null);
    }
    setExpandedGroup(groupName);
  };

  const handleMouseLeave = () => {
    const timeout = setTimeout(() => {
      setExpandedGroup(null);
    }, 300);
    setMenuTimeout(timeout);
  };

  // Handle click outside
  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.mobile-menu') && !target.closest('.mobile-menu-btn')) {
      setIsMobileMenuOpen(false);
      document.body.style.overflow = '';
    }
  };

  onMount(() => {
    document.addEventListener('click', handleClickOutside);
  });

  onCleanup(() => {
    document.removeEventListener('click', handleClickOutside);
    document.body.style.overflow = '';
  });

  // Menu structure
  const menuGroups = [
    {
      name: 'Finance',
      icon: 'finance',
      items: [
        { path: '/accounts', label: t('navigation.accounts'), permission: 'AccountAccess', icon: 'accounts' },
        { path: '/entry-books', label: t('navigation.entryBooks'), permission: 'JournalAccess', icon: 'books' },
        { path: '/balance-sheet', label: t('navigation.balanceSheet'), permission: 'AccountAccess', icon: 'balance-sheet' },
        { path: '/income-statement', label: t('navigation.incomeStatement', 'Estado de Resultados'), permission: 'AccountAccess', icon: 'balance-sheet' },
        { path: '/trial-balance', label: t('navigation.trialBalance', 'Balance de Comprobación'), permission: 'AccountAccess', icon: 'balance-sheet' },
        { path: '/trial-balance-audit', label: t('navigation.trialBalanceAudit', 'Auditoría de Balance'), permission: 'AccountAccess', icon: 'analytics' },
        { path: '/bank-consolidations', label: t('navigation.consolidate'), permission: 'BankingAccess', icon: 'bank' },
        { path: '/providers-clients', label: t('navigation.providersClients', 'Proveedores y Clientes'), permission: 'AccountAccess', icon: 'customer' },
        { path: '/event-automation', label: 'Event Automation', permission: 'AccountAccess', icon: 'automation-bolt' },
        { path: '/accounting', label: 'Accounting Flow', permission: 'AccountAccess', icon: 'sync' },
        { path: '/supervision', label: 'AI Supervision', permission: 'AccountAccess', icon: 'analytics' }
      ]
    },
    {
      name: 'Operations',
      icon: 'operations',
      items: [
        {
          label: t('navigation.inventory', 'Inventario'),
          permission: 'InventoryAccess',
          icon: 'inventory',
          submenu: [
            { path: '/inventory', label: t('navigation.inventoryDashboard', 'Dashboard'), permission: 'InventoryAccess', icon: 'dashboard' },
            { path: '/inventory/products', label: t('navigation.products', 'Productos'), permission: 'inventoryDownsection', icon: 'box' },
            { path: '/inventory/receiving', label: t('navigation.receiving', 'Recepcion'), permission: 'inventoryDownsection', icon: 'truck-loading' },
            { path: '/inventory/counting', label: t('navigation.counting', 'Conteo'), permission: 'inventoryDownsection', icon: 'clipboard-check' },
            { path: '/inventory/import', label: t('navigation.bulkImport', 'Importar Productos'), permission: 'isAdmin', icon: 'upload' },
            { path: '/inventory/stock-reconciliation', label: t('navigation.reconciliation', 'Reconciliacion'), permission: 'isAdmin', icon: 'balance-scale' },
            { path: '/offers-comparison', label: t('navigation.offersComparison', 'Comparar Ofertas'), permission: 'isAdmin', icon: 'compare' }
          ]
        },
        {
          label: t('navigation.sales', 'Ventas'),
          permission: 'invoiceAccess',
          icon: 'cash-register',
          submenu: [
            { path: '/invoices', label: t('invoices.invoices'), permission: 'invoiceAccess', icon: 'invoice' },
            { path: '/pos', label: t('navigation.pos', 'Point of Sale'), permission: 'invoiceAccess', icon: 'cash-register' },
          
          ]
        },
        {
          label: t('navigation.purchasing', 'Compras'),
          permission: 'PurchaseRequestAccess',
          icon: 'shopping-cart',
          submenu: [
            { path: '/purchase-requests', label: t('navigation.purchaseRequests', 'Solicitudes'), permission: 'PurchaseRequestAccess', icon: 'shopping-cart' },
            { path: '/purchase-registrations', label: t('navigation.purchaseRegistrations', 'Registros'), permission: 'PurchaseRequestAccess', icon: 'receipt' },
            { path: '/yaba-offers', label: 'Gestión de Ofertas YABA', permission: 'offersManagementAccess', icon: 'settings' }
          ]
        },
        {
          label: t('navigation.shipping', 'Envios'),
          icon: 'shipping',
          submenu: [
            { path: '/hbl', label: t('navigation.hbl'), permission: 'HBLAccess', icon: 'shipping' },
            { path: '/consignees', label: t('navigation.consignees', 'Consignatarios'), permission: 'HBLAccess', icon: 'customer' },
            { path: '/shippers', label: t('navigation.shippers', 'Transportistas'), permission: 'HBLAccess', icon: 'truck' },
            { path: '/remittances', label: t('navigation.remittances', 'Remesas'), permission: 'RemittanceAccess', icon: 'money-transfer' }
          ]
        }
      ]
    },
    {
      name: 'Management',
      icon: 'management',
      items: [
        { path: '/employees', label: t('navigation.employees'), permission: 'EmployeeAccess', icon: 'employees' },
        { path: '/timesheets', label: t('navigation.timesheets', 'Timesheets'), permission: 'EmployeeAccess', icon: 'clock' },
        { path: '/timesheet-comparison', label: 'Timesheet Versions', permission: 'EmployeeAccess', icon: 'analytics' },
        { path: '/tax-clients', label: 'Impuestos', permission: 'taxWorkflowAccess', icon: 'finance' },
        {
          label: 'Tax Office',
          permission: 'taxWorkflowAccess',
          icon: 'finance',
          submenu: [
            { path: '/smart-queue', label: 'Smart Queue', permission: 'taxWorkflowAccess', icon: 'list' },
            { path: '/scan', label: 'Scan Documents', permission: 'taxWorkflowAccess', icon: 'camera' },
            { path: '/check-in', label: 'Check-In Queue', permission: 'taxWorkflowAccess', icon: 'clock' },
            { path: '/kiosk', label: 'Kiosk Mode', permission: 'taxWorkflowAccess', icon: 'dashboard' },
            { path: '/assistant', label: 'Assistant View', permission: 'taxWorkflowAccess', icon: 'employees' },
            { path: '/messaging-settings', label: 'Messaging', permission: 'taxWorkflowAccess', icon: 'edit' },
            { path: '/payment-settings', label: 'Payment Settings', permission: 'taxWorkflowAccess', icon: 'cash-register' },
          ]
        }
      ]
    },
    {
      name: 'Appointments',
      icon: 'calendar',
      permission: 'AppointmentAccess',
      items: [
        { path: '/appointments', label: t('navigation.appointments', 'Appointments'), permission: 'AppointmentAccess', icon: 'calendar' },
        { path: '/event-types', label: t('navigation.eventTypes', 'Event Types'), permission: 'AppointmentAccess', icon: 'list' },
        { path: '/availability', label: t('navigation.availability', 'Availability'), permission: 'AppointmentAccess', icon: 'clock' },
      ]
    },
    {
      name: 'Admin',
      icon: 'settings',
      permission: 'isAdmin',
      items: [
        { path: '/admin/users', label: 'User Management', permission: 'isAdmin', icon: 'admin', adminOnly: true },
        { path: '/admin/businesses', label: 'Business Management', permission: 'isAdmin', icon: 'business', adminOnly: true },
        { path: '/admin/stores', label: 'Store Management', permission: 'isAdmin', icon: 'store', adminOnly: true },
        { path: '/admin/migration', label: 'Data Migration', permission: 'isAdmin', icon: 'sync', adminOnly: true },
        { path: '/tax-calculator', label: 'Calculadora de Impuestos', permission: 'taxWorkflowAccess', icon: 'finance', adminOnly: true  },
        
      ]
    },
    {
      name: 'Utils',
      icon: 'camera',
      permission: 'AppointmentAccess',
      items: [
        { 
          label: "HBL", permission: 'HBLAccessManagement', icon: 'shipping', 
          submenu: [
            { path: '/hbl-scan-location', label: 'HBL Scan Location Tracking', permission: 'HBLAccessManagement', icon: 'location' },
            { path: '/hbl-manage', label: t('navigation.hbl'), permission: 'HBLAccessManagement', icon: 'shipping', },
            { path: '/hbl-location-summary', label: 'HBL Location Summary', permission: 'HBLAccessManagement', icon: 'analytics' },
            { path: '/container-scanner', label: t('navigation.containerScanner', 'Container Scanner'), permission: 'HBLAccessManagement', icon: 'qr-code' },
            { path: '/container-management', label: t('navigation.containerManagement', 'Containers'), permission: 'HBLAccessManagement', icon: 'qr-code' },
            
          ]
        },
        { path: '/hbl-offline-scanner', label: t('navigation.hblMobileScanner', 'HBL Mobile Scanner'), permission: 'HBLScannerAccess', icon: 'camera' },
        {
          label: "cuban passport", 
          permission: 'HBLAccessManagement', icon: 'passport', 
          submenu: [
            { path: '/cuban-passport', label: t('navigation.cubanPassport', 'Pasaporte Cubano'), permission: 'PassportAccess', icon: 'passport' },
            { path: '/pdf-signature', label: t('navigation.pdfSignature', 'Firmar PDF'), permission: 'AdminPassportAccess', icon: 'edit' },
            { path: '/signature-requests', label: t('navigation.signatureRequests', 'Solicitud de Firmas'), permission: 'PassportAccess', icon: 'signature' },
            { path: '/passport-photo', label: t('navigation.passportPhoto', 'Foto para Pasaporte'), permission: 'AdminPassportAccess', icon: 'camera' },
            { path: '/fingerprint-capture', label: t('navigation.fingerprintCapture', 'Captura de Huellas'), permission: 'PassportAccess', icon: 'finger-print' },
          ]
        },
        { path: '/notary-customers', label: t('navigation.notaryCustomers', 'Clientes Notariales'), permission: 'NotaryAccess', icon: 'customer' },
        { path: '/notary/motion-to-dismiss', label: t('navigation.motionToDismiss', 'Motion to Dismiss'), permission: 'NotaryAccess', icon: 'document' },
        { path: '/notary/g1650', label: t('navigation.g1650Form', 'G-1650 ACH Authorization'), permission: 'NotaryAccess', icon: 'bank' },
      ]
    }
  ];

  // State for expanded submenu
  const [expandedSubmenu, setExpandedSubmenu] = createSignal<string | null>(null);

  // Filter submenu items based on permissions
  const filterSubmenu = (submenu: any[] | undefined): any[] => {
    if (!submenu) return [];
    return submenu.filter(item =>
      item.adminOnly ? authStore.state?.profile?.isAdmin : hasPermission(item.permission)
    );
  };

  // Filter groups based on permissions, including submenus
  const visibleGroups = () => {
    return menuGroups.map(group => ({
      ...group,
      items: group.items
        .map(item => ({
          ...item,
          submenu: filterSubmenu(item.submenu)
        }))
        .filter(item =>
          item.submenu && item.submenu.length > 0
            ? true
            : item.path && (item.adminOnly ? authStore.state?.profile?.isAdmin : hasPermission(item.permission))
        )
    })).filter(group => group.items.length > 0);
  };

  return (
    <>
      <nav class="navbar-fiber">
        <div class="navbar-container">
          {/* Logo Section */}
          <div class="navbar-logo">
            <A href="/" class="logo-link">
             
              <span class="logo-text">HRM Finance</span>
            </A>
          </div>

          {/* Desktop Navigation */}
          <div class="navbar-menu desktop-menu">
            <For each={visibleGroups()}>
              {(group) => (
                <div
                  class="nav-item dropdown"
                  onMouseEnter={() => handleMouseEnter(group.name)}
                  onMouseLeave={handleMouseLeave}
                >
                  <button class="nav-link dropdown-toggle">
                    {group.name}
                  </button>

                  <div class="dropdown-menu" classList={{ active: expandedGroup() === group.name }}>
                    <div class="dropdown-content">
                      <For each={group.items}>
                        {(item) => (
                          <Show
                            when={item.submenu && item.submenu.length > 0}
                            fallback={
                              <A
                                href={item.path || '#'}
                                class="dropdown-item"
                                activeClass="active-link"
                                onClick={() => setExpandedGroup(null)}
                              >
                                <Icon name={item.icon} size="1em" />
                                <span>{item.label}</span>
                              </A>
                            }
                          >
                            <div
                              class="submenu-container"
                              onMouseEnter={() => setExpandedSubmenu(item.label)}
                              onMouseLeave={() => setExpandedSubmenu(null)}
                            >
                              <button class="dropdown-item submenu-trigger">
                                <span>
                                  <Icon name={item.icon} size="1em" /> {item.label}
                                </span>
                                <span class="submenu-arrow">▶</span>
                              </button>

                              <div
                                class="submenu-dropdown"
                                classList={{ active: expandedSubmenu() === item.label }}
                              >
                                <For each={item.submenu}>
                                  {(subItem: any) => (
                                    <A
                                      href={subItem.path || '#'}
                                      class="dropdown-item"
                                      activeClass="active-link"
                                      onClick={() => {
                                        setExpandedGroup(null);
                                        setExpandedSubmenu(null);
                                      }}
                                    >
                                      <Icon name={subItem.icon} size="1em" /> {subItem.label}
                                    </A>
                                  )}
                                </For>
                              </div>
                            </div>
                          </Show>
                        )}
                      </For>
                    </div>
                  </div>
                </div>
              )}
            </For>
          </div>

          {/* Right Side Actions */}
          <div class="navbar-actions">
            <Show when={hasPermission('HBLAccessManagement') || hasPermission('HBLScannerAccess')}>
              <A href="/hbl-offline-scanner" style={{ 'text-decoration': 'none' }}>
                <OfflineStatusBadge compact />
              </A>
            </Show>
            <YearSelector />
            <Show when={authStore.isAdmin()}>
              <BusinessSwitcher />
            </Show>
            <LanguageSelector />
            <Show when={authStore.currentUser}>
              <A href="#" class="nav-link sign-in">{authStore.currentUser?.email}</A>
              <button class="btn-primary" onClick={handleSignOut}>Sign Out</button>
            </Show>
          </div>

          {/* Mobile Menu Button */}
          <button class="mobile-menu-btn" onClick={toggleMobileMenu}>
            <span class="hamburger" classList={{ active: isMobileMenuOpen() }}></span>
          </button>
        </div>

        {/* Mobile Menu Backdrop */}
        <div 
          class="mobile-backdrop" 
          classList={{ active: isMobileMenuOpen() }}
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>

        {/* Mobile Navigation */}
        <div class="mobile-menu" classList={{ active: isMobileMenuOpen() }}>
          <A 
            href="/" 
            class="mobile-nav-link"
            activeClass="active-link"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <Icon name="dashboard" size="1em" /> 
            <span>{t('navigation.dashboard')}</span>
          </A>
          
          <For each={visibleGroups()}>
            {(group) => (
              <div class="mobile-group">
                <div 
                  class="mobile-group-header"
                  onClick={() => toggleGroup(group.name)}
                >
                  <span>{group.name}</span>
                  <span class="chevron" classList={{ expanded: expandedGroup() === group.name }}>▼</span>
                </div>
                
                <div class="mobile-submenu" classList={{ expanded: expandedGroup() === group.name }}>
                    <For each={group.items}>
                      {(item) => (
                        <Show
                          when={item.submenu && item.submenu.length > 0}
                          fallback={
                            <A
                              href={item.path || '#'}
                              class="mobile-nav-link submenu-item"
                              activeClass="active-link"
                              onClick={() => setIsMobileMenuOpen(false)}
                            >
                              <Icon name={item.icon} size="1em" />
                              <span>{item.label}</span>
                            </A>
                          }
                        >
                          <div class="mobile-nested-group">
                            <div
                              class="mobile-nested-header"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedSubmenu(expandedSubmenu() === item.label ? null : item.label);
                              }}
                            >
                              <span><Icon name={item.icon} size="1em" /> {item.label}</span>
                              <span class="chevron" classList={{ expanded: expandedSubmenu() === item.label }}>▼</span>
                            </div>
                            <div class="mobile-nested-submenu" classList={{ expanded: expandedSubmenu() === item.label }}>
                              <For each={item.submenu}>
                                {(subItem: any) => (
                                  <A
                                    href={subItem.path || '#'}
                                    class="mobile-nav-link nested-item"
                                    activeClass="active-link"
                                    onClick={() => {
                                      setIsMobileMenuOpen(false);
                                      setExpandedSubmenu(null);
                                    }}
                                  >
                                    <Icon name={subItem.icon} size="0.9em" /> {subItem.label}
                                  </A>
                                )}
                              </For>
                            </div>
                          </div>
                        </Show>
                      )}
                    </For>
                  </div>
              </div>
            )}
          </For>
          
          <div class="mobile-divider"></div>
          <Show when={authStore.currentUser}>
            {/* Year Selector in Mobile Menu */}
            <Show when={authStore?.isAdmin()}>
            <div class="mobile-year-selector" style={{ padding: '0.5rem 1rem', 'margin-bottom': '0.5rem' }}>
              <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', 'margin-bottom': '0.5rem' }}>
                Año Fiscal
              </div>
              <YearSelector />
            </div>
            {/* Business Switcher in Mobile Menu */}
            <div class="mobile-business-switcher" style={{ padding: '0.5rem 1rem', 'margin-bottom': '0.5rem' }}>
              <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', 'margin-bottom': '0.5rem' }}>
                Business Context
              </div>
              <BusinessSwitcher />
            </div>
            </Show>
            <div class="mobile-user-section">
              <div class="mobile-user-info">
                <Show when={authStore.currentUser?.photoURL}>
                  <img src={authStore.currentUser!.photoURL!} alt="User avatar" />
                </Show>
                <span>{authStore.currentUser?.displayName || authStore.currentUser?.email}</span>
              </div>
              <button class="btn-primary mobile-btn" onClick={handleSignOut}>
                Sign Out
              </button>
            </div>
          </Show>
        </div>
      </nav>

      <style>{`
        /* Google Fiber Style Navigation */
        /* Animations */
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideIn {
          from {
            transform: translateX(-100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        /* Google Fiber Style Navigation */
        .navbar-fiber {
          background-color: #fff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          position: sticky;
          top: 0;
          z-index: 1000;
          font-family: "Google Sans", Roboto, Arial, sans-serif;
        }

        .navbar-container {
          max-width: 1440px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          height: 64px;
        }

        /* Logo */
        .navbar-logo {
          display: flex;
          align-items: center;
        }

        .logo-link {
          display: flex;
          align-items: center;
          text-decoration: none;
          color: #202124;
        }

        .logo-svg {
          width: 32px;
          height: 32px;
          margin-right: 8px;
        }

        .logo-text {
          font-size: 22px;
          font-weight: 400;
          color: #5f6368;
        }

        /* Desktop Menu */
        .navbar-menu {
          display: flex;
          align-items: center;
          gap: 32px;
          margin-left: auto;
          margin-right: 32px;
        }

        .nav-item {
          position: relative;
        }

        .nav-link {
          text-decoration: none;
          color: #5f6368;
          font-size: 14px;
          font-weight: 400;
          padding: 8px 0;
          border: none;
          background: none;
          cursor: pointer;
          transition: color 0.2s ease;
          position: relative;
        }

        /* Underline effect on hover */
        .nav-link::after {
          content: '';
          position: absolute;
          width: 0;
          height: 2px;
          bottom: 0;
          left: 50%;
          background-color: #1a73e8;
          transition: all 0.3s ease;
        }

        .nav-link:hover::after {
          width: 100%;
          left: 0;
        }

        .nav-link:hover {
          color: #202124;
        }

        /* Dropdown 
        .dropdown-toggle::after {
          content: " ▼";
          font-size: 10px;
          transition: transform 0.2s ease;
        }

        .nav-item:hover .dropdown-toggle::after {
          transform: rotate(180deg);
        }
        */

        /* Dropdown */
        .dropdown-menu {
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%) translateY(-10px);
          background: #fff;
          box-shadow: 0 2px 10px rgba(0,0,0,0.2);
          border-radius: 8px;
          padding: 8px 0;
          opacity: 0;
          visibility: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
          min-width: 200px;
          margin-top: 8px;
        }

        .dropdown-menu.active {
          opacity: 1;
          visibility: visible;
          transform: translateX(-50%) translateY(0);
        }

        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          color: #202124;
          font-size: 14px;
          padding: 8px 24px;
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
        }

        /* Ripple effect on hover */
        .dropdown-item::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 0;
          width: 0;
          height: 100%;
          background-color: rgba(149, 151, 154, 0.08);
          transform: translateY(-50%);
          transition: width 0.3s ease;
        }

        .dropdown-item:hover::before {
          width: 100%;
        }

        .dropdown-item:hover {
          background-color: #f8f9fa;
        }

        .dropdown-item.active-link {
          color: #1a73e8;
          background-color: #e8f0fe;
        }

        /* Submenu styles */
        .submenu-container {
          position: relative;
        }

        .submenu-trigger {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          background: transparent;
          border: none;
          cursor: pointer;
        }

        .submenu-arrow {
          font-size: 10px;
          margin-left: 8px;
          opacity: 0.6;
        }

        .submenu-dropdown {
          position: absolute;
          top: 0;
          left: 100%;
          background: #fff;
          box-shadow: 0 2px 10px rgba(0,0,0,0.2);
          border-radius: 8px;
          min-width: 200px;
          opacity: 0;
          visibility: hidden;
          transform: translateX(-10px);
          transition: all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);
          z-index: 11;
        }

        .submenu-dropdown.active {
          opacity: 1;
          visibility: visible;
          transform: translateX(0);
        }

        .submenu-container:hover .submenu-dropdown {
          opacity: 1;
          visibility: visible;
          transform: translateX(0);
        }

        /* Mobile nested submenu styles */
        .mobile-nested-group {
          background: #f1f3f4;
        }

        .mobile-nested-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 24px 12px 48px;
          cursor: pointer;
          font-weight: 500;
          font-size: 14px;
          color: #202124;
          border-bottom: 1px solid #e8eaed;
        }

        .mobile-nested-header:hover {
          background: #e8eaed;
        }

        .mobile-nested-submenu {
          max-height: 0;
          overflow: hidden;
          opacity: 0;
          transition: max-height 0.3s cubic-bezier(0.4, 0.0, 0.2, 1), opacity 0.2s ease;
          background: #fff;
        }

        .mobile-nested-submenu.expanded {
          max-height: 400px;
          opacity: 1;
        }

        .nested-item {
          padding-left: 64px !important;
          font-size: 13px !important;
        }

        /* Actions */
        .navbar-actions {
          display: flex;
          align-items: center;
          gap: 24px;
        }

        /* Fade in effect for actions */
        .navbar-actions > * {
          animation: fadeIn 0.5s ease-out;
          animation-fill-mode: both;
        }

        .navbar-actions > *:nth-child(1) { animation-delay: 0.1s; }
        .navbar-actions > *:nth-child(2) { animation-delay: 0.2s; }
        .navbar-actions > *:nth-child(3) { animation-delay: 0.3s; }

        .sign-in {
          font-weight: 500;
          color: #1a73e8 !important;
        }

        .sign-in:hover {
          color: #1557b0 !important;
        }

        .btn-primary {
          background-color: #1a73e8;
          color: #fff;
          border: none;
          padding: 8px 24px;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
        }

        .btn-primary::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          transform: translate(-50%, -50%);
          transition: width 0.5s ease, height 0.5s ease;
        }

        .btn-primary:hover {
          background-color: #1557b0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
          transform: translateY(-1px);
        }

        .btn-primary:hover::before {
          width: 300px;
          height: 300px;
        }

        /* Mobile Menu Button */
        .mobile-menu-btn {
          display: none;
          background: none;
          border: none;
          padding: 8px;
          cursor: pointer;
        }

        .hamburger {
          display: block;
          width: 24px;
          height: 2px;
          background: #5f6368;
          position: relative;
          transition: background 0.2s ease;
        }

        .hamburger::before,
        .hamburger::after {
          content: "";
          display: block;
          width: 24px;
          height: 2px;
          background: #5f6368;
          position: absolute;
          transition: transform 0.2s ease;
        }

        .hamburger::before {
          top: -8px;
        }

        .hamburger::after {
          bottom: -8px;
        }

        .hamburger.active {
          background: transparent;
        }

        .hamburger.active::before {
          transform: rotate(45deg);
          top: 0;
        }

        .hamburger.active::after {
          transform: rotate(-45deg);
          bottom: 0;
        }

        /* Mobile Backdrop */
        .mobile-backdrop {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0);
          z-index: 999;
          transition: background-color 0.3s ease;
          pointer-events: none;
        }

        .mobile-backdrop.active {
          background-color: rgba(0, 0, 0, 0.5);
          pointer-events: auto;
        }

        /* Mobile Menu */
        .mobile-menu {
          display: none;
          position: fixed;
          top: 64px;
          left: 0;
          width: 100%;
          height: calc(100vh - 64px);
          background: #fff;
          overflow-y: auto;
          transform: translateX(-100%);
          opacity: 0;
          transition: transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1), opacity 0.3s ease;
          z-index: 1001;
        }

        .mobile-menu.active {
          transform: translateX(0);
          opacity: 1;
          animation: slideIn 0.3s ease-out;
        }

        .mobile-nav-link {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          color: #202124;
          font-size: 16px;
          padding: 16px 24px;
          border-bottom: 1px solid #e8eaed;
          transition: background-color 0.2s ease;
        }

        .mobile-nav-link:hover {
          background-color: #f8f9fa;
        }

        .mobile-nav-link.active-link {
          color: #1a73e8;
          background-color: #e8f0fe;
        }

        .mobile-group {
          border-bottom: 1px solid #e8eaed;
        }

        .mobile-group-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          cursor: pointer;
          font-weight: 500;
          color: #202124;
        }

        .chevron {
          font-size: 12px;
          transition: transform 0.2s ease;
        }

        .chevron.expanded {
          transform: rotate(180deg);
        }

        .mobile-submenu {
          background: #f8f9fa;
          max-height: 0;
          overflow: hidden;
          opacity: 0;
          transition: max-height 0.3s cubic-bezier(0.4, 0.0, 0.2, 1), opacity 0.2s ease;
        }
        
        .mobile-submenu.expanded {
          max-height: 500px;
          opacity: 1;
          animation: fadeIn 0.3s ease-out;
          overflow-y: auto;
        }

        .submenu-item {
          padding-left: 48px;
        }

        .mobile-divider {
          height: 1px;
          background: #e8eaed;
          margin: 16px 0;
        }

        .mobile-user-section {
          padding: 24px;
        }

        .mobile-user-info {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .mobile-user-info img {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
        }

        .mobile-btn {
          width: 100%;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .navbar-menu.desktop-menu {
            display: none;
          }
          
          .navbar-actions {
            display: none;
          }
          
          .mobile-menu-btn {
            display: block;
          }
          
          .mobile-menu {
            display: block;
          }
          
          .mobile-backdrop {
            display: block;
          }
          
          .navbar-container {
            padding: 0 16px;
          }
        }

        @media (max-width: 600px) {
          .navbar-container {
            height: 56px;
          }
          
          .logo-svg {
            width: 28px;
            height: 28px;
          }
          
          .logo-text {
            font-size: 20px;
          }
          
          .mobile-menu {
            top: 56px;
            height: calc(100vh - 56px);
          }
        }
      `}</style>
    </>
  );
};

export default NavigationFiber;




/**
 * 
 *  <svg class="logo-svg" width="24" height="24" viewBox="0 0 24 24">
                <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>





              .MuiList-root.MuiList-padding.MuiMenu-list.css-ubifyk.highlighted-element {
  accent-color: auto;
  align-content: normal;
  align-items: normal;
  align-self: auto;
  alignment-baseline: auto;
  anchor-name: none;
  anchor-scope: none;
  animation-composition: replace;
  animation-delay: 0s;
  animation-direction: normal;
  animation-duration: 0s;
  animation-fill-mode: none;
  animation-iteration-count: 1;
  animation-name: none;
  animation-play-state: running;
  animation-range-end: normal;
  animation-range-start: normal;
  animation-timeline: auto;
  animation-timing-function: ease;
  app-region: none;
  appearance: none;
  backdrop-filter: none;
  backface-visibility: visible;
  background-attachment: scroll;
  background-blend-mode: normal;
  background-clip: border-box;
  background-color: rgba(0, 0, 0, 0);
  background-image: none;
  background-origin: padding-box;
  background-position: 0% 0%;
  background-repeat: repeat;
  background-size: auto;
  baseline-shift: 0px;
  baseline-source: auto;
  block-size: 600px;
  border-block-end-color: rgb(32, 33, 36);
  border-block-end-style: none;
  border-block-end-width: 0px;
  border-block-start-color: rgb(32, 33, 36);
  border-block-start-style: none;
  border-block-start-width: 0px;
  border-bottom-color: rgb(32, 33, 36);
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
  border-bottom-style: none;
  border-bottom-width: 0px;
  border-collapse: separate;
  border-end-end-radius: 8px;
  border-end-start-radius: 8px;
  border-image-outset: 0;
  border-image-repeat: stretch;
  border-image-slice: 100%;
  border-image-source: none;
  border-image-width: 1;
  border-inline-end-color: rgb(32, 33, 36);
  border-inline-end-style: none;
  border-inline-end-width: 0px;
  border-inline-start-color: rgb(32, 33, 36);
  border-inline-start-style: none;
  border-inline-start-width: 0px;
  border-left-color: rgb(32, 33, 36);
  border-left-style: none;
  border-left-width: 0px;
  border-right-color: rgb(32, 33, 36);
  border-right-style: none;
  border-right-width: 0px;
  border-start-end-radius: 8px;
  border-start-start-radius: 8px;
  border-top-color: rgb(32, 33, 36);
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
  border-top-style: none;
  border-top-width: 0px;
  bottom: 0px;
  box-decoration-break: slice;
  box-shadow: none;
  box-sizing: border-box;
  break-after: auto;
  break-before: auto;
  break-inside: auto;
  buffered-rendering: auto;
  caption-side: top;
  caret-animation: auto;
  caret-color: rgb(32, 33, 36);
  clear: none;
  clip: auto;
  clip-path: none;
  clip-rule: nonzero;
  color: rgb(32, 33, 36);
  color-interpolation: srgb;
  color-interpolation-filters: linearrgb;
  color-rendering: auto;
  column-count: auto;
  column-gap: normal;
  column-rule-color: rgb(32, 33, 36);
  column-rule-style: none;
  column-rule-width: 0px;
  column-span: none;
  column-width: auto;
  contain-intrinsic-block-size: none;
  contain-intrinsic-height: none;
  contain-intrinsic-inline-size: none;
  contain-intrinsic-size: none;
  contain-intrinsic-width: none;
  container-name: none;
  container-type: normal;
  content: normal;
  corner-bottom-left-shape: round;
  corner-bottom-right-shape: round;
  corner-end-end-shape: round;
  corner-end-start-shape: round;
  corner-start-end-shape: round;
  corner-start-start-shape: round;
  corner-top-left-shape: round;
  corner-top-right-shape: round;
  cursor: pointer;
  cx: 0px;
  cy: 0px;
  d: none;
  direction: ltr;
  display: block;
  dominant-baseline: auto;
  dynamic-range-limit: no-limit;
  empty-cells: show;
  field-sizing: fixed;
  fill: rgb(0, 0, 0);
  fill-opacity: 1;
  fill-rule: nonzero;
  filter: none;
  flex-basis: auto;
  flex-direction: row;
  flex-grow: 0;
  flex-shrink: 1;
  flex-wrap: nowrap;
  float: none;
  flood-color: rgb(0, 0, 0);
  flood-opacity: 1;
  font-family: "Google Sans Text", Arial, Helvetica, sans-serif;
  font-kerning: auto;
  font-optical-sizing: auto;
  font-palette: normal;
  font-size: 16px;
  font-size-adjust: none;
  font-stretch: 100%;
  font-style: normal;
  font-synthesis-small-caps: auto;
  font-synthesis-style: auto;
  font-synthesis-weight: auto;
  font-variant: normal;
  font-variant-alternates: normal;
  font-variant-caps: normal;
  font-variant-east-asian: normal;
  font-variant-emoji: normal;
  font-variant-ligatures: normal;
  font-variant-numeric: normal;
  font-variant-position: normal;
  font-weight: 400;
  grid-auto-columns: auto;
  grid-auto-flow: row;
  grid-auto-rows: auto;
  grid-column-end: auto;
  grid-column-start: auto;
  grid-row-end: auto;
  grid-row-start: auto;
  grid-template-areas: none;
  grid-template-columns: none;
  grid-template-rows: none;
  height: 600px;
  hyphenate-character: auto;
  hyphenate-limit-chars: auto;
  hyphens: manual;
  image-orientation: from-image;
  image-rendering: auto;
  initial-letter: normal;
  inline-size: 1076px;
  inset-block-end: 0px;
  inset-block-start: 0px;
  inset-inline-end: 0px;
  inset-inline-start: 0px;
  interactivity: auto;
  interpolate-size: numeric-only;
  isolation: auto;
  justify-content: normal;
  justify-items: normal;
  justify-self: auto;
  left: 0px;
  letter-spacing: 0.1px;
  lighting-color: rgb(255, 255, 255);
  line-break: auto;
  line-height: 24px;
  list-style-image: none;
  list-style-position: outside;
  list-style-type: none;
  margin-block-end: 0px;
  margin-block-start: 0px;
  margin-bottom: 0px;
  margin-inline-end: 0px;
  margin-inline-start: 0px;
  margin-left: 0px;
  margin-right: 0px;
  margin-top: 0px;
  marker-end: none;
  marker-mid: none;
  marker-start: none;
  mask-clip: border-box;
  mask-composite: add;
  mask-image: none;
  mask-mode: match-source;
  mask-origin: border-box;
  mask-position: 0% 0%;
  mask-repeat: repeat;
  mask-size: auto;
  mask-type: luminance;
  math-depth: 0;
  math-shift: normal;
  math-style: normal;
  max-block-size: 600px;
  max-height: 600px;
  max-inline-size: none;
  max-width: none;
  min-block-size: 0px;
  min-height: 0px;
  min-inline-size: 1060px;
  min-width: 1060px;
  mix-blend-mode: normal;
  object-fit: fill;
  object-position: 50% 50%;
  object-view-box: none;
  offset-anchor: auto;
  offset-distance: 0px;
  offset-path: none;
  offset-position: normal;
  offset-rotate: auto 0deg;
  opacity: 1;
  order: 0;
  orphans: 2;
  outline-color: rgb(32, 33, 36);
  outline-offset: 0px;
  outline-style: none;
  outline-width: 0px;
  overflow-anchor: auto;
  overflow-block: visible;
  overflow-clip-margin: 0px;
  overflow-inline: visible;
  overflow-wrap: break-word;
  overflow-x: visible;
  overflow-y: visible;
  overlay: none;
  overscroll-behavior-block: auto;
  overscroll-behavior-inline: auto;
  padding-block-end: 80px;
  padding-block-start: 5px;
  padding-bottom: 80px;
  padding-inline-end: 0px;
  padding-inline-start: 0px;
  padding-left: 0px;
  padding-right: 0px;
  padding-top: 5px;
  paint-order: normal;
  perspective: none;
  perspective-origin: 538px 300px;
  pointer-events: auto;
  position: relative;
  position-anchor: auto;
  position-area: none;
  position-try-fallbacks: none;
  position-try-order: normal;
  position-visibility: always;
  print-color-adjust: economy;
  r: 0px;
  reading-flow: normal;
  reading-order: 0;
  resize: none;
  right: 0px;
  rotate: none;
  row-gap: normal;
  ruby-align: space-around;
  ruby-position: over;
  rx: auto;
  ry: auto;
  scale: none;
  scroll-behavior: auto;
  scroll-initial-target: none;
  scroll-margin-block-end: 0px;
  scroll-margin-block-start: 0px;
  scroll-margin-inline-end: 0px;
  scroll-margin-inline-start: 0px;
  scroll-marker-group: none;
  scroll-padding-block-end: auto;
  scroll-padding-block-start: auto;
  scroll-padding-inline-end: auto;
  scroll-padding-inline-start: auto;
  scroll-target-group: none;
  scroll-timeline-axis: block;
  scroll-timeline-name: none;
  scrollbar-color: auto;
  scrollbar-gutter: auto;
  scrollbar-width: auto;
  shape-image-threshold: 0;
  shape-margin: 0px;
  shape-outside: none;
  shape-rendering: auto;
  speak: normal;
  stop-color: rgb(0, 0, 0);
  stop-opacity: 1;
  stroke: none;
  stroke-dasharray: none;
  stroke-dashoffset: 0px;
  stroke-linecap: butt;
  stroke-linejoin: miter;
  stroke-miterlimit: 4;
  stroke-opacity: 1;
  stroke-width: 1px;
  tab-size: 8;
  table-layout: auto;
  text-align: start;
  text-align-last: auto;
  text-anchor: start;
  text-autospace: no-autospace;
  text-box-edge: auto;
  text-box-trim: none;
  text-decoration: rgb(32, 33, 36);
  text-decoration-color: rgb(32, 33, 36);
  text-decoration-line: none;
  text-decoration-skip-ink: auto;
  text-decoration-style: solid;
  text-emphasis-color: rgb(32, 33, 36);
  text-emphasis-position: over;
  text-emphasis-style: none;
  text-indent: 0px;
  text-overflow: clip;
  text-rendering: auto;
  text-shadow: none;
  text-size-adjust: 100%;
  text-spacing-trim: normal;
  text-transform: none;
  text-underline-position: auto;
  text-wrap-mode: wrap;
  text-wrap-style: auto;
  timeline-scope: none;
  top: 0px;
  touch-action: auto;
  transform: none;
  transform-origin: 538px 300px;
  transform-style: flat;
  transition-behavior: normal;
  transition-delay: 0s;
  transition-duration: 0s;
  transition-property: all;
  transition-timing-function: ease;
  translate: none;
  unicode-bidi: isolate;
  user-select: auto;
  vector-effect: none;
  vertical-align: baseline;
  view-timeline-axis: block;
  view-timeline-inset: auto;
  view-timeline-name: none;
  view-transition-class: none;
  view-transition-group: normal;
  view-transition-name: none;
  visibility: visible;
  white-space-collapse: collapse;
  widows: 2;
  width: 1076px;
  will-change: auto;
  word-break: normal;
  word-spacing: 0px;
  writing-mode: horizontal-tb;
  x: 0px;
  y: 0px;
  z-index: auto;
  zoom: 1;
  -webkit-border-horizontal-spacing: 0px;
  -webkit-border-image: none;
  -webkit-border-vertical-spacing: 0px;
  -webkit-box-align: stretch;
  -webkit-box-decoration-break: slice;
  -webkit-box-direction: normal;
  -webkit-box-flex: 0;
  -webkit-box-ordinal-group: 1;
  -webkit-box-orient: horizontal;
  -webkit-box-pack: start;
  -webkit-box-reflect: none;
  -webkit-font-smoothing: antialiased;
  -webkit-line-break: auto;
  -webkit-line-clamp: none;
  -webkit-locale: "en";
  -webkit-mask-box-image: none;
  -webkit-mask-box-image-outset: 0;
  -webkit-mask-box-image-repeat: stretch;
  -webkit-mask-box-image-slice: 0 fill;
  -webkit-mask-box-image-source: none;
  -webkit-mask-box-image-width: auto;
  -webkit-rtl-ordering: logical;
  -webkit-tap-highlight-color: rgba(0, 0, 0, 0.18);
  -webkit-text-combine: none;
  -webkit-text-decorations-in-effect: none;
  -webkit-text-fill-color: rgb(32, 33, 36);
  -webkit-text-orientation: vertical-right;
  -webkit-text-security: none;
  -webkit-text-stroke-color: rgb(32, 33, 36);
  -webkit-text-stroke-width: 0px;
  -webkit-user-drag: auto;
  -webkit-user-modify: read-only;
  -webkit-writing-mode: horizontal-tb;
}
 * 

 */