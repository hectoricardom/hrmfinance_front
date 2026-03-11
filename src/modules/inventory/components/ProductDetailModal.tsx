import { Component, Show, createMemo, For, createSignal } from 'solid-js';
import { useTranslation } from '../../../translations';
import { Modal } from '../../ui';
import { Button } from '../../ui';
import { Product } from '../stores/inventoryStore';
import { inventoryStore } from '../stores/inventoryStore';
import ProductMovementHistory from './ProductMovementHistory';
import ProductStockBadge from './ProductStockBadge';
import ProductImageManager from './ProductImageManager';
import { devLog } from '../../../services/utils';

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onEdit?: () => void;
  onAddMovement?: () => void;
  onViewMovements?: () => void;
}

const ProductDetailModal: Component<ProductDetailModalProps> = (props) => {
  const { t } = useTranslation();
  
  // Add tab state for different views
  const [activeTab, setActiveTab] = createSignal<'details' | 'movements' | 'analytics' | 'images'>('details');
  const [stockByStores, setStockByStores] = createSignal<any>();
 
  // Get stock info for the product - uses API data from stockByStores
  const stockInfo = createMemo(() => {
    if (!props.product) return null;

    // Use the API data from stockByStores (same as movements section)
    const apiStockData = stockByStores() || [];

    // Filter stock data for this product and calculate totals
    const productStockData = Array.isArray(apiStockData)
      ? apiStockData.filter(s => s.product_id === props.product!.id)
      : [];

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

    const isLowStock = totalStock <= (props.product?.minStockLevel || 0);
    const isOutOfStock = totalStock === 0;
    const isOverStock = totalStock >= (props.product?.maxStockLevel || Infinity);

    return {
      total: totalStock,
      byLocation: stockByLocation,
      status: isOutOfStock ? 'out' : isLowStock ? 'low' : isOverStock ? 'over' : 'good',
      statusText: isOutOfStock
        ? t('inventory.outOfStock', 'Sin Stock')
        : isLowStock
        ? t('inventory.lowStock', 'Stock Bajo')
        : isOverStock
        ? t('inventory.overStock', 'Exceso de Stock')
        : t('inventory.inStock', 'En Stock')
    };
  });

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Calculate profit margin
  const profitMargin = createMemo(() => {
    if (!props.product || props.product.unitCost === 0) return 0;
    return ((props.product.sellingPrice - props.product.unitCost) / props.product.unitCost * 100).toFixed(2);
  });

  // Get recent movements for this product
  const recentMovements = () => {
    if (!stockByStores()) return [];


    return stockByStores().filter(movement => movement.product_id === props.product!.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) as any// Get last 10 movements
      //.slice(0, 10) 
      
  };

  // Calculate analytics - uses API data from stockByStores
  const analytics = createMemo(() => {
    if (!props.product) return null;

    const apiStockData = stockByStores() || [];
    const stockData = stockInfo();

    // Filter for this product's stock data
    const productStockData = Array.isArray(apiStockData)
      ? apiStockData.filter(s => s.product_id === props.product!.id)
      : [];

    // Calculate turnover rate (movements in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentMovements30 = productStockData.filter(m =>
      m.created_at && new Date(m.created_at) >= thirtyDaysAgo
    );

    // Calculate total value from stock data
    const totalMovementsValue = productStockData.reduce((total, stock) => {
      const qty = stock.current_qty || 0;
      const cost = stock.unit_cost || props.product!.unitCost || 0;
      return total + (qty * cost);
    }, 0);

    // Get last movement date
    const sortedByDate = [...productStockData].sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });
    const lastMovementDate = sortedByDate.length > 0 ? sortedByDate[0].created_at : null;

    return {
      recentMovements: productStockData.length,
      movements30Days: recentMovements30.length,
      totalValue: (stockData?.total || 0) * props.product.unitCost,
      averageMovementValue: productStockData.length > 0 ? totalMovementsValue / productStockData.length : 0,
      lastMovementDate
    };
  });

  // Styles
  const detailSectionStyle = {
    'margin-bottom': '2rem'
  };

  const detailRowStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '0.75rem 0',
    'border-bottom': '1px solid var(--border-color)'
  };

  const labelStyle = {
    'font-weight': '500',
    color: 'var(--text-muted)',
    'font-size': '0.875rem'
  };

  const valueStyle = {
    'font-weight': '400',
    color: 'var(--text-primary)',
    'font-size': '1rem'
  };

  const getMovementIcon = (type: string) => {
    const icons = {
      'in': '📦',
      'out': '📤',
      'transfer': '🔄',
      'adjustment': '⚖️'
    };
    return icons[type as keyof typeof icons] || '📋';
  };

  function getMovementTypeColor(type: string) {
    const colors = {
      'in': { bg: '#e8f5e8', color: '#2d7d32' },
      'out': { bg: '#ffebee', color: '#d32f2f' },
      'transfer': { bg: '#e3f2fd', color: '#1976d2' },
      'adjustment': { bg: '#fff3e0', color: '#f57c00' }
    };
    return colors[type as keyof typeof colors] || { bg: '#f5f5f5', color: '#666' };
  }

  
  const movementTypeStyle = (type: string) => ({
    padding: '0.25rem 0.75rem',
    'border-radius': '9999px',
    'font-size': '0.75rem',
    'font-weight': '500',
    'text-transform': 'uppercase',
    'letter-spacing': '0.5px',
    background: getMovementTypeColor(type).bg,
    color: getMovementTypeColor(type).color
  });


  const statusBadgeStyle = (status: string) => {
    const colors = {
      good: { background: '#d4edda', color: '#155724' },
      low: { background: '#fff3cd', color: '#856404' },
      out: { background: '#f8d7da', color: '#721c24' },
      over: { background: '#cce5ff', color: '#004085' }
    };
    
    return {
      display: 'inline-block',
      padding: '0.25rem 0.75rem',
      'border-radius': '9999px',
      'font-size': '0.875rem',
      'font-weight': '500',
      ...(colors[status as keyof typeof colors] || colors.good)
    };
  };

  const gridStyle = {
    display: 'grid',
    'grid-template-columns': '1fr 1fr',
    gap: '1rem'
  };

  const stockLocationStyle = {
    background: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    padding: '1rem',
    'margin-bottom': '0.75rem'
  };

  const headerStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '1.5rem',
    'padding-bottom': '1rem',
    'border-bottom': '2px solid var(--border-color)'
  };

  const tabStyle = {
    display: 'flex',
    'border-bottom': '1px solid var(--border-color)',
    'margin-bottom': '1.5rem'
  };

  const tabButtonStyle = (isActive: boolean) => ({
    padding: '0.75rem 1.5rem',
    background: 'none',
    border: 'none',
    'border-bottom': isActive ? '2px solid var(--primary-color)' : '2px solid transparent',
    color: isActive ? 'var(--primary-color)' : 'var(--text-muted)',
    'font-weight': isActive ? '600' : '400',
    cursor: 'pointer',
    transition: 'all 0.2s',
    'font-size': '0.875rem'
  });

  const movementItemStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '0.75rem',
    background: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'margin-bottom': '0.5rem'
  };

  const analyticsCardStyle = {
    background: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    padding: '1.5rem',
    'margin-bottom': '1rem'
  };


  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      title={t('inventory.productDetails', 'Detalles del Producto')}
      size="large"
    >
      <Show when={props.product} fallback={
        <div style={{ 'text-align': 'center', padding: '2rem', color: 'var(--text-muted)' }}>
          {t('inventory.noProductSelected', 'Ningún producto seleccionado')}
        </div>
      }>
        {(product) => (
          <div>
            {/* Header with name and status */}
         
            <div style={headerStyle}>
              <div>
                <h2 style={{ margin: 0, 'font-size': '1.5rem', 'margin-bottom': '0.25rem' }}>
                  {product().name}
                </h2>
                <div style={{ color: 'var(--text-muted)' }}>
                  SKU: {product().sku} • UPC: {product().UPC} • {product().category}
                </div>
              </div>
              <ProductStockBadge
                productId={product().id}
                minStockLevel={product().minStockLevel}
                showQuantity={true}
                updStockByStores={setStockByStores}
              />
            </div>

            {/* Tab Navigation */}
            <div style={tabStyle}>
              <button
                style={tabButtonStyle(activeTab() === 'details')}
                onClick={() => setActiveTab('details')}
              >
                {t('common.details', 'Detalles')}
              </button>
              <button
                style={tabButtonStyle(activeTab() === 'movements')}
                onClick={() => setActiveTab('movements')}
              >
                {t('inventory.movements', 'Movimientos')}
              </button>
              <button
                style={tabButtonStyle(activeTab() === 'analytics')}
                onClick={() => setActiveTab('analytics')}
              >
                {t('common.analytics', 'Análisis')}
              </button>
              <button
                style={tabButtonStyle(activeTab() === 'images')}
                onClick={() => setActiveTab('images')}
              >
                {t('inventory.images', 'Imágenes')}
              </button>
            </div>

            {/* Tab Content */}
            <Show when={activeTab() === 'details'}>
              {/* Basic Information */}
              <div style={detailSectionStyle}>
                <h3 style={{ 'margin-bottom': '1rem', 'font-size': '1.1rem' }}>
                  {t('inventory.basicInformation', 'Información Básica')}
                </h3>

                <div style={detailRowStyle}>
                  <span style={labelStyle}>{t('inventory.description', 'Descripción')}</span>
                  <span style={valueStyle}>
                    {product().description || t('common.notAvailable', 'N/D')}
                  </span>
                </div>

                <div style={detailRowStyle}>
                  <span style={labelStyle}>{t('inventory.unitOfMeasure', 'Unidad de Medida')}</span>
                  <span style={valueStyle}>{product().unitOfMeasure}</span>
                </div>

                <div style={detailRowStyle}>
                  <span style={labelStyle}>{t('inventory.status', 'Estado')}</span>
                  <span style={valueStyle}>
                    {product().isActive ?
                      <span style={{ color: '#2e7d32' }}>✓ {t('common.active', 'Activo')}</span> :
                      <span style={{ color: '#d32f2f' }}>✗ {t('common.inactive', 'Inactivo')}</span>
                    }
                  </span>
                </div>
              </div>

              {/* Pricing Information */}
              <div style={detailSectionStyle}>
                <h3 style={{ 'margin-bottom': '1rem', 'font-size': '1.1rem' }}>
                  {t('inventory.pricingInformation', 'Información de Precios')}
                </h3>

                <div style={gridStyle}>
                  <div>
                    <div style={detailRowStyle}>
                      <span style={labelStyle}>{t('inventory.unitCost', 'Costo Unitario')}</span>
                      <span style={valueStyle}>{formatCurrency(product().unitCost)}</span>
                    </div>

                    <div style={detailRowStyle}>
                      <span style={labelStyle}>{t('inventory.sellingPrice', 'Precio de Venta')}</span>
                      <span style={valueStyle}>{formatCurrency(product().sellingPrice)}</span>
                    </div>
                  </div>

                  <div>
                    <div style={detailRowStyle}>
                      <span style={labelStyle}>{t('inventory.profit', 'Ganancia')}</span>
                      <span style={valueStyle}>
                        {formatCurrency(product().sellingPrice - product().unitCost)}
                      </span>
                    </div>

                    <div style={detailRowStyle}>
                      <span style={labelStyle}>{t('inventory.profitMargin', 'Margen de Ganancia')}</span>
                      <span style={valueStyle}>{profitMargin()}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stock Information */}
              <div style={detailSectionStyle}>
                <h3 style={{ 'margin-bottom': '1rem', 'font-size': '1.1rem' }}>
                  {t('inventory.stockInformation', 'Información de Stock')}
                </h3>

                <div style={gridStyle}>
                  <div>
                    <div style={detailRowStyle}>
                      <span style={labelStyle}>{t('inventory.totalStock', 'Stock Total')}</span>
                      <span style={valueStyle}>
                        {stockInfo()?.total || 0} {product().unitOfMeasure}
                      </span>
                    </div>

                    <div style={detailRowStyle}>
                      <span style={labelStyle}>{t('inventory.minStockLevel', 'Nivel Mínimo de Stock')}</span>
                      <span style={valueStyle}>
                        {product().minStockLevel} {product().unitOfMeasure}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div style={detailRowStyle}>
                      <span style={labelStyle}>{t('inventory.maxStockLevel', 'Nivel Máximo de Stock')}</span>
                      <span style={valueStyle}>
                        {product().maxStockLevel} {product().unitOfMeasure}
                      </span>
                    </div>

                    <div style={detailRowStyle}>
                      <span style={labelStyle}>{t('inventory.stockValue', 'Valor del Stock')}</span>
                      <span style={valueStyle}>
                        {formatCurrency((stockInfo()?.total || 0) * product().unitCost)}
                      </span>
                    </div>
                  </div>
                </div>


                {/* Stock by Location */}
                <Show when={stockInfo()?.byLocation && stockInfo()!.byLocation.length > 0}>
                  <div style={{ 'margin-top': '1.5rem' }}>
                    <h4 style={{ 'margin-bottom': '1rem', 'font-size': '1rem' }}>
                      {t('inventory.stockByLocation', 'Stock por Ubicación')}
                    </h4>
                    {stockInfo()!.byLocation.map(stock => {

                      return(

                      <div style={stockLocationStyle}>
                        <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' }}>
                          <span style={{ 'font-weight': '500', color: 'var(--primary-color)'  }}>{stock.locationId}
                            <span style={{ 'font-weight': '500' , color: 'var(--text-muted)' }}> • {stock.locationName}</span>
                          </span>
                          <span style={{ 'font-weight': '600', color: stock.quantity >0 ?'var(--primary-color)': 'var(--text-muted)' }}>
                            {stock.quantity} {product().unitOfMeasure}
                          </span>
                        </div>
                        <div style={{ 'margin-top': '0.5rem', 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                          {t('inventory.available', 'Disponible')}: {stock.availableQuantity} •
                          {t('inventory.reserved', 'Reservado')}: {stock.reservedQuantity}
                        </div>
                      </div>
                    )}
                  )}
                  </div>
                </Show>
              </div>

              {/* Timestamps */}
              <div style={detailSectionStyle}>
                <h3 style={{ 'margin-bottom': '1rem', 'font-size': '1.1rem' }}>
                  {t('inventory.timestamps', 'Fechas')}
                </h3>

                <div style={detailRowStyle}>
                  <span style={labelStyle}>{t('common.createdDate', 'Fecha de Creación')}</span>
                  <span style={valueStyle}>{formatDate(product().createdDate)}</span>
                </div>

                <div style={detailRowStyle}>
                  <span style={labelStyle}>{t('common.lastModified', 'Última Modificación')}</span>
                  <span style={valueStyle}>{formatDate(product().lastModified)}</span>
                </div>
              </div>
            </Show>

            {/* Movements Tab */}
            <Show when={activeTab() === 'movements'}>
              <div style={detailSectionStyle}>
                {/* Real-time Movement History from API */}
                <ProductMovementHistory
                  productId={product().id}
                  limit={50}
                />

                {/* Separator for local store movements */}
                <div style={{
                  'margin-top': '2rem',
                  'padding-top': '1.5rem',
                  'border-top': '2px solid var(--border-color)'
                }}>
                  <h3 style={{ 'margin-bottom': '1rem', 'font-size': '1.1rem' }}>
                    {t('inventory.localMovements', 'Movimientos del Almacén Local')}
                  </h3>
                </div>
                
                <Show
                  when={recentMovements().length > 0}
                  fallback={
                    <div style={{
                      'text-align': 'center',
                      padding: '2rem',
                      color: 'var(--text-muted)',
                      background: 'var(--surface-color)',
                      'border-radius': 'var(--border-radius-sm)',
                      border: '1px solid var(--border-color)'
                    }}>
                      📦 {t('inventory.noMovements', 'No se encontraron movimientos')}
                    </div>
                  }
                >

               
                  <For each={recentMovements()}>
                   
                    {(movement) => {
                     
                      const productMovement = movement.product_id === product().id? movement : null;
                      if (!productMovement) return null;
                     
                      let locationObj = inventoryStore.getLocationById(movement.store_id)
                      if (!locationObj) return null;

                     
                      return (
                        <div style={movementItemStyle}>
                          <div>
                            <div style={{ 'font-weight': '600', 'margin-bottom': '0.25rem' }}>
                              <span style={{ 'font-size': '1.2rem' }}>{getMovementIcon(movement.last_movement_type)}</span>
                              <span style={{"padding": "0 6px"}}/>
                              <span style={movementTypeStyle(movement.last_movement_type)}>
                                {movement.last_movement_type}
                              </span>
                            </div>
                            <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                             {` ${formatDate(movement?.created_at)} • `}
                              <span style={{ 'font-size': '0.875rem', "font-weight": 600 , color: 'var(--primary-color)' }}>
                                {movement?.store_id}
                              </span>
                              {` • ${locationObj?.name}`}
                            </div>
                            <Show when={movement.referenceNumber}>
                              <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', 'margin-top': '0.25rem' }}>
                                Ref: {movement?.referenceNumber}
                              </div>
                            </Show>
                          </div>
                          <div style={{ 'text-align': 'right' }}>
                            <div style={{ 
                              'font-weight': '600', 
                              color: movement?.last_movement_type === 'in' ? '#2e7d32' : '#d32f2f',
                              'font-size': '1rem'
                            }}>
                              {productMovement.available_qty} {product().unitOfMeasure}
                            </div>
                            <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                              {formatCurrency(productMovement.unitCost || 0)}
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  </For>
                </Show>
              </div>
            </Show>

            {/* Analytics Tab */}
            <Show when={activeTab() === 'analytics'}>
              <div style={detailSectionStyle}>
                <h3 style={{ 'margin-bottom': '1rem', 'font-size': '1.1rem' }}>
                  {t('common.analytics', 'Análisis')}
                </h3>

                <Show
                  when={analytics()}
                  fallback={
                    <div style={{ 'text-align': 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      {t('inventory.noAnalytics', 'No hay datos de análisis disponibles')}
                    </div>
                  }
                >
                  {(analyticsData) => (
                    <div style={gridStyle}>
                      <div style={analyticsCardStyle}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>
                          {t('inventory.totalMovements', 'Total de Movimientos')}
                        </h4>
                        <div style={{ 'font-size': '1.5rem', 'font-weight': '600' }}>
                          {analyticsData().recentMovements}
                        </div>
                        <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'margin-top': '0.25rem' }}>
                          {t('inventory.allTime', 'Todo el tiempo')}
                        </div>
                      </div>

                      <div style={analyticsCardStyle}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>
                          {t('inventory.last30Days', 'Últimos 30 Días')}
                        </h4>
                        <div style={{ 'font-size': '1.5rem', 'font-weight': '600' }}>
                          {analyticsData().movements30Days}
                        </div>
                        <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'margin-top': '0.25rem' }}>
                          {t('inventory.movements', 'movimientos')}
                        </div>
                      </div>

                      <div style={analyticsCardStyle}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>
                          {t('inventory.currentValue', 'Valor Actual del Stock')}
                        </h4>
                        <div style={{ 'font-size': '1.5rem', 'font-weight': '600' }}>
                          {formatCurrency(analyticsData().totalValue)}
                        </div>
                        <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'margin-top': '0.25rem' }}>
                          {stockInfo()?.total || 0} {product().unitOfMeasure} × {formatCurrency(product().unitCost)}
                        </div>
                      </div>

                      <div style={analyticsCardStyle}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>
                          {t('inventory.avgMovementValue', 'Valor Promedio por Movimiento')}
                        </h4>
                        <div style={{ 'font-size': '1.5rem', 'font-weight': '600' }}>
                          {formatCurrency(analyticsData().averageMovementValue)}
                        </div>
                        <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'margin-top': '0.25rem' }}>
                          {t('inventory.perMovement', 'por movimiento')}
                        </div>
                      </div>

                      <Show when={analyticsData().lastMovementDate}>
                        <div style={analyticsCardStyle}>
                          <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>
                            {t('inventory.lastMovement', 'Último Movimiento')}
                          </h4>
                          <div style={{ 'font-size': '1.25rem', 'font-weight': '600' }}>
                            {formatDate(analyticsData().lastMovementDate!)}
                          </div>
                          <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'margin-top': '0.25rem' }}>
                            {t('inventory.mostRecent', 'Actividad más reciente')}
                          </div>
                        </div>
                      </Show>

                      <div style={analyticsCardStyle}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>
                          {t('inventory.stockStatus', 'Estado del Stock')}
                        </h4>
                        <div style={{ 'font-size': '1.25rem', 'font-weight': '600' }}>
                          {stockInfo()?.statusText}
                        </div>
                        <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'margin-top': '0.25rem' }}>
                          {t('inventory.min', 'Mín')}: {product().minStockLevel} • {t('inventory.max', 'Máx')}: {product().maxStockLevel}
                        </div>
                      </div>
                    </div>
                  )}
                </Show>
              </div>
            </Show>

            {/* Images Tab */}
            <Show when={activeTab() === 'images'}>
              <ProductImageManager
                product={product()}
                onImageChange={(imageUrl) => {
                  // Could update product's primary image in parent if needed
                  devLog('Primary image changed:', imageUrl);
                }}
              />
            </Show>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '1rem', 'justify-content': 'flex-end', 'margin-top': '2rem' }}>
              <Button variant="secondary" onClick={props.onClose}>
                {t('common.close', 'Cerrar')}
              </Button>
              <Show when={props.onEdit}>
                <Button variant="primary" onClick={props.onEdit}>
                  {t('common.edit', 'Editar')}
                </Button>
              </Show>
            </div>
          </div>
        )}
      </Show>
    </Modal>
  );
};

export default ProductDetailModal;