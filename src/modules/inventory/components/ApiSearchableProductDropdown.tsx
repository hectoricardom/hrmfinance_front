import { Component, createSignal, createMemo, For, Show, onMount } from 'solid-js';
import { inventoryStore, Product } from '../stores/inventoryStore';
import { inventoryApi } from '../../../services/apiAdapter';
import { useTranslation } from '../../../translations';

interface ApiSearchableProductDropdownProps {
  value: string;
  onChange: (productId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  style?: Record<string, string | number>;
  onAddNew?: () => void; // Callback to open add product modal
  searchDelay?: number; // Debounce delay in ms
  maxResults?: number; // Maximum results to show
}

const ApiSearchableProductDropdown: Component<ApiSearchableProductDropdownProps> = (props) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = createSignal(false);
  const [searchTerm, setSearchTerm] = createSignal('');
  const [focusedIndex, setFocusedIndex] = createSignal(-1);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [apiProducts, setApiProducts] = createSignal<Product[]>([]);
  const [searchTimeout, setSearchTimeout] = createSignal<number | null>(null);

  const searchDelay = props.searchDelay || 300;
  const maxResults = props.maxResults || 40;

  const selectedProduct = createMemo(() => {
    if (!props.value) return null;
    
    // First check API products
    const apiProduct = apiProducts().find(p => p.id === props.value);
    if (apiProduct) return apiProduct;
    
    // Fallback to local store
    return inventoryStore.getProductById(props.value);
  });

  // Search products via API with fallback to local store
  const searchProductsApi = async (query: string) => {
    if (!query.trim()) {
      setApiProducts([]);
      return;
    }

    setLoading(true);
    setError(null);
      // Fallback to local filtering
      const localResults = inventoryStore.getActiveProducts()
      .filter(product => 
        product?.name?.toLowerCase()?.includes?.(query.toLowerCase()) ||
        product?.sku?.toLowerCase()?.includes?.(query.toLowerCase()) ||
        product?.UPC?.toLowerCase()?.includes?.(query?.toLowerCase()) ||
        product?.category?.toLowerCase()?.includes?.(query.toLowerCase())
      )
      .slice(0, maxResults);

    
     setApiProducts(localResults);

    setLoading(false);
  };




  const filteredProducts = createMemo(() => {
    const term = searchTerm().toLowerCase();
    if (!term) {
      // Show recent products from local store when no search term
      return inventoryStore.getActiveProducts().slice(0, 10);
    }
    
    // Return API results when searching
    return apiProducts();
  });

  const handleInputClick = () => {
    setIsOpen(true);
    setSearchTerm('');
    setFocusedIndex(-1);
    setError(null);
    
    // Load initial products if no search term
    if (!searchTerm()) {
      setApiProducts(inventoryStore.getActiveProducts().slice(0, 10));
    }
  };

  const handleInputChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const query = target.value;
    setSearchTerm(query);
    setIsOpen(true);
    setFocusedIndex(-1);
    setError(null);

    // Clear existing timeout
    if (searchTimeout()) {
      clearTimeout(searchTimeout());
    }

    // Set new timeout for debounced search
    const timeoutId = setTimeout(() => {
      searchProductsApi(query);
    }, searchDelay);
    
    setSearchTimeout(timeoutId as any);
  };

  const handleProductSelect = (product: Product) => {
    props.onChange(product.id);
    setIsOpen(false);
    setSearchTerm('');
    setFocusedIndex(-1);
    setError(null);
    
    // Clear timeout
    if (searchTimeout()) {
      clearTimeout(searchTimeout());
      setSearchTimeout(null);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    const products = filteredProducts();
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => Math.min(prev + 1, products.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex() >= 0 && products[focusedIndex()]) {
          handleProductSelect(products[focusedIndex()]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        setFocusedIndex(-1);
        setError(null);
        if (searchTimeout()) {
          clearTimeout(searchTimeout());
          setSearchTimeout(null);
        }
        break;
    }
  };

  const handleBlur = (e: FocusEvent) => {
    // Delay closing to allow clicks on dropdown items
    setTimeout(() => {
      setIsOpen(false);
      setSearchTerm('');
      setFocusedIndex(-1);
      if (searchTimeout()) {
        clearTimeout(searchTimeout());
        setSearchTimeout(null);
      }
    }, 150);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getCurrentStock = (productId: string) => {
    return inventoryStore.stockLevels
      .filter(stock => stock.productId === productId)
      .reduce((total, stock) => total + stock.quantity, 0);
  };

  // Cleanup timeout on unmount
  onMount(() => {
    return () => {
      if (searchTimeout()) {
        clearTimeout(searchTimeout());
      }
    };
  });

  // Styles
  const containerStyle = {
    position: 'relative' as const,
    width: '100%',
    ...props.style
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '1rem',
    background: 'var(--surface-color)',
    cursor: props.disabled ? 'not-allowed' : 'text',
    opacity: props.disabled ? '0.6' : '1'
  };

  const dropdownStyle = {
    position: 'absolute' as const,
    top: '100%',
    left: '0',
    right: '0',
    'z-index': '1000',
    'max-height': '400px',
    'overflow-y': 'auto',
    background: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'box-shadow': '0 4px 12px rgba(0,0,0,0.15)',
    'margin-top': '2px'
  };

  const itemStyle = (isHighlighted: boolean) => ({
    padding: '0.75rem',
    cursor: 'pointer',
    'border-bottom': '1px solid var(--border-color)',
    background: isHighlighted ? 'var(--strip-color)' : 'transparent',
    color: isHighlighted ? 'var(--primary-color)' : 'var(--text-primary)',
    transition: 'all 0.2s ease'
  });

  const productInfoStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center'
  };

  const productDetailsStyle = {
    flex: '1'
  };

  const productNameStyle = {
    'font-weight': '500',
    'margin-bottom': '0.25rem'
  };

  const productMetaStyle = {
    'font-size': '0.875rem',
    color: 'var(--text-muted)',
    display: 'flex',
    gap: '0.5rem',
    'flex-wrap': 'wrap'
  };

  const stockInfoStyle = {
    'text-align': 'right',
    'font-size': '0.875rem'
  };

  const emptyStateStyle = {
    padding: '1rem',
    'text-align': 'center',
    color: 'var(--text-muted)',
    'font-style': 'italic'
  };

  const loadingStyle = {
    padding: '1rem',
    'text-align': 'center',
    color: 'var(--text-muted)',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    gap: '0.5rem'
  };

  const errorStyle = {
    padding: '1rem',
    'text-align': 'center',
    color: '#d32f2f',
    background: '#ffebee',
    'border-radius': 'var(--border-radius-sm)',
    margin: '0.5rem',
    'font-size': '0.875rem'
  };

  const displayValue = () => {
    if (isOpen() && searchTerm()) {
      return searchTerm();
    }
    if (selectedProduct()) {
      return `${selectedProduct()!.name} (${selectedProduct()!.sku})`;
    }
    return '';
  };

  const inputContainerStyle = {
    display: 'flex',
    'align-items': 'stretch',
    width: '100%'
  };

  const addButtonStyle = {
    padding: '0.75rem',
    border: '1px solid var(--border-color)',
    'border-left': 'none',
    'border-radius': '0 var(--border-radius-sm) var(--border-radius-sm) 0',
    background: 'var(--surface-color)',
    cursor: 'pointer',
    color: 'var(--primary-color)',
    'font-weight': '600',
    'font-size': '1rem',
    transition: 'all 0.2s ease',
    'min-width': '40px',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center'
  };

  const inputWithButtonStyle = {
    ...inputStyle,
    'border-radius': props.onAddNew ? 'var(--border-radius-sm) 0 0 var(--border-radius-sm)' : 'var(--border-radius-sm)',
    'border-right': props.onAddNew ? 'none' : '1px solid var(--border-color)'
  };

  const searchIndicatorStyle = {
    position: 'absolute' as const,
    right: props.onAddNew ? '50px' : '0.75rem',
    top: '50%',
    transform: 'translateY(-50%)',
    'font-size': '0.875rem',
    color: 'var(--text-muted)',
    'pointer-events': 'none'
  };

  return (
    <div style={containerStyle}>
      <div style={inputContainerStyle}>
        <div style={{ position: 'relative', flex: '1' }}>
          <input
            type="text"
            style={inputWithButtonStyle}
            value={displayValue()}
            onInput={handleInputChange}
            onClick={handleInputClick}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder={props.placeholder || t('inventory.searchProducts', 'Search products by name, SKU, or category...')}
            disabled={props.disabled}
            required={props.required}
            autocomplete="off"
          />
          
          <Show when={loading()}>
            <div style={searchIndicatorStyle}>
              🔄 {t('common.searching', 'Searching...')}
            </div>
          </Show>
        </div>
        
        {props.onAddNew && (
          <button
            type="button"
            style={addButtonStyle}
            onClick={props.onAddNew}
            title={t('inventory.addProduct', 'Add new product')}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--primary-color)';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--surface-color)';
              e.currentTarget.style.color = 'var(--primary-color)';
            }}
          >
            +
          </button>
        )}
      </div>
      
      <Show when={isOpen()}>
        <div style={dropdownStyle}>
          <Show when={error()}>
            <div style={errorStyle}>
              ⚠️ {error()}
              <div style={{ 'margin-top': '0.5rem', 'font-size': '0.75rem' }}>
                {t('inventory.searchFallback', 'Showing local results')}
              </div>
            </div>
          </Show>
          
          <Show when={loading()}>
            <div style={loadingStyle}>
              <span>🔄</span>
              <span>{t('common.searching', 'Searching products...')}</span>
            </div>
          </Show>
          
          <Show 
            when={!loading() && filteredProducts().length > 0}
            fallback={
              !loading() && (
                <div style={emptyStateStyle}>
                  {searchTerm() ? (
                    <div>
                      <div>{t('inventory.noProductsFound', 'No products found matching your search.')}</div>
                      <div style={{ 'margin-top': '0.5rem', 'font-size': '0.75rem' }}>
                        {t('inventory.tryDifferentTerm', 'Try a different search term or check spelling.')}
                      </div>
                    </div>
                  ) : (
                    t('inventory.noProductsAvailable', 'No products available.')
                  )}
                </div>
              )
            }
          >
            <For each={filteredProducts()}>
              {(product, index) => {
                const currentStock = getCurrentStock(product.id);
                const isLowStock = currentStock <= product.minStockLevel;
                
                return (
                  <div
                    style={itemStyle(index() === focusedIndex())}
                    onClick={() => handleProductSelect(product)}
                    onMouseEnter={() => setFocusedIndex(index())}
                  >
                    <div style={productInfoStyle}>
                      <div style={productDetailsStyle}>
                        <div style={productNameStyle}>
                          {product.name}
                          {searchTerm() && (
                            <span style={{ 
                              'margin-left': '0.5rem',
                              'font-size': '0.75rem',
                              color: 'var(--primary-color)',
                              'font-weight': 'normal'
                            }}>
                              {apiProducts().includes(product) ? '🌐 API' : '💾 Local'}
                            </span>
                          )}
                        </div>
                        <div style={productMetaStyle}>
                          <span>{t('inventory.sku', 'SKU')}: {product.sku}</span>
                          <span>•</span>
                          <span>{product.category}</span>
                          <span>•</span>
                          <span>{formatCurrency(product.unitCost)}</span>
                        </div>
                        {product.description && (
                          <div style={{ 
                            'font-size': '0.75rem', 
                            color: 'var(--text-muted)', 
                            'margin-top': '0.25rem',
                            'font-style': 'italic'
                          }}>
                            {product.description.length > 60 ? 
                              `${product.description.substring(0, 60)}...` : 
                              product.description}
                          </div>
                        )}
                      </div>
                      <div style={stockInfoStyle}>
                        <div style={{ 
                          'font-weight': '600', 
                          color: isLowStock ? '#f44336' : 'var(--text-primary)' 
                        }}>
                          {currentStock} {product.unitOfMeasure}
                        </div>
                        <div style={{ color: 'var(--text-muted)' }}>
                          {isLowStock ? (
                            <span style={{ color: '#f44336' }}>
                              ⚠️ {t('inventory.lowStock', 'Low Stock')}
                            </span>
                          ) : (
                            t('inventory.inStock', 'In Stock')
                          )}
                        </div>
                        <div style={{ 
                          'font-size': '0.75rem', 
                          color: 'var(--text-muted)',
                          'margin-top': '0.25rem'
                        }}>
                          {t('inventory.min', 'Min')}: {product.minStockLevel}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }}
            </For>
            
            {filteredProducts().length === maxResults && (
              <div style={{
                padding: '0.5rem',
                'text-align': 'center',
                'font-size': '0.75rem',
                color: 'var(--text-muted)',
                'border-top': '1px solid var(--border-color)',
                'font-style': 'italic'
              }}>
                {t('inventory.showingTopResults', 'Showing top {{count}} results', { count: maxResults })}
              </div>
            )}
          </Show>
        </div>
      </Show>
    </div>
  );
};

export default ApiSearchableProductDropdown;