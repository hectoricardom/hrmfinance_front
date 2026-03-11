// Tax Portal Module - Main Exports

// Pages
export { default as ClientPortal } from './pages/ClientPortal';
export { default as PreparerDashboard } from './pages/PreparerDashboard';

// Components
export { default as ClientIntakeForm } from './components/ClientIntakeForm';
export { default as ClientDetailPanel } from './components/ClientDetailPanel';

// Services
export { taxPortalService } from './services/taxPortalService';

// Stores
export { taxPortalStore } from './stores/taxPortalStore';

// Types
export * from './types';
