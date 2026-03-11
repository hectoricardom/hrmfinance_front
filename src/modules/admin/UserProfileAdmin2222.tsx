import { Component, createSignal, createMemo, For, Show, onMount } from 'solid-js';
import { Layout } from '../ui';
import { Card } from '../ui';
import { Button } from '../ui';
import { useTranslation } from '../../translations';
import { db, doc, getDoc } from '../../services/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { authStore } from '../../stores/authStore';
import { inventoryStore } from '../inventory';
import Icon from '../../components/Icon';
import { usersApi } from '../../services/apiAdapter';

interface UserProfile2 {
  uid: string;
  email: string;
}

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  createdAt: any;
  stores: Record<string, boolean>;
  AccountAccess: boolean;
  BankingAccess: boolean;
  InventoryAccess: boolean;
  EmployeeAccess: boolean;
  invoiceAccess: boolean;
  JournalAccess: boolean;
  HBLAccess: boolean;
  HBLAccessManagement:boolean;
  PurchaseRequestAccess: boolean;
  PassportAccess: boolean;
  AdminPassportAccess: boolean;
  RemittanceAccess: boolean;
  NotaryAccess: boolean;
  offersManagementAccess: boolean;
  inventoryDownsection: boolean;
  onlyRead: boolean;
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

  // Permission configuration
  const permissions = [
    { key: 'AccountAccess', label: 'Account Access', description: 'Access to accounting features' },
    { key: 'BankingAccess', label: 'Banking Access', description: 'Access to banking operations' },
    { key: 'InventoryAccess', label: 'Inventory Access', description: 'Access to inventory management' },
    { key: 'EmployeeAccess', label: 'Employee Access', description: 'Access to employee management and timesheets' },
    { key: 'JournalAccess', label: 'Journal Access', description: 'Access to journal entries' },
    { key: 'invoiceAccess', label: 'Invoice Access', description: 'Access to Invoices' },
    { key: 'RemittanceAccess', label: 'Remittance Access', description: 'Access to remittances management' },
    { key: 'HBLAccess', label: 'HBL Access', description: 'Access to HBL management' },
    { key: 'PassportAccess', label: 'Passport Access', description: 'Access to passport applications' },
    { key: 'inventoryDownsection', label: 'Inventory Downsection', description: 'Access to inventory downsection' },
    { key: 'onlyRead', label: 'Read Only', description: 'Limited to read-only access' },
    { key: 'PurchaseRequestAccess', label: 'Purchase Request Access', description: 'Access to Purchase management' },
    { key: 'read_write', label: 'Read/Write', description: 'Full read and write permissions' },
    { key: 'AdminPassportAccess', label: 'Passport Admin Access',description:'Access to passport applications' },
    { key: 'HBLAccessManagement', label: 'HBL Managements Access', description: 'Access to HBL management' },
    { key: 'NotaryAccess', label: 'Notary Access', description: 'Access to notary customer management' },
    { key: 'offersManagementAccess', label: 'YABA Offers Management', description: 'Access to manage YABA shipping offers configurations' },


    { key: 'isAdmin', label: 'Administrator', description: 'Full system administration rights' }
  ];
  
  // 06/13/

  let nw: any = {
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
    "businessId": "YB100423253156428",
    "AccountAccess":false,
    "BankingAccess":false,
    "InventoryAccess":false,
    "EmployeeAccess":false,
    "JournalAccess":false,
    "invoiceAccess": false,
    "PurchaseRequestAccess": false,
    "RemittanceAccess":false,
    "HBLAccess":false,
    "PassportAccess":false,
    "NotaryAccess":false,
    "offersManagementAccess":false,
    "inventoryDownsection":false,
    "onlyRead":false,
    "read_write":false
 }



  // Load available businesses from Firestore
  const loadBusinesses = async () => {
    try {
      const businessesCollection = collection(db, 'businesses');
      const q = query(businessesCollection, orderBy('name'));
      const querySnapshot = await getDocs(q);
      
      const businessList: Array<{id: string, name: string}> = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.isActive) {
          businessList.push({ id: doc.id, name: data.name });
        }
      });
      
      // Add default businesses if not in Firestore
      const defaultBusinesses = [
        { id: "SS695841584167881", name: "Stephanie S" },
        { id: "YB100423253156428", name: "YABA" },
        { id: "JJCM23753J15918M", name: "GUANCHO" },
        { id: "LMR470531564CT28", name: "LUISCUETO" },
      ];
      
      for (const defaultBiz of defaultBusinesses) {
        if (!businessList.find(b => b.id === defaultBiz.id)) {
          businessList.push(defaultBiz);
        }
      }
      
      setAvailableBusinesses(businessList);
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
  
  // Load all users from server
  const loadUsers = async () => {
    try {
      setLoading(true);
      devLog('📥 Loading users via API...');

      // Use the API adapter to fetch users from server
      const usersList = await usersApi.getAll();

      // Ensure all users have the required properties
      const normalizedUsers = usersList.map((user: any) => {
        let normalizedUser: any = { uid: user.uid, ...user };

        // Fill in missing properties with defaults
        Object.keys(nw).forEach(key => {
          if (!normalizedUser.hasOwnProperty(key)) {
            normalizedUser[key] = nw[key];
          }
        });

        return normalizedUser as UserProfile;
      });

      devLog(`✅ Loaded ${normalizedUsers.length} users from server`);
      setUsers(normalizedUsers);
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
const selectUser = async (uid: string) => {
  const userDocRef = doc(db, 'users', uid);
  const userDocSnap = await getDoc(userDocRef);
  
  if (userDocSnap.exists()) {

    devLog(userDocSnap.data());
    // setSelectedUser(userDocSnap.data())
  }

  //
};


  
  // Handle permission toggle
  const togglePermission = (key: string) => {
    if (!selectedUser()) return;
    
    setSelectedUser(prev => ({
      ...prev!,
      [key]: !prev![key as keyof UserProfile]
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

      // Prepare permissions object
      const permissions = {
        stores: selectedUser()!.stores,
        AccountAccess: selectedUser()!.AccountAccess,
        BankingAccess: selectedUser()!.BankingAccess,
        InventoryAccess: selectedUser()!.InventoryAccess,
        EmployeeAccess: selectedUser()!.EmployeeAccess,
        invoiceAccess: selectedUser()!.invoiceAccess,
        JournalAccess: selectedUser()!.JournalAccess,
        PassportAccess: selectedUser()!.PassportAccess,
        inventoryDownsection: selectedUser()!.inventoryDownsection,
        PurchaseRequestAccess: selectedUser()!.PurchaseRequestAccess,
        onlyRead: selectedUser()!.onlyRead,
        AdminPassportAccess: selectedUser()!.AdminPassportAccess || false,
        HBLAccessManagement: selectedUser()!.HBLAccessManagement || false,
        HBLAccess: selectedUser()!.HBLAccess || false,
        NotaryAccess: selectedUser()!.NotaryAccess || false,
        RemittanceAccess: selectedUser()!.RemittanceAccess || false,
        offersManagementAccess: selectedUser()!.offersManagementAccess || false,
        AppointmentAccess: (selectedUser() as any).AppointmentAccess || false,
        read_write: selectedUser()!.read_write,
        businessId: selectedUser()!.businessId,
        businessIds: selectedUser()!.businessIds || [],
        isAdmin: selectedUser()!.isAdmin || false
      };

      // Use API adapter to update permissions
      await usersApi.updatePermissions(selectedUser()!.uid, permissions);

      // Update local users list
      setUsers(prev => prev.map(u =>
        u.uid === selectedUser()!.uid ? selectedUser()! : u
      ));

      devLog('✅ User permissions saved successfully');
      setMessage({ type: 'success', text: 'User profile updated successfully via server' });
    } catch (error) {
      console.error('❌ Error saving user profile:', error);
      setMessage({ type: 'error', text: 'Failed to save user profile on server' });
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
                    onClick={() => setSelectedUser(user)}
                  >
                    <div style={{ 'font-weight': '600' }}>{user.displayName || 'No Name'}</div>
                    <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                      {user.email}
                    </div>
                    <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', 'margin-top': '0.25rem' }}>
                      {user.isAdmin && '👑 Admin • '}
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

                {/* Permissions */}
                <div style={{ 'margin-bottom': '2rem' }}>
                  <h3 style={{ 'margin-bottom': '1rem' }}>Permissions</h3>
                  <div style={permissionGridStyle}>
                    <For each={permissions}>
                      {(permission) => (
                        <div
                          style={{
                            ...checkboxStyle,
                            background: selectedUser()![permission.key as keyof UserProfile] ? 'var(--primary-color-light)' : 'transparent'
                          }}
                          onClick={() => togglePermission(permission.key)}
                        >
                          <input
                            type="checkbox"
                            checked={!!selectedUser()![permission.key as keyof UserProfile]}
                            style={{ cursor: 'pointer' }}
                          />
                          <div style={{ flex: '1', cursor: 'pointer', 'user-select': 'none' }}>
                            <div style={{ 'font-weight': '500' }}>{permission.label}</div>
                            <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                              {permission.description}
                            </div>
                          </div>
                        </div>
                      )}
                    </For>
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