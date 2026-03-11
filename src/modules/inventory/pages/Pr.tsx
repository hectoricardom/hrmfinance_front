import { Component, createSignal, createMemo, For, Show, onMount, onCleanup } from 'solid-js';
import { Layout } from '../../ui';
import { Card } from '../../ui';
import { Button } from '../../ui';
import { useTranslation } from '../../../translations';
import { inventoryApi, productsApi } from '../../../services/apiAdapter';
import { inventoryStore, Product } from '../stores/inventoryStore';
import SearchableProductDropdown from '../components/SearchableProductDropdown';
import { useDebouncedSearch } from '../../../hooks/useDebounce';
import AddProductModal from '../components/AddProductModal';
import ProductDetailModal from '../components/ProductDetailModal';
import UpdateProductModal from '../components/UpdateProductModal';
import { authStore } from '../../../stores/authStore';
import { devLog } from '../../../services/utils';





const Pucts: Component = () => {
  const { t } = useTranslation();
  
  // State for search and filtering
  const [searchTerm, setSearchTerm] = createSignal('');
  const [selectedCategory, setSelectedCategory] = createSignal('');
  const [products, setProducts] = createSignal<Product[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = createSignal(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = createSignal(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = createSignal(false);
  const [selectedProduct, setSelectedProduct] = createSignal<Product | null>(null);
  
  // Load products on mount
  onMount(async () => {
    await loadProducts();
  });
  
  // Load products from API or local store
  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to fetch from API first
      try {
        const apiProducts = await productsApi.getAll();

        
        devLog({apiProducts});

        setProducts(apiProducts.map(item => ({
          id: item.id || `prod-${Date.now()}-${Math.random()}`,
          name: item.productName || item.name || 'Unknown Product',
          sku: item.sku || item.productCode || '',
          description: item.description || '',
          category: item.category || 'General',
          unitOfMeasure: item.unitOfMeasure || 'pcs',
          unitCost: parseFloat(item.unitCost || item.cost || '0'),
          sellingPrice: parseFloat(item.sellingPrice || item.price || '0'),
          minStockLevel: parseInt(item.minStockLevel || '0'),
          maxStockLevel: parseInt(item.maxStockLevel || '100'),
          isActive: item.isActive !== false,
          createdDate: item.createdDate || new Date().toISOString(),
          lastModified: item.lastModified || new Date().toISOString(),
          businessId: item.businessId || "YB100423253156428"
        })));
      } catch (apiError) {
        // Fallback to local store if API fails
        console.warn('API failed, using local store:', apiError);
        setProducts(inventoryStore.products);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };






  const loadAllProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to fetch from API first
      try {

        devLog("loadAllProducts inventoryApi")
        
        const apiResults = await inventoryApi.getProducts(authStore.getBusinessId());
        // Convert API results to Product format
        devLog({apiResults})
        const productsArr: string[] = Object.keys(apiResults);

      
        const parseProduct = (itemId: string): Product =>{

          let rec = apiResults as Record<string, any>
          let v = rec[itemId] as Record<string, any>
          
          return {
            id: v.id,
            name: v.name,
            businessId: v.businessId,
            sku: v.code,
            numCode: v.codeN,
            category: v.category,
            unitCost: v.unitCost || 0,
            unitOfMeasure: v.unitOfMeasure,
            minStockLevel: v.minStockLevel,
            maxStockLevel: v.maxStockLevel,
            isActive: v.isActive,
            description: v.description || '',
            createdDate: v.createdAt || new Date().toISOString(),
            lastModified: v.updatedAt || new Date().toISOString(),
            sellingPrice: parseFloat(v.sellingPrice || v.price || '0'),

          } as Product
        }

        const products: Product[] = productsArr.map(parseProduct);
        

        setProducts(products)
       

      } catch (apiError) {
        // Fallback to local store if API fails
        console.warn('API failed, using local store:', apiError);
        setProducts(inventoryStore.products);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };



  
  // Use debounced search hook
  const { search: performSearch, isSearching, cancel: cancelSearch } = useDebouncedSearch(
    async (query: string) => {
      if (!query.trim()) {
        await loadProducts();
        return;
      }
      
      try {
        setError(null);
        
        // Search via API
        const searchResults = await productsApi.getAll(query);
        setProducts(searchResults.map(item => ({
          id: item.id || `prod-${Date.now()}-${Math.random()}`,
          name: item.productName || item.name || 'Unknown Product',
          sku: item.sku || item.productCode || '',
          description: item.description || '',
          category: item.category || 'General',
          unitOfMeasure: item.unitOfMeasure || 'pcs',
          unitCost: parseFloat(item.unitCost || item.cost || '0'),
          sellingPrice: parseFloat(item.sellingPrice || item.price || '0'),
          minStockLevel: parseInt(item.minStockLevel || '0'),
          maxStockLevel: parseInt(item.maxStockLevel || '100'),
          isActive: item.isActive !== false,
          createdDate: item.createdDate || new Date().toISOString(),
          lastModified: item.lastModified || new Date().toISOString(),
          businessId: item.businessId || "YB100423253156428"
        })));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
        // Fallback to local filtering
        const localResults = inventoryStore.products.filter(product => 
          product.name.toLowerCase().includes(query.toLowerCase()) ||
          product.sku.toLowerCase().includes(query.toLowerCase()) ||
          product.category.toLowerCase().includes(query.toLowerCase())
        );
        setProducts(localResults);
      }
    },
    300 // Debounce delay
  );
  
  // Handle search input change
  const handleSearchChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const query = target.value;
    setSearchTerm(query);
    performSearch(query);
  };
  
  // Cancel search on unmount
  onCleanup(() => {
    cancelSearch();
  });
  
  // Filter products by category
  const filteredProducts = createMemo(() => {
    let filtered = products();
    
    if (selectedCategory()) {
      filtered = filtered.filter(product => product.category === selectedCategory());
    }
    
    return filtered;
  });
  
  // Get unique categories
  const categories = createMemo(() => {
    const uniqueCategories = [...new Set(products().map(p => p.category))];
    return uniqueCategories.sort();
  });
  
  // Calculate stats
  const stats = createMemo(() => {
    const activeProducts = products().filter(p => p.isActive);
    const totalProducts = products().length;
    const outOfStock = products().filter(p => {
      const stock = inventoryStore.getTotalStockByProduct(p.id);
      return stock === 0;
    });
    
    return {
      total: totalProducts,
      active: activeProducts.length,
      outOfStock: outOfStock.length
    };
  });
  
  // Format currency helper
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };
  
  // Get stock info for a product
  const getStockInfo = (productId: string) => {
    const stock = inventoryStore.getTotalStockByProduct(productId);
    const product = products().find(p => p.id === productId);
    if (!product) return { quantity: 0, status: 'unknown' };
    
    const isLowStock = stock <= product.minStockLevel;
    const isOutOfStock = stock === 0;
    
    return {
      quantity: stock,
      status: isOutOfStock ? 'out' : isLowStock ? 'low' : 'good'
    };
  };

  const productGridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1.5rem',
    'margin-bottom': '2rem'
  };

  const productCardStyle = {
    padding: '1.5rem',
    background: 'var(--surface-color)',
    'border-radius': 'var(--border-radius)',
    border: '1px solid var(--border-color)',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  };

  const productHeaderStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '1rem'
  };

  const priceStyle = {
    'font-size': '1.25rem',
    'font-weight': '600',
    color: 'var(--primary-color)'
  };

  const stockBadgeStyle = (inStock: boolean) => ({
    padding: '0.25rem 0.75rem',
    'border-radius': '9999px',
    'font-size': '0.75rem',
    'font-weight': '500',
    background: inStock ? '#d4edda' : '#f8d7da',
    color: inStock ? '#155724' : '#721c24'
  });

  const summaryCardsStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1.5rem',
    'margin-bottom': '2rem'
  };

  // Search container style
  const searchContainerStyle = {
    display: 'flex',
    gap: '1rem',
    'align-items': 'center',
    'margin-bottom': '2rem',
    'flex-wrap': 'wrap'
  };
  
  const searchInputStyle = {
    flex: '1',
    'min-width': '300px',
    padding: '0.75rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '1rem',
    background: 'var(--surface-color)'
  };
  
  const filterSelectStyle = {
    padding: '0.75rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '1rem',
    background: 'var(--surface-color)',
    'min-width': '150px'
  };
  
  return (
    <Layout title={t('products.title', 'Products')}>
      {/* Header with search and actions */}
      <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'flex-start', 'margin-bottom': '2rem', 'flex-wrap': 'wrap', gap: '1rem' }}>
        <div style={searchContainerStyle}>
          <div style={{ position: 'relative', flex: '1', 'min-width': '300px' }}>
            <input
              type="text"
              style={searchInputStyle}
              value={searchTerm()}
              onInput={handleSearchChange}
              placeholder={t('products.searchPlaceholder', 'Search products by name, SKU, or category...')}
            />
            <Show when={isSearching()}>
              <div style={{
                position: 'absolute',
                right: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                'font-size': '0.875rem',
                color: 'var(--text-muted)'
              }}>
                🔄 {t('common.searching', 'Searching...')}
              </div>
            </Show>
          </div>
          
          <select
            style={filterSelectStyle}
            value={selectedCategory()}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">{t('products.allCategories', 'All Categories')}</option>
            <For each={categories()}>
              {(category) => (
                <option value={category}>{category}</option>
              )}
            </For>
          </select>
          
          <Button 
            variant="outline" 
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('');
              devLog("loadAllProducts")
              loadAllProducts();
            }}
          >
            🔄 {t('common.refresh', 'Refresh')}
          </Button>
        </div>
        
        <Button 
          variant="primary" 
          onClick={() => setIsAddModalOpen(true)}
        >
          ➕ {t('products.addNew', 'Add New Product')}
        </Button>
      </div>
      
      {/* Error message */}
      <Show when={error()}>
        <div style={{
          padding: '1rem',
          'margin-bottom': '1rem',
          background: '#ffebee',
          border: '1px solid #ffcdd2',
          'border-radius': 'var(--border-radius)',
          color: '#d32f2f'
        }}>
          ⚠️ {error()}
        </div>
      </Show>

      <div style={summaryCardsStyle}>
        <Card title={t('products.totalProducts', 'Total Products')} subtitle={t('products.inCatalog', 'In catalog')}>
          <div style={{ 'font-size': '1.5rem', 'font-weight': '600', color: 'var(--primary-color)' }}>{stats().total}</div>
        </Card>
        <Card title={t('products.activeProducts', 'Active Products')} subtitle={t('products.currentlyAvailable', 'Currently available')}>
          <div style={{ 'font-size': '1.5rem', 'font-weight': '600', color: 'var(--primary-color)' }}>{stats().active}</div>
        </Card>
        <Card title={t('products.outOfStock', 'Out of Stock')} subtitle={t('products.needsRestock', 'Needs restock')}>
          <div style={{ 'font-size': '1.5rem', 'font-weight': '600', color: stats().outOfStock > 0 ? '#f44336' : 'var(--primary-color)' }}>{stats().outOfStock}</div>
        </Card>
        <Card title={t('products.showing', 'Showing')} subtitle={searchTerm() || selectedCategory() ? t('products.filtered', 'Filtered results') : t('products.allProducts', 'All products')}>
          <div style={{ 'font-size': '1.5rem', 'font-weight': '600', color: 'var(--primary-color)' }}>{filteredProducts().length}</div>
        </Card>
      </div>

      <Card title={t('products.productCatalog', 'Product Catalog')} subtitle={t('products.manageYourProducts', 'Manage your products and pricing')}>
        <Show 
          when={!loading() && !isSearching()}
          fallback={
            <div style={{ 'text-align': 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              🔄 {t('common.loading', 'Loading products...')}
            </div>
          }
        >
          <Show 
            when={filteredProducts().length > 0}
            fallback={
              <div style={{ 'text-align': 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                {searchTerm() || selectedCategory() ? (
                  <div>
                    🔍 {t('products.noResults', 'No products found matching your criteria.')}
                    <br />
                    <button 
                      style={{ 
                        'margin-top': '1rem',
                        padding: '0.5rem 1rem',
                        background: 'none',
                        border: '1px solid var(--primary-color)',
                        'border-radius': 'var(--border-radius-sm)',
                        color: 'var(--primary-color)',
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        setSearchTerm('');
                        setSelectedCategory('');
                        loadProducts();
                      }}
                    >
                      {t('products.clearFilters', 'Clear filters')}
                    </button>
                  </div>
                ) : (
                  t('products.noProducts', 'No products available.')
                )}
              </div>
            }
          >
            <div style={productGridStyle}>
              <For each={filteredProducts()}>
                {(product) => {
                  const stockInfo = getStockInfo(product.id);
                  const stockBadgeColor = {
                    good: { background: '#d4edda', color: '#155724' },
                    low: { background: '#fff3cd', color: '#856404' },
                    out: { background: '#f8d7da', color: '#721c24' }
                  }[stockInfo.status];
                  
                  return (
                    <div 
                      style={{
                        ...productCardStyle,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onClick={() => {
                        setSelectedProduct(product);
                        setIsDetailModalOpen(true);
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div style={productHeaderStyle}>
                        <h3 style={{ margin: '0', 'font-size': '1.1rem' }}>{product.name}</h3>
                        <div style={{
                          ...stockBadgeStyle(stockInfo.status === 'good'),
                          ...stockBadgeColor
                        }}>
                          {stockInfo.status === 'out' ? t('products.outOfStock', 'Out of Stock') :
                           stockInfo.status === 'low' ? t('products.lowStock', 'Low Stock') :
                           t('products.inStock', 'In Stock')}
                        </div>
                      </div>
                      
                      <div style={priceStyle}>{formatCurrency(product.unitCost)}</div>
                      
                      <div style={{ color: 'var(--text-muted)', 'font-size': '0.875rem', 'margin-bottom': '0.5rem' }}>
                        SKU: {product.sku} • UPC: {product.UPC} • {product.category}
                      </div>
                      
                      <div style={{ 
                        display: 'flex', 
                        'justify-content': 'space-between', 
                        'align-items': 'center',
                        'font-size': '0.875rem',
                        color: 'var(--text-muted)'
                      }}>
                        <span>{t('products.stock', 'Stock')}: {stockInfo.quantity} {product.unitOfMeasure}</span>
                        <span style={{ 
                          color: stockInfo.status === 'good' ? '#2e7d32' : 
                                 stockInfo.status === 'low' ? '#f57f17' : '#d32f2f',
                          'font-weight': '600'
                        }}>
                          {stockInfo.status === 'out' ? '⚠️' : 
                           stockInfo.status === 'low' ? '⚡' : '✅'}
                        </span>
                      </div>
                      
                      {product.description && (
                        <div style={{ 
                          'margin-top': '0.5rem',
                          'font-size': '0.75rem',
                          color: 'var(--text-muted)',
                          'font-style': 'italic',
                          'white-space': 'nowrap',
                          overflow: 'hidden',
                          'text-overflow': 'ellipsis'
                        }}>
                          {product.description}
                        </div>
                      )}
                      
                      {/* Action Buttons */}
                      <div style={{ 
                        display: 'flex', 
                        gap: '0.5rem', 
                        'margin-top': '1rem',
                        'padding-top': '1rem',
                        'border-top': '1px solid var(--border-color)'
                      }}>
                        <button
                          style={{
                            flex: '1',
                            padding: '0.5rem',
                            background: 'var(--primary-color)',
                            color: 'white',
                            border: 'none',
                            'border-radius': 'var(--border-radius-sm)',
                            cursor: 'pointer',
                            'font-size': '0.875rem',
                            transition: 'opacity 0.2s'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProduct(product);
                            setIsDetailModalOpen(true);
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                        >
                          {t('common.view', 'View')}
                        </button>
                        <button
                          style={{
                            flex: '1',
                            padding: '0.5rem',
                            background: 'transparent',
                            color: 'var(--primary-color)',
                            border: '1px solid var(--primary-color)',
                            'border-radius': 'var(--border-radius-sm)',
                            cursor: 'pointer',
                            'font-size': '0.875rem',
                            transition: 'all 0.2s'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProduct(product);
                            setIsUpdateModalOpen(true);
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--primary-color)';
                            e.currentTarget.style.color = 'white';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--primary-color)';
                          }}
                        >
                          {t('common.edit', 'Edit')}
                        </button>
                      </div>
                    </div>
                  );
                }}
              </For>
            </div>
          </Show>
        </Show>
      </Card>

      {/* Add Product Modal */}
      <AddProductModal
        isOpen={isAddModalOpen()}
        onClose={() => setIsAddModalOpen(false)}
        onProductAdded={() => {
          loadProducts();
        }}
      />

     
    </Layout>
  );
};

export default Products;





// sudo ssh -i qvamarkets.pem ubuntu@ec2-18-189-8-158.us-east-2.compute.amazonaws.com