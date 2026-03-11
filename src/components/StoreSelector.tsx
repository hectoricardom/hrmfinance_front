import { Component, createSignal, onMount, Show, For } from 'solid-js';
import { FormSelect } from '../modules/ui';
import { authStore } from '../stores/authStore';
import { db, doc, updateDoc } from '../services/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import Icon from './Icon';
import { devLog } from '../services/utils';
import { businessApi, storesApi } from '../services/apiAdapter';

export interface Store {
  id: string;
  name: string;
  isActive?: boolean;
}

interface StoreSelectorProps {
  value?: string;
  onChange?: (storeId: string) => void;
  includeAll?: boolean;
  includeCurrentOption?: boolean;
  showAdminWarning?: boolean;
  style?: Record<string, string>;
  label?: string;
  autoSwitch?: boolean; // If true, automatically switch business context
}

const StoreSelector: Component<StoreSelectorProps> = (props) => {
  const [availableStores, setAvailableStores] = createSignal<Store[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [switching, setSwitching] = createSignal(false);
  const [currentValue, setCurrentValue] = createSignal(props.value || authStore.getBusinessId() || 'current');

  onMount(() => {
    loadAvailableStores();
  });

  const loadAvailableStores = async () => {
    try {
      setLoading(true);
      const stores: Store[] = [];
      const currentBusinessId = authStore.getBusinessId() || 'all';

      // Add "All" option if requested
      if (props.includeAll && authStore.isAdmin()) {
        stores.push({
          id: 'all',
          name: 'Todos los Negocios',
          isActive: true
        });
      }

      // Add current business option if requested
      if (props.includeCurrentOption) {
        stores.push({
          id: 'current',
          name: `Negocio Actual (${currentBusinessId === 'all' ? 'Todos' : currentBusinessId})`,
          isActive: true
        });
      }

      // Load businesses and stores from API
      try {
        if (authStore.isAdmin()) {
          // Load all active businesses for admin from API
          const apiBusinesses = await businessApi.getBusinessByStatus(true);
          if (apiBusinesses && apiBusinesses.length > 0) {
            apiBusinesses.forEach((biz: any) => {
              if (biz.id !== currentBusinessId && !stores.find(s => s.id === biz.id)) {
                stores.push({
                  id: biz.id,
                  name: biz.name,
                  isActive: biz.isActive !== false
                });
              }
            });
          }

          // Also load actual stores/locations for admin from API
          const apiStores = await storesApi.getActiveStores();
          if (apiStores && apiStores.length > 0) {
            apiStores.forEach((store: any) => {
              if (!stores.find(s => s.id === store.id)) {
                stores.push({
                  id: store.id,
                  name: `${store.name} (${store.code || store.id})`,
                  isActive: store.isActive !== false
                });
              }
            });
          }
        } else {
          // Load user's assigned businesses from API
          /**
          const userBusinessIds = authStore.getBusinessIds();

          // Load each business by ID
          for (const bizId of userBusinessIds) {
            if (bizId !== currentBusinessId && !stores.find(s => s.id === bizId)) {
              try {
                const bizData = await businessApi.getBusinessById(bizId);
                if (bizData && bizData.isActive !== false) {
                  stores.push({
                    id: bizData.id,
                    name: bizData.name,
                    isActive: true
                  });
                }
              } catch (err) {
                // If not found, add with ID as name
                stores.push({
                  id: bizId,
                  name: bizId,
                  isActive: true
                });
              }
            }
          }

           */

          // Also load stores for the user's businesses from API
          const apiStores = await storesApi.getActiveStores();
          if (apiStores && apiStores.length > 0) {
            apiStores.forEach((store: any) => {
              const storeBusinessId = store.businessId || store.bussinesId;
              if (userBusinessIds.includes(storeBusinessId) && !stores.find(s => s.id === store.id)) {
                stores.push({
                  id: store.id,
                  name: `${store.name} (${store.code || store.id})`,
                  isActive: store.isActive !== false
                });
              }
            });
          }
        }
      } catch (error) {
        devLog('Could not load from API:', error);
      }

      setAvailableStores(stores);
    } catch (error) {
      console.error('Error loading stores:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentStore = () => {
    const value = props.value || currentValue();
    return availableStores().find(store => store.id === value) || 
           { id: value, name: value, isActive: true };
  };
  
  const handleStoreChange = async (storeId: string) => {
    try {
      setSwitching(true);
      setCurrentValue(storeId);
      
      // Call the parent onChange if provided
      props.onChange?.(storeId);
      
      // If autoSwitch is enabled, actually switch the business context
      if (props.autoSwitch !== false) {
      //  await switchBusinessContext(storeId);
      }
    } catch (error) {
      console.error('Error switching store:', error);
    } finally {
      setSwitching(false);
    }
  };
  
  const switchBusinessContext = async (businessId: string) => {
    try {
      const user = authStore.state.user;
      if (!user) return;
      
      let targetBusinessId = businessId;
      
      // Handle special cases
      if (businessId === 'current') {
        targetBusinessId = authStore.getBusinessId() || 'all';
      } else if (businessId === 'all') {
        targetBusinessId = 'all';
      }
      
      // Update user's current business ID in Firestore
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        businessId: targetBusinessId
      });
      
      // Update auth store profile
      await authStore.getUserProfile(user.uid);
      
      // Reload the page to refresh all data with new business context
      setTimeout(() => {
        window.location.reload();
      }, 500);
      
    } catch (error) {
      console.error('Error switching business context:', error);
    }
  };

  return (
    <div>
      <Show when={availableStores().length > 1}>
        <div style={{
          display: 'flex',
          'align-items': 'center',
          gap: '1rem',
          'flex-wrap': 'wrap',
          ...props.style
        }}>
          <Show when={props.label}>
            <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
              <Icon name="store" size="1.25rem" style={{ color: 'var(--primary-color)' }} />
              <label style={{ 'font-weight': '500' }}>
                {props.label}:
              </label>
            </div>
          </Show>
          
          <FormSelect
            value={props.value || currentValue()}
            onChange={handleStoreChange}
            options={authStore.stores.map(store => ({
              value: store.id,
              label: store.name,
              disabled: !store.isActive
            }))}
            style={{ 'min-width': '250px' }}
            disabled={loading() || switching()}
          />
          
          <Show when={switching()}>
            <div style={{
              display: 'flex',
              'align-items': 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              background: 'var(--primary-light)',
              color: 'var(--primary-dark)',
              'border-radius': 'var(--border-radius)',
              'font-size': '0.875rem'
            }}>
              <Icon name="loading" size="1rem" />
              Cambiando...
            </div>
          </Show>
          
          <Show when={props.showAdminWarning && authStore.isAdmin() && (props.value || currentValue()) !== 'current' && (props.value || currentValue()) !== authStore.getBusinessId()}>
            <div style={{
              padding: '0.5rem 1rem',
              background: 'var(--warning-light)',
              color: 'var(--warning-dark)',
              'border-radius': 'var(--border-radius)',
              'font-size': '0.875rem'
            }}>
              <Icon name="info" size="1rem" style={{ 'margin-right': '0.5rem' }} />
              Vista de administrador
            </div>
          </Show>
        </div>
        
        <div style={{
          'margin-top': '0.5rem',
          'font-size': '0.875rem',
          color: 'var(--text-muted)'
        }}>
          Seleccionado: <strong>{currentStore().name}</strong>
        </div>
      </Show>
    </div>
  );
};

export default StoreSelector;

// Helper hook for using the store selector
export const useStoreSelector = (initialValue: string = 'current', options?: {
  includeAll?: boolean;
  includeCurrentOption?: boolean;
}) => {
  const [selectedStore, setSelectedStore] = createSignal(initialValue);
  
  const StoreComponent: Component<{
    label?: string;
    showAdminWarning?: boolean;
    style?: Record<string, string>;
    onStoreChange?: (storeId: string) => void;
  }> = (props) => {
    return (
      <StoreSelector
        value={selectedStore()}
        onChange={(value) => {
          setSelectedStore(value);
          props.onStoreChange?.(value);
        }}
        includeAll={options?.includeAll}
        includeCurrentOption={options?.includeCurrentOption}
        showAdminWarning={props.showAdminWarning}
        style={props.style}
        label={props.label}
      />
    );
  };
  
  return {
    selectedStore,
    setSelectedStore,
    StoreComponent
  };
};