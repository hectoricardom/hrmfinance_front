import { createStore } from 'solid-js/store';
import { createSignal } from 'solid-js';
import { 
  PurchaseRegistration, 
  CreatePurchaseRegistrationInput 
} from '../types/purchaseRequestTypes';
import { purchaseRegistrationService } from '../services/purchaseRegistrationService';

// Store state interface
interface PurchaseRegistrationStoreState {
  registrations: PurchaseRegistration[];
  currentRegistration: PurchaseRegistration | null;
  summary: {
    totalRegistrations: number;
    totalAmount: number;
    totalProducts: number;
    totalBonus: number;
    totalRefunds: number;
    netAmount: number;
    platformBreakdown: Record<string, { count: number; amount: number; }>;
  } | null;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

// Initial state
const initialState: PurchaseRegistrationStoreState = {
  registrations: [],
  currentRegistration: null,
  summary: null,
  loading: false,
  error: null,
  lastUpdated: null
};

// Create store
const [state, setState] = createStore<PurchaseRegistrationStoreState>(initialState);

// Loading signals for specific operations
const [isCreating, setIsCreating] = createSignal(false);
const [isUpdating, setIsUpdating] = createSignal(false);
const [isDeleting, setIsDeleting] = createSignal(false);

// Store actions
const purchaseRegistrationStore = {
  // Getters
  get state() { 
    return state; 
  },

  get isCreating() {
    return isCreating();
  },

  get isUpdating() {
    return isUpdating();
  },

  get isDeleting() {
    return isDeleting();
  },

  // Set loading state
  setLoading: (loading: boolean) => {
    setState('loading', loading);
  },

  // Set error state
  setError: (error: string | null) => {
    setState('error', error);
  },

  // Clear error
  clearError: () => {
    setState('error', null);
  },

  // Load all purchase registrations
  async loadRegistrations(): Promise<void> {
    try {
      setState('loading', true);
      setState('error', null);
      
      const registrations = await purchaseRegistrationService.getPurchaseRegistrations();
      
      setState({
        registrations,
        lastUpdated: Date.now()
      });
    } catch (error) {
      console.error('Error loading purchase registrations:', error);
      setState('error', error instanceof Error ? error.message : 'Failed to load purchase registrations');
    } finally {
      setState('loading', false);
    }
  },

  // Load purchase registration summary
  async loadSummary(): Promise<void> {
    try {
      const summary = await purchaseRegistrationService.getPurchaseRegistrationSummary();
      setState('summary', summary);
    } catch (error) {
      console.error('Error loading purchase registration summary:', error);
      setState('error', error instanceof Error ? error.message : 'Failed to load summary');
    }
  },

  // Load both registrations and summary
  async loadAll(): Promise<void> {
    await Promise.all([
      this.loadRegistrations(),
      this.loadSummary()
    ]);
  },

  // Get registration by ID
  async getRegistrationById(id: string): Promise<PurchaseRegistration | null> {
    try {
      // First check if we have it in the store
      const existing = state.registrations.find(reg => reg.id === id);
      if (existing) {
        setState('currentRegistration', existing);
        return existing;
      }

      // If not, fetch from API
      setState('loading', true);
      setState('error', null);
      
      const registration = await purchaseRegistrationService.getPurchaseRegistrationById(id);
      setState('currentRegistration', registration);
      
      return registration;
    } catch (error) {
      console.error('Error getting purchase registration:', error);
      setState('error', error instanceof Error ? error.message : 'Failed to get purchase registration');
      return null;
    } finally {
      setState('loading', false);
    }
  },

  // Create new registration
  async createRegistration(input: CreatePurchaseRegistrationInput): Promise<PurchaseRegistration | null> {
    try {
      setIsCreating(true);
      setState('error', null);
      
      const newRegistration = await purchaseRegistrationService.createPurchaseRegistration(input);
      
      // Add to store
      setState('registrations', prev => [newRegistration, ...prev]);
      setState('currentRegistration', newRegistration);
      setState('lastUpdated', Date.now());
      
      // Reload summary to get updated stats
      await this.loadSummary();
      
      return newRegistration;
    } catch (error) {
      console.error('Error creating purchase registration:', error);
      setState('error', error instanceof Error ? error.message : 'Failed to create purchase registration');
      return null;
    } finally {
      setIsCreating(false);
    }
  },

  // Update registration
  async updateRegistration(id: string, updates: Partial<CreatePurchaseRegistrationInput>): Promise<PurchaseRegistration | null> {
    try {
      setIsUpdating(true);
      setState('error', null);
      
      const updatedRegistration = await purchaseRegistrationService.updatePurchaseRegistration(id, updates);
      
      // Update in store
      setState('registrations', prev => 
        prev.map(reg => reg.id === id ? updatedRegistration : reg)
      );
      
      if (state.currentRegistration?.id === id) {
        setState('currentRegistration', updatedRegistration);
      }
      
      setState('lastUpdated', Date.now());
      
      // Reload summary to get updated stats
      await this.loadSummary();
      
      return updatedRegistration;
    } catch (error) {
      console.error('Error updating purchase registration:', error);
      setState('error', error instanceof Error ? error.message : 'Failed to update purchase registration');
      return null;
    } finally {
      setIsUpdating(false);
    }
  },

  // Delete registration
  async deleteRegistration(id: string): Promise<boolean> {
    try {
      setIsDeleting(true);
      setState('error', null);
      
      await purchaseRegistrationService.deletePurchaseRegistration(id);
      
      // Remove from store
      setState('registrations', prev => prev.filter(reg => reg.id !== id));
      
      if (state.currentRegistration?.id === id) {
        setState('currentRegistration', null);
      }
      
      setState('lastUpdated', Date.now());
      
      // Reload summary to get updated stats
      await this.loadSummary();
      
      return true;
    } catch (error) {
      console.error('Error deleting purchase registration:', error);
      setState('error', error instanceof Error ? error.message : 'Failed to delete purchase registration');
      return false;
    } finally {
      setIsDeleting(false);
    }
  },

  // Set current registration
  setCurrentRegistration: (registration: PurchaseRegistration | null) => {
    setState('currentRegistration', registration);
  },

  // Clear current registration
  clearCurrentRegistration: () => {
    setState('currentRegistration', null);
  },

  // Refresh data (reload everything)
  async refresh(): Promise<void> {
    await this.loadAll();
  },

  // Filter registrations by platform
  getRegistrationsByPlatform: (platform: string) => {
    return state.registrations.filter(reg => reg.platform === platform);
  },

  // Filter registrations by date range
  getRegistrationsByDateRange: (startDate: string, endDate: string) => {
    return state.registrations.filter(reg => {
      const regDate = new Date(reg.purchaseDate);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return regDate >= start && regDate <= end;
    });
  },

  // Get registrations with search
  searchRegistrations: (query: string) => {
    if (!query.trim()) return state.registrations;
    
    const searchTerm = query.toLowerCase();
    return state.registrations.filter(reg => 
      reg.registrationNumber.toLowerCase().includes(searchTerm) ||
      reg.store.toLowerCase().includes(searchTerm) ||
      reg.description?.toLowerCase().includes(searchTerm) ||
      reg.notes?.toLowerCase().includes(searchTerm)
    );
  },

  // Sort registrations
  sortRegistrations: (field: keyof PurchaseRegistration, direction: 'asc' | 'desc' = 'desc') => {
    return [...state.registrations].sort((a, b) => {
      const aValue = a[field];
      const bValue = b[field];
      
      if (aValue === undefined || aValue === null) return direction === 'asc' ? -1 : 1;
      if (bValue === undefined || bValue === null) return direction === 'asc' ? 1 : -1;
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      return 0;
    });
  },

  // Reset store to initial state
  reset: () => {
    setState(initialState);
    setIsCreating(false);
    setIsUpdating(false);
    setIsDeleting(false);
  }
};

export default purchaseRegistrationStore;