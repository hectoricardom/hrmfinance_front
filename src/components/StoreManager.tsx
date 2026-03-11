import { Component, createSignal, onMount, Show, For } from 'solid-js';
import { Card, Button, FormInput, FormSelect, Modal } from '../modules/ui';
import { authStore } from '../stores/authStore';
import { storesApi } from '../services/apiAdapter';
import { db, doc, setDoc } from '../services/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import Icon from './Icon';
import { Location } from '../modules/inventory/stores/inventoryStore';
import { devLog } from '../services/utils';

// Extended Store interface that combines our Store needs with inventory Location interface
export interface Store extends Omit<Location, 'bussinesId'> {
  description?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  contact?: {
    phone: string;
    email: string;
    manager: string;
  };
  storeType: 'retail' | 'warehouse' | 'office' | 'supplier' | 'customer' | 'other';
  businessId: string; // Parent business ID (corrected spelling from bussinesId)
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

const StoreManager: Component = () => {
  const [stores, setStores] = createSignal<Store[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [showModal, setShowModal] = createSignal(false);
  const [editingStore, setEditingStore] = createSignal<Store | null>(null);
  const [formData, setFormData] = createSignal({
    id: '',
    name: '',
    description: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'US'
    },
    contact: {
      phone: '',
      email: '',
      manager: ''
    },
    storeType: 'store' as const,
    businessId: ''
  });
  const [errors, setErrors] = createSignal<{[key: string]: string}>({});
  const [message, setMessage] = createSignal<{ type: 'success' | 'error', text: string } | null>(null);
  const [availableBusinesses, setAvailableBusinesses] = createSignal<Array<{id: string, name: string}>>([]);
  const [seedingData, setSeedingData] = createSignal(false);

  onMount(() => {
    loadStores();
    loadBusinesses();
  });

  const loadBusinesses = async () => {
    try {
      const businesses: Array<{id: string, name: string}> = [];
      
      if (authStore.isAdmin()) {
        // Load all businesses for admin
        const businessesCollection = collection(db, 'businesses');
        const q = query(businessesCollection, orderBy('name'));
        const querySnapshot = await getDocs(q);
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.isActive) {
            businesses.push({ id: doc.id, name: data.name });
          }
        });
      } else {
        // For regular users, only their current business
        const currentBusinessId = authStore.getBusinessId() || 'default';
        businesses.push({ id: currentBusinessId, name: `Current Business (${currentBusinessId})` });
      }
      
      // Fallback businesses if none found
      if (businesses.length === 0) {
        const defaultBusinesses = [
          { id: 'SS695841584167881', name: 'Stephanie S' },
          { id: 'YB100423253156428', name: 'YABA' },
          { id: 'JJCM23753J15918M', name: 'GUANCHO' },
          { id: 'LMR470531564CT28', name: 'LUISCUETO' }
        ];
        businesses.push(...defaultBusinesses);
      }
      
      setAvailableBusinesses(businesses);
    } catch (error) {
      console.error('Error loading businesses:', error);
    }
  };

  const loadStores = async () => {
    try {
      setLoading(true);

      let storesList: Store[] = [];

      // Load stores based on user role
      if (authStore.isAdmin()) {
        // Admin: Load all stores
        const allStores = await storesApi.getAllStores();
        storesList = allStores as Store[];
      } else {
        // Regular user: Load stores by business
        const userBusinessId = authStore.getBusinessId();
        if (userBusinessId) {
          const businessStores = await storesApi.getStoresByBusiness(userBusinessId);
          storesList = businessStores as Store[];
        }
      }

      setStores(storesList);
    } catch (error) {
      console.error('Error loading stores:', error);
      setMessage({ type: 'error', text: 'Failed to load stores' });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};
    const data = formData();
    devLog('Validating form data:', data);

    if (!data.name.trim()) {
      newErrors.name = 'Store name is required';
    }

    if (!data.id.trim()) {
      newErrors.id = 'Store ID is required';
    } else if (!/^[A-Za-z0-9_-]{2,20}$/.test(data.id)) {
      newErrors.id = 'Store ID must be 2-20 characters, letters, numbers, underscore or dash only';
    }

    if (!data.businessId || !data.businessId.trim()) {
      newErrors.businessId = 'Business ID is required';
      devLog('Business ID validation failed:', data.businessId);
    }

    if (!data.address || !data.address.street.trim()) {
      newErrors.street = 'Street address is required';
    }

    if (!data.address || !data.address.city.trim()) {
      newErrors.city = 'City is required';
    }

    if (data.contact && data.contact.email && !/\S+@\S+\.\S+/.test(data.contact.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Check for duplicate ID when creating new
    if (!editingStore() && stores().find(s => s.id === data.id)) {
      newErrors.id = 'Store ID already exists';
    }

    devLog('Validation errors:', newErrors);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    devLog('Form data before validation:', formData());
    if (!validateForm()) {
      devLog('Form validation failed, errors:', errors());
      return;
    }

    try {
      setLoading(true);
      setMessage(null);
      const data = formData();
      const currentUser = authStore.state.user;
      devLog('Proceeding with form submission:', data);

      const storeData = {
        id: data.id,
        name: data.name,
        code: data.id,
        type: data.storeType,
        description: data.description,
        address: data.address,
        contact: data.contact,
        storeType: data.storeType,
        businessId: data.businessId,
        isActive: true,
        createdBy: currentUser?.uid || 'unknown',
        createdDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (editingStore()) {
        // Update existing store
        await storesApi.updateStore(editingStore()!.id, storeData);
        setMessage({ type: 'success', text: 'Store updated successfully' });
      } else {
        // Create new store
        await storesApi.addStore(storeData);
        setMessage({ type: 'success', text: 'Store created successfully' });
      }

      await loadStores();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving store:', error);
      setMessage({
        type: 'error',
        text: editingStore() ? 'Failed to update store' : 'Failed to create store'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (store: Store) => {
    setEditingStore(store);
    setFormData({
      id: store.id,
      name: store.name,
      description: store.description || '',
      address: store.address || {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'US'
      },
      contact: store.contact || {
        phone: '',
        email: '',
        manager: ''
      },
      storeType: store.storeType,
      businessId: store.businessId
    });
    setShowModal(true);
  };

  const handleDelete = async (store: Store) => {
    if (!confirm(`Are you sure you want to delete "${store.name}"?`)) return;

    try {
      setLoading(true);
      await storesApi.deleteStore(store.id);
      setMessage({ type: 'success', text: 'Store deleted successfully' });
      await loadStores();
    } catch (error) {
      console.error('Error deleting store:', error);
      setMessage({ type: 'error', text: 'Failed to delete store' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (store: Store) => {
    try {
      setLoading(true);
      const updatedData = {
        ...store,
        isActive: !store.isActive,
        updatedAt: new Date().toISOString()
      };
      await storesApi.updateStore(store.id, updatedData);
      setMessage({
        type: 'success',
        text: `Store ${store.isActive ? 'deactivated' : 'activated'} successfully`
      });
      await loadStores();
    } catch (error) {
      console.error('Error toggling store status:', error);
      setMessage({ type: 'error', text: 'Failed to update store status' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    setEditingStore(null);
    const defaultBusinessId = availableBusinesses()[0]?.id || authStore.getBusinessId() || '';
    setFormData({
      id: '',
      name: '',
      description: '',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'US'
      },
      contact: {
        phone: '',
        email: '',
        manager: ''
      },
      storeType: 'store',
      businessId: defaultBusinessId
    });
    setErrors({});
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingStore(null);
    setErrors({});
  };

  const updateFormField = (path: string[], value: any) => {
    setFormData(prev => {
      const newData = { ...prev };
      let current: any = newData;
      
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]] = { ...current[path[i]] };
      }
      
      current[path[path.length - 1]] = value;
      return newData;
    });
  };

  // Seed default businesses to Firestore
  const seedBusinessesToFirestore = async () => {
    if (!authStore.isAdmin()) {
      setMessage({ type: 'error', text: 'Only admins can seed business data' });
      return;
    }

    setSeedingData(true);
    try {
      const defaultBusinesses = [
        {
          id: 'SS695841584167881',
          name: 'Stephanie S',
          description: 'Stephanie S Business',
          isActive: true,
          createdAt: new Date().toISOString(),
          createdBy: 'system',
          updatedAt: new Date().toISOString()
        },
        {
          id: 'YB100423253156428',
          name: 'YABA',
          description: 'YABA Business Group',
          isActive: true,
          createdAt: new Date().toISOString(),
          createdBy: 'system',
          updatedAt: new Date().toISOString()
        },
        {
          id: 'JJCM23753J15918M',
          name: 'GUANCHO',
          description: 'GUANCHO Business',
          isActive: true,
          createdAt: new Date().toISOString(),
          createdBy: 'system',
          updatedAt: new Date().toISOString()
        },
        {
          id: 'LMR470531564CT28',
          name: 'LUISCUETO',
          description: 'LUISCUETO Business',
          isActive: true,
          createdAt: new Date().toISOString(),
          createdBy: 'system',
          updatedAt: new Date().toISOString()
        }
      ];

      let seededCount = 0;
      for (const business of defaultBusinesses) {
        try {
          const businessRef = doc(db, 'businesses', business.id);
          await setDoc(businessRef, business);
          seededCount++;
        } catch (error) {
          console.error(`Error seeding business ${business.name}:`, error);
        }
      }

      setMessage({ type: 'success', text: `Successfully seeded ${seededCount} businesses to Firestore` });
      await loadBusinesses();
    } catch (error) {
      console.error('Error seeding businesses:', error);
      setMessage({ type: 'error', text: 'Failed to seed businesses' });
    } finally {
      setSeedingData(false);
    }
  };

  // Seed inventory locations from sample data using API
  const seedInventoryLocationsToFirestore = async () => {
    if (!authStore.isAdmin()) {
      setMessage({ type: 'error', text: 'Only admins can seed location data' });
      return;
    }

    setSeedingData(true);
    try {
      // Sample locations from inventory store

      const sampleLocations : any= [


        {
            "id": "YY_8802",
            code: "YY_8802",
            "name": "CENTER",
            type: 'store',
            bussinesId: "YB100423253156428",
            address: '321 Supply Ave, City, State 12345',
            isActive: true,
            createdDate: '2024-01-01'
        },
        {
            "id": "YY_8803",
            code: "YY_8803",
            "name": "BISSONNET",
            type: 'store',
            bussinesId: "YB100423253156428",
            address: '321 Supply Ave, City, State 12345',
            isActive: true,
            createdDate: '2024-01-01'
        },
        {
            "id": "YY_8804",
            code: "YY_8804",
            "name": "IRVIN",
            type: 'store',
            bussinesId: "YB100423253156428",
            address: '321 Supply Ave, City, State 12345',
            isActive: true,
            createdDate: '2024-01-01'
        },
        {
            "id": "YY_8805",
            code: "YY_8805",
            "name": "KATTY",
            type: 'store',
            bussinesId: "YB100423253156428",
            address: '321 Supply Ave, City, State 12345',
            isActive: true,
            createdDate: '2024-01-01'
        },
        {
            "id": "YY_8816",
            code: "YY_8816",
            type: 'store',
            "name": "YABA GLOBAL",
            bussinesId: "YB100423253156428",
            address: '321 Supply Ave, City, State 12345',
            isActive: true,
            createdDate: '2024-01-01'
        },
        {
            "id": "YY_8818",
            code: "YY_8818",
            type: 'store',
            "name": "YABASURAUSTIN",
            bussinesId: "YB100423253156428",
            address: '321 Supply Ave, City, State 12345',
            isActive: true,
            createdDate: '2024-01-01'
        },



        {
            "id": "YY_8847",
            code: "YY_8847",
            type: 'store',
            "name": "YABAOFICINA AZ",
            bussinesId: "YB100423253156428",
            address: '321 Supply Ave, City, State 12345',
            isActive: true,
            createdDate: '2024-01-01'
        },



        {
            "id": "YY_3251",
            code: "YY_3251",
            type: 'store',
            "name": "YABA FASHION",
            bussinesId: "YB100423253156428",
            address: '321 Supply Ave, City, State 12345',
            isActive: true,
            createdDate: '2024-01-01'
        },
        {
            "id": "YY_32",
            code: "YY_32",
            type: 'store',
            "name": "YABA MESQUITE",
            bussinesId: "YB100423253156428",
            address: '321 Supply Ave, City, State 12345',
            isActive: true,
            createdDate: '2024-01-01'
        },

        {
          "id": "YY_76",
          code: "YY_76",
          type: 'store',
          "name": "YABA DALLAS",
          bussinesId: "YB100423253156428",
          address: '321 Supply Ave, City, State 12345',
          isActive: true,
          createdDate: '2024-01-01'
        },

        {
          "id": "YY_2376",
          code: "YY_2376",
          type: 'store',
          "name": "YABA SAN ANTONIO",
          bussinesId: "YB100423253156428",
          address: '321 Supply Ave, City, State 12345',
          isActive: true,
          createdDate: '2025-08-14'
        },

        {
          "id": "YY_79",
          code: "YY_79",
          type: 'warehouse',
          "name": "ALMACEN DALLAS",
          bussinesId: "YB100423253156428",
          address: '321 Supply Ave, City, State 12345',
          isActive: true,
          createdDate: '2024-01-01'
        },

        {
            "id": "YY_8635",
            code: "YY_8635",
            type: 'store',
            "name": "FASHION MESQUITE",
            bussinesId: "YB100423253156428",
            address: '321 Supply Ave, City, State 12345',
            isActive: true,
            createdDate: '2024-01-01'
        },
        {
            "id": "YY_8665",
            code: "YY_8665",
            "name": "IRVIN FASHION",
            bussinesId: "YB100423253156428",
            address: '321 Supply Ave, City, State 12345',
            isActive: true,
            type: 'store',
            createdDate: '2024-01-01'
        },
        {
            "id": "YY_3303",
            code: "YY_3303",
            "name": "YABA MIAMI",
            bussinesId: "YB100423253156428",
            address: 'Miami',
            isActive: true,
            type: 'store',
            createdDate: '2025-08-01'
        },
        {
            "id": "YY_3329",
            code: "YY_3329",
            "name": "YABA MIAMI 29",
            bussinesId: "YB100423253156428",
            address: 'Miami',
            isActive: true,
            type: 'store',
            createdDate: '2025-08-01'
        },




        {
            "id": "YY_8901",
            code: "YY_8901",
            "name": "ALMACEN CENTRAL YABA",
            bussinesId: "YB100423253156428",
            type: 'warehouse',
            address: '123 Industrial Dr, City, State 12345',
            isActive: true,
            createdDate: '2024-01-01'
        },


        {
            "id": "SS_42",
            code: "SS_42",
            "name": "STEPHANIE SOLUTION",
            bussinesId: "SS695841584167881",
            type: 'store',
            address: '5520 Fern Valley Rd, Ste 108, Louisville, KY 40228',
            isActive: true,
            createdDate: '2024-01-01'
        },



      ];


      let seededStores = 0;

      for (const location of sampleLocations) {
        try {
          // Save to stores using API
          const storeData = {
            id: location.id,
            name: location.name,
            code: location.code,
            type: location.type,
            storeType: location.type,
            businessId: location.bussinesId,
            address: typeof location.address === 'string' ?
              { street: location.address, city: '', state: '', zipCode: '', country: 'US' } :
              location.address,
            isActive: location.isActive,
            createdDate: location.createdDate,
            createdAt: location.createdDate,
            createdBy: 'system',
            updatedAt: location.createdDate
          };
          await storesApi.addStore(storeData);
          seededStores++;
        } catch (error) {
          console.error(`Error seeding location ${location.name}:`, error);
        }
      }

      setMessage({
        type: 'success',
        text: `Successfully seeded ${seededStores} stores using API`
      });
      await loadStores();
    } catch (error) {
      console.error('Error seeding locations:', error);
      setMessage({ type: 'error', text: 'Failed to seed locations' });
    } finally {
      setSeedingData(false);
    }
  };

  // Check if current user is admin
  const isCurrentUserAdmin = () => {
    return authStore.state.profile?.isAdmin === true;
  };

  return (
    <div style={{ padding: '2rem', 'max-width': '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ 'margin-bottom': '2rem' }}>
        <h1 style={{ 'font-size': '2rem', 'font-weight': '700', color: 'var(--text-primary)' }}>
          Store Management
        </h1>
        <p style={{ color: 'var(--text-muted)', 'font-size': '1.125rem' }}>
          Manage stores, locations, and their configurations
        </p>
      </div>

      {/* Controls */}
      <div style={{ 
        display: 'flex', 
        'justify-content': 'space-between', 
        'align-items': 'center',
        'margin-bottom': '2rem',
        'flex-wrap': 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', gap: '1rem', 'align-items': 'center', 'flex-wrap': 'wrap' }}>
          
          <Button onClick={loadStores} disabled={loading()}>
            <Icon name="search" size="1em" style={{ 'margin-right': '0.5rem' }} />
            Refresh
          </Button>
          
          <Show when={false && authStore.isAdmin()}>
            <Button 
              onClick={seedBusinessesToFirestore} 
              disabled={loading() || seedingData()}
              variant="outline"
            >
              <Icon name="upload" size="1em" style={{ 'margin-right': '0.5rem' }} />
              <Show when={seedingData()} fallback="Seed Businesses">
                Seeding...
              </Show>
            </Button>
            
            <Button 
              onClick={seedInventoryLocationsToFirestore} 
              disabled={loading() || seedingData()}
              variant="outline"
            >
              <Icon name="store" size="1em" style={{ 'margin-right': '0.5rem' }} />
              <Show when={seedingData()} fallback="Seed Locations">
                Seeding...
              </Show>
            </Button>
          </Show>
        </div>
        
        <Button 
          onClick={handleOpenModal} 
          variant="primary"
          disabled={loading()}
        >
          <Icon name="add" size="1em" style={{ 'margin-right': '0.5rem' }} />
          Create New Store
        </Button>
      </div>

      {/* Messages */}
      <Show when={message()}>
        <div style={{
          padding: '1rem',
          'margin-bottom': '1rem',
          'border-radius': 'var(--border-radius)',
          background: message()!.type === 'success' ? 'var(--success-light)' : 'var(--error-light)',
          color: message()!.type === 'success' ? 'var(--success-dark)' : 'var(--error-dark)',
          border: `1px solid ${message()!.type === 'success' ? 'var(--success-color)' : 'var(--error-color)'}`
        }}>
          <strong>{message()!.type === 'success' ? '✓ Success:' : '⚠ Error:'}</strong> {message()!.text}
        </div>
      </Show>

      {/* Stores List */}
      <Card>
        <div style={{ padding: '1.5rem' }}>
          <Show when={loading()} fallback={
            <Show when={stores().length > 0} fallback={
              <div style={{ 'text-align': 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                <Icon name="store" size="3rem" style={{ opacity: '0.3', 'margin-bottom': '1rem' }} />
                <p>No stores found. Create your first store.</p>
              </div>
            }>
              <div style={{ 'overflow-x': 'auto' }}>
                <table style={{ width: '100%', 'border-collapse': 'collapse' }}>
                  <thead>
                    <tr style={{ 'border-bottom': '2px solid var(--border-color)' }}>
                      <th style={{ padding: '1rem', 'text-align': 'left' }}>Store ID</th>
                      <th style={{ padding: '1rem', 'text-align': 'left' }}>Name</th>
                      <th style={{ padding: '1rem', 'text-align': 'left' }}>Type</th>
                      <th style={{ padding: '1rem', 'text-align': 'left' }}>Business</th>
                      <th style={{ padding: '1rem', 'text-align': 'center' }}>Status</th>
                      <th style={{ padding: '1rem', 'text-align': 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={stores()}>
                      {(store) => (
                        <tr style={{ 'border-bottom': '1px solid var(--border-light)' }}>
                          <td style={{ padding: '1rem', 'font-family': 'monospace', 'font-weight': '600' }}>
                            {store.id}
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <div style={{ 'font-weight': '500' }}>{store.name}</div>
                            <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                              {store.description || 'No description'}
                            </div>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              'border-radius': '4px',
                              'font-size': '0.875rem',
                              background: 'var(--primary-light)',
                              color: '#ffffff',
                              'text-transform': 'capitalize'
                            }}>
                              {store.storeType}
                            </span>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            {availableBusinesses().find(b => b.id === store.businessId)?.name || store.businessId}
                          </td>
                        
                          <td style={{ padding: '1rem', 'text-align': 'center' }}>
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              'border-radius': '4px',
                              'font-size': '0.875rem',
                              background: store.isActive ? 'var(--success-light)' : 'var(--error-light)',
                              color: store.isActive ? 'var(--success-dark)' : 'var(--error-dark)'
                            }}>
                              {store.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td style={{ padding: '1rem', 'text-align': 'center' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', 'justify-content': 'center' }}>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleEdit(store)}
                              >
                                <Icon name="edit" size="0.875rem" />
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleToggleStatus(store)}
                              >
                                <Icon name={store.isActive ? 'close' : 'check'} size="0.875rem" />
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleDelete(store)}
                                style={{ color: 'var(--error-color)' }}
                              >
                                <Icon name="delete" size="0.875rem" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </Show>
          }>
            <div style={{ 'text-align': 'center', padding: '2rem' }}>
              <Icon name="loading" size="2rem" />
              <p>Loading stores...</p>
            </div>
          </Show>
        </div>
      </Card>

      {/* Create/Edit Modal */}
      <Modal 
        isOpen={showModal()} 
        onClose={handleCloseModal}
        size="large"
      >
        <div style={{ padding: '2rem' }}>
          <h2 style={{ 'margin-bottom': '1.5rem' }}>
            {editingStore() ? 'Edit Store' : 'Create New Store'}
          </h2>

          {/* Basic Information */}
          <Card style={{ 'margin-bottom': '1.5rem' }}>
            <div style={{ padding: '1.5rem' }}>
              <h3 style={{ 'margin-bottom': '1rem' }}>Basic Information</h3>
              <div style={{ 
                display: 'grid', 
                'grid-template-columns': 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1rem' 
              }}>
                <FormInput
                  label="Store ID *"
                  value={formData().id}
                  onChange={(value) => updateFormField(['id'], value)}
                  placeholder="e.g., STORE_001"
                  disabled={!!editingStore()}
                  error={errors().id}
                />
                
                <FormInput
                  label="Store Name *"
                  value={formData().name}
                  onChange={(value) => updateFormField(['name'], value)}
                  placeholder="e.g., Main Street Store"
                  error={errors().name}
                />
                
                <FormSelect
                  label="Store Type *"
                  value={formData().storeType}
                  onChange={(value) => updateFormField(['storeType'], value)}
                  options={[
                    { value: 'store', label: 'Store' },
                    { value: 'warehouse', label: 'Warehouse' },
                    { value: 'office', label: 'Office' },
                    { value: 'supplier', label: 'Supplier' },
                    { value: 'customer', label: 'Customer' },
                    { value: 'retail', label: 'Retail Store' },
                    { value: 'other', label: 'Other' }
                  ]}
                />
                
                <FormSelect
                  label="Business *"
                  value={formData().businessId}
                  onChange={(value) => updateFormField(['businessId'], value)}
                  options={availableBusinesses().map(business => ({ 
                    value: business.id, 
                    label: business.name 
                  }))}
                  error={errors().businessId}
                />
              </div>
              
              <FormInput
                label="Description"
                value={formData().description}
                onChange={(value) => updateFormField(['description'], value)}
                placeholder="Store description"
                multiline={true}
                rows={3}
                style={{ 'margin-top': '1rem' }}
              />
            </div>
          </Card>

          {/* Address Information */}
          <Card style={{ 'margin-bottom': '1.5rem' }}>
            <div style={{ padding: '1.5rem' }}>
              <h3 style={{ 'margin-bottom': '1rem' }}>Address</h3>
              <div style={{ 
                display: 'grid', 
                'grid-template-columns': 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1rem' 
              }}>
                <div style={{ 'grid-column': '1 / -1' }}>
                  <FormInput
                    label="Street Address *"
                    value={formData().address.street}
                    onChange={(value) => updateFormField(['address', 'street'], value)}
                    placeholder="123 Main Street"
                    error={errors().street}
                  />
                </div>
                
                <FormInput
                  label="City *"
                  value={formData().address.city}
                  onChange={(value) => updateFormField(['address', 'city'], value)}
                  placeholder="New York"
                  error={errors().city}
                />
                
                <FormInput
                  label="State/Province"
                  value={formData().address.state}
                  onChange={(value) => updateFormField(['address', 'state'], value)}
                  placeholder="NY"
                />
                
                <FormInput
                  label="ZIP/Postal Code"
                  value={formData().address.zipCode}
                  onChange={(value) => updateFormField(['address', 'zipCode'], value)}
                  placeholder="10001"
                />
                
                <FormSelect
                  label="Country"
                  value={formData().address.country}
                  onChange={(value) => updateFormField(['address', 'country'], value)}
                  options={[
                    { value: 'US', label: 'United States' },
                    { value: 'CA', label: 'Canada' },
                    { value: 'MX', label: 'Mexico' },
                    { value: 'CU', label: 'Cuba' },
                    { value: 'OTHER', label: 'Other' }
                  ]}
                />
              </div>
            </div>
          </Card>

          {/* Contact Information */}
          <Card style={{ 'margin-bottom': '1.5rem' }}>
            <div style={{ padding: '1.5rem' }}>
              <h3 style={{ 'margin-bottom': '1rem' }}>Contact Information</h3>
              <div style={{ 
                display: 'grid', 
                'grid-template-columns': 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1rem' 
              }}>
                <FormInput
                  label="Phone"
                  value={formData().contact.phone}
                  onChange={(value) => updateFormField(['contact', 'phone'], value)}
                  placeholder="(555) 123-4567"
                />
                
                <FormInput
                  label="Email"
                  type="email"
                  value={formData().contact.email}
                  onChange={(value) => updateFormField(['contact', 'email'], value)}
                  placeholder="store@company.com"
                  error={errors().email}
                />
                
                <FormInput
                  label="Store Manager"
                  value={formData().contact.manager}
                  onChange={(value) => updateFormField(['contact', 'manager'], value)}
                  placeholder="John Doe"
                />
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <div style={{ 
            display: 'flex', 
            gap: '1rem', 
            'justify-content': 'flex-end'
          }}>
            <Button 
              variant="outline" 
              onClick={handleCloseModal}
              disabled={loading()}
            >
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={handleSubmit}
              disabled={loading()}
            >
              {loading() ? 'Saving...' : (editingStore() ? 'Update Store' : 'Create Store')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StoreManager;