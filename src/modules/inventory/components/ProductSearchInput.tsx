import { Component, createSignal, createMemo, For, Show } from 'solid-js';
import { inventoryApi } from '../../../services/apiAdapter';
import { inventoryStore, Product } from '../stores/inventoryStore';
import { useTranslation } from '../../../translations';
import { devLog } from '../../../services/utils';

interface ProductSearchInputProps {
  onProductSelect?: (product: Product) => void;
  onSearchResults?: (products: Product[]) => void;
  placeholder?: string;
  disabled?: boolean;
  style?: Record<string, string | number>;
  showResults?: boolean;
  maxResults?: number;
  searchDelay?: number;
}

const ProductSearchInput: Component<ProductSearchInputProps> = (props) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = createSignal('');
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [searchResults, setSearchResults] = createSignal<Product[]>([]);
  const [showDropdown, setShowDropdown] = createSignal(false);
  const [focusedIndex, setFocusedIndex] = createSignal(-1);
  const [searchTimeout, setSearchTimeout] = createSignal<number | null>(null);

  const searchDelay = props.searchDelay || 300;
  const maxResults = props.maxResults || 900;

  // Perform search via API with fallback to local store
  const performSearch = async (query: string) => {
    if (!query.trim() || query.trim().length<3) {
      setSearchResults([]);
      props.onSearchResults?.([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Search via API first
      try {
        // const apiResults = await inventoryApi.searchInventory(query);

       
        const products = await inventoryApi.getProducts(query);
        // Convert API results to Product format

        /** 
        const productsArr: string[] = Object.keys(apiResults);

       

        const parseProduct = (itemId: string): Product =>{
          let v = apiResults as Record<string, any>
          return {
            id: itemId,
            name: v[itemId].name,
            businessId: v[itemId].businessId,
            sku: v[itemId].code,
            UPC: v[itemId].UPC,
            numCode: v[itemId].codeN,
            category: v[itemId].category,
            unitCost: v[itemId].unitCost || 0,
            unitOfMeasure: v[itemId].unitOfMeasure,
            minStockLevel: v[itemId].minStockLevel,
            maxStockLevel: v[itemId].maxStockLevel,
            isActive: v[itemId].isActive,
            description: v[itemId].description || '',
            createdDate: v[itemId].createdAt || new Date().toISOString(),
            lastModified: v[itemId].updatedAt || new Date().toISOString()
          } as Product
        }

        

        // const products: Product[] = productsArr.map(parseProduct);
        */

        
        setSearchResults(products);
        inventoryStore.updProduct(products);
        props.onSearchResults?.(products);
      } catch (apiError) {
        devLog('API search failed, using local fallback:', apiError);
        setError('API search failed, showing local results');
        
        // Fallback to local search
        const localResults = inventoryStore.getActiveProducts()
          .filter(product => 
            product.name.toLowerCase().includes(query.toLowerCase()) ||
            product.sku.toLowerCase().includes(query.toLowerCase()) ||
            product.category.toLowerCase().includes(query.toLowerCase())
          )
          .slice(0, maxResults);
        
        setSearchResults(localResults);
        props.onSearchResults?.(localResults);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setError(errorMessage);
      setSearchResults([]);
      props.onSearchResults?.([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle input change with debouncing
  const handleInputChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const query = target.value;
    setSearchTerm(query);
    setError(null);
    
    // Show dropdown when typing
    if (props.showResults !== false) {
      setShowDropdown(true);
    }

    // Clear existing timeout
    if (searchTimeout()) {
      clearTimeout(searchTimeout());
    }

    // Set new timeout for debounced search
    const timeoutId = setTimeout(() => {
      performSearch(query);
    }, searchDelay);
    
    setSearchTimeout(timeoutId as any);
  };

  // Handle product selection
  const handleProductSelect = (product: Product) => {
    setSearchTerm(product.name);
    setShowDropdown(false);
    setFocusedIndex(-1);
    props.onProductSelect?.(product);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!showDropdown() || searchResults().length === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => Math.min(prev + 1, searchResults().length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex() >= 0 && searchResults()[focusedIndex()]) {
          handleProductSelect(searchResults()[focusedIndex()]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setFocusedIndex(-1);
        break;
    }
  };

  // Handle input focus
  const handleFocus = () => {
    if (props.showResults !== false && searchResults().length > 0) {
      setShowDropdown(true);
    }
  };

  // Handle input blur
  const handleBlur = () => {
    // Delay hiding dropdown to allow clicks
    setTimeout(() => {
      setShowDropdown(false);
      setFocusedIndex(-1);
    }, 150);
  };

  // Clear search
  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
    setError(null);
    setShowDropdown(false);
    setFocusedIndex(-1);
    props.onSearchResults?.([]);
    
    if (searchTimeout()) {
      clearTimeout(searchTimeout());
      setSearchTimeout(null);
    }
  };

  // Get current stock for a product
  const getCurrentStock = (productId: string) => {
    return inventoryStore.stockLevels
      .filter(stock => stock.productId === productId)
      .reduce((total, stock) => total + stock.quantity, 0);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Styles
  const containerStyle = {
    position: 'relative' as const,
    width: '100%',
    ...props.style
  };

  const inputContainerStyle = {
    position: 'relative' as const,
    display: 'flex',
    'align-items': 'center'
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    'padding-right': searchTerm() ? '2.5rem' : '0.75rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '1rem',
    background: 'var(--surface-color)',
    cursor: props.disabled ? 'not-allowed' : 'text',
    opacity: props.disabled ? '0.6' : '1',
    outline: 'none',
    transition: 'border-color 0.2s ease'
  };

  const clearButtonStyle = {
    position: 'absolute' as const,
    right: '0.5rem',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    'font-size': '1.2rem',
    'line-height': '1',
    padding: '0.25rem',
    'border-radius': '50%',
    transition: 'all 0.2s ease'
  };

  const loadingIndicatorStyle = {
    position: 'absolute' as const,
    right: searchTerm() ? '2.5rem' : '0.75rem',
    top: '50%',
    transform: 'translateY(-50%)',
    'font-size': '0.875rem',
    color: 'var(--text-muted)'
  };

  const dropdownStyle = {
    position: 'absolute' as const,
    top: '100%',
    left: '0',
    right: '0',
    'z-index': '1000',
    'max-height': '300px',
    'overflow-y': 'auto',
    background: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'box-shadow': '0 4px 12px rgba(0,0,0,0.15)',
    'margin-top': '2px'
  };

  const resultItemStyle = (isHighlighted: boolean) => ({
    padding: '0.75rem',
    cursor: 'pointer',
    'border-bottom': '1px solid var(--border-color)',
    background: isHighlighted ? 'var(--strip-color)' : 'transparent',
    transition: 'background-color 0.2s ease'
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
    'margin-bottom': '0.25rem',
    color: 'var(--text-primary)'
  };

  const productMetaStyle = {
    'font-size': '0.875rem',
    color: 'var(--text-muted)',
    display: 'flex',
    gap: '0.5rem'
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

  const errorStyle = {
    padding: '0.5rem 1rem',
    background: '#fff3cd',
    color: '#856404',
    'border-bottom': '1px solid var(--border-color)',
    'font-size': '0.875rem'
  };

  return (
    <div style={containerStyle}>
      <div style={inputContainerStyle}>
        <input
          type="text"
          style={inputStyle}
          value={searchTerm()}
          onInput={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={props.placeholder || t('inventory.searchProducts', 'Search products by name, SKU, or category...')}
          disabled={props.disabled}
          autocomplete="off"
        />
        
        <Show when={loading()}>
          <div style={loadingIndicatorStyle}>
            🔄
          </div>
        </Show>
        
        <Show when={searchTerm() && !loading()}>
          <button
            type="button"
            style={clearButtonStyle}
            onClick={clearSearch}
            title={t('common.clear', 'Clear search')}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--border-color)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none';
              e.currentTarget.style.color = 'var(--text-muted)';
            }}
          >
            ×
          </button>
        </Show>
      </div>
      
      <Show when={showDropdown() && props.showResults !== false}>
        <div style={dropdownStyle}>
          <Show when={error()}>
            <div style={errorStyle}>
              ⚠️ {error()}
            </div>
          </Show>
          
          <Show 
            when={searchResults().length > 0}
            fallback={
              searchTerm() && !loading() && (
                <div style={emptyStateStyle}>
                  {t('inventory.noProductsFound', 'No products found matching your search.')}
                </div>
              )
            }
          >
            <For each={searchResults()}>
              {(product, index) => {
                const currentStock = getCurrentStock(product.id);
                const isLowStock = currentStock <= product.minStockLevel;
                
                return (
                  <div
                    style={resultItemStyle(index() === focusedIndex())}
                    onClick={() => handleProductSelect(product)}
                    onMouseEnter={() => setFocusedIndex(index())}
                  >
                    <div style={productInfoStyle}>
                      <div style={productDetailsStyle}>
                        <div style={productNameStyle}>{product.name}</div>
                        <div style={productMetaStyle}>
                          <span>{t('inventory.sku', 'SKU')}: {product.sku}</span>
                          <span>•</span>
                          <span>{product.category}</span>
                          <span>•</span>
                          <span>{formatCurrency(product.unitCost)}</span>
                        </div>
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
                      </div>
                    </div>
                  </div>
                );
              }}
            </For>
          </Show>
        </div>
      </Show>
    </div>
  );
};

export default ProductSearchInput;






