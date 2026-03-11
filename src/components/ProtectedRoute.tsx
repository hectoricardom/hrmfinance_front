import { Component, Show, JSX } from 'solid-js';
import { authStore } from '../stores/authStore';
import UnauthorizedAccess from './UnauthorizedAccess';
import { useTranslation } from '../i18n';

interface ProtectedRouteProps {
  children: JSX.Element;
  permission?: string;
  permissions?: string[]; // Support multiple permissions with OR logic
  featureName?: string;
  requiredPermission?: string;
  fallback?: JSX.Element;
}



const ProtectedRoute: Component<ProtectedRouteProps> = (props) => {
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

  const hasPermission = () => {
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
  };

  const getTranslatedPermission = () => {
    if (props.requiredPermission) return props.requiredPermission;
    
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
      {props.children}
    </Show>
  );
};

export default ProtectedRoute;