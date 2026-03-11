import { Component, createSignal, createMemo, onMount, Show, For } from 'solid-js';
import { Button, Card, FormInput, FormSelect, Modal } from '../modules/ui';
import { 
  Consignee, 
  CreateConsigneeInput, 
  UpdateConsigneeInput,
  ValidationErrors 
} from '../types/shippingTypes';
import consigneeService from '../services/consigneeService';
import { useTranslation } from '../translations';
import Icon from './Icon';
import { authStore } from '../stores/authStore';
import { devLog } from '../services/utils';

const ConsigneeManagement: Component = () => {
  const { t } = useTranslation();
  
  // State
  const [consignees, setConsignees] = createSignal<Consignee[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [searchTerm, setSearchTerm] = createSignal('');
  const [showModal, setShowModal] = createSignal(false);
  const [editingConsignee, setEditingConsignee] = createSignal<Consignee | null>(null);
  const [selectedBusinessId, setSelectedBusinessId] = createSignal<string>('all');
  const [availableBusinessIds, setAvailableBusinessIds] = createSignal<string[]>(['all']);
  const [formData, setFormData] = createSignal<CreateConsigneeInput>({
    fullName: '',
    firstName: '',
    middleName: '',
    lastName: '',
    lastName2: '',
    passport: '',
    cid: '',
    nacionality: '',
    phoneNumber: '',
    altPhoneNumber: '',
    ybstreet: '',
    ybstreetNo: '',
    ybbetwen1: '',
    ybbetwen2: '',
    ybreparto: '',
    ybapt: '',
    ybcity: '',
    ybestate: '',
    email: '',
    comment: '',
    businessId: 'all'
  });
  const [errors, setErrors] = createSignal<ValidationErrors>({});
  const [message, setMessage] = createSignal<{ type: 'success' | 'error', text: string } | null>(null);

  // Countries list
  const countries = [
    'Estados Unidos', 'Cuba', 'México', 'Canadá', 'España', 'Francia', 
    'Alemania', 'Reino Unido', 'Italia', 'China', 'Japón', 'Brasil'
  ];

  // Load consignees on mount
  onMount(() => {
    // If admin, load available business IDs
    if (authStore.isAdmin()) {
      // You can add logic here to fetch available business IDs from your API
      // For now, using a static list
      setAvailableBusinessIds(['all', 'business1', 'business2', 'business3']);
    } else {
      // Regular users only see their own businessId
      const userBusinessId = authStore.getBusinessId() || 'all';
      setSelectedBusinessId(userBusinessId);
      setAvailableBusinessIds([userBusinessId]);
    }
    loadConsignees();
  });

  // Filtered consignees
  const filteredConsignees = createMemo(() => {
    let filtered = consignees();
    
    // Filter by businessId if not 'all'
    if (selectedBusinessId() !== 'all') {
      filtered = filtered.filter(consignee => consignee.businessId === selectedBusinessId());
    }
    
    // Filter by search term
    if (searchTerm()) {
      filtered = filtered.filter(consignee =>
        consignee.fullName.toLowerCase().includes(searchTerm().toLowerCase()) ||
        consignee.firstName.toLowerCase().includes(searchTerm().toLowerCase()) ||
        consignee.lastName.toLowerCase().includes(searchTerm().toLowerCase()) ||
        consignee.cid.toLowerCase().includes(searchTerm().toLowerCase()) ||
        (consignee.email && consignee.email.toLowerCase().includes(searchTerm().toLowerCase()))
      );
    }
    
    return filtered;
  });

  const loadConsignees = async () => {
    try {
      setLoading(true);
      setMessage(null);
      const data = await consigneeService.getConsignees(searchTerm(), selectedBusinessId());
      devLog(JSON.stringify(data));
      setConsignees(data);
    } catch (error) {
      console.error('Error loading consignees:', error);
      setMessage({ 
        type: 'error', 
        text: t('consignee.messages.loadError')
      });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const data = formData();
    const newErrors: ValidationErrors = {};

    if (!data.firstName.trim()) {
      newErrors.firstName = t('consignee.validation.nameRequired');
    }

    if (!data.lastName.trim()) {
      newErrors.lastName = t('consignee.validation.lastNameRequired');
    }

    if (!data.cid.trim()) {
      newErrors.cid = t('consignee.validation.cidRequired');
    }

    if (!data.ybstreet.trim()) {
      newErrors.ybstreet = t('consignee.validation.streetRequired');
    }

    if (!data.ybcity.trim()) {
      newErrors.ybcity = t('consignee.validation.cityRequired');
    }

    if (!data.ybestate.trim()) {
      newErrors.ybestate = t('consignee.validation.stateRequired');
    }

    if (!data.nacionality.trim()) {
      newErrors.nacionality = t('consignee.validation.nationalityRequired');
    }

    if (data.email && !/\S+@\S+\.\S+/.test(data.email)) {
      newErrors.email = t('consignee.validation.emailInvalid');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      setMessage(null);

      if (editingConsignee()) {
        await consigneeService.updateConsignee(
          editingConsignee()!.id,
          formData() as UpdateConsigneeInput
        );
        setMessage({ 
          type: 'success', 
          text: t('consignee.messages.updateSuccess')
        });
      } else {
        await consigneeService.createConsignee(formData());
        setMessage({ 
          type: 'success', 
          text: t('consignee.messages.createSuccess')
        });
      }

      await loadConsignees();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving consignee:', error);
      setMessage({ 
        type: 'error', 
        text: editingConsignee() 
          ? t('consignee.messages.updateError')
          : t('consignee.messages.createError')
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (consignee: Consignee) => {
    setEditingConsignee(consignee);
    setFormData({
      fullName: consignee.fullName,
      firstName: consignee.firstName,
      middleName: consignee.middleName || '',
      lastName: consignee.lastName,
      lastName2: consignee.lastName2 || '',
      passport: consignee.passport || '',
      cid: consignee.cid,
      nacionality: consignee.nacionality,
      phoneNumber: consignee.phoneNumber,
      altPhoneNumber: consignee.altPhoneNumber || '',
      ybstreet: consignee.ybstreet,
      ybstreetNo: consignee.ybstreetNo,
      ybbetwen1: consignee.ybbetwen1 || '',
      ybbetwen2: consignee.ybbetwen2 || '',
      ybreparto: consignee.ybreparto || '',
      ybapt: consignee.ybapt || '',
      ybcity: consignee.ybcity,
      ybestate: consignee.ybestate,
      email: consignee.email || '',
      comment: consignee.comment || '',
      businessId: consignee.businessId
    });
    setShowModal(true);
  };

  const handleDelete = async (consignee: Consignee) => {
    if (!confirm(t('consignee.deleteConfirm'))) return;

    try {
      setLoading(true);
      await consigneeService.deleteConsignee(consignee.id);
      setMessage({ 
        type: 'success', 
        text: t('consignee.messages.deleteSuccess')
      });
      await loadConsignees();
    } catch (error) {
      console.error('Error deleting consignee:', error);
      setMessage({ 
        type: 'error', 
        text: t('consignee.messages.deleteError')
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (consignee: Consignee) => {
    // Status toggle not available in current schema
    setMessage({ 
      type: 'error', 
      text: 'Estado no disponible en el esquema actual'
    });
  };

  const handleOpenModal = () => {
    setEditingConsignee(null);
    setFormData({
      fullName: '',
      firstName: '',
      middleName: '',
      lastName: '',
      lastName2: '',
      passport: '',
      cid: '',
      nacionality: '',
      phoneNumber: '',
      altPhoneNumber: '',
      ybstreet: '',
      ybstreetNo: '',
      ybbetwen1: '',
      ybbetwen2: '',
      ybreparto: '',
      ybapt: '',
      ybcity: '',
      ybestate: '',
      email: '',
      comment: '',
      businessId: 'all'
    });
    setErrors({});
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingConsignee(null);
    setErrors({});
  };

  const updateFormField = (path: string[], value: any) => {
    setFormData(prev => {
      const newData = { ...prev };
      let current: any = newData;
      
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]] = { ...current[path[i]] };
      }
      
      current[path[path.length - 1]] = value;
      return newData;
    });
  };

  return (
    <div style={{ padding: '2rem', 'max-width': '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ 'margin-bottom': '2rem', 'text-align': 'center' }}>
        <h1 style={{ 'font-size': '2rem', 'font-weight': '700', color: 'var(--text-primary)' }}>
          {t('consignee.pageTitle')}
        </h1>
        <p style={{ color: 'var(--text-muted)', 'font-size': '1.125rem' }}>
          {t('consignee.pageSubtitle')}
        </p>
      </div>

      {/* Controls */}
      <div style={{ 
        display: 'flex', 
        'flex-direction': 'column',
        gap: '1rem',
        'margin-bottom': '2rem'
      }}>
        {/* Admin Business ID Selector */}
        <Show when={authStore.isAdmin() && availableBusinessIds().length > 1}>
          <div style={{ 
            display: 'flex', 
            gap: '1rem', 
            'align-items': 'center',
            padding: '1rem',
            background: 'var(--bg-secondary)',
            'border-radius': 'var(--border-radius)',
            border: '1px solid var(--border-color)'
          }}>
            <span style={{ 'font-weight': '500' }}>Filtrar por Business ID:</span>
            <FormSelect
              value={selectedBusinessId()}
              onChange={(value) => {
                setSelectedBusinessId(value);
                loadConsignees();
              }}
              options={availableBusinessIds().map(id => ({ 
                value: id, 
                label: id === 'all' ? 'Todos los negocios' : `Business ID: ${id}` 
              }))}
              style={{ 'min-width': '200px' }}
            />
          </div>
        </Show>
        
        {/* Search and Create Controls */}
        <div style={{ 
          display: 'flex', 
          'justify-content': 'space-between', 
          'align-items': 'center',
          gap: '1rem',
          'flex-wrap': 'wrap'
        }}>
          <div style={{ display: 'flex', gap: '1rem', 'align-items': 'center' }}>
            <FormInput
              placeholder="Buscar consignatarios..."
              value={searchTerm()}
              onChange={setSearchTerm}
              style={{ 'min-width': '300px' }}
            />
            <Button onClick={loadConsignees} disabled={loading()}>
              <Icon name="search" size="1em" style={{ 'margin-right': '0.5rem' }} />
              Buscar
            </Button>
          </div>
          
          <Button 
            onClick={handleOpenModal} 
            variant="primary"
            disabled={loading()}
          >
            <Icon name="add" size="1em" style={{ 'margin-right': '0.5rem' }} />
            {t('consignee.createNew')}
          </Button>
        </div>
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
          <strong>{message()!.type === 'success' ? '✓ Éxito:' : '⚠ Error:'}</strong> {message()!.text}
        </div>
      </Show>

      {/* Consignees List */}
      <Card>
        <div style={{ padding: '1.5rem' }}>
          <Show when={loading()} fallback={
            <Show when={filteredConsignees().length > 0} fallback={
              <div style={{ 'text-align': 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                <Icon name="customer" size="3rem" style={{ opacity: '0.3', 'margin-bottom': '1rem' }} />
                <p>{t('consignee.messages.noRecords')}</p>
              </div>
            }>
              <div style={{ 'overflow-x': 'auto' }}>
                <table style={{ width: '100%', 'border-collapse': 'collapse' }}>
                  <thead>
                    <tr style={{ 'border-bottom': '2px solid var(--border-color)' }}>
                      <th style={{ padding: '1rem', 'text-align': 'left' }}>Nombre Completo</th>
                      <th style={{ padding: '1rem', 'text-align': 'left' }}>CID</th>
                      <th style={{ padding: '1rem', 'text-align': 'left' }}>Teléfono</th>
                      <th style={{ padding: '1rem', 'text-align': 'left' }}>Email</th>
                      <th style={{ padding: '1rem', 'text-align': 'left' }}>Dirección</th>
                      <th style={{ padding: '1rem', 'text-align': 'left' }}>Nacionalidad</th>
                      <Show when={authStore.isAdmin()}>
                        <th style={{ padding: '1rem', 'text-align': 'left' }}>Business ID</th>
                      </Show>
                      <th style={{ padding: '1rem', 'text-align': 'center' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={filteredConsignees()}>
                      {(consignee) => (
                        <tr style={{ 'border-bottom': '1px solid var(--border-light)' }}>
                          <td style={{ padding: '1rem' }}>{consignee.fullName}</td>
                          <td style={{ padding: '1rem' }}>{consignee.cid}</td>
                          <td style={{ padding: '1rem' }}>{consignee.phoneNumber}</td>
                          <td style={{ padding: '1rem' }}>{consignee.email || '-'}</td>
                          <td style={{ padding: '1rem', 'font-size': '0.875rem' }}>
                            {consignee.ybstreet} #{consignee.ybstreetNo}
                            {consignee.ybbetwen1 && consignee.ybbetwen2 && ` e/ ${consignee.ybbetwen1} y ${consignee.ybbetwen2}`}
                            {consignee.ybreparto && `, ${consignee.ybreparto}`}
                            {consignee.ybapt && `, Apto ${consignee.ybapt}`}
                            <br />
                            {consignee.ybcity}, {consignee.ybestate}
                          </td>
                          <td style={{ padding: '1rem' }}>{consignee.nacionality}</td>
                          <Show when={authStore.isAdmin()}>
                            <td style={{ padding: '1rem' }}>
                              <span style={{
                                padding: '0.25rem 0.5rem',
                                'border-radius': '4px',
                                'font-size': '0.875rem',
                                background: 'var(--bg-secondary)',
                                color: 'var(--text-primary)'
                              }}>
                                {consignee.businessId}
                              </span>
                            </td>
                          </Show>
                          <td style={{ padding: '1rem', 'text-align': 'center' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', 'justify-content': 'center' }}>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleEdit(consignee)}
                              >
                                <Icon name="edit" size="0.875rem" />
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleDelete(consignee)}
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
              <p>Cargando...</p>
            </div>
          </Show>
        </div>
      </Card>

      {/* Create/Edit Modal */}
      <Modal 
        isOpen={showModal()} 
        onClose={handleCloseModal}
        size="large"
      >
        <div style={{ padding: '2rem' }}>
          <h2 style={{ 'margin-bottom': '1.5rem' }}>
            {editingConsignee() ? t('consignee.editConsignee') : t('consignee.createNew')}
          </h2>

          {/* Basic Information */}
          <Card style={{ 'margin-bottom': '1.5rem' }}>
            <div style={{ padding: '1.5rem' }}>
              <h3 style={{ 'margin-bottom': '1rem' }}>Información Personal</h3>
              <div style={{ 
                display: 'grid', 
                'grid-template-columns': 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1rem' 
              }}>
                <FormInput
                  label="Primer Nombre *"
                  value={formData().firstName}
                  onChange={(value) => {
                    updateFormField(['firstName'], value);
                    // Update fullName automatically
                    const data = formData();
                    const fullName = [data.firstName, data.middleName, data.lastName, data.lastName2]
                      .filter(Boolean)
                      .join(' ');
                    updateFormField(['fullName'], fullName);
                  }}
                  placeholder="Primer nombre"
                  error={errors().firstName as string}
                />
                <FormInput
                  label="Segundo Nombre"
                  value={formData().middleName || ''}
                  onChange={(value) => {
                    updateFormField(['middleName'], value);
                    // Update fullName automatically
                    const data = formData();
                    const fullName = [data.firstName, value, data.lastName, data.lastName2]
                      .filter(Boolean)
                      .join(' ');
                    updateFormField(['fullName'], fullName);
                  }}
                  placeholder="Segundo nombre"
                />
                <FormInput
                  label="Primer Apellido *"
                  value={formData().lastName}
                  onChange={(value) => {
                    updateFormField(['lastName'], value);
                    // Update fullName automatically
                    const data = formData();
                    const fullName = [data.firstName, data.middleName, value, data.lastName2]
                      .filter(Boolean)
                      .join(' ');
                    updateFormField(['fullName'], fullName);
                  }}
                  placeholder="Primer apellido"
                  error={errors().lastName as string}
                />
                <FormInput
                  label="Segundo Apellido"
                  value={formData().lastName2 || ''}
                  onChange={(value) => {
                    updateFormField(['lastName2'], value);
                    // Update fullName automatically
                    const data = formData();
                    const fullName = [data.firstName, data.middleName, data.lastName, value]
                      .filter(Boolean)
                      .join(' ');
                    updateFormField(['fullName'], fullName);
                  }}
                  placeholder="Segundo apellido"
                />
                <FormInput
                  label="CID *"
                  value={formData().cid}
                  onChange={(value) => updateFormField(['cid'], value)}
                  placeholder="Número de identidad"
                  error={errors().cid as string}
                />
                <FormInput
                  label="Pasaporte"
                  value={formData().passport || ''}
                  onChange={(value) => updateFormField(['passport'], value)}
                  placeholder="Número de pasaporte"
                />
                <FormSelect
                  label="Nacionalidad *"
                  value={formData().nacionality}
                  onChange={(value) => updateFormField(['nacionality'], value)}
                  options={[
                    { value: 'CUB', label: 'Cubana' },
                    { value: 'USA', label: 'Estadounidense' },
                    { value: 'MEX', label: 'Mexicana' },
                    { value: 'ESP', label: 'Española' },
                    { value: 'OTHER', label: 'Otra' }
                  ]}
                  error={errors().nacionality as string}
                />
              </div>
            </div>
          </Card>

          {/* Address Information */}
          <Card style={{ 'margin-bottom': '1.5rem' }}>
            <div style={{ padding: '1.5rem' }}>
              <h3 style={{ 'margin-bottom': '1rem' }}>Dirección en Cuba</h3>
              <div style={{ 
                display: 'grid', 
                'grid-template-columns': 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1rem' 
              }}>
                <FormInput
                  label="Calle *"
                  value={formData().ybstreet}
                  onChange={(value) => updateFormField(['ybstreet'], value)}
                  placeholder="Nombre de la calle"
                  error={errors().ybstreet as string}
                />
                <FormInput
                  label="Número *"
                  value={formData().ybstreetNo}
                  onChange={(value) => updateFormField(['ybstreetNo'], value)}
                  placeholder="Número de la casa"
                  error={errors().ybstreetNo as string}
                />
                <FormInput
                  label="Entre"
                  value={formData().ybbetwen1 || ''}
                  onChange={(value) => updateFormField(['ybbetwen1'], value)}
                  placeholder="Primera calle"
                />
                <FormInput
                  label="Y"
                  value={formData().ybbetwen2 || ''}
                  onChange={(value) => updateFormField(['ybbetwen2'], value)}
                  placeholder="Segunda calle"
                />
                <FormInput
                  label="Reparto"
                  value={formData().ybreparto || ''}
                  onChange={(value) => updateFormField(['ybreparto'], value)}
                  placeholder="Nombre del reparto"
                />
                <FormInput
                  label="Apartamento"
                  value={formData().ybapt || ''}
                  onChange={(value) => updateFormField(['ybapt'], value)}
                  placeholder="Número de apartamento"
                />
                <FormInput
                  label="Ciudad *"
                  value={formData().ybcity}
                  onChange={(value) => updateFormField(['ybcity'], value)}
                  placeholder="Ciudad"
                  error={errors().ybcity as string}
                />
                <FormSelect
                  label="Provincia *"
                  value={formData().ybestate}
                  onChange={(value) => updateFormField(['ybestate'], value)}
                  options={[
                    { value: 'PINAR DEL RIO', label: 'Pinar del Río' },
                    { value: 'ARTEMISA', label: 'Artemisa' },
                    { value: 'LA HABANA', label: 'La Habana' },
                    { value: 'MAYABEQUE', label: 'Mayabeque' },
                    { value: 'MATANZAS', label: 'Matanzas' },
                    { value: 'VILLA CLARA', label: 'Villa Clara' },
                    { value: 'CIENFUEGOS', label: 'Cienfuegos' },
                    { value: 'SANCTI SPIRITUS', label: 'Sancti Spíritus' },
                    { value: 'CIEGO DE AVILA', label: 'Ciego de Ávila' },
                    { value: 'CAMAGUEY', label: 'Camagüey' },
                    { value: 'LAS TUNAS', label: 'Las Tunas' },
                    { value: 'HOLGUIN', label: 'Holguín' },
                    { value: 'GRANMA', label: 'Granma' },
                    { value: 'SANTIAGO DE CUBA', label: 'Santiago de Cuba' },
                    { value: 'GUANTANAMO', label: 'Guantánamo' },
                    { value: 'ISLA DE LA JUVENTUD', label: 'Isla de la Juventud' }
                  ]}
                  error={errors().ybestate as string}
                />
              </div>
            </div>
          </Card>

          {/* Contact Information */}
          <Card style={{ 'margin-bottom': '1.5rem' }}>
            <div style={{ padding: '1.5rem' }}>
              <h3 style={{ 'margin-bottom': '1rem' }}>Información de Contacto</h3>
              <div style={{ 
                display: 'grid', 
                'grid-template-columns': 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1rem' 
              }}>
                <FormInput
                  label="Teléfono Principal *"
                  value={formData().phoneNumber}
                  onChange={(value) => updateFormField(['phoneNumber'], value)}
                  placeholder="Teléfono principal"
                  error={errors().phoneNumber as string}
                />
                <FormInput
                  label="Teléfono Alternativo"
                  value={formData().altPhoneNumber || ''}
                  onChange={(value) => updateFormField(['altPhoneNumber'], value)}
                  placeholder="Teléfono alternativo"
                />
                <FormInput
                  label="Email"
                  type="email"
                  value={formData().email || ''}
                  onChange={(value) => updateFormField(['email'], value)}
                  placeholder="Correo electrónico"
                  error={errors().email as string}
                />
              </div>
            </div>
          </Card>

          {/* Additional Information */}
          <Card style={{ 'margin-bottom': '1.5rem' }}>
            <div style={{ padding: '1.5rem' }}>
              <h3 style={{ 'margin-bottom': '1rem' }}>Información Adicional</h3>
              <FormInput
                label="Comentarios"
                value={formData().comment || ''}
                onChange={(value) => updateFormField(['comment'], value)}
                placeholder="Comentarios adicionales"
                multiline={true}
                rows={3}
              />
            </div>
          </Card>

          {/* Business ID Selection for Admin */}
          <Show when={authStore.isAdmin()}>
            <Card style={{ 'margin-bottom': '1.5rem' }}>
              <div style={{ padding: '1.5rem' }}>
                <h3 style={{ 'margin-bottom': '1rem' }}>Configuración de Negocio</h3>
                <FormSelect
                  label="Business ID *"
                  value={formData().businessId || 'all'}
                  onChange={(value) => updateFormField(['businessId'], value)}
                  options={[
                    { value: 'all', label: 'Todos los negocios' },
                    { value: 'business1', label: 'Business 1' },
                    { value: 'business2', label: 'Business 2' },
                    { value: 'business3', label: 'Business 3' }
                  ]}
                />
                <p style={{ 
                  'margin-top': '0.5rem', 
                  'font-size': '0.875rem', 
                  color: 'var(--text-muted)' 
                }}>
                  Selecciona el Business ID al que pertenece este consignatario
                </p>
              </div>
            </Card>
          </Show>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '1rem', 'justify-content': 'flex-end' }}>
            <Button 
              variant="outline" 
              onClick={handleCloseModal}
              disabled={loading()}
            >
              Cancelar
            </Button>
            <Button 
              variant="primary" 
              onClick={handleSubmit}
              disabled={loading()}
            >
              {loading() ? 'Guardando...' : (editingConsignee() ? 'Actualizar' : 'Crear')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ConsigneeManagement;