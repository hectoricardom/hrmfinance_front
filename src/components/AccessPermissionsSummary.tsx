import { Component, For, Show } from 'solid-js';
import { authStore } from '../stores/authStore';
import { Card } from '../modules/ui';
import Icon from './Icon';

interface Permission {
  key: string;
  label: string;
  description: string;
  icon: string;
  category: 'finance' | 'operations' | 'management' | 'admin';
}

const AccessPermissionsSummary: Component = () => {
  const permissions: Permission[] = [
    {
      key: 'AccountAccess',
      label: 'Contabilidad',
      description: 'Acceso a cuentas, balance general y automatización',
      icon: 'accounts',
      category: 'finance'
    },
    {
      key: 'JournalAccess',
      label: 'Libros Contables',
      description: 'Gestión de asientos y registros contables',
      icon: 'books',
      category: 'finance'
    },
    {
      key: 'BankingAccess',
      label: 'Consolidaciones Bancarias',
      description: 'Conciliación y análisis bancario',
      icon: 'bank',
      category: 'finance'
    },
    {
      key: 'InventoryAccess',
      label: 'Inventario',
      description: 'Control de inventario y productos',
      icon: 'inventory',
      category: 'operations'
    },
    {
      key: 'invoiceAccess',
      label: 'Facturación',
      description: 'Creación y gestión de facturas',
      icon: 'invoice',
      category: 'operations'
    },
    {
      key: 'HBLAccess',
      label: 'HBL/Logística',
      description: 'Gestión de documentos de carga',
      icon: 'shipping',
      category: 'operations'
    },
    {
      key: 'HBLScannerAccess',
      label: 'Escáner HBL',
      description: 'Solo acceso al escáner de HBL (sin gestión completa)',
      icon: 'barcode',
      category: 'operations'
    },
    {
      key: 'PassportAccess',
      label: 'Pasaportes',
      description: 'Aplicaciones de pasaporte y firma de PDFs',
      icon: 'passport',
      category: 'operations'
    },
    {
      key: 'EmployeeAccess',
      label: 'Empleados',
      description: 'Gestión de recursos humanos',
      icon: 'employees',
      category: 'management'
    },
    {
      key: 'isAdmin',
      label: 'Administrador',
      description: 'Control total del sistema',
      icon: 'admin',
      category: 'admin'
    }
  ];

  const hasPermission = (permission: string) => {
    if (permission === 'isAdmin') {
      return authStore.state?.profile?.isAdmin || false;
    }
    return authStore.hasPermission(permission);
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'finance': return 'Finanzas';
      case 'operations': return 'Operaciones';
      case 'management': return 'Gestión';
      case 'admin': return 'Administración';
      default: return category;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'finance': return 'var(--primary-color)';
      case 'operations': return 'var(--secondary-color)';
      case 'management': return 'var(--accent-color)';
      case 'admin': return 'var(--error-color)';
      default: return 'var(--text-muted)';
    }
  };

  const groupedPermissions = () => {
    const groups: Record<string, Permission[]> = {};
    permissions.forEach(perm => {
      if (hasPermission(perm.key)) {
        if (!groups[perm.category]) {
          groups[perm.category] = [];
        }
        groups[perm.category].push(perm);
      }
    });
    return groups;
  };

  const totalPermissions = () => {
    return permissions.filter(p => hasPermission(p.key)).length;
  };

  return (
    <Card 
      title="Resumen de Accesos" 
      subtitle={`${totalPermissions()} módulos disponibles para tu perfil`}
    >
      <div style={{
        display: 'flex',
        'flex-direction': 'column',
        gap: '1.5rem'
      }}>
        {/* User Info Header */}
        <div style={{
          display: 'flex',
          'align-items': 'center',
          gap: '1rem',
          padding: '1rem',
          background: 'var(--background-color)',
          'border-radius': 'var(--border-radius-sm)',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            'border-radius': '50%',
            background: 'var(--primary-color)',
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'center',
            color: 'white',
            'font-size': '1.5rem',
            'font-weight': '600'
          }}>
            {authStore.state?.user?.displayName?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <div style={{ 'font-weight': '600', color: 'var(--text-primary)' }}>
              {authStore.state?.user?.displayName || authStore.state?.user?.email}
            </div>
            <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
              <Show when={authStore.state?.profile?.isAdmin} fallback="Usuario Regular">
                <span style={{ color: 'var(--error-color)', 'font-weight': '500' }}>
                  Administrador del Sistema
                </span>
              </Show>
            </div>
          </div>
        </div>

        {/* Permissions by Category */}
        <For each={Object.entries(groupedPermissions())}>
          {([category, perms]) => (
            <div>
              <h4 style={{
                'font-size': '0.875rem',
                'text-transform': 'uppercase',
                'letter-spacing': '0.5px',
                color: getCategoryColor(category),
                'margin-bottom': '0.75rem',
                'font-weight': '600'
              }}>
                {getCategoryName(category)}
              </h4>
              
              <div style={{
                display: 'grid',
                'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '0.75rem'
              }}>
                <For each={perms}>
                  {(perm) => (
                    <div style={{
                      display: 'flex',
                      'align-items': 'flex-start',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      background: 'var(--background-color)',
                      'border-radius': 'var(--border-radius-sm)',
                      border: '1px solid var(--border-color)',
                      transition: 'all 0.2s ease'
                    }}>
                      <div style={{
                        'min-width': '32px',
                        'min-height': '32px',
                        'border-radius': '8px',
                        background: `${getCategoryColor(category)}20`,
                        display: 'flex',
                        'align-items': 'center',
                        'justify-content': 'center',
                        color: getCategoryColor(category)
                      }}>
                        <Icon name={perm.icon} size="1rem" />
                      </div>
                      <div style={{ flex: '1' }}>
                        <div style={{ 
                          'font-weight': '500', 
                          'margin-bottom': '0.25rem',
                          color: 'var(--text-primary)'
                        }}>
                          {perm.label}
                        </div>
                        <div style={{ 
                          'font-size': '0.8rem', 
                          color: 'var(--text-muted)',
                          'line-height': '1.4'
                        }}>
                          {perm.description}
                        </div>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </div>
          )}
        </For>

        {/* No permissions message */}
        <Show when={totalPermissions() === 0}>
          <div style={{
            'text-align': 'center',
            padding: '2rem',
            color: 'var(--text-muted)'
          }}>
            <Icon name="lock" size="2rem" style={{ 'margin-bottom': '1rem', opacity: '0.5' }} />
            <p>No tienes permisos asignados. Contacta al administrador.</p>
          </div>
        </Show>
      </div>
    </Card>
  );
};

export default AccessPermissionsSummary;