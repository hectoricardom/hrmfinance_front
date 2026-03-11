import { Component, createSignal, Show, For } from 'solid-js';
import { Card, Button, FormInput } from '../../ui';
import { POSCart, POSProduct, POSService, POSSettings } from '../types/posTypes';
import Icon from '../../../components/Icon';
import { useTranslation } from '../../../translations';
import { devLog } from '../../../services/utils';

interface ShoppingCartProps {
  cart: POSCart;
  totals: {
    subtotal: number;
    totalDiscount: number;
    totalTax: number;
    total: number;
  };
  onUpdateQty: (itemId: string, newQty: number) => void;
  onRemoveItem: (itemId: string) => void;
  onClearCart: () => void;
  onProceedToPayment: () => void;
  settings: POSSettings;
}

const ShoppingCart: Component<ShoppingCartProps> = (props) => {
  const { t } = useTranslation();
  const [editingQty, setEditingQty] = createSignal<string | null>(null);
  const [tempQty, setTempQty] = createSignal<number>(0);

  // Start editing quantity
  const startEditingQty = (itemId: string, currentQty: number) => {
    setEditingQty(itemId);
    setTempQty(currentQty);
  };

  // Confirm quantity change
  const confirmQtyChange = (itemId: string) => {
    if (tempQty() > 0) {
      props.onUpdateQty(itemId, tempQty());
    }
    setEditingQty(null);
  };

  // Cancel quantity edit
  const cancelQtyEdit = () => {
    setEditingQty(null);
    setTempQty(0);
  };

  // Handle quick quantity buttons
  const quickAddQty = (itemId: string, currentQty: number, increment: number) => {
    const newQty = Math.max(1, currentQty + increment);
    props.onUpdateQty(itemId, newQty);
  };

  const isEmpty = () => props.cart.products.length === 0 && props.cart.services.length === 0;


  //devLog(props.cart)

  //  {JSON.stringify(props.cart)}

  return (
    <div style={{
      display: 'flex',
      'flex-direction': 'column',
      height: '100%',
      gap: '1rem'
    }}>
      {/* Cart Header */}
      <Card>
        <div style={{
          padding: '1rem',
          display: 'flex',
          'justify-content': 'space-between',
          'align-items': 'center'
        }}>
          <h3 style={{ margin: 0, 'font-size': '1.25rem' }}>
            {t('pos.shoppingCart', 'Carrito de Compras')}
          </h3>
          <Show when={!isEmpty()}>
            <Button
              variant="outline"
              size="sm"
              onClick={props.onClearCart}
              title="Clear all items"
            >
              <Icon name="trash" size="1rem" />
            </Button>
          </Show>
        </div>
      </Card>

      <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.5rem' }}>
        
      </div>

      {/* Cart Items */}
      <Show when={false} >
      <div style={{ 'flex-grow': 1, overflow: 'auto' }}>
        <Show when={!isEmpty()} fallback={
          <Card>
            <div style={{
              padding: '3rem 1rem',
              'text-align': 'center',
              color: 'var(--text-muted)'
            }}>
              <Icon name="shopping-cart" size="3rem" style={{ 
                'margin-bottom': '1rem', 
                opacity: '0.3' 
              }} />
              <h4 style={{ 'margin-bottom': '0.5rem' }}>{t('pos.cartEmpty', 'El carrito está vacío')}</h4>
              <p style={{ 'font-size': '0.875rem' }}>
                {t('pos.selectProductsToAdd', 'Seleccione productos para agregarlos al carrito')}
              </p>
            </div>
          </Card>
        }>
          <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.5rem' }}>
            {/* Products */}
            <For each={props.cart.products}>
              {(product) => (
                <Card>
                  <div style={{ padding: '1rem' }}>
                    <div style={{
                      display: 'flex',
                      'justify-content': 'space-between',
                      'align-items': 'flex-start',
                      'margin-bottom': '0.75rem'
                    }}>
                      <div style={{ 'flex-grow': 1, 'margin-right': '1rem' }}>
                        <h4 style={{
                          margin: '0 0 0.25rem 0',
                          'font-size': '0.875rem',
                          'font-weight': '600',
                          'line-height': '1.2'
                        }}>
                          {product?.product?.label}
                        </h4>
                        <p style={{
                          margin: '0',
                          'font-size': '0.75rem',
                          color: 'var(--text-muted)'
                        }}>
                          ${product?.unitPrice?.toFixed?.(2)} {t('pos.each', 'c/u')}
                        </p>
                        <Show when={product?.product?.sku}>
                          <p style={{
                            margin: '0',
                            'font-size': '0.7rem',
                            color: 'var(--text-muted)'
                          }}>
                            {t('pos.sku', 'SKU')}: {product?.product?.sku}
                          </p>
                        </Show>
                      </div>
                      
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => props.onRemoveItem(product.id)}
                        title="Remove item"
                      >
                        <Icon name="close" size="0.75rem" />
                      </Button>
                    </div>

                    {/* Quantity Controls */}
                    <div style={{
                      display: 'flex',
                      'justify-content': 'space-between',
                      'align-items': 'center'
                    }}>
                      <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                        <Show when={editingQty() !== product?.id} fallback={
                          <div style={{ display: 'flex', 'align-items': 'center', gap: '0.25rem' }}>
                            <input
                              type="number"
                              min="1"
                              value={tempQty()}
                              onInput={(e) => setTempQty(parseInt(e.target.value) || 1)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  confirmQtyChange(product.id);
                                } else if (e.key === 'Escape') {
                                  cancelQtyEdit();
                                }
                              }}
                              style={{
                                width: '60px',
                                padding: '0.25rem',
                                border: '1px solid var(--border-color)',
                                'border-radius': 'var(--border-radius-sm)',
                                'text-align': 'center',
                                'font-size': '0.875rem'
                              }}
                              autofocus
                            />
                            <Button
                              variant="primary"
                              size="xs"
                              onClick={() => confirmQtyChange(product.id)}
                            >
                              <Icon name="check" size="0.75rem" />
                            </Button>
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={cancelQtyEdit}
                            >
                              <Icon name="close" size="0.75rem" />
                            </Button>
                          </div>
                        }>
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => quickAddQty(product?.id, product.qty, -1)}
                            disabled={product.qty <= 1}
                          >
                            <Icon name="minus" size="0.75rem" />
                          </Button>
                          
                          <span
                            style={{
                              padding: '0.25rem 0.5rem',
                              background: 'var(--background-secondary)',
                              'border-radius': 'var(--border-radius-sm)',
                              'font-weight': '600',
                              'min-width': '40px',
                              'text-align': 'center',
                              cursor: 'pointer'
                            }}
                            onClick={() => startEditingQty(product.id, product.qty)}
                            title="Click to edit quantity"
                          >
                            {product.qty}
                          </span>
                          
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => quickAddQty(product.id, product.qty, 1)}
                          >
                            <Icon name="plus" size="0.75rem" />
                          </Button>
                        </Show>
                      </div>
                      
                      <div style={{ 'text-align': 'right' }}>
                        <div style={{
                          'font-weight': '700',
                          'font-size': '0.875rem',
                          color: 'var(--primary-color)'
                        }}>
                          ${product?.total?.toFixed(2)}
                        </div>
                        <Show when={product?.discount > 0}>
                          <div style={{
                            'font-size': '0.7rem',
                            color: 'var(--success-color)'
                          }}>
                            {t('pos.saved', 'Ahorrado')}: ${product?.discount?.toFixed(2)}
                          </div>
                        </Show>
                      </div>
                    </div>

                    {/* Product Notes */}
                    <Show when={product.notes}>
                      <div style={{
                        'margin-top': '0.5rem',
                        padding: '0.5rem',
                        background: 'var(--background-secondary)',
                        'border-radius': 'var(--border-radius-sm)',
                        'font-size': '0.75rem',
                        color: 'var(--text-muted)'
                      }}>
                        {t('pos.note', 'Nota')}: {product.notes}
                      </div>
                    </Show>
                  </div>
                </Card>
              )}
            </For>

            {/* Services */}
            <For each={props.cart.services}>
              {(service) => (
                <Card>
                  <div style={{ padding: '1rem' }}>
                    <div style={{
                      display: 'flex',
                      'justify-content': 'space-between',
                      'align-items': 'center'
                    }}>
                      <div>
                        <h4 style={{
                          margin: '0 0 0.25rem 0',
                          'font-size': '0.875rem',
                          'font-weight': '600'
                        }}>
                          {service.name}
                        </h4>
                        <p style={{
                          margin: '0',
                          'font-size': '0.75rem',
                          color: 'var(--text-muted)'
                        }}>
                          {t('pos.service', 'Servicio')} • {t('pos.qty', 'Cant')}: {service.qty}
                        </p>
                      </div>
                      
                      <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                        <span style={{
                          'font-weight': '700',
                          'font-size': '0.875rem',
                          color: 'var(--primary-color)'
                        }}>
                          ${service.total.toFixed(2)}
                        </span>
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => props.onRemoveItem(service.id)}
                        >
                          <Icon name="close" size="0.75rem" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </For>
          </div>
        </Show>
      </div>
    </Show>
      {/* Cart Summary */}
      <Show when={!isEmpty()}>
        <Card>
          <div style={{ padding: '1rem' }}>
            {/* Totals Breakdown */}
            <div style={{
              display: 'flex',
              'flex-direction': 'column',
              gap: '0.5rem',
              'margin-bottom': '1rem'
            }}>
              <div style={{
                display: 'flex',
                'justify-content': 'space-between',
                'font-size': '0.875rem'
              }}>
                <span>{t('common.subtotal', 'Subtotal')}:</span>
                <span>${props.totals.subtotal.toFixed(2)}</span>
              </div>
              
              <Show when={props.totals.totalDiscount > 0}>
                <div style={{
                  display: 'flex',
                  'justify-content': 'space-between',
                  'font-size': '0.875rem',
                  color: 'var(--success-color)'
                }}>
                  <span>{t('pos.discount', 'Descuento')}:</span>
                  <span>-${props.totals.totalDiscount.toFixed(2)}</span>
                </div>
              </Show>
              
              <Show when={props.totals.totalTax > 0}>
                <div style={{
                  display: 'flex',
                  'justify-content': 'space-between',
                  'font-size': '0.875rem'
                }}>
                  <span>{t('common.tax', 'Impuesto')}:</span>
                  <span>${props.totals.totalTax.toFixed(2)}</span>
                </div>
              </Show>
              
              <hr style={{ 
                margin: '0.5rem 0', 
                border: 'none', 
                'border-top': '1px solid var(--border-color)' 
              }} />
              
              <div style={{
                display: 'flex',
                'justify-content': 'space-between',
                'font-size': '1.1rem',
                'font-weight': '700',
                color: 'var(--primary-color)'
              }}>
                <span>{t('common.total', 'Total')}:</span>
                <span>${props.totals.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Item Count */}
            <div style={{
              'text-align': 'center',
              'font-size': '0.75rem',
              color: 'var(--text-muted)',
              'margin-bottom': '1rem'
            }}>
              {props.cart.products.length + props.cart.services.length} {t('pos.itemsInCart', 'artículos en el carrito')}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.5rem' }}>
              <Button
                variant="primary"
                size="lg"
                onClick={props.onProceedToPayment}
                style={{ width: '100%' }}
              >
                <Icon name="credit-card" size="1rem" style={{ 'margin-right': '0.5rem' }} />
                {t('pos.proceedToPayment', 'Proceder al Pago')}
              </Button>
              
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={props.onClearCart}
                  style={{ 'flex-grow': 1 }}
                >
                  <Icon name="trash" size="0.875rem" style={{ 'margin-right': '0.5rem' }} />
                  {t('pos.clearCart', 'Limpiar Carrito')}
                </Button>
                
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    // TODO: Implement save for later functionality
                    devLog('Save cart for later');
                  }}
                  style={{ 'flex-grow': 1 }}
                >
                  <Icon name="bookmark" size="0.875rem" style={{ 'margin-right': '0.5rem' }} />
                  {t('pos.hold', 'Mantener')}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </Show>

      {/* Keyboard Shortcuts Info */}
      <Show when={!isEmpty()}>
        <div style={{
          padding: '0.5rem',
          'text-align': 'center',
          'font-size': '0.7rem',
          color: 'var(--text-muted)',
          'border-top': '1px solid var(--border-color)'
        }}>
          {t('pos.keyboardShortcuts', 'Atajos de Teclado')}: {t('pos.ctrlP', 'Ctrl+P (Pago)')} • {t('pos.ctrlC', 'Ctrl+C (Limpiar)')} • {t('pos.ctrlN', 'Ctrl+N (Nueva Venta)')}
        </div>
      </Show>
    </div>
  );
};

export default ShoppingCart;