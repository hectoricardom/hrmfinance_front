/**
 * Router Module
 * Centralized routing with permission-based lazy loading
 */

export { default as AppRouter } from './AppRouter';
export { default as RouteMiddleware } from './RouteMiddleware';
export { protectedRoutes, publicRoutes, getAllRoutes, findRouteConfig } from './routeConfig';
export type { RouteConfig } from './routeConfig';
