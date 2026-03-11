import { Component, Show, createSignal, createEffect } from 'solid-js';
import { Card, Button, FormInput } from '../../ui';
import { POSProduct } from '../types/posTypes';
import { useTranslation } from '../../../translations';
import Icon from '../../../components/Icon';

interface ProductEditorProps {
  product: POSProduct | null;
  onUpdate: (product: POSProduct) => void;
  onClose: () => void;
}

const ProductEditor: Component<ProductEditorProps> = (props) => {
  const { t } = useTranslation();
  
  // Local state for editing
  const [editedProduct, setEditedProduct] = createSignal<POSProduct | null>(null);
  const [quantity, setQuantity] = createSignal(1);
  const [unitPrice, setUnitPrice] = createSignal(0);
  const [discount, setDiscount] = createSignal(0);
  const [discountType, setDiscountType] = createSignal<'amount' | 'percent'>('amount');
  const [notes, setNotes] = createSignal('');
  
  // Update local state when product changes
  createEffect(() => {
    if (props.product) {
      setEditedProduct({ ...props.product });
      setQuantity(props.product.qty);
      setUnitPrice(props.product.unitPrice);
      setDiscount(props.product.discount || 0);
      setDiscountType(props.product.discountPercent ? 'percent' : 'amount');
      setNotes(props.product.notes || '');
    }
  });
  
  // Calculate totals
  const calculateTotal = () => {
    const qty = quantity();
    const price = unitPrice();
    const disc = discount();
    const type = discountType();
    
    let subtotal = qty * price;
    let discountAmount = 0;
    
    if (type === 'percent') {
      discountAmount = subtotal * (disc / 100);
    } else {
      discountAmount = disc;
    }
    
    return Math.max(0, subtotal - discountAmount);
  };
  
  // Handle save
  const handleSave = () => {
    const edited = editedProduct();
    if (!edited) return;
    
    const updatedProduct: POSProduct = {
      ...edited,
      qty: quantity(),
      unitPrice: unitPrice(),
      discount: discountType() === 'amount' ? discount() : 0,
      discountPercent: discountType() === 'percent' ? discount() : 0,
      total: calculateTotal(),
      notes: notes()
    };
    
    props.onUpdate(updatedProduct);
  };
  
  if (!props.product) return null;
  
  return (
    <Card>
      <div style={{ padding: '1rem' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          'justify-content': 'space-between',
          'align-items': 'center',
          'margin-bottom': '1.5rem'
        }}>
          <h3 style={{ margin: 0, 'font-size': '1.125rem' }}>
            {t('pos.editProduct', 'Editar Producto')}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={props.onClose}
          >
            <Icon name="close" size="1.25rem" />
          </Button>
        </div>
        
        {/* Product Info */}
        <div style={{
          padding: '1rem',
          background: 'var(--background-secondary)',
          'border-radius': 'var(--border-radius-sm)',
          'margin-bottom': '1.5rem'
        }}>
          <h4 style={{ margin: '0 0 0.5rem 0', 'font-size': '1rem' }}>
            {props.product.product.label}
          </h4>
          <div style={{ display: 'flex', gap: '1rem', 'flex-wrap': 'wrap' }}>
            <span style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
              {t('pos.code', 'Código')}: {props.product.product.code}
            </span>
            <Show when={props.product.product.sku}>
              <span style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                SKU: {props.product.product.sku}
              </span>
            </Show>
            <Show when={props.product.product.category}>
              <span style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                {t('pos.category', 'Categoría')}: {props.product.product.category}
              </span>
            </Show>
          </div>
        </div>
        
        {/* Quantity */}
        <div style={{ 'margin-bottom': '1rem' }}>
          <label style={{
            display: 'block',
            'font-size': '0.875rem',
            'font-weight': '500',
            'margin-bottom': '0.5rem'
          }}>
            {t('pos.quantity', 'Cantidad')}
          </label>
          <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuantity(Math.max(1, quantity() - 1))}
            >
              <Icon name="minus" size="1rem" />
            </Button>
            <FormInput
              type="number"
              value={quantity()}
              onChange={(value) => setQuantity(Math.max(1, parseInt(value) || 1))}
              style={{ width: '80px', 'text-align': 'center' }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuantity(quantity() + 1)}
            >
              <Icon name="add" size="1rem" />
            </Button>
          </div>
        </div>
        
        {/* Unit Price */}
        <div style={{ 'margin-bottom': '1rem' }}>
          <label style={{
            display: 'block',
            'font-size': '0.875rem',
            'font-weight': '500',
            'margin-bottom': '0.5rem'
          }}>
            {t('pos.unitPrice', 'Precio Unitario')}
          </label>
          <FormInput
            type="number"
            value={unitPrice()}
            onChange={(value) => setUnitPrice(parseFloat(value) || 0)}
            step="0.01"
            min="0"
            icon="dollar"
          />
        </div>
        
        {/* Discount */}
        <div style={{ 'margin-bottom': '1rem' }}>
          <label style={{
            display: 'block',
            'font-size': '0.875rem',
            'font-weight': '500',
            'margin-bottom': '0.5rem'
          }}>
            {t('pos.discount', 'Descuento')}
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <FormInput
              type="number"
              value={discount()}
              onChange={(value) => setDiscount(parseFloat(value) || 0)}
              step="0.01"
              min="0"
              style={{ flex: 1 }}
            />
            <select
              value={discountType()}
              onChange={(e) => setDiscountType(e.target.value as 'amount' | 'percent')}
              style={{
                padding: '0.75rem',
                border: '1px solid var(--border-color)',
                'border-radius': 'var(--border-radius-sm)',
                background: 'white',
                width: '100px'
              }}
            >
              <option value="amount">$</option>
              <option value="percent">%</option>
            </select>
          </div>
        </div>
        
        {/* Notes */}
        <div style={{ 'margin-bottom': '1.5rem' }}>
          <label style={{
            display: 'block',
            'font-size': '0.875rem',
            'font-weight': '500',
            'margin-bottom': '0.5rem'
          }}>
            {t('pos.notes', 'Notas')}
          </label>
          <textarea
            value={notes()}
            onInput={(e) => setNotes(e.currentTarget.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid var(--border-color)',
              'border-radius': 'var(--border-radius-sm)',
              'min-height': '80px',
              resize: 'vertical'
            }}
            placeholder={t('pos.addNotesPlaceholder', 'Agregar notas sobre este producto...')}
          />
        </div>
        
        {/* Total */}
        <div style={{
          padding: '1rem',
          background: 'var(--primary-light)',
          'border-radius': 'var(--border-radius-sm)',
          'margin-bottom': '1.5rem'
        }}>
          <div style={{
            display: 'flex',
            'justify-content': 'space-between',
            'align-items': 'center'
          }}>
            <span style={{ 'font-weight': '500' }}>
              {t('pos.total', 'Total')}
            </span>
            <span style={{
              'font-size': '1.5rem',
              'font-weight': '700',
              color: 'var(--primary-color)'
            }}>
              ${calculateTotal().toFixed(2)}
            </span>
          </div>
        </div>
        
        {/* Actions */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          'justify-content': 'flex-end'
        }}>
          <Button
            variant="outline"
            onClick={props.onClose}
          >
            {t('common.cancel', 'Cancelar')}
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
          >
            <Icon name="check" size="1rem" style={{ 'margin-right': '0.5rem' }} />
            {t('common.save', 'Guardar')}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ProductEditor;