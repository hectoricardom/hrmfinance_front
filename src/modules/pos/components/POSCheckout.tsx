import { Component, createSignal, Show, For, onMount, createEffect } from 'solid-js';
import { Card, Button } from '../../ui';
import { POSSale, POSCart, POSProduct, POSSettings, POSCustomer } from '../types/posTypes';
import ProductGrid from './ProductGrid';
import ShoppingCart from './ShoppingCart';
import PaymentProcessor from './PaymentProcessor';
import CustomerSelector from './CustomerSelector';
import ProductEditor from './ProductEditor';
import ProductList from './ProductList';
import ThermalReceipt from './ThermalReceipt';
import { useTranslation } from '../../../translations';
import { authStore } from '../../../stores/authStore';
import Icon from '../../../components/Icon';
import StoreSelector from '../../../components/StoreSelector';
import { savePOSSaleAsInvoice } from '../../../services/posInvoiceService';
import { SearchableLocationDropdown } from '../../inventory';
import { devLog } from '../../../services/utils';

interface POSCheckoutProps {
  onSaleComplete?: (sale: POSSale) => void;
  settings?: POSSettings;
}

const POSCheckout: Component<POSCheckoutProps> = (props) => {
  const { t } = useTranslation();
  
  // Main state
  const [cart, setCart] = createSignal<POSCart>({
    products: [],
    services: [],
    discounts: []
  });

  const [currentSale, setCurrentSale] = createSignal<POSSale | null>(null);
  const [activeView, setActiveView] = createSignal<'products' | 'payment' | 'receipt'>('products');
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string>('');
  const [success, setSuccess] = createSignal<string>('');

  // Responsive state
  const [isMobile, setIsMobile] = createSignal(false);
  const [showCart, setShowCart] = createSignal(false);

  // Check screen size on mount and resize
  const checkScreenSize = () => {
    setIsMobile(window.innerWidth < 900);
  };
  
  // Customer selection
  const [selectedCustomer, setSelectedCustomer] = createSignal<POSCustomer | null>(null);
  const [showCustomerModal, setShowCustomerModal] = createSignal(false);
  
  // Store selection
  const [selectedStore, setSelectedStore] = createSignal<string>();
  // Store selection
  const [isOpenStore, setIsOpenStore] = createSignal<boolean>(false);
  
  // Barcode scanning
  const [scannerActive, setScannerActive] = createSignal(false);
  const [lastScannedCode, setLastScannedCode] = createSignal<string>('');
  
  // Product editing
  const [editingProduct, setEditingProduct] = createSignal<POSProduct | null>(null);
  const [showProductList, setShowProductList] = createSignal(true);
  
  // POS settings with defaults
  const settings = () => props.settings || {
    taxRates: [{ name: 'Sales Tax', rate: 8.5, amount: 0, applyToTotal: true }],
    defaultPaymentMethod: 'cash' as const,
    allowNegativeInventory: false,
    requireCustomerForSale: false,
    autoPrintReceipt: true,
    currency: 'USD',
    receiptHeader: 'Point of Sale System',
    receiptFooter: 'Thank you for your business!'
  };

  // Get store name from store ID
  const getStoreName = (storeId: string): string => {
    if (storeId === 'current') {
      return `${t('pos.currentStore', 'Tienda Actual')} (${authStore.getBusinessId() || 'Default'})`;
    }
    
    // Find store in authStore
    const store = authStore.stores.find(s => s.id === storeId);
    if (store) {
      return store.name;
    }
    
    // Fallback to store ID
    return storeId;
  };

  // Calculate cart totals
  const cartTotals = () => {
    const cartData = cart();
    const subtotal = cartData.products.reduce((sum, product) => sum + product.total, 0) +
                    cartData.services.reduce((sum, service) => sum + service.total, 0);
    
    const totalDiscount = cartData.discounts.reduce((sum, discount) => {
      if (discount.type === 'PERCENTAGE') {
        return sum + (subtotal * discount.value / 100);
      }
      return sum + discount.value;
    }, 0);

    const taxableAmount = subtotal - totalDiscount;
    const totalTax = settings().taxRates.reduce((sum, tax) => {
      if (tax.applyToTotal) {
        return sum + (taxableAmount * tax.rate / 100);
      }
      return sum;
    }, 0);

    const total = taxableAmount + totalTax;

    return {
      subtotal,
      totalDiscount,
      totalTax,
      total
    };
  };

  // Add product to cart
  const addToCart = (product: POSProduct) => {
    setCart(prev => {
      const existingIndex = prev.products.findIndex(p => p.product.id === product.product.id);
      devLog(existingIndex)
      if (existingIndex >= 0) {
        // Update existing product quantity
        const updatedProducts = [...prev.products];
        updatedProducts[existingIndex] = {
          ...updatedProducts[existingIndex],
          qty: updatedProducts[existingIndex].qty + product.qty,
          total: (updatedProducts[existingIndex].qty + product.qty) * updatedProducts[existingIndex].unitPrice
        };
        
        return {
          ...prev,
          products: updatedProducts
        };
      } else {
        // Add new product
        return {
          ...prev,
          products: [...prev.products, product]
        };
      }
    });
    
    setSuccess(`${product.product.label} added to cart`);
    setTimeout(() => setSuccess(''), 2000);
  };

  // Remove product from cart
  const removeFromCart = (productId: string) => {
    setCart(prev => ({
      ...prev,
      products: prev.products.filter(p => p.id !== productId)
    }));
  };

  // Update product quantity
  const updateCartItemQty = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(prev => ({
      ...prev,
      products: prev.products.map(p => 
        p.id === productId 
          ? { ...p, qty: newQty, total: newQty * p.unitPrice }
          : p
      )
    }));
  };

  // Update product price
  const updateCartItemPrice = (productId: string, newPrice: number) => {
    setCart(prev => ({
      ...prev,
      products: prev.products.map(p => 
        p.id === productId 
          ? { ...p, unitPrice: newPrice, total: p.qty * newPrice }
          : p
      )
    }));
  };


   // Edit product from cart
  const isStoreOpen = (v: boolean) => {
    setIsOpenStore(v);
  };

  // Edit product from cart
  const editCartProduct = (product: POSProduct) => {
    setEditingProduct(product);
    setShowProductList(false);
  };

  // Update product from editor
  const updateProductFromEditor = (updatedProduct: POSProduct) => {
    setCart(prev => ({
      ...prev,
      products: prev.products.map(p => 
        p.id === updatedProduct.id ? updatedProduct : p
      )
    }));
    setEditingProduct(null);
    setShowProductList(true);
  };

  // Close product editor
  const closeProductEditor = () => {
    setEditingProduct(null);
    setShowProductList(true);
  };

  // Clear cart
  const clearCart = () => {
    setCart({
      products: [],
      services: [],
      discounts: []
    });
    setSelectedCustomer(null);
    setActiveView('products');
    setError('');
    setSuccess('');
  };

  // Proceed to payment
  const proceedToPayment = () => {
    if (cart().products.length === 0 && cart().services.length === 0) {
      setError('Cart is empty. Add items before proceeding to payment.');
      return;
    }

    if (settings().requireCustomerForSale && !selectedCustomer()) {
      setError('Customer selection is required for sales.');
      setShowCustomerModal(true);
      return;
    }

    setActiveView('payment');
    setError('');
  };

  // Complete sale
  const completeSale = async (paymentData: any) => {
    setLoading(true);
    try {
      const totals = cartTotals();
      const saleNumber = `POS-${Date.now()}`;
      
      const sale: POSSale = {
        id: `sale_${Date.now()}`,
        saleNumber,
        timestamp: new Date().toISOString(),
        cashier: {
          id: authStore.state.user?.uid || 'unknown',
          name: authStore.state.profile?.name || 'Unknown Cashier'
        },
        customer: selectedCustomer() || undefined,
        products: cart().products,
        services: cart().services,
        subtotal: totals.subtotal,
        discounts: cart().discounts,
        totalDiscount: totals.totalDiscount,
        taxes: settings().taxRates.map(tax => ({
          ...tax,
          amount: totals.totalTax
        })),
        totalTax: totals.totalTax,
        total: totals.total,
        paymentMethods: paymentData.paymentMethods,
        totalPaid: paymentData.totalPaid,
        change: paymentData.change,
        status: 'COMPLETED',
        notes: cart().notes,
        storeId: selectedStore(),
        storeName: selectedStore()? getStoreName(selectedStore()) :"" ,
        receiptPrinted: false
      };

      setCurrentSale(sale);
      setActiveView('receipt');
      
      // Save POS sale as invoice for unified reporting
      try {
        devLog('Saving POS sale as invoice...');
        const invoiceResult = await savePOSSaleAsInvoice(sale);
        
        if (invoiceResult.success) {
          devLog('POS sale saved as invoice:', invoiceResult.invoiceNumber);
          setSuccess(`${t('pos.saleCompleted', 'Sale completed successfully!')} - ${t('pos.invoiceNumber', 'Invoice')}: ${invoiceResult.invoiceNumber}`);
        } else {
          devLog('Failed to save POS sale as invoice:', invoiceResult.error);
          setSuccess(`${t('pos.saleCompleted', 'Sale completed successfully!')} - ${t('pos.invoiceWarning', 'Warning: Invoice not saved')}`);
        }
      } catch (invoiceError) {
        devLog('Error saving POS sale as invoice:', invoiceError);
        setSuccess(`${t('pos.saleCompleted', 'Sale completed successfully!')} - ${t('pos.invoiceWarning', 'Warning: Invoice not saved')}`);
      }

      // Call completion callback
      if (props.onSaleComplete) {
        props.onSaleComplete(sale);
      }
      
    } catch (err) {
      devLog('Error completing sale:', err);
      setError('Error completing sale. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Start new sale
  const startNewSale = () => {
    clearCart();
    setCurrentSale(null);
    setActiveView('products');
  };

  // Keyboard shortcuts
  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'n': // New sale
          e.preventDefault();
          startNewSale();
          break;
        case 'p': // Proceed to payment
          e.preventDefault();
          if (activeView() === 'products') {
            proceedToPayment();
          }
          break;
        case 'c': // Clear cart
          e.preventDefault();
          if (activeView() === 'products') {
            clearCart();
          }
          break;
      }
    }

    // ESC key
    if (e.key === 'Escape') {
      if (activeView() === 'payment') {
        setActiveView('products');
      }
    }
  };

  // Cart item count for badge
  const cartItemCount = () => {
    return cart().products.reduce((sum, p) => sum + p.qty, 0) +
           cart().services.reduce((sum, s) => sum + s.qty, 0);
  };

  onMount(() => {
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyPress);

    // Responsive handling
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('resize', checkScreenSize);
    };
  });


  const labelStyle = {
    display: 'block',
    'font-size': '0.875rem',
    'font-weight': '500',
    color: 'var(--text-secondary)',
    'margin-bottom': '0.25rem'
  };


  return (
    <div style={{
      display: 'grid',
      'grid-template-columns': activeView() === 'products' && !isMobile()
        ? '1fr 380px'
        : '1fr',
      gap: '0.75rem',
      height: '100vh',
      padding: isMobile() ? '0.5rem' : '0.75rem',
      background: 'var(--background-primary)',
      overflow: 'hidden'
    }}>

      {/* Mobile Cart Toggle Button - Fixed at bottom */}
      <Show when={isMobile() && activeView() === 'products'}>
        <button
          onClick={() => setShowCart(!showCart())}
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '64px',
            height: '64px',
            'border-radius': '50%',
            background: 'var(--primary-color)',
            color: 'white',
            border: 'none',
            'box-shadow': '0 4px 12px rgba(0,0,0,0.3)',
            cursor: 'pointer',
            'z-index': 1000,
            display: 'flex',
            'flex-direction': 'column',
            'align-items': 'center',
            'justify-content': 'center',
            'font-size': '1.5rem'
          }}
        >
          🛒
          <Show when={cartItemCount() > 0}>
            <span style={{
              position: 'absolute',
              top: '-5px',
              right: '-5px',
              background: 'var(--error-color)',
              color: 'white',
              'border-radius': '50%',
              width: '24px',
              height: '24px',
              'font-size': '12px',
              display: 'flex',
              'align-items': 'center',
              'justify-content': 'center',
              'font-weight': 'bold'
            }}>
              {cartItemCount()}
            </span>
          </Show>
        </button>
      </Show>

      {/* Mobile Cart Drawer */}
      <Show when={isMobile() && showCart() && activeView() === 'products'}>
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            'z-index': 999
          }}
          onClick={() => setShowCart(false)}
        />
        <div style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '90%',
          'max-width': '400px',
          background: 'var(--surface-color)',
          'box-shadow': '-4px 0 20px rgba(0,0,0,0.2)',
          'z-index': 1001,
          overflow: 'auto'
        }}>
          <div style={{
            padding: '1rem',
            'border-bottom': '1px solid var(--border-color)',
            display: 'flex',
            'justify-content': 'space-between',
            'align-items': 'center'
          }}>
            <h3 style={{ margin: 0 }}>🛒 {t('pos.cart', 'Carrito')}</h3>
            <button
              onClick={() => setShowCart(false)}
              style={{
                background: 'none',
                border: 'none',
                'font-size': '1.5rem',
                cursor: 'pointer',
                padding: '0.5rem'
              }}
            >
              ✕
            </button>
          </div>
          <ShoppingCart
            cart={cart()}
            totals={cartTotals()}
            onUpdateQty={updateCartItemQty}
            onRemoveItem={removeFromCart}
            onClearCart={clearCart}
            onProceedToPayment={() => {
              setShowCart(false);
              proceedToPayment();
            }}
            settings={settings()}
          />
        </div>
      </Show>

      {/* Main Content Area */}
      <div style={{
        display: 'flex',
        'flex-direction': 'column',
        gap: isMobile() ? '0.5rem' : '1rem',
        'overflow-y': 'auto',
        'min-height': 0
      }}>
        {/* Header */}
        <Card>
          <div style={{
            display: 'flex',
            'flex-direction': isMobile() ? 'column' : 'row',
            'justify-content': 'space-between',
            'align-items': isMobile() ? 'stretch' : 'flex-start',
            padding: isMobile() ? '0.75rem' : '1rem',
            gap: '0.75rem'
          }}>
            <div style={{ 'flex-grow': 1 }}>
              <div style={{
                display: 'flex',
                'justify-content': 'space-between',
                'align-items': 'center',
                'margin-bottom': '0.5rem'
              }}>
                <h1 style={{
                  margin: 0,
                  'font-size': isMobile() ? '1.25rem' : '1.5rem'
                }}>
                  {t('pos.title', 'Point of Sale')}
                </h1>
                {/* Mobile total display */}
                <Show when={isMobile() && cartItemCount() > 0}>
                  <div style={{
                    background: 'var(--primary-color)',
                    color: 'white',
                    padding: '0.5rem 1rem',
                    'border-radius': 'var(--border-radius-sm)',
                    'font-weight': 'bold',
                    'font-size': '1rem'
                  }}>
                    ${cartTotals().total.toFixed(2)}
                  </div>
                </Show>
              </div>
              <p style={{
                margin: '0 0 0.75rem 0',
                color: 'var(--text-muted)',
                'font-size': '0.8rem'
              }}>
                {t('pos.cashier', 'Cajero')}: {authStore.state.profile?.name || 'Unknown'}
              </p>

              {/* Store Selector */}
              <div style={{ 'max-width': isMobile() ? '100%' : '400px' }}>
                <label style={labelStyle}>Tienda/Sucursal</label>
                <SearchableLocationDropdown
                  value={selectedStore()}
                  onChange={setSelectedStore}
                  placeholder="Seleccionar tienda..."
                  style={{ width: '100%' }}
                  isOpen={isStoreOpen}
                />
              </div>
            </div>

            <div style={{
              display: 'flex',
              gap: '0.5rem',
              'align-items': 'center',
              'flex-wrap': 'wrap',
              'justify-content': isMobile() ? 'space-between' : 'flex-end'
            }}>
              <Show when={selectedCustomer()}>
                <div style={{
                  padding: '0.4rem 0.75rem',
                  background: 'var(--success-light)',
                  color: 'var(--success-dark)',
                  'border-radius': 'var(--border-radius-sm)',
                  'font-size': '0.8rem',
                  'white-space': 'nowrap'
                }}>
                  👤 {selectedCustomer()!.name}
                </div>
              </Show>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCustomerModal(true)}
              >
                <Icon name="user" size="1rem" style={{ 'margin-right': isMobile() ? '0' : '0.5rem' }} />
                <Show when={!isMobile()}>
                  {selectedCustomer() ? t('common.change', 'Cambiar') : t('pos.selectCustomer', 'Cliente')}
                </Show>
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={startNewSale}
                title="Ctrl+N"
              >
                <Icon name="add" size="1rem" style={{ 'margin-right': isMobile() ? '0' : '0.5rem' }} />
                <Show when={!isMobile()}>
                  {t('pos.newSale', 'Nueva')}
                </Show>
              </Button>
            </div>
          </div>
        </Card>

        {/* Messages */}
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

        <Show when={success()}>
          <div style={{
            padding: '1rem',
            background: 'var(--success-light)',
            color: 'var(--success-dark)',
            'border-radius': 'var(--border-radius)',
            border: '1px solid var(--success-color)'
          }}>
            <Icon name="check" size="1rem" style={{ 'margin-right': '0.5rem' }} />
            {success()}
          </div>
        </Show>


        {/* Main Content - Products and Payment require store selection */}
        <Show when={selectedStore() && !isOpenStore()}>
          <div style={{ 'flex-grow': 1 }}>
            <Show when={activeView() === 'products'}>
              <ProductGrid
                cart={cart()}
                onProductSelect={addToCart}
                onUpdateQuantity={updateCartItemQty}
                onUpdatePrice={updateCartItemPrice}
                scannerActive={scannerActive()}
                onToggleScanner={setScannerActive}
                selectedStore={selectedStore()}
              />
            </Show>

            <Show when={activeView() === 'payment'}>
              <PaymentProcessor
                cart={cart()}
                totals={cartTotals()}
                customer={selectedCustomer()}
                settings={settings()}
                onComplete={completeSale}
                onCancel={() => setActiveView('products')}
                loading={loading()}
              />
            </Show>
          </div>
        </Show>

        {/* Receipt View - Always visible when sale is complete (outside store check) */}
        <Show when={activeView() === 'receipt' && currentSale()}>
          <div style={{
            'flex-grow': 1,
            display: 'flex',
            'flex-direction': 'column',
            'align-items': 'center',
            'overflow-y': 'auto',
            padding: '1rem 0'
          }}>
            {/* Success Banner */}
            <div style={{
              display: 'flex',
              'align-items': 'center',
              gap: '0.75rem',
              padding: '1rem 2rem',
              background: 'var(--success-light)',
              color: 'var(--success-dark)',
              'border-radius': 'var(--border-radius)',
              'margin-bottom': '1.5rem',
              'font-weight': '600'
            }}>
              <Icon name="check" size="1.5rem" />
              <span>{t('pos.saleCompleted', '¡Venta Completada!')} - {currentSale()!.saleNumber}</span>
            </div>

            {/* Thermal Receipt */}
            <ThermalReceipt
              sale={currentSale()!}
              onNewSale={startNewSale}
              onPrint={() => {
                // Mark receipt as printed
                setCurrentSale(prev => prev ? { ...prev, receiptPrinted: true } : null);
              }}
              autoPrint={settings().autoPrintReceipt}
            />

            {/* Invoice Info */}
            <div style={{
              'margin-top': '1.5rem',
              padding: '1rem 1.5rem',
              background: 'var(--info-light)',
              color: 'var(--info-dark)',
              'border-radius': 'var(--border-radius-sm)',
              'font-size': '0.875rem',
              'max-width': '400px',
              'text-align': 'center'
            }}>
              <Icon name="info" size="1rem" style={{ 'margin-right': '0.5rem' }} />
              {t('pos.invoiceInfo', 'Esta venta ha sido guardada como factura para reportes e inventario')}
            </div>
          </div>
        </Show>
      </div>

      {/* Right Sidebar - Shopping Cart or Product Editor (Desktop only) */}
      <Show when={activeView() === 'products' && !isMobile()}>
        <Show when={editingProduct()} fallback={
          <ShoppingCart
            cart={cart()}
            totals={cartTotals()}
            onUpdateQty={updateCartItemQty}
            onRemoveItem={removeFromCart}
            onClearCart={clearCart}
            onProceedToPayment={proceedToPayment}
            settings={settings()}
          />
        }>
          <ProductEditor
            product={editingProduct()}
            onUpdate={updateProductFromEditor}
            onClose={closeProductEditor}
          />
        </Show>
      </Show>

      {/* Customer Selector Modal */}
      <Show when={showCustomerModal()}>
        <CustomerSelector
          onSelect={(customer) => {
            setSelectedCustomer(customer);
            setShowCustomerModal(false);
          }}
          onClose={() => setShowCustomerModal(false)}
        />
      </Show>
    </div>
  );
};

export default POSCheckout;