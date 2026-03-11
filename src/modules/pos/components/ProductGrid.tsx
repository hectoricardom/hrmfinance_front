import { Component, createSignal, Show, For, onMount, createEffect } from 'solid-js';
import { Card, Button, FormInput } from '../../ui';
import { POSProduct, POSProductQuick, POSCart } from '../types/posTypes';
import { authStore } from '../../../stores/authStore';
import Icon from '../../../components/Icon';
import EnhancedBarcodeScanner from '../../scanner/components/EnhancedBarcodeScanner';
import { inventoryStore, Product } from '../../inventory/stores/inventoryStore';
import ApiSearchableProductDropdown from '../../inventory/components/ApiSearchableProductDropdown';
import { useTranslation } from '../../../translations';
import { devLog } from '../../../services/utils';

interface ProductGridProps {
  cart: POSCart;
  onProductSelect: (product: POSProduct) => void;
  onUpdateQuantity: (productId: string, newQty: number) => void;
  onUpdatePrice: (productId: string, newPrice: number) => void;
  scannerActive: boolean;
  onToggleScanner: (active: boolean) => void;
  selectedStore?: string;
}

const ProductGrid: Component<ProductGridProps> = (props) => {
  const { t } = useTranslation();
  
  // State
  const [products, setProducts] = createSignal<Product[]>([]);
  const [searchTerm, setSearchTerm] = createSignal('');
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal('');
  const [selectedProduct, setSelectedProduct] = createSignal<Product | null>(null);
  
  // Cart products are now the main display
  const cartProducts = () => props.cart.products;

  // Load products from inventory store
  const loadProducts = async () => {
    setLoading(true);
    try {
      // Load products from inventory store
      let qry = authStore.state?.profile?.businessId;
      await inventoryStore.fecthProduct(qry);
      
      // Get active products only
      let activeProducts = inventoryStore.getActiveProducts();
      
      // Filter by store if a specific store is selected
      if (props.selectedStore && props.selectedStore !== 'current') {
        // Filter products by store location/availability
        // Note: This assumes products have store-specific availability
        // You may need to adjust this based on your inventory structure
        activeProducts = activeProducts.filter(product => {
          // Check if product is available in the selected store
          // This could be based on stock levels per store or product store assignments
          const storeStock = inventoryStore.stockLevels?.find(stock => 
            stock.productId === product.id && 
            stock.storeId === props.selectedStore
          );
          return storeStock && storeStock.quantity > 0;
        });
      }
      
      setProducts(activeProducts);
      
    } catch (err) {
      devLog('Error loading products:', err);
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  // Keep search functionality for the product dropdown

  // Get current stock for a product
  const getCurrentStock = (productId: string) => {
    let stockLevels = inventoryStore.stockLevels?.filter(stock => stock.productId === productId);
    
    // Filter by store if specific store is selected
    if (props.selectedStore && props.selectedStore !== 'current') {
      stockLevels = stockLevels?.filter(stock => stock.storeId === props.selectedStore);
    }
    
    return stockLevels?.reduce((total, stock) => total + stock.quantity, 0) || 0;
  };

  // Handle product selection
  const selectProduct = (product: Product) => {
    const currentStock = getCurrentStock(product.id);
    
    if (0 && currentStock <= 0) {
      setError(t('pos.productNotFound', 'Producto no encontrado para código: ') + product.name);
      setTimeout(() => setError(''), 3000);
      return;
    }

    const posProduct: POSProduct = {
      id: `cart_${Date.now()}_${product.id}`,
      product: {
        id: product.id,
        code: product.code || product.sku,
        label: product.name,
        price: product.sellingPrice,
        category: product.category,
        image: product.productImageUrl,
        barcode: product.UPC,
        sku: product.sku
      },
      qty: 1,
      unitPrice: product?.sellingPrice || 0,
      discount: 0,
      discountPercent: 0,
      total: product.sellingPrice || 0,
      taxRate: 8.5 // Default tax rate
    };

   
    props.onProductSelect(posProduct);
  };

  // Handle barcode scan
  const handleBarcodeScan = async (code: string) => {
    devLog('Scanned barcode:', code);
    
    // Find product by barcode, UPC, or SKU
    const product = products().find(p => 
      p.UPC === code || 
      p.sku === code || 
      p.code === code ||
      p.numCode === code
    );
    
    if (product) {
      selectProduct(product);
    } else {
      setError(t('pos.productNotFound', 'Producto no encontrado para código: ') + code);
      setTimeout(() => setError(''), 3000);
    }
  };

  // Reload products when store changes
  createEffect(() => {
    if (props.selectedStore) {
      loadProducts();
    }
  });

  onMount(() => {
    loadProducts();
  });


  const UrlImg = (v:string):string=>{
    if(!v) return '' 
    return `https://qvamarkets.s3.us-east-2.amazonaws.com/V2_images/7258/YABABYSSolution/`+v
  }

  return (
    <div style={{ 
      display: 'flex', 
      'flex-direction': 'column', 
      height: '100%',
      gap: '1rem'
    }}>
      {/* Add Products Section */}
      <Card>
        <div style={{ padding: '1rem' }}>
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            'align-items': 'center',
            'margin-bottom': '0.75rem'
          }}>
            <div style={{ 'flex-grow': 1 }}>
              <ApiSearchableProductDropdown
                value={selectedProduct()?.id || ''}
                onChange={(productId: string) => {
                  const product = inventoryStore.getProductById(productId);
                  if (product) {
                    selectProduct(product);
                  }
                  setSelectedProduct(null);
                }}
                placeholder={t('inventory.searchProducts', 'Buscar y agregar productos...')}
                style={{ width: '100%' }}
              />
            </div>

            {/* Scanner Toggle */}
            <Button
              variant={props.scannerActive ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => props.onToggleScanner(!props.scannerActive)}
            >
              <Icon name="scan" size="1rem" style={{ 'margin-right': '0.5rem' }} />
              {props.scannerActive ? t('pos.stopScanner', 'Detener') : t('pos.scanBarcode', 'Escanear')}
            </Button>
          </div>

          {/* Active Scanner */}
          <Show when={props.scannerActive}>
            <EnhancedBarcodeScanner
              onScan={handleBarcodeScan}
              continuous={true}
              showPreview={true}
              width={300}
              height={180}
            />
          </Show>
        </div>
      </Card>

      {/* Error Display */}
      <Show when={error()}>
        <div style={{
          padding: '1rem',
          background: 'var(--error-light)',
          color: 'var(--error-dark)',
          'border-radius': 'var(--border-radius)',
          border: '1px solid var(--error-color)'
        }}>
          <Icon name="warning" size="1rem" style={{ 'margin-right': '0.5rem' }} />
          {error()}
        </div>
      </Show>





      {/* Cart Products List */}
      <div style={{ 'flex-grow': 1, overflow: 'auto' }}>
        <Show when={cartProducts().length === 0} fallback={
          <Card>
            <div style={{ padding: '1rem' }}>
              <h3 style={{ 
                margin: '0 0 1rem 0', 
                'font-size': '1.125rem',
                'border-bottom': '1px solid var(--border-color)',
                'padding-bottom': '0.5rem'
              }}>
                {t('pos.cartItems', 'Artículos en el Carrito')} ({cartProducts().length})
              </h3>
              
              <div style={{ 'max-height': '600px', 'overflow-y': 'auto' }}>
                <For each={cartProducts()}>
                  {(cartProduct, index) => (
                    <>
                    <Show when={index() > 0 }>
                    
                      <hr style={{ 
                        margin: '0.5rem 0', 
                        border: 'none', 
                        'border-top': '1px solid var(--border-color)' 
                      }} />
                    </Show> 
                    <div style={{
                      display: 'flex',
                      'align-items': 'center',
                      gap: '1rem',
                      padding: '0.75rem',
                      'border-bottom': index() < cartProducts().length - 1 ? '1px solid var(--border-light)' : 'none',
                      'min-height': '80px'
                    }}>
                      {}
                      {/* Product Image */}
                      <div style={{
                        width: '60px',
                        height: '60px',
                        background: cartProduct.product.image 
                          ? `` 
                          : 'var(--background-secondary)',
                        'background-size': 'cover',
                        'background-position': 'center',
                        'border-radius': 'var(--border-radius-sm)',
                        'flex-shrink': 0,
                        display: 'flex',
                        'align-items': 'center',
                        'justify-content': 'center',
                        
                      }}>
                        <Show when={!cartProduct.product.image}>
                          <Icon name="image" size="1.5rem" style={{ opacity: '0.3' }} />
                        </Show>
                        <Show when={cartProduct.product.image}>
                          <img style={{
                            'width':'100%',
                            'object-fit': 'contain',
                            'aspect-ratio': '1 / 1',
                          }}
                          src={UrlImg(cartProduct.product.image)}/>
                        </Show>
                      </div>

                      {/* Product Info */}
                      <div style={{ 'flex-grow': 1, 'min-width': 0 }}>
                        <h4 style={{
                          margin: '0 0 0.25rem 0',
                          'font-size': '1rem',
                          'font-weight': '600',
                          overflow: 'hidden',
                          'text-overflow': 'ellipsis',
                          'white-space': 'nowrap'
                        }}>
                          {cartProduct.product.label}
                        </h4>
                        
                        <div style={{
                          display: 'flex',
                          'justify-content': 'space-between',
                          'align-items': 'center',
                          'margin-bottom': '0.25rem'
                        }}>
                          <span style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                            {t('pos.code', 'Código')}: {cartProduct.product.code}
                          </span>
                          <Show when={cartProduct.product.category}>
                            <span style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                              {cartProduct.product.category}
                            </span>
                          </Show>
                        </div>

                        {/* Quantity and Price Controls */}
                        <div style={{
                          display: 'flex',
                          'justify-content': 'space-between',
                          'align-items': 'center',
                          gap: '1rem',
                          'margin-bottom': '0.5rem'
                        }}>
                          {/* Quantity Control */}
                          <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                            <label style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                              {t('pos.qty', 'Cant')}:
                            </label>
                            <div style={{ display: 'flex', 'align-items': 'center', gap: '0.25rem' }}>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => props.onUpdateQuantity(cartProduct.id, Math.max(1, cartProduct.qty - 1))}
                                style={{ 
                                  padding: '0.25rem', 
                                  'min-width': '28px',
                                  height: '28px'
                                }}
                              >
                                <Icon name="minus" size="0.75rem" />
                              </Button>
                              <FormInput
                                type="number"
                                value={cartProduct.qty.toString()}
                                onChange={(e) => {
                                  const newQty = parseInt(e) || 1;
                                  props.onUpdateQuantity(cartProduct.id, Math.max(1, newQty));
                                }}
                                style={{
                                  width: '50px',
                                  padding: '0.25rem',
                                  border: '1px solid var(--border-color)',
                                  'border-radius': 'var(--border-radius-sm)',
                                  'text-align': 'center',
                                  'font-size': '0.875rem'
                                }}
                                min="1"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => props.onUpdateQuantity(cartProduct.id, cartProduct.qty + 1)}
                                style={{ 
                                  padding: '0.25rem', 
                                  'min-width': '28px',
                                  height: '28px'
                                }}
                              >
                                <Icon name="add" size="0.75rem" />
                              </Button>
                            </div>
                          </div>

                          {/* Price Control */}
                          <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                            <label style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                              {t('pos.price', 'Precio')}:
                            </label>
                            <div style={{ display: 'flex', 'align-items': 'center', gap: '0.25rem' }}>
                              <span style={{ 'font-size': '0.875rem' }}>$</span>
                              <FormInput
                                type="number"
                                value={cartProduct.unitPrice.toFixed(2)}
                                onChange={(e) => {
                                  const newPrice = parseFloat(e) || 0;
                                  props.onUpdatePrice(cartProduct.id, Math.max(0, newPrice));
                                }}
                                style={{
                                  width: '80px',
                                  padding: '0.25rem',
                                  border: '1px solid var(--border-color)',
                                  'border-radius': 'var(--border-radius-sm)',
                                  'text-align': 'right',
                                  'font-size': '0.875rem'
                                }}
                                step="0.01"
                                min="0"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Total Display */}
                        <div style={{
                          display: 'flex',
                          'justify-content': 'space-between',
                          'align-items': 'center'
                        }}>
                          <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                            {cartProduct.qty} × ${cartProduct.unitPrice.toFixed(2)}
                            <Show when={cartProduct.discount && cartProduct.discount > 0}>
                              <span style={{ color: 'var(--success-color)', 'margin-left': '0.5rem' }}>
                                (-${cartProduct.discount.toFixed(2)})
                              </span>
                            </Show>
                          </div>
                          <div style={{
                            'font-size': '1.125rem',
                            'font-weight': '700',
                            color: 'var(--primary-color)'
                          }}>
                            ${cartProduct.total.toFixed(2)}
                          </div>
                        </div>

                        {/* Notes */}
                        <Show when={cartProduct.notes}>
                          <div style={{
                            'margin-top': '0.5rem',
                            'font-size': '0.75rem',
                            color: 'var(--info-dark)',
                            'font-style': 'italic',
                            padding: '0.25rem 0.5rem',
                            background: 'var(--info-light)',
                            'border-radius': 'var(--border-radius-sm)'
                          }}>
                            {cartProduct.notes}
                          </div>
                        </Show>
                      </div>
                    </div>
                    </>
                  )}
                </For>
              </div>
            </div>
          </Card>
        }>
          {/* Empty Cart State */}
          <Card>
            <div style={{
              padding: '4rem',
              'text-align': 'center',
              color: 'var(--text-muted)'
            }}>
              <Icon name="shopping-cart" size="4rem" style={{ 'margin-bottom': '1rem', opacity: '0.3' }} />
              <h3>{t('pos.cartEmpty', 'El carrito está vacío')}</h3>
              <p>{t('pos.selectProductsToAdd', 'Seleccione productos para agregarlos al carrito')}</p>
            </div>
          </Card>
        </Show>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default ProductGrid;