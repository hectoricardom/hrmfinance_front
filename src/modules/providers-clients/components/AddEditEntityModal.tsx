import { Component, createSignal, createEffect, Show } from 'solid-js';
import { Modal } from '../../ui';
import { useTranslation } from '../../../translations';
import { providersClientsStore } from '../stores/providersClientsStore';
import { ProviderClient, EntityType } from '../types';
import { generateRandomId } from '../../../services/utils';
import SearchableAccountDropdown from '../../events/components/SearchableAccountDropdown';
import { accountsStore } from '../../accounts/stores/accountsStore';

interface AddEditEntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  entity: ProviderClient | null;
}

const AddEditEntityModal: Component<AddEditEntityModalProps> = (props) => {
  const { t } = useTranslation();

  const [name, setName] = createSignal('');
  const [type, setType] = createSignal<EntityType>('customer');
  const [email, setEmail] = createSignal('');
  const [phone, setPhone] = createSignal('');
  const [address, setAddress] = createSignal('');
  const [taxId, setTaxId] = createSignal('');
  const [contactPerson, setContactPerson] = createSignal('');
  const [notes, setNotes] = createSignal('');
  const [relatedAccountId, setRelatedAccountId] = createSignal('');
  const [advanceAccountId, setAdvanceAccountId] = createSignal('');
 
  const [isActive, setIsActive] = createSignal(true);
  const [loading, setLoading] = createSignal(false);
  const [errors, setErrors] = createSignal<Record<string, string>>({});

  const isEditing = () => !!props.entity;

  createEffect(() => {
    if (props.isOpen) {
      if (props.entity) {
        setName(props.entity.name);
        setType(props.entity.type);
        setEmail(props.entity.email || '');
        setPhone(props.entity.phone || '');
        setAddress(props.entity.address || '');
        setTaxId(props.entity.taxId || '');
        setContactPerson(props.entity.contactPerson || '');
        setNotes(props.entity.notes || '');
        setRelatedAccountId(props.entity.relatedAccountId || '');
        setAdvanceAccountId(props.entity.advanceAccountId || '');
        setIsActive(props.entity.isActive);
      } else {
        resetForm();
      }
      setErrors({});
    }
  });

  const resetForm = () => {
    setName('');
    setType('customer');
    setEmail('');
    setPhone('');
    setAddress('');
    setTaxId('');
    setContactPerson('');
    setNotes('');
    setRelatedAccountId('');
    setAdvanceAccountId('');
    setIsActive(true);
    setErrors({});
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!name().trim()) {
      newErrors.name = t('forms.requiredField', 'Campo requerido');
    }

    if (email() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email())) {
      newErrors.email = t('forms.invalidEmail', 'Email inválido');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      const data = {
        name: name().trim(),
        type: type(),
        email: email().trim() || undefined,
        phone: phone().trim() || undefined,
        address: address().trim() || undefined,
        taxId: taxId().trim() || undefined,
        contactPerson: contactPerson().trim() || undefined,
        notes: notes().trim() || undefined,
        relatedAccountId: relatedAccountId() || undefined,
        advanceAccountId: advanceAccountId() || undefined,
        isActive: isActive(),
        id: generateRandomId()
      };

      console.log( props.entity)
      if (isEditing() && props.entity) {
        await providersClientsStore.updateEntity(props.entity.id, data);
      } else {
        await providersClientsStore.createEntity(data);
      }

      props.onClose();
      resetForm();
    } catch (error) {
      console.error('Error saving entity:', error);
      setErrors({ submit: t('forms.saveError', 'Error al guardar') });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    props.onClose();
  };

  const inputStyle = {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '1rem'
  };

  const labelStyle = {
    display: 'block',
    'margin-bottom': '0.25rem',
    'font-weight': '500',
    'font-size': '0.875rem'
  };

  const errorStyle = {
    color: '#d32f2f',
    'font-size': '0.75rem',
    'margin-top': '0.25rem'
  };

  const formGroupStyle = {
    'margin-bottom': '1rem'
  };

  const rowStyle = {
    display: 'grid',
    'grid-template-columns': '1fr 1fr',
    gap: '1rem'
  };

  return (
    <Modal
      isOpen={props.isOpen}
      onClose={handleClose}
      title={isEditing()
        ? t('providersClients.editEntity', 'Editar Entidad')
        : t('providersClients.addEntity', 'Agregar Entidad')
      }
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        {/* Name & Type */}
        <div style={rowStyle}>
          <div style={formGroupStyle}>
            <label style={labelStyle}>{t('common.name', 'Nombre')} *</label>
            <input
              type="text"
              style={{
                ...inputStyle,
                'border-color': errors().name ? '#d32f2f' : 'var(--border-color)'
              }}
              value={name()}
              onInput={(e) => setName(e.target.value)}
              placeholder={t('providersClients.entityName', 'Nombre de la entidad')}
              disabled={loading()}
            />
            <Show when={errors().name}>
              <div style={errorStyle}>{errors().name}</div>
            </Show>
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>{t('common.type', 'Tipo')} *</label>
            <select
              style={inputStyle}
              value={type()}
              onChange={(e) => setType(e.target.value as EntityType)}
              disabled={loading()}
            >
              <option value="customer">{t('providersClients.client', 'Cliente')}</option>
              <option value="provider">{t('providersClients.provider', 'Proveedor')}</option>
              <option value="both">{t('providersClients.both', 'Ambos')}</option>
            </select>
          </div>
        </div>

        {/* Contact Person & Tax ID */}
        <div style={rowStyle}>
          <div style={formGroupStyle}>
            <label style={labelStyle}>{t('providersClients.contactPerson', 'Persona de Contacto')}</label>
            <input
              type="text"
              style={inputStyle}
              value={contactPerson()}
              onInput={(e) => setContactPerson(e.target.value)}
              placeholder={t('providersClients.contactPersonPlaceholder', 'Nombre del contacto')}
              disabled={loading()}
            />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>{t('providersClients.taxId', 'ID Fiscal / RNC')}</label>
            <input
              type="text"
              style={inputStyle}
              value={taxId()}
              onInput={(e) => setTaxId(e.target.value)}
              placeholder={t('providersClients.taxIdPlaceholder', 'Ej: 12-3456789')}
              disabled={loading()}
            />
          </div>
        </div>

        {/* Related Account */}
        <div style={formGroupStyle}>
          <label style={labelStyle}>
            {t('providersClients.relatedAccount', 'Cuenta Contable Relacionada')}
          </label>
          <SearchableAccountDropdown
            selectedAccountId={relatedAccountId()}
            onSelect={(account) => setRelatedAccountId(account.id)}
            placeholder={t('providersClients.selectAccount', 'Seleccionar cuenta para seguimiento...')}
          />
          <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', 'margin-top': '0.25rem' }}>
            {type() === 'provider'
              ? t('providersClients.providerAccountHint', 'Cuenta para registrar pagos y deudas con este proveedor (ej: Cuentas por Pagar)')
              : type() === 'customer'
                ? t('providersClients.customerAccountHint', 'Cuenta para registrar cobros y cuentas por cobrar de este cliente')
                : t('providersClients.bothAccountHint', 'Cuenta para seguimiento de transacciones con esta entidad')
            }
          </div>
          <Show when={relatedAccountId()}>
            <div style={{
              'margin-top': '0.5rem',
              padding: '0.5rem',
              background: '#e8f5e9',
              'border-radius': 'var(--border-radius-sm)',
              'font-size': '0.875rem'
            }}>
              ✓ Cuenta seleccionada: {accountsStore.getAccountById(relatedAccountId())?.name || relatedAccountId()}
            </div>
          </Show>
        </div>

         {/* Related Account */}
        <div style={formGroupStyle}>
          <label style={labelStyle}>
            {t('providersClients.relatedAccount', 'Cuenta Contable para Anticipos')}
          </label>
          <SearchableAccountDropdown
            selectedAccountId={advanceAccountId()}
            onSelect={(account) => setAdvanceAccountId(account.id)}
            placeholder={t('providersClients.selectAccount', 'Seleccionar cuenta para seguimiento...')}
          />
          <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', 'margin-top': '0.25rem' }}>
            {type() === 'provider'
              ? t('providersClients.providerAccountHint', 'Cuenta para registrar anticipos con este proveedor (ej: Cuentas por Pagar)')
              : type() === 'customer'
                ? t('providersClients.customerAccountHint', 'Cuenta para registrar cobros y cuentas por cobrar de este cliente')
                : t('providersClients.bothAccountHint', 'Cuenta para seguimiento de transacciones con esta entidad')
            }
          </div>
          <Show when={advanceAccountId()}>
            <div style={{
              'margin-top': '0.5rem',
              padding: '0.5rem',
              background: '#e8f5e9',
              'border-radius': 'var(--border-radius-sm)',
              'font-size': '0.875rem'
            }}>
              ✓ Cuenta seleccionada: {accountsStore.getAccountById(advanceAccountId())?.name || advanceAccountId()}
            </div>
          </Show>
        </div>

        {/* Email & Phone */}
        <div style={rowStyle}>
          <div style={formGroupStyle}>
            <label style={labelStyle}>{t('common.email', 'Correo Electrónico')}</label>
            <input
              type="email"
              style={{
                ...inputStyle,
                'border-color': errors().email ? '#d32f2f' : 'var(--border-color)'
              }}
              value={email()}
              onInput={(e) => setEmail(e.target.value)}
              placeholder={t('common.emailPlaceholder', 'correo@ejemplo.com')}
              disabled={loading()}
            />
            <Show when={errors().email}>
              <div style={errorStyle}>{errors().email}</div>
            </Show>
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>{t('common.phone', 'Teléfono')}</label>
            <input
              type="tel"
              style={inputStyle}
              value={phone()}
              onInput={(e) => setPhone(e.target.value)}
              placeholder={t('common.phonePlaceholder', '+1 305-555-0100')}
              disabled={loading()}
            />
          </div>
        </div>

        {/* Address */}
        <div style={formGroupStyle}>
          <label style={labelStyle}>{t('common.address', 'Dirección')}</label>
          <textarea
            style={{
              ...inputStyle,
              resize: 'vertical',
              'min-height': '60px'
            }}
            value={address()}
            onInput={(e) => setAddress(e.target.value)}
            placeholder={t('common.addressPlaceholder', 'Dirección completa')}
            disabled={loading()}
          />
        </div>

        {/* Notes */}
        <div style={formGroupStyle}>
          <label style={labelStyle}>{t('common.notes', 'Notas')}</label>
          <textarea
            style={{
              ...inputStyle,
              resize: 'vertical',
              'min-height': '80px'
            }}
            value={notes()}
            onInput={(e) => setNotes(e.target.value)}
            placeholder={t('providersClients.notesPlaceholder', 'Notas adicionales...')}
            disabled={loading()}
          />
        </div>

        {/* Active Status */}
        <div style={{ ...formGroupStyle, display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
          <input
            type="checkbox"
            id="isActive"
            checked={isActive()}
            onChange={(e) => setIsActive(e.target.checked)}
            disabled={loading()}
          />
          <label for="isActive" style={{ 'font-weight': '500' }}>
            {t('providersClients.activeEntity', 'Entidad activa')}
          </label>
        </div>

        {/* Error message */}
        <Show when={errors().submit}>
          <div style={{ ...errorStyle, 'margin-bottom': '1rem' }}>{errors().submit}</div>
        </Show>

        {/* Form Actions */}
        <div style={{ display: 'flex', gap: '1rem', 'justify-content': 'flex-end', 'margin-top': '1.5rem' }}>
          <button
            type="button"
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid var(--border-color)',
              'border-radius': 'var(--border-radius-sm)',
              background: 'white',
              cursor: 'pointer'
            }}
            onClick={handleClose}
            disabled={loading()}
          >
            {t('common.cancel', 'Cancelar')}
          </button>
          <button
            type="submit"
            style={{
              padding: '0.5rem 1.5rem',
              border: 'none',
              'border-radius': 'var(--border-radius-sm)',
              background: 'var(--primary-color)',
              color: 'white',
              cursor: 'pointer',
              'font-weight': '500'
            }}
            disabled={loading()}
          >
            {loading()
              ? t('common.saving', 'Guardando...')
              : isEditing()
                ? t('common.update', 'Actualizar')
                : t('common.save', 'Guardar')
            }
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddEditEntityModal;
