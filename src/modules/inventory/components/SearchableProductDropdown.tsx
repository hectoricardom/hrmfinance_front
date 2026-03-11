import { Component, createSignal, createMemo, For, Show } from 'solid-js';
import { inventoryStore, Product } from '../stores/inventoryStore';
import { useTranslation } from '../../../translations';
import { devLog } from '../../../services/utils';

interface SearchableProductDropdownProps {
  value: string;
  onChange: (productId: Record<string, any>) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  style?: Record<string, string | number>;
  onAddNew?: () => void; // Callback to open add product modal
  filterByLocationStock?: string; // Filter to show only products with stock in this location
}

const SearchableProductDropdown: Component<SearchableProductDropdownProps> = (props) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = createSignal(false);
  const [searchTerm, setSearchTerm] = createSignal('');
  const [focusedIndex, setFocusedIndex] = createSignal(-1);

  const selectedProduct = createMemo(() => {
    if (!props.value) return null;
    return inventoryStore.getProductById(props.value);
  });

  // Get stock for a specific location
  const getStockByLocation = (productId: string, locationId: string) => {
    return inventoryStore.stockLevels?.filter(
      stock => stock.productId === productId && stock.locationId === locationId
    ).reduce((total, stock) => total + (stock.quantity || 0), 0) || 0;
  };

  // Get products that have stock in a specific location
  const getProductsWithStockInLocation = (locationId: string) => {
    if (!locationId) return inventoryStore.getActiveProducts();

    const allStockLevels = inventoryStore.stockLevels || [];

    // Debug logging
    devLog('=== getProductsWithStockInLocation ===');
    devLog('Looking for locationId:', locationId);
    devLog('Total stock levels:', allStockLevels.length);

    // Show unique location IDs in stock levels
    const uniqueLocationIds = [...new Set(allStockLevels.map(s => s.locationId))];
    devLog('Unique location IDs in stockLevels:', uniqueLocationIds);

    const stockInLocation = allStockLevels.filter(
      stock => stock.locationId === locationId && stock.quantity > 0
    );

    devLog('Stock entries for this location:', stockInLocation.length);
    devLog('Stock entries sample:', stockInLocation.slice(0, 5));

    const productIdsWithStock = new Set(stockInLocation.map(s => s.productId));
    devLog('Product IDs with stock:', [...productIdsWithStock].slice(0, 10));

    const allProducts = inventoryStore.getActiveProducts();
    devLog('Total active products:', allProducts.length);

    const filteredProducts = allProducts.filter(
      product => productIdsWithStock.has(product.id)
    );

    devLog('Filtered products with stock in location:', filteredProducts.length);

    return filteredProducts;
  };

  const filteredProducts = createMemo(() => {
    const term = searchTerm().toLowerCase();

    // If filtering by location stock, get only products with stock in that location
    let baseProducts = props.filterByLocationStock
      ? getProductsWithStockInLocation(props.filterByLocationStock)
      : inventoryStore.getActiveProducts();

    if (!term) return baseProducts;

    return baseProducts.filter(product =>
      product?.name?.toLowerCase().includes(term) ||
      product?.sku?.toLowerCase().includes(term) ||
      product?.UPC?.toLowerCase().includes(term) ||
      product?.category?.toLowerCase().includes(term)
    );
  });

  const handleInputClick = () => {
    setIsOpen(true);
    setSearchTerm('');
    setFocusedIndex(-1);
  };

  const handleInputChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    setSearchTerm(target.value);
    setIsOpen(true);
    setFocusedIndex(-1);
  };

  const handleProductSelect = (product: Product) => {
    props.onChange(product);
    setIsOpen(false);
    setSearchTerm('');
    setFocusedIndex(-1);
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
        break;
    }
  };

  const handleBlur = (e: FocusEvent) => {
    // Delay closing to allow clicks on dropdown items
    setTimeout(() => {
      setIsOpen(false);
      setSearchTerm('');
      setFocusedIndex(-1);
    }, 150);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getCurrentStock = (productId: string) => {
    // If filtering by location, show stock only for that location
    if (props.filterByLocationStock) {
      return getStockByLocation(productId, props.filterByLocationStock);
    }
    // Otherwise show total stock across all locations
    return inventoryStore.stockLevels?.filter(stock => stock.productId === productId)
      .reduce((total, stock) => total + (stock.quantity || 0), 0) || 0;
  };

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
    'max-height': '300px',
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
    'border-bottom': '1px solid ' + isHighlighted ? 'var(--primary-color)' : 'var(--border-color)',
    background:  isHighlighted ?'var(--strip-color)' : 'transparent',
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

  return (
    <div style={containerStyle}>
      <div style={inputContainerStyle}>
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
          <Show 
            when={filteredProducts().length > 0}
            fallback={
              <div style={emptyStateStyle}>
                {searchTerm() ? t('inventory.noProductsFound', 'No products found matching your search.') : t('inventory.noProductsAvailable', 'No products available.')}
              </div>
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
                          {isLowStock ? t('inventory.lowStock', 'Low Stock') : t('inventory.inStock', 'In Stock')}
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

export default SearchableProductDropdown;