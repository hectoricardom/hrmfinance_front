import { Component, Show, createSignal, For, onMount, onCleanup } from 'solid-js';
import { A } from '@solidjs/router';
import { useTranslation } from '../../../translations';
import { authStore } from '../../../stores/authStore';
import LanguageSelector from './LanguageSelector';
import Icon from '../../../components/Icon';
import StoreSelector from '../../../components/StoreSelector';
import { OfflineStatusBadge } from '../../hbl/offline';

const NavigationFiberSimple: Component = () => {
  const { t } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = createSignal(false);
  const [expandedGroup, setExpandedGroup] = createSignal<string | null>(null);

  const handleSignOut = () => {
    authStore.signOut();
  };

  const hasPermission = (permission: string) => {
    const profile = authStore.state?.profile;
    if (!profile) return false;
    return profile[permission] === true || profile.isAdmin === true;
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen());
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroup(expandedGroup() === groupName ? null : groupName);
  };

  // Menu structure
  const menuGroups = [
    {
      name: 'Finance',
      icon: 'finance',
      items: [
        { path: '/accounts', label: t('navigation.accounts'), permission: 'AccountAccess', icon: 'accounts' },
        { path: '/entry-books', label: t('navigation.entryBooks'), permission: 'JournalAccess', icon: 'books' },
        { path: '/balance-sheet', label: t('navigation.balanceSheet'), permission: 'AccountAccess', icon: 'balance-sheet' },
        { path: '/bank-consolidations', label: t('navigation.consolidate'), permission: 'BankingAccess', icon: 'bank' },
        { path: '/event-automation', label: 'Event Automation', permission: 'AccountAccess', icon: 'automation-bolt' }
      ]
    },
    {
      name: 'Operations',
      icon: 'operations',
      items: [
        { path: '/inventory', label: t('navigation.inventory'), permission: 'InventoryAccess', icon: 'inventory' },
        { path: '/invoices', label: t('invoices.invoices'), permission: 'invoiceAccess', icon: 'invoice' },
        { path: '/pos', label: t('navigation.pos', 'Point of Sale'), permission: 'invoiceAccess', icon: 'cash-register' },
        { path: '/hbl', label: t('navigation.hbl'), permission: 'HBLAccess', icon: 'shipping' },
        { path: '/purchase-requests', label: 'Solicitudes de Compra', permission: 'PurchaseRequestAccess', icon: 'shopping-cart' },
        { path: '/purchase-registrations', label: 'Registro de Compras', permission: 'PurchaseRequestAccess', icon: 'receipt' },
        { path: '/remittances', label: 'Remittances', permission: 'RemittanceAccess', icon: 'money-transfer' },
        { path: '/consignees', label: 'Consignatarios', permission: 'HBLAccess', icon: 'customer' },
        { path: '/shippers', label: 'Transportistas', permission: 'HBLAccess', icon: 'shipping' }
      ]
    },
    {
      name: 'Management',
      icon: 'management',
      items: [
        { path: '/employees', label: t('navigation.employees'), permission: 'EmployeeAccess', icon: 'employees' },
      ]
    },
    {
      name: 'Admin',
      icon: 'settings',
      items: [
        { path: '/admin/users', label: 'User Management', permission: 'isAdmin', icon: 'admin', adminOnly: true },
        { path: '/admin/businesses', label: 'Business Management', permission: 'isAdmin', icon: 'business', adminOnly: true },
        { path: '/admin/stores', label: 'Store Management', permission: 'isAdmin', icon: 'store', adminOnly: true }
      ]
    },
    {
      name: 'Utils',
      icon: 'camera',
      items: [
        { path: '/hbl-manage', label: t('navigation.hbl'), permission: 'HBLAccessManagement', icon: 'shipping' },
        { path: '/hbl-mobile-scanner', label: t('navigation.hblMobileScanner', 'HBL Mobile Scanner'), permission: 'HBLAccessManagement', icon: 'camera' },
        { path: '/hbl-offline-scanner', label: t('navigation.hblOfflineScanner', 'HBL Offline Scanner'), permission: 'HBLAccessManagement', icon: 'wifi-off' },
        { path: '/cuban-passport', label: t('navigation.cubanPassport', 'Pasaporte Cubano'), permission: 'PassportAccess', icon: 'passport' },
        { path: '/pdf-signature', label: t('navigation.pdfSignature', 'Firmar PDF'), permission: 'AdminPassportAccess', icon: 'edit' },
        { path: '/signature-requests', label: t('navigation.signatureRequests', 'Solicitud de Firmas'), permission: 'PassportAccess', icon: 'signature' },
        { path: '/passport-photo', label: t('navigation.passportPhoto', 'Foto para Pasaporte'), permission: 'AdminPassportAccess', icon: 'camera' },
        { path: '/notary-customers', label: t('navigation.notaryCustomers', 'Clientes Notariales'), permission: 'NotaryAccess', icon: 'customer' },
      ]
    }
  ];

  // Filter groups based on permissions
  const visibleGroups = () => {
    return menuGroups.map(group => ({
      ...group,
      items: group.items.filter(item => 
        item.adminOnly ? authStore.state?.profile?.isAdmin : hasPermission(item.permission)
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
                <div class="nav-item dropdown">
                  <button 
                    class="nav-link dropdown-toggle"
                    onMouseEnter={() => setExpandedGroup(group.name)}
                    onMouseLeave={() => setExpandedGroup(null)}
                  >
                    {group.name}
                  </button>
                  
                  <Show when={expandedGroup() === group.name}>
                    <div 
                      class="dropdown-menu"
                      onMouseEnter={() => setExpandedGroup(group.name)}
                      onMouseLeave={() => setExpandedGroup(null)}
                    >
                      <For each={group.items}>
                        {(item) => (
                          <A 
                            href={item.path} 
                            class="dropdown-item"
                            activeClass="active-link"
                          >
                            <Icon name={item.icon} size="16px" /> 
                            <span>{item.label}</span>
                          </A>
                        )}
                      </For>
                    </div>
                  </Show>
                </div>
              )}
            </For>
          </div>

          {/* Right Side Actions */}
          <div class="navbar-actions">
            <Show when={hasPermission('HBLAccessManagement')}>
              <A href="/hbl-offline-scanner" style={{ 'text-decoration': 'none' }}>
                <OfflineStatusBadge compact />
              </A>
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

        {/* Mobile Navigation */}
        <Show when={isMobileMenuOpen()}>
          <div class="mobile-menu">
            <A 
              href="/" 
              class="mobile-nav-link"
              activeClass="active-link"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Icon name="dashboard" size="16px" /> 
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
                  
                  <Show when={expandedGroup() === group.name}>
                    <div class="mobile-submenu">
                      <For each={group.items}>
                        {(item) => (
                          <A 
                            href={item.path} 
                            class="mobile-nav-link submenu-item"
                            activeClass="active-link"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            <Icon name={item.icon} size="16px" /> 
                            <span>{item.label}</span>
                          </A>
                        )}
                      </For>
                    </div>
                  </Show>
                </div>
              )}
            </For>
            
            <div class="mobile-divider"></div>
            <Show when={authStore.currentUser}>
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
        </Show>
      </nav>

      <style>{`
        /* Google Fiber Simple Style Navigation */
        .navbar-fiber {
          background-color: #fff;
          box-shadow: 0 1px 2px 0 rgba(60,64,67,.3), 0 1px 3px 1px rgba(60,64,67,.15);
          position: sticky;
          top: 0;
          z-index: 1000;
          font-family: "Google Sans", Roboto, Arial, sans-serif;
          -webkit-font-smoothing: antialiased;
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
          gap: 8px;
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
          padding: 8px 16px;
          border: none;
          background: none;
          cursor: pointer;
          transition: background-color 150ms cubic-bezier(0.4,0,0.2,1);
          border-radius: 8px;
        }

        .nav-link:hover {
          background-color: rgba(60,64,67,.08);
          color: #202124;
        }

        .dropdown-toggle::after {
          content: " ▾";
          font-size: 12px;
          margin-left: 4px;
          transition: transform 150ms cubic-bezier(0.4,0,0.2,1);
        }

        /* Dropdown */
        .dropdown-menu {
          position: absolute;
          top: 100%;
          left: 0;
          background: #fff;
          box-shadow: 0 1px 2px 0 rgba(60,64,67,.3), 0 2px 6px 2px rgba(60,64,67,.15);
          border-radius: 8px;
          padding: 8px 0;
          min-width: 200px;
          margin-top: 4px;
          opacity: 0;
          pointer-events: none;
          transition: opacity 150ms cubic-bezier(0.4,0,0.2,1);
        }

        .nav-item:hover .dropdown-menu,
        .dropdown-menu:hover {
          opacity: 1;
          pointer-events: auto;
        }

        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          color: #202124;
          font-size: 14px;
          padding: 8px 24px;
          transition: background-color 150ms cubic-bezier(0.4,0,0.2,1);
        }

        .dropdown-item:hover {
          background-color: rgba(60,64,67,.04);
        }

        .dropdown-item.active-link {
          color: #1a73e8;
          background-color: rgba(26,115,232,.04);
        }

        /* Actions */
        .navbar-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .sign-in {
          font-weight: 500;
          color: #1a73e8 !important;
        }

        .btn-primary {
          background-color: #1a73e8;
          color: #fff;
          border: none;
          padding: 9px 24px;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: box-shadow 280ms cubic-bezier(0.4,0,0.2,1), background-color 150ms cubic-bezier(0.4,0,0.2,1);
        }

        .btn-primary:hover {
          background-color: #1557b0;
          box-shadow: 0 1px 2px 0 rgba(60,64,67,.3), 0 1px 3px 1px rgba(60,64,67,.15);
        }

        /* Mobile Menu Button */
        .mobile-menu-btn {
          display: none;
          background: none;
          border: none;
          padding: 8px;
          cursor: pointer;
          border-radius: 50%;
          transition: background-color 150ms cubic-bezier(0.4,0,0.2,1);
        }

        .mobile-menu-btn:hover {
          background-color: rgba(60,64,67,.08);
        }

        .hamburger {
          display: block;
          width: 24px;
          height: 2px;
          background: #5f6368;
          position: relative;
          transition: background 150ms cubic-bezier(0.4,0,0.2,1);
        }

        .hamburger::before,
        .hamburger::after {
          content: "";
          display: block;
          width: 24px;
          height: 2px;
          background: #5f6368;
          position: absolute;
          transition: transform 150ms cubic-bezier(0.4,0,0.2,1);
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

        /* Mobile Menu */
        .mobile-menu {
          position: fixed;
          top: 64px;
          left: 0;
          width: 100%;
          height: calc(100vh - 64px);
          background: #fff;
          overflow-y: auto;
          box-shadow: 0 1px 2px 0 rgba(60,64,67,.3);
        }

        .mobile-nav-link {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          color: #202124;
          font-size: 14px;
          padding: 12px 24px;
          border-bottom: 1px solid rgba(60,64,67,.08);
          transition: background-color 150ms cubic-bezier(0.4,0,0.2,1);
        }

        .mobile-nav-link:hover {
          background-color: rgba(60,64,67,.04);
        }

        .mobile-nav-link.active-link {
          color: #1a73e8;
          background-color: rgba(26,115,232,.04);
        }

        .mobile-group {
          border-bottom: 1px solid rgba(60,64,67,.08);
        }

        .mobile-group-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 24px;
          cursor: pointer;
          font-weight: 500;
          color: #202124;
          transition: background-color 150ms cubic-bezier(0.4,0,0.2,1);
        }

        .mobile-group-header:hover {
          background-color: rgba(60,64,67,.04);
        }

        .chevron {
          font-size: 12px;
          transition: transform 150ms cubic-bezier(0.4,0,0.2,1);
        }

        .chevron.expanded {
          transform: rotate(180deg);
        }

        .mobile-submenu {
          background: rgba(60,64,67,.04);
        }

        .submenu-item {
          padding-left: 48px;
        }

        .mobile-divider {
          height: 8px;
          background: rgba(60,64,67,.08);
          margin: 8px 0;
        }

        .mobile-user-section {
          padding: 16px 24px;
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

export default NavigationFiberSimple;