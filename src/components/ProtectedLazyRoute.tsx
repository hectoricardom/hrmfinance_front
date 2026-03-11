/**
 * ProtectedLazyRoute
 * Combines permission checking with lazy loading - only loads the component
 * AFTER verifying the user has the required permissions.
 *
 * This prevents unauthorized users from downloading protected code bundles.
 */

import { Component, Show, JSX, lazy, Suspense, createMemo } from 'solid-js';
import { authStore } from '../stores/authStore';
import UnauthorizedAccess from './UnauthorizedAccess';
import { useTranslation } from '../i18n';

interface ProtectedLazyRouteProps {
  /** Dynamic import function, e.g., () => import('./pages/Accounts') */
  load: () => Promise<{ default: Component<any> }>;
  /** Single permission to check */
  permission?: string;
  /** Multiple permissions with OR logic */
  permissions?: string[];
  /** Feature name shown in unauthorized message */
  featureName?: string;
  /** Custom fallback for unauthorized access */
  fallback?: JSX.Element;
  /** Loading component while lazy loading */
  loadingFallback?: JSX.Element;
  /** Props to pass to the loaded component */
  componentProps?: Record<string, any>;
}

const ProtectedLazyRoute: Component<ProtectedLazyRouteProps> = (props) => {
  const { t } = useTranslation();

  // Check a single permission
  const checkSinglePermission = (permission: string): boolean => {
    const profile = authStore.state?.profile?.permissions;
    if (!profile) return false;
    if (profile.isAdmin) return true;

    // Check for specific permission in the profile
    switch (permission) {
      case 'AccountAccess':
        return profile.AccountAccess === true;
      case 'InventoryAccess':
        return profile.InventoryAccess === true;
      case 'EmployeeAccess':
        return profile.EmployeeAccess === true;
      case 'BankingAccess':
        return profile.BankingAccess === true;
      case 'JournalAccess':
        return profile.JournalAccess === true;
      case 'PassportAccess':
        return profile.PassportAccess === true;
      case 'AdminAccess':
        return profile.isAdmin === true;
      default:
        // For custom permissions, check if the property exists and is true
        return profile[permission] === true;
    }
  };

  const hasPermission = createMemo(() => {
    // If no permission specified, allow access
    if (!props.permission && (!props.permissions || props.permissions.length === 0)) {
      return true;
    }

    const profile = authStore.state?.profile?.permissions;
    if (!profile) return false;
    if (profile.isAdmin) return true;

    // Check multiple permissions with OR logic
    if (props.permissions && props.permissions.length > 0) {
      return props.permissions.some(perm => checkSinglePermission(perm));
    }

    // Check single permission
    if (props.permission) {
      return checkSinglePermission(props.permission);
    }

    return true;
  });

  const getTranslatedPermission = () => {
    switch (props.permission) {
      case 'AccountAccess':
        return t('unauthorized.permissions.accountAccess');
      case 'InventoryAccess':
        return t('unauthorized.permissions.inventoryAccess');
      case 'EmployeeAccess':
        return t('unauthorized.permissions.employeeAccess');
      case 'BankingAccess':
        return t('unauthorized.permissions.bankingAccess');
      case 'JournalAccess':
        return t('unauthorized.permissions.journalAccess');
      case 'AdminAccess':
        return t('unauthorized.permissions.adminAccess');
      default:
        return props.permission;
    }
  };

  // Only create the lazy component when permission is granted
  // This is the key - we don't call lazy() until permission check passes
  const LazyComponent = createMemo(() => {
    if (!hasPermission()) return null;
    return lazy(props.load);
  });

  const defaultLoadingFallback = (
    <div style={{
      display: 'flex',
      'align-items': 'center',
      'justify-content': 'center',
      'min-height': '200px',
      color: 'var(--text-muted)'
    }}>
      Loading...
    </div>
  );

  return (
    <Show
      when={hasPermission()}
      fallback={
        props.fallback || (
          <UnauthorizedAccess
            featureName={props.featureName}
            requiredPermission={getTranslatedPermission()}
          />
        )
      }
    >
      <Suspense fallback={props.loadingFallback || defaultLoadingFallback}>
        {(() => {
          const Comp = LazyComponent();
          return Comp ? <Comp {...(props.componentProps || {})} /> : null;
        })()}
      </Suspense>
    </Show>
  );
};

export default ProtectedLazyRoute;
