import { Component, createSignal, createMemo, For, Show, createEffect } from 'solid-js';
import { useTranslation } from '../../../translations';
import { Card, LazyList } from '../../ui';
import { Button } from '../../ui';
import { inventoryStore, InventoryMovement, Product, Location } from '../stores/inventoryStore';
import InventorySearchInput from './InventorySearchInput';
import MovementDetailModal from './MovementDetailModal';
import UpdateMovementModal from './UpdateMovementModal';
import { getType, getTypeFilter } from '../../../services/utils';

import { inventoryApi, movementsApi } from '../../../services/apiAdapter';
import { authStore } from '../../../stores/authStore';
import SearchableProductDropdown from './SearchableProductDropdown';
import { invoiceStore } from '../../invoice';

interface InventoryMovementViewProps {
  filterBy?: 'product' | 'location' | 'all';
  filterId?: string;
}

const InventoryMovementView: Component<InventoryMovementViewProps> = (props) => {
  const { t } = useTranslation();
  const [selectedProduct, setSelectedProduct] = createSignal('');
  const [selectedLocation, setSelectedLocation] = createSignal('');
  const [movementType, setMovementType] = createSignal<'all' | 'in' | 'out' | 'transfer' | 'adjustment'>('all');
  const [dateRange, setDateRange] = createSignal({ start: '', end: '' });
  const [searchTerm, setSearchTerm] = createSignal('');
  const [searchValue, setSearchValue] = createSignal('');

  // Modal states
  const [selectedMovement, setSelectedMovement] = createSignal<InventoryMovement | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = createSignal(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = createSignal(false);






  const filteredMovements = createMemo(() => {
    
    let movements = inventoryStore.movements;

   
    // Apply prop-based filtering
    /** 
    if (props.filterBy === 'product' && props.filterId) {
      movements = movements.filter(m => m.productId === props.filterId);
    } else if (props.filterBy === 'location' && props.filterId) {
      movements = movements.filter(m => m.locationId === props.filterId);
    }
    */
   

    // Apply component state filters
    if (selectedProduct()) {
      //movements = movements.filter(m => m.productId === selectedProduct());
    }

    if (selectedLocation()) {
      movements = movements.filter(m => m.store === selectedLocation());
    }


    if (dateRange().start) {
      //movements = movements.filter(m => m.createdDate >= dateRange().start);
    }

    if (dateRange().end) {
      //movements = movements.filter(m => m.createdDate <= dateRange().end + 'T23:59:59Z');
    }

    // Apply search filter
    if (searchTerm()) {
      const search = searchTerm().toLowerCase();
      movements = movements.filter(m => 
        m.productName.toLowerCase().includes(search) ||
        m.productSku.toLowerCase().includes(search) ||
        m.locationName.toLowerCase().includes(search) ||
        m.referenceNumber.toLowerCase().includes(search) ||
        m.notes.toLowerCase().includes(search) ||
        m.createdBy.toLowerCase().includes(search) ||
        (m.invoiceId && m.invoiceId.toLowerCase().includes(search)) ||
        (m.fromLocationName && m.fromLocationName.toLowerCase().includes(search)) ||
        m.movementType.toLowerCase().includes(search)
      );
    }

    // Sort by date (newest first)
    return movements.sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
  });

  const movementStats = createMemo(() => {
    const movements = filteredMovements();
   
    return {
      total: movements.length,
      stockIn: movements.filter(m => (m.type === 'in'  ||  m.type === 'ENTRY')  ).length,
      stockOut: movements.filter(m => (m.type === 'out' ||  m.type === 'SALES')).length,
      transfers: movements.filter(m => (m.type === 'transfer'||  m.type === 'TRANSFER')).length,
      adjustments: movements.filter(m => m.type === 'adjustment').length,
      totalValue: 0
    };
  });

    // Get price based on movement type and available fields
  const getProductPrice = (product: any, movementType?: string) => {
    // For sales/out movements, prefer salePrice
    if (movementType === 'SALES' || movementType === 'out') {
      return product.salePrice || product.price || product.unitCost || product.costPrice || 0;
    }
    // For entry/in movements, prefer costPrice
    return product.costPrice || product.price || product.unitCost || product.salePrice || 0;
  };

  // Get movement unit price based on type
  const getMovementPrice = (movement: any) => {
    if (movement.type === 'SALES' || movement.type === 'out') {
      return movement.salePrice || movement.unitCost || movement.price || movement.costPrice || 0;
    }
    return movement.costPrice || movement.unitCost || movement.price || movement.salePrice || 0;
  };

  const productsStats = (prs: any[], movementType?: string) => {
    return prs ? prs?.reduce?.((sum, m) => sum + (m.qty * getProductPrice(m, movementType)), 0) : 0;
  };

  const headerStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '2rem'
  };

  const filtersStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    'margin-bottom': '2rem',
    padding: '1.5rem',
    background: 'var(--surface-color)',
    'border-radius': 'var(--border-radius)',
    border: '1px solid var(--border-color)'
  };

  const selectStyle = {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    background: 'var(--background-color)',
    cursor: 'pointer'
  };

  const inputStyle = {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    background: 'var(--background-color)'
  };

  const statsGridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '1rem',
    'margin-bottom': '2rem'
  };

  const statCardStyle = {
    padding: '1rem',
    background: 'var(--surface-color)',
    'border-radius': 'var(--border-radius-sm)',
    border: '1px solid var(--border-color)',
    'text-align': 'center'
  };

  const statValueStyle = {
    'font-size': '1.5rem',
    'font-weight': '700',
    color: 'var(--primary-color)',
    'margin-bottom': '0.5rem'
  };

  const statLabelStyle = {
    'font-size': '0.875rem',
    color: 'var(--text-muted)',
    'font-weight': '500'
  };

  const movementCardStyle = {
    padding: '1.5rem',
    'margin-bottom': '1rem',
    background: 'var(--surface-color)',
    'border-radius': 'var(--border-radius)',
    border: '1px solid var(--border-color)',
    transition: 'all 0.2s ease'
  };

  const movementHeaderStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'flex-start',
    'margin-bottom': '1rem'
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

  const movementDetailsStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    'margin-bottom': '1rem'
  };

  const detailItemStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '0.5rem 0',
    'border-bottom': '1px solid var(--border-color)'
  };

  const labelStyle = {
    'font-weight': '500',
    color: 'var(--text-muted)',
    'font-size': '0.875rem'
  };

  const valueStyle = {
    'font-weight': '600',
    color: 'var(--text-primary)'
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  const clearFilters = () => {
    setSelectedProduct('');
    setSelectedLocation('');
    setMovementType('all');
    setDateRange({ start: '', end: '' });
    setSearchTerm('');
    setCurrentPage(1);
   
  };

  const handleViewMovement = (movement: InventoryMovement) => {
    setSelectedMovement(movement);
    setIsDetailModalOpen(true);
  };

  const handleEditMovement = (movement: InventoryMovement) => {
    setSelectedMovement(movement);
    setIsDetailModalOpen(false);
    setIsUpdateModalOpen(true);
  };

  const handleMovementUpdated = () => {
    // Refresh the movements list if needed
    // Since we're using the store, the list should update automatically
    setIsUpdateModalOpen(false);
    setSelectedMovement(null);
  };



  const fecthApi = async (query: string): Promise<any>  =>  {

   
    if(selectedLocation()){
      query += " "+selectedLocation();
    }

    if(getTypeFilter(movementType())){
      query += " "+  getTypeFilter(movementType());
    }

    
    await inventoryStore.fecthInventory(query);


  };



  const handleCalcStock = () => {
    
  };

  return (
    <div>
      {!props.filterBy && (
        <div style={headerStyle}>
          <h2 style={{ margin: '0', 'font-size': '1.5rem' }}>{t('inventory.movements', 'Movimientos')}</h2>
          <Button variant="outline" onClick={clearFilters}>
            {t('common.clearFilters', 'Limpiar Filtros')}
          </Button>
        </div>
      )}

      <InventorySearchInput
        filters={{
          selectedLocation,
          movementType
        }}
        onSearchResults={(results) => {
          setSearchValue(results);

          fecthApi(results)
          //setSearchResults(results);
          //setSearchMode(results.length > 0);
        }}
        placeholder={t('inventory.searchProductsStock', 'Search inventories...')}
        showResults={false}
        maxResults={20}
      />
      {/* Filters */}
      <div style={{margin: "20px" }}></div>
      <div style={filtersStyle}>
        

        {!props.filterBy && (
          <>
            <div>
              <label style={{ display: 'block', 'margin-bottom': '0.5rem', 'font-weight': '500' }}>
                {t('inventory.product', 'Producto')}
              </label>
              <SearchableProductDropdown
                //value={item.productId}
                onChange={(results) => {
                  let pro: Product = results as Product;
                  
                  //setSearchResults([pro]);
                  setSelectedProduct(pro.id);
                  /**
                  updateItem(index(), 'productId', selectedProductId.id);
                  let prod = {
                    'id': selectedProductId.id,
                    'label': selectedProductId.name,
                    'code': selectedProductId.sku
                  }
                  updateItem(index(), 'product', prod);
                  //id: 'DWE2AGqPBRhNxJ65', label: 'PULOVER MARATON HOMBRE', code: '1275301B1'
                  //updateItem(index(), 'product', selectedProductId.id);

                  // Auto-fill unit cost when product is selected
                  const product = inventoryStore.getProductById(selectedProductId.id);
                  if (product && !item.unitCost) {
                    updateItem(index(), 'unitCost', product.unitCost);
                  }

                  */
                }}
                placeholder={t('inventory.searchProductsImages', 'Search products to view images...')}
                //onAddNew={() => setIsAddProductModalOpen(true)}
                //required
              />
              
            </div>

            <div>
              <label style={{ display: 'block', 'margin-bottom': '0.5rem', 'font-weight': '500' }}>
                {t('inventory.location', 'Ubicación')}
              </label>
              <select
                style={selectStyle}
                value={selectedLocation()}
                onChange={(e) => setSelectedLocation(e.target.value)}
              >
                <option value="">{t('inventory.allLocations', 'Todas las Ubicaciones')}</option>
                <For each={inventoryStore.locations}>
                  {(location) => (
                    <option value={location.id}>
                      {location.name}
                    </option>
                  )}
                </For>
              </select>
            </div>
          </>
        )}

        <div>
          <label style={{ display: 'block', 'margin-bottom': '0.5rem', 'font-weight': '500' }}>
            {t('inventory.movementType', 'Tipo de Movimiento')}
          </label>
          <select
            style={selectStyle}
            value={movementType()}
            onChange={(e) => {
              setMovementType(e.target.value as any);

              fecthApi(searchValue());
            }}
          >
            <option value="all">{t('inventory.allTypes', 'Todos los Tipos')}</option>
            <option value="ENTRY">{t('inventory.stockIn', 'Entrada de Stock')}</option>
            <option value="SALES">{t('inventory.stockOut', 'Salida de Stock')}</option>
            <option value="transfer">{t('inventory.transfer', 'Transferencia')}</option>
            <option value="adjustment">{t('inventory.adjustment', 'Ajuste')}</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', 'margin-bottom': '0.5rem', 'font-weight': '500' }}>
            {t('common.startDate', 'Fecha de Inicio')}
          </label>
          <input
            type="date"
            style={inputStyle}
            value={dateRange().start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
          />
        </div>

        <div>
          <label style={{ display: 'block', 'margin-bottom': '0.5rem', 'font-weight': '500' }}>
            {t('common.endDate', 'Fecha de Fin')}
          </label>
          <input
            type="date"
            style={inputStyle}
            value={dateRange().end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
          />
        </div>
      </div>

      {/* Statistics */}
      <div style={statsGridStyle}>
        <div style={statCardStyle}>
          <div style={statValueStyle}>{movementStats().total}</div>
          <div style={statLabelStyle}>{t('inventory.totalMovements', 'Total de Movimientos')}</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ ...statValueStyle, color: '#2d7d32' }}>{movementStats().stockIn}</div>
          <div style={statLabelStyle}>{t('inventory.stockIn', 'Entrada de Stock')}</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ ...statValueStyle, color: '#d32f2f' }}>{movementStats().stockOut}</div>
          <div style={statLabelStyle}>{t('inventory.stockOut', 'Salida de Stock')}</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ ...statValueStyle, color: '#1976d2' }}>{movementStats().transfers}</div>
          <div style={statLabelStyle}>{t('inventory.transfers', 'Transferencias')}</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ ...statValueStyle, color: '#f57c00' }}>{movementStats().adjustments}</div>
          <div style={statLabelStyle}>{t('inventory.adjustments', 'Ajustes')}</div>
        </div>
        <div style={statCardStyle}>
          <div style={statValueStyle} onClick={handleCalcStock}>{formatCurrency(movementStats().totalValue)}</div>
          <div style={statLabelStyle}>{t('inventory.totalValue', 'Valor Total')}</div>
        </div>
      </div>

      {/* Movements List */}
      <LazyList
        items={filteredMovements()}
        renderItem={(movement) => (
          <div
            style={{
              ...movementCardStyle,
              'border-left': movement.invoiceId ? '4px solid var(--primary-color)' : '1px solid var(--border-color)',
              cursor: 'pointer'
            }}
            onClick={() => handleViewMovement(movement)}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={movementHeaderStyle}>
              <div>
                <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', 'margin-bottom': '0.5rem' }}>
                  <span style={{ 'font-size': '1.2rem' }}>{getMovementIcon(movement.type)}</span>
                  <h3 style={{ margin: '0', 'font-size': '1.1rem' }}>
                    {movement.productName}
                  </h3>
                  <span style={movementTypeStyle(movement.type)}>
                    {movement.type}
                  </span>
                  {movement.invoice && (
                    <span style={{
                      padding: '0.2rem 0.5rem',
                      'border-radius': 'var(--border-radius-sm)',
                      'font-size': '0.7rem',
                      'font-weight': '500',
                      background: 'var(--primary-color)',
                      color: 'white'
                    }}>
                      {t('inventory.bulk', 'Bultos')}
                    </span>
                  )}
                </div>
                <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                  {movement.productSku} • {formatDate(movement.createdAt)}
                  {movement.invoice && (
                    <span style={{ 'margin-left': '0.5rem', 'font-weight': '500' }} >
                      • {t('common.invoice', 'Factura')}: {movement.invoice}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ 'text-align': 'right' }}>
                <div style={{ 'font-size': '1.25rem', 'font-weight': '700', color: 'var(--primary-color)' }}>
                  {formatCurrency(productsStats(movement.products, movement.type))}
                </div>
                <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                  {movement.quantity} {t('common.units', 'unidades')} @ {formatCurrency(getMovementPrice(movement))}
                  <span style={{ 'margin-left': '0.25rem', 'font-size': '0.7rem', opacity: 0.7 }}>
                    ({movement.type === 'SALES' || movement.type === 'out' ? t('inventory.sale', 'venta') : t('inventory.cost', 'costo')})
                  </span>
                </div>
              </div>
            </div>

            <div style={movementDetailsStyle}>
              <div>
                <div style={detailItemStyle}>
                  <span style={labelStyle}>{t('inventory.location', 'Ubicación')}:</span>
                  <span style={valueStyle}>{movement.store}</span>
                </div>
                {movement.fromLocationName && (
                  <div style={detailItemStyle}>
                    <span style={labelStyle}>{t('common.from', 'Desde')}:</span>
                    <span style={valueStyle}>{movement.fromLocationName}</span>
                  </div>
                )}
                <div style={detailItemStyle}>
                  <span style={labelStyle}>{t('common.reference', 'Referencia')}:</span>
                  <span style={valueStyle}>{movement.invoice}</span>
                </div>
              </div>
              <div>
                <div style={detailItemStyle}>
                  <span style={labelStyle}>{t('common.createdBy', 'Creado Por')}:</span>
                  <span style={valueStyle}>{movement.userId}</span>
                </div>
                {movement.notes && (
                  <div style={{ ...detailItemStyle, 'border-bottom': 'none' }}>
                    <span style={labelStyle}>{t('common.notes', 'Notas')}:</span>
                    <span style={{ ...valueStyle, 'max-width': '200px', 'text-align': 'right', 'font-style': 'italic' }}>
                      {movement.notes}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        batchSize={25}
        gridColumns="1fr"
        gap="0.75rem"
        itemsLabel={t('inventory.movements', 'movimientos')}
        emptyMessage={t('inventory.noMovementsFound', 'No se encontraron movimientos. Intente ajustar los filtros de búsqueda')}
      />
      

      {/* Modals */}
      <MovementDetailModal
        isOpen={isDetailModalOpen()}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedMovement(null);
        }}
        movement={selectedMovement()}
        onEdit={handleEditMovement}
      />
      
      <Show when={authStore.hasPermission("read_write")}>
        <UpdateMovementModal
          isOpen={isUpdateModalOpen()}
          onClose={() => {
            setIsUpdateModalOpen(false);
            setSelectedMovement(null);
          }}
          movement={selectedMovement()}
          onMovementUpdated={handleMovementUpdated}
        />
      </Show>
    </div>
  );
};

export default InventoryMovementView;