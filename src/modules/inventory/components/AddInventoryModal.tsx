import { Component, createSignal, createMemo, For, onMount, createEffect } from 'solid-js';
import { useTranslation } from '../../../translations';
import { Modal, Button, FormInput, FormSelect } from '../../ui';
import SearchableProductDropdown from './SearchableProductDropdown';
import SearchableLocationDropdown from './SearchableLocationDropdown';
import AddProductModal from './AddProductModal';
import AddLocationModal from './AddLocationModal';
import { InventoryItem, inventoryStore, Product, Location, InventoryMovement, getEffectivePrice } from '../stores/inventoryStore';
import { authStore } from '../../../stores/authStore';
import { providersClientsStore } from '../../providers-clients/stores/providersClientsStore';
import SearchableEntityDropdown from '../../providers-clients/components/SearchableEntityDropdown';

interface AddInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'legacy' | 'movement'; // Support both legacy item creation and new movement system
}

const AddInventoryModal: Component<AddInventoryModalProps> = (props) => {
  const { t } = useTranslation();
  // Legacy form data
  const [formData, setFormData] = createSignal({
    name: '',
    price: '',
    quantity: '',
    qty: '',
    category: '',
    description: '',
    sku: '',
    supplier: '',
    minStock: '',
    location: ''
  });

  // New movement form data
  const [productId, setProductId] = createSignal('');
  const [locationId, setLocationId] = createSignal('');
  const [movementType, setMovementType] = createSignal<'in' | 'out' | 'transfer' | 'adjustment'>('in');
  const [quantity, setQuantity] = createSignal(0);
  const [unitCost, setUnitCost] = createSignal(0);
  const [referenceNumber, setReferenceNumber] = createSignal('');
  const [notes, setNotes] = createSignal('');
  const [fromLocationId, setFromLocationId] = createSignal('');
  const [validationError, setValidationError] = createSignal('');
  const [entityId, setEntityId] = createSignal(''); // Provider (for purchases) or Customer (for sales)
  
  // Modal states
  const [isAddProductModalOpen, setIsAddProductModalOpen] = createSignal(false);
  const [isAddLocationModalOpen, setIsAddLocationModalOpen] = createSignal(false);

  const isMovementMode = () => props.mode === 'movement';

  const selectedProduct = createMemo(() => {
    if (!productId()) return null;
    return inventoryStore.getProductById(productId());
  });

  const selectedLocation = createMemo(() => {
    if (!locationId()) return null;
    return inventoryStore.getLocationById(locationId());
  });

  const fromLocation = createMemo(() => {
    if (!fromLocationId()) return null;
    return inventoryStore.getLocationById(fromLocationId());
  });

  const selectedEntity = createMemo(() => {
    if (!entityId()) return null;
    return providersClientsStore.getEntityById(entityId());
  });

  // Load providers/clients when modal opens
  createEffect(() => {
    if (props.isOpen && isMovementMode()) {
      providersClientsStore.loadEntities();
    }
  });

  // Recalculate unit price when movement type or location changes
  createEffect(() => {
    const type = movementType();
    const locId = locationId();
    const product = selectedProduct();

    if (product) {
      if (type === 'out') {
        // For OUT movements, use effective selling price (location-specific or cost * 1.666)
        const effectiveLocationId = locId || authStore.state?.currentStore?.id;
        setUnitCost(getEffectivePrice(product, effectiveLocationId));
      } else if (type === 'in') {
        // For IN movements, use unit cost
        setUnitCost(product.unitCost);
      }
    }
  });

  // Get list based on movement type
  const entityOptions = createMemo(() => {
    if (movementType() === 'in') {
      // For stock IN (purchases), show providers
      return providersClientsStore.getProviders();
    } else if (movementType() === 'out') {
      // For stock OUT (sales), show customers
      return providersClientsStore.getClients();
    }
    return [];
  });

  const totalCost = createMemo(() => {
    return quantity() * unitCost();
  });

  const currentStock = createMemo(() => {
    if (!productId() || !locationId()) return 0;
    const stock = inventoryStore.getStockByProductAndLocation(productId(), locationId());
    return stock?.quantity || 0;
  });

  const categoryOptions = [
    { value: 'Electronics', label: 'Electronics' },
    { value: 'Accessories', label: 'Accessories' },
    { value: 'Furniture', label: 'Furniture' },
    { value: 'Office Supplies', label: 'Office Supplies' },
    { value: 'Software', label: 'Software' },
    { value: 'Hardware', label: 'Hardware' },
    { value: 'Consumables', label: 'Consumables' }
  ];

  const locationOptions = [
    { value: 'Warehouse A', label: 'Warehouse A' },
    { value: 'Warehouse B', label: 'Warehouse B' },
    { value: 'Warehouse C', label: 'Warehouse C' },
    { value: 'Storage Room', label: 'Storage Room' },
    { value: 'Main Office', label: 'Main Office' }
  ];

  const buttonGroupStyle = {
    display: 'flex',
    gap: '1rem',
    'justify-content': 'flex-end',
    'margin-top': '2rem'
  };

  const resetMovementForm = () => {
    setProductId('');
    setLocationId('');
    setMovementType('in');
    setQuantity(0);
    setUnitCost(0);
    setReferenceNumber('');
    setNotes('');
    setFromLocationId('');
    setValidationError('');
    setEntityId('');
  };

  const resetLegacyForm = () => {
    setFormData({
      name: '',
      price: '',
      quantity: '',
      qty: '',
      category: '',
      description: '',
      sku: '',
      supplier: '',
      minStock: '',
      location: ''
    });
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    
    if (isMovementMode()) {
      // Handle new movement system
      setValidationError('');

      // Validation
      if (!productId()) {
        setValidationError(t('forms.selectProduct'));
        return;
      }

      if (!locationId()) {
        setValidationError(t('forms.selectLocation'));
        return;
      }

      if (quantity() <= 0) {
        setValidationError(t('forms.quantityGreaterThanZero'));
        return;
      }

      if (unitCost() < 0) {
        setValidationError(t('forms.unitCostNotNegative'));
        return;
      }

      if (movementType() === 'transfer' && !fromLocationId()) {
        setValidationError(t('forms.selectFromLocation'));
        return;
      }

      if (movementType() === 'transfer' && fromLocationId() === locationId()) {
        setValidationError(t('forms.sameLocationError'));
        return;
      }

      if (movementType() === 'out' && quantity() > currentStock()) {
        setValidationError(t('forms.insufficientStock', { currentStock: currentStock() }));
        return;
      }

      const product = selectedProduct()!;
      const location = selectedLocation()!;

      // Create movement
      const entity = selectedEntity();
      const movement: Omit<InventoryMovement, 'id' | 'createdDate'> = {
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        locationId: location.id,
        locationName: location.name,
        businessId: authStore.getBusinessId(),
        movementType: movementType(),
        quantity: quantity(),
        unitCost: unitCost() || product.unitCost,
        totalCost: totalCost() || (quantity() * product.unitCost),
        referenceNumber: referenceNumber() || `AUTO-${Date.now()}`,
        notes: notes(),
        createdBy: 'admin',
        fromLocationId: movementType() === 'transfer' ? fromLocationId() : undefined,
        fromLocationName: movementType() === 'transfer' ? fromLocation()?.name : undefined,
        // Provider/Customer info
        entityId: entity?.id,
        entityName: entity?.name,
        entityType: entity?.type // 'provider' | 'customer' | 'both'
      };

      inventoryStore.addInventoryMovement(movement);
      resetMovementForm();
    } else {
      // Handle legacy system
      const data = formData();
      
      if (!data.name || !data.price || !data.quantity || !data.category || !data.sku || !data.supplier || !data.minStock || !data.location) {
        alert(t('forms.fillAllRequired'));
        return;
      }

      const newItem: Omit<InventoryItem, 'id' | 'lastUpdated'> = {
        name: data.name,
        price: parseFloat(data.price),
        quantity: parseInt(data.quantity),
        qty: parseInt(data.qty),
        category: data.category,
        description: data.description,
        sku: data.sku,
        supplier: data.supplier,
        minStock: parseInt(data.minStock),
        location: data.location
      };

      inventoryStore.addItem(newItem);
      resetLegacyForm();
    }
    
    props.onClose();
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleClose = () => {
    if (isMovementMode()) {
      resetMovementForm();
    } else {
      resetLegacyForm();
    }
    props.onClose();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
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
    'margin-top': '0.5rem'
  };

  const infoCardStyle = {
    padding: '1rem',
    background: 'var(--background-color)',
    'border-radius': 'var(--border-radius-sm)',
    border: '1px solid var(--border-color)',
    'margin-bottom': '1rem'
  };

  const infoRowStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'margin-bottom': '0.5rem'
  };

  const infoLabelStyle = {
    'font-weight': '500',
    color: 'var(--text-muted)'
  };

  const infoValueStyle = {
    'font-weight': '600',
    color: 'var(--text-primary)'
  };

  const getModalTitle = () => {
    return isMovementMode() ? t('inventory.addMovement') : t('inventory.addNewItem');
  };

  return (
    <Modal isOpen={props.isOpen} onClose={handleClose} title={getModalTitle()}>
      <form onSubmit={handleSubmit}>
        {isMovementMode() ? (
          <>
            {/* Product Selection */}
            <div style={{ 'margin-bottom': '1.5rem' }}>
              <label style={{ display: 'block', 'margin-bottom': '0.5rem', 'font-weight': '500' }}>{t('inventory.product')} *</label>
              <SearchableProductDropdown
                value={productId()}
                onChange={(selectedProductId) => {
                  setProductId(selectedProductId);
                  const product = inventoryStore.getProductById(selectedProductId);
                  if (product) {
                    // For OUT movements, use effective selling price (location-specific or cost * 1.666)
                    // For IN movements, use unit cost
                    if (movementType() === 'out') {
                      const currentLocationId = locationId() || authStore.state?.currentStore?.id;
                      setUnitCost(getEffectivePrice(product, currentLocationId));
                    } else {
                      setUnitCost(product.unitCost);
                    }
                  }
                }}
                placeholder={t('inventory.searchProductsPlaceholder')}
                onAddNew={() => setIsAddProductModalOpen(true)}
                required
              />
            </div>

            {/* Movement Type */}
            <div style={{ 'margin-bottom': '1.5rem' }}>
              <label style={{ display: 'block', 'margin-bottom': '0.5rem', 'font-weight': '500' }}>{t('inventory.movementType')} *</label>
              <select
                style={selectStyle}
                value={movementType()}
                onChange={(e) => setMovementType(e.target.value as any)}
                required
              >
                <option value="in">{t('inventory.stockInPurchase')}</option>
                <option value="out">{t('inventory.stockOutSale')}</option>
                <option value="transfer">{t('inventory.transferBetween')}</option>
                <option value="adjustment">{t('inventory.stockAdjustment')}</option>
              </select>
            </div>

            {/* Provider/Customer Selection (for in/out movements) */}
            {(movementType() === 'in' || movementType() === 'out') && (
              <div style={{ 'margin-bottom': '1.5rem' }}>
                <label style={{ display: 'block', 'margin-bottom': '0.5rem', 'font-weight': '500' }}>
                  {movementType() === 'in'
                    ? t('inventory.provider', 'Proveedor')
                    : t('inventory.customer', 'Cliente')}
                </label>
                <SearchableEntityDropdown
                  value={entityId()}
                  onChange={(entity) => setEntityId(entity?.id || '')}
                  entityType={movementType() === 'in' ? 'provider' : 'customer'}
                  placeholder={movementType() === 'in'
                    ? t('inventory.searchProvider', 'Buscar proveedor...')
                    : t('inventory.searchCustomer', 'Buscar cliente...')}
                />
                {selectedEntity() && (
                  <div style={{
                    'margin-top': '0.5rem',
                    'font-size': '0.875rem',
                    color: 'var(--text-muted)',
                    padding: '0.5rem',
                    background: 'var(--background-color)',
                    'border-radius': 'var(--border-radius-sm)'
                  }}>
                    {selectedEntity()?.email && <div>📧 {selectedEntity()?.email}</div>}
                    {selectedEntity()?.phone && <div>📞 {selectedEntity()?.phone}</div>}
                  </div>
                )}
              </div>
            )}

            {/* From Location (for transfers) */}
            {movementType() === 'transfer' && (
              <div style={{ 'margin-bottom': '1.5rem' }}>
                <label style={{ display: 'block', 'margin-bottom': '0.5rem', 'font-weight': '500' }}>{t('inventory.fromLocation')} *</label>
                <SearchableLocationDropdown
                  value={fromLocationId()}
                  onChange={(selectedLocationId) => setFromLocationId(selectedLocationId)}
                  placeholder={t('inventory.searchSourceLocation')}
                  onAddNew={() => setIsAddLocationModalOpen(true)}
                  required
                />
              </div>
            )}

            {/* To Location */}
            <div style={{ 'margin-bottom': '1.5rem' }}>
              <label style={{ display: 'block', 'margin-bottom': '0.5rem', 'font-weight': '500' }}>
                {movementType() === 'transfer' ? t('inventory.toLocation') + ' *' : t('inventory.locationName') + ' *'}
              </label>
              <SearchableLocationDropdown
                value={locationId()}
                onChange={(selectedLocationId) => setLocationId(selectedLocationId)}
                placeholder={movementType() === 'transfer' ? t('inventory.searchDestinationLocation') : t('inventory.searchLocation')}
                onAddNew={() => setIsAddLocationModalOpen(true)}
                required
              />
            </div>

            {/* Current Stock Info */}
            {selectedProduct() && selectedLocation() && (
              <div style={infoCardStyle}>
                <div style={infoRowStyle}>
                  <span style={infoLabelStyle}>{t('inventory.currentStockAt', { location: selectedLocation()?.name })}:</span>
                  <span style={infoValueStyle}>{currentStock()} {selectedProduct()?.unitOfMeasure}</span>
                </div>
                <div style={infoRowStyle}>
                  <span style={infoLabelStyle}>{t('inventory.productCost')}:</span>
                  <span style={infoValueStyle}>{formatCurrency(selectedProduct()?.unitCost || 0)}</span>
                </div>
                <div style={infoRowStyle}>
                  <span style={infoLabelStyle}>{t('inventory.minStockLevel')}:</span>
                  <span style={infoValueStyle}>{selectedProduct()?.minStockLevel} {selectedProduct()?.unitOfMeasure}</span>
                </div>
              </div>
            )}

            {/* Quantity */}
            <div style={{ 'margin-bottom': '1.5rem' }}>
              <label style={{ display: 'block', 'margin-bottom': '0.5rem', 'font-weight': '500' }}>{t('inventory.quantity')} *</label>
              <input
                type="number"
                style={inputStyle}
                value={quantity()}
                onChange={(e) => setQuantity(Number(e.target.value))}
                min="0"
                step="1"
                required
              />
            </div>

            {/* Unit Cost */}
            <div style={{ 'margin-bottom': '1.5rem' }}>
              <label style={{ display: 'block', 'margin-bottom': '0.5rem', 'font-weight': '500' }}>{t('inventory.unitCost')}</label>
              <input
                type="number"
                style={inputStyle}
                value={unitCost()}
                onChange={(e) => setUnitCost(Number(e.target.value))}
                min="0"
                step="0.01"
                placeholder={t('inventory.willUseDefaultCost')}
              />
            </div>

            {/* Total Cost Display */}
            {quantity() > 0 && unitCost() > 0 && (
              <div style={infoCardStyle}>
                <div style={infoRowStyle}>
                  <span style={infoLabelStyle}>{t('inventory.totalCost')}:</span>
                  <span style={{ 
                    ...infoValueStyle, 
                    'font-size': '1.2rem',
                    color: 'var(--primary-color)' 
                  }}>
                    {formatCurrency(totalCost())}
                  </span>
                </div>
              </div>
            )}

            {/* Reference Number */}
            <div style={{ 'margin-bottom': '1.5rem' }}>
              <label style={{ display: 'block', 'margin-bottom': '0.5rem', 'font-weight': '500' }}>{t('common.referenceNumber')}</label>
              <input
                type="text"
                style={inputStyle}
                value={referenceNumber()}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder={t('common.referenceNumberPlaceholder')}
              />
            </div>

            {/* Notes */}
            <div style={{ 'margin-bottom': '1.5rem' }}>
              <label style={{ display: 'block', 'margin-bottom': '0.5rem', 'font-weight': '500' }}>{t('common.notes')}</label>
              <textarea
                style={{
                  ...inputStyle,
                  'min-height': '100px',
                  resize: 'vertical'
                }}
                value={notes()}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('inventory.additionalNotesPlaceholder')}
              />
            </div>

            {validationError() && (
              <div style={errorStyle}>{validationError()}</div>
            )}
          </>
        ) : (
          <>
            {/* Legacy Form */}
            <FormInput
              label={t('inventory.itemName')}
              value={formData().name}
              onChange={(value) => updateFormData('name', value)}
              placeholder={t('inventory.enterItemName')}
              required
            />
            
            <FormInput
              label={t('inventory.sku')}
              value={formData().sku}
              onChange={(value) => updateFormData('sku', value)}
              placeholder={t('inventory.enterSkuCode')}
              required
            />
            
            <FormSelect
              label={t('inventory.category')}
              value={formData().category}
              onChange={(value) => updateFormData('category', value)}
              options={categoryOptions}
              required
            />
            
            <FormInput
              label={t('common.description')}
              value={formData().description}
              onChange={(value) => updateFormData('description', value)}
              placeholder={t('inventory.enterItemDescription')}
            />
            
            <FormInput
              label={t('common.price')}
              type="number"
              value={formData().price}
              onChange={(value) => updateFormData('price', value)}
              placeholder={t('common.enterPrice')}
              required
            />
            
            <FormInput
              label={t('inventory.quantity')}
              type="number"
              value={formData().quantity}
              onChange={(value) => updateFormData('quantity', value)}
              placeholder={t('inventory.enterQuantity')}
              required
            />
            
            <FormInput
              label={t('inventory.minimumStock')}
              type="number"
              value={formData().minStock}
              onChange={(value) => updateFormData('minStock', value)}
              placeholder={t('inventory.enterMinStockLevel')}
              required
            />
            
            <FormInput
              label={t('inventory.supplier')}
              value={formData().supplier}
              onChange={(value) => updateFormData('supplier', value)}
              placeholder={t('inventory.enterSupplierName')}
              required
            />
            
            <FormSelect
              label={t('inventory.location')}
              value={formData().location}
              onChange={(value) => updateFormData('location', value)}
              options={locationOptions}
              required
            />
          </>
        )}

        <div style={buttonGroupStyle}>
          <Button variant="secondary" type="button" onClick={handleClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" type="submit">
            {isMovementMode() ? t('inventory.addMovement') : t('inventory.addItem')}
          </Button>
        </div>
      </form>
      
      {/* Add Product Modal */}
      <AddProductModal
        isOpen={isAddProductModalOpen()}
        onClose={() => setIsAddProductModalOpen(false)}
        onProductAdded={(productId) => {
          setProductId(productId);
          setIsAddProductModalOpen(false);
        }}
      />
      
      {/* Add Location Modal */}
      <AddLocationModal
        isOpen={isAddLocationModalOpen()}
        onClose={() => setIsAddLocationModalOpen(false)}
        onLocationAdded={(locationId) => {
          if (movementType() === 'transfer' && !fromLocationId()) {
            setFromLocationId(locationId);
          } else {
            setLocationId(locationId);
          }
          setIsAddLocationModalOpen(false);
        }}
      />
    </Modal>
  );
};

export default AddInventoryModal;













interface Products2InvProps {
  updateNotes: (productId: string, notes: string) => void;
  updatePhysicalCount: (productId: string, count: number | null  ) => void;
  entry?: Record<string, any>;
  index: number
}

const Products2Inv: Component<Products2InvProps> = (props) => {
  const { t } = useTranslation();
  const [qty, setQty] = createSignal("");
  const [note, setNote] = createSignal("");
  let {entry, updatePhysicalCount, updateNotes, index} = props;

  onMount(()=>{
    setNote(entry?.notes)
    setQty(entry?.physicalCount)
  })

  return (
    <tr style={{ 
      'border-bottom': '1px solid var(--border-color)',
      background: entry?.physicalCount !== null ? (entry?.variance !== 0 ? '#fff3cd' : '#d4edda') : 'transparent'
    }}>
      <td style={{ padding: '1rem' }}>
        <div style={{ 'font-weight': '500' }}>{entry?.product.name}</div>
        <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
          {entry?.product.sku} • {entry?.product.category} • {entry?.product.unitOfMeasure}
        </div>
      </td>
      
      <td style={{ padding: '1rem', 'text-align': 'center' }}>
        <div style={{ 'font-weight': '600' }}>{entry?.systemQuantity}</div>
      </td>
      
      <td style={{ padding: '1rem', 'text-align': 'center' }}>
        <input
          type="number"
          tabIndex={index}
          value={qty() || ''}
          onInput={(e) => {
            const value = e.target.value;
            setQty(value)
          }}
          onKeyDown={(v)=>{
            if(v.keyCode===13){
              updatePhysicalCount(entry?.productId, qty() === '' ? null : parseFloat(qty()));
            }
            if(v.keyCode===27){
              updatePhysicalCount(entry?.productId, qty() === '' ? null : parseFloat(qty()));
            }
            if(v.keyCode===9){
              updatePhysicalCount(entry?.productId, qty() === '' ? null : parseFloat(qty()));
            }
          }}
          onBlur={()=>{
            updatePhysicalCount(entry?.productId, qty() === '' ? null : parseFloat(qty()));
          }}
          style={{
            width: '100px',
            padding: '0.5rem',
            border: '1px solid var(--border-color)',
            'border-radius': 'var(--border-radius-sm)',
            'text-align': 'center'
          }}
          placeholder="0"
          min="0"
          step="0.01"
        />
      </td>
      
      <td style={{ padding: '1rem', 'text-align': 'center' }}>
        <div style={{ 
          'font-weight': '600',
          color: entry?.variance > 0 ? '#4caf50' : entry?.variance < 0 ? '#f44336' : 'var(--text-muted)'
        }}>
          {entry?.variance > 0 ? '+' : ''}{entry?.variance || '—'}
        </div>
      </td>
      
      <td style={{ padding: '1rem' }}>
        <input
          type="text"
          value={note() || ""}
          onInput={(e) => {
            const value = e.target.value;
            setNote(value)
          }}
          onKeyDown={(v)=>{
            if(v.keyCode===13){
              updateNotes(entry?.productId, note());
            }
            if(v.keyCode===27){
              updateNotes(entry?.productId, note());
            }
            if(v.keyCode===9){
              updateNotes(entry?.productId, note());
            }
          }}
          onBlur={(v)=>{
            updateNotes(entry?.productId, note());
          }}
          style={{
            width: '200px',
            padding: '0.5rem',
            border: '1px solid var(--border-color)',
            'border-radius': 'var(--border-radius-sm)'
          }}
          placeholder={t('inventory.addNotes', 'Add notes...')}
        />
      </td>
    </tr>
  )
}