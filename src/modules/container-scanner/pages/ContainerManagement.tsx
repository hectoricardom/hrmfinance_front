/**
 * Container Management Page
 *
 * Allows administrators to create, edit, and manage containers and their bulks
 */

import { Component, createSignal, onMount, Show, For } from 'solid-js';
import { Container, Bulk } from '../types/containerScannerTypes';
import {
  listContainers,
  createContainer,
  updateContainer,
  deleteContainer,
  addBulk,
  updateBulk,
  deleteBulk
} from '../services/containerManagementApi';
import { generateShortCode } from '../../../services/utils';

// Inline styles matching invoice module pattern
const styles = {
  container: {
    'min-height': '100vh',
    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
    'padding-bottom': '3rem'
  },

  header: {
    background: 'linear-gradient(90deg, #1e293b 0%, #334155 50%, #1e293b 100%)',
    'border-bottom': '1px solid #475569',
    padding: '1.5rem',
    'box-shadow': '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
  },

  headerTitle: {
    'font-size': '1.5rem',
    'font-weight': '700',
    color: 'white',
    'text-align': 'center',
    'margin-bottom': '0.5rem'
  },

  headerSubtitle: {
    'font-size': '0.875rem',
    color: '#cbd5e1',
    'text-align': 'center'
  },

  contentWrapper: {
    padding: '1.5rem',
    'max-width': '80rem',
    margin: '0 auto'
  },

  card: {
    background: 'white',
    'border-radius': '0.75rem',
    'box-shadow': '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    border: '2px solid #e2e8f0',
    padding: '1.5rem',
    'margin-bottom': '1.5rem'
  },

  cardHeader: {
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'space-between',
    'margin-bottom': '1.5rem',
    'padding-bottom': '1rem',
    'border-bottom': '2px solid #e2e8f0'
  },

  cardTitle: {
    'font-size': '1.25rem',
    'font-weight': '700',
    color: '#0f172a'
  },

  button: {
    padding: '0.625rem 1.25rem',
    border: 'none',
    'border-radius': '0.5rem',
    'font-size': '0.875rem',
    'font-weight': '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    'box-shadow': '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
  },

  primaryButton: {
    background: 'linear-gradient(90deg, #1e293b 0%, #334155 100%)',
    color: 'white'
  },

  secondaryButton: {
    background: 'white',
    color: '#334155',
    border: '2px solid #cbd5e1'
  },

  successButton: {
    background: 'linear-gradient(90deg, #059669 0%, #10b981 100%)',
    color: 'white'
  },

  dangerButton: {
    background: 'linear-gradient(90deg, #dc2626 0%, #ef4444 100%)',
    color: 'white'
  },

  smallButton: {
    padding: '0.375rem 0.75rem',
    'font-size': '0.75rem'
  },

  formGroup: {
    'margin-bottom': '1rem'
  },

  label: {
    display: 'block',
    'font-size': '0.875rem',
    'font-weight': '600',
    color: '#334155',
    'margin-bottom': '0.5rem'
  },

  input: {
    width: '100%',
    padding: '0.625rem 0.875rem',
    'font-size': '0.875rem',
    border: '2px solid #cbd5e1',
    'border-radius': '0.5rem',
    background: 'white',
    transition: 'all 0.2s',
    outline: 'none',
    'box-shadow': '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
  },

  select: {
    width: '100%',
    padding: '0.625rem 0.875rem',
    'font-size': '0.875rem',
    border: '2px solid #cbd5e1',
    'border-radius': '0.5rem',
    background: 'white',
    transition: 'all 0.2s',
    outline: 'none',
    'box-shadow': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    cursor: 'pointer'
  },

  grid: {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '1.5rem'
  },

  containerCard: {
    background: 'white',
    'border-radius': '0.75rem',
    border: '2px solid #e2e8f0',
    padding: '1.25rem',
    transition: 'all 0.2s',
    'box-shadow': '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
  },

  containerHeader: {
    display: 'flex',
    'align-items': 'start',
    'justify-content': 'space-between',
    'margin-bottom': '1rem'
  },

  containerNumber: {
    'font-size': '1.125rem',
    'font-weight': '700',
    color: '#0f172a',
    'font-family': 'monospace'
  },

  statusBadge: {
    padding: '0.25rem 0.625rem',
    'border-radius': '9999px',
    'font-size': '0.75rem',
    'font-weight': '700',
    'text-transform': 'uppercase'
  },

  statusInTransit: {
    background: '#dbeafe',
    color: '#1e40af'
  },

  statusArrived: {
    background: '#fef3c7',
    color: '#92400e'
  },

  statusReceiving: {
    background: '#e0e7ff',
    color: '#3730a3'
  },

  statusReceived: {
    background: '#d1fae5',
    color: '#065f46'
  },

  infoRow: {
    display: 'flex',
    'justify-content': 'space-between',
    'font-size': '0.875rem',
    'margin-bottom': '0.5rem'
  },

  infoLabel: {
    color: '#64748b',
    'font-weight': '500'
  },

  infoValue: {
    color: '#0f172a',
    'font-weight': '600'
  },

  buttonGroup: {
    display: 'flex',
    gap: '0.5rem',
    'margin-top': '1rem',
    'padding-top': '1rem',
    'border-top': '1px solid #e2e8f0'
  },

  bulkList: {
    'margin-top': '1rem',
    'padding-top': '1rem',
    'border-top': '1px solid #e2e8f0'
  },

  bulkItem: {
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'space-between',
    padding: '0.625rem',
    'border-radius': '0.375rem',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    'margin-bottom': '0.5rem',
    'font-size': '0.875rem'
  },

  bulkInfo: {
    flex: '1'
  },

  bulkTracking: {
    'font-weight': '600',
    color: '#0f172a',
    'font-family': 'monospace'
  },

  bulkName: {
    color: '#64748b',
    'font-size': '0.75rem',
    'margin-top': '0.125rem'
  },

  bulkActions: {
    display: 'flex',
    gap: '0.375rem'
  },

  modal: {
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    'z-index': '1000',
    padding: '1rem'
  },

  modalContent: {
    background: 'white',
    'border-radius': '0.75rem',
    'box-shadow': '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    'max-width': '32rem',
    width: '100%',
    'max-height': '90vh',
    'overflow-y': 'auto'
  },

  modalHeader: {
    padding: '1.5rem',
    'border-bottom': '2px solid #e2e8f0'
  },

  modalTitle: {
    'font-size': '1.25rem',
    'font-weight': '700',
    color: '#0f172a'
  },

  modalBody: {
    padding: '1.5rem'
  },

  modalFooter: {
    padding: '1.5rem',
    'border-top': '2px solid #e2e8f0',
    display: 'flex',
    gap: '0.75rem',
    'justify-content': 'flex-end'
  },

  emptyState: {
    'text-align': 'center',
    padding: '3rem 1.5rem',
    color: '#64748b'
  },

  emptyIcon: {
    'font-size': '3rem',
    'margin-bottom': '1rem'
  },

  emptyText: {
    'font-size': '1rem',
    'font-weight': '500',
    'margin-bottom': '1rem'
  },

  loadingState: {
    'text-align': 'center',
    padding: '3rem',
    color: '#64748b'
  }
};

const ContainerManagement: Component = () => {
  const [containers, setContainers] = createSignal<Container[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [showAddModal, setShowAddModal] = createSignal(false);
  const [showEditModal, setShowEditModal] = createSignal(false);
  const [showBulkModal, setShowBulkModal] = createSignal(false);
  const [selectedContainer, setSelectedContainer] = createSignal<Container | null>(null);
  const [formData, setFormData] = createSignal({
    containerNumber: generateShortCode(12),
    status: 'in_transit' as Container['status']
  });
  const [bulkFormData, setBulkFormData] = createSignal({
    id: '',
    name: ''
  });

  // Load containers on mount
  onMount(async () => {
    await loadContainers();
  });

  const loadContainers = async () => {
    try {
      setLoading(true);
      const data = await listContainers();
      setContainers(data);
    } catch (error) {
      console.error('Error loading containers:', error);
      alert('Error al cargar contenedores');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateContainer = async (e: Event) => {
    e.preventDefault();
    try {
      await createContainer(formData());
      setShowAddModal(false);
      setFormData({ containerNumber: '', status: 'in_transit' });
      await loadContainers();
    } catch (error) {
      console.error('Error creating container:', error);
      alert('Error al crear contenedor');
    }
  };

  const handleUpdateContainer = async (e: Event) => {
    e.preventDefault();
    const container = selectedContainer();
    if (!container) return;

    try {
      await updateContainer(container.id, formData());
      setShowEditModal(false);
      setSelectedContainer(null);
      await loadContainers();
    } catch (error) {
      console.error('Error updating container:', error);
      alert('Error al actualizar contenedor');
    }
  };

  const handleDeleteContainer = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este contenedor? Se eliminarán todos los bultos asociados.')) {
      return;
    }

    try {
      await deleteContainer(id);
      await loadContainers();
    } catch (error) {
      console.error('Error deleting container:', error);
      alert('Error al eliminar contenedor');
    }
  };

  const openEditModal = (container: Container) => {
    setSelectedContainer(container);
    setFormData({
      containerNumber: container.containerNumber,
      status: container.status
    });
    setShowEditModal(true);
  };


const updateWhere = (
  predicate: (item: Container) => boolean,
  changes: Partial<Container> | ((item: Container) => Partial<Container>)
) => {
  
  setContainers(items =>
    items.map(item => {
      if (!predicate(item)) return item;
      const updates = typeof changes === 'function' ? changes(item) : changes;
      return {
        ...item,
        ...updates,
        updated_at: new Date().toISOString(),
      };
    })
  );
}

  const openBulkModal = (container: Container) => {
    setSelectedContainer(container);
    setBulkFormData({ id: '', name: '' });
    setShowBulkModal(true);
  };

  const handleAddBulk = async (e: Event) => {
    e.preventDefault();
    const container = selectedContainer();
    if (!container) return;

    try {

      const bulks =  container.bulks || [];
      bulks.push(bulkFormData())

    
      //console.log(JSON.stringify(containers()))
     
      updateWhere(
        item => item.id === container.id,
        {bulks}
      );
      setTimeout(async ()=>{
        await updateContainer(container.id,
          {bulks}
        );
        //await loadContainers();
      },40)
     


     
      

      setShowBulkModal(false);
      setBulkFormData({ id: '', name: '' });
     
    } catch (error) {
      console.error('Error adding bulk:', error);
      alert('Error al agregar bulto');
    }
  };

  const handleDeleteBulk = async (id: string, bulkId: string) => {

   
    if (!confirm('¿Está seguro de eliminar este bulto?')) {
      //return;
    }

    

    try {
      //await deleteBulk(bulkId);

     
      
      const container = selectedContainer();
      if (!container) return;
     

      const hty = (r) =>{
        let iid = r?.id || r?.trackingNumber;
        return iid!==bulkId
      }

      const bulks =  (container?.bulks || []).filter(hty);
     
       updateWhere(
        item => item.id === container.id,
        {bulks}
      );
      setTimeout(async ()=>{
        await updateContainer(container.id,
          {bulks}
        );
        //await loadContainers();
      },40)

    } catch (error) {
      console.error('Error deleting bulk:', error);
      alert('Error al eliminar bulto');
    }
  };

  const getStatusLabel = (status: Container['status']) => {
    const labels = {
      in_store: 'En Tienda',
      in_process: 'En Proceso',
      in_transit: 'En Tránsito',
      arrived: 'Arribado',
      receiving: 'Recibiendo',
      received: 'Recibido'
    };
    return labels[status] || status;
  };

  const getStatusStyle = (status: Container['status']) => {
    const statusStyles = {
      in_store: styles.statusInTransit,
      in_process: styles.statusInTransit,
      in_transit: styles.statusInTransit,
      arrived: styles.statusArrived,
      receiving: styles.statusReceiving,
      received: styles.statusReceived
    };
    return statusStyles[status] || {};
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.headerTitle}>Gestión de Contenedores</h1>
        <p style={styles.headerSubtitle}>Administrar contenedores y bultos</p>
      </div>

      {/* Content */}
      <div style={styles.contentWrapper}>
        {/* Controls */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Lista de Contenedores</h2>
            <button
              onClick={() => setShowAddModal(true)}
              style={{ ...styles.button, ...styles.primaryButton }}
            >
              + Nuevo Contenedor
            </button>
          </div>

          {/* Loading State */}
          <Show when={loading()}>
            <div style={styles.loadingState}>
              <div style={{ 'font-size': '2rem', 'margin-bottom': '0.5rem' }}>⏳</div>
              <div>Cargando contenedores...</div>
            </div>
          </Show>

          {/* Empty State */}
          <Show when={!loading() && containers().length === 0}>
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📦</div>
              <div style={styles.emptyText}>No hay contenedores registrados</div>
              <button
                onClick={() => setShowAddModal(true)}
                style={{ ...styles.button, ...styles.primaryButton }}
              >
                Crear Primer Contenedor
              </button>
            </div>
          </Show>

          {/* Container Grid */}
          <Show when={!loading() && containers().length > 0}>
            <div style={styles.grid}>
              <For each={containers()}>
                {(container) => (
                  <div style={styles.containerCard}>
                    <div style={styles.containerHeader}>
                      <div>
                        <div style={styles.containerNumber}>{container.containerNumber}</div>
                        <div style={{ 'font-size': '0.75rem', color: '#94a3b8', 'margin-top': '0.25rem' }}>
                          ID: {container.id}
                        </div>
                      </div>
                      <span style={{ ...styles.statusBadge, ...getStatusStyle(container.status) }}>
                        {getStatusLabel(container.status)}
                      </span>
                    </div>

                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>Total Bultos:</span>
                      <span style={styles.infoValue}>{container.totalBulks}</span>
                    </div>

                    <Show when={container.arrivedAt}>
                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>Fecha de Arribo:</span>
                        <span style={styles.infoValue}>
                          {new Date(container.arrivedAt!).toLocaleDateString('es-ES')}
                        </span>
                      </div>
                    </Show>

                    <Show when={container.receivedAt}>
                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>Fecha de Recepción:</span>
                        <span style={styles.infoValue}>
                          {new Date(container.receivedAt!).toLocaleDateString('es-ES')}
                        </span>
                      </div>
                    </Show>

                    {/* Bulks List */}
                    <Show when={container.bulks && container.bulks.length > 0}>
                      <div style={styles.bulkList}>
                        <div style={{ 'font-size': '0.875rem', 'font-weight': '600', color: '#475569', 'margin-bottom': '0.75rem' }}>
                          Bultos ({container.bulks!.length})
                        </div>
                        <For each={container.bulks}>
                          {(bulk) => (
                            <div style={styles.bulkItem}>
                              <div style={styles.bulkInfo}>
                                <div style={styles.bulkTracking}>{bulk.id ||bulk.trackingNumber}</div>
                                <Show when={bulk.name}>
                                  <div style={styles.bulkName}>{bulk.name}</div>
                                </Show>
                              </div>
                              {/* Only show delete button if container is in_process */}
                              <Show when={container.status === 'in_process'}>
                                <div style={styles.bulkActions}>
                                  <button
                                    onClick={() => {
                                      setSelectedContainer(container);
                                      handleDeleteBulk(container.id,  bulk.id || bulk.trackingNumber);

                                    }}
                                    style={{ ...styles.button, ...styles.smallButton, ...styles.dangerButton }}
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              </Show>
                            </div>
                          )}
                        </For>
                      </div>
                    </Show>

                    {/* Actions */}
                    <div style={styles.buttonGroup}>
                      {/* Only show add bulk button if container is in_process */}
                      <Show when={container.status === 'in_process'}>
                        <button
                          onClick={() => openBulkModal(container)}
                          style={{ ...styles.button, ...styles.successButton, flex: '1' }}
                        >
                          + Bulto
                        </button>
                      </Show>
                      <button
                        onClick={() => openEditModal(container)}
                        style={{ ...styles.button, ...styles.secondaryButton, flex: '1' }}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteContainer(container.id)}
                        style={{ ...styles.button, ...styles.dangerButton }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>
      </div>

      {/* Add Container Modal */}
      <Show when={showAddModal()}>
        <div style={styles.modal} onClick={() => setShowAddModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Nuevo Contenedor</h3>
            </div>

            <form onSubmit={handleCreateContainer}>
              <div style={styles.modalBody}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Número de Contenedor *</label>
                  <input
                    type="text"
                    value={formData().containerNumber}
                    onInput={(e) => setFormData({ ...formData(), containerNumber: e.currentTarget.value })}
                    placeholder="CONT-2024-XXX"
                    required
                    style={styles.input}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Estado</label>
                  <select
                    value={formData().status}
                    onChange={(e) => setFormData({ ...formData(), status: e.currentTarget.value as Container['status'] })}
                    style={styles.select}
                  >
                    <option value="in_store">En Tienda</option>
                    <option value="in_process">En Proceso</option>
                    <option value="in_transit">En Tránsito</option>
                    <option value="arrived">Arribado</option>
                    <option value="receiving">Recibiendo</option>
                    <option value="received">Recibido</option>
                  </select>
                </div>
              </div>

              <div style={styles.modalFooter}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ ...styles.button, ...styles.secondaryButton }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ ...styles.button, ...styles.primaryButton }}
                >
                  Crear Contenedor
                </button>
              </div>
            </form>
          </div>
        </div>
      </Show>

      {/* Edit Container Modal */}
      <Show when={showEditModal()}>
        <div style={styles.modal} onClick={() => setShowEditModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Editar Contenedor</h3>
            </div>

            <form onSubmit={handleUpdateContainer}>
              <div style={styles.modalBody}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Número de Contenedor *</label>
                  <input
                    type="text"
                    value={formData().containerNumber}
                    onInput={(e) => setFormData({ ...formData(), containerNumber: e.currentTarget.value })}
                    placeholder="CONT-2024-XXX"
                    required
                    style={styles.input}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Estado</label>
                  <select
                    value={formData().status}
                    onChange={(e) => setFormData({ ...formData(), status: e.currentTarget.value as Container['status'] })}
                    style={styles.select}
                  >
                    <option value="in_transit">En Tránsito</option>
                    <option value="arrived">Arribado</option>
                    <option value="receiving">Recibiendo</option>
                    <option value="received">Recibido</option>
                  </select>
                </div>
              </div>

              <div style={styles.modalFooter}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  style={{ ...styles.button, ...styles.secondaryButton }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ ...styles.button, ...styles.successButton }}
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      </Show>

      {/* Add Bulk Modal */}
      <Show when={showBulkModal()}>
        <div style={styles.modal} onClick={() => setShowBulkModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Agregar Bulto</h3>
              <Show when={selectedContainer()}>
                <div style={{ 'font-size': '0.875rem', color: '#64748b', 'margin-top': '0.25rem' }}>
                  Contenedor: {selectedContainer()!.containerNumber}
                </div>
              </Show>
            </div>

            <form onSubmit={handleAddBulk}>
              <div style={styles.modalBody}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Número de Rastreo *</label>
                  <input
                    type="text"
                    value={bulkFormData().id}
                    onInput={(e) => setBulkFormData({ ...bulkFormData(), id: e.currentTarget.value })}
                    placeholder="TRACK-XXX"
                    required
                    style={styles.input}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Nombre / Descripción</label>
                  <input
                    type="text"
                    value={bulkFormData().name}
                    onInput={(e) => setBulkFormData({ ...bulkFormData(), name: e.currentTarget.value })}
                    placeholder="Ej: Electrónicos, Ropa, etc."
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.modalFooter}>
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  style={{ ...styles.button, ...styles.secondaryButton }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ ...styles.button, ...styles.successButton }}
                >
                  Agregar Bulto
                </button>
              </div>
            </form>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default ContainerManagement;
