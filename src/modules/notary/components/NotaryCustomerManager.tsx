import { Component, createSignal, createMemo, For, Show, onMount } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { Card, Button } from '../../ui';
import { useTranslation } from '../../../translations';
import { NotaryCustomer } from '../types';
import { FormTemplate } from '../types/formMapping';
import { inventoryApi } from '../../../services/apiAdapter';
import NotaryCustomerDetail from './NotaryCustomerDetail';
import NotaryCustomerForm from './NotaryCustomerForm';
import NotaryCustomerViewer from './NotaryCustomerViewer';
import NotaryCustomerEditor from './NotaryCustomerEditor';
import FormTemplateList from './FormTemplateList';
import PDFFieldMapper from './PDFFieldMapper';
import { devLog } from '../../../services/utils';

interface NotaryCustomerManagerProps {
  onClose?: () => void;
}

const NotaryCustomerManager: Component<NotaryCustomerManagerProps> = (props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [customers, setCustomers] = createSignal<NotaryCustomer[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [searchTerm, setSearchTerm] = createSignal('');
  const [selectedCustomer, setSelectedCustomer] = createSignal<NotaryCustomer | null>(null);
  const [showDetail, setShowDetail] = createSignal(false);
  const [showForm, setShowForm] = createSignal(false);
  const [showViewer, setShowViewer] = createSignal(false);
  const [showEditor, setShowEditor] = createSignal(false);
  const [formMode, setFormMode] = createSignal<'create' | 'edit'>('create');
  const [searchMode, setSearchMode] = createSignal<'list' | 'search'>('list');
  const [viewMode, setViewMode] = createSignal<'detail' | 'viewer'>('detail');
  const [editMode, setEditMode] = createSignal<'form' | 'editor'>('form');
  const [showDeleteConfirm, setShowDeleteConfirm] = createSignal<string | null>(null);
  const [deleteLoading, setDeleteLoading] = createSignal(false);

  // Template management
  const [activeTab, setActiveTab] = createSignal<'customers' | 'templates'>('customers');
  const [showTemplateList, setShowTemplateList] = createSignal(false);
  const [showPDFMapper, setShowPDFMapper] = createSignal(false);
  const [selectedTemplate, setSelectedTemplate] = createSignal<FormTemplate | null>(null);
  const [pdfFile, setPdfFile] = createSignal<File | null>(null);
  
  // Fetch all customers
  const fetchAllCustomers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      /**
      const response = await inventoryApi.getAllClientNotary();
      if (response && Array.isArray(response)) {
        setCustomers(response);
      } else {
        setCustomers([]);
      }
      */
    } catch (err) {
      setError(t('notary.error.fetchCustomers', 'Error fetching customers'));
      devLog('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  // Search customers
  const searchCustomers = async (query: string) => {
    if (!query.trim()) {
      setCustomers([]);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await inventoryApi.searchClientNotary(query);
      if (response && Array.isArray(response)) {
        setCustomers(response);
      } else {
        setCustomers([]);
      }
    } catch (err) {
      setError(t('notary.error.fetchCustomers', 'Error searching customers'));
      devLog('Error searching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle search
  const handleSearch = async () => {
    const term = searchTerm().trim();
    if (term) {
      setSearchMode('search');
      await searchCustomers(term);
    } else {
      setSearchMode('list');
      await fetchAllCustomers();
    }
  };

  // Handle customer selection for detail view
  const handleCustomerSelect = (customer: NotaryCustomer) => {
    // Navigate to the detail page with the customer ID in the URL
    if (customer.clientNotaryId) {
      navigate(`/notary-customers/${customer.clientNotaryId}`);
    } else {
      // Fallback to old method if no ID is available
      setSelectedCustomer(customer);

      // Show the appropriate view mode
      if (viewMode() === 'detail') {
        setShowDetail(true);
        setShowViewer(false);
      } else {
        setShowViewer(true);
        setShowDetail(false);
      }

      setShowForm(false);
      setShowEditor(false);
    }
  };

  // Handle create new customer
  const handleCreateNew = () => {
    setSelectedCustomer(null);
    setFormMode('create');
    
    // Show the appropriate edit mode
    if (editMode() === 'form') {
      setShowForm(true);
      setShowEditor(false);
    } else {
      setShowEditor(true);
      setShowForm(false);
    }
    
    setShowDetail(false);
    setShowViewer(false);
  };

  // Handle edit customer
  const handleEditCustomer = (customer: NotaryCustomer) => {
    setSelectedCustomer(customer);
    setFormMode('edit');
    
    // Show the appropriate edit mode
    if (editMode() === 'form') {
      setShowForm(true);
      setShowEditor(false);
    } else {
      setShowEditor(true);
      setShowForm(false);
    }
    
    setShowDetail(false);
    setShowViewer(false);
  };

  // Handle delete customer
  const handleDeleteCustomer = async (clientId: string) => {
    if (!clientId) return;
    
    setDeleteLoading(true);
    try {
      const result = await inventoryApi.deleteClientNotary(clientId);
      if (result.success) {
        // Remove from local state
        setCustomers(prev => prev.filter(c => c.clientNotaryId !== clientId));
        setShowDeleteConfirm(null);
        setError(null);
      } else {
        setError(result.message || 'Error al eliminar cliente');
      }
    } catch (err) {
      devLog('Error deleting customer:', err);
      setError('Error al eliminar cliente');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Handle form save
  const handleFormSave = (customer: NotaryCustomer) => {
    if (formMode() === 'create') {
      // Add to local state
      setCustomers(prev => [customer, ...prev]);
    } else {
      // Update in local state
      setCustomers(prev => prev.map(c => 
        c.clientNotaryId === customer.clientNotaryId ? customer : c
      ));
    }
    
    setShowForm(false);
    setShowEditor(false);
    setSelectedCustomer(null);
    setError(null);
  };

  // Handle form cancel
  const handleFormCancel = () => {
    setShowForm(false);
    setShowEditor(false);
    setSelectedCustomer(null);
  };

  // Return to main view
  const handleBackToMain = () => {
    setShowDetail(false);
    setShowForm(false);
    setShowViewer(false);
    setShowEditor(false);
    setSelectedCustomer(null);
  };

  // Format date
  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleDateString('es-ES');
  };

  // Get customer status
  const getCustomerStatus = (customer: NotaryCustomer) => {
    if (customer.hasLPR) return { text: 'LPR', color: '#28a745' };
    if (customer.isInUSA) return { text: 'En USA', color: '#17a2b8' };
    if (customer.hasI94) return { text: 'I-94', color: '#ffc107' };
    return { text: 'Otro', color: '#6c757d' };
  };

  // Get full name
  const getFullName = (customer: NotaryCustomer) => {
    return [customer.firstName, customer.middleName, customer.lastName]
      .filter(Boolean)
      .join(' ') || t('notary.unnamed', 'Sin nombre');
  };

  // Template handlers
  const handleFillTemplate = (template: FormTemplate) => {
    // To fill a template, we need both a customer and the PDF file
    // Prompt user to select a customer if not selected
    if (!selectedCustomer()) {
      if (confirm('Para llenar una plantilla necesitas seleccionar un cliente. ¿Deseas ir a la pestaña de clientes?')) {
        setActiveTab('customers');
        setShowTemplateList(false);
      }
      return;
    }

    // Prompt to upload the PDF file for this template
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setSelectedTemplate(template);
        setPdfFile(file);
        setShowPDFMapper(true);
        setShowTemplateList(false);
      }
    };
    input.click();
  };

  const handleEditTemplate = (template: FormTemplate) => {
    // For editing, user needs to provide the PDF to re-map
    if (confirm(`Para editar esta plantilla "${template.formName}", necesitas subir el archivo PDF original. ¿Continuar?`)) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pdf';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          devLog('Editing template:', template);
          setSelectedTemplate(template);
          setPdfFile(file);
          setShowPDFMapper(true);
          setShowTemplateList(false);
        }
      };
      input.click();
    }
  };

  const handleUploadPDF = () => {
    // Check if we're viewing from templates tab (no customer needed for creating template)
    // or from customer context (customer required for filling)
    const needsCustomer = activeTab() === 'customers';

    if (needsCustomer && !selectedCustomer()) {
      alert('Por favor selecciona un cliente primero desde la pestaña de Clientes');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setPdfFile(file);
        setShowPDFMapper(true);
        setShowTemplateList(false);
        setActiveTab('customers'); // Switch to show the mapper
      }
    };
    input.click();
  };

  onMount(() => {
    fetchAllCustomers();
  });

  return (
    <>
      <Show when={!showDetail() && !showViewer() && !showForm() && !showEditor() && !showPDFMapper()}>
        <Card>
          <div style={{ padding: '1.5rem' }}>
            <div style={{
              display: 'flex',
              'justify-content': 'space-between',
              'align-items': 'center',
              'margin-bottom': '1.5rem'
            }}>
              <div>
                <h2 style={{
                  'font-size': '1.5rem',
                  'font-weight': '600',
                  color: 'var(--text-primary)',
                  'margin-bottom': '0.5rem'
                }}>
                  👨‍💼 {t('notary.customerManager', 'Gestor de Clientes Notariales')}
                </h2>

                {/* Tab Selector */}
                <div style={{
                  display: 'flex',
                  gap: '0.5rem',
                  'margin-top': '0.75rem'
                }}>
                  <button
                    style={{
                      padding: '0.5rem 1rem',
                      background: activeTab() === 'customers' ? 'var(--primary-color)' : 'transparent',
                      color: activeTab() === 'customers' ? 'white' : 'var(--text-primary)',
                      border: `1px solid ${activeTab() === 'customers' ? 'var(--primary-color)' : 'var(--border-color)'}`,
                      'border-radius': 'var(--border-radius-sm)',
                      cursor: 'pointer',
                      'font-weight': '500',
                      'font-size': '0.875rem',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => {
                      setActiveTab('customers');
                      setShowTemplateList(false);
                      setShowPDFMapper(false);
                    }}
                  >
                    👥 Clientes
                  </button>
                  <button
                    style={{
                      padding: '0.5rem 1rem',
                      background: activeTab() === 'templates' ? 'var(--primary-color)' : 'transparent',
                      color: activeTab() === 'templates' ? 'white' : 'var(--text-primary)',
                      border: `1px solid ${activeTab() === 'templates' ? 'var(--primary-color)' : 'var(--border-color)'}`,
                      'border-radius': 'var(--border-radius-sm)',
                      cursor: 'pointer',
                      'font-weight': '500',
                      'font-size': '0.875rem',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => {
                      setActiveTab('templates');
                      setShowTemplateList(true);
                    }}
                  >
                    📋 Plantillas PDF
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', 'align-items': 'center' }}>
                {/* Component Mode Selector */}
                <div style={{
                  display: 'flex',
                  gap: '0.25rem',
                  padding: '0.25rem',
                  background: 'var(--gray-100)',
                  'border-radius': 'var(--border-radius-sm)',
                  'font-size': '0.75rem'
                }}>
                  <div style={{
                    display: 'flex',
                    'flex-direction': 'column',
                    gap: '0.25rem'
                  }}>
                    <div style={{
                      display: 'flex',
                      gap: '0.25rem'
                    }}>
                      <span style={{ 'font-weight': '600', color: 'var(--text-muted)' }}>Vista:</span>
                      <button
                        style={{
                          padding: '0.25rem 0.5rem',
                          background: viewMode() === 'detail' ? 'var(--primary-color)' : 'transparent',
                          color: viewMode() === 'detail' ? 'white' : 'var(--text-primary)',
                          border: 'none',
                          'border-radius': 'var(--border-radius-sm)',
                          cursor: 'pointer',
                          'font-size': '0.75rem'
                        }}
                        onClick={() => setViewMode('detail')}
                      >
                        📋 Detalle
                      </button>
                      <button
                        style={{
                          padding: '0.25rem 0.5rem',
                          background: viewMode() === 'viewer' ? 'var(--primary-color)' : 'transparent',
                          color: viewMode() === 'viewer' ? 'white' : 'var(--text-primary)',
                          border: 'none',
                          'border-radius': 'var(--border-radius-sm)',
                          cursor: 'pointer',
                          'font-size': '0.75rem'
                        }}
                        onClick={() => setViewMode('viewer')}
                      >
                        👁️ Viewer
                      </button>
                    </div>
                    
                    <div style={{
                      display: 'flex',
                      gap: '0.25rem'
                    }}>
                      <span style={{ 'font-weight': '600', color: 'var(--text-muted)' }}>Editar:</span>
                      <button
                        style={{
                          padding: '0.25rem 0.5rem',
                          background: editMode() === 'form' ? 'var(--success-color)' : 'transparent',
                          color: editMode() === 'form' ? 'white' : 'var(--text-primary)',
                          border: 'none',
                          'border-radius': 'var(--border-radius-sm)',
                          cursor: 'pointer',
                          'font-size': '0.75rem'
                        }}
                        onClick={() => setEditMode('form')}
                      >
                        📝 Form
                      </button>
                      <button
                        style={{
                          padding: '0.25rem 0.5rem',
                          background: editMode() === 'editor' ? 'var(--success-color)' : 'transparent',
                          color: editMode() === 'editor' ? 'white' : 'var(--text-primary)',
                          border: 'none',
                          'border-radius': 'var(--border-radius-sm)',
                          cursor: 'pointer',
                          'font-size': '0.75rem'
                        }}
                        onClick={() => setEditMode('editor')}
                      >
                        ⚙️ Editor
                      </button>
                    </div>
                  </div>
                </div>

                <Button
                  variant="primary"
                  onClick={handleCreateNew}
                  style={{
                    display: 'flex',
                    'align-items': 'center',
                    gap: '0.5rem'
                  }}
                >
                  ➕ {t('notary.createNew', 'Crear Nuevo Cliente')}
                </Button>
                
                <Show when={props.onClose}>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={props.onClose}
                  >
                    ✕ {t('common.close', 'Cerrar')}
                  </Button>
                </Show>
              </div>
            </div>

            {/* Search Bar */}
            <div style={{ 
              display: 'grid', 
              'grid-template-columns': '1fr auto auto', 
              gap: '1rem',
              'margin-bottom': '1.5rem',
              padding: '1rem',
              background: 'var(--gray-50)',
              'border-radius': 'var(--border-radius-sm)'
            }}>
              <input
                type="text"
                placeholder={t('notary.searchPlaceholder', 'Buscar por nombre, ID, SSN, teléfono, email...')}
                value={searchTerm()}
                onInput={(e) => setSearchTerm(e.currentTarget.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
                style={{
                  padding: '0.75rem',
                  border: '1px solid var(--border-color)',
                  'border-radius': 'var(--border-radius-sm)',
                  'font-size': '1rem',
                  width: '100%'
                }}
              />
              
              <Button 
                variant="primary" 
                size="sm"
                onClick={handleSearch}
              >
                🔍 {t('common.search', 'Buscar')}
              </Button>

              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setSearchMode('list');
                  fetchAllCustomers();
                }}
              >
                📋 {t('notary.showAll', 'Ver Todos')}
              </Button>
            </div>

            {/* Status Info */}
            <div style={{ 
              'margin-bottom': '1rem',
              'font-size': '0.875rem',
              color: 'var(--text-muted)',
              display: 'flex',
              'justify-content': 'space-between',
              'align-items': 'center'
            }}>
              <div style={{ display: 'flex', gap: '1rem', 'align-items': 'center' }}>
                <div>
                  {searchMode() === 'search' ? 
                    `${t('notary.searchResults', 'Resultados de búsqueda')}: ${customers().length}` :
                    `${t('common.showing', 'Mostrando')} ${customers().length} ${t('notary.totalCustomers', 'clientes')}`
                  }
                </div>
                
                {/* Active Components Indicator */}
                <div style={{
                  display: 'flex',
                  gap: '0.5rem',
                  'font-size': '0.75rem'
                }}>
                  <span style={{
                    padding: '0.25rem 0.5rem',
                    background: 'var(--info-light)',
                    color: 'var(--info-color)',
                    'border-radius': 'var(--border-radius-sm)',
                    'font-weight': '500'
                  }}>
                    Vista: {viewMode() === 'detail' ? '📋 Detalle' : '👁️ Viewer'}
                  </span>
                  <span style={{
                    padding: '0.25rem 0.5rem',
                    background: 'var(--success-light)',
                    color: 'var(--success-color)',
                    'border-radius': 'var(--border-radius-sm)',
                    'font-weight': '500'
                  }}>
                    Editar: {editMode() === 'form' ? '📝 Form' : '⚙️ Editor'}
                  </span>
                </div>
              </div>
              
              <Show when={searchMode() === 'search' && searchTerm()}>
                <div style={{ 
                  background: 'var(--primary-light)',
                  color: 'var(--primary-color)',
                  padding: '0.25rem 0.5rem',
                  'border-radius': 'var(--border-radius-sm)',
                  'font-size': '0.75rem'
                }}>
                  "{searchTerm()}"
                </div>
              </Show>
            </div>

            <Show when={loading()}>
              <div style={{ 
                'text-align': 'center', 
                padding: '3rem',
                color: 'var(--text-muted)'
              }}>
                <div style={{ 'font-size': '2rem', 'margin-bottom': '1rem' }}>⏳</div>
                <div>{t('common.loading', 'Cargando...')}</div>
              </div>
            </Show>

            <Show when={error()}>
              <div style={{
                padding: '1rem',
                background: 'var(--danger-light)',
                color: 'var(--danger-color)',
                'border-radius': 'var(--border-radius-sm)',
                'margin-bottom': '1rem'
              }}>
                {error()}
              </div>
            </Show>

            <Show when={!loading() && customers().length === 0 && !error()}>
              <div style={{ 
                'text-align': 'center', 
                padding: '3rem',
                color: 'var(--text-muted)'
              }}>
                <div style={{ 'font-size': '3rem', 'margin-bottom': '1rem' }}>
                  {searchMode() === 'search' ? '🔍' : '👤'}
                </div>
                <div style={{ 'font-size': '1.125rem', 'font-weight': '500' }}>
                  {searchMode() === 'search' ? 
                    t('notary.noSearchResults', 'No se encontraron resultados') :
                    t('notary.noCustomers', 'No se encontraron clientes')
                  }
                </div>
                <Show when={searchMode() === 'search'}>
                  <div style={{ 'font-size': '0.875rem', 'margin-top': '0.5rem' }}>
                    {t('notary.tryDifferentSearch', 'Intenta con diferentes términos de búsqueda')}
                  </div>
                </Show>
              </div>
            </Show>

            {/* Customer List */}
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <For each={customers()}>
                {(customer) => {
                  const fullName = getFullName(customer);
                  const status = getCustomerStatus(customer);
                  
                  return (
                    <div 
                      style={{
                        padding: '1.25rem',
                        background: 'var(--surface-color)',
                        border: '1px solid var(--border-color)',
                        'border-radius': 'var(--border-radius)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        'box-shadow': 'var(--shadow-sm)'
                      }}
                      onClick={() => handleCustomerSelect(customer)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--gray-50)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--surface-color)';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                      }}
                    >
                      <div style={{
                        display: 'grid',
                        'grid-template-columns': '1fr auto',
                        gap: '1rem',
                        'align-items': 'start'
                      }}>
                        <div>
                          {/* Header */}
                          <div style={{ 
                            display: 'flex',
                            'align-items': 'center',
                            gap: '1rem',
                            'margin-bottom': '0.75rem'
                          }}>
                            <span style={{ 
                              'font-size': '1.25rem',
                              'font-weight': '600',
                              color: 'var(--text-primary)'
                            }}>
                              {fullName}
                            </span>
                            <span style={{
                              display: 'inline-block',
                              padding: '0.25rem 0.75rem',
                              'border-radius': 'var(--border-radius-sm)',
                              'font-size': '0.75rem',
                              'font-weight': '500',
                              color: 'white',
                              'background-color': status.color
                            }}>
                              {status.text}
                            </span>
                            <Show when={customer.isMarriage}>
                              <span style={{
                                display: 'inline-block',
                                padding: '0.25rem 0.5rem',
                                'border-radius': 'var(--border-radius-sm)',
                                'font-size': '0.75rem',
                                color: '#e91e63',
                                background: '#fce4ec'
                              }}>
                                💑 {t('notary.married', 'Casado')}
                              </span>
                            </Show>
                          </div>
                          
                          {/* Details Grid */}
                          <div style={{ 
                            display: 'grid',
                            'grid-template-columns': 'repeat(auto-fit, minmax(220px, 1fr))',
                            gap: '0.75rem',
                            'font-size': '0.875rem'
                          }}>
                            <div>
                              <span style={{ color: 'var(--text-muted)', 'font-weight': '500' }}>📧 Email:</span>{' '}
                              <span style={{ 'font-weight': '500' }}>{customer.email || '-'}</span>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-muted)', 'font-weight': '500' }}>📱 Teléfono:</span>{' '}
                              <span style={{ 'font-weight': '500' }}>{customer.phoneNumber || '-'}</span>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-muted)', 'font-weight': '500' }}>🆔 Cliente ID:</span>{' '}
                              <span style={{ 'font-weight': '500', color: 'var(--primary-color)' }}>
                                {customer.clientNotaryId || '-'}
                              </span>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-muted)', 'font-weight': '500' }}>🔢 SSN:</span>{' '}
                              <span style={{ 'font-weight': '500' }}>{customer.ss || '-'}</span>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-muted)', 'font-weight': '500' }}>👽 Alien #:</span>{' '}
                              <span style={{ 'font-weight': '500' }}>{customer.alienNumber || '-'}</span>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-muted)', 'font-weight': '500' }}>📔 Pasaporte:</span>{' '}
                              <span style={{ 'font-weight': '500' }}>{customer.passportNumber || '-'}</span>
                            </div>
                          </div>
                          
                          {/* Footer Info */}
                          <div style={{ 
                            'margin-top': '0.75rem',
                            'font-size': '0.75rem',
                            color: 'var(--text-muted)',
                            display: 'flex',
                            'flex-wrap': 'wrap',
                            gap: '1rem'
                          }}>
                            <span>
                              🏳️ {t('notary.field.citizenship', 'Ciudadanía')}: {customer.countryOfCitizenship || '-'}
                            </span>
                            <span>
                              🎂 {t('notary.field.dob', 'Nacimiento')}: {formatDate(customer.dateOfBirth)}
                            </span>
                            <Show when={customer.currentLocation}>
                              <span>
                                📍 {t('notary.field.location', 'Ubicación')}: {customer.currentLocation?.state}, {customer.currentLocation?.country}
                              </span>
                            </Show>
                            <Show when={customer.createdAt}>
                              <span>
                                📅 {t('notary.field.created', 'Registrado')}: {formatDate(new Date(customer.createdAt!).getTime())}
                              </span>
                            </Show>
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div style={{ 'text-align': 'right', display: 'flex', 'flex-direction': 'column', gap: '0.5rem' }}>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCustomerSelect(customer);
                            }}
                            style={{
                              display: 'flex',
                              'align-items': 'center',
                              gap: '0.5rem'
                            }}
                          >
                            👁️ {t('common.viewDetails', 'Ver Detalles')}
                          </Button>
                          
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditCustomer(customer);
                              }}
                              title="Editar cliente"
                            >
                              ✏️ {t('common.edit', 'Editar')}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowDeleteConfirm(customer.clientNotaryId || '');
                              }}
                              title="Eliminar cliente"
                              style={{ color: 'var(--danger-color)' }}
                            >
                              🗑️ {t('common.delete', 'Eliminar')}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }}
              </For>
            </div>
          </div>
        </Card>

        {/* Delete Confirmation Dialog */}
        <Show when={showDeleteConfirm()}>
          <div style={{
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'center',
            'z-index': '1000'
          }}>
            <Card>
              <div style={{ padding: '1.5rem', 'min-width': '400px' }}>
                <h3 style={{
                  'margin-bottom': '1rem',
                  color: 'var(--danger-color)'
                }}>
                  ⚠️ Confirmar Eliminación
                </h3>
                <p style={{ 'margin-bottom': '1.5rem' }}>
                  ¿Estás seguro que deseas eliminar este cliente? Esta acción no se puede deshacer.
                </p>
                <div style={{
                  display: 'flex',
                  'justify-content': 'flex-end',
                  gap: '1rem'
                }}>
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(null)}
                    disabled={deleteLoading()}
                  >
                    ✕ Cancelar
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => handleDeleteCustomer(showDeleteConfirm()!)}
                    disabled={deleteLoading()}
                    style={{
                      background: 'var(--danger-color)',
                      'border-color': 'var(--danger-color)'
                    }}
                  >
                    {deleteLoading() ? '⏳ Eliminando...' : '🗑️ Eliminar'}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </Show>
      </Show>

      {/* Customer Detail View */}
      <Show when={showDetail() && selectedCustomer()}>
        <NotaryCustomerDetail 
          customer={selectedCustomer()!}
          onBack={handleBackToMain}
        />
      </Show>

      {/* Customer Viewer View */}
      <Show when={showViewer() && selectedCustomer()}>
        <NotaryCustomerViewer 
          customer={selectedCustomer()!}
          onClose={handleBackToMain}
          onEdit={handleEditCustomer}
        />
      </Show>

      {/* Customer Form View */}
      <Show when={showForm()}>
        <NotaryCustomerForm 
          customer={selectedCustomer()}
          mode={formMode()}
          onSave={handleFormSave}
          onCancel={handleFormCancel}
        />
      </Show>

      {/* Customer Editor View */}
      <Show when={showEditor()}>
        <NotaryCustomerEditor
          customer={selectedCustomer()}
          mode={formMode()}
          onSave={handleFormSave}
          onCancel={handleFormCancel}
        />
      </Show>

      {/* Template List View */}
      <Show when={showTemplateList() && activeTab() === 'templates'}>
        <div style={{ position: 'relative' }}>
          {/* Upload PDF Button - Floating Action */}
          <div style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            'z-index': '100'
          }}>
            <Button
              variant="primary"
              onClick={handleUploadPDF}
              style={{
                padding: '1rem 1.5rem',
                'font-size': '1.125rem',
                'box-shadow': 'var(--shadow-lg)',
                'border-radius': '9999px'
              }}
            >
              📤 Subir PDF y Crear Plantilla
            </Button>
          </div>

          <FormTemplateList
            onFillTemplate={handleFillTemplate}
            onEditTemplate={handleEditTemplate}
          />
        </div>
      </Show>

      {/* PDF Field Mapper View */}
      <Show when={showPDFMapper() && pdfFile()}>
        <PDFFieldMapper
          pdfFile={pdfFile()!}
          customer={selectedCustomer() || {
            // Dummy customer for template creation mode
            clientNotaryId: 'template-creation',
            firstName: 'Sample',
            lastName: 'Customer',
            email: 'sample@example.com',
            phoneNumber: '123-456-7890'
          } as NotaryCustomer}
          existingTemplate={selectedTemplate() || undefined}
          onClose={() => {
            setShowPDFMapper(false);
            setPdfFile(null);
            setSelectedTemplate(null);
          }}
          onSave={(template) => {
            devLog('Template saved/updated:', template);
            setShowPDFMapper(false);
            setPdfFile(null);
            setSelectedCustomer(null);
            setSelectedTemplate(null);
            // Switch to template list to show the updated template
            setActiveTab('templates');
            setShowTemplateList(true);
          }}
        />
      </Show>
    </>
  );
};

export default NotaryCustomerManager;