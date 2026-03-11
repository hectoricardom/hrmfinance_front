import { Component, Show, For } from 'solid-js';
import { Card, Button } from '../../ui';
import { POSCart } from '../types/posTypes';
import { useTranslation } from '../../../translations';
import Icon from '../../../components/Icon';
import { devLog } from '../../../services/utils';

interface ProductListProps {
  cart: POSCart;
  onEditProduct: (product: any) => void;
  onRemoveProduct: (productId: string) => void;
}

const ProductList: Component<ProductListProps> = (props) => {
  const { t } = useTranslation();


  devLog(props.cart)
  
  return (
    <Card>
      <div style={{ padding: '0.75rem' }}>
        <div style={{
          display: 'flex',
          'justify-content': 'space-between',
          'align-items': 'center',
          'margin-bottom': '0.75rem'
        }}>
          <h3 style={{ margin: 0, 'font-size': '1.125rem' }}>
            {t('pos.selectedProducts', 'Productos Seleccionados')}
          </h3>
          <span style={{
            background: 'var(--primary-light)',
            color: 'var(--primary-color)',
            padding: '0.25rem 0.75rem',
            'border-radius': 'var(--border-radius-sm)',
            'font-size': '0.875rem',
            'font-weight': '500'
          }}>
            {props.cart.products.length} {t('pos.items', 'artículos')}
          </span>
        </div>
        
        
        <Show when={props.cart.products.length === 0} fallback={
          <div style={{ 
            'max-height': '600px',
            'overflow-y': 'auto'
          }}>
            <For each={props.cart.products}>
              {(product) => (
                <div style={{
                  display: 'flex',
                  'align-items': 'center',
                  gap: '0.75rem',
                  padding: '0.5rem',
                  border: '1px solid var(--border-color)',
                  'border-radius': 'var(--border-radius-sm)',
                  'margin-bottom': '0.4rem',
                  background: 'white'
                }}>
                  {/* Product Image */}
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: product.product.image 
                      ? `url(${product.product.image})` 
                      : 'var(--background-secondary)',
                    'background-size': 'cover',
                    'background-position': 'center',
                    'border-radius': 'var(--border-radius-sm)',
                    'flex-shrink': 0,
                    display: 'flex',
                    'align-items': 'center',
                    'justify-content': 'center'
                  }}>
                    <Show when={!product.product.image}>
                      <Icon name="image" size="1.25rem" style={{ opacity: '0.3' }} />
                    </Show>
                  </div>
                  
                  {/* Product Info */}
                  <div style={{ 'flex-grow': 1, 'min-width': 0 }}>
                    <h4 style={{
                      margin: '0 0 0.25rem 0',
                      'font-size': '0.875rem',
                      'font-weight': '600',
                      overflow: 'hidden',
                      'text-overflow': 'ellipsis',
                      'white-space': 'nowrap'
                    }}>
                      {product.product.label}
                    </h4>
                    
                    <div style={{
                      display: 'flex',
                      'justify-content': 'space-between',
                      'align-items': 'center',
                      'font-size': '0.75rem',
                      color: 'var(--text-muted)'
                    }}>
                      <span>
                        {t('pos.qty', 'Cant')}: {product.qty} × ${product.unitPrice.toFixed(2)}
                      </span>
                      <span style={{
                        'font-weight': '600',
                        color: 'var(--primary-color)'
                      }}>
                        ${product.total.toFixed(2)}
                      </span>
                    </div>
                    
                    <Show when={product.discount && product.discount > 0}>
                      <div style={{
                        'font-size': '0.7rem',
                        color: 'var(--success-color)',
                        'margin-top': '0.25rem'
                      }}>
                        {t('pos.discount', 'Descuento')}: ${product.discount.toFixed(2)}
                      </div>
                    </Show>
                    
                    <Show when={product.notes}>
                      <div style={{
                        'font-size': '0.7rem',
                        color: 'var(--text-muted)',
                        'margin-top': '0.25rem',
                        'font-style': 'italic'
                      }}>
                        {product.notes}
                      </div>
                    </Show>
                  </div>
                  
                  {/* Actions */}
                  <div style={{
                    display: 'flex',
                    'flex-direction': 'column',
                    gap: '0.25rem',
                    'flex-shrink': 0
                  }}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => props.onEditProduct(product)}
                      style={{ padding: '0.5rem' }}
                    >
                      <Icon name="edit" size="0.875rem" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => props.onRemoveProduct(product.id)}
                      style={{ 
                        padding: '0.5rem',
                        color: 'var(--error-color)',
                        'border-color': 'var(--error-color)'
                      }}
                    >
                      <Icon name="delete" size="0.875rem" />
                    </Button>
                  </div>
                </div>
              )}
            </For>
          </div>
        }>
          {/* Empty State */}
          <div style={{
            padding: '3rem 1rem',
            'text-align': 'center',
            color: 'var(--text-muted)'
          }}>
            <Icon name="shopping-cart" size="3rem" style={{ 
              'margin-bottom': '1rem', 
              opacity: '0.3' 
            }} />
            <h4 style={{ 'margin-bottom': '0.5rem' }}>
              {t('pos.noProductsSelected', 'No hay productos seleccionados')}
            </h4>
            <p style={{ 'font-size': '0.875rem' }}>
              {t('pos.selectProductsFromGrid', 'Seleccione productos de la cuadrícula para comenzar')}
            </p>
          </div>
        </Show>
      </div>
    </Card>
  );
};

export default ProductList;