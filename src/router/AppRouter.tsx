/**
 * AppRouter
 * Dynamic router that generates routes from config
 * Uses RouteMiddleware for permission-based lazy loading
 */

import { Component, For } from 'solid-js';
import { Route, HashRouter, useParams } from '@solidjs/router';
import { ModalProvider } from '../contexts/ModalContext';
import { NavigationFiber } from '../modules/ui';
import { protectedRoutes, publicRoutes, type RouteConfig } from './routeConfig';
import RouteMiddleware from './RouteMiddleware';

// App header wrapper for protected routes
const AppHeader: Component<{ children: any }> = (props) => {
  return (
    <>
      <NavigationFiber />
      {props.children}
    </>
  );
};

// Wrapper for protected routes with layout
const ProtectedRouteWrapper: Component<{ route: RouteConfig }> = (props) => {
  const params = useParams();

  return (
    <ModalProvider>
      <AppHeader>
        <RouteMiddleware route={props.route} params={params} />
      </AppHeader>
    </ModalProvider>
  );
};

// Wrapper for public routes (no header/layout)
const PublicRouteWrapper: Component<{ route: RouteConfig }> = (props) => {
  const params = useParams();

  return (
    <ModalProvider>
      <RouteMiddleware route={props.route} params={params} />
    </ModalProvider>
  );
};

const AppRouter: Component = () => {
  return (
    <HashRouter>
      {/* Public routes - no auth required */}
      <For each={publicRoutes}>
        {(route) => (
          <Route
            path={route.path}
            component={() => <PublicRouteWrapper route={route} />}
          />
        )}
      </For>

      {/* Protected routes - require auth + permissions */}
      <For each={protectedRoutes}>
        {(route) => (
          <Route
            path={route.path}
            component={() => <ProtectedRouteWrapper route={route} />}
          />
        )}
      </For>

      {/* 404 fallback */}
      <Route
        path="*"
        component={() => (
          <ModalProvider>
            <AppHeader>
              <div style={{
                display: 'flex',
                'flex-direction': 'column',
                'align-items': 'center',
                'justify-content': 'center',
                'min-height': '400px',
                gap: '1rem',
              }}>
                <div style={{ 'font-size': '4rem' }}>404</div>
                <div style={{ 'font-size': '1.25rem', color: 'var(--text-muted)' }}>
                  Page not found
                </div>
                <a
                  href="#/"
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'var(--primary-color, #3b82f6)',
                    color: 'white',
                    'text-decoration': 'none',
                    'border-radius': '6px',
                  }}
                >
                  Go to Dashboard
                </a>
              </div>
            </AppHeader>
          </ModalProvider>
        )}
      />
    </HashRouter>
  );
};

export default AppRouter;
