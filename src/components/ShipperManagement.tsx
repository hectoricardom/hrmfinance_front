import { Component, createSignal, createMemo, onMount, Show, For } from 'solid-js';
import { Button, Card, FormInput, FormSelect, Modal } from '../modules/ui';
import { 
  Shipper, 
  CreateShipperInput, 
  UpdateShipperInput,
  ValidationErrors 
} from '../types/shippingTypes';
import shipperService from '../services/shipperService';
import { useTranslation } from '../translations';
import Icon from './Icon';

const ShipperManagement: Component = () => {
  const { t } = useTranslation();
  
  // State
  const [shippers, setShippers] = createSignal<Shipper[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [searchTerm, setSearchTerm] = createSignal('');
  const [showModal, setShowModal] = createSignal(false);
  const [editingShipper, setEditingShipper] = createSignal<Shipper | null>(null);
  const [formData, setFormData] = createSignal<CreateShipperInput>({
    name: '',
    companyName: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    },
    contact: {
      phone: '',
      email: '',
      fax: ''
    },
    taxId: '',
    licenseNumber: '',
    insuranceInfo: {
      provider: '',
      policyNumber: '',
      expirationDate: ''
    },
    notes: '',
    isActive: true
  });
  const [errors, setErrors] = createSignal<ValidationErrors>({});
  const [message, setMessage] = createSignal<{ type: 'success' | 'error', text: string } | null>(null);

  // Countries list
  const countries = [
    'Estados Unidos', 'Cuba', 'México', 'Canadá', 'España', 'Francia', 
    'Alemania', 'Reino Unido', 'Italia', 'China', 'Japón', 'Brasil'
  ];

  // Load shippers on mount
  onMount(() => {
    loadShippers();
  });

  // Filtered shippers
  const filteredShippers = createMemo(() => {
    if (!searchTerm()) return shippers();
    
    return shippers().filter(shipper =>
      shipper.name.toLowerCase().includes(searchTerm().toLowerCase()) ||
      shipper.companyName?.toLowerCase().includes(searchTerm().toLowerCase()) ||
      shipper.contact.email.toLowerCase().includes(searchTerm().toLowerCase()) ||
      shipper.licenseNumber?.toLowerCase().includes(searchTerm().toLowerCase())
    );
  });

  const loadShippers = async () => {
    try {
      setLoading(true);
      setMessage(null);
      const data = await shipperService.getShippers();
      setShippers(data);
    } catch (error) {
      console.error('Error loading shippers:', error);
      setMessage({ 
        type: 'error', 
        text: t('shipper.messages.loadError')
      });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const data = formData();
    const newErrors: ValidationErrors = {};

    if (!data.name.trim()) {
      newErrors.name = t('shipper.validation.nameRequired');
    }

    if (!data.address.street.trim()) {
      newErrors.street = t('shipper.validation.streetRequired');
    }

    if (!data.address.city.trim()) {
      newErrors.city = t('shipper.validation.cityRequired');
    }

    if (!data.address.country.trim()) {
      newErrors.country = t('shipper.validation.countryRequired');
    }

    if (data.contact.email && !/\S+@\S+\.\S+/.test(data.contact.email)) {
      newErrors.email = t('shipper.validation.emailInvalid');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      setMessage(null);

      if (editingShipper()) {
        await shipperService.updateShipper(
          editingShipper()!.id,
          formData() as UpdateShipperInput
        );
        setMessage({ 
          type: 'success', 
          text: t('shipper.messages.updateSuccess')
        });
      } else {
        await shipperService.createShipper(formData());
        setMessage({ 
          type: 'success', 
          text: t('shipper.messages.createSuccess')
        });
      }

      await loadShippers();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving shipper:', error);
      setMessage({ 
        type: 'error', 
        text: editingShipper() 
          ? t('shipper.messages.updateError')
          : t('shipper.messages.createError')
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (shipper: Shipper) => {
    setEditingShipper(shipper);
    setFormData({
      name: shipper.name,
      companyName: shipper.companyName || '',
      address: shipper.address,
      contact: shipper.contact,
      taxId: shipper.taxId || '',
      licenseNumber: shipper.licenseNumber || '',
      insuranceInfo: shipper.insuranceInfo || {
        provider: '',
        policyNumber: '',
        expirationDate: ''
      },
      notes: shipper.notes || '',
      isActive: shipper.isActive
    });
    setShowModal(true);
  };

  const handleDelete = async (shipper: Shipper) => {
    if (!confirm(t('shipper.deleteConfirm'))) return;

    try {
      setLoading(true);
      await shipperService.deleteShipper(shipper.id);
      setMessage({ 
        type: 'success', 
        text: t('shipper.messages.deleteSuccess')
      });
      await loadShippers();
    } catch (error) {
      console.error('Error deleting shipper:', error);
      setMessage({ 
        type: 'error', 
        text: t('shipper.messages.deleteError')
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (shipper: Shipper) => {
    try {
      setLoading(true);
      await shipperService.toggleShipperStatus(shipper.id, !shipper.isActive);
      setMessage({ 
        type: 'success', 
        text: t('shipper.messages.statusChanged')
      });
      await loadShippers();
    } catch (error) {
      console.error('Error changing shipper status:', error);
      setMessage({ 
        type: 'error', 
        text: t('shipper.messages.updateError')
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    setEditingShipper(null);
    setFormData({
      name: '',
      companyName: '',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: ''
      },
      contact: {
        phone: '',
        email: '',
        fax: ''
      },
      taxId: '',
      licenseNumber: '',
      insuranceInfo: {
        provider: '',
        policyNumber: '',
        expirationDate: ''
      },
      notes: '',
      isActive: true
    });
    setErrors({});
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingShipper(null);
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

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('es-ES');
    } catch {
      return dateString;
    }
  };

  return (
    <div style={{ padding: '2rem', 'max-width': '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ 'margin-bottom': '2rem', 'text-align': 'center' }}>
        <h1 style={{ 'font-size': '2rem', 'font-weight': '700', color: 'var(--text-primary)' }}>
          {t('shipper.pageTitle')}
        </h1>
        <p style={{ color: 'var(--text-muted)', 'font-size': '1.125rem' }}>
          {t('shipper.pageSubtitle')}
        </p>
      </div>

      {/* Controls */}
      <div style={{ 
        display: 'flex', 
        'justify-content': 'space-between', 
        'align-items': 'center', 
        'margin-bottom': '2rem',
        gap: '1rem',
        'flex-wrap': 'wrap'
      }}>
        <div style={{ display: 'flex', gap: '1rem', 'align-items': 'center' }}>
          <FormInput
            placeholder="Buscar transportistas..."
            value={searchTerm()}
            onChange={setSearchTerm}
            style={{ 'min-width': '300px' }}
          />
          <Button onClick={loadShippers} disabled={loading()}>
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
          {t('shipper.createNew')}
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
          <strong>{message()!.type === 'success' ? '✓ Éxito:' : '⚠ Error:'}</strong> {message()!.text}
        </div>
      </Show>

      {/* Shippers List */}
      <Card>
        <div style={{ padding: '1.5rem' }}>
          <Show when={loading()} fallback={
            <Show when={filteredShippers().length > 0} fallback={
              <div style={{ 'text-align': 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                <Icon name="shipping" size="3rem" style={{ opacity: '0.3', 'margin-bottom': '1rem' }} />
                <p>{t('shipper.messages.noRecords')}</p>
              </div>
            }>
              <div style={{ 'overflow-x': 'auto' }}>
                <table style={{ width: '100%', 'border-collapse': 'collapse' }}>
                  <thead>
                    <tr style={{ 'border-bottom': '2px solid var(--border-color)' }}>
                      <th style={{ padding: '1rem', 'text-align': 'left' }}>{t('shipper.fields.name')}</th>
                      <th style={{ padding: '1rem', 'text-align': 'left' }}>{t('shipper.fields.companyName')}</th>
                      <th style={{ padding: '1rem', 'text-align': 'left' }}>{t('shipper.fields.licenseNumber')}</th>
                      <th style={{ padding: '1rem', 'text-align': 'left' }}>{t('shipper.fields.email')}</th>
                      <th style={{ padding: '1rem', 'text-align': 'left' }}>{t('shipper.fields.city')}</th>
                      <th style={{ padding: '1rem', 'text-align': 'center' }}>Estado</th>
                      <th style={{ padding: '1rem', 'text-align': 'center' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={filteredShippers()}>
                      {(shipper) => (
                        <tr style={{ 'border-bottom': '1px solid var(--border-light)' }}>
                          <td style={{ padding: '1rem' }}>{shipper.name}</td>
                          <td style={{ padding: '1rem' }}>{shipper.companyName || '-'}</td>
                          <td style={{ padding: '1rem' }}>{shipper.licenseNumber || '-'}</td>
                          <td style={{ padding: '1rem' }}>{shipper.contact.email || '-'}</td>
                          <td style={{ padding: '1rem' }}>{shipper.address.city}, {shipper.address.country}</td>
                          <td style={{ padding: '1rem', 'text-align': 'center' }}>
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              'border-radius': '4px',
                              'font-size': '0.875rem',
                              background: shipper.isActive ? 'var(--success-light)' : 'var(--error-light)',
                              color: shipper.isActive ? 'var(--success-dark)' : 'var(--error-dark)'
                            }}>
                              {shipper.isActive ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td style={{ padding: '1rem', 'text-align': 'center' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', 'justify-content': 'center' }}>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleEdit(shipper)}
                              >
                                <Icon name="edit" size="0.875rem" />
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleToggleStatus(shipper)}
                              >
                                <Icon name={shipper.isActive ? 'close' : 'check'} size="0.875rem" />
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleDelete(shipper)}
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
            {editingShipper() ? t('shipper.editShipper') : t('shipper.createNew')}
          </h2>

          {/* Basic Information */}
          <Card style={{ 'margin-bottom': '1.5rem' }}>
            <div style={{ padding: '1.5rem' }}>
              <h3 style={{ 'margin-bottom': '1rem' }}>Información Básica</h3>
              <div style={{ 
                display: 'grid', 
                'grid-template-columns': 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1rem' 
              }}>
                <FormInput
                  label={`${t('shipper.fields.name')} *`}
                  value={formData().name}
                  onChange={(value) => updateFormField(['name'], value)}
                  placeholder={t('shipper.placeholders.name')}
                  error={errors().name as string}
                />
                <FormInput
                  label={t('shipper.fields.companyName')}
                  value={formData().companyName || ''}
                  onChange={(value) => updateFormField(['companyName'], value)}
                  placeholder={t('shipper.placeholders.companyName')}
                />
                <FormInput
                  label={t('shipper.fields.taxId')}
                  value={formData().taxId || ''}
                  onChange={(value) => updateFormField(['taxId'], value)}
                  placeholder={t('shipper.placeholders.taxId')}
                />
                <FormInput
                  label={t('shipper.fields.licenseNumber')}
                  value={formData().licenseNumber || ''}
                  onChange={(value) => updateFormField(['licenseNumber'], value)}
                  placeholder={t('shipper.placeholders.licenseNumber')}
                />
              </div>
            </div>
          </Card>

          {/* Address Information */}
          <Card style={{ 'margin-bottom': '1.5rem' }}>
            <div style={{ padding: '1.5rem' }}>
              <h3 style={{ 'margin-bottom': '1rem' }}>Dirección</h3>
              <div style={{ 
                display: 'grid', 
                'grid-template-columns': 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1rem' 
              }}>
                <FormInput
                  label={`${t('shipper.fields.street')} *`}
                  value={formData().address.street}
                  onChange={(value) => updateFormField(['address', 'street'], value)}
                  placeholder={t('shipper.placeholders.street')}
                  error={errors().street as string}
                />
                <FormInput
                  label={`${t('shipper.fields.city')} *`}
                  value={formData().address.city}
                  onChange={(value) => updateFormField(['address', 'city'], value)}
                  placeholder={t('shipper.placeholders.city')}
                  error={errors().city as string}
                />
                <FormInput
                  label={t('shipper.fields.state')}
                  value={formData().address.state}
                  onChange={(value) => updateFormField(['address', 'state'], value)}
                  placeholder={t('shipper.placeholders.state')}
                />
                <FormInput
                  label={t('shipper.fields.zipCode')}
                  value={formData().address.zipCode}
                  onChange={(value) => updateFormField(['address', 'zipCode'], value)}
                  placeholder={t('shipper.placeholders.zipCode')}
                />
                <FormSelect
                  label={`${t('shipper.fields.country')} *`}
                  value={formData().address.country}
                  onChange={(value) => updateFormField(['address', 'country'], value)}
                  options={countries.map(country => ({ value: country, label: country }))}
                  error={errors().country as string}
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
                  label={t('shipper.fields.phone')}
                  value={formData().contact.phone}
                  onChange={(value) => updateFormField(['contact', 'phone'], value)}
                  placeholder={t('shipper.placeholders.phone')}
                />
                <FormInput
                  label={t('shipper.fields.email')}
                  type="email"
                  value={formData().contact.email}
                  onChange={(value) => updateFormField(['contact', 'email'], value)}
                  placeholder={t('shipper.placeholders.email')}
                  error={errors().email as string}
                />
                <FormInput
                  label={t('shipper.fields.fax')}
                  value={formData().contact.fax || ''}
                  onChange={(value) => updateFormField(['contact', 'fax'], value)}
                  placeholder={t('shipper.placeholders.fax')}
                />
              </div>
            </div>
          </Card>

          {/* Insurance Information */}
          <Card style={{ 'margin-bottom': '1.5rem' }}>
            <div style={{ padding: '1.5rem' }}>
              <h3 style={{ 'margin-bottom': '1rem' }}>{t('shipper.fields.insuranceInfo')}</h3>
              <div style={{ 
                display: 'grid', 
                'grid-template-columns': 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1rem' 
              }}>
                <FormInput
                  label={t('shipper.fields.insuranceProvider')}
                  value={formData().insuranceInfo?.provider || ''}
                  onChange={(value) => updateFormField(['insuranceInfo', 'provider'], value)}
                  placeholder={t('shipper.placeholders.insuranceProvider')}
                />
                <FormInput
                  label={t('shipper.fields.policyNumber')}
                  value={formData().insuranceInfo?.policyNumber || ''}
                  onChange={(value) => updateFormField(['insuranceInfo', 'policyNumber'], value)}
                  placeholder={t('shipper.placeholders.policyNumber')}
                />
                <FormInput
                  label={t('shipper.fields.expirationDate')}
                  type="date"
                  value={formData().insuranceInfo?.expirationDate || ''}
                  onChange={(value) => updateFormField(['insuranceInfo', 'expirationDate'], value)}
                />
              </div>
            </div>
          </Card>

          {/* Additional Information */}
          <Card style={{ 'margin-bottom': '1.5rem' }}>
            <div style={{ padding: '1.5rem' }}>
              <h3 style={{ 'margin-bottom': '1rem' }}>Información Adicional</h3>
              <FormInput
                label={t('shipper.fields.notes')}
                value={formData().notes || ''}
                onChange={(value) => updateFormField(['notes'], value)}
                placeholder={t('shipper.placeholders.notes')}
                multiline={true}
                rows={3}
              />
            </div>
          </Card>

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
              {loading() ? 'Guardando...' : (editingShipper() ? 'Actualizar' : 'Crear')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ShipperManagement;