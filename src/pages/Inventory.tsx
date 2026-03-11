import { Component, createSignal, createMemo, For } from 'solid-js';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import AddInventoryModal from '../components/AddInventoryModal';
import BulkMovementModal from '../components/BulkMovementModal';
import InventoryDetailModal from '../components/InventoryDetailModal';
import InventoryMovementView from '../components/InventoryMovementView';
import AddProductModal from '../components/AddProductModal';
import AddLocationModal from '../components/AddLocationModal';
import { inventoryStore, InventoryItem, Product, Location } from '../stores/inventoryStore';
import { useTranslation } from '../i18n';

const Inventory: Component = () => {
  const { t } = useTranslation();
  const [isAddModalOpen, setIsAddModalOpen] = createSignal(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = createSignal(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = createSignal(false);
  const [selectedItem, setSelectedItem] = createSignal<InventoryItem | null>(null);
  const [activeTab, setActiveTab] = createSignal<'overview' | 'products' | 'stock' | 'movements' | 'locations'>('overview');
  const [viewMode, setViewMode] = createSignal<'legacy' | 'new'>('new');
  const [selectedProduct, setSelectedProduct] = createSignal('');
  const [selectedLocation, setSelectedLocation] = createSignal('');
  
  // Add modals
  const [isAddProductModalOpen, setIsAddProductModalOpen] = createSignal(false);
  const [isAddLocationModalOpen, setIsAddLocationModalOpen] = createSignal(false);

  const handleViewItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsDetailModalOpen(true);
  };

  // Computed values for new inventory system
  const inventoryStats = createMemo(() => {
    const products = inventoryStore.products;
    const movements = inventoryStore.movements;
    const stockLevels = inventoryStore.stockLevels;
    const lowStockProducts = inventoryStore.getLowStockProducts();
    
    const totalProducts = products.length;
    const activeProducts = products.filter(p => p.isActive).length;
    const totalStockValue = stockLevels.reduce((sum, stock) => sum + (stock.quantity * stock.averageCost), 0);
    const totalMovementsThisMonth = movements.filter(m => {
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

  const getStockLevel = (quantity: number, minStock: number) => {
    if (quantity <= minStock) return t('inventory.lowStock', 'Low Stock');
    if (quantity <= minStock * 2) return t('inventory.normal', 'Normal');
    return t('inventory.inStock', 'In Stock');
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

  const productCardStyle = {
    padding: '1.5rem',
    'margin-bottom': '1rem',
    background: 'var(--surface-color)',
    'border-radius': 'var(--border-radius)',
    border: '1px solid var(--border-color)',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  };

  const productHeaderStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'flex-start',
    'margin-bottom': '1rem'
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

  return (
    <Layout title={t('inventory.title', 'Inventory Management')}>
      {/* Header with controls */}
      <div style={headerStyle}>
        <h1 style={{ margin: '0', 'font-size': '1.75rem' }}>{t('inventory.title', 'Inventory Management')}</h1>
        
        <div style={{ display: 'flex', 'align-items': 'center', gap: '1rem' }}>
          <div style={modeToggleStyle}>
            <span style={{ 'font-weight': '500', color: 'var(--text-muted)', 'font-size': '0.875rem' }}>{t('inventory.view', 'View')}:</span>
            <button
              style={modeButtonStyle(viewMode() === 'new')}
              onClick={() => setViewMode('new')}
            >
              {t('inventory.enhanced', 'Enhanced')}
            </button>
            <button
              style={modeButtonStyle(viewMode() === 'legacy')}
              onClick={() => setViewMode('legacy')}
            >
              {t('inventory.legacy', 'Legacy')}
            </button>
          </div>
          
          {viewMode() === 'new' && (
            <Button 
              variant="outline" 
              onClick={() => setIsBulkModalOpen(true)}
            >
              {t('inventory.bulkMovement', 'Bulk Movement')}
            </Button>
          )}
          
          <Button 
            variant="primary" 
            onClick={() => setIsAddModalOpen(true)}
          >
            {viewMode() === 'new' ? t('inventory.addSingleMovement', 'Add Single Movement') : t('inventory.addNewItem', 'Add New Item')}
          </Button>
        </div>
      </div>

      {viewMode() === 'legacy' ? (
        /* Legacy View */
        <>
          <div style={summaryCardsStyle}>
            <Card title="Total Items" subtitle="In stock">
              <div style={{ 'font-size': '1.5rem', 'font-weight': '600', color: 'var(--primary-color)' }}>
                {inventoryStore.inventory.length}
              </div>
            </Card>
            <Card title="Low Stock" subtitle="Items below threshold">
              <div style={{ 'font-size': '1.5rem', 'font-weight': '600', color: 'var(--primary-color)' }}>
                {inventoryStore.getLowStockItems().length}
              </div>
            </Card>
            <Card title="Total Value" subtitle="Inventory worth">
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
                    <div style={quantityStyle}>{t('inventory.quantity', 'Quantity')}: {item.quantity} {t('inventory.units', 'units')}</div>
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
              {t('inventory.overview', 'Overview')}
            </button>
            <button 
              style={tabStyle(activeTab() === 'products')}
              onClick={() => setActiveTab('products')}
            >
              {t('inventory.productsAndStock', 'Products & Stock')}
            </button>
            <button 
              style={tabStyle(activeTab() === 'movements')}
              onClick={() => setActiveTab('movements')}
            >
              {t('inventory.movements', 'Movements')}
            </button>
            <button 
              style={tabStyle(activeTab() === 'locations')}
              onClick={() => setActiveTab('locations')}
            >
              {t('inventory.locations', 'Locations')}
            </button>
          </div>

          {/* Tab Content */}
          {activeTab() === 'overview' && (
            <div>
              {/* Summary Cards */}
              <div style={summaryCardsStyle}>
                <Card title={t('inventory.activeProducts', 'Active Products')} subtitle={t('inventory.currentlyManaged', 'Currently managed')}>
                  <div style={{ 'font-size': '1.5rem', 'font-weight': '600', color: 'var(--primary-color)' }}>
                    {inventoryStats().activeProducts}
                  </div>
                </Card>
                <Card title={t('inventory.lowStockItems', 'Low Stock Items')} subtitle={t('inventory.needAttention', 'Need attention')}>
                  <div style={{ 'font-size': '1.5rem', 'font-weight': '600', color: '#d32f2f' }}>
                    {inventoryStats().lowStockProducts}
                  </div>
                </Card>
                <Card title={t('inventory.totalStockValue', 'Total Stock Value')} subtitle={t('inventory.currentWorth', 'Current worth')}>
                  <div style={{ 'font-size': '1.5rem', 'font-weight': '600', color: 'var(--primary-color)' }}>
                    {formatCurrency(inventoryStats().totalStockValue)}
                  </div>
                </Card>
                <Card title={t('inventory.thisMonth', 'This Month')} subtitle={t('inventory.movements', 'Movements')}>
                  <div style={{ 'font-size': '1.5rem', 'font-weight': '600', color: 'var(--primary-color)' }}>
                    {inventoryStats().totalMovementsThisMonth}
                  </div>
                </Card>
                <Card title={t('inventory.activeLocations', 'Active Locations')} subtitle={t('inventory.warehousesAndStores', 'Warehouses & stores')}>
                  <div style={{ 'font-size': '1.5rem', 'font-weight': '600', color: 'var(--primary-color)' }}>
                    {inventoryStats().activeLocations}
                  </div>
                </Card>
              </div>

              {/* Low Stock Alert */}
              {inventoryStats().lowStockProducts > 0 && (
                <Card 
                  title={t('inventory.lowStockAlert', 'Low Stock Alert')} 
                  subtitle={t('inventory.productsNeedRestocking', '{count} products need restocking').replace('{count}', inventoryStats().lowStockProducts.toString())}
                  style={{ 
                    'margin-bottom': '2rem',
                    'border-color': '#ffcdd2',
                    background: '#ffebee'
                  }}
                >
                  <div style={{ 'margin-top': '1rem' }}>
                    <For each={inventoryStore.getLowStockProducts().slice(0, 5)}>
                      {(product) => (
                        <div style={{ 
                          display: 'flex', 
                          'justify-content': 'space-between',
                          'margin-bottom': '0.5rem',
                          'font-size': '0.875rem'
                        }}>
                          <span>{product.name} ({product.sku})</span>
                          <span style={{ color: '#d32f2f', 'font-weight': '600' }}>
                            {product.currentStock} / {product.minStockLevel} {t('inventory.min', 'min')}
                          </span>
                        </div>
                      )}
                    </For>
                    {inventoryStore.getLowStockProducts().length > 5 && (
                      <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'font-style': 'italic' }}>
                        {t('inventory.andMore', '...and {count} more').replace('{count}', (inventoryStore.getLowStockProducts().length - 5).toString())}
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Recent Movements */}
              <Card title={t('inventory.recentMovements', 'Recent Movements')} subtitle={t('inventory.latestInventoryActivities', 'Latest inventory activities')}>
                <InventoryMovementView />
              </Card>
            </div>
          )}

          {activeTab() === 'products' && (
            <div>
              <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '1.5rem' }}>
                <h2 style={{ margin: '0', 'font-size': '1.5rem' }}>{t('inventory.productsAndStock', 'Products & Stock')}</h2>
                <Button 
                  variant="primary" 
                  onClick={() => setIsAddProductModalOpen(true)}
                >
                  {t('inventory.addProduct', 'Add Product')}
                </Button>
              </div>
              <For each={productStockSummary()}>
                {(product) => (
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
                  >
                    <div style={productHeaderStyle}>
                      <div>
                        <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', 'margin-bottom': '0.5rem' }}>
                          <h3 style={{ margin: '0', 'font-size': '1.1rem' }}>{product.name}</h3>
                          <span style={stockIndicatorStyle(product.isLowStock)}>
                            {product.isLowStock ? t('inventory.lowStock', 'Low Stock') : t('inventory.inStock', 'In Stock')}
                          </span>
                        </div>
                        <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                          {product.sku} • {product.category}
                        </div>
                        <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                          {t('inventory.lastSeen', 'Last seen')}: {product.lastLocation?.name || t('inventory.noMovements', 'No movements')}
                        </div>
                      </div>
                      <div style={{ 'text-align': 'right' }}>
                        <div style={{ 'font-size': '1.25rem', 'font-weight': '700', color: 'var(--primary-color)' }}>
                          {product.totalStock} {product.unitOfMeasure}
                        </div>
                        <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                          {t('inventory.min', 'Min')}: {product.minStockLevel} • {t('inventory.max', 'Max')}: {product.maxStockLevel}
                        </div>
                        <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                          {t('inventory.cost', 'Cost')}: {formatCurrency(product.unitCost)}
                        </div>
                      </div>
                    </div>

                    {/* Stock by Location */}
                    {product.stockByLocation.length > 0 && (
                      <div style={{ 'margin-top': '1rem' }}>
                        <div style={{ 'font-weight': '500', 'margin-bottom': '0.5rem', 'font-size': '0.875rem' }}>
                          {t('inventory.stockByLocation', 'Stock by Location')}:
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
              </For>
            </div>
          )}

          {activeTab() === 'movements' && (
            <InventoryMovementView />
          )}

          {activeTab() === 'locations' && (
            <div>
              <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '1.5rem' }}>
                <h2 style={{ margin: '0', 'font-size': '1.5rem' }}>{t('inventory.locations', 'Locations')}</h2>
                <Button 
                  variant="primary" 
                  onClick={() => setIsAddLocationModalOpen(true)}
                >
                  {t('inventory.addLocation', 'Add Location')}
                </Button>
              </div>
              <div style={locationGridStyle}>
              <For each={inventoryStore.getActiveLocations()}>
                {(location) => {
                  const locationStock = inventoryStore.getStockByLocation(location.id);
                  const totalProducts = locationStock.length;
                  const totalItems = locationStock.reduce((sum, stock) => sum + stock.quantity, 0);
                  
                  return (
                    <div style={locationCardStyle}>
                      <div style={{ 'margin-bottom': '1rem' }}>
                        <h3 style={{ margin: '0 0 0.5rem 0', 'font-size': '1.1rem' }}>{location.name}</h3>
                        <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                          {location.code} • {location.type}
                        </div>
                        <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', 'margin-top': '0.25rem' }}>
                          {location.address}
                        </div>
                      </div>
                      
                      <div style={{ 
                        display: 'flex', 
                        'justify-content': 'space-between',
                        'margin-bottom': '0.5rem' 
                      }}>
                        <span style={{ 'font-size': '0.875rem', 'font-weight': '500' }}>{t('inventory.products', 'Products')}:</span>
                        <span style={{ 'font-weight': '600' }}>{totalProducts}</span>
                      </div>
                      
                      <div style={{ 
                        display: 'flex', 
                        'justify-content': 'space-between' 
                      }}>
                        <span style={{ 'font-size': '0.875rem', 'font-weight': '500' }}>{t('inventory.totalItems', 'Total Items')}:</span>
                        <span style={{ 'font-weight': '600', color: 'var(--primary-color)' }}>{totalItems}</span>
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

      {/* Modals */}
      <AddInventoryModal
        isOpen={isAddModalOpen()}
        onClose={() => setIsAddModalOpen(false)}
        mode={viewMode() === 'new' ? 'movement' : 'legacy'}
      />
      
      <BulkMovementModal
        isOpen={isBulkModalOpen()}
        onClose={() => setIsBulkModalOpen(false)}
      />
      
      <InventoryDetailModal
        isOpen={isDetailModalOpen()}
        onClose={() => setIsDetailModalOpen(false)}
        item={selectedItem()}
      />
      
      {/* Add Product Modal */}
      <AddProductModal
        isOpen={isAddProductModalOpen()}
        onClose={() => setIsAddProductModalOpen(false)}
        onProductAdded={() => {
          setIsAddProductModalOpen(false);
        }}
      />
      
      {/* Add Location Modal */}
      <AddLocationModal
        isOpen={isAddLocationModalOpen()}
        onClose={() => setIsAddLocationModalOpen(false)}
        onLocationAdded={() => {
          setIsAddLocationModalOpen(false);
        }}
      />
    </Layout>
  );
};

export default Inventory;