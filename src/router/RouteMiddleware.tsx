/**
 * RouteMiddleware
 * Validates authentication and permissions BEFORE loading the component
 * This ensures unauthorized users never trigger the dynamic import
 */

import { Component, Show, Suspense, createSignal, createEffect, onCleanup } from 'solid-js';
import { authStore } from '../stores/authStore';
import type { RouteConfig } from './routeConfig';
import Login from '../pages/Login';
import UnauthorizedAccess from '../components/UnauthorizedAccess';
import { useTranslation } from '../i18n';

interface RouteMiddlewareProps {
  route: RouteConfig;
  params?: Record<string, string>;
}

const RouteMiddleware: Component<RouteMiddlewareProps> = (props) => {
  const { t } = useTranslation();
  const [LoadedComponent, setLoadedComponent] = createSignal<Component<any> | null>(null);
  const [loadError, setLoadError] = createSignal<string | null>(null);
  const [isLoading, setIsLoading] = createSignal(true);

  // Check single permission
  const checkSinglePermission = (permission: string): boolean => {
    const profile = authStore.state?.profile?.permissions;
    if (!profile) return false;
    if (profile.isAdmin) return true;
    return profile[permission] === true;
  };

  // Check if user has required permission
  const hasPermission = (): boolean => {
    // Public routes don't need permission
    if (props.route.public) return true;

    // No permission specified = allow
    if (!props.route.permission && (!props.route.permissions || props.route.permissions.length === 0)) {
      return true;
    }

    const profile = authStore.state?.profile?.permissions;
    if (!profile) return false;
    if (profile.isAdmin) return true;

    // Check multiple permissions (OR logic)
    if (props.route.permissions && props.route.permissions.length > 0) {
      return props.route.permissions.some(perm => checkSinglePermission(perm));
    }

    // Check single permission
    if (props.route.permission) {
      return checkSinglePermission(props.route.permission);
    }

    return true;
  };

  // Check if user is authenticated
  const isAuthenticated = (): boolean => {
    return props.route.public || authStore.isAuthenticated;
  };

  // Get translated permission name
  const getTranslatedPermission = (): string => {
    const permission = props.route.permission || props.route.permissions?.[0];
    if (!permission) return '';

    const key = `unauthorized.permissions.${permission.charAt(0).toLowerCase() + permission.slice(1)}`;
    const translated = t(key);
    return translated !== key ? translated : permission;
  };

  // Load component only when authenticated and authorized
  createEffect(() => {
    // Reset state
    setLoadedComponent(null);
    setLoadError(null);
    setIsLoading(true);

    console.log(`[RouteMiddleware] Checking route: ${props.route.path}`);
    console.log(`[RouteMiddleware] Auth loading: ${authStore.state.loading}, Authenticated: ${authStore.isAuthenticated}`);

    // Don't load while auth is loading
    if (authStore.state.loading) {
      console.log(`[RouteMiddleware] BLOCKED - Auth still loading for: ${props.route.path}`);
      return;
    }

    // For protected routes, check auth first
    if (!props.route.public && !authStore.isAuthenticated) {
      console.log(`[RouteMiddleware] BLOCKED - Not authenticated for: ${props.route.path}`);
      setIsLoading(false);
      return;
    }

    // Check permission before loading
    if (!hasPermission()) {
      console.log(`[RouteMiddleware] BLOCKED - No permission for: ${props.route.path}`);
      setIsLoading(false);
      return;
    }

    // Permission granted - now load the component
    console.log(`[RouteMiddleware] LOADING component for: ${props.route.path}`);
    let cancelled = false;

    props.route.load()
      .then((module) => {
        if (!cancelled) {
          setLoadedComponent(() => module.default);
          setIsLoading(false);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('Failed to load route component:', error);
          setLoadError(error.message || 'Failed to load page');
          setIsLoading(false);
        }
      });

    onCleanup(() => {
      cancelled = true;
    });
  });

  // Loading styles
  const loadingStyle = {
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    'min-height': '200px',
    color: 'var(--text-muted, #9ca3af)',
  };

  const spinnerStyle = {
    width: '40px',
    height: '40px',
    border: '3px solid var(--border-color, #e5e7eb)',
    'border-top-color': 'var(--primary-color, #3b82f6)',
    'border-radius': '50%',
    animation: 'spin 1s linear infinite',
  };

  const errorStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    'align-items': 'center',
    'justify-content': 'center',
    'min-height': '200px',
    gap: '1rem',
    color: 'var(--error-color, #ef4444)',
  };

  return (
    <>
      {/* CSS for spinner */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Auth loading state */}
      <Show when={authStore.state.loading}>
        <div style={loadingStyle}>
          <div style={spinnerStyle} />
        </div>
      </Show>

      {/* Auth check (for protected routes) */}
      <Show when={!authStore.state.loading && !props.route.public && !authStore.isAuthenticated}>
        <Login />
      </Show>

      {/* Permission check */}
      <Show when={!authStore.state.loading && isAuthenticated() && !hasPermission()}>
        <UnauthorizedAccess
          featureName={props.route.featureName}
          requiredPermission={getTranslatedPermission()}
        />
      </Show>

      {/* Component loading state */}
      <Show when={!authStore.state.loading && isAuthenticated() && hasPermission() && isLoading()}>
        <div style={loadingStyle}>
          <div style={spinnerStyle} />
        </div>
      </Show>

      {/* Load error */}
      <Show when={loadError()}>
        <div style={errorStyle}>
          <div style={{ 'font-size': '1.25rem' }}>Failed to load page</div>
          <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
            {loadError()}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.5rem 1rem',
              background: 'var(--primary-color, #3b82f6)',
              color: 'white',
              border: 'none',
              'border-radius': '6px',
              cursor: 'pointer',
            }}
          >
            Reload Page
          </button>
        </div>
      </Show>

      {/* Loaded component */}
      <Show when={LoadedComponent()}>
        {(Comp) => {
          const Component = Comp();
          return <Component {...(props.params || {})} />;
        }}
      </Show>
    </>
  );
};

export default RouteMiddleware;
