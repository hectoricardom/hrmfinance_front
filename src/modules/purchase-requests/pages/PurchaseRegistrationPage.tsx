import { Component, createSignal, Show } from 'solid-js';
import { Button } from '../../ui';
import PurchaseRegistrationForm from '../components/PurchaseRegistrationForm';
import PurchaseRegistrationList from '../components/PurchaseRegistrationList';
import PurchaseRegistrationViewModal from '../components/PurchaseRegistrationViewModal';
import { 
  PurchaseRegistration, 
  CreatePurchaseRegistrationInput 
} from '../types/purchaseRequestTypes';
import purchaseRegistrationStore from '../stores/purchaseRegistrationStore';
import { authStore } from '../../../stores/authStore';

const PurchaseRegistrationPage: Component = () => {
  const [showForm, setShowForm] = createSignal(false);
  const [showViewModal, setShowViewModal] = createSignal(false);
  const [selectedRegistration, setSelectedRegistration] = createSignal<PurchaseRegistration | null>(null);


  // Permission checks
  const hasAccess = () => authStore.hasPermission('PurchaseRequestAccess');

  const canCreate = () => hasAccess() && !authStore.state?.profile?.onlyRead;

  const canEdit = () => hasAccess() && !authStore.state?.profile?.onlyRead;
  const canDelete = () => (hasAccess() && authStore.isAdmin()) || (hasAccess() && authStore.state?.profile?.read_write);
  const isAdmin = () => authStore.isAdmin();

  const handleCreateRegistration = async (data: CreatePurchaseRegistrationInput) => {
    const registration = await purchaseRegistrationStore.createRegistration(data);
    
    if (registration) {
      setShowForm(false);
      setSelectedRegistration(null);
      // Show success message (you could add a toast notification here)
      alert(`Registro de compra ${registration.registrationNumber} creado exitosamente`);
    } else {
      alert('Error al crear el registro de compra. Por favor intenta de nuevo.');
    }
  };

  const handleUpdateRegistration = async (data: CreatePurchaseRegistrationInput) => {
    const currentRegistration = selectedRegistration();
    if (!currentRegistration) return;

    const updatedRegistration = await purchaseRegistrationStore.updateRegistration(currentRegistration.id, data);
    
    if (updatedRegistration) {
      setShowForm(false);
      setSelectedRegistration(null);
      // Show success message (you could add a toast notification here)
      alert(`Registro de compra ${updatedRegistration.registrationNumber} actualizado exitosamente`);
    } else {
      alert('Error al actualizar el registro de compra. Por favor intenta de nuevo.');
    }
  };

  const handleFormSubmit = async (data: CreatePurchaseRegistrationInput) => {
    if (selectedRegistration()) {
      await handleUpdateRegistration(data);
    } else {
      await handleCreateRegistration(data);
    }
  };

  const handleEditRegistration = (registration: PurchaseRegistration) => {
    setSelectedRegistration(registration);
    setShowForm(true);
  };

  const handleViewRegistration = (registration: PurchaseRegistration) => {
    setSelectedRegistration(registration);
    setShowViewModal(true);
  };

  const headerStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '2rem',
    padding: '0 1rem'
  };

  const containerStyle = {
    'max-width': '1400px',
    margin: '0 auto',
    padding: '2rem 1rem'
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={{ 
            'font-size': '2.25rem', 
            'font-weight': '700',
            color: 'var(--text-primary)',
            'margin-bottom': '0.5rem'
          }}>
            Registro de Compras
          </h1>
          <p style={{ 
            color: 'var(--text-muted)',
            'font-size': '1rem' 
          }}>
            Gestiona y registra las compras realizadas en diferentes plataformas
          </p>
        </div>
        
        <Show when={canCreate()}>
          <Button
            variant="primary"
            onClick={() => {
              setSelectedRegistration(null);
              setShowForm(true);
            }}
            style={{ 'font-size': '1rem', padding: '0.75rem 1.5rem' }}
          >
            + Nueva Compra
          </Button>
        </Show>
      </div>

      {/* Purchase Registration List */}
      <PurchaseRegistrationList
        onEdit={canEdit() ? handleEditRegistration : undefined}
        onView={handleViewRegistration}
        canDelete={canDelete()}
        canEdit={canEdit()}
        showAdminActions={isAdmin()}
      />

      {/* Purchase Registration Form Modal */}
      <Show when={showForm()}>
        <PurchaseRegistrationForm
          isOpen={showForm()}
          onClose={() => {
            setShowForm(false);
            setSelectedRegistration(null);
          }}
          editingRegistration={selectedRegistration()}
          onSubmit={handleFormSubmit}
          isLoading={purchaseRegistrationStore.isCreating || purchaseRegistrationStore.isUpdating}
        />
      </Show>

      {/* Purchase Registration View Modal */}
      <Show when={showViewModal()}>
        <PurchaseRegistrationViewModal
          isOpen={showViewModal()}
          onClose={() => {
            setShowViewModal(false);
            setSelectedRegistration(null);
          }}
          registration={selectedRegistration()}
        />
      </Show>
    </div>
  );
};

export default PurchaseRegistrationPage;