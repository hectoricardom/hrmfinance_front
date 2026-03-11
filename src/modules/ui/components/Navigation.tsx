import { Component, Show, createSignal, For } from 'solid-js';
import { A } from '@solidjs/router';
import { useTranslation } from '../../../translations';
import { authStore } from '../../../stores/authStore';
import LanguageSelector from './LanguageSelector';
import Icon from '../../../components/Icon';
import StoreSelector from '../../../components/StoreSelector';
import { OfflineStatusBadge } from '../../hbl/offline';

const Navigation: Component = () => {
  const { t } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = createSignal(false);
  const [expandedGroup, setExpandedGroup] = createSignal<string | null>(null);
  const [menuTimeout, setMenuTimeout] = createSignal<number | null>(null);

  const navStyle = {
    background: 'var(--surface-color)',
    'border-bottom': '1px solid var(--border-color)',
    'box-shadow': 'var(--shadow-sm)',
    'backdrop-filter': 'blur(10px)',
    position: 'sticky' as const,
    top: '0',
    'z-index': '100'
  };

  const containerStyle = {
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'space-between',
    padding: '1rem 2rem',
    margin: '0 auto',
    position: 'relative' as const
  };

  const brandStyle = {
    'font-size': '1.5rem',
    'font-weight': '700',
    color: 'var(--primary-color)',
    'text-decoration': 'none'
  };

  const desktopNavStyle = {
    display: 'flex',
    gap: '1rem',
    'align-items': 'center',
    flex: '1',
    'margin-left': '2rem'
  };

  const mobileNavStyle = {
    display: 'none',
    position: 'absolute' as const,
    top: '100%',
    left: '0',
    right: '0',
    background: 'var(--surface-color)',
    'border-top': '1px solid var(--border-color)',
    'box-shadow': 'var(--shadow-md)',
    'max-height': '70vh',
    'overflow-y': 'auto'
  };

  const groupStyle = {
    position: 'relative' as const,
    display: 'flex',
    'align-items': 'center'
  };

  const groupButtonStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    'font-weight': '500',
    'font-size': '0.875rem',
    cursor: 'pointer',
    'border-radius': 'var(--border-radius-sm)',
    transition: 'all 0.2s ease',
    'white-space': 'nowrap' as const
  };

  const dropdownStyle = {
    position: 'absolute' as const,
    top: '100%',
    left: '0',
    background: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius)',
    'box-shadow': 'var(--shadow-lg)',
    'min-width': '220px',
    'margin-top': '0.25rem',
    'z-index': '10',
    display: 'none',
    'padding-top': '0.25rem'
  };

  const submenuContainerStyle = {
    position: 'relative' as const
  };

  const submenuTriggerStyle = {
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'space-between',
    'text-decoration': 'none',
    color: 'var(--text-secondary)',
    padding: '0.75rem 1rem',
    'font-weight': '500',
    'font-size': '0.875rem',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    width: '100%',
    background: 'transparent',
    border: 'none'
  };

  const submenuDropdownStyle = {
    position: 'absolute' as const,
    top: '0',
    left: '100%',
    background: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius)',
    'box-shadow': 'var(--shadow-lg)',
    'min-width': '200px',
    'z-index': '11',
    display: 'none'
  };

  const mobileGroupStyle = {
    'border-bottom': '1px solid var(--border-color)'
  };

  const mobileGroupHeaderStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '1rem',
    cursor: 'pointer',
    'font-weight': '600',
    color: 'var(--text-primary)'
  };

  const linkStyle = {
    display: 'block',
    'text-decoration': 'none',
    color: 'var(--text-secondary)',
    padding: '0.75rem 1rem',
    'font-weight': '500',
    'font-size': '0.875rem',
    transition: 'all 0.2s ease',
    'white-space': 'nowrap' as const
  };

  const mobileLinkStyle = {
    ...linkStyle,
    padding: '0.75rem 1.5rem',
    'border-bottom': '1px solid var(--border-light)'
  };

  const menuButtonStyle = {
    display: 'none',
    background: 'transparent',
    border: 'none',
    padding: '0.5rem',
    cursor: 'pointer',
    color: 'var(--text-primary)'
  };

  const userSectionStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '1rem'
  };

  const userInfoStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.75rem',
    padding: '0.5rem 1rem',
    background: 'var(--background-color)',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '0.875rem',
    color: 'var(--text-primary)'
  };

  const userAvatarStyle = {
    width: '32px',
    height: '32px',
    'border-radius': '50%',
    'object-fit': 'cover' as const
  };

  const signOutButtonStyle = {
    ...linkStyle,
    cursor: 'pointer',
    border: '1px solid var(--border-color)',
    background: 'transparent',
    'border-radius': 'var(--border-radius-sm)'
  };

  const handleSignOut = () => {
    authStore.signOut();
  };

  const hasPermission = (permission: string) => {
    const profile = authStore.state?.profile;
    console.log({profile})
    if (!profile) return false;
    return profile?.permissions?.[permission] === true || profile.isAdmin === true;
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen());
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
    }, 300); // 300ms delay before closing
    setMenuTimeout(timeout);
  };

  // Define menu item type with optional submenu support
  type MenuItem = {
    path?: string;
    label: string;
    permission: string;
    icon: string;
    adminOnly?: boolean;
    submenu?: MenuItem[];
  };

  type MenuGroup = {
    name: string;
    icon: string;
    items: MenuItem[];
  };

  // Define menu structure grouped by type with submenus
  const menuGroups: MenuGroup[] = [
    {
      name: 'Finance',
      icon: 'finance',
      items: [
        {
          path: '/accounts',
          label: t('navigation.accounts'),
          permission: 'AccountAccess',
          icon: 'accounts'
        },
        {
          path: '/entry-books',
          label: t('navigation.entryBooks'),
          permission: 'JournalAccess',
          icon: 'books'
        },
        {
          path: '/balance-sheet',
          label: t('navigation.balanceSheet'),
          permission: 'AccountAccess',
          icon: 'balance-sheet'
        },
        {
          path: '/bank-consolidations',
          label: t('navigation.consolidate'),
          permission: 'BankingAccess',
          icon: 'bank'
        },
        {
          path: '/event-automation',
          label: 'Event Automation',
          permission: 'AccountAccess',
          icon: 'automation-bolt'
        }
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
            {
              path: '/inventory',
              label: t('navigation.inventoryDashboard', 'Dashboard'),
              permission: 'InventoryAccess',
              icon: 'dashboard'
            },
            {
              path: '/inventory/products',
              label: t('navigation.products', 'Productos'),
              permission: 'InventoryAccess',
              icon: 'box'
            },
            {
              path: '/inventory/receiving',
              label: t('navigation.receiving', 'Recepcion'),
              permission: 'InventoryAccess',
              icon: 'truck-loading'
            },
            {
              path: '/inventory/counting',
              label: t('navigation.counting', 'Conteo'),
              permission: 'InventoryAccess',
              icon: 'clipboard-check'
            },
            {
              path: '/inventory/stock-reconciliation',
              label: t('navigation.reconciliation', 'Reconciliacion'),
              permission: 'InventoryAccess',
              icon: 'balance-scale'
            },
            {
              path: '/offers-comparison',
              label: t('navigation.offersComparison', 'Comparar Ofertas'),
              permission: 'InventoryAccess',
              icon: 'compare'
            }
          ]
        },
        {
          label: t('navigation.sales', 'Ventas'),
          permission: 'invoiceAccess',
          icon: 'cash-register',
          submenu: [
            {
              path: '/invoices',
              label: t('invoices.invoices'),
              permission: 'invoiceAccess',
              icon: 'invoice'
            },
            {
              path: '/pos',
              label: t('navigation.pos', 'Point of Sale'),
              permission: 'invoiceAccess',
              icon: 'cash-register'
            }
          ]
        },
        {
          label: t('navigation.purchasing', 'Compras'),
          permission: 'PurchaseRequestAccess',
          icon: 'shopping-cart',
          submenu: [
            {
              path: '/purchase-requests',
              label: t('navigation.purchaseRequests', 'Solicitudes'),
              permission: 'PurchaseRequestAccess',
              icon: 'shopping-cart'
            },
            {
              path: '/purchase-registrations',
              label: t('navigation.purchaseRegistrations', 'Registros'),
              permission: 'PurchaseRequestAccess',
              icon: 'receipt'
            }
          ]
        },
        {
          label: t('navigation.shipping', 'Envios'),
          permission: 'HBLAccess',
          icon: 'shipping',
          submenu: [
            {
              path: '/hbl',
              label: t('navigation.hbl'),
              permission: 'HBLAccess',
              icon: 'shipping'
            },
            {
              path: '/consignees',
              label: t('navigation.consignees', 'Consignatarios'),
              permission: 'HBLAccess',
              icon: 'customer'
            },
            {
              path: '/shippers',
              label: t('navigation.shippers', 'Transportistas'),
              permission: 'HBLAccess',
              icon: 'truck'
            },
            {
              path: '/remittances',
              label: t('navigation.remittances', 'Remesas'),
              permission: 'RemittanceAccess',
              icon: 'money-transfer'
            }
          ]
        }
      ]
    },
    {
      name: 'Management',
      icon: 'management',
      items: [
        {
          path: '/employees',
          label: t('navigation.employees'),
          permission: 'EmployeeAccess',
          icon: 'employees'
        },
      ]
    },
    {
      name: 'Admin',
      icon: 'settings',
      items: [
        {
          path: '/admin/users',
          label: 'User Management',
          permission: 'isAdmin',
          icon: 'admin',
          adminOnly: true
        },
        {
          path: '/admin/businesses',
          label: 'Business Management',
          permission: 'isAdmin',
          icon: 'business',
          adminOnly: true
        },
        {
          path: '/admin/stores',
          label: 'Store Management',
          permission: 'isAdmin',
          icon: 'store',
          adminOnly: true
        }
      ]
    },
    {
      name: 'Utils',
      icon: 'camera',
      items: [
        {
          label: t('navigation.hblTools', 'HBL Tools'),
          permission: 'HBLAccessManagement',
          icon: 'shipping',
          submenu: [
            {
              path: '/hbl-manage',
              label: t('navigation.hblManage', 'HBL Gestion'),
              permission: 'HBLAccessManagement',
              icon: 'shipping'
            },
            {
              path: '/hbl-mobile-scanner',
              label: t('navigation.hblMobileScanner', 'Scanner Movil'),
              permission: 'HBLAccessManagement',
              icon: 'camera'
            },
            {
              path: '/hbl-offline-scanner',
              label: t('navigation.hblOfflineScanner', 'Scanner Offline'),
              permission: 'HBLAccessManagement',
              icon: 'wifi-off'
            },
            {
              path: '/container-scanner',
              label: t('navigation.containerScanner', 'Container Scanner'),
              permission: 'HBLAccessManagement',
              icon: 'qr-code'
            }
          ]
        },
        {
          label: t('navigation.documents', 'Documentos'),
          permission: 'PassportAccess',
          icon: 'document',
          submenu: [
            {
              path: '/cuban-passport',
              label: t('navigation.cubanPassport', 'Pasaporte Cubano'),
              permission: 'PassportAccess',
              icon: 'passport'
            },
            {
              path: '/pdf-signature',
              label: t('navigation.pdfSignature', 'Firmar PDF'),
              permission: 'AdminPassportAccess',
              icon: 'edit'
            },
            {
              path: '/signature-requests',
              label: t('navigation.signatureRequests', 'Solicitud de Firmas'),
              permission: 'PassportAccess',
              icon: 'signature'
            },
            {
              path: '/passport-photo',
              label: t('navigation.passportPhoto', 'Foto para Pasaporte'),
              permission: 'AdminPassportAccess',
              icon: 'camera'
            },
            {
              path: '/notary-customers',
              label: t('navigation.notaryCustomers', 'Clientes Notariales'),
              permission: 'NotaryAccess',
              icon: 'customer'
            }
          ]
        }
      ]
    }
  ];

  // Filter submenu items based on permissions
  const filterSubmenu = (submenu: MenuItem[] | undefined): MenuItem[] => {
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

  // State for expanded submenu
  const [expandedSubmenu, setExpandedSubmenu] = createSignal<string | null>(null);

  const handleSubmenuEnter = (submenuName: string) => {
    setExpandedSubmenu(submenuName);
  };

  const handleSubmenuLeave = () => {
    setExpandedSubmenu(null);
  };

  return (
    <nav style={navStyle}>
      <div style={containerStyle}>
        {/* Brand */}
        <A href="/" style={brandStyle}>
          HRM Finance
        </A>

        {/* Desktop Navigation */}
        <div style={desktopNavStyle} class="desktop-nav">
           
          <For each={visibleGroups()}>
            {(group) => (
              <div 
                style={groupStyle}
                class="nav-group"
                onMouseEnter={() => handleMouseEnter(group.name)}
                onMouseLeave={handleMouseLeave}
              >
                <button style={groupButtonStyle}>
                  <Icon name={group.icon} size="1em" style={{ "margin-right": "0.5rem" }} /> {group.name}
                  <span style={{ 'font-size': '0.75rem' }}>▼</span>
                </button>
                
                <div
                  style={{
                    ...dropdownStyle,
                    display: expandedGroup() === group.name ? 'block' : 'none'
                  }}
                  onMouseEnter={() => handleMouseEnter(group.name)}
                  onMouseLeave={handleMouseLeave}
                >
                  <For each={group.items}>
                    {(item) => (
                      <Show
                        when={item.submenu && item.submenu.length > 0}
                        fallback={
                          <A
                            href={item.path || '#'}
                            style={linkStyle}
                            activeClass="nav-active"
                            onClick={() => setExpandedGroup(null)}
                          >
                            <Icon name={item.icon} size="1em" style={{ "margin-right": "0.5rem" }} /> {item.label}
                          </A>
                        }
                      >
                        <div
                          style={submenuContainerStyle}
                          class="submenu-container"
                          onMouseEnter={() => handleSubmenuEnter(item.label)}
                          onMouseLeave={handleSubmenuLeave}
                        >
                          <button style={submenuTriggerStyle} class="submenu-trigger">
                            <span>
                              <Icon name={item.icon} size="1em" style={{ "margin-right": "0.5rem" }} /> {item.label}
                            </span>
                            <span style={{ 'font-size': '0.65rem', 'margin-left': '0.5rem' }}>▶</span>
                          </button>

                          <div
                            style={{
                              ...submenuDropdownStyle,
                              display: expandedSubmenu() === item.label ? 'block' : 'none'
                            }}
                            class="submenu-dropdown"
                          >
                            <For each={item.submenu}>
                              {(subItem) => (
                                <A
                                  href={subItem.path || '#'}
                                  style={linkStyle}
                                  activeClass="nav-active"
                                  onClick={() => {
                                    setExpandedGroup(null);
                                    setExpandedSubmenu(null);
                                  }}
                                >
                                  <Icon name={subItem.icon} size="1em" style={{ "margin-right": "0.5rem" }} /> {subItem.label}
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
        </div>

        {/* User Section */}
        <div style={userSectionStyle}>
          <Show when={hasPermission('HBLAccessManagement')}>
            <A href="/hbl-offline-scanner" style={{ 'text-decoration': 'none' }}>
              <OfflineStatusBadge compact />
            </A>
          </Show>
          <LanguageSelector />
          <Show when={authStore.currentUser}>
           
            <div style={userInfoStyle} class="user-info-desktop">
              <Show when={authStore.currentUser?.photoURL}>
                <img 
                  src={authStore.currentUser!.photoURL!} 
                  alt="User avatar" 
                  style={userAvatarStyle}
                />
              </Show>
              <span>{authStore.currentUser?.displayName || authStore.currentUser?.email}</span>
            </div>
            <button 
              style={signOutButtonStyle}
              onClick={handleSignOut}
              class="sign-out-desktop"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--background-color)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              Sign Out
            </button>
          </Show>
          
          {/* Mobile Menu Button */}
          <button 
            style={menuButtonStyle} 
            class="mobile-menu-button"
            onClick={toggleMobileMenu}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d={isMobileMenuOpen() ? 
                "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" : 
                "M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"
              }/>
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div 
        style={{
          ...mobileNavStyle,
          display: isMobileMenuOpen() ? 'block' : 'none'
        }}
        class="mobile-nav"
      >
        <A 
          href="/" 
          style={mobileLinkStyle} 
          activeClass="nav-active"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <Icon name="dashboard" size="1em" style={{ "margin-right": "0.5rem" }} /> {t('navigation.dashboard')}
        </A>
        
        <For each={visibleGroups()}>
          {(group) => (
            <div style={mobileGroupStyle}>
              <div 
                style={mobileGroupHeaderStyle}
                onClick={() => toggleGroup(group.name)}
              >
                <span><Icon name={group.icon} size="1em" style={{ "margin-right": "0.5rem" }} /> {group.name}</span>
                <span style={{ transform: expandedGroup() === group.name ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                  ▼
                </span>
              </div>
              
              <Show when={expandedGroup() === group.name}>
                <div style={{ background: 'var(--background-color)' }}>
                  <For each={group.items}>
                    {(item) => (
                      <Show
                        when={item.submenu && item.submenu.length > 0}
                        fallback={
                          <A
                            href={item.path || '#'}
                            style={{
                              ...mobileLinkStyle,
                              'padding-left': '3rem'
                            }}
                            activeClass="nav-active"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            <Icon name={item.icon} size="1em" style={{ "margin-right": "0.5rem" }} /> {item.label}
                          </A>
                        }
                      >
                        <div>
                          <div
                            style={{
                              ...mobileGroupHeaderStyle,
                              'padding-left': '2rem',
                              'font-weight': '500',
                              'font-size': '0.875rem',
                              background: expandedSubmenu() === item.label ? 'var(--primary-light)' : 'transparent'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedSubmenu(expandedSubmenu() === item.label ? null : item.label);
                            }}
                          >
                            <span><Icon name={item.icon} size="1em" style={{ "margin-right": "0.5rem" }} /> {item.label}</span>
                            <span style={{ transform: expandedSubmenu() === item.label ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', 'font-size': '0.75rem' }}>
                              ▼
                            </span>
                          </div>
                          <Show when={expandedSubmenu() === item.label}>
                            <div style={{ background: 'var(--surface-color)' }}>
                              <For each={item.submenu}>
                                {(subItem) => (
                                  <A
                                    href={subItem.path || '#'}
                                    style={{
                                      ...mobileLinkStyle,
                                      'padding-left': '4rem',
                                      'font-size': '0.8rem'
                                    }}
                                    activeClass="nav-active"
                                    onClick={() => {
                                      setIsMobileMenuOpen(false);
                                      setExpandedSubmenu(null);
                                    }}
                                  >
                                    <Icon name={subItem.icon} size="0.9em" style={{ "margin-right": "0.5rem" }} /> {subItem.label}
                                  </A>
                                )}
                              </For>
                            </div>
                          </Show>
                        </div>
                      </Show>
                    )}
                  </For>
                </div>
              </Show>
            </div>
          )}
        </For>
        
        <Show when={authStore.currentUser}>
          <div style={{ padding: '1rem', 'border-top': '2px solid var(--border-color)' }}>
            {/* Store Selector for Mobile */}
           
            
            <div style={{ ...userInfoStyle, 'margin-bottom': '1rem' }}>
              <Show when={authStore.currentUser?.photoURL}>
                <img 
                  src={authStore.currentUser!.photoURL!} 
                  alt="User avatar" 
                  style={userAvatarStyle}
                />
              </Show>
              <span>{authStore.currentUser?.displayName || authStore.currentUser?.email}</span>
            </div>
            <button 
              style={{
                ...signOutButtonStyle,
                width: '100%'
              }}
              onClick={() => {
                handleSignOut();
                setIsMobileMenuOpen(false);
              }}
            >
              Sign Out
            </button>
          </div>
        </Show>
      </div>

      <style>{`
        .nav-active {
          background: linear-gradient(135deg, var(--primary-color), var(--primary-dark)) !important;
          color: white !important;
          box-shadow: var(--shadow-sm);
        }
        
        .desktop-nav a:hover:not(.nav-active),
        .nav-group button:hover {
          background: var(--background-color);
          color: var(--text-primary);
        }
        
        .mobile-nav a:hover:not(.nav-active) {
          background: var(--background-color);
          color: var(--text-primary);
        }

        /* Submenu styles */
        .submenu-trigger:hover {
          background: var(--background-color);
          color: var(--text-primary);
        }

        .submenu-container:hover .submenu-dropdown {
          display: block !important;
        }

        .submenu-dropdown a:hover {
          background: var(--background-color);
          color: var(--text-primary);
        }

        /* Create invisible bridge to prevent gap issues */
        .nav-group::before {
          content: '';
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          height: 0.5rem;
          z-index: 9;
        }
        
        @media (max-width: 768px) {
          .desktop-nav {
            display: none !important;
          }
          
          .mobile-menu-button {
            display: block !important;
          }
          
          .user-info-desktop,
          .sign-out-desktop,
          .store-selector-desktop {
            display: none !important;
          }
          
          nav > div:first-child {
            padding: 1rem;
          }
        }
        
        @media (min-width: 769px) {
          .mobile-nav {
            display: none !important;
          }
          
          .store-selector-mobile {
            display: none !important;
          }
        }
      `}</style>
    </nav>
  );
};

export default Navigation;





/*

 <A href="/" style={linkStyle} activeClass="nav-active">
            <Icon name="dashboard" size="1em" style={{ "margin-right": "0.5rem" }} /> {t('navigation.dashboard')}
          </A>
        

*/