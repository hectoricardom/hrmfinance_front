import { Component, createSignal, onMount, For, Show } from 'solid-js';
import { Layout, Card, Button, FormInput, Modal } from '../ui';
import { authStore } from '../../stores/authStore';
import { businessApi } from '../../services/apiAdapter';
import Icon from '../../components/Icon';

interface Business {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

const BusinessManagement: Component = () => {
  const [businesses, setBusinesses] = createSignal<Business[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [showModal, setShowModal] = createSignal(false);
  const [editingBusiness, setEditingBusiness] = createSignal<Business | null>(null);
  const [formData, setFormData] = createSignal({
    id: '',
    name: '',
    description: ''
  });
  const [errors, setErrors] = createSignal<{[key: string]: string}>({});
  const [message, setMessage] = createSignal<{ type: 'success' | 'error', text: string } | null>(null);

  onMount(() => {
    loadBusinesses();
  });

  const loadBusinesses = async () => {
    try {
      setLoading(true);
      const businessList = await businessApi.getAllBusiness();

      // Add default businesses if they don't exist
      const defaultBusinesses = [
        { id: 'YB100423253156428', name: 'YABA' },
        { id: 'SS695841584167881', name: 'Stephanie S' },
        { id: 'JJCM23753J15918M', name: 'GUANCHO' },
        { id: 'LMR470531564CT28', name: 'LUISCUETO' }
      ];

      for (const defaultBiz of defaultBusinesses) {
        if (!businessList.find(b => b.id === defaultBiz.id)) {
          businessList.push({
            id: defaultBiz.id,
            name: defaultBiz.name,
            description: 'Default business',
            isActive: true,
            createdAt: new Date().toISOString(),
            createdBy: 'system',
            updatedAt: new Date().toISOString()
          });
        }
      }

      setBusinesses(businessList);
    } catch (error) {
      console.error('Error loading businesses:', error);
      setMessage({ type: 'error', text: 'Failed to load businesses' });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};
    const data = formData();

    if (!data.id.trim()) {
      newErrors.id = 'Business ID is required';
    } else if (!/^[A-Z0-9]{10,20}$/.test(data.id)) {
      newErrors.id = 'Business ID must be 10-20 characters, uppercase letters and numbers only';
    }

    if (!data.name.trim()) {
      newErrors.name = 'Business name is required';
    }

    // Check for duplicate ID when creating new
    if (!editingBusiness() && businesses().find(b => b.id === data.id)) {
      newErrors.id = 'Business ID already exists';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      setMessage(null);
      const data = formData();
      const currentUser = authStore.state.user;

      if (editingBusiness()) {
        // Update existing
        await businessApi.updateBusiness(editingBusiness()!.id, {
          name: data.name,
          description: data.description,
          updatedAt: new Date().toISOString()
        });
        setMessage({ type: 'success', text: 'Business updated successfully' });
      } else {
        // Create new
        await businessApi.addBusiness({
          id: data.id,
          name: data.name,
          description: data.description,
          isActive: true,
          createdAt: new Date().toISOString(),
          createdBy: currentUser?.uid || 'unknown',
          updatedAt: new Date().toISOString()
        });
        setMessage({ type: 'success', text: 'Business created successfully' });
      }

      await loadBusinesses();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving business:', error);
      setMessage({
        type: 'error',
        text: editingBusiness() ? 'Failed to update business' : 'Failed to create business'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (business: Business) => {
    setEditingBusiness(business);
    setFormData({
      id: business.id,
      name: business.name,
      description: business.description || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (business: Business) => {
    if (!confirm(`Are you sure you want to delete "${business.name}"?`)) return;

    try {
      setLoading(true);
      await businessApi.deleteBusiness(business.id);
      setMessage({ type: 'success', text: 'Business deleted successfully' });
      await loadBusinesses();
    } catch (error) {
      console.error('Error deleting business:', error);
      setMessage({ type: 'error', text: 'Failed to delete business' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (business: Business) => {
    try {
      setLoading(true);
      await businessApi.updateBusiness(business.id, {
        isActive: !business.isActive,
        updatedAt: new Date().toISOString()
      });
      setMessage({
        type: 'success',
        text: `Business ${business.isActive ? 'deactivated' : 'activated'} successfully`
      });
      await loadBusinesses();
    } catch (error) {
      console.error('Error toggling business status:', error);
      setMessage({ type: 'error', text: 'Failed to update business status' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    setEditingBusiness(null);
    setFormData({ id: '', name: '', description: '' });
    setErrors({});
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingBusiness(null);
    setErrors({});
  };

  // Check if current user is admin
  const isCurrentUserAdmin = () => {
    return authStore.state.profile?.isAdmin === true;
  };

  return (
    <Layout title="Business Management">
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
        <div style={{ padding: '2rem', 'max-width': '1200px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ 'margin-bottom': '2rem' }}>
            <h1 style={{ 'font-size': '2rem', 'font-weight': '700', color: 'var(--text-primary)' }}>
              Business Management
            </h1>
            <p style={{ color: 'var(--text-muted)', 'font-size': '1.125rem' }}>
              Manage business IDs and their configurations
            </p>
          </div>

          {/* Controls */}
          <div style={{ 
            display: 'flex', 
            'justify-content': 'flex-end', 
            'margin-bottom': '2rem'
          }}>
            <Button 
              onClick={handleOpenModal} 
              variant="primary"
              disabled={loading()}
            >
              <Icon name="add" size="1em" style={{ 'margin-right': '0.5rem' }} />
              Create New Business
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

          {/* Business List */}
          <Card>
            <div style={{ padding: '1.5rem' }}>
              <Show when={loading()} fallback={
                <Show when={businesses().length > 0} fallback={
                  <div style={{ 'text-align': 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No businesses found. Create your first business.
                  </div>
                }>
                  <div style={{ 'overflow-x': 'auto' }}>
                    <table style={{ width: '100%', 'border-collapse': 'collapse' }}>
                      <thead>
                        <tr style={{ 'border-bottom': '2px solid var(--border-color)' }}>
                          <th style={{ padding: '1rem', 'text-align': 'left' }}>Business ID</th>
                          <th style={{ padding: '1rem', 'text-align': 'left' }}>Name</th>
                          <th style={{ padding: '1rem', 'text-align': 'left' }}>Description</th>
                          <th style={{ padding: '1rem', 'text-align': 'center' }}>Status</th>
                          <th style={{ padding: '1rem', 'text-align': 'left' }}>Created</th>
                          <th style={{ padding: '1rem', 'text-align': 'center' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        <For each={businesses()}>
                          {(business) => (
                            <tr style={{ 'border-bottom': '1px solid var(--border-light)' }}>
                              <td style={{ padding: '1rem', 'font-family': 'monospace' }}>{business.id}</td>
                              <td style={{ padding: '1rem', 'font-weight': '500' }}>{business.name}</td>
                              <td style={{ padding: '1rem' }}>{business.description || '-'}</td>
                              <td style={{ padding: '1rem', 'text-align': 'center' }}>
                                <span style={{
                                  padding: '0.25rem 0.5rem',
                                  'border-radius': '4px',
                                  'font-size': '0.875rem',
                                  background: business.isActive ? 'var(--success-light)' : 'var(--error-light)',
                                  color: business.isActive ? 'var(--success-dark)' : 'var(--error-dark)'
                                }}>
                                  {business.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td style={{ padding: '1rem', 'font-size': '0.875rem' }}>
                                {new Date(business.createdAt).toLocaleDateString()}
                              </td>
                              <td style={{ padding: '1rem', 'text-align': 'center' }}>
                                <div style={{ display: 'flex', gap: '0.5rem', 'justify-content': 'center' }}>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => handleEdit(business)}
                                  >
                                    <Icon name="edit" size="0.875rem" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => handleToggleStatus(business)}
                                  >
                                    <Icon name={business.isActive ? 'close' : 'check'} size="0.875rem" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => handleDelete(business)}
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
                  <p>Loading businesses...</p>
                </div>
              </Show>
            </div>
          </Card>

          {/* Create/Edit Modal */}
          <Modal 
            isOpen={showModal()} 
            onClose={handleCloseModal}
            size="medium"
          >
            <div style={{ padding: '2rem' }}>
              <h2 style={{ 'margin-bottom': '1.5rem' }}>
                {editingBusiness() ? 'Edit Business' : 'Create New Business'}
              </h2>

              <div style={{ display: 'flex', 'flex-direction': 'column', gap: '1rem' }}>
                <FormInput
                  label="Business ID *"
                  value={formData().id}
                  onChange={(value) => setFormData(prev => ({ ...prev, id: value.toUpperCase() }))}
                  placeholder="e.g., YB100423253156428"
                  disabled={!!editingBusiness()}
                  error={errors().id}
                />
                
                <FormInput
                  label="Business Name *"
                  value={formData().name}
                  onChange={(value) => setFormData(prev => ({ ...prev, name: value }))}
                  placeholder="e.g., YABA Express"
                  error={errors().name}
                />
                
                <FormInput
                  label="Description"
                  value={formData().description}
                  onChange={(value) => setFormData(prev => ({ ...prev, description: value }))}
                  placeholder="Optional description"
                  multiline={true}
                  rows={3}
                />

                <div style={{ 
                  'margin-top': '0.5rem',
                  padding: '1rem',
                  background: 'var(--bg-secondary)',
                  'border-radius': 'var(--border-radius)',
                  'font-size': '0.875rem'
                }}>
                  <strong>Business ID Guidelines:</strong>
                  <ul style={{ margin: '0.5rem 0 0 1rem' }}>
                    <li>Must be 10-20 characters long</li>
                    <li>Use only uppercase letters and numbers</li>
                    <li>Cannot be changed after creation</li>
                    <li>Must be unique across the system</li>
                  </ul>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ 
                display: 'flex', 
                gap: '1rem', 
                'justify-content': 'flex-end',
                'margin-top': '1.5rem'
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
                  {loading() ? 'Saving...' : (editingBusiness() ? 'Update' : 'Create')}
                </Button>
              </div>
            </div>
          </Modal>
        </div>
      </Show>
    </Layout>
  );
};

export default BusinessManagement;