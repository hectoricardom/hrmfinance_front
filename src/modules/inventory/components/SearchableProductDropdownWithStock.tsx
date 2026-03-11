/**
 * SearchableProductDropdownWithStock
 *
 * A product dropdown that fetches products with stock from the server.
 * Used primarily for transfer operations where we need to show only
 * products that have stock in the source location.
 */

import { Component, createSignal, createMemo, createEffect, For, Show } from 'solid-js';
import { inventoryStore, Product } from '../stores/inventoryStore';
import { useTranslation } from '../../../translations';
import { authStore } from '../../../stores/authStore';
import { devLog, fetchGraphQLSS } from '../../../services/utils';

interface ProductWithStock {
  id: string;
  name: string;
  sku: string;
  code?: string;
  UPC?: string;
  category?: string;
  unitCost?: number;
  unitOfMeasure?: string;
  stock?: number;
  quantity?: number;
}

interface SearchableProductDropdownWithStockProps {
  value: string;
  onChange: (product: Record<string, any>) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  style?: Record<string, string | number>;
  onAddNew?: () => void;
  storeId: string; // Required: the store/location to filter by stock
}

const SearchableProductDropdownWithStock: Component<SearchableProductDropdownWithStockProps> = (props) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = createSignal(false);
  const [searchTerm, setSearchTerm] = createSignal('');
  const [focusedIndex, setFocusedIndex] = createSignal(-1);
  const [isLoading, setIsLoading] = createSignal(false);
  const [productsWithStock, setProductsWithStock] = createSignal<ProductWithStock[]>([]);
  const [error, setError] = createSignal<string | null>(null);

  // Fetch products with stock when storeId changes
  const fetchProductsWithStock = async (storeId: string) => {
    if (!storeId) {
      setProductsWithStock([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const businessId = authStore.getBusinessId();

      const response = await fetchGraphQLSS({
        query: "getProductsWithStock",
        params: {
          businessId,
          storeId
        }
      });

     

      if (response?.data) {
        // Handle both array and object responses
        const data = Array.isArray(response.data?.products)
          ? response.data?.products
          : Object.values(response.data?.products);


        //devLog('getProductsWithStock response:', response.data?.products);

        const products: ProductWithStock[] = data.map((item: any) => ({
          id: item.id || item.productId,
          name: item.name || item.productName || item.label,
          sku: item.sku || item.code || '',
          code: item.code || item.sku,
          UPC: item.UPC || item.upc,
          category: item.category,
          unitCost: item?.productData?.unitCost || item.cost  || item.price || 0,
          unitOfMeasure: item.unitOfMeasure || item.unit || 'pcs',
          stock: item.availableStock || item.quantity || item.qty || 0
        }));

        //devLog('Parsed products with stock:', products);
        //devLog('Parsed products with stock:', products.length);
        setProductsWithStock(products);
      } else {
        setProductsWithStock([]);
      }
    } catch (err) {
      console.error('Error fetching products with stock:', err);
      setError('Error loading products');
      // Fallback to local filtering
      fallbackToLocalFiltering(storeId);
    } finally {
      setIsLoading(false);
    }
  };

  // Fallback: filter locally from stockLevels if API fails
  const fallbackToLocalFiltering = (storeId: string) => {
    devLog('Falling back to local filtering for storeId:', storeId);

    const stockInLocation = inventoryStore.stockLevels?.filter(
      stock => stock.locationId === storeId && stock.quantity > 0
    ) || [];

    const productIdsWithStock = new Set(stockInLocation.map(s => s.productId));

    const products: ProductWithStock[] = inventoryStore.getActiveProducts()
      .filter(product => productIdsWithStock.has(product.id))
      .map(product => {
        const stockEntry = stockInLocation.find(s => s.productId === product.id);
        return {
          id: product.id,
          name: product.name,
          sku: product.sku,
          code: product.sku,
          UPC: product.UPC,
          category: product.category,
          unitCost: product.unitCost,
          unitOfMeasure: product.unitOfMeasure,
          stock: stockEntry?.quantity || 0
        };
      });

    setProductsWithStock(products);
  };

  // Effect to fetch products when storeId changes
  createEffect(() => {
    const storeId = props.storeId;
    if (storeId) {
      fetchProductsWithStock(storeId);
    } else {
      setProductsWithStock([]);
    }
  });

  const selectedProduct = createMemo(() => {
    if (!props.value) return null;
    return productsWithStock().find(p => p.id === props.value) ||
           inventoryStore.getProductById(props.value);
  });

  const filteredProducts = createMemo(() => {
    const term = searchTerm().toLowerCase();
    const products = productsWithStock();

    if (!term) return products;

    return products.filter(product =>
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

  const handleProductSelect = (product: ProductWithStock) => {
    props.onChange({
      id: product.id,
      name: product.name,
      sku: product.sku,
      code: product.code,
      unitCost: product.unitCost,
      stock: product.stock
    });
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

  const handleBlur = () => {
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
    }).format(amount || 0);
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

  const inputContainerStyle = {
    display: 'flex',
    'align-items': 'stretch',
    width: '100%'
  };

  const inputWithButtonStyle = {
    ...inputStyle,
    'border-radius': props.onAddNew ? 'var(--border-radius-sm) 0 0 var(--border-radius-sm)' : 'var(--border-radius-sm)',
    'border-right': props.onAddNew ? 'none' : '1px solid var(--border-color)'
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
    gap: '0.5rem'
  };

  const stockInfoStyle = {
    'text-align': 'right' as const,
    'font-size': '0.875rem'
  };

  const emptyStateStyle = {
    padding: '1rem',
    'text-align': 'center' as const,
    color: 'var(--text-muted)',
    'font-style': 'italic'
  };

  const loadingStyle = {
    padding: '1rem',
    'text-align': 'center' as const,
    color: 'var(--text-muted)'
  };

  const displayValue = () => {
    if (isOpen() && searchTerm()) {
      return searchTerm();
    }
    if (selectedProduct()) {
      const prod = selectedProduct();
      return `${prod!.name} (${prod!.sku || prod!.code})`;
    }
    return '';
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
          placeholder={props.placeholder || t('inventory.searchProductsWithStock', 'Search products with stock...')}
          disabled={props.disabled || !props.storeId}
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

      {/* Stock count badge */}
      <Show when={props.storeId && productsWithStock().length > 0}>
        <div style={{
          'font-size': '0.75rem',
          color: 'var(--text-muted)',
          'margin-top': '0.25rem'
        }}>
          {productsWithStock().length} {t('inventory.productsWithStock', 'products with stock')}
        </div>
      </Show>

      <Show when={isOpen()}>
        <div style={dropdownStyle}>
          {/* Loading state */}
          <Show when={isLoading()}>
            <div style={loadingStyle}>
              {t('common.loading', 'Loading...')}
            </div>
          </Show>

          {/* Error state */}
          <Show when={error() && !isLoading()}>
            <div style={{ ...emptyStateStyle, color: '#f44336' }}>
              {error()}
            </div>
          </Show>

          {/* Products list */}
          <Show when={!isLoading() && !error()}>
            <Show
              when={filteredProducts().length > 0}
              fallback={
                <div style={emptyStateStyle}>
                  {!props.storeId
                    ? t('inventory.selectLocationFirst', 'Select a source location first')
                    : searchTerm()
                      ? t('inventory.noProductsFound', 'No products found matching your search.')
                      : t('inventory.noProductsWithStock', 'No products with stock in this location.')}
                </div>
              }
            >
              <For each={filteredProducts()}>
                {(product, index) => {
                  const isLowStock = (product.stock || 0) < 10;
                  devLog(product)
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
                            <span>SKU: {product.sku || product.code}</span>
                            {product.category && (
                              <>
                                <span>•</span>
                                <span>{product.category}</span>
                              </>
                            )}
                            <span>•</span>
                            <span>{formatCurrency(product.unitCost || 0)}</span>
                          </div>
                        </div>
                        <div style={stockInfoStyle}>
                          <div style={{
                            'font-weight': '600',
                            color: isLowStock ? '#f44336' : 'var(--success-color, #4caf50)'
                          }}>
                            {product.stock || 0} {product.unitOfMeasure || 'pcs'}
                          </div>
                          <div style={{ color: 'var(--text-muted)' }}>
                            {t('inventory.available', 'Available')}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }}
              </For>
            </Show>
          </Show>
        </div>
      </Show>
    </div>
  );
};

export default SearchableProductDropdownWithStock;
