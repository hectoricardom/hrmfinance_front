import { Component, createSignal, createEffect, For, Show, createMemo } from 'solid-js';
import { FormInput, Modal } from '../../ui';
import { useTranslation } from '../../../translations';
import { inventoryStore, InventoryMovement } from '../stores/inventoryStore';
import { providersClientsStore } from '../../providers-clients/stores/providersClientsStore';
import SearchableEntityDropdown from '../../providers-clients/components/SearchableEntityDropdown';

interface ProductEntry {
  id: string;
  product: {
    id: string;
    code: string;
    label: string;
    price: number;
  };
  qty: number;
  price: number;
  salePrice?: number;
  costPrice?: number;
  unitCost?: number,
  total: number;
  bulkId?: string;
}

interface UpdateMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  movement: InventoryMovement | null;
  onMovementUpdated?: () => void;
}

const UpdateMovementModal: Component<UpdateMovementModalProps> = (props) => {
  const { t } = useTranslation();

  const [movementType, setMovementType] = createSignal<string>('SALES');
  const [store, setStore] = createSignal('');
  const [invoice, setInvoice] = createSignal('');
  const [description, setDescription] = createSignal('');
  const [products, setProducts] = createSignal<ProductEntry[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [errors, setErrors] = createSignal<Record<string, string>>({});
  const [entityId, setEntityId] = createSignal('');
  const [movementDate, setMovementDate] = createSignal('');

  // Selected entity memo
  const selectedEntity = createMemo(() => {
    if (!entityId()) return null;
    return providersClientsStore.getEntityById(entityId());
  });

  // Load entities when modal opens
  createEffect(() => {
    if (props.isOpen) {
      providersClientsStore.loadEntities();
    }
  });

  // Initialize form with movement data when modal opens
  createEffect(() => {
    const movement = props.movement;
    if (movement && props.isOpen) {
      setMovementType(movement.type || 'SALES');
      setStore(movement.store || '');
      setInvoice(movement.invoice || '');
      setDescription(movement.description || '');
      setProducts(movement.products || []);
      setEntityId(movement.entityId || '');
      // Format date for input (YYYY-MM-DD)
      const dateValue = movement.createDate || movement.createdDate || movement.date;
      if (dateValue) {
        const date = new Date(dateValue);
        setMovementDate(date.toISOString().split('T')[0]);
      } else {
        setMovementDate('');
      }
      setErrors({});
    }
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const calculateSubtotal = () => {
    return products().reduce((sum, p) => sum + (p.total || (p.qty * p.price)), 0);
  };

  const updateProductQty = (index: number, newQty: number) => {
    const updatedProducts = [...products()];
    updatedProducts[index] = {
      ...updatedProducts[index],
      qty: newQty,
      total: newQty * updatedProducts[index].price
    };
    setProducts(updatedProducts);
  };

  const updateProductPrice = (index: number, newPrice: number) => {
    const updatedProducts = [...products()];
    const currentProduct = updatedProducts[index];

    // Set price to appropriate field based on movement type
    if (movementType() === 'SALES') {
      // Sales - use salePrice
      updatedProducts[index] = {
        ...currentProduct,
        price: newPrice,
        salePrice: newPrice,
        total: currentProduct.qty * newPrice
      };
    } else {
      // Entry/Transfer - use costPrice
      updatedProducts[index] = {
        ...currentProduct,
        price: newPrice,
        costPrice: newPrice,
        unitCost: newPrice,
        total: currentProduct.qty * newPrice
      };
    }
    setProducts(updatedProducts);
  };

  const removeProduct = (index: number) => {
    const updatedProducts = products().filter((_, i) => i !== index);
    setProducts(updatedProducts);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!store().trim()) {
      newErrors.store = t('forms.requiredField', 'Campo requerido');
    }

    if (products().length === 0) {
      newErrors.products = t('inventory.atLeastOneProduct', 'Se requiere al menos un producto');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();

    if (!validateForm() || !props.movement) {
      return;
    }

    setLoading(true);

    try {
      const movement = props.movement;

      // Update the movement with the new data structure
      const entity = selectedEntity();
      const updatedMovement: InventoryMovement = {
        ...movement,
        type: movementType(),
        store: store().trim(),
        invoice: invoice().trim(),
        description: description().trim(),
        products: products(),
        productSubtotal: calculateSubtotal(),
        updatedAt: new Date().toISOString(),
        // Date
        createDate: movementDate() ? new Date(movementDate()).toISOString() : movement.createDate,
        // Provider/Customer info
        entityId: entity?.id,
        entityName: entity?.name,
        entityType: entity?.type
      };

      // Update movement in store (now async with API call)
      await inventoryStore.updateMovement(movement.id, updatedMovement);

      // Call callback if provided
      props.onMovementUpdated?.();

      // Close modal
      props.onClose();

      // Reset form
      resetForm();
    } catch (error) {
      console.error('Error updating movement:', error);
      setErrors({ submit: t('forms.saveError', 'Error al guardar') });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setMovementType('SALES');
    setStore('');
    setInvoice('');
    setDescription('');
    setProducts([]);
    setErrors({});
    setEntityId('');
    setMovementDate('');
  };

  const handleClose = () => {
    resetForm();
    props.onClose();
  };

  const getMovementTypeColor = (type: string) => {
    const colors: Record<string, { bg: string; color: string }> = {
      'ENTRY': { bg: '#e8f5e8', color: '#2d7d32' },
      'SALES': { bg: '#ffebee', color: '#d32f2f' },
      'TRANSFER': { bg: '#e3f2fd', color: '#1976d2' }
    };
    return colors[type] || { bg: '#f5f5f5', color: '#666' };
  };

  const inputStyle = {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '1rem',
    transition: 'border-color 0.2s ease'
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

  const productItemStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    gap: '0.5rem',
    padding: '0.75rem',
    background: 'var(--gray-50)',
    'border-radius': 'var(--border-radius-sm)',
    'margin-bottom': '0.5rem'
  };

  return (
    <Modal
      isOpen={props.isOpen}
      onClose={handleClose}
      title={t('inventory.editMovement', 'Editar Movimiento')}
      size="lg"
      maxWidth='86vw'
    >
      <Show when={props.movement} fallback={<div>{t('common.loading', 'Cargando...')}</div>}>
        <form onSubmit={handleSubmit}>
          {/* Movement Type and Date */}
          <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '1rem', 'margin-bottom': '1rem' }}>
            <div>
              <label style={labelStyle}>{t('inventory.movementType', 'Tipo de Movimiento')}</label>
              <select
                style={inputStyle}
                value={movementType()}
                onChange={(e) => setMovementType(e.target.value)}
                disabled={loading()}
              >
                <option value="ENTRY">{t('inventory.stockIn', 'Entrada de Stock')}</option>
                <option value="SALES">{t('inventory.stockOut', 'Salida de Stock')}</option>
                <option value="TRANSFER">{t('inventory.transfer', 'Transferencia')}</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>{t('common.date', 'Fecha')} *</label>
              <input
                type="date"
                style={inputStyle}
                value={movementDate()}
                onInput={(e) => setMovementDate(e.target.value)}
                disabled={loading()}
              />
            </div>
          </div>
          <div style={formGroupStyle}>
            <div style={{ 'margin-top': '0.5rem' }}>
              <span style={{
                display: 'inline-block',
                padding: '0.25rem 0.75rem',
                'border-radius': '9999px',
                'font-size': '0.75rem',
                'font-weight': '600',
                background: getMovementTypeColor(movementType()).bg,
                color: getMovementTypeColor(movementType()).color
              }}>
                {movementType()}
              </span>
            </div>
          </div>

          {/* Provider/Customer Selection */}
          {(movementType() === 'ENTRY' || movementType() === 'SALES') && (
            <div style={formGroupStyle}>
              <label style={labelStyle}>
                {movementType() === 'ENTRY'
                  ? t('inventory.provider', 'Proveedor')
                  : t('inventory.customer', 'Cliente')}
              </label>
              <SearchableEntityDropdown
                value={entityId()}
                onChange={(entity) => setEntityId(entity?.id || '')}
                entityType={movementType() === 'ENTRY' ? 'provider' : 'customer'}
                placeholder={movementType() === 'ENTRY'
                  ? t('inventory.searchProvider', 'Buscar proveedor...')
                  : t('inventory.searchCustomer', 'Buscar cliente...')}
                disabled={loading()}
              />
              {selectedEntity() && (
                <div style={{
                  'margin-top': '0.5rem',
                  'font-size': '0.875rem',
                  color: 'var(--text-muted)',
                  padding: '0.5rem',
                  background: 'var(--gray-50)',
                  'border-radius': 'var(--border-radius-sm)'
                }}>
                  {selectedEntity()?.email && <span style={{ 'margin-right': '1rem' }}>📧 {selectedEntity()?.email}</span>}
                  {selectedEntity()?.phone && <span>📞 {selectedEntity()?.phone}</span>}
                </div>
              )}
            </div>
          )}

          {/* Store */}
          <div style={formGroupStyle}>
            <label style={labelStyle}>{t('inventory.store', 'Tienda')} *</label>
            <input
              type="text"
              style={{
                ...inputStyle,
                'border-color': errors().store ? '#d32f2f' : 'var(--border-color)'
              }}
              value={store()}
              onInput={(e) => setStore(e.target.value)}
              placeholder={t('inventory.enterStore', 'Ingrese la tienda')}
              disabled={loading()}
            />
            <Show when={errors().store}>
              <div style={errorStyle}>{errors().store}</div>
            </Show>
          </div>

          {/* Invoice */}
          <div style={formGroupStyle}>
            <label style={labelStyle}>{t('common.invoice', 'Factura')}</label>
            <input
              type="text"
              style={inputStyle}
              value={invoice()}
              onInput={(e) => setInvoice(e.target.value)}
              placeholder={t('inventory.enterInvoice', 'Ingrese número de factura')}
              disabled={loading()}
            />
          </div>

          {/* Description */}
          <div style={formGroupStyle}>
            <label style={labelStyle}>{t('common.description', 'Descripción')}</label>
            <textarea
              style={{
                ...inputStyle,
                resize: 'vertical',
                'min-height': '60px'
              }}
              value={description()}
              onInput={(e) => setDescription(e.target.value)}
              placeholder={t('common.enterDescription', 'Ingrese una descripción')}
              disabled={loading()}
            />
          </div>

          {/* Products List */}
          <div style={formGroupStyle}>
            <label style={labelStyle}>
              {t('inventory.products', 'Productos')} ({products().length})
            </label>

            <Show when={errors().products}>
              <div style={{ ...errorStyle, 'margin-bottom': '0.5rem' }}>{errors().products}</div>
            </Show>

            <Show when={products().length === 0}>
              <div style={{
                padding: '1rem',
                'text-align': 'center',
                color: 'var(--text-muted)',
                background: 'var(--gray-50)',
                'border-radius': 'var(--border-radius-sm)'
              }}>
                {t('inventory.noProducts', 'No hay productos en este movimiento')}
              </div>
            </Show>

            <For each={products()}>
              {(product, index) => (
                <div style={productItemStyle}>
                  <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ 'font-weight': '600', 'margin-bottom': '0.25rem' }}>
                        {product.product?.label || t('inventory.product', 'Producto')}
                      </div>
                      <div style={{ 'font-size': '0.8rem', color: 'var(--text-muted)' }}>
                        {product.product?.code || ''}
                        <Show when={product.bulkId}>
                          <span> • {t('inventory.bulk', 'Bulto')}: {product.bulkId?.substring(0, 8)}...</span>
                        </Show>
                      </div>
                    </div>
                    <button
                      type="button"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#d32f2f',
                        cursor: 'pointer',
                        padding: '0.25rem',
                        'font-size': '1.2rem'
                      }}
                      onClick={() => removeProduct(index())}
                      disabled={loading()}
                      title={t('common.remove', 'Eliminar')}
                    >
                      ×
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', 'align-items': 'center' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                        {t('common.quantity', 'Cantidad')}
                      </label>
                      <FormInput
                        type="number"
                        style={{ ...inputStyle, padding: '0.35rem' }}
                        value={product.qty}
                        onChange={(e) => updateProductQty(index(), parseFloat(e) || 0)}
                        min="0"
                        step="0.01"
                        disabled={loading()}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                        {movementType() === 'SALES'
                          ? t('inventory.salePrice', 'Precio Venta')
                          : t('inventory.costPrice', 'Precio Costo')}
                      </label>
                      <FormInput
                        type="number"
                        style={{ ...inputStyle, padding: '0.35rem' }}
                        value={product.price}
                        onChange={(e) => updateProductPrice(index(), parseFloat(e) || 0)}
                        min="0"
                        step="0.01"
                        disabled={loading()}
                      />
                    </div>
                    <div style={{ 'text-align': 'right', 'min-width': '80px' }}>
                      <label style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                        {t('common.total', 'Total')}
                      </label>
                      <div style={{ 'font-weight': '600', color: 'var(--primary-color)' }}>
                        {formatCurrency(product.total || (product.qty * product.price))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </For>
          </div>

          {/* Subtotal Display */}
          <Show when={products().length > 0}>
            <div style={{
              ...formGroupStyle,
              padding: '1rem',
              background: 'var(--surface-color)',
              'border-radius': 'var(--border-radius-sm)',
              border: '2px solid var(--primary-color)'
            }}>
              <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' }}>
                <span style={{ 'font-weight': '600', 'font-size': '1.1rem' }}>
                  {t('common.subtotal', 'Subtotal')}:
                </span>
                <span style={{ 'font-weight': '700', color: 'var(--primary-color)', 'font-size': '1.25rem' }}>
                  {formatCurrency(calculateSubtotal())}
                </span>
              </div>
              <div style={{ 'font-size': '0.85rem', color: 'var(--text-muted)', 'margin-top': '0.25rem' }}>
                {products().length} {t('inventory.products', 'productos')} • {products().reduce((sum, p) => sum + p.qty, 0)} {t('inventory.units', 'unidades')}
              </div>
            </div>
          </Show>

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
              {loading() ? t('modals.processing', 'Procesando...') : t('inventory.updateMovement', 'Actualizar Movimiento')}
            </button>
          </div>
        </form>
      </Show>
    </Modal>
  );
};

export default UpdateMovementModal;
