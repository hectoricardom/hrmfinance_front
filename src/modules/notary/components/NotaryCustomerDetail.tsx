import { Component, createSignal, createMemo, For, Show, onMount, createEffect } from 'solid-js';
import { useParams, useNavigate } from '@solidjs/router';
import { Card, Button } from '../../ui';
import { useTranslation } from '../../../translations';
import { NotaryCustomer, Residence, School, Employer, EntryRecord, PassportRecord } from '../types';
import { inventoryApi } from '../../../services/apiAdapter';
import { DOJDocumentGeneratorSolid } from './DOJDocumentGeneratorSolid';
import NotaryCustomerEditor from './NotaryCustomerEditor';
import DocumentUploader from './DocumentUploader';
import { NotaryDocument } from '../types/documents';
import I485FormComparison from './I485FormComparison';
import TemplatePDFFiller from './TemplatePDFFiller';
import { devLog } from '../../../services/utils';

interface NotaryCustomerDetailProps {
  customerId?: string;
  customer?: NotaryCustomer | null;
  onClose?: () => void;
  onBack?: () => void;
}

const NotaryCustomerDetail: Component<NotaryCustomerDetailProps> = (props) => {
  const { t } = useTranslation();
  const params = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = createSignal<NotaryCustomer | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [activeTab, setActiveTab] = createSignal<'personal' | 'residence' | 'education' | 'employment' | 'immigration' | 'documents' | 'upload' | 'templateFill'>('personal');
  const [showRawData, setShowRawData] = createSignal(false);
  const [editMode, setEditMode] = createSignal(false);
  const [uploadedDocuments, setUploadedDocuments] = createSignal<NotaryDocument[]>([]);
  const [showI485Comparison, setShowI485Comparison] = createSignal(false);

  // Get the customer ID from URL params or props
  const getCustomerId = () => {
    return params.id || props.customerId;
  };

  // Fetch customer data
  const fetchCustomerData = async () => {
    // If customer is passed directly, use it
    if (props.customer) {
      setCustomer(props.customer);
      return;
    }

    // Otherwise fetch by ID from URL params or props
    const customerId = getCustomerId();
    if (!customerId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await inventoryApi.getClientNotaryById(customerId);
      devLog('Fetched customer by ID:', response);
      if (response) {
        setCustomer(response);
      }
    } catch (err) {
      setError(t('notary.error.fetchCustomer', 'Error fetching customer data'));
      devLog('Error fetching customer:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle edit save
  const handleEditSave = async () => {
    await fetchCustomerData(); // Refresh customer data
    setEditMode(false); // Exit edit mode
  };

  // Handle edit cancel
  const handleEditCancel = () => {
    setEditMode(false); // Exit edit mode without refreshing
  };

  // Handle back navigation
  const handleBack = () => {
    if (props.onBack) {
      props.onBack();
    } else if (props.onClose) {
      props.onClose();
    } else {
      // Navigate back to the customer list
      navigate('/notary-customers');
    }
  };

  // Handle document saved
  const handleDocumentSaved = (document: NotaryDocument) => {
    setUploadedDocuments([...uploadedDocuments(), document]);
    devLog('Document saved:', document);
  };

  // Format date from timestamp
  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleDateString('es-ES');
  };

  // Format date range
  const formatDateRange = (fromDate?: any, toDate?: any) => {
    if (!fromDate && !toDate) return '-';
    
    const from = fromDate ? `${fromDate.month || ''}/${fromDate.year || ''}` : '?';
    const to = toDate?.year === 'Present' ? 'Presente' : (toDate ? `${toDate.month || ''}/${toDate.year || ''}` : '?');
    
    return `${from} - ${to}`;
  };

  // Get full name
  const fullName = createMemo(() => {
    const c = customer();
    if (!c) return '';
    return [c.firstName, c.middleName, c.lastName].filter(Boolean).join(' ');
  });

  // Tab button style
  const tabButtonStyle = (isActive: boolean) => ({
    padding: '0.75rem 1.5rem',
    background: isActive ? 'var(--primary-color)' : 'transparent',
    color: isActive ? 'white' : 'var(--text-primary)',
    border: '1px solid var(--border-color)',
    'border-bottom': isActive ? 'none' : '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm) var(--border-radius-sm) 0 0',
    cursor: 'pointer',
    'font-weight': isActive ? '600' : '400',
    transition: 'all 0.2s ease'
  });

  // Section style
  const sectionStyle = {
    'margin-bottom': '1.5rem',
    padding: '1rem',
    background: 'var(--gray-50)',
    'border-radius': 'var(--border-radius-sm)',
    border: '1px solid var(--border-color)'
  };

  // Field style
  const fieldStyle = {
    display: 'grid',
    'grid-template-columns': '200px 1fr',
    gap: '0.5rem',
    'margin-bottom': '0.5rem',
    'align-items': 'start'
  };

  const labelStyle = {
    'font-weight': '500',
    color: 'var(--text-muted)',
    'font-size': '0.875rem'
  };

  const valueStyle = {
    color: 'var(--text-primary)',
    'font-size': '0.875rem'
  };

  // Initialize customer data when component mounts or props change
  onMount(() => {
    fetchCustomerData();
  });

  // React to prop changes
  createEffect(() => {
    if (props.customer) {
      setCustomer(props.customer);
    } else if (props.customerId) {
      fetchCustomerData();
    }
  });

  // Watch for URL parameter changes
  createEffect(() => {
    const customerId = params.id;
    if (customerId && !props.customer) {
      devLog('URL param changed, fetching customer:', customerId);
      fetchCustomerData();
    }
  });

  return (
    <Card>
      <div style={{ padding: '1.5rem' }}>
        <div style={{
          display: 'flex',
          'justify-content': 'space-between',
          'align-items': 'center',
          'margin-bottom': '1.5rem'
        }}>
          <h2 style={{
            'font-size': '1.5rem',
            'font-weight': '600',
            color: 'var(--text-primary)'
          }}>
            {t('notary.customerDetail', 'Detalle del Cliente Notarial')}
          </h2>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Show when={!editMode() && !showI485Comparison()}>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setEditMode(true)}
              >
                ✏️ {t('common.edit', 'Editar')}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/notary-pdf-forms', { state: { customer: customer() } })}
                style={{ background: '#10b981' }}
              >
                📄 Llenar Formularios PDF
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowI485Comparison(true)}
                style={{ background: '#3b82f6' }}
              >
                📋 Comparar I-485
              </Button>
            </Show>
            <Show when={showI485Comparison()}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowI485Comparison(false)}
              >
                ← Volver a Detalles
              </Button>
            </Show>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRawData(!showRawData())}
            >
              {showRawData() ? '📋 Vista Normal' : '🔍 Datos Raw'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCustomerData}
            >
              🔄 {t('common.refresh', 'Actualizar')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBack}
            >
              {props.onBack ? '← Volver' : (props.onClose ? '✕ Cerrar' : '← Volver a Lista')}
            </Button>
          </div>
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

        {/* Show I-485 Form Comparison when active */}
        <Show when={showI485Comparison() && customer()}>
          <I485FormComparison
            customer={customer()!}
            onClose={() => setShowI485Comparison(false)}
          />
        </Show>

        {/* Show editor when in edit mode */}
        <Show when={editMode() && customer()}>
          <NotaryCustomerEditor
            customer={customer()!}
            mode="edit"
            onSave={handleEditSave}
            onCancel={handleEditCancel}
          />
        </Show>

        {/* Show customer details when not in edit mode and not in I-485 comparison */}
        <Show when={customer() && !loading() && !editMode() && !showI485Comparison()}>
          {/* Customer Header */}
          <div style={{
            ...sectionStyle,
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            color: 'white',
            'margin-bottom': '1.5rem'
          }}>
            <h3 style={{ 'font-size': '1.25rem', 'margin-bottom': '0.5rem' }}>
              {fullName()}
            </h3>
            <div style={{ 
              display: 'grid', 
              'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              'margin-top': '1rem',
              'font-size': '0.875rem'
            }}>
              <div>
                <span style={{ opacity: 0.8 }}>ID Cliente:</span> {customer()?.clientNotaryId || '-'}
              </div>
              <div>
                <span style={{ opacity: 0.8 }}>SSN:</span> {customer()?.ss || '-'}
              </div>
              <div>
                <span style={{ opacity: 0.8 }}>Alien #:</span> {customer()?.alienNumber || '-'}
              </div>
              <div>
                <span style={{ opacity: 0.8 }}>Teléfono:</span> {customer()?.phoneNumber || '-'}
              </div>
              <div>
                <span style={{ opacity: 0.8 }}>Email:</span> {customer()?.email || '-'}
              </div>
            </div>
          </div>

          {/* Show raw data if enabled */}
          <Show when={showRawData()}>
            <div style={{
              ...sectionStyle,
              'max-height': '400px',
              overflow: 'auto',
              'font-family': 'monospace',
              'font-size': '0.75rem',
              background: '#1e1e1e',
              color: '#d4d4d4'
            }}>
              <pre>{JSON.stringify(customer(), null, 2)}</pre>
            </div>
          </Show>

          {/* Tabs */}
          <Show when={!showRawData()}>
            <div style={{ 'margin-bottom': '1.5rem' }}>
              <div style={{ 
                display: 'flex', 
                'border-bottom': '1px solid var(--border-color)',
                gap: '0.25rem'
              }}>
                <button 
                  style={tabButtonStyle(activeTab() === 'personal')}
                  onClick={() => setActiveTab('personal')}
                >
                  👤 {t('notary.tabs.personal', 'Información Personal')}
                </button>
                <button 
                  style={tabButtonStyle(activeTab() === 'residence')}
                  onClick={() => setActiveTab('residence')}
                >
                  🏠 {t('notary.tabs.residence', 'Residencias')}
                </button>
                <button 
                  style={tabButtonStyle(activeTab() === 'education')}
                  onClick={() => setActiveTab('education')}
                >
                  🎓 {t('notary.tabs.education', 'Educación')}
                </button>
                <button 
                  style={tabButtonStyle(activeTab() === 'employment')}
                  onClick={() => setActiveTab('employment')}
                >
                  💼 {t('notary.tabs.employment', 'Empleo')}
                </button>
                <button 
                  style={tabButtonStyle(activeTab() === 'immigration')}
                  onClick={() => setActiveTab('immigration')}
                >
                  ✈️ {t('notary.tabs.immigration', 'Inmigración')}
                </button>
                <button
                  style={tabButtonStyle(activeTab() === 'documents')}
                  onClick={() => setActiveTab('documents')}
                >
                  📄 {t('notary.tabs.documents', 'Documentos')}
                </button>
                <button
                  style={tabButtonStyle(activeTab() === 'upload')}
                  onClick={() => setActiveTab('upload')}
                >
                  📤 {t('notary.tabs.upload', 'Subir Documentos')}
                </button>
                <button
                  style={tabButtonStyle(activeTab() === 'templateFill')}
                  onClick={() => setActiveTab('templateFill')}
                >
                  📝 Llenar PDFs
                </button>
              </div>

              {/* Tab Content */}
              <div style={{ 'margin-top': '1.5rem' }}>
                {/* Personal Information Tab */}
                <Show when={activeTab() === 'personal'}>
                  <div style={sectionStyle}>
                    <h4 style={{ 'margin-bottom': '1rem', 'font-weight': '600' }}>
                      {t('notary.personal.basicInfo', 'Información Básica')}
                    </h4>
                    
                    <div style={fieldStyle}>
                      <span style={labelStyle}>{t('notary.field.fullName', 'Nombre Completo')}:</span>
                      <span style={valueStyle}>{fullName()}</span>
                    </div>
                    
                    <div style={fieldStyle}>
                      <span style={labelStyle}>{t('notary.field.gender', 'Género')}:</span>
                      <span style={valueStyle}>{customer()?.genre || '-'}</span>
                    </div>
                    
                    <div style={fieldStyle}>
                      <span style={labelStyle}>{t('notary.field.dateOfBirth', 'Fecha de Nacimiento')}:</span>
                      <span style={valueStyle}>{formatDate(customer()?.dateOfBirth)}</span>
                    </div>
                    
                    <div style={fieldStyle}>
                      <span style={labelStyle}>{t('notary.field.placeOfBirth', 'Lugar de Nacimiento')}:</span>
                      <span style={valueStyle}>
                        {customer()?.placeOfBirth ? 
                          `${customer()?.placeOfBirth.city || ''}, ${customer()?.placeOfBirth.state || ''}, ${customer()?.placeOfBirth.country || ''}` 
                          : '-'}
                      </span>
                    </div>
                    
                    <div style={fieldStyle}>
                      <span style={labelStyle}>{t('notary.field.race', 'Raza')}:</span>
                      <span style={valueStyle}>{customer()?.race || '-'}</span>
                    </div>
                    
                    <div style={fieldStyle}>
                      <span style={labelStyle}>{t('notary.field.ethnicity', 'Etnia')}:</span>
                      <span style={valueStyle}>{customer()?.ethnicity || '-'}</span>
                    </div>
                    
                    <div style={fieldStyle}>
                      <span style={labelStyle}>{t('notary.field.maritalStatus', 'Estado Civil')}:</span>
                      <span style={valueStyle}>{customer()?.maritalStatus || '-'}</span>
                    </div>
                    
                    <Show when={customer()?.isMarriage}>
                      <div style={fieldStyle}>
                        <span style={labelStyle}>{t('notary.field.marriageDate', 'Fecha de Matrimonio')}:</span>
                        <span style={valueStyle}>{formatDate(customer()?.marriage_date)}</span>
                      </div>
                      
                      <div style={fieldStyle}>
                        <span style={labelStyle}>{t('notary.field.marriagePlace', 'Lugar de Matrimonio')}:</span>
                        <span style={valueStyle}>
                          {customer()?.marriage_city ? 
                            `${customer()?.marriage_city}, ${customer()?.marriage_state || ''}, ${customer()?.marriage_country || ''}` 
                            : '-'}
                        </span>
                      </div>
                    </Show>
                    
                    <div style={fieldStyle}>
                      <span style={labelStyle}>{t('notary.field.height', 'Altura')}:</span>
                      <span style={valueStyle}>{customer()?.height ? `${customer()?.height} cm` : '-'}</span>
                    </div>
                    
                    <div style={fieldStyle}>
                      <span style={labelStyle}>{t('notary.field.weight', 'Peso')}:</span>
                      <span style={valueStyle}>{customer()?.weight ? `${customer()?.weight} lbs` : '-'}</span>
                    </div>
                    
                    <div style={fieldStyle}>
                      <span style={labelStyle}>{t('notary.field.hairColor', 'Color de Cabello')}:</span>
                      <span style={valueStyle}>{customer()?.hairColor || '-'}</span>
                    </div>
                    
                    <div style={fieldStyle}>
                      <span style={labelStyle}>{t('notary.field.eyeColor', 'Color de Ojos')}:</span>
                      <span style={valueStyle}>{customer()?.eyesColor || '-'}</span>
                    </div>
                  </div>
                </Show>

                {/* Residence Tab */}
                <Show when={activeTab() === 'residence'}>
                  <div>
                    <Show when={customer()?.residences && Object.keys(customer()!.residences!).length > 0}>
                      <For each={Object.entries(customer()!.residences!)}>
                        {([id, residence]) => (
                          <div style={{ ...sectionStyle, 'margin-bottom': '1rem' }}>
                            <h4 style={{ 'margin-bottom': '1rem', 'font-weight': '600' }}>
                              📍 {residence.addressLineOne || 'Dirección'}
                            </h4>
                            
                            <div style={fieldStyle}>
                              <span style={labelStyle}>{t('notary.field.address', 'Dirección')}:</span>
                              <span style={valueStyle}>
                                {residence.addressLineOne || ''} {residence.addressLineTwo || ''}
                              </span>
                            </div>
                            
                            <div style={fieldStyle}>
                              <span style={labelStyle}>{t('notary.field.cityStateZip', 'Ciudad, Estado, ZIP')}:</span>
                              <span style={valueStyle}>
                                {residence.city || ''}, {residence.state || ''} {residence.zipcode || ''}
                              </span>
                            </div>
                            
                            <div style={fieldStyle}>
                              <span style={labelStyle}>{t('notary.field.country', 'País')}:</span>
                              <span style={valueStyle}>{residence.country || '-'}</span>
                            </div>
                            
                            <div style={fieldStyle}>
                              <span style={labelStyle}>{t('notary.field.period', 'Período')}:</span>
                              <span style={valueStyle}>
                                {formatDateRange(residence.fromDate, residence.toDate)}
                              </span>
                            </div>
                          </div>
                        )}
                      </For>
                    </Show>
                    
                    <Show when={!customer()?.residences || Object.keys(customer()!.residences!).length === 0}>
                      <div style={{ 
                        'text-align': 'center', 
                        padding: '2rem',
                        color: 'var(--text-muted)'
                      }}>
                        {t('notary.noResidences', 'No hay residencias registradas')}
                      </div>
                    </Show>
                  </div>
                </Show>

                {/* Education Tab */}
                <Show when={activeTab() === 'education'}>
                  <div>
                    <Show when={customer()?.schoolHistory && Object.keys(customer()!.schoolHistory!).length > 0}>
                      <For each={Object.entries(customer()!.schoolHistory!)}>
                        {([id, school]) => (
                          <div style={{ ...sectionStyle, 'margin-bottom': '1rem' }}>
                            <h4 style={{ 'margin-bottom': '1rem', 'font-weight': '600' }}>
                              🎓 {school.schoolName || 'Institución Educativa'}
                            </h4>
                            
                            <div style={fieldStyle}>
                              <span style={labelStyle}>{t('notary.field.schoolType', 'Tipo')}:</span>
                              <span style={valueStyle}>{school.schoolType || '-'}</span>
                            </div>
                            
                            <div style={fieldStyle}>
                              <span style={labelStyle}>{t('notary.field.location', 'Ubicación')}:</span>
                              <span style={valueStyle}>
                                {school.city || ''}, {school.state || ''}, {school.country || ''}
                              </span>
                            </div>
                            
                            <div style={fieldStyle}>
                              <span style={labelStyle}>{t('notary.field.period', 'Período')}:</span>
                              <span style={valueStyle}>
                                {formatDateRange(school.fromDate, school.toDate)}
                              </span>
                            </div>
                          </div>
                        )}
                      </For>
                    </Show>
                    
                    <Show when={!customer()?.schoolHistory || Object.keys(customer()!.schoolHistory!).length === 0}>
                      <div style={{ 
                        'text-align': 'center', 
                        padding: '2rem',
                        color: 'var(--text-muted)'
                      }}>
                        {t('notary.noEducation', 'No hay historial educativo registrado')}
                      </div>
                    </Show>
                  </div>
                </Show>

                {/* Employment Tab */}
                <Show when={activeTab() === 'employment'}>
                  <div>
                    <Show when={customer()?.employers && Object.keys(customer()!.employers!).length > 0}>
                      <For each={Object.entries(customer()!.employers!)}>
                        {([id, employer]) => (
                          <div style={{ ...sectionStyle, 'margin-bottom': '1rem' }}>
                            <h4 style={{ 'margin-bottom': '1rem', 'font-weight': '600' }}>
                              💼 {employer.employerName || 'Empleador'}
                            </h4>
                            
                            <div style={fieldStyle}>
                              <span style={labelStyle}>{t('notary.field.occupation', 'Ocupación')}:</span>
                              <span style={valueStyle}>{employer.occupation || '-'}</span>
                            </div>
                            
                            <div style={fieldStyle}>
                              <span style={labelStyle}>{t('notary.field.address', 'Dirección')}:</span>
                              <span style={valueStyle}>{employer.addressLineOne || '-'}</span>
                            </div>
                            
                            <div style={fieldStyle}>
                              <span style={labelStyle}>{t('notary.field.location', 'Ubicación')}:</span>
                              <span style={valueStyle}>
                                {employer.city || ''}, {employer.state || ''} {employer.zipcode || ''}, {employer.country || ''}
                              </span>
                            </div>
                            
                            <div style={fieldStyle}>
                              <span style={labelStyle}>{t('notary.field.period', 'Período')}:</span>
                              <span style={valueStyle}>
                                {formatDateRange(employer.fromDate, employer.toDate)}
                              </span>
                            </div>
                          </div>
                        )}
                      </For>
                    </Show>
                    
                    <Show when={!customer()?.employers || Object.keys(customer()!.employers!).length === 0}>
                      <div style={{ 
                        'text-align': 'center', 
                        padding: '2rem',
                        color: 'var(--text-muted)'
                      }}>
                        {t('notary.noEmployment', 'No hay historial laboral registrado')}
                      </div>
                    </Show>
                  </div>
                </Show>

                {/* Immigration Tab */}
                <Show when={activeTab() === 'immigration'}>
                  <div>
                    <div style={sectionStyle}>
                      <h4 style={{ 'margin-bottom': '1rem', 'font-weight': '600' }}>
                        {t('notary.immigration.status', 'Estado Migratorio')}
                      </h4>
                      
                      <div style={fieldStyle}>
                        <span style={labelStyle}>{t('notary.field.citizenship', 'Ciudadanía')}:</span>
                        <span style={valueStyle}>{customer()?.countryOfCitizenship || '-'}</span>
                      </div>
                      
                      <div style={fieldStyle}>
                        <span style={labelStyle}>{t('notary.field.inUSA', 'En Estados Unidos')}:</span>
                        <span style={valueStyle}>{customer()?.isInUSA ? 'Sí' : 'No'}</span>
                      </div>
                      
                      <div style={fieldStyle}>
                        <span style={labelStyle}>{t('notary.field.currentLocation', 'Ubicación Actual')}:</span>
                        <span style={valueStyle}>
                          {customer()?.currentLocation ? 
                            `${customer()?.currentLocation.state || ''}, ${customer()?.currentLocation.country || ''}` 
                            : '-'}
                        </span>
                      </div>
                      
                      <div style={fieldStyle}>
                        <span style={labelStyle}>{t('notary.field.i589Date', 'Fecha I-589')}:</span>
                        <span style={valueStyle}>{formatDate(customer()?.dateOfAppI589)}</span>
                      </div>
                      
                      <div style={fieldStyle}>
                        <span style={labelStyle}>{t('notary.field.hasI94', 'Tiene I-94')}:</span>
                        <span style={valueStyle}>{customer()?.hasI94 ? 'Sí' : 'No'}</span>
                      </div>
                      
                      <div style={fieldStyle}>
                        <span style={labelStyle}>{t('notary.field.hasLPR', 'Tiene LPR')}:</span>
                        <span style={valueStyle}>{customer()?.hasLPR ? 'Sí' : 'No'}</span>
                      </div>
                    </div>
                    
                    <Show when={customer()?.entryRecord && Object.keys(customer()!.entryRecord!).length > 0}>
                      <div style={{ ...sectionStyle, 'margin-top': '1rem' }}>
                        <h4 style={{ 'margin-bottom': '1rem', 'font-weight': '600' }}>
                          {t('notary.immigration.entryRecords', 'Registros de Entrada')}
                        </h4>
                        
                        <For each={Object.entries(customer()!.entryRecord!)}>
                          {([id, entry]) => (
                            <div style={{ 
                              padding: '1rem',
                              background: 'white',
                              'border-radius': 'var(--border-radius-sm)',
                              'margin-bottom': '0.5rem'
                            }}>
                              <div style={fieldStyle}>
                                <span style={labelStyle}>{t('notary.field.entryDate', 'Fecha de Entrada')}:</span>
                                <span style={valueStyle}>{formatDate(entry.dateOfEntry)}</span>
                              </div>
                              
                              <div style={fieldStyle}>
                                <span style={labelStyle}>{t('notary.field.placeOfEntry', 'Lugar de Entrada')}:</span>
                                <span style={valueStyle}>{entry.placeOfEntry || '-'}, {entry.state || '-'}</span>
                              </div>
                              
                              <div style={fieldStyle}>
                                <span style={labelStyle}>{t('notary.field.status', 'Estado')}:</span>
                                <span style={valueStyle}>{entry.status || '-'}</span>
                              </div>
                              
                              <div style={fieldStyle}>
                                <span style={labelStyle}>{t('notary.field.lastLeft', 'Última Salida')}:</span>
                                <span style={valueStyle}>{formatDate(entry.lastLeftYourCountry)}</span>
                              </div>
                            </div>
                          )}
                        </For>
                      </div>
                    </Show>
                  </div>
                </Show>

                {/* Documents Tab */}
                <Show when={activeTab() === 'documents'}>
                  <div>
                    {/* Passport Information */}
                    <div style={sectionStyle}>
                      <h4 style={{ 'margin-bottom': '1rem', 'font-weight': '600' }}>
                        {t('notary.documents.passport', 'Información del Pasaporte')}
                      </h4>
                      
                      <div style={fieldStyle}>
                        <span style={labelStyle}>{t('notary.field.passportNumber', 'Número')}:</span>
                        <span style={valueStyle}>{customer()?.passportNumber || '-'}</span>
                      </div>
                      
                      <div style={fieldStyle}>
                        <span style={labelStyle}>{t('notary.field.passportExpiry', 'Vencimiento')}:</span>
                        <span style={valueStyle}>{formatDate(customer()?.passportExpire)}</span>
                      </div>
                      
                      <Show when={customer()?.passportRecord && Object.keys(customer()!.passportRecord!).length > 0}>
                        <div style={{ 'margin-top': '1rem' }}>
                          <h5 style={{ 'font-size': '0.9rem', 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
                            {t('notary.documents.passportHistory', 'Historial de Pasaportes')}
                          </h5>
                          
                          <For each={Object.entries(customer()!.passportRecord!)}>
                            {([id, passport]) => (
                              <div style={{ 
                                padding: '0.75rem',
                                background: 'white',
                                'border-radius': 'var(--border-radius-sm)',
                                'margin-bottom': '0.5rem',
                                'font-size': '0.875rem'
                              }}>
                                <div style={{ display: 'grid', gap: '0.5rem' }}>
                                  <div>
                                    <span style={{ 'font-weight': '500' }}>Pasaporte:</span> {passport.passportNumber || '-'}
                                  </div>
                                  <div>
                                    <span style={{ 'font-weight': '500' }}>País:</span> {passport.countryOfIssuance || '-'}
                                  </div>
                                  <div>
                                    <span style={{ 'font-weight': '500' }}>Emisión:</span> {formatDate(passport.issueDate)}
                                  </div>
                                  <div>
                                    <span style={{ 'font-weight': '500' }}>Vencimiento:</span> {formatDate(passport.expirationDate)}
                                  </div>
                                </div>
                              </div>
                            )}
                          </For>
                        </div>
                      </Show>
                    </div>
                    
                    {/* Document Images */}
                    <div style={{ ...sectionStyle, 'margin-top': '1rem' }}>
                      <h4 style={{ 'margin-bottom': '1rem', 'font-weight': '600' }}>
                        {t('notary.documents.images', 'Imágenes de Documentos')}
                      </h4>
                      
                      <div style={{ 
                        display: 'grid', 
                        'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '1rem'
                      }}>
                        <Show when={customer()?.passportImage}>
                          <div style={{ 
                            padding: '1rem',
                            background: 'white',
                            'border-radius': 'var(--border-radius-sm)',
                            'text-align': 'center'
                          }}>
                            <div style={{ 'font-size': '2rem', 'margin-bottom': '0.5rem' }}>📄</div>
                            <div style={{ 'font-size': '0.875rem', 'font-weight': '500' }}>
                              {t('notary.documents.passportImage', 'Imagen Pasaporte')}
                            </div>
                            <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                              {customer()?.passportImage}
                            </div>
                          </div>
                        </Show>
                        
                        <Show when={customer()?.imageUrlBCT}>
                          <div style={{ 
                            padding: '1rem',
                            background: 'white',
                            'border-radius': 'var(--border-radius-sm)',
                            'text-align': 'center'
                          }}>
                            <div style={{ 'font-size': '2rem', 'margin-bottom': '0.5rem' }}>📜</div>
                            <div style={{ 'font-size': '0.875rem', 'font-weight': '500' }}>
                              {t('notary.documents.birthCertificate', 'Certificado de Nacimiento')}
                            </div>
                            <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                              {customer()?.imageUrlBCT}
                            </div>
                          </div>
                        </Show>
                        
                        <Show when={customer()?.imageUrlMCT}>
                          <div style={{ 
                            padding: '1rem',
                            background: 'white',
                            'border-radius': 'var(--border-radius-sm)',
                            'text-align': 'center'
                          }}>
                            <div style={{ 'font-size': '2rem', 'margin-bottom': '0.5rem' }}>💑</div>
                            <div style={{ 'font-size': '0.875rem', 'font-weight': '500' }}>
                              {t('notary.documents.marriageCertificate', 'Certificado de Matrimonio')}
                            </div>
                            <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                              {customer()?.imageUrlMCT}
                            </div>
                          </div>
                        </Show>
                        
                        <Show when={customer()?.greenCardFrontImage}>
                          <div style={{ 
                            padding: '1rem',
                            background: 'white',
                            'border-radius': 'var(--border-radius-sm)',
                            'text-align': 'center'
                          }}>
                            <div style={{ 'font-size': '2rem', 'margin-bottom': '0.5rem' }}>🆔</div>
                            <div style={{ 'font-size': '0.875rem', 'font-weight': '500' }}>
                              {t('notary.documents.greenCardFront', 'Green Card (Frente)')}
                            </div>
                            <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                              {customer()?.greenCardFrontImage}
                            </div>
                          </div>
                        </Show>
                        
                        <Show when={customer()?.greenCardBackImage}>
                          <div style={{ 
                            padding: '1rem',
                            background: 'white',
                            'border-radius': 'var(--border-radius-sm)',
                            'text-align': 'center'
                          }}>
                            <div style={{ 'font-size': '2rem', 'margin-bottom': '0.5rem' }}>🆔</div>
                            <div style={{ 'font-size': '0.875rem', 'font-weight': '500' }}>
                              {t('notary.documents.greenCardBack', 'Green Card (Reverso)')}
                            </div>
                            <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                              {customer()?.greenCardBackImage}
                            </div>
                          </div>
                        </Show>
                      </div>
                    </div>
                    
                    {/* Signatures */}
                    <Show when={customer()?.signatures && Object.keys(customer()!.signatures!).length > 0}>
                      <div style={{ ...sectionStyle, 'margin-top': '1rem' }}>
                        <h4 style={{ 'margin-bottom': '1rem', 'font-weight': '600' }}>
                          {t('notary.documents.signatures', 'Firmas Registradas')}
                        </h4>
                        
                        <div style={{ 
                          display: 'grid', 
                          'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
                          gap: '1rem'
                        }}>
                          <For each={Object.entries(customer()!.signatures!)}>
                            {([id, signature]) => (
                              <div style={{ 
                                padding: '1rem',
                                background: 'white',
                                'border-radius': 'var(--border-radius-sm)',
                                'text-align': 'center'
                              }}>
                                <div style={{ 'font-size': '2rem', 'margin-bottom': '0.5rem' }}>✍️</div>
                                <div style={{ 'font-size': '0.875rem', 'font-weight': '500' }}>
                                  {t('notary.documents.signature', 'Firma')}
                                </div>
                                <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                                  {formatDate(signature.timeStamp)}
                                </div>
                              </div>
                            )}
                          </For>
                        </div>
                      </div>
                    </Show>
                    
                    {/* DOJ Document Generator */}
                    <div style={{ 'margin-top': '2rem' }}>
                      <Show when={customer()}>
                        <DOJDocumentGeneratorSolid customer={customer()!} />
                      </Show>
                    </div>
                  </div>
                </Show>

                {/* Upload Documents Tab */}
                <Show when={activeTab() === 'upload'}>
                  <DocumentUploader
                    clientNotaryId={customer()!.clientNotaryId!}
                    onDocumentSaved={handleDocumentSaved}
                    existingDocuments={uploadedDocuments()}
                  />
                </Show>

                {/* Template PDF Filler Tab */}
                <Show when={activeTab() === 'templateFill'}>
                  <TemplatePDFFiller customer={customer()!} />
                </Show>
              </div>
            </div>
          </Show>
        </Show>
      </div>
    </Card>
  );
};

export default NotaryCustomerDetail;