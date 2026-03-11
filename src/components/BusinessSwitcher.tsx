import { Component, createSignal, createMemo, onMount, Show, For } from 'solid-js';
import { authStore } from '../stores/authStore';
import Icon from './Icon';
import { businessApi } from '../services/apiAdapter';
import { devLog } from '../services/utils';

interface Business {
  id: string;
  name: string;
}

const BusinessSwitcher: Component = () => {
  const [isOpen, setIsOpen] = createSignal(false);
  const [availableBusinesses, setAvailableBusinesses] = createSignal<Business[]>([]);
  const [loading, setLoading] = createSignal(false);

  // Use authStore's reactive signal for businessId
  const currentBusinessId = () => authStore.businessIdSignal() || 'all';

  onMount(() => {
    loadBusinesses();
  });

  const loadBusinesses = async () => {
    try {
      setLoading(true);
      const businesses: Business[] = [];

      const userProfile = authStore.profile();
      if (userProfile) {
        // Always include 'all' option for admins
        if (userProfile.isAdmin) {
          businesses.push({ id: 'all', name: 'All Businesses' });

          // Load all active businesses from API
          try {
            const apiBusinesses = await businessApi.getBusinessByStatus(true);
            if (apiBusinesses && apiBusinesses.length > 0) {
              apiBusinesses.forEach((biz: any) => {
                businesses.push({ id: biz.id, name: biz.name });
              });
            }
          } catch (apiError) {
            console.error('Error loading businesses from API:', apiError);
          }
        } 
        /**
        else {
          // For regular users, only show their assigned businesses
          const userBusinessIds = userProfile.businessIds || [];
          if (userProfile.businessId && !userBusinessIds.includes(userProfile.businessId)) {
            userBusinessIds.push(userProfile.businessId);
          }

          // Load business details for each ID from API
          for (const bizId of userBusinessIds) {
            try {
              const bizData = await businessApi.getBusinessById(bizId);
              if (bizData) {
                businesses.push({ id: bizData.id, name: bizData.name });
              } else {
                // If not found in API, use ID as name
                businesses.push({ id: bizId, name: bizId });
              }
            } catch (apiErr) {
              console.error(`Error loading business ${bizId}:`, apiErr);
              businesses.push({ id: bizId, name: bizId });
            }
          }
        }
       */
      }

      setAvailableBusinesses(businesses);
    } catch (error) {
      console.error('Error loading businesses:', error);
      setAvailableBusinesses([
        { id: 'all', name: 'All Businesses' },
        { id: currentBusinessId(), name: currentBusinessId() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const currentBusiness = createMemo(() => {
    return availableBusinesses().find(b => b.id === currentBusinessId()) ||
           { id: currentBusinessId(), name: currentBusinessId() };
  });

  const canSwitchBusiness = createMemo(() => {
    const profile = authStore.profile();
    if (!profile) return false;

    // Admin can always switch
    if (profile.isAdmin) return true;

    // Regular users can switch if they have multiple businesses
    const businessIds = profile.businessIds || [];
    return businessIds.length > 1 || (businessIds.length === 1 && profile.businessId !== businessIds[0]);
  });

  // Session-only business switch - no Firebase update, no page reload
  const handleBusinessSwitch = (businessId: string) => {
    // Update the session signal in authStore (not persisted to Firebase)
    authStore.setBusinessId(businessId);

    // Update local display
    setIsOpen(false);

    devLog(`📊 Switched to business: ${businessId} (session only)`);
  };

  // Don't show switcher if user can't switch
  if (!canSwitchBusiness()) return null;

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen())}
        disabled={loading()}
        style={{
          display: 'flex',
          'align-items': 'center',
          gap: '0.5rem',
          padding: '0.4rem 0.75rem',
          border: '1px solid #e8eaed',
          'border-radius': '20px',
          background: '#f8f9fa',
          cursor: loading() ? 'not-allowed' : 'pointer',
          'font-size': '0.8rem',
          transition: 'all 0.2s',
          opacity: loading() ? 0.6 : 1,
          color: '#202124',
        }}
      >
        <Icon name="business" size="0.9rem" />
        <span style={{ 'font-weight': '500', 'max-width': '120px', overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' }}>
          {currentBusiness().name}
        </span>
        <Icon name={isOpen() ? 'chevron-up' : 'chevron-down'} size="0.75rem" />
      </button>

      <Show when={isOpen()}>
        <div style={{
          position: 'absolute',
          top: '100%',
          right: '0',
          'margin-top': '0.5rem',
          background: 'white',
          border: '1px solid #e8eaed',
          'border-radius': '8px',
          'box-shadow': '0 4px 12px rgba(0,0,0,0.15)',
          'min-width': '220px',
          'z-index': 1000
        }}>
          <div style={{ padding: '0.5rem' }}>
            <div style={{
              padding: '0.5rem 0.75rem',
              'font-size': '0.7rem',
              color: '#5f6368',
              'border-bottom': '1px solid #e8eaed',
              'margin-bottom': '0.5rem',
              'text-transform': 'uppercase',
              'letter-spacing': '0.5px'
            }}>
              Switch Business (Session)
            </div>

            <For each={availableBusinesses()}>
              {(business) => (
                <button
                  onClick={() => handleBusinessSwitch(business.id)}
                  disabled={business.id === currentBusinessId()}
                  style={{
                    display: 'flex',
                    'align-items': 'center',
                    'justify-content': 'space-between',
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    border: 'none',
                    background: business.id === currentBusinessId() ? '#e8f0fe' : 'transparent',
                    'border-radius': '6px',
                    cursor: business.id === currentBusinessId() ? 'default' : 'pointer',
                    'text-align': 'left',
                    transition: 'background 0.15s',
                    'font-size': '0.85rem',
                    color: business.id === currentBusinessId() ? '#1a73e8' : '#202124',
                    'font-weight': business.id === currentBusinessId() ? '500' : '400',
                  }}
                  onMouseEnter={(e) => {
                    if (business.id !== currentBusinessId()) {
                      e.currentTarget.style.background = '#f1f3f4';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (business.id !== currentBusinessId()) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <span>{business.name}</span>
                  <Show when={business.id === currentBusinessId()}>
                    <Icon name="check" size="0.9rem" style={{ color: '#1a73e8' }} />
                  </Show>
                </button>
              )}
            </For>

            {/* Session indicator */}
            <div style={{
              'margin-top': '0.5rem',
              'padding-top': '0.5rem',
              'border-top': '1px solid #e8eaed',
              'font-size': '0.65rem',
              color: '#9aa0a6',
              'text-align': 'center',
            }}>
              Changes apply to this session only
            </div>
          </div>
        </div>
      </Show>

      {/* Click outside to close */}
      <Show when={isOpen()}>
        <div
          style={{
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            'z-index': 999
          }}
          onClick={() => setIsOpen(false)}
        />
      </Show>
    </div>
  );
};

export default BusinessSwitcher;
