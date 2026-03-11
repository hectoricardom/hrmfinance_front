import { Component, createSignal, createMemo, createEffect, For, onMount, Show } from 'solid-js';
import { useTranslation } from '../../../translations';
import { Layout, Card, Button } from '../../ui';
import AddInventoryModal from '../components/AddInventoryModal';
import BulkMovementWithReport from '../components/BulkMovementWithReport';
import InventoryDetailModal from '../components/InventoryDetailModal';
import InventoryMovementView from '../components/InventoryMovementView';
import AddLocationModal from '../components/AddLocationModal';
import PhysicalInventoryCountingForm from '../components/PhysicalInventoryCountingForm';
import { inventoryStore, InventoryItem, Product, Location } from '../stores/inventoryStore';
import { inventoryApi, movementsApi, productsApi } from '../../../services/apiAdapter';
import { authStore } from '../../../stores/authStore';

import Products from './Products';
import ProductImageViewer from '../components/ProductImageViewer';
import HistoricalBulkReportsModal from '../components/HistoricalBulkReportsModal';
import BulkMovementModal from '../components/BulkMovementModal';
import { devLog } from '../../../services/utils';


const Inventory: Component = () => {
  const { t } = useTranslation();
  const [isAddModalOpen, setIsAddModalOpen] = createSignal(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = createSignal(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = createSignal(false);
  const [selectedItem, setSelectedItem] = createSignal<InventoryItem | null>(null);
  const [activeTab, setActiveTab] = createSignal<'overview' | 'products' | 'stock' | 'movements' | 'locations'>('overview');
  const [viewMode, setViewMode] = createSignal<'legacy' | 'new'>('new');
 
  const [searchResults, setSearchResults] = createSignal<Product[]>([]);
  const [searchMode, setSearchMode] = createSignal(false);
  
  // Add modals
  const [isAddLocationModalOpen, setIsAddLocationModalOpen] = createSignal(false);
  const [isPhysicalCountFormOpen, setIsPhysicalCountFormOpen] = createSignal(false);
  const [isHistoricalReportsOpen, setIsHistoricalReportsOpen] = createSignal(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = createSignal(1);

  const handleViewItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsDetailModalOpen(true);
  };

  // Computed values for new inventory system - using API stats
  const [statsData, setStatsData] = createSignal<any>(null);
  const [lowStockItems, setLowStockItems] = createSignal<any[]>([]);

  const inventoryStats = createMemo(() => {
    const stats = statsData();
    if (!stats?.summary) {
      return {
        totalProducts: 0,
        activeProducts: 0,
        inStock: 0,
        lowStockProducts: 0,
        outOfStock: 0,
        totalQuantity: 0,
        totalStockValue: 0,
        totalMovementsThisMonth: 0,
        totalLocations: inventoryStore.locations.length,
        activeLocations: inventoryStore.getActiveLocations().length,
        storeCount: 0
      };
    }

    return {
      totalProducts: stats.summary.total_products,
      activeProducts: stats.summary.total_products,
      inStock: stats.summary.in_stock,
      lowStockProducts: stats.summary.low_stock,
      outOfStock: stats.summary.out_of_stock,
      totalQuantity: stats.summary.total_quantity,
      totalStockValue: 0, // Not provided by API
      totalMovementsThisMonth: stats.summary.total_sales + stats.summary.total_adjustments,
      totalLocations: inventoryStore.locations.length,
      activeLocations: inventoryStore.getActiveLocations().length,
      storeCount: stats.summary.store_count
    };
  });

  const productStockSummary = createMemo(() => {
    return inventoryStore.products.map(product => {
      const stockByLocation = inventoryStore.getStockByProduct(product.id);
      const totalStock = inventoryStore.getTotalStockByProduct(product.id);
      const lastLocation = inventoryStore.getLastLocationByProduct(product.id);
      
      return {
        ...product,
        totalStock,
        stockByLocation,
        lastLocation,
        isLowStock: totalStock <= product.minStockLevel
      };
    });
  });
  
  
  // Reset page when search mode changes
  createMemo(() => {
    searchMode();
    setCurrentPage(1);
  });

  const getStockLevel = (quantity: number, minStock: number) => {
    if (quantity <= minStock) return t('inventory.lowStockAlert');
    if (quantity <= minStock * 2) return t('inventory.normalStock');
    return t('inventory.inStock');
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getLocationTypeTranslation = (type: string) => {
    switch (type) {
      case 'warehouse': return t('inventory.warehouse');
      case 'store': return t('inventory.store');
      case 'supplier': return t('inventory.supplier');
      case 'customer': return t('inventory.customer');
      default: return type;
    }
  };


  const inventoryGridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1.5rem',
    'margin-bottom': '2rem'
  };

  const itemHeaderStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '1rem'
  };

  const stockLevelStyle = (level: number) => ({
    padding: '0.25rem 0.75rem',
    'border-radius': '9999px',
    'font-size': '0.75rem',
    'font-weight': '500',
    background: level > 50 ? '#d4edda' : level > 20 ? '#fff3cd' : '#f8d7da',
    color: level > 50 ? '#155724' : level > 20 ? '#856404' : '#721c24'
  });

  const priceStyle = {
    'font-size': '1.25rem',
    'font-weight': '600',
    color: 'var(--primary-color)',
    'margin-bottom': '0.5rem'
  };

  const quantityStyle = {
    color: 'var(--text-muted)',
    'font-size': '0.875rem'
  };

  const summaryCardsStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1.5rem',
    'margin-bottom': '2rem'
  };

  // New styles for enhanced interface
  const headerStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '2rem'
  };

  const tabsStyle = {
    display: 'flex',
    'border-bottom': '1px solid var(--border-color)',
    'margin-bottom': '1.5rem'
  };

  const tabStyle = (isActive: boolean) => ({
    padding: '0.75rem 1rem',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    'font-weight': '500',
    color: isActive ? 'var(--primary-color)' : 'var(--text-muted)',
    'border-bottom': isActive ? '2px solid var(--primary-color)' : '2px solid transparent',
    transition: 'all 0.2s ease'
  });


  const locationGridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem',
    'margin-bottom': '2rem'
  };

  const locationCardStyle = {
    padding: '1rem',
    background: 'var(--surface-color)',
    'border-radius': 'var(--border-radius-sm)',
    border: '1px solid var(--border-color)'
  };

  const modeToggleStyle = {
    display: 'flex',
    gap: '0.5rem',
    'align-items': 'center',
    'margin-left': 'auto',
    'margin-right': '1rem'
  };

  const modeButtonStyle = (isActive: boolean) => ({
    padding: '0.5rem 1rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    background: isActive ? 'var(--primary-color)' : 'var(--surface-color)',
    color: isActive ? 'white' : 'var(--text-primary)',
    cursor: 'pointer',
    'font-weight': '500',
    'font-size': '0.875rem',
    transition: 'all 0.2s ease'
  });

  

  
  const movementStats = createMemo(() => {
    const movements = inventoryStore.movements;
    return {
      total: movements.length,
      stockIn: movements.filter(m => m.movementType === 'in').length,
      stockOut: movements.filter(m => m.movementType === 'out').length,
      transfers: movements.filter(m => m.movementType === 'transfer').length,
      adjustments: movements.filter(m => m.movementType === 'adjustment').length,
      totalValue: movements.reduce((sum, m) => sum + m.totalCost, 0)
    };
  });



  // Load products from API or local store
  const loadAllProducts = async () => {
    try {
     
      
      // Try to fetch from API first
      try {
       


        const apiResults = await inventoryApi.getProducts(authStore.getBusinessId());
        // Convert API results to Product format
        devLog({apiResults})
        const productsArr: string[] = Object.keys(apiResults);

        const parseProduct = (itemId: string): Product =>{

          let rec = apiResults as Record<string, any>
          let v = rec[itemId] as Record<string, any>
        
          return {
            id: itemId,
            name: v.name,
            businessId: v.businessId,
            sku: v.code,
            UPC: v.UPC,
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

        let products: Product[] = productsArr.map(parseProduct)
       
        setSearchResults(products);
        inventoryStore.updProduct(products);
        
      } catch (apiError) {
        // Fallback to local store if API fails
        console.warn('API failed, using local store:', apiError);
        setSearchResults(inventoryStore.products);
      }
    } catch (err) {
      //setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      //setLoading(false);
    }
  };




  const loadStatsData = async () => {
    try {
      // API methods get businessId internally from authStore.getBusinessId()
      const stats = await inventoryApi.getStockStats();
      setStatsData(stats);

      // Load low stock items with threshold of 10, limit 20
      const lowStock = await inventoryApi.getLowStockItems(10, 20);
      setLowStockItems(lowStock?.items || lowStock || []);
    } catch (error) {
      console.error('Failed to load inventory stats:', error);
    }
  };

  const Initialize = async () => {
    // Use session businessId (supports business switcher)
    let qry = authStore.getBusinessId();

    // Load locations from Firestore first
    devLog('Loading locations from Firestore...');
    await inventoryStore.loadLocationsFromFirestore();

    setTimeout(async () => {
      await inventoryStore.getStockLevels("YY_");
    }, 2300);
    movementsApi.calcStockLevels();
    await inventoryStore.fecthProduct(qry);
    await inventoryStore.fecthInventory(qry);

    // Load stats from API (uses session businessId internally)
    await loadStatsData();
  }

  // Track previous businessId to detect changes
  let prevBusinessId = authStore.getBusinessId();

  // Reload data when business context changes (via BusinessSwitcher)
  createEffect(() => {
    const currentBusinessId = authStore.getBusinessId();
    if (currentBusinessId !== prevBusinessId) {
      devLog(`📊 Business changed from ${prevBusinessId} to ${currentBusinessId}, reloading inventory data...`);
      prevBusinessId = currentBusinessId;
      // Reload all data with new business context
      loadStatsData();
      inventoryStore.fecthProduct(currentBusinessId);
      inventoryStore.fecthInventory(currentBusinessId);
    }
  });

  onMount(() => {
    setTimeout(() => {
       Initialize();
    }, 450);
   
  })


 

  


  return (
    <Layout title={t('inventory.title')}>
      {/* Header with controls */}
      <div style={headerStyle}>
        <h1 style={{ margin: '0', 'font-size': '1.75rem' }}></h1>
        
        <div style={{ display: 'flex', 'align-items': 'center', gap: '1rem' }}>
           {/* 
          <div style={modeToggleStyle}>
            <span style={{ 'font-weight': '500', color: 'var(--text-muted)', 'font-size': '0.875rem' }}>View:</span>
            <button
              style={modeButtonStyle(viewMode() === 'new')}
              onClick={() => setViewMode('new')}
            >
              {t('common.view')} 1
            </button>
            <button
              style={modeButtonStyle(viewMode() === 'legacy')}
              onClick={() => setViewMode('legacy')}
            >
              {t('common.view')} 2
            </button>
          </div>
           */}
          {viewMode() === 'new' && (
            <>
            
              
              <Button 
                variant="outline" 
                onClick={() => setIsPhysicalCountFormOpen(true)}
              >
                🔢 {t('inventory.physicalCount', 'Physical Count')}
              </Button>
              
            
            </>
          )}
          <Show when={authStore.hasPermission("read_write")}>
            <Button 
                variant="outline" 
                onClick={() => setIsHistoricalReportsOpen(true)}
              >
                📊 {t('inventory.viewHistoricalReports')}
            </Button>
               {isBulkModalOpen()?"O":"X"}
            <Button 
              variant="primary" 
              onClick={() => setIsBulkModalOpen(true)}
            >
              {viewMode() === 'new' ? t('inventory.addMovement') : t('common.add')}
            </Button>
          </Show>
        </div>
      </div>

      <ProductImageViewer />
      <Show when={authStore.hasPermission("inventoryDownsection")}>

      {viewMode() === 'legacy' ? (
        /* Legacy View */
        <>
          <div style={summaryCardsStyle}>
            <Card title={t('inventory.totalItems')} subtitle={t('inventory.inStock')}>
              <div style={{ 'font-size': '1.5rem', 'font-weight': '600', color: 'var(--primary-color)' }}>
                {inventoryStore.inventory.length}
              </div>
            </Card>
            <Card title={t('inventory.lowStockAlert')} subtitle={t('inventory.itemsBelowThreshold')}>
              <div style={{ 'font-size': '1.5rem', 'font-weight': '600', color: 'var(--primary-color)' }}>
                {inventoryStore.getLowStockItems().length}
              </div>
            </Card>
            <Card title={t('inventory.totalValue')} subtitle={t('inventory.inventoryWorth')}>
              <div style={{ 'font-size': '1.5rem', 'font-weight': '600', color: 'var(--primary-color)' }}>
                {formatPrice(inventoryStore.getTotalValue())}
              </div>
            </Card>
          </div>

          <div style={inventoryGridStyle}>
            <For each={inventoryStore.inventory}>
              {(item) => {
                const stockLevel = getStockLevel(item.quantity, item.minStock);
                const stockLevelValue = item.quantity <= item.minStock ? 8 : item.quantity <= item.minStock * 2 ? 35 : 75;
                
                return (
                  <Card onClick={() => handleViewItem(item)}>
                    <div style={itemHeaderStyle}>
                      <h3 style={{ margin: '0', 'font-size': '1.1rem' }}>{item.name}</h3>
                      <div style={stockLevelStyle(stockLevelValue)}>{stockLevel}</div>
                    </div>
                    <div style={priceStyle}>{formatPrice(item.price)}</div>
                    <div style={quantityStyle}>{t('inventory.quantity')}: {item.quantity} {t('common.units')}</div>
                  </Card>
                );
              }}
            </For>
          </div>
        </>
      ) : (
        /* Enhanced View */
        <>
          {/* Tabs */}
          <div style={tabsStyle}>
            <button 
              style={tabStyle(activeTab() === 'overview')}
              onClick={() => setActiveTab('overview')}
            >
              {t('inventory.overview')}
            </button>
            <button 
              style={tabStyle(activeTab() === 'products')}
              onClick={() => setActiveTab('products')}
            >
              {t('inventory.products')}
            </button>
            <Show when={authStore.isAdmin()}>
              <></>  
            </Show>

            
            <button 
              style={tabStyle(activeTab() === 'movements')}
              onClick={() => setActiveTab('movements')}
            >
              {t('inventory.movements')}
            </button>
            
            <button 
              style={tabStyle(activeTab() === 'locations')}
              onClick={() => setActiveTab('locations')}
            >
              {t('inventory.locations')}
            </button>
            
          </div>

          {/* Tab Content */}
          {activeTab() === 'overview' && (
            <div>
              {/* Summary Cards */}
              <div style={summaryCardsStyle}>
                <Card title={t('inventory.totalProducts')} subtitle={t('inventory.allProducts')}>
                  <div style={{ 'font-size': '1.5rem', 'font-weight': '600', color: 'var(--primary-color)' }}>
                    {inventoryStats()?.totalProducts}
                  </div>
                </Card>
                <Card title={t('inventory.inStock')} subtitle={t('inventory.availableProducts')}>
                  <div style={{ 'font-size': '1.5rem', 'font-weight': '600', color: '#2e7d32' }}>
                    {inventoryStats()?.inStock}
                  </div>
                </Card>
                <Card title={t('inventory.lowStockAlert')} subtitle={t('inventory.needAttention')}>
                  <div style={{ 'font-size': '1.5rem', 'font-weight': '600', color: '#f57c00' }}>
                    {inventoryStats()?.lowStockProducts}
                  </div>
                </Card>
                <Card title={t('inventory.outOfStock')} subtitle={t('inventory.unavailable')}>
                  <div style={{ 'font-size': '1.5rem', 'font-weight': '600', color: '#d32f2f' }}>
                    {inventoryStats()?.outOfStock}
                  </div>
                </Card>
                <Card title={t('inventory.totalQuantity')} subtitle={t('inventory.totalUnits')}>
                  <div style={{ 'font-size': '1.5rem', 'font-weight': '600', color: 'var(--primary-color)' }}>
                    {inventoryStats()?.totalQuantity?.toLocaleString()}
                  </div>
                </Card>
                <Card title={t('inventory.stores')} subtitle={t('inventory.activeStores')}>
                  <div style={{ 'font-size': '1.5rem', 'font-weight': '600', color: 'var(--primary-color)' }}>
                    {inventoryStats()?.storeCount}
                  </div>
                </Card>
              </div>

              {/* Low Stock Alerts Section */}
              {lowStockItems().length > 0 && (
                <Card
                  title={`⚠️ ${t('inventory.lowStockAlert')}`}
                  subtitle={`${lowStockItems().length} ${t('inventory.productsNeedRestocking')}`}
                  style={{
                    'margin-bottom': '2rem',
                    'border-color': '#ffcdd2',
                    background: '#ffebee'
                  }}
                >
                  <div style={{ 'margin-top': '1rem' }}>
                    <For each={lowStockItems()}>
                      {(item) => (
                        <div style={{
                          display: 'flex',
                          'justify-content': 'space-between',
                          'align-items': 'center',
                          'margin-bottom': '0.75rem',
                          'padding': '0.5rem',
                          'border-radius': '4px',
                          'background': 'white'
                        }}>
                          <div style={{ flex: '1' }}>
                            <div style={{ 'font-weight': '600', 'font-size': '0.875rem' }}>
                              {item.product_name}
                            </div>
                            <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                              {item.sku} • {item.store_name}
                            </div>
                          </div>
                          <div style={{ 'text-align': 'right' }}>
                            <div style={{ color: '#d32f2f', 'font-weight': '600', 'font-size': '0.875rem' }}>
                              {item.quantity} {t('inventory.units')}
                            </div>
                            <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                              {t('inventory.min')}: {item.min_stock}
                            </div>
                          </div>
                        </div>
                      )}
                    </For>
                  </div>
                </Card>
              )}

              {/* Store Breakdown Section */}
              <Show when={statsData()?.byStore && statsData().byStore.length > 0}>
                <Card
                  title={t('inventory.storeBreakdown')}
                  subtitle={t('inventory.productsByStore')}
                  style={{ 'margin-bottom': '2rem' }}
                >
                  <div style={{ 'margin-top': '1rem' }}>
                    <For each={statsData().byStore}>
                      {(store) => (
                        <div style={{
                          display: 'flex',
                          'justify-content': 'space-between',
                          'align-items': 'center',
                          'margin-bottom': '0.75rem',
                          'padding': '0.75rem',
                          'border-radius': '4px',
                          'background': 'var(--surface-color)',
                          'border': '1px solid var(--border-color)'
                        }}>
                          <div style={{ 'font-weight': '600', 'font-size': '0.875rem' }}>
                            {store.store_id}
                          </div>
                          <div style={{ display: 'flex', gap: '1.5rem', 'align-items': 'center' }}>
                            <div style={{ 'text-align': 'center' }}>
                              <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                                {t('inventory.products')}
                              </div>
                              <div style={{ 'font-weight': '600', color: 'var(--primary-color)' }}>
                                {store.products}
                              </div>
                            </div>
                            <div style={{ 'text-align': 'center' }}>
                              <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                                {t('inventory.quantity')}
                              </div>
                              <div style={{ 'font-weight': '600', color: 'var(--primary-color)' }}>
                                {store.quantity}
                              </div>
                            </div>
                            <div style={{ 'text-align': 'center' }}>
                              <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                                {t('inventory.outOfStock')}
                              </div>
                              <div style={{ 'font-weight': '600', color: '#d32f2f' }}>
                                {store.out_of_stock}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </For>
                  </div>
                </Card>
              </Show>

             
            </div>
          )}

          {activeTab() === 'products' && (
            <Products />
          )}

          {  activeTab() === 'movements' && (
            <InventoryMovementView />
          )}

          {activeTab() === 'locations' && (
            <div>
              <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '1.5rem' }}>
                <h2 style={{ margin: '0', 'font-size': '1.5rem' }}>{t('inventory.locations')}</h2>
                 
                <Show when={authStore.hasPermission("read_write")}>
                  <Button 
                    variant="primary" 
                    onClick={() => setIsAddLocationModalOpen(true)}
                  >
                    🏭 {t('inventory.addLocation')}
                  </Button>
                </Show>
              </div>
              
              <div style={locationGridStyle}>
              <For each={inventoryStore.getActiveLocations()}>
                {(location) => {
                  const locationStock = inventoryStore.getStockByLocation(location.id);
                  const totalProducts = locationStock?.length;
                  const totalItems = locationStock?.reduce((sum, stock) => sum*1 + stock.quantity*1, 0);
                  const totalValue = locationStock?.reduce((sum, stock) => {
                    const product = inventoryStore?.getProductById(stock.productId);
                    return sum + (stock?.averageCost || 0);
                  }, 0);
                  
                  return (
                    <div style={{
                      ...locationCardStyle,
                      'min-height': '400px'
                    }}>
                      {/* Location Header */}
                      <div style={{ 'margin-bottom': '1rem', 'padding-bottom': '1rem', 'border-bottom': '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', 'margin-bottom': '0.5rem' }}>
                          <span style={{ 'font-size': '1.2rem' }}>
                            {location.type === 'warehouse' ? '🏭' : 
                             location.type === 'store' ? '🏪' : 
                             location.type === 'supplier' ? '🚚' : '👥'}
                          </span>
                          <h3 style={{ margin: '0', 'font-size': '1.1rem' }}>{location.name}</h3>
                        </div>
                        <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                          {location.code} • {getLocationTypeTranslation(location.type)}
                        </div>
                        <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', 'margin-top': '0.25rem' }}>
                          {location.address}
                        </div>
                      </div>
                      
                      {/* Summary Stats */}
                      <div style={{ 'margin-bottom': '1rem' }}>
                        <div style={{ 
                          display: 'flex', 
                          'justify-content': 'space-between',
                          'margin-bottom': '0.5rem' 
                        }}>
                          <span style={{ 'font-size': '0.875rem', 'font-weight': '500' }}>{t('inventory.products')}:</span>
                          <span style={{ 'font-weight': '600' }}>{totalProducts}</span>
                        </div>
                        
                        <div style={{ 
                          display: 'flex', 
                          'justify-content': 'space-between',
                          'margin-bottom': '0.5rem'
                        }}>
                          <span style={{ 'font-size': '0.875rem', 'font-weight': '500' }}>{t('inventory.totalItems')}:</span>
                          <span style={{ 'font-weight': '600', color: 'var(--primary-color)' }}>{totalItems}</span>
                        </div>

                        <div style={{ 
                          display: 'flex', 
                          'justify-content': 'space-between',
                          'margin-bottom': '1rem'
                        }}>
                          <span style={{ 'font-size': '0.875rem', 'font-weight': '500' }}>{t('inventory.totalValue')}:</span>
                          <span style={{ 'font-weight': '600', color: 'var(--primary-color)' }}>
                            {formatCurrency(totalValue)}
                          </span>
                        </div>
                      </div>

                      {/* Product Details */}
                      <div>
                        <div style={{ 
                          'font-weight': '600', 
                          'margin-bottom': '0.75rem',
                          'font-size': '0.875rem',
                          color: 'var(--text-primary)',
                          'border-bottom': '1px solid var(--border-color)',
                          'padding-bottom': '0.5rem'
                        }}>
                          {t('inventory.productDetails')}:
                        </div>
                        
                        {locationStock?.length === 0 ? (
                          <div style={{ 
                            'text-align': 'center', 
                            color: 'var(--text-muted)', 
                            'font-style': 'italic',
                            padding: '1rem' 
                          }}>
                            {t('inventory.noProducts')}
                          </div>
                        ) : (
                          <div style={{ 
                            'max-height': '200px', 
                            'overflow-y': 'auto',
                            'border': '1px solid var(--border-color)',
                            'border-radius': 'var(--border-radius-sm)'
                          }}>
                            <For each={locationStock }>
                              {(stock) => {
                                const product = inventoryStore.getProductById(stock.productId);
                                if (!product) return null;
                                
                                const isLowStock = stock.quantity <= product.minStockLevel;
                                const stockValue =  stock.averageCost;

                                if (!stock.quantity) return null;

                                return (
                                  <div style={{
                                    padding: '0.75rem',
                                    'border-bottom': '1px solid var(--border-color)',
                                    'background': isLowStock ? '#fff5f5' : 'transparent',
                                    transition: 'background-color 0.2s ease'
                                  }}>
                                    <div style={{ 
                                      display: 'flex', 
                                      'justify-content': 'space-between', 
                                      'align-items': 'flex-start',
                                      'margin-bottom': '0.25rem'
                                    }}>
                                      <div style={{ flex: '1' }}>
                                        <div style={{ 
                                          'font-weight': '500', 
                                          'font-size': '0.875rem',
                                          color: isLowStock ? '#d32f2f' : 'var(--text-primary)'
                                        }}>
                                          {product.name}
                                          {isLowStock && (
                                            <span style={{ 
                                              'margin-left': '0.5rem',
                                              'font-size': '0.7rem',
                                              color: '#d32f2f'
                                            }}>
                                              ⚠️ LOW
                                            </span>
                                          )}
                                        </div>
                                        <div style={{ 
                                          'font-size': '0.75rem', 
                                          color: 'var(--text-muted)',
                                          'margin-top': '0.1rem'
                                        }}>
                                          {product.sku}{product.UPC?" • " + product.UPC: ""}{product.category?" • " + product.category: ""}
                                        </div>
                                      </div>
                                      
                                      <div style={{ 'text-align': 'right' }}>
                                        <div style={{ 
                                          'font-weight': '600',
                                          'font-size': '0.875rem',
                                          color: isLowStock ? '#d32f2f' : 'var(--primary-color)'
                                        }}>
                                          {stock.quantity} {product.unitOfMeasure}
                                        </div>
                                        <div style={{ 
                                          'font-size': '0.75rem', 
                                          color: 'var(--text-muted)' 
                                        }}>
                                          {formatCurrency(stockValue)}
                                        </div>
                                        <div style={{ 
                                          'font-size': '0.7rem', 
                                          color: 'var(--text-muted)',
                                          'margin-top': '0.1rem'
                                        }}>
                                          Min: {product.minStockLevel}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }}
                            </For>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }}
              </For>
              </div>
            </div>
          )}
        </>
      )}

    </Show>
    
    <Show when={authStore.hasPermission("read_write")}>
      {/* Modals */}
     
    
   
     
      <InventoryDetailModal
        isOpen={isDetailModalOpen()}
        onClose={() => setIsDetailModalOpen(false)}
        item={selectedItem()}
      />
    
     
      
      {/* Add Location Modal */}
      <AddLocationModal
        isOpen={isAddLocationModalOpen()}
        onClose={() => setIsAddLocationModalOpen(false)}
        onLocationAdded={() => {
          setIsAddLocationModalOpen(false);
        }}
      />


    </Show>

      <BulkMovementModal
        isOpen={isBulkModalOpen()}
        onClose={() => setIsBulkModalOpen(false)}
      />
     <AddInventoryModal
        isOpen={isAddModalOpen()}
        onClose={() => setIsAddModalOpen(false)}
        mode={viewMode() === 'new' ? 'movement' : 'legacy'}
      />
      {/* Physical Inventory Counting Form */}
      <PhysicalInventoryCountingForm
        isOpen={isPhysicalCountFormOpen()}
        onClose={() => setIsPhysicalCountFormOpen(false)}
      />

      {/* Historical Bulk Reports Modal */}
      <HistoricalBulkReportsModal
        isOpen={isHistoricalReportsOpen()}
        onClose={() => setIsHistoricalReportsOpen(false)}
      />

     

    
      
    </Layout>
  );
};

export default Inventory;





