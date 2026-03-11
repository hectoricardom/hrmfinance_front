import { Component, createSignal, createMemo, For, Show, onMount } from 'solid-js';
import { Layout } from '../ui';
import { Card } from '../ui';
import { Button } from '../ui';
import { useTranslation } from '../../translations';
import { db } from '../../services/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { authStore } from '../../stores/authStore';
import { inventoryStore } from '../inventory';
import Icon from '../../components/Icon';
import { usersApi, businessApi } from '../../services/apiAdapter';
import { statusAllList } from '../hbl/status/hblUpdateService';
import { devLog } from '../../services/utils';
import {
  PERMISSIONS,
  PERMISSION_CATEGORIES,
  getPermissionsByCategory,
  getSortedCategories,
  getDefaultPermissions,
  PermissionCategory
} from '../../config/permissions';

interface UserProfile {
  uid: string;
  email: string;
}

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  createdAt: any;
  stores: Record<string, boolean>;
  statusLocationPermissions?: Record<string, boolean>; // Status location permissions
  AccountAccess: boolean;
  BankingAccess: boolean;
  InventoryAccess: boolean;
  EmployeeAccess: boolean;
  invoiceAccess: boolean;
  JournalAccess: boolean;
  HBLAccess: boolean;
  HBLAccessManagement: boolean;
  HBLScannerAccess: boolean;
  PurchaseRequestAccess: boolean;
  PassportAccess: boolean;
  AdminPassportAccess: boolean;
  RemittanceAccess: boolean;
  NotaryAccess: boolean;
  offersManagementAccess: boolean;
  inventoryDownsection: boolean;
  onlyRead: boolean;
  permissions: any;
  businessId: string;
  businessIds?: string[]; // Support multiple business IDs
  read_write: boolean;
  isAdmin?: boolean;
}

const UserProfileAdmin: Component = () => {
  const { t } = useTranslation();
  
  const [users, setUsers] = createSignal<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = createSignal<UserProfile | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [saving, setSaving] = createSignal(false);
  const [searchTerm, setSearchTerm] = createSignal('');
  const [message, setMessage] = createSignal<{ type: 'success' | 'error', text: string } | null>(null);
  const [availableBusinesses, setAvailableBusinesses] = createSignal<Array<{id: string, name: string}>>([]);
  const [stores, setStores] = createSignal<Array<{id: string, name: string}>>([]);
  
  // Load available stores from Firestore
  const loadStoresFromFirestore = async () => {
    try {
      const storesCollection = collection(db, 'stores');
      const q = query(storesCollection, orderBy('name'));
      const querySnapshot = await getDocs(q);
      
      const storesList: Array<{id: string, name: string}> = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.isActive !== false) {
          storesList.push({ id: doc.id, name: data.name });
        }
      });
      
      // Add fallback stores if none found in Firestore
      const fallbackStores = [
        { id: "YY_8802", name: "CENTER" },
        { id: "YY_8803", name: "BISSONNET" },
        { id: "YY_8804", name: "IRVIN" },
        { id: "YY_8805", name: "KATTY" },
        { id: "YY_8816", name: "YABA GLOBAL" },
        { id: "YY_8818", name: "YABASURAUSTIN" },
        { id: "YY_8847", name: "YABAOFICINA AZ" },
        { id: "YY_3251", name: "YABA FASHION" },
        { id: "YY_32", name: "YABA MESQUITE" },
        { id: "YY_76", name: "YABA DALLAS" },
        { id: "YY_79", name: "YABA 79" },
        { id: "YY_2376", name: "YABA SAN ANTONIO" },
        { id: "YY_8635", name: "YABA 8635" },
        { id: "YY_8665", name: "YABA 8665" },
        { id: "YY_8901", name: "YABA 8901" },
        { id: "YY_3303", name: "YABA MIAMI" },
        { id: "YY_3329", name: "YABA MIAMI 29" },
        { id: "SS_42", name: "STEPHANIE SOLUTION" }
      ];
      
      for (const fallbackStore of fallbackStores) {
        if (!storesList.find(s => s.id === fallbackStore.id)) {
          storesList.push(fallbackStore);
        }
      }
      
      setStores(storesList);
    } catch (error) {
      console.error('Error loading stores from Firestore:', error);
      // Fallback to hardcoded stores
      setStores([
        { id: "YY_8802", name: "CENTER" },
        { id: "YY_8803", name: "BISSONNET" },
        { id: "YY_8804", name: "IRVIN" },
        { id: "YY_8805", name: "KATTY" },
        { id: "YY_8816", name: "YABA GLOBAL" },
        { id: "YY_8818", name: "YABASURAUSTIN" },
        { id: "YY_8847", name: "YABAOFICINA AZ" },
        { id: "YY_3251", name: "YABA FASHION" },
        { id: "YY_32", name: "YABA MESQUITE" },
        { id: "YY_76", name: "YABA DALLAS" },
        { id: "YY_79", name: "YABA 79" },
        { id: "YY_2376", name: "YABA SAN ANTONIO" },
        { id: "YY_8635", name: "YABA 8635" },
        { id: "YY_8665", name: "YABA 8665" },
        { id: "YY_8901", name: "YABA 8901" },
        { id: "YY_3303", name: "YABA MIAMI" },
        { id: "YY_3329", name: "YABA MIAMI 29" },
        { id: "SS_42", name: "STEPHANIE SOLUTION" }
      ]);
    }
  };

  // Permission configuration - now using centralized config
  const permissionsByCategory = getPermissionsByCategory();
  const sortedCategories = getSortedCategories();

  // For legacy compatibility, flat permissions array
  const permissions = PERMISSIONS;
  
  // 06/13/

  // Default user template (flattened structure) - uses centralized permissions config
  let nw: any = {
    "businessId": "YB100423253156428",
    "stores":{
      "YY_8802":false,
      "YY_8803":false,
      "YY_8804":false,
      "YY_8805":false,
      "YY_8816":false,
      "YY_8818":false,
      "YY_8847":false,
      "YY_3251":false,
      "YY_32":false,
      "YY_76":false,
      "YY_79":false,
      "YY_2376":false,
      "YY_8635":false,
      "YY_8665":false,
      "YY_8901":false,
      "YY_3303":false,
      "YY_3329":false,
      "SS_42":false,
    },
    "statusLocationPermissions": Object.fromEntries(
      statusAllList.map(status => [status.id, false])
    ),
    // Use centralized permissions with all new permissions included
    permissions: getDefaultPermissions()
 }



  // Load available businesses from API
  const loadBusinesses = async () => {
    try {
      const businesses: Array<{id: string, name: string, isActive: boolean}> = [];

      // Load available businesses from API
      const apiBusinesses = await businessApi.getBusinessByStatus(true);
      if (apiBusinesses && apiBusinesses.length > 0) {
        apiBusinesses.forEach((biz: any) => {
          businesses.push({
            id: biz.id,
            name: biz.name,
            isActive: biz.isActive !== false
          });
        });
      }

      // Add default businesses if not from API
      const defaultBusinesses = [
        { id: "SS695841584167881", name: "Stephanie S" },
        { id: "YB100423253156428", name: "YABA" },
        { id: "JJCM23753J15918M", name: "GUANCHO" },
        { id: "LMR470531564CT28", name: "LUISCUETO" },
      ];

      for (const defaultBiz of defaultBusinesses) {
        if (!businesses.find(b => b.id === defaultBiz.id)) {
          businesses.push({ ...defaultBiz, isActive: true });
        }
      }

      setAvailableBusinesses(businesses);
    } catch (error) {
      console.error('Error loading businesses:', error);
      // Fallback to default list
      setAvailableBusinesses([
        { id: "SS695841584167881", name: "Stephanie S" },
        { id: "YB100423253156428", name: "YABA" },
        { id: "JJCM23753J15918M", name: "GUANCHO" },
        { id: "LMR470531564CT28", name: "LUISCUETO" },
      ]);
    }
  };

  // Load users on mount
  onMount(async () => {
    await loadUsers();
    await loadBusinesses();
    await loadStoresFromFirestore();
  });
  
  // Load all users from server via API
  const loadUsers = async () => {
    try {
      setLoading(true);
      devLog('📥 Loading users via API...');

      // Use the API adapter to fetch users from server
      const usersFromApi = await usersApi.getAll();
      devLog(`✅ Received ${usersFromApi.length} users from API`);

      // Normalize users - ensure all have required properties
      const usersList: UserProfile[] = usersFromApi.map((user: any) => {
        let normalizedUser: any = { uid: user.uid, ...user };

        // Fill in missing properties with defaults from nw template
        Object.keys(nw).forEach(key => {
          if (!normalizedUser.hasOwnProperty(key)) {
            normalizedUser[key] = nw[key];
          }
        });

        return normalizedUser as UserProfile;
      });

      devLog(`✅ Loaded and normalized ${usersList.length} users`);
      devLog(usersList)
      setUsers(usersList);
    } catch (error) {
      console.error('❌ Error loading users:', error);
      setMessage({ type: 'error', text: 'Failed to load users from server' });
    } finally {
      setLoading(false);
    }
  };
  
  // Filter users based on search
  const filteredUsers = createMemo(() => {
    const search = searchTerm().toLowerCase();
    if (!search) return users();
    
    return users().filter(user => 
      user.email?.toLowerCase().includes(search) ||
      user.displayName?.toLowerCase().includes(search) ||
      user.uid?.toLowerCase().includes(search)
    );
  });
  
  // Handle store access toggle
  const toggleStoreAccess = (storeId: string) => {
    if (!selectedUser()) return;
    
    setSelectedUser(prev => ({
      ...prev!,
      stores: {
        ...prev!.stores,
        [storeId]: !prev!.stores[storeId]
      }
    }));
  };


  const updateBussinesAccess = (businessId: string) => {
    if (!selectedUser()) return;
    
    setSelectedUser(prev => ({
      ...prev!,
      businessId
    }));
  };


  // Handle permission toggle
  const togglePermission = (key: string) => {
    if (!selectedUser()) return;

    setSelectedUser(prev => ({
      ...prev!,
      permissions: {
        ...prev!.permissions,
        [key]: !prev!.permissions?.[key]
      }
    }));
  };

  // Handle status location permission toggle
  const toggleStatusLocationPermission = (statusId: string) => {
    if (!selectedUser()) return;

    setSelectedUser(prev => ({
      ...prev!,
      statusLocationPermissions: {
        ...prev!.statusLocationPermissions,
        [statusId]: !prev!.statusLocationPermissions?.[statusId]
      }
    }));
  };
  
  // Check if user has any store access
  const hasAnyStoreAccess = createMemo(() => {
    if (!selectedUser()) return false;
    return selectedUser()!.stores && Object.values(selectedUser()!.stores).some(access => access);
  });
  
  // Save user profile using API
  const saveUserProfile = async () => {
    if (!selectedUser()) return;

    try {
      setSaving(true);
      setMessage(null);

      devLog('💾 Saving user permissions via API...');
      devLog('🔄 Using API endpoint (NOT Firebase directly)');

      // Prepare data object with proper structure
      // Backend expects: { permissions: {...}, stores: {...}, statusLocationPermissions: {...}, businessId?, businessIds? }
      // Build permissions object dynamically from centralized config
      const permissionsData: Record<string, boolean> = {};
      PERMISSIONS.forEach(p => {
        permissionsData[p.key] = selectedUser()!.permissions?.[p.key] || false;
      });

      const updateData = {
        permissions: permissionsData,
        stores: selectedUser()!.stores,
        statusLocationPermissions: selectedUser()!.statusLocationPermissions || Object.fromEntries(
          statusAllList.map(status => [status.id, false])
        ),
        businessId: selectedUser()!.businessId,
        businessIds: selectedUser()!.businessIds || []
      };


      let userID  = selectedUser()!.id ||selectedUser()!.uid;
      // Use API adapter to update permissions
      devLog('📡 Calling usersApi.updatePermissions (API endpoint)...');
      await usersApi.updatePermissions(userID, updateData);
      devLog('✅ API call completed successfully (no direct Firebase update)');

      // Update local users list
      setUsers(prev => prev.map(u =>
        u.uid === selectedUser()!.uid ? selectedUser()! : u
      ));



      devLog('✅ User permissions saved successfully via API');
      setMessage({ type: 'success', text: 'User profile updated successfully via API (not direct Firebase)' });
    } catch (error) {
      console.error('❌ Error saving user profile via API:', error);
      setMessage({ type: 'error', text: 'Failed to save user profile via API endpoint' });
    } finally {
      setSaving(false);
    }
  };
  
  // Styles
  const containerStyle = {
    display: 'grid',
    'grid-template-columns': '350px 1fr',
    gap: '2rem',
    height: 'calc(100vh - 200px)'
  };
  
  const userListStyle = {
    'max-height': '100%',
    'overflow-y': 'auto',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius)',
    background: 'var(--surface-color)'
  };
  
  const userItemStyle = (isSelected: boolean) => ({
    padding: '1rem',
    'border-bottom': '1px solid var(--border-color)',
    cursor: 'pointer',
    background: isSelected ? 'var(--primary-color-light)' : 'transparent',
    transition: 'background 0.2s'
  });
  
  const searchStyle = {
    padding: '0.75rem',
    border: 'none',
    'border-bottom': '1px solid var(--border-color)',
    background: 'var(--surface-color)',
    width: '100%',
    'font-size': '1rem'
  };
  
  const permissionGridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1rem'
  };
  
  const storeGridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '0.75rem'
  };
  
  const checkboxStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    padding: '0.5rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    cursor: 'pointer',
    transition: 'all 0.2s'
  };
  
  const messageStyle = (type: 'success' | 'error') => ({
    padding: '1rem',
    'margin-bottom': '1rem',
    'border-radius': 'var(--border-radius)',
    background: type === 'success' ? '#d4edda' : '#f8d7da',
    color: type === 'success' ? '#155724' : '#721c24',
    border: `1px solid ${type === 'success' ? '#c3e6cb' : '#f5c6cb'}`
  });
  
  // Check if current user is admin
  const isCurrentUserAdmin = createMemo(() => {
    return authStore.state.profile?.isAdmin === true;
  });
  
  return (
    <Layout title="User Profile Administration">
      <Show 
        when={isCurrentUserAdmin()}
        fallback={
          <Card>
            <div style={{ 'text-align': 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              ⚠️ You need administrator privileges to access this page.
            </div>
          </Card>
        }
      >
        <div style={containerStyle}>
          {/* User List */}
          <div style={userListStyle}>
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm()}
              onInput={(e) => setSearchTerm(e.currentTarget.value)}
              style={searchStyle}
            />
            
            <Show 
              when={!loading()}
              fallback={
                <div style={{ padding: '2rem', 'text-align': 'center' }}>
                  Loading users...
                </div>
              }
            >
              <For each={filteredUsers()}>
                {(user) => (
                  <div
                    style={userItemStyle(selectedUser()?.uid === user.uid)}
                    onClick={() => {
                      devLog(user)
                      setSelectedUser(user)
                    }}
                  >
                    <div style={{ 'font-weight': '600' }}>{user.displayName || 'No Name'}</div>
                    <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                      {user.email}
                    </div>
                    <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', 'margin-top': '0.25rem' }}>
                      {user.permissions?.isAdmin && '👑 Admin • '}
                      {Object.values(user.stores || {}).filter(Boolean).length} stores
                    </div>
                  </div>
                )}
              </For>
            </Show>
          </div>
          
          {/* User Details */}
          <div>
            <Show 
              when={selectedUser()}
              fallback={
                <Card>
                  <div style={{ 'text-align': 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    Select a user to view and edit their profile
                  </div>
                </Card>
              }
            >
              <Show when={message()}>
                <div style={messageStyle(message()!.type)}>
                  {message()!.text}
                </div>
              </Show>
              
              <Card title="User Information" subtitle={selectedUser()!.email}>
                <div style={{ 'margin-bottom': '2rem' }}>
                  <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '1rem' }}>
                    <div>
                      <strong>Display Name:</strong> {selectedUser()!.displayName || 'Not set'}
                    </div>
                    <div>
                      <strong>UID:</strong> {selectedUser()!.uid}
                    </div>
                  </div>
                  <div>
                    <strong>Created:</strong> {new Date(selectedUser()!.createdAt?.toDate?.() || selectedUser()!.createdAt).toLocaleDateString()}
                  </div>
                </div>
                
                {/* Store Access */}
                <div style={{ 'margin-bottom': '2rem' }}>
                  <h3 style={{ 'margin-bottom': '1rem' }}>Store Access</h3>
                  <div style={storeGridStyle}>
                    <For each={stores()}>
                      {(store) => {
                        return (
                        <div
                          style={{
                            ...checkboxStyle,
                            background: selectedUser()!.stores?.[store?.id] ? 'var(--primary-color-light)' : 'transparent'
                          }}
                          onClick={() => toggleStoreAccess(store?.id)}
                        >
                          <input
                            type="checkbox"
                            checked={selectedUser()!.stores?.[store?.id] || false}
                            style={{ cursor: 'pointer' }}
                          />
                          <label style={{ cursor: 'pointer', 'user-select': 'none' }}>
                            {store?.name}
                          </label>
                        </div>
                      )}}
                    </For>
                  </div>
                  <div style={{ 'margin-top': '0.5rem', 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                    {false  && hasAnyStoreAccess() ? 
                      `Access to ${Object.values(selectedUser()!.stores).filter(Boolean).length} stores` :
                      'No store access granted'
                    }
                  </div>
                </div>
                
                {/* Business Access Section */}
                <div style={{ 'margin-bottom': '2rem' }}>
                  <h3 style={{ 'margin-bottom': '1rem' }}>Business Access</h3>
                  
                  {/* Primary Business ID */}
                  <div style={{ 'margin-bottom': '1rem' }}>
                    <label style={{ display: 'block', 'margin-bottom': '0.5rem', 'font-weight': '500' }}>
                      Primary Business ID
                    </label>
                    <select
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid var(--border-color)',
                        'border-radius': 'var(--border-radius-sm)',
                        background: 'var(--surface-color)'
                      }}
                      value={selectedUser()?.businessId}
                      onChange={(e) => updateBussinesAccess(e.currentTarget.value)}
                    >
                      <option value="all">{t('common.all', 'All')}</option>
                      <For each={availableBusinesses()}>
                        {(business) => <option value={business.id}>{business.name}</option>}
                      </For>
                    </select>
                  </div>
                  
                  {/* Multiple Business IDs */}
                  <div>
                    <label style={{ display: 'block', 'margin-bottom': '0.5rem', 'font-weight': '500' }}>
                      Additional Business Access
                    </label>
                    <div style={{ 
                      display: 'grid', 
                      'grid-template-columns': 'repeat(auto-fill, minmax(200px, 1fr))',
                      gap: '0.75rem' 
                    }}>
                      <For each={availableBusinesses()}>
                        {(business) => {
                          const isSelected = () => {
                            const businessIds = selectedUser()?.businessIds || [];
                            return businessIds.includes(business.id) || selectedUser()?.businessId === business.id;
                          };
                          
                          return (
                            <div
                              style={{
                                display: 'flex',
                                'align-items': 'center',
                                gap: '0.5rem',
                                padding: '0.5rem',
                                border: '1px solid var(--border-color)',
                                'border-radius': 'var(--border-radius-sm)',
                                cursor: 'pointer',
                                background: isSelected() ? 'var(--primary-color-light)' : 'transparent',
                                transition: 'all 0.2s'
                              }}
                              onClick={() => {
                                if (!selectedUser()) return;
                                const currentIds = selectedUser()!.businessIds || [];
                                const newIds = isSelected()
                                  ? currentIds.filter(id => id !== business.id)
                                  : [...currentIds, business.id];
                                
                                setSelectedUser(prev => ({
                                  ...prev!,
                                  businessIds: newIds
                                }));
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected()}
                                style={{ cursor: 'pointer' }}
                              />
                              <label style={{ cursor: 'pointer', 'user-select': 'none' }}>
                                {business.name}
                              </label>
                            </div>
                          );
                        }}
                      </For>
                    </div>
                    <div style={{ 'margin-top': '0.5rem', 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                      User can access data from all selected businesses
                    </div>
                  </div>
                </div>

                {/* Permissions - Grouped by Category */}
                <div style={{ 'margin-bottom': '2rem' }}>
                  <h3 style={{ 'margin-bottom': '1rem' }}>Permissions</h3>

                  {/* Quick Stats */}
                  <div style={{
                    display: 'flex',
                    gap: '1rem',
                    'margin-bottom': '1.5rem',
                    'flex-wrap': 'wrap'
                  }}>
                    <div style={{
                      padding: '0.5rem 1rem',
                      background: 'var(--primary-color-light)',
                      'border-radius': 'var(--border-radius-sm)',
                      'font-size': '0.875rem'
                    }}>
                      {PERMISSIONS.filter(p => selectedUser()?.permissions?.[p.key]).length} / {PERMISSIONS.length} permisos activos
                    </div>
                    <Show when={selectedUser()?.permissions?.isAdmin}>
                      <div style={{
                        padding: '0.5rem 1rem',
                        background: '#fef3c7',
                        color: '#92400e',
                        'border-radius': 'var(--border-radius-sm)',
                        'font-size': '0.875rem',
                        'font-weight': '600'
                      }}>
                        👑 Super Admin - Acceso Total
                      </div>
                    </Show>
                  </div>

                  {/* Permissions by Category */}
                  <For each={sortedCategories}>
                    {(categoryKey) => {
                      const category = PERMISSION_CATEGORIES[categoryKey];
                      const categoryPermissions = permissionsByCategory[categoryKey];
                      const activeCount = categoryPermissions.filter(p => selectedUser()?.permissions?.[p.key]).length;

                      return (
                        <div style={{
                          'margin-bottom': '1.5rem',
                          border: '1px solid var(--border-color)',
                          'border-radius': 'var(--border-radius)',
                          overflow: 'hidden'
                        }}>
                          {/* Category Header */}
                          <div style={{
                            display: 'flex',
                            'align-items': 'center',
                            'justify-content': 'space-between',
                            padding: '0.75rem 1rem',
                            background: categoryKey === 'admin' ? '#fef3c7' :
                                       categoryKey === 'tax' ? '#dbeafe' : 'var(--background-color)',
                            'border-bottom': '1px solid var(--border-color)'
                          }}>
                            <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                              <span style={{ 'font-size': '1.25rem' }}>{category.icon}</span>
                              <span style={{ 'font-weight': '600' }}>{category.labelEs}</span>
                            </div>
                            <span style={{
                              'font-size': '0.75rem',
                              padding: '0.25rem 0.5rem',
                              background: activeCount > 0 ? 'var(--primary-color)' : 'var(--text-muted)',
                              color: 'white',
                              'border-radius': '9999px'
                            }}>
                              {activeCount}/{categoryPermissions.length}
                            </span>
                          </div>

                          {/* Category Permissions */}
                          <div style={{
                            display: 'grid',
                            'grid-template-columns': 'repeat(auto-fill, minmax(280px, 1fr))',
                            gap: '0.5rem',
                            padding: '0.75rem'
                          }}>
                            <For each={categoryPermissions}>
                              {(permission) => (
                                <div
                                  style={{
                                    display: 'flex',
                                    'align-items': 'flex-start',
                                    gap: '0.5rem',
                                    padding: '0.5rem',
                                    border: '1px solid var(--border-color)',
                                    'border-radius': 'var(--border-radius-sm)',
                                    cursor: 'pointer',
                                    background: selectedUser()?.permissions?.[permission.key] ?
                                      (permission.key === 'isAdmin' ? '#fef3c7' : 'var(--primary-color-light)') :
                                      'transparent',
                                    transition: 'all 0.2s'
                                  }}
                                  onClick={() => togglePermission(permission.key)}
                                >
                                  <input
                                    type="checkbox"
                                    checked={!!selectedUser()?.permissions?.[permission.key]}
                                    style={{ cursor: 'pointer', 'margin-top': '2px' }}
                                  />
                                  <div style={{ flex: '1', cursor: 'pointer', 'user-select': 'none' }}>
                                    <div style={{
                                      display: 'flex',
                                      'align-items': 'center',
                                      gap: '0.25rem',
                                      'font-weight': '500',
                                      'font-size': '0.875rem'
                                    }}>
                                      <Show when={permission.icon}>
                                        <span>{permission.icon}</span>
                                      </Show>
                                      {permission.labelEs}
                                    </div>
                                    <div style={{ 'font-size': '0.7rem', color: 'var(--text-muted)', 'line-height': '1.3' }}>
                                      {permission.descriptionEs}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </For>
                          </div>
                        </div>
                      );
                    }}
                  </For>
                </div>

                {/* Status Location Permissions */}
                <div style={{ 'margin-bottom': '2rem' }}>
                  <h3 style={{ 'margin-bottom': '1rem' }}>HBL Status Location Permissions</h3>
                  <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'margin-bottom': '1rem' }}>
                    Control which status locations this user can update HBLs to
                  </div>
                  <div style={storeGridStyle}>
                    <For each={statusAllList}>
                      {(status) => (
                        <div
                          style={{
                            ...checkboxStyle,
                            background: selectedUser()!.statusLocationPermissions?.[status.id] ? 'var(--primary-color-light)' : 'transparent'
                          }}
                          onClick={() => toggleStatusLocationPermission(status.id)}
                        >
                          <input
                            type="checkbox"
                            checked={!!selectedUser()!.statusLocationPermissions?.[status.id]}
                            style={{ cursor: 'pointer' }}
                          />
                          <label style={{ cursor: 'pointer', 'user-select': 'none', 'font-size': '0.875rem' }}>
                            {status.label}
                          </label>
                        </div>
                      )}
                    </For>
                  </div>
                  <div style={{ 'margin-top': '0.5rem', 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                    {Object.values(selectedUser()!.statusLocationPermissions || {}).filter(Boolean).length} locations enabled
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '1rem', 'justify-content': 'flex-end' }}>
                  <Button
                    variant="secondary"
                    onClick={() => setSelectedUser(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={saveUserProfile}
                    disabled={saving()}
                  >
                    {saving() ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </Card>
            </Show>
          </div>
        </div>
      </Show>
    </Layout>
  );
};

export default UserProfileAdmin;








/**
 
create a motion to case dismiss pro se 
with this info, based on CAA i aplied for my i485 on 09/24/2025

as evidence to support, cuban passport, 485 receipts, 485 ASC biometric appoitment, I94, cuban birth certificate 

Roberto Pando Perez
 A: 244 704 645
 Dob: 09/12/1985
 4614 Andalusia Ln
 Louisville KY 40272



 Inmigration Court
Attn: Judge Kelly S Johnson
80 Monroe Ave, Garden LVL G-10
Memphis, TN 38103


Office of the Principal Legal Advisor
80 Monroe Ave, Suite 200
Memphis, TN 38103





 */