import { Component, createSignal, Show } from 'solid-js';
import { RemittanceData } from '../types/remittanceTypes';
import RemittanceList from './RemittanceList';
import RemittanceDetail from './RemittanceDetail';
import EditableRemittanceForm from './EditableRemittanceForm';
import { authStore } from '../../../stores/authStore';

type ViewMode = 'list' | 'create' | 'edit' | 'view';

const RemittanceDashboard: Component = () => {
  const [currentView, setCurrentView] = createSignal<ViewMode>('list');
  const [selectedRemittance, setSelectedRemittance] = createSignal<RemittanceData | null>(null);
  const [refreshKey, setRefreshKey] = createSignal(0);

  // Navigation handlers
  const showList = () => {
    setCurrentView('list');
    setSelectedRemittance(null);
    setRefreshKey(prev => prev + 1); // Force refresh of the list
  };

  const showCreateForm = () => {
    setCurrentView('create');
    setSelectedRemittance(null);
  };

  const showEditForm = (remittance: RemittanceData) => {
    setSelectedRemittance(remittance);
    setCurrentView('edit');
  };

  const showDetail = (remittance: RemittanceData) => {
    setSelectedRemittance(remittance);
    setCurrentView('view');
  };

  // Event handlers
  const handleCreate = () => {
    showList();
  };

  const handleUpdate = () => {
    showList();
  };

  const handleCancel = () => {
    showList();
  };

  const handleDelete = (remittance: RemittanceData) => {
    // The deletion is handled in RemittanceList component
    // This is just for consistency, but the list will handle the actual deletion
  };

  const handleEditFromDetail = (remittance: RemittanceData) => {
    showEditForm(remittance);
  };

  // Styles
  const containerStyle = {
    'min-height': '100vh',
    'background-color': 'var(--background-color)'
  };

  const modalOverlayStyle = {
    position: 'fixed' as const,
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    'background-color': 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    'z-index': '1000'
  };

  const modalStyle = {
    'background-color': 'white',
    'border-radius': '8px',
    'max-width': '800px',
    width: '90%',
    'max-height': '90%',
    overflow: 'auto',
    'box-shadow': '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    padding: '2rem'
  };

  const breadcrumbStyle = {
    padding: '1rem 2rem',
    'background-color': 'white',
    'border-bottom': '1px solid var(--border-color)',
    'font-size': '0.875rem',
    color: 'var(--text-muted)'
  };

  const breadcrumbLinkStyle = {
    color: 'var(--primary-color)',
    'text-decoration': 'none',
    cursor: 'pointer'
  };

  const getBreadcrumb = () => {
    switch (currentView()) {
      case 'list':
        return 'Remesas';
      case 'create':
        return 'Remesas > Nueva Remesa';
      case 'edit':
        return `Remesas > Editar > ${selectedRemittance()?.remittanceNumber || ''}`;
      case 'view':
        return `Remesas > Ver > ${selectedRemittance()?.remittanceNumber || ''}`;
      default:
        return 'Remesas';
    }
  };

  return (
    <div style={containerStyle}>
      {/* Breadcrumb Navigation */}
      <Show when={currentView() !== 'list'}>
        <div style={breadcrumbStyle}>
          <span 
            style={breadcrumbLinkStyle} 
            onClick={showList}
          >
            Remesas
          </span>
          <Show when={currentView() === 'create'}>
            {' > Nueva Remesa'}
          </Show>
          <Show when={currentView() === 'edit'}>
            {' > Editar > ' + (selectedRemittance()?.remittanceNumber || '')}
          </Show>
          <Show when={currentView() === 'view'}>
            {' > Ver > ' + (selectedRemittance()?.remittanceNumber || '')}
          </Show>
        </div>
      </Show>

      {/* Main Content */}
      <Show when={currentView() === 'list'}>
        <RemittanceList
          key={refreshKey()} // Force re-render when refreshKey changes
          onCreate={showCreateForm}
          onEdit={showEditForm}
          onView={showDetail}
          onDelete={handleDelete}
        />
      </Show>

      {/* Create Form Modal */}
      <Show when={authStore.isAdmin() && currentView() === 'create'}>
        <div style={modalOverlayStyle} onClick={handleCancel}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <EditableRemittanceForm
              remittance={null}
              onSubmit={handleCreate}
              onCancel={handleCancel}
              isModal={true}
            />
          </div>
        </div>
      </Show>

      {/* Edit Form Modal */}
      <Show when={authStore.isAdmin() && currentView() === 'edit'}>
        <div style={modalOverlayStyle} onClick={handleCancel}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <EditableRemittanceForm
              remittance={selectedRemittance()}
              onSubmit={handleUpdate}
              onCancel={handleCancel}
              isModal={true}
            />
          </div>
        </div>
      </Show>

      {/* Detail View Modal */}
      <Show when={currentView() === 'view' && selectedRemittance()}>
        <RemittanceDetail
          remittanceId={selectedRemittance()!.id!}
          remittance={selectedRemittance()}
          onEdit={handleEditFromDetail}
          onClose={handleCancel}
        />
      </Show>
    </div>
  );
};

export default RemittanceDashboard;