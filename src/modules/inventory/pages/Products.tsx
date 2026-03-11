
  
  
  import { Component, createSignal, createMemo, For, Show, onMount, onCleanup, createEffect } from 'solid-js';
import { Layout } from '../../ui';
import { Card } from '../../ui';
import { Button } from '../../ui';
import { LazyList } from '../../ui';
import { useTranslation } from '../../../translations';
import { inventoryApi, productsApi } from '../../../services/apiAdapter';
import { inventoryStore, Product } from '../stores/inventoryStore';
import SearchableProductDropdown from '../components/SearchableProductDropdown';
import { useDebouncedSearch } from '../../../hooks/useDebounce';
import AddProductModal from '../components/AddProductModal';
import ProductDetailModal from '../components/ProductDetailModal';
import UpdateProductModal from '../components/UpdateProductModal';
import ProductSearchInput from '../components/ProductSearchInput';
import { authStore } from '../../../stores/authStore';
import ProductStockBadge from '../components/ProductStockBadge';
import { devLog } from '../../../services/utils';





const Products: Component = () => {
  const { t } = useTranslation();
  
  // State for search and filtering
  const [searchTerm, setSearchTerm] = createSignal('');
  const [selectedCategory, setSelectedCategory] = createSignal('');
  const [products, setProducts] = createSignal<Product[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = createSignal(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = createSignal(false);
  const [selectedProduct, setSelectedProduct] = createSignal<Product | null>(null);

  const [isAddProductModalOpen, setIsAddProductModalOpen] = createSignal(false);

  const [searchResults, setSearchResults] = createSignal<Product[]>([]);
  const [searchMode, setSearchMode] = createSignal(false);
  const [allStockData, setAllStockData] = createSignal<any[]>([]);



  // Load stock data for all products from API
  const loadAllStockData = async () => {
    try {
      // Fetch stock levels for all products in the business (no productId = all products)
      const stockData = await inventoryApi.getStockLevel();
      if (Array.isArray(stockData)) {
        setAllStockData(stockData);
      } else if (stockData) {
        // If single object, wrap in array
        setAllStockData([stockData]);
      }
    } catch (err) {
      console.warn('Failed to load stock data:', err);
    }
  };

  // Load products on mount
  onMount(async () => {
    await loadProducts();
    await loadAllStockData();
  });

  // Reload products when business context changes (via BusinessSwitcher)
  let prevBusinessId = authStore.getBusinessId();
  createEffect(() => {
    const currentBusinessId = authStore.getBusinessId();
    if (currentBusinessId !== prevBusinessId) {
      devLog(`📦 Business changed from ${prevBusinessId} to ${currentBusinessId}, reloading products...`);
      prevBusinessId = currentBusinessId;
      setTimeout(async () => {
        await loadAllProducts();
        await loadAllStockData();
      }, 450);
    }
  });

  // Load products from API or local store
  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to fetch from API first
      try {
        const apiProducts = await productsApi.getAll();



        setProducts(apiProducts)
        
      /**
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


         */
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

       
        const apiResults = await inventoryApi.getProducts(authStore.getBusinessId());
        // Convert API results to Product format
      
        setProducts(apiResults)
       

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
        setProducts(searchResults)
        /** 
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

        */
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
    const productList = products() || [];

    if (selectedCategory()) {
      return productList.filter(product => product.category === selectedCategory());
    }

    return productList;
  });

  // Get unique categories
  const categories = createMemo(() => {
    const productList = products() || [];
    const uniqueCategories = [...new Set(productList.map(p => p.category))];
    return uniqueCategories.sort();
  });

  // Calculate stats
  const stats = createMemo(() => {
    const productList = products() || [];
    const activeProducts = productList.filter(p => p.isActive);
    const totalProducts = productList.length;
    const outOfStock = productList.filter(p => {
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
  




  const stockIndicatorStyle = (isLowStock: boolean) => ({
    padding: '0.25rem 0.75rem',
    'border-radius': '9999px',
    'font-size': '0.75rem',
    'font-weight': '500',
    'text-transform': 'uppercase',
    'letter-spacing': '0.5px',
    background: isLowStock ? '#ffebee' : '#e8f5e8',
    color: isLowStock ? '#d32f2f' : '#2d7d32'
  });

  const inventoryStats = createMemo(() => {
    const products = inventoryStore.products || [];
    const movements = inventoryStore.movements|| [];
    const stockLevels = inventoryStore.stockLevels|| [];
    const lowStockProducts = inventoryStore.getLowStockProducts();
    
    const totalProducts = products?.length || 0;
    const activeProducts = products?.filter(p => p.isActive).length;
    const totalStockValue = stockLevels.reduce((sum, stock) => sum*1 + (stock.quantity*1 * stock.averageCost*1), 0);
    const totalMovementsThisMonth = movements?.filter(m => {
      const date = new Date(m.createdDate);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;

    return {
      totalProducts,
      activeProducts,
      lowStockProducts: lowStockProducts.length,
      totalStockValue,
      totalMovementsThisMonth,
      totalLocations: inventoryStore.locations.length,
      activeLocations: inventoryStore.getActiveLocations().length
    };
  });

  const productStockSummary = createMemo(() => {
    const productList = products() || [];
    const stockData = allStockData() || [];

    // If no products, return empty array
    if (!productList || productList.length === 0) {
      return [];
    }

    return productList.map(product => {
      // Get stock data from API for this product
      const productStockData = stockData.filter(s => s.product_id === product.id);

      // Calculate total stock from API data
      const totalStock = productStockData.reduce((sum, s) => {
        const qty = s.available_qty ?? s.current_qty ?? 0;
        return sum + (typeof qty === 'number' ? qty : 0);
      }, 0);

      // Convert API data to location format for display
      const stockByLocation = productStockData.map(s => {
        const locationObj = inventoryStore.getLocationById(s.store_id);
        return {
          locationId: s.store_id,
          locationName: locationObj?.name || s.store_id,
          quantity: s.current_qty || 0,
          availableQuantity: s.available_qty || 0,
          reservedQuantity: s.reserved_qty || 0
        };
      });

      // Get last location from stock data (location with most recent movement)
      const sortedByDate = [...productStockData].sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });
      const lastLocationId = sortedByDate.length > 0 ? sortedByDate[0].store_id : null;
      const lastLocation = lastLocationId ? inventoryStore.getLocationById(lastLocationId) : null;

      return {
        ...product,
        totalStock,
        stockByLocation,
        lastLocation,
        isLowStock: totalStock <= (product.minStockLevel || 0)
      };
    });
  });

// Create enhanced search results with stock information
const enhancedSearchResults = createMemo(() => {
  const resultList = searchResults() || [];
  const stockData = allStockData() || [];

  if (!resultList || resultList.length === 0) {
    return [];
  }

  return resultList.map(product => {
    // Get stock data from API for this product
    const productStockData = stockData.filter(s => s.product_id === product.id);

    // Calculate total stock from API data
    const totalStock = productStockData.reduce((sum, s) => {
      const qty = s.available_qty ?? s.current_qty ?? 0;
      return sum + (typeof qty === 'number' ? qty : 0);
    }, 0);

    // Convert API data to location format for display
    const stockByLocation = productStockData.map(s => {
      const locationObj = inventoryStore.getLocationById(s.store_id);
      return {
        locationId: s.store_id,
        locationName: locationObj?.name || s.store_id,
        quantity: s.current_qty || 0,
        availableQuantity: s.available_qty || 0,
        reservedQuantity: s.reserved_qty || 0
      };
    });

    // Get last location from stock data
    const sortedByDate = [...productStockData].sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });
    const lastLocationId = sortedByDate.length > 0 ? sortedByDate[0].store_id : null;
    const lastLocation = lastLocationId ? inventoryStore.getLocationById(lastLocationId) : null;

    return {
      ...product,
      totalStock,
      stockByLocation,
      lastLocation,
      isLowStock: totalStock <= (product.minStockLevel || 0)
    };
  });
});



const handleViewMovement = (prod: Product) => {
  setSelectedProduct(prod);
  setIsDetailModalOpen(true);
};


  return (
    <Layout title={t('products.title', 'Products')}>
      {/* Header with search and actions */}
     
        <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'flex-start', 'margin-bottom': '1.5rem', 'flex-wrap': 'wrap', gap: '1rem' }}>
          <div style={{ flex: '1', 'min-width': '300px' }}>
            <h2 style={{ margin: '0 0 1rem 0', 'font-size': '1.5rem' }}>{t('inventory.products')}</h2>
            
            {/* Product Search */}
            <div style={{ display: 'flex', gap: '1rem', 'align-items': 'center', 'flex-wrap': 'wrap' }}>
              <div style={{ flex: '1', 'min-width': '250px' }}>
                <ProductSearchInput
                  onSearchResults={(results) => {
                    // devLog(results)
                    setSearchResults(results);
                    setSearchMode(results.length > 0);
                  }}
                  placeholder={t('inventory.searchProductsStock', 'Search products and check stock levels...')}
                  showResults={false}
                  maxResults={20}
                />
              </div>
              
              <Button
                variant="outline"
                onClick={async () => {
                  await loadAllProducts();
                  await loadAllStockData();
                  setSearchMode(false);
                }}
                //disabled={!searchMode()}
              >
                🔄 {t('common.showAll', 'Show All')}
              </Button>
            </div>
          </div>
          <Show when={authStore.hasPermission("read_write")}>
            <Button 
              variant="primary" 
              onClick={() => setIsAddProductModalOpen(true)}
            >
              ➕ {t('inventory.addProduct')}
            </Button>
          </Show>
        </div>
        {/* Results count */}
        <div style={{
          'margin-bottom': '1rem',
          'font-size': '0.875rem',
          color: 'var(--text-muted)',
          display: 'flex',
          'justify-content': 'space-between',
          'align-items': 'center'
        }}>
          <span>
            {searchMode() ? (
              `${t('inventory.searchResults', 'Search Results')}: ${enhancedSearchResults().length} ${t('common.products', 'products')}`
            ) : (
              `${t('inventory.totalProducts', 'Total Products')}: ${productStockSummary().length} ${t('common.products', 'products')}`
            )}
          </span>

          {searchMode() && (
            <span style={{ color: 'var(--primary-color)' }}>
              🔍 {t('inventory.filtered', 'Filtered view')}
            </span>
          )}
        </div>
       
        <LazyList
          items={searchMode() ? enhancedSearchResults() : productStockSummary()}
          renderItem={(product) => (
            <div
              style={productCardStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              onclick={()=>handleViewMovement(product)}
            >

              <div style={productHeaderStyle}>
                <div>
                  <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', 'margin-bottom': '0.5rem' }}>
                    <h3 style={{ margin: '0', 'font-size': '1.1rem', "margin-top": '1rem' }}>{product.name}</h3>
                    <div style={{position: 'absolute', right: '2px', top:'2px'}}>
                      <ProductStockBadge
                        productId={product.id}
                        minStockLevel={product.minStockLevel}
                        showQuantity={true}
                      />
                    </div>
                  </div>
                  <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                    {product.sku}{product.UPC?" • " + product.UPC: ""}{product.category?" • " + product.category: ""}

                  </div>
                  <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                    {t('inventory.lastSeen')}: {product.lastLocation?.name || t('inventory.noMovements')}
                  </div>
                </div>
                
              </div>
             
              <div >
                <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                  {t('inventory.cost')}: {formatCurrency(product?.unitCost || product?.costPrice || product?.price || 0)}
                </div>
              </div>
              {/* Stock by Location */}
              {product?.stockByLocation?.length > 0 && (
                <div style={{ 'margin-top': '1rem' }}>
                  <div style={{ 'font-weight': '500', 'margin-bottom': '0.5rem', 'font-size': '0.875rem' }}>
                    {t('inventory.stockByLocation')}:
                  </div>
                  <div style={{ display: 'flex', 'flex-wrap': 'wrap', gap: '0.5rem' }}>
                    <For each={product.stockByLocation}>
                      {(stock) => {
                        const location = inventoryStore.getLocationById(stock.locationId);
                        return (
                          <div style={{
                            padding: '0.25rem 0.5rem',
                            background: 'var(--background-color)',
                            'border-radius': 'var(--border-radius-sm)',
                            'font-size': '0.75rem',
                            border: '1px solid var(--border-color)'
                          }}>
                            {location?.name}: {stock.quantity}
                          </div>
                        );
                      }}
                    </For>
                  </div>
                </div>
              )}
            </div>
          )}
          batchSize={20}
          gridColumns="repeat(auto-fit, minmax(460px, 1fr))"
          gap="1rem"
          itemsLabel={t('common.products', 'productos')}
          emptyMessage={t('inventory.noProducts', 'No hay productos')}
        />
      

      {/* Add Product Modal */}
      <AddProductModal
        isOpen={isAddProductModalOpen()}
        onClose={() => setIsAddProductModalOpen(false)}
        onProductAdded={() => {
          loadProducts();
        }}
      />

      {/* Product Detail Modal */}
      <ProductDetailModal
        isOpen={isDetailModalOpen()}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct()}
        onEdit={() => {
          setIsDetailModalOpen(false);
          setIsUpdateModalOpen(true);
        }}
      />

      {/* Update Product Modal */}
      <UpdateProductModal
        isOpen={isUpdateModalOpen()}
        onClose={() => {
          setIsUpdateModalOpen(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct()}
        onProductUpdated={() => {
          loadProducts();
        }}
      />

    </Layout>
  );
};

export default Products;





// sudo ssh -i qvamarkets.pem ubuntu@ec2-18-189-8-158.us-east-2.compute.amazonaws.com