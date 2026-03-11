import { Component, Show, onMount, createMemo, createSignal } from 'solid-js';
import { countingStore } from '../stores/countingStore';
import { inventoryStore } from '../stores/inventoryStore';
import { authStore } from '../../../stores/authStore';
import ZoneSelector from './ZoneSelector';
import CountingProgress from './CountingProgress';
import DiscrepancyAlert from './DiscrepancyAlert';
import CountingSummary from './CountingSummary';
import type { Zone } from '../types/counting';
import { devLog } from '../../../services/utils';

const CountingScreen: Component = () => {
  const [isLoading, setIsLoading] = createSignal(true);
  const [loadError, setLoadError] = createSignal<string | null>(null);

  const loadInventoryData = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);

      // Load inventory movements and products if not already loaded
      const businessId = authStore.getBusinessId();

      if (inventoryStore.movements.length === 0) {
        await inventoryStore.fecthInventory(`businessId=${businessId}`);
      }

      if (inventoryStore.products.length === 0) {
        await inventoryStore.fecthProduct(`businessId=${businessId}`);
      }

      // Now populate zones with loaded data
      const locations = inventoryStore.getActiveLocations();
      const stockLevels = inventoryStore.stockLevels;

      devLog('=== CountingScreen Data Load ===');
      devLog('Loaded locations:', locations.length, locations.map(l => ({ id: l.id, name: l.name })));
      devLog('Loaded stock levels:', stockLevels?.length);
      devLog('Loaded products:', inventoryStore.products?.length);
      devLog('Loaded movements:', inventoryStore.movements?.length);

      if (stockLevels?.length > 0) {
        devLog('Sample stock levels:', stockLevels.slice(0, 5));
        const uniqueLocationIds = [...new Set(stockLevels.map(s => s.locationId))];
        devLog('Stock levels location IDs:', uniqueLocationIds);
      }

      const zoneData: Zone[] = locations.map(location => {
        const locationStock = stockLevels?.filter(stock => stock.locationId === location.id) || [];
        const productCount = new Set(locationStock.map(s => s.productId)).size;
        const totalQuantity = locationStock.reduce((sum, s) => sum + (s.quantity || 0), 0);

        devLog(`Zone ${location.name} (${location.id}): ${productCount} products, ${totalQuantity} units, stocks found: ${locationStock.length}`);

        return {
          id: location.id,
          name: location.name,
          code: location.code || location.id,
          productCount,
          shelfCount: Math.ceil(productCount / 20) // Estimate: 20 products per shelf
        };
      });

      setZones(zoneData);
    } catch (error) {
      console.error('Error loading inventory data:', error);
      setLoadError(error instanceof Error ? error.message : 'Error cargando datos');
    } finally {
      setIsLoading(false);
    }
  };

  onMount(() => {
    loadInventoryData();
  });

  const [zones, setZones] = createSignal<Zone[]>([]);
  const [showDiscrepancyAlert, setShowDiscrepancyAlert] = createSignal(false);
  const [currentDiscrepancyItem, setCurrentDiscrepancyItem] = createSignal<any>(null);

  const activeSession = createMemo(() => countingStore.activeSession);
  const currentItem = createMemo(() => countingStore.currentItem);
  const isComplete = createMemo(() => countingStore.isComplete);

  const handleSelectZone = (zone: Zone) => {
    const user = authStore.state.user?.email || 'unknown';
    countingStore.startSession('zone', zone.id, user, zone.id, zone.name);
  };

  const handleStartFullCount = () => {
    // For full count, we'll use the first location or create a combined view
    const locations = inventoryStore.getActiveLocations();
    if (locations.length === 0) {
      alert('No hay ubicaciones disponibles');
      return;
    }

    const user = authStore.state.user?.email || 'unknown';
    // Use first location for now, or implement multi-location logic
    countingStore.startSession('full', locations[0].id, user);
  };

  const handleUpdateCount = (count: number) => {
    const item = currentItem();
    if (!item) return;

    countingStore.updateItemCount(item.id, count);

    // Check if there's a discrepancy
    if (count !== item.systemQuantity) {
      setCurrentDiscrepancyItem(item);
      setShowDiscrepancyAlert(true);
    } else {
      // No discrepancy, move to next
      const hasNext = countingStore.goToNextItem();
      if (!hasNext) {
        // Session complete
        countingStore.endSession('completed');
      }
    }
  };

  const handleQuickConfirm = () => {
    const item = currentItem();
    if (!item) return;

    handleUpdateCount(item.systemQuantity);
  };

  const handleNext = () => {
    const hasNext = countingStore.goToNextItem();
    if (!hasNext) {
      countingStore.endSession('completed');
    }
  };

  const handlePrevious = () => {
    countingStore.goToPreviousItem();
  };

  const handleConfirmDiscrepancy = () => {
    setShowDiscrepancyAlert(false);
    setCurrentDiscrepancyItem(null);

    // Move to next item
    const hasNext = countingStore.goToNextItem();
    if (!hasNext) {
      countingStore.endSession('completed');
    }
  };

  const handleRecount = () => {
    const item = currentDiscrepancyItem();
    if (!item) return;

    // Reset the count for this item
    const session = activeSession();
    if (!session) return;

    const updatedItems = session.items.map(i => {
      if (i.id === item.id) {
        return {
          ...i,
          countedQuantity: undefined,
          status: 'pending' as const,
          discrepancy: undefined,
          countedAt: undefined
        };
      }
      return i;
    });

    // Update session with reset item
    countingStore.resetSession();
    countingStore.startSession(
      session.type,
      session.items[0].locationId,
      session.createdBy,
      session.zoneId,
      session.zoneName
    );

    setShowDiscrepancyAlert(false);
    setCurrentDiscrepancyItem(null);
  };

  const handleApplyAdjustments = async () => {
    const result = await countingStore.applyAdjustments();
    if (result.success) {
      alert('Ajustes aplicados exitosamente');
    } else {
      alert('Error al aplicar ajustes: ' + result.errors.join(', '));
    }
  };

  const handleClose = () => {
    countingStore.resetSession();
  };

  const getDiscrepancyItems = () => {
    const session = activeSession();
    if (!session) return [];
    return countingStore.getDiscrepancyItems();
  };

  const getSummary = () => {
    return countingStore.calculateSummary();
  };

  const containerStyle = {
    'min-height': '100vh',
    background: '#f9fafb'
  };

  return (
    <div style={containerStyle}>
      {/* Loading State */}
      <Show when={isLoading()}>
        <div style={{
          display: 'flex',
          'flex-direction': 'column',
          'align-items': 'center',
          'justify-content': 'center',
          'min-height': '400px',
          gap: '1rem'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #e5e7eb',
            'border-top-color': '#3b82f6',
            'border-radius': '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{ color: '#6b7280', 'font-size': '1rem' }}>Cargando datos de inventario...</p>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </Show>

      {/* Error State */}
      <Show when={!isLoading() && loadError()}>
        <div style={{
          display: 'flex',
          'flex-direction': 'column',
          'align-items': 'center',
          'justify-content': 'center',
          'min-height': '400px',
          gap: '1rem',
          padding: '2rem'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: '#fee2e2',
            'border-radius': '50%',
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'center',
            color: '#dc2626',
            'font-size': '2rem'
          }}>⚠</div>
          <p style={{ color: '#dc2626', 'font-size': '1rem', 'text-align': 'center' }}>
            {loadError()}
          </p>
          <button
            onClick={loadInventoryData}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              'border-radius': '0.5rem',
              cursor: 'pointer',
              'font-size': '1rem'
            }}
          >
            Reintentar
          </button>
        </div>
      </Show>

      {/* Main Content */}
      <Show when={!isLoading() && !loadError()}>
        <Show
          when={activeSession()}
          fallback={
            <ZoneSelector
              zones={zones()}
              onSelectZone={handleSelectZone}
              onStartFullCount={handleStartFullCount}
            />
          }
        >
        <Show
          when={!isComplete()}
          fallback={
            <CountingSummary
              summary={getSummary()}
              discrepancyItems={getDiscrepancyItems()}
              onApplyAdjustments={handleApplyAdjustments}
              onClose={handleClose}
            />
          }
        >
          <CountingProgress
            session={activeSession()!}
            currentItem={currentItem()}
            onUpdateCount={handleUpdateCount}
            onNext={handleNext}
            onPrevious={handlePrevious}
            onQuickConfirm={handleQuickConfirm}
          />
        </Show>
        </Show>

        <DiscrepancyAlert
          item={currentDiscrepancyItem()}
          onConfirm={handleConfirmDiscrepancy}
          onRecount={handleRecount}
          isOpen={showDiscrepancyAlert()}
        />
      </Show>
    </div>
  );
};

export default CountingScreen;
