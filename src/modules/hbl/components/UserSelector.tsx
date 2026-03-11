import { Component, createSignal, For, Show, onMount } from 'solid-js';
import { authStore } from '../../../stores/authStore';
import { usersApi } from '../../../services/apiAdapter';
import { devLog } from '../../../services/utils';

export interface SelectedUser {
  userId: string;
  name: string;
  email: string;
}

interface UserSelectorProps {
  onUserSelected: (user: SelectedUser | null) => void;
  selectedUser?: SelectedUser | null;
}

interface UserFromApi {
  uid: string;
  email: string;
  displayName?: string;
}

/**
 * Component to select a user for attribution (who scanned the HBL)
 */
const UserSelector: Component<UserSelectorProps> = (props) => {
  const [manualEntry, setManualEntry] = createSignal(false);
  const [manualName, setManualName] = createSignal('');
  const [manualEmail, setManualEmail] = createSignal('');
  const [hasAutoSelected, setHasAutoSelected] = createSignal(false);
  const [showUserList, setShowUserList] = createSignal(false);
  const [usersList, setUsersList] = createSignal<UserFromApi[]>([]);
  const [loadingUsers, setLoadingUsers] = createSignal(false);
  const [userSearchQuery, setUserSearchQuery] = createSignal('');

  // Get current user as default option
  const currentUser = () => {
    const user = authStore.currentUser;
    const profile = authStore.state?.profile;

    if (user) {
      return {
        userId: user.uid,
        name: user.displayName || profile?.name || 'Current User',
        email: user.email || ''
      };
    }
    return null;
  };

  // Check if current user is admin
  const isAdmin = () => authStore.isAdmin();

  // Load users list for admin
  const loadUsers = async () => {
    if (!isAdmin()) return;

    try {
      setLoadingUsers(true);
      const users = await usersApi.getAll();
      setUsersList(users);
    } catch (error) {
      devLog('Error loading users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Auto-select current user ONLY on mount if no user is selected
  onMount(() => {
    if (!props.selectedUser && currentUser() && !hasAutoSelected()) {
      props.onUserSelected(currentUser());
      setHasAutoSelected(true);
    }

    // Load users if admin
    if (isAdmin()) {
      loadUsers();
    }
  });

  const handleUseCurrentUser = () => {
    setManualEntry(false);
    setShowUserList(false);
    props.onUserSelected(currentUser());
  };

  const handleManualEntry = () => {
    setManualEntry(true);
    setShowUserList(false);
    props.onUserSelected(null);
  };

  const handleShowUserList = () => {
    setShowUserList(true);
    setManualEntry(false);
    setUserSearchQuery('');
    props.onUserSelected(null);
  };

  // Filter users based on search query
  const filteredUsers = () => {
    const query = userSearchQuery().toLowerCase().trim();
    if (!query) return usersList();

    return usersList().filter(user => {
      const name = (user.displayName || '').toLowerCase();
      const email = (user.email || '').toLowerCase();
      return name.includes(query) || email.includes(query);
    });
  };

  const handleSelectFromList = (user: UserFromApi) => {
    props.onUserSelected({
      userId: user.uid,
      name: user.displayName || user.email || 'Unknown User',
      email: user.email || ''
    });
    setShowUserList(false);
  };

  const handleManualSubmit = () => {
    if (manualName().trim()) {
      props.onUserSelected({
        userId: `manual_${Date.now()}`,
        name: manualName().trim(),
        email: manualEmail().trim()
      });
      setManualEntry(false);
    }
  };

  const handleChangeUser = () => {
    setManualEntry(false);
    setShowUserList(false);
    setManualName('');
    setManualEmail('');
    props.onUserSelected(null);
  };

  const containerStyle = {
    padding: '1rem',
    background: '#f8f9fa',
    'border-radius': '8px',
    border: '1px solid #dee2e6'
  };

  const labelStyle = {
    display: 'block',
    'font-weight': '600',
    'margin-bottom': '0.5rem',
    color: '#212529',
    'font-size': '0.9rem'
  };

  const inputStyle = {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid #ced4da',
    'border-radius': '4px',
    'font-size': '0.9rem',
    'margin-bottom': '0.5rem'
  };

  const buttonStyle = (variant: 'primary' | 'secondary' | 'outline') => ({
    padding: '0.5rem 1rem',
    border: variant === 'outline' ? '1px solid #007bff' : 'none',
    'border-radius': '4px',
    'font-size': '0.85rem',
    cursor: 'pointer',
    background: variant === 'primary' ? '#007bff' : variant === 'secondary' ? '#6c757d' : 'white',
    color: variant === 'outline' ? '#007bff' : 'white',
    transition: 'all 0.2s ease'
  });

  const selectedBoxStyle = {
    padding: '0.75rem',
    background: '#e8f5e9',
    border: '1px solid #c8e6c9',
    'border-radius': '6px',
    'margin-top': '0.5rem'
  };

  return (
    <div style={containerStyle}>
      <label style={labelStyle}>
        👤 Scanned By (User Attribution)
      </label>

      <Show when={!props.selectedUser && !manualEntry() && !showUserList()}>
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          'flex-wrap': 'wrap',
          'margin-top': '0.5rem'
        }}>
          <Show when={currentUser()}>
            <button
              style={buttonStyle('primary')}
              onClick={handleUseCurrentUser}
            >
              Use Current User ({currentUser()?.name})
            </button>
          </Show>
          <Show when={isAdmin()}>
            <button
              style={buttonStyle('primary')}
              onClick={handleShowUserList}
            >
              Select from Users
            </button>
          </Show>
          <button
            style={buttonStyle('secondary')}
            onClick={handleManualEntry}
          >
            Enter Manually
          </button>
        </div>
      </Show>

      <Show when={manualEntry()}>
        <div style={{ 'margin-top': '0.5rem' }}>
          <div style={{ 'margin-bottom': '0.5rem' }}>
            <label style={{ 'font-size': '0.85rem', 'font-weight': '500', display: 'block', 'margin-bottom': '0.25rem' }}>
              Name *
            </label>
            <input
              type="text"
              style={inputStyle}
              placeholder="Enter full name..."
              value={manualName()}
              onInput={(e) => setManualName(e.currentTarget.value)}
              autofocus
            />
          </div>
          <div style={{ 'margin-bottom': '0.5rem' }}>
            <label style={{ 'font-size': '0.85rem', 'font-weight': '500', display: 'block', 'margin-bottom': '0.25rem' }}>
              Email (Optional)
            </label>
            <input
              type="email"
              style={inputStyle}
              placeholder="Enter email address..."
              value={manualEmail()}
              onInput={(e) => setManualEmail(e.currentTarget.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', 'margin-top': '0.75rem' }}>
            <button
              style={{
                ...buttonStyle('primary'),
                opacity: !manualName().trim() ? 0.5 : 1
              }}
              onClick={handleManualSubmit}
              disabled={!manualName().trim()}
            >
              ✓ Confirm
            </button>
            <button
              style={buttonStyle('outline')}
              onClick={() => {
                setManualEntry(false);
                setManualName('');
                setManualEmail('');
              }}
            >
              ✕ Cancel
            </button>
          </div>
        </div>
      </Show>

      <Show when={showUserList()}>
        <div style={{ 'margin-top': '0.5rem' }}>
          <div style={{ 'margin-bottom': '0.5rem' }}>
            <label style={{ 'font-size': '0.85rem', 'font-weight': '500', display: 'block', 'margin-bottom': '0.5rem' }}>
              Select a User
            </label>

            {/* Search Input */}
            <div style={{ 'margin-bottom': '0.75rem', position: 'relative' }}>
              <input
                type="text"
                style={{
                  ...inputStyle,
                  'margin-bottom': '0',
                  'padding-left': '2.25rem'
                }}
                placeholder="🔍 Search by name or email..."
                value={userSearchQuery()}
                onInput={(e) => setUserSearchQuery(e.currentTarget.value)}
                autofocus
              />
              <span style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#6c757d',
                'font-size': '0.9rem'
              }}>
                🔍
              </span>
              <Show when={userSearchQuery()}>
                <button
                  style={{
                    position: 'absolute',
                    right: '0.5rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#6c757d',
                    'font-size': '1rem',
                    padding: '0.25rem'
                  }}
                  onClick={() => setUserSearchQuery('')}
                  title="Clear search"
                >
                  ✕
                </button>
              </Show>
            </div>

            {/* Results count */}
            <div style={{
              'font-size': '0.8rem',
              color: '#6c757d',
              'margin-bottom': '0.5rem'
            }}>
              {userSearchQuery()
                ? `${filteredUsers().length} of ${usersList().length} users`
                : `${usersList().length} users`}
            </div>

            <Show when={loadingUsers()} fallback={
              <div style={{
                'max-height': '250px',
                'overflow-y': 'auto',
                border: '1px solid #ced4da',
                'border-radius': '4px',
                background: 'white'
              }}>
                <For each={filteredUsers()}>
                  {(user) => {
                    const query = userSearchQuery().toLowerCase();
                    const name = user.displayName || 'No Name';
                    const email = user.email || '';

                    return (
                      <div
                        style={{
                          padding: '0.75rem',
                          'border-bottom': '1px solid #e9ecef',
                          cursor: 'pointer',
                          transition: 'background 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#f8f9fa'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                        onClick={() => handleSelectFromList(user)}
                      >
                        <div style={{ 'font-weight': '500', 'margin-bottom': '0.25rem' }}>
                          {name}
                        </div>
                        <div style={{ 'font-size': '0.85rem', color: '#6c757d' }}>
                          {email}
                        </div>
                      </div>
                    );
                  }}
                </For>
                <Show when={filteredUsers().length === 0 && userSearchQuery()}>
                  <div style={{ padding: '1rem', 'text-align': 'center', color: '#6c757d' }}>
                    <div style={{ 'margin-bottom': '0.5rem' }}>🔍</div>
                    No users found matching "{userSearchQuery()}"
                  </div>
                </Show>
                <Show when={usersList().length === 0 && !userSearchQuery()}>
                  <div style={{ padding: '1rem', 'text-align': 'center', color: '#6c757d' }}>
                    No users found
                  </div>
                </Show>
              </div>
            }>
              <div style={{ padding: '1rem', 'text-align': 'center' }}>
                Loading users...
              </div>
            </Show>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', 'margin-top': '0.75rem' }}>
            <button
              style={buttonStyle('outline')}
              onClick={() => {
                setShowUserList(false);
                setUserSearchQuery('');
              }}
            >
              ✕ Cancel
            </button>
          </div>
        </div>
      </Show>

      <Show when={props.selectedUser}>
        <div style={selectedBoxStyle}>
          <div style={{
            display: 'flex',
            'justify-content': 'space-between',
            'align-items': 'flex-start',
            'margin-bottom': '0.5rem'
          }}>
            <div style={{ 'font-weight': '600', color: '#2e7d32' }}>
              ✓ Selected User
            </div>
            <button
              style={{
                ...buttonStyle('outline'),
                'margin-top': '0',
                padding: '0.25rem 0.75rem',
                'font-size': '0.8rem'
              }}
              onClick={handleChangeUser}
            >
              🔄 Change
            </button>
          </div>
          <div style={{ 'font-size': '0.9rem' }}>
            <div style={{ 'margin-bottom': '0.25rem' }}>
              <strong>Name:</strong> {props.selectedUser?.name}
            </div>
            <Show when={props.selectedUser?.email}>
              <div style={{ 'margin-bottom': '0.25rem' }}>
                <strong>Email:</strong> {props.selectedUser?.email}
              </div>
            </Show>
            <div style={{
              'font-size': '0.75rem',
              color: '#6c757d',
              'margin-top': '0.5rem',
              'padding-top': '0.5rem',
              'border-top': '1px solid #c8e6c9'
            }}>
              User ID: {props.selectedUser?.userId}
            </div>
          </div>
        </div>
      </Show>

      <div style={{
        'margin-top': '0.75rem',
        'font-size': '0.75rem',
        color: '#6c757d'
      }}>
        💡 This user will be recorded as who scanned these HBLs
      </div>
    </div>
  );
};

export default UserSelector;
