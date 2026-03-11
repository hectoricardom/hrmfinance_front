import { Component, createSignal } from 'solid-js';
import { useTranslation } from '../../../translations';
import { Modal } from '../../ui';
import { Button } from '../../ui';
import { inventoryStore } from '../stores/inventoryStore';

interface AddLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationAdded?: (locationId: string) => void; // Callback when location is successfully added
}

const AddLocationModal: Component<AddLocationModalProps> = (props) => {
  const { t } = useTranslation();
  const [name, setName] = createSignal('');
  const [code, setCode] = createSignal('');
  const [type, setType] = createSignal<'warehouse' | 'store' | 'supplier' | 'customer'>('warehouse');
  const [address, setAddress] = createSignal('');
  const [validationError, setValidationError] = createSignal('');

  const resetForm = () => {
    setName('');
    setCode('');
    setType('warehouse');
    setAddress('');
    setValidationError('');
  };

  const generateCode = () => {
    if (name()) {
      const prefix = type() === 'warehouse' ? 'WH' : 
                   type() === 'store' ? 'ST' : 
                   type() === 'supplier' ? 'SUP' : 'CUST';
      const nameCode = name().toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 3);
      const number = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
      setCode(`${prefix}-${nameCode}-${number}`);
    }
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    setValidationError('');

    // Basic validation
    if (!name().trim()) {
      setValidationError(t('forms.locationNameRequired'));
      return;
    }

    if (!code().trim()) {
      setValidationError(t('forms.locationCodeRequired'));
      return;
    }

    if (!address().trim()) {
      setValidationError(t('forms.addressRequired'));
      return;
    }

    // Check if code already exists
    const existingLocations = inventoryStore.locations.filter(loc => 
      loc.code.toLowerCase() === code().toLowerCase()
    );
    if (existingLocations.length > 0) {
      setValidationError(t('forms.locationCodeExists'));
      return;
    }

    // Create the new location
    const newLocation = {
      name: name().trim(),
      code: code().trim().toUpperCase(),
      type: type(),
      address: address().trim(),
      isActive: true
    };

    inventoryStore.addLocation(newLocation);
    
    // Get the newly created location ID
    const newLocationId = `loc-${Date.now()}`;
    
    // Call the callback if provided
    if (props.onLocationAdded) {
      props.onLocationAdded(newLocationId);
    }

    resetForm();
    props.onClose();
  };

  const handleClose = () => {
    resetForm();
    props.onClose();
  };

  // Styles
  const formGroupStyle = {
    'margin-bottom': '1.5rem'
  };

  const labelStyle = {
    display: 'block',
    'margin-bottom': '0.5rem',
    'font-weight': '500',
    color: 'var(--text-primary)'
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '1rem',
    background: 'var(--surface-color)'
  };

  const selectStyle = {
    ...inputStyle,
    cursor: 'pointer'
  };

  const errorStyle = {
    color: '#f44336',
    'font-size': '0.875rem',
    'margin-bottom': '1rem'
  };

  const buttonGroupStyle = {
    display: 'flex',
    gap: '1rem',
    'justify-content': 'flex-end',
    'margin-top': '2rem'
  };

  const gridStyle = {
    display: 'grid',
    'grid-template-columns': '2fr 1fr',
    gap: '1rem'
  };

  const helpTextStyle = {
    'font-size': '0.875rem',
    color: 'var(--text-muted)',
    'margin-top': '0.25rem'
  };

  const quickButtonStyle = {
    padding: '0.25rem 0.5rem',
    'font-size': '0.75rem',
    'margin-left': '0.5rem',
    background: 'var(--background-color)',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    cursor: 'pointer',
    color: 'var(--text-muted)'
  };

  const getLocationTypeIcon = (locationType: string) => {
    const icons = {
      'warehouse': '🏭',
      'store': '🏪',
      'supplier': '🚚',
      'customer': '👥'
    };
    return icons[locationType as keyof typeof icons] || '📍';
  };

  const getLocationTypeDescription = (locationType: string) => {
    const descriptions = {
      'warehouse': t('inventory.warehouseDescription'),
      'store': t('inventory.storeDescription'),
      'supplier': t('inventory.supplierDescription'),
      'customer': t('inventory.customerDescription')
    };
    return descriptions[locationType as keyof typeof descriptions] || '';
  };

  return (
    <Modal isOpen={props.isOpen} onClose={handleClose} title={t('inventory.addNewLocation')}>
      <form onSubmit={handleSubmit}>
        {/* Basic Information */}
        <div style={formGroupStyle}>
          <label style={labelStyle}>{t('inventory.locationName')} *</label>
          <input
            type="text"
            style={inputStyle}
            value={name()}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('inventory.enterLocationName')}
            required
          />
        </div>

        <div style={gridStyle}>
          <div>
            <label style={labelStyle}>
              {t('inventory.locationCode')} *
              <button
                type="button"
                style={quickButtonStyle}
                onClick={generateCode}
                title="Generate code automatically"
              >
                {t('common.generate')}
              </button>
            </label>
            <input
              type="text"
              style={inputStyle}
              value={code()}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t('inventory.enterUniqueCode')}
              required
            />
            <div style={helpTextStyle}>
              {t('inventory.uniqueIdentifierHelp')}
            </div>
          </div>
          <div>
            <label style={labelStyle}>{t('inventory.locationType')} *</label>
            <select
              style={selectStyle}
              value={type()}
              onChange={(e) => setType(e.target.value as any)}
              required
            >
              <option value="warehouse">
                {getLocationTypeIcon('warehouse')} {t('inventory.warehouse')}
              </option>
              <option value="store">
                {getLocationTypeIcon('store')} {t('inventory.store')}
              </option>
              <option value="supplier">
                {getLocationTypeIcon('supplier')} {t('inventory.supplier')}
              </option>
              <option value="customer">
                {getLocationTypeIcon('customer')} {t('inventory.customer')}
              </option>
            </select>
            <div style={helpTextStyle}>
              {getLocationTypeDescription(type())}
            </div>
          </div>
        </div>

        <div style={formGroupStyle}>
          <label style={labelStyle}>{t('common.address')} *</label>
          <textarea
            style={{
              ...inputStyle,
              'min-height': '100px',
              resize: 'vertical'
            }}
            value={address()}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={t('inventory.enterCompleteAddress')}
            required
          />
        </div>

        {/* Preview */}
        {name() && (
          <div style={{
            padding: '1rem',
            background: 'var(--background-color)',
            'border-radius': 'var(--border-radius-sm)',
            border: '1px solid var(--border-color)',
            'margin-bottom': '1rem'
          }}>
            <div style={{ 'font-weight': '500', 'margin-bottom': '0.5rem' }}>{t('common.preview')}:</div>
            <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
              <span style={{ 'font-size': '1.2rem' }}>
                {getLocationTypeIcon(type())}
              </span>
              <div>
                <div style={{ 'font-weight': '600' }}>{name()}</div>
                <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                  {code() && `${code()} • `}{type()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Validation Errors */}
        {validationError() && (
          <div style={errorStyle}>{validationError()}</div>
        )}

        <div style={buttonGroupStyle}>
          <Button variant="secondary" type="button" onClick={handleClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" type="submit">
            {t('inventory.addLocation')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddLocationModal;